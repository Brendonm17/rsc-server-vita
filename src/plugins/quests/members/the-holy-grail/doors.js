// door 117 needs holy grail started + merlin's crystal done; door 116 always opens, spawns 2 whistles at stage>=3

const GroundItem = require('../../../../model/ground-item');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    DOOR_117_ID,
    DOOR_116_ID,
    MAGIC_WHISTLE_ID,
    MERLINS_CRYSTAL_KEY
} = require('./ids.js');

async function handleDoor(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = player.questStages[QUEST_KEY] || 0;

    if (wallObject.id === DOOR_117_ID) {
        if (
            (stage >= 1 && player.questStages[MERLINS_CRYSTAL_KEY] === -1) ||
            stage === -1
        ) {
            await player.enterDoor(wallObject);
        } else {
            player.message('The door won\'t open');
        }
        return true;
    }

    if (wallObject.id === DOOR_116_ID) {
        player.message('You go through the door');
        await player.enterDoor(wallObject);

        const { world } = player;
        const whistleCount = player.inventory.items.filter(
            (i) => i.id === MAGIC_WHISTLE_ID
        ).length;

        if (whistleCount !== 2 && (stage >= 3 || stage === -1)) {
            const alreadyThere = world.groundItems
                .getInArea(204, 2440, 0)
                .filter(
                    (gi) =>
                        gi.id === MAGIC_WHISTLE_ID &&
                        gi.x === 204 &&
                        gi.y === 2440
                ).length;

            for (let i = alreadyThere; i < 2; i += 1) {
                world.addEntity(
                    'groundItems',
                    new GroundItem(world, {
                        id: MAGIC_WHISTLE_ID,
                        x: 204,
                        y: 2440
                    })
                );
            }
        }

        return true;
    }

    return false;
}

async function onWallObjectCommandOne(player, wallObject) {
    return await handleDoor(player, wallObject);
}

async function onWallObjectCommandTwo(player, wallObject) {
    return await handleDoor(player, wallObject);
}

module.exports = { onWallObjectCommandOne, onWallObjectCommandTwo };
