// post-quest paid cart travel between shilo village and brimhaven (500gp each way).
// two "cart driver" npcs (618 brimhaven, 619 shilo) and two travel cart objects
// (768 shilo, 769 brimhaven) that run the same fare flow when boarded.
// brimhaven -> shilo needs shilo village complete; shilo -> brimhaven has no gate.

const CART_DRIVER_BRIMHAVEN_ID = 618;
const CART_DRIVER_SHILO_ID = 619;

const TRAVEL_CART_SHILO_ID = 768;
const TRAVEL_CART_BRIMHAVEN_ID = 769;

const COINS_ID = 10;
const FARE = 500;

// nearest visible npc of an id within range
function ifNearVisNpc(player, npcId, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', npcId, range);
    return npcs.length ? npcs[0] : null;
}

// offers a ride to brimhaven, no quest gate
async function cartRideShilo(player, npc) {
    await npc.say(
        "I am offering a cart ride to Brimhaven if you're interested!",
        'It will cost 500 Gold'
    );

    const menu = await player.ask(
        ['Yes, that sounds great!', 'No thanks.'],
        false
    );

    if (menu === 0) {
        await player.say("Yes please, I'd like to go to Brimhaven!");

        if (player.inventory.has(COINS_ID, FARE)) {
            await npc.say('Great!', "Just hop into the cart then and we'll go!");
            player.inventory.remove(COINS_ID, FARE);
            player.message(
                '@que@You Hop into the cart and the driver urges the horses on.'
            );
            player.teleport(468, 662);
            player.message(
                '@que@You take a taxing journey through the jungle to Brimhaven.'
            );
            player.message(
                '@que@You feel fatigued from the journey, but at least'
            );
            player.message("@que@you didn't have to walk all that distance.");
        } else {
            await npc.say(
                "Sorry, but it looks as if you don't have enough money.",
                'Come back and see me when you have enough for the ride.'
            );
        }
    } else if (menu === 1) {
        await player.say('No thanks.');
        await npc.say('Ok Bwana, let me know if you change your mind.');
    }
}

// offers a ride to shilo village, only if shilo village is complete
async function cartRideBrimhaven(player, npc) {
    if (player.questStages.shiloVillage === -1) {
        await npc.say(
            'I am offering a cart ride to Shilo Village if you\'re interested!',
            'It will cost 500 Gold'
        );

        const menu = await player.ask(
            ['Yes, that sounds great!', 'No thanks.'],
            false
        );

        if (menu === 0) {
            await player.say("Yes please, I'd like to go to Shilo Village!");

            if (player.inventory.has(COINS_ID, FARE)) {
                await npc.say(
                    'Great!',
                    "Just hop into the cart then and we'll go!"
                );
                player.inventory.remove(COINS_ID, FARE);
                player.message(
                    '@que@You Hop into the cart and the driver urges the horses on.'
                );
                player.teleport(417, 855);
                player.message(
                    '@que@You take a taxing journey through the jungle to Shilo ' +
                        'Village.'
                );
                player.message(
                    '@que@You feel fatigued from the journey, but at least'
                );
                player.message("@que@you didn't have to walk all that distance.");
            } else {
                await npc.say(
                    "Sorry, but it looks as if you don't have enough money.",
                    'Come back and see me when you have enough for the ride.'
                );
            }
        } else if (menu === 1) {
            await player.say('No thanks.');
            await npc.say('Ok Bwana, let me know if you change your mind.');
        }
    } else {
        await npc.say(
            'We used to run cart trips down to Shilo Village in south Karamja',
            'Since the troubles we had',
            "we've had to stop them though",
            'too many people got killed'
        );
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== CART_DRIVER_SHILO_ID && npc.id !== CART_DRIVER_BRIMHAVEN_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello!');
    await npc.say('Hello Bwana!');

    if (npc.id === CART_DRIVER_SHILO_ID) {
        await cartRideShilo(player, npc);
    } else {
        await cartRideBrimhaven(player, npc);
    }

    player.disengage();
    return true;
}

// board a cart: find the paired driver within 10 tiles, then run the fare flow
async function boardCart(player, driverNpcId, rideFn) {
    player.message('This looks like a sturdy travelling cart.');

    const driver = ifNearVisNpc(player, driverNpcId, 10);

    if (!driver) {
        player.message('The cart driver is currently busy.');
        return;
    }

    // no npc.teleport, so set the driver's position directly
    driver.x = player.x;
    driver.y = player.y;
    await player.world.sleepTicks(1);

    // engage() nudges the driver off the player's tile when on the same tile
    player.engage(driver);

    player.message('A nearby man walks over to you.');

    await rideFn(player, driver);

    player.disengage();
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id === TRAVEL_CART_SHILO_ID) {
        await boardCart(player, CART_DRIVER_SHILO_ID, cartRideShilo);
        return true;
    }

    if (gameObject.id === TRAVEL_CART_BRIMHAVEN_ID) {
        await boardCart(player, CART_DRIVER_BRIMHAVEN_ID, cartRideBrimhaven);
        return true;
    }

    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (
        gameObject.id !== TRAVEL_CART_SHILO_ID &&
        gameObject.id !== TRAVEL_CART_BRIMHAVEN_ID
    ) {
        return false;
    }

    player.message(
        'A sturdy travelling cart built for long trips through jungle areas.'
    );
    return true;
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onGameObjectCommandTwo
};
