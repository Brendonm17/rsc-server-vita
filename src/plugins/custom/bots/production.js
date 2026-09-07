// bots drive the real skill plugins to turn raw materials into goods
// each function bypasses the plugin's ask() menu and applies its creation logic directly

const items = require('@2003scape/rsc-data/config/items');
const { smithing } = require('@2003scape/rsc-data/skills/smithing');

const ANVIL_ID = 50;
const HAMMER_ID = 168;

// minimum smithing level to work each bar
const MIN_BAR_LEVEL = {};
for (const [barID, entry] of Object.entries(smithing.items)) {
    let min = Infinity;
    (function scan(node) {
        for (const it of node) {
            if (Array.isArray(it)) scan(it);
            else if (it && typeof it === 'object' && it.id != null && typeof it.level === 'number') {
                if (it.level < min) min = it.level;
            }
        }
    })(entry.items);
    MIN_BAR_LEVEL[+barID] = min === Infinity ? 1 : min;
}

// enumerate every forgeable leaf item for a bar with its bar cost
function forgeableItems(barID) {
    const entry = smithing.items[barID];
    if (!entry) return [];
    const out = [];
    (function walk(itemsNode, barsNode) {
        for (let i = 0; i < itemsNode.length; i++) {
            const it = itemsNode[i];
            const bc = Array.isArray(barsNode) ? barsNode[i] : undefined;
            if (Array.isArray(it)) {
                walk(it, bc);
            } else if (it && typeof it === 'object' && it.id != null) {
                const bars = it.bars != null ? it.bars : (typeof bc === 'number' ? bc : 1);
                out.push({ id: it.id, level: it.level || 1, amount: it.amount || 1, bars });
            }
        }
    })(entry.items, smithing.bars);
    return out;
}

function smithLevel(bot) {
    const s = bot.skills && bot.skills.smithing;
    if (!s) return 1;
    return (s.current != null ? s.current : s.base) || 1;
}

// pick the forgeable item consuming the most bars the bot can afford; prefer wieldable, then the prefer hint
function chooseForgeItem(bot, barID, prefer) {
    const lvl = smithLevel(bot);
    const have = (bot.inventory && bot.inventory.has) ? (n) => bot.inventory.has(barID, n) : () => false;
    const WEAPON = new Set([62, 66, 70, 82, 76, 87, 205, 94, 104, 108]); // dagger/swords/axes/mace ids
    let best = null, bestScore = -1;
    for (const it of forgeableItems(barID)) {
        if (it.level > lvl) continue;
        if (!have(it.bars)) continue;
        const def = items[it.id];
        const wieldable = !!(def && def.wieldable);
        let score = it.bars * 10;
        if (prefer === 'weapon' && WEAPON.has(it.id)) score += 6;
        if (prefer === 'armour' && wieldable && !WEAPON.has(it.id)) score += 6;
        if (wieldable) score += 1;
        if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
}

// forge at an anvil with bars + hammer; returns { id, amount, xp } or null
function forgeBest(bot, barID, prefer) {
    if (!bot || !bot.inventory || barID == null) return null;
    if (!smithing.items.hasOwnProperty(barID)) return null;
    if (smithLevel(bot) < (MIN_BAR_LEVEL[barID] || 1)) return null;
    if (!bot.inventory.has(HAMMER_ID)) return null;
    if (typeof bot.isTired === 'function' && bot.isTired()) return null;

    const pick = chooseForgeItem(bot, barID, prefer);
    if (!pick) return null;
    if (!bot.inventory.has(barID, pick.bars)) return null;

    const experience = (smithing.items[barID].experience || 0) * pick.bars;
    bot.inventory.remove(barID, pick.bars);
    try { bot.sendBubble && bot.sendBubble(barID); } catch (e) {}
    try { bot.sendSound && bot.sendSound('anvil'); } catch (e) {}
    bot.inventory.add(pick.id, pick.amount);
    bot.addExperience('smithing', experience);
    return { id: pick.id, amount: pick.amount, xp: experience };
}

// forge a specific item id for the produce goal; returns { id, amount, xp } or null
function forgeItem(bot, itemId) {
    if (!bot || !bot.inventory || itemId == null) return null;
    if (!bot.inventory.has(HAMMER_ID)) return null;
    if (typeof bot.isTired === 'function' && bot.isTired()) return null;
    const lvl = smithLevel(bot);
    itemId = Number(itemId);
    for (const barID of Object.keys(smithing.items)) {
        const bID = Number(barID);
        if (lvl < (MIN_BAR_LEVEL[bID] || 1)) continue;
        for (const it of forgeableItems(bID)) {
            if (it.id !== itemId) continue;
            if (it.level > lvl || !bot.inventory.has(bID, it.bars)) return null;
            const experience = (smithing.items[bID].experience || 0) * it.bars;
            bot.inventory.remove(bID, it.bars);
            try { bot.sendBubble && bot.sendBubble(bID); } catch (e) {}
            try { bot.sendSound && bot.sendSound('anvil'); } catch (e) {}
            bot.inventory.add(it.id, it.amount);
            bot.addExperience('smithing', experience);
            return { id: it.id, amount: it.amount, xp: experience };
        }
    }
    return null;
}

// is the bot carrying a hammer + any bar it could forge something from right now?
function hasForgeableBar(bot) {
    if (!bot || !bot.inventory || !bot.inventory.has) return false;
    if (!bot.inventory.has(HAMMER_ID)) return false;
    for (const barID of Object.keys(smithing.items)) {
        if (chooseForgeItem(bot, +barID)) return true;
    }
    return false;
}

// forge the best item from any bar the bot carries, heaviest metal first
function forgeAny(bot, prefer) {
    if (!bot || !bot.inventory) return null;
    const bars = Object.keys(smithing.items).map(Number).sort((a, b) => b - a);
    for (const barID of bars) {
        const res = forgeBest(bot, barID, prefer);
        if (res) return res;
    }
    return null;
}

// crafting ask()-bypasses (leather armour + gold jewellery)
// pick a product the level + held materials allow and apply the plugin's remove/add/addExperience
const NEEDLE_ID = 39, THREAD_ID = 43, LEATHER_ID = 148, GOLD_BAR_ID = 172;
// leather products: { level, experience, id }
const LEATHER_PRODUCTS = [
    { level: 1, experience: 55, id: 16 },   // gloves
    { level: 7, experience: 65, id: 17 },   // boots
    { level: 14, experience: 100, id: 15 }, // armour
    { level: 10, experience: 80, id: 1375 },// chaps (custom)
    { level: 14, experience: 100, id: 1376 },// top (custom)
    { level: 10, experience: 80, id: 1377 } // skirt (custom)
];
function craftingLevel(bot) { const s = bot.skills && bot.skills.crafting; return s ? (s.current != null ? s.current : s.base) : 1; }

// needle + thread + leather -> best leather item; thread consumed once per 5 products
function craftLeatherBest(bot) {
    if (!bot || !bot.inventory || !bot.inventory.has) return null;
    if (!bot.inventory.has(NEEDLE_ID) || !bot.inventory.has(THREAD_ID) || !bot.inventory.has(LEATHER_ID)) return null;
    if (typeof bot.isTired === 'function' && bot.isTired()) return null;
    const lvl = craftingLevel(bot);
    let pick = null;
    for (const p of LEATHER_PRODUCTS) { if (p.level <= lvl && (!pick || p.experience > pick.experience)) pick = p; }
    if (!pick) return null;
    bot.inventory.remove(LEATHER_ID, 1);
    bot.inventory.add(pick.id, 1);
    bot.addExperience('crafting', pick.experience);
    const cb = bot.cache && bot.cache.bot;
    if (cb) {
        let left = cb.threadLeft != null ? cb.threadLeft : 5;
        left -= 1;
        if (left < 1) { try { bot.inventory.remove(THREAD_ID, 1); } catch (e) {} left = 5; }
        cb.threadLeft = left;
    }
    return { id: pick.id, xp: pick.experience };
}

// gold bar + mould -> best plain-gold jewellery the bot can make
const JEWEL_MOULDS = [[293, 0], [295, 1], [294, 2]]; // mould id -> shape index
function mouldJewelleryBest(bot) {
    if (!bot || !bot.inventory || !bot.inventory.has) return null;
    if (!bot.inventory.has(GOLD_BAR_ID)) return null;
    if (typeof bot.isTired === 'function' && bot.isTired()) return null;
    let gj = null;
    try { gj = require('@2003scape/rsc-data/skills/crafting')['gold-jewellery']; } catch (e) { return null; }
    if (!gj || !gj.items) return null;
    const lvl = craftingLevel(bot);
    const gems = gj.gems || []; // tier 0 = plain gold, tier k uses gems[k-1]
    let best = null;
    let bestGem = -1;
    for (const [mould, shape] of JEWEL_MOULDS) {
        if (!bot.inventory.has(mould)) continue;
        const row = gj.items[shape];
        const opts = Array.isArray(row) ? row : [row];
        for (let tier = 0; tier < opts.length; tier += 1) {
            const cell = opts[tier];
            if (!cell || cell.id == null || cell.level > lvl) { continue; }
            const gemId = tier === 0 ? -1 : gems[tier - 1];
            if (gemId !== -1 && !bot.inventory.has(gemId)) { continue; } // gem-set row needs the cut gem
            if (!best || cell.experience > best.experience) { best = cell; bestGem = gemId; }
        }
    }
    if (!best) return null;
    // remove the gem (if any) then the gold bar, add the product, award xp
    if (bestGem !== -1) { bot.inventory.remove(bestGem, 1); }
    bot.inventory.remove(GOLD_BAR_ID, 1);
    bot.inventory.add(best.id, best.amount || 1);
    bot.addExperience('crafting', best.experience);
    return { id: best.id, xp: best.experience };
}

// silver bar + matching mould -> best silver jewellery (holy/unholy symbol)
const SILVER_BAR_ID = 384;
function mouldSilverBest(bot) {
    if (!bot || !bot.inventory || !bot.inventory.has) return null;
    if (!bot.inventory.has(SILVER_BAR_ID)) return null;
    if (typeof bot.isTired === 'function' && bot.isTired()) return null;
    let sj = null;
    try { sj = require('@2003scape/rsc-data/skills/crafting')['silver-jewellery']; } catch (e) { return null; }
    if (!sj || !sj.items) return null;
    const lvl = craftingLevel(bot);
    let best = null;
    for (let i = 0; i < sj.items.length; i += 1) {
        const cell = sj.items[i];
        if (!cell || cell.id == null || cell.level > lvl) { continue; }
        const mouldId = sj.moulds ? sj.moulds[i] : null;
        if (mouldId == null || !bot.inventory.has(mouldId)) { continue; } // items[i] pairs with moulds[i]
        if (!best || cell.experience > best.experience) { best = cell; }
    }
    if (!best) return null;
    bot.inventory.remove(SILVER_BAR_ID, 1);
    bot.inventory.add(best.id, best.amount || 1);
    bot.addExperience('crafting', best.experience);
    return { id: best.id, xp: best.experience };
}

// pottery wheel + soft clay -> best unfired pottery the bot's level allows
const SOFT_CLAY_ID = 243;
function mouldPotteryBest(bot) {
    if (!bot || !bot.inventory || !bot.inventory.has || !bot.inventory.has(SOFT_CLAY_ID)) { return null; }
    if (typeof bot.isTired === 'function' && bot.isTired()) { return null; }
    let pottery = null;
    try { pottery = require('@2003scape/rsc-data/skills/crafting').pottery; } catch (e) { return null; }
    if (!pottery) { return null; }
    const lvl = craftingLevel(bot);
    let best = null;
    for (const e of pottery) { if ((e.level || 1) <= lvl && e.unfired && (!best || e.unfired.experience > best.unfired.experience)) { best = e; } }
    if (!best) { return null; }
    bot.inventory.remove(SOFT_CLAY_ID);
    bot.inventory.add(best.unfired.id);
    bot.addExperience('crafting', best.unfired.experience || 0);
    return { id: best.unfired.id, xp: best.unfired.experience || 0 };
}

// glassblowing pipe + molten glass -> highest-xp product the level allows (beer glass/vial/unpowered orb)
const MOLTEN_GLASS_ID = 623;
const GLASSBLOW_OPTIONS = [
    { id: 620, level: 1, experience: 70 },
    { id: 465, level: 33, experience: 140 },
    { id: 611, level: 46, experience: 210 }
];
function blowGlassBest(bot) {
    if (!bot || !bot.inventory || !bot.inventory.has || !bot.inventory.has(MOLTEN_GLASS_ID)) { return null; }
    if (typeof bot.isTired === 'function' && bot.isTired()) { return null; }
    const lvl = craftingLevel(bot);
    let best = null;
    for (const o of GLASSBLOW_OPTIONS) { if (o.level <= lvl && (!best || o.experience > best.experience)) { best = o; } }
    if (!best) { return null; }
    bot.inventory.remove(MOLTEN_GLASS_ID);
    bot.inventory.add(best.id);
    bot.addExperience('crafting', best.experience);
    return { id: best.id, xp: best.experience };
}

// flour + water -> dough (default bread dough 137); returns the emptied water container + a pot too
const DOUGH_EMPTY_WATER = { 50: 21, 141: 140 }; // bucket->empty bucket, jug->empty jug
function makeDoughBest(bot, wantId) {
    if (!bot || !bot.inventory || !bot.inventory.has || !bot.inventory.has(136)) { return null; }
    let water = null;
    for (const w of [50, 141]) { if (bot.inventory.has(w)) { water = w; break; } }
    if (water == null) { return null; }
    let doughs = [];
    try { doughs = require('@2003scape/rsc-data/skills/cooking').doughs || []; } catch (e) {}
    const valid = new Set(doughs.map((d) => d.id));
    const id = (wantId != null && valid.has(wantId)) ? wantId : 137; // bread dough default
    bot.inventory.remove(water);
    bot.inventory.remove(136);
    if (DOUGH_EMPTY_WATER[water] != null) { bot.inventory.add(DOUGH_EMPTY_WATER[water]); }
    bot.inventory.add(135); // also returns a pot
    bot.inventory.add(id);
    return { id };
}

module.exports = {
    forgeableItems, chooseForgeItem, forgeBest, forgeAny, forgeItem, hasForgeableBar,
    craftLeatherBest, mouldJewelleryBest, mouldSilverBest, mouldPotteryBest, blowGlassBest, makeDoughBest,
    ANVIL_ID, HAMMER_ID, MIN_BAR_LEVEL
};
