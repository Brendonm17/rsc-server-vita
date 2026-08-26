
const QUEST_KEY = 'theHolyGrail';

// reward: 2 qp, prayer/defense xp = maxstat(skill) * varxp + basexp
const QUEST_POINTS = 2;
const PRAYER_BASE_XP = 1000;
const PRAYER_VAR_XP = 1000;
const DEFENSE_BASE_XP = 1200;
const DEFENSE_VAR_XP = 1200;

// NPCs (authentic OpenRSC NpcId == rsc-data)
const KING_ARTHUR_ID = 275;
const MERLIN_LIBRARY_ID = 393;
const BROTHER_GALAHAD_ID = 403;
const BLACK_KNIGHT_TITAN_ID = 401;
const SIR_PERCIVAL_ID = 411;
const FISHER_KING_ID = 412;
const MAIDEN_ID = 413;
const FISHERMAN_ID = 414;
const KING_PERCIVAL_ID = 415;
const UNHAPPY_PEASANT_ID = 416;
const HAPPY_PEASANT_ID = 417;

// Items (authentic OpenRSC ItemId == rsc-data)
const BIG_BONES_ID = 413;
const EXCALIBUR_ID = 606;
const MAGIC_WHISTLE_ID = 738;
const CUP_OF_TEA_ID = 739;
const HOLY_TABLE_NAPKIN_ID = 742;
const BELL_ID = 743;
const MAGIC_GOLDEN_FEATHER_ID = 745;
const HOLY_GRAIL_ID = 746;

// wall objects (doors) matched by type id, each a single unique location
const DOOR_117_ID = 117; // fisher realm entrance door, at (463, 1384)
const DOOR_116_ID = 116; // whistle-spawning door, at (202, 2438)

// Scenery object - the sack Sir Percival is trapped in, at (328, 446)
const SACK_ID = 408;

// merlin's crystal quest key: prerequisite gate for realm door 117
const MERLINS_CRYSTAL_KEY = 'merlinsCrystal';

module.exports = {
    QUEST_KEY,
    QUEST_POINTS,
    PRAYER_BASE_XP,
    PRAYER_VAR_XP,
    DEFENSE_BASE_XP,
    DEFENSE_VAR_XP,
    KING_ARTHUR_ID,
    MERLIN_LIBRARY_ID,
    BROTHER_GALAHAD_ID,
    BLACK_KNIGHT_TITAN_ID,
    SIR_PERCIVAL_ID,
    FISHER_KING_ID,
    MAIDEN_ID,
    FISHERMAN_ID,
    KING_PERCIVAL_ID,
    UNHAPPY_PEASANT_ID,
    HAPPY_PEASANT_ID,
    BIG_BONES_ID,
    EXCALIBUR_ID,
    MAGIC_WHISTLE_ID,
    CUP_OF_TEA_ID,
    HOLY_TABLE_NAPKIN_ID,
    BELL_ID,
    MAGIC_GOLDEN_FEATHER_ID,
    HOLY_GRAIL_ID,
    DOOR_117_ID,
    DOOR_116_ID,
    SACK_ID,
    MERLINS_CRYSTAL_KEY
};
