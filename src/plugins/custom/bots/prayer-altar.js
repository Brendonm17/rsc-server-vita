// bot prayer recharge: when a real prayer user's points run low it travels to
// the nearest altar, recharges via the authentic handler, then heads back
const travel = require('./travel');
const mapData = require('./map-data'); // altar locator
const prayerSkill = require('../../skills/prayer');

// altar object ids with a "recharge at" command
const ALTAR_IDS = new Set([19, 144, 200, 235, 296, 939]);

function prayerSkillOf(bot) {
    return bot.skills && bot.skills.prayer;
}

// only a real prayer user (level >= 10) bothers with an altar trip
function shouldRecharge(bot) {
    if (bot._prayerRun) {
        return true; // a run in progress owns the bot
    }
    const p = prayerSkillOf(bot);
    if (!p || p.base < 10) {
        return false;
    }
    if (p.current > p.base * 0.4) {
        return false; // still has points worth using
    }
    return Math.random() < 0.05; // occasional top-up between fights
}

// nearest routable altar, plane-aware
function nearestAltar(bot) {
    return mapData.nearestSite(bot, ALTAR_IDS, { planeAware: true });
}

function altarObjNear(bot) {
    try {
        for (const o of bot.getNearbyEntities('gameObjects', 4)) {
            if (ALTAR_IDS.has(o.id)) {
                return o;
            }
        }
    } catch (e) {
        // entity scan unavailable
    }
    return null;
}

function startPrayerRun(bot) {
    bot._prayerRun = { altar: nearestAltar(bot), returnTo: { x: bot.x, y: bot.y }, phase: 'toAltar' };
}

// travel to the altar, recharge, head home; returns 'done' | 'running'
function prayerRunTick(bot) {
    const run = bot._prayerRun;
    if (!run) {
        return 'done';
    }
    const a = run.altar;
    if (!a) {
        return 'done';
    }

    if (run.phase === 'toAltar') {
        if (Math.abs(bot.x - a.x) + Math.abs(bot.y - a.y) <= 3) {
            const obj = altarObjNear(bot);
            if (obj) {
                prayerSkill.onGameObjectCommandOne(bot, obj).catch(() => {});
            }
            run.phase = 'back';
            travel.begin(bot, run.returnTo);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, { x: a.x, y: a.y })) {
            return 'done'; // couldn't route to the altar
        }
        travel.step(bot);
        return 'running';
    }

    // heading back to where it was working
    if (Math.abs(bot.x - run.returnTo.x) + Math.abs(bot.y - run.returnTo.y) <= 3 || !travel.isTraveling(bot)) {
        return 'done';
    }
    travel.step(bot);
    return 'running';
}

module.exports = { shouldRecharge, startPrayerRun, prayerRunTick, nearestAltar, ALTAR_IDS };
