// "set out to make a specific thing": a bot picks one valuable finished product,
// commits, gathers and refines up the chain graph, and stops when it holds it.
//
// a thin wrapper over the engine: a produce goal is an ordinary {type:'skill', skill}
// goal with a `produce` tag, so it inherits site-steering, feedstock protection, the
// gather brains, and the chain runner. this module adds only target selection
// (pickTarget), the per-goal plan tags (planTags), and heldCount for the completion latch.
//
// only offers a product whose whole chain runs on driven edges end to end, terminates
// in a gather-steerable skill, and reduces to gatherable raws consumed by that skill
// (every other input a shop secondary, tool, or coins). in practice: iron smithing
// gear and cooked food. anything needing a looted co-input or a non-driven step is never offered

const ik = require('./item-knowledge');
const personality = require('./personality');
const requirements = require('./requirements');
let _gear; // gear.js resolved lazily (only in pickTarget)
function gearMod() { return _gear || (_gear = require('./gear')); }

// usefulness multiplier: a fighter values a product it can wield and upgrade into
// above the priciest item to sell; a skiller/merchant just chases price
function usefulness(bot, id, p) {
    if (p.aggression < 0.35) { return 1; } // non-fighters: price is the whole driver
    try { return gearMod().wantsGearDrop(bot, id) ? (1 + p.aggression * 1.5) : 1; } catch (e) { return 1; }
}

// terminal skills career.js steers to a gather site; only these relocate a bot to
// where its base raw is gathered
const GATHER_STEER = { smithing: 'mining', cooking: 'fishing', fletching: 'woodcutting', firemaking: 'woodcutting' };
// secondaries needs.js will buy for the skill, so a base input among them is acquirable
// (feather, arrowhead, vial, eye of newt, needle, thread, ring mould)
const SHOP_WIRED = new Set([381, 669, 464, 270, 39, 43, 293]);
// materials the processing pick-trips provision (flax, picked on a spinning-chain trip)
const PROVISIONABLE = new Set([675]); // flax
const COINS_ID = 10;
const DEPTH_CAP = 4;    // don't commit to an absurdly deep chain

let CBS = null;         // candidates by skill, built once (lazy, after item merge)
let GATHER_LVL = null;  // Map<rawItemId, minGatherLevel> for ores + fish + logs

// gather-level tables, so reach gates on "can i even gather the base raw yet"
function buildGatherLevels() {
    const m = new Map();
    try {
        const mining = require('@2003scape/rsc-data/skills/mining');
        for (const key of Object.keys(mining.rocks || {})) {
            let r = mining.rocks[key];
            if (r && r.reference != null) { r = mining.rocks[r.reference]; }
            if (r && r.ore != null) {
                const cur = m.get(Number(r.ore));
                const lvl = r.level || 1;
                if (cur == null || lvl < cur) { m.set(Number(r.ore), lvl); }
            }
        }
    } catch (e) {}
    try {
        const fishing = require('@2003scape/rsc-data/skills/fishing');
        for (const key of Object.keys(fishing.spots || {})) {
            let s = fishing.spots[key];
            if (s && s.reference != null) { s = fishing.spots[s.reference]; }
            if (!s) { continue; }
            for (const method of Object.values(s)) {
                if (!method || !method.fish) { continue; }
                for (const [fishId, def] of Object.entries(method.fish)) {
                    const cur = m.get(Number(fishId));
                    const lvl = (def && def.level) || 1;
                    if (cur == null || lvl < cur) { m.set(Number(fishId), lvl); }
                }
            }
        }
    } catch (e) {}
    try {
        const wc = require('@2003scape/rsc-data/skills/woodcutting');
        for (const key of Object.keys(wc.trees || {})) {
            let t = wc.trees[key];
            if (t && t.reference != null) { t = wc.trees[t.reference]; }
            if (t && t.log != null) { // the woodcutting table field is `log` (singular)
                const cur = m.get(Number(t.log));
                const lvl = t.level || 1;
                if (cur == null || lvl < cur) { m.set(Number(t.log), lvl); }
            }
        }
    } catch (e) {}
    return m;
}
function gatherLevelOf(rawId) {
    if (!GATHER_LVL) { GATHER_LVL = buildGatherLevels(); }
    const l = GATHER_LVL.get(Number(rawId));
    return l != null ? l : 1;
}

// classify a chain's base input: how does the bot obtain it?
//   'gather'  = a raw the terminal skill's gather-steer collects
//   'shop'    = a needs.js-bought secondary
//   'tool' / 'coins' = already-owned kit
//   'blocker' = anything else (looted/uncraftable), disqualifies the target
function baseKind(id, terminalSkill) {
    const r = ik.roleOf(id);
    if (r.tool) { return 'tool'; }
    if (Number(id) === COINS_ID) { return 'coins'; }
    if (r.classes.includes('raw') && r.skills.includes(terminalSkill)) { return 'gather'; }
    if (PROVISIONABLE.has(Number(id))) { return 'provision'; } // flax etc., a pick-trip provisions it
    if (SHOP_WIRED.has(Number(id)) && r.tradeable) { return 'shop'; }
    return 'blocker';
}

function buildCandidates() {
    const out = {};
    const DRIVEN = require('./processing').DRIVEN_ADVANCE_KINDS; // single source of truth
    const N = ik.maxId();
    for (let id = 0; id < N; id++) {
        const r = ik.roleOf(id);
        if (!r.finished || !r.tradeable) { continue; }
        const rec = ik.recipeFor(id);
        if (!rec || !GATHER_STEER[rec.skill]) { continue; }        // terminal skill must be gather-steerable
        const ct = ik.chainTo(id);
        if (!ct.steps.length) { continue; }
        if (!ct.steps.every((s) => s.driver === true && DRIVEN.has(s.kind))) { continue; } // every step executable
        const depth = ik.chainDepth(id);
        if (depth > DEPTH_CAP) { continue; }
        // base inputs: one or more gather raws all consumed by the terminal skill
        // (steel = iron + coal); every other input a provision/shop/tool/coins, no blockers
        let gatherId = null; let gatherLvl = 0; let gatherCount = 0; let bad = false;
        for (const b of ct.baseInputs) {
            const k = baseKind(b.id, rec.skill);
            if (k === 'blocker') { bad = true; break; }
            if (k === 'gather') {
                gatherCount += 1;
                const gl = gatherLevelOf(b.id);
                if (gl > gatherLvl) { gatherLvl = gl; gatherId = Number(b.id); } // hardest ore sets the gather-level req
            }
        }
        if (bad || gatherCount < 1) { continue; }
        // per-skill level req = deepest step in each skill, plus the hardest base ore's
        // gather level, so reach gates on "can i gather and process this"
        const req = {};
        for (const s of ct.steps) { req[s.skill] = Math.max(req[s.skill] || 0, s.level); }
        const gSkill = GATHER_STEER[rec.skill];
        req[gSkill] = Math.max(req[gSkill] || 0, gatherLvl);
        (out[rec.skill] || (out[rec.skill] = [])).push({
            id, skill: rec.skill, price: r.price, depth, terminalLevel: rec.level, req, gatherId
        });
    }
    // keep all candidates per skill (no price cap, so low bots still see iron gear);
    // sorted dearest-first for readability
    for (const s in out) { out[s].sort((a, b) => b.price - a.price); }
    return out;
}

function lvl(bot, s) { const k = bot.skills && bot.skills[s]; return k ? (k.current != null ? k.current : k.base) || 1 : 1; }
// weighted pick, variety over argmax; wof(x) is a non-negative weight
function wpick(arr, wof, r) {
    let t = 0; for (const x of arr) { t += Math.max(0, wof(x)); }
    if (t <= 0) { return arr[arr.length - 1]; }
    let a = (r != null ? r : Math.random()) * t;
    for (const x of arr) { a -= Math.max(0, wof(x)); if (a <= 0) { return x; } }
    return arr[arr.length - 1];
}
function reachSlack(p) { return 2 + p.diligence * 6 + p.patience * 3; } // ~2 to 11 levels a bot will reach for

// is every skill this candidate needs within reach? the terminal and gather skills
// are trained during the attempt, so they get optimistic slack; a secondary co-skill
// is not trained here, so it must be met now or the bot stalls at that step
function reachable(bot, c, slack) {
    const gatherSkill = GATHER_STEER[c.skill];
    for (const s in c.req) {
        const trained = (s === c.skill || s === gatherSkill);
        if (lvl(bot, s) + (trained ? slack : 0) < c.req[s]) { return false; }
    }
    return true;
}

// pick a target: play to a strength skill, then a valuable-but-achievable product in it.
// returns a candidate or null (nothing reachable, so the caller keeps a plain skill goal)
function pickTarget(bot, opts = {}) {
    if (!CBS) { CBS = buildCandidates(); }
    const p = personality.of(bot);
    let skill = opts.skill;
    if (!skill) {
        const pool = Object.keys(CBS).filter((s) => requirements.skillUnlocked(bot, s));
        if (!pool.length) { return null; }
        skill = wpick(pool, (s) => Math.pow(1 + lvl(bot, s), 1 + p.diligence)); // strength-weighted
    }
    const cands = CBS[skill];
    if (!cands || !cands.length) { return null; }
    const slack = reachSlack(p);
    const ok = cands.filter((c) => reachable(bot, c, slack));
    if (!ok.length) { return null; }
    // score: valuable, a mild achievable stretch, short chains
    const valuePow = 0.55 + p.greed * 0.5 + p.diligence * 0.25;
    const sweet = p.diligence * 8; // diligent bots aim a little higher above their level
    const scored = ok.map((c) => {
        const gap = c.terminalLevel - lvl(bot, skill);
        const reachFit = 1 / (1 + Math.abs(gap - sweet) / 6);
        const depthFit = 1 / (1 + Math.max(0, c.depth - 2) * 0.5);
        const base = Math.pow(Math.max(1, c.price), valuePow) * reachFit * depthFit * usefulness(bot, c.id, p);
        return { c, w: Math.pow(base, 1 + p.diligence) };
    });
    return wpick(scored, (x) => x.w).c;
}

// can the bot make this specific item as a produce target right now?
function candidateFor(itemId, bot) {
    if (!CBS) { CBS = buildCandidates(); }
    itemId = Number(itemId);
    for (const s in CBS) {
        const c = CBS[s].find((x) => x.id === itemId);
        if (c) { return reachable(bot, c, reachSlack(personality.of(bot))) ? c : null; }
    }
    return null;
}
function canMake(bot, itemId) { return !!candidateFor(itemId, bot); }

// how many of `id` the bot holds (bag + bank)
function heldCount(bot, id) {
    id = Number(id);
    let n = 0;
    const inv = (bot.inventory && bot.inventory.items) || [];
    for (const it of inv) { if (it.id === id) { n += it.amount || 1; } }
    const bk = (bot.bank && bot.bank.items) || [];
    for (const it of bk) { if (it.id === id) { n += it.amount || 1; } }
    return n;
}

// plan tags carried on the produce goal, precomputed once at creation:
//   _keep       every id on the chain, so economy never sells them
//   _onPath     the set of step products, so advanceHeldOne only refines toward these
//   _kindProduct edge.kind -> the on-path product, so the process-trip forges the right item
//   _start/_made completion latch; _ticks/_stall/_prog the stuck-abandon backstop
function chainSets(id) {
    const ct = ik.chainTo(id);
    const keep = new Set([id]);
    const onPath = new Set();
    const kindProduct = {};
    for (const e of ct.steps) {
        onPath.add(Number(e.product));
        kindProduct[e.kind] = Number(e.product);
        for (const inp of e.inputs) { keep.add(Number(inp.id)); }
    }
    for (const b of ct.baseInputs) { keep.add(Number(b.id)); }
    return { keep, onPath, kindProduct };
}

function planTags(t, bot) {
    const id = Number(t.id);
    const { keep, onPath, kindProduct } = chainSets(id);
    return {
        id, price: t.price, depth: t.depth, terminalLevel: t.terminalLevel, gatherId: t.gatherId,
        _keep: keep, _onPath: onPath, _kindProduct: kindProduct,
        _start: heldCount(bot, id), _made: false, _ticks: 0, _stall: 0, _prog: 0
    };
}

// Sets don't survive the save (JSON turns them into {}), so a restored goal's
// plan tags are rebuilt from its chain the first time they're read
function hydrate(pr) {
    if (!pr || typeof pr !== 'object' || pr.id == null) return pr;
    if (!(pr._keep instanceof Set) || !(pr._onPath instanceof Set)) {
        try {
            const { keep, onPath, kindProduct } = chainSets(Number(pr.id));
            pr._keep = keep;
            pr._onPath = onPath;
            if (!pr._kindProduct || typeof pr._kindProduct !== 'object') pr._kindProduct = kindProduct;
        } catch (e) {
            pr._keep = new Set([Number(pr.id)]);
            pr._onPath = new Set();
            if (!pr._kindProduct) pr._kindProduct = {};
        }
    }
    return pr;
}

module.exports = { pickTarget, candidateFor, canMake, planTags, hydrate, heldCount, GATHER_STEER };
