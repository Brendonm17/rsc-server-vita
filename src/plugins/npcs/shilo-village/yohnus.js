
const { isUltimateIronman } = require('../../../model/qol-config');

const YOHNUS_ID = 622;
const COINS_ID = 10;
const FURNACE_COST = 20;
const FURNACE_X = 400;
const FURNACE_Y = 844;

async function onTalkToNPC(player, npc) {
    if (npc.id !== YOHNUS_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello');
    await npc.say('Hello Bwana, can I help you in anyway?');

    // fast-pay QoL option, off unless server enables it
    const fastPayConfig = !!(
        player.world &&
        player.world.server &&
        player.world.server.config &&
        player.world.server.config.fasterYohnus
    );

    const options = ['Use Furnace - 20 Gold', 'No thanks!'];

    if (fastPayConfig) {
        options.push(
            isUltimateIronman(player)
                ? 'Take from Inventory Until Logout'
                : 'Take from Bank Until Logout'
        );
    }

    const menu = await player.ask(options, false);

    if (menu === 0) {
        if (player.inventory.has(COINS_ID, FURNACE_COST)) {
            player.inventory.remove(COINS_ID, FURNACE_COST);
            await npc.say('Thanks Bwana!', 'Enjoy the facilities!');
            player.teleport(FURNACE_X, FURNACE_Y);
            player.message(
                "You're shown into the Blacksmiths where you can see a furnace"
            );
        } else {
            await npc.say(
                "Sorry Bwana, it seems that you are short of funds."
            );
        }
    } else if (menu === 1) {
        await player.say('No thanks!');
        await npc.say('Very well Bwana, have a nice day.');
    } else if (fastPayConfig && menu === 2) {
        const isUltimate = isUltimateIronman(player);

        await player.say(
            `Sure, you can just take it from my ${
                isUltimate ? 'inventory' : 'bank'
            }`
        );

        const paid = isUltimate
            ? player.inventory.has(COINS_ID, FURNACE_COST) &&
              player.inventory.remove(COINS_ID, FURNACE_COST)
            : player.bank.countId(COINS_ID) >= FURNACE_COST &&
              player.bank.remove(COINS_ID, FURNACE_COST);

        if (paid) {
            await npc.say('Thanks Bwana!', 'Enjoy the facilities!');
            player.teleport(FURNACE_X, FURNACE_Y);
        } else {
            await npc.say(
                'Sorry Bwana',
                `You don't have enough coins in your ${
                    isUltimate ? 'inventory' : 'bank'
                }`
            );
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
