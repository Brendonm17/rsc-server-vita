const Entity = require('./entity');
const items = require('@2003scape/rsc-data/config/items');

class GroundItem extends Entity {
    // dropped item: id, amount, and whether it lies there as a note
    constructor(world, { id, amount = 1, respawn, x, y, noted = false }) {
        super(world);

        this.id = id;
        this.amount = amount;
        this.respawn = respawn;
        this.x = x;
        this.y = y;
        this.noted = !!noted;

        this.definition = items[id];

        if (!this.definition) {
            throw new RangeError(`invalid item id ${this.id}`);
        }
    }
}

module.exports = GroundItem;
