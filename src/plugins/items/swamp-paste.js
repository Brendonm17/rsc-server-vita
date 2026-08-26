// swamp paste crafting: pot of flour + swamp tar, then cook

const { wantBatching } = require('../skills/batch');

const POT_ID = 135;
const POT_OF_FLOUR_ID = 136;
const SWAMP_TAR_ID = 783;
const UNCOOKED_SWAMP_PASTE_ID = 784;
const SWAMP_PASTE_ID = 785;

const COOK_OBJECT_IDS = new Set([11, 97, 119, 274, 435, 491]);

// stackable items sum amount, non-stackable count rows
function countHeld(player, id) {
    let count = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            count += item.definition.stackable ? item.amount : 1;
        }
    }

    return count;
}

function matches(item1, item2, a, b) {
    return (
        (item1.id === a && item2.id === b) ||
        (item1.id === b && item2.id === a)
    );
}

// pot of flour + swamp tar -> pot + uncooked swamp paste
async function onUseWithInventory(player, item, target) {
    if (!matches(item, target, POT_OF_FLOUR_ID, SWAMP_TAR_ID)) {
        return false;
    }

    if (
        !player.inventory.has(POT_OF_FLOUR_ID) ||
        !player.inventory.has(SWAMP_TAR_ID)
    ) {
        return false;
    }

    player.inventory.remove(SWAMP_TAR_ID);
    player.inventory.remove(POT_OF_FLOUR_ID);
    player.inventory.add(POT_ID);
    player.message('you mix the flour with the swamp tar');
    player.message('it mixes into a paste');
    player.inventory.add(UNCOOKED_SWAMP_PASTE_ID);

    return true;
}

// uncooked swamp paste warmed on fire/range -> swamp paste
async function onUseWithGameObject(player, gameObject, item) {
    if (
        !COOK_OBJECT_IDS.has(gameObject.id) ||
        item.id !== UNCOOKED_SWAMP_PASTE_ID
    ) {
        return false;
    }

    const { world } = player;

    const repeat = wantBatching(player)
        ? countHeld(player, UNCOOKED_SWAMP_PASTE_ID)
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(UNCOOKED_SWAMP_PASTE_ID)) {
            break;
        }

        player.sendSound('cooking');
        player.message('you warm the paste over the fire');
        player.message('it thickens into a sticky goo');

        player.inventory.remove(UNCOOKED_SWAMP_PASTE_ID);
        player.inventory.add(SWAMP_PASTE_ID);

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithInventory, onUseWithGameObject };
