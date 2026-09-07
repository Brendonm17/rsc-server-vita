async function getPlayer(player, index) {
    if (player.locked) {
        return;
    }

    const { world } = player;
    const otherPlayer = world.players.getByIndex(index);

    if (!otherPlayer) {
        throw new RangeError(`invalid player index ${index}`);
    }

    if (!otherPlayer.withinRange(player, 3, true)) {
        if (otherPlayer.withinRange(player, 8)) {
            await player.chase(otherPlayer);
        } else {
            return;
        }

        if (!otherPlayer.withinRange(player, 3, true)) {
            return;
        }
    }

    otherPlayer.stepsLeft = 0;
    player.lock();

    return otherPlayer;
}

// player attacks another player
async function playerAttack({ player }, { index }) {
    if (player.opponent) {
        player.message('You are already busy fighting!');
        return;
    }

    if (player.locked) {
        return;
    }

    const { world } = player;
    const otherPlayer = world.players.getByIndex(index);

    if (!otherPlayer || otherPlayer === player) {
        return;
    }

    // no fighting other players inside the mage arena bank area
    if (
        otherPlayer.x >= 220 &&
        otherPlayer.x <= 224 &&
        otherPlayer.y >= 107 &&
        otherPlayer.y <= 111
    ) {
        player.message('Here kolodion protects all from your attack');
        return;
    }

    if (player.rangedTimeout) {
        return;
    }

    if (player.inventory.getRangedWeapon()) {
        await player.shootRanged(otherPlayer);
        return;
    }

    player.toAttack = otherPlayer;

    player.endWalkFunction = async () => {
        const target = await getPlayer(player, index);

        if (!target) {
            player.toAttack = null;
            return;
        }

        if (target.locked) {
            player.toAttack = null;
            player.unlock();
            return;
        }

        if (!(await player.attack(target))) {
            player.unlock();
            player.message("I can't reach that!");
        }
    };
}

async function useWithPlayer({ player }, { playerIndex, index }) {
    // fighting gets its own message
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    // so players face the other player when using items, instead of walking
    // through them
    player.walkAction = false;

    player.endWalkFunction = async () => {
        const item = player.inventory.items[index];

        if (!item) {
            throw new RangeError(`invalid item index ${index}`);
        }

        // a note does nothing
        if (item.noted) {
            player.message('Nothing interesting happens');
            return;
        }

        const { world } = player;
        const otherPlayer = await getPlayer(player, playerIndex);

        if (!otherPlayer) {
            player.unlock();
            return;
        }

        if (!world.members && item.definition.members) {
            player.message('Nothing interesting happens');
            return;
        }

        const blocked = await world.callPlugin('onUseWithPlayer',
            player,
            otherPlayer,
            item
        );

        player.unlock();

        if (!blocked) {
            player.message('Nothing interesting happens');
        }
    };
}

module.exports = { playerAttack, useWithPlayer };
