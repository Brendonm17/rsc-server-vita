// wealth sink: a rich bot drains its surplus by gifting coins to a poorer nearby bot
// (generosity) or spending on the good life (indulgence); only surplus above a reserve

const personality = require('./personality');
const pacing = require('./pacing');

const COINS_ID = 10;
const COMFORT = 20000;   // a reserve a bot always keeps; only coins ABOVE this are ever given/spent
const DRAIN_FRAC = 0.12; // fraction of the surplus drained per event
const MIN_SURPLUS = 2000; // below this the bot isn't rich enough to bother

function mod(name) { return require('./poller-registry').get(name); }
function coins(bot) { let n = 0; for (const it of (bot.inventory && bot.inventory.items) || []) { if (it.id === COINS_ID) { n += it.amount || 1; } } return n; }
function surplus(bot) { return Math.max(0, coins(bot) - COMFORT); }

// generosity 0..1 from temperament (sociable and not greedy)
function generosity(bot) {
    try { const p = personality.of(bot); return Math.max(0, Math.min(1, 0.45 + p.sociability * 0.45 - p.greed * 0.55)); } catch (e) { return 0.3; }
}

// nearest bot poorer than this one (a recipient for a hand-out), or null
function poorerNearby(bot, myCoins) {
    let others;
    try { others = bot.getNearbyEntities('players', 6) || []; } catch (e) { return null; }
    let best = null, bd = Infinity;
    for (const o of others) {
        if (!o || o === bot || !o.isBot || o.username === bot.username || !o.inventory) { continue; }
        if (coins(o) >= myCoins * 0.5) { continue; } // only give to someone genuinely worse off
        const d = Math.abs(o.x - bot.x) + Math.abs(o.y - bot.y);
        if (d < bd) { bd = d; best = o; }
    }
    return best;
}

const GIFT_LINES = ['here {n}, treat yourself - i\'ve plenty.', 'a little something for you, {n}.', 'you look like you could use this, {n}.', 'share the wealth, eh {n}?'];
const INDULGE_LINES = ['ahh, the good life.', 'money\'s for spending, i say.', 'treated myself today - worth every coin.', 'what\'s a full purse for if not enjoying it?'];
function say(bot, lines, name) {
    try {
        if (!mod('presence').mayChatter(bot)) { return; }
        if (Math.random() > 0.35) { return; }
        let line = lines[Math.floor(Math.random() * lines.length)].replace('{n}', name || 'friend');
        try { line = mod('voice').apply(bot, line); } catch (e) {}
        if (typeof bot.broadcastChat === 'function') {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(line); } finally { bot._reactionSpeak = false; }
            mod('presence').noteChatter(bot);
        }
    } catch (e) {}
}

function onTick(bot) {
    if (pacing.isBusy(bot)) { return false; }
    if (bot._prosperCd && bot._prosperCd > 0) { bot._prosperCd -= 1; return false; }
    const s = surplus(bot);
    if (s < MIN_SURPLUS) { bot._prosperCd = 200; return false; }

    // richer bot spends more often (shorter cooldown), so wealth converges instead of running away
    bot._prosperCd = Math.max(400, 3000 - Math.floor(s / 100));
    const amount = Math.min(Math.max(200, Math.floor(s * DRAIN_FRAC)), coins(bot) - COMFORT);
    if (amount < 100) { return false; }

    // generosity: a generous bot near a poorer one hands over coins
    if (Math.random() < generosity(bot)) {
        const poorer = poorerNearby(bot, coins(bot));
        // only when standing together: a gift a human could see change hands
        if (poorer && bot.getDistance(poorer) <= 1) {
            try { if (typeof bot.faceEntity === 'function') bot.faceEntity(poorer); } catch (e) {}
            try { bot.inventory.remove(COINS_ID, amount); poorer.inventory.add(COINS_ID, amount); } catch (e) { return false; }
            try { mod('social-emergent').noteInteraction(poorer, bot.username, 2); } catch (e) {} // the recipient warms to a benefactor
            try { mod('reputation').note(bot, 'help'); } catch (e) {}
            say(bot, GIFT_LINES, poorer.username);
            return true;
        }
    }

    // indulgence (the true sink): spend surplus on the good life
    try { bot.inventory.remove(COINS_ID, amount); } catch (e) { return false; }
    say(bot, INDULGE_LINES);
    return true;
}

module.exports = { onTick, surplus, generosity, COMFORT };
