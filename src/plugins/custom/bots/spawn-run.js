// spawn run: a greedy bot occasionally trips to a valuable item-spawn, grabs
// it, and returns to what it was doing. the spawn list is every item-spawn on
// the map (locations/items.json), filtered to valuable, routable ones. starts
// only when pacing.isBusy is false.

const travel = require('./travel');
const pacing = require('./pacing');
const personality = require('./personality');
const itemKnowledge = require('./item-knowledge');
const mapData = require('./map-data');
const social = require('./social-emergent');
const memory = require('./memory');
const inventoryHandlers = require('../../../packet-handlers/inventory');

const DANGER_SKIP = 12; // skip a spawn whose ground the bot considers this dangerous

function mod(name) { return require('./poller-registry').get(name); }

const MIN_VALUE = 150;   // min value for a dedicated trip
const MAX_TRIP = 220;    // max distance to a spawn
const RUN_COOLDOWN = 1500; // ticks between runs (~16 min)

// valuable routable item-spawns, built once: { id, x, y, price }
let _spawns = null;
function spawns() {
    if (_spawns) { return _spawns; }
    _spawns = [];
    let list = [];
    try { list = require('@2003scape/rsc-data/locations/items.json') || []; } catch (e) { list = []; }
    for (const s of list) {
        if (s == null || s.id == null) { continue; }
        let r = null; try { r = itemKnowledge.roleOf(s.id); } catch (e) {}
        if (!r || !r.known || !r.tradeable || r.price < MIN_VALUE) { continue; }
        if (!mapData.routable(s.x, s.y)) { continue; }
        _spawns.push({ id: s.id, x: s.x, y: s.y, price: r.price });
    }
    return _spawns;
}

// nearest worthwhile spawn within reach, or null. exclude skips a tile.
// how much remembered danger this bot will brave for a spawn, by temperament
function dangerTolerance(bot) {
    let p = null; try { p = personality.of(bot); } catch (e) {}
    const nerve = p ? (p.aggression * 0.5 + (p.risk || 0) * 0.3 + p.greed * 0.2) : 0.3; // 0..1
    let strength = 0.5;
    try { const cl = bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 10); strength = Math.min(1, cl / 80); } catch (e) {}
    return DANGER_SKIP * (0.4 + nerve * 1.4 + strength * 0.8); // ~5 (timid/weak) .. ~32 (bold/strong)
}
function nearestSpawn(bot, exclude) {
    let best = null, bd = Infinity;
    const tol = dangerTolerance(bot);
    for (const s of spawns()) {
        if (exclude && s.x === exclude.x && s.y === exclude.y) { continue; }
        const d = Math.abs(s.x - bot.x) + Math.abs(s.y - bot.y);
        if (d > MAX_TRIP || d >= bd) { continue; }
        // skip a spawn on ground too dangerous for this bot
        try { if (memory.dangerAreaScore(bot, s.x, s.y) >= tol) { continue; } } catch (e) {}
        bd = d; best = s;
    }
    return best;
}
function nextSpawn(bot, exclude) { return nearestSpawn(bot, exclude); }

// nearest other bot (the likely taker if the spawn is gone), or null
function nearestBot(bot) {
    let others;
    try { others = bot.getNearbyEntities('players', 6) || []; } catch (e) { return null; }
    let best = null, bd = Infinity;
    for (const pl of others) {
        if (!pl || pl === bot || !pl.isBot || pl.username === bot.username) { continue; }
        const d = Math.abs(pl.x - bot.x) + Math.abs(pl.y - bot.y);
        if (d < bd) { bd = d; best = pl; }
    }
    return best;
}

// would this bot bother with a spawn run? greedy, free bag space, off cooldown
function inclined(bot) {
    if (!bot.inventory || (bot.inventory.isFull && bot.inventory.isFull())) { return false; }
    let p = null; try { p = personality.of(bot); } catch (e) { return false; }
    if (!p || p.greed < 0.5) { return false; } // only greedy bots go out of their way
    return true;
}

function startRun(bot, spawn) {
    bot._spawnRun = { target: { x: spawn.x, y: spawn.y }, id: spawn.id, returnTo: { x: bot.x, y: bot.y }, phase: 'go', ticks: 0 };
    travel.begin(bot, { x: spawn.x, y: spawn.y });
}

// grab the spawn item if it's nearby. true if taken, false if already gone
function grabHere(bot, id) {
    let items = [];
    try { items = bot.getNearbyEntities('groundItems', 2) || []; } catch (e) { return false; }
    for (const gi of items) {
        if (gi.id === id && (!gi.owner || gi.owner === bot.id)) {
            try { inventoryHandlers.groundItemTake({ player: bot }, { x: gi.x, y: gi.y, id: gi.id }).catch(() => {}); } catch (e) {}
            // record the find and tell nearby bots (finds.js)
            try { let r = itemKnowledge.roleOf(id); require('./finds').record(bot, (r && r.price) || 0); } catch (e) {}
            return true;
        }
    }
    return false;
}

// another bot racing the same spawn and closer to it, or null
function winningRival(bot, target) {
    let others;
    try { others = bot.getNearbyEntities('players', 14) || []; } catch (e) { return null; }
    const myD = Math.abs(bot.x - target.x) + Math.abs(bot.y - target.y);
    let best = null, bd = myD;
    for (const pl of others) {
        if (!pl || pl === bot || !pl.isBot || pl.username === bot.username) { continue; }
        const r = pl._spawnRun;
        if (!r || !r.target || r.target.x !== target.x || r.target.y !== target.y) { continue; } // not racing us
        const theirD = Math.abs(pl.x - target.x) + Math.abs(pl.y - target.y);
        if (theirD < bd) { bd = theirD; best = pl; }
    }
    return best;
}

// any other bot racing the same spawn, or null
function racerHere(bot, target) {
    let others;
    try { others = bot.getNearbyEntities('players', 10) || []; } catch (e) { return null; }
    for (const pl of others) {
        if (!pl || pl === bot || !pl.isBot || pl.username === bot.username) { continue; }
        const r = pl._spawnRun;
        if (r && r.target && r.target.x === target.x && r.target.y === target.y) { return pl; }
    }
    return null;
}

// contested spawn: sour the relationship a touch and say a barbed line
const LOST_LINES = ['beat me to it, {n}!', 'oi {n}, that was mine!', 'you snooze you lose i suppose... cheers {n}.', 'quick hands, {n}.'];
const CONCEDE_LINES = ['you can have it, {n}.', "i'll leave that one to {n}.", 'not racing you for it, {n}.'];
function contest(bot, rival, lines) {
    try {
        const name = rival && rival.username;
        if (!name) { return; }
        social.noteInteraction(bot, name, -1); // small souring
        try { mod('rivalry').recordOutcome(bot, name, false); } catch (e) {}
        if (!mod('presence').mayChatter(bot)) { return; }
        if (Math.random() > 0.4) { return; }
        let line = lines[Math.floor(Math.random() * lines.length)].replace('{n}', name);
        try { line = mod('voice').apply(bot, line); } catch (e) {}
        if (typeof bot.broadcastChat === 'function') {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
            mod('presence').noteChatter(bot);
        }
    } catch (e) {}
}

function runTick(bot) {
    const run = bot._spawnRun;
    if (!run) { return 'done'; }
    run.ticks += 1;
    if (run.ticks > 800) { return 'done'; } // stuck or unroutable, give up

    if (run.phase === 'go') {
        if (Math.abs(bot.x - run.target.x) + Math.abs(bot.y - run.target.y) <= 2) {
            const won = grabHere(bot, run.id); // grab directly so the run pays off
            if (won) {
                // won against a racer: earn a public "spawn-crasher" reputation
                const thwarted = racerHere(bot, run.target);
                if (thwarted) { try { mod('reputation').note(bot, 'crasher'); } catch (e) {} }
            } else {
                // beaten to it: sour the nearest bot (the likely taker)
                const taker = nearestBot(bot);
                if (taker) { contest(bot, taker, LOST_LINES); }
            }
            run.phase = 'back';
            travel.begin(bot, run.returnTo);
            return 'running';
        }
        // a rival is closer and will win the spawn: concede, then divert or head back
        if (!run._conceded) {
            const rival = winningRival(bot, run.target);
            if (rival) {
                run._conceded = true;
                contest(bot, rival, CONCEDE_LINES);
                const alt = nextSpawn(bot, run.target);
                if (alt) { run.target = { x: alt.x, y: alt.y }; run.id = alt.id; run._conceded = false; travel.begin(bot, run.target); return 'running'; }
                run.phase = 'back'; travel.begin(bot, run.returnTo); return 'running';
            }
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, run.target)) { return 'done'; }
        travel.step(bot);
        return 'running';
    }
    // stroll back to where it was working
    if (Math.abs(bot.x - run.returnTo.x) + Math.abs(bot.y - run.returnTo.y) <= 3 || !travel.isTraveling(bot)) {
        return 'done';
    }
    travel.step(bot);
    return 'running';
}

// poller: drive an active run or occasionally start one. true if it owns the bot
function onTick(bot) {
    if (bot._spawnRun) {
        if (runTick(bot) === 'done') { bot._spawnRun = null; bot._spawnRunCd = RUN_COOLDOWN; }
        return true;
    }
    if (pacing.isBusy(bot)) { return false; }
    if (bot._spawnRunCd && bot._spawnRunCd > 0) { bot._spawnRunCd -= 1; return false; }
    if (!inclined(bot)) { bot._spawnRunCd = 300; return false; }
    if (Math.random() > 0.02) { bot._spawnRunCd = 60; return false; } // rare
    const spawn = nearestSpawn(bot);
    if (!spawn) { bot._spawnRunCd = 600; return false; }
    startRun(bot, spawn);
    return true;
}

module.exports = { onTick, nearestSpawn, spawns, winningRival, nearestBot };
