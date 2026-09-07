// autonomous player-bots manager. a bot is a real Player with socket=null, added to world.players.
// spawns/despawns bots, drives each brain per tick, persists and restores the roster across restarts.

const { BotPlayer, makeBotData, BOT_ID_BASE } = require('../../../model/bot-player');
const SpikeWoodcutterBrain = require('./brains/spike-woodcutter');
const CombatBrain = require('./brains/combat');
const CareerBrain = require('./brains/career');
const personality = require('./personality');
let _dialogueMod = null;
function dialogueMod() { return _dialogueMod || (_dialogueMod = require('./dialogue')); }
const mood = require('./mood');
const botPvp = require('./pvp');
const pacing = require('./pacing');
const botMemory = require('./memory');
const goals = require('./goals');
const lifecycle = require('./lifecycle');
const social = require('./social');
const trades = require('./trades');
const duels = require('./duels');
const governor = require('./governor');
const { experienceForLevel } = require('../../../skills');

// resolve a poller module by name, memoised via poller-registry.js (listed with literal require
// strings so browserify bundles each one; lookup stays lazy until first mod() call).
const _pollerCache = {};
const pollerRegistry = require('./poller-registry');
function mod(name) {
    if (_pollerCache[name]) {
        return _pollerCache[name];
    }
    return (_pollerCache[name] = pollerRegistry.get(name));
}

// report each distinct poller error (message + raising frame) once.
const _reported = new Set();
function pollerFailed(e) {
    let key;
    try {
        const frame = e && e.stack ? String(e.stack).split('\n').find((l) => /at |@/.test(l)) : '';
        key = (e && e.message ? e.message : String(e)) + ' ' + (frame || '').trim();
    } catch (err) { key = String(e); }
    if (_reported.has(key) || _reported.size > 64) return;
    _reported.add(key);
    try { console.error('[bots] poller threw: ' + key); } catch (err) {  }
    // RSC_TRACE=1 (desktop harnesses): the whole stack
    try { if (typeof process !== 'undefined' && process.env && process.env.RSC_TRACE && e && e.stack) console.error(e.stack); } catch (err) {}
}


// bronze axe, the woodcutter's starting tool.
const BRONZE_AXE_ID = 87;
const BREAD_ID = 138;
const COINS_ID = 10;
const STARTER_COINS = 200; // a small starting purse; the bot buys its tools/food
const TREE_ID = 0; // normal tree
const TREE_SEARCH = 20; // tiles to look for a tree to start next to

let botCounter = 0;
const activeBots = new Set();

// build a brain from a persisted or fresh descriptor {type, options}.
function makeBrain(bot, type, options = {}) {
    switch (type) {
        case 'fighter':
            return new CombatBrain(bot, options);
        case 'career':
            return new CareerBrain(bot, options);
        case 'woodcutter':
        default:
            return new SpikeWoodcutterBrain(bot);
    }
}

// is this tile walkable (unblocked in the pathfinder's 2x2 obstacle check)?
function isWalkable(world, x, y) {
    if (!world.pathFinder) {
        return true;
    }

    try {
        return !(
            world.pathFinder.getObstacle(x, y, 0, 0) ||
            world.pathFinder.getObstacle(x, y, 1, 0) ||
            world.pathFinder.getObstacle(x, y, 0, 1) ||
            world.pathFinder.getObstacle(x, y, 1, 1)
        );
    } catch (e) {
        return false;
    }
}

// a walkable tile next to the nearest tree within range of (x,y), or null.
function tileNextToNearestTree(world, x, y) {
    let tree = null;
    let bestDist = Infinity;

    for (const obj of world.gameObjects.getInArea(x, y, TREE_SEARCH * 2)) {
        if (obj.id !== TREE_ID) {
            continue;
        }

        const dist = Math.abs(obj.x - x) + Math.abs(obj.y - y);

        if (dist < bestDist) {
            bestDist = dist;
            tree = obj;
        }
    }

    if (!tree) {
        return null;
    }

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        if (isWalkable(world, tree.x + dx, tree.y + dy)) {
            return { x: tree.x + dx, y: tree.y + dy };
        }
    }

    return null;
}

// spawn a woodcutter bot near a tree by (x,y) and start it; returns the BotPlayer.
function spawn(world, opts = {}) {
    const id = BOT_ID_BASE + botCounter;
    botCounter += 1;

    const spot =
        tileNextToNearestTree(world, opts.x || 122, opts.y || 657) || {
            x: opts.x,
            y: opts.y
        };

    const username = opts.username || `woodbot${botCounter}`;
    const pers = personality.makePersonality(opts.archetype || 'skiller');
    const data = makeBotData({
        id,
        username,
        x: spot.x,
        y: spot.y,
        cache: {
            bot: {
                type: 'woodcutter',
                options: {},
                personality: pers,
                mood: mood.init(pers)
            }
        }
    });

    const bot = new BotPlayer(world, data);

    // woodcutter loadout, added before login
    bot.inventory.add(BRONZE_AXE_ID);

    bot.login(); // world.addEntity('players', bot): broadcasts join, renders
    bot.brain = makeBrain(bot, 'woodcutter');

    activeBots.add(bot);
    bot.save(); // persist immediately

    return bot;
}

// spawn a combat bot at (x,y) with a fighting loadout and a CombatBrain; opts.brain merges into the options.
function spawnFighter(world, opts = {}) {
    const id = BOT_ID_BASE + botCounter;
    botCounter += 1;

    const username = opts.username || `fighterbot${botCounter}`;
    const data = makeBotData({ id, username, x: opts.x, y: opts.y });

    // enough melee to beat low-level targets; hits 20 gives room to eat.
    for (const s of ['attack', 'strength', 'defense']) {
        data.skills[s] = { current: 15, base: 15, experience: experienceForLevel(15) };
    }
    data.skills.hits = { current: 20, base: 20, experience: experienceForLevel(20) };

    // brain descriptor persists in cache.bot; home leashes to the spawn tile.
    const brainOptions = {
        home: { x: data.x, y: data.y },
        ...(opts.brain || {})
    };
    const pers = personality.makePersonality(opts.archetype || 'warrior');
    data.cache = {
        bot: {
            type: 'fighter',
            options: brainOptions,
            personality: pers,
            mood: mood.init(pers)
        }
    };

    const bot = new BotPlayer(world, data);

    for (let i = 0; i < 15; i += 1) {
        bot.inventory.add(BREAD_ID);
    }

    bot.login();
    bot.brain = makeBrain(bot, 'fighter', brainOptions);

    activeBots.add(bot);
    bot.save(); // persist immediately

    return bot;
}

// spawn a career bot: mixed loadout + a CareerBrain that rotates combat/gather/wander by personality.
function spawnCareer(world, opts = {}) {
    const id = BOT_ID_BASE + botCounter;
    botCounter += 1;

    const username = opts.username || `bot${botCounter}`;
    const data = makeBotData({ id, username, x: opts.x, y: opts.y });

    for (const s of ['attack', 'strength', 'defense']) {
        data.skills[s] = { current: 10, base: 10, experience: experienceForLevel(10) };
    }
    data.skills.hits = { current: 15, base: 15, experience: experienceForLevel(15) };

    // an alcher needs the magic level to turn loot into gold.
    if (opts.alcher) {
        data.skills.magic = { current: 75, base: 75, experience: experienceForLevel(75) };
    }

    // a bank food reserve to restock from; alchers also bank a rune reserve.
    data.bank = [{ id: BREAD_ID, amount: 40 }];
    if (opts.alcher) {
        data.bank.push({ id: 40, amount: 2000 }); // nature runes
        data.bank.push({ id: 31, amount: 5000 }); // fire runes
    }

    const careerOptions = {
        home: { x: data.x, y: data.y },
        ...(opts.brain || {})
    };
    const pers = personality.makePersonality(opts.archetype || 'random');
    data.cache = {
        bot: {
            type: 'career',
            options: careerOptions,
            personality: pers,
            mood: mood.init(pers),
            money: normalizeMoney(opts.money, opts.alcher),
            pvp: botPvp.normalizeLevel(opts.pvp),
            party: botPvp.normalizeLevel(opts.party),
            trade: botPvp.normalizeLevel(opts.trade),
            factionJoin: opts.factionJoin == null ? 2 : botPvp.normalizeLevel(opts.factionJoin),
            focus: normalizeFocus(opts.focus)
        }
    };
    if (normalizeFocus(opts.focus) === 'magic') {
        seedMageData(data);
    } else if (normalizeFocus(opts.focus) === 'ranged') {
        seedRangerData(data);
    }
    if (botPvp.normalizeLevel(opts.pvp) > 0) {
        seedPkerData(data);
    }

    const bot = new BotPlayer(world, data);

    // no free toolkit: the bot starts with a small purse and buys its tools (needs.js).
    bot.inventory.add(COINS_ID, STARTER_COINS);
    if (opts.alcher) {
        bot.inventory.add(31, 500); // fire runes (stackable)
        bot.inventory.add(40, 200); // nature runes
    }
    if (normalizeFocus(opts.focus) === 'magic') {
        applyMageLoadout(bot);
    } else if (normalizeFocus(opts.focus) === 'ranged') {
        applyRangerLoadout(bot);
    }
    if (botPvp.normalizeLevel(opts.pvp) > 0) {
        applyPkerKit(bot);
    }

    bot.login();
    bot.brain = makeBrain(bot, 'career', careerOptions);

    activeBots.add(bot);
    bot.save();

    return bot;
}

// recreate a bot from a persisted roster record; the brain is rebuilt from its saved descriptor.
function createFromRecord(world, record) {
    const bot = new BotPlayer(world, record);
    bot.combatStyle = normalizeCombatStyle(record.combatStyle);
    bot.login();

    const descriptor =
        (record.cache && record.cache.bot) || { type: 'woodcutter', options: {} };
    bot.brain = makeBrain(bot, descriptor.type, descriptor.options || {});

    activeBots.add(bot);
    return bot;
}

// config-driven customisable bots (the client "Bots tab" data path). a def sets name, archetype,
// brain, appearance, personality, targetIds, leash, skills, x/y; spawned from config.bots by name.

const APPEARANCE_KEYS = [
    'hairColour',
    'topColour',
    'trouserColour',
    'skinColour',
    'headSprite',
    'bodySprite'
];

// head/body sprite values are 1-based: valid heads {1,4,6,7,8}, bodies {2,5}.
// shift an old 0-based value up when its +1 is valid, else fall back to head1/body1.
const VALID_HEAD_SPRITES = new Set([1, 4, 6, 7, 8]);
const VALID_BODY_SPRITES = new Set([2, 5]);

function normalizeSpriteValues(obj) {
    if (!VALID_HEAD_SPRITES.has(obj.headSprite)) {
        obj.headSprite = VALID_HEAD_SPRITES.has(obj.headSprite + 1)
            ? obj.headSprite + 1
            : 1;
    }

    if (!VALID_BODY_SPRITES.has(obj.bodySprite)) {
        obj.bodySprite = VALID_BODY_SPRITES.has(obj.bodySprite + 1)
            ? obj.bodySprite + 1
            : 2;
    }

    return obj;
}

function nextBotId() {
    const id = BOT_ID_BASE + botCounter;
    botCounter += 1;
    return id;
}

// resolve a def's personality vector: the archetype preset plus per-bot jitter, or
// the preset with the def's explicit slider values layered on (no jitter).
function resolvePersonality(def) {
    const archetype = def.archetype || 'random';
    if (!def.personality) {
        return personality.makePersonality(archetype);
    }
    const baseArchetype =
        archetype === 'random'
            ? def.personality.archetype || personality.randomArchetype()
            : archetype;
    const base = personality.basePreset(baseArchetype);
    const resolved = {
        ...base,
        ...def.personality,
        archetype: def.personality.archetype || baseArchetype
    };
    // every trait is a 0..1 weight; scale a raw 0-100 value down and clamp to range.
    for (const dim of Object.keys(resolved)) {
        const v = resolved[dim];
        if (typeof v !== 'number' || dim === 'archetype') continue;
        resolved[dim] = personality.clamp01(v > 1 ? v / 100 : v);
    }
    return resolved;
}

// money lean: how a bot turns loot into wealth. 'smart' (default) decides per-item,
// 'bank' hoards, 'sell' sells at shops, 'alch' high-alchs (needs magic 75 + runes).
const MONEY_METHODS = ['smart', 'bank', 'sell', 'alch'];
function normalizeMoney(money, legacyAlcher) {
    if (legacyAlcher && (money === undefined || money === null || money === '')) {
        return 'alch';
    }
    if (typeof money === 'string' && MONEY_METHODS.includes(money)) {
        return money;
    }
    if (typeof money === 'number' && MONEY_METHODS[money]) {
        return MONEY_METHODS[money];
    }
    return 'smart';
}

// combat style index: 0 controlled, 1 aggressive, 2 accurate, 3 defensive.
function normalizeCombatStyle(style) {
    const n = typeof style === 'number' ? style : 0;
    return n >= 0 && n <= 3 ? n : 0;
}

// combat focus: 'auto' (from what it owns), 'melee', 'magic' (casts spells), 'ranged' (bow+arrows).
const COMBAT_FOCI = ['auto', 'melee', 'magic', 'ranged'];
function normalizeFocus(focus) {
    if (typeof focus === 'string' && COMBAT_FOCI.includes(focus)) {
        return focus;
    }
    if (typeof focus === 'number' && COMBAT_FOCI[focus]) {
        return COMBAT_FOCI[focus];
    }
    return 'auto';
}

// starting mage kit: magic level, staff of air, combat runes, bank reserve.
const STAFF_OF_AIR_ID = 101;
const MAGE_START_LEVEL = 40;
// [runeId, carried, banked]: mind/chaos/water/earth/fire/death (air = staff).
const MAGE_RUNES = [
    [35, 400, 2000], // mind
    [41, 200, 1000], // chaos
    [32, 200, 1000], // water
    [34, 200, 1000], // earth
    [31, 200, 1000], // fire
    [38, 50, 300] // death
];
function seedMageData(data) {
    // trained magic level only; the bot buys strike runes via needs.js.
    data.skills.magic = {
        current: MAGE_START_LEVEL, base: MAGE_START_LEVEL, experience: experienceForLevel(MAGE_START_LEVEL) };
}
function applyMageLoadout(bot) {
    // no free staff or runes: a mage bot buys them (needs.js) once it can afford them.
}

// starting ranger kit: shortbow + bronze arrows + a ranged level + a bank reserve.
const SHORTBOW_ID = 189;
const BRONZE_ARROWS_ID = 11;
const RANGER_START_LEVEL = 25;
const RANGER_ARROWS_CARRIED = 500;
const RANGER_ARROWS_BANKED = 2000;
function seedRangerData(data) {
    // trained ranged level only; the bot buys a bow + arrows via needs.js.
    data.skills.ranged = {
        current: RANGER_START_LEVEL, base: RANGER_START_LEVEL, experience: experienceForLevel(RANGER_START_LEVEL) };
}
function applyRangerLoadout(bot) {
    // no free bow or arrows: a ranger bot buys them (needs.js) once it can afford them.
}

// pker escape kit: magic + varrock-teleport runes (law/air/fire) to bail from a losing fight.
const LAW_RUNE_ID = 42;
const PKER_TELE_RUNES = [[LAW_RUNE_ID, 10, 50], [33, 30, 200], [31, 10, 100]];
function seedPkerData(data) {
    const mag = data.skills.magic;
    if (!mag || (mag.base || 0) < 25) {
        data.skills.magic = {
            current: 25, base: 25, experience: Math.max((mag && mag.experience) || 0, experienceForLevel(25))
        };
    }
    data.bank = data.bank || [];
    for (const [id, , banked] of PKER_TELE_RUNES) {
        data.bank.push({ id, amount: banked });
    }
}
function applyPkerKit(bot) {
    for (const [id, carried] of PKER_TELE_RUNES) {
        bot.inventory.add(id, carried);
    }
}

// a def with no explicit x/y spawns at a walkable starter-town waypoint chosen by a stable hash of its name,
// so bots spread across the low-level starter cities and keep a consistent starting area across reboots.
const PLANE = 944; // planeElevation; floor = y / PLANE
// starter-city centres: Lumbridge, Draynor, Al-Kharid, Varrock, Falador.
const TOWN_CENTERS = [
    [120, 648], // Lumbridge (the world respawn hub)
    [214, 632], // Draynor
    [72, 696],  // Al-Kharid
    [120, 504], // Varrock
    [312, 552]  // Falador
];
const TOWN_RADIUS = 28; // tiles (Chebyshev) around a centre
let _spawnNodes;
function ensureSpawnNodes() {
    if (_spawnNodes) {
        return;
    }
    const nx = (n) => (Array.isArray(n) ? n[0] : n && n.x);
    const ny = (n) => (Array.isArray(n) ? n[1] : n && n.y);
    // ground-level nodes within a starter town (y < PLANE keeps bots out of upstairs/dungeon nodes).
    const all = require('./waypoints.json').nodes || [];
    _spawnNodes = all.filter((n) => {
        const x = nx(n);
        const y = ny(n);
        if (typeof x !== 'number' || typeof y !== 'number' || y < 0 || y >= PLANE) {
            return false;
        }
        return TOWN_CENTERS.some(
            (c) => Math.max(Math.abs(x - c[0]), Math.abs(y - c[1])) <= TOWN_RADIUS
        );
    });
    if (!_spawnNodes.length) {
        _spawnNodes = TOWN_CENTERS.slice(); // fallback: the town centres themselves
    }
}
function scatterSpawn(key) {
    try {
        ensureSpawnNodes();
        if (_spawnNodes && _spawnNodes.length) {
            let h = 2166136261;
            const s = String(key || '').toLowerCase();
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i);
                h = (h * 16777619) >>> 0;
            }
            const n = _spawnNodes[h % _spawnNodes.length];
            if (Array.isArray(n)) {
                return { x: n[0], y: n[1] };
            }
            if (n && typeof n.x === 'number') {
                return { x: n.x, y: n.y };
            }
        }
    } catch (e) {
        // fall through to the default tile
    }
    return { x: 122, y: 657 };
}

// fresh playerData from a definition
function dataFromDef(def) {
    const archetype = def.archetype || 'random';
    const pers = resolvePersonality(def);
    const brainType = def.brain || 'career';
    let x, y;
    if (typeof def.x === 'number' && typeof def.y === 'number') {
        x = def.x;
        y = def.y;
    } else {
        const p = scatterSpawn(def.name || def.username);
        x = p.x;
        y = p.y;
    }

    const options = { home: def.home || { x, y } };
    if (def.targetIds) options.targetIds = def.targetIds;
    if (typeof def.leash === 'number') options.leash = def.leash;
    if (typeof def.blockTicks === 'number') options.blockTicks = def.blockTicks;

    const money = normalizeMoney(def.money, def.alcher);
    const combatStyle = normalizeCombatStyle(def.combatStyle);

    const data = makeBotData({
        id: nextBotId(),
        username: def.name,
        x,
        y,
        cache: {
            bot: {
                type: brainType,
                options,
                personality: pers,
                mood: mood.init(pers),
                money,
                pvp: botPvp.normalizeLevel(def.pvp),
                party: botPvp.normalizeLevel(def.party),
                trade: botPvp.normalizeLevel(def.trade),
                factionJoin: def.factionJoin == null ? 2 : botPvp.normalizeLevel(def.factionJoin),
                focus: normalizeFocus(def.focus),
                paced: !!def.paced
            }
        }
    });
    data.combatStyle = combatStyle;

    for (const k of APPEARANCE_KEYS) {
        if (def.appearance && typeof def.appearance[k] === 'number') {
            data[k] = def.appearance[k];
        }
    }
    normalizeSpriteValues(data);

    if (brainType === 'career' || brainType === 'fighter') {
        for (const s of ['attack', 'strength', 'defense']) {
            data.skills[s] = { current: 10, base: 10, experience: experienceForLevel(10) };
        }
        data.skills.hits = { current: 15, base: 15, experience: experienceForLevel(15) };
    }
    if (def.startSkills) {
        for (const [s, lvl] of Object.entries(def.startSkills)) {
            if (data.skills[s]) {
                data.skills[s] = { current: lvl, base: lvl, experience: experienceForLevel(lvl) };
            }
        }
    }
    // the Bot Manager's per-skill levels (level + the experience for it)
    if (def.skills) {
        applySkillLevels(data.skills, def.skills);
        data.cache.bot.appliedSkills = JSON.stringify(def.skills);
    }
    if (money === 'alch') {
        data.skills.magic = { current: 75, base: 75, experience: experienceForLevel(75) };
    }

    data.bank = [{ id: BREAD_ID, amount: 40 }];
    if (money === 'alch') {
        data.bank.push({ id: 40, amount: 2000 });
        data.bank.push({ id: 31, amount: 5000 });
    }

    // a magic/ranged-focus bot: seed its skill + ammo reserve (carried kit added in applyLoadout).
    if (normalizeFocus(def.focus) === 'magic') {
        seedMageData(data);
    } else if (normalizeFocus(def.focus) === 'ranged') {
        seedRangerData(data);
    }
    if (botPvp.normalizeLevel(def.pvp) > 0) {
        seedPkerData(data); // teleport-escape kit for wilderness hunters
    }

    return data;
}

// set skills to the manager's levels (base, current, experience); hits floor 10.
function applySkillLevels(skills, levels) {
    for (const [s, lvl] of Object.entries(levels || {})) {
        if (!skills[s]) {
            continue;
        }

        let level = Math.max(1, Math.min(99, lvl | 0));

        if (s === 'hits' && level < 10) {
            level = 10;
        }

        skills[s] = {
            current: level,
            base: level,
            experience: experienceForLevel(level)
        };
    }
}

// apply the def's editable fields onto a saved record, keeping its progress.
function applyDefEdits(record, def) {
    for (const k of APPEARANCE_KEYS) {
        if (def.appearance && typeof def.appearance[k] === 'number') {
            record[k] = def.appearance[k];
        }
    }
    normalizeSpriteValues(record);
    record.cache = record.cache || {};
    const cb = record.cache.bot || (record.cache.bot = {});
    if (def.brain) {
        cb.type = def.brain;
    }
    cb.money = normalizeMoney(def.money, def.alcher);
    cb.pvp = botPvp.normalizeLevel(def.pvp);
    cb.party = botPvp.normalizeLevel(def.party);
    cb.trade = botPvp.normalizeLevel(def.trade);
    // faction-join inclination (0 = lone wolf, 3 = joiner); default 2 when unset.
    cb.factionJoin = def.factionJoin == null ? 2 : botPvp.normalizeLevel(def.factionJoin);
    cb.focus = normalizeFocus(def.focus);
    cb.paced = !!def.paced;
    // apply the manager's levels once per change (kept until edited again).
    if (def.skills) {
        const wanted = JSON.stringify(def.skills);

        if (cb.appliedSkills !== wanted) {
            record.skills = record.skills || {};
            applySkillLevels(record.skills, def.skills);
            cb.appliedSkills = wanted;
        }
    }
    // an existing bot switched to magic focus needs the level + runes to cast
    if (cb.focus === 'magic') {
        record.skills = record.skills || {};
        const mag = record.skills.magic;
        if (!mag || (mag.base || 0) < MAGE_START_LEVEL) {
            record.skills.magic = {
                current: MAGE_START_LEVEL, base: MAGE_START_LEVEL, experience: Math.max((mag && mag.experience) || 0, experienceForLevel(MAGE_START_LEVEL))
            };
        }
        record.bank = record.bank || [];
        if (!record.bank.some((it) => it && it.id === 35)) {
            for (const [id, , banked] of MAGE_RUNES) {
                record.bank.push({ id, amount: banked });
            }
        }
    }
    record.combatStyle = normalizeCombatStyle(def.combatStyle);
    // an existing bot switched to alch needs the magic + runes to do it
    if (cb.money === 'alch') {
        record.skills = record.skills || {};
        const mag = record.skills.magic;
        if (!mag || (mag.base || 0) < 75) {
            record.skills.magic = { current: 75, base: 75, experience: experienceForLevel(75) };
        }
        record.bank = record.bank || [];
        if (!record.bank.some((it) => it && it.id === 31)) {
            record.bank.push({ id: 40, amount: 2000 });
            record.bank.push({ id: 31, amount: 5000 });
        }
    }
    cb.options = cb.options || {};
    if (def.targetIds) {
        cb.options.targetIds = def.targetIds;
    }
    if (typeof def.leash === 'number') {
        cb.options.leash = def.leash;
    }
    if (typeof def.blockTicks === 'number') {
        cb.options.blockTicks = def.blockTicks;
    }
    if (def.home) {
        cb.options.home = def.home;
    }
    if (def.personality) {
        // explicit slider values merged over the preset; re-baseline mood.
        cb.personality = resolvePersonality(def);
        cb.mood = mood.init(cb.personality);
    } else if (
        def.archetype &&
        (!cb.personality || cb.personality.archetype !== def.archetype)
    ) {
        cb.personality = personality.makePersonality(def.archetype);
        cb.mood = mood.init(cb.personality);
    }
}

// starting inventory loadout for a freshly-created def bot
function applyLoadout(bot, def) {
    const type = (bot.cache.bot && bot.cache.bot.type) || 'career';
    // no free toolkit: a def-spawned bot buys its own kit (needs.js); just a purse.
    if (type === 'career' || type === 'woodcutter' || type === 'fighter') {
        bot.inventory.add(COINS_ID, STARTER_COINS);
    }
    if (normalizeMoney(def.money, def.alcher) === 'alch') {
        bot.inventory.add(31, 500);
        bot.inventory.add(40, 200);
    }
    if (normalizeFocus(def.focus) === 'magic') {
        applyMageLoadout(bot); // staff of air + combat runes
    } else if (normalizeFocus(def.focus) === 'ranged') {
        applyRangerLoadout(bot); // shortbow + bronze arrows
    }
    if (botPvp.normalizeLevel(def.pvp) > 0) {
        applyPkerKit(bot); // teleport-escape runes
    }
}

// build a bot from a def, or restore its saved progress by name and re-apply the def's edits.
function spawnFromDef(world, def) {
    const dc = world.server.dataClient;
    const uname = String(def.name || '').toLowerCase();
    const saved =
        dc && typeof dc.getBots === 'function'
            ? dc
                  .getBots()
                  .find((r) => String(r.username).toLowerCase() === uname)
            : null;

    let data;
    let fresh;
    if (saved) {
        data = saved;
        applyDefEdits(data, def);
        fresh = false;
    } else {
        data = dataFromDef(def);
        fresh = true;
    }

    // nobody spawns on top of someone: settle onto the nearest free tile
    try {
        const spot = freeTileNear(world, data.x, data.y, 4, null);
        if (spot) {
            data.x = spot.x;
            data.y = spot.y;
        }
    } catch (e) {
        // the chosen tile is kept
    }

    const bot = new BotPlayer(world, data);
    // set combatStyle live from the def/record (the Player ctor only keeps it when configured to).
    bot.combatStyle = normalizeCombatStyle(data.combatStyle);
    if (fresh) {
        applyLoadout(bot, def);
    }

    bot.login();
    const cb = data.cache.bot || {};
    bot.brain = makeBrain(bot, cb.type || 'career', cb.options || {});

    activeBots.add(bot);
    bot.save();
    return bot;
}

// spawn a roster of defs; returns the set of lowercased usernames spawned.
const WAKE_SPREAD_TICKS = 45; // a roster wakes over ~30 s, ~2 bots per tick at 100
function spawnRoster(world, defs) {
    const spawned = new Set();
    const total = (defs || []).length;
    let i = 0;
    for (const def of defs || []) {
        if (!def || !def.name) {
            continue;
        }
        // a disabled bot stays out of the world; its saved record is left alone.
        if (def.enabled === false) {
            spawned.add(String(def.name).toLowerCase());
            continue;
        }
        try {
            const bot = spawnFromDef(world, def);
            spawned.add(String(bot.username).toLowerCase());
            // staggered first brain pass; the first two wake on tick 1.
            bot._wakeTick = ((world.ticks | 0) + 1) + (total > 2 ? Math.floor((i * WAKE_SPREAD_TICKS) / total) : 0);
            i += 1;
        } catch (e) {
            // one bad def must never break the boot
        }
    }
    return spawned;
}

// spawn every persisted bot into the world; skip (lowercased usernames) is the config roster already spawned.
function restoreBots(world, skip) {
    const dc = world.server.dataClient;

    if (!dc || typeof dc.getBots !== 'function') {
        return 0;
    }

    let restored = 0;
    let maxCounter = 0;

    for (const record of dc.getBots()) {
        const uname = String(record.username).toLowerCase();
        if (skip && skip.has(uname)) {
            continue; // already spawned from the config roster
        }

        try {
            const b = createFromRecord(world, record);
            // restored wake: spread like the roster
            if (b) b._wakeTick = ((world.ticks | 0) + 1) + Math.floor((restored * WAKE_SPREAD_TICKS) / Math.max(1, dc.getBots().length));
            restored += 1;

            // keep botCounter ahead of restored ids so fresh spawns don't collide
            if (typeof record.id === 'number' && record.id >= BOT_ID_BASE) {
                maxCounter = Math.max(maxCounter, record.id - BOT_ID_BASE + 1);
            }
        } catch (e) {
            // a corrupt record must not stop the rest from restoring
        }
    }

    botCounter = Math.max(botCounter, maxCounter);
    return restored;
}

// persist all active bots now.
async function persistAll() {
    for (const bot of activeBots) {
        try {
            await bot.save();
        } catch (e) {
            // best-effort
        }
    }
}

function despawn(world, bot) {
    try {
        require('../party').onLogout(bot);
    } catch (e) {
        // bot wasn't in a party, or the module shape changed; tear down anyway
    }

    activeBots.delete(bot);
    world.removeEntity('players', bot);

    // remove a despawned bot from the persistent roster so it doesn't respawn.
    const dc = world.server.dataClient;
    if (dc && typeof dc.deleteBot === 'function') {
        try {
            dc.deleteBot(bot.username);
        } catch (e) {
            // best-effort
        }
    }
}

function despawnAll(world) {
    for (const bot of Array.from(activeBots)) {
        despawn(world, bot);
    }
}

// one bot's full brain pass for this tick, dispatched by onBehaviorTick(); each brain owns its own busy-gating.
function runBotBrain(player) {
    if (!player.isBot || !player.brain) {
        return;
    }

    // memoise getNearbyEntities by (type, range) for the tick; the bot doesn't move mid-tick,
    // so the result is invariant. reset fresh each tick.
    if (!player._scanWrapped) {
        const raw = player.getNearbyEntities.bind(player);
        player._rawGetNearby = raw;
        player.getNearbyEntities = function (type, range) {
            const c = player._scanCache;
            if (!c) { return raw(type, range); }
            const key = type + (range === undefined ? '48' : range);
            const hit = c[key];
            if (hit !== undefined) { return hit; }
            const r = raw(type, range);
            c[key] = r;
            return r;
        };
        player._scanWrapped = true;
    }
    player._scanCache = {};

    // every line this bot says leaves through the paced say queue (dialogue.pacedChat).
    if (!player._chatPaced) {
        const orig = Object.getPrototypeOf(player).broadcastChat;
        player.broadcastChat = function (message, dialogueFlag) {
            return dialogueMod().pacedChat(player, orig, message, dialogueFlag);
        };
        player._chatPaced = true;
    }
    try { dialogueMod().flush(player); } catch (e) {  }

    // cosmetic pollers run on a 1-in-2 stride offset by bot id; survival/combat/trips/economy/processing never stride.
    const cosmeticTick = (((player.id | 0) + (player.world ? player.world.ticks : 0)) % 2) === 0;

    // movement precedence when several systems want to act: trade > chat command > party rally > pacing > brain.
    // survival and combat outrank all (the command/rally guards return false while fighting/locked/on an errand).

    // paced-leveling governor: drips catch-up xp when the toggle is on, else a no-op.
    try {
        governor.apply(player);
    } catch (e) {
        pollerFailed(e);
    }

    // mood/memory/goals: emotion + memory decay and objective advancement; strided 1-in-2 for busy bots.
    if (cosmeticTick) {
    // mood: decay, event detection, occasional curated chat.
    try {
        mood.onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // memory: poll pvp outcomes -> grudges, area avoidance, a win/loss record; decays.
    try {
        botMemory.onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // goals: advance the bot's objective, re-picking a fresh one when achieved.
    try {
        goals.onTick(player);
    } catch (e) {
        pollerFailed(e);
    }
    }

    // learning: adapt combat tactics from experience (eat sooner, mark dangerous foes).
    try {
        mod('learning').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // threat routing: step away from a dangerous aggressive monster closing in; owns the tick when it flinches.
    try {
        if (mod('threat').onTick(player)) {
            return;
        }
    } catch (e) {
        pollerFailed(e);
    }

    // processing: turn raw materials into a production skill via the real skill hooks.
    try {
        mod('processing').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // cleanup: pick up the bot's own dropped items so a many-bot world stays tidy.
    try {
        mod('cleanup').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // scavenge: an idle bot grabs a worthwhile unowned item on the ground nearby.
    try {
        if (mod('scavenge').onTick(player)) {
            return;
        }
    } catch (e) {
        pollerFailed(e);
    }

    // thieving: a roguish bot pickpockets nearby townsfolk (may get caught).
    try {
        if (mod('thieving').onTick(player)) {
            return; // took a thieving action this tick
        }
    } catch (e) {
        pollerFailed(e);
    }

    // agility: a bot runs an obstacle course for agility xp; owns its movement on a lap.
    try {
        if (mod('agility').onTick(player)) {
            return; // running the course this tick
        }
    } catch (e) {
        pollerFailed(e);
    }

    // crowd: a throng of bots in one spot warms them to each other.
    try {
        mod('crowd').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // contention: a possessive bot resents others crowding its resource patch (a soured tie).
    try {
        mod('contention').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // cosmetic block (strided for busy bots; see cosmeticTick).
    if (cosmeticTick) {
    // region reactions: remark on reaching a new corner of the map (once per place).
    try {
        mod('region-react').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // milestones: celebrate a level-up out loud (nearby bots congratulate).
    try {
        mod('milestone').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // boss-kill: felling a boss earns rep + a tale + a shout nearby bots carry as news.
    try {
        mod('boss-kill').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // familiarity: sustained co-presence with the same player warms the relationship.
    try {
        mod('familiarity').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // evolve: life stages + ambient personality drift.
    try {
        mod('evolve').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // gossip: share strong opinions with nearby bots, spreading reputation.
    try {
        mod('gossip').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // role: a bot mentions the character it's become (fisherman, slayer, merchant).
    try {
        mod('role').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // rivalry: a standing grudge grows into an escalating feud with a cross-session win/loss ledger.
    try {
        mod('rivalry').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // market: a merchant cries its wares at the live supply/demand price.
    try {
        mod('market').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // prosperity (wealth sink): a rich bot drains its surplus by gifting or indulging.
    try {
        if (mod('prosperity').onTick(player)) {
            return;
        }
    } catch (e) {
        pollerFailed(e);
    }

    // lore: at a gathering, tell a tale of a past deed; listeners retell it bigger later.
    try {
        mod('lore').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // reflection: a rare quiet aside where a bot muses on its own story.
    try {
        mod('reflect').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // fortunes: a bot voices a slump and marks the comeback when its spirits turn.
    try {
        mod('fortunes').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // intent: a bot occasionally says what it's off to do next (train, mine, hunt a boss).
    try {
        mod('intent').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // titles: an earned, persistent epithet a proud bot wears out loud.
    try {
        mod('titles').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // legends: bots name-drop the greatest names, so renown travels the whole map.
    try {
        mod('legends').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }
    } // end cosmetic block

    // factions: the friendship graph crystallising into named alliances and rivalries.
    try {
        mod('factions').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // guilds: mark a bot a member when it meets a guild's entry bar; feeds hub.js and travel.js.
    try {
        mod('guilds').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // gear: periodically wear the best gear it owns and show off a notable new piece.
    try {
        mod('gear').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }


    // combat prayers: light the best affordable stat prayers while fighting; stand them down when idle.
    try {
        mod('combat-prayers').tick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // combat potions: in a tough fight, top up the stat the style uses (and defense if hurt).
    try {
        mod('combat-potions').tick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // panic: break off and run from a monster far above the bot's level as its health slips.
    try {
        if (mod('panic').onTick(player)) {
            return; // fleeing this tick
        }
    } catch (e) {
        pollerFailed(e);
    }

    // co-op: pitch in when a nearby player is fighting a monster.
    try {
        if (mod('coop').onTick(player)) {
            return; // engaged combat this tick
        }
    } catch (e) {
        pollerFailed(e);
    }

    // dreams: celebrate a reached aspiration, form a bigger one, muse on the progress.
    try {
        mod('dreams').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // lifecycle: death recovery + a watchdog that unsticks a frozen bot.
    try {
        lifecycle.onTick(player);
        lifecycle.watchdog(player);
    } catch (e) {
        pollerFailed(e);
    }

    // pending party invite: sociable bots accept, antisocial decline.
    if (player.pendingPartyInvite) {
        try {
            const soc = personality.of(player).sociability;
            require('../party')[soc >= 0.35 ? 'accept' : 'decline'](player);
        } catch (e) {
            pollerFailed(e);
        }
    }

    // party leader: a bot with party appetite invites a nearby player to team up.
    try {
        social.maybeFormParty(player);
    } catch (e) {
        pollerFailed(e);
    }

    // trading: continue a live trade, or when idle answer/start one with a nearby player.
    try {
        trades.onTick(player);
    } catch (e) {
        pollerFailed(e);
    }
    if (player.interfaceOpen && player.interfaceOpen.trade) {
        return;
    }

    // duels: run a live one, answer a challenge, or pick a fight; a duel owns the bot until it ends
    try {
        duels.onTick(player);
    } catch (e) {
        pollerFailed(e);
    }
    if (duels.owns(player)) {
        return;
    }

    // chat commands: honour follow/come/wait/go from a trusted voice (never over combat/survival).
    try {
        if (mod('hearing').tickCommands(player)) {
            return;
        }
    } catch (e) {
        pollerFailed(e);
    }

    // party consensus: members vote on a proposed mission pivot and the leader tallies.
    try {
        mod('party-consensus').tick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // party coordination: on a shared mission, rally to the gather point; owns the tick while travelling.
    try {
        if (mod('party-coord').coordinate(player)) {
            return;
        }
    } catch (e) {
        pollerFailed(e);
    }

    // emergent social: greet friends, taunt rivals, admire the strong, hang out.
    try {
        mod('social-emergent').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // world awareness: notice and remark on nearby happenings (low-hp friend, a drop, a fight).
    try {
        mod('events').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // mentoring: a strong, kind bot encourages a nearby beginner.
    try {
        mod('mentoring').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // conversation: a sociable bot strikes up a chat with someone nearby (heard + replied via hearing.js).
    try {
        mod('conversation').onTick(player);
    } catch (e) {
        pollerFailed(e);
    }

    // human pacing: a free bot sometimes takes a beat instead of acting instantly; never gates a busy bot.
    try {
        if (!pacing.isBusy(player) && !pacing.act(player)) {
            pacing.fidget(player);
            return;
        }
    } catch (e) {
        pollerFailed(e);
    }

    // congregation: a sociable bot sometimes hangs out at a bank/square instead of grinding.
    try {
        if (mod('hub').onTick(player)) { return; }
    } catch (e) {
        pollerFailed(e);
    }

    try {
        player.brain.tick();
    } catch (e) {
        pollerFailed(e);
    }
}

// every bot runs its full brain every tick; no bot is ever skipped.

// called once per player per world tick; fast-returns for non-bots.
const STEP_DIRECTIONS = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]
];

// is anyone standing on (x, y)?
function tileTaken(world, x, y, except) {
    for (const p of world.players.getInArea(x, y, 1)) {
        if (p !== except && p.x === x && p.y === y) {
            return true;
        }
    }
    return false;
}

// the nearest walkable, unoccupied tile to (x,y) within radius, or (x,y) if free.
function freeTileNear(world, x, y, radius, except) {
    if (isWalkable(world, x, y) && !tileTaken(world, x, y, except)) {
        return { x, y };
    }
    for (let r = 1; r <= radius; r++) {
        const ring = [];
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) === r) {
                    ring.push([dx, dy]);
                }
            }
        }
        for (let i = ring.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ring[i], ring[j]] = [ring[j], ring[i]];
        }
        for (const [dx, dy] of ring) {
            if (isWalkable(world, x + dx, y + dy) && !tileTaken(world, x + dx, y + dy, except)) {
                return { x: x + dx, y: y + dy };
            }
        }
    }
    return null;
}

// step off a shared tile when nothing holds the bot, and drift to elbow room in a crowd.
function personalSpace(bot) {
    if (
        bot.walkQueue.length ||
        bot.locked ||
        bot.opponent ||
        bot.gatheringSkill ||
        (bot.interfaceOpen && (bot.interfaceOpen.trade || bot.interfaceOpen.bank))
    ) {
        return;
    }

    let sharing = false;
    let neighbours = 0;

    // the raw scan: this runs before the brain resets its per-tick cache
    const nearby = (bot._rawGetNearby || bot.getNearbyEntities).call(bot, 'players', 1);

    for (const other of nearby) {
        if (other === bot) {
            continue;
        }
        if (other.x === bot.x && other.y === bot.y) {
            sharing = true;
        } else if (Math.abs(other.x - bot.x) <= 1 && Math.abs(other.y - bot.y) <= 1) {
            neighbours += 1;
        }
    }

    // sharing a tile always moves; otherwise a reserved bot occasionally drifts to a roomier tile.
    if (bot._spaceCd > 0) {
        bot._spaceCd -= 1;
    }
    if (!sharing) {
        const reserved = (personality.of(bot).sociability || 0.5) < 0.45;
        if (!reserved || neighbours === 0 || bot._spaceCd > 0 || Math.random() > 0.06) {
            return;
        }
    }

    const dirs = STEP_DIRECTIONS.slice();
    for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    const open = [];
    const roomy = [];

    for (const [dx, dy] of dirs) {
        if (!bot.canWalk(dx, dy)) {
            continue;
        }
        const tx = bot.x + dx;
        const ty = bot.y + dy;
        if (tileTaken(bot.world, tx, ty, bot)) {
            continue;
        }
        open.push([dx, dy]);
        let crowded = false;
        for (const other of bot.world.players.getInArea(tx, ty, 1)) {
            if (other !== bot && Math.abs(other.x - tx) <= 1 && Math.abs(other.y - ty) <= 1) {
                crowded = true;
                break;
            }
        }
        if (!crowded) {
            roomy.push([dx, dy]);
        }
    }

    // squeezed off a shared tile: any open tile; otherwise only a roomier one.
    const choices = sharing ? (open.length ? open : []) : roomy;
    if (!choices.length) {
        return;
    }
    const [dx, dy] = choices[Math.floor(Math.random() * choices.length)];
    bot.walkTo(dx, dy);
    bot._spaceCd = 40 + Math.floor(Math.random() * 60);
}

function onBehaviorTick(player) {
    if (!player.isBot || !player.brain) {
        return;
    }

    const world = player.world;
    const ticks = (world && world.ticks) | 0;

    // stagger each bot's first brain pass over the first ~45 ticks (the heaviest passes).
    // never applies to bots spawned during play (no _wakeTick).
    if (player._wakeTick && ticks < player._wakeTick) {
        return;
    }

    // an idle bot sharing a tile steps aside (checked every few ticks).
    if ((ticks + player.id) % 6 === 0) {
        try {
            personalSpace(player);
        } catch (e) {
            // never at the cost of the tick
        }
    }

    try {
        runBotBrain(player);
    } catch (e) {
        // a brain must never break the tick
    }

}

module.exports = {
    spawn,
    spawnFighter,
    spawnCareer,
    spawnFromDef,
    spawnRoster,
    createFromRecord,
    restoreBots,
    persistAll,
    despawn,
    despawnAll,
    onBehaviorTick,
    activeBots
};
