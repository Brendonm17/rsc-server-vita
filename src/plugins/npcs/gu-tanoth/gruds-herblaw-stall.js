
const OGRE_MERCHANT_ID = 686;

async function onTalkToNPC(player, npc) {
    if (npc.id !== OGRE_MERCHANT_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say("Does The little creature want to buy sumfin'");

    const menu = await player.ask(['Yes I do', "No I don't"], true);

    if (menu === 0) {
        await npc.say("Welcome to Grud's herblaw stall");
        player.disengage();
        player.openShop('gruds-herblaw-stall');
        return true;
    } else if (menu === 1) {
        await npc.say('Suit yourself');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
