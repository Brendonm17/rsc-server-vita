// bot celebrates aloud on a level-up, polled from a skill-base snapshot in cache
// big round milestones always shout, smaller ones only from the chatty

const personality = require('./personality');

function nice(skill) {
    return String(skill).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    const store = bot.cache && bot.cache.bot;
    if (!store || !bot.skills) return false;
    if (!store.lastLevels) {
        store.lastLevels = {};
        for (const s of Object.keys(bot.skills)) store.lastLevels[s] = bot.skills[s].base;
        return false; // first poll: snapshot only
    }
    let leveled = null;
    for (const s of Object.keys(bot.skills)) {
        const base = bot.skills[s].base;
        const prev = store.lastLevels[s];
        if (prev != null && base > prev) leveled = { skill: s, level: base };
        store.lastLevels[s] = base;
    }
    if (!leveled) return false;

    // note the level-up so it can come up in conversation later
    try { require('./episodes').note(bot, 'level', { skill: nice(leveled.skill), level: leveled.level }); } catch (e) {  }

    // nudge diligence up a little
    try { personality.drift(bot, 'diligence', 0.006); } catch (e) {  }

    // record a notable level as a tale
    if (leveled.level % 10 === 0 || leveled.level >= 40) {
        try { mod('lore').record(bot, 'level', { subj: nice(leveled.skill), num: leveled.level }); } catch (e) {  }
    }

    const p = personality.of(bot);
    const big = leveled.level % 10 === 0 || leveled.level >= 50; // round or high level
    if (!big && (p.sociability < 0.4 || Math.random() > 0.4)) return false;

    try {
        const cheers = big
            ? ['YES! level ' + leveled.level + ' ' + nice(leveled.skill) + '!!', 'level ' + leveled.level + ' ' + nice(leveled.skill) + '! get in!', 'finally - ' + leveled.level + ' ' + nice(leveled.skill) + '!']
            : ['level ' + leveled.level + ' ' + nice(leveled.skill) + '.', 'ding! ' + leveled.level + ' ' + nice(leveled.skill) + '.', 'that\'s ' + leveled.level + ' ' + nice(leveled.skill) + ' now.'];
        const line = cheers[Math.floor(Math.random() * cheers.length)];
        let out = line; try { out = mod('voice').apply(bot, line); } catch (e) {  }
        // big milestone: announce to the room, small levels are self-talk
        if (big) {
            try { bot.broadcastChat(out); } catch (e) {  }
            // bond nearby bots a little
            try { mod('social-emergent').bondNearby(bot, 0.3); } catch (e) {  }
        } else {
            bot._reactionSpeak = true;
            try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
        }
    } catch (e) {  }
    return true;
}

// memoised cross-module lookups
const _m = {};
function mod(name) { return _m[name] || (_m[name] = require('./poller-registry').get(name)); }

module.exports = { onTick };
