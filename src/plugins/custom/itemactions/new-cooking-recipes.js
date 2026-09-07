// new cooking recipes, both producing an uncooked item cooked later on a range/fire:
//  1. pie shell + filling -> uncooked pie (lily's/white/plain pumpkin), gated on cooking level
//  2. mixing bowl + carp/seaweed/garlic/potato/spice -> uncooked seaweed soup when
//     poured over a bowl of water
// custom item ids are resolved by name at module load.

const items = require('@2003scape/rsc-data/config/items');

const BOWL_OF_WATER_ID = 342;
const GIANT_CARP_ID = 718;
const EDIBLE_SEAWEED_ID = 1245;
const GARLIC_ID = 218;
const POTATO_ID = 348;
const SPICE_ID = 707;
const PIE_SHELL_ID = 253;
const EGG_ID = 19;
const MILK_ID = 22;
const PUMPKIN_ID = 422;

let IDS = null;
function ids() {
    if (IDS) {
        return IDS;
    }

    const nameToId = new Map();
    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];
        if (def && def.name) {
            const key = def.name.toLowerCase();
            if (!nameToId.has(key)) {
                nameToId.set(key, id);
            }
        }
    }

    const need = (name) => {
        const id = nameToId.get(name.toLowerCase());
        if (id === undefined) {
            throw new RangeError(`new-cooking-recipes.js: no item named "${name}"`);
        }
        return id;
    };

    IDS = {
        mixingBowl: need('Mixing bowl'),
        uncookedSeaweedSoup: need('Uncooked Seaweed Soup'),
        lilysPumpkin: need("Lily's Pumpkin"),
        uncookedLilysPumpkinPie: need("Uncooked Lily's Pumpkin Pie"),
        whitePumpkin: need('White Pumpkin'),
        uncookedWhitePumpkinPie: need('Uncooked White Pumpkin Pie'),
        uncookedPumpkinPie: need('Uncooked Pumpkin Pie')
    };

    return IDS;
}

// mixing-bowl partner items and their "you place..." messages
function harvestingMixes() {
    return [
        { id: GIANT_CARP_ID, message: 'you place a tasty carp over the mixing bowl' },
        { id: EDIBLE_SEAWEED_ID, message: 'you put some good seaweed to the mixing bowl' },
        { id: GARLIC_ID, message: 'you add some garlic to the mixture' },
        { id: POTATO_ID, message: 'you put a potato on the mixture' },
        { id: SPICE_ID, message: 'you spice the mixture' }
    ];
}

// seaweed soup mixture tokens; order doesn't matter (compared as a multiset)
function seaweedSoupRecipeTokens() {
    return [GIANT_CARP_ID, EDIBLE_SEAWEED_ID, GARLIC_ID, POTATO_ID, SPICE_ID].map(String);
}

function findMix(itemId) {
    return harvestingMixes().find((hm) => hm.id === itemId);
}

function isMixPair(id1, id2) {
    const { mixingBowl } = ids();
    if (id1 === mixingBowl) {
        return findMix(id2);
    }
    if (id2 === mixingBowl) {
        return findMix(id1);
    }
    return null;
}

// multiset-compare the running cache string against the target recipe; "!" marks
// completion. returns true if the ingredient was accepted
function addHarvestingRecipeCache(player, actionId) {
    const actionString = String(actionId);
    let recipeString = player.cache.harvesting_recipe
        ? player.cache.harvesting_recipe + '-'
        : '';
    recipeString += actionString;

    const target = seaweedSoupRecipeTokens();
    if (target.indexOf(actionString) === -1) {
        return false;
    }

    const count = (toks) => {
        const map = new Map();
        for (const t of toks) {
            map.set(t, (map.get(t) || 0) + 1);
        }
        return map;
    };
    const mapsEqual = (a, b) => {
        if (a.size !== b.size) {
            return false;
        }
        for (const [k, v] of a) {
            if (b.get(k) !== v) {
                return false;
            }
        }
        return true;
    };

    const chkRecipeMap = count(target);
    const currRecipeMap = count(recipeString.split('-'));

    if (mapsEqual(currRecipeMap, chkRecipeMap)) {
        player.cache.harvesting_recipe = recipeString + '!';
        return true;
    }

    if (currRecipeMap.get(actionString) <= chkRecipeMap.get(actionString)) {
        player.cache.harvesting_recipe = recipeString;
        return true;
    }

    return false;
}

async function pourMixture(player) {
    if (!player.inventory.has(BOWL_OF_WATER_ID)) {
        player.message("first you'll need a bowl with water to pour the mixture into");
        return;
    }

    const recipe = player.cache.harvesting_recipe || '';

    if (recipe.indexOf('!') !== -1) {
        player.inventory.remove(BOWL_OF_WATER_ID);
        player.inventory.add(ids().uncookedSeaweedSoup, 1);
        delete player.cache.harvesting_recipe;
        player.message('@que@you pour the contents and get some uncooked soup');
    } else if (recipe !== '') {
        player.message('@que@your mixture is still missing some contents');
        const choice = await player.ask(['Empty it', 'Cancel'], false);
        if (choice === 0) {
            player.message('but you decide to empty it');
            delete player.cache.harvesting_recipe;
        }
    } else {
        player.message('@que@you need to put some contents into the mixing bowl');
    }
}

async function onInventoryCommand(player, item) {
    const { mixingBowl } = ids();

    if (item.id === mixingBowl) {
        await pourMixture(player);
        return true;
    }

    return false;
}

async function onUseWithInventory(player, item1, item2) {
    const id1 = item1.id;
    const id2 = item2.id;
    const { lilysPumpkin, uncookedLilysPumpkinPie, whitePumpkin, uncookedWhitePumpkinPie, uncookedPumpkinPie } = ids();

    if (id1 === PIE_SHELL_ID || id2 === PIE_SHELL_ID) {
        if (id1 === lilysPumpkin || id2 === lilysPumpkin) {
            if (player.skills.cooking.current < 40) {
                player.message('You need level 40 cooking to do this');
                return true;
            }
            if (player.inventory.has(PIE_SHELL_ID) && player.inventory.has(lilysPumpkin)) {
                player.inventory.remove(lilysPumpkin, 1);
                player.inventory.remove(PIE_SHELL_ID, 1);
                player.inventory.add(uncookedLilysPumpkinPie, 1);
                player.message('@que@You add the pumpkin to the pie shell');
            }
            return true;
        }

        if (id1 === whitePumpkin || id2 === whitePumpkin) {
            if (player.skills.cooking.current < 80) {
                player.message('You need level 80 cooking to do this');
                return true;
            }
            if (
                player.inventory.has(EGG_ID) &&
                player.inventory.has(MILK_ID) &&
                player.inventory.has(whitePumpkin) &&
                player.inventory.has(PIE_SHELL_ID)
            ) {
                player.inventory.remove(EGG_ID, 1);
                player.inventory.remove(MILK_ID, 1);
                player.inventory.remove(whitePumpkin, 1);
                player.inventory.remove(PIE_SHELL_ID, 1);
                player.inventory.add(uncookedWhitePumpkinPie, 1);
                player.message('@que@You mix the milk, egg, and white pumpkin together into your pie shell');
            } else if (!player.inventory.has(EGG_ID)) {
                player.message('@que@I also need an egg to make a white pumpkin pie');
            } else if (!player.inventory.has(MILK_ID)) {
                player.message('@que@I also need some milk to make a white pumpkin pie');
            }
            return true;
        }

        if (id1 === EGG_ID || id2 === EGG_ID || id1 === MILK_ID || id2 === MILK_ID || id1 === PUMPKIN_ID || id2 === PUMPKIN_ID) {
            if (player.skills.cooking.current < 80) {
                player.message('You need level 80 cooking to do this');
                return true;
            }
            if (
                player.inventory.has(EGG_ID) &&
                player.inventory.has(MILK_ID) &&
                player.inventory.has(PUMPKIN_ID) &&
                player.inventory.has(PIE_SHELL_ID)
            ) {
                player.inventory.remove(EGG_ID, 1);
                player.inventory.remove(MILK_ID, 1);
                player.inventory.remove(PUMPKIN_ID, 1);
                player.inventory.remove(PIE_SHELL_ID, 1);
                player.inventory.add(uncookedPumpkinPie, 1);
                player.message('@que@You mix the milk, egg, and pumpkin together into your pie shell');
            } else if (!player.inventory.has(EGG_ID)) {
                player.message('@que@I also need an egg to make a pumpkin pie');
            } else if (!player.inventory.has(MILK_ID)) {
                player.message('@que@I also need some milk to make a pumpkin pie');
            } else if (!player.inventory.has(PUMPKIN_ID)) {
                if (player.inventory.has(whitePumpkin)) {
                    if (
                        player.inventory.has(EGG_ID) &&
                        player.inventory.has(MILK_ID) &&
                        player.inventory.has(whitePumpkin) &&
                        player.inventory.has(PIE_SHELL_ID)
                    ) {
                        player.inventory.remove(EGG_ID, 1);
                        player.inventory.remove(MILK_ID, 1);
                        player.inventory.remove(whitePumpkin, 1);
                        player.inventory.remove(PIE_SHELL_ID, 1);
                        player.inventory.add(uncookedWhitePumpkinPie, 1);
                        player.message('@que@You mix the milk, egg, and white pumpkin together into your pie shell');
                    }
                } else {
                    player.message('@que@I also need a pumpkin to make a pumpkin pie');
                }
            }
            return true;
        }

        return true;
    }

    const mix = isMixPair(id1, id2);
    if (mix) {
        if (addHarvestingRecipeCache(player, mix.id)) {
            player.message(mix.message);
            // the mixing bowl is never consumed, only the ingredient
            const otherId = id1 === ids().mixingBowl ? id2 : id1;
            player.inventory.remove(otherId, 1);
        } else {
            player.message('Nothing interesting happens');
        }
        return true;
    }

    return false;
}

module.exports = { onInventoryCommand, onUseWithInventory };
