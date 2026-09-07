// per-bot speech style: a persistent voice derived once from personality + a
// per-bot seed (cached in cache.bot.voice), applied as a post-process to lines

const personality = require('./personality');

function clamp(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

const ABBREV = [
    [/\byou're\b/gi, 'ur'], [/\byour\b/gi, 'ur'], [/\byou\b/gi, 'u'],
    [/\bare\b/gi, 'r'], [/\bthank you\b/gi, 'ty'], [/\bthanks\b/gi, 'ty'],
    [/\bplease\b/gi, 'pls'], [/\bpeople\b/gi, 'ppl'], [/\bthough\b/gi, 'tho'],
    [/\bwant to\b/gi, 'wanna'], [/\bgoing to\b/gi, 'gonna'], [/\bgot to\b/gi, 'gotta'],
    [/\bbecause\b/gi, 'cuz'], [/\bprobably\b/gi, 'prob'], [/\bfor real\b/gi, 'fr']
];

// believable typos on common words only
const TYPOS = [
    [/\bthe\b/, 'teh'], [/\band\b/, 'adn'], [/\bthat\b/, 'taht'],
    [/\bwith\b/, 'wiht'], [/\bjust\b/, 'jsut'], [/\byeah\b/, 'yeh'],
    [/\bwhat\b/, 'waht'], [/\bnice\b/, 'nvie']
];

const CATCH = {
    aggressive: ['ez', 'get good', 'rekt', 'too easy', 'noob'],
    friendly: ['gg', 'cheers', 'nice one', 'good stuff', 'haha'],
    greedy: ['cha-ching', 'profit', 'gimme the gold', 'money talks'],
    hype: ["let's gooo", 'lfg', 'hype', 'big w'],
    chill: ['no worries', 'all good', 'peace', 'vibes'],
    generic: ['haha', 'for real', 'innit', 'ya know', 'lol']
};

function pickCatch(p, energy) {
    let pool;
    if (p.aggression > 0.65) pool = CATCH.aggressive;
    else if (p.greed > 0.65) pool = CATCH.greedy;
    else if (p.sociability > 0.7 && energy > 0.5) pool = CATCH.hype;
    else if (p.sociability > 0.6) pool = CATCH.friendly;
    else if (p.patience > 0.6 && p.aggression < 0.4) pool = CATCH.chill;
    else pool = CATCH.generic;
    return pool[Math.floor(Math.random() * pool.length)];
}

// mood energy; lively bots get the hype pool
function moodEnergy(bot) {
    try { const e = require('./mood').of(bot).energy; return typeof e === 'number' ? e : 0.5; } catch (e) { return 0.5; }
}

// build and persist a bot's voice from personality + a seed
function style(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) {
        return null;
    }
    if (cb.voice) {
        return cb.voice;
    }
    const p = personality.of(bot);
    const casual = clamp(0.25 + Math.random() * 0.6 + (0.5 - p.diligence) * 0.2);
    cb.voice = {
        abbrev: clamp(casual * 0.85 + (p.sociability - 0.5) * 0.2),
        allLower: casual > 0.7 && Math.random() < 0.5,
        caps: clamp((p.aggression - 0.55) * 0.35 + (Math.random() - 0.5) * 0.1),
        excite: clamp((p.sociability - 0.3) * 0.5 + p.aggression * 0.2),
        ellipsis: clamp((0.5 - p.sociability) * 0.5 + (0.5 - p.aggression) * 0.15 + Math.random() * 0.1),
        typo: 0, // off: a planted typo only ever made another bot misread the line
        catchRate: clamp(0.06 + (p.sociability - 0.4) * 0.15),
        catchphrase: pickCatch(p, moodEnergy(bot))
    };
    return cb.voice;
}

function replacePreserve(text, re, rep) {
    return text.replace(re, (m) => (m[0] === m[0].toUpperCase() && /[A-Z]/.test(m[0]) ? rep[0].toUpperCase() + rep.slice(1) : rep));
}

function applyTypo(text) {
    const shuffled = TYPOS.slice().sort(() => Math.random() - 0.5);
    for (const [re, rep] of shuffled) {
        if (re.test(text)) {
            return text.replace(re, rep);
        }
    }
    return text;
}

// restyle a line in the bot's voice
function apply(bot, text) {
    const s = style(bot);
    if (!s || !text) {
        return text;
    }
    let out = text;

    if (s.abbrev > 0) {
        for (const [re, rep] of ABBREV) {
            if (Math.random() < s.abbrev) {
                out = replacePreserve(out, re, rep);
            }
        }
    }
    if (Math.random() < s.typo) {
        out = applyTypo(out);
    }
    // excitement / trailing-off on the terminal punctuation
    if (/[.!]$/.test(out) && Math.random() < s.excite) {
        out = out.replace(/[.!]+$/, Math.random() < 0.4 ? '!!' : '!');
    } else if (/\.$/.test(out) && Math.random() < s.ellipsis) {
        out = out.replace(/\.$/, '...');
    }
    // a signature catchphrase, now and then
    if (Math.random() < s.catchRate) {
        out = out.replace(/\s+$/, '') + ' ' + s.catchphrase + '.';
    }
    // shout short lines for emphasis, rarely
    if (!s.allLower && out.length <= 22 && Math.random() < s.caps) {
        out = out.toUpperCase();
    }
    // a lowercase typist never capitalises
    if (s.allLower) {
        out = out.toLowerCase();
    }
    return out;
}

module.exports = { style, apply };
