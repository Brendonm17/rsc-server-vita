
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

// elvarg, the crandor dragon
const DRAGON_ID = findNpcIdByName('Dragon');
// NpcId.KING_BLACK_DRAGON.
const KING_BLACK_DRAGON_ID = findNpcIdByName('King Black Dragon');

// ItemId.ANTI_DRAGON_BREATH_SHIELD.
const ANTI_DRAGON_BREATH_SHIELD_ID = (() => {
    const items = require('@2003scape/rsc-data/config/items');

    for (let i = 0; i < items.length; i += 1) {
        if (
            items[i] &&
            items[i].name.toLowerCase() === 'anti dragon breath shield'
        ) {
            return i;
        }
    }

    return -1;
})();

// kbd fire breath reduces ranged level, scaled by proximity to max
function getLevelsToReduceAttackKBD(player) {
    const currLvl = player.skills.ranged.current;
    const maxLvl = player.skills.ranged.base;

    if (currLvl <= 3) {
        return 0;
    }

    const ratio = Math.trunc((currLvl * 100) / maxLvl);

    let levels;

    if (ratio >= 81) {
        levels = Math.trunc(maxLvl * 0.3);
    } else if (ratio >= 61) {
        levels = Math.trunc(maxLvl * 0.2);
    } else if (ratio >= 41) {
        levels = Math.trunc(maxLvl * 0.15);
    } else if (ratio >= 31) {
        levels = Math.trunc(maxLvl * 0.1);
    } else if (ratio >= 21) {
        levels = Math.trunc(maxLvl * 0.075);
    } else if (ratio >= 16) {
        levels = Math.trunc(maxLvl * 0.05);
    } else if (ratio >= 11) {
        levels = Math.trunc(maxLvl * 0.025);
    } else {
        levels = 1;
    }

    return levels;
}

async function onSpellNPC(player, npc) {
    if (npc.id !== DRAGON_ID && npc.id !== KING_BLACK_DRAGON_ID) {
        return false;
    }

    player.message('@que@The dragon breathes fire at you');

    let percentage = 20;

    if (player.inventory.isEquipped(ANTI_DRAGON_BREATH_SHIELD_ID)) {
        if (npc.id === DRAGON_ID) {
            percentage = 10;
        } else if (npc.id === KING_BLACK_DRAGON_ID) {
            percentage = 4;
        } else {
            percentage = 0;
        }

        player.message(
            '@que@Your shield prevents some of the damage from the flames'
        );
    }

    const fireDamage = Math.floor(
        (player.skills.hits.current * percentage) / 100
    );

    player.damage(fireDamage);

    // reduce ranged level (case for KBD)
    if (npc.id === KING_BLACK_DRAGON_ID) {
        const newLevel =
            player.skills.ranged.current - getLevelsToReduceAttackKBD(player);

        player.skills.ranged.current = newLevel;
        player.sendStats();
    }

    return false;
}

module.exports = { onSpellNPC };
