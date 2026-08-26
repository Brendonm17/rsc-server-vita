// passes through once merlin's crystal is complete

const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, QUEST_POINTS, KING_ARTHUR_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== KING_ARTHUR_ID) {
        return false;
    }

    const stage = player.questStages[QUEST_KEY];

    // passes through to holy grail plugin once complete
    if (stage === -1) {
        return false;
    }

    player.engage(npc);

    // KING ARTHUR MERLINS CRYSTAL
    switch (stage) {
        case undefined:
        case 0:
        case 1:
        case 2:
        case 3:
        case 4: {
            await npc.say('Welcome to the court of King Arthur');
            await npc.say('I am King Arthur');

            const option = await player.ask(
                [
                    'I want to become a knight of the round table',
                    'So what are you doing in Runescape?',
                    'Thankyou very much'
                ],
                false
            );

            if (option === 0) {
                await player.say(
                    'I want to become a knight of the round table'
                );
                await npc.say(
                    'Well I think you need to go on a quest to prove ' +
                        'yourself worthy',
                    'My knights like a good quest',
                    'Unfortunately our current quest is to rescue Merlin',
                    'Back in England he got himself trapped in some sort of ' +
                        'magical Crystal',
                    'We\'ve moved him from the cave we found him in',
                    'He\'s upstairs in his tower'
                );
                await player.say('I will see what I can do then');
                await npc.say('Talk to my knights if you need any help');

                if (player.questStages[QUEST_KEY] === 0 ||
                    player.questStages[QUEST_KEY] === undefined) {
                    player.questStages[QUEST_KEY] = 1;
                }
            } else if (option === 1) {
                await player.say('So what are you doing in Runescape');
                await npc.say(
                    'Well legend says we will return to Britain in it\'s ' +
                        'time of greatest need'
                );
                await npc.say('But that\'s not for quite a while');
                await npc.say('So we\'ve moved the whole outfit here for now');
                await npc.say('We\'re passing the time in Runescape');
            } else if (option === 2) {
                await player.say('thankyou very much');
            }
            break;
        }
        case 5: {
            await player.say('I have freed Merlin from his crystal');
            await npc.say(
                'Ah a good job well done',
                'I knight thee',
                'You are now a knight of the round table'
            );

            // sendQuestComplete(MERLINS_CRYSTAL) -> handleReward
            delete player.cache.magic_words;
            player.message(
                '@que@Well done you have completed the Merlin\'s crystal quest'
            );
            player.questStages[QUEST_KEY] = -1;
            player.addQuestPoints(QUEST_POINTS);
            break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
