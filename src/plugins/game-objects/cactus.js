// knife + desert cactus fills a waterskin, grants xp, respawns

const GameObject = require('../../model/game-object');

const CACTUS_ID = 35;
const DRIED_CACTUS_ID = 1028;
const KNIFE_ID = 13;

const FULL_WATER_SKIN_ID = 1016;
const MOSTLY_FULL_WATER_SKIN_ID = 1082;
const MOSTLY_EMPTY_WATER_SKIN_ID = 1083;
const MOUTHFUL_WATER_SKIN_ID = 1084;
const EMPTY_WATER_SKIN_ID = 1085;

// waterskin fill stages, checked from most to least full
const SKIN_STAGES = [
    MOSTLY_FULL_WATER_SKIN_ID,
    MOSTLY_EMPTY_WATER_SKIN_ID,
    MOUTHFUL_WATER_SKIN_ID,
    EMPTY_WATER_SKIN_ID
];

function nextFullerSkin(skinID) {
    if (skinID === MOSTLY_FULL_WATER_SKIN_ID) {
        return FULL_WATER_SKIN_ID;
    }

    return skinID - 1;
}

// fail check: true means the cut failed
function cutCactiFails() {
    return Math.floor(Math.random() * 101) > 75;
}

// 30s respawn = 50 ticks at 640ms/tick here
const CACTUS_RESPAWN_TICKS = 50;

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== CACTUS_ID) {
        return false;
    }

    if (item.id !== KNIFE_ID) {
        player.message('Nothing interesting happens');
        return true;
    }

    player.message(
        'You use your woodcutting skill to extract some water from the cactus.'
    );

    player.sendBubble(item.id);
    await player.world.sleepTicks(2);

    for (const skinID of SKIN_STAGES) {
        if (!player.inventory.has(skinID)) {
            continue;
        }

        if (cutCactiFails()) {
            player.message('You make a mistake and fail to fill your waterskin.');
            player.addExperience('woodcutting', 4);
            // waterskin untouched on the fail path
            return true;
        }

        player.message('You collect some precious water in your waterskin.');

        player.inventory.remove(skinID);
        player.inventory.add(nextFullerSkin(skinID));

        const { x, y } = gameObject;

        player.world.removeEntity('gameObjects', gameObject);

        const driedCactus = new GameObject(player.world, {
            id: DRIED_CACTUS_ID,
            x,
            y,
            direction: gameObject.direction
        });

        player.world.addEntity('gameObjects', driedCactus);

        player.addExperience('woodcutting', 100);

        player.world.setTickTimeout(() => {
            player.world.removeEntity('gameObjects', driedCactus);

            const cactus = new GameObject(player.world, {
                id: CACTUS_ID,
                x,
                y,
                direction: gameObject.direction
            });

            player.world.addEntity('gameObjects', cactus);
        }, CACTUS_RESPAWN_TICKS);

        return true;
    }

    player.message('You need to have a non-full waterskin to contain the fluid.');

    return true;
}

module.exports = { onUseWithGameObject };
