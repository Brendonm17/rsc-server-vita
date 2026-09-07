// legends: a live world-wide reputation board of the most storied bots (title + a fame
// score), used to name-drop the famous in idle chat and recognise a legend on sight

const maturity = require('./maturity');
// resolved once on first use
let _mod_chatgen = null;
function mod_chatgen() { return _mod_chatgen || (_mod_chatgen = require('./chatgen')); }
let _mod_personality = null;
function mod_personality() { return _mod_personality || (_mod_personality = require('./personality')); }
let _mod_reputation = null;
function mod_reputation() { return _mod_reputation || (_mod_reputation = require('./reputation')); }
let _mod_socialEmergent = null;
function mod_socialEmergent() { return _mod_socialEmergent || (_mod_socialEmergent = require('./social-emergent')); }
let _mod_titles = null;
function mod_titles() { return _mod_titles || (_mod_titles = require('./titles')); }
let _mod_voice = null;
function mod_voice() { return _mod_voice || (_mod_voice = require('./voice')); }

const RANKW = { 'the Wanderer': 1, 'the Storied': 2, 'the Accomplished': 3, 'the Wise': 4, 'the Rich': 5, 'the Bold': 6, 'the Feared': 7, 'the Dragonslayer': 8, 'the Legendary': 10 };

// username -> { title, fame, name }
const board = {};

function fameOf(bot) {
    let f = 0;
    let title = null;
    try { title = mod_titles().titleOf(bot); } catch (e) {}
    if (title) f += (RANKW[title] || 1) * 10;
    const cb = bot.cache && bot.cache.bot;
    if (cb) {
        f += Math.min(20, (cb.dreamsAchieved || 0) * 4);
        if (Array.isArray(cb.tales)) f += Math.min(10, cb.tales.length);
        // felling greater names than your own is worth a lot of fame
        f += Math.min(24, (cb.glory || 0) * 6);
    }
    try { if (mod_reputation().hasTag(bot, 'legend')) f += 15; } catch (e) {}
    return { fame: f, title };
}

// register/update a bot's standing on the board (called on a throttle).
function report(bot) {
    if (!bot || !bot.username) return;
    const { fame, title } = fameOf(bot);
    if (fame <= 0) return;
    const name = (bot.getFormattedUsername && bot.getFormattedUsername()) || bot.username;
    board[bot.username] = { title: title || '', fame, name };
}

// the N most famous names, most-famous first.
function top(n) {
    return Object.keys(board)
        .map((u) => ({ username: u, ...board[u] }))
        .sort((a, b) => b.fame - a.fame)
        .slice(0, n || 5);
}

function isLegend(username) {
    const e = board[username];
    return !!(e && e.fame >= 60); // roughly: the Legendary, or a hugely storied bot
}

function titleFor(username) {
    const e = board[username];
    return e ? e.title : null;
}

function speak(bot, line) {
    try {
        let out = line; try { out = mod_voice().apply(bot, line); } catch (e) {}
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
    } catch (e) {}
}

// per-tick: keep the board current, and occasionally name-drop a famous bot to nearby
// folk; bot listeners come to regard the legend well
function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._legendRepCd == null) bot._legendRepCd = 0;
    if (bot._legendRepCd-- <= 0) { report(bot); bot._legendRepCd = 300; }

    // a newbie earns its place on the board but doesn't yet trade in others' legends
    if (Math.random() > maturity.socialAmbition(bot)) return false;
    if (bot._legendCd && bot._legendCd > 0) { bot._legendCd -= 1; return false; }
    let personality;
    try { personality = mod_personality().of(bot); } catch (e) { return false; }
    if (personality.sociability < 0.45) return false;

    let audience = false;
    try { audience = bot.getNearbyEntities('players', 6).some((o) => o && o !== bot && o.id !== bot.id); } catch (e) { return false; }
    if (!audience) { bot._legendCd = 60; return false; }
    if (Math.random() > 0.12) { bot._legendCd = 200; return false; }

    // pick a famous name that isn't this bot
    const famous = top(5).filter((e) => e.username !== bot.username && e.fame >= 30);
    if (!famous.length) { bot._legendCd = 300; return false; }
    const pick = famous[Math.floor(Math.random() * famous.length)];

    // draw the name-drop from the generative engine, keeping the famous name + title;
    // fall back to a small pool otherwise
    let out = null;
    try { out = mod_chatgen().generate('legendMention', { name: pick.name + ' ' + pick.title }, bot); } catch (e) {}
    if (out) {
        try { bot._reactionSpeak = true; try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; } } catch (e) {}
    } else {
        const lines = [
            'did you hear about ' + pick.name + ' ' + pick.title + '?',
            'they say ' + pick.name + ' ' + pick.title + ' is really something.',
            'one day i\'ll be spoken of like ' + pick.name + '.'
        ];
        speak(bot, lines[Math.floor(Math.random() * lines.length)]);
    }
    bot._legendCd = 400 + Math.floor(Math.random() * 400);

    // renown travels: nearby bots warm to the legend they just heard praised.
    try {
        const em = mod_socialEmergent();
        for (const o of bot.getNearbyEntities('players', 6)) {
            if (o && o.isBot && o !== bot && o.username !== pick.username && o.cache && o.cache.bot) {
                em.noteInteraction(o, pick.username, 0.2);
            }
        }
    } catch (e) {}
    return true;
}

module.exports = { report, top, isLegend, titleFor, fameOf, onTick, _board: board };
