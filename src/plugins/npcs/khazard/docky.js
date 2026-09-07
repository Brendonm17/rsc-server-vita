// docky at port khazard: sells a 30 gold trip on the lady valentine, boards
// and teleports to port birmhaven (467, 647)

const DOCKY_ID = 390;
const COINS_ID = 10;
const FARE = 30;

async function onTalkToNPC(player, npc) {
    if (npc.id !== DOCKY_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello there');
    await npc.say(
        'ah hoy there, wanting',
        'to travel on the beatiful',
        'lady valentine are we'
    );

    const menu = await player.ask(
        ['not really, just looking around', 'where are you travelling to'],
        true
    );

    if (menu === 0) {
        await npc.say('o.k land lover');
    } else if (menu === 1) {
        await npc.say(
            'we sail direct to Birmhaven port',
            'it really is a speedy crossing',
            'so would you like to come',
            "it cost's 30 gold coin's"
        );

        const travel = await player.ask(['no thankyou', 'ok'], false);

        if (travel === 0) {
            await player.say('no thankyou');
        } else if (travel === 1) {
            await player.say('Ok');

            if (player.inventory.has(COINS_ID, FARE)) {
                player.message('@que@You pay 30 gold');
                player.inventory.remove(COINS_ID, FARE);
                player.message('@que@You board the ship');
                player.teleport(467, 647);
                player.message('The ship arrives at Port Birmhaven');
            } else {
                await npc.say("Oh dear I don't seem to have enough money");
            }
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
