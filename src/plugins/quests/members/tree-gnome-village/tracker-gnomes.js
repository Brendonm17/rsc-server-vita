// the three tracker gnomes: tracker_1 gives height, tracker_2 gives y, tracker_3 gives x via riddle

const { questsEnabled } = require('../../custom-gate.js');
const {
    TRACKER_1_ID,
    TRACKER_2_ID,
    TRACKER_3_ID,
    TRACKER_2_SPOT_ID,
    ORB_OF_PROTECTION_ID
} = require('./constants.js');

async function talkTracker1(player, npc) {
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
        case 1:
            await player.say('hello');
            await npc.say(
                'i can\'t talk now',
                'can\'t you see we\'re trying to win a battle here?'
            );
            break;
        case 2:
            await player.say('hi there');
            await npc.say(
                'we\'re trying to hold them back',
                'but without more wood we won\'t be able to last long'
            );
            await player.say('hang in there little man');
            break;
        case 3:
        case 4:
            await player.say(
                'do you know the coordinates',
                'of the khazard stronghold?'
            );
            await npc.say(
                'i managed to get one although it wasn\'t easy',
                'the height coordinate is 4'
            );
            await player.say('well done');
            await npc.say(
                'the other two tracker gnomes',
                'should have the other coordinates',
                'if they\'re still alive'
            );
            await player.say('ok, take care');
            break;
        case 5:
            if (player.inventory.has(ORB_OF_PROTECTION_ID)) {
                await player.say('how are you tracker?');
                await npc.say(
                    'now we have the globe i\'m much better',
                    'they won\'t stand a chance without it'
                );
                return;
            }
            await player.say('hello again"');
            await npc.say(
                'well done, you\'ve broken down there defenses',
                'this battle must be ours'
            );
            break;
        case 6:
        case -1:
            await player.say('hello');
            await npc.say(
                'when will this battle end?',
                'i feel like i\'ve been fighting forever'
            );
            break;
    }
}

async function talkTracker3(player, npc) {
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
        case 1:
            await player.say('hello');
            await npc.say(
                'i can\'t talk now',
                'can\'t you see we\'re trying to win a battle here?'
            );
            break;
        case 2:
            await player.say('hi there');
            await npc.say(
                'i can\'t stand this war',
                'the misery, the pain, it\'s driving me crazy',
                'when will it end?'
            );
            player.message(
                'He doesn\'t seem to be dealing with the battle very well'
            );
            break;
        case 3:
        case 4:
            await player.say('are you ok?');
            player.message('The gnome looks dilerious');
            await npc.say('ok? who\'s ok? not me', 'hee hee');
            await player.say('what\'s wrong?');
            await npc.say(
                'you can\'t see me, no one can',
                'monsters, demons, they\'re all around me'
            );
            await player.say('what do you mean?');
            await npc.say('they\'re dancing, all of them hee hee');
            player.message('He\'s clearly lost the plot');
            await player.say(
                'do you have the x coordinate for the khazard stronghold?'
            );
            await npc.say('who holds the stronghold?');
            await player.say('what?');
            await npc.say('more than me', 'less than our feet');
            await player.say('you\'re mad');
            await npc.say('more than we', 'and khazard\'s men are beat');
            player.message('The toll of war has affected his mind');
            await player.say('i\'ll pray for you little man');
            await npc.say('all day we pray in the hay', 'hee hee');
            player.message('The poor gnome has gone mad');
            break;
        case 5:
            if (player.inventory.has(ORB_OF_PROTECTION_ID)) {
                await player.say('hello again"');
                await npc.say(
                    'don\'t talk to me, you can\'t see me',
                    'no one can just the demons'
                );
                player.message('The poor gnome has gone mad');
                return;
            }
            await player.say('hello again');
            await npc.say(
                'don\'t talk to me, you can\'t see me',
                'no one can just the demons'
            );
            player.message('The poor gnome has gone mad');
            break;
        case 6:
        case -1:
            await player.say('hello');
            await npc.say(
                'i feel dizzy, where am i?',
                'oh dear, oh dear i need some rest'
            );
            await player.say('I think you do');
            break;
    }
}

async function talkTracker2(player, npc) {
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
        case 1:
            await player.say('hello');
            await npc.say(
                'i can\'t talk now',
                'if the guards catch me i\'ll be dead gnome meat'
            );
            break;
        case 2:
            await player.say('hi there');
            await npc.say(
                'the battle is far from over',
                'if you have a pure heart you will help us win'
            );
            break;
        case 3:
        case 4:
            player.message('The gnome looks beaten and weak');
            await npc.say(
                'they caught me spying on the stronghold..',
                'they beat and tortured me',
                'but i didn\'t crack, i told them nothing',
                'they can\'t break me'
            );
            await player.say('i\'m sorry little man');
            await npc.say(
                'don\'t be, i have the position of the stronghold',
                'the y coordinate is 5'
            );
            await player.say('well done');
            await npc.say('now leave before they find you and all is lost');
            await player.say('hang in there');
            await npc.say('go');
            break;
        case 5:
            if (player.inventory.has(ORB_OF_PROTECTION_ID)) {
                await player.say('how are you tracker?');
                await npc.say(
                    'now we have the globe \'m much better',
                    'soon my comrades will come and free me'
                );
                return;
            }
            await player.say('hello again');
            await npc.say(
                'well done you\'ve broken down there defenses',
                'this battle must be ours'
            );
            break;
        case 6:
        case -1:
            await player.say('hello');
            await npc.say(
                'when will this battle end?',
                'i feel like i\'ve been locked up my whole life'
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === TRACKER_1_ID) {
        player.engage(npc);
        await talkTracker1(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === TRACKER_3_ID) {
        player.engage(npc);
        await talkTracker3(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// operating the hiding spot finds the nearby tracker_2 and starts dialogue
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== TRACKER_2_SPOT_ID) {
        return false;
    }

    const trackerTwo = player.getNearestEntityByID('npcs', TRACKER_2_ID, 5);

    if (!trackerTwo) {
        return false;
    }

    player.engage(trackerTwo);
    await talkTracker2(player, trackerTwo);
    player.disengage();
    return true;
}

module.exports = { onTalkToNPC, onGameObjectCommandOne };
