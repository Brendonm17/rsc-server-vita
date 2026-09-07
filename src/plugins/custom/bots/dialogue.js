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
        history: [], budget: 4 + rnd(5), asked: {}
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

// a place keyword as it is said: towns by name, facilities with "the"
const TOWNS = new Set(['varrock', 'lumbridge', 'falador', 'draynor', 'draynor village', 'al kharid', 'edgeville', 'barbarian village', 'port sarim', 'rimmington', 'taverley', 'catherby', 'seers village', 'ardougne', 'yanille', 'karamja', 'brimhaven', 'shilo village', 'entrana', 'burthorpe', 'tutorial island', 'gnome stronghold', 'tree gnome village', 'hemenster', 'mcgrubor', 'port khazard', 'crandor', 'baxtorian falls', 'digsite', 'goblin village']);
function placeName(kw) {
    const k = String(kw || '').toLowerCase().trim();
    if (!k) return 'there';
    if (TOWNS.has(k)) return k.replace(/\b[a-z]/g, (c) => c.toUpperCase());
    return 'the ' + k;
}
// npc names that are plain words for people, never a subject
const NOT_A_SUBJECT = new Set(['adventurer', 'man', 'woman', 'boy', 'girl', 'child', 'person', 'friend', 'stranger', 'player']);

// the subject a line names
function topicOf(u) {
    if (!u || !u.entities) return null;
    const e = u.entities;
    if (e.skills.length) { const s = e.skills[0]; return { kind: 'skill', name: String(s.name || s), turns: 0 }; }
    if (u.boss) return { kind: 'npc', name: String(u.boss.name || u.boss.kw), id: u.boss.id, turns: 0 };
    if (e.npcs.length) { const n = e.npcs[0]; const nn = String(n.name || n); if (!NOT_A_SUBJECT.has(nn.toLowerCase())) return { kind: 'npc', name: nn, id: n.id, turns: 0 }; }
    if (e.items.length) { const i = e.items[0]; const iname = String(i.name || i); if (!/^(coins?|pot|bucket|jug)$/i.test(iname)) return { kind: 'item', name: iname, id: i.id, turns: 0 }; }
    if (u.quest) return { kind: 'quest', name: String(u.quest.name || u.quest.kw), turns: 0 };
    // only a town counts as a place subject
    if (u.placeHit && TOWNS.has(String(u.placeHit.kw).toLowerCase())) return { kind: 'place', name: placeName(u.placeHit.kw), turns: 0 };
    if (u.primary && (u.primary.type === 'whatDoing' || u.primary.type === 'whatsNew')) return { kind: 'activity', name: 'that', turns: 0 };
    return null;
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
        case 'skill': line = one([
            "how's the {x} going, {n}?", "still on the {x}, {n}?", "getting anywhere with the {x}?",
            "any levels in {x} since, {n}?", "did the {x} pay off, {n}?", "you still grinding {x}, {n}?",
            "how's {x} treating you, {n}?", "made a dent in {x} yet?", "gone up in {x} at all, {n}?",
            "sick of {x} yet, {n}?", "still at the {x} then?", "how far did you get with {x}, {n}?",
            "given up on {x} or still at it?", "was the {x} worth the bother, {n}?"
        ]); break;
        case 'quest': line = one([
            "did you finish {x}, {n}?", "how's {x} going?", "still stuck on {x}, {n}?",
            "get anywhere with {x}, {n}?", "{x} done yet, {n}?", "did {x} get any easier?",
            "how far into {x} are you now, {n}?", "wrapped up {x} yet?", "still chipping away at {x}, {n}?",
            "did you crack {x} in the end, {n}?", "{x} still giving you grief?", "any luck with {x}, {n}?",
            "was {x} as bad as they say, {n}?"
        ]); break;
        case 'boss': line = one([
            "had another go at {x}, {n}?", "beaten {x} yet, {n}?", "did {x} go down in the end?",
            "still hunting {x}, {n}?", "any luck with {x}, {n}?", "how'd it go with {x}?",
            "{x} still standing, {n}?", "you get your revenge on {x}, {n}?", "did {x} give you a kicking again?",
            "back for round two with {x}, {n}?", "sorted {x} out yet, {n}?", "is {x} still on your list, {n}?"
        ]); break;
        case 'place': line = one([
            "how was {x}, {n}?", "back from {x} already, {n}?", "still around {x}?",
            "did you find what you wanted at {x}, {n}?", "anything good at {x}, {n}?", "how'd {x} treat you?",
            "was {x} worth the walk, {n}?", "you still knocking about {x}?", "get anything done at {x}, {n}?",
            "{x} still in one piece, {n}?", "any trouble out at {x}?", "been back to {x} since, {n}?",
            "what was {x} like, {n}?"
        ]); break;
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
// the bot whose name appears as a whole word in the line
function namedBot(text, bots) {
    const low = String(text || '').toLowerCase();
    if (!low) return null;
    for (const b of bots) {
        const n = b && b.username ? b.username.toLowerCase() : '';
        if (!n) continue;
        const at = low.indexOf(n);
        if (at === -1) continue;
        const before = at === 0 ? ' ' : low[at - 1];
        const after = at + n.length >= low.length ? ' ' : low[at + n.length];
        if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
        return b;
    }
    return null;
}
// called every tick for every bot (bots/index.js runBotBrain; once per tick)
function flush(bot) {
    // floor check once per tick, queue or not
    const tickNow = nowTick(bot);
    if (bot._floorTick !== tickNow) { bot._floorTick = tickNow; try { maybeJoinFloor(bot); } catch (e) {  } }
    const q = bot._sayQueue;
    if (!q || !q.length) return;
    const now = tickNow;
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
        if (partner && partner.isBot) {
            touchFloor(bot);
            onReplyDelivered(partner, bot, e.text);
            maybeThirdVoice(bot, partner, e.text);
        }
    }
}

// the crowd's floor: a subject put to a group, one per 24-tile cell, joined turn by turn
// bounded by heads and turns, closes after FLOOR_TTL ticks of silence
const FLOOR_CELL = 24;
const FLOOR_TTL = 40;       // ticks of silence before a floor closes
const FLOOR_MAX_HEADS = 4;  // speakers in one floor
function floorKey(c) { return Math.floor(c.x / FLOOR_CELL) + ',' + Math.floor(c.y / FLOOR_CELL); }
function floors(world) { return world._botFloors || (world._botFloors = {}); }
function openFloor(speaker, target, topic) {
    if (!speaker || !speaker.world || !topic) return;
    const all = floors(speaker.world);
    const key = floorKey(speaker);
    const now = speaker.world.ticks | 0;
    const f = all[key];
    // a live floor keeps its subject; a stale one is replaced
    if (f && now - f.lastTick <= FLOOR_TTL && f.turns < f.budget) return;
    all[key] = { topic, x: speaker.x, y: speaker.y, opened: now, lastTick: now, turns: 1, budget: 6 + rnd(5), heads: [speaker.username, target ? target.username : null].filter(Boolean), last: speaker.username };
}
function touchFloor(bot) {
    if (!bot || !bot.world) return;
    const f = floors(bot.world)[floorKey(bot)];
    if (!f) return;
    const now = bot.world.ticks | 0;
    if (now - f.lastTick > FLOOR_TTL) return;
    f.lastTick = now; f.turns += 1; f.last = bot.username;
    if (f.heads.indexOf(bot.username) === -1 && f.heads.length < FLOOR_MAX_HEADS) f.heads.push(bot.username);
}
// per bot per tick: join the local floor with a word on its subject
function maybeJoinFloor(bot) {
    const w = bot.world;
    if (!w || !w._botFloors) return;
    const f = w._botFloors[floorKey(bot)];
    if (!f) return;
    const now = w.ticks | 0;
    if (now - f.lastTick > FLOOR_TTL || f.turns >= f.budget || f.heads.length >= FLOOR_MAX_HEADS) { if (now - f.lastTick > FLOOR_TTL || f.turns >= f.budget) delete w._botFloors[floorKey(bot)]; return; }
    if (f.heads.indexOf(bot.username) !== -1 || bot.opponent || bot._floorCd > 0) { if (bot._floorCd > 0) bot._floorCd -= 1; return; }
    if (Math.abs(bot.x - f.x) > HEAR_RANGE / 2 || Math.abs(bot.y - f.y) > HEAR_RANGE / 2) return;
    // a beat after the last line, then a roll sized by sociability
    if (now - f.lastTick < 3) return;
    const p = personality.of(bot);
    if (Math.random() > 0.05 + p.sociability * 0.08) return;
    bot._floorCd = 60 + rnd(60);
    const last = findPlayer(bot, f.last);
    if (!last) return;
    const said = Math.random() < 0.5 ? topicRemark(bot, f.topic) : topicFollowUp(bot, f.topic);
    if (!said) return;
    const t = getThread(bot, last.username, true);
    t.topic = Object.assign({}, f.topic, { turns: 0 });
    if (/\?$/.test(said)) t.expecting = { kind: 'free', about: 'topic' };
    f.heads.push(bot.username); f.turns += 1; f.lastTick = now; f.last = bot.username;
    queueSay(bot, voiced(bot, said), 1 + rnd(2), last);
}

// a bystander may chime in on a bot-to-bot exchange: one bot, low odds, long rest after
function maybeThirdVoice(bot, partner, text) {
    if (Math.random() > 0.35) return;
    let others;
    try { others = nearbyBots(bot, HEAR_RANGE).filter((b) => b && b !== partner && b.username !== partner.username && !b._sayDelivering); } catch (e) { return; }
    if (!others.length) return;
    const third = others[rnd(others.length)];
    if (third._thirdCd > 0) { third._thirdCd -= 1; return; }
    if (getThread(third, bot.username, false) || getThread(third, partner.username, false)) return;
    const p = personality.of(third);
    if (Math.random() > 0.15 + p.sociability * 0.25) { third._thirdCd = 20 + rnd(30); return; }
    third._thirdCd = 120 + rnd(120);
    respond(third, bot, reading(String(text), bot, [third]), { delay: 3 + rnd(4), opener: true });
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
        .toLowerCase()
        // fold voice abbreviations: u = you, ur = your, r = are
        .replace(/\bu\b/g, 'you').replace(/\bur\b/g, 'your').replace(/\br\b/g, 'are').replace(/\bya\b/g, 'you');
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
        // a named bot in earshot answers, else the nearest willing one
        let target = namedBot(String(text), bots);
        if (!target) {
            const sorted = bots.slice().sort((a, b) => dist(a, speaker) - dist(b, speaker));
            for (const cand of sorted) {
                if (cand._heardCd > 0) { cand._heardCd -= 1; continue; }
                const p = personality.of(cand);
                if (Math.random() < 0.3 + p.sociability * 0.5) { target = cand; break; }
                cand._heardCd = 10 + rnd(20);
            }
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
    if (!target) return;
    respond(target, speaker, u, { delay: 2 + rnd(3), opener: true });
    // a subject opens the crowd's floor and may draw a second voice a little later
    const subject = topicOf(u);
    if (subject && subject.kind !== 'activity') openFloor(speaker, target, subject);
    if (bots.length > 1 && subject && Math.random() < 0.25) {
        const others = bots.filter((b) => b && b !== target && (b._thirdCd | 0) <= 0);
        if (others.length) {
            const second = others[rnd(others.length)];
            second._thirdCd = 120 + rnd(120);
            respond(second, speaker, u, { delay: 6 + rnd(5), opener: true });
        }
    }
}

// a queued reply landed on a bot partner: it may carry the thread on (budgeted).
function onReplyDelivered(partner, bot, text) {
    deps();
    const t = getThread(partner, bot.username, true);
    const u = reading(String(text), bot, [partner]);
    if (u.primary.type === 'farewell') { closeThread(partner, bot.username); return; }
    if (t.turns >= t.budget) { closeThread(partner, bot.username); closeThread(bot, partner.username); return; }
    // two rounds of pure pleasantries close the thread; one that names something or asks back is content
    const named = !!(u.entities && (u.entities.skills.length || u.entities.npcs.length || u.entities.items.length || u.entities.players.length || u.placeHit || u.quest || u.boss));
    if (SMALLTALK_TYPES.has(u.primary.type) && !u.isQuestion && !named && !u.secondary) {
        t.smalltalk = (t.smalltalk || 0) + 1;
    } else {
        t.smalltalk = 0;
    }
    if (t.smalltalk >= 2) { closeThread(partner, bot.username); closeThread(bot, partner.username); return; }
    // continue chance decays with thread length, faster once stale
    let p = 0.85 * (1 - t.turns / (t.budget + 1));
    if (t.smalltalk >= 1 && t.turns >= 3) p *= 0.5;
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
    // thread subject: a new one named here wins, else the current one carries up to 3 turns
    const fresh = topicOf(u);
    if (fresh) t.topic = fresh;
    else if (t.topic) { t.topic.turns = (t.topic.turns || 0) + 1; if (t.topic.turns > 3) t.topic = null; }
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
                    // a human is followed for a good while; another bot only briefly, and never in a ring
                    const ring = !!(speaker.isBot && speaker._follow && speaker._follow.username === bot.username);
                    if (!ring) bot._follow = { username: speaker.username, ticks: speaker.isBot ? 60 + rnd(60) : 300 + rnd(300) };
                    bot._holdTicks = 0;
                    line = one([
                        "right behind you, {n}.", "lead on then, {n}!", "let's go, {n}.", "after you, {n}.",
                        "on my way, {n}.", "grand - i'm with you, {n}.", "say no more, {n}.", "right, off we go then, {n}.",
                        "coming, {n}. don't lose me.", "i'll keep up, {n}.", "good - let's crack on, {n}.", "with you, {n}."
                    ]);
                } else if (ex.action === 'party') {
                    party.invite(bot, speaker.username);
                    line = one([
                        "sent you an invite, {n}.", "invite's on its way, {n}.", "grand - invite sent, {n}.",
                        "done - check your invites, {n}.", "invite sent. welcome aboard, {n}.", "there's an invite for you, {n}.",
                        "sent, {n}. accept when you're ready.", "invite's gone out, {n}.", "you should have an invite now, {n}.",
                        "in you come, {n} - invite sent.", "sorted, {n}. invite's with you."
                    ]);
                } else if (ex.action === 'trade') {
                    if (bot.trade && typeof bot.trade.request === 'function') bot.trade.request(speaker);
                    line = one([
                        "opening a trade with you now, {n}.", "here - trade coming up, {n}.", "trade window's on its way, {n}.",
                        "sending the trade over, {n}.", "trade's coming, {n}.", "one trade, coming up, {n}.",
                        "here we go then, {n} - trade sent.", "let's see what you've got, {n}.", "trade's open, {n}.",
                        "sending it now, {n}.", "right you are, {n} - trade incoming."
                    ]);
                } else if (ex.action === 'mission' && ex.spec) {
                    hearing.adoptMission(bot, ex.spec);
                    line = one([
                        "that's settled then, {n}.", "good - let's get to it, {n}.", "deal, {n}.", "right, that's the plan, {n}.",
                        "grand. we're on, {n}.", "consider it done, {n}.", "sorted - let's crack on, {n}.", "good stuff, {n}. i'm in.",
                        "that's that, then, {n}.", "say no more, {n}. we're off.", "agreed, {n}. no time like now."
                    ]);
                } else if (ex.action === 'gift') {
                    try { require('./mentoring').giveOfferedGift(bot, speaker); } catch (e) {  }
                    line = one([
                        "all yours, {n}.", "there you go, {n}.", "take it, {n}. no arguments.", "it's yours, {n}. put it to use.",
                        "here, {n}. don't lose it.", "go on, {n} - have it.", "yours now, {n}. enjoy.", "there - that's yours, {n}.",
                        "have it, {n}. i've spares.", "it's no use to me, {n}. all yours.", "done, {n}. look after it."
                    ]);
                } else {
                    line = one([
                        "glad to hear it, {n}.", "good stuff.", "that's the spirit.", "knew you'd say that, {n}.", "good on you, {n}.",
                        "grand.", "that's what i like to hear, {n}.", "good - we're of a mind, {n}.", "ha, good.", "thought as much, {n}.",
                        "nice one.", "aye, that's the way.", "good to know, {n}.", "champion."
                    ]);
                }
            } catch (e) { line = "ah - never mind, {n}."; }
            queueSay(bot, voiced(bot, line.replace('{n}', name)), opts.delay || 1, speaker);
            return true;
        }
        if (u.yesno === 'no' || u.primary.type === 'deny') {
            const line = one([
                "fair enough, {n}.", "no worries, {n}.", "another time, then.", "suit yourself, {n}.", "alright - maybe later.",
                "no bother, {n}.", "ah well. can't win them all.", "your call, {n}.", "fair dos.", "right you are, {n}.",
                "no harm asking.", "ok, {n}. offer stands, mind.", "understood, {n}.", "as you like, {n}."
            ]);
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
                ? one([
                    "sorry to hear that, {n}.", "rough, that. hang in there, {n}.", "ah, it'll pass. want some company?",
                    "that's rubbish, {n}. want some company?", "we all get days like that, {n}.", "chin up, {n}. tomorrow's another day.",
                    "ugh, sorry {n}. it'll turn round.", "that's a shame, {n}. hang in there.", "bad luck, {n}. it happens.",
                    "nothing a good scrap won't fix, {n}.", "sorry, {n}. want some company for a bit?", "ah, one of those days. it passes, {n}."
                ])
                : u.sentiment > 0 ? one([
                    "good to hear, {n}!", "ha, glad someone's thriving.", "that's what i like to hear.", "nice one, {n}. long may it last.",
                    "grand, {n}. keep it that way.", "good on you, {n}.", "someone's doing alright, then.", "ha, lucky you, {n}.",
                    "that's the stuff, {n}.", "glad it's going well for you.", "good, good. about time one of us was.", "can't beat that, {n}."
                ])
                    : one([
                        "fair enough.", "same old, then.", "can't ask for more than that.", "ticking along, then.",
                        "ah, middling. i know the feeling.", "could be worse, eh?", "that'll do, {n}.", "fair. no news is good news.",
                        "steady as she goes, then.", "same here, honestly.", "getting by is half the battle.", "nowt wrong with that, {n}."
                    ]);
            if (/want some company/.test(line)) { queueSay(bot, voiced(bot, line.replace('{n}', name)), opts.delay || 1, speaker); t.expecting = { kind: 'yesno', action: 'tagalong' }; return true; }
        } else if (ex.about === 'told' && (u.yesno || u.primary.type === 'affirm' || u.primary.type === 'deny') && !skill) {
            line = (u.yesno === 'no' || u.primary.type === 'deny')
                ? one([
                    "ah well. it'll come, {n}.", "no rush, {n}.", "give it time, {n}.", "these things take a while, {n}.",
                    "you'll get there, {n}.", "ah, shame. keep at it though, {n}.", "not to worry, {n}. it's not going anywhere.",
                    "one day, {n}. one day.", "plenty of time yet, {n}.", "bad luck, {n}. next time.", "nothing worth doing comes quick, {n}."
                ])
                : one([
                    "good stuff - keep at it, {n}.", "knew you would, {n}.", "nice one, {n}.", "ha, told you it'd come, {n}.",
                    "well in, {n}!", "that's the way, {n}.", "good going, {n}.", "look at you go, {n}.",
                    "cracking, {n}. what's next?", "never doubted you, {n}.", "grand - that's progress, {n}."
                ]);
        } else if (skill) {
            line = skillRemark(bot, skill, name);
            queueSay(bot, voiced(bot, line), opts.delay || 1, speaker);
            if (personality.of(bot).sociability > 0.45 && Math.random() < 0.5 && !bot.opponent) {
                queueSay(bot, voiced(bot, one([
                    "mind if i tag along?", "room for one more?", "want a hand with that?", "fancy some company?",
                    "could i join you for a bit?", "mind some company?", "want a partner for that?", "shall i come along?",
                    "any room for me?", "could use a change - mind if i join?", "want someone to share the spot with?", "would you have me along?"
                ])), (opts.delay || 1) + 2, speaker);
                t.expecting = { kind: 'yesno', action: 'tagalong' };
            }
            return true;
        } else if (place) {
            line = one([
                placeName(place) + "? watch yourself out that way.", "ah, " + placeName(place) + ". not a bad shout.",
                placeName(place) + " - i know it well.", placeName(place) + "? been a while since i was out that way.",
                "not a bad walk to " + placeName(place) + ".", placeName(place) + ", eh? mind the locals.",
                "i've had a few close calls round " + placeName(place) + ".", placeName(place) + "? good pick.",
                "there's worse places than " + placeName(place) + ".", placeName(place) + " - take some food.",
                "ah, " + placeName(place) + ". haven't been in ages.", placeName(place) + "? say hello to the bank for me."
            ]);
        } else if (u.primary.type === 'statement' || u.primary.type === 'affirm' || u.primary.type === 'deny') {
            line = u.sentiment < 0
                ? one([
                    "that's a shame.", "sorry to hear it, {n}.", "hm. that's rough.", "ah, bad luck, {n}.", "that's not on.",
                    "ugh. sorry, {n}.", "well, that's rubbish.", "unlucky, {n}.", "it happens. doesn't make it better, mind.",
                    "rotten luck, that.", "ah, {n}. that's a pain.", "not what you wanted, i bet."
                ])
                : one([
                    "fair enough, {n}.", "ah, nice.", "sounds about right.", "good to know.", "right you are.", "aye, makes sense.",
                    "ha, fair.", "can't argue with that.", "i'll take your word for it, {n}.", "that figures.", "good stuff.",
                    "well, there you go.", "noted, {n}.", "ah, i see.", "fair dos.", "that's the way of it.", "interesting, that.",
                    "so i've heard.", "hm, fair point.", "wouldn't have guessed, {n}."
                ]);
            if (ex.about === 'news') {
                const mine = newsLine(bot, 3000);
                if (mine && Math.random() < 0.5) line = join(line, one([
                    "i had one of those days too - ", "me, ", "funny you say that. ", "same sort of thing here - ", "snap. ",
                    "ha, likewise - ", "you and me both. ", "that reminds me - ", "speaking of which, ", "as it happens, ",
                    "on my end, ", "tell you what happened to me - "
                ]) + mine);
            } else if (ex.about === 'topic' && t.topic && Math.random() < 0.6) {
                // an answer about the subject gets the bot's own word on it
                const r = topicRemark(bot, t.topic);
                if (r) line = join(line, r);
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
    if (mem && mem.lastLevel && cl >= mem.lastLevel + 3 && mem.met > 1) out.push({ w: 3, text: one([
        "you've come on since we last spoke - level " + cl + " now?", "level " + cl + " already? you've been busy.",
        "hang on, level " + cl + "? you were lower last time.", "someone's been training - level " + cl + "?",
        "look at you, level " + cl + ". what happened?", "you've shot up - " + cl + " now, is it?",
        "level " + cl + "? you've been grafting since we spoke.", "up to " + cl + " already? fair play.",
        "you've put some levels on - " + cl + " now?", "is that level " + cl + "? you've come on a way."
    ]) });
    const w = weaponName(partner);
    if (w && Math.random() < 0.6) out.push({ w: 2, text: one([
        "nice " + w + ".", "that " + w + " looks the part.", "where'd you get the " + w + "?", "a " + w + ", eh? not bad.",
        "that's a decent " + w + ".", "i like the " + w + ".", "is that " + w + " any good?", "how much was the " + w + "?",
        "smart " + w + ", that.", "that " + w + " seen much use?", "you handy with that " + w + "?", "a " + w + " suits you.",
        "haven't seen a " + w + " like that in a while.", "that " + w + " must have cost a bit."
    ]) });
    const a = armourName(partner);
    if (a && Math.random() < 0.4) out.push({ w: 1, text: one([
        "smart bit of " + a + ", that.", "nice " + a + ".", "that " + a + " looks solid.", "where'd you pick up the " + a + "?",
        "the " + a + " suits you.", "is that " + a + " heavy?", "good " + a + ", that. keeps the arrows off.",
        "i had a " + a + " like that once.", "that " + a + " seen many fights?", "you've done well for a " + a + "."
    ]) });
    if (cl && cl >= myCl + 15) out.push({ w: 2, text: one([
        "you're well above my weight - level " + cl + "?", "level " + cl + "! remind me not to cross you.",
        "level " + cl + "? i'll stay on your good side.", "blimey, level " + cl + ". i'm nowhere near.",
        "you'd flatten me - level " + cl + ", is it?", "level " + cl + ". i've a way to go to catch you.",
        "a " + cl + "? you must have some stories.", "level " + cl + " - what do you even train on?",
        "i'd not want to meet you in the wilderness, level " + cl + ".", "level " + cl + "? teach me your ways."
    ]) });
    else if (cl && cl <= myCl - 15 && cl > 0) out.push({ w: 1, text: one([
        "still finding your feet? stick to cows for a bit.", "new around here? shout if you need a hand.",
        "just starting out? goblins are good for a few levels.", "early days for you, eh? it gets easier.",
        "you're new-ish, i take it. mind the dark wizards.", "starting out? get some food before you fight anything.",
        "fresh face, eh? the chickens by Lumbridge are a soft start.", "not long started? the cows south of Falador are safe.",
        "new to it? don't wander north, whatever you do.", "just beginning? don't be shy about asking for help."
    ]) });
    if (partner.opponent) out.push({ w: 3, text: one([
        "careful - you've got company.", "mind yourself, that one's on you.", "you've got a scrap on your hands there.",
        "watch it, something's having a go at you.", "you're being had at - eat if you need to.", "that's got its eye on you, mind.",
        "heads up, you've picked up a fight.", "oi, you've got one on you.", "you're in a fight, in case you missed it.",
        "keep your guard up, it's still on you."
    ]) });
    else if (partner.gatheringSkill) out.push({ w: 2, text: one([
        "hard at it, i see.", "still grafting away?", "busy, busy.", "no rest for you, then.", "grinding it out, eh?",
        "keeping your hands busy, i see.", "you're going at that.", "someone's earning their keep.", "still at it, then?",
        "that's the spirit - keep at it.", "look at you, working away.", "you don't stop, do you?"
    ]) });
    else if (partner.walkQueue && partner.walkQueue.length) out.push({ w: 1, text: one([
        "off somewhere?", "on your way somewhere?", "where are you headed?", "somewhere to be?", "going far?",
        "heading out, are you?", "where's the rush?", "off on an errand?", "where are you off to?", "passing through?"
    ]) });
    try {
        const hits = partner.skills && partner.skills.hits;
        if (hits && hits.current < hits.base * 0.4) out.push({ w: 4, text: one([
            "you look hurt - got any food on you?", "you're looking rough - eat something.", "you're low, mind. got food?",
            "you want to eat, you're half dead.", "careful, you've not got much left in you.", "get some food down you, you're low.",
            "you look like you've been through it - any food?", "you're in a bad way - need something to eat?",
            "eat before you fight anything else, you're low.", "you alright? you look like you've had a beating."
        ]) });
    } catch (e) {  }
    try {
        const region = knowledge.regionOf(partner.x, partner.y);
        if (region && Math.random() < 0.3) out.push({ w: 1, text: one([
            "what brings you to " + region + "?", "you often round " + region + "?", "what are you doing in " + region + "?",
            "not seen you in " + region + " before.", "you live round " + region + "?", "what's brought you out to " + region + "?",
            "here for anything in particular in " + region + "?", "you stopping in " + region + " long?",
            "first time in " + region + "?", "how'd you end up in " + region + "?"
        ]) });
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

// one follow-up question per subject
function topicFollowUp(bot, topic) {
    if (!topic || !topic.name) return null;
    const n = topic.name;
    switch (topic.kind) {
        case 'skill': return one([
            "what level are you at with " + n + "?", "where do you go for " + n + "?", "how long have you been at " + n + "?",
            "any good spots for " + n + "?", "is " + n + " paying for you?", "what got you into " + n + "?",
            "you enjoy " + n + " or just grinding it?", "what are you aiming for in " + n + "?", "any tips for " + n + "?",
            "is " + n + " slow going for you too?", "what do you use for " + n + "?", "you do " + n + " for the coin or the levels?",
            "does " + n + " ever get boring?", "who taught you " + n + "?", "what's the best bit of " + n + "?",
            "how much " + n + " do you do in a day?", "do you sell what you get from " + n + "?", "is " + n + " worth the effort, honestly?",
            "what's your next goal in " + n + "?", "any secret spots for " + n + "?"
        ]);
        case 'npc': return one([
            "ever fought a " + n + " yourself?", "what do " + n + "s drop, do you know?", "where do you find " + n + "s?",
            "how do you fare against a " + n + "?", "what's the trick with a " + n + "?", "are " + n + "s worth the trouble?",
            "what level do you need for a " + n + "?", "do " + n + "s hit hard?", "how many " + n + "s have you done?",
            "ever had a " + n + " turn on you?", "would you take a " + n + " on alone?", "what do you bring for a " + n + "?",
            "is a " + n + " good for training?", "seen many " + n + "s about?", "what's the best weapon on a " + n + "?",
            "do " + n + "s come in packs?"
        ]);
        case 'item': return one([
            "what did you pay for the " + n + "?", "you using the " + n + " or selling it?", "where'd you get the " + n + "?",
            "any good, the " + n + "?", "what would you take for the " + n + "?", "is the " + n + " worth having?",
            "how long have you had the " + n + "?", "do you need the " + n + " or is it spare?", "would you sell the " + n + "?",
            "what's a " + n + " go for these days?", "is the " + n + " hard to come by?", "did you make the " + n + " yourself?",
            "what do you use the " + n + " for?", "how many " + n + "s have you got?", "is the " + n + " better than what you had?",
            "who sold you the " + n + "?"
        ]);
        case 'place': return one([
            "been to " + n + " much?", "what's " + n + " like these days?", "anything worth doing round " + n + "?",
            "you based near " + n + "?", "is " + n + " busy at the moment?", "what takes you to " + n + "?",
            "where do you bank when you're in " + n + "?", "is " + n + " safe enough?", "what's the best thing about " + n + "?",
            "any decent shops in " + n + "?", "how far is " + n + " from here, do you reckon?", "do you know " + n + " well?",
            "what's the worst bit of " + n + "?", "ever get lost in " + n + "?", "is there much to fight round " + n + "?",
            "would you live in " + n + "?"
        ]);
        case 'quest': return one([
            "how far into " + n + " are you?", "done " + n + " yet?", "what's " + n + " like? worth it?", "is " + n + " hard?",
            "what do you get for " + n + "?", "who starts " + n + "?", "any tips for " + n + "?", "is " + n + " long?",
            "what's the worst part of " + n + "?", "did " + n + " need much fighting?", "is " + n + " one for a beginner?",
            "what got you started on " + n + "?", "do you need anything special for " + n + "?", "would you do " + n + " again?",
            "is " + n + " worth the walking?", "how long did " + n + " take you?"
        ]);
        case 'activity': return one([
            "how's it paying?", "good spot for it?", "been at it long today?", "getting anywhere with it?",
            "what are you after from it?", "is it going well?", "any luck with it so far?", "what's the plan after that?",
            "is it slow going?", "worth the effort?", "how long will you keep at it?", "do you enjoy it or is it a grind?",
            "what's the goal with it?", "is it busy where you are?", "any trouble with it?", "how'd you get into that?"
        ]);
        default: return null;
    }
}
// the bot's own word on the subject
function topicRemark(bot, topic) {
    if (!topic || !topic.name) return null;
    const n = topic.name;
    try {
        if (topic.kind === 'skill') return skillRemark(bot, n);
        if (topic.kind === 'npc') return opinionLine(bot, { entities: { skills: [], npcs: [{ name: n, id: topic.id }], items: [] } });
        if (topic.kind === 'item') { const k = knowledge.answer(bot, 'what is a ' + n); if (k && k.text) return k.text; }
        if (topic.kind === 'place') {
            let c = null; try { c = require('./context').describe(bot); } catch (e) { c = null; }
            if (c && c.region && c.region.name && c.region.name.toLowerCase() === String(n).toLowerCase()) return one([
                "we're stood in it, near enough.", "this is " + n + ", give or take.", "you're in " + n + " now, more or less.",
                "well, look around - this is " + n + ".", n + "? you're stood in it.", "this is it. " + n + ", such as it is.",
                "we're in " + n + " right now, near enough.", "you've found " + n + " already - it's here.",
                "this is " + n + ", give or take a field.", "you're not far off - this is " + n + "."
            ]);
            return one([
                "i pass through " + n + " now and then.", n + "? not been in a while.", "know " + n + " a bit. it's alright.",
                "i've had good days and bad in " + n + ".", n + "'s alright if you know where to look.", "i keep meaning to go back to " + n + ".",
                n + "? decent enough, bit out of the way.", "i learned a lot the hard way round " + n + ".",
                "i've banked in " + n + " more times than i can count.", n + " - good for a visit, wouldn't stay.",
                "used to spend a lot of time in " + n + ".", "you'll meet all sorts in " + n + ".", n + "? watch your pockets there.",
                "i've a soft spot for " + n + "."
            ]);
        }
        if (topic.kind === 'quest') return one([
            "quests pay well if you see them through.", "the talking's the hard part of a quest.", "i take a quest when it's on my way.",
            "half a quest is the walking, honestly.", "quests are grand until you lose the item you need.",
            "i like a quest with a proper reward at the end.", "nothing beats finishing a quest you'd given up on.",
            "quests are where the good gear comes from.", "i always end up reading the same book twice in a quest.",
            "a quest's a good excuse to see somewhere new.", "some quests want more patience than skill.",
            "i keep a list of quests and never finish it.", "the best quests are the ones with a fight at the end.",
            "quests are fine, so long as nobody's rushing me."
        ]);
    } catch (e) { return null; }
    return null;
}

function moodLine(bot) {
    const m = mood.of(bot);
    const act = hearing.activityLine(bot, true);
    let core;
    if (m.valence > 0.62 && m.energy > 0.45) core = one([
        "can't complain - {act}.", "great, actually. {act}.", "brilliant! {act}.", "never better. {act}.", "grand, ta. {act}.",
        "smashing, honestly - {act}.", "top form today. {act}.", "really good, cheers. {act}.", "flying, actually. {act}.",
        "very well, thanks. {act}.", "champion. {act}.", "chuffed, to be honest. {act}.", "good as gold. {act}.", "couldn't be better - {act}."
    ]);
    else if (m.valence < 0.38) core = one([
        "been better, honestly.", "bit fed up today.", "rough one, but i'll live.", "not my best day.", "meh. one of those days.",
        "bit down, if i'm honest.", "not great. i'll manage.", "so-so. don't ask.", "could be worse. mostly it's worse.",
        "having a bad run of it.", "bit of a slog today.", "surviving. just about.", "not brilliant, truth be told.", "ask me tomorrow."
    ]);
    else if (m.energy < 0.35) core = one([
        "knackered, but fine.", "tired - been at it all day.", "could use a sit down, otherwise fine.", "shattered, honestly.",
        "running on fumes, but alright.", "dead on my feet. fine though.", "worn out. long day.", "bit weary, nothing a rest won't fix.",
        "half asleep, to be honest.", "tired but happy enough.", "yawning my head off, otherwise ok.", "done in. still standing, mind."
    ]);
    else core = one([
        "not bad. {act}.", "alright, you know - {act}.", "getting by. {act}.", "fine, ta. {act}.", "same as ever. {act}.",
        "ok, cheers. {act}.", "ticking along. {act}.", "can't grumble. {act}.", "fair to middling. {act}.", "fine, fine. {act}.",
        "alright, thanks. {act}.", "not so bad. {act}.", "muddling through. {act}.", "steady. {act}."
    ]);
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
    fishing: ['fishing', 'diligence', "peaceful, that - and it feeds you"], mining: ['mining', 'diligence', "good coin in ore if you stick at it"],
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
    if (!tag) return one([
        "fair enough.", "each to their own.", "can't say i know much about it.", "if it works for you.", "never tried it myself.",
        "sounds like a way to pass the day.", "not one i've looked into.", "you'd know better than me.", "fair play to you.",
        "there's worse things to be at."
    ]);
    const like = (p[tag[1]] || 0.5) > 0.5;
    return like
        ? one([
            "ah, " + tag[0] + " - " + tag[2] + ".", tag[0] + "? good choice. " + tag[2] + ".", "i love a bit of " + tag[0] + ".",
            "can't beat " + tag[0] + ". " + tag[2] + ".", tag[0] + "'s my favourite, honestly.", "good on you - " + tag[2] + ".",
            "ah, " + tag[0] + ". " + tag[2] + ", as they say.", "i could do " + tag[0] + " all day.", tag[0] + " - now you're talking.",
            "nothing wrong with " + tag[0] + ". " + tag[2] + ".", "i'm a " + tag[0] + " sort myself.", tag[0] + "? " + tag[2] + ". you've picked well.",
            "good shout, " + tag[0] + ". " + tag[2] + ".", "there's worse ways to spend a day than " + tag[0] + "."
        ])
        : one([
            tag[0] + "'s not really my thing, but " + tag[2] + ".", "rather you than me with " + tag[0] + ".", tag[0] + ", eh? i can't sit still for it.",
            "i never took to " + tag[0] + ", myself.", tag[0] + "? each to their own.", "i'd sooner do anything than " + tag[0] + ".",
            tag[0] + " bores me stiff, sorry.", "fair play - " + tag[0] + " isn't for me.", "i tried " + tag[0] + " once. never again.",
            "all yours, " + tag[0] + ". i haven't the patience.", tag[0] + "? " + tag[2] + ", i suppose. not for me though.",
            "you're a braver soul than me, " + tag[0] + ".", "i leave " + tag[0] + " to the people who like it.",
            "someone's got to do " + tag[0] + ". glad it's not me."
        ]);
}
function opinionLine(bot, u) {
    const p = personality.of(bot);
    if (u.entities.skills.length) return skillRemark(bot, u.entities.skills[0]);
    if (u.entities.npcs.length) {
        const n = u.entities.npcs[0];
        const def = knowledge.npcDefs[n.id];
        const cl = def ? Math.floor(((def.attack || 1) + (def.defense || 1) + (def.strength || 1) + (def.hits || 1)) / 4) : 0;
        const mine = bot.getCombatLevel ? bot.getCombatLevel() : 3;
        if (cl > mine + 10) return one([
            n.name + "? not something i'd pick a fight with yet.", "a " + n.name + " would flatten me, honestly.",
            "give " + n.name + "s a wide berth unless you're strong.", "i'm not ready for a " + n.name + ", not yet.",
            "a " + n.name + "? i'd be food.", n.name + "s scare me, if i'm honest.", "one day i'll take a " + n.name + ". not today.",
            "i've seen what a " + n.name + " does. no thanks.", "a " + n.name + " is a few levels off for me.",
            "you'd want good armour for a " + n.name + ".", "i'd rather not meet a " + n.name + " down a corridor.",
            "the " + n.name + " can keep its corner for now."
        ]);
        if (cl < Math.max(3, mine - 15)) return one([
            n.name + "s? easy pickings.", "a " + n.name + " is fine for a laugh.", n.name + "s don't put up much of a fight.",
            "i could do " + n.name + "s in my sleep.", "a " + n.name + "? barely worth the walk.", n.name + "s are good for a warm-up.",
            "i've outgrown " + n.name + "s, honestly.", "a " + n.name + " hardly touches me these days.", n.name + "s? fine for a beginner.",
            "no trouble from a " + n.name + " at my level.", "a " + n.name + " is a free kill, near enough.", n.name + "s go down in a hit or two."
        ]);
        return one([
            "a " + n.name + " is a fair fight for someone like me.", n.name + "s? decent scrap, decent drops.",
            "a " + n.name + " keeps me honest.", "i can handle a " + n.name + ", just about.", n.name + "s are about my level, yeah.",
            "a " + n.name + " is worth the fight, mostly.", "i take food for a " + n.name + " but i win.", n.name + "s? a fair go.",
            "a " + n.name + " gives me a proper workout.", "i've killed my share of " + n.name + "s. lost to a few too.",
            n.name + "s are good training for me right now.", "a " + n.name + " - even money, that one."
        ]);
    }
    if (u.entities.items.length) {
        const it = u.entities.items[0];
        const def = knowledge.itemDefs[it.id];
        const worth = def && def.price ? def.price : 0;
        if (/^coins?$/i.test(it.name)) return one([
            "coin's coin. never enough of it.", "can't argue with coins.", "more coins is never a bad thing.",
            "coins? always short of them.", "i like coins. coins are good.", "gp makes the world go round.",
            "you can never have too many coins.", "coins go out faster than they come in.", "money talks, as they say.",
            "coins buy food, food keeps me alive. simple."
        ]);
        if (worth > 1000) return one([
            "a " + it.name + "? worth a pretty penny, that.", "nice piece, the " + it.name + ".", "i'd keep a " + it.name + " safe in the bank.",
            "a " + it.name + " is serious kit.", "don't die with a " + it.name + " on you.", "a " + it.name + "? you've done alright.",
            "i'd give a lot for a " + it.name + ".", "a " + it.name + " - now that's an item.", "the " + it.name + " holds its value.",
            "a " + it.name + " is a step up from what i've got.", "people would trade well for a " + it.name + ".", "a " + it.name + "? lucky you."
        ]);
        return one([
            "a " + it.name + "? does the job.", "can't go wrong with a " + it.name + " early on.", "meh - a " + it.name + " is fine until you find better.",
            "a " + it.name + " is a " + it.name + ". nothing fancy.", "i've a few " + it.name + "s in the bank myself.",
            "a " + it.name + "? cheap and cheerful.", "the " + it.name + " gets you started, at least.", "not much to say about a " + it.name + ".",
            "a " + it.name + " won't win you any prizes.", "you'll move on from a " + it.name + " soon enough.",
            "a " + it.name + " is handy to have about.", "the " + it.name + " is fine. don't overthink it."
        ]);
    }
    if (u.placeHit) { const pl = placeName(u.placeHit.kw); return one([
        pl + "? decent spot.", "i like " + pl + " well enough.", pl + " gets busy, mind.", pl + "? good for a bank run.",
        "i've spent too long in " + pl + ".", pl + " is alright once you know it.", "not much wrong with " + pl + ".",
        pl + "? watch the crowds.", "i'd happily go back to " + pl + ".", pl + " has its moments.", pl + "? bit of a trek, but fine.",
        "you'll do alright in " + pl + "."
    ]); }
    if (u.boss) return one([
        u.boss.name + "? one day, maybe.", "i'd want a few more levels before " + u.boss.name + ".", u.boss.name + " is out of my league for now.",
        "i'm not touching " + u.boss.name + " without a party.", u.boss.name + "? i'd need better gear.", "people talk big about " + u.boss.name + ". i don't.",
        u.boss.name + " has done for better than me.", "give me a year and i'll think about " + u.boss.name + ".",
        u.boss.name + "? bring food. lots of food.", "i've heard the stories about " + u.boss.name + ". no rush."
    ]);
    return p.curiosity > 0.5 ? one([
        "i'm all for it.", "sounds good to me.", "could be worth a look.", "i'd give it a go.", "why not, eh?", "count me interested.",
        "sounds alright to me.", "i'd not say no.", "worth a try, i reckon.", "i like the sound of that."
    ]) : one([
        "not sure, honestly.", "i've no strong feelings on it.", "depends on the day.", "couldn't say.", "hard to say, really.",
        "i'd have to think about it.", "no opinion either way.", "maybe. maybe not.", "ask me another.", "i'm on the fence."
    ]);
}

function homeLine(bot) {
    let region = null;
    try { region = knowledge.regionOf(bot.x, bot.y); } catch (e) { region = null; }
    return region ? one([
        "these parts - " + region + ", mostly.", "i've knocked about " + region + " for as long as i remember.", "around " + region + ". never strayed far.",
        region + ", born and bred.", "round " + region + ", give or take.", "i call " + region + " home, more or less.",
        region + ". not that i'm ever there.", "here - " + region + ". it's not much but it's mine.", "i'm a " + region + " sort.",
        region + ", though i wander.", "you're looking at it - " + region + ".", "i've a bank in " + region + " and that's home enough."
    ]) : one([
        "here and there.", "all over, really.", "nowhere in particular.", "wherever i put my pack down.", "bit of everywhere.",
        "no fixed abode, me.", "the road, mostly.", "wherever there's a bank.", "hard to say. i move about.", "nowhere you'd know."
    ]);
}
function selfLine(bot) {
    const who = nameOf(bot);
    let title = null;
    try { title = require('./titles').titleOf(bot); } catch (e) { title = null; }
    return title ? one([
        "i'm " + who + ", " + title + ".", who + ". " + title + ", they call me.", "the name's " + who + " - " + title + ".",
        who + ", " + title + ". and you?", "me? " + who + ", " + title + ".", "i'm " + who + ". " + title + ", if you like titles.",
        who + " here - " + title + ". and you?", "you're talking to " + who + ", " + title + ".", "i go by " + who + ". " + title + ", to some.",
        who + ". some call me " + title + ".", "it's " + who + ", " + title + ". yourself?"
    ]) : one([
        "i'm " + who + ". and you?", "the name's " + who + ". you?", who + ". who's asking?", "me? " + who + ". and yourself?",
        "just " + who + ". nobody special.", who + ", pleased to meet you. you?", "i go by " + who + ". yourself?", who + ". you are?",
        "it's " + who + ". and you'd be?", "they call me " + who + ". you?"
    ]);
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
            "new here? you'll get the hang of it, {n}.",
            "welcome to it, {n}. we were all new once.",
            "good to have you, {n}. it's a big old place.",
            "a newcomer! welcome, {n}.",
            "hello {n}, and welcome. don't mind the goblins.",
            "new blood - welcome aboard, {n}.",
            "welcome, {n}. you've picked a fine place to start.",
            "ah, just starting, {n}? you're in for a treat.",
            "welcome, {n}. mind the dark wizards south of Varrock.",
            "hiya {n}. new, eh? you'll do fine."
        ]).replace('{n}', name);
        const forks = one([
            "what do you fancy training first?",
            "want a tip for making some starting coin?",
            "ask me anything - where to fish, mine, that sort of thing.",
            "what do you want to be - fighter, miner, fisher?",
            "want to know where the easy coin is?",
            "anything you're stuck on? shout.",
            "what are you looking to get into?",
            "want a hand finding your feet?",
            "fancy a pointer on where to start?",
            "any questions? i've been round the block."
        ]);
        line = join(voiced(bot, lead + (tip && tip.text ? ' ' + tip.text : '')), voiced(bot, forks));
        return { line, expecting: { kind: 'free', about: 'newbie' }, close: false };
    }

    // good luck / have fun / take care -> reciprocate and close
    if (/\b(good luck|gl hf|gl\b|have fun|enjoy yourself|take care|safe travels|happy hunting)\b/.test(saidFull)) {
        return { line: voiced(bot, one([
            "you too, {n}!", "cheers, {n} - you too!", "thanks, same to you, {n}!", "and you, {n}. mind how you go.",
            "ta, {n}. same to you.", "likewise, {n}!", "you as well, {n}. stay out of trouble.", "cheers {n}, and yourself!",
            "back at you, {n}.", "thanks {n}. don't die out there.", "same to you, {n}. see you about.", "and to you, {n}!"
        ]).replace('{n}', name)), close: true };
    }

    // add me / be my friend -> a warm yes
    if (/\b(add me|be my friend|be friends|can we be friends|add you back|friend request)\b/.test(saidFull)) {
        try { social.noteInteraction(bot, speaker.username, 1); } catch (e) {  }
        return { line: voiced(bot, one([
            "sure, {n} - good to know you!", "aye, consider us mates, {n}!", "of course, {n}. see you around!", "gladly, {n}!",
            "course, {n}. always room for another mate.", "done, {n}. you're on the list.", "ha, sure {n}. friends it is.",
            "why not, {n}. good to have you.", "aye, go on then, {n}!", "you're alright, {n}. mates it is.",
            "sure thing, {n}. shout whenever.", "of course, {n}. i'll keep an eye out for you."
        ]).replace('{n}', name)) };
    }

    // "can i join your clan?" -> welcome them if in one, else say so honestly.
    if (/\b(join (your |the )?clan|can i join|let me join|invite me)\b/.test(saidFull) && /clan/.test(saidFull)) {
        let mine = null;
        try { mine = require('../clan').getClan(bot); } catch (e) {  }
        if (mine) {
            return { line: voiced(bot, "we're " + mine.name + " -- ::joinclan " + mine.name + " and i'll wave you in.") };
        }
        return { line: voiced(bot, one([
            "i'm not in a clan myself, sorry.", "no clan for me right now.", "you'd have to find a clan with a spot - try the Find list.",
            "no clan here, i'm afraid. i go my own way.", "i've no clan to offer, sorry.", "not in one, {n}. can't help you there.",
            "clanless, me. try the Find list.", "i'd let you in if i had one. i don't.", "no clan, sorry. i keep my own company.",
            "not me - i've never joined one."
        ]).replace('{n}', name)) };
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
            return { line: voiced(bot, one([
                near.username + "? right over there.", "aye, " + near.username + "'s about - just here.", near.username + "'s nearby, yeah.",
                "yeah, " + near.username + " is stood right there.", near.username + "? look around, they're close.",
                "just seen " + near.username + " - a few steps off.", near.username + " is about, aye.", "yep, " + near.username + "'s here.",
                near.username + "? not gone far.", "there - " + near.username + ", by you."
            ])) };
        }
        if (/\b(seen|spotted) (anyone|anybody|any1|people|players|folk)\b/.test(saidFull)) {
            return { line: voiced(bot, one([
                "a few folk about, yeah.", "aye, it's not quiet round here.", "some, here and there.", "the usual faces.",
                "a handful. nobody you'd write home about.", "plenty, if you count me.", "a few passing through.",
                "it's been busy enough today.", "one or two. quiet, mostly.", "aye, people come and go."
            ])) };
        }
    }

    switch (type) {
        case 'greet': {
            const repeat = t.history.length >= 2 && t.history[t.history.length - 2].act === 'greet';
            const toldBack = human && !repeat ? recallTold(bot, speaker.username, 9000) : null;
            if (repeat) line = gen(bot, 'reactRepeatGreet', { name });
            else if (toldBack && nowTick(bot) - toldBack.tick > 60 && Math.random() < 0.75) {
                line = voiced(bot, join(one([
                    "{n}!", "back again, {n}?", "oh, it's you, {n}.", "ah, {n}.", "hello again, {n}.", "{n}, hello.",
                    "there you are, {n}.", "well, if it isn't {n}.", "{n}! good timing.", "alright, {n}."
                ]).replace('{n}', name), toldQuestion(bot, toldBack, name, false)));
                expecting = { kind: 'free', about: 'told' };
            }
            else if (mem && mem.met > 1 && nowTick(bot) - (mem.lastSeen || 0) > 300 && Math.random() < 0.5) line = voiced(bot, one([
                "back again, {n}?", "{n}! good to see you again.", "oh, it's you, {n}. how've you been?", "{n}! been a while.",
                "well, look who it is. hello, {n}.", "{n}! thought you'd gone off somewhere.", "ah, {n}. still about, then?",
                "hello stranger. how've you been, {n}?", "{n}, hello again. how've you been?", "long time no see, {n}.",
                "{n}! where've you been hiding?", "you again, {n}? good.", "ah, a familiar face. hello, {n}.", "{n}! still alive, i see."
            ]).replace('{n}', name));
            else line = gen(bot, rel >= 3 ? 'greetFriend' : 'reactGreetBack', { name });
            if (/how've you been/.test(line || '')) expecting = { kind: 'free', about: 'howareyou' };
            else if (!expecting && human && Math.random() < 0.25 + p.sociability * 0.4) {
                const n = notice(bot, speaker, mem);
                if (n) { tail = voiced(bot, n.text); if (/\?$/.test(n.text)) expecting = { kind: 'free', about: 'notice' }; }
                else if (Math.random() < 0.5) { tail = voiced(bot, one([
                    "what brings you out here?", "what are you up to today?", "off somewhere?", "what's the plan today?",
                    "what are you after?", "anything on today?", "where are you headed?", "what are you up to?",
                    "much on today?", "on your way somewhere?", "what's brought you this way?", "busy day?"
                ])); expecting = { kind: 'free', about: 'activity' }; }
            }
            break;
        }
        case 'howAreYou':
            line = voiced(bot, moodLine(bot));
            if (Math.random() < 0.9) { tail = voiced(bot, one([
                "you?", "and yourself?", "how about you?", "yourself?", "and you?", "you alright?", "how's yourself?",
                "how are you keeping?", "how's things with you?", "you doing alright?", "what about you?", "how're you getting on?",
                "you well?", "and how's you?", "how's your day going?", "how about yourself?", "you keeping well?",
                "how's life treating you?", "and you - all good?", "how are you finding it?"
            ])); expecting = { kind: 'free', about: 'howareyou' }; }
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
            if (news) line = voiced(bot, Math.random() < 0.5 ? news : one([
                "well - ", "let me think. ", "since you ask: ", "oh, ", "funny you should ask - ", "actually, ",
                "now you mention it, ", "hm, let's see. ", "one thing - ", "you'll never guess - ", "not a lot, except ", "as it goes, "
            ]) + news);
            else line = voiced(bot, one([
                "not much, honestly - {act}.", "same old. {act}.", "nothing to report. {act}.", "quiet day. {act}.",
                "nothing you'd call news. {act}.", "same as yesterday - {act}.", "all quiet. {act}.", "not a lot - {act}.",
                "nothing exciting. {act}.", "can't think of anything. {act}.", "no drama, thankfully. {act}.", "little and often. {act}.",
                "the usual. {act}.", "nowt much. {act}.", "same routine - {act}.", "you know how it is. {act}."
            ]).replace('{act}', hearing.activityLine(bot, true)));
            if (human && Math.random() < 0.7) { tail = voiced(bot, one([
                "you?", "what about you?", "anything on your end?", "any news your side?", "and yourself?", "what've you been up to?",
                "anything new with you?", "how about you?", "what's your news?", "you been up to much?", "anything happening your way?",
                "and you - anything to tell?", "what about your day?", "anything worth telling?"
            ])); expecting = { kind: 'free', about: 'news' }; }
            break;
        }
        case 'wellbeing':
            line = voiced(bot, u.sentiment < 0
                ? one([
                    "sorry to hear that, {n}.", "rough, that. hang in there, {n}.", "ah, it'll pass, {n}.", "that's no good, {n}.",
                    "sorry, {n}. days like that come and go.", "ah, {n}. chin up.", "bad luck, {n}. it'll turn.", "ugh. sorry to hear it, {n}.",
                    "we've all been there, {n}.", "that's rough, {n}. hang on in there.", "oh no, {n}. what happened?", "shame, that. take it easy, {n}."
                ])
                : u.sentiment > 0 ? one([
                    "good to hear, {n}!", "ha, glad someone's thriving.", "that's what i like to hear.", "grand, {n}!", "good on you, {n}.",
                    "nice one, {n}. keep it up.", "glad to hear it, {n}.", "that's the way, {n}.", "someone's having a good day, then.",
                    "good stuff, {n}.", "ha, lucky you.", "long may it last, {n}."
                ])
                    : one([
                        "fair enough.", "same old, then.", "can't ask for more than that.", "ticking over, then.", "could be worse, eh?",
                        "fair. same here, mostly.", "that'll do, {n}.", "middling's fine by me.", "nowt wrong with steady.", "aye, know the feeling.",
                        "not bad is not bad, {n}.", "good enough, then."
                    ])).replace('{n}', name);
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
                else { tail = voiced(bot, one([
                    "what about you?", "and you?", "you?", "what are you up to?", "yourself?", "how about you?", "and what are you doing?",
                    "what's your plan?", "what are you on with?", "what've you got on?", "you up to much?", "and yourself?",
                    "what are you after today?", "what's keeping you busy?"
                ])); expecting = { kind: 'free', about: 'activity' }; }
            }
            break;
        }
        case 'whoAreYou':
            line = voiced(bot, selfLine(bot));
            break;
        case 'askTenure': {
            // tenure answer sized by combat level, then the ball back
            const cl = bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 3);
            line = voiced(bot, (cl < 15 ? one([
                "not long, {n}. still finding my feet.", "only just started, really.", "new enough to still get lost.", "few days, {n}. still learning.",
                "not long at all. everything's new.", "barely started, {n}.", "a week or so, if that.", "still green, {n}. very green.",
                "just long enough to die a few times.", "not long. still working out which way's north."
            ])
                : cl < 40 ? one([
                    "a fair while now, {n}.", "long enough to know better.", "a good few weeks of it, {n}.", "a couple of months, give or take.",
                    "long enough to have a bank full of junk.", "a while, {n}. not ancient yet.", "some time. i know my way about.",
                    "a good stretch, {n}.", "long enough that the cows fear me.", "on and off for a while, {n}."
                ])
                    : one([
                        "since before you were about, i'd wager.", "years, {n}. feels like it, anyway.", "long enough to have stories.",
                        "too long, {n}. ask anyone.", "since the early days, {n}.", "ages. i've seen this place change.", "longer than i'd admit, {n}.",
                        "long enough to remember when it was quiet.", "donkey's years, {n}.", "a lifetime, near enough."
                    ])).replace('{n}', name));
            if (Math.random() < 0.6) { tail = voiced(bot, one([
                "you?", "and yourself?", "how long have you been at it?", "how about you?", "you been playing long?", "what about you?",
                "yourself?", "been here long yourself?", "you new or an old hand?", "how long for you?", "and you - new or not?",
                "when did you start?", "you been about long?"
            ])); expecting = { kind: 'free', about: 'tenure' }; }
            break;
        }
        case 'askLevel': {
            const cl = bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 3);
            const theirs = speaker.getCombatLevel ? speaker.getCombatLevel() : 0;
            line = voiced(bot, one([
                "i'm combat level " + cl + ".", "combat " + cl + ".", "level " + cl + ", me.", cl + " combat.", "i'm " + cl + " combat.",
                "combat level " + cl + ", for my sins.", "only " + cl + ", combat-wise.", "sitting at " + cl + " combat.", cl + " combat, last i looked.",
                "i'm a " + cl + " in combat."
            ])
                + (theirs ? (theirs > cl + 10 ? one([
                    " you've a fair few on me.", " you're well ahead of me.", " i've some catching up to do.", " you'd have me in a fight.",
                    " you're the big one here.", " you've the edge on me, clearly.", " a way behind you, then.", " you'd flatten me.",
                    " you're miles ahead.", " i'm the small one here."
                ])
                    : theirs < cl - 10 ? one([
                        " you'll catch up.", " give it time, you'll get there.", " you'll be past me before long.", " not far behind, really.",
                        " keep at it and you'll overtake me.", " you'll be there soon enough.", " i had a head start, that's all.", " plenty of time to catch me.",
                        " you're doing fine for where you are.", " i was your level once. it goes quick."
                    ])
                        : one([
                            " about your level, then.", " near enough the same as you.", " we're a fair match.", " much of a muchness with you.",
                            " same boat as you, then.", " neck and neck with you.", " we'd be an even fight.", " close to yours, that.",
                            " we're about level, you and me.", " so we're much the same."
                        ])) : ""));
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
            if (!line) line = voiced(bot, one([
                "not sure where that is, sorry.", "couldn't tell you, {n} - ask around Lumbridge.", "no idea, honestly.",
                "that's a new one on me, {n}.", "haven't a clue, sorry {n}.", "not somewhere i know, that.", "you've got me there, {n}.",
                "i'd be guessing, and i'd guess wrong.", "never heard of it, {n}. sorry.", "beats me. try asking in town.",
                "not my patch, that. couldn't say.", "sorry {n}, i'm no map."
            ]).replace('{n}', name));
            break;
        }
        case 'askHowTo':
        case 'askWhatIs':
        case 'question': {
            let known = null;
            try { known = factionAnswer(bot, speaker, u.norm || u.text, name) || knowledge.answer(bot, u.norm || u.text); } catch (e) { known = null; }
            if (known) {
                const m = mood.of(bot);
                const lead = m.valence > 0.3 && m.energy > 0.15 ? one(['sure - ', 'easy one - ', 'oh, ', '', 'right - ', 'ah, ', 'well, ', 'that one i know - ', 'as it happens, ', 'let me see - ', 'ok, so ', 'good question. ']) : '';
                line = voiced(bot, lead + known.text);
                try { require('./reputation').note(bot, 'help', 1); } catch (e) {  }
            } else if (u.entities.npcs.length || u.entities.items.length || u.entities.skills.length) {
                line = voiced(bot, opinionLine(bot, u));
            } else if (/\byou\b/.test(u.norm) && /\b(like|enjoy|prefer|want|think|reckon)\b/.test(u.norm)) {
                line = voiced(bot, opinionLine(bot, u));
            } else {
                line = gen(bot, 'reactQuestion', { name });
                if (human && p.curiosity > 0.4 && Math.random() < 0.5) { tail = voiced(bot, one([
                    "what are you after, exactly?", "what do you mean?", "go on?", "say again?", "how do you mean?",
                    "what exactly are you asking?", "not sure i follow - what's the question?", "spell it out for me?",
                    "what is it you want to know?", "run that by me again?", "in what sense?", "which bit do you mean?"
                ])); expecting = { kind: 'free', about: 'clarify' }; }
            }
            break;
        }
        case 'askOpinion':
            line = voiced(bot, opinionLine(bot, u));
            if (human && Math.random() < 0.4) { tail = voiced(bot, one([
                "you?", "what do you reckon?", "your take?", "what's your view?", "what do you think?", "you agree?",
                "how about you?", "what would you say?", "am i wrong?", "your thoughts?", "you see it different?", "and you?"
            ])); expecting = { kind: 'free', about: 'opinion' }; }
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
                line = voiced(bot, one([
                    "i'd say " + SKILL_TASTE[best][0] + " - " + SKILL_TASTE[best][2] + ".", SKILL_TASTE[best][0] + ", every time.",
                    SKILL_TASTE[best][0] + ", no contest.", "has to be " + SKILL_TASTE[best][0] + ". " + SKILL_TASTE[best][2] + ".",
                    SKILL_TASTE[best][0] + " for me. " + SKILL_TASTE[best][2] + ".", "easy - " + SKILL_TASTE[best][0] + ".",
                    "i'm happiest " + SKILL_TASTE[best][0] + ", honestly.", SKILL_TASTE[best][0] + ". " + SKILL_TASTE[best][2] + ", after all.",
                    "give me " + SKILL_TASTE[best][0] + " any day.", "probably " + SKILL_TASTE[best][0] + ". always has been."
                ]));
            } else if (/have you (done|finished|completed|beaten)/.test(c) && u.quest) {
                let done = false;
                try { done = questing && questing.isComplete(bot, u.quest.key); } catch (e) { done = false; }
                line = voiced(bot, done ? one([
                    u.quest.name + "? finished it a while back.", "yes - " + u.quest.name + "'s done and dusted.", u.quest.name + "? aye, done that one.",
                    "done " + u.quest.name + ", yeah. took a bit.", u.quest.name + " - finished, thankfully.", "yep, " + u.quest.name + " is behind me.",
                    u.quest.name + "? that's one i've ticked off.", "i have, actually - " + u.quest.name + " was alright.",
                    "long done, " + u.quest.name + ".", u.quest.name + "? yes. wouldn't rush to do it again."
                ]) : one([
                    "not yet - " + u.quest.name + " is on my list.", u.quest.name + "? haven't got round to it.", "no, " + u.quest.name + " is still waiting on me.",
                    u.quest.name + "? one of these days.", "not " + u.quest.name + ", no. keep meaning to.", "still to do " + u.quest.name + ", sadly.",
                    u.quest.name + " - started, never finished.", "no. " + u.quest.name + " keeps slipping my mind.",
                    "haven't done " + u.quest.name + ". should i?", u.quest.name + "? not yet. is it any good?"
                ]));
            } else if (/(have|did) you (ever|once|seen|killed|fought|fight|beaten|beat|kill|meet|met)/.test(c) && u.entities.npcs.length) {
                const n = u.entities.npcs[0];
                let remembered = null;
                if (episodes) {
                    for (const e of episodes.recent(bot, 12)) {
                        if ((e.kind === 'kill' || e.kind === 'boss') && e.foe && e.foe.toLowerCase() === n.name.toLowerCase()) { remembered = "a " + n.name + "? " + episodes.describe(bot, e); break; }
                        if (e.kind === 'death' && e.killer && e.killer.toLowerCase() === n.name.toLowerCase()) { remembered = "one nearly had me, actually - " + episodes.describe(bot, e); break; }
                    }
                }
                line = voiced(bot, remembered || one([
                    "a " + n.name + "? a few times.", "can't say i've crossed a " + n.name + " yet.", n.name + "s - more than i'd like.",
                    "a " + n.name + "? once or twice, aye.", "not a " + n.name + ", no. not yet.", "i've had a run-in with a " + n.name + ", yeah.",
                    n.name + "s? lost count.", "a " + n.name + "? only from a distance.", "i've met a " + n.name + ". didn't go well for one of us.",
                    "a " + n.name + " and i have history.", "not many " + n.name + "s, if i'm honest.", "a " + n.name + "? more than i'd care to remember."
                ]));
            } else if (/been here long|here often|new\b/.test(c)) {
                line = voiced(bot, mem && mem.met > 2 ? one([
                    "long enough to know your face, {n}.", "long enough that i know you, {n}.", "a while, {n}. we've spoken before, after all.",
                    "long enough to have met you a few times, {n}.", "you should know, {n} - you've seen me about.", "we've crossed paths enough, {n}.",
                    "long enough, {n}. you keep turning up, after all.", "i've been here as long as i've known you, {n}.",
                    "a fair while - you'd know, {n}, you're always about.", "ask yourself, {n}. how long have you known me?"
                ]).replace('{n}', name) : one([
                    "long enough.", "a while now.", "feels like forever some days.", "on and off, yeah.", "long enough to know the shortcuts.",
                    "a fair bit. i like it here.", "not that long. long enough.", "years, some days. weeks, others.", "i'm here more than i'm not.",
                    "long enough to get bored of the scenery."
                ]));
            } else {
                const real = episodes && Math.random() < 0.6 ? episodes.storyTopic(bot) : null;
                line = gen(bot, 'tellStory', { name, topic: real || require('./conversation').storyTopic(bot) });
            }
            break;
        }
        case 'offer':
            if (u.entities.items.length) line = voiced(bot, one([
                "a " + u.entities.items[0].name + "? go on then - trade me.", "you're a gem, {n}. send me a trade.", "wouldn't say no. trade me, {n}.",
                "a " + u.entities.items[0].name + "? you're too kind, {n}. trade me.", "i'll take a " + u.entities.items[0].name + " off you gladly - trade me.",
                "a " + u.entities.items[0].name + ", for me? trade me, {n}.", "ooh, a " + u.entities.items[0].name + ". go on, trade me.",
                "can't turn down a " + u.entities.items[0].name + ". send the trade, {n}.", "a " + u.entities.items[0].name + "? aye, trade me and it's yours to give.",
                "that's good of you, {n}. trade me for the " + u.entities.items[0].name + "."
            ]).replace('{n}', name));
            else line = voiced(bot, one([
                "oh, go on then - trade me.", "very kind, {n}. send the trade over.", "for me? ta. trade me and it's a deal.",
                "well, i'll not say no. trade me, {n}.", "that's kind, {n}. send me a trade.", "go on then, {n}. trade me.",
                "ha, alright - trade me and we'll see.", "you're a good sort, {n}. trade me.", "if you're offering - trade me.",
                "cheers {n}. send the trade over."
            ]).replace('{n}', name));
            break;
        case 'request': {
            const it = u.entities.items[0];
            let has = false;
            try { has = !!(it && bot.inventory && bot.inventory.has(it.id)); } catch (e) { has = false; }
            if (it && has && (rel >= 1 || p.sociability > 0.55)) line = voiced(bot, one([
                "i've a " + it.name + " spare - trade me and it's yours.", "sure, {n}. trade me for the " + it.name + ".", "for you, {n}? trade me, i'll hand it over.",
                "aye, got a " + it.name + " here. trade me.", "a " + it.name + "? no bother, {n}. trade me.", "you can have the " + it.name + ", {n}. trade me.",
                "go on then - trade me and the " + it.name + " is yours.", "i've one " + it.name + " going spare. trade me, {n}.",
                "the " + it.name + "? take it, {n}. trade me.", "sure thing. trade me for the " + it.name + ", {n}."
            ]).replace('{n}', name));
            else if (it && !has) line = voiced(bot, one([
                "haven't got a " + it.name + " on me, sorry.", "no " + it.name + " here, {n}.", "wish i could - no " + it.name + "s on me.",
                "fresh out of " + it.name + "s, {n}.", "not carrying a " + it.name + ", sorry.", "a " + it.name + "? not on me, {n}.",
                "no " + it.name + " to give, i'm afraid.", "sorry {n}, i'm out of " + it.name + "s.", "i'd help if i had a " + it.name + ". i don't.",
                "no " + it.name + "s in my pack, {n}. sorry."
            ]).replace('{n}', name));
            else if (rel < 0) line = voiced(bot, one([
                "after everything? no.", "not for you, {n}.", "get lost.", "you've some nerve, {n}.", "no chance.", "not a hope, {n}.",
                "ask someone who likes you.", "no. and don't ask again, {n}.", "you're joking, {n}.", "not after last time."
            ]).replace('{n}', name));
            else line = voiced(bot, one([
                "depends what it is.", "what do you need, exactly?", "maybe - what's it for?", "depends. what are you after?",
                "what do you need, {n}?", "well, what's it for?", "depends what you're asking for.", "go on - what do you need?",
                "that depends on what it is.", "maybe. what's it for, though?", "depends. i'm not made of coin.", "what do you need it for?"
            ]).replace('{n}', name));
            if (/what do you need|what's it for|depends/.test(line)) expecting = { kind: 'free', about: 'request' };
            break;
        }
        case 'status':
            if (/hurt|dying|save me|low (hits|health|hp)|need food|poisoned/.test(u.norm)) {
                line = gen(bot, 'companion', { name }) || voiced(bot, "hang in there, {n} - get some food down you.".replace('{n}', name));
            } else if (/back now|i'm back/.test(u.norm)) line = voiced(bot, one([
                "welcome back, {n}.", "there you are.", "thought we'd lost you.", "wb, {n}.", "ah, you're back.", "back already, {n}?",
                "good, you're back.", "there you are, {n}. miss anything?", "wb! quiet without you.", "you're back, then. good."
            ]).replace('{n}', name));
            else line = voiced(bot, one([
                "no worries, i'll be about.", "take your time, {n}.", "see you in a bit.", "no rush, {n}.", "righto, i'll be here.",
                "go on, i'll keep myself busy.", "ok {n}, catch you after.", "fair enough. back soon, i hope.", "sure, i'll be around.",
                "no bother. don't be long, {n}."
            ]).replace('{n}', name));
            break;
        case 'celebrate': {
            if (rel >= 5) line = voiced(bot, one([
                "that's my mate {n}! knew you had it in you.", "get in, {n}! so proud of you.", "ha! {n}, you legend. well earned.",
                "yes, {n}! i knew you'd do it.", "brilliant, {n}! that's my mate, that is.", "get in there, {n}! you've earned that.",
                "{n}, you beauty! well done.", "ha, {n}! never in doubt.", "that's the stuff, {n}! proud of you.", "well done {n}, you deserve it."
            ]).replace('{n}', name));
            else if (p.sociability > 0.3) line = voiced(bot, one([
                "gz {n}!", "nice one, {n}!", "grats!", "well done, {n}!", "congrats {n}, keep it up.", "gratz, {n}.", "nice, {n}!",
                "good going, {n}!", "well in, {n}.", "gz! what's next?", "congrats, {n}. good effort.", "ha, nice one!",
                "well done {n}. onwards and upwards.", "gz {n}, well earned."
            ]).replace('{n}', name));
            break;
        }
        case 'thanks':
            line = gen(bot, 'reactThanks', { name });
            if (t.turns >= 3 && Math.random() < 0.4) close = true;
            break;
        case 'apology':
            line = voiced(bot, one([
                "no harm done, {n}.", "don't worry about it.", "it's fine, honestly.", "forget it, {n}.", "no bother, {n}.", "we're fine, {n}.",
                "water under the bridge.", "ah, don't fret about it.", "it's alright, {n}. really.", "already forgotten, {n}.", "no need, {n}. it's nothing.",
                "we all slip up. no harm.", "think nothing of it, {n}.", "you're alright, {n}."
            ]).replace('{n}', name));
            break;
        case 'farewell':
            line = gen(bot, 'reactFarewell', { name });
            close = true;
            break;
        case 'acknowledge':
        case 'affirm':
            if (Math.random() < 0.5) line = gen(bot, 'reactAffirm', { name });
            else if (human && p.curiosity > 0.45 && t.turns < 6) { line = voiced(bot, one([
                "so what are you up to today?", "anything i can help with?", "where are you off to?", "what's your plan for today?",
                "what are you after, then?", "what brings you this way?", "anything on today?", "what are you working on?",
                "so, what's the goal today?", "you got much on?", "what are you training at the moment?", "where are you headed next?"
            ])); expecting = { kind: 'free', about: 'activity' }; }
            break;
        case 'deny':
            if (Math.random() < 0.4) line = gen(bot, 'reactDeny', { name });
            break;
        case 'compliment':
            line = gen(bot, 'reactCompliment', { name });
            if (u.entities.items.length && Math.random() < 0.5) tail = voiced(bot, one([
                "it's served me well.", "cost me a fortune, mind.", "found it fair and square.", "had it ages.", "took some saving for, that.",
                "it's seen a few fights.", "a mate sorted me out with it.", "not letting it go, mind.", "cheap, actually. don't tell anyone.",
                "it's the one thing i'd never sell.", "earned every bit of it.", "it does the job."
            ]));
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
                        tail = voiced(bot, one([
                            "i might take it off you.", "what are you after for it?", "trade me if you like.", "i could be interested, mind.",
                            "how much do you want for it?", "i'd take it for the right price.", "make me an offer.", "trade me and we'll talk.",
                            "i'm in the market, as it happens.", "what's your price?", "i might have the coin for that.", "go on, trade me. let's see it."
                        ]));
                    }
                    break;
                }
            }
            // a plan, a find, or talk of a third person get their own reaction
            if (/\b(off to|heading (to|for|out)|going to go|think i'll|gonna go|i'll go|i'm going|i'm off)\b/.test(saidFull)) {
                line = gen(bot, 'reactPlan', { name });
                if (!human && /tag along|see you there/.test(line || '')) expecting = { kind: 'yesno', action: 'tagalong' };
            } else if (u.entities.items.length && /\b(found|picked up|looted|got myself|dropped me|scored|look what)\b/.test(saidFull)) {
                const it = u.entities.items[0];
                line = gen(bot, 'reactFind', { item: (it && it.name) || String(it) });
            } else if (!u.mentionsMe) {
                const lowName = String(name).toLowerCase();
                const other = u.entities.players.find((n) => n && n !== bot.username && String(n).toLowerCase() !== lowName);
                if (other) line = gen(bot, 'reactGossip', { name: other });
            }
            if (line) break;
            if (u.sentiment < 0 && u.mentionsMe) {
                if (human && !bot.opponent && p.sociability > 0.4 && Math.random() < 0.6) {
                    const skill = goals.current(bot) && goals.current(bot).skill;
                    line = voiced(bot, one([
                        "rough day? come " + (skill ? skill.replace(/ing$/, '') + 'ing' : 'along') + " with me, beats moping.",
                        "sounds grim, {n}. want some company?", "chin up, {n}. fancy tagging along with me for a bit?",
                        "that's rubbish, {n}. want to join me for a bit?", "ah, {n}. shall i keep you company a while?",
                        "sorry, {n}. fancy some " + (skill ? skill.replace(/ing$/, '') + 'ing' : 'company') + " with me to take your mind off it?",
                        "bad day, {n}? i'm off " + (skill ? skill.replace(/ing$/, '') + 'ing' : 'wandering') + " - want in?",
                        "cheer up, {n}. want to tag along with me?", "sounds like you could use company, {n}. shall i stick around?",
                        "ugh, sorry {n}. come along with me, it'll pass quicker."
                    ]).replace('{n}', name));
                    expecting = { kind: 'yesno', action: 'tagalong' };
                } else line = voiced(bot, one([
                    "that's rough, {n}.", "sorry to hear it.", "it happens to the best of us.", "ah, bad luck, {n}.", "that's a shame, that.",
                    "sorry, {n}. it'll pass.", "ugh. we've all been there, {n}.", "rotten luck, {n}.", "that's not on, {n}.", "sorry to hear that, {n}. chin up."
                ]).replace('{n}', name));
            } else if (u.entities.skills.length || u.entities.npcs.length || u.entities.items.length || u.placeHit || u.boss) {
                line = voiced(bot, opinionLine(bot, u));
                // a subject was named -> thread it: a tag-along offer to a human, a follow-up to a bot.
                if (u.entities.skills.length && p.sociability > 0.5 && !bot.opponent && Math.random() < 0.4) {
                    if (human) { tail = voiced(bot, one([
                        "mind if i join you?", "want a hand with that?", "room for one more?", "fancy some company for it?", "could i tag along?",
                        "shall i join you for a bit?", "want a partner in that?", "mind some company?", "any room for me in that?", "can i come along?"
                    ])); expecting = { kind: 'yesno', action: 'tagalong' }; }
                    else { tail = voiced(bot, one([
                        "how's it going for you?", "what level are you at?", "found any good spots for it?", "getting anywhere with it?",
                        "how long have you been at it?", "is it paying?", "is it slow going?", "what are you aiming for with it?",
                        "any tips for it?", "you enjoying it?", "where do you do it?", "what's your level in it now?"
                    ])); expecting = { kind: 'free', about: 'skill' }; }
                }
            } else if (u.sentiment > 0) {
                line = voiced(bot, one([
                    "glad to hear it, {n}.", "good stuff.", "can't argue with that.", "good to hear, {n}.", "nice one.", "that's the way.",
                    "grand.", "aye, good.", "ha, fair play.", "good on you, {n}.", "that's what i like to hear.", "sounds good, {n}.",
                    "well, good.", "can't complain about that.", "happy days.", "nice, {n}.", "good going.", "that'll do nicely.",
                    "ha, good for you, {n}.", "that's cheered me up, that."
                ]).replace('{n}', name));
                // a bot moves the exchange on rather than ending on an ack
                if (!human && Math.random() < 0.4) {
                    const mine = newsLine(bot, 1500) || hearing.activityLine(bot, false);
                    if (mine) { tail = voiced(bot, mine); }
                }
            } else if (Math.random() < 0.25 && newsLine(bot, 1500)) {
                line = voiced(bot, one([
                    "guess what - ", "oh, ", "you'll like this: ", "here's a thing - ", "funny you should say. ", "that reminds me - ",
                    "listen to this: ", "get this - ", "speaking of which, ", "as it happens, ", "you'll never guess - ", "so, "
                ]) + newsLine(bot, 1500));
            } else if (p.curiosity > 0.4 && t.turns <= 4 && !t.asked.activity && Math.random() < (human ? 0.6 : 0.4)) {
                // asked once per thread
                t.asked.activity = nowTick(bot);
                line = voiced(bot, one([
                    "so what are you up to?", "what are you up to these days?", "and what are you up to?", "what are you doing over here?",
                    "what are you on with today?", "what's your plan, then?", "what are you after round here?", "what are you working on?",
                    "what brings you this way?", "what are you training these days?", "what's the goal today?", "you up to much?",
                    "what have you got on?", "what are you doing with yourself?"
                ]));
                expecting = { kind: 'free', about: 'activity' };
            } else if (t.topic && t.topic.kind !== 'activity' && Math.random() < 0.6) {
                // nothing new named: a word on the current subject
                line = voiced(bot, topicRemark(bot, t.topic) || '');
                if (!line) line = gen(bot, 'reactAgree', { name });
            } else if (Math.random() < 0.3 + p.sociability * 0.3) {
                line = gen(bot, Math.random() < 0.5 ? 'reactAgree' : 'reactLaugh', { name });
            }
        }
    }

    // one follow-up question per subject
    if (line && !tail && !expecting && t.topic && t.topic.name && !t.asked[t.topic.name] && Math.random() < (human ? 0.4 : 0.55)) {
        const f = topicFollowUp(bot, t.topic);
        if (f) { t.asked[t.topic.name] = nowTick(bot); tail = voiced(bot, f); expecting = { kind: 'free', about: 'topic' }; }
    }

    // a secondary act ("hi, ..." / "..., thanks") gets a few words in front
    if (secondary && line) {
        if (secondary.type === 'greet' && type !== 'greet') line = join(voiced(bot, one([
            "hello, {n}.", "hi, {n}.", "hey, {n}.", "alright, {n}.", "hiya, {n}.", "{n}, hello.", "oh, hello {n}.", "hi there, {n}.",
            "ah, {n}. hello.", "hey there, {n}.", "afternoon, {n}.", "hello there, {n}."
        ]).replace('{n}', name)), line);
        else if (secondary.type === 'thanks' && type !== 'thanks') line = join(line, voiced(bot, one([
            "no bother.", "no problem.", "any time.", "don't mention it.", "you're welcome.", "no worries.", "happy to help.",
            "that's alright.", "not at all.", "glad to."
        ])));
        else if (secondary.type === 'compliment' && type !== 'compliment') line = join(voiced(bot, one([
            "cheers!", "ta!", "ha, thanks.", "you're too kind.", "aw, cheers.", "thanks, that's nice of you.", "well, thank you.",
            "ha, stop it.", "kind of you to say.", "cheers, i try."
        ])), line);
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
