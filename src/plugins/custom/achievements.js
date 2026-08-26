// achievements: task-tracking + reward system. each achievement is a predicate over the player's state (kills, skill
// levels, total level, wealth), evaluated on events and on demand (::achieve). unlocks stored in player.cache.achievements and announced once

const items = require('@2003scape/rsc-data/config/items');

const COINS_ID = 10;
const CACHE_KEY = 'achievements';

function totalKills(player) {
    const counts = (player.cache && player.cache.npcKillCounts) || {};
    let total = 0;
    for (const id in counts) {
        total += counts[id] | 0;
    }
    return total;
}

function maxSkillLevel(player) {
    let max = 0;
    for (const skill of Object.values(player.skills || {})) {
        const lvl = skill.base || skill.current || 0;
        if (lvl > max) {
            max = lvl;
        }
    }
    return max;
}

function totalLevel(player) {
    let total = 0;
    for (const skill of Object.values(player.skills || {})) {
        total += skill.base || skill.current || 0;
    }
    return total;
}

function coins(player) {
    if (!player.inventory || !player.inventory.items) {
        return 0;
    }
    let n = 0;
    for (const item of player.inventory.items) {
        if (item.id === COINS_ID) {
            n += item.amount || 0;
        }
    }
    return n;
}

// id -> { name, test(player) }
const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', test: (p) => totalKills(p) >= 1 },
    { id: 'slayer_100', name: 'Slayer (100 kills)', test: (p) => totalKills(p) >= 100 },
    { id: 'slayer_1000', name: 'Warlord (1000 kills)', test: (p) => totalKills(p) >= 1000 },
    { id: 'skiller_50', name: 'Apprentice (a level 50)', test: (p) => maxSkillLevel(p) >= 50 },
    { id: 'skiller_99', name: 'Master (a level 99)', test: (p) => maxSkillLevel(p) >= 99 },
    { id: 'total_500', name: 'Well-Rounded (500 total)', test: (p) => totalLevel(p) >= 500 },
    { id: 'total_1000', name: 'Jack of all Trades (1000 total)', test: (p) => totalLevel(p) >= 1000 },
    { id: 'rich_10k', name: 'Getting Started (10k coins)', test: (p) => coins(p) >= 10000 },
    { id: 'rich_100k', name: 'Wealthy (100k coins)', test: (p) => coins(p) >= 100000 }
];

function unlockedSet(player) {
    if (!player.cache) {
        player.cache = {};
    }
    if (!Array.isArray(player.cache[CACHE_KEY])) {
        player.cache[CACHE_KEY] = [];
    }
    return player.cache[CACHE_KEY];
}

// evaluate all achievements; announce + record any newly unlocked. returns the number newly unlocked
function check(player) {
    if (!player) {
        return 0;
    }
    const unlocked = unlockedSet(player);
    let n = 0;
    for (const a of ACHIEVEMENTS) {
        if (unlocked.indexOf(a.id) !== -1) {
            continue;
        }
        let ok = false;
        try {
            ok = !!a.test(player);
        } catch (e) {
            ok = false;
        }
        if (ok) {
            unlocked.push(a.id);
            n++;
            player.message(
                `@or1@Achievement unlocked: @whi@${a.name}@or1@!`
            );
        }
    }
    return n;
}

// ::achieve / ::achievements: show progress
function report(player) {
    const unlocked = unlockedSet(player);
    check(player); // pick up any pending unlocks first
    player.message(
        `@or1@Achievements: @whi@${unlocked.length}@or1@/@whi@${ACHIEVEMENTS.length}`
    );
    const locked = ACHIEVEMENTS.filter((a) => unlocked.indexOf(a.id) === -1);
    if (locked.length) {
        player.message(
            '@or1@Next: @whi@' + locked.slice(0, 3).map((a) => a.name).join(', ')
        );
    } else {
        player.message('@or1@All achievements complete!');
    }
}

module.exports = { check, report };
