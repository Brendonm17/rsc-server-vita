// elkoy guides the player through the maze (teleport to 644,697)

const { questsEnabled } = require('../../custom-gate.js');
const { ELKOY_ID, ORB_OF_PROTECTION_ID } = require('./constants.js');

async function guideToVillage(player, npc) {
    const menu = await player.ask(['Yes please', 'No thanks Elkoy'], true);
    if (menu === 0) {
        await player.say('yes please');
        await npc.say('ok then follow me');
        player.message('elkoy leads you to the gnome village');
        player.teleport(644, 697, false);
    } else if (menu === 1) {
        await player.say('no thanks elkoy');
        await npc.say('ok then take care');
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== ELKOY_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
            await player.say('hello there');
            await npc.say(
                'hello, welcome to our maze',
                'i\'m elkoy the tree gnome'
            );
            await player.say('i haven\'t heard of your sort');
            await npc.say(
                'there\'s not many of us left',
                'once you could find tree gnomes',
                'anywhere in the world, now we hide',
                'in small groups to avoid capture'
            );
            await player.say('capture by whom?');
            await npc.say(
                'tree gnomes have been hunted',
                'for so called \'fun\' since i',
                'can remember, our main threat',
                'nowadays are General Khazard\'s troops',
                'they know no mercy, but are also',
                'very dense, they\'ll never find',
                'their way through our maze',
                'have fun'
            );
            break;
        case 1:
            await player.say('hello elkoy');
            await npc.say('oh my, oh my');
            await player.say('what\'s wrong?');
            await npc.say('the orb, they have the orb', 'we\'re doomed');
            break;
        case 2:
        case 3:
        case 4:
            await player.say('hello');
            await npc.say(
                'you must retrieve the orb',
                'or the gnome village is doomed'
            );
            break;
        case 5:
            await player.say('hello elkoy');
            await npc.say('you\'re back! and the orb?');
            if (player.inventory.has(ORB_OF_PROTECTION_ID)) {
                await player.say('i have it here');
                await npc.say(
                    'you\'re our saviour',
                    'please return it to the village and we are all saved',
                    'would you like me to show you the way to the village?'
                );
                await guideToVillage(player, npc);
            } else {
                await player.say('no, i\'m afraid not');
                await npc.say(
                    'please, we must have the orb',
                    'if we are to survive'
                );
            }
            break;
        case 6:
            await player.say('hello elkoy');
            if (player.cache.hasOwnProperty('looted_orbs_protect')) {
                await npc.say('you truly are a hero');
                await player.say('thanks');
                await npc.say(
                    'you saved us by',
                    'returning the orbs of"',
                    'protection, i\'m humbled',
                    'and wish you well',
                    'would you like me to show',
                    'you the way to the village?'
                );
                await guideToVillage(player, npc);
            } else {
                await npc.say(
                    'did you hear? khazard\'s men',
                    'have pillaged the village!',
                    'they slaughtered many',
                    'and took the other orbs',
                    'in an attempt to lead us',
                    'all out of the maze',
                    'when will the misery end?',
                    'would you like me to show',
                    'you the way to the village?'
                );
                await guideToVillage(player, npc);
            }
            break;
        case -1:
            await player.say('hello little man');
            await npc.say(
                'hi there, hope life',
                'is treating you well',
                'would you like me to show',
                'you the way to the village?'
            );
            await guideToVillage(player, npc);
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
