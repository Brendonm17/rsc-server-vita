// shared batch-progression helper for gathering/production skills

// batch cap keyed on player's max base level in the skill
function getRepeatTimes(baseLevel) {
    if (baseLevel <= 10) return 10;
    if (baseLevel <= 19) return 12;
    if (baseLevel <= 29) return 14;
    if (baseLevel <= 39) return 16;
    if (baseLevel <= 49) return 20;
    if (baseLevel <= 59) return 24;
    if (baseLevel <= 69) return 32;
    if (baseLevel <= 79) return 40;
    if (baseLevel <= 89) return 48;
    if (baseLevel <= 95) return 56;
    if (baseLevel <= 99) return 64;
    return 1000;
}

// is batch progression enabled for this world (defaults on)
function wantBatching(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantBatchProgression !== false;
}

// repeat count for a batch: capped by base level, else 1
function getBatchCount(player, skillName) {
    if (!wantBatching(player)) {
        return 1;
    }

    const skill = player.skills[skillName];
    // OpenRSC keys the cap on getMaxStat (the base/unboosted level).
    const baseLevel = skill ? skill.base : 1;

    return getRepeatTimes(baseLevel);
}

module.exports = { getRepeatTimes, wantBatching, getBatchCount };
