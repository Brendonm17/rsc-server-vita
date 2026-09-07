// persistent feuds that escalate on each encounter (sour looks, then challenges,
// then blows) and can cool back to an "old foe". a bold bot may also call out a
// greater name; felling one earns glory. gated on personality, mood, and pvp safety

const personality = require('./personality');
const social = require('./social-emergent');

// memoised cross-module lookups for hot paths
const _m = {};
function mod(name) { return _m[name] || (_m[name] = require('./poller-registry').get(name)); }

function ledger(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return null;
    if (!cb.feuds) cb.feuds = {};
    return cb.feuds;
}

function feudWith(bot, name) {
    const l = ledger(bot);
    if (!l) return null;
    if (!l[name]) l[name] = { level: 0, wins: 0, losses: 0, met: 0 };
    return l[name];
}

// the rival the bot has lost to most (its nemesis)
function nemesis(bot) {
    const l = ledger(bot);
    if (!l) return null;
    let worst = null, worstNet = 0;
    for (const name of Object.keys(l)) {
        const f = l[name];
        const net = f.losses - f.wins;
        if (net > 0 && net > worstNet) { worstNet = net; worst = name; }
    }
    return worst;
}

// record the outcome of a clash with a rival (persists)
function recordOutcome(bot, name, won) {
    const f = feudWith(bot, name);
    if (!f) return;
    if (won) { f.wins += 1; personality.drift(bot, 'aggression', 0.01); }
    else { f.losses += 1; personality.drift(bot, 'risk', -0.01); }
    f.level = Math.min(10, f.level + 1);
}

function taunt(bot, name, level, grievance) {
    // dynamic taunt from chatgen, sometimes throwing a specific grievance back;
    // small hand pool fallback
    let out = null;
    try {
        if (grievance && Math.random() < 0.5) {
            out = require('./chatgen').generate('tauntGrudge', { name, topic: grievance }, bot);
        }
        if (!out) out = require('./chatgen').generate('taunt', { name }, bot);
    } catch (e) {}
    if (!out) {
        const barbs = level >= 6
            ? ['this ends now, ' + name + '.', name + ', i\'ve been waiting for you.', 'no running this time, ' + name + '.']
            : level >= 3
                ? ['you again, ' + name + '.', 'still sore about last time, ' + name + '?', 'come to lose again, ' + name + '?']
                : ['i don\'t like you, ' + name + '.', 'watch yourself, ' + name + '.', name + '. figures.'];
        out = barbs[Math.floor(Math.random() * barbs.length)];
        try { out = require('./voice').apply(bot, out); } catch (e) {}
    }
    // an initiating taunt is dispatched so the rival can bite back
    try { bot.broadcastChat(out); } catch (e) {}
}

function nameOf(o) {
    return (o.getFormattedUsername && o.getFormattedUsername()) || o.username;
}

// how much nerve a bot has to pick a fight above its station: temperament, mood,
// and recent pvp form. gates the "challenge a greater name" move
function nerve(bot) {
    const p = personality.of(bot);
    let n = p.aggression * 0.5 + (p.risk || 0) * 0.2;
    try { const m = mod('mood').of(bot); n += (m.confidence - 0.5) * 0.4 + (m.energy - 0.5) * 0.1; } catch (e) {}
    try { n += mod('memory').pvpConfidenceMod(bot) * 0.3; } catch (e) {}
    return n; // roughly -0.2 to +1
}

// no standing rival about, but a greater name is: call them out, souring them into
// a rival so the feud machinery takes over. personality + mood gated
function challengeGreaterName(bot, others) {
    // fameOf on the bot and every nearby player is costly, so run it on its own slow cadence
    if (bot._fameChalCd == null) bot._fameChalCd = Math.floor(Math.random() * 30);
    if (bot._fameChalCd-- > 0) return false;
    bot._fameChalCd = 25 + Math.floor(Math.random() * 25);

    // ambition scales in with level (a personal grudge, above, is not gated)
    try { if (Math.random() > mod('maturity').socialAmbition(bot)) { bot._fameChalCd = 120; return false; } } catch (e) {}

    const p = personality.of(bot);
    if (p.aggression < 0.5) { bot._fameChalCd = 300; return false; } // the meek don't reach above their weight
    if (nerve(bot) < 0.45) { bot._fameChalCd = 120; return false; }  // not while cowed or flat
    const legends = mod('legends');
    let myFame = 0;
    try { myFame = legends.fameOf(bot).fame; } catch (e) {}

    let best = null, bestGap = 0;
    for (const o of others) {
        if (!o || o === bot || o.id === bot.id || !o.username || o.opponent) continue;
        if (o.skills && o.skills.hits && o.skills.hits.current <= 0) continue;
        if (social.sentiment(bot, o.username) >= 3) continue; // never call out a friend
        let theirFame = 0;
        try { theirFame = legends.fameOf(o).fame; } catch (e) {}
        const gap = theirFame - myFame;
        if (theirFame < 40 || gap < 15) continue;  // must be a genuinely greater name
        if (gap > bestGap) { bestGap = gap; best = o; }
    }
    if (!best) return false;                                  // _fameChalCd already set above
    if (Math.random() > 0.4) { bot._fameChalCd = 200 + Math.floor(Math.random() * 200); return false; } // the rarer, gutsier move

    const ctx = { name: nameOf(best) };
    let line = null;
    try { line = mod('chatgen').generate('challengeFamous', ctx, bot); } catch (e) {}
    if (line) { try { bot.broadcastChat(line); } catch (e) {} } // not a reaction, a real event
    // the words seed a fresh mutual feud (a human mark has no bot-store, so its write no-ops)
    try { social.noteInteraction(bot, best.username, -3); } catch (e) {}
    try { social.noteInteraction(best, bot.username, -1.5); } catch (e) {}
    feudWith(bot, best.username).level = Math.min(10, feudWith(bot, best.username).level + 1);
    // stepping up to a legend gives a flicker of confidence
    try { mod('mood').nudge(bot, 'confidence', 0.03); } catch (e) {}
    bot._rivalCd = 300 + Math.floor(Math.random() * 300);
    return true;
}

// per-tick: act on a nearby rival's feud, escalating with its level and the bot's
// temperament (chat, or attack when hot + allowed); else maybe call out a greater name
function onTick(bot) {
    if (bot.opponent || bot.locked) return false;
    if (bot._rivalCd && bot._rivalCd > 0) { bot._rivalCd -= 1; return false; }
    // rate-limit the O(crowd) scan to ~20 ticks; a successful reaction below sets a longer cooldown
    bot._rivalCd = 20;

    let others = [];
    try { others = bot.getNearbyEntities('players', 5); } catch (e) { return false; }

    const led = ledger(bot);

    for (const o of others) {
        if (!o || o === bot || o.id === bot.id || !o.username) continue;
        const feel = social.sentiment(bot, o.username);
        const tag = social.tagOf(bot, o.username);

        // reconciliation: an old rival the bot has since warmed to becomes an old foe;
        // bury the hatchet once, out loud, and stand the feud down
        const old = led && led[o.username];
        if (old && old.level > 0 && !old.reconciled && feel >= 2) {
            old.reconciled = true;
            old.level = 0;
            personality.drift(bot, 'patience', 0.01);
            const name = (o.getFormattedUsername && o.getFormattedUsername()) || o.username;
            const lines = ['water under the bridge, ' + name + '.', 'no hard feelings, ' + name + '.', 'we\'ve both changed, ' + name + '. truce.'];
            const line = lines[Math.floor(Math.random() * lines.length)];
            try {
                let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {}
                bot._reactionSpeak = true;
                try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
            } catch (e) {}
            bot._rivalCd = 300 + Math.floor(Math.random() * 300);
            return true;
        }

        if (feel > -3 && tag !== 'rival') continue; // not a rival

        const f = feudWith(bot, o.username);
        f.reconciled = false; // a re-soured relationship can flare up again
        f.met += 1;
        // the feud deepens a notch each fresh encounter
        f.level = Math.min(10, f.level + 0.34);
        const lvl = Math.floor(f.level);

        try { bot.faceDirection(o.x - bot.x, o.y - bot.y); } catch (e) {}
        let grievance = null;
        try { grievance = require('./grievances').grievanceOf(bot, o.username); } catch (e) {}
        taunt(bot, (o.getFormattedUsername && o.getFormattedUsername()) || o.username, lvl, grievance);
        bot._rivalCd = 200 + Math.floor(Math.random() * 200);
        // a charged encounter colours the mood: dread facing a nemesis, boldness facing prey
        try {
            const mood = require('./mood');
            const net = (f.wins || 0) - (f.losses || 0);
            if (net <= -2) { mood.nudge(bot, 'confidence', -0.04); mood.nudge(bot, 'valence', -0.03); }
            else if (net >= 2) { mood.nudge(bot, 'confidence', 0.03); }
        } catch (e) {}
        // the fight itself happens through the combat brain; here we only stoke the feud
        return true;
    }

    // no standing rival to work; a bold bot may still call out a greater name
    return challengeGreaterName(bot, others);
}

// felling a greater name than your own. called from the pvp-kill detector (memory.js);
// only a genuinely bigger name earns renown, mood, and a tale
function onFelledName(bot, foe) {
    if (!bot || !foe || !foe.username) return false;
    const legends = mod('legends');
    let mine = 0, theirs = 0;
    try { mine = legends.fameOf(bot).fame; theirs = legends.fameOf(foe).fame; } catch (e) { return false; }
    if (theirs < 40 || theirs <= mine + 10) return false; // must be a real giant-kill

    // glory feeds fameOf directly, so a couple of giant-kills make a name
    const cb = bot.cache && bot.cache.bot;
    if (cb) cb.glory = Math.min(6, (cb.glory || 0) + 1);
    // a lift to confidence and spirits
    try { mod('mood').nudge(bot, 'confidence', 0.08); mod('mood').nudge(bot, 'valence', 0.06); } catch (e) {}
    // a tale the world retells (via lore.js) and a boast heard on the spot
    try { mod('lore').record(bot, 'kill', { subj: nameOf(foe), num: 1 }); } catch (e) {}
    try { require('./episodes').note(bot, 'felled', { name: nameOf(foe) }); } catch (e) {}
    let line = null;
    try { line = mod('chatgen').generate('felledName', { name: nameOf(foe) }, bot); } catch (e) {}
    if (line) { try { bot.broadcastChat(line); } catch (e) {} } // heard as news
    return true;
}

module.exports = { onTick, recordOutcome, nemesis, feudWith, ledger, onFelledName, nerve };
