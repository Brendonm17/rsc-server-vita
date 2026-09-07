// "combust" on a worn firemaking cape conjures a fire at the player's feet (no
// logs) that burns 90s then leaves ashes; blocked on an occupied tile or plane 3

const GameObject = require('../../model/game-object');
const GroundItem = require('../../model/ground-item');
const { resolveCapeIds } = require('../skills/skill-capes');

const FIRE_ID = 97;
const ASHES_ID = 181;
const BURN_DURATION_MS = 90000;

async function onInventoryCommand(player, item) {
    const capeId = resolveCapeIds().firemaking;

    if (typeof capeId !== 'number' || item.id !== capeId) {
        return false;
    }

    const { world, x, y } = player;

    if (world.gameObjects.getAtPoint(x, y).length) {
        player.message("@que@You can't light a fire here");
        return true;
    }

    // plane 3 (underground/indoors); plane is encoded in the y coordinate
    if (Math.floor(y / world.planeElevation) === 3) {
        player.message(
            '@que@Without direct sunlight, your cape is unable to harness enough energy to start a fire'
        );
        return true;
    }

    player.sendBubble(item.id);
    player.message('@que@You concentrate the power of the sun to create a fire');

    const fire = new GameObject(world, { id: FIRE_ID, x, y, direction: 0 });
    world.addEntity('gameObjects', fire);

    world.setTimeout(() => {
        world.removeEntity('gameObjects', fire);
        world.addEntity('groundItems', new GroundItem(world, { id: ASHES_ID, x, y }));
    }, BURN_DURATION_MS);

    return true;
}

module.exports = { onInventoryCommand };
