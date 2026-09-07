// party consensus: a member proposes switching the party to its own goal, the others
// vote, and if the group leans that way the leader pivots the party to the new mission

const personality = require('./personality');
const goals = require('./goals');

function memberBots(party) {
    return party.members.filter((m) => m.isBot);
}

function pivotPhrase(label) {
    if (/hunting/.test(label)) return label;
    return ({
        levelUp: 'train together', getRich: 'go make some money',
        explore: 'go exploring', gearUp: 'gear up', skill: 'do some skilling'
    })[label] || ('do ' + label);
}

// a member proposes switching the party to its preferred activity; returns a
// party-chat line or null, and sets party._pivot
function propose(bot) {
    const party = bot.party;
    if (!party || party.leader === bot.username) return null; // leaders set missions directly
    if (party._pivot) return null;                            // one proposal at a time
    const pc = require('./party-coord');
    const g = goals.current(bot);
    if (!g) return null;
    const spec = pc.missionFromGoal(bot);
    if (!spec) return null;
    const label = g.type === 'boss' ? ('hunting ' + (g.bossName || 'a boss')) : g.type;
    // don't propose the mission already on
    const cur = party.mission;
    if (cur && cur.type === spec.type && (!spec.boss || (cur.boss && cur.boss.id === spec.boss.id))) {
        return null;
    }
    party._pivot = { by: bot.username, spec, label, votes: { [bot.username]: true }, ticks: 40 };
    return 'shall we ' + pivotPhrase(label) + ' instead?';
}

// a member votes once on the active proposal; agrees if it suits its own goal or it's
// agreeable/restless. returns 'affirm' | 'deny' | null (already voted / n/a)
function vote(bot) {
    const party = bot.party;
    if (!party || !party._pivot) return null;
    const pv = party._pivot;
    if (pv.by === bot.username || pv.votes[bot.username] !== undefined) return null;
    const p = personality.of(bot);
    const g = goals.current(bot);
    let yes = false;
    if (g && pv.spec && (pv.spec.type === g.type || (pv.spec.boss && g.type === 'boss'))) {
        yes = true;                                   // it suits what I wanted anyway
    } else if (p.sociability > 0.6 && Math.random() < p.sociability) {
        yes = true;                                   // easy-going, go with the group
    } else if (p.patience < 0.35 && Math.random() < 0.3) {
        yes = true;                                   // restless, up for a change
    }
    pv.votes[bot.username] = yes;
    return yes ? 'affirm' : 'deny';
}

// the leader resolves the proposal: enough yes among member bots pivots the party,
// otherwise it lapses on timeout. returns true if it pivoted
function resolve(bot) {
    const party = bot.party;
    if (!party || !party._pivot || party.leader !== bot.username) return false;
    const pv = party._pivot;
    pv.ticks -= 1;
    const voters = memberBots(party);
    const yes = voters.filter((m) => pv.votes[m.username] === true).length;
    const need = Math.max(2, Math.ceil(voters.length / 2)); // a real majority, min 2
    if (yes >= need) {
        try { require('./party-coord').setMission(party, pv.spec); } catch (e) {  }
        try { party.notify(`${bot.username}: alright, ${pivotPhrase(pv.label)} it is!`); } catch (e) {  }
        party._pivot = null;
        party._mission = bot.username + ':set';        // mission is (re)announced
        return true;
    }
    if (pv.ticks <= 0) {
        party._pivot = null;                           // proposal fizzled, no pivot
    }
    return false;
}

// per-tick entry: members vote (and sometimes chime in), the leader tallies.
function tick(bot) {
    const party = bot.party;
    if (!party || !party._pivot) return;
    if (bot._pivotCd) bot._pivotCd -= 1;
    if (party.leader === bot.username) {
        resolve(bot);
        return;
    }
    const v = vote(bot);
    if (v && Math.random() < 0.5) {
        // a few members voice their vote
        try {
            const line = require('./chatgen').generate(v === 'affirm' ? 'reactAffirm' : 'reactDeny', {}, bot);
            if (line) party.notify(`${bot.username}: ${line}`);
        } catch (e) {  }
    }
}

module.exports = { propose, vote, resolve, tick, pivotPhrase };
