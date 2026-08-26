
// npc 529 = yanille bartender (340 is the ardougne inn bartender)
const BARTENDER_ID = 529;
const COINS_ID = 10;
const DRAGON_BITTER_ID = 829;
const GREENMANS_ALE_ID = 830;

async function onTalkToNPC(player, npc) {
    if (npc.id !== BARTENDER_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('What can I get you?');
    await player.say("What's on the menu?");
    await npc.say('Dragon bitter and Greenmans ale');

    const option = await player.ask(
        [
            "I'll give it a miss I think",
            "I'll try the dragon bitter",
            'Can I have some greenmans ale?'
        ],
        true
    );

    if (option === 0) {
        await npc.say("Come back when you're a little thirstier");
    } else if (option === 1) {
        await npc.say("Ok, that'll be two coins");

        if (player.inventory.has(COINS_ID, 2)) {
            player.message('You buy a pint of dragon bitter');
            player.inventory.add(DRAGON_BITTER_ID);
            player.inventory.remove(COINS_ID, 2);
        } else {
            await player.say("Oh dear. I don't seem to have enough money");
        }
    } else if (option === 2) {
        await npc.say("Ok, that'll be ten coins");

        if (player.inventory.has(COINS_ID, 10)) {
            player.message('You buy a pint of ale');
            player.inventory.add(GREENMANS_ALE_ID);
            player.inventory.remove(COINS_ID, 10);
        } else {
            await player.say("Oh dear. I don't seem to have enough money");
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
