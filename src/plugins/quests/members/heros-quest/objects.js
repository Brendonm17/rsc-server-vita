// cupboard/chest gated on mid-quest + holding grip's keys

const { questsEnabled } = require('../../custom-gate.js');
const {
    GRIPS_CUPBOARD_ID,
    CANDLESTICK_CHEST_ID,
    GUARD_PIRATE_ID,
    GRIP_ID,
    CANDLESTICK_ID,
    DRAYNOR_WHISKY_ID,
    ifNearVisNpc
} = require('./common.js');

function onQuest(player) {
    const s = player.questStages.herosQuest;
    return s === 1 || s === 2 || s === -1;
}

// GRIPS_CUPBOARD "search" -> whisky (guard/Grip may intervene)
async function searchGripsCupboard(player, gameObject) {
    const guard = ifNearVisNpc(player, GUARD_PIRATE_ID, 10);
    const grip = ifNearVisNpc(player, GRIP_ID, 15);

    if (guard) {
        player.engage(guard);
        await guard.say(
            "I don't think Mr Grip will like you opening that up",
            "That's his drinks cabinet"
        );
        player.disengage();

        const menu = await player.ask(
            ["He won't notice me having a quick look", "Ok I'll leave it"],
            true
        );

        if (menu === 0) {
            if (grip) {
                player.engage(grip);
                await grip.say(
                    'Hey what are you doing there',
                    "That's my drinks cabinet get away from it"
                );
                player.disengage();
            } else {
                player.message('You find a bottle of whisky in the cupboard');
                player.inventory.add(DRAYNOR_WHISKY_ID, 1);
            }
        }
    } else {
        player.message('The guard is busy at the moment');
    }
}

// search gives two candlesticks, progresses stage 1 -> 2
async function searchCandlestickChest(player) {
    if (
        !player.inventory.has(CANDLESTICK_ID) &&
        (player.cache.grip_keys || player.questStages.herosQuest === -1)
    ) {
        player.inventory.add(CANDLESTICK_ID, 2);
        player.message('You find two candlesticks in the chest');
        await player.world.sleepTicks(3);
        player.message('So that will be one for you');
        await player.world.sleepTicks(3);
        player.message('And one to the person who killed grip for you');
        await player.world.sleepTicks(3);

        if (player.questStages.herosQuest === 1) {
            player.questStages.herosQuest = 2;
        }

        if (!player.cache.looted_grip && player.questStages.herosQuest >= 1) {
            player.cache.looted_grip = true;
        }
    } else {
        player.message('The chest is empty');
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === GRIPS_CUPBOARD_ID) {
        if (!onQuest(player)) {
            return false;
        }
        await searchGripsCupboard(player, gameObject);
        return true;
    }

    if (gameObject.id === CANDLESTICK_CHEST_ID) {
        // only intercept while mid-quest and cleared to loot, else pass through
        if (!onQuest(player) || !(player.cache.grip_keys || player.questStages.herosQuest === -1)) {
            return false;
        }
        await searchCandlestickChest(player);
        return true;
    }

    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    return false;
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
