// with batching on, one click picks until inventory full; off, picks once
const { wantBatching } = require('../skills/batch');

const GRAIN_ID = 29;
const WHEAT_ID = 72;

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== WHEAT_ID) {
        return false;
    }

    const { world } = player;
    // always at least one pick, even with a full inventory
    const repeat = wantBatching(player)
        ? Math.max(1, 30 - player.inventory.items.length)
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        player.message('@que@You get some grain');
        player.inventory.add(GRAIN_ID);
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
