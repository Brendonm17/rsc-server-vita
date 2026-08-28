// cook seaweed on fire/range -> soda ash (622 -> 624); no level/xp/burn

const { wantBatching } = require('../batch');

const SEAWEED_ID = 622;
const SODA_ASH_ID = 624;

const COOK_OBJECT_IDS = new Set([11, 97, 119, 274, 435, 491]);

// count of an item held (stackable sums amount, else rows)
function countHeld(player, id) {
    let count = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            count += item.definition.stackable ? item.amount : 1;
        }
    }

    return count;
}

// batching: once per seaweed held; flag off -> 1
async function onUseWithGameObject(player, gameObject, item) {
    if (!COOK_OBJECT_IDS.has(gameObject.id) || item.id !== SEAWEED_ID) {
        return false;
    }

    const { world } = player;
    const objectName = gameObject.definition.name.toLowerCase();

    const repeat = wantBatching(player) ? countHeld(player, SEAWEED_ID) : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(SEAWEED_ID)) {
            break;
        }

        player.sendBubble(SEAWEED_ID);
        player.sendSound('cooking');
        player.message(`You put the seaweed on the ${objectName}`);
        player.message('The seaweed burns to ashes');

        player.inventory.remove(SEAWEED_ID);
        player.inventory.add(SODA_ASH_ID);

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithGameObject };
