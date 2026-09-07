// fletching skill: log cutting, bowstringing, feather attaching, arrowheads,
// with batching. members-only. shaft xp is approximated as amount * 2

const items = require('@2003scape/rsc-data/config/items');
const { bows, arrows, darts } = require('@2003scape/rsc-data/skills/fletching');
const { getBatchCount, wantBatching } = require('./batch');
const skillCapes = require('./skill-capes');

const KNIFE_ID = 13;
const FEATHER_ID = 381;
const BOW_STRING_ID = 676;
const ARROW_SHAFTS_ID = 280;
const HEADLESS_ARROWS_ID = 637;

// oyster-pearl bolts: chisel pearls -> bolt tips -> attach to crossbow bolts.
// quest pearls 779 yield 25 tips, regular 792 yield 2
const CHISEL_ID = 167;
const QUEST_OYSTER_PEARLS_ID = 779;
const OYSTER_PEARLS_ID = 792;
const OYSTER_PEARL_BOLT_TIPS_ID = 790;
const CROSSBOW_BOLTS_ID = 190;
const OYSTER_PEARL_BOLTS_ID = 786;

const PEARL_CUT_LEVEL = 34;
const PEARL_CUT_EXP = 100;
const BOLT_MAKE_LEVEL = 34;
const BOLT_MAKE_EXP = 25;

// shaft amount and level requirement per log id
const SHAFT_AMOUNT = { 14: 10, 632: 15, 633: 20, 634: 25, 635: 30, 636: 35 };
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

// unstrung bow ids mapped to { logId, tierIndex } for resolving the strung result
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

// count of an item held (stackable -> the stack amount; else the slot count).
function countId(player, id) {
    let total = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            total += item.definition.stackable ? item.amount : 1;
        }
    }

    return total;
}

// knife + log -> arrow shafts / shortbow / longbow
async function cutLog(player, logID) {
    const { world } = player;
    const tiers = bows[logID];

    if (!tiers) {
        return false;
    }

    player.message('What would you like to make?');

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
                `You need a fletching skill of ${level} or above to do that`
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

// bowstring + unstrung bow -> strung bow
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
                `You need a fletching skill of ${tier.level} or above to do that`
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
        player.message('You add a string to the bow');
        player.addExperience('fletching', tier.experience);

        await world.sleepTicks(2);
    }

    return true;
}

// feather + arrow shafts -> headless arrows, or feather + dart tips -> darts
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
                `You need a fletching skill of ${level} or above to do that`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('@que@You are too tired to fletch');
            return true;
        }

        player.message(
            `You attach feathers to some of your ${attachmentName}`
        );

        // one feather + one attachment -> one result per iteration
        player.inventory.remove(FEATHER_ID);
        player.inventory.remove(attachmentID);
        player.inventory.add(resultID);
        player.addExperience('fletching', experience);

        await world.sleepTicks(2);
    }

    return true;
}

// arrowhead + headless arrows -> arrows
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
                `You need a fletching skill of ${arrow.level} or above to do that`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('@que@You are too tired to fletch');
            return true;
        }

        player.message('You attach the arrow heads to some of your arrows');

        player.inventory.remove(HEADLESS_ARROWS_ID);
        player.inventory.remove(headID);
        player.inventory.add(arrow.id, skillCapeMultiplier);
        player.addExperience('fletching', arrow.experience * skillCapeMultiplier);

        await world.sleepTicks(2);
    }

    return true;
}

// chisel + oyster pearls -> bolt tips. 779 yields 25, 792 yields 2. L34, 100xp
// per pearl; batching repeats once per pearl
async function cutPearls(player, pearlId) {
    const { world } = player;

    const amount = pearlId === QUEST_OYSTER_PEARLS_ID ? 25 : 2;
    const repeat = wantBatching(player) ? countId(player, pearlId) : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(pearlId)) {
            return true;
        }

        if (player.skills.fletching.current < PEARL_CUT_LEVEL) {
            player.message(
                `You need a fletching skill of ${PEARL_CUT_LEVEL} to do that`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('@que@You are too tired to fletch');
            return true;
        }

        player.inventory.remove(pearlId);
        player.message('you chisel the pearls into small bolt tips');
        player.inventory.add(OYSTER_PEARL_BOLT_TIPS_ID, amount);
        player.addExperience('fletching', PEARL_CUT_EXP);

        await world.sleepTicks(2);
    }

    return true;
}

// pearl bolt tips + crossbow bolts -> pearl bolts. L34, 25xp per bolt; cape
// doubles output+xp. batch: up to 10 per round, 5 rounds
async function makeBolts(player) {
    const { world } = player;

    const capeMultiplier = skillCapes.shouldActivate(player, 'fletching') ? 2 : 1;
    const rounds = wantBatching(player) ? 5 : 1;

    for (let r = 0; r < rounds; r += 1) {
        const loopCount = Math.min(
            10,
            countId(player, CROSSBOW_BOLTS_ID),
            countId(player, OYSTER_PEARL_BOLT_TIPS_ID)
        );

        if (loopCount <= 0) {
            return true;
        }

        for (let i = 0; i < loopCount; i += 1) {
            if (player.skills.fletching.current < BOLT_MAKE_LEVEL) {
                player.message(
                    `You need a fletching skill of ${BOLT_MAKE_LEVEL} to do that`
                );
                return true;
            }

            if (player.isTired()) {
                player.message('@que@You are too tired to fletch');
                return true;
            }

            player.inventory.remove(CROSSBOW_BOLTS_ID);
            player.inventory.remove(OYSTER_PEARL_BOLT_TIPS_ID);
            player.inventory.add(OYSTER_PEARL_BOLTS_ID, capeMultiplier);
            player.addExperience('fletching', BOLT_MAKE_EXP * capeMultiplier);
        }

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

    // chisel + oyster pearls (quest 779 / regular 792) -> pearl bolt tips
    if (
        a === CHISEL_ID &&
        (b === QUEST_OYSTER_PEARLS_ID || b === OYSTER_PEARLS_ID)
    ) {
        return await cutPearls(player, b);
    }
    if (
        b === CHISEL_ID &&
        (a === QUEST_OYSTER_PEARLS_ID || a === OYSTER_PEARLS_ID)
    ) {
        return await cutPearls(player, a);
    }

    // oyster pearl bolt tips + crossbow bolts -> oyster pearl bolts
    if (
        (a === OYSTER_PEARL_BOLT_TIPS_ID && b === CROSSBOW_BOLTS_ID) ||
        (b === OYSTER_PEARL_BOLT_TIPS_ID && a === CROSSBOW_BOLTS_ID)
    ) {
        return await makeBolts(player);
    }

    return false;
}

module.exports = { onUseWithInventory };
