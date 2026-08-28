
// NPCs (id-map.json npcs)
const ACHETTIES_ID = 253;
const GRUBOR_ID = 255;
const TROBERT_ID = 256;
const GARV_ID = 257;
const GUARD_PIRATE_ID = 258;
const GRIP_ID = 259;
const ALFONSE_THE_WAITER_ID = 260;

// Items (id-map.json items)
const ID_PAPER_ID = 573;
// misc key (582) opens door 80; bunch of keys (583) opens door 81 + candlestick chest
const MISCELLANEOUS_KEY_ID = 582;
const BUNCH_OF_KEYS_ID = 583;
const DRAYNOR_WHISKY_ID = 584;
const CANDLESTICK_ID = 585;
const RED_FIREBIRD_FEATHER_ID = 557;
const MASTER_THIEF_ARMBAND_ID = 586;
const LAVA_EEL_ID = 590;
const ICE_GLOVES_ID = 556;
const COINS_ID = 10;

// black knight disguise armour
const BLACK_PLATE_MAIL_LEGS_ID = 248;
const LARGE_BLACK_HELMET_ID = 230;
const BLACK_PLATE_MAIL_BODY_ID = 196;

const GRIPS_CUPBOARD_ID = 56; // both open/closed states collide to 56
const CANDLESTICK_CHEST_ID = 17; // both open/closed states collide to 17

// tracks black arm branch via player.cache.blackArmStage
function isBlackArmGang(player) {
    return typeof player.cache.blackArmStage !== 'undefined';
}

// worn/equipped check for a specific item id
function hasWorn(player, id) {
    return player.inventory.items.some(
        (item) => item.id === id && item.equipped
    );
}

// find a nearby visible npc by id within range
function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

module.exports = {
    ACHETTIES_ID,
    GRUBOR_ID,
    TROBERT_ID,
    GARV_ID,
    GUARD_PIRATE_ID,
    GRIP_ID,
    ALFONSE_THE_WAITER_ID,
    ID_PAPER_ID,
    MISCELLANEOUS_KEY_ID,
    BUNCH_OF_KEYS_ID,
    DRAYNOR_WHISKY_ID,
    CANDLESTICK_ID,
    RED_FIREBIRD_FEATHER_ID,
    MASTER_THIEF_ARMBAND_ID,
    LAVA_EEL_ID,
    ICE_GLOVES_ID,
    COINS_ID,
    BLACK_PLATE_MAIL_LEGS_ID,
    LARGE_BLACK_HELMET_ID,
    BLACK_PLATE_MAIL_BODY_ID,
    GRIPS_CUPBOARD_ID,
    CANDLESTICK_CHEST_ID,
    isBlackArmGang,
    hasWorn,
    ifNearVisNpc
};
