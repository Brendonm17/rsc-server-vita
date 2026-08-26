
// NPCs (rsc-data config/npcs.json)
const CAROLINE_ID = 455; // "Caroline"
// holgart has three world spawns; whichever one is talked to sets his location
const HOLGART_LAND_ID = 456; // shore / Ardougne
const HOLGART_PLATFORM_ID = 457; // fishing platform
const HOLGART_ISLAND_ID = 458; // Kent's island
const KENT_ID = 459; // "kent"
const BAILEY_ID = 460; // "bailey"
const KENNITH_ID = 461; // "kennith"
// platform fishermen, distinguished by their top colour
const PLATFORM_FISHERMAN_GOLDEN_ID = 462; // topColour rgb(255,204,0)
const PLATFORM_FISHERMAN_PURPLE_ID = 463; // topColour rgb(187,0,221)
const PLATFORM_FISHERMAN_GRAY_ID = 464; // topColour rgb(204,221,204)

const HOLGART_IDS = [HOLGART_LAND_ID, HOLGART_PLATFORM_ID, HOLGART_ISLAND_ID];

// Items (rsc-data config/items.json)
const FLOUR_ID = 23; // "A little heap of flour"
const SWAMP_TAR_ID = 783;
const UNCOOKED_SWAMP_PASTE_ID = 784;
const SWAMP_PASTE_ID = 785;
const DAMP_STICKS_ID = 776;
const DRY_STICKS_ID = 777;
const BROKEN_GLASS_ID = 778; // "Glass from a broken window pane"
const UNLIT_TORCH_ID = 773; // "A unlit home made torch"
const LIT_TORCH_ID = 774; // "A lit home made torch"
const SEASLUG_ID = 769; // "a rather nasty looking crustacean"
const QUEST_OYSTER_PEARLS_ID = 779; // reward

// Objects (rsc-data config/objects.json)
const LADDER_ID = 458; // "Ladder" on the platform (OpenRSC obj 458)
const FISHING_CRANE_ID = 453; // "Fishing crane" (OpenRSC obj 453)

// wall objects / boundaries
const LOOSE_PANEL_ID = 124; // "loose panel" (OpenRSC boundary 124)

// Cooking a fire (for finishing swamp paste)
const FIRE_ID = 97;

// firemaking level required to light the home-made torch by rubbing dry sticks
const FIREMAKING_LEVEL_REQUIRED = 30;

// Teleport targets (authentic OpenRSC coords from SeaSlug.java).
const PLATFORM_TELEPORT = { x: 495, y: 618 };
const SHORE_TELEPORT = { x: 515, y: 613 };
const ISLAND_TELEPORT = { x: 512, y: 639 };
const LADDER_TELEPORT = { x: 494, y: 1561 };
const SEASLUG_DROP = { x: 511, y: 636 };

module.exports = {
    CAROLINE_ID,
    HOLGART_LAND_ID,
    HOLGART_PLATFORM_ID,
    HOLGART_ISLAND_ID,
    HOLGART_IDS,
    KENT_ID,
    BAILEY_ID,
    KENNITH_ID,
    PLATFORM_FISHERMAN_GOLDEN_ID,
    PLATFORM_FISHERMAN_PURPLE_ID,
    PLATFORM_FISHERMAN_GRAY_ID,
    FLOUR_ID,
    SWAMP_TAR_ID,
    UNCOOKED_SWAMP_PASTE_ID,
    SWAMP_PASTE_ID,
    DAMP_STICKS_ID,
    DRY_STICKS_ID,
    BROKEN_GLASS_ID,
    UNLIT_TORCH_ID,
    LIT_TORCH_ID,
    SEASLUG_ID,
    QUEST_OYSTER_PEARLS_ID,
    LADDER_ID,
    FISHING_CRANE_ID,
    LOOSE_PANEL_ID,
    FIRE_ID,
    FIREMAKING_LEVEL_REQUIRED,
    PLATFORM_TELEPORT,
    SHORE_TELEPORT,
    ISLAND_TELEPORT,
    LADDER_TELEPORT,
    SEASLUG_DROP
};
