// the titan can only be truly slain with excalibur equipped

const GroundItem = require('../../../../model/ground-item');
const { questsEnabled } = require('../../custom-gate.js');
const {
    BLACK_KNIGHT_TITAN_ID,
    EXCALIBUR_ID,
    BIG_BONES_ID
} = require('./ids.js');

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== BLACK_KNIGHT_TITAN_ID) {
        return false;
    }

    const { world } = player;

    if (player.inventory.isEquipped(EXCALIBUR_ID)) {
        // genuine kill: drop big bones, remove the titan, teleport the player inside
        world.addEntity(
            'groundItems',
            new GroundItem(world, { id: BIG_BONES_ID, x: npc.x, y: npc.y })
        );

        player.message('Well done you have defeated the black knight titan');

        // end combat before removing the npc
        npc.opponent = null;
        player.opponent = null;
        player.retreat();

        world.removeEntity('npcs', npc);

        player.teleport(414, 11, false);

        // block the engine's default death (loot/xp/removal already handled)
        return true;
    }

    // not slain with excalibur: titan regenerates and taunts
    npc.skills.hits.current = npc.skills.hits.base;
    npc.x = 413;
    npc.y = 11;
    npc.spawnX = 413;
    npc.spawnY = 11;

    npc.opponent = null;
    player.opponent = null;
    player.retreat();

    player.engage(npc);
    await npc.say("You can't defeat me little man", "I'm invincible!");
    player.disengage();

    player.message('Maybe you need something more to beat the titan');

    return true;
}

module.exports = { onNPCDeath };
