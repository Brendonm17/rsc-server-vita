
const VALAINE_ID = 112;

async function onTalkToNPC(player, npc) {
    if (npc.id !== VALAINE_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Hello there.',
        "Want to have a look at what we're selling today?"
    );

    const opt = await player.ask(['Yes please', 'No thank you'], false);

    if (opt === 0) {
        await player.say('Yes please.');
        player.disengage();
        player.openShop('valaines-shop-of-champions');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
