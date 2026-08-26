
const MAGIC_STORE_OWNER_ID = 514;

async function onTalkToNPC(player, npc) {
    if (npc.id !== MAGIC_STORE_OWNER_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Welcome to the magic guild store',
        'would you like to buy some magic supplies?'
    );

    // Java multi(player, n, options...) defaults send-over true.
    const option = await player.ask(['Yes please', 'No thankyou'], true);

    if (option === 0) {
        player.disengage();
        player.openShop('magic-guild');
        return true;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
