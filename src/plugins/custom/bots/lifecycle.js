// bot lifecycle: after death a bot respawns at lumbridge having dropped items,
// then a timid or rattled one lies low for a while. also a stuck-bot watchdog.

const personality = require('./personality');
const mood = require('./mood');

// lazy memoised requires (avoid a circular require, keep off the hot path)
let _travel;
let _regions;
function travelMod() { return _travel || (_travel = require('./travel')); }
function regionsMod() { return _regions || (_regions = require('@2003scape/rsc-data/regions')); }

// called from BotPlayer.die(); sets the post-respawn "shaken" window by personality/mood
function onDeath(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) {
        return;
    }
    cb.deaths = (cb.deaths || 0) + 1;
    // remembered for conversation
    try {
        const k = bot.opponent;
        const killer = k && k.definition && k.definition.name ? k.definition.name.toLowerCase()
            : k && k.username ? (k.getFormattedUsername ? k.getFormattedUsername() : k.username) : 'something';
        require('./episodes').note(bot, 'death', { killer });
    } catch (e) {}
    // record where it died so it can run back for its dropped pile. called before
    // items drop, so bot.x/y is the death tile. only if more than kept-on-death drops.
    const keptOnDeath = 3 + (bot.prayers && bot.prayers[8] ? 1 : 0);
    const carried = bot.inventory && bot.inventory.items ? bot.inventory.items.length : 0;
    if (carried > keptOnDeath) {
        cb.deathSpot = { x: bot.x, y: bot.y };
    } else {
        cb.deathSpot = null;
    }
    const p = personality.of(bot);
    const brave = p.risk > 0.65 && mood.of(bot).confidence > 0.55;
    bot._recovering = brave ? 30 : 90 + Math.floor(Math.random() * 180);
}

// count down the post-death recovery window
function onTick(bot) {
    if (bot._recovering > 0) {
        bot._recovering -= 1;
    }
}

function deaths(bot) {
    return (bot.cache && bot.cache.bot && bot.cache.bot.deaths) || 0;
}

function recovering(bot) {
    return (bot._recovering || 0) > 0;
}

// after a death, should the bot play it safe (timid or rattled)?
function shaken(bot) {
    if (!recovering(bot)) {
        return false;
    }
    const p = personality.of(bot);
    const m = mood.of(bot);
    return p.risk < 0.5 || m.confidence < 0.4;
}

// watchdog: recover a bot stuck in place (not fighting, walking, gathering, or
// progressing) by clearing its transient state so its brain re-decides.
const STUCK_TICKS = 200; // ~2 minutes truly frozen -> reset

function watchdog(bot) {
    let w = bot._watch;
    if (!w) {
        w = bot._watch = { x: bot.x, y: bot.y, still: 0 };
    }
    // standing still on purpose is not stuck: talking, waiting on a followed player
    // or party, trading, or about to speak all count as social, not frozen
    const now = (bot.world && bot.world.ticks) | 0;
    let socially = false;
    if (bot._holdTicks > 0 || (bot._sayQueue && bot._sayQueue.length)) socially = true;
    if (!socially && bot.interfaceOpen && (bot.interfaceOpen.trade || bot.interfaceOpen.bank)) socially = true;
    if (!socially && bot._threads) {
        for (const k in bot._threads) {
            if (bot._threads[k] && now - bot._threads[k].lastTick <= 60) { socially = true; break; }
        }
    }
    if (!socially && (bot._follow || (bot.party && bot.party.members))) {
        try {
            const near = bot.getNearbyEntities('players', 12);
            for (const o of near) {
                if (!o || o === bot) continue;
                if (bot._follow && o.username === bot._follow.username) { socially = true; break; }
                if (bot.party && bot.party.members && !o.isBot && o.username && bot.party.members.indexOf(o) !== -1) { socially = true; break; }
            }
        } catch (e) {}
    }
    if (!socially && bot._wakeTick && now < bot._wakeTick) socially = true;

    const active =
        bot.x !== w.x ||
        bot.y !== w.y ||
        bot.walkQueue.length ||
        bot.opponent ||
        bot.locked ||
        bot.gatheringSkill ||
        socially;

    if (active) {
        w.x = bot.x;
        w.y = bot.y;
        w.still = 0;
        // reset the ladder only after sustained self-movement, not the one active tick after a rescue hop
        w.activeStreak = (w.activeStreak || 0) + 1;
        if (w.activeStreak >= 50) {
            w.frozen = 0;
        }
        return false;
    }
    w.activeStreak = 0;

    w.still += 1;
    if (w.still <= STUCK_TICKS) {
        return false;
    }

    // truly frozen only when the bot wants to be somewhere and isn't getting there;
    // a bot with no travel intent is idle, not stuck: reset task state, don't teleport.
    // every trip flag a bot can carry (matches pacing.isBusy); a bot wedged during
    // any of them must reach the rescue ladder below.
    const wantsToMove = !!(bot._travel || bot._chatGoto || bot._follow || bot._wanderTrek ||
        bot._bankRun || bot._shopTrip || bot._gearRun || bot._foodRun || bot._quest ||
        bot._ammoRun || bot._runeRun || bot._processTrip || bot._needTrip || bot._agilityRun ||
        bot._prayerRun || bot._spawnRun || bot._deathRun || bot._relocateSite || bot._hubVisit ||
        bot._auctionRun);
    if (!wantsToMove) {
        w.still = 0;
        w.frozen = 0;
        bot._relocateSite = null;
        return false;
    }

    // frozen too long, drop every in-flight transient task and queue
    bot._travel = null;
    bot._bankRun = null;
    bot._shopTrip = null;
    bot._gearRun = null;
    bot._auctionRun = null;
    bot._foodRun = null;
    bot._ammoRun = null;
    bot._runeRun = null;
    bot._quest = null;
    bot._relocateSite = null;
    bot._processTrip = null;
    bot._needTrip = null;
    bot._agilityRun = null;
    bot._wanderTrek = false;
    bot._alching = false;
    if (bot.walkQueue) {
        bot.walkQueue.length = 0;
    }
    if (bot.locked) {
        try {
            bot.unlock();
        } catch (e) {
            // best-effort
        }
    }
    w.still = 0;

    // escalation on a repeat freeze: 2nd -> travel.rescue hops onto the waypoint
    // graph; 3rd+ -> hard recover to the lumbridge respawn.
    w.frozen = (w.frozen || 0) + 1;
    // say it's stuck first, so a witnessed hop reads as a reaction not a glitch
    if (w.frozen >= 2) {
        try {
            bot.broadcastChat(w.frozen === 2
                ? ["hang on, i'm stuck.", "can't seem to get past here...", "one sec, stuck on something."][Math.floor(Math.random() * 3)]
                : ["right, this isn't working. starting over from lumbridge.", "how did i even get here? back to lumbridge.", "stuck for good. heading back to lumbridge."][Math.floor(Math.random() * 3)]);
        } catch (e) {}
    }
    if (w.frozen === 2) {
        try {
            if (travelMod().rescue(bot)) {
                w.x = bot.x;
                w.y = bot.y;
            }
        } catch (e) {
            // best-effort, fall through to the respawn backstop next freeze
        }
    } else if (w.frozen >= 3) {
        try {
            const L = regionsMod().lumbridge;
            if (typeof bot.teleport === 'function') {
                try { bot.teleport(L.spawnX, L.spawnY); } catch (e) { bot.x = L.spawnX; bot.y = L.spawnY; }
            } else {
                bot.x = L.spawnX;
                bot.y = L.spawnY;
            }
            w.x = bot.x;
            w.y = bot.y;
            w.frozen = 0; // recovered onto known-good ground, start the ladder over
        } catch (e) {
            // best-effort
        }
    }
    return true;
}

module.exports = { onDeath, onTick, deaths, recovering, shaken, watchdog };
