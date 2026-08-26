// shake for a palm leaf; tree reverts after 15 seconds

const GameObject = require('../../model/game-object');

const LEAFY_PALM_TREE_ID = 1176;
const SHAKEN_PALM_TREE_ID = 33;
const PALM_TREE_LEAF_ID = 1279;

const SHAKEN_RESPAWN_TICKS = Math.round(15000 / 640); // 15000ms, OpenRSC changeloc

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== LEAFY_PALM_TREE_ID) {
        return false;
    }

    const { world } = player;

    player.message('@que@You give the palm tree a good shake.');
    await world.sleepTicks(2);

    player.message('@que@A palm leaf falls down.');
    await world.sleepTicks(1);

    world.addPlayerDrop(player, { id: PALM_TREE_LEAF_ID }, gameObject.x, gameObject.y);

    const { x, y, direction } = gameObject;

    world.removeEntity('gameObjects', gameObject);

    const shakenTree = new GameObject(world, {
        id: SHAKEN_PALM_TREE_ID,
        x,
        y,
        direction
    });

    world.addEntity('gameObjects', shakenTree);

    world.setTickTimeout(() => {
        world.removeEntity('gameObjects', shakenTree);

        const leafyPalmTree = new GameObject(world, {
            id: LEAFY_PALM_TREE_ID,
            x,
            y,
            direction
        });

        world.addEntity('gameObjects', leafyPalmTree);
    }, SHAKEN_RESPAWN_TICKS);

    return true;
}

module.exports = { onGameObjectCommandTwo };
