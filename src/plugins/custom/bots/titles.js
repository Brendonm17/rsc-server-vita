// title: an earned epithet from a bot's persistent record (combat, wealth, pvp wins,
// life stage, tales, reputation); settles into cache.bot.title and is worn out loud

const personality = require('./personality');
// resolved once on first use
let _mod_chatgen = null;
function mod_chatgen() { return _mod_chatgen || (_mod_chatgen = require('./chatgen')); }
let _mod_reputation = null;
function mod_reputation() { return _mod_reputation || (_mod_reputation = require('./reputation')); }
let _mod_voice = null;
function mod_voice() { return _mod_voice || (_mod_voice = require('./voice')); }

function coins(bot) {
    let n = 0;
    if (bot.inventory && bot.inventory.items) for (const it of bot.inventory.items) if (it.id === 10) n += it.amount || 1;
    return n;
}

function combatLevelOf(bot) { return bot.getCombatLevel ? bot.getCombatLevel() : bot.combatLevel || 3; }

function totalLevel(bot) {
    let t = 0;
    if (bot.skills) for (const s of Object.keys(bot.skills)) t += (bot.skills[s] && bot.skills[s].base) || 0;
    return t;
}

function pvpWins(bot) {
    const cb = bot.cache && bot.cache.bot;
    const m = cb && cb.memory;
    return (m && m.pvpWins) || 0;
}

function tales(bot) {
    const cb = bot.cache && bot.cache.bot;
    return (cb && Array.isArray(cb.tales) && cb.tales) || [];
}

function hasTaleOf(bot, re) {
    return tales(bot).some((t) => re.test((t.subj || '') + ' ' + (t.kind || '')));
}

// how many distinct heroes' tales this bot carries (proxy for how storied it is)
function loreBreadth(bot) {
    const heroes = new Set();
    for (const t of tales(bot)) heroes.add(t.hero);
    return heroes.size;
}

// craft mastery title: earned when a gather/production skill hits mastery and is the
// bot's strongest such skill
const CRAFT_TITLE = {
    smithing: 'the Blacksmith', mining: 'the Miner', fishing: 'the Angler',
    cooking: 'the Chef', woodcutting: 'the Lumberjack', crafting: 'the Craftsman',
    fletching: 'the Fletcher', firemaking: 'the Firestarter', herblaw: 'the Herbalist',
    thieving: 'the Rogue', agility: 'the Nimble'
};
const MASTER_LEVEL = 50; // a real, dedicated mastery of the trade
function masterTitle(bot) {
    if (!bot.skills) return null;
    let topSkill = null;
    let topBase = 0;
    for (const s of Object.keys(CRAFT_TITLE)) {
        const b = (bot.skills[s] && bot.skills[s].base) || 0;
        if (b > topBase) { topBase = b; topSkill = s; }
    }
    return topSkill && topBase >= MASTER_LEVEL ? CRAFT_TITLE[topSkill] : null;
}

// derive the title the bot has earned (or null), ordered by prestige so the best wins
function earn(bot) {
    const cl = combatLevelOf(bot);
    const tot = totalLevel(bot);
    const p = personality.of(bot);
    let rep = [];
    try { rep = mod_reputation().tagsOf(bot) || []; } catch (e) {}

    const cb = bot.cache && bot.cache.bot;
    const dreamsDone = (cb && cb.dreamsAchieved) || 0;

    if (rep.indexOf('legend') !== -1 && cl >= 90) return 'the Legendary';
    if (hasTaleOf(bot, /dragon/i) && cl >= 60) return 'the Dragonslayer';
    if (dreamsDone >= 5) return 'the Accomplished'; // a life of dreams fulfilled (dreams.js arc)
    if (rep.indexOf('pker') !== -1 && pvpWins(bot) >= 10) return 'the Feared';
    if (pvpWins(bot) >= 5 && p.aggression > 0.55) return 'the Bold';
    if (p.greed > 0.6 && coins(bot) > 20000) return 'the Rich';
    if (tot > 850 || cl > 80) return 'the Wise';
    const craft = masterTitle(bot); // a master of a trade (smith/angler/miner/chef/...)
    if (craft) return craft;
    if (loreBreadth(bot) >= 4) return 'the Storied';
    if (p.curiosity > 0.7 && tot > 300) return 'the Wanderer';
    return null;
}

// the bot's settled title (sticky, only ever upgrades). stored on cache.bot.title
const RANK = ['the Wanderer', 'the Storied',
    'the Blacksmith', 'the Miner', 'the Angler', 'the Chef', 'the Lumberjack', 'the Craftsman',
    'the Fletcher', 'the Firestarter', 'the Herbalist', 'the Rogue', 'the Nimble',
    'the Accomplished', 'the Wise', 'the Rich', 'the Bold', 'the Feared', 'the Dragonslayer', 'the Legendary'];
function titleOf(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return null;
    const earned = earn(bot);
    if (earned) {
        const cur = cb.title;
        if (!cur || RANK.indexOf(earned) > RANK.indexOf(cur)) cb.title = earned;
    }
    return cb.title || null;
}

const BOASTS = {
    'the Legendary': ['they call me a legend, and who am i to argue?', 'my name will outlast us all.'],
    'the Dragonslayer': ['dragons fear my name.', 'i\'ve slain dragons, you know.'],
    'the Feared': ['best not cross me in the wild.', 'they run when they see me coming.'],
    'the Bold': ['fortune favours the bold - favours me.', 'no fight\'s too big for me.'],
    'the Rich': ['made my fortune the hard way.', 'coin comes easy when you know how.'],
    'the Accomplished': ['i\'ve chased every dream and caught them.', 'set my mind to it, and did it. every time.'],
    'the Wise': ['seen it all, done it all.', 'age before beauty, youngster.'],
    'the Storied': ['ah, the tales i could tell.', 'every scar\'s a story.'],
    'the Wanderer': ['i\'ve walked every road on the map.', 'home is wherever i\'m standing.'],
    // craft-mastery boasts
    'the Blacksmith': ['nobody works an anvil like me.', 'i can smith anything you like.'],
    'the Miner': ['i know every ore vein in the land.', 'give me a pick and a rock, i\'m happy.'],
    'the Angler': ['best catch on any shore, that\'s me.', 'i can read the water like a book.'],
    'the Chef': ['best cook you\'ll ever meet.', 'never burnt a fish in my life.'],
    'the Lumberjack': ['no tree stands long against my axe.', 'i\'ve felled a forest in my time.'],
    'the Craftsman': ['fine work is my trade.', 'i make things properly, or not at all.'],
    'the Fletcher': ['i fletch the truest arrows around.', 'give me a knife and some logs.'],
    'the Firestarter': ['i can light a fire anywhere.', 'never cold when i\'m about.'],
    'the Herbalist': ['i know my herbs and potions.', 'a brew for what ails you.'],
    'the Rogue': ['light fingers, lighter conscience.', 'never felt a pocket i couldn\'t pick.'],
    'the Nimble': ['quick on my feet, always have been.', 'no shortcut i can\'t take.']
};

// occasionally a proud bot wears its title out loud, near others
function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._titleCd && bot._titleCd > 0) { bot._titleCd -= 1; return false; }
    const title = titleOf(bot);
    if (!title) { bot._titleCd = 300; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.4) return false; // a true loner keeps its title to itself

    // earning a new title is announced once to the room; after that it's just self-boast
    const cb = bot.cache && bot.cache.bot;
    if (cb && bot._announcedTitle !== title) {
        let audience0 = false;
        try { audience0 = bot.getNearbyEntities('players', 6).some((o) => o && o !== bot && o.id !== bot.id); } catch (e) {}
        if (audience0) {
            const claim = 'they call me ' + title + ' now!';
            let out = claim; try { out = mod_voice().apply(bot, claim); } catch (e) {}
            try { bot.broadcastChat(out); } catch (e) {} // no _reactionSpeak -> heard
            bot._announcedTitle = title;
            bot._titleCd = 400 + Math.floor(Math.random() * 300);
            return true;
        }
    }

    // pride to boast scales with sociability + a dash of aggression (swagger).
    let audience = false;
    try { audience = bot.getNearbyEntities('players', 6).some((o) => o && o !== bot && o.id !== bot.id); } catch (e) { return false; }
    if (!audience) { bot._titleCd = 60; return false; }
    if (Math.random() > 0.12 + p.aggression * 0.08) { bot._titleCd = 200; return false; }

    // mix the title-specific flavour with the generic boast engine so it doesn't repeat
    let out = null;
    if (Math.random() < 0.5) {
        try { out = mod_chatgen().generate('titleBoast', { title }, bot); } catch (e) {}
    }
    if (!out) {
        const opts = BOASTS[title] || ['i\'ve earned my name.'];
        const line = opts[Math.floor(Math.random() * opts.length)];
        out = line; try { out = mod_voice().apply(bot, line); } catch (e) {}
    }
    try {
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
    } catch (e) {}
    bot._titleCd = 500 + Math.floor(Math.random() * 500);
    return true;
}

module.exports = { onTick, titleOf, earn };
