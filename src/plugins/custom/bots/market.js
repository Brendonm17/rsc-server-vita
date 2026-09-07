// market: an emergent economy layered over the bot-to-bot trade engine
// (trades.js). every completed trade reports the unit price a good cleared at,
// and the market keeps a rolling supply/demand-adjusted quote per item that
// drifts from the flat shop price toward what bots actually pay. merchants price
// and cry their wares from the quote; the quote feeds back into trades.js
// valuation, so a glut softens prices and scarcity firms them.
//
// state is live per server session and self-decays, so old pressure fades.

const personality = require('./personality');

const COINS_ID = 10;
const EMA = 0.2;         // how fast a quote tracks the latest clearing price
const DECAY = 0.985;     // per-decay-tick fade of demand/supply pressure
const SKEW_K = 0.05;     // how hard net demand bends the price
const MIN_MULT = 0.5, MAX_MULT = 2.0;

// itemId -> { ema, n, demand, supply }
const board = {};

function entry(id) {
    if (!board[id]) board[id] = { ema: 0, n: 0, demand: 0, supply: 0 };
    return board[id];
}

// a good changed hands at unit coins each; blend it into the quote
function report(id, unit) {
    if (id === COINS_ID || !(unit > 0)) return;
    const e = entry(id);
    e.ema = e.n ? e.ema * (1 - EMA) + unit * EMA : unit;
    e.n += 1;
}

// somebody wants this (a buyer); firms the price
function noteDemand(id, w) { if (id !== COINS_ID) entry(id).demand += (w || 1); }
// somebody's offering this (surplus); softens the price
function noteSupply(id, w) { if (id !== COINS_ID) entry(id).supply += (w || 1); }

// the live supply/demand-skewed quote; base (flat shop price) seeds it before
// any trades and anchors items that never clear
function quote(id, base) {
    const e = board[id];
    let anchor = e && e.n > 0 ? e.ema : (base || 0);
    if (!anchor) { return base || 0; }
    // anti-inflation clamp: reported clears skew high, so clamp the anchor to a
    // band around the flat shop base so the quote can't drift far from reality
    if (base > 0) { const lo = base * 0.5, hi = base * 2; anchor = anchor < lo ? lo : (anchor > hi ? hi : anchor); }
    if (!e) { return anchor; }
    const net = e.demand - e.supply;
    let mult = 1 + net * SKEW_K;
    if (mult < MIN_MULT) mult = MIN_MULT; else if (mult > MAX_MULT) mult = MAX_MULT;
    return anchor * mult;
}

// trade cleared: attribute a rough unit price to every non-coin good
// (coins on one side / non-coin quantity = what the goods went for)
function reportTrade(offerA, offerB) {
    const sides = [offerA || [], offerB || []];
    let coins = 0, goods = [];
    for (const side of sides) {
        for (const it of side) {
            if (it.id === COINS_ID) coins += it.amount || 0;
            else goods.push(it);
        }
    }
    const totalQty = goods.reduce((s, it) => s + (it.amount || 1), 0);
    for (const it of goods) {
        // price a good at the coins it fetched, else the shop price so barter
        // still nudges the quote
        const unit = coins > 0 && totalQty > 0 ? coins / totalQty : 0;
        if (unit > 0) report(it.id, unit);
        noteSupply(it.id, 0.5);
    }
}

// fade pressure so the market breathes (throttled from onTick)
function decay() {
    for (const id of Object.keys(board)) {
        const e = board[id];
        e.demand *= DECAY;
        e.supply *= DECAY;
    }
}

const ITEM_DEFS = require('@2003scape/rsc-data/config/items');
function itemName(bot, id) {
    try {
        const d = ITEM_DEFS[id];
        return (d && (d.name || d)) || ('item ' + id);
    } catch (e) { return 'goods'; }
}

function isCoins(id) { return id === COINS_ID; }

// a merchant with spare stock cries an offer to nearby folk, priced from the
// live quote with a markup. registers the surplus as supply. chat only
function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._mktDecayCd == null) bot._mktDecayCd = 0;
    if (bot._mktDecayCd-- <= 0) { decay(); bot._mktDecayCd = 200; }

    if (bot._mktCd && bot._mktCd > 0) { bot._mktCd -= 1; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.4) return false;

    // what this bot is short of firms the price of those goods (demand)
    try {
        const need = require('./trades').carriedNeeds(bot);
        if (need && need.forEach) need.forEach((id) => noteDemand(id, 0.5));
    } catch (e) {}

    // must be a trader with spare stock and an audience
    let spare = [];
    try { spare = require('./trades').spareItems(bot, 3) || []; } catch (e) { return false; }
    spare = spare.filter((it) => !isCoins(it.id) && (it.amount || 1) >= 1);
    if (!spare.length) return false;
    // register everything on offer as supply pressure
    for (const it of spare) noteSupply(it.id, 0.5);

    let audience = false;
    try { audience = bot.getNearbyEntities('players', 6).some((o) => o && o !== bot && o.id !== bot.id); } catch (e) { return false; }
    if (!audience) { bot._mktCd = 40; return false; }

    // only merchants cry every time; others rarely bother.
    let role = 'adventurer';
    try { role = require('./role').role(bot); } catch (e) {}
    const chatty = role === 'merchant' ? 0.5 : 0.12;
    if (Math.random() > chatty) { bot._mktCd = 120; return false; }

    const pick = spare[Math.floor(Math.random() * spare.length)];
    let base = 0;
    try { base = require('./trades').priceOfBase(pick.id); } catch (e) {}
    const q = quote(pick.id, base) * (1.05 + p.greed * 0.35); // merchant markup
    const price = Math.max(1, Math.round(q));
    const name = itemName(bot, pick.id);
    // dynamic cry from the generative engine, else a fallback
    let out = null;
    try { out = require('./chatgen').generate('marketCry', { item: name, price }, bot); } catch (e) {}
    if (!out) {
        const line = pick.amount > 1 ? 'selling ' + name + ' - ' + price + ' each!' : name + ' for sale, ' + price + ' coins!';
        out = line; try { out = require('./voice').apply(bot, line); } catch (e) {}
    }
    // a market cry is heard (dispatched, no _reactionSpeak) so nearby traders can
    // answer it via hearing's trade intent. loop-safe (answers are reactions)
    try { bot.broadcastChat(out); } catch (e) {}
    bot._mktCd = 300 + Math.floor(Math.random() * 300);
    return true;
}

module.exports = { report, reportTrade, noteDemand, noteSupply, quote, decay, onTick, _board: board };
