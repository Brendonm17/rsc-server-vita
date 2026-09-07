// memory and startup patch for the embedded single-player server; overrides
// prototype methods so tiles are never retained.
// rsc-landscape retains a Tile object per tile (~205 MB under QuickJS), but
// tiles are just a view of the sector buffers. populateTiles becomes a no-op
// and the two callers build a tile on demand instead:
//   - Landscape.getTileAtGameCoords  (runtime lookups)
//   - PathFinder.addSector           (startup obstacle-map build)

const Landscape = require('@2003scape/rsc-landscape/src/landscape');
const Sector = require('@2003scape/rsc-landscape/src/sector');
const Tile = require('@2003scape/rsc-landscape/src/tile');
const { PathFinder } = require('@2003scape/rsc-path-finder');

const SECTOR_WIDTH = 48;
const SECTOR_HEIGHT = 48;
const GAP_SIZE = 80;
const TILE_SIZE = 2;

// widen the sector grid to 71 columns so the eastern rune islands (sx up to 69)
// fit; the stock array is only 65 wide
const MAX_X_SECTORS_WIDE = 71;
const MAX_Y_SECTORS = 56;
const MAX_PLANES = 4;

// pad landscape.sectors out to MAX_X_SECTORS_WIDE columns of null planes
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

module.exports = { ensureWideSectors, MAX_X_SECTORS_WIDE, hasLandscapeCache, bindNativePathfinder };

// build a transient tile from a sector's buffers, never stored
function buildTile(sector, x, y) {
    const tile = new Tile({ sector, x, y });
    tile.populate();
    return tile;
}

// Don't build or retain the per-sector tile array.
Sector.prototype.populateTiles = function populateTilesLazy() {
    this.tiles = null;
};

// Runtime lookup, identical plane/sector math to upstream; only the final tile
// fetch is replaced with an on-demand build.
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

    // upstream stores tiles x-reversed; building directly uses x%48
    return buildTile(sector, x % 48, y % 48);
};

// load a precomputed pathfinder obstacle-map cache when its size matches,
// otherwise build it. blob is [ 'RSPF', version, len(uint32 LE), bytes ]
const originalParseLandscape = PathFinder.prototype.parseLandscape;
function parseLandscapeCached(landscape) {
    const host = globalThis.__host;
    // a free-to-play world strips the members sectors, so build its obstacle
    // map live instead of loading the full-members cache
    if (landscape && landscape.__spMembersStripped) {
        originalParseLandscape.call(this, landscape);
        return;
    }
    if (host && typeof host.pathfinderCache === 'function') {
        const c = host.pathfinderCache();
        if (
            c && c.length >= 9 &&
            c[0] === 0x52 && c[1] === 0x53 && c[2] === 0x50 && c[3] === 0x46 && // RSPF
            (c[4] === 1 || c[4] === 2)
        ) {
            const len = c[5] | (c[6] << 8) | (c[7] << 16) | (c[8] << 24);
            if (len === this.obstacleField.buffer.length && c.length === 9 + len) {
                this.obstacleField.buffer.set(c.subarray(9));
                // v2 bakes in every object, so loadEntities skips obstacle adds
                this.__objectsBaked = c[4] === 2;
                return; // cache hit
            }
        }
    }
    originalParseLandscape.call(this, landscape);
}

// hand the obstacle bitfield to the host zero-copy so native C does bot
// pathfinding and sees door bits flipped later
function bindNativePathfinder(pathFinder) {
    const host = globalThis.__host;
    globalThis.__spNativePath = false;

    if (!host || typeof host.pathBind !== 'function') {
        return;
    }

    try {
        globalThis.__spNativePath =
            host.pathBind(pathFinder.width, pathFinder.height, pathFinder.obstacleField.buffer) === true;
    } catch (e) {
        globalThis.__spNativePath = false;
    }

    // step validity via one host call instead of the JS method's many reads
    if (globalThis.__spNativePath && typeof host.validStep === 'function' && !pathFinder.__nativeStep) {
        const jsValid = pathFinder.isValidGameStep;
        pathFinder.isValidGameStep = function isValidGameStepNative(start, delta) {
            // only integers go to the C grid; the JS check answers undefined/NaN
            if (
                !Number.isInteger(delta.deltaX) ||
                !Number.isInteger(delta.deltaY) ||
                !Number.isInteger(start.x) ||
                !Number.isInteger(start.y)
            ) {
                return jsValid.call(this, start, delta);
            }
            const r = host.validStep(start.x, start.y, delta.deltaX, delta.deltaY);
            return r === null ? jsValid.call(this, start, delta) : r === true;
        };
        pathFinder.__nativeStep = true;
    }
}

PathFinder.prototype.parseLandscape = function parseLandscapeNative(landscape) {
    parseLandscapeCached.call(this, landscape);
    bindNativePathfinder(this);
};

// startup obstacle-map build, like upstream addSector but tiles built on demand
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
                // upstream tiles are x-reversed, so the real x is (47 - x)
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

// replace the js-quadtree spatial index with a flat hash grid (bucket =
// position >> GRID_SHIFT), giving O(1) add and O(n) build. getInArea only scans
// buckets overlapping the query box, so reindex() (below) re-buckets a moved
// character each tick. the quadtree is still constructed but unused.
const EntityList = require('../model/entity-list');

const GRID_SHIFT = 4; // 16x16-tile buckets
const GRID_STRIDE = 1 << 20; // bucketX * STRIDE + bucketY (bucketY well under 2^20)

function entityBucketKey(x, y) {
    return (x >> GRID_SHIFT) * GRID_STRIDE + (y >> GRID_SHIFT);
}

// per-tile occupancy for getAtPoint: y stays under 4096 (four planes of 944)
const TILE_STRIDE = 4096;

function entityTileKey(x, y) {
    return x * TILE_STRIDE + y;
}

function tileInsert(list, entity, key) {
    let tile = list.tiles.get(key);
    if (tile === undefined) {
        tile = [];
        list.tiles.set(key, tile);
    }
    tile.push(entity);
    entity._tileKey = key;
}

function tileRemove(list, entity) {
    const tile = list.tiles.get(entity._tileKey);
    if (tile !== undefined) {
        const i = tile.indexOf(entity);
        if (i >= 0) {
            tile.splice(i, 1);
        }
        if (tile.length === 0) {
            list.tiles.delete(entity._tileKey);
        }
    }
}

EntityList.prototype.add = function add(entity) {
    this.length += 1;

    if (this.grid === undefined) {
        this.grid = new Map();
        this.tiles = new Map();
        this.freeIndices = [];
    }

    // entity._bucketKey lets remove() find the entity even after it moves
    const key = entityBucketKey(entity.x, entity.y);
    entity._bucketKey = key;
    let bucket = this.grid.get(key);
    if (bucket === undefined) {
        bucket = [];
        this.grid.set(key, bucket);
    }
    bucket.push(entity);
    tileInsert(this, entity, entityTileKey(entity.x, entity.y));

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
    tileRemove(this, entity);

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
    if (this.tiles === undefined) {
        return results;
    }
    const tile = this.tiles.get(entityTileKey(x, y));
    if (tile === undefined) {
        return results;
    }
    for (let i = 0; i < tile.length; i += 1) {
        const e = tile[i];
        if (e.x === x && e.y === y) {
            results.push(e);
        }
    }
    return results;
};

// move an entity to the bucket for its current position; called once per tick
// per character, a no-op unless the bucket changed
EntityList.prototype.reindex = function reindex(entity) {
    if (this.grid === undefined || entity._bucketKey === undefined) {
        return;
    }

    // the tile entry follows every step
    const tkey = entityTileKey(entity.x, entity.y);
    if (tkey !== entity._tileKey) {
        tileRemove(this, entity);
        tileInsert(this, entity, tkey);
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

// landscape cache: load a precomputed blob of the parsed landscape instead of
// decompressing and parsing the map archives on device. without __host,
// getLandscapeCache() returns undefined and the real load runs to build it.
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
            blob.length > 8 &&
            blob[0] === 0x52 && // 'R'
            blob[1] === 0x53 && // 'S'
            blob[2] === 0x4c && // 'L'
            blob[3] === 0x43 && // 'C'
            (blob[4] === 1 || blob[4] === 2) // version
        ) {
            // v1: 5-byte header, copied arrays; v2: 8-byte header, aligned views
            __lsCache = blob[4] === 2
                ? worldCache.deserialize(blob.subarray(8), 2)
                : worldCache.deserialize(blob.subarray(5), 1);
        }
    }

    return __lsCache;
}

const __origLoadJag = Landscape.prototype.loadJag;
Landscape.prototype.loadJag = function loadJagMaybeCached(landBuffer, mapBuffer) {
    // with a cache, parseArchives supplies the sectors, so skip the decompress
    if (getLandscapeCache()) {
        return;
    }
    __origLoadJag.call(this, landBuffer, mapBuffer);
};

// skip the mem-archive decompress with a cache, the same as loadJag
const __origLoadMem = Landscape.prototype.loadMem;
Landscape.prototype.loadMem = function loadMemMaybeCached(landBuffer, mapBuffer) {
    if (getLandscapeCache()) {
        return;
    }
    __origLoadMem.call(this, landBuffer, mapBuffer);
};

// true when a valid landscape cache blob is available
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
        // kept for older/smaller blobs
        ensureWideSectors(this);
        return;
    }
    __origParseArchives.call(this);
    // non-cache boot: widen the 65-wide array parseArchives built
    ensureWideSectors(this);
    // the custom terrain (rune islands + custom regions) ships only in the
    // landscape cache, so a boot without it is missing those regions
    if (globalThis.__host) {
        console.error(
            '[sp] WARNING: no landscape cache, custom map regions and rune ' +
                'islands will be MISSING (rebuild/deploy sp/landscape.cache)'
        );
    }
};
