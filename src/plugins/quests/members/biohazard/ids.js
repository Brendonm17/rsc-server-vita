// biohazard quest ids

// NPCs (rsc-data npcs.json)
const ELENA_HOUSE_ID = 483; // Elena in her West Ardougne house
const OMART_ID = 484;
const JERICO_ID = 486;
const KILRON_ID = 487;
const NURSE_SARAH_ID = 500;

// Rimmington: chemist and his three errand boys
const CHEMIST_ID = 504;
const CHANCY_ID = 505;
const HOPS_ID = 506;
const DEVINCI_ID = 507;

// the three errand boys drinking in the dancing donkey inn
const CHANCY_BAR_ID = 509;
const HOPS_BAR_ID = 510;
const DEVINCI_BAR_ID = 511;

const GUIDORS_WIFE_ID = 488;
const GUIDOR_ID = 508;
const KING_LATHAS_ID = 512;

// generic mourner npc used for both ill and gate-guard variants
const MOURNER_IDS = [444, 445, 451, 491, 492, 495, 502];

// Items (rsc-data items.json)
const DISTILLATOR_ID = 804;
const LIQUID_HONEY_ID = 809;
const ETHENEA_ID = 810;
const SULPHURIC_BROLINE_ID = 811;
const PLAGUE_SAMPLE_ID = 812;
const TOUCH_PAPER_ID = 813;
const BIRD_FEED_ID = 800;
const MESSENGER_PIGEONS_ID = 799; // released near the watch tower to distract the mourners
const PIGEON_CAGE_ID = 798; // empty cage left after releasing the pigeons
const DOCTORS_GOWN_ID = 802;
const ROTTEN_APPLES_ID = 801;
const BIOHAZARD_BRONZE_KEY_ID = 803;
const PRIEST_ROBE_ID = 807;
const PRIEST_GOWN_ID = 808;
const KING_LATHAS_AMULET_ID = 826;

// Objects (rsc-data objects.json; ids identical to OpenRSC)
const ELENAS_DOOR_ID = 152;
const JERICOS_CUPBOARD_ONE_OPEN = 71;
const JERICOS_CUPBOARD_ONE_CLOSED = 56;
const JERICOS_CUPBOARD_TWO_OPEN = 500;
const JERICOS_CUPBOARD_TWO_CLOSED = 499;
const WATCH_TOWER_ID = 494;
const VISUAL_ROPELADDER_ID = 498;
const COOKING_POT_ID = 502;
const NURSE_SARAHS_CUPBOARD_OPEN = 510;
const NURSE_SARAHS_CUPBOARD_CLOSED = 509;
const GET_INTO_CRATES_GATE_ID = 504;
const GATE_OPEN_ID = 58; // open gate used while passing through
const DISTILLATOR_CRATE_ID = 505;
const OTHER_CRATE_ID = 290;

// reward: 3 qp, thieving xp
const QUEST_POINTS = 3;
const THIEVING_BASE_XP = 2000;
const THIEVING_VAR_XP = 200;

module.exports = {
    ELENA_HOUSE_ID,
    OMART_ID,
    JERICO_ID,
    KILRON_ID,
    NURSE_SARAH_ID,
    CHEMIST_ID,
    CHANCY_ID,
    HOPS_ID,
    DEVINCI_ID,
    CHANCY_BAR_ID,
    HOPS_BAR_ID,
    DEVINCI_BAR_ID,
    GUIDORS_WIFE_ID,
    GUIDOR_ID,
    KING_LATHAS_ID,
    MOURNER_IDS,
    DISTILLATOR_ID,
    LIQUID_HONEY_ID,
    ETHENEA_ID,
    SULPHURIC_BROLINE_ID,
    PLAGUE_SAMPLE_ID,
    TOUCH_PAPER_ID,
    BIRD_FEED_ID,
    MESSENGER_PIGEONS_ID,
    PIGEON_CAGE_ID,
    DOCTORS_GOWN_ID,
    ROTTEN_APPLES_ID,
    BIOHAZARD_BRONZE_KEY_ID,
    PRIEST_ROBE_ID,
    PRIEST_GOWN_ID,
    KING_LATHAS_AMULET_ID,
    ELENAS_DOOR_ID,
    JERICOS_CUPBOARD_ONE_OPEN,
    JERICOS_CUPBOARD_ONE_CLOSED,
    JERICOS_CUPBOARD_TWO_OPEN,
    JERICOS_CUPBOARD_TWO_CLOSED,
    WATCH_TOWER_ID,
    VISUAL_ROPELADDER_ID,
    COOKING_POT_ID,
    NURSE_SARAHS_CUPBOARD_OPEN,
    NURSE_SARAHS_CUPBOARD_CLOSED,
    GET_INTO_CRATES_GATE_ID,
    GATE_OPEN_ID,
    DISTILLATOR_CRATE_ID,
    OTHER_CRATE_ID,
    QUEST_POINTS,
    THIEVING_BASE_XP,
    THIEVING_VAR_XP
};
