// asking for excalibur sets the lady_test flag

const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, LADY_LAKE_ID, EXCALIBUR_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== LADY_LAKE_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Good day to you');

    const options = ['Who are you?', 'Good day'];

    const stage = player.questStages[QUEST_KEY];
    const excaliburOffered =
        (stage >= 3 || stage === -1) && !player.inventory.has(EXCALIBUR_ID);

    if (excaliburOffered) {
        options.push('I seek the sword Excalibur');
    }

    const option = await player.ask(options, true);

    if (option === 0) {
        await npc.say('I am the lady of the lake');
    } else if (option === 2) {
        await npc.say(
            'Aye, I have that artifact in my possesion',
            'Tis very valuable and not an artifact to be given away lightly',
            'I would want to give it away only to one who is worthy and good'
        );
        await player.say('And how am I meant to prove that');
        await npc.say(
            'I will set a test for you',
            'First I need you to travel to Port Sarim',
            'Then go to the upstairs room of the jeweller\'s shop there'
        );
        await player.say('Ok that seems easy enough');

        player.cache.lady_test = true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
