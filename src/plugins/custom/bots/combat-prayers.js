// light the best affordable stat-boosting prayers during a fight, stand them down when idle.
// three combat stat groups (prayer indices from rsc-data), strongest usable last:
//   defense : thick skin(0) / rock skin(3) / steel skin(9)
//   strength: burst(1) / superhuman(4) / ultimate(10)
//   attack  : clarity(2) / improved(5) / incredible(11)
const prayersData = require('@2003scape/rsc-data/config/prayers');
const prayerHandler = require('../../../packet-handlers/prayer');
const personality = require('./personality');

const GROUPS = {
    defense: [0, 3, 9],
    strength: [1, 4, 10],
    attack: [2, 5, 11]
};

// strongest prayer index in a group the bot's level unlocks, or -1
function bestInGroup(bot, group) {
    const lvl = bot.skills && bot.skills.prayer ? bot.skills.prayer.base : 1;
    let best = -1;
    for (const idx of GROUPS[group]) {
        if (prayersData[idx].level <= lvl) {
            best = idx; // groups are level-ascending, last that fits is strongest
        }
    }
    return best;
}

function combatLevelOf(e, fallback) {
    return e && e.getCombatLevel ? e.getCombatLevel() : (e && e.combatLevel) || fallback;
}

function hpFrac(bot) {
    const h = bot.skills && bot.skills.hits;
    return h && h.base ? h.current / h.base : 1; // skills are {current, base}, no .max
}

// worth praying: foe is a real threat (>= 0.6x the bot's level, or a player) or the bot is hurt
function worthPraying(bot, foe) {
    const pray = bot.skills && bot.skills.prayer;
    if (!pray || pray.base < 1 || pray.current < 2) {
        return false;
    }
    if (foe && foe.username) {
        return true; // pvp always worth it
    }
    const myCl = combatLevelOf(bot, 3);
    const foeCl = combatLevelOf(foe, myCl);
    return foeCl >= myCl * 0.6 || hpFrac(bot) < 0.7;
}

// turn on the best affordable prayers; group count scales with points, order by hurt then temperament
function activate(bot, foe) {
    const pray = bot.skills.prayer;
    const frac = pray.base ? pray.current / pray.base : 0;
    const budget = frac >= 0.5 ? 3 : frac >= 0.25 ? 2 : 1;

    const p = personality.of(bot);
    const order = [];
    if (hpFrac(bot) < 0.7) {
        order.push('defense');
    }
    if (p.aggression >= 0.5) {
        order.push('strength', 'attack');
    } else {
        order.push('attack', 'strength');
    }
    order.push('defense'); // keep defense a candidate even when not hurt
    const groups = [];
    for (const g of order) {
        if (!groups.includes(g)) {
            groups.push(g);
        }
    }

    let lit = 0;
    for (const g of groups) {
        if (lit >= budget) {
            break;
        }
        const idx = bestInGroup(bot, g);
        if (idx < 0) {
            continue; // level doesn't unlock this group yet
        }
        if (bot.prayers[idx]) {
            lit += 1; // already on, counts against budget
            continue;
        }
        prayerHandler.prayerOn({ player: bot }, { index: idx }).catch(() => {});
        lit += 1;
    }
    return lit > 0;
}

// turn off every active prayer when idle
function standDown(bot) {
    if (!bot.prayers) {
        return false;
    }
    let any = false;
    for (let i = 0; i < bot.prayers.length; i += 1) {
        if (bot.prayers[i]) {
            prayerHandler.prayerOff({ player: bot }, { index: i }).catch(() => {});
            any = true;
        }
    }
    return any;
}

// per-tick poller: pray while fighting a worthy foe, stand down otherwise; re-eval throttled
function tick(bot) {
    // no-prayer duel rule: prayers stay off
    if (bot.duel && bot.duel.isDuelActive() && bot.duel.getDuelSetting(2)) {
        return;
    }
    const foe = bot.opponent;
    if (foe) {
        bot._prayTick = (bot._prayTick || 0) + 1;
        const newFoe = bot._prayFoe !== foe;
        if (newFoe) {
            bot._prayFoe = foe;
            bot._prayTick = 1;
        }
        if (newFoe || bot._prayTick % 5 === 1) {
            if (worthPraying(bot, foe)) {
                activate(bot, foe);
            }
        }
        return;
    }
    // not fighting
    bot._prayFoe = null;
    if (bot.prayers && bot.prayers.some((on) => on)) {
        standDown(bot);
    }
}

module.exports = { tick, worthPraying, bestInGroup, activate, standDown, GROUPS };
