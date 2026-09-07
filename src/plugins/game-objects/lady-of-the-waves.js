// lady of the waves - a ship at shilo village that ferries ticket-holders to
// khazard port or port sarim; without a ship ticket the captain turns you away.

const SHIP_LADY_OF_THE_WAVES_FRONT = 780;
const SHIP_LADY_OF_THE_WAVES_BACK = 781;

const SHIP_TICKET_ID = 988;

async function sail(player, option) {
    const { world } = player;

    if (player.inventory.has(SHIP_TICKET_ID)) {
        player.inventory.remove(SHIP_TICKET_ID);

        player.message("@que@@yel@Captain: Thanks for the ticket, let's set sail!");
        await world.sleepTicks(2);
        player.message('@que@You board the ship and it sails off.');
        await world.sleepTicks(2);

        if (option === 0) {
            player.teleport(545, 703);
            player.message("@que@Before you know it, you're in Khazard Port.");
        } else if (option === 1) {
            player.teleport(269, 640);
            player.message("@que@Before you know it, you're in Port Sarim.");
        }
    } else {
        player.message('@que@The captain shakes his head.');
        await world.sleepTicks(2);
        player.message('@que@@yel@Captain: Sorry Bwana, but you need a ticket!');
        await world.sleepTicks(2);
        player.message('@que@@yel@Captain: You can get one in Shilo Village ');
        await world.sleepTicks(2);
        player.message('@que@@yel@Captain: Just above the fishing shop. ');
        await world.sleepTicks(2);
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (
        gameObject.id !== SHIP_LADY_OF_THE_WAVES_FRONT &&
        gameObject.id !== SHIP_LADY_OF_THE_WAVES_BACK
    ) {
        return false;
    }

    player.message('@que@This ship looks like it might take you somewhere.');
    player.message('@que@The captain shouts down,');
    player.message('@que@@yel@Captain: Where would you like to go?');

    const menu = await player.ask(
        ['Khazard Port', 'Port Sarim', 'No where thanks!'],
        false
    );

    if (menu === 0 || menu === 1) {
        await sail(player, menu);
    } else if (menu === 2) {
        await player.say('No where thanks!');
        player.message('@que@@yel@Captain: Ok, come back if you change your mind.');
    }

    return true;
}

module.exports = { onGameObjectCommandOne };
