// a bot's understanding of what every item is for, from the game's skill tables; answers "what is this id?".
// built lazily on first use, after entry.js merges custom items. a material's skills = the skills that consume it.

let items, smithing, crafting, fletching, herblaw, cooking, prayer, spells;
try {
    items = require('@2003scape/rsc-data/config/items');
    smithing = require('@2003scape/rsc-data/skills/smithing');
    crafting = require('@2003scape/rsc-data/skills/crafting');
    fletching = require('@2003scape/rsc-data/skills/fletching');
    herblaw = require('@2003scape/rsc-data/skills/herblaw');
    cooking = require('@2003scape/rsc-data/skills/cooking');
    prayer = require('@2003scape/rsc-data/skills/prayer');
    spells = require('@2003scape/rsc-data/config/spells');
} catch (e) {
    items = items || [];
}

// tools are field-indistinguishable from price-1 junk, so the tool set is the one hand list
const TOOLS = new Set([
    87, 12, 88, 203, 204, 405, 428,           // hatchets
    156, 1258, 1259, 1260, 1261, 1262,        // pickaxes
    376, 377, 378, 379, 375, 548, 589, 380, 381, // fishing tools + bait/feathers
    166, 168, 13, 167, 39, 43, 468            // tinderbox, hammer, knife, chisel, needle, thread, pestle
]);
const CURRENCY_ID = 10;
const FEED = ['raw', 'intermediate', 'secondary'];

// built lazily by build()
let _role = null;                 // per-id frozen role object
let _uncutGems = null;            // crafting.cutting keys (for the combat grab + gemcut)
let _grimyHerbs = null;           // herblaw.herbs keys
// chain graph: every production transformation as a unified edge
//   { skill, product, inputs:[{id,amount}], level, xp, kind, driver }
// inputs[0] = primary feedstock, inputs[1..] = co-inputs. kind = the processOne kind that executes it,
// or null; driver = !!kind gates which edges behaviours may execute. built once in build().
let _recipeFor = null;            // Array: product id -> the edge that makes it (RSC single-recipe; first wins)
let _productsOf = null;           // Array: input id  -> [edges this id feeds]
let _chainDepth = null;           // Array<int>: true distance-to-raw
const _chainToCache = new Map();
const EMPTY_EDGES = Object.freeze([]);
const UNKNOWN = Object.freeze({ classes: Object.freeze(['unknown']), skills: Object.freeze([]), tier: null, price: 0, members: false, tradeable: false, stackable: false, command: '', food: false, drink: false, wieldable: false, known: false });

function build() {
    const N = Math.max(items.length, 1300);
    const _classes = new Array(N);
    const _skills = new Array(N);
    const _upstreamKey = new Set(); // ids that appear as a table key/input -> at least intermediate
    _uncutGems = new Set();
    _grimyHerbs = new Set();

    const tag = (id, cls, skill) => {
        id = Number(id);
        if (!(id >= 0)) { return; }
        if (!_classes[id]) { _classes[id] = new Set(); }
        if (!_skills[id]) { _skills[id] = new Set(); }
        if (cls) { _classes[id].add(cls); }
        if (skill) { _skills[id].add(skill); }
    };
    const walkLeafIds = (node, out) => {
        if (!node) { return; }
        if (Array.isArray(node)) { for (const n of node) { walkLeafIds(n, out); } return; }
        if (typeof node === 'object') {
            if (Array.isArray(node.items)) { walkLeafIds(node.items, out); return; }
            if (node.id != null) { out.push(Number(node.id)); }
        }
    };

    try {
        // smithing: ore -> bar (smelt) -> product (forge)
        if (smithing && smithing.smelting) {
            for (const [barId, def] of Object.entries(smithing.smelting)) {
                tag(barId, 'intermediate', 'smithing'); _upstreamKey.add(Number(barId));
                for (const ore of def.ores || []) { tag(ore.id, 'raw', 'smithing'); } // ore consumed by smithing
            }
        }
        if (smithing && smithing.smithing && smithing.smithing.items) {
            for (const [barId, def] of Object.entries(smithing.smithing.items)) {
                _upstreamKey.add(Number(barId));
                const out = []; walkLeafIds(def.items, out);
                for (const pid of out) { tag(pid, 'finished', 'smithing'); }
            }
        }
        // crafting
        if (crafting) {
            for (const [uncut, def] of Object.entries(crafting.cutting || {})) { tag(uncut, 'raw', 'crafting'); _upstreamKey.add(Number(uncut)); _uncutGems.add(Number(uncut)); tag(def.id, 'finished', 'crafting'); }
            for (const e of crafting.leather || []) { tag(e.id, 'finished', 'crafting'); }
            for (const e of crafting.pottery || []) { if (e.unfired) { tag(e.unfired.id, 'intermediate', 'crafting'); _upstreamKey.add(Number(e.unfired.id)); } if (e.fired) { tag(e.fired.id, 'finished', 'crafting'); } }
            for (const e of crafting.glassblowing || []) { tag(e.id, 'finished', 'crafting'); }
            for (const key of ['gold-jewellery', 'silver-jewellery']) {
                const j = crafting[key];
                if (j) { const out = []; walkLeafIds(j.items, out); for (const pid of out) { tag(pid, 'finished', 'crafting'); } for (const m of j.moulds || []) { tag(m, 'secondary', 'crafting'); } }
            }
            for (const [u, s] of Object.entries(crafting.stringing || {})) { tag(u, 'intermediate', 'crafting'); _upstreamKey.add(Number(u)); tag(s, 'finished', 'crafting'); }
            for (const [b, ench] of Object.entries(crafting.battlestaves || {})) { tag(b, 'intermediate', 'crafting'); _upstreamKey.add(Number(b)); if (ench && ench.id != null) { tag(ench.id, 'finished', 'crafting'); } } // the elemental battlestaff's .id
        }
        // fletching
        if (fletching) {
            for (const [log, tiers] of Object.entries(fletching.bows || {})) {
                tag(log, 'raw', 'fletching'); tag(log, 'raw', 'firemaking'); _upstreamKey.add(Number(log)); // logs consumed by fletching + firemaking
                for (const t of tiers || []) { if (t.unstrung != null) { tag(t.unstrung, 'intermediate', 'fletching'); _upstreamKey.add(Number(t.unstrung)); } if (t.strung != null) { tag(t.strung, 'finished', 'fletching'); } }
            }
            for (const [head, def] of Object.entries(fletching.arrows || {})) { tag(head, 'secondary', 'fletching'); if (def && def.id != null) { tag(def.id, 'finished', 'fletching'); tag(def.id, 'ammo', 'ranged'); } }
            const DART_TIP_RESULT_TAG = { 1062: 1013, 1063: 1015, 1064: 1024, 1065: 1068, 1066: 1069, 1067: 1070 };
            for (const tip of Object.keys(fletching.darts || {})) { tag(tip, 'secondary', 'fletching'); const dart = DART_TIP_RESULT_TAG[tip]; if (dart != null) { tag(dart, 'finished', 'fletching'); tag(dart, 'ammo', 'ranged'); } } // the thrown dart is the finished ammo
        }
        // finished goods no data table tags: charged orbs, enchanted amulets, wine; else they aren't saleable
        try {
            const magicMod = require('../../skills/magic');
            for (const cdef of Object.values(magicMod.CHARGE_ORBS || {})) { if (cdef && cdef.orb != null) { tag(cdef.orb, 'finished', 'magic'); } }
            for (const ench of Object.values(magicMod.ENCHANTS || {})) { const rid = ench && (ench.id != null ? ench.id : ench.to); if (rid != null) { tag(rid, 'finished', 'magic'); } }
        } catch (e) {}
        for (const id of [314, 315, 316, 317]) { tag(id, 'finished', 'magic'); } // enchanted gem amulets (of magic/protection/strength/power)
        tag(142, 'finished', 'cooking'); // wine
        // herblaw
        if (herblaw) {
            for (const [grimy, def] of Object.entries(herblaw.herbs || {})) { tag(grimy, 'raw', 'herblaw'); _upstreamKey.add(Number(grimy)); _grimyHerbs.add(Number(grimy)); tag(def.id, 'intermediate', 'herblaw'); }
            for (const [clean, def] of Object.entries(herblaw.unfinished || {})) { tag(clean, 'intermediate', 'herblaw'); _upstreamKey.add(Number(clean)); tag(def.id, 'intermediate', 'herblaw'); }
            for (const [unf, secMap] of Object.entries(herblaw.potions || {})) {
                tag(unf, 'intermediate', 'herblaw'); _upstreamKey.add(Number(unf));
                for (const [secId, res] of Object.entries(secMap || {})) { tag(secId, 'secondary', 'herblaw'); if (res && res.id != null) { tag(res.id, 'finished', 'herblaw'); } }
            }
        }
        // cooking
        if (cooking && cooking.uncooked) {
            for (const [raw, def] of Object.entries(cooking.uncooked)) { tag(raw, 'raw', 'cooking'); _upstreamKey.add(Number(raw)); if (def.cooked != null) { tag(def.cooked, 'finished', 'cooking'); } }
            for (const c of cooking.combinations || []) { if (c && c.result != null) { tag(c.result, 'finished', 'cooking'); } }
        }
        // prayer + magic
        if (prayer && prayer.buryExperience) { for (const bone of Object.keys(prayer.buryExperience)) { tag(bone, 'bone', 'prayer'); } }
        if (Array.isArray(spells)) { for (const s of spells) { for (const r of (s && s.runes) || []) { tag(r.id, 'rune', 'magic'); } } }
        // plugin carve-outs (custom SP + plugin constants absent from rsc-data's chains)
        tag(147, 'raw', 'crafting');
        for (const meat of [504, 502, 503]) { tag(meat, 'secondary', 'crafting'); } // raw meat -> animal fat (leather); also cooking raws
        tag(1540, 'secondary', 'crafting');
        tag(1541, 'intermediate', 'crafting'); _upstreamKey.add(1541);
        tag(148, 'intermediate', 'crafting'); _upstreamKey.add(148);
        tag(280, 'intermediate', 'fletching'); tag(637, 'intermediate', 'fletching'); tag(676, 'secondary', 'fletching');
        // spinning: flax -> bow string, wool -> ball of wool; flax/wool are the base raws
        tag(675, 'raw', 'crafting'); _upstreamKey.add(675);   // flax
        tag(145, 'raw', 'crafting'); _upstreamKey.add(145);   // wool
        tag(207, 'intermediate', 'crafting'); _upstreamKey.add(207); // ball of wool (product of spinning)
    } catch (e) {}

    // stage-correction: a 'finished' id that's also an upstream key is really an intermediate
    for (let id = 0; id < N; id++) {
        const c = _classes[id];
        if (c && c.has('finished') && _upstreamKey.has(id)) { c.delete('finished'); c.add('intermediate'); }
    }

    const isWieldableDef = (def) => !!(def && Array.isArray(def.equip) && def.equip.length > 0);
    _role = new Array(N);
    for (let id = 0; id < N; id++) {
        const def = items[id];
        const classes = _classes[id] ? [..._classes[id]] : [];
        const skills = _skills[id] ? [..._skills[id]] : [];
        const cmd = (def && def.command) || '';
        const food = /eat/i.test(cmd);
        const drink = /drink/i.test(cmd);
        const wieldable = isWieldableDef(def);
        if (id === CURRENCY_ID && !classes.includes('currency')) { classes.push('currency'); }
        if (TOOLS.has(id) && !classes.includes('tool')) { classes.push('tool'); }
        if (food && !classes.includes('food')) { classes.push('food'); }
        if (drink && !classes.includes('drink')) { classes.push('drink'); }
        if (wieldable && !classes.includes('wieldable')) { classes.push('wieldable'); }
        if (def && def.untradeable && !classes.includes('untradeable')) { classes.push('untradeable'); }
        const finished = classes.includes('finished');
        const intermediate = classes.includes('intermediate');
        const raw = classes.includes('raw');
        const feed = raw || intermediate || classes.includes('secondary'); // is a feedstock (of its skills)
        const tier = finished ? 2 : intermediate ? 1 : raw ? 0 : null;
        // precompute the hot-path booleans so is*() are pure field reads (no Array.includes scan)
        _role[id] = Object.freeze({
            classes: Object.freeze(classes), skills: Object.freeze(skills), tier,
            price: def ? (def.price || 0) : 0, members: !!(def && def.members),
            tradeable: !!(def && !def.untradeable), stackable: !!(def && def.stackable),
            command: cmd, food, drink, wieldable, known: !!def,
            bone: classes.includes('bone'), rune: classes.includes('rune'), ammo: classes.includes('ammo'),
            tool: classes.includes('tool'), material: feed, finished, feed
        });
    }

    // ---- chain graph ---------------------------------------------------------------------------------
    // emit one edge per transformation, then index it by product (recipeFor) and by each input (productsOf).
    // additive and in its own try/catch, so a malformed table can't touch _role above.
    const NN = _role.length;
    _recipeFor = new Array(NN);
    _productsOf = new Array(NN);
    const E = [];
    const emit = (skill, product, inputs, level, xp, kind) => {
        product = Number(product);
        if (!(product >= 0 && product < NN)) { return; }
        const edge = Object.freeze({
            skill, product,
            inputs: Object.freeze(inputs.map((i) => Object.freeze({ id: Number(i.id), amount: i.amount || 1 }))),
            level: level || 1, xp: xp || 0, kind: kind || null, driver: !!kind
        });
        E.push(edge);
        if (_recipeFor[product] == null) { _recipeFor[product] = edge; }
    };
    try {
        // smithing smelt (multi-input) + forge
        for (const [bar, d] of Object.entries((smithing && smithing.smelting) || {})) {
            emit('smithing', bar, (d.ores || []).map((o) => ({ id: o.id, amount: o.amount || 1 })), d.level, d.experience, 'smeltOnFurnace');
        }
        if (smithing && smithing.smithing && smithing.smithing.items) {
            const barsTree = smithing.smithing.bars;
            for (const [bar, entry] of Object.entries(smithing.smithing.items)) {
                (function walk(iN, bN) {
                    for (let i = 0; i < iN.length; i++) {
                        const it = iN[i]; const bc = Array.isArray(bN) ? bN[i] : undefined;
                        if (Array.isArray(it)) { walk(it, bc); } else if (it && it.id != null) {
                            const bars = it.bars != null ? it.bars : (typeof bc === 'number' ? bc : 1);
                            emit('smithing', it.id, [{ id: Number(bar), amount: bars }], it.level, (entry.experience || 0) * bars, 'forge');
                        }
                    }
                })(entry.items, barsTree);
            }
        }
        // crafting: gem cut, gold + silver jewellery, pottery, stringing
        if (crafting) {
            for (const [u, d] of Object.entries(crafting.cutting || {})) { emit('crafting', d.id, [{ id: Number(u), amount: 1 }], d.level, d.experience, 'gemcut'); }
            const gj = crafting['gold-jewellery'];
            if (gj && gj.items) {
                const GOLD = 172; const gems = gj.gems || [];
                gj.items.forEach((row) => (row || []).forEach((cell, tier) => {
                    if (!cell || cell.id == null) { return; }
                    const inputs = tier === 0 ? [{ id: GOLD, amount: 1 }] : [{ id: GOLD, amount: 1 }, { id: gems[tier - 1], amount: 1 }];
                    emit('crafting', cell.id, inputs, cell.level, cell.experience, 'jewellery'); // plain + gem-set both driven (production.mouldJewelleryBest)
                }));
            }
            const sj = crafting['silver-jewellery'];
            if (sj && sj.items) { sj.items.forEach((cell) => { if (cell && cell.id != null) { emit('crafting', cell.id, [{ id: 384, amount: 1 }], cell.level, cell.experience, 'silverJewellery'); } }); } // driven (production.mouldSilverBest)
            // pottery: clay + bucket of water -> soft clay -> (wheel) unfired -> (oven) fired pot/bowl/dish
            emit('crafting', 243, [{ id: 149, amount: 1 }, { id: 50, amount: 1 }], 1, 0, 'softclay');
            for (const e of crafting.pottery || []) { if (e.unfired) { emit('crafting', e.unfired.id, [{ id: 243, amount: 1 }], e.level, e.unfired.experience, 'mouldPottery'); } if (e.fired && e.unfired) { emit('crafting', e.fired.id, [{ id: e.unfired.id, amount: 1 }], e.level, e.fired.experience, 'firePottery'); } }
            // glass: seaweed -> soda ash; bucket at a sand pit -> sand; sand + soda ash -> molten glass;
            // pipe + molten glass -> beer glass (620) / vial (465) / unpowered orb (611).
            emit('crafting', 624, [{ id: 622, amount: 1 }], 1, 0, 'sodaAsh');
            emit('crafting', 625, [{ id: 21, amount: 1 }], 1, 0, 'sandFill');
            emit('crafting', 623, [{ id: 625, amount: 1 }, { id: 624, amount: 1 }], 1, 80, 'glassMake');
            emit('crafting', 620, [{ id: 623, amount: 1 }], 1, 70, 'glassBlow');
            emit('crafting', 465, [{ id: 623, amount: 1 }], 33, 140, 'glassBlow');
            emit('crafting', 611, [{ id: 623, amount: 1 }], 46, 210, 'glassBlow');
            // charge orb: unpowered orb + element runes + cosmic -> charged orb; then battlestaff (614) + orb -> elemental battlestaff
            try {
                const magicMod = require('../../skills/magic');
                const spellDefs = require('@2003scape/rsc-data/config/spells');
                for (const [sidx, cdef] of Object.entries(magicMod.CHARGE_ORBS || {})) {
                    const s = spellDefs[sidx];
                    if (!s || cdef.orb == null) { continue; }
                    const inputs = [{ id: 611, amount: 1 }];
                    for (const r of (s.runes || [])) { if (Number(r.id) !== 611) { inputs.push({ id: Number(r.id), amount: r.amount }); } }
                    emit('magic', cdef.orb, inputs, s.level, (magicMod.EXPERIENCE && magicMod.EXPERIENCE[sidx]) || 0, 'chargeOrb');
                }
            } catch (e) {}
            for (const [orb, d] of Object.entries(crafting.battlestaves || {})) { if (d && d.id != null) { emit('crafting', d.id, [{ id: Number(orb), amount: 1 }, { id: 614, amount: 1 }], d.level, d.experience, 'battlestaff'); } }
            for (const [uns, str] of Object.entries(crafting.stringing || {})) { emit('crafting', str, [{ id: Number(uns), amount: 1 }, { id: 207, amount: 1 }], 1, 0, 'stringAmulet'); } // ball of wool on an unstrung amulet/symbol -> strung
            // enchanting: a strung gem amulet + cosmic + element runes -> its enchanted form
            const ENCH = { 302: { out: 314, lvl: 7, runes: [{ id: 32, amount: 1 }, { id: 46, amount: 1 }] }, 303: { out: 315, lvl: 27, runes: [{ id: 33, amount: 3 }, { id: 46, amount: 1 }] }, 304: { out: 316, lvl: 49, runes: [{ id: 31, amount: 5 }, { id: 46, amount: 1 }] }, 305: { out: 317, lvl: 57, runes: [{ id: 34, amount: 10 }, { id: 46, amount: 1 }] } };
            for (const [amu, en] of Object.entries(ENCH)) { emit('magic', en.out, [{ id: Number(amu), amount: 1 }].concat(en.runes), en.lvl, 0, 'enchant'); }
        }
        // fletching: bows (unstrung, string), arrows, plus the 2 upstream steps
        if (fletching) {
            for (const [log, tiers] of Object.entries(fletching.bows || {})) {
                for (const t of tiers || []) {
                    if (t.unstrung != null) { emit('fletching', t.unstrung, [{ id: Number(log), amount: 1 }], t.level, t.experience, 'fletchBow'); }
                    if (t.strung != null) { emit('fletching', t.strung, [{ id: t.unstrung, amount: 1 }, { id: 676, amount: 1 }], t.level, t.experience, 'stringBow'); }
                }
            }
            for (const [head, d] of Object.entries(fletching.arrows || {})) { if (d && d.id != null) { emit('fletching', d.id, [{ id: 637, amount: 15 }, { id: Number(head), amount: 15 }], d.level, d.experience, 'fletchArrows'); } }
            emit('fletching', 280, [{ id: 14, amount: 1 }], 1, 5, 'combine');                         // knife+log -> shafts
            emit('fletching', 637, [{ id: 280, amount: 15 }, { id: 381, amount: 15 }], 1, 15, 'fletchHeadless'); // shafts+feather -> headless
            // darts: a feather on a smithed dart tip -> a throwing dart; tip->dart ids, levels from the darts table
            const DART_TIP_RESULT = { 1062: 1013, 1063: 1015, 1064: 1024, 1065: 1068, 1066: 1069, 1067: 1070 };
            for (const [tip, lvl] of Object.entries(fletching.darts || {})) { const res = DART_TIP_RESULT[tip]; if (res != null) { emit('fletching', res, [{ id: Number(tip), amount: 1 }, { id: 381, amount: 1 }], lvl, 4, 'fletchDart'); } }
        }
        // spinning: flax -> bow string (unblocks the bow chain), wool -> ball of wool
        emit('crafting', 676, [{ id: 675, amount: 1 }], 10, 60, 'spin'); // flax -> bow string (crafting 10)
        emit('crafting', 207, [{ id: 145, amount: 1 }], 1, 10, 'spin');  // wool -> ball of wool
        // herblaw (table levels shape the graph; processing keeps its own levels for the doing)
        if (herblaw) {
            for (const [g, d] of Object.entries(herblaw.herbs || {})) { emit('herblaw', d.id, [{ id: Number(g), amount: 1 }], d.level, d.experience, 'clean'); }
            for (const [c, d] of Object.entries(herblaw.unfinished || {})) { emit('herblaw', d.id, [{ id: Number(c), amount: 1 }, { id: 464, amount: 1 }], d.level, 0, 'mixUnfinished'); }
            // finished potions: unfinished + secondary -> potion; skip self-referential rows (secondary == result)
            for (const [unf, secMap] of Object.entries(herblaw.potions || {})) { for (const [sec, r] of Object.entries(secMap || {})) { if (r && r.id != null && Number(sec) !== r.id) { emit('herblaw', r.id, [{ id: Number(unf), amount: 1 }, { id: Number(sec), amount: 1 }], r.level, r.experience, 'mixPotion'); } } }
            // grinding: a pestle & mortar grinds an ingredient to a powder that feeds herblaw secondaries
            for (const [input, output] of Object.entries({ 466: 473, 467: 472, 604: 1051, 983: 1179, 337: 772 })) { emit('herblaw', output, [{ id: Number(input), amount: 1 }], 1, 0, 'grind'); }
        }
        // cooking: cook; combinations (stews/pies/pizzas)
        if (cooking) {
            for (const [raw, d] of Object.entries(cooking.uncooked || {})) { if (d.cooked != null) { emit('cooking', d.cooked, [{ id: Number(raw), amount: 1 }], d.level, d.experience, 'cookOnFire'); } }
            for (const c of cooking.combinations || []) { if (c && c.result != null) { emit('cooking', c.result, [{ id: c.item, amount: 1 }, { id: c.with, amount: 1 }], c.level, c.experience, 'cookCombine'); } } // multi-ingredient combine
            // dough: flour + water -> bread/pastry/pizza/pitta dough, which then bakes via cookOnFire
            for (const d of cooking.doughs || []) { if (d && d.id != null) { emit('cooking', d.id, [{ id: 136, amount: 1 }, { id: 50, amount: 1 }], 1, 0, 'makeDough'); } }
            // wine: grapes + jug of water -> wine (cooking 35, 440xp)
            emit('cooking', 142, [{ id: 143, amount: 1 }, { id: 141, amount: 1 }], 35, 440, 'makeWine');
            // cake: cake tin + flour + egg + milk -> uncooked cake (cooking 40), which bakes via cookOnFire
            emit('cooking', 339, [{ id: 136, amount: 1 }, { id: 19, amount: 1 }, { id: 22, amount: 1 }], 40, 0, 'cakeMix');
        }
    } catch (e) {}

    // invert (productsOf) + true distance-to-raw (chainDepth), once
    for (const e of E) { for (const inp of e.inputs) { const k = inp.id; if (k >= 0 && k < NN) { (_productsOf[k] || (_productsOf[k] = [])).push(e); } } }
    _chainDepth = new Array(NN).fill(-1);
    const depthOf = (id, seen) => {
        id = Number(id);
        if (!(id >= 0 && id < NN)) { return 0; }
        if (_chainDepth[id] >= 0) { return _chainDepth[id]; }
        const e = _recipeFor[id];
        if (!e) { _chainDepth[id] = 0; return 0; }
        if (seen.has(id)) { return 0; }
        seen.add(id);
        let m = 0;
        for (const inp of e.inputs) { const dd = depthOf(inp.id, seen); if (dd > m) { m = dd; } }
        seen.delete(id);
        _chainDepth[id] = 1 + m;
        return _chainDepth[id];
    };
    for (let id = 0; id < NN; id++) { if (_chainDepth[id] < 0) { depthOf(id, new Set()); } }
}

function ensureBuilt() { if (!_role) { build(); } }
// the exclusive upper bound of classified ids (= _role.length), for enumerating the catalog
function maxId() { ensureBuilt(); return _role.length; }

// ---- public API (all O(1) after the first, lazy build) ---------------------------------------------
function roleOf(id) { ensureBuilt(); id = Number(id); return (id >= 0 && _role[id]) ? _role[id] : UNKNOWN; }
function has(id, cls) { return roleOf(id).classes.includes(cls); }
function skillsFor(id) { return roleOf(id).skills; }
// hot-path predicates are precomputed field reads (see build()).
function isTool(id) { return roleOf(id).tool; }
function isFood(id) { return roleOf(id).food; }
function isDrink(id) { return roleOf(id).drink; }
function isBone(id) { return roleOf(id).bone; }
function isRune(id) { return roleOf(id).rune; }
function isAmmo(id) { return roleOf(id).ammo; }
function isWieldable(id) { return roleOf(id).wieldable; }
function isFinishedProduct(id) { return roleOf(id).finished; }
function isUncutGem(id) { ensureBuilt(); return _uncutGems.has(Number(id)); }
function isGrimyHerb(id) { ensureBuilt(); return _grimyHerbs.has(Number(id)); }
function isFeedstockFor(id, skill) {
    const r = roleOf(id);
    return r.feed && r.skills.includes(skill); // r.skills is 1-2 entries; r.feed is a precomputed bool
}
function isKnown(id) { return roleOf(id).known; }

// ---- chain-graph API (all O(1) / small-list scans after the one lazy build) -------------------------
function recipeFor(id) { ensureBuilt(); id = Number(id); return (id >= 0 && _recipeFor[id]) || null; }   // the edge that makes id (+ what it needs)
function productsOf(id) { ensureBuilt(); id = Number(id); return (id >= 0 && _productsOf[id]) || EMPTY_EDGES; } // edges id feeds
function chainDepth(id) { ensureBuilt(); id = Number(id); return (id >= 0 && _chainDepth[id] >= 0) ? _chainDepth[id] : 0; } // true distance-to-raw
// the most-valuable product this id can become among edges the caller accepts (the caller passes the predicate)
function refinedFormOf(id, accept) {
    ensureBuilt();
    let best = null; let bp = -1;
    for (const e of productsOf(id)) {
        if (accept && !accept(e)) { continue; }
        const p = roleOf(e.product).price;
        if (p > bp) { bp = p; best = e; }
    }
    return best;
}
// "to make target: gather baseInputs, then run steps bottom-up"; memoised per target
function chainTo(target) {
    ensureBuilt();
    target = Number(target);
    if (_chainToCache.has(target)) { return _chainToCache.get(target); }
    const steps = []; const base = new Map(); const seen = new Set();
    (function visit(id) {
        id = Number(id);
        if (seen.has(id)) { return; }
        seen.add(id);
        const e = _recipeFor[id];
        if (!e) { base.set(id, (base.get(id) || 0) + 1); return; }
        for (const inp of e.inputs) { visit(inp.id); }
        steps.push(e);
    })(target);
    const out = Object.freeze({ steps, baseInputs: [...base].map(([id, amount]) => ({ id, amount })) });
    _chainToCache.set(target, out);
    return out;
}

// coarse single bucket, the whole-catalog fallback (first match wins); a non-item returns 'unknown'
function classOf(id) {
    const r = roleOf(id);
    if (!r.known) { return 'unknown'; }
    if (Number(id) === CURRENCY_ID) { return 'currency'; }
    if (r.classes.includes('tool')) { return 'tool'; }
    if (r.food || r.drink) { return 'consumable'; }
    if (r.classes.includes('rune') || r.classes.includes('ammo') || r.classes.includes('bone')) { return 'combat-consumable'; }
    if (r.classes.includes('raw') || r.classes.includes('intermediate') || r.classes.includes('secondary')) { return 'material'; }
    if (r.classes.includes('finished')) { return 'product'; }
    if (r.wieldable) { return 'wieldable'; }
    if (!r.tradeable) { return (r.price <= 2 && !r.command && !r.wieldable) ? 'droppable' : 'quest'; }
    if (r.price >= 200) { return 'valuable'; }
    if (r.price >= 50) { return 'mid'; }
    return 'junk';
}

module.exports = {
    roleOf, has, skillsFor, classOf, isKnown, maxId,
    isTool, isFood, isDrink, isBone, isRune, isAmmo, isWieldable,
    isFinishedProduct, isFeedstockFor, isUncutGem, isGrimyHerb,
    recipeFor, productsOf, chainDepth, refinedFormOf, chainTo,
    TOOLS
};
