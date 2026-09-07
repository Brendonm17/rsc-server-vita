// https://classic.runescape.wiki/w/Cooking

// using items on ranges or fires
//
// cooking batches over every matching raw item (want_batch_progression); per-item roll/xp/messages unchanged
// gauntlets of cooking add effective levels for swordfish/lobster/shark before the burn roll

const { rollSkillSuccess } = require('../../../rolls');
const { uncooked } = require('@2003scape/rsc-data/skills/cooking');
const { getBatchCount } = require('../batch');
const skillCapes = require('../skill-capes');

const CAKE_TIN_ID = 338;
const COOKS_RANGE_ID = 119;
const FIRE_IDS = new Set([97, 274]);
const RANGE_IDS = new Set([11]);

// tutorial island range: special-cased before the generic path, not in RANGE_IDS
const RANGE_TUTORIAL_ISLAND_ID = 491;
const RAW_RAT_MEAT_ID = 503;
const COOKEDMEAT_ID = 132;
const BURNTMEAT_ID = 134;

// raw oomlie meat always burns cooked directly; needs wrapping into a parcel first
const RAW_OOMLIE_MEAT_ID = 1268;

const COOKS_RANGE_BONUS = 1.05;
const FIRE_PENALTY = 0.95;

// gauntlets of cooking
const GAUNTLETS_OF_COOKING_ID = 700;
const FAMCREST_GAUNTLETS_COOKING = 2; // cooking gauntlet type
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

// tutorial meat branch: only raw rat meat; stage 25 burns (-> 30), stage 30 cooks (-> 31), else burns
async function handleTutorialRangeCook(player, item) {
    if (item.id !== RAW_RAT_MEAT_ID) {
        player.message('Nothing interesting happens');
        return;
    }

    const { world } = player;

    player.sendBubble(item.id);
    player.sendSound('cooking');
    player.message('@que@You cook the meat on the stove...');

    const stage = player.cache.tutorialStage;

    if (stage === 25) {
        player.message('@que@You accidentally burn the meat');
        player.inventory.remove(RAW_RAT_MEAT_ID);
        player.inventory.add(BURNTMEAT_ID);

        await world.sleepTicks(1);
        player.message('@que@sometimes you will burn food');
        await world.sleepTicks(3);
        player.message('@que@As your cooking level increases this will happen less');
        await world.sleepTicks(3);
        player.message('@que@Now speak to the cooking instructor again');
        await world.sleepTicks(3);

        player.cache.tutorialStage = 30;
    } else if (stage === 30) {
        const { experience } = getDefinition(RAW_RAT_MEAT_ID);

        player.message('@que@The meat is now nicely cooked');
        player.message('@que@Now speak to the cooking instructor again');
        await world.sleepTicks(3);

        player.addExperience('cooking', experience);
        player.cache.tutorialStage = 31;
        player.inventory.remove(RAW_RAT_MEAT_ID);
        player.inventory.add(COOKEDMEAT_ID);
    } else {
        player.message('@que@You accidentally burn the meat');
        player.inventory.remove(RAW_RAT_MEAT_ID);
        player.inventory.add(BURNTMEAT_ID);
    }
}

// raw oomlie meat always burns; isFire picks the "fire"/"stove" wording
async function burnRawOomlieMeat(player, isFire) {
    const { world } = player;

    if (isFire) {
        player.message('@que@You cook the meat on the fire...');
    } else {
        player.message('@que@You cook the meat on the stove...');
    }

    await world.sleepTicks(3);
    await world.sleepTicks(2);

    player.inventory.remove(RAW_OOMLIE_MEAT_ID);
    player.inventory.add(BURNTMEAT_ID);

    player.message('@que@This meat is too delicate to cook like this.');
    await world.sleepTicks(2);
    player.message('@que@Perhaps you can wrap something around it to protect it from the heat.');
    await world.sleepTicks(2);
}

async function onUseWithGameObject(player, gameObject, item) {
    // tutorial island range: handled before the uncooked-table gate
    if (gameObject.id === RANGE_TUTORIAL_ISLAND_ID) {
        await handleTutorialRangeCook(player, item);
        return true;
    }

    const isFire = FIRE_IDS.has(gameObject.id);
    const isNormalRange = RANGE_IDS.has(gameObject.id);
    const isCooksRangeObject = gameObject.id === COOKS_RANGE_ID;

    if (item.id === RAW_OOMLIE_MEAT_ID) {
        if (!isFire && !isNormalRange && !isCooksRangeObject) {
            return false;
        }

        if (isCooksRangeObject && player.questStages.cooksAssistant !== -1) {
            return false;
        }

        await burnRawOomlieMeat(player, isFire);
        return true;
    }

    if (!uncooked.hasOwnProperty(item.id)) {
        return false;
    }

    let isRange;
    let isCooksRange = false;

    if (isFire) {
        isRange = false;
    } else if (isNormalRange) {
        isRange = true;
    } else if (isCooksRangeObject) {
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

    // cooking cape: cook time *0.7 (truncated)
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

        const cookSuccess = rollSkillSuccess(lowRoll, roll[1], gauntletCookingLevel);

        if (/cake/.test(cookedName)) {
            player.inventory.add(CAKE_TIN_ID);
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
            player.message(`@que@You accidentally burn the ${displayName}`);
        }
    }

    return true;
}

module.exports = { onUseWithGameObject };
