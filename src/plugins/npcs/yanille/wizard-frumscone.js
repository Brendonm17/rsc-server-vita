
const WIZARD_FRUMSCONE_ID = 515;

async function onTalkToNPC(player, npc) {
    if (npc.id !== WIZARD_FRUMSCONE_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Do you like my magic zombies',
        'Feel free to kill them',
        'Theres plenty more where these came from'
    );

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
