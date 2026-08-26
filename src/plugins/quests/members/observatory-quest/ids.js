const PROFESSOR_ID = 662;
const OBSERVATORY_PROFESSOR_ID = 652;
const OBSERVATORY_ASSISTANT_ID = 654;
const GOBLIN_GUARD_ID = 651;
const DUNGEON_SPIDER_ID = 656;

// item ids: openrsc -> rsc-server via id-map.json
const PLANK_ID = 408; // PLANK(410)
const BRONZE_BAR_ID = 167; // BRONZE_BAR(169)
const MOLTEN_GLASS_ID = 621; // MOLTEN_GLASS(623)
const LENS_MOULD_ID = 1015; // LENS_MOULD(1017)
const LENS_ID = 1016; // LENS(1018)
const KEEP_KEY_ID = 1010; // KEEP_KEY(1012)
const ONE_CURE_POISON_POTION_ID = 568; // ONE_CURE_POISON_POTION(568)
const WINE_ID = 140; // WINE(142)
const UNCUT_SAPPHIRE_ID = 158; // UNCUT_SAPPHIRE(160)

// constellation reward items:
const LAW_RUNE_ID = 40; // LAW_RUNE(42)
const BLACK_2_HANDED_SWORD_ID = 424; // BLACK_2_HANDED_SWORD(426)
const TUNA_ID = 368; // TUNA(367) -> id-map TUNA = 368
const FULL_SUPER_STRENGTH_POTION_ID = 491; // FULL_SUPER_STRENGTH_POTION(492)
const WATER_RUNE_ID = 768; // WATER_RUNE(32)
const WEAPON_POISON_ID = 571; // WEAPON_POISON(572)
const MAPLE_LONGBOW_ID = 650; // MAPLE_LONGBOW(652)
const EMERALD_AMULET_OF_PROTECTION_ID = 313; // EMERALD_AMULET_OF_PROTECTION(315)

// object ids: openrsc -> rsc-server via obj-map.json
const LADDER_ID = 5; // OpenRSC 928
const CHEST_ID = 17; // OpenRSC 917/919/929/930/934/935/936/937
const MOULD_OBJECT_ID = 55; // OpenRSC 927 (sacks)
const GATE_ID = 57; // OpenRSC 926
const TELESCOPE_ID = 925; // OpenRSC 925

// ifnearvisnpc(player, id, range) equivalent.
function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

module.exports = {
    PROFESSOR_ID,
    OBSERVATORY_PROFESSOR_ID,
    OBSERVATORY_ASSISTANT_ID,
    GOBLIN_GUARD_ID,
    DUNGEON_SPIDER_ID,
    PLANK_ID,
    BRONZE_BAR_ID,
    MOLTEN_GLASS_ID,
    LENS_MOULD_ID,
    LENS_ID,
    KEEP_KEY_ID,
    ONE_CURE_POISON_POTION_ID,
    WINE_ID,
    UNCUT_SAPPHIRE_ID,
    LAW_RUNE_ID,
    BLACK_2_HANDED_SWORD_ID,
    TUNA_ID,
    FULL_SUPER_STRENGTH_POTION_ID,
    WATER_RUNE_ID,
    WEAPON_POISON_ID,
    MAPLE_LONGBOW_ID,
    EMERALD_AMULET_OF_PROTECTION_ID,
    LADDER_ID,
    CHEST_ID,
    MOULD_OBJECT_ID,
    GATE_ID,
    TELESCOPE_ID,
    ifNearVisNpc
};
