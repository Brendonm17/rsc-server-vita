// the bots' conversation manager: who answers, per-partner threads, nlu understanding, and paced replies.
// hearing.js owns what a line makes a bot do; this owns the conversation around it.
'use strict';

const nlu = require('./nlu');

let hearing, personality, mood, social, chatgen, knowledge, voice, goals, party, dreams, questing, episodes;
function deps() {
    if (hearing) return;
    hearing = require('./hearing');
    try { episodes = require('./episodes'); } catch (e) { episodes = null; }
    personality = require('./personality');
    mood = require('./mood');
    social = require('./social-emergent');
    chatgen = require('./chatgen');
    knowledge = require('./knowledge');
    voice = require('./voice');
    goals = require('./goals');
    party = require('../party');
    try { dreams = require('./dreams'); } catch (e) { dreams = null; }
    try { questing = require('./questing'); } catch (e) { questing = null; }
    // the game's own names are never "typo-corrected" away
    try {
        nlu.addKnownWords(knowledge.itemByName.keys());
        nlu.addKnownWords(knowledge.npcByName.keys());
        nlu.addKnownWords(require('./quests-data').map((q) => q.name));
    } catch (e) {  }
}

const HEAR_RANGE = 14;      // getInArea halves the range -> seven tiles either side
const PLANE = 944;
const THREAD_TTL = 60;      // ticks a thread stays open with nothing said
const MAX_LINE = 76;        // the chat line limit
const READING_CACHE = new Map();
const READING_CACHE_MAX = 128;

function nowTick(c) { return (c && c.world && c.world.ticks) | 0; }
function rnd(n) { return Math.floor(Math.random() * n); }
function one(a) { return a[rnd(a.length)]; }
function isHuman(c) { return !!(c && c.username && !c.isBot); }
function dist(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function nameOf(c) { return (c && c.getFormattedUsername && c.getFormattedUsername()) || (c && c.username) || 'friend'; }
function cap(s) {
    if (!s) return s;
    let out = String(s).replace(/\s+/g, ' ').trim();
    if (out.length <= MAX_LINE) return out;
    out = out.slice(0, MAX_LINE);
    const cut = out.lastIndexOf(' ');
    return (cut > 30 ? out.slice(0, cut) : out).replace(/[,;:\-\s]+$/, '') + (/[.!?]$/.test(out) ? '' : '.');
}
function first(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// threads + memory
function threads(bot) { return bot._threads || (bot._threads = {}); }
function newThread(bot, partner) {
    const now = nowTick(bot);
    return (threads(bot)[partner] = {
        partner, turns: 0, lastTick: now, opened: now, topic: null, expecting: null,
        history: [], budget: 3 + rnd(4), asked: {}
    });
}
function getThread(bot, partner, create) {
    const all = threads(bot);
    const t = all[partner];
    if (t && nowTick(bot) - t.lastTick > THREAD_TTL) { delete all[partner]; return create ? newThread(bot, partner) : null; }
    if (!t && create) return newThread(bot, partner);
    return t || null;
}
function closeThread(bot, partner) { const all = threads(bot); if (all[partner]) delete all[partner]; }

// persisted per-partner memory: cache.bot.social.people[username]
function people(bot) {
    const cb = bot && bot.cache && bot.cache.bot;
    if (!cb) return null;
    const s = cb.social || (cb.social = {});
    return s.people || (s.people = {});
}
function remember(bot, partner, patch) {
    const p = people(bot);
    if (!p || !partner) return null;
    const rec = p[partner] || (p[partner] = { met: 0, lastSeen: 0, lastLevel: 0, topics: [] });
    if (patch && patch.met) rec.met += 1;
    if (patch && patch.level) rec.lastLevel = patch.level;
    if (patch && patch.topic) { rec.topics.push(patch.topic); if (rec.topics.length > 6) rec.topics.shift(); }
    if (patch && patch.told) { const told = rec.told || (rec.told = []); told.push(patch.told); if (told.length > 4) told.shift(); }
    rec.lastSeen = nowTick(bot);
    return rec;
}

// a skill/quest/boss/place a person says in the first person is kept on their record,
// so a later greeting can ask about it. only the same person's own words count.
function noteTold(bot, speaker, u) {
    if (!speaker || speaker.isBot || !u || !u.entities) return;
    if (!(u.mentionsMe || /^\s*(im|i|we)\b/.test(u.norm || ''))) return;
    if (u.primary && /^(ask|question|help|invite|offer|request|follow|come|wait|propose|goto)/.test(u.primary.type)) return;
    const skill = u.entities.skills[0] || (u.activity && u.activity.skill) || null;
    const quest = u.quest ? (u.quest.name || u.quest.kw || null) : null;
    const boss = u.boss ? (u.boss.name || u.boss.kw || null) : null;
    const place = u.placeHit ? u.placeHit.kw : null;
    let told = null;
    if (skill) told = { kind: 'skill', name: String(skill).toLowerCase() };
    else if (quest) told = { kind: 'quest', name: String(quest).toLowerCase() };
    else if (boss) told = { kind: 'boss', name: String(boss).toLowerCase() };
    else if (place) told = { kind: 'place', name: String(place).toLowerCase() };
    if (!told) return;
    told.tick = nowTick(bot);
    const rec = people(bot) && people(bot)[speaker.username];
    const last = rec && rec.told && rec.told[rec.told.length - 1];
    if (last && last.kind === told.kind && last.name === told.name) { last.tick = told.tick; return; }
    remember(bot, speaker.username, { told });
}
// the latest thing this person told the bot, if recent and not already asked about.
function recallTold(bot, username, within) {
    const rec = people(bot) && people(bot)[username];
    if (!rec || !rec.told || !rec.told.length) return null;
    const t = rec.told[rec.told.length - 1];
    const now = nowTick(bot);
    if (within !== undefined && now - t.tick > within) return null;
    if (t.asked && now - t.asked < 1500) return null;
    return t;
}
// a follow-up about it, in plain words (the caller voices it)
function toldQuestion(bot, told, name, withName) {
    let line = null;
    switch (told.kind) {
        case 'skill': line = one(["how's the {x} going, {n}?", "still on the {x}, {n}?", "getting anywhere with the {x}?"]); break;
        case 'quest': line = one(["did you finish {x}, {n}?", "how's {x} going?", "still stuck on {x}, {n}?"]); break;
        case 'boss': line = one(["had another go at {x}, {n}?", "beaten {x} yet, {n}?"]); break;
        case 'place': line = one(["how was {x}, {n}?", "back from {x} already, {n}?", "still around {x}?"]); break;
        default: return null;
    }
    told.asked = nowTick(bot);
    if (withName === false) line = line.replace(', {n}', '');
    return line.replace('{x}', told.name).replace('{n}', name);
}

// read a line (memoised per text + nearby names)
function reading(text, speaker, bots) {
    deps();
    const names = [];
    for (const b of bots) if (b && b.username) names.push(b.username);
    if (speaker && speaker.username) names.push(speaker.username);
    names.sort();
    const key = text + '|' + names.join(',');
    let u = READING_CACHE.get(key);
    if (u) return u;
    if (READING_CACHE.size >= READING_CACHE_MAX) READING_CACHE.clear();
    u = nlu.analyze(text, {
        nearbyNames: names,
        helpers: hearing.helpers(),
        knowledge: { itemByName: knowledge.itemByName, npcByName: knowledge.npcByName, findInText: knowledge.findInText }
    });
    READING_CACHE.set(key, u);
    return u;
}

function nearbyBots(speaker, range) {
    let list;
    try { list = speaker.getNearbyEntities('players', range || HEAR_RANGE); } catch (e) { return []; }
    const pl = Math.floor(speaker.y / PLANE);
    const out = [];
    for (const o of list) {
        if (!o || !o.isBot || o === speaker || o.username === speaker.username) continue;
        if (Math.floor(o.y / PLANE) !== pl) continue;
        out.push(o);
    }
    return out;
}

// the say queue: paced, staggered, one line per bot per tick
const QUEUE_MAX_BOT_LINES = 2; // a bot mid-chat with other bots doesn't stack up more banter
function queueSay(bot, text, delay, partner, via) {
    if (!text) return;
    const q = bot._sayQueue || (bot._sayQueue = []);
    const human = !!(partner && partner.username && !partner.isBot);
    if (!human) {
        let botLines = 0;
        for (const e of q) if (!e.human && !e.direct) botLines++;
        if (botLines >= QUEUE_MAX_BOT_LINES) return;
    }
    // a long answer goes out as two lines rather than being cut off.
    const full = finalize(bot, text, true);
    const parts = splitLines(full);
    // a reply waits reading + thinking (1-3 ticks for a human, 3-7 bot-to-bot) plus typing time,
    // so bots never answer instantly; the caller's stagger is a minimum.
    const think = human ? 1 + rnd(2) : 3 + rnd(4);
    const typing = typingTicks(parts[0]);
    const pace = think + typing + (Math.random() < 0.25 ? rnd(3) : 0);
    const due = nowTick(bot) + Math.max(Math.max(1, delay | 0), pace);
    let at = due;
    parts.forEach((part, i) => {
        if (i) at += 1 + typingTicks(part);
        q.push({ due: at, text: part, partner: partner && partner.username ? partner.username : null, human, via: via || null });
    });
}
function splitLines(text) {
    if (!text || text.length <= MAX_LINE) return [text];
    const head = text.slice(0, MAX_LINE);
    let cut = Math.max(head.lastIndexOf('. '), head.lastIndexOf(', '), head.lastIndexOf(' - '), head.lastIndexOf('; '));
    if (cut < 24) cut = head.lastIndexOf(' ');
    if (cut < 24) return [cap(text)];
    const a = text.slice(0, cut + 1).replace(/[,;\s]+$/, '');
    const b = text.slice(cut + 1).trim();
    return [a, b.length > MAX_LINE ? cap(b) : b].filter(Boolean);
}
function speak(bot, text) {
    bot._lastSaid = text;
    bot._reactionSpeak = true;
    try { bot.broadcastChat(text); } catch (e) {  } finally { bot._reactionSpeak = false; }
}
function findPlayer(bot, username) {
    try {
        for (const o of bot.getNearbyEntities('players', 24)) if (o && o.username === username) return o;
    } catch (e) {  }
    return null;
}
// called every tick for every bot (bots/index.js runBotBrain; once per tick)
function flush(bot) {
    const q = bot._sayQueue;
    if (!q || !q.length) return;
    const now = nowTick(bot);
    if (bot._sayFlushTick === now) return;
    bot._sayFlushTick = now;
    // a due human line goes before any banter; stale banter is dropped.
    for (let k = q.length - 1; k >= 0; k--) { if (!q[k].human && now - q[k].due > 8) q.splice(k, 1); }
    // order: a human, then the current conversation, then a remark to no one.
    let i = -1;
    for (let k = 0; k < q.length; k++) { if (q[k].human && q[k].due <= now) { i = k; break; } }
    if (i < 0) for (let k = 0; k < q.length; k++) { if (!q[k].direct && q[k].due <= now) { i = k; break; } }
    if (i < 0) for (let k = 0; k < q.length; k++) { if (q[k].due <= now) { i = k; break; } }
    if (i < 0) return;
    const e = q[i];
    // drop a line another nearby bot just said (an echo); never a human line or a channel line.
    if (!e.human && !e.via && saidRecentlyNearby(bot, e.text, 80, HEAR_RANGE)) {
        q.splice(i, 1);
        return;
    }
    // don't all talk at once: hold a remark while others in earshot are mid-exchange (human replies never wait).
    if (!e.human) {
        const crowd = crowdSpeakingCount(bot, 3, HEAR_RANGE);
        const busy = crowd >= 2 || someoneJustSpoke(bot, 2);
        if (busy && (e.waited | 0) < 5) {
            e.waited = (e.waited | 0) + 1;
            e.due = now + 2 + Math.floor(Math.random() * 4);
            return;
        }
    }
    q.splice(i, 1);
    bot._sayingTo = e.partner || '*';
    bot._sayDelivering = true;
    const wasReaction = bot._reactionSpeak;
    try {
        if (e.via) {
            // a reply on the channel the line arrived on (global chat)
            bot._lastSaid = e.text;
            try { e.via(bot, e.text); } catch (err) {  }
        } else if (e.direct) {
            bot._reactionSpeak = e.reaction;
            bot._lastSaid = e.text;
            try { bot.broadcastChat(e.text); } catch (err) {  }
        } else {
            speak(bot, e.text);
        }
    } finally {
        bot._reactionSpeak = wasReaction;
        bot._sayDelivering = false;
        bot._sayingTo = null;
    }
    noteSpoken(bot);
    if (e.partner) {
        const partner = findPlayer(bot, e.partner);
        if (partner && partner.isBot) onReplyDelivered(partner, bot, e.text);
    }
}

// every bot line leaves through pacedChat (broadcastChat is swapped for it at first brain pass),
// so any line waits like a person's; quest bubbles and flush()'s own lines pass straight through.
const TYPING_CHARS_PER_TICK = 6; // a steady typist (about nine characters a second)
const TYPING_MAX_TICKS = 8;      // a long line still lands within about five seconds
const DIRECT_QUEUE_MAX = 1; // one ambient thought at a time; a human's answer always finds room
function typingTicks(text) { return Math.min(TYPING_MAX_TICKS, Math.ceil(String(text || '').length / TYPING_CHARS_PER_TICK)); }
function noteSpoken(bot) {
    const w = bot.world;
    if (!w) return;
    const ring = w._botChatRing || (w._botChatRing = []);
    ring.push({ tick: w.ticks | 0, x: bot.x, y: bot.y, name: bot.username, norm: normLine(bot._lastSaid) });
    if (ring.length > 24) ring.shift();
}

// a line stripped to its words (no colour codes, punctuation, case) for matching.
function normLine(text) {
    return String(text || '')
        .replace(/@[a-z0-9]{2,3}@/gi, '')
        .replace(/[^a-z0-9 ]/gi, '')
        .trim()
        .toLowerCase();
}

// did a different nearby bot just say the same line?
function saidRecentlyNearby(bot, text, ticks, within) {
    const w = bot.world;
    const ring = w && w._botChatRing;
    if (!ring || !ring.length) return false;
    const norm = normLine(text);
    if (!norm || norm.length < 4) return false;
    const now = w.ticks | 0;
    for (let i = ring.length - 1; i >= 0; i--) {
        const r = ring[i];
        if (now - r.tick > ticks) break;
        if (r.name !== bot.username && r.norm === norm &&
            Math.abs(r.x - bot.x) <= within && Math.abs(r.y - bot.y) <= within) {
            return true;
        }
    }
    return false;
}

// how many distinct bots spoke within earshot in the last `ticks` ticks.
function crowdSpeakingCount(bot, ticks, within) {
    const w = bot.world;
    const ring = w && w._botChatRing;
    if (!ring || !ring.length) return 0;
    const now = w.ticks | 0;
    const names = new Set();
    for (let i = ring.length - 1; i >= 0; i--) {
        const r = ring[i];
        if (now - r.tick > ticks) break;
        if (r.name !== bot.username && Math.abs(r.x - bot.x) <= within && Math.abs(r.y - bot.y) <= within) {
            names.add(r.name);
        }
    }
    return names.size;
}

// pleasantries carry no information; a thread that is only these winds down fast
const SMALLTALK_TYPES = new Set([
    'greet', 'farewell', 'thanks', 'compliment', 'celebrate', 'apology',
    'howAreYou', 'ack', 'smalltalk'
]);
function someoneJustSpoke(bot, within) {
    const w = bot.world;
    const ring = w && w._botChatRing;
    if (!ring || !ring.length) return false;
    const now = w.ticks | 0;
    for (let i = ring.length - 1; i >= 0; i--) {
        const r = ring[i];
        if (now - r.tick > 1) break;
        if (r.name !== bot.username && Math.abs(r.x - bot.x) <= within && Math.abs(r.y - bot.y) <= within) return true;
    }
    return false;
}
function pacedChat(bot, orig, message, dialogueFlag) {
    if (dialogueFlag || bot._sayDelivering || !message) return orig.call(bot, message, dialogueFlag);
    const q = bot._sayQueue || (bot._sayQueue = []);
    const now = nowTick(bot);
    // a line said while answering a human keeps human priority, never dropped as banter.
    const human = !!(bot._addressing && !bot._addressing.isBot);
    let ambient = 0;
    for (const e of q) if (e.direct && !e.human) ambient++;
    if (!human) {
        // already typing a remark: this thought goes unsaid
        if (ambient >= DIRECT_QUEUE_MAX) return undefined;
    } else if (ambient) {
        // the person in front of you comes first: the pending remark is dropped
        for (let k = q.length - 1; k >= 0; k--) { if (q[k].direct && !q[k].human) { q.splice(k, 1); break; } }
    }
    const due = now + (human ? 1 : Math.floor(Math.random() * 3)) + typingTicks(message);
    q.push({ due, text: message, partner: null, human, reaction: !!bot._reactionSpeak, direct: true, via: bot._replyVia || null });
    return undefined;
}

// entry points
// overhead speech (hearing.dispatch): openers from humans and bots
function onSpeech(speaker, text) {
    deps();
    if (!speaker || !text) return;
    const bots = nearbyBots(speaker, HEAR_RANGE);
    if (!bots.length) return;

    // a bot's ambient mutter is read only if someone will answer it (the responder roll runs first).
    if (!isHuman(speaker) && !/\?|\b(hi|hello|hey|yo|how|what|where|who|why|when|anyone|any1|do you|are you|want|fancy|let's|lets|wanna|shall|help|follow|come|wait)\b/i.test(text)) {
        const sorted = bots.slice().sort((a, b) => dist(a, speaker) - dist(b, speaker));
        let target = null;
        for (const cand of sorted) {
            if (cand._heardCd > 0) { cand._heardCd -= 1; continue; }
            const p = personality.of(cand);
            if (Math.random() < 0.3 + p.sociability * 0.5) { target = cand; break; }
            cand._heardCd = 10 + rnd(20);
        }
        if (!target) return;
        respond(target, speaker, reading(String(text), speaker, bots), { delay: 2 + rnd(3), opener: true });
        return;
    }

    const u = reading(String(text), speaker, bots);

    if (isHuman(speaker)) {
        const responders = whoAnswers(speaker, u, bots);
        for (let i = 0; i < responders.length; i++) {
            respond(responders[i], speaker, u, { delay: 1 + i * 2 + rnd(2), named: !!(u.addressee && u.addressee.name === responders[i].username) });
        }
        for (const b of bots) if (responders.indexOf(b) === -1) remember(b, speaker.username, { met: true });
        return;
    }

    // a bot's opener: the named bot answers, else the nearest willing one.
    let target = null;
    if (u.addressee && u.addressee.name) target = bots.find((b) => b.username === u.addressee.name) || null;
    if (!target) {
        const sorted = bots.slice().sort((a, b) => dist(a, speaker) - dist(b, speaker));
        const wantsAnswer = u.isQuestion || /^(greet|howAreYou|whatDoing|propose|invite|help|askAbout|askOpinion)$/.test(u.primary.type);
        for (const cand of sorted) {
            if (wantsAnswer) {
                if (Math.random() < 0.9) { target = cand; break; }
                continue;
            }
            if (cand._heardCd > 0) { cand._heardCd -= 1; continue; }
            const p = personality.of(cand);
            if (Math.random() < 0.3 + p.sociability * 0.5) { target = cand; break; }
            cand._heardCd = 10 + rnd(20);
        }
    }
    if (target) respond(target, speaker, u, { delay: 2 + rnd(3), opener: true });
}

// a queued reply landed on a bot partner: it may carry the thread on (budgeted).
function onReplyDelivered(partner, bot, text) {
    deps();
    const t = getThread(partner, bot.username, true);
    const u = reading(String(text), bot, [partner]);
    if (u.primary.type === 'farewell') { closeThread(partner, bot.username); return; }
    if (t.turns >= t.budget) { closeThread(partner, bot.username); closeThread(bot, partner.username); return; }
    // wind the thread down after two rounds of pure pleasantries.
    if (SMALLTALK_TYPES.has(u.primary.type) && !u.isQuestion) {
        t.smalltalk = (t.smalltalk || 0) + 1;
    } else {
        t.smalltalk = 0;
    }
    if (t.smalltalk >= 2) { closeThread(partner, bot.username); closeThread(bot, partner.username); return; }
    // continue chance decays with thread length, faster for smalltalk.
    let p = 0.85 * (1 - t.turns / (t.budget + 1));
    if (t.smalltalk >= 1) p *= 0.5;
    if (Math.random() < p) respond(partner, bot, u, { delay: 2 + rnd(3), reply: true });
}

// party chat: trusted; the nearest couple of bot members answer, others just listen
function onPartyChat(partyObj, fromUsername, text) {
    deps();
    if (!partyObj || !partyObj.members || !text) return;
    const from = partyObj.members.find((m) => m && m.username === fromUsername) || { username: fromUsername, x: 0, y: 0 };
    const fromLeader = partyObj.leader === fromUsername;
    const members = partyObj.members.filter((m) => m && m.isBot && m.username !== fromUsername);
    if (!members.length) return;
    const u = reading(String(text), from, members);
    members.sort((a, b) => dist(a, from) - dist(b, from));
    members.forEach((m, i) => {
        const chorus = i < 2 || Math.random() < 0.25 || (u.addressee && u.addressee.name === m.username);
        respond(m, from, u, { party: partyObj, fromLeader, delay: 1 + i * 2 + rnd(2), listenOnly: !chorus });
    });
}

// global chat: the bot who knows the speaker (or the one named) answers on the channel.
function onGlobalChat(from, text, via) {
    deps();
    if (!from || !text || !from.world) return;
    const bots = [];
    for (const p of from.world.players.getAll()) {
        if (p && p.isBot && p !== from && !p.opponent) bots.push(p);
    }
    if (!bots.length) return;
    const u = reading(String(text), from, bots);
    const answering = whoAnswers(from, u, bots).slice(0, u.addressee === 'all' ? 2 : 1);
    answering.forEach((b, i) => {
        respond(b, from, u, { global: true, via, delay: 2 + i * 3 + rnd(3) });
    });
}

// which bots answer a human's line
function whoAnswers(speaker, u, bots) {
    if (u.addressee && u.addressee.name) {
        const named = bots.find((b) => b.username === u.addressee.name);
        if (named) return [named];
    }
    const active = bots.filter((b) => getThread(b, speaker.username, false));
    if (active.length && u.addressee !== 'all') {
        active.sort((a, b) => dist(a, speaker) - dist(b, speaker));
        return [active[0]];
    }
    // the bot who knows you (remembers what you told it, or has met you) answers ahead of a closer stranger.
    const familiarity = (b) => {
        const rec = people(b) && people(b)[speaker.username];
        if (!rec) return 0;
        return (recallTold(b, speaker.username, 9000) ? 4 : 0) + (rec.met > 1 ? 1 : 0);
    };
    const sorted = bots.slice().sort((a, b) => {
        const d = (dist(a, speaker) - familiarity(a)) - (dist(b, speaker) - familiarity(b));
        if (d) return d;
        return personality.of(b).sociability - personality.of(a).sociability;
    });
    if (u.addressee === 'all') return sorted.slice(0, 3);
    const out = [sorted[0]];
    if (sorted[1] && Math.random() < personality.of(sorted[1]).sociability * 0.5) out.push(sorted[1]);
    return out;
}

// responding
function respond(bot, speaker, u, opts) {
    bot._addressing = speaker || null;
    // a line on a channel (global chat) is answered on that channel.
    bot._replyVia = (opts && opts.via) || null;
    try { noteTold(bot, speaker, u); } catch (e) {  }
    try { return respondInner(bot, speaker, u, opts); } finally { bot._addressing = null; bot._replyVia = null; }
}
function respondInner(bot, speaker, u, opts) {
    deps();
    opts = opts || {};
    if (!bot || !speaker || bot === speaker || (bot.username && bot.username === speaker.username)) return;

    // the handshakes/reactions hearing.js owns come first (they speak for themselves)
    if (hearing.preHeard(bot, speaker, u.text, opts)) return;

    const t = getThread(bot, speaker.username, true);
    t.lastTick = nowTick(bot);
    t.turns += 1;
    t.history.push({ who: speaker.username, act: u.primary.type, text: u.norm });
    if (t.history.length > 4) t.history.shift();
    const level = speaker.getCombatLevel ? speaker.getCombatLevel() : (speaker.combatLevel || 0);
    const mem = remember(bot, speaker.username, { met: t.turns === 1, level, topic: u.primary.type });

    if (isHuman(speaker) && !bot.opponent && !bot.locked) {
        bot._holdTicks = Math.max(bot._holdTicks || 0, 14 + rnd(14));
        try { bot.faceDirection(speaker.x - bot.x, speaker.y - bot.y); } catch (e) {  }
    }

    if (opts.listenOnly) return;

    // 1. an answer to something this bot asked / offered
    if (t.expecting && resolveExpectation(bot, speaker, u, t, opts)) return;

    // 2. commands, missions, help/party, trade, offers: hearing.js does the doing
    const acted = hearing.handleAct(bot, speaker, u.primary, u, opts);
    if (acted && acted.handled) {
        if (acted.line) queueSay(bot, acted.line, opts.delay || 1, speaker, opts.via);
        social.noteInteraction(bot, speaker.username, acted.delta || 0.1);
        return;
    }

    // 3. a conversational reply
    const plan = planReply(bot, speaker, u, t, mem, opts);
    if (plan && plan.line) {
        queueSay(bot, plan.line, opts.delay || 1, speaker, opts.via);
        if (plan.expecting) t.expecting = plan.expecting;
        if (plan.close) closeThread(bot, speaker.username);
    }
    const delta = deltaFor(u);
    if (delta) try { social.noteInteraction(bot, speaker.username, delta); } catch (e) {  }
}

function deltaFor(u) {
    switch (u.primary.type) {
        case 'greet': return 0.3;
        case 'thanks': return 0.5;
        case 'compliment': return 0.6;
        case 'insult': return -1.5;
        case 'celebrate': return 0.3;
        case 'apology': return 0.2;
        default: return u.sentiment > 0 ? 0.2 : 0.1;
    }
}

// expectations
// a line that isn't an answer leaves the question standing.
function resolveExpectation(bot, speaker, u, t, opts) {
    const ex = t.expecting;
    const resolved = resolveExpectationInner(bot, speaker, u, t, opts);
    if (!resolved && t.expecting === null) t.expecting = ex;
    return resolved;
}
function resolveExpectationInner(bot, speaker, u, t, opts) {
    const ex = t.expecting;
    t.expecting = null;
    const name = nameOf(speaker);
    if (ex.kind === 'yesno') {
        if (u.primary.type !== 'affirm' && u.primary.type !== 'deny' && u.primary.type !== 'statement' && u.primary.type !== 'acknowledge' && u.primary.type !== 'wellbeing' && !u.yesno) return false;
        if (u.yesno === 'yes' || u.primary.type === 'affirm') {
            let line = null;
            try {
                if (ex.action === 'tagalong' || ex.action === 'follow') {
                    bot._follow = { username: speaker.username, ticks: 300 + rnd(300) };
                    bot._holdTicks = 0;
                    line = one(["right behind you, {n}.", "lead on then, {n}!", "let's go, {n}."]);
                } else if (ex.action === 'party') {
                    party.invite(bot, speaker.username);
                    line = one(["sent you an invite, {n}.", "invite's on its way, {n}.", "grand - invite sent, {n}."]);
                } else if (ex.action === 'trade') {
                    if (bot.trade && typeof bot.trade.request === 'function') bot.trade.request(speaker);
                    line = one(["opening a trade with you now, {n}.", "here - trade coming up, {n}."]);
                } else if (ex.action === 'mission' && ex.spec) {
                    hearing.adoptMission(bot, ex.spec);
                    line = one(["that's settled then, {n}.", "good - let's get to it, {n}."]);
                } else if (ex.action === 'gift') {
                    try { require('./mentoring').giveOfferedGift(bot, speaker); } catch (e) {  }
                    line = one(["all yours, {n}.", "there you go, {n}."]);
                } else {
                    line = one(["glad to hear it, {n}.", "good stuff.", "that's the spirit."]);
                }
            } catch (e) { line = "ah - never mind, {n}."; }
            queueSay(bot, voiced(bot, line.replace('{n}', name)), opts.delay || 1, speaker);
            return true;
        }
        if (u.yesno === 'no' || u.primary.type === 'deny') {
            const line = one(["fair enough, {n}.", "no worries, {n}.", "another time, then.", "suit yourself, {n}.", "alright - maybe later."]);
            queueSay(bot, voiced(bot, line.replace('{n}', name)), opts.delay || 1, speaker);
            return true;
        }
        return false; // not an answer, read it fresh
    }
    if (ex.kind === 'free') {
        // an open question; only an answer resolves it, a new question/proposal/command is a new topic.
        const ANSWER_LIKE = { statement: 1, wellbeing: 1, affirm: 1, deny: 1, acknowledge: 1, laugh: 1, thanks: 1, celebrate: 1, status: 1 };
        if (!ANSWER_LIKE[u.primary.type]) return false;
        let line = null;
        const skill = u.entities.skills[0];
        const place = u.placeHit ? u.placeHit.kw : null;
        if (ex.about === 'howareyou' || u.primary.type === 'wellbeing') {
            line = u.sentiment < 0
                ? one(["sorry to hear that, {n}.", "rough, that. hang in there, {n}.", "ah, it'll pass. want some company?"])
                : u.sentiment > 0 ? one(["good to hear, {n}!", "ha, glad someone's thriving.", "that's what i like to hear."])
                    : one(["fair enough.", "same old, then.", "can't ask for more than that."]);
            if (/want some company/.test(line)) { queueSay(bot, voiced(bot, line.replace('{n}', name)), opts.delay || 1, speaker); t.expecting = { kind: 'yesno', action: 'tagalong' }; return true; }
        } else if (ex.about === 'told' && (u.yesno || u.primary.type === 'affirm' || u.primary.type === 'deny') && !skill) {
            line = (u.yesno === 'no' || u.primary.type === 'deny')
                ? one(["ah well. it'll come, {n}.", "no rush, {n}.", "give it time, {n}."])
                : one(["good stuff - keep at it, {n}.", "knew you would, {n}.", "nice one, {n}."]);
        } else if (skill) {
            line = skillRemark(bot, skill, name);
            queueSay(bot, voiced(bot, line), opts.delay || 1, speaker);
            if (personality.of(bot).sociability > 0.45 && Math.random() < 0.5 && !bot.opponent) {
                queueSay(bot, voiced(bot, one(["mind if i tag along?", "room for one more?", "want a hand with that?"])), (opts.delay || 1) + 2, speaker);
                t.expecting = { kind: 'yesno', action: 'tagalong' };
            }
            return true;
        } else if (place) {
            line = one(["the " + place + "? watch yourself out that way.", "ah, the " + place + ". not a bad shout.", "the " + place + " - i know it well."]);
        } else if (u.primary.type === 'statement' || u.primary.type === 'affirm' || u.primary.type === 'deny') {
            line = u.sentiment < 0
                ? one(["that's a shame.", "sorry to hear it, {n}.", "hm. that's rough."])
                : one(["fair enough, {n}.", "ah, nice.", "sounds about right.", "good to know."]);
            if (ex.about === 'news') {
                const mine = newsLine(bot, 3000);
                if (mine && Math.random() < 0.5) line = join(line, one(["i had one of those days too - ", "me, ", "funny you say that. "]) + mine);
            }
        }
        if (line) { queueSay(bot, voiced(bot, line.replace('{n}', name)), opts.delay || 1, speaker); return true; }
        return false;
    }
    return false;
}

// answer "what faction are you?" / "what faction am i?" from the bot's allegiance and its read of the asker.
function factionAnswer(bot, speaker, text, name) {
    const m = String(text || '');
    if (!(/\b(faction|clan|allegiance|banner)\b|who.*(run|roll) with|whose side/i.test(m))) return null;
    try {
        const factions = require('./factions');
        if (/\b(am i|i belong|my (faction|clan|side)|where do i|which.*i\b|aligned|do i)\b/i.test(m)) {
            const align = factions.alignmentOf(speaker.username);
            return { text: align ? "you? you run with " + align + ", near as i can tell." : "you're not tied to any clan that i've seen," + name + "." };
        }
        const mine = factions.factionOf(bot);
        if (!mine) return { text: "i run alone - no clan for me." };
        const sz = factions.sizeOf(mine.name);
        return { text: "i'm " + (mine.role === 'founder' ? "the one who raised " : "with ") + mine.name + (sz > 1 ? " - " + sz + " of us now." : ".") };
    } catch (e) { return null; }
}

// perception
function weaponName(c) {
    try {
        const slots = c.inventory && c.inventory.equipmentSlots;
        const wi = slots && slots['right-hand'];
        if (typeof wi === 'number' && wi >= 0 && c.inventory.items[wi]) {
            const def = knowledge.itemDefs[c.inventory.items[wi].id];
            return def ? def.name.toLowerCase() : null;
        }
    } catch (e) {  }
    return null;
}
function armourName(c) {
    try {
        const slots = c.inventory && c.inventory.equipmentSlots;
        const bi = slots && slots.body;
        if (typeof bi === 'number' && bi >= 0 && c.inventory.items[bi]) {
            const def = knowledge.itemDefs[c.inventory.items[bi].id];
            return def ? def.name.toLowerCase() : null;
        }
    } catch (e) {  }
    return null;
}
// something the bot can see about its partner, as a remark (or null).
function notice(bot, partner, mem) {
    const out = [];
    const myCl = bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 3);
    const cl = partner.getCombatLevel ? partner.getCombatLevel() : (partner.combatLevel || 0);
    if (mem && mem.lastLevel && cl >= mem.lastLevel + 3 && mem.met > 1) out.push({ w: 3, text: "you've come on since we last spoke - level " + cl + " now?" });
    const w = weaponName(partner);
    if (w && Math.random() < 0.6) out.push({ w: 2, text: one(["nice " + w + ".", "that " + w + " looks the part.", "where'd you get the " + w + "?"]) });
    const a = armourName(partner);
    if (a && Math.random() < 0.4) out.push({ w: 1, text: "smart bit of " + a + ", that." });
    if (cl && cl >= myCl + 15) out.push({ w: 2, text: one(["you're well above my weight - level " + cl + "?", "level " + cl + "! remind me not to cross you."]) });
    else if (cl && cl <= myCl - 15 && cl > 0) out.push({ w: 1, text: one(["still finding your feet? stick to cows for a bit.", "new around here? shout if you need a hand."]) });
    if (partner.opponent) out.push({ w: 3, text: "careful - you've got company." });
    else if (partner.gatheringSkill) out.push({ w: 2, text: one(["hard at it, i see.", "still grafting away?"]) });
    else if (partner.walkQueue && partner.walkQueue.length) out.push({ w: 1, text: "off somewhere?" });
    try {
        const hits = partner.skills && partner.skills.hits;
        if (hits && hits.current < hits.base * 0.4) out.push({ w: 4, text: "you look hurt - got any food on you?" });
    } catch (e) {  }
    try {
        const region = knowledge.regionOf(partner.x, partner.y);
        if (region && Math.random() < 0.3) out.push({ w: 1, text: "what brings you to " + region + "?" });
    } catch (e) {  }
    if (!out.length) return null;
    let total = 0; for (const o of out) total += o.w;
    let r = Math.random() * total;
    for (const o of out) { r -= o.w; if (r <= 0) return o; }
    return out[0];
}

// composition
// fragments are composed clean; the bot's voice is applied once, in finalize.
function voiced(bot, text) {
    return text;
}
function gen(bot, situation, ctx) {
    try { return chatgen.generate(situation, ctx || {}, bot, { noVoice: true }); } catch (e) { return null; }
}
function tidyCase(text) {
    let out = String(text).replace(/\s+/g, ' ').trim();
    out = out.replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'");
    out = out.replace(/([.!?]\s+)([a-z])/g, (m, pfx, c) => pfx + c.toUpperCase());
    if (out.length) out = out[0].toUpperCase() + out.slice(1);
    return out;
}
function finalize(bot, text, noCap) {
    if (!text) return text;
    let out = tidyCase(text);
    try { out = voice.apply(bot, out); } catch (e) {  }
    return noCap ? out : cap(out);
}
function join(a, b) {
    if (!a) return b; if (!b) return a;
    const s = a.trim();
    return (/[.!?]$/.test(s) ? s : s + '.') + ' ' + b.trim();
}

function moodLine(bot) {
    const m = mood.of(bot);
    const act = hearing.activityLine(bot, true);
    let core;
    if (m.valence > 0.62 && m.energy > 0.45) core = one(["can't complain - {act}.", "great, actually. {act}.", "brilliant! {act}.", "never better. {act}."]);
    else if (m.valence < 0.38) core = one(["been better, honestly.", "bit fed up today.", "rough one, but i'll live.", "not my best day."]);
    else if (m.energy < 0.35) core = one(["knackered, but fine.", "tired — been at it all day.", "could use a sit down, otherwise fine."]);
    else core = one(["not bad. {act}.", "alright, you know — {act}.", "getting by. {act}.", "fine, ta. {act}."]);
    let line = core.replace('{act}', act || 'keeping busy');
    // the reason behind the mood, when something real is behind it
    if (episodes && Math.random() < 0.6) {
        const sign = m.valence < 0.42 ? -1 : m.valence > 0.6 ? 1 : 0;
        const why = sign ? episodes.moodReason(bot, sign) : null;
        if (why) line = join(line, why);
    }
    return line;
}

// something that really happened to the bot lately, as a line, or null
function newsLine(bot, sinceTicks) {
    if (!episodes) return null;
    const eps = episodes.recent(bot, 3, sinceTicks || 4000);
    if (!eps.length) return null;
    const e = eps[0];
    const d = episodes.describe(bot, e);
    if (!d) return null;
    return eps.length > 1 && Math.random() < 0.35 && episodes.describe(bot, eps[1]) ? join(d, episodes.describe(bot, eps[1])) : d;
}

const SKILL_TASTE = {
    fishing: ['fishing', 'diligence', "peaceful, that — and it feeds you"], mining: ['mining', 'diligence', "good coin in ore if you stick at it"],
    woodcutting: ['chopping', 'diligence', "honest work, and the logs sell"], smithing: ['smithing', 'greed', "the anvil pays if you've the ore"],
    cooking: ['cooking', 'diligence', "burn less as you go"], crafting: ['crafting', 'greed', "fiddly but it pays"],
    magic: ['magic', 'curiosity', "runes cost, but the power's worth it"], ranged: ['ranged', 'curiosity', "keep your distance and they never touch you"],
    prayer: ['prayer', 'diligence', "bones go a long way"], thieving: ['thieving', 'greed', "risky, but quick coin"],
    combat: ['fighting', 'aggression', "nothing beats a good scrap"], attack: ['fighting', 'aggression', "nothing beats a good scrap"],
    strength: ['strength training', 'aggression', "hit harder, worry less"], defence: ['defence', 'diligence', "boring, but you live longer"],
    fletching: ['fletching', 'diligence', "arrows sell if you make enough"], firemaking: ['firemaking', 'curiosity', "not much money in it, mind"],
    agility: ['agility', 'curiosity', "handy for getting about"], herblaw: ['herblaw', 'curiosity', "potions win fights"], runecraft: ['runecraft', 'curiosity', "runes are money"],
    hits: ['staying alive', 'diligence', "eat before you need to"]
};
function skillRemark(bot, skill, name) {
    const p = personality.of(bot);
    const tag = SKILL_TASTE[skill];
    if (!tag) return one(["fair enough.", "each to their own."]);
    const like = (p[tag[1]] || 0.5) > 0.5;
    return like
        ? one(["ah, " + tag[0] + " — " + tag[2] + ".", tag[0] + "? good choice. " + tag[2] + ".", "i love a bit of " + tag[0] + "."])
        : one([tag[0] + "'s not really my thing, but " + tag[2] + ".", "rather you than me with " + tag[0] + ".", tag[0] + ", eh? i can't sit still for it."]);
}
function opinionLine(bot, u) {
    const p = personality.of(bot);
    if (u.entities.skills.length) return skillRemark(bot, u.entities.skills[0]);
    if (u.entities.npcs.length) {
        const n = u.entities.npcs[0];
        const def = knowledge.npcDefs[n.id];
        const cl = def ? Math.floor(((def.attack || 1) + (def.defense || 1) + (def.strength || 1) + (def.hits || 1)) / 4) : 0;
        const mine = bot.getCombatLevel ? bot.getCombatLevel() : 3;
        if (cl > mine + 10) return one([n.name + "? not something i'd pick a fight with yet.", "a " + n.name + " would flatten me, honestly.", "give " + n.name + "s a wide berth unless you're strong."]);
        if (cl < Math.max(3, mine - 15)) return one([n.name + "s? easy pickings.", "a " + n.name + " is fine for a laugh.", n.name + "s don't put up much of a fight."]);
        return one(["a " + n.name + " is a fair fight for someone like me.", n.name + "s? decent scrap, decent drops."]);
    }
    if (u.entities.items.length) {
        const it = u.entities.items[0];
        const def = knowledge.itemDefs[it.id];
        const worth = def && def.price ? def.price : 0;
        if (worth > 1000) return one(["a " + it.name + "? worth a pretty penny, that.", "nice piece, the " + it.name + ".", "i'd keep a " + it.name + " safe in the bank."]);
        return one(["a " + it.name + "? does the job.", "can't go wrong with a " + it.name + " early on.", "meh - a " + it.name + " is fine until you find better."]);
    }
    if (u.placeHit) return one(["the " + u.placeHit.kw + "? decent spot.", "i like the " + u.placeHit.kw + " well enough.", "the " + u.placeHit.kw + " gets busy, mind."]);
    if (u.boss) return one([u.boss.name + "? one day, maybe.", "i'd want a few more levels before " + u.boss.name + "."]);
    return p.curiosity > 0.5 ? one(["i'm all for it.", "sounds good to me.", "could be worth a look."]) : one(["not sure, honestly.", "i've no strong feelings on it.", "depends on the day."]);
}

function homeLine(bot) {
    let region = null;
    try { region = knowledge.regionOf(bot.x, bot.y); } catch (e) { region = null; }
    return region ? one(["these parts — " + region + ", mostly.", "i've knocked about " + region + " for as long as i remember.", "around " + region + ". never strayed far."])
        : one(["here and there.", "all over, really.", "nowhere in particular."]);
}
function selfLine(bot) {
    const who = nameOf(bot);
    let title = null;
    try { title = require('./titles').titleOf(bot); } catch (e) { title = null; }
    return title ? "i'm " + who + ", " + title + "." : "i'm " + who + ". and you?";
}

// the reply plan for a conversational act -> { line, expecting, close }.
function planReply(bot, speaker, u, t, mem, opts) {
    const name = nameOf(speaker);
    const p = personality.of(bot);
    const rel = social.sentiment(bot, speaker.username);
    const human = isHuman(speaker);
    const type = u.primary.type;
    let line = null, expecting = null, close = false, tail = null;

    // a second act in the same line ("hi, ...", "..., thanks") gets a few words
    const secondary = u.acts.length > 1 ? u.acts.find((a) => a !== u.primary && a.type !== 'statement') : null;

    // a newbie -> welcome them, a starter tip, and a fork (what to train / making coin / ask anything).
    const saidFull = ((u.norm || '') + ' ' + String(u.text || '')).toLowerCase();
    if (/\b(new here|i'?m new|im new|just started|starting out|(learning|learn) (the game|to play|how to play)|new to (the game|this|rsc|runescape)|beginner|newbie|how do i play|just began)\b/.test(saidFull)) {
        let tip = null;
        try { tip = knowledge.answer(bot, 'what should i do next'); } catch (e) {  }
        const lead = one([
            "welcome, {n}! everyone starts somewhere.",
            "ah, a fresh face - welcome, {n}!",
            "new here? you'll get the hang of it, {n}."
        ]).replace('{n}', name);
        const forks = one([
            "what do you fancy training first?",
            "want a tip for making some starting coin?",
            "ask me anything - where to fish, mine, that sort of thing."
        ]);
        line = join(voiced(bot, lead + (tip && tip.text ? ' ' + tip.text : '')), voiced(bot, forks));
        return { line, expecting: { kind: 'free', about: 'newbie' }, close: false };
    }

    // good luck / have fun / take care -> reciprocate and close
    if (/\b(good luck|gl hf|gl\b|have fun|enjoy yourself|take care|safe travels|happy hunting)\b/.test(saidFull)) {
        return { line: voiced(bot, one(["you too, {n}!", "cheers, {n} -- you too!", "thanks, same to you, {n}!"]).replace('{n}', name)), close: true };
    }

    // add me / be my friend -> a warm yes
    if (/\b(add me|be my friend|be friends|can we be friends|add you back|friend request)\b/.test(saidFull)) {
        try { social.noteInteraction(bot, speaker.username, 1); } catch (e) {  }
        return { line: voiced(bot, one(["sure, {n} -- good to know you!", "aye, consider us mates, {n}!", "of course, {n}. see you around!"]).replace('{n}', name)) };
    }

    // "can i join your clan?" -> welcome them if in one, else say so honestly.
    if (/\b(join (your |the )?clan|can i join|let me join|invite me)\b/.test(saidFull) && /clan/.test(saidFull)) {
        let mine = null;
        try { mine = require('../clan').getClan(bot); } catch (e) {  }
        if (mine) {
            return { line: voiced(bot, "we're " + mine.name + " -- ::joinclan " + mine.name + " and i'll wave you in.") };
        }
        return { line: voiced(bot, one(["i'm not in a clan myself, sorry.", "no clan for me right now.", "you'd have to find a clan with a spot -- try the Find list."])) };
    }

    // "seen <name>?" -> point them out if nearby; "seen anyone?" gets a vibe.
    if (/\b(seen|spotted)\b/.test(saidFull)) {
        let near = null;
        try {
            for (const o of bot.getNearbyEntities('players', HEAR_RANGE)) {
                if (o && o !== bot && o.username && saidFull.includes(o.username.toLowerCase())) { near = o; break; }
            }
        } catch (e) {  }
        if (near) {
            return { line: voiced(bot, one([near.username + "? right over there.", "aye, " + near.username + "'s about -- just here.", near.username + "'s nearby, yeah."])) };
        }
        if (/\b(seen|spotted) (anyone|anybody|any1|people|players|folk)\b/.test(saidFull)) {
            return { line: voiced(bot, one(["a few folk about, yeah.", "aye, it's not quiet round here.", "some, here and there."])) };
        }
    }

    switch (type) {
        case 'greet': {
            const repeat = t.history.length >= 2 && t.history[t.history.length - 2].act === 'greet';
            const toldBack = human && !repeat ? recallTold(bot, speaker.username, 9000) : null;
            if (repeat) line = gen(bot, 'reactRepeatGreet', { name });
            else if (toldBack && nowTick(bot) - toldBack.tick > 60 && Math.random() < 0.75) {
                line = voiced(bot, join(one(["{n}!", "back again, {n}?", "oh, it's you, {n}."]).replace('{n}', name), toldQuestion(bot, toldBack, name, false)));
                expecting = { kind: 'free', about: 'told' };
            }
            else if (mem && mem.met > 1 && nowTick(bot) - (mem.lastSeen || 0) > 300 && Math.random() < 0.5) line = voiced(bot, one(["back again, {n}?", "{n}! good to see you again.", "oh, it's you, {n}. how've you been?"]).replace('{n}', name));
            else line = gen(bot, rel >= 3 ? 'greetFriend' : 'reactGreetBack', { name });
            if (/how've you been/.test(line || '')) expecting = { kind: 'free', about: 'howareyou' };
            else if (!expecting && human && Math.random() < 0.25 + p.sociability * 0.4) {
                const n = notice(bot, speaker, mem);
                if (n) { tail = voiced(bot, n.text); if (/\?$/.test(n.text)) expecting = { kind: 'free', about: 'notice' }; }
                else if (Math.random() < 0.5) { tail = voiced(bot, one(["what brings you out here?", "what are you up to today?", "off somewhere?"])); expecting = { kind: 'free', about: 'activity' }; }
            }
            break;
        }
        case 'howAreYou':
            line = voiced(bot, moodLine(bot));
            if (Math.random() < 0.9) { tail = voiced(bot, one(["you?", "and yourself?", "how about you?"])); expecting = { kind: 'free', about: 'howareyou' }; }
            break;
        case 'story': {
            // a story on request: a real episode first, else the bot's stock anecdotes
            const real = episodes ? episodes.storyTopic(bot) : null;
            const topic = real || require('./conversation').storyTopic(bot);
            line = gen(bot, 'tellStory', { name, topic });
            if (real && episodes && Math.random() < 0.7) {
                // and the actual event behind it
                const ep = episodes.recent(bot, 6).find((e) => ['death', 'boss', 'quest', 'find', 'felled'].indexOf(e.kind) !== -1);
                if (ep) line = join(line, voiced(bot, episodes.describe(bot, ep)));
            }
            break;
        }
        case 'whatsNew': {
            const news = newsLine(bot);
            if (news) line = voiced(bot, Math.random() < 0.5 ? news : one(["well - ", "let me think. ", "since you ask: ", "oh, "]) + news);
            else line = voiced(bot, one(["not much, honestly - {act}.", "same old. {act}.", "nothing to report. {act}."]).replace('{act}', hearing.activityLine(bot, true)));
            if (human && Math.random() < 0.7) { tail = voiced(bot, one(["you?", "what about you?", "anything on your end?"])); expecting = { kind: 'free', about: 'news' }; }
            break;
        }
        case 'wellbeing':
            line = voiced(bot, u.sentiment < 0
                ? one(["sorry to hear that, {n}.", "rough, that. hang in there, {n}.", "ah, it'll pass, {n}."])
                : u.sentiment > 0 ? one(["good to hear, {n}!", "ha, glad someone's thriving.", "that's what i like to hear."])
                    : one(["fair enough.", "same old, then.", "can't ask for more than that."])).replace('{n}', name);
            if (/and you|you\?|yourself|hbu/.test(u.norm)) line = join(line, voiced(bot, moodLine(bot)));
            break;
        case 'whatDoing': {
            line = voiced(bot, hearing.activityLine(bot, false));
            // context from something that just happened ("just hit 40 mining, back at it now")
            const fresh = newsLine(bot, 700);
            if (fresh && Math.random() < 0.35) line = join(voiced(bot, fresh), line);
            if (Math.random() < 0.4) {
                const told = human ? recallTold(bot, speaker.username, 3000) : null;
                if (told && nowTick(bot) - told.tick > 30 && Math.random() < 0.7) { tail = voiced(bot, toldQuestion(bot, told, name)); expecting = { kind: 'free', about: 'told' }; }
                else { tail = voiced(bot, one(["what about you?", "and you?", "you?"])); expecting = { kind: 'free', about: 'activity' }; }
            }
            break;
        }
        case 'whoAreYou':
            line = voiced(bot, selfLine(bot));
            break;
        case 'askLevel': {
            const cl = bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 3);
            const theirs = speaker.getCombatLevel ? speaker.getCombatLevel() : 0;
            line = voiced(bot, "i'm combat level " + cl + "." + (theirs ? (theirs > cl + 10 ? " you've a fair few on me." : theirs < cl - 10 ? " you'll catch up." : " about your level, then.") : ""));
            break;
        }
        case 'askGear':
            line = voiced(bot, hearing.gearLine(bot));
            break;
        case 'askLocationOf': {
            let known = null;
            try { known = knowledge.answer(bot, u.norm || u.text); } catch (e) { known = null; }
            if (known) line = voiced(bot, known.text);
            else if (u.placeHit) {
                const place = hearing.placeFor(bot, u.placeHit);
                if (place) {
                    const dir = hearing.direction(bot, place.x, place.y);
                    line = voiced(bot, dir === 'right here' ? "the " + place.label + "? you're basically on it." : "head " + dir + " for the " + place.label + ".");
                }
            }
            if (!line) line = voiced(bot, one(["not sure where that is, sorry.", "couldn't tell you, {n} - ask around Lumbridge.", "no idea, honestly."]).replace('{n}', name));
            break;
        }
        case 'askHowTo':
        case 'askWhatIs':
        case 'question': {
            let known = null;
            try { known = factionAnswer(bot, speaker, u.norm || u.text, name) || knowledge.answer(bot, u.norm || u.text); } catch (e) { known = null; }
            if (known) {
                const m = mood.of(bot);
                const lead = m.valence > 0.3 && m.energy > 0.15 ? one(['sure - ', 'easy one - ', 'oh, ', '']) : '';
                line = voiced(bot, lead + known.text);
                try { require('./reputation').note(bot, 'help', 1); } catch (e) {  }
            } else if (u.entities.npcs.length || u.entities.items.length || u.entities.skills.length) {
                line = voiced(bot, opinionLine(bot, u));
            } else if (/\byou\b/.test(u.norm) && /\b(like|enjoy|prefer|want|think|reckon)\b/.test(u.norm)) {
                line = voiced(bot, opinionLine(bot, u));
            } else {
                line = gen(bot, 'reactQuestion', { name });
                if (human && p.curiosity > 0.4 && Math.random() < 0.5) { tail = voiced(bot, one(["what are you after, exactly?", "what do you mean?", "go on?"])); expecting = { kind: 'free', about: 'clarify' }; }
            }
            break;
        }
        case 'askOpinion':
            line = voiced(bot, opinionLine(bot, u));
            if (human && Math.random() < 0.4) { tail = voiced(bot, one(["you?", "what do you reckon?", "your take?"])); expecting = { kind: 'free', about: 'opinion' }; }
            break;
        case 'askAbout': {
            const c = u.primary.clause;
            if (/\b(bot|robot|real|human|npc)\b/.test(c)) line = gen(bot, 'reactBotAccusation', { name });
            else if (/\bfrom\b|\blive\b/.test(c)) line = voiced(bot, homeLine(bot));
            else if (/what do you do|into\b|story|dream|goal|thing\b/.test(c)) {
                let d = null;
                try { d = dreams && dreams.describe(bot); } catch (e) { d = null; }
                line = voiced(bot, d || hearing.activityLine(bot, false));
            } else if (/favourite|favorite|prefer/.test(c)) {
                const best = Object.keys(SKILL_TASTE).filter((k) => k !== 'hits' && k !== 'attack').sort((a, b) => (p[SKILL_TASTE[b][1]] || 0) - (p[SKILL_TASTE[a][1]] || 0))[0];
                line = voiced(bot, one(["i'd say " + SKILL_TASTE[best][0] + " - " + SKILL_TASTE[best][2] + ".", SKILL_TASTE[best][0] + ", every time."]));
            } else if (/have you (done|finished|completed|beaten)/.test(c) && u.quest) {
                let done = false;
                try { done = questing && questing.isComplete(bot, u.quest.key); } catch (e) { done = false; }
                line = voiced(bot, done ? one([u.quest.name + "? finished it a while back.", "yes - " + u.quest.name + "'s done and dusted."]) : one(["not yet - " + u.quest.name + " is on my list.", u.quest.name + "? haven't got round to it."]));
            } else if (/(have|did) you (ever|once|seen|killed|fought|fight|beaten|beat|kill|meet|met)/.test(c) && u.entities.npcs.length) {
                const n = u.entities.npcs[0];
                let remembered = null;
                if (episodes) {
                    for (const e of episodes.recent(bot, 12)) {
                        if ((e.kind === 'kill' || e.kind === 'boss') && e.foe && e.foe.toLowerCase() === n.name.toLowerCase()) { remembered = "a " + n.name + "? " + episodes.describe(bot, e); break; }
                        if (e.kind === 'death' && e.killer && e.killer.toLowerCase() === n.name.toLowerCase()) { remembered = "one nearly had me, actually - " + episodes.describe(bot, e); break; }
                    }
                }
                line = voiced(bot, remembered || one(["a " + n.name + "? a few times.", "can't say i've crossed a " + n.name + " yet.", n.name + "s - more than i'd like."]));
            } else if (/been here long|here often|new\b/.test(c)) {
                line = voiced(bot, mem && mem.met > 2 ? "long enough to know your face, {n}.".replace('{n}', name) : one(["long enough.", "a while now.", "feels like forever some days."]));
            } else {
                const real = episodes && Math.random() < 0.6 ? episodes.storyTopic(bot) : null;
                line = gen(bot, 'tellStory', { name, topic: real || require('./conversation').storyTopic(bot) });
            }
            break;
        }
        case 'offer':
            if (u.entities.items.length) line = voiced(bot, one(["a " + u.entities.items[0].name + "? go on then - trade me.", "you're a gem, {n}. send me a trade.", "wouldn't say no. trade me, {n}."]).replace('{n}', name));
            else line = voiced(bot, one(["oh, go on then - trade me.", "very kind, {n}. send the trade over.", "for me? ta. trade me and it's a deal."]).replace('{n}', name));
            break;
        case 'request': {
            const it = u.entities.items[0];
            let has = false;
            try { has = !!(it && bot.inventory && bot.inventory.has(it.id)); } catch (e) { has = false; }
            if (it && has && (rel >= 1 || p.sociability > 0.55)) line = voiced(bot, one(["i've a " + it.name + " spare - trade me and it's yours.", "sure, {n}. trade me for the " + it.name + ".", "for you, {n}? trade me, i'll hand it over."]).replace('{n}', name));
            else if (it && !has) line = voiced(bot, one(["haven't got a " + it.name + " on me, sorry.", "no " + it.name + " here, {n}.", "wish i could - no " + it.name + "s on me."]).replace('{n}', name));
            else if (rel < 0) line = voiced(bot, one(["after everything? no.", "not for you, {n}.", "get lost."]).replace('{n}', name));
            else line = voiced(bot, one(["depends what it is.", "what do you need, exactly?", "maybe - what's it for?"]));
            if (/what do you need|what's it for|depends/.test(line)) expecting = { kind: 'free', about: 'request' };
            break;
        }
        case 'status':
            if (/hurt|dying|save me|low (hits|health|hp)|need food|poisoned/.test(u.norm)) {
                line = gen(bot, 'companion', { name }) || voiced(bot, "hang in there, {n} - get some food down you.".replace('{n}', name));
            } else if (/back now|i'm back/.test(u.norm)) line = voiced(bot, one(["welcome back, {n}.", "there you are.", "thought we'd lost you."]).replace('{n}', name));
            else line = voiced(bot, one(["no worries, i'll be about.", "take your time, {n}.", "see you in a bit."]).replace('{n}', name));
            break;
        case 'celebrate': {
            if (rel >= 5) line = voiced(bot, one(["that's my mate {n}! knew you had it in you.", "get in, {n}! so proud of you.", "ha! {n}, you legend. well earned."]).replace('{n}', name));
            else if (p.sociability > 0.3) line = voiced(bot, one(["gz {n}!", "nice one, {n}!", "grats!", "well done, {n}!", "congrats {n}, keep it up."]).replace('{n}', name));
            break;
        }
        case 'thanks':
            line = gen(bot, 'reactThanks', { name });
            if (t.turns >= 3 && Math.random() < 0.4) close = true;
            break;
        case 'apology':
            line = voiced(bot, one(["no harm done, {n}.", "don't worry about it.", "it's fine, honestly.", "forget it, {n}."]).replace('{n}', name));
            break;
        case 'farewell':
            line = gen(bot, 'reactFarewell', { name });
            close = true;
            break;
        case 'acknowledge':
        case 'affirm':
            if (Math.random() < 0.5) line = gen(bot, 'reactAffirm', { name });
            else if (human && p.curiosity > 0.45 && t.turns < 6) { line = voiced(bot, one(["so what are you up to today?", "anything i can help with?", "where are you off to?"])); expecting = { kind: 'free', about: 'activity' }; }
            break;
        case 'deny':
            if (Math.random() < 0.4) line = gen(bot, 'reactDeny', { name });
            break;
        case 'compliment':
            line = gen(bot, 'reactCompliment', { name });
            if (u.entities.items.length && Math.random() < 0.5) tail = voiced(bot, one(["it's served me well.", "cost me a fortune, mind.", "found it fair and square."]));
            break;
        case 'insult':
            line = (p.aggression > 0.55 || mood.of(bot).confidence > 0.6) ? gen(bot, 'reactInsult', { name }) : gen(bot, 'reactHurt', { name });
            close = true;
            break;
        case 'laugh':
            if (Math.random() < 0.6) line = gen(bot, 'reactLaugh', { name });
            break;
        case 'propose':
        case 'invite':
        case 'help':
        case 'follow':
        case 'come':
        case 'wait':
        case 'goto':
            // hearing.handleAct declined these (not trusted / busy); a reasoned no.
            line = gen(bot, 'refuseCommand', { name });
            break;
        default: { // statement
            // a buy/sell/price remark -> a value answer (knowledge finds the item), plus a trade offer on a sale.
            if (/\b(sell|selling|buy|buying|price|how much|worth|wtb|wts)\b/.test(saidFull)) {
                let k = null;
                try { k = knowledge.answer(bot, u.text); } catch (e) {  }
                if (k && k.text) {
                    line = voiced(bot, k.text);
                    if (/\b(sell|selling|wts)\b/.test(saidFull) && Math.random() < 0.6) {
                        tail = voiced(bot, one(["i might take it off you.", "what are you after for it?", "trade me if you like."]));
                    }
                    break;
                }
            }
            if (u.sentiment < 0 && u.mentionsMe) {
                if (human && !bot.opponent && p.sociability > 0.4 && Math.random() < 0.6) {
                    const skill = goals.current(bot) && goals.current(bot).skill;
                    line = voiced(bot, one(["rough day? come " + (skill ? skill.replace(/ing$/, '') + 'ing' : 'along') + " with me, beats moping.", "sounds grim, {n}. want some company?", "chin up, {n}. fancy tagging along with me for a bit?"]).replace('{n}', name));
                    expecting = { kind: 'yesno', action: 'tagalong' };
                } else line = voiced(bot, one(["that's rough, {n}.", "sorry to hear it.", "it happens to the best of us."]).replace('{n}', name));
            } else if (u.entities.skills.length || u.entities.npcs.length || u.entities.items.length || u.placeHit || u.boss) {
                line = voiced(bot, opinionLine(bot, u));
                // a subject was named -> thread it: a tag-along offer to a human, a follow-up to a bot.
                if (u.entities.skills.length && p.sociability > 0.5 && !bot.opponent && Math.random() < 0.4) {
                    if (human) { tail = voiced(bot, one(["mind if i join you?", "want a hand with that?"])); expecting = { kind: 'yesno', action: 'tagalong' }; }
                    else { tail = voiced(bot, one(["how's it going for you?", "what level are you at?", "found any good spots for it?"])); expecting = { kind: 'free', about: 'skill' }; }
                }
            } else if (u.sentiment > 0) {
                line = voiced(bot, one(["glad to hear it, {n}.", "good stuff.", "can't argue with that."]).replace('{n}', name));
                // a bot moves the exchange on rather than ending on an ack
                if (!human && Math.random() < 0.4) {
                    const mine = newsLine(bot, 1500) || hearing.activityLine(bot, false);
                    if (mine) { tail = voiced(bot, mine); }
                }
            } else if (Math.random() < 0.25 && newsLine(bot, 1500)) {
                line = voiced(bot, one(["guess what - ", "oh, ", "you'll like this: "]) + newsLine(bot, 1500));
            } else if (p.curiosity > 0.4 && t.turns <= 4 && Math.random() < (human ? 0.6 : 0.4)) {
                line = voiced(bot, one(["so what are you up to?", "what are you up to these days?", "and what are you up to?", "what are you doing over here?"]));
                expecting = { kind: 'free', about: 'activity' };
            } else if (Math.random() < 0.3 + p.sociability * 0.3) {
                line = gen(bot, Math.random() < 0.5 ? 'reactAgree' : 'reactLaugh', { name });
            }
        }
    }

    // a secondary act ("hi, ..." / "..., thanks") gets a few words in front
    if (secondary && line) {
        if (secondary.type === 'greet' && type !== 'greet') line = join(voiced(bot, one(["hello, {n}.", "hi, {n}.", "hey, {n}."]).replace('{n}', name)), line);
        else if (secondary.type === 'thanks' && type !== 'thanks') line = join(line, voiced(bot, "no bother."));
        else if (secondary.type === 'compliment' && type !== 'compliment') line = join(voiced(bot, "cheers!"), line);
    }
    if (tail && line) line = join(line, tail);
    // a noticed detail rides along only when the reply is short enough to stay one line
    if (line && line.length < 44 && !expecting && type !== 'farewell' && type !== 'insult' && human && t.turns >= 2 && Math.random() < 0.15 + p.curiosity * 0.25) {
        const n = notice(bot, speaker, mem);
        if (n && !/\?$/.test(line)) { line = join(line, voiced(bot, n.text)); if (/\?$/.test(n.text)) expecting = { kind: 'free', about: 'notice' }; }
    }
    // no cap here: queueSay splits a long answer into two lines instead of cutting it
    return line ? { line, expecting, close } : null;
}

module.exports = {
    pacedChat, typingTicks, noteTold, recallTold, toldQuestion,
    onSpeech, onPartyChat, onGlobalChat, respond, flush, reading, getThread, closeThread, nearbyBots, planReply, HEAR_RANGE
};
