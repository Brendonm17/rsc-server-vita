async function sleepWord({ player }, { sleepWord }) {
    if (!player.interfaceOpen.sleep) {
        return;
    }

    const { world } = player;

    // request a new one
    if (sleepWord === '-null-') {
        if (Date.now() - player.lastSleepWord < 1000) {
            return;
        }

        // stamp the debounce timestamp so re-request spam is actually rate-limited
        player.lastSleepWord = Date.now();

        // preserve the sleep source instead of hardcoding false on re-request
        player.openSleep(player.sleepBed);
    } else {
        if (player.sleepWord === sleepWord) {
            player.exitSleep(true);
        } else {
            player.sendSleepIncorrect();
            await world.sleepTicks(1);
            // preserve which sleep source was used on retry
            player.openSleep(player.sleepBed);
        }
    }
}

module.exports = { sleepWord };
