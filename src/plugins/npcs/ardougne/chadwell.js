// chadwell: west ardougne general store

const CHADWELL_ID = 661;

async function onTalkToNPC(player, npc) {
    if (npc.id !== CHADWELL_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello there');
    await npc.say('good day, what can i get you?');

    const options = await player.ask(
        ['nothing thanks, just browsing', "lets see what you've got"],
        false
    );

    if (options === 0) {
        await player.say('nothing thanks');
        await npc.say('ok then');
    } else if (options === 1) {
        await player.say("let's see what you've got then");
        player.disengage();
        player.openShop('west-ardougne-general');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
