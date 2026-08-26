// searching reveals magic words, sets magic_words flag

const { questsEnabled } = require('../../custom-gate.js');
const { ALTAR_TYPE, ALTAR_X, ALTAR_Y } = require('./ids.js');

async function searchAltar(player) {
    const { world } = player;

    player.message(
        '@que@You find a small inscription at the bottom of the altar'
    );
    await world.sleepTicks(3);
    player.message('@que@It reads Snarthon Candtrick Termanto');
    await world.sleepTicks(3);

    if (!('magic_words' in player.cache)) {
        player.cache.magic_words = true;
    }
}

async function handle(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        gameObject.id !== ALTAR_TYPE ||
        gameObject.x !== ALTAR_X ||
        gameObject.y !== ALTAR_Y
    ) {
        return false;
    }

    await searchAltar(player);
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    return await handle(player, gameObject);
}

async function onGameObjectCommandTwo(player, gameObject) {
    return await handle(player, gameObject);
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
