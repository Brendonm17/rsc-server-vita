// a bot remarks the first time it reaches a major region it's never seen;
// seen regions persist in its cache, so each fires at most once

const knowledge = require('./knowledge');
const personality = require('./personality');

const LINES = [
    'So this is {p}!',
    'First time i\'ve been to {p}.',
    'Made it to {p} at last.',
    '{p} - bigger than i thought.',
    'Never seen {p} before today.',
    'Here i am in {p} then.'
];

function onTick(bot) {
    if (bot.opponent || bot.locked || bot.walkQueue && bot.walkQueue.length) {
        return false;
    }
    const store = bot.cache && bot.cache.bot;
    if (!store) return false;

    // gawp at a monster far above its level, the first time it sees that kind
    if (sighting(bot, store)) return true;

    let region = null;
    try { region = knowledge.regionOf(bot.x, bot.y); } catch (e) { return false; }
    if (!region) return false;
    if (!store.seenRegions) store.seenRegions = {};
    if (store.seenRegions[region]) return false; // already discovered
    store.seenRegions[region] = 1; // persisted in cache

    // a curious or sociable bot voices it; a quiet one just banks it
    const p = personality.of(bot);
    if (p.curiosity < 0.4 && p.sociability < 0.4) return false;
    if (Math.random() > 0.55) return false;
    const line = LINES[Math.floor(Math.random() * LINES.length)].replace('{p}', region);
    try {
        let out = line;
        try { out = require('./voice').apply(bot, line); } catch (e) {}
        if (typeof bot.broadcastChat === 'function') {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
        }
    } catch (e) {}
    return true;
}

const SIGHT_LINES = ['blimey, {m}!', 'would you look at that - {m}!', 'a {m}! best keep my distance.', 'never seen {m} up close before.'];
function combatLevelOf(e, fallback) { return e && e.getCombatLevel ? e.getCombatLevel() : (e && e.combatLevel) || fallback; }
function sighting(bot, store) {
    const p = personality.of(bot);
    if (p.curiosity < 0.4 && p.sociability < 0.4) return false;
    if (bot._sightCd && bot._sightCd > 0) { bot._sightCd -= 1; return false; }
    let npcs;
    try { npcs = bot.getNearbyEntities('npcs', 7); } catch (e) { return false; }
    const myCl = combatLevelOf(bot, 3);
    const big = npcs.find((n) => n && n.definition && n.definition.name && (n.definition.attack || 0) > 0 && combatLevelOf(n, 0) > myCl + 25);
    if (!big) return false;
    const name = big.definition.name;
    if (!store.seenMonsters) store.seenMonsters = {};
    if (store.seenMonsters[name]) return false; // already gawped at this kind
    store.seenMonsters[name] = 1;
    bot._sightCd = 200;
    if (Math.random() > 0.6) return false; // notices, doesn't always blurt
    // respect the crowd din so a cluster of bots don't all shout at once
    try { if (!require('./presence').mayChatter(bot)) return false; } catch (e) {}
    try {
        const line = SIGHT_LINES[Math.floor(Math.random() * SIGHT_LINES.length)].replace('{m}', name.toLowerCase());
        let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {}
        if (typeof bot.broadcastChat === 'function') {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
            try { require('./presence').noteChatter(bot); } catch (e) {}
        }
    } catch (e) {}
    return true;
}

module.exports = { onTick, sighting };
