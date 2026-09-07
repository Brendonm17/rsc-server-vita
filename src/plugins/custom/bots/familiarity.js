// bot familiarity: sustained co-presence with the same player slowly warms (or, for
// two aggressive bots, sours) the relationship. feeds the social-emergent system.

const social = require('./social-emergent');
const personality = require('./personality');

const THRESHOLD = 40;   // ticks of nearness before a familiarity nudge
const NUDGE = 0.5;      // relationship warmth per threshold crossing (friend = 5)
// samples every STRIDE ticks and counts in stride steps, keeping ~40-tick timing
const STRIDE = 5;

function onTick(bot) {
    if (bot.locked) return false;
    if (bot._famCd == null) bot._famCd = 0;
    if (bot._famCd-- > 0) return false;
    bot._famCd = STRIDE - 1;
    const store = bot.cache && bot.cache.bot;
    if (!store) return false;
    if (!store.nearCount) store.nearCount = {};
    let nearby;
    try { nearby = bot.getNearbyEntities('players', 5); } catch (e) { return false; }

    const seen = new Set();
    let warmed = false;
    for (const pl of nearby) {
        if (!pl || pl === bot || !pl.username || pl.username === bot.username) continue;
        seen.add(pl.username);
        const c = (store.nearCount[pl.username] || 0) + STRIDE; // count in stride steps
        if (c >= THRESHOLD) {
            store.nearCount[pl.username] = 0;
            // two aggressive bots always near each other drift toward rivalry; everyone else warms,
            // but never enough to thaw an existing grudge
            let clashPair = false;
            try { clashPair = personality.of(bot).aggression > 0.55 && pl.isBot && personality.of(pl).aggression > 0.55; } catch (e) {}
            let feel = 0;
            try { feel = social.sentiment(bot, pl.username); } catch (e) {}
            let tag = null;
            try { tag = social.tagOf(bot, pl.username); } catch (e) {}
            if (clashPair) {
                try { social.noteInteraction(bot, pl.username, -NUDGE); warmed = true; } catch (e) {} // contempt -> rivalry
            } else if (feel > -3 && tag !== 'rival') {
                try { social.noteInteraction(bot, pl.username, NUDGE); warmed = true; } catch (e) {}
            }
        } else {
            store.nearCount[pl.username] = c;
        }
    }
    // decay the counter for anyone who wandered off, so brief encounters fade
    for (const u of Object.keys(store.nearCount)) {
        if (!seen.has(u)) {
            store.nearCount[u] -= 0.5 * STRIDE;
            if (store.nearCount[u] <= 0) delete store.nearCount[u];
        }
    }
    return warmed;
}

module.exports = { onTick, THRESHOLD };
