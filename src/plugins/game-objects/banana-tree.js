// https://classic.runescape.wiki/w/Banana_tree
// pick counter is a per-player cache key ("banana_pick") shared across all banana
// trees, not per-tree; at 5 picks the clicked tree empties and resets it
// with batching one click picks up to 5 times, else once per click
const GameObject = require('../../model/game-object');
const { wantBatching } = require('../skills/batch');

const BANANA_TREE_ID = 183;
const EMPTY_BANANA_TREE_ID = 184;

const BANANA_ID = 249;

const TOTAL_PICKS = 5;
const TREE_RESPAWN_TICKS = 750; // 750 * 640ms = 8 minutes

async function onGameObjectCommandTwo(player, gameObject) {
    const { world } = player;

    if (gameObject.id === EMPTY_BANANA_TREE_ID) {
        player.message('there are no bananas left on the tree');
        return true;
    }

    if (gameObject.id !== BANANA_TREE_ID) {
        return false;
    }

    const repeat = wantBatching(player) ? TOTAL_PICKS : 1;

    for (let i = 0; i < repeat; i += 1) {
        const fruitCount = (player.cache.banana_pick || 0) + 1;
        player.cache.banana_pick = fruitCount;

        player.inventory.add(BANANA_ID);

        if (fruitCount >= TOTAL_PICKS) {
            player.message('you pick the last banana');

            const { x, y, direction } = gameObject;

            world.removeEntity('gameObjects', gameObject);

            const emptyTree = new GameObject(world, {
                id: EMPTY_BANANA_TREE_ID,
                x,
                y,
                direction
            });

            world.addEntity('gameObjects', emptyTree);

            world.setTickTimeout(() => {
                world.removeEntity('gameObjects', emptyTree);

                const freshTree = new GameObject(world, {
                    id: BANANA_TREE_ID,
                    x,
                    y,
                    direction
                });

                world.addEntity('gameObjects', freshTree);
            }, TREE_RESPAWN_TICKS);

            delete player.cache.banana_pick;

            return true;
        }

        player.message('you pick a banana');

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onGameObjectCommandTwo };
