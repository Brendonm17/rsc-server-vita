// friendships crystallise into named factions, and cross-faction grudges make factions rivals.
// membership persists in cache.bot.faction; the rivalry map is session-live.

const social = require('./social-emergent');
const personality = require('./personality');
const mood = require('./mood');
const maturity = require('./maturity');
const clans = require('./clans');

const FOUND_AT = 2; // nearby kin before a clan forms

const ADJ = [
    'Iron', 'Crimson', 'Golden', 'Shadow', 'Storm', 'Silver', 'Emerald', 'Ember', 'Frost', 'Wolf',
    'Ashen', 'Obsidian', 'Scarlet', 'Azure', 'Thunder', 'Grim', 'Blood', 'Bronze', 'Onyx', 'Raven',
    'Savage', 'Dawn', 'Dusk', 'Fallen', 'Wild', 'Copper', 'Jade', 'Ivory', 'Molten', 'Northern',
    'Rusted', 'Hollow', 'Sable', 'Verdant', 'Gilded', 'Feral', 'Broken', 'Radiant', 'Twilight', 'Vermillion'
];
const NOUN = [
    'Guard', 'Circle', 'Brotherhood', 'Company', 'Order', 'Pact', 'Vanguard', 'Kin', 'Banner', 'Fellowship',
    'Legion', 'Covenant', 'Host', 'Wardens', 'Blades', 'Talons', 'Watch', 'Reavers', 'Sentinels', 'Coven',
    'Syndicate', 'Riders', 'Chapter', 'Accord', 'Union', 'Clan', 'Hand', 'Crown', 'Enclave', 'Marauders',
    'Wolves', 'Ravagers', 'Keepers', 'Outriders', 'Ashes', 'Vow', 'Cabal', 'Phalanx', 'Wardens', 'Regiment'
];

// factionName -> Set of rival factionNames (session-live).
const rivalries = {};
// factionName -> Set of allied factionNames (like each other, help, don't fight).
const allies = {};
// "a|b" (sorted) pairs at open war; tension tally escalates a rivalry into war.
const warPairs = new Set();
const tension = {};
const WAR_AT = 6; // hostile encounters between rival factions before open war

// factionName -> morale (0..100, starts 50). losses lower it, wins and time raise it; at bottom it disbands.
const morale = {};
// "a|b" -> { name: killsScored }, running war tally.
const warScore = {};
const DISBAND_MORALE = 8;
const BASE_MORALE = 50;

function pairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

function moraleOf(name) { return name in morale ? morale[name] : BASE_MORALE; }
function bumpMorale(name, delta) {
    if (!name) return;
    let v = (name in morale ? morale[name] : BASE_MORALE) + delta;
    morale[name] = v < 0 ? 0 : v > 100 ? 100 : v;
}
// record a war kill: raise winner morale, lower loser morale, bump the scoreline.
function recordWarKill(winnerFaction, loserFaction) {
    if (!winnerFaction || !loserFaction || !atWar(winnerFaction, loserFaction)) return;
    bumpMorale(winnerFaction, 3);
    bumpMorale(loserFaction, -5);
    const k = pairKey(winnerFaction, loserFaction);
    if (!warScore[k]) warScore[k] = {};
    warScore[k][winnerFaction] = (warScore[k][winnerFaction] || 0) + 1;
}
// how a war is going for `name` against `enemy`: 'winning' | 'losing' | 'even'.
function warStanding(name, enemy) {
    const k = pairKey(name, enemy);
    const s = warScore[k] || {};
    const mine = s[name] || 0, theirs = s[enemy] || 0;
    if (mine > theirs + 1) return 'winning';
    if (theirs > mine + 1) return 'losing';
    return 'even';
}
// factionName -> Set of member usernames.
const roster = {};
// inferred human allegiance: playerName -> {factionName: score}, highest score = mostly aligned.
const humanAlign = {};
// collapsed factions (roster below viability); members clear their flag lazily.
const dissolved = new Set();
// factionName -> current founder's username.
const founders = {};
// factionName -> decayed tally of member roles (its character).
const character = {};
// factionName -> its collective ambition.
const ambition = {};

const AMBITIONS = {
    biggest: 'be the biggest crew in the land',
    richest: 'be the wealthiest crew around',
    strongest: 'be the strongest fighters alive',
    feared: 'be the most feared name in the wild'
};
function ambitionOf(name) { return ambition[name] || null; }
// the dominant faction (clear top power), or null if no crew has a real lead.
function dominantFaction() {
    let top = null, topSz = 0, second = 0;
    for (const name of Object.keys(roster)) {
        if (dissolved.has(name)) continue;
        const sz = sizeOf(name);
        if (sz > topSz) { second = topSz; topSz = sz; top = name; }
        else if (sz > second) { second = sz; }
    }
    return topSz >= 5 && topSz >= second + 3 ? top : null;
}

// is `name` the largest live faction?
function isBiggest(name) {
    const sz = sizeOf(name);
    if (sz < 2) return false;
    for (const other of Object.keys(roster)) {
        if (other !== name && !dissolved.has(other) && sizeOf(other) > sz) return false;
    }
    return true;
}
// pick an ambition from the founder's nature.
function pickAmbition(founder) {
    let p = null; try { p = personality.of(founder); } catch (e) {  }
    p = p || {};
    if ((p.aggression || 0.5) > 0.6 && (p.risk || 0.5) > 0.55) return 'feared';
    if ((p.aggression || 0.5) > 0.6) return 'strongest';
    if ((p.greed || 0.5) > 0.6) return 'richest';
    return 'biggest';
}

const GATHER_ROLES = new Set(['fisherman', 'miner', 'woodcutter', 'cook', 'smith', 'crafter', 'firemaker', 'fletcher', 'herbalist', 'thief', 'runner']);
function roleBucket(bot) {
    let r = 'adventurer';
    try { r = require('./role').role(bot); } catch (e) {  }
    if (r === 'slayer') return 'warrior';
    if (GATHER_ROLES.has(r)) return 'gatherer';
    if (r === 'merchant') return 'merchant';
    return 'other';
}
function noteCharacter(name, bucket) {
    if (!character[name]) character[name] = { warrior: 0, gatherer: 0, merchant: 0, other: 0 };
    const c = character[name];
    for (const k of Object.keys(c)) c[k] *= 0.995; // decay -> stays current
    c[bucket] = (c[bucket] || 0) + 1;
}
// short descriptor of a faction's dominant character.
function characterOf(name) {
    const c = character[name];
    if (!c) return 'a fellowship';
    const total = c.warrior + c.gatherer + c.merchant + c.other;
    if (total < 4) return 'a fellowship';
    let top = 'other', topV = -1;
    for (const k of ['warrior', 'gatherer', 'merchant']) if (c[k] > topV) { topV = c[k]; top = k; }
    if (topV < total * 0.45) return 'a motley crew';
    return top === 'warrior' ? 'a warrior band' : top === 'gatherer' ? 'a guild of skillers' : 'a circle of merchants';
}

const DISSOLVE_AT = 2;     // a faction with fewer members than this folds
const LONELY_LIMIT = 15;   // active check-ins (each ~200 ticks apart) with no kin -> drift away

function factionOf(bot) {
    const cb = bot.cache && bot.cache.bot;
    return (cb && cb.faction) || null;
}

// faction-join appetite 0..1 from the factionJoin slider (level 0..3, default 2; 0 = never joins).
const JOIN_RATE = [0, 0.4, 0.75, 1.0];
function joinAppetite(bot) {
    const cb = bot.cache && bot.cache.bot;
    let lvl = cb && typeof cb.factionJoin === 'number' ? cb.factionJoin : 2;
    lvl = lvl < 0 ? 0 : lvl > 3 ? 3 : Math.round(lvl);
    return JOIN_RATE[lvl];
}

function sizeOf(name) {
    return roster[name] ? roster[name].size : 0;
}

function rosterOf(name) {
    return roster[name] ? Array.from(roster[name]) : [];
}

// the faction a human is mostly aligned with (highest score), or null.
function alignmentOf(playerName) {
    const scores = humanAlign[playerName];
    if (!scores) return null;
    let best = null, bestV = 1.5; // needs some consistent association, not one sighting
    for (const f of Object.keys(scores)) {
        if (!dissolved.has(f) && scores[f] > bestV) { bestV = scores[f]; best = f; }
    }
    return best;
}

function noteAlign(playerName, faction, w) {
    if (!playerName || !faction) return;
    if (!humanAlign[playerName]) humanAlign[playerName] = {};
    const s = humanAlign[playerName];
    s[faction] = (s[faction] || 0) + (w || 1);
    if (s[faction] > 20) s[faction] = 20; // cap
}

// which faction `other` belongs to (bot: cache.bot.faction; human: inferred allegiance).
function allegianceName(other) {
    if (other.isBot) {
        const f = factionOf(other);
        return f ? f.name : null;
    }
    // a human who joined a faction's clan is one of them
    const viaClan = clans.humanFaction(other);
    if (viaClan) return viaClan;
    return alignmentOf(other.username);
}

// deterministic faction name from the founder's name hash.
function coinName(founder) {
    const s = String(founder || 'bot');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
    return 'the ' + ADJ[h % ADJ.length] + ' ' + NOUN[(h >> 4) % NOUN.length];
}

// a name is taken if a live faction already flies it.
function nameTaken(name) {
    return !!(roster[name] && roster[name].size > 0 && !dissolved.has(name));
}

// a unique faction name: probe adjective/noun combos from the founder's hash until one is free.
function uniqueName(founder) {
    const s = String(founder || 'bot');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
    for (let k = 0; k < ADJ.length * NOUN.length; k++) {
        const name = 'the ' + ADJ[(h + k) % ADJ.length] + ' ' + NOUN[(((h >> 4) + Math.floor((h + k) / ADJ.length)) % NOUN.length)];
        if (!nameTaken(name)) return name;
    }
    return coinName(founder) + ' ' + (Object.keys(roster).length + 1); // last-ditch fallback
}

// how alike two faction names are: 2 = identical, 1 = share a word (Iron/Guard), 0 = unrelated.
function nameSimilarity(a, b) {
    if (!a || !b || a === b) return a === b ? 2 : 0;
    const wa = a.split(' '), wb = b.split(' ');
    let shared = 0;
    for (const w of wa) if (w !== 'the' && wb.indexOf(w) !== -1) shared += 1;
    return shared;
}

function enlist(bot, name, role) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return;
    cb.faction = { name, role: role || 'member', since: (cb.faction && cb.faction.since) || 0 };
    (roster[name] || (roster[name] = new Set())).add(bot.username);
    dissolved.delete(name); // a fresh recruit revives a folded name
    if ((role === 'founder' || !founders[name]) && bot.username) founders[name] = founders[name] || bot.username;
    if (role === 'founder') founders[name] = bot.username;
    // remember every banner this bot has flown (persists in cache).
    if (!Array.isArray(cb.factionHistory)) cb.factionHistory = [];
    if (cb.factionHistory[cb.factionHistory.length - 1] !== name) {
        cb.factionHistory.push(name);
        if (cb.factionHistory.length > 8) cb.factionHistory.shift();
    }
    bot._factionLonely = 0;
    // back the faction with a real clan: founder makes it, recruit is enrolled
    if (role === 'founder') clans.ensureClan(bot, name).catch(() => {});
    else clans.enrol(bot, name, founders[name]).catch(() => {});
}

// a member leaves: clear the flag, shrink the roster, dissolve the faction if it dwindles too far.
function leave(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb || !cb.faction) return;
    const name = cb.faction.name;
    // losing a member saps morale (unless already folding).
    if (!dissolved.has(name)) bumpMorale(name, -2);
    if (roster[name]) {
        roster[name].delete(bot.username);
        if (roster[name].size < DISSOLVE_AT) {
            dissolved.add(name);
            delete founders[name];
        } else if (founders[name] === bot.username) {
            // founder left but the band lives on -> pass the banner to another
            founders[name] = roster[name].values().next().value;
        }
    }
    cb.faction = null;
    bot._factionLonely = 0;
    // clan follows: leadership to the successor, then out
    clans.depart(bot, founders[name]).catch(() => {});
}

function nearbyFriends(bot, others) {
    const out = [];
    for (const o of others) {
        if (!o || o === bot || o.id === bot.id || !o.username) continue;
        if (social.tagOf(bot, o.username) === 'friend') out.push(o);
    }
    return out;
}

// min sentiment to count a nearby bot as clan kin; never counts a rival.
const KIN_REL = 0.5;
function nearbyKin(bot, others) {
    const out = [];
    for (const o of others) {
        if (!o || o === bot || o.id === bot.id || !o.username || !o.isBot) continue;
        if (social.tagOf(bot, o.username) === 'rival') continue;
        if (social.tagOf(bot, o.username) === 'friend' || social.sentiment(bot, o.username) >= KIN_REL) {
            out.push(o);
        }
    }
    return out;
}

function speak(bot, line) {
    try {
        let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {  }
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
    } catch (e) {  }
}

// announce a faction event to the area, so nearby bots hear it and react.
function announce(bot, line) {
    try {
        let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {  }
        try { bot.broadcastChat(out); } catch (e) {  }
    } catch (e) {  }
}

// speak a generated line for a situation, falling back to a fixed line.
function speakGen(bot, situation, ctx, fallback) {
    let out = null;
    try { out = require('./chatgen').generate(situation, ctx || {}, bot); } catch (e) {  }
    if (out) {
        try { bot._reactionSpeak = true; try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; } } catch (e) {  }
        return;
    }
    speak(bot, fallback);
}

// declare two factions rivals (symmetric).
function makeRivals(a, b) {
    if (!a || !b || a === b) return;
    (rivalries[a] || (rivalries[a] = new Set())).add(b);
    (rivalries[b] || (rivalries[b] = new Set())).add(a);
}

function areRivals(a, b) {
    return !!(a && b && rivalries[a] && rivalries[a].has(b));
}

// ally two factions: they help and won't fight; clears any rivalry/war between them.
function makeAllies(a, b) {
    if (!a || !b || a === b) return;
    (allies[a] || (allies[a] = new Set())).add(b);
    (allies[b] || (allies[b] = new Set())).add(a);
    if (rivalries[a]) rivalries[a].delete(b);
    if (rivalries[b]) rivalries[b].delete(a);
    warPairs.delete(pairKey(a, b));
    delete tension[pairKey(a, b)];
    clans.announce(founders[a], 'we stand with ' + b + ' now. treat them as friends.');
    clans.announce(founders[b], 'we stand with ' + a + ' now. treat them as friends.');
}
function areAllies(a, b) { return !!(a && b && allies[a] && allies[a].has(b)); }

// open war: members actively hunt each other in the wilderness.
function declareWar(a, b) {
    if (!a || !b || a === b) return;
    makeRivals(a, b);
    if (allies[a]) allies[a].delete(b);
    if (allies[b]) allies[b].delete(a);
    warPairs.add(pairKey(a, b));
    clans.announce(founders[a], 'war on ' + b + '! they will regret this.');
    clans.announce(founders[b], a + ' has declared war on us. arm up.');
}
function atWar(a, b) { return warPairs.has(pairKey(a, b)); }

// end a war: revert to wary rivals and reset tension/scoreline.
function makePeace(a, b) {
    if (!a || !b || a === b) return;
    const k = pairKey(a, b);
    warPairs.delete(k);
    delete tension[k];
    delete warScore[k];
    // leave them as rivals unless they were already allies.
    if (!areAllies(a, b)) makeRivals(a, b);
    clans.announce(founders[a], 'peace with ' + b + '. keep your guard up.');
    clans.announce(founders[b], 'peace with ' + a + '. keep your guard up.');
}

// stoke tension between two rival factions; returns true on the tick war is declared.
function bumpTension(a, b, n) {
    if (!a || !b || a === b || areAllies(a, b)) return false;
    const k = pairKey(a, b);
    tension[k] = (tension[k] || 0) + (n || 1);
    if (tension[k] >= WAR_AT && !atWar(a, b)) { declareWar(a, b); return true; }
    return false;
}

// a faction this one is openly at war with (if any).
function enemyAtWar(name) {
    if (!name) return null;
    for (const k of warPairs) {
        const [a, b] = k.split('|');
        if (a === name && !dissolved.has(b)) return b;
        if (b === name && !dissolved.has(a)) return a;
    }
    return null;
}

// muster point for a war party (the wilderness edge).
const WAR_MUSTER = { x: 120, y: 420, label: 'the wilderness' };

// the leader's faction situation as a party mission + rally line: war on an enemy, or its ambition.
// returns { spec, line } for setMission, or null.
function partyMission(bot) {
    const mine = factionOf(bot);
    if (!mine) return null;
    const enemy = enemyAtWar(mine.name);
    if (enemy) {
        return { spec: { type: 'explore', place: WAR_MUSTER }, line: mine.name + ' rides to war against ' + enemy + ' - to the wilderness!' };
    }
    switch (ambitionOf(mine.name)) {
        case 'richest': return { spec: { type: 'getRich' }, line: 'for ' + mine.name + ' - let\'s make our fortune!' };
        case 'strongest': return { spec: { type: 'levelUp' }, line: 'for ' + mine.name + ' - we train till none can match us!' };
        case 'feared': return { spec: { type: 'levelUp' }, line: 'for ' + mine.name + ' - we\'ll be the terror of the wild!' };
        case 'biggest': return { spec: { type: 'explore' }, line: 'for ' + mine.name + ' - spread out, grow our ranks!' };
        default: return null;
    }
}

// the standing between two factions: 'same' | 'war' | 'rival' | 'ally' | 'neutral'.
function relationBetween(a, b) {
    if (!a || !b) return 'neutral';
    if (a === b) return 'same';
    if (atWar(a, b)) return 'war';
    if (areRivals(a, b)) return 'rival';
    if (areAllies(a, b)) return 'ally';
    return 'neutral';
}

// per-tick: form/join a faction, and let cross-faction grudges harden into faction rivalry.
function onTick(bot) {
    if (bot.opponent || bot.locked) return false;
    if (bot._factionCd && bot._factionCd > 0) { bot._factionCd -= 1; return false; }
    // faction politics scales in with level, so newbies mostly opt out.
    if (Math.random() > maturity.socialAmbition(bot)) return false;

    let others = [];
    try { others = bot.getNearbyEntities('players', 6); } catch (e) { return false; }

    const mine = factionOf(bot);
    const friends = nearbyFriends(bot, others);

    // join: a friend already in a faction -> fall in with them.
    if (!mine) {
        // no banner but a past: sometimes reminisce about a fallen crew to an audience.
        const cbh = bot.cache && bot.cache.bot && bot.cache.bot.factionHistory;
        if (Array.isArray(cbh) && cbh.length && others.some((o) => o && o !== bot && o.id !== bot.id) && Math.random() < 0.06) {
            const old = cbh[Math.floor(Math.random() * cbh.length)];
            const lines = ['remember ' + old + '? those were the days.', 'i still miss ' + old + '. good crew, that.', 'ah, ' + old + '... we were something back then.'];
            speak(bot, lines[Math.floor(Math.random() * lines.length)]);
            bot._factionCd = 300 + Math.floor(Math.random() * 300);
            return true;
        }
        // a lone wolf (faction-join slider 0) never joins or founds a crew.
        const appetite = joinAppetite(bot);
        const banner = friends.find((f) => f.isBot && factionOf(f));
        if (banner && Math.random() < appetite) {
            const fac = factionOf(banner);
            enlist(bot, fac.name, 'member');
            speak(bot, 'proud to join ' + fac.name + '.');
            bot._factionCd = 300 + Math.floor(Math.random() * 300);
            return true;
        }
        // found: enough nearby kin and no banner to join -> raise your own.
        const kin = nearbyKin(bot, others);
        if (kin.length >= FOUND_AT && Math.random() < appetite) {
            // sometimes revive a fallen banner this bot once flew instead of coining a fresh name.
            const cb = bot.cache && bot.cache.bot;
            const past = (cb && Array.isArray(cb.factionHistory) ? cb.factionHistory : []).filter((n) => !nameTaken(n));
            let name, revived = false;
            if (past.length && Math.random() < 0.5) {
                name = past[past.length - 1]; // the most recent fallen banner
                revived = true;
            } else {
                name = uniqueName(bot.username); // never collides with a live faction
            }
            enlist(bot, name, 'founder');
            ambition[name] = pickAmbition(bot); // what this crew chases
            // a new banner starts as rival to any faction with a similar name or the same ambition.
            for (const other of Object.keys(roster)) {
                if (other === name || dissolved.has(other)) continue;
                if (nameSimilarity(name, other) >= 1 || (ambition[other] && ambition[other] === ambition[name])) {
                    makeRivals(name, other);
                }
            }
            if (revived) speak(bot, name + ' rides again! just like the old days.');
            else speak(bot, 'we are ' + name + ' now - we\'ll ' + (AMBITIONS[ambition[name]] || 'make our mark') + '!');
            // enlist the nearby kin who'll join (lone wolves stay out).
            for (const f of kin) if (f.isBot && !factionOf(f) && Math.random() < joinAppetite(f)) enlist(f, name, 'member');
            bot._factionCd = 400 + Math.floor(Math.random() * 400);
            return true;
        }
        bot._factionCd = 120;
        return false;
    }

    // re-register a restored member into the session-live roster before any viability check.
    if (!roster[mine.name] || !roster[mine.name].has(bot.username)) {
        (roster[mine.name] || (roster[mine.name] = new Set())).add(bot.username);
    }

    // a restored member re-enters its clan
    if (!clans.inClan(bot) && Math.random() < 0.05) {
        if (founders[mine.name] === bot.username) clans.ensureClan(bot, mine.name).catch(() => {});
        else clans.enrol(bot, mine.name, founders[mine.name]).catch(() => {});
    }

    // the founder brings a human friend standing nearby into the clan
    if (founders[mine.name] === bot.username && Math.random() < 0.05) {
        const asked = bot._recruited || (bot._recruited = {});
        const human = others.find((o) => o && !o.isBot && o.username && !asked[o.username] && social.tagOf(bot, o.username) === 'friend');
        if (human) {
            asked[human.username] = 1;
            clans.recruit(bot, human).then((sent) => {
                if (sent) speak(bot, 'you should join ' + mine.name + ', ' + human.username + '. we could use you.');
            }).catch(() => {});
            bot._factionCd = 200;
            return true;
        }
    }

    // the faction was declared dead this session -> let this member go.
    if (dissolved.has(mine.name)) {
        const wasFounder = mine.role === 'founder';
        leave(bot);
        if (wasFounder) speak(bot, 'nothing left to lead. we\'re scattered.');
        bot._factionCd = 300 + Math.floor(Math.random() * 300);
        return true;
    }

    // a founder left alone folds the clan
    if (mine.role === 'founder' && sizeOf(mine.name) <= 1) {
        bot._soloFounderTicks = (bot._soloFounderTicks || 0) + 1;
        if (bot._soloFounderTicks >= 3) {
            dissolved.add(mine.name);
            leave(bot);
            bot._soloFounderTicks = 0;
            bot._factionCd = 300 + Math.floor(Math.random() * 300);
            return true;
        }
    } else {
        bot._soloFounderTicks = 0;
    }

    // morale recovers slowly in quiet times; a crew ground down enough disbands.
    bot._moraleCd = (bot._moraleCd || 0) - 1;
    if (bot._moraleCd <= 0) {
        bot._moraleCd = 400 + Math.floor(Math.random() * 200);
        if (moraleOf(mine.name) < BASE_MORALE) bumpMorale(mine.name, 1); // time heals
    }
    if (moraleOf(mine.name) <= DISBAND_MORALE) {
        const nm = mine.name;
        dissolved.add(nm); // the whole crew gives up; others scatter on their own ticks
        leave(bot);
        // the fall of a crew is news the whole area hears
        announce(bot, nm + ' is finished. we\'ve lost too much - it\'s over.');
        bot._factionCd = 400 + Math.floor(Math.random() * 400);
        return true;
    }

    // a founder can end a war: sue for peace when losing or low on morale, or call off a grinding stalemate.
    if (mine.role === 'founder') {
        const w = enemyAtWar(mine.name);
        if (w) {
            const stand = warStanding(mine.name, w);
            const mor = moraleOf(mine.name);
            const dragged = ((tension[pairKey(mine.name, w)] || 0) >= WAR_AT + 8);
            if (stand === 'losing' || mor < 22) {
                makePeace(mine.name, w);
                speakGen(bot, 'factionWarCry', { faction: mine.name, enemy: w },
                    'we can\'t win this war with ' + w + '. i sue for peace.');
                bot._factionCd = 400 + Math.floor(Math.random() * 300);
                return true;
            }
            if (dragged && stand === 'even' && Math.random() < 0.3) {
                makePeace(mine.name, w);
                speak(bot, 'this war with ' + w + ' has bled us both long enough. let there be peace.');
                bot._factionCd = 400 + Math.floor(Math.random() * 300);
                return true;
            }
        }
    }

    // at war, a member sometimes voices how it's going.
    const foe = enemyAtWar(mine.name);
    if (foe && others.some((o) => o && o !== bot && o.id !== bot.id) && Math.random() < 0.08) {
        const s = warStanding(mine.name, foe);
        // fixed line when winning/losing, a dynamic war cry when even
        if (s === 'losing') speak(bot, foe + '\'s cutting us down. this war\'s going badly...');
        else if (s === 'winning') speak(bot, 'we\'re winning the war with ' + foe + '! push on!');
        else speakGen(bot, 'factionWarCry', { faction: mine.name, enemy: foe }, 'the war with ' + foe + ' rages on. hold the line.');
        bot._factionCd = 300 + Math.floor(Math.random() * 200);
        return true;
    }

    // this member feeds the faction's character tally.
    noteCharacter(mine.name, roleBucket(bot));

    // defection: a member of a small crew near a friend in a bigger faction may jump ship (not founders, not to an enemy).
    if (mine.role !== 'founder') {
        const mySize = sizeOf(mine.name);
        if (mySize <= 4) {
            for (const o of others) {
                if (!o || !o.isBot || o === bot || o.id === bot.id) continue;
                const theirs = factionOf(o);
                if (!theirs || theirs.name === mine.name || areRivals(mine.name, theirs.name)) continue;
                const theirSize = sizeOf(theirs.name);
                if (social.sentiment(bot, o.username) >= 4 && theirSize >= mySize + 2) {
                    if (Math.random() < 0.02 + (theirSize - mySize) * 0.01) {
                        const from = mine.name;
                        leave(bot);
                        enlist(bot, theirs.name, 'member');
                        speak(bot, 'i\'m throwing in with ' + theirs.name + ' - ' + from + '\'s finished for me.');
                        bot._factionCd = 500 + Math.floor(Math.random() * 400);
                        return true;
                    }
                }
            }
        }
    }

    // succession: the banner has passed to this bot -> take it up.
    if (founders[mine.name] === bot.username && mine.role !== 'founder') {
        mine.role = 'founder';
        speak(bot, 'someone has to lead. i\'ll carry ' + mine.name + ' forward.');
        bot._factionCd = 300 + Math.floor(Math.random() * 300);
        return true;
    }

    // a member: watch for enemy and kin. compute the dominant faction once for the whole scan.
    let sawKin = false;
    const dom = dominantFaction();
    for (const o of others) {
        if (!o || o === bot || o.id === bot.id || !o.username) continue;
        const theirs = allegianceName(o); // bot's own faction, or a human's inferred allegiance

        // a well-regarded human seen with the faction is scored as leaning toward it.
        if (!o.isBot && social.sentiment(bot, o.username) >= 1) {
            noteAlign(o.username, mine.name, 0.5);
        }

        const rel = theirs ? relationBetween(mine.name, theirs) : 'none';

        // a personal grudge across the faction line -> the factions themselves feud.
        if (theirs && rel === 'neutral' && social.tagOf(bot, o.username) === 'rival') {
            makeRivals(mine.name, theirs);
            speak(bot, mine.name + ' has no love for ' + theirs + '.');
            bot._factionCd = 300 + Math.floor(Math.random() * 300);
            return true;
        }

        // meeting a member of the dominant faction can turn the two rival.
        if (dom && theirs === dom && mine.name !== dom && rel === 'neutral' && Math.random() < 0.12) {
            makeRivals(mine.name, dom);
            speakGen(bot, 'factionPride', { faction: mine.name }, mine.name + ' won\'t bow to ' + dom + '.');
            bot._factionCd = 300 + Math.floor(Math.random() * 200);
            return true;
        }

        // firm friends across a neutral line can ally the two crews, more readily against a common enemy.
        if (theirs && rel === 'neutral' && o.isBot && social.sentiment(bot, o.username) >= 5) {
            const coalition = dom && dom !== mine.name && dom !== theirs && (areRivals(mine.name, dom) || areRivals(theirs, dom));
            if (Math.random() < (coalition ? 0.3 : 0.05)) {
                makeAllies(mine.name, theirs);
                if (coalition) announce(bot, mine.name + ' and ' + theirs + ' unite against ' + dom + '!');
                else speak(bot, mine.name + ' and ' + theirs + ' stand together now. allies!');
                bot._factionCd = 400 + Math.floor(Math.random() * 300);
                return true;
            }
        }

        // a friend under an enemy banner: personality decides whether the bond holds (easing the war)
        // or breaks (eroding toward a rivalry). only while at war.
        if (theirs && (rel === 'rival' || rel === 'war')) {
            let feel = 0;
            try { feel = social.sentiment(bot, o.username); } catch (e) {  }
            if (feel >= 3) { // a genuine friend on the other side
                const pp = personality.of(bot);
                const loyalty = pp.patience * 0.4 + pp.sociability * 0.4 - pp.aggression * 0.45 + (feel - 3) * 0.05;
                if (loyalty >= 0.3) {
                    // loyalty holds: the friendship outlasts the banner and eases the war.
                    if (Math.random() < 0.5) {
                        speak(bot, 'wrong banner, ' + o.username + " - but you're still my friend. this war's madness.");
                        bumpTension(mine.name, theirs, -1); // a bond across the line eases the war
                        bot._factionCd = 300 + Math.floor(Math.random() * 200);
                        return true;
                    }
                } else {
                    // zealotry wins: the war sours the bond and it can break.
                    social.noteInteraction(bot, o.username, -0.8);
                    try { mood.nudge(bot, 'valence', -0.03); } catch (e) {  }
                    if (Math.random() < 0.4) {
                        speak(bot, feel - 0.8 <= -4
                            ? o.username + '... i thought we were friends. but ' + theirs + '? we\'re done.'
                            : o.username + ', how could you side with ' + theirs + '? don\'t make me choose.');
                        bot._factionCd = 250 + Math.floor(Math.random() * 200);
                        return true;
                    }
                }
                continue; // friend case handled; skip the stranger-cooling below
            }
        }

        // meeting a rival-faction member -> cool to them and stoke tension (enough tips into war).
        if (theirs && (rel === 'rival' || rel === 'war')) {
            social.noteInteraction(bot, o.username, -0.4);
            const nowWar = bumpTension(mine.name, theirs, 1);
            if (nowWar) {
                // a war declaration is news, announced to the whole area
                announce(bot, 'that\'s it - ' + mine.name + ' is at WAR with ' + theirs + '!');
                bot._factionCd = 300 + Math.floor(Math.random() * 200);
                return true;
            }
            if (Math.random() < 0.3) {
                speak(bot, rel === 'war'
                    ? o.username + ' - ' + theirs + ' scum. we\'re at war!'
                    : o.username + ' runs with ' + theirs + '. figures.');
                bot._factionCd = 250 + Math.floor(Math.random() * 200);
                return true;
            }
        }

        // an allied-faction member -> warmth, near-kin.
        if (theirs && rel === 'ally') {
            if (Math.random() < 0.2) {
                social.noteInteraction(bot, o.username, 0.3);
                speakGen(bot, 'factionAllyGreet', { faction: theirs }, 'good to see ' + theirs + ' - friends of ' + mine.name + '.');
                bot._factionCd = 300 + Math.floor(Math.random() * 200);
                return true;
            }
        }

        // a fellow member (or aligned human) -> warmth + belonging.
        if (theirs && theirs === mine.name) {
            sawKin = true;
            if (Math.random() < 0.2) {
                social.noteInteraction(bot, o.username, 0.3);
                // sometimes brag: the crew's ambition, its character, or just a warm hello.
                const r = Math.random();
                const amb = ambitionOf(mine.name);
                if (r < 0.2 && amb === 'biggest' && isBiggest(mine.name)) {
                    speak(bot, mine.name + ' - biggest crew in the land, and growing!');
                } else if (r < 0.4 && amb) {
                    speak(bot, mine.name + ' will ' + (AMBITIONS[amb] || 'make its mark') + ', mark my words.');
                } else {
                    // dynamic faction pride line
                    speakGen(bot, 'factionPride', { faction: mine.name }, mine.name + ' - ' + characterOf(mine.name) + ', and proud of it!');
                }
                bot._factionCd = 300 + Math.floor(Math.random() * 200);
                return true;
            }
        }
    }

    // a member that goes many check-ins without kin loses its ties.
    bot._factionLonely = sawKin ? 0 : (bot._factionLonely || 0) + 1;
    if (bot._factionLonely >= LONELY_LIMIT) {
        leave(bot);
        bot._factionCd = 400 + Math.floor(Math.random() * 400);
        return true;
    }

    bot._factionCd = 150 + Math.floor(Math.random() * 150);
    return false;
}

function founderOf(name) { return founders[name] || null; }

module.exports = {
    onTick, factionOf, areRivals, makeRivals, coinName, uniqueName, nameTaken, nameSimilarity,
    sizeOf, rosterOf, alignmentOf, noteAlign, allegianceName, leave, enlist, founderOf, characterOf, noteCharacter,
    ambitionOf, pickAmbition, AMBITIONS, isBiggest, joinAppetite, dominantFaction,
    makeAllies, areAllies, declareWar, atWar, makePeace, bumpTension, relationBetween, enemyAtWar, partyMission,
    moraleOf, bumpMorale, recordWarKill, warStanding,
    _rivalries: rivalries, _roster: roster, _humanAlign: humanAlign, _dissolved: dissolved, _founders: founders,
    _character: character, _ambition: ambition, _allies: allies, _warPairs: warPairs, _tension: tension
};
