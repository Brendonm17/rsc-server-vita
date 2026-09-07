// a bot faction is a real clan (custom/clan.js): the founder creates it, recruits
// accept invites, wars and peace go out on clan chat, and humans can join

const clan = require('../clan');

const LEADER = 1; // leader rank

// clan name (2-16 letters, digits or spaces) from a faction name
function clanNameFor(factionName) {
    let name = String(factionName || '')
        .replace(/^the\s+/i, '')
        .replace(/[^A-Za-z0-9 ]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (name.length > 16) {
        name = name.slice(0, 16).trim();
    }

    if (name.length < 2) {
        name = 'Crew';
    }

    return name;
}

// clan tag (2-5 characters): the initials
function clanTagFor(factionName) {
    const words = clanNameFor(factionName).split(' ').filter(Boolean);
    let tag = words.map((w) => w[0]).join('').toUpperCase();

    if (tag.length < 2) {
        tag = (words[0] || 'CREW').slice(0, 3).toUpperCase();
    }

    return tag.slice(0, 5);
}

// clan name (lower case) -> faction name
const byClan = new Map();
let worldRef = null;

function rankOf(c, username) {
    for (const member of c.players || []) {
        const name = member.username || (member.player && member.player.username);

        if (name === username) {
            return member.rank;
        }
    }

    return null;
}

function inClan(player) {
    return !!clan.getClan(player);
}

// the founder makes the clan; a taken name or tag gets a digit appended
async function ensureClan(founder, factionName) {
    if (!founder || !founder.world) {
        return null;
    }

    worldRef = founder.world;

    const existing = clan.getClan(founder);

    if (existing) {
        byClan.set(existing.name.toLowerCase(), factionName);
        return existing;
    }

    const base = clanNameFor(factionName);
    const tag = clanTagFor(factionName);

    for (let k = 0; k < 6 && !clan.getClan(founder); k += 1) {
        const suffix = k ? String(k) : '';
        const name = k ? (base.slice(0, 15 - suffix.length) + ' ' + suffix).trim() : base;
        const t = k ? tag.slice(0, 4) + suffix : tag;
        await clan.createClan(founder, name, t);
    }

    const made = clan.getClan(founder);

    if (made) {
        byClan.set(made.name.toLowerCase(), factionName);
    }

    return made;
}

// a recruit is invited by the founder and accepts at once
async function enrol(bot, factionName, founderName) {
    if (!bot || !bot.world || !founderName) {
        return;
    }

    worldRef = bot.world;

    const founder = bot.world.getPlayerByUsername(founderName);

    if (!founder) {
        return;
    }

    let c = clan.getClan(founder);

    if (!c) {
        c = await ensureClan(founder, factionName);
    }

    if (!c || founder === bot) {
        return;
    }

    if (clan.getClan(bot) === c) {
        return;
    }

    if (clan.getClan(bot)) {
        await clan.leave(bot);
    }

    await clan.invite(founder, bot.username);

    if (bot.activeClanInvite) {
        await clan.accept(bot);
    }
}

// leadership passes to the faction's successor before the bot leaves
async function depart(bot, successorName) {
    const c = clan.getClan(bot);

    if (!c) {
        return;
    }

    if (
        successorName &&
        successorName !== bot.username &&
        rankOf(c, bot.username) === LEADER
    ) {
        const successor = bot.world.getPlayerByUsername(successorName);

        if (successor && clan.getClan(successor) === c) {
            await clan.rankPlayer(bot, successorName, LEADER);
        }
    }

    await clan.leave(bot);
}

// the faction's news, on its clan chat (every member sees it, humans included)
function announce(founderName, text) {
    if (!worldRef || !founderName) {
        return;
    }

    const founder = worldRef.getPlayerByUsername(founderName);

    if (founder && clan.getClan(founder)) {
        Promise.resolve(clan.chat(founder, text)).catch(() => {});
    }
}

// a human in one of the bots' clans belongs to that faction
function humanFaction(player) {
    const c = clan.getClan(player);

    return c ? byClan.get(c.name.toLowerCase()) || null : null;
}

// the founder invites a human friend (the client shows the invite popup)
async function recruit(founder, human) {
    if (!clan.getClan(founder) || clan.getClan(human) || human.activeClanInvite) {
        return false;
    }

    await clan.invite(founder, human.username);

    return !!human.activeClanInvite;
}

module.exports = { ensureClan, enrol, depart, announce, humanFaction, recruit, inClan, clanNameFor };
