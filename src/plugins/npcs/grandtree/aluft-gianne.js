// aluft gianne, the gnome restaurant trainer in the grand tree. teaches the
// gnome cooking recipes stage-by-stage, then hands out repeatable jobs. the
// cooking mechanics live in ../../skills/cooking/gnome-cooking.js; this file
// owns the talk-to-npc dialogue only
//
// player.cache keys:
//   gnomeCooking        : dialogue/training stage (1-7)
//   gnomeRestaurantJob  : current random job index (0-8), while stage 7
//   gianneJobsCompleted : lifetime completed-job counter
//   gianneCompleteFeed  : true once the "250 orders" announcement fired

const ALUFT_GIANNE_ID = 536;

const ITEM = {
    GIANNE_COOK_BOOK: 899,
    TOMATO: 320,
    CHEESE: 319,
    EQUA_LEAVES: 873,
    GIANNE_DOUGH: 881,
    CHOCOLATE_BAR: 337,
    CHOCOLATE_DUST: 772,
    CREAM: 871,
    GNOME_SPICE: 898,
    ONION: 241,
    COINS: 10,
    GIANNE_BADGE: 917,
    CHEESE_AND_TOMATO_BATTA: 901,
    CHOCOLATE_BOMB: 907,
    TOAD_BATTA: 902,
    WORM_HOLE: 909,
    TOAD_CRUNCHIES: 913,
    WORM_BATTA: 904,
    VEG_BATTA: 906,
    VEGBALL: 908,
    TANGLED_TOADS_LEGS: 910,
    WORM_CRUNCHIES: 912,
    CHOC_CRUNCHIES: 911,
    SPICE_CRUNCHIES: 914,
    FRUIT_BATTA: 905
};

function getStage(player) {
    return typeof player.cache.gnomeCooking === 'number'
        ? player.cache.gnomeCooking
        : 0;
}

async function startGnomeRestaurant(player, npc) {
    await player.say('hello');
    await npc.say(
        "well hello there,you hungry..",
        'you come to the right place',
        'eat green, eat gnome cruisine',
        'my waiter will be glad to take your order'
    );
    await player.say('thanks');
    await npc.say(
        'on the other hand if you looking for some work',
        "i have a cook's position available"
    );

    const menu = await player.ask(["no thanks i'm no cook", "ok i'll give it a go"]);

    if (menu === 0) {
        await npc.say('in that case please, eat and enjoy');
    } else if (menu === 1) {
        await npc.say(
            "well that's great",
            "of course i'll have to see what you're like first",
            'here, have a look at our menu'
        );
        player.message('Aluft gives you a cook book');
        player.inventory.add(ITEM.GIANNE_COOK_BOOK, 1);
        player.cache.gnomeCooking = 1;
        await npc.say(
            "when you've had a look come back...",
            "... and i'll let you prepare a few dishes"
        );
        await player.say('good stuff');
    }
}

async function assignCheeseTomatoBatta(player, npc) {
    const { world } = player;

    await player.say('hi mr gianne');
    await npc.say('hello my good friend', 'what did you think');
    await player.say("I'm not too sure about toads legs");
    await npc.say(
        "they're a gnome delicacy, you'll love them",
        "but we'll start with something simple",
        'can you make me a cheese and tomato gnome batta'
    );
    await npc.say("here's what you need");
    player.message('@que@aluft gives you one tomato, some cheese...');
    await world.sleepTicks(2);
    player.inventory.add(ITEM.TOMATO, 1);
    player.inventory.add(ITEM.CHEESE, 1);
    player.message('...some equa leaves and some plain dough');
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.inventory.add(ITEM.GIANNE_DOUGH, 1);
    player.cache.gnomeCooking = 2;
    await player.say('thanks');
    await npc.say('Let me know how you get on');
}

async function assignChocolateBomb(player, npc) {
    const { world } = player;

    await player.say("no problem, it was easy");
    player.message('@que@you give aluft the gnome batta');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.CHEESE_AND_TOMATO_BATTA, 1);
    player.message('he takes a bite');
    await npc.say(
        'not bad...not bad at all',
        'ok now for something a little harder',
        "try and make me a choc bomb.. they're my favorite",
        "here's what you need"
    );
    player.message('@que@aluft gives you four bars of chocolate');
    await world.sleepTicks(2);
    player.inventory.add(ITEM.CHOCOLATE_BAR, 4);
    player.message('@que@some equa leaves, some chocolate dust...');
    await world.sleepTicks(2);
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.inventory.add(ITEM.CHOCOLATE_DUST, 1);
    player.message('...some gianne dough and some cream');
    player.inventory.add(ITEM.GIANNE_DOUGH, 1);
    player.inventory.add(ITEM.CREAM, 2);
    await player.say("ok aluft, i'll be back soon");
    await npc.say('good stuff');
    player.cache.gnomeCooking = 3;
}

async function assignToadBatta(player, npc) {
    const { world } = player;

    await player.say('here you go');
    player.inventory.remove(ITEM.CHOCOLATE_BOMB, 1);
    player.message('@que@you give aluft the choc bomb');
    await world.sleepTicks(2);
    player.message('he takes a bite');
    await npc.say("yes, yes, yes, that's superb", "i'm really impressed");
    await player.say("i'm glad");
    await npc.say(
        'ok then, now can you make me a toad batta',
        "here's what you need"
    );
    player.inventory.add(ITEM.GIANNE_DOUGH, 1);
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.inventory.add(ITEM.GNOME_SPICE, 1);
    player.message('@que@mr gianne gives you some dough, some equaleaves...');
    await world.sleepTicks(3);
    player.message('...and some gnome spice');
    await npc.say("i'm afraid all are toads legs are served fresh");
    await player.say('nice!');
    await npc.say(
        "so you'll need to go to the swamp on ground level",
        'and catch a toad',
        "let me know when the batta's ready"
    );
    player.cache.gnomeCooking = 4;
}

async function assignWormHole(player, npc) {
    const { world } = player;

    await player.say('here you go, easy');
    player.message('@que@you give mr gianne the toad batta');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.TOAD_BATTA, 1);
    player.message('he takes a bite');
    await npc.say(
        "ooh, that's some good toad",
        'very nice',
        "let's see if you can make a worm hole"
    );
    await player.say('a wormhole?');
    await npc.say(
        "yes, it's in the cooking guide i gave you",
        "you'll have to get the worms from the swamp",
        "but here's everything else you'll need",
        "let me know when your done"
    );
    player.inventory.add(ITEM.GIANNE_DOUGH, 1);
    player.inventory.add(ITEM.ONION, 2);
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.cache.gnomeCooking = 5;
}

async function assignToadCrunchies(player, npc) {
    const { world } = player;

    await player.say('here, see what you think');
    player.message('@que@you give mr gianne the worm hole');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.WORM_HOLE, 1);
    player.message('he takes a bite');
    await npc.say(
        "hmm, that's actually really good",
        'how about you make me some toad crunchies for desert',
        "then i'll decide whether i can take you on"
    );
    await player.say('toad crunchies?');
    await npc.say("that's right, here's all you need", 'except the toad');
    player.inventory.add(ITEM.GIANNE_DOUGH, 1);
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.message('mr gianne gives you some gianne dough and some equa leaves');
    await npc.say('let me know when your done');
    player.cache.gnomeCooking = 6;
}

async function completeGnomeRestaurant(player, npc) {
    const { world } = player;

    await player.say('here, try it');
    player.message('@que@you give mr gianne the toad crunchie');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.TOAD_CRUNCHIES, 1);
    player.message('he takes a bite');
    await npc.say(
        'well for a human you certainly can cook',
        "i'd love to have you on the team",
        'if you ever want to make some money',
        'or want to improve your cooking skills just come and see me',
        "i'll tell you what meals i need, and if you can, you make them"
    );
    await player.say('what about ingredients?');
    await npc.say(
        'well you know where to find toads and worms',
        'you can buy the rest from hudo glenfad the grocer',
        "i'll always pay you much more for the meal than you paid for the ingredients",
        "and it's a great way to improve your cooking skills"
    );
    player.cache.gnomeCooking = 7; // COMPLETED TUTORIAL!
}

const JOB_LINES = [
    ["can you make me a two worm batta's, one toad batta...", '...and one veg batta please'],
    ['ok, i need a choc bomb, two choc crunchies and two toad crunchies'],
    ['i need two portions of choc crunchies please'],
    ['i just need one choc bomb and two choc crunchies please'],
    ['excellent, i need two veg batta\'s and one worm hole'],
    ["can you make me a one veg ball, one twisted toads legs...", '...and one worm hole please'],
    ['i need one cheese and tomato batta,one veg ball...', '...and two portions of worm crunchies please'],
    ['can you make a two spice crunchies, one fruit batta...', '...a choc bomb and a veg ball please chef'],
    ['i just need one tangled toads legs and two worm crunchies please']
];

const JOB_REPLIES = [
    'ok then',
    'no problem',
    'no problem',
    'no problem',
    'no problem',
    'ok then',
    "ok, i'll do my best",
    "i'll try",
    "ok, i'll do my best"
];

async function randomizeJob(player, npc) {
    const randomize = Math.floor(Math.random() * 9); // DataConversions.random(0, 8)

    await npc.say(...JOB_LINES[randomize]);
    await player.say(JOB_REPLIES[randomize]);

    if (typeof player.cache.gnomeRestaurantJob !== 'number') {
        player.cache.gnomeRestaurantJob = randomize;
    }
}

function ifheld(player, id, amount) {
    return player.inventory.has(id, amount);
}

// each job: { greeting, need: [{id, amount}], successSay, giveLines, xp, coins,
// needMessage }
const JOBS = [
    {
        greeting: 'hello again, are the dishes ready?',
        need: [
            { id: ITEM.WORM_BATTA, amount: 2 },
            { id: ITEM.VEG_BATTA, amount: 1 },
            { id: ITEM.TOAD_BATTA, amount: 1 }
        ],
        successSay: 'all done, here you go',
        giveLines: ["you give aluft two worm batta's a veg batta and a toad batta"],
        xp: 425,
        coins: 45,
        needMessage: [
            "i need  two worm batta's, one toad batta",
            '...and one veg batta please',
            'be as quick as you can'
        ]
    },
    {
        greeting: 'hello again, are the dishes ready?',
        need: [
            { id: ITEM.CHOCOLATE_BOMB, amount: 1 },
            { id: ITEM.CHOC_CRUNCHIES, amount: 2 },
            { id: ITEM.TOAD_CRUNCHIES, amount: 2 }
        ],
        successSay: 'here you go aluft',
        giveLines: ['you give aluft choc bomb, two choc crunchies and two toad crunchies'],
        xp: 675,
        coins: 75,
        needMessage: [
            'ok, i need a choc bomb, two choc crunchies and two toad crunchies',
            "don't take too long",
            "it's a full house tonight"
        ]
    },
    {
        greeting: 'hello again traveller how did you do?',
        need: [{ id: ITEM.CHOC_CRUNCHIES, amount: 2 }],
        successSay: 'here you go aluft',
        // sic: text is missing the word "give"
        giveLines: ['you aluft two portions of choc crunchies'],
        xp: 300,
        coins: 30,
        needMessage: ['i just need two choc crunchies', 'should be easy']
    },
    {
        greeting: 'hello again traveller how did you do?',
        need: [
            { id: ITEM.CHOCOLATE_BOMB, amount: 1 },
            { id: ITEM.CHOC_CRUNCHIES, amount: 2 }
        ],
        successSay: 'here you go aluft',
        giveLines: ['you give aluft one choc bomb and two choc crunchies'],
        xp: 425,
        coins: 45,
        needMessage: ['i need one choc bomb and two choc crunchies please']
    },
    {
        greeting: 'hello again traveller how did you do?',
        need: [
            { id: ITEM.VEG_BATTA, amount: 2 },
            { id: ITEM.WORM_HOLE, amount: 1 }
        ],
        successSay: 'here you go aluft',
        giveLines: ["you give aluft two veg batta's and a worm hole"],
        xp: 425,
        coins: 45,
        needMessage: [
            "ok, i need two veg batta's and one worm hole",
            'ok, but try not to take too long',
            "it's a full house tonight"
        ]
    },
    {
        greeting: 'hello again, are the dishes ready?',
        need: [
            { id: ITEM.VEGBALL, amount: 1 },
            { id: ITEM.TANGLED_TOADS_LEGS, amount: 1 },
            { id: ITEM.WORM_HOLE, amount: 1 }
        ],
        successSay: 'all done, here you go',
        giveLines: ['you give aluft one veg ball, one twisted toads legs and one worm hole'],
        xp: 425,
        coins: 45,
        needMessage: [
            'i need  one veg ball, one twisted toads legs...',
            '...and one worm hole please'
        ]
    },
    {
        greeting: 'hello again traveller how did you do?',
        need: [
            { id: ITEM.CHEESE_AND_TOMATO_BATTA, amount: 1 },
            { id: ITEM.VEGBALL, amount: 1 },
            { id: ITEM.WORM_CRUNCHIES, amount: 2 }
        ],
        // sic: no player say() line for this job, greeting goes straight to the mes below
        successSay: null,
        giveLines: [
            'you give one cheese and tomato batta,one veg ball...',
            '...and two portions of worm crunchies'
        ],
        xp: 550,
        coins: 60,
        needMessage: [
            'i need one cheese and tomato batta,one veg ball...',
            '...and two portions of worm crunchies please'
        ]
    },
    {
        // intentional glitch on the minigame
        greeting: 'hello again, are the dishes ready?',
        need: [
            { id: ITEM.SPICE_CRUNCHIES, amount: 2 },
            { id: ITEM.FRUIT_BATTA, amount: 1 },
            { id: ITEM.CHOCOLATE_BOMB, amount: 1 },
            { id: ITEM.VEGBALL, amount: 1 }
        ],
        successSay: 'all done, here you go',
        // sic: names the wrong dish (job 8's order), an authentic bug
        giveLines: ['you give aluft the tangled toads legs and two worm crunchies'],
        xp: 425,
        coins: 45,
        needMessage: [
            'i need  two spice crunchies, one fruit batta...',
            '...a choc bomb and a veg ball please'
        ]
    },
    {
        // intentionally glitched, matching the authentic game
        greeting: 'hello again, are the dishes ready?',
        need: [
            { id: ITEM.TANGLED_TOADS_LEGS, amount: 1 },
            { id: ITEM.WORM_CRUNCHIES, amount: 2 }
        ],
        successSay: 'all done, here you go',
        // sic: names the wrong dish (job 1's order), an authentic bug
        giveLines: ['you give aluft one choc bomb and two choc crunchies'],
        xp: 425,
        coins: 45,
        needMessage: ['i need one tangled toads legs and two worm crunchies please']
    }
];

async function myCurrentJob(player, npc) {
    const { world } = player;
    const jobIndex = player.cache.gnomeRestaurantJob;
    const job = JOBS[jobIndex];

    await npc.say(job.greeting);

    const hasAll = job.need.every(({ id, amount }) => ifheld(player, id, amount));

    if (!hasAll) {
        await player.say("i'm not done yet");
        await npc.say(...job.needMessage);
        return;
    }

    if (job.successSay) {
        await player.say(job.successSay);
    }

    for (const line of job.giveLines) {
        player.message(line);
        await world.sleepTicks(3);
    }

    for (const { id, amount } of job.need) {
        player.inventory.remove(id, amount);
    }

    player.addExperience('cooking', job.xp);
    await npc.say('they look great, well done', "here's your share of the profit");
    player.message(`mr gianne gives you ${job.coins} gold coins`);
    player.inventory.add(ITEM.COINS, job.coins);

    delete player.cache.gnomeRestaurantJob;

    if (typeof player.cache.gianneJobsCompleted !== 'number') {
        player.cache.gianneJobsCompleted = 1;
    } else {
        player.cache.gianneJobsCompleted += 1;

        if (player.cache.gianneJobsCompleted >= 250) {
            const carryingBadge = player.inventory.has(ITEM.GIANNE_BADGE);
            const bankedBadge = player.bank.has(ITEM.GIANNE_BADGE);

            if (!carryingBadge && !bankedBadge) {
                await npc.say(
                    'my my, what a good chef you have become',
                    'i have this special badge for the services you have offered'
                );
                player.inventory.add(ITEM.GIANNE_BADGE, 1);
                await world.sleepTicks(1);
                player.message('you are given a special badge');
            }

            if (!player.cache.gianneCompleteFeed) {
                player.message('Gnome Restaurant: they have completed over 250 orders!');
                player.cache.gianneCompleteFeed = true;
            }
        }
    }

    await npc.say('can you stay and make another dish?');

    const menu = await player.ask(["sorry aluft, i'm too busy", 'i would be glad to help']);

    if (menu === 0) {
        await npc.say("no worries, let me know when you're free");
    } else if (menu === 1) {
        await npc.say('your a life saver');
        await randomizeJob(player, npc);
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== ALUFT_GIANNE_ID) {
        return false;
    }

    player.engage(npc);

    const stage = getStage(player);

    if (stage === 0) {
        await startGnomeRestaurant(player, npc);
    } else {
        switch (stage) {
            case 1:
                await assignCheeseTomatoBatta(player, npc);
                break;
            case 2:
                await player.say('hi mr gianne');
                await npc.say('call me aluft');
                await player.say('ok');
                await npc.say('so how did you get on?');
                if (player.inventory.has(ITEM.CHEESE_AND_TOMATO_BATTA)) {
                    await assignChocolateBomb(player, npc);
                } else {
                    await player.say('erm.. not quite done yet');
                    await npc.say(
                        "ok, let me know when you are",
                        'i need one cheese and tomato batta'
                    );
                }
                break;
            case 3:
                await player.say('hi aluft');
                await npc.say('hello there, how did you get on');
                if (player.inventory.has(ITEM.CHOCOLATE_BOMB)) {
                    await assignToadBatta(player, npc);
                } else {
                    await player.say("i haven't made it yet");
                    await npc.say(
                        'just follow the instructions carefully',
                        'i need one choc bomb'
                    );
                }
                break;
            case 4:
                await player.say('hi mr gianne');
                await npc.say('aluft');
                await player.say('sorry, aluft');
                await npc.say("so where's my toad batta?");
                if (player.inventory.has(ITEM.TOAD_BATTA)) {
                    await assignWormHole(player, npc);
                } else {
                    await player.say("i'm not done yet");
                    await npc.say('ok, quick as you can though');
                    await player.say('no problem');
                }
                break;
            case 5:
                await player.say('hello again aluft');
                await npc.say('hello traveller, how did you do?');
                if (player.inventory.has(ITEM.WORM_HOLE)) {
                    await assignToadCrunchies(player, npc);
                } else {
                    await player.say("i'm not done yet");
                    await npc.say('ok, quick as you can though', 'i need one worm hole');
                    await player.say('no problem');
                }
                break;
            case 6:
                // sic: text has a stray quote
                await player.say('hi aluft"');
                await npc.say('hello, how are you getting on?');
                if (player.inventory.has(ITEM.TOAD_CRUNCHIES)) {
                    await completeGnomeRestaurant(player, npc);
                } else {
                    await player.say('no luck so for');
                    await npc.say(
                        "ok then but don't take too long",
                        'i need one toad crunchie'
                    );
                }
                break;
            case 7:
                if (typeof player.cache.gnomeRestaurantJob === 'number') {
                    await player.say('hi aluft');
                    await myCurrentJob(player, npc);
                } else {
                    await player.say('hello again aluft');
                    await npc.say(
                        'well hello there traveller',
                        'have you come to help me out?'
                    );
                    const menu = await player.ask([
                        "sorry aluft, i'm too busy",
                        'i would be glad to help'
                    ]);
                    if (menu === 0) {
                        await npc.say("no worries, let me know when you're free");
                    } else if (menu === 1) {
                        await npc.say('good stuff');
                        await randomizeJob(player, npc);
                    }
                }
                break;
            default:
                break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
