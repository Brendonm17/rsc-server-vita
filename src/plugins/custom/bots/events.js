// bots react to the world, not just chat: each tick a bot may comment on a nearby event
// a friend on low hp, a drop, a fight, a rival dropping; rate-limited and personality-gated

const RANGE = 6;

let personality, mood, social, chatgen;
function deps() {
    if (personality) return;
    personality = require('./personality');
    mood = require('./mood');
    social = require('./social-emergent');
    chatgen = require('./chatgen');
}

function say(bot, situation, ctx) {
    deps();
    let line;
    try { line = chatgen.generate(situation, ctx || {}, bot); } catch (e) { line = null; }
    if (!line) return;
    bot._reactionSpeak = true;
    try { bot.broadcastChat(line); } catch (e) {} finally { bot._reactionSpeak = false; }
}

function nameOf(c) {
    return (c.getFormattedUsername && c.getFormattedUsername()) || c.username || 'someone';
}

// broadcast a literal reaction line (deed reactions use local pools, not chatgen)
function sayLine(bot, line) {
    if (!line) return;
    bot._reactionSpeak = true;
    try { bot.broadcastChat(line); } catch (e) {} finally { bot._reactionSpeak = false; }
}
function pick(pool, name) { const l = pool[Math.floor(Math.random() * pool.length)]; return l.replace(/\{n\}/g, name); }

// deed reactions: when a nearby player (especially the human) levels up or dies, nearby bots react by relationship
const GRATS = {
    human: ['gz {n}! nice work.', 'grats {n}, you\'re flying!', 'well earned, {n}!', 'nice one {n}! keep it up.'],
    friend: ['gz {n}!', 'grats mate!', 'nice one {n}!', 'well done {n}!'],
    neutral: ['gz', 'grats {n}', 'nice, congrats {n}']
};
const DEATHS = {
    rival: ['haha, get wrecked {n}.', 'couldn\'t hack it eh {n}?', 'told you, {n}.'],
    friend: ['unlucky {n}!', 'oof, bad luck mate.', 'gutted for you {n}.'],
    neutral: ['rip {n}.', 'unlucky.', 'ouch, {n} went down.']
};
function isHuman(c) { return !c.isBot; } // bots set isBot=true; a real connected player doesn't
function combatLevelOf(c) { try { return (c.getCombatLevel && c.getCombatLevel()) || c.combatLevel || 0; } catch (e) { return 0; } }

// react to a level-up or death in a nearby player, only against a fresh recent observation; returns true if it reacted
function checkDeeds(bot, players, p) {
    const st = bot._deedState || (bot._deedState = {});
    const now = (bot.world && bot.world.ticks) || 0;
    let reacted = false;
    for (const other of players) {
        if (!other || other === bot || other.username === bot.username || !other.username) { continue; }
        const uname = other.username;
        const cl = combatLevelOf(other);
        const hits = other.skills && other.skills.hits;
        const alive = !(hits && hits.base && hits.current <= 0);
        const prev = st[uname];
        const fresh = prev && (now - prev.t) <= 8;
        if (fresh && !reacted) {
            const human = isHuman(other);
            let rel = 0; try { rel = social.sentiment(bot, uname); } catch (e) {}
            if (cl > prev.cl && Math.random() < 0.5 + p.sociability * 0.4) {
                sayLine(bot, pick(human ? GRATS.human : (rel >= 1 ? GRATS.friend : GRATS.neutral), nameOf(other)));
                bot._eventCd = 150 + Math.floor(Math.random() * 150);
                reacted = true;
            } else if (prev.alive && !alive && Math.random() < 0.4 + p.sociability * 0.3) {
                sayLine(bot, pick(rel <= -1 ? DEATHS.rival : ((rel >= 1 || human) ? DEATHS.friend : DEATHS.neutral), nameOf(other)));
                bot._eventCd = 150 + Math.floor(Math.random() * 150);
                reacted = true;
            }
        }
        st[uname] = { cl, alive, t: now };
    }
    return reacted;
}

// per-tick: notice one nearby event and maybe remark on it.
function onTick(bot) {
    deps();
    if (bot.opponent || bot.locked) return; // busy fighting -> not sightseeing
    if (bot._eventCd > 0) { bot._eventCd -= 1; return; }

    const p = personality.of(bot);
    if (p.sociability < 0.25) { bot._eventCd = 300 + Math.floor(Math.random() * 300); return; }

    let players = [];
    try { players = bot.getNearbyEntities('players', RANGE); } catch (e) {}

    // deeds first: a nearby player's level-up or death is the most worth-noticing thing
    if (checkDeeds(bot, players, p)) { return; }

    for (const other of players) {
        if (!other || other === bot || other.username === bot.username) continue;
        const hits = other.skills && other.skills.hits;
        // a nearby player on low hp -> concern, or a gloat if a rival
        if (hits && hits.base && hits.current > 0 && hits.current / hits.base < 0.3) {
            const rel = social.sentiment(bot, other.username);
            if (Math.random() < 0.35 + p.sociability * 0.4) {
                say(bot, rel < 0 ? 'reactGloat' : 'reactConcern', { name: nameOf(other) });
                bot._eventCd = 150 + Math.floor(Math.random() * 200);
                return;
            }
        }
        // someone fighting nearby -> a cheer for a friend now and then
        if (other.opponent && social.sentiment(bot, other.username) >= 1 && Math.random() < 0.15 + p.sociability * 0.2) {
            say(bot, 'reactCheer', { name: nameOf(other) });
            bot._eventCd = 200 + Math.floor(Math.random() * 200);
            return;
        }
    }

    // a valuable drop nearby -> a covetous remark, greedy bots more
    try {
        const world = bot.world;
        if (world && world.groundItems && world.groundItems.getInArea) {
            const items = require('@2003scape/rsc-data/config/items');
            let seen = bot._seenDrops || (bot._seenDrops = {});
            if (seen.__n === undefined) seen.__n = 0;
            if (seen.__n > 200) { seen = bot._seenDrops = { __n: 0 }; } // a long session must not grow this forever
            for (const gi of world.groundItems.getInArea(bot.x, bot.y, RANGE)) {
                const def = items[gi.id];
                const key = gi.id + ':' + gi.x + ':' + gi.y;
                if (def && (def.price || 0) >= 100 && !seen[key]) {
                    seen[key] = 1;
                    seen.__n += 1;
                    if (Math.random() < 0.3 + p.greed * 0.4) {
                        say(bot, 'reactDrop', {});
                        bot._eventCd = 200 + Math.floor(Math.random() * 200);
                        return;
                    }
                }
            }
        }
    } catch (e) {}

    bot._eventCd = 40 + Math.floor(Math.random() * 60);
}

module.exports = { onTick };
