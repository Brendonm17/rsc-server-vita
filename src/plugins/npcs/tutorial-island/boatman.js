
const regions = require('@2003scape/rsc-data/regions');
const { hasStage } = require('./stage');

const BOATMAN_ID = 497;

async function onTalkToNPC(player, npc) {
    if (npc.id !== BOATMAN_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Hello my job is to take you to the main game area',
        "It's only a short row",
        'I shall take you to the small town of Lumbridge',
        'In the kingdom of Misthalin'
    );

    const menu = await player.ask(
        ["Ok I'm ready to go", "I'm not done here yet"],
        true
    );

    if (menu === 0) {
        await npc.say('Lets go then');
        player.message('You have completed the tutorial');

        const { spawnX, spawnY } = regions.lumbridge;
        player.teleport(spawnX, spawnY, false);

        delete player.cache.tutorialStage;

        await player.world.sleepTicks(3);
        player.message('The boat arrives in Lumbridge');
    } else if (menu === 1) {
        await npc.say('Ok come back when you are ready');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
