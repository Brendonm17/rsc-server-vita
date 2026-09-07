// bots build lasting relationships and act on them in passing: greet friends, taunt rivals, admire the strong.
// rate-limited, chat-only, gated by sociability; relationships persist in cache.bot.social.

const personality = require('./personality');
const mood = require('./mood');
const memory = require('./memory');
const chatgen = require('./chatgen');

function store(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) {
        return null;
    }
    if (!cb.social) {
        cb.social = { rel: {}, greeted: {} };
    }
    if (!cb.social.rel) {
        cb.social.rel = {};
    }
    if (!cb.social.greeted) {
        cb.social.greeted = {};
    }
    return cb.social;
}

// -N..+N sentiment toward another character (0 = stranger); a memory grudge pulls it negative
function sentiment(bot, username) {
    const s = store(bot);
    let v = s && s.rel[username] ? s.rel[username] : 0;
    if (memory.holdsGrudge(bot, username)) {
        v -= 4;
    }
    return v;
}

// record a relationship-shaping interaction (partied/traded warmer, a slight/defeat cooler), clamped.
// crossing a threshold promotes the bond to a friend or a rival.
function noteInteraction(bot, username, delta) {
    const s = store(bot);
    if (!s || !username) {
        return;
    }
    const v = (s.rel[username] || 0) + delta;
    s.rel[username] = v < -10 ? -10 : v > 10 ? 10 : v;

    if (!s.tags) {
        s.tags = {};
    }
    const val = s.rel[username];
    if (val >= 5) {
        s.tags[username] = 'friend';
    } else if (val <= -4) {
        s.tags[username] = 'rival';
    } else if (s.tags[username] && val > -2 && val < 3) {
        delete s.tags[username]; // cooled/warmed back to neutral -> just an acquaintance
    }
}

function tagOf(bot, username) {
    const s = store(bot);
    if (s && s.tags && s.tags[username]) {
        return s.tags[username];
    }
    return memory.holdsGrudge(bot, username) ? 'rival' : null;
}

// the bot's closest friend / worst rival, if any (highest/lowest sentiment).
function bestFriend(bot) {
    const s = store(bot);
    if (!s) return null;
    let best = null, bestV = 4;
    for (const u of Object.keys(s.rel)) {
        if (s.rel[u] > bestV) { bestV = s.rel[u]; best = u; }
    }
    return best;
}
function topRival(bot) {
    const s = store(bot);
    if (!s) return null;
    let worst = null, worstV = -3;
    for (const u of Object.keys(s.rel)) {
        if (s.rel[u] < worstV) { worstV = s.rel[u]; worst = u; }
    }
    return worst;
}

// generative line for a social situation; name fills {name}
function say(bot, situation, name) {
    try {
        const line = chatgen.generate(situation, { name }, bot);
        if (line) {
            bot.broadcastChat(line);
        }
    } catch (e) {
        // no audience
    }
}

function nameOf(other) {
    return (other.getFormattedUsername && other.getFormattedUsername()) || other.username || 'friend';
}

function combatLevelOf(c) {
    return c.getCombatLevel ? c.getCombatLevel() : c.combatLevel || 3;
}

// per-tick: notice nearby characters and react socially (short-range scan, rate-limited); chat + facing only
function onTick(bot) {
    const s = store(bot);
    if (!s) {
        return;
    }

    // unreinforced ties drift toward neutral: grudges cool, warmth cools gentler. only neglected
    // ties drift home; active ones, reinforced each meeting, endure. runs on its own clock.
    bot._relHealCd = (bot._relHealCd || 0) - 1;
    if (bot._relHealCd <= 0) {
        bot._relHealCd = 300 + Math.floor(Math.random() * 200);
        for (const u of Object.keys(s.rel)) {
            const v = s.rel[u];
            if (v < 0) noteInteraction(bot, u, Math.min(0.2, -v));        // grudge -> neutral
            else if (v > 0) noteInteraction(bot, u, -Math.min(0.1, v));   // warmth -> neutral (gentler)
        }
    }

    if (bot._socialCd > 0) {
        bot._socialCd -= 1;
        return;
    }
    // don't chatter mid-fight / mid-action
    if (bot.opponent || bot.locked) {
        return;
    }

    const p = personality.of(bot);
    if (p.sociability < 0.2) {
        // a true loner: near-silent, only very rarely mutters
        bot._socialCd = 400 + Math.floor(Math.random() * 400);
        return;
    }

    let others = [];
    try {
        others = bot.getNearbyEntities('players', 5);
    } catch (e) {
        return;
    }
    // target score: relationship first, the last partner and anyone mid-greeting lower
    let target = null, bestScore = -1e9;
    const nowT = bot.world ? bot.world.ticks | 0 : 0;
    for (const o of others) {
        if (!o || o === bot || o.id === bot.id || !o.username) continue;
        let sc = 1 + Math.random() * 0.5 + Math.max(-2, Math.min(4, sentiment(bot, o.username))) * 0.3;
        if (bot._lastPartner === o.username) sc -= 0.8;
        if (nowT - (o._greetedAt || 0) < 40) sc -= 0.5;
        if (sc > bestScore) { bestScore = sc; target = o; }
    }
    if (!target) {
        bot._socialCd = 20 + Math.floor(Math.random() * 40);
        return;
    }

    const name = nameOf(target);

    // greeted by someone in the crowd moments ago: don't pile on
    const now = bot.world ? bot.world.ticks | 0 : 0;
    if (now - (target._greetedAt || 0) < 40) {
        bot._socialCd = 40 + Math.floor(Math.random() * 80);
        return;
    }

    // first impression: seed the relationship (once) from a stranger's known reputation
    let reptags = [];
    try {
        const rep = require('./reputation');
        rep.firstImpression(bot, target);
        reptags = rep.tagsOf(target);
    } catch (e) {
        // reputation optional
    }

    const feel = sentiment(bot, target.username);
    const m = mood.of(bot);

    // face them, a small acknowledgement; cosmetic
    try {
        bot.faceDirection(target.x - bot.x, target.y - bot.y);
    } catch (e) {
        // facing is cosmetic
    }

    // rival: a grudge -> a taunt
    if (feel <= -3) {
        say(bot, 'taunt', name);
        bot._socialCd = 200 + Math.floor(Math.random() * 200);
        return;
    }

    // reputation reactions: warn about a PKer, gush over a legend, before the generic greeting (non-friends only)
    if (feel < 3 && reptags.length && Math.random() < 0.5) {
        if (reptags.indexOf('pker') !== -1) {
            say(bot, 'reactPKerWary', name);
            bot._socialCd = 200 + Math.floor(Math.random() * 200);
            return;
        }
        if (reptags.indexOf('legend') !== -1) {
            say(bot, 'reactLegendAwe', name);
            noteInteraction(bot, target.username, 0.3);
            bot._socialCd = 250 + Math.floor(Math.random() * 250);
            return;
        }
    }

    // pick the social act by relationship and who they are
    if (feel >= 3) {
        // old comrades who share a saga sometimes reminisce instead of a plain hello
        let saga = null;
        try { saga = require('./lore').sharedSagaWith(bot, target); } catch (e) {}
        if (saga && Math.random() < 0.35) {
            try {
                const line = 'remember when we took down ' + saga + ', ' + name + '?';
                let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {}
                bot._reactionSpeak = true;
                try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
            } catch (e) {}
        } else {
            say(bot, 'greetFriend', name);
        }
    } else if (feel >= 1 || s.rel[target.username]) {
        // building a bit of familiarity -> hang out a little
        say(bot, Math.random() < 0.5 ? 'greet' : 'companion', name);
        noteInteraction(bot, target.username, 0.2); // proximity warms slowly
    } else if (combatLevelOf(target) > combatLevelOf(bot) * 1.6) {
        // a much stronger neighbour -> admiration
        say(bot, 'admire', name);
        noteInteraction(bot, target.username, 0.3);
    } else {
        // a stranger -> a polite hello, sometimes (chattier bots more often)
        if (Math.random() < 0.3 + p.sociability * 0.5) {
            say(bot, 'greet', name);
        }
        noteInteraction(bot, target.username, 0.2);
    }

    // chatty bots come back sooner, quiet ones wait longer; a good mood shortens it; jittered per bot
    const baseCd = (300 + (1 - p.sociability) * 700 - (m.valence - 0.5) * 100) * (0.7 + Math.random() * 0.6);
    bot._socialCd = Math.max(60, Math.floor(baseCd));
    target._greetedAt = now;
}

// when victim is cut down, its nearby bot friends turn on the killer (plus a pang of grief);
// returns how many friends were moved.
function avengeFallen(victim, killer) {
    if (!victim || !killer || !killer.username) return 0;
    let moved = 0;
    let nearby;
    try { nearby = victim.getNearbyEntities('players', 6); } catch (e) { return 0; }
    for (const w of nearby) {
        if (!w || !w.isBot || w === victim || w.username === killer.username) continue;
        const feel = sentiment(w, victim.username);
        if (feel >= 3) { // a friend of the fallen
            noteInteraction(w, killer.username, -3); // now holds a grudge against the killer
            try { require('./mood').nudge(w, 'valence', -0.05); } catch (e) {}
            moved += 1;
            // a close friend of the fallen grieves openly, a spoken loss the world hears; only for a true bond
            if (feel >= 6 && Math.random() < 0.7) {
                try { require('./mood').nudge(w, 'valence', -0.08); } catch (e) {}
                let line = null;
                const who = (victim.getFormattedUsername && victim.getFormattedUsername()) || victim.username;
                try { line = require('./chatgen').generate('grieveFriend', { name: who }, w); } catch (e) {}
                if (line) { try { w.broadcastChat(line); } catch (e) {} } // heard by the map
            }
        }
    }
    return moved;
}

// a shared moment: something good happened with others around, warming them to the bot and back (mutual);
// how sharing an achievement near strangers slowly turns them into friends. returns how many it bonded with.
function bondNearby(bot, amount, range) {
    if (!bot || typeof bot.getNearbyEntities !== 'function') {
        return 0;
    }
    let n = 0;
    try {
        // every nearby player (bots and the human); the warmth is mutual for a bot peer, and the
        // reciprocal write no-ops for the human.
        for (const o of bot.getNearbyEntities('players', range || 5)) {
            if (o && o !== bot && o.id !== bot.id && o.username) {
                noteInteraction(bot, o.username, amount);
                try { noteInteraction(o, bot.username, amount); } catch (e) {}
                n++;
            }
        }
    } catch (e) {}
    return n;
}

module.exports = {
    onTick,
    sentiment,
    noteInteraction,
    bondNearby,
    tagOf,
    bestFriend,
    topRival,
    avengeFallen
};
