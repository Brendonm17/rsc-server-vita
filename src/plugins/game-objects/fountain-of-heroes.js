// https://classic.runescape.wiki/w/Fountain_of_Heroes
// dip a dragonstone amulet in the fountain to charge it; repeats per amulet held

const FOUNTAIN_OF_HEROES_ID = 282;
const DRAGONSTONE_AMULET_ID = 522;
const CHARGED_DRAGONSTONE_AMULET_ID = 597;

async function onUseWithGameObject(player, gameObject, item) {
    if (
        gameObject.id !== FOUNTAIN_OF_HEROES_ID ||
        item.id !== DRAGONSTONE_AMULET_ID
    ) {
        return false;
    }

    const { world } = player;

    const repeat = player.inventory.items.filter(
        ({ id }) => id === DRAGONSTONE_AMULET_ID
    ).length;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(DRAGONSTONE_AMULET_ID)) {
            break;
        }

        player.message('You dip the amulet in the fountain');
        await world.sleepTicks(2);

        player.inventory.remove(DRAGONSTONE_AMULET_ID);
        player.inventory.add(CHARGED_DRAGONSTONE_AMULET_ID);

        player.message('@que@You feel more power emanating from it than before');
        await world.sleepTicks(3);
        player.message('@que@you can now rub this amulet to teleport');
        await world.sleepTicks(3);
        player.message(
            '@que@Though using it to much means you will need to recharge it'
        );
        await world.sleepTicks(3);
        player.message(
            'It now also means you can find more gems when mining'
        );
    }

    return true;
}

module.exports = { onUseWithGameObject };
