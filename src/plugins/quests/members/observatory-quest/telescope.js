// telescope: at stage 6 observe a constellation and complete the quest; at stage -1 keep looking

const { questsEnabled } = require('../../custom-gate.js');
const { TELESCOPE_ID, PROFESSOR_ID, ifNearVisNpc } = require('./ids.js');
const {
    handleReward,
    constellationNameAndReward,
    constellation
} = require('./reward.js');

async function completeAtTelescope(player, professor, selectedNumber) {
    await constellationNameAndReward(player, professor, selectedNumber);

    // sendQuestComplete(OBSERVATORY_QUEST) -> handleReward.
    player.questStages.observatoryQuest = -1;
    handleReward(player);

    await professor.say(
        "By Saradomin's earlobes!",
        'You must be a friend of the gods indeed'
    );
    player.message('Well done, you have completed the Observatory quest');
    await professor.say(
        'Look in your backpack for your reward',
        'In payment for your work'
    );
    player.message(
        'After repairing the telescope you feel more knowledgable in the skill of crafting'
    );
    await professor.say('Now I have work to do...');
    player.message('The professor goes about his business');
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== TELESCOPE_ID) {
        return false;
    }

    const stage = player.questStages.observatoryQuest || 0;

    if (stage === -1) {
        const professor = ifNearVisNpc(player, PROFESSOR_ID, 10);
        if (professor) {
            player.engage(professor);
            player.message('You look through the telescope');
            constellation(player, stage);
            const completedQuest = await player.ask(
                [
                    'I can see a constellation through the telescope',
                    "I see something, but I don't know what it is"
                ],
                true
            );
            if (completedQuest === 0) {
                await professor.say(
                    'Yes, I feel the stars have a message for you...'
                );
            } else if (completedQuest === 1) {
                await professor.say(
                    'With time you may come to learn',
                    'The secrets of the stars'
                );
            }
            player.disengage();
        }
        return true;
    }

    if (stage === 6) {
        const professor = ifNearVisNpc(player, PROFESSOR_ID, 10);
        if (professor) {
            player.engage(professor);
            await professor.say(
                'Well done, well done!!',
                "Let's see what the stars have in store for us today"
            );
            player.message('You look through the telescope');
            const selectedNumber = constellation(player, stage);
            const telescop = await player.ask(
                ['I can see a constellation', 'What am I looking at ?'],
                true
            );
            if (telescop === 0) {
                await professor.say(
                    'Yes, with this device',
                    'The heavens are opened to us...',
                    'The constellation you saw was'
                );
                await completeAtTelescope(player, professor, selectedNumber);
            } else if (telescop === 1) {
                await professor.say(
                    'This is the revealed sky',
                    'The constellation you saw was'
                );
                await completeAtTelescope(player, professor, selectedNumber);
            }
            player.disengage();
        }
        return true;
    }

    // not operational yet.
    player.message('It seems that the telescope is not operational');
    constellation(player, stage);
    return true;
}

module.exports = { onGameObjectCommandOne };
