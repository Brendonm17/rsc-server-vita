const FLAX_GROUND_ID = 313;
const FLAX_ID = 675;

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== FLAX_GROUND_ID) {
        return false;
    }

    player.inventory.add(FLAX_ID);
    player.message('You uproot a flax plant');
    player.sendSound('potato');
    return true;
}

module.exports = { onGameObjectCommandTwo };
