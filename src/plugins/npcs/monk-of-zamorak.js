
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
    // addresses overhead chat to caster, then restores
    const previousInterlocutor = monk.interlocutor;
    monk.interlocutor = player;
    monk.broadcastChat('A curse be upon you');
    monk.interlocutor = previousInterlocutor;
    await player.world.sleepTicks(4);

    player.message('You feel slightly weakened');

    // dmg = ceil((maxHits + 20) * 0.05). getMaxStat = .base.
    const dmg = Math.ceil((player.skills.hits.base + 20) * 0.05);
    player.damage(dmg);

    // lowers attack/defense/strength by ceil((maxStat+20)*0.05), min 0
    for (const stat of ['attack', 'defense', 'strength']) {
        const skill = player.skills[stat];
        const lowerBy = Math.ceil((skill.base + 20) * 0.05);
        skill.current = Math.max(0, skill.current - lowerBy);
    }

    player.sendStats();

    // delays 1 tick then makes the monk chase the caster
    await player.world.sleepTicks(1);
    monk.attack(player).catch(() => {});
}

// suppresses default combat cast on these npcs
async function onSpellNPC(player, monk) {
    if (!MONK_OF_ZAMORAK_IDS.has(monk.id)) {
        return false;
    }

    await applyCurse(player, monk);

    return true;
}

// suppresses default melee engage; curse replaces the attack
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

// blocks pickup and curses if a monk is within 7 tiles
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

module.exports = { onSpellNPC, onNPCAttack, onGroundItemTake };
