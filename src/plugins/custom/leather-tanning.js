
const HAMMER_ID = 168;
const KNIFE_ID = 13;
const COW_HIDE_ID = 147;
const LEATHER_ID = 148;

const ANIMAL_FAT_ID = 1540;
const TREATED_HIDE_ID = 1541;

const RAW_BEEF_ID = 504;
const RAW_BEAR_MEAT_ID = 502;
const RAW_RAT_MEAT_ID = 503;

const LEAN_BEEF_ID = 1544;
const LEAN_BEAR_MEAT_ID = 1542;
const LEAN_RAT_MEAT_ID = 1543;

const RAW_MEAT_LIST = [RAW_BEEF_ID, RAW_BEAR_MEAT_ID, RAW_RAT_MEAT_ID];
// RAW_CHICKEN 133 + the three lean meats: "too lean to trim".
const LEAN_MEAT_LIST = [133, LEAN_BEEF_ID, LEAN_BEAR_MEAT_ID, LEAN_RAT_MEAT_ID];

const FURNACE_IDS = new Set([118, 444, 813, 1146]);
const RANGE_IDS = new Set([11, 435, 491, 119]);
const FIRE_IDS = new Set([97, 274]);

function wantCustomLeather(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    // default ON (Cabbage enables it) unless a world disables it.
    return !config || config.wantCustomLeather !== false;
}

function has(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

function count(player, id) {
    return player.inventory.items
        .filter((item) => item.id === id)
        .reduce((n, item) => n + (item.amount || 1), 0);
}


function makeTreatedHide(player, hideId) {
    if (hideId !== COW_HIDE_ID) {
        player.message('Nothing interesting happens');
        return;
    }
    if (count(player, ANIMAL_FAT_ID) < 1) {
        player.message('You need some animal fat to treat the hide');
        return;
    }
    player.inventory.remove(COW_HIDE_ID);
    player.message('You beat the animal fat into the hide');
    player.inventory.add(TREATED_HIDE_ID, 1);
    player.inventory.remove(ANIMAL_FAT_ID);
    player.addExperience('crafting', 10);
}

function trimFatOffMeat(player, meatId) {
    let leanId;
    if (meatId === RAW_BEEF_ID) {
        leanId = LEAN_BEEF_ID;
    } else if (meatId === RAW_BEAR_MEAT_ID) {
        leanId = LEAN_BEAR_MEAT_ID;
    } else if (meatId === RAW_RAT_MEAT_ID) {
        leanId = LEAN_RAT_MEAT_ID;
    } else {
        return;
    }
    player.inventory.remove(meatId);
    player.message('You carefully trim the fat off the meat');
    player.inventory.add(ANIMAL_FAT_ID, 1);
    player.inventory.add(leanId, 1);
}

function trimFatOffLeanMeat(player) {
    player.message('This meat is too lean to trim any fat off');
}


async function onUseWithInventory(player, item1, item2) {
    if (!wantCustomLeather(player)) {
        return false;
    }

    const id1 = item1.id;
    const id2 = item2.id;
    const hasHammer = has(player, HAMMER_ID);

    if (id1 === HAMMER_ID && id2 === COW_HIDE_ID) {
        makeTreatedHide(player, id2);
    } else if (id2 === HAMMER_ID && id1 === COW_HIDE_ID) {
        makeTreatedHide(player, id1);
    } else if (id1 === KNIFE_ID && RAW_MEAT_LIST.indexOf(id2) !== -1) {
        trimFatOffMeat(player, id2);
    } else if (id2 === KNIFE_ID && RAW_MEAT_LIST.indexOf(id1) !== -1) {
        trimFatOffMeat(player, id1);
    } else if (id1 === KNIFE_ID && LEAN_MEAT_LIST.indexOf(id2) !== -1) {
        trimFatOffLeanMeat(player);
    } else if (id2 === KNIFE_ID && LEAN_MEAT_LIST.indexOf(id1) !== -1) {
        trimFatOffLeanMeat(player);
    } else if (id1 === ANIMAL_FAT_ID && id2 === COW_HIDE_ID && hasHammer) {
        makeTreatedHide(player, id2);
    } else if (id2 === ANIMAL_FAT_ID && id1 === COW_HIDE_ID && hasHammer) {
        makeTreatedHide(player, id1);
    } else if (id1 === ANIMAL_FAT_ID && id2 === COW_HIDE_ID && !hasHammer) {
        player.message('you need a hammer to do that');
    } else if (id2 === ANIMAL_FAT_ID && id1 === COW_HIDE_ID && !hasHammer) {
        player.message('you need a hammer to do that');
    } else if (id1 === HAMMER_ID && id2 === ANIMAL_FAT_ID) {
        player.inventory.remove(ANIMAL_FAT_ID);
        player.message('you smash the animal fat, sending it everywhere. yuck');
    } else if (id2 === HAMMER_ID && id1 === ANIMAL_FAT_ID) {
        player.inventory.remove(ANIMAL_FAT_ID);
        player.message('you smash the animal fat, sending it everywhere. yuck');
    } else {
        return false;
    }

    return true;
}


async function onUseWithGameObject(player, gameObject, item) {
    if (!wantCustomLeather(player)) {
        return false;
    }

    if (item.id !== TREATED_HIDE_ID) {
        return false;
    }

    if (FURNACE_IDS.has(gameObject.id)) {
        player.message('the furnace is too hot and will damage the hide');
        player.message('a fire would be best to dry it');
        return true;
    }

    if (RANGE_IDS.has(gameObject.id)) {
        player.message('the range is too hot and will damage the hide');
        player.message('a fire would be best to dry it');
        return true;
    }

    if (!FIRE_IDS.has(gameObject.id)) {
        return false;
    }

    // Fire path: dry the treated hide into leather.
    if (!has(player, TREATED_HIDE_ID)) {
        return true;
    }
    if (player.isTired()) {
        player.message('You are too tired to craft');
        return true;
    }

    player.sendBubble(TREATED_HIDE_ID);
    player.inventory.remove(TREATED_HIDE_ID);
    player.message('You let the treated hide dry in the fire');
    await player.world.sleepTicks(3);
    player.inventory.add(LEATHER_ID, 1);
    player.addExperience('crafting', 25);
    return true;
}

module.exports = { onUseWithInventory, onUseWithGameObject };
