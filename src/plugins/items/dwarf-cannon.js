// dwarf multicannon: placement from the inventory

const GameObject = require('../../model/game-object');
const {
    CANNON_BASE_ID,
    OBJ_BASE,
    inDwarfArea,
    inKbdLair,
    questComplete,
    setOwner,
    clearCannonCache
} = require('../game-objects/dwarf-cannon-shared');

// place the cannon base at the player's feet
async function onInventoryCommand(player, item) {
    if (item.id !== CANNON_BASE_ID) {
        return false;
    }

    const { world } = player;

    if (!questComplete(player)) {
        player.message("you can't set up this cannon...");
        await world.sleepTicks(3);
        player.message('...you need to complete the dwarf cannon quest');
        return true;
    }

    if (inDwarfArea(player)) {
        player.message('it is not permitted to set up a cannon...');
        await world.sleepTicks(3);
        player.message('...this close to the dwarf black guard');
        return true;
    }

    if (player.cache.has_cannon) {
        player.message('you cannot construct more than one cannon at a time...');
        await world.sleepTicks(3);
        player.message('if you have lost your cannon ...');
        await world.sleepTicks(3);
        player.message('...go and see the dwarf cannon engineer');
        return true;
    }

    const [existingObject] = world.gameObjects.getAtPoint(player.x, player.y);

    if (existingObject) {
        player.message("you can't set up the cannon here");
        return true;
    }

    if (inKbdLair(player)) {
        player.message("you can't set up the cannon here");
        return true;
    }

    player.walkQueue.length = 0;
    player.message('you place the cannon base on the ground');
    await world.sleepTicks(3);

    if (!player.inventory.has(CANNON_BASE_ID)) {
        return true;
    }

    player.inventory.remove(CANNON_BASE_ID, 1);

    const cannonBase = new GameObject(world, {
        id: OBJ_BASE,
        x: player.x,
        y: player.y,
        direction: 0
    });

    world.addEntity('gameObjects', cannonBase);
    setOwner(cannonBase, player.username);

    player.cache.has_cannon = true;
    player.cache.cannon_x = cannonBase.x;
    player.cache.cannon_y = cannonBase.y;
    player.cache.cannon_stage = 1;

    return true;
}

module.exports = { onInventoryCommand, _internal: { clearCannonCache } };
