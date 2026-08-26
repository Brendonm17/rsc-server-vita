
const SHOPKEEPER_FISHING_GUILD_ID = 371;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SHOPKEEPER_FISHING_GUILD_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Would you like to buy some fishing equipment',
        'Or sell some fish'
    );

    const option = await player.ask(['Yes please', 'No thankyou'], true);

    if (option === 0) {
        player.disengage();
        player.openShop('fishing-guild');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
