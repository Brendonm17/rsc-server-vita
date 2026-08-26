// per-NPC kill counters (npc_kill_messages / npc_kill_list). on each kill, increment a per-NPC-id counter in the
// player cache and, when messages are enabled, message the running count. counts persist in player.cache.

const KILL_CACHE_KEY = 'npcKillCounts';

function killMessagesEnabled(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    // default ON (Cabbage enables npc_kill_messages)
    return !config || config.npcKillMessages !== false;
}

// NPC_KILL_MESSAGES_FILTER: when on, only NPCs whose name is in config.npcKillMessageNpcs get the on-kill message.
// default off
function passesNameFilter(player, npc) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    if (!config || !config.npcKillMessagesFilter) {
        return true;
    }

    const list = config.npcKillMessageNpcs;

    if (!Array.isArray(list)) {
        return true;
    }

    const name = npc.definition ? npc.definition.name : '';
    return list.includes(name);
}

// logNpcKill -> addNpcKill on every NPC kill; returns false so normal death handling proceeds. lifetime kill total
// across every npc id
function totalKills(counts) {
    let total = 0;
    for (const id in counts) {
        total += counts[id] | 0;
    }
    return total;
}

// push the counters to the client (npcKills packet) for the side-menu HUD's Kills lines
function sendCounters(player, recentId, recentCount) {
    const counts = player.cache[KILL_CACHE_KEY] || {};

    try {
        player.send({
            type: 'npcKills',
            total: totalKills(counts),
            recentId: recentId | 0,
            recentCount: recentCount | 0
        });
    } catch (e) {
        // a dying socket must not break the kill credit
    }
}

async function onNPCDeath(player, npc) {
    if (!player) {
        return false;
    }

    // per-NPC-id counter in the persistent player cache
    const counts = player.cache[KILL_CACHE_KEY] || {};
    const kills = (counts[npc.id] || 0) + 1;
    counts[npc.id] = kills;
    player.cache[KILL_CACHE_KEY] = counts;

    sendCounters(player, npc.id, kills);

    // on-kill message (sendUpdate branch): gated by the config flag + name filter
    if (killMessagesEnabled(player) && passesNameFilter(player, npc)) {
        const name = npc.definition ? npc.definition.name : 'creature';
        player.message(
            `Your ${name} kill count is: @red@${kills}@whi@.`
        );
    }

    return false;
}

module.exports = { onNPCDeath, sendCounters };
