// crude bed (1035/1162) sleeps at the worse sleeping-bag rate; other beds use the full bed rate
const CRUDE_BED_IDS = new Set([1035, 1162]);

async function onGameObjectCommandOne(player, gameObject) {
    if (!/sleep|rest|lie in/i.test(gameObject.definition.commands[0])) {
        return false;
    }

    player.displayFatigue = player.fatigue;
    player.openSleep(!CRUDE_BED_IDS.has(gameObject.id));

    return true;
}

module.exports = { onGameObjectCommandOne };
