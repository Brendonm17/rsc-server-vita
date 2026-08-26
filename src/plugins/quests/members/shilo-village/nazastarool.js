// rashiliyia's dolmen: touch teleports to nazastarool arena (zombie->skeleton->ghost), then search for corpse

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const { hasBeadsEquipped } = require('./utils.js');
const {
    TOMB_DOLMEN_NAZASTAROOL,
    NAZASTAROOL_ZOMBIE_ID,
    NAZASTAROOL_SKELETON_ID,
    NAZASTAROOL_GHOST_ID,
    RASHILIYA_CORPSE_ID
} = require('./ids.js');

function choke(player) {
    player.message('@red@You feel invisible hands starting to choke you...');
    player.damage(Math.floor(player.skills.hits.current / 2));
}

// spawn at 380,3625, shove to 381,3625, shout, fight
async function spawnAndMoveAway(player, npcID) {
    const { world } = player;
    const npc = new NPC(world, {
        id: npcID,
        x: 380,
        y: 3625,
        minX: 378,
        maxX: 383,
        minY: 3622,
        maxY: 3628
    });
    delete npc.respawn;
    world.addEntity('npcs', npc);
    await world.sleepTicks(2);
    npc.teleport(381, 3625);

    player.engage(npc);
    if (npcID === NAZASTAROOL_ZOMBIE_ID) {
        await npc.say(
            "Who dares disturb Rashiliyias' rest?",
            'I am Nazastarool!',
            'Prepare to die!'
        );
    } else if (npcID === NAZASTAROOL_SKELETON_ID) {
        await npc.say(
            'Quake in fear, for I am reborn!',
            'Your death will be swift.'
        );
    } else if (npcID === NAZASTAROOL_GHOST_ID) {
        await npc.say(
            'Nazastarool returns with vengeance!',
            'Soon you will serve Rashiliyia!'
        );
    }
    player.disengage();

    await npc.attack(player);
}

async function handleDolmen(player) {
    const { world } = player;

    // all three forms already defeated -> corpse retrieval
    if (
        player.cache.dolmen_zombie &&
        player.cache.dolmen_skeleton &&
        player.cache.dolmen_ghost
    ) {
        if (!hasBeadsEquipped(player)) {
            choke(player);
        }
        if (player.inventory.has(RASHILIYA_CORPSE_ID)) {
            player.message('You find nothing new on the Dolmen.');
            return true;
        }
        player.message('You search the Dolmen...');
        await world.sleepTicks(3);
        player.message(
            'and find the mumified remains of a human female corpse.'
        );
        await world.sleepTicks(3);
        player.message('Do you want to take the corpse?');
        const menu = await player.ask(
            [
                "Yes, I'll take the remains.",
                "No, I'll leave them where they are."
            ],
            true
        );
        if (menu === 0) {
            player.message(
                'You carefully place the remains in your inventory.'
            );
            player.inventory.add(RASHILIYA_CORPSE_ID);
            if (!player.cache.rashiliya_corpse) {
                player.cache.rashiliya_corpse = true;
            }
        } else if (menu === 1) {
            player.message('You decide to leave the remains where they are.');
        }
        return true;
    }

    // touch the dolmen, teleport into the arena, raise the next form
    if (!hasBeadsEquipped(player)) {
        choke(player);
    }
    player.message('You touch the Dolmen, and the ground starts to shake.');
    await world.sleepTicks(2);
    player.message('You hear an unearthly voice booming and ');
    await world.sleepTicks(2);
    player.message('you step away from the Dolmen in anticipation...');
    await world.sleepTicks(2);
    player.teleport(380, 3625);
    if (!hasBeadsEquipped(player)) {
        choke(player);
    }
    if (!player.cache.dolmen_zombie) {
        await spawnAndMoveAway(player, NAZASTAROOL_ZOMBIE_ID);
        return true;
    }
    if (!player.cache.dolmen_skeleton) {
        await spawnAndMoveAway(player, NAZASTAROOL_SKELETON_ID);
        return true;
    }
    if (!player.cache.dolmen_ghost) {
        await spawnAndMoveAway(player, NAZASTAROOL_GHOST_ID);
        return true;
    }
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id !== TOMB_DOLMEN_NAZASTAROOL) {
        return false;
    }
    return handleDolmen(player);
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id !== TOMB_DOLMEN_NAZASTAROOL) {
        return false;
    }
    return handleDolmen(player);
}

// chain the three forms; on final ghost, drop the corpse
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (npc.id === NAZASTAROOL_ZOMBIE_ID && !player.cache.dolmen_zombie) {
        world.removeEntity('npcs', npc);
        player.cache.dolmen_zombie = true;
        player.message('You defeat Nazastarool and the corpse falls to  ');
        await world.sleepTicks(2);
        player.message('the ground. The bones start to move again and   ');
        await world.sleepTicks(2);
        player.message('soon they reform into a grisly giant skeleton.  ');
        await world.sleepTicks(2);
        await spawnAndMoveAway(player, NAZASTAROOL_SKELETON_ID);
        return true;
    }

    if (npc.id === NAZASTAROOL_SKELETON_ID && !player.cache.dolmen_skeleton) {
        world.removeEntity('npcs', npc);
        player.cache.dolmen_skeleton = true;
        player.message(
            'You defeat the Nazastarool Skeleton as the corpse falls to '
        );
        await world.sleepTicks(2);
        player.message(
            'the ground. An ethereal form starts taking shape above the '
        );
        await world.sleepTicks(2);
        player.message(
            'bones and you soon face the vengeful ghost of Nazastarool '
        );
        await world.sleepTicks(2);
        await spawnAndMoveAway(player, NAZASTAROOL_GHOST_ID);
        return true;
    }

    if (npc.id === NAZASTAROOL_GHOST_ID && !player.cache.dolmen_ghost) {
        world.removeEntity('npcs', npc);
        player.cache.dolmen_ghost = true;
        player.message(
            '@yel@Nazastarool: May you perish in the fires of Zamoraks furnace!'
        );
        await world.sleepTicks(2);
        player.message('@yel@Nazastarool: May Rashiliyias Curse be upon you!');
        await world.sleepTicks(2);
        player.message('You see something appear on the Dolmen');
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onNPCDeath
};
