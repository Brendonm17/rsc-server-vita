// https://classic.runescape.wiki/w/Alfred_Grimhand_Bar_Crawl
//
// player.cache.barcrawl (object): truthy = started, named bool sub-keys = the
// six per-bar flags. player.cache.barcrawlCompleted = handed the card in.
//   jollyBoar     the jolly boar inn   (npc 44,  olde suspiciouse 10gp)
//   blueMoon      the blue moon inn    (npc 12,  gutrot 50gp)
//   risingSun     the rising sun       (npc 142, hand of death 70gp)
//   deadMansChest the dead man's chest (npc 279, supergrog 15gp)
//   foresterArms  the forester's arms  (npc 306, liverbane ale 18gp)
//   rustyAnchor   the rusty anchor     (npc 150, black skull ale 8gp)

const BARCRAWL_CARD_ID = 668;
const BARBARIAN_GUARD_ID = 305;

// gate into the barbarian agility area (object 311 at x=494); opens by
// swapping in open-gate 181, then restores the closed gate
const BARBARIAN_GATE_ID = 311;
const BARBARIAN_GATE_X = 494;
const OPEN_GATE_ID = 181;

// the six per-bar cache flags, in card order; all six + card = complete
const PUB_KEYS = [
    'jollyBoar',
    'blueMoon',
    'risingSun',
    'deadMansChest',
    'foresterArms',
    'rustyAnchor'
];

// have we started barcrawl, but haven't completed this part yet?
function shouldHandleBar(player, barName) {
    return (
        player.inventory.has(BARCRAWL_CARD_ID) &&
        player.cache.barcrawl &&
        !player.cache.barcrawl[barName]
    );
}

// all six bars done?
function allBarsDone(player) {
    const barcrawl = player.cache.barcrawl;
    return !!barcrawl && PUB_KEYS.every((key) => barcrawl[key]);
}

async function blueMoonBarcrawl(player, npc) {
    const { world, cache } = player;

    await npc.say(
        'Oh no not another of you guys',
        'These barbarian barcrawls cause too much damage to my bar',
        "You're going to have to pay 50 gold for the Uncle Humphrey's gutrot"
    );

    if (player.inventory.has(10, 50)) {
        player.inventory.remove(10, 50);
        player.message('You buy some gutrot');
        await world.sleepTicks(2);
        player.message('You drink the gutrot');
        await world.sleepTicks(2);
        player.message('your insides feel terrible');
        await world.sleepTicks(2);
        player.message('The bartender signs your card');
        await player.say('Blearrgh');
        cache.barcrawl.blueMoon = true;
    } else {
        await player.say("I don't have 50 coins");
    }
}

async function jollyBoarBarcrawl(player, npc) {
    const { world, cache } = player;

    await npc.say(
        'Ah, there seems to be a fair few doing that one these days',
        'My supply of Olde Suspiciouse is starting to run low',
        "It'll cost you 10 coins"
    );

    if (player.inventory.has(10, 10)) {
        player.inventory.remove(10, 10);
        player.message('You buy a pint of Olde Suspiciouse');
        await world.sleepTicks(2);
        player.message('You gulp it down');
        await world.sleepTicks(2);
        player.message('Your head is spinning');
        await world.sleepTicks(2);
        player.message('The bartender signs your card');
        await player.say('Thanksh very mush');
        cache.barcrawl.jollyBoar = true;
    } else {
        await player.say("I don't have 10 coins right now");
    }
}

async function foresterArmsBarcrawl(player, npc) {
    const { world, cache } = player;

    await npc.say(
        "Oh you're a barbarian then",
        'Now which of these was the barrels contained the liverbane ale?',
        "That'll be 18 coins please"
    );

    if (player.inventory.has(10, 18)) {
        player.inventory.remove(10, 18);
        player.message('The bartender gives you a glass of liverbane ale');
        await world.sleepTicks(2);
        player.message('You gulp it down');
        await world.sleepTicks(2);
        player.message('The room seems to be swaying');
        await world.sleepTicks(2);
        // "signiture" sic
        player.message('The bartender scrawls his signiture on your card');
        cache.barcrawl.foresterArms = true;
    } else {
        await player.say("Sorry I don't have 18 coins");
    }
}

async function rustyAnchorBarcrawl(player, npc) {
    const { world, cache } = player;

    await npc.say('Are you sure you look a bit skinny for that');
    await player.say('Just give me whatever drink I need to drink here');
    await npc.say('Ok one black skull ale coming up, 8 coins please');

    if (player.inventory.has(10, 8)) {
        player.inventory.remove(10, 8);
        player.message('You buy a black skull ale');
        await world.sleepTicks(2);
        player.message('You drink your black skull ale');
        await world.sleepTicks(2);
        player.message('Your vision blurs');
        await world.sleepTicks(2);
        player.message('The bartender signs your card');
        cache.barcrawl.rustyAnchor = true;
    } else {
        await player.say("I don't have 8 coins with me");
    }
}

async function risingSunBarcrawl(player, npc) {
    const { world, cache } = player;

    await npc.say(
        "Hehe this'll be fun",
        "You'll be after our off the menu hand of death cocktail then",
        'Lots of expensive parts to the cocktail though',
        'So it will cost you 70 coins'
    );

    if (player.inventory.has(10, 70)) {
        player.inventory.remove(10, 70);
        player.message('You buy a hand of death cocktail');
        await world.sleepTicks(2);
        player.message('You drink the cocktail');
        await world.sleepTicks(2);
        player.message('You stumble around the room');
        await world.sleepTicks(2);
        player.message('The barmaid giggles');
        await world.sleepTicks(2);
        player.message('The barmaid signs your card');
        cache.barcrawl.risingSun = true;
    } else {
        await player.say("I don't have that much money on me");
    }
}

// the dead man's chest bartender (npc 279): supergrog for 15 coins
async function deadMansChestBarcrawl(player, npc) {
    const { world, cache } = player;

    await npc.say(
        'Haha time to be breaking out the old supergrog',
        "That'll be 15 coins please"
    );

    if (player.inventory.has(10, 15)) {
        player.inventory.remove(10, 15);
        player.message(
            'The bartender serves you a glass of strange thick dark liquid'
        );
        await world.sleepTicks(2);
        player.message('You wince and drink it');
        await world.sleepTicks(2);
        player.message('You stagger backwards');
        await world.sleepTicks(2);
        player.message('You think you see 2 bartenders signing 2 barcrawl cards');
        cache.barcrawl.deadMansChest = true;
    } else {
        await player.say("Sorry I don't have 15 coins");
    }
}

// barbarian guard (npc 305): hands out the card, seeds the crawl, completes
// it once all six bars are signed
async function onTalkToNPC(player, npc) {
    if (npc.id !== BARBARIAN_GUARD_ID) {
        return false;
    }

    const { world, cache } = player;

    player.engage(npc);

    // already completed -> just a greeting.
    if (cache.barcrawlCompleted) {
        await npc.say('Ello friend');
        player.disengage();
        return true;
    }

    // barcrawl in progress.
    if (cache.barcrawl) {
        await npc.say('So hows the barcrawl coming along?');

        if (!player.inventory.has(BARCRAWL_CARD_ID)) {
            // no card on hand.
            const third = await player.ask(
                [
                    "I've lost my  barcrawl card",
                    'Not to bad, my barcrawl card is in my bank now'
                ],
                false
            );

            if (third === 0) {
                await npc.say(
                    'What are you like?',
                    "You're gonna have to start all over now",
                    'Here you go, have another barcrawl card'
                );
                player.inventory.add(BARCRAWL_CARD_ID);
                // reset per-bar flags, keep the started flag
                cache.barcrawl = {};
            } else if (third === 1) {
                await player.say(
                    'Not to bad, my barcrawl card is in my bank now'
                );
                await npc.say(
                    'You need it with you when you are going on a barcrawl'
                );
            }
        } else if (allBarsDone(player)) {
            // card in hand + all six bars signed -> complete.
            await player.say(
                'I think I jusht about done them all, but I losht count'
            );
            player.message('@que@You give the card to the barbarian');
            await world.sleepTicks(3);
            player.inventory.remove(BARCRAWL_CARD_ID);
            await npc.say(
                'Yep that seems fine',
                "I never learned to read, but you look like you've drunk plenty",
                'You can come in now'
            );
            cache.barcrawlCompleted = true;
            // clear per-bar flags
            cache.barcrawl = {};
        } else {
            await player.say("I haven't finished it yet");
            await npc.say('Well come back when you have, you lightweight');
        }

        player.disengage();
        return true;
    }

    // not started yet.
    await npc.say('Oi whaddya want?');
    const first = await player.ask(
        ['I want to come through this gate', 'I want some money'],
        true
    );

    if (first === 0) {
        await npc.say(
            'Barbarians only',
            'Are you a barbarian?',
            "You don't look like one"
        );
        const second = await player.ask(
            [
                "Hmm, yep you've got me there",
                'Looks can be deceiving, I am in fact a barbarian'
            ],
            true
        );

        if (second === 1) {
            await npc.say(
                "If you're a barbarian you need to be able to drink like one",
                'We barbarians like a good drink',
                'And I have the perfect challenge for you',
                'The Alfred Grimhand barcrawl',
                'First done by Alfred Grimhand'
            );
            player.message('@que@The guard hands you a barcrawl card');
            await world.sleepTicks(3);
            player.inventory.add(BARCRAWL_CARD_ID);
            await npc.say(
                'Take that card to each of the bars named on it',
                'The bartenders all know what it means',
                "We're kinda well known",
                "They'll give you their strongest drink and sign your card",
                "When you done all that, we'll be happy to let you in"
            );
            // seed the started state
            cache.barcrawl = {};
        }
    } else if (first === 1) {
        await npc.say('Well do I look like a banker to you?');
    }

    player.disengage();
    return true;
}

// barbarian agility gate (object 311): before completion it triggers the guard
// dialogue; after, it opens, steps the player east through x=494, then restores
async function onGameObjectCommandOne(player, gameObject) {
    if (
        gameObject.id !== BARBARIAN_GATE_ID ||
        gameObject.x !== BARBARIAN_GATE_X
    ) {
        return false;
    }

    const { world } = player;
    const gx = gameObject.x;
    const gy = gameObject.y;

    if (player.cache.barcrawlCompleted) {
        // open, step through, restore the gate
        player.sendSound('opendoor');
        const opened = world.replaceEntity(
            'gameObjects',
            gameObject,
            OPEN_GATE_ID
        );

        // step the player east across x=494
        if (player.x >= gx) {
            player.teleport(gx - 1, gy, false);
        } else {
            player.teleport(gx, gy, false);
        }

        await world.sleepTicks(2);
        world.replaceEntity('gameObjects', opened, BARBARIAN_GATE_ID);
        return true;
    }

    // not completed: re-trigger the Barbarian guard's start/progress dialogue.
    let barbarian = null;
    for (const npc of world.npcs.getAllByID(BARBARIAN_GUARD_ID)) {
        if (npc.x >= 494 && npc.x <= 538 && npc.y >= 500 && npc.y <= 550) {
            barbarian = npc;
            break;
        }
    }

    if (barbarian) {
        await onTalkToNPC(player, barbarian);
    }

    return true;
}

module.exports = {
    shouldHandleBar,
    allBarsDone,
    blueMoonBarcrawl,
    jollyBoarBarcrawl,
    foresterArmsBarcrawl,
    rustyAnchorBarcrawl,
    risingSunBarcrawl,
    deadMansChestBarcrawl,
    onTalkToNPC,
    onGameObjectCommandOne
};
