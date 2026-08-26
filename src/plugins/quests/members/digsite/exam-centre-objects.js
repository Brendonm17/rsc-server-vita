// dig site house and exam-centre furniture searches

const { questsEnabled } = require('../../custom-gate.js');
const {
    HOUSE_BOOKCASE_TYPE,
    HOUSE_EAST_CUPBOARD_TYPE,
    HOUSE_EAST_CHEST_TYPE,
    ROCK_PICK_ID,
    CRACKED_ROCK_SAMPLE_ID,
    UNIDENTIFIED_POWDER_ID,
    BOOK_OF_EXPERIMENTAL_CHEMISTRY_ID
} = require('./constants.js');

// Command one ("Open" / primary) for the furniture.
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === HOUSE_BOOKCASE_TYPE) {
        player.message('You search through the bookcase');
        player.message('You find a book on chemicals');
        player.inventory.add(BOOK_OF_EXPERIMENTAL_CHEMISTRY_ID, 1);
        return true;
    }

    // chests: east house gives a rock sample, tent chest gives powder
    if (gameObject.id === HOUSE_EAST_CHEST_TYPE) {
        if (player.cache.digsite_tentchest_open === true) {
            player.message('You search the chest');
            player.message('You find some unusual powder inside...');
            player.inventory.add(UNIDENTIFIED_POWDER_ID, 1);
            delete player.cache.digsite_tentchest_open;
            return true;
        }
        player.message('You open the chest');
        player.message('You search the chest');
        player.message('You find a rock sample');
        player.inventory.add(CRACKED_ROCK_SAMPLE_ID, 1);
        return true;
    }

    if (gameObject.id === HOUSE_EAST_CUPBOARD_TYPE) {
        if (!player.inventory.has(ROCK_PICK_ID)) {
            player.message('You find a rock pick');
            player.inventory.add(ROCK_PICK_ID, 1);
        } else {
            player.message('You find nothing of interest');
        }
        return true;
    }

    return false;
}

// Command two ("Search" secondary) - west-house chests give nothing.
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === HOUSE_EAST_CHEST_TYPE) {
        player.message('You search the chest, but find nothing');
        return true;
    }

    return false;
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
