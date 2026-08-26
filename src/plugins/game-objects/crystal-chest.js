// crystal key unlocks chest; guaranteed uncut dragonstone + roll

const GameObject = require('../../model/game-object');

const CRYSTAL_CHEST_ID = 248;
const CRYSTAL_CHEST_OPEN_ID = 247;
const CRYSTAL_KEY_ID = 525;
const UNCUT_DRAGONSTONE_ID = 542;

const OPEN_RESPAWN_TICKS = Math.round(1000 / 640);

// [thresholdExclusive, items[]]; first threshold percent is under wins
const LOOT_TABLE = [
    [26, [{ id: 402, amount: 1 }]], // Rune Plate Mail Legs
    [132, [{ id: 127, amount: 1 }]], // Adamantite Square Shield
    [407, [{ id: 517, amount: 30 }]], // Iron Ore Certificate
    [733, [{ id: 526, amount: 1 }, { id: 10, amount: 750 }]], // Tooth half of key + 750gp
    [1084, [{ id: 408, amount: 3 }]], // Runite Bar
    [1451, [{ id: 527, amount: 1 }, { id: 10, amount: 750 }]], // Loop half of key + 750gp
    [1874, [{ id: 162, amount: 2 }, { id: 161, amount: 2 }]], // Ruby + Diamond
    [2529, [{ id: 518, amount: 20 }]], // Coal Certificate
    [
        3302,
        [
            { id: 31, amount: 50 }, // Fire rune
            { id: 32, amount: 50 }, // Water rune
            { id: 33, amount: 50 }, // Air rune
            { id: 34, amount: 50 }, // Earth rune
            { id: 35, amount: 50 }, // Mind rune
            { id: 36, amount: 50 }, // Body rune
            { id: 38, amount: 10 }, // Death rune
            { id: 40, amount: 10 }, // Nature rune
            { id: 41, amount: 10 }, // Chaos rune
            { id: 42, amount: 10 }, // Law rune
            { id: 46, amount: 10 } // Cosmic rune
        ]
    ],
    [4359, [{ id: 536, amount: 1 }, { id: 10, amount: 1000 }]], // Raw swordfish cert + 1000gp
    [8328, [{ id: 179, amount: 1 }, { id: 10, amount: 2000 }]] // Spinach roll + 2000gp
    // percent >= 8328 (~16.72%): nothing extra
];

const items = require('@2003scape/rsc-data/config/items');

function grantLoot(player, loot) {
    for (const { id, amount } of loot) {
        if (items[id] && items[id].stackable) {
            player.inventory.add(id, amount);
        } else {
            for (let i = 0; i < amount; i += 1) {
                player.inventory.add(id, 1);
            }
        }
    }
}

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== CRYSTAL_CHEST_ID || item.id !== CRYSTAL_KEY_ID) {
        return false;
    }

    const { world } = player;

    player.inventory.remove(CRYSTAL_KEY_ID);

    const { x, y, direction } = gameObject;

    world.removeEntity('gameObjects', gameObject);

    const openChest = new GameObject(world, {
        id: CRYSTAL_CHEST_OPEN_ID,
        x,
        y,
        direction
    });

    world.addEntity('gameObjects', openChest);

    world.setTickTimeout(() => {
        world.removeEntity('gameObjects', openChest);

        const closedChest = new GameObject(world, {
            id: CRYSTAL_CHEST_ID,
            x,
            y,
            direction
        });

        world.addEntity('gameObjects', closedChest);
    }, OPEN_RESPAWN_TICKS);

    player.message('@que@you unlock the chest with your key');
    player.message('@que@You find some treasure in the chest');

    player.inventory.add(UNCUT_DRAGONSTONE_ID, 1);

    const percent = Math.floor(Math.random() * 10001);

    for (const [threshold, loot] of LOOT_TABLE) {
        if (percent < threshold) {
            grantLoot(player, loot);
            break;
        }
    }

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== CRYSTAL_CHEST_ID) {
        return false;
    }

    player.message('@que@the chest is locked');

    return true;
}

module.exports = { onUseWithGameObject, onGameObjectCommandOne };
