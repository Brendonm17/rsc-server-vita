// learning: a bot adapts from experience, persisted in cache.bot.learning
//   - eat threshold: near-deaths teach it to eat sooner, safe fights make it braver
//   - enemy danger: monster types that nearly killed it get eaten-earlier against
//   - goal strategy: leans goal choices toward the goal types it finishes

function store(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) {
        return null;
    }
    if (!cb.learning) {
        cb.learning = { eatBias: 0, enemyDanger: {}, goalStats: {}, _lifeLow: 1 };
    }
    return cb.learning;
}

// eat threshold after learning: base nudged up by eatBias and the current foe's danger
function eatAtFor(bot, base) {
    const L = store(bot);
    if (!L) {
        return base;
    }
    let v = base + (L.eatBias || 0);
    const opp = bot.opponent;
    if (opp && opp.id !== undefined && !opp.username) {
        const d = L.enemyDanger[opp.id] || 0;
        v += Math.min(0.15, d * 0.02);
    }
    return v < 0.1 ? 0.1 : v > 0.85 ? 0.85 : v;
}

// per-tick hp tracking: a new near-death low raises eatBias and blames the foe;
// recovering to full relaxes it slightly
function onTick(bot) {
    const L = store(bot);
    if (!L) {
        return;
    }
    const hits = bot.skills && bot.skills.hits;
    const max = hits && hits.base ? hits.base : 0;
    if (!max) {
        return;
    }
    const frac = hits.current / max;

    if (frac < (L._lifeLow == null ? 1 : L._lifeLow)) {
        L._lifeLow = frac;
        if (frac < 0.25) {
            L.eatBias = Math.min(0.2, (L.eatBias || 0) + 0.02);
            const opp = bot.opponent;
            if (opp && opp.id !== undefined && !opp.username) {
                L.enemyDanger[opp.id] = (L.enemyDanger[opp.id] || 0) + 1;
            }
        }
    }

    if (frac > 0.95) {
        if (L._lifeLow != null && L._lifeLow > 0.4) {
            L.eatBias = Math.max(-0.1, (L.eatBias || 0) - 0.004); // slowly braver
        }
        L._lifeLow = 1;
    }
}

// on death: eat much earlier next time and mark the killer type dangerous
function onDeath(bot, killer) {
    const L = store(bot);
    if (!L) {
        return;
    }
    L.eatBias = Math.min(0.25, (L.eatBias || 0) + 0.05);
    if (killer && killer.id !== undefined && !killer.username) {
        L.enemyDanger[killer.id] = (L.enemyDanger[killer.id] || 0) + 3;
    }
    L._lifeLow = 1;
    // dying drifts the bot warier
    try { require('./personality').drift(bot, 'risk', -0.02); } catch (e) {  }
}

// record a goal outcome (completed vs abandoned) for a goal type
function noteGoal(bot, type, completed) {
    const L = store(bot);
    if (!L) {
        return;
    }
    const s = L.goalStats[type] || (L.goalStats[type] = { done: 0, fail: 0 });
    if (completed) {
        s.done += 1;
    } else {
        s.fail += 1;
    }
}

// per-type goal-selection multiplier: 0.5 (keeps failing) to 1.5 (reliably finishes), 1.0 until enough history
function goalWeight(bot, type) {
    const L = store(bot);
    if (!L) {
        return 1;
    }
    const s = L.goalStats[type];
    if (!s || s.done + s.fail < 2) {
        return 1;
    }
    return 0.5 + s.done / (s.done + s.fail);
}

function dangerOf(bot, npcId) {
    const L = store(bot);
    return L && L.enemyDanger[npcId] ? L.enemyDanger[npcId] : 0;
}

module.exports = {
    eatAtFor,
    onTick,
    onDeath,
    noteGoal,
    goalWeight,
    dangerOf
};
