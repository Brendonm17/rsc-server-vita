// right-click "activate" on a worn/held agility cape: 50% chance to trip
// (1 damage) or teleport to the yanille agility dungeon, blocked above wild lvl 30

const { wildernessLevel } = require('../skills/magic');
const { resolveCapeIds } = require('../skills/skill-capes');

const ANA_IN_A_BARREL_ID = 1039;
const YANILLE_AGILITY_DUNGEON = { x: 591, y: 765 };

async function onInventoryCommand(player, item) {
    const capeId = resolveCapeIds().agility;

    if (typeof capeId !== 'number' || item.id !== capeId) {
        return false;
    }

    const { world } = player;

    if (
        wildernessLevel(player.x, player.y, world.planeElevation) >= 30
    ) {
        player.message('@que@A mysterious force blocks your teleport!');
        return true;
    }

    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        player.message("@que@You can't teleport while holding Ana,");
        await world.sleepTicks(3);
        player.message("@que@It's just too difficult to concentrate.");
        await world.sleepTicks(3);
        return true;
    }

    player.message('@que@You turn on the spot');
    await world.sleepTicks(3);

    if (Math.random() < 0.5) {
        player.message('@que@And trip!');
        player.damage(1);
        await player.say('ouch');
        player.message("@que@Aren't you supposed to be good at balancing?");
        return true;
    }

    player.teleport(YANILLE_AGILITY_DUNGEON.x, YANILLE_AGILITY_DUNGEON.y, true);
    player.message('@que@You teleport to the Yanille agility dungeon');

    return true;
}

module.exports = { onInventoryCommand };
