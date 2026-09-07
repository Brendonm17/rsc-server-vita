// each bot works toward a persistent goal, then picks a fresh one when it's done.
// seeded by personality, persisted in cache.bot.goal.

const personality = require('./personality');
const mapData = require('./map-data'); // nearest-spawn boss locator
const gear = require('./gear');
const learning = require('./learning');
const requirements = require('./requirements');
const questsData = require('./quests-data');
let _produceMod = null;
function produceMod() { return _produceMod || (_produceMod = require('./produce')); }
// dreams/memory resolved lazily on first use
let _dreams = null;
function dreamsMod() { return _dreams || (_dreams = require('./dreams')); }
let _memoryMod = null;
function memoryMod() { return _memoryMod || (_memoryMod = require('./memory')); }
// questing resolved lazily, memoised
let _questing;
function questingMod() { return _questing || (_questing = require('./questing')); }

const COINS_ID = 10;

// item name from rsc-data, looked up lazily
let _itemDefs;
function itemName(id) {
    try { _itemDefs = _itemDefs || require('@2003scape/rsc-data/config/items'); const d = _itemDefs[Number(id)]; return d && d.name ? d.name.toLowerCase() : 'something'; } catch (e) { return 'something'; }
}
// say a line in the bot's own voice, best-effort
function saySelf(bot, text) {
    try { let out = text; try { out = require('./voice').apply(bot, text); } catch (e) {} bot.broadcastChat(out); } catch (e) {}
}
const PRODUCE_ADOPT_LINES = ["right, i'm going to make {n}.", "time to craft myself {n}.", "off to make {n} - should be worth it.", "i fancy making {n}."];
const PRODUCE_DONE_LINES = ["there we go - made my own {n}!", "finished it - {n}, crafted by my own hand!", "and that's {n} done. made it myself."];

function coins(bot) {
    let n = 0;
    for (const it of bot.inventory.items) {
        if (it.id === COINS_ID) {
            n += it.amount || 1;
        }
    }
    return n;
}

// loadout score: equipped weapon + body + head
function gearScore(bot) {
    const slots = bot.inventory.equipmentSlots;
    let s = 0;
    const wi = slots['right-hand'];
    if (typeof wi === 'number' && wi >= 0) {
        s += Math.max(0, gear.weaponScoreFor(bot, bot.inventory.items[wi].id));
    }
    for (const slot of ['body', 'head']) {
        const idx = slots[slot];
        if (typeof idx === 'number' && idx >= 0) {
            s += Math.max(0, gear.armorScoreFor(bot, bot.inventory.items[idx].id));
        }
    }
    return s;
}

function combatLevel(bot) {
    return bot.combatLevel || (bot.getCombatLevel ? bot.getCombatLevel() : 3);
}

// bosses a bot can hunt: aggressive, reachable, ordered easy to hard.
// minCombat gates which boss; location is the nearest spawn, derived at goal time.
const BOSSES = [
    { id: 251, name: 'a Thug', minCombat: 15 },
    { id: 41, name: 'a zombie', minCombat: 20 },
    { id: 67, name: 'a Hobgoblin', minCombat: 27 },
    { id: 99, name: 'a Deadly Red spider', minCombat: 30 },
    { id: 555, name: 'a Chaos Druid warrior', minCombat: 37 },
    { id: 521, name: 'a Jungle Spider', minCombat: 38 },
    { id: 195, name: 'a skeleton', minCombat: 44 },
    { id: 312, name: 'an Ogre', minCombat: 48 },
    { id: 542, name: 'an UndeadOne', minCombat: 52 },
    { id: 135, name: 'an Ice Giant', minCombat: 56 },
    { id: 647, name: 'a Holthion', minCombat: 64 },
    { id: 184, name: 'a Greater Demon', minCombat: 71 },
    { id: 646, name: 'a Doomion', minCombat: 81 },
    { id: 202, name: 'a Blue Dragon', minCombat: 86 },
    { id: 290, name: 'a Black Demon', minCombat: 130 },
    { id: 477, name: 'a King Black Dragon', minCombat: 202 }
];
// nearest routable spawn of boss b, or null
function bossLocation(bot, b) { return mapData.nearestNpc(bot, b.id); }

// skills a bot might train. gather skills feed directly; production skills are
// trained by running their chain (mine -> smelt -> forge, fish -> cook, chop -> work logs).
const GATHER_SKILLS = ['woodcutting', 'mining', 'fishing'];
const PRODUCTION_SKILLS = ['smithing', 'cooking', 'fletching', 'firemaking', 'herblaw', 'crafting'];
// a production skill's input gather skill; current() trains the input first when it lags
const PRODUCTION_INPUT = { smithing: 'mining', cooking: 'fishing', fletching: 'woodcutting', firemaking: 'woodcutting' };
const MOVEMENT_SKILLS = ['agility']; // trained by running a course, not a chain
const SKILLS = GATHER_SKILLS.concat(PRODUCTION_SKILLS).concat(MOVEMENT_SKILLS);
// skills leveled by fighting, not gathering. prayer rises by burying bones from
// kills, so a prayer goal steers the bot to combat.
const COMBAT_TRAINED_SKILLS = ['prayer'];
const GOAL_SKILLS = SKILLS.concat(COMBAT_TRAINED_SKILLS); // full pool for a skill goal

// dreams (long-term aspirations) live in dreams.js; goals.js delegates and reads
// the bias so goal selection serves the dream.
function ensureDream(bot) {
    return dreamsMod().ensure(bot);
}

// when a goal type serves the current dream, aim it at the dream's target.
// null if the type doesn't serve the dream.
function dreamAnchoredGoal(bot, type) {
    const d = require('./dreams').ensure(bot);
    if (!d) {
        return null;
    }
    switch (d.kind) {
        case 'wealth':
            if (type === 'getRich') return { type: 'getRich', tier: 'large', target: d.target, dream: true };
            break;
        case 'gear':
            // a makeable dream item -> forge it yourself via a produce goal,
            // only when produce can reach it, else fall through to saving up.
            if (type === 'produce') {
                let ok = false;
                try { ok = require('./produce').canMake(bot, d.itemId); } catch (e) {}
                if (ok) { return makeGoal(bot, 'produce', { targetId: d.itemId }); }
            }
            // else earn enough to afford the dream item
            if (type === 'getRich') return { type: 'getRich', tier: 'large', target: d.price, dream: true };
            break;
        case 'combat':
            if (type === 'levelUp') return { type: 'levelUp', tier: 'large', target: d.target, dream: true };
            break;
        case 'stat':
            if (type === 'levelUp') return { type: 'levelUp', tier: 'large', target: combatLevel(bot) + 3, dream: true };
            break;
        case 'skill':
            if (type === 'skill') return { type: 'skill', tier: 'large', skill: d.skill, target: d.target, dream: true };
            break;
        case 'boss':
            if (type === 'boss') {
                const b = BOSSES.find((x) => x.id === d.bossId);
                if (b) { const loc = bossLocation(bot, b) || { x: bot.x, y: bot.y }; return { type: 'boss', tier: 'large', bossId: b.id, bossName: b.name, x: loc.x, y: loc.y, target: combatLevel(bot) + 1, dream: true }; }
            }
            break;
        default:
            return null;
    }
    return null;
}
function dreamLabel(bot) {
    return dreamsMod().label(bot);
}
function dreamBias(bot) {
    return dreamsMod().bias(bot);
}

function skillLevel(bot, name) {
    return bot.skills && bot.skills[name] ? bot.skills[name].base : 1;
}

// bias toward the skills that lag behind the bot's best, scaled by diligence+patience.
// weighted, not argmax. balance 0.3 (specialist)..1.3 (completionist); a skill N below max weighs 1 + N*balance.
function pickSkillToTrain(bot, pool, r) {
    if (!pool.length) {
        return null;
    }
    if (r == null) {
        r = Math.random(); // standalone callers; makeGoal passes its own r
    }
    const p = personality.of(bot);
    const balance = 0.3 + (p.diligence + p.patience) * 0.5;
    const levels = pool.map((s) => skillLevel(bot, s));
    const maxL = Math.max(1, ...levels);
    const weights = pool.map((_, i) => 1 + (maxL - levels[i]) * balance);
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = r * total;
    for (let i = 0; i < pool.length; i += 1) {
        acc -= weights[i];
        if (acc <= 0) {
            return pool[i];
        }
    }
    return pool[pool.length - 1];
}

// two tiers: 'small' quick wins and 'large' ambitions; targets scale with the tier.
function makeGoal(bot, type, tier) {
    const big = tier === 'large';
    const r = Math.random();
    switch (type) {
        case 'levelUp':
            // a maxed warrior can't level further -> hunt bosses instead
            if (combatLevel(bot) >= 122) { return makeGoal(bot, 'boss', tier); }
            return {
                type, tier,
                target: combatLevel(bot) + (big ? 8 + Math.floor(r * 12) : 2 + Math.floor(r * 3))
            };
        case 'getRich':
            return {
                type, tier,
                target: coins(bot) + (big ? 3000 + Math.floor(r * 7000) : 300 + Math.floor(r * 700))
            };
        case 'gearUp':
            return {
                type, tier,
                target: gearScore(bot) + (big ? 40 + Math.floor(r * 40) : 10 + Math.floor(r * 15))
            };
        case 'boss': {
            // pick a boss the bot's combat level can try (large goals reach higher)
            const cl = combatLevel(bot);
            const reach = cl * (big ? 1.4 : 1.0);
            let options = BOSSES.filter((b) => b.minCombat <= reach + 5);
            // skip a boss whose lair is remembered as too dangerous;
            // fall back to the full list if that leaves nothing.
            try {
                const safe = options.filter((b) => {
                    const l = bossLocation(bot, b);
                    return !l || memoryMod().dangerAreaScore(bot, l.x, l.y) < 20;
                });
                if (safe.length) { options = safe; }
            } catch (e) {}
            const b = options.length ? options[options.length - 1] : BOSSES[0];
            const loc = bossLocation(bot, b) || { x: bot.x, y: bot.y }; // nearest spawn
            return {
                type: 'boss', tier,
                bossId: b.id, bossName: b.name, x: loc.x, y: loc.y,
                target: combatLevel(bot) + 1 // proxy for "did a boss session"
            };
        }
        case 'skill': {
            // never adopt a skill locked behind an unfinished quest (herblaw -> Druidic Ritual); pick an unlocked one
            const open = GOAL_SKILLS.filter((s) => requirements.skillUnlocked(bot, s));
            const pool = open.length ? open : GOAL_SKILLS;
            const s = pickSkillToTrain(bot, pool, r); // bias toward whichever stat lags; reuse r
            // a maxed skill can't level further -> a wealth goal instead
            if (skillLevel(bot, s) >= 99) { return makeGoal(bot, 'getRich', tier); }
            return {
                type: 'skill', tier, skill: s,
                target: skillLevel(bot, s) + (big ? 5 + Math.floor(r * 8) : 2 + Math.floor(r * 3))
            };
        }
        case 'quest': {
            // a deliberate quest: a named one, or any eligible one
            let q = null;
            try {
                if (tier && typeof tier === 'object' && tier.key) { q = questsData.find((x) => x.key === tier.key); }
                if (!q) { q = questingMod().pickQuest(bot); }
            } catch (e) {}
            if (!q) { return makeGoal(bot, 'levelUp', 'small'); } // nothing to quest -> fall back
            return { type: 'quest', tier: 'large', key: q.key, name: q.name };
        }
        case 'produce': {
            // a produce goal is a skill goal carrying a produce tag (target id + chain plan).
            // pickTarget only offers a reachable product, else fall back to a plain skill goal.
            const produce = require('./produce');
            const t = (tier && typeof tier === 'object' && tier.targetId)
                ? produce.candidateFor(tier.targetId, bot)
                : produce.pickTarget(bot);
            if (!t) { return makeGoal(bot, 'skill', typeof tier === 'string' ? tier : 'small'); }
            return {
                type: 'skill', tier: 'large', skill: t.skill,
                target: skillLevel(bot, t.skill) + 4, // soft ceiling; real completion is holding the product
                produce: produce.planTags(t, bot)
            };
        }
        default: // explore
            return {
                type: 'explore', tier,
                target: big ? 6 + Math.floor(r * 8) : 2 + Math.floor(r * 3),
                visited: []
            };
    }
}

// personality-weighted fresh goal.
function pickGoal(bot) {
    const p = personality.of(bot);
    const cl = combatLevel(bot);
    const w = {
        levelUp: 0.15 + p.aggression * 0.5,
        getRich: 0.15 + p.greed * 0.6,
        gearUp: 0.1 + p.aggression * 0.25 + p.greed * 0.25,
        explore: 0.1 + p.curiosity * 0.55,
        // boss hunting: aggressive bots, once they can survive one
        boss: cl >= 30 ? p.aggression * 0.3 + p.risk * 0.2 : 0,
        // skilling is for the diligent
        skill: 0.08 + p.diligence * 0.4,
        // diligent, greedy bots occasionally commit to making a specific item;
        // damped by aggression so a fighter rarely stops to craft.
        produce: (0.05 + p.diligence * 0.22 + p.greed * 0.1) * Math.max(0, 1 - p.aggression * 1.15)
    };
    const types = ['levelUp', 'getRich', 'gearUp', 'explore', 'boss', 'skill', 'produce'];
    // lean toward goal types the bot finishes, away from ones it bails on.
    // also pull toward the goals that serve its dream.
    const db = dreamBias(bot);
    let total = 0;
    for (const t of types) {
        w[t] *= learning.goalWeight(bot, t);
        if (db[t]) {
            w[t] *= db[t];
        }
        total += w[t];
    }
    let r = Math.random() * total;
    // mostly small quick wins, occasionally a large ambition
    const tier =
        Math.random() < 0.2 + (p.diligence + p.patience) * 0.1 ? 'large' : 'small';
    for (const type of types) {
        r -= w[type];
        if (r <= 0) {
            // if this goal serves the dream, aim it at the dream's target
            return dreamAnchoredGoal(bot, type) || makeGoal(bot, type, tier);
        }
    }
    return makeGoal(bot, 'levelUp', tier);
}

function current(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) {
        return null;
    }
    if (!cb.goal || !cb.goal.type) {
        cb.goal = pickGoal(bot);
    }
    // a restored produce goal gets its plan Sets back (JSON dropped them)
    if (cb.goal.produce && !(cb.goal.produce._keep instanceof Set)) {
        try { produceMod().hydrate(cb.goal.produce); } catch (e) {}
    }
    // a bot wanting a quest-gated skill (herblaw behind Druidic Ritual) is re-pointed
    // to do that quest first. produce goals are exempt from both re-points below.
    if (cb.goal.type === 'skill' && !cb.goal.produce) {
        const gate = requirements.questGateFor(cb.goal.skill);
        if (gate) {
            let done = false;
            try { done = questingMod().isComplete(bot, gate); } catch (e) { done = false; }
            if (!done) {
                let name = gate;
                try { const q = questsData.find((x) => x.key === gate); if (q) name = q.name; } catch (e) {}
                cb.goal = { type: 'quest', tier: 'large', key: gate, name, forSkill: cb.goal.skill };
            }
        }
    }
    // a production skill needs its input skill trained too; if the input lags what the
    // goal needs, train the input first, up to a cap. only re-points when it clearly lags.
    if (cb.goal.type === 'skill' && !cb.goal.produce) {
        const input = PRODUCTION_INPUT[cb.goal.skill];
        if (input) {
            const target = cb.goal.target || 30;
            const inLvl = skillLevel(bot, input);
            if (inLvl + 5 < target && inLvl < 45) {
                cb.goal = {
                    type: 'skill', tier: cb.goal.tier || 'small',
                    skill: input, target: Math.min(target, 45), forSkill: cb.goal.skill
                };
            }
        }
    }
    return cb.goal;
}

// force a specific goal, e.g. a mission proposed in chat.
// reuses makeGoal, or builds a boss/skill goal for a named target.
function adopt(bot, type, opts = {}) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) {
        return null;
    }
    if (type === 'boss' && opts.boss) {
        const b = opts.boss;
        cb.goal = {
            type: 'boss', tier: 'large',
            bossId: b.id, bossName: b.name, x: b.x, y: b.y,
            target: combatLevel(bot) + 1
        };
    } else if (type === 'skill' && opts.skill) {
        cb.goal = {
            type: 'skill', tier: 'small', skill: opts.skill,
            target: skillLevel(bot, opts.skill) + 3
        };
    } else {
        cb.goal = makeGoal(bot, type, opts.tier || 'small');
    }
    return cb.goal;
}

function isDone(bot, g) {
    switch (g.type) {
        case 'levelUp':
            return combatLevel(bot) >= g.target;
        case 'getRich':
            return coins(bot) >= g.target;
        case 'gearUp':
            return gearScore(bot) >= g.target;
        case 'explore':
            return (g.visited ? g.visited.length : 0) >= g.target;
        case 'boss':
            // proxy: a boss session yields a combat level, or times out
            return combatLevel(bot) >= g.target || (g._ticks || 0) > 6000;
        case 'skill':
            // a produce goal is done when the bot has made its target (made-latch), not at an xp threshold
            if (g.produce) { return !!g.produce._made; }
            return skillLevel(bot, g.skill) >= g.target;
        case 'quest':
            try { return questingMod().isComplete(bot, g.key); } catch (e) { return true; }
        default:
            return true;
    }
}

// mark a facility as visited when the bot is near it. the table is flattened once,
// and a bot that hasn't moved since its last scan is not rescanned.
let _travel = null;
let _facilitySrc = null;
let _facilityTargets = null;
function facilityTargets() {
    if (!_travel) {
        _travel = require('./travel');
    }
    const F = _travel.FACILITIES || {};
    if (F !== _facilitySrc) {
        _facilitySrc = F;
        _facilityTargets = [];
        for (const name of Object.keys(F)) {
            const f = F[name];
            if (f && f.target) {
                _facilityTargets.push({ name, x: f.target.x, y: f.target.y });
            }
        }
    }
    return _facilityTargets;
}
function trackVisit(bot, g) {
    if (!g.visited) {
        g.visited = [];
    }
    if (bot._visitScanX === bot.x && bot._visitScanY === bot.y && bot._visitScanGoal === g) {
        return; // same tile as last scan, nothing new in reach
    }
    bot._visitScanX = bot.x;
    bot._visitScanY = bot.y;
    bot._visitScanGoal = g;
    const list = facilityTargets();
    for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const d = Math.abs(bot.x - f.x) + Math.abs(bot.y - f.y);
        if (d <= 6 && !g.visited.includes(f.name)) {
            g.visited.push(f.name);
        }
    }
}

// per-tick: advance/refresh the goal
function onTick(bot) {
    const g = current(bot);
    if (!g) {
        return;
    }
    // age every goal; after a long spell with no completion (~53 min), re-roll regardless.
    // rescues maxed bots whose capped target can never complete.
    g._age = (g._age || 0) + 1;
    if (g._age > 5000 && !isDone(bot, g)) {
        bot.cache.bot.goal = pickGoal(bot);
        return;
    }
    if (g.type === 'explore') {
        trackVisit(bot, g);
    }
    if (g.type === 'boss') {
        g._ticks = (g._ticks || 0) + 1; // age the boss goal toward a timeout
        // if the bot reached the lair area but still can't engage after a while,
        // abandon the goal and pick a new one.
        const opp = bot.opponent;
        const fightingBoss = opp && opp.id === g.bossId;
        if (fightingBoss) {
            g._engaged = true;
            g._noEngage = 0;
        } else {
            const nearLair =
                Math.floor(bot.y / 944) === Math.floor(g.y / 944) &&
                Math.abs(bot.x - g.x) + Math.abs(bot.y - g.y) <= 40;
            if (nearLair) {
                g._noEngage = (g._noEngage || 0) + 1;
            }
        }
        if (!g._engaged && (g._noEngage || 0) > 500) {
            learning.noteGoal(bot, 'boss', false); // couldn't do it -> learn from it
            bot.cache.bot.goal = pickGoal(bot);
            return;
        }
    }
    // latch completion when the bot holds more of the target than it started with.
    // progress = held count weighted by chain depth; abandon a target it's stuck on.
    if (g.type === 'skill' && g.produce) {
        const pr = g.produce;
        const produce = require('./produce');
        const ik = require('./item-knowledge');
        pr._ticks = (pr._ticks || 0) + 1;
        const wasMade = pr._made;
        if (!pr._made && produce.heldCount(bot, pr.id) > pr._start) { pr._made = true; }
        // announce the plan when the bot takes the goal on, and its satisfaction when it finishes
        if (pr._made && !wasMade) {
            // if the bot forged gear it can wield and would upgrade into, wear it now;
            // otherwise the ordinary satisfaction line.
            let wear = false;
            try { wear = require('./gear').wantsGearDrop(bot, pr.id); } catch (e) {}
            if (wear) {
                try { require('./gear').equipBestOwned(bot); } catch (e) {}
                saySelf(bot, 'forged my own ' + itemName(pr.id) + ' - and it fits perfectly!');
            } else {
                saySelf(bot, PRODUCE_DONE_LINES[Math.floor(Math.random() * PRODUCE_DONE_LINES.length)].replace('{n}', itemName(pr.id)));
            }
            // a notable make (valuable or higher-tier) builds a crafter reputation and a retold tale
            if ((pr.price || 0) >= 200 || (pr.terminalLevel || 0) >= 30) {
                try { require('./reputation').note(bot, 'craft', 1); } catch (e) {}
                try { require('./lore').record(bot, 'craft', { subj: itemName(pr.id), num: pr.price || 0 }); } catch (e) {}
            }
        } else if (!pr._announced) {
            pr._announced = 1;
            if (!pr._made) { saySelf(bot, PRODUCE_ADOPT_LINES[Math.floor(Math.random() * PRODUCE_ADOPT_LINES.length)].replace('{n}', itemName(pr.id))); }
        }
        if (!pr._made) {
            let prog = 0;
            for (const id of pr._keep) { const n = produce.heldCount(bot, id); if (n > 0) { prog += n * (1 + ik.chainDepth(id)); } }
            if (prog > (pr._prog || 0)) { pr._prog = prog; pr._stall = 0; } else { pr._stall = (pr._stall || 0) + 1; }
            if (pr._ticks > 8000 || pr._stall > 1500) {
                learning.noteGoal(bot, 'produce', false); // gave up -> lean away from produce for a while
                bot.cache.bot.goal = pickGoal(bot);
                return;
            }
        }
    }
    if (isDone(bot, g)) {
        const cb = bot.cache.bot;
        // a boss goal that only timed out (never engaged) is a failure, not a win
        const timedOutBoss =
            g.type === 'boss' && !g._engaged && (g._ticks || 0) > 6000;
        // attribute a completed produce goal to 'produce' so learning credits it, not generic skilling
        learning.noteGoal(bot, g.produce ? 'produce' : g.type, !timedOutBoss);
        // a boss goal fought through -> credit the boss dream and a slayer reputation
        if (g.type === 'boss' && g._engaged) {
            try { require('./dreams').noteBossKill(bot, g.bossId); } catch (e) {}
            try { require('./reputation').note(bot, 'boss'); } catch (e) {}
            // everyone who fought alongside remembers this as one shared tale
            try {
                const bossName = (g.name) || (BOSSES.find && (BOSSES.find((x) => x.id === g.bossId) || {}).name) || 'a mighty beast';
                const witnesses = [bot];
                for (const o of bot.getNearbyEntities('players', 6)) {
                    if (o && o !== bot && o.isBot && o.id !== bot.id) witnesses.push(o);
                }
                if (witnesses.length > 1) require('./lore').recordShared(witnesses, bossName, 0);
            } catch (e) {}
        }
        cb.goal = pickGoal(bot); // achieved -> a fresh goal
    }
}

// activity-weight nudges for the career scheduler
function activityBias(bot) {
    const g = current(bot);
    const none = { combat: 0, gather: 0, wander: 0 };
    if (!g) {
        return none;
    }
    switch (g.type) {
        case 'levelUp':
            return { combat: 0.6, gather: 0, wander: -0.05 };
        case 'getRich':
            return { combat: 0.1, gather: 0.5, wander: 0 };
        case 'gearUp':
            return { combat: 0.45, gather: 0.1, wander: 0 };
        case 'explore':
            return { combat: 0, gather: 0, wander: 0.6 };
        case 'boss':
            return { combat: 0.7, gather: 0, wander: -0.1 };
        case 'skill':
            // prayer: fight for bones then bury them; drive is combat, a little gather for loot
            if (COMBAT_TRAINED_SKILLS.includes(g.skill)) {
                return { combat: 0.55, gather: 0, wander: -0.05 };
            }
            return { combat: -0.1, gather: 0.7, wander: 0 };
        case 'quest':
            return { combat: 0, gather: 0, wander: 0.1 }; // questTick owns the bot; keep rotation quiet
        default:
            return none;
    }
}

// if the current goal is a boss hunt, where/what it is, else null
function bossTarget(bot) {
    const g = current(bot);
    if (!g || g.type !== 'boss') {
        return null;
    }
    return { x: g.x, y: g.y, id: g.bossId, name: g.bossName };
}

module.exports = {
    current,
    pickGoal,
    pickSkillToTrain,
    adopt,
    activityBias,
    onTick,
    bossTarget,
    ensureDream,
    dreamLabel,
    dreamBias,
    gearScore,
    coins,
    BOSSES
};
