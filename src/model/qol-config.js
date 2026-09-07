// quality-of-life feature flags, resolved from server config. a world may
// override any of these via config.json.
//
// config.json key         -> single-player default
//   wantCustomBanks          true
//   wantBankNotes            true
//   wantCertDeposit          true
//   wantCerterBankExchange   true
//   wantDecanting            true
//   wantDropX                true
//   wantKeyboardShortcuts    true
//   wantBankPresets          false (no equipment tab)
//   wantEquipmentTab         false (no equipment tab in mudclient204)
//   wantPoisonNpcs           false (gates poisoned ammo/weapons poisoning NPCs)
//   wantEnchantedCrowns      true  (read directly by enchanted-crowns.js)
//   tutorialIsland           false (new characters spawn on Tutorial Island)
//   usesClasses              true  (gates the creation Class selector)
//   spawnIronMan             true  (gates the creation Mode selector)

// resolve a boolean config flag, honouring an explicit false but falling back
// to the given single-player default when the key is absent
function flag(config, key, spDefault) {
    if (config && Object.prototype.hasOwnProperty.call(config, key)) {
        return !!config[key];
    }

    return spDefault;
}

function getQOLConfig(config) {
    return {
        wantCustomBanks: flag(config, 'wantCustomBanks', true),
        wantBankNotes: flag(config, 'wantBankNotes', true),
        wantCertDeposit: flag(config, 'wantCertDeposit', true),
        wantCerterBankExchange: flag(config, 'wantCerterBankExchange', true),
        wantDecanting: flag(config, 'wantDecanting', true),
        wantDropX: flag(config, 'wantDropX', true),
        wantKeyboardShortcuts: flag(config, 'wantKeyboardShortcuts', true),
        wantBankPresets: flag(config, 'wantBankPresets', false),
        wantEquipmentTab: flag(config, 'wantEquipmentTab', false),
        // defaults false; gates poisoned ammo/weapons poisoning NPCs
        wantPoisonNpcs: flag(config, 'wantPoisonNpcs', false),
        // defaults false; per-hit ranged XP against NPCs is off (PvP always grants it)
        rangedGivesXpHit: flag(config, 'rangedGivesXpHit', false),
        // off by default; when on, new characters spawn on Tutorial Island
        // instead of Lumbridge
        tutorialIsland: flag(config, 'tutorialIsland', false),
        // gate the character-creation class and ironman-mode selectors, both
        // default on; enforced server-side in packet-handlers/appearance.js
        usesClasses: flag(config, 'usesClasses', true),
        spawnIronMan: flag(config, 'spawnIronMan', true)
    };
}

// ironman mode enum: None(0) Ironman(1) Ultimate(2) Hardcore(3) Transfer(4)
const { IronmanMode } = require('./game-modes');

// read the player's ironman mode as an int, defaulting to None(0) when absent
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

// whether the player is an ultimate ironman
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
