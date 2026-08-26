// merlin's crystal: sir gawain dialogue

const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, SIR_GAWAIN_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== SIR_GAWAIN_ID) {
        return false;
    }

    player.engage(npc);

    if ('talked_to_gawain' in player.cache) {
        await npc.say('Good day to you sir');

        const option = await player.ask(
            [
                'Any idea how to get into Morgan Le Faye\'s stronghold?',
                'Hello again'
            ],
            true
        );

        if (option === 0) {
            await npc.say('No you\'ve got me stumped there');
        }

        player.disengage();
        return true;
    }

    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case undefined:
        case 0:
        case 2:
        case 3:
        case 4:
        case 5: {
            await npc.say('Good day to you sir');

            const opt = await player.ask(
                ['Good day', 'Know you of any quests Sir knight?'],
                false
            );

            if (opt === 0) {
                await player.say('good day');
            } else if (opt === 1) {
                await player.say('Know you of any quests sir knight?');
                await npc.say(
                    'The king is the man to talk to if you want a quest'
                );
            }
            break;
        }
        case 1: {
            await npc.say('Good day to you sir');

            const option = await player.ask(
                [
                    'Good day',
                    'Any ideas on how to get Merlin out that crystal?',
                    'Do you know how Merlin got trapped'
                ],
                false
            );

            if (option === 0) {
                await player.say('good day');
            } else if (option === 1) {
                await player.say(
                    'Any ideas on how to get Merlin out that crystal?'
                );
                await npc.say(
                    'I\'m a little stumped myself',
                    'We\'ve tried opening it with anything and everything'
                );
            } else if (option === 2) {
                await player.say('Do you know how Merlin got trapped?');
                await npc.say(
                    'I would guess this is the work of the evil Morgan Le Faye'
                );
                await player.say('And where can I find her?');
                await npc.say(
                    'She lives in her stronghold to the south of here'
                );
                await npc.say(
                    'Guarded by some renegade knights led by Sir Mordred'
                );

                player.cache.talked_to_gawain = true;

                const subOption = await player.ask(
                    [
                        'Any idea how to get into Morgan Le Faye\'s ' +
                            'stronghold?',
                        'Thankyou for the information'
                    ],
                    true
                );

                if (subOption === 0) {
                    await npc.say('No you\'ve got me stumped there');
                }
            }
            break;
        }
        case -1: {
            await npc.say('Good day to you sir');

            const ope = await player.ask(
                ['Good day', 'Know you of any quests Sir knight?'],
                false
            );

            if (ope === 0) {
                await player.say('good day');
            } else if (ope === 1) {
                await player.say('Know you of any quests sir knight?');
                await npc.say(
                    'I think you\'ve done the main quest we were on right now'
                );
            }
            break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
