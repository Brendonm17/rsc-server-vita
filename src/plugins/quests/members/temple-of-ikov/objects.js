// stairs, trapped lever, completed lever, lever bracket, ice-arrow/staff-of-armadyl takes

const { questsEnabled } = require('../../custom-gate.js');

const STAIR_DOWN = 370;
const STAIR_UP = 369;
const LEVER = 361;
const LEVER_BRACKET = 367;
const COMPLETE_LEVER = 368;

const LIT_CANDLE_ID = 601;
const LIT_BLACK_CANDLE_ID = 602;
const LIT_TORCH_ID = 774;
const LEVER_ITEM_ID = 724;
const ICE_ARROWS_ID = 723;
const STAFF_OF_ARMADYL_ID = 725;

const GUARDIAN_MALE_ID = 362;
const GUARDIAN_FEMALE_ID = 363;

// OpenRSC DataConversions.roundUp: round half up.
function roundUp(value) {
    return Math.floor(value + 0.5);
}

function hasLight(player) {
    return (
        player.inventory.isEquipped(LIT_CANDLE_ID) ||
        player.inventory.isEquipped(LIT_BLACK_CANDLE_ID) ||
        player.inventory.isEquipped(LIT_TORCH_ID)
    );
}

function nearbyGuardian(player) {
    const { world } = player;

    for (const npc of world.npcs.getInArea(player.x, player.y, 5)) {
        if (npc.id === GUARDIAN_MALE_ID || npc.id === GUARDIAN_FEMALE_ID) {
            return npc;
        }
    }

    return null;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === STAIR_DOWN) {
        if (hasLight(player)) {
            player.message('Your flame lights up the room');
            player.teleport(537, 3372);
        } else {
            player.message('You cannot see any further into the room');
            player.teleport(537, 3394);
            await player.world.sleepTicks(3);
            player.message('It is too dark');
        }
        return true;
    }

    if (gameObject.id === STAIR_UP) {
        player.teleport(536, 3338);
        return true;
    }

    if (gameObject.id === LEVER) {
        // command "pull"
        if (!player.cache.ikovLever) {
            player.message('You have activated a trap on the lever');
            player.damage(roundUp(player.skills.hits.current / 5));
        } else {
            player.message('You pull the lever');
            await player.world.sleepTicks(3);
            player.message('You hear a clunk');
            await player.world.sleepTicks(3);
            player.message('The trap on the lever resets');
            await player.world.sleepTicks(3);

            if (player.cache.ikovLever) {
                delete player.cache.ikovLever;
            }

            const stage = player.questStages.templeOfIkov;

            if (
                !player.cache.openSpiderDoor &&
                stage !== -1 &&
                stage !== -2
            ) {
                player.cache.openSpiderDoor = true;
            }
        }
        return true;
    }

    if (gameObject.id === COMPLETE_LEVER) {
        player.message('You pull the lever');
        await player.world.sleepTicks(3);
        player.message('You hear the door next to you make a clunking noise');
        await player.world.sleepTicks(3);

        const stage = player.questStages.templeOfIkov;

        if (!player.cache.completeLever && stage !== -1 && stage !== -2) {
            player.cache.completeLever = true;
        }
        return true;
    }

    return false;
}

// OpenRSC onOpLoc for command "searchfortraps" (LEVER command two).
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== LEVER) {
        return false;
    }

    player.message('You search the lever for traps');

    if (player.skills.thieving.current < 42) {
        player.message('You have not high thieving enough to disable this trap');
        return true;
    }

    player.message('You find a trap on the lever');
    await player.world.sleepTicks(3);
    player.message('You disable the trap');
    await player.world.sleepTicks(3);

    if (!player.cache.ikovLever) {
        player.cache.ikovLever = true;
    }

    return true;
}

// OpenRSC onUseLoc: use the LEVER item on the LEVER_BRACKET.
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id !== LEVER_ITEM_ID || gameObject.id !== LEVER_BRACKET) {
        return false;
    }

    player.message('You fit the lever into the bracket');
    player.inventory.remove(LEVER_ITEM_ID, 1);

    const { world } = player;
    world.replaceEntity('gameObjects', gameObject, COMPLETE_LEVER);

    // revert the bracket after ~24 ticks (15s)
    world.setTickTimeout(() => {
        const current = world.gameObjects.getAtPoint(gameObject.x, gameObject.y);

        for (const obj of current) {
            if (obj.id === COMPLETE_LEVER) {
                world.replaceEntity('gameObjects', obj, LEVER_BRACKET);
                break;
            }
        }
    }, 24);

    return true;
}

// ice arrows and the staff of armadyl
async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (groundItem.id === ICE_ARROWS_ID) {
        if (
            (groundItem.x === 560 && groundItem.y === 3352) ||
            (groundItem.x === 563 && groundItem.y === 3354)
        ) {
            player.inventory.add(ICE_ARROWS_ID, 1);
            player.teleport(538, 3348);
            await player.world.sleepTicks(1);
            await player.world.sleepTicks(2);
            player.message('Suddenly your surroundings change');
        } else {
            player.message(
                'You can only take ice arrows from the cave of ice spiders'
            );
            await player.world.sleepTicks(3);
            player.message('In the temple of Ikov');
            await player.world.sleepTicks(3);
        }
        // block default take
        return true;
    }

    if (groundItem.id === STAFF_OF_ARMADYL_ID) {
        const stage = player.questStages.templeOfIkov;

        if (stage === 2 || stage === -1 || stage === -2) {
            player.message("I shouldn't steal this");
            return true;
        }

        if (player.inventory.has(STAFF_OF_ARMADYL_ID)) {
            player.message('I already have one of those');
            return true;
        }

        const guardian = nearbyGuardian(player);

        if (guardian) {
            player.engage(guardian);
            await guardian.say('That is not thine to take');
            player.disengage();
            await guardian.attack(player);
            // OpenRSC blockTakeObj returns true when a guardian is near.
            return true;
        }

        // no guardian nearby: default take proceeds
        return false;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onGroundItemTake
};
