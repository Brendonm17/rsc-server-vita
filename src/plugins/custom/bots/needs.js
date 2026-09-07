// before chasing goals, a bot buys what it lacks (tools, food, gear) at shops. survival first, then tools.
// if it can't afford a need it says 'earn', and the career raises the money first.

const travel = require('./travel');
const economy = require('./economy');
const personality = require('./personality');
const goals = require('./goals');
const mapData = require('./map-data'); // shop/facility locators

const COINS = 10;
const BREAD = 138;

// the tool each skill requires
const TOOL_FOR_SKILL = { woodcutting: 87, mining: 156, fishing: 376, firemaking: 166, smithing: 168, crafting: 167, fletching: 13 };
// tools that double as a wieldable, bought equipped
const TOOL_EQUIP = new Set([87]);
// rough shop price of each tool for affordability planning; the real price is charged at purchase
const TOOL_PRICE_HINT = { 87: 20, 156: 25, 168: 15, 166: 15, 376: 20, 167: 15, 13: 15 };
const BREAD_PRICE_HINT = 8;

const IDENT_HERBS = new Set([444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 934]);

// combat consumables/weapons (mage + ranger), bought never handed out
const AIR_RUNE = 33, MIND_RUNE = 35, FIRE_RUNE = 31;
const STAFF_OF_AIR = 101, SHORTBOW = 189, LONGBOW = 188;
const RUNE_PRICE_HINT = 60, BOW_PRICE_HINT = 50, ARROW_PRICE_HINT = 60;
// arrow tiers best-first by ranged level; the shop is derived from the arrow id
const ARROW_TIERS = [
    { id: 646, lvl: 50 }, { id: 644, lvl: 40 }, { id: 642, lvl: 30 },
    { id: 640, lvl: 20 }, { id: 638, lvl: 10 }, { id: 11, lvl: 1 }
]; // rune / adamant / mithril / steel / iron / bronze
const ARROW_IDS = ARROW_TIERS.map((t) => t.id);
function bestArrowTier(rlvl) { for (const t of ARROW_TIERS) if (rlvl >= t.lvl) return t; return ARROW_TIERS[ARROW_TIERS.length - 1]; }
// cheapest/most-fundamental first: axe, pickaxe, then the cheap general-store bits
const TOOL_PRIORITY = [87, 156, 168, 166, 376, 167, 13];

function has(bot, id, n) { return !!(bot.inventory && bot.inventory.has && bot.inventory.has(id, n || 1)); }
function coins(bot) { try { return economy.coins(bot); } catch (e) { return 0; } }
function carried(bot, id) { let n = 0; if (bot.inventory && bot.inventory.items) for (const it of bot.inventory.items) if (it.id === id) n += it.amount || 1; return n; }

// a wealthy bot stocks a stacking consumable (arrows/runes) deep so it shops rarely;
// a poor bot buys the modest base. stacking items only.
function bulkQty(bot, base) {
    const c = coins(bot);
    const mult = c >= 6000 ? 5 : c >= 2000 ? 3 : c >= 700 ? 2 : 1;
    return base * mult;
}
function isFighter(bot) { try { return personality.of(bot).aggression >= 0.5; } catch (e) { return false; } }

// which skills the bot wants now -> which tools it needs. its skill goal leads, else temperament decides.
function wantedSkills(bot) {
    const set = new Set();
    try {
        const g = goals.current(bot);
        if (g && g.type === 'skill' && g.skill) {
            set.add(g.skill);
            const input = { smithing: 'mining', cooking: 'fishing', fletching: 'woodcutting', firemaking: 'woodcutting', crafting: 'woodcutting' }[g.skill];
            if (input) set.add(input);
            // leather crafting needs a fire (tanhide), so a crafting bot also kits out for firemaking + woodcutting
            if (g.skill === 'crafting') { set.add('firemaking'); }
        }
    } catch (e) {}
    let p = null; try { p = personality.of(bot); } catch (e) {}
    if (p && p.diligence >= 0.4) { set.add('woodcutting'); set.add('mining'); } // a skiller kits out to gather
    if (p && p.diligence >= 0.6) { set.add('crafting'); } // a keen skiller also carries a chisel for gems
    if (!set.size) set.add('woodcutting'); // everyone can at least earn by chopping+selling
    return set;
}

// resolve where to buy itemId plus affordability into a need. 'buy' if affordable, 'earn' if too poor,
// null if no shop sells it.
function buyNeed(bot, kind, itemId, opts) {
    opts = opts || {};
    const spot = mapData.buySpot(bot, itemId);
    if (!spot) { return null; } // nothing sells it -> not acquirable by shopping
    if (coins(bot) >= (opts.priceHint || 30)) {
        const need = { kind, itemId, model: spot.model, x: spot.x, y: spot.y, qty: opts.qty || 1, equip: !!opts.equip, plan: 'buy' };
        if (opts.extra) { need.extra = opts.extra; }
        return need;
    }
    return { kind, itemId, plan: 'earn' };
}

// the single most important thing to acquire now, or null. plan = 'buy' (affordable) | 'earn' (needs coins first).
function assess(bot) {
    if (!bot || !bot.inventory) return null;

    // 1) survival: a fighter carries a little food before combat
    if (isFighter(bot) && carried(bot, BREAD) < 3) {
        const need = buyNeed(bot, 'food', BREAD, { qty: 8, priceHint: BREAD_PRICE_HINT });
        if (need) { return need; }
    }

    // 2) tools: the kit for what it wants, most-fundamental first; earn first if it can't afford
    const want = wantedSkills(bot);
    const wantTools = new Set();
    for (const sk of want) if (TOOL_FOR_SKILL[sk]) wantTools.add(TOOL_FOR_SKILL[sk]);
    for (const id of TOOL_PRIORITY) {
        if (!wantTools.has(id) || has(bot, id)) continue;
        const need = buyNeed(bot, 'tool', id, { priceHint: TOOL_PRICE_HINT[id] || 30, equip: TOOL_EQUIP.has(id) });
        if (need) { return need; }
    }

    // 3) combat consumables/weapons: a mage/ranger buys its runes/arrows and staff/bow
    const foc = (bot.cache && bot.cache.bot && bot.cache.bot.focus) || 'auto';
    if (foc === 'magic') {
        // Wind Strike needs 1 mind + 1 air (air is free with a Staff of Air)
        const canCast = has(bot, MIND_RUNE) && (has(bot, STAFF_OF_AIR) || has(bot, AIR_RUNE));
        if (!canCast) {
            const need = buyNeed(bot, 'runes', MIND_RUNE, { priceHint: RUNE_PRICE_HINT, qty: bulkQty(bot, 40), extra: [[AIR_RUNE, bulkQty(bot, 40)], [FIRE_RUNE, bulkQty(bot, 20)]] });
            if (need) { return need; } // nearest rune shop, derived
        }
        // a Staff of Air is a luxury splurge, only when flush
        if (!has(bot, STAFF_OF_AIR)) {
            const need = buyNeed(bot, 'staff', STAFF_OF_AIR, { priceHint: 1800, equip: true });
            if (need && need.plan === 'buy') { return need; }
        }
    } else if (foc === 'ranged') {
        if (!has(bot, SHORTBOW) && !has(bot, LONGBOW)) {
            const need = buyNeed(bot, 'bow', SHORTBOW, { priceHint: BOW_PRICE_HINT, equip: true });
            if (need) { return need; }
        }
        // arrows: restock when low on all tiers, buying the best tier the ranged level warrants
        const totalArrows = ARROW_IDS.reduce((a, id) => a + carried(bot, id), 0);
        if (totalArrows < 30) {
            const rlvl = (bot.skills && bot.skills.ranged) ? (bot.skills.ranged.current != null ? bot.skills.ranged.current : bot.skills.ranged.base) : 1;
            const tier = bestArrowTier(rlvl);
            const need = buyNeed(bot, 'arrows', tier.id, { priceHint: ARROW_PRICE_HINT, qty: bulkQty(bot, 100) });
            if (need) { return need; }
        }
    }

    // 4) materials/consumables for a production skill it's pursuing
    const mat = materialNeed(bot);
    if (mat) { return mat; }

    // 5) bait: a fisher restocks bait/feathers so the rod methods keep working
    const bn = baitNeed(bot);
    if (bn) { return bn; }

    // 6) tool upgrade: a better tool for a growing gather skill, surplus-gated
    const up = toolUpgradeNeed(bot);
    if (up) { return up; }

    return null; // wants nothing -> free to pursue goals
}

// as a gather skill levels up, a bot buys a better tool (level- and surplus-gated).
// tool tiers (id + level-to-use + price gate); the shop is derived from the item.
const TOOL_UPGRADES = {
    woodcutting: { tiers: [{ id: 88, lvl: 1, price: 200 }, { id: 12, lvl: 1, price: 60 }, { id: 87, lvl: 1, price: 20 }] }, // steel/iron/bronze axe (higher hatchets are drop-only)
    mining: { tiers: [{ id: 1262, lvl: 41, price: 3200 }, { id: 1261, lvl: 31, price: 900 }, { id: 1260, lvl: 21, price: 300 }, { id: 1259, lvl: 6, price: 100 }, { id: 1258, lvl: 1, price: 40 }, { id: 156, lvl: 1, price: 25 }] }, // pickaxes bronze..rune
    // fishing = parallel method tools, not a linear upgrade; a fisher collects the whole kit over time,
    // buying the best-value tool it can use and doesn't own yet.
    fishing: { method: true, tiers: [
        { id: 379, lvl: 35, price: 40 }, // harpoon -> tuna/swordfish/shark
        { id: 375, lvl: 40, price: 60 }, // lobster pot -> lobster (no shop stocks it today -> auto-skipped)
        { id: 378, lvl: 20, price: 40 }, // fly fishing rod (+ feathers) -> trout/salmon
        { id: 548, lvl: 16, price: 40 }, // big net -> mackerel/cod/bass + caskets/oysters
        { id: 377, lvl: 5, price: 20 }   // fishing rod (+ bait) -> sardine/herring/pike
    ] }
};
function toolUpgradeNeed(bot) {
    if (bot._toolUpCd && bot._toolUpCd > 0) { bot._toolUpCd -= 1; return null; }
    if (coins(bot) < 400) { return null; } // surplus only
    // a tool upgrade is for a keen skiller who gathers, never a fighter
    let p = null; try { p = personality.of(bot); } catch (e) {}
    if (!p || p.diligence < 0.5 || p.aggression >= 0.5) { return null; }
    // a rare splurge, so it never derails a training/gathering session
    if (Math.random() > 0.04) { bot._toolUpCd = 150; return null; }
    // discretionary: cash out any loot (bank/sell/alch) first
    try { if (economy.lootValue(bot) >= 60 || (economy.canAlch(bot) && economy.hasAlchableLoot(bot))) { return null; } } catch (e) {}
    const want = wantedSkills(bot);
    for (const skill of ['woodcutting', 'mining', 'fishing']) {
        if (!want.has(skill)) { continue; }
        const u = TOOL_UPGRADES[skill];
        const s = bot.skills && bot.skills[skill];
        const lvl = s ? (s.current != null ? s.current : s.base) : 1;
        let candidates;
        if (u.method) {
            candidates = u.tiers.filter((t) => lvl >= t.lvl && !has(bot, t.id)); // any method tool it can use and lacks
        } else {
            let ownedIdx = u.tiers.length;
            for (let i = 0; i < u.tiers.length; i++) { if (has(bot, u.tiers[i].id)) { ownedIdx = i; break; } }
            candidates = u.tiers.slice(0, ownedIdx).filter((t) => lvl >= t.lvl); // a strictly better tier than owned
        }
        for (const t of candidates) {
            if (coins(bot) < t.price) { continue; }
            const shop = mapData.nearestShopSelling(bot, t.id); // nearest shop that stocks it
            if (!shop) { continue; } // no reachable shop sells it (drop-only) -> skip
            bot._toolUpCd = 400 + Math.floor(Math.random() * 400);
            return { kind: 'toolUpgrade', itemId: t.id, model: shop.model, x: shop.x, y: shop.y, qty: 1, plan: 'buy' };
        }
    }
    return null;
}
// a fisher low on bait restocks from the nearest shop (rod -> bait 380, fly rod -> feathers 381)
function countId(bot, id) { let n = 0; for (const it of (bot.inventory && bot.inventory.items) || []) { if (it.id === id) { n += it.amount || 1; } } return n; }
const BAIT_RODS = [{ rod: 377, bait: 380 }, { rod: 378, bait: 381 }]; // fishing rod->bait, fly rod->feathers
function baitNeed(bot) {
    if (!wantedSkills(bot).has('fishing') || coins(bot) < 60) { return null; }
    for (const r of BAIT_RODS) {
        if (has(bot, r.rod) && countId(bot, r.bait) < 20) {
            const shop = mapData.nearestShopSelling(bot, r.bait);
            if (shop) { return { kind: 'consumable', itemId: r.bait, model: shop.model, x: shop.x, y: shop.y, qty: 50, plan: 'buy' }; }
        }
    }
    return null;
}

function carriedAny(bot, set) { if (bot.inventory && bot.inventory.items) for (const it of bot.inventory.items) if (set.has(it.id)) return true; return false; }
function goalSkill(bot) { try { const g = goals.current(bot); return g && g.type === 'skill' ? g.skill : null; } catch (e) { return null; } }

// a produce chain's shop-buyable co-inputs (bucket of water, vial, feathers) are bought so the
// chain isn't blocked. only ingredients here, never the product; how many + a price hint, where is derived.
const CO_INPUT = {
    50: { qty: 8, price: 3 },    // bucket of water (pottery: clay + water -> soft clay)
    342: { qty: 8, price: 4 },   // bowl of water (multi-ingredient cooking: stews etc.)
    348: { qty: 8, price: 2 },   // potato (stews / made food)
    464: { qty: 15, price: 3 },  // vial of water (herblaw unfinished potions)
    270: { qty: 15, price: 4 },  // eye of newt (herblaw)
    381: { qty: 50, price: 2 }   // feather (fletched arrows)
};
// the first shop-buyable co-input the current produce goal is short of, or null
function produceCoInputNeed(bot) {
    const g = bot.cache && bot.cache.bot && bot.cache.bot.goal;
    if (!g || !g.produce || !g.produce._keep) { return null; }
    for (const id of g.produce._keep) {
        const spec = CO_INPUT[id];
        if (!spec || carried(bot, id) >= 2) { continue; } // not a known co-input, or already stocked
        const need = buyNeed(bot, 'material', id, { qty: spec.qty, priceHint: spec.price });
        if (need) { return need; }
    }
    return null;
}

// buy the raw materials a production skill needs; herblaw when holding herbs, fletching/crafting when it's the goal
function materialNeed(bot) {
    // discretionary: cash out any loot first, so a full bag isn't dragged to a supply shop
    try { if (economy.lootValue(bot) >= 60 || (economy.canAlch(bot) && economy.hasAlchableLoot(bot))) { return null; } } catch (e) {}
    // a produce goal's shop-buyable co-inputs, so any chain is auto-supplied
    const coIn = produceCoInputNeed(bot);
    if (coIn) { return coIn; }
    const sk = goalSkill(bot);
    // herblaw: holding herbs but out of vials -> buy vials; brewing the newt line but out of newt -> buy newt
    if (carriedAny(bot, IDENT_HERBS) && carried(bot, 464) < 3) {
        const need = buyNeed(bot, 'consumable', 464, { qty: 15, priceHint: 45 });
        if (need) { return need; }
    }
    if (sk === 'herblaw' && (carried(bot, 454) > 0 || carried(bot, 459) > 0) && carried(bot, 270) < 3) {
        const need = buyNeed(bot, 'consumable', 270, { qty: 15, priceHint: 60 });
        if (need) { return need; }
    }
    // fletching: low on feathers -> buy; out of arrowheads -> buy bronze
    if (sk === 'fletching') {
        if (carried(bot, 381) < 10) {
            const need = buyNeed(bot, 'material', 381, { qty: 50, priceHint: 120 });
            if (need) { return need; }
        }
        if (carried(bot, 637) > 0 && carried(bot, 669) < 10) {
            const need = buyNeed(bot, 'material', 669, { qty: 20, priceHint: 60 });
            if (need) { return need; }
        }
    }
    // crafting: the leather chain needs a knife, hammer, needle + thread, and a ring mould
    if (sk === 'crafting') {
        for (const spec of [[13, 20], [168, 20], [39, 3], [43, 3], [293, 6]]) {
            if (!has(bot, spec[0])) {
                const need = buyNeed(bot, 'material', spec[0], { qty: 1, priceHint: spec[1] });
                if (need) { return need; }
            }
        }
    }
    return null;
}

// acquisition trip: walk to the shop, buy the item, walk back to work
function startAcquire(bot, need) {
    bot._needTrip = { need, target: { x: need.x, y: need.y }, returnTo: { x: bot.x, y: bot.y }, phase: 'go', ticks: 0 };
    travel.begin(bot, { x: need.x, y: need.y });
}
function needTripTick(bot) {
    const t = bot._needTrip;
    if (!t) return 'done';
    t.ticks += 1;
    if (t.ticks > 600) { bot._needTrip = null; return 'done'; } // unroutable / stuck -> try again later

    if (t.phase === 'go') {
        if (Math.abs(bot.x - t.target.x) + Math.abs(bot.y - t.target.y) <= 2) {
            const n = t.need;
            const bought = economy.buyItem(bot, n.model, n.itemId, n.qty || 1, !!n.equip); // pay the shop like anyone
            // if the buy got nothing (bad price hint or out of stock), back off a while instead of looping
            if (!bought) { bot._needCd = Math.max(bot._needCd || 0, 500); }
            // some needs stock several items in one trip (mind + air + fire runes)
            if (Array.isArray(n.extra)) {
                for (const pair of n.extra) { try { economy.buyItem(bot, n.model, pair[0], pair[1] || 1, false); } catch (e) {} }
            }
            t.phase = 'back';
            bot._travel = null; if (bot.walkQueue) bot.walkQueue.length = 0;
            travel.begin(bot, t.returnTo);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, t.target)) { bot._needTrip = null; return 'done'; }
        travel.step(bot);
        return 'running';
    }
    // walking back to where it was
    if (Math.abs(bot.x - t.returnTo.x) + Math.abs(bot.y - t.returnTo.y) <= 3 ||
        (!travel.isTraveling(bot) && !travel.begin(bot, t.returnTo))) {
        bot._needTrip = null; return 'done';
    }
    travel.step(bot);
    return 'running';
}

module.exports = { assess, startAcquire, needTripTick, wantedSkills, toolUpgradeNeed, baitNeed, TOOL_FOR_SKILL };
