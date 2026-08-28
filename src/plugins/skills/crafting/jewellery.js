// https://classic.runescape.wiki/w/Crafting#Jewellery

const crafting = require('@2003scape/rsc-data/skills/crafting');
const items = require('@2003scape/rsc-data/config/items');
const enchantedCrowns = require('../enchanted-crowns');

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

// perfect gold 691: ruby ring/necklace -> family-crest 692/693
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

// crown rows: [0]=gold, then one per gem
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

function wantBetterJewelryCrafting(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    // default on unless disabled
    return !config || config.wantBetterJewelryCrafting !== false;
}

// gold jewelry shapes: amulet, necklace, ring
const AUTO_SHAPES = [
    { name: 'Amulet', shape: 2 },
    { name: 'Necklace', shape: 1 },
    { name: 'Ring', shape: 0 }
];

// gem draw order: dragonstone, diamond, ruby, emerald, sapphire
const AUTO_GEM_ORDER = [4, 3, 2, 1, 0];

async function goldMouldingAuto(player, goldBarId = GOLD_BAR_ID) {
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

    // crown mould checked first, ahead of amulet/necklace/ring
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

    if (options.length === 0) {
        player.message('You do not have any moulds...!');
        return;
    }

    player.sendBubble(GOLD_BAR_ID);
    const menu = await player.ask(options, false);
    if (menu < 0 || menu >= products.length) {
        return;
    }

    const { level, experience, id, gemId } = products[menu];

    if (player.skills.crafting.current < level) {
        player.message(
            `You need a crafting skill of level ${level} to make this`
        );
        return;
    }
    if (player.isTired()) {
        player.message('You are too tired to craft');
        return;
    }

    const resultId = perfectGoldResult(goldBarId, id);

    player.sendBubble(id);
    if (gemId > -1) {
        player.inventory.remove(gemId);
    }
    player.inventory.remove(goldBarId);
    player.message(`You make a ${items[id].name}`);
    player.inventory.add(resultId);
    player.addExperience('crafting', experience);
}

async function crownMoulding(player, goldBarId = GOLD_BAR_ID) {
    const { world } = player;
    const ids = enchantedCrowns.resolveCrownIds();

    if (typeof ids.mould !== 'number' || !player.inventory.has(ids.mould)) {
        player.message('You need a crown mould to make a gold crown');
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
            `@que@You need a crafting level of ${level} to make this`
        );
        return;
    }
    if (player.isTired()) {
        player.message('You are too tired to craft');
        return;
    }

    player.sendBubble(id);
    if (gemID > -1) {
        player.inventory.remove(gemID);
    }
    player.inventory.remove(goldBarId);
    player.message(`You make a ${items[id].name}`);
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

    // options: ring, necklace, amulet (+ crown when enabled)
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
        player.message(
            `You need a ${items[mouldID].name} to make a ${resultName}`
        );

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
            `@que@You need a crafting level of ${level} to make this`
        );

        return;
    }

    if (player.isTired()) {
        player.message('You are too tired to craft');
        return;
    }

    const resultId = perfectGoldResult(goldBarId, id);

    player.sendBubble(id);

    if (gemID > -1) {
        player.inventory.remove(gemID);
    }

    player.inventory.remove(goldBarId);
    player.message(`You make a ${items[id].name}`);
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
    const mouldID = silverJewellery.moulds[choice];

    if (!player.inventory.has(mouldID)) {
        player.message(
            `You need a ${items[mouldID].name} to make a ${choices[choice]}!`
        );

        return;
    }

    const craftingLevel = player.skills.crafting.current;
    const { level, experience, id } = silverJewellery.items[choice];

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

    player.sendBubble(id);
    player.inventory.remove(SILVER_BAR_ID);
    player.message(`You make a ${items[id].name}`);
    player.inventory.add(id);
    player.addExperience('crafting', experience);
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

// check/break/configure menu for the 6 enchanted crowns
async function onInventoryCommand(player, item) {
    return await enchantedCrowns.onInventoryCommand(player, item);
}

module.exports = { onUseWithGameObject, onInventoryCommand };
