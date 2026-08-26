// quest advisor npc, gates tutorial door at stage >= 65

const { hasStage, setStageIfLess } = require('./stage');

const QUEST_ADVISOR_ID = 489;

async function onTalkToNPC(player, npc) {
    if (npc.id !== QUEST_ADVISOR_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Greetings traveller',
        "If you're interested in a bit of adventure",
        'I can recommend going on a good quest',
        'There are many secrets to be unconvered',
        'And wrongs to be set right',
        'If you talk to the various characters in the game',
        'Some of them will give you quests'
    );
    await player.say('What sort of quests are there to do?');
    await npc.say(
        'If you select the bar graph in the menu bar',
        'And then select the quests tabs',
        'You will see a list of quests',
        'quests you have completed will show up in green',
        'You can only do each quest once'
    );

    const menu = await player.ask(
        ['Thank you for the advice', 'Can you recommend any quests?'],
        false
    );

    if (menu === 0) {
        await player.say('thank you for the advice');
        await npc.say('good questing traveller');
        setStageIfLess(player, 65);
    } else if (menu === 1) {
        await player.say('Can you recommend any quests?');
        await npc.say(
            'Well I hear the cook in Lumbridge castle is having some problems',
            'When you get to Lumbridge, go into the castle there',
            'Find the cook and have a chat with him'
        );
        await player.say('Okay thanks for the advice');
        setStageIfLess(player, 65);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
