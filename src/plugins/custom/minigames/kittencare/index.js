// Kitten Care (members) - raise a Kitten into a Cat by feeding it (milk/fish),
// entertaining it (wool/ball of wool), and stroking it while its hunger and
// loneliness gauges rise over time and movement. neglect it and it runs off;
// nurture it through 32 growth events and it becomes a cat. also handles dropping
// a kitten (it runs away) and pouncing a kitten/cat on a small rat.
//
// growth cadence: an activity score accrues +2 per walked step and +5 per periodic
// save (~47 ticks) and fires a growth event at 50. onCatGrowthTick runs every tick
// and fast-returns unless a kitten is carried.
//
// state is on player.cache (kitten_events/kitten_hunger/kitten_loneliness,
// kittens_raised/kittens_released); the activity counter is a transient per-player
// field that resets on relog.
//
// CAT = 1119 (items[1119] "cat", not the Gertrude quest cats 1003/1093).
// WANT_EXTENDED_CATS_BEHAVIOR is treated as on but is inert (cat has no inventory command).

const BASE_FACTOR = 16; // KittenToCat.BASE_FACTOR

// item ids (resolved by name)
const KITTEN = 1096;
const CAT = 1119; // grows-into cat

const BALL_OF_WOOL = 207;
const WOOL = 145;

const MILK = 22;
const BUCKET = 21;

const RAW_SHRIMP = 349;
const RAW_SARDINE = 354;
const SEASONED_SARDINE = 1094;
const SARDINE = 355;
const RAW_ANCHOVIES = 351;
const RAW_TROUT = 358;
const TROUT = 359;
const RAW_SALMON = 356;
const SALMON = 357;
const RAW_TUNA = 366;
const TUNA = 367;

// KittenToCat.isFoodOnCat's id list (order preserved from the Java).
const FOOD_IDS = [
    MILK,
    RAW_SHRIMP,
    RAW_SARDINE,
    SEASONED_SARDINE,
    SARDINE,
    RAW_ANCHOVIES,
    RAW_TROUT,
    TROUT,
    RAW_SALMON,
    SALMON,
    RAW_TUNA,
    TUNA
];

// npc ids
const RAT_WITCHES_POTION = 29;

// growth cadence constants
const KITTEN_ACTIVITY_THRESHOLD = 50; // Player.KITTEN_ACTIVITY_THRESHOLD
const STEP_ACTIVITY = 2; // +2 per walked step
const TIME_ACTIVITY = 5; // +5 per periodic save
// ~30s at 640ms per tick.
const TIME_ACTIVITY_INTERVAL_TICKS = 47;

const GROW_EVENTS = 32; // grow to cat at 32 events
const RUN_OFF_GAUGE = 4 * BASE_FACTOR; // gauge >= 64 -> kitten runs off

// helpers

// random int, inclusive of both bounds.
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function inArray(value, arr) {
    return arr.indexOf(value) !== -1;
}

// Functions.compareItemsIds(item1, item2, id1, id2)
function compareItemsIds(item1, item2, id1, id2) {
    return (
        (item1.id === id1 && item2.id === id2) ||
        (item1.id === id2 && item2.id === id1)
    );
}

// treated as true; inert since items[1119] "cat" has no inventory command. player unused.
function wantExtendedCatsBehavior(player) { // eslint-disable-line no-unused-vars
    return true;
}

// kitten state on player.cache; loadState defaults each field to 0.
function cacheInt(player, key) {
    const value = player.cache[key];
    return typeof value === 'number' ? value : 0;
}

function loadState(player) {
    return {
        events: cacheInt(player, 'kitten_events'),
        hunger: cacheInt(player, 'kitten_hunger'),
        loneliness: cacheInt(player, 'kitten_loneliness')
    };
}

function saveState(player, state) {
    player.cache.kitten_events = state.events;
    player.cache.kitten_hunger = state.hunger;
    player.cache.kitten_loneliness = state.loneliness;
}

// decrement loneliness by BASE_FACTOR, only when it's high enough.
function reduceKittensLoneliness(player) {
    const state = loadState(player);

    if (state.loneliness >= BASE_FACTOR) {
        state.loneliness -= BASE_FACTOR;
        saveState(player, state);
    }
}

// decrement hunger by BASE_FACTOR, only when it's high enough.
function reduceKittensHunger(player) {
    const state = loadState(player);

    if (state.hunger >= BASE_FACTOR) {
        state.hunger -= BASE_FACTOR;
        saveState(player, state);
    }
}

// kitten indicator: [signal or null, interpretation[] or null]
const KITTEN_NONE = { signal: null, interpretation: null };
const KITTEN_LONELINESS_1 = { signal: '@yel@kitten: miaow!', interpretation: null };
const KITTEN_LONELINESS_2 = {
    signal: '@yel@kitten: miaow!',
    interpretation: ['your kitten wants some attention']
};
const KITTEN_LONELINESS_3 = {
    signal: '@yel@kitten: miaaaaow!',
    interpretation: ['your kitten is feeling lonely']
};
const KITTEN_LONELINESS_4 = {
    signal: null,
    interpretation: ['your kitten has ran off', 'your kitten was feeling lonely']
};
const KITTEN_HUNGER_1 = { signal: 'you hear a purring', interpretation: null };
const KITTEN_HUNGER_2 = {
    signal: 'you hear a purring',
    interpretation: ['your kitten is hungry']
};
const KITTEN_HUNGER_3 = {
    signal: 'you hear a loud meow',
    interpretation: ['your kitten is really hungry']
};
const KITTEN_HUNGER_4 = {
    signal: 'your kitten has ran off to look for food',
    interpretation: ['to find some food']
};

// KittenMessageSolver.resolveLoneliness
function resolveLoneliness(gauge) {
    if (gauge < BASE_FACTOR) {
        return KITTEN_NONE;
    } else if (gauge < 2 * BASE_FACTOR) {
        return KITTEN_LONELINESS_1;
    } else if (gauge < 3 * BASE_FACTOR) {
        return KITTEN_LONELINESS_2;
    } else if (gauge < 4 * BASE_FACTOR) {
        return KITTEN_LONELINESS_3;
    }

    return KITTEN_LONELINESS_4;
}

// KittenMessageSolver.resolveHunger
function resolveHunger(gauge) {
    if (gauge < BASE_FACTOR) {
        return KITTEN_NONE;
    } else if (gauge < 2 * BASE_FACTOR) {
        return KITTEN_HUNGER_1;
    } else if (gauge < 3 * BASE_FACTOR) {
        return KITTEN_HUNGER_2;
    } else if (gauge < 4 * BASE_FACTOR) {
        return KITTEN_HUNGER_3;
    }

    return KITTEN_HUNGER_4;
}

function indicatorMessages(indicator) {
    const messages = [];

    if (indicator.signal !== null) {
        messages.push(indicator.signal);
    }

    if (indicator.interpretation !== null) {
        messages.push(...indicator.interpretation);
    }

    return messages;
}

// KittenMessageSolver.messagesHunger
function messagesHunger(hungerGauge) {
    return indicatorMessages(resolveHunger(hungerGauge));
}

// KittenMessageSolver.messagesLoneliness
function messagesLoneliness(lonelinessGauge) {
    return indicatorMessages(resolveLoneliness(lonelinessGauge));
}

// KittenMessageSolver.messagesCombined
function messagesCombined(hungerGauge, lonelinessGauge) {
    const hungerMessages = messagesHunger(hungerGauge);
    const lonelinessMessages = messagesLoneliness(lonelinessGauge);

    if (hungerGauge >= 4 * BASE_FACTOR) {
        return hungerMessages;
    } else if (lonelinessGauge >= 4 * BASE_FACTOR) {
        return lonelinessMessages;
    }

    const messages = [];
    messages.push(hungerMessages[0]);

    for (const message of lonelinessMessages) {
        messages.push(message);
    }

    for (const message of hungerMessages.slice(1)) {
        messages.push(message);
    }

    return messages;
}

// entertain the cat with wool or a ball of wool.
async function entertainCat(item, player, isGrown) {
    if (item.id === BALL_OF_WOOL) {
        if (!isGrown) {
            player.message('@que@your kitten plays around with the ball of wool');
            await player.world.sleepTicks(3);
            player.message('@que@it seems to love pouncing on it');
            await player.world.sleepTicks(3);

            reduceKittensLoneliness(player);
        } else {
            player.message('@que@your cat plays around with the ball of wool');
            await player.world.sleepTicks(3);
            player.message('@que@it seems to love pouncing on it');
            await player.world.sleepTicks(3);
        }
    } else if (item.id === WOOL) {
        if (!isGrown) {
            player.message('@que@your kitten plays around with the wool');
            await player.world.sleepTicks(3);
            player.message('@que@it seems to be enjoying itself');
            await player.world.sleepTicks(3);

            reduceKittensLoneliness(player);
        } else {
            player.message('@que@your cat plays around with the wool');
            await player.world.sleepTicks(3);
            player.message('@que@it seems to be enjoying itself');
            await player.world.sleepTicks(3);
        }
    }
}

// feed the cat (milk/fish); messages keep their original typos.
async function feedCat(item, player, isGrown) {
    let feeded = false;

    if (item.id === MILK) {
        player.inventory.remove(MILK, 1);
        player.inventory.add(BUCKET);

        if (!isGrown) {
            player.message('@que@you give the kitten the milk');
            await player.world.sleepTicks(3);
            player.message('@que@the kitten quickly laps it up then licks his paws');
            await player.world.sleepTicks(3);
        } else {
            player.message('@que@you give the cat the milk');
            await player.world.sleepTicks(3);
            player.message('@que@the kitten quickly laps it up then licks his paws');
            await player.world.sleepTicks(3);
        }

        feeded = true;
    } else if (inArray(item.id, FOOD_IDS)) {
        // (all remaining FOOD_IDS are the fish cases)
        player.inventory.remove(item.id, 1);

        if (!isGrown) {
            player.message(
                '@que@you give the kitten the ' + item.definition.name,
                'the kitten quickly eats it up then licks his paws'
            );
        } else {
            player.message(
                '@que@you give the cat the ' + item.definition.name,
                "it quickly eat's them up and licks its paws"
            );
        }

        feeded = true;
    }

    if (feeded && !isGrown) {
        reduceKittensHunger(player);
    }
}

// isFoodOnCat / isEntertainmentForCat
function isEntertainmentForCat(item1, item2) {
    return (
        compareItemsIds(item1, item2, KITTEN, BALL_OF_WOOL) ||
        compareItemsIds(item1, item2, CAT, BALL_OF_WOOL) ||
        compareItemsIds(item1, item2, KITTEN, WOOL) ||
        compareItemsIds(item1, item2, CAT, WOOL)
    );
}

function isFoodOnCat(item1, item2) {
    return (
        ((item2.id === KITTEN || item2.id === CAT) &&
            inArray(item1.id, FOOD_IDS)) ||
        ((item1.id === KITTEN || item1.id === CAT) &&
            inArray(item2.id, FOOD_IDS))
    );
}

// core growth step. state is synchronous; the grow-to-cat lines are emitted
// async so the tick driver never blocks.

// the two cosmetic grow-to-cat lines.
async function announceGrownIntoCat(player) {
    player.message("@que@you're kitten has grown into a healthy cat");
    await player.world.sleepTicks(2);
    player.message('@que@it can hunt for its self now');
    await player.world.sleepTicks(2);
}

function onCatGrowth(player) {
    // blockCatGrowth(player) + onCatGrowth's own re-check.
    if (!player.inventory.has(KITTEN)) {
        return;
    }

    const state = loadState(player);
    let kittenHunger = state.hunger;
    let kittenLoneliness = state.loneliness;
    let kittenEvents = state.events;

    const changeHunger = random(4, 6);
    const changeLoneliness = random(4, 6);

    // trigger only if the gauges have passed to the next tenth digit
    const tHunger =
        Math.floor((kittenHunger + changeHunger) / BASE_FACTOR) -
            Math.floor(kittenHunger / BASE_FACTOR) >
        0;
    const tLoneliness =
        Math.floor((kittenLoneliness + changeLoneliness) / BASE_FACTOR) -
            Math.floor(kittenLoneliness / BASE_FACTOR) >
        0;

    kittenHunger += changeHunger;
    kittenLoneliness += changeLoneliness;

    let messages = [];

    // hungry and lonely
    if (tHunger && tLoneliness) {
        messages = messagesCombined(kittenHunger, kittenLoneliness);
        kittenEvents += 1;
    } else if (tHunger) {
        // just hungry
        messages = messagesHunger(kittenHunger);
        kittenEvents += 1;
    } else if (tLoneliness) {
        // just lonely
        messages = messagesLoneliness(kittenLoneliness);
        kittenEvents += 1;
    }

    for (const message of messages) {
        player.message(message);
    }

    // kitten runs off - reset counters
    if (kittenHunger >= RUN_OFF_GAUGE || kittenLoneliness >= RUN_OFF_GAUGE) {
        let totalReleased = 1;

        if (typeof player.cache.kittens_released === 'number') {
            totalReleased += player.cache.kittens_released;
        }

        player.cache.kittens_released = totalReleased;
        player.inventory.remove(KITTEN, 1);
        kittenEvents = kittenHunger = kittenLoneliness = 0;
    } else if (kittenEvents >= GROW_EVENTS) {
        // kitten grows to cat - replace and reset counters
        let totalRaised = 1;

        if (typeof player.cache.kittens_raised === 'number') {
            totalRaised += player.cache.kittens_raised;
        }

        player.inventory.remove(KITTEN, 1);
        player.inventory.add(CAT);
        player.cache.kittens_raised = totalRaised;
        kittenEvents = kittenHunger = kittenLoneliness = 0;

        // cosmetic (unawaited)
        announceGrownIntoCat(player).catch(() => {});
    }

    saveState(player, {
        events: kittenEvents,
        hunger: kittenHunger,
        loneliness: kittenLoneliness
    });
}

// growth cadence driver, called once per player per tick.
function incrementActivity(player, amount) {
    player.kittenActivity = (player.kittenActivity || 0) + amount;

    if (player.kittenActivity >= KITTEN_ACTIVITY_THRESHOLD) {
        player.kittenActivity -= KITTEN_ACTIVITY_THRESHOLD;
        onCatGrowth(player);
    }
}

function onCatGrowthTick(player) {
    // nothing accrues unless a kitten is carried; keep last position synced to
    // avoid a phantom step.
    if (!player.inventory.has(KITTEN)) {
        player.kittenLastX = player.x;
        player.kittenLastY = player.y;
        return;
    }

    // step driver (+2 per single-tile walk step).
    if (typeof player.kittenLastX === 'number') {
        const distance = Math.max(
            Math.abs(player.x - player.kittenLastX),
            Math.abs(player.y - player.kittenLastY)
        );

        if (distance === 1) {
            incrementActivity(player, STEP_ACTIVITY);
        }
        // distance > 1 = teleport, not a step, ignored.
    }

    player.kittenLastX = player.x;
    player.kittenLastY = player.y;

    // time driver (+5 every ~30s / 47 ticks).
    player.kittenTimeTicks = (player.kittenTimeTicks || 0) + 1;

    if (player.kittenTimeTicks >= TIME_ACTIVITY_INTERVAL_TICKS) {
        player.kittenTimeTicks = 0;
        incrementActivity(player, TIME_ACTIVITY);
    }
}

// drop a kitten: it runs away, counts toward kittens_released, and resets the gauges.
async function onDropItem(player, item) {
    if (item.id !== KITTEN) {
        return false;
    }

    let totalReleased = 1;

    if (typeof player.cache.kittens_released === 'number') {
        totalReleased += player.cache.kittens_released;
    }

    player.cache.kittens_released = totalReleased;
    player.inventory.remove(KITTEN, 1);
    player.message('@que@you drop the kitten');
    await player.world.sleepTicks(2);
    player.message("@que@it's upset and runs away");
    await player.world.sleepTicks(1);

    // reset state to 0/0/0 after the drop.
    saveState(player, { events: 0, hunger: 0, loneliness: 0 });

    return true;
}

// "stroke" the kitten (grown-cat branch dormant, see header).
async function onInventoryCommand(player, item) {
    if (item.id === KITTEN) {
        player.message('@que@you softly stroke the kitten');
        await player.world.sleepTicks(3);
        player.message('@que@@yel@kitten:..purr..purr..');
        await player.world.sleepTicks(3);
        player.message('@que@the kitten appreciates the attention');
        await player.world.sleepTicks(1);

        reduceKittensLoneliness(player);
        return true;
    }

    if (item.id === CAT && wantExtendedCatsBehavior(player)) {
        player.message('@que@you softly stroke the cat');
        await player.world.sleepTicks(3);
        player.message('@que@@yel@cat:..purr..purr..');
        await player.world.sleepTicks(3);
        player.message('@que@it appreciates the attention');
        await player.world.sleepTicks(1);
        return true;
    }

    return false;
}

// food or wool used on a kitten/cat (either order).
async function onUseWithInventory(player, item, target) {
    const food = isFoodOnCat(item, target);
    const entertainment = isEntertainmentForCat(item, target);

    if (!food && !entertainment) {
        return false;
    }

    const isGrownCat = item.id !== KITTEN && target.id !== KITTEN;
    let theItem;

    if (isGrownCat) {
        theItem = item.id === CAT ? target : item;
    } else {
        theItem = item.id === KITTEN ? target : item;
    }

    if (entertainment) {
        await entertainCat(theItem, player, isGrownCat);
    } else if (food) {
        await feedCat(theItem, player, isGrownCat);
    }

    return true;
}

// pounce a kitten/cat on a small rat. kitten: 1-in-10 to catch; cat: always.
// order is (player, npc, item).
async function onUseWithNPC(player, npc, item) {
    if (
        (item.id !== KITTEN && item.id !== CAT) ||
        npc.id !== RAT_WITCHES_POTION
    ) {
        return false;
    }

    if (item.id === KITTEN) {
        player.message('it pounces on the rat...');

        if (random(0, 9) === 0) {
            npc.faceEntity(player);
            await player.world.sleepTicks(1);
            removeRat(player, npc);
            await player.world.sleepTicks(2);
            player.message('@que@...and quickly gobbles it up');
            await player.world.sleepTicks(3);
            player.message("@que@it returns to your satchel licking it's paws");
            await player.world.sleepTicks(3);

            reduceKittensLoneliness(player);
        }
    } else if (item.id === CAT) {
        player.message('the cat pounces on the rat...');
        npc.faceEntity(player);
        await player.world.sleepTicks(1);
        removeRat(player, npc);
        await player.world.sleepTicks(2);
        player.message('@que@...and quickly gobbles it up');
        await player.world.sleepTicks(3);
        player.message("@que@it returns to your satchel licking it's paws");
        await player.world.sleepTicks(3);
    }

    return true;
}

// guarded remove: the rat may already be gone after the 1-tick face delay.
function removeRat(player, npc) {
    const { world } = player;

    if (world.npcs.getByIndex(npc.index) === npc) {
        world.removeEntity('npcs', npc);
    }
}

module.exports = {
    onDropItem,
    onInventoryCommand,
    onUseWithInventory,
    onUseWithNPC,
    // the additive growth-cadence driver, called directly from the world tick loop.
    onCatGrowthTick,
    // exported for the standalone harness / potential reuse
    _internal: {
        BASE_FACTOR,
        KITTEN,
        CAT,
        BALL_OF_WOOL,
        WOOL,
        MILK,
        BUCKET,
        FOOD_IDS,
        RAT_WITCHES_POTION,
        KITTEN_ACTIVITY_THRESHOLD,
        STEP_ACTIVITY,
        TIME_ACTIVITY,
        TIME_ACTIVITY_INTERVAL_TICKS,
        GROW_EVENTS,
        RUN_OFF_GAUGE,
        random,
        compareItemsIds,
        loadState,
        saveState,
        reduceKittensLoneliness,
        reduceKittensHunger,
        resolveHunger,
        resolveLoneliness,
        messagesHunger,
        messagesLoneliness,
        messagesCombined,
        isFoodOnCat,
        isEntertainmentForCat,
        entertainCat,
        feedCat,
        onCatGrowth,
        incrementActivity
    }
};
