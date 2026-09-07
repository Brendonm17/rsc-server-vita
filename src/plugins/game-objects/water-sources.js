// refill bucket/jug/bowl/vial from a well or water source; batches when enabled

const Item = require('../../model/item');
const { wantBatching } = require('../skills/batch');

const BUCKET_ID = 21;
const SOURCE_IDS = new Set([26, 48, 86, 1130]);
const WELL_IDS = new Set([2, 466, 814]);

async function onUseWithGameObject(player, gameObject, item) {
    const refilledID = Item.getFullWater(item.id);

    if (typeof refilledID === 'undefined') {
        return false;
    }

    const isWell = WELL_IDS.has(gameObject.id);
    const isSource = SOURCE_IDS.has(gameObject.id);

    if (!isWell && !isSource) {
        return false;
    }

    if (isWell && item.id !== BUCKET_ID) {
        return false;
    }

    const { world } = player;
    const itemName = item.definition.name.toLowerCase();
    const sourceName = gameObject.definition.name.toLowerCase();
    const fillString = `You fill the ${itemName} from the ${sourceName}`;

    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id }) => id === item.id).length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(item.id)) {
            break;
        }

        player.sendBubble(item.id);
        player.sendSound('filljug');
        player.message(fillString);

        player.inventory.remove(item.id);
        player.inventory.add(refilledID);

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithGameObject };
