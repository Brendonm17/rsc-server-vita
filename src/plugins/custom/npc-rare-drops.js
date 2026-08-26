// ring of wealth: extra roll of the death drop table on kill

const dropDefinitions = require('@2003scape/rsc-data/rolls/drops');
const items = require('@2003scape/rsc-data/config/items');
const { rollItemDrop } = require('../../rolls');

const RING_OF_WEALTH_ID = 1324;

// reference tables treated as "rare" for the shine message
const RARE_REFERENCES = new Set(['rare', 'ultra-rare']);

// f2p worlds: unidentified herbs become 10 gp
const HERB_IDS = new Set(dropDefinitions.herb.map((entry) => entry.id));

function wantNewRareDropTables(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    // default ON (Cabbage enables it) unless a world sets the flag false.
    return !config || config.wantNewRareDropTables !== false;
}

function hasRingOfWealthEquipped(player) {
    return !!player.inventory.items.find(
        (item) => item.id === RING_OF_WEALTH_ID && item.equipped
    );
}

// item is rare if it's not a direct table entry but is in a rare reference table
function isFromRareTable(npcId, droppedItems) {
    const table = dropDefinitions[npcId];
    if (!table) {
        return false;
    }
    const directIds = new Set(
        table
            .filter((entry) => !entry.reference && entry.id !== undefined)
            .map((entry) => (Array.isArray(entry.id) ? entry.id : [entry.id]))
            .reduce((a, b) => a.concat(b), [])
    );
    const hasRareRef = table.some(
        (entry) => entry.reference && RARE_REFERENCES.has(entry.reference)
    );
    if (!hasRareRef) {
        return false;
    }
    const rareIds = new Set();
    for (const ref of RARE_REFERENCES) {
        const refTable = dropDefinitions[ref];
        if (!refTable) {
            continue;
        }
        for (const entry of refTable) {
            if (entry.id === undefined) {
                continue;
            }
            for (const id of Array.isArray(entry.id) ? entry.id : [entry.id]) {
                rareIds.add(id);
            }
        }
    }
    return droppedItems.some(
        (drop) => !directIds.has(drop.id) && rareIds.has(drop.id)
    );
}

// extra ring-of-wealth roll; returns false so normal drops still happen
async function onNPCDeath(player, npc) {
    if (!player) {
        return false;
    }
    if (!wantNewRareDropTables(player)) {
        return false;
    }
    if (!hasRingOfWealthEquipped(player)) {
        return false;
    }
    // No table -> nothing to reroll.
    if (!dropDefinitions[npc.id]) {
        return false;
    }

    // "a second chance at goodies" - one extra roll of the whole table.
    let bonus = rollItemDrop(dropDefinitions, npc.id);

    // swap unid'd herbs for gp and strip members items on f2p
    if (!player.world.members) {
        for (const drop of bonus) {
            if (HERB_IDS.has(drop.id)) {
                drop.id = 10;
                drop.amount = 10;
            }
        }
        bonus = bonus.filter((drop) => !items[drop.id].members);
    }

    if (bonus.length === 0) {
        return false;
    }

    if (isFromRareTable(npc.id, bonus)) {
        player.message('@ora@Your ring of wealth shines brightly!');
        if (typeof player.sendSound === 'function') {
            player.sendSound('foundgem');
        }
    }

    for (const item of bonus) {
        player.world.addPlayerDrop(player, item, npc.x, npc.y);
    }

    return false;
}

module.exports = { onNPCDeath };
