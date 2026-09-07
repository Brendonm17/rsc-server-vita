// https://classic.runescape.wiki/w/Crafting#Jewellery
//
// gold jewellery crafting. the "better" flow requires a mould and auto-detects
// every product from the moulds and gems held, in one flat menu (highest-tier
// gem first, then plain gold). the opal ring has no base data entry, so it is
// not offered.
// crowns are a custom jewelry shape (CROWN_ITEMS below), gated behind
// wantEnchantedCrowns.

const crafting = require('@2003scape/rsc-data/skills/crafting');
const items = require('@2003scape/rsc-data/config/items');
const enchantedCrowns = require('../enchanted-crowns');
const { wantBatching } = require('../batch');

const goldJewellery = crafting['gold-jewellery'];
const silverJewellery = crafting['silver-jewellery'];

const GEM_NAMES = goldJewellery.gems.map((id) => {
    const name = items[id].name;
    return name[0].toUpperCase() + name.slice(1);
});

GEM_NAMES.unshift('Gold');

const FURNACE_ID = 118;
const GOLD_BAR_ID = 172;
const SILVER_BAR_ID = 384;

// family crest perfect gold (691): a ruby ring/necklace comes out as its
// family-crest variant (692/693); every other product is unchanged
const GOLD_BAR_FAMILYCREST_ID = 691;
const RUBY_RING_ID = 286;
const RUBY_NECKLACE_ID = 291;
const RUBY_RING_FAMILYCREST_ID = 692;
const RUBY_NECKLACE_FAMILYCREST_ID = 693;

function perfectGoldResult(goldBarId, productId) {
    if (goldBarId !== GOLD_BAR_FAMILYCREST_ID) {
        return productId;
    }

    if (productId === RUBY_RING_ID) {
        return RUBY_RING_FAMILYCREST_ID;
    }

    if (productId === RUBY_NECKLACE_ID) {
        return RUBY_NECKLACE_FAMILYCREST_ID;
    }

    return productId;
}

// crown rows, indexed like goldJewellery.items[shape]: [0]=gold, then one per gem
function getCrownItems() {
    const ids = enchantedCrowns.resolveCrownIds();

    return [
        { level: 9, experience: 128, id: ids.gold },
        { level: 15, experience: 270, id: ids.sapphire },
        { level: 36, experience: 300, id: ids.emerald },
        { level: 60, experience: 360, id: ids.ruby },
        { level: 84, experience: 480, id: ids.diamond },
        { level: 93, experience: 800, id: ids.dragonstone }
    ];
}

// success messages keyed by result item id; authentic casing kept as-is
const SUCCESS_MESSAGES = {
    283: 'You make a gold ring',
    288: 'You make a gold necklace',
    296: 'You make a gold amulet',
    284: 'You make a Sapphire ring',
    289: 'You make a Sapphire necklace',
    297: 'You make a Sapphire amulet',
    285: 'You make an Emerald ring',
    290: 'You make an Emerald necklace',
    298: 'You make an Emerald amulet',
    286: 'You make a ruby ring',
    291: 'You make a ruby necklace',
    299: 'You make a ruby amulet',
    287: 'You make a diamond ring',
    292: 'You make a diamond necklace',
    300: 'You make a diamond amulet',
    543: 'You make a dragonstone ring',
    544: 'You make a dragonstone necklace',
    524: 'You make a dragonstone amulet',
    // opal ring: no base data entry, never actually looked up
    1321: 'You make an opal ring'
};

// no-gem messages keyed by result item id; authentic quirks kept exactly
const NO_GEM_MESSAGES = {
    284: 'You do not have a cut sapphire to make a sapphire ring',
    289: 'You do not have a cut sapphire to make a sapphire necklace',
    297: 'You do not have a cut sapphire to make a sapphire amulet',
    285: 'You do not have a cut Emerald to make a Emerald ring',
    290: 'You do not have a cut Emerald to make a Emerald necklace',
    298: 'You do not have a cut Emerald to make a Emerald amulet',
    286: 'You do not have a cut ruby to make a ruby ring',
    291: 'You do not have a cut ruby to make a ruby necklace',
    299: 'You do not have a cut ruby to make a ruby amulet',
    287: 'You do not have a cut diamond to make a diamond ring',
    292: 'You do not have a cut diamond to make a diamond necklace',
    300: 'You do not have a cut diamond to make a diamond amulet',
    543: 'You do not have a cut dragonstone to make a dragonstone ring',
    544: 'You do not have a cut dragonstone to make a dragonstone necklace',
    524: 'You do not have a dragonstone to make a dragonstone amulet',
    1321: 'You do not have a cut opal to make an opal ring'
};

// the 6 crown message entries, merged into the tables above on first use
let crownMessagesMerged = false;

function ensureCrownMessages() {
    if (crownMessagesMerged) {
        return;
    }

    crownMessagesMerged = true;

    const ids = enchantedCrowns.resolveCrownIds();

    if (typeof ids.gold === 'number') {
        SUCCESS_MESSAGES[ids.gold] = 'You make a gold crown';
    }
    if (typeof ids.sapphire === 'number') {
        SUCCESS_MESSAGES[ids.sapphire] = 'You make a Sapphire crown';
        NO_GEM_MESSAGES[ids.sapphire] =
            'You do not have a cut sapphire to make a sapphire crown';
    }
    if (typeof ids.emerald === 'number') {
        SUCCESS_MESSAGES[ids.emerald] = 'You make an Emerald crown';
        NO_GEM_MESSAGES[ids.emerald] =
            'You do not have a cut Emerald to make a Emerald crown';
    }
    if (typeof ids.ruby === 'number') {
        SUCCESS_MESSAGES[ids.ruby] = 'You make a ruby crown';
        NO_GEM_MESSAGES[ids.ruby] =
            'You do not have a cut ruby to make a ruby crown';
    }
    if (typeof ids.diamond === 'number') {
        SUCCESS_MESSAGES[ids.diamond] = 'You make a diamond crown';
        NO_GEM_MESSAGES[ids.diamond] =
            'You do not have a cut diamond to make a diamond crown';
    }
    if (typeof ids.dragonstone === 'number') {
        SUCCESS_MESSAGES[ids.dragonstone] = 'You make a dragonstone crown';
        NO_GEM_MESSAGES[ids.dragonstone] =
            'You do not have a cut dragonstone to make a dragonstone crown';
    }
}

// mould-missing fail strings for the non-auto-detect flow (unreachable here)
const GOLD_MOULD_FAIL_MESSAGES = {
    Ring: 'You need a ring mould to make a gold ring',
    Necklace: 'You need a necklace mould to make a gold necklace',
    Amulet: 'You need an amulet mould to make a gold amulet',
    Crown: 'You need a crown mould to make a gold crown'
};

function wantBetterJewelryCrafting(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    // default on unless a world disables it
    return !config || config.wantBetterJewelryCrafting !== false;
}

// auto-detection menu shapes; within each, gems highest-tier first then gold.
// gem index i maps to items[shape][i+1] (index 0 is the plain gold entry)
const AUTO_SHAPES = [
    { name: 'Amulet', shape: 2 },
    { name: 'Necklace', shape: 1 },
    { name: 'Ring', shape: 0 }
];

// gem draw order, highest tier first (indices into goldJewellery.gems)
const AUTO_GEM_ORDER = [4, 3, 2, 1, 0];

async function goldMouldingAuto(player, goldBarId = GOLD_BAR_ID) {
    ensureCrownMessages();

    const { world } = player;
    const crownsWanted = enchantedCrowns.perksEnabled(player);
    const crownMouldId = crownsWanted
        ? enchantedCrowns.resolveCrownIds().mould
        : undefined;
    const hasCrownMould =
        typeof crownMouldId === 'number' && player.inventory.has(crownMouldId);

    // A mould is required.
    const heldMoulds = AUTO_SHAPES.filter(({ shape }) =>
        player.inventory.has(goldJewellery.moulds[shape])
    );
    if (heldMoulds.length === 0 && !hasCrownMould) {
        player.message('You need a mould to craft jewelry');
        return;
    }

    const options = [];
    const products = [];

    // crown mould is checked first, ahead of amulet/necklace/ring
    if (hasCrownMould) {
        const crownItems = getCrownItems();

        for (const gemIdx of AUTO_GEM_ORDER) {
            const gemId = goldJewellery.gems[gemIdx];
            if (!player.inventory.has(gemId)) {
                continue;
            }
            if (!world.members && items[gemId].members) {
                continue;
            }
            const product = crownItems[gemIdx + 1];
            if (typeof product.id !== 'number') {
                continue;
            }
            const gemName =
                items[gemId].name[0].toUpperCase() + items[gemId].name.slice(1);
            options.push(`${gemName} crown`);
            products.push({ ...product, gemId });
        }
        if (typeof crownItems[0].id === 'number') {
            options.push('Gold crown');
            products.push({ ...crownItems[0], gemId: -1 });
        }
    }

    for (const { name, shape } of heldMoulds) {
        for (const gemIdx of AUTO_GEM_ORDER) {
            const gemId = goldJewellery.gems[gemIdx];
            if (!player.inventory.has(gemId)) {
                continue;
            }
            if (!world.members && items[gemId].members) {
                continue;
            }
            const product = goldJewellery.items[shape][gemIdx + 1];
            const gemName =
                items[gemId].name[0].toUpperCase() + items[gemId].name.slice(1);
            options.push(`${gemName} ${name.toLowerCase()}`);
            products.push({ ...product, gemId });
        }
        // plain gold option for this mould
        const goldProduct = goldJewellery.items[shape][0];
        options.push(`Gold ${name.toLowerCase()}`);
        products.push({ ...goldProduct, gemId: -1 });
    }

    // gold-bar think-bubble fires once while the menu is built
    player.sendBubble(GOLD_BAR_ID);

    if (options.length === 0) {
        player.message('@que@You do not have any moulds...!');
        return;
    }

    const menu = await player.ask(options, false);
    if (menu < 0 || menu >= products.length) {
        return;
    }

    const { level, experience, id, gemId } = products[menu];

    // quantity submenu: a perfect gold bar is never batched; otherwise ask how
    // many when more than one could be made
    const mostThatCouldBeMade =
        gemId > -1
            ? Math.min(
                  player.inventory.items.filter(({ id: heldId }) => heldId === gemId)
                      .length,
                  player.inventory.items.filter(
                      ({ id: heldId }) => heldId === goldBarId
                  ).length
              )
            : player.inventory.items.filter(({ id: heldId }) => heldId === goldBarId)
                  .length;

    let repeat = 1;

    if (wantBatching(player) && goldBarId !== GOLD_BAR_FAMILYCREST_ID) {
        if (mostThatCouldBeMade > 1) {
            const howMany = await player.ask(
                ['Make all', 'Make 1', 'Make 3', 'Make 5', 'Make 10', 'Make all but one'],
                false
            );

            if (howMany === 0) {
                repeat = mostThatCouldBeMade;
            } else if (howMany === 1) {
                repeat = Math.min(1, mostThatCouldBeMade);
            } else if (howMany === 2) {
                repeat = Math.min(3, mostThatCouldBeMade);
            } else if (howMany === 3) {
                repeat = Math.min(5, mostThatCouldBeMade);
            } else if (howMany === 4) {
                repeat = Math.min(10, mostThatCouldBeMade);
            } else if (howMany === 5) {
                if (mostThatCouldBeMade > 1) {
                    repeat = mostThatCouldBeMade - 1;
                } else {
                    player.message('@que@Okay, all done making zero of your item.');
                    return;
                }
            }
            // any other value: repeat stays 1
        } else {
            repeat = Math.min(1, mostThatCouldBeMade);
        }
    }

    const resultId = perfectGoldResult(goldBarId, id);

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(goldBarId)) {
            break;
        }

        if (player.skills.crafting.current < level) {
            player.message(
                `@que@You need a crafting skill of level ${level} to make this`
            );
            return;
        }

        if (player.isTired()) {
            player.message('You are too tired to craft');
            return;
        }

        if (gemId > -1 && !player.inventory.has(gemId)) {
            player.message(
                `@que@${
                    NO_GEM_MESSAGES[id] ||
                    'Programmer has not defined a message for failing to have the required gem.'
                }`
            );
            return;
        }

        await world.sleepTicks(1);

        player.message(
            `@que@${
                SUCCESS_MESSAGES[id] ||
                'Programmer has not defined a message for successfully crafting this product.'
            }`
        );
        player.inventory.remove(goldBarId);
        if (gemId > -1) {
            player.inventory.remove(gemId);
        }
        player.inventory.add(resultId);
        player.addExperience('crafting', experience);

        await world.sleepTicks(1);
    }
}

// crown branch of the non-auto-detect flow, same gem prompt against CROWN_ITEMS
async function crownMoulding(player, goldBarId = GOLD_BAR_ID) {
    ensureCrownMessages();

    const { world } = player;
    const ids = enchantedCrowns.resolveCrownIds();

    if (typeof ids.mould !== 'number' || !player.inventory.has(ids.mould)) {
        player.message(`@que@${GOLD_MOULD_FAIL_MESSAGES.Crown}`);
        return;
    }

    player.message('What type of crown would you like to make?');

    const gemChoices = GEM_NAMES.filter((_, i) => {
        if (i === 0) {
            return true;
        }

        const id = goldJewellery.gems[i - 1];
        return !world.members ? !items[id].members : true;
    });

    const gemChoice = await player.ask(gemChoices, false);
    const gemName = GEM_NAMES[gemChoice];
    const gemID = gemChoice === 0 ? -1 : goldJewellery.gems[gemChoice - 1];

    if (gemID > -1 && !player.inventory.has(gemID)) {
        player.message(`You don't have a ${gemName}.`);
        return;
    }

    const crownItems = getCrownItems();
    const { level, experience, id } = crownItems[gemChoice];

    if (typeof id !== 'number') {
        player.message('You have no reason to make that item.');
        return;
    }

    if (player.skills.crafting.current < level) {
        player.message(
            `@que@You need a crafting skill of level ${level} to make this`
        );
        return;
    }
    if (player.isTired()) {
        player.message('You are too tired to craft');
        return;
    }

    if (gemID > -1 && !player.inventory.has(gemID)) {
        player.message(
            `@que@${
                NO_GEM_MESSAGES[id] ||
                'Programmer has not defined a message for failing to have the required gem.'
            }`
        );
        return;
    }

    if (gemID > -1) {
        player.inventory.remove(gemID);
    }
    player.inventory.remove(goldBarId);
    player.message(
        `@que@${
            SUCCESS_MESSAGES[id] ||
            'Programmer has not defined a message for successfully crafting this product.'
        }`
    );
    player.inventory.add(perfectGoldResult(goldBarId, id));
    player.addExperience('crafting', experience);
}

async function goldMoulding(player, goldBarId = GOLD_BAR_ID) {
    if (wantBetterJewelryCrafting(player)) {
        await goldMouldingAuto(player, goldBarId);
        return;
    }

    const { world } = player;
    const crownsWanted = enchantedCrowns.perksEnabled(player);

    player.message('What would you like to make?');

    // ring/necklace/amulet, plus crown when the crown gate is enabled
    const mouldChoices = crownsWanted
        ? ['Ring', 'Necklace', 'Amulet', 'Crown']
        : ['Ring', 'Necklace', 'Amulet'];
    const mouldChoice = await player.ask(mouldChoices, false);

    if (crownsWanted && mouldChoice === 3) {
        await crownMoulding(player, goldBarId);
        return;
    }

    const resultName = mouldChoices[mouldChoice];
    const mouldID = goldJewellery.moulds[mouldChoice];

    if (!player.inventory.has(mouldID)) {
        player.message(`@que@${GOLD_MOULD_FAIL_MESSAGES[resultName]}`);

        return;
    }

    player.message(`What type of ${resultName} would you like to make?`);

    const gemChoices = GEM_NAMES.filter((_, i) => {
        if (i === 0) {
            return true;
        }

        const id = goldJewellery.gems[i - 1];
        return !world.members ? !items[id].members : true;
    });

    const gemChoice = await player.ask(gemChoices, false);
    const gemName = GEM_NAMES[gemChoice];
    const gemID = gemChoice === 0 ? -1 : goldJewellery.gems[gemChoice - 1];

    if (gemID > -1 && !player.inventory.has(gemID)) {
        player.message(`You don't have a ${gemName}.`);
        return;
    }

    const craftingLevel = player.skills.crafting.current;

    const { level, experience, id } = goldJewellery.items[mouldChoice][
        gemChoice
    ];

    if (craftingLevel < level) {
        player.message(
            `@que@You need a crafting skill of level ${level} to make this`
        );

        return;
    }

    if (player.isTired()) {
        player.message('You are too tired to craft');
        return;
    }

    if (gemID > -1 && !player.inventory.has(gemID)) {
        player.message(
            `@que@${
                NO_GEM_MESSAGES[id] ||
                'Programmer has not defined a message for failing to have the required gem.'
            }`
        );
        return;
    }

    const resultId = perfectGoldResult(goldBarId, id);

    if (gemID > -1) {
        player.inventory.remove(gemID);
    }

    player.inventory.remove(goldBarId);
    player.message(
        `@que@${
            SUCCESS_MESSAGES[id] ||
            'Programmer has not defined a message for successfully crafting this product.'
        }`
    );
    player.inventory.add(resultId);
    player.addExperience('crafting', experience);
}

async function silverMoulding(player) {
    const { world } = player;

    player.message('What would you like to make?');

    const choices = silverJewellery.items
        .filter(({ id }) => {
            return !world.members ? !items[id].members : true;
        })
        .map(({ id, alias }) => {
            return alias || items[id].name;
        });

    const choice = await player.ask(choices, false);

    if (choice < 0) {
        return;
    }

    const mouldID = silverJewellery.moulds[choice];

    if (!player.inventory.has(mouldID)) {
        player.message(
            `You need a ${items[mouldID].name} to make a ${choices[choice]}!`
        );

        return;
    }

    const { level, experience, id } = silverJewellery.items[choice];

    // silver jewellery batches all held silver bars, no quantity submenu
    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id: heldId }) => heldId === SILVER_BAR_ID)
              .length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(SILVER_BAR_ID)) {
            break;
        }

        if (player.skills.crafting.current < level) {
            player.message(
                `@que@You need a crafting skill of level ${level} to make this`
            );

            return;
        }

        if (player.isTired()) {
            player.message('You are too tired to craft');
            return;
        }

        if (!player.inventory.has(mouldID)) {
            player.message(
                `You need a ${items[mouldID].name} to make a ${choices[choice]}!`
            );
            return;
        }

        // think-bubble and remove silver before the delay; message after it
        player.sendBubble(SILVER_BAR_ID);
        player.inventory.remove(SILVER_BAR_ID);
        await world.sleepTicks(2);

        player.message(`@que@You make a ${items[id].name}`);
        player.inventory.add(id);
        player.addExperience('crafting', experience);

        await world.sleepTicks(1);
    }
}

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== FURNACE_ID) {
        return false;
    }

    if (item.id === GOLD_BAR_ID || item.id === GOLD_BAR_FAMILYCREST_ID) {
        await goldMoulding(player, item.id);
        return true;
    }

    if (item.id === SILVER_BAR_ID) {
        await silverMoulding(player);
        return true;
    }

    return false;
}

// the crowns' Check/Break/Configure menu, delegated to enchanted-crowns.js;
// exported here so it registers as a plugin handler. returns false for non-crowns
async function onInventoryCommand(player, item) {
    return await enchantedCrowns.onInventoryCommand(player, item);
}

module.exports = { onUseWithGameObject, onInventoryCommand };
