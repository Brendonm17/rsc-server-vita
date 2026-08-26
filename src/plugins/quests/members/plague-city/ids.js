
// NPCs (rsc-data config/npcs.json)
const EDMOND_ID = 437;
const ALRENA_ID = 450;
const JETHICK_ID = 443;
const TED_REHNISON_ID = 446;
const MARTHA_REHNISON_ID = 447;
const BILLY_REHNISON_ID = 448;
const MILLI_REHNISON_ID = 449;
const CLERK_ID = 452;
const BRAVEK_ID = 454;
const ELENA_ID = 465; // the caged Elena inside the plague house

// Items (rsc-data config/items.json)
const DWELLBERRIES_ID = 765;
const GASMASK_ID = 766;
const PICTURE_ID = 767;
const PLAGUE_CITY_BOOK_ID = 768; // "Book" Jethick asks you to return
const SCRUFFY_NOTE_ID = 781;
const HANGOVER_CURE_ID = 771;
const WARRANT_ID = 775;
const MAGIC_SCROLL_ID = 752;
const LITTLE_KEY_ID = 780;
const BUCKET_OF_WATER_ID = 50; // rsc-data item 50 "Water" == bucket of water
const BUCKET_ID = 21;
const ROPE_ID = 237;
const SPADE_ID = 211;

// Objects (rsc-data config/objects.json) - same numeric ids in OpenRSC
const DUG_UP_SOIL_ID = 447; // ["WalkTo","Examine"] - target of use-with
const PILE_OF_MUD_ID = 448; // ["climb","Examine"]
const SEWER_PIPE_ID = 449; // ["enter","Examine"]
const CUPBOARD_CLOSED_ID = 451; // ["open","Examine"]  (ALRENAS_CUPBOARD_CLOSED)
const CUPBOARD_OPEN_ID = 452; // ["Search","close"] (ALRENAS_CUPBOARD_OPEN)
const BARREL_ID = 456; // ["WalkTo","Search"]
const GATE_ID = 457; // ["open","Examine"]
const GATE_OPEN_ID = 181;

// reward: 1 quest point, mining xp (base 700, var 300)
const QUEST_POINTS = 1;
const MINING_BASE_XP = 700;
const MINING_VAR_XP = 300;

module.exports = {
    EDMOND_ID,
    ALRENA_ID,
    JETHICK_ID,
    TED_REHNISON_ID,
    MARTHA_REHNISON_ID,
    BILLY_REHNISON_ID,
    MILLI_REHNISON_ID,
    CLERK_ID,
    BRAVEK_ID,
    ELENA_ID,
    DWELLBERRIES_ID,
    GASMASK_ID,
    PICTURE_ID,
    PLAGUE_CITY_BOOK_ID,
    SCRUFFY_NOTE_ID,
    HANGOVER_CURE_ID,
    WARRANT_ID,
    MAGIC_SCROLL_ID,
    LITTLE_KEY_ID,
    BUCKET_OF_WATER_ID,
    BUCKET_ID,
    ROPE_ID,
    SPADE_ID,
    DUG_UP_SOIL_ID,
    PILE_OF_MUD_ID,
    SEWER_PIPE_ID,
    CUPBOARD_CLOSED_ID,
    CUPBOARD_OPEN_ID,
    BARREL_ID,
    GATE_ID,
    GATE_OPEN_ID,
    QUEST_POINTS,
    MINING_BASE_XP,
    MINING_VAR_XP
};
