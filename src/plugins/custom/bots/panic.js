// panic: a bot losing badly to a monster far above its level breaks off and runs.
// personality sets the nerve; monster fights only (pvp escape is the combat brain's).

const personality = require('./personality');

function combatLevelOf(e, fallback) {
    return e && e.getCombatLevel ? e.getCombatLevel() : (e && e.combatLevel) || fallback;
}

// should the bot flee right now
function shouldFlee(bot) {
    const foe = bot.opponent;
    if (!foe || foe.username) return false; // not fighting, or fighting a player
    const myCl = combatLevelOf(bot, 3);
    const foeCl = combatLevelOf(foe, myCl);
    const p = personality.of(bot);
    // tolerated gap: cautious ~1.4x, brave/reckless up to ~2.7x its own level
    const tolerated = 1.4 + p.risk * 0.9 + p.aggression * 0.4;
    // max hp is base, not max (bot skills are {current, base, experience}, no .max)
    const h = bot.skills && bot.skills.hits;
    const hpFrac = h && h.base ? h.current / h.base : 1;
    return foeCl > myCl * tolerated && hpFrac < 0.6;
}

// step one tile directly away from the remembered threat via threat.flinchStep
function fleeStep(bot) {
    if (!bot._fleeFrom) { return false; }
    let step = null;
    try { step = require('./threat').flinchStep(bot, bot._fleeFrom); } catch (e) { step = null; }
    if (!step) { return false; }
    if (bot.walkQueue) { bot.walkQueue.length = 0; }
    bot.walkQueue = [step];
    return true;
}

function onTick(bot) {
    if (shouldFlee(bot)) {
        const foe = bot.opponent;
        try { if (typeof bot.retreat === 'function') bot.retreat(); } catch (e) {  } // break the combat lock
        if (foe) { bot._fleeFrom = { x: foe.x, y: foe.y }; } // remember where the danger is, to run from it
        bot._fleeing = 10;
        // mark this ground risky and warn nearby bots
        try { require('./threat').warnNearby(bot, foe); } catch (e) {  }
        if (!bot._panicSaid) {
            bot._panicSaid = true;
            try {
                const line = 'too strong - run!';
                let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {  }
                bot._reactionSpeak = true;
                try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
            } catch (e) {  }
        }
        fleeStep(bot); // move this tick
        return true;
    }
    bot._panicSaid = false; // reset so a fresh scare shouts again
    // keep running for the rest of the flee window after the combat lock broke
    if (bot._fleeing && bot._fleeing > 0) {
        bot._fleeing -= 1;
        if (fleeStep(bot)) { return true; }
        bot._fleeFrom = null; // can't step away, stop fleeing
    }
    return false;
}

module.exports = { onTick, shouldFlee, fleeStep };
