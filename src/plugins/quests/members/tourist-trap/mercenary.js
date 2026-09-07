// mercenary, mercenary captain, inside-cave guards, lift-platform guard,
// jail-door guard: talk-to, watch, attack, kill

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    MERCENARY_ID,
    MERCENARY_CAPTAIN_ID,
    MERCENARY_ESCAPEGATES_ID,
    MERCENARY_LIFTPLATFORM_ID,
    MERCENARY_JAILDOOR_ID,
    CAPTAIN_SIAD_ID,
    ANA_IN_A_BARREL_ID,
    METAL_KEY_ID,
    SLAVES_ROBE_BOTTOM_ID,
    SLAVES_ROBE_TOP_ID,
    CELL_DOOR_KEY_ID,
    BOWL_OF_WATER_ID,
    COINS_ID,
    STAGES,
    stageOf,
    addNpc,
    ifNearVisNpc,
    random
} = require('./constants.js');

// desert teleport points (Point[] desertTPPoints)
const DESERT_TP_POINTS = [
    [121, 743],
    [135, 775],
    [121, 803],
    [102, 775],
    [93, 765]
];

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}

function inTouristTrapCave(player) {
    // cave presence approximated by y-band (y >= 3600)
    return player.y >= 3600;
}

function desertTeleport(player) {
    const p = DESERT_TP_POINTS[random(0, DESERT_TP_POINTS.length - 1)];
    player.teleport(p[0], p[1]);
}

async function mercenaryLeaveDesert(player, npc) {
    await npc.say('Guards, guards!');
    if (npc && !npc.opponent) {
        await npc.attack(player);
    }
    await mes(player, 'Nearby guards quickly grab you and rough you up a bit.');
    await npc.say(
        "Let's see how good you are with desert survival techniques!"
    );
    await mes(player, "You're bundled into the back of a cart and blindfolded...");
    await mes(player, 'Sometime later you wake up in the desert.');
    if (player.inventory.has(BOWL_OF_WATER_ID)) {
        await npc.say("You won't be needing that water any more!");
        await mes(player, 'The guards throw your water away...');
        player.inventory.remove(BOWL_OF_WATER_ID);
    }
    desertTeleport(player);
}

async function mercenaryThrowPrison(player, npc) {
    await mes(player, 'The Guards search you!');
    const rand = random(0, 3);
    if (player.inventory.has(CELL_DOOR_KEY_ID) && rand === 0) {
        player.message('The guards find the cell door key and remove it!');
        player.inventory.remove(CELL_DOOR_KEY_ID);
    }
    if (player.inventory.has(METAL_KEY_ID) && rand === 1) {
        player.message('The guards find the main gate key and remove it!');
        player.inventory.remove(METAL_KEY_ID);
    }
    await mes(player, 'More guards rush to catch you.');
    await mes(
        player,
        "You are roughed up a bit by the guards as you're manhandlded to a cell."
    );
    if (npc) {
        await npc.say(
            'Into the cell you go! I hope this teaches you a lesson.'
        );
    }
    player.teleport(89, 801);
}

async function mercenaryThrowPlayer(player, npc) {
    await npc.say(
        "Don't try to fool me, you don't have five gold coins!",
        'Before you try to bribe someone, make sure you have the money effendi!'
    );
    await mercenaryLeaveDesert(player, npc);
}

async function mercPlaceSecond(player, npc) {
    await npc.say(
        "It's just a mining camp. Prisoners are sent here from Al Kharid.",
        'They serve out their sentence by mining.',
        'Most prisoners will end their days here, surrounded by desert.'
    );
    await player.say(
        "So you could almost say that they got their... 'just desserts'"
    );
    await npc.say('You could say that...');
    await mes(player, 'There is an awkward pause');
    await npc.say("But it wouldn't be very funny.");
    await mes(player, 'There is another awkward pause.');
    await player.say(
        'When they talk about the silence of the desert,',
        'this must be what they mean.'
    );
    player.message('The guard starts losing interest in the conversation.');
    const options = await player.ask(
        ['Can I take a look around the place?', 'Ok thanks.'],
        true
    );
    if (options === 0) {
        await npc.say(
            "Not really. The Captain won't let you in the compound.",
            "He's the only one who has the key to the gate.",
            "And if you talk to him, he'll probably just order us to kill you.",
            'Unless...'
        );
        const newMenu = await player.ask(
            [
                'Does the Captain order you to kill a lot of people?',
                'Unless what?'
            ],
            true
        );
        if (newMenu === 0) {
            await mercOrderKillPeople(player, npc);
        } else if (newMenu === 1) {
            await npc.say(
                'Unless he has a use for you.',
                "He's been trying to track down a someone called 'Al Zaba Bhasim'.",
                'You could offer to catch him and that might put you in his good books?'
            );
            const tenthMenu = await player.ask(
                ['Where would I find this Al Zaba Bhasim?', 'Ok thanks.'],
                true
            );
            if (tenthMenu === 0) {
                await npc.say(
                    'Well, he could be anywhere, he\'s a nomadic desert dweller.',
                    'However, he is frequently to be found to the west in the ',
                    "hospitality of the tenti's."
                );
                const eleventhMenu = await player.ask(
                    ["The Tenti's, who are they?", 'Ok thanks.'],
                    false
                );
                if (eleventhMenu === 0) {
                    await player.say("The Tenti's, who are they?");
                    await npc.say(
                        "Well, we're not really sure what they're proper name is.",
                        "But they live in tents so we call them the 'Tenti's'."
                    );
                    const twelftMenu = await player.ask(
                        ['Ok thanks.', 'Is Al Zaba Bhasim very tough?'],
                        false
                    );
                    if (twelftMenu === 0) {
                        await player.say('Ok, thanks.');
                        await npc.say('Yeah, whatever!');
                    } else if (twelftMenu === 1) {
                        await player.say('Is Al Zaba Bhasim very tough?');
                        await npc.say(
                            "Well, I'm not sure, but by all accounts, he is a slippery fellow.",
                            'The Captain has been trying to capture him for years.',
                            'A bit of a waste of time if you ask me.',
                            'Anyway, I have to get going, I do have work to do.'
                        );
                        player.message('The guard walks off.');
                    }
                } else if (eleventhMenu === 1) {
                    await player.say('Ok, thanks.');
                    await npc.say('Yeah, whatever!');
                }
            } else if (tenthMenu === 1) {
                await npc.say('Yeah, whatever!');
            }
        }
    } else if (options === 1) {
        await npc.say('Yeah, whatever!');
    }
}

async function mercOrderKillPeople(player, npc) {
    player.message('The guard snorts.');
    await npc.say(
        '*Snort*',
        'Just about anyone who talks to him.',
        "Unless he has a use for you, he'll probably just order us to kill you.",
        "And it's such a horrible job cleaning up the mess afterwards."
    );
    const sixthMenu = await player.ask(
        ['Not to mention the senseless waste of human life.', 'Ok thanks.'],
        true
    );
    if (sixthMenu === 0) {
        await npc.say('Heh?');
        await mes(player, 'The guard looks at you with a confused stare...');
        const seventhMenu = await player.ask(
            [
                "It doesn't sound as if you respect your Captain much.",
                'Ok thanks.'
            ],
            false
        );
        if (seventhMenu === 0) {
            await player.say(
                "It doesn't sound is if you respect your Captain much."
            );
            await npc.say('Well, to be honest.');
            await mes(player, 'The guard looks around conspiratorially.');
            await npc.say(
                "We think he's not exactly as brave as he makes out.",
                'But we have to follow his orders.',
                'If someone called him a coward, ',
                'or managed to trick him into a one-on-one duel.',
                "Many of us bet that he'll be slaughtered in double quick time.",
                "And all the men agreed that they wouldn't intervene."
            );
            const eightMenu = await player.ask(
                ['Can I have a bet on that?', 'Ok Thanks.'],
                false
            );
            if (eightMenu === 0) {
                await player.say('Can I have a bet on that?');
                if (player.cache.mercenary_bet !== undefined) {
                    await npc.say(
                        "Sorry, we've already taken your bet, wouldn't want any cheating now.",
                        'Anyway, I have to get back to work. See ya around...'
                    );
                    return;
                }
                await npc.say(
                    'Well, if you think you stand a chance, sure.',
                    'But remember, if he gives us an order, we have to obey.'
                );
                const ninthMenu = await player.ask(
                    [
                        "I'll bet 5 gold that I win.",
                        "I'll bet 10 gold that I win.",
                        "I'll bet 15 gold that I win.",
                        "I'll bet 20 gold that I win.",
                        'Ok, thanks.'
                    ],
                    true
                );
                if (ninthMenu >= 0 && ninthMenu <= 3) {
                    const bets = [5, 10, 15, 20];
                    const recvs = [6, 12, 19, 30];
                    const betAmount = bets[ninthMenu];
                    const recvAmount = recvs[ninthMenu];
                    if (player.inventory.has(COINS_ID, betAmount)) {
                        await npc.say("Great, I'll take that bet.");
                        player.message(`You hand over ${betAmount} gold coins.`);
                        player.inventory.remove(COINS_ID, betAmount);
                        await npc.say(
                            `Ok, if you win, you'll get ${recvAmount}gold back.`
                        );
                        player.cache.mercenary_bet = betAmount;
                    }
                    await npc.say(
                        'Anyway, I have to get going, I do have work to do.'
                    );
                    player.message('The guard walks off.');
                } else if (ninthMenu === 4) {
                    await npc.say('Yeah, whatever!');
                }
            } else if (eightMenu === 1) {
                await player.say('Ok, thanks.');
                await npc.say('Yeah, whatever!');
            }
        } else if (seventhMenu === 1) {
            await player.say('Ok, thanks.');
            await npc.say('Yeah, whatever!');
        }
    } else if (sixthMenu === 1) {
        await npc.say('Yeah, whatever!');
    }
}

async function mercPlaceStart(player, npc) {
    await npc.say("It's none of your business now get lost.");
    const menu = await player.ask(
        ['Perhaps five gold coins will make it my business?', 'Ok, thanks.'],
        true
    );
    if (menu === 0) {
        await npc.say('It certainly will!');
        if (player.inventory.has(COINS_ID, 5)) {
            player.message('The guard takes the five gold coins.');
            player.inventory.remove(COINS_ID, 5);
            await npc.say('Now then, what did you want to know?');
            const secondMenu = await player.ask(
                ['What is this place?', 'What are you guarding?'],
                true
            );
            if (secondMenu === 0) {
                await mercPlaceSecond(player, npc);
            } else if (secondMenu === 1) {
                await mercGuardingSecond(player, npc);
            }
        } else {
            await mercenaryThrowPlayer(player, npc);
        }
    } else if (menu === 1) {
        await npc.say('Yeah, whatever!');
    }
}

async function mercGuardingFirst(player, npc) {
    await npc.say('Get lost before I chop off your head!');
    const chopMenu = await player.ask(
        ['Ok thanks.', 'Perhaps these five gold coins will sweeten your mood?'],
        false
    );
    if (chopMenu === 0) {
        await player.say('Ok, thanks.');
        await npc.say('Yeah, whatever!');
    } else if (chopMenu === 1) {
        await player.say(
            'Perhaps these five gold coins will sweeten your mood?'
        );
        if (player.inventory.has(COINS_ID, 5)) {
            await npc.say('Well, it certainly will help...');
            player.message('The guard takes the five gold coins.');
            player.inventory.remove(COINS_ID, 5);
            await npc.say('Now then, what did you want to know?');
            const knowMenu = await player.ask(
                [
                    'What is this place?',
                    'What are you guarding?',
                    "I'm looking for a woman called Ana, have you seen her?"
                ],
                true
            );
            if (knowMenu === 0) {
                await mercPlaceSecond(player, npc);
            } else if (knowMenu === 1) {
                await mercGuardingSecond(player, npc);
            } else if (knowMenu === 2) {
                await mercAnaSecond(player, npc);
            }
        } else {
            await mercenaryThrowPlayer(player, npc);
        }
    }
}

async function mercGuardingSecond(player, npc) {
    await npc.say(
        "Well, if you have to know, we're making sure that no prisoners get out."
    );
    await mes(player, 'The guard gives you a disaproving look.');
    await npc.say(
        "And to make sure that unauthorised people don't get in."
    );
    await mes(player, 'The guard looks around nervously.');
    await npc.say(
        "You'd better go now before the Captain orders us to kill you."
    );
    const gmenu = await player.ask(
        ['Does the Captain order you to kill a lot of people?', 'Ok Thanks.'],
        false
    );
    if (gmenu === 0) {
        await player.say('Does the Captain order you to kill a lot of people?');
        await mercOrderKillPeople(player, npc);
    }
    // gmenu == 2 is an unreachable index for the 'ok, thanks' path
}

async function mercAnaFirst(player, npc) {
    await npc.say('No, now get lost!');
    const altMenu = await player.ask(
        ['Perhaps five gold coins will help you remember?', 'Ok, thanks.'],
        true
    );
    if (altMenu === 0) {
        await npc.say('Hmm, it might help!');
        if (player.inventory.has(COINS_ID, 5)) {
            player.message('The guards takes the five gold coins.');
            player.inventory.remove(COINS_ID, 5);
            await npc.say('Now then, what did you want to know?');
            const anaMenu = await player.ask(
                [
                    "I'm looking for a woman called Ana, have you seen her?",
                    'What is this place?',
                    'What are you guarding?'
                ],
                true
            );
            if (anaMenu === 0) {
                await mercAnaSecond(player, npc);
            } else if (anaMenu === 1) {
                await mercPlaceSecond(player, npc);
            } else if (anaMenu === 2) {
                await mercGuardingSecond(player, npc);
            }
        } else {
            await mercenaryThrowPlayer(player, npc);
        }
    } else if (altMenu === 1) {
        await npc.say('Yeah, whatever!');
    }
}

async function mercAnaSecond(player, npc) {
    await npc.say(
        'Hmm, well, we get a lot of people in here.',
        'But not many women though...',
        'Saw one come in last week....',
        "But I don't know if it's the woman you're looking for?"
    );
    const lastMenu = await player.ask(
        ['What is this place?', 'What are you guarding?'],
        true
    );
    if (lastMenu === 0) {
        await mercPlaceSecond(player, npc);
    } else if (lastMenu === 1) {
        await mercGuardingSecond(player, npc);
    }
}

async function mercenaryDialogue(player, npc) {
    const stage = stageOf(player);
    switch (stage) {
        case STAGES.NOT_STARTED: {
            if (player.inventory.has(METAL_KEY_ID)) {
                await npc.say("Move along now..we've had enough of your sort!");
                return;
            }
            await npc.say('Yeah, what do you want?');
            const menu = await player.ask(
                ['What is this place?', 'What are you guarding?'],
                true
            );
            if (menu === 0) {
                await mercPlaceStart(player, npc);
            } else if (menu === 1) {
                await mercGuardingFirst(player, npc);
            }
            break;
        }
        case 1:
        case 2:
        case 3:
        case 4:
        case 5: {
            if (player.inventory.has(METAL_KEY_ID) || inTouristTrapCave(player)) {
                await npc.say("Move along now..we've had enough of your sort!");
                return;
            }
            if (
                stage === 1 &&
                player.cache.first_kill_captn === true
            ) {
                await captainBetAftermath(player, npc);
                return;
            }
            await npc.say('Yeah, what do you want?');
            const option = await player.ask(
                [
                    'What is this place?',
                    'What are you guarding?',
                    "I'm looking for a woman called Ana, have you seen her?"
                ],
                true
            );
            if (option === 0) {
                await mercPlaceStart(player, npc);
            } else if (option === 1) {
                await mercGuardingFirst(player, npc);
            } else if (option === 2) {
                await mercAnaFirst(player, npc);
            }
            break;
        }
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
            await npc.say("Move along now..we've had enough of your sort!");
            break;
        case STAGES.COMPLETE:
            await npc.say("What're you looking at?");
            break;
        default:
            break;
    }
}

// bet aftermath after killing the captain on stage 1
async function captainBetAftermath(player, npc) {
    let completed = false;
    if (player.cache.mercenary_bet === undefined) {
        await npc.say(
            "Well, you've killed our Captain.",
            "I guess you've proved yourself in combat.",
            "However, you've left a horrible mess now.",
            "And it's gonna cost you for us to clean it up.",
            "Let's say 20 gold and we won't have to get rough with you?"
        );
        const opts = await player.ask(
            [
                "Yeah, ok, I'll give you 20 gold.",
                "I'll give you 15, that's all you're gettin'",
                "You can whistle for you money, I'll take you all on."
            ],
            false
        );
        if (opts === 0) {
            await player.say("Yeah, ok, I'll give you 20 gold.");
            if (player.inventory.has(COINS_ID, 20)) {
                player.inventory.remove(COINS_ID, 20);
                await npc.say('Good! Seeya, we have some cleaning to do.');
                completed = true;
            } else {
                await npc.say(
                    "You don't have the gold and now we're gonna teach you a lesson."
                );
                await mes(player, 'The Guards search you!');
                await mercenaryLeaveDesert(player, npc);
                completed = true;
            }
        } else if (opts === 1) {
            await player.say("I'll give you 15, that's all you're gettin'");
            if (player.inventory.has(COINS_ID, 15)) {
                player.inventory.remove(COINS_ID, 15);
                await npc.say(
                    "Ok, we'll take fifteen, you push a hard bargain!"
                );
                completed = true;
            } else {
                await npc.say(
                    "You don't have the gold and now we're gonna teach you a lesson."
                );
                await mes(player, 'The Guards search you!');
                await mercenaryLeaveDesert(player, npc);
                completed = true;
            }
        } else if (opts === 2) {
            await player.say(
                "You can whistle for your money, I'll take you all on."
            );
            await npc.say("Ok, that's it, we're gonna teach you a lesson.");
            await mes(player, 'The Guards search you!');
            await mercenaryLeaveDesert(player, npc);
            completed = true;
        }
    } else {
        await player.say("Hey, I've come to collect my bet!");
        await npc.say('Well, I guess congratulations are in order.');
        await player.say('Thanks!');
        await npc.say('And we\'ll only charge the paltry sum of..erm...');
        await mes(player, 'The guards starts to do some mental calculations...');
        await mes(
            player,
            'You can see his brow furrow and he starts to sweat profusely'
        );
        switch (player.cache.mercenary_bet) {
            case 5:
                await npc.say(
                    'Five gold for cleaning up the mess.',
                    'You have won 1 Gold piece!'
                );
                player.inventory.add(COINS_ID, 1);
                break;
            case 10:
                await npc.say(
                    '10 gold for cleaning up the mess.',
                    'You have won 2 Gold pieces!'
                );
                player.inventory.add(COINS_ID, 2);
                break;
            case 15:
                await npc.say(
                    '15 gold for cleaning up the mess.',
                    'You have won 4 Gold pieces!'
                );
                player.inventory.add(COINS_ID, 4);
                break;
            case 20:
                await npc.say(
                    '20 gold for cleaning up the mess.',
                    'You have won 10 Gold pieces!'
                );
                player.inventory.add(COINS_ID, 10);
                break;
            default:
                break;
        }
        await npc.say('Well done..!', 'Ha, ha, ha ha!');
        player.message('The guards walk off chuckling to themselves.');
        completed = true;
    }
    if (completed) {
        player.cache.first_kill_captn = false;
    }
}

async function captainWantToThrowPlayer(player) {
    const n = ifNearVisNpc(player, MERCENARY_ID, 10);
    if (!n) {
        return;
    }
    const punishment = random(0, 3);
    if (punishment === 0) {
        player.message(
            'A guard approaches you and pretends to start hiting you.'
        );
        await n.say('Take that you infidel!');
        player.message('The guard leans closer to you and says in a low voice.');
        await n.say(
            "We're sick of having to kill every lunatic that comes along",
            'and insults the captain, it makes such a mess.',
            "Thankfully, he's a bit decrepid so he doesn't notice",
            "so please, buzz off and don't come here again."
        );
    } else if (punishment === 1) {
        player.message('The guard approaches you again kicks you slightly.');
        await player.say('Ow!');
        await n.say('Take that you mad child of a dog!');
        player.message('The guard leans closer to you and says in a low voice.');
        await n.say(
            'What are you doing here again?',
            "Didn't I tell you to get out of here!",
            'Now get lost, properly this time!',
            'Or we may be forced to see his orders through properly.'
        );
    } else if (punishment === 2) {
        player.message(
            'A guard approaches you and looks very angry, he slaps you across the face.'
        );
        await n.say('Prepare to die effendi!');
        player.message('The guard leans close and whispers');
        await n.say(
            'Are you mad effendi!',
            'This is your last chance.',
            'Leave now and never come back.',
            "Or I'll introduce you to my friend."
        );
        player.message('The guard half draws his fearsome looking scimitar.');
        await n.say(
            "And we'll be pleased to clean the mess up after you've been dispatched."
        );
    } else {
        player.message(
            'An angry guard approaches you and whips out his sword.'
        );
        await n.say(
            (Math.random() < 0.5 ? 'Guard: ' : '') + 'Ok, that does it!',
            "You're in serious trouble now!"
        );
        if (Math.random() < 0.5) {
            await n.say(
                'Ok men, we need to teach this man a thing or two',
                'about desert survival techniques.'
            );
            await mes(player, 'The guards grab you and beat you up.');
        } else {
            await n.say(
                'Ok men, we need to teach this person a thing or two',
                'about desert survival techniques.'
            );
            await mes(player, 'The guards grab you and rough you up a bit.');
        }
        player.damage(random(4, 7));
        await mes(player, "You're grabed and manhandled onto a cart.");
        await mes(player, "Sometime later you're dumped in the middle of the desert.");
        await mes(
            player,
            'The guards move off in the cart leaving you stranded in the desert.'
        );
        desertTeleport(player);
    }
}

async function captainGuarding(player, npc) {
    await npc.say(
        'Effendi...',
        "For just one second, imagine that it's none of your business!",
        'Also imagine having your limbs pulled from your body one at a time.',
        'Now, what was the question again?'
    );
    const fourthMenu = await player.ask(
        [
            "Do you have sand in your ears, I said, 'What are you guarding?'",
            "You don't scare me!"
        ],
        true
    );
    if (fourthMenu === 0) {
        await npc.say(
            'Why....you ignorant, rude and eternally damned infidel,'
        );
        player.message('The captain seems very agitated with what you just said.');
        await npc.say('Guards, kill this infidel!');
        await captainWantToThrowPlayer(player);
    } else if (fourthMenu === 1) {
        await captainDontScareMe(player, npc);
    }
}

async function captainDontScareMe(player, npc) {
    await npc.say(
        'Well, perhaps I can try a little harder.',
        'Guards, kill this infidel.'
    );
    await captainWantToThrowPlayer(player);
}

async function captainMustBeSomething(player, npc) {
    player.message(
        'The Captain ponders a moment and then looks at you critically.'
    );
    await npc.say(
        'You could bring me the head of Al Zaba Bhasim.',
        'He is the leader of the notorius desert bandits, they plague us daily.',
        'You should find them west of here.',
        'You should have no problem in finishing them all off.',
        'Do this for me and maybe I will consider helping you.'
    );
    if (player.cache.find_al_bhasim === undefined) {
        player.cache.find_al_bhasim = true;
    }
    const doThis = await player.ask(
        ['Consider it done.', "I don't think I can do that."],
        true
    );
    if (doThis === 0) {
        await npc.say(
            'Good...run along then.',
            'You stand around flapping your tongue chatting like an insane camel.'
        );
    } else if (doThis === 1) {
        await npc.say(
            'Hmm, well yes, I did consider that you might not be right for the job.',
            'Be off with you then before I turn my men loose on you.'
        );
        const no = await player.ask(
            ["I guess you can't fight your own battles then?", "Ok, I'll move on."],
            false
        );
        if (no === 0) {
            await player.say("I guess you can't fight your own battles then?");
            player.message(
                'The men around you fall silent and the Captain silently fumes.'
            );
            await player.world.sleepTicks(3);
            player.message('All eyes turn to the Captain...');
            await npc.say(
                "Very well, if you're challenging me, let's get on with it!"
            );
            player.message('The guards gather around to watch the fight.');
            await npc.attack(player);
        } else if (no === 1) {
            await player.say("Ok, I'll be moving along then.");
            await npc.say(
                'Effendi, I think you\'ll find that is the ',
                'wisest decision you have made today.'
            );
        }
    }
}

async function mercenaryCaptainDialogue(player, npc) {
    if (player.inventory.has(METAL_KEY_ID)) {
        await npc.say("Move along now...we've had enough of your sort!");
        return;
    }
    player.message('You approach the Mercenary Captain.');
    const menu = await player.ask(['Hello.', 'You there!', 'Hey ugly!'], true);
    if (menu === 0) {
        await npc.say('Be off Effendi, you are not wanted around here.');
        const be = await player.ask(
            [
                "That's rude, I ought to teach you some manners.",
                "I 'll offer you something in return for your time."
            ],
            true
        );
        if (be === 0) {
            await npc.say(
                'Oh yes! How might you do that?',
                'You seem little more than a gutter dweller.',
                'How could you teach me manners?'
            );
            const manners = await player.ask(
                [
                    'With my right fist and a good deal of force.',
                    'Err, sorry, I thought I was talking to someone else.'
                ],
                false
            );
            if (manners === 0) {
                await player.say(
                    'With my good right arm and a good deal of force.'
                );
                await npc.say(
                    'Oh yes, ready your weapon then!',
                    "I'm sure you won't mind if my men join in?",
                    'Har, har, har!',
                    'Guards, kill this gutter dwelling slime.'
                );
                await captainWantToThrowPlayer(player);
            } else if (manners === 1) {
                await player.say(
                    'Err, sorry, I thought I was talking to someone else.'
                );
                await npc.say(
                    'Well, Effendi, you do need to be carefull of what you say to people.',
                    'Or they may take it the wrong way.',
                    "Thankfully, I'm very understanding.",
                    "I'll just let me guards deal with you.",
                    'Guards, teach this desert weed some manners.'
                );
                await captainWantToThrowPlayer(player);
            }
        } else if (be === 1) {
            await npc.say('Hmmm, oh yes, what might that be?');
            const menus = await player.ask(
                [
                    'I have some gold.',
                    'There must be something that I can do for you?'
                ],
                true
            );
            if (menus === 0) {
                await npc.say(
                    'Ha, ha, ha! You come to a mining camp and offer us gold!',
                    "Thanks effendi, but we have all the gold that we'll ever need.",
                    'Now be off with you,',
                    'before we reduce you to a bloody mess on the sand.'
                );
                const option = await player.ask(
                    [
                        'There must be something that I can do for you?',
                        "You don't scare me!"
                    ],
                    true
                );
                if (option === 0) {
                    await captainMustBeSomething(player, npc);
                } else if (option === 1) {
                    await captainDontScareMe(player, npc);
                }
            } else if (menus === 1) {
                await captainMustBeSomething(player, npc);
            }
        }
    } else if (menu === 1) {
        await npc.say(
            'How dare you talk to me like that!',
            'Explain your business quickly...',
            'or my guards will slay you where you stand.'
        );
        player.message('Some guards close in around you.');
        const thirdMenu = await player.ask(
            ['I\'m lost, can you help me?', 'What are you guarding?'],
            true
        );
        if (thirdMenu === 0) {
            await mes(
                player,
                'The captain smiles broadly and with a sickening voice says.'
            );
            await npc.say(
                'We are not a charity effendi,',
                'Be off with you before I have your head removed from your body.'
            );
            const lostMenu = await player.ask(
                ['What are you guarding?', "You don't scare me!"],
                true
            );
            if (lostMenu === 0) {
                await captainGuarding(player, npc);
            } else if (lostMenu === 1) {
                await captainDontScareMe(player, npc);
            }
        } else if (thirdMenu === 1) {
            await captainGuarding(player, npc);
        }
    } else if (menu === 2) {
        await npc.say('I will not tolerate such insults..', 'Guards, kill him.');
        await mes(
            player,
            'The captain marches away in disgust leaving his guards to tackle you.'
        );
        await captainWantToThrowPlayer(player);
    }
}

async function mercInsidePineapples(player, npc) {
    if (player.questStages[QUEST_KEY] === STAGES.FREED_SLAVE) {
        player.questStages[QUEST_KEY] = STAGES.NEED_PINEAPPLE;
    }
    await npc.say(
        "Well, that's not my problem is it?",
        'Also, I know that you slaves trade your items down here.',
        "I'm sure that if you're resourceful enough, you'll come up with the goods.",
        "Now, get along and do some work, before we're both in for it."
    );
}

async function mercInsideUnderstand(player, npc) {
    if (player.questStages[QUEST_KEY] === STAGES.FREED_SLAVE) {
        player.questStages[QUEST_KEY] = STAGES.NEED_PINEAPPLE;
    }
    await npc.say('Ok, good then.');
    player.message(
        'The guard moves back to his post and winks at you knowingly.'
    );
}

async function mercenaryInsideDialogue(player, npc) {
    const stage = stageOf(player);
    if (inTouristTrapCave(player)) {
        const { hasSlaveDisguise } = require('./constants.js');
        if (!hasSlaveDisguise(player)) {
            player.message("This guard looks as if he's been down here a while.");
            await npc.say(
                "Hey, you're no slave!",
                'What are you doing down here?'
            );
            await npc.attack(player);
            if (stage !== STAGES.COMPLETE) {
                await mes(player, 'More guards rush to catch you.');
                await mes(
                    player,
                    "You are roughed up a bit by the guards as you're manhandlded to a cell."
                );
                await npc.say(
                    'Into the cell you go! I hope this teaches you a lesson.'
                );
                player.teleport(89, 801);
            }
            return;
        }
        if (stage >= STAGES.ATE_PINEAPPLE || stage === STAGES.COMPLETE) {
            player.message("This guard looks as if he's been down here a while.");
            await npc.say(
                'That pineapple was just delicious, many thanks.',
                "I don't suppose you could get me another?"
            );
            player.message('The guard looks at you pleadingly.');
            return;
        }
        player.message("This guard looks as if he's been down here a while.");
        await npc.say('Yeah, what do you want?');
        const mama = await player.ask(
            ['Er nothing really.', "I'd like to mine in a different area."],
            true
        );
        if (mama === 0) {
            await npc.say('Ok...so move along and get on with your work.');
        } else if (mama === 1) {
            await npc.say(
                'Oh, so you want to work in another area of the mine heh?'
            );
            await mes(
                player,
                'The guard seems quite pleased with his rhetorical question.'
            );
            await npc.say(
                'Well, I can understand that, a change is as good as a rest they say.'
            );
            const menu = await player.ask(
                ['Huh, fat chance of a rest for me.', "Yes sir, you're quite right sir."],
                true
            );
            if (menu === 0) {
                await npc.say('You miserable whelp!', 'Get back to work!');
                player.damage(2);
                player.message('The guard cuffs you around head.');
            } else if (menu === 1) {
                await npc.say(
                    "Of course I'm right...",
                    'And what goes around comes around as they say.',
                    "And it's been absolutely ages since I've had anything different to eat.",
                    "What I wouldn't give for some ripe and juicy pineapple for a change.",
                    "And those Tenti's have the best pineapple in this entire area."
                );
                player.message('The guard winks at you.');
                await npc.say("I'm sure you get my meaning...");
                const pus = await player.ask(
                    [
                        'How am I going to get some pineapples around here?',
                        'Yes sir, we understand each other perfectly.',
                        "What are the 'Tenti's'?"
                    ],
                    true
                );
                if (pus === 0) {
                    await mercInsidePineapples(player, npc);
                } else if (pus === 1) {
                    await mercInsideUnderstand(player, npc);
                } else if (pus === 2) {
                    await npc.say(
                        "Well, you really don't come from around here do you?",
                        "The tenti's are what we call the nomadic people west of here.",
                        "They live in tents, so we call them the tenti's",
                        'They have great pineapples!',
                        "I'm sure you get my meaning..."
                    );
                    const pus2 = await player.ask(
                        [
                            'How am I going to get some pineapples around here?',
                            'Yes sir, we understand each other perfectly.'
                        ],
                        true
                    );
                    if (pus2 === 0) {
                        await mercInsidePineapples(player, npc);
                    } else if (pus2 === 1) {
                        await mercInsideUnderstand(player, npc);
                    }
                }
            }
        }
        return;
    }
    player.message("This guard looks as if he's been in the sun for a while.");
    await npc.say('Move along now...');
}

async function liftOrJailGuardCombatCell(player, npc, isLift) {
    await npc.say('Why you ungrateful whelp...I\'ll teach you some manners.');
    if (player.questStages[QUEST_KEY] === STAGES.COMPLETE) {
        await npc.attack(player);
    } else {
        await mes(player, 'The guard shouts for help.');
        await npc.attack(player);
        await mes(player, 'Other guards start arriving.');
        await npc.say('Get him men!');
        player.message('The guards rough you up a bit and then drag you to a cell.');
        player.teleport(76, 3625);
    }
}

async function liftPlatformDialogue(player, npc) {
    if (player.questStages[QUEST_KEY] === STAGES.COMPLETE) {
        await npc.say("Move along please, don't want any trouble today!");
        return;
    }
    await npc.say('Yes, what do you want?');
    const menu = await player.ask(
        ['Nothing thanks - sorry for disturbing you.', 'Your head on a stick.'],
        true
    );
    if (menu === 0) {
        await npc.say("Well...I guess that's Ok, get on your way though.");
    } else if (menu === 1) {
        await liftOrJailGuardCombatCell(player, npc, true);
    }
}

async function jailDoorGuardDialogue(player, npc) {
    await npc.say('Yeah, what do you want?');
    const menu = await player.ask(
        [
            'What are you guarding?',
            'Oh, nothing sorry for disturbing you.',
            'Your head on a stick.'
        ],
        true
    );
    if (menu === 0) {
        await npc.say(
            "I'm guarding troublesome prisoners.",
            'They think they can get away with attacking the guards.',
            'Well, we taught them a thing or two.'
        );
    } else if (menu === 1) {
        await npc.say('I should think so to, now get back to work.');
    } else if (menu === 2) {
        await liftOrJailGuardCombatCell(player, npc, false);
    }
}

async function tryToAttackMercenarys(player, affectedmob) {
    if (player.opponent) {
        return;
    }
    if (affectedmob.id === CAPTAIN_SIAD_ID) {
        player.message('Captain Siad looks pretty aggressive.');
        player.message('Are you sure you want to attack him?');
        const menu = await player.ask(
            ['Yes, I want to attack him.', "Nope, I've changed my mind."],
            false
        );
        if (menu === 0) {
            await affectedmob.say('Guards! Guards!');
            await affectedmob.attack(player);
            const { siadPunished } = require('./captain-siad.js');
            await siadPunished(player, affectedmob);
        } else if (menu === 1) {
            player.message('You change your mind about attacking the Captain.');
        }
    } else if (
        affectedmob.id === MERCENARY_CAPTAIN_ID ||
        affectedmob.id === MERCENARY_ID ||
        affectedmob.id === MERCENARY_ESCAPEGATES_ID
    ) {
        player.message('This guard looks fearsome and very aggressive.');
        player.message('Are you sure you want to attack him?');
        const menu = await player.ask(
            ['Yes, I want to attack him.', "Nope, I've changed my mind."],
            false
        );
        if (menu === 0) {
            player.message('You decide to attack the guard.');
            await affectedmob.say('Guards! Guards!');
            if (affectedmob.id === MERCENARY_CAPTAIN_ID) {
                const helper = ifNearVisNpc(player, MERCENARY_ID, 10);
                if (helper) {
                    affectedmob = helper;
                }
            }
            await affectedmob.attack(player);
            if (affectedmob.id === MERCENARY_ESCAPEGATES_ID) {
                player.message('More guards rush to catch you.');
                await mes(
                    player,
                    "You are roughed up a bit by the guards as you're manhandlded to a cell."
                );
                await affectedmob.say(
                    'Into the cell you go! I hope this teaches you a lesson.'
                );
                player.teleport(89, 801);
            } else {
                await affectedmob.say('Guards, guards!');
                await mes(
                    player,
                    'Nearby guards quickly grab you and rough you up a bit.'
                );
                await affectedmob.say(
                    "Let's see how good you are with desert survival techniques!"
                );
                await mes(
                    player,
                    "You're bundled into the back of a cart and blindfolded..."
                );
                await mes(player, 'Sometime later you wake up in the desert.');
                if (player.inventory.has(BOWL_OF_WATER_ID)) {
                    await affectedmob.say(
                        "You won't be needing that water any more!"
                    );
                    await mes(player, 'The guards throw your water away...');
                    player.inventory.remove(BOWL_OF_WATER_ID);
                }
                await mes(
                    player,
                    'The guards move off in the cart leaving you stranded in the desert.'
                );
                desertTeleport(player);
            }
        } else if (menu === 1) {
            player.message('You decide not to attack the guard.');
        }
    } else if (
        affectedmob.id === MERCENARY_LIFTPLATFORM_ID ||
        affectedmob.id === MERCENARY_JAILDOOR_ID
    ) {
        player.message('This guard looks fearsome and very aggressive.');
        player.message('Are you sure you want to attack him?');
        const menu = await player.ask(
            ['Yes, I want to attack him.', "Nope, I've changed my mind."],
            false
        );
        if (menu === 0) {
            player.message('You decide to attack the guard.');
            await affectedmob.say('Guards! Guards!');
            await affectedmob.attack(player);
            if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
                await affectedmob.say(
                    "Hey, what's in this barrel?",
                    "Right...we'll take that off your hands!"
                );
                await mes(player, 'The guards drag Ana into the distance...');
                player.inventory.remove(ANA_IN_A_BARREL_ID);
            }
            await mes(player, 'Some guards rush to help their comrade.');
            await mes(
                player,
                "You are roughed up a bit by the guards as you're manhandlded into a cell."
            );
            await affectedmob.say(
                'Into the cell you go! I hope this teaches you a lesson.'
            );
            player.teleport(74, 3626);
        } else if (menu === 1) {
            player.message('You decide not to attack the guard.');
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    switch (npc.id) {
        case MERCENARY_ID:
            player.engage(npc);
            await mercenaryDialogue(player, npc);
            player.disengage();
            return true;
        case MERCENARY_CAPTAIN_ID:
            player.engage(npc);
            await mercenaryCaptainDialogue(player, npc);
            player.disengage();
            return true;
        case MERCENARY_ESCAPEGATES_ID:
            player.engage(npc);
            await mercenaryInsideDialogue(player, npc);
            player.disengage();
            return true;
        case MERCENARY_LIFTPLATFORM_ID:
            player.engage(npc);
            await liftPlatformDialogue(player, npc);
            player.disengage();
            return true;
        case MERCENARY_JAILDOOR_ID:
            player.engage(npc);
            await jailDoorGuardDialogue(player, npc);
            player.disengage();
            return true;
        default:
            return false;
    }
}

// onKillNpc: killing the Mercenary Captain drops the metal key
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id !== MERCENARY_CAPTAIN_ID) {
        return false;
    }
    player.message('You kill the captain!');
    if (
        player.questStages[QUEST_KEY] === STAGES.SEARCHING &&
        player.cache.first_kill_captn === undefined
    ) {
        player.cache.first_kill_captn = true;
    }
    if (!player.inventory.has(METAL_KEY_ID)) {
        player.inventory.add(METAL_KEY_ID, 1);
        await mes(player, 'The mercenary captain drops a metal key on the floor.');
        await mes(player, 'You quickly grab the key and add it to your inventory.');
    }
    return true;
}

// attack, ranged and spell attacks all route to tryToAttackMercenarys
async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (stageOf(player) < 0) {
        return false;
    }
    const isMerc =
        npc.id === CAPTAIN_SIAD_ID ||
        npc.id === MERCENARY_ID ||
        npc.id === MERCENARY_ESCAPEGATES_ID ||
        npc.id === MERCENARY_LIFTPLATFORM_ID ||
        npc.id === MERCENARY_JAILDOOR_ID;
    const isMercCaptain =
        npc.id === MERCENARY_CAPTAIN_ID && !player.inventory.has(METAL_KEY_ID);
    if (!isMerc && !isMercCaptain) {
        return false;
    }
    player.engage(npc);
    await tryToAttackMercenarys(player, npc);
    player.disengage();
    return true;
}

// ranged attack: same guard and reaction as onNPCAttack
async function onRangeNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (stageOf(player) < 0) {
        return false;
    }
    const isMerc =
        npc.id === CAPTAIN_SIAD_ID ||
        npc.id === MERCENARY_ID ||
        npc.id === MERCENARY_ESCAPEGATES_ID ||
        npc.id === MERCENARY_LIFTPLATFORM_ID ||
        npc.id === MERCENARY_JAILDOOR_ID;
    const isMercCaptain =
        npc.id === MERCENARY_CAPTAIN_ID && !player.inventory.has(METAL_KEY_ID);
    if (!isMerc && !isMercCaptain) {
        return false;
    }
    player.engage(npc);
    await tryToAttackMercenarys(player, npc);
    player.disengage();
    return true;
}

// taking off a slave robe inside the cave before the quest is complete blows
// your cover; the nearest mercenary attacks and the robe stays equipped
async function onUnequipItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (
        (item.id !== SLAVES_ROBE_BOTTOM_ID && item.id !== SLAVES_ROBE_TOP_ID) ||
        !inTouristTrapCave(player) ||
        stageOf(player) === STAGES.COMPLETE
    ) {
        return false;
    }
    let n = ifNearVisNpc(player, MERCENARY_ID, 5);
    if (n) {
        n.teleport(player.x, player.y);
    } else {
        n = addNpc(player.world, MERCENARY_ID, player.x, player.y);
    }
    player.teleport(player.x, player.y);
    await player.world.sleepTicks(1);
    await n.say('Oi! What are you doing down here?', "You're no slave!");
    await n.attack(player);
    return true;
}

module.exports = {
    onTalkToNPC,
    onNPCDeath,
    onNPCAttack,
    onRangeNPC,
    onUnequipItem,
    captainWantToThrowPlayer,
    tryToAttackMercenarys,
    mercenaryLeaveDesert,
    mercenaryThrowPrison,
    inTouristTrapCave,
    desertTeleport
};
