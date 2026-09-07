const party = require('../plugins/custom/party');
// drop-x: client sends the chosen amount as a trailing short after the index; extend the decoder to read it
const serverDecoders = require('@2003scape/rsc-socket/src/server/decoders');

if (!serverDecoders.__dropXPatched) {
    serverDecoders.inventoryDrop = (packet) => {
        const index = packet.getShort();
        let amount;

        // a drop-X packet appends the amount as a 4-byte int
        if (packet.remaining() >= 4) {
            amount = packet.getInt();
        }

        return { index, amount };
    };

    serverDecoders.__dropXPatched = true;
}

function getGroundItem(player, id, x, y) {
    const { world } = player;

    const groundItems = world.groundItems.getAtPoint(x, y);

    for (const groundItem of groundItems) {
        if (!groundItem.withinRange(player, 2, true)) {
            player.message("I can't reach that!");
            return;
        }

        if (
            groundItem.id === id &&
            (!groundItem.owner ||
                groundItem.owner === player.id ||
                party.lootShared(player))
        ) {
            return groundItem;
        }
    }
}

async function groundItemTake({ player }, { x, y, id }) {
    // can't take ground items while fighting
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    player.endWalkFunction = async () => {
        if (player.locked) {
            return;
        }

        const { world } = player;
        const groundItem = getGroundItem(player, id, x, y);

        if (!groundItem) {
            return;
        }

        if (
            player.inventory.isFull() &&
            (!(groundItem.definition.stackable || groundItem.noted) ||
                !player.inventory.has(groundItem.id, 1, !!groundItem.noted))
        ) {
            return;
        }

        // an ironman cannot loot pk piles or other players' drops, or a transfer ironman's items
        const ironManBlock = player.getIronManPickupBlock(groundItem);

        if (ironManBlock) {
            player.message(ironManBlock);
            return;
        }

        player.lock();
        player.faceEntity(groundItem);

        const blocked = await world.callPlugin(
            'onGroundItemTake',
            player,
            groundItem
        );

        player.unlock();

        if (blocked) {
            return;
        }

        world.removeEntity('groundItems', groundItem);
        player.inventory.add(groundItem);
        player.sendSound('takeobject');
    };
}

async function inventoryDrop({ player }, { index, amount }) {
    // can't drop while fighting, busy, in a trade, or in an active duel
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked || player.interfaceOpen.trade || player.duel.isDuelActive()) {
        return;
    }

    player.endWalkFunction = async () => {
        const { world } = player;
        const item = player.inventory.items[index];

        if (!item) {
            return;
        }

        const blocked = await world.callPlugin('onDropItem', player, item);

        if (blocked) {
            return;
        }

        // a note stays in the bag when notes are disabled
        if (item.noted && !require('../model/qol-config').getQOLConfig(world.server.config).wantBankNotes) {
            player.message('Notes have been disabled; you cannot drop them anymore.');
            player.message('You may either deposit it in the bank or sell to a shop instead.');
            return;
        }

        // drop a chosen quantity of a stack, clamped to what's held; full stack otherwise
        const wantDropX = require('../model/qol-config').getQOLConfig(
            world.server.config
        ).wantDropX;

        if (
            wantDropX &&
            typeof amount === 'number' &&
            item.stacks() &&
            amount > 0 &&
            amount < item.amount
        ) {
            item.amount -= amount;
            player.inventory.sendUpdate(index, item);

            world.addPlayerDrop(player, { id: item.id, amount, noted: item.noted });
            player.sendSound('dropobject');
            return;
        }

        player.inventory.drop(index);
    };
}

// busy blocks equip/unequip unless the busy state is combat; a duel's no-armour rule blocks it too
function equipCheck(player) {
    if (player.locked && !player.opponent) {
        return false;
    }

    if (player.duel.isDuelActive() && player.duel.getDuelSetting(3)) {
        player.message('No extra items may be worn during this duel!');
        return false;
    }

    return true;
}

async function inventoryWear({ player }, { index }) {
    if (!equipCheck(player)) {
        return;
    }

    player.sendSound('click');
    player.inventory.equip(index);
}

async function inventoryUnequip({ player }, { index }) {
    if (!equipCheck(player)) {
        return;
    }

    const item = player.inventory.items[index];

    // onUnequipItem plugin may keep the item on
    if (item && (await player.world.callPlugin('onUnequipItem', player, item))) {
        return;
    }

    player.sendSound('click');
    player.inventory.unequip(index);
}

async function useWithGroundItem({ player }, { x, y, groundItemID, index }) {
    // can't use items on ground items while fighting
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    player.endWalkFunction = async () => {
        if (player.locked) {
            return;
        }

        const item = player.inventory.items[index];

        if (!item) {
            throw new RangeError(
                `${player} used invalid item index on ground item`
            );
        }

        const { world } = player;

        if (item.definition.members && !world.members) {
            return;
        }

        const groundItem = getGroundItem(player, groundItemID, x, y);

        if (!groundItem) {
            return;
        }

        // a note on either side does nothing
        if (item.noted || groundItem.noted) {
            player.message('Nothing interesting happens');
            return;
        }

        player.lock();
        player.faceEntity(groundItem);

        const blocked = await world.callPlugin(
            'onUseWithGroundItem',
            player,
            groundItem,
            item
        );

        player.unlock();

        if (blocked) {
            return;
        }

        player.message('Nothing interesting happens');
    };
}

async function inventoryCommand({ player }, { index }) {
    // can't use inventory actions while fighting
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    const item = player.inventory.items[index];

    if (!item) {
        throw new RangeError(`${player} used invalid item index for command`);
    }

    const { world } = player;

    // prevent burying dragon bones on f2p worlds etc.
    if (item.definition.members && !world.members) {
        return;
    }

    player.lock();
    await world.callPlugin('onInventoryCommand', player, item);
    player.unlock();
}

async function useWithInventoryItem({ player }, { index, withIndex }) {
    // can't use items together while fighting
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    const item = player.inventory.items[index];

    if (!item) {
        throw new RangeError(`${player} used invalid item index for useWith`);
    }

    const target = player.inventory.items[withIndex];

    if (!target) {
        throw new RangeError(`${player} used invalid target index for useWith`);
    }

    // notes do nothing
    if (item.noted || target.noted) {
        player.message('Nothing interesting happens');
        return;
    }

    const { world } = player;

    if (
        !world.members &&
        (item.definition.members || target.definition.members)
    ) {
        player.message('Nothing interesting happens');
        return;
    }

    player.lock();

    const blocked = await world.callPlugin(
        'onUseWithInventory',
        player,
        item,
        target
    );

    if (!blocked) {
        player.message('Nothing interesting happens');
    }

    player.unlock();
}

module.exports = {
    groundItemTake,
    inventoryDrop,
    inventoryWear,
    inventoryUnequip,
    useWithGroundItem,
    inventoryCommand,
    useWithInventoryItem
};
