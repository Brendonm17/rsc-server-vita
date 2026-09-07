// gossip: a bot shares strong first-hand opinions with nearby bots; a bot listener
// nudges its own relationship with that third party, weighted by trust

const social = require('./social-emergent');
// lazy-required once
let _mod_chatgen = null;
function mod_chatgen() { return _mod_chatgen || (_mod_chatgen = require('./chatgen')); }
let _mod_voice = null;
function mod_voice() { return _mod_voice || (_mod_voice = require('./voice')); }
const personality = require('./personality');

// relationship store lives at cache.bot.social
function relsOf(bot) {
    const cb = bot.cache && bot.cache.bot;
    return (cb && cb.social && cb.social.rel) || {};
}

function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._gossipCd && bot._gossipCd > 0) { bot._gossipCd -= 1; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.45) return false;

    // a strong first-hand opinion worth passing on
    const rels = relsOf(bot);
    const subjects = Object.keys(rels).filter((u) => Math.abs(rels[u]) >= 3);
    if (!subjects.length) return false;

    let nearby;
    try { nearby = bot.getNearbyEntities('players', 5); } catch (e) { return false; }

    // tell a known human about a third party now and then
    const human = nearby.find((pl) => pl && !pl.isBot && pl.username && pl.username !== bot.username);
    if (human && Math.random() < 0.35) {
        const rec = bot.cache && bot.cache.bot && bot.cache.bot.social && bot.cache.bot.social.people && bot.cache.bot.social.people[human.username];
        const about = subjects.filter((u) => u !== human.username);
        if (rec && rec.met >= 1 && about.length && !(bot._lastGossip && bot._lastGossip.to === human.username)) {
            const subj = about[Math.floor(Math.random() * about.length)];
            const who = (human.getFormattedUsername && human.getFormattedUsername()) || human.username;
            const like = rels[subj] > 0;
            const line = like
                ? ["if you run into " + subj + ", " + who + " - good sort, that one.", subj + "'s alright, " + who + ". you'd get on.", "you met " + subj + " yet? one of the good ones."][Math.floor(Math.random() * 3)]
                : ["watch yourself around " + subj + ", " + who + ". no good, that one.", "word of advice, " + who + ": don't trust " + subj + ".", "between us, " + who + " - " + subj + " is trouble."][Math.floor(Math.random() * 3)];
            bot._lastGossip = { to: human.username, subj };
            bot._gossipCd = 400 + Math.floor(Math.random() * 400);
            try { bot._reactionSpeak = true; bot.broadcastChat(line); } catch (e) {  } finally { bot._reactionSpeak = false; }
            return true;
        }
    }

    // a nearby BOT to tell
    const listener = nearby.find((pl) => pl && pl.isBot && pl !== bot && pl.username !== bot.username && pl.cache && pl.cache.bot && pl.cache.bot.social);
    if (!listener) return false;

    let subject = subjects[Math.floor(Math.random() * subjects.length)];
    if (subject === listener.username) return false; // don't badmouth them to their face
    // if we just told this listener about this subject, pick another or hold off
    if (bot._lastGossip && bot._lastGossip.to === listener.username && bot._lastGossip.subj === subject) {
        const others = subjects.filter((u) => u !== subject && u !== listener.username);
        if (!others.length) { bot._gossipCd = 220; return false; }
        subject = others[Math.floor(Math.random() * others.length)];
    }
    if (Math.random() > 0.5) return false;
    bot._gossipCd = 220;
    bot._lastGossip = { to: listener.username, subj: subject };

    const opinion = rels[subject];
    const good = opinion > 0;
    // pull the line from the chat engine, fall back to a small hand pool
    let out = null;
    try { out = mod_chatgen().generate(good ? 'gossipPraise' : 'gossipWarn', { name: subject }, bot); } catch (e) {  }
    if (!out) {
        const lines = good
            ? [subject + '\'s alright, they helped me out.', 'you can trust ' + subject + '.', subject + '\'s good people.']
            : ['watch out for ' + subject + ', bad news.', 'steer clear of ' + subject + '.', subject + ' did me dirty.'];
        out = lines[Math.floor(Math.random() * lines.length)];
        try { out = mod_voice().apply(bot, out); } catch (e) {  }
    }
    try {
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
    } catch (e) {  }

    // listener nudges its own view of the subject, weighted by trust in the gossiper
    try {
        const trust = social.sentiment(listener, bot.username);
        const weight = 0.4 + Math.max(0, trust) * 0.06; // trusted friends' word weighs more
        social.noteInteraction(listener, subject, (good ? 1 : -1) * weight);
    } catch (e) {  }
    return true;
}

module.exports = { onTick };
