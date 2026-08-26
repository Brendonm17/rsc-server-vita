
// item / object id constants

const ROPE_ID = 237; // rsc-data item "Rope"

const skillCapes = require('./skill-capes');

// worn agility cape auto-succeeds the shortcut
function wearingSkillcape(player) {
    return skillCapes.wearingAgilityCape(player);
}

// roll 1..256; below level fails; min chance 64/256
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function calcProductionSuccessfulLegacy(
    levelReq,
    skillLevel,
    stopsFailing,
    levelStopFail,
    minFailChance = 1
) {
    const roll = random(1, 256);

    if (skillLevel < levelReq) {
        return false;
    }

    const maxThreshold = stopsFailing ? 256 : 256 - minFailChance;
    const threshold = Math.min(
        maxThreshold,
        Math.floor(64 + (skillLevel - 1) * (19200.0 / (levelStopFail * 98)))
    );

    return roll <= threshold;
}

function agilityLevel(player) {
    return player.skills.agility.current;
}

// OpenRSC getSkills().getLevel(HITS) = current hits level.
function hitsLevel(player) {
    return player.skills.hits.current;
}

// base (max) hits level
function hitsMax(player) {
    return player.skills.hits.base;
}

function face(player, x, y) {
    player.faceDirection(x - player.x, y - player.y);
}

// lap-completion bonus: per-player set of obstacles done this lap
function completedObstacle(player, id, obstacles, lastObstacle, bonus) {
    if (!player._agilityObstaclesDone) {
        if (id === lastObstacle) {
            player._agilityObstaclesDone = new Set();
        } else {
            player._agilityObstaclesDone = new Set([id]);
        }

        return;
    }

    const done = player._agilityObstaclesDone;

    if (obstacles.has(id)) {
        done.add(id);
    } else if (id === lastObstacle) {
        let hasAll = true;

        for (const o of obstacles) {
            if (!done.has(o)) {
                hasAll = false;
                break;
            }
        }

        if (hasAll) {
            player.addExperience('agility', bonus);
            player._agilityObstaclesDone = new Set();
        }
    }
}

// AgilityUtils.hasDoneObstacle
function hasDoneObstacle(player, id) {
    return (
        !!player._agilityObstaclesDone && player._agilityObstaclesDone.has(id)
    );
}

// a nearby npc shouts a line
async function nearbyNpcSay(player, npcId, ...messages) {
    const [npc] = player.getNearbyEntitiesByID('npcs', npcId, 10);

    if (npc) {
        await npc.say(...messages);
    }
}

const GNOME = {
    BALANCE_LOG: 655,
    NET: 647,
    WATCH_TOWER: 648,
    ROPE_SWING: 650,
    LANDING: 649,
    SECOND_NET: 653,
    PIPE: 654
};

const GNOME_TRAINER_ENTRANCE = 576;
const GNOME_TRAINER_STARTINGNET = 577;
const GNOME_TRAINER_PLATFORM = 578;
const GNOME_TRAINER_ENDINGNET = 579;

const GNOME_OBSTACLES = new Set([
    GNOME.BALANCE_LOG,
    GNOME.NET,
    GNOME.WATCH_TOWER,
    GNOME.ROPE_SWING,
    GNOME.LANDING,
    GNOME.SECOND_NET
]);
const GNOME_LAST = GNOME.PIPE;
const GNOME_BONUS = 150;

const GNOME_IDS = new Set(Object.values(GNOME));

// fatigue-exempt gnome obstacles (WATCH_TOWER, ROPE_SWING, LANDING)
const GNOME_FATIGUE_EXEMPT = new Set([
    GNOME.WATCH_TOWER,
    GNOME.ROPE_SWING,
    GNOME.LANDING
]);

async function gnomeCourse(player, gameObject) {
    const { world } = player;
    const id = gameObject.id;

    if (player.isTired() && !GNOME_FATIGUE_EXEMPT.has(id)) {
        player.message('you are too tired to train');
        return true;
    }

    switch (id) {
        case GNOME.BALANCE_LOG:
            player.message('you stand on the slippery log');
            await world.sleepTicks(6); // OpenRSC: 6 boundary steps each delay()
            player.message('and walk across');
            player.teleport(692, 499);
            player.addExperience('agility', 30);
            completedObstacle(
                player,
                id,
                GNOME_OBSTACLES,
                GNOME_LAST,
                GNOME_BONUS
            );
            return true;

        case GNOME.NET:
            if (!hasDoneObstacle(player, GNOME.NET)) {
                await nearbyNpcSay(
                    player,
                    GNOME_TRAINER_STARTINGNET,
                    'move it, move it, move it'
                );
            }
            player.message('you climb the net');
            await world.sleepTicks(3);
            player.teleport(692, 1448);
            player.message('and pull yourself onto the platform');
            player.addExperience('agility', 30);
            completedObstacle(
                player,
                id,
                GNOME_OBSTACLES,
                GNOME_LAST,
                GNOME_BONUS
            );
            return true;

        case GNOME.WATCH_TOWER:
            if (!hasDoneObstacle(player, GNOME.WATCH_TOWER)) {
                await nearbyNpcSay(
                    player,
                    GNOME_TRAINER_PLATFORM,
                    "that's it, straight up, no messing around"
                );
            }
            player.message('you pull yourself up the tree');
            await world.sleepTicks(2);
            player.teleport(693, 2394);
            player.message('to the platform above');
            player.addExperience('agility', 30);
            completedObstacle(
                player,
                id,
                GNOME_OBSTACLES,
                GNOME_LAST,
                GNOME_BONUS
            );
            return true;

        case GNOME.ROPE_SWING:
            player.message('you reach out and grab the rope swing');
            await world.sleepTicks(2);
            player.message('you hold on tight');
            await world.sleepTicks(4);
            player.teleport(685, 2396);
            player.message('and swing to the oppisite platform');
            player.addExperience('agility', 30);
            completedObstacle(
                player,
                id,
                GNOME_OBSTACLES,
                GNOME_LAST,
                GNOME_BONUS
            );
            return true;

        case GNOME.LANDING:
            player.message('you hang down from the tower');
            await world.sleepTicks(2);
            player.teleport(683, 506);
            player.message('and drop to the floor');
            await player.say('ooof');
            player.addExperience('agility', 30);
            completedObstacle(
                player,
                id,
                GNOME_OBSTACLES,
                GNOME_LAST,
                GNOME_BONUS
            );
            return true;

        case GNOME.SECOND_NET:
            if (!hasDoneObstacle(player, GNOME.SECOND_NET)) {
                await nearbyNpcSay(
                    player,
                    GNOME_TRAINER_ENDINGNET,
                    'my granny can move faster than you'
                );
            }
            player.message('you take a few steps back');
            await world.sleepTicks(1);
            player.teleport(683, 505);
            player.message('and run towards the net');
            await world.sleepTicks(1);
            player.teleport(683, 501);
            player.addExperience('agility', 30);
            completedObstacle(
                player,
                id,
                GNOME_OBSTACLES,
                GNOME_LAST,
                GNOME_BONUS
            );
            return true;

        case GNOME.PIPE:
            player.message('you squeeze into the pipe');
            await world.sleepTicks(3);
            player.message('and shuffle down into it');
            await world.sleepTicks(3);
            player.teleport(683, 494);
            if (!hasDoneObstacle(player, GNOME.PIPE)) {
                await nearbyNpcSay(
                    player,
                    GNOME_TRAINER_ENTRANCE,
                    "that's the way, well done"
                );
            }
            player.addExperience('agility', 30);
            completedObstacle(
                player,
                id,
                GNOME_OBSTACLES,
                GNOME_LAST,
                GNOME_BONUS
            );
            return true;
    }

    return false;
}

// barbarian agility course
const BARB = {
    LOW_WALL: 163, // wall object (OpBound)
    LOW_WALL2: 164, // wall object (OpBound)
    LEDGE: 678,
    NET: 677,
    LOG: 676,
    PIPE: 671,
    BACK_PIPE: 672,
    SWING: 675,
    HANDHOLDS: 679
};

// completed set: swing, log, net, ledge, low wall; last = low wall 2
const BARB_OBSTACLES = new Set([
    BARB.SWING,
    BARB.LOG,
    BARB.NET,
    BARB.LEDGE,
    BARB.LOW_WALL
]);
const BARB_LAST = BARB.LOW_WALL2;
const BARB_BONUS = 300;

const BARB_LOC_IDS = new Set([
    BARB.PIPE,
    BARB.BACK_PIPE,
    BARB.SWING,
    BARB.LOG,
    BARB.LEDGE,
    BARB.NET,
    BARB.HANDHOLDS
]);

// BarbarianAgilityCourse.succeed: calcProductionSuccessfulLegacy(35, lvl, false, 50, 4)
function barbSucceed(player) {
    return calcProductionSuccessfulLegacy(
        35,
        agilityLevel(player),
        false,
        50,
        4
    );
}

async function barbarianCourse(player, gameObject) {
    const { world } = player;
    const id = gameObject.id;

    // pipe / back pipe: level 35, own fatigue message, then squeeze through
    if (id === BARB.BACK_PIPE || id === BARB.PIPE) {
        if (agilityLevel(player) < 35) {
            player.message(
                'You need an agility level of 35 to attempt to squeeze ' +
                    'through the pipe'
            );
            return true;
        }

        if (player.isTired()) {
            player.message('You are too tired to squeeze through the pipe');
            return true;
        }

        player.message('You squeeze through the pipe');
        await world.sleepTicks(3);

        if (player.y <= 551) {
            player.teleport(487, 554);
        } else {
            player.teleport(487, 551);
        }

        player.addExperience('agility', 20);
        return true;
    }

    // fatigue gate (LEDGE and HANDHOLDS are exempt)
    if (player.isTired() && id !== BARB.LEDGE && id !== BARB.HANDHOLDS) {
        player.message('you are too tired to train');
        return true;
    }

    const passObstacle = barbSucceed(player);

    switch (id) {
        case BARB.SWING:
            player.message('You grab the rope and try and swing across');
            await world.sleepTicks(3);
            if (passObstacle) {
                player.message('You skillfully swing across the hole');
                await world.sleepTicks(3);
                player.teleport(486, 559);
                player.addExperience('agility', 80);
                completedObstacle(
                    player,
                    id,
                    BARB_OBSTACLES,
                    BARB_LAST,
                    BARB_BONUS
                );
            } else {
                player.message(
                    'Your hands slip and you fall to the level below'
                );
                await world.sleepTicks(3);
                player.teleport(486, 3389);
                player.message('You land painfully on the spikes');
                await world.sleepTicks(3);
                player.damage(Math.round(hitsLevel(player) * 0.15));
                await player.say('ouch');
            }
            return true;

        case BARB.LOG:
            player.message('you stand on the slippery log');
            await world.sleepTicks(3);
            if (passObstacle) {
                player.message('and walk across');
                player.teleport(492, 563);
                player.addExperience('agility', 50);
                completedObstacle(
                    player,
                    id,
                    BARB_OBSTACLES,
                    BARB_LAST,
                    BARB_BONUS
                );
            } else {
                player.message('Your lose your footing and land in the water');
                player.teleport(490, 561);
                player.message('Something in the water bites you');
                player.damage(Math.round(hitsLevel(player) * 0.1));
            }
            return true;

        case BARB.NET:
            player.message('You climb up the netting');
            player.teleport(496, 1507);
            player.addExperience('agility', 50);
            completedObstacle(
                player,
                id,
                BARB_OBSTACLES,
                BARB_LAST,
                BARB_BONUS
            );
            return true;

        case BARB.LEDGE:
            // OpenRSC: only the ledge at x==498 is the operable obstacle.
            if (gameObject.x !== 498) {
                return true;
            }
            player.message(
                'You put your foot on the ledge and try to edge across'
            );
            await world.sleepTicks(2);
            if (passObstacle) {
                player.teleport(501, 1506);
                player.message('You skillfully balance across the hole');
                player.addExperience('agility', 80);
                completedObstacle(
                    player,
                    id,
                    BARB_OBSTACLES,
                    BARB_LAST,
                    BARB_BONUS
                );
            } else {
                player.message(
                    'you lose your footing and fall to the level below'
                );
                player.teleport(499, 563);
                player.message('You land painfully on the spikes');
                player.damage(Math.round(hitsLevel(player) * 0.15));
                await player.say('ouch');
            }
            return true;

        case BARB.HANDHOLDS:
            player.message('You climb up the wall');
            player.teleport(497, 555);
            player.addExperience('agility', 20);
            return true;
    }

    return false;
}

// the two low walls (jump over)
async function barbarianLowWall(player, wallObject) {
    const { world } = player;

    if (player.isTired()) {
        player.message('you are too tired to jump the wall');
        return true;
    }

    player.message('You jump over the wall');
    await world.sleepTicks(1);

    // boundaryTeleport(x == obj.x ? x-1 : x+1, y)
    const newX = player.x === wallObject.x ? player.x - 1 : player.x + 1;
    player.teleport(newX, player.y);

    player.addExperience('agility', 20);
    completedObstacle(
        player,
        wallObject.id,
        BARB_OBSTACLES,
        BARB_LAST,
        BARB_BONUS
    );

    return true;
}

// wilderness agility course
const WILD = {
    GATE: 703,
    SECOND_GATE: 704,
    PIPE: 705,
    ROPESWING: 706,
    STONE: 707,
    LEDGE: 708,
    VINE: 709
};

const WILD_OBSTACLES = new Set([
    WILD.PIPE,
    WILD.ROPESWING,
    WILD.STONE,
    WILD.LEDGE
]);
const WILD_LAST = WILD.VINE;
const WILD_BONUS = 1500;

const WILD_IDS = new Set(Object.values(WILD));

// WildernessAgilityCourse.succeed: calcProductionSuccessfulLegacy(52, lvl, false, 77, 4)
function wildSucceed(player) {
    return calcProductionSuccessfulLegacy(
        52,
        agilityLevel(player),
        false,
        77,
        4
    );
}

async function wildernessCourse(player, gameObject) {
    const { world } = player;
    const id = gameObject.id;

    // failRate() = random(1,5) -> 1 or 2 means fall into the wolf pit (two exits)
    const failRate = random(1, 5);

    if (id === WILD.GATE) {
        if (agilityLevel(player) < 52) {
            player.message(
                'You need an agility level of 52 to attempt balancing along ' +
                    'the ridge'
            );
            return true;
        }
        player.message(
            'You go through the gate and try to edge over the ridge'
        );
        await world.sleepTicks(2);
        player.teleport(298, 130);
        await world.sleepTicks(2);
        if (failRate === 1) {
            player.message('you lose your footing and fall into the wolf pit');
            await world.sleepTicks(3);
            player.teleport(300, 129);
        } else if (failRate === 2) {
            player.message('you lose your footing and fall into the wolf pit');
            await world.sleepTicks(3);
            player.teleport(296, 129);
        } else {
            player.message('You skillfully balance across the ridge');
            await world.sleepTicks(3);
            player.teleport(298, 125);
            player.addExperience('agility', 50);
        }
        return true;
    }

    if (id === WILD.SECOND_GATE) {
        player.message(
            'You go through the gate and try to edge over the ridge'
        );
        await world.sleepTicks(2);
        player.teleport(298, 130);
        await world.sleepTicks(2);
        if (failRate === 1) {
            player.message('you lose your footing and fall into the wolf pit');
            await world.sleepTicks(3);
            player.teleport(300, 129);
        } else if (failRate === 2) {
            player.message('you lose your footing and fall into the wolf pit');
            await world.sleepTicks(3);
            player.teleport(296, 129);
        } else {
            player.message('You skillfully balance across the ridge');
            await world.sleepTicks(3);
            player.teleport(298, 134);
            player.addExperience('agility', 50);
        }
        return true;
    }

    // fatigue gate (VINE exempt)
    if (player.isTired() && id !== WILD.VINE) {
        player.message('you are too tired to train');
        return true;
    }

    const passObstacle = wildSucceed(player);

    switch (id) {
        case WILD.PIPE:
            player.message('You squeeze through the pipe');
            await world.sleepTicks(2);
            player.teleport(294, 112);
            player.addExperience('agility', 50);
            completedObstacle(
                player,
                id,
                WILD_OBSTACLES,
                WILD_LAST,
                WILD_BONUS
            );
            return true;

        case WILD.ROPESWING:
            player.message('You grab the rope and try and swing across');
            await world.sleepTicks(2);
            if (passObstacle) {
                player.message('You skillfully swing across the hole');
                await world.sleepTicks(3);
                player.teleport(292, 108);
                player.addExperience('agility', 100);
                completedObstacle(
                    player,
                    id,
                    WILD_OBSTACLES,
                    WILD_LAST,
                    WILD_BONUS
                );
                return true;
            }
            player.message('Your hands slip and you fall to the level below');
            await world.sleepTicks(2);
            player.teleport(293, 2942);
            player.message('You land painfully on the spikes');
            await player.say('ouch');
            player.damage(Math.round(hitsLevel(player) * 0.15));
            return true;

        case WILD.STONE:
            player.message('you stand on the stepping stones');
            await world.sleepTicks(2);
            if (passObstacle) {
                player.message('and walk across');
                player.teleport(297, 106);
                player.addExperience('agility', 80);
                completedObstacle(
                    player,
                    id,
                    WILD_OBSTACLES,
                    WILD_LAST,
                    WILD_BONUS
                );
            } else {
                player.message('Your lose your footing and land in the lava');
                player.teleport(292, 104);
                player.damage(Math.round(hitsLevel(player) * 0.21));
            }
            return true;

        case WILD.LEDGE:
            player.message('you stand on the ledge');
            await world.sleepTicks(2);
            if (passObstacle) {
                player.message('and walk across');
                player.teleport(301, 111);
                player.addExperience('agility', 80);
                completedObstacle(
                    player,
                    id,
                    WILD_OBSTACLES,
                    WILD_LAST,
                    WILD_BONUS
                );
            } else {
                player.message(
                    'you lose your footing and fall to the level below'
                );
                await world.sleepTicks(2);
                player.teleport(298, 2945);
                player.message('You land painfully on the spikes');
                await player.say('ouch');
                player.damage(Math.round(hitsLevel(player) * 0.25));
            }
            return true;

        case WILD.VINE:
            player.message('You climb up the cliff');
            await world.sleepTicks(2);
            player.teleport(304, 120);
            player.addExperience('agility', 80); // completion of the course
            completedObstacle(
                player,
                id,
                WILD_OBSTACLES,
                WILD_LAST,
                WILD_BONUS
            );
            return true;
    }

    return false;
}

const SHORTCUT = {
    FALADOR_HANDHOLD: 693,
    BRIMHAVEN_SWING: 694,
    BRIMHAVEN_BACK_SWING: 695,
    EDGE_DUNGEON_SWING: 684,
    EDGE_DUNGEON_BACK_SWING: 685,
    WEST_COALTRUCKS_LOG: 681,
    EAST_COALTRUCKS_LOG: 680,
    SHILO_ROCKS_TO_BRIDGE: 710,
    SHILO_BRIDGE_JUMP: 691,
    YANILLE_ROPESWING: 628,
    YANILLE_ROPESWING_BACK: 627,
    YANILLE_LEDGE: 614,
    YANILLE_LEDGE_BACK: 615,
    YANILLE_RUBBLE: 636,
    YANILLE_RUBBLE_UP: 633,
    YANILLE_PIPE: 656,
    YANILLE_PIPE_BACK: 657,
    GREW_ROPE_ATTACH: 662,
    GREW_ROPE_ATTACHED: 663,
    GREW_SWING_BACK: 664,
    EAST_KARAMJA_LOG: 692,
    EAST_KARAMJA_STONES: 701,
    YANILLE_CLIMBING_ROCKS: 1029,
    YANILLE_WATCHTOWER_HANDHOLDS: 658,

    TAVERLY_PIPE: 1236,
    TAVERLY_PIPE_RETURN: 1237,
    ENTRANA_RUBBLE: 1286,
    TAVERLY_STEPPING_STONE: 1287,
    CATHERBY_STEPPING_STONE: 1288,
    FALADOR_MEMBERS_EXIT_HANDHOLDS: 1290,
    KBD_TO_LAVADUNG_STEPPING_STONE: 1291,
    LAVADUNG_TO_KBD_STEPPING_STONE: 1292,
    SHILO_TO_NATURE_STEPPING_STONE: 1295
};

const SHORTCUT_IDS = new Set(Object.values(SHORTCUT));

// AgilityShortcuts.succeed(player, req): skillcape ? true : calcProductionSuccessfulLegacy(req, lvl, false, req + 30)
function shortcutSucceed(player, req) {
    if (wearingSkillcape(player)) {
        return true;
    }
    return calcProductionSuccessfulLegacy(
        req,
        agilityLevel(player),
        false,
        req + 30
    );
}

// AgilityShortcuts.succeed(player, req, lvlStopFail): skillcape ? true :
// calcProductionSuccessfulLegacy(req, lvl, true, lvlStopFail)
function shortcutSucceedStop(player, req, lvlStopFail) {
    if (wearingSkillcape(player)) {
        return true;
    }
    return calcProductionSuccessfulLegacy(
        req,
        agilityLevel(player),
        true,
        lvlStopFail
    );
}

async function agilityShortcut(player, gameObject) {
    const { world } = player;
    const id = gameObject.id;

    switch (id) {
        case SHORTCUT.SHILO_BRIDGE_JUMP: {
            if (agilityLevel(player) < 32) {
                player.message(
                    'You need an agility level of 32 to climb the rocks'
                );
                return true;
            }
            player.message('The bridge beyond this fence looks very unsafe.');
            await world.sleepTicks(3);
            player.message(
                'However, you could try to negotiate it if you\'re feeling ' +
                    'very agile.'
            );
            await world.sleepTicks(3);
            player.message('Would you like to try?');
            const jumpMenu = await player.ask(
                [
                    'No thanks! It looks far too dangerous!',
                    'Yes, I\'m totally brave and quite agile!'
                ],
                false
            );
            if (jumpMenu === 0) {
                player.message(
                    'You decide that common sense is the better part of ' +
                        'valour.'
                );
                await world.sleepTicks(3);
                player.message(
                    'And stop yourself from being hurled to what must be an '
                );
                await world.sleepTicks(3);
                player.message('inevitable death.');
            } else if (jumpMenu === 1) {
                player.message('You prepare to negotiate the bridge fence...');
                await world.sleepTicks(3);
                player.message('You run and jump...');
                await world.sleepTicks(3);
                if (shortcutSucceed(player, 32)) {
                    player.message(
                        '...and land perfectly on the other side!'
                    );
                    if (player.x >= 460) {
                        player.teleport(458, 828);
                    } else {
                        player.teleport(460, 828);
                    }
                } else {
                    player.message(
                        '...slip and fall incompetently into the river below!'
                    );
                    player.teleport(458, 832);
                    await player.say('* Ahhhhhhhhhh! *');
                    player.damage(Math.floor(hitsLevel(player) / 10));
                    await world.sleepTicks(1);
                    player.teleport(458, 836);
                    player.damage(Math.floor(hitsLevel(player) / 10));
                    await world.sleepTicks(2);
                    await player.say('* Gulp! *');
                    await world.sleepTicks(3);
                    player.teleport(459, 841);
                    await player.say('* Gulp! *');
                    await world.sleepTicks(2);
                    player.message(
                        'You just manage to drag your pitiful frame onto the ' +
                            'river bank.'
                    );
                    await player.say('* Gasp! *');
                    player.damage(Math.floor(hitsLevel(player) / 10));
                    await world.sleepTicks(2);
                    player.message('Though you nearly drowned in the river!');
                }
            }
            return true;
        }

        case SHORTCUT.SHILO_ROCKS_TO_BRIDGE: {
            if (agilityLevel(player) < 32) {
                player.message(
                    'You need an agility level of 32 to climb the rocks'
                );
                return true;
            }
            player.message('These rocks look quite dangerous to climb.');
            await world.sleepTicks(3);
            player.message('But you may be able to scale them.');
            await world.sleepTicks(3);
            player.message('Would you like to try?');
            const menu = await player.ask(
                [
                    'Yes, I can easily climb this!',
                    'Nope, I\'m sure I\'ll probably fall!'
                ],
                false
            );
            if (menu === 0) {
                if (shortcutSucceed(player, 32)) {
                    player.message(
                        'You manage to climb the rocks succesfully and pick'
                    );
                    await world.sleepTicks(3);
                    if (gameObject.x === 450) {
                        player.message(
                            'a route though the trecherous embankment to the ' +
                                'top.'
                        );
                        player.teleport(452, 829);
                    } else {
                        player.message(
                            'a route though the trecherous embankment to the ' +
                                'bottom.'
                        );
                        player.teleport(449, 828);
                    }
                } else {
                    player.teleport(450, 828);
                    player.message('You fall and hurt yourself.');
                    await world.sleepTicks(3);
                    player.damage(Math.floor(hitsLevel(player) / 10));
                    await world.sleepTicks(1);
                    player.teleport(449, 828);
                }
            } else if (menu === 1) {
                player.message('You decide not to climb the rocks.');
            }
            return true;
        }

        case SHORTCUT.FALADOR_HANDHOLD:
            if (agilityLevel(player) < 5) {
                player.message(
                    'You need an agility level of 5 to climb the wall'
                );
                return true;
            }
            player.message('You climb over the wall');
            player.teleport(338, 555);
            player.addExperience('agility', 50);
            return true;

        case SHORTCUT.BRIMHAVEN_SWING:
            if (agilityLevel(player) < 10) {
                player.message(
                    'You need an agility level of 10 to attempt to swing on ' +
                        'this vine'
                );
                return true;
            }
            player.message('You grab the vine and try and swing across');
            await world.sleepTicks(2);
            player.teleport(511, 669);
            player.message('You skillfully swing across the stream');
            await player.say('Aaaaahahah');
            player.addExperience('agility', 20);
            return true;

        case SHORTCUT.BRIMHAVEN_BACK_SWING:
            if (agilityLevel(player) < 10) {
                player.message(
                    'You need an agility level of 10 to attempt to swing on ' +
                        'this vine'
                );
                return true;
            }
            player.message('You grab the vine and try and swing across');
            await world.sleepTicks(2);
            player.teleport(508, 668);
            player.message('You skillfully swing across the stream');
            await player.say('Aaaaahahah');
            player.addExperience('agility', 20);
            return true;

        case SHORTCUT.EDGE_DUNGEON_SWING:
            if (agilityLevel(player) < 15) {
                player.message(
                    'You need an agility level of 15 to attempt to swing on ' +
                        'this rope'
                );
                return true;
            }
            await world.sleepTicks(2);
            player.teleport(207, 3221);
            player.message('You skillfully swing across the hole');
            player.addExperience('agility', 40);
            return true;

        case SHORTCUT.EDGE_DUNGEON_BACK_SWING:
            if (agilityLevel(player) < 15) {
                player.message(
                    'You need an agility level of 15 to attempt to swing on ' +
                        'this rope'
                );
                return true;
            }
            await world.sleepTicks(2);
            player.teleport(206, 3225);
            player.message('You skillfully swing across the hole');
            player.addExperience('agility', 40);
            return true;

        case SHORTCUT.WEST_COALTRUCKS_LOG:
            if (agilityLevel(player) < 20) {
                player.message(
                    'You need an agility level of 20 to attempt balancing ' +
                        'along this log'
                );
                return true;
            }
            player.message('You stand on the slippery log');
            player.teleport(592, 458);
            player.message('and you walk across');
            player.addExperience('agility', 34);
            return true;

        case SHORTCUT.EAST_COALTRUCKS_LOG:
            if (agilityLevel(player) < 20) {
                player.message(
                    'You need an agility level of 20 to attempt balancing ' +
                        'along this log'
                );
                return true;
            }
            player.message('You stand on the slippery log');
            player.teleport(598, 458);
            player.message('and you walk across');
            player.addExperience('agility', 34);
            return true;

        case SHORTCUT.YANILLE_ROPESWING:
            if (agilityLevel(player) < 57) {
                player.message(
                    'You need an agility level of 57 to attempt to swing on ' +
                        'this rope'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to swing on the rope');
                return true;
            }
            player.message('You grab the rope and try and swing across');
            await world.sleepTicks(2);
            if (!shortcutSucceedStop(player, 57, 77)) {
                player.message(
                    'You miss the opposite side and fall to the level below'
                );
                player.teleport(596, 3534);
                return true;
            }
            player.teleport(596, 3581);
            player.message('You skillfully swing across the hole');
            player.addExperience('agility', 110);
            return true;

        case SHORTCUT.YANILLE_ROPESWING_BACK:
            if (agilityLevel(player) < 57) {
                player.message(
                    'You need an agility level of 57 to attempt to swing on ' +
                        'this rope'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to swing on the rope');
                return true;
            }
            player.message('You grab the rope and try and swing across');
            await world.sleepTicks(2);
            if (!shortcutSucceedStop(player, 57, 77)) {
                player.message(
                    'You miss the opposite side and fall to the level below'
                );
                player.teleport(598, 3536);
                return true;
            }
            player.teleport(598, 3585);
            player.message('You skillfully swing across the hole');
            player.addExperience('agility', 110);
            return true;

        case SHORTCUT.YANILLE_LEDGE:
            if (agilityLevel(player) < 40) {
                player.message(
                    'You need an agility level of 40 to attempt balancing ' +
                        'along this log'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to balance on the ledge');
                return true;
            }
            player.message(
                'You put your foot on the ledge and try to edge across'
            );
            await world.sleepTicks(3);
            if (!shortcutSucceedStop(player, 40, 65)) {
                player.message(
                    'you lose your footing and fall to the level below'
                );
                player.teleport(603, 3520);
                player.damage(Math.floor(hitsLevel(player) * 0.2));
                return true;
            }
            player.teleport(601, 3563);
            player.message('You skillfully balance across the hole');
            player.addExperience('agility', 90);
            return true;

        case SHORTCUT.YANILLE_LEDGE_BACK:
            if (agilityLevel(player) < 40) {
                player.message(
                    'You need an agility level of 40 to attempt balancing ' +
                        'along this log'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to balance on the ledge');
                return true;
            }
            player.message(
                'You put your foot on the ledge and try to edge across'
            );
            await world.sleepTicks(3);
            if (!shortcutSucceedStop(player, 40, 65)) {
                player.message(
                    'you lose your footing and fall to the level below'
                );
                player.teleport(603, 3520);
                player.damage(Math.floor(hitsLevel(player) * 0.2));
                return true;
            }
            player.teleport(601, 3557);
            player.message('You skillfully balance across the hole');
            player.addExperience('agility', 90);
            return true;

        case SHORTCUT.YANILLE_RUBBLE:
            if (agilityLevel(player) < 67) {
                player.message(
                    'You need an agility level of 67 to attempt to climb down ' +
                        'the rubble'
                );
                return true;
            }
            player.teleport(580, 3525);
            player.message('You climb down the pile of rubble');
            return true;

        case SHORTCUT.YANILLE_RUBBLE_UP:
            if (agilityLevel(player) < 67) {
                player.message(
                    'You need an agility level of 67 to attempt to climb up ' +
                        'the rubble'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to climb up the rubble');
                return true;
            }
            player.teleport(582, 3573);
            player.message('You climb up the pile of rubble');
            player.addExperience('agility', 54);
            return true;

        case SHORTCUT.YANILLE_PIPE:
            if (agilityLevel(player) < 49) {
                player.message(
                    'You need an agility level of 49 to attempt to squeeze ' +
                        'through the pipe'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to squeeze through the pipe');
                return true;
            }
            player.message('You squeeze through the pipe');
            await world.sleepTicks(2);
            player.teleport(608, 3568);
            player.addExperience('agility', 30);
            return true;

        case SHORTCUT.YANILLE_PIPE_BACK:
            if (agilityLevel(player) < 49) {
                player.message(
                    'You need an agility level of 49 to attempt to squeeze ' +
                        'through the pipe'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to squeeze through the pipe');
                return true;
            }
            player.message('You squeeze through the pipe');
            await world.sleepTicks(2);
            player.teleport(605, 3568);
            player.addExperience('agility', 30);
            return true;

        case SHORTCUT.GREW_ROPE_ATTACHED:
            // rope tied to the tree -> swing across
            if (player.x === 664 && player.y === 755) {
                player.message("You can't reach the tree from here");
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to swing on the rope');
                return true;
            }
            if (agilityLevel(player) < 30) {
                player.message(
                    'You need an agility level of 30 to attempt to swing ' +
                        'across the stream'
                );
                return true;
            }
            player.message('You grab the rope and try and swing across');
            await world.sleepTicks(2);
            player.teleport(664, 755);
            player.message('You skillfully swing across the stream');
            player.addExperience('agility', 50);
            return true;

        case SHORTCUT.GREW_SWING_BACK:
            player.message('You grab the rope and try and swing across');
            await world.sleepTicks(2);
            player.teleport(666, 755);
            player.message('You skillfully swing across the stream');
            player.addExperience('agility', 50);
            return true;

        case SHORTCUT.EAST_KARAMJA_LOG:
            if (agilityLevel(player) < 32) {
                player.message(
                    'You need an agility level of 32 to attempt balancing ' +
                        'along this log'
                );
                return true;
            }
            player.message('You attempt to walk over the the slippery log..');
            await world.sleepTicks(3);
            if (!shortcutSucceed(player, 32)) {
                player.teleport(368, 781);
                await world.sleepTicks(1);
                player.message('@red@You fall into the stream!');
                player.message('You lose some health');
                player.teleport(370, 776);
                player.damage(1);
                return true;
            }
            if (player.x <= 367) {
                player.teleport(370, 781);
            } else {
                player.teleport(366, 781);
            }
            player.message('...and make it without any problems!');
            player.addExperience('agility', 10);
            return true;

        case SHORTCUT.EAST_KARAMJA_STONES:
            if (agilityLevel(player) < 32) {
                player.message(
                    'You need an agility level of 32 to step on these stones'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too fatigued to continue.');
                return true;
            }
            player.message('You jump onto the rock');
            if (player.y <= 805) {
                player.teleport(347, 806);
                await world.sleepTicks(1);
                if (!shortcutSucceed(player, 32)) {
                    await world.sleepTicks(2);
                    player.teleport(341, 809);
                    player.message('@red@!!! You Fall !!!');
                    player.message(
                        'You get washed up on the other side of the river...'
                    );
                    await world.sleepTicks(3);
                    player.message('After being nearly half drowned');
                    await world.sleepTicks(3);
                    player.damage(Math.floor(hitsLevel(player) / 4) + 2);
                    return true;
                }
                player.teleport(346, 808);
            } else {
                player.teleport(346, 807);
                await world.sleepTicks(1);
                if (!shortcutSucceed(player, 32)) {
                    await world.sleepTicks(2);
                    player.teleport(341, 805);
                    player.message('@red@!!! You Fall !!!');
                    player.message(
                        'You get washed up on the other side of the river...'
                    );
                    await world.sleepTicks(3);
                    player.message('After being nearly half drowned');
                    await world.sleepTicks(3);
                    player.damage(Math.floor(hitsLevel(player) / 4) + 2);
                    return true;
                }
                player.teleport(347, 805);
            }
            player.message('And cross the water without problems.');
            player.addExperience('agility', 10);
            return true;

        case SHORTCUT.YANILLE_CLIMBING_ROCKS:
            if (player.isTired()) {
                player.message('You are too tired to climb up the wall');
                return true;
            }
            if (agilityLevel(player) < 15) {
                player.message(
                    'You need an agility level of 15 to climb the wall'
                );
                return true;
            }
            player.message('You climb over the wall');
            player.teleport(624, 741);
            player.addExperience('agility', 40);
            return true;

        case SHORTCUT.YANILLE_WATCHTOWER_HANDHOLDS:
            if (player.isTired()) {
                player.message('You are too tired to climb up the wall');
                return true;
            }
            if (agilityLevel(player) < 18) {
                player.message(
                    'You need an agility level of 18 to climb the wall'
                );
                return true;
            }
            player.message('You climb up the wall');
            player.teleport(637, 1680);
            player.message('And climb in through the window');
            player.addExperience('agility', 50);
            return true;

        // custom shortcuts

        case SHORTCUT.TAVERLY_PIPE_RETURN:
            if (agilityLevel(player) < 70) {
                player.message(
                    'You need an agility level of 70 to attempt to squeeze ' +
                        'through the pipe'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to squeeze through the pipe');
                return true;
            }
            player.message('You squeeze through the pipe');
            player.teleport(372, 3352);
            player.addExperience('agility', 30);
            return true;

        case SHORTCUT.TAVERLY_PIPE:
            if (agilityLevel(player) < 70) {
                player.message(
                    'You need an agility level of 70 to attempt to squeeze ' +
                        'through the pipe'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to squeeze through the pipe');
                return true;
            }
            player.message('You squeeze through the pipe');
            player.teleport(375, 3352);
            player.addExperience('agility', 30);
            return true;

        case SHORTCUT.ENTRANA_RUBBLE:
            if (agilityLevel(player) < 55) {
                player.message('You need an agility level of 55 to climb the rubble');
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to climb the rubble');
                return true;
            }
            await world.sleepTicks(1);
            if (player.y < 550) {
                player.teleport(434, 551);
                player.addExperience('agility', 15);
            } else {
                player.teleport(434, 549);
                player.addExperience('agility', 15);
            }
            return true;

        case SHORTCUT.TAVERLY_STEPPING_STONE: {
            if (agilityLevel(player) < 50) {
                player.message(
                    'You need an agility level of 50 to use this shortcut'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to jump to the stone');
                return true;
            }
            player.teleport(395, 502);
            await world.sleepTicks(1);
            face(player, 397, 502);
            player.message('You sure your footing...');
            await world.sleepTicks(3);
            player.teleport(396, 502);
            player.message('and attempt to cross the stones...');
            await world.sleepTicks(4);
            if (random(1, 100) > 10 || wearingSkillcape(player)) {
                player.teleport(397, 502);
                player.message('you make it to the shore of Catherby');
                player.addExperience('agility', 60);
            } else {
                player.message('and fall into the water!');
                const damage = Math.floor(hitsMax(player) / 5);
                // If the hit would kill them, drop their gear on the Taverly side
                if (damage >= hitsLevel(player)) {
                    player.teleport(394, 502);
                } else {
                    player.teleport(388, 522);
                }
                player.damage(damage);
            }
            return true;
        }

        case SHORTCUT.CATHERBY_STEPPING_STONE: {
            if (agilityLevel(player) < 50) {
                player.message(
                    'You need an agility level of 50 to use this shortcut'
                );
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to jump to the stone');
                return true;
            }
            player.teleport(397, 502);
            await world.sleepTicks(1);
            face(player, 395, 502);
            player.message('You sure your footing...');
            await world.sleepTicks(3);
            player.teleport(396, 502);
            player.message('and attempt to cross the stones...');
            await world.sleepTicks(4);
            if (random(1, 100) > 10 || wearingSkillcape(player)) {
                player.teleport(395, 502);
                player.message('you make it to the shore of Taverly');
                player.addExperience('agility', 60);
            } else {
                player.message('and fall into the water!');
                const damage = Math.floor(hitsMax(player) / 5);
                // If the hit would kill them, drop their gear on the Catherby side
                if (damage >= hitsLevel(player)) {
                    player.teleport(397, 501);
                } else {
                    player.teleport(388, 522);
                }
                player.damage(damage);
            }
            return true;
        }

        case SHORTCUT.FALADOR_MEMBERS_EXIT_HANDHOLDS:
            if (agilityLevel(player) < 40) {
                player.message('You need an agility level of 40 to climb the wall');
                return true;
            }
            player.message('You climb over the wall');
            player.teleport(339, 544);
            player.addExperience('agility', 80);
            return true;

        case SHORTCUT.KBD_TO_LAVADUNG_STEPPING_STONE:
            if (agilityLevel(player) < 67) {
                player.message('You need an agility level of 67 to jump to the stone');
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to jump to the stone');
                return true;
            }
            player.teleport(280, 3015);
            face(player, 274, 3015);
            player.message('You focus on not slipping...');
            await world.sleepTicks(4);
            if (
                calcProductionSuccessfulLegacy(
                    19,
                    agilityLevel(player) - 48,
                    false,
                    58,
                    26
                ) ||
                wearingSkillcape(player)
            ) {
                player.teleport(278, 3015);
                await world.sleepTicks(3);
                player.teleport(276, 3015);
                await world.sleepTicks(3);
                player.teleport(274, 3015);
                await world.sleepTicks(3);
                player.teleport(272, 3015);
                face(player, 272, 3013);
                await world.sleepTicks(3);
                player.teleport(272, 3012);
                player.message('and skillfully cross the lava');
                player.addExperience('agility', 160);
            } else {
                player.message('but fall into the lava');
                const lavaDamage = Math.round(hitsLevel(player) * 0.21);
                player.teleport(281, 3016);
                player.damage(lavaDamage);
            }
            return true;

        case SHORTCUT.LAVADUNG_TO_KBD_STEPPING_STONE:
            if (agilityLevel(player) < 67) {
                player.message('You need an agility level of 67 to jump to the stone');
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to jump to the stone');
                return true;
            }
            player.teleport(272, 3013);
            face(player, 272, 3015);
            player.message('You focus on not slipping...');
            await world.sleepTicks(4);
            if (
                calcProductionSuccessfulLegacy(
                    19,
                    agilityLevel(player) - 48,
                    false,
                    58,
                    26
                ) ||
                wearingSkillcape(player)
            ) {
                player.teleport(272, 3015);
                face(player, 280, 3015);
                await world.sleepTicks(3);
                player.teleport(274, 3015);
                await world.sleepTicks(3);
                player.teleport(276, 3015);
                await world.sleepTicks(3);
                player.teleport(278, 3015);
                await world.sleepTicks(3);
                player.teleport(281, 3015);
                player.message('and skillfully cross the lava');
                player.addExperience('agility', 160);
            } else {
                player.message('but fall into the lava');
                const lavaDamage = Math.round(hitsLevel(player) * 0.21);
                player.teleport(271, 3012);
                player.damage(lavaDamage);
            }
            return true;

        case SHORTCUT.SHILO_TO_NATURE_STEPPING_STONE: {
            if (agilityLevel(player) < 85) {
                player.message('You need an agility level of 85 to jump to the stone');
                return true;
            }
            if (player.isTired()) {
                player.message('You are too tired to jump to the stone');
                return true;
            }

            // roll before any movement
            const cross = shortcutSucceed(player, 85);
            const damage = Math.round(hitsLevel(player) * 0.2);
            const successPoint =
                player.y > 830 ? { x: 369, y: 829 } : { x: 367, y: 831 };
            const failPoint =
                player.y > 830 ? { x: 383, y: 836 } : { x: 383, y: 833 };

            player.message('You jump out onto the stone');
            player.teleport(368, 830);
            await world.sleepTicks(3);
            if (cross) {
                player.message('You successfully cross the river');
                player.teleport(successPoint.x, successPoint.y);
                player.addExperience('agility', 80);
            } else {
                player.message('You slip and fall into the river');
                player.damage(damage);
                player.teleport(failPoint.x, failPoint.y);
            }
            return true;
        }
    }

    return false;
}

// tie rope to grew island tree, makes it swingable; respawns after 60s
async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== SHORTCUT.GREW_ROPE_ATTACH || item.id !== ROPE_ID) {
        return false;
    }

    const { world } = player;

    player.message('you tie the rope to the tree');
    player.inventory.remove(ROPE_ID);

    const attached = world.replaceEntity(
        'gameObjects',
        gameObject,
        SHORTCUT.GREW_ROPE_ATTACHED
    );

    world.setTimeout(() => {
        const [current] = world.gameObjects.getAtPoint(attached.x, attached.y);

        if (current === attached) {
            world.replaceEntity(
                'gameObjects',
                attached,
                SHORTCUT.GREW_ROPE_ATTACH
            );
        }
    }, 60000);

    return true;
}


async function onGameObjectCommandOne(player, gameObject) {
    const id = gameObject.id;

    if (GNOME_IDS.has(id)) {
        return await gnomeCourse(player, gameObject);
    }

    if (BARB_LOC_IDS.has(id)) {
        return await barbarianCourse(player, gameObject);
    }

    if (WILD_IDS.has(id)) {
        return await wildernessCourse(player, gameObject);
    }

    if (SHORTCUT_IDS.has(id)) {
        return await agilityShortcut(player, gameObject);
    }

    return false;
}

async function onWallObjectCommandOne(player, wallObject) {
    if (wallObject.id === BARB.LOW_WALL || wallObject.id === BARB.LOW_WALL2) {
        return await barbarianLowWall(player, wallObject);
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onWallObjectCommandOne,
    onUseWithGameObject
};
