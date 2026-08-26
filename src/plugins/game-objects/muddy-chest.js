// muddy key unlocks chest for a fixed, non-random reward

const GameObject = require('../../model/game-object');

const MUDDY_CHEST_ID = 222;
const MUDDY_CHEST_OPEN_ID = 221;
const MUDDY_KEY_ID = 414;

const OPEN_RESPAWN_TICKS = Math.round(3000 / 640);

// fixed loot list
const LOOT = [
    { id: 158, amount: 1 }, // Uncut ruby
    { id: 173, amount: 1 }, // Mithril bar
    { id: 42, amount: 2 }, // Law rune
    { id: 327, amount: 1 }, // Anchovie pizza
    { id: 64, amount: 1 }, // Mithril dagger
    { id: 10, amount: 50 }, // Coins
    { id: 38, amount: 2 }, // Death rune
    { id: 41, amount: 10 } // Chaos rune
];

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== MUDDY_CHEST_ID || item.id !== MUDDY_KEY_ID) {
        return false;
    }

    const { world } = player;

    player.inventory.remove(MUDDY_KEY_ID);

    const { x, y, direction } = gameObject;

    world.removeEntity('gameObjects', gameObject);

    const openChest = new GameObject(world, {
        id: MUDDY_CHEST_OPEN_ID,
        x,
        y,
        direction
    });

    world.addEntity('gameObjects', openChest);

    world.setTickTimeout(() => {
        world.removeEntity('gameObjects', openChest);

        const closedChest = new GameObject(world, {
            id: MUDDY_CHEST_ID,
            x,
            y,
            direction
        });

        world.addEntity('gameObjects', closedChest);
    }, OPEN_RESPAWN_TICKS);

    player.message('@que@you unlock the chest with your key');
    player.message('@que@You find some treasure in the chest');

    for (const { id, amount } of LOOT) {
        player.inventory.add(id, amount);
    }

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== MUDDY_CHEST_ID) {
        return false;
    }

    player.message('@que@the chest is locked');

    return true;
}

module.exports = { onUseWithGameObject, onGameObjectCommandOne };
