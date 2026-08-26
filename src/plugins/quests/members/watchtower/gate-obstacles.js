// watchtower - the two gu'tanoth city gates

const { questsEnabled } = require('../../custom-gate.js');

const {
    QUEST_KEY,
    OGRE_GUARD_EASTGATE_ID,
    OGRE_GUARD_WESTGATE_ID,
    NORTH_WEST_GATE,
    EAST_SOUTH_GATE,
    OGRE_ENCLAVE_GATE,
    OGRE_RELIC_ID,
    OGRE_RELIC_PART_BASE_ID,
    OGRE_RELIC_PART_BODY_ID,
    OGRE_RELIC_PART_HEAD_ID,
    GOLD_BAR_ID,
    ifNearVisNpc
} = require('./ids.js');

function stage(player) {
    return player.questStages[QUEST_KEY] || 0;
}

const RELIC_ITEMS = [
    OGRE_RELIC_ID,
    OGRE_RELIC_PART_BASE_ID,
    OGRE_RELIC_PART_BODY_ID,
    OGRE_RELIC_PART_HEAD_ID
];

async function relicCheckGuard(player, ogreGuard) {
    await ogreGuard.say('Well, what proof of friendship did you bring ?');
    if (player.inventory.has(OGRE_RELIC_ID)) {
        await player.say('I have a relic from a chieftan');
        await ogreGuard.say(
            "It's got the statue of Dalgroth",
            "Welcome to Gu'Tanoth",
            'Friend of the ogres'
        );
        player.message('The ogre guard lets you pass');
        player.teleport(667, 773);
        delete player.cache.get_ogre_companionship;
        player.cache.has_ogre_companionship = true;
    } else {
        await player.say("I don't have anything");
        await ogreGuard.say(
            'Why have you returned with no proof of companionship ?',
            'Back to whence you came!'
        );
        player.message('The guard pushes you back down the hill');
        player.teleport(635, 774);
    }
}

async function goldCheckGuard(player, ogreGuard) {
    await ogreGuard.say('Creature, did you bring me the gold ?');
    if (player.inventory.has(GOLD_BAR_ID)) {
        await player.say('Here it is');
        player.inventory.remove(GOLD_BAR_ID);
        await ogreGuard.say("It's brought it!", 'On your way');
        delete player.cache.get_gold_ogre;
        player.cache.has_gold_ogre = true;
        player.teleport(630, 795);
        player.message('The ogre guard lets you pass');
    } else {
        await player.say("No I don't have it");
        await ogreGuard.say('No gold, no passage', 'get out of this city!');
        player.message('The guard pushes you outside the city');
        player.teleport(635, 774);
    }
}

async function handleEastSouthGate(player) {
    const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_EASTGATE_ID, 5);
    if (player.y >= 794) {
        player.teleport(630, 792);
        return;
    }
    if (!ogreGuard) {
        player.message('The Ogre guard is currently busy');
        return;
    }
    if (player.cache.has_gold_ogre || stage(player) === -1) {
        player.engage(ogreGuard);
        await ogreGuard.say('I know you creature, you may pass');
        player.disengage();
        player.teleport(630, 795);
    } else if (player.cache.get_gold_ogre) {
        player.engage(ogreGuard);
        await goldCheckGuard(player, ogreGuard);
        player.disengage();
    } else {
        player.engage(ogreGuard);
        await ogreGuard.say('Halt!', 'You cannot pass here');
        await player.say('I am a friend to ogres');
        await ogreGuard.say(
            'You will be my friend only with gold',
            'Bring me a bar of pure gold and i will let you pass',
            'For now - begone!'
        );
        player.cache.get_gold_ogre = true;
        player.message('The guard pushes you outside the city');
        player.teleport(635, 774);
        player.disengage();
    }
}

async function handleNorthWestGate(player) {
    const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_WESTGATE_ID, 5);
    if (player.x >= 666) {
        player.teleport(665, 773);
        return;
    }
    if (!ogreGuard) {
        player.message('The ogre guard is currently busy');
        return;
    }
    if (player.cache.has_ogre_companionship || stage(player) === -1) {
        player.engage(ogreGuard);
        await ogreGuard.say("It's the small creature", 'You may pass');
        player.disengage();
        player.teleport(667, 773);
    } else if (player.cache.get_ogre_companionship) {
        player.engage(ogreGuard);
        await relicCheckGuard(player, ogreGuard);
        player.disengage();
    } else {
        player.engage(ogreGuard);
        await ogreGuard.say(
            'Stop creature!',
            'Only ogres and their friends allowed in this city',
            'Show me a sign of companionship',
            'And you may pass...',
            'Until then, back to whence you came!'
        );
        player.cache.get_ogre_companionship = true;
        player.message('The guard pushes you back down the hill');
        player.teleport(635, 774);
        player.disengage();
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === OGRE_ENCLAVE_GATE) {
        player.message('The gate is locked tight');
        player.message("I'll have to find another way out...");
        return true;
    }

    if (gameObject.id === EAST_SOUTH_GATE) {
        await handleEastSouthGate(player);
        return true;
    }

    if (gameObject.id === NORTH_WEST_GATE) {
        await handleNorthWestGate(player);
        return true;
    }

    return false;
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.equipped) {
        return false;
    }

    if (npc.id === OGRE_GUARD_EASTGATE_ID && item.id === GOLD_BAR_ID) {
        const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_EASTGATE_ID, 5);
        if (ogreGuard) {
            player.engage(ogreGuard);
            if (player.cache.has_gold_ogre || stage(player) === -1) {
                await ogreGuard.say("Yes, yes I've seen it!");
            } else {
                await goldCheckGuard(player, ogreGuard);
            }
            player.disengage();
        }
        return true;
    }

    if (npc.id === OGRE_GUARD_WESTGATE_ID && RELIC_ITEMS.includes(item.id)) {
        const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_WESTGATE_ID, 5);
        if (ogreGuard) {
            player.engage(ogreGuard);
            if (item.id === OGRE_RELIC_ID) {
                if (player.cache.has_ogre_companionship || stage(player) === -1) {
                    await ogreGuard.say("Yes, yes I've seen it!");
                } else {
                    await relicCheckGuard(player, ogreGuard);
                }
            } else {
                await ogreGuard.say(
                    "What's this thing ?",
                    'It looks a bit like our Dalgroth...',
                    "But it's in bits... go away!"
                );
                player.message('The guard pushes you back down the hill');
                player.teleport(635, 774);
                delete player.cache.has_ogre_companionship;
                player.cache.get_ogre_companionship = true;
            }
            player.disengage();
        }
        return true;
    }

    return false;
}

module.exports = { onGameObjectCommandOne, onUseWithNPC };
