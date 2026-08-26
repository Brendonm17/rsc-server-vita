// shared constants & helpers; ids taken directly from openrsc, matching rsc-data

const NPC = require('../../../../model/npc');

const QUEST_KEY = 'touristTrap';

// NPCs (OpenRSC NpcId == rsc-data)
const IRENA_ID = 538;
const ANA_ID = 554;
const MERCENARY_ID = 668;
const MERCENARY_CAPTAIN_ID = 669;
const MERCENARY_ESCAPEGATES_ID = 670;
const MINING_SLAVE_ID = 671;
const MERCENARY_LIFTPLATFORM_ID = 690;
const MERCENARY_JAILDOOR_ID = 692;
const AL_SHABIM_ID = 700;
const BEDABIN_NOMAD_ID = 701;
const CAPTAIN_SIAD_ID = 702;
const BEDABIN_NOMAD_GUARD_ID = 703;
const DRAFT_MERCENARY_GUARD_ID = 710;
const MINING_CART_DRIVER_ID = 711;
const ESCAPING_MINING_SLAVE_ID = 737;

// Items (OpenRSC ItemId == rsc-data)
const COINS_ID = 10;
const BUCKET_OF_WATER_ID = 50;
const JUG_OF_WATER_ID = 141;
const HAMMER_ID = 168;
const BRONZE_BAR_ID = 169;
const BOWL_OF_WATER_ID = 342;
const FEATHER_ID = 381;
const PINEAPPLE_ID = 748;
const PINEAPPLE_RING_ID = 749;
const FRESH_PINEAPPLE_ID = 861;
const PINEAPPLE_CHUNKS_ID = 862;
const ROCKS_ID = 986;
const DESERT_BOOTS_ID = 990;
const BRONZE_THROWING_DART_ID = 1013;
const PROTOTYPE_THROWING_DART_ID = 1014;
const FULL_WATER_SKIN_ID = 1016;
const DESERT_ROBE_ID = 1019;
const DESERT_SHIRT_ID = 1020;
const METAL_KEY_ID = 1021;
const SLAVES_ROBE_BOTTOM_ID = 1022;
const SLAVES_ROBE_TOP_ID = 1023;
const MINING_BARREL_ID = 1038;
const ANA_IN_A_BARREL_ID = 1039;
const TENTI_PINEAPPLE_ID = 1058;
const BEDOBIN_COPY_KEY_ID = 1059;
const TECHNICAL_PLANS_ID = 1060;
const PROTOTYPE_DART_TIP_ID = 1071;
const WROUGHT_IRON_KEY_ID = 1097;
const CELL_DOOR_KEY_ID = 1098;

// Game objects (OpenRSC obj ids == rsc-data objects.json)
const STONE_GATE = 916; // ["Go through","Look"]
const IRON_GATE = 932; // ["Open","Search"]
const ROCK_1 = 953; // "Rocks" ["climb","Examine"]
const WOODEN_DOORS = 958; // ["Open","Watch"]
const BOOKCASE = 1004; // ["Look","Search"]
const CAPTAINS_CHEST = 1005; // ["Open","Examine"]
const DESK = 1023; // desk (id 1023)
const EXPERIMENTAL_ANVIL = 1006; // ["Use","Examine"]
const MINING_CAVE = 963; // ["enter","Examine"]
const MINING_CAVE_BACK = 964; // ["enter","Examine"]
const MINING_CART = 976; // ["Look","Search"]
const TRACK = 974; // ["Look","Examine"]
const MINING_BARREL_OBJECT = 967; // ["WalkTo","Search"]
const LIFT_PLATFORM = 977; // ["Use","Search"]
const LIFT_UP = 966; // ["Operate","Examine"]
const MINING_CART_ABOVE = 1025; // ["WalkTo","Search"]
const DISTURBED_SAND1 = 944; // ["Look","Search"] - closest to Irena
const DISTURBED_SAND2 = 945; // ["Look","Search"] - closest to camp

// Wall objects (OpenRSC ids == rsc-data wall-objects.json)
const JAIL_DOOR = 177; // ["Open","Examine"]
const WINDOW = 178; // ["WalkTo","Search"]
const TENT_DOOR_1 = 198; // ["Go through","Examine"]
const TENT_DOOR_2 = 196; // ["Go through","Examine"]
const CAVE_JAIL_DOOR = 180; // ["Open","Examine"]
const STURDY_IRON_GATE = 200; // ["Open","Examine"]

// quest stages (OpenRSC uses integer 0..10, -1 == complete)
const STAGES = {
    NOT_STARTED: 0,
    SEARCHING: 1,
    UNDO_CHAINS: 2,
    NEED_CLOTHES: 3,
    FREED_SLAVE: 4,
    NEED_PINEAPPLE: 5,
    HAVE_COPY_KEY: 6,
    MAKING_WEAPON: 7,
    MADE_WEAPON: 8,
    ATE_PINEAPPLE: 9,
    HAVE_ANA: 10,
    COMPLETE: -1
};

// reward: 2 qp, pick two skills from fletching/agility/smithing/thieving; level * 600 + 600
const QUEST_POINTS = 2;
const REWARD_BASE_XP = 600;
const REWARD_VAR_XP = 600;

// normalize undefined quest stage to 0 so comparisons behave consistently
function stageOf(player) {
    const s = player.questStages[QUEST_KEY];
    return s === undefined || s === null ? STAGES.NOT_STARTED : s;
}

// find a nearby visible npc by id within range
function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

// spawn a temporary NPC (addnpc equivalent). Returns the npc.
function addNpc(world, id, x, y) {
    const npc = new NPC(world, { id, x, y });
    delete npc.respawn;
    world.addEntity('npcs', npc);
    return npc;
}

// hasEquipped equivalent
function hasEquipped(player, id) {
    return player.inventory.items.some(
        (item) => item.id === id && item.equipped
    );
}

// wearing the full slave disguise (top + bottom)
function hasSlaveDisguise(player) {
    return (
        hasEquipped(player, SLAVES_ROBE_TOP_ID) &&
        hasEquipped(player, SLAVES_ROBE_BOTTOM_ID)
    );
}

// DataConversions.random(min, max) - inclusive both ends
function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// random(0..4); 3 or 4 == false (60% true)
function succeedRate() {
    const r = Math.floor(Math.random() * 5);
    return !(r === 4 || r === 3);
}

// getCurrentLevel (current, possibly-boosted stat)
function currentLevel(player, skill) {
    return player.skills[skill].current;
}

// getMaxLevel / getMaxStat (base level)
function maxLevel(player, skill) {
    return player.skills[skill].base;
}

module.exports = {
    QUEST_KEY,
    IRENA_ID,
    MERCENARY_ID,
    MERCENARY_CAPTAIN_ID,
    MERCENARY_ESCAPEGATES_ID,
    CAPTAIN_SIAD_ID,
    MINING_SLAVE_ID,
    ESCAPING_MINING_SLAVE_ID,
    BEDABIN_NOMAD_ID,
    BEDABIN_NOMAD_GUARD_ID,
    AL_SHABIM_ID,
    MERCENARY_LIFTPLATFORM_ID,
    MERCENARY_JAILDOOR_ID,
    ANA_ID,
    MINING_CART_DRIVER_ID,
    DRAFT_MERCENARY_GUARD_ID,
    COINS_ID,
    ANA_IN_A_BARREL_ID,
    WROUGHT_IRON_KEY_ID,
    METAL_KEY_ID,
    CELL_DOOR_KEY_ID,
    DESERT_ROBE_ID,
    DESERT_SHIRT_ID,
    DESERT_BOOTS_ID,
    SLAVES_ROBE_TOP_ID,
    SLAVES_ROBE_BOTTOM_ID,
    BOWL_OF_WATER_ID,
    BUCKET_OF_WATER_ID,
    FULL_WATER_SKIN_ID,
    JUG_OF_WATER_ID,
    BEDOBIN_COPY_KEY_ID,
    TECHNICAL_PLANS_ID,
    PROTOTYPE_THROWING_DART_ID,
    PROTOTYPE_DART_TIP_ID,
    TENTI_PINEAPPLE_ID,
    PINEAPPLE_ID,
    FRESH_PINEAPPLE_ID,
    PINEAPPLE_CHUNKS_ID,
    PINEAPPLE_RING_ID,
    BRONZE_BAR_ID,
    FEATHER_ID,
    HAMMER_ID,
    ROCKS_ID,
    MINING_BARREL_ID,
    BRONZE_THROWING_DART_ID,
    STONE_GATE,
    IRON_GATE,
    JAIL_DOOR,
    WINDOW,
    ROCK_1,
    WOODEN_DOORS,
    DESK,
    BOOKCASE,
    CAPTAINS_CHEST,
    EXPERIMENTAL_ANVIL,
    MINING_CAVE,
    MINING_CAVE_BACK,
    MINING_CART,
    TRACK,
    MINING_BARREL_OBJECT,
    LIFT_PLATFORM,
    LIFT_UP,
    MINING_CART_ABOVE,
    DISTURBED_SAND1,
    DISTURBED_SAND2,
    TENT_DOOR_1,
    TENT_DOOR_2,
    CAVE_JAIL_DOOR,
    STURDY_IRON_GATE,
    STAGES,
    QUEST_POINTS,
    REWARD_BASE_XP,
    REWARD_VAR_XP,
    stageOf,
    ifNearVisNpc,
    addNpc,
    hasEquipped,
    hasSlaveDisguise,
    random,
    succeedRate,
    currentLevel,
    maxLevel
};
