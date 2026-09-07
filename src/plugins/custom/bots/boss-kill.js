// when a bot kills a boss: earns slayer reputation, records a tale, announces it

// memoised cross-module lookups, resolved once
const _m = {};
function mod(name) { return _m[name] || (_m[name] = require('./poller-registry').get(name)); }

// boss npc id -> name
const BOSS_NAME = (() => {
    const m = new Map();
    try {
        for (const b of require('./goals').BOSSES || []) m.set(b.id, b.name);
    } catch (e) {}
    return m;
})();

function onKill(bot, foe, name) {
    // slayer reputation and boss-dream credit
    try { mod('reputation').note(bot, 'boss'); } catch (e) {}
    try { mod('dreams').noteBossKill(bot, foe.id); } catch (e) {}
    // a tale it will retell, spread through the world via lore.js
    try { mod('lore').record(bot, 'kill', { subj: name, boss: true, num: 1 }); } catch (e) {}
    // felling a boss alongside others bonds them, across party/faction
    try { mod('social-emergent').bondNearby(bot, 0.5); } catch (e) {}
    try { require('./episodes').note(bot, 'boss', { foe: name }); } catch (e) {}
    // announce it; heard by nearby bots and dispatched onward as news
    try {
        const line = mod('chatgen').generate('bossKill', { foe: name }, bot);
        if (line) {
            bot.broadcastChat(line);
        }
    } catch (e) {}
}

function onTick(bot) {
    const opp = bot.opponent;
    // while fighting a boss, remember it so a death can be detected
    if (opp && !opp.username && opp.id != null && BOSS_NAME.has(opp.id)) {
        bot._bossFoe = opp;
        return false;
    }
    // combat with that boss ended: did it die, or get away?
    const foe = bot._bossFoe;
    if (foe && foe !== opp) {
        bot._bossFoe = null;
        const dead = foe.skills && foe.skills.hits && foe.skills.hits.current <= 0;
        if (dead && bot._lastBossKillRef !== foe) {
            bot._lastBossKillRef = foe;
            onKill(bot, foe, BOSS_NAME.get(foe.id) || 'a mighty beast');
            return true;
        }
    }
    return false;
}

module.exports = { onTick };
