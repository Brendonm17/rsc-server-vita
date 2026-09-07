// crowd: when several bots gather in one spot they slowly warm to each other
// (social-emergent), and now and then one remarks on the throng

const personality = require('./personality');

// memoised cross-module lookups (resolve once, not per tick)
const _m = {};
function mod(name) { return _m[name] || (_m[name] = require('./poller-registry').get(name)); }

const MIN_CROWD = 3;        // this many OTHER bots around = a real crowd
const BOND = 0.12;          // warmth per bonding tick toward each crowd-mate (friend = 5)

function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) {
        return false;
    }
    if (bot._crowdCd && bot._crowdCd > 0) { bot._crowdCd -= 1; return false; }

    // the throng is every nearby player, bots and the human alike
    const crowd = mod('presence').nearbyPeers(bot, 5);
    if (crowd.length < MIN_CROWD) { bot._crowdCd = 40; return false; }

    // warms the bot to each crowd-mate a little, so strangers drift toward friendship;
    // but two aggressive bots bristle instead and drift toward rivalry
    let iClash = false;
    try { iClash = personality.of(bot).aggression > 0.55; } catch (e) {}
    try {
        const se = mod('social-emergent');
        for (const o of crowd) {
            if (!o.username) { continue; }
            let amt = BOND;
            if (iClash && o.isBot) { try { if (personality.of(o).aggression > 0.55) { amt = -BOND; } } catch (e) {} }
            se.noteInteraction(bot, o.username, amt);
        }
    } catch (e) {}
    bot._crowdCd = 250 + Math.floor(Math.random() * 200);

    // sometimes a sociable one voices it, if presence says the air isn't already full
    const p = personality.of(bot);
    if (p.sociability < 0.5) { return true; }
    if (Math.random() > 0.25) { return true; }
    if (!mod('presence').mayChatter(bot)) { return true; }

    // the opener usually carries a subject others can pick up (what the bot is doing)
    let line = null;
    try {
        const roll = Math.random();
        if (roll < 0.4) {
            line = mod('hearing').activityLine(bot, true); // "training mining at Al Kharid"
        } else if (roll < 0.6) {
            const g = mod('goals').current(bot);
            if (g && g.text) {
                const forms = ['aiming to ' + g.text + ', me.', g.text + ' is the plan today.', "i'm set on " + g.text + '.'];
                line = forms[Math.floor(Math.random() * forms.length)];
            }
        }
    } catch (e) {}
    if (!line) {
        try { line = mod('chatgen').generate('crowd', {}, bot); } catch (e) {}
    }
    if (!line) { return true; }
    try {
        bot._reactionSpeak = true;
        try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
        mod('presence').noteChatter(bot);
    } catch (e) {}
    return true;
}

module.exports = { onTick };
