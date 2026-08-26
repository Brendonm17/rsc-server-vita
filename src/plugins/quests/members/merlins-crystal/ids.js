
const QUEST_KEY = 'merlinsCrystal';

// 6 quest points awarded, no skill xp
const QUEST_POINTS = 6;

// npcs
const KING_ARTHUR_ID = 275;
const SIR_GAWAIN_ID = 274;
const SIR_LANCELOT_ID = 273;
const SIR_MORDRED_ID = 276;
const ARHEIN_ID = 280;
const MORGAN_LE_FAYE_ID = 281;
const LADY_LAKE_ID = 283;
const LADY_GROUND_ID = 284; // Lady of the lake, revealed from the beggar
const LADY_UPSTAIRS_ID = 285; // Lady of the lake, upstairs in the keep
const CANDLEMAKER_ID = 282;
const BEGGAR_ID = 286;
const MERLIN_CRYSTAL_ID = 287; // freed Merlin (spawned near the crystal)
const THRANTAX_ID = 288; // summoned demon

// objects
const CRATE_TYPE = 182; // OpenRSC 291, at (441, 507) - buckets crate
const SHIP_TYPE = 155;
const BEEHIVE_TYPE = 294;
const LADDER_TYPE = 5; // OpenRSC 295, at (280, 634) - keep ladder up
const ALTAR_TYPE = 19;
const CRYSTAL_TYPE = 287;

// Authentic coordinates (from OpenRSC SceneryLocs.json)
const CRATE_X = 441;
const CRATE_Y = 507;
// both ship gangplank tiles OpenRSC checks (292 and 293)
const SHIP_TILES = [
    { x: 436, y: 509 },
    { x: 436, y: 504 }
];
const ALTAR_X = 116;
const ALTAR_Y = 366;
const LADDER_X = 280;
const LADDER_Y = 634;

// ship stow-away teleport waypoints
const SHIP_HIDE = { x: 456, y: 3352 };
const SHIP_ARRIVE = { x: 456, y: 520 };

// Keep ladder teleport (OpenRSC teleports player +944 in Y)
const LADDER_DELTA_Y = 944;
const LADY_UPSTAIRS_SPAWN = { x: 279, y: 1576 };

// beggar / lady-of-the-lake boundary door
const DOOR_X = 277;
const DOOR_Y = 632;
const BEGGAR_SPAWN = { x: 276, y: 631 };

// Morgan Le Faye spawn on Mordred's "death" (OpenRSC addnpc 461, 2407)
const MORGAN_SPAWN = { x: 461, y: 2407 };

// Pentagram demon-summon tile (OpenRSC blockDropObj: x==448 && y==435)
const PENTAGRAM_X = 448;
const PENTAGRAM_Y = 435;

// items
const BONES_ID = 20;
const BUCKET_ID = 21;
const BREAD_ID = 138;
const UNLIT_BLACK_CANDLE_ID = 600;
const LIT_BLACK_CANDLE_ID = 602;
const INSECT_REPELLANT_ID = 603;
const BAT_BONES_ID = 604;
const WAX_BUCKET_ID = 605;
const EXCALIBUR_ID = 606;
const MAGIC_GOLDEN_FEATHER_ID = 745;
const HOLY_GRAIL_ID = 746;

// Other quest keys referenced by King Arthur's dialogue
const HOLY_GRAIL_KEY = 'holyGrail';

module.exports = {
    QUEST_KEY,
    QUEST_POINTS,
    HOLY_GRAIL_KEY,
    KING_ARTHUR_ID,
    SIR_GAWAIN_ID,
    SIR_LANCELOT_ID,
    SIR_MORDRED_ID,
    ARHEIN_ID,
    MORGAN_LE_FAYE_ID,
    LADY_LAKE_ID,
    LADY_GROUND_ID,
    LADY_UPSTAIRS_ID,
    CANDLEMAKER_ID,
    BEGGAR_ID,
    MERLIN_CRYSTAL_ID,
    THRANTAX_ID,
    CRATE_TYPE,
    SHIP_TYPE,
    BEEHIVE_TYPE,
    LADDER_TYPE,
    ALTAR_TYPE,
    CRYSTAL_TYPE,
    CRATE_X,
    CRATE_Y,
    SHIP_TILES,
    ALTAR_X,
    ALTAR_Y,
    LADDER_X,
    LADDER_Y,
    SHIP_HIDE,
    SHIP_ARRIVE,
    LADDER_DELTA_Y,
    LADY_UPSTAIRS_SPAWN,
    DOOR_X,
    DOOR_Y,
    BEGGAR_SPAWN,
    MORGAN_SPAWN,
    PENTAGRAM_X,
    PENTAGRAM_Y,
    BONES_ID,
    BUCKET_ID,
    BREAD_ID,
    UNLIT_BLACK_CANDLE_ID,
    LIT_BLACK_CANDLE_ID,
    INSECT_REPELLANT_ID,
    BAT_BONES_ID,
    WAX_BUCKET_ID,
    EXCALIBUR_ID,
    MAGIC_GOLDEN_FEATHER_ID,
    HOLY_GRAIL_ID
};
