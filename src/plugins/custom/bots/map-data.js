// find the nearest routable facility/resource/shop from game data (objects.json, shops.json)
// routable = within reach of a waypoint-graph node

let OBJECTS = null, SHOPS = null, NODES = null, NPCS = null;
function data() {
    if (OBJECTS) { return; }
    try { OBJECTS = require('@2003scape/rsc-data/locations/objects.json') || []; } catch (e) { OBJECTS = []; }
    try { SHOPS = require('@2003scape/rsc-data/shops.json') || {}; } catch (e) { SHOPS = {}; }
    try { NPCS = require('@2003scape/rsc-data/locations/npcs.json') || []; } catch (e) { NPCS = []; }
    try { NODES = require('./waypoints.json').nodes || []; } catch (e) { NODES = []; }
}

// node spatial hash: is this tile near a routable node?
const CELL = 24;
const ROUTABLE_MAX = 16; // max tiles from a graph node to count as reachable
let _grid = null;
function grid() {
    if (_grid) { return _grid; }
    data();
    _grid = new Map();
    for (const n of NODES) {
        const nx = n.x != null ? n.x : n[0], ny = n.y != null ? n.y : n[1];
        const k = Math.floor(nx / CELL) + ',' + Math.floor(ny / CELL);
        let b = _grid.get(k); if (!b) { b = []; _grid.set(k, b); }
        b.push([nx, ny]);
    }
    return _grid;
}
function nearestNodeDist(x, y) {
    const g = grid();
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
            const b = g.get((cx + dx) + ',' + (cy + dy));
            if (!b) { continue; }
            for (const [nx, ny] of b) { const d = Math.abs(nx - x) + Math.abs(ny - y); if (d < best) { best = d; } }
        }
    }
    return best;
}
function routable(x, y) { return nearestNodeDist(x, y) <= ROUTABLE_MAX; }

// object instances by id (routable only), cached per id-set
const _siteCache = new Map();
function keyOf(idSet) { const a = [...idSet]; a.sort((x, y) => x - y); return a.join(','); }
// every routable [x,y] of any object whose id is in idSet
function objectSites(idSet) {
    data();
    const key = keyOf(idSet);
    let out = _siteCache.get(key);
    if (out) { return out; }
    out = [];
    const seen = new Set();
    for (const o of OBJECTS) {
        if (!idSet.has(o.id)) { continue; }
        const tk = o.x + ',' + o.y;
        if (seen.has(tk)) { continue; }
        if (!routable(o.x, o.y)) { continue; }
        seen.add(tk);
        out.push([o.x, o.y]);
    }
    _siteCache.set(key, out);
    return out;
}
// nearest routable site of the wanted object id(s); planeAware compares in-plane + a cross-floor cost
const PLANE_H = 944;
// opts: { planeAware, filter(x,y)->bool }; filter drops sites the bot may not use
function nearestSite(bot, ids, opts) {
    opts = opts || {};
    const idSet = ids instanceof Set ? ids : new Set(ids);
    const sites = objectSites(idSet);
    let best = null, bd = Infinity;
    const bpY = ((bot.y % PLANE_H) + PLANE_H) % PLANE_H, bPlane = Math.floor(bot.y / PLANE_H);
    for (const [x, y] of sites) {
        if (opts.filter && !opts.filter(x, y)) { continue; }
        let d;
        if (opts.planeAware) {
            const cPlane = Math.floor(y / PLANE_H), cpY = ((y % PLANE_H) + PLANE_H) % PLANE_H;
            d = Math.abs(bot.x - x) + Math.abs(bpY - cpY) + (cPlane !== bPlane ? 30 : 0);
        } else {
            d = Math.abs(bot.x - x) + Math.abs(bot.y - y);
        }
        if (d < bd) { bd = d; best = [x, y]; }
    }
    return best ? { x: best[0], y: best[1] } : null;
}
// how many routable instances exist
function siteCount(ids) { return objectSites(ids instanceof Set ? ids : new Set(ids)).length; }

// nearest routable object of the wanted id(s) on the anchor's plane within radius; null if none near
function nearestSiteNear(anchor, ids, opts) {
    opts = opts || {};
    const radius = opts.radius != null ? opts.radius : 48;
    const idSet = ids instanceof Set ? ids : (Array.isArray(ids) ? new Set(ids) : new Set([ids]));
    const sites = objectSites(idSet);
    const aPlane = Math.floor(anchor.y / PLANE_H), apY = ((anchor.y % PLANE_H) + PLANE_H) % PLANE_H;
    let best = null, bd = Infinity;
    for (const [x, y] of sites) {
        if (Math.floor(y / PLANE_H) !== aPlane) { continue; }
        const cpY = ((y % PLANE_H) + PLANE_H) % PLANE_H;
        const d = Math.abs(anchor.x - x) + Math.abs(apY - cpY);
        if (d > radius) { continue; }
        if (d < bd) { bd = d; best = [x, y]; }
    }
    return best ? { x: best[0], y: best[1] } : null;
}

// npc spawn instances by id (routable only), cached per id-set
// like objectSites but over npcs.json: nearest spawn of the wanted npc(s) anywhere
const _npcCache = new Map();
function npcSites(idSet) {
    data();
    const key = keyOf(idSet);
    let out = _npcCache.get(key);
    if (out) { return out; }
    out = [];
    const seen = new Set();
    for (const s of NPCS) {
        if (s.id == null || !idSet.has(s.id)) { continue; }
        const tk = s.x + ',' + s.y;
        if (seen.has(tk)) { continue; }
        if (!routable(s.x, s.y)) { continue; }
        seen.add(tk);
        out.push([s.x, s.y]);
    }
    _npcCache.set(key, out);
    return out;
}
// nearest routable spawn of the wanted npc id(s) -> { x, y } or null
function nearestNpc(bot, ids, opts) {
    opts = opts || {};
    const idSet = ids instanceof Set ? ids : (Array.isArray(ids) ? new Set(ids) : new Set([ids]));
    const sites = npcSites(idSet);
    let best = null, bd = Infinity;
    const bpY = ((bot.y % PLANE_H) + PLANE_H) % PLANE_H, bPlane = Math.floor(bot.y / PLANE_H);
    for (const [x, y] of sites) {
        if (opts.filter && !opts.filter(x, y)) { continue; }
        let d;
        if (opts.planeAware) {
            const cPlane = Math.floor(y / PLANE_H), cpY = ((y % PLANE_H) + PLANE_H) % PLANE_H;
            d = Math.abs(bot.x - x) + Math.abs(bpY - cpY) + (cPlane !== bPlane ? 30 : 0);
        } else {
            d = Math.abs(bot.x - x) + Math.abs(bot.y - y);
        }
        if (d < bd) { bd = d; best = [x, y]; }
    }
    return best ? { x: best[0], y: best[1] } : null;
}
function npcSiteCount(ids) { return npcSites(ids instanceof Set ? ids : new Set(Array.isArray(ids) ? ids : [ids])).length; }

// nearest routable spawn of the npc id(s) on the anchor's plane within radius; null if none near
function nearestNpcNear(anchor, ids, opts) {
    opts = opts || {};
    const radius = opts.radius != null ? opts.radius : 64;
    const idSet = ids instanceof Set ? ids : (Array.isArray(ids) ? new Set(ids) : new Set([ids]));
    const sites = npcSites(idSet);
    const aPlane = Math.floor(anchor.y / PLANE_H), apY = ((anchor.y % PLANE_H) + PLANE_H) % PLANE_H;
    let best = null, bd = Infinity;
    for (const [x, y] of sites) {
        if (Math.floor(y / PLANE_H) !== aPlane) { continue; } // same floor only
        const cpY = ((y % PLANE_H) + PLANE_H) % PLANE_H;
        const d = Math.abs(anchor.x - x) + Math.abs(apY - cpY);
        if (d > radius) { continue; } // must be the population at this anchor
        if (d < bd) { bd = d; best = [x, y]; }
    }
    return best ? { x: best[0], y: best[1] } : null;
}

// shops: every shop whose stock includes an item
let _sellersByItem = null;
function sellersIndex() {
    if (_sellersByItem) { return _sellersByItem; }
    data();
    _sellersByItem = new Map();
    for (const [model, shop] of Object.entries(SHOPS)) {
        const items = (shop && shop.items) || [];
        for (const it of items) {
            const id = it && (it.id != null ? it.id : it);
            if (id == null) { continue; }
            let arr = _sellersByItem.get(id); if (!arr) { arr = []; _sellersByItem.set(id, arr); }
            arr.push(model);
        }
    }
    return _sellersByItem;
}
// every shop-key that stocks itemId
function shopsSelling(itemId) { return sellersIndex().get(itemId) || []; }
// a shop-key that sells itemId, or null
function anyShopSelling(itemId) { const s = shopsSelling(itemId).filter(shopOpenable); return s.length ? s[0] : null; }

// shop-key -> its shopkeeper's tile; unlocated shops are bought in place
let SHOP_LOCS = null;
function shopLocs() { if (SHOP_LOCS) { return SHOP_LOCS; } try { SHOP_LOCS = require('./shop-locations.json') || {}; } catch (e) { SHOP_LOCS = {}; } return SHOP_LOCS; }
function shopLocation(model) { const l = shopLocs()[model]; return l && l.x != null ? l : null; }
// a shop some npc opens (located or not); a shop nobody opens is not for bots
function shopOpenable(model) { const l = shopLocs()[model]; return !!(l && (l.x != null || l.openable)); }
// nearest located shop that stocks itemId -> { model, x, y }, or null
function nearestShopSelling(bot, itemId) {
    let best = null, bd = Infinity;
    for (const m of shopsSelling(itemId)) {
        const loc = shopLocation(m);
        if (!loc || loc.x == null) { continue; }
        const d = Math.abs(bot.x - loc.x) + Math.abs(bot.y - loc.y);
        if (d < bd) { bd = d; best = { model: m, x: loc.x, y: loc.y }; }
    }
    return best;
}
// where a bot buys itemId: nearest located shop, else buy in place; null if no shop stocks it
function buySpot(bot, itemId) {
    const near = nearestShopSelling(bot, itemId);
    if (near) { near.located = true; return near; }
    const any = anyShopSelling(itemId);
    if (any) { return { model: any, x: bot.x, y: bot.y, located: false }; }
    return null;
}

// general stores (shops.json general:true, located)
let _generals = null;
function generalStores() {
    if (_generals) { return _generals; }
    data();
    _generals = [];
    for (const [model, shop] of Object.entries(SHOPS)) {
        if (!shop || !shop.general) { continue; }
        const loc = shopLocation(model);
        if (!loc || loc.x == null) { continue; }
        _generals.push({ model, x: loc.x, y: loc.y });
    }
    return _generals;
}
function nearestGeneralStore(bot) {
    let best = null, bd = Infinity;
    for (const s of generalStores()) {
        const d = Math.abs(bot.x - s.x) + Math.abs(bot.y - s.y);
        if (d < bd) { bd = d; best = s; }
    }
    return best;
}

module.exports = { nearestSite, nearestSiteNear, siteCount, objectSites, nearestNpc, nearestNpcNear, npcSites, npcSiteCount, routable, nearestNodeDist, shopsSelling, anyShopSelling, shopLocation, nearestShopSelling, buySpot, generalStores, nearestGeneralStore };
