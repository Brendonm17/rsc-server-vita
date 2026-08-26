// memory + startup patch for the embedded single-player server; overrides prototype methods only. populateTiles
// becomes a no-op; Landscape.getTileAtGameCoords and PathFinder.addSector build a Tile on demand from the sector buffers

const Landscape = require('@2003scape/rsc-landscape/src/landscape');
const Sector = require('@2003scape/rsc-landscape/src/sector');
const Tile = require('@2003scape/rsc-landscape/src/tile');
const { PathFinder } = require('@2003scape/rsc-path-finder');

const SECTOR_WIDTH = 48;
const SECTOR_HEIGHT = 48;
const GAP_SIZE = 80;
const TILE_SIZE = 2;

// widen the sector grid so the eastern rune islands fit. rsc-landscape ships MAX_X_SECTORS = 65 (sx 48..64 -> max
// game X 815); the rune cluster reaches sx 69 (game X ~1055). grows the array to 71 columns, in initSectors and after the landscape cache is loaded
const MAX_X_SECTORS_WIDE = 71;
const MAX_Y_SECTORS = 56;
const MAX_PLANES = 4;

// pad landscape.sectors to at least MAX_X_SECTORS_WIDE columns, each a full [MAX_Y_SECTORS][MAX_PLANES] grid of
// nulls. idempotent
function ensureWideSectors(landscape) {
    if (!landscape.sectors) {
        return;
    }

    for (let i = landscape.sectors.length; i < MAX_X_SECTORS_WIDE; i += 1) {
        const column = [];

        for (let j = 0; j < MAX_Y_SECTORS; j += 1) {
            const planes = [];

            for (let k = 0; k < MAX_PLANES; k += 1) {
                planes.push(null);
            }

            column.push(planes);
        }

        landscape.sectors.push(column);
    }

    if (landscape.width < MAX_X_SECTORS_WIDE) {
        landscape.width = MAX_X_SECTORS_WIDE;
    }
}

module.exports = { ensureWideSectors, MAX_X_SECTORS_WIDE, hasLandscapeCache };

// Build a transient Tile from a sector's buffers (never stored).
function buildTile(sector, x, y) {
    const tile = new Tile({ sector, x, y });
    tile.populate();
    return tile;
}

// Don't build or retain the per-sector tile array.
Sector.prototype.populateTiles = function populateTilesLazy() {
    this.tiles = null;
};

// runtime lookup: identical plane/sector math to upstream, only the final tile fetch is an on-demand build
Landscape.prototype.getTileAtGameCoords = function getTileAtGameCoordsLazy(x, y) {
    let plane = 0;

    if (y >= 0 && y <= 1007) {
        plane = 0;
    } else if (y >= 1007 && y <= 1007 + 943) {
        plane = 1;
        y -= 943;
    } else if (y >= 1008 + 943 && y <= 1007 + 2 * 943) {
        plane = 2;
        y -= 943 * 2;
    } else {
        plane = 3;
        y -= 943 * 3;
    }

    const sectorX = Math.floor(x / 48) + this.minRegionX;
    const sectorY = Math.floor(y / 48) + this.minRegionY;
    const sector = this.sectors[sectorX][sectorY][plane];

    // upstream stores tiles x-reversed (lookup sector.tiles[47 - (x%48)][y%48]); building directly uses the
    // un-reversed coordinate x%48
    return buildTile(sector, x % 48, y % 48);
};

// pathfinder obstacle-map cache. when the host provides a precomputed cache whose size matches, load it and skip the
// build; falls back to building on any miss/mismatch. cache blob is ['RSPF', version=1, len(uint32 LE), <obstacleField bytes>]
const originalParseLandscape = PathFinder.prototype.parseLandscape;
PathFinder.prototype.parseLandscape = function parseLandscapeCached(landscape) {
    const host = globalThis.__host;
    // the shipped obstacle map is built from the full (members) landscape. a free-to-play world strips the members
    // sectors, so build it live instead of loading the cache
    if (landscape && landscape.__spMembersStripped) {
        originalParseLandscape.call(this, landscape);
        return;
    }
    if (host && typeof host.pathfinderCache === 'function') {
        const c = host.pathfinderCache();
        if (
            c && c.length >= 9 &&
            c[0] === 0x52 && c[1] === 0x53 && c[2] === 0x50 && c[3] === 0x46 && // RSPF
            c[4] === 1
        ) {
            const len = c[5] | (c[6] << 8) | (c[7] << 16) | (c[8] << 24);
            if (len === this.obstacleField.buffer.length && c.length === 9 + len) {
                this.obstacleField.buffer.set(c.subarray(9));
                return; // cache hit
            }
        }
    }
    originalParseLandscape.call(this, landscape);
};

// startup obstacle-map build: identical to upstream addSector except each tile is built on demand
PathFinder.prototype.addSector = function addSectorLazy(
    sector,
    sectorX,
    sectorY,
    sectorZ
) {
    const yOffset = sectorZ * SECTOR_HEIGHT * this.deltaY + sectorZ * GAP_SIZE;

    for (let x = 0; x < SECTOR_WIDTH; x += 1) {
        for (let y = 0; y < SECTOR_HEIGHT; y += 1) {
            if (sector) {
                // upstream reads sector.tiles[x][y], x-reversed, so the real tile coordinate is (47 - x)
                this.addTile(
                    buildTile(sector, 47 - x, y),
                    sectorX * SECTOR_WIDTH + x,
                    sectorY * SECTOR_HEIGHT + y + yOffset
                );
            } else {
                this.fillTile(
                    (sectorX * SECTOR_WIDTH + x) * TILE_SIZE,
                    (sectorY * SECTOR_HEIGHT + y + yOffset) * TILE_SIZE
                );
            }
        }
    }
};

// EntityList: replaces the js-quadtree spatial index with a flat hash grid (bucket = position >> GRID_SHIFT). add()
// is O(1). getInArea only scans buckets overlapping the query box, so a moved entity still in its spawn bucket is missed once it travels more than a bucket away. reindex() keeps each character in the bucket for its live position
const EntityList = require('../model/entity-list');

const GRID_SHIFT = 4; // 16x16-tile buckets
const GRID_STRIDE = 1 << 20; // bucketX * STRIDE + bucketY (bucketY well under 2^20)

function entityBucketKey(x, y) {
    return (x >> GRID_SHIFT) * GRID_STRIDE + (y >> GRID_SHIFT);
}

EntityList.prototype.add = function add(entity) {
    this.length += 1;

    if (this.grid === undefined) {
        this.grid = new Map();
        this.freeIndices = [];
    }

    // spatial grid; entity._bucketKey lets remove() find it again even after it has moved
    const key = entityBucketKey(entity.x, entity.y);
    entity._bucketKey = key;
    let bucket = this.grid.get(key);
    if (bucket === undefined) {
        bucket = [];
        this.grid.set(key, bucket);
    }
    bucket.push(entity);

    // dense index array + free-list, O(1), for getByIndex/getAll/getByID.
    let index;
    if (this.freeIndices.length > 0) {
        index = this.freeIndices.pop();
    } else {
        index = this.entities.length;
        this.entities.push(null);
    }
    entity.index = index;
    this.entities[index] = entity;

    return index;
};

EntityList.prototype.remove = function remove(entity) {
    if (this.entities[entity.index] !== entity) {
        return false;
    }

    this.entities[entity.index] = null;
    this.length -= 1;
    this.freeIndices.push(entity.index);

    const bucket = this.grid.get(entity._bucketKey);
    if (bucket !== undefined) {
        const i = bucket.indexOf(entity);
        if (i >= 0) {
            bucket.splice(i, 1);
        }
        if (bucket.length === 0) {
            this.grid.delete(entity._bucketKey);
        }
    }

    return true;
};

EntityList.prototype.getInArea = function getInArea(x, y, range) {
    x -= Math.floor(range / 2);
    y -= Math.floor(range / 2);

    const x1 = x + range;
    const y1 = y + range;
    const results = [];
    if (this.grid === undefined) {
        return results;
    }

    let bxStart = x >> GRID_SHIFT;
    if (bxStart < 0) bxStart = 0;
    let byStart = y >> GRID_SHIFT;
    if (byStart < 0) byStart = 0;
    const bxEnd = x1 >> GRID_SHIFT;
    const byEnd = y1 >> GRID_SHIFT;

    for (let bx = bxStart; bx <= bxEnd; bx += 1) {
        const col = bx * GRID_STRIDE;
        for (let by = byStart; by <= byEnd; by += 1) {
            const bucket = this.grid.get(col + by);
            if (bucket === undefined) {
                continue;
            }
            for (let i = 0; i < bucket.length; i += 1) {
                const e = bucket[i];
                if (e.x >= x && e.x <= x1 && e.y >= y && e.y <= y1) {
                    results.push(e);
                }
            }
        }
    }

    return results;
};

EntityList.prototype.getAtPoint = function getAtPoint(x, y) {
    const results = [];
    if (this.grid === undefined) {
        return results;
    }
    const bucket = this.grid.get(entityBucketKey(x, y));
    if (bucket === undefined) {
        return results;
    }
    for (let i = 0; i < bucket.length; i += 1) {
        const e = bucket[i];
        if (e.x === x && e.y === y) {
            results.push(e);
        }
    }
    return results;
};

// move an entity to the bucket for its current position. no-op unless the bucket actually changed
EntityList.prototype.reindex = function reindex(entity) {
    if (this.grid === undefined || entity._bucketKey === undefined) {
        return;
    }

    const key = entityBucketKey(entity.x, entity.y);
    if (key === entity._bucketKey) {
        return;
    }

    const old = this.grid.get(entity._bucketKey);
    if (old !== undefined) {
        const i = old.indexOf(entity);
        if (i >= 0) {
            old.splice(i, 1);
        }
        if (old.length === 0) {
            this.grid.delete(entity._bucketKey);
        }
    }

    let bucket = this.grid.get(key);
    if (bucket === undefined) {
        bucket = [];
        this.grid.set(key, bucket);
    }
    bucket.push(entity);
    entity._bucketKey = key;
};

// landscape cache: the host ships a precomputed blob of the fully parsed landscape (sectors + region bounds).
// deserializing it replaces bzip2-in-JS decompression of the map archives + parsing. the precompute has no __host, so getLandscapeCache() returns undefined there and the real loadJag/parseArchives build the blob
const worldCache = require('./world-cache');

let __lsCacheChecked = false;
let __lsCache; // deserialized { sectors, minRegionX, ... } or undefined
function getLandscapeCache() {
    if (__lsCacheChecked) {
        return __lsCache;
    }
    __lsCacheChecked = true;

    const host = globalThis.__host;
    if (host && typeof host.landscapeCache === 'function') {
        const blob = host.landscapeCache();
        if (
            blob &&
            blob.length > 5 &&
            blob[0] === 0x52 && // 'R'
            blob[1] === 0x53 && // 'S'
            blob[2] === 0x4c && // 'L'
            blob[3] === 0x43 && // 'C'
            blob[4] === 1 // version
        ) {
            __lsCache = worldCache.deserialize(blob.subarray(5));
        }
    }

    return __lsCache;
}

const __origLoadJag = Landscape.prototype.loadJag;
Landscape.prototype.loadJag = function loadJagMaybeCached(landBuffer, mapBuffer) {
    // with a cache, parseArchives supplies the sectors directly and the bzip2 decompress is skipped
    if (getLandscapeCache()) {
        return;
    }
    __origLoadJag.call(this, landBuffer, mapBuffer);
};

// loadMem is skipped the same way: upstream loadArchive() runs the bzip2-in-JS decompress at load time, for buffers
// the cached parseArchives never reads
const __origLoadMem = Landscape.prototype.loadMem;
Landscape.prototype.loadMem = function loadMemMaybeCached(landBuffer, mapBuffer) {
    if (getLandscapeCache()) {
        return;
    }
    __origLoadMem.call(this, landBuffer, mapBuffer);
};

// true when a valid landscape cache blob is available. world.js uses this to skip decoding the brfs-inlined jag/mem
// buffers
function hasLandscapeCache() {
    return !!getLandscapeCache();
}

const __origParseArchives = Landscape.prototype.parseArchives;
Landscape.prototype.parseArchives = function parseArchivesMaybeCached() {
    const cache = getLandscapeCache();
    if (cache) {
        this.sectors = cache.sectors;
        this.minRegionX = cache.minRegionX;
        this.minRegionY = cache.minRegionY;
        this.maxRegionX = cache.maxRegionX;
        this.maxRegionY = cache.maxRegionY;
        // idempotent; handles older/smaller blobs
        ensureWideSectors(this);
        return;
    }
    __origParseArchives.call(this);
    // Non-cache boot: parseArchives built the 65-wide array; widen it too.
    ensureWideSectors(this);
    // the custom terrain (rune islands + OpenRSC custom regions) ships only inside the landscape cache;
    // buildRuneSectors/buildCustomMapSectors return []. a boot without the cache gets the full base world but the custom regions miss terrain
    if (globalThis.__host) {
        console.error(
            '[sp] WARNING: no landscape cache, custom map regions and rune ' +
                'islands will be MISSING (rebuild/deploy sp/landscape.cache)'
        );
    }
};
