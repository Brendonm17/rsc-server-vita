// commander montai

const { questsEnabled } = require('../../custom-gate.js');
const { COMMANDER_MONTAI_ID, LOGS_ID, ORB_OF_PROTECTION_ID } = require(
    './constants.js'
);

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== COMMANDER_MONTAI_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
            await player.say('hello');
            await npc.say(
                'i can\'t talk now',
                'can\'t you see we\'re trying to win a battle here?',
                'if we can\'t hold back khazard\'s men',
                'we\'re all doomed'
            );
            break;
        case 1: {
            await player.say('hello');
            await npc.say(
                'hello traveller',
                'are you here to help or just to watch?'
            );
            await player.say(
                'I\'ve been sent by king Bolren',
                'to retrieve the orb of protection'
            );
            await npc.say(
                'excellent we need all the help we can get',
                'i\'m commander montai',
                'the orb is in the khazard stronghold to the north',
                'but until we weaken their defences',
                'we can\'t get close'
            );
            await player.say('what can i do?');
            await npc.say(
                'first we need to strengthen our own defences',
                'we desperately need wood to make more battlements',
                'six loads of logs should do it',
                'once the battlements are gone it\'s all over'
            );

            const firstOrb = await player.ask(
                [
                    'Ok, i\'ll gather some wood',
                    'Sorry i no longer want to be involved'
                ],
                true
            );

            if (firstOrb === 0) {
                await player.say('ok, i\'ll gather some wood');
                await npc.say(
                    'please be as quick as you can',
                    'i don\'t know how much longer we can hold out'
                );
                player.questStages.treeGnomeVillage = 2;
            } else if (firstOrb === 1) {
                await player.say('sorry i no longer want to be involved');
                await npc.say(
                    'that\'s a shame we could',
                    'have done with your help'
                );
            }
            break;
        }
        case 2:
            await player.say('hello');
            await npc.say(
                'hello again, we\'re still desperate for wood soldier'
            );
            if (player.inventory.has(LOGS_ID, 6)) {
                for (let i = 0; i < 6; i++) {
                    player.inventory.remove(LOGS_ID);
                }
                await player.say('i have some here');
                player.message('you give some wood to the commander');
                await npc.say(
                    'that\'s excellent now we can make more defensive ' +
                        'battlements',
                    'give me a moment to organise the troops',
                    'and then come speak to me',
                    'i\'ll inform you of our next phase of attack'
                );
                player.questStages.treeGnomeVillage = 3;
            } else {
                await npc.say('we need at least six loads of logs');
                await player.say('i\'ll see what i can do');
                await npc.say('thankyou');
            }
            break;
        case 3: {
            await player.say('how are you doing montai?');
            await npc.say(
                'we\'re hanging in there soldier',
                'for the next phase of the attack',
                'we need to breech their stronghold',
                'the ballista can break through the stronghold wall',
                'and then we can advance and seize back the orb'
            );
            await player.say('so what\'s the problem?');
            await npc.say(
                'from this distance we can\'t get an accurate shot away',
                'we need the correct coordinates of the stronghold',
                'for a direct hit',
                'i\'ve sent out three tracker gnomes to gather them'
            );
            await player.say('have they returned?');
            await npc.say(
                'i\'m afraid not and we\'re running out of time',
                'I need you to go into the heart of the battlefield',
                'find the trackers and bring back the coordinates.',
                'Do you think you can do it?'
            );

            const phasetwo = await player.ask(
                ['No, i\'ve had enough of your battle', 'I\'ll try my best'],
                true
            );

            if (phasetwo === 0) {
                await player.say('no, i\'ve had enough of your battle');
                await npc.say('i understand, this isn\'t your fight');
            } else if (phasetwo === 1) {
                await player.say('i\'ll try my best');
                await npc.say(
                    'thankyou, you\'re braver than most',
                    'i don\'t know how long i will be able to hold out',
                    'once you have the coordinates',
                    'come back and fire the ballista',
                    'right into those monsters',
                    'if you can retrieve the orb and bring safety back to my ' +
                        'people',
                    'none of the blood spilled on this field will be in vain'
                );
                player.questStages.treeGnomeVillage = 4;
            }
            break;
        }
        case 4:
            await player.say('hello');
            await npc.say(
                'hello warrior we need the coordinates',
                'for a direct hit from the ballista',
                'once you have a direct hit you will be able',
                'to enter the stronghold and retrieve the orb'
            );
            break;
        case 5:
            if (player.inventory.has(ORB_OF_PROTECTION_ID)) {
                await player.say('i have the orb of protection');
                await npc.say(
                    'incredible, for a human',
                    'you really are something'
                );
                await player.say('thanks... i think!');
                await npc.say(
                    'I\'ll stay here with my troops',
                    'and try and hold khazard\'s men back',
                    'you return the orb to the gnome village',
                    'go as quick as you can',
                    'the village is still unprotected'
                );
                player.disengage();
                return true;
            }
            await player.say('i\'ve breeched the stronghold');
            await npc.say(
                'i saw, that was a beautiful sight',
                'the khazard troops didn\'t know what hit them',
                'now is the time to retrieve the orb',
                'it\'s all in your hands',
                'i\'ll be praying for you'
            );
            break;
        case 6:
        case -1:
            await player.say('hello montai, how are you?');
            await npc.say(
                'i\'m ok, this battle is going',
                'to take longer to win than i expected',
                'the khazard troops won\'t give up even without the orb'
            );
            await player.say('hang in there');
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
