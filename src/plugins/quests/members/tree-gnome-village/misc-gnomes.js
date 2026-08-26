// ambient gnomes: gnome troop, remsai, local gnome, kalron

const { questsEnabled } = require('../../custom-gate.js');
const {
    GNOME_TROOP_ID,
    REMSAI_ID,
    LOCAL_GNOME_ID,
    KALRON_ID,
    ORB_OF_PROTECTION_ID,
    ORBS_OF_PROTECTION_ID
} = require('./constants.js');

async function talkGnomeTroop(player, npc) {
    const stage = player.questStages.treeGnomeVillage || 0;

    if (stage === 5 || stage === -1) {
        await player.say('hi');
        await npc.say('draw your sword warrior', 'and fight along side us!');
    } else if (stage === 0 || stage >= 2 || stage <= 4) {
        await player.say('hello');
        await npc.say(
            'i can\'t talk now',
            'can\'t you see we\'re trying',
            'to win a battle here?'
        );
    } else {
        await player.say('hello');
        await npc.say('death to khazard and all who serve him!');
    }
}

async function talkRemsai(player, npc) {
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
            await player.say('hello');
            await npc.say(
                'well done, well done',
                'not many find their way in here',
                'i\'m remsai, a tree gnome',
                'we live in this maze for our protection',
                'have a look around and enjoy'
            );
            break;
        case 1:
            await npc.say('oh my, oh my');
            await player.say('what\'s wrong?');
            await npc.say(
                'the orb, they have the orb',
                'it must be returned',
                'or we\'re doomed'
            );
            break;
        case 2:
        case 3:
        case 4:
            await npc.say(
                'the orb, they have the orb',
                'if it\'s not returned we\'re doomed'
            );
            break;
        case 5:
            await player.say('hello remsai');
            await npc.say('hello, did you find the orb?');
            if (player.inventory.has(ORB_OF_PROTECTION_ID)) {
                await player.say('i have it here');
                await npc.say('you\'re our saviour');
            } else {
                await player.say('no, i\'m afraid not');
                await npc.say(
                    'please we must have the orb',
                    'if we are to survive'
                );
            }
            break;
        case 6:
            if (player.inventory.has(ORBS_OF_PROTECTION_ID)) {
                await player.say('i\'ve returned');
                await npc.say(
                    'you\'re back, well done brave adventurer',
                    'now the orbs are safe',
                    'we can perform the ritual for the orb tree',
                    'and we can live in peace once again'
                );
            } else {
                await player.say('are you ok?');
                await npc.say(
                    'Khazard\'s men came',
                    'without the orb we were defenseless',
                    'they killed many',
                    'and then took our last hope',
                    'the other orbs',
                    'now surely we\'re all doomed',
                    'without them the spirit tree is useless'
                );
            }
            break;
        case -1:
            await player.say('hello');
            await npc.say(
                'hi there traveller',
                'you\'re a legend around these parts'
            );
            await player.say('thanks remsai');
            break;
    }
}

async function talkLocalGnome(player, npc) {
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
            await player.say('hello');
            await npc.say('lardi dee, lardi da');
            await player.say('are you alright?');
            await npc.say('hee hee, lardi da, lardi dee');
            player.message('The gnome appears to be singing');
            break;
        case 5:
            await player.say('hello little man');
            await npc.say(
                'little man stronger than big man',
                'hee hee',
                'lardi dee, lardi da'
            );
            player.message('Cheeky little gnome');
            break;
        case 6:
            if (player.cache.hasOwnProperty('looted_orbs_protect')) {
                await player.say('hello gnome');
                await npc.say(
                    'soon we\'re gonna have the sacred ceremony',
                    'and boy am i going to party',
                    'lock up your daughters',
                    'hee hee'
                );
            } else {
                await player.say('hi');
                await npc.say(
                    'must save the orbs and kill the khazard warlord',
                    'that will be fun',
                    'hee hee'
                );
            }
            break;
        case -1:
            await player.say('hello');
            await npc.say('you\'re the best');
            await player.say('thanks');
            await npc.say('well, i\'m better', 'hee hee');
            break;
    }
}

async function talkKalron(player, npc) {
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
            await player.say('hello');
            await npc.say(
                'gotta find a way out',
                'we built this maze for protection',
                'but i can\'t get used to it',
                'i\'m always getting lost'
            );
            break;
        case 5:
            await player.say('hello there');
            await npc.say(
                'oh my, oh my',
                'the village has been',
                'and i\'m still lost',
                'oh dear'
            );
            break;
        case 6:
            if (player.cache.hasOwnProperty('looted_orbs_protect')) {
                await player.say('hello little man');
                await npc.say(
                    'hello i hope they come out and find me soon,',
                    'it\'s getting cold'
                );
            } else {
                await player.say('hello, how are you?');
                await npc.say(
                    'oh my i\'ll never find my way back',
                    'before khazard\'s men come and hunt me down'
                );
            }
            break;
        case -1:
            await player.say('hello there, you look lost');
            await npc.say('are you trying to be funny?');
            await player.say('no');
            await npc.say('hmmm');
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    let handler = null;

    switch (npc.id) {
        case GNOME_TROOP_ID:
            handler = talkGnomeTroop;
            break;
        case REMSAI_ID:
            handler = talkRemsai;
            break;
        case LOCAL_GNOME_ID:
            handler = talkLocalGnome;
            break;
        case KALRON_ID:
            handler = talkKalron;
            break;
        default:
            return false;
    }

    player.engage(npc);
    await handler(player, npc);
    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
