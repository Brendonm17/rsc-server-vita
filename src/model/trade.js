const items = require('@2003scape/rsc-data/config/items');
const { getQOLConfig } = require('./qol-config');

// trade offer holds up to 12 items, stored as offered (not auto-stacked)
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

    // first-screen accept: flag accepted; when both accept, advance to confirm
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

        // tell the other player the accept status changed
        other.send({ type: 'tradeRecipientStatus', accepted: 1 });

        if (other.trade.accepted) {
            // both accepted -> send the confirm screen to both with finalised offers
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
            recipientItems: other.trade.offer.map(({ id, amount, noted }) => ({
                id,
                amount,
                noted
            })),
            items: this.offer.map(({ id, amount, noted }) => ({ id, amount, noted }))
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

    // confirm-screen accept: flag confirmed; once both confirm, do the transfer
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

        // a player needs room for the incoming offer once their own offered items leave
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

        // remove each side's offer from its owner (a note stays a note)
        for (const { id, amount, noted } of myOffer) {
            player.inventory.remove(id, amount, !!noted);
        }

        for (const { id, amount, noted } of theirOffer) {
            other.inventory.remove(id, amount, !!noted);
        }

        // add each side's offer to the recipient
        for (const { id, amount, noted } of myOffer) {
            other.inventory.add(id, amount, !!noted);
        }

        for (const { id, amount, noted } of theirOffer) {
            player.inventory.add(id, amount, !!noted);
        }

        player.message('Trade completed successfully');
        other.message('Trade completed successfully');

        this.resetAll();
    }

    // changing the offer voids both players' acceptance and confirm flags
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

            // notes stay out of the offer on a world without notes
            if (item.noted && !getQOLConfig(this.player.world.server.config).wantBankNotes) {
                this.player.message('Notes can no longer be traded with other players.');
                this.player.message('You may either deposit it in the bank or sell to a shop instead.');
                continue;
            }

            // offered amount cannot exceed what the player owns beyond what's already offered
            const alreadyOffered = this.offer
                .filter((offered) => offered.id === item.id && !!offered.noted === !!item.noted)
                .reduce((sum, offered) => sum + offered.amount, 0);

            if (!this.player.inventory.has(item.id, alreadyOffered + item.amount, !!item.noted)) {
                // they don't have that many of this item
                this.player.message('You dont have that item');
                break;
            }

            this.offer.push({ id: item.id, amount: item.amount, noted: !!item.noted });
        }

        // show the other player the updated offer
        other.send({
            type: 'tradeItems',
            items: this.offer.map(({ id, amount, noted }) => ({ id, amount, noted }))
        });
    }
}

// inventory slots freed once the offer leaves this player's inventory; a stack
// frees its slot only if the whole stack is offered, each unit frees one slot
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

// inventory slots the offer needs in the recipient's inventory; a stackable
// item already present takes no new slot, otherwise one slot per unit or stack
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
