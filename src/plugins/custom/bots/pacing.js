// bot pacing: reaction delay, occasional afk, active/lull rhythm and idle fidgets.
// gates only idle decisions, never a busy bot (see isBusy)

const mood = require('./mood');
const personality = require('./personality');

// bot is busy if the engine or an in-flight task owns it
function isBusy(bot) {
    return !!(
        // a duel is never interrupted by a trip
        (bot.duel && (bot.duel.isDuelActive() || (bot.interfaceOpen && bot.interfaceOpen.duel))) ||
        bot.opponent ||
        bot.locked ||
        (bot.walkQueue && bot.walkQueue.length) ||
        bot._bankRun ||
        bot._shopTrip ||
        bot._gearRun ||
        bot._foodRun ||
        bot._ammoRun ||
        bot._runeRun ||
        bot._processTrip ||
        bot._needTrip ||
        bot._agilityRun ||
        bot._prayerRun ||
        bot._spawnRun ||
        bot._trade || // trade in progress; don't let a poller walk the bot out of range
        (bot.interfaceOpen && bot.interfaceOpen.trade) ||
        bot._deathRun ||
        bot._quest ||
        bot._alching ||
        bot._relocateSite ||
        bot._wanderTrek ||
        bot._hubVisit ||
        // in a party -> stay responsive (assist / boss turn-taking)
        (bot.party && bot.party.members && bot.party.members.length > 1)
    );
}

function state(bot) {
    let p = bot._pace;
    if (!p) {
        // start in an active stretch, not a lull
        p = bot._pace = {
            rest: 0,
            phase: 'active',
            phaseLeft: 150 + Math.floor(Math.random() * 400)
        };
    }
    return p;
}

// base chance to hesitate this idle tick (patient/tired bots more)
function hesitateChance(bot) {
    const per = personality.of(bot);
    const m = mood.of(bot);
    let c = 0.1 + (per.patience || 0.5) * 0.15;
    if (m.energy < 0.4) {
        c += 0.2;
    }
    return c;
}

// should the bot act this tick? false = take a beat. idle bots only (see isBusy)
function act(bot) {
    const p = state(bot);

    // in an AFK rest -> keep idling until it passes
    if (p.rest > 0) {
        p.rest -= 1;
        return false;
    }

    // session rhythm: long stretches of focus, shorter lulls of slacking off
    if (p.phaseLeft <= 0) {
        if (p.phase === 'active') {
            p.phase = 'lull';
            p.phaseLeft = 40 + Math.floor(Math.random() * 120);
        } else {
            p.phase = 'active';
            p.phaseLeft = 150 + Math.floor(Math.random() * 400);
        }
    }
    p.phaseLeft -= 1;

    // occasional afk: usually a brief glance-away, rarely a minutes-long step-away
    // (says brb). if attacked, isBusy short-circuits pacing so the bot still defends
    const energy = mood.of(bot).energy;
    if (Math.random() < 0.008 + (energy < 0.3 ? 0.02 : 0)) {
        if (Math.random() < 0.16) {                       // ~1 in 6 AFKs is a proper stepped-away
            p.rest = 120 + Math.floor(Math.random() * 200); // ~1.5-3.5 min at 640ms/tick; a longer stand reads as a frozen bot
            sayAfk(bot);
        } else {
            p.rest = 3 + Math.floor(Math.random() * 10);
        }
        return false;
    }

    let chance = hesitateChance(bot);
    if (p.phase === 'lull') {
        chance += 0.3; // slacking -> pause far more often
    }

    return Math.random() >= chance;
}

const AFK_LINES = ['brb', 'afk a sec', 'one sec', 'back in a min', 'brb, kettle\'s on', 'hang on, door'];
function sayAfk(bot) {
    if (Math.random() >= 0.6) { return; } // usually a silent step-away; sometimes a heads-up
    try { bot._reactionSpeak = true; try { bot.broadcastChat(AFK_LINES[Math.floor(Math.random() * AFK_LINES.length)]); } finally { bot._reactionSpeak = false; } } catch (e) {}
}

// small idle tell while hesitating: change facing so the bot doesn't stand frozen
function fidget(bot) {
    if (Math.random() < 0.15 && typeof bot.faceDirection === 'function') {
        const dx = Math.floor(Math.random() * 3) - 1;
        const dy = Math.floor(Math.random() * 3) - 1;
        if (dx || dy) {
            try {
                bot.faceDirection(dx, dy);
            } catch (e) {
                // facing is cosmetic, never let it break the tick
            }
        }
    }
}

module.exports = { isBusy, act, fidget };
