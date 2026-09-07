// level-gated member halls. mayOpenGuildDoor gates guild doors so non-members stay out;
// a qualified bot may also congregate at its guild. gates read off the guild plugins:
//   Cooks'    -> cooking 32 + a chef's hat (192) worn
//   Crafting  -> crafting 40 + a brown apron (191) worn
//   Mining    -> mining 60
//   Champions'-> quest points 32
//   Monastery -> prayer 31 + joined the order (a cache flag)
// garb is never fabricated: a garb guild admits a bot only if it owns the item.

const GUILDS = [
    { key: 'cooks', skill: 'cooking', level: 32, garb: 192, doorId: 43, doorAt: { x: 179, y: 488 }, inside: { x: 184, y: 491 }, name: "Cooks' Guild" },
    { key: 'crafting', skill: 'crafting', level: 40, garb: 191, doorId: 68, doorAt: { x: 347, y: 601 }, inside: { x: 343, y: 605 }, name: 'Crafting Guild' },
    // Mining Guild interior is reached only by the level-60 ladder; the muster tile must be the
    // landing inside the guild room, not the open-mine node just outside door 55.
    { key: 'mining', skill: 'mining', level: 60, garb: null, doorId: 55, doorAt: { x: 268, y: 3381 }, inside: { x: 277, y: 3398 }, name: 'Mining Guild' },
    // Champions' Guild: gated on quest points, not a skill. door 44 needs the mayOpenGuildDoor guard.
    { key: 'champions', skill: null, qp: 32, garb: null, doorId: 44, doorAt: { x: 150, y: 554 }, inside: { x: 151, y: 555 }, name: "Champions' Guild" },
    // Monastery: reached by a ladder (no doorId). gate: prayer 31 + joined the order; joinFlag is
    // set directly when the bot qualifies (its equivalent of asking the Abbot to join).
    { key: 'prayer', skill: 'prayer', level: 31, garb: null, doorId: null, ladderAt: { x: 251, y: 468 }, inside: { x: 251, y: 1411 }, joinFlag: 'joinedPrayerGuild', name: 'Monastery' }
];
const GUILD_DOOR_IDS = new Set(GUILDS.map((g) => g.doorId).filter((d) => d != null));
const _byDoor = {}; for (const g of GUILDS) { if (g.doorId != null) { _byDoor[g.doorId] = g; } }

// guilds this build doesn't gate: Wizards' (ungated portal, nothing to gate),
// Woodcutting (scenery gate + a toll needing dialogue), Fishing (shop only, no entry gate).

// skill level the guild plugins gate on (.current)
function lvl(bot, skill) { const s = bot && bot.skills && bot.skills[skill]; return s ? (s.current || 0) : 0; }

// is the garb actually worn? gates on inventory.isEquipped(id), so carrying one in the bag isn't enough
function hasGarb(bot, id) {
    if (id == null) { return true; }
    try { const inv = bot.inventory; return !!(inv && typeof inv.isEquipped === 'function' && inv.isEquipped(id)); } catch (e) { return false; }
}

// does the bot meet a guild's entry requirement? a QP guild gates on quest points, else skill level + garb
function qualifies(bot, g) {
    if (!g) { return false; }
    if (g.qp != null) { return ((bot && bot.questPoints) || 0) >= g.qp; }
    return lvl(bot, g.skill) >= g.level && hasGarb(bot, g.garb);
}
// how far past the bar the bot is (picks the guild it's most invested in)
function investment(bot, g) { return g.qp != null ? (((bot && bot.questPoints) || 0) - g.qp) : (lvl(bot, g.skill) - g.level); }

function guildByKey(key) { return GUILDS.find((g) => g.key === key) || null; }
function guildForDoorId(id) { return _byDoor[id] || null; }

// travel hook: may this bot open this wall-object? non-guild doors return true; a guild door only for a qualified member
function mayOpenGuildDoor(bot, wallObjId) {
    if (!GUILD_DOOR_IDS.has(wallObjId)) { return true; }
    return qualifies(bot, guildForDoorId(wallObjId));
}

// is (x,y) inside a guild this bot may not enter? filters non-member sites out of facility trips.
// a coarse radius around the door/inside tile is enough.
function interiorBlockedFor(bot, x, y) {
    for (const g of GUILDS) {
        const entry = g.doorAt || g.ladderAt;
        const near = (Math.abs(x - g.inside.x) + Math.abs(y - g.inside.y) <= 8) ||
            (entry && Math.abs(x - entry.x) + Math.abs(y - entry.y) <= 6);
        if (near && !qualifies(bot, g)) { return true; }
    }
    return false;
}

// the guild this bot belongs to and might hang out at; prefers the one it's most invested in.
// returns { name, x, y, key } of the inside muster tile, or null.
function guildHub(bot) {
    let best = null, bestOver = -1;
    for (const g of GUILDS) {
        if (!qualifies(bot, g)) { continue; }
        const over = investment(bot, g);
        if (over > bestOver) { bestOver = over; best = g; }
    }
    return best ? { name: best.name, x: best.inside.x, y: best.inside.y, key: best.key } : null;
}

// the first time a bot qualifies for a guild, mark it a member (cache) and let it say a proud line.
// returns true only on the tick it announces.
const JOIN_LINES = {
    cooks: ["finally made the Cooks' Guild.", 'a chef at last - the guild let me in.', "took a while, but the Cooks' Guild is mine."],
    crafting: ['earned my place in the Crafting Guild.', "a Crafting Guild member now - apron on.", 'the Crafting Guild took me in at last.'],
    mining: ['sixty mining - the Mining Guild is open to me now.', 'a Mining Guild member at last.', 'earned my way into the Mining Guild.'],
    champions: ["proven myself - the Champions' Guild let me in.", 'thirty-two quest points; a Champion at last.', "the Champions' Guild doors open for me now."],
    prayer: ['the order accepted me into the Monastery.', 'a brother of the order now.', 'devout enough at last - the Monastery is mine.']
};
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function onTick(bot) {
    let cache; try { cache = bot.cache && bot.cache.bot; } catch (e) { cache = null; }
    if (!cache) { return false; }
    const known = cache.guilds || (cache.guilds = []);
    for (const g of GUILDS) {
        if (known.includes(g.key)) { continue; }
        if (!qualifies(bot, g)) { continue; }
        known.push(g.key); // record membership the moment it's earned
        // a join-flag guild (the Monastery) records the bot as having joined the order, so its ladder lets it climb
        if (g.joinFlag) { try { bot.cache[g.joinFlag] = true; } catch (e) {} }
        // announce it once if there's anyone to tell, never mid-fight/errand
        try {
            let busy = false; try { busy = require('./pacing').isBusy(bot); } catch (e) {}
            if (!busy && !bot.opponent && Math.random() < 0.6) {
                bot._reactionSpeak = true;
                try { bot.broadcastChat(pick(JOIN_LINES[g.key] || ['made it into the guild.'])); } finally { bot._reactionSpeak = false; }
                return true;
            }
        } catch (e) {}
        return false; // one new membership per tick is plenty
    }
    return false;
}

module.exports = {
    GUILDS, GUILD_DOOR_IDS, qualifies, guildByKey, guildForDoorId,
    mayOpenGuildDoor, interiorBlockedFor, guildHub, onTick
};
