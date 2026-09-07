// generic gathering brain for mining and fishing: scan for the nearest reachable
// resource the bot can work at its level, walk to it, work it via the skill's
// plugin handler (one action per tick), and bank when the bag is full.
// woodcutting keeps its own brain. resource ids and levels come from rsc-data.

const { findPathAdjacent } = require('../pathfind');
const itemKnowledge = require('../item-knowledge');

const SCAN_RANGE = 48; // ~24-tile radius

// build a skill profile lazily, memoised per skill
const _profiles = {};
function profile(skill) {
    if (_profiles[skill]) {
        return _profiles[skill];
    }
    let p = null;
    if (skill === 'mining') {
        const { rocks, pickaxes } = require('@2003scape/rsc-data/skills/mining');
        const resourceIds = new Set(Object.keys(rocks).map(Number));
        const depleted = new Set(
            Object.values(rocks).map((r) => r.depleted).filter((x) => x != null)
        );
        const levelOf = (id) => {
            const r = rocks[id];
            if (!r) return 99;
            const base = r.reference != null ? rocks[r.reference] : r;
            return (base && base.level) || 1;
        };
        // rock object id -> the ore item it yields
        const oreOf = (id) => {
            const r = rocks[id];
            if (!r) return null;
            const base = r.reference != null ? rocks[r.reference] : r;
            return base && base.ore != null ? Number(base.ore) : null;
        };
        p = {
            skill,
            handler: require('../../../skills/mining'),
            resourceIds,
            depleted, // a rock swaps to its depleted twin when mined out
            levelOf,
            oreOf,
            // pickaxes best->worst; a bot needs any one to mine
            tools: Object.keys(pickaxes).map(Number),
            xpSkill: 'mining',
            canWork: (bot, obj) => levelOf(obj.id) <= ((bot.skills && bot.skills.mining && bot.skills.mining.current) || 1),
            commandFor: () => 'one' // onGameObjectCommandOne = "mine"
        };
    } else if (skill === 'fishing') {
        const { spots } = require('@2003scape/rsc-data/skills/fishing');
        const objs = require('@2003scape/rsc-data/config/objects');
        // a fishing spot offers 1-2 methods via its command list, each with a tool,
        // optional bait, and a fish-level table; the bot picks the best it can use
        const spotMethods = {}; // objId -> [{ cmd:'one'|'two', tool, bait, minLevel }]
        const toolSet = new Set();
        for (const id of Object.keys(spots).map(Number)) {
            const o = objs[id];
            if (!o || !o.commands) continue;
            const s = spots[id];
            const def = s.reference != null ? spots[s.reference] : s;
            if (!def) continue;
            const methods = [];
            o.commands.forEach((cmd, idx) => {
                if (idx > 1) return; // only command one (idx 0) and two (idx 1) are driveable
                const m = cmd.toLowerCase();
                const data = def[m];
                if (!data || !data.fish) return;
                const levels = Object.values(data.fish).map((f) => f.level || 1);
                methods.push({
                    cmd: idx === 0 ? 'one' : 'two',
                    tool: data.tool,
                    bait: data.bait || null, // bait/lure consume a bait item; net/harpoon/cage don't have one
                    minLevel: Math.min(...levels)
                });
                if (data.tool != null) toolSet.add(data.tool);
            });
            if (methods.length) spotMethods[id] = methods;
        }
        // usable now iff the bot has the tool (+ bait) and can catch the easiest fish;
        // prefer the method whose easiest fish is the highest level
        const usableMethods = (bot, obj) => {
            const ms = spotMethods[obj.id];
            if (!ms) return [];
            const lvl = (bot.skills && bot.skills.fishing && bot.skills.fishing.current) || 1;
            return ms.filter((m) =>
                m.tool != null && bot.inventory.has(m.tool) &&
                (!m.bait || bot.inventory.has(m.bait)) &&
                lvl >= m.minLevel
            );
        };
        p = {
            skill,
            handler: require('../../../skills/fishing'),
            resourceIds: new Set(Object.keys(spotMethods).map(Number)),
            depleted: new Set(), // spots don't deplete
            tools: [...toolSet], // any fishing tool lets the bot work some spot
            xpSkill: 'fishing',
            canWork: (bot, obj) => usableMethods(bot, obj).length > 0,
            commandFor: (bot, obj) => {
                const u = usableMethods(bot, obj);
                if (!u.length) return null;
                u.sort((a, b) => b.minLevel - a.minLevel); // highest-tier method first
                return u[0].cmd;
            }
        };
    }
    _profiles[skill] = p;
    return p;
}

// ratio-aware ore steering: when mining for a smithing goal, steer rock choice
// toward the ore the bot is most short of for the target bar's ratio
let _smeltBars = null;       // [{ level, ores:[{id,amount}], maxOreLevel }] sorted highest smithing lvl first
let _oreMiningLevel = null;  // Map oreItemId -> min mining level to mine it
let _goalsMod = null;
function miningTables() {
    if (_smeltBars) { return; }
    const smithing = require('@2003scape/rsc-data/skills/smithing');
    const { smelting } = smithing;
    const { rocks } = require('@2003scape/rsc-data/skills/mining');
    // bars that forge into smithing items; gold/silver are jewellery, skip them
    const forgeable = new Set(Object.keys((smithing.smithing && smithing.smithing.items) || {}).map(Number));
    _oreMiningLevel = new Map();
    for (const key of Object.keys(rocks)) {
        let r = rocks[key];
        if (r && r.reference != null) { r = rocks[r.reference]; }
        if (r && r.ore != null) {
            const cur = _oreMiningLevel.get(Number(r.ore));
            const lvl = r.level || 1;
            if (cur == null || lvl < cur) { _oreMiningLevel.set(Number(r.ore), lvl); }
        }
    }
    _smeltBars = [];
    for (const [bar, d] of Object.entries(smelting)) {
        if (!forgeable.has(Number(bar))) { continue; } // skip gold/silver
        const ores = (d.ores || []).map((o) => ({ id: Number(o.id), amount: o.amount || 1 }));
        let maxOreLevel = 0;
        for (const o of ores) { const l = _oreMiningLevel.get(o.id) || 1; if (l > maxOreLevel) { maxOreLevel = l; } }
        _smeltBars.push({ level: d.level || 1, ores, maxOreLevel });
    }
    _smeltBars.sort((a, b) => b.level - a.level);
}
function botLvl(bot, s) { const k = bot.skills && bot.skills[s]; return k ? (k.current != null ? k.current : k.base) || 1 : 1; }
function countOre(bot, id) { let n = 0; const inv = bot.inventory && bot.inventory.items; if (inv) { for (const it of inv) { if (it.id === id) { n += it.amount || 1; } } } return n; }
// the ore ratio the bot should gather for its smithing goal, or null
function oreRatioFor(bot) {
    const goals = _goalsMod || (_goalsMod = require('../goals'));
    let g; try { g = goals.current(bot); } catch (e) { return null; }
    if (!g || g.type !== 'skill' || (g.skill !== 'smithing' && g.forSkill !== 'smithing')) { return null; }
    miningTables();
    if (g.produce) { // exact target bar's ores, from the chain graph's smelt step
        try { const ct = itemKnowledge.chainTo(g.produce.id); for (const e of ct.steps) { if (e.kind === 'smeltOnFurnace') { return e.inputs; } } } catch (e) {}
        return null;
    }
    // best bar the bot can both smelt and fully mine (mining level for every ore)
    const sl = botLvl(bot, 'smithing'), ml = botLvl(bot, 'mining');
    for (const bar of _smeltBars) { if (sl >= bar.level && ml >= bar.maxOreLevel) { return bar.ores; } }
    return null;
}
// the single ore the bot most needs next, among ores it can mine, else null
function desiredOre(bot) {
    const ratio = oreRatioFor(bot);
    if (!ratio || ratio.length < 2) { return null; }
    let best = null, bestScore = Infinity;
    for (const o of ratio) {
        if ((_oreMiningLevel.get(o.id) || 1) > botLvl(bot, 'mining')) { continue; } // can't mine yet
        const score = countOre(bot, o.id) / (o.amount || 1);
        if (score < bestScore) { bestScore = score; best = o.id; }
    }
    return best;
}

// does the bot carry any tool this skill needs?
function hasTool(bot, p) {
    return p.tools.some((id) => bot.inventory.has(id));
}

// the bot's level in the profile's skill
function skillLevel(bot, p) {
    const s = bot.skills && bot.skills[p.xpSkill];
    return s ? s.current : 1;
}

class ResourceGatherer {
    constructor(bot, skill) {
        this.bot = bot;
        this.skill = skill;
        this.p = profile(skill);
        this.state = 'GATHER'; // 'GATHER' | 'BANK'
        this.target = null; // the committed resource object
        this.unreachable = new Set();
    }

    key(o) {
        return `${o.x},${o.y}`;
    }

    // nearest standing, level-appropriate, reachable resource in range;
    // mining prefers the ore the bot is short of, else nearest
    nearestResource() {
        const bot = this.bot;
        const p = this.p;
        const want = (this.skill === 'mining' && p.oreOf) ? desiredOre(bot) : null;
        let best = null;
        let bestScore = Infinity;
        for (const obj of bot.getNearbyEntities('gameObjects', SCAN_RANGE)) {
            if (!p.resourceIds.has(obj.id) || p.depleted.has(obj.id)) {
                continue;
            }
            if (!p.canWork(bot, obj)) {
                continue; // no method the bot can use here, skip it
            }
            if (this.unreachable.has(this.key(obj))) {
                continue;
            }
            const dist = bot.getDistance(obj);
            // a rock yielding the wanted ore beats any other, else nearest
            const score = (want != null && p.oreOf(obj.id) === want) ? dist - 100000 : dist;
            if (score < bestScore) {
                bestScore = score;
                best = obj;
            }
        }
        return best;
    }

    // nothing to work for a while (no tool, nothing in range): end the career block early
    starve() {
        this.idleTicks = (this.idleTicks | 0) + 1;
        if (this.idleTicks < 60) return;
        this.idleTicks = 0;
        const br = this.bot && this.bot.brain;
        if (br && br !== this && typeof br.ticksLeft === 'number') { br.ticksLeft = 0; this.bot._starved = true; }
    }

    // is the committed object still a workable resource?
    stillThere(o) {
        if (!o) {
            return false;
        }
        for (const obj of this.bot.world.gameObjects.getAtPoint(o.x, o.y)) {
            if (obj === o && this.p.resourceIds.has(obj.id) && !this.p.depleted.has(obj.id)) {
                return true;
            }
        }
        return false;
    }

    isAdjacent(o) {
        return Math.abs(o.x - this.bot.x) + Math.abs(o.y - this.bot.y) <= 1;
    }

    tick() {
        const bot = this.bot;
        const p = this.p;

        if (bot.locked || bot.opponent || bot.walkQueue.length || bot.gatheringSkill) {
            return;
        }
        if (!p) {
            this.starve(); // unknown skill, nothing to do
            return;
        }
        if (!hasTool(bot, p)) {
            this.starve(); // no tool, can't gather
            return;
        }

        if (this.state === 'BANK') {
            this.doBank();
            this.state = 'GATHER';
            return;
        }

        if (bot.inventory.isFull()) {
            this.state = 'BANK';
            return;
        }

        if (!this.stillThere(this.target)) {
            this.target = this.nearestResource();
        }
        const res = this.target;
        if (!res) {
            // nothing workable in range; clear unreachable so respawns re-qualify
            this.unreachable.clear();
            this.starve();
            return;
        }
        this.idleTicks = 0;

        if (this.isAdjacent(res)) {
            bot.faceEntity(res);
            bot.lock(); // hold the busy-gate while the async batch runs
            const cmd = p.commandFor(bot, res) || 'one';
            const fn = cmd === 'two' ? 'onGameObjectCommandTwo' : 'onGameObjectCommandOne';
            Promise.resolve()
                .then(() => p.handler[fn](bot, res))
                .catch(() => {
                    bot.gatheringSkill = false;
                })
                .then(() => {
                    if (bot.locked) {
                        bot.unlock();
                    }
                });
            return;
        }

        const steps = findPathAdjacent(bot.world, bot.x, bot.y, res.x, res.y);
        if (steps && steps.length) {
            bot.walkQueue = steps;
        } else {
            this.unreachable.add(this.key(res));
            this.target = null;
        }
    }

    // deposit everything that isn't a tool or food; in-place bank fallback
    doBank() {
        const bot = this.bot;
        // keep tools, food, and coins; bank the gathered haul
        const keep = (id) => itemKnowledge.isTool(id) || itemKnowledge.isFood(id) || id === 10;
        try {
            bot.bank.open();
            const snapshot = bot.inventory.items
                .filter((it) => !keep(it.id))
                .map((it) => ({ id: it.id, amount: it.amount }));
            for (const it of snapshot) {
                try {
                    bot.bank.deposit(it.id, it.amount);
                } catch (e) {
                    // slot changed, skip
                }
            }
        } finally {
            if (bot.interfaceOpen.bank) {
                bot.bank.close();
            } else if (bot.locked) {
                bot.unlock();
            }
        }
    }
}

module.exports = ResourceGatherer;
module.exports.profile = profile;
module.exports.desiredOre = desiredOre;     // exposed for tests
module.exports.oreRatioFor = oreRatioFor;
