
const FERNAHEI_ID = 616;

async function onTalkToNPC(player, npc) {
    if (npc.id !== FERNAHEI_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        "Welcome to Fernahei's Fishing Shop Bwana!",
        'Would you like to see my items?'
    );

    const menu = await player.ask(
        ['Yes please!', 'No, but thanks for the offer.'],
        true
    );

    if (menu === 0) {
        player.disengage();
        player.openShop('fernaheis-fishing');
        return true;
    }

    await npc.say("That's fine and thanks for your interest.");

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
