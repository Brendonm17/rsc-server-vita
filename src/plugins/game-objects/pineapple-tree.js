// https://classic.runescape.wiki/w/Pineapple

const GameObject = require('../../model/game-object');

const PINEAPPLE_TREE_ID = 430;
const EMPTY_PINEAPPLE_TREE_ID = 431;

const FRESH_PINEAPPLE_ID = 861;

const TREE_PICKS = 4;
const TREE_RESPAWN_TICKS = 750; // 750 * 640ms = 8 minutes

async function onGameObjectCommandTwo(player, gameObject) {
    const { world } = player;

    if (gameObject.id === PINEAPPLE_TREE_ID) {
        let pineapplesLeft = Number.isNaN(+gameObject.pineapplesLeft)
            ? TREE_PICKS
            : gameObject.pineapplesLeft;

        pineapplesLeft -= 1;
        gameObject.pineapplesLeft = pineapplesLeft;

        if (pineapplesLeft === 0) {
            const { x, y, direction } = gameObject;

            world.removeEntity('gameObjects', gameObject);

            const emptyPineappleTree = new GameObject(world, {
                id: EMPTY_PINEAPPLE_TREE_ID,
                x,
                y,
                direction
            });

            world.addEntity('gameObjects', emptyPineappleTree);

            world.setTickTimeout(() => {
                world.removeEntity('gameObjects', emptyPineappleTree);

                const pineappleTree = new GameObject(world, {
                    id: PINEAPPLE_TREE_ID,
                    x,
                    y,
                    direction
                });

                world.addEntity('gameObjects', pineappleTree);
            }, TREE_RESPAWN_TICKS);
        } else {
            player.message('you pick a pineapple');
        }

        player.inventory.add(FRESH_PINEAPPLE_ID);

        return true;
    } else if (gameObject.id === EMPTY_PINEAPPLE_TREE_ID) {
        player.message('there are no pineapples left on the tree');
        return true;
    }

    return false;
}

module.exports = { onGameObjectCommandTwo };
