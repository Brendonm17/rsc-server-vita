// death run: reclaiming your grave. on death rsc keeps only the 3 most valuable
// items (4 with protect item) and drops the rest at the death tile; they linger
// owner-only ~1 min and despawn ~2 min, player respawns at lumbridge. this runs
// a bot back to reclaim the pile when it's reachable in time and its nerve holds.
//
// the death tile is captured in lifecycle.onDeath as cache.bot.deathSpot.

const travel = require('./travel');
const personality = require('./personality');
const { findPathAdjacent } = require('./pathfind');
const inventoryHandlers = require('../../../packet-handlers/inventory');

const RUN_BUDGET = 220;   // ticks to reach and clear the grave before giving up
const REACHABLE = 130;    // manhattan tiles from respawn a bot will chase; farther graves despawn first

function deathSpotOf(bot) {
    const cb = bot.cache && bot.cache.bot;
    return cb && cb.deathSpot;
}

// whether there's a grave worth retrieving: gated on a recorded spot, distance,
// and nerve. a close grave is always chased
function shouldRetrieve(bot) {
    if (bot._deathRun) {
        return true;
    }
    const spot = deathSpotOf(bot);
    if (!spot || spot._done) {
        return false;
    }
    const dist = Math.abs(bot.x - spot.x) + Math.abs(bot.y - spot.y);
    if (dist > REACHABLE) {
        spot._done = true; // too far, will despawn before arrival; write it off
        return false;
    }
    if (dist <= 25) {
        return true; // died next door, just grab it
    }
    const p = personality.of(bot);
    return p.greed >= 0.35 && p.risk >= 0.25; // greed pulls it back; timid bots stay wary
}

function startDeathRun(bot) {
    const spot = deathSpotOf(bot);
    if (!spot) {
        return;
    }
    bot._deathRun = { x: spot.x, y: spot.y, ticks: 0 };
}

function markDone(bot) {
    const spot = deathSpotOf(bot);
    if (spot) {
        spot._done = true;
    }
    bot._deathRun = null;
}

// travel to the grave's vicinity, then local-path onto the drops and grab them.
// bounded by RUN_BUDGET ticks; a path miss retries next tick
function deathRunTick(bot) {
    const run = bot._deathRun;
    if (!run) {
        return 'done';
    }
    run.ticks += 1;
    if (run.ticks > RUN_BUDGET) {
        markDone(bot); // out of time, the pile has despawned
        return 'done';
    }

    // once the route lands in the neighbourhood, local a* walks the last leg to
    // the pile (the graph node can sit a dozen tiles off the death tile)
    const nearGrave = Math.abs(bot.x - run.x) + Math.abs(bot.y - run.y) <= 15;

    // far: travel the waypoint graph toward the grave
    if (!nearGrave) {
        if (!travel.isTraveling(bot) && !travel.begin(bot, { x: run.x, y: run.y })) {
            // no waypoint route, close the gap locally; give up only if that fails too
            const steps = findPathAdjacent(bot.world, bot.x, bot.y, run.x, run.y);
            if (steps && steps.length) { bot.walkQueue = steps; return 'running'; }
            markDone(bot);
            return 'done';
        }
        travel.step(bot);
        return 'running';
    }

    // near: close the last tiles to the grave tile, then reclaim. groundItemTake
    // is deferred (fires on walk completion); a local-path miss just retries
    const atGrave = Math.abs(bot.x - run.x) + Math.abs(bot.y - run.y) <= 3;
    if (!atGrave) {
        if (!bot.walkQueue || !bot.walkQueue.length) {
            const steps = findPathAdjacent(bot.world, bot.x, bot.y, run.x, run.y);
            if (steps && steps.length) { bot.walkQueue = steps; }
        }
        return 'running';
    }

    // at the grave: collect the pile. don't re-issue the take every tick (it
    // resets endWalkFunction); a short cooldown lets the deferred pickup resolve
    if (bot._grabCd && bot._grabCd > 0) {
        bot._grabCd -= 1;
        return 'running';
    }
    let drops = [];
    try {
        drops = (bot.getNearbyEntities('groundItems', 6) || []).filter(
            (gi) => gi && (gi.owner == null || gi.owner === bot.id)
        );
    } catch (e) {
        drops = [];
    }
    if (!drops.length) {
        markDone(bot); // nothing left to reclaim
        return 'done';
    }
    if (bot.inventory && bot.inventory.isFull && bot.inventory.isFull()) {
        markDone(bot); // bag full
        return 'done';
    }
    const gi = drops[0];
    // chebyshev distance: on the tile (0) or any of the 8 neighbours (1) is close
    // enough; the deferred pickup has no distance gate
    const cheby = Math.max(Math.abs(gi.x - bot.x), Math.abs(gi.y - bot.y));
    if (cheby <= 1) {
        inventoryHandlers.groundItemTake({ player: bot }, { x: gi.x, y: gi.y, id: gi.id }).catch(() => {});
        bot._grabCd = 3; // wait for the deferred pickup before the next
        return 'running';
    }
    // walk onto the item so the take's endWalkFunction fires on arrival
    if (!bot.walkQueue || !bot.walkQueue.length) {
        const steps = findPathAdjacent(bot.world, bot.x, bot.y, gi.x, gi.y);
        if (steps && steps.length) { bot.walkQueue = steps; }
    }
    return 'running';
}

module.exports = { shouldRetrieve, startDeathRun, deathRunTick };
