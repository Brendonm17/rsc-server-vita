// the bots' in-game wiki, built from rsc-data plus a hand-curated tips layer.
// answer(bot, text) -> a factual answer string, or null if not a game-knowledge question.

const itemDefs = require('@2003scape/rsc-data/config/items');
const wield = require('@2003scape/rsc-data/wieldable');
const edible = require('@2003scape/rsc-data/edible');
const npcDefs = require('@2003scape/rsc-data/config/npcs');
const npcLocs = require('@2003scape/rsc-data/locations/npcs');
const shops = require('@2003scape/rsc-data/shops');
const spells = require('@2003scape/rsc-data/config/spells');
const prayers = require('@2003scape/rsc-data/config/prayers');
const npcDrops = require('@2003scape/rsc-data/rolls/drops');
const objLocs = require('@2003scape/rsc-data/locations/objects');
const mapData = require('./map-data'); // facility/banker locator
const QUESTS = require('./quests-data');

// ---- lowercased lookup tables (built once) ---------------------------------
const itemByName = new Map(); // name -> id
itemDefs.forEach((d, id) => { if (d && d.name) itemByName.set(d.name.toLowerCase(), id); });
const npcByName = new Map();
npcDefs.forEach((d, id) => { if (d && d.name && !npcByName.has(d.name.toLowerCase())) npcByName.set(d.name.toLowerCase(), id); });
// all spawns per npc id, to point to the closest one to the asker
const npcSpawns = new Map();
for (const s of npcLocs) { if (!npcSpawns.has(s.id)) npcSpawns.set(s.id, []); npcSpawns.get(s.id).push({ x: s.x, y: s.y }); }
function nearestSpawn(id, x, y) {
    const list = npcSpawns.get(id);
    if (!list || !list.length) return null;
    if (typeof x !== 'number') return list[0];
    let best = null, bd = Infinity;
    for (const s of list) { const d = Math.abs(s.x - x) + Math.abs(s.y - y); if (d < bd) { bd = d; best = s; } }
    return best;
}
const spellByName = new Map();
spells.forEach((s) => { if (s && s.name) spellByName.set(s.name.toLowerCase(), s); });
const prayerByName = new Map();
prayers.forEach((p) => { if (p && p.name) prayerByName.set(p.name.toLowerCase(), p); });
// reverse drop table: item id -> Set of monster names that drop it
const droppersByItem = new Map();
for (const [npcId, table] of Object.entries(npcDrops)) {
    const nd = npcDefs[npcId];
    if (!nd || !Array.isArray(table)) continue;
    for (const d of table) {
        if (!droppersByItem.has(d.id)) droppersByItem.set(d.id, new Set());
        droppersByItem.get(d.id).add(nd.name);
    }
}
// facility object-id groups; nearest facility found over locations/objects.json
const FAC_IDS = {
    anvil: [50, 177], furnace: [118, 813, 444], range: [11, 119, 435, 491],
    'spinning wheel': [121], altar: [19, 144, 200, 235, 296, 625]
};
// banker NPC ids; banks are located from their spawns, so a bot names the nearest bank anywhere
const BANKER_IDS = new Set([95, 224, 268, 485, 540, 617]);

// find an entity whose name appears as a whole phrase in the text; prefer the longest match
function findInText(text, table) {
    const m = text.toLowerCase();
    let best = null, bestLen = 0;
    for (const [name, id] of table) {
        if (name.length > bestLen && m.includes(name)) { best = { name, id }; bestLen = name.length; }
    }
    return best;
}

// ---- compass helper --------------------------------------------------------
// RSC coords: higher x = further west, higher y = further south;
// headings are the inverse of the raw deltas.
function compass(fromX, fromY, x, y) {
    const dx = x - fromX, dy = y - fromY;
    let s = '';
    if (dy > 8) s += 'south'; else if (dy < -8) s += 'north';
    if (dx > 8) s += (s ? '-' : '') + 'west'; else if (dx < -8) s += (s ? '-' : '') + 'east';
    return s || 'right here';
}

// named region for a coordinate, so answers say "near Varrock"; coarse boxes over the map
const REGIONS = [
    { name: 'Lumbridge', x: 120, y: 648, r: 60 },
    { name: 'Varrock', x: 130, y: 510, r: 90 },
    { name: 'Draynor', x: 215, y: 632, r: 45 },
    { name: 'Al-Kharid', x: 90, y: 690, r: 55 },
    { name: 'Falador', x: 300, y: 550, r: 80 },
    { name: 'Barbarian Village', x: 230, y: 490, r: 30 },
    { name: 'Edgeville', x: 220, y: 450, r: 35 },
    { name: 'the Wilderness', x: 180, y: 380, r: 220 },
    { name: 'Port Sarim', x: 269, y: 650, r: 45 },
    { name: 'Rimmington', x: 320, y: 660, r: 45 },
    { name: 'the Wizards\' Tower', x: 220, y: 2585, r: 40 },
    { name: 'Karamja', x: 340, y: 710, r: 90 },
    { name: 'Taverley', x: 380, y: 505, r: 60 },
    { name: 'Catherby', x: 440, y: 500, r: 55 },
    { name: 'Seers\' Village', x: 500, y: 450, r: 55 },
    { name: 'Ardougne', x: 560, y: 590, r: 100 },
    // western members lands (reachable now the graph crosses White Wolf Mountain)
    { name: 'Camelot', x: 465, y: 455, r: 35 },
    { name: 'the Fishing Guild', x: 440, y: 470, r: 28 },
    { name: 'the Legends\' Guild', x: 517, y: 545, r: 30 },
    { name: 'Yanille', x: 587, y: 748, r: 55 },
    { name: 'the Gnome Stronghold', x: 700, y: 527, r: 70 },
    { name: 'the Tree Gnome Village', x: 640, y: 490, r: 45 },
    { name: 'Baxtorian Falls', x: 656, y: 448, r: 40 },
    { name: 'White Wolf Mountain', x: 420, y: 460, r: 35 },
    // Karamja + islands (boat-connected)
    { name: 'Brimhaven', x: 460, y: 660, r: 55 },
    { name: 'Shilo Village', x: 400, y: 850, r: 60 },
    // major dungeons (specific ones win over the catch-all by distance)
    { name: 'the Underground Pass', x: 773, y: 3418, r: 90 },
    { name: 'the Temple of Ikov', x: 548, y: 3285, r: 60 },
    { name: 'a deep dungeon', x: 400, y: 3300, r: 600 }
];
function regionOf(x, y) {
    let best = null, bestD = Infinity;
    for (const r of REGIONS) {
        const d = Math.abs(r.x - x) + Math.abs(r.y - y);
        if (d <= r.r && d < bestD) { best = r.name; bestD = d; }
    }
    return best;
}
function placePhrase(bot, x, y) {
    const region = regionOf(x, y);
    if (bot && typeof bot.x === 'number') {
        const dir = compass(bot.x, bot.y, x, y);
        if (dir === 'right here') return region ? `right here in ${region}` : 'right about here';
        return region ? `${dir}, around ${region}` : `to the ${dir}`;
    }
    return region || 'out in the world';
}

// ---- fact builders (return a string or null) -------------------------------

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function itemInfo(bot, name, id) {
    const d = itemDefs[id];
    if (!d) return null;
    const dn = cap(d.name);
    const bits = [];
    const heal = edible[id];
    const w = wield[id];
    if (w) {
        const reqs = w.requirements ? Object.entries(w.requirements).map(([s, l]) => `${s} ${l}`).join(', ') : null;
        const bon = [];
        if (w.weaponPower) bon.push(`+${w.weaponPower} power`);
        if (w.weaponAim) bon.push(`+${w.weaponAim} aim`);
        if (w.armour) bon.push(`+${w.armour} armour`);
        if (w.magic) bon.push(`+${w.magic} magic`);
        if (w.prayer) bon.push(`+${w.prayer} prayer`);
        let line = `${dn}`;
        if (reqs) line += ` needs ${reqs} to wield`;
        if (bon.length) line += `${reqs ? ',' : ' gives'} ${bon.join(', ')}`;
        bits.push(line + '.');
    }
    const healHits = typeof heal === 'number' ? heal : heal && typeof heal.hits === 'number' ? heal.hits : null;
    if (healHits != null) bits.push(`it heals ${healHits} hits when eaten.`);
    if (!bits.length) {
        // plain item: value + members; coins get a shrug
        if (/^coins?$/i.test(dn)) bits.push('coins are worth exactly what they say, mate.');
        else bits.push(`${dn}${d.members ? ' (members)' : ''} is worth about ${d.price} coins.`);
    } else if (d.price) {
        bits.push(`worth about ${d.price} coins${d.members ? ', members' : ''}.`);
    }
    return bits.join(' ');
}

function monsterInfo(bot, name, id) {
    const d = npcDefs[id];
    if (!d) return null;
    const spawn = nearestSpawn(id, bot && bot.x, bot && bot.y);
    let s = cap(d.name);
    if (d.attack && d.hits) {
        const cl = Math.floor(0.25 * (d.defense + d.hits) + 0.325 * (d.attack + d.strength));
        s += ` is around combat ${cl}`;
    }
    if (spawn) s += `; you'll find one ${placePhrase(bot, spawn.x, spawn.y)}`;
    return s + '.';
}

function questInfo(bot, q) {
    const parts = [`${q.name}: start by talking to the quest-giver ${placePhrase(bot, q.hub.x, q.hub.y)}`];
    const p = q.prereqs || {};
    const reqs = [];
    if (p.questPoints) reqs.push(`${p.questPoints} quest points`);
    if (p.skills) for (const s of p.skills) reqs.push(`${s.skill} ${s.level}`);
    if (p.quests) reqs.push(`${p.quests.length} earlier quest${p.quests.length > 1 ? 's' : ''} done`);
    if (reqs.length) parts.push(`you'll need ${reqs.join(', ')}`);
    parts.push(`it gives ${q.qp} quest point${q.qp > 1 ? 's' : ''}${q.rewards.length ? ' plus ' + q.rewards.map((r) => r.skill + ' xp').filter((v, i, a) => a.indexOf(v) === i).join(', ') : ''}`);
    return parts.join('. ') + '.';
}

function whereToBuySell(bot, name, id, buying) {
    for (const [shopName, shop] of Object.entries(shops)) {
        if (shop.items && shop.items.some((it) => it.id === id)) {
            const pretty = shopName.replace(/-/g, ' ');
            return `try the ${pretty} - it ${buying ? 'stocks' : 'buys'} ${name}.`;
        }
    }
    // general stores buy almost anything
    if (!buying) return `any general store will buy ${name}.`;
    // buying something no shop stocks -> another player or the auction house
    const d = itemDefs[id];
    const price = d && d.price ? ` (worth about ${d.price} coins)` : '';
    return `no shop sells ${name}${price} -- buy it from another player or the auction house.`;
}

function bestFood() {
    // SP is always members, so the true best-healing food is the honest answer
    let best = null, bestHits = 0;
    for (const [id, e] of Object.entries(edible)) {
        if (e.hits > bestHits && itemDefs[id]) { bestHits = e.hits; best = cap(itemDefs[id].name); }
    }
    return best ? `${best} heals the most - ${bestHits} hits.` : null;
}

// what a monster drops (a few notable items).
function dropsInfo(bot, name, id) {
    const table = npcDrops[id];
    if (!Array.isArray(table) || !table.length) return null;
    const names = [];
    for (const d of table) {
        const it = itemDefs[d.id];
        if (it && it.name && !/nothing/i.test(it.name) && !names.includes(it.name)) names.push(cap(it.name));
        if (names.length >= 6) break;
    }
    if (!names.length) return null;
    return `${cap(name)} can drop ${names.join(', ')}.`;
}

// which monsters drop an item.
function whatDrops(name, id) {
    const set = droppersByItem.get(id);
    if (!set || !set.size) return null;
    const list = [...set].slice(0, 6).map(cap);
    return `${cap(name)} is dropped by ${list.join(', ')}${set.size > 6 ? ', and others' : ''}.`;
}

// a spell's requirement + runes.
function spellInfo(name, def) {
    const runes = (def.runes || []).map((r) => `${r.amount}× ${itemDefs[r.id] ? cap(itemDefs[r.id].name.replace(/-rune/i, '')) : 'rune'}`).join(', ');
    return `${cap(def.name)} needs magic ${def.level}${runes ? ` and ${runes}` : ''}${def.description ? ` - ${def.description.toLowerCase()}` : ''}.`;
}

// a prayer's level + effect.
function prayerInfo(name, def) {
    return `${cap(def.name)} needs prayer ${def.level}${def.description ? ` - ${def.description.toLowerCase()}` : ''}.`;
}

// nearest facility (anvil/furnace/range/altar/spinning wheel/bank) to the bot.
function nearestFacility(bot, type) {
    if (type === 'bank') {
        // the nearest banker NPC spawn anywhere on the map
        const b = mapData.nearestNpc(bot, BANKER_IDS);
        return b ? `the nearest bank is ${placePhrase(bot, b.x, b.y)}.` : null;
    }
    const ids = FAC_IDS[type];
    if (!ids) return null;
    let best = null, bd = Infinity;
    for (const o of objLocs) { if (ids.includes(o.id)) { const d = Math.abs(o.x - bot.x) + Math.abs(o.y - bot.y); if (d < bd) { bd = d; best = o; } } }
    return best ? `the nearest ${type} is ${placePhrase(bot, best.x, best.y)}.` : null;
}

// compare two wieldable items; which is "better"
function compareItems(aId, aName, bId, bName) {
    const wa = wield[aId], wb = wield[bId];
    if (!wa || !wb) return null;
    const score = (w) => (w.weaponPower || 0) + (w.weaponAim || 0) + (w.armour || 0) + (w.magic || 0);
    const sa = score(wa), sb = score(wb);
    if (sa === sb) return `${cap(aName)} and ${cap(bName)} are about the same.`;
    const [win, lose] = sa > sb ? [aName, bName] : [bName, aName];
    return `${cap(win)} is the better of the two, over ${cap(lose)}.`;
}

// ---- curated tips (advice not encoded as data) -----------------------------
const TRAINING = {
    attack: 'train attack on chickens/cows near Lumbridge early, then goblins and giants as you level.',
    strength: 'strength trains the same way as attack - pick the aggressive style on cows, then giants.',
    defense: 'block on the same monsters you fight; low-risk spots are the cows east of Lumbridge.',
    hits: 'hits go up whatever you fight - just keep training combat.',
    mining: 'mining: start on copper and tin in the Dwarven Mine or south-east Varrock, then iron.',
    smithing: 'smelt ore at a furnace, then hammer bars on an anvil - Varrock has both close together.',
    fishing: 'fishing: net shrimp at Lumbridge or Draynor, then fly-fish trout at the river.',
    cooking: 'cook what you catch on a range - Lumbridge castle kitchen is handy.',
    woodcutting: 'woodcutting: normal trees anywhere, then oaks and willows by Draynor.',
    firemaking: 'chop logs and light them with a tinderbox - trains alongside woodcutting.',
    crafting: 'crafting: spin wool into a ball at a spinning wheel, or make leather from cowhide.',
    magic: 'magic: cast strike spells on weak monsters, or superheat/alch for a money loop later.',
    prayer: 'prayer: bury the bones your kills drop - big giants drop big bones.',
    ranged: 'ranged: buy a shortbow and bronze arrows and shoot from a distance.',
    thieving: 'thieving: pickpocket men in the towns, then market stalls.',
    herblaw: 'herblaw needs Druidic Ritual first, then identify herbs and make potions.',
    fletching: 'fletching: cut logs into arrow shafts and bows with a knife.',
    agility: 'agility trains on the rooftop-style courses - Gnome course is the starter.'
};
// the verb people use -> the skill key ("fish" -> fishing). processing verbs first, so
// "how do i cook fish" answers cooking, not fishing.
const SKILL_VERBS = {
    cook: 'cooking', smith: 'smithing', smelt: 'smithing', craft: 'crafting',
    fletch: 'fletching', burn: 'firemaking', pray: 'prayer', cast: 'magic', alch: 'magic',
    fish: 'fishing', mine: 'mining', chop: 'woodcutting', cut: 'woodcutting',
    woodcut: 'woodcutting', steal: 'thieving', thieve: 'thieving',
    pickpocket: 'thieving', herb: 'herblaw', shoot: 'ranged', range: 'ranged'
};
// towns a player might ask directions to, derived from rsc-data regions -> {x, y, label}
const WORLD_REGIONS = require('@2003scape/rsc-data/regions');
const TOWN_DIR = {};
for (const key of Object.keys(WORLD_REGIONS)) {
    const r = WORLD_REGIONS[key];
    if (!r) {
        continue;
    }
    if (/dungeon|sewer|broken|fixed|tutorial|party-hall|lady|wilderness/.test(key)) {
        continue;
    }
    // a spawn point if the region has one, else the centre of its box
    let x = r.spawnX;
    let y = r.spawnY;
    if (typeof x !== 'number' && typeof r.minX === 'number') {
        x = Math.round((r.minX + r.maxX) / 2);
        y = Math.round((r.minY + r.maxY) / 2);
    }
    if (typeof x !== 'number' || typeof y !== 'number') {
        continue;
    }
    const name = key.replace(/-/g, ' ');
    TOWN_DIR[name] = {
        x,
        y,
        label: name.replace(/\b\w/g, (c) => c.toUpperCase())
    };
}
function findTown(m) {
    let best = null;
    for (const name of Object.keys(TOWN_DIR)) {
        const re = new RegExp('\\b' + name.replace(/[\s-]+/g, '[\\s-]') + '\\b');
        if (re.test(m) && (!best || name.length > best.length)) {
            best = name;
        }
    }
    return best ? TOWN_DIR[best] : null;
}

const MONEY = [
    'kill cows east of Lumbridge for hides and sell them to the tanner.',
    'mine iron in the south-east Varrock mine and sell the ore, or smith it into bars.',
    'fish and cook trout/salmon at the river - steady, safe coin.',
    'high-alchemy your loot once your magic is up - turns junk into gold.',
    'pick up everything worthwhile and bank it in a good spot - it adds up fast.',
    'cut and sell willow or oak logs by Draynor.',
    'kill giants for big bones and steel drops, then alch or sell them.'
];
// short hints for how to approach a quest, not a full walkthrough
const QUESTTIPS = {
    cooksAssistant: 'grab an egg, some flour and a bucket of milk, then talk to the Cook in Lumbridge castle.',
    doricsQuest: 'bring Doric 6 clay, 4 copper and 2 iron ore - he\'s north of Falador.',
    sheepShearer: 'shear sheep, spin the wool into balls, and hand 20 to Fred.',
    impCatcher: 'collect the four coloured beads imps drop and give them to Wizard Mizgog.',
    theRestlessGhost: 'get the amulet from Father Urhney in the swamp, then use the ghost\'s skull.',
    vampireSlayer: 'get a stake and hammer from Dr Harlow, then fight Count Draynor in the coffin cellar.',
    demonSlayer: 'gather the Silverlight keys, then use Silverlight and the incantation to kill Delrith.',
    dragonSlayer: 'you need 32 quest points; assemble the map, buy an anti-dragon shield, and sail to Crandor.',
    goblinDiplomacy: 'dye the goblins\' armour orange, then blue, then hand over the blue set.',
    princeAliRescue: 'make a disguise for the prince - wig, dye, skirt - and free him from the cell.'
};
// "what should i do" nudges by rough combat level
function progressTip(bot) {
    const cl = bot && bot.getCombatLevel ? bot.getCombatLevel() : (bot && bot.combatLevel) || 3;
    if (cl < 15) return 'early on: do Cook\'s Assistant and Sheep Shearer for easy quest points, and train on cows.';
    if (cl < 40) return 'around now: try Doric\'s Quest and Vampire Slayer, and fight giants for better drops.';
    if (cl < 70) return 'you\'re getting strong - Dragon Slayer for the rune platebody, then hunt moss and ice giants.';
    return 'at your level, take on demons and dragons, and knock out the members quests for the rewards.';
}
// synonyms/abbreviations normalised before matching, so casual phrasing works.
const SYNONYMS = [
    [/\bwc\b/g, 'woodcutting'], [/\bdef(ence|ense)?\b/g, 'defense'], [/\batt(ack|k)?\b/g, 'attack'],
    [/\bstr\b/g, 'strength'], [/\bmage\b/g, 'magic'], [/\bcb\b|\bcmb\b/g, 'combat'],
    [/\bhp\b/g, 'hits'], [/\brange\b/g, 'ranged'], [/\bgp\b|\bgold\b/g, 'coins'],
    [/\bcraft\b/g, 'crafting'], [/\bfm\b/g, 'firemaking'], [/\bpray\b/g, 'prayer'],
    [/\bthiev(e|ing)?\b/g, 'thieving'], [/\bagi\b/g, 'agility'], [/\bfletch\b/g, 'fletching']
];
function normalize(text) {
    let t = ' ' + text.toLowerCase() + ' ';
    for (const [re, to] of SYNONYMS) t = t.replace(re, to);
    return t.trim();
}

// find the two most-specific item names present (for comparisons).
function findTwoItems(m) {
    const found = [];
    for (const [name, id] of itemByName) if (m.includes(name)) found.push({ name, id });
    found.sort((a, b) => b.name.length - a.name.length);
    // drop shorter names that are substrings of a longer already-picked one
    const out = [];
    for (const f of found) { if (!out.some((o) => o.name.includes(f.name))) out.push(f); if (out.length === 2) break; }
    return out;
}

// ---- top-level router ------------------------------------------------------
// returns { text, topic } or null
function answer(bot, text) {
    const m = normalize(text);
    const asksWhere = /\bwhere\b|how (do i|to) (get|find|reach)|whereabouts|nearest|closest/.test(m);
    const asksHowStart = /how (do i|to) (start|begin|do)|how.*quest/.test(m);
    const asksValue = /worth|how much|price|value|cost/.test(m);
    const asksHeal = /heal|best food|what.*eat/.test(m);
    const asksTrain = /train|level up|how.*(get|raise).*(level|xp)|best (place|way) to/.test(m);
    const asksHow = /how (do|can|would|should) (i|you)|how to\b|how'?d i/.test(m);
    const asksGetTo = /how (do i|to) get to|which way|how far|get to\b/.test(m);
    const asksMoney = /make (money|coins|cash)|get rich|money maker|money making/.test(m);
    const asksDrop = /\bdrops?\b|dropped by|what.*(get|come).*from/.test(m);
    const asksNext = /what should i do|what.*next|what now|what to do|i'?m bored|nothing to do/.test(m);

    // "what should i do next?": a progression nudge using the asker's level
    if (asksNext) return { text: progressTip(bot), topic: 'progress' };

    // best food (no entity)
    if (asksHeal && /best|most|what/.test(m) && !findInText(m, itemByName)) {
        const f = bestFood();
        if (f) return { text: f, topic: 'food' };
    }
    // money-making
    if (asksMoney) return { text: MONEY[Math.floor(Math.random() * MONEY.length)], topic: 'money' };

    // nearest facility (bank / anvil / furnace / range / altar / spinning wheel)
    const facMatch = m.match(/\b(bank|anvil|furnace|range|altar|spinning wheel|spinning)\b/);
    if (asksWhere && facMatch) {
        const type = facMatch[1] === 'spinning' ? 'spinning wheel' : facMatch[1];
        const s = nearestFacility(bot, type);
        if (s) return { text: s, topic: 'facility' };
    }

    // the wilderness: is it safe, and which way
    if (/\bwilder(ness)?\b|\bwildy\b|\bwild\b/.test(m)) {
        if (/safe|danger|die|attack|pk|risk/.test(m)) {
            return { text: "the wilderness isn't safe -- players can attack each other past the ditch, and you keep less on death. go in light.", topic: 'wilderness' };
        }
        if (asksWhere || asksGetTo) {
            return { text: "the wilderness is to the north -- cross the ditch past Edgeville or Varrock. watch your back up there.", topic: 'wilderness' };
        }
    }

    // how to make a clan / party
    if (/how (do i |to |can i )?(make|create|start|found|set up) a clan/.test(m)) {
        return { text: "start a clan with ::clan create <name> <tag>, then bring people in with ::claninvite <name>.", topic: 'clan' };
    }
    if (/how (do i |to |can i )?(make|create|start|set up) a party/.test(m)) {
        return { text: "start a party by inviting someone: ::pinvite <name>. they accept with ::partyaccept.", topic: 'party' };
    }

    // clan standings ("biggest / strongest / top clan")
    if (/\b(biggest|strongest|largest|top|best) clan|which clan.*(big|best|join)|most members/.test(m)) {
        try {
            const clans = (require('../clan').getState(bot.world).clans || [])
                .slice().sort((a, b) => b.players.length - a.players.length);
            if (clans.length) {
                const c = clans[0];
                return { text: c.name + " [" + c.tag + "] is the biggest right now, " + c.players.length + " strong. ::joinclan " + c.name + " if you fancy it.", topic: 'clan' };
            }
            return { text: "no clans of note yet -- start one with ::clan create if you like.", topic: 'clan' };
        } catch (e) {}
    }

    // directions to a named town, before the monster/item blocks so a town name beats a same-named NPC
    if (asksWhere || asksGetTo) {
        const town = findTown(m);
        if (town) {
            const dir = compass(bot.x, bot.y, town.x, town.y);
            return {
                text: dir === 'right here'
                    ? "you're in " + town.label + "."
                    : town.label + " is to the " + dir + " of here.",
                topic: 'place'
            };
        }
    }

    // how quests work in general
    if (/how (do |does )?quests? work|how (does|do) questing|what (are|is|'?s) quest points?|how do i do quests/.test(m)) {
        return { text: "talk to an NPC with a blue quest star, do what they ask, and you earn quest points and rewards. Cook's Assistant is a gentle first one.", topic: 'quest' };
    }

    // starter-quest recommendation ("what quest first", "how do i start a quest")
    if ((/\b(what|which) quest|quest (should|to do|first|start)|first quest|starter quest|easy quest/.test(m) ||
         (asksHow && /quest/.test(m))) && !findQuest(m)) {
        return {
            text: "start with Cook's Assistant and Sheep Shearer -- quick and easy. Look for an NPC with a blue quest star.",
            topic: 'quest'
        };
    }

    // drops: "what does a giant drop" (monster) or "what drops a rune scimitar" (item)
    if (asksDrop) {
        const mon0 = findInText(m, npcByName);
        if (mon0) { const s = dropsInfo(bot, mon0.name, mon0.id); if (s) return { text: s, topic: 'drops' }; }
        const it0 = findInText(m, itemByName);
        if (it0) { const s = whatDrops(it0.name, it0.id); if (s) return { text: s, topic: 'drops' }; }
    }

    // spell requirement (needs a spell/cast/rune/magic cue to avoid false matches)
    if (/spell|cast|rune|magic/.test(m)) {
        const sp = findInText(m, spellByName);
        if (sp) return { text: spellInfo(sp.name, sp.id), topic: 'spell' };
    }
    // prayer effect
    if (/prayer|pray\b/.test(m)) {
        const pr = findInText(m, prayerByName);
        if (pr) return { text: prayerInfo(pr.name, pr.id), topic: 'prayer' };
    }

    // comparison: "is X better than Y"
    if (/better|vs\b|versus|stronger|worse/.test(m)) {
        const two = findTwoItems(m);
        if (two.length === 2) {
            const s = compareItems(two[0].id, two[0].name, two[1].id, two[1].name);
            if (s) return { text: s, topic: 'compare' };
        }
    }

    // training a named skill, or the verb people use ("where can i fish"); fires on a "where" or "how" question
    if (asksTrain || asksWhere || asksHow) {
        for (const skill of Object.keys(TRAINING)) {
            if (m.includes(skill)) return { text: TRAINING[skill], topic: 'training' };
        }
        for (const verb of Object.keys(SKILL_VERBS)) {
            const skill = SKILL_VERBS[verb];
            if (TRAINING[skill] && new RegExp('\\b' + verb + '\\b').test(m)) {
                return { text: TRAINING[skill], topic: 'training' };
            }
        }
    }

    // quest by name: a start hint plus the hard facts (reqs/rewards/where)
    const q = findQuest(m);
    if (q && (asksHowStart || asksWhere || /quest|reward|need|give|do|about|start|require|tell/.test(m))) {
        const hint = QUESTTIPS[q.key];
        return { text: (hint ? hint + ' ' : '') + questInfo(bot, q), topic: 'quest' };
    }

    // item by name
    const item = findInText(m, itemByName);
    if (item) {
        if (asksWhere || /buy|sell|shop|stock/.test(m)) {
            const buying = !/sell/.test(m);
            const s = whereToBuySell(bot, item.name, item.id, buying);
            if (s) return { text: s, topic: 'shop' };
        }
        const info = itemInfo(bot, item.name, item.id);
        if (info && (asksValue || asksHeal || /wield|wear|use|need|what|good|stat|bonus|about|do|tell/.test(m))) {
            return { text: info, topic: 'item' };
        }
    }
    // monster by name / where to find / how strong
    const mon = findInText(m, npcByName);
    if (mon && (asksWhere || /how strong|combat level|fight|kill|find/.test(m))) {
        const info = monsterInfo(bot, mon.name, mon.id);
        if (info) return { text: info, topic: 'monster' };
    }
    return null;
}

// quest matcher: by display name or a loose alias (drop "the", possessives), computed once
let QUEST_CANDIDATES = null;
function questCandidates() {
    if (!QUEST_CANDIDATES || QUEST_CANDIDATES.length !== QUESTS.length) {
        QUEST_CANDIDATES = QUESTS.map((q) => {
            const name = q.name.toLowerCase();
            const alias = name.replace(/^the\s+/, '').replace(/['’]/g, '').replace(/\s+/g, ' ');
            return { q, cands: [name, alias] };
        });
    }
    return QUEST_CANDIDATES;
}
function findQuest(m) {
    let best = null, bestLen = 0;
    const list = questCandidates();
    for (let i = 0; i < list.length; i++) {
        const cands = list[i].cands;
        for (let j = 0; j < cands.length; j++) {
            const cand = cands[j];
            if (cand.length > bestLen && m.includes(cand)) { best = list[i].q; bestLen = cand.length; }
        }
    }
    return best;
}

// does the bot know an answer here? used to decide whether to engage
function canAnswer(bot, text) {
    try { return !!answer(bot, text); } catch (e) { return false; }
}

module.exports = {
    answer, canAnswer, findQuest, bestFood, placePhrase, regionOf, FAC_IDS,
    // shared lookup tables (built once here) for the conversation NLU
    itemByName, npcByName, findInText, normalize, itemDefs, npcDefs
};
