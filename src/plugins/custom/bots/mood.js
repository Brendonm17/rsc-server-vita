// bot mood: three scalars that decay toward a personality baseline, bumped by events, persisted in cache.bot.mood.
//   valence: content <-> frustrated; energy: fresh <-> bored; confidence: timid <-> on-a-roll

const personality = require('./personality');
// memoised lazy require of ./factions (avoids a per-tick cost and a load-time circular require).
let _factions;
function factionsMod() { return _factions || (_factions = require('./factions')); }
const clamp01 = personality.clamp01;

const DECAY = 0.003; // per-tick pull back toward baseline
const BORED = 0.0006; // extra energy drain while actively working
const MIN_GAP = 16; // min ticks between any two spoken lines (anti-spam)

// line pools keyed by archetype then mood bucket, plus event pools.
const LINES = {
    levelup: ['Level up!', 'Another level, get in!', 'Ding!', 'Getting stronger.'],
    death: ['Argh!', 'That went badly...', 'Ouch, close one.'],
    warrior: {
        high: ['Too easy.', 'Come on then!', 'Is that all?'],
        mid: ['Good scrap.', 'Keep em coming.'],
        low: ['Getting dicey...', 'Need a breather.']
    },
    skiller: {
        high: ["Bank's filling up nicely.", 'Love this spot.'],
        mid: ['Just topping up the bank.', 'Steady does it.'],
        low: ['Bit tired of this.', 'Could use a break.']
    },
    merchant: {
        high: ['Profit!', 'Business is good.'],
        mid: ['Stacking the coins.', 'Buy low, sell high.'],
        low: ['Slow trade today.']
    },
    wanderer: {
        high: ['Nice out here.', "Wonder what's over there."],
        mid: ['Just having a look round.', 'Bit of a wander.'],
        low: ['Lost track of time.']
    },
    loner: {
        high: ['Better off alone.'],
        mid: ['...'],
        low: ['Hmph.']
    },
    quester: {
        high: ['Adventure awaits!', 'On a roll today.'],
        mid: ['Plenty to do.', 'Onwards.'],
        low: ['Long day.']
    },
    casual: {
        high: ['This is fun!', 'Good times.'],
        mid: ['Just messing about.', 'Chilling.'],
        low: ['Meh.']
    }
};

function totalCombatXp(bot) {
    const s = bot.skills;
    return (
        s.attack.experience +
        s.strength.experience +
        s.defense.experience +
        s.hits.experience
    );
}

function totalBase(bot) {
    let n = 0;
    for (const k of Object.keys(bot.skills)) {
        n += bot.skills[k].base;
    }
    return n;
}

function baseline(p) {
    return {
        valence: clamp01(0.45 + (p.sociability - 0.5) * 0.2),
        energy: clamp01(0.55 + (p.diligence - 0.5) * 0.2),
        confidence: clamp01(0.4 + p.risk * 0.2)
    };
}

function init(p) {
    return baseline(p);
}

function of(bot) {
    const m = bot && bot.cache && bot.cache.bot && bot.cache.bot.mood;
    return m || { valence: 0.5, energy: 0.6, confidence: 0.5 };
}

function bucket(m) {
    if (m.confidence > 0.7 && m.valence > 0.6) {
        return 'high';
    }
    if (m.valence < 0.35 || m.confidence < 0.3) {
        return 'low';
    }
    return 'mid';
}

// combined combat eat threshold: personality base, nudged by mood.
function combatEatAt(bot) {
    const p = personality.of(bot);
    const m = of(bot);
    let eat = personality.baseEatAt(p);

    if (m.valence < 0.35 || m.confidence < 0.3) {
        eat += 0.12; // rattled -> eat sooner
    }
    if (m.confidence > 0.75) {
        eat -= 0.05; // on a roll -> braver
    }

    return Math.max(0.2, Math.min(0.8, clamp01(eat)));
}

// true when the bot is worn out and should take a short breather.
function wantsBreather(bot) {
    return of(bot).energy < 0.22;
}

function bump(m, field, delta) {
    m[field] = clamp01(m[field] + delta);
}

// clamped mood nudge for other systems; no-op without a mood store.
function nudge(bot, field, delta) {
    const m = bot && bot.cache && bot.cache.bot && bot.cache.bot.mood;
    if (!m || typeof m[field] !== 'number') return;
    bump(m, field, delta);
}

function pick(bot, pool) {
    if (!pool || !pool.length) {
        return null;
    }

    const t = bot._moodTrack;
    let line = pool[Math.floor(Math.random() * pool.length)];

    if (line === t.lastLine && pool.length > 1) {
        line = pool[(pool.indexOf(line) + 1) % pool.length];
    }

    return line;
}

function speak(bot, line) {
    if (!line) {
        return;
    }

    const t = bot._moodTrack;
    t.sinceSpoke = 0;
    t.lastLine = line;

    try {
        bot.broadcastChat(line); // overhead to nearby players (co-op path)
    } catch (e) {
        // no nearby audience; mood tracked regardless
    }
}

function onTick(bot) {
    const cb = bot.cache && bot.cache.bot;

    if (!cb || !cb.mood) {
        return;
    }

    const p = cb.personality || personality.of(bot);
    const m = cb.mood;
    const base = baseline(p);

    let t = bot._moodTrack;
    if (!t) {
        t = bot._moodTrack = {
            combatXp: totalCombatXp(bot),
            totalLevel: totalBase(bot),
            hits: bot.skills.hits.current,
            sinceSpoke: MIN_GAP,
            sinceAmbient: 0,
            lastLine: null,
            pending: null
        };
    }

    // events via deltas
    const cx = totalCombatXp(bot);
    if (cx > t.combatXp) {
        bump(m, 'confidence', 0.14);
        bump(m, 'valence', 0.06);
        t.combatXp = cx;
    }

    const tl = totalBase(bot);
    if (tl > t.totalLevel) {
        bump(m, 'valence', 0.22);
        bump(m, 'energy', 0.12);
        t.totalLevel = tl;
        t.pending = 'levelup';
    }

    if (bot.skills.hits.current <= 0 && t.hits > 0) {
        bump(m, 'confidence', -0.35);
        bump(m, 'valence', -0.25);
        t.pending = 'death';
    }
    t.hits = bot.skills.hits.current;

    // standing with a strong faction lifts the confidence baseline (courage in numbers).
    const target = { valence: base.valence, energy: base.energy, confidence: base.confidence };
    try {
        const factions = factionsMod();
        const fac = factions.factionOf(bot);
        if (fac) {
            const size = factions.sizeOf(fac.name);
            // +0.00 at a lone founder, up to ~+0.10 in a real crew of 6+.
            const belong = Math.max(0, Math.min(0.10, (size - 1) * 0.02));
            target.confidence = clamp01(base.confidence + belong);
        }
    } catch (e) {  }

    // decay toward baseline (target lifted by faction belonging)
    for (const f of ['valence', 'energy', 'confidence']) {
        if (m[f] < target[f]) {
            m[f] = Math.min(target[f], m[f] + DECAY);
        } else if (m[f] > target[f]) {
            m[f] = Math.max(target[f], m[f] - DECAY);
        }
    }

    if (bot.opponent || bot.gatheringSkill || bot.walkQueue.length) {
        m.energy = clamp01(m.energy - BORED);
    }

    // surface a line
    t.sinceSpoke += 1;
    t.sinceAmbient += 1;

    if (t.sinceSpoke < MIN_GAP) {
        return;
    }

    // event line first (level-up celebration / post-death grumble)
    if (t.pending) {
        speak(bot, pick(bot, LINES[t.pending]));
        t.pending = null;
        return;
    }

    // ambient line spaced by sociability; sometimes a context-aware remark.
    const interval = Math.floor(220 + (1 - p.sociability) * 500);
    if (t.sinceAmbient >= interval) {
        t.sinceAmbient = 0;
        let line = null;
        if (Math.random() < 0.55) {
            line = contextLine(bot);
        }
        if (!line) {
            const arch = LINES[p.archetype] || LINES.casual;
            line = pick(bot, arch[bucket(m)]);
        }
        speak(bot, line);
    }
}

// a situation- and place-aware remark from sayings.js/regions.js/its goal; null if nothing notable.
function contextLine(bot) {
    let c;
    try {
        c = require('./context').describe(bot);
    } catch (e) {
        return null;
    }
    const { pick: pickSay, line } = require('./sayings');

    // collect the situations that apply here, then generate a line for one of them.
    const sits = [];
    let regionSays = null;
    if (c.region && c.region.says) {
        regionSays = c.region.says;
        sits.push('__region');
    }
    if (c.onKaramja) sits.push('explore');
    if (c.canPvpHere) sits.push('pvp');
    else if (c.inWilderness && c.wildernessLevel >= 15) sits.push('pvp');
    if (c.canBankHere) sits.push('bank');
    if (c.canShopHere) sits.push('shop');
    if (c.canFightHere && !c.inWilderness) sits.push('combat');
    if (c.nearbyPlayers > 0 && !c.canPvpHere) sits.push('greet');

    // a line reflecting its goal.
    try {
        const g = require('./goals').current(bot);
        if (g && Math.random() < 0.4) {
            const gk = {
                levelUp: 'goalLevel', getRich: 'goalRich', gearUp: 'goalGear',
                explore: 'goalExplore', boss: 'combat', skill: 'gather'
            }[g.type];
            if (gk) {
                sits.push(gk);
            }
        }
    } catch (e) {
        // goals optional
    }

    if (!sits.length) {
        // nothing notable -> a plain idle musing now and then (else null).
        return Math.random() < 0.5 ? line(bot, 'idle', {}) : null;
    }
    const chosen = sits[Math.floor(Math.random() * sits.length)];
    if (chosen === '__region') {
        return pickSay(bot, regionSays); // curated place-flavoured line
    }
    return line(bot, chosen, {}); // generative, with curated fallback
}

module.exports = {
    init,
    of,
    onTick,
    combatEatAt,
    wantsBreather,
    baseline,
    nudge,
    bucket
};
