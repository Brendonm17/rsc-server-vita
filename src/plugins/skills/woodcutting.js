// https://classic.runescape.wiki/w/Woodcutting
// chop repeats until the tree falls, inventory fills, or the player tires

const items = require('@2003scape/rsc-data/config/items');
const { axes, trees } = require('@2003scape/rsc-data/skills/woodcutting');
const { rollSkillSuccess } = require('../../rolls');
const { getBatchCount } = require('./batch');
const skillCapes = require('./skill-capes');
const enchantedCrowns = require('./enchanted-crowns');

const NORMAL_TREES = new Set([0, 1, 70]);
const TREE_IDS = new Set(Object.keys(trees).map(Number));

// axes best to worst (no level req)
const AXE_IDS = Object.keys(axes)
    .map(Number)
    .sort((a, b) => {
        if (axes[a] === axes[b]) {
            return 0;
        }

        return axes[a] > axes[b] ? -1 : 1;
    });

function getDefinition(id) {
    const tree = trees[id];

    if (typeof tree.reference !== 'undefined') {
        return getDefinition(tree.reference);
    }

    return tree;
}

// still the same tree standing at its spot?
function treeStillThere(player, gameObject) {
    for (const obj of player.world.gameObjects.getAtPoint(
        gameObject.x,
        gameObject.y
    )) {
        if (obj.id === gameObject.id) {
            return obj;
        }
    }

    return null;
}

async function onGameObjectCommand(player, gameObject) {
    const treeID = gameObject.id;

    if (!TREE_IDS.has(treeID)) {
        return false;
    }

    const tree = getDefinition(treeID);
    const woodcuttingLevel = player.skills.woodcutting.current;

    if (tree.level > woodcuttingLevel) {
        player.message(
            `You need a woodcutting level of ${tree.level} to axe this tree`
        );

        return true;
    }

    let bestAxeID = -1;

    for (const axeID of AXE_IDS) {
        if (player.inventory.has(axeID)) {
            bestAxeID = axeID;
            break;
        }
    }

    if (bestAxeID === -1) {
        player.message('@que@You need an axe to chop this tree down');
        return true;
    }

    if (player.isTired()) {
        player.message('@que@You are too tired to cut the tree');
        return true;
    }

    const { world } = player;
    const { x, y } = gameObject;
    const axeName = items[bestAxeID].name.toLowerCase();

    const repeat = getBatchCount(player, 'woodcutting');

    // transient flag: player is mid a gathering batch
    player.gatheringSkill = true;
    try {
        for (let i = 0; i < repeat; i += 1) {
            // tree already felled -> stop the batch
            if (!treeStillThere(player, gameObject)) {
                return true;
            }

            player.message(`@que@You swing your ${axeName} at the tree...`);
            player.sendBubble(bestAxeID);

            await world.sleepTicks(3);

            if (player.isTired()) {
                player.message('@que@You are too tired to cut the tree');
                return true;
            }

            const logSuccess = rollSkillSuccess(
                tree.roll[0] * axes[bestAxeID],
                tree.roll[1] * axes[bestAxeID],
                woodcuttingLevel
            );

            if (
                world.gameObjects.getAtPoint(x, y)[0] === gameObject &&
                logSuccess
            ) {
                let shouldFall =
                    NORMAL_TREES.has(treeID) || Math.random() <= 0.125;

                player.addExperience('woodcutting', tree.experience);
                player.message('@que@You get some wood');
                player.inventory.add(tree.log);

                // crown of the items (8%): an extra log appears on the ground
                if (enchantedCrowns.shouldActivate(player, 'items')) {
                    player.message(
                        'Your crown shines and an extra item appears on ' +
                            'the ground'
                    );
                    world.addPlayerDrop(player, { id: tree.log, amount: 1 });
                    enchantedCrowns.useCharge(player, 'items');
                }

                // woodcutting cape (35%): can prevent a tree from falling
                if (shouldFall && skillCapes.shouldActivate(player, 'woodcutting')) {
                    player.message(
                        '@gre@Your woodcutting cape prevents the tree from falling'
                    );
                    shouldFall = false;
                }

                if (shouldFall) {
                    const stump = world.replaceEntity(
                        'gameObjects',
                        gameObject,
                        tree.stump
                    );

                    world.setTimeout(() => {
                        world.replaceEntity('gameObjects', stump, treeID);
                    }, tree.respawn);

                    // tree felled -> batch ends
                    return true;
                }
            } else {
                player.message('@que@You slip and fail to hit the tree');
            }
        }
    } finally {
        player.gatheringSkill = false;
    }

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!/chop/i.test(gameObject.definition.commands[0])) {
        return false;
    }

    await onGameObjectCommand(player, gameObject);
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!/chop/i.test(gameObject.definition.commands[1])) {
        return false;
    }

    await onGameObjectCommand(player, gameObject);
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
