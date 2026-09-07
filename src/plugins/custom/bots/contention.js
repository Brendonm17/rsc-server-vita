// gather-spot competition: a possessive bot (greedy, aggressive, impatient) working a
// limited resource sours on nearby gatherers and now and then snaps at them.

const personality = require('./personality');
const social = require('./social-emergent');

function mod(name) { return require('./poller-registry').get(name); }

const RANGE = 5; // bots this close share a patch
const RECENT = 16; // ticks after a gather swing that a bot still counts as at the spot

// gatheringSkill is a transient per-swing flag; stamp the last-gather tick and treat a
// bot as at the spot for a short window after so staggered co-location still counts
function atSpot(c) {
    if (!c) { return false; }
    if (c.gatheringSkill) {
        try { c._gatherStamp = (c.world && c.world.ticks) || 0; } catch (e) {  }
        return true;
    }
    const now = (c.world && c.world.ticks) || 0;
    return !!(c._gatherStamp && now - c._gatherStamp <= RECENT);
}

// possessiveness 0..1: how much a bot minds sharing its spot; patience defaults to 0.5
function possessiveness(bot) {
    try {
        const p = personality.of(bot);
        const pat = (p.patience != null ? p.patience : 0.5);
        return Math.max(0, Math.min(1, 0.4 * p.greed + 0.4 * p.aggression + 0.3 * (1 - pat) - 0.3 * p.sociability));
    } catch (e) { return 0.2; }
}

const LINES = ['find your own spot, {n}.', 'oi {n}, i was here first.', 'plenty of other spots, {n}.', 'you\'re crowding my patch, {n}.', 'clear off, {n}, this one\'s mine.'];

function onTick(bot) {
    if (bot.opponent || bot.locked) { return false; }
    if (bot._contendCd && bot._contendCd > 0) { bot._contendCd -= 1; return false; }
    bot._contendCd = 30; // rate-limit the scan
    if (!atSpot(bot)) { return false; }
    const poss = possessiveness(bot);
    if (poss < 0.4) { bot._contendCd = 150; return false; } // easy-going, shares happily

    // is another BOT working the same patch?
    let others;
    try { others = bot.getNearbyEntities('players', RANGE) || []; } catch (e) { return false; }
    let rival = null;
    for (const o of others) {
        if (!o || o === bot || !o.isBot || o.username === bot.username) { continue; }
        if (!atSpot(o)) { continue; } // only a fellow gatherer counts, not a passer-by
        rival = o; break;
    }
    if (!rival) { return false; }
    // only sometimes snap, scaled by possessiveness
    if (Math.random() > 0.15 * poss) { bot._contendCd = 60; return false; }

    // sour the tie a touch and say a barbed word
    try { social.noteInteraction(bot, rival.username, -1); } catch (e) {  }
    try {
        if (mod('presence').mayChatter(bot)) {
            let line = LINES[Math.floor(Math.random() * LINES.length)].replace('{n}', rival.username);
            try { line = mod('voice').apply(bot, line); } catch (e) {  }
            if (typeof bot.broadcastChat === 'function') {
                bot._reactionSpeak = true;
                try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
                mod('presence').noteChatter(bot);
            }
        }
    } catch (e) {  }
    bot._contendCd = 120 + Math.floor(Math.random() * 240); // don't snap again for a while
    return true;
}

module.exports = { onTick, possessiveness };
