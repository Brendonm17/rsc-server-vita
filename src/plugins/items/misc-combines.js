// item-combine recipes with no other home: goblin armour + orange/blue dye ->
// dyed armour; dragon square halves -> anvil hint; blamish oil + rod -> oily rod

const GOBLIN_ARMOUR_ID = 273;
const ORANGE_GOBLIN_ARMOUR_ID = 274;
const BLUE_GOBLIN_ARMOUR_ID = 275;
const ORANGEDYE_ID = 282;
const BLUEDYE_ID = 272;

const RIGHT_HALF_DRAGON_SQUARE_SHIELD_ID = 1276;
const LEFT_HALF_DRAGON_SQUARE_SHIELD_ID = 1277;

const BLAMISH_OIL_ID = 588;
const FISHING_ROD_ID = 377;
const OILY_FISHING_ROD_ID = 589;

async function onUseWithInventory(player, item, target) {
    const ids = [item.id, target.id];

    if (ids.includes(GOBLIN_ARMOUR_ID) && ids.includes(ORANGEDYE_ID)) {
        player.inventory.remove(ORANGEDYE_ID);
        player.inventory.remove(GOBLIN_ARMOUR_ID);
        player.inventory.add(ORANGE_GOBLIN_ARMOUR_ID);
        player.message('You dye the goblin armour Orange');

        return true;
    }

    if (ids.includes(GOBLIN_ARMOUR_ID) && ids.includes(BLUEDYE_ID)) {
        player.inventory.remove(BLUEDYE_ID);
        player.inventory.remove(GOBLIN_ARMOUR_ID);
        player.inventory.add(BLUE_GOBLIN_ARMOUR_ID);
        player.message('You dye the goblin armour blue');

        return true;
    }

    if (
        ids.includes(RIGHT_HALF_DRAGON_SQUARE_SHIELD_ID) &&
        ids.includes(LEFT_HALF_DRAGON_SQUARE_SHIELD_ID)
    ) {
        player.message('You need an anvil and a hammer to repair the shield');

        return true;
    }

    if (ids.includes(BLAMISH_OIL_ID) && ids.includes(FISHING_ROD_ID)) {
        player.inventory.remove(BLAMISH_OIL_ID);
        player.inventory.remove(FISHING_ROD_ID);
        player.message('You rub the oil onto the fishing rod');
        player.inventory.add(OILY_FISHING_ROD_ID);

        return true;
    }

    return false;
}

module.exports = { onUseWithInventory };
