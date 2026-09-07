// merlin's crystal beggar test: the jeweller's upstairs door opens freely until
// the test is active, then giving the beggar bread reveals the lady of the lake.

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    BEGGAR_ID,
    LADY_GROUND_ID,
    BREAD_ID,
    EXCALIBUR_ID,
    DOOR_X,
    DOOR_Y,
    BEGGAR_SPAWN
} = require('./ids.js');

function findOrSpawnBeggar(player) {
    const { world } = player;

    let beggar = world.npcs
        .getInArea(player.x, player.y, 5)
        .find((n) => n.id === BEGGAR_ID);

    if (!beggar) {
        beggar = new NPC(world, {
            id: BEGGAR_ID,
            x: BEGGAR_SPAWN.x,
            y: BEGGAR_SPAWN.y,
            minX: BEGGAR_SPAWN.x - 1,
            maxX: BEGGAR_SPAWN.x + 1,
            minY: BEGGAR_SPAWN.y - 1,
            maxY: BEGGAR_SPAWN.y + 1
        });

        delete beggar.respawn;

        // OpenRSC spawns the beggar for ~74 seconds (~123 ticks)
        world.setTickTimeout(() => {
            if (world.npcs.getByID(BEGGAR_ID) === beggar) {
                world.removeEntity('npcs', beggar);
            }
        }, 123);

        world.addEntity('npcs', beggar);
    }

    return beggar;
}

async function revealLady(player, beggar) {
    const { world } = player;

    player.message('The beggar has turned into the lady of the lake!');

    // free the (about to be removed) beggar before swapping in the lady
    player.disengage();

    const lady = world.replaceEntity('npcs', beggar, LADY_GROUND_ID);
    delete lady.respawn;

    // OpenRSC delayedRemoveLady: remove after 116 ticks
    world.setTickTimeout(() => {
        if (world.npcs.getByID(LADY_GROUND_ID) === lady) {
            world.removeEntity('npcs', lady);
        }
    }, 116);

    player.engage(lady);
    await lady.say(
        'Well done you have passed my test',
        'Here is Excalibur, guard it well'
    );
    player.disengage();

    player.inventory.add(EXCALIBUR_ID, 1);
    delete player.cache.lady_test;
}

async function handleDoor(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.x !== DOOR_X || wallObject.y !== DOOR_Y) {
        return false;
    }

    const stage = player.questStages[QUEST_KEY];

    // test not active yet: door just opens
    if ((stage >= 0 && stage < 3) || !('lady_test' in player.cache)) {
        await player.enterDoor(wallObject);
        return true;
    }

    const { world } = player;

    const beggar = findOrSpawnBeggar(player);

    if (!beggar) {
        await player.enterDoor(wallObject);
        return true;
    }

    player.engage(beggar);
    await beggar.say(
        'Please sir, me and my family are starving',
        'Could you possibly give me a loaf of bread?'
    );

    const opt = await player.ask(
        ['Yes certainly', 'No I don\'t have any bread with me'],
        true
    );

    if (opt === 0) {
        if (!player.inventory.has(BREAD_ID)) {
            await player.say(
                'Except that I don\'t have any bread at the moment'
            );
            await beggar.say('Well if you get some you know where to come');
            player.disengage();
            await player.enterDoor(wallObject);
            world.removeEntity('npcs', beggar);
            return true;
        }

        player.message('@que@You give the bread to the beggar');
        await world.sleepTicks(3);
        player.inventory.remove(BREAD_ID);
        await beggar.say('Thankyou very much');

        if ('lady_test' in player.cache) {
            await revealLady(player, beggar);
        } else {
            player.disengage();
            await player.enterDoor(wallObject);
            world.removeEntity('npcs', beggar);
        }
    } else if (opt === 1) {
        await beggar.say('Well if you get some you know where to come');
        player.disengage();
        await player.enterDoor(wallObject);
        world.removeEntity('npcs', beggar);
    }

    return true;
}

async function onWallObjectCommandOne(player, wallObject) {
    return await handleDoor(player, wallObject);
}

async function onWallObjectCommandTwo(player, wallObject) {
    return await handleDoor(player, wallObject);
}

module.exports = { onWallObjectCommandOne, onWallObjectCommandTwo };
