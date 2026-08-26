
const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, LOCAL_ID, hasDisguise } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== LOCAL_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY];

    if (stage === 3 || stage === -1) {
        if (hasDisguise(player)) {
            await player.say('hello');
            await npc.say("please, i haven't done anything");
            await player.say('what?');
            await npc.say('i love General Khazard, please believe me');
        } else {
            await player.say('hello');
            await npc.say(
                'hello stranger',
                "Khazard's got some great fights lined up this week",
                "i can't wait"
            );
        }
        player.disengage();
        return true;
    }

    if (stage === 2) {
        await player.say('hello');
        await npc.say(
            'are you enjoying the arena?',
            'i heard the servil family are fighting soon',
            'should be very entertaining'
        );
        player.disengage();
        return true;
    }

    if (stage === 1) {
        await player.say('hello');
        await npc.say('hello stranger are you new to these parts?');
        await player.say('i suppose i am');
        await npc.say("what's your business?");
        await player.say('just visiting friends in the cells');
        await npc.say(
            "visiting, that's funny",
            'only khazard guards are allowed to see prisoners',
            "so unless you know where to get some khazard armour",
            "you won't be visiting anyone"
        );
        player.disengage();
        return true;
    }

    await player.say('hello');
    await npc.say(
        'hello stranger are you new to these parts?',
        'you look lost',
        "i suppose you're here for the fight arena?",
        'there are some rich folk fighting tomorrow',
        'should be entertaining'
    );

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
