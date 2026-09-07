// dig site house furniture: bookcase, cupboard, both chests, climb-up ropes
//   bookcase (1090)                -> book of experimental chemistry
//   east cupboard (1074/1078)      -> open, then search -> a rock pick (once)
//   east chest (1104/1105)         -> open, then search -> a cracked rock sample, then closes
//   west chests (17/18, 5 of them) -> open / close / search (search finds nothing)
//   climb-up ropes (1097 small cave, 1098 big cave) -> climb to the surface
// the tent chest (1084/1085) is a different object and lives in chemistry.js.
// open/closed state is toggled with world.replaceEntity.

const { questsEnabled } = require('../../custom-gate.js');
const {
    HOUSE_BOOKCASE_ID,
    HOUSE_EAST_CUPBOARD_CLOSED_ID,
    HOUSE_EAST_CUPBOARD_OPEN_ID,
    HOUSE_EAST_CHEST_CLOSED_ID,
    HOUSE_EAST_CHEST_OPEN_ID,
    HOUSE_WEST_CHESTS_OPEN_ID,
    HOUSE_WEST_CHESTS_CLOSED_ID,
    CLIMB_UP_ROPE_SMALL_CAVE_ID,
    CLIMB_UP_ROPE_BIG_CAVE_ID,
    ROCK_PICK_ID,
    CRACKED_ROCK_SAMPLE_ID,
    BOOK_OF_EXPERIMENTAL_CHEMISTRY_ID
} = require('./constants.js');

function isClimbRope(id) {
    return id === CLIMB_UP_ROPE_SMALL_CAVE_ID || id === CLIMB_UP_ROPE_BIG_CAVE_ID;
}

function climbRope(player, gameObject) {
    player.message('You climb the ladder');
    if (gameObject.id === CLIMB_UP_ROPE_BIG_CAVE_ID) {
        player.teleport(25, 515);
    } else {
        player.teleport(14, 506);
    }
    return true;
}

// Command one ("Open" / primary) for the furniture.
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === HOUSE_BOOKCASE_ID) {
        player.message('You search through the bookcase');
        player.message('You find a book on chemicals');
        player.inventory.add(BOOK_OF_EXPERIMENTAL_CHEMISTRY_ID, 1);
        return true;
    }

    if (gameObject.id === HOUSE_EAST_CUPBOARD_CLOSED_ID) {
        player.world.replaceEntity(
            'gameObjects',
            gameObject,
            HOUSE_EAST_CUPBOARD_OPEN_ID
        );
        player.message('You open the cupboard');
        return true;
    }

    if (gameObject.id === HOUSE_EAST_CUPBOARD_OPEN_ID) {
        // search: rock pick once, else nothing
        if (!player.inventory.has(ROCK_PICK_ID)) {
            player.message('You find a rock pick');
            player.inventory.add(ROCK_PICK_ID, 1);
        } else {
            player.message('You find nothing of interest');
        }
        player.world.replaceEntity(
            'gameObjects',
            gameObject,
            HOUSE_EAST_CUPBOARD_CLOSED_ID
        );
        player.message('You close the cupboard');
        return true;
    }

    if (gameObject.id === HOUSE_EAST_CHEST_CLOSED_ID) {
        player.message('You open the chest');
        player.world.replaceEntity(
            'gameObjects',
            gameObject,
            HOUSE_EAST_CHEST_OPEN_ID
        );
        return true;
    }

    if (gameObject.id === HOUSE_EAST_CHEST_OPEN_ID) {
        // search: gives a cracked rock sample
        player.message('You search the chest');
        player.message('You find a rock sample');
        player.inventory.add(CRACKED_ROCK_SAMPLE_ID, 1);
        player.world.replaceEntity(
            'gameObjects',
            gameObject,
            HOUSE_EAST_CHEST_CLOSED_ID
        );
        return true;
    }

    if (isClimbRope(gameObject.id)) {
        return climbRope(player, gameObject);
    }

    if (
        gameObject.id === HOUSE_WEST_CHESTS_CLOSED_ID ||
        gameObject.id === HOUSE_WEST_CHESTS_OPEN_ID
    ) {
        // open on the closed chest, search on the open one
        if (gameObject.id === HOUSE_WEST_CHESTS_CLOSED_ID) {
            player.message('You open the chest');
            player.world.replaceEntity(
                'gameObjects',
                gameObject,
                HOUSE_WEST_CHESTS_OPEN_ID
            );
        } else {
            player.message('You search the chest, but find nothing');
        }
        return true;
    }

    return false;
}

// command two: close on the open west chest; climb a rope
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (isClimbRope(gameObject.id)) {
        return climbRope(player, gameObject);
    }

    if (gameObject.id === HOUSE_WEST_CHESTS_OPEN_ID) {
        player.message('You close the chest');
        player.world.replaceEntity(
            'gameObjects',
            gameObject,
            HOUSE_WEST_CHESTS_CLOSED_ID
        );
        return true;
    }

    return false;
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
