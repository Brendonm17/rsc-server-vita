
const BLURBERRY_BARMAN_ID = 580;

async function onTalkToNPC(player, npc) {
    if (npc.id !== BLURBERRY_BARMAN_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('good day to you', 'can i get you drink?');

    // choice not echoed back via say()
    const choice = await player.ask(
        ['what do you have?', 'no thanks'],
        false
    );

    if (choice === 0) {
        await player.say('what do you have');
        await npc.say('take a look');
        player.disengage();
        player.openShop('blurberrys-bar');
        return true;
    } else if (choice === 1) {
        await player.say('no thanks');
        await npc.say('ok, take it easy');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
