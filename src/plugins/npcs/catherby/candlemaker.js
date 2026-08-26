
const { questsEnabled } = require('../../quests/custom-gate.js');

const CANDLEMAKER_ID = 282;

async function onTalkToNPC(player, npc) {
    if (questsEnabled(player)) {
        // quest file owns this npc id when quests are enabled
        return false;
    }

    if (npc.id !== CANDLEMAKER_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Hi would you be interested in some of my fine candles');

    // Java RuneScript.multi(options...) defaults send-over true.
    const option = await player.ask(['Yes please', 'No thankyou'], true);

    if (option === 0) {
        player.disengage();
        player.openShop('candle');
        return true;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
