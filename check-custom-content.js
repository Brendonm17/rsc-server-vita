// full integration check: custom map placements, harvest objects, and skill data load without error
const baseItems = require('@2003scape/rsc-data/config/items');
const baseNpcs = require('@2003scape/rsc-data/config/npcs');
const baseObjects = require('@2003scape/rsc-data/config/objects');
const baseWalls = require('@2003scape/rsc-data/config/wall-objects');
const skillNames = require('@2003scape/rsc-data/skill-names');

// simulate entry.js custom-item/npc append for id resolution
const customItems = require('./src/sp/custom-items.json');
if (baseItems.length === 1290) for (const it of customItems) baseItems.push(it);
const customNpcs = require('./src/sp/custom-npcs.json');
if (baseNpcs.length === 794) for (const n of customNpcs) baseNpcs.push(n);

// runecraft injection (skill 19 + objects 1189..1235)
const runecraftData = require('./src/sp/runecraft-data');
if (skillNames.length === 18) skillNames.push(runecraftData.SKILL_NAME);
if (baseObjects.length === 1189) {
    for (const def of runecraftData.buildAltarDefs()) baseObjects.push(def);
}

// harvesting injection (skill 20 + objects 1236..1295)
const mapsData = require('./src/sp/custom-maps-data');
if (skillNames.length === 19) skillNames.push(mapsData.SKILL_NAME);
if (baseObjects.length === 1236) {
    for (const def of mapsData.buildObject2Defs()) baseObjects.push(def);
}

let errors = 0;
const fail = (m) => { console.log('  !! ' + m); errors++; };

console.log('=== skill names ===');
console.log('  ', skillNames.join(', '));
if (skillNames.length !== 20) fail(`expected 20 skills, got ${skillNames.length}`);
if (skillNames[19] !== 'harvesting') fail('skill 20 is not harvesting');

console.log('=== object table ===');
console.log('  length', baseObjects.length, '(want 1296, ids 0..1295)');
if (baseObjects.length !== 1296) fail('object table not length 1296');

// spot-check custom-map object defs
const spot = { 1243: 'Lemon Tree', 1274: 'Herb', 1284: 'Lava Forge', 1295: 'Stepping Stone', 1252: 'Exhausted Tree' };
for (const [id, name] of Object.entries(spot)) {
    const d = baseObjects[id];
    if (!d || d.name !== name) fail(`object ${id} = ${d && d.name} (want ${name})`);
    if (!d.commands) fail(`object ${id} has no commands`);
}
// 1262 cabbage unblocked, 1243 lemon tree blocked
if (baseObjects[1262].type !== 'unblocked') fail('1262 Cabbage should be unblocked');
if (baseObjects[1243].type !== 'blocked') fail('1243 Lemon Tree should be blocked');

console.log('=== spawns resolve ===');
const objSpawns = mapsData.buildObjectSpawns();
const npcSpawns = mapsData.buildNpcSpawns();
const boundarySpawns = mapsData.buildBoundarySpawns();
const groundSpawns = mapsData.buildGroundItemSpawns();
console.log(`  scenery ${objSpawns.length}, npc ${npcSpawns.length}, boundary ${boundarySpawns.length}, ground ${groundSpawns.length}`);

for (const s of objSpawns) {
    if (!baseObjects[s.id]) fail(`scenery spawn id ${s.id} has no object def`);
}
for (const n of npcSpawns) {
    if (!baseNpcs[n.id]) fail(`npc spawn id ${n.id} has no def`);
}
for (const b of boundarySpawns) {
    if (!baseWalls[b.id]) fail(`boundary spawn id ${b.id} has no wall def`);
}
for (const g of groundSpawns) {
    if (!baseItems[g.id]) fail(`ground item spawn id ${g.id} has no def`);
    if (g.respawn !== undefined && (g.respawn < 1000)) fail(`ground respawn ${g.respawn} looks like s not ms`);
}

console.log('=== harvest defs: prodId + depleted resolve ===');
for (const [objId, def] of Object.entries(mapsData.HARVEST_DEFS)) {
    if (!baseObjects[objId]) fail(`harvest object ${objId} has no def`);
    if (!baseItems[def.prodId]) fail(`harvest ${objId} prodId ${def.prodId} has no item def`);
    const depId = mapsData.getDepletedObjectId(def.prodId);
    if (!baseObjects[depId]) fail(`harvest ${objId} depleted obj ${depId} has no def`);
    if (!baseObjects[objId].commands.some((c) => /harvest/i.test(c)))
        fail(`harvest object ${objId} has no Harvest command`);
}
console.log(`  ${Object.keys(mapsData.HARVEST_DEFS).length} harvest objects OK`);

console.log('=== clip produce + herb table resolve ===');
for (const [objId, cp] of Object.entries(mapsData.CLIP_PRODUCE)) {
    if (!baseItems[cp.itemId]) fail(`clip ${objId} itemId ${cp.itemId} missing`);
    if (cp.edibleItemId && !baseItems[cp.edibleItemId]) fail(`clip ${objId} edible ${cp.edibleItemId} missing`);
    if (!baseObjects[objId].commands.some((c) => /clip/i.test(c)))
        fail(`clip object ${objId} has no Clip command`);
}
for (const h of mapsData.HERB_DROP_TABLE) {
    if (!baseItems[h.itemId]) fail(`herb ${h.itemId} missing`);
    console.log(`  herb ${h.itemId} "${baseItems[h.itemId].name}" w${h.weight} xp${h.xp}`);
}
const herbWeightSum = mapsData.HERB_DROP_TABLE.reduce((s, h) => s + h.weight, 0);
console.log(`  herb weight sum = ${herbWeightSum} (OpenRSC total 128)`);
if (herbWeightSum !== 128) fail(`herb weights sum ${herbWeightSum} != 128`);

console.log('=== tool items resolve ===');
for (const key of ['FRUIT_PICKER', 'HAND_SHOVEL', 'HERB_CLIPPERS', 'WATERING_CAN', 'EMPTY_WATERING_CAN', 'SOIL', 'BUCKET']) {
    const id = mapsData.ITEM[key];
    if (!baseItems[id]) fail(`tool ${key} id ${id} missing`);
    else console.log(`  ${key} = ${id} "${baseItems[id].name}"`);
}

console.log('=== terrain sectors build ===');
// lightweight Sector stub avoiding the browser-only canvas module
function SectorStub(opts) { Object.assign(this, opts); }
const sectors = mapsData.buildCustomMapSectors(SectorStub);
const maxSx = Math.max(...sectors.map((s) => s.x));
console.log(`  ${sectors.length} sectors, max sx = ${maxSx}`);
if (sectors.length !== 11) fail(`expected 11 terrain sectors, got ${sectors.length}`);
if (maxSx > 70) fail('sector sx exceeds MAX_X_SECTORS_WIDE-1 (70)');
// every sector carries a full 48x48 tile grid
for (const s of sectors) {
    if (!s.sector.tiles || s.sector.tiles.length !== 48 || s.sector.tiles[0].length !== 48)
        fail(`sector ${s.x},${s.y},${s.plane} tiles not 48x48`);
}

// plugin loads?
console.log('=== plugin loads ===');
const plugin = require('./src/plugins/skills/harvesting');
if (typeof plugin.onGameObjectCommandOne !== 'function') fail('plugin missing onGameObjectCommandOne');
if (typeof plugin.onGameObjectCommandTwo !== 'function') fail('plugin missing onGameObjectCommandTwo');
console.log('  harvesting plugin exports OK');

console.log(errors ? `\nFAILED: ${errors} errors` : '\nOK: full integration validated');
process.exit(errors ? 1 : 0);
