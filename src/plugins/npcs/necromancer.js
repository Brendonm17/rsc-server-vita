// Invrigar the Necromancer: attacking him (melee or spell) summons an "invoked"
// zombie that chases the attacker, up to a global cap of 7. Killing a
// necromancer resets the cap and spawns an avenging zombie on the killer.

const NPC = require('../../model/npc');

const npcsData = require('@2003scape/rsc-data/config/npcs');

function findNpcIdByName(name) {
    const lower = name.toLowerCase();

    for (let i = 0; i < npcsData.length; i += 1) {
        if (npcsData[i] && npcsData[i].name.toLowerCase() === lower) {
            return i;
        }
    }

    return -1;
}

// NpcId.NECROMANCER.
const NECROMANCER_ID = findNpcIdByName('necromancer');

// the distinct "invoked" zombie npc def
const ZOMBIE_INVOKED_ID = NECROMANCER_ID + 1;

// Necromancer.MAX_ZOMBIE_COUNT / ZOMBIE_RADIUS.
const MAX_ZOMBIE_COUNT = 7;
const ZOMBIE_RADIUS = 10;

// global zombie counter shared across all necromancers
let zombieCounter = 0;

function isNecromancer(npc) {
    return npc.id === NECROMANCER_ID;
}

function canSpawnZombie() {
    return zombieCounter < MAX_ZOMBIE_COUNT;
}

// an invoked zombie near the player that isn't already busy
function isZombieInRange(player) {
    const nearby = player.getNearbyEntitiesByID(
        'npcs',
        ZOMBIE_INVOKED_ID,
        ZOMBIE_RADIUS
    );

    return nearby.some(
        (npc) => !npc.locked && player.withinRange(npc, ZOMBIE_RADIUS)
    );
}

// blocks if a zombie can spawn or is already loose
function canBlock(player, npc) {
    return isNecromancer(npc) && (canSpawnZombie() || isZombieInRange(player));
}

// Necromancer.attackNecromancer.
async function attackNecromancer(player, necromancer) {
    if (canSpawnZombie()) {
        zombieCounter += 1;

        const previousInterlocutor = necromancer.interlocutor;
        necromancer.interlocutor = player;
        necromancer.broadcastChat('I summon the undead to smite you down');
        necromancer.interlocutor = previousInterlocutor;

        const { world } = player;

        const zombie = new NPC(world, {
            id: ZOMBIE_INVOKED_ID,
            x: necromancer.x,
            y: necromancer.y,
            minX: necromancer.x,
            maxX: necromancer.x,
            minY: necromancer.y,
            maxY: necromancer.y
        });

        // one-off summon, not a landscape spawn point
        delete zombie.respawn;

        world.addEntity('npcs', zombie);

        await world.sleepTicks(3);

        // zombie engages the summoner in combat
        zombie.attack(player).catch(() => {});
    } else {
        // finds the nearest already-summoned zombie near the player
        const nearby = player.getNearbyEntitiesByID(
            'npcs',
            ZOMBIE_INVOKED_ID,
            ZOMBIE_RADIUS
        );

        const zombie = nearby
            .filter((npc) => !npc.locked && player.withinRange(npc, ZOMBIE_RADIUS))
            .sort(
                (a, b) => player.getDistance(a) - player.getDistance(b)
            )[0];

        if (!zombie) {
            // canBlock guarantees one exists whenever this branch is reached
            return;
        }

        const previousInterlocutor = zombie.interlocutor;
        zombie.interlocutor = player;
        zombie.broadcastChat('Raargh');
        zombie.interlocutor = previousInterlocutor;

        zombie.attack(player).catch(() => {});
    }
}

// melee attack on the necromancer
async function onNPCAttack(player, npc) {
    if (!canBlock(player, npc)) {
        return false;
    }

    await attackNecromancer(player, npc);

    return true;
}

// spell cast on the necromancer, same reaction as melee
async function onSpellNPC(player, npc) {
    if (!canBlock(player, npc)) {
        return false;
    }

    await attackNecromancer(player, npc);

    return true;
}

// resets the counter and spawns an avenging zombie on the killer
async function onNPCDeath(player, necromancer) {
    if (!isNecromancer(necromancer)) {
        return false;
    }

    zombieCounter = 0;

    const { world } = player;

    const zombie = new NPC(world, {
        id: ZOMBIE_INVOKED_ID,
        x: player.x,
        y: player.y,
        minX: player.x,
        maxX: player.x,
        minY: player.y,
        maxY: player.y
    });

    delete zombie.respawn;

    world.addEntity('npcs', zombie);

    zombie.attack(player).catch(() => {});

    // return false: the necromancer still dies as normal (drops etc).
    return false;
}

// necromancer never talks
async function onTalkToNPC(player, npc) {
    if (!isNecromancer(npc)) {
        return false;
    }

    player.message('@que@Invrigar the necromancer is not interested in talking');

    return true;
}

// ranging the necromancer reacts identically to a melee attack
async function onRangeNPC(player, npc) {
    return onNPCAttack(player, npc);
}

module.exports = { onNPCAttack, onRangeNPC, onSpellNPC, onNPCDeath, onTalkToNPC };
