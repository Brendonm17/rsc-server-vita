// a sociable bot starts a chat with someone nearby: small talk, a question, an opinion, or a story from its history
// the other bot hears it and replies via hearing.js; loners never start, heavily rate-limited

const npcs = require('@2003scape/rsc-data/config/npcs');

let personality, mood, chatgen, social, reputation, dreams;
function deps() {
    if (personality) return;
    personality = require('./personality');
    mood = require('./mood');
    chatgen = require('./chatgen');
    social = require('./social-emergent');
    reputation = require('./reputation');
    dreams = require('./dreams');
}

function one(a) { return a[Math.floor(Math.random() * a.length)]; }
function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function nameOf(c) { return (c.getFormattedUsername && c.getFormattedUsername()) || c.username || 'friend'; }

function say(bot, situation, ctx) {
    deps();
    let line;
    try { line = chatgen.generate(situation, ctx || {}, bot); } catch (e) { line = null; }
    if (!line) return;
    bot._lastSaid = line;
    try { bot.broadcastChat(line); } catch (e) {}
}

// the foe that has hurt this bot most, as a name
function topDangerName(bot) {
    const L = bot.cache && bot.cache.bot && bot.cache.bot.learning;
    if (!L || !L.enemyDanger) return null;
    let bestId = null, best = 0;
    for (const id of Object.keys(L.enemyDanger)) {
        if (L.enemyDanger[id] > best) { best = L.enemyDanger[id]; bestId = id; }
    }
    if (bestId == null) return null;
    const def = npcs[bestId];
    return def ? def.name.toLowerCase() : null;
}

// an anecdote from the bot's own history
function storyTopic(bot) {
    deps();
    const cb = bot.cache && bot.cache.bot;
    const topics = [];
    const danger = topDangerName(bot);
    if (danger) topics.push('the time a ' + danger + ' nearly finished me off');
    if (cb && (cb.dreamsAchieved || 0) > 0) topics.push('finally achieving something I\'d chased for ages');
    try {
        if (reputation.hasTag(bot, 'slayer')) topics.push('the day I slew a proper monster');
        if (reputation.hasTag(bot, 'pker')) topics.push('my wilder days out in the deep wild');
        if (reputation.hasTag(bot, 'merchant')) topics.push('the best deal I ever haggled');
        if (reputation.hasTag(bot, 'legend')) topics.push('how far I\'ve come since I started');
    } catch (e) {}
    try {
        const dl = dreams.label(bot);
        if (dl) topics.push('what I\'m working toward - ' + dl);
    } catch (e) {}
    // real memories first: fights, finds and quests that happened
    try { const real = require('./episodes').storyTopic(bot); if (real) { topics.push(real, real); } } catch (e) {}
    topics.push('a close call I once had round here', 'the old days when I was just starting out', 'a rare find I stumbled on once');
    return one(topics);
}

// choose a conversation type by personality + mood
function pickType(bot) {
    const p = personality.of(bot);
    const m = mood.of(bot);
    const w = {
        smallTalk: 0.3 + p.sociability * 0.3,
        askAbout: 0.15 + p.curiosity * 0.4 + p.sociability * 0.2,
        comment: 0.2 + (0.5 - p.sociability) * 0.2,
        opinion: 0.1 + (m.confidence - 0.4) * 0.4 + p.aggression * 0.2,
        tellStory: 0.1 + p.sociability * 0.2 + (m.valence - 0.4) * 0.3
    };
    const keys = Object.keys(w);
    let total = 0; for (const k of keys) total += Math.max(0, w[k]);
    let r = Math.random() * total;
    for (const k of keys) { r -= Math.max(0, w[k]); if (r <= 0) return k; }
    return 'smallTalk';
}

// per-tick: a sociable bot occasionally opens a conversation with someone nearby
function onTick(bot) {
    deps();
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return;
    if (bot._convoStartCd > 0) { bot._convoStartCd -= 1; return; }

    const p = personality.of(bot);
    if (p.sociability < 0.3) { bot._convoStartCd = rand(400, 800); return; } // loners keep to themselves

    let target = null;
    try {
        for (const o of bot.getNearbyEntities('players', 5)) {
            if (o && o !== bot && o.username !== bot.username && !o.opponent) { target = o; break; }
        }
    } catch (e) {}
    if (!target) { bot._convoStartCd = rand(60, 140); return; }

    // extroverts open up more; a good mood helps.
    const m = mood.of(bot);
    if (Math.random() >= 0.2 + p.sociability * 0.5 + (m.valence - 0.5) * 0.2) {
        bot._convoStartCd = rand(80, 180);
        return;
    }

    // rotate openers: not the same opener or story twice in a row with the same person
    let type = pickType(bot);
    let rec = null;
    try {
        const cb = bot.cache && bot.cache.bot;
        const s = cb && (cb.social || (cb.social = {}));
        const people = s && (s.people || (s.people = {}));
        rec = people && (people[target.username] || (people[target.username] = { met: 0, lastSeen: 0, lastLevel: 0, topics: [] }));
    } catch (e) { rec = null; }
    const usedTypes = rec && rec.openers ? rec.openers : [];
    for (let i = 0; i < 4 && usedTypes.indexOf(type) !== -1; i++) type = pickType(bot);
    const ctx = { name: nameOf(target) };
    if (type === 'tellStory') {
        let topic = storyTopic(bot);
        for (let i = 0; i < 4 && rec && rec.lastStory === topic; i++) topic = storyTopic(bot);
        ctx.topic = topic;
        if (rec) rec.lastStory = topic;
    }
    if (rec) { rec.openers = (rec.openers || []).concat(type).slice(-3); }
    say(bot, type, ctx);
    try { social.noteInteraction(bot, target.username, 0.3); } catch (e) {}

    // a proper breather after starting one, so bots don't natter non-stop.
    bot._convoStartCd = rand(300, 700);
}

module.exports = { onTick, storyTopic, pickType };
