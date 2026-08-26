// batch progression fills every matching empty container in one go when enabled

const Item = require('../../model/item');
const { wantBatching } = require('../skills/batch');

const BUCKET_ID = 21;
const SOURCE_IDS = new Set([26, 48, 86, 1130]);
const WELL_IDS = new Set([2, 466, 814]);

async function onUseWithGameObject(player, gameObject, item) {
    const refilledID = Item.getFullWater(item.id);

    if (
        typeof refilledID === 'undefined' ||
        (WELL_IDS.has(gameObject.id) && item.id !== BUCKET_ID) &&
        !SOURCE_IDS.has(gameObject.id)
    ) {
        return false;
    }

    const { world } = player;
    const itemName = item.definition.name.toLowerCase();
    const sourceName = gameObject.definition.name.toLowerCase();

    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id }) => id === item.id).length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(item.id)) {
            break;
        }

        player.sendBubble(item.id);
        player.sendSound('filljug');
        await world.sleepTicks(2);

        player.inventory.remove(item.id);
        player.inventory.add(refilledID);

        player.message(`You fill the ${itemName} from the ${sourceName}`);
    }

    return true;
}

module.exports = { onUseWithGameObject };
