// buys cabbage / special defense cabbage for 100 gold each

const FAIRY_LUNDERWIN_ID = 219;
const COINS_ID = 10;
const CABBAGE_ID = 18;
const SPECIAL_DEFENSE_CABBAGE_ID = 228;
const PRICE_PER_CABBAGE = 100;

function hasCabbage(player) {
    return (
        player.inventory.has(CABBAGE_ID) ||
        player.inventory.has(SPECIAL_DEFENSE_CABBAGE_ID)
    );
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== FAIRY_LUNDERWIN_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'I am buying cabbage, we have no such thing where I come from',
        'I pay hansomly for this wounderous object',
        'Would 100 gold coins per cabbage be a fair price?'
    );

    if (hasCabbage(player)) {
        const menu = await player.ask(
            ['Yes, I will sell you all my cabbages', 'No, I will keep my cabbbages'],
            false
        );

        if (menu === 0) {
            await player.say('Yes, I will sell you all my cabbages');

            while (hasCabbage(player)) {
                player.message('@que@You sell a cabbage');

                if (player.inventory.has(CABBAGE_ID)) {
                    player.inventory.remove(CABBAGE_ID, 1);
                } else if (player.inventory.has(SPECIAL_DEFENSE_CABBAGE_ID)) {
                    player.inventory.remove(SPECIAL_DEFENSE_CABBAGE_ID, 1);
                }

                player.inventory.add(COINS_ID, PRICE_PER_CABBAGE);
            }

            await npc.say('Good doing buisness with you');
        } else if (menu === 1) {
            await player.say('No, I will keep my cabbages');
        }
    } else {
        await player.say('Alas I have no cabbages either');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
