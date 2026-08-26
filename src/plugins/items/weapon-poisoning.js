// combine weapon poison with a weapon/ammo item

const items = require('@2003scape/rsc-data/config/items');

const WEAPON_POISON_ID = 572;

// [baseID, poisonedID]
const POISON_PAIRS = [
    // daggers (559-565)
    [28, 559], // Iron dagger
    [62, 560], // bronze dagger
    [63, 561], // Steel dagger
    [64, 562], // Mithril dagger
    [396, 563], // rune dagger
    [65, 564], // Adamantite dagger
    [423, 565], // Black dagger
    // arrows/bolts (574+)
    [11, 574], // Bronze Arrows
    [190, 592], // Crossbow bolts
    [638, 639], // Iron Arrows
    [640, 641], // Steel Arrows
    [642, 643], // Mithril Arrows
    [644, 645], // Adamantite Arrows
    [646, 647], // Rune Arrows
    // throwing darts (1122-1127)
    [1013, 1122], // Bronze Throwing Dart
    [1015, 1123], // Iron Throwing Dart
    [1024, 1124], // Steel Throwing Dart
    [1068, 1125], // Mithril Throwing Dart
    [1069, 1126], // Adamantite Throwing Dart
    [1070, 1127], // Rune Throwing Dart
    // throwing knives (1128-1134)
    [1076, 1128], // Bronze throwing knife
    [1075, 1129], // Iron throwing knife
    [1077, 1130], // Steel throwing knife
    [1078, 1131], // Mithril throwing knife
    [1081, 1132], // Black throwing knife
    [1079, 1133], // Adamantite throwing knife
    [1080, 1134], // Rune throwing knife
    // spears (1135-1140)
    [827, 1135], // Bronze Spear
    [1088, 1136], // Iron Spear
    [1089, 1137], // Steel Spear
    [1090, 1138], // Mithril Spear
    [1091, 1139], // Adamantite Spear
    [1092, 1140] // Rune Spear
];

// base id -> poisoned id, filtered to ids present in rsc-data
const POISON_MAP = new Map();

for (const [baseID, poisonedID] of POISON_PAIRS) {
    if (!items[baseID] || !items[poisonedID]) {
        console.warn(
            `[weapon-poisoning] skipping pair (base ${baseID}, poisoned ` +
                `${poisonedID}): missing item definition in rsc-data`
        );
        continue;
    }

    POISON_MAP.set(baseID, poisonedID);
}

// item name and max poisoned amount per combine
function buildPoisonMessage(rawItemName, stackable) {
    if (!stackable) {
        return { procItemName: `a ${rawItemName}.`, maxAmount: 1 };
    }

    const maxAmount = rawItemName.includes('dart') ? 6 : 5;
    let suffix;

    if (rawItemName.includes('dart')) {
        suffix = 'darts';
    } else if (rawItemName.includes('bolt')) {
        suffix = 'bolts';
    } else if (rawItemName.includes('arrow')) {
        suffix = 'arrows';
    } else {
        suffix = rawItemName + (rawItemName.endsWith('s') ? '' : 's');
    }

    return { procItemName: `some ${suffix}!`, maxAmount };
}

// stackable items sum amount, non-stackable count rows
function countHeld(player, id) {
    let count = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            count += item.definition.stackable ? item.amount : 1;
        }
    }

    return count;
}

async function onUseWithInventory(player, item, target) {
    let other;

    if (item.id === WEAPON_POISON_ID) {
        other = target;
    } else if (target.id === WEAPON_POISON_ID) {
        other = item;
    } else {
        return false;
    }

    // unmapped item just gets "nothing interesting happens"
    const poisonedID = POISON_MAP.get(other.id);

    if (typeof poisonedID === 'undefined') {
        player.message('Nothing interesting happens');
        return true;
    }

    const rawItemName = other.definition.name.toLowerCase();
    const { procItemName, maxAmount } = buildPoisonMessage(
        rawItemName,
        other.definition.stackable
    );

    const held = countHeld(player, other.id);
    const makeAmount = held >= maxAmount ? maxAmount : held;

    if (makeAmount <= 0) {
        player.message('Nothing interesting happens');
        return true;
    }

    player.inventory.remove(WEAPON_POISON_ID);
    player.inventory.remove(other.id, makeAmount);
    player.message(`You poison ${procItemName}`);
    player.inventory.add(poisonedID, makeAmount);

    return true;
}

module.exports = { onUseWithInventory };
