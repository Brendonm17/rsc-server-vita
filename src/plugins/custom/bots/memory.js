// outcome memory: bots remember kills, deaths, danger and productive spots and
// nudge behavior from it. bounded, decaying, persisted in cache.bot.memory.
// events are detected by polling the bot's state each tick.

const SITES = require('./sites');

let _riv; // memoised rivalry module, resolved lazily

const GRUDGE_TICKS = 1500; // ~16 min: avoid a recent conqueror this long
const AVOID_TICKS = 900; // ~10 min: steer clear of a spot it just died at
const AREA_CELL = 24; // grid size for an area
const SITE_RADIUS = 15; // credit XP to a site if working within this range
const SITE_DECAY = 0.995; // per-tick fade of remembered site productivity
const RICH_AREA_DECAY = 0.997; // per-tick fade of remembered loot-rich areas
const DANGER_AREA_DECAY = 0.99; // per-tick fade of remembered danger

function mem(bot) {
    const cb = bot && bot.cache && bot.cache.bot;
    if (!cb) {
        return null;
    }
    if (!cb.memory) {
        cb.memory = {
            pvpWins: 0,
            pvpLosses: 0,
            grudges: {}, // username -> ticks remaining
            avoidAreas: {}, // "cx,cy" -> ticks remaining
            sites: {}, // site name -> remembered productivity (decays)
            richAreas: {} // "cx,cy" -> remembered loot richness (decays)
        };
    }
    if (!cb.memory.sites) {
        cb.memory.sites = {};
    }
    if (!cb.memory.richAreas) {
        cb.memory.richAreas = {};
    }
    return cb.memory;
}

function totalCombatGatherXp(bot) {
    const s = bot.skills;
    let n =
        s.attack.experience +
        s.strength.experience +
        s.defense.experience +
        s.hits.experience +
        (s.ranged ? s.ranged.experience : 0);
    for (const k of ['woodcutting', 'mining', 'fishing']) {
        if (s[k]) {
            n += s[k].experience;
        }
    }
    return n;
}

function nearestSite(bot) {
    let best = null;
    let bestD = Infinity;
    for (const s of SITES) {
        const d = Math.abs(s.x - bot.x) + Math.abs(s.y - bot.y);
        if (d < bestD) {
            bestD = d;
            best = s;
        }
    }
    return best && bestD <= SITE_RADIUS ? best : null;
}

// remembered productivity of a work site (0 if none)
function siteScore(bot, name) {
    const m = mem(bot);
    return m && m.sites[name] ? m.sites[name] : 0;
}

function areaKey(x, y) {
    return `${Math.floor(x / AREA_CELL)},${Math.floor(y / AREA_CELL)}`;
}

// remember where valuable loot turns up; a find bumps that area's richness
// (capped, decaying). relocation gravitates toward rich ground.
const RICH_CAP = 60;
function noteFind(bot, x, y, value) {
    const m = mem(bot);
    if (!m) { return; }
    // a find worth talking about later (episodes.js)
    if ((value || 0) >= 40) {
        try { require('./episodes').note(bot, 'find', { item: (arguments[4] && String(arguments[4])) || ('something worth ' + Math.round(value) + ' coins'), value: Math.round(value) }); } catch (e) {}
    }
    const k = areaKey(x, y);
    const bump = Math.min(20, 2 + (value || 0) / 40); // 40gp find ~+3, 400gp ~+12, capped
    m.richAreas[k] = Math.min(RICH_CAP, (m.richAreas[k] || 0) + bump);
}
// remembered loot-richness around (x,y), 0 if none
function richAreaScore(bot, x, y) {
    const m = mem(bot);
    return (m && m.richAreas[areaKey(x, y)]) || 0;
}

// mark ground as risky (and warn nearby bots). a soft, decaying signal;
// relocation weights risky ground down rather than banning it.
const DANGER_CAP = 40;
function noteDanger(bot, x, y, weight) {
    const m = mem(bot);
    if (!m) { return; }
    if (!m.dangerAreas) { m.dangerAreas = {}; }
    const k = areaKey(x, y);
    m.dangerAreas[k] = Math.min(DANGER_CAP, (m.dangerAreas[k] || 0) + (weight || 4));
}
function dangerAreaScore(bot, x, y) {
    const m = mem(bot);
    return (m && m.dangerAreas && m.dangerAreas[areaKey(x, y)]) || 0;
}

// record a pvp loss: grudge the killer, avoid where it happened
function onDeath(bot, killer) {
    const m = mem(bot);
    if (!m) {
        return;
    }
    if (killer && killer.username) {
        m.pvpLosses = (m.pvpLosses || 0) + 1;
        m.grudges[killer.username] = GRUDGE_TICKS;
    }
    m.avoidAreas[areaKey(bot.x, bot.y)] = AVOID_TICKS;
}

function onPvpKill(bot) {
    const m = mem(bot);
    if (m) {
        m.pvpWins = (m.pvpWins || 0) + 1;
    }
    // a wilderness kill builds a pker reputation
    try { require('./reputation').note(bot, 'pk'); } catch (e) {}
    // and a story to tell (lore.js)
    try {
        const m2 = mem(bot);
        require('./lore').record(bot, 'kill', { subj: 'foe in the wilderness', num: (m2 && m2.pvpWins) || 1 });
    } catch (e) {}
}

// pvp appetite from the win/loss record, -0.3..+0.3, after a few fights
function pvpConfidenceMod(bot) {
    const m = mem(bot);
    if (!m) {
        return 0;
    }
    const w = m.pvpWins || 0;
    const l = m.pvpLosses || 0;
    const n = w + l;
    if (n < 3) {
        return 0;
    }
    return ((w - l) / n) * 0.3;
}

function holdsGrudge(bot, username) {
    const m = mem(bot);
    return !!(m && username && m.grudges[username] > 0);
}

function avoidsArea(bot, x, y) {
    const m = mem(bot);
    return !!(m && m.avoidAreas[areaKey(x, y)] > 0);
}

// per-tick: detect pvp outcomes by polling, decay memories
function onTick(bot) {
    const m = mem(bot);
    if (!m) {
        return;
    }

    let t = bot._memTrack;
    if (!t) {
        t = bot._memTrack = {
            hits: bot.skills.hits.current,
            foe: null,
            xp: totalCombatGatherXp(bot)
        };
    }

    // credit xp gained to the nearest work site, so it learns which spots pay off
    const xpNow = totalCombatGatherXp(bot);
    const gained = xpNow - t.xp;
    t.xp = xpNow;
    if (gained > 0) {
        const site = nearestSite(bot);
        if (site) {
            m.sites[site.name] = (m.sites[site.name] || 0) + gained;
        }
    }
    for (const k of Object.keys(m.sites)) {
        m.sites[k] *= SITE_DECAY;
        if (m.sites[k] < 1) {
            delete m.sites[k];
        }
    }

    // remember the current pvp opponent while fighting
    const opp = bot.opponent;
    if (opp && opp.username) {
        t.foe = opp;
    }

    // a bot's own death is handled in BotPlayer.die(); this only polls for the
    // foe dying (a win)
    t.hits = bot.skills.hits.current;

    // the tracked foe died -> a win
    if (t.foe && t.foe.skills && t.foe.skills.hits.current <= 0) {
        // felling a greater name is glory (rivalry.js); assess before losing the foe
        try { (_riv || (_riv = require('./rivalry'))).onFelledName(bot, t.foe); } catch (e) {}
        onPvpKill(bot);
        t.foe = null;
    }

    // decay grudges + area avoidance
    for (const k of Object.keys(m.grudges)) {
        if (--m.grudges[k] <= 0) {
            delete m.grudges[k];
        }
    }
    for (const k of Object.keys(m.avoidAreas)) {
        if (--m.avoidAreas[k] <= 0) {
            delete m.avoidAreas[k];
        }
    }

    // fade remembered rich areas (slower than site profitability)
    for (const k of Object.keys(m.richAreas)) {
        m.richAreas[k] *= RICH_AREA_DECAY;
        if (m.richAreas[k] < 1) {
            delete m.richAreas[k];
        }
    }

    // fade remembered danger (faster than loot memory)
    if (m.dangerAreas) {
        for (const k of Object.keys(m.dangerAreas)) {
            m.dangerAreas[k] *= DANGER_AREA_DECAY;
            if (m.dangerAreas[k] < 1) {
                delete m.dangerAreas[k];
            }
        }
    }
}

// strongest remembered danger and loot spots, as world coords
function topAreas(bot) {
    const m = mem(bot);
    if (!m) { return []; }
    const out = [];
    const push = (map, kind, min) => {
        for (const k of Object.keys(map || {})) {
            const v = map[k];
            if (v < min) { continue; }
            const parts = k.split(',').map(Number);
            out.push({ kind, x: (parts[0] * AREA_CELL + AREA_CELL / 2) | 0, y: (parts[1] * AREA_CELL + AREA_CELL / 2) | 0, score: v });
        }
    };
    push(m.dangerAreas, 'danger', 8);
    push(m.richAreas, 'rich', 10);
    return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

module.exports = {
    onTick,
    onDeath,
    topAreas,
    onPvpKill,
    pvpConfidenceMod,
    holdsGrudge,
    avoidsArea,
    siteScore,
    noteFind,
    richAreaScore,
    noteDanger,
    dangerAreaScore,
    areaKey
};
