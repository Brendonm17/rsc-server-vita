// scales the meta/society layer by a bot's combat level
// core social (greeting, chat, party, bonding) is never gated

const personality = require('./personality');

function combatOf(bot) {
    try {
        if (typeof bot.getCombatLevel === 'function') { return bot.getCombatLevel(); }
        if (typeof bot.combatLevel === 'number') { return bot.combatLevel; }
    } catch (e) {  }
    // unknown combat level: assume a grown bot
    return 99;
}

// 0 at combat 3, ramping to 1 by ~combat 35
function maturity(bot) {
    const cb = combatOf(bot);
    const m = (cb - 3) / (35 - 3);
    return m < 0 ? 0 : m > 1 ? 1 : m;
}

// how strongly the bot engages the meta society, multiplies a meta poller's activation
function socialAmbition(bot) {
    let a = 0.12 + 0.88 * maturity(bot);
    try {
        const p = personality.of(bot);
        a += (p.sociability - 0.5) * 0.15 + (p.aggression - 0.5) * 0.1;
    } catch (e) {  }
    return a < 0.08 ? 0.08 : a > 1 ? 1 : a;
}

// gameplay tilt: >= 1, ~1.6 for a newbie down to 1 for a veteran
function gameplayTilt(bot) {
    return 1 + (1 - maturity(bot)) * 0.6;
}

module.exports = { maturity, socialAmbition, gameplayTilt };
