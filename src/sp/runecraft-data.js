// shared runecrafting data for the embedded single-player server, injected into the rsc-data caches: the 19th skill
// name ('runecraft'), the altar + rune-stone GameObject defs (ids 1189..1227, appended since absent from rsc-data/config/objects), the altar/rune-stone scenery spawns, the rune-island npc spawns, buildRuneSectors() (the 20 rune-island Sector objects). all ids resolved to the SP build's item/object ids by name. the altar {requiredLvl,runeId,exp} table and per-altar coordinates from oref/ObjectRunecraft.xml and oref/Runecraft.java

// runecraft-islands.json not required here; the 20 island sectors ship inside sp/landscape.cache

// skill

const SKILL_NAME = 'runecraft';

// item ids, resolved by name from the SP item table (base rsc-data 0-1289 + custom-items.json 1290+)

const ITEM = {
    RUNE_STONE: 1305,
    UNCHARGED_TALISMAN: 1390,
    CHISEL: 167,
    CROWN_OF_THE_ARTISAN: 1515,

    // active runes (9), rsc-server ids by name; == ObjectRunecraft.xml runeIds
    FIRE_RUNE: 31,
    WATER_RUNE: 32,
    AIR_RUNE: 33,
    EARTH_RUNE: 34,
    MIND_RUNE: 35,
    BODY_RUNE: 36,
    NATURE_RUNE: 40,
    CHAOS_RUNE: 41,
    COSMIC_RUNE: 46,

    // charged talismans (9 active)
    AIR_TALISMAN: 1306,
    MIND_TALISMAN: 1307,
    WATER_TALISMAN: 1308,
    EARTH_TALISMAN: 1309,
    FIRE_TALISMAN: 1310,
    BODY_TALISMAN: 1311,
    COSMIC_TALISMAN: 1312,
    CHAOS_TALISMAN: 1313,
    NATURE_TALISMAN: 1314,

    // cursed talismans (9 active)
    CURSED_AIR_TALISMAN: 1391,
    CURSED_MIND_TALISMAN: 1392,
    CURSED_WATER_TALISMAN: 1393,
    CURSED_EARTH_TALISMAN: 1394,
    CURSED_FIRE_TALISMAN: 1395,
    CURSED_BODY_TALISMAN: 1396,
    CURSED_COSMIC_TALISMAN: 1397,
    CURSED_CHAOS_TALISMAN: 1398,
    CURSED_NATURE_TALISMAN: 1399,

    // enfeebled talismans (9 active)
    ENFEEBLED_AIR_TALISMAN: 1403,
    ENFEEBLED_MIND_TALISMAN: 1404,
    ENFEEBLED_WATER_TALISMAN: 1405,
    ENFEEBLED_EARTH_TALISMAN: 1406,
    ENFEEBLED_FIRE_TALISMAN: 1407,
    ENFEEBLED_BODY_TALISMAN: 1408,
    ENFEEBLED_COSMIC_TALISMAN: 1409,
    ENFEEBLED_CHAOS_TALISMAN: 1410,
    ENFEEBLED_NATURE_TALISMAN: 1411
};

// object ids

// temple altars (even): talisman-on-altar teleports to the rune island. bind altars (odd): bind rune stones into
// runes at the island altar
const AIR_ALTAR = 1190;
const MIND_ALTAR = 1192;
const WATER_ALTAR = 1194;
const EARTH_ALTAR = 1196;
const FIRE_ALTAR = 1198;
const BODY_ALTAR = 1200;
const COSMIC_ALTAR = 1202;
const CHAOS_ALTAR = 1204;
const NATURE_ALTAR = 1206;
const LAW_ALTAR = 1208;
const DEATH_ALTAR = 1210;
const BLOOD_ALTAR = 1212;

const RUNE_STONE_ROCK = 1227;

// per-altar runecraft definition, keyed by the odd bind-altar object id. runeId/exp/requiredLvl are exact.
// Law/Death/Blood defs are kept but inactive in OpenRSC; the rune arrays below include only the 9 active runes

const RUNECRAFT_DEFS = {
    1191: { requiredLvl: 1, runeId: 33, runeName: 'air', exp: 20 },
    1193: { requiredLvl: 1, runeId: 35, runeName: 'mind', exp: 22 },
    1195: { requiredLvl: 5, runeId: 32, runeName: 'water', exp: 24 },
    1197: { requiredLvl: 9, runeId: 34, runeName: 'earth', exp: 26 },
    1199: { requiredLvl: 14, runeId: 31, runeName: 'fire', exp: 28 },
    1201: { requiredLvl: 20, runeId: 36, runeName: 'body', exp: 30 },
    1203: { requiredLvl: 27, runeId: 46, runeName: 'cosmic', exp: 32 },
    1205: { requiredLvl: 35, runeId: 41, runeName: 'chaos', exp: 34 },
    1207: { requiredLvl: 44, runeId: 40, runeName: 'nature', exp: 36 },
    1209: { requiredLvl: 54, runeId: 42, runeName: 'law', exp: 38 },
    1211: { requiredLvl: 65, runeId: 38, runeName: 'death', exp: 40 },
    1213: { requiredLvl: 77, runeId: 619, runeName: 'blood', exp: 95 }
};

// temple-altar (even id) -> teleport destination on the rune island. coords from oref/Runecraft.java onUseLoc
const TEMPLE_TELEPORTS = {
    [AIR_ALTAR]: { x: 985, y: 19 },
    [MIND_ALTAR]: { x: 934, y: 14 },
    [WATER_ALTAR]: { x: 986, y: 63 },
    [EARTH_ALTAR]: { x: 934, y: 70 },
    [FIRE_ALTAR]: { x: 887, y: 26 },
    [BODY_ALTAR]: { x: 893, y: 71 },
    [COSMIC_ALTAR]: { x: 839, y: 26 },
    [CHAOS_ALTAR]: { x: 826, y: 90 },
    [NATURE_ALTAR]: { x: 787, y: 29 },
    [LAW_ALTAR]: { x: 790, y: 69 },
    [DEATH_ALTAR]: { x: 934, y: 14 },
    [BLOOD_ALTAR]: { x: 743, y: 22 }
};

// temple altar -> [normal, cursed, enfeebled] talisman that opens it (Runecraft.java altarTalismans, 9 active
// elements)
const ALTAR_TALISMANS = {
    [AIR_ALTAR]: [
        ITEM.AIR_TALISMAN,
        ITEM.CURSED_AIR_TALISMAN,
        ITEM.ENFEEBLED_AIR_TALISMAN
    ],
    [MIND_ALTAR]: [
        ITEM.MIND_TALISMAN,
        ITEM.CURSED_MIND_TALISMAN,
        ITEM.ENFEEBLED_MIND_TALISMAN
    ],
    [WATER_ALTAR]: [
        ITEM.WATER_TALISMAN,
        ITEM.CURSED_WATER_TALISMAN,
        ITEM.ENFEEBLED_WATER_TALISMAN
    ],
    [EARTH_ALTAR]: [
        ITEM.EARTH_TALISMAN,
        ITEM.CURSED_EARTH_TALISMAN,
        ITEM.ENFEEBLED_EARTH_TALISMAN
    ],
    [FIRE_ALTAR]: [
        ITEM.FIRE_TALISMAN,
        ITEM.CURSED_FIRE_TALISMAN,
        ITEM.ENFEEBLED_FIRE_TALISMAN
    ],
    [BODY_ALTAR]: [
        ITEM.BODY_TALISMAN,
        ITEM.CURSED_BODY_TALISMAN,
        ITEM.ENFEEBLED_BODY_TALISMAN
    ],
    [COSMIC_ALTAR]: [
        ITEM.COSMIC_TALISMAN,
        ITEM.CURSED_COSMIC_TALISMAN,
        ITEM.ENFEEBLED_COSMIC_TALISMAN
    ],
    [CHAOS_ALTAR]: [
        ITEM.CHAOS_TALISMAN,
        ITEM.CURSED_CHAOS_TALISMAN,
        ITEM.ENFEEBLED_CHAOS_TALISMAN
    ],
    [NATURE_ALTAR]: [
        ITEM.NATURE_TALISMAN,
        ITEM.CURSED_NATURE_TALISMAN,
        ITEM.ENFEEBLED_NATURE_TALISMAN
    ]
};

// bind-altar id -> [normal, cursed, enfeebled] talisman (parallel arrays, index matched with Runecraft.java
// TALISMANS/CURSED/ENFEEBLED, 9 active elements)
const BIND_ALTAR_TALISMANS = {
    1191: [ITEM.AIR_TALISMAN, ITEM.CURSED_AIR_TALISMAN, ITEM.ENFEEBLED_AIR_TALISMAN],
    1193: [ITEM.MIND_TALISMAN, ITEM.CURSED_MIND_TALISMAN, ITEM.ENFEEBLED_MIND_TALISMAN],
    1195: [ITEM.WATER_TALISMAN, ITEM.CURSED_WATER_TALISMAN, ITEM.ENFEEBLED_WATER_TALISMAN],
    1197: [ITEM.EARTH_TALISMAN, ITEM.CURSED_EARTH_TALISMAN, ITEM.ENFEEBLED_EARTH_TALISMAN],
    1199: [ITEM.FIRE_TALISMAN, ITEM.CURSED_FIRE_TALISMAN, ITEM.ENFEEBLED_FIRE_TALISMAN],
    1201: [ITEM.BODY_TALISMAN, ITEM.CURSED_BODY_TALISMAN, ITEM.ENFEEBLED_BODY_TALISMAN],
    1203: [ITEM.COSMIC_TALISMAN, ITEM.CURSED_COSMIC_TALISMAN, ITEM.ENFEEBLED_COSMIC_TALISMAN],
    1205: [ITEM.CHAOS_TALISMAN, ITEM.CURSED_CHAOS_TALISMAN, ITEM.ENFEEBLED_CHAOS_TALISMAN],
    1207: [ITEM.NATURE_TALISMAN, ITEM.CURSED_NATURE_TALISMAN, ITEM.ENFEEBLED_NATURE_TALISMAN]
    // Law(1209)/Death(1211)/Blood(1213): inactive in OpenRSC, no fancy talismans
};

// rune id -> charged talisman id (Runecraft.java talismanIds, 9 active)
const RUNE_TO_TALISMAN = {
    [ITEM.FIRE_RUNE]: ITEM.FIRE_TALISMAN,
    [ITEM.WATER_RUNE]: ITEM.WATER_TALISMAN,
    [ITEM.AIR_RUNE]: ITEM.AIR_TALISMAN,
    [ITEM.EARTH_RUNE]: ITEM.EARTH_TALISMAN,
    [ITEM.MIND_RUNE]: ITEM.MIND_TALISMAN,
    [ITEM.BODY_RUNE]: ITEM.BODY_TALISMAN,
    [ITEM.COSMIC_RUNE]: ITEM.COSMIC_TALISMAN,
    [ITEM.CHAOS_RUNE]: ITEM.CHAOS_TALISMAN,
    [ITEM.NATURE_RUNE]: ITEM.NATURE_TALISMAN
};

// charged-talisman id -> [requiredRunecraftLevel, imbueExp] (Runecraft.java
// talismanInformation, 9 active)
const TALISMAN_INFORMATION = {
    [ITEM.AIR_TALISMAN]: [1, 16],
    [ITEM.MIND_TALISMAN]: [2, 18],
    [ITEM.WATER_TALISMAN]: [5, 20],
    [ITEM.EARTH_TALISMAN]: [9, 22],
    [ITEM.FIRE_TALISMAN]: [14, 24],
    [ITEM.BODY_TALISMAN]: [20, 26],
    [ITEM.COSMIC_TALISMAN]: [27, 28],
    [ITEM.CHAOS_TALISMAN]: [35, 30],
    [ITEM.NATURE_TALISMAN]: [44, 32]
};

// active rune item ids (Runecraft.java RUNES, 9 active)
const ACTIVE_RUNES = [
    ITEM.FIRE_RUNE,
    ITEM.WATER_RUNE,
    ITEM.AIR_RUNE,
    ITEM.EARTH_RUNE,
    ITEM.MIND_RUNE,
    ITEM.BODY_RUNE,
    ITEM.CHAOS_RUNE,
    ITEM.COSMIC_RUNE,
    ITEM.NATURE_RUNE
];

// GameObject definitions (config/objects). object ids 1189..1235 are absent from rsc-data; appended so the id maps to
// a real def (name/commands drive the client right-click menu; the server keys on object id). even id 1190..1212 = "Mysterious Ruins" (Enter, model "mysterious ruins", 3x3, blocked): island entrance shrine. odd id 1191..1213 = "<Rune> Altar" (Bind, model "altar", 2x2, blocked): bind altar, reuses the base "altar" model (id 20). 1214..1226,1228..1235 = "Portal" (Exit/Take, model "portal", 1216..1226 are 2x2 else 1x1, unblocked). 1227 = "Raw Rune stone" (Mine, model "essencemine", 6x6, unblocked): rune-essence mine. "mysterious ruins"/"portal"/"essencemine" are custom OpenRSC models in custom-models.jag, resolvable by name

const ALTAR_MODEL = { name: 'altar', id: 20 };
// custom-model refs; model.id is nominal, the client resolves these names against custom-models.jag
const RUINS_MODEL = { name: 'mysterious ruins', id: 20 };
const PORTAL_MODEL = { name: 'portal', id: 20 };
const MINE_MODEL = { name: 'essencemine', id: 55 };

// rune title indexed by (oddAltarId - 1191) / 2, in ObjectRunecraft.xml order
const RUNE_ALTAR_TITLES = [
    'Air', 'Mind', 'Water', 'Earth', 'Fire', 'Body',
    'Cosmic', 'Chaos', 'Nature', 'Law', 'Death', 'Blood'
];

function buildAltarDefs() {
    // index-addressable defs appended to config/objects. 1189 is a filler so pushing lands the runecraft ids at their
    // exact indices through 1235
    const defs = [];

    // 1189: filler (unused id) so subsequent pushes align to real ids
    defs.push({
        name: 'nothing',
        description: '',
        commands: ['WalkTo', 'Examine'],
        model: ALTAR_MODEL,
        width: 1,
        height: 1,
        type: 'unblocked',
        itemHeight: 0
    });

    for (let id = 1190; id <= 1213; id += 1) {
        const isBind = id % 2 === 1;

        if (isBind) {
            const title = RUNE_ALTAR_TITLES[(id - 1191) / 2];
            defs.push({
                name: `${title} Altar`,
                description: 'A mysterious power eminates from this shrine',
                commands: ['Bind', 'Examine'],
                model: ALTAR_MODEL,
                width: 2,
                height: 2,
                type: 'blocked',
                itemHeight: 0
            });
        } else {
            defs.push({
                name: 'Mysterious Ruins',
                description: 'A mysterious power eminates from this shrine',
                commands: ['Enter', 'Examine'],
                model: RUINS_MODEL,
                width: 3,
                height: 3,
                type: 'blocked',
                itemHeight: 0
            });
        }
    }

    // 1214..1235: portals (1216..1226 are 2x2 per XML) with the mine at 1227
    for (let id = 1214; id <= 1235; id += 1) {
        if (id === 1227) {
            // rune-essence mine (RawRuneStone.java)
            defs.push({
                name: 'Raw Rune stone',
                description: 'A pile of raw rune stone',
                commands: ['Mine', 'Examine'],
                model: MINE_MODEL,
                width: 6,
                height: 6,
                type: 'unblocked',
                itemHeight: 0
            });
            continue;
        }

        const big = id >= 1216 && id <= 1226;
        defs.push({
            name: 'Portal',
            description: 'This will lead you out',
            commands: [id >= 1228 ? 'Take' : 'Exit', 'Examine'],
            model: PORTAL_MODEL,
            width: big ? 2 : 1,
            height: big ? 2 : 1,
            type: 'unblocked',
            itemHeight: 0
        });
    }

    return defs;
}

// scenery + npc spawns from oref/SceneryLocsRunecraft.json / oref/NpcLocsRunecraft.json. all 177 island scenery
// placements: ruins/altars (1190-1213), portals (1214-1226, 1228-1235), rune-essence mine (1227) via the appended custom defs; authentic decorative scenery (id <= 1188): Tree (0), Fern (34), Flower (37), henge (68), flower/blueflower (285), Rockslide (938) via base defs/models. ids 1210/1212 (Death/Blood entrance ruins) are not placed. mainland bind/temple-altar spawns (air 306,593 / mind 297,438 / etc.) included too

// authentic base scenery ids used by the island (defs + models ship in rsc-data / models36.jag). spawned as-is
// against the base defs
const BASE_SCENERY_IDS = new Set([0, 34, 37, 68, 285, 938]);

// every distinct object id in SceneryLocsRunecraft.json. custom ids (1190..1235) resolve to the appended defs, base
// ids to rsc-data defs. the allowlist: any id here has a resolvable def+model
const SPAWNABLE_OBJECT_IDS = (() => {
    const ids = new Set(BASE_SCENERY_IDS);
    for (let id = 1190; id <= 1235; id += 1) {
        ids.add(id);
    }
    return ids;
})();

const sceneryLocs = require('./runecraft-scenery.json');
const npcLocs = require('./runecraft-npcs.json');

function buildObjectSpawns() {
    const spawns = [];

    for (const s of sceneryLocs.sceneries) {
        if (!SPAWNABLE_OBJECT_IDS.has(s.id)) {
            continue;
        }

        spawns.push({
            id: s.id,
            direction: s.direction || 0,
            x: s.pos.X,
            y: s.pos.Y
        });
    }

    return spawns;
}

function buildNpcSpawns() {
    const spawns = [];

    for (const n of npcLocs.npclocs) {
        spawns.push({
            id: n.id,
            x: n.start.X,
            y: n.start.Y,
            minX: n.min.X,
            maxX: n.max.X,
            minY: n.min.Y,
            maxY: n.max.Y
        });
    }

    return spawns;
}

// rune-island Sector objects from the trimmed runecraft-islands.json (tiles pre-reoriented to 2003scape). assigned
// into landscape.sectors after parseArchives()

// widen the landscape sector array so the eastern islands (sx up to 69) fit. rsc-landscape ships MAX_X_SECTORS = 65
// (sx 48..64 -> max game X 815); the cluster reaches sx 69 (game X ~1055)
const MAX_X_SECTORS_NEW = 71;

// build [{ x, y, plane, sector }] from the extracted tiles. Sector is passed in by the caller
function buildRuneSectors(Sector) {
    // the 20 island sectors are baked into sp/landscape.cache by precompute-pathfinder.js; world.js's injection loop
    // is a runtime no-op. the landscape cache is required for the rune islands to exist
    return [];
}

module.exports = {
    SKILL_NAME,
    ITEM,
    RUNECRAFT_DEFS,
    TEMPLE_TELEPORTS,
    ALTAR_TALISMANS,
    BIND_ALTAR_TALISMANS,
    RUNE_TO_TALISMAN,
    TALISMAN_INFORMATION,
    ACTIVE_RUNES,
    RUNE_STONE_ROCK,
    buildAltarDefs,
    buildObjectSpawns,
    buildNpcSpawns,
    buildRuneSectors,
    MAX_X_SECTORS_NEW
};
