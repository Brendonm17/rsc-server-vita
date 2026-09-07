// https://classic.runescape.wiki/w/Cooking

// combine items: knife on pineapple, pizzas, stews

const items = require('@2003scape/rsc-data/config/items');
const { combinations } = require('@2003scape/rsc-data/skills/cooking');

const BOWL_OF_WATER_ID = 342;
const CHEESE_ID = 319;
const KNIFE_ID = 13;
const PIZZA_BASE_ID = 321;

// result ids that require a knife, overriding the data's knife flag
const KNIFE_REQUIRED_RESULTS = new Set([1106, 1107, 1108, 1102]);

function isRawMeat(item) {
    return item.definition.sprite === 60 && /raw/i.test(item.definition.name);
}

function getCombination(item, target) {
    return combinations.find(({ item: itemID, with: targetID }) => {
        return (
            (item.id === itemID && target.id === targetID) ||
            (item.id === targetID && target.id === itemID)
        );
    });
}

async function onUseWithInventory(player, item, target) {
    if (
        (isRawMeat(item) && target.id === BOWL_OF_WATER_ID) ||
        (item.id === BOWL_OF_WATER_ID && isRawMeat(target))
    ) {
        player.message('@que@you need to precook the meat');
        return true;
    }

    if (
        (item.id === PIZZA_BASE_ID && target.id === CHEESE_ID) ||
        (item.id === CHEESE_ID && target.id === PIZZA_BASE_ID)
    ) {
        player.message('@que@I should add the tomato first');
        return true;
    }

    const combination = getCombination(item, target);

    if (!combination) {
        return false;
    }

    const cookingLevel = player.skills.cooking.current;
    const {
        level,
        result: resultID,
        message,
        messages,
        experience,
        failure
    } = combination;

    if (!player.world.members && items[resultID].members) {
        return false;
    }

    if (cookingLevel < level) {
        player.message(`@que@You need level ${level} cooking to do this`);
        return true;
    }

    if (KNIFE_REQUIRED_RESULTS.has(resultID) && !player.inventory.has(KNIFE_ID)) {
        player.message('You need a knife in order to cut this');
        return true;
    }

    player.inventory.remove(item.id);
    player.inventory.remove(target.id);

    // tasty ugthanki kebab: 1/32 chance of a plain (dodgy) kebab, no xp
    if (failure && Math.floor(Math.random() * failure.chance) < 1) {
        player.inventory.add(failure.result);
        player.message(`@que@${failure.message}`);
        return true;
    }

    // single-message combines carry `message`; multi-step ones carry `messages`
    // and print the first line, then award item/xp, then the rest. first line is
    // plain, later lines are quest-prefixed.
    const outputMessages = messages || [message];

    player.message(outputMessages[0]);
    player.inventory.add(resultID);

    if (experience) {
        player.addExperience('cooking', experience);
    }

    for (let i = 1; i < outputMessages.length; i += 1) {
        player.message(`@que@${outputMessages[i]}`);
    }

    return true;
}

module.exports = { onUseWithInventory };
