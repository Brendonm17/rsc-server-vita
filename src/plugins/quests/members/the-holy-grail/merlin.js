// merlin advances the quest from stage 1 -> 2 and points to the holy island

const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, MERLIN_LIBRARY_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== MERLIN_LIBRARY_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY] || 0;

    if (stage === 1 || stage === 2 || stage === 3) {
        await player.say(
            'Hello King Arthur has sent me on a quest for the holy grail',
            'He thought you could offer some assistance'
        );
        await npc.say(
            'Ah yes the holy grail',
            'That is a powerful artifact indeed',
            'Returning it here would help Camelot a lot',
            'Due to its nature the holy grail is likely to reside in a ' +
                'holy place'
        );
        await player.say('Any suggestions?');
        await npc.say(
            'I believe there is a holy island somewhere not far away',
            "I'm not entirely sure",
            'I spent too long inside that crystal',
            'Anyway go and talk to someone over there',
            'I suppose you could also try speaking to Sir Galahad',
            'He returned from the quest many years after everyone else',
            'He seems to know something about it',
            'but he can only speak about those experiences cryptically'
        );

        if (player.questStages[QUEST_KEY] === 1) {
            player.questStages[QUEST_KEY] = 2;
        }

        const menu = await player.ask(
            ['Thankyou for the advice', 'Where can I find Sir Galahad?'],
            false
        );

        if (menu === 0) {
            await player.say('Thankyou for the advice');
        } else if (menu === 1) {
            await player.say('Where can I find Sir Galahad');
            await npc.say(
                'Galahad now lives a life of religious contemplation',
                'He lives somewhere west of McGrubors Wood'
            );
        }

        player.disengage();
        return true;
    }

    if (stage === -1) {
        await npc.say(
            "hello I'm working on a new spell",
            'To turn people into hedgehogs'
        );

        player.disengage();
        return true;
    }

    player.disengage();
    return false;
}

module.exports = { onTalkToNPC };
