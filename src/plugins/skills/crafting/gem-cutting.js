// https://classic.runescape.wiki/w/Crafting#Gems
// opal/jade/red topaz can smash on a failed roll -> Crushed Gemstone 915, xp
// 15/20/25; other gems always cut.

const items = require('@2003scape/rsc-data/config/items');
const { cutting } = require('@2003scape/rsc-data/skills/crafting');

const CHISEL_ID = 167;
const CRUSHED_GEMSTONE_ID = 915;
const UNCUT_GEM_IDS = new Set(Object.keys(cutting).map(Number));

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

async function onUseWithInventory(player, item, target) {
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

    player.inventory.remove(uncutID);

    // Semiprecious smash roll (opal / jade / red topaz only).
    const smashXp = GEMS_THAT_FAIL.get(uncutID);

    if (smashXp !== undefined && smashGem(level, craftingLevel)) {
        player.message(
            `You miss hit the chisel and smash the ${items[cutID].name} ` +
                'to pieces!'
        );
        player.inventory.add(CRUSHED_GEMSTONE_ID);
        player.addExperience('crafting', smashXp);

        return true;
    }

    player.inventory.add(cutID);

    // semiprecious names capitalised, others lowercase
    const cutName =
        smashXp !== undefined
            ? items[cutID].name
            : items[cutID].name.toLowerCase();

    player.message(`You cut the ${cutName}`);
    player.sendSound('chisel');
    player.addExperience('crafting', experience);

    return true;
}

module.exports = { onUseWithInventory };
