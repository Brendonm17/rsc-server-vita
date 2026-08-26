// swamp tar+flour->paste; paste+fire->cooked; broken glass+damp sticks->dry sticks; dry sticks+torch->lit torch

const { questsEnabled } = require('../../custom-gate.js');
const {
    FLOUR_ID,
    SWAMP_TAR_ID,
    UNCOOKED_SWAMP_PASTE_ID,
    SWAMP_PASTE_ID,
    DAMP_STICKS_ID,
    DRY_STICKS_ID,
    BROKEN_GLASS_ID,
    UNLIT_TORCH_ID,
    LIT_TORCH_ID,
    FIRE_ID,
    FIREMAKING_LEVEL_REQUIRED
} = require('./ids.js');

// combine two inventory items (order-independent)
function matches(item1, item2, a, b) {
    return (
        (item1.id === a && item2.id === b) ||
        (item1.id === b && item2.id === a)
    );
}

async function lightTorch(player) {
    if (player.skills.firemaking.current < FIREMAKING_LEVEL_REQUIRED) {
        player.message(
            'You need a firemaking level of ' +
                FIREMAKING_LEVEL_REQUIRED +
                ' to light the torch this way'
        );
        return true;
    }

    player.message('You rub the dry sticks together');
    await player.world.sleepTicks(2);

    player.inventory.remove(DRY_STICKS_ID);
    player.inventory.remove(UNLIT_TORCH_ID);
    player.inventory.add(LIT_TORCH_ID, 1);
    player.cache.seaSlugLitTorch = true;

    player.message("i've managed to light the torch");
    return true;
}

async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) {
        return false;
    }

    // swamp tar + flour -> uncooked swamp paste
    if (matches(item1, item2, SWAMP_TAR_ID, FLOUR_ID)) {
        player.inventory.remove(SWAMP_TAR_ID);
        player.inventory.remove(FLOUR_ID);
        player.inventory.add(UNCOOKED_SWAMP_PASTE_ID, 1);
        player.message('You mix the swamp tar with the flour');
        player.message('You now need to heat it over a fire');
        return true;
    }

    // broken glass + damp sticks -> dry sticks
    if (matches(item1, item2, BROKEN_GLASS_ID, DAMP_STICKS_ID)) {
        player.inventory.remove(DAMP_STICKS_ID);
        player.message('You use the broken glass to scrape the sticks dry');
        player.inventory.add(DRY_STICKS_ID, 1);
        return true;
    }

    // dry sticks + unlit torch -> rub together to light the torch
    if (matches(item1, item2, DRY_STICKS_ID, UNLIT_TORCH_ID)) {
        return await lightTorch(player);
    }

    return false;
}

// heat the uncooked swamp paste over a fire to finish it.
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== FIRE_ID || item.id !== UNCOOKED_SWAMP_PASTE_ID) {
        return false;
    }

    player.inventory.remove(UNCOOKED_SWAMP_PASTE_ID);
    player.message('You heat the paste over the fire');
    player.inventory.add(SWAMP_PASTE_ID, 1);
    player.message('You now have some swamp paste');
    return true;
}

module.exports = {
    onUseWithInventory,
    onUseWithGameObject
};
