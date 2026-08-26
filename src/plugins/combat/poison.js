
const npcs = require('@2003scape/rsc-data/config/npcs');
const items = require('@2003scape/rsc-data/config/items');
const { getQOLConfig } = require('../../model/qol-config');

// poison ticks every 32 ticks: damage = round(power/10), power -= 2, cures below 10
const POISON_TICK_INTERVAL = 32;

// npc id -> poison power
function findNpcIdByName(name) {
    for (const [id, def] of Object.entries(npcs)) {
        if (def && def.name && def.name.toLowerCase() === name.toLowerCase()) {
            return Number(id);
        }
    }

    return undefined;
}

const NPC_NAME_POISON_SCORPION = 'Poison Scorpion';
const NPC_NAME_POISON_SPIDER = 'Poison Spider';
const NPC_NAME_DUNGEON_SPIDER = 'Dungeon spider';
const NPC_NAME_TRIBESMAN = 'Tribesman';
const NPC_NAME_JUNGLE_SAVAGE = 'Jungle Savage';

const NPC_POISON_POWER = new Map();

for (const [name, power] of [
    [NPC_NAME_POISON_SCORPION, 38],
    [NPC_NAME_POISON_SPIDER, 68],
    [NPC_NAME_DUNGEON_SPIDER, 38],
    [NPC_NAME_TRIBESMAN, 68],
    [NPC_NAME_JUNGLE_SAVAGE, 68]
]) {
    const id = findNpcIdByName(name);

    if (typeof id === 'number') {
        NPC_POISON_POWER.set(id, power);
    }
}

// default poison power: 38 npc, 48 pvp weapon
const DEFAULT_NPC_POISON_POWER = 38;
const PVP_WEAPON_POISON_POWER = 48;


// stop poison timer and clear persisted poison state
function cure(mob) {
    if (mob.poisonTicks === undefined && mob.poisonPower === undefined) {
        return;
    }

    mob.poisonPower = undefined;
    mob.poisonTicks = undefined;

    if (typeof mob.username === 'string' && mob.cache) {
        delete mob.cache.poisoned;
    }
}

// (re)start poison timer using the mob's poison damage as initial power
function startPoisonEvent(mob) {
    if (mob.poisonPower !== undefined) {
        cure(mob);
    }

    mob.poisonPower = mob.poisonDamage || 0;
    mob.poisonTicks = POISON_TICK_INTERVAL;
}

// Mob.setPoisonDamage(int)
function setPoisonDamage(mob, poisonDamage) {
    mob.poisonDamage = poisonDamage;
}

// runs each tick per poisoned mob, but fires only every 32 ticks
function tickPoison(mob) {
    if (mob.poisonPower === undefined) {
        return;
    }

    mob.poisonTicks -= 1;

    if (mob.poisonTicks > 0) {
        return;
    }

    mob.poisonTicks = POISON_TICK_INTERVAL;

    if (mob.poisonPower < 10) {
        cure(mob);
        return;
    }

    const damage = Math.floor(mob.poisonPower / 10);

    mob.poisonPower -= 2;

    if (typeof mob.username === 'string') {
        mob.message(
            '@gr3@You @gr2@are @gr1@poisioned! @gr2@You @gr3@lose @gr2@' +
                damage +
                ' @gr1@health.'
        );

        if (mob.cache) {
            mob.cache.poisoned = mob.poisonPower;
        }
    }

    mob.damage(damage);
}

// restore poison state from cache on login
function restorePoisonOnLogin(player) {
    if (!player.cache || !('poisoned' in player.cache)) {
        return;
    }

    setPoisonDamage(player, player.cache.poisoned);
    startPoisonEvent(player);
}

// Player.isAntidoteProtected()
function isAntidoteProtected(player) {
    return (
        typeof player.lastAntidote === 'number' &&
        typeof player.poisonProtectionTime === 'number' &&
        Date.now() - player.lastAntidote < player.poisonProtectionTime
    );
}

// 3 minute protection, never shortens a longer active window
function setCurePoisonProtection(player) {
    const CURE_POISON_PROTECTION_MS = 180000;

    const remainingProtection =
        (player.lastAntidote || 0) +
        (player.poisonProtectionTime || 0) -
        Date.now();

    if (remainingProtection > CURE_POISON_PROTECTION_MS) {
        return;
    }

    player.lastAntidote = Date.now();
    player.poisonProtectionTime = CURE_POISON_PROTECTION_MS;
}

// Player.setAntidoteProtection(): 6 minutes, unconditional.
function setAntidoteProtection(player) {
    player.lastAntidote = Date.now();
    player.poisonProtectionTime = 360000;
}


// npc melee hit: 10% chance to poison, blocked by antidote
function tryNpcPoisonPlayer(attacker, victim) {
    if (!victim || typeof victim.username !== 'string') {
        return;
    }

    if (isAntidoteProtected(victim)) {
        return;
    }

    const def = attacker.definition;
    const name = (def && def.name) || '';

    const qualifies =
        name.toLowerCase().includes('poison') ||
        attacker.id === findNpcIdByName(NPC_NAME_DUNGEON_SPIDER) ||
        attacker.id === findNpcIdByName(NPC_NAME_TRIBESMAN) ||
        attacker.id === findNpcIdByName(NPC_NAME_JUNGLE_SAVAGE);

    if (!qualifies) {
        return;
    }

    if (Math.floor(Math.random() * 100) >= 90) {
        setPoisonDamage(
            victim,
            NPC_POISON_POWER.has(attacker.id)
                ? NPC_POISON_POWER.get(attacker.id)
                : DEFAULT_NPC_POISON_POWER
        );
        startPoisonEvent(victim);
    }
}

// player melee hit with a poisoned weapon: 1-in-4 chance to poison
function tryPlayerPoisonPlayer(attacker, victim) {
    if (
        typeof attacker.username !== 'string' ||
        typeof victim.username !== 'string'
    ) {
        return;
    }

    if (isAntidoteProtected(victim)) {
        return;
    }

    if (attacker.duel && attacker.duel.isDuelActive()) {
        return;
    }

    if (Math.floor(Math.random() * 4) !== 0) {
        return;
    }

    const hasPoisonedWeapon = attacker.inventory.items.some((item) => {
        if (!item.equipped) {
            return false;
        }

        const def = items[item.id];
        return def && def.name.toLowerCase().includes('poisoned');
    });

    if (!hasPoisonedWeapon) {
        return;
    }

    setPoisonDamage(victim, PVP_WEAPON_POISON_POWER);
    startPoisonEvent(victim);
}

// poisoned ammo/weapon poisoning an npc; off unless want_poison_npcs
function tryPoisonNpcFromPlayer(attacker, victim, config) {
    if (typeof attacker.username !== 'string' || typeof victim.id !== 'number') {
        return;
    }

    if (!getQOLConfig(config).wantPoisonNpcs) {
        return;
    }

    if ((victim.poisonPower || 0) >= 10) {
        return;
    }

    const hasPoisonedWeapon = attacker.inventory.items.some((item) => {
        if (!item.equipped) {
            return false;
        }

        const def = items[item.id];
        return def && def.name.toLowerCase().includes('poisoned');
    });

    if (!hasPoisonedWeapon) {
        return;
    }

    if (Math.floor(Math.random() * 50) !== 0) {
        return;
    }

    setPoisonDamage(victim, 60);
    startPoisonEvent(victim);
}

// called after a successful melee hit lands
function onMeleeHit(attacker, victim, config) {
    if (typeof attacker.id === 'number' && typeof attacker.definition === 'object') {
        // attacker is an NPC
        tryNpcPoisonPlayer(attacker, victim);
        return;
    }

    if (typeof attacker.username === 'string') {
        if (typeof victim.username === 'string') {
            tryPlayerPoisonPlayer(attacker, victim);
        } else {
            tryPoisonNpcFromPlayer(attacker, victim, config);
        }
    }
}

module.exports = {
    POISON_TICK_INTERVAL,
    cure,
    startPoisonEvent,
    setPoisonDamage,
    tickPoison,
    restorePoisonOnLogin,
    isAntidoteProtected,
    setCurePoisonProtection,
    setAntidoteProtection,
    onMeleeHit,
    // exported for the harness / tests
    NPC_POISON_POWER,
    DEFAULT_NPC_POISON_POWER,
    PVP_WEAPON_POISON_POWER
};
