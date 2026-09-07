// right-click the fishing cape: spend a stored charge to teleport to the fishing guild
// feed raw sharks (via use-on-cape) to store charges, up to 10

const items = require('@2003scape/rsc-data/config/items');
const regions = require('@2003scape/rsc-data/regions');
const { wildernessLevel } = require('../skills/magic');
const { resolveCapeIds } = require('../skills/skill-capes');

const MAX_CHARGES = 10;
const CACHE_KEY = 'fishing_cape_charges';

const ANA_IN_A_BARREL_ID = 1039;
const PLAGUE_SAMPLE_ID = 812;
const KARAMJA_RUM_ID = 318;
const FISHING_GUILD = { x: 586, y: 522 };

const karamja = regions.karamja;

function inKaramja(player) {
    return (
        player.x >= karamja.minX &&
        player.x <= karamja.maxX &&
        player.y >= karamja.minY &&
        player.y <= karamja.maxY
    );
}

let RAW_SHARK_ID = null;
function rawSharkId() {
    if (RAW_SHARK_ID === null) {
        RAW_SHARK_ID = items.findIndex(
            (def) => def && def.name && def.name.toLowerCase() === 'raw shark'
        );
    }
    return RAW_SHARK_ID;
}

function getCharges(player) {
    if (typeof player.cache[CACHE_KEY] !== 'number') {
        // first use grants a full cape
        player.cache[CACHE_KEY] = MAX_CHARGES;
    }
    return player.cache[CACHE_KEY];
}

async function onInventoryCommand(player, item) {
    const capeId = resolveCapeIds().fishing;

    if (typeof capeId !== 'number' || item.id !== capeId) {
        return false;
    }

    const { world } = player;

    player.message('@que@@dcy@You think deeply of your experiences with the fish...');
    await world.sleepTicks(3);

    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        player.message('@que@@yel@Ana: stop thinking about fish!!!!');
        await world.sleepTicks(3);
        player.message("@que@It's too difficult to concentrate on fish rn lol");
        return true;
    }

    if (wildernessLevel(player.x, player.y, world.planeElevation) >= 30) {
        player.message('A mysterious force blocks your teleport!');
        player.message("You can't use this teleport after level 30 wilderness");
        return true;
    }

    let charges = getCharges(player);

    if (charges < 1) {
        player.message(
            "You can't seem to concentrate enough on fish for anything to happen..."
        );
        player.message(
            'Maybe if you stored some sharks in your cape, your bond with the fish would be stronger...'
        );
        return true;
    }

    if (inKaramja(player) && player.inventory.has(KARAMJA_RUM_ID)) {
        player.inventory.remove(KARAMJA_RUM_ID);
    }

    if (player.inventory.has(PLAGUE_SAMPLE_ID)) {
        player.message('the plague sample is too delicate...');
        player.message('it disintegrates in the crossing');

        while (player.inventory.has(PLAGUE_SAMPLE_ID)) {
            player.inventory.remove(PLAGUE_SAMPLE_ID);
        }
    }

    charges -= 1;
    player.cache[CACHE_KEY] = charges;

    if (charges > 0) {
        player.message(
            `@que@one of the sharks falls out of your cape, but there's still ${charges} left.`
        );
    } else {
        player.message('@que@one of the sharks falls out of your cape');
    }

    await world.sleepTicks(3);
    player.teleport(FISHING_GUILD.x, FISHING_GUILD.y, true);

    if (charges === 0) {
        player.message('@que@@red@Ah!! that was the last shark!!');
    } else {
        player.message('@que@@dcy@so many fish...');
    }

    return true;
}

async function onUseWithInventory(player, item, target) {
    const capeId = resolveCapeIds().fishing;
    const sharkId = rawSharkId();

    if (typeof capeId !== 'number' || sharkId === -1) {
        return false;
    }

    const isCapePair =
        (item.id === capeId && target.id === sharkId) ||
        (target.id === capeId && item.id === sharkId);

    if (!isCapePair) {
        return false;
    }

    let charges = getCharges(player);

    if (charges >= MAX_CHARGES) {
        player.message('Your cape is already fully charged.');
        return true;
    }

    const maxSharks = player.inventory.items
        .filter((it) => it.id === sharkId)
        .reduce((n, it) => n + (it.amount || 1), 0);

    if (maxSharks <= 0) {
        return true;
    }

    let sharks = 0;
    while (sharks + charges < MAX_CHARGES && sharks < maxSharks) {
        if (!player.inventory.has(sharkId)) {
            break;
        }
        player.inventory.remove(sharkId, 1);
        sharks += 1;
    }

    // message text branches on sharks held, not on how many actually fit
    if (maxSharks === 1) {
        if (charges > 0) {
            player.message(
                `@que@You add 1 charge to your cape for a total of ${charges + 1} sharks.`
            );
        } else {
            player.message('@que@You now have 1 shark in your cape. Enjoy that.');
        }
    } else {
        if (charges > 0) {
            player.message(
                `@que@You add ${sharks} charges to your cape for a total of ${charges + sharks} sharks.`
            );
        } else {
            player.message(`@que@Your cape now has ${charges + sharks} sharks in it.`);
        }
    }

    player.cache[CACHE_KEY] = charges + sharks;

    return true;
}

module.exports = { onInventoryCommand, onUseWithInventory };
