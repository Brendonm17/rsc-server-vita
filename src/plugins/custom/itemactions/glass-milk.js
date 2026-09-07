// drink glass of milk: consume it, heal 2 hp, give back a beverage glass. item
// ids resolved by name at load.

const items = require('@2003scape/rsc-data/config/items');

let IDS = null;
function ids() {
    if (IDS) {
        return IDS;
    }

    const nameToId = new Map();
    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];
        if (def && def.name) {
            const key = def.name.toLowerCase();
            if (!nameToId.has(key)) {
                nameToId.set(key, id);
            }
        }
    }

    const glassMilk = nameToId.get('glass of milk');
    const beverageGlass = nameToId.get('beverage glass');

    if (glassMilk === undefined || beverageGlass === undefined) {
        throw new RangeError('glass-milk.js: missing "Glass of milk" or "Beverage glass" item');
    }

    IDS = { glassMilk, beverageGlass };
    return IDS;
}

// heal hits by 2, capped at base
function healHits(player) {
    const skill = player.skills.hits;
    const newLevel = skill.current + 2 + Math.floor((skill.base * 0) / 100);
    skill.current = Math.min(newLevel, skill.base);
}

async function onInventoryCommand(player, item) {
    const { glassMilk, beverageGlass } = ids();

    if (item.id !== glassMilk) {
        return false;
    }

    if (!player.inventory.has(glassMilk)) {
        return true;
    }

    player.inventory.remove(glassMilk, 1);
    player.sendBubble(glassMilk);
    player.message('You drink the cold milk');
    player.inventory.add(beverageGlass, 1);
    healHits(player);
    player.sendStats();

    return true;
}

module.exports = { onInventoryCommand };
