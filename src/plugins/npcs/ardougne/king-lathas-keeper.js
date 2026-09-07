// shop keeper of king lathas' combat training camp
// opens the king-lathas-weaponry members shop

const SHOP_KEEPER_TRAINING_CAMP_ID = 528;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SHOP_KEEPER_TRAINING_CAMP_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello');
    await npc.say(
        'so are you looking to buy some weapons?',
        'king lathas keeps us very well stocked'
    );

    const option = await player.ask(['what do you have?', 'no thanks'], true);

    if (option === 0) {
        await npc.say('take a look');
        player.disengage();
        player.openShop('king-lathas-weaponry');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
