// clock tower quest ids and reward

const { questsEnabled } = require('../../custom-gate.js');

const KOJO_ID = 366;
const DUNGEON_RAT_ID = 367;

const COG_BLUE_ID = 727;
const COG_BLACK_ID = 728;
const COG_RED_ID = 729;
const COG_PURPLE_ID = 730;

const RAT_POISON_ID = 731;
const COINS_ID = 10;
const ICE_GLOVES_ID = 556;

const POLE_BLUE_ID = 362;
const POLE_RED_ID = 363;
const POLE_PURPLE_ID = 364;
const POLE_BLACK_ID = 365;

const GATE_CLOSED_ID = 371;
const GATE_OPEN_ID = 372;
const LEVER_ONE_ID = 373;
const LEVER_TWO_ID = 374;
const FOODTROUGH_ID = 375;

const RAT_CAGE_WALL_ID = 111;
const ODD_WALL_ID = 22;

// gate positions in the dungeon rat cage
const OUTER_GATE = { x: 594, y: 3475 };
const INNER_GATE = { x: 590, y: 3475 };

const POLE_IDS = [POLE_BLUE_ID, POLE_RED_ID, POLE_PURPLE_ID, POLE_BLACK_ID];
const COG_IDS = [COG_BLUE_ID, COG_BLACK_ID, COG_RED_ID, COG_PURPLE_ID];

function hasAnyCog(player) {
    return COG_IDS.some((id) => player.inventory.has(id));
}

function allCogsPlaced(player) {
    return (
        player.cache['1st_cog'] &&
        player.cache['2nd_cog'] &&
        player.cache['3rd_cog'] &&
        player.cache['4th_cog']
    );
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== KOJO_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.clockTower;

    switch (stage) {
        case 0:
        case undefined: {
            await player.say('Hello Monk');
            await npc.say(
                "Hello traveller, I'm Brother Kojo",
                'Do you know the time?'
            );
            await player.say('No... Sorry');
            await npc.say(
                'Oh dear, oh dear, I must fix the clock',
                'The town people are becoming angry',
                'Please could you help?'
            );

            const menu = await player.ask(
                ['Ok old monk what can I do?', 'Not now old monk'],
                true
            );

            if (menu === 0) {
                await npc.say(
                    'Oh thank you',
                    "In the cellar below you'll find four cogs",
                    "They're too heavy for me, but you should",
                    'Be able to carry them one at a time',
                    'One goes on each floor',
                    "But I can't remember which goes where"
                );
                await player.say("I'll do my best");
                await npc.say(
                    'Be careful, strange beasts dwell in the cellars'
                );
                player.questStages.clockTower = 1;
            } else if (menu === 1) {
                await npc.say('Ok then');
            }

            break;
        }
        case 1: {
            if (allCogsPlaced(player)) {
                await player.say('I have replaced all the cogs');
                await npc.say('Really..? wait, listen');
                player.message('Tick Tock, Tick Tock');
                await npc.say('Well done, well done');
                player.message('Tick Tock, Tick Tock');
                await npc.say(
                    'Yes yes yes, you\'ve done it',
                    'You are clever'
                );
                player.message('You have completed the clock tower quest');
                await npc.say(
                    'That will please the village folk',
                    'Please take these coins as a reward'
                );

                await completeQuest(player);
                player.disengage();
                return true;
            }

            await player.say('Hello again');
            await npc.say(
                'Oh hello, are you having trouble?',
                'The cogs are in four rooms below us',
                'Place one cog on a pole on each',
                'Of the four tower levels'
            );
            break;
        }
        case -1: {
            await player.say('Hello again Brother Kojo');
            await npc.say(
                'Oh hello there traveller',
                "You've done a grand job with the clock",
                "It's just like new"
            );
            break;
        }
    }

    player.disengage();
    return true;
}

async function completeQuest(player) {
    // reward: 1 qp, 500 coins, clears quest caches
    player.questStages.clockTower = -1;

    delete player.cache.rats_dead;
    delete player.cache['1st_cog'];
    delete player.cache['2nd_cog'];
    delete player.cache['3rd_cog'];
    delete player.cache['4th_cog'];
    delete player.cache.foodtrough;

    player.inventory.add(COINS_ID, 500);
    player.addQuestPoints(1);
    player.message('@gre@You have completed the Clock Tower quest');
    player.message('@gre@You have gained 1 quest point!');
}

// reports whether a cog is mounted on this floor's pole
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (POLE_IDS.includes(gameObject.id)) {
        const stage = player.questStages.clockTower;

        if (stage === -1) {
            player.message('The clock is now working');
            return true;
        }

        // stage 0/1, undefined treated as 0
        if (
            player.cache['1st_cog'] &&
            gameObject.id === POLE_PURPLE_ID &&
            gameObject.x === 581 &&
            gameObject.y === 2525
        ) {
            player.message("There's a large cog on this pole");
            return true;
        }

        if (
            player.cache['2nd_cog'] &&
            gameObject.id === POLE_BLACK_ID &&
            gameObject.x === 581 &&
            gameObject.y === 639
        ) {
            player.message("There's a large cog on this pole");
            return true;
        }

        if (
            player.cache['3rd_cog'] &&
            gameObject.id === POLE_BLUE_ID &&
            gameObject.x === 580 &&
            gameObject.y === 3470
        ) {
            player.message("There's a large cog on this pole");
            return true;
        }

        if (
            player.cache['4th_cog'] &&
            gameObject.id === POLE_RED_ID &&
            gameObject.x === 582 &&
            gameObject.y === 1582
        ) {
            player.message("There's a large cog on this pole");
            return true;
        }

        player.message('A large pole, a cog is missing');
        return true;
    }

    // Levers 373 / 374 - toggle the rat cage gates.
    if (gameObject.id === LEVER_ONE_ID || gameObject.id === LEVER_TWO_ID) {
        const { world } = player;

        let dynGate;
        let statGate;
        let correctSetup = false;

        if (gameObject.id === LEVER_ONE_ID) {
            dynGate = gateAt(world, OUTER_GATE.x, OUTER_GATE.y);
            statGate = gateAt(world, INNER_GATE.x, INNER_GATE.y);
            // outer gate was open + inner gate is open
            correctSetup =
                dynGate.id === GATE_OPEN_ID && statGate.id === GATE_OPEN_ID;
        } else {
            dynGate = gateAt(world, INNER_GATE.x, INNER_GATE.y);
            statGate = gateAt(world, OUTER_GATE.x, OUTER_GATE.y);
            // inner gate was closed + outer gate is closed
            correctSetup =
                dynGate.id === GATE_CLOSED_ID && statGate.id === GATE_CLOSED_ID;
        }

        if (dynGate.id === GATE_CLOSED_ID) {
            player.message('The gate swings open');
            replaceGate(world, dynGate, GATE_OPEN_ID);
        } else if (dynGate.id === GATE_OPEN_ID) {
            player.message('The gate creaks shut');
            replaceGate(world, dynGate, GATE_CLOSED_ID);
        }

        if (player.cache.foodtrough && correctSetup) {
            player.message('In their panic the rats bend and twist');
            await world.sleepTicks(3);
            player.message('The cage bars with their teeth');
            await world.sleepTicks(3);
            player.message("They're becoming weak, some have collapsed");
            await world.sleepTicks(3);
            player.message('The rats are eating the poison');
            await world.sleepTicks(3);
            player.message("They're becoming weak, some have collapsed");
            await world.sleepTicks(3);
            player.message('The rats are slowly dying');
            await world.sleepTicks(3);

            for (const rat of world.npcs.getInArea(player.x, player.y, 16)) {
                if (rat.id === DUNGEON_RAT_ID) {
                    world.removeEntity('npcs', rat);
                }
            }

            delete player.cache.foodtrough;
            player.cache.rats_dead = true;
        }

        return true;
    }

    // Locked gate 371 at y == 3475.
    if (gameObject.id === GATE_CLOSED_ID && gameObject.y === 3475) {
        player.message('The gate is locked');
        // climb path inactive by default; shows the locked-gate message
        player.message('The gate will not open from here');
        return true;
    }

    return false;
}

function gateAt(world, x, y) {
    const [gate] = world.gameObjects.getAtPoint(x, y);
    return gate || { id: -1 };
}

function replaceGate(world, oldGate, newId) {
    world.replaceEntity('gameObjects', oldGate, newId);
}

// Use rat poison on the foodtrough, or a cog on a clock pole.
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === FOODTROUGH_ID && item.id === RAT_POISON_ID) {
        player.message('You pour the rat poison into the feeding trough');
        player.inventory.remove(RAT_POISON_ID);
        player.cache.foodtrough = true;
        return true;
    }

    if (!POLE_IDS.includes(gameObject.id) || !COG_IDS.includes(item.id)) {
        return false;
    }

    const stage = player.questStages.clockTower;

    // Purple cog -> purple pole, top floor (581, 2525) - 1st cog.
    if (item.id === COG_PURPLE_ID) {
        if (
            gameObject.id === POLE_PURPLE_ID &&
            gameObject.x === 581 &&
            gameObject.y === 2525
        ) {
            if (stage === 1 && !player.cache['1st_cog']) {
                player.message('The cog fits perfectly');
                player.inventory.remove(COG_PURPLE_ID);
                player.cache['1st_cog'] = true;
            } else if (stage === -1 || player.cache['1st_cog']) {
                player.message('You have already placed a cog here');
            }
        } else {
            player.message("The cog doesn't fit");
        }
        return true;
    }

    // Black cog -> black pole, ground floor (581, 639) - 2nd cog.
    if (item.id === COG_BLACK_ID) {
        if (
            gameObject.id === POLE_BLACK_ID &&
            gameObject.x === 581 &&
            gameObject.y === 639
        ) {
            if (stage === 1 && !player.cache['2nd_cog']) {
                player.message('The cog fits perfectly');
                player.inventory.remove(COG_BLACK_ID);
                player.cache['2nd_cog'] = true;
            } else if (stage === -1 || player.cache['2nd_cog']) {
                player.message('You have already placed a cog here');
            }
        } else {
            player.message("The cog doesn't fit");
        }
        return true;
    }

    // Blue cog -> blue pole, bottom floor (580, 3470) - 3rd cog.
    if (item.id === COG_BLUE_ID) {
        if (
            gameObject.id === POLE_BLUE_ID &&
            gameObject.x === 580 &&
            gameObject.y === 3470
        ) {
            if (stage === 1 && !player.cache['3rd_cog']) {
                player.message('The cog fits perfectly');
                player.inventory.remove(COG_BLUE_ID);
                player.cache['3rd_cog'] = true;
            } else if (stage === -1 || player.cache['3rd_cog']) {
                player.message('You have already placed a cog here');
            }
        } else {
            player.message("The cog doesn't fit");
        }
        return true;
    }

    // Red cog -> red pole, second floor (582, 1582) - 4th cog.
    if (item.id === COG_RED_ID) {
        if (
            gameObject.id === POLE_RED_ID &&
            gameObject.x === 582 &&
            gameObject.y === 1582
        ) {
            if (stage === 1 && !player.cache['4th_cog']) {
                player.message('The cog fits perfectly');
                player.inventory.remove(COG_RED_ID);
                player.cache['4th_cog'] = true;
            } else if (stage === -1 || player.cache['4th_cog']) {
                player.message('You have already placed a cog here');
            }
        } else {
            player.message("The cog doesn't fit");
        }
        return true;
    }

    return false;
}

// rat cage wall, crawl through once rats are dead
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id === RAT_CAGE_WALL_ID) {
        if (player.cache.rats_dead || player.questStages.clockTower === -1) {
            player.message('In a panic to escape, the rats have..');
            await player.world.sleepTicks(1);
            player.message('..bent the bars, you can just crawl through');

            if (player.x >= 583) {
                player.teleport(582, 3476, false);
            } else {
                player.teleport(583, 3476, false);
            }
        }
        return true;
    }

    if (
        wallObject.id === ODD_WALL_ID &&
        wallObject.x === 584 &&
        wallObject.y === 3457
    ) {
        player.sendSound('secretdoor');
        player.message('You just went through a secret door');

        // doDoor(obj, player, 16): walk the player through the wall.
        if (player.y >= 3457) {
            player.teleport(player.x, 3456, false);
        } else {
            player.teleport(player.x, 3457, false);
        }
        return true;
    }

    return false;
}

// pick up the black cog; ice gloves required, it's red-hot
async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (COG_IDS.includes(groundItem.id) && groundItem.id !== COG_BLACK_ID) {
        // Non-black cogs: heavy, only one at a time.
        if (hasAnyCog(player)) {
            player.message('The cogs are heavy, you can only carry one');
            return true;
        }
        return false;
    }

    if (groundItem.id === COG_BLACK_ID) {
        const iceGlovesEquipped = hasWorn(player, ICE_GLOVES_ID);

        if (iceGlovesEquipped) {
            player.message('The ice gloves cool down the cog');
            await player.world.sleepTicks(3);
            player.message('You can carry it now');
            await player.world.sleepTicks(3);

            if (hasAnyCog(player)) {
                player.message('You can only carry one');
            } else {
                player.message('You take the cog');
                player.world.removeEntity('groundItems', groundItem);
                player.inventory.add(COG_BLACK_ID);
            }
        } else {
            player.message(
                'The cog is red hot from the flames, too hot to carry'
            );
            await player.world.sleepTicks(3);
            player.message('The cogs are heavy');
            await player.world.sleepTicks(3);

            if (hasAnyCog(player)) {
                player.message('You can only carry one');
            }
        }

        return true;
    }

    return false;
}

// checks whether a specific item id is equipped
function hasWorn(player, id) {
    return !!player.inventory.items.find(
        (item) => item.id === id && item.equipped
    );
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onUseWithGameObject,
    onWallObjectCommandOne,
    onGroundItemTake
};
