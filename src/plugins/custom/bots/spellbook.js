// combat missile spells a bot can throw, and the best it can afford now.
// the cast runs through spell.js castNPC/castPlayer

// [index, magic level, [[runeId, amount], ...]]. rune ids: 31 fire, 32 water,
// 33 air, 34 earth, 35 mind, 38 death, 41 chaos, 619 blood. air is free with a staff of air
const MISSILES = [
    { index: 0, level: 1, runes: [[33, 1], [35, 1]] }, // Wind strike
    { index: 2, level: 5, runes: [[32, 1], [33, 1], [35, 1]] }, // Water strike
    { index: 4, level: 9, runes: [[34, 2], [33, 1], [35, 1]] }, // Earth strike
    { index: 6, level: 13, runes: [[31, 3], [33, 2], [35, 1]] }, // Fire strike
    { index: 8, level: 17, runes: [[33, 2], [41, 1]] }, // Wind bolt
    { index: 11, level: 23, runes: [[32, 2], [33, 2], [41, 1]] }, // Water bolt
    { index: 14, level: 29, runes: [[34, 3], [33, 2], [41, 1]] }, // Earth bolt
    { index: 17, level: 35, runes: [[31, 4], [33, 3], [41, 1]] }, // Fire bolt
    { index: 20, level: 41, runes: [[33, 3], [38, 1]] }, // Wind blast
    { index: 23, level: 47, runes: [[32, 3], [33, 3], [38, 1]] }, // Water blast
    { index: 27, level: 53, runes: [[34, 4], [33, 3], [38, 1]] }, // Earth blast
    { index: 32, level: 59, runes: [[31, 5], [33, 4], [38, 1]] }, // Fire blast
    { index: 37, level: 62, runes: [[33, 5], [619, 1]] }, // Wind wave
    { index: 39, level: 65, runes: [[32, 7], [33, 5], [619, 1]] }, // Water wave
    { index: 43, level: 70, runes: [[34, 7], [33, 5], [619, 1]] }, // Earth wave
    { index: 45, level: 75, runes: [[31, 7], [33, 5], [619, 1]] } // Fire wave
];

const STAFF_OF_AIR = 101;
const AIR_RUNE = 33;

function countId(bot, id) {
    let n = 0;
    for (const it of bot.inventory.items) {
        if (it.id === id) {
            n += it.amount || 1;
        }
    }
    return n;
}

// a wielded staff of air makes air runes free
function hasAirStaff(bot) {
    return bot.inventory.items.some((it) => it.id === STAFF_OF_AIR && it.equipped);
}

function canCast(bot, spell) {
    if (!bot.skills || !bot.skills.magic) {
        return false;
    }
    if (bot.skills.magic.current < spell.level) {
        return false;
    }
    const airFree = hasAirStaff(bot);
    for (const [id, amt] of spell.runes) {
        if (id === AIR_RUNE && airFree) {
            continue;
        }
        if (countId(bot, id) < amt) {
            return false;
        }
    }
    return true;
}

// highest missile spell the bot can cast now, or null
function bestCombatSpell(bot) {
    for (let i = MISSILES.length - 1; i >= 0; i -= 1) {
        if (canCast(bot, MISSILES[i])) {
            return MISSILES[i];
        }
    }
    return null;
}

// whether the bot can cast any combat spell
function canFightWithMagic(bot) {
    return bestCombatSpell(bot) !== null;
}

module.exports = {
    MISSILES,
    STAFF_OF_AIR,
    AIR_RUNE,
    hasAirStaff,
    canCast,
    bestCombatSpell,
    canFightWithMagic
};
