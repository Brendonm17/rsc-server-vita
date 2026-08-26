
const items = require('@2003scape/rsc-data/config/items');

// resolves each cape id by name from the merged item table, cached
let CAPE_IDS = null;

function resolveCapeIds() {
    if (CAPE_IDS) {
        return CAPE_IDS;
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

    CAPE_IDS = {
        attack: nameToId['attack cape'],
        strength: nameToId['strength cape'],
        defense: nameToId['defense cape'],
        hits: nameToId['hits cape'],
        ranged: nameToId['ranged cape'],
        prayer: nameToId['prayer cape'],
        magic: nameToId['magic cape'],
        cooking: nameToId['cooking cape'],
        woodcutting: nameToId['woodcutting cape'],
        fletching: nameToId['fletching cape'],
        fishing: nameToId['fishing cape'],
        firemaking: nameToId['firemaking cape'],
        crafting: nameToId['crafting cape'],
        smithing: nameToId['smithing cape'],
        mining: nameToId['mining cape'],
        herblaw: nameToId['herblaw cape'],
        agility: nameToId['agility cape'],
        thieving: nameToId['thieving cape'],
        harvesting: nameToId['harvesting cape']
    };

    return CAPE_IDS;
}

// config gate: wantSkillcapePerks, defaults on
function perksEnabled(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantSkillcapePerks !== false;
}

// is this cape currently worn
function wearingCape(player, capeId) {
    return (
        typeof capeId === 'number' && player.inventory.isEquipped(capeId)
    );
}

// SkillCapes.rand1to100: (int)(random.nextDouble() * 99) + 1  ->  1..100
function rand1to100() {
    return Math.floor(Math.random() * 99) + 1;
}

// config gate + worn check + the cape's roll
function shouldActivate(player, skill) {
    if (!perksEnabled(player)) {
        return false;
    }

    const capeId = resolveCapeIds()[skill];

    if (!wearingCape(player, capeId)) {
        return false;
    }

    switch (skill) {
        case 'mining':
            // SkillCapes.miningCape: 8% -> obtain two ore.
            return rand1to100() <= 8;
        case 'fletching':
            // SkillCapes.fletchingCape: 20% -> double output (arrowheads/bolts).
            return rand1to100() <= 20;
        case 'magic':
            // SkillCapes.magicCape: 10% -> cast without using any runes.
            return rand1to100() <= 10;
        case 'smithing':
            // SkillCapes.smithingCape: 25% -> half the coal when smelting.
            return rand1to100() <= 25;
        case 'defense':
            // SkillCapes.defenseCape: 35% -> halve incoming damage.
            return rand1to100() <= 35;
        case 'herblaw':
            // SkillCapes.herblawCape: 10% -> save the ingredient.
            return rand1to100() <= 10;
        case 'prayer':
            // SkillCapes.prayerCape: 100% -> always restore prayer on bury.
            return rand1to100() <= 100;
        case 'woodcutting':
            // SkillCapes.woodcuttingCape: 35% -> tree does not fall.
            return rand1to100() <= 35;
        case 'ranged':
            // SkillCapes.rangedCape: 10% -> double shot.
            return rand1to100() <= 10;
        case 'harvesting':
            // SkillCapes.harvestingCape: 20% -> double produce.
            return rand1to100() <= 20;
        case 'firemaking':
            // firemaking cape is always active when worn
            return true;
        default:
            return false;
    }
}

// parameterised rolls for attack/thieving/strength capes
function shouldActivateParam(player, skill, parameter) {
    if (!perksEnabled(player)) {
        return false;
    }

    const capeId = resolveCapeIds()[skill];

    if (!wearingCape(player, capeId)) {
        return false;
    }

    switch (skill) {
        case 'thieving':
            // SkillCapes.thievingCape(succeededPickpocket)
            if (!parameter && rand1to100() <= 15) {
                return true;
            }
            return false;
        case 'attack':
            // SkillCapes.attackCape(isHit)
            if (!parameter && rand1to100() <= 35) {
                return true;
            }
            return false;
        case 'strength':
            // SkillCapes.strengthCape(isHit)
            if (rand1to100() <= 35 && parameter) {
                return true;
            }
            return false;
        default:
            return false;
    }
}

// extra healing tier from a random roll
function shouldActivateInt(player, skill) {
    if (!perksEnabled(player)) {
        return -1;
    }

    const capeId = resolveCapeIds()[skill];

    if (!wearingCape(player, capeId)) {
        return -1;
    }

    if (skill === 'hits') {
        const rand = rand1to100();

        if (rand >= 75) {
            return 3;
        } else if (rand >= 50) {
            return 2;
        } else if (rand >= 25) {
            return 1;
        }

        return 0;
    }

    return -1;
}

// perks checked via a direct worn check, not a roll

// worn agility cape guarantees shortcut success
function wearingAgilityCape(player) {
    if (!perksEnabled(player)) {
        return false;
    }

    return wearingCape(player, resolveCapeIds().agility);
}

// cooking cape cuts cook time by 0.7, truncated
function wearingCookingCape(player) {
    if (!perksEnabled(player)) {
        return false;
    }

    return wearingCape(player, resolveCapeIds().cooking);
}

module.exports = {
    shouldActivate,
    shouldActivateParam,
    shouldActivateInt,
    wearingAgilityCape,
    wearingCookingCape,
    resolveCapeIds
};
