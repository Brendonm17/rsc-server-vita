// https://classic.runescape.wiki/w/Smithing#Smelting
// smelting batches: one bar per iteration; goldsmithing gauntlets add 45 xp on gold bars

const items = require('@2003scape/rsc-data/config/items');
const { smelting } = require('@2003scape/rsc-data/skills/smithing');
const { getBatchCount } = require('../batch');
const skillCapes = require('../skill-capes');

const BRONZE_BAR_ID = 169;
const COAL_ID = 155;
const FURNACE_ID = 118;
const GOLD_BAR_ID = 172;
const IRON_BAR_ID = 170;
const IRON_ORE = 151;
const SILVER_BAR_ID = 384;
const STEEL_BAR_ID = 171;

// perfect gold: ore 690 -> bar 691 (reuses gold recipe)
const PERFECT_GOLD_ORE_ID = 690;
const PERFECT_GOLD_BAR_ID = 691;

// perfect gold smelt: gold's level+xp (L40, 90xp), 1 ore
const PERFECT_GOLD_RECIPE = {
    level: smelting[GOLD_BAR_ID].level,
    experience: smelting[GOLD_BAR_ID].experience,
    ores: [{ id: PERFECT_GOLD_ORE_ID }]
};

// Gauntlets of Goldsmithing
const GAUNTLETS_OF_GOLDSMITHING_ID = 699;
const FAMCREST_GAUNTLETS_GOLDSMITHING = 1; // GOLDSMITHING gauntlet type
const GOLDSMITHING_BONUS_XP = 45;

function goldsmithingGauntletBonus(player, resultBarID) {
    // applies to gold (172) and perfect gold (691)
    if (resultBarID !== GOLD_BAR_ID && resultBarID !== PERFECT_GOLD_BAR_ID) {
        return 0;
    }

    const wearingGauntlets =
        player.inventory.isEquipped(GAUNTLETS_OF_GOLDSMITHING_ID) &&
        player.cache.famcrest_gauntlets === FAMCREST_GAUNTLETS_GOLDSMITHING;

    return wearingGauntlets ? GOLDSMITHING_BONUS_XP : 0;
}

const ORE_IDS = new Set();

for (const { ores } of Object.values(smelting)) {
    for (const { id } of ores) {
        ORE_IDS.add(id);
    }
}

// register perfect gold ore explicitly (not in the table)
ORE_IDS.add(PERFECT_GOLD_ORE_ID);

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== FURNACE_ID || !ORE_IDS.has(item.id)) {
        return false;
    }

    let resultBarID = -1;

    // coal + iron ore -> steel
    if (item.id === COAL_ID) {
        resultBarID = STEEL_BAR_ID;
    } else if (item.id === PERFECT_GOLD_ORE_ID) {
        // perfect gold ore (690) -> perfect gold bar (691).
        resultBarID = PERFECT_GOLD_BAR_ID;
    } else {
        barLoop: for (const [barID, { ores }] of Object.entries(smelting)) {
            for (const { id } of ores) {
                if (id === COAL_ID) {
                    continue;
                }

                if (item.id == id) {
                    if (id === IRON_ORE && player.inventory.has(COAL_ID, 2)) {
                        resultBarID = STEEL_BAR_ID;
                    } else {
                        resultBarID = +barID;
                    }

                    break barLoop;
                }
            }
        }
    }

    if (resultBarID === -1) {
        return false;
    }

    const metalName = items[resultBarID].name.toLowerCase().replace(' bar', '');
    const isCraftingBar =
        resultBarID === GOLD_BAR_ID ||
        resultBarID == SILVER_BAR_ID ||
        resultBarID === PERFECT_GOLD_BAR_ID;
    const smithingLevel = player.skills.smithing.current;
    const { level, experience, ores } =
        resultBarID === PERFECT_GOLD_BAR_ID
            ? PERFECT_GOLD_RECIPE
            : smelting[resultBarID];

    player.sendBubble(item.id);

    if (player.isTired()) {
        player.message('You are too tired to smelt this ore');
        return true;
    }

    if (smithingLevel < level) {
        player.message(
            `@que@You need to be at least level-${level} smithing to ` +
                `${isCraftingBar ? 'work' : 'smelt'} ${metalName}`
        );

        if (resultBarID === IRON_BAR_ID) {
            player.message(
                '@que@Practice your smithing using tin and copper to make ' +
                    'bronze'
            );
        }

        return true;
    }

    let missingOreID = -1;
    let missingOreAmount = -1;

    for (const { id, amount } of ores) {
        if (!player.inventory.has(id, amount)) {
            missingOreID = id;
            missingOreAmount = amount;
            break;
        }
    }

    if (missingOreID > -1) {
        const missingOreName = items[missingOreID].name
            .toLowerCase()
            .replace(' ore', '');

        if (resultBarID === BRONZE_BAR_ID) {
            player.message(
                `@que@You also need some ${missingOreName} to make ${metalName}`
            );
        } else if (resultBarID === STEEL_BAR_ID) {
            player.message('@que@You need 1 iron-ore and 2 coal to make steel');
        } else {
            player.message(
                `You need ${missingOreAmount} heaps of ${missingOreName} to ` +
                    `smelt ${metalName}`
            );
        }

        return true;
    }

    const { world } = player;

    let placeMessage;

    if (isCraftingBar) {
        placeMessage = `You place a lump of ${metalName} in the furnace`;
    } else if (resultBarID === IRON_BAR_ID) {
        placeMessage = `You smelt the iron in the furnace`;
    } else if (resultBarID === BRONZE_BAR_ID) {
        placeMessage = 'You smelt the copper and tin in the furnace';
    } else {
        const secondOreAmount = ores[1].amount;
        const secondOreName = items[ores[1].id].name
            .toLowerCase()
            .replace(' ore', '');

        placeMessage =
            `You place the ${metalName} and ${secondOreAmount} heaps of ` +
            `${secondOreName} into the furnace`;
    }

    // still a furnace at the object's tile?
    const furnaceStillThere = () => {
        for (const obj of world.gameObjects.getAtPoint(
            gameObject.x,
            gameObject.y
        )) {
            if (obj.id === gameObject.id) {
                return true;
            }
        }

        return false;
    };

    const repeat = getBatchCount(player, 'smithing');

    for (let i = 0; i < repeat; i += 1) {
        // out of ore for another bar -> stop the batch
        const haveAllOres = ores.every(({ id, amount }) =>
            player.inventory.has(id, amount)
        );

        if (!haveAllOres) {
            return true;
        }

        // furnace gone -> stop
        if (!furnaceStillThere()) {
            return true;
        }

        if (player.isTired()) {
            player.message('You are too tired to smelt this');
            return true;
        }

        // smithing cape (25%): halves coal consumed on coal recipes
        const recipeUsesCoal = ores.some(({ id }) => id === COAL_ID);
        const halveCoal =
            recipeUsesCoal && skillCapes.shouldActivate(player, 'smithing');

        if (halveCoal) {
            player.message(
                'You heat the furnace using half the usual amount of coal'
            );
        }

        for (const ore of ores) {
            if (halveCoal && ore.id === COAL_ID) {
                // floor(amount / 2)
                player.inventory.remove(ore.id, Math.floor(ore.amount / 2));
            } else {
                player.inventory.remove(ore);
            }
        }

        player.message(`@que@${placeMessage}`);
        await world.sleepTicks(3);

        if (resultBarID === IRON_BAR_ID && Math.random() >= 0.5) {
            player.message('The ore is too impure and you fail to refine it');
            continue;
        }

        player.addExperience(
            'smithing',
            experience + goldsmithingGauntletBonus(player, resultBarID)
        );
        player.inventory.add(resultBarID);
        player.message(`@que@You retrive a bar of ${metalName}`);
    }

    return true;
}

module.exports = { onUseWithGameObject };
