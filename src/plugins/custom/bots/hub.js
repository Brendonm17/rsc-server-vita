// congregation: a sociable, good-mood bot in a free moment sometimes goes to
// hang out at a bank/square with whoever's there, then drifts back. this forms
// the crowded-bank scenes and gives idle time a destination. it's an interrupt:
// while loitering the bot yields its work brain but every other poller
// (events/social/trades/conversation) keeps running, so the crowd stays alive.

const travel = require('./travel');
const personality = require('./personality');

let _mood;
function moodMod() { return _mood || (_mood = require('./mood')); }

// social hubs: the real banks plus a couple town squares. banks come from the
// waypoint facilities; squares are added by hand
let _hubs = null;
function hubs() {
    if (_hubs) { return _hubs; }
    _hubs = [];
    try {
        const F = travel.FACILITIES || {};
        for (const name of Object.keys(F)) {
            if (/bank/.test(name)) { const t = F[name].target || F[name]; if (t && t.x != null) { _hubs.push({ name: name.replace(/_/g, ' '), x: t.x, y: t.y }); } }
        }
    } catch (e) {}
    // town squares (real routable tiles), the other place players stand about
    _hubs.push({ name: 'Falador square', x: 308, y: 542 });
    _hubs.push({ name: 'Varrock square', x: 131, y: 507 });
    _hubs.push({ name: 'Lumbridge courtyard', x: 122, y: 649 });
    if (!_hubs.length) { _hubs.push({ name: 'Lumbridge', x: 122, y: 657 }); }
    return _hubs;
}

function moodOf(bot) { try { return moodMod().of(bot); } catch (e) { return { valence: 0.5, energy: 0.5, confidence: 0.5 }; } }

// coarse virtual time of day (0..1) from world ticks, a ~2.4h day. drives a
// diurnal rhythm so the world has evenings and quiet late nights
const VDAY = 13500;
function dayPhase(bot) {
    const t = (bot.world && bot.world.ticks) || 0;
    return (t % VDAY) / VDAY;
}
// does the bot hold saleable wares?
function hasWares(bot) { try { return require('./trades').hasStock(bot); } catch (e) { return false; } }

// does the bot fancy company now? sociable, upbeat, occasional, and more in the
// evening. a bot carrying wares is also drawn to the crowd to sell
function wantsToHangOut(bot) {
    const p = personality.of(bot);
    const wares = hasWares(bot);
    if (p.sociability < 0.35 && !wares) { return false; }   // loners don't loiter, but they'll still go to trade
    const m = moodOf(bot);
    let vet = 0; try { vet = require('./evolve').stage(bot) === 'veteran' ? 0.015 : 0; } catch (e) {} // elders socialise more
    const ph = dayPhase(bot);
    const evening = (ph > 0.6 && ph < 0.85) ? 0.022 : (ph > 0.9 || ph < 0.08) ? -0.005 : 0;
    const sell = wares ? 0.02 + p.greed * 0.02 : 0;         // a keen trader takes its stock to market
    const chance = 0.006 + p.sociability * 0.02 + Math.max(0, m.valence - 0.5) * 0.02 + vet + evening + sell;
    return Math.random() < chance;
}

function nearestHub(bot, banksOnly) {
    let best = null, bd = Infinity;
    for (const h of hubs()) {
        if (banksOnly && !/bank/i.test(h.name)) { continue; }
        const d = Math.abs(bot.x - h.x) + Math.abs(bot.y - h.y);
        if (d < bd) { bd = d; best = h; }
    }
    return best;
}

const HANGOUT = [
    'nice spot to catch your breath.', 'anyone up to much today?', 'just having a breather.',
    'always someone about here.', 'good to see a few faces around.', 'lovely day for it.'
];
function sayHangout(bot) {
    try {
        bot._reactionSpeak = true;
        try { bot.broadcastChat(HANGOUT[Math.floor(Math.random() * HANGOUT.length)]); } finally { bot._reactionSpeak = false; }
    } catch (e) {}
}

// per-tick: drive a hub visit if one is in progress, or occasionally start one.
// returns true when it owns the tick (the manager then skips the work brain)
function onTick(bot) {
    const v = bot._hubVisit;
    if (v) {
        if (v.phase === 'travel') {
            if (Math.abs(bot.x - v.x) + Math.abs(bot.y - v.y) <= 4) {
                v.phase = 'loiter';
                bot._travel = null;
                if (bot.walkQueue) { bot.walkQueue.length = 0; }
                return true;
            }
            v.ticks = (v.ticks || 0) + 1;
            if (v.ticks > 600 || (!travel.isTraveling(bot) && !travel.begin(bot, { x: v.x, y: v.y }))) {
                bot._hubVisit = null; bot._hubCd = 400; // couldn't get there -> try again much later
                return false;
            }
            travel.step(bot);
            return true;
        }
        // loiter: stand about for a while (chatting via other pollers), then drift back
        v.left -= 1;
        if (v.left <= 0) {
            bot._hubVisit = null;
            bot._hubCd = 900 + Math.floor(Math.random() * 1800); // don't loiter again for a long while
            return false;
        }
        // a stall-holder hawks its wares (marketCry self-limits); everyone else makes
        // idle small talk
        if (v.selling && hasWares(bot)) { try { require('./trades').marketCry(bot); } catch (e) {} }
        else if (Math.random() < 0.01) { sayHangout(bot); }
        return true; // stay put; the work brain yields
    }
    // maybe set off to hang out, only from a free moment (never interrupt combat,
    // a walk, or an in-flight errand)
    if (bot._hubCd && bot._hubCd > 0) { bot._hubCd -= 1; return false; }
    try { if (require('./pacing').isBusy(bot)) { return false; } } catch (e) {}
    if (!wantsToHangOut(bot)) { return false; }
    // a seller heads to a bank (where buyers gather); a guild member sometimes goes
    // to its own hall; otherwise the nearest bank/square
    const selling = hasWares(bot);
    let h = null;
    if (selling && Math.random() < 0.7) { h = nearestHub(bot, true); } // to market with the wares
    if (!h) {
        try {
            const gh = require('./guilds').guildHub(bot);
            if (gh && Math.random() < 0.35) { h = gh; }
        } catch (e) {}
    }
    if (!h) { h = nearestHub(bot); }
    if (!h) { return false; }
    // already here? loiter in place, else trek over
    const here = Math.abs(bot.x - h.x) + Math.abs(bot.y - h.y) <= 4;
    bot._hubVisit = { name: h.name, x: h.x, y: h.y, phase: here ? 'loiter' : 'travel', ticks: 0, left: 250 + Math.floor(Math.random() * 400), selling: selling };
    if (!here) { travel.begin(bot, { x: h.x, y: h.y }); }
    return true;
}

// is the bot hanging out at or heading to a hub? (for pacing.isBusy and display)
function isHubbing(bot) { return !!bot._hubVisit; }

module.exports = { onTick, wantsToHangOut, isHubbing, hubs };
