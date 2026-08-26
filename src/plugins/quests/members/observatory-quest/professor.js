// professor in the observatory dome: stage-dependent flavour lines

const { questsEnabled } = require('../../custom-gate.js');
const { PROFESSOR_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== PROFESSOR_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.observatoryQuest || 0;

    switch (stage) {
        case 0:
            await npc.say(
                'Hello friend',
                'This is my poorly telescope',
                "It's been tampered with and is not working",
                "If your good at crafting",
                'I would appreciate your help!',
                'Come to the reception if you can'
            );
            break;
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
            await npc.say(
                'Hello friend',
                'I hope you get all the parts soon',
                'Return to the reception',
                'When you have the things I need'
            );
            break;
        case 6:
            await npc.say('Hello friend', "It's time to use the telescope");
            break;
        case -1:
            await npc.say(
                'Hello friend',
                'The stars hold many secrets',
                'The moon rises in Scorpio...'
            );
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
