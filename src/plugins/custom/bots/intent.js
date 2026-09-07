// a bot occasionally announces its next task, derived from its current goal (goals.js)

const personality = require('./personality');

// memoised lazy requires
let _goals, _chatgen, _presence;
function goalsMod() { return _goals || (_goals = require('./goals')); }
function chatgenMod() { return _chatgen || (_chatgen = require('./chatgen')); }
function presenceMod() { return _presence || (_presence = require('./presence')); }

const SKILL_WORK = {
    mining: 'go work the mine', woodcutting: 'go chop some wood', fishing: 'get some fishing in',
    smithing: 'hit the anvil', cooking: 'do some cooking', firemaking: 'get a fire going',
    fletching: 'fletch a few', crafting: 'do some crafting', herblaw: 'brew something up'
};

// current goal as a task phrase, or null if nothing worth announcing
function taskPhrase(bot) {
    let g = null;
    try { g = goalsMod().current(bot); } catch (e) { return null; }
    if (!g) return null;
    switch (g.type) {
        case 'boss': return 'go hunt ' + (g.bossName || 'a boss') ;
        case 'getRich': return 'make some coin';
        case 'levelUp': return 'train up';
        case 'gearUp': return 'sort my gear out';
        case 'explore': return 'go see the world a bit';
        case 'skill': return SKILL_WORK[g.skill] || 'work my trade';
        default: return null;
    }
}

function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._intentCd && bot._intentCd > 0) { bot._intentCd -= 1; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.4) { bot._intentCd = 400; return false; }

    let audience = false;
    try { audience = bot.getNearbyEntities('players', 6).some((o) => o && o !== bot && o.id !== bot.id); } catch (e) { return false; }
    if (!audience) { bot._intentCd = 80; return false; }
    if (Math.random() > 0.1) { bot._intentCd = 200; return false; } // rare
    // skip if the crowd is already chattering
    if (!presenceMod().mayChatter(bot)) { bot._intentCd = 120; return false; }

    const topic = taskPhrase(bot);
    if (!topic) { bot._intentCd = 400; return false; }

    let line = null;
    try { line = chatgenMod().generate('announceIntent', { topic }, bot); } catch (e) {  }
    if (!line) { bot._intentCd = 400; return false; }
    try {
        // a stated plan is an opener
        bot.broadcastChat(line);
        presenceMod().noteChatter(bot);
    } catch (e) {  }
    bot._intentCd = 600 + Math.floor(Math.random() * 600);
    return true;
}

module.exports = { onTick, taskPhrase };
