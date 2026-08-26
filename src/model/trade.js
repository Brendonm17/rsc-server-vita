const items = require('@2003scape/rsc-data/config/items');

// trade offer holds up to 12 items, stored as-is (not auto-stacked like inventory)
const TRADE_CAPACITY = 12;

// maximum inventory size (mirrors Inventory.isFull() -> length >= 30)
const INVENTORY_CAPACITY = 30;

function processTradeRequest(playerA, playerB) {
    playerA.trade.requests.delete(playerB);
    playerA.trade.tradingWith = playerB;
    playerA.interfaceOpen.trade = true;
    playerA.send({ type: 'tradeOpen', index: playerB.index });
}

function processTradeClose(player) {
    player.interfaceOpen.trade = false;
    player.trade.tradingWith = null;
    player.trade.resetOffer();
    player.trade.accepted = false;
    player.trade.confirmAccepted = false;
    player.send({ type: 'tradeClose' });
}

class Trade {
    constructor(player) {
        // the owner of this object
        this.player = player;

        // set of trade requests the player has received
        this.requests = new Set();

        // the player the owner is trading with
        this.tradingWith = null;

        // offered items: [{ id, amount }], capacity TRADE_CAPACITY
        this.offer = [];

        // accepted = first accept button; confirmAccepted = second confirm screen
        this.accepted = false;
        this.confirmAccepted = false;
    }

    resetOffer() {
        this.offer.length = 0;
    }

    request(otherPlayer) {
        // TODO: take privacy settings into account

        if (otherPlayer.hasInterfaceOpen()) {
            this.player.message('That player is busy at the moment');
            return;
        }

        // if we have a request from this player, open the trade screen
        // otherwise, send them a trade request
        if (this.requests.has(otherPlayer)) {
            processTradeRequest(this.player, otherPlayer);
            processTradeRequest(otherPlayer, this.player);
        } else {
            this.player.message('Sending trade request');
            otherPlayer.message(
                `${this.player.username} wishes to trade with you`
            );
            otherPlayer.trade.requests.add(this.player);
            this.tradingWith = otherPlayer;
        }
    }

    // when both players accept the first screen, advance both to the confirm screen
    accept() {
        const other = this.tradingWith;

        if (
            !other ||
            !this.player.interfaceOpen.trade ||
            !other.interfaceOpen.trade
        ) {
            this.resetAll();
            return;
        }

        this.accepted = true;

        // notify the other player the accept status changed
        other.send({ type: 'tradeRecipientStatus', accepted: 1 });

        if (other.trade.accepted) {
            // once both accept, send the confirm screen with both finalized offers
            this.sendConfirmScreen();
            other.trade.sendConfirmScreen();
        }
    }

    // send the confirm screen: this player's offer plus the recipient's offer
    sendConfirmScreen() {
        const other = this.tradingWith;

        this.player.send({
            type: 'tradeConfirmOpen',
            recipient: other.username,
            recipientItems: other.trade.offer.map(({ id, amount }) => ({
                id,
                amount
            })),
            items: this.offer.map(({ id, amount }) => ({ id, amount }))
        });
    }

    decline() {
        // capture reference since processTradeClose mods this variable
        const other = this.tradingWith;

        processTradeClose(this.player);

        if (other) {
            processTradeClose(other);
            other.message('Other player has declined trade');
        }
    }

    // fully reset both sides of the trade (mirrors OpenRSC Trade.resetAll)
    resetAll() {
        const other = this.tradingWith;

        processTradeClose(this.player);

        if (other && other.trade.tradingWith === this.player) {
            processTradeClose(other);
        }
    }

    // once both players confirm, perform the item transfer
    confirmAccept() {
        const other = this.tradingWith;

        if (
            !other ||
            !this.player.interfaceOpen.trade ||
            !other.interfaceOpen.trade ||
            !this.accepted ||
            !other.trade.accepted
        ) {
            this.resetAll();
            return;
        }

        this.confirmAccepted = true;

        if (other.trade.confirmAccepted) {
            this.performTrade();
        }
    }

    // transfer each side's offered items after checking both have room; coins are item id 10
    performTrade() {
        const player = this.player;
        const other = this.tradingWith;

        const myOffer = this.offer;
        const theirOffer = other.trade.offer;

        // a player needs room for the incoming offer once their own offered items are removed
        const myAvailable =
            INVENTORY_CAPACITY -
            player.inventory.items.length +
            getFreedSlots(player, myOffer);
        const theirAvailable =
            INVENTORY_CAPACITY -
            other.inventory.items.length +
            getFreedSlots(other, theirOffer);

        const myRequired = getRequiredSlots(player, theirOffer);
        const theirRequired = getRequiredSlots(other, myOffer);

        if (theirRequired > theirAvailable) {
            player.message(
                "Other player doesn't have enough inventory space to " +
                    'receive the objects'
            );
            other.message(
                "You don't have enough inventory space to receive the objects"
            );
            this.resetAll();
            return;
        }

        if (myRequired > myAvailable) {
            player.message(
                "You don't have enough inventory space to receive the objects"
            );
            other.message(
                "Other player doesn't have enough inventory space to " +
                    'receive the objects'
            );
            this.resetAll();
            return;
        }

        // remove each side's offer from its owner
        for (const { id, amount } of myOffer) {
            player.inventory.remove(id, amount);
        }

        for (const { id, amount } of theirOffer) {
            other.inventory.remove(id, amount);
        }

        // add each side's offer to the recipient
        for (const { id, amount } of myOffer) {
            other.inventory.add(id, amount);
        }

        for (const { id, amount } of theirOffer) {
            player.inventory.add(id, amount);
        }

        player.message('Trade completed successfully');
        other.message('Trade completed successfully');

        this.resetAll();
    }

    // changing the offer clears both players' acceptance and confirm flags
    updateItems(offeredItems) {
        const other = this.tradingWith;

        if (!other) {
            return;
        }

        // clear both players' acceptance
        if (this.accepted) {
            this.accepted = false;
            this.player.send({ type: 'tradeStatus', accepted: 0 });
        }

        if (other.trade.accepted) {
            other.trade.accepted = false;
            other.send({ type: 'tradeStatus', accepted: 0 });
        }

        this.confirmAccepted = false;
        other.trade.confirmAccepted = false;

        // rebuild the offer from the requested items
        this.resetOffer();

        for (const item of offeredItems) {
            if (this.offer.length >= TRADE_CAPACITY) {
                break;
            }

            // offered amount cannot exceed what the player owns beyond what's already offered
            const alreadyOffered = this.offer
                .filter((offered) => offered.id === item.id)
                .reduce((sum, offered) => sum + offered.amount, 0);

            if (!this.player.inventory.has(item.id, alreadyOffered + item.amount)) {
                // they don't have that many of this item
                this.player.message('You dont have that item');
                break;
            }

            this.offer.push({ id: item.id, amount: item.amount });
        }

        // show the other player the updated offer
        other.send({
            type: 'tradeItems',
            items: this.offer.map(({ id, amount }) => ({ id, amount }))
        });
    }
}

// inventory slots freed once the offer leaves this player's inventory
function getFreedSlots(player, offer) {
    let freed = 0;

    for (const { id, amount } of offer) {
        if (items[id].stackable) {
            // stackable: frees its single slot only if the entire stack goes
            const total = player.inventory.items
                .filter((item) => item.id === id)
                .reduce((sum, item) => sum + item.amount, 0);

            freed += amount >= total ? 1 : 0;
        } else {
            freed += amount;
        }
    }

    return freed;
}

// inventory slots the offer will need in the recipient's inventory
function getRequiredSlots(player, offer) {
    let required = 0;

    for (const { id, amount } of offer) {
        if (items[id].stackable) {
            const alreadyHas = player.inventory.items.some(
                (item) => item.id === id
            );

            required += alreadyHas ? 0 : 1;
        } else {
            required += amount;
        }
    }

    return required;
}

module.exports = Trade;
