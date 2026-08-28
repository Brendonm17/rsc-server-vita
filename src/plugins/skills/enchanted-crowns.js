
const items = require('@2003scape/rsc-data/config/items');
const { buryExperience } = require('@2003scape/rsc-data/skills/prayer');
const herblawData = require('@2003scape/rsc-data/skills/herblaw');
const dropDefinitions = require('@2003scape/rsc-data/rolls/drops');

// max charges per crown
const CROWN_USES = {
    dew: 30,
    mimicry: 20,
    artisan: 15,
    items: 10,
    herbalist: 5,
    occult: 5
};

// per-crown reroll percent
const ACTIVATE_PERCENT = {
    dew: 60,
    mimicry: 30,
    artisan: 15,
    items: 8,
    herbalist: 4,
    occult: 4
};

// player.cache key per crown
const CACHE_KEY = {
    dew: 'dewcrown',
    mimicry: 'mimicrycrown',
    artisan: 'artisancrown',
    items: 'itemscrown',
    herbalist: 'herbalistcrown',
    occult: 'occultcrown'
};

// consumable crowns shatter at max charges; herbalist/occult go dormant
const SHATTERS = new Set(['dew', 'mimicry', 'artisan', 'items']);

let CROWN_IDS = null;

// crown ids resolved by name, cached
function resolveCrownIds() {
    if (CROWN_IDS) {
        return CROWN_IDS;
    }

    const nameToId = {};

    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];

        if (def && def.name) {
            const key = def.name.toLowerCase();

            if (!(key in nameToId)) {
                nameToId[key] = id;
            }
        }
    }

    CROWN_IDS = {
        mould: nameToId['crown mould'],
        gold: nameToId['gold crown'],
        sapphire: nameToId['sapphire crown'],
        emerald: nameToId['emerald crown'],
        ruby: nameToId['ruby crown'],
        diamond: nameToId['diamond crown'],
        dragonstone: nameToId['dragonstone crown'],
        dew: nameToId['crown of dew'],
        mimicry: nameToId['crown of mimicry'],
        artisan: nameToId['crown of the artisan'],
        items: nameToId['crown of the items'],
        herbalist: nameToId['crown of the herbalist'],
        occult: nameToId['crown of the occult']
    };

    return CROWN_IDS;
}

// config gate: wantEnchantedCrowns, defaults on
function perksEnabled(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantEnchantedCrowns !== false;
}

function hasCrownEquipped(player, crownKey) {
    const id = resolveCrownIds()[crownKey];

    return typeof id === 'number' && player.inventory.isEquipped(id);
}

// random int 1..100
function rand1to100() {
    return Math.floor(Math.random() * 99) + 1;
}

// crownKey is one of dew/mimicry/artisan/items/herbalist/occult
function shouldActivate(player, crownKey) {
    if (!perksEnabled(player)) {
        return false;
    }

    if (!hasCrownEquipped(player, crownKey)) {
        return false;
    }

    const roll = rand1to100() <= ACTIVATE_PERCENT[crownKey];

    if (!roll) {
        return false;
    }

    // herbalist/occult also require a remaining charge to roll
    if (crownKey === 'herbalist' || crownKey === 'occult') {
        const cacheKey = CACHE_KEY[crownKey];
        const used = player.cache[cacheKey];

        return (
            typeof used === 'number' && CROWN_USES[crownKey] - used > 0
        );
    }

    return true;
}

// consumes a charge; shatters or goes dormant depending on crown
function useCharge(player, crownKey) {
    if (!perksEnabled(player)) {
        return;
    }

    if (!hasCrownEquipped(player, crownKey)) {
        return;
    }

    const cacheKey = CACHE_KEY[crownKey];
    const maxUses = CROWN_USES[crownKey];
    const used = player.cache[cacheKey];

    if (typeof used === 'number') {
        if (used + 1 === maxUses) {
            delete player.cache[cacheKey];

            if (SHATTERS.has(crownKey)) {
                const id = resolveCrownIds()[crownKey];
                player.inventory.remove(id);
            } else {
                player.message('Your crown has used its last charge');
                player.message(
                    'You need to recharge it to continue having its effects'
                );
            }
        } else {
            player.cache[cacheKey] = used + 1;
        }
    } else if (SHATTERS.has(crownKey)) {
        // dew/mimicry/artisan/items: first-ever use starts the counter.
        player.cache[cacheKey] = 1;

        const label = {
            dew: 'dew',
            mimicry: 'mimicry',
            artisan: 'the artisan',
            items: 'the items'
        }[crownKey];

        player.message(`@or1@You start a new crown of ${label}`);
    }
    // an uncharged crown with no cache key silently does nothing
}

// bone tiers by name
const BONE_TIER = {}; // { boneId: 0|1|2 }
for (const idStr of Object.keys(buryExperience)) {
    const id = Number(idStr);
    // bones/bat bones = tier 0, big bones = tier 1, dragon bones = tier 2
    const name = items[id] && items[id].name.toLowerCase();

    if (name === 'big bones') {
        BONE_TIER[id] = 1;
    } else if (name === 'dragon bones') {
        BONE_TIER[id] = 2;
    } else {
        BONE_TIER[id] = 0;
    }
}

// herb tiers by level: tier 0 guam..harralander, tier 1 ranarr..avantoe, tier 2 kwuarm..dwarf weed
const HERB_TIER = {}; // { unidHerbId: 0|1|2 }
for (const { id } of dropDefinitions.herb) {
    const def = herblawData.herbs[id];

    if (!def) {
        continue;
    }

    if (def.level <= 20) {
        HERB_TIER[id] = 0;
    } else if (def.level <= 48) {
        HERB_TIER[id] = 1; // Ranarr(25)/Irit(40)/Avantoe(48)
    } else {
        HERB_TIER[id] = 2; // Kwuarm(54)/Cadantine(65)/Dwarf weed(70)
    }
}

function getBoneTier(boneId) {
    return BONE_TIER[boneId] || 0;
}

function getHerbTier(herbId) {
    return HERB_TIER[herbId] || 0;
}

// 1-indexed bit get/toggle helpers
function isKthBitSet(number, kBit) {
    return ((number >> (kBit - 1)) & 1) > 0;
}

function toggleKthBit(number, kBit) {
    return number ^ (1 << (kBit - 1));
}

// bone bury xp
function giveBonesExperience(player, boneId) {
    const xp = buryExperience[boneId];

    if (typeof xp === 'number') {
        player.addExperience('prayer', xp, true);
    }
}

// herb identify xp
function giveHerbExperience(player, unidHerbId) {
    const def = herblawData.herbs[unidHerbId];

    if (def) {
        player.addExperience('herblaw', def.experience, true);
    }
}

// crown of dew: hopper flour -> dough (configured or random)
const DOUGH_NAMES = ['bread dough', 'pastry dough', 'pizza base', 'uncooked pitta bread'];

function resolveDoughIds() {
    const ids = [];

    for (const name of DOUGH_NAMES) {
        const id = items.findIndex(
            (def) => def && def.name && def.name.toLowerCase() === name
        );
        ids.push(id === -1 ? undefined : id);
    }

    return ids;
}

let DOUGH_IDS = null;

function getDoughId(player) {
    if (!DOUGH_IDS) {
        DOUGH_IDS = resolveDoughIds();
    }

    const choice =
        typeof player.cache.dough_conf === 'number'
            ? player.cache.dough_conf
            : Math.floor(Math.random() * 4);

    return DOUGH_IDS[choice];
}

// check/break/configure ask() menu

const CHARGE_LABEL = {
    dew: 'Crown of Dew',
    mimicry: 'Crown of Mimicry',
    artisan: 'Crown of the Artisan',
    items: 'Crown of the Items',
    herbalist: 'Crown of the Herbalist',
    occult: 'Crown of the Occult'
};

function crownKeyForItemId(id) {
    const ids = resolveCrownIds();

    for (const key of ['dew', 'mimicry', 'artisan', 'items', 'herbalist', 'occult']) {
        if (ids[key] === id) {
            return key;
        }
    }

    return null;
}

async function doCheck(player, crownKey) {
    const maxUses = CROWN_USES[crownKey];
    const used = player.cache[CACHE_KEY[crownKey]];
    let charges;

    if (crownKey === 'herbalist' || crownKey === 'occult') {
        // uncharged (no cache key) displays 0/max.
        charges = typeof used === 'number' ? maxUses - used : 0;
    } else {
        charges = typeof used === 'number' ? maxUses - used : maxUses;
    }

    player.message(
        `Your ${CHARGE_LABEL[crownKey]} has ${charges}/${maxUses} charges remaining.`
    );
}

async function doBreak(player, item, crownKey) {
    player.message(
        `Are you sure you want to break your ${item.definition.name}?`
    );

    const choice = await player.ask(['Yes', 'No'], false);

    if (choice !== 0) {
        return;
    }

    delete player.cache[CACHE_KEY[crownKey]];

    if (SHATTERS.has(crownKey)) {
        player.inventory.remove(item.id);
    } else {
        player.message('The power of the crown prevents you from breaking it');
        player.message('but you manage to clear its charges');
    }
}

// toggle label is the action
function tierActionLabel(label, conf, bit) {
    const isSet = isKthBitSet(conf, bit);
    return `${isSet ? 'keep' : 'destroy'} ${label}`;
}

async function doConfigureTierCrown(player, cacheKey) {
    let conf =
        typeof player.cache[cacheKey] === 'number' ? player.cache[cacheKey] : 7;

    player.message(
        'Select which tiers your crown should keep or destroy when activated'
    );

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const choice = await player.ask(
            [
                tierActionLabel('low tier', conf, 1),
                tierActionLabel('medium tier', conf, 2),
                tierActionLabel('high tier', conf, 3),
                'cancel'
            ],
            false
        );

        if (choice < 0 || choice > 2) {
            break;
        }

        conf = toggleKthBit(conf, choice + 1);
        player.cache[cacheKey] = conf;
    }
}

async function doConfigure(player, crownKey) {
    if (crownKey === 'dew') {
        player.message('Select which dough your crown should make when activated');

        const choice = await player.ask(
            ['bread dough', 'pastry dough', 'pizza dough', 'pitta dough'],
            false
        );

        if (choice < 0 || choice > 3) {
            return;
        }

        player.message('Dough selection set successfully');
        player.cache.dough_conf = choice;
    } else if (crownKey === 'herbalist') {
        await doConfigureTierCrown(player, 'herb_conf');
    } else if (crownKey === 'occult') {
        await doConfigureTierCrown(player, 'bone_conf');
    }
}

async function onInventoryCommand(player, item) {
    const crownKey = crownKeyForItemId(item.id);

    if (!crownKey) {
        return false;
    }

    const options = (item.definition.command || '')
        .split(',')
        .filter(Boolean);

    if (!options.length) {
        return false;
    }

    const choice = await player.ask(options, false);
    const command = options[choice];

    if (!command) {
        return true;
    }

    if (/^check$/i.test(command)) {
        await doCheck(player, crownKey);
    } else if (/^break$/i.test(command)) {
        await doBreak(player, item, crownKey);
    } else if (/^configure$/i.test(command)) {
        await doConfigure(player, crownKey);
    }

    return true;
}

module.exports = {
    CROWN_USES,
    resolveCrownIds,
    perksEnabled,
    shouldActivate,
    useCharge,
    getBoneTier,
    getHerbTier,
    isKthBitSet,
    toggleKthBit,
    giveBonesExperience,
    giveHerbExperience,
    getDoughId,
    onInventoryCommand,
    BONE_TIER,
    HERB_TIER
};
