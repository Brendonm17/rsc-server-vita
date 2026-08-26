// dwarf multicannon: shared ids, ownership tracking, fire loop

const CANNON_BASE_ID = 1032;
const CANNON_STAND_ID = 1033;
const CANNON_BARRELS_ID = 1034;
const CANNON_FURNACE_ID = 1035;
const CANNON_BALL_ID = 1041;

const OBJ_BASE = 946;
const OBJ_STAND = 947;
const OBJ_BARRELS = 948;
const OBJ_COMPLETE = 943;

// Point.inDwarfArea() - exact port of the rectangular bounds check.
function inDwarfArea(player) {
    return player.x >= 240 && player.x <= 309 && player.y >= 432 && player.y <= 527;
}

// no cannon spawns in the kbd lair
function inKbdLair(player) {
    return player.x >= 562 && player.x <= 572 && player.y >= 3314 && player.y <= 3332;
}

// cannon may only be placed once dwarf cannon quest is complete
function questComplete(player) {
    return player.questStages.dwarfCannon === -1;
}

// maps spawned cannon object to owning player's username
const owners = new WeakMap();

function setOwner(gameObject, username) {
    owners.set(gameObject, username);
}

function getOwner(gameObject) {
    return owners.get(gameObject);
}

function isOwner(player, gameObject) {
    return owners.get(gameObject) === player.username;
}

// per-player cache: has_cannon, cannon_x, cannon_y, cannon_stage
function clearCannonCache(player) {
    delete player.cache.has_cannon;
    delete player.cache.cannon_stage;
    delete player.cache.cannon_x;
    delete player.cache.cannon_y;
}

module.exports = {
    CANNON_BASE_ID,
    CANNON_STAND_ID,
    CANNON_BARRELS_ID,
    CANNON_FURNACE_ID,
    CANNON_BALL_ID,
    OBJ_BASE,
    OBJ_STAND,
    OBJ_BARRELS,
    OBJ_COMPLETE,
    inDwarfArea,
    inKbdLair,
    questComplete,
    setOwner,
    getOwner,
    isOwner,
    clearCannonCache
};
