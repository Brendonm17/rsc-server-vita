// "teleport" command on a worn crafting cape sends the player to the crafting
// guild; blocked above wilderness level 30

const { wildernessLevel } = require('../skills/magic');
const { resolveCapeIds } = require('../skills/skill-capes');

const ANA_IN_A_BARREL_ID = 1039;
const PLAGUE_SAMPLE_ID = 812;
const CRAFTING_GUILD = { x: 347, y: 599 };

function checkPlagueSample(player) {
    if (player.inventory.has(PLAGUE_SAMPLE_ID)) {
        player.message('@que@the plague sample is too delicate...');
        player.message('@que@it disintegrates in the crossing');

        while (player.inventory.has(PLAGUE_SAMPLE_ID)) {
            player.inventory.remove(PLAGUE_SAMPLE_ID);
        }
    }
}

async function onInventoryCommand(player, item) {
    const capeId = resolveCapeIds().crafting;

    if (typeof capeId !== 'number' || item.id !== capeId) {
        return false;
    }

    const { world } = player;

    if (
        wildernessLevel(player.x, player.y, world.planeElevation) >= 30
    ) {
        player.message('@que@A mysterious force blocks your teleport!');
        await world.sleepTicks(3);
        player.message("@que@You can't use this teleport after level 30 wilderness");
        await world.sleepTicks(3);
        return true;
    }

    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        player.message("@que@You can't teleport while holding Ana,");
        await world.sleepTicks(3);
        player.message("@que@It's just too difficult to concentrate.");
        await world.sleepTicks(3);
        return true;
    }

    player.message('@que@With a swish of your cape');
    await world.sleepTicks(3);
    checkPlagueSample(player);

    player.teleport(CRAFTING_GUILD.x, CRAFTING_GUILD.y, true);
    player.message('@que@You teleport to the Crafting Guild');
    await world.sleepTicks(3);

    return true;
}

module.exports = { onInventoryCommand };
