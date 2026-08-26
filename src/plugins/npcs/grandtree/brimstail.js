
const BRIMSTAIL_ID = 590;

async function onTalkToNPC(player, npc) {
    if (npc.id !== BRIMSTAIL_ID) {
        return false;
    }

    const { world } = player;

    await player.say('Hello');
    await world.sleepTicks(3);
    player.message('The gnome is chanting');
    await world.sleepTicks(3);
    player.message('he does not respond');

    return true;
}

module.exports = { onTalkToNPC };
