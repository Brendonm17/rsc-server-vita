// 1:1 port of OpenRSC's auction house, run synchronously in this single-threaded engine.
// persisted as one JSON blob via dataClient world-state (no SQL); ids use player.id, names getFormattedUsername().

const items = require('@2003scape/rsc-data/config/items');
const { flag } = require('./qol-config');
const { wildernessLevel } = require('../plugins/skills/magic');

const COINS_ID = 10; // ItemId.COINS

// TIME_LIMIT is Integer.MAX_VALUE seconds, so in practice an auction never expires;
// the expiry sweep below is dead code in normal operation.
const TIME_LIMIT_SECONDS = 2147483647; // Integer.MAX_VALUE

// only the cleanup sweep is time-throttled (>60000ms); everything else runs synchronously here
const SWEEP_INTERVAL_MS = 60000;

// a listed auction (auctionID/catalogID/amount/amountLeft/price/seller/sellerName/buyers/time)
class MarketItem {
    constructor({
        auctionID,
        catalogID,
        amount,
        amountLeft,
        price,
        seller,
        sellerName,
        buyers = '',
        time
    }) {
        this.auctionID = auctionID;
        this.catalogID = catalogID;
        this.amount = amount;
        this.amountLeft = amountLeft;
        this.price = price;
        this.seller = seller;
        this.sellerName = sellerName;
        this.buyers = buyers;
        this.time = time;
    }

    // hours remaining until TIME_LIMIT_SECONDS after time, floored at 0
    getHoursLeft() {
        const expireAt = this.time + TIME_LIMIT_SECONDS;
        const now = Math.floor(Date.now() / 1000);
        const diff = expireAt - now;

        if (diff < 0) {
            return 0;
        }

        return Math.floor(diff / 60 / 60);
    }

    hasExpired() {
        return this.getHoursLeft() <= 0;
    }
}

// a pending payout (sold gp) or returned item waiting at the Auctioneer for a player to claim
class CollectibleItem {
    constructor({ claimID, itemID, itemAmount, playerID, explanation, time }) {
        this.claimID = claimID;
        this.itemID = itemID;
        this.itemAmount = itemAmount;
        this.playerID = playerID;
        this.explanation = explanation;
        this.time = time;
    }
}

// message-box substitute: one player.message() per '%'-separated box line
function sendBox(player, text) {
    for (const line of text.split('%')) {
        player.message(line.trim());
    }
}

// sum of every skill's base level
function totalLevel(player) {
    let total = 0;

    for (const skill of Object.values(player.skills || {})) {
        total += skill.base || skill.current || 0;
    }

    return total;
}

class Market {
    constructor(world) {
        this.world = world;
        this.auctions = []; // active MarketItem[], the source of truth
        this.nextAuctionId = 1;
        this.collectibles = []; // unclaimed CollectibleItem[]
        this.nextClaimId = 1;
        this.lastCleanUp = 0;
        this._sweepTimer = null;
    }

    // ---- persistence ----

    async load() {
        const state = await this.world.server.dataClient.getWorldState(
            'auctions'
        );

        if (!state) {
            return;
        }

        this.auctions = (state.auctions || []).map((a) => new MarketItem(a));
        this.nextAuctionId = state.nextAuctionId || 1;
        this.collectibles = (state.collectibles || []).map(
            (c) => new CollectibleItem(c)
        );
        this.nextClaimId = state.nextClaimId || 1;
    }

    async save() {
        await this.world.server.dataClient.setWorldState('auctions', {
            auctions: this.auctions,
            nextAuctionId: this.nextAuctionId,
            collectibles: this.collectibles,
            nextClaimId: this.nextClaimId
        });
    }

    // ---- periodic expiry sweep (checkAndRemoveExpiredItems, throttled to once per 60s) ----

    startSweep() {
        const tick = () => {
            this.checkAndRemoveExpiredItems();
            this._sweepTimer = setTimeout(tick, SWEEP_INTERVAL_MS);
        };

        this._sweepTimer = setTimeout(tick, SWEEP_INTERVAL_MS);
    }

    stopSweep() {
        if (this._sweepTimer) {
            clearTimeout(this._sweepTimer);
            this._sweepTimer = null;
        }
    }

    // checkAndRemoveExpiredItems: dead in practice (see TIME_LIMIT_SECONDS), ported faithfully
    checkAndRemoveExpiredItems() {
        try {
            const expired = this.auctions.filter((a) => a.hasExpired());

            for (const auction of expired) {
                // java quirk: passes the original amount (not amountLeft), stale if any had sold; preserved
                this.addCollectible(
                    auction.seller,
                    auction.catalogID,
                    auction.amount,
                    'Expired'
                );

                const seller = this.world.players.getByID(auction.seller);
                this.removeAuction(auction.auctionID);

                if (seller) {
                    const def = items[auction.catalogID];
                    seller.message(
                        `@gre@[Auction House] @whi@Your auction - @lre@${
                            def ? def.name : '?'
                        } x${auction.amountLeft}@whi@ has expired!`
                    );
                    seller.message('You can collect it back from a banker.');
                }
            }

            this.lastCleanUp = Date.now();
        } catch (e) {
            // swallow so one bad row can't wedge the sweep
        }
    }

    // ---- listing cache (Market.getAuctionItems / DB auctionItem/auctionItems) ----

    getAuctionItems() {
        return this.auctions;
    }

    getAuctionItem(auctionID) {
        return this.auctions.find((a) => a.auctionID === auctionID) || null;
    }

    removeAuction(auctionID) {
        const index = this.auctions.findIndex(
            (a) => a.auctionID === auctionID
        );

        if (index !== -1) {
            this.auctions.splice(index, 1);
        }
    }

    // ---- collectibles (addExpiredAuction / getCollectibleItems / collectItems) ----

    // strips single-quotes from the explanation (kept, since it changes displayed text for an apostrophe)
    addCollectible(playerID, itemID, itemAmount, explanation) {
        this.collectibles.push(
            new CollectibleItem({
                claimID: this.nextClaimId++,
                itemID,
                itemAmount,
                playerID,
                explanation: explanation.replace(/'/g, ''),
                time: Math.floor(Date.now() / 1000)
            })
        );
    }

    getCollectiblesFor(playerID) {
        return this.collectibles.filter((c) => c.playerID === playerID);
    }

    // ---- OpenMarketTask: opcode 132 house-open / refresh ----

    openHouse(player) {
        player.send({ type: 'auction', action: 0 });

        const rows = this.auctions.map((a) => ({
            auctionID: a.auctionID,
            catalogID: a.catalogID,
            amountLeft: a.amountLeft,
            price: a.price,
            isMine: a.seller === player.id,
            sellerName: a.sellerName,
            hoursLeft: a.getHoursLeft()
        }));

        // always sends at least one type-1 packet (empty when zero listings), chunked at 200 rows/packet
        if (rows.length === 0) {
            player.send({ type: 'auction', action: 1, items: [] });
            return;
        }

        for (let i = 0; i < rows.length; i += 200) {
            player.send({
                type: 'auction',
                action: 1,
                items: rows.slice(i, i + 200)
            });
        }
    }

    // ---- NewMarketItemTask: list a new auction ----

    async create(player, catalogID, amount, price) {
        const def = items[catalogID];

        if (!def) {
            return;
        }

        if (catalogID === COINS_ID || def.untradeable) {
            sendBox(
                player,
                '@red@[Auction House - Error] % @whi@ You cannot sell that item on auction house!'
            );
            return;
        }

        if (price < 1) {
            sendBox(
                player,
                '@red@[Auction House - Error] % @whi@ Price must be greater than zero'
            );
            return;
        }

        if (amount < 1) {
            sendBox(
                player,
                '@red@[Auction House - Error] % @whi@ Amount must be greater than zero'
            );
            return;
        }

        // not enough of the item -> silent return (the one check with no sendBox)
        const plain = player.inventory.count(catalogID, false);
        const notes = player.inventory.count(catalogID, true);

        if (plain + notes < amount) {
            return;
        }

        // remove exactly the listed amount: items first, then notes
        const fromPlain = Math.min(plain, amount);

        if (fromPlain > 0) {
            player.inventory.remove(catalogID, fromPlain, false);
        }

        if (amount - fromPlain > 0) {
            player.inventory.remove(catalogID, amount - fromPlain, true);
        }

        const auction = new MarketItem({
            auctionID: this.nextAuctionId++,
            catalogID,
            amount,
            amountLeft: amount,
            price,
            seller: player.id,
            sellerName: player.getFormattedUsername(),
            buyers: '',
            time: Math.floor(Date.now() / 1000)
        });

        this.auctions.push(auction);

        sendBox(
            player,
            `@gre@[Auction House - Success] % @whi@ Auction has been listed % ${amount}x @yel@${def.name} @whi@for @yel@${price}gp`
        );

        await player.save();
        await this.save();
        this.openHouse(player);
    }

    // ---- BuyMarketItemTask: buy (part of) a listing ----

    async buy(player, auctionID, amount) {
        const item = this.getAuctionItem(auctionID);

        if (!item) {
            sendBox(
                player,
                "@red@[Auction House - Error] % @whi@ This item is sold out! % Click 'Refresh' to update the Auction."
            );
            return;
        }

        if (amount <= 0) {
            sendBox(
                player,
                '@red@[Auction House - Error] % @whi@ Invalid amount'
            );
            return;
        }

        if (item.seller === player.id) {
            sendBox(
                player,
                "@red@[Auction House - Error] % @whi@ You can't buy your own object, please select another item. % Or cancel this item from the 'My Auction' tab."
            );
            return;
        }

        if (amount > item.amountLeft) {
            amount = item.amountLeft;
        }

        const priceForEach = Math.floor(item.price / item.amountLeft);
        const auctionPrice = amount * priceForEach;

        if (!player.inventory.has(COINS_ID, auctionPrice)) {
            sendBox(
                player,
                '@ora@[Auction House - Warning] % @whi@ You don\'t have enough coins!'
            );
            return;
        }

        const def = items[item.catalogID];

        // java quirk: a stackable purchase always falls through to the bank branch (the
        // inventory branch's condition is always false for stackables); only non-stackables land in inventory.
        if (
            !player.inventory.isFull() &&
            !def.stackable &&
            player.inventory.items.length + amount <= 30
        ) {
            player.inventory.add(item.catalogID, amount);
            player.inventory.remove(COINS_ID, auctionPrice);
            sendBox(
                player,
                '@gre@[Auction House - Success] % @whi@ The item has been added to your inventory.'
            );
            await player.save();
        } else if (!player.bank.isFull()) {
            player.bank.add(item.catalogID, amount);
            player.inventory.remove(COINS_ID, auctionPrice);
            sendBox(
                player,
                '@gre@[Auction House - Success] % @whi@ The item has been added to your bank.'
            );
            await player.save();
        } else {
            sendBox(
                player,
                '@red@[Auction House - Error] % @whi@ Unable to buy auction, no space left in your inventory or bank.'
            );
            return;
        }

        const seller = this.world.players.getByID(item.seller);

        if (seller) {
            seller.message(
                `@gre@[Auction House]@lre@ ${amount}x ${def.name}@whi@ has been sold!`
            );
            seller.message(
                '@gre@[Auction House]@whi@ You can collect your earnings from a bank.'
            );
            await seller.save();
        }

        this.addCollectible(
            item.seller,
            COINS_ID,
            auctionPrice,
            `Sold ${def.name}(${item.catalogID}) x${amount} for ${auctionPrice}gp`
        );

        const now = Math.floor(Date.now() / 1000);
        item.buyers = item.buyers
            ? `${item.buyers}, \n[${now}: ${player.username}: x${amount}]`
            : `[${now}: ${player.username}: x${amount}]`;

        item.amountLeft -= amount;
        item.price = item.amountLeft * priceForEach;

        if (item.amountLeft === 0) {
            this.removeAuction(item.auctionID);
        }

        await this.save();
        this.openHouse(player);
    }

    // ---- CancelMarketItemTask: withdraw your own (or, as staff, anyone's) listing ----

    async cancel(player, auctionID) {
        const item = this.getAuctionItem(auctionID);

        if (item) {
            const catalogID = item.catalogID;
            const amount = item.amountLeft;

            // only isAdministrator() here (no separate mod/admin tiers); a non-seller non-admin is refused
            if (player.id !== item.seller && !player.isAdministrator()) {
                return;
            }

            const def = items[catalogID];

            if (
                !player.inventory.isFull() &&
                !def.stackable &&
                player.inventory.items.length + amount <= 30
            ) {
                this.removeAuction(item.auctionID);
                player.inventory.add(catalogID, amount);
                sendBox(
                    player,
                    '@gre@[Auction House - Success] % @whi@ The item has been canceled and returned to your inventory.'
                );
            } else if (!player.bank.isFull()) {
                this.removeAuction(item.auctionID);
                player.bank.add(catalogID, amount);
                sendBox(
                    player,
                    '@gre@[Auction House - Success] % @whi@ The item has been canceled and returned to your bank. % Talk with a Banker to collect your item(s).'
                );
            } else {
                sendBox(
                    player,
                    '@red@[Auction House - Error] % @whi@ Unable to cancel auction! % % @red@Reason: @whi@No space left in your bank or inventory.'
                );
            }

            await player.save();
        }

        await this.save();
        this.openHouse(player);
    }

    // ---- ModeratorDeleteAuctionTask: staff pull a listing, seller collects it back ----

    async moderatorDelete(player, auctionID) {
        if (!player.isAdministrator()) {
            sendBox(
                player,
                '@red@[Auction House - Error] % @whi@ Unable to remove auction'
            );
            return;
        }

        const item = this.getAuctionItem(auctionID);

        if (item) {
            // formatted username stands in for the mod's staff name
            const staffName = player.getFormattedUsername();

            this.removeAuction(item.auctionID);
            this.addCollectible(
                item.seller,
                item.catalogID,
                item.amountLeft,
                `Removed by ${staffName}`
            );
            sendBox(
                player,
                `@gre@[Auction House - Success] % @whi@ Item has been removed from Auctions. % % Returned to collections for:  ${item.sellerName}`
            );

            await this.save();
        }

        this.openHouse(player);
    }

    // ---- CollectibleItemsNotificationTask: login popup listing what's waiting ----
    // gated on not-in-wilderness and spawnAuctionNpcs, so the login call site can call this unconditionally.

    notifyCollectiblesOnLogin(player) {
        const config =
            player.world && player.world.server ? player.world.server.config : null;

        if (!flag(config, 'spawnAuctionNpcs', true)) {
            return;
        }

        if (wildernessLevel(player.x, player.y, player.world.planeElevation) > 0) {
            return;
        }

        const list = this.getCollectiblesFor(player.id);

        if (list.length === 0) {
            return;
        }

        let text = 'Following items have been removed from market: % ';

        for (const c of list) {
            const def = items[c.itemID];
            text += ` @lre@${def ? def.name : '?'} @whi@x @cya@${
                c.itemAmount
            } ${c.explanation}@whi@ %`;
        }

        text += '@gre@You can claim them back from Auctioneer';

        sendBox(player, text);
    }

    // ---- PlayerCollectItemsTask: claim everything waiting into the bank ----
    // called from banker.js's "collect my items from auction" dialogue and right-click path.

    async addPlayerCollectItemsTask(player) {
        const list = this.getCollectiblesFor(player.id);

        if (list.length === 0) {
            player.message('You have no items to collect.');
            return;
        }

        let text = 'The following items have been sent to your bank: % ';
        const claimed = [];

        for (const c of list) {
            if (!player.bank.canHold(c.itemID)) {
                text +=
                    '@gre@Some items are still being held by the auctioneer.% Make more space in your bank to claim them.';
                break;
            }

            player.bank.add(c.itemID, c.itemAmount);

            const def = items[c.itemID];
            text += ` @lre@${def ? def.name : '?'} @whi@x @cya@${
                c.itemAmount
            }@whi@ ${c.explanation} %`;

            claimed.push(c.claimID);
        }

        this.collectibles = this.collectibles.filter(
            (c) => !claimed.includes(c.claimID)
        );

        await player.save();
        await this.save();

        sendBox(player, text);
    }
}

// construct + load the persisted Market and start its expiry sweep; called from server.js
async function installMarket(world) {
    const market = new Market(world);
    await market.load();
    market.startSweep();
    world.market = market;
    return market;
}

module.exports = {
    Market,
    MarketItem,
    CollectibleItem,
    installMarket,
    totalLevel,
    sendBox
};
