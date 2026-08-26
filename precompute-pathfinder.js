// build the pathfinder obstacle map and serialize to dist/pathfinder.cache. format: 'RSPF' + version(1) + len(uint32
// LE) + obstacleField bytes; stub the unused canvas module
const canvasPath = require.resolve('canvas');
require.cache[canvasPath] = {
    id: canvasPath,
    filename: canvasPath,
    loaded: true,
    exports: {}
};

require('./src/sp/landscape-fast'); // same on-demand path the runtime uses
const { Landscape } = require('@2003scape/rsc-landscape');
const { PathFinder } = require('@2003scape/rsc-path-finder');
const objects = require('@2003scape/rsc-data/config/objects');
const wallObjects = require('@2003scape/rsc-data/config/wall-objects');
const tiles = require('@2003scape/rsc-data/config/tiles');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'node_modules/@2003scape/rsc-data/landscape');
const land = fs.readFileSync(path.join(dataDir, 'land63.jag'));
const maps = fs.readFileSync(path.join(dataDir, 'maps63.jag'));

const landscape = new Landscape();
landscape.loadJag(land, maps);
// full map, members included; each sector flagged sector.members, stripped for free worlds (world.js)
landscape.loadMem(
    fs.readFileSync(path.join(dataDir, 'land63.mem')),
    fs.readFileSync(path.join(dataDir, 'maps63.mem'))
);
landscape.parseArchives();

// inject custom terrain (rune islands + OpenRSC custom-map regions): read the raw JSONs and bake sectors into the
// landscape before serialization; the runtime builders return []
const Sector = require('@2003scape/rsc-landscape/src/sector');

function injectSectors(sectorsObj) {
    for (const key of Object.keys(sectorsObj)) {
        const s = sectorsObj[key];

        // normalize invalid diagonal walls: a valid diagonal overlay is always >= 1 (raw 0 = no wall); drop {
        // overlay: 0 } diagonals
        for (const column of s.tiles) {
            if (!column) continue;
            for (const tile of column) {
                if (tile && tile.wall && tile.wall.diagonal &&
                    !tile.wall.diagonal.overlay) {
                    tile.wall.diagonal = null;
                }
            }
        }

        const sector = new Sector({
            x: s.x,
            y: s.y,
            plane: s.plane,
            members: true,
            tiles: s.tiles
        });

        // drop the Sector constructor's 48x48 Tile array, matching base sectors (populateTiles no-op'd by
        // landscape-fast.js)
        sector.tiles = null;

        // mark injected custom terrain so the free-world members-sector strip in world.js skips it (kept on every
        // world type)
        sector.custom = true;

        if (landscape.sectors[s.x] && landscape.sectors[s.x][s.y]) {
            landscape.sectors[s.x][s.y][s.plane] = sector;
            if (landscape.maxRegionX === null || s.x > landscape.maxRegionX) {
                landscape.maxRegionX = s.x;
            }
            if (landscape.maxRegionY === null || s.y > landscape.maxRegionY) {
                landscape.maxRegionY = s.y;
            }
        }
    }
}

injectSectors(
    JSON.parse(fs.readFileSync('src/sp/runecraft-islands.json', 'utf8')).sectors
);
injectSectors(
    JSON.parse(fs.readFileSync('src/sp/custom-maps.json', 'utf8')).sectors
);

// landscape cache: post-injection landscape (sectors + grown region bounds)
const worldCache = require('./src/sp/world-cache');
const landscapeBlob = worldCache.serialize({
    sectors: landscape.sectors,
    minRegionX: landscape.minRegionX,
    minRegionY: landscape.minRegionY,
    maxRegionX: landscape.maxRegionX,
    maxRegionY: landscape.maxRegionY
});

const pf = new PathFinder({ objects, wallObjects, tiles }, landscape);
const obstacles = Buffer.from(pf.obstacleField.buffer);

const header = Buffer.alloc(9);
header.write('RSPF', 0, 'ascii');
header.writeUInt8(1, 4); // version
header.writeUInt32LE(obstacles.length, 5);

const out = path.join(__dirname, 'dist/pathfinder.cache');
fs.writeFileSync(out, Buffer.concat([header, obstacles]));
console.log(
    'wrote ' + out + ': ' + (header.length + obstacles.length) +
    ' bytes (' + obstacles.length + ' obstacle bytes)'
);

// landscape cache: fully parsed sectors + region bounds (serialized above, pre-injection)
const lsHeader = Buffer.alloc(5);
lsHeader.write('RSLC', 0, 'ascii');
lsHeader.writeUInt8(1, 4); // version
const lsOut = path.join(__dirname, 'dist/landscape.cache');
fs.writeFileSync(lsOut, Buffer.concat([lsHeader, landscapeBlob]));
console.log(
    'wrote ' + lsOut + ': ' + (lsHeader.length + landscapeBlob.length) + ' bytes'
);
