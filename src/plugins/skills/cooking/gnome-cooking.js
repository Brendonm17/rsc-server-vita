// Gnome Restaurant + Gnome Bar minigames: recipe engine, dough moulding, mixing, slicing, baking, cocktails.
// grapefruit ids by name: grapefruit 1354, slices 1364, diced 1365

const items = require('@2003scape/rsc-data/config/items');

// item ids

const OVEN_ID = 119; // Cook's Range object

const GIANNE_DOUGH = 881;
const GNOMEBATTA_DOUGH = 880;
const GNOMEBOWL_DOUGH = 882;
const GNOMECRUNCHIE_DOUGH = 883;
const GNOMEBATTA = 884;
const GNOMEBOWL = 885;
const GNOMECRUNCHIE = 900;
const BURNT_GNOMEBATTA = 886;
const BURNT_GNOMEBOWL = 888;
const BURNT_GNOMECRUNCHIE = 887;

const GNOME_SPICE = 898;
const EQUA_LEAVES = 873;
const KING_WORM = 897;
const TOAD_LEGS = 896;
const CHOCOLATE_BAR = 337;
const CHOCOLATE_DUST = 772;
const CHEESE = 319;
const TOMATO = 320;
const ONION = 241;
const CABBAGE = 18;
const DWELLBERRIES = 765;
const POTATO = 348;
const CREAM = 871;
const PINEAPPLE_CHUNKS = 862;
const DICED_ORANGE = 859;
const LIME_CHUNKS = 864;

const CHEESE_AND_TOMATO_BATTA = 901;
const TOAD_BATTA = 902;
const WORM_BATTA = 904;
const FRUIT_BATTA = 905;
const VEG_BATTA = 906;
const CHOCOLATE_BOMB = 907;
const VEGBALL = 908;
const WORM_HOLE = 909;
const TANGLED_TOADS_LEGS = 910;
const CHOC_CRUNCHIES = 911;
const WORM_CRUNCHIES = 912;
const TOAD_CRUNCHIES = 913;
const SPICE_CRUNCHIES = 914;
const GIANNE_COOK_BOOK = 899;

const KNIFE = 13;
const ORANGE = 857;
const ORANGE_SLICES = 858;
const LIME = 863;
const LIME_SLICES_ID = 865;
const PINEAPPLE = 748;
const FRESH_PINEAPPLE = 861;
const PINEAPPLE_RING = 749;
const LEMON = 855;
const LEMON_SLICES = 856;
const DICED_LEMON = 860;

// cocktail bar
const COCKTAIL_GLASS = 833;
const COCKTAIL_SHAKER = 834;
const HALF_COCKTAIL_GLASS = 853;
const FULL_COCKTAIL_GLASS = 854;
const ODD_LOOKING_COCKTAIL = 867;
const GNOME_COCKTAIL_GUIDE = 851;
const WHISKY = 868;
const VODKA = 869;
const GIN = 870;
const DRUNK_DRAGON = 872;
const SGG = 874;
const CHOCOLATE_SATURDAY = 875;
const BRANDY = 876;
const BLURBERRY_SPECIAL = 877;
const WIZARD_BLIZZARD = 878;
const PINEAPPLE_PUNCH = 879;
const FRUIT_BLAST = 866;
const MILK = 22;
const BUCKET = 21;

// calcProductionSuccessfulLegacy. levelStopFail 36 for every gnome dish

const GNOME_COOK_LEVEL_REQ = 1;
const GNOME_COOK_LEVEL_STOP_FAIL = 36;

function calcProductionSuccessfulLegacy(levelReq, skillLevel, levelStopFail) {
    const roll = 1 + Math.floor(Math.random() * 256);

    if (skillLevel < levelReq) {
        return false;
    }

    const threshold = Math.min(
        256,
        Math.floor(64 + (skillLevel - 1) * (19200.0 / (levelStopFail * 98)))
    );

    return roll <= threshold;
}

function burnGnomeFood(cookingLevel) {
    return !calcProductionSuccessfulLegacy(
        GNOME_COOK_LEVEL_REQ,
        cookingLevel,
        GNOME_COOK_LEVEL_STOP_FAIL
    );
}

// recipe-string cache: each action appends a token to a dash-joined string.
// mix = ingredientId then containerId; solo = own id; trailing ! = completed recipe

function addRecipeCache(
    player,
    cacheKey,
    recipeTable,
    containerId,
    actionId,
    soloGuardId
) {
    let recipeString =
        typeof player.cache[cacheKey] === 'string'
            ? `${player.cache[cacheKey]}-`
            : '';

    const baseIdString =
        containerId === -1 ? `${actionId}` : `${actionId}${containerId}`;

    recipeString += baseIdString;

    // guard: a fresh solo action only starts a recipe when baking gnomecrunchie dough
    // cocktail cache omits soloGuardId (no guard)
    if (
        soloGuardId !== undefined &&
        recipeString.length === 3 &&
        recipeString !== `${soloGuardId}`
    ) {
        return false;
    }

    for (const recipe of recipeTable) {
        if (recipe === `${recipeString}!`) {
            player.cache[cacheKey] = `${recipeString}!`;
            return true;
        }

        if (recipe.startsWith(recipeString)) {
            player.cache[cacheKey] = recipeString;
            return true;
        }
    }

    player.cache[cacheKey] = baseIdString;
    return false;
}

function resetGnomeCooking(player) {
    delete player.cache.gnomeRecipe;
}

function resetGnomeBartending(player) {
    delete player.cache.cocktailRecipe;
}

// GnomeCooking recipeStrings (14): ingredient digits then container digits per mix step, bare id per solo step

const mix = (ingredient, container) => `${ingredient}${container}`;
const solo = (id) => `${id}`;
const recipe = (...steps) => `${steps.join('-')}!`;

const GNOMECRUNCHIE_R = 0;
const CHOC_CRUNCHIE_R = 1;
const WORM_CRUNCHIE_R = 2;
const TOAD_CRUNCHIE_R = 3;
const SPICY_CRUNCHIE_R = 4;
const CHEESE_AND_TOMATO_BATTA_R = 5;
const TOAD_BATTA_R = 6;
const WORM_BATTA_R = 7;
const FRUIT_BATTA_R = 8;
const VEG_BATTA_R = 9;
const CHOC_BOMB_R = 10;
const VEGBALL_R = 11;
const WORM_HOLE_R = 12;
const TANGLED_TOADS_LEGS_R = 13;

const gnomeRecipes = [
    // 0 Gnomecrunchie
    recipe(solo(GNOMECRUNCHIE_DOUGH)),

    // 1 Choc crunchies
    recipe(
        mix(CHOCOLATE_BAR, GIANNE_DOUGH),
        mix(CHOCOLATE_BAR, GIANNE_DOUGH),
        mix(GNOME_SPICE, GIANNE_DOUGH),
        solo(GIANNE_DOUGH),
        solo(GNOMECRUNCHIE_DOUGH),
        mix(CHOCOLATE_DUST, GNOMECRUNCHIE)
    ),

    // 2 Worm crunchies
    recipe(
        mix(GNOME_SPICE, GIANNE_DOUGH),
        mix(KING_WORM, GIANNE_DOUGH),
        mix(KING_WORM, GIANNE_DOUGH),
        mix(EQUA_LEAVES, GIANNE_DOUGH),
        solo(GIANNE_DOUGH),
        solo(GNOMECRUNCHIE_DOUGH),
        mix(GNOME_SPICE, GNOMECRUNCHIE)
    ),

    // 3 Toad crunchies
    recipe(
        mix(GNOME_SPICE, GIANNE_DOUGH),
        mix(TOAD_LEGS, GIANNE_DOUGH),
        mix(TOAD_LEGS, GIANNE_DOUGH),
        solo(GIANNE_DOUGH),
        solo(GNOMECRUNCHIE_DOUGH),
        mix(EQUA_LEAVES, GNOMECRUNCHIE)
    ),

    // 4 Spicy crunchies
    recipe(
        mix(GNOME_SPICE, GIANNE_DOUGH),
        mix(GNOME_SPICE, GIANNE_DOUGH),
        mix(GNOME_SPICE, GIANNE_DOUGH),
        mix(EQUA_LEAVES, GIANNE_DOUGH),
        mix(EQUA_LEAVES, GIANNE_DOUGH),
        solo(GIANNE_DOUGH),
        solo(GNOMECRUNCHIE_DOUGH),
        mix(GNOME_SPICE, GNOMECRUNCHIE)
    ),

    // 5 Cheese and tomato batta
    recipe(
        mix(CHEESE, GNOMEBATTA),
        mix(TOMATO, GNOMEBATTA),
        solo(GNOMEBATTA),
        mix(EQUA_LEAVES, GNOMEBATTA)
    ),

    // 6 Toad batta
    recipe(
        mix(EQUA_LEAVES, TOAD_LEGS),
        mix(GNOME_SPICE, TOAD_LEGS),
        mix(TOAD_LEGS, GNOMEBATTA),
        mix(CHEESE, GNOMEBATTA),
        solo(GNOMEBATTA)
    ),

    // 7 Worm batta
    recipe(
        mix(GNOME_SPICE, KING_WORM),
        mix(KING_WORM, GNOMEBATTA),
        mix(CHEESE, GNOMEBATTA),
        solo(GNOMEBATTA),
        mix(EQUA_LEAVES, GNOMEBATTA)
    ),

    // 8 Fruit batta
    recipe(
        mix(EQUA_LEAVES, GNOMEBATTA),
        mix(EQUA_LEAVES, GNOMEBATTA),
        mix(EQUA_LEAVES, GNOMEBATTA),
        mix(EQUA_LEAVES, GNOMEBATTA),
        solo(GNOMEBATTA),
        mix(PINEAPPLE_CHUNKS, GNOMEBATTA),
        mix(DICED_ORANGE, GNOMEBATTA),
        mix(LIME_CHUNKS, GNOMEBATTA),
        mix(GNOME_SPICE, GNOMEBATTA)
    ),

    // 9 Veg batta
    recipe(
        mix(ONION, GNOMEBATTA),
        mix(TOMATO, GNOMEBATTA),
        mix(TOMATO, GNOMEBATTA),
        mix(CABBAGE, GNOMEBATTA),
        mix(DWELLBERRIES, GNOMEBATTA),
        solo(GNOMEBATTA),
        mix(CHEESE, GNOMEBATTA),
        solo(GNOMEBATTA),
        mix(EQUA_LEAVES, GNOMEBATTA)
    ),

    // 10 Choc bomb
    recipe(
        mix(CHOCOLATE_BAR, GNOMEBOWL),
        mix(CHOCOLATE_BAR, GNOMEBOWL),
        mix(CHOCOLATE_BAR, GNOMEBOWL),
        mix(CHOCOLATE_BAR, GNOMEBOWL),
        mix(EQUA_LEAVES, GNOMEBOWL),
        solo(GNOMEBOWL),
        mix(CREAM, GNOMEBOWL),
        mix(CREAM, GNOMEBOWL),
        mix(CHOCOLATE_DUST, GNOMEBOWL)
    ),

    // 11 VegBall
    recipe(
        mix(ONION, GNOMEBOWL),
        mix(ONION, GNOMEBOWL),
        mix(POTATO, GNOMEBOWL),
        mix(POTATO, GNOMEBOWL),
        mix(GNOME_SPICE, GNOMEBOWL),
        solo(GNOMEBOWL),
        mix(EQUA_LEAVES, GNOMEBOWL)
    ),

    // 12 Worm hole
    recipe(
        mix(KING_WORM, GNOMEBOWL),
        mix(KING_WORM, GNOMEBOWL),
        mix(KING_WORM, GNOMEBOWL),
        mix(KING_WORM, GNOMEBOWL),
        mix(KING_WORM, GNOMEBOWL),
        mix(KING_WORM, GNOMEBOWL),
        mix(ONION, GNOMEBOWL),
        mix(ONION, GNOMEBOWL),
        mix(GNOME_SPICE, GNOMEBOWL),
        solo(GNOMEBOWL),
        mix(EQUA_LEAVES, GNOMEBOWL)
    ),

    // 13 Tangled toads legs
    recipe(
        mix(CHEESE, GNOMEBOWL),
        mix(CHEESE, GNOMEBOWL),
        mix(TOAD_LEGS, GNOMEBOWL),
        mix(TOAD_LEGS, GNOMEBOWL),
        mix(TOAD_LEGS, GNOMEBOWL),
        mix(TOAD_LEGS, GNOMEBOWL),
        mix(TOAD_LEGS, GNOMEBOWL),
        mix(EQUA_LEAVES, GNOMEBOWL),
        mix(EQUA_LEAVES, GNOMEBOWL),
        mix(DWELLBERRIES, GNOMEBOWL),
        mix(GNOME_SPICE, GNOMEBOWL),
        mix(GNOME_SPICE, GNOMEBOWL),
        solo(GNOMEBOWL)
    )
];

// GnomeBartending.recipeStrings (7 cocktails)

const FRUIT_BLAST_R = 0;
const PINEAPPLE_PUNCH_R = 1;
const DRUNK_DRAGON_R = 2;
const SGG_R = 3;
const CHOC_SATURDAY_R = 4;
const BLURBERRY_SPECIAL_R = 5;
const WIZARD_BLIZZARD_R = 6;

const cocktailRecipes = [
    // 0 Fruit blast
    recipe(
        mix(LEMON, COCKTAIL_SHAKER),
        mix(ORANGE, COCKTAIL_SHAKER),
        mix(FRESH_PINEAPPLE, COCKTAIL_SHAKER),
        solo(COCKTAIL_SHAKER),
        mix(LEMON_SLICES, FULL_COCKTAIL_GLASS)
    ),

    // 1 Pineapple punch
    recipe(
        mix(FRESH_PINEAPPLE, COCKTAIL_SHAKER),
        mix(FRESH_PINEAPPLE, COCKTAIL_SHAKER),
        mix(LEMON, COCKTAIL_SHAKER),
        mix(ORANGE, COCKTAIL_SHAKER),
        solo(COCKTAIL_SHAKER),
        mix(PINEAPPLE_CHUNKS, FULL_COCKTAIL_GLASS),
        mix(LIME_CHUNKS, FULL_COCKTAIL_GLASS),
        mix(LIME_SLICES_ID, FULL_COCKTAIL_GLASS)
    ),

    // 2 Drunk dragon
    recipe(
        mix(VODKA, COCKTAIL_SHAKER),
        mix(GIN, COCKTAIL_SHAKER),
        mix(DWELLBERRIES, COCKTAIL_SHAKER),
        solo(COCKTAIL_SHAKER),
        mix(PINEAPPLE_CHUNKS, FULL_COCKTAIL_GLASS),
        mix(CREAM, FULL_COCKTAIL_GLASS),
        solo(FULL_COCKTAIL_GLASS)
    ),

    // 3 Short green guy (SGG)
    recipe(
        mix(VODKA, COCKTAIL_SHAKER),
        mix(LIME, COCKTAIL_SHAKER),
        mix(LIME, COCKTAIL_SHAKER),
        mix(LIME, COCKTAIL_SHAKER),
        solo(COCKTAIL_SHAKER),
        mix(EQUA_LEAVES, FULL_COCKTAIL_GLASS),
        mix(LIME_SLICES_ID, FULL_COCKTAIL_GLASS)
    ),

    // 4 Choc Saturday
    recipe(
        mix(WHISKY, COCKTAIL_SHAKER),
        mix(MILK, COCKTAIL_SHAKER),
        mix(EQUA_LEAVES, COCKTAIL_SHAKER),
        solo(COCKTAIL_SHAKER),
        mix(CHOCOLATE_BAR, FULL_COCKTAIL_GLASS),
        solo(FULL_COCKTAIL_GLASS),
        mix(CREAM, FULL_COCKTAIL_GLASS),
        mix(CHOCOLATE_DUST, FULL_COCKTAIL_GLASS)
    ),

    // 5 Blurberry special
    recipe(
        mix(VODKA, COCKTAIL_SHAKER),
        mix(GIN, COCKTAIL_SHAKER),
        mix(BRANDY, COCKTAIL_SHAKER),
        mix(LEMON, COCKTAIL_SHAKER),
        mix(LEMON, COCKTAIL_SHAKER),
        mix(ORANGE, COCKTAIL_SHAKER),
        solo(COCKTAIL_SHAKER),
        mix(DICED_ORANGE, FULL_COCKTAIL_GLASS),
        mix(DICED_LEMON, FULL_COCKTAIL_GLASS),
        mix(LIME_SLICES_ID, FULL_COCKTAIL_GLASS),
        mix(EQUA_LEAVES, FULL_COCKTAIL_GLASS)
    ),

    // 6 Wizard blizzard
    recipe(
        mix(FRESH_PINEAPPLE, COCKTAIL_SHAKER),
        mix(ORANGE, COCKTAIL_SHAKER),
        mix(LEMON, COCKTAIL_SHAKER),
        mix(LIME, COCKTAIL_SHAKER),
        mix(VODKA, COCKTAIL_SHAKER),
        mix(VODKA, COCKTAIL_SHAKER),
        mix(GIN, COCKTAIL_SHAKER),
        solo(COCKTAIL_SHAKER),
        mix(PINEAPPLE_CHUNKS, FULL_COCKTAIL_GLASS),
        mix(LIME_SLICES_ID, FULL_COCKTAIL_GLASS)
    )
];

// GnomeCooking mould: Gianne dough -> batta/bowl/crunchie dough

const UNFINISHED_DISH_IDS = [
    GNOMEBATTA_DOUGH,
    GNOMEBOWL_DOUGH,
    GNOMECRUNCHIE_DOUGH,
    GNOMEBATTA,
    GNOMEBOWL,
    GNOMECRUNCHIE
];

async function mouldDough(player, item) {
    const { world } = player;

    if (UNFINISHED_DISH_IDS.some((id) => player.inventory.has(id))) {
        player.message(
            'you need to finish, eat or drop the unfinished dish you hold'
        );
        await world.sleepTicks(3);
        player.message("before you can make another - giannes rules");
        return;
    }

    player.message('which shape would you like to mould');

    const choice = await player.ask([
        'gnomebatta',
        'gnomebowl',
        'gnomecrunchie'
    ]);

    const cookingLevel = player.skills.cooking.current;

    if (choice === 0) {
        if (cookingLevel < 25) {
            player.message(
                "you need a cooking level of 25 to mould dough batta's"
            );
            return;
        }

        player.sendBubble(item.id);
        player.inventory.remove(item.id, 1);
        player.message('you attempt to mould the dough into a gnomebatta');
        await world.sleepTicks(5);
        player.message('You manage to make some gnome batta dough');
        player.inventory.add(GNOMEBATTA_DOUGH, 1);
        addRecipeCache(
            player,
            'gnomeRecipe',
            gnomeRecipes,
            -1,
            GIANNE_DOUGH,
            GNOMECRUNCHIE_DOUGH
        );
    } else if (choice === 1) {
        if (cookingLevel < 30) {
            player.message(
                'you need a cooking level of 30 to mould dough bowls'
            );
            return;
        }

        player.sendBubble(item.id);
        player.inventory.remove(item.id, 1);
        player.message('you attempt to mould the dough into a gnome bowl');
        await world.sleepTicks(5);
        player.message('You manage to make some gnome bowl dough');
        player.inventory.add(GNOMEBOWL_DOUGH, 1);
        addRecipeCache(
            player,
            'gnomeRecipe',
            gnomeRecipes,
            -1,
            GIANNE_DOUGH,
            GNOMECRUNCHIE_DOUGH
        );
    } else if (choice === 2) {
        if (cookingLevel < 15) {
            player.message('you need a cooking level of 15 to mould crunchies');
            return;
        }

        player.sendBubble(item.id);
        player.inventory.remove(item.id, 1);
        player.message('you attempt to mould the dough into gnome crunchies');
        await world.sleepTicks(5);
        player.message('You manage to make some gnome crunchies dough');
        player.inventory.add(GNOMECRUNCHIE_DOUGH, 1);
        addRecipeCache(
            player,
            'gnomeRecipe',
            gnomeRecipes,
            -1,
            GIANNE_DOUGH,
            GNOMECRUNCHIE_DOUGH
        );
    }

    player.addExperience('cooking', 100);
}

// GnomeCooking bake: dough/re-bake -> oven, object 119

const GNOME_COOK_TABLE = new Map([
    [
        GNOMEBATTA_DOUGH,
        {
            cooked: GNOMEBATTA,
            burnt: BURNT_GNOMEBATTA,
            xp: 120,
            messages: [
                'You cook the gnome batta in the oven...',
                'You remove the gnome batta from the oven',
                'You accidentally burn the gnome batta'
            ]
        }
    ],
    [
        GNOMEBOWL_DOUGH,
        {
            cooked: GNOMEBOWL,
            burnt: BURNT_GNOMEBOWL,
            xp: 120,
            messages: [
                'You cook the gnome bowl in the oven...',
                'You remove the gnome bowl from the oven',
                // sic: message says bbowl
                'You accidentally burn the gnome bbowl'
            ]
        }
    ],
    [
        GNOMECRUNCHIE_DOUGH,
        {
            cooked: GNOMECRUNCHIE,
            burnt: BURNT_GNOMECRUNCHIE,
            xp: 120,
            messages: [
                'You cook the gnome crunchie in the oven...',
                'You remove the gnome crunchie from the oven',
                'You accidentally burn the gnome crunchie'
            ]
        }
    ],
    [
        GNOMEBATTA,
        {
            cooked: GNOMEBATTA,
            burnt: BURNT_GNOMEBATTA,
            xp: 120,
            messages: [
                'You cook the gnome batta in the oven...',
                'You remove the gnome batta from the oven',
                'You accidentally burn the gnome batta'
            ]
        }
    ],
    [
        GNOMEBOWL,
        {
            cooked: GNOMEBOWL,
            burnt: BURNT_GNOMEBOWL,
            xp: 120,
            messages: [
                'You cook the gnome bowl in the oven...',
                'You remove the gnome bowl from the oven',
                'You accidentally burn the gnome bbowl'
            ]
        }
    ]
]);

async function bakeGnomeDish(player, entry, item) {
    const { world } = player;

    player.sendBubble(item.id);
    player.sendSound('cooking');

    if (!player.inventory.has(item.id)) {
        return true;
    }

    player.inventory.remove(item.id, 1);
    player.message(entry.messages[0]);
    await world.sleepTicks(5);

    const cookingLevel = player.skills.cooking.current;

    if (burnGnomeFood(cookingLevel)) {
        player.inventory.add(entry.burnt, 1);
        player.message(entry.messages[2]);
        resetGnomeCooking(player);
        return true;
    }

    player.message(entry.messages[1]);

    // first bake of gnomebatta/gnomebowl dough hands back cooked item, no recipe cache
    // gnomecrunchie dough excluded, its first bake completes recipeStrings[0]
    if (item.id === GNOMEBATTA_DOUGH || item.id === GNOMEBOWL_DOUGH) {
        player.inventory.add(entry.cooked, 1);
        return true;
    }

    const recipeSuccess = addRecipeCache(
        player,
        'gnomeRecipe',
        gnomeRecipes,
        -1,
        item.id,
        GNOMECRUNCHIE_DOUGH
    );

    if (recipeSuccess) {
        player.addExperience('cooking', entry.xp);

        const recipe = player.cache.gnomeRecipe;

        if (recipe === gnomeRecipes[TOAD_BATTA_R]) {
            player.inventory.add(TOAD_BATTA, 1);
            resetGnomeCooking(player);
        } else if (recipe === gnomeRecipes[TANGLED_TOADS_LEGS_R]) {
            player.inventory.add(TANGLED_TOADS_LEGS, 1);
            resetGnomeCooking(player);
        } else if (
            entry.cooked === GNOMEBATTA ||
            entry.cooked === GNOMEBOWL ||
            entry.cooked === GNOMECRUNCHIE
        ) {
            // always true here, dough base already returned
            player.inventory.add(entry.cooked, 1);
        }
    }

    // recipeSuccess false: item already removed, nothing returned

    return true;
}

// GnomeBartending heat: full/half/odd cocktail glass -> oven, object 119

async function heatCocktail(player, item) {
    const { world } = player;

    player.message('you briefly place the drink in the oven');
    await world.sleepTicks(3);
    player.message('you remove the warm drink');

    if (item.id === FULL_COCKTAIL_GLASS) {
        const recipeSuccess = addRecipeCache(
            player,
            'cocktailRecipe',
            cocktailRecipes,
            -1,
            item.id
        );

        if (recipeSuccess) {
            if (player.cache.cocktailRecipe === cocktailRecipes[DRUNK_DRAGON_R]) {
                player.inventory.remove(item.id, 1);
                player.inventory.add(DRUNK_DRAGON, 1);
                resetGnomeBartending(player);
            }
        } else {
            player.inventory.remove(item.id, 1);
            player.inventory.add(ODD_LOOKING_COCKTAIL, 1);
            resetGnomeBartending(player);
        }
    }

    // HALF_COCKTAIL_GLASS / ODD_LOOKING_COCKTAIL: no state change

    return true;
}

// onUseWithGameObject: bake (GnomeCooking) + heat (GnomeBartending)

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== OVEN_ID) {
        return false;
    }

    const cookEntry = GNOME_COOK_TABLE.get(item.id);

    if (cookEntry) {
        return bakeGnomeDish(player, cookEntry, item);
    }

    if (
        item.id === FULL_COCKTAIL_GLASS ||
        item.id === HALF_COCKTAIL_GLASS ||
        item.id === ODD_LOOKING_COCKTAIL
    ) {
        return heatCocktail(player, item);
    }

    return false;
}

// GnomeBartending.pourGlass: cocktail shaker -> glass

async function pourGlass(player) {
    const { world } = player;

    if (!player.inventory.has(COCKTAIL_GLASS)) {
        player.message("first you'll need a glass to pour the drink into");
        return;
    }

    const currentRecipe =
        typeof player.cache.cocktailRecipe === 'string'
            ? player.cache.cocktailRecipe
            : '';

    if (currentRecipe !== '' && !currentRecipe.includes(`-${COCKTAIL_SHAKER}`)) {
        const full = cocktailRecipes.some((r) =>
            r.startsWith(`${currentRecipe}-${COCKTAIL_SHAKER}`)
        );

        player.inventory.remove(COCKTAIL_GLASS, 1);
        player.inventory.add(full ? FULL_COCKTAIL_GLASS : HALF_COCKTAIL_GLASS, 1);
        addRecipeCache(
            player,
            'cocktailRecipe',
            cocktailRecipes,
            -1,
            COCKTAIL_SHAKER
        );
        player.message('you pour the contents into a glass');
    } else {
        player.message('you need to put some contents into the shaker');
    }

    await world.sleepTicks(1);
}

// GnomeSlice: knife + fruit -> slice/dice menu

const SLICEABLE = [
    { fruit: ORANGE, slice: ORANGE_SLICES, diced: DICED_ORANGE, name: 'orange' },
    { fruit: LIME, slice: LIME_SLICES_ID, diced: LIME_CHUNKS, name: 'lime' },
    { fruit: LEMON, slice: LEMON_SLICES, diced: DICED_LEMON, name: 'lemon' }
    // grapefruit ids not known at module load, resolved lazily below
];

// grapefruit ids: resolved by name, cached
let GRAPEFRUIT_IDS = null;

function resolveGrapefruitIds() {
    if (GRAPEFRUIT_IDS) {
        return GRAPEFRUIT_IDS;
    }

    const nameToId = {};

    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];

        if (def && def.name) {
            const key = def.name.toLowerCase();

            if (!(key in nameToId)) {
                nameToId[key] = id;
            }
        }
    }

    GRAPEFRUIT_IDS = {
        fruit: nameToId['grapefruit'],
        slice: nameToId['grapefruit slices'],
        diced: nameToId['diced grapefruit']
    };

    return GRAPEFRUIT_IDS;
}

// SLICEABLE-shaped entry, or null if grapefruit unresolvable
function grapefruitEntry() {
    const ids = resolveGrapefruitIds();

    if (
        typeof ids.fruit !== 'number' ||
        typeof ids.slice !== 'number' ||
        typeof ids.diced !== 'number'
    ) {
        return null;
    }

    return {
        fruit: ids.fruit,
        slice: ids.slice,
        diced: ids.diced,
        name: 'grapefruit'
    };
}

async function slicePineapple(player, pineappleId) {
    player.message('you can slice or dice the pineapple');

    const choice = await player.ask(['slice pineapple', 'dice pineapple']);

    if (choice === 0) {
        player.message('you slice the pineapple into rings');
        player.inventory.remove(pineappleId, 1);
        // sic: one pineapple yields 4 rings (adds 1 then 3)
        player.inventory.add(PINEAPPLE_RING, 1);
        player.inventory.add(PINEAPPLE_RING, 3);
    } else if (choice === 1) {
        player.message('you cut the pineapple into chunks');
        player.inventory.remove(pineappleId, 1);
        player.inventory.add(PINEAPPLE_CHUNKS, 1);
    }
}

async function sliceFruit(player, item1, item2) {
    const knife = item1.id === KNIFE ? item1 : item2;
    const other = item1.id === KNIFE ? item2 : item1;

    if (other.id === PINEAPPLE || other.id === FRESH_PINEAPPLE) {
        await slicePineapple(player, other.id);
        return true;
    }

    const grapefruit = grapefruitEntry();
    const entry =
        SLICEABLE.find((s) => s.fruit === other.id) ||
        (grapefruit && other.id === grapefruit.fruit ? grapefruit : null);

    if (!entry) {
        return false;
    }

    player.message(`you can slice or dice the ${entry.name}`);

    const choice = await player.ask([
        `slice ${entry.name}`,
        `dice ${entry.name}`
    ]);

    if (choice === 0) {
        player.message(`you slice the ${entry.name}`);
        player.inventory.remove(entry.fruit, 1);
        player.inventory.add(entry.slice, 1);
    } else if (choice === 1) {
        player.message(`you cut the ${entry.name} into chunks`);
        player.inventory.remove(entry.fruit, 1);
        player.inventory.add(entry.diced, 1);
    }

    return true;
}

function isKnifeFruitPair(item1, item2) {
    if (item1.id !== KNIFE && item2.id !== KNIFE) {
        return false;
    }

    const otherId = item1.id === KNIFE ? item2.id : item1.id;
    const grapefruit = grapefruitEntry();

    return (
        otherId === ORANGE ||
        otherId === LIME ||
        otherId === LEMON ||
        otherId === PINEAPPLE ||
        otherId === FRESH_PINEAPPLE ||
        (grapefruit !== null && otherId === grapefruit.fruit)
    );
}

// GnomeMixing: ingredient -> gnome dish/dough/toad legs

const GNOME_MIX = [
    { container: GNOMEBATTA, ingredient: CHEESE, message: 'you crumble the cheese over the gnome batta' },
    { container: GNOMEBATTA, ingredient: TOMATO, message: 'you add the tomato to the gnome batta' },
    { container: GNOMEBATTA, ingredient: EQUA_LEAVES, message: 'you sprinkle the equa leaves over the gnome batta' },
    { container: GNOMEBOWL, ingredient: CHOCOLATE_BAR, message: 'you add the chocolate to the dough bowl' },
    { container: GNOMEBOWL, ingredient: EQUA_LEAVES, message: 'you add the equa leaves to the dough bowl' },
    { container: GNOMEBOWL, ingredient: CREAM, message: 'you pour thick cream over the gnome bowl' },
    { container: GNOMEBOWL, ingredient: CHOCOLATE_DUST, message: 'you sprinkle the chocolate dust over the gnome bowl' },
    { container: TOAD_LEGS, ingredient: EQUA_LEAVES, message: 'you mix the equa leaves with your toads legs' },
    { container: TOAD_LEGS, ingredient: GNOME_SPICE, message: 'you sprinkle the spice over the toads legs' },
    { container: GNOMEBATTA, ingredient: TOAD_LEGS, message: 'you add the toads legs to the gnome batta' },
    { container: GNOMEBOWL, ingredient: KING_WORM, message: 'you add the worm to the dough bowl' },
    { container: GNOMEBOWL, ingredient: ONION, message: 'you add the onion to the dough bowl' },
    { container: GNOMEBOWL, ingredient: GNOME_SPICE, message: 'you sprinkle some gnome spice over the dough bowl' },
    { container: GIANNE_DOUGH, ingredient: GNOME_SPICE, message: 'you sprinkle the spice into the dough' },
    { container: GIANNE_DOUGH, ingredient: TOAD_LEGS, message: "you mix the toad's legs into the dough" },
    { container: GNOMECRUNCHIE, ingredient: EQUA_LEAVES, message: 'you sprinkle some leaves over the crunchies' },
    { container: KING_WORM, ingredient: GNOME_SPICE, message: 'you sprinkle some gnome spice over your worm' },
    { container: GNOMEBATTA, ingredient: KING_WORM, message: 'you add the king worms to the gnome batta' },
    { container: GNOMEBATTA, ingredient: ONION, message: 'you add the onion to the gnome batta' },
    { container: GNOMEBATTA, ingredient: CABBAGE, message: 'you add the Cabbage to the gnome batta' },
    { container: GNOMEBATTA, ingredient: DWELLBERRIES, message: 'you add the dwell berries to the gnome batta' },
    { container: GIANNE_DOUGH, ingredient: CHOCOLATE_BAR, message: 'you crumble the chocolate into the dough' },
    { container: GNOMECRUNCHIE, ingredient: CHOCOLATE_DUST, message: 'you sprinkle the chocolate dust over the crunchie' },
    { container: GNOMEBOWL, ingredient: POTATO, message: 'you add the potato to the dough bowl' },
    { container: GNOMEBOWL, ingredient: TOAD_LEGS, message: 'you add the taods legs to the gnome bowl' },
    { container: GNOMEBOWL, ingredient: CHEESE, message: 'you add the cheese to the dough bowl' },
    { container: GNOMEBOWL, ingredient: DWELLBERRIES, message: 'you add the dwell berries to the dough bowl' },
    { container: GIANNE_DOUGH, ingredient: EQUA_LEAVES, message: 'you mix the equaleaves into the dough' },
    { container: GIANNE_DOUGH, ingredient: KING_WORM, message: 'you mix the worm into the dough' },
    { container: GNOMECRUNCHIE, ingredient: GNOME_SPICE, message: 'you sprinkle some spice over the crunchies' },
    { container: GNOMEBATTA, ingredient: DICED_ORANGE, message: 'you sprinkle the orange chunks over the gnome batta' },
    { container: GNOMEBATTA, ingredient: LIME_CHUNKS, message: 'you sprinkle the lime chunks over the gnome batta' },
    { container: GNOMEBATTA, ingredient: PINEAPPLE_CHUNKS, message: 'you sprinkle the pineapple chunks over the gnome batta' },
    { container: GNOMEBATTA, ingredient: GNOME_SPICE, message: 'you sprinkle the gnome spice over the gnome batta' }
];

// dish given when a MIX step completes a recipe
// TOAD_BATTA, TANGLED_TOADS_LEGS, plain GNOMECRUNCHIE complete via BAKE instead, absent here
const GNOME_MIX_COMPLETION = {
    [CHOC_CRUNCHIE_R]: CHOC_CRUNCHIES,
    [WORM_CRUNCHIE_R]: WORM_CRUNCHIES,
    [TOAD_CRUNCHIE_R]: TOAD_CRUNCHIES,
    [SPICY_CRUNCHIE_R]: SPICE_CRUNCHIES,
    [CHEESE_AND_TOMATO_BATTA_R]: CHEESE_AND_TOMATO_BATTA,
    [WORM_BATTA_R]: WORM_BATTA,
    [FRUIT_BATTA_R]: FRUIT_BATTA,
    [VEG_BATTA_R]: VEG_BATTA,
    [CHOC_BOMB_R]: CHOCOLATE_BOMB,
    [VEGBALL_R]: VEGBALL,
    [WORM_HOLE_R]: WORM_HOLE
};

function findMix(table, item1, item2) {
    return table.find(
        (entry) =>
            (item1.id === entry.container && item2.id === entry.ingredient) ||
            (item2.id === entry.container && item1.id === entry.ingredient)
    );
}

function applyGnomeMix(player, entry) {
    if (!player.inventory.has(entry.ingredient)) {
        return;
    }

    if (entry.ingredient !== GNOME_SPICE) {
        player.inventory.remove(entry.ingredient, 1);
    }

    addRecipeCache(
        player,
        'gnomeRecipe',
        gnomeRecipes,
        entry.container,
        entry.ingredient,
        GNOMECRUNCHIE_DOUGH
    );

    const recipe =
        typeof player.cache.gnomeRecipe === 'string'
            ? player.cache.gnomeRecipe
            : '';

    if (recipe.endsWith('!')) {
        player.inventory.remove(entry.container, 1);

        const index = gnomeRecipes.indexOf(recipe);
        const finished = GNOME_MIX_COMPLETION[index];

        if (finished !== undefined) {
            player.inventory.add(finished, 1);
        }

        resetGnomeCooking(player);
    }

    player.message(entry.message);
}

// DrinkMixing: ingredient -> cocktail shaker/glass

const DRINK_MIX = [
    { container: COCKTAIL_SHAKER, ingredient: LEMON, messages: ['you squeeze the juice from the lemon...', '....into your cocktail shaker and shake well'] },
    { container: COCKTAIL_SHAKER, ingredient: ORANGE, messages: ['you squeeze the juice from the orange...', '....into your cocktail shaker and shake well'] },
    { container: COCKTAIL_SHAKER, ingredient: FRESH_PINEAPPLE, messages: ['you squeeze the juice from the pineapple...', '....into your cocktail shaker and shake well'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: LEMON_SLICES, messages: ['you place the lemon slices on the edge of the glass'] },
    { container: COCKTAIL_SHAKER, ingredient: VODKA, messages: ['you pour the vodka into the cocktail shaker', 'you shake the container'] },
    { container: COCKTAIL_SHAKER, ingredient: GIN, messages: ['you pour the gin into the cocktail shaker', 'you shake the container'] },
    { container: COCKTAIL_SHAKER, ingredient: DWELLBERRIES, messages: ['you squeeze the juice from the dwellberries...', '....into your cocktail shaker and shake well'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: PINEAPPLE_CHUNKS, messages: ['you add the pineapple chunks to the drink'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: CREAM, messages: ['you pour the thick cream into the drink'] },
    { container: COCKTAIL_SHAKER, ingredient: LIME, messages: ['you squeeze the juice from the lime...', '....into your cocktail shaker and shake well'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: EQUA_LEAVES, messages: ['you sprinkle the leaves over the drink'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: LIME_SLICES_ID, messages: ['you place the lime slices on the edge of the glass'] },
    { container: COCKTAIL_SHAKER, ingredient: WHISKY, messages: ['you pour the whisky into the cocktail shaker', 'you shake the container'] },
    { container: COCKTAIL_SHAKER, ingredient: MILK, messages: ['you pour the milk into the cocktail shaker', 'and shake thoroughly'] },
    { container: COCKTAIL_SHAKER, ingredient: EQUA_LEAVES, messages: ['you sprinkle the equa leaves into the shaker', 'and shake thoroughly'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: CHOCOLATE_BAR, messages: ['you crumble the chocolate into the drink'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: CHOCOLATE_DUST, messages: ['you sprinkle the chocolate dust over the drink'] },
    { container: COCKTAIL_SHAKER, ingredient: BRANDY, messages: ['you pour the brandy into the cocktail shaker', 'you shake the container'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: DICED_ORANGE, messages: ['you add the diced orange to the drink'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: DICED_LEMON, messages: ['you add the diced lemon to the drink'] },
    { container: FULL_COCKTAIL_GLASS, ingredient: LIME_CHUNKS, messages: ['you add the lime chunks to the drink'] }
];

const DRINK_MIX_COMPLETION = {
    [FRUIT_BLAST_R]: FRUIT_BLAST,
    [PINEAPPLE_PUNCH_R]: PINEAPPLE_PUNCH,
    [SGG_R]: SGG,
    [CHOC_SATURDAY_R]: CHOCOLATE_SATURDAY,
    [BLURBERRY_SPECIAL_R]: BLURBERRY_SPECIAL,
    [WIZARD_BLIZZARD_R]: WIZARD_BLIZZARD
    // DRUNK_DRAGON completes via heat step, not mix
};

const UNFINISHED_COCKTAIL_IDS = [
    FULL_COCKTAIL_GLASS,
    HALF_COCKTAIL_GLASS,
    ODD_LOOKING_COCKTAIL
];

async function applyDrinkMix(player, entry) {
    const { world } = player;

    if (
        entry.container === COCKTAIL_SHAKER &&
        UNFINISHED_COCKTAIL_IDS.some((id) => player.inventory.has(id))
    ) {
        player.message(
            'you need to finish, drink or drop your unfinished cocktail'
        );
        player.message("before you can start another - blurberry's rules");
        return;
    }

    if (!player.inventory.has(entry.ingredient)) {
        return;
    }

    player.message(entry.messages[0]);
    await world.sleepTicks(3);

    // sic: milk becomes an empty bucket, not consumed
    if (entry.ingredient === MILK) {
        player.inventory.remove(MILK, 1);
        player.inventory.add(BUCKET, 1);
    } else {
        player.inventory.remove(entry.ingredient, 1);
    }

    addRecipeCache(
        player,
        'cocktailRecipe',
        cocktailRecipes,
        entry.container,
        entry.ingredient
    );

    const recipeString =
        typeof player.cache.cocktailRecipe === 'string'
            ? player.cache.cocktailRecipe
            : '';

    if (recipeString.endsWith('!')) {
        player.inventory.remove(entry.container, 1);

        const index = cocktailRecipes.indexOf(recipeString);
        const finished = DRINK_MIX_COMPLETION[index];

        if (finished !== undefined) {
            player.inventory.add(finished, 1);
        }

        resetGnomeBartending(player);
    } else {
        const someRecipe = cocktailRecipes.some((r) =>
            r.startsWith(recipeString)
        );

        if (entry.container === FULL_COCKTAIL_GLASS && !someRecipe) {
            player.inventory.remove(entry.container, 1);
            player.inventory.add(ODD_LOOKING_COCKTAIL, 1);
            resetGnomeBartending(player);
        }
    }

    if (entry.messages.length > 1) {
        player.message(entry.messages[1]);
    }
}

// onUseWithInventory: GnomeMixing + DrinkMixing + GnomeSlice

async function onUseWithInventory(player, item1, item2) {
    const gnomeMatch = findMix(GNOME_MIX, item1, item2);

    if (gnomeMatch) {
        applyGnomeMix(player, gnomeMatch);
        return true;
    }

    const drinkMatch = findMix(DRINK_MIX, item1, item2);

    if (drinkMatch) {
        await applyDrinkMix(player, drinkMatch);
        return true;
    }

    if (isKnifeFruitPair(item1, item2)) {
        return sliceFruit(player, item1, item2);
    }

    return false;
}

// onInventoryCommand: mould Gianne dough / open cookbook and cocktail guide / pour the shaker

// sendBox lines as sequential player.message() calls; first line keeps @yel@ tag
const COOKBOOK_PAGES = {
    battas: [
        'cheese and tomato batta',
        'toad batta',
        'worm batta',
        'fruit batta',
        'veg batta'
    ],
    bakes: ['choc bomb', 'veg ball', 'wormhole', 'tangled toads legs'],
    crunchies: [
        'choc crunchies',
        'worm crunchies',
        'toad crunchies',
        'spice crunchies'
    ]
};

const COOKBOOK_TEXT = {
    'cheese and tomato batta': [
        '@yel@Cheese and tomato batta',
        'Make some gnome batta dough from the Gianne dough',
        'Bake the gnome batta, once removed place cheese and then tomato on top',
        'Place batta in oven once more untill cheese has melted, remove and top with equaleaves.'
    ],
    'toad batta': [
        '@yel@Toad batta',
        'Make some gnome batta dough from the Gianne dough',
        "Bake the gnome batta, mix some equa leaves with your toad's legs and then add some gnomespice",
        'Place the seasoned toads legs on the batta, add cheese and bake once more.'
    ],
    'worm batta': [
        '@yel@Worm batta',
        'Make some gnome batta dough from the Gianne dough',
        'Bake the gnome batta, mix some gnomespice with a king worm',
        'Place the seasoned worm on the batta, add cheese and bake once more',
        'Remove from oven and finish with a sprinkle of equaleaves...yum.'
    ],
    'fruit batta': [
        '@yel@Fruit batta',
        'Make some gnome batta dough from the Gianne dough',
        'Bake the gnome batta and remove from oven, then lay four sprigs of equa leaves on the batta and bake once more',
        'Add chunks of pineapple, orange and lime then finish with a sprinkle of gnomespice.'
    ],
    'veg batta': [
        '@yel@Veg Batta',
        'Make some gnome batta dough from the Gianne dough',
        'Bake the gnome batta then add an onion, two tomatos, one cabbage and some dwellberrys, next place the batta in the oven',
        'Add some cheese and place in the oven once more',
        'To finish add a sprinkle of equa leaves.'
    ],
    'choc bomb': [
        '@yel@Choc bomb',
        'Make some gnomebowl dough from the Gianne dough',
        'Bake the gnome bowl',
        'Add to the gnomebowl four bars of chocolate and one sprig of equaleaves',
        'Bake the gnome bowl in an oven',
        'Next add two portions of cream and finish with a sprinkle of chocolate dust.'
    ],
    'veg ball': [
        '@yel@Vegball',
        'Make some gnomebowl dough from the Gianne dough',
        'Bake the gnomebowl',
        'Add two onions,two potatoes and some gnome spice',
        'Bake the gnomebowl once more',
        'To finish sprinkle with equaleaves'
    ],
    wormhole: [
        '@yel@Worm hole',
        'Make some gnomebowl dough from the Gianne dough',
        'Bake the gnomebowl',
        'Add six king worms, two onions and some gnome spice',
        'Bake the gnomebowl once more',
        'To finish sprinkle with equaleaves'
    ],
    'tangled toads legs': [
        '@yel@Tangled toads legs',
        'Make some gnomebowl dough from the Gianne dough',
        'Bake the gnomebowl',
        "Add two portions of cheese, five pairs of toad's legs, two sprigs of equa leaves, some dwell berries and two sprinkle's of gnomespice",
        'Bake the gnomebowl once more'
    ],
    'choc crunchies': [
        '@yel@choc crunchies',
        'Mix some gnome spice and two bars of chocolate with the Gianne dough',
        'Use dough to make gnomecrunchie dough',
        'Bake in oven',
        'Add of sprinkle of chocolate dust'
    ],
    'worm crunchies': [
        '@yel@worm crunchies',
        'Mix some gnome spice, two king worms and some equa leaves with the Gianne dough',
        'Use dough to make gnomecrunchie dough',
        'Bake in oven',
        'Add of sprinkle of gnome spice'
    ],
    'toad crunchies': [
        '@yel@toad crunchies',
        "Mix some gnome spice and two pair's of toads legs with the Gianne dough",
        'Use dough to make gnomecrunchie dough',
        'Bake in oven',
        'Add of sprinkle of equa leaves'
    ],
    'spice crunchies': [
        '@yel@spice crunchies',
        'Mix three sprinkles of gnomespice and two sprigs of equa leaves with Gianne dough',
        'Use dough to make gnomecrunchie dough',
        'Bake in oven',
        'Add of sprinkle of gnome spice'
    ]
};

const COCKTAIL_GUIDE_TEXT = {
    'fruit blast': [
        '@yel@Fruit blast',
        'Mix the juice of one lemon, one orange and one pineapple in the shaker',
        'Pour into glass and top with slices of lemon.'
    ],
    'pineapple punch': [
        '@yel@Pineapple Punch',
        'mix the juice of two pineapples with the juice of one lemon and one orange',
        'pour the mix into a glass and add diced pineapple followed by diced lime',
        'top drink with one slice of lime'
    ],
    drunkdragon: [
        '@yel@Drunk Dragon',
        'Mix vodka with gin and dwellberry juice',
        'Pour the mixture into a glass and add a diced pineapple.Next add a generous portion of cream',
        'Heat the drink briefly in a warm oven.. yum.'
    ],
    sgg: [
        '@yel@s g g - short green guy',
        'Mix vodka with the juice of three limes and pour into a glass',
        'sprinkle equa leaves over the top of the drink',
        'Finally add a slice of lime to finish the drink'
    ],
    'choc saturday': [
        '@yel@Choc Saturday',
        'Mix together whiskey, milk, equa leaves',
        'Pour mixture into a glass add some chocolate and briefly heat in the oven',
        'Then add a generous helping of cream',
        'Finish of the drink with sprinkled chocolate dust'
    ],
    'blurberry special': [
        '@yel@Blurberry Special',
        'Mix together vodka, gin and brandy',
        'Add to this the juice of two lemons and one orange and pour into the glass',
        'next add to the glass orange chunks and then lemon chunks',
        'Finish of with one lime slice and then add a sprinkling of equa leaves'
    ],
    'wizard blizzard': [
        '@yel@Wizard Blizzard',
        'thoroughly mix together the juice of one pinapple, one orange, one lemon and one lime',
        'Add to this two measures of vodka and one measure of gin',
        'Pour the mixture into a glass, top with pineapple chunks and then add slices of lime'
    ]
};

function sendPages(player, lines) {
    for (const line of lines) {
        player.message(line);
    }
}

async function openCookBook(player) {
    player.message("you open aluft's cook book");
    player.message('inside are various gnome dishes');

    const menu = await player.ask(['gnomebattas', 'gnomebakes', 'gnomecrunchies']);

    let section;
    let names;

    if (menu === 0) {
        section = 'battas';
        names = COOKBOOK_PAGES.battas;
    } else if (menu === 1) {
        section = 'bakes';
        names = COOKBOOK_PAGES.bakes;
    } else if (menu === 2) {
        section = 'crunchies';
        names = COOKBOOK_PAGES.crunchies;
    } else {
        return;
    }

    const choice = await player.ask(names);

    if (choice === -1 || choice === undefined) {
        return;
    }

    sendPages(player, COOKBOOK_TEXT[names[choice]]);
}

async function openCocktailGuide(player) {
    player.message("you open blurberry's cocktail book");
    player.message('inside are a list of cocktails');

    const menu = await player.ask(['non alcoholic', 'alcoholic']);

    if (menu === 0) {
        const names = ['fruit blast', 'pineapple punch'];
        const choice = await player.ask(names);
        sendPages(player, COCKTAIL_GUIDE_TEXT[names[choice]]);
    } else if (menu === 1) {
        const names = [
            'drunkdragon',
            'sgg',
            'choc saturday',
            'blurberry special',
            'wizard blizzard'
        ];
        const choice = await player.ask(names);
        sendPages(player, COCKTAIL_GUIDE_TEXT[names[choice]]);
    }
}

async function onInventoryCommand(player, item) {
    if (item.id === GIANNE_DOUGH) {
        await mouldDough(player, item);
        return true;
    }

    if (item.id === GIANNE_COOK_BOOK) {
        await openCookBook(player);
        return true;
    }

    if (item.id === GNOME_COCKTAIL_GUIDE) {
        await openCocktailGuide(player);
        return true;
    }

    if (item.id === COCKTAIL_SHAKER) {
        await pourGlass(player);
        return true;
    }

    return false;
}

// onDropItem: resets in-progress recipe cache, never blocks the drop

function onDropItem(player, item) {
    if (
        item.id === GNOMECRUNCHIE ||
        item.id === GNOMEBOWL ||
        item.id === GNOMEBATTA
    ) {
        resetGnomeCooking(player);
    } else if (
        item.id === FULL_COCKTAIL_GLASS ||
        item.id === HALF_COCKTAIL_GLASS ||
        item.id === ODD_LOOKING_COCKTAIL
    ) {
        resetGnomeBartending(player);
    }

    return false;
}

module.exports = {
    onUseWithGameObject,
    onUseWithInventory,
    onInventoryCommand,
    onDropItem,
    // job/reward item ids
    _internal: {
        gnomeRecipes,
        cocktailRecipes,
        addRecipeCache,
        GNOMEBATTA_DOUGH,
        GNOMEBOWL_DOUGH,
        GNOMECRUNCHIE_DOUGH,
        GIANNE_DOUGH,
        OVEN_ID,
        COCKTAIL_SHAKER,
        COCKTAIL_GLASS
    }
};
