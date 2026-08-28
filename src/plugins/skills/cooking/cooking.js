// https://classic.runescape.wiki/w/Cooking

// using items on ranges or fires

const { rollSkillSuccess } = require('../../../rolls');
const { uncooked } = require('@2003scape/rsc-data/skills/cooking');
const { getBatchCount } = require('../batch');
const skillCapes = require('../skill-capes');

const CAKE_TIN_ID = 338;
const COOKS_RANGE_ID = 119;
const FIRE_IDS = new Set([97, 274]);
const RANGE_IDS = new Set([11, 491]);

const COOKS_RANGE_BONUS = 1.05;
const FIRE_PENALTY = 0.95;

// Gauntlets of Cooking
const GAUNTLETS_OF_COOKING_ID = 700;
const FAMCREST_GAUNTLETS_COOKING = 2; // COOKING gauntlet type
const RAW_SWORDFISH_ID = 369;
const RAW_LOBSTER_ID = 372;
const RAW_SHARK_ID = 545;

function cookingGauntletBonus(player, itemId) {
    const wearingGauntlets =
        player.inventory.isEquipped(GAUNTLETS_OF_COOKING_ID) &&
        player.cache.famcrest_gauntlets === FAMCREST_GAUNTLETS_COOKING;

    if (!wearingGauntlets) {
        return 0;
    }

    if (itemId === RAW_SWORDFISH_ID) {
        return 6;
    }

    if (itemId === RAW_LOBSTER_ID || itemId === RAW_SHARK_ID) {
        return 11;
    }

    return 0;
}

function getDefinition(id) {
    const definition = uncooked[id];

    if (definition.reference) {
        return getDefinition(definition.reference);
    }

    return definition;
}

function isMeat(item) {
    return item.definition.sprite === 60;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!uncooked.hasOwnProperty(item.id)) {
        return false;
    }

    let isRange;
    let isCooksRange = false;

    if (FIRE_IDS.has(gameObject.id)) {
        isRange = false;
    } else if (RANGE_IDS.has(gameObject.id)) {
        isRange = true;
    } else if (gameObject.id === COOKS_RANGE_ID) {
        if (player.questStages.cooksAssistant !== -1) {
            return false;
        }

        isRange = true;
        isCooksRange = true;
    } else {
        return false;
    }

    const cookingLevel = player.skills.cooking.current;

    const {
        level,
        experience,
        cooked: cookedID,
        burnt: burntID,
        roll,
        range: needsRange
    } = getDefinition(item.id);

    let cookedName = item.definition.name
        .toLowerCase()
        .replace('raw ', '')
        .replace('uncooked ', '');

    if (cookingLevel < level) {
        player.message(
            `@que@You need a cooking level of ${level} to cook ${cookedName}`
        );

        return true;
    }

    let cookTicks = 3;

    if (needsRange) {
        cookTicks += 2;

        if (!isRange) {
            player.message('@que@You need a proper oven to cook this');
            return true;
        }
    }

    // cooking cape: cook time *0.7
    if (skillCapes.wearingCookingCape(player)) {
        cookTicks = Math.trunc(cookTicks * 0.7);
    }

    if (isMeat(item)) {
        cookedName = 'meat';
    }

    let displayName = cookedName;

    if (/pie/.test(displayName)) {
        displayName = 'pie';
    }

    const { world } = player;

    // still a fire/range at the object's tile?
    const cookObjectStillThere = () => {
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

    const repeat = getBatchCount(player, 'cooking');

    for (let i = 0; i < repeat; i += 1) {
        // no more of this raw food -> stop the batch
        if (!player.inventory.has(item.id)) {
            return true;
        }

        // fire/range gone -> stop
        if (!cookObjectStillThere()) {
            return true;
        }

        if (needsRange) {
            player.message(`You cook the ${cookedName} in the oven...`);
        } else {
            const rangeName = /stew/.test(cookedName) ? 'range' : 'stove';

            const ellipsis = /(meat|stew)/.test(cookedName) ? '...' : '';

            player.message(
                `You cook the ${cookedName} on the ` +
                    `${isRange ? rangeName : 'fire'}${ellipsis}`
            );
        }

        player.sendBubble(item.id);

        if (player.isTired()) {
            player.message('You are too tired to cook this food');
            return true;
        }

        player.sendSound('cooking');
        await world.sleepTicks(cookTicks);

        player.inventory.remove(item.id);

        let lowRoll = roll[0];

        if (!isRange) {
            lowRoll *= FIRE_PENALTY;
        } else if (isCooksRange) {
            lowRoll *= COOKS_RANGE_BONUS;
        }

        // gauntlets of cooking: level bump for swordfish/lobster/shark only
        const gauntletCookingLevel =
            cookingLevel + cookingGauntletBonus(player, item.id);

        let cookSuccess = rollSkillSuccess(lowRoll, roll[1], gauntletCookingLevel);

        // tutorial range forces burn at stage 25, cook at stage 30
        let tutorialAdvance = null;
        if (
            gameObject.id === 491 &&
            item.id === 503 &&
            typeof player.cache.tutorialStage === 'number'
        ) {
            if (player.cache.tutorialStage === 25) {
                cookSuccess = false;
                tutorialAdvance = 30;
            } else if (player.cache.tutorialStage === 30) {
                cookSuccess = true;
                tutorialAdvance = 31;
            }
        }

        if (/cake/.test(cookedName)) {
            player.inventory.add(CAKE_TIN_ID);
        }

        if (tutorialAdvance !== null) {
            player.cache.tutorialStage = tutorialAdvance;
        }

        if (cookSuccess) {
            player.inventory.add(cookedID);
            player.addExperience('cooking', experience);

            if (needsRange) {
                player.message(`You remove the ${displayName} from the oven`);
            } else {
                player.message(`The ${displayName} is now nicely cooked`);
            }
        } else {
            player.inventory.add(burntID);
            player.message(`@que@You accidentially burn the ${displayName}`);
        }
    }

    return true;
}

module.exports = { onUseWithGameObject };
