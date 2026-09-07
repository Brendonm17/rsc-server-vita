// drives a bot through any of the 50 quests. 'talk' quests drive the real dialogue and hand over items;
// 'combat'/'object' quests travel to the location, loiter, then complete with authentic rewards. prereqs respected.

const QUESTS = require('./quests-data');
const travel = require('./travel');
const personality = require('./personality');
const chains = require('./chains');
const requirements = require('./requirements');

const LOITER_TICKS = 45; // time at the hub to attempt/act-out the quest

function isComplete(bot, key) {
    return bot.questStages && bot.questStages[key] === -1;
}

function questPointsOf(bot) {
    return typeof bot.questPoints === 'number' ? bot.questPoints : 0;
}

function skillBase(bot, skill) {
    return bot.skills && bot.skills[skill] ? bot.skills[skill].base : 1;
}

// ---- retry / resume bookkeeping (persisted in cache.bot.quests) -------------
// a quest a bot got stuck on is shelved (keeping progress + the step reached) and resumed later,
// how eagerly driven by personality, mood, and its dream.
function questRec(bot, key) {
    if (!bot.cache) bot.cache = {};
    if (!bot.cache.bot) bot.cache.bot = {};
    if (!bot.cache.bot.quests) bot.cache.bot.quests = {};
    if (!bot.cache.bot.quests[key]) bot.cache.bot.quests[key] = { tries: 0, step: 0, deferUntil: 0 };
    return bot.cache.bot.quests[key];
}
function worldTicks(bot) {
    return bot.world && typeof bot.world.ticks === 'number' ? bot.world.ticks : 0;
}
// is this quest currently shelved (deferred) and not yet due for a retry?
function isDeferred(bot, key) {
    const q = bot.cache && bot.cache.bot && bot.cache.bot.quests && bot.cache.bot.quests[key];
    return !!(q && q.deferUntil && worldTicks(bot) < q.deferUntil);
}

// does the bot meet a quest's prerequisites (so it can sensibly attempt it)?
function prereqsMet(bot, q) {
    const p = q.prereqs || {};
    if (p.questPoints && questPointsOf(bot) < p.questPoints) {
        return false;
    }
    if (p.skills) {
        for (const s of p.skills) {
            if (skillBase(bot, s.skill) < s.level) {
                return false;
            }
        }
    }
    if (p.quests) {
        for (const key of p.quests) {
            if (!isComplete(bot, key)) {
                return false;
            }
        }
    }
    return true;
}

// how much this bot should want a quest: unlocking a pursued skill (Druidic Ritual -> herblaw) is the
// biggest prize, then xp in its goal skill, general xp, and quest points. goal read off the cache.
function questValue(bot, q) {
    const cb = bot.cache && bot.cache.bot;
    const goal = cb && cb.goal;
    const goalSkill = goal && goal.type === 'skill' ? goal.skill : (goal && goal.forSkill) || null;

    let value = 1 + (q.qp || 0) * 4; // baseline: quest points

    // does finishing q unblock the skill the bot wants to train? (herblaw is gated behind Druidic Ritual)
    if (goalSkill) {
        const gate = requirements.questGateFor(goalSkill);
        if (gate && gate === q.key) {
            value += 500; // removes the gate on the goal, top priority
        }
    }

    for (const r of q.rewards || []) {
        const xp = (r.baseXp || 0) + (r.bonusXp || 0);
        value += xp / 100; // any skill xp is a draw
        if (goalSkill && r.skill === goalSkill) {
            value += xp / 20; // xp in the goal skill weighs ~5x
        }
    }
    return value;
}

function pickQuest(bot) {
    const available = QUESTS.filter(
        (q) => !isComplete(bot, q.key) && prereqsMet(bot, q) && !isDeferred(bot, q.key)
    );
    if (!available.length) {
        return null;
    }
    // weighted-random by value: a bot leans toward worthwhile quests while the population still spreads
    const weights = available.map((q) => Math.max(0.1, questValue(bot, q)));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < available.length; i += 1) {
        r -= weights[i];
        if (r <= 0) {
            return available[i];
        }
    }
    return available[available.length - 1];
}

// curious bots occasionally set off on a quest, a small per-opportunity chance
function shouldQuest(bot) {
    const p = personality.of(bot);
    return (
        p.curiosity >= 0.5 &&
        !!pickQuest(bot) &&
        Math.random() < 0.12 + p.curiosity * 0.1
    );
}

function startQuest(bot, quest) {
    // a quest with a real chain is performed step-by-step; the rest travel to the giver
    // and complete with authentic rewards. a resumed attempt starts near the stuck step.
    const rec = questRec(bot, quest.key);
    const chain = chains.has(quest.key) ? chains.make(quest.key, rec.step || 0) : null;
    // a quest owns the bot from here; drop any in-flight relocation and cancel travel so
    // the quest re-plans its route cleanly.
    if (bot._relocateSite) {
        bot._relocateSite = null;
        try { require('./travel').cancel(bot); } catch (e) {}
    }
    bot._quest = {
        key: quest.key,
        name: quest.name,
        category: quest.category,
        hub: quest.hub,
        qp: quest.qp,
        rewards: quest.rewards || [],
        giverId: quest.giverId != null ? quest.giverId : null,
        itemsNeeded: quest.itemsNeeded || null,
        chain,
        phase: chain ? 'chain' : 'travel',
        loiter: LOITER_TICKS,
        talkCd: 0,
        talks: 0
    };
}

// find the quest's giver NPC near the bot (the real character to talk to).
function questNPC(bot, giverId) {
    if (giverId == null || !bot.getNearbyEntities) {
        return null;
    }
    try {
        for (const npc of bot.getNearbyEntities('npcs', 6)) {
            if (npc && npc.id === giverId && !npc.locked && !npc.opponent) {
                return npc;
            }
        }
    } catch (e) {
        // no scan
    }
    return null;
}

// make room for the quest items: bank the cheapest loose loot first;
// worn gear, coins, and anything the goal still needs stay.
function makeRoom(bot, slots) {
    const inv = bot.inventory;
    const bank = bot.bank;
    if (!inv || !inv.items || !bank || typeof bank.deposit !== 'function') return;
    let defs = null;
    try { defs = require('@2003scape/rsc-data/config/items'); } catch (e) { defs = null; }
    const worn = new Set();
    const eq = inv.equipmentSlots || {};
    for (const k of Object.keys(eq)) { if (typeof eq[k] === 'number' && eq[k] >= 0) worn.add(eq[k]); }
    let guard = 0;
    while (inv.items.length > 30 - slots && guard < 12) {
        guard += 1;
        let pick = -1;
        let pickPrice = Infinity;
        for (let i = 0; i < inv.items.length; i += 1) {
            const it = inv.items[i];
            if (worn.has(i) || it.id === 10) continue; // 10 = coins
            const price = defs && defs[it.id] ? (defs[it.id].price || 0) : 0;
            if (price < pickPrice) { pickPrice = price; pick = i; }
        }
        if (pick < 0) break;
        const it = inv.items[pick];
        try { bank.deposit(it.id, it.amount || 1); } catch (e) { break; }
    }
}

function provision(bot, itemsNeeded) {
    if (!itemsNeeded || !bot.inventory || typeof bot.inventory.add !== 'function') {
        return;
    }
    let need = 0;
    for (const it of itemsNeeded) {
        const have = bot.inventory.has ? bot.inventory.has(it.id, it.amount) : false;
        if (!have) need += it.amount || 1;
    }
    if (need > 0) { try { makeRoom(bot, need); } catch (e) {} }
    for (const it of itemsNeeded) {
        const have = bot.inventory.has ? bot.inventory.has(it.id, it.amount) : false;
        if (!have) {
            try { bot.inventory.add(it.id, it.amount); } catch (e) {}
        }
    }
}

// drive the real quest by talking to its giver (auto-answered via BotPlayer.ask), fire-and-forget
function talkToQuestNPC(bot, npc) {
    try {
        const world = bot.world;
        if (world && typeof world.callPlugin === 'function') {
            Promise.resolve(world.callPlugin('onTalkToNPC', bot, npc)).catch(() => {});
        }
    } catch (e) {
        // best-effort
    }
}

// one reward's xp: base * varXp + baseXp (+ a level bonus for a few quests)
function rewardXp(bot, r) {
    const base = skillBase(bot, r.skill);
    let xp = base * (r.varXp || 0) + (r.baseXp || 0);
    if (r.bonusAt && base >= r.bonusAt) {
        xp += r.bonusXp || 0;
    }
    return xp;
}

// grant the quest's authentic completion: questStages = -1, real QP, real level-scaled XP
function complete(bot) {
    const q = bot._quest;
    if (!q) {
        return;
    }
    if (!bot.questStages) {
        bot.questStages = {};
    }
    bot.questStages[q.key] = -1;
    // remembered for conversation ("finished Cook's Assistant earlier")
    try { require('./episodes').note(bot, 'quest', { quest: q.name }); } catch (e) {}
    if (typeof bot.addQuestPoints === 'function') {
        bot.addQuestPoints(q.qp);
    }
    if (typeof bot.addExperience === 'function') {
        for (const r of q.rewards) {
            bot.addExperience(r.skill, rewardXp(bot, r), false);
        }
    }

    // a co-op quest done with a party is remembered by every member as one shared tale
    try {
        const party = bot.party;
        if (party && party.members && party.mission && party.mission.quest && party.mission.quest.key === q.key) {
            let name = q.key;
            try {
                const def = require('./quests-data').find((x) => x.key === q.key);
                name = (def && def.name) || q.key;
            } catch (e) {}
            const witnesses = party.members.filter((m) => m && m.isBot);
            if (witnesses.length > 1) require('./lore').recordShared(witnesses, name, q.qp || 0, 'quest');
        }
    } catch (e) {
        // group saga is best-effort
    }
}

// stuck on a chained quest: shelve it to retry later (true), or give up and finish it now (false).
// a patient/diligent bot (or a would-be legend) keeps coming back; an impatient one finishes abstractly.
function shouldDefer(bot, q) {
    const stage = bot.questStages ? bot.questStages[q.key] : 0;
    if (!stage || stage <= 0) {
        return false; // no progress worth preserving -> just finish it
    }
    const rec = questRec(bot, q.key);
    if ((rec.tries || 0) >= 3) {
        return false; // tried enough times -> finish Tier-A
    }
    const p = personality.of(bot);
    let inclination = p.patience * 0.5 + p.diligence * 0.45;
    try {
        const dream = require('./dreams').ensure(bot);
        if (dream && dream.kind === 'explore') {
            inclination += 0.4; // a would-be legend/explorer keeps at its quests
        }
    } catch (e) {}
    return inclination > 0.4;
}

// shelve the attempt: bump the try count, keep the step reached, set a retry time (a low mood waits longer).
// questStages progress persists, so the next attempt resumes it.
function deferQuest(bot, q) {
    const rec = questRec(bot, q.key);
    rec.tries = (rec.tries || 0) + 1;
    rec.step = q.chain ? q.chain.i : (rec.step || 0);
    let cd = 1500 + rec.tries * 800;
    try {
        const m = require('./mood').of(bot);
        if (m && typeof m.valence === 'number') {
            cd += Math.round((0.5 - Math.max(-1, Math.min(1, m.valence))) * 1200); // gloomier -> longer wait
        }
    } catch (e) {}
    rec.deferUntil = worldTicks(bot) + Math.max(600, cd);
}

function near(bot, coord, r = 3) {
    return Math.abs(bot.x - coord.x) + Math.abs(bot.y - coord.y) <= r;
}

// advance the current quest one tick; returns 'running' | 'done'
function questTick(bot) {
    const q = bot._quest;
    if (!q) {
        return 'done';
    }

    // real chain: physically drive the quest's own steps
    if (q.phase === 'chain' && q.chain) {
        const r = chains.tick(bot, q.chain);
        // remember how far it got, so a retry can resume near here
        const rec = questRec(bot, q.key);
        rec.step = q.chain.i;
        if (r === 'done') {
            return 'done';
        }
        if (r === 'stalled') {
            // stuck on a step: a determined/dreaming bot shelves it to resume later,
            // otherwise it finishes with authentic rewards so the quest still counts.
            if (shouldDefer(bot, q)) {
                deferQuest(bot, q);
            } else if (!isComplete(bot, q.key)) {
                complete(bot);
            }
            return 'done';
        }
        return 'running';
    }

    if (q.phase === 'travel') {
        if (near(bot, q.hub, 4)) {
            q.phase = 'doing';
            return 'running';
        }
        // travel.isTraveling can stay true while the bot is stuck. track closest-approach: if it stops
        // getting nearer the hub, re-plan; if re-plans don't help, finish with real rewards.
        const d = Math.abs(bot.x - q.hub.x) + Math.abs(bot.y - q.hub.y);
        if (q._bestDist == null || d < q._bestDist - 1) {
            q._bestDist = d;
            q._stallTicks = 0;
        } else {
            q._stallTicks = (q._stallTicks || 0) + 1;
        }
        if (q._stallTicks > 30) {
            // no closer in 30 ticks: re-plan once in case it was transient; if it stalls again, finish with real rewards
            q._replans = (q._replans || 0) + 1;
            if (q._replans > 1) {
                complete(bot);
                return 'done';
            }
            q._stallTicks = 0;
            q._bestDist = null;
            try { travel.cancel(bot); } catch (e) {}
            if (!travel.begin(bot, q.hub)) {
                complete(bot);
                return 'done';
            }
            travel.step(bot);
            return 'running';
        }
        if (!travel.isTraveling(bot) && !travel.begin(bot, q.hub)) {
            // hub unreachable -> complete abstractly with authentic rewards
            complete(bot);
            return 'done';
        }
        travel.step(bot);
        return 'running';
    }

    // 'doing' at the real quest location.
    if (isComplete(bot, q.key)) {
        // the quest's real completion logic already fired (talk path)
        return 'done';
    }

    // talk quests: drive the real dialogue and hand over items
    if (q.category === 'talk' && q.giverId != null && !bot.locked) {
        const npc = questNPC(bot, q.giverId);
        if (npc) {
            if (q.talkCd > 0) {
                q.talkCd -= 1;
            } else {
                // provision the hand-over items before the second talk so the quest can take them
                if (q.talks >= 1) {
                    provision(bot, q.itemsNeeded);
                }
                talkToQuestNPC(bot, npc);
                q.talks += 1;
                q.talkCd = 5; // let the dialogue resolve before talking again
            }
        }
    }

    // combat/object quests (and talk quests that didn't land) loiter, then complete with authentic rewards
    q.loiter -= 1;
    if (q.loiter <= 0) {
        if (!isComplete(bot, q.key)) {
            complete(bot);
        }
        return 'done';
    }
    return 'running';
}

module.exports = {
    pickQuest,
    questValue,
    shouldQuest,
    startQuest,
    questTick,
    isComplete,
    prereqsMet,
    rewardXp,
    // exposed for tests / introspection
    shouldDefer,
    deferQuest,
    isDeferred,
    questRec
};
