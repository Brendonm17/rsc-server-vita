// dart smithing/fletching, disturbed-sand searches, cave/cart/lift/barrel
// navigation, ana-in-a-barrel, cart-driver dialogue

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    ANA_ID,
    MERCENARY_ID,
    MERCENARY_ESCAPEGATES_ID,
    MERCENARY_LIFTPLATFORM_ID,
    BEDABIN_NOMAD_GUARD_ID,
    AL_SHABIM_ID,
    MINING_CART_DRIVER_ID,
    TECHNICAL_PLANS_ID,
    PROTOTYPE_THROWING_DART_ID,
    PROTOTYPE_DART_TIP_ID,
    TENTI_PINEAPPLE_ID,
    PINEAPPLE_ID,
    FRESH_PINEAPPLE_ID,
    PINEAPPLE_CHUNKS_ID,
    PINEAPPLE_RING_ID,
    MINING_BARREL_ID,
    ANA_IN_A_BARREL_ID,
    BRONZE_BAR_ID,
    FEATHER_ID,
    HAMMER_ID,
    COINS_ID,
    EXPERIMENTAL_ANVIL,
    MINING_CAVE,
    MINING_CAVE_BACK,
    MINING_CART,
    TRACK,
    MINING_BARREL_OBJECT,
    LIFT_PLATFORM,
    LIFT_UP,
    MINING_CART_ABOVE,
    DISTURBED_SAND1,
    DISTURBED_SAND2,
    STAGES,
    stageOf,
    addNpc,
    ifNearVisNpc,
    hasSlaveDisguise,
    random,
    currentLevel,
    maxLevel
} = require('./constants.js');

const { indirectTalktoAlShabim } = require('./bedabin.js');

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}

function inTouristTrapCave(player) {
    return player.y >= 3600;
}

// Formulae.interp(low, high, level)
function interp(low, high, level) {
    const value =
        Math.floor((low * (99 - level)) / 98) +
        Math.floor((high * (level - 1)) / 98) +
        1;
    return Math.min(Math.max(value / 256, 0), 1);
}

function protoDartSmithSuccessful(smithingLevel) {
    if (smithingLevel < 20) {
        return false;
    }
    return interp(61, 245, smithingLevel) > Math.random();
}

function protoDartFletchSuccessful(fletchingLevel) {
    if (fletchingLevel < 10) {
        return false;
    }
    return interp(61, 254, fletchingLevel) > Math.random();
}

function isPineappleBased(item) {
    return [
        TENTI_PINEAPPLE_ID,
        PINEAPPLE_ID,
        FRESH_PINEAPPLE_ID,
        PINEAPPLE_CHUNKS_ID,
        PINEAPPLE_RING_ID
    ].includes(item.id);
}


async function makeDartTip(player) {
    if (!player.inventory.has(TECHNICAL_PLANS_ID)) {
        await mes(player, 'This anvil is experimental...', 2);
        player.message(
            'You need detailed plans of the item you want to make in order to use it.'
        );
        return;
    }
    await mes(player, 'Do you want to follow the technical plans ?', 0);
    const menu = await player.ask(
        ["Yes. I'd like to try.", 'No, not just yet.'],
        false
    );
    if (menu === 0) {
        if (!player.inventory.has(HAMMER_ID)) {
            player.message('You need a hammer to work anything on the anvil.');
            return;
        }
        if (currentLevel(player, 'smithing') < 20) {
            player.message(
                'You need level 20 in smithing before you can attempt this.'
            );
            return;
        }
        await mes(player, 'You begin experimenting in forging the weapon...', 2);
        player.inventory.remove(BRONZE_BAR_ID);
        await mes(player, 'You follow the plans carefully.', 2);
        await mes(player, 'And after a long time of careful work.', 2);
        if (protoDartSmithSuccessful(player.skills.smithing.current)) {
            await mes(player, 'You finally manage to forge a sharp, pointed...', 2);
            await mes(player, '... dart tip...', 2);
            if (!player.inventory.has(PROTOTYPE_DART_TIP_ID)) {
                player.inventory.add(PROTOTYPE_DART_TIP_ID, 1);
            }
            player.message('You study the technical plans even more...');
            player.message(
                'You need to attach feathers to the tip to complete the weapon.'
            );
        } else {
            player.message('You waste the bronze bar through an unlucky accident.');
        }
    } else if (menu === 1) {
        player.message('You decide not follow the technical plans.');
    }
}

async function attachFeathersToPrototype(player) {
    if (!player.inventory.has(FEATHER_ID, 10)) {
        player.message('You need at least ten feathers to make this item.');
        return;
    }
    if (currentLevel(player, 'fletching') < 10) {
        player.message(
            'You need a fletching level of at least 10 to complete this.'
        );
        return;
    }
    await mes(player, 'You try to attach feathers to the bronze dart tip.', 2);
    await mes(player, 'Following the plans is tricky, but you persevere.', 2);
    if (!player.inventory.has(FEATHER_ID, 10)) {
        return;
    }
    player.inventory.remove(FEATHER_ID, 10);
    if (protoDartFletchSuccessful(player.skills.fletching.current)) {
        await mes(player, 'You succesfully attach the feathers to the dart tip.', 2);
        if (!player.inventory.has(PROTOTYPE_DART_TIP_ID)) {
            return;
        }
        player.inventory.remove(PROTOTYPE_DART_TIP_ID);
        player.inventory.add(PROTOTYPE_THROWING_DART_ID);
        player.addExperience('fletching', maxLevel(player, 'fletching') * 50, true);
    } else {
        await mes(player, 'An unlucky accident causes you to waste the feathers.', 2);
        player.message(
            "But you feel that you're close to making this item though."
        );
    }
}


async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (item.id === TECHNICAL_PLANS_ID && npc.id === BEDABIN_NOMAD_GUARD_ID) {
        player.engage(npc);
        const stage = stageOf(player);
        if (stage > STAGES.MAKING_WEAPON || stage === STAGES.COMPLETE) {
            await npc.say(
                "Sorry, but you can't use the tent without permission.",
                'But thanks for all your help with the Bedabin people.',
                "And we'll take those plans off your hands as well!"
            );
        } else if (stage === STAGES.HAVE_COPY_KEY || stage === STAGES.MAKING_WEAPON) {
            await npc.say('Ok, you can go in, Al Shabim has told me about you.');
            player.teleport(171, 792);
        } else if (stage >= 0) {
            await npc.say(
                'Hmm, those plans look interesting.',
                'Go and show them to Al Shabim...',
                "I'm sure he'll be pleased to see them."
            );
        }
        player.disengage();
        return true;
    }
    if (item.id === TECHNICAL_PLANS_ID && npc.id === AL_SHABIM_ID) {
        player.engage(npc);
        await indirectTalktoAlShabim(player, npc);
        player.disengage();
        return true;
    }
    if (isPineappleBased(item) && npc.id === MERCENARY_ESCAPEGATES_ID) {
        player.engage(npc);
        if (item.id === TENTI_PINEAPPLE_ID) {
            player.inventory.remove(TENTI_PINEAPPLE_ID);
            await npc.say(
                "Great! Just what I've been looking for!",
                'Mmmmmmm, delicious!!',
                'Oh, this is soo nice!',
                'Mmmmm, *SLURP*',
                'Yummmm....Oh yes, this is great.'
            );
            if (player.questStages[QUEST_KEY] === STAGES.MADE_WEAPON) {
                player.questStages[QUEST_KEY] = STAGES.ATE_PINEAPPLE;
            }
        } else {
            await npc.say('Oh great!');
            await mes(player, 'The guard rolls his eyes in glee.', 2);
            await mes(player, 'and takes a bite of the pineapple.', 2);
            await mes(
                player,
                'His face turns from pleasure to pain as he spits the mouthful of pineapple out.'
            );
            await npc.say(
                'Yeuch!',
                "That's awful! That's not Tenti pineapple,",
                "Get me some Tenti pineapple if you know what's good for you."
            );
        }
        player.disengage();
        return true;
    }
    if (item.id === MINING_BARREL_ID && npc.id === ANA_ID) {
        player.engage(npc);
        await useBarrelOnAna(player, npc);
        player.disengage();
        return true;
    }
    if (item.id === PROTOTYPE_THROWING_DART_ID && npc.id === AL_SHABIM_ID) {
        player.engage(npc);
        const { alShabimMadeWeapon } = require('./bedabin.js');
        const stage = stageOf(player);
        if (stage === STAGES.MAKING_WEAPON) {
            await alShabimMadeWeapon(player, npc);
        } else if (stage > STAGES.MAKING_WEAPON || stage === STAGES.COMPLETE) {
            await npc.say(
                'Where did you get this from Effendi!',
                "I'll have to confiscate this for your own safety!"
            );
            player.inventory.remove(PROTOTYPE_THROWING_DART_ID);
        }
        player.disengage();
        return true;
    }
    return false;
}

async function useBarrelOnAna(player, npc) {
    if (player.questStages[QUEST_KEY] === STAGES.COMPLETE) {
        player.message('You have already completed this quest.');
        await npc.say('I think you might have me confused with someone else.');
        return;
    }
    if (!player.inventory.has(ANA_IN_A_BARREL_ID)) {
        const isFirstTime = player.cache.tried_ana_barrel === undefined;
        if (
            player.cache.ana_lift !== undefined ||
            player.cache.ana_cart !== undefined ||
            player.cache.ana_in_cart !== undefined
        ) {
            await mes(player, "Oh, here's Ana, the guards must have discovered her.");
            await mes(player, 'And sent her back to the mines...');
        }
        if (isFirstTime) {
            await npc.say(
                'Hey, what do you think you\'re doing?',
                'Harumph!'
            );
        } else {
            await npc.say(
                'Hey, what do you think you\'re doing?',
                'Leave me alone and let me get on with my work.',
                "Else we'll both be in trouble.",
                'Oh no, NOT AGAIN!',
                'Harumph!'
            );
        }
        await player.say("Shush...It's for your own good!");
        await mes(player, 'You manage to squeeze Ana into the barrel,');
        await mes(player, 'despite her many complaints.');
        player.inventory.remove(MINING_BARREL_ID);
        player.inventory.add(ANA_IN_A_BARREL_ID);
        player.world.removeEntity('npcs', npc);
        if (isFirstTime) {
            player.cache.tried_ana_barrel = true;
        }
    } else {
        player.message(
            "You already have Ana in a barrel, you can't get two in there!"
        );
    }
}


async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id === EXPERIMENTAL_ANVIL && item.id === BRONZE_BAR_ID) {
        if (player.inventory.has(PROTOTYPE_DART_TIP_ID)) {
            player.message('You have already made the prototype dart tip.');
            player.message("You don't need to make another one.");
        } else if (player.inventory.has(PROTOTYPE_THROWING_DART_ID)) {
            player.message('You have already made the prototype dart.');
            player.message("You don't need to make another one.");
        } else {
            await makeDartTip(player);
        }
        return true;
    }
    if (gameObject.id === MINING_CART && item.id === ANA_IN_A_BARREL_ID) {
        await mes(player, 'You carefully place Ana in the barrel into the mine cart.');
        await mes(player, 'Soon the cart moves out of sight and then it returns.');
        player.inventory.remove(ANA_IN_A_BARREL_ID);
        if (player.cache.ana_cart === undefined) {
            player.cache.ana_cart = true;
        }
        return true;
    }
    if (gameObject.id === LIFT_PLATFORM && item.id === ANA_IN_A_BARREL_ID) {
        const n = ifNearVisNpc(player, MERCENARY_LIFTPLATFORM_ID, 5);
        if (n) {
            player.engage(n);
            await anaToLift(player, n);
            player.disengage();
        }
        return true;
    }
    if (gameObject.id === MINING_CART_ABOVE && item.id === ANA_IN_A_BARREL_ID) {
        await mes(player, 'You place Ana (In the barrel) carefully on the cart.');
        await mes(player, 'This was the last barrel to go on the cart,');
        await mes(player, "but the cart driver doesn't seem to be in any rush to get going.");
        await mes(player, 'And the desert heat will soon get to Ana.');
        player.inventory.remove(ANA_IN_A_BARREL_ID);
        if (player.cache.ana_in_cart === undefined) {
            player.cache.ana_in_cart = true;
        }
        return true;
    }
    return false;
}


async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) {
        return false;
    }
    const ids = [item1.id, item2.id];
    if (ids.includes(FEATHER_ID) && ids.includes(PROTOTYPE_DART_TIP_ID)) {
        await attachFeathersToPrototype(player);
        return true;
    }
    return false;
}


async function onGameObjectCommandOne(player, gameObject) {
    return objectCommand(player, gameObject, 1);
}

async function onGameObjectCommandTwo(player, gameObject) {
    return objectCommand(player, gameObject, 2);
}

async function objectCommand(player, obj, cmd) {
    if (!questsEnabled(player)) {
        return false;
    }
    switch (obj.id) {
        case DISTURBED_SAND1:
        case DISTURBED_SAND2:
            await disturbedSand(player, obj, cmd);
            return true;
        case EXPERIMENTAL_ANVIL:
            if (cmd === 1) {
                await makeDartTip(player);
                return true;
            }
            return false;
        case MINING_CAVE_BACK:
        case MINING_CAVE:
            await miningCave(player, obj);
            return true;
        case MINING_CART:
            await miningCart(player, obj, cmd);
            return true;
        case TRACK:
            player.message('You see that this track is too dangerous to cross.');
            player.message(
                'High speed carts are crossing the track most of the time.'
            );
            return true;
        case MINING_BARREL_OBJECT:
            await miningBarrel(player);
            return true;
        case LIFT_PLATFORM:
            await liftPlatform(player);
            return true;
        case LIFT_UP:
            await liftUp(player);
            return true;
        case MINING_CART_ABOVE:
            await miningCartAbove(player);
            return true;
        default:
            return false;
    }
}

async function disturbedSand(player, obj, cmd) {
    const stage = stageOf(player);
    const started = stage > STAGES.NOT_STARTED;
    // closest-to-irena text used for 'look'; shared search reveals footprints
    if (cmd === 1) {
        if (!started) {
            await mes(player, 'You see some footsteps in the sand.');
        } else {
            await mes(player, 'This looks like some disturbed sand.');
            await mes(player, 'footsteps seem to be heading of towards the south west.');
        }
    } else {
        if (!started) {
            await mes(player, 'You just see some footsteps in the sand.');
        } else {
            await mes(player, 'You search the footsteps more closely.');
            await mes(player, 'You can see that there are five sets of footprints.');
            await mes(player, 'One set of footprints seems lighter than the others.');
            await mes(player, 'The four other footsteps were made by heavier people with boots.');
        }
    }
}

async function miningCave(player, obj) {
    // mining_cave_back shares rsc id 963 with the cave
    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        await failCaveAnaInBarrel(player);
        return;
    }
    const stage = stageOf(player);
    const n = ifNearVisNpc(player, MERCENARY_ESCAPEGATES_ID, 10);
    if (!hasSlaveDisguise(player) && stage !== STAGES.COMPLETE) {
        player.message("This guard looks as if he's been down here a while.");
        if (n) {
            player.engage(n);
            await n.say("Hey, you're no slave!");
            await n.say('What are you doing down here?');
            await n.attack(player);
            player.disengage();
        }
        await mes(player, 'More guards rush to catch you.');
        await mes(
            player,
            "You are roughed up a bit by the guards as you're manhandlded to a cell."
        );
        if (n) {
            player.engage(n);
            await n.say('Into the cell you go! I hope this teaches you a lesson.');
            player.disengage();
        }
        player.teleport(89, 801);
        return;
    }
    if (stage >= STAGES.ATE_PINEAPPLE || stage === STAGES.COMPLETE) {
        await mes(player, 'You walk into the dark of the cavern...');
        player.message(
            'And emerge in a different part of this huge underground complex.'
        );
        player.teleport(76, 3640);
        return;
    }
    player.message('Two guards block your way further into the caves');
    if (n) {
        player.engage(n);
        await n.say('Hey you, move away from there!');
        player.disengage();
    }
}

async function miningCart(player, obj, cmd) {
    if (cmd === 1) {
        // "look" info (rsc cmd order differs; both provided)
        if (obj.x === 62 && obj.y === 3639) {
            player.message('This cart is being unloaded into this section of the mine.');
            player.message('Before being sent back for another load.');
        } else {
            player.message('This mine cart is being loaded up with new rocks and stone.');
            player.message('It gets sent to a different section of the mine for unloading.');
        }
        return;
    }
    // search
    player.message('You search the mine cart.');
    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        player.message("There isn't enough space for both you and Ana in the cart.");
        return;
    }
    player.message('There may be just enough space to squeeze yourself into the cart.');
    player.message('Would you like to try?');
    const menu = await player.ask(
        ['Yes, of course.', 'No Thanks, it looks pretty dangerous.'],
        false
    );
    if (menu === 0) {
        if (getIntoCartSuccessful()) {
            player.message('You succeed!');
            if (obj.x === 56 && obj.y === 3631) {
                player.teleport(62, 3640);
            } else if (obj.x === 62 && obj.y === 3639) {
                player.teleport(55, 3632);
            }
        } else {
            player.message(
                "You fail to fit yourself into the cart in time before it starts it's journey."
            );
            player.message('You fall and hurt yourself.');
            player.damage(2);
        }
    } else if (menu === 1) {
        player.message('You decide not to get into the dangerous looking mine cart.');
    }
}

function getIntoCartSuccessful() {
    const r = Math.floor(Math.random() * 5);
    return !(r === 4 || r === 3);
}

async function miningBarrel(player) {
    if (player.cache.ana_is_up !== undefined) {
        if (player.inventory.has(MINING_BARREL_ID)) {
            player.message('You can only manage one of these at a time.');
            return;
        }
        await mes(player, 'You find the barrel with ana in it.');
        await mes(player, '@gre@Ana: Let me out of here, I feel sick!');
        player.inventory.add(ANA_IN_A_BARREL_ID, 1);
        delete player.cache.ana_is_up;
        return;
    }
    if (player.cache.ana_cart !== undefined) {
        if (player.inventory.has(MINING_BARREL_ID)) {
            player.message('You can only manage one of these at a time.');
            return;
        }
        player.message('You search the barrels and find the one with Ana in it.');
        player.message('@gre@Ana: Let me out!');
        player.inventory.add(ANA_IN_A_BARREL_ID, 1);
        delete player.cache.ana_cart;
        return;
    }
    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        player.message('You cannot carry another barrel while you\'re carrying Ana.');
        return;
    }
    if (player.cache.ana_lift !== undefined) {
        player.message('You search for Ana, but cannot find her.');
    }
    player.message('This barrel is quite big, but you may be able to carry one. ');
    player.message('Would you like to take one?');
    const menu = await player.ask(['Yeah, cool!', 'No thanks.'], false);
    if (menu === 0) {
        if (player.inventory.has(MINING_BARREL_ID)) {
            player.message('You can only manage one of these at a time.');
        } else {
            player.message("You take the barrel, it's not that heavy, just awkward.");
            player.inventory.add(MINING_BARREL_ID, 1);
        }
    } else if (menu === 1) {
        player.message('You decide not to take the barrel.');
    }
}

async function liftPlatform(player) {
    const n = ifNearVisNpc(player, MERCENARY_LIFTPLATFORM_ID, 5);
    if (!n) {
        return;
    }
    player.engage(n);
    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        await anaToLift(player, n);
        player.disengage();
        return;
    }
    await n.say('Hey there, what do you want?');
    const menu = await player.ask(
        ['What is this thing?', 'Can I use this?'],
        true
    );
    if (menu === 0) {
        await repeatLiftThing(player, n);
    } else if (menu === 1) {
        await repeatLiftUseThis(player, n);
    }
    player.disengage();
}

async function repeatLiftThing(player, n) {
    await n.say(
        'It is quite clearly a lift.',
        "Any fool can see that it's used to transport rock to the surface."
    );
    const opt = await player.ask(['Can I use this?', 'Ok, thanks.'], true);
    if (opt === 0) {
        await repeatLiftUseThis(player, n);
    }
}

async function repeatLiftUseThis(player, n) {
    await n.say(
        "Of course not, you'd be doing me out of a job.",
        "Anyway, you haven't got any barrels that need to go to the surface.",
        'Now, move along and get some work done before you get a good beating.'
    );
    const options = await player.ask(
        ['What is this thing?,', 'Ok, thanks.'],
        false
    );
    if (options === 0) {
        await player.say('What is this thing?');
        await repeatLiftThing(player, n);
    } else if (options === 1) {
        await player.say('Ok, thanks.');
    }
}

async function liftUp(player) {
    player.message('You pull on the winch');
    if (player.cache.ana_lift !== undefined) {
        await mes(player, 'You see a barrel coming to the surface.');
        await mes(player, 'Before too long you haul it onto the side.');
        await mes(
            player,
            'The barrel seems quite heavy and you hear a muffled sound coming from inside.'
        );
        player.message('@gre@Ana: Get me OUT OF HERE!');
        delete player.cache.ana_lift;
        if (player.cache.ana_is_up === undefined) {
            player.cache.ana_is_up = true;
        }
    } else {
        player.message(
            'You pull on the winch and a heavy barrel filled with stone comes to the surface.'
        );
    }
}

async function miningCartAbove(player) {
    player.message('You search the mine cart.');
    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        await mes(
            player,
            'There should be enough space for Ana (in the barrel) to go on here.'
        );
    }
    if (player.cache.ana_in_cart !== undefined) {
        await mes(player, 'You can see the barrel with Ana in it on the cart already.');
    }
    await mes(player, 'There is space on the cart for you get on, would you like to try?');
    const menu = await player.ask(
        [
            "Yes, I'll get on.",
            "No, I've got other plans.",
            'Attract mine cart drivers attention.'
        ],
        false
    );
    if (menu === 0) {
        player.message('You decide to climb onto the cart.');
        if (player.cache.ana_in_cart !== undefined) {
            await mes(player, 'You hear Ana starting to bang on the barrel for her to be let out.');
            await mes(player, "@gre@Ana: Get me out of here, I'm suffocating!");
            await mes(player, '@gre@Ana: It smells like dwarven underwear in here!');
        }
        player.teleport(86, 808);
        if (player.cache.rescue !== undefined) {
            await mes(player, 'As soon as you get on the cart, it starts to move.');
            await mes(player, 'Before too long you are past the gates.');
            await mes(player, 'You jump off the cart taking Ana with you.');
            player.teleport(106, 806);
            delete player.cache.rescue;
            player.inventory.add(ANA_IN_A_BARREL_ID, 1);
        }
    } else if (menu === 1) {
        player.message('You decide not to get onto the cart.');
    } else if (menu === 2) {
        const cartDriver = ifNearVisNpc(player, MINING_CART_DRIVER_ID, 10);
        if (cartDriver) {
            player.engage(cartDriver);
            await cartDriver.say('Ahem.');
            if (player.cache.rescue !== undefined) {
                await cartDriver.say("Hurry up, get in the cart or I'll go without you!");
                player.disengage();
                return;
            }
            if (player.cache.ana_in_cart !== undefined) {
                await getOutWithAnaInCart(player, cartDriver);
                player.disengage();
                return;
            }
            if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
                await cartDriver.say(
                    "What're you doing carrying that big barrel around?",
                    'Put it in the back of the cart like all the others!'
                );
                player.disengage();
                return;
            }
            player.message('The cart driver is busy loading the cart up ...');
            player.disengage();
        }
    }
}

async function failCaveAnaInBarrel(player) {
    if (!player.inventory.has(ANA_IN_A_BARREL_ID)) {
        return;
    }
    const n = addNpc(player.world, MERCENARY_ID, player.x, player.y);
    await player.world.sleepTicks(1);
    player.engage(n);
    await n.say("Hey, where d'ya think you're going with that Barrel?");
    player.message('A guard comes over and takes the barrel off you.');
    player.inventory.remove(ANA_IN_A_BARREL_ID);
    await n.say(
        "'Cor! This barrel is really heavy!",
        'Have you been mining lead?',
        'Har, har har!'
    );
    player.disengage();
    await mes(player, '@gre@Ana: How rude! Why I ought to teach you a lesson.');
    player.engage(n);
    await n.say('What was that!');
    player.disengage();
    player.message('The guards kick the barrel open.!');
    const ana = addNpc(player.world, ANA_ID, player.x, player.y);
    await player.world.sleepTicks(1);
    player.engage(ana);
    await ana.say('How dare you say that I\'m as heavy as lead?');
    player.disengage();
    player.message('The guards drag Ana of and then throw you into a cell.');
    player.world.removeEntity('npcs', ana);
    await mes(player, '@yel@Guards: Into the cell you go!');
    await mes(player, '@yel@I hope this teaches you a lesson.');
    player.world.removeEntity('npcs', n);
    player.teleport(75, 3626);
}

async function anaToLift(player, n) {
    player.message('The guard notices the barrel (with Ana in it) that you\'re carrying.');
    await n.say('Hey, that Barrel looks heavy, do you need a hand?');
    const menu = await player.ask(
        ['Yes please.', 'No thanks, I can manage.'],
        false
    );
    if (menu === 0) {
        player.message('The guard comes over and helps you. He takes one end of the barrel.');
        await n.say('Blimey! This is heavy!');
        await mes(player, '@gre@Ana in a barrel: Why you cheeky....!');
        await mes(player, 'The guard looks around suprised at Ana\'s outburst.');
        await n.say('What was that?');
        await player.say('Oh, it was nothing.');
        await n.say('I could have sworn I heard something!');
        player.message('@gre@Ana in a barrel: Yes you did you ignaramus.');
        await n.say('What was that you said?');
        const opt = await player.ask(
            ['I said you were very gregarious!', 'Oh, nothing.'],
            true
        );
        if (opt === 0) {
            await mes(player, '@gre@Ana in a barrel: You creep!');
            await n.say('Oh, right, how very nice of you to say so.');
            player.message('The guard seems flattered.');
            await n.say(
                "Anyway, let's get this barrel up to the surface, plenty more work to you to do!"
            );
            player.message('The guard places the barrel carefully on the lift platform.');
            await n.say(
                "Oh, there's no one operating the lift up top, hope this barrel isn't urgent?",
                "You'd better get back to work!"
            );
            player.inventory.remove(ANA_IN_A_BARREL_ID);
            if (player.cache.ana_lift === undefined) {
                player.cache.ana_lift = true;
            }
        } else if (opt === 1) {
            await n.say('I heard you say something, now spit it out!');
        }
    } else if (menu === 1) {
        await n.say('Ok, fair enough, I was only offering.');
    }
}


async function driverCallGuards(player, n) {
    const succeed = random(0, 1);
    await n.say('Guards! Guards!');
    if (succeed === 0) {
        await mes(player, 'Some guards notice you and come over.');
        let mercenary = ifNearVisNpc(player, MERCENARY_ID, 15);
        if (!mercenary) {
            mercenary = addNpc(player.world, MERCENARY_ID, player.x, player.y);
            await player.world.sleepTicks(2);
        }
        player.disengage();
        player.engage(mercenary);
        await mercenary.say('Oi, what are you two doing?');
        await mercenary.attack(player);
        await mes(player, 'The Guards search you!');
        await mes(player, 'More guards rush to catch you.');
        await mes(
            player,
            "You are roughed up a bit by the guards as you're manhandlded to a cell."
        );
        await mercenary.say('Into the cell you go! I hope this teaches you a lesson.');
        player.disengage();
        player.teleport(89, 801);
    } else {
        await mes(player, 'You quickly slope away and hide from the guards.');
    }
}

// getOutWithAnaInCart(-1) main entry (cart-driver puzzle)
async function getOutWithAnaInCart(player, n) {
    await mes(player, 'The cart driver seems to be festidiously cleaning his cart.');
    await mes(player, "It doesn't look as if he wants to be disturbed.");
    const menu = await player.ask(['Hello.', 'Nice cart.', 'Pssst...'], false);
    if (menu === 0) {
        await player.say('Hello');
        await n.say("Can't you see I'm busy?", 'Now get out of here!');
        const getGo = await player.ask(
            ['Oh, ok, sorry.', 'Nice cart.', 'Pssst...'],
            true
        );
        if (getGo === 0) {
            await driverOkSorry(player, n);
        } else if (getGo === 1) {
            await driverNiceCart(player, n);
        } else if (getGo === 2) {
            await driverPssst(player, n);
        }
    } else if (menu === 1) {
        await player.say('Nice cart.');
        await driverNiceCart(player, n);
    } else if (menu === 2) {
        await player.say('Pssst...');
        await driverPssst(player, n);
    }
}

async function driverPssst(player, n) {
    await mes(player, 'The cart driver completely ignores you.');
    const pst = await player.ask(
        ['Psssst...', 'Psssssst...', 'Pssssssssttt!!!'],
        true
    );
    if (pst === 0) {
        await driverPssst2(player, n);
    } else if (pst === 1) {
        await driverPssst3(player, n);
    } else if (pst === 2) {
        await driverPssstFinal(player, n);
    }
}

async function driverPssst2(player, n) {
    await mes(player, 'The driver completely ignores you.');
    const m = await player.ask(
        ['Psssssst...', 'Pssst...', 'Pssssssssttt!!!'],
        true
    );
    if (m === 0) {
        await driverPssst3(player, n);
    } else if (m === 1) {
        await driverPssst(player, n);
    } else if (m === 2) {
        await driverPssstFinal(player, n);
    }
}

async function driverPssst3(player, n) {
    await mes(player, 'The driver completely ignores you.');
    const me = await player.ask(
        ['Psssst...', 'Pssst...', 'Pssssssssttt!!!'],
        true
    );
    if (me === 0) {
        await driverPssst2(player, n);
    } else if (me === 1) {
        await driverPssst(player, n);
    } else if (me === 2) {
        await driverPssstFinal(player, n);
    }
}

async function driverPssstFinal(player, n) {
    await mes(player, 'The cart driver turns around quickly to face you.');
    await n.say('What!', "Can't you see I'm busy?");
    const shh = await player.ask(['Oh, ok, sorry.', 'Shhshhh!'], true);
    if (shh === 0) {
        await driverOkSorry(player, n);
    } else if (shh === 1) {
        await n.say('Shush yourself!');
        player.message('The cart driver goes back to his work.');
    }
}

async function driverOkSorry(player, n) {
    await n.say('Look just leave me alone!');
    player.message('The cart driver goes back to his work.');
}

async function driverNiceCart(player, n) {
    await mes(player, 'The cart driver looks around at you and tries to weigh you up.');
    await n.say('Hmmm.');
    await mes(player, 'He tuts to himself and starts checking the wheels.');
    await n.say('Tut !');
    const tut = await player.ask(
        [
            'I wonder if you could help me?',
            "One wagon wheel says to the other,'I'll see you around'.",
            'Can I help you at all?'
        ],
        true
    );
    if (tut === 0) {
        await driverWonderIf(player, n);
    } else if (tut === 1) {
        await driverWagon(player, n);
    } else if (tut === 2) {
        await driverHelpYou(player, n);
    }
}

async function driverWagon(player, n) {
    await mes(player, 'The cart driver smirks a little.');
    await mes(player, 'He starts checking the steering on the cart.');
    const menu = await player.ask(
        [
            "'One good turn deserves another'",
            'Can you get me the heck out of here please?'
        ],
        false
    );
    if (menu === 0) {
        await player.say("'One good turn deserves another.");
        await mes(player, 'The cart driver smiles a bit and then turns to you.');
        await n.say('Are you trying to get me fired?');
        const menu2 = await player.ask(
            ['No', 'Yes', 'Fired...no, shot perhaps!'],
            true
        );
        if (menu2 === 0) {
            await n.say(
                "It certainly sounds like it, now leave me alone.",
                "If you bug me again, I'm gonna call the guards."
            );
            player.message('The cart driver goes back to his work.');
        } else if (menu2 === 1) {
            await n.say(
                'And why would you want to do a crazy thing like that for?',
                'I ought to teach you a lesson!'
            );
            await driverCallGuards(player, n);
        } else if (menu2 === 2) {
            await n.say('Ha ha ha! You\'re funny!');
            await mes(player, 'The cart driver checks that the guards aren\'t watching him.');
            await n.say("What're you in fer?");
            const menu3 = await player.ask(
                [
                    "Oh, I'm not supposed to be here at all actually.",
                    "I'm in for murder, so you'd better get me out of here!",
                    'In for a penny in for a pound.'
                ],
                true
            );
            if (menu3 === 0) {
                await n.say(
                    'Hmmm, interesting...let me guess.',
                    "You're completely innocent...",
                    'like all the other inmates in here.',
                    'Ha ha ha!'
                );
                player.message('The Cart driver goes back to his work.');
            } else if (menu3 === 1) {
                await n.say(
                    'Hmm, well, I wonder what the guards are gonna say about that!'
                );
                await driverCallGuards(player, n);
            } else if (menu3 === 2) {
                await mes(player, 'The cart driver laughs at your pun...');
                await n.say('Ha ha ha, oh Stoppit!');
                await mes(player, 'The cart driver seems much happier now.');
                await n.say('What can I do for you anyway?');
                const menu4 = await player.ask(
                    [
                        'Can you smuggle me out on your cart?',
                        'Can you smuggle my friend Ana out on your cart?',
                        "Well, you see, it's like this..."
                    ],
                    false
                );
                if (menu4 === 0) {
                    await player.say('Can you smuggle me out on your cart?');
                    await mes(player, 'The cart driver points at a nearby guard.');
                    await n.say(
                        "Ask that man over there if it's OK and I'll consider it!",
                        'Ha ha ha!'
                    );
                    player.message(
                        'The cart driver goes back to his work, laughing to himself.'
                    );
                } else if (menu4 === 1) {
                    await player.say('Can you smuggle my friend out on your cart?');
                    await n.say(
                        'As long as your friend is a barrel full of rocks.',
                        "I don't think it would be a problem at all!",
                        'Ha ha ha!'
                    );
                    player.message(
                        'The cart driver goes back to his work, laughing to himself.'
                    );
                } else if (menu4 === 2) {
                    await player.say("Well, you see, it's like this...");
                    await n.say('yeah!');
                    const menu5 = await player.ask(
                        [
                            'Prison riot in ten minutes, get your cart out of here!',
                            "There's ten gold in it for you if you leave now - no questions asked."
                        ],
                        true
                    );
                    if (menu5 === 0) {
                        player.message('The cart driver seems visibly shaken...');
                        await n.say('Oh, right..yes...yess, Ok...');
                        await mes(player, 'The cart driver quickly starts preparing the cart.');
                        const menu6 = await player.ask(
                            [
                                'Good luck!',
                                "You can't leave me here, I'll get killed!"
                            ],
                            true
                        );
                        if (menu6 === 0) {
                            await n.say('Yeah, you too!');
                            await mes(player, 'The cart sets off at a hectic pace.');
                            await mes(player, 'The guards at the gate get suspiscious and search the cart.');
                            await mes(player, 'They find Ana in the Barrel and take her back into the mine.');
                            if (player.cache.ana_in_cart !== undefined) {
                                delete player.cache.ana_in_cart;
                            }
                        } else if (menu6 === 1) {
                            await n.say(
                                "Oh, right...ok, you'd better jump in the cart then!",
                                'Quickly!'
                            );
                            if (player.cache.ana_in_cart !== undefined) {
                                delete player.cache.ana_in_cart;
                                player.cache.rescue = true;
                            }
                        }
                    } else if (menu5 === 1) {
                        await n.say(
                            'If you\'re going to bribe me, at least make it worth my while.',
                            "Now, let's say 100 Gold pieces should we?",
                            'Ha ha ha!'
                        );
                        const menu6 = await player.ask(
                            ['A hundred it is!', 'Forget it!'],
                            false
                        );
                        if (menu6 === 0) {
                            await player.say('A hundred it is.');
                            await n.say('Great!');
                            if (player.inventory.has(COINS_ID, 100)) {
                                await n.say('Ok, get in the back of the cart then!');
                                player.inventory.remove(COINS_ID, 100);
                                if (player.cache.ana_in_cart !== undefined) {
                                    delete player.cache.ana_in_cart;
                                    player.cache.rescue = true;
                                }
                            } else {
                                await n.say(
                                    'You little cheat, trying to trick me!',
                                    "I'll show you!"
                                );
                                await driverCallGuards(player, n);
                            }
                        } else if (menu6 === 1) {
                            await player.say('Forget it!');
                            await n.say(
                                'Ok, fair enough!',
                                "But don't bother me anymore."
                            );
                            player.message('The cart driver goes back to work.');
                        }
                    }
                }
            }
        }
    } else if (menu === 1) {
        await player.say('Can you get me the heck out of here please?');
        await driverHeckOut(player, n);
    }
}

async function driverHelpYou(player, n) {
    await n.say(
        "I'm quite capable thanks...",
        'Now get lost before I call the guards.'
    );
    const help = await player.ask(
        [
            'Can you get me the heck out of here please?',
            'I could help, I know a lot about carts.'
        ],
        true
    );
    if (help === 0) {
        await driverHeckOut(player, n);
    } else if (help === 1) {
        await n.say(
            "Are you saying I don't know anything about carts?",
            'Why you cheeky little....'
        );
        await mes(player, 'The cart driver seems mortally offended...');
        await mes(player, 'his temper explodes as he shouts the guards.');
        await driverCallGuards(player, n);
    }
}

async function driverWonderIf(player, n) {
    await n.say(
        "Sorry friend, I'm busy, go bug the guards,",
        "I'm sure they'll give ya the time of day."
    );
    await mes(player, 'The cart driver chuckles to himself.');
    const ok = await player.ask(
        ['Can I help you at all?', 'Can you get me the heck out of here please?'],
        true
    );
    if (ok === 0) {
        await driverHelpYou(player, n);
    } else if (ok === 1) {
        await driverHeckOut(player, n);
    }
}

async function driverHeckOut(player, n) {
    await n.say('No way, and if you bug me again, I\'m gonna call the guards.');
    await mes(player, 'The cart driver goes back to his work.');
}


async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (groundItem.id === ANA_IN_A_BARREL_ID) {
        player.message("@gre@Ana: Don't think for one minute ...");
        player.message('@gre@Ana: You can just come back and pick me up');
        player.message('Ana goes out running away');
        player.world.removeEntity('groundItems', groundItem);
        return true;
    }
    return false;
}

function outsideCamp(player) {
    return (
        player.y < 795 ||
        (player.x >= 92 && player.y >= 795 && player.y <= 814) ||
        (player.x <= 78 && player.y >= 795 && player.y <= 814)
    );
}

async function onDropItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (item.id !== ANA_IN_A_BARREL_ID) {
        return false;
    }
    if (player.questStages[QUEST_KEY] === STAGES.COMPLETE) {
        player.inventory.remove(ANA_IN_A_BARREL_ID);
        return true;
    }
    player.message('Are you sure you want to drop this?');
    const menu = await player.ask(
        ["Yes, I'm sure.", "Erm, no I've had second thoughts."],
        false
    );
    if (menu === 0) {
        if (outsideCamp(player)) {
            await mes(player, "@gre@Ana: You can't drop me here!");
            await mes(player, "@gre@Ana: I'll die in the desert on my own!");
            await mes(player, '@gre@Ana: Take me back to the Shantay pass.');
            return true;
        }
        let diffX = 0;
        if (
            player.x >= 72 &&
            player.x <= 77 &&
            player.y >= 3613 &&
            player.y <= 3631
        ) {
            diffX = -8;
        }
        await mes(player, 'You drop the barrel to the floor and Ana gets out.');
        player.inventory.remove(ANA_IN_A_BARREL_ID);
        const ana = addNpc(player.world, ANA_ID, player.x, player.y);
        await player.world.sleepTicks(1);
        player.engage(ana);
        await ana.say('How dare you put me in that barrel you barbarian!');
        player.disengage();
        await mes(player, 'Ana\'s outburst attracts the guards, they come running over.');
        let guard = ifNearVisNpc(player, MERCENARY_ID, 15);
        if (!guard || guard.opponent) {
            guard = addNpc(player.world, MERCENARY_ID, player.x + diffX, player.y);
        }
        await player.world.sleepTicks(1);
        player.engage(guard);
        await guard.say("Hey! What's going on here then?");
        if (diffX === 0) {
            await guard.attack(player);
        }
        player.disengage();
        await mes(player, 'The guards drag Ana away and then throw you into a cell.');
        player.world.removeEntity('npcs', ana);
        player.teleport(75, 3626);
        return true;
    }
    await mes(player, 'You think twice about dropping the barrel to the floor.');
    return true;
}


async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id !== MINING_CART_DRIVER_ID) {
        return false;
    }
    player.engage(npc);
    if (player.questStages[QUEST_KEY] === STAGES.COMPLETE) {
        await npc.say("Don't trouble me, can't you see I'm busy?");
    } else if (player.cache.rescue !== undefined) {
        await npc.say("Hurry up, get in the cart or I'll go without you!");
    } else if (player.cache.ana_in_cart !== undefined) {
        await getOutWithAnaInCart(player, npc);
    } else if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        await npc.say(
            "What're you doing carrying that big barrel around?",
            'Put it in the back of the cart like all the others!'
        );
    } else {
        player.message('The cart driver is busy loading the cart up ...');
    }
    player.disengage();
    return true;
}

module.exports = {
    onTalkToNPC,
    onUseWithNPC,
    onUseWithGameObject,
    onUseWithInventory,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onGroundItemTake,
    onDropItem
};
