// drink a runecraft potion: dose down (3->2->1->empty vial), boost runecraft +3 (+6 super)
// item ids resolved by name at load from custom-items.json doses

const items = require('@2003scape/rsc-data/config/items');

const EMPTY_VIAL_ID = 465;

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
            if (!match) {
                continue;
            }
            const name = def.name.toLowerCase();
            DOSES[name] = DOSES[name] || {};
            DOSES[name][+match[1]] = id;
        }
    }

    const doses = DOSES[potionName];
    if (!doses) {
        throw new RangeError(`runecraft-potion.js: no dose table for "${potionName}"`);
    }
    return doses;
}

let HANDLERS = null;
function handlers() {
    if (HANDLERS) {
        return HANDLERS;
    }

    HANDLERS = new Map();

    function register(doses, boost) {
        const full = doses[3];
        const two = doses[2];
        const one = doses[1];

        HANDLERS.set(full, { nextItem: two, dosesLeft: 2, boost });
        HANDLERS.set(two, { nextItem: one, dosesLeft: 1, boost });
        HANDLERS.set(one, { nextItem: EMPTY_VIAL_ID, dosesLeft: 0, boost });
    }

    register(doseChain('runecraft potion'), 3);
    register(doseChain('super runecraft potion'), 6);

    return HANDLERS;
}

// boost runecraft current up to base+constant
function addRunecraft(player, constant) {
    const skill = player.skills.runecraft;
    const maxBoost = skill.base + constant;
    const newLevel = skill.current + constant;
    skill.current = Math.min(newLevel, maxBoost);
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
    player.message(`You drink some of your ${items[item.id].name.toLowerCase()}`);
    player.inventory.add(handler.nextItem, 1);
    addRunecraft(player, handler.boost);
    player.sendStats();

    if (handler.dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(`You have ${handler.dosesLeft} doses of potion left`);
    }

    return true;
}

module.exports = { onInventoryCommand };
