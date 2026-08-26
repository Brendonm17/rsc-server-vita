
const HUDO_GLENFAD_ID = 537;

async function onTalkToNPC(player, npc) {
    if (npc.id !== HUDO_GLENFAD_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello there');
    await npc.say(
        'good day ..and a beautiful one at that',
        'would you like some groceries? i have a large selection'
    );

    const choice = await player.ask(
        ['no thankyou', "i'll have a look"],
        false
    );

    switch (choice) {
        case 0:
            await npc.say('ahh well, all the best to you');
            break;
        case 1:
            await npc.say('great stuff');
            player.disengage();
            player.openShop('grand-tree-groceries');
            return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
