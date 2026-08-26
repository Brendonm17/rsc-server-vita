
const items = require('@2003scape/rsc-data/config/items');
const rangedData = require('@2003scape/rsc-data/ranged');

const { weapons: rangedWeapons } = rangedData;

// resolve item id by exact case-insensitive name
function findItemIdByName(name) {
    const wanted = name.toLowerCase();

    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];

        if (def && def.name && def.name.toLowerCase() === wanted) {
            return id;
        }
    }

    throw new RangeError(`thrown-weapons: could not resolve item "${name}"`);
}

// throwing-item aim/power table, keyed by name
const THROWING_TABLE = [
    // darts
    ['Bronze Throwing Dart', 25, 15],
    ['Poisoned Bronze Throwing Dart', 25, 15],
    ['Iron Throwing Dart', 30, 17],
    ['Poisoned Iron Throwing Dart', 30, 17],
    ['Steel Throwing Dart', 35, 22],
    ['Poisoned Steel Throwing Dart', 35, 22],
    // dart aim +5 per tier: 25/30/35/40/45/50 bronze to rune
    ['Mithril Throwing Dart', 40, 25],
    ['Poisoned Mithril Throwing Dart', 40, 25],
    ['Adamantite Throwing Dart', 45, 27],
    ['Poisoned Adamantite Throwing Dart', 45, 27],
    ['Rune Throwing Dart', 50, 30],
    ['Poisoned Rune Throwing Dart', 50, 30],

    // throwing knives
    ['Bronze throwing knife', 30, 25],
    ['Poisoned Bronze throwing knife', 30, 25],
    ['Iron throwing knife', 35, 30],
    ['Poisoned Iron throwing knife', 35, 30],
    ['Steel throwing knife', 40, 35],
    ['Poisoned Steel throwing knife', 40, 35],
    ['Black throwing knife', 40, 35],
    ['Poisoned Black throwing knife', 40, 35],
    ['Mithril throwing knife', 45, 40],
    ['Poisoned Mithril throwing knife', 45, 40],
    ['Adamantite throwing knife', 50, 45],
    ['Poisoned Adamantite throwing knife', 50, 45],
    ['Rune throwing knife', 55, 50],
    ['Poisoned Rune throwing knife', 55, 50],

    // spears
    ['Bronze Spear', 25, 29],
    ['Poisoned Bronze Spear', 25, 29],
    ['Iron Spear', 33, 37],
    ['Poisoned Iron Spear', 33, 37],
    ['Steel Spear', 41, 46],
    ['Poisoned Steel Spear', 41, 46],
    ['Mithril Spear', 49, 53],
    ['Poisoned Mithril Spear', 49, 53],
    ['Adamantite Spear', 57, 61],
    ['Poisoned Adamantite Spear', 57, 61],
    ['Rune Spear', 65, 69]
];

// ids using canReach radius 4 instead of the default 3
const DART_NAMES = [
    'Bronze Throwing Dart',
    'Poisoned Bronze Throwing Dart',
    'Iron Throwing Dart',
    'Poisoned Iron Throwing Dart',
    'Steel Throwing Dart',
    'Poisoned Steel Throwing Dart',
    'Mithril Throwing Dart',
    'Poisoned Mithril Throwing Dart',
    'Adamantite Throwing Dart',
    'Poisoned Adamantite Throwing Dart',
    'Rune Throwing Dart',
    'Poisoned Rune Throwing Dart'
];

// Default (non-dart) canReach() radius vs. the dart-specific radius.
const DEFAULT_THROW_RADIUS = 3;
const DART_THROW_RADIUS = 4;

const THROWN_WEAPON_IDS = new Set();
const THROW_RADIUS_BY_ID = new Map();

if (!rangedWeapons.__thrownWeaponsInjected) {
    for (const [name, accuracy, power] of THROWING_TABLE) {
        const id = findItemIdByName(name);

        rangedWeapons[id] = { accuracy, ammunition: [id], range: 3 };
        rangedData.ammunition[id] = power;

        THROWN_WEAPON_IDS.add(id);
    }

    for (const name of DART_NAMES) {
        THROW_RADIUS_BY_ID.set(findItemIdByName(name), DART_THROW_RADIUS);
    }

    Object.defineProperty(rangedWeapons, '__thrownWeaponsInjected', {
        value: true,
        enumerable: false
    });
} else {
    for (const [name] of THROWING_TABLE) {
        THROWN_WEAPON_IDS.add(findItemIdByName(name));
    }

    for (const name of DART_NAMES) {
        THROW_RADIUS_BY_ID.set(findItemIdByName(name), DART_THROW_RADIUS);
    }
}

// ThrowingEvent.canReach(): radius 3, or 4 for darts.
function getThrowRadius(itemID) {
    return THROW_RADIUS_BY_ID.get(itemID) || DEFAULT_THROW_RADIUS;
}

function isThrownWeapon(itemID) {
    return THROWN_WEAPON_IDS.has(itemID);
}

module.exports = {
    isThrownWeapon,
    getThrowRadius,
    THROWN_WEAPON_IDS
};
