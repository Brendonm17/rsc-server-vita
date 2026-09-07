// bot occasionally muses aloud about its journey, a friend, a rival, or a dream
// only reflects on things it actually has, rate-limited to a rare aside

const personality = require('./personality');

function has(bot, path) {
    return require('./poller-registry').tryGet(path);
}

// gather the themes this bot could reflect on
function themes(bot) {
    const out = [];
    // journey: only a veteran bot reflects on the road
    let veteranish = false;
    try {
        const cb = bot.cache && bot.cache.bot;
        const cl = bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 3);
        veteranish = cl >= 45 || (cb && (cb.dreamsAchieved || 0) >= 1) || (cb && Array.isArray(cb.tales) && cb.tales.length >= 3);
    } catch (e) {  }
    if (veteranish) out.push({ sit: 'reflectJourney', ctx: {} });

    const em = has(bot, 'social-emergent');
    if (em) {
        try { const f = em.bestFriend(bot); if (f) out.push({ sit: 'reflectFriend', ctx: { name: f } }); } catch (e) {  }
        try { const r = em.topRival(bot); if (r) out.push({ sit: 'reflectRival', ctx: { name: r } }); } catch (e) {  }
    }
    const dreams = has(bot, 'dreams');
    if (dreams) {
        try { const label = dreams.shortLabel ? dreams.shortLabel(bot) : (dreams.label && dreams.label(bot)); if (label) out.push({ sit: 'reflectDream', ctx: { topic: label } }); } catch (e) {  }
    }
    return out;
}

function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._reflectCd && bot._reflectCd > 0) { bot._reflectCd -= 1; return false; }

    const p = personality.of(bot);
    // a rare aside, skipped for near-loners
    if (p.sociability < 0.3) { bot._reflectCd = 800; return false; }

    // only muse when settled, not mid-crisis
    let m = null; try { m = require('./mood').of(bot); } catch (e) {  }
    if (m && (m.energy > 0.85 || m.valence < 0.2)) { bot._reflectCd = 400; return false; }

    const opts = themes(bot);
    if (!opts.length) { bot._reflectCd = 500; return false; }

    // occasional: long cooldown, low fire rate
    if (Math.random() > 0.15 + p.patience * 0.15) { bot._reflectCd = 400; return false; }

    const pick = opts[Math.floor(Math.random() * opts.length)];
    let line = null;
    try { line = require('./chatgen').generate(pick.sit, pick.ctx, bot); } catch (e) {  }
    if (!line) { bot._reflectCd = 500; return false; }
    try {
        bot._reactionSpeak = true; // a private musing, not news
        try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
    } catch (e) {  }
    bot._reflectCd = 900 + Math.floor(Math.random() * 900);
    return true;
}

module.exports = { onTick, themes };
