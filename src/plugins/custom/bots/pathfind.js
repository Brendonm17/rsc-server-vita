// local pathfinding for bots (socketless bots have no client to route for them).
// findPath is a bounded a* (bfs with no goal coord) over isValidGameStep,
// returning a {deltaX, deltaY} step list for player.walkQueue. node-bounded so a
// bad search can't stall the tick. the chebyshev heuristic keeps long cross-map
// hops within budget on the fully-loaded members map.

// 8-way, orthogonals first so straight approaches are preferred
const DIRECTIONS = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
];

// binary min-heap keyed on f; entries [f, seq, x, y], seq is the tie-break
class MinHeap {
    constructor() {
        this.a = [];
    }
    get size() {
        return this.a.length;
    }
    push(item) {
        const a = this.a;
        a.push(item);
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p][0] < a[i][0] || (a[p][0] === a[i][0] && a[p][1] <= a[i][1])) {
                break;
            }
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
                const r = l + 1;
                let s = i;
                if (l < n && (a[l][0] < a[s][0] || (a[l][0] === a[s][0] && a[l][1] < a[s][1]))) {
                    s = l;
                }
                if (r < n && (a[r][0] < a[s][0] || (a[r][0] === a[s][0] && a[r][1] < a[s][1]))) {
                    s = r;
                }
                if (s === i) {
                    break;
                }
                const t = a[s];
                a[s] = a[i];
                a[i] = t;
                i = s;
            }
        }
        return top;
    }
}

// a* (or bfs without a goal) from (startX,startY) to the first tile where
// isGoal is true. returns the step list, or null within maxNodes expansions.
// isBlocked marks tiles to route around. jitter randomises equal-cost tie-breaks
// so a same-route crowd spreads instead of going single-file.
function findPath(world, startX, startY, isGoal, maxNodes = 900, isBlocked, goalX, goalY, jitter) {
    if (!world.pathFinder) {
        return null;
    }

    const guided = typeof goalX === 'number' && typeof goalY === 'number';
    const h = guided
        ? (x, y) => {
              const ax = x > goalX ? x - goalX : goalX - x;
              const ay = y > goalY ? y - goalY : goalY - y;
              return ax > ay ? ax : ay;
          }
        : () => 0;

    // jitter shuffles neighbour order only, not f-priority, so the search stays goal-directed
    let dirs = DIRECTIONS;
    if (jitter) {
        dirs = DIRECTIONS.slice();
        for (let i = dirs.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = dirs[i];
            dirs[i] = dirs[j];
            dirs[j] = t;
        }
    }

    // integer tile keys (x << 16 | y); one record per tile carries parent, step, g
    const startKey = (startX << 16) | startY;
    const cameFrom = new Map();
    cameFrom.set(startKey, { px: startX, py: startY, dx: 0, dy: 0, g: 0 });
    const heap = new MinHeap();
    let seq = 0;
    heap.push([h(startX, startY), seq, startX, startY]);
    let nodes = 0;
    const from = { x: 0, y: 0 };
    const step = { deltaX: 0, deltaY: 0 };

    while (heap.size) {
        const top = heap.pop();
        const x = top[2];
        const y = top[3];

        if (!(x === startX && y === startY) && isGoal(x, y)) {
            const steps = [];
            let key = (x << 16) | y;

            while (key !== startKey) {
                const rec = cameFrom.get(key);
                steps.push({ deltaX: rec.dx, deltaY: rec.dy });
                key = (rec.px << 16) | rec.py;
            }

            steps.reverse();
            return steps;
        }

        if (nodes > maxNodes) {
            break;
        }
        nodes += 1;

        const g = cameFrom.get((x << 16) | y).g;
        from.x = x;
        from.y = y;

        for (let i = 0; i < dirs.length; i += 1) {
            const dx = dirs[i][0];
            const dy = dirs[i][1];
            const nx = x + dx;
            const ny = y + dy;
            const nk = (nx << 16) | ny;

            if (cameFrom.has(nk)) {
                continue;
            }

            step.deltaX = dx;
            step.deltaY = dy;

            if (!world.pathFinder.isValidGameStep(from, step)) {
                continue;
            }

            // route around blocked tiles, but never the goal itself
            if (isBlocked && isBlocked(nx, ny) && !isGoal(nx, ny)) {
                continue;
            }

            cameFrom.set(nk, { px: x, py: y, dx, dy, g: g + 1 });
            seq += 1;
            heap.push([g + 1 + h(nx, ny), seq, nx, ny]);
        }
    }

    return null;
}

// native fast path (vita): __host.findPath is a byte-exact port of findPath.
// returns undefined when it can't be used, so callers fall back to the js search.
function nativeFindPath(startX, startY, targetX, targetY, mode, maxNodes, isBlocked, jitter) {
    if (!globalThis.__spNativePath) {
        return undefined;
    }

    let blockedBytes = null;

    if (isBlocked) {
        const tiles = isBlocked.tiles;

        if (!(tiles instanceof Set)) {
            return undefined; // opaque predicate, only the js search can ask it
        }

        if (tiles.size > 0) {
            // 4 bytes per tile: x lo, x hi, y lo, y hi (keys are "x,y")
            blockedBytes = new Uint8Array(tiles.size * 4);
            let i = 0;

            for (const key of tiles) {
                const comma = key.indexOf(',');
                const x = +key.slice(0, comma);
                const y = +key.slice(comma + 1);
                blockedBytes[i] = x & 0xff;
                blockedBytes[i + 1] = (x >> 8) & 0xff;
                blockedBytes[i + 2] = y & 0xff;
                blockedBytes[i + 3] = (y >> 8) & 0xff;
                i += 4;
            }
        }
    }

    const seed = jitter ? 1 + Math.floor(Math.random() * 0x7ffffffe) : 0;
    const raw = globalThis.__host.findPath(
        startX,
        startY,
        targetX,
        targetY,
        mode,
        maxNodes === undefined ? 900 : maxNodes,
        seed,
        blockedBytes
    );

    if (raw === null || raw === undefined) {
        return null;
    }

    const steps = new Array(raw.length >> 1);

    for (let i = 0, j = 0; i < raw.length; i += 2, j += 1) {
        steps[j] = { deltaX: raw[i] - 1, deltaY: raw[i + 1] - 1 };
    }

    return steps;
}

// path to a tile orthogonally adjacent to the target (the workable side)
function findPathAdjacent(world, startX, startY, targetX, targetY, maxNodes, isBlocked) {
    const native = nativeFindPath(startX, startY, targetX, targetY, 1, maxNodes, isBlocked, false);

    if (native !== undefined) {
        return native;
    }

    return findPath(
        world,
        startX,
        startY,
        (x, y) => Math.abs(x - targetX) + Math.abs(y - targetY) === 1,
        maxNodes,
        isBlocked,
        targetX,
        targetY
    );
}

// path to land exactly on the target (waypoint travel)
function findPathTo(world, startX, startY, targetX, targetY, maxNodes, isBlocked, jitter) {
    const native = nativeFindPath(startX, startY, targetX, targetY, 0, maxNodes, isBlocked, jitter);

    if (native !== undefined) {
        return native;
    }

    return findPath(
        world,
        startX,
        startY,
        (x, y) => x === targetX && y === targetY,
        maxNodes,
        isBlocked,
        targetX,
        targetY,
        jitter
    );
}

module.exports = { findPath, findPathAdjacent, findPathTo };
