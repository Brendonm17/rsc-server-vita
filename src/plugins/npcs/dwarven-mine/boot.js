
const BOOT_THE_DWARF_ID = 313;

async function onTalkToNPC(player, npc) {
    if (npc.id !== BOOT_THE_DWARF_ID) {
        return false;
    }

    return false;
}

module.exports = { onTalkToNPC };
