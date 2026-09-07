// a bot earns a public standing from what it does, readable by other bots;
// a stranger's reputation colours how bots treat them

const personality = require('./personality');

function store(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return null;
    if (!cb.rep) cb.rep = { pk: 0, help: 0, trade: 0, boss: 0, craft: 0, crasher: 0 };
    if (cb.rep.crasher == null) cb.rep.crasher = 0;
    return cb.rep;
}

// record a reputation-earning deed
function note(bot, kind, n) {
    const r = store(bot);
    if (r) r[kind] = (r[kind] || 0) + (n || 1);
}

function combatLevel(bot) {
    return bot.getCombatLevel ? bot.getCombatLevel() : bot.combatLevel || 3;
}

// reputation tags a character has earned, strongest first (empty for a human)
function tagsOf(who) {
    const cb = who && who.cache && who.cache.bot;
    if (!cb) return [];
    const r = cb.rep || {};
    const tags = [];
    if ((r.pk || 0) >= 5) tags.push('pker');
    if ((r.boss || 0) >= 1) tags.push('slayer');
    if (combatLevel(who) >= 80 || (cb.dreamsAchieved || 0) >= 3) tags.push('legend');
    if ((r.help || 0) >= 5) tags.push('helper');
    if ((r.craft || 0) >= 5) tags.push('crafter'); // forged or brewed many goods
    if ((r.trade || 0) >= 10) tags.push('merchant');
    if ((r.crasher || 0) >= 4) tags.push('crasher'); // keeps crashing others' spawns; a secondary trait, never the headline
    return tags;
}

const LABELS = {
    pker: 'a feared PKer',
    slayer: 'a monster slayer',
    legend: 'a bit of a legend',
    helper: 'a helpful soul',
    crafter: 'a master craftsman',
    merchant: 'a shrewd merchant',
    crasher: 'a greedy spawn-crasher'
};

// the single headline label, or null if nobody special
function label(who) {
    const t = tagsOf(who);
    return t.length ? LABELS[t[0]] : null;
}

function hasTag(who, tag) {
    return tagsOf(who).indexOf(tag) !== -1;
}

// first-impression sentiment seed from other's reputation, applied once per pair
function firstImpression(bot, other) {
    if (!other || !other.username) return 0;
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return 0;
    if (!cb.social) cb.social = { rel: {}, greeted: {} };
    if (!cb.social.met) cb.social.met = {};
    if (cb.social.met[other.username]) return 0; // already sized them up
    cb.social.met[other.username] = 1;
    let seed = 0;
    if (hasTag(other, 'helper')) seed += 2;
    if (hasTag(other, 'legend')) seed += 1;
    if (hasTag(other, 'merchant')) seed += 1;
    if (hasTag(other, 'crafter')) seed += 1; // a known maker earns respect
    if (hasTag(other, 'pker')) {
        // the timid fear a pker; the bold respect them
        const p = personality.of(bot);
        seed += p.aggression > 0.6 ? 1 : -2;
    }
    if (hasTag(other, 'crasher')) seed -= 2; // a known spawn-crasher gets a cool reception
    // a name on the legends board earns awe on sight, even if never met
    try {
        if (require('./legends').isLegend(other.username)) seed += 2;
    } catch (e) {}
    if (seed !== 0) {
        try { require('./social-emergent').noteInteraction(bot, other.username, seed); } catch (e) {}
    }
    return seed;
}

module.exports = { note, tagsOf, label, hasTag, firstImpression };
