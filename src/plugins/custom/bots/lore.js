// lore: bots keep notable deeds as tales and tell them when they gather; listeners
// remember second-hand and retell, embellishing each time. tales persist in cache.bot.tales

const personality = require('./personality');
// resolved once on first use
let _mod_socialEmergent = null;
function mod_socialEmergent() { return _mod_socialEmergent || (_mod_socialEmergent = require('./social-emergent')); }
let _mod_voice = null;
function mod_voice() { return _mod_voice || (_mod_voice = require('./voice')); }

const CAP = 8;             // tales a bot carries
const GROW = 1.35;         // how much a number swells with each retelling

function tales(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return null;
    if (!Array.isArray(cb.tales)) cb.tales = [];
    return cb.tales;
}

// remember a fresh, first-hand deed as a tale.
function record(bot, kind, data) {
    const t = tales(bot);
    if (!t) return;
    const hero = (bot.getFormattedUsername && bot.getFormattedUsername()) || bot.username || 'someone';
    const tale = {
        kind,
        hero,
        subj: (data && data.subj) || '',
        num: (data && data.num) || 0,
        embell: 0
    };
    // don't hoard duplicates of the same fresh deed
    t.unshift(tale);
    if (t.length > CAP) t.length = CAP;
}

const ADJ = ['', 'great ', 'mighty ', 'legendary ', 'fabled '];

function subjPhrase(tale) {
    const adj = ADJ[Math.min(tale.embell, ADJ.length - 1)];
    return adj + (tale.subj || 'foe');
}

function narrate(tale) {
    const h = tale.hero;
    const n = tale.num ? Math.round(tale.num) : 0;
    // a shared saga is told from the inside ("i was there")
    if (tale.shared) {
        const adj = ADJ[Math.min(tale.embell, ADJ.length - 1)];
        if (tale.saga === 'quest') {
            return 'we saw ' + (adj + (tale.subj || 'that quest')) + ' through together. good times.';
        }
        return 'i was there when we brought down ' + (adj + (tale.subj || 'the beast')) + '. what a fight.';
    }
    switch (tale.kind) {
        case 'level':
            return tale.embell > 1
                ? 'they still talk about when ' + h + ' hit ' + n + ' ' + (tale.subj || 'skill') + '.'
                : 'did i tell you? ' + h + ' reached level ' + n + ' ' + (tale.subj || 'skill') + '.';
        case 'kill':
            return h + ' once slew ' + (n > 1 ? n + ' ' : 'a ') + subjPhrase(tale) + (n > 1 ? 's' : '') + '.';
        case 'find':
            return h + ' found ' + subjPhrase(tale) + ' out in the wilds - lucky sod.';
        case 'craft':
            return h + ' forged ' + subjPhrase(tale) + ' with their own two hands' + (n >= 500 ? ' - a real masterpiece' : '') + '.';
        case 'death':
            return h + ' barely escaped ' + subjPhrase(tale) + ', or so they say.';
        case 'feud':
            return h + ' finally bested ' + (tale.subj || 'their rival') + '. what a day.';
        default:
            return h + ' had quite the adventure.';
    }
}

// a listener takes a told tale to heart: keeps a bigger, second-hand copy to retell later.
function absorb(listener, tale) {
    const t = tales(listener);
    if (!t) return;
    if (t.some((x) => x.kind === tale.kind && x.hero === tale.hero && x.subj === tale.subj)) return;
    t.unshift({
        kind: tale.kind,
        hero: tale.hero,
        subj: tale.subj,
        num: tale.num ? tale.num * GROW : 0, // the story grows in the telling
        embell: Math.min(tale.embell + 1, 4)
    });
    if (t.length > CAP) t.length = CAP;
}

// shared saga: one moment lived together becomes the same tale in every witness's
// memory. `witnesses` = the bots who were there (self included)
function recordShared(witnesses, subj, num, saga) {
    if (!Array.isArray(witnesses)) return;
    saga = saga || 'boss';
    for (const w of witnesses) {
        if (!w || !w.isBot) continue;
        const t = tales(w);
        if (!t) continue;
        if (t.some((x) => x.shared && x.subj === subj && x.saga === saga)) continue; // one memory of a shared day
        t.unshift({ kind: saga === 'quest' ? 'find' : 'kill', hero: 'we', subj: subj || 'the beast', num: num || 0, embell: 0, shared: true, saga });
        if (t.length > CAP) t.length = CAP;
    }
}

function speak(bot, line) {
    try {
        let out = line; try { out = mod_voice().apply(bot, line); } catch (e) {}
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
    } catch (e) {}
}

// per-tick: at a gathering, sometimes tell a tale; nearby bots remember it and their
// regard for the hero rises. chat only, rate-limited, gated on sociability
function onTick(bot) {
    if (bot.opponent || bot.locked || (bot.walkQueue && bot.walkQueue.length)) return false;
    if (bot._loreCd && bot._loreCd > 0) { bot._loreCd -= 1; return false; }
    const t = tales(bot);
    if (!t || !t.length) return false;
    const p = personality.of(bot);
    if (p.sociability < 0.4) return false;

    let nearby = [];
    try { nearby = bot.getNearbyEntities('players', 5); } catch (e) { return false; }
    const audience = nearby.filter((o) => o && o !== bot && o.id !== bot.id);
    if (audience.length < 2) { bot._loreCd = 60; return false; } // needs a proper gathering
    if (Math.random() > 0.2 + p.sociability * 0.2) { bot._loreCd = 150; return false; }

    // pick a tale: a storyteller favours the tallest ones (most embellished/biggest)
    let tale = t[0];
    for (const x of t) if ((x.embell + (x.num > tale.num ? 1 : 0)) > tale.embell) tale = x;

    speak(bot, narrate(tale));
    bot._loreCd = 400 + Math.floor(Math.random() * 400);

    // listeners remember it (second-hand, embellished) and warm to the hero.
    for (const o of audience) {
        if (o.isBot && o.cache && o.cache.bot) {
            absorb(o, tale);
            if (o.username !== tale.hero) {
                try { mod_socialEmergent().noteInteraction(o, heroName(tale), 0.2); } catch (e) {}
            }
        }
    }
    return true;
}

// tales store the formatted hero name; strip formatting to key on the raw username
function heroName(tale) {
    return String(tale.hero || '').replace(/@\w+@/g, '').replace(/~\d+~/g, '').trim() || tale.hero;
}

// a shared saga both `a` and `b` carry (same subject), or null
function sharedSagaWith(a, b) {
    const ta = tales(a), tb = tales(b);
    if (!ta || !tb) return null;
    const mine = ta.filter((t) => t.shared);
    for (const t of mine) {
        if (tb.some((x) => x.shared && x.subj === t.subj && x.saga === t.saga)) return t.subj;
    }
    return null;
}

module.exports = { onTick, record, recordShared, tales, narrate, absorb, sharedSagaWith };
