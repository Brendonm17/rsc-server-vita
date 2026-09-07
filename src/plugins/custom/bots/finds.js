// a valuable pickup becomes shared knowledge: the finder notes the ground as
// loot-rich, tells nearby bots (a weaker second-hand note), and sometimes says so

const memory = require('./memory');

function mod(name) { return require('./poller-registry').get(name); }

const NOTABLE = 80;    // min value worth telling others about
const SHARE_RANGE = 6; // share range in tiles

// record a find: always note privately, broadcast only for a notable haul
function record(bot, value) {
    try { memory.noteFind(bot, bot.x, bot.y, value); } catch (e) {  }
    if (!value || value < NOTABLE) { return; } // small finds noted privately, not shouted

    let nearby = [];
    try { nearby = bot.getNearbyEntities('players', SHARE_RANGE) || []; } catch (e) {  }
    let told = 0;
    for (const pl of nearby) {
        if (!pl || pl === bot || !pl.isBot || pl.username === bot.username) { continue; }
        if (!pl.cache || !pl.cache.bot) { continue; }
        try { memory.noteFind(pl, bot.x, bot.y, value * 0.4); } catch (e) {  } // second-hand, weaker
        told += 1;
    }
    if (told > 0) { maybeAnnounce(bot); } // only announce when someone's around
}

const LINES = ['good pickings round here!', 'plenty to be found here.', 'this spot pays off.', 'worth stopping here - decent loot.'];
function maybeAnnounce(bot) {
    try {
        if (!mod('presence').mayChatter(bot)) { return; }
        if (Math.random() > 0.3) { return; }
        let line = LINES[Math.floor(Math.random() * LINES.length)];
        try { line = mod('voice').apply(bot, line); } catch (e) {  }
        if (typeof bot.broadcastChat === 'function') {
            // shown around, so it can be answered
            bot.broadcastChat(line);
            mod('presence').noteChatter(bot);
        }
    } catch (e) {  }
}

module.exports = { record, NOTABLE };
