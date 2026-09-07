async function playerTrade({ player }, { index }) {
    const { world } = player;

    // busy while locked or in an active duel
    if (player.locked || player.duel.isDuelActive()) {
        player.message('You are busy');
        return;
    }

    if (player.index === index) {
        throw new RangeError(`${player} trading with self`);
    }

    const otherPlayer = world.players.getByIndex(index);

    if (!otherPlayer) {
        throw new RangeError(
            `${player} tried to trade with invalid player index ${index}`
        );
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

    // an ironman may neither start nor be the target of a trade
    const ironManBlock = player.getIronManTradeBlock(otherPlayer);

    if (ironManBlock) {
        player.message(ironManBlock);
        // no trade session exists yet, nothing to reset before request()
        return;
    }

    player.trade.request(otherPlayer);
}

async function tradeAccept({ player }) {
    if (!player.interfaceOpen.trade) {
        return;
    }

    player.trade.accept();
}

async function tradeConfirmAccept({ player }) {
    if (!player.interfaceOpen.trade) {
        return;
    }

    player.trade.confirmAccept();
}

async function tradeDecline({ player }) {
    if (!player.interfaceOpen.trade) {
        return;
    }

    player.trade.decline();
}

async function tradeItemUpdate({ player }, { items }) {
    if (!player.interfaceOpen.trade) {
        return;
    }

    player.trade.updateItems(items);
}

module.exports = {
    playerTrade,
    tradeAccept,
    tradeConfirmAccept,
    tradeDecline,
    tradeItemUpdate
};
