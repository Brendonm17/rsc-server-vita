// fletching skill: log cutting, bowstringing, feather attaching, arrowheads, with batching

const items = require('@2003scape/rsc-data/config/items');
const { bows, arrows, darts } = require('@2003scape/rsc-data/skills/fletching');
const { getBatchCount } = require('./batch');
const skillCapes = require('./skill-capes');

const KNIFE_ID = 13;
const FEATHER_ID = 381;
const BOW_STRING_ID = 676;
const ARROW_SHAFTS_ID = 280;
const HEADLESS_ARROWS_ID = 637;

// shaft amount and level requirement per log id
const SHAFT_AMOUNT = { 14: 10, 632: 15, 633: 20, 634: 30, 635: 40, 636: 50 };
const SHAFT_LEVEL = { 14: 1, 632: 15, 633: 30, 634: 45, 635: 60, 636: 75 };

// attachFeathers default experience for headless arrows (+4 each).
const HEADLESS_ARROW_EXP = 4;

// dart-tip id maps to dart result id; exp is a flat 4
const DART_TIP_RESULT = {
    1062: 1013,
    1063: 1015,
    1064: 1024,
    1065: 1068,
    1066: 1069,
    1067: 1070
};
const DART_EXP = 4;

// Fast membership sets keyed by log/arrowhead/dart-tip id.
const LOG_IDS = new Set(Object.keys(bows).map(Number));
const ARROW_HEAD_IDS = new Set(Object.keys(arrows).map(Number));
const DART_TIP_IDS = new Set(Object.keys(darts).map(Number));

// unstrung bow ids mapped to log id and tier for resolving the strung result
const UNSTRUNG_LOOKUP = new Map();
for (const [logId, tiers] of Object.entries(bows)) {
    tiers.forEach((tier, tierIndex) => {
        UNSTRUNG_LOOKUP.set(tier.unstrung, {
            logId: Number(logId),
            tierIndex
        });
    });
}

function itemName(id) {
    const def = items[id];
    return def ? def.name.toLowerCase() : 'item';
}

async function cutLog(player, logID) {
    const { world } = player;
    const tiers = bows[logID];

    if (!tiers) {
        return false;
    }

    player.message('@que@What would you like to make?');

    // arrow shafts, shortbow, and longbow can be cut from any log
    const options = ['Make arrow shafts', 'Make shortbow', 'Make longbow'];
    const choice = await player.ask(options, false);

    if (choice < 0 || choice > 2) {
        return true;
    }

    let resultID;
    let level;
    let experience;
    let cutMessage;
    let shaftAmount = 0;

    if (choice === 0) {
        // arrow shafts: 0.5 exp per shaft, level from shaftLvl
        shaftAmount = SHAFT_AMOUNT[logID] || 10;
        resultID = ARROW_SHAFTS_ID;
        level = SHAFT_LEVEL[logID] || 1;
        experience = shaftAmount * 2;
        cutMessage = `@que@You carefully cut the wood into ${shaftAmount} arrow shafts`;
    } else {
        // shortbow = tier[0], longbow = tier[1]
        const tier = tiers[choice - 1];
        resultID = tier.unstrung;
        level = tier.level;
        experience = tier.experience;
        cutMessage =
            choice === 1
                ? '@que@You carefully cut the wood into a shortbow'
                : '@que@You carefully cut the wood into a longbow';
    }

    const repeat = getBatchCount(player, 'fletching');

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(logID)) {
            return true;
        }

        if (player.skills.fletching.current < level) {
            player.message(
                `@que@You need a fletching skill of ${level} or above to do that`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('@que@You are too tired to fletch');
            return true;
        }

        player.inventory.remove(logID);
        player.message(cutMessage);

        if (resultID === ARROW_SHAFTS_ID) {
            player.inventory.add(ARROW_SHAFTS_ID, shaftAmount);
        } else {
            player.inventory.add(resultID);
        }

        player.addExperience('fletching', experience);

        await world.sleepTicks(2);
    }

    return true;
}

async function stringBow(player, unstrungID) {
    const { world } = player;
    const lookup = UNSTRUNG_LOOKUP.get(unstrungID);

    if (!lookup) {
        return false;
    }

    const tier = bows[lookup.logId][lookup.tierIndex];

    const repeat = getBatchCount(player, 'fletching');

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(unstrungID) ||
            !player.inventory.has(BOW_STRING_ID)
        ) {
            return true;
        }

        if (player.skills.fletching.current < tier.level) {
            player.message(
                `@que@You need a fletching skill of ${tier.level} or above to do that`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('@que@You are too tired to fletch');
            return true;
        }

        player.inventory.remove(unstrungID);
        player.inventory.remove(BOW_STRING_ID);
        player.inventory.add(tier.strung);
        player.message('@que@You add a string to the bow');
        player.addExperience('fletching', tier.experience);

        await world.sleepTicks(2);
    }

    return true;
}

async function attachFeathers(player, attachmentID) {
    const { world } = player;

    let resultID;
    let experience;
    let level = 1;

    if (attachmentID === ARROW_SHAFTS_ID) {
        resultID = HEADLESS_ARROWS_ID;
        experience = HEADLESS_ARROW_EXP;
    } else if (DART_TIP_IDS.has(attachmentID)) {
        resultID = DART_TIP_RESULT[attachmentID];
        experience = DART_EXP;
        level = darts[attachmentID];
    } else {
        return false;
    }

    const attachmentName = itemName(attachmentID);

    const repeat = getBatchCount(player, 'fletching');

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(FEATHER_ID) ||
            !player.inventory.has(attachmentID)
        ) {
            return true;
        }

        if (player.skills.fletching.current < level) {
            player.message(
                `@que@You need a fletching skill of ${level} or above to do that`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('@que@You are too tired to fletch');
            return true;
        }

        player.message(
            `@que@You attach feathers to some of your ${attachmentName}`
        );

        // one feather plus one attachment produces one result per iteration
        player.inventory.remove(FEATHER_ID);
        player.inventory.remove(attachmentID);
        player.inventory.add(resultID);
        player.addExperience('fletching', experience);

        await world.sleepTicks(2);
    }

    return true;
}

async function attachArrowHeads(player, headID) {
    const { world } = player;
    const arrow = arrows[headID];

    if (!arrow) {
        return false;
    }

    // fletching cape (20%): doubles arrows and xp when attaching arrowheads
    const skillCapeMultiplier = skillCapes.shouldActivate(player, 'fletching')
        ? 2
        : 1;

    const repeat = getBatchCount(player, 'fletching');

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(HEADLESS_ARROWS_ID) ||
            !player.inventory.has(headID)
        ) {
            return true;
        }

        if (player.skills.fletching.current < arrow.level) {
            player.message(
                `@que@You need a fletching skill of ${arrow.level} or above to do that`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('@que@You are too tired to fletch');
            return true;
        }

        player.message('@que@You attach the arrow heads to some of your arrows');

        player.inventory.remove(HEADLESS_ARROWS_ID);
        player.inventory.remove(headID);
        player.inventory.add(arrow.id, skillCapeMultiplier);
        player.addExperience('fletching', arrow.experience * skillCapeMultiplier);

        await world.sleepTicks(2);
    }

    return true;
}

async function onUseWithInventory(player, item, target) {
    // members gate (authentic: fletching is members-only)
    if (!player.world.members) {
        player.message('Nothing interesting happens');
        return false;
    }

    const a = item.id;
    const b = target.id;

    // knife + log
    if (a === KNIFE_ID && LOG_IDS.has(b)) {
        return await cutLog(player, b);
    }
    if (b === KNIFE_ID && LOG_IDS.has(a)) {
        return await cutLog(player, a);
    }

    // bowstring + unstrung bow
    if (a === BOW_STRING_ID && UNSTRUNG_LOOKUP.has(b)) {
        return await stringBow(player, b);
    }
    if (b === BOW_STRING_ID && UNSTRUNG_LOOKUP.has(a)) {
        return await stringBow(player, a);
    }

    // feather + (arrow shafts | dart tips)
    if (a === FEATHER_ID && (b === ARROW_SHAFTS_ID || DART_TIP_IDS.has(b))) {
        return await attachFeathers(player, b);
    }
    if (b === FEATHER_ID && (a === ARROW_SHAFTS_ID || DART_TIP_IDS.has(a))) {
        return await attachFeathers(player, a);
    }

    // headless arrows + arrowhead
    if (a === HEADLESS_ARROWS_ID && ARROW_HEAD_IDS.has(b)) {
        return await attachArrowHeads(player, b);
    }
    if (b === HEADLESS_ARROWS_ID && ARROW_HEAD_IDS.has(a)) {
        return await attachArrowHeads(player, a);
    }

    return false;
}

module.exports = { onUseWithInventory };
