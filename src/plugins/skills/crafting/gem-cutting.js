// https://classic.runescape.wiki/w/Crafting#Gems
// opal/jade/red topaz can smash on a failed roll -> crushed gemstone 915, xp 15/20/25; other gems always cut
// king black dragon scale + chisel -> 5 chipped dragon scale (crafting 90)

const items = require('@2003scape/rsc-data/config/items');
const { cutting } = require('@2003scape/rsc-data/skills/crafting');
const { wantBatching } = require('../batch');

const CHISEL_ID = 167;
const CRUSHED_GEMSTONE_ID = 915;
const UNCUT_GEM_IDS = new Set(Object.keys(cutting).map(Number));

// resolve a custom-items.json item id by name; -1 if absent
function resolveItemId(name) {
    const target = name.toLowerCase();

    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];

        if (def && def.name && def.name.toLowerCase() === target) {
            return id;
        }
    }

    return -1;
}

const KING_BLACK_DRAGON_SCALE_ID = resolveItemId('king black dragon scale');
const CHIPPED_DRAGON_SCALE_ID = resolveItemId('chipped dragon scale');
const KBD_SCALE_CRAFTING_LEVEL = 90;
const KBD_SCALE_CHIP_AMOUNT = 5;
const KBD_SCALE_CHIP_XP = 430 * 2; // game_tick 430 * 2 = 860

// gems that can smash: uncut id -> fail-xp
const GEMS_THAT_FAIL = new Map([
    [889, 25], // Uncut Red Topaz -> Red Topaz (892)
    [890, 20], // Uncut Jade -> Jade (893)
    [891, 15] // Uncut Opal -> Opal (894)
]);

// random int in [low, high]
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// production success roll (threshold capped at 256)
function calcProductionSuccessfulLegacy(levelReq, skillLevel, levelStopFail) {
    const roll = random(1, 256);

    if (skillLevel < levelReq) {
        return false;
    }

    const threshold = Math.min(
        256,
        Math.floor(64 + (skillLevel - 1) * (19200.0 / (levelStopFail * 98)))
    );

    return roll <= threshold;
}

// smash on a failed production roll (stop-fail at reqLevel + 89)
function smashGem(reqLevel, craftingLevel) {
    const levelStopFail = reqLevel + 89;
    return !calcProductionSuccessfulLegacy(reqLevel, craftingLevel, levelStopFail);
}

// chisel + king black dragon scale -> 5x chipped dragon scale
function chipKingBlackDragonScale(player) {
    if (KING_BLACK_DRAGON_SCALE_ID === -1 || CHIPPED_DRAGON_SCALE_ID === -1) {
        // custom-items.json is missing one of these; nothing to give
        return false;
    }

    if (player.skills.crafting.current < KBD_SCALE_CRAFTING_LEVEL) {
        player.message('You need 90 crafting to split the scales');
        return true;
    }

    if (player.inventory.has(KING_BLACK_DRAGON_SCALE_ID)) {
        player.inventory.remove(KING_BLACK_DRAGON_SCALE_ID);
        player.message('You chip the massive scale into 5 pieces');
        player.inventory.add(CHIPPED_DRAGON_SCALE_ID, KBD_SCALE_CHIP_AMOUNT);
        player.addExperience('crafting', KBD_SCALE_CHIP_XP);
    }

    return true;
}

async function onUseWithInventory(player, item, target) {
    if (
        (item.id === CHISEL_ID && target.id === KING_BLACK_DRAGON_SCALE_ID) ||
        (target.id === CHISEL_ID && item.id === KING_BLACK_DRAGON_SCALE_ID)
    ) {
        return chipKingBlackDragonScale(player);
    }

    if (
        (item.id !== CHISEL_ID || !UNCUT_GEM_IDS.has(target.id)) &&
        (!UNCUT_GEM_IDS.has(item.id) || target.id !== CHISEL_ID)
    ) {
        return false;
    }

    const craftingLevel = player.skills.crafting.current;
    const uncutID = item.id === CHISEL_ID ? target.id : item.id;
    const { level, experience, id: cutID, alias } = cutting[uncutID];

    if (craftingLevel < level) {
        const gemName = alias || items[cutID].name;

        player.message(
            `@que@you need a crafting level of ${level} to cut ${gemName}`
        );

        return true;
    }

    const { world } = player;

    // semiprecious smash roll (opal / jade / red topaz only)
    const smashXp = GEMS_THAT_FAIL.get(uncutID);

    // repeat = count of that uncut gem held, else 1
    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id }) => id === uncutID).length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(uncutID)) {
            break;
        }

        // re-checked every iteration; a long batch can run the player out of steam
        if (player.isTired()) {
            player.message('You are too tired to craft');
            return true;
        }

        player.inventory.remove(uncutID);

        if (smashXp !== undefined && smashGem(level, craftingLevel)) {
            player.message(
                `You miss hit the chisel and smash the ${items[cutID].name} ` +
                    'to pieces!'
            );
            player.inventory.add(CRUSHED_GEMSTONE_ID);
            player.addExperience('crafting', smashXp);
        } else {
            player.inventory.add(cutID);

            // print the definition name as-is, never lowercased
            player.message(`You cut the ${items[cutID].name}`);
            player.sendSound('chisel');
            player.addExperience('crafting', experience);
        }

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithInventory };
