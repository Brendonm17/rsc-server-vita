// https://classic.runescape.wiki/w/Fishing
// fishing repeats until spot depletes/moves, bait runs out, inventory fills, or player tires

const items = require('@2003scape/rsc-data/config/items');
const { rollSkillSuccess, rollCascadedSkillSuccess } = require('../../rolls');
const { spots } = require('@2003scape/rsc-data/skills/fishing');
const { getBatchCount } = require('./batch');
const enchantedCrowns = require('./enchanted-crowns');

const BIG_NET_ID = 548;
const FEATHER_ID = 381;

// Big net: mackerel gets two catch rolls per attempt, every other fish one.
const BIG_NET_MACKEREL_ID = 552;

// big-net catch lines
const BIG_NET_MESSAGES = {
    554: 'You catch a bass',
    550: 'You catch a cod',
    552: 'You catch a mackerel',
    793: 'You catch an oyster shell',
    549: 'You catch a casket',
    17: 'You catch some boots',
    16: 'You catch some gloves',
    622: 'You catch some seaweed'
};

function bigNetCatchMessage(id) {
    return (
        BIG_NET_MESSAGES[id] ||
        // Fallback line for an unexpected id.
        'You catch something really surprising: a bug! Please report this bug!'
    );
}

function getSpot(id, command) {
    let spot = spots[id];

    if (!spot) {
        return false;
    }

    if (spot.reference) {
        return getSpot(spot.reference, command);
    }

    return spot[command];
}

// still the same fishing spot at its tile?
function spotStillThere(player, gameObject) {
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

async function doFishing(player, gameObject, index) {
    const command = gameObject.definition.commands[index].toLowerCase();
    const spot = getSpot(gameObject.id, command);

    if (!spot) {
        return false;
    }

    if (player.isTired()) {
        player.message('You are too tired to catch this fish');
        return true;
    }

    const fishingLevel = player.skills.fishing.current;
    const { tool, bait, fish } = spot;

    let catchable = [];
    let minimumLevel = 99;

    for (const [fishID, { level, experience }] of Object.entries(fish)) {
        if (level < minimumLevel) {
            minimumLevel = level;
        }

        if (fishingLevel >= level) {
            catchable.push({ id: +fishID, level, experience });
        }
    }

    if (!catchable.length) {
        const action =
            command === 'cage' ? 'catch lobsters' : `${command} these fish`;

        player.message(
            `@que@You need at least level ${minimumLevel} fishing to ${action}`
        );

        return true;
    }

    if (!player.inventory.has(tool)) {
        let action;

        if (command === 'cage') {
            action = 'cage lobsters';
        } else if (/^(lure|bait)$/.test(command)) {
            action = `${command} these fish`;
        } else {
            action = 'catch these fish';
        }

        player.message(
            `@que@You need a ${items[tool].name.toLowerCase()} to ${action}`
        );

        return true;
    }

    if (typeof bait === 'number' && !player.inventory.has(bait)) {
        const baitName =
            bait === FEATHER_ID ? 'feathers' : items[bait].name.toLowerCase();

        player.message(`@que@You don't have any ${baitName} left`);
        return true;
    }

    const { world } = player;

    catchable = catchable.sort((a, b) => {
        if (a.level === b.level) {
            return 0;
        }

        return a.level > b.level ? -1 : 1;
    });

    let catching;

    if (tool === BIG_NET_ID) {
        // big net (548) attempt line
        catching = 'a fish';
    } else if (command === 'net') {
        catching = 'some fish';
    } else if (command === 'cage') {
        catching = 'a lobster';
    } else {
        catching = 'a fish';
    }

    const repeat = getBatchCount(player, 'fishing');

    // transient flag: player is mid a gathering-skill repeat loop
    player.gatheringSkill = true;
    try {
        for (let i = 0; i < repeat; i += 1) {
            // spot depleted/moved -> stop the batch
            if (!spotStillThere(player, gameObject)) {
                return true;
            }

            // out of bait this iteration: stop
            if (typeof bait === 'number' && !player.inventory.has(bait)) {
                const baitName =
                    bait === FEATHER_ID
                        ? 'feathers'
                        : items[bait].name.toLowerCase();

                player.message(`@que@You don't have any ${baitName} left`);
                return true;
            }

            player.sendSound('fish');
            player.sendBubble(tool);

            if (typeof bait === 'number') {
                player.inventory.remove(bait);
            }

            player.message(`@que@You attempt to catch ${catching}`);

            await world.sleepTicks(3);

            if (player.isTired()) {
                player.message('You are too tired to catch this fish');
                return true;
            }

            if (tool !== BIG_NET_ID) {
                const rolls = catchable.map(({ id }) => fish[id].roll);
                const caughtIndex = rollCascadedSkillSuccess(rolls, fishingLevel);

                if (caughtIndex > -1) {
                    const { id, experience } = catchable[caughtIndex];
                    player.addExperience('fishing', experience);
                    player.inventory.add(id);

                    const fishName =
                        (command === 'net' ? 'some ' : 'a ') +
                        items[id].name.toLowerCase().replace('raw ', '');

                    player.message(`@que@You catch ${fishName}`);

                    // tutorial island: first catch at stage 41 advances to 42
                    if (player.cache.tutorialStage === 41) {
                        player.cache.tutorialStage = 42;
                    }

                    // crown of the items (8%): an extra fish appears on the ground
                    if (enchantedCrowns.shouldActivate(player, 'items')) {
                        player.message(
                            'Your crown shines and an extra item appears ' +
                                'on the ground'
                        );
                        world.addPlayerDrop(player, { id, amount: 1 });
                        enchantedCrowns.useCharge(player, 'items');
                    }
                } else if (player.cache.tutorialStage === 41) {
                    player.message(
                        "@que@keep trying, you'll catch something soon"
                    );
                } else {
                    player.message(`@que@You fail to catch anything`);
                }
            } else {
                // Big net: every eligible fish rolls independently (any number
                // caught). Mackerel 552 rolls twice, others once.
                const caught = [];
                let fishRolls = 0;

                for (const { id, experience } of catchable) {
                    const [low, high] = fish[id].roll;
                    const rolls = id === BIG_NET_MACKEREL_ID ? 2 : 1;

                    for (let r = 0; r < rolls; r += 1) {
                        fishRolls += 1;

                        if (rollSkillSuccess(low, high, fishingLevel)) {
                            caught.push({ id, experience });
                        }
                    }
                }

                for (const { id, experience } of caught) {
                    player.addExperience('fishing', experience);
                    player.inventory.add(id);
                    player.message(`@que@${bigNetCatchMessage(id)}`);
                }

                // Fail line only when all 9 rolls fired (8 fish + mackerel's 2nd),
                // i.e. high enough level for every fish.
                if (caught.length === 0 && fishRolls === 9) {
                    player.message('@que@You fail to catch anything');
                }
            }
        }
    } finally {
        player.gatheringSkill = false;
    }

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    return await doFishing(player, gameObject, 0);
}

async function onGameObjectCommandTwo(player, gameObject) {
    return await doFishing(player, gameObject, 1);
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
