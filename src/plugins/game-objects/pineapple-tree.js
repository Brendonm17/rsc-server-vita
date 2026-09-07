// https://classic.runescape.wiki/w/Pineapple
// pick gives a pineapple, 4 picks per player (cache "pineapple_pick"), then
// the tree empties silently and respawns after 8 min
const GameObject = require('../../model/game-object');
const { wantBatching } = require('../skills/batch');

const PINEAPPLE_TREE_ID = 430;
const EMPTY_PINEAPPLE_TREE_ID = 431;

const FRESH_PINEAPPLE_ID = 861;

const TOTAL_PICKS = 4;
const TREE_RESPAWN_TICKS = 750; // 750 * 640ms = 8 minutes

async function onGameObjectCommandTwo(player, gameObject) {
    const { world } = player;

    if (gameObject.id === EMPTY_PINEAPPLE_TREE_ID) {
        player.message('there are no pineapples left on the tree');
        return true;
    }

    if (gameObject.id !== PINEAPPLE_TREE_ID) {
        return false;
    }

    const repeat = wantBatching(player) ? TOTAL_PICKS : 1;

    for (let i = 0; i < repeat; i += 1) {
        const fruitCount = (player.cache.pineapple_pick || 0) + 1;
        player.cache.pineapple_pick = fruitCount;

        player.inventory.add(FRESH_PINEAPPLE_ID);

        if (fruitCount >= TOTAL_PICKS) {
            const { x, y, direction } = gameObject;

            world.removeEntity('gameObjects', gameObject);

            const emptyTree = new GameObject(world, {
                id: EMPTY_PINEAPPLE_TREE_ID,
                x,
                y,
                direction
            });

            world.addEntity('gameObjects', emptyTree);

            world.setTickTimeout(() => {
                world.removeEntity('gameObjects', emptyTree);

                const freshTree = new GameObject(world, {
                    id: PINEAPPLE_TREE_ID,
                    x,
                    y,
                    direction
                });

                world.addEntity('gameObjects', freshTree);
            }, TREE_RESPAWN_TICKS);

            delete player.cache.pineapple_pick;

            return true;
        }

        player.message('you pick a pineapple');

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onGameObjectCommandTwo };
