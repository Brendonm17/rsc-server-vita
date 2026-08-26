
const SEREVEL_ID = 623;
const COINS_ID = 10;
const SHIP_TICKET_ID = 988;
const FARE = 100;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SEREVEL_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello');
    await npc.say(
        'Hello Bwana.',
        "Are you interested in buying a ticket for the 'Lady of the Waves'?",
        "It's a ship that can take you to either Port Sarim or Khazard Port",
        'The ship lies west of Shilo Village and south of Cairn Island.',
        'The tickets cost 100 Gold Pieces.',
        'Would you like to purchase a ticket Bwana?'
    );

    const menu = await player.ask(
        ['Yes, that sounds great!', 'No thanks.'],
        true
    );

    if (menu === 0) {
        if (player.inventory.has(COINS_ID, FARE)) {
            player.inventory.remove(COINS_ID, FARE);
            await npc.say('Great, nice doing business with you.');
            player.inventory.add(SHIP_TICKET_ID, 1);
        } else {
            await npc.say(
                "Sorry Bwana, you don't have enough money.",
                'Come back when you have 100 Gold Pieces.'
            );
        }
    } else if (menu === 1) {
        await npc.say("Fair enough Bwana, let me know if you change your mind.");
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
