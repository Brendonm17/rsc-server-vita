// https://classic.runescape.wiki/w/Transcript:Bartender#Bartender_(Brimhaven)
//
// The bartender of "The Dead Man's Chest" pub in Brimhaven (npc 279). This is
// the sixth Alfred Grimhand barcrawl bar (cache.barcrawl.deadMansChest).

const {
    shouldHandleBar,
    deadMansChestBarcrawl
} = require('../../miniquests/barcrawl');

const BARTENDER_ID = 279;
const COINS_ID = 10;
const GROG_ID = 598;
const KARAMJA_RUM_ID = 318;

async function onTalkToNPC(player, npc) {
    if (npc.id !== BARTENDER_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Yohoho me hearty what would you like to drink?');

    const choices = [
        'Nothing thankyou',
        'A pint of Grog please',
        'A bottle of rum please'
    ];

    if (shouldHandleBar(player, 'deadMansChest')) {
        choices.push("I'm doing Alfred Grimhand's barcrawl");
    }

    const choice = await player.ask(choices, true);

    switch (choice) {
        case 0: // nothing
            break;
        case 1: // grog
            await npc.say('One grog coming right up', "That'll be 3 gold");

            if (player.inventory.has(COINS_ID, 3)) {
                player.inventory.remove(COINS_ID, 3);
                player.inventory.add(GROG_ID);
                player.message('You buy a pint of Grog');
            } else {
                await player.say("Oh dear. I don't seem to have enough money");
            }
            break;
        case 2: // bottle of rum
            await npc.say("That'll be 27 gold");

            if (player.inventory.has(COINS_ID, 27)) {
                player.inventory.remove(COINS_ID, 27);
                player.inventory.add(KARAMJA_RUM_ID);
                player.message('You buy a bottle of rum');
            } else {
                await player.say("Oh dear. I don't seem to have enough money");
            }
            break;
        case 3: // barcrawl
            await deadMansChestBarcrawl(player, npc);
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
