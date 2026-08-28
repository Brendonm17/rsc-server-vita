// https://classic.runescape.wiki/w/Cooking

// combine items (knife on pineapple, pizzas, stews)

const items = require('@2003scape/rsc-data/config/items');
const { combinations } = require('@2003scape/rsc-data/skills/cooking');

const BOWL_OF_WATER_ID = 342;
const CHEESE_ID = 319;
const KNIFE_ID = 13;
const PIZZA_BASE_ID = 321;

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
        knife,
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

    if (knife && !player.inventory.has(KNIFE_ID)) {
        player.message('You need a knife in order to cut this');
        return true;
    }

    player.inventory.remove(item.id);
    player.inventory.remove(target.id);

    // ugthanki kebab: 1/32 -> plain (dodgy) kebab, no xp
    if (failure && Math.floor(Math.random() * failure.chance) < 1) {
        player.inventory.add(failure.result);
        player.message(`@que@${failure.message}`);
        return true;
    }

    // single message, or multi-line messages
    const outputMessages = messages || [message];

    player.message(`@que@${outputMessages[0]}`);
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
