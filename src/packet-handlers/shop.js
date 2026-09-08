function shopOpen(player) {
    // fighting refuses the transaction but keeps the shop open
    if (player.opponent) {
        return false;
    }

    if (!player.interfaceOpen.shop || !player.shop) {
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
