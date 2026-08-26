
const FRINCOS_ID = 297;

async function onTalkToNPC(player, npc) {
    if (npc.id !== FRINCOS_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Hello how can I help you?');

    // Java multi(player, n, options...) defaults send-over true.
    const menu = await player.ask(
        [
            'What are you selling?',
            "You can't, I'm beyond help",
            "I'm okay, thankyou"
        ],
        true
    );

    if (menu === 0) {
        player.disengage();
        player.openShop('entrana-herblaw');
        return true;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
