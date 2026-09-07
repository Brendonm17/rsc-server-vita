// paced leveling: keeps bots near the reference player's level when enabled
// (default off). ahead -> wander and stop gaining; behind -> catch-up xp nudge

// config keys: pacedLeveling (bool, default off), paceBand (levels)
const DEFAULT_BAND = 8;
const CATCHUP_EVERY = 20; // ticks between catch-up nudges when behind
const CATCHUP_XP = 60; // xp per nudge

function totalLevel(p) {
    let n = 0;
    for (const k of Object.keys(p.skills)) {
        n += p.skills[k].base;
    }
    return n;
}

function referencePlayer(bot) {
    const world = bot.world;

    if (bot.party) {
        const leader = bot.party.members.find(
            (m) => m.username === bot.party.leader
        );
        if (leader && !leader.isBot) {
            return leader;
        }
    }

    let best = null;
    let bestDist = Infinity;

    // nearest human on the same plane (y encodes the plane in 944-tile bands)
    let nearby = [];
    try { nearby = bot.getNearbyEntities('players', 48) || []; } catch (e) { nearby = []; }
    const plane = Math.floor(bot.y / 944);
    for (const p of nearby) {
        if (p === bot || p.isBot || Math.floor(p.y / 944) !== plane) {
            continue;
        }
        const d = bot.getDistance(p);
        if (d < bestDist) {
            bestDist = d;
            best = p;
        }
    }

    return best;
}

// run once per bot per tick: sets bot._paceSlack and nudges a lagging bot
function apply(bot) {
    const cfg = bot.world.server && bot.world.server.config;

    if (!cfg || !cfg.pacedLeveling) {
        bot._paceSlack = false; // toggle off -> free progression
        return;
    }

    const ref = referencePlayer(bot);

    if (!ref) {
        bot._paceSlack = false; // nobody to pace against
        return;
    }

    const band = typeof cfg.paceBand === 'number' ? cfg.paceBand : DEFAULT_BAND;
    const delta = totalLevel(bot) - totalLevel(ref);

    // ahead -> slack off (career brain switches to wander)
    bot._paceSlack = delta > band;

    // behind -> occasional catch-up nudge
    if (delta < -band) {
        bot._paceCatchup = (bot._paceCatchup || 0) + 1;

        if (bot._paceCatchup >= CATCHUP_EVERY) {
            bot._paceCatchup = 0;
            const skills = ['attack', 'strength', 'defense', 'hits'];
            const s = skills[Math.floor(Math.random() * skills.length)];
            try {
                bot.addExperience(s, CATCHUP_XP, false);
            } catch (e) {
                // never break the tick over a nudge
            }
        }
    } else {
        bot._paceCatchup = 0;
    }
}

module.exports = { apply, totalLevel, referencePlayer };
