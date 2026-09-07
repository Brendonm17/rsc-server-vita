// https://classic.runescape.wiki/w/Crafting#Leather_Working
// leather working: armour/gloves/boots, plus a chaps/top/skirt submenu under
// "More..." when custom leather is enabled

const items = require('@2003scape/rsc-data/config/items');
const { leather } = require('@2003scape/rsc-data/skills/crafting');
const { wantBatching } = require('../batch');

const LEATHER_ID = 148;
const NEEDLE_ID = 39;
const THREAD_ID = 43;

// custom leather product ids
const LEATHER_CHAPS_ID = 1375; // "Leather chaps"
const LEATHER_TOP_ID = 1376; // "Leather top"
const LEATHER_SKIRT_ID = 1377; // "Leather skirt"

// custom submenu: chaps / top / skirt
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

// "More..." branch: chaps / top / skirt / cancel
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

    // armour/gloves/boots, plus "More..." when custom is enabled, then cancel
    const baseChoices = leather.map((entry) => entry.alias);
    const choices = wantCustom
        ? [...baseChoices, 'More...', 'Cancel']
        : [...baseChoices, 'Cancel'];

    const choice = await player.ask(choices, false);

    // cancel (always last) or closed menu
    if (choice < 0 || choice === choices.length - 1) {
        return true;
    }

    // base product, or a custom chaps/top/skirt one via "More..."
    let recipe;

    if (wantCustom && choice === baseChoices.length) {
        recipe = await askCustomLeather(player);

        if (!recipe) {
            return true;
        }
    } else {
        recipe = leather[choice];
    }

    const { level, experience, id } = recipe;
    const name = items[id].name;
    const { world } = player;

    // repeat = count of leather held
    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id: heldId }) => heldId === LEATHER_ID)
              .length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(LEATHER_ID)) {
            break;
        }

        // level check, then fatigue check
        if (player.skills.crafting.current < level) {
            player.message(
                `@que@You need to have a crafting of level ${level} or ` +
                    `higher to make ${name}`
            );

            return true;
        }

        if (player.isTired()) {
            player.message('You are too tired to craft');
            return true;
        }

        player.inventory.remove(LEATHER_ID);
        await world.sleepTicks(1);
        player.message(`You make some ${name}`);
        player.inventory.add(id);
        player.addExperience('crafting', experience);

        const threadLeft = player.cache.hasOwnProperty('threadLeft')
            ? player.cache.threadLeft
            : 5;

        player.cache.threadLeft = threadLeft - 1;

        if (player.cache.threadLeft < 1) {
            player.message('You use up one of your reels of thread');
            player.inventory.remove(THREAD_ID);
            player.cache.threadLeft = 5;

            if (!player.inventory.has(THREAD_ID)) {
                return true;
            }
        }
    }

    return true;
}

module.exports = { onUseWithInventory };
