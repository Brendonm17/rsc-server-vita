// bot trading via the real interface trade flow, as a per-bot state machine (no ask() dialogue).
// a real economy: items have a market value, bots value needs/upgrades higher, and haggle to a fair deal.

const items = require('@2003scape/rsc-data/config/items');
const personality = require('./personality');
const pacing = require('./pacing');
const mood = require('./mood');
const gear = require('./gear');
const itemKnowledge = require('./item-knowledge');

const COINS_ID = 10;
const COIN_RESERVE = 100; // never trade away the last of its coins
const BASE = [0, 0.06, 0.15, 0.3]; // trade appetite level -> per-attempt rate
const MAX_TRIMS = 6; // how many times a bot will sweeten-down to reach fairness
const MAX_NEGO = 14; // livelock guard: give up after this many re-evaluations

// combat runes a mage burns (offensive strikes/bolts/blasts + a couple staples).
const COMBAT_RUNES = new Set([33, 38, 39, 40, 41, 42, 43]); // air/water/earth/fire/chaos/death/mind
const ARROW_IDS = new Set([11, 574, 575, 576, 577, 578]); // bronze..rune arrows
const FOOD_LOW = 4;
const RUNE_LOW = 30;
const ARROW_LOW = 60;

function level(bot) {
    const cb = bot.cache && bot.cache.bot;
    let v = cb ? cb.trade : 0;
    if (v === true) v = 2;
    v = typeof v === 'number' ? Math.floor(v) : 0;
    return v < 0 ? 0 : v > 3 ? 3 : v;
}

// 0..1 chance per attempt to reach out to trade (higher for greedy/sociable/good-mood bots).
function appetite(bot) {
    const lvl = level(bot);
    if (lvl <= 0) {
        return 0;
    }
    const p = personality.of(bot);
    const m = mood.of(bot);
    let a = BASE[lvl] * (0.5 + 0.3 * p.sociability + 0.3 * p.greed);
    a += (m.valence - 0.5) * 0.1;
    return a < 0 ? 0 : a > 1 ? 1 : a;
}

// 0..1: how much surplus a bot will part with.
function generosity(bot) {
    const p = personality.of(bot);
    return (1 - p.greed) * 0.6 + p.sociability * 0.4;
}

// will this bot entertain an incoming request? yes if it trades at all or carries saleable wares.
function willingToRespond(bot) {
    if (level(bot) > 0 || hasStock(bot)) {
        return true;
    }
    return personality.of(bot).sociability >= 0.35;
}

function countItem(bot, id) {
    let n = 0;
    for (const it of bot.inventory.items) {
        if (it.id === id) {
            n += it.amount || 1;
        }
    }
    return n;
}

function isFood(id) {
    const c = items[id] && items[id].command;
    return c === 'Eat' || c === 'Drink';
}

function isMage(bot) {
    const cb = bot.cache && bot.cache.bot;
    return !!(cb && cb.focus === 'magic');
}

function isArcher(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (cb && cb.focus === 'ranged') {
        return true;
    }
    return !!(bot.inventory.getRangedWeapon && bot.inventory.getRangedWeapon());
}

// craft raw-material ids (ore/bars, raw fish, logs) from the rsc-data skill tables.
const ORE_IDS = (() => {
    try {
        const { smelting } = require('@2003scape/rsc-data/skills/smithing');
        const s = new Set();
        for (const bar of Object.keys(smelting)) {
            s.add(Number(bar));
            for (const o of smelting[bar].ores || []) s.add(o.id);
        }
        return s;
    } catch (e) { return new Set(); }
})();
const RAW_FISH_IDS = (() => {
    try {
        const { uncooked } = require('@2003scape/rsc-data/skills/cooking');
        return new Set(Object.keys(uncooked || {}).map(Number));
    } catch (e) { return new Set(); }
})();
const LOG_ID_TRADE = 14;
let _roleMod;
function roleOf(bot) {
    try { _roleMod = _roleMod || require('./role'); return _roleMod.role(bot); } catch (e) { return null; }
}

// the item ids this bot currently needs (low on, or would upgrade into).
function carriedNeeds(bot) {
    const need = new Set();
    let food = 0;
    for (const it of bot.inventory.items) {
        if (isFood(it.id)) {
            food += it.amount || 1;
        }
    }
    if (food < FOOD_LOW) {
        for (const it of bot.inventory.items) {
            if (isFood(it.id)) {
                need.add(it.id);
            }
        }
        need._wantsFood = true;
    }
    if (isMage(bot)) {
        for (const r of COMBAT_RUNES) {
            if (countItem(bot, r) < RUNE_LOW) {
                need.add(r);
            }
        }
    }
    if (isArcher(bot)) {
        let arrows = 0;
        for (const a of ARROW_IDS) {
            arrows += countItem(bot, a);
        }
        if (arrows < ARROW_LOW) {
            for (const a of ARROW_IDS) {
                need.add(a);
            }
        }
    }
    // a tradesbot wants its craft's raw materials (smith -> ore, cook -> raw fish, fletcher -> logs), gated on role.
    const r = roleOf(bot);
    if (r === 'smith') {
        for (const o of ORE_IDS) need.add(o);
    } else if (r === 'cook') {
        for (const f of RAW_FISH_IDS) need.add(f);
    } else if (r === 'firemaker' || r === 'fletcher') {
        need.add(LOG_ID_TRADE);
    }
    // the item needs.js wants to buy now (_wantBuy), so a bot can source it from a neighbour.
    if (bot._wantBuy != null) { need.add(bot._wantBuy); }
    return need;
}

// the flat shop price (the anchor the market quote drifts from).
function priceOfBase(id) {
    return items[id] ? items[id].price || 0 : 0;
}

// the price a bot values an item at: the live market quote, else the flat shop price.
function priceOf(id) {
    const base = priceOfBase(id);
    try {
        return require('./market').quote(id, base);
    } catch (e) {
        return base;
    }
}

function marketValue(offer) {
    let v = 0;
    for (const { id, amount } of offer) {
        v += priceOf(id) * amount;
    }
    return v;
}

// how much an item is worth to this bot: needs/upgrades above shop price, coins prized by the greedy.
function needMultiplier(bot, id, need) {
    try {
        if (gear.wantsGearDrop && gear.wantsGearDrop(bot, id)) {
            return 3;
        }
    } catch (e) {
    }
    if (need && need.has(id)) {
        return 2.2;
    }
    if (id === COINS_ID) {
        return 1 + personality.of(bot).greed * 0.4;
    }
    return 1;
}

function subjectiveValue(bot, offer) {
    const need = carriedNeeds(bot);
    let v = 0;
    for (const { id, amount } of offer) {
        v += priceOf(id) * amount * needMultiplier(bot, id, need);
    }
    return v;
}

// how much it costs this bot to give an item: coins full value, needs dear, surplus cheap (greedy discounts less).
function giveMultiplier(bot, id) {
    if (id === COINS_ID) {
        return 1;
    }
    if (carriedNeeds(bot).has(id)) {
        return 1.2;
    }
    return 0.3 + personality.of(bot).greed * 0.5;
}

function givingValue(bot, offer) {
    let v = 0;
    for (const { id, amount } of offer) {
        v += priceOf(id) * amount * giveMultiplier(bot, id);
    }
    return v;
}

// fairness ratio: value demanded per unit given. greed-driven, softened for a friend/party-mate,
// firmer for someone disliked. lower ratio = a better deal for the partner.
function fairnessRatio(bot, other) {
    let r = 0.6 + personality.of(bot).greed * 0.7;
    if (other && other.username) {
        try {
            const rel = require('./social-emergent').sentiment(bot, other.username); // -10..10
            r -= Math.max(-0.25, Math.min(0.3, rel * 0.04)); // a friend (rel +8) ~-0.3; a rival (rel -6) ~+0.24
        } catch (e) {  }
        if (inSameParty(bot, other)) { r -= 0.15; } // team-mates share freely
    }
    return Math.max(0.35, r);
}

// would this bot accept swapping myOffer out for theirOffer in? bargain bends by relationship.
function acceptable(bot, myOffer, theirOffer, other) {
    const myLen = myOffer.length;
    const theirLen = theirOffer.length;
    if (!myLen && !theirLen) {
        return false; // an empty-for-empty trade is pointless
    }
    const gain = subjectiveValue(bot, theirOffer);
    const cost = givingValue(bot, myOffer); // surplus is cheap to give away
    return gain + 1 >= cost * fairnessRatio(bot, other);
}

// shrink my offer to close a fairness gap: halve the most valuable stack, else drop a unit; null if it can't.
function trimOffer(offer) {
    const next = offer.map((o) => ({ id: o.id, amount: o.amount }));
    let idx = -1;
    let bestVal = -1;
    next.forEach((o, i) => {
        const v = priceOf(o.id) * o.amount;
        if (v > bestVal) {
            bestVal = v;
            idx = i;
        }
    });
    if (idx < 0) {
        return null;
    }
    const line = next[idx];
    const def = items[line.id];
    if (def && def.stackable && line.amount > 1) {
        line.amount = Math.floor(line.amount / 2);
        return next.filter((o) => o.amount > 0);
    }
    next.splice(idx, 1); // non-stackable or a single unit -> drop it
    return next;
}

function equippedIndices(bot) {
    const s = new Set();
    const slots = bot.inventory.equipmentSlots || {};
    for (const k of Object.keys(slots)) {
        if (typeof slots[k] === 'number' && slots[k] >= 0) {
            s.add(slots[k]);
        }
    }
    return s;
}

// spare tradeable items the bot can give away (up to max stacks): a chunk of a stackable surplus, one of gear/tools.
function spareItems(bot, max) {
    const equipped = equippedIndices(bot);
    const need = carriedNeeds(bot);
    const g = generosity(bot);
    const counts = {};
    bot.inventory.items.forEach((it, idx) => {
        if (it.id === COINS_ID || equipped.has(idx) || need.has(it.id)) {
            return;
        }
        const def = items[it.id];
        if (!def || def.untradeable) {
            return;
        }
        counts[it.id] = (counts[it.id] || 0) + (it.amount || 1);
    });
    const out = [];
    for (const id of Object.keys(counts)) {
        const total = counts[id];
        if (total < 2) {
            continue; // keep at least one of everything
        }
        const def = items[Number(id)];
        let amount;
        if (def.stackable) {
            amount = Math.max(1, Math.floor(total * (0.3 + g * 0.5)));
            amount = Math.min(amount, total - 1); // always keep one
        } else {
            amount = 1; // a single spare tool / bit of gear
        }
        if (amount >= 1) {
            out.push({ id: Number(id), amount });
        }
        if (out.length >= max) {
            break;
        }
    }
    return out;
}

// stock = finished goods the bot won't use itself (its saleable wares), offered as a sale, not a gift.
// food and gear the bot would wield are excluded, but a genuine food surplus is saleable.
const FOOD_STOCK_KEEP = 10;
function carriedFoodSurplus(bot) {
    let n = 0;
    try { for (const it of bot.inventory.items) { if (itemKnowledge.isFood(it.id)) { n += it.amount || 1; } } } catch (e) { return false; }
    return n > FOOD_STOCK_KEEP;
}
function isStock(bot, id) {
    if (id === COINS_ID) { return false; }
    const def = items[id];
    if (!def || def.untradeable) { return false; } // members wares trade like any other
    if (carriedNeeds(bot).has(id)) { return false; }
    // food is a survival asset, but a surplus is saleable.
    if (itemKnowledge.isFood(id)) { return carriedFoodSurplus(bot); }
    if (!itemKnowledge.isFinishedProduct(id)) { return false; }
    try { if (gear.wantsGearDrop(bot, id)) { return false; } } catch (e) {  }
    return true;
}
// the bot's saleable wares (up to max distinct), each a single unit.
function stockItems(bot, max) {
    const equipped = equippedIndices(bot);
    const seen = new Set();
    const out = [];
    bot.inventory.items.forEach((it, idx) => {
        if (equipped.has(idx) || seen.has(it.id) || !isStock(bot, it.id)) { return; }
        seen.add(it.id);
        out.push({ id: it.id, amount: 1 });
    });
    return out.slice(0, max || 3);
}
// does the bot hold any saleable wares right now?
function hasStock(bot) {
    const equipped = equippedIndices(bot);
    return bot.inventory.items.some((it, idx) => !equipped.has(idx) && isStock(bot, it.id));
}

// build the opening offer from surplus, sized by generosity (extra generous to a friend/party-mate).
function chooseOffer(bot, partner) {
    let g = generosity(bot);
    if (partner && partner.username) {
        try {
            const em = require('./social-emergent');
            if (inSameParty(bot, partner) || em.sentiment(bot, partner.username) >= 3) {
                g = Math.min(1, g + 0.3);
            }
        } catch (e) {  }
    }
    const offer = [];

    const coins = countItem(bot, COINS_ID);
    if (coins > COIN_RESERVE) {
        const spare = coins - COIN_RESERVE;
        const amt = Math.max(1, Math.floor(spare * (0.05 + g * 0.3)));
        offer.push({ id: COINS_ID, amount: Math.min(spare, amt) });
    }

    // always put saleable stock on the table (a sale), then a generosity-gated surplus gift.
    const inOffer = new Set(offer.map((o) => o.id));
    for (const it of stockItems(bot, 2)) { if (!inOffer.has(it.id)) { offer.push(it); inOffer.add(it.id); } }
    const wantItems = g > 0.4 ? (g > 0.7 ? 2 : 1) : 0;
    if (wantItems) {
        for (const it of spareItems(bot, wantItems)) {
            if (!inOffer.has(it.id)) { offer.push(it); inOffer.add(it.id); }
        }
    }
    return offer;
}

function delay(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
}

// busy = pacing.isBusy plus gathering / generic travel.
function busy(bot) {
    return pacing.isBusy(bot) || !!(bot.gatheringSkill || bot._travel);
}

function say(bot, line) {
    try {
        bot.broadcastChat(line);
    } catch (e) {
    }
}

// advertise wares/needs to nearby people, only with an audience and on a long cadence.
function marketCry(bot) {
    if (bot._cryCd && bot._cryCd > 0) { bot._cryCd -= 1; return; }
    // market.js's priced cry and this one share the bot's voice: never both within a minute
    if (bot._mktCd && bot._mktCd > 0) { bot._cryCd = 60; return; }
    const p = personality.of(bot);
    let audience = false;
    try { for (const o of bot.getNearbyEntities('players', 8)) { if (o && o !== bot && o.username && o.username !== bot.username) { audience = true; break; } } } catch (e) { return; }
    if (!audience) return;
    // what to cry about: a saleable ware (sell), else a keen restock need (buy).
    let line = null;
    const stock = stockItems(bot, 1);
    if (stock.length) {
        const nm = (items[stock[0].id] && items[stock[0].id].name) || 'quality goods';
        line = 'Selling ' + nm.toLowerCase() + '! Fair price.';
    } else {
        const need = carriedNeeds(bot);
        if (need._wantsFood) { line = 'Buying food - cash in hand!'; }
        else if (need.size) { const id = need.values().next().value; const nm = items[id] && items[id].name; if (nm) { line = 'Buying ' + nm.toLowerCase() + ', got coins!'; } }
    }
    if (!line) { bot._cryCd = 120; return; }
    if (Math.random() < 0.25 + p.sociability * 0.2 + Math.min(0.3, level(bot) * 0.1)) {
        say(bot, line);
        bot._cryCd = 250 + Math.floor(Math.random() * 400);
        bot._mktCd = Math.max(bot._mktCd | 0, 200);
    } else {
        bot._cryCd = 80 + Math.floor(Math.random() * 80);
    }
}

const OPENERS = ['Fancy a trade?', 'Trade?', 'Wanna swap some stuff?', 'Got anything to trade?'];
const THANKS = ['Cheers, nice trade!', 'Thanks!', 'Pleasure doing business.', 'Good trade!'];
const BUY_OPENERS = ['Buying! Cash in hand.', 'Got any spares to sell me?', "I need a restock - selling?", 'Looking to buy, got coins.'];
const WARE_OPENERS = ['Forged this myself - interested?', 'Fine wares for sale!', 'Made this with my own hands - want it?', 'Selling quality goods, take a look.'];

// how likely the bot is to engage an incoming request right now (distinct from willingToRespond).
function inTheMoodToTrade(bot) {
    const p = personality.of(bot);
    const m = mood.of(bot);
    let c = 0.35 + 0.4 * p.sociability + (m.valence - 0.5) * 0.4 + level(bot) * 0.05;
    return Math.random() < (c < 0.05 ? 0.05 : c > 0.95 ? 0.95 : c);
}

// politely (or gruffly) turn down a pending request: drop it + an optional line.
function rejectRequest(bot, requester) {
    if (bot.trade && bot.trade.requests) {
        bot.trade.requests.delete(requester);
    }
    if (Math.random() < 0.5) {
        try {
            const line = require('./chatgen').generate('tradeReject', {}, bot);
            if (line) {
                bot.broadcastChat(line);
            }
        } catch (e) {
        }
    }
}

function inSameParty(bot, other) {
    return !!(bot.party && bot.party.members && other.username &&
        bot.party.members.some((m) => m.username === other.username));
}

// score a partner: prefer someone carrying what I need, friends, party-mates, and someone who needs my spare.
function partnerScore(bot, other, need) {
    let score = 1;
    if (other.inventory && other.inventory.items) {
        const mySpare = spareItems(bot, 4);
        for (const it of other.inventory.items) {
            if ((need.size || need._wantsFood) && need.has(it.id)) {
                score += 3; // they have what I want (I buy)
            }
        }
        // someone who needs what I can spare -> a natural sale (a party-mate weighs higher).
        if (other.cache) {
            try {
                const theirNeed = carriedNeeds(other);
                const mate = inSameParty(bot, other);
                for (const o of mySpare) {
                    if (theirNeed.has(o.id)) {
                        score += mate ? 4 : 3;
                    }
                }
                // a buyer who would wield my wares is the ideal customer.
                for (const it of stockItems(bot, 3)) {
                    try { if (gear.wantsGearDrop(other, it.id)) { score += mate ? 5 : 4; } } catch (e) {  }
                }
            } catch (e) {  }
        }
    }
    try {
        const emergent = require('./social-emergent');
        const rel = emergent.sentiment(bot, other.username);
        if (rel >= 3) score += 2;         // a friend
        if (inSameParty(bot, other)) score += 4; // a team-mate: share the loot
        if (rel <= -3) score -= 6;        // a rival: you don't do business with an enemy
    } catch (e) {  }
    // nor with a sworn-enemy faction.
    try {
        const factions = require('./factions');
        const mine = factions.factionOf(bot);
        if (mine) {
            const theirs = factions.allegianceName(other);
            if (theirs && factions.areRivals(mine.name, theirs)) score -= 6;
        }
    } catch (e) {  }
    return score;
}

// a rival (personal grudge) or a sworn-enemy-faction member the bot refuses to deal with.
function isEnemyForTrade(bot, other) {
    if (!other || !other.username) return false;
    try {
        if (require('./social-emergent').sentiment(bot, other.username) <= -3) return true;
    } catch (e) {  }
    try {
        const factions = require('./factions');
        const mine = factions.factionOf(bot);
        if (mine) {
            const theirs = factions.allegianceName(other);
            if (theirs && factions.areRivals(mine.name, theirs)) return true;
        }
    } catch (e) {  }
    return false;
}

// a nearby free partner carrying something the bot needs; returns { partner, itemId } or null.
function findSeller(bot, need) {
    if (!need || (!need.size && !need._wantsFood)) {
        return null;
    }
    try {
        for (const other of bot.getNearbyEntities('players', 8)) {
            if (other === bot || other.id === bot.id) continue;
            if (other.hasInterfaceOpen && other.hasInterfaceOpen()) continue;
            if (other.trade && other.trade.tradingWith) continue;
            if (other.inventory && other.inventory.items) {
                for (const it of other.inventory.items) {
                    if (need.has(it.id) && (it.amount || 1) >= 2) {
                        return { partner: other, itemId: it.id };
                    }
                }
            }
        }
    } catch (e) {
    }
    return null;
}

// is a nearby non-enemy bot carrying itemId to spare (so the bot can buy locally instead of a shop trek)?
function sellerNearby(bot, itemId) {
    if (itemId == null) { return false; }
    let others;
    try { others = bot.getNearbyEntities('players', 8) || []; } catch (e) { return false; }
    for (const o of others) {
        if (!o || o === bot || o.id === bot.id || o.username === bot.username) { continue; }
        if (o.hasInterfaceOpen && o.hasInterfaceOpen()) { continue; }
        if (o.trade && o.trade.tradingWith) { continue; }
        if (isEnemyForTrade(bot, o)) { continue; }
        if (o.inventory && o.inventory.items) {
            for (const it of o.inventory.items) {
                if (it.id === itemId && (it.amount || 1) >= 2) { return true; }
            }
        }
    }
    return false;
}

// an offer to buy wantId: coins sized for a useful restock at a premium, capped by spare coins.
function buyOffer(bot, wantId) {
    const have = countItem(bot, COINS_ID);
    if (have <= COIN_RESERVE) {
        return chooseOffer(bot);
    }
    const price = priceOf(wantId) || 5;
    const budget = Math.min(
        have - COIN_RESERVE,
        Math.max(50, Math.floor(price * 40 * 1.2))
    );
    return [{ id: COINS_ID, amount: Math.max(1, budget) }];
}

// pick the best nearby, free partner (player or bot) to trade with.
function findPartner(bot) {
    const need = carriedNeeds(bot);
    let best = null;
    let bestScore = 0;
    try {
        for (const other of bot.getNearbyEntities('players', 8)) {
            if (other === bot || other.id === bot.id) {
                continue;
            }
            if (other.hasInterfaceOpen && other.hasInterfaceOpen()) {
                continue;
            }
            if (other.trade && other.trade.tradingWith) {
                continue;
            }
            const s = partnerScore(bot, other, need);
            if (s > bestScore) {
                bestScore = s;
                best = other;
            }
        }
    } catch (e) {
    }
    return best;
}

// clear all trade state (declining a live trade); cd is the cooldown before trading again.
function clearTrade(bot, decline, cd) {
    const live = bot.interfaceOpen && bot.interfaceOpen.trade;
    if (decline && live && bot.trade) {
        try {
            bot.trade.decline();
        } catch (e) {
        }
    }
    // a request that never opened leaves trade.tradingWith set; reset it so the bot isn't stuck "mid-trade".
    if (bot.trade && !(bot.interfaceOpen && bot.interfaceOpen.trade)) {
        bot.trade.tradingWith = null;
    }
    bot._trade = null;
    bot._tradeCd = typeof cd === 'number' ? cd : delay(300, 700);
}

function partnerOffer(partner) {
    return (partner.trade && partner.trade.offer) || [];
}

// advance an in-progress trade one tick.
function advance(bot) {
    const st = bot._trade;
    const partner = st.partner;

    if (!partner || partner.username == null) {
        clearTrade(bot, true);
        return;
    }

    // interface closed unexpectedly (declined, or completed) -> resolve.
    if (!(bot.interfaceOpen && bot.interfaceOpen.trade)) {
        if (st.stage === 'requesting') {
            // if both reached out at once, open the reciprocal request now.
            if (bot.trade && bot.trade.requests && bot.trade.requests.has(partner)) {
                try {
                    bot.trade.request(partner); // opens both screens
                } catch (e) {
                }
                return;
            }
            st.t -= 1;
            if (st.t <= 0) {
                if (partner.trade && partner.trade.requests) {
                    partner.trade.requests.delete(bot);
                }
                clearTrade(bot, false, delay(30, 80)); // just ignored -> retry soon
            }
            return;
        }
        if (st.confirmed) {
            say(bot, THANKS[Math.floor(Math.random() * THANKS.length)]);
            // report every completed deal to the market price board (supply pressure softens prices).
            try {
                require('./market').reportTrade(st.myOffer, partnerOffer(partner));
            } catch (e) {
            }
            // a good deal warms the relationship (emergent social memory).
            try {
                require('./social-emergent').noteInteraction(bot, partner.username, 2);
            } catch (e) {
            }
            // a completed trade builds merchant standing; giving clearly more builds helpful standing.
            try {
                const rep = require('./reputation');
                rep.note(bot, 'trade');
                if ((st.gaveValue || 0) > (st.gotValue || 0) * 1.5 + 20) {
                    rep.note(bot, 'help'); // gave clearly more than got = a gift
                }
            } catch (e) {
            }
        }
        clearTrade(bot, false);
        return;
    }

    switch (st.stage) {
        case 'requesting':
            st.stage = 'offering';
            st.t = delay(2, 6);
            break;

        case 'offering':
            if (st.t > 0) {
                st.t -= 1;
                break;
            }
            // buying a needed item -> put up coins for it; otherwise offer surplus.
            st.myOffer = st.buying ? buyOffer(bot, st.buying) : chooseOffer(bot, partner);
            st.trims = 0;
            st.negos = 0;
            try {
                bot.trade.updateItems(st.myOffer);
            } catch (e) {
                clearTrade(bot, true);
                return;
            }
            st.stage = 'negotiating';
            st.t = delay(4, 12); // let the partner lay out their side
            break;

        case 'negotiating': {
            if (st.t > 0) {
                st.t -= 1;
                break;
            }
            // a bot can lose patience and walk away mid-haggle (impatient bots bail more).
            if (Math.random() < 0.03 * (1 - personality.of(bot).patience)) {
                if (Math.random() < 0.5) {
                    try {
                        const l = require('./chatgen').generate('tradeReject', {}, bot);
                        if (l) bot.broadcastChat(l);
                    } catch (e) {
                    }
                }
                clearTrade(bot, true);
                return;
            }
            st.negos = (st.negos || 0) + 1;
            if (st.negos > MAX_NEGO) {
                clearTrade(bot, true); // livelock guard
                return;
            }
            const theirs = partnerOffer(partner);
            if (acceptable(bot, st.myOffer, theirs, partner)) { // relationship-aware bargain
                st.stage = 'accepting';
                break;
            }
            // not fair yet -> trim the offer to reach fairness.
            if (st.trims < MAX_TRIMS) {
                const trimmed = trimOffer(st.myOffer);
                if (trimmed && marketValue(trimmed) < marketValue(st.myOffer)) {
                    st.myOffer = trimmed;
                    st.trims += 1;
                    try {
                        bot.trade.updateItems(st.myOffer);
                    } catch (e) {
                        clearTrade(bot, true);
                        return;
                    }
                    st.t = delay(3, 8);
                    break;
                }
            }
            // can't make it fair -> walk away.
            clearTrade(bot, true);
            return;
        }

        case 'accepting':
            if (!bot.trade.accepted) {
                try {
                    bot.trade.accept();
                } catch (e) {
                    clearTrade(bot, true);
                    return;
                }
            }
            st.stage = 'confirming';
            st.t = delay(40, 80);
            break;

        case 'confirming':
            // the accept was voided (someone changed the offer) -> re-judge it.
            if (!bot.trade.accepted) {
                st.stage = 'negotiating';
                st.t = delay(2, 6);
                break;
            }
            if (partner.trade && partner.trade.accepted) {
                if (!bot.trade.confirmAccepted) {
                    try {
                        // snapshot both offers now (wiped on completion) for the gift/swap check.
                        st.gaveValue = marketValue(st.myOffer || []);
                        st.gotValue = marketValue(partnerOffer(partner));
                        bot.trade.confirmAccept();
                        st.confirmed = true;
                    } catch (e) {
                        clearTrade(bot, true);
                        return;
                    }
                }
            }
            st.t -= 1;
            if (st.t <= 0) {
                clearTrade(bot, true);
            }
            break;

        default:
            clearTrade(bot, true);
    }
}

// per-tick: run an in-flight trade to completion, else occasionally answer or start one.
function onTick(bot) {
    if (bot._trade || (bot.interfaceOpen && bot.interfaceOpen.trade)) {
        if (!bot._trade) {
            // in a trade screen with no state of its own -> back out.
            try {
                bot.trade.decline();
            } catch (e) {
            }
            return;
        }
        advance(bot);
        return;
    }

    if (busy(bot)) {
        return;
    }

    // answer or reject an incoming request (before the initiate-cooldown gate, so cooling-down bots still answer).
    if (bot.trade && bot.trade.requests && bot.trade.requests.size > 0) {
        let requester = null;
        for (const r of bot.trade.requests) {
            requester = r;
            break;
        }
        if (!requester || requester.username == null) {
            return;
        }
        // decline if it's an enemy, the bot never trades, or it isn't in the mood.
        if (isEnemyForTrade(bot, requester) || !willingToRespond(bot) || !inTheMoodToTrade(bot)) {
            rejectRequest(bot, requester);
            return;
        }
        if (!(requester.hasInterfaceOpen && requester.hasInterfaceOpen() && !requester.interfaceOpen.trade)) {
            try {
                bot.trade.request(requester); // reciprocate -> opens both screens
            } catch (e) {
                return;
            }
            bot._trade = { partner: requester, stage: 'offering', t: delay(2, 6) };
        }
        return;
    }

    // a bot with wares or a keen need hawks it to nearby people (rate-limited, only with an audience).
    try { marketCry(bot); } catch (e) {  }

    // otherwise, maybe start a trade (gated by the cooldown).
    if (bot._tradeCd > 0) {
        bot._tradeCd -= 1;
        return;
    }

    // low on a consumable, with coins, and a nearby seller carrying it -> buy it off them.
    if (countItem(bot, COINS_ID) > COIN_RESERVE) {
        const seller = findSeller(bot, carriedNeeds(bot));
        if (seller && seller.partner.username != null) {
            try {
                bot.trade.request(seller.partner);
            } catch (e) {
                return;
            }
            say(bot, BUY_OPENERS[Math.floor(Math.random() * BUY_OPENERS.length)]);
            bot._trade = { partner: seller.partner, stage: 'requesting', t: delay(20, 40), buying: seller.itemId };
            return;
        }
    }

    // a producer with saleable stock trades even if it isn't a configured trader; a non-trader with nothing to sell stays out.
    const wares = hasStock(bot);
    if (level(bot) <= 0 && !wares) {
        return;
    }
    let wantTrade = appetite(bot);
    if (wares) { wantTrade = Math.max(wantTrade, 0.15 + personality.of(bot).sociability * 0.2); }
    if (Math.random() >= wantTrade) {
        bot._tradeCd = delay(20, 50);
        return;
    }
    const partner = findPartner(bot);
    if (!partner) {
        bot._tradeCd = delay(30, 70);
        return;
    }
    try {
        bot.trade.request(partner);
    } catch (e) {
        return;
    }
    // a maker hawks its wares; a plain trader gives the generic opener.
    say(bot, wares ? WARE_OPENERS[Math.floor(Math.random() * WARE_OPENERS.length)] : OPENERS[Math.floor(Math.random() * OPENERS.length)]);
    bot._trade = { partner, stage: 'requesting', t: delay(20, 40) };
}

module.exports = {
    onTick,
    level,
    appetite,
    generosity,
    chooseOffer,
    willingToRespond,
    carriedNeeds,
    sellerNearby,
    subjectiveValue,
    marketValue,
    acceptable,
    trimOffer,
    fairnessRatio,
    givingValue,
    spareItems,
    isStock,
    stockItems,
    hasStock,
    partnerScore,
    marketCry,
    priceOf,
    priceOfBase,
    isEnemyForTrade,
    findPartner
};
