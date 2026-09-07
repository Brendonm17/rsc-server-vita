// a sociable bot opens a chat with someone nearby: an opener from its state (a recent episode, the
// partner's skill, the town, a remembered spot), stock small talk as fallback; loners never start

const npcs = require('@2003scape/rsc-data/config/npcs');

let personality, mood, chatgen, social, reputation, dreams, episodes, goals, context, memory, regions, voice;
function deps() {
    if (personality) return;
    personality = require('./personality');
    mood = require('./mood');
    chatgen = require('./chatgen');
    social = require('./social-emergent');
    reputation = require('./reputation');
    dreams = require('./dreams');
    try { episodes = require('./episodes'); } catch (e) { episodes = null; }
    try { goals = require('./goals'); } catch (e) { goals = null; }
    try { context = require('./context'); } catch (e) { context = null; }
    try { memory = require('./memory'); } catch (e) { memory = null; }
    try { regions = require('./regions'); } catch (e) { regions = null; }
    try { voice = require('./voice'); } catch (e) { voice = null; }
}

function one(a) { return a[Math.floor(Math.random() * a.length)]; }
function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function nameOf(c) { return (c.getFormattedUsername && c.getFormattedUsername()) || c.username || 'friend'; }

function say(bot, situation, ctx) {
    deps();
    let line;
    try { line = chatgen.generate(situation, ctx || {}, bot); } catch (e) { line = null; }
    if (!line) return false;
    bot._lastSaid = line;
    try { bot.broadcastChat(line); } catch (e) {}
    return true;
}
// a composed line in the bot's voice
function sayText(bot, text) {
    deps();
    if (!text) return false;
    let out = text;
    try { if (voice) out = voice.apply(bot, text); } catch (e) { out = text; }
    bot._lastSaid = out;
    try { bot.broadcastChat(out); } catch (e) {}
    return true;
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
    try { const real = episodes && episodes.storyTopic(bot); if (real) { topics.push(real, real); } } catch (e) {}
    topics.push('a close call I once had round here', 'the old days when I was just starting out', 'a rare find I stumbled on once');
    return one(topics);
}

// choose a stock conversation type by personality + mood
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

// the persisted per-partner record (cache.bot.social.people[username])
function recFor(bot, username, create) {
    try {
        const cb = bot.cache && bot.cache.bot;
        if (!cb) return null;
        const s = cb.social || (create ? (cb.social = {}) : null);
        if (!s) return null;
        const people = s.people || (create ? (s.people = {}) : null);
        if (!people) return null;
        if (!people[username] && create) people[username] = { met: 0, lastSeen: 0, lastLevel: 0, topics: [] };
        const rec = people[username] || null;
        if (rec && !rec.topics) rec.topics = [];
        return rec;
    } catch (e) { return null; }
}

// partner score: relationship + familiarity, minus the last partner and anyone mid-greeting, plus noise
function pickTarget(bot) {
    let best = null, bestS = -1e9;
    const now = bot.world ? bot.world.ticks | 0 : 0;
    let list;
    try { list = bot.getNearbyEntities('players', 5); } catch (e) { return null; }
    for (const o of list) {
        if (!o || o === bot || o.username === bot.username || o.opponent || !o.username) continue;
        let s = 1 + Math.random() * 0.5;
        try { s += Math.max(-2, Math.min(4, social.sentiment(bot, o.username))) * 0.3; } catch (e) {}
        const rec = recFor(bot, o.username, false);
        if (rec) s += Math.min(rec.met || 0, 5) * 0.12;
        if (bot._lastPartner === o.username) s -= 0.8;
        if (now - (o._greetedAt || 0) < 40) s -= 0.5;
        if (s > bestS) { bestS = s; best = o; }
    }
    return best;
}

// the partner's current skill from its goal, or null
function partnerSkill(target) {
    try {
        const g = goals && goals.current(target);
        const s = g && g.skill;
        return s ? String(s) : null;
    } catch (e) { return null; }
}

// the opener: weighted pick between state openers and stock small talk
function open(bot, target, rec) {
    const name = nameOf(target);
    const c = [];

    // 1. a recent episode, then the ball back
    let news = null;
    try {
        const eps = episodes ? episodes.recent(bot, 3, 4000) : [];
        if (eps.length) news = episodes.describe(bot, eps[0]);
    } catch (e) { news = null; }
    if (news && rec.lastNews !== news) {
        c.push({ w: 0.35, run() { rec.lastNews = news; return sayText(bot, news + ' ' + one(['you?', 'what about you?', 'anything on your end?', 'how about you, ' + name + '?'])); } });
    }

    // 2. the partner's skill, fresh or recalled
    const skill = partnerSkill(target);
    if (skill) {
        const recalled = rec.topics.indexOf(skill) !== -1 && (bot.world ? bot.world.ticks | 0 : 0) - (rec.lastSeen || 0) > 300;
        c.push({ w: 0.3, run() {
            rec.topics.push(skill); if (rec.topics.length > 6) rec.topics.shift();
            return say(bot, recalled ? 'recallSubject' : 'askSubject', { name, topic: skill });
        } });
    }

    // 3. the place we're standing in
    let region = null;
    try { region = context ? context.describe(bot).region : null; } catch (e) { region = null; }
    if (region && region.name && rec.lastPlace !== region.name) {
        c.push({ w: 0.15, run() { rec.lastPlace = region.name; return say(bot, 'commentPlace', { name, place: region.name }); } });
    }

    // 4. a spot the bot remembers as dangerous or rich
    let areas = [];
    try { areas = memory ? memory.topAreas(bot) : []; } catch (e) { areas = []; }
    for (const a of areas.slice(0, 2)) {
        let r = null;
        try { r = regions ? regions.regionAt(a.x, a.y) : null; } catch (e) { r = null; }
        if (!r || !r.name || rec.lastArea === r.name) continue;
        c.push({ w: 0.12, run() { rec.lastArea = r.name; return say(bot, a.kind === 'danger' ? 'warnPlace' : 'tipPlace', { name, place: r.name }); } });
    }

    // 5. stock openers, type rotated per partner
    let type = pickType(bot);
    const usedTypes = rec.openers || [];
    for (let i = 0; i < 4 && usedTypes.indexOf(type) !== -1; i++) type = pickType(bot);
    c.push({ w: c.length ? 0.3 : 1, run() {
        const ctx = { name };
        if (type === 'tellStory') {
            let topic = storyTopic(bot);
            for (let i = 0; i < 4 && rec.lastStory === topic; i++) topic = storyTopic(bot);
            ctx.topic = topic;
            rec.lastStory = topic;
        }
        rec.openers = (rec.openers || []).concat(type).slice(-3);
        return say(bot, type, ctx);
    } });

    let total = 0; for (const x of c) total += x.w;
    let r = Math.random() * total;
    for (const x of c) { r -= x.w; if (r <= 0) return x.run(); }
    return c[c.length - 1].run();
}

// per-tick: a sociable bot occasionally opens a conversation with someone nearby
function onTick(bot) {
    deps();
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return;
    if (bot._convoStartCd > 0) { bot._convoStartCd -= 1; return; }

    const p = personality.of(bot);
    if (p.sociability < 0.3) { bot._convoStartCd = rand(400, 800); return; } // loners keep to themselves

    const target = pickTarget(bot);
    if (!target) { bot._convoStartCd = rand(60, 140); return; }

    // extroverts open up more; a good mood helps.
    const m = mood.of(bot);
    if (Math.random() >= 0.2 + p.sociability * 0.5 + (m.valence - 0.5) * 0.2) {
        bot._convoStartCd = rand(80, 180);
        return;
    }

    const rec = recFor(bot, target.username, true) || { met: 0, lastSeen: 0, lastLevel: 0, topics: [] };
    open(bot, target, rec);
    bot._lastPartner = target.username;
    try { social.noteInteraction(bot, target.username, 0.3); } catch (e) {}

    // a proper breather after starting one, so bots don't natter non-stop.
    bot._convoStartCd = rand(300, 700);
}

module.exports = { onTick, storyTopic, pickType };
