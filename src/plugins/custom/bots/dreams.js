// a bot's long-term aspiration: a concrete target (item/level/gold/boss) it works toward, talks about,
// and replaces with a bigger one when reached. biases goal picks. persisted in cache.bot.dream.

const items = require('@2003scape/rsc-data/config/items');
const wield = require('@2003scape/rsc-data/wieldable');
const personality = require('./personality');

// say a line in the bot's own voice (dream celebrations / musings out loud).
function saySelf(bot, text) {
    let out = text;
    try { out = require('./voice').apply(bot, text); } catch (e) {  }
    // a self-utterance: wrap it so it doesn't trigger nearby hearing-reactions.
    bot._reactionSpeak = true;
    try { bot.broadcastChat(out); } catch (e) {  } finally { bot._reactionSpeak = false; }
}

// aspirational gear ladder, built once.
let GEAR = null;
function gearLadder() {
    if (GEAR) return GEAR;
    GEAR = [];
    for (const id in wield) {
        const d = items[id];
        if (!d || !d.price || d.price < 60) continue; // members gear is dreamable too
        GEAR.push({ id: Number(id), name: d.name, price: d.price });
    }
    GEAR.sort((a, b) => a.price - b.price);
    return GEAR;
}

const COIN_MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000];
const LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
const COMBAT_SKILLS = ['attack', 'strength', 'defense', 'hits'];
const GATHER_SKILLS = ['woodcutting', 'mining', 'fishing'];
const MISC = [
    { kind: 'explore', label: 'to see every corner of the world' },
    { kind: 'explore', label: 'to become a proper legend around here' },
    { kind: 'explore', label: 'to visit every town and dungeon' },
    { kind: 'social', label: 'to make a bunch of good friends' },
    { kind: 'social', label: 'to lead the best party in the land' }
];

const COINS_ID = 10;

function coins(bot) {
    let n = 0;
    for (const it of bot.inventory.items) if (it.id === COINS_ID) n += it.amount || 1;
    return n;
}
function combatLevel(bot) {
    return bot.getCombatLevel ? bot.getCombatLevel() : bot.combatLevel || 3;
}
function skillBase(bot, name) {
    return bot.skills && bot.skills[name] ? bot.skills[name].base : 1;
}
function nextAbove(current, arr) {
    for (const m of arr) if (m > current) return m;
    return null;
}
function article(name) {
    return /^[aeiou]/i.test(name) ? 'an ' : 'a ';
}
function owns(bot, id) {
    return bot.inventory && bot.inventory.items.some((it) => it.id === id);
}
function fmt(n) {
    return n >= 1000000 ? Math.round(n / 100000) / 10 + 'm' : n >= 1000 ? Math.round(n / 100) / 10 + 'k' : String(n);
}

// generate a concrete dream scaled to the bot's state.
function makeGearDream(bot) {
    const ladder = gearLadder();
    if (!ladder.length) return null;
    const have = coins(bot);
    // aim above what it can afford (roughly 2x..20x its coins), with a floor.
    const lo = Math.max(300, have * 2);
    const hi = Math.max(lo + 500, have * 20 + 2000);
    const band = ladder.filter((g) => g.price >= lo && g.price <= hi && !owns(bot, g.id));
    const pick = (band.length ? band : ladder.filter((g) => g.price > have && !owns(bot, g.id)))[0]
        || ladder[Math.min(ladder.length - 1, Math.floor(ladder.length * 0.6))];
    return { kind: 'gear', itemId: pick.id, price: pick.price, label: article(pick.name) + pick.name.toLowerCase() };
}
function makeWealthDream(bot) {
    const target = nextAbove(coins(bot) + 1, COIN_MILESTONES) || coins(bot) * 2;
    return { kind: 'wealth', target, label: fmt(target) + ' coins to my name' };
}
function makeCombatDream(bot) {
    const target = nextAbove(combatLevel(bot), LEVEL_MILESTONES) || 99;
    const flavour = target >= 90 ? 'the very top' : 'combat level ' + target;
    return { kind: 'combat', target, label: flavour };
}
function makeStatDream(bot) {
    const stat = COMBAT_SKILLS[Math.floor(Math.random() * COMBAT_SKILLS.length)];
    const target = nextAbove(skillBase(bot, stat), LEVEL_MILESTONES) || 99;
    const nice = stat === 'hits' ? 'hitpoints' : stat === 'defense' ? 'defence' : stat;
    return { kind: 'stat', stat, target, label: 'level ' + target + ' ' + nice };
}
function makeSkillDream(bot) {
    const skill = GATHER_SKILLS[Math.floor(Math.random() * GATHER_SKILLS.length)];
    const cur = skillBase(bot, skill);
    const target = cur >= 85 ? 99 : nextAbove(cur, LEVEL_MILESTONES) || 99;
    return { kind: 'skill', skill, target, label: (target === 99 ? '99 ' : 'level ' + target + ' ') + skill };
}
function makeBossDream(bot) {
    let BOSSES;
    try { BOSSES = require('./goals').BOSSES; } catch (e) { BOSSES = []; }
    const cl = combatLevel(bot);
    // the next boss it can't yet handle (a real stretch), else the toughest.
    const reach = BOSSES.filter((b) => b.minCombat > cl).sort((a, b) => a.minCombat - b.minCombat)[0]
        || BOSSES[BOSSES.length - 1];
    if (!reach) return makeCombatDream(bot);
    return { kind: 'boss', bossId: reach.id, minCombat: reach.minCombat, label: 'to slay ' + reach.name };
}
function makeMiscDream() {
    return Object.assign({}, MISC[Math.floor(Math.random() * MISC.length)]);
}

// pick a dream kind by personality and re-roll one that's already satisfied.
// fall back to a wealth dream (a genuine reach) if every kind is already met.
function generate(bot) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const d = generateOne(bot);
        if (d && !isAchieved(bot, d)) { return d; }
    }
    return makeWealthDream(bot); // guaranteed a real reach even for a fully-maxed bot
}
function generateOne(bot) {
    const p = personality.of(bot);
    const roll = Math.random();
    const w = {
        gear: 0.15 + p.greed * 0.25 + p.aggression * 0.1,
        wealth: 0.1 + p.greed * 0.5,
        combat: 0.1 + p.aggression * 0.4,
        stat: 0.08 + p.aggression * 0.25,
        skill: 0.08 + p.diligence * 0.4 + (1 - p.aggression) * 0.15,
        boss: combatLevel(bot) >= 25 ? p.aggression * 0.3 + p.risk * 0.15 : 0,
        misc: 0.06 + p.curiosity * 0.25 + p.sociability * 0.1
    };
    // damp a well-worn dream kind's weight, so ambitions shift shape over a life.
    const byKind = (bot.cache && bot.cache.bot && bot.cache.bot.dreamsByKind) || {};
    for (const k in w) { w[k] *= 1 / (1 + (byKind[k] || 0) * 0.45); }
    let total = 0; for (const k in w) total += w[k];
    let r = roll * total;
    let kind = 'gear';
    for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) { kind = k; break; } }
    switch (kind) {
        case 'wealth': return makeWealthDream(bot);
        case 'combat': return makeCombatDream(bot);
        case 'stat': return makeStatDream(bot);
        case 'skill': return makeSkillDream(bot);
        case 'boss': return makeBossDream(bot);
        case 'misc': return makeMiscDream();
        default: return makeGearDream(bot) || makeWealthDream(bot);
    }
}

function ensure(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return null;
    if (cb.dream && cb.dream.label) return cb.dream;
    cb.dream = generate(bot);
    return cb.dream;
}

function label(bot) {
    const d = ensure(bot);
    return d ? d.label : null;
}

// 0..1 progress toward the dream, or null if it can't be measured.
function progressFrac(bot, d) {
    d = d || ensure(bot);
    if (!d) return null;
    switch (d.kind) {
        case 'gear': return Math.min(1, coins(bot) / d.price);
        case 'wealth': return Math.min(1, coins(bot) / d.target);
        case 'combat': return Math.min(1, combatLevel(bot) / d.target);
        case 'stat': return Math.min(1, skillBase(bot, d.stat) / d.target);
        case 'skill': return Math.min(1, skillBase(bot, d.skill) / d.target);
        case 'boss': return Math.min(1, combatLevel(bot) / d.minCombat);
        default: return null;
    }
}

// a human, numbers-and-all description of where the dream stands.
function describe(bot) {
    const d = ensure(bot);
    if (!d) return 'just keeping busy.';
    const f = progressFrac(bot, d);
    switch (d.kind) {
        case 'gear': {
            const have = coins(bot), need = Math.max(0, d.price - have);
            if (need <= 0) return "i've finally saved up for " + d.label + "!";
            return 'saving up for ' + d.label + ' - ' + fmt(have) + ' of ' + fmt(d.price) + ' gp there.';
        }
        case 'wealth':
            return "i'm chasing " + d.label + " - got " + fmt(coins(bot)) + ' so far.';
        case 'combat': {
            const cl = combatLevel(bot);
            return cl >= d.target ? "made it to " + d.label + "!" : 'working toward ' + d.label + ' (I\'m ' + cl + ' now).';
        }
        case 'stat': {
            const cur = skillBase(bot, d.stat);
            return cur >= d.target ? 'got my ' + d.label + '!' : "after " + d.label + ' - ' + (d.target - cur) + ' to go.';
        }
        case 'skill': {
            const cur = skillBase(bot, d.skill);
            return cur >= d.target ? 'got ' + d.label + '!' : 'grinding for ' + d.label + ' - ' + (d.target - cur) + ' levels off.';
        }
        case 'boss':
            return f >= 1 ? "i'm ready " + d.label + " now!" : 'one day, ' + d.label + ' - getting stronger for it.';
        default:
            return "my dream? " + d.label + ".";
    }
}

// short phrase for casual mentions.
function shortLabel(bot) {
    const d = ensure(bot);
    if (!d) return null;
    if (d.kind === 'boss' || d.kind === 'explore' || d.kind === 'social') return d.label; // already "to ..."
    return d.label;
}

// goal-type multipliers the dream pulls toward; the pull strengthens as the dream nears.
function bias(bot) {
    const d = ensure(bot);
    if (!d) return {};
    const f = progressFrac(bot, d);
    const s = 1.4 + (f === null ? 0.2 : f) * 1.8; // ~1.4 far -> ~3.2 nearly there
    switch (d.kind) {
        case 'gear': {
            // if the bot can make the dreamed item, also lean it toward producing, not just buying.
            let makeable = false;
            try { makeable = require('./produce').canMake(bot, d.itemId); } catch (e) {  }
            return makeable ? { gearUp: s, getRich: s * 0.9, produce: s * 1.15 } : { gearUp: s, getRich: s * 0.9 };
        }
        case 'wealth': return { getRich: s };
        case 'combat': return { levelUp: s };
        case 'stat': return { levelUp: s };
        case 'skill': return { skill: s };
        case 'boss': return { boss: s, levelUp: 1.2 + (f || 0) * 0.6 };
        case 'explore': return { explore: s };
        default: return {};
    }
}

function isAchieved(bot, d) {
    d = d || ensure(bot);
    if (!d) return false;
    switch (d.kind) {
        case 'gear': {
            if (owns(bot, d.itemId)) return true;
            // "saved up for it" only counts when no shop in the world sells it
            let buyable = true;
            try { buyable = !!require('./map-data').anyShopSelling(d.itemId); } catch (e) { buyable = true; }
            return !buyable && coins(bot) >= d.price;
        }
        case 'wealth': return coins(bot) >= d.target;
        case 'combat': return combatLevel(bot) >= d.target;
        case 'stat': return skillBase(bot, d.stat) >= d.target;
        case 'skill': return skillBase(bot, d.skill) >= d.target;
        case 'boss': return !!d._slain;
        default: return false; // explore/social are open-ended aspirations
    }
}

// mark a boss dream fulfilled (called when the bot kills its dream boss).
function noteBossKill(bot, npcId) {
    const d = bot.cache && bot.cache.bot && bot.cache.bot.dream;
    if (d && d.kind === 'boss' && d.bossId === npcId) d._slain = true;
}

const ACHIEVE_LINES = {
    gear: ['dream come true - {label}!', 'finally, {label} is within reach!', "years of saving and {label} is mine!"],
    wealth: ['{label} - I actually did it!', 'rich at last!', 'the vault is full, {label}!'],
    combat: ['{label}, baby! all that training paid off.', 'reached {label} - unstoppable now.'],
    stat: ['got my {label}! feels great.', '{label} at last!'],
    skill: ['{label} done! what a grind.', 'finally, {label}!'],
    boss: ['I actually slew it! dream fulfilled.', 'the beast is down - dream achieved!']
};

// lines for a mid-life pivot (a bot changing the kind of dream it chases).
const PIVOT_LINES = {
    combat: ['done with fighting for now - think i\'ll take up a trade.', 'putting the sword down a while; fancy learning a craft.'],
    wealth: ['rich enough - now for something that actually matters.', 'money isn\'t everything. off to see the world, i think.'],
    gear: ['got the kit i wanted; time for a fresh challenge.'],
    stat: ['levels aren\'t everything - fancy a change of pace.'],
    skill: ['mastered that trade; on to the next thing.'],
    boss: ['slain enough beasts. quieter pursuits from here, i reckon.'],
    misc: ['done wandering - time to knuckle down at something.']
};
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// per-tick: if the dream is fulfilled, celebrate and form a bigger one.
function onTick(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return;
    const d = ensure(bot);
    if (!d) return;

    if (isAchieved(bot, d)) {
        const pool = ACHIEVE_LINES[d.kind] || ['dream achieved!'];
        const line = pool[Math.floor(Math.random() * pool.length)].replace('{label}', d.label);
        saySelf(bot, line);
        cb.dreamsAchieved = (cb.dreamsAchieved || 0) + 1;
        cb.dreamsByKind = cb.dreamsByKind || {};
        cb.dreamsByKind[d.kind] = (cb.dreamsByKind[d.kind] || 0) + 1;
        const wornKind = d.kind; const wornCount = cb.dreamsByKind[d.kind];
        // record the fulfilled dream as lore, let it earn a title, and harden diligence a touch.
        try {
            const kind = d.kind === 'boss' ? 'kill' : d.kind === 'wealth' || d.kind === 'gear' ? 'find' : 'level';
            const num = d.target || d.price || 0;
            require('./lore').record(bot, kind, { subj: shortLabel(bot) || d.label, num });
        } catch (e) {  }
        try { require('./titles').titleOf(bot); } catch (e) {  }
        try { require('./personality').drift(bot, 'diligence', 0.01); } catch (e) {  }
        cb.dream = null;
        const next = ensure(bot); // form the next (naturally bigger, since state has grown)
        // announce a shift to a different dream kind after wearing one out.
        if (next && next.kind !== wornKind && wornCount >= 3 && Math.random() < 0.7) {
            saySelf(bot, PIVOT_LINES[wornKind] ? pick(PIVOT_LINES[wornKind]) : 'time for something different, i reckon.');
        }
        return;
    }

    // an open-ended explore/social dream never "achieves", so age it and roll a fresh one after a long spell.
    if (d.kind === 'explore' || d.kind === 'social') {
        cb._miscAge = (cb._miscAge || 0) + 1;
        if (cb._miscAge > 6000) { cb._miscAge = 0; cb.dream = null; ensure(bot); return; }
    } else if (cb._miscAge) {
        cb._miscAge = 0;
    }

    // occasionally muse aloud about how close it's getting (progress is real).
    bot._dreamMuseCd = (bot._dreamMuseCd || 0) - 1;
    if (bot._dreamMuseCd <= 0) {
        bot._dreamMuseCd = 1500 + Math.floor(Math.random() * 3000);
        const f = progressFrac(bot, d);
        if (f !== null && f > 0.6 && Math.random() < 0.5) {
            saySelf(bot, "so close to " + shortLabel(bot) + " now!");
        }
    }
}

module.exports = {
    ensure,
    label,
    shortLabel,
    describe,
    bias,
    progressFrac,
    isAchieved,
    noteBossKill,
    onTick,
    generate
};
