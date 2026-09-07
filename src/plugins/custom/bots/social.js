// bots form and run their own parties: a sociable bot calls out to attract players,
// then runs the party through party chat (mission + banter). gated by sociability, appetite, mood.

const personality = require('./personality');
const mood = require('./mood');
const goals = require('./goals');

// party-coord resolved lazily to keep the require graph acyclic
let _partyCoord;
function partyCoord() {
    if (_partyCoord === undefined) {
        try {
            _partyCoord = require('./party-coord');
        } catch (e) {
            _partyCoord = null;
        }
    }
    return _partyCoord || { humanOf: () => null };
}

const BASE = [0, 0.1, 0.3, 0.6]; // party appetite level -> base rate

// the pitch a bot shouts to attract a party (overhead chat)
const CALLOUTS = {
    levelUp: ['Anyone want to train together?', 'LFG for some XP!', 'Party up for levels?'],
    getRich: ['Team up for a money run?', 'LFG, splitting loot!', 'Anyone up for a gold grind?'],
    gearUp: ['Need a hand gearing up, party?', 'LFG for a gear run.', 'Team up, hunt some drops?'],
    explore: ["Adventure party - who's in?", 'Fancy exploring together?', 'LFG, seeing the world!'],
    boss: ['Boss hunt! Who\'s brave enough?', 'LFG to take down a boss!', 'Need a team for a boss.'],
    skill: ['Skilling party, anyone?', 'Team up for a skill session?', 'LFG, chill skilling.']
};

// the mission the leader posts in party chat once a party forms
const MISSIONS = {
    levelUp: ["Right team - let's grind some levels!", 'Mission: everyone gains a few levels. Stick together!', 'Time to get stronger, all of us.'],
    getRich: ["Mission: get RICH. Loot goes to whoever needs it.", "Let's fill our coffers, team!", 'Gold run - grab everything that drops.'],
    gearUp: ['Mission: kit everyone out. Watch for upgrades!', "Let's find some proper gear, party.", 'Gear hunt - call out any good drops.'],
    explore: ["Mission: see the world! Follow me, gang.", "Let's explore somewhere new together.", 'Adventure awaits - keep up!'],
    boss: (name) => [`Mission: we\'re hunting ${name}! Stay sharp.`, `Big one today, team - ${name} is going down.`, `${name} hunt! Watch your health.`],
    skill: ["Mission: a bit of chill skilling together.", "Let's skill up as a team.", 'Relaxed session - gather and chat.'],
    quest: (name) => [`Mission: let\'s do ${name} together!`, `Party quest - ${name}. Follow me, gang.`, `Fancy questing? ${name} it is. Stick close.`]
};

// what a bot puts to a real player standing around with it (party chat), curated
const HUMAN_PROMPTS = [
    'shall we go bank?',
    'what do you fancy doing?',
    'ready when you are.',
    'want to head off, then?'
];

// how long a human must be gone before a bot signs off from a party; ~3 min of ticks
const HUMAN_AWAY_LEAVE = 300;
const PLANE = 944;

// ongoing party-chat banter, flavoured by mood
const BANTER = {
    high: ['Great work, team!', 'We\'re smashing it!', 'Best party I\'ve been in.', 'Keep it up, gang!'],
    mid: ['How\'s everyone doing?', 'Sticking together, yeah?', 'Onwards, team.', 'Nice one.'],
    low: ['Getting tough, hold on.', 'Careful, everyone.', 'Might need a break soon.', 'Stay close.']
};

function level(bot) {
    const cb = bot.cache && bot.cache.bot;
    let v = cb ? cb.party : 0;
    if (v === true) v = 2;
    v = typeof v === 'number' ? Math.floor(v) : 0;
    return v < 0 ? 0 : v > 3 ? 3 : v;
}

function isPartyLeaderType(bot) {
    return level(bot) > 0;
}

// 0..1 drive to reach out, dominated by sociability; a good mood nudges it up
function appetite(bot) {
    const lvl = level(bot);
    if (lvl <= 0) {
        return 0;
    }
    const p = personality.of(bot);
    const m = mood.of(bot);
    if (p.sociability < 0.3) {
        return 0; // a genuine loner won't start a party
    }
    let a = BASE[lvl] * (0.4 + p.sociability) + (m.valence - 0.5) * 0.2;
    return a < 0 ? 0 : a > 1 ? 1 : a;
}

function alreadyPartied(p) {
    return !!(p && p.party && p.party.members && p.party.members.length > 1);
}

function goalKind(bot) {
    try {
        const g = goals.current(bot);
        return g ? g.type : 'levelUp';
    } catch (e) {
        return 'levelUp';
    }
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// per-tick: run the party if in one, else call out and invite a nearby player to form one
function maybeFormParty(bot) {
    // any bot in a party can leave and banter, so this runs before the leader gate
    if (alreadyPartied(bot)) {
        if (maybeLeaveParty(bot)) {
            return false;
        }
        runParty(bot);
        return false;
    }
    bot._partyTime = 0; // not in a party -> reset the party-time clock

    if (!isPartyLeaderType(bot)) {
        return false; // only bots with a party appetite start parties
    }

    if (bot._partyCd > 0) {
        bot._partyCd -= 1;
        return false;
    }
    if (Math.random() >= appetite(bot)) {
        bot._partyCd = 60 + Math.floor(Math.random() * 120);
        return false;
    }

    // find a nearby, invitable, un-partied player, preferring a friend, never a rival
    let target = null;
    try {
        const emergent = require('./social-emergent');
        let factions = null;
        try { factions = require('./factions'); } catch (e) {}
        const myFaction = factions && factions.factionOf(bot);
        let bestScore = -Infinity;
        for (const other of bot.getNearbyEntities('players', 8)) {
            if (other === bot || other.id === bot.id) continue;
            if (alreadyPartied(other) || other.pendingPartyInvite) continue;
            const feel = emergent.sentiment(bot, other.username);
            if (feel <= -3) continue; // won't team up with a rival
            // faction pulls the party together: kin sought out, enemies shunned
            let score = feel;
            if (myFaction && factions) {
                const theirs = factions.allegianceName(other);
                if (theirs) {
                    if (factions.areRivals(myFaction.name, theirs)) continue; // never party the enemy
                    if (theirs === myFaction.name) score += 5; // fellow members band together
                }
            }
            if (score > bestScore) { bestScore = score; target = other; }
        }
    } catch (e) {
        // no scan
    }

    // call out to attract someone even if no one's in range yet
    const kind = goalKind(bot);
    say(bot, pick(CALLOUTS[kind] || CALLOUTS.levelUp));

    if (!target) {
        bot._partyCd = 40 + Math.floor(Math.random() * 60);
        return false;
    }
    try {
        require('../party').invite(bot, target.username);
        // teaming up warms the relationship
        require('./social-emergent').noteInteraction(bot, target.username, 2);
        // organising a party builds a "helper" reputation over time
        require('./reputation').note(bot, 'help');
    } catch (e) {
        return false;
    }
    bot._partyCd = 250 + Math.floor(Math.random() * 250);
    return true;
}

// a bot leaves its party when it's had enough (bored, low mood), after a grace period.
// returns true if it left.
function maybeLeaveParty(bot) {
    const party = bot.party;
    if (!party || !party.members || party.members.length <= 1) {
        return false;
    }
    // with a real player in the party, a bot never silently walks out; it only signs
    // off once they've been gone a long while, saying goodbye and handing over first.
    const human = partyCoord().humanOf(party);
    if (human) {
        return maybeLeaveHumanParty(bot, party, human);
    }
    bot._partyTime = (bot._partyTime || 0) + 1;
    if (bot._partyTime < 300) {
        return false; // give the party a fair chance first
    }
    const p = personality.of(bot);
    const m = mood.of(bot);
    // restlessness grows with low sociability and low energy/mood
    let want =
        0.0009 * (1 - p.sociability) +
        (0.5 - m.energy) * 0.0015 +
        (0.5 - m.valence) * 0.0015;
    if (party.leader === bot.username) {
        want *= 0.4; // a leader is more committed to the group it formed
    }
    if (want <= 0 || Math.random() >= want) {
        return false;
    }
    // before leaving, a member first proposes steering the party its way;
    // it only leaves if it can't get a proposal going.
    if (party.leader !== bot.username && !party._pivot && (bot._pivotCd || 0) <= 0) {
        try {
            const line = require('./party-consensus').propose(bot);
            if (line) {
                party.notify(`${bot.username}: ${line}`);
                bot._pivotCd = 150;      // don't nag with proposals
                bot._partyTime = 150;    // reset the leave clock, give the pivot a chance
                return false;            // proposed instead of leaving
            }
        } catch (e) {}
    }
    try {
        const line = require('./chatgen').generate('partyLeave', {}, bot);
        if (line) {
            party.notify(`${bot.username}: ${line}`);
        }
        require('../party').leave(bot);
    } catch (e) {
        // party module shape changed, ignore
    }
    bot._partyTime = 0;
    bot._partyCd = 400 + Math.floor(Math.random() * 400); // don't instantly re-party
    return true;
}

// a bot leaving a party with a human in it: only once they've been away a long time, never without a word
function maybeLeaveHumanParty(bot, party, human) {
    const pc = partyCoord();
    const away =
        human.loggedIn === false ||
        Math.floor(bot.y / PLANE) !== Math.floor(human.y / PLANE) ||
        Math.abs(bot.x - human.x) + Math.abs(bot.y - human.y) >
            (pc.AWAY_TILES || 30);

    if (!away) {
        bot._humanAwayTicks = 0;
        return false; // still with the party, so stay
    }

    bot._humanAwayTicks = (bot._humanAwayTicks || 0) + 1;
    if (bot._humanAwayTicks < HUMAN_AWAY_LEAVE) {
        return false;
    }

    const who =
        (human.getFormattedUsername && human.getFormattedUsername()) ||
        human.username;

    try {
        if (pc.announce) {
            pc.announce(
                bot,
                party,
                "i'll head off, " + who + ' - thanks for the company.'
            );
        }
    } catch (e) {
        // goodbye is best-effort
    }

    // never strand the human in a party whose leader has left
    if (party.leader === bot.username && typeof party.promote === 'function') {
        try {
            party.promote(human);
        } catch (e) {
            // older party shape; remove() reassigns the leader
        }
    }

    try {
        require('../party').leave(bot);
    } catch (e) {
        // party module shape changed, ignore
    }

    bot._humanAwayTicks = 0;
    bot._partyTime = 0;
    bot._partyCd = 400 + Math.floor(Math.random() * 400);
    return true;
}

// retarget a stale follow order onto the human; runs before hearing.tickCommands,
// which owns the tick while a follow order is live.
function anchorOnHuman(bot, party, human) {
    if (!bot._follow || bot._follow.username === human.username) {
        return;
    }

    const pc = partyCoord();
    const d = Math.abs(bot.x - human.x) + Math.abs(bot.y - human.y);

    if (d > (pc.STAY_TILES || 5)) {
        bot._follow = { username: human.username, ticks: 30 };
    }
}

// a member breaking off on an errand (bank/food/runes/ammo) tells the party;
// once per errand, the flag resets when the errand ends.
function tellErrand(bot, party) {
    const errand = bot._bankRun
        ? 'bank'
        : bot._foodRun
            ? 'food'
            : bot._runeRun
                ? 'runes'
                : bot._ammoRun
                    ? 'ammo'
                    : null;

    if (!errand) {
        bot._errandTold = null;
        return;
    }

    if (bot._errandTold === errand) {
        return;
    }

    bot._errandTold = errand;

    const lines = {
        bank: 'nipping to the bank - back in a tick.',
        food: 'need to restock some food, back shortly.',
        runes: 'off to buy runes, back soon.',
        ammo: 'grabbing more ammo, back soon.'
    };

    try {
        partyCoord().announce(bot, party, lines[errand]);
    } catch (e) {
        // no audience
    }
}

// when the human is idle nearby, put something to them; at most once every ~60 ticks,
// and only from one voice so the party doesn't nag in chorus.
function nudgeHuman(bot, party, human) {
    const pc = partyCoord();
    const spokesman =
        party.leader === bot.username ||
        !party.members.some((m) => m && m.isBot && m.username === party.leader);

    if (!spokesman) {
        return;
    }

    if (bot._humanNudgeCd > 0) {
        bot._humanNudgeCd -= 1;
    }

    if (
        Math.abs(bot.x - human.x) + Math.abs(bot.y - human.y) >
        (pc.STAY_TILES || 5)
    ) {
        bot._humanIdle = null;
        return;
    }

    // idle = parked on the same tile for a bit
    const at = bot._humanIdle;
    if (!at || at.x !== human.x || at.y !== human.y) {
        bot._humanIdle = { x: human.x, y: human.y, ticks: 0 };
        return;
    }

    at.ticks += 1;
    if (at.ticks < 10 || bot._humanNudgeCd > 0) {
        return;
    }

    bot._humanNudgeCd = 60 + Math.floor(Math.random() * 30);
    at.ticks = 0;

    const who =
        (human.getFormattedUsername && human.getFormattedUsername()) ||
        human.username;
    const line =
        Math.random() < 0.5
            ? pick(HUMAN_PROMPTS)
            : "we're " + pc.planPhrase(bot, party) + ', ' + who + ' - coming?';

    try {
        pc.announce(bot, party, line);
    } catch (e) {
        // no audience
    }
}

// while in a party: the leader posts the mission when fresh, members banter now and then
function runParty(bot) {
    const party = bot.party;
    if (!party) {
        return;
    }
    const p = personality.of(bot);
    const isLeader = party.leader === bot.username;

    // with a real player aboard, keep the conversation pointed at them; an idle human
    // gets a proposal instead of bot-to-bot banter.
    const human = partyCoord().humanOf(party);
    if (human) {
        anchorOnHuman(bot, party, human);
        tellErrand(bot, party);
        nudgeHuman(bot, party, human);
    }

    // leader posts the mission once and registers it as the party's shared mission
    if (isLeader && party._mission !== bot.username + ':set') {
        party._mission = bot.username + ':set';
        const pc = require('./party-coord');
        let line;
        // a curious leader sometimes rallies the party around a shared quest, not its own goal
        let questMission = null;
        if (p.curiosity >= 0.5 && Math.random() < 0.22 + p.curiosity * 0.15) {
            try {
                questMission = pc.questForParty(party);
            } catch (e) {
                // no common quest
            }
        }
        // a faction leader often rallies the party around the faction's cause instead
        let facMission = null;
        if (!questMission) {
            try {
                const fac = require('./factions');
                if (fac.factionOf(bot)) facMission = fac.partyMission(bot);
            } catch (e) {}
        }
        try {
            if (facMission) {
                pc.setMission(party, facMission.spec);
                line = facMission.line;
            } else if (questMission) {
                pc.setMission(party, questMission);
                line = pick(MISSIONS.quest(questMission.quest.name));
            } else {
                const kind = goalKind(bot);
                if (kind === 'boss') {
                    const g = goals.current(bot);
                    const name = (g && g.bossName) || 'a boss';
                    line = pick(MISSIONS.boss(name));
                } else {
                    line = pick(MISSIONS[kind] || MISSIONS.levelUp);
                }
                pc.setMission(party, pc.missionFromGoal(bot));
            }
        } catch (e) {
            // coordination best-effort
            line = line || pick(MISSIONS.levelUp);
        }
        try {
            party.notify(line);
        } catch (e) {
            // party gone
        }
        return;
    }

    // occasional banter, spaced by sociability
    bot._banterCd = (bot._banterCd || 0) - 1;
    if (bot._banterCd <= 0) {
        bot._banterCd = Math.floor(300 + (1 - p.sociability) * 700);
        const m = mood.of(bot);
        // generative banter, falling back to the curated mood-bucket line
        const line = require('./chatgen').generate('banter', {}, bot) || pick(BANTER[mood.bucket(m)]);
        try {
            party.broadcast(bot.username, line);
        } catch (e) {
            // party gone
        }
    }
}

// overhead/world chat to attract nearby players before a party exists
function say(bot, line) {
    try {
        bot.broadcastChat(line);
    } catch (e) {
        // no audience
    }
}

module.exports = {
    level,
    appetite,
    isPartyLeaderType,
    maybeFormParty,
    runParty
};
