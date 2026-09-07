// auction house interface options (sub 10). actions: buy=0 create=1 abort=2
// refresh=3 close=4 delete=5. the decoder is in patches/socket-auction.js.
//
// gate order:
//   1. fighting gate (every interface-option family)
//   2. spawnAuctionNpcs config gate
//   3. ironman gate
//   4. "auctionhouse" attribute gate (set once an auctioneer opens the house)
//   5. total-level >= 100 gate
//   6. dispatch by action
//   7. lastAuctionAction updated unconditionally, even on a rejected action
//
// session-only fields (not persisted):
//   player.auctionHouseOpen   : the auction house is open for this player
//   player.lastAuctionAction  : shared 3s cooldown for buy/create/abort
//   player.lastAuctionRefresh : 5s cooldown, refresh only

const { totalLevel, sendBox } = require('../../model/market');
const { flag } = require('../../model/qol-config');
const { IronmanMode } = require('../../model/game-modes');

const ACTION_COOLDOWN_MS = 3000;
const REFRESH_COOLDOWN_MS = 5000;

// the 4-mode ironman check
function ironmanRestricted(player) {
    return (
        player.isIronMan(IronmanMode.Ironman) ||
        player.isIronMan(IronmanMode.Ultimate) ||
        player.isIronMan(IronmanMode.Hardcore) ||
        player.isIronMan(IronmanMode.Transfer)
    );
}

async function auctionOptions(player, { action, id, amount, price }) {
    // fighting gate; player.opponent is the live-combat flag
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    // spawnAuctionNpcs config gate; defaults on for single-player
    const config =
        player.world && player.world.server ? player.world.server.config : null;

    if (!flag(config, 'spawnAuctionNpcs', true)) {
        return;
    }

    if (ironmanRestricted(player)) {
        player.message('As an Ironman, you cannot use the Auction.');
        return;
    }

    // auctionhouse attribute gate
    if (!player.auctionHouseOpen) {
        return;
    }

    if (totalLevel(player) < 100) {
        sendBox(
            player,
            'You must have 100 total skill before using the auction house.'
        );
        return;
    }

    const market = player.world.market;

    if (!market) {
        return;
    }

    switch (action) {
        case 0: // buy
            if (Date.now() - (player.lastAuctionAction || 0) < ACTION_COOLDOWN_MS) {
                sendBox(
                    player,
                    '@ora@[Auction House - Warning] % @whi@ You are acting too quickly, please wait 3 seconds.'
                );
                break;
            }

            await market.buy(player, id, amount);
            break;

        case 1: // create
            if (Date.now() - (player.lastAuctionAction || 0) < ACTION_COOLDOWN_MS) {
                sendBox(
                    player,
                    '@ora@[Auction House - Warning]@whi@ You are acting too quickly, please wait 3 seconds.'
                );
                break;
            }

            await market.create(player, id, amount, price);
            break;

        case 2: // abort (cancel)
            if (Date.now() - (player.lastAuctionAction || 0) < ACTION_COOLDOWN_MS) {
                sendBox(
                    player,
                    '@ora@[Auction House - Warning]@whi@ You are acting too quickly, please wait 3 seconds.'
                );
                break;
            }

            await market.cancel(player, id);
            break;

        case 3: { // refresh: own 5s cooldown, only advanced on success
            const lastRefresh =
                player.lastAuctionRefresh || Date.now() - REFRESH_COOLDOWN_MS;

            if (Date.now() - lastRefresh < REFRESH_COOLDOWN_MS) {
                sendBox(
                    player,
                    '@ora@[Auction House - Warning]@whi@ You are acting too quickly, please wait 5 seconds.'
                );
                break;
            }

            player.lastAuctionRefresh = Date.now();
            player.message('@gre@[Auction House]@whi@ List has been refreshed!');
            market.openHouse(player);
            break;
        }

        case 4: // close: client-side only, no server->client packet
            player.auctionHouseOpen = false;
            break;

        case 5: // delete (moderator)
            await market.moderatorDelete(player, id);
            break;

        default:
            return;
    }

    // lastAuctionAction updated unconditionally for every action, so spamming a
    // rejected action keeps pushing the 3s window forward
    player.lastAuctionAction = Date.now();
}

module.exports = { auctionOptions };
