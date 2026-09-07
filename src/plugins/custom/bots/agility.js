// bot trains agility by running the gnome stronghold obstacle course, lap after lap.
// each obstacle fires via onGameObjectCommandOne; a full lap = 7 obstacles x 30xp + 150xp bonus

const personality = require('./personality');
const pacing = require('./pacing');
const travel = require('./travel');
const { findPathAdjacent } = require('./pathfind');

// memoised cross-module lookups (resolve once, not per tick)
const _m = {};
function mod(name) { return _m[name] || (_m[name] = require('./poller-registry').get(name)); }

// gnome stronghold course in lap order: obstacle id + a tile to stand next to it.
// operate the balance log from its north end (692,494), not 692,499, or teleport() won't unlock
const GNOME_START = { x: 692, y: 494 };
const COURSE = [
    { id: 655, approach: { x: 692, y: 494 } }, // balance log      (plane 0) -> teleports south to 692,499
    { id: 647, approach: { x: 692, y: 502 } }, // obstacle net     (plane 0) -> teleports to plane 1
    { id: 648, approach: { x: 693, y: 1451 } }, // climbing tree    (plane 1) -> plane 2
    { id: 650, approach: { x: 689, y: 2395 } }, // rope swing       (plane 2)
    { id: 649, approach: { x: 683, y: 2396 } }, // drop-down net    (plane 2) -> plane 0
    { id: 653, approach: { x: 683, y: 502 } }, // obstacle net 2   (plane 0)
    { id: 654, approach: { x: 683, y: 497 } }  // pipe (last)      (plane 0) -> +150 lap bonus
];

// busy = pacing.isBusy plus agility's own extras (travel / chat-goto / following / pending invite)
function busy(bot) {
    return pacing.isBusy(bot) || !!(
        bot._travel || bot._chatGoto || bot._follow || bot.pendingPartyInvite
    );
}

function agilityLevel(bot) {
    const s = bot.skills && bot.skills.agility;
    return s ? (s.current != null ? s.current : s.base) : 1;
}

// how much the bot wants to run the course now (dedicated agility goal = high)
function wantsToRun(bot) {
    try {
        const g = mod('goals').current(bot);
        if (g && g.type === 'skill' && g.skill === 'agility') { return 0.9; }
    } catch (e) {}
    const p = personality.of(bot);
    return Math.max(0, p.diligence * 0.15 + p.curiosity * 0.1 - p.aggression * 0.1);
}

// operate the obstacle object if it's in reach; else local-path toward it.
function workObstacle(bot, run) {
    const step = COURSE[run.idx];
    // the obstacle can span several tiles; pick the nearest one
    let obj = null, bestD = Infinity;
    try {
        const near = bot.getNearbyEntitiesByID ? (bot.getNearbyEntitiesByID('gameObjects', step.id, 8) || []) : [];
        for (const o of near) {
            const d = Math.abs(o.x - bot.x) + Math.abs(o.y - bot.y);
            if (d < bestD) { bestD = d; obj = o; }
        }
    } catch (e) {}

    if (obj && bestD <= 2) {
        try {
            const world = bot.world;
            if (world && typeof world.callPlugin === 'function') {
                Promise.resolve(world.callPlugin('onGameObjectCommandOne', bot, obj)).catch(() => {});
            }
        } catch (e) {}
        run.idx = (run.idx + 1) % COURSE.length; // advance; the plugin teleports the bot onto the next plane
        run.stall = 0;
        // obstacle takes ~6 ticks then grants xp + teleports; wait it out before
        // the next one so it never fires mid-animation
        bot._agilityCd = 8 + Math.floor(Math.random() * 3);
        return true;
    }

    // walk adjacent to the obstacle; if it isn't visible yet (mid-teleport / wrong plane), wait
    if (obj) {
        const steps = findPathAdjacent(bot.world, bot.x, bot.y, obj.x, obj.y);
        if (steps && steps.length) { bot.walkQueue = steps; run.stall = 0; return true; }
    }
    // next obstacle not reachable from here; restart the lap from the top rather
    // than give up (xp from cleared obstacles is already banked)
    run.stall = (run.stall || 0) + 1;
    if (run.stall > 18) {
        run.phase = 'travel';
        run.idx = 0;
        run.ticks = 0;
        run.stall = 0;
        travel.begin(bot, GNOME_START);
    }
    return true;
}

function onTick(bot) {
    // a run in progress owns the bot until the obstacle chain releases it.
    if (bot._agilityRun) {
        if (busy(bot)) { return false; } // survival/combat/logistics outrank a lap
        if (bot.locked || (bot.walkQueue && bot.walkQueue.length)) { return true; } // wait out the obstacle/teleport
        if (bot._agilityCd && bot._agilityCd > 0) { bot._agilityCd -= 1; return true; }
        const run = bot._agilityRun;
        if (run.phase === 'travel') {
            if (Math.abs(bot.x - GNOME_START.x) + Math.abs(bot.y - GNOME_START.y) <= 4) {
                run.phase = 'run';
                bot._travel = null; if (bot.walkQueue) { bot.walkQueue.length = 0; }
                return true;
            }
            run.ticks = (run.ticks || 0) + 1;
            if (run.ticks > 500 || (!travel.isTraveling(bot) && !travel.begin(bot, GNOME_START))) {
                bot._agilityRun = null; bot._agilityCd = 300; // couldn't reach the course -> try later
                return false;
            }
            travel.step(bot);
            return true;
        }
        return workObstacle(bot, run);
    }

    if (busy(bot)) { return false; }
    if (bot._agilityCd && bot._agilityCd > 0) { bot._agilityCd -= 1; return false; }
    const want = wantsToRun(bot);
    if (want < 0.12) { bot._agilityCd = 300; return false; }
    // a dedicated agility goal (want 0.9) starts a lap most times it is checked; anyone else only now and then
    if (Math.random() > (want >= 0.9 ? 0.6 : want * 0.12)) { bot._agilityCd = 60; return false; }

    // begin a run: walk to the course start, then run laps.
    bot._agilityRun = { phase: 'travel', idx: 0, ticks: 0, stall: 0 };
    travel.begin(bot, GNOME_START);
    return true;
}

module.exports = { onTick, wantsToRun, COURSE, GNOME_START, agilityLevel };
