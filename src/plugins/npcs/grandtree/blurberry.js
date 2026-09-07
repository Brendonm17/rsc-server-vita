// Blurberry: Gnome Bar cocktail trainer dialogue (talk-to-npc half); teaches
// the recipes stage by stage, then hands out repeatable make-N cocktail jobs

const BLURBERRY_ID = 534;

const ITEM = {
    GNOME_COCKTAIL_GUIDE: 851,
    LEMON: 855,
    ORANGE: 857,
    FRESH_PINEAPPLE: 861,
    COCKTAIL_SHAKER: 834,
    COCKTAIL_GLASS: 833,
    VODKA: 869,
    GIN: 870,
    DWELLBERRIES: 765,
    CREAM: 871,
    LIME: 863,
    EQUA_LEAVES: 873,
    WHISKY: 868,
    MILK: 22,
    CHOCOLATE_BAR: 337,
    CHOCOLATE_DUST: 772,
    BRANDY: 876,
    COINS: 10,
    BLURBERRY_BADGE: 916,
    FRUIT_BLAST: 866,
    PINEAPPLE_PUNCH: 879,
    DRUNK_DRAGON: 872,
    SGG: 874,
    CHOCOLATE_SATURDAY: 875,
    BLURBERRY_SPECIAL: 877,
    WIZARD_BLIZZARD: 878
};

function getStage(player) {
    return typeof player.cache.gnomeBartending === 'number'
        ? player.cache.gnomeBartending
        : 0;
}

async function startGnomeBar(player, npc) {
    await player.say('hello');
    await npc.say(
        'well hello there traveller',
        'if your looking for a cocktail the barman will happily make you one'
    );
    await player.say('he looks pretty busy');
    await npc.say(
        "I know,i just can't find any skilled staff",
        "I don't suppose your looking for some part time work?",
        "the pay isn't great but it's a good way to meet people"
    );

    const menu = await player.ask([
        'no thanks i prefer to stay this side of the bar',
        "ok then i'll give it a go"
    ]);

    if (menu === 1) {
        await npc.say(
            'excellent',
            "it's not an easy job, i'll have to test you first",
            "i'm sure you'll be great though",
            'here, take this cocktail guide'
        );
        player.inventory.add(ITEM.GNOME_COCKTAIL_GUIDE, 1);
        player.message('blurberry gives you a cocktail guide');
        await npc.say(
            'the book tells you how to make all the cocktails we serve',
            "I'll tell you what i need and you can make them"
        );
        await player.say('sounds easy enough');
        await npc.say('take a look at the book and then come and talk to me');
        player.cache.gnomeBartending = 1;
    }
}

async function assignFruitBlast(player, npc) {
    const { world } = player;

    await player.say('hello blurberry');
    await npc.say('hi, are you ready to make your first cocktail?');
    await player.say('absolutely');
    await npc.say(
        'ok then, to start with make me a fruit blast',
        "here, you'll need these ingredients",
        "but I'm afraid i can't give you any more if you mess up"
    );
    player.message('@que@blurberry gives you two lemons,one orange, one pineapple');
    await world.sleepTicks(3);
    player.inventory.add(ITEM.LEMON, 2);
    player.inventory.add(ITEM.ORANGE, 1);
    player.inventory.add(ITEM.FRESH_PINEAPPLE, 1);
    player.inventory.add(ITEM.COCKTAIL_SHAKER, 1);
    player.inventory.add(ITEM.COCKTAIL_GLASS, 1);
    player.inventory.add(13, 1);
    player.message('a cocktail shaker, a glass and a knife');
    await npc.say("let me know when you're done");
    player.cache.gnomeBartending = 2;
}

async function assignDrunkDragon(player, npc) {
    const { world } = player;

    await player.say('here you go');
    player.message('@que@you give blurberry the fruit blast');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.FRUIT_BLAST, 1);
    player.message('he takes a sip');
    await npc.say(
        'hmmm... not bad, not bad at all',
        'now can you make me a drunk dragon',
        "here's what you need"
    );
    player.message('blurberry gives you some vodka, some gin, some dwell berries...');
    player.inventory.add(ITEM.VODKA, 1);
    player.inventory.add(ITEM.GIN, 1);
    player.inventory.add(ITEM.DWELLBERRIES, 1);
    player.inventory.add(ITEM.FRESH_PINEAPPLE, 1);
    player.inventory.add(ITEM.CREAM, 1);
    player.inventory.add(ITEM.COCKTAIL_GLASS, 1);
    player.message('... some pineapple and some cream');
    await npc.say(
        "i'm afraid i won't be able to give you anymore if you make a mistake though",
        "let me know when it's done"
    );
    player.cache.gnomeBartending = 3;
}

async function assignSGG(player, npc) {
    const { world } = player;

    await player.say('here you go');
    player.message('@que@you give blurberry the drunk dragon');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.DRUNK_DRAGON, 1);
    player.addExperience('cooking', 160);
    player.message('he takes a sip');
    await npc.say(
        'woooo, that\'s some good stuff',
        'i can sell that',
        'there you go, your share of the profit'
    );
    player.inventory.add(ITEM.COINS, 1);
    player.message('blurberry gives you 1 gold coin');
    await player.say('thanks');
    await npc.say('okay then now i need an s g g');
    await player.say('a what?');
    await npc.say(
        "a short green guy, and don't bring me a gnome",
        "here's all you need"
    );
    player.message('blurberry gives you four limes, some vodka and some equa leaves');
    player.inventory.add(ITEM.LIME, 4);
    player.inventory.add(ITEM.VODKA, 1);
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.inventory.add(ITEM.COCKTAIL_GLASS, 1);
    player.cache.gnomeBartending = 4;
}

async function assignChocolateSaturday(player, npc) {
    const { world } = player;

    await player.say('here you go');
    player.message('@que@you give blurberry the short green guy');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.SGG, 1);
    player.addExperience('cooking', 160);
    player.message('he takes a sip');
    await npc.say(
        'hmmm, not bad, not bad at all',
        'i can sell that',
        "there you go, that's your share"
    );
    player.message('blurberry gives you 1 gold coin');
    player.inventory.add(ITEM.COINS, 1);
    await npc.say(
        "you doing quite well, i'm impressed",
        "ok let's try a chocolate saturday, i love them",
        "here's your ingredients"
    );
    player.message('blurberry gives you some whisky, some milk, some equa leaves...');
    player.message('a chocolate bar, some cream and some chocolate dust');
    player.inventory.add(ITEM.WHISKY, 1);
    player.inventory.add(ITEM.MILK, 1);
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.inventory.add(ITEM.CHOCOLATE_BAR, 1);
    player.inventory.add(ITEM.CREAM, 1);
    player.inventory.add(ITEM.CHOCOLATE_DUST, 1);
    player.inventory.add(ITEM.COCKTAIL_GLASS, 1);
    player.cache.gnomeBartending = 5;
}

async function assignBlurberrySpecial(player, npc) {
    const { world } = player;

    await player.say('here.. try some');
    player.message('@que@you give blurberry the cocktail');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.CHOCOLATE_SATURDAY, 1);
    player.addExperience('cooking', 160);
    player.message('he takes a sip');
    await npc.say(
        "that's blurberry-tastic",
        "you're quite a bartender",
        'okay ,lets test you once more',
        'try and make me a blurberry special',
        "then we'll see if you have what it takes",
        "here's your ingredients"
    );
    player.inventory.add(ITEM.VODKA, 1);
    player.inventory.add(ITEM.GIN, 1);
    player.inventory.add(ITEM.BRANDY, 1);
    player.inventory.add(ITEM.LEMON, 3);
    player.inventory.add(ITEM.ORANGE, 2);
    player.inventory.add(ITEM.LIME, 1);
    player.inventory.add(ITEM.EQUA_LEAVES, 1);
    player.inventory.add(ITEM.COCKTAIL_GLASS, 1);
    await player.say('ok i\'ll do best');
    // female/neutral variant of the gendered "great bartender" line
    await npc.say("I'm sure you'll make a great bartender");
    player.cache.gnomeBartending = 6;
}

async function completeGnomeBar(player, npc) {
    const { world } = player;

    await player.say("I think i've made it right");
    player.message('@que@you give the blurberry special to blurberry');
    await world.sleepTicks(3);
    player.inventory.remove(ITEM.BLURBERRY_SPECIAL, 1);
    player.message('he takes a sip');
    await npc.say(
        'well i never, incredible',
        'not many manage to get that right, but this is perfect',
        'It would be an honour to have you on the team'
    );
    await player.say('thanks');
    await npc.say(
        'now if you ever want to make some money',
        'or want to improve your cooking skills just come and see me',
        "I'll tell you what drinks we need, and if you can, you make them"
    );
    await player.say('what about ingredients?');
    await npc.say(
        "I'm afraid i can't give you anymore for free",
        'but you can buy them from heckel funch the grocer',
        "I'll always pay you more for the cocktail than you paid for the ingredients",
        "and it's a great way to learn how to prepare food and drink"
    );
    player.cache.gnomeBartending = 7; // COMPLETED TUTORIAL!
}

const JOB_LINES = [
    ['can you make me one pineapple punch, one choc saturday and one drunk dragon'],
    ['ok, i need two wizard blizzards and an s.g.g.'],
    [
        'ok, i need one wizard blizzard,one pineapple punch, one blurberry special',
        'and two fruit blasts'
    ],
    ['i just need two s.g.g. and one blurberry special'],
    ['i just need one fruit blast']
];

const JOB_REPLIES = [
    "ok then i'll be back soon",
    'no problem',
    "i'll do my best",
    'no problem',
    'no problem'
];

async function randomizeJob(player, npc) {
    const randomize = Math.floor(Math.random() * 5); // DataConversions.random(0, 4)

    await npc.say(...JOB_LINES[randomize]);
    await player.say(JOB_REPLIES[randomize]);

    if (typeof player.cache.gnomeBarJob !== 'number') {
        player.cache.gnomeBarJob = randomize;
    }
}

function ifheld(player, id, amount) {
    return player.inventory.has(id, amount);
}

const JOBS = [
    {
        need: [
            { id: ITEM.PINEAPPLE_PUNCH, amount: 1 },
            { id: ITEM.CHOCOLATE_SATURDAY, amount: 1 },
            { id: ITEM.DRUNK_DRAGON, amount: 1 }
        ],
        successSay: 'here you go, one pineapple punch, one choc saturday and one drunk dragon',
        giveMessage: 'you give blurberry one pineapple punch, one choc saturday and one drunk dragon',
        xp: 360,
        coins: 100,
        successReply: "that's blurberry-tastic",
        needMessage: [
            'ok, i need one pineapple punch, one choc saturday and one drunk dragon',
            "let me know when you're done"
        ]
    },
    {
        need: [
            { id: ITEM.WIZARD_BLIZZARD, amount: 2 },
            { id: ITEM.SGG, amount: 1 }
        ],
        successSay: 'here you go, two wizard blizzards and an s.g.g.',
        giveMessage: 'you give blurberry two wizard blizzards and an s.g.g.',
        xp: 360,
        coins: 150,
        successReply: "that's excellent, here's your share of the profit",
        needMessage: [
            'ok, i need two wizard blizzards and an s.g.g.',
            "let me know when you're done"
        ]
    },
    {
        need: [
            { id: ITEM.WIZARD_BLIZZARD, amount: 1 },
            { id: ITEM.PINEAPPLE_PUNCH, amount: 1 },
            { id: ITEM.BLURBERRY_SPECIAL, amount: 1 },
            { id: ITEM.FRUIT_BLAST, amount: 2 }
        ],
        successSay: [
            'here you go, one wizard blizzard,one pineapple punch, one blurberry special',
            'and two fruit blasts'
        ],
        giveMessage: [
            'you give blurberry one wizard blizzard,one pineapple punch, one blurberry special',
            'and two fruit blasts'
        ],
        xp: 540,
        coins: 179,
        successReply: 'wow fantastic, here\'s your share of the profit',
        needMessage: [
            'ok, i need one wizard blizzard,one pineapple punch, one blurberry special',
            'and two fruit blasts',
            "let me know when you're done"
        ]
    },
    {
        need: [
            { id: ITEM.SGG, amount: 2 },
            { id: ITEM.BLURBERRY_SPECIAL, amount: 1 }
        ],
        successSay: 'here you go, two s.g.g. and one blurberry special',
        giveMessage: 'you give blurberry two s.g.g. and one blurberry special',
        xp: 360,
        coins: 120,
        successReply: "great, here's your share of the profit",
        needMessage: [
            'ok, i need two s.g.g. and one blurberry special',
            "let me know when you're done"
        ]
    },
    {
        need: [{ id: ITEM.FRUIT_BLAST, amount: 1 }],
        successSay: 'here you go, one fruit blast',
        giveMessage: 'you give blurberry one fruit blast',
        xp: 240,
        coins: 10,
        successReply: "that's frutty-licious",
        needMessage: ['ok, i need one fruit blast', "let me know when you're done"]
    }
];

async function myCurrentJob(player, npc) {
    const jobIndex = player.cache.gnomeBarJob;
    const job = JOBS[jobIndex];

    await player.say('hi');
    await npc.say('have you made the order?');

    const hasAll = job.need.every(({ id, amount }) => ifheld(player, id, amount));

    if (!hasAll) {
        await player.say('not yet');
        await npc.say(...job.needMessage);
        return;
    }

    if (Array.isArray(job.successSay)) {
        await player.say(...job.successSay);
    } else {
        await player.say(job.successSay);
    }

    if (Array.isArray(job.giveMessage)) {
        for (const line of job.giveMessage) {
            player.message(line);
        }
    } else {
        player.message(job.giveMessage);
    }

    for (const { id, amount } of job.need) {
        player.inventory.remove(id, amount);
    }

    player.addExperience('cooking', job.xp);
    await npc.say(job.successReply);
    player.message(`blurberry gives you ${job.coins} gold coins`);
    player.inventory.add(ITEM.COINS, job.coins);

    delete player.cache.gnomeBarJob;

    if (typeof player.cache.blurberryJobsCompleted !== 'number') {
        player.cache.blurberryJobsCompleted = 1;
    } else {
        player.cache.blurberryJobsCompleted += 1;

        if (player.cache.blurberryJobsCompleted >= 250) {
            const carryingBadge = player.inventory.has(ITEM.BLURBERRY_BADGE);
            const bankedBadge = player.bank.has(ITEM.BLURBERRY_BADGE);

            if (!carryingBadge && !bankedBadge) {
                await npc.say(
                    'my my, what a good cocktail maker you have become',
                    'i have this special badge for the services you have offered'
                );
                player.inventory.add(ITEM.BLURBERRY_BADGE, 1);
                await player.world.sleepTicks(1);
                player.message('you are given a special badge');
            }

            if (!player.cache.blurberryCompleteFeed) {
                player.message('Gnome Bar: they have completed over 250 orders!');
                player.cache.blurberryCompleteFeed = true;
            }
        }
    }

    await npc.say('could you make me another order');

    const menu = await player.ask(
        ["I'm quite busy myself, sorry", 'ok then, what do you need'],
        false
    );

    if (menu === 0) {
        await player.say("i'm quite busy myself, sorry");
        await npc.say("that's ok, come back when you're free");
    } else if (menu === 1) {
        await player.say('ok then, what do you need');
        await randomizeJob(player, npc);
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== BLURBERRY_ID) {
        return false;
    }

    player.engage(npc);

    const stage = getStage(player);

    if (stage === 0) {
        await startGnomeBar(player, npc);
    } else {
        switch (stage) {
            case 1:
                await assignFruitBlast(player, npc);
                break;
            case 2:
                await npc.say("so where's my fruit blast");
                if (player.inventory.has(ITEM.FRUIT_BLAST)) {
                    await assignDrunkDragon(player, npc);
                } else {
                    await npc.say(
                        "i don't know what you have there but it's no fruit blast"
                    );
                }
                break;
            case 3:
                await player.say('hello blurberry');
                await npc.say('hello again traveller', 'how did you do?');
                if (player.inventory.has(ITEM.DRUNK_DRAGON)) {
                    await assignSGG(player, npc);
                } else {
                    await npc.say("i dont know what that is but it's no drunk dragon");
                }
                break;
            case 4:
                await player.say('hi blurberry');
                await npc.say('so have you got my s g g?');
                if (player.inventory.has(ITEM.SGG)) {
                    await assignChocolateSaturday(player, npc);
                } else {
                    await npc.say("i dont know what that is but it's no s g g");
                }
                break;
            case 5:
                await player.say('hello blurberry');
                await npc.say('hello, how did it go with the choc saturday');
                if (player.inventory.has(ITEM.CHOCOLATE_SATURDAY)) {
                    await assignBlurberrySpecial(player, npc);
                } else {
                    await player.say("i haven't managed to make it yet");
                    await npc.say(
                        "ok, it's one choc saturday i need",
                        "well let me know when you're done"
                    );
                }
                break;
            case 6:
                await player.say('hi again');
                await npc.say('so how did you do');
                if (player.inventory.has(ITEM.BLURBERRY_SPECIAL)) {
                    await completeGnomeBar(player, npc);
                } else {
                    await player.say("I haven't managed to make it yet");
                    await npc.say(
                        'I need one blurberry special',
                        "well let me know when you're done"
                    );
                }
                break;
            case 7:
                if (typeof player.cache.gnomeBarJob === 'number') {
                    await myCurrentJob(player, npc);
                } else {
                    await player.say('hello again blurberry');
                    await npc.say(
                        'well hello traveller',
                        "i'm quite busy as usual, any chance you could help"
                    );
                    const menu = await player.ask(
                        ["I'm quite busy myself, sorry", 'ok then, what do you need'],
                        false
                    );
                    if (menu === 0) {
                        await player.say("i'm quite busy myself, sorry");
                        await npc.say("that's ok, come back when you're free");
                    } else if (menu === 1) {
                        await player.say('ok then, what do you need');
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
