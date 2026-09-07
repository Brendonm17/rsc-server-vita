// shared helpers for combat odyssey tier-master npc dialogue files (dark mage,
// sigbert the adventurer, and any other tier master under npcs/**)

const co = require('../custom/minigames/combat-odyssey')._internal;
const ITEM_DEFS = require('@2003scape/rsc-data/config/items');

// biggum flodrot item id
const BIGGUM_FLODROT_ITEM = 1555;

// warn the player they need biggum flodrot to continue
async function biggumMissing(player) {
    if (!player.inventory.has(BIGGUM_FLODROT_ITEM, 1)) {
        player.message('@que@You need Biggum Flodrot to continue the Odyssey!');
        await player.world.sleepTicks(3);
        player.message("@que@You can probably find him at the Legend's Guild");
        return true;
    }

    return false;
}

// hand the player the current tier's rewards
async function giveRewards(player, npc) {
    const tier = co.getTier(co.getCurrentTier(player));

    if (!tier) {
        return;
    }

    for (const [itemId, amount] of tier.rewards) {
        const itemName = ITEM_DEFS[itemId]
            ? ITEM_DEFS[itemId].name
            : `item ${itemId}`;

        player.inventory.add(itemId, amount);
        player.message(`${npc.definition.name} hands you ${amount} ${itemName}`);
        await player.world.sleepTicks(3);
    }
}

// print biggum flodrot dialogue lines
async function biggumSay(player, arg1, ...rest) {
    let tickDelay = 5;
    let messages;

    if (typeof arg1 === 'number') {
        tickDelay = arg1;
        messages = rest;
    } else {
        messages = [arg1, ...rest];
    }

    for (const message of messages) {
        player.message(`@que@@yel@Biggum Flodrot: ${message}`);
        await player.world.sleepTicks(tickDelay);
    }
}

module.exports = { co, biggumMissing, giveRewards, biggumSay };
