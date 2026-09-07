// grip combat and ground-item triggers: kill, attack, take. magic and ranged
// attacks aren't refused (the engine has no hook for a spell/ranged shot at an
// npc); melee is refused outside the range room.

const { questsEnabled } = require('../../custom-gate.js');
const {
    GRIP_ID,
    BUNCH_OF_KEYS_ID,
    RED_FIREBIRD_FEATHER_ID,
    ICE_GLOVES_ID,
    hasWorn
} = require('./common.js');

// true in the 2x2 range room in scarface pete's mansion (459-460, 672-673)
function inHeroQuestRangeRoom(player) {
    return (
        player.x >= 459 &&
        player.x <= 460 &&
        player.y >= 672 &&
        player.y <= 673
    );
}

async function witnessRefusal(player) {
    await player.say(
        "I can't attack the head guard here",
        'There are too many witnesses to see me do it',
        "I'd have the whole of Brimhaven after me",
        'Besides if he dies I want to have the chance of being promoted'
    );
    player.message("Maybe you need another player's help");
}

// always block grip so the plugin decides
async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GRIP_ID) {
        return false;
    }

    if (!inHeroQuestRangeRoom(player)) {
        await witnessRefusal(player);
        return true; // block the attack
    }

    return false; // allow combat inside the range room
}

// onKillNpc: Grip drops a bunch of keys and marks killed_grip.
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GRIP_ID) {
        return false;
    }

    const { world } = player;

    // track grip's key drop on a world set keyed by tile
    if (!world.herosGripKeyDrops) {
        world.herosGripKeyDrops = new Set();
    }
    world.herosGripKeyDrops.add(`${npc.x},${npc.y}`);
    world.addPlayerDrop(player, { id: BUNCH_OF_KEYS_ID }, npc.x, npc.y);

    if (!player.cache.killed_grip && player.questStages.herosQuest >= 1) {
        player.cache.killed_grip = true;
    }

    return false;
}

// onTakeObj / blockTakeObj
async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (groundItem.id === RED_FIREBIRD_FEATHER_ID) {
        if ((player.questStages.herosQuest || 0) <= 0) {
            await player.say(
                'It looks dangerously hot',
                'And I have no reason to take it'
            );
            return true; // block pickup
        }

        if (!hasWorn(player, ICE_GLOVES_ID)) {
            player.message('Ouch that is too hot to take');
            player.message('I need something cold to pick it up with');
            const damage = Math.round(player.skills.hits.current * 0.15);
            player.damage(damage);
            return true; // block pickup
        }

        return false; // allow pickup
    }

    if (groundItem.id === BUNCH_OF_KEYS_ID) {
        const { world } = player;
        const tile = `${groundItem.x},${groundItem.y}`;
        const fromGrip =
            world.herosGripKeyDrops && world.herosGripKeyDrops.has(tile);

        if (fromGrip) {
            if (
                !player.cache.grip_keys &&
                player.questStages.herosQuest >= 1
            ) {
                player.cache.grip_keys = true;
            }
            world.herosGripKeyDrops.delete(tile);
        }

        world.removeEntity('groundItems', groundItem);
        player.inventory.add(BUNCH_OF_KEYS_ID, 1);
        return true; // pickup handled here
    }

    return false;
}

// range grip like melee: refused outside the range room
async function onRangeNPC(player, npc) {
    return onNPCAttack(player, npc);
}

module.exports = { onNPCAttack, onRangeNPC, onNPCDeath, onGroundItemTake };
