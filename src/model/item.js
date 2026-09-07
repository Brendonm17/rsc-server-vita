const items = require('@2003scape/rsc-data/config/items');
const wieldable = require('@2003scape/rsc-data/wieldable');

// set of noteable item ids
const NOTEABLE = new Set(require('../sp/item-noteable.json'));

// { emptyID: filledID }
const REFILL_IDS = {
    // bucket
    21: 50,
    // jug
    140: 141,
    // bowl
    341: 342,
    // vial
    465: 464
};

// { filledID: emptyID }
const EMPTY_IDS = {};

for (const [emptyID, refilledID] of Object.entries(REFILL_IDS)) {
    EMPTY_IDS[refilledID] = +emptyID;
}

class Item {
    // noted flag; a note keeps its base item's def
    constructor({ id, amount = 1, equipped = false, noted = false }) {
        this.id = id;
        this.amount = amount;
        this.equipped = equipped;
        this.noted = !!noted;

        this.definition = items[this.id];

        if (!this.definition) {
            throw new RangeError(`invalid item id: ${this.id}`);
        }

        if (this.definition.equip && wieldable[this.id]) {
            this.definition.wieldable = wieldable[this.id];
        }
    }

    // notes stack like stackable items
    stacks() {
        return this.definition.stackable || this.noted;
    }

    toJSON() {
        const json = { id: this.id };

        if (this.stacks() || this.amount > 1) {
            json.amount = this.amount || 1;
        }

        if (this.equipped) {
            json.equipped = true;
        }

        if (this.noted) {
            json.noted = true;
        }

        return json;
    }

    static isNoteable(id) {
        return NOTEABLE.has(typeof id === 'number' ? id : id.id);
    }

    static getEmptyWater(item) {
        let fullID;

        if (typeof item === 'number') {
            fullID = item;
        } else {
            fullID = item.id;
        }

        return EMPTY_IDS[fullID];
    }

    static getFullWater(item) {
        let emptyID;

        if (typeof item === 'number') {
            emptyID = item;
        } else {
            emptyID = item.id;
        }

        return REFILL_IDS[emptyID];
    }
}

module.exports = Item;
