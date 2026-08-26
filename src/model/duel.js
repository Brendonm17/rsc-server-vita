// duel stake stored as a plain array, matching the container size

const items = require('@2003scape/rsc-data/config/items');

// staking a rune-named item forces the no-magic duel rule
function isRune(id) {
    const definition = items[id];

    return !!(
        definition &&
        definition.name &&
        definition.name.toLowerCase().includes('-rune')
    );
}

// duel stake capacity: container 12, packet capped at 8
const DUEL_CAPACITY = 12;
const DUEL_ITEM_LIMIT = 8;

// duel rule wire order: retreat, magic, prayer, weapons
const DUEL_SETTINGS = ['retreat', 'magic', 'prayer', 'weapons'];

function processDuelRequest(playerA, playerB) {
    playerA.duel.requests.delete(playerB);
    playerA.duel.duelRecipient = playerB;
    playerA.interfaceOpen.duel = true;
    playerA.send({ type: 'duelOpen', index: playerB.index });
}

function processDuelClose(player) {
    player.interfaceOpen.duel = false;
    player.duel.duelRecipient = null;
    player.duel.resetDuelOffer();
    player.duel.clearDuelOptions();
    player.duel.accepted = false;
    player.duel.confirmAccepted = false;
    player.duel.active = false;
    player.send({ type: 'duelClose' });
}

class Duel {
    constructor(player) {
        // the owner of this object
        this.player = player;

        // set of duel requests the player has received
        this.requests = new Set();

        // the player the owner is dueling
        this.duelRecipient = null;

        // staked items: [{ id, amount }], capacity DUEL_CAPACITY
        this.offer = [];

        // the four duel rules (disallow flags). Index matches DUEL_SETTINGS.
        this.options = [false, false, false, false];

        // duelAccepted, duelConfirmAccepted, and active duel-window flags
        this.accepted = false;
        this.confirmAccepted = false;
        this.active = false;
    }

    // OpenRSC Duel.isDuelActive()
    isDuelActive() {
        return this.active;
    }

    resetDuelOffer() {
        this.offer.length = 0;
    }

    clearDuelOptions() {
        for (let i = 0; i < 4; i += 1) {
            this.options[i] = false;
        }
    }

    getDuelSetting(index) {
        return this.options[index];
    }

    setDuelSetting(index, value) {
        this.options[index] = value;
    }

    // isDueling: both parties confirmed and duel active
    isDueling() {
        return (
            this.active &&
            this.confirmAccepted &&
            this.duelRecipient != null &&
            this.duelRecipient.duel.confirmAccepted
        );
    }

    // send or accept a duel request
    request(otherPlayer) {
        if (otherPlayer.hasInterfaceOpen()) {
            this.player.message('That player is busy at the moment');
            return;
        }

        if (this.requests.has(otherPlayer)) {
            processDuelRequest(this.player, otherPlayer);
            processDuelRequest(otherPlayer, this.player);

            this.active = true;
            otherPlayer.duel.active = true;
            this.clearDuelOptions();
            otherPlayer.duel.clearDuelOptions();
        } else {
            this.player.message('Sending duel request');
            otherPlayer.message(
                `${this.player.username} wishes to duel with you`
            );
            otherPlayer.duel.requests.add(this.player);
            this.duelRecipient = otherPlayer;
        }
    }

    // player accepted the stake screen; advance both when both accept
    accept() {
        const other = this.duelRecipient;

        if (
            !other ||
            !this.player.interfaceOpen.duel ||
            !other.interfaceOpen.duel
        ) {
            this.resetAll();
            return;
        }

        this.accepted = true;

        // own accept indicator + opponent accept indicator
        this.player.send({ type: 'duelAccepted', accepted: 1 });
        other.send({ type: 'duelOpponentAccepted', accepted: 1 });

        if (other.duel.accepted) {
            this.sendConfirmScreen();
            other.duel.sendConfirmScreen();
        }
    }

    // send the duel confirm screen with stakes and rule flags
    sendConfirmScreen() {
        const other = this.duelRecipient;

        const message = {
            type: 'duelConfirmOpen',
            opponent: other.username,
            opponentItems: other.duel.offer.map(({ id, amount }) => ({
                id,
                amount
            })),
            items: this.offer.map(({ id, amount }) => ({ id, amount }))
        };

        // the encoder writes each of DUEL_SETTINGS off the message object
        for (let i = 0; i < DUEL_SETTINGS.length; i += 1) {
            message[DUEL_SETTINGS[i]] = this.options[i] ? 1 : 0;
        }

        this.player.send(message);
    }

    // OpenRSC PlayerDuelHandler DUEL_DECLINED
    decline() {
        const other = this.duelRecipient;

        processDuelClose(this.player);

        if (other) {
            processDuelClose(other);
            other.message('Other player left duel screen');
        }
    }

    // OpenRSC Duel.resetAll
    resetAll() {
        const other = this.duelRecipient;

        processDuelClose(this.player);

        if (other && other.duel.duelRecipient === this.player) {
            processDuelClose(other);
        }
    }

    // player confirmed; enforce rules and begin combat when both confirm
    confirmAccept() {
        const other = this.duelRecipient;

        if (
            !other ||
            !this.player.interfaceOpen.duel ||
            !other.interfaceOpen.duel ||
            !this.accepted ||
            !other.duel.accepted
        ) {
            this.resetAll();
            return;
        }

        this.confirmAccepted = true;

        if (!other.duel.confirmAccepted) {
            return;
        }

        // both confirmed: verify each still owns their stake
        if (!this.checkDuelItems() || !other.duel.checkDuelItems()) {
            this.resetAll();
            return;
        }

        // rule 3: no weapons/armour -> unequip everything for both players
        if (this.getDuelSetting(3)) {
            unequipAll(this.player);
            unequipAll(other);
        }

        // rule 2: no prayer -> turn off all active prayers for both players
        if (this.getDuelSetting(2)) {
            resetPrayers(this.player);
            resetPrayers(other);
        }

        // close duel windows; stake stays escrowed until a death
        this.player.interfaceOpen.duel = false;
        other.interfaceOpen.duel = false;
        this.player.send({ type: 'duelClose' });
        other.send({ type: 'duelClose' });

        this.player.message('Commencing Duel!');
        other.message('Commencing Duel!');

        // assign attacker (lower combat level first) and start combat
        this.active = true;
        other.duel.active = true;

        // lower combat level is the attacker (OpenRSC PlayerDuelHandler).
        let attacker;
        let opponent;

        if (this.player.getCombatLevel() > other.getCombatLevel()) {
            attacker = other;
            opponent = this.player;
        } else if (other.getCombatLevel() > this.player.getCombatLevel()) {
            attacker = this.player;
            opponent = other;
        } else if (Math.floor(Math.random() * 2) === 1) {
            attacker = this.player;
            opponent = other;
        } else {
            attacker = other;
            opponent = this.player;
        }

        attacker.attack(opponent).catch(() => {});
    }

    // confirm the player still holds each staked item and quantity
    checkDuelItems() {
        for (const { id, amount } of this.offer) {
            if (!this.player.inventory.has(id, amount)) {
                return false;
            }
        }

        return true;
    }

    // stake changed: void accept/confirm flags and resend the offer
    updateItems(offeredItems) {
        const other = this.duelRecipient;

        if (!other) {
            return;
        }

        this.accepted = false;
        this.confirmAccepted = false;
        other.duel.accepted = false;
        other.duel.confirmAccepted = false;

        this.resetDuelOffer();

        const itemCount = Math.min(offeredItems.length, DUEL_ITEM_LIMIT);

        for (let i = 0; i < itemCount; i += 1) {
            const item = offeredItems[i];

            if (item.amount < 1) {
                continue;
            }

            if (this.offer.length >= DUEL_CAPACITY) {
                break;
            }

            // staking a rune forces no-magic; the rune itself is not added
            if (isRune(item.id) && !this.getDuelSetting(1)) {
                this.setDuelSetting(1, true);
                other.duel.setDuelSetting(1, true);
                this.player.message(
                    "When runes are staked, magic can't be used during the duel"
                );
                other.message(
                    "When runes are staked, magic can't be used during the duel"
                );
                this.sendDuelSettingUpdate();
                other.duel.sendDuelSettingUpdate();
                continue;
            }

            const alreadyOffered = this.offer
                .filter((offered) => offered.id === item.id)
                .reduce((sum, offered) => sum + offered.amount, 0);

            if (
                !this.player.inventory.has(item.id, alreadyOffered + item.amount)
            ) {
                this.resetAll();
                return;
            }

            this.offer.push({ id: item.id, amount: item.amount });
        }

        // send each player the opponent's staked items
        other.send({
            type: 'duelUpdate',
            opponentItems: this.offer.map(({ id, amount }) => ({ id, amount }))
        });
        this.player.send({
            type: 'duelUpdate',
            opponentItems: other.duel.offer.map(({ id, amount }) => ({
                id,
                amount
            }))
        });
    }

    // rule flag toggled: void accept/confirm flags, mirror to both
    updateSettings(settings) {
        const other = this.duelRecipient;

        if (!other) {
            return;
        }

        this.accepted = false;
        this.confirmAccepted = false;
        other.duel.accepted = false;
        other.duel.confirmAccepted = false;

        for (let i = 0; i < DUEL_SETTINGS.length; i += 1) {
            const value = settings[DUEL_SETTINGS[i]] === 1;
            this.setDuelSetting(i, value);
            other.duel.setDuelSetting(i, value);
        }

        // no-magic is re-forced if a rune remains staked
        for (const { id } of this.offer.concat(other.duel.offer)) {
            if (isRune(id) && !this.getDuelSetting(1)) {
                this.setDuelSetting(1, true);
                other.duel.setDuelSetting(1, true);
                this.player.message(
                    "When runes are staked, magic can't be used during the duel"
                );
                other.message(
                    "When runes are staked, magic can't be used during the duel"
                );
            }
        }

        this.sendDuelSettingUpdate();
        other.duel.sendDuelSettingUpdate();
    }

    sendDuelSettingUpdate() {
        const settings = {};

        for (let i = 0; i < DUEL_SETTINGS.length; i += 1) {
            settings[DUEL_SETTINGS[i]] = this.options[i] ? 1 : 0;
        }

        this.player.send({ type: 'duelSettings', settings });
    }

    // losing player's stake transfers to the duel winner on death
    dropOnDeath() {
        const winner = this.duelRecipient;

        if (!winner) {
            return;
        }

        for (const { id, amount } of this.offer) {
            // remove the staked item from the loser (if still present)
            if (this.player.inventory.has(id, amount)) {
                this.player.inventory.remove(id, amount);
            }

            // award it to the winner
            winner.inventory.add(id, amount);
        }
    }
}

// unequip all items: no weapons/armour allowed in a duel
function unequipAll(player) {
    for (let i = player.inventory.items.length - 1; i >= 0; i -= 1) {
        const item = player.inventory.items[i];

        if (item && item.equipped) {
            player.inventory.unequip(i);
        }
    }
}

// turn off all active prayers (duel rule: no prayer)
function resetPrayers(player) {
    let changed = false;

    for (let i = 0; i < player.prayers.length; i += 1) {
        if (player.prayers[i]) {
            player.prayers[i] = false;
            changed = true;
        }
    }

    if (changed && typeof player.sendPrayerStatus === 'function') {
        player.sendPrayerStatus();
    }
}

module.exports = Duel;
