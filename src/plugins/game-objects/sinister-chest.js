// sinister key (932) unlocks the chest (645): fixed unidentified herb reward,
// opens for 3s then reverts, poisons the player (power 68)

const GameObject = require('../../model/game-object');
const { setPoisonDamage, startPoisonEvent } = require('../combat/poison.js');

const SINISTER_CHEST_ID = 645;
const SINISTER_CHEST_OPEN_ID = 644;
const SINISTER_KEY_ID = 932;

const OPEN_RESPAWN_TICKS = Math.round(3000 / 640);

const POISON_POWER = 68;

// fixed unidentified herb reward, 8 herbs total
const HERB_LOOT = [
    { id: 437, amount: 2 }, // Unidentified Harralander
    { id: 438, amount: 3 }, // Unidentified Ranarr weed
    { id: 439, amount: 1 }, // Unidentified Irit leaf
    { id: 440, amount: 1 }, // Unidentified Avantoe
    { id: 441, amount: 1 }, // Unidentified Kwuarm
    { id: 933, amount: 1 } // Unidentified Torstol
];

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== SINISTER_CHEST_ID || item.id !== SINISTER_KEY_ID) {
        return false;
    }

    const { world } = player;

    player.inventory.remove(SINISTER_KEY_ID);

    const { x, y, direction } = gameObject;

    world.removeEntity('gameObjects', gameObject);

    const openChest = new GameObject(world, {
        id: SINISTER_CHEST_OPEN_ID,
        x,
        y,
        direction
    });

    world.addEntity('gameObjects', openChest);

    world.setTickTimeout(() => {
        world.removeEntity('gameObjects', openChest);

        const closedChest = new GameObject(world, {
            id: SINISTER_CHEST_ID,
            x,
            y,
            direction
        });

        world.addEntity('gameObjects', closedChest);
    }, OPEN_RESPAWN_TICKS);

    player.message('you unlock the chest with your key');
    player.message('A foul gas seeps from the chest');
    player.message('You find a lot of herbs in the chest');

    for (const { id, amount } of HERB_LOOT) {
        player.inventory.add(id, amount);
    }

    setPoisonDamage(player, POISON_POWER);
    startPoisonEvent(player);

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== SINISTER_CHEST_ID) {
        return false;
    }

    player.message('the chest is locked');

    return true;
}

module.exports = { onUseWithGameObject, onGameObjectCommandOne };
