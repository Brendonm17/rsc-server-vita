
const IRKSOL_ID = 218;

async function onTalkToNPC(player, npc) {
    if (npc.id !== IRKSOL_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'selling ruby rings',
        'The best deals in all the planes of existance'
    );

    const option = await player.ask(
        ["I'm interested in these deals", 'No thankyou'],
        false
    );

    if (option === 0) {
        await player.say("I'm interested in these deals");
        await npc.say('Take a look at these beauties');
        player.disengage();
        player.openShop('ruby-ring');
        return true;
    } else if (option === 1) {
        await player.say('no thankyou');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
