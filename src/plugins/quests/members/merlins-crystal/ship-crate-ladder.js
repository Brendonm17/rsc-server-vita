// merlin's crystal: arhein's ship (stow away to morgan le faye's keep),
// bucket crate, and the keep ladder up

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    ARHEIN_ID,
    LADY_UPSTAIRS_ID,
    SHIP_TYPE,
    CRATE_TYPE,
    LADDER_TYPE,
    SHIP_TILES,
    CRATE_X,
    CRATE_Y,
    LADDER_X,
    LADDER_Y,
    SHIP_HIDE,
    SHIP_ARRIVE,
    LADDER_DELTA_Y,
    LADY_UPSTAIRS_SPAWN,
    BUCKET_ID
} = require('./ids.js');

function isShip(gameObject) {
    return (
        gameObject.id === SHIP_TYPE &&
        SHIP_TILES.some(
            (t) => t.x === gameObject.x && t.y === gameObject.y
        )
    );
}

async function boardShip(player) {
    const { world } = player;

    const arhein = world.npcs
        .getInArea(player.x, player.y, 10)
        .find((n) => n.id === ARHEIN_ID);

    const stage = player.questStages[QUEST_KEY];

    if (stage >= 0 && stage < 2) {
        player.message('@que@I have no reason to do that');
        return;
    }

    if (arhein) {
        player.engage(arhein);
        await arhein.say('Oi get away from there!');
        player.disengage();
        return;
    }

    player.teleport(SHIP_HIDE.x, SHIP_HIDE.y, false);
    player.message('@que@You hide away in the ship');
    await world.sleepTicks(2);
    player.message('@que@The ship starts to move');
    await world.sleepTicks(5);
    player.message('@que@You are out at sea');
    await world.sleepTicks(5);
    player.message('@que@The ship comes to a stop');
    player.teleport(SHIP_ARRIVE.x, SHIP_ARRIVE.y, false);
    player.message('@que@You sneak out of the ship');
    await world.sleepTicks(3);
}

async function openCrate(player) {
    const { world } = player;

    player.message('@que@there are buckets in this crate');
    await world.sleepTicks(2);
    player.message('@que@would you like a bucket?');

    const opt = await player.ask(['Yes', 'No'], true);

    if (opt === 0) {
        player.message('@que@you take a bucket.');
        player.inventory.add(BUCKET_ID, 1);
    }
}

async function climbLadder(player) {
    const { world } = player;

    player.teleport(player.x, player.y + LADDER_DELTA_Y, false);
    player.message('@que@You climb up the ladder');

    const stage = player.questStages[QUEST_KEY];

    if ((stage >= 0 && stage < 3) || !('lady_test' in player.cache)) {
        return;
    }

    await world.sleepTicks(1);

    let lady = world.npcs
        .getInArea(player.x, player.y, 5)
        .find((n) => n.id === LADY_UPSTAIRS_ID);

    if (!lady) {
        lady = new NPC(world, {
            id: LADY_UPSTAIRS_ID,
            x: LADY_UPSTAIRS_SPAWN.x,
            y: LADY_UPSTAIRS_SPAWN.y,
            minX: LADY_UPSTAIRS_SPAWN.x - 1,
            maxX: LADY_UPSTAIRS_SPAWN.x + 1,
            minY: LADY_UPSTAIRS_SPAWN.y - 1,
            maxY: LADY_UPSTAIRS_SPAWN.y + 1
        });

        delete lady.respawn;

        // OpenRSC spawns her for ~74 seconds (~123 ticks)
        world.setTickTimeout(() => {
            if (world.npcs.getByID(LADY_UPSTAIRS_ID) === lady) {
                world.removeEntity('npcs', lady);
            }
        }, 123);

        world.addEntity('npcs', lady);
    }

    await world.sleepTicks(1);

    if (lady) {
        player.engage(lady);
        await player.say('Hello I am here, can I have Excalibur yet?');
        await lady.say(
            'I don\'t think you are worthy enough',
            'Come back when you are a better person'
        );
        player.disengage();
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (isShip(gameObject)) {
        await boardShip(player);
        return true;
    }

    if (
        gameObject.id === CRATE_TYPE &&
        gameObject.x === CRATE_X &&
        gameObject.y === CRATE_Y
    ) {
        await openCrate(player);
        return true;
    }

    if (
        gameObject.id === LADDER_TYPE &&
        gameObject.x === LADDER_X &&
        gameObject.y === LADDER_Y
    ) {
        await climbLadder(player);
        return true;
    }

    return false;
}

module.exports = { onGameObjectCommandOne };
