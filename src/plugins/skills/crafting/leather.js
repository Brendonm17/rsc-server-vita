// https://classic.runescape.wiki/w/Crafting#Leather_Working
// leather working + custom chaps/top/skirt submenu ("More...")

const items = require('@2003scape/rsc-data/config/items');
const { leather } = require('@2003scape/rsc-data/skills/crafting');

const LEATHER_ID = 148;
const NEEDLE_ID = 39;
const THREAD_ID = 43;

// custom leather product ids
const LEATHER_CHAPS_ID = 1375; // "Leather chaps"
const LEATHER_TOP_ID = 1376; // "Leather top"
const LEATHER_SKIRT_ID = 1377; // "Leather skirt"

// custom submenu: Chaps / Top / Skirt
const CUSTOM_LEATHER = [
    { level: 10, experience: 80, id: LEATHER_CHAPS_ID },
    { level: 14, experience: 100, id: LEATHER_TOP_ID },
    { level: 10, experience: 80, id: LEATHER_SKIRT_ID }
];

function wantCustomLeather(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    // default on unless disabled
    return !config || config.wantCustomLeather !== false;
}

// The "More..." branch: Chaps / Top / Skirt / Cancel.
async function askCustomLeather(player) {
    const customChoice = await player.ask(['Chaps', 'Top', 'Skirt', 'Cancel'], false);

    if (customChoice < 0 || customChoice >= CUSTOM_LEATHER.length) {
        return null;
    }

    return CUSTOM_LEATHER[customChoice];
}

async function onUseWithInventory(player, item, target) {
    if (
        (item.id !== LEATHER_ID || target.id !== NEEDLE_ID) &&
        (item.id !== NEEDLE_ID || target.id !== LEATHER_ID)
    ) {
        return false;
    }

    if (!player.inventory.has(THREAD_ID)) {
        player.message('You need some thread to make anything out of leather');
        return true;
    }

    const wantCustom = wantCustomLeather(player);

    // Armour / Gloves / Boots, + "More..." (custom), + Cancel
    const baseChoices = leather.map((entry) => entry.alias);
    const choices = wantCustom
        ? [...baseChoices, 'More...', 'Cancel']
        : [...baseChoices, 'Cancel'];

    const choice = await player.ask(choices, false);

    // Cancel or closed menu
    if (choice < 0 || choice === choices.length - 1) {
        return true;
    }

    // base product, or "More..." custom one
    let recipe;

    if (wantCustom && choice === baseChoices.length) {
        recipe = await askCustomLeather(player);

        if (!recipe) {
            return true;
        }
    } else {
        recipe = leather[choice];
    }

    if (player.isTired()) {
        player.message('You are too tired to craft');
        return true;
    }

    const craftingLevel = player.skills.crafting.current;
    const { level, experience, id } = recipe;
    const name = items[id].name;

    if (craftingLevel < level) {
        player.message(
            `You need to have a crafting of level ${level} or higher to make ` +
                name
        );

        return true;
    }

    player.inventory.remove(LEATHER_ID);
    player.inventory.add(id);
    player.addExperience('crafting', experience);
    player.message(`You make some ${name}`);

    const threadLeft = player.cache.hasOwnProperty('threadLeft')
        ? player.cache.threadLeft
        : 5;

    player.cache.threadLeft = threadLeft - 1;

    if (player.cache.threadLeft < 1) {
        player.message('You use up one of your reels of thread');
        player.inventory.remove(THREAD_ID);
        player.cache.threadLeft = 5;
    }

    return true;
}

module.exports = { onUseWithInventory };
