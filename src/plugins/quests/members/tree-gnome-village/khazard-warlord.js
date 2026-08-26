// khazard warlord carries the two stolen orbs of protection

const { questsEnabled } = require('../../custom-gate.js');
const { KHAZARD_WARLORD_ID, ORBS_OF_PROTECTION_ID } = require('./constants.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== KHAZARD_WARLORD_ID) {
        return false;
    }

    player.engage(npc);

    const { world } = player;
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
            await player.say('hello, how are you?');
            await npc.say(
                'don\'t speak to me you insignificant wretch!',
                'die, in the name of khazard!'
            );
            player.disengage();
            await npc.attack(player);
            return true;
        case 5:
            await player.say('hello there');
            await npc.say('you think you\'re so clever', 'you know nothing!');
            await player.say('what?');
            await npc.say('i\'ll crush you and those pesky little green men!');
            player.disengage();
            await npc.attack(player);
            return true;
        case 6:
        case -1:
            if (
                (stage === 6 &&
                    player.cache.hasOwnProperty('looted_orbs_protect')) ||
                stage === -1
            ) {
                await player.say('i thought i killed you?');
                await npc.say(
                    'fool.. warriors blessed by khazard don\'t die',
                    'you can\'t kill that which is already dead',
                    'however i can kill you'
                );
                player.disengage();
                await npc.attack(player);
            } else {
                await player.say('you there, stop!');
                await npc.say('go back to your pesky little green friends');
                await player.say('i\'ve come for the orbs');
                await npc.say(
                    'you\'re out of your depth traveller',
                    'these orbs are part of a much larger picture'
                );
                await player.say('they\'re stolen goods', 'now give them here');
                await npc.say(
                    'hee hee you really think you stand a chance?',
                    'i\'ll crush you!'
                );
                await world.sleepTicks(2);
                player.disengage();
                await npc.attack(player);
            }
            return true;
    }

    player.disengage();
    return true;
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== KHAZARD_WARLORD_ID) {
        return false;
    }

    if ((player.questStages.treeGnomeVillage || 0) === 6) {
        const { world } = player;

        player.message('As he falls to the ground...');
        await world.sleepTicks(3);
        player.message(
            'A ghostly vapour floats upwards from his battle worn armour'
        );
        await world.sleepTicks(3);
        player.message(
            'Out of sight, you hear a shrill scream in the still air of the ' +
                'valley'
        );
        await world.sleepTicks(3);

        if (!player.inventory.has(ORBS_OF_PROTECTION_ID)) {
            player.message(
                'You search his satchel and find the orbs of protection'
            );
            player.inventory.add(ORBS_OF_PROTECTION_ID, 1);
            if (!player.cache.hasOwnProperty('looted_orbs_protect')) {
                player.cache.looted_orbs_protect = true;
            }
        }
    }

    return false;
}

module.exports = { onTalkToNPC, onNPCDeath };
