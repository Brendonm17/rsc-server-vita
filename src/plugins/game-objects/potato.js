// with batching on, one click picks until inventory full; off, picks once
const { wantBatching } = require('../skills/batch');

const POTATO_GROUND_ID = 191;
const POTATO_ID = 348;

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== POTATO_GROUND_ID) {
        return false;
    }

    const { world } = player;
    // always at least one pick, even with a full inventory
    const repeat = wantBatching(player)
        ? Math.max(1, 30 - player.inventory.items.length)
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        player.message('@que@You pick a potato');
        player.inventory.add(POTATO_ID);
        player.sendSound('potato');

        if (player.inventory.isFull()) {
            break;
        }

        if (i < repeat - 1) {
            await world.sleepTicks(1);
        }
    }

    return true;
}

module.exports = { onGameObjectCommandTwo };
