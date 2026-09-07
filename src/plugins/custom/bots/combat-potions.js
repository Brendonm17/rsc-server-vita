// bot drinks combat potions to boost its fighting style's stat, only in a tough fight
// and only when that stat isn't already boosted. drinks via items/quaffable.js
const itemDefs = require('@2003scape/rsc-data/config/items');
const quaffable = require('../../items/quaffable');

// itemId -> { stat, tier } for every combat-boost potion, all doses (super = tier 2).
// built by name from the item table (magic potions excluded, they're custom items)
const POTION_STAT = (() => {
    const map = {};
    for (const [id, def] of Object.entries(itemDefs)) {
        if (!def || !def.name || def.command !== 'Drink') {
            continue;
        }
        const n = def.name.toLowerCase();
        let stat = null;
        if (/attack potion/.test(n)) { stat = 'attack'; } else if (/strength potion/.test(n)) { stat = 'strength'; } else if (/defense potion/.test(n)) { stat = 'defense'; } else if (/ranging potion/.test(n)) { stat = 'ranged'; }
        if (stat) {
            map[Number(id)] = { stat, tier: /super/.test(n) ? 2 : 1 };
        }
    }
    return map;
})();

// cure-poison / antidote potions, drunk to shed poison; built by name
const CURE_IDS = (() => {
    const s = new Set();
    for (const [id, def] of Object.entries(itemDefs)) {
        if (!def || !def.name || def.command !== 'Drink') {
            continue;
        }
        if (/cure poison potion|poison antidote/.test(def.name.toLowerCase())) {
            s.add(Number(id));
        }
    }
    return s;
})();

function isPoisoned(bot) {
    return bot.poisonPower !== undefined && bot.poisonPower !== null;
}

// cure poison as soon as the bot is poisoned and carries a cure/antidote potion
function curePoisonIfNeeded(bot) {
    if (!isPoisoned(bot)) {
        return false;
    }
    for (const it of bot.inventory.items) {
        if (CURE_IDS.has(it.id)) {
            quaffable.onInventoryCommand(bot, it).catch(() => {});
            return true;
        }
    }
    return false;
}

function combatLevelOf(e, fallback) {
    return e && e.getCombatLevel ? e.getCombatLevel() : (e && e.combatLevel) || fallback;
}

function hpFrac(bot) {
    const h = bot.skills && bot.skills.hits;
    return h && h.base ? h.current / h.base : 1; // skills are {current, base}, no .max
}

// offensive stat(s) for the bot's fighting style: last combat type, else focus, else melee
function offensiveStats(bot) {
    const t = bot._lastCombatType || (bot.cache && bot.cache.bot && bot.cache.bot.focus) || 'melee';
    if (t === 'ranged') {
        return ['ranged'];
    }
    if (t === 'magic') {
        return ['magic'];
    }
    return ['strength', 'attack'];
}

function statBoosted(bot, stat) {
    const s = bot.skills && bot.skills[stat];
    return s ? s.current > s.base : false;
}

// strongest carried potion for a stat (super > normal), or null if none carried
function bestCarriedPotion(bot, stat) {
    let best = null;
    for (const it of bot.inventory.items) {
        const info = POTION_STAT[it.id];
        if (!info || info.stat !== stat) {
            continue;
        }
        if (!best || info.tier > POTION_STAT[best.id].tier) {
            best = it;
        }
    }
    return best;
}

// only worth a potion on a tough fight (>= ~0.85x the bot's level, or a player)
function worthPotion(bot, foe) {
    if (!foe) {
        return false;
    }
    if (foe.username) {
        return true;
    }
    const myCl = combatLevelOf(bot, 3);
    return combatLevelOf(foe, myCl) >= myCl * 0.85;
}

// per-tick: in a tough fight, top up the offensive stat (and defense if hurt) from a
// carried potion, skipping boosted stats. one drink per pass, throttled
function tick(bot) {
    // shed poison first; it ticks damage whether or not the bot is fighting
    if (curePoisonIfNeeded(bot)) {
        return true;
    }
    const foe = bot.opponent;
    if (!foe) {
        bot._potFoe = null;
        return false;
    }
    if (!worthPotion(bot, foe)) {
        return false;
    }
    const newFoe = bot._potFoe !== foe;
    bot._potFoe = foe;
    bot._potTick = (bot._potTick || 0) + 1;
    if (!newFoe && bot._potTick % 4 !== 1) {
        return false;
    }
    const stats = offensiveStats(bot);
    if (hpFrac(bot) < 0.55) {
        stats.push('defense'); // under real pressure, a defense potion helps it survive
    }
    for (const stat of stats) {
        if (statBoosted(bot, stat)) {
            continue; // already boosted, don't waste a dose
        }
        const pot = bestCarriedPotion(bot, stat);
        if (pot) {
            quaffable.onInventoryCommand(bot, pot).catch(() => {});
            return true; // one drink per pass; next pass tops up the next stat
        }
    }
    return false;
}

module.exports = { tick, worthPotion, offensiveStats, bestCarriedPotion, statBoosted, curePoisonIfNeeded, isPoisoned, POTION_STAT, CURE_IDS };
