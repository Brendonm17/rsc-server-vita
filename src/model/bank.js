const Item = require('./item');
const items = require('@2003scape/rsc-data/config/items');
const { getQOLConfig, isUltimateIronman } = require('./qol-config');

// certificate id to base item id map; one cert = 5 of the base item
const {
    certificates: CERTIFICATE_IDS
} = require('@2003scape/rsc-data/certificates');

// { certificateID: baseItemID }
const UNCERTED_IDS = {};

for (const [itemID, certificateID] of Object.entries(CERTIFICATE_IDS)) {
    UNCERTED_IDS[certificateID] = +itemID;
}

// maps a certificate id to its base item id, unchanged if not a cert
function uncertedID(itemID) {
    return Object.prototype.hasOwnProperty.call(UNCERTED_IDS, itemID)
        ? UNCERTED_IDS[itemID]
        : itemID;
}

class Bank {
    constructor(player, items = []) {
        this.player = player;
        this.items = items.map((item) => new Item(item));

        // max bank size: 48 free, 1592 members with custom banks else 192
        if (!this.player.world.members) {
            this.maxItems = 48;
        } else if (this.getConfig().wantCustomBanks) {
            this.maxItems = 1592;
        } else {
            this.maxItems = 192;
        }
    }

    // resolve the OpenRSC want_* QoL flags from world config
    getConfig() {
        return getQOLConfig(this.player.world.server.config);
    }

    open() {
        // ultimate ironmen cannot use the bank
        if (isUltimateIronman(this.player)) {
            this.player.message('As an Ultimate Ironman, you cannot use the bank.');
            return;
        }

        this.player.lock();
        this.player.interfaceOpen.bank = true;
        this.sendOpen();
    }

    sendOpen() {
        this.player.send({
            type: 'bankOpen',
            maxItems: this.maxItems,
            items: this.items
        });
    }

    close(send = true) {
        this.player.interfaceOpen.bank = false;
        this.player.unlock();

        if (send) {
            this.player.send({ type: 'bankClose' });
        }
    }

    getItem({ id }) {
        return this.items.find((item) => item.id === id);
    }

    deposit(id, amount) {
        // the last slot holding the id decides whether the item or its note leaves; bank always holds the item
        let noted = false;

        for (let i = this.player.inventory.items.length - 1; i >= 0; i -= 1) {
            const slot = this.player.inventory.items[i];

            if (slot.id === id) {
                noted = !!slot.noted;
                break;
            }
        }

        amount = Math.min(amount, this.player.inventory.count(id, noted));

        if (amount <= 0) {
            return;
        }

        if (!this.player.inventory.has(id, amount, noted)) {
            throw new RangeError(`${this} depositing item they don't have`);
        }

        // deposited certificates auto-convert to base item x5 when enabled
        let depositID = id;
        let depositAmount = amount;

        if (this.getConfig().wantCertDeposit && this.player.swapCert) {
            const uncerted = uncertedID(id);

            if (uncerted !== id) {
                depositID = uncerted;
                depositAmount = amount * 5;
            }
        }

        const bankItem = this.getItem({ id: depositID });

        if (this.isFull() && !bankItem) {
            this.message("You don't have room for that in your bank");
            return;
        }

        this.player.inventory.remove(id, amount, noted);

        let index;

        if (bankItem) {
            bankItem.amount += depositAmount;
            index = this.items.indexOf(bankItem);
        } else {
            index = this.items.push(new Item({ id: depositID, amount: depositAmount })) - 1;
        }

        this.update(index);
    }

    // deposits all inventory items, skipping equipped ones
    depositAllFromInventory() {
        if (!this.getConfig().wantCustomBanks) {
            return;
        }

        for (let i = this.player.inventory.items.length - 1; i >= 0; i -= 1) {
            const item = this.player.inventory.items[i];

            if (!item || item.equipped) {
                continue;
            }

            this.deposit(item.id, item.amount);
        }
    }

    // unequips and deposits all worn items
    depositAllFromEquipment() {
        if (!this.getConfig().wantCustomBanks) {
            return;
        }

        for (let i = this.player.inventory.items.length - 1; i >= 0; i -= 1) {
            const item = this.player.inventory.items[i];

            if (!item || !item.equipped) {
                continue;
            }

            this.player.inventory.unequip(i);
            this.deposit(item.id, item.amount);
        }
    }

    withdraw(id, amount, wantsNotes = false) {
        // amount is checked against the total held for the id, then drained across slots
        if (this.countId(id) < amount) {
            throw new RangeError(`${this} withdrawing item they don't have`);
        }

        // withdraw noted when wantsNotes and the item is noteable on a bank-notes world
        const noted =
            !!wantsNotes &&
            this.getConfig().wantBankNotes &&
            Item.isNoteable(id);

        this.player.inventory.add(id, amount, noted);

        let left = amount;
        let removedSlot = false;

        for (let i = this.items.length - 1; i >= 0 && left > 0; i -= 1) {
            const slot = this.items[i];

            if (slot.id !== id) {
                continue;
            }

            const take = Math.min(slot.amount, left);
            slot.amount -= take;
            left -= take;

            if (slot.amount === 0) {
                this.items.splice(i, 1);
                removedSlot = true;
            } else {
                this.update(i);
            }
        }

        if (removedSlot) {
            this.sendOpen();
        }
    }

    update(index) {
        const item = this.items[index];
        this.player.send({ type: 'bankUpdate', index, ...item });
    }

    has(id, amount = 1) {
        if (typeof id !== 'number') {
            amount = id.amount;
            id = id.id;
        }

        if (!this.player.world.members && items[id].members) {
            return false;
        }

        for (const item of this.items) {
            if (item.id === id && item.amount >= amount) {
                return true;
            }
        }

        return false;
    }

    // total quantity of an item id held in the bank
    countId(id) {
        let total = 0;

        for (const item of this.items) {
            if (item.id === id) {
                total += item.amount;
            }
        }

        return total;
    }

    // adds a raw item quantity to the bank; false if no room
    add(id, amount) {
        if (amount <= 0) {
            return false;
        }

        const bankItem = this.getItem({ id });

        if (bankItem) {
            bankItem.amount += amount;
            this.update(this.items.indexOf(bankItem));
            return true;
        }

        if (this.isFull()) {
            return false;
        }

        const index = this.items.push(new Item({ id, amount })) - 1;
        this.update(index);
        return true;
    }

    // removes a raw item quantity from the bank; false if insufficient
    remove(id, amount) {
        const bankItem = this.getItem({ id });

        if (!bankItem || bankItem.amount < amount) {
            return false;
        }

        const index = this.items.indexOf(bankItem);
        bankItem.amount -= amount;

        if (bankItem.amount === 0) {
            this.items.splice(index, 1);
            this.sendOpen();
        } else {
            this.update(index);
        }

        return true;
    }

    // can the bank hold `amount` of item `id`?
    canHold(id) {
        return !this.isFull() || !!this.getItem({ id });
    }

    message(...messages) {
        this.player.message(...messages);
    }

    isFull() {
        return this.items.length >= this.maxItems;
    }

    toJSON() {
        return this.items;
    }
}

module.exports = Bank;
