// kill order: ogre, scorpion, bouncer, then general

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    KHAZARD_OGRE_ID,
    KHAZARD_SCORPION_ID,
    BOUNCER_ID,
    GENERAL_KHAZARD_ID,
    JUSTIN_SERVIL_ID,
    ifNearVisNpc
} = require('./ids.js');

// addnpc(GENERAL_KHAZARD, 613, 708) - spawn the general in the arena
function spawnGeneral(world) {
    const general = new NPC(world, {
        id: GENERAL_KHAZARD_ID,
        x: 613,
        y: 708,
        minX: 610,
        maxX: 616,
        minY: 705,
        maxY: 711
    });
    delete general.respawn;
    world.addEntity('npcs', general);
    return general;
}

async function onKillOgre(player) {
    const { world } = player;

    if (!player.cache.killed_ogre) {
        player.cache.killed_ogre = true;
    }
    player.message('You kill the ogre');
    player.message("Jeremy's father survives");
    await world.sleepTicks(3);

    const justin = ifNearVisNpc(player, JUSTIN_SERVIL_ID, 15);
    if (justin) {
        player.engage(justin);
        await justin.say(
            "You saved my life and my son's",
            'I am eternally in your debt brave traveller'
        );
        player.disengage();
    }

    const general = spawnGeneral(world);
    await world.sleepTicks(2);

    player.engage(general);
    await general.say(
        'Haha, well done, well done that was rather entertaining',
        "I'm the great General Khazard",
        'And the two men you just saved are my property'
    );
    await player.say('They belong to no one');
    await general.say(
        'I suppose we could find some arrangement',
        'for their freedom... hmmmm'
    );
    await player.say('What do you mean?');
    await general.say(
        "I'll let them go but you must stay and fight for me",
        "You'll make me double the gold if you manage to last a few fights",
        'Guards! take him away!'
    );
    player.message("Khazard's men have locked you in a cell");
    player.disengage();
    player.teleport(609, 715, false);
    world.removeEntity('npcs', general);
}

async function onKillScorpion(player) {
    const { world } = player;

    player.message('You defeat the scorpion');

    const general = spawnGeneral(world);
    await world.sleepTicks(2);

    const generalAgain = ifNearVisNpc(player, GENERAL_KHAZARD_ID, 15);
    if (generalAgain) {
        player.engage(generalAgain);
        await generalAgain.say(
            'Not bad, not bad at all',
            'I think you need a tougher challenge',
            'Time for my puppy',
            'Guards, guards bring on bouncer'
        );
        player.disengage();
        world.removeEntity('npcs', generalAgain);
    }

    player.message('From above you hear a voice...');
    await world.sleepTicks(3);
    player.message('Ladies and gentlemen!');
    await world.sleepTicks(3);
    player.message('Todays second round');
    await world.sleepTicks(3);

    // addnpc(BOUNCER, 612, 708) then setChasing(player)
    const bouncer = new NPC(world, {
        id: BOUNCER_ID,
        x: 612,
        y: 708,
        minX: 609,
        maxX: 615,
        minY: 705,
        maxY: 711
    });
    delete bouncer.respawn;
    world.addEntity('npcs', bouncer);
    player.message('between the Outsider and bouncer');
    await bouncer.attack(player);
}

async function onKillBouncer(player) {
    const { world } = player;

    player.message('You defeat bouncer');

    const general = spawnGeneral(world);
    await world.sleepTicks(2);

    const generalAgain = ifNearVisNpc(player, GENERAL_KHAZARD_ID, 15);
    if (generalAgain) {
        player.engage(generalAgain);
        await generalAgain.say(
            'nooooo! bouncer, how dare you?',
            "you've taken the life of my only friend!"
        );
        player.message('Khazard looks very angry');
        await generalAgain.say(
            "now you'll suffer traveller, prepare to meet your maker"
        );
        player.message("No, he doesn't look happy at all");
        await world.sleepTicks(3);
        player.message('You might want to run for it');
        await world.sleepTicks(3);
        player.message('Go back to lady servil to claim your reward');
        await world.sleepTicks(3);
        player.disengage();
        await generalAgain.attack(player);
    }

    player.questStages[QUEST_KEY] = 3;
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (npc.id) {
        case KHAZARD_OGRE_ID:
            await onKillOgre(player);
            return false;
        case KHAZARD_SCORPION_ID:
            await onKillScorpion(player);
            return false;
        case BOUNCER_ID:
            await onKillBouncer(player);
            return false;
        case GENERAL_KHAZARD_ID:
            // he cannot truly be killed
            player.message('You kill general khazard');
            player.message('but he shall return');
            npc.skills.hits.current = npc.skills.hits.base;
            return true;
        default:
            return false;
    }
}

module.exports = { onNPCDeath };
