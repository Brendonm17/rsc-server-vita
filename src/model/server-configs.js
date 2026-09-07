// opcode 19: the 90 per-world config entries sent after login
// strings at positions 1, 2, 42, 45, 87, 88; single bytes elsewhere

const { getQOLConfig } = require('./qol-config');

function bool(v) {
    return v ? 1 : 0;
}

function serverConfigs(world) {
    const config = (world && world.server && world.server.config) || {};
    const qol = getQOLConfig(config);
    const name = config.serverName || 'RuneScape Classic';
    const tick = config.gameTick || 640;
    const stepsPerFrame = Math.round((4.0 * 640.0) / tick);

    return [
        name, // 1 SERVER_NAME
        config.serverNameWelcome || name, // 2 SERVER_NAME_WELCOME
        99, // 3 PLAYER_LEVEL_LIMIT
        1, // 4 SPAWN_AUCTION_NPCS
        bool(qol.spawnIronMan), // 5 SPAWN_IRON_MAN_NPCS
        0, // 6 SHOW_FLOATING_NAMETAGS
        1, // 7 WANT_CLANS
        0, // 8 WANT_KILL_FEED
        0, // 9 FOG_TOGGLE
        0, // 10 GROUND_ITEM_TOGGLE
        0, // 11 AUTO_MESSAGE_SWITCH_TOGGLE
        1, // 12 BATCH_PROGRESSION
        0, // 13 SIDE_MENU_TOGGLE
        0, // 14 INVENTORY_COUNT_TOGGLE
        0, // 15 ZOOM_VIEW_TOGGLE
        0, // 16 MENU_COMBAT_STYLE_TOGGLE
        0, // 17 FIGHTMODE_SELECTOR_TOGGLE
        0, // 18 EXPERIENCE_COUNTER_TOGGLE
        0, // 19 EXPERIENCE_DROPS_TOGGLE
        0, // 20 ITEMS_ON_DEATH_MENU
        0, // 21 SHOW_ROOF_TOGGLE
        0, // 22 WANT_HIDE_IP
        0, // 23 WANT_REMEMBER
        bool(config.wantGlobalChat === true), // 24 WANT_GLOBAL_CHAT
        0, // 25 WANT_SKILL_MENUS
        0, // 26 WANT_QUEST_MENUS
        0, // 27 WANT_EXPERIENCE_ELIXIRS
        0, // 28 WANT_KEYBOARD_SHORTCUTS
        bool(qol.wantCustomBanks), // 29 WANT_CUSTOM_BANKS
        1, // 30 WANT_BANK_PINS || TOLERATE_BANK_PINS
        bool(qol.wantBankNotes), // 31 WANT_BANK_NOTES
        bool(qol.wantCertDeposit), // 32 WANT_CERT_DEPOSIT
        0, // 33 CUSTOM_FIREMAKING
        bool(qol.wantDropX), // 34 WANT_DROP_X
        0, // 35 WANT_EXP_INFO
        0, // 36 WANT_WOODCUTTING_GUILD
        bool(qol.wantDecanting), // 37 WANT_DECANTING
        bool(qol.wantCerterBankExchange), // 38 WANT_CERTER_BANK_EXCHANGE
        1, // 39 WANT_CUSTOM_RANK_DISPLAY
        1, // 40 RIGHT_CLICK_BANK
        0, // 41 FIX_OVERHEAD_CHAT
        '', // 42 WELCOME_TEXT
        1, // 43 MEMBER_WORLD (single-player is always members)
        0, // 44 DISPLAY_LOGO_SPRITE
        '2010', // 45 LOGO_SPRITE_ID
        50, // 46 FPS
        0, // 47 WANT_EMAIL
        0, // 48 WANT_REGISTRATION_LIMIT
        0, // 49 ALLOW_RESIZE
        0, // 50 LENIENT_CONTACT_DETAILS
        bool(config.fatigue), // 51 WANT_FATIGUE
        0, // 52 WANT_CUSTOM_SPRITES
        1, // 53 PLAYER_COMMANDS
        0, // 54 WANT_PETS
        1, // 55 MAX_WALKING_SPEED
        0, // 56 SHOW_UNIDENTIFIED_HERB_NAMES
        0, // 57 WANT_QUEST_STARTED_INDICATOR
        0, // 58 FISHING_SPOTS_DEPLETABLE
        0, // 59 IMPROVED_ITEM_OBJECT_NAMES
        0, // 60 WANT_RUNECRAFT
        0, // 61 WANT_CUSTOM_LANDSCAPE
        0, // 62 WANT_EQUIPMENT_TAB
        0, // 63 WANT_BANK_PRESETS
        1, // 64 WANT_PARTIES
        0, // 65 MINING_ROCKS_EXTENDED
        stepsPerFrame, // 66 stepsPerFrame
        0, // 67 WANT_LEFTCLICK_WEBS
        1, // 68 NPC_KILL_COUNTERS
        0, // 69 WANT_CUSTOM_UI
        1, // 70 WANT_GLOBAL_FRIEND
        0, // 71 CHARACTER_CREATION_MODE
        Math.max(1, Math.min(127, Math.round(config.experienceRate || 1))), // 72 SKILLING_EXP_RATE
        0, // 73 WANT_HARVESTING
        0, // 74 HIDE_LOGIN_BOX_TOGGLE
        1, // 75 WANT_GLOBAL_FRIEND
        0, // 76 RIGHT_CLICK_TRADE
        bool(config.sleep !== false), // 77 FEATURES_SLEEP
        0, // 78 WANT_EXTENDED_CATS_BEHAVIOR
        0, // 79 WANT_CERT_AS_NOTES
        0, // 80 WANT_OPENPK_POINTS
        1, // 81 OPENPK_POINTS_TO_GP_RATIO
        0, // 82 WANT_OPENPK_PRESETS
        0, // 83 SHOW_UNDERGROUND_FLICKER_TOGGLE
        0, // 84 DISABLE_MINIMAP_ROTATION
        0, // 85 ALLOW_BEARDED_LADIES
        0, // 86 PRIDE_MONTH
        '0', // 87 RSA public exponent
        '0', // 88 RSA public modulus
        0, // 89 GROUND_ITEM_NAMES
        0 // 90 WANT_NATURE_RUNE_PROTECTION
    ];
}

const STRING_POSITIONS = [1, 2, 42, 45, 87, 88];

module.exports = { serverConfigs, STRING_POSITIONS };
