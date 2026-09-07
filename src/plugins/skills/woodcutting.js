// https://classic.runescape.wiki/w/Woodcutting
// chop repeats until the tree falls, the inventory fills, or the player tires

const items = require('@2003scape/rsc-data/config/items');
const { axes, trees } = require('@2003scape/rsc-data/skills/woodcutting');
const { rollSkillSuccess } = require('../../rolls');
const { getBatchCount } = require('./batch');
const skillCapes = require('./skill-capes');
const enchantedCrowns = require('./enchanted-crowns');

const NORMAL_TREES = new Set([0, 1, 70]);
const TREE_IDS = new Set(Object.keys(trees).map(Number));

// axes best to worst (no level requirement, unlike pickaxes)
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

    if (tree.level > player.skills.woodcutting.current) {
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

            if (i > 0) {
                // extra 1-tick gap between swings (none before the first)
                await world.sleepTicks(1);
            }

            player.message(`@que@You swing your ${axeName} at the tree...`);
            player.sendBubble(bestAxeID);

            await world.sleepTicks(3);

            if (player.isTired()) {
                player.message('@que@You are too tired to cut the tree');
                return true;
            }

            // re-read the live level each iteration so a mid-batch level-up counts
            const woodcuttingLevel = player.skills.woodcutting.current;

            if (tree.level > woodcuttingLevel) {
                player.message(
                    `You need a woodcutting level of ${tree.level} to axe this tree`
                );

                return true;
            }

            const logSuccess = rollSkillSuccess(
                tree.roll[0] * axes[bestAxeID],
                tree.roll[1] * axes[bestAxeID],
                woodcuttingLevel
            );

            if (!logSuccess) {
                player.message('@que@You slip and fail to hit the tree');
                continue;
            }

            // a successful roll always grants the log. normal trees fall 100%,
            // other tiers fall ~12.5%
            let shouldFall = NORMAL_TREES.has(treeID) || Math.random() <= 0.125;

            player.addExperience('woodcutting', tree.experience);
            player.message('@que@You get some wood');
            player.inventory.add(tree.log);

            // crown of the items (8%): an extra log appears on the ground
            if (enchantedCrowns.shouldActivate(player, 'items')) {
                player.message(
                    '@que@Your crown shines and an extra item appears on ' +
                        'the ground'
                );
                world.addPlayerDrop(player, { id: tree.log, amount: 1 });
                enchantedCrowns.useCharge(player, 'items');
            }

            // woodcutting cape (35%): can prevent a tree that would fall from falling
            if (shouldFall && skillCapes.shouldActivate(player, 'woodcutting')) {
                player.message(
                    '@gre@Your woodcutting cape prevents the tree from falling'
                );
                shouldFall = false;
            }

            if (shouldFall) {
                // only swap the stump if this tree instance is still there
                if (treeStillThere(player, gameObject)) {
                    const stump = world.replaceEntity(
                        'gameObjects',
                        gameObject,
                        tree.stump
                    );

                    world.setTimeout(() => {
                        world.replaceEntity('gameObjects', stump, treeID);
                    }, tree.respawn);
                }

                // tree felled -> batch ends
                return true;
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

    return await onGameObjectCommand(player, gameObject);
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!/chop/i.test(gameObject.definition.commands[1])) {
        return false;
    }

    return await onGameObjectCommand(player, gameObject);
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
