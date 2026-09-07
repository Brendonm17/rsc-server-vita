// bot life stage (newbie/journeyman/veteran) biases behaviour, plus slow personality
// drift from lived experience (getting rich stokes greed)

const personality = require('./personality');

function totalLevel(bot) {
    let n = 0;
    if (bot.skills) for (const k of Object.keys(bot.skills)) n += (bot.skills[k] && bot.skills[k].base) || 1;
    return n;
}
function combatOf(bot) {
    return bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 3);
}

// a bot's life stage
function stage(bot) {
    const tl = totalLevel(bot);
    const cl = combatOf(bot);
    if (tl < 200 || cl < 20) return 'newbie';
    if (tl > 850 || cl > 70) return 'veteran';
    return 'journeyman';
}

// a newbie near a much stronger player asks it a game question; returns true if it asked
function newbieAsks(bot) {
    if (bot.opponent || bot.locked || bot._quest || bot._chain || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (stage(bot) !== 'newbie') return false;
    if (bot._askCd && bot._askCd > 0) { bot._askCd -= 1; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.35 && p.curiosity < 0.5) { bot._askCd = 400; return false; } // won't ask, long rest
    // rate-limit the scan itself, not just a successful ask
    bot._askCd = 25;
    let players;
    try { players = bot.getNearbyEntities('players', 5); } catch (e) { return false; }
    const cl = combatOf(bot);
    const vets = players.filter((pl) => pl && pl !== bot && pl.username !== bot.username && combatOf(pl) > cl + 20);
    if (!vets.length) return false;
    // prefer a human veteran; address them by name so it reaches them
    const vet = vets.find((pl) => !pl.isBot) || vets[0];
    if (Math.random() > (vet.isBot ? 0.4 : 0.7)) return false;
    bot._askCd = 250;
    const Qs = ['how do i make money?', 'what should i do next?', 'where do i train?', 'any tips for a newbie?', 'how do i get better gear?'];
    let q = Qs[Math.floor(Math.random() * Qs.length)];
    if (!vet.isBot) {
        const who = (vet.getFormattedUsername && vet.getFormattedUsername()) || vet.username;
        q = ['hey ' + who + ', ', who + ', ', 'excuse me ' + who + ', '][Math.floor(Math.random() * 3)] + q;
    }
    try {
        bot._reactionSpeak = true;
        try { bot.broadcastChat(q); } finally { bot._reactionSpeak = false; }
    } catch (e) {}
    return true;
}

// ambient drift: getting rich slowly stokes greed
function ambientDrift(bot) {
    const store = bot.cache && bot.cache.bot;
    if (!store) return;
    if (store._wealthMark == null) store._wealthMark = 0;
    let coins = 0;
    if (bot.inventory && bot.inventory.items) for (const it of bot.inventory.items) if (it.id === 10) coins += it.amount || 1;
    if (coins > store._wealthMark + 5000) {
        store._wealthMark = coins;
        personality.drift(bot, 'greed', 0.01);
    }
}

const RETIRE_LINES = [
    'you know what - i\'ve chased enough levels. think i\'ll just enjoy the place now.',
    'done grinding. i\'ve earned a quiet life around here.',
    'no more treadmill for me - off to potter about and catch up with folk.'
];
// a veteran with many dreams fulfilled eventually retires from chasing levels,
// leaning into leisure/social from then on
function maybeRetire(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb || cb.retired) { return; }
    if (stage(bot) !== 'veteran' || (cb.dreamsAchieved || 0) < 6) { return; }
    if (Math.random() < 0.0008) { // rare, a real life milestone
        cb.retired = true;
        try { bot._reactionSpeak = true; try { bot.broadcastChat(RETIRE_LINES[Math.floor(Math.random() * RETIRE_LINES.length)]); } finally { bot._reactionSpeak = false; } } catch (e) {}
        try { require('./personality').drift(bot, 'diligence', -0.05); } catch (e) {}
    }
}

function onTick(bot) {
    try { ambientDrift(bot); } catch (e) {}
    try { maybeRetire(bot); } catch (e) {}
    return newbieAsks(bot);
}

module.exports = { onTick, stage, newbieAsks, totalLevel };
