const edible = require('@2003scape/rsc-data/edible');
const items = require('@2003scape/rsc-data/config/items');
const skillCapes = require('../skills/skill-capes');

// custom food (ids 1290+, src/sp/custom-items.json): the rsc-data edible table stops at id 1269, so these carry their
// own heal values. CUSTOM_EDIBLE_HEALS = flat heals, CUSTOM_EDIBLE_RESULTS = heal-and-convert (pie chains); Fish oil and Sweetened Slices/Chunks heal via their own branches. flavour-text overrides replace the generic eat message per item

async function runSteps(player, item, steps) {
    const { world } = player;

    for (const step of steps) {
        switch (step.type) {
            case 'bubble':
                player.sendBubble(item.id);
                break;
            case 'quest':
                player.message(`@que@${step.text}`);
                break;
            case 'plain':
                player.message(step.text);
                break;
            case 'say':
                await player.say(step.text);
                break;
            case 'sayRandom':
                await player.say(
                    step.options[Math.floor(Math.random() * step.options.length)]
                );
                break;
            case 'delay':
                await world.sleepTicks(step.ticks);
                break;
        }
    }
}

// You eat the choc bomb / it tastes great
// Item ids: CHOCOLATE_BOMB = 907, GNOME_WAITER_CHOCOLATE_BOMB = 950
const CHOCOLATE_BOMB_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the choc bomb' },
        { type: 'plain', text: 'it tastes great' }
    ]
};

// You eat the veg ball / it tastes quite good
// Item ids: VEGBALL = 908, GNOME_WAITER_VEGBALL = 951
const VEGBALL_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the veg ball' },
        { type: 'plain', text: 'it tastes quite good' }
    ]
};

// You eat the worm hole / say "yuck" / that was awful
// Item ids: WORM_HOLE = 909, GNOME_WAITER_WORM_HOLE = 952
const WORM_HOLE_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the worm hole' },
        { type: 'say', text: 'yuck' },
        { type: 'plain', text: 'that was awful' }
    ]
};

// You eat the tangled toads legs / it tastes.....slimey
// Item ids: TANGLED_TOADS_LEGS = 910, GNOME_WAITER_TANGLED_TOADS_LEGS = 953
const TANGLED_TOADS_LEGS_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the tangled toads legs' },
        { type: 'plain', text: 'it tastes.....slimey' }
    ]
};

// mes() (-> plain) "You eat the rock cake" / say "Ow! I nearly broke a
// tooth!" / plain "You feel strangely heavier and more tired"
// Item id: ROCK_CAKE = 1061
const ROCK_CAKE_ENTRY = {
    steps: [
        { type: 'plain', text: 'You eat the rock cake' },
        { type: 'say', text: 'Ow! I nearly broke a tooth!' },
        { type: 'plain', text: 'You feel strangely heavier and more tired' }
    ]
};

// You eat the cheese and tomato batta / it's quite tasty
// Item ids: CHEESE_AND_TOMATO_BATTA = 901,
//   GNOME_WAITER_CHEESE_AND_TOMATO_BATTA = 944
const CHEESE_AND_TOMATO_BATTA_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the cheese and tomato batta' },
        { type: 'plain', text: "it's quite tasty" }
    ]
};

// You eat the toad batta / worm batta - it's a bit chewy
// Item ids: TOAD_BATTA = 902, GNOME_WAITER_TOAD_BATTA = 945
//           WORM_BATTA = 904, GNOME_WAITER_WORM_BATTA = 947
const TOAD_BATTA_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the toad batta' },
        { type: 'plain', text: "it's a bit chewy" }
    ]
};
const WORM_BATTA_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the worm batta' },
        { type: 'plain', text: "it's a bit chewy" }
    ]
};

// You eat the fruit batta / veg batta - it's tastes pretty good (sic)
// Item ids: FRUIT_BATTA = 905, GNOME_WAITER_FRUIT_BATTA = 948
//           VEG_BATTA = 906, GNOME_WAITER_VEG_BATTA = 949
const FRUIT_BATTA_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the fruit batta' },
        { type: 'plain', text: "it's tastes pretty good" }
    ]
};
const VEG_BATTA_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the veg batta' },
        { type: 'plain', text: "it's tastes pretty good" }
    ]
};

// You eat the choc crunchies / spice crunchies - they're very tasty
// Item ids: CHOC_CRUNCHIES = 911, GNOME_WAITER_CHOC_CRUNCHIES = 954
//           SPICE_CRUNCHIES = 914, GNOME_WAITER_SPICE_CRUNCHIES = 957
const CHOC_CRUNCHIES_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the choc crunchies' },
        { type: 'plain', text: "they're very tasty" }
    ]
};
const SPICE_CRUNCHIES_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the spice crunchies' },
        { type: 'plain', text: "they're very tasty" }
    ]
};

// You eat the worm crunchies / toad crunchies - they're a bit chewy
// Item ids: WORM_CRUNCHIES = 912, GNOME_WAITER_WORM_CRUNCHIES = 955
//           TOAD_CRUNCHIES = 913, GNOME_WAITER_TOAD_CRUNCHIES = 956
const WORM_CRUNCHIES_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the worm crunchies' },
        { type: 'plain', text: "they're a bit chewy" }
    ]
};
const TOAD_CRUNCHIES_FAMILY = {
    steps: [
        { type: 'quest', text: 'You eat the toad crunchies' },
        { type: 'plain', text: "they're a bit chewy" }
    ]
};

// mes() (-> plain) "you eat an apple" / delay(3) / say "yuck" / plain
// "it's rotten, you spit it out"
// Item id: ROTTEN_APPLES = 801
const ROTTEN_APPLES_ENTRY = {
    steps: [
        { type: 'plain', text: 'you eat an apple' },
        { type: 'delay', ticks: 3 },
        { type: 'say', text: 'yuck' },
        { type: 'plain', text: "it's rotten, you spit it out" }
    ]
};

// thinkbubble(item) / "You eat the Tasty Ugthanki Kebab" (not lowercased) / "It heals some health" (unconditional) /
// random say() of Yummmmm! / Oh, so nice!!! / Lovely! Item id: TASTY_UGTHANKI_KEBAB = 1102
const TASTY_UGTHANKI_KEBAB_ENTRY = {
    steps: [
        { type: 'bubble' },
        { type: 'quest', text: 'You eat the Tasty Ugthanki Kebab' },
        { type: 'quest', text: 'It heals some health' },
        {
            type: 'sayRandom',
            options: ['Yummmmm!', 'Oh, so nice!!!', 'Lovely!']
        }
    ],
    suppressHealMessage: true
};

// "You eat the prepared Oomlie meat in Palm leaf parcel" / "It tastes very gamey !", no auto "It heals some health".
// Item id: COOKED_OOMLIE_MEAT_PARCEL = 1269
const COOKED_OOMLIE_MEAT_PARCEL_ENTRY = {
    steps: [
        {
            type: 'quest',
            text: 'You eat the prepared Oomlie meat in Palm leaf parcel'
        },
        { type: 'plain', text: 'It tastes very gamey !' }
    ],
    suppressHealMessage: true
};

// custom-food (1290+) special messages: ids that get a non-generic message. every other custom food id falls through
// to the generic "You eat the X" branch

// GRAPEFRUIT family: one combined playerServerMessage(QUEST, ...) call each
const GRAPEFRUIT_ENTRY = {
    steps: [{ type: 'quest', text: "You eat the grapefruit ...it's somewhat bitter" }]
};
const GRAPEFRUIT_SLICES_ENTRY = {
    steps: [
        { type: 'quest', text: 'You eat the grapefruit slices ...they\'re somewhat bitter' }
    ]
};
const DICED_GRAPEFRUIT_ENTRY = {
    steps: [
        { type: 'quest', text: 'You eat the grapefruit cubes ...they\'re somewhat bitter' }
    ]
};

// RED_CABBAGE: no auto "It heals some health" (gaveMessage true)
const RED_CABBAGE_ENTRY = {
    steps: [
        { type: 'quest', text: 'You eat the red cabbage. Yuck!' },
        { type: 'quest', text: 'It heals some health anyway' }
    ],
    suppressHealMessage: true
};

// PUMPKIN_PIE / WHITE_PUMPKIN_PIE (full and half): eating either half shows "You eat half of a <full pie name>".
// LILYS_PUMPKIN_PIE/HALF_A_LILYS_PUMPKIN_PIE fall through to the generic message
const PUMPKIN_PIE_MESSAGE = {
    steps: [{ type: 'quest', text: 'You eat half of a pumpkin pie' }]
};
const WHITE_PUMPKIN_PIE_MESSAGE = {
    steps: [{ type: 'quest', text: 'You eat half of a white pumpkin pie' }]
};

const SPECIAL_MESSAGES = {
    907: CHOCOLATE_BOMB_FAMILY,
    950: CHOCOLATE_BOMB_FAMILY,
    908: VEGBALL_FAMILY,
    951: VEGBALL_FAMILY,
    909: WORM_HOLE_FAMILY,
    952: WORM_HOLE_FAMILY,
    910: TANGLED_TOADS_LEGS_FAMILY,
    953: TANGLED_TOADS_LEGS_FAMILY,
    1061: ROCK_CAKE_ENTRY,
    901: CHEESE_AND_TOMATO_BATTA_FAMILY,
    944: CHEESE_AND_TOMATO_BATTA_FAMILY,
    902: TOAD_BATTA_FAMILY,
    945: TOAD_BATTA_FAMILY,
    904: WORM_BATTA_FAMILY,
    947: WORM_BATTA_FAMILY,
    905: FRUIT_BATTA_FAMILY,
    948: FRUIT_BATTA_FAMILY,
    906: VEG_BATTA_FAMILY,
    949: VEG_BATTA_FAMILY,
    911: CHOC_CRUNCHIES_FAMILY,
    954: CHOC_CRUNCHIES_FAMILY,
    914: SPICE_CRUNCHIES_FAMILY,
    957: SPICE_CRUNCHIES_FAMILY,
    912: WORM_CRUNCHIES_FAMILY,
    955: WORM_CRUNCHIES_FAMILY,
    913: TOAD_CRUNCHIES_FAMILY,
    956: TOAD_CRUNCHIES_FAMILY,
    801: ROTTEN_APPLES_ENTRY,
    1102: TASTY_UGTHANKI_KEBAB_ENTRY,
    1269: COOKED_OOMLIE_MEAT_PARCEL_ENTRY,

    // custom food (1290+, see header note)
    1354: GRAPEFRUIT_ENTRY, // grapefruit
    1357: RED_CABBAGE_ENTRY, // Red Cabbage
    1364: GRAPEFRUIT_SLICES_ENTRY, // grapefruit slices
    1365: DICED_GRAPEFRUIT_ENTRY, // Diced grapefruit
    1494: PUMPKIN_PIE_MESSAGE, // Pumpkin pie
    1495: PUMPKIN_PIE_MESSAGE, // Half a pumpkin pie
    1497: WHITE_PUMPKIN_PIE_MESSAGE, // White pumpkin pie
    1498: WHITE_PUMPKIN_PIE_MESSAGE // Half a white pumpkin pie
};

// CUSTOM_EDIBLE_HEALS (custom-items.json, 1290+): heal-only entries, no item change on eat (OpenRSC
// ItemEdibleHeals.xml)
const CUSTOM_EDIBLE_HEALS = {
    1342: 3, // Cane cookie          (XML 1336 CANE_COOKIE)
    1343: 3, // Star cookie          (XML 1337 STAR_COOKIE)
    1344: 3, // Tree cookie          (XML 1338 TREE_COOKIE)
    1353: 4, // red apple            (XML 1348 RED_APPLE)
    1354: 2, // grapefruit           (XML 1349 GRAPEFRUIT)
    1355: 8, // papaya               (XML 1350 PAPAYA)
    1357: 1, // Red Cabbage          (XML 1352 RED_CABBAGE)
    1358: 6, // Corn                 (XML 1353 CORN)
    1359: 10, // White Pumpkin       (XML 1354 WHITE_PUMPKIN)
    1364: 2, // grapefruit slices    (XML 1359 GRAPEFRUIT_SLICES)
    1365: 2, // Diced grapefruit     (XML 1360 DICED_GRAPEFRUIT)
    1422: 2, // Pizza Bagel          (XML 1417 PIZZA_BAGEL)
    1570: 7 // Lily's Pumpkin        (XML 1569 LILYS_PUMPKIN)
};

// CUSTOM_EDIBLE_RESULTS (custom-items.json, 1290+): {hits, result} entries: heals and turns into another item on eat;
// result ids resolved by name at module load
function resolveBaseItemId(name) {
    const target = name.toLowerCase();

    for (const [id, def] of Object.entries(items)) {
        if (def && def.name && def.name.toLowerCase() === target) {
            return Number(id);
        }
    }

    throw new RangeError(`edible.js: no item named "${name}"`);
}

const BOWL_ID = resolveBaseItemId('bowl');
const PIE_DISH_ID = resolveBaseItemId('pie dish');

const CUSTOM_EDIBLE_RESULTS = {
    // Seaweed soup (XML 1463 SEAWEED_SOUP, heal 26): gives a Bowl back
    1468: { hits: 26, result: BOWL_ID },

    // Pumpkin pie chain (XML 1490/1491, heal 12 both halves).
    1494: { hits: 12, result: 1495 }, // Pumpkin pie -> Half a pumpkin pie
    1495: { hits: 12, result: PIE_DISH_ID }, // Half a pumpkin pie -> Pie dish

    // White pumpkin pie chain (XML 1493/1494, heal 8 both halves).
    1497: { hits: 8, result: 1498 }, // White pumpkin pie -> Half
    1498: { hits: 8, result: PIE_DISH_ID }, // Half a white pumpkin pie -> dish

    // Lily's pumpkin pie chain (XML 1571/1572, heal 6 both halves): item conversion happens but no "half of a"
    // message
    1572: { hits: 6, result: 1573 }, // Lily's pumpkin pie -> Half
    1573: { hits: 6, result: PIE_DISH_ID } // Half a Lily's pumpkin pie -> dish
};

// hits cape extra healing: shouldActivateInt(player,'hits') returns 3/2/1/0 (-1 when cape off/perks off); 3->+6,
// 2->+4, 1->+2, else +0, each with its own @lre@ message. added on top of base heal, capped by max hits; only sent when the player actually heals (current < base)
function hitsCapeHeal(player) {
    const tier = skillCapes.shouldActivateInt(player, 'hits');

    switch (tier) {
        case 3:
            player.message(
                '@lre@Your Hits cape allows you to gain a lot more ' +
                    'nourishment from the food'
            );
            return 6;
        case 2:
            player.message(
                '@lre@Your Hits cape allows you to gain some more ' +
                    'nourishment from the food'
            );
            return 4;
        case 1:
            player.message(
                '@lre@Your Hits cape allows you to gain a little more ' +
                    'nourishment from the food'
            );
            return 2;
        default:
            return 0;
    }
}

// Fish oil (1415, stackable) and Sweetened Slices/Chunks (1464/1465): handled outside the isEdible()/eatingHeals()
// flow, no hits-cape bonus, roll their own random heal inline, no tick sleep
const FISH_OIL_ID = 1415;
const SWEETENED_SLICES_ID = 1464;
const SWEETENED_CHUNKS_ID = 1465;

function randomInt(minInclusive, maxInclusive) {
    return (
        minInclusive +
        Math.floor(Math.random() * (maxInclusive - minInclusive + 1))
    );
}

// fish oil branch: unconditional message, then if not at max hits a 50/50 roll: success heals 1 ("It heals some
// health"), failure shows "You don't feel a difference"
async function handleFishOil(player, item) {
    player.sendSound('eat');
    player.inventory.remove(item.id);
    player.message('@que@You eat the fish oil');

    const { hits } = player.skills;

    if (hits.current < hits.base) {
        if (randomInt(1, 2) === 1) {
            hits.current = Math.min(hits.current + 1, hits.base);
            player.message('@que@It heals some health');
            player.sendStats();
        } else {
            player.message("@que@You don't feel a difference");
        }
    }

    return true;
}

// sweetened slices/chunks branch: unconditional message, then if not at max hits an unconditional random(1,2) heal
async function handleSweetenedFruit(player, item) {
    player.sendSound('eat');
    player.inventory.remove(item.id);
    player.message('@que@You eat the sweetened fruit');

    const { hits } = player.skills;

    if (hits.current < hits.base) {
        hits.current = Math.min(hits.current + randomInt(1, 2), hits.base);
        player.message('@que@It heals some health');
        player.sendStats();
    }

    return true;
}

// silent: skip the "It heals some health" text; HP math, hits-cape bonus and stats sync still run
async function heal(player, amount, { silent = false } = {}) {
    const { world } = player;

    player.sendSound('eat');

    const oldHits = player.skills.hits.current;

    // hits cape: extra nourishment on eat, only when the food would actually heal (level < maxStat); a full player
    // gets no cape effect or message
    let totalAmount = amount;

    if (oldHits < player.skills.hits.base) {
        totalAmount += hitsCapeHeal(player);
    }

    player.skills.hits.current = Math.min(
        oldHits + totalAmount,
        player.skills.hits.base
    );

    await world.sleepTicks(1);

    if (oldHits < player.skills.hits.current) {
        if (!silent) {
            player.message('@que@It heals some health');
        }

        player.sendStats();
    }
}

async function onInventoryCommand(player, item) {
    if (!/eat/i.test(item.definition.command)) {
        return false;
    }

    if (item.id === FISH_OIL_ID) {
        return handleFishOil(player, item);
    }

    if (item.id === SWEETENED_SLICES_ID || item.id === SWEETENED_CHUNKS_ID) {
        return handleSweetenedFruit(player, item);
    }

    // base @2003scape/rsc-data table first, then the custom-food fallback (CUSTOM_EDIBLE_RESULTS/CUSTOM_EDIBLE_HEALS)
    // for ids 1290+
    const edibleDefinition =
        edible[item.id] !== undefined
            ? edible[item.id]
            : CUSTOM_EDIBLE_RESULTS[item.id] !== undefined
            ? CUSTOM_EDIBLE_RESULTS[item.id]
            : CUSTOM_EDIBLE_HEALS[item.id];
    const special = SPECIAL_MESSAGES[item.id];

    if (!Number.isNaN(+edibleDefinition)) {
        // normal food item with no special behaviour, just heal
        if (special) {
            await runSteps(player, item, special.steps);
        } else {
            player.message(
                `@que@You eat the ${item.definition.name.toLowerCase()}`
            );
        }

        await heal(player, edibleDefinition, {
            silent: Boolean(special && special.suppressHealMessage)
        });
        player.inventory.remove(item.id);

        return true;
    } else if (typeof edibleDefinition === 'object') {
        const { hits, result, message } = edibleDefinition;

        if (special) {
            await runSteps(player, item, special.steps);
        } else if (message) {
            const messages = Array.isArray(message) ? message : [message];

            for (const unformatted of messages) {
                player.message(`@que@${unformatted}`);
            }
        } else {
            player.message(
                `@que@You eat the ${item.definition.name.toLowerCase()}`
            );
        }

        await heal(player, hits || 0, {
            silent: Boolean(special && special.suppressHealMessage)
        });
        player.inventory.remove(item.id);

        // the edible turns into something else (pie tin, partial cake, etc.)
        if (typeof result !== 'undefined') {
            player.inventory.add(result);
        }

        return true;
    }

    return false;
}

module.exports = { onInventoryCommand };
