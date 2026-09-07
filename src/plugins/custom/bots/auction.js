// bots use the auction house like a human: list loot with a clerk when the
// market pays better than a shop and one is a short walk off, buy listings that
// undercut their own valuation, and collect coins and unsold goods at the bank.

const travel = require('./travel');
const mapData = require('./map-data');
const trades = require('./trades');
const economy = require('./economy');
const marketQuotes = require('./market');
const items = require('@2003scape/rsc-data/config/items');

const COINS_ID = 10;
const AUCTION_NPC_IDS = [796, 797]; // auctioneer, auction clerk
const MAX_LISTINGS = 3;
const MIN_LOT_VALUE = 60; // coins
const SHOP_FLOOR = 0.6; // shop pays below this share of worth
const MAX_WALK = 120; // tiles
const NEAR = 3;

function market(bot) {
    return bot.world && bot.world.market ? bot.world.market : null;
}

function myListings(bot) {
    const m = market(bot);
    return m ? m.getAuctionItems().filter((it) => it.seller === bot.id) : [];
}

function tradeable(id) {
    const def = items[id];
    return !!def && id !== COINS_ID && !def.untradeable;
}

// count a non-stackable slot as one item regardless of amount field
function count(bot, id) {
    const stackable = !!(items[id] && items[id].stackable);
    let n = 0;
    for (const it of bot.inventory.items) {
        if (it.id === id) n += stackable ? (it.amount || 1) : 1;
    }
    return n;
}

// pick the lot worth the most at market quote, when the market beats a shop
function planListing(bot) {
    if (myListings(bot).length >= MAX_LISTINGS) return null;
    let best = null;
    const seen = new Set();
    for (const { id } of economy.sellableLoot(bot)) {
        if (seen.has(id) || !tradeable(id)) continue;
        seen.add(id);
        const qty = count(bot, id);
        if (!qty) continue;
        const base = trades.priceOfBase(id);
        if (!base) continue;
        const unit = Math.max(1, Math.round(marketQuotes.quote(id, base)));
        if (unit < base * SHOP_FLOOR || unit * qty < MIN_LOT_VALUE) continue;
        const lot = { id, amount: qty, price: unit * qty };
        if (!best || lot.price > best.price) best = lot;
    }
    return best;
}

// find a listing offering something the bot needs at or below its valuation and
// within its purse
function planPurchase(bot) {
    const m = market(bot);
    if (!m) return null;
    const need = trades.carriedNeeds(bot);
    if (!need.size) return null;
    const purse = count(bot, COINS_ID);
    let best = null;
    for (const it of m.getAuctionItems()) {
        if (it.seller === bot.id || !need.has(it.catalogID) || it.amountLeft < 1) continue;
        const unit = Math.floor(it.price / it.amountLeft);
        if (unit < 1 || unit > purse) continue;
        if (trades.subjectiveValue(bot, [{ id: it.catalogID, amount: 1 }]) < unit) continue;
        const amount = Math.max(1, Math.min(it.amountLeft, Math.floor(purse / unit), 5));
        const plan = { auctionID: it.auctionID, id: it.catalogID, amount, unit };
        if (!best || unit < best.unit) best = plan;
    }
    return best;
}

// whether an auction errand is worth starting
function shouldRun(bot) {
    if (!market(bot) || bot._auctionRun || bot.opponent || bot.locked) return false;
    if (bot._auctionCd && bot._auctionCd > 0) { bot._auctionCd -= 1; return false; }
    const plan = planPurchase(bot) || planListing(bot);
    if (!plan) { bot._auctionCd = 150; return false; }
    const site = mapData.nearestNpc(bot, AUCTION_NPC_IDS, { planeAware: true });
    if (!site || Math.abs(bot.x - site.x) + Math.abs(bot.y - site.y) > MAX_WALK) {
        bot._auctionCd = 600;
        return false;
    }
    bot._auctionRun = { phase: 'toClerk', returnTo: { x: bot.x, y: bot.y }, site, plan, ticks: 0 };
    return true;
}

function near(bot, coord, r) {
    return Math.abs(bot.x - coord.x) + Math.abs(bot.y - coord.y) <= (r || NEAR);
}

function say(bot, line) {
    try { bot.broadcastChat(line); } catch (e) {}
}

async function dealAtClerk(bot, plan) {
    const m = market(bot);
    if (!m) return;
    if (plan.auctionID != null) {
        const before = count(bot, COINS_ID);
        await m.buy(bot, plan.auctionID, plan.amount);
        if (count(bot, COINS_ID) < before) {
            marketQuotes.report(plan.id, plan.unit);
            marketQuotes.noteDemand(plan.id, plan.amount);
            say(bot, 'got ' + plan.amount + ' ' + items[plan.id].name.toLowerCase() + ' off the auction house.');
        }
        return;
    }
    const held = count(bot, plan.id);
    if (held < plan.amount) return;
    await m.create(bot, plan.id, plan.amount, plan.price);
    marketQuotes.noteSupply(plan.id, plan.amount);
    say(bot, 'listing ' + plan.amount + ' ' + items[plan.id].name.toLowerCase() + ' on the auction house.');
}

// one tick of the errand: walk to the clerk, deal, walk back
function tick(bot) {
    const r = bot._auctionRun;
    if (!r) return 'done';
    if ((r.ticks += 1) > 800) return 'done';

    if (r.phase === 'toClerk') {
        if (near(bot, r.site)) {
            r.phase = 'dealing';
            r.done = false;
            Promise.resolve(dealAtClerk(bot, r.plan))
                .catch(() => {})
                .then(() => { r.done = true; });
            return 'running';
        }
        if (!travel.isTraveling(bot)) {
            if (!travel.begin(bot, { x: r.site.x, y: r.site.y })) {
                bot._auctionCd = 600;
                return 'done';
            }
        }
        travel.step(bot);
        return 'running';
    }

    if (r.phase === 'dealing') {
        if (!r.done) return 'running';
        r.phase = 'return';
        bot._auctionCd = 400 + Math.floor(Math.random() * 400);
        travel.begin(bot, r.returnTo);
        return 'running';
    }

    if (r.phase === 'return') {
        if (near(bot, r.returnTo) || !travel.isTraveling(bot)) return 'done';
        travel.step(bot);
        return 'running';
    }

    return 'done';
}

// claim sold goods and coins waiting at the auction house
function collectAtBank(bot) {
    const m = market(bot);
    if (!m || !m.getCollectiblesFor(bot.id).length) return;
    Promise.resolve(m.addPlayerCollectItemsTask(bot)).catch(() => {});
}

module.exports = { shouldRun, tick, collectAtBank, planListing, planPurchase };
