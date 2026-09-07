// per-bot fall-and-recovery driven by mood valence
// voices a slump when down long enough, and a comeback when it recovers

const LOW = 0.3;       // valence at/below this is low
const RECOVER = 0.55;  // valence at/above this after a low spell is a recovery
const LOW_TICKS = 60;  // sustained low this long counts as a slump

// memoised lazy requires
let _mood, _pers, _chatgen;
function moodMod() { return _mood || (_mood = require('./mood')); }
function persMod() { return _pers || (_pers = require('./personality')); }
function chatgenMod() { return _chatgen || (_chatgen = require('./chatgen')); }

function speak(bot, situation) {
    let line = null;
    try { line = chatgenMod().generate(situation, {}, bot); } catch (e) {  }
    if (!line) return false;
    // said aloud so a neighbour can pick it up
    try { bot.broadcastChat(line); } catch (e) {  }
    return true;
}

function onTick(bot) {
    if (bot.opponent || bot.locked) return false;
    let m = null;
    try { m = moodMod().of(bot); } catch (e) { return false; }
    if (!m) return false;

    const v = m.valence;
    // track how long the bot has been down
    if (v <= LOW) bot._lowStreak = (bot._lowStreak || 0) + 1;
    else bot._lowStreak = 0;

    if (bot._fortuneCd && bot._fortuneCd > 0) { bot._fortuneCd -= 1; return false; }

    let p = null; try { p = persMod().of(bot); } catch (e) { p = null; }
    const social = !p || p.sociability >= 0.35; // a loner keeps its lows private

    // mark the slump once mood's been low long enough
    if (!bot._inSlump && bot._lowStreak >= LOW_TICKS) bot._inSlump = true;

    // comeback: recovered after a slump, mark the turnaround
    if (bot._inSlump && v >= RECOVER) {
        if (!social) { bot._inSlump = false; bot._slumpVoiced = false; bot._fortuneCd = 300; return false; }
        if (Math.random() < 0.7 && speak(bot, 'comeback')) {
            bot._inSlump = false; bot._slumpVoiced = false;
            bot._fortuneCd = 1500 + Math.floor(Math.random() * 1500);
            return true;
        }
        bot._fortuneCd = 300; // stays recovered-in-slump and tries again
        return false;
    }

    // voice the despair: while down, say so once, then quiet until mood turns
    if (bot._inSlump && !bot._slumpVoiced && v <= LOW) {
        if (social && Math.random() < 0.5) {
            bot._slumpVoiced = true;
            if (speak(bot, 'despair')) { bot._fortuneCd = 1500 + Math.floor(Math.random() * 1500); return true; }
        }
        bot._fortuneCd = 300;
        return false;
    }

    bot._fortuneCd = 120;
    return false;
}

module.exports = { onTick };
