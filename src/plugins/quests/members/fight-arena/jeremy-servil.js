
const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    JEREMY_SERVIL_ID,
    KHAZARD_OGRE_ID
} = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== JEREMY_SERVIL_ID) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages[QUEST_KEY];

    player.engage(npc);

    if (stage >= 3 || stage === -1) {
        player.message('You need to kill the creatures in the arena');
        player.disengage();
        return true;
    }

    if (stage === 2 && player.cache.freed_servil) {
        await player.say("Jeremy where's your father?");
        await npc.say(
            'Quick, help him! that beast will kill him',
            "He can't fight! he's too old!"
        );
        player.message("You see Jeremy's father Justin");
        await world.sleepTicks(3);
        player.message('Trying to escape an ogre');
        await world.sleepTicks(3);
        await npc.say('Please help him!');

        // addnpc(KHAZARD_OGRE, 611, 706) then setChasing(player)
        const ogre = new NPC(world, {
            id: KHAZARD_OGRE_ID,
            x: 611,
            y: 706,
            minX: 608,
            maxX: 614,
            minY: 703,
            maxY: 709
        });
        delete ogre.respawn;
        world.addEntity('npcs', ogre);
        player.disengage();
        await ogre.attack(player);
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
