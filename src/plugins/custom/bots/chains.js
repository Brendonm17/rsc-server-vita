// drives a bot through a quest's real steps in order, firing the quest's own
// plugin hooks (talk, operate object, use item, take, cross wall) so it completes
// through authentic logic and a watching player sees every step; falls back to
// Tier-A if a step can't land, so a bot never stalls.
//
// a chain is an ordered list of steps, each one action plus optional `at` (where
// to stand) and `until` (how to tell it worked before advancing):
//   { talk: npcId }                              onTalkToNPC
//   { opObject: objId, cmd: 1|2 }                onGameObjectCommandOne/Two
//   { useOnObject: objId, item: itemId }         onUseWithGameObject
//   { useOnNpc: npcId, item: itemId }            onUseWithNPC
//   { take: itemId }                             onGroundItemTake
//   { opWall: wallId, cmd: 1|2 }                 onWallObjectCommandOne/Two
//   { give: [itemId|{id,amount}, ...] }          provision items
//   { equip: itemId }                            wear/wield a carried item
//   { wait: ticks }                              pause
// until: { stage: n } | { complete: true } | { has: itemId } | { equipped: itemId }
//   (absent: advance one beat after the hook is fired once)

const travel = require('./travel');
const { npcAttackBlocked } = require('../../../packet-handlers/npc');

// step scripts from each quest's plugin code + rsc-data coords; unlisted quests use Tier-A
const CHAINS = require("./quest-chains-data");

function has(key) {
    return !!CHAINS[key];
}
// startStep lets a resumed attempt pick up near where a previous one left off;
// the per-step `until` checks make re-entering a step idempotent
function make(key, startStep = 0) {
    if (!CHAINS[key]) return null;
    const steps = CHAINS[key];
    const i = Math.max(0, Math.min(startStep | 0, steps.length - 1));
    return { key, steps, i, rt: null };
}

// small helpers
function near(bot, at, r = 4) {
    return Math.abs(bot.x - at.x) + Math.abs(bot.y - at.y) <= r;
}
function stageOf(bot, key) {
    return bot.questStages ? bot.questStages[key] : undefined;
}
function hasItem(bot, id, n = 1) {
    return !!(bot.inventory && bot.inventory.has && bot.inventory.has(id, n));
}
function invIndex(bot, id) {
    const items = bot.inventory && bot.inventory.items;
    return items ? items.findIndex((it) => it.id === id) : -1;
}
function findEntity(bot, type, id) {
    try {
        const list = bot.getNearbyEntitiesByID ? bot.getNearbyEntitiesByID(type, id, 10) : [];
        return (list && list[0]) || null;
    } catch (e) {
        return null;
    }
}
// has a step's `until` condition been met? true / false / null (no condition)
function met(bot, key, until) {
    if (!until) return null;
    if (until.complete) return stageOf(bot, key) === -1;
    if (until.stage != null) { const s = stageOf(bot, key); return s === until.stage || s === -1; }
    if (until.has != null) return hasItem(bot, until.has);
    if (until.equipped != null) return !!(bot.inventory && bot.inventory.isEquipped && bot.inventory.isEquipped(until.equipped));
    return null;
}

// fire the step's real plugin hook (fire-and-forget; `until` is checked on later ticks)
function fireHook(bot, step) {
    const world = bot.world;
    if (!world || typeof world.callPlugin !== 'function') return;
    const call = (hook, ...args) => { try { Promise.resolve(world.callPlugin(hook, bot, ...args)).catch(() => {}); } catch (e) {} };
    if (step.talk != null) {
        // steer a branchy dialogue: queue the step's preferred-option hints
        if (Array.isArray(step.answers)) bot._forcedAnswers = step.answers.slice();
        const n = findEntity(bot, 'npcs', step.talk); if (n) call('onTalkToNPC', n);
    } else if (step.opObject != null) {
        const o = findEntity(bot, 'gameObjects', step.opObject); if (o) call(step.cmd === 2 ? 'onGameObjectCommandTwo' : 'onGameObjectCommandOne', o);
    } else if (step.useOnObject != null) {
        const o = findEntity(bot, 'gameObjects', step.useOnObject); const i = invIndex(bot, step.item);
        if (o && i >= 0) call('onUseWithGameObject', o, bot.inventory.items[i]);
    } else if (step.useOnNpc != null) {
        const n = findEntity(bot, 'npcs', step.useOnNpc); const i = invIndex(bot, step.item);
        if (n && i >= 0) call('onUseWithNPC', n, bot.inventory.items[i]);
    } else if (step.take != null) {
        const g = findEntity(bot, 'groundItems', step.take); if (g) call('onGroundItemTake', g);
    } else if (step.opWall != null) {
        const w = findEntity(bot, 'wallObjects', step.opWall); if (w) call(step.cmd === 2 ? 'onWallObjectCommandTwo' : 'onWallObjectCommandOne', w);
    } else if (step.drop != null) {
        const i = invIndex(bot, step.drop); if (i >= 0) call('onDropItem', bot.inventory.items[i]);
    } else if (step.opInv != null) {
        const i = invIndex(bot, step.opInv); if (i >= 0) call('onInventoryCommand', bot.inventory.items[i]);
    } else if (step.useOnInv != null) {
        const i = invIndex(bot, step.item); const t = invIndex(bot, step.useOnInv);
        if (i >= 0 && t >= 0) call('onUseWithInventory', bot.inventory.items[i], bot.inventory.items[t]);
    } else if (step.useOnGround != null) {
        const g = findEntity(bot, 'groundItems', step.useOnGround); const i = invIndex(bot, step.item);
        if (g && i >= 0) call('onUseWithGroundItem', g, bot.inventory.items[i]);
    }
}

// advance the chain one tick; returns 'running' | 'done' | 'stalled' (caller does
// the Tier-A fallback on 'stalled')
function tick(bot, c) {
    if (!c) return 'stalled';
    if (stageOf(bot, c.key) === -1) return 'done';

    // on the first tick, skip leading steps whose stage the quest has already reached
    if (!c._resumed) {
        c._resumed = true;
        const s = stageOf(bot, c.key);
        if (typeof s === 'number' && s > 0) {
            while (c.i < c.steps.length) {
                const st = c.steps[c.i];
                if (st.until && st.until.stage != null && s >= st.until.stage) c.i++;
                else break;
            }
        }
    }

    const step = c.steps[c.i];
    if (!step) return stageOf(bot, c.key) === -1 ? 'done' : 'stalled';

    // a talk step gets a bigger budget: a branchy dialogue only advances on the
    // right option and the auto-answerer explores
    if (!c.rt || c.rt.i !== c.i) c.rt = { i: c.i, cd: 0, fires: 0, loiter: step.kill != null ? 300 : step.talk != null ? 90 : 45 };
    const rt = c.rt;

    // walk to where the step happens
    if (step.at && !near(bot, step.at, 4)) {
        if (!travel.isTraveling(bot) && !travel.begin(bot, step.at)) return 'stalled';
        travel.step(bot);
        return 'running';
    }

    // synchronous steps (no hook)
    if (step.give) {
        for (const it of step.give) {
            const id = typeof it === 'number' ? it : it.id;
            const n = typeof it === 'number' ? 1 : (it.amount || 1);
            if (!hasItem(bot, id, n)) { try { bot.inventory.add(id, n); } catch (e) {} }
        }
        c.i++; return 'running';
    }
    if (step.equip != null) {
        const idx = invIndex(bot, step.equip);
        if (idx >= 0) { try { bot.inventory.equip(idx); } catch (e) {} }
        c.i++; return 'running';
    }
    if (step.setCache) {
        // seed cache flags a quest gates on that a `give` can't provide (the bot
        // "did that part off-screen")
        if (!bot.cache) bot.cache = {};
        for (const k of Object.keys(step.setCache)) bot.cache[k] = step.setCache[k];
        c.i++; return 'running';
    }
    if (step.setStage != null) {
        // last resort: advance past an unscriptable intermediate (an object the data
        // never placed, or a minigame beat); the quest's own completion still fires
        if (!bot.questStages) bot.questStages = {};
        bot.questStages[c.key] = step.setStage;
        c.i++; return 'running';
    }
    if (step.wait != null) {
        if (rt.fires++ >= step.wait) c.i++;
        return 'running';
    }

    // kill step: provision + wield the kit, then engage the target in real combat;
    // combat + the quest's onNPCDeath drive completion, so the budget is long
    if (step.kill != null) {
        if (step.provide) for (const id of step.provide) { if (!hasItem(bot, id)) { try { bot.inventory.add(id, 1); } catch (e) {} } }
        if (step.wield) for (const id of step.wield) { const idx = invIndex(bot, id); if (idx >= 0) { try { bot.inventory.equip(idx); } catch (e) {} } }
        // some kills prompt a choice on death; queue the step's hints
        if (Array.isArray(step.answers)) bot._forcedAnswers = step.answers.slice();
        const npc = findEntity(bot, 'npcs', step.kill);
        if (npc && !bot.opponent && typeof bot.attack === 'function') {
            // the same attack guards a human's packet goes through
            try { Promise.resolve(npcAttackBlocked(bot, npc, false)).then((blocked) => (blocked ? undefined : bot.attack(npc))).catch(() => {}); } catch (e) {}
        }
        const done = met(bot, c.key, step.until);
        if (done === true) { c.i++; return 'running'; }
        rt.loiter -= 1;
        if (rt.loiter <= 0) return 'stalled';
        return 'running';
    }

    // hook step: fire on a cooldown, then watch for `until`
    if (rt.cd > 0) rt.cd -= 1;
    else if (!bot.locked) { fireHook(bot, step); rt.cd = 4; rt.fires += 1; }

    const done = met(bot, c.key, step.until);
    if (done === true) { c.i++; return 'running'; }
    // no explicit condition: advance a beat after the first fire landed
    if (done === null && rt.fires >= 1 && rt.cd <= 2) { c.i++; return 'running'; }

    rt.loiter -= 1;
    if (rt.loiter <= 0 || rt.fires > (step.talk != null ? 18 : 9)) return 'stalled';
    return 'running';
}

module.exports = { has, make, tick, CHAINS };
