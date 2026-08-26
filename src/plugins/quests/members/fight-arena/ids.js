
const QUEST_KEY = 'fightArena';

// NPCs
const LADY_SERVIL_ID = 372;
const GUARD_KHAZARD_BYPRISONER_ID = 373;
const GUARD_KHAZARD_BRIBABLE_ID = 374;
const GUARD_KHAZARD_MACE_ID = 376;
const JEREMY_SERVIL_ID = 377;
const JUSTIN_SERVIL_ID = 378;
const FIGHTSLAVE_JOE_ID = 379;
const FIGHTSLAVE_KELVIN_ID = 380;
const LOCAL_ID = 381;
const GENERAL_KHAZARD_ID = 383;
const KHAZARD_OGRE_ID = 384;
const KHAZARD_SCORPION_ID = 386;
const HENGRAD_ID = 387;
const BOUNCER_ID = 388;

// Items
const COINS_ID = 10;
const KHAZARD_HELMET_ID = 733;
const KHAZARD_CHAINMAIL_ID = 734;
const KHALI_BREW_ID = 735;
const KHAZARD_CELL_KEYS_ID = 736;

// Objects
const GUARDS_CUPBOARD_CLOSED = 381; // "guardscupboard" - open/Examine
const GUARDS_CUPBOARD_OPEN = 382; // "guardscupboard" - Search/close
const CELL_GATE_CLOSED = 371; // "gate" - open/Examine
const CELL_GATE_OPEN = 181; // "gate" - WalkTo/Examine (opened state)

// worn/equipped check for a specific item id (hasEquipped equivalent)
function hasWorn(player, id) {
    return player.inventory.items.some(
        (item) => item.id === id && item.equipped
    );
}

// wearing the full khazard guard disguise (helmet + chainmail)
function hasDisguise(player) {
    return hasWorn(player, KHAZARD_HELMET_ID) && hasWorn(player, KHAZARD_CHAINMAIL_ID);
}

// find a nearby visible npc by id within range
function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

module.exports = {
    QUEST_KEY,
    LADY_SERVIL_ID,
    GUARD_KHAZARD_BYPRISONER_ID,
    GUARD_KHAZARD_BRIBABLE_ID,
    GUARD_KHAZARD_MACE_ID,
    JEREMY_SERVIL_ID,
    JUSTIN_SERVIL_ID,
    FIGHTSLAVE_JOE_ID,
    FIGHTSLAVE_KELVIN_ID,
    LOCAL_ID,
    GENERAL_KHAZARD_ID,
    KHAZARD_OGRE_ID,
    KHAZARD_SCORPION_ID,
    HENGRAD_ID,
    BOUNCER_ID,
    COINS_ID,
    KHAZARD_HELMET_ID,
    KHAZARD_CHAINMAIL_ID,
    KHALI_BREW_ID,
    KHAZARD_CELL_KEYS_ID,
    GUARDS_CUPBOARD_CLOSED,
    GUARDS_CUPBOARD_OPEN,
    CELL_GATE_CLOSED,
    CELL_GATE_OPEN,
    hasWorn,
    hasDisguise,
    ifNearVisNpc
};
