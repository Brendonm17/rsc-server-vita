const { getQOLConfig, IronmanMode } = require('../model/qol-config');

async function appearance({ player }, message) {
    player.unlock();
    player.interfaceOpen.appearance = false;

    // a disabled class/ironman world forces the creation choice back to its default server-side
    const qol = getQOLConfig(
        player.world && player.world.server ? player.world.server.config : null
    );

    if (!qol.usesClasses && typeof message.chosenClass === 'number') {
        message.chosenClass = 0; // adventurer is the no-class default
    }

    // -1 means the packet carried no ironman mode; only act when >= 0
    if (
        !qol.spawnIronMan &&
        typeof message.ironmanMode === 'number' &&
        message.ironmanMode >= 0
    ) {
        message.ironmanMode = IronmanMode.None;
    }

    // game mode, one-xp toggle, and chosen class are applied on first login only
    player.applyCharacterCreation(message);

    player.setAppearance(message);
    player.broadcastPlayerAppearance();

    player.localEntities.characterUpdates.playerAppearances.push(
        player.getAppearanceUpdate()
    );

    delete player.cache.sendAppearance;
}

module.exports = { appearance };
