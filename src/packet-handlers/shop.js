function shopOpen(player) {
    // fighting keeps the shop open but refuses the transaction; other busy states close it
    if (player.opponent) {
        return false;
    }

    if (!player.interfaceOpen.shop || !player.shop || player.locked) {
        player.exitShop();
        return false;
    }

    return true;
}

async function shopBuy({ player }, { id, price }) {
    if (shopOpen(player)) {
        player.shop.buy(player, id, price);
    }
}

async function shopSell({ player }, { id, price }) {
    if (shopOpen(player)) {
        player.shop.sell(player, id, price);
    }
}

async function shopClose({ player }) {
    if (player.interfaceOpen.shop) {
        player.exitShop(false);
    }
}

module.exports = { shopBuy, shopSell, shopClose };
