
const FRENITA_ID = 530;

async function onTalkToNPC(player, npc) {
    if (npc.id !== FRENITA_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Would you like to buy some cooking equipment');

    // Java multi(player, n, options...) defaults send-over true.
    const option = await player.ask(['Yes please', 'No thankyou'], true);

    if (option === 0) {
        player.disengage();
        player.openShop('frenitas-cooking');
        return true;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
