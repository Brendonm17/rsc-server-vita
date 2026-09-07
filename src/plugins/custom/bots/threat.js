// threat-aware routing: fires before a bot walks into danger (panic.js handles
// it after engaging). a bot that isn't fighting keeps clear of a dangerous
// aggressive monster it can't handle, stepping away if one gets within range.
//
// defers to intent: never flinches from a monster the bot means to fight (combat
// target or boss goal), and gives up avoiding after a few flinches so it never
// oscillates forever.

const personality = require('./personality');
const memory = require('./memory');

const SCAN = 5;            // how far ahead a bot watches for danger (tiles)
const DANGER_FACTOR = 1.3; // a monster is "dangerous" if its combat level exceeds the bot's by this factor
const MAX_FLINCHES = 3;    // give up avoiding after this many (bounds oscillation on a must-pass monster)

function mod(name) { return require('./poller-registry').get(name); }
function cl(e, f) { return e && e.getCombatLevel ? e.getCombatLevel() : (e && e.combatLevel) || f; }

// ids the bot intends to fight (combat task targets + boss goal); never flee from these
function intendedTargets(bot) {
    const set = new Set();
    try { const t = bot.brain && bot.brain.tasks && bot.brain.tasks.combat && bot.brain.tasks.combat.targetIds; if (t) { for (const id of t) { set.add(id); } } } catch (e) {}
    try { const b = mod('goals').bossTarget(bot); if (b && b.id != null) { set.add(b.id); } } catch (e) {}
    return set;
}

// would this aggressive npc actually aggro the bot, and is it a genuine threat (would likely win)?
function threatens(bot, npc, intended) {
    if (!npc || !npc.aggressive) { return false; }
    if (npc.skills && npc.skills.hits && npc.skills.hits.current <= 0) { return false; } // dying/dead
    if (intended.has(npc.id)) { return false; } // a monster the bot means to fight, stand your ground
    const myCl = cl(bot, 3), npcCl = cl(npc, myCl);
    const wouldAggro = myCl < npcCl * 2 + 1;       // the engine's aggro gate (npc.isAggressive)
    const dangerous = npcCl > myCl * DANGER_FACTOR; // strong enough to actually hurt the bot
    return wouldAggro && dangerous;
}

function nearestThreat(bot) {
    let npcs;
    try { npcs = bot.getNearbyEntities('npcs', SCAN) || []; } catch (e) { return null; }
    if (!npcs.length) { return null; }
    // inline the threatens() checks: combat level computed once, the cheap
    // aggressive gate rejects passive npcs first, intendedTargets computed lazily
    const myCl = cl(bot, 3);
    let intended = null;
    let best = null, bd = Infinity;
    for (const n of npcs) {
        if (!n || !n.aggressive) { continue; } // cheap reject for the common passive npc
        if (n.skills && n.skills.hits && n.skills.hits.current <= 0) { continue; }
        const npcCl = cl(n, myCl);
        if (!(myCl < npcCl * 2 + 1 && npcCl > myCl * DANGER_FACTOR)) { continue; } // wouldn't aggro, or not dangerous
        if (!intended) { intended = intendedTargets(bot); }
        if (intended.has(n.id)) { continue; } // a monster the bot means to fight
        const d = Math.abs(n.x - bot.x) + Math.abs(n.y - bot.y);
        if (d < bd) { bd = d; best = n; }
    }
    return best ? { npc: best, dist: bd } : null;
}

// a single walkable step that increases distance from the threat (the flinch)
function flinchStep(bot, npc) {
    const pf = bot.world && bot.world.pathFinder;
    if (!pf) { return null; }
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let best = null, bestGain = 0;
    const curD = Math.abs(bot.x - npc.x) + Math.abs(bot.y - npc.y);
    for (const [dx, dy] of dirs) {
        try { if (!pf.isValidGameStep({ x: bot.x, y: bot.y }, { deltaX: dx, deltaY: dy })) { continue; } } catch (e) { continue; }
        const nd = Math.abs(bot.x + dx - npc.x) + Math.abs(bot.y + dy - npc.y);
        const gain = nd - curD;
        if (gain > bestGain) { bestGain = gain; best = { deltaX: dx, deltaY: dy }; }
    }
    return best;
}

// nerve: a bold bot lets a threat get closer before flinching, a cautious one keeps back
function buffer(bot, npc) {
    let extra = 2;
    try { const p = personality.of(bot); extra = 1 + Math.round((1 - (p.aggression * 0.5 + (1 - p.risk) * 0.5)) * 2); } catch (e) {}
    return (npc.aggroRadius || 1) + Math.max(1, extra);
}

function onTick(bot) {
    if (bot.opponent) { bot._threatFlinches = 0; return false; } // fighting -> panic/combat handle it
    // the npc proximity scan is the costliest thing this poller does; rest it a
    // few ticks after finding nothing, a threat is still caught within ~4 ticks
    if (bot._threatScanCd && bot._threatScanCd > 0) { bot._threatScanCd -= 1; return false; }
    const t = nearestThreat(bot);
    if (!t) { bot._threatFlinches = 0; bot._threatScanCd = 6; return false; } // nothing near -> rest longer
    if (t.dist > buffer(bot, t.npc)) { bot._threatScanCd = 2; return false; } // a threat is near but not close, check again soon

    // flinch budget over a short window, not keyed on a single npc id: two
    // flanking monsters would otherwise reset a per-npc counter forever
    if (bot._threatCd && bot._threatCd > 0) { bot._threatCd -= 1; return false; }
    if ((bot._threatFlinches || 0) >= MAX_FLINCHES) { bot._threatFlinches = 0; bot._threatCd = 15; return false; }

    const step = flinchStep(bot, t.npc);
    if (!step) { return false; } // cornered, nothing better than to stand
    if (bot.walkQueue) { bot.walkQueue.length = 0; }
    bot.walkQueue = [step];
    bot._threatFlinches = (bot._threatFlinches || 0) + 1;
    bot._fleeing = 3; // brief flag panic/threat's flee-step consumes
    if (bot._threatFlinches === 1) { warnNearby(bot, t.npc); } // remember and spread the danger once per window
    maybeSay(bot, t.npc);
    return true;
}

// social danger: remember this ground as risky and warn nearby bots, who mark
// it too. career relocation reads memory.dangerAreaScore to steer away
function warnNearby(bot, npc) {
    try { memory.noteDanger(bot, bot.x, bot.y, 6); } catch (e) {}
    let nearby = [];
    try { nearby = bot.getNearbyEntities('players', 6) || []; } catch (e) {}
    let told = 0;
    for (const pl of nearby) {
        if (!pl || pl === bot || !pl.isBot || pl.username === bot.username || !pl.cache || !pl.cache.bot) { continue; }
        try { memory.noteDanger(pl, bot.x, bot.y, 3); } catch (e) {} // second-hand, weaker
        told += 1;
    }
    if (told > 0) { maybeWarn(bot, npc); }
}

const WARN_LINES = ['{m} about - steer clear!', "watch out, there's a {m} here!", 'careful, {m} nearby.', 'give this spot a miss - {m}.'];
function maybeWarn(bot, npc) {
    try {
        if (!mod('presence').mayChatter(bot)) { return; }
        if (Math.random() > 0.4) { return; }
        const name = (npc && npc.definition && npc.definition.name) ? npc.definition.name.toLowerCase() : 'something nasty';
        let line = WARN_LINES[Math.floor(Math.random() * WARN_LINES.length)].replace('{m}', name);
        try { line = mod('voice').apply(bot, line); } catch (e) {}
        if (typeof bot.broadcastChat === 'function') {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
            mod('presence').noteChatter(bot);
        }
    } catch (e) {}
}

const LINES = ['not tangling with that {m}.', 'giving that {m} a wide berth.', 'best steer clear of the {m}.', 'that {m} can have its patch.'];
function maybeSay(bot, npc) {
    try {
        if (bot._threatFlinches > 1) { return; } // only remark on the first flinch of an encounter
        if (!mod('presence').mayChatter(bot)) { return; }
        if (Math.random() > 0.25) { return; }
        const name = (npc.definition && npc.definition.name) ? npc.definition.name.toLowerCase() : 'thing';
        let line = LINES[Math.floor(Math.random() * LINES.length)].replace('{m}', name);
        try { line = mod('voice').apply(bot, line); } catch (e) {}
        if (typeof bot.broadcastChat === 'function') {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
            mod('presence').noteChatter(bot);
        }
    } catch (e) {}
}

module.exports = { onTick, threatens, nearestThreat, flinchStep, warnNearby };
