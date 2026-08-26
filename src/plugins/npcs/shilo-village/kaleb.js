
const KALEB_ID = 621;

const COINS_ID = 10;
const WINE_ID = 142;
const BEER_ID = 193;
const PARAMAYA_REST_TICKET_ID = 987;

async function onTalkToNPC(player, npc) {
    if (npc.id !== KALEB_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello.');
    await npc.say('Hello Bwana,', 'What can I do for you today?');

    const menu = await player.ask(
        [
            'Can you tell me a bit about this place?',
            'Buy some wine : 1 Gold.',
            'Buy some Beer: 2 Gold.',
            'Buy a nights rest: 35 Gold',
            'Buy a pack of 5 Dorm tickets: 175 Gold'
        ],
        false
    );

    const veryGood = player.isMale() ? 'Very good sir!' : 'Very good madam!';

    if (menu === 0) {
        await player.say('Can you tell me a bit about this place?');
        await npc.say('Of course Bwana, you look like a traveler!');
        await player.say('Yes I am actually!');
        await npc.say(
            'Well, I am a traveller myself, and I have set up this hostel',
            'for adventurers and travellers who are weary from their journey',
            'There is a dormitory upstairs if you are tired, it costs 35 gold',
            'pieces which covers the costs of laundry and cleaning.'
        );
    } else if (menu === 1) {
        await npc.say(veryGood);

        if (player.inventory.has(COINS_ID, 1)) {
            player.inventory.remove(COINS_ID, 1);
            player.inventory.add(WINE_ID, 1);
            player.message('You purchase a jug of wine.');
        } else {
            await npc.say("Sorry Bwana, you don't have enough money.");
        }
    } else if (menu === 2) {
        await npc.say(veryGood);

        if (player.inventory.has(COINS_ID, 2)) {
            player.inventory.remove(COINS_ID, 2);
            player.inventory.add(BEER_ID, 1);
            player.message('You purchase a frothy glass of beer.');
        } else {
            await npc.say("Sorry Bwana, you don't have enough money.");
        }
    } else if (menu === 3) {
        await npc.say(veryGood);

        if (player.inventory.has(COINS_ID, 35)) {
            player.inventory.remove(COINS_ID, 35);
            player.inventory.add(PARAMAYA_REST_TICKET_ID, 1);
            player.message('You purchase a ticket to access the dormitory.');
        } else {
            await npc.say("Sorry Bwana, you don't have enough money.");
        }
    }
    // dead branch: menu never reaches index 5

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
