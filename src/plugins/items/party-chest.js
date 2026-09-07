// party chests. deposit any item into either chest and, after a short random
// delay, it lands nearby as an ownerless ground item (visible to everyone, bots
// included) while everyone in range gets a quest-type line naming the dropper.
//
// neither chest is permanent map scenery; both are spawned/despawned by staff
// commands (see plugins/custom/staff-commands.js), which also sets the shared
// world.eventChest / world.eventChestRadius state this file reads.

const GroundItem = require('../../model/ground-item');

// default ground-item despawn: 200 ticks (matches world.js DROP_DISAPPEAR_TIMEOUT)
const TICK_INTERVAL = 640;
const DROP_DESPAWN_MS = TICK_INTERVAL * 200; // 128s

// event chest scenery ids (247 open crystal chest, 257 halloween cauldron);
// only acts as the party chest while it is world.eventChest
const EVENT_CHEST_IDS = new Set([257, 247]);

// seers chest sprites, anywhere in the hall
const SEERS_CHEST_IDS = new Set([17, 18]);

// seers party hall bounds (upstairs and downstairs)
const SEERS_UPSTAIRS = { minX: 490, minY: 1408, maxX: 500, maxY: 1415 };
const SEERS_DOWNSTAIRS = { minX: 490, minY: 464, maxX: 500, maxY: 471 };

function inBounds(x, y, b) {
    return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

function isSeersUpstairs(x, y) {
    return inBounds(x, y, SEERS_UPSTAIRS);
}

function isSeersDownstairs(x, y) {
    return inBounds(x, y, SEERS_DOWNSTAIRS);
}

// random 1000-5000 ms, inclusive both ends (not server ticks)
function randomDelayMs() {
    return 1000 + Math.floor(Math.random() * 4001);
}

// staff-name colour prefix for the drop announcement; lazily required to avoid
// a load-order dependency on staff-commands.js
function staffName(player) {
    try {
        return require('../custom/staff-commands').getStaffName(player);
    } catch (e) {
        return player.username;
    }
}

// drop-notification radius: a square box of radius*2 in each direction,
// checked against every player in the world
function isWithinEventChestRange(world, chest, radius, x, y) {
    return (
        chest.x + radius * 2 >= x &&
        chest.x - radius * 2 <= x &&
        chest.y + radius * 2 >= y &&
        chest.y - radius * 2 <= y
    );
}

// pick a random point until it lands on an unblocked tile
// (world.holidayDropBlocked is the obstacle-map check)
function findOpenTile(world, pick) {
    for (let attempts = 0; attempts < 200; attempts += 1) {
        const { x, y } = pick();

        if (!world.holidayDropBlocked(x, y)) {
            return { x, y };
        }
    }

    // whole radius walled off: fall back to the first point rather than loop forever
    return pick();
}

// drop item as an ownerless ground item at a point from pick(), after a random
// 1-5s delay; a fresh despawn timer, not a permanent spawn point
function scheduleDrop(world, item, pick) {
    world.setTimeout(() => {
        const { x, y } = findOpenTile(world, pick);
        const groundItem = new GroundItem(world, {
            id: item.id,
            amount: item.amount,
            x,
            y
        });

        world.addEntity('groundItems', groundItem);

        world.setTimeout(() => {
            if (world.groundItems.entities[groundItem.index] === groundItem) {
                world.removeEntity('groundItems', groundItem);
            }
        }, DROP_DESPAWN_MS);
    }, randomDelayMs());
}

function itemDropText(item) {
    const name = item.definition.name;

    return item.amount > 1
        ? `${name} @whi@(${item.amount.toLocaleString('en-US')})`
        : name;
}

async function onUseWithGameObject(player, gameObject, item) {
    const { world } = player;

    // event chest
    if (
        EVENT_CHEST_IDS.has(gameObject.id) &&
        gameObject === world.eventChest
    ) {
        if (item.definition.untradeable && !player.isAdministrator()) {
            return false;
        }

        if (!player.inventory.has(item.id, item.amount)) {
            return false;
        }

        player.inventory.remove(item);
        player.message('@que@You place the item into the chest...');

        const radius = world.eventChestRadius || 4;
        const { x: chestX, y: chestY } = gameObject;

        for (const p of world.players.getAll()) {
            if (
                isWithinEventChestRange(world, gameObject, radius, p.x, p.y)
            ) {
                p.message(
                    `@que@${staffName(player)}@whi@ just dropped: ` +
                        `@gre@${itemDropText(item)}`
                );
            }
        }

        scheduleDrop(world, item, () => ({
            x: chestX + Math.floor(Math.random() * radius),
            y: chestY + Math.floor(Math.random() * radius)
        }));

        return true;
    }

    // seers chest
    if (SEERS_CHEST_IDS.has(gameObject.id)) {
        const upstairs = isSeersUpstairs(player.x, player.y);
        const downstairs = isSeersDownstairs(player.x, player.y);

        if (!upstairs && !downstairs) {
            return false;
        }

        if (item.definition.untradeable && !player.isAdministrator()) {
            return false;
        }

        if (!player.inventory.has(item.id, item.amount)) {
            return false;
        }

        player.inventory.remove(item);
        player.message('@que@You place the item into the chest...');

        for (const p of world.players.getAll()) {
            if (
                (upstairs && isSeersUpstairs(p.x, p.y)) ||
                (downstairs && isSeersDownstairs(p.x, p.y))
            ) {
                p.message(
                    `@que@${staffName(player)}@whi@ just dropped: ` +
                        `@gre@${itemDropText(item)}`
                );
            }
        }

        scheduleDrop(world, item, () =>
            upstairs
                ? {
                      x: SEERS_UPSTAIRS.minX + Math.floor(Math.random() * 11),
                      y: SEERS_UPSTAIRS.minY + Math.floor(Math.random() * 8)
                  }
                : {
                      x:
                          SEERS_DOWNSTAIRS.minX +
                          Math.floor(Math.random() * 11),
                      y: SEERS_DOWNSTAIRS.minY + Math.floor(Math.random() * 8)
                  }
        );

        return true;
    }

    return false;
}

module.exports = { onUseWithGameObject };
