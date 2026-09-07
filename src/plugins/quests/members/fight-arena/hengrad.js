// hengrad talk branch: once the ogre is dead and you're locked in the cell,
// talking to him teleports you to the arena and spawns the khazard scorpion.

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    HENGRAD_ID,
    KHAZARD_SCORPION_ID
} = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== HENGRAD_ID) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages[QUEST_KEY];

    if (stage === 2 && player.cache.killed_ogre) {
        player.engage(npc);

        await player.say('Are you ok stranger?');
        await npc.say(
            "I'm fine thanks, my name's Hengrad",
            'So khazard got his hands on you too?'
        );
        await player.say("I'm afraid so");
        await npc.say("If you're lucky you may last as long as me");
        await player.say('How long have you been here?');
        await npc.say(
            "I've been in khazard's prisons ever since i can remember",
            'I was a child when his men kidnapped me',
            'My whole life has been spent killing and fighting',
            "All in the hope that one day I'll escape"
        );
        await player.say("Don't give up");
        await npc.say(
            'Thanks friend..wait..sshh,the guard is coming',
            "He'll be taking one of us to the arena"
        );
        player.message('@que@A guard approaches the cell');
        await world.sleepTicks(3);
        await npc.say("Looks like it's you,good luck friend");
        player.message('@que@The guard leads you to the arena');
        await world.sleepTicks(3);
        player.message('@que@For your battle');
        await world.sleepTicks(3);

        player.disengage();
        player.teleport(609, 705, false);

        player.message('@que@From above you hear a voice...');
        await world.sleepTicks(3);
        player.message('@que@Ladies and gentlemen!');
        await world.sleepTicks(3);
        player.message('@que@Todays first fight between the outsider');
        await world.sleepTicks(3);
        player.message("@que@And everyone's favorite scorpion has begun");
        await world.sleepTicks(3);

        // addnpc(KHAZARD_SCORPION, 609, 707) then setChasing(player)
        const scorpion = new NPC(world, {
            id: KHAZARD_SCORPION_ID,
            x: 609,
            y: 707,
            minX: 606,
            maxX: 612,
            minY: 704,
            maxY: 710
        });
        delete scorpion.respawn;
        world.addEntity('npcs', scorpion);
        await scorpion.attack(player);
        return true;
    }

    return false;
}

module.exports = { onTalkToNPC };
