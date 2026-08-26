// each exported function is keyed by the decoded opcode name

async function playerDuel({ player }, { index }) {
    const { world } = player;

    if (player.locked) {
        player.message('You are busy');
        return;
    }

    if (player.index === index) {
        throw new RangeError(`${player} dueling with self`);
    }

    const otherPlayer = world.players.getByIndex(index);

    if (!otherPlayer) {
        throw new RangeError(
            `${player} tried to duel with invalid player index ${index}`
        );
    }

    // duels are a members-world feature; this world is members, so it's never blocked
    if (!world.members) {
        player.duel.resetAll();
        return;
    }

    // OpenRSC: cannot duel in the wilderness.
    if (player.withinRegion('wilderness')) {
        player.duel.resetAll();
        return;
    }

    if (!player.withinRange(otherPlayer, 8, true)) {
        player.message("I'm not near enough");
        return;
    }

    if (!player.withinLineOfSight(otherPlayer)) {
        player.message('There is an obstacle in the way');
        return;
    }

    if (otherPlayer.locked) {
        player.message('That player is busy at the moment');
        return;
    }

    // an ironman may neither start nor be the target of a duel
    const ironManBlock = player.getIronManTradeBlock(otherPlayer);

    if (ironManBlock) {
        player.message(ironManBlock);
        return;
    }

    player.duel.request(otherPlayer);
}

async function duelAccept({ player }) {
    if (!player.interfaceOpen.duel) {
        return;
    }

    player.duel.accept();
}

async function duelConfirmAccept({ player }) {
    if (!player.interfaceOpen.duel) {
        return;
    }

    player.duel.confirmAccept();
}

async function duelDecline({ player }) {
    if (!player.interfaceOpen.duel) {
        return;
    }

    player.duel.decline();
}

async function duelItemUpdate({ player }, { items }) {
    if (!player.interfaceOpen.duel) {
        return;
    }

    player.duel.updateItems(items);
}

async function duelSettings({ player }, settings) {
    if (!player.interfaceOpen.duel) {
        return;
    }

    player.duel.updateSettings(settings);
}

module.exports = {
    playerDuel,
    duelAccept,
    duelConfirmAccept,
    duelDecline,
    duelItemUpdate,
    duelSettings
};
