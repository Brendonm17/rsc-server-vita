
const { canIHelpYou } = require('../general-shopkeeper');

const SHOPKEEPER_PORTKHAZARD_ID = 391;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SHOPKEEPER_PORTKHAZARD_ID) {
        return false;
    }

    return await canIHelpYou(player, npc, 'fishing-trawler-general');
}

module.exports = { onTalkToNPC };
