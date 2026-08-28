// https://classic.runescape.wiki/w/Shilo_Village  (Kharazi Jungle traversal)
//
// The dense jungle south of Shilo Village is hacked through tile-by-tile: every
// successful swing teleports the player onto the tree/vine's own tile, cutting
// a path deeper in. There is no batch loop here: one click = one swing = at most
// one tile of progress.
//
//   - Jungle trees (1086, 1091, 1092, 1099, 1100) are game objects. A swing
//     fells the tree to a stump (1087, respawns after 60s) and needs level 50
//     woodcutting, a machette (1172) carried, and an axe.
//   - Jungle vines (wall object 204) are hacked away (respawn after 5.5s) and
//     need level 50 + a machette; the machette itself is the "axe" (bonus 0).
//   - The felled-tree stump (1087) is a game object whose "Walk" simply
//     teleports you onto it (you can't path through the jungle normally).
//
// Each successful cut gives a flat 20 xp (whether or not a log drops); a log
// (id 14) drops on only 1-in-11 swings. If fatigue maxes out on the Kharazi side
// (y >= 866) the swing is force-completed with no xp so the player is shoved
// back out and can never get permanently stuck.

const { axes } = require('@2003scape/rsc-data/skills/woodcutting');
const items = require('@2003scape/rsc-data/config/items');
const WallObject = require('../../model/wall-object');

const MACHETTE_ID = 1172;
const LOGS_ID = 14;

const JUNGLE_TREE_IDS = new Set([1086, 1100, 1099, 1092, 1091]);
const JUNGLE_TREE_STUMP_ID = 1087;
// a wall object (boundary named "Jungle"); item id 204 is the adamantite axe
const JUNGLE_VINE_ID = 204;

const REQUIRED_LEVEL = 50;
const TREE_RESPAWN_MS = 60 * 1000; // 1 minute
const VINE_RESPAWN_MS = 5500; // 5.5 seconds

// Axes ranked best-first (there is no woodcutting level requirement to use any
// axe).
const AXE_IDS = Object.keys(axes)
    .map(Number)
    .sort((a, b) => {
        if (axes[a] === axes[b]) {
            return 0;
        }

        return axes[a] > axes[b] ? -1 : 1;
    });

// The additive bonus fed to the legacy gathering formula (not the multiplier
// the normal woodcutting flow uses). The machette and any unlisted tool default
// to 0.
const AXE_BONUS = {
    87: 0, // bronze
    12: 1, // iron
    88: 2, // steel
    428: 3, // black
    203: 4, // mithril
    204: 8, // adamantite
    405: 16 // rune
};

// Gathering success roll: roll in [1,128]; succeed if skillLevel >= levelReq
// and roll <= clamp(skillLevel + bonus + 40 - floor(levelReq * 1.5), 1, 127).
function calcGatheringSuccessfulLegacy(levelReq, skillLevel, equipmentBonus) {
    const roll = Math.floor(Math.random() * 128) + 1; // random(1, 128) inclusive

    if (skillLevel < levelReq) {
        return false;
    }

    const threshold = Math.min(
        127,
        Math.max(
            1,
            skillLevel + equipmentBonus + 40 - Math.floor(levelReq * 1.5)
        )
    );

    return roll <= threshold;
}

// still the same obstacle standing at its tile? (resolves wall objects for the
// vine)
function jungleObjectStillThere(player, obj, isVine) {
    const list = isVine ? player.world.wallObjects : player.world.gameObjects;

    for (const other of list.getAtPoint(obj.x, obj.y)) {
        if (other.id === obj.id) {
            return other;
        }
    }

    return null;
}

// cut/hack one tile. `force` (the fatigue force-out) skips the success roll and
// grants no xp, but still removes the obstacle, rolls for a log and teleports.
async function cutJungle(player, axeID, obj, isVine, force) {
    const { world } = player;
    const woodcuttingLevel = player.skills.woodcutting.current;

    if (
        !(
            force ||
            calcGatheringSuccessfulLegacy(
                REQUIRED_LEVEL,
                woodcuttingLevel,
                AXE_BONUS[axeID] || 0
            )
        )
    ) {
        player.message(
            `@que@You slip and fail to hit the ${
                isVine ? 'jungle vines' : 'tree'
            }`
        );

        return;
    }

    const standing = jungleObjectStillThere(player, obj, isVine);

    if (standing) {
        if (isVine) {
            // remove the vine boundary; it grows back after 5.5s
            const { x, y, direction } = obj;
            world.removeEntity('wallObjects', standing);
            world.setTimeout(() => {
                world.addEntity(
                    'wallObjects',
                    new WallObject(world, {
                        id: JUNGLE_VINE_ID,
                        x,
                        y,
                        direction
                    })
                );
            }, VINE_RESPAWN_MS);

            if (!force) {
                // print the hack-through message to the quest tab.
                player.message('@que@You hack your way through the jungle.');
            }

            // this delay is outside the !force guard, so it always runs for a
            // vine.
            await world.sleepTicks(2);
        } else {
            // fell the tree to a stump; the tree grows back after a minute
            const stump = world.replaceEntity(
                'gameObjects',
                standing,
                JUNGLE_TREE_STUMP_ID
            );

            world.setTimeout(() => {
                world.replaceEntity('gameObjects', stump, obj.id);
            }, TREE_RESPAWN_MS);
        }

        if (!force) {
            player.addExperience('woodcutting', 20);
        }
    }

    // a log drops on only 1-in-11 swings, and this runs whether or not the
    // obstacle was still standing.
    if (Math.floor(Math.random() * 11) === 8) {
        player.inventory.add(LOGS_ID);
        player.message('@que@You get some wood');
    }

    // hack forward onto the obstacle's tile. teleport() defers the actual move
    // by 2 ticks, so the boundary test below reads the destination (obj.y).
    player.teleport(obj.x, obj.y);

    if (obj.y > 871) {
        if (isVine) {
            await world.sleepTicks(6);
        }

        player.message('You manage to hack your way into the Kharazi Jungle.');
    }
}

async function handleJungleWoodcut(player, obj, isVine) {
    const { world } = player;

    // fatigue: too tired to cut. On the Shilo side (y < 866) this just stops; on
    // the Kharazi side (y >= 866) the player is forced out of the jungle so they
    // can't get permanently stuck (a free, xp-less cut).
    if (player.isTired()) {
        player.message(
            `@que@You are too tired to cut the ${
                isVine ? 'jungle vines' : 'tree'
            }`
        );

        if (player.y < 866) {
            return;
        }

        player.message(
            'It takes you some time, but you eventually make your way'
        );
        player.message('out of the Khazari jungle.');
        await cutJungle(player, 0, obj, isVine, true);

        return;
    }

    if (player.skills.woodcutting.current < REQUIRED_LEVEL) {
        player.message(
            `You need a woodcutting level of ${REQUIRED_LEVEL} to axe this tree`
        );

        return;
    }

    if (!player.inventory.has(MACHETTE_ID)) {
        player.message(
            "@que@This jungle is very thick, you'll need a machette to cut " +
                'through.'
        );
        await world.sleepTicks(3);

        return;
    }

    let axeID;

    if (!isVine) {
        axeID = -1;

        for (const id of AXE_IDS) {
            if (player.inventory.has(id)) {
                axeID = id;
                break;
            }
        }

        if (axeID === -1) {
            player.message('@que@You need an axe to chop this tree down');
            return;
        }
    } else {
        // vines are hacked with the machette itself (bonus 0)
        axeID = MACHETTE_ID;
    }

    player.sendBubble(axeID);
    player.message(
        `@que@You swing your ${items[axeID].name.toLowerCase()} at the ${
            isVine ? 'jungle vines' : 'tree'
        }...`
    );

    // "getting very tired" warning: fires at fatigue level isTired(80), while
    // not yet fully maxed out.
    if (player.isTired(80) && !player.isTired()) {
        player.message(
            'You are getting very tired, you may get stuck if you continue ' +
                'into the jungle.'
        );
    }

    await cutJungle(player, axeID, obj, isVine, false);
}

async function onGameObjectCommandOne(player, gameObject) {
    if (JUNGLE_TREE_IDS.has(gameObject.id)) {
        await handleJungleWoodcut(player, gameObject, false);
        return true;
    }

    // felled-tree stump: you can't path through the jungle, so "Walk" just
    // teleports you onto it.
    if (gameObject.id === JUNGLE_TREE_STUMP_ID) {
        player.teleport(gameObject.x, gameObject.y);
        return true;
    }

    return false;
}

async function onWallObjectCommandOne(player, wallObject) {
    if (wallObject.id !== JUNGLE_VINE_ID) {
        return false;
    }

    await handleJungleWoodcut(player, wallObject, true);
    return true;
}

module.exports = { onGameObjectCommandOne, onWallObjectCommandOne };
