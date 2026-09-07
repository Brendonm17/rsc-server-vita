// https://classic.runescape.wiki/w/Transcript:Thief
// thief-flavour npcs share the same dialogue as man.js via runDialogue()

const THIEF_IDS = new Set([64, 351, 352, 342, 86]); // thief, thief (blanket), head thief, rogue, alkharid warrior

const { runDialogue } = require('./man');

async function onTalkToNPC(player, npc) {
    if (!THIEF_IDS.has(npc.id)) {
        return false;
    }

    await runDialogue(player, npc);

    return true;
}

module.exports = { onTalkToNPC };
