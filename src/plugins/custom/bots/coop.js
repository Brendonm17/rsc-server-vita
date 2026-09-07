// co-op: a helpful bot pitches in when it sees any nearby player (human or bot)
// fighting a monster, by attacking a free monster near that scrap. rsc is
// single-combat, so "helping" means taking the adds around a player. keys on
// nearby players, not party membership, so it works with real players too.
//
// gated on a sociable bot with a bit of nerve, only when idle, and rate-limited.

const personality = require('./personality');
const { npcAttackBlocked } = require('../../../packet-handlers/npc');

function isMonsterOpponent(op) {
    // a monster opponent has a numeric id and no username (players have a username)
    return !!(op && typeof op.id === 'number' && !op.username);
}
function attackable(n) {
    if (!n || n.id == null || n.opponent) return false; // must exist and be free
    const d = n.definition;
    return !!(d && (d.attack || 0) > 0 && (d.hits || 0) > 0);
}
function count(bot, id) {
    let n = 0;
    const items = bot.inventory && bot.inventory.items;
    if (items) for (const it of items) if (it.id === id) n += it.amount || 1;
    return n;
}
function lowHp(pl) {
    const h = pl && pl.skills && pl.skills.hits;
    return !!(h && h.max > 0 && h.current / h.max < 0.35);
}
// common cooked foods; shared only beyond the bot's own reserve
const FOODS = [138, 132, 373, 351, 546]; // bread, cooked meat, trout, salmon, stew

// aid: drop food at a badly-hurt nearby player's feet. returns true if it gave
// aid (a quick gesture, doesn't own the tick)
function aidPlayer(bot) {
    if (bot._aidCd && bot._aidCd > 0) { bot._aidCd -= 1; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.45) return false;
    let food = -1;
    for (const id of FOODS) { if (count(bot, id) > 6) { food = id; break; } } // keep its own
    if (food < 0) return false;
    let players;
    try { players = bot.getNearbyEntities('players', 4); } catch (e) { return false; }
    // a hurt player worth helping; never a rival-faction member, and kin come first
    const hurt = players.filter((pl) => pl && pl !== bot && pl.username !== bot.username && lowHp(pl) && factionFeeling(bot, pl) >= 0);
    const target = hurt.find((pl) => factionFeeling(bot, pl) > 0) || hurt[0];
    if (!target) return false;
    try {
        bot.inventory.remove(food, 1);
        if (bot.world && typeof bot.world.addPlayerDrop === 'function') {
            bot.world.addPlayerDrop(target, { id: food }, target.x, target.y);
        }
        bot._aidCd = 80;
        try {
            const line = 'here, eat this!';
            let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {}
            bot._reactionSpeak = true;
            try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
        } catch (e) {}
        try { require('./reputation').note(bot, 'help', 1); } catch (e) {}
        try { require('./personality').drift(bot, 'sociability', 0.008); } catch (e) {}
        return true;
    } catch (e) {
        return false;
    }
}

function combatLevelOf(e) {
    return e.getCombatLevel ? e.getCombatLevel() : (e.combatLevel || 3);
}

// faction standing of other: +1 kin/ally, -1 enemy, 0 none
function factionFeeling(bot, other) {
    try {
        const f = require('./factions');
        const mine = f.factionOf(bot);
        if (!mine) return 0;
        const theirs = f.allegianceName(other);
        if (!theirs) return 0;
        const rel = f.relationBetween(mine.name, theirs);
        if (rel === 'same' || rel === 'ally') return 1; // kin and allies -> help them
        if (rel === 'war' || rel === 'rival') return -1; // enemies -> never aid, never fight beside
    } catch (e) {}
    return 0;
}

// tip: a veteran near a much lower-level player offers a pointer from the
// knowledge base. returns true if it gave a tip (doesn't own the tick)
function tipLowbie(bot) {
    if (bot._tipCd && bot._tipCd > 0) { bot._tipCd -= 1; return false; }
    const p = personality.of(bot);
    if (p.sociability < 0.55) return false;
    const myCl = combatLevelOf(bot);
    if (myCl < 25) return false; // must be experienced to mentor
    let players;
    try { players = bot.getNearbyEntities('players', 5); } catch (e) { return false; }
    const newbie = players.find((pl) => pl && pl !== bot && pl.username !== bot.username && combatLevelOf(pl) < myCl - 15);
    if (!newbie) return false;
    if (Math.random() < 0.6) return false; // occasional, not preachy
    let tip = null;
    try {
        const k = require('./knowledge');
        const asker = { x: bot.x, y: bot.y, getCombatLevel: () => combatLevelOf(newbie) };
        const r = k.answer(asker, 'what should i do next?');
        tip = r && r.text;
    } catch (e) {}
    if (!tip) return false;
    bot._tipCd = 350;
    try {
        const name = newbie.getFormattedUsername ? newbie.getFormattedUsername() : newbie.username;
        const line = name + ', ' + tip;
        let out = line; try { out = require('./voice').apply(bot, line); } catch (e) {}
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
        try { require('./reputation').note(bot, 'help', 1); } catch (e) {}
        try { require('./personality').drift(bot, 'sociability', 0.008); } catch (e) {}
    } catch (e) {}
    return true;
}

function onTick(bot) {
    if (bot.opponent || bot.locked || bot._quest || bot._chain ||
        (bot.walkQueue && bot.walkQueue.length) ||
        bot._foodRun || bot._bankRun || bot._runeRun || bot._ammoRun ||
        bot._needTrip || bot._shopTrip || bot._gearRun || bot._processTrip || bot._agilityRun ||
        bot._travel || bot._chatGoto || bot._follow || bot._holdTicks || bot._relocateSite ||
        // already moved this tick -> attacking would move it again, which the engine
        // forbids (broadcastMove throws 'two broadcasts in one tick')
        (bot.moveTick != null && bot.world && bot.moveTick === bot.world.ticks)) {
        return false;
    }
    // quick gestures (don't own the tick): aid a hurt player, mentor a newbie
    try { aidPlayer(bot); } catch (e) {}
    try { tipLowbie(bot); } catch (e) {}
    if (bot._coopCd && bot._coopCd > 0) { bot._coopCd -= 1; return false; }
    const p = personality.of(bot);

    let players;
    try { players = bot.getNearbyEntities('players', 6); } catch (e) { return false; }
    // join a nearby scrap, but never for a rival faction
    const fighters = players.filter((pl) => pl && pl !== bot && pl.username !== bot.username && isMonsterOpponent(pl.opponent) && factionFeeling(bot, pl) >= 0);
    // loyalty: a friend or faction-mate in a fight is worth wading in for even if
    // the bot is otherwise too cautious to bother
    function loyalTo(pl) {
        if (factionFeeling(bot, pl) > 0) return true;
        try { return require('./social-emergent').sentiment(bot, pl.username) >= 3; } catch (e) { return false; }
    }
    const ally = fighters.find(loyalTo);
    if (!ally && p.sociability + p.aggression < 0.75) return false; // otherwise a loner/coward stays out
    const fighter = ally || fighters[0];
    if (!fighter) return false;

    let npcs;
    try { npcs = bot.getNearbyEntities('npcs', 8); } catch (e) { return false; }
    // a free attackable monster near the scrap, not the one they're holding
    const free = npcs.find((n) => attackable(n) && n !== fighter.opponent);
    if (!free) return false;

    try {
        if (typeof bot.attack === 'function') {
            // the same attack guards a human's packet passes through
            Promise.resolve(npcAttackBlocked(bot, free, false)).then((blocked) => (blocked ? undefined : bot.attack(free))).catch(() => {});
            bot._coopCd = 25;
            // a quick word so the help reads as intentional
            if (Math.random() < 0.5) {
                try {
                    const line = p.aggression > 0.6 ? "i've got this one!" : 'need a hand?';
                    let out = line;
                    try { out = require('./voice').apply(bot, line); } catch (e) {}
                    bot._reactionSpeak = true;
                    try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
                } catch (e) {}
            }
            return true;
        }
    } catch (e) {}
    return false;
}

module.exports = { onTick, aidPlayer, tipLowbie, isMonsterOpponent, attackable, lowHp };
