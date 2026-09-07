// drink potion of saradomin: doses down 3->2->1->empty vial. each dose drains
// attack/strength/ranged/magic 10%, boosts defense 20% and hits 15%; last dose
// triples every modifier. item ids resolved by name at load. magic skills is
// just magic in this era.

const items = require('@2003scape/rsc-data/config/items');

const EMPTY_VIAL_ID = 465;
const MAGIC_SKILLS = ['magic'];

let DOSES = null;
function doseChain(potionName) {
    if (!DOSES) {
        DOSES = {};
        for (let id = 0; id < items.length; id += 1) {
            const def = items[id];
            if (!def) {
                continue;
            }
            const match = (def.description || '').match(
                /(\d+)\s*doses?\s*of\s*(.+?)\s*potion/i
            );
            if (match) {
                const name = def.name.toLowerCase();
                DOSES[name] = DOSES[name] || {};
                DOSES[name][+match[1]] = id;
            }
        }
    }

    const doses = DOSES[potionName];
    if (doses) {
        return doses;
    }

    // potion of saradomin has no dose text, so resolve its 3 same-named ids by
    // scan order: full, two-dose, one-dose.
    const found = [];
    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];
        if (def && def.name && def.name.toLowerCase() === potionName) {
            found.push(id);
        }
    }
    if (found.length !== 3) {
        throw new RangeError(`saradomin-potion.js: expected 3 doses of "${potionName}", found ${found.length}`);
    }
    return { 3: found[0], 2: found[1], 1: found[2] };
}

let HANDLERS = null;
function handlers() {
    if (HANDLERS) {
        return HANDLERS;
    }

    const doses = doseChain('potion of saradomin');
    HANDLERS = new Map([
        [doses[3], { nextItem: doses[2], dosesLeft: 2, isLastDose: false }],
        [doses[2], { nextItem: doses[1], dosesLeft: 1, isLastDose: false }],
        [doses[1], { nextItem: EMPTY_VIAL_ID, dosesLeft: 0, isLastDose: true }]
    ]);

    return HANDLERS;
}

function addstat(player, statId, constant, percent) {
    const skill = player.skills[statId];
    const maxBoost = skill.base + constant + Math.floor((skill.base * percent) / 100);
    let newLevel = skill.current + constant + Math.floor((skill.current * percent) / 100);
    if (newLevel > maxBoost) {
        newLevel = maxBoost;
    }
    skill.current = newLevel;
}

function substat(player, statId, constant, percent) {
    const skill = player.skills[statId];
    const damage = constant + Math.floor((skill.current * percent) / 100);
    if (statId === 'hits') {
        player.damage(damage);
        return;
    }
    skill.current = skill.current - damage;
}

async function onInventoryCommand(player, item) {
    const handler = handlers().get(item.id);

    if (!handler) {
        return false;
    }

    if (!player.inventory.has(item.id)) {
        return true;
    }

    player.inventory.remove(item.id, 1);
    player.message('You drink some of the cleansed liquid');
    player.inventory.add(handler.nextItem, 1);

    const commonStats = ['attack', 'defense', 'strength', 'hits', 'ranged'];
    const percentageIncrease = [-10, 20, -10, 15, -10].concat(MAGIC_SKILLS.map(() => -10));
    const baseModifier = [-1, 1, -1, 1, -1].concat(MAGIC_SKILLS.map(() => -1));
    const modifier = handler.isLastDose ? baseModifier.map((m) => m * 3) : baseModifier;
    const affectedStats = commonStats.concat(MAGIC_SKILLS);

    for (let i = 0; i < affectedStats.length; i += 1) {
        const isBoost = percentageIncrease[i] >= 0;
        if (isBoost) {
            addstat(player, affectedStats[i], modifier[i], percentageIncrease[i]);
        } else {
            substat(player, affectedStats[i], -modifier[i], -percentageIncrease[i]);
        }
    }

    player.sendStats();

    if (handler.dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(
            `You have ${handler.dosesLeft} dose${handler.dosesLeft === 1 ? '' : 's'} of potion left`
        );
    }

    return true;
}

module.exports = { onInventoryCommand };
