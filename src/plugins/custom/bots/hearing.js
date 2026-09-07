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

function missionPhrase(spec) {
    if (spec.boss) return 'hunting ' + spec.boss.name;
    if (spec.activity === 'getRich') return 'a money run';
    if (spec.activity === 'levelUp') return 'some training';
    if (spec.activity === 'gearUp') return 'a gear hunt';
    if (spec.activity === 'explore') return 'an adventure';
    if (spec.activity && spec.activity.indexOf('skill:') === 0) return 'some ' + spec.activity.split(':')[1];
    if (spec.place) return 'a trip to the ' + spec.place.label;
    return 'an adventure';
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
        sayRaw(bot, 'give me a moment, ' + name + " - i'm in the middle of something.");
        return true;
    }
    // already grouped with them -> just reassure (no duplicate invite).
    if (bot.party && bot.party.members && bot.party.members.some((m) => m && m.username === speaker.username)) {
        sayRaw(bot, "i've got your back, " + name + '. what are we doing?');
        return true;
    }
    // the human is already in another party -> can't invite; offer to tag along instead.
    if (speaker.party) {
        sayRaw(bot, 'happy to help - lead the way, ' + name + '.');
        bot._chatGoto = { x: speaker.x, y: speaker.y, ticks: 200 };
        return true;
    }
    // don't spam invites at one person.
    if (bot._helpInviteCd && bot._helpInviteCd > 0) {
        sayRaw(bot, "invite's already on its way, " + name + '.');
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
        ? ('happy to help with ' + task + ', ' + name + "! sent you a party invite - accept and we'll head off.")
        : ("course i'll help, " + name + '! sent you a party invite.'));
    return true;
}

// answer a question with real knowledge where possible.

function gearLine(bot) {
    let line = null;
    try {
        const cb = bot.cache && bot.cache.bot;
        const focus = (cb && cb.focus) || 'auto';
        if (focus === 'magic') line = "i fight with magic, staff and runes.";
        else if (focus === 'ranged') line = "bow and arrows for me.";
        else {
            const slots = bot.inventory && bot.inventory.equipmentSlots;
            const wi = slots && slots['right-hand'];
            if (typeof wi === 'number' && wi >= 0 && bot.inventory.items[wi]) {
                const items = require('@2003scape/rsc-data/config/items');
                const def = items[bot.inventory.items[wi].id];
                line = def ? "i'm wielding " + def.name.toLowerCase() + "." : null;
            }
        }
    } catch (e) {}
    if (!line) line = "just my trusty fists and whatever i've got.";
    return line;
}

// what the bot is doing, as a sentence or a short phrase
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
                if (g.type === 'boss') line = short ? "off hunting " + (g.bossName || 'a boss') : "i'm off to hunt " + (g.bossName || 'a boss') + ".";
                else if (g.type === 'getRich') line = short ? "making some coin" : "just trying to make some money.";
                else if (g.type === 'levelUp') line = short ? "grinding some levels" : "grinding some levels, you know how it is.";
                else if (g.type === 'gearUp') line = short ? "hunting better gear" : "hunting for better gear.";
                else if (g.type === 'explore') line = short ? "just wandering" : "just exploring, seeing the sights.";
                else if (g.type === 'skill') line = short ? "training " + (g.skill || 'my skills') : "training my " + (g.skill || 'skills') + ".";
            }
        }
        if (!line && bot.opponent) line = short ? "in the middle of a scrap" : "fighting, as it happens.";
        if (!line && bot.gatheringSkill) line = short ? "grafting away" : "grafting away, bit by bit.";
    } catch (e) {}
    if (!line) line = short ? "keeping busy" : "oh, just keeping busy.";
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
        if (d <= 3 || g.ticks <= 0) { bot._chatGoto = null; return false; }
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
        if (full) { sayRaw(bot, 'no room right now, cheers though!'); try { require('./mentoring').cancelOfferedGift(speaker, false); } catch (e) {} return true; }
        const ACCEPTS = ['yes please!', 'oh go on then - cheers!', 'ta very much!', "aye, i'll take it!"];
        sayRaw(bot, ACCEPTS[Math.floor(Math.random() * ACCEPTS.length)]);
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
            const fb = ['big words, ' + who + '.', 'you\'ll regret that, ' + who + '.', 'say it to my face, ' + who + '.', 'i\'m not scared of you, ' + who + '.', 'keep talking, ' + who + '.'];
            sayRaw(bot, fb[Math.floor(Math.random() * fb.length)]);
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
            if (obeys(bot, speaker, opts)) { bot._follow = { username: speaker.username, ticks: 300 + Math.floor(Math.random() * 300) }; bot._holdTicks = 0; return { handled: true, line: gen('ackFollow', { name }), delta: 0.2 }; }
            return { handled: true, line: gen('refuseCommand', { name }) };
        case 'come':
            if (obeys(bot, speaker, opts)) { bot._chatGoto = { x: speaker.x, y: speaker.y, ticks: 120 }; return { handled: true, line: gen('ackCome', { name }), delta: 0.1 }; }
            return { handled: true, line: gen('refuseCommand', { name }) };
        case 'wait':
            if (obeys(bot, speaker, opts)) { bot._holdTicks = 30 + Math.floor(Math.random() * 60); bot._follow = null; return { handled: true, line: gen('ackWait', { name }) }; }
            return { handled: false };
        case 'goto':
            if (place && obeys(bot, speaker, opts)) { bot._chatGoto = { x: place.x, y: place.y, ticks: 300 }; return { handled: true, line: vo('to the ' + place.label + ' then!'), delta: 0.2 }; }
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
                if (done) return { handled: true, line: vo("i've already finished " + q.name + ", but i'll tag along.") };
                if (!ready) return { handled: true, line: vo("i'd love to, but i'm not ready for " + q.name + " yet.") };
                if (bot.party) { try { partyCoord.setMission(bot.party, { quest: { key: q.key, name: q.name, hub: q.hub } }); } catch (e) {} }
                else { try { require('./questing').startQuest(bot, require('./quests-data').find((x) => x.key === q.key)); } catch (e) {} }
                return { handled: true, line: gen('missionAccept', { name, mission: 'doing ' + q.name }), delta: 0.3 };
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
