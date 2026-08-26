
const OGRE_TRADER_GENSTORE_ID = 687;

async function onTalkToNPC(player, npc) {
    if (npc.id !== OGRE_TRADER_GENSTORE_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say("What the human be wantin'");

    const menu = await player.ask(
        ['Can I see what you are selling ?', "I don't need anything"],
        true
    );

    if (menu === 0) {
        await npc.say('I suppose so...');
        player.disengage();
        player.openShop('ogre-trader-general');
        return true;
    } else if (menu === 1) {
        await npc.say('As you wish');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
