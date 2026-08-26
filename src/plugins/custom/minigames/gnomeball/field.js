
const GNOME_GOAL = { x: 729, y: 450 };
const LOW_FIELD = { x: 742, y: 450 };

// GnomeField.Zone
const ZONE = {
    ONE_XP_INNER: 'ZONE_1XP_INNER',
    ONE_XP_OUTER: 'ZONE_1XP_OUTER',
    TWO_XP_INNER: 'ZONE_2XP_INNER',
    TWO_XP_OUTER: 'ZONE_2XP_OUTER',
    PASS: 'ZONE_PASS',
    NO_PASS: 'ZONE_NO_PASS',
    NOT_VISIBLE: 'ZONE_NOT_VISIBLE',
    OUTSIDE_THROWABLE: 'ZONE_OUTSIDE_THROWABLE',
    OUTSIDE_KEEP: 'ZONE_OUTSIDE_KEEP'
};

// distance from base to point, per-axis truncated toward zero
function discreteDistance(base, point, skewX, skewY) {
    const offsetX = skewX ? 0.5 : 0.0;
    const offsetY = skewY ? 0.5 : 0.0;
    const distanceX = Math.trunc(Math.abs(point.x - base.x + offsetX)); // skew right
    const distanceY = Math.trunc(Math.abs(point.y - base.y + offsetY)); // skew up
    return distanceX + distanceY;
}

// maps a player position to one of nine pitch zones
function resolvePositionToZone(player) {
    const distanceXToGoal = player.x - GNOME_GOAL.x;
    const distanceYToGoal = player.y - GNOME_GOAL.y;
    const skewedYdistToGoal = distanceYToGoal + 0.5;
    // low field shares its y-ref with the gnome goal, so only x distance matters
    const distanceXToLowField = player.x - LOW_FIELD.x;

    // zone of 2XP (inner)
    if (
        Math.abs(distanceYToGoal) <= 2 &&
        distanceXToGoal >= 0 &&
        distanceXToGoal <= 2
    ) {
        return ZONE.TWO_XP_INNER;
    } else if (
        // zone of 2XP (outer)
        Math.abs(skewedYdistToGoal) < 4 &&
        distanceXToGoal >= 5 &&
        distanceXToGoal <= 8
    ) {
        return ZONE.TWO_XP_OUTER;
    } else if (
        // zone 1xp check, safe since zone 2 already excluded
        Math.abs(skewedYdistToGoal) < 6 &&
        distanceXToGoal >= 1 &&
        distanceXToGoal <= 4
    ) {
        return ZONE.ONE_XP_INNER;
    } else if (
        // (outer)
        Math.abs(skewedYdistToGoal) < 6 &&
        distanceXToGoal >= 9 &&
        distanceXToGoal <= 12
    ) {
        return ZONE.ONE_XP_OUTER;
    } else if (
        // zone of passing the ball - pyramid-like from low field
        (player.x === LOW_FIELD.x &&
            distanceYToGoal >= -5 &&
            distanceYToGoal <= -1) ||
        (player.x > LOW_FIELD.x &&
            discreteDistance(
                { x: LOW_FIELD.x + 1, y: LOW_FIELD.y },
                { x: player.x, y: player.y },
                true,
                true
            ) <= 3)
    ) {
        return ZONE.PASS;
    } else if (
        // zone of no pass (intercepts of zone of passes checked earlier)
        (Math.abs(skewedYdistToGoal) < 6 &&
            distanceXToLowField >= 1 &&
            distanceXToLowField <= 5) ||
        (distanceXToLowField === 6 && Math.abs(skewedYdistToGoal) < 5)
    ) {
        return ZONE.NO_PASS;
    } else if (
        // no visibility zone
        (player.x === LOW_FIELD.x &&
            distanceYToGoal >= 0 &&
            distanceYToGoal <= 4) ||
        (distanceXToLowField >= -2 &&
            distanceXToLowField <= -1 &&
            Math.trunc(Math.abs(skewedYdistToGoal)) === 6) ||
        (Math.abs(skewedYdistToGoal) < 5 &&
            distanceXToGoal >= -1 &&
            distanceXToLowField <= 0) ||
        (distanceXToLowField === 2 && Math.abs(skewedYdistToGoal) < 4)
    ) {
        return ZONE.NOT_VISIBLE;
    } else if (
        // outside but throwable
        player.x >= 720 &&
        player.x <= 743 &&
        player.y >= 440 &&
        player.y <= 463
    ) {
        return ZONE.OUTSIDE_THROWABLE;
    }

    // outside but non-throwable (kept by player)
    return ZONE.OUTSIDE_KEEP;
}

module.exports = { ZONE, resolvePositionToZone, GNOME_GOAL, LOW_FIELD };
