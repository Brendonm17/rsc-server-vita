
const HECKEL_FUNCH_ID = 535;

async function onTalkToNPC(player, npc) {
    if (npc.id !== HECKEL_FUNCH_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello there');
    await npc.say(
        'good day to you my friend ..and a beautiful one at that',
        'would you like some groceries? i have all sorts',
        'alcohol also, if your partial to a drink'
    );

    const choice = await player.ask(
        ['no thank you', "i'll have a look"],
        false
    );

    switch (choice) {
        case 0:
            await npc.say('ahh well, all the best to you');
            break;
        case 1:
            await npc.say("there's a good human");
            player.disengage();
            player.openShop('funchs-fine-groceries');
            return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
