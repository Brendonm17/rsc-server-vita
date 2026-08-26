
const OBLI_ID = 620;

async function onTalkToNPC(player, npc) {
    if (npc.id !== OBLI_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        "Welcome to Obli's General Store Bwana!",
        'Would you like to see my items?'
    );

    const menu = await player.ask(
        ['Yes please!', 'No, but thanks for the offer.'],
        true
    );

    if (menu === 0) {
        player.disengage();
        player.openShop('shilo-village-general');
        return true;
    }

    await npc.say("That's fine and thanks for your interest.");

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
