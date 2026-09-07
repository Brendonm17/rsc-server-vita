// "empty" command for burnt food and water bowls: swaps the spoiled item
// back for its empty container

const BURNTPIE_ID = 260;
const BURNT_STEW_ID = 347;
const BURNT_CURRY_ID = 710;
const BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID = 1286;
const GOLDEN_BOWL_WITH_PLAIN_WATER_ID = 1287;

const PIE_DISH_ID = 251;
const BOWL_ID = 341;
const BLESSED_GOLDEN_BOWL_ID = 1266;
const GOLDEN_BOWL_ID = 1188;

const EMPTY_INTO = {
    [BURNTPIE_ID]: {
        result: PIE_DISH_ID,
        message: 'you remove the burnt pie from the pie dish'
    },
    [BURNT_STEW_ID]: {
        result: BOWL_ID,
        message: 'you remove the burnt stew from the bowl'
    },
    [BURNT_CURRY_ID]: {
        result: BOWL_ID,
        message: 'you remove the burnt curry from the bowl'
    },
    [BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID]: {
        result: BLESSED_GOLDEN_BOWL_ID,
        message: 'You empty the plain water out of the Blessed Golden Bowl.'
    },
    [GOLDEN_BOWL_WITH_PLAIN_WATER_ID]: {
        result: GOLDEN_BOWL_ID,
        message: 'You empty the plain water out of the Golden Bowl.'
    }
};

async function onInventoryCommand(player, item) {
    const entry = EMPTY_INTO[item.id];

    if (!entry) {
        return false;
    }

    player.inventory.remove(item.id);
    player.message(entry.message);
    player.inventory.add(entry.result);

    return true;
}

module.exports = { onInventoryCommand };
