// the platform ladder, fishing crane, loose wall panel, and picking up a sea slug

const { questsEnabled } = require('../../custom-gate.js');
const {
    LADDER_ID,
    FISHING_CRANE_ID,
    LOOSE_PANEL_ID,
    SEASLUG_ID,
    LIT_TORCH_ID,
    LADDER_TELEPORT
} = require('./ids.js');

// Ladder (obj 458) and Crane (obj 453): OpLoc / command one
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages.seaSlug || 0;

    if (gameObject.id === LADDER_ID) {
        if (stage < 5) {
            player.message('You climb up the ladder');
            await world.sleepTicks(3);
            player.teleport(LADDER_TELEPORT.x, LADDER_TELEPORT.y, false);
            return true;
        }

        // stage >= 5
        if (!player.inventory.has(LIT_TORCH_ID)) {
            // OpenRSC: nextInt(1) + 7 => always 7
            const damage = 7;
            player.message('You attempt to climb up the ladder');
            player.message('the fishermen approach you');
            player.message('and throw you back down the ladder');
            player.damage(damage);
            await player.say('ouch');
        } else {
            player.message('You climb up the ladder');
            await world.sleepTicks(3);
            player.teleport(LADDER_TELEPORT.x, LADDER_TELEPORT.y, false);
            player.message('the fishermen seem afraid of your torch');
        }
        return true;
    }

    if (gameObject.id === FISHING_CRANE_ID) {
        if (stage === 5) {
            player.message('you rotate the crane around');
            await world.sleepTicks(3);
            player.message('to the far platform');
            await world.sleepTicks(3);
            await player.say('jump on kennith!');
            player.message('kennith comes out through the broken panal');
            player.message('he climbs onto the fishing net');
            await world.sleepTicks(3);
            player.message('you rotate the crane back around');
            await world.sleepTicks(3);
            player.message('and lower kennith to the row boat waiting below');
            await world.sleepTicks(3);
            player.questStages.seaSlug = 6;
            delete player.cache.seaSlugLoosePanel;
            delete player.cache.seaSlugLitTorch;
        } else if (stage > 0 && stage < 5) {
            player.message('you rotate the crane around');
            await world.sleepTicks(3);
        } else {
            player.message('Nothing interesting happens');
        }
        return true;
    }

    return false;
}

// loose panel: opbound / wall-object command one
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id !== LOOSE_PANEL_ID) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages.seaSlug || 0;

    if (stage === 5) {
        player.message('you kick the loose panel');
        await world.sleepTicks(3);
        player.message('the wood is rotten and crumbles away');
        await world.sleepTicks(3);
        player.message(
            'leaving an opening big enough for kennith to climb through'
        );
        await world.sleepTicks(3);
        player.cache.seaSlugLoosePanel = true;
    } else {
        player.message('you kick the loose panal');
        await world.sleepTicks(3);
        player.message('nothing interesting happens');
        await world.sleepTicks(3);
    }

    return true;
}

// Picking up a sea slug (ground item 769): TakeObj
async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (groundItem.id !== SEASLUG_ID) {
        return false;
    }

    // OpenRSC: nextInt(8) + 1 => 1..8
    const damage = Math.floor(Math.random() * 8) + 1;
    player.message('you pick up the seaslug');
    player.message('it sinks its teeth deep into you hand');
    player.damage(damage);
    await player.say('ouch');
    player.message('you drop the sea slug');

    return true;
}

module.exports = {
    onGameObjectCommandOne,
    onWallObjectCommandOne,
    onGroundItemTake
};
