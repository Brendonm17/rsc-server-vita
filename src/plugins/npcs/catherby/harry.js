
const HARRY_ID = 250;

async function onTalkToNPC(player, npc) {
    if (npc.id !== HARRY_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Welcome you can buy fishing equipment at my store',
        "We'll also buy fish that you catch off you"
    );

    const option = await player.ask(
        ["Let's see what you've got then", "Sorry, I'm not interested"],
        false
    );

    if (option === 0) {
        await player.say("Let's see what you've got then");
        player.disengage();
        player.openShop('harrys-fishing-shack');
        return true;
    } else if (option === 1) {
        await player.say("Sorry,I'm not interested");
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
