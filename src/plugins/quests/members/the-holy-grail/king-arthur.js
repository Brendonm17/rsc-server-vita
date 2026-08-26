// king arthur starts and completes the quest, and hands over the feather at stage 4

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    QUEST_POINTS,
    PRAYER_BASE_XP,
    PRAYER_VAR_XP,
    DEFENSE_BASE_XP,
    DEFENSE_VAR_XP,
    KING_ARTHUR_ID,
    MAGIC_GOLDEN_FEATHER_ID,
    HOLY_GRAIL_ID,
    MERLINS_CRYSTAL_KEY
} = require('./ids.js');

// finalxp = maxstat(skill) * varxp + basexp
function handleReward(player) {
    player.message('Well done you have completed the holy grail quest');
    player.questStages[QUEST_KEY] = -1;
    player.addQuestPoints(QUEST_POINTS);
    player.message(`@gre@You haved gained ${QUEST_POINTS} quest points!`);

    const prayerXP = player.skills.prayer.base * PRAYER_VAR_XP + PRAYER_BASE_XP;
    const defenseXP =
        player.skills.defense.base * DEFENSE_VAR_XP + DEFENSE_BASE_XP;

    player.addExperience('prayer', prayerXP, false);
    player.addExperience('defense', defenseXP, false);
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== KING_ARTHUR_ID) {
        return false;
    }


    player.engage(npc);

    const stage = player.questStages[QUEST_KEY] || 0;

    // Holy Grail switch (stages 1,2,3,5 / 4 / -1)
    if (stage === 1 || stage === 2 || stage === 3 || stage === 5) {
        await npc.say('How goes thy quest?');

        if (player.inventory.has(HOLY_GRAIL_ID)) {
            await player.say('I have retrieved the grail');
            await npc.say('wow incredible you truly are a splendid knight');
            player.inventory.remove(HOLY_GRAIL_ID);
            handleReward(player);
        } else {
            await player.say(
                'I am making progress',
                'But I have not recovered the grail yet'
            );
            await npc.say(
                'Well the grail is very elusive',
                'It may take some perserverance'
            );

            if (player.questStages[QUEST_KEY] === 1) {
                await npc.say(
                    'As I said before speak to Merlin',
                    'in the workshop by the library'
                );
            }
        }

        player.disengage();
        return true;
    }

    if (stage === 4) {
        await player.say('Hello, do you have a knight named Sir Percival?');
        await npc.say(
            'Ah yes I remember, young percival',
            'He rode off on a quest a couple of months ago',
            "We are getting a bit worried, he's not back yet",
            'He was going to try and recover the golden boots of Arkaneeses'
        );
        await player.say('Any idea which way that would be?');
        await npc.say(
            'Not exactly',
            'We discovered, some magic golden feathers',
            'They are said to point the way to the boots',
            'they certainly point somewhere',
            'just blowing gently on them',
            'Will make them show the way to go'
        );

        if (!player.inventory.has(MAGIC_GOLDEN_FEATHER_ID)) {
            player.message('King arthur gives you a feather');
            player.inventory.add(MAGIC_GOLDEN_FEATHER_ID, 1);
        }

        player.disengage();
        return true;
    }

    if (stage === -1) {
        await npc.say(
            'Thankyou for retrieving the grail',
            'You shall be long remembered',
            'As one of the greatest heros',
            'Amongst the knights of the round table'
        );

        player.disengage();
        return true;
    }

    // quest start (stage 0): only available once merlin's crystal is done
    if (player.questStages[MERLINS_CRYSTAL_KEY] === -1) {
        await player.say(
            'Now i am a knight of the round table',
            'Do you have anymore quests for me?'
        );
        await npc.say(
            "Aha, I'm glad you are here",
            'I am sending out various knights on an important quest',
            'I was wondering if you too would like to take up this quest?'
        );

        const q = await player.ask(
            [
                'Tell me of this quest',
                'I am weary of questing for the time being'
            ],
            true
        );

        if (q === 0) {
            await npc.say(
                'Well we recently found out',
                'The holy grail has passed into the runescape world',
                'This is most fortuitous',
                'None of my knights ever did return with it last time',
                'Now we have the opportunity to give it another go',
                'Maybe this time we will have more luck'
            );

            const startHoly = await player.ask(
                ["I'd enjoy trying that", 'I may come back and try that later'],
                true
            );

            if (startHoly === 0) {
                await npc.say(
                    'Go speak to Merlin',
                    'He may be able to give a better clue as to where it is',
                    'Now you have freed him from the crystal',
                    'He has set up his workshop in the room next to the library'
                );
                player.questStages[QUEST_KEY] = 1;
            } else if (startHoly === 1) {
                await npc.say('Be sure that you come speak to me soon then');
            }
        } else if (q === 1) {
            await npc.say('Maybe later then');
            await player.say('Maybe so');
        }

        player.disengage();
        return true;
    }

    // merlin's crystal not complete: arthur has no holy grail business here
    player.disengage();
    return false;
}

module.exports = { onTalkToNPC };
