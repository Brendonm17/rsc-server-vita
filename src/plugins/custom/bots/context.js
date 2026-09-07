// situational context: a cheap read-only snapshot the brain/mood/chat can query
// (nearest bank/shop, work, threats, players, wilderness), computed on demand

const travel = require('./travel');
const SITES = require('./sites');
const boats = require('./boats');
const regions = require('./regions');
const { wildernessLevel } = require('../../skills/magic');

const BANK_RE = /bank/i;
const SHOP_RE = /general|swords|armour|helmet|scimitar|axes/i;

function nearestFacility(bot, re) {
    let best = null;
    let bestD = Infinity;
    const F = travel.FACILITIES || {};
    for (const name of Object.keys(F)) {
        if (!re.test(name) || !F[name].target) {
            continue;
        }
        const t = F[name].target;
        const d = Math.abs(bot.x - t.x) + Math.abs(bot.y - t.y);
        if (d < bestD) {
            bestD = d;
            best = { name, dist: d, x: t.x, y: t.y };
        }
    }
    return best;
}

function nearestSite(bot) {
    let best = null;
    let bestD = Infinity;
    for (const s of SITES) {
        const d = Math.abs(bot.x - s.x) + Math.abs(bot.y - s.y);
        if (d < bestD) {
            bestD = d;
            best = { name: s.name, type: s.type, dist: d };
        }
    }
    return best;
}

// the full snapshot
function describe(bot) {
    const wl = wildernessLevel(bot.x, bot.y, bot.world.planeElevation || 944);
    const bank = nearestFacility(bot, BANK_RE);
    const shop = nearestFacility(bot, SHOP_RE);
    const site = nearestSite(bot);

    let players = 0;
    let threats = 0;
    let quarry = 0; // huntable npcs (hostile, alive)
    try {
        for (const p of bot.getNearbyEntities('players', 15)) {
            if (p !== bot && p.id !== bot.id) {
                players += 1;
            }
        }
        for (const n of bot.getNearbyEntities('npcs', 12)) {
            if (n.skills && n.skills.hits.current > 0 && n.definition.hostility) {
                threats += 1;
                quarry += 1;
            }
        }
    } catch (e) {
        // entity scan unavailable, leave counts at 0
    }

    const region = regions.regionAt(bot.x, bot.y);

    return {
        x: bot.x,
        y: bot.y,
        region, // { name, type, says } or null
        inWilderness: wl > 0,
        wildernessLevel: wl,
        onKaramja: boats.onKaramja(bot),
        bank,
        shop,
        site,
        nearbyPlayers: players,
        threats,
        // "what I can do right here"
        canBankHere: !!bank && bank.dist <= 8,
        canShopHere: !!shop && shop.dist <= 8,
        canFightHere: quarry > 0,
        canPvpHere: wl > 0 && players > 0,
        atWorkSite: !!site && site.dist <= 8
    };
}

// short human-readable location line
function summary(bot) {
    const c = describe(bot);
    const where = c.region
        ? `in ${c.region.name}`
        : c.onKaramja
          ? 'on Karamja'
          : c.inWilderness
            ? `in the wilderness (lvl ${c.wildernessLevel})`
            : c.bank && c.bank.dist < 40
              ? `near ${c.bank.name.replace(/_/g, ' ')}`
              : 'out in the world';
    const bits = [];
    if (c.canFightHere) bits.push('things to fight');
    if (c.canBankHere) bits.push('a bank');
    if (c.canShopHere) bits.push('a shop');
    if (c.nearbyPlayers) bits.push(`${c.nearbyPlayers} player(s)`);
    return bits.length ? `${where}, ${bits.join(', ')} nearby` : where;
}

module.exports = { describe, summary, nearestFacility, nearestSite };
