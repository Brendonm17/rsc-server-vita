
const JIMINUA_ID = 522;

async function onTalkToNPC(player, npc) {
    if (npc.id !== JIMINUA_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Welcome to the Jungle Store, Can I help you at all?');

    const menu = await player.ask(
        ['Yes please. What are you selling?', 'No thanks'],
        true
    );

    if (menu === 0) {
        await npc.say('Take yourself a good look');
        player.disengage();
        player.openShop('jiminuas-jungle-store');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
