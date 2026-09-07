// https://classic.runescape.wiki/w/Smithing#Smelting
// one bar per iteration until out of ore, too tired, or away from the furnace.
// goldsmithing gauntlets (699 + famcrest_gauntlets 1) add 45 xp on gold bars.
// perfect gold ore 690 smelts to bar 691 using the gold recipe (level 40, 90 xp).
// lava forge (1284): melt dragon sword 593 (1 bar) or axe 594 (2 bars) to dragon
// bars; needs the dwarf rescue miniquest done and smithing 90.

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

// perfect gold pair: ore 690 -> bar 691, reusing the gold recipe
const PERFECT_GOLD_ORE_ID = 690;
const PERFECT_GOLD_BAR_ID = 691;

// perfect gold uses gold's level and xp (40, 90) and one ore
const PERFECT_GOLD_RECIPE = {
    level: smelting[GOLD_BAR_ID].level,
    experience: smelting[GOLD_BAR_ID].experience,
    ores: [{ id: PERFECT_GOLD_ORE_ID }]
};

// gauntlets of goldsmithing
const GAUNTLETS_OF_GOLDSMITHING_ID = 699;
const FAMCREST_GAUNTLETS_GOLDSMITHING = 1; // goldsmithing type
const GOLDSMITHING_BONUS_XP = 45;

function goldsmithingGauntletBonus(player, resultBarID) {
    // bonus applies to gold 172 and perfect gold 691
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

// perfect gold ore is not in the smelting table, register it explicitly
ORE_IDS.add(PERFECT_GOLD_ORE_ID);

// lava forge constants
const LAVA_FORGE_ID = 1284;
const DWARF_RESCUE_STAGE_KEY = 'miniquest_dwarf_youth_rescue';
const DWARF_RESCUE_COMPLETE_STAGE = 2;
const DRAGON_SWORD_ID = 593;
const DRAGON_AXE_ID = 594;
const LAVA_FORGE_SMITHING_LEVEL = 90;

// resolve a custom-items.json id by name, -1 if absent
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

const DRAGON_BAR_ID = resolveItemId('dragon bar');

// item id -> dragon bars retrieved (sword 1, axe 2)
const LAVA_FORGE_AMOUNTS = { [DRAGON_SWORD_ID]: 1, [DRAGON_AXE_ID]: 2 };

function dwarfRescueStage(player) {
    return typeof player.cache[DWARF_RESCUE_STAGE_KEY] === 'number'
        ? player.cache[DWARF_RESCUE_STAGE_KEY]
        : -1;
}

async function useLavaForge(player, item) {
    if (DRAGON_BAR_ID === -1) {
        // no dragon bar item, recipe can't fire
        return false;
    }

    if (dwarfRescueStage(player) !== DWARF_RESCUE_COMPLETE_STAGE) {
        player.message("You don't have permission to use this");
        return true;
    }

    const amount = LAVA_FORGE_AMOUNTS[item.id];

    if (!amount) {
        player.message('Nothing interesting happens');
        return true;
    }

    if (player.skills.smithing.current < LAVA_FORGE_SMITHING_LEVEL) {
        player.message('90 smithing is required to use this forge');
        return true;
    }

    if (player.inventory.has(item.id)) {
        const itemName = items[item.id].name;

        player.inventory.remove(item.id);
        player.message(`You smelt the ${itemName}...`);
        await player.world.sleepTicks(5);
        player.message(
            `And retrieve ${amount} dragon bar${amount > 1 ? 's' : ''}`
        );
        player.inventory.add(DRAGON_BAR_ID, amount);
    }

    return true;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id === LAVA_FORGE_ID) {
        return await useLavaForge(player, item);
    }

    if (gameObject.id !== FURNACE_ID || !ORE_IDS.has(item.id)) {
        return false;
    }

    let resultBarID = -1;

    // coal on the furnace with iron ore in inventory smelts steel
    if (item.id === COAL_ID) {
        resultBarID = STEEL_BAR_ID;
    } else if (item.id === PERFECT_GOLD_ORE_ID) {
        // perfect gold ore 690 -> perfect gold bar 691
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
            `You need to be at least level-${level} smithing to ` +
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

        // smithing cape (25%): halves the coal used on coal recipes
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
