// bots turn raw materials into production skills (firemake/fletch/cook/smith...) via the real skill hooks.
// personality-gated and rate-limited.

const personality = require('./personality');
const production = require('./production');
const requirements = require('./requirements');

// each recipe: a tool + raw input -> a skill. kind 'combine' = onUseWithInventory (tool on input),
// 'ground' = onDropItem then onUseWithGroundItem (drop logs, light on ground).
const RECIPES = [
    { skill: 'fletching', tool: 13, input: 14, kind: 'combine' },  // knife on logs -> arrow shafts
    { skill: 'firemaking', tool: 166, input: 14, kind: 'ground' }, // drop logs, light with tinderbox
    // cook any raw item on a nearby fire/range (no fixed tool/input).
    { skill: 'cooking', kind: 'cookOnFire' },
    // smelt mined ore into bars at a furnace.
    { skill: 'smithing', kind: 'smeltOnFurnace' },
    // hammer bars into weapons/armour at an anvil (production.forgeBest, no menu).
    { skill: 'smithing', kind: 'forge' },
    // clean a grimy herb (no tool or facility).
    { skill: 'herblaw', kind: 'clean' },
    // cut an uncut gem with a chisel.
    { skill: 'crafting', kind: 'gemcut' },
    // herb + vial of water -> unfinished potion; unfinished + secondary -> potion.
    { skill: 'herblaw', kind: 'mixUnfinished' },
    { skill: 'herblaw', kind: 'mixPotion' },
    // feather+shaft -> headless; headless+arrowhead -> arrows; knife+log -> unstrung bow; bowstring+unstrung -> bow.
    { skill: 'fletching', kind: 'fletchHeadless' },
    { skill: 'fletching', kind: 'fletchArrows' },
    { skill: 'fletching', kind: 'fletchDart' },
    { skill: 'fletching', kind: 'fletchBow' },
    { skill: 'fletching', kind: 'stringBow' },
    // tan cowhide to leather; craft leather armour and gold jewellery.
    { skill: 'crafting', kind: 'tanhide' },
    { skill: 'crafting', kind: 'leatherwork' },
    { skill: 'crafting', kind: 'jewellery' },
    // silver bar + holy/unholy mould at a furnace -> (un)holy symbol.
    { skill: 'crafting', kind: 'silverJewellery' },
    // flax/wool on a spinning wheel -> bow string / ball of wool.
    { skill: 'crafting', kind: 'spin' },
    // ball of wool on an unstrung amulet/symbol -> strung.
    { skill: 'crafting', kind: 'stringAmulet' },
    // enchant a crafted gem amulet into its useful form.
    { skill: 'magic', kind: 'enchant' },
    // combine two cooking ingredients (stew/pie/pizza/cake step).
    { skill: 'cooking', kind: 'cookCombine' },
    // clay+water -> soft clay; soft clay at a wheel -> unfired; unfired at an oven -> fired pot.
    { skill: 'crafting', kind: 'softclay' },
    { skill: 'crafting', kind: 'mouldPottery' },
    { skill: 'crafting', kind: 'firePottery' },
    // seaweed -> soda ash (fire); bucket -> sand (pit); sand+soda ash -> molten glass (furnace);
    // pipe+molten glass -> beer glass/vial/orb.
    { skill: 'crafting', kind: 'sodaAsh' },
    { skill: 'crafting', kind: 'sandFill' },
    { skill: 'crafting', kind: 'glassMake' },
    { skill: 'crafting', kind: 'glassBlow' },
    // charge an unpowered orb at an obelisk, then staff it into a battlestaff.
    { skill: 'magic', kind: 'chargeOrb' },
    { skill: 'crafting', kind: 'battlestaff' },
    // flour + water -> dough (bakes to bread/pie base via the cook chain).
    { skill: 'cooking', kind: 'makeDough' },
    // pestle & mortar on an ingredient -> a powder (herblaw secondary).
    { skill: 'herblaw', kind: 'grind' },
    // grapes + jug water -> wine; tin + flour + egg + milk -> uncooked cake.
    { skill: 'cooking', kind: 'makeWine' },
    { skill: 'cooking', kind: 'cakeMix' }
];

// grimy herbs + uncut gems derived from item-knowledge, kept as .has()-shaped objects.
const itemKnowledge = require('./item-knowledge');
const GRIMY_HERBS = { has: (id) => itemKnowledge.isGrimyHerb(id) };
const CHISEL_ID = 167;

// facility object ids from knowledge.FAC_IDS.
const FAC_IDS = require('./knowledge').FAC_IDS;
const ANVIL_IDS = new Set(FAC_IDS.anvil);
// usable furnace set is id 118 only (the smelting/jewellery/glass plugins hard-gate to it).
const FURNACE_IDS = new Set([118]);
const WHEEL_IDS = new Set(FAC_IDS['spinning wheel']);
const FIRE_IDS = new Set([97, 274]);            // fire/fireplace ids (treated hide dries on these)
const COOK_IDS = new Set([...FAC_IDS.range, ...FIRE_IDS]); // ranges + fires you can cook on
const FLAX_IDS = new Set([313]);
// one cached gameObjects sweep per bot per tick; facility checks filter it.
function nearbyGameObjects(bot) {
    const t = bot.world && bot.world.ticks;
    if (t != null && bot._ngoTick === t && bot._ngo) { return bot._ngo; }
    let list = [];
    try { list = bot.getNearbyEntities('gameObjects', 10) || []; } catch (e) { list = []; }
    if (t != null) { bot._ngo = list; bot._ngoTick = t; }
    return list;
}
function nearbyObject(bot, ids, reach) {
    reach = reach == null ? 1 : reach;
    for (const o of nearbyGameObjects(bot)) {
        if (ids.has(o.id) && Math.abs(o.x - bot.x) + Math.abs(o.y - bot.y) <= reach) { return o; }
    }
    return null;
}
const UNCUT_GEMS = { has: (id) => itemKnowledge.isUncutGem(id) };
function firstOf(bot, set) { return items(bot).find((it) => set.has(it.id)) || null; }

// herblaw potion chain (herb + vial -> unfinished; + secondary -> potion). levels are OpenRSC ItemHerbDef.
const VIAL_OF_WATER = 464;
// identified herb id -> herblaw level to mix it with a vial of water.
const HERB_UNF = [
    { herb: 444, level: 3 }, { herb: 445, level: 5 }, { herb: 446, level: 12 }, { herb: 447, level: 22 },
    { herb: 448, level: 30 }, { herb: 449, level: 45 }, { herb: 450, level: 50 }, { herb: 451, level: 55 },
    { herb: 452, level: 66 }, { herb: 453, level: 72 }, { herb: 934, level: 78 }
];
// unfinished potion id + secondary ingredient + herblaw level.
const POTION_RECIPES = [
    { unf: 454, sec: 270, level: 3 }, { unf: 456, sec: 220, level: 12 }, { unf: 457, sec: 219, level: 22 },
    { unf: 458, sec: 471, level: 30 }, { unf: 459, sec: 270, level: 45 }, { unf: 460, sec: 469, level: 50 },
    { unf: 461, sec: 220, level: 55 }, { unf: 462, sec: 471, level: 66 }, { unf: 463, sec: 501, level: 72 }
];
function herblawLevel(bot) { return skillLvl(bot, 'herblaw'); }
function mixableHerb(bot) { if (!find(bot, VIAL_OF_WATER)) return null; const lvl = herblawLevel(bot); for (const h of HERB_UNF) { if (h.level <= lvl && find(bot, h.herb)) return h.herb; } return null; }
function mixablePotion(bot) { const lvl = herblawLevel(bot); for (const r of POTION_RECIPES) { if (r.level <= lvl && find(bot, r.unf) && find(bot, r.sec)) return r; } return null; }

// fletching completion: shafts+feathers -> headless; +arrowheads -> arrows; knife+log -> bow.
const FLETCH = { KNIFE: 13, FEATHER: 381, SHAFTS: 280, HEADLESS: 637, BOWSTRING: 676 };
const FL_ARROWHEADS = (() => { try { return require('@2003scape/rsc-data/skills/fletching').arrows || {}; } catch (e) { return {}; } })();
const FL_BOWS = (() => { try { return require('@2003scape/rsc-data/skills/fletching').bows || {}; } catch (e) { return {}; } })();
const FL_UNSTRUNG = (() => { const m = new Map(); for (const [log, tiers] of Object.entries(FL_BOWS)) { (tiers || []).forEach((t, i) => { if (t && t.unstrung != null) m.set(t.unstrung, { log: +log, i }); }); } return m; })();
function fletchLevel(bot) { return skillLvl(bot, 'fletching'); }
function bestArrowhead(bot) { const lvl = fletchLevel(bot); let best = null; for (const it of items(bot)) { const a = FL_ARROWHEADS[it.id]; if (a && a.level <= lvl && (!best || FL_ARROWHEADS[best.id].level < a.level)) best = it; } return best; }
// feather + dart tip -> throwing dart; levels from rsc-data darts.
const FL_DARTS = (() => { try { return require('@2003scape/rsc-data/skills/fletching').darts || {}; } catch (e) { return {}; } })();
function bestDartTip(bot) { const lvl = fletchLevel(bot); let best = null; for (const it of items(bot)) { const l = FL_DARTS[it.id]; if (l != null && l <= lvl && (!best || FL_DARTS[best.id] < l)) best = it; } return best; }
// firemaking log id -> level (plain/oak/willow/maple/yew/magic).
const FIREMAKING_LOGS = { 14: 1, 632: 15, 633: 30, 634: 45, 635: 60, 636: 75 };
function fireLevel(bot) { return skillLvl(bot, 'firemaking'); }
function bestFiremakingLog(bot) { const lvl = fireLevel(bot); let best = null; for (const it of items(bot)) { const l = FIREMAKING_LOGS[it.id]; if (l != null && l <= lvl && (!best || FIREMAKING_LOGS[best.id] < l)) best = it; } return best; }
// pestle & mortar grinds an ingredient to a powder (GRIND_MAP: ingredient id -> powder id).
const PESTLE_ID = 468;
const GRIND_MAP = { 466: 473, 467: 472, 604: 1051, 983: 1179, 337: 772 };
function grindableItem(bot) { if (!find(bot, PESTLE_ID)) { return null; } for (const it of items(bot)) { if (GRIND_MAP[it.id] != null) { return it; } } return null; }
function bestBowLog(bot) { const lvl = fletchLevel(bot); let pick = null; for (const it of items(bot)) { const t = FL_BOWS[it.id]; if (!t || !t[0]) continue; const kind = (t[1] && lvl >= t[1].level) ? 'longbow' : (lvl >= t[0].level ? 'shortbow' : null); if (kind) pick = { item: it, kind }; } return pick; }
function heldUnstrung(bot) { const lvl = fletchLevel(bot); for (const it of items(bot)) { const u = FL_UNSTRUNG.get(it.id); if (u && FL_BOWS[u.log] && FL_BOWS[u.log][u.i] && FL_BOWS[u.log][u.i].level <= lvl) return it; } return null; }

// crafting: leather tanning chain + gold jewellery. custom SP ids hardcoded.
const CR = { KNIFE: 13, HAMMER: 168, COWHIDE: 147, ANIMAL_FAT: 1540, TREATED_HIDE: 1541, LEATHER: 148, NEEDLE: 39, THREAD: 43, GOLD_BAR: 172 };
const CR_RAWMEAT = new Set([504, 502, 503]);
const CR_MOULDS = [293, 295, 294]; // ring / necklace / amulet moulds
function nearbyFire(bot) { return nearbyObject(bot, FIRE_IDS, 1); }

function nearbyAnvil(bot) { return nearbyObject(bot, ANVIL_IDS, 1); }
// which a bot leans toward forging: aggressive -> weapon, else armour.
function forgePrefer(bot) {
    try { return personality.of(bot).aggression >= 0.5 ? 'weapon' : 'armour'; } catch (e) { return 'weapon'; }
}

// raw cookable item ids (from the rsc-data cooking table).
const RAW_COOKABLE = new Set(
    Object.keys(require('@2003scape/rsc-data/skills/cooking').uncooked || {}).map(Number)
);
function nearbyCookObject(bot) { return nearbyObject(bot, COOK_IDS, 1); }
function rawCookableItem(bot) {
    return items(bot).find((it) => RAW_COOKABLE.has(it.id)) || null;
}

// combine two items into made food (stews/pies/pizzas/cakes/wine), from rsc-data cooking.combinations.
const COMBOS = (() => { try { return require('@2003scape/rsc-data/skills/cooking').combinations || []; } catch (e) { return []; } })();
// a combination the bot can do now (holds both items + cooking level), or null.
function combineableItem(bot) {
    const lvl = skillLvl(bot, 'cooking');
    for (const c of COMBOS) {
        if ((c.level || 1) > lvl) { continue; }
        if (count(bot, c.item) >= 1 && count(bot, c.with) >= 1) { return { item: find(bot, c.item), target: find(bot, c.with) }; }
    }
    return null;
}

// smelting bar recipes (ore ids + amounts + level) from rsc-data smithing.
const SMELT_RECIPES = (() => {
    const { smelting } = require('@2003scape/rsc-data/skills/smithing');
    return Object.keys(smelting).map((barId) => ({
        barId: Number(barId),
        level: smelting[barId].level || 1,
        ores: (smelting[barId].ores || []).map((i) => ({ id: i.id, amount: i.amount || 1 }))
    }));
})();
function nearbyFurnace(bot) { return nearbyObject(bot, FURNACE_IDS, 1); }
// the ore to use on a furnace for a bar the bot can make now, or null.
function smeltableOre(bot) {
    const lvl = skillLvl(bot, 'smithing'); // current-or-base
    for (const r of SMELT_RECIPES) {
        if (r.level > lvl || !r.ores.length) {
            continue;
        }
        if (r.ores.every((o) => count(bot, o.id) >= o.amount)) {
            return find(bot, r.ores[0].id);
        }
    }
    return null;
}
// the ore to use on a furnace for a specific bar, or null if the bot can't make it now.
function smeltableOreForBar(bot, barId) {
    const lvl = skillLvl(bot, 'smithing'); // current-or-base
    for (const r of SMELT_RECIPES) {
        if (Number(r.barId) !== Number(barId)) { continue; }
        if (r.level > lvl || !r.ores.length) { return null; }
        return r.ores.every((o) => count(bot, o.id) >= o.amount) ? find(bot, r.ores[0].id) : null;
    }
    return null;
}

// spin flax -> bow string (crafting 10) or wool -> ball of wool on a spinning wheel; flax is picked from a field.
const FLAX_ID = 675, WOOL_ID = 145;
function craftingLvl(bot) { return skillLvl(bot, 'crafting'); }
function nearbySpinningWheel(bot, reach) { return nearbyObject(bot, WHEEL_IDS, reach == null ? 2 : reach); }
function nearbyFlaxPlant(bot, reach) { return nearbyObject(bot, FLAX_IDS, reach == null ? 2 : reach); }
// enchant a crafted gem amulet into its useful form by casting the enchant spell.
const spellHandler = require('../../../packet-handlers/spell');
const ENCHANT_MAP = { // unenchanted amulet id -> { spell index, magic level, [cosmic + element runes] }
    302: { spell: 3, level: 7, runes: [{ id: 32, amount: 1 }, { id: 46, amount: 1 }] },   // sapphire -> of magic
    303: { spell: 13, level: 27, runes: [{ id: 33, amount: 3 }, { id: 46, amount: 1 }] },  // emerald  -> of protection
    304: { spell: 24, level: 49, runes: [{ id: 31, amount: 5 }, { id: 46, amount: 1 }] },  // ruby     -> of strength
    305: { spell: 30, level: 57, runes: [{ id: 34, amount: 10 }, { id: 46, amount: 1 }] }  // diamond  -> of power
};
function magicLvl(bot) { return skillLvl(bot, 'magic'); }
// a held amulet the bot can enchant now (level + runes), or null; returns slot + spell index.
function enchantableAmulet(bot) {
    const ml = magicLvl(bot);
    const inv = items(bot);
    for (let slot = 0; slot < inv.length; slot += 1) {
        const e = ENCHANT_MAP[inv[slot].id];
        if (!e || ml < e.level) { continue; }
        if (!e.runes.every((r) => count(bot, r.id) >= r.amount)) { continue; }
        return { slot, spell: e.spell };
    }
    return null;
}

// pottery ids: clay + water -> soft clay; +wheel -> unfired; +oven -> fired.
const POTTERY_WHEEL_IDS = new Set([179]);
const POTTERY_OVEN_IDS = new Set([178]);
const SOFT_CLAY_ID = 243, CLAY_ID = 149;
const FLOUR_ID = 136; // flour + water -> dough
// grapes + jug of water -> wine (cooking 35).
// cake tin + flour + egg + milk -> uncooked cake (cooking 40), bakes via the cook chain.
const GRAPES_ID = 143, JUG_WATER_ID = 141, CAKE_TIN_ID = 338, EGG_ID = 19, MILK_ID = 22;
function canMakeCake(bot) { return find(bot, CAKE_TIN_ID) && find(bot, FLOUR_ID) && find(bot, EGG_ID) && find(bot, MILK_ID); }
const POTTERY_WATER = [50, 141]; // bucket / jug of water (either wets the clay)
const UNFIRED_POTTERY = (() => { try { const { pottery } = require('@2003scape/rsc-data/skills/crafting'); return new Set((pottery || []).map((e) => e.unfired && e.unfired.id).filter((x) => x != null)); } catch (e) { return new Set(); } })();
function nearbyPotteryWheel(bot) { return nearbyObject(bot, POTTERY_WHEEL_IDS, 2); }
function nearbyPotteryOven(bot) { return nearbyObject(bot, POTTERY_OVEN_IDS, 2); }
function pottersWater(bot) { for (const w of POTTERY_WATER) { if (find(bot, w)) { return find(bot, w); } } return null; }
function unfiredPotteryItem(bot) { return items(bot).find((it) => UNFIRED_POTTERY.has(it.id)) || null; }

// glass: seaweed on a fire -> soda ash; bucket at a sand pit -> sand;
// sand+soda ash at a furnace -> molten glass; pipe+molten glass -> beer glass/vial/orb.
const SAND_PIT_IDS = new Set([302]);
const SAND_ID = 625, SODA_ASH_ID = 624, MOLTEN_GLASS_ID = 623, SEAWEED_ID = 622, GLASSBLOW_PIPE_ID = 621, BUCKET_ID = 21;
function nearbySandPit(bot) { return nearbyObject(bot, SAND_PIT_IDS, 2); }
// the held item that seeds glass-making at a furnace (needs sand + soda ash), or null.
function glassMakeItem(bot) { return (find(bot, SAND_ID) && find(bot, SODA_ASH_ID)) ? find(bot, SAND_ID) : null; }

// plain battlestaff + charged elemental orb -> elemental battlestaff (keyed by orb id in crafting.battlestaves).
const BATTLESTAFF_ID = 614;
const BATTLESTAVES = (() => { try { return require('@2003scape/rsc-data/skills/crafting').battlestaves || {}; } catch (e) { return {}; } })();
const BATTLE_ORB_IDS = new Set(Object.keys(BATTLESTAVES).map(Number));
// a held charged orb the bot's crafting level can staff (prefer the highest-xp), or null.
function staffableOrb(bot) {
    const lvl = craftingLvl(bot); let best = null;
    for (const it of items(bot)) { const d = BATTLESTAVES[it.id]; if (d && (d.level || 1) <= lvl && (!best || (BATTLESTAVES[best.id].experience || 0) < (d.experience || 0))) { best = it; } }
    return best;
}

// charge-orb spells: cast on an element obelisk; each needs element+cosmic runes + an unpowered orb.
const CHARGE_ORBS = (() => { try { return require('../../skills/magic').CHARGE_ORBS || {}; } catch (e) { return {}; } })();
const SPELL_DEFS = (() => { try { return require('@2003scape/rsc-data/config/spells') || []; } catch (e) { return []; } })();
// spellIndex -> { object (obelisk id), orb (result), level, runes:[{id,amount}] }
const CHARGE_SPELLS = (() => {
    const m = {};
    for (const [idx, def] of Object.entries(CHARGE_ORBS)) { const s = SPELL_DEFS[idx]; if (s) { m[idx] = { object: def.object, orb: def.orb, level: s.level, runes: s.runes || [] }; } }
    return m;
})();
const UNPOWERED_ORB_ID = 611;
// the charge-orb spell the bot can cast now at its current obelisk, or null; returns { spellIndex, x, y }.
function chargeableOrbHere(bot) {
    const ml = skillLvl(bot, 'magic');
    for (const [idx, s] of Object.entries(CHARGE_SPELLS)) {
        if (ml < s.level) { continue; }
        if (!s.runes.every((r) => count(bot, r.id) >= r.amount)) { continue; }
        const ob = nearbyObject(bot, new Set([s.object]), 2);
        if (ob) { return { spellIndex: Number(idx), x: ob.x, y: ob.y }; }
    }
    return null;
}
// can the bot charge an orb at some obelisk (level + runes + orb)? returns the spellIndex, ignoring position.
function chargeableOrbSpell(bot) {
    const ml = skillLvl(bot, 'magic');
    for (const [idx, s] of Object.entries(CHARGE_SPELLS)) {
        if (ml < s.level) { continue; }
        if (s.runes.every((r) => count(bot, r.id) >= r.amount)) { return Number(idx); }
    }
    return null;
}
// the nearest routable obelisk of the element the bot is equipped for, or null.
function obeliskTarget(bot) {
    const idx = chargeableOrbSpell(bot);
    if (idx == null) { return null; }
    const s = CHARGE_SPELLS[idx];
    if (!s || s.object == null) { return null; }
    return require('./map-data').nearestSite(bot, new Set([s.object]));
}

// the item to spin now: flax (crafting 10) else wool.
function spinnableItem(bot) {
    if (craftingLvl(bot) >= 10 && find(bot, FLAX_ID)) { return find(bot, FLAX_ID); }
    if (find(bot, WOOL_ID)) { return find(bot, WOOL_ID); }
    return null;
}
// ball of wool on an unstrung amulet/symbol -> strung.
const BALL_OF_WOOL_ID = 207;
const STRUNG_OF = (() => { const m = {}; try { const { stringing } = require('@2003scape/rsc-data/skills/crafting'); for (const [uns, str] of Object.entries(stringing || {})) { m[Number(uns)] = Number(str); } } catch (e) {  } return m; })();
const UNSTRUNG_STRINGABLE = new Set(Object.keys(STRUNG_OF).map(Number));
// the held unstrung amulet/symbol to string (matches a produce goal's product if named), or null.
function stringableUnstrung(bot, product) {
    if (!find(bot, BALL_OF_WOOL_ID)) { return null; }
    if (product != null) { return items(bot).find((it) => STRUNG_OF[it.id] === Number(product)) || null; }
    return items(bot).find((it) => UNSTRUNG_STRINGABLE.has(it.id)) || null;
}

function items(bot) { return bot.inventory && bot.inventory.items ? bot.inventory.items : []; }
function find(bot, id) { return items(bot).find((it) => it.id === id) || null; }
function count(bot, id) { let n = 0; for (const it of items(bot)) if (it.id === id) n += it.amount || 1; return n; }
function call(bot, hook, ...args) {
    const world = bot.world;
    if (!world || typeof world.callPlugin !== 'function') return false;
    try { Promise.resolve(world.callPlugin(hook, bot, ...args)).catch(() => {}); return true; } catch (e) { return false; }
}
function nearbyGround(bot, id) {
    try { const l = bot.getNearbyEntitiesByID ? bot.getNearbyEntitiesByID('groundItems', id, 2) : []; return (l && l[0]) || null; } catch (e) { return null; }
}

// the production skill the bot is deliberately training now (a 'skill' goal), or null.
let _goals;
function goalSkillOf(bot) {
    try {
        const g = (_goals || (_goals = require('./goals'))).current(bot);
        return g && g.type === 'skill' ? g.skill : null;
    } catch (e) { return null; }
}

// a recipe the bot can do now (tool + input), or null; personality-weighted, and a goal skill is preferred.
function pickRecipe(bot) {
    const doable = RECIPES.filter((r) => {
        // skip a skill still locked behind an unfinished prerequisite quest.
        if (requirements.questBlocked(bot, r.skill)) { return false; }
        if (r.kind === 'cookOnFire') {
            return rawCookableItem(bot) && nearbyCookObject(bot);
        }
        if (r.kind === 'smeltOnFurnace') {
            return smeltableOre(bot) && nearbyFurnace(bot);
        }
        if (r.kind === 'forge') {
            return production.hasForgeableBar(bot) && nearbyAnvil(bot);
        }
        if (r.kind === 'clean') {
            return !!firstOf(bot, GRIMY_HERBS);
        }
        if (r.kind === 'gemcut') {
            return find(bot, CHISEL_ID) && firstOf(bot, UNCUT_GEMS);
        }
        if (r.kind === 'mixUnfinished') { return !!mixableHerb(bot); }
        if (r.kind === 'mixPotion') { return !!mixablePotion(bot); }
        if (r.kind === 'fletchHeadless') { return count(bot, FLETCH.FEATHER) >= 1 && count(bot, FLETCH.SHAFTS) >= 1; }
        if (r.kind === 'fletchArrows') { return count(bot, FLETCH.HEADLESS) >= 1 && !!bestArrowhead(bot); }
        if (r.kind === 'fletchDart') { return count(bot, FLETCH.FEATHER) >= 1 && !!bestDartTip(bot); }
        if (r.kind === 'fletchBow') { return !!find(bot, FLETCH.KNIFE) && !!bestBowLog(bot); }
        if (r.kind === 'stringBow') { return count(bot, FLETCH.BOWSTRING) >= 1 && !!heldUnstrung(bot); }
        if (r.kind === 'tanhide') {
            return (find(bot, CR.KNIFE) && firstOf(bot, CR_RAWMEAT)) ||
                (find(bot, CR.HAMMER) && find(bot, CR.COWHIDE) && find(bot, CR.ANIMAL_FAT)) ||
                (find(bot, CR.TREATED_HIDE) && nearbyFire(bot));
        }
        if (r.kind === 'leatherwork') { return find(bot, CR.NEEDLE) && find(bot, CR.THREAD) && count(bot, CR.LEATHER) >= 1; }
        if (r.kind === 'jewellery') { return find(bot, CR.GOLD_BAR) && CR_MOULDS.some((m) => find(bot, m)) && nearbyFurnace(bot); }
        if (r.kind === 'silverJewellery') { return find(bot, 384) && (find(bot, 386) || find(bot, 1026)) && nearbyFurnace(bot); }
        if (r.kind === 'spin') { return !!spinnableItem(bot) && !!nearbySpinningWheel(bot); }
        if (r.kind === 'stringAmulet') { return !!stringableUnstrung(bot); }
        if (r.kind === 'enchant') { return !!enchantableAmulet(bot); }
        if (r.kind === 'cookCombine') { return !!combineableItem(bot); }
        if (r.kind === 'softclay') { return !!find(bot, CLAY_ID) && !!pottersWater(bot); }
        if (r.kind === 'mouldPottery') { return !!find(bot, SOFT_CLAY_ID) && !!nearbyPotteryWheel(bot); }
        if (r.kind === 'firePottery') { return !!unfiredPotteryItem(bot) && !!nearbyPotteryOven(bot); }
        if (r.kind === 'sodaAsh') { return !!find(bot, SEAWEED_ID) && !!nearbyCookObject(bot); }
        if (r.kind === 'sandFill') { return !!find(bot, BUCKET_ID) && !!nearbySandPit(bot); }
        if (r.kind === 'glassMake') { return !!glassMakeItem(bot) && !!nearbyFurnace(bot); }
        if (r.kind === 'glassBlow') { return !!find(bot, GLASSBLOW_PIPE_ID) && !!find(bot, MOLTEN_GLASS_ID); }
        if (r.kind === 'battlestaff') { return !!find(bot, BATTLESTAFF_ID) && !!staffableOrb(bot); }
        if (r.kind === 'chargeOrb') { return !!chargeableOrbHere(bot); }
        if (r.kind === 'makeDough') { return !!find(bot, FLOUR_ID) && !!pottersWater(bot); }
        if (r.kind === 'ground') { return !!find(bot, r.tool) && !!bestFiremakingLog(bot); } // tinderbox + any liftable log tier
        if (r.kind === 'grind') { return !!grindableItem(bot); }
        if (r.kind === 'makeWine') { return !!find(bot, GRAPES_ID) && !!find(bot, JUG_WATER_ID); }
        if (r.kind === 'cakeMix') { return !!canMakeCake(bot); }
        return find(bot, r.tool) && count(bot, r.input) >= 1;
    });
    if (!doable.length) return null;
    const p = personality.of(bot);
    const gs = goalSkillOf(bot);
    const goalDoable = gs ? doable.filter((r) => r.skill === gs) : [];
    let chance = 0.12 + p.diligence * 0.4 + p.curiosity * 0.1; // skillers lean in
    if (goalDoable.length) { chance = Math.min(1, chance + 0.45); } // deliberate training of a goal skill
    if (Math.random() > chance) return null;
    const pool = goalDoable.length ? goalDoable : doable;
    return pool[Math.floor(Math.random() * pool.length)];
}

// process one input by firing the real skill hook(s); returns true if it acted.
function processOne(bot, recipe) {
    if (recipe.kind === 'cookOnFire') {
        return cookOne(bot);
    }
    if (recipe.kind === 'smeltOnFurnace') {
        const furnace = nearbyFurnace(bot);
        // a produce goal smelts recipe.product; incidental smelting takes the best bar.
        const ore = recipe.product != null ? smeltableOreForBar(bot, recipe.product) : smeltableOre(bot);
        if (!furnace || !ore) {
            return false;
        }
        return call(bot, 'onUseWithGameObject', furnace, ore);
    }
    if (recipe.kind === 'forge') {
        // forge one item directly (no menu): recipe.product for a produce goal, else the best for the bars held.
        if (!nearbyAnvil(bot)) {
            return false;
        }
        if (recipe.product != null) { return !!production.forgeItem(bot, recipe.product); }
        return !!production.forgeAny(bot, forgePrefer(bot));
    }
    if (recipe.kind === 'clean') {
        const herb = firstOf(bot, GRIMY_HERBS);
        if (!herb) { return false; }
        return call(bot, 'onInventoryCommand', herb); // OpInv "Identify" -> herblaw xp
    }
    if (recipe.kind === 'gemcut') {
        const chisel = find(bot, CHISEL_ID);
        const gem = firstOf(bot, UNCUT_GEMS);
        if (!chisel || !gem) { return false; }
        return call(bot, 'onUseWithInventory', chisel, gem); // chisel on gem -> cut gem, crafting xp
    }
    if (recipe.kind === 'mixUnfinished') {
        const herb = mixableHerb(bot);
        if (herb == null) { return false; }
        return call(bot, 'onUseWithInventory', find(bot, VIAL_OF_WATER), find(bot, herb)); // vial + herb -> unfinished
    }
    if (recipe.kind === 'mixPotion') {
        const r = mixablePotion(bot);
        if (!r) { return false; }
        return call(bot, 'onUseWithInventory', find(bot, r.unf), find(bot, r.sec)); // unfinished + secondary -> potion
    }
    if (recipe.kind === 'fletchHeadless') {
        return call(bot, 'onUseWithInventory', find(bot, FLETCH.FEATHER), find(bot, FLETCH.SHAFTS));
    }
    if (recipe.kind === 'fletchArrows') {
        const h = find(bot, FLETCH.HEADLESS), a = bestArrowhead(bot);
        if (!h || !a) { return false; }
        return call(bot, 'onUseWithInventory', h, a);
    }
    if (recipe.kind === 'fletchDart') {
        const feather = find(bot, FLETCH.FEATHER), tip = bestDartTip(bot);
        if (!feather || !tip) { return false; }
        return call(bot, 'onUseWithInventory', feather, tip); // feather + dart tip -> dart (ask-free)
    }
    if (recipe.kind === 'fletchBow') {
        const k = find(bot, FLETCH.KNIFE), p = bestBowLog(bot);
        if (!k || !p) { return false; }
        // cutLog opens a make-menu; hint the answer via _forcedAnswers.
        bot._forcedAnswers = [p.kind === 'longbow' ? /longbow/i : /shortbow/i];
        return call(bot, 'onUseWithInventory', k, p.item);
    }
    if (recipe.kind === 'stringBow') {
        const s = find(bot, FLETCH.BOWSTRING), u = heldUnstrung(bot);
        if (!s || !u) { return false; }
        return call(bot, 'onUseWithInventory', s, u);
    }
    if (recipe.kind === 'tanhide') {
        // drive the furthest-along tanning step available.
        if (find(bot, CR.TREATED_HIDE) && nearbyFire(bot)) {
            return call(bot, 'onUseWithGameObject', nearbyFire(bot), find(bot, CR.TREATED_HIDE)); // -> leather +25 xp
        }
        if (find(bot, CR.HAMMER) && find(bot, CR.COWHIDE) && find(bot, CR.ANIMAL_FAT)) {
            return call(bot, 'onUseWithInventory', find(bot, CR.HAMMER), find(bot, CR.COWHIDE)); // -> treated hide
        }
        if (find(bot, CR.KNIFE) && firstOf(bot, CR_RAWMEAT)) {
            return call(bot, 'onUseWithInventory', find(bot, CR.KNIFE), firstOf(bot, CR_RAWMEAT)); // -> animal fat
        }
        return false;
    }
    if (recipe.kind === 'leatherwork') {
        return !!production.craftLeatherBest(bot); // needle+thread+leather -> armour
    }
    if (recipe.kind === 'jewellery') {
        if (!nearbyFurnace(bot)) { return false; }
        return !!production.mouldJewelleryBest(bot); // gold bar + mould (+cut gem) at a furnace -> jewellery
    }
    if (recipe.kind === 'silverJewellery') {
        if (!nearbyFurnace(bot)) { return false; }
        return !!production.mouldSilverBest(bot); // silver bar + mould at a furnace -> holy/unholy symbol
    }
    if (recipe.kind === 'spin') {
        const wheel = nearbySpinningWheel(bot);
        const item = spinnableItem(bot);
        if (!wheel || !item) { return false; }
        return call(bot, 'onUseWithGameObject', wheel, item); // flax -> bow string / wool -> ball of wool
    }
    if (recipe.kind === 'enchant') {
        const e = enchantableAmulet(bot);
        if (!e) { return false; }
        try { spellHandler.castInventoryItem({ player: bot }, { index: e.slot, id: e.spell }); return true; } catch (err) { return false; } // cast the enchant on the amulet
    }
    if (recipe.kind === 'cookCombine') {
        const c = combineableItem(bot);
        if (!c) { return false; }
        return call(bot, 'onUseWithInventory', c.item, c.target); // combine two ingredients (stew/pie/pizza/cake step)
    }
    if (recipe.kind === 'softclay') {
        const clay = find(bot, CLAY_ID); const water = pottersWater(bot);
        if (!clay || !water) { return false; }
        return call(bot, 'onUseWithInventory', clay, water); // clay + water -> soft clay
    }
    if (recipe.kind === 'mouldPottery') {
        if (!nearbyPotteryWheel(bot)) { return false; }
        return !!production.mouldPotteryBest(bot); // soft clay at a wheel -> unfired
    }
    if (recipe.kind === 'firePottery') {
        const oven = nearbyPotteryOven(bot); const unf = unfiredPotteryItem(bot);
        if (!oven || !unf) { return false; }
        return call(bot, 'onUseWithGameObject', oven, unf); // unfired at an oven -> fired
    }
    if (recipe.kind === 'sodaAsh') {
        const fire = nearbyCookObject(bot); const weed = find(bot, SEAWEED_ID);
        if (!fire || !weed) { return false; }
        return call(bot, 'onUseWithGameObject', fire, weed); // seaweed on a fire -> soda ash
    }
    if (recipe.kind === 'sandFill') {
        const pit = nearbySandPit(bot); const bucket = find(bot, BUCKET_ID);
        if (!pit || !bucket) { return false; }
        return call(bot, 'onUseWithGameObject', pit, bucket); // bucket at a sand pit -> sand
    }
    if (recipe.kind === 'glassMake') {
        const furnace = nearbyFurnace(bot); const seed = glassMakeItem(bot);
        if (!furnace || !seed) { return false; }
        return call(bot, 'onUseWithGameObject', furnace, seed); // sand + soda ash at a furnace -> molten glass
    }
    if (recipe.kind === 'glassBlow') {
        if (!find(bot, GLASSBLOW_PIPE_ID)) { return false; }
        return !!production.blowGlassBest(bot); // pipe + molten glass -> beer glass/vial/orb
    }
    if (recipe.kind === 'battlestaff') {
        const staff = find(bot, BATTLESTAFF_ID); const orb = staffableOrb(bot);
        if (!staff || !orb) { return false; }
        return call(bot, 'onUseWithInventory', staff, orb); // battlestaff + charged orb -> elemental battlestaff
    }
    if (recipe.kind === 'chargeOrb') {
        const c = chargeableOrbHere(bot);
        if (!c) { return false; }
        try { spellHandler.castObject({ player: bot }, { x: c.x, y: c.y, id: c.spellIndex }); return true; } catch (e) { return false; } // charge the orb at the obelisk
    }
    if (recipe.kind === 'makeDough') {
        if (!find(bot, FLOUR_ID) || !pottersWater(bot)) { return false; }
        return !!production.makeDoughBest(bot, recipe.product); // flour + water -> dough
    }
    if (recipe.kind === 'grind') {
        const g = grindableItem(bot);
        if (!g) { return false; }
        return call(bot, 'onUseWithInventory', find(bot, PESTLE_ID), g); // pestle + ingredient -> powder
    }
    if (recipe.kind === 'makeWine') {
        if (!find(bot, GRAPES_ID) || !find(bot, JUG_WATER_ID)) { return false; }
        return call(bot, 'onUseWithInventory', find(bot, GRAPES_ID), find(bot, JUG_WATER_ID)); // grapes + jug water -> wine
    }
    if (recipe.kind === 'cakeMix') {
        if (!canMakeCake(bot)) { return false; }
        return call(bot, 'onUseWithInventory', find(bot, CAKE_TIN_ID), find(bot, FLOUR_ID)); // tin + flour/egg/milk -> uncooked cake
    }
    if (recipe.kind === 'stringAmulet') {
        const unstrung = stringableUnstrung(bot, recipe.product); // honour a produce goal's on-path target
        if (!unstrung) { return false; }
        return call(bot, 'onUseWithInventory', find(bot, BALL_OF_WOOL_ID), unstrung); // ball of wool + unstrung -> strung
    }
    const tool = find(bot, recipe.tool);
    if (!tool) return false;
    if (recipe.kind === 'combine') {
        const input = find(bot, recipe.input);
        if (!input) return false;
        return call(bot, 'onUseWithInventory', tool, input);
    }
    if (recipe.kind === 'ground') {
        // step 2: light the best already-dropped log on the ground.
        for (const lid of [636, 635, 634, 633, 632, 14]) {
            if (fireLevel(bot) >= FIREMAKING_LOGS[lid]) { const gi = nearbyGround(bot, lid); if (gi) { return call(bot, 'onUseWithGroundItem', gi, tool); } }
        }
        // step 1: drop the best log the level allows.
        const input = bestFiremakingLog(bot);
        if (!input) { return false; }
        return call(bot, 'onDropItem', input);
    }
    return false;
}

// ask-safe driven kinds advanceHeldOne can finish a held intermediate with.
// each re-derives its concrete items inside processOne, so {kind} is enough.
const DRIVEN_ADVANCE_KINDS = new Set(['smeltOnFurnace', 'forge', 'cookOnFire', 'clean', 'gemcut',
    'mixUnfinished', 'mixPotion', 'fletchBow', 'stringBow', 'fletchArrows', 'fletchHeadless', 'fletchDart', 'jewellery', 'silverJewellery', 'spin', 'stringAmulet', 'enchant', 'cookCombine', 'softclay', 'mouldPottery', 'firePottery', 'sodaAsh', 'sandFill', 'glassMake', 'glassBlow', 'chargeOrb', 'battlestaff', 'makeDough', 'grind', 'makeWine', 'cakeMix']);
function skillLvl(bot, s) { const sk = bot.skills && bot.skills[s]; return sk ? (sk.current != null ? sk.current : sk.base) : 1; }
// can this bot run chain edge e now? driven kind + level + co-inputs + facility.
function canDoEdge(bot, e) {
    if (!e.driver || !DRIVEN_ADVANCE_KINDS.has(e.kind)) { return false; }
    if (skillLvl(bot, e.skill) < e.level) { return false; }
    // primary feedstock amount (forge needs up to 5 bars, others 1).
    if (e.inputs[0] && count(bot, e.inputs[0].id) < (e.inputs[0].amount || 1)) { return false; }
    // co-inputs
    for (let i = 1; i < e.inputs.length; i += 1) { if (count(bot, e.inputs[i].id) < e.inputs[i].amount) { return false; } }
    // tools/moulds the processOne handler needs that aren't edge inputs.
    if (e.kind === 'gemcut' && !find(bot, CHISEL_ID)) { return false; }        // chisel
    if (e.kind === 'forge' && !find(bot, 168)) { return false; }               // hammer
    if (e.kind === 'fletchBow' && !find(bot, 13)) { return false; }            // knife
    if (e.kind === 'jewellery' && !CR_MOULDS.some((m) => find(bot, m))) { return false; }
    if (e.kind === 'silverJewellery' && !(find(bot, 386) || find(bot, 1026))) { return false; }
    if (e.kind === 'smeltOnFurnace' || e.kind === 'jewellery' || e.kind === 'silverJewellery') { return !!nearbyFurnace(bot); }
    if (e.kind === 'forge') { return !!nearbyAnvil(bot); }
    if (e.kind === 'cookOnFire') { return !!nearbyCookObject(bot); }
    if (e.kind === 'spin') { return !!nearbySpinningWheel(bot); }
    if (e.kind === 'mouldPottery') { return !!nearbyPotteryWheel(bot); }
    if (e.kind === 'firePottery') { return !!nearbyPotteryOven(bot); }
    if (e.kind === 'sodaAsh') { return !!nearbyCookObject(bot); }
    if (e.kind === 'sandFill') { return !!nearbySandPit(bot); }
    if (e.kind === 'glassMake') { return count(bot, SODA_ASH_ID) >= 1 && !!nearbyFurnace(bot); }
    if (e.kind === 'glassBlow') { return !!find(bot, GLASSBLOW_PIPE_ID); }
    if (e.kind === 'battlestaff') { return !!find(bot, BATTLESTAFF_ID); } // + charged orb (primary, checked above)
    if (e.kind === 'chargeOrb') { return !!chargeableOrbHere(bot); } // runes + unpowered orb + magic level + at the obelisk
    if (e.kind === 'makeDough') { return !!pottersWater(bot); } // flour is primary; needs water too
    if (e.kind === 'grind') { return !!find(bot, PESTLE_ID); } // ingredient is primary; pestle is the tool
    if (e.kind === 'makeWine') { return true; } // grapes + jug water, both checked generically
    if (e.kind === 'cakeMix') { return !!find(bot, CAKE_TIN_ID); } // flour + egg/milk checked; tin is the tool
    return true; // pure item-on-item, no facility
}
// does productId feed an edge of the goal skill (a cross-skill sub-step the goal needs)?
function feedsGoalSkill(productId, gs) {
    for (const e of itemKnowledge.productsOf(productId)) { if (e.skill === gs) { return true; } }
    return false;
}
// advance one held intermediate of the bot's goal skill to its best driven next step.
function advanceHeldOne(bot) {
    const g = (_goals || (_goals = require('./goals'))).current(bot);
    const gs = g && g.type === 'skill' ? g.skill : null;
    if (!gs || requirements.questBlocked(bot, gs)) { return false; }
    // produce goal: converge on the committed target, refining only products on its chain (_onPath).
    const pr = g && g.produce ? g.produce : null;
    for (const it of items(bot)) {
        if (pr && Number(it.id) === Number(pr.id)) { continue; }
        // only advance an item that is the primary feedstock (inputs[0]) of the edge.
        const primary = (ed) => ed.inputs[0] && Number(ed.inputs[0].id) === Number(it.id) && canDoEdge(bot, ed);
        let e = null;
        if (pr) {
            // produce owns the whole chain, so accept any on-path edge regardless of skill.
            e = itemKnowledge.refinedFormOf(it.id, (ed) => pr._onPath.has(Number(ed.product)) && primary(ed));
        } else {
            // plain skill goal: the goal skill's own edges, plus cross-skill sub-steps that feed it.
            e = itemKnowledge.refinedFormOf(it.id, (ed) => (ed.skill === gs || feedsGoalSkill(ed.product, gs)) && primary(ed));
        }
        // continue (not return) if processOne fails, so a different held intermediate can be tried.
        if (e && processOne(bot, pr ? { kind: e.kind, product: e.product } : { kind: e.kind })) { return true; }
    }
    return false;
}

// does the bot hold the makings of jewellery (gold bar + gold mould, or silver bar + silver mould)?
function canMakeJewellery(bot) {
    const goldOk = !!find(bot, CR.GOLD_BAR) && CR_MOULDS.some((m) => find(bot, m));
    const silverOk = !!find(bot, 384) && (!!find(bot, 386) || !!find(bot, 1026));
    return goldOk || silverOk;
}
// make one piece of jewellery at a furnace, preferring gold else silver.
function makeJewelleryOne(bot) {
    if (find(bot, CR.GOLD_BAR) && processOne(bot, { kind: 'jewellery' })) { return true; }
    return processOne(bot, { kind: 'silverJewellery' });
}

// cookOnFire has no fixed tool: use a raw cookable item on a nearby fire/range.
function cookOne(bot) {
    const fire = nearbyCookObject(bot);
    const raw = rawCookableItem(bot);
    if (!fire || !raw) {
        return false;
    }
    return call(bot, 'onUseWithGameObject', fire, raw);
}

// process trip: a bot with raw materials but no facility at hand walks to the nearest routable one,
// works there, then carries on.
const travel = require('./travel');
// process-trip destinations are the nearest routable facility/resource instance from the whole map (map-data.js).
// windmill flour: put grain in the hopper upstairs and operate it,
// then pot the flour heap that drops at the chute downstairs.
const GRAIN_ID = 29, WHEAT_ID = 72, FLOUR_HEAP_ID = 23, POT_ID = 135;
const WINDMILLS = [
    { hopper: 52, hopperXY: [166, 2487], heapXY: [166, 599] },   // Draynor (classic, well-noded)
    { hopper: 173, hopperXY: [179, 2371], heapXY: [179, 481] },  // Cooks' Guild
    { hopper: 343, hopperXY: [565, 2420], heapXY: [565, 532] },  // Ardougne
    { hopper: 246, hopperXY: [159, 3533], heapXY: [162, 3533] }  // Zanaris
];
function nearbyWheat(bot) { return nearbyObject(bot, new Set([WHEAT_ID]), 2); }
// pick one grain from a nearby wheat field.
function pickGrainOne(bot) { const f = nearbyWheat(bot); if (!f) { return false; } return call(bot, 'onGameObjectCommandTwo', f); }
// does the bot want flour now? a cooking bot carrying a pot but no flour yet (the bread/pie path).
function wantsFlour(bot) {
    if (!find(bot, POT_ID) || find(bot, FLOUR_ID)) { return false; }
    // accept a cooking goal or a gather goal with forSkill 'cooking'.
    try { const g = (_goals || (_goals = require('./goals'))).current(bot); return !!(g && g.type === 'skill' && (g.skill === 'cooking' || g.forSkill === 'cooking')); } catch (e) { return false; }
}
function nearestWindmill(bot) {
    let best = null, bd = Infinity;
    for (const w of WINDMILLS) { const d = Math.abs(bot.x - w.heapXY[0]) + Math.abs(bot.y - w.heapXY[1]); if (d < bd) { bd = d; best = w; } }
    return best;
}
function startWindmillTrip(bot) {
    const w = nearestWindmill(bot);
    if (!w) { return false; }
    bot._windmillTrip = { w, phase: 'toHopper', ticks: 0 };
    travel.begin(bot, { x: w.hopperXY[0], y: w.hopperXY[1] });
    return true;
}
// staged windmill run: walk up to the hopper and operate it, walk down to the chute, pot the dropped heap into flour.
function windmillTick(bot) {
    const t = bot._windmillTrip;
    if (!t) { return false; }
    t.ticks += 1;
    if (t.ticks > 900) { bot._windmillTrip = null; bot._procTripCd = 300; return false; }
    const w = t.w;
    const hopper = nearbyObject(bot, new Set([w.hopper]), 3);

    if (t.phase === 'toHopper') {
        if (!find(bot, GRAIN_ID)) { bot._windmillTrip = null; bot._procTripCd = 120; return false; } // lost the grain
        if (hopper) {
            call(bot, 'onUseWithGameObject', hopper, find(bot, GRAIN_ID)); // put grain in the hopper
            t.phase = 'operate'; t.opTicks = 0; bot._travel = null; if (bot.walkQueue) { bot.walkQueue.length = 0; }
            return true;
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, { x: w.hopperXY[0], y: w.hopperXY[1] })) { bot._windmillTrip = null; bot._procTripCd = 300; return false; }
        travel.step(bot);
        return true;
    }
    if (t.phase === 'operate') {
        t.opTicks += 1;
        if (t.opTicks < 3) { return true; } // let the async 'put' settle
        if (hopper) { call(bot, 'onGameObjectCommandOne', hopper); } // operate -> a flour heap drops at the chute
        t.phase = 'toHeap'; t.headTicks = 0;
        return true;
    }
    if (t.phase === 'toHeap') {
        t.headTicks += 1;
        const heap = nearbyGround(bot, FLOUR_HEAP_ID);
        if (heap && find(bot, POT_ID)) {
            call(bot, 'onUseWithGroundItem', heap, find(bot, POT_ID)); // pot the heap -> flour
            bot._windmillTrip = null; bot._procTripCd = 40 + Math.floor(Math.random() * 60);
            return true;
        }
        if (Math.abs(bot.x - w.heapXY[0]) + Math.abs(bot.y - w.heapXY[1]) <= 2) {
            if (t.headTicks > 14) { bot._windmillTrip = null; bot._procTripCd = 150; return false; } // heap never showed
            return true; // wait a few ticks for the heap to drop
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, { x: w.heapXY[0], y: w.heapXY[1] })) { bot._windmillTrip = null; bot._procTripCd = 300; return false; }
        travel.step(bot);
        return true;
    }
    return false;
}
const FLAX_BATCH = 8; // pick this many flax per field trip before carrying them off to spin
const BATCH_RAW = 8; // carry at least this many raw items before it's worth a trip

// pick one flax from a nearby field plant.
function pickFlaxOne(bot) {
    const f = nearbyFlaxPlant(bot);
    if (!f) { return false; }
    return call(bot, 'onGameObjectCommandTwo', f);
}
// does the bot's current goal need flax (a produce goal whose plan keeps flax)?
function goalNeedsFlax(bot) {
    try {
        const g = (_goals || (_goals = require('./goals'))).current(bot);
        return !!(g && g.produce && g.produce._keep && g.produce._keep.has(FLAX_ID));
    } catch (e) { return false; }
}

function totalRawCookable(bot) {
    let n = 0;
    for (const it of items(bot)) {
        if (RAW_COOKABLE.has(it.id)) n += it.amount || 1;
    }
    return n;
}

// worth walking to a processor? returns a trip kind or false; personality- and cooldown-gated.
function shouldProcessTrip(bot) {
    if (bot._procTripCd && bot._procTripCd > 0) { bot._procTripCd -= 1; return false; }
    if (bot.inventory && bot.inventory.isFull && !bot.inventory.isFull()) {
        // room to keep gathering, so make the trip only sometimes
    }
    const p = personality.of(bot);
    if (Math.random() > 0.12 + p.diligence * 0.33) { return false; }
    if (totalRawCookable(bot) >= BATCH_RAW && !nearbyCookObject(bot)) { return 'cook'; }
    if (smeltableOre(bot) && !nearbyFurnace(bot)) { return 'smelt'; }
    if (production.hasForgeableBar(bot) && !nearbyAnvil(bot)) { return 'forge'; }
    if (canMakeJewellery(bot) && !nearbyFurnace(bot)) { return 'jewellery'; } // walk to a furnace to set gems / mould symbols
    // carry flax/wool to a spinning wheel; a bow goal with no flax picks it from a field first.
    if (spinnableItem(bot) && !nearbySpinningWheel(bot)) { return 'spin'; }
    if (goalNeedsFlax(bot) && craftingLvl(bot) >= 10 && count(bot, FLAX_ID) === 0 && count(bot, 676) === 0 && !nearbyFlaxPlant(bot)) { return 'flax'; }
    // carry soft clay to a wheel to mould, then the unfired piece to an oven to fire.
    if (find(bot, SOFT_CLAY_ID) && !nearbyPotteryWheel(bot)) { return 'mould'; }
    if (unfiredPotteryItem(bot) && !nearbyPotteryOven(bot)) { return 'fire'; }
    // glass: sand+soda ash -> furnace; seaweed -> fire for soda ash; spare bucket -> sand pit for sand.
    if (glassMakeItem(bot) && !nearbyFurnace(bot)) { return 'glass'; }
    if (find(bot, SEAWEED_ID) && !nearbyCookObject(bot)) { return 'soda'; }
    if (find(bot, BUCKET_ID) && (find(bot, SEAWEED_ID) || find(bot, SODA_ASH_ID)) && !find(bot, SAND_ID) && !nearbySandPit(bot)) { return 'sand'; }
    // a mage holding an unpowered orb + element runes treks to that obelisk.
    if (find(bot, UNPOWERED_ORB_ID) && chargeableOrbSpell(bot) != null && !chargeableOrbHere(bot)) { return 'obelisk'; }
    // a bread-path cooking bot with no grain picks some at a wheat field.
    if (wantsFlour(bot) && count(bot, GRAIN_ID) < 3 && !nearbyWheat(bot)) { return 'grain'; }
    return false;
}
// the edge kind a trip kind executes.
const TRIP_EDGE_KIND = { cook: 'cookOnFire', smelt: 'smeltOnFurnace', forge: 'forge', glass: 'glassMake', soda: 'sodaAsh', sand: 'sandFill' };
// for a produce goal, the on-path product this trip should make; null otherwise.
function produceProductForTrip(bot, kind) {
    try {
        const g = (_goals || (_goals = require('./goals'))).current(bot);
        const pr = g && g.produce;
        const ek = TRIP_EDGE_KIND[kind];
        if (!pr || !ek || !pr._kindProduct) { return null; }
        const p = pr._kindProduct[ek];
        return p != null ? p : null;
    } catch (e) { return null; }
}
function startProcessTrip(bot, kind) {
    if (kind === 'obelisk') {
        const t = obeliskTarget(bot);
        if (!t) { return false; }
        bot._processTrip = { kind, target: t, ticks: 0, product: null };
        travel.begin(bot, { x: t.x, y: t.y });
        return true;
    }
    // the nearest routable facility/resource instance from the whole map (map-data.js).
    const md = require('./map-data');
    const notGuildBlocked = (x, y) => { try { return !require('./guilds').interiorBlockedFor(bot, x, y); } catch (e) { return true; } };
    const target = kind === 'spin' ? md.nearestSite(bot, WHEEL_IDS, { planeAware: true })
        : (kind === 'cook' || kind === 'soda') ? md.nearestSite(bot, COOK_IDS)
            : kind === 'forge' ? md.nearestSite(bot, ANVIL_IDS)
                : kind === 'flax' ? md.nearestSite(bot, FLAX_IDS)
                    : kind === 'mould' ? md.nearestSite(bot, POTTERY_WHEEL_IDS, { filter: notGuildBlocked })
                        : kind === 'fire' ? md.nearestSite(bot, POTTERY_OVEN_IDS, { filter: notGuildBlocked })
                            : kind === 'sand' ? md.nearestSite(bot, SAND_PIT_IDS)
                                : kind === 'grain' ? md.nearestSite(bot, new Set([WHEAT_ID]))
                                    : md.nearestSite(bot, FURNACE_IDS); // 'smelt', 'jewellery' and 'glass' all melt at a furnace
    if (!target) { return false; }
    bot._processTrip = { kind, target, ticks: 0, product: produceProductForTrip(bot, kind) };
    travel.begin(bot, { x: target.x, y: target.y });
    return true;
}
// drive the walk to the processor, then work in place; aborts if it can't get there.
function processTripTick(bot) {
    const t = bot._processTrip;
    if (!t) { return false; }
    t.ticks += 1;

    // reached the processor (or its facility is within reach) -> switch to working in place.
    const facilityHere = t.kind === 'spin' ? nearbySpinningWheel(bot) : t.kind === 'flax' ? nearbyFlaxPlant(bot)
        : t.kind === 'mould' ? nearbyPotteryWheel(bot) : t.kind === 'fire' ? nearbyPotteryOven(bot)
            : t.kind === 'sand' ? nearbySandPit(bot) : t.kind === 'soda' ? nearbyCookObject(bot)
                : t.kind === 'glass' ? nearbyFurnace(bot) : t.kind === 'obelisk' ? chargeableOrbHere(bot)
                    : t.kind === 'grain' ? nearbyWheat(bot) : null;
    if (t.phase !== 'work' && (Math.abs(bot.x - t.target.x) + Math.abs(bot.y - t.target.y) <= 1 || facilityHere)) {
        t.phase = 'work';
        t.workTicks = 0;
        bot._travel = null;
        if (bot.walkQueue) { bot.walkQueue.length = 0; }
    }

    if (t.phase === 'work') {
        t.workTicks += 1;
        const doable = t.kind === 'cook'
            ? (totalRawCookable(bot) > 0 && nearbyCookObject(bot))
            : t.kind === 'forge'
                ? (production.hasForgeableBar(bot) && nearbyAnvil(bot))
                : t.kind === 'jewellery'
                    ? (canMakeJewellery(bot) && nearbyFurnace(bot))
                    : t.kind === 'spin'
                        ? (spinnableItem(bot) && nearbySpinningWheel(bot))
                        : t.kind === 'flax'
                            ? (goalNeedsFlax(bot) && count(bot, FLAX_ID) < FLAX_BATCH && nearbyFlaxPlant(bot))
                            : t.kind === 'mould'
                                ? (find(bot, SOFT_CLAY_ID) && nearbyPotteryWheel(bot))
                                : t.kind === 'fire'
                                    ? (unfiredPotteryItem(bot) && nearbyPotteryOven(bot))
                                    : t.kind === 'glass'
                                        ? (glassMakeItem(bot) && nearbyFurnace(bot))
                                        : t.kind === 'soda'
                                            ? (find(bot, SEAWEED_ID) && nearbyCookObject(bot))
                                            : t.kind === 'sand'
                                                ? (find(bot, BUCKET_ID) && nearbySandPit(bot))
                                                : t.kind === 'obelisk'
                                                    ? !!chargeableOrbHere(bot)
                                                    : t.kind === 'grain'
                                                        ? (wantsFlour(bot) && count(bot, GRAIN_ID) < 3 && nearbyWheat(bot))
                                                        : (smeltableOre(bot) && nearbyFurnace(bot));
        // finished the bag (or the object vanished / took too long) -> end the trip.
        if (!doable || t.workTicks > 600) {
            bot._processTrip = null;
            bot._procTripCd = 60 + Math.floor(Math.random() * 120);
            return true;
        }
        // fire one processing action when free (the batch itself locks/holds between actions).
        if (!bot.locked && !bot.gatheringSkill) {
            if (bot._processCd && bot._processCd > 0) {
                bot._processCd -= 1;
            } else {
                if (t.kind === 'jewellery') { makeJewelleryOne(bot); }
                else if (t.kind === 'spin') { processOne(bot, { kind: 'spin' }); }
                else if (t.kind === 'flax') { pickFlaxOne(bot); }
                else if (t.kind === 'mould') { processOne(bot, { kind: 'mouldPottery' }); }
                else if (t.kind === 'fire') { processOne(bot, { kind: 'firePottery' }); }
                else if (t.kind === 'glass') { processOne(bot, { kind: 'glassMake' }); }
                else if (t.kind === 'soda') { processOne(bot, { kind: 'sodaAsh' }); }
                else if (t.kind === 'sand') { processOne(bot, { kind: 'sandFill' }); }
                else if (t.kind === 'obelisk') { processOne(bot, { kind: 'chargeOrb' }); }
                else if (t.kind === 'grain') { pickGrainOne(bot); }
                else { processOne(bot, { kind: t.kind === 'cook' ? 'cookOnFire' : t.kind === 'forge' ? 'forge' : 'smeltOnFurnace', product: t.product }); }
                bot._processCd = 6 + Math.floor(Math.random() * 8);
            }
        }
        return true; // stay at the processor
    }

    // still walking there
    if (t.ticks > 500 || (!travel.isTraveling(bot) && !travel.begin(bot, { x: t.target.x, y: t.target.y }))) {
        bot._processTrip = null; // unroutable / stuck -> give up, try again later
        bot._procTripCd = 200;
        return false;
    }
    travel.step(bot);
    return true;
}

// per-tick: an idle bot turns some raw materials into a production skill. never interrupts combat/travel/quest.
// openable containers: a held casket or oyster opens via onInventoryCommand (caskets yield gems, oysters pearls).
const OPENABLE_CONTAINERS = new Set([549, 793]);
function openContainer(bot) {
    for (const it of items(bot)) { if (OPENABLE_CONTAINERS.has(it.id)) { return call(bot, 'onInventoryCommand', it); } }
    return false;
}

function onTick(bot) {
    if (bot.opponent || bot.locked || bot._quest || bot._chain ||
        bot._foodRun || bot._bankRun || bot._runeRun || bot._ammoRun ||
        bot._gearRun || bot._shopTrip || bot._needTrip || bot._relocateSite ||
        bot._spawnRun || bot._trade || (bot.interfaceOpen && bot.interfaceOpen.trade) ||
        bot._chatGoto || bot._follow || bot._holdTicks) {
        return false;
    }
    // already running the multi-floor windmill? keep going.
    if (bot._windmillTrip) { return windmillTick(bot); }
    // already walking to a processor? keep going.
    if (bot._processTrip) { return processTripTick(bot); }
    if (bot._processCd && bot._processCd > 0) { bot._processCd -= 1; return false; }
    // holding grain + a pot -> go make flour at the windmill (grain in hopper upstairs, pot the heap downstairs).
    if (find(bot, GRAIN_ID) && find(bot, POT_ID) && startWindmillTrip(bot)) { return windmillTick(bot); }
    // pop open any held casket/oyster first (free loot).
    if (openContainer(bot)) { bot._processCd = 6 + Math.floor(Math.random() * 8); return true; }
    // finish a held intermediate of the goal skill before the personality-gated pickRecipe.
    if (advanceHeldOne(bot)) {
        bot._processCd = 8 + Math.floor(Math.random() * 10);
        return true;
    }
    // a produce goal skips pickRecipe (which would process its intermediates into off-target items).
    // only non-produce bots do incidental processing.
    let _pr = null;
    try { const g = (_goals || (_goals = require('./goals'))).current(bot); _pr = g && g.produce; } catch (e) {  }
    if (!_pr) {
        const recipe = pickRecipe(bot);
        if (recipe) {
            if (processOne(bot, recipe)) {
                bot._processCd = 8 + Math.floor(Math.random() * 10); // a spaced-out batch action
                return true;
            }
            return false;
        }
    }
    // no processor in reach but carrying a batch to process -> go to one.
    const trip = shouldProcessTrip(bot);
    if (trip) {
        startProcessTrip(bot, trip);
        return processTripTick(bot);
    }
    bot._processCd = 6;
    return false;
}

module.exports = { onTick, pickRecipe, processOne, RECIPES, shouldProcessTrip, startProcessTrip, DRIVEN_ADVANCE_KINDS, enchantableAmulet, combineableItem, canDoEdge };
