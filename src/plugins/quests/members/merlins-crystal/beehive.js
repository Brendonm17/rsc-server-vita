// squirt repellant on hive, then bucket collects wax

const { questsEnabled } = require('../../custom-gate.js');
const {
    BEEHIVE_TYPE,
    INSECT_REPELLANT_ID,
    BUCKET_ID,
    WAX_BUCKET_ID
} = require('./ids.js');

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== BEEHIVE_TYPE) {
        return false;
    }

    const { world } = player;

    if (item.id === INSECT_REPELLANT_ID) {
        player.message('@que@you squirt insect repellant on the beehive');
        await world.sleepTicks(3);
        player.message('@que@You see bees leaving the hive');
        await world.sleepTicks(3);

        if (!('squirt' in player.cache)) {
            player.cache.squirt = true;
        }

        return true;
    } else if (item.id === BUCKET_ID) {
        player.message('@que@You try to get some wax from the beehive');
        await world.sleepTicks(3);

        if ('squirt' in player.cache) {
            player.message('@que@You get some wax from the hive');
            await world.sleepTicks(3);
            player.message(
                '@que@The bees fly back to the hive as the repellant wears off'
            );
            await world.sleepTicks(3);

            player.inventory.remove(BUCKET_ID);
            player.inventory.add(WAX_BUCKET_ID, 1);
            delete player.cache.squirt;
        } else {
            player.message('Suddenly bees fly out of the hive and sting you');
            player.damage(2);
        }

        return true;
    }

    return false;
}

module.exports = { onUseWithGameObject };
