const items = require('@2003scape/rsc-data/config/items');
const skillCapes = require('./skill-capes');
const { wantBatching } = require('./batch');

// bones: bury, bonecrusher, and prayer-cape-on-bury (wired as skills.prayer).
// bury fires for any "Bury" item except the rashiliya corpse; an unknown
// buriable item digs and buries for no xp.
// batch buries one per matching bone held. bonecrusher resolved by name.
function resolveItemId(name) {
    const target = name.toLowerCase();

    for (const [id, def] of Object.entries(items)) {
        if (def && def.name && def.name.toLowerCase() === target) {
            return Number(id);
        }
    }

    throw new RangeError(`prayer.js: no item named "${name}"`);
}

const BONECRUSHER_ID = resolveItemId('bonecrusher');
const RASHILIYA_CORPSE_ID = 977;

// prayer xp per bone id (factor-2 values, old_pray_xp off)
const BONE_XP = {
    20: 15, // Bones
    604: 18, // Bat bones
    413: 50, // Big bones
    814: 240 // Dragon Bones
};

// prayer points restored per bone id
const BONE_PRAYER_POINTS = {
    20: 1, // Bones
    604: 1, // Bat bones
    413: 2, // Big bones
    814: 4 // Dragon Bones
};

function giveBonesExperience(player, boneId, bonecrusher) {
    const baseXp = BONE_XP[boneId];

    if (typeof baseXp === 'undefined') {
        player.message('Nothing interesting happens');
        return;
    }

    // bonecrusher halves xp again (floor)
    const xpToGive = bonecrusher ? Math.floor(baseXp / 2) : baseXp;
    player.addExperience('prayer', xpToGive);
}

// prayer cape restore: top up prayer points (capped at max) on bury
function prayerCapeRestore(player, boneId) {
    const prayer = player.skills.prayer;

    if (prayer.current >= prayer.base) {
        return;
    }

    const pointsToRestore = BONE_PRAYER_POINTS[boneId];

    if (!pointsToRestore) {
        return;
    }

    prayer.current = Math.min(prayer.current + pointsToRestore, prayer.base);
    player.message(
        `@que@@yel@Your prayer cape activates, restoring ${pointsToRestore} prayer points!`
    );
    player.sendStats();
}

async function buryBones(player, item) {
    const { world } = player;

    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id }) => id === item.id).length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(item.id)) {
            break;
        }

        player.message('@que@you dig a hole in the ground');
        await world.sleepTicks(1);
        player.message('@que@You bury the bones');
        player.inventory.remove(item.id);

        giveBonesExperience(player, item.id, false);

        // prayer cape (100% when worn): restore prayer points after the bury xp
        if (skillCapes.shouldActivate(player, 'prayer')) {
            prayerCapeRestore(player, item.id);
        }
    }
}

async function onInventoryCommand(player, item) {
    if (
        !/bury/i.test(item.definition.command) ||
        item.id === RASHILIYA_CORPSE_ID
    ) {
        return false;
    }

    await buryBones(player, item);

    return true;
}

// bonecrusher + bones -> crush for half xp; only the four known bone types
async function onUseWithInventory(player, item, target) {
    let bones;

    if (item.id === BONECRUSHER_ID && BONE_XP.hasOwnProperty(target.id)) {
        bones = target;
    } else if (target.id === BONECRUSHER_ID && BONE_XP.hasOwnProperty(item.id)) {
        bones = item;
    } else {
        return false;
    }

    const { world } = player;

    player.message('@que@You place the bones into the bonecrusher');
    player.inventory.remove(bones.id);
    await world.sleepTicks(3);
    player.message('@que@The gods are angered by your sacrilege');
    giveBonesExperience(player, bones.id, true);

    return true;
}

// recharge at an altar: restore prayer to max. monks altar (200) overcharges +2.
// chaos altar (625 at y 3573) is a trapdoor, drops the player to (608, 3525).
async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.definition.commands[0] !== 'Recharge at') {
        return false;
    }

    const maxPray = player.skills.prayer.base + (gameObject.id === 200 ? 2 : 0);

    if (player.skills.prayer.current === maxPray) {
        player.message('@que@You already have full prayer points');
        player.prayerStatePoints = maxPray * 120;
    } else {
        player.message('@que@You recharge your prayer points');
        player.sendSound('recharge');

        if (player.skills.prayer.current < maxPray) {
            player.skills.prayer.current = maxPray;
            player.prayerStatePoints = maxPray * 120;
            player.sendStats();
        }
    }

    if (gameObject.id === 625 && gameObject.y === 3573) {
        const { world } = player;

        await world.sleepTicks(1);
        player.message('@que@Suddenly a trapdoor opens beneath you');
        await world.sleepTicks(3);
        player.teleport(608, 3525);
    }

    return true;
}

module.exports = {
    onInventoryCommand,
    onUseWithInventory,
    onGameObjectCommandOne
};
