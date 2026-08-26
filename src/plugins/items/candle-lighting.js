// lighting candles with a tinderbox

const TINDERBOX_ID = 166;

// unlit -> lit
const CANDLE_PAIRS = new Map([
    [599, 601],
    [600, 602]
]);

async function onUseWithInventory(player, item, target) {
    // accept either drag direction (compareItemsIds in the Java)
    let unlitID = -1;

    if (item.id === TINDERBOX_ID && CANDLE_PAIRS.has(target.id)) {
        unlitID = target.id;
    } else if (target.id === TINDERBOX_ID && CANDLE_PAIRS.has(item.id)) {
        unlitID = item.id;
    } else {
        return false;
    }

    if (!player.inventory.has(unlitID)) {
        return false;
    }

    player.inventory.remove(unlitID);
    player.message('You light the candle');
    player.inventory.add(CANDLE_PAIRS.get(unlitID));
    await player.sendInventory();

    return true;
}

module.exports = { onUseWithInventory };
