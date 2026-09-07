// bot thieving: pickpocket townsfolk and steal from market stalls for coin and loot.
// a failed pickpocket makes the mark turn and attack. personality-gated.

const personality = require('./personality');
const pacing = require('./pacing');
const { findPathAdjacent } = require('./pathfind');

// pickpocketable npc id -> thieving level required
const PICKPOCKET = (() => {
    const map = new Map();
    try {
        const { pickpocket } = require('@2003scape/rsc-data/skills/thieving');
        for (const id of Object.keys(pickpocket)) {
            let d = pickpocket[id];
            if (d && d.reference != null) d = pickpocket[d.reference];
            if (d && d.level) map.set(Number(id), d.level);
        }
    } catch (e) {}
    return map;
})();

// stall object id -> { level, cmd }: stolen from via a game-object command,
// a tier above pickpocketing
const STALLS = (() => {
    const map = new Map();
    try {
        const { stalls } = require('@2003scape/rsc-data/skills/thieving');
        const objs = require('@2003scape/rsc-data/config/objects');
        for (const id of Object.keys(stalls)) {
            let d = stalls[id];
            if (d && d.reference != null) d = stalls[d.reference];
            const o = objs[id];
            if (!d || !d.level || !o || !o.commands) continue;
            const idx = o.commands.findIndex((c) => /steal\s*from/i.test(c));
            if (idx < 0) continue;
            map.set(Number(id), { level: d.level, cmd: idx === 0 ? 'one' : 'two' });
        }
    } catch (e) {}
    return map;
})();

// memoised cross-module lookups
const _m = {};
function mod(name) { return _m[name] || (_m[name] = require('./poller-registry').get(name)); }

// highest-tier stall the bot can steal from nearby, or null
function bestStall(bot) {
    if (!STALLS.size) return null;
    if (bot.inventory && bot.inventory.isFull && bot.inventory.isFull()) return null;
    const lvl = thievingLevel(bot);
    let best = null;
    let bestReq = -1;
    let list = [];
    try { list = bot.getNearbyEntities('gameObjects', 16) || []; } catch (e) { return null; }
    for (const obj of list) {
        const s = STALLS.get(obj.id);
        if (!s || s.level > lvl) continue;
        if (s.level > bestReq) { bestReq = s.level; best = obj; best._stallCmd = s.cmd; }
    }
    return best;
}

// how thief-y a bot is (0..1)
function inclination(bot) {
    const p = personality.of(bot);
    return Math.max(0, Math.min(1, p.greed * 0.5 + p.risk * 0.45 - p.diligence * 0.2));
}

function thievingLevel(bot) {
    return bot.skills && bot.skills.thieving ? bot.skills.thieving.current : 1;
}

// best mark the bot can pickpocket nearby, or null
function bestMark(bot) {
    const lvl = thievingLevel(bot);
    let best = null;
    let bestReq = -1;
    let list = [];
    try { list = bot.getNearbyEntities('npcs', 10) || []; } catch (e) { return null; }
    for (const npc of list) {
        if (!npc || npc === bot.opponent) continue;
        const req = PICKPOCKET.get(npc.id);
        if (req == null || req > lvl) continue;
        if (npc.opponent) continue; // already fighting
        if (req > bestReq) { bestReq = req; best = npc; }
    }
    return best;
}

// in-flight-task check; thieving adds its own extras on top of pacing.isBusy
function busy(bot) {
    return pacing.isBusy(bot) || !!(
        bot.gatheringSkill || bot._travel || bot.pendingPartyInvite ||
        (bot.moveTick != null && bot.world && bot.moveTick === bot.world.ticks)
    );
}

function onTick(bot) {
    if (busy(bot) || !PICKPOCKET.size) {
        return false;
    }
    if (bot._thieveCd && bot._thieveCd > 0) { bot._thieveCd -= 1; return false; }
    const want = inclination(bot);
    if (want < 0.25) { bot._thieveCd = 300; return false; } // honest folk don't pickpocket
    // occasional, a rogue lifts a purse now and then
    if (Math.random() > 0.05 + want * 0.15) { bot._thieveCd = 30; return false; }

    // stalls first: a market lift is richer than a pocket, else fall through to a mark
    const stall = bestStall(bot);
    if (stall) {
        if (Math.abs(stall.x - bot.x) + Math.abs(stall.y - bot.y) <= 1) {
            try { bot.faceEntity(stall); } catch (e) {}
            try {
                const world = bot.world;
                const fn = stall._stallCmd === 'one' ? 'onGameObjectCommandOne' : 'onGameObjectCommandTwo';
                if (world && typeof world.callPlugin === 'function') {
                    Promise.resolve(world.callPlugin(fn, bot, stall)).catch(() => {});
                }
            } catch (e) {}
            if (Math.random() < 0.25 && mod('presence').mayChatter(bot)) {
                try {
                    const line = mod('chatgen').generate('thieve', { name: (stall.definition && stall.definition.name) || 'a stall' }, bot);
                    if (line) { bot._reactionSpeak = true; try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; } mod('presence').noteChatter(bot); }
                } catch (e) {}
            }
            bot._thieveCd = 25 + Math.floor(Math.random() * 35);
            return true;
        }
        const sSteps = findPathAdjacent(bot.world, bot.x, bot.y, stall.x, stall.y);
        if (sSteps && sSteps.length) { bot.walkQueue = sSteps; return true; }
        // couldn't reach the stall, fall through to a pickpocket mark
    }

    const mark = bestMark(bot);
    if (!mark) { bot._thieveCd = 40; return false; }

    if (Math.abs(mark.x - bot.x) + Math.abs(mark.y - bot.y) <= 1) {
        try { bot.faceEntity(mark); } catch (e) {}
        try {
            const world = bot.world;
            if (world && typeof world.callPlugin === 'function') {
                Promise.resolve(world.callPlugin('onNPCCommand', bot, mark, 'pickpocket')).catch(() => {});
            }
        } catch (e) {}
        // a rogue's quiet aside, hushed if there's already chatter nearby
        if (Math.random() < 0.25 && mod('presence').mayChatter(bot)) {
            try {
                const line = mod('chatgen').generate('thieve', { name: (mark.definition && mark.definition.name) || 'a mark' }, bot);
                if (line) {
                    bot._reactionSpeak = true;
                    try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
                    mod('presence').noteChatter(bot);
                }
            } catch (e) {}
        }
        bot._thieveCd = 40 + Math.floor(Math.random() * 60);
        return true;
    }

    // not adjacent, walk up to the mark
    const steps = findPathAdjacent(bot.world, bot.x, bot.y, mark.x, mark.y);
    if (steps && steps.length) {
        bot.walkQueue = steps;
        return true;
    }
    bot._thieveCd = 40;
    return false;
}

module.exports = { onTick, inclination, bestMark, bestStall, PICKPOCKET, STALLS };
