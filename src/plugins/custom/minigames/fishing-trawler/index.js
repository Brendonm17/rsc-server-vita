
const GameObject = require('../../../../model/game-object');

// item name lookups for the junk-drop messages
const ITEM_DEFS = require('@2003scape/rsc-data/config/items');

// ids

const MURPHY_LAND_ID = 733;
const MURPHY_BOAT_ID = 734;
// const MURPHY_UNRELEASED_ID = 739; // dead code upstream too - never spawned

const SPAWN_LAND = { x: 538, y: 703 };
const SPAWN_EAST_FAIL = { x: 254, y: 759 };
const SPAWN_WEST_FAIL = { x: 302, y: 759 };

const LEAK1 = 1077;
const LEAK2 = 1071;

const ROPE_ID = 237;
const SWAMP_PASTE_ID = 785;
const BAILING_BUCKET_ID = 1282;
const TRAWLER_CATCH_OBJECT = 1106;
const NET_ITEM = 376;
const FISH_CAP_ID = 1385; // fishing cape id

const FILL_HOLE_OBJECT_IDS = [LEAK1, LEAK2];
const INSPECT_NET_OBJECT_IDS = [1101, 1102]; // never spawned - see header
const BARREL_OBJECT_ID = 1070;

const BASE_TICK = 640;

const SHIP_WATER_LIMIT_SECOND_BOAT = 500;
const SHIP_WATER_LIMIT_SINK = 1000;

const MAX_LEAKS = 14;

// TrawlerBoat.java enum
const BOAT = { EAST: 'east', WEST: 'west' };

// FishingTrawler.State enum
const STATE = {
    STANDBY: 'standby',
    FIRST_SHIP: 'first_ship',
    SECOND_SHIP: 'second_ship',
    CLEANUP: 'cleanup'
};

const MURPHY_MESSAGES_SHIP1 = [
    "That's the stuff, fill those holes",
    'it\'s a fierce sea today traveller',
    'check those nets'
];
const MURPHY_MESSAGES_SHIP2 = [
    'we\'re going under',
    'we\'ll all end up in a watery grave',
    'check those nets'
];

// reward table: levelReq, itemId, name, exp

const FISH_TABLE = [
    [81, 1190, 'a manta ray', 460],
    [79, 1192, 'a sea turtle', 380],
    [76, 545, 'a shark', 440],
    [50, 369, 'a sword fish', 400],
    [40, 372, 'a lobster', 360],
    [30, 366, 'some tuna', 320],
    [15, 351, 'some anchovies', 160],
    [5, 354, 'a sardine', 80]
    // fall-through: shrimp, see catchAndGiveFish()
];
const RAW_SHRIMP_ID = 349;

// junk items: seaweed/oyster get own exp+message, rest share generic message
const JUNK_OLD_BOOT = 1155;
const JUNK_DAMAGED_ARMOUR_1 = 1157;
const JUNK_DAMAGED_ARMOUR_2 = 1158;
const JUNK_RUSTY_SWORD = 1159;
const JUNK_BROKEN_ARROW = 1165;
const JUNK_BUTTONS = 1166;
const JUNK_BROKEN_STAFF = 1167;
const JUNK_VASE = 1168;
const JUNK_CERAMIC_REMAINS = 1169;
const JUNK_BROKEN_GLASS = 1170;
const JUNK_EDIBLE_SEAWEED = 1245;
const JUNK_OYSTER = 793;

const JUNK_ITEMS = [
    JUNK_OLD_BOOT,
    JUNK_DAMAGED_ARMOUR_1,
    JUNK_DAMAGED_ARMOUR_2,
    JUNK_RUSTY_SWORD,
    JUNK_BROKEN_ARROW,
    JUNK_BUTTONS,
    JUNK_BROKEN_STAFF,
    JUNK_VASE,
    JUNK_CERAMIC_REMAINS,
    JUNK_BROKEN_GLASS,
    JUNK_EDIBLE_SEAWEED,
    JUNK_OYSTER
];

// small helpers

function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function inArray(value, arr) {
    return arr.indexOf(value) !== -1;
}

// gathering success chance formula
function calcGatheringSuccessfulLegacy(levelReq, skillLevel, equipmentBonus) {
    if (skillLevel < levelReq) {
        return false;
    }

    const roll = random(1, 128);
    const threshold = Math.min(
        127,
        Math.max(1, skillLevel + equipmentBonus + 40 - Math.floor(levelReq * 1.5))
    );

    return roll <= threshold;
}

// trawlers: boat id -> trawler state

const TRAWLERS = new Map();

function makeTrawlerState(world, boat) {
    const isEast = boat === BOAT.EAST;

    return {
        world,
        boat,
        // Area bounds (FishingTrawler constructor)
        shipMinX: isEast ? 270 : 318,
        shipMaxX: isEast ? 278 : 326,
        shipMinY: 740,
        shipMaxY: 744,
        spawnX: isEast ? 272 : 320,
        spawnY: 742,
        shipWaterMinX: isEast ? 245 : 293,
        shipWaterMaxX: isEast ? 253 : 301,
        shipWaterMinY: 727,
        shipWaterMaxY: 731,
        shipWaterSpawnX: isEast ? 251 : 299,
        shipWaterSpawnY: 729,
        spawnFail: isEast ? SPAWN_EAST_FAIL : SPAWN_WEST_FAIL,

        netBroken: false,
        waterLevel: 0,
        fishCaught: 0,
        timeTillReturn: 0,
        ticksTillNextLeak: 6,
        stage: STATE.STANDBY,

        leaks: new Array(MAX_LEAKS).fill(null),
        players: [], // solo build: 0 or 1 entries
        tickHandle: null
    };
}

function getTrawler(boat) {
    return TRAWLERS.get(boat) || null;
}

function getOrCreateTrawler(world, boat) {
    let trawler = TRAWLERS.get(boat);

    if (!trawler) {
        trawler = makeTrawlerState(world, boat);
        TRAWLERS.set(boat, trawler);
    }

    return trawler;
}

// find the trawler this player is currently aboard
function getTrawlerForPlayer(player) {
    for (const trawler of TRAWLERS.values()) {
        if (trawler.players.indexOf(player) !== -1) {
            return trawler;
        }
    }

    return null;
}

// trip counts as available if >= 4 minutes remain
function isAvailable(trawler) {
    return (
        trawler.stage === STATE.STANDBY ||
        (trawler.stage === STATE.FIRST_SHIP &&
            trawler.timeTillReturn >= (4 * 60 * 1000) / BASE_TICK &&
            trawler.players.length < 1)
    );
}

// leak management

function getFreeLeakIndex(trawler) {
    for (let i = 0; i < trawler.leaks.length; i += 1) {
        if (trawler.leaks[i] === null) {
            return i;
        }
    }

    return -1;
}

function getLeakCount(trawler) {
    let count = 0;

    for (const leak of trawler.leaks) {
        if (leak !== null) {
            count += 1;
        }
    }

    return count;
}

function cleanRemovedLeaks(trawler) {
    const { gameObjects } = trawler.world;

    for (let i = 0; i < trawler.leaks.length; i += 1) {
        const leak = trawler.leaks[i];

        if (leak !== null && gameObjects.getByIndex(leak.index) !== leak) {
            trawler.leaks[i] = null;
        }
    }
}

function removeAllLeaks(trawler) {
    for (let i = 0; i < trawler.leaks.length; i += 1) {
        if (trawler.leaks[i] !== null) {
            trawler.world.removeEntity('gameObjects', trawler.leaks[i]);
            trawler.leaks[i] = null;
        }
    }
}

function createLeaks(trawler, count) {
    const { world } = trawler;

    for (let i = 0; i < count; i += 1) {
        let x = -1;
        let y = -1;

        if (trawler.stage === STATE.FIRST_SHIP) {
            x = random(trawler.shipMinX + 1, trawler.shipMaxX - 1);
            y = random(0, 1) === 0 ? trawler.spawnY - 1 : trawler.spawnY + 1;
        } else if (trawler.stage === STATE.SECOND_SHIP) {
            x = random(trawler.shipWaterMinX + 1, trawler.shipWaterMaxX - 1);
            y =
                random(0, 1) === 0
                    ? trawler.shipWaterSpawnY - 1
                    : trawler.shipWaterSpawnY + 1;
        }

        const freeLeakIndex = getFreeLeakIndex(trawler);

        // "The ship is leaking hardcore."
        if (freeLeakIndex === -1) {
            break;
        }

        if (world.gameObjects.getAtPoint(x, y).length > 0) {
            continue;
        }

        const southSide =
            trawler.stage === STATE.FIRST_SHIP
                ? trawler.spawnY - 1
                : trawler.shipWaterSpawnY - 1;
        const northSide =
            trawler.stage === STATE.FIRST_SHIP
                ? trawler.spawnY + 1
                : trawler.shipWaterSpawnY + 1;

        let leak = null;

        if (y === southSide) {
            leak = new GameObject(world, { id: LEAK1, x, y, direction: 0 });
        } else if (y === northSide) {
            leak = new GameObject(world, { id: LEAK1, x, y, direction: 4 });
        }

        if (leak) {
            world.addEntity('gameObjects', leak);
            trawler.leaks[getFreeLeakIndex(trawler)] = leak;
        }
    }
}

// per-tick mechanics

function catchFish(trawler) {
    if (!trawler.netBroken && random(0, 1) === 0) {
        trawler.fishCaught += random(0, trawler.players.length + 3);
    }
}

function netBreak(trawler) {
    if (random(0, 100) >= 75) {
        trawler.netBroken = true;

        for (const player of trawler.players) {
            player.message(
                '@red@The trawler net is damaged - you cannot catch any ' +
                    'fish with a damaged net'
            );
        }
    }
}

// ambient flavour lines from the on-ship murphy
function murphySpeak(trawler) {
    let messages = null;

    if (trawler.stage === STATE.FIRST_SHIP) {
        messages = MURPHY_MESSAGES_SHIP1;
    } else if (trawler.stage === STATE.SECOND_SHIP) {
        messages = MURPHY_MESSAGES_SHIP2;
    }

    if (!messages) {
        return;
    }

    const message = messages[random(0, messages.length - 1)];

    for (const player of trawler.players) {
        player.message(`@yel@Murphy: ${message}`);
    }
}

function bailWater(trawler) {
    if (trawler.stage === STATE.FIRST_SHIP) {
        trawler.waterLevel -= random(1, 3);
    } else if (trawler.stage === STATE.SECOND_SHIP) {
        trawler.waterLevel -= random(2, 4);
    }

    if (trawler.waterLevel < 0) {
        trawler.waterLevel = 0;
    }
}

// relay interface state as text at trip start and on major changes
function announceStatus(trawler, ...lines) {
    for (const player of trawler.players) {
        for (const line of lines) {
            player.message(line);
        }
    }
}

// cache bookkeeping

function registerFailure(player) {
    const failedTrips = (player.cache.fishing_trawler_failures || 0) + 1;
    player.cache.fishing_trawler_failures = failedTrips;
}

function disconnectPlayer(trawler, player) {
    registerFailure(player);

    const index = trawler.players.indexOf(player);

    if (index !== -1) {
        trawler.players.splice(index, 1);
    }

    player.teleport(trawler.spawnFail.x, trawler.spawnFail.y, true);
}

// quitting via murphy always uses the west fail spawn
function quitPlayer(trawler, player) {
    registerFailure(player);

    const index = trawler.players.indexOf(player);

    if (index !== -1) {
        trawler.players.splice(index, 1);
    }

    player.teleport(SPAWN_WEST_FAIL.x, SPAWN_WEST_FAIL.y, true);
}

// trip lifecycle

function resetGame(trawler) {
    trawler.fishCaught = 0;
    trawler.timeTillReturn = -1;
    trawler.waterLevel = 0;
    trawler.netBroken = false;

    removeAllLeaks(trawler);

    trawler.players.length = 0;

    if (trawler.tickHandle !== null) {
        trawler.world.clearTickTimeout(trawler.tickHandle);
        trawler.tickHandle = null;
    }

    trawler.stage = STATE.STANDBY;
}

function endGame(trawler) {
    if (trawler.players.length !== 0 && trawler.fishCaught !== 0) {
        // x2 since about half will be filled with junk (Java comment)
        const rewardForEach = Math.floor(
            (2 * trawler.fishCaught) / trawler.players.length
        );

        for (const player of trawler.players) {
            const successfulTrips =
                (player.cache.fishing_trawler_success || 0) + 1;

            player.message('@yel@You have trawled a full net!');
            player.message(
                "@yel@It's time to go back in and inspect the catch"
            );
            player.message('murphy turns the boat towards shore');
            player.teleport(SPAWN_LAND.x, SPAWN_LAND.y, true);
            player.cache.fishing_trawler_reward = rewardForEach;
            player.cache.fishing_trawler_success = successfulTrips;
        }
    }

    trawler.players.length = 0;
    resetGame(trawler);
}

function start(trawler) {
    trawler.timeTillReturn = Math.floor((random(5, 12) * 60 * 1000) / BASE_TICK);
    trawler.stage = STATE.FIRST_SHIP;
}

// the tick loop

function runTick(trawler) {
    const { world } = trawler;

    if (trawler.stage === STATE.STANDBY) {
        // handled on add player
        return;
    }

    // sweep players still logged in and present
    for (let i = trawler.players.length - 1; i >= 0; i -= 1) {
        const player = trawler.players[i];

        if (
            !player.loggedIn ||
            world.players.getByIndex(player.index) !== player
        ) {
            try {
                disconnectPlayer(trawler, player);
            } catch (e) {
                // the Java wraps this in a defensive catch(RuntimeException e) {}
            }
        }
    }

    if (trawler.players.length === 0) {
        resetGame(trawler);
        return;
    }

    if (trawler.stage === STATE.FIRST_SHIP) {
        if (trawler.waterLevel >= SHIP_WATER_LIMIT_SECOND_BOAT) {
            for (const player of trawler.players) {
                player.message('the boats full of water');
                player.message("it's sinking!");
                player.teleport(
                    trawler.shipWaterSpawnX,
                    trawler.shipWaterSpawnY,
                    true
                );
            }

            removeAllLeaks(trawler);
            trawler.stage = STATE.SECOND_SHIP;
            announceStatus(
                trawler,
                '@yel@Murphy fights to keep the second boat afloat.'
            );
        }
    } else if (trawler.stage === STATE.SECOND_SHIP) {
        if (trawler.waterLevel >= SHIP_WATER_LIMIT_SINK) {
            for (const player of trawler.players.slice()) {
                player.message('the boats gone under');
                player.message("you're lost at sea!");
                registerFailure(player);

                const index = trawler.players.indexOf(player);

                if (index !== -1) {
                    trawler.players.splice(index, 1);
                }

                player.teleport(trawler.spawnFail.x, trawler.spawnFail.y, true);
            }

            resetGame(trawler);
            return;
        }
    }

    cleanRemovedLeaks(trawler);

    // post-decrement: check reads pre-decrement value
    const leakTimerExpired = trawler.ticksTillNextLeak <= 0;
    trawler.ticksTillNextLeak -= 1;

    if (leakTimerExpired) {
        // players.length is always 1 in solo build
        let minimumLeaks = 1;
        let maximumLeaks = 5;
        let minimumBreak = 15;
        let maximumBreak = 24;

        const newLeakMax = random(minimumLeaks, maximumLeaks);
        createLeaks(trawler, newLeakMax);
        catchFish(trawler);
        netBreak(trawler);
        murphySpeak(trawler);

        trawler.ticksTillNextLeak = random(minimumBreak, maximumBreak);

        // ping current state at this beat of the loop
        announceStatus(
            trawler,
            `@yel@Water level: ${trawler.waterLevel}/${SHIP_WATER_LIMIT_SINK}`,
            `@yel@Fish caught so far: ${trawler.fishCaught}`,
            trawler.netBroken
                ? '@red@The net is damaged - it needs repairing with rope.'
                : '@yel@The net is holding.'
        );
    }

    trawler.waterLevel += getLeakCount(trawler);

    // same post-decrement semantics as ticksTillNextLeak above
    const tripTimerExpired = trawler.timeTillReturn <= 0;
    trawler.timeTillReturn -= 1;

    if (tripTimerExpired) {
        endGame(trawler);
        return;
    }

    trawler.tickHandle = world.setTickTimeout(() => runTick(trawler), 1);
}

function addPlayer(trawler, player) {
    player.teleport(trawler.spawnX, trawler.spawnY, true);
    trawler.players.push(player);

    player.message('@yel@You board the fishing trawler.');
    player.message(
        '@yel@Fill leaks with swamp paste, repair the net with rope,' +
            ' and bail water with your bailing bucket.'
    );

    if (trawler.stage === STATE.STANDBY) {
        start(trawler);
    }

    // updateInterfaces() equivalent (see header) - initial status on join.
    announceStatus(
        trawler,
        `@yel@Water level: ${trawler.waterLevel}/${SHIP_WATER_LIMIT_SINK}`,
        `@yel@Fish caught so far: ${trawler.fishCaught}`
    );

    if (trawler.tickHandle === null) {
        trawler.tickHandle = trawler.world.setTickTimeout(
            () => runTick(trawler),
            1
        );
    }
}

// murphy dialogue

async function showStartOption(
    player,
    npc,
    showOptionFish,
    showOptionNotSafe,
    showOptionHelp
) {
    const options = [];

    if (showOptionFish) {
        options.push('what fish do you catch?');
    }

    if (showOptionNotSafe) {
        options.push("your boat doesn't look too safe");
    }

    if (showOptionHelp) {
        options.push('could i help?');
    }

    const option = await player.ask(options, true);
    const chosen = options[option];

    if (chosen === 'could i help?') {
        await chatOptionHelp(player, npc);
    } else if (chosen === "your boat doesn't look too safe") {
        await chatOptionNotSafe(player, npc);
    } else if (chosen === 'what fish do you catch?') {
        await chatOptionFish(player, npc);
    }
}

async function chatOptionFish(player, npc) {
    await npc.say(
        'i get all sorts, anything that lies on the sea bed',
        "you never know what you're going to get until...",
        '...you pull up the net'
    );
    await showStartOption(player, npc, false, true, true);
}

async function chatOptionNotSafe(player, npc) {
    await npc.say("that's because it's not, the dawn thing's full of holes");
    await player.say("oh, so i suppose you can't go out for a while");
    await npc.say(
        "oh no, i don't let a few holes stop an experienced sailor like me",
        'i could sail these seas in a barrel',
        "i'll be going out soon enough"
    );
    await showStartOption(player, npc, true, false, true);
}

async function chatOptionHelp(player, npc) {
    await npc.say(
        'well of course you can',
        "i'll warn you though, the seas are merciless",
        "and with out fishing experience you won't catch much"
    );
    player.message(
        'you need a fishing level of 15 or above to catch any fish on the ' +
            'trawler'
    );
    await player.world.sleepTicks(3);
    await npc.say("on occasions the net rip's, so you'll need some rope to repair it");
    await player.say('rope...ok');
    await npc.say("there's also a slight problem with leaks");
    await player.say('leaks!');
    await npc.say("nothing some swamp paste won't fix");
    await player.say('swamp paste?');
    await npc.say("oh, and one more thing...", "..i hope you're a good swimmer");

    const gooption = await player.ask(
        [
            "actually, i think i'll leave it",
            "i'll be fine, lets go",
            "what's swamp paste?"
        ],
        true
    );

    if (gooption === 0) {
        await npc.say("bloomin' land lover's");
    } else if (gooption === 1) {
        await letsGo(player, npc);
    } else if (gooption === 2) {
        await npc.say(
            'swamp tar mixed with flour...',
            '...which is then heated over a fire'
        );
        await player.say('where can i find swamp tar?');
        await npc.say(
            'unfortunately the only supply of swamp tar is in the swamps ' +
                'below lumbridge'
        );
    }
}

async function letsGo(player, npc) {
    await npc.say('would you like to sail east or west?');
    const choice = await player.ask(['east please', 'west please'], false);

    if (choice !== 0 && choice !== 1) {
        return;
    }

    const boat = choice === 0 ? BOAT.EAST : BOAT.WEST;
    const trawler = getOrCreateTrawler(player.world, boat);

    if (isAvailable(trawler)) {
        await npc.say(
            'good stuff, jump aboard',
            'ok m hearty, keep your eys pealed',
            'i need you to clog up those holes quick time'
        );
        await player.say("i'm ready and waiting");

        if (!player.cache.fishingtrawler) {
            player.cache.fishingtrawler = true;
        }

        addPlayer(trawler, player);
    } else {
        await npc.say('sorry m hearty it appeears the boat is in the middle of a game');
        player.message('The boat should be available in a couple of minutes');
    }
}

async function talkToMurphyLand(player, npc) {
    if (!player.cache.fishingtrawler) {
        await player.say('good day to you sir');
        await npc.say('well hello my brave adventurer');
        await player.say('what are you up to?');
        await npc.say(
            'getting ready to go fishing of course',
            "there's no time to waste",
            "i've got all the supplies i need from the shop at the end of the pier",
            "they sell good rope, although their bailing buckets aren't too effective"
        );
        await showStartOption(player, npc, true, true, true);
        return;
    }

    await player.say('hello again murphy');
    await npc.say('good day to you land lover');

    if (player.cache.fishing_trawler_reward) {
        await npc.say("It looks like your net is full from last trip");
        return;
    }

    await npc.say('fancy hitting the high seas again?');

    const option = await player.ask(
        ["no thanks, i still feel ill from last time", "yes, lets do it"],
        true
    );

    if (option === 0) {
        await npc.say('hah..softy');
    } else if (option === 1) {
        await letsGo(player, npc);
    }
}

async function talkToMurphyBoat(player, npc) {
    await npc.say('whoooahh sailor');

    let option = await player.ask(
        ["i've had enough,  take me back", 'how you doing murphy?'],
        true
    );

    if (option === 0) {
        await npc.say("haa .. the soft land lovers lost there see legs have they?");
        await player.say('something like that');
        await npc.say("we're too far out now, it'd be dangerous");

        option = await player.ask(
            ['I insist murphy, take me back', 'Ok then murphy, just keep us afloat'],
            false
        );

        if (option === 0) {
            await player.say('i insist murphy, take me back');
            await npc.say("ok, ok, i'll try, but don't say i didn't warn you");
            player.message('murphy sharply turns the large ship');
            await player.world.sleepTicks(3);
            player.message('the boats gone under');
            await player.world.sleepTicks(3);
            player.message("you're lost at sea!");
            await player.world.sleepTicks(3);

            const trawler = getTrawlerForPlayer(player);

            if (trawler) {
                quitPlayer(trawler, player);
            } else {
                player.teleport(302, 759, false);
            }
        } else if (option === 1) {
            await player.say('ok then murphy, just keep us afloat');
            await npc.say("that's the attitude sailor");
        }
    }

    if (option === 1) {
        const rnd = random(0, 2);

        if (rnd === 0) {
            await npc.say("don't bail..it's a waste of time", 'just fill those holes');
        } else if (rnd === 1) {
            await npc.say(
                "it's a fierce sea today traveller",
                'you best hold on tight'
            );
        } else if (rnd === 2) {
            await npc.say("get those fishey's");
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id === MURPHY_LAND_ID) {
        player.engage(npc);
        await talkToMurphyLand(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === MURPHY_BOAT_ID) {
        player.engage(npc);
        await talkToMurphyBoat(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// fill a leak object

async function fillHole(player, gameObject) {
    if (player.inventory.has(SWAMP_PASTE_ID)) {
        player.inventory.remove(SWAMP_PASTE_ID, 1);
        player.world.removeEntity('gameObjects', gameObject);
        player.message('you fill the hole with swamp paste');

        const trawler = getTrawlerForPlayer(player);

        if (trawler) {
            const index = trawler.leaks.indexOf(gameObject);

            if (index !== -1) {
                trawler.leaks[index] = null;
            }
        }
    } else {
        player.message("you'll need some swamp paste to fill that");
    }

    await player.world.sleepTicks(1);
}

// repair a torn net

async function inspectNet(player) {
    player.message('you inspect the net');
    await player.world.sleepTicks(3);

    const trawler = getTrawlerForPlayer(player);

    if (trawler && trawler.netBroken) {
        player.message("it's begining to rip");

        if (!player.inventory.has(ROPE_ID)) {
            player.message("you'll need some rope to fix it");
            return;
        }

        player.message('you attempt to fix it with your rope');
        await player.world.sleepTicks(3);

        if (random(0, 1) === 0) {
            player.message('you manage to fix the net');
            player.inventory.remove(ROPE_ID, 1);
            trawler.netBroken = false;
        } else {
            player.message('but you fail in the harsh conditions');
        }
    } else {
        player.message('it is not damaged');
    }
}

// climb the floating barrel to bail out mid-trip

async function exitBarrel(player) {
    player.message('you climb onto the floating barrel');
    await player.world.sleepTicks(3);
    player.message('and begin to kick your way to the shore');
    await player.world.sleepTicks(3);
    player.message('you make it to the shore tired and weary');
    await player.world.sleepTicks(3);
    player.teleport(550, 711);
    player.damage(3);
}

// dispatch

async function onGameObjectCommandOne(player, gameObject) {
    if (inArray(gameObject.id, FILL_HOLE_OBJECT_IDS)) {
        await fillHole(player, gameObject);
        return true;
    }

    if (inArray(gameObject.id, INSPECT_NET_OBJECT_IDS)) {
        await inspectNet(player);
        return true;
    }

    if (gameObject.id === BARREL_OBJECT_ID) {
        await exitBarrel(player);
        return true;
    }

    if (gameObject.id === TRAWLER_CATCH_OBJECT) {
        await searchTrawlerCatch(player);
        return true;
    }

    return false;
}

// bail with the bucket

async function onInventoryCommand(player, item) {
    if (item.id !== BAILING_BUCKET_ID) {
        return false;
    }

    const trawler = getTrawlerForPlayer(player);

    if (
        trawler &&
        (inWaterShipArea(trawler, player) || inShipArea(trawler, player))
    ) {
        if (player.y >= 741 && player.y <= 743) {
            player.message('you bail a little water...');
        } else {
            player.message('you begin to bail a bucket load of water');
        }

        await player.world.sleepTicks(1);
        bailWater(trawler);
    }

    return true;
}

function inShipArea(trawler, player) {
    return (
        player.x >= trawler.shipMinX &&
        player.x <= trawler.shipMaxX &&
        player.y >= trawler.shipMinY &&
        player.y <= trawler.shipMaxY
    );
}

function inWaterShipArea(trawler, player) {
    return (
        player.x >= trawler.shipWaterMinX &&
        player.x <= trawler.shipWaterMaxX &&
        player.y >= trawler.shipWaterMinY &&
        player.y <= trawler.shipWaterMaxY
    );
}

// search the net at the dock

async function catchAndGiveFish(player) {
    for (const [levelReq, itemId, name, exp] of FISH_TABLE) {
        if (
            calcGatheringSuccessfulLegacy(
                levelReq,
                player.skills.fishing.current,
                18
            )
        ) {
            player.message(`..${name}!`);
            await player.world.sleepTicks(2);
            player.inventory.add(itemId, 1);
            player.addExperience('fishing', exp, false);
            return;
        }
    }

    player.message('..some shrimp');
    await player.world.sleepTicks(2);
    player.inventory.add(RAW_SHRIMP_ID, 1);
    player.addExperience('fishing', 40, false);
}

async function giveJunkItem(player) {
    const randomJunkItem = JUNK_ITEMS[random(0, JUNK_ITEMS.length - 1)];

    if (randomJunkItem === JUNK_EDIBLE_SEAWEED) {
        player.message('..some seaweed');
        await player.world.sleepTicks(2);
        player.inventory.add(JUNK_EDIBLE_SEAWEED, 1);
        player.addExperience('fishing', 20, false);
        return;
    }

    if (randomJunkItem === JUNK_OYSTER) {
        player.message('..an oyster!');
        await player.world.sleepTicks(2);
        player.inventory.add(JUNK_OYSTER, 1);
        player.addExperience('fishing', 40, false);
        return;
    }

    const def = ITEM_DEFS[randomJunkItem];
    const displayName = def ? def.name : `item ${randomJunkItem}`;

    if (randomJunkItem === JUNK_OLD_BOOT) {
        player.message(`..an ${displayName}`);
    } else {
        player.message(`..a ${displayName}`);
    }

    await player.world.sleepTicks(2);
    player.inventory.add(randomJunkItem, 1);
    player.addExperience('fishing', 5, false);
}

async function searchTrawlerCatch(player) {
    player.message('you search the smelly net');
    await player.world.sleepTicks(3);
    player.sendBubble(NET_ITEM);

    if (!player.cache.fishing_trawler_reward) {
        player.message('the smelly net is empty');
        return;
    }

    player.message('you find...');

    let fishCaught = player.cache.fishing_trawler_reward;

    if (player.inventory.isEquipped(FISH_CAP_ID)) {
        fishCaught = Math.floor(fishCaught * 1.5);
    }

    for (let fishGiven = 0; fishGiven < fishCaught; fishGiven += 1) {
        const isFishRoll = random(0, 1) === 1;

        if (isFishRoll) {
            await catchAndGiveFish(player);
        } else {
            await giveJunkItem(player);
        }

        player.cache.fishing_trawler_reward = fishCaught - (fishGiven + 1);
    }

    delete player.cache.fishing_trawler_reward;
    player.message("that's the lot");
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onInventoryCommand,
    // exported for the standalone harness / potential reuse
    _internal: {
        BOAT,
        STATE,
        TRAWLERS,
        getTrawler,
        getOrCreateTrawler,
        getTrawlerForPlayer,
        isAvailable,
        makeTrawlerState,
        addPlayer,
        start,
        resetGame,
        endGame,
        runTick,
        createLeaks,
        getFreeLeakIndex,
        getLeakCount,
        cleanRemovedLeaks,
        catchFish,
        netBreak,
        bailWater,
        registerFailure,
        disconnectPlayer,
        quitPlayer,
        calcGatheringSuccessfulLegacy,
        FISH_TABLE,
        JUNK_ITEMS,
        MURPHY_LAND_ID,
        MURPHY_BOAT_ID,
        LEAK1,
        LEAK2,
        FILL_HOLE_OBJECT_IDS,
        INSPECT_NET_OBJECT_IDS,
        BARREL_OBJECT_ID,
        TRAWLER_CATCH_OBJECT,
        FISH_CAP_ID,
        SWAMP_PASTE_ID,
        ROPE_ID,
        BAILING_BUCKET_ID,
        SPAWN_LAND,
        SPAWN_EAST_FAIL,
        SPAWN_WEST_FAIL
    }
};
