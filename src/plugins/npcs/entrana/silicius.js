
const SILICIUS_ID = 812;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SILICIUS_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'The monks of Entrana are always in need of vials',
        'You can help us by making vials in this very room',
        'If you do, I will automatically trade you bank notes for them'
    );

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
