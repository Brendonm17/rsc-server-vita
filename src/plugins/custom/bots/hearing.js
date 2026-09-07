// a bot hears nearby overhead speech and party chat, works out the intent and entities,
// and responds and acts on it. gated by personality, relationship, and trust; loop-safe, rate-limited.

const HEAR_RANGE = 6;
const PLANE = 944;

let personality, mood, social, trades, chatgen, goals, travel, regions, knowledge, reputation, party, partyCoord;
// the conversation manager, resolved once
let _dialogueMod = null;
function dialogueMod() { return _dialogueMod || (_dialogueMod = require('./dialogue')); }
function deps() {
    if (personality) return;
    personality = require('./personality');
    mood = require('./mood');
    social = require('./social-emergent');
    trades = require('./trades');
    chatgen = require('./chatgen');
    goals = require('./goals');
    travel = require('./travel');
    knowledge = require('./knowledge');
    party = require('../party');
    partyCoord = require('./party-coord');
    try { reputation = require('./reputation'); } catch (e) { reputation = null; }
    try { regions = require('./regions'); } catch (e) { regions = null; }
}

// ---- intent patterns (checked most-specific first) -------------------------
const P = {
    farewell: /\b(bye|cya|see ya|see you|later|laters|gtg|got to go|logging|good ?night|nite|farewell|take care)\b/i,
    thanks: /\b(thanks|thank you|thankyou|ty|thx|cheers|appreciate|appreciated|much obliged)\b/i,
    celebrate: /\b(level \d+|ding|just hit|levell?ed up|reached \d+|new record|finally.*\d+)\b|they call me (the )?\w+ now/i,
    insult: /\b(noob|nub|trash|loser|idiot|stupid|dumb|ez|scrub|clown|suck|sucks|garbage|rekt|owned|weak|pathetic|coward|useless|bad)\b/i,
    compliment: /\b(nice|awesome|cool|amazing|impressive|good job|well done|gz|grats|congrats|legend|goat|pro|skilled|strong)\b/i,
    laugh: /\b(lol|lmao|lmfao|rofl|haha+|hehe+|xd|:d|:\)|funny)\b/i,
    affirm: /\b(yes|yeah|yep|yup|sure|ok|okay|aye|alright|sounds good|i'?m in|count me in|let'?s do it|deal|agreed|for sure|yes please|go on then|i'?ll take it)\b/i,
    deny: /\b(no|nah|nope|not really|i'?ll pass|maybe later|no thanks|not now|hard pass|no room)\b/i,
    // someone offering this bot a gift ("want my spare X?", "fancy this X?")
    giftoffer: /\bmy spare\b|\bfancy this\b|\bgot a spare\b|\byours if you like\b|\bwant it\b\s*\??\s*$/i,
    status: /\b(brb|afk|be right back|back now|i'?m back|low hp|low health|low|oom|out of (food|runes|arrows|prayer)|need food|dying|help me|save me)\b/i,
    trade: /\b(trade|trading|selling|sell|buying|buy|wtb|wts|price|how much|deal|offer|swap)\b/i,
    party: /\b(party|team up|group|join|lfg|lfm|lfp|join me|need (a|one) more|team)\b/i,
    // a help/assist request aimed at the bot (not a bare "help me!" cry): triggers a real party offer
    help: /\b(help me (with|to|do|kill|train|fight|finish|get|find|beat|mine|fish|chop|quest)|can (you|u) help|could (you|u) help|would (you|u) help|will (you|u) help|need (a hand|some help|help with|backup|a partner|a mate)|give me a hand|lend (me )?a hand|come (help|adventure|quest))\b/i,
    // command / request
    follow: /\b(follow me|follow|come with|with me|stick with me|on me)\b/i,
    come: /\b(come here|come over|over here|get over here|to me|this way)\b/i,
    wait: /\b(wait|hold on|hold up|stop|stay|halt|one sec|hang on|give me a sec)\b/i,
    lead: /\b(lead the way|you lead|after you|go ahead)\b/i,
    // mission proposals
    propose: /\b(let'?s|lets|who'?s? up for|anyone up for|shall we|wanna|want to|we should|how about)\b.*\b(hunt|kill|fight|slay|take (down|on)|train|level|grind|mine|mining|chop|woodcut|fish|fishing|explore|adventure|money|gold|cash|rich|gear|quest|bank|shop|go)\b/i,
    goto: /\b(let'?s go|go to|head to|meet (me |us )?at|to the)\b/i,
    greet: /\b(hi|hey|hello|yo|sup|hiya|heya|greetings|howdy|good ?(morning|day)|morning|afternoon|evening|wsg|what'?s up)\b/i,
    question: /\?|\b(where|how|what|why|who|when|which|anyone|any1|anybody|can you|do you|does anyone|know where)\b/i
};

// ---- entity vocab ----------------------------------------------------------
const BOSS_KEYWORDS = [
    ['red dragon', 'a Red Dragon'], ['dragon', 'a Red Dragon'],
    ['greater demon', 'a Greater Demon'], ['lesser demon', 'a Lesser Demon'], ['demon', 'a Lesser Demon'],
    ['ice giant', 'an Ice Giant'], ['moss giant', 'a Moss Giant'],
    ['black knight', 'a Black Knight'], ['white knight', 'a White Knight'], ['knight', 'a Black Knight'],
    ['giant', 'a Giant']
];
// keyword -> travel.FACILITIES key (resolved to nearest matching facility)
const PLACE_KEYWORDS = [
    ['bank', ['draynor_bank', 'alkharid_bank', 'varrock_west_bank']],
    ['mine', ['alkharid_mine']], ['mining', ['alkharid_mine']],
    ['trees', ['lumbridge_trees']], ['wood', ['lumbridge_trees']], ['chop', ['lumbridge_trees']],
    ['shop', ['lumbridge_general']], ['store', ['lumbridge_general']], ['general', ['lumbridge_general']],
    ['docks', ['port_sarim_docks']], ['boat', ['port_sarim_docks']], ['port', ['port_sarim_docks']],
    ['lumbridge', ['lumbridge_spawn']], ['draynor', ['draynor_bank']],
    ['al-kharid', ['alkharid_bank']], ['kharid', ['alkharid_bank']], ['varrock', ['varrock_west_bank']]
];
const ACTIVITY_KEYWORDS = [
    [/\b(money|gold|cash|rich|coin|profit)\b/i, 'getRich'],
    [/\b(train|level|levels|grind|xp|combat)\b/i, 'levelUp'],
    [/\b(gear|armour|armor|weapon|equip)\b/i, 'gearUp'],
    [/\b(explore|adventure|roam|sightsee|travel)\b/i, 'explore'],
    [/\b(mine|mining|ore)\b/i, 'skill:mining'],
    [/\b(chop|woodcut|wood ?cutting|logs)\b/i, 'skill:woodcutting'],
    [/\b(fish|fishing)\b/i, 'skill:fishing']
];

// match a named boss against the current boss list: first by core name ("blue dragon"),
// then by a bare type word ("dragon" -> the toughest dragon). cores computed once per table.
let _bossSrc = null;
let _bossCores = null;
function bossCores() {
    const bosses = goals.BOSSES || [];
    if (bosses !== _bossSrc || _bossCores.length !== bosses.length) {
        _bossSrc = bosses;
        _bossCores = bosses.map((b) => ({
            b,
            core: b.name.replace(/^(a|an|the)\s+/i, '').toLowerCase(),
            lower: b.name.toLowerCase()
        }));
    }
    return _bossCores;
}
const BOSS_TYPES = ['dragon', 'demon', 'giant', 'spider', 'knight', 'ogre', 'skeleton', 'zombie', 'druid', 'thug', 'hobgoblin', 'warrior'];
function findBoss(text) {
    const t = text.toLowerCase();
    const cores = bossCores();
    let best = null, bestLen = 0;
    for (let i = 0; i < cores.length; i++) {
        const core = cores[i].core;
        if (core.length > bestLen && t.indexOf(core) !== -1) { best = cores[i].b; bestLen = core.length; }
    }
    if (best) return best;
    for (const w of BOSS_TYPES) {
        if (t.indexOf(w) === -1) continue;
        for (let i = cores.length - 1; i >= 0; i--) { // list is easy->hard, so the toughest
            if (cores[i].lower.indexOf(w) !== -1) return cores[i].b;
        }
    }
    return null;
}
// which place keyword a line names (text-only, cached per line); the nearest facility is chosen in findPlace
function placeKeyword(t) {
    for (const [kw, keys] of PLACE_KEYWORDS) {
        if (t.indexOf(kw) !== -1) {
            for (const k of keys) {
                const f = travel.FACILITIES && travel.FACILITIES[k];
                const tgt = f && (f.target || f);
                if (tgt && typeof tgt.x === 'number') return { kw, keys };
            }
        }
    }
    return null;
}
function placeFor(bot, hit) {
    if (!hit) return null;
    // pick the nearest facility among the candidates
    let best = null, bestD = Infinity;
    for (const k of hit.keys) {
        const f = travel.FACILITIES && travel.FACILITIES[k];
        const tgt = f && (f.target || f);
        if (tgt && typeof tgt.x === 'number') {
            const d = Math.abs(bot.x - tgt.x) + Math.abs(bot.y - tgt.y);
            if (d < bestD) { bestD = d; best = { key: k, x: tgt.x, y: tgt.y, label: hit.kw }; }
        }
    }
    return best;
}
function findPlace(bot, text) {
    return placeFor(bot, placeKeyword(text.toLowerCase()));
}
function findActivity(text) {
    for (const [re, act] of ACTIVITY_KEYWORDS) {
        if (re.test(text)) return act;
    }
    return null;
}

// classify a heard line. the bot-independent part (boss/activity/quest/place lookups + intent
// regexes) is computed once per distinct line and cached; regex results are memoised lazily.
const QUEST_PROPOSE = /\b(let'?s|lets|shall we|wanna|want to|we should|fancy|up for)\b/i;
const CLASSIFY_CACHE = new Map();
const CLASSIFY_CACHE_MAX = 256;
function classify(text) {
    let c = CLASSIFY_CACHE.get(text);
    if (c) return c;
    if (CLASSIFY_CACHE.size >= CLASSIFY_CACHE_MAX) CLASSIFY_CACHE.clear();
    const lower = text.toLowerCase();
    let quest = null;
    try { quest = knowledge.findQuest(lower); } catch (e) { quest = null; }
    c = {
        lower,
        boss: findBoss(text),
        placeHit: placeKeyword(lower),
        activity: findActivity(text),
        quest,
        questPropose: quest ? QUEST_PROPOSE.test(text) : false,
        flags: {}
    };
    CLASSIFY_CACHE.set(text, c);
    return c;
}
function flag(c, text, name) {
    const f = c.flags;
    const v = f[name];
    if (v !== undefined) return v;
    return (f[name] = P[name].test(text));
}
function parse(text, bot) {
    deps();
    const c = classify(text);
    const addressed = bot && bot.username && c.lower.indexOf(bot.username.toLowerCase()) !== -1;
    const boss = c.boss;
    const place = bot ? placeFor(bot, c.placeHit) : null;
    const activity = c.activity;
    const quest = c.quest;
    let intent = 'statement';
    // order matters: commands + proposals before generic greet/question
    if (flag(c, text, 'insult')) intent = 'insult';
    else if (flag(c, text, 'thanks')) intent = 'thanks';
    else if (flag(c, text, 'celebrate')) intent = 'celebrate';
    else if (flag(c, text, 'propose') || (flag(c, text, 'goto') && (place || boss)) ||
        (quest && c.questPropose)) intent = 'propose';
    else if (flag(c, text, 'giftoffer')) intent = 'giftoffer';
    else if (flag(c, text, 'follow')) intent = 'follow';
    else if (flag(c, text, 'come')) intent = 'come';
    else if (flag(c, text, 'wait')) intent = 'wait';
    else if (flag(c, text, 'help')) intent = 'help';
    else if (flag(c, text, 'party')) intent = 'party';
    else if (flag(c, text, 'trade')) intent = 'trade';
    else if (flag(c, text, 'status')) intent = 'status';
    else if (flag(c, text, 'farewell')) intent = 'farewell';
    else if (flag(c, text, 'compliment')) intent = 'compliment';
    else if (flag(c, text, 'affirm')) intent = 'affirm';
    else if (flag(c, text, 'deny')) intent = 'deny';
    // question before greet, so "hey, what are you doing?" is a question not a hello
    else if (flag(c, text, 'question')) intent = 'question';
    else if (flag(c, text, 'greet')) intent = 'greet';
    else if (flag(c, text, 'laugh')) intent = 'laugh';
    return { intent, boss, place, activity, quest, addressed };
}

// ---- helpers ---------------------------------------------------------------
function nameOf(c) {
    return (c.getFormattedUsername && c.getFormattedUsername()) || c.username || 'friend';
}
// one line out of a list of alternatives
function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}
function say(bot, situation, ctx) {
    deps();
    let line = null;
    try {
        // don't parrot the same line twice in a row
        for (let i = 0; i < 3; i++) {
            line = chatgen.generate(situation, ctx || {}, bot);
            if (!line || line !== bot._lastSaid) break;
        }
    } catch (e) { line = null; }
    if (!line) return;
    bot._lastSaid = line;
    bot._reactionSpeak = true;
    try { bot.broadcastChat(line); } catch (e) {} finally { bot._reactionSpeak = false; }
}
function sayRaw(bot, text) {
    // hand-built lines still go out in the bot's own voice, for consistent speech
    let out = text;
    try { out = require('./voice').apply(bot, text); } catch (e) {}
    bot._reactionSpeak = true;
    try { bot.broadcastChat(out); } catch (e) {} finally { bot._reactionSpeak = false; }
}

function inSameParty(bot, speaker) {
    return !!(bot.party && bot.party.members && speaker.username &&
        bot.party.members.some((m) => m.username === speaker.username));
}
// 0..1 how much the bot trusts this voice enough to obey it.
function trust(bot, speaker, opts) {
    if (opts && opts.fromLeader) return 0.9;
    if (inSameParty(bot, speaker)) return 0.6;
    const rel = social.sentiment(bot, speaker.username);
    if (rel >= 3) return 0.5;
    if (rel >= 1) return 0.35;
    if (rel < 0) return 0.05;
    return 0.15;
}
function obeys(bot, speaker, opts) {
    const t = trust(bot, speaker, opts);
    if (t < 0.2) {
        return false; // a bot won't take orders from a stranger or someone it dislikes
    }
    const p = personality.of(bot);
    const c = t * (0.5 + p.sociability * 0.5) + (0.5 - p.aggression) * 0.1;
    return Math.random() < Math.max(0, Math.min(0.95, c));
}

// cardinal direction from a to b (RSC: north = +y).
function direction(bot, x, y) {
    // RSC coords: higher x = west, higher y = south
    const dx = x - bot.x, dy = y - bot.y;
    let s = '';
    if (dy > 8) s += 'south'; else if (dy < -8) s += 'north';
    if (dx > 8) s += (s ? '-' : '') + 'west'; else if (dx < -8) s += (s ? '-' : '') + 'east';
    return s || 'right here';
}

// ---- mission adoption ------------------------------------------------------
// set a bot's goal from a chat proposal (reuses the goal->behaviour machinery)
function adoptMission(bot, spec) {
    deps();
    let type = 'levelUp', opts = {};
    if (spec.boss) { type = 'boss'; opts.boss = spec.boss; opts.tier = 'large'; }
    else if (spec.activity) {
        if (spec.activity.indexOf('skill:') === 0) { type = 'skill'; opts.skill = spec.activity.split(':')[1]; }
        else type = spec.activity;
    }
    try { goals.adopt(bot, type, opts); } catch (e) {}
    // if in a party, make this the shared mission so everyone rallies and converges
    if (bot.party) {
        try {
            partyCoord.setMission(bot.party, { type, boss: spec.boss || null, place: spec.place || null });
        } catch (e) {
            bot.party._chatMission = { type, boss: spec.boss || null, place: spec.place || null };
        }
    }
    // if a place was named (and no boss), head there
    if (spec.place && !spec.boss) {
        bot._chatGoto = { x: spec.place.x, y: spec.place.y, ticks: 400 };
    }
    return type;
}

const MISSION_RICH = ['a money run', 'a bit of coin', 'some gold', 'making some gp', 'a profit run', 'filling the bank',
    'earning some coin', 'a cash grab', 'a bit of merching', 'getting rich', 'a coin run', 'some honest profit', 'a gp run'];
const MISSION_LEVEL = ['some training', 'a grind', 'some xp', 'a few levels', 'a training session', 'levelling up',
    'a bit of grinding', 'getting some levels', 'an xp run', 'some combat training', 'hitting things for xp', 'a level or two', 'a training run'];
const MISSION_GEAR = ['a gear hunt', 'an upgrade run', 'some new kit', 'a bit of gear hunting', 'better armour', 'a shopping trip',
    'a weapon upgrade', 'kitting up', 'sorting our gear', 'a proper kit', 'an armour run', 'finding better gear', 'an upgrade hunt'];
const MISSION_EXPLORE = ['an adventure', 'a wander', 'a bit of exploring', 'seeing the sights', 'a roam', 'a trek', 'a look around',
    'a proper adventure', 'a stroll somewhere new', 'exploring', 'a jaunt', 'an expedition', 'a ramble'];
function missionPhrase(spec) {
    if (spec.boss) {
        const n = spec.boss.name;
        return pick(['hunting ' + n, 'a crack at ' + n, 'going after ' + n, 'a go at ' + n, 'taking on ' + n, 'a scrap with ' + n,
            'having a word with ' + n, 'fighting ' + n, 'a run at ' + n, 'tracking down ' + n, 'a fight with ' + n, 'sorting out ' + n, 'a hunt for ' + n]);
    }
    if (spec.activity === 'getRich') return pick(MISSION_RICH);
    if (spec.activity === 'levelUp') return pick(MISSION_LEVEL);
    if (spec.activity === 'gearUp') return pick(MISSION_GEAR);
    if (spec.activity === 'explore') return pick(MISSION_EXPLORE);
    if (spec.activity && spec.activity.indexOf('skill:') === 0) {
        const s = spec.activity.split(':')[1];
        return pick(['some ' + s, 'a bit of ' + s, s + ' training', 'a ' + s + ' session', 'some ' + s + ' xp', 'a bit of ' + s + ' grinding',
            'grinding ' + s, s + ' for a while', 'a ' + s + ' run', 'levelling ' + s, 'a spot of ' + s, 'a ' + s + ' grind', 'a bit of ' + s + ' xp']);
    }
    if (spec.place) {
        const l = spec.place.label;
        return pick(['a trip to the ' + l, 'a walk to the ' + l, 'heading to the ' + l, 'a run to the ' + l, 'the ' + l, 'popping to the ' + l,
            'a visit to the ' + l, 'the ' + l + ' trip', 'a jaunt to the ' + l, 'a wander over to the ' + l, 'going to the ' + l, 'a stroll to the ' + l, 'nipping to the ' + l]);
    }
    return pick(MISSION_EXPLORE);
}

// ---- the core: one bot hears a line ---------------------------------------
// opts: { party, fromLeader } when it came from party chat.

// a friendly bot offers a real party invite to a human who asked for help or company.
// gated on relationship, sociability, and being free; a named task is remembered so the pair rally.
function offerHelpParty(bot, speaker, info, opts) {
    deps();
    if (!speaker || speaker.isBot || !speaker.username) return false; // bots recruit each other elsewhere
    const p = personality.of(bot);
    if (p.sociability < 0.25) return false;                           // a true loner won't group up
    const rel = social.sentiment(bot, speaker.username);
    const friendly = rel >= 1 || (rel >= 0 && p.sociability >= 0.45); // a genuinely "friendly" bot
    if (!friendly) return false;

    const name = nameOf(speaker);
    // can't drop what it's doing to help this instant.
    if (bot.opponent || bot._quest || bot._bankRun || bot._foodRun) {
        sayRaw(bot, pick([
            'give me a moment, ' + name + " - i'm in the middle of something.",
            'hang on, ' + name + ', got my hands full right now.',
            'two ticks, ' + name + ' - bit busy this second.',
            'one sec, ' + name + ', let me finish this first.',
            'not right now, ' + name + ' - mid-something. give me a minute.',
            'hold that thought, ' + name + ", i'm a bit tied up.",
            'bear with me, ' + name + ' - nearly done here.',
            'in a bit, ' + name + ". can't drop this just yet.",
            'give us a minute, ' + name + ", i'm right in the thick of it.",
            'sorry ' + name + ", got something on the go. won't be long.",
            'just finishing up, ' + name + ' - stick around.',
            'ask me again in a tick, ' + name + ", i'm busy.",
            "can't this second, " + name + ' - hands are full.',
            'wait one, ' + name + '. nearly free.'
        ]));
        return true;
    }
    // already grouped with them -> just reassure (no duplicate invite).
    if (bot.party && bot.party.members && bot.party.members.some((m) => m && m.username === speaker.username)) {
        sayRaw(bot, pick([
            "i've got your back, " + name + '. what are we doing?',
            "we're already a team, " + name + ". what's the plan?",
            'right behind you, ' + name + '. where to?',
            'say the word, ' + name + " - we're grouped already.",
            "you've got me already, " + name + '. what needs doing?',
            "we're in the same party, " + name + '. just point me at it.',
            'no need to ask twice, ' + name + ", i'm with you. what's up?",
            'already on your side, ' + name + '. lead on.',
            "we're a crew already, " + name + ". what's the job?",
            "you know i'm in, " + name + '. what are we hitting?',
            'same party, same fight, ' + name + ". what's the target?",
            'got you, ' + name + ". tell me what we're doing."
        ]));
        return true;
    }
    // the human is already in another party -> can't invite; offer to tag along instead.
    if (speaker.party) {
        sayRaw(bot, pick([
            'happy to help - lead the way, ' + name + '.',
            'course. you lead, ' + name + ", i'll follow.",
            'go on then, ' + name + ', show me where.',
            "i'll tag along, " + name + '. after you.',
            'right, ' + name + " - walk and i'll keep up.",
            'fair enough, ' + name + ". i'm behind you.",
            'sure thing, ' + name + ". you know the way, i don't.",
            'count me in, ' + name + '. lead on.',
            "i'm with you, " + name + " - just don't lose me.",
            'no bother, ' + name + '. point the way.',
            'ok ' + name + ", i'll shadow you. off we go.",
            "you've got a helper, " + name + '. where are we headed?'
        ]));
        bot._chatGoto = { x: speaker.x, y: speaker.y, ticks: 200 };
        return true;
    }
    // don't spam invites at one person.
    if (bot._helpInviteCd && bot._helpInviteCd > 0) {
        sayRaw(bot, pick([
            "invite's already on its way, " + name + '.',
            'already sent you one, ' + name + ' - check your screen.',
            'sent it, ' + name + '. just accept it.',
            'you should have an invite already, ' + name + '.',
            "one's in the post, " + name + '. have a look.',
            'already invited you, ' + name + ', give it a click.',
            "it's there waiting, " + name + " - accept and we're off.",
            'patience, ' + name + ', the invite went out a moment ago.',
            'check for the invite, ' + name + ', i sent it.',
            "you've got one from me already, " + name + '.',
            'sent, ' + name + '. look for the popup.',
            'already done, ' + name + ' - just say yes to it.'
        ]));
        return true;
    }

    const task = info && (info.quest ? info.quest.name : (info.boss || (info.place && info.place.label) || info.activity));
    let invited = false;
    // party.invite handles the 'target already in a party'/'party full' guards + fires the popup.
    try { party.invite(bot, speaker.username); invited = true; } catch (e) {}
    if (!invited) return false;
    bot._helpInviteCd = 200 + Math.floor(Math.random() * 200);
    // remember a named task + who to expect, so the party rallies the moment the human accepts.
    if (task) bot._pendingHelpMission = { who: speaker.username, boss: info.boss || null, activity: info.activity || null, place: info.place || null, quest: info.quest || null, ticks: 400 };
    sayRaw(bot, task
        ? pick([
            'happy to help with ' + task + ', ' + name + "! sent you a party invite - accept and we'll head off.",
            "course i'll help with " + task + ', ' + name + ". invite sent, accept it and let's go.",
            task + '? count me in, ' + name + ". party invite's on its way.",
            'right, ' + task + ' it is, ' + name + ". sent you an invite - accept and we'll move.",
            "i'm up for " + task + ', ' + name + "! accept the invite and we'll crack on.",
            'sounds good, ' + name + ' - ' + task + '. check for my invite.',
            'i can do ' + task + ', ' + name + '. sent an invite, hop in.',
            "let's sort " + task + ' together, ' + name + ". invite's coming.",
            task + ' with you, ' + name + '? go on then. accept my invite.',
            'you had me at ' + task + ', ' + name + '. invite sent.',
            'aye, ' + task + '. sending you an invite now, ' + name + '.',
            'no problem, ' + name + ' - ' + task + ". accept the party and we'll head off.",
            "i'll come for " + task + ', ' + name + '. look for the invite.'
        ])
        : pick([
            "course i'll help, " + name + '! sent you a party invite.',
            'sure thing, ' + name + ". invite's on its way.",
            'happy to, ' + name + ' - sent you a party invite.',
            'no bother, ' + name + '. check for my invite.',
            "i'm in, " + name + ". accept the party and we'll sort it.",
            'on it, ' + name + '. party invite sent.',
            "you've got me, " + name + ' - look for the invite.',
            'why not, ' + name + '. sent you an invite, hop in.',
            'aye, ' + name + ", i'll lend a hand. invite's coming.",
            'always, ' + name + '. invite sent, click yes.',
            'lead on then, ' + name + ". party invite's in your box.",
            "wouldn't say no, " + name + '. sending an invite now.'
        ]));
    return true;
}

// answer a question with real knowledge where possible.

const GEAR_MAGIC = [
    'i fight with magic, staff and runes.',
    "runes and a staff, that's my kit.",
    'magic all the way - staff in hand, runes in the bag.',
    "i'm a caster. staff, runes, and a lot of shouting.",
    'spells, mostly. the staff is just for show.',
    'i chuck spells at things. works well enough.',
    'mage here - runes are my ammo.',
    'staff and a pocketful of runes. nothing fancy.',
    'i lean on magic. never liked getting close.',
    "just a staff and whatever runes i haven't burnt yet.",
    'magic. i let the runes do the hard work.',
    "a wizard's kit - staff, runes, and hope.",
    "casting spells, mostly. keeps me out of arm's reach."
];
const GEAR_RANGED = [
    'bow and arrows for me.',
    'i shoot things. bow, arrows, keep my distance.',
    "ranger - if it's in sight it's in range.",
    "a bow and a quiver, that's all i need.",
    "arrows. lots of them, if i've remembered to buy some.",
    'i keep a bow strung and my distance kept.',
    "bow work, mostly. i'd rather not get hit.",
    'long bow, short temper.',
    'i do my fighting from a distance, thanks.',
    'a good bow and a bad aim, working on the second.',
    "ranged. it's cheaper than runes and safer than swords.",
    'bow and arrows - nothing gets near me if i can help it.',
    'i pick them off with arrows before they get close.'
];
const GEAR_NONE = [
    "just my trusty fists and whatever i've got.",
    'fists, mostly. and a lot of running.',
    'nothing much - bare hands and bad ideas.',
    "whatever's in my pack. not a lot.",
    'no weapon to speak of. i improvise.',
    'punching things until they stop, honestly.',
    "just fists. it's a phase.",
    'empty hands, full heart.',
    "i'm between weapons at the moment.",
    'bare knuckles and a prayer.',
    'nothing in hand right now - saving up.',
    "fists. don't laugh, it works on chickens.",
    'not a lot, really. i make do.'
];
function gearLine(bot) {
    let line = null;
    try {
        const cb = bot.cache && bot.cache.bot;
        const focus = (cb && cb.focus) || 'auto';
        if (focus === 'magic') line = pick(GEAR_MAGIC);
        else if (focus === 'ranged') line = pick(GEAR_RANGED);
        else {
            const slots = bot.inventory && bot.inventory.equipmentSlots;
            const wi = slots && slots['right-hand'];
            if (typeof wi === 'number' && wi >= 0 && bot.inventory.items[wi]) {
                const items = require('@2003scape/rsc-data/config/items');
                const def = items[bot.inventory.items[wi].id];
                if (def) {
                    const w = def.name.toLowerCase();
                    line = pick([
                        "i'm wielding " + w + '.',
                        'got my ' + w + ' in hand right now.',
                        'this ' + w + ", and it's seen better days.",
                        'swinging my ' + w + ' at the moment.',
                        w + ' for me. does the job.',
                        'just my ' + w + '. nothing to write home about.',
                        'carrying my ' + w + ' - could be worse.',
                        'my ' + w + ". we've been through a lot.",
                        'my trusty ' + w + ", that's my weapon.",
                        'this ' + w + ' and a bit of nerve.',
                        "i'm on the " + w + ' these days.',
                        'the ' + w + ' - not the best, not the worst.',
                        'wielding my ' + w + ', saving up for better.'
                    ]);
                } else line = null;
            }
        }
    } catch (e) {}
    if (!line) line = pick(GEAR_NONE);
    return line;
}

// what the bot is doing, as a sentence or a short phrase.
// short forms are gerund phrases, spliced into "not much, honestly - {act}."
const ACT_RICH_SHORT = ['making some coin', 'chasing coin', 'building up my bank', 'grafting for gold', 'on a money run', 'trying to get rich',
    'scraping coin together', 'filling my pockets', 'on the make', 'stacking coins', 'hunting profit', 'saving up', 'doing a bit of merching', 'working towards a bigger bank'];
const ACT_RICH_LONG = ['just trying to make some money.', 'chasing coin, same as everyone.', 'building the bank, slowly.', 'on a money run - need the gp.',
    "trying to get rich. it's not going well.", 'earning a bit of coin where i can.', "the bank's looking thin so i'm grafting for gold.",
    'making money. the boring kind of adventure.', 'scraping together some coin.', 'saving up for something nice.', "gp, gp, gp. that's the plan today.",
    'trying to turn a profit somewhere.', 'counting coins and wanting more of them.'];
const ACT_LEVEL_SHORT = ['grinding some levels', 'training up', 'chasing levels', 'grinding xp', 'getting some levels in', 'working on my stats', 'on the xp grind',
    'levelling', 'training combat', 'hitting things for xp', 'putting in the levels', 'grinding away', 'chasing the next level', 'getting stronger'];
const ACT_LEVEL_LONG = ['grinding some levels, you know how it is.', "training. the levels won't get themselves.", 'chasing xp, same as always.',
    'putting some levels on. slow going.', "on the grind - next level's close.", 'just training up a bit.', 'working on my stats today.',
    'hitting things until the numbers go up.', 'getting stronger, one level at a time.', "grinding. it's not glamorous.", 'training combat. bit of a slog.',
    "levels, levels, levels. that's the day.", 'trying to get a level before i log.'];
const ACT_GEAR_SHORT = ['hunting better gear', 'after some new gear', 'sorting my kit out', 'upgrading my gear', 'looking for an upgrade', 'shopping for armour',
    'kitting myself out', 'chasing better armour', 'on a gear hunt', 'after a better weapon', 'sorting out my armour', 'hunting for upgrades', 'trying to look less scruffy'];
const ACT_GEAR_LONG = ['hunting for better gear.', 'trying to upgrade my kit.', 'after some proper armour.', 'shopping around for a better weapon.',
    "sorting my gear out - it's a bit rubbish.", 'on the hunt for an upgrade.', 'kitting myself out properly.', "my armour's seen better days, so i'm after new.",
    "looking for gear that isn't falling apart.", 'trying to look the part - new kit.', "gear hunting. the good stuff isn't cheap.",
    'after a weapon that actually hits things.', 'upgrading, bit by bit.'];
const ACT_EXPLORE_SHORT = ['just wandering', 'having a wander', 'seeing the sights', 'exploring a bit', 'roaming about', 'out for a stroll', 'poking about',
    'off exploring', 'wandering the map', 'having a nose around', 'on a bit of an adventure', 'going wherever my feet take me', 'sightseeing', 'out and about'];
const ACT_EXPLORE_LONG = ['just exploring, seeing the sights.', 'having a wander, no real plan.', "roaming about, seeing what's out there.",
    'out for a stroll. nice day for it.', "exploring - i'll end up somewhere.", "poking around places i haven't been.", "wandering the map. it's big.",
    'having a nose around, nothing serious.', 'on a bit of an adventure, i suppose.', 'going wherever the road goes.', 'sightseeing, mostly. the views are free.',
    'just out and about, taking it in.', 'exploring. got lost twice already.'];
const ACT_FIGHT_SHORT = ['in the middle of a scrap', 'fighting something', 'mid-fight', 'having a scrap', 'trading blows', 'busy fighting', 'in a bit of a fight',
    'getting stuck in', 'having a punch-up', 'in combat right now', 'swinging at something', 'in a fight, hang on'];
const ACT_FIGHT_LONG = ['fighting, as it happens.', 'in the middle of a scrap.', "having a fight - can't chat long.", 'trading blows with something ugly.',
    "bit busy, something's trying to kill me.", 'mid-fight. give me a sec.', 'getting stuck in, as you can see.', "fighting. it's going ok, i think.",
    'in a scrap, one moment.', 'swinging at something that swings back.', 'having a bit of a punch-up.', 'combat. the fun kind, hopefully.'];
const ACT_GATHER_SHORT = ['grafting away', 'gathering bits', 'collecting stuff', 'doing some gathering', 'working the land', 'grafting', 'hard at work',
    'getting stuck into some gathering', 'filling my pack', 'putting in a shift', 'busy grafting', 'working away'];
const ACT_GATHER_LONG = ['grafting away, bit by bit.', "gathering. the pack's filling up.", 'doing a bit of gathering, nothing exciting.', 'hard at work, as ever.',
    'putting in a shift out here.', 'working away. slow but steady.', 'collecting bits and bobs.', "filling my pack with whatever's about.",
    "gathering. it's honest work.", "grafting. someone's got to.", 'busy with the gathering, then off to the bank.', 'getting a shift in before i bank.'];
const ACT_IDLE_SHORT = ['keeping busy', 'this and that', 'not a lot', 'the usual', 'bits and pieces', 'odds and ends', 'pottering about', 'nothing special',
    'same as ever', 'mucking about', 'killing time', 'bit of everything'];
const ACT_IDLE_LONG = ['oh, just keeping busy.', 'this and that, you know.', 'not a lot, honestly.', 'the usual. nothing exciting.',
    'bits and pieces, nothing to shout about.', 'pottering about, really.', 'same as ever, keeping myself occupied.', 'mucking about, mostly.',
    'killing time till something turns up.', 'a bit of everything, nothing in particular.', 'nothing special. just being about.', 'odds and ends. the day fills itself.'];
function bossActivity(b, short) {
    if (short) return pick(['off hunting ' + b, 'going after ' + b, 'on the trail of ' + b, 'off to pick a fight with ' + b, 'heading out for ' + b,
        'hunting ' + b + ' again', 'tracking down ' + b, 'gearing up for ' + b, 'off to bother ' + b, 'chasing ' + b, 'looking for ' + b + ' to fight',
        'on my way to ' + b, 'after ' + b + ' today']);
    return pick(["i'm off to hunt " + b + '.', 'going after ' + b + ', wish me luck.', 'on my way to fight ' + b + '.', b + ' is on my list today.',
        'trying to take down ' + b + '.', 'heading out to find ' + b + '.', "i've got a date with " + b + '.', 'hunting ' + b + '. could go either way.',
        'off to have a word with ' + b + '.', 'chasing ' + b + ' for the drops.', 'off to test my luck against ' + b + '.', 'tracking ' + b + ". hopefully it's home.",
        'picking a fight with ' + b + ', as you do.']);
}
function skillActivity(s, short) {
    if (short) return pick(['training ' + s, 'grinding ' + s, 'doing some ' + s, 'working on ' + s, 'levelling ' + s, 'getting ' + s + ' up', 'putting time into ' + s,
        'chipping away at ' + s, 'having a go at ' + s, 'a bit of ' + s, 'on the ' + s + ' grind', 'busy with ' + s, 'training up ' + s]);
    return pick(['training my ' + s + '.', 'grinding ' + s + ', slowly but surely.', 'doing some ' + s + ' to pass the time.', 'working on my ' + s + ' today.',
        'levelling ' + s + ". it's a grind.", 'chipping away at ' + s + '.', 'putting in some ' + s + ' hours.', 'a bit of ' + s + ' - keeps me out of trouble.',
        'getting my ' + s + ' up a few levels.', s + ' training. thrilling stuff.', 'on the ' + s + ' grind, as usual.', 'busy with ' + s + '. could be worse.',
        'having a go at ' + s + ' for a while.']);
}
function activityLine(bot, short) {
    deps();
    let line = null;
    try {
        if (!short && Math.random() < 0.5) {
            line = require('./dreams').describe(bot);
        }
        if (!line) {
            const g = goals.current(bot);
            if (g) {
                if (g.type === 'boss') line = bossActivity(g.bossName || 'a boss', short);
                else if (g.type === 'getRich') line = short ? pick(ACT_RICH_SHORT) : pick(ACT_RICH_LONG);
                else if (g.type === 'levelUp') line = short ? pick(ACT_LEVEL_SHORT) : pick(ACT_LEVEL_LONG);
                else if (g.type === 'gearUp') line = short ? pick(ACT_GEAR_SHORT) : pick(ACT_GEAR_LONG);
                else if (g.type === 'explore') line = short ? pick(ACT_EXPLORE_SHORT) : pick(ACT_EXPLORE_LONG);
                else if (g.type === 'skill') line = short ? skillActivity(g.skill || 'my skills', true) : skillActivity(g.skill || 'skills', false);
            }
        }
        if (!line && bot.opponent) line = short ? pick(ACT_FIGHT_SHORT) : pick(ACT_FIGHT_LONG);
        if (!line && bot.gatheringSkill) line = short ? pick(ACT_GATHER_SHORT) : pick(ACT_GATHER_LONG);
    } catch (e) {}
    if (!line) line = short ? pick(ACT_IDLE_SHORT) : pick(ACT_IDLE_LONG);
    return line;
}


// ---- movement the manager honours each tick (follow / goto / hold) ---------
// returns true if it owned the bot's movement this tick
function tickCommands(bot) {
    deps();
    // paced speech: a queued reply lands here, one line per tick
    try { dialogueMod().flush(bot); } catch (e) {}
    // runs even while busy: rate-limit offered invites, and once a human accepts a help-invite,
    // rally the party to the task they asked for. the memory expires if they never accept.
    if (bot._helpInviteCd > 0) bot._helpInviteCd -= 1;
    const pend = bot._pendingHelpMission;
    if (pend) {
        const joined = bot.party && bot.party.members &&
            bot.party.members.some((m) => m && m.username === pend.who);
        if (joined) {
            try {
                if (pend.quest) partyCoord.setMission(bot.party, { quest: pend.quest });
                else if (pend.boss || pend.activity || pend.place) partyCoord.setMission(bot.party, { type: pend.activity || (pend.boss ? 'boss' : 'goto'), boss: pend.boss, place: pend.place });
            } catch (e) {}
            bot._pendingHelpMission = null;
        } else if (--pend.ticks <= 0) {
            bot._pendingHelpMission = null; // they didn't take it up
        }
    }
    // survival/combat always win; a command never walks a bot into death
    if (bot.opponent || bot.locked || bot._foodRun || bot._bankRun || bot._quest) {
        return false;
    }
    if (bot._holdTicks > 0) {
        bot._holdTicks -= 1;
        if (bot.walkQueue) bot.walkQueue.length = 0;
        return true; // standing by
    }
    if (bot._chatGoto) {
        const g = bot._chatGoto;
        g.ticks -= 1;
        const d = Math.abs(bot.x - g.x) + Math.abs(bot.y - g.y);
        // done or out of time: the journey is dropped too
        if (d <= 3 || g.ticks <= 0) { bot._chatGoto = null; bot._travel = null; return false; }
        if (!travel.isTraveling(bot)) travel.begin(bot, { x: g.x, y: g.y });
        travel.step(bot);
        return true;
    }
    if (bot._follow) {
        const f = bot._follow;
        f.ticks -= 1;
        if (f.ticks <= 0) { bot._follow = null; return false; }
        let target = null;
        try {
            target = bot.getNearbyEntities('players', 20).find((o) => o.username === f.username);
        } catch (e) {}
        if (!target) { // out of sight -> give up following
            f.lost = (f.lost || 0) + 1;
            if (f.lost > 15) { bot._follow = null; }
            return false;
        }
        f.lost = 0;
        // a follow ring, or a bot that has stopped moving: the follow ends
        if (target.isBot) {
            if (target._follow && target._follow.username === bot.username) { bot._follow = null; return false; }
            if (target.x === f.lastX && target.y === f.lastY) { f.idle = (f.idle || 0) + 1; } else { f.idle = 0; }
            f.lastX = target.x; f.lastY = target.y;
            if (f.idle > 30) { bot._follow = null; return false; }
        }
        const d = bot.getDistance ? bot.getDistance(target) : Math.abs(bot.x - target.x) + Math.abs(bot.y - target.y);
        if (d > 3) {
            const steps = require('./pathfind').findPathAdjacent(bot.world, bot.x, bot.y, target.x, target.y);
            if (steps && steps.length) { bot.walkQueue = steps; return true; }
        }
        return true; // close enough, staying near
    }
    return false;
}

// ---- dispatch: overhead speech --------------------------------------------
function dispatch(speaker, message) {
    if (!speaker || !message || speaker._reactionSpeak) return;
    // the conversation manager decides who answers; this file keeps the doing
    try { dialogueMod().onSpeech(speaker, String(message)); } catch (e) {}
}

// ---- party chat: every bot member hears it (drives coordination + missions)
function onPartyChat(party, fromUsername, text) {
    if (!party || !party.members || !text) return;
    try { dialogueMod().onPartyChat(party, fromUsername, String(text)); } catch (e) {}
}

// global chat: a human's ::g line reaches every bot; the one who knows the speaker answers
function onGlobalChat(from, text, via) {
    if (!from || from.isBot || !text) return;
    try { dialogueMod().onGlobalChat(from, String(text), via); } catch (e) {}
}

// ---- dialogue.js seam ------------------------------------------------------------
// dialogue.js reads lines via helpers(), lets preHeard take the reactions this file owns
// (gift handshake, rival banter, faction news), then hands handleAct the acts that make a bot do something.
function helpers() {
    deps();
    return {
        placeKeyword,
        findBoss,
        findActivity,
        findQuest: (norm) => { try { return knowledge.findQuest(norm); } catch (e) { return null; } }
    };
}

const GIFT_NO_ROOM = [
    'no room right now, cheers though!',
    "pack's full, sorry - thanks anyway!",
    "i've no space, but that's kind of you!",
    "can't carry it, my bag's stuffed. cheers!",
    'full up, sadly. ask me after i bank!',
    'no room in the pack, but ta!',
    "wish i could - inventory's rammed!",
    'nowhere to put it, cheers all the same!',
    "bag's bursting. hold it for me?",
    'full inventory here, thanks though!',
    'no space, sorry! next time.',
    "can't take it, i'm full to the brim. ta!"
];
const GIFT_ACCEPTS = [
    'yes please!', 'oh go on then - cheers!', 'ta very much!', "aye, i'll take it!",
    "don't mind if i do!", "cheers, that's kind!", "you're a star, ta!", "go on, i'll have it!",
    'lovely, thanks!', 'oh nice one, cheers!', "wouldn't say no!", "yes! you're too good.",
    "ta, that's handy!", "cheers, i'll put it to use!"
];
// true when this file spoke/acted for the line and dialogue should stop
function preHeard(bot, speaker, message, opts) {
    deps();
    opts = opts || {};
    if (!bot || !speaker || !message || bot === speaker) return false;
    // gift handshake: a yes/no to an open offer, or an offer aimed at the bot
    if (bot._giftOffer && speaker.username === bot._giftOffer.to) {
        if (P.deny.test(message)) { try { require('./mentoring').cancelOfferedGift(bot, true); } catch (e) {} return true; }
        if (P.affirm.test(message)) { try { require('./mentoring').giveOfferedGift(bot, speaker); } catch (e) {} return true; }
    }
    if (speaker._giftOffer && speaker._giftOffer.to === bot.username && parse(message, bot).intent === 'giftoffer') {
        if (!bot.opponent && !bot.locked) { bot._holdTicks = Math.max(bot._holdTicks || 0, 12); }
        const full = bot.inventory && bot.inventory.isFull && bot.inventory.isFull();
        if (full) { sayRaw(bot, pick(GIFT_NO_ROOM)); try { require('./mentoring').cancelOfferedGift(speaker, false); } catch (e) {} return true; }
        sayRaw(bot, pick(GIFT_ACCEPTS));
        try { require('./mentoring').giveOfferedGift(speaker, bot); } catch (e) {}
        return true;
    }
    const rel = social.sentiment(bot, speaker.username);
    const p = personality.of(bot);
    // rival banter: a real grudge bites back whatever was said (rate-limited)
    if (bot._rivalReplyCd > 0) {
        bot._rivalReplyCd -= 1;
    } else if (rel <= -3 && !opts.party && !bot.opponent) {
        bot._rivalReplyCd = 30 + Math.floor(Math.random() * 50);
        const who = nameOf(speaker);
        let cb = null;
        try { cb = require('./chatgen').generate('taunt', { name: who }, bot); } catch (e) {}
        if (cb) { sayRaw(bot, cb); } else {
            sayRaw(bot, pick([
                'big words, ' + who + '.',
                "you'll regret that, " + who + '.',
                'say it to my face, ' + who + '.',
                "i'm not scared of you, " + who + '.',
                'keep talking, ' + who + '.',
                'still running your mouth, ' + who + '?',
                "didn't ask, " + who + '.',
                'nobody cares, ' + who + '.',
                'careful, ' + who + ". i've got a long memory.",
                'bold, coming from you, ' + who + '.',
                'oh look, ' + who + ' has opinions.',
                'you and whose army, ' + who + '?',
                'give it a rest, ' + who + '.',
                'one day, ' + who + '. one day.',
                'heard it all before, ' + who + '.'
            ]));
        }
        try { social.noteInteraction(bot, speaker.username, -0.3); } catch (e) {}
        return true;
    }
    // news travels: a faction announcement gets a murmur from some who overhear it
    if (bot._newsCd > 0) {
        bot._newsCd -= 1;
    } else {
        let sit = null;
        if (/\b(at war with|is at war|declared war)\b/i.test(message)) sit = 'reactWarNews';
        else if (/\b(is finished|it'?s over|lost too much|disbanded|we'?re scattered)\b/i.test(message)) sit = 'reactFactionFall';
        if (sit && Math.random() < 0.2 + p.sociability * 0.3) {
            bot._newsCd = 80 + Math.floor(Math.random() * 120);
            let line = null;
            try { line = require('./chatgen').generate(sit, {}, bot); } catch (e) {}
            if (line) { sayRaw(bot, line); return true; }
        }
    }
    return false;
}

// the acts that make a bot do something. returns { handled, line?, delta? };
// a returned line is spoken (paced) by dialogue.js; anything spoken here is spoken at once.
function handleAct(bot, speaker, act, u, opts) {
    deps();
    opts = opts || {};
    const name = nameOf(speaker);
    const fromParty = !!opts.party;
    const gen = (sit, ctx) => { try { return chatgen.generate(sit, ctx || {}, bot); } catch (e) { return null; } };
    const vo = (text) => { try { return require('./voice').apply(bot, text); } catch (e) { return text; } };
    const place = u.placeHit ? placeFor(bot, u.placeHit) : null;
    const info = { boss: u.boss, activity: u.activity, place, quest: u.quest, intent: act.type, addressed: !!(u.addressee && u.addressee.name === bot.username) };
    switch (act.type) {
        case 'follow':
            if (obeys(bot, speaker, opts)) {
                // a human is followed for a good while; another bot only briefly, and never in a ring
                const ring = !!(speaker.isBot && speaker._follow && speaker._follow.username === bot.username);
                if (!ring) bot._follow = { username: speaker.username, ticks: speaker.isBot ? 60 + Math.floor(Math.random() * 60) : 300 + Math.floor(Math.random() * 300) };
                bot._holdTicks = 0;
                return { handled: true, line: gen('ackFollow', { name }), delta: 0.2 };
            }
            return { handled: true, line: gen('refuseCommand', { name }) };
        case 'come':
            if (obeys(bot, speaker, opts)) { bot._chatGoto = { x: speaker.x, y: speaker.y, ticks: 120 }; return { handled: true, line: gen('ackCome', { name }), delta: 0.1 }; }
            return { handled: true, line: gen('refuseCommand', { name }) };
        case 'wait':
            if (obeys(bot, speaker, opts)) { bot._holdTicks = 30 + Math.floor(Math.random() * 60); bot._follow = null; return { handled: true, line: gen('ackWait', { name }) }; }
            return { handled: false };
        case 'goto':
            if (place && obeys(bot, speaker, opts)) {
                const l = place.label;
                bot._chatGoto = { x: place.x, y: place.y, ticks: 300 };
                return { handled: true, line: vo(pick([
                    'to the ' + l + ' then!', 'right, the ' + l + ' it is.', 'off to the ' + l + ', lead on!', 'the ' + l + '? on my way.',
                    'heading for the ' + l + ' now.', 'fine, ' + l + ". let's go.", 'the ' + l + ', got it.', 'off we go to the ' + l + '.',
                    'the ' + l + ' then. keep up!', 'alright, making for the ' + l + '.', 'the ' + l + ' - i know the way.', 'to the ' + l + ', after you.'
                ])), delta: 0.2 };
            }
            return { handled: false };
        case 'propose': {
            const spec = { boss: u.boss, activity: u.activity, place };
            // a human's "wanna go fishing?" is an invitation, not an order: a free, sociable bot takes it up more readily
            const invited = speaker && !speaker.isBot && !bot.opponent && !bot._quest && !bot._bankRun && !bot._foodRun &&
                Math.random() < 0.35 + personality.of(bot).sociability * 0.55;
            const willing = fromParty || opts.fromLeader || invited || obeys(bot, speaker, opts);
            if (u.quest && willing) {
                const q = u.quest;
                let questing = null, done = false, ready = true;
                try { questing = require('./questing'); done = questing.isComplete(bot, q.key); ready = questing.prereqsMet(bot, q); } catch (e) {}
                const qn = q.name;
                if (done) return { handled: true, line: vo(pick([
                    "i've already finished " + qn + ", but i'll tag along.", 'done ' + qn + ' already - happy to come though.',
                    qn + "? finished that ages ago. i'll still come.", 'already got ' + qn + " done, but i'll keep you company.",
                    "i've done " + qn + ", so i'll just be moral support.", qn + " is done on my end - i'll walk with you anyway.",
                    'finished ' + qn + " a while back. i'll tag along for fun.", 'already through ' + qn + ", but sure, i'll come.",
                    "can't do " + qn + ' twice, but i can follow you round.', "i've been there and done " + qn + ". i'll tag along.",
                    qn + "? completed. i'll come watch you suffer.", 'done that one - ' + qn + ' - but count me in for the walk.'
                ])) };
                if (!ready) return { handled: true, line: vo(pick([
                    "i'd love to, but i'm not ready for " + qn + ' yet.', 'not up to ' + qn + ' yet, sorry.',
                    qn + "? i've not got the levels for that yet.", "can't do " + qn + ' yet - missing a bit first.',
                    "i'm not there for " + qn + ' yet. soon maybe.', 'wish i could, ' + qn + " isn't unlocked for me yet.",
                    qn + ' is beyond me at the moment.', "give me a while, i'm not ready for " + qn + '.',
                    'not yet - ' + qn + " needs more than i've got.", "i'd only hold you back on " + qn + '. not ready.',
                    qn + '? not quite there. ask me later.', 'still working towards ' + qn + ". can't just yet."
                ])) };
                if (bot.party) { try { partyCoord.setMission(bot.party, { quest: { key: q.key, name: q.name, hub: q.hub } }); } catch (e) {} }
                else { try { require('./questing').startQuest(bot, require('./quests-data').find((x) => x.key === q.key)); } catch (e) {} }
                return { handled: true, line: gen('missionAccept', { name, mission: pick([
                    'doing ' + qn, 'a go at ' + qn, qn, 'sorting ' + qn, 'a crack at ' + qn, 'having a go at ' + qn,
                    'finishing ' + qn, 'knocking out ' + qn, 'getting ' + qn + ' done', 'a run at ' + qn, 'tackling ' + qn, 'starting ' + qn
                ]) }), delta: 0.3 };
            }
            if (willing && (spec.boss || spec.activity || spec.place)) {
                adoptMission(bot, spec);
                // a human proposing = come along with them, not wander off alone
                if (speaker && !speaker.isBot) { bot._follow = { username: speaker.username, ticks: 300 + Math.floor(Math.random() * 300) }; bot._holdTicks = 0; }
                return { handled: true, line: gen('missionAccept', { name, mission: missionPhrase(spec) }), delta: 0.3 };
            }
            if (spec.boss || spec.activity || spec.place) return { handled: true, line: gen('reactDeny', { name }) };
            return { handled: false };
        }
        case 'help':
            if (offerHelpParty(bot, speaker, info, opts)) return { handled: true, delta: 0.3 };
            return { handled: false };
        case 'invite':
            if (offerHelpParty(bot, speaker, info, opts)) return { handled: true, delta: 0.3 };
            return { handled: true, line: gen('reactPartyAsk', { name }), delta: 0.1 };
        case 'trade':
            if (trades.level(bot) > 0) return { handled: true, line: gen('reactTradeAsk', { name }) };
            return { handled: false };
        default:
            return { handled: false };
    }
}

module.exports = { dispatch, onPartyChat, onGlobalChat, parse, tickCommands, adoptMission, helpers, preHeard, handleAct, activityLine, gearLine, placeFor, direction, nameOf, trust, obeys, sayRaw, intentOf: (t) => parse(t, { username: '', x: 0, y: 0 }).intent };
