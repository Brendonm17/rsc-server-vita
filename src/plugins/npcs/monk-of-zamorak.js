// monk of zamorak curses a player who casts on, attacks, or takes the altar wine
// nearby: overhead line, small hit, drains attack/defense/strength, then engages.
// the triggering action is blocked. targets combative monks 139/140, not 293.
// wine only curses on the altar tile (333, 434). no ranged hook for the block.

const npcsData = require('@2003scape/rsc-data/config/npcs');
const itemsData = require('@2003scape/rsc-data/config/items');

// name = "Monk of Zamorak" AND hostility = "combative" -> {139, 140}.
const MONK_OF_ZAMORAK_IDS = (() => {
    const ids = new Set();

    for (let i = 0; i < npcsData.length; i += 1) {
        const def = npcsData[i];

        if (
            def &&
            def.name.toLowerCase() === 'monk of zamorak' &&
            def.hostility === 'combative'
        ) {
            ids.add(i);
        }
    }

    return ids;
})();

async function applyCurse(player, monk) {
    // address the overhead line at the caster, then restore
    const previousInterlocutor = monk.interlocutor;
    monk.interlocutor = player;
    monk.broadcastChat('A curse be upon you');
    monk.interlocutor = previousInterlocutor;
    await player.world.sleepTicks(4);

    player.message('You feel slightly weakened');

    // dmg = ceil((maxHits + 20) * 0.05). getMaxStat = .base.
    const dmg = Math.ceil((player.skills.hits.base + 20) * 0.05);
    player.damage(dmg);

    // lower attack/defense/strength by ceil((maxStat + 20) * 0.05), min 0
    for (const stat of ['attack', 'defense', 'strength']) {
        const skill = player.skills[stat];
        const lowerBy = Math.ceil((skill.base + 20) * 0.05);
        skill.current = Math.max(0, skill.current - lowerBy);
    }

    player.sendStats();

    // delay 1 tick, then the monk chases the caster
    await player.world.sleepTicks(1);
    monk.attack(player).catch(() => {});
}

// suppress the default combat cast on these monks
async function onSpellNPC(player, monk) {
    if (!MONK_OF_ZAMORAK_IDS.has(monk.id)) {
        return false;
    }

    await applyCurse(player, monk);

    return true;
}

// suppress the default melee engage; curse replaces the attack
async function onNPCAttack(player, monk) {
    if (!MONK_OF_ZAMORAK_IDS.has(monk.id)) {
        return false;
    }

    await applyCurse(player, monk);

    return true;
}

// ItemId.WINE_OF_ZAMORAK.
const WINE_OF_ZAMORAK_ID = (() => {
    for (let id = 0; id < itemsData.length; id += 1) {
        const def = itemsData[id];

        if (def && def.name && def.name.toLowerCase() === 'wine of zamorak') {
            return id;
        }
    }

    throw new RangeError(
        'monk-of-zamorak: could not resolve item "Wine of Zamorak"'
    );
})();

// wine only curses on this exact altar tile
const WINE_ALTAR_X = 333;
const WINE_ALTAR_Y = 434;

// block pickup and curse if a non-combat monk is within 7 tiles
async function onGroundItemTake(player, groundItem) {
    if (
        groundItem.id !== WINE_OF_ZAMORAK_ID ||
        groundItem.x !== WINE_ALTAR_X ||
        groundItem.y !== WINE_ALTAR_Y
    ) {
        return false;
    }

    const monk = player
        .getNearbyEntities('npcs', 7)
        .filter((npc) => MONK_OF_ZAMORAK_IDS.has(npc.id) && !npc.opponent)
        .sort((a, b) => player.getDistance(a) - player.getDistance(b))[0];

    if (!monk) {
        return false;
    }

    await applyCurse(player, monk);

    return true;
}

// ranging a monk curses the archer, same as melee
async function onRangeNPC(player, monk) {
    return onNPCAttack(player, monk);
}

module.exports = { onSpellNPC, onNPCAttack, onRangeNPC, onGroundItemTake };
