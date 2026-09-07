// picks an option-menu answer for bots, which have no client to answer: a quest
// chain's queued hint (bot._forcedAnswers) if it matches, else the most
// progressing choice with some exploring across repeated talks.
'use strict';

const POSITIVE = /\b(yes|yeah|yep|ok|okay|sure|of course|please|help|accept|start|begin|continue|carry on|i will|i'?ll|tell me|what|how|more|go on|absolutely|alright|deal|agree|use|get|hand|give|take|show|need|material)\b/i;
const NEGATIVE = /\b(no|nope|not now|never|goodbye|bye|nothing|leave|cancel|forget it|no thanks|maybe later|i'?m busy|another time|mind your own|business|shortstuff|boring|checking out|day off|very funny|suit yourself|hitting rocks)\b/i;

function score(text) {
    const t = String(text).toLowerCase();
    let s = 0;
    if (POSITIVE.test(t)) s += 2;
    if (NEGATIVE.test(t)) s -= 5;
    return s;
}

// deterministic best choice
function chooseDialogueOption(options) {
    if (!Array.isArray(options) || !options.length) {
        return 0;
    }
    let best = 0;
    let bestScore = -Infinity;
    options.forEach((o, i) => {
        const s = score(o) - i * 0.01; // tie-break toward earlier options
        if (s > bestScore) {
            bestScore = s;
            best = i;
        }
    });
    return best;
}

// usually the best option, sometimes another non-dead-end branch so repeated
// talks navigate the whole tree. never a hard-negative one.
function chooseDialogueOptionExplore(options) {
    if (!Array.isArray(options) || !options.length) {
        return 0;
    }
    const scored = options.map((o, i) => ({ i, s: score(o) }));
    const acceptable = scored.filter((x) => x.s > -3);
    if (!acceptable.length) {
        return chooseDialogueOption(options); // all dead ends -> least bad
    }
    // 65% take the best acceptable, else a random acceptable branch
    acceptable.sort((a, b) => b.s - a.s || a.i - b.i);
    if (Math.random() < 0.65) {
        return acceptable[0].i;
    }
    return acceptable[Math.floor(Math.random() * acceptable.length)].i;
}

// steer a branchy dialogue via matchers queued on bot._forcedAnswers: if the
// next hint matches an option, take it and consume it; else explore, keep it.
function matchHint(options, hint) {
    let re;
    try { re = hint instanceof RegExp ? hint : new RegExp(hint, 'i'); } catch (e) { return -1; }
    for (let i = 0; i < options.length; i += 1) {
        if (re.test(String(options[i]))) return i;
    }
    return -1;
}
function chooseForBot(bot, options) {
    if (!Array.isArray(options) || !options.length) {
        return 0;
    }
    if (bot && Array.isArray(bot._forcedAnswers) && bot._forcedAnswers.length) {
        const idx = matchHint(options, bot._forcedAnswers[0]);
        if (idx >= 0) {
            bot._forcedAnswers.shift(); // consumed
            return idx;
        }
        // not the prompt this hint targets: explore, keep the hint
    }
    return chooseDialogueOptionExplore(options);
}

module.exports = {
    chooseDialogueOption,
    chooseDialogueOptionExplore,
    chooseForBot
};
