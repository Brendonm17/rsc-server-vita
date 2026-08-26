// dwarf multicannon: assemble, disassemble, and fire mechanics

const GameObject = require('../../model/game-object');
const {
    CANNON_BASE_ID,
    CANNON_STAND_ID,
    CANNON_BARRELS_ID,
    CANNON_FURNACE_ID,
    CANNON_BALL_ID,
    OBJ_BASE,
    OBJ_STAND,
    OBJ_BARRELS,
    OBJ_COMPLETE,
    setOwner,
    getOwner,
    isOwner,
    clearCannonCache
} = require('./dwarf-cannon-shared');

// FireCannonEvent.java
const MAX_DISTANCE = 8;
const MAX_SHOTS = 20;

function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// pickup/disassemble: return accumulated items, clear ownership

function pickupBase(player, gameObject) {
    player.message('you pick up the cannon');
    player.message("it's really heavy");
    player.inventory.add(CANNON_BASE_ID, 1);
    player.world.removeEntity('gameObjects', gameObject);
    clearCannonCache(player);
}

function pickupStand(player, gameObject) {
    player.message('you pick up the cannon');
    player.message("it's really heavy");
    player.inventory.add(CANNON_BASE_ID, 1);
    player.inventory.add(CANNON_STAND_ID, 1);
    player.world.removeEntity('gameObjects', gameObject);
    clearCannonCache(player);
}

function pickupBarrels(player, gameObject) {
    // picking up barrels prints "you pick up the cannon base"
    player.message('you pick up the cannon base');
    player.message("it's really heavy");
    player.inventory.add(CANNON_BASE_ID, 1);
    player.inventory.add(CANNON_STAND_ID, 1);
    player.inventory.add(CANNON_BARRELS_ID, 1);
    player.world.removeEntity('gameObjects', gameObject);
    clearCannonCache(player);
}

function pickupCannon(player, gameObject) {
    player.message('you pick up the cannon');
    player.message("it's really heavy");
    player.inventory.add(CANNON_BASE_ID, 1);
    player.inventory.add(CANNON_STAND_ID, 1);
    player.inventory.add(CANNON_BARRELS_ID, 1);
    player.inventory.add(CANNON_FURNACE_ID, 1);
    player.world.removeEntity('gameObjects', gameObject);
    clearCannonCache(player);
}

// assemble: consume part, advance stage, carry ownership forward

function replaceCannonObject(player, oldObject, newId) {
    const { world } = player;
    const { x, y } = oldObject;

    world.removeEntity('gameObjects', oldObject);

    const newObject = new GameObject(world, { id: newId, x, y, direction: 0 });
    world.addEntity('gameObjects', newObject);
    setOwner(newObject, player.username);

    return newObject;
}

function addCannonStand(player, item, gameObject) {
    if (item.id === CANNON_STAND_ID && gameObject.id === OBJ_BASE) {
        if (!player.inventory.has(CANNON_STAND_ID)) {
            return;
        }

        player.inventory.remove(CANNON_STAND_ID, 1);
        player.message('you add the stand');

        player.cache.cannon_stage = 2;
        replaceCannonObject(player, gameObject, OBJ_STAND);
    } else {
        player.message("these parts don't seem to fit together");
    }
}

function addCannonBarrels(player, item, gameObject) {
    if (item.id === CANNON_BARRELS_ID && gameObject.id === OBJ_STAND) {
        if (!player.inventory.has(CANNON_BARRELS_ID)) {
            return;
        }

        player.inventory.remove(CANNON_BARRELS_ID, 1);
        player.message('you add the barrels');

        replaceCannonObject(player, gameObject, OBJ_BARRELS);
        player.cache.cannon_stage = 3;
    } else {
        player.message("these parts don't seem to fit together");
    }
}

function addCannonFurnace(player, item, gameObject) {
    if (item.id === CANNON_FURNACE_ID && gameObject.id === OBJ_BARRELS) {
        if (!player.inventory.has(CANNON_FURNACE_ID)) {
            return;
        }

        player.inventory.remove(CANNON_FURNACE_ID, 1);
        player.message('you add the furnace');

        replaceCannonObject(player, gameObject, OBJ_COMPLETE);
        player.cache.cannon_stage = 4;
    } else {
        player.message("these parts don't seem to fit together");
    }
}

// fire event: up to max shots per tick at the clockwise-nearest target

// sorts targets by clockwise angle from north, then distance
function clockwiseCompare(centerX, centerY, a, b) {
    const adx = a.x - centerX;
    const ady = a.y - centerY;
    const bdx = b.x - centerX;
    const bdy = b.y - centerY;

    if (adx < 0 && bdx >= 0) return -1;
    if (adx >= 0 && bdx < 0) return 1;

    if (adx === 0 && bdx === 0) {
        if (ady >= 0 || bdy >= 0) return a.y - b.y;
        return b.y - a.y;
    }

    const det = adx * bdy - bdx * ady;

    if (det < 0) return -1;
    if (det > 0) return 1;

    const d1 = adx * adx + ady * ady;
    const d2 = bdx * bdx + bdy * bdy;

    return d1 - d2;
}

// target must be attackable, alive, in range of the cannon, unobstructed
function isValidTarget(cannonPoint, npc) {
    if (!npc.definition.hostility) {
        return false;
    }

    if (npc.skills.hits.current <= 0) {
        return false;
    }

    const dx = Math.abs(npc.x - cannonPoint.x);
    const dy = Math.abs(npc.y - cannonPoint.y);

    if (dx > MAX_DISTANCE || dy > MAX_DISTANCE) {
        return false;
    }

    return cannonPoint.withinLineOfSight(npc, true);
}

// tracks whether a player's cannon fire event is active
function fireCannon(player, gameObject) {
    if (player.cannonEvent) {
        return;
    }

    const { world } = player;
    let shots = 0;

    const tick = () => {
        // cannon picked up / disassembled mid-fire -> stop.
        if (world.gameObjects.getByIndex(gameObject.index) !== gameObject) {
            player.cannonEvent = null;
            return;
        }

        shots += 1;

        if (shots >= MAX_SHOTS) {
            player.cannonEvent = null;
            return;
        }

        if (!player.inventory.has(CANNON_BALL_ID)) {
            player.message("you're out of ammo");
            player.cannonEvent = null;
            return;
        }

        player.message('searching for targets');

        const validTargets = world.npcs
            .getInArea(gameObject.x, gameObject.y, MAX_DISTANCE * 2)
            .filter((npc) => isValidTarget(gameObject, npc));

        if (validTargets.length === 0) {
            player.message('there are no available creatures to target');
            player.cannonEvent = null;
            return;
        }

        player.inventory.remove(CANNON_BALL_ID, 1);

        validTargets.sort((a, b) =>
            clockwiseCompare(gameObject.x, gameObject.y, a, b)
        );

        const target = validTargets[0];

        // max hit 35 at level 99: (rangedBase / 3) + 2, uniform roll
        const maxHit = Math.floor(player.skills.ranged.base / 3) + 2;
        const damage = random(0, maxHit);

        player.sendProjectile(target, 5);
        target.damage(damage, player);
        player.sendSound('shoot');

        player.cannonEvent = world.setTickTimeout(tick, 1);
    };

    player.cannonEvent = world.setTickTimeout(tick, 1);
}

// command slot one: fire on the complete cannon, pick up otherwise

async function onGameObjectCommandOne(player, gameObject) {
    const { id } = gameObject;

    if (id !== OBJ_BASE && id !== OBJ_STAND && id !== OBJ_BARRELS && id !== OBJ_COMPLETE) {
        return false;
    }

    if (id === OBJ_COMPLETE) {
        // "fire"
        if (!isOwner(player, gameObject)) {
            player.message("you can't fire this cannon...");
            await player.world.sleepTicks(3);
            player.message("...it doesn't belong to you");
            return true;
        }

        if (!player.inventory.has(CANNON_BALL_ID)) {
            player.message("you're out of ammo");
            return true;
        }

        fireCannon(player, gameObject);
        return true;
    }

    // 946/947/948 "pick up"
    if (!isOwner(player, gameObject)) {
        player.message("you can't pick that up, the owners still around");
        return true;
    }

    if (player.isTired()) {
        player.message('you arms are too tired to pick it up');
        return true;
    }

    if (id === OBJ_BASE) {
        pickupBase(player, gameObject);
    } else if (id === OBJ_STAND) {
        pickupStand(player, gameObject);
    } else if (id === OBJ_BARRELS) {
        pickupBarrels(player, gameObject);
    }

    return true;
}

// command slot two: pick up on the complete cannon

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== OBJ_COMPLETE) {
        return false;
    }

    // "pick up" on the assembled cannon
    if (!isOwner(player, gameObject)) {
        player.message("you can't pick that up, the owners still around");
        return true;
    }

    if (player.isTired()) {
        player.message('you arms are too tired to pick it up');
        return true;
    }

    pickupCannon(player, gameObject);
    return true;
}

// assembling the next stage, or auto-load message when using a ball

async function onUseWithGameObject(player, gameObject, item) {
    const { id } = gameObject;

    if (id !== OBJ_BASE && id !== OBJ_STAND && id !== OBJ_BARRELS && id !== OBJ_COMPLETE) {
        return false;
    }

    if (id === OBJ_BASE) {
        if (!isOwner(player, gameObject)) {
            player.message('you can only add this stand to your own base');
            return true;
        }

        addCannonStand(player, item, gameObject);
        return true;
    }

    if (id === OBJ_STAND) {
        if (!isOwner(player, gameObject)) {
            player.message('you can only add the barrels to your own cannon');
            return true;
        }

        addCannonBarrels(player, item, gameObject);
        return true;
    }

    if (id === OBJ_BARRELS) {
        if (!isOwner(player, gameObject)) {
            player.message('you can only add the furnace to your own cannon');
            return true;
        }

        addCannonFurnace(player, item, gameObject);
        return true;
    }

    if (id === OBJ_COMPLETE && item.id === CANNON_BALL_ID) {
        player.message('the cannon loads automatically');
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    // exported for the standalone harness
    _internal: {
        isValidTarget,
        clockwiseCompare,
        MAX_DISTANCE,
        MAX_SHOTS,
        replaceCannonObject
    }
};
