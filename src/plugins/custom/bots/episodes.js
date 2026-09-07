// recent notable moments (level/kill/death/find/quest/trade), kept as a small
// persisted ring so conversation can draw on them
'use strict';

const MAX = 12;

function ring(bot) {
    const cb = bot && bot.cache && bot.cache.bot;
    if (!cb) return null;
    return cb.episodes || (cb.episodes = []);
}
function nowTick(bot) { return (bot && bot.world && bot.world.ticks) | 0; }
function one(a) { return a[Math.floor(Math.random() * a.length)]; }

// kind -> data: level {skill,level} | kill/boss {foe} | death {killer} | find {item,value}
// quest {quest} | trade {partner,item} | felled/friend {name} | party {leader} | rich {coins}
function note(bot, kind, data) {
    const r = ring(bot);
    if (!r) return;
    const e = Object.assign({ kind, tick: nowTick(bot) }, data || {});
    // the same thing twice in a row is one memory
    const last = r[r.length - 1];
    if (last && last.kind === kind && JSON.stringify(last) === JSON.stringify(Object.assign({}, e, { tick: last.tick }))) {
        last.tick = e.tick;
        last.times = (last.times || 1) + 1;
        return;
    }
    r.push(e);
    if (r.length > MAX) r.shift();
}

// newest first; sinceTicks limits how far back (undefined = all)
function recent(bot, n, sinceTicks) {
    const r = ring(bot);
    if (!r) return [];
    const now = nowTick(bot);
    const out = [];
    for (let i = r.length - 1; i >= 0 && out.length < (n || 3); i--) {
        if (sinceTicks !== undefined && now - r[i].tick > sinceTicks) break;
        out.push(r[i]);
    }
    return out;
}

// how long ago, in words (a tick is 0.64s)
function ago(bot, e) {
    const d = nowTick(bot) - e.tick;
    if (d < 90) return 'just now';
    if (d < 400) return 'a few minutes ago';
    if (d < 1500) return 'earlier';
    if (d < 6000) return 'a while back';
    return 'the other day';
}

// emotional weight: +1 good, -1 bad, 0 neither
function valence(e) {
    switch (e.kind) {
        case 'level': case 'kill': case 'boss': case 'find': case 'quest': case 'rich': case 'friend': case 'felled': case 'party': return 1;
        case 'duel': return e.won ? 1 : -1;
        case 'death': return -1;
        default: return 0;
    }
}

// a sentence about one episode, lowercase
function describe(bot, e) {
    const when = ago(bot, e);
    const times = e.times && e.times > 1 ? e.times : 0;
    switch (e.kind) {
        case 'level':
            return one([
                'hit ' + e.level + ' ' + e.skill + ' ' + when + '.',
                'got ' + e.skill + ' to ' + e.level + ' ' + when + ' - chuffed with that.',
                e.skill + ' ' + e.level + ' now. took some doing.'
            ]);
        case 'kill':
            return times ? one(['been thinning out the ' + e.foe + 's ' + when + '.', 'took down ' + times + ' ' + e.foe + 's ' + when + '.'])
                : one(['put a ' + e.foe + ' down ' + when + '.', 'had a scrap with a ' + e.foe + ' ' + when + '. i won.']);
        case 'boss':
            return one(['took down ' + e.foe + ' ' + when + '. still buzzing.', e.foe + ' went down to me ' + when + '. proper fight, that.']);
        case 'death':
            return one([
                'a ' + e.killer + ' did me in ' + when + '. still sore about it.',
                'died to a ' + e.killer + ' ' + when + '. not my finest hour.',
                'lost a fight to a ' + e.killer + ' ' + when + '. i\'ll have it back.'
            ]);
        case 'find':
            return one(['found ' + e.item + ' ' + when + '.', 'picked up ' + e.item + ' lying about ' + when + '. lucky me.', 'came across ' + e.item + ' ' + when + '.']);
        case 'quest':
            return one(['finished ' + e.quest + ' ' + when + '.', 'wrapped up ' + e.quest + ' ' + when + ' - glad that\'s done.', e.quest + '? done and dusted ' + when + '.']);
        case 'trade':
            return one(['did a trade with ' + e.partner + ' ' + when + '.', 'swapped some bits with ' + e.partner + ' ' + when + '. fair deal.']);
        case 'felled':
            return one(['settled a score with ' + e.name + ' ' + when + '.', 'finally got the better of ' + e.name + ' ' + when + '.']);
        case 'duel':
            return e.won
                ? one(['beat ' + e.name + ' in a duel ' + when + '.', 'won a duel against ' + e.name + ' ' + when + '. took the stake too.', 'duelled ' + e.name + ' ' + when + ' and came out on top.'])
                : one(['lost a duel to ' + e.name + ' ' + when + '. i\'ll have that back.', e.name + ' beat me in a duel ' + when + '. lucky, that.', 'went down to ' + e.name + ' in a duel ' + when + '.']);
        case 'party':
            return one(['ran with ' + e.leader + '\'s lot ' + when + '.', 'teamed up with ' + e.leader + ' ' + when + '. good crew.']);
        case 'rich':
            return one(['purse is looking healthy - ' + e.coins + ' coins ' + when + '.', 'counted ' + e.coins + ' coins ' + when + '. doing alright.']);
        case 'friend':
            return one(['made a friend of ' + e.name + ' ' + when + '.', e.name + ' and i got on well ' + when + '.']);
        default:
            return null;
    }
}

// a story topic drawn from memory, for conversation openers
function storyTopic(bot) {
    const r = recent(bot, 6);
    const picks = [];
    for (const e of r) {
        if (e.kind === 'death') picks.push('the time a ' + e.killer + ' nearly finished me for good');
        else if (e.kind === 'boss') picks.push('the day i brought down ' + e.foe);
        else if (e.kind === 'quest') picks.push('how ' + e.quest + ' went');
        else if (e.kind === 'find') picks.push('the ' + String(e.item).replace(/^(a|an|the|some)\s+/i, '') + ' i stumbled on');
        else if (e.kind === 'felled') picks.push('putting ' + e.name + ' in their place');
    }
    return picks.length ? one(picks) : null;
}

// the latest episode matching a mood valence
function moodReason(bot, valenceSign) {
    const r = recent(bot, 5, 3000);
    for (const e of r) {
        if (valence(e) === valenceSign) {
            const d = describe(bot, e);
            if (d) return d;
        }
    }
    return null;
}

module.exports = { note, recent, describe, storyTopic, moodReason, valence, ago };
