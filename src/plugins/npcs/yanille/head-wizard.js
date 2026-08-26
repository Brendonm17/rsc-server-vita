// magic level check uses current (boostable) level, not base

const { flag } = require('../../../model/qol-config');

const HEAD_WIZARD_ID = 513;

async function onTalkToNPC(player, npc) {
    if (npc.id !== HEAD_WIZARD_ID) {
        return false;
    }

    const config =
        player.world && player.world.server ? player.world.server.config : null;

    if (!flag(config, 'wantMissingGuildGreetings', true)) {
        // OpenRSC blockTalkNpc returns false with the flag off: unhandled.
        return false;
    }

    player.engage(npc);

    if (player.skills.magic.current < 66) {
        await npc.say(
            'Hello, you need a magic level of 66 to get in here',
            'The magical energy in here is unsafe for those below that level'
        );
    } else {
        await npc.say(
            "Hello welcome to the wizard's guild",
            'Only accomplished wizards are allowed in here',
            'Feel free to use any of our facilities'
        );
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
