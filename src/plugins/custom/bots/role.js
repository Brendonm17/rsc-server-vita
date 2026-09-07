// a bot's self-identity (fisherman, miner, slayer, merchant, wanderer...) derived
// from its skills, wealth and personality; it mentions the role now and then

const personality = require('./personality');

const GATHER = { fishing: 'fisherman', mining: 'miner', woodcutting: 'woodcutter', cooking: 'cook', smithing: 'smith', crafting: 'crafter', firemaking: 'firemaker', fletching: 'fletcher', herblaw: 'herbalist', thieving: 'thief', agility: 'runner' };
const COMBAT = new Set(['attack', 'strength', 'defense', 'ranged', 'magic']);

function coins(bot) {
    let n = 0;
    if (bot.inventory && bot.inventory.items) for (const it of bot.inventory.items) if (it.id === 10) n += it.amount || 1;
    return n;
}

// the bot's current role
function role(bot) {
    if (!bot.skills) return 'adventurer';
    let top = null, topBase = 0;
    for (const s of Object.keys(bot.skills)) {
        if (s === 'hits' || s === 'prayer') continue;
        const b = (bot.skills[s] && bot.skills[s].base) || 1;
        if (b > topBase) { topBase = b; top = s; }
    }
    const cl = bot.getCombatLevel ? bot.getCombatLevel() : (bot.combatLevel || 3);
    const p = personality.of(bot);
    if (p.greed > 0.65 && coins(bot) > 5000) return 'merchant';
    if (top && GATHER[top] && topBase > cl) return GATHER[top]; // a dedicated skiller
    if (cl > 40 && top && COMBAT.has(top)) return 'slayer';
    if (p.curiosity > 0.7) return 'wanderer';
    return 'adventurer';
}

const LINES = {
    fisherman: "i'm a fisherman at heart.", miner: "mining's my calling.", woodcutter: 'nothing beats a day chopping wood.',
    cook: 'best cook in the land, me.', smith: 'i work the anvil.', crafter: 'a crafter through and through.',
    firemaker: 'i do like a good fire.', fletcher: 'i fletch my own arrows.', herbalist: 'i know my herbs.',
    thief: 'light fingers, me.', runner: 'always on the move.',
    slayer: 'i live for the hunt.', merchant: 'buy low, sell high - that\'s me.',
    wanderer: 'i just love seeing the world.', adventurer: 'just an adventurer, me.'
};

// occasionally state the role to nearby players
function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._roleCd && bot._roleCd > 0) { bot._roleCd -= 1; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.5) return false;
    let nearby;
    try { nearby = bot.getNearbyEntities('players', 5); } catch (e) { return false; }
    if (!nearby.some((pl) => pl && pl !== bot && pl.username !== bot.username)) return false;
    if (Math.random() > 0.15) return false;
    // skip if the crowd is already chattering
    if (!mod('presence').mayChatter(bot)) { bot._roleCd = 120; return false; }
    bot._roleCd = 500;
    const line = LINES[role(bot)] || LINES.adventurer;
    try {
        let out = line; try { out = mod('voice').apply(bot, line); } catch (e) {  }
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
        mod('presence').noteChatter(bot);
    } catch (e) {  }
    return true;
}

// memoised cross-module lookups
const _m = {};
function mod(name) { return _m[name] || (_m[name] = require('./poller-registry').get(name)); }

module.exports = { onTick, role };
