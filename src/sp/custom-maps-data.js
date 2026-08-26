// shared data for the OpenRSC custom map regions + harvesting skill, injected into the rsc-data caches: the 20th
// skill name ('harvesting'), custom-map GameObject defs (1236..1295: fruit trees, berry bushes, allotment plants, herb-clip spots, depleted variants, pipes/cave/rowboat/stepping-stones/lava-forge/anvil), scenery/npc/boundary/ground-item spawns for all 5 regions, buildCustomMapSectors() (the 11 terrain-inject sectors that differ from Authentic_Landscape.orsc), harvesting skill defs + herb-clip produce table with produce/tool ids resolved to SP item ids by name

// spawns only. terrain sectors ship inside sp/landscape.cache, not bundled here
const maps = require('./custom-maps-spawns.json');

// skill

// harvesting is the 20th skill for the SP build (runecraft is the 19th)
const SKILL_NAME = 'harvesting';

// item ids: OpenRSC produce/tool ids resolved to the SP item table by name (base rsc-data 0..1289 + custom-items.json
// 1290+)

const ITEM = {
    NOTHING: -1,

    // tools (Harvesting.java getTool / clip / care)
    FRUIT_PICKER: 1360, // OpenRSC 1355 "Fruit Picker"
    HAND_SHOVEL: 1361, // OpenRSC 1356 "Hand Shovel"
    HERB_CLIPPERS: 1362, // OpenRSC 1357 "Herb Clippers"
    WATERING_CAN: 1363, // OpenRSC 1358 "Watering Can" (full)
    EMPTY_WATERING_CAN: 1460, // OpenRSC 1455 "Watering Can" (empty)
    SOIL: 794, // authentic "Soil"
    BUCKET: 21, // authentic "Bucket"
    PRESENT: 980, // authentic "Present" (Xmas tree harvest)

    // clip produce (Harvesting.java HerbsProduce)
    SEAWEED: 622, // authentic
    EDIBLE_SEAWEED: 1245, // authentic
    LIMPWURT_ROOT: 220, // authentic
    SNAPE_GRASS: 469, // authentic

    // OpenRSC herb clip table yields unidentified herb items (ids 165/435..443); each mapped to its identified
    // counterpart (Guam leaf 444 .. Dwarf Weed 453)
    HERB_GUAM: 444,
    HERB_MARRENTILL: 445,
    HERB_TARROMIN: 446,
    HERB_HARRALANDER: 447,
    HERB_RANARR: 448,
    HERB_IRIT: 449,
    HERB_AVANTOE: 450,
    HERB_KWUARM: 451,
    HERB_CADANTINE: 452,
    HERB_DWARF_WEED: 453
};

// harvesting object defs, keyed by object id. prodId is the OpenRSC produce id translated to the SP id by name;
// {requiredLvl, prodId, exp, exhaust, respawnTime} otherwise exact. prodId name-translation (OpenRSC id -> SP id): 855 Lemon->855 863 Lime->863 1348 red apple->1353 857 Orange->857 1349 grapefruit->1354 249 Banana->249 1351 coconut->1356 1350 papaya->1355 861 (Fresh) Pineapple->748 236 Redberries->236 55 Cadavaberries->55 765 Dwellberries->765 936 Jangerberries->936 471 White berries->471 18 Cabbage->18 1352 Red Cabbage->1357 1354 White Pumpkin->1359 348 Potato->348 241 Onion->241 218 Garlic->218 320 Tomato->320 1353 Corn->1358 1456 sugar cane->1461 143 Grapes->143 1457 dragonfruit->1462 1569 Lily's Pumpkin->1570 (authentic ids <=1289 identical in both tables; only custom ids shift)

const HARVEST_DEFS = {
    1243: { requiredLvl: 15, prodId: 855, exp: 40, exhaust: 1, respawnTime: 30 }, // Lemon Tree
    1244: { requiredLvl: 21, prodId: 863, exp: 56, exhaust: 1, respawnTime: 40 }, // Lime Tree
    1245: { requiredLvl: 27, prodId: 1353, exp: 72, exhaust: 2, respawnTime: 60 }, // Apple Tree
    1246: { requiredLvl: 39, prodId: 857, exp: 112, exhaust: 4, respawnTime: 100 }, // Orange Tree
    1247: { requiredLvl: 46, prodId: 1354, exp: 144, exhaust: 4, respawnTime: 144 }, // Grapefruit Tree
    1248: { requiredLvl: 33, prodId: 249, exp: 88, exhaust: 3, respawnTime: 70 }, // Banana Palm
    1249: { requiredLvl: 68, prodId: 1356, exp: 336, exhaust: 7, respawnTime: 180 }, // Coconut Palm
    1250: { requiredLvl: 57, prodId: 1355, exp: 216, exhaust: 6, respawnTime: 160 }, // Papaya Palm
    1251: { requiredLvl: 51, prodId: 748, exp: 176, exhaust: 5, respawnTime: 140 }, // Pineapple Plant
    1256: { requiredLvl: 10, prodId: 236, exp: 40, exhaust: 2, respawnTime: 20 }, // Redberry Bush
    1257: { requiredLvl: 22, prodId: 55, exp: 56, exhaust: 3, respawnTime: 35 }, // Cadavaberry Bush
    1258: { requiredLvl: 36, prodId: 765, exp: 96, exhaust: 5, respawnTime: 50 }, // Dwellberry Bush
    1259: { requiredLvl: 48, prodId: 936, exp: 152, exhaust: 7, respawnTime: 80 }, // Jangerberry Bush
    1260: { requiredLvl: 59, prodId: 471, exp: 232, exhaust: 11, respawnTime: 110 }, // Whiteberry Bush
    1265: { requiredLvl: 1, prodId: 348, exp: 72, exhaust: 4, respawnTime: 15 }, // Potato Plant
    1266: { requiredLvl: 5, prodId: 241, exp: 88, exhaust: 4, respawnTime: 20 }, // Onion Plant
    1267: { requiredLvl: 9, prodId: 218, exp: 104, exhaust: 6, respawnTime: 30 }, // Garlic Plant
    1268: { requiredLvl: 12, prodId: 320, exp: 112, exhaust: 8, respawnTime: 40 }, // Tomato Plant
    1269: { requiredLvl: 20, prodId: 1358, exp: 152, exhaust: 10, respawnTime: 50 }, // Corn Plant
    1262: { requiredLvl: 7, prodId: 18, exp: 96, exhaust: 12, respawnTime: 25 }, // Cabbage
    1263: { requiredLvl: 30, prodId: 1357, exp: 208, exhaust: 12, respawnTime: 60 }, // Red Cabbage
    1264: { requiredLvl: 47, prodId: 1359, exp: 296, exhaust: 16, respawnTime: 90 }, // White Pumpkin
    1282: { requiredLvl: 50, prodId: 1461, exp: 180, exhaust: 5, respawnTime: 160 }, // Sugar Cane
    1283: { requiredLvl: 36, prodId: 143, exp: 160, exhaust: 18, respawnTime: 45 }, // Mysterious Grape Vine
    1293: { requiredLvl: 81, prodId: 1462, exp: 560, exhaust: 10, respawnTime: 300 }, // Dragonfruit Tree
    1275: { requiredLvl: 1, prodId: 1570, exp: 72, exhaust: 16, respawnTime: 90 } // Pumpkin (Lily's)
};

// clip produce tables. HERB (1274) yields an unidentified herb rolled from Formulae.calculateHerbDrop (weights out of
// 128), mapped to the identified herb. each herb entry is [itemId, level, xp]; level is informational, xp is per-herb

// Formulae.herbDropIDs order + herbDropWeights {33,25,19,14,11,8,6,5,4,3} (/128)
const HERB_DROP_TABLE = [
    { itemId: ITEM.HERB_GUAM, level: 9, xp: 50, weight: 33 },
    { itemId: ITEM.HERB_MARRENTILL, level: 14, xp: 60, weight: 25 },
    { itemId: ITEM.HERB_TARROMIN, level: 19, xp: 72, weight: 19 },
    { itemId: ITEM.HERB_HARRALANDER, level: 26, xp: 96, weight: 14 },
    { itemId: ITEM.HERB_RANARR, level: 32, xp: 122, weight: 11 },
    { itemId: ITEM.HERB_IRIT, level: 44, xp: 194, weight: 8 },
    { itemId: ITEM.HERB_AVANTOE, level: 50, xp: 246, weight: 6 },
    { itemId: ITEM.HERB_KWUARM, level: 56, xp: 312, weight: 5 },
    { itemId: ITEM.HERB_CADANTINE, level: 67, xp: 480, weight: 4 },
    { itemId: ITEM.HERB_DWARF_WEED, level: 79, xp: 768, weight: 3 }
];

// non-herb clip spots: objId -> produce {itemId, level, xp}. SEAWEED (1280) has
// a 1/4 chance to yield EDIBLE_SEAWEED instead (both level 23, xp 84).
const CLIP_PRODUCE = {
    1273: { itemId: ITEM.SNAPE_GRASS, level: 61, xp: 328 }, // Snape Grass
    1280: {
        itemId: ITEM.SEAWEED,
        edibleItemId: ITEM.EDIBLE_SEAWEED,
        level: 23,
        xp: 84
    }, // Sea Weed
    1281: { itemId: ITEM.LIMPWURT_ROOT, level: 42, xp: 144 } // Limpwurt Root
};

// depleted-object mapping: an exhausted node is replaced by a depleted object for its respawnTime, then restored.
// produce id drives which depleted object. fruit trees -> 1252 (exhausted tree) regular palms -> 1253 (exhausted palm) [banana, coconut] other palms -> 1254 (exhausted palm2) [papaya] pineapple -> 1255 (exhausted plant/pineapple) bushes -> 1261 (depleted bush) tomato -> 1271 (depleted tomato) corn -> 1272 (depleted corn) dragonfruit -> 1294 (exhausted dragonfruit tree) default -> 1270 (damaged ground) clip spots -> 1270 (damaged ground) with 60..240s respawn

const DEPLETED_DEFAULT = 1270;

// produce id sets (itemsFruitTree/RegPalm/OtherPalm/Bush), translated to SP ids
const ITEMS_FRUIT_TREE = new Set([855, 863, 1353, 857, 1354]); // lemon,lime,apple,orange,grapefruit
const ITEMS_REG_PALM = new Set([249, 1356]); // banana, coconut
const ITEMS_OTHER_PALM = new Set([1355]); // papaya
const ITEMS_BUSH = new Set([236, 55, 765, 936, 471]); // red,cadava,dwell,janger,white
const ITEM_PINEAPPLE = 748; // Fresh Pineapple
const ITEM_TOMATO = 320;
const ITEM_CORN = 1358;
const ITEM_DRAGONFRUIT = 1462;

function getDepletedObjectId(prodId) {
    if (ITEMS_FRUIT_TREE.has(prodId)) return 1252;
    if (ITEMS_REG_PALM.has(prodId)) return 1253;
    if (ITEMS_OTHER_PALM.has(prodId)) return 1254;
    if (prodId === ITEM_PINEAPPLE) return 1255;
    if (ITEMS_BUSH.has(prodId)) return 1261;
    if (prodId === ITEM_TOMATO) return 1271;
    if (prodId === ITEM_CORN) return 1272;
    if (prodId === ITEM_DRAGONFRUIT) return 1294;
    return DEPLETED_DEFAULT;
}

// GameObject defs appended to config/objects (ids 1236..1295). type 'blocked'/'unblocked' matches the XML type byte
// (1 -> blocked). server keys on object id + command name; model is nominal, the client resolves the model name

// [id, name, description, command1, command2, type(1=blocked), width, height]
const OBJECT2_DEFS = [
    [1236, 'pipe', 'a dirty sewer pipe', 'Enter', 'Examine', 1, 1, 1],
    [1237, 'pipe', 'a dirty sewer pipe', 'Enter', 'Examine', 1, 1, 1],
    [1238, 'Christmas Tree', 'A very festive tree', 'Collect', 'Examine', 1, 1, 1],
    [1239, 'Decorated Tree', 'A tree that gathers people around', 'WalkTo', 'Examine', 1, 1, 1],
    [1240, 'nothing', '', 'WalkTo', 'Examine', 0, 1, 1],
    [1241, 'Tunnel entrance', "I wonder where this leads...", 'enter', 'Examine', 1, 3, 1],
    [1242, 'Rowboat', 'This looks usable', 'Travel', 'Examine', 1, 2, 2],
    [1243, 'Lemon Tree', 'A tree filled with many ripe lemons', 'Harvest', 'Examine', 1, 1, 1],
    [1244, 'Lime Tree', 'A tree filled with many ripe limes', 'Harvest', 'Examine', 1, 1, 1],
    [1245, 'Apple Tree', 'A tree filled with many ripe apples', 'Harvest', 'Examine', 1, 1, 1],
    [1246, 'Orange Tree', 'A tree filled with many ripe oranges', 'Harvest', 'Examine', 1, 1, 1],
    [1247, 'Grapefruit Tree', 'A tree filled with many ripe grapefruits', 'Harvest', 'Examine', 1, 1, 1],
    [1248, 'Banana Palm', 'A palm containing many ripe bananas', 'Harvest', 'Examine', 1, 1, 1],
    [1249, 'Coconut Palm', 'A palm containing many ripe coconuts', 'Harvest', 'Examine', 1, 1, 1],
    [1250, 'Papaya Palm', 'A palm containing many ripe papayas', 'Harvest', 'Examine', 1, 1, 1],
    [1251, 'Pineapple Plant', 'A plant with many nice ripe pineapples', 'Harvest', 'Examine', 1, 1, 1],
    [1252, 'Exhausted Tree', 'Someone has taken the last of the produce!', 'WalkTo', 'Examine', 1, 1, 1],
    [1253, 'Exhausted Palm', 'Someone has taken the last of the produce!', 'WalkTo', 'Examine', 1, 1, 1],
    [1254, 'Exhausted Palm', 'Someone has taken the last of the produce!', 'WalkTo', 'Examine', 1, 1, 1],
    [1255, 'Exhausted Plant', 'A plant that got its produce taken away', 'WalkTo', 'Examine', 1, 1, 1],
    [1256, 'Redberry Bush', 'A bush containing some redberries', 'Harvest', 'Examine', 1, 1, 1],
    [1257, 'Cadavaberry Bush', 'A bush containing some cadavaberries', 'Harvest', 'Examine', 1, 1, 1],
    [1258, 'Dwellberry Bush', 'A bush filled with mysterious dwellberries', 'Harvest', 'Examine', 1, 1, 1],
    [1259, 'Jangerberry Bush', 'A bush having the mysterious jangerberries', 'Harvest', 'Examine', 1, 1, 1],
    [1260, 'Whiteberry Bush', 'A bush containing some whiteberries', 'Harvest', 'Examine', 1, 1, 1],
    [1261, 'Depleted Bush', 'A bush that once contained berries', 'WalkTo', 'Examine', 1, 1, 1],
    [1262, 'Cabbage', 'Oooh some cabbage', 'Harvest', 'Examine', 0, 1, 1],
    [1263, 'Red Cabbage', 'Oooh some red cabbage', 'Harvest', 'Examine', 0, 1, 1],
    [1264, 'White Pumpkin', 'A pumpkin ready for harvest', 'Harvest', 'Examine', 0, 1, 1],
    [1265, 'Potato Plant', 'Some nice looking potatoes growing underneath', 'Harvest', 'Examine', 0, 1, 1],
    [1266, 'Onion Plant', 'Some nice onions growing underneath', 'Harvest', 'Examine', 0, 1, 1],
    [1267, 'Garlic Plant', 'Some garlic growing underneath', 'Harvest', 'Examine', 0, 1, 1],
    [1268, 'Tomato Plant', 'This plant has some good looking tomatoes', 'Harvest', 'Examine', 0, 1, 1],
    [1269, 'Corn Plant', 'This plant contains ripe corn', 'Harvest', 'Examine', 0, 1, 1],
    [1270, 'Damaged Ground', 'Disturbed ground left after a harvest', 'WalkTo', 'Examine', 0, 1, 1],
    [1271, 'Depleted tomato plant', 'A plant that got its produce taken away', 'WalkTo', 'Examine', 0, 1, 1],
    [1272, 'Depleted corn plant', 'A plant that got its produce taken away', 'WalkTo', 'Examine', 0, 1, 1],
    [1273, 'Snape Grass', 'Some interesting snape grass growing here', 'Clip', 'Examine', 1, 1, 1],
    [1274, 'Herb', 'I wonder what herb is around', 'Clip', 'Examine', 1, 1, 1],
    [1275, 'Pumpkin', 'A pumpkin of autumn', 'Harvest', 'Examine', 0, 1, 1],
    [1276, 'Soil Mound', 'A pile of very good soil', 'WalkTo', 'Examine', 1, 1, 1],
    [1277, 'Barrel of water', 'A barrel filled with filtered water', 'WalkTo', 'Examine', 1, 1, 1],
    [1278, 'nothing', '', 'WalkTo', 'Examine', 0, 1, 1],
    [1279, 'nothing', '', 'WalkTo', 'Examine', 0, 1, 1],
    [1280, 'Sea Weed', 'Some tall sea weed growing here', 'Clip', 'Examine', 1, 1, 1],
    [1281, 'Limpwurt Root', 'Some nice limpwurt root around here', 'Clip', 'Examine', 1, 1, 1],
    [1282, 'Sugar Cane', 'The plant of interesting sugar cane!', 'Harvest', 'Examine', 0, 1, 1],
    [1283, 'Mysterious Grape Vine', 'This vine may have more than just grapes', 'Harvest', 'Examine', 0, 1, 1],
    [1284, 'Lava Forge', 'The latest of dwarven technology', 'WalkTo', 'Examine', 1, 2, 2],
    [1285, 'anvil', 'heavy metal', 'WalkTo', 'Examine', 1, 1, 1],
    [1286, 'Rocks', 'This looks dangerous...', 'climb', 'Examine', 0, 1, 1],
    [1287, 'Stepping Stone', 'It looks like I could jump on this', 'jump to', 'Examine', 1, 1, 1],
    [1288, 'Stepping Stone', 'It looks like I could jump on this', 'jump to', 'Examine', 1, 1, 1],
    [1289, 'Stepping Stone', 'It looks like I could jump on this', 'WalkTo', 'Examine', 1, 1, 1],
    [1290, 'Handholds', 'I wonder if I can climb up these', 'climb', 'Examine', 0, 1, 1],
    [1291, 'Stepping Stone', 'It looks like I could jump on this', 'jump to', 'Examine', 1, 1, 1],
    [1292, 'Stepping Stone', 'It looks like I could jump on this', 'jump to', 'Examine', 1, 1, 1],
    [1293, 'Dragonfruit Tree', 'A tree filled with many ripe dragonfruits', 'Harvest', 'Examine', 1, 1, 1],
    [1294, 'Exhausted Tree', 'Someone has taken the last of the produce!', 'WalkTo', 'Examine', 1, 1, 1],
    [1295, 'Stepping Stone', 'It looks like I could jump on this', 'jump to', 'Examine', 1, 1, 1]
];

// model refs are nominal on the server; model.id kept low, the client resolves the model name
const NOMINAL_MODEL = { name: 'tree2', id: 0 };

function buildObject2Defs() {
    // config/objects is index-addressable; pushing these 60 defs lands each at its exact id (1236..1295). filler ids
    // 1240/1278/1279 get a 'nothing' def
    const defs = [];

    for (const [id, name, description, command1, command2, type, width, height] of OBJECT2_DEFS) {
        void id;
        defs.push({
            name,
            description,
            commands: [command1, command2],
            model: NOMINAL_MODEL,
            width,
            height,
            type: type === 1 ? 'blocked' : 'unblocked',
            itemHeight: 0
        });
    }

    return defs;
}

// spawn builders. fed the per-region arrays from custom-maps.json (OpenRSC ids + game coords, already normalized)

function buildObjectSpawns() {
    const spawns = [];

    for (const s of maps.scenery) {
        spawns.push({ id: s.id, direction: s.direction || 0, x: s.x, y: s.y });
    }

    return spawns;
}

function buildNpcSpawns() {
    const spawns = [];

    for (const n of maps.npcs) {
        spawns.push({
            id: n.id,
            x: n.x,
            y: n.y,
            minX: n.minX,
            maxX: n.maxX,
            minY: n.minY,
            maxY: n.maxY
        });
    }

    return spawns;
}

function buildBoundarySpawns() {
    const spawns = [];

    for (const b of maps.boundaries) {
        spawns.push({ id: b.id, direction: b.direction || 0, x: b.x, y: b.y });
    }

    return spawns;
}

function buildGroundItemSpawns() {
    const spawns = [];

    for (const g of maps.groundItems) {
        // OpenRSC ground-item respawn is in seconds; rsc-server respawn is a setTimeout delay in ms, so convert (base
        // rsc-data locations/items also store ms)
        spawns.push({
            id: g.id,
            x: g.x,
            y: g.y,
            amount: g.amount != null ? g.amount : 1,
            respawn: g.respawn != null ? g.respawn * 1000 : undefined
        });
    }

    return spawns;
}

// terrain-inject Sector objects from custom-maps.json (tiles pre-reoriented to 2003scape). assigned into
// landscape.sectors after parseArchives(). only the 11 sectors that differ from Authentic_Landscape.orsc carry a grid

function buildCustomMapSectors(Sector) {
    // the 11 custom sectors are baked into sp/landscape.cache by precompute-pathfinder.js; world.js's injection loop
    // is a runtime no-op. the landscape cache is required for the custom regions to exist
    return [];
}

module.exports = {
    SKILL_NAME,
    ITEM,
    HARVEST_DEFS,
    HERB_DROP_TABLE,
    CLIP_PRODUCE,
    getDepletedObjectId,
    DEPLETED_DEFAULT,
    buildObject2Defs,
    buildObjectSpawns,
    buildNpcSpawns,
    buildBoundarySpawns,
    buildGroundItemSpawns,
    buildCustomMapSectors
};
