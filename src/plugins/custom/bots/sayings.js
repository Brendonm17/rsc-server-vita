// bot sayings organised by situation, for varied overhead chatter; pulled by mood.js

const SAYINGS = {
    // combat (mid-fight)
    combat: [
        'Come on then!', 'Is that all?', 'Take that!', 'Good scrap this.',
        'Keep em coming.', "You'll not beat me.", 'Nearly had you.',
        'Hah, too slow.', 'Feel that?', 'Another one for the count.',
        'This is more like it.', 'Stand and fight!'
    ],
    combatWin: [
        'Down you go!', 'Easy pickings.', 'Who wants next?', 'Another kill.',
        'Too easy.', 'That was fun.', 'On a roll now!', 'Get in!'
    ],
    combatLow: [
        'Getting dicey...', 'Need to heal, quick!', "That hurt.", 'Bit low here.',
        'Careful now.', 'One more hit and I\'m done.', 'Where\'s my food...'
    ],

    // gathering / skilling
    gather: [
        'Steady does it.', 'Chop chop.', 'Good spot for this.',
        'Nearly a full load.', 'Honest work, this.', 'Just topping up.',
        'Relaxing, this is.', 'Bank\'s filling nicely.'
    ],
    tired: [
        'Could use a break.', 'Bit tired of this.', 'Long day.',
        'My arms are aching.', 'Time for a breather.', 'Losing focus a bit.'
    ],

    // economy
    bank: [
        'Time to bank up.', 'Handy, a bank right here.', 'Stash the loot.',
        'Better not lose this lot.', 'Off to the bank.'
    ],
    shop: [
        'Might do some shopping.', 'Need some new gear.', 'Let\'s see the wares.',
        'Coins burning a hole in my pocket.', 'Bit of retail therapy.'
    ],
    sell: [
        'Cash in the junk.', 'Every coin counts.', 'Sell high, that\'s the way.',
        'A tidy profit, this.'
    ],
    rich: [
        'Getting rich, me.', 'Business is good.', 'Coins stacking up.',
        'Nearly enough for that upgrade.', 'Profit!'
    ],
    alch: [
        'Turn it to gold.', 'Magic money, love it.', 'Alch it all.',
        'No need for the shop with magic like this.'
    ],

    // pvp
    pvp: [
        'Reckon I can take them.', 'A target, nice.', 'Fresh meat in the wild.',
        'This one\'s mine.', 'Come here, you.', 'Easy loot incoming.'
    ],
    pvpWin: [
        'Skull and all!', 'Loot\'s mine now.', 'Should\'ve stayed in town.',
        'Another for the pile.', 'Nice drop, ta.'
    ],
    pvpFlee: [
        'Nope, not today!', 'Teleporting out!', 'They\'re too strong, run!',
        'Discretion, valour, all that.', 'I\'m out of here!'
    ],
    grudge: [
        'I remember you...', 'You got lucky last time.', 'Not falling for that again.',
        'Steering clear of that one.'
    ],

    // exploring / travel
    explore: [
        'Wonder what\'s over there.', 'Never been this way before.',
        'Let\'s see the sights.', 'Bit of a wander.', 'The world\'s big, isn\'t it.',
        'Adventure calls.', 'New places to see.'
    ],
    travel: [
        'Long walk ahead.', 'Miles to go.', 'On the road again.',
        'Should\'ve brought a horse.'
    ],

    // progress / goals
    levelUp: [
        'Level up!', 'Ding!', 'Getting stronger.', 'Another level down.',
        'Feel the power!', 'Progress!'
    ],
    goalLevel: ['Going for that next level.', 'Grinding to get stronger.', 'Levels, levels, levels.'],
    goalRich: ['Saving up for something nice.', 'Getting that gold together.', 'A fortune awaits.'],
    goalGear: ['Need better kit.', 'Time to upgrade my gear.', 'Looking for an upgrade.'],
    goalExplore: ['So much still to see.', 'Ticking off the towns.', 'Where to next?'],

    // social / idle
    greet: ['Alright?', 'Good day to you.', 'Hello there.', 'Well met.', 'How do.'],
    idle: ['Just passing the time.', 'Nice day for it.', 'Hmm.', 'La la la.', 'Right then.'],
    lonely: ['Quiet round here.', 'Bit lonely today.', 'Anyone about?']
};

function pick(bot, pool) {
    if (!pool || !pool.length) {
        return null;
    }
    const t = bot && bot._moodTrack;
    let line = pool[Math.floor(Math.random() * pool.length)];
    if (t && line === t.lastLine && pool.length > 1) {
        line = pool[(pool.indexOf(line) + 1) % pool.length];
    }
    return line;
}

// generative line for a situation (chatgen), else the static pool of the same name
function line(bot, situation, ctx) {
    const gen = require('./chatgen').generate(situation, ctx, bot);
    if (gen) {
        return gen;
    }
    return pick(bot, SAYINGS[situation]);
}

module.exports = { SAYINGS, pick, line };
