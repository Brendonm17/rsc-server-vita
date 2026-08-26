// striking the crystal with excalibur frees merlin, advances to stage 5

const NPC = require('../../../../model/npc');
const GameObject = require('../../../../model/game-object');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    CRYSTAL_TYPE,
    MERLIN_CRYSTAL_ID,
    EXCALIBUR_ID
} = require('./ids.js');

// OpenRSC delayedSpawnObject(32s) ~= 53 ticks (600ms/tick)
const CRYSTAL_RESPAWN_TICKS = 53;

function findOrSpawnMerlin(player) {
    const { world } = player;

    let merlin = world.npcs
        .getInArea(player.x, player.y, 10)
        .find((n) => n.id === MERLIN_CRYSTAL_ID);

    if (!merlin) {
        merlin = new NPC(world, {
            id: MERLIN_CRYSTAL_ID,
            x: player.x,
            y: player.y,
            minX: player.x - 1,
            maxX: player.x + 1,
            minY: player.y - 1,
            maxY: player.y + 1
        });

        delete merlin.respawn;

        world.setTickTimeout(() => {
            world.removeEntity('npcs', merlin);
        }, CRYSTAL_RESPAWN_TICKS);

        world.addEntity('npcs', merlin);
    }

    return merlin;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== CRYSTAL_TYPE || item.id !== EXCALIBUR_ID) {
        return false;
    }

    const { world } = player;

    if (player.questStages[QUEST_KEY] === 4) {
        player.message('@que@The crystal shatters');
        await world.sleepTicks(3);

        const { id, direction, x, y } = gameObject;
        world.removeEntity('gameObjects', gameObject);

        // respawn the (empty) crystal after ~32 seconds
        world.setTickTimeout(() => {
            world.addEntity(
                'gameObjects',
                new GameObject(world, { id, direction, x, y })
            );
        }, CRYSTAL_RESPAWN_TICKS);

        const merlin = findOrSpawnMerlin(player);

        if (merlin) {
            player.engage(merlin);
            await merlin.say(
                'Thankyou thankyou',
                'It\'s not fun being trapped in a giant crystal',
                'Go speak to King Arthur, I\'m sure he\'ll reward you'
            );
            player.disengage();

            player.message(
                'You have set Merlin free now talk to king arthur'
            );
            player.questStages[QUEST_KEY] = 5;
        }
    } else {
        player.message('Nothing interesting happens');
    }

    return true;
}

module.exports = { onUseWithGameObject };
