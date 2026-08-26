// merlin's crystal: sir lancelot dialogue

const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, SIR_LANCELOT_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== SIR_LANCELOT_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case undefined:
        case 0:
        case 1: {
            await npc.say(
                'Greetings I am Sir Lancelot the greatest knight in the land',
                'What do you want?'
            );

            if ('talked_to_gawain' in player.cache) {
                const opt = await player.ask(
                    [
                        'I want to get Merlin out of the crystal',
                        'You\'re a little full of yourself aren\'t you?',
                        'Any ideas on how to get into Morgan Le Faye\'s ' +
                            'stronghold?'
                    ],
                    false
                );

                if (opt === 0) {
                    await player.say('I want to get Merlin out of the crystal');
                    await npc.say(
                        'Well the knights of the round table can\'t manage it',
                        'I can\'t see how a commoner like you could succeed ' +
                            'where we have failed'
                    );
                } else if (opt === 1) {
                    await player.say(
                        'You\'re a little full of yourself aren\'t you?'
                    );
                    await npc.say(
                        'I have every right to be proud of myself',
                        'My prowess in battle is world renowned'
                    );
                } else if (opt === 2) {
                    await player.say(
                        'Any ideas on how to get into Morgan Le Fayes\'s ' +
                            'stronghold'
                    );
                    await npc.say(
                        'That stronghold is built in a strong defensive ' +
                            'position',
                        'It\'s on a big rock sticking out into the sea',
                        'There are two ways in that I know of, the large ' +
                            'heavy front doors',
                        'And the sea entrance, only penetrable by boat',
                        'They take all their deliveries by boat'
                    );

                    if (player.questStages[QUEST_KEY] === 0 ||
                        player.questStages[QUEST_KEY] === 1 ||
                        player.questStages[QUEST_KEY] === undefined) {
                        player.questStages[QUEST_KEY] = 2;
                    }
                    delete player.cache.talked_to_gawain;
                }
            } else {
                const opt = await player.ask(
                    [
                        'I want to get Merlin out of the crystal',
                        'You\'re a little full of yourself aren\'t you?'
                    ],
                    true
                );

                if (opt === 0) {
                    await npc.say(
                        'Well the knights of the round table can\'t manage it',
                        'I can\'t see how a commoner like you could succeed ' +
                            'where we have failed'
                    );
                } else if (opt === 1) {
                    await npc.say(
                        'I have every right to be proud of myself',
                        'My prowess in battle is world renowned'
                    );
                }
            }
            break;
        }
        case 2:
        case 3:
        case 4:
        case 5:
        case -1: {
            await npc.say(
                'Greetings I am Sir Lancelot the greatest knight in the land',
                'What do you want?'
            );

            const opt = await player.ask(
                [
                    'You\'re a little full of yourself aren\'t you?',
                    'I seek a quest'
                ],
                true
            );

            if (opt === 0) {
                await npc.say(
                    'I have every right to be proud of myself',
                    'My prowess in battle is world renowned'
                );
            } else if (opt === 1) {
                await npc.say(
                    'Leave questing to the profesionals',
                    'Such as myself'
                );
            }
            break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
