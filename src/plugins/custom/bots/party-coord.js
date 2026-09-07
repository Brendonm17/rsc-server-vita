// the leader (or a chat proposal) sets the party mission; every member adopts the matching goal
// and rallies to the gather point so the group converges. this handles getting everyone there.

const goals = require('./goals');
const travel = require('./travel');
const questing = require('./questing');
const { findPathAdjacent } = require('./pathfind');

const PLANE = 944;

// a party with a real player: the bot that invited them acknowledges them, says the plan,
// keeps station on them, and never wanders off without a word.
const STAY_TILES = 5; // closer than this and a member gets on with the mission
const FOLLOW_REACH = 9; // hearing.tickCommands' follow scan is getNearbyEntities(20) => +/-10
const AWAY_TILES = 30; // beyond this the human counts as "gone" (see social.maybeLeaveParty)
// a follow order owns the bot's tick while it lasts, so keep the window short: the bot closes
// the gap, the order lapses, and the next distance check re-arms it.
const FOLLOW_TICKS = 30;
// a human can stand where a bot can't walk; station-keeping must never own the tick forever,
// or every bot member freezes while the player stands there.
const STALL_TICKS = 30; // no movement for this long while closing = stuck
const STALL_REST = 100; // ...so stand down and let the brain run, then retry

// hearing.js requires this module, so resolve it lazily
let _hearing;
function hearing() {
    if (_hearing === undefined) {
        try {
            _hearing = require('./hearing');
        } catch (e) {
            _hearing = null;
        }
    }
    return _hearing;
}

// party.js requires this module, so resolve it lazily too
let _partyMod;
function partyMod() {
    if (_partyMod === undefined) {
        try {
            _partyMod = require('../party');
        } catch (e) {
            _partyMod = null;
        }
    }
    return _partyMod;
}

function leaderOf(party) {
    return party.members.find((m) => m.username === party.leader);
}

// the real player in this party (a member with a username and no isBot), or null.
function humanOf(party) {
    if (!party || !party.members) {
        return null;
    }
    return party.members.find((m) => m && m.username && !m.isBot) || null;
}

function nameOf(p) {
    return (p.getFormattedUsername && p.getFormattedUsername()) || p.username;
}

function tileDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function onSamePlane(a, b) {
    return Math.floor(a.y / PLANE) === Math.floor(b.y / PLANE);
}

// what the party is doing, from the party mission if set, else the bot's own goal;
// one phrase slotted into the curated lines.
function planPhrase(bot, party) {
    const m = party && party.mission;

    if (m) {
        if (m.boss && m.boss.name) return 'hunting ' + m.boss.name;
        if (m.place && m.place.label) return 'off to the ' + m.place.label;
        if (m.quest && m.quest.name) return 'doing ' + m.quest.name;
    }

    let g = null;
    try {
        g = goals.current(bot);
    } catch (e) {
        g = null;
    }

    const type = (m && m.type) || (g && g.type);

    switch (type) {
        case 'boss':
            return 'hunting ' + ((g && g.bossName) || 'something big');
        case 'quest':
            return 'questing' + (g && g.name ? ' - ' + g.name : '');
        case 'skill':
            return g && g.skill ? 'training ' + g.skill : 'skilling';
        case 'getRich':
            return 'after some coin';
        case 'gearUp':
            return 'hunting for gear';
        case 'explore':
            return 'seeing the world';
        case 'levelUp':
            return 'training up';
        default:
            return 'having a wander';
    }
}

// say a line in both channels a human notices: party chat and overhead (in the bot's voice)
function announce(bot, party, text) {
    if (!text) {
        return;
    }

    try {
        const h = hearing();
        if (h && h.sayRaw) {
            h.sayRaw(bot, text);
        } else {
            bot.broadcastChat(text);
        }
    } catch (e) {
        // no audience
    }

    try {
        if (party && party.members && party.members.length) {
            party.broadcast(bot.username, text);
        }
    } catch (e) {
        // party gone
    }
}

// a human accepted a bot's invite; called from party.accept() so the reaction lands the same tick
function onHumanJoin(party, human) {
    if (!party || !human) {
        return;
    }

    const leader = leaderOf(party);
    const greeter =
        leader && leader.isBot
            ? leader
            : party.members.find((m) => m && m.isBot);

    if (!greeter) {
        return; // human-led party of humans, nothing to do
    }

    party._humanName = nameOf(human);
    party._humanJoined = greeter.world ? greeter.world.ticks : 0;

    // a bot leader keeps exp sharing on: toggles it on once, then switches on any member still off
    const pm = partyMod();
    if (leader && leader.isBot && pm) {
        try {
            if (!leader._partyShareExp && pm.toggleExperienceShare) {
                pm.toggleExperienceShare(leader);
            }
            let changed = false;
            for (const m of party.members) {
                if (m && !m._partyShareExp) {
                    m._partyShareExp = 1;
                    changed = true;
                }
            }
            if (changed) {
                party.lastSignature = null;
                party.sendState();
            }
        } catch (e) {
            // party gone
        }
    }

    // every bot member keeps station on the human from now on
    for (const m of party.members) {
        if (m && m.isBot) {
            m._humanAwayTicks = 0;
            m._humanNudgeCd = 60;
        }
    }

    announce(
        greeter,
        party,
        'welcome aboard, ' +
            nameOf(human) +
            "! we're " +
            planPhrase(greeter, party) +
            ' - stick with me.'
    );
}

// the human left/was kicked/logged out; members is the pre-removal roster
function onHumanLeave(party, members, name) {
    const roster = (members && members.length ? members : (party && party.members) || []);
    const bots = roster.filter((m) => m && m.isBot);

    if (!bots.length) {
        return;
    }

    for (const b of bots) {
        b._humanAwayTicks = 0;
        b._humanNudgeCd = 0;
        b._rallyDest = null;
        if (b._follow && b._follow.username === name) {
            b._follow = null;
        }
    }

    if (party) {
        party._humanName = null;
        party._humanJoined = 0;
    }

    // one voice acknowledges, then everyone resumes their own plans.
    const speaker =
        (party && leaderOf(party) && leaderOf(party).isBot && leaderOf(party)) ||
        bots[0];
    const pretty = name ? name[0].toUpperCase() + name.slice(1) : 'friend';

    announce(speaker, party, 'take care, ' + pretty + '.');
}

// returns true to keep owning the tick, or stands the bot down if it's been closing without moving
function closingOk(bot) {
    const at = bot._stationAt;

    if (at && at.x === bot.x && at.y === bot.y) {
        at.ticks += 1;

        if (at.ticks > STALL_TICKS) {
            travel.cancel(bot);
            bot._rallyDest = null;
            bot._stationAt = null;
            bot._stationCd = STALL_REST;
            return false;
        }
    } else {
        bot._stationAt = { x: bot.x, y: bot.y, ticks: 0 };
    }

    return true;
}

// while a human is aboard, every member keeps station on them: walk to them when more than
// STAY_TILES away, else let the mission carry on. returns true if it owned the tick.
function stayWithHuman(bot, party, human) {
    // survival, an explicit order, or a live errand outrank formation, so a bot never abandons a fight to close ranks
    if (
        bot.opponent || bot.locked ||
        bot._foodRun || bot._bankRun || bot._runeRun || bot._ammoRun ||
        bot._quest || bot._chatGoto || bot._holdTicks
    ) {
        return false;
    }

    if (bot._stationCd > 0) {
        bot._stationCd -= 1; // recently found them unreachable, let the brain run
        return false;
    }

    const near = onSamePlane(bot, human);
    const d = tileDistance(bot, human);

    if (!near || d > AWAY_TILES) {
        return false; // they've gone; social.maybeLeaveParty runs the away clock
    }

    if (d <= STAY_TILES) {
        // close enough, drop a stale follow so the bot gets on with the mission
        if (bot._follow && bot._follow.username === human.username) {
            bot._follow = null;
            travel.cancel(bot);
            bot._rallyDest = null;
        }
        return false;
    }

    // beyond FOLLOW_REACH the follow scan can't even see the human, so walk there with the same pathfinder
    if (d > FOLLOW_REACH) {
        if (bot.walkQueue && bot.walkQueue.length) {
            return closingOk(bot); // already on the way
        }

        let steps = null;
        try {
            steps = findPathAdjacent(bot.world, bot.x, bot.y, human.x, human.y);
        } catch (e) {
            steps = null;
        }

        if (steps && steps.length) {
            bot.walkQueue = steps;
            bot._rallyDest = null;
            return closingOk(bot);
        }

        // nothing local (a wall, a different building), use the waypoint graph
        const dest = bot._rallyDest;
        const drifted =
            !dest || Math.abs(dest.x - human.x) + Math.abs(dest.y - human.y) > 8;

        if (!travel.isTraveling(bot) || drifted) {
            bot._rallyDest = { x: human.x, y: human.y };
            travel.begin(bot, { x: human.x, y: human.y });
        }

        if (travel.isTraveling(bot)) {
            travel.step(bot);
            return closingOk(bot);
        }

        return false;
    }

    bot._stationAt = null;

    // within the follow scan's reach: hand it to hearing.tickCommands, which trails a named player.
    // don't refresh a live order; letting it lapse gives the bot its mission time back.
    if (!bot._follow || bot._follow.username !== human.username) {
        bot._follow = { username: human.username, ticks: FOLLOW_TICKS };
    }

    return false; // tickCommands' follow takes the movement from next tick
}

// the leader (or hearing.adoptMission) declares the party's current mission.
function setMission(party, spec) {
    if (!party || !spec || (!spec.type && !spec.boss && !spec.place && !spec.quest)) {
        return;
    }
    const prev = party.mission;
    // don't churn the mission if it's effectively the same one.
    if (prev && prev.type === spec.type &&
        (prev.boss && spec.boss ? prev.boss.id === spec.boss.id : prev.boss === spec.boss) &&
        (prev.place && spec.place ? prev.place.label === spec.place.label : prev.place === spec.place) &&
        (prev.quest && spec.quest ? prev.quest.key === spec.quest.key : prev.quest === spec.quest)) {
        return;
    }
    party._missionSeq = (party._missionSeq || 0) + 1;
    party.mission = {
        seq: party._missionSeq,
        type: spec.type || (spec.boss ? 'boss' : spec.quest ? 'quest' : 'explore'),
        boss: spec.boss || null,
        place: spec.place || null,
        quest: spec.quest || null
    };
}

// pick a co-op quest every member is eligible for (not done, prereqs met by all); prefer a talk quest.
// returns a quest spec for setMission, or null if there's no common quest.
function questForParty(party) {
    if (!party || !party.members || party.members.length < 2) {
        return null;
    }
    const bots = party.members.filter((m) => m.isBot);
    if (!bots.length) {
        return null;
    }
    const QUESTS = require('./quests-data');
    const eligible = QUESTS.filter((q) =>
        bots.every((b) => !questing.isComplete(b, q.key) && questing.prereqsMet(b, q))
    );
    if (!eligible.length) {
        return null;
    }
    // talk quests first (real group completion), else any eligible one.
    const talk = eligible.filter((q) => q.category === 'talk');
    const pool = talk.length ? talk : eligible;
    const q = pool[Math.floor(Math.random() * pool.length)];
    return { quest: { key: q.key, name: q.name, hub: q.hub } };
}

// derive a mission spec from a bot's current goal
function missionFromGoal(bot) {
    const g = goals.current(bot);
    if (!g) {
        return null;
    }
    if (g.type === 'boss') {
        return { type: 'boss', boss: { id: g.bossId, name: g.bossName, x: g.x, y: g.y } };
    }
    return { type: g.type };
}

// where the party should gather for its mission.
function rallyPoint(party) {
    const m = party.mission;
    if (m) {
        if (m.boss) return { x: m.boss.x, y: m.boss.y };
        if (m.place) return { x: m.place.x, y: m.place.y };
        if (m.quest) return { x: m.quest.hub.x, y: m.quest.hub.y };
    }
    const l = leaderOf(party);
    return l ? { x: l.x, y: l.y } : null;
}

// per-tick for a partied bot: adopt the mission goal if new, then rally to the gather point if far.
// returns true if it owned the tick.
function coordinate(bot) {
    const party = bot.party;
    if (!party || !party.members || party.members.length < 2) {
        return false;
    }
    const mission = party.mission;

    // a new mission -> adopt the matching goal
    if (mission && bot._partyMissionSeq !== mission.seq) {
        bot._partyMissionSeq = mission.seq;
        try {
            if (mission.quest) {
                // co-op quest: each member starts its own copy and heads to the shared hub, each earning its own QP
                if (
                    !bot._quest &&
                    !questing.isComplete(bot, mission.quest.key)
                ) {
                    const QUESTS = require('./quests-data');
                    const q = QUESTS.find((x) => x.key === mission.quest.key);
                    if (q && questing.prereqsMet(bot, q)) {
                        questing.startQuest(bot, q);
                    }
                }
            } else if (mission.boss) {
                goals.adopt(bot, 'boss', { boss: mission.boss });
            } else if (mission.type && mission.type !== 'explore') {
                goals.adopt(bot, mission.type, {});
            }
        } catch (e) {
            // goals shape changed
        }
    }

    // keeping station on the real player outranks the rally, and applies to the leader too
    const human = humanOf(party);

    if (human) {
        if (stayWithHuman(bot, party, human)) {
            return true;
        }

        if (bot._follow && bot._follow.username === human.username) {
            return false; // tickCommands is walking the bot back to them
        }
    }

    // rally: only members, never over combat/survival/an explicit chat command
    if (party.leader === bot.username) {
        return false;
    }
    if (
        bot.opponent || bot.locked ||
        bot._foodRun || bot._bankRun || bot._runeRun || bot._ammoRun || bot._quest ||
        bot._chatGoto || bot._follow || bot._holdTicks
    ) {
        return false;
    }
    // with a human aboard they are the gather point, not a lair the player never agreed to
    const rp = human ? { x: human.x, y: human.y } : rallyPoint(party);
    if (!rp) {
        return false;
    }
    const samePlane = Math.floor(bot.y / PLANE) === Math.floor(rp.y / PLANE);
    const d = Math.abs(bot.x - rp.x) + Math.abs(bot.y - rp.y);
    if (samePlane && d <= 12) {
        travel.cancel(bot);
        bot._rallyDest = null;
        return false; // close enough, combat assist keeps formation from here
    }
    // replan if not travelling or the gather point drifted (leader moved)
    const dest = bot._rallyDest;
    const moved = !dest || Math.abs(dest.x - rp.x) + Math.abs(dest.y - rp.y) > 8;
    if (!travel.isTraveling(bot) || moved) {
        bot._rallyDest = { x: rp.x, y: rp.y };
        travel.begin(bot, { x: rp.x, y: rp.y });
    }
    if (travel.isTraveling(bot)) {
        travel.step(bot);
        return true;
    }
    return false;
}

module.exports = {
    setMission,
    missionFromGoal,
    questForParty,
    rallyPoint,
    coordinate,
    humanOf,
    planPhrase,
    announce,
    onHumanJoin,
    onHumanLeave,
    stayWithHuman,
    STAY_TILES,
    AWAY_TILES
};
