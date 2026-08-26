// 5 sewer valves gate which raft destination is reached

const VALVE_IDS = new Set([412, 413, 414, 415, 416]);
const LOG_RAFT_ID = 432;
const LOG_RAFT_BACK_ID = 433;

const VALVE_1_RIGHT = 'sewer_valve_1_right';
const VALVE_2_LEFT = 'sewer_valve_2_left';
const VALVE_3_RIGHT = 'sewer_valve_3_right';
const VALVE_4_RIGHT = 'sewer_valve_4_right';
const VALVE_5_LEFT = 'sewer_valve_5_left';

async function turnValve(player, gameObject, direction) {
    const { world } = player;
    const { cache } = player;

    player.message('@que@you turn the large metal');
    await world.sleepTicks(1);
    player.message(`@que@valve to the ${direction}`);
    await world.sleepTicks(1);
    player.message('@que@beneath the soil you can');
    await world.sleepTicks(1);
    player.message('@que@hear the gushing of water');

    const left = direction === 'left';

    switch (gameObject.id) {
        case 412: // valve 1 - only tracks RIGHT
            if (left) {
                delete cache[VALVE_1_RIGHT];
            } else if (!cache[VALVE_1_RIGHT]) {
                cache[VALVE_1_RIGHT] = true;
            }
            break;
        case 413: // valve 2 - only tracks LEFT
            if (left) {
                if (!cache[VALVE_2_LEFT]) {
                    cache[VALVE_2_LEFT] = true;
                }
            } else {
                delete cache[VALVE_2_LEFT];
            }
            break;
        case 414: // valve 3 - only tracks RIGHT
            if (left) {
                delete cache[VALVE_3_RIGHT];
            } else if (!cache[VALVE_3_RIGHT]) {
                cache[VALVE_3_RIGHT] = true;
            }
            break;
        case 415: // valve 4 - only tracks RIGHT
            if (left) {
                delete cache[VALVE_4_RIGHT];
            } else if (!cache[VALVE_4_RIGHT]) {
                cache[VALVE_4_RIGHT] = true;
            }
            break;
        case 416: // valve 5 - only tracks LEFT
            if (left) {
                if (!cache[VALVE_5_LEFT]) {
                    cache[VALVE_5_LEFT] = true;
                }
            } else {
                delete cache[VALVE_5_LEFT];
            }
            break;
    }
}

async function boardForwardRaft(player) {
    const { world, cache } = player;

    player.message('@que@you carefully board the small raft');
    await world.sleepTicks(3);

    const v1 = !!cache[VALVE_1_RIGHT];
    const v2 = !!cache[VALVE_2_LEFT];
    const v3 = !!cache[VALVE_3_RIGHT];
    const v4 = !!cache[VALVE_4_RIGHT];
    const v5 = !!cache[VALVE_5_LEFT];

    if (v1 && v2 && v3 && v4 && v5) {
        player.teleport(587, 3411, false);
        player.message(
            '@que@the raft washes up the sewer, the sewer passages end here'
        );
        return;
    }

    if (v1 && v2 && v3 && v4) {
        player.teleport(600, 3409, false);
        player.message(
            '@que@the raft washes up the sewer, and stops at the fifth island'
        );
    } else if (v1 && v2 && v3) {
        player.teleport(622, 3410, false);
        player.message(
            '@que@the raft washes up the sewer, and stops at the fourth island'
        );
    } else if (v1 && v2) {
        player.teleport(622, 3422, false);
        player.message(
            '@que@the raft washes up the sewer, and stops at the third island'
        );
    } else if (v1) {
        player.teleport(622, 3434, false);
        player.message(
            '@que@the raft washes up the sewer, and stops at the second island'
        );
    } else {
        player.teleport(621, 3465, false);
        player.message(
            '@que@the raft washes up the sewer, and stops at the first island'
        );
    }

    player.message('@que@You need to find the right combination');
    player.message('@que@of the 5 sewer valves above to get further');
}

async function boardReturnRaft(player) {
    player.message('@que@the raft floats down the sewers');
    player.message('@que@to the cave entrance');
    player.teleport(620, 3478);
}

async function onGameObjectCommandOne(player, gameObject) {
    if (VALVE_IDS.has(gameObject.id)) {
        await turnValve(player, gameObject, 'left');
        return true;
    }

    if (gameObject.id === LOG_RAFT_ID) {
        await boardForwardRaft(player);
        return true;
    }

    if (gameObject.id === LOG_RAFT_BACK_ID) {
        await boardReturnRaft(player);
        return true;
    }

    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!VALVE_IDS.has(gameObject.id)) {
        return false;
    }

    await turnValve(player, gameObject, 'right');

    return true;
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
