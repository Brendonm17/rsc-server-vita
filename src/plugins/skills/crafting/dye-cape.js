// https://classic.runescape.wiki/w/Cape

// cape id -> its colour name
const CAPE_COLOR = {
    209: 'black',
    183: 'red',
    229: 'blue',
    512: 'yellow',
    511: 'green',
    513: 'orange',
    514: 'purple'
};

// dye id -> { colour name, destination cape id }
const DYE = {
    238: { color: 'red', capeId: 183 },
    239: { color: 'yellow', capeId: 512 },
    272: { color: 'blue', capeId: 229 },
    282: { color: 'orange', capeId: 513 },
    515: { color: 'green', capeId: 511 },
    516: { color: 'purple', capeId: 514 }
};

const CAPE_IDS = new Set(Object.keys(CAPE_COLOR).map(Number));
const DYE_IDS = new Set(Object.keys(DYE).map(Number));

async function onUseWithInventory(player, item, target) {
    let capeID = -1;
    let dyeID = -1;

    if (CAPE_IDS.has(item.id) && DYE_IDS.has(target.id)) {
        capeID = item.id;
        dyeID = target.id;
    } else if (CAPE_IDS.has(target.id) && DYE_IDS.has(item.id)) {
        capeID = target.id;
        dyeID = item.id;
    }

    if (capeID === -1) {
        return false;
    }

    const dye = DYE[dyeID];

    // a cape can't be dyed its own colour
    if (CAPE_COLOR[capeID] === dye.color) {
        return false;
    }

    player.inventory.remove(capeID);
    player.inventory.remove(dyeID);
    player.inventory.add(dye.capeId);
    player.addExperience('crafting', 10);
    player.message(`You dye the ${CAPE_COLOR[capeID]} cape ${dye.color}`);

    return true;
}

module.exports = { onUseWithInventory };
