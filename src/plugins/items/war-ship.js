// war ship: plays three flavour-text lines with a 3-tick pause between each, not
// consumed.

const WAR_SHIP_ID = 920;

async function onInventoryCommand(player, item) {
    if (item.id !== WAR_SHIP_ID) {
        return false;
    }

    const { world } = player;

    player.message('@que@you pretend to sail the ship across the floor');
    await world.sleepTicks(3);

    player.message('@que@you soon become very bored');
    await world.sleepTicks(3);

    player.message('@que@and realise you look quite silly');
    await world.sleepTicks(3);

    return true;
}

module.exports = { onInventoryCommand };
