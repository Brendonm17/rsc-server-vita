// bot personality: a vector of scalar weights (0..1) that parameterises the tasks/brains.
// assigned once at creation (archetype preset + jitter), persisted in cache.bot.personality.

const DIMENSIONS = [
    'aggression', // combat-vs-skilling pull; party-accept eagerness
    'risk', // eat threshold, tier pushing, wilderness willingness
    'greed', // loot filter, gold hoarding vs spending
    'sociability', // party-accept, chattiness, trading
    'diligence', // productivity vs idling/wandering
    'curiosity', // quest/explore weight vs grinding one spot
    'patience' // break frequency, activity-rotation cadence
];

// archetype baseline weights; a real bot is one of these plus jitter
const ARCHETYPES = {
    warrior: { aggression: 0.9, risk: 0.7, greed: 0.5, sociability: 0.6, diligence: 0.7, curiosity: 0.3, patience: 0.4 },
    skiller: { aggression: 0.1, risk: 0.3, greed: 0.6, sociability: 0.3, diligence: 0.9, curiosity: 0.4, patience: 0.8 },
    merchant: { aggression: 0.2, risk: 0.3, greed: 0.9, sociability: 0.7, diligence: 0.6, curiosity: 0.5, patience: 0.6 },
    wanderer: { aggression: 0.3, risk: 0.5, greed: 0.3, sociability: 0.6, diligence: 0.2, curiosity: 0.9, patience: 0.3 },
    loner: { aggression: 0.5, risk: 0.5, greed: 0.5, sociability: 0.05, diligence: 0.7, curiosity: 0.4, patience: 0.6 },
    quester: { aggression: 0.4, risk: 0.4, greed: 0.4, sociability: 0.6, diligence: 0.6, curiosity: 0.9, patience: 0.6 },
    casual: { aggression: 0.4, risk: 0.5, greed: 0.4, sociability: 0.7, diligence: 0.3, curiosity: 0.5, patience: 0.3 }
};

const ARCHETYPE_NAMES = Object.keys(ARCHETYPES);

function clamp01(n) {
    return Math.max(0, Math.min(1, n));
}

const JITTER = 0.12; // +/- per dimension so same-archetype bots differ

function randomArchetype() {
    return ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)];
}

// build a jittered personality from an archetype name ('random' picks one)
function makePersonality(archetypeName) {
    let name = archetypeName;

    if (!name || name === 'random' || !ARCHETYPES[name]) {
        name = randomArchetype();
    }

    const base = ARCHETYPES[name];
    const personality = { archetype: name };

    for (const dim of DIMENSIONS) {
        personality[dim] = clamp01(base[dim] + (Math.random() * 2 - 1) * JITTER);
    }

    return personality;
}

// the archetype's exact preset weights with no jitter; unknown falls back to casual
function basePreset(archetypeName) {
    const name = ARCHETYPES[archetypeName] ? archetypeName : 'casual';
    const base = ARCHETYPES[name];
    const preset = { archetype: name };
    for (const dim of DIMENSIONS) {
        preset[dim] = base[dim];
    }
    return preset;
}

// read helper, tolerates a bot with no personality (returns a neutral default)
function of(bot) {
    const base = bot && bot.cache && bot.cache.bot && bot.cache.bot.personality;

    if (base) {
        const drift = bot.cache.bot.drift;
        if (!drift) {
            return base;
        }
        // effective personality = fixed base nudged by accumulated drift
        const eff = { archetype: base.archetype };
        for (const dim of DIMENSIONS) {
            const v = (base[dim] != null ? base[dim] : 0.5) + (drift[dim] || 0);
            eff[dim] = v < 0 ? 0 : v > 1 ? 1 : v;
        }
        return eff;
    }

    const neutral = { archetype: 'casual' };
    for (const dim of DIMENSIONS) {
        neutral[dim] = 0.5;
    }
    return neutral;
}

// experience bends a bot's personality over time; each trait's drift is clamped to
// +/-0.25 so the core persists. persisted in cache.bot.drift.
function drift(bot, trait, delta) {
    if (!bot || !bot.cache || !bot.cache.bot) return;
    if (!bot.cache.bot.drift) bot.cache.bot.drift = {};
    const d = bot.cache.bot.drift;
    const v = (d[trait] || 0) + delta;
    d[trait] = v < -0.25 ? -0.25 : v > 0.25 ? 0.25 : v;
}

// eat-at fraction of max hp from risk: daredevil ~30%, coward ~60%
function baseEatAt(personality) {
    return clamp01(0.6 - personality.risk * 0.3);
}

module.exports = {
    DIMENSIONS,
    ARCHETYPES,
    ARCHETYPE_NAMES,
    makePersonality,
    basePreset,
    randomArchetype,
    of,
    drift,
    baseEatAt,
    clamp01
};
