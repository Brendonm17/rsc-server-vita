// bucket + sand pit fills the bucket with sand

const { wantBatching } = require('../skills/batch');

const SAND_PIT_ID = 302;
const BUCKET_ID = 21;
const SAND_ID = 625;

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== SAND_PIT_ID) {
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
        player.message('you fill the bucket with sand');

        player.inventory.remove(BUCKET_ID);
        player.inventory.add(SAND_ID);

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithGameObject };
