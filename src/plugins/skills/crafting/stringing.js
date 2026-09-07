const items = require('@2003scape/rsc-data/config/items');
const { stringing } = require('@2003scape/rsc-data/skills/crafting');
const { wantBatching } = require('../batch');

const BALL_OF_WOOL_ID = 207;
const UNSTRUNG_IDS = new Set(Object.keys(stringing).map(Number));

async function onUseWithInventory(player, item, target) {
    if (
        (item.id !== BALL_OF_WOOL_ID || !UNSTRUNG_IDS.has(target.id)) &&
        (!UNSTRUNG_IDS.has(item.id) || target.id !== BALL_OF_WOOL_ID)
    ) {
        return false;
    }

    const unstrungID = item.id === BALL_OF_WOOL_ID ? target.id : item.id;
    const strungID = stringing[unstrungID];
    const { world } = player;

    // repeat = min(balls of wool held, unstrung items held)
    const repeat = wantBatching(player)
        ? Math.min(
              player.inventory.items.filter(({ id }) => id === BALL_OF_WOOL_ID)
                  .length,
              player.inventory.items.filter(({ id }) => id === unstrungID).length
          )
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(BALL_OF_WOOL_ID) ||
            !player.inventory.has(unstrungID)
        ) {
            break;
        }

        player.inventory.remove(BALL_OF_WOOL_ID);
        player.inventory.remove(unstrungID);

        player.message(
            `You put some string on your ${items[unstrungID].name.toLowerCase()}`
        );

        player.inventory.add(strungID);

        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithInventory };
