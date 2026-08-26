const { buryExperience } = require('@2003scape/rsc-data/skills/prayer');
const skillCapes = require('./skill-capes');

const BONE_IDS = new Set(Object.keys(buryExperience).map(Number));

// prayer points restored per bone type on bury: bones/bat bones 1, big bones 2, dragon bones 4
const PRAYER_CAPE_RESTORE = {
    20: 1, // Bones
    604: 1, // Bat bones
    413: 2, // Big Bones
    814: 4 // Dragon Bones
};

// restore prayer points, capped at max, when the prayer cape activates
function prayerCape(player, boneID) {
    const current = player.skills.prayer.current;
    const max = player.skills.prayer.base;

    if (current >= max) {
        return;
    }

    const pointsToRestore = PRAYER_CAPE_RESTORE[boneID] || 0;

    if (pointsToRestore > 0) {
        player.message(
            `@yel@Your prayer cape activates, restoring ${pointsToRestore} ` +
                'prayer points!'
        );

        player.skills.prayer.current = Math.min(
            current + pointsToRestore,
            max
        );

        player.sendStats();
    }
}

async function onInventoryCommand(player, item) {
    if (!BONE_IDS.has(item.id)) {
        return false;
    }

    const { world } = player;

    player.message('@que@You dig a hole in the ground');
    await world.sleepTicks(1);

    player.inventory.remove(item.id);
    player.addExperience('prayer', buryExperience[item.id]);
    player.message(`@que@You bury the ${item.definition.name.toLowerCase()}`);

    // prayer cape (100% worn): restores prayer points on bury
    if (skillCapes.shouldActivate(player, 'prayer')) {
        prayerCape(player, item.id);
    }

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.definition.commands[0] !== 'Recharge at') {
        return false;
    }

    if (player.skills.prayer.current >= player.skills.prayer.base) {
        player.message('@que@You already have full prayer points');
    } else {
        player.skills.prayer.current = player.skills.prayer.base;
        player.sendStats();

        player.message('@que@You recharge your prayer points');
        player.sendSound('recharge');
    }

    return true;
}

module.exports = { onInventoryCommand, onGameObjectCommandOne };
