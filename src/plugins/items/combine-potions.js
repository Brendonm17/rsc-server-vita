// decanting: combine potion doses

const items = require('@2003scape/rsc-data/config/items');
const { getQOLConfig } = require('../../model/qol-config');

const EMPTY_VIAL_ID = 465;

// Build { potionName: { dose: itemID } } from item descriptions.
const POTIONS = {};

items.forEach((definition, id) => {
    if (!definition || !/potion/i.test(definition.name || '')) {
        return;
    }

    const match = (definition.description || '').match(
        /(\d+)\s*doses?\s*of\s*(.+?)\s*potion/i
    );

    if (!match) {
        return;
    }

    const dose = +match[1];
    const name = definition.name.toLowerCase();

    POTIONS[name] = POTIONS[name] || {};
    POTIONS[name][dose] = id;
});

// Reverse index: { itemID: { name, dose, maxDose } } for quick lookup.
const DOSE_INFO = {};

for (const [name, doses] of Object.entries(POTIONS)) {
    const maxDose = Math.max(...Object.keys(doses).map(Number));

    for (const [dose, id] of Object.entries(doses)) {
        DOSE_INFO[id] = { name, dose: +dose, maxDose };
    }
}

function potionName(id) {
    return items[id].name.toLowerCase();
}

// Two items are decantable if they're doses of the same potion.
function samePotion(item1, item2) {
    if (!item1 || !item2) {
        return false;
    }

    const a = DOSE_INFO[item1.id];
    const b = DOSE_INFO[item2.id];
    return a && b && a.name === b.name;
}

async function onUseWithInventory(player, item1, item2) {
    if (!samePotion(item1, item2)) {
        return false;
    }

    // OpenRSC ~31-35: no decanting unless want_decanting is set.
    if (!getQOLConfig(player.world.server.config).wantDecanting) {
        player.message('Nothing interesting happens');
        return true;
    }

    const info = DOSE_INFO[item1.id];
    const doses = POTIONS[info.name];
    const D = (n) => doses[n];

    const a = DOSE_INFO[item1.id].dose;
    const b = DOSE_INFO[item2.id].dose;
    const lower = potionName(item1.id);

    // 4-dose potions (strength potion only)
    if (info.maxDose === 4) {
        // 1 + 2 => 3
        if ((a === 1 && b === 2) || (a === 2 && b === 1)) {
            if (take(player, D(1)) && take(player, D(2))) {
                give(player, D(3));
                player.message(
                    `You combine 2 doses of ${lower} with 1 dose of ${lower}`
                );
                give(player, EMPTY_VIAL_ID);
            }
            return true;
        }

        // 1 + 3 => 4
        if ((a === 1 && b === 3) || (a === 3 && b === 1)) {
            if (take(player, D(1)) && take(player, D(3))) {
                give(player, D(4));
                player.message(
                    `You combine 3 doses of ${lower} with 1 dose of ${lower}`
                );
                give(player, EMPTY_VIAL_ID);
            }
            return true;
        }

        // 2 + 2 => 4
        if (a === 2 && b === 2) {
            if (take(player, D(2)) && take(player, D(2))) {
                give(player, D(4));
                player.message(`You combine two 2 doses of ${lower}`);
                give(player, EMPTY_VIAL_ID);
            }
            return true;
        }

        // 1 + 1 => 2
        if (a === 1 && b === 1) {
            if (take(player, D(1)) && take(player, D(1))) {
                give(player, D(2));
                player.message(
                    `You combine 1 dose of ${lower} with 1 dose of ${lower}`
                );
                give(player, EMPTY_VIAL_ID);
            }
            return true;
        }

        // 3 + 3 => 4 + 2 (no empty vial: 6 doses split into a full 4 and a 2)
        if (a === 3 && b === 3) {
            if (take(player, D(3)) && take(player, D(3))) {
                give(player, D(4));
                give(player, D(2));
                player.message(`You combine two 3 doses of ${lower}`);
            }
            return true;
        }

        return true;
    }

    // 3-dose potions (everything else)
    const one = D(1);
    const two = D(2);
    const full = D(3);

    // 1 + 2 => full(3) + vial
    if ((item1.id === one && item2.id === two) ||
        (item2.id === one && item1.id === two)) {
        if (take(player, one) && take(player, two)) {
            player.message(
                `You combine 2 doses of ${lower} with 1 dose of ${lower}`
            );
            give(player, full);
            player.message(`to a full 3 doses of ${lower}`);
            give(player, EMPTY_VIAL_ID);
            player.message('you get an empty vial over');
        }
        return true;
    }

    // 1 + 1 => 2 + vial
    if (item1.id === one && item2.id === one) {
        if (take(player, one) && take(player, one)) {
            player.message(`You combine two 1 dose of ${lower}`);
            give(player, two);
            player.message(`to 2 doses of ${lower}`);
            give(player, EMPTY_VIAL_ID);
            player.message('you get an empty vial over');
        }
        return true;
    }

    // 2 + 2 => full(3) + 1 (no vial: 4 doses split into a full 3 and a 1)
    if (item1.id === two && item2.id === two) {
        if (take(player, two) && take(player, two)) {
            player.message(`You combine two 2 doses of ${lower}`);
            give(player, full);
            give(player, one);
            player.message(
                `to a full 3 doses of ${lower} and 1 dose of ${lower}`
            );
        }
        return true;
    }

    return true;
}

// OpenRSC give(): add one of the item to the inventory.
function give(player, id) {
    player.inventory.add(id, 1);
}

// remove one item, return whether it was present
function take(player, id) {
    if (!player.inventory.has(id)) {
        return false;
    }

    player.inventory.remove(id, 1);
    return true;
}

module.exports = { onUseWithInventory };
