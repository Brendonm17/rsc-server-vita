// rub the amulet to teleport: edgeville, karamja, draynor, al kharid

const regions = require('@2003scape/rsc-data/regions');
const { wildernessLevel } = require('../skills/magic');

const DRAGONSTONE_AMULET_ID = 522;
const CHARGED_DRAGONSTONE_AMULET_ID = 597;
const KARAMJA_RUM_ID = 318;
const ANA_IN_A_BARREL_ID = 1039;
const PLAGUE_SAMPLE_ID = 812;

const karamja = regions.karamja;

function inKaramja(player) {
    return (
        player.x >= karamja.minX &&
        player.x <= karamja.maxX &&
        player.y >= karamja.minY &&
        player.y <= karamja.maxY
    );
}

// menu index -> destination
const DESTINATIONS = [
    { name: 'Edgeville', x: 226, y: 447 },
    { name: 'Karamja', x: 360, y: 696 },
    { name: 'Draynor village', x: 214, y: 632 },
    { name: 'Al Kharid', x: 72, y: 696 }
];

const CACHE_KEY = 'charged_ds_amulet';

async function onInventoryCommand(player, item) {
    if (item.id !== CHARGED_DRAGONSTONE_AMULET_ID) {
        return false;
    }

    const { world } = player;

    player.message('You rub the amulet');
    await world.sleepTicks(1);

    player.message('Where would you like to teleport to?');

    const menuOptions = [
        'Edgeville',
        'Karamja',
        'Draynor village',
        'Al Kharid',
        'Nowhere'
    ];

    let choice;

    try {
        choice = await player.ask(menuOptions, false);
    } catch (e) {
        return true;
    }

    if (choice < 0 || choice >= menuOptions.length) {
        return true;
    }

    if (
        wildernessLevel(player.x, player.y, world.planeElevation) >= 30
    ) {
        player.message('A mysterious force blocks your teleport!');
        player.message("You can't use this teleport after level 30 wilderness");
        return true;
    }

    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        player.message("You can't teleport while holding Ana,");
        await world.sleepTicks(3);
        player.message("It's just too difficult to concentrate.");
        await world.sleepTicks(3);
        return true;
    }

    if (choice === 4) {
        // Nowhere
        player.message('Nothing interesting happens');
        return true;
    }

    if (inKaramja(player)) {
        while (player.inventory.has(KARAMJA_RUM_ID)) {
            player.inventory.remove(KARAMJA_RUM_ID);
        }
    }

    if (player.inventory.has(PLAGUE_SAMPLE_ID)) {
        player.message('the plague sample is too delicate...');
        player.message('it disintegrates in the crossing');

        while (player.inventory.has(PLAGUE_SAMPLE_ID)) {
            player.inventory.remove(PLAGUE_SAMPLE_ID);
        }
    }

    const destination = DESTINATIONS[choice];
    player.teleport(destination.x, destination.y, true);

    if (!player.cache.hasOwnProperty(CACHE_KEY)) {
        player.cache[CACHE_KEY] = 1;
        return true;
    }

    const rubCount = player.cache[CACHE_KEY] + 1;

    if (rubCount < 4) {
        player.cache[CACHE_KEY] = rubCount;
        return true;
    }

    delete player.cache[CACHE_KEY];

    // 4th rub: charge spent, amulet reverts to uncharged form
    player.inventory.remove(CHARGED_DRAGONSTONE_AMULET_ID);
    player.inventory.add(DRAGONSTONE_AMULET_ID);

    return true;
}

module.exports = { onInventoryCommand };
