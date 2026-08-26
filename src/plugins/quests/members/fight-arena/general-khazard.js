
const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, GENERAL_KHAZARD_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GENERAL_KHAZARD_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case undefined:
        case 0:
        case 1:
        case 2:
            await player.say('hello');
            await npc.say(
                'who dares enter my home?',
                'you, a feeble traveller'
            );
            await player.say('..feeble!');
            await npc.say(
                "i'll enjoy spilling your blood",
                'face your doom!'
            );
            player.disengage();
            await npc.attack(player);
            return true;
        case 3:
        case -1:
            await player.say('i thought i was rid of you');
            await npc.say(
                "you might not believe it young one",
                "but you can't kill what's already dead",
                'die, foul smelling creature'
            );
            player.disengage();
            await npc.attack(player);
            return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
