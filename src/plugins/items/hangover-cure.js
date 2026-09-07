// milk + chocolate dust makes chocolaty milk; chocolaty milk + snape grass
// makes a hangover cure (needed for plague city stage 9)

const MILK_ID = 22;
const CHOCOLATE_DUST_ID = 772;
const CHOCOLATY_MILK_ID = 770;
const SNAPE_GRASS_ID = 469;
const HANGOVER_CURE_ID = 771;

async function onUseWithInventory(player, item, target) {
    const ids = [item.id, target.id];

    if (ids.includes(MILK_ID) && ids.includes(CHOCOLATE_DUST_ID)) {
        player.inventory.remove(MILK_ID);
        player.inventory.remove(CHOCOLATE_DUST_ID);
        player.message('You mix the chocolate into the bucket');
        player.inventory.add(CHOCOLATY_MILK_ID);

        return true;
    }

    if (ids.includes(CHOCOLATY_MILK_ID) && ids.includes(SNAPE_GRASS_ID)) {
        player.inventory.remove(CHOCOLATY_MILK_ID);
        player.inventory.remove(SNAPE_GRASS_ID);
        player.message('You mix the snape grass into the bucket');
        player.inventory.add(HANGOVER_CURE_ID);

        return true;
    }

    return false;
}

module.exports = { onUseWithInventory };
