
const { questsEnabled } = require('../../custom-gate.js');
const NPC = require('../../../../model/npc');
const {
    GOBLIN_GUARD_ID,
    DUNGEON_SPIDER_ID,
    OBSERVATORY_ASSISTANT_ID,
    LADDER_ID,
    CHEST_ID,
    MOULD_OBJECT_ID,
    GATE_ID,
    KEEP_KEY_ID,
    LENS_MOULD_ID,
    ONE_CURE_POISON_POTION_ID,
    ifNearVisNpc
} = require('./ids.js');

// spawn a non-respawning npc and chase
function addNpc(world, id, x, y) {
    const npc = new NPC(world, {
        id,
        x,
        y,
        minX: x - 2,
        maxX: x + 2,
        minY: y - 2,
        maxY: y + 2
    });
    delete npc.respawn;
    world.addEntity('npcs', npc);
    return npc;
}

// OpenRSC onOpLoc 928 (ladder) - climb down into the goblin cavern.
async function climbLadder(player) {
    const { world } = player;
    const stage = player.questStages.observatoryQuest || 0;

    if (stage === 0) {
        player.teleport(712, 3512, false);
        player.message('You climb down the ladder');
        return true;
    }

    if (stage === 6 || stage === -1) {
        player.teleport(712, 3512, false);
        return true;
    }

    // stages 1..5: the assistant warns you before you descend.
    const assistant = ifNearVisNpc(player, OBSERVATORY_ASSISTANT_ID, 6);
    if (assistant) {
        player.engage(assistant);
        await assistant.say(
            'Take great care down there',
            'Remember the goblins have taken over the cavern'
        );
        await player.say('Oh, okay thanks for the warning');
        player.disengage();
        player.teleport(712, 3512, false);
    } else {
        // no assistant nearby - still allow the descent (authentic teleport).
        player.teleport(712, 3512, false);
    }
    return true;
}

// dungeon chest: open flavour, then on search gives keep-key, lens mould, spider ambush, poison cure, or nothing
async function searchChest(player) {
    const { world } = player;

    player.message('You open the chest');
    player.message('You search the chest');
    await world.sleepTicks(2);

    // keep key (OpenRSC obj 919): given once.
    if (!player.inventory.has(KEEP_KEY_ID)) {
        player.message('You find a small key inside');
        player.inventory.add(KEEP_KEY_ID, 1);
        return true;
    }

    // lens mould: given once, on the relevant quest stage
    if (
        player.questStages.observatoryQuest === 4 &&
        !player.inventory.has(LENS_MOULD_ID)
    ) {
        player.message('Underneath you find a peculiar mould');
        player.inventory.add(LENS_MOULD_ID, 1);
        return true;
    }

    // poison cure (OpenRSC obj 934): given once.
    if (!player.cache.observatory_poison_cure) {
        player.message('The chest contains some poison cure');
        player.inventory.add(ONE_CURE_POISON_POTION_ID, 1);
        player.cache.observatory_poison_cure = true;
        return true;
    }

    // spider ambush (OpenRSC obj 917): a poisonous dungeon spider.
    player.message('The chest contains a poisonous spider!');
    const spider = addNpc(world, DUNGEON_SPIDER_ID, player.x, player.y);
    await spider.attack(player);
    return true;
}

// OpenRSC onOpLoc 926 gate (coordinate-gated on 689,3513).
async function openGate(player) {
    if (
        player.cache.keep_key_gate !== undefined ||
        player.questStages.observatoryQuest === -1
    ) {
        // OpenRSC toggles the player between the two sides of the gate.
        if (player.y <= 3513) {
            player.teleport(690, 3514, false);
            await player.say(
                "I'd better be quick",
                'There may be more guards about'
            );
        } else {
            player.message('you go through the gate');
            player.teleport(690, 3513, false);
        }
    } else {
        player.message('The gate is locked');
    }
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (gameObject.id) {
        case LADDER_ID:
            return await climbLadder(player);
        case CHEST_ID:
            return await searchChest(player);
        case GATE_ID:
            return await openGate(player);
        default:
            return false;
    }
}

// use the keep key on the gate to unlock it and provoke the goblin guard
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== GATE_ID || item.id !== KEEP_KEY_ID) {
        return false;
    }

    player.message('The gate unlocks');
    player.message("The keep key is broken - I'll discard it");
    player.inventory.remove(KEEP_KEY_ID, 1);

    if (player.cache.keep_key_gate === undefined) {
        player.cache.keep_key_gate = true;
    }

    const guard = ifNearVisNpc(player, GOBLIN_GUARD_ID, 5);
    if (guard) {
        guard.attack(player);
    }

    return true;
}

// goblin guard refuses you and attacks
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GOBLIN_GUARD_ID) {
        return false;
    }

    player.engage(npc);
    await npc.say(
        'What are you doing here ?',
        'This is our domain now',
        'Begone foul human!'
    );
    player.disengage();
    await npc.attack(player);
    return true;
}

module.exports = {
    onGameObjectCommandOne,
    onUseWithGameObject,
    onTalkToNPC
};
