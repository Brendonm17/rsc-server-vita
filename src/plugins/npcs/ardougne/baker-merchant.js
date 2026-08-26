// baker merchant: shop and greeting

const BAKER_ID = 325;

async function onTalkToNPC(player, npc) {
    if (npc.id !== BAKER_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        `Good day ${player.isMale() ? 'Monsieur' : 'Madame'}`,
        'Would you like ze nice freshly baked bread',
        'Or perhaps a nice piece of cake'
    );

    // Java multi(player, n, options...) defaults send-over true.
    const menu = await player.ask(['Lets see what you have', 'No thankyou'], true);

    if (menu === 0) {
        player.disengage();
        player.openShop('bakers-stall');
        return true;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
