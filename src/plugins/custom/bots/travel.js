// cross-map travel over the waypoint graph, chaining local BFS node-to-node so a bot
// can walk across the map. stateful per bot: begin() plans a route, step() advances one leg per tick.

const { findPathTo, findPathAdjacent } = require('./pathfind');
let _personality = null;
function personalityOf(bot) {
    try { return (_personality || (_personality = require('./personality'))).of(bot); } catch (e) { return null; }
}
const graph = require('./waypoints.json');

const NODES = graph.nodes; // [ [x,y], ... ] indexed by node id
const FACILITIES = graph.facilities; // name -> { node, target:{x,y}, dist }

// adjacency lives in the CSR arrays below (ROUTE_ADJ_START/TO/COST), built from the edge list

// stair/ladder edges: crossing one means climbing; a->b is up/down, the reverse the opposite.
// lets travel route across floors and dungeons.
const STAIRS = new Map();
for (const s of graph.stairs || []) {
    STAIRS.set(`${s.a}-${s.b}`, { x: s.x, y: s.y, up: s.up });
    STAIRS.set(`${s.b}-${s.a}`, { x: s.x, y: s.y, up: !s.up });
}
function stairBetween(a, b) {
    return STAIRS.get(`${a}-${b}`) || null;
}

// portal edges: a crossing between disconnected regions; the bot walks to the near end,
// is moved to the far end, then walks on.
const PORTALS = new Set();
for (const [a, b] of graph.portals || []) {
    PORTALS.add(`${a}-${b}`);
    PORTALS.add(`${b}-${a}`);
}
function isPortal(a, b) {
    return PORTALS.has(`${a}-${b}`);
}

const PLANE = 944; // planeElevation; floor = y/PLANE
function planeOf(y) {
    return Math.floor(y / PLANE);
}

// A* node budget for one node-to-node hop; must be >= the generator's edge-validation budget
const HOP_BUDGET = 6000;
const ARRIVE = 1; // tiles: "reached an intermediate waypoint"
const FINAL_ARRIVE = 3; // tiles: close enough to the destination (often an NPC tile)

// the node-hop BFS is travel's only heavy op; cap how many run per world tick across all bots.
// a bot that misses its slot walks its existing queue or waits a tick.
const MAX_HOPS_PER_TICK = 2;
let hopTick = -1;
let hopsThisTick = 0;

function takeHopSlot(world) {
    const wt = world.ticks || 0;
    if (wt !== hopTick) {
        hopTick = wt;
        hopsThisTick = 0;
    }
    if (hopsThisTick >= MAX_HOPS_PER_TICK) {
        return false;
    }
    hopsThisTick += 1;
    return true;
}

function nodeCoord(id) {
    return { x: NODES[id][0], y: NODES[id][1] };
}

function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

// nearest graph node to (x,y). nodes are bucketed by cell; nearestNode searches rings of
// cells outward, stopping once no farther ring can hold a closer node (same answer as a full scan).
const NODE_CELL = 32;
const NODE_GRID = new Map();
let NODE_CELL_MAX_X = 0;
let NODE_CELL_MAX_Y = 0;
for (let id = 0; id < NODES.length; id += 1) {
    const cx = (NODES[id][0] / NODE_CELL) | 0;
    const cy = (NODES[id][1] / NODE_CELL) | 0;
    const key = cx * 65536 + cy;
    let bucket = NODE_GRID.get(key);
    if (bucket === undefined) {
        bucket = [];
        NODE_GRID.set(key, bucket);
    }
    bucket.push(id);
    if (cx > NODE_CELL_MAX_X) NODE_CELL_MAX_X = cx;
    if (cy > NODE_CELL_MAX_Y) NODE_CELL_MAX_Y = cy;
}
function nearestNode(x, y) {
    let best = -1;
    let bestD = Infinity;
    const cx = (x / NODE_CELL) | 0;
    const cy = (y / NODE_CELL) | 0;
    const maxRing = Math.max(cx, NODE_CELL_MAX_X - cx, cy, NODE_CELL_MAX_Y - cy) + 1;
    for (let r = 0; r <= maxRing; r += 1) {
        // a node at ring r or beyond is >= (r-1)*NODE_CELL+1 tiles away; stop once best is closer
        if (r > 0 && bestD <= (r - 1) * NODE_CELL) {
            break;
        }
        for (let dx = -r; dx <= r; dx += 1) {
            const gx = cx + dx;
            if (gx < 0 || gx > NODE_CELL_MAX_X) continue;
            const edge = Math.abs(dx) === r;
            for (let dy = -r; dy <= r; dy += 1) {
                if (!edge && Math.abs(dy) !== r) continue;
                const gy = cy + dy;
                if (gy < 0 || gy > NODE_CELL_MAX_Y) continue;
                const bucket = NODE_GRID.get(gx * 65536 + gy);
                if (bucket === undefined) continue;
                for (let i = 0; i < bucket.length; i += 1) {
                    const id = bucket[i];
                    const d = manhattan(x, y, NODES[id][0], NODES[id][1]);
                    if (d < bestD || (d === bestD && id < best)) {
                        bestD = d;
                        best = id;
                    }
                }
            }
        }
    }
    return best;
}
// the straight scan, kept for the equivalence check
function nearestNodeScan(x, y) {
    let best = -1;
    let bestD = Infinity;
    for (let id = 0; id < NODES.length; id += 1) {
        const d = manhattan(x, y, NODES[id][0], NODES[id][1]);
        if (d < bestD) {
            bestD = d;
            best = id;
        }
    }
    return best;
}

// binary min-heap of {node, dist}, keeping Dijkstra at O(E log V)
class MinHeap {
    constructor() {
        this.a = [];
    }
    get size() {
        return this.a.length;
    }
    push(node, dist) {
        const a = this.a;
        a.push({ node, dist });
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p].dist <= a[i].dist) break;
            const t = a[p];
            a[p] = a[i];
            a[i] = t;
            i = p;
        }
    }
    pop() {
        const a = this.a;
        const top = a[0];
        const last = a.pop();
        if (a.length) {
            a[0] = last;
            let i = 0;
            const n = a.length;
            for (;;) {
                const l = 2 * i + 1;
                const r = 2 * i + 2;
                let s = i;
                if (l < n && a[l].dist < a[s].dist) s = l;
                if (r < n && a[r].dist < a[s].dist) s = r;
                if (s === i) break;
                const t = a[s];
                a[s] = a[i];
                a[i] = t;
                i = s;
            }
        }
        return top;
    }
}

// Dijkstra shortest node path from -> to (inclusive) on typed arrays (generation-stamped),
// with a (from,to) result cache. returns [ids] or null.
const ROUTE_N = NODES.length;
const EDGES = graph.edges; // [ [a, b, cost], ... ], undirected
const ROUTE_ADJ_START = new Int32Array(ROUTE_N + 1);
for (let i = 0; i < EDGES.length; i += 1) {
    const e = EDGES[i];
    ROUTE_ADJ_START[e[0] + 1] += 1;
    ROUTE_ADJ_START[e[1] + 1] += 1;
}
for (let i = 0; i < ROUTE_N; i += 1) {
    ROUTE_ADJ_START[i + 1] += ROUTE_ADJ_START[i];
}
const ROUTE_ADJ_TO = new Int32Array(ROUTE_ADJ_START[ROUTE_N]);
const ROUTE_ADJ_COST = new Float64Array(ROUTE_ADJ_START[ROUTE_N]);
{
    // each node's neighbours in edge-list order, both directions
    const fill = new Int32Array(ROUTE_N);
    for (let i = 0; i < EDGES.length; i += 1) {
        const e = EDGES[i];
        const a = e[0];
        const b = e[1];
        const c = e[2];
        let k = ROUTE_ADJ_START[a] + fill[a];
        fill[a] += 1;
        ROUTE_ADJ_TO[k] = b;
        ROUTE_ADJ_COST[k] = c;
        k = ROUTE_ADJ_START[b] + fill[b];
        fill[b] += 1;
        ROUTE_ADJ_TO[k] = a;
        ROUTE_ADJ_COST[k] = c;
    }
}
const routeDist = new Float64Array(ROUTE_N);
const routePrev = new Int32Array(ROUTE_N);
const routeSeen = new Uint32Array(ROUTE_N); // === routeGen: dist/prev valid
const routeDone = new Uint32Array(ROUTE_N); // === routeGen: settled
let routeGen = 0;
const ROUTE_CACHE = new Map();
const ROUTE_CACHE_MAX = 4096;

function route(from, to) {
    if (from === to) {
        return [from];
    }
    if (from < 0 || to < 0 || from >= ROUTE_N || to >= ROUTE_N) {
        return null;
    }

    const cacheKey = from * ROUTE_N + to;
    const cached = ROUTE_CACHE.get(cacheKey);
    if (cached !== undefined) {
        return cached === null ? null : cached.slice();
    }

    routeGen += 1;
    if (routeGen === 0xffffffff) {
        routeSeen.fill(0);
        routeDone.fill(0);
        routeGen = 1;
    }
    const gen = routeGen;

    const heap = new MinHeap();
    routeDist[from] = 0;
    routePrev[from] = -1;
    routeSeen[from] = gen;
    heap.push(from, 0);

    while (heap.size) {
        const top = heap.pop();
        const u = top.node;
        const ud = top.dist;
        if (routeDone[u] === gen) {
            continue; // stale heap entry (lazy decrease-key)
        }
        routeDone[u] = gen;
        if (u === to) {
            break;
        }
        const end = ROUTE_ADJ_START[u + 1];
        for (let k = ROUTE_ADJ_START[u]; k < end; k += 1) {
            const v = ROUTE_ADJ_TO[k];
            if (routeDone[v] === gen) {
                continue;
            }
            const nd = ud + ROUTE_ADJ_COST[k];
            if (routeSeen[v] !== gen || nd < routeDist[v]) {
                routeSeen[v] = gen;
                routeDist[v] = nd;
                routePrev[v] = u;
                heap.push(v, nd);
            }
        }
    }

    let result = null;
    if (routeDone[to] === gen) {
        const path = [];
        let cur = to;
        while (cur !== -1 && cur !== from) {
            path.push(cur);
            cur = routePrev[cur];
        }
        if (cur === from) {
            path.push(from);
            path.reverse();
            result = path;
        }
    }

    if (ROUTE_CACHE.size >= ROUTE_CACHE_MAX) {
        ROUTE_CACHE.clear();
    }
    ROUTE_CACHE.set(cacheKey, result);

    return result === null ? null : result.slice();
}

// resolve a destination -> { node, coord }; dest is a facility name or {x,y}
function resolveDest(dest) {
    if (typeof dest === 'string') {
        const f = FACILITIES[dest];
        if (!f) {
            return null;
        }
        return { node: f.node, coord: f.target };
    }
    if (dest && typeof dest.x === 'number') {
        return { node: nearestNode(dest.x, dest.y), coord: dest };
    }
    return null;
}

// a destination whose journey fails twice within 600 ticks is refused for NO_ROUTE_TICKS
const NO_ROUTE_TICKS = 1200;
function destKeyOf(d) { return d && d.coord ? d.coord.x + ',' + d.coord.y : null; }
function journeyFailed(bot, t) {
    if (!bot || !t || !t.destKey) return;
    const now = (bot.world && bot.world.ticks) | 0;
    const fails = bot._routeFails || (bot._routeFails = {});
    const f = fails[t.destKey] || { n: 0, at: 0 };
    f.n = now - f.at < 600 ? f.n + 1 : 1;
    f.at = now;
    fails[t.destKey] = f;
    if (f.n >= 2) { (bot._noRoute || (bot._noRoute = {}))[t.destKey] = now + NO_ROUTE_TICKS; f.n = 0; }
}

// plan a route and stash it on the bot; returns true if a route was found
function begin(bot, dest) {
    const d = resolveDest(dest);
    if (!d) {
        bot._travel = null;
        return false;
    }
    const destKey = destKeyOf(d);
    if (destKey && bot._noRoute && bot._noRoute[destKey] > ((bot.world && bot.world.ticks) | 0)) {
        bot._travel = null;
        return false;
    }

    const startNode = nearestNode(bot.x, bot.y);
    const nodePath = route(startNode, d.node);
    if (!nodePath) {
        bot._travel = null;
        return false;
    }

    // waypoint tile list: each node's tile, then the exact destination tile.
    const waypoints = nodePath.map(nodeCoord);
    waypoints.push(d.coord);

    // mark arrivals that require a climb: stairAt[stage] = { x, y, up } of the stair object
    const stairAt = {};
    const portalAt = {};
    for (let i = 1; i < nodePath.length; i += 1) {
        const st = stairBetween(nodePath[i - 1], nodePath[i]);
        if (st) {
            stairAt[i] = st;
        } else if (isPortal(nodePath[i - 1], nodePath[i])) {
            portalAt[i] = true;
        }
    }

    bot._travel = {
        waypoints,
        stairAt,
        portalAt,
        stage: 0,
        destKey,
        name: typeof dest === 'string' ? dest : null
    };
    return true;
}

function isTraveling(bot) {
    return !!bot._travel;
}

function cancel(bot) {
    bot._travel = null;
}

// tiles occupied by a hostile NPC, which travel must route around. the scan is scoped to
// the bot-to-waypoint span plus a margin, capped at a 50-tile radius.
const NPC_SCAN_MARGIN = 8;
const NPC_SCAN_MIN_RADIUS = 12;
const NPC_SCAN_MAX_RADIUS = 50;
function blockedNpcTiles(bot, wp) {
    let radius = NPC_SCAN_MAX_RADIUS;
    if (wp) {
        const span = Math.max(Math.abs(bot.x - wp.x), Math.abs(bot.y - wp.y));
        radius = Math.max(NPC_SCAN_MIN_RADIUS, Math.min(NPC_SCAN_MAX_RADIUS, span + NPC_SCAN_MARGIN));
    }
    const blocked = new Set();
    for (const npc of bot.world.npcs.getInArea(bot.x, bot.y, radius * 2)) {
        if (npc.definition.hostility && !npc.opponent) {
            blocked.add(`${npc.x},${npc.y}`);
        }
    }
    // the engine refuses a walk that ends on an occupied tile: near the waypoint every occupied tile is off limits
    if (wp) {
        try {
            for (const o of bot.world.players.getInArea(wp.x, wp.y, 8)) {
                if (o && o !== bot && Math.abs(o.x - wp.x) <= 3 && Math.abs(o.y - wp.y) <= 3) blocked.add(`${o.x},${o.y}`);
            }
            for (const n of bot.world.npcs.getInArea(wp.x, wp.y, 8)) {
                if (n && Math.abs(n.x - wp.x) <= 3 && Math.abs(n.y - wp.y) <= 3) blocked.add(`${n.x},${n.y}`);
            }
        } catch (e) {}
    }
    return blocked;
}

const DOORFRAME_ID = 1;

// every openable door/gate id (a wall-object with an "Open" command); a bot re-opens any of these on its way
const OPENABLE_DOORS = (() => {
    const set = new Set();
    try {
        const defs = require('@2003scape/rsc-data/config/wall-objects');
        defs.forEach((d, i) => {
            if (d && (d.commands || []).some((c) => /^open$/i.test(c)) && /door|gate/i.test(d.name || '')) {
                set.add(i);
            }
        });
    } catch (e) { set.add(2); }
    return set;
})();

// thieving picklock doors: a bot may force one open only if it meets the thieving level and,
// where needed, holds a lockpick (714). unknown ids pass through freely.
const THIEVING_DOORS = (() => { try { return require('@2003scape/rsc-data/skills/thieving').doors || {}; } catch (e) { return {}; } })();
const LOCKPICK_ID = 714;
function mayOpenThievingDoor(bot, id) {
    const d = THIEVING_DOORS[id];
    if (!d) { return true; }
    const lvl = (bot.skills && bot.skills.thieving && bot.skills.thieving.current) || 0;
    if (lvl < d.level) { return false; }
    if (d.lockpick && !(bot.inventory && typeof bot.inventory.has === 'function' && bot.inventory.has(LOCKPICK_ID))) { return false; }
    return true;
}

// open the nearest closed door within a couple of tiles; returns true if opened
function openNearbyDoor(bot) {
    const world = bot.world;
    let best = null;
    let bestD = Infinity;
    for (const w of world.wallObjects.entities) {
        if (!w || !OPENABLE_DOORS.has(w.id)) {
            continue;
        }
        const d = Math.abs(w.x - bot.x) + Math.abs(w.y - bot.y);
        if (d <= 2 && d < bestD) {
            bestD = d;
            best = w;
        }
    }
    if (!best) {
        return false;
    }
    // some doors are level-gated: guild doors -> guilds.mayOpenGuildDoor,
    // thieving picklock doors -> mayOpenThievingDoor; refusing just fails the leg and reroutes.
    try { if (!require('./guilds').mayOpenGuildDoor(bot, best.id)) { return false; } } catch (e) {}
    if (!mayOpenThievingDoor(bot, best.id)) { return false; }
    try {
        world.replaceEntity('wallObjects', best, DOORFRAME_ID);
        return true;
    } catch (e) {
        return false;
    }
}

// find the stair/ladder object on the bot's current plane near (x,y) going the wanted direction
function findClimbObject(world, x, y, botPlane, up) {
    const inPlaneY = ((y % PLANE) + PLANE) % PLANE;
    const baseY = botPlane * PLANE + inPlaneY;
    for (let r = 0; r <= 3; r += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
            for (let dy = -r; dy <= r; dy += 1) {
                const objs = world.gameObjects.getAtPoint(x + dx, baseY + dy) || [];
                for (const o of objs) {
                    const d = o.definition;
                    if (!d || !d.commands) {
                        continue;
                    }
                    const isUp = d.commands.some((c) => /climb-up|go up/i.test(c));
                    const isDown = d.commands.some((c) => /climb-down|go down/i.test(c));
                    if ((up && isUp) || (!up && isDown)) {
                        return o;
                    }
                }
            }
        }
    }
    return null;
}

// advance the current journey, once per idle tick. returns:
//   'arrived' | 'walking' | 'failed' | 'idle' | 'climbing'
function step(bot) {
    const t = bot._travel;
    if (!t) {
        return 'idle';
    }

    // let an in-progress walk finish
    if (bot.walkQueue.length || bot.locked) {
        return 'walking';
    }

    // no-progress guard: the same tile for 60 ticks with the walk refused each tick skips the leg
    if (bot.x === t._px && bot.y === t._py) { t._noMove = (t._noMove | 0) + 1; } else { t._noMove = 0; t._px = bot.x; t._py = bot.y; }
    if (t._noMove > 60) {
        t._noMove = 0;
        t.stage += 1;
        if (t.stage >= t.waypoints.length) { journeyFailed(bot, t); bot._travel = null; return 'failed'; }
    }

    // skip waypoints already close enough; the final one uses a wider radius (often an NPC tile)
    while (t.stage < t.waypoints.length) {
        const isFinal = t.stage === t.waypoints.length - 1;
        const radius = isFinal ? FINAL_ARRIVE : ARRIVE;
        const wp = t.waypoints[t.stage];
        if (manhattan(bot.x, bot.y, wp.x, wp.y) <= radius) {
            t.stage += 1;
        } else {
            break;
        }
    }

    if (t.stage >= t.waypoints.length) {
        bot._travel = null;
        return 'arrived';
    }

    // a beat between legs: sometimes pause and look about before walking on. rolled once per leg,
    // scaled by curiosity and diligence, skipped on urgent runs and on a climb or crossing.
    const nowTick = (bot.world && bot.world.ticks) | 0;
    if (t._beatUntil && nowTick < t._beatUntil) {
        return 'walking';
    }
    if (t._beatStage !== t.stage) {
        t._beatStage = t.stage;
        if (!bot._foodRun && !bot._deathRun && !bot._spawnRun && !t.portalAt[t.stage] && !t.stairAt[t.stage]) {
            const p = personalityOf(bot);
            const chance = 0.06 + ((p && p.curiosity) || 0.5) * 0.12 - ((p && p.diligence) || 0.5) * 0.05;
            if (Math.random() < chance) {
                t._beatUntil = nowTick + 1 + (Math.random() < 0.4 ? 1 : 0);
                // a glance to one side
                try {
                    const dx = Math.random() < 0.5 ? -1 : 1;
                    const dy = Math.random() < 0.5 ? -1 : 1;
                    if (typeof bot.faceDirection === 'function') { bot.faceDirection(dx, Math.random() < 0.5 ? dy : 0); }
                } catch (e) {}
                return 'walking';
            }
        }
    }

    // throttle: only so many hop-BFS per tick globally
    if (!takeHopSlot(bot.world)) {
        return 'walking'; // wait a tick for a pathfinding slot
    }

    const wp = t.waypoints[t.stage];
    const isFinal = t.stage === t.waypoints.length - 1;
    const blocked = blockedNpcTiles(bot, wp);
    const notBlocked = (x, y) => blocked.has(`${x},${y}`);
    notBlocked.tiles = blocked; // lets the native pathfinder read the set directly

    // portal: a region crossing; move the bot from the near end across to the far end, then walk on
    if (t.portalAt[t.stage]) {
        if (typeof bot.teleport === 'function') {
            try { bot.teleport(wp.x, wp.y); } catch (e) { bot.x = wp.x; bot.y = wp.y; }
        } else {
            bot.x = wp.x; bot.y = wp.y;
        }
        t.stage += 1;
        return 'crossing';
    }

    // stair/ladder: the waypoint is on another floor; walk to the stair object and climb it
    const stair = t.stairAt[t.stage];
    if (stair && planeOf(bot.y) !== planeOf(wp.y)) {
        // find the up/down object on the current plane, walk to it, and climb
        const obj = findClimbObject(bot.world, stair.x, stair.y, planeOf(bot.y), stair.up);
        if (!obj) {
            if (openNearbyDoor(bot)) {
                return 'walking';
            }
            journeyFailed(bot, t);
            bot._travel = null;
            return 'failed';
        }
        if (manhattan(bot.x, bot.y, obj.x, obj.y) > 1) {
            const s = findPathAdjacent(
                bot.world, bot.x, bot.y, obj.x, obj.y, HOP_BUDGET, notBlocked
            );
            if (s && s.length) {
                bot.walkQueue = s;
                return 'walking';
            }
            if (openNearbyDoor(bot)) {
                return 'walking';
            }
            journeyFailed(bot, t);
            bot._travel = null;
            return 'failed';
        }
        // don't climb into a guild this bot hasn't earned (level-gated ladder entrances)
        try { if (require('./guilds').interiorBlockedFor(bot, wp.x, wp.y)) { bot._travel = null; return 'failed'; } } catch (e) {}
        if (typeof bot.climb === 'function') {
            try {
                bot.climb(obj, stair.up); // teleports to the far plane next tick
            } catch (e) {
                // climb failed, skip this leg rather than stall
            }
        }
        return 'climbing';
    }

    // path onto the waypoint tile; for the final destination, landing adjacent is fine (often an NPC tile).
    // deterministic A*, reliable on long routes.
    let steps = findPathTo(bot.world, bot.x, bot.y, wp.x, wp.y, HOP_BUDGET, notBlocked);
    if ((!steps || !steps.length) && isFinal) {
        steps = findPathAdjacent(bot.world, bot.x, bot.y, wp.x, wp.y, HOP_BUDGET, notBlocked);
    }

    if (steps && steps.length) {
        bot.walkQueue = steps;
        return 'walking';
    }

    // couldn't reach it; a closed door may be blocking a room, so open it and retry
    if (openNearbyDoor(bot)) {
        return 'walking';
    }

    // still stuck, skip ahead; if that was the dest, give up
    t.stage += 1;
    if (t.stage >= t.waypoints.length) {
        journeyFailed(bot, t);
        bot._travel = null;
        return 'failed';
    }
    return 'walking';
}

// self-rescue: a bot the movement layer can't budge hops to a connected neighbour node
// (or snaps onto the nearest node), so it can resume routing. returns true if it moved the bot.
function rescue(bot) {
    const here = nearestNode(bot.x, bot.y);
    if (here < 0) {
        return false;
    }
    const hc = nodeCoord(here);
    let target = null;
    if (hc.x !== bot.x || hc.y !== bot.y) {
        // not on a node yet -> snap onto the nearest one
        target = hc;
    } else {
        // already on the node but can't step off -> hop to a connected neighbour
        const s0 = ROUTE_ADJ_START[here];
        const s1 = ROUTE_ADJ_START[here + 1];
        if (s1 > s0) {
            const pick = ROUTE_ADJ_TO[s0 + (Math.abs((bot.id || 0)) % (s1 - s0))];
            target = nodeCoord(pick);
        }
    }
    if (!target || (target.x === bot.x && target.y === bot.y)) {
        return false;
    }
    bot._travel = null;
    if (bot.walkQueue) {
        bot.walkQueue.length = 0;
    }
    if (typeof bot.teleport === 'function') {
        try { bot.teleport(target.x, target.y); } catch (e) { bot.x = target.x; bot.y = target.y; }
    } else {
        bot.x = target.x;
        bot.y = target.y;
    }
    return true;
}

module.exports = {
    begin,
    step,
    cancel,
    rescue,
    isTraveling,
    nearestNode,
    nearestNodeScan,
    route,
    FACILITIES,
    NODES
};
