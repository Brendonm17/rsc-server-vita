// bot duelling on the real Duel flow: answer a challenge, stake, accept, confirm, fight, settle
// bots challenge humans and each other, never retreat, and carry the result into rivalry, mood and memory

const personality = require('./personality');
const pacing = require('./pacing');
const mood = require('./mood');
const trades = require('./trades');
const regions = require('./regions');

const COINS_ID = 10;
const COIN_RESERVE = 100; // coins kept out of any stake
const BASE = [0, 0.015, 0.04, 0.09]; // duel appetite level -> per-attempt rate
const MAX_TRIMS = 4; // stake halvings allowed before the bot gives up on the terms
const MAX_NEGO = 12; // stake re-evaluations allowed before the duel is dropped
const FIGHT_IDLE_LIMIT = 40; // ticks without a blow before the fight is abandoned
const HUMAN_CD = 1500; // ticks before challenging the same human again
const HUMAN_DECLINE_CD = 4000; // same, after that human ignored or declined the challenge
const BUSY_WAIT = 12; // ticks to wait for a challenger to close an open screen
const ARENA = 'the Duel Arena';

// ---------------------------------------------------------------------------
// appetite + willingness

function defOf(bot) {
    return (bot.cache && bot.cache.bot) || {};
}

// duel appetite 0..3: the def's duel field, else derived from aggression and risk
function level(bot) {
    const cb = defOf(bot);
    let v = cb.duel;
    if (v === true) v = 2;
    if (typeof v === 'number') {
        v = Math.floor(v);
        return v < 0 ? 0 : v > 3 ? 3 : v;
    }
    const p = personality.of(bot);
    return Math.round((p.aggression * 0.6 + (p.risk || 0) * 0.4) * 3);
}

// nerve 0..1 from rivalry.nerve, else half the aggression
function nerve(bot) {
    try {
        return require('./rivalry').nerve(bot);
    } catch (e) {
        return personality.of(bot).aggression * 0.5;
    }
}

function sentiment(bot, name) {
    try {
        return require('./social-emergent').sentiment(bot, name);
    } catch (e) {
        return 0;
    }
}

// the rivalry ledger entry for other when its level is above 0, else null
function feud(bot, other) {
    if (!other || !other.username) return null;
    try {
        const rivalry = require('./rivalry');
        const f = rivalry.ledger(bot) && rivalry.ledger(bot)[other.username];
        return f && f.level > 0 ? f : null;
    } catch (e) {
        return null;
    }
}

function atArena(x, y) {
    try {
        const r = regions.regionAt(x, y);
        return !!(r && r.name === ARENA);
    } catch (e) {
        return false;
    }
}

// 0..1 chance per attempt to go looking for a duel.
function appetite(bot) {
    const lvl = level(bot);
    if (lvl <= 0) return 0;
    const m = mood.of(bot);
    let a = BASE[lvl] * (0.5 + nerve(bot));
    a += (m.confidence - 0.5) * 0.04;
    if (atArena(bot.x, bot.y)) a *= 3;
    return a < 0 ? 0 : a > 1 ? 1 : a;
}

// whether a challenge from other gets considered: a feud, any appetite, aggression 0.3+, or sentiment 3+
function willingToRespond(bot, other) {
    if (feud(bot, other)) return true;
    if (level(bot) > 0) return true;
    const p = personality.of(bot);
    if (p.aggression >= 0.3) return true;
    return other && other.username ? sentiment(bot, other.username) >= 3 : false;
}

// roll to take a challenge right now; a duel 3 bot always accepts a human
function inTheMood(bot, other) {
    if (other && !other.isBot && level(bot) >= 3) return true;
    const p = personality.of(bot);
    const m = mood.of(bot);
    let c = 0.3 + 0.4 * p.aggression + (m.confidence - 0.5) * 0.4 + level(bot) * 0.06;
    if (feud(bot, other)) c += 0.4;
    if (other && !other.isBot) c += 0.25;
    return Math.random() < (c < 0.05 ? 0.05 : c > 0.95 ? 0.95 : c);
}

// ---------------------------------------------------------------------------
// stakes + odds

function countCoins(bot) {
    let n = 0;
    for (const it of bot.inventory.items) {
        if (it.id === COINS_ID && !it.noted) n += it.amount || 1;
    }
    return n;
}

function spareCoins(bot) {
    return Math.max(0, countCoins(bot) - COIN_RESERVE);
}

function combatLevel(c) {
    try {
        return typeof c.getCombatLevel === 'function' ? c.getCombatLevel() : 3;
    } catch (e) {
        return 3;
    }
}

// estimated win chance 0.08..0.92 from the combat level gap
function winChance(bot, other) {
    const mine = combatLevel(bot);
    const theirs = combatLevel(other);
    const edge = (mine - theirs) / Math.max(6, theirs);
    const p = 0.5 + edge * 0.6;
    return p < 0.08 ? 0.08 : p > 0.92 ? 0.92 : p;
}

// coin stake: match theirs scaled by greed, capped by spare coins and risk; nothing on a friendly duel
// opening (the bot issued the challenge) puts up a slice of spare coins by risk before any offer
function chooseStake(bot, other, theirOffer, opening) {
    const spare = spareCoins(bot);
    if (spare < 20) return [];
    const p = personality.of(bot);
    const cap = Math.floor(spare * (0.1 + (p.risk || 0) * 0.5));
    let amount;
    if (theirOffer && theirOffer.length) {
        amount = Math.floor(trades.marketValue(theirOffer) * (0.85 + p.greed * 0.3));
    } else if (opening) {
        amount = Math.floor(spare * (0.03 + (p.risk || 0) * 0.15));
    } else {
        return [];
    }
    amount = Math.min(amount, cap);
    if (amount < 10) return [];
    return [{ id: COINS_ID, amount }];
}

// stakes worth fighting for: expected value vs win chance, slack scaled by nerve; a feud tolerates a bad bet
function acceptable(bot, myStake, theirStake, other) {
    const gain = trades.marketValue(theirStake || []);
    const cost = trades.marketValue(myStake || []);
    const p = winChance(bot, other);
    const n = nerve(bot);
    const ev = p * gain - (1 - p) * cost;
    if (feud(bot, other)) return ev >= -cost * 0.8;
    if (p < 0.22 && n < 0.6) return false; // long odds and low nerve
    return ev >= -cost * (0.15 + n * 0.45);
}

function halveStake(stake) {
    const next = stake.map((o) => ({ id: o.id, amount: Math.floor(o.amount / 2) })).filter((o) => o.amount > 0);
    return next;
}

// ---------------------------------------------------------------------------
// helpers

function delay(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
}

function say(bot, situation, ctx) {
    try {
        const line = require('./chatgen').generate(situation, ctx || {}, bot);
        if (line) bot.broadcastChat(line);
    } catch (e) {
        // no line to say
    }
}

function busy(bot) {
    return pacing.isBusy(bot) || !!(bot.gatheringSkill || bot._travel);
}

function partnerOffer(partner) {
    return (partner.duel && partner.duel.offer) || [];
}

function inWilderness(c) {
    try {
        return !!(c.withinRegion && c.withinRegion('wilderness'));
    } catch (e) {
        return false;
    }
}

// wraps die() once per bot to flag a death during the fighting stage
function ensureHooks(bot) {
    if (bot._duelHooked) return;
    bot._duelHooked = true;
    const originalDie = bot.die;
    bot.die = function duelAwareDie() {
        if (this._duel && this._duel.stage === 'fighting') {
            this._duel.died = true;
        }
        return originalDie.apply(this, arguments);
    };
}

// clears the duel state; decline closes an open screen; cd = ticks before the next duel hunt
function clearDuel(bot, decline, cd) {
    const open = bot.interfaceOpen && bot.interfaceOpen.duel;
    if (decline && open) {
        try {
            bot.duel.decline();
        } catch (e) {
            // already closed
        }
    }
    // duelRecipient lingers after a challenge that never opened
    if (bot.duel && !(bot.interfaceOpen && bot.interfaceOpen.duel) && !bot.duel.isDuelActive()) {
        bot.duel.duelRecipient = null;
    }
    bot._duel = null;
    bot._duelCd = typeof cd === 'number' ? cd : delay(300, 700);
}

// declines a challenge: drops the request, usually says a line, logs a neutral interaction
function rejectRequest(bot, requester) {
    if (bot.duel && bot.duel.requests) {
        bot.duel.requests.delete(requester);
    }
    if (Math.random() < 0.8) {
        say(bot, 'duelReject', { name: requester.username });
    }
    try {
        require('./social-emergent').noteInteraction(bot, requester.username, 0);
    } catch (e) {
        // no social memory
    }
}

// ---------------------------------------------------------------------------
// settling up

function settle(bot, outcome) {
    const st = bot._duel;
    const partner = st && st.partner;
    const name = partner && partner.username;
    const stake = st ? trades.marketValue(st.myStake || []) : 0;
    const theirs = partner ? trades.marketValue(partnerOffer(partner)) : 0;

    if (outcome === 'won' || outcome === 'lost') {
        const won = outcome === 'won';
        // win/lose line 3 ticks after the last blow
        const line = () => say(bot, won ? 'duelWin' : 'duelLose', { name });
        if (bot.world && typeof bot.world.setTickTimeout === 'function') {
            bot.world.setTickTimeout(line, 3);
        } else {
            line();
        }
        try {
            require('./rivalry').recordOutcome(bot, name, won);
        } catch (e) {
            // no rivalry ledger
        }
        try {
            // sentiment +1 either way, -2 when an aggressive bot loses
            const p = personality.of(bot);
            const delta = won ? 1 : p.aggression > 0.6 ? -2 : 1;
            require('./social-emergent').noteInteraction(bot, name, delta);
        } catch (e) {
            // no social memory
        }
        try {
            require('./episodes').note(bot, 'duel', { name, won, stake: won ? theirs : stake });
        } catch (e) {
            // no episodic memory
        }
        try {
            const m = require('./mood');
            if (typeof m.nudge === 'function') m.nudge(bot, won ? 'proud' : 'sour');
        } catch (e) {
            // mood has no nudge
        }
    }

    clearDuel(bot, false, outcome === 'abandoned' ? delay(60, 140) : delay(300, 700));
}

// fighting stage: re-engages between rounds and settles when the duel ends
// a death in this stage means a loss; a duel that goes inactive mid-fight means a win
function fightAdvance(bot) {
    const st = bot._duel;
    const partner = st.partner;

    if (st.died) {
        settle(bot, 'lost');
        return;
    }

    if (!bot.duel.isDuelActive()) {
        // duel over with the bot alive: a win after any exchange of blows, else abandoned
        settle(bot, st.wasFighting ? 'won' : 'abandoned');
        return;
    }

    st.wasFighting = !!bot.opponent;

    if (bot.opponent) {
        st.idle = 0;
        return;
    }

    st.idle = (st.idle || 0) + 1;

    if (!partner || partner.username == null || st.idle > FIGHT_IDLE_LIMIT) {
        // partner gone or the fight stalled: stakes returned
        try {
            bot.duel.resetAll();
        } catch (e) {
            // already reset
        }
        settle(bot, 'abandoned');
        return;
    }

    // re-engage every third idle tick while unlocked and the partner has hp
    if (!bot.locked && st.idle % 3 === 1 && partner.skills && partner.skills.hits.current > 0) {
        bot.attack(partner).catch(() => {});
    }
}

// ---------------------------------------------------------------------------
// the screen: stake, judge, accept, confirm

function advance(bot) {
    const st = bot._duel;
    const partner = st.partner;

    if (!partner || partner.username == null) {
        clearDuel(bot, true);
        return;
    }

    if (st.stage === 'fighting') {
        fightAdvance(bot);
        return;
    }

    const open = !!(bot.interfaceOpen && bot.interfaceOpen.duel);

    if (!open) {
        if (st.stage === 'requesting') {
            // the partner challenged back: reciprocating opens both screens
            if (bot.duel.requests && bot.duel.requests.has(partner)) {
                try {
                    bot.duel.request(partner);
                } catch (e) {
                    // busy: try again next tick
                }
                return;
            }
            st.t -= 1;
            if (st.t <= 0) {
                if (partner.duel && partner.duel.requests) {
                    partner.duel.requests.delete(bot);
                }
                if (!partner.isBot) {
                    bot._duelHumanCd = bot._duelHumanCd || {};
                    bot._duelHumanCd[partner.username] = HUMAN_DECLINE_CD;
                }
                clearDuel(bot, false, delay(30, 80)); // ignored: short cooldown
            }
            return;
        }

        if (bot.duel.isDuelActive() && st.stage === 'confirming') {
            // both confirmed and the fight is on
            st.stage = 'fighting';
            st.idle = 0;
            st.wasFighting = false;
            st.startTick = bot.world.ticks;
            return;
        }

        // screen closed without a fight: declined, or a stake check failed
        clearDuel(bot, false);
        return;
    }

    switch (st.stage) {
        case 'requesting':
            // challenge taken up, screens open
            st.stage = 'staking';
            st.t = delay(1, 3);
            break;

        case 'staking':
            if (st.t > 0) {
                st.t -= 1;
                break;
            }
            st.myStake = chooseStake(bot, partner, partnerOffer(partner), !st.answered);
            st.trims = 0;
            st.negos = 0;
            if (st.myStake.length) {
                try {
                    bot.duel.updateItems(st.myStake);
                } catch (e) {
                    clearDuel(bot, true);
                    return;
                }
            }
            st.stage = 'negotiating';
            st.t = delay(3, 8); // time for their stake and rules to land
            break;

        case 'negotiating': {
            if (st.t > 0) {
                st.t -= 1;
                break;
            }
            st.negos = (st.negos || 0) + 1;
            if (st.negos > MAX_NEGO) {
                say(bot, 'duelReject', { name: partner.username });
                clearDuel(bot, true); // too many rounds
                return;
            }
            const theirs = partnerOffer(partner);
            // their stake well above the bot's: raise to match when affordable, never after a trim
            if (!st.trims && theirs.length && trades.marketValue(theirs) > trades.marketValue(st.myStake) * 1.5) {
                const raised = chooseStake(bot, partner, theirs, false);
                if (raised.length && trades.marketValue(raised) > trades.marketValue(st.myStake)) {
                    st.myStake = raised;
                    try {
                        bot.duel.updateItems(st.myStake);
                    } catch (e) {
                        clearDuel(bot, true);
                        return;
                    }
                    st.t = delay(2, 5);
                    break;
                }
            }
            if (acceptable(bot, st.myStake, theirs, partner)) {
                st.stage = 'accepting';
                break;
            }
            // terms not acceptable: halve the stake and look again
            if (st.trims < MAX_TRIMS && st.myStake.length) {
                st.myStake = halveStake(st.myStake);
                st.trims += 1;
                try {
                    bot.duel.updateItems(st.myStake);
                } catch (e) {
                    clearDuel(bot, true);
                    return;
                }
                st.t = delay(2, 5);
                break;
            }
            say(bot, 'duelReject', { name: partner.username });
            clearDuel(bot, true);
            return;
        }

        case 'accepting':
            if (!bot.duel.accepted) {
                try {
                    bot.duel.accept();
                } catch (e) {
                    clearDuel(bot, true);
                    return;
                }
            }
            st.stage = 'confirming';
            st.t = delay(60, 120);
            break;

        case 'confirming':
            // accept voided by a stake or rule change: back to negotiating
            if (!bot.duel.accepted) {
                st.stage = 'negotiating';
                st.t = delay(1, 3);
                break;
            }
            // confirm only once both sides have accepted
            if (partner.duel && partner.duel.accepted && !bot.duel.confirmAccepted) {
                try {
                    bot.duel.confirmAccept();
                } catch (e) {
                    clearDuel(bot, true);
                    return;
                }
            }
            st.t -= 1;
            if (st.t <= 0) {
                clearDuel(bot, true); // they never confirmed
            }
            break;

        default:
            clearDuel(bot, true);
    }
}

// ---------------------------------------------------------------------------
// challenging

// whether the bot may challenge other right now
function canChallenge(bot, other) {
    if (!other || other === bot || other.username == null) return false;
    if (bot.locked || other.locked) return false;
    if (inWilderness(bot) || inWilderness(other)) return false;
    if (other.hasInterfaceOpen && other.hasInterfaceOpen()) return false;
    if (bot.hasInterfaceOpen && bot.hasInterfaceOpen()) return false;
    if (other.duel && other.duel.isDuelActive()) return false;
    if (other.opponent) return false;
    if (!other.isBot) {
        if (other.blockDuel) return false; // duel requests off
        const cd = bot._duelHumanCd && bot._duelHumanCd[other.username];
        if (cd > 0) return false;
    }
    try {
        if (!bot.withinRange(other, 8, true)) return false;
        if (!bot.withinLineOfSight(other)) return false;
        if (typeof bot.getIronManTradeBlock === 'function' && bot.getIronManTradeBlock(other)) return false;
    } catch (e) {
        return false;
    }
    return true;
}

// opponent score: feud, arena, grudge or mate, long odds scaled by nerve, easy wins and humans marked down
function challengerScore(bot, other) {
    let score = 1;
    const f = feud(bot, other);
    if (f) score += 4 + Math.min(4, f.level);
    if (atArena(other.x, other.y)) score += 3;
    const rel = sentiment(bot, other.username);
    if (rel <= -3) score += 3; // grudge
    if (rel >= 3) score += 1; // mate
    const p = winChance(bot, other);
    if (p < 0.3) score -= f ? 0 : 4 - nerve(bot) * 3;
    if (p > 0.75) score -= 1; // easy win
    if (!other.isBot) score -= 1; // human
    return score;
}

function findChallenger(bot) {
    let best = null;
    let bestScore = 0.5;
    try {
        for (const other of bot.getNearbyEntities('players', 8)) {
            if (!canChallenge(bot, other)) continue;
            const s = challengerScore(bot, other);
            if (s > bestScore) {
                bestScore = s;
                best = other;
            }
        }
    } catch (e) {
        return null;
    }
    return best;
}

// sends a duel request to other; true when sent. opts.quiet skips the chat line
function challenge(bot, other, opts) {
    ensureHooks(bot);
    if (bot._duel) return false;
    if (!canChallenge(bot, other)) return false;
    try {
        bot.duel.request(other);
    } catch (e) {
        return false;
    }
    if (!(opts && opts.quiet)) {
        say(bot, 'duelChallenge', { name: other.username });
    }
    if (!other.isBot) {
        bot._duelHumanCd = bot._duelHumanCd || {};
        bot._duelHumanCd[other.username] = HUMAN_CD;
    }
    bot._duel = { partner: other, stage: 'requesting', t: delay(20, 40) };
    return true;
}

function tickHumanCooldowns(bot) {
    const cds = bot._duelHumanCd;
    if (!cds) return;
    for (const name of Object.keys(cds)) {
        if (cds[name] > 0) cds[name] -= 1;
        else delete cds[name];
    }
}

// ---------------------------------------------------------------------------
// per tick: advance a live duel, else answer a challenge, else maybe pick a fight
function onTick(bot) {
    if (!bot.duel) return;
    ensureHooks(bot);
    tickHumanCooldowns(bot);

    if (bot._duel) {
        advance(bot);
        return;
    }

    if (bot.interfaceOpen && bot.interfaceOpen.duel) {
        // duel screen open with no tracked state: decline
        try {
            bot.duel.decline();
        } catch (e) {
            // already closed
        }
        return;
    }

    if (bot.duel.isDuelActive()) {
        // untracked live duel: adopt it in the fighting stage
        bot._duel = { partner: bot.duel.duelRecipient, stage: 'fighting', idle: 0, wasFighting: !!bot.opponent };
        return;
    }

    // pending challenges are answered ahead of the busy check
    if (bot.duel.requests && bot.duel.requests.size > 0) {
        let requester = null;
        for (const r of bot.duel.requests) {
            requester = r;
            break;
        }
        if (!requester || requester.username == null) {
            bot.duel.requests.delete(requester);
            return;
        }
        if (inWilderness(bot) || !willingToRespond(bot, requester) || !inTheMood(bot, requester)) {
            rejectRequest(bot, requester);
            return;
        }
        if (requester.hasInterfaceOpen && requester.hasInterfaceOpen()) {
            // challenger has a screen open: wait up to BUSY_WAIT ticks, then drop the request
            bot._duelWait = (bot._duelWait || 0) + 1;
            if (bot._duelWait > BUSY_WAIT) {
                bot._duelWait = 0;
                bot.duel.requests.delete(requester);
            }
            return;
        }
        bot._duelWait = 0;
        try {
            bot.duel.request(requester); // reciprocate -> opens both screens
        } catch (e) {
            return;
        }
        say(bot, 'duelAccept', { name: requester.username });
        bot._duel = { partner: requester, stage: 'staking', t: delay(1, 3), answered: true };
        return;
    }

    if (busy(bot)) return;

    if (bot._duelCd > 0) {
        bot._duelCd -= 1;
        return;
    }

    if (Math.random() >= appetite(bot)) {
        bot._duelCd = delay(20, 50);
        return;
    }

    const other = findChallenger(bot);
    if (!other) {
        bot._duelCd = delay(30, 70);
        return;
    }
    if (!challenge(bot, other)) {
        bot._duelCd = delay(30, 70);
    }
}

// true while a duel screen is open or a fight is on
function owns(bot) {
    return !!(bot.duel && (bot.duel.isDuelActive() || (bot.interfaceOpen && bot.interfaceOpen.duel)));
}

// rules of the live duel: retreat, magic, prayer, weapons; all false when not dueling
function rules(bot) {
    const d = bot.duel;
    if (!d || !d.isDuelActive()) {
        return { retreat: false, magic: false, prayer: false, weapons: false };
    }
    return {
        retreat: !!d.getDuelSetting(0),
        magic: !!d.getDuelSetting(1),
        prayer: !!d.getDuelSetting(2),
        weapons: !!d.getDuelSetting(3)
    };
}

module.exports = {
    onTick,
    challenge,
    level,
    appetite,
    willingToRespond,
    acceptable,
    chooseStake,
    winChance,
    owns,
    rules,
    findChallenger,
    canChallenge
};
