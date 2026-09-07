// travel-driven money/logistics on the waypoint graph: a bot walks to the nearest
// bank, deposits, and walks back to work. stateful per bot (bot._bankRun).

const travel = require('./travel');
const mapData = require('./map-data'); // shop/facility locators
const personality = require('./personality');
const itemKnowledge = require('./item-knowledge');
const Item = require('../../../model/item');
const itemDefs = require('@2003scape/rsc-data/config/items');
const shopsData = require('@2003scape/rsc-data/shops.json');
const spellHandler = require('../../../packet-handlers/spell');

// alchemy: convert loot to gold in place, no travel
const FIRE_RUNE = 31;
const NATURE_RUNE = 40;
const COINS_ID = 10;
const LOW_ALCHEMY = 10; // spell index: magic 21, 3 fire + 1 nature, 40%
const HIGH_ALCHEMY = 28; // spell index: magic 55, 5 fire + 1 nature, 60%

// banks reachable in the graph, including Kandarin; nearestBank picks by distance.
const BANK_FACILITIES = ['draynor_bank', 'alkharid_bank', 'varrock_west_bank', 'catherby_bank', 'seers_bank', 'ardougne_north_bank'];

// hatchet tiers, best-first, with the woodcutting level to use each.
const AXE_TIERS = [
    { id: 405, level: 41 }, // rune
    { id: 204, level: 31 }, // adamantite
    { id: 203, level: 21 }, // mithril
    { id: 428, level: 11 }, // black
    { id: 88, level: 6 },  // steel
    { id: 12, level: 1 },  // iron
    { id: 87, level: 1 }   // bronze
];

// items a bot keeps rather than banks/sells: tools, food, coins.
const KEEP_IDS = new Set([
    87, 12, 88, 203, 204, 405, 428,           // hatchets (bronze..rune)
    156, 1258, 1259, 1260, 1261, 1262,        // pickaxes (bronze..rune)
    376, 377, 378, 379, 375, 548, 589, 380, 381, // fishing tools + bait/feathers
    166, 168, 13, 167, 39, 43, 468,           // tinderbox, hammer, knife, chisel, needle, thread, pestle
    101, 102, 103, 197, 189, 188,             // staves + bows
    138, // bread (food)
    10 // coins
]);

// production inputs the bot keeps while training the skill that consumes them,
// derived from item-knowledge and gated on the current goal. finished products still sell.
function trainedSkills(bot) {
    const g = bot.cache && bot.cache.bot && bot.cache.bot.goal;
    if (!g || g.type !== 'skill') {
        return null;
    }
    const out = [g.skill];
    if (g.forSkill && g.forSkill !== g.skill) {
        out.push(g.forSkill);
    }
    return out;
}
// returns a predicate (id)->bool, or null when nothing to protect
function processingKeeps(bot) {
    const skills = trainedSkills(bot);
    // a produce goal carries a _keep set: every id on its chain plus the finished target.
    // covers the target and cross-skill inputs that isFeedstockFor misses.
    const g = bot.cache && bot.cache.bot && bot.cache.bot.goal;
    let keep = g && g.produce ? g.produce._keep : null;
    if (keep && !(keep instanceof Set)) {
        try { keep = require('./produce').hydrate(g.produce)._keep; } catch (e) { keep = null; }
    }
    if (!skills && !keep) {
        return null;
    }
    return (id) => {
        if (keep && keep.has(Number(id))) { return true; }
        if (skills) {
            for (const s of skills) {
                if (itemKnowledge.isFeedstockFor(id, s)) { return true; }
            }
        }
        return false;
    };
}

// store-for-later vs sell for non-feedstock, non-tool loot: unknown -> bank;
// material feeding the dream production skill -> bank; everything else -> sell.
const PRODUCTION_SKILLS_SET = new Set(['smithing', 'crafting', 'cooking', 'fletching', 'herblaw', 'firemaking']);
function plannedProductionSkill(bot) {
    const d = bot.cache && bot.cache.bot && bot.cache.bot.dream;
    return d && d.skill && PRODUCTION_SKILLS_SET.has(d.skill) ? d.skill : null; // a production ambition
}
function worthBanking(bot, id) {
    const r = itemKnowledge.roleOf(id);
    if (!r.known) {
        return true; // unknown -> keep it in the bank
    }
    if (!r.tradeable) {
        return false; // untradeable is handled elsewhere
    }
    const plan = plannedProductionSkill(bot);
    return !!(plan && itemKnowledge.isFeedstockFor(id, plan)); // hoard this material toward that ambition
}

function nearestBank(bot) {
    let best = null;
    let bestD = Infinity;
    for (const name of BANK_FACILITIES) {
        const f = travel.FACILITIES[name];
        if (!f) {
            continue;
        }
        const d = Math.abs(bot.x - f.target.x) + Math.abs(bot.y - f.target.y);
        if (d < bestD) {
            bestD = d;
            best = name;
        }
    }
    return best;
}

// inventory indices currently worn, so a bank/shop/alch action skips equipped gear.
function wornIndices(bot) {
    const s = new Set();
    const slots = (bot.inventory && bot.inventory.equipmentSlots) || {};
    for (const k of Object.keys(slots)) {
        if (typeof slots[k] === 'number' && slots[k] >= 0) {
            s.add(slots[k]);
        }
    }
    return s;
}

function depositableSlots(bot) {
    const keep = processingKeeps(bot);
    const worn = wornIndices(bot);
    return bot.inventory.items.filter((it, i) => !worn.has(i) && !KEEP_IDS.has(it.id) && !(keep && keep(it.id)));
}

// full bag with something worth banking -> time for a bank run
function shouldBank(bot) {
    return bot.inventory.isFull() && depositableSlots(bot).length > 0;
}

function startBankRun(bot) {
    bot._bankRun = {
        phase: 'toBank',
        returnTo: { x: bot.x, y: bot.y },
        bank: nearestBank(bot)
    };
}

function bankTarget(bot) {
    const f = travel.FACILITIES[bot._bankRun.bank];
    return f ? f.target : null;
}

function near(bot, coord, r = 3) {
    return Math.abs(bot.x - coord.x) + Math.abs(bot.y - coord.y) <= r;
}

// how much a banked item is worth keeping: tools/food/gear/feedstock rank high,
// a plain item only its price.
function bankWorth(bot, id) {
    if (KEEP_IDS.has(id) || itemKnowledge.isTool(id)) {
        return 100000;
    }
    const r = itemKnowledge.roleOf(id);
    if (r.food || r.drink) { return 100000; }
    if (r.wieldable) { return 5000 + r.price; }         // gear it might wield later
    const skills = trainedSkills(bot);
    if (skills) { for (const s of skills) { if (itemKnowledge.isFeedstockFor(id, s)) { return 4000 + r.price; } } }
    const plan = plannedProductionSkill(bot);
    if (plan && itemKnowledge.isFeedstockFor(id, plan)) { return 3000 + r.price; }
    if (r.classes.includes('finished')) { return 1000 + r.price; } // a product it could sell
    return r.price;                                     // plain item / junk, worth only its coins
}

// declutter a near-full bank: withdraw the least-useful items (never tools/gear/feedstock)
// then sell them. banks cap at 192 slots; runs after the deposit, only when near-full.
function declutterBank(bot) {
    const bank = bot.bank;
    if (!bank || !Array.isArray(bank.items)) { return 0; }
    const max = bank.maxItems || 192;
    if (bank.items.length < max - 4) { return 0; } // plenty of room
    const cand = bank.items
        .map((it) => ({ id: it.id, amount: it.amount, w: bankWorth(bot, it.id) }))
        .filter((x) => x.w < 1000)                 // only plain-value items
        .sort((a, b) => a.w - b.w);                // cheapest / least useful first
    let pulled = 0;
    for (const x of cand) {
        if (bot.inventory.isFull() || pulled >= 10) { break; }
        // a non-stackable comes out one at a time; a bulk withdraw corrupts the amount
        const stackable = !!(itemDefs[x.id] && itemDefs[x.id].stackable);
        try {
            if (stackable) {
                bank.withdraw(x.id, x.amount);
            } else {
                const n = Math.min(x.amount, bot.inventory.capacity ? bot.inventory.capacity - bot.inventory.items.length : 4);
                for (let k = 0; k < n && !bot.inventory.isFull(); k += 1) { bank.withdraw(x.id, 1); }
            }
            pulled += 1;
        } catch (e) {}
    }
    if (pulled && bot.cache && bot.cache.bot) { bot.cache.bot.money = 'sell'; } // liquidate what was pulled
    return pulled;
}

function doDeposit(bot) {
    try {
        bot.bank.open();
        const snapshot = depositableSlots(bot).map((it) => ({
            id: it.id,
            amount: it.amount
        }));
        for (const it of snapshot) {
            try {
                bot.bank.deposit(it.id, it.amount);
            } catch (e) {
                // slot changed, skip
            }
        }
        // pull the least-useful items back out to sell when the bank is near-full
        try {
            // sold goods and coins waiting at the auction house are claimed here
            try { require('./auction').collectAtBank(bot); } catch (e) {}
            declutterBank(bot);
        } catch (e) {
            // decluttering is best-effort
        }
    } finally {
        if (bot.interfaceOpen.bank) {
            bot.bank.close();
        } else if (bot.locked) {
            bot.unlock();
        }
    }
}

// advance a bank run one tick; returns 'running' | 'done'
function bankRunTick(bot) {
    const r = bot._bankRun;
    if (!r || !r.bank) {
        return 'done';
    }
    if ((r.ticks = (r.ticks || 0) + 1) > 800) { return 'done'; } // watchdog: never soft-lock on a stuck travel leg

    const target = bankTarget(bot);
    if (!target) {
        return 'done';
    }

    if (r.phase === 'toBank') {
        if (near(bot, target)) {
            doDeposit(bot);
            r.phase = 'return';
            travel.begin(bot, r.returnTo);
            return 'running';
        }

        if (!travel.isTraveling(bot)) {
            // start the walk; if the bank is unroutable, deposit in place
            if (!travel.begin(bot, r.bank)) {
                doDeposit(bot);
                return 'done';
            }
        }

        travel.step(bot);
        return 'running';
    }

    if (r.phase === 'return') {
        if (near(bot, r.returnTo, 3) || !travel.isTraveling(bot)) {
            return 'done';
        }
        travel.step(bot);
        return 'running';
    }

    return 'done';
}

// ---------------------------------------------------------------------------
// sell loot for gold and buy gear (axe) upgrades; these work once the bot has
// travelled near the shop.
// ---------------------------------------------------------------------------

function countId(inventory, id) {
    let n = 0;
    for (const it of inventory.items) {
        if (it.id === id) {
            n += it.amount || 1;
        }
    }
    return n;
}

// the price shop.sell() accepts for one of id
function sellPriceOf(shop, id) {
    const shopItem = shop.items.find((i) => i.id === id);
    if (shopItem) {
        return shop.getItemPrice(shopItem, true);
    }
    const it = new Item({ id });
    it.amount = 0;
    return shop.getItemPrice(it, true);
}

// sell every sellable item to a shop; returns coins made
function sellLoot(bot, shopName) {
    bot.openShop(shopName);
    const shop = bot.shop;
    if (!shop) {
        return 0;
    }

    const coinsBefore = countId(bot.inventory, 10);
    const keep = processingKeeps(bot); // don't sell the feedstock of the skill it's currently training

    const ids = [
        ...new Set(
            bot.inventory.items
                .filter(
                    (it) =>
                        !KEEP_IDS.has(it.id) &&
                        !(keep && keep(it.id)) &&
                        !worthBanking(bot, it.id) &&
                        !itemKnowledge.isFood(it.id) // food is a survival asset; bank it, never sell
                )
                .map((it) => it.id)
        )
    ];

    for (const id of ids) {
        let guard = 0;
        while (countId(bot.inventory, id) > 0 && guard++ < 60) {
            const before = countId(bot.inventory, id);
            shop.sell(bot, id, sellPriceOf(shop, id));
            if (countId(bot.inventory, id) >= before) {
                break; // shop refused (full / unsellable), stop on this id
            }
        }
    }

    const made = countId(bot.inventory, 10) - coinsBefore;
    bot.exitShop();
    return made;
}

function bestAxeOwned(bot) {
    for (const tier of AXE_TIERS) {
        if (bot.inventory.has(tier.id)) {
            return tier;
        }
    }
    return null;
}

// buy the best axe the bot can afford and use that beats what it carries, then wield it.
// returns the bought id or -1.
function buyBestAxe(bot) {
    bot.openShop('bobs-axes');
    const shop = bot.shop;
    if (!shop) {
        return -1;
    }

    const wc = bot.skills.woodcutting.current;
    const owned = bestAxeOwned(bot);
    let bought = -1;

    for (const tier of AXE_TIERS) {
        // best-first: stop at the tier already owned
        if (owned && tier.id === owned.id) {
            break;
        }
        if (wc < tier.level) {
            continue; // can't wield it yet
        }
        const shopItem = shop.items.find((i) => i.id === tier.id);
        if (!shopItem || shopItem.amount <= 0) {
            continue;
        }
        const price = shop.getItemPrice(shopItem, false);
        if (!bot.inventory.has(10, price)) {
            continue; // can't afford
        }

        shop.buy(bot, tier.id, price);
        // wield it only if it's the best weapon owned; a warrior keeps its sword
        try { require('./gear').equipBestOwned(bot); } catch (e) {}
        bought = tier.id;
        break;
    }

    bot.exitShop();
    return bought;
}

// coins the bot has on hand
function coins(bot) { return countId(bot.inventory, COINS_ID); }

// buy up to qty of itemId from shop model while in stock and affordable.
// optionally wield it; returns how many it bought.
function buyItem(bot, model, itemId, qty, equip) {
    qty = qty || 1;
    try { bot.openShop(model); } catch (e) { return 0; }
    const shop = bot.shop;
    if (!shop) { return 0; }
    let bought = 0;
    for (let i = 0; i < qty; i++) {
        const shopItem = shop.items.find((it) => it.id === itemId);
        if (!shopItem || shopItem.amount <= 0) { break; }
        const price = shop.getItemPrice(shopItem, false);
        if (!bot.inventory.has(COINS_ID, price)) { break; }
        shop.buy(bot, itemId, price);
        bought += 1;
    }
    if (equip && bought) {
        const slot = bot.inventory.items.findIndex((it) => it.id === itemId);
        if (slot >= 0) { try { bot.inventory.equip(slot); } catch (e) {} }
    }
    try { bot.exitShop(); } catch (e) {}
    return bought;
}

// the price shop model charges for one itemId now, or Infinity if not stocked.
// opens and closes the shop, so use sparingly.
function shopPriceOf(bot, model, itemId) {
    let price = Infinity;
    try {
        bot.openShop(model);
        const shop = bot.shop;
        if (shop) {
            const shopItem = shop.items.find((it) => it.id === itemId);
            if (shopItem && shopItem.amount > 0) { price = shop.getItemPrice(shopItem, false); }
        }
        bot.exitShop();
    } catch (e) {}
    return price;
}

// greedy/merchant bots sell loot rather than bank it
function prefersShopping(bot) {
    return personality.of(bot).greed >= 0.55;
}

// total shop value of the loot a bot is carrying; a proxy for "worth a trip to cash out?"
function lootValue(bot) {
    const keep = processingKeeps(bot);
    let v = 0;
    for (const it of bot.inventory.items) {
        if (KEEP_IDS.has(it.id) || it.id === COINS_ID) {
            continue;
        }
        if (keep && keep(it.id)) {
            continue; // carried feedstock, not for sale
        }
        if (worthBanking(bot, it.id)) {
            continue; // stored-for-later, banked not sold
        }
        const def = itemDefs[it.id];
        if (!def || !def.price) { // members items have sell value too
            continue;
        }
        v += def.price * (it.amount || 1);
    }
    return v;
}

// decide how to cash out: alch if able with alchable loot; else sell if the loot
// clears a worth-a-trip bar; else bank. returns 'alch' | 'sell' | 'bank'.
function smartMoneyChoice(bot) {
    if (canAlch(bot) && hasAlchableLoot(bot)) {
        return 'alch';
    }
    const greed = personality.of(bot).greed;
    const threshold = 220 - greed * 170; // greedy ~50, thrifty ~220 coins
    return lootValue(bot) >= threshold ? 'sell' : 'bank';
}

const AXE_SHOP = 'bob_axes';

// sell loot at the nearest general store, derived from shops.json;
// falls back to a fixed Lumbridge tile if the data yields nothing.
function nearestGeneralStore(bot) {
    return mapData.nearestGeneralStore(bot) || { model: 'lumbridge-general', x: 136, y: 641 };
}

// a specialty shop buys what it stocks at ~60-70% of base; a general store pays ~40%.
// these pick where to sell for the most, from shops.json.

// what shop model pays for one itemId (0 if it won't buy it)
function estimateSellPrice(model, itemId) {
    const def = shopsData[model];
    if (!def) { return 0; }
    const stocked = (def.items || []).some((i) => (i && (i.id != null ? i.id : i)) === itemId);
    if (!def.general && !stocked) { return 0; }
    const base = (itemDefs[itemId] && itemDefs[itemId].price) || 0;
    let mult = def.buyMultiplier;
    if (mult < 10) { mult = 10; }
    return Math.floor((mult * base) / 100);
}

// the bot's sellable loot as [{id, qty}] (same filter sellLoot uses).
function sellableLoot(bot) {
    const keep = processingKeeps(bot);
    const worn = wornIndices(bot);
    const out = [];
    for (let i = 0; i < bot.inventory.items.length; i += 1) {
        const it = bot.inventory.items[i];
        const id = it.id;
        if (worn.has(i)) { continue; }
        if (KEEP_IDS.has(id) || id === COINS_ID) { continue; }
        if (keep && keep(id)) { continue; }
        if (worthBanking(bot, id)) { continue; }
        if (itemKnowledge.isFood(id)) { continue; }
        const r = itemKnowledge.roleOf(id);
        if (!r.known || !r.tradeable) { continue; }
        out.push({ id, qty: countId(bot.inventory, id) });
    }
    return out;
}

// the located shop that pays the most for this loot. the general store is the baseline;
// a specialty shop wins only when it beats that by a worthwhile margin.
function bestSellShop(bot) {
    const general = nearestGeneralStore(bot);
    const loot = sellableLoot(bot);
    if (!loot.length) { return general; }
    let genTotal = 0;
    for (const l of loot) { genTotal += estimateSellPrice(general.model, l.id) * l.qty; }

    // candidate specialty shops: located, non-general, stocking at least one loot item.
    const seen = new Set();
    let best = general, bestTotal = genTotal;
    for (const l of loot) {
        for (const m of mapData.shopsSelling(l.id)) {
            if (seen.has(m)) { continue; }
            seen.add(m);
            const def = shopsData[m];
            if (!def || def.general) { continue; }
            const loc = mapData.shopLocation(m);
            if (!loc || loc.x == null) { continue; }
            if (Math.abs(bot.x - loc.x) + Math.abs(bot.y - loc.y) > 200) { continue; } // not worth a long trek
            let total = 0, remainder = 0;
            for (const k of loot) {
                const sp = estimateSellPrice(m, k.id) * k.qty;
                total += sp;
                if (sp <= 0) { remainder += estimateSellPrice(general.model, k.id) * k.qty; } // value the specialty won't buy
            }
            // route to the specialty only if it beats the general store and leaves little unsold
            if (total > genTotal * 1.25 && total > bestTotal && remainder <= genTotal * 0.2) { bestTotal = total; best = { model: m, x: loc.x, y: loc.y }; }
        }
    }
    return best;
}

function startShopTrip(bot) {
    bot._shopTrip = {
        phase: 'toStore',
        returnTo: { x: bot.x, y: bot.y },
        store: bestSellShop(bot) // the best-paying reachable buyer for this loot
    };
}

// advance a shopping trip: to the store -> sell -> to Bob's -> buy an axe -> back.
// returns 'running' | 'done'.
function shopTripTick(bot) {
    const r = bot._shopTrip;
    if (!r) {
        return 'done';
    }
    if ((r.ticks = (r.ticks || 0) + 1) > 800) { return 'done'; } // watchdog: never soft-lock on a stuck travel leg

    const store = r.store || nearestGeneralStore(bot);
    const axes = travel.FACILITIES[AXE_SHOP].target;

    if (r.phase === 'toStore') {
        if (near(bot, store)) {
            sellLoot(bot, store.model);
            r.phase = 'toAxes';
            travel.begin(bot, { x: axes.x, y: axes.y });
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, { x: store.x, y: store.y })) {
            sellLoot(bot, store.model); // unroutable -> sell in place
            r.phase = 'toAxes';
            return 'running';
        }
        travel.step(bot);
        return 'running';
    }

    if (r.phase === 'toAxes') {
        if (near(bot, axes)) {
            buyBestAxe(bot);
            r.phase = 'return';
            travel.begin(bot, r.returnTo);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, AXE_SHOP)) {
            buyBestAxe(bot); // unroutable -> buy in place
            r.phase = 'return';
            return 'running';
        }
        travel.step(bot);
        return 'running';
    }

    // return
    if (near(bot, r.returnTo, 3) || !travel.isTraveling(bot)) {
        return 'done';
    }
    travel.step(bot);
    return 'running';
}

// ---------------------------------------------------------------------------
// a bot with surplus coins travels to Varrock's weapon/armour shops, buys the best
// upgrade it can afford and use, then wields it. focus/style-aware scoring.
const gear = require('./gear');
const SWORD_SHOP = 'varrock_swords'; // facility (waypoint)
const SWORD_SHOP_MODEL = 'varrock-swords'; // openShop() name
const ARMOUR_SHOP = 'horviks_armour';
const ARMOUR_SHOP_MODEL = 'horviks-armour';
const HELMET_SHOP = 'peksas_helmet';
const HELMET_SHOP_MODEL = 'peksas-helmet';

function equippedItem(bot, slot) {
    const idx = bot.inventory.equipmentSlots[slot];
    return typeof idx === 'number' && idx >= 0 ? bot.inventory.items[idx] : null;
}

// buy the best affordable upgrade of kind ('weapon'|'armour'|'head') the shop
// stocks and the bot can use, then equip it. returns the bought id or -1.
function buyBestGearAt(bot, shopModelName, kind) {
    const isWeapon = kind === 'weapon';
    if (isWeapon && gear.weaponIsSpecial(bot)) {
        return -1; // a mage/archer never buys a melee weapon
    }
    const slot = isWeapon ? 'right-hand' : kind === 'head' ? 'head' : 'body';
    bot.openShop(shopModelName);
    const shop = bot.shop;
    if (!shop) {
        return -1;
    }

    const cur = equippedItem(bot, slot);
    const scoreOf = (id) =>
        isWeapon ? gear.weaponScoreFor(bot, id) : gear.armorScoreFor(bot, id);

    let bestId = -1;
    let bestPrice = 0;
    let bestScore = cur ? scoreOf(cur.id) : -1; // only buy a real upgrade

    for (const shopItem of shop.items) {
        const id = shopItem.id;
        const def = itemDefs[id];
        if (!shopItem.amount || shopItem.amount <= 0 || !def || !def.equip) {
            continue;
        }
        const fits = def.equip.includes(slot); // members gear is buyable/wieldable too
        if (!fits || !gear.meetsReq(bot, id)) {
            continue;
        }
        const s = scoreOf(id);
        if (s <= bestScore) {
            continue;
        }
        const price = shop.getItemPrice(shopItem, false);
        if (!bot.inventory.has(COINS_ID, price)) {
            continue;
        }
        bestId = id;
        bestPrice = price;
        bestScore = s;
    }

    if (bestId >= 0) {
        shop.buy(bot, bestId, bestPrice);
    }
    bot.exitShop();
    if (bestId >= 0) {
        gear.equipBestOwned(bot);
    }
    return bestId;
}

// worth a gear-shopping trip? surplus coins and upgradeable gear; low-rate.
function shouldBuyGear(bot) {
    if (bot._gearRun || bot._shopTrip || bot._bankRun) {
        return false;
    }
    if (countId(bot.inventory, COINS_ID) < 400) {
        return false;
    }
    // does it have combat gear worth upgrading? (a mage skips the weapon check)
    const weapon = equippedItem(bot, 'right-hand');
    const body = equippedItem(bot, 'body');
    const weakWeapon =
        !gear.weaponIsSpecial(bot) &&
        (!weapon || gear.weaponScoreFor(bot, weapon.id) < 60);
    const weakBody = !body || gear.armorScoreFor(bot, body.id) < 30;
    if (!weakWeapon && !weakBody) {
        return false;
    }
    const p = personality.of(bot);
    return Math.random() < 0.015 + p.aggression * 0.02; // ~1.5-3.5%/eligible tick
}

function startGearRun(bot) {
    bot._gearRun = { phase: 'toSwords', returnTo: { x: bot.x, y: bot.y } };
}

// travel: sword shop -> buy weapon; Horvik's -> buy body armour; then home.
function gearRunTick(bot) {
    const r = bot._gearRun;
    if (!r) {
        return 'done';
    }
    if ((r.ticks = (r.ticks || 0) + 1) > 800) { return 'done'; } // watchdog: never soft-lock on a stuck travel leg
    const swords = travel.FACILITIES[SWORD_SHOP].target;
    const armour = travel.FACILITIES[ARMOUR_SHOP].target;

    if (r.phase === 'toSwords') {
        if (near(bot, swords)) {
            buyBestGearAt(bot, SWORD_SHOP_MODEL, 'weapon');
            r.phase = 'toArmour';
            travel.begin(bot, { x: armour.x, y: armour.y });
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, SWORD_SHOP)) {
            buyBestGearAt(bot, SWORD_SHOP_MODEL, 'weapon');
            r.phase = 'toArmour';
            return 'running';
        }
        travel.step(bot);
        return 'running';
    }

    if (r.phase === 'toArmour') {
        if (near(bot, armour)) {
            buyBestGearAt(bot, ARMOUR_SHOP_MODEL, 'armour');
            r.phase = 'toHelmet';
            travel.begin(bot, travel.FACILITIES[HELMET_SHOP].target);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, ARMOUR_SHOP)) {
            buyBestGearAt(bot, ARMOUR_SHOP_MODEL, 'armour');
            r.phase = 'toHelmet';
            return 'running';
        }
        travel.step(bot);
        return 'running';
    }

    if (r.phase === 'toHelmet') {
        const helm = travel.FACILITIES[HELMET_SHOP].target;
        if (near(bot, helm)) {
            buyBestGearAt(bot, HELMET_SHOP_MODEL, 'head');
            r.phase = 'return';
            travel.begin(bot, r.returnTo);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, HELMET_SHOP)) {
            buyBestGearAt(bot, HELMET_SHOP_MODEL, 'head');
            r.phase = 'return';
            return 'running';
        }
        travel.step(bot);
        return 'running';
    }

    if (near(bot, r.returnTo, 3) || !travel.isTraveling(bot)) {
        return 'done';
    }
    travel.step(bot);
    return 'running';
}

// ---------------------------------------------------------------------------
// combat bots keep a food reserve in the bank and walk to a bank to top up
// when running low.
// ---------------------------------------------------------------------------

const BREAD_ID = 138;
const FOOD_LOW = 3; // top up when carried food drops to this
const FOOD_TARGET = 15; // carry up to this many after a restock

// total food (any edible) carried or banked; isFood is item-knowledge's classifier
function countFoodIn(container) {
    let n = 0;
    for (const it of (container && container.items) || []) { if (itemKnowledge.isFood(it.id)) { n += it.amount || 1; } }
    return n;
}
// the best food in the bank to withdraw (highest price = best heal proxy), or bread as fallback
function bestBankFood(bot) {
    let best = null, bestP = -1;
    for (const it of (bot.bank && bot.bank.items) || []) {
        if (!itemKnowledge.isFood(it.id)) { continue; }
        const price = (itemDefs[it.id] && itemDefs[it.id].price) || 0;
        if (price > bestP) { bestP = price; best = it.id; }
    }
    return best != null ? best : BREAD_ID;
}

function shouldRestockFood(bot) {
    return (
        countFoodIn(bot.inventory) <= FOOD_LOW &&
        bot.bank &&
        countFoodIn(bot.bank) > 0
    );
}

function startFoodRun(bot) {
    bot._foodRun = {
        phase: 'toBank',
        returnTo: { x: bot.x, y: bot.y },
        bank: nearestBank(bot)
    };
}

function doWithdrawFood(bot) {
    try {
        bot.bank.open();
        // food is non-stackable, so pull it one at a time until topped up, out of food, or bag full.
        // withdraw the best banked food each pull.
        let need = FOOD_TARGET - countFoodIn(bot.inventory);
        while (
            need > 0 &&
            countFoodIn(bot.bank) > 0 &&
            !bot.inventory.isFull()
        ) {
            const foodId = bestBankFood(bot);
            if (bot.bank.countId(foodId) <= 0) { break; }
            bot.bank.withdraw(foodId, 1);
            need -= 1;
        }
    } finally {
        if (bot.interfaceOpen.bank) {
            bot.bank.close();
        } else if (bot.locked) {
            bot.unlock();
        }
    }
}

function foodRunTick(bot) {
    const r = bot._foodRun;
    if (!r || !r.bank) {
        return 'done';
    }
    if ((r.ticks = (r.ticks || 0) + 1) > 800) { return 'done'; } // watchdog: never soft-lock on a stuck travel leg
    const f = travel.FACILITIES[r.bank];
    const target = f ? f.target : null;
    if (!target) {
        return 'done';
    }

    if (r.phase === 'toBank') {
        if (near(bot, target)) {
            doWithdrawFood(bot);
            r.phase = 'return';
            travel.begin(bot, r.returnTo);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, r.bank)) {
            doWithdrawFood(bot); // unroutable -> withdraw in place
            return 'done';
        }
        travel.step(bot);
        return 'running';
    }

    if (near(bot, r.returnTo, 3) || !travel.isTraveling(bot)) {
        return 'done';
    }
    travel.step(bot);
    return 'running';
}

// ---------------------------------------------------------------------------
// a mage bot with runes turns loot into gold in place. high alch at magic 55+,
// else low alch. one cast per tick.
// ---------------------------------------------------------------------------

function fireRunesNeeded(bot) {
    return bot.skills.magic.current >= 55 ? 5 : 3;
}

function canAlch(bot) {
    return (
        bot.skills.magic.current >= 21 &&
        countId(bot.inventory, NATURE_RUNE) >= 1 &&
        countId(bot.inventory, FIRE_RUNE) >= fireRunesNeeded(bot)
    );
}

// inventory slot of an item worth alching (not kept, not coins/runes, priced), or -1
function alchableSlot(bot) {
    // same protections as the sell path: nothing worn, needed, or worth banking
    const keep = processingKeeps(bot);
    const worn = wornIndices(bot);
    return bot.inventory.items.findIndex(
        (it, i) =>
            !worn.has(i) &&
            !KEEP_IDS.has(it.id) &&
            !(keep && keep(it.id)) &&
            it.id !== COINS_ID &&
            it.id !== FIRE_RUNE &&
            it.id !== NATURE_RUNE &&
            itemDefs[it.id] &&
            itemDefs[it.id].price > 0 && // members items are alchable too
            !worthBanking(bot, it.id)
    );
}

function hasAlchableLoot(bot) {
    return alchableSlot(bot) >= 0;
}

// an alcher keeps a rune reserve in the bank and tops up carried runes when low.
// runes are stackable, so bulk withdraw is safe.
const NATURE_LOW = 15; // top up when carried nature runes drop below this
const RUNE_TARGETS = [[NATURE_RUNE, 100], [FIRE_RUNE, 500]];

function shouldRestockRunes(bot) {
    return (
        bot.skills.magic.current >= 21 &&
        countId(bot.inventory, NATURE_RUNE) < NATURE_LOW &&
        bot.bank &&
        bot.bank.countId(NATURE_RUNE) > 0
    );
}

function startRuneRun(bot) {
    bot._runeRun = {
        phase: 'toBank',
        returnTo: { x: bot.x, y: bot.y },
        bank: nearestBank(bot)
    };
}

function doWithdrawRunes(bot) {
    try {
        bot.bank.open();
        for (const [id, target] of RUNE_TARGETS) {
            const need = target - countId(bot.inventory, id);
            const have = bot.bank.countId(id);
            const amount = Math.min(need, have);
            if (amount > 0) {
                bot.bank.withdraw(id, amount);
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

function runeRunTick(bot) {
    const r = bot._runeRun;
    if (!r || !r.bank) {
        return 'done';
    }
    if ((r.ticks = (r.ticks || 0) + 1) > 800) { return 'done'; } // watchdog: never soft-lock on a stuck travel leg
    const f = travel.FACILITIES[r.bank];
    const target = f ? f.target : null;
    if (!target) {
        return 'done';
    }

    if (r.phase === 'toBank') {
        if (near(bot, target)) {
            doWithdrawRunes(bot);
            r.phase = 'return';
            travel.begin(bot, r.returnTo);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, r.bank)) {
            doWithdrawRunes(bot);
            return 'done';
        }
        travel.step(bot);
        return 'running';
    }

    if (near(bot, r.returnTo, 3) || !travel.isTraveling(bot)) {
        return 'done';
    }
    travel.step(bot);
    return 'running';
}

// a mage tops up combat runes, an archer its arrows, from a bank reserve.
// runes and arrows are stackable, so bulk withdraw is safe.
const COMBAT_RUNE_TARGETS = [
    [35, 400], [41, 200], [32, 200], [34, 200], [31, 200], [38, 50]
];
const ARROW_ID = 11;
const ARROW_TARGET = 500;
const ARROW_LOW = 40;
const CHAOS_RUNE = 41;
const CHAOS_LOW = 20;

function botFocus(bot) {
    return (bot.cache && bot.cache.bot && bot.cache.bot.focus) || 'auto';
}

function shouldRestockAmmo(bot) {
    if (!bot.bank) {
        return false;
    }
    const f = botFocus(bot);
    if (f === 'magic') {
        return (
            countId(bot.inventory, CHAOS_RUNE) < CHAOS_LOW &&
            bot.bank.countId(CHAOS_RUNE) > 0
        );
    }
    if (f === 'ranged') {
        return (
            countId(bot.inventory, ARROW_ID) < ARROW_LOW &&
            bot.bank.countId(ARROW_ID) > 0
        );
    }
    return false;
}

function startAmmoRun(bot) {
    bot._ammoRun = {
        phase: 'toBank',
        returnTo: { x: bot.x, y: bot.y },
        bank: nearestBank(bot)
    };
}

function doWithdrawAmmo(bot) {
    const f = botFocus(bot);
    try {
        bot.bank.open();
        if (f === 'magic') {
            for (const [id, target] of COMBAT_RUNE_TARGETS) {
                const amount = Math.min(
                    target - countId(bot.inventory, id),
                    bot.bank.countId(id)
                );
                if (amount > 0) {
                    bot.bank.withdraw(id, amount);
                }
            }
        } else if (f === 'ranged') {
            const amount = Math.min(
                ARROW_TARGET - countId(bot.inventory, ARROW_ID),
                bot.bank.countId(ARROW_ID)
            );
            if (amount > 0) {
                bot.bank.withdraw(ARROW_ID, amount);
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

function ammoRunTick(bot) {
    const r = bot._ammoRun;
    if (!r || !r.bank) {
        return 'done';
    }
    if ((r.ticks = (r.ticks || 0) + 1) > 800) { return 'done'; } // watchdog: never soft-lock on a stuck travel leg
    const f = travel.FACILITIES[r.bank];
    const target = f ? f.target : null;
    if (!target) {
        return 'done';
    }

    if (r.phase === 'toBank') {
        if (near(bot, target)) {
            doWithdrawAmmo(bot);
            r.phase = 'return';
            travel.begin(bot, r.returnTo);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, r.bank)) {
            doWithdrawAmmo(bot);
            return 'done';
        }
        travel.step(bot);
        return 'running';
    }

    if (near(bot, r.returnTo, 3) || !travel.isTraveling(bot)) {
        return 'done';
    }
    travel.step(bot);
    return 'running';
}

// cast alchemy on one loot item this tick; returns true if it tried
function tryAlchOne(bot) {
    if (bot.locked || !canAlch(bot)) {
        return false;
    }
    const slot = alchableSlot(bot);
    if (slot < 0) {
        return false;
    }
    const spell = bot.skills.magic.current >= 55 ? HIGH_ALCHEMY : LOW_ALCHEMY;
    spellHandler
        .castInventoryItem({ player: bot }, { index: slot, id: spell })
        .catch(() => {});
    return true;
}

module.exports = {
    sellableLoot,
    shouldBank,
    startBankRun,
    bankRunTick,
    nearestBank,
    depositableSlots,
    declutterBank,
    bankWorth,
    shouldRestockFood,
    startFoodRun,
    foodRunTick,
    doWithdrawFood,
    bestBankFood,
    canAlch,
    hasAlchableLoot,
    tryAlchOne,
    shouldRestockRunes,
    startRuneRun,
    runeRunTick,
    shouldRestockAmmo,
    startAmmoRun,
    doWithdrawAmmo,
    ammoRunTick,
    // sell / gear
    sellLoot,
    buyBestAxe,
    bestAxeOwned,
    prefersShopping,
    lootValue,
    smartMoneyChoice,
    startShopTrip,
    shopTripTick,
    shouldBuyGear,
    startGearRun,
    gearRunTick,
    buyBestGearAt,
    // generic acquisition (needs.js)
    coins,
    buyItem,
    shopPriceOf,
    nearestGeneralStore,
    bestSellShop,
    estimateSellPrice,
    sellableLoot,
    processingKeeps,
    worthBanking
};
