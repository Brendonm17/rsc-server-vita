// valuable_drop_messages: when an NPC drops an item worth at least the threshold, message the killer. gated on
// config.valuableDropMessages (default on). threshold is config.valuableDropThreshold gp (default 5000)

const items = require('@2003scape/rsc-data/config/items');

const DEFAULT_THRESHOLD = 5000;

function serverConfig(player) {
    return player && player.world && player.world.server
        ? player.world.server.config
        : null;
}

function enabled(player) {
    const config = serverConfig(player);
    return !config || config.valuableDropMessages !== false;
}

function threshold(player) {
    const config = serverConfig(player);
    const t = config && config.valuableDropThreshold;
    return typeof t === 'number' && t > 0 ? t : DEFAULT_THRESHOLD;
}

// message player if item ({ id, amount }) is worth >= the threshold
function onDrop(player, item) {
    if (!player || !item || !enabled(player)) {
        return;
    }

    const def = items[item.id];
    if (!def || !def.price || def.price <= 0) {
        return;
    }

    const amount = item.amount || 1;
    const total = def.price * amount;

    if (total >= threshold(player)) {
        player.message(
            `@red@Valuable drop: @whi@${def.name}` +
                (amount > 1 ? ` x${amount}` : '') +
                ` @gre@(${total} coins)`
        );
    }
}

module.exports = { onDrop };
