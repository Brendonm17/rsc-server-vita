// bot scavenging: an idle bot picks up worthwhile public ground items nearby.
// value-gated, cooldown-limited, and defers to pacing.isBusy.

const inventoryHandlers = require('../../../packet-handlers/inventory');
const itemDefs = require('@2003scape/rsc-data/config/items');
const itemKnowledge = require('./item-knowledge');
const pacing = require('./pacing');
const goals = require('./goals');
const { findPathAdjacent } = require('./pathfind');

const COINS_ID = 10;
const SCAN = 6;         // how far a bot notices loot (tiles)
const VALUE_FLOOR = 40; // ignore tradeable junk below this shop value

function mod(name) { return require('./poller-registry').get(name); }

// only public items (unowned spawn or lapsed drop) or the bot's own
function grabbable(gi, bot) { return !!gi && (!gi.owner || gi.owner === bot.id); }

function foodCount(bot) {
    let n = 0;
    for (const it of (bot.inventory && bot.inventory.items) || []) {
        try { if (itemKnowledge.isFood(it.id)) { n += it.amount || 1; } } catch (e) {}
    }
    return n;
}

// is this ground item worth a short detour?
function worth(bot, id) {
    if (id === COINS_ID) { return true; }
    try { if (itemKnowledge.isUncutGem(id)) { return true; } } catch (e) {}
    try { if (mod('gear').wantsGearDrop(bot, id)) { return true; } } catch (e) {}
    let g = null; try { g = goals.current(bot); } catch (e) {}
    if (g && g.skill) { try { if (itemKnowledge.isFeedstockFor(id, g.skill)) { return true; } } catch (e) {} }
    const dream = bot.cache && bot.cache.bot && bot.cache.bot.dream;
    if (dream && dream.skill) { try { if (itemKnowledge.isFeedstockFor(id, dream.skill)) { return true; } } catch (e) {} }
    try { if (itemKnowledge.isFood(id) && foodCount(bot) < 3) { return true; } } catch (e) {}
    let r = null; try { r = itemKnowledge.roleOf(id); } catch (e) {}
    return !!(r && r.known && r.tradeable && r.price >= VALUE_FLOOR);
}

// nearest grabbable + worthwhile ground item within notice range, or null.
function nearest(bot) {
    let items;
    try { items = bot.getNearbyEntities('groundItems', SCAN) || []; } catch (e) { return null; }
    let best = null, bd = Infinity;
    for (const gi of items) {
        if (!grabbable(gi, bot) || !worth(bot, gi.id)) { continue; }
        const d = Math.abs(gi.x - bot.x) + Math.abs(gi.y - bot.y);
        if (d < bd) { bd = d; best = gi; }
    }
    return best;
}

function onTick(bot) {
    if (pacing.isBusy(bot)) { return false; } // never interrupt combat, banking, a trip, a party, or a gather
    if (!bot.inventory || (bot.inventory.isFull && bot.inventory.isFull())) { return false; }
    if (bot._scavengeCd && bot._scavengeCd > 0) { bot._scavengeCd -= 1; return false; }

    const gi = nearest(bot);
    if (!gi) { bot._scavengeCd = 8; return false; } // nothing worthwhile near

    // adjacent, take it
    if (Math.abs(gi.x - bot.x) + Math.abs(gi.y - bot.y) <= 1) {
        try {
            inventoryHandlers.groundItemTake({ player: bot }, { x: gi.x, y: gi.y, id: gi.id }).catch(() => {});
        } catch (e) {}
        bot._scavengeCd = 4;
        // remember this ground as loot-rich and tell nearby bots
        try { let r = itemKnowledge.roleOf(gi.id); require('./finds').record(bot, (r && r.price) || 0); } catch (e) {}
        maybeRemark(bot, gi.id);
        return true;
    }

    // not adjacent, walk over to it
    const steps = findPathAdjacent(bot.world, bot.x, bot.y, gi.x, gi.y);
    if (steps && steps.length) { bot.walkQueue = steps; bot._scavengeCd = 2; return true; }
    bot._scavengeCd = 12; // can't route to it
    return false;
}

// a small remark on a nice find, now and then
const FIND_LINES = ['ooh, {i} - lucky me.', 'don\'t mind if i do - {i}.', 'finders keepers! {i}.', 'someone left {i} lying about.', 'a free {i}, cheers.'];
function maybeRemark(bot, id) {
    try {
        const nice = id === COINS_ID || itemKnowledge.isUncutGem(id);
        if (!nice) { return; }
        if (!mod('presence').mayChatter(bot)) { return; }
        if (Math.random() > 0.2) { return; }
        const name = (itemDefs[id] && itemDefs[id].name) ? itemDefs[id].name.toLowerCase() : 'something';
        let line = FIND_LINES[Math.floor(Math.random() * FIND_LINES.length)].replace('{i}', name);
        try { line = mod('voice').apply(bot, line); } catch (e) {}
        if (typeof bot.broadcastChat === 'function') {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
            mod('presence').noteChatter(bot);
        }
    } catch (e) {}
}

module.exports = { onTick, worth, nearest };
