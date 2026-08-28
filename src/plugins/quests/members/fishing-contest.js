
const { questsEnabled } = require('../custom-gate.js');

// NPCs (rsc-data/config/npcs, ids identical to OpenRSC NpcId)
const GRANDPA_JACK_ID = 345;
const SINISTER_STRANGER_ID = 346;
const BONZO_ID = 347;
const MORRIS_ID = 349;
const BIG_DAVE_ID = 353;
const JOSHUA_ID = 354;
const MOUNTAIN_DWARF_ID = 355;

// items (ids identical to OpenRSC ItemId)
const COINS_ID = 10;
const RAW_SHRIMP_ID = 349;
const RAW_SARDINE_ID = 354;
const FISHING_ROD_ID = 377;
const FISHING_BAIT_ID = 380;
const RED_VINE_WORMS_ID = 715;
const RAW_GIANT_CARP_ID = 717;
const FISHING_COMPETITION_PASS_ID = 719;
const HEMENSTER_FISHING_TROPHY_ID = 720;
const GARLIC_ID = 218;
const SPADE_ID = 211;

// game objects (rsc-data/config/objects, scenery)
const PIPE_ID = 350;
const REGULAR_FISH_SPOT_ID = 351; // spot by the oak tree (normal fish)
const CARP_FISH_SPOT_ID = 352; // spot by the pipes (giant carp)
const DAVE_FISH_SPOT_ID = 353;
const JOSHUA_FISH_SPOT_ID = 354;
const RED_VINE_ID = 355;
const GATE_OPEN_ID = 357;
const GATE_CLOSED_ID = 358; // GATE_WOODEN_FISHING_CONTEST_CLOSED
const WHITE_WOLF_PASS_STAIRS_ID = 359;

const FISHING_LEVEL_REQ = 10;

function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

function getStage(player) {
    return player.questStages.fishingContest || 0;
}

function addCatchCache(player, catchId) {
    let catchString = '';
    if (player.cache.contest_catches) {
        catchString = player.cache.contest_catches + '-';
    }
    catchString += catchId;
    player.cache.contest_catches = catchString;
}


async function bonzoDialogue(player, n, isDirectTalk) {
    const { world } = player;
    const sinister = ifNearVisNpc(player, SINISTER_STRANGER_ID, 10);
    const stage = getStage(player);

    if (stage === -1) {
        if (!isDirectTalk) {
            player.message('you have already won the fishing competition');
            await world.sleepTicks(3);
        } else {
            await n.say('Hello champ', 'So any hints on how to fish so well');
            await player.say("I think I'll keep them to myself");
        }
        return;
    }

    // every other quest stage
    if (player.cache.paid_contest_fee) {
        let hasCarp = false;
        if (player.cache.contest_catches) {
            const catches = player.cache.contest_catches.split('-');
            for (const aCatch of catches) {
                hasCarp =
                    hasCarp ||
                    (Number(aCatch) === RAW_GIANT_CARP_ID &&
                        player.inventory.has(RAW_GIANT_CARP_ID));
            }
        }

        await n.say('so how are you doing so far?');
        if (hasCarp) {
            // do not send over
            const menu = await player.ask([
                'I have this big fish,is it enough to win?',
                'I think I might still be able to find a bigger fish'
            ]);
            if (menu === 0) {
                await player.say('I have this big fish', 'Is it enough to win?');
                await n.say("Well we'll just wait till time is up");
                player.message('You wait');
                await world.sleepTicks(3);
                await bonzoTimesUpDialogue(player, n);
            } else if (menu === 1) {
                await player.say(
                    'I think I might still be able to find a bigger fish'
                );
                await n.say('Ok, good luck');
            }
        } else {
            await player.say(
                'I think I might still be able to find a bigger fish'
            );
            await n.say('Ok, good luck');
        }
        return;
    }

    // with trophy, cannot re-enter the competition
    if (player.inventory.has(HEMENSTER_FISHING_TROPHY_ID)) {
        await n.say('Hello champ', 'So any hints on how to fish so well');
        await player.say("I think I'll keep them to myself");
        return;
    }

    if (isDirectTalk) {
        await n.say(
            'Roll up, roll up',
            'Enter the great Hemenster fishing competition',
            'only 5gp entrance fee'
        );
    } else {
        await n.say(
            'Hey you need to pay to join the competition first',
            'only 5gp entrance fee'
        );
    }

    const first = await player.ask(
        ["I'll give that a go then", "No thanks, I'll just watch the fun"],
        true
    );

    if (first === 0) {
        await n.say('Marvelous');
        if (player.inventory.has(COINS_ID, 5)) {
            player.message('You pay bonzo 5 coins');
            player.inventory.remove(COINS_ID, 5);
            await n.say(
                "Ok we've got all the fishermen",
                "It's time to roll",
                'Ok nearly everyone is in there place already',
                'You fish in the spot by the oak tree',
                'And the Sinister stranger you fish by the pipes'
            );
            if (!player.cache.garlic_activated) {
                player.message(
                    'Your fishing competition spot is beside the oak tree'
                );
            } else {
                if (sinister) {
                    await sinister.say(
                        'Arrgh what is that ghastly smell',
                        'I think I will move over here instead'
                    );
                    sinister.x = 570;
                    sinister.y = 495;
                }
                await n.say(
                    "Hmm you'd better go and take the area by the pipes then"
                );
                player.message(
                    'Your fishing competition spot is beside the pipes'
                );
            }
            player.cache.paid_contest_fee = true;
        } else {
            player.message("I don't have the 5gp though");
            await world.sleepTicks(3);
            await n.say('No pay, no play');
        }
    }
}

async function bonzoTimesUpDialogue(player, n) {
    const { world } = player;
    let catches = [];
    let hadCarp = false;

    if (player.cache.contest_catches) {
        catches = player.cache.contest_catches.split('-');
    }

    await n.say('Okay folks times up', 'Lets see who caught the biggest fish');
    player.message('You hand over your catch');
    await world.sleepTicks(3);

    for (const aCatch of catches) {
        hadCarp =
            hadCarp ||
            (Number(aCatch) === RAW_GIANT_CARP_ID &&
                player.inventory.has(RAW_GIANT_CARP_ID));
        player.inventory.remove(Number(aCatch));
    }
    delete player.cache.contest_catches;
    delete player.cache.paid_contest_fee;

    if (hadCarp) {
        await n.say('We have a new winner');
        await n.say(
            'The heroic looking person',
            'who was fishing by the pipes',
            'Has caught the biggest carp',
            "I've seen since Grandpa Jack used to compete"
        );
        player.message('you are given the Hemenster fishing trophy');
        player.inventory.add(HEMENSTER_FISHING_TROPHY_ID);
        player.questStages.fishingContest = 3;
    } else {
        // select a random winner from the field
        const chanceStranger = 80;
        const chanceDave = 15;
        const rol = Math.floor(Math.random() * 101);
        await n.say('And the winner is...');
        if (chanceStranger > rol) {
            await n.say('The stranger in black');
        } else if (chanceDave > rol - 80) {
            await n.say('local favourite- Big Dave');
        } else {
            await n.say('the surprising Joshua');
        }
    }
}


function grandpaGreeting(player) {
    // FishingContestGrandpaJackHelloYoungOne (gender-based, authentic)
    return player.isMale() ? 'Hello young man' : 'Hello young miss';
}

async function grandpaJackDialogue(player, n) {
    const stage = getStage(player);

    if (stage === 1 || stage === 2) {
        await n.say(
            grandpaGreeting(player),
            'Come to visit old Grandpa Jack?',
            'I can tell ye stories for sure',
            'I used to be the best fisherman these parts have seen'
        );
        const first = await player.ask(
            [
                'Tell me a story then',
                'Are you entering the fishing competition?',
                "Sorry I don't have time now"
            ],
            true
        );
        if (first === 0) {
            await tellStory(player, n);
        } else if (first === 1) {
            await n.say(
                'Ah the Hemenster fishing competition',
                'I know all about that',
                'I won that four years straight',
                "I'm to old for that lark now though"
            );
            // do not send over
            const second = await player.ask([
                "I don't suppose you could give me any hints?",
                "That's less competition for me then"
            ]);
            if (second === 0) {
                await player.say(
                    "I don't suppose you could give me any hints?"
                );
                await n.say(
                    'Well you sometimes get these really big fish',
                    'In the water just by the outflow pipes',
                    "Think they're some kind of carp",
                    'try to get a spot round there',
                    'The best sort of bait for them is red vine worms',
                    "I used to get those from McGruber's wood, north of here",
                    'dig around in the red vines up there'
                );
                if (getStage(player) !== 2) {
                    player.questStages.fishingContest = 2;
                }
            } else if (second === 1) {
                await player.say('That\'s less competition for me then"');
            }
        } else if (first === 2) {
            await n.say('sigh', 'Young people - always in such a rush');
        }
        return;
    }

    // default (stage 0, 3, -1)
    await n.say(
        grandpaGreeting(player),
        'Come to visit old Grandpa Jack?',
        'I can tell ye stories for sure',
        'I used to be the best fisherman these parts have seen'
    );
    const first = await player.ask(
        ['Tell me a story then', "Sorry I don't have time now"],
        true
    );
    if (first === 0) {
        await tellStory(player, n);
    } else if (first === 1) {
        await n.say('sigh', 'Young people - always in such a rush');
    }
}

async function tellStory(player, n) {
    await n.say(
        'Well when I were a young man',
        'We used to take fishing trips over to Catherby',
        'The fishing over there - now that was something',
        'Anyway we decided to do a bit of fishing with our nets',
        "I wasn't having the best of days",
        'Tuning up nothing but old boots and bits of seaweed',
        'Then my net suddenly got really heavy',
        'I pulled it up',
        "To my amazement I'd caught this little chest thing",
        'even more amazing was when I opened it',
        'It contained a diamond the size of a radish',
        "That's the best catch I've ever had!"
    );
}


async function goDownDialogue(player, n) {
    await n.say(
        'This is the home of the mountain dwarves',
        'How would you like it if I wanted to take a short cut through your home'
    );
    // do not send over
    const third = await player.ask([
        'Ooh is this a short cut to somewhere',
        "Oh sorry I hadn't realised it was private",
        "If you were my friend I wouldn't mind it"
    ]);
    if (third === 0) {
        await player.say('Ooh is this a short cut to somewhere?');
        await n.say(
            'Well it is easier to go this way',
            'Than through passes full of wolves'
        );
    } else if (third === 1) {
        await player.say("Oh sorry I hadn't realised it was private");
    } else if (third === 2) {
        await player.say("If you were my friend I wouldn't mind");
        await n.say("Yes, but I don't even know you");
        // do not send over
        const fourth = await player.ask([
            'Well lets be friends',
            "You're a grumpy little man aren't you?"
        ]);
        if (fourth === 0) {
            await player.say('Well lets be friends');
            await n.say(
                "I don't make friends easily",
                'People need to earn my trust first'
            );
            // do not send over
            const fifth = await player.ask([
                'And how am I meant to do that?',
                "You're a grumpy little man aren't you?"
            ]);
            if (fifth === 0) {
                await player.say('And how am I meant to do that?');
                await n.say(
                    "My we are the persistant one aren't we",
                    "Well theres a certain gold artifact we're after",
                    'We dwarves are big fans of gold',
                    'This artifact is the first prize at the hemenster ' +
                        'fishing competition',
                    'Fortunately we have acquired a pass to enter that ' +
                        'competition',
                    "Unfortunately Dwarves don't make good fishermen"
                );
                // do not send over
                const six = await player.ask([
                    "Fortunately I'm alright at fishing",
                    "I'm not much of a fisherman either"
                ]);
                if (six === 0) {
                    await player.say("fortunately I'm alright at fishing");
                    await n.say(
                        'Okay I entrust you with our competition pass',
                        'go to Hemenster and do us proud'
                    );
                    player.inventory.add(FISHING_COMPETITION_PASS_ID);
                    player.questStages.fishingContest = 1;
                } else if (six === 1) {
                    await player.say("I'm not much of a fisherman either");
                    await n.say('what good are you?');
                }
            } else if (fifth === 1) {
                await player.say("You're a grumpy little man aren't you");
                await n.say(" Don't you know it");
            }
        } else if (fourth === 1) {
            await player.say("You're a grumpy little man aren't you");
            await n.say(" Don't you know it");
        }
    }
}

async function mountainDwarfDialogue(player, n) {
    const { world } = player;
    const stage = getStage(player);

    switch (stage) {
        case 0: {
            await n.say('hmmph what do you want');
            // do not send over
            const first = await player.ask([
                'I was wondering what was down those stairs?',
                'I was just stopping to say hello'
            ]);
            if (first === 0) {
                await player.say(
                    'I was just wondering what was down those stairs?'
                );
                await n.say("You can't go down there");
                // do not send over
                const second = await player.ask([
                    "I didn't want to anyway",
                    'Why not?',
                    "I'm bigger than you let me by"
                ]);
                if (second === 0) {
                    await player.say("I didn't want to anyway");
                    await n.say('Good');
                } else if (second === 1) {
                    await player.say('Why not?');
                    await goDownDialogue(player, n);
                } else if (second === 2) {
                    await player.say("I'm bigger than you", 'Let me by');
                    await n.say(
                        'Go away',
                        "You're not going to bully your way in here"
                    );
                }
            } else if (first === 1) {
                await player.say('I was just stopping to say hello');
                await n.say('Hello then');
            }
            break;
        }
        case 1:
        case 2: {
            await n.say('Have you won yet?');
            if (!player.inventory.has(FISHING_COMPETITION_PASS_ID)) {
                // do not send over
                const opts = await player.ask([
                    'No I need another competition pass',
                    'No it takes preparation to win fishing competitions'
                ]);
                if (opts === 0) {
                    await player.say('I need another competition pass');
                    await n.say(
                        'Hmm its a good job they sent us spares',
                        'there you go'
                    );
                    player.inventory.add(FISHING_COMPETITION_PASS_ID);
                } else if (opts === 1) {
                    await player.say(
                        'No it takes preparation to win fishing competitions'
                    );
                    await n.say(
                        "Maybe that's where we are going wrong when we try " +
                            'fishing'
                    );
                }
            } else {
                await player.say('No not yet');
            }
            break;
        }
        case 3:
            await n.say('Have you won yet?');
            await player.say('Yes I have');
            await n.say('Well done, so where is the trophy?');
            if (player.inventory.has(HEMENSTER_FISHING_TROPHY_ID)) {
                await player.say('I have it right here');
                player.message('you give the trophy to the dwarf');
                await world.sleepTicks(3);
                player.inventory.remove(HEMENSTER_FISHING_TROPHY_ID);
                await n.say('Okay we will let you in now');
                completeQuest(player);
            } else {
                await player.say("I don't have it with me");
            }
            break;
        case -1:
            await n.say(
                'Welcome oh great fishing champion',
                'Feel free to pop by any time'
            );
            break;
    }
}


const SINISTER = { FISHING: 0, VAMPIRE: 1 };

async function sinisterDialogue(player, n, cID) {
    if (cID === -1) {
        const stage = getStage(player);
        if (stage === 1 || stage === 2 || stage === 3 || stage === -1) {
            await n.say('..');
            // do not send over
            const first = await player.ask([
                '..?',
                'Who are you?',
                'so you like fishing?'
            ]);
            if (first === 0) {
                await player.say('..?');
                await n.say(' ...');
            } else if (first === 1) {
                await player.say('Who are you?');
                await n.say(
                    'My name is Vlad',
                    'I come from far avay, vere the sun is not so bright'
                );
                const second = await player.ask(
                    ["You're a vampire aren't you?", 'Is it nice there?'],
                    true
                );
                if (second === 0) {
                    await sinisterDialogue(player, n, SINISTER.VAMPIRE);
                } else if (second === 1) {
                    await n.say(
                        'It is vonderful',
                        'the vomen are beautiful',
                        'and the nights are long'
                    );
                    // do not send over
                    const third = await player.ask([
                        "You're a vampire aren't you?",
                        'So you like fishing?',
                        'Well good luck with the fishing'
                    ]);
                    if (third === 0) {
                        await player.say("You're a vampire aren't you?");
                        await sinisterDialogue(player, n, SINISTER.VAMPIRE);
                    } else if (third === 1) {
                        await player.say('So you like fishing');
                        await sinisterDialogue(player, n, SINISTER.FISHING);
                    } else if (third === 2) {
                        await player.say('Well good luck with the fishing');
                        await n.say(
                            'Luck has nothing to do vith it',
                            'It is all in the technique'
                        );
                    }
                }
            } else if (first === 2) {
                await player.say('So you like fishing');
                await sinisterDialogue(player, n, SINISTER.FISHING);
            }
        }
        return;
    }

    if (cID === SINISTER.VAMPIRE) {
        await n.say(
            "Just because I can't stand the smell of garlic",
            "and I don't like bright sunlight",
            "Doesn't necessarily mean I'm a vampire"
        );
    } else if (cID === SINISTER.FISHING) {
        await n.say(
            'My doctor told be to take up a velaxing hobby',
            'vhen I am stressed I tend to get a little..',
            '..thirsty'
        );
        // do not send over
        const third = await player.ask([
            "You're a vampire aren't you?",
            'If you get thirsty you should drink something',
            'Well good look with the fishing'
        ]);
        if (third === 0) {
            await player.say("You're a vampire aren't you?");
            await sinisterDialogue(player, n, SINISTER.VAMPIRE);
        } else if (third === 1) {
            await player.say('If you get thirsty', 'You should drink something');
            await n.say('I think I may do that soon');
        } else if (third === 2) {
            await player.say('Well good luck with the fishing');
            await n.say(
                'Luck has nothing to do vith it',
                'It is all in the technique'
            );
        }
    }
}


async function bigDaveDialogue(player, n) {
    await n.say("Oi whaddya think ya doin'", "I'm fishin' here", 'Now beat it');
}

async function joshuaDialogue(player, n) {
    await n.say(
        'This is my fishing spot',
        "Ya don't wanna be fishing 'ere mate",
        "Cos I'll break your knuckles"
    );
}


async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    let handler;
    switch (npc.id) {
        case MOUNTAIN_DWARF_ID:
            handler = mountainDwarfDialogue;
            break;
        case BONZO_ID:
            handler = (p, n) => bonzoDialogue(p, n, true);
            break;
        case SINISTER_STRANGER_ID:
            handler = (p, n) => sinisterDialogue(p, n, -1);
            break;
        case GRANDPA_JACK_ID:
            handler = grandpaJackDialogue;
            break;
        default:
            return false;
    }

    player.engage(npc);
    await handler(player, npc);
    player.disengage();

    return true;
}


async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (gameObject.id === RED_VINE_ID && item.id === SPADE_ID) {
        player.message('you dig in amoungst the vines');
        await world.sleepTicks(3);
        player.message('You find a red vine worm');
        await world.sleepTicks(3);
        player.inventory.add(RED_VINE_WORMS_ID);
        return true;
    }

    if (gameObject.id === PIPE_ID && item.id === GARLIC_ID) {
        const sinister = ifNearVisNpc(player, SINISTER_STRANGER_ID, 10);
        const bonzo = ifNearVisNpc(player, BONZO_ID, 15);

        // stashing garlic doesn't check if already stashed
        player.message('You stash the garlic in the pipe');
        await world.sleepTicks(3);
        player.inventory.remove(GARLIC_ID);

        if (player.cache.paid_contest_fee && !player.cache.garlic_activated) {
            if (sinister) {
                player.engage(sinister);
                await sinister.say(
                    'Arrgh what is that ghastly smell',
                    'I think I will move over here instead'
                );
                player.disengage();
                sinister.x = 570;
                sinister.y = 495;
            }
            if (bonzo) {
                player.engage(bonzo);
                await bonzo.say(
                    "Hmm you'd better go and take the area by the pipes then"
                );
                player.disengage();
            }
            player.message(
                'Your fishing competition spot has been moved to beside the ' +
                    'pipes'
            );
        }
        if (!player.cache.garlic_activated) {
            player.cache.garlic_activated = true;
        }
        return true;
    }

    return false;
}


async function opGate(player, gameObject) {
    const { world } = player;
    const stage = getStage(player);
    const bonzo = ifNearVisNpc(player, BONZO_ID, 15);
    const morris = ifNearVisNpc(player, MORRIS_ID, 15);

    if (player.x <= 564) {
        if (morris) {
            player.engage(morris);
            await morris.say('competition pass please');
            if (player.inventory.has(FISHING_COMPETITION_PASS_ID)) {
                player.message('You show Morris your pass');
                await world.sleepTicks(3);
                await morris.say('Move on through');
                player.disengage();
                await player.enterGate(gameObject, GATE_OPEN_ID);
            } else {
                // authentic (LOCKED_POST_QUEST off): no "just want to fish"
                const m = await player.ask(
                    ["I don't have one of them", 'What do I need that for?'],
                    true
                );
                if (m === 1) {
                    await morris.say(
                        'This is the entrance to the Hementster fishing ' +
                            'competition'
                    );
                    await morris.say("It's a high class competition");
                    await morris.say('Invitation only');
                }
                player.disengage();
            }
        }
    } else if (player.x >= 565) {
        if (stage === 3) {
            await player.enterGate(gameObject, GATE_OPEN_ID);
            return;
        }
        if (bonzo && player.cache.paid_contest_fee) {
            player.engage(bonzo);
            await bonzo.say("so you're calling it quits here for now?");
            const leaveMenu = await player.ask(
                [
                    "Yes I'll compete again another day",
                    "Actually I'll go back and catch some more"
                ],
                true
            );
            if (leaveMenu === 0) {
                delete player.cache.paid_contest_fee;
                delete player.cache.contest_catches;
                player.disengage();
                await player.enterGate(gameObject, GATE_OPEN_ID);
            } else if (leaveMenu === 1) {
                await bonzo.say('Good luck');
                player.disengage();
            } else {
                player.disengage();
            }
        } else {
            await player.enterGate(gameObject, GATE_OPEN_ID);
        }
    }
}

async function opRegularFishSpot(player, gameObject) {
    const stage = getStage(player);
    const sinister = ifNearVisNpc(player, SINISTER_STRANGER_ID, 10);
    const bonzo = ifNearVisNpc(player, BONZO_ID, 15);

    if (player.inventory.has(HEMENSTER_FISHING_TROPHY_ID)) {
        player.message('you have already won the fishing competition');
        return;
    } else if (bonzo && !player.cache.paid_contest_fee) {
        player.engage(bonzo);
        await bonzoDialogue(player, bonzo, false);
        player.disengage();
        return;
    }

    if (stage > 0 && !player.cache.garlic_activated) {
        if (player.skills.fishing.current < FISHING_LEVEL_REQ) {
            player.message(
                'You need at least level 10 fishing to lure these fish'
            );
        } else if (!player.inventory.has(FISHING_ROD_ID)) {
            player.message("I don't have the equipment to catch a fish");
        } else if (
            !player.inventory.has(FISHING_BAIT_ID) &&
            !player.inventory.has(RED_VINE_WORMS_ID)
        ) {
            player.message('you have no bait to catch fish here');
        } else if (player.inventory.has(RED_VINE_WORMS_ID)) {
            player.message('You catch a sardine');
            player.inventory.add(RAW_SARDINE_ID);
            player.inventory.remove(RED_VINE_WORMS_ID);
            addCatchCache(player, RAW_SARDINE_ID);
        } else if (player.inventory.has(FISHING_BAIT_ID)) {
            player.message('You catch some shrimps');
            player.inventory.add(RAW_SHRIMP_ID);
            player.inventory.remove(FISHING_BAIT_ID);
            addCatchCache(player, RAW_SHRIMP_ID);
        }

        if (player.cache.contest_catches) {
            const numCatches = player.cache.contest_catches.split('-').length;
            if (numCatches > 2 && bonzo) {
                player.engage(bonzo);
                await bonzoTimesUpDialogue(player, bonzo);
                player.disengage();
            }
        }
    } else if (sinister) {
        player.engage(sinister);
        await sinister.say('I think you will find that is my spot');
        player.disengage();
    }
}

async function opCarpFishSpot(player, gameObject) {
    const stage = getStage(player);
    const sinister = ifNearVisNpc(player, SINISTER_STRANGER_ID, 10);
    const bonzo = ifNearVisNpc(player, BONZO_ID, 15);

    if (!player.cache.usable_carp_spot) {
        if (player.inventory.has(HEMENSTER_FISHING_TROPHY_ID)) {
            player.message('you have already won the fishing competition');
            return;
        } else if (bonzo && !player.cache.paid_contest_fee) {
            player.engage(bonzo);
            await bonzoDialogue(player, bonzo, false);
            player.disengage();
            return;
        }
    }

    if (
        (stage > 0 && player.cache.garlic_activated) ||
        (stage === -1 && player.cache.usable_carp_spot)
    ) {
        if (player.skills.fishing.current < FISHING_LEVEL_REQ) {
            player.message(
                'You need at least level 10 fishing to lure these fish'
            );
        } else if (!player.inventory.has(FISHING_ROD_ID)) {
            player.message("I don't have the equipment to catch a fish");
        } else if (
            !player.inventory.has(FISHING_BAIT_ID) &&
            !player.inventory.has(RED_VINE_WORMS_ID)
        ) {
            player.message('you have no bait to catch fish here');
        } else if (player.inventory.has(RED_VINE_WORMS_ID)) {
            player.message('You catch a giant carp');
            player.inventory.add(RAW_GIANT_CARP_ID);
            player.inventory.remove(RED_VINE_WORMS_ID);
            if (stage > 0) {
                addCatchCache(player, RAW_GIANT_CARP_ID);
            }
        } else if (player.inventory.has(FISHING_BAIT_ID)) {
            player.message('You catch a sardine');
            player.inventory.add(RAW_SARDINE_ID);
            player.inventory.remove(FISHING_BAIT_ID);
            if (stage > 0) {
                addCatchCache(player, RAW_SARDINE_ID);
            }
        }

        if (stage > 0 && player.cache.contest_catches) {
            const numCatches = player.cache.contest_catches.split('-').length;
            if (numCatches > 2 && bonzo) {
                player.engage(bonzo);
                await bonzoTimesUpDialogue(player, bonzo);
                player.disengage();
            }
        }
    } else if (stage === -1) {
        player.message('you have already won the fishing competition');
    } else if (sinister) {
        player.engage(sinister);
        await sinister.say('I think you will find that is my spot');
        await player.say("Can't you go to another spot?");
        await sinister.say(
            'I like this place',
            'I like to savour the aroma coming from these pipes'
        );
        player.disengage();
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (gameObject.id) {
        case GATE_CLOSED_ID:
            await opGate(player, gameObject);
            return true;
        case REGULAR_FISH_SPOT_ID:
            await opRegularFishSpot(player, gameObject);
            return true;
        case CARP_FISH_SPOT_ID:
            await opCarpFishSpot(player, gameObject);
            return true;
        case DAVE_FISH_SPOT_ID: {
            const dave = ifNearVisNpc(player, BIG_DAVE_ID, 10);
            if (dave) {
                player.engage(dave);
                await bigDaveDialogue(player, dave);
                player.disengage();
            }
            return true;
        }
        case JOSHUA_FISH_SPOT_ID: {
            const joshua = ifNearVisNpc(player, JOSHUA_ID, 10);
            if (joshua) {
                player.engage(joshua);
                await joshuaDialogue(player, joshua);
                player.disengage();
            }
            return true;
        }
        case WHITE_WOLF_PASS_STAIRS_ID:
            await opWhiteWolfStairs(player, gameObject);
            return true;
        default:
            return false;
    }
}

async function opWhiteWolfStairs(player, gameObject) {
    const stage = getStage(player);

    if (stage === -1) {
        player.message('You go down the stairs');
        if (gameObject.x === 426 && gameObject.y === 458) {
            player.teleport(426, 3294, false);
        } else {
            player.teleport(385, 3301, false);
        }
        return;
    }

    const dwarf = ifNearVisNpc(player, MOUNTAIN_DWARF_ID, 25);
    if (!dwarf) {
        return;
    }

    if (stage === 0) {
        player.engage(dwarf);
        await dwarf.say('Hoi there, halt', "You can't come in here");
        // do not send over
        const stairMenu = await player.ask([
            'why not?',
            "Oh sorry I hadn't realised it was private",
            "I'm bigger than you let me by"
        ]);
        if (stairMenu === 0) {
            await dwarf.say('Why not?');
            await goDownDialogue(player, dwarf);
        } else if (stairMenu === 1) {
            await player.say("Oh sorry I hadn't realised it was private");
        } else if (stairMenu === 2) {
            await player.say("I'm bigger than you", 'Let me by');
            await dwarf.say(
                'Go away',
                "You're not going to bully your way in here"
            );
        }
        player.disengage();
    } else {
        player.engage(dwarf);
        await mountainDwarfDialogue(player, dwarf);
        player.disengage();
    }
}


async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === SINISTER_STRANGER_ID && item.id === GARLIC_ID) {
        player.engage(npc);
        await npc.say(
            'urrggh get zat horrible ving avay from me',
            'How do people like to eat that stuff',
            "I can't stand even to be near it for ten seconds"
        );
        player.disengage();
        return true;
    }

    return false;
}


function completeQuest(player) {
    player.message(
        'Well done you have completed the fishing competition quest'
    );

    // fishing xp: base 900, +800 base if fishing level >= 24
    const fishingBase = player.skills.fishing.base;
    const baseXp = fishingBase >= 24 ? 1700 : 900;
    player.addExperience('fishing', fishingBase * 300 + baseXp, false);

    player.questStages.fishingContest = -1;
    player.addQuestPoints(1);
    player.message('@gre@You haved gained 1 quest point!');
}

module.exports = {
    onTalkToNPC,
    onUseWithGameObject,
    onGameObjectCommandOne,
    onUseWithNPC
};
