// zanaris fairy shopkeepers (222/223) open the zanaris-general store

const { canIHelpYou } = require('../general-shopkeeper');

const SHOPKEEPER_IDS = new Set([222, 223]);

async function onTalkToNPC(player, npc) {
    if (!SHOPKEEPER_IDS.has(npc.id)) {
        return false;
    }

    return await canIHelpYou(player, npc, 'zanaris-general');
}

module.exports = { onTalkToNPC };
