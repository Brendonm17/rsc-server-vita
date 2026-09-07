// bucket + soil mound (1276) -> fills the bucket with soil
//   21  bucket
//   794 soil

const { wantBatching } = require('../skills/batch');

const SOIL_MOUND_ID = 1276;
const BUCKET_ID = 21;
const SOIL_ID = 794;

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== SOIL_MOUND_ID) {
        return false;
    }

    if (item.id !== BUCKET_ID) {
        player.message('Nothing interesting happens');
        return true;
    }

    const { world } = player;

    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id }) => id === BUCKET_ID).length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(BUCKET_ID)) {
            break;
        }

        player.sendBubble(BUCKET_ID);
        player.message('you fill the bucket with soil');

        player.inventory.remove(BUCKET_ID);
        player.inventory.add(SOIL_ID);

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithGameObject };
