
const HICKTON_ID = 289;

async function onTalkToNPC(player, npc) {
    if (npc.id !== HICKTON_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        "Welcome to Hickton's Archery Store",
        'Do you want to see my wares?'
    );

    const option = await player.ask(
        ['Yes please', 'No, I prefer to bash things close up'],
        false
    );

    if (option === 0) {
        await player.say('Yes Please');
        player.disengage();
        player.openShop('hicktons-archery');
        return true;
    } else if (option === 1) {
        await player.say('No, I prefer to bash things close up');
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
