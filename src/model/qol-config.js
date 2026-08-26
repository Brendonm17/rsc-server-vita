
// resolve a boolean config flag with a default fallback
function flag(config, key, spDefault) {
    if (config && Object.prototype.hasOwnProperty.call(config, key)) {
        return !!config[key];
    }

    return spDefault;
}

function getQOLConfig(config) {
    return {
        wantCustomBanks: flag(config, 'wantCustomBanks', true),
        wantBankNotes: flag(config, 'wantBankNotes', false),
        wantCertDeposit: flag(config, 'wantCertDeposit', true),
        wantCerterBankExchange: flag(config, 'wantCerterBankExchange', true),
        wantDecanting: flag(config, 'wantDecanting', true),
        wantDropX: flag(config, 'wantDropX', true),
        wantKeyboardShortcuts: flag(config, 'wantKeyboardShortcuts', true),
        wantBankPresets: flag(config, 'wantBankPresets', false),
        wantEquipmentTab: flag(config, 'wantEquipmentTab', false),
        // poison-npcs flag defaults off, unlike the solo-qol flags
        wantPoisonNpcs: flag(config, 'wantPoisonNpcs', false),
        // off by default: new characters spawn at Lumbridge, not Tutorial Island
        tutorialIsland: flag(config, 'tutorialIsland', false),
        // gate the class and ironman-mode character-creation selectors
        usesClasses: flag(config, 'usesClasses', true),
        spawnIronMan: flag(config, 'spawnIronMan', true)
    };
}

// ironman modes: None, Ironman, Ultimate, Hardcore, Transfer
const { IronmanMode } = require('./game-modes');

// read the player's ironman mode, defaulting to None
function getIronmanMode(player) {
    if (typeof player.getIronMan === 'function') {
        return player.getIronMan() | 0;
    }

    // name used by player.js (playerData.ironManMode)
    if (typeof player.ironManMode === 'number') {
        return player.ironManMode;
    }

    if (typeof player.ironmanMode === 'number') {
        return player.ironmanMode;
    }

    if (typeof player.ironman === 'number') {
        return player.ironman;
    }

    return IronmanMode.None;
}

// true if the player is in ultimate ironman mode
function isUltimateIronman(player) {
    if (typeof player.isIronMan === 'function') {
        return !!player.isIronMan(IronmanMode.Ultimate);
    }

    return getIronmanMode(player) === IronmanMode.Ultimate;
}

module.exports = {
    getQOLConfig,
    flag,
    IronmanMode,
    getIronmanMode,
    isUltimateIronman
};
