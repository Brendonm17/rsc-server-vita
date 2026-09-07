// pvp appetite: a base rate per bot (off/rarely/sometimes/often) that mood tips
// into action, made sticky via a stand-down cooldown

const mood = require('./mood');
const personality = require('./personality');
const memory = require('./memory');

// appetite level 0..3 -> base probability
const BASE = [0, 0.15, 0.4, 0.75];

const APPETITE_NAMES = ['off', 'rarely', 'sometimes', 'often'];

// normalize a def's pvp (int 0..3, legacy bool, or name) to a level 0..3
function normalizeLevel(v) {
    if (v === true) return 2; // legacy pvp: true -> "sometimes"
    if (typeof v === 'string') {
        const i = APPETITE_NAMES.indexOf(v.toLowerCase());
        return i < 0 ? 0 : i;
    }
    const n = typeof v === 'number' ? Math.floor(v) : 0;
    return n < 0 ? 0 : n > 3 ? 3 : n;
}

function level(bot) {
    const cb = bot.cache && bot.cache.bot;
    return normalizeLevel(cb ? cb.pvp : 0);
}

function isPvp(bot) {
    return level(bot) > 0;
}

// effective 0..1 appetite after mood; always 0 for an 'off' bot
function appetite(bot) {
    const lvl = level(bot);
    if (lvl <= 0) {
        return 0;
    }
    let a = BASE[lvl];
    const m = mood.of(bot);
    if (m.energy < 0.3) a += 0.2; // bored -> wants action
    if (m.confidence > 0.7) a += 0.15; // on a roll -> bold
    if (m.confidence < 0.3) a -= 0.25; // rattled -> cautious
    if (m.valence < 0.3) a -= 0.1; // frustrated -> withdrawn
    a += memory.pvpConfidenceMod(bot); // learned: winners press, losers back off
    return a < 0 ? 0 : a > 1 ? 1 : a;
}

// how far above its own combat level a foe it will fight, clamped to [-0.25, +0.7]
function boldness(bot) {
    const m = mood.of(bot);
    const p = personality.of(bot);
    const lvl = level(bot);
    const raw =
        -0.15 +
        (p.risk || 0.5) * 0.4 +
        ((m.confidence || 0.5) - 0.5) * 0.4 +
        lvl * 0.05;
    return Math.max(-0.25, Math.min(0.7, raw));
}

// will this bot take on a foe of targetLevel given its own botLevel?
function willEngageLevel(bot, botLevel, targetLevel) {
    return targetLevel <= botLevel * (1 + boldness(bot));
}

// roll to head into the wilderness to hunt (checked at relocation boundaries)
function wantsToHunt(bot) {
    return Math.random() < appetite(bot);
}

// commit to a spotted player? on a "no", sets a stand-down window
function wantsToEngage(bot) {
    if (bot._pvpStandDown && bot._pvpStandDown > 0) {
        bot._pvpStandDown -= 1;
        return false;
    }
    if (Math.random() < appetite(bot)) {
        return true;
    }
    bot._pvpStandDown = 40 + Math.floor(Math.random() * 90); // ~25-85s off
    return false;
}

module.exports = {
    APPETITE_NAMES,
    normalizeLevel,
    level,
    isPvp,
    appetite,
    boldness,
    willEngageLevel,
    wantsToHunt,
    wantsToEngage
};
