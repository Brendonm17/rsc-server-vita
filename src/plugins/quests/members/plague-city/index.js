// Plague City (members). quest stages 0-11 in progress, -1 complete.
// reward: 1 QP + mining xp (mining.base * 300 + 700)

const { questsEnabled } = require('../../custom-gate.js');
const {
    EDMOND_ID,
    ALRENA_ID,
    JETHICK_ID,
    TED_REHNISON_ID,
    MARTHA_REHNISON_ID,
    BILLY_REHNISON_ID,
    MILLI_REHNISON_ID,
    CLERK_ID,
    BRAVEK_ID,
    ELENA_ID,
    MOURNER_WESTARDOUGNE_ID,
    DWELLBERRIES_ID,
    GASMASK_ID,
    PICTURE_ID,
    PLAGUE_CITY_BOOK_ID,
    SCRUFFY_NOTE_ID,
    HANGOVER_CURE_ID,
    WARRANT_ID,
    MAGIC_SCROLL_ID,
    LITTLE_KEY_ID,
    BUCKET_OF_WATER_ID,
    BUCKET_ID,
    ROPE_ID,
    SPADE_ID,
    DUG_UP_SOIL_ID,
    PILE_OF_MUD_ID,
    SEWER_PIPE_ID,
    CUPBOARD_CLOSED_ID,
    CUPBOARD_OPEN_ID,
    BARREL_ID,
    GATE_ID,
    GATE_OPEN_ID,
    DOOR_REHNISON_FAMILY_ID,
    DOOR_INFECTED_CAPTURED_ELENA_ID,
    QUEST_POINTS,
    MINING_BASE_XP,
    MINING_VAR_XP
} = require('./ids.js');

const TALK_NPC_IDS = [
    EDMOND_ID,
    ALRENA_ID,
    JETHICK_ID,
    TED_REHNISON_ID,
    MARTHA_REHNISON_ID,
    MILLI_REHNISON_ID,
    BILLY_REHNISON_ID,
    CLERK_ID,
    BRAVEK_ID,
    ELENA_ID
];

function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

function getStage(player) {
    return player.questStages.plagueCity || 0;
}

// handleReward() - QuestRewardRegistrar entry 34: 1 QP + Mining XP.
function handleReward(player) {
    player.message('Well done you have completed the plague city quest');
    player.addExperience(
        'mining',
        player.skills.mining.base * MINING_VAR_XP + MINING_BASE_XP,
        false
    );
    player.addQuestPoints(QUEST_POINTS);
    player.message('@gre@You haved gained 1 quest point!');
}

// bravek: post-warrant dialogue
async function postBravekDialogue(player, n) {
    const finale = await player.ask(
        [
            "Ok I'll go speak to them",
            'Is that all anyone says around here?',
            "They won't listen to me"
        ],
        false
    );

    if (finale === 0) {
        await player.say("Ok I'll go speak to them");
    } else if (finale === 1) {
        await player.say('Is that all anyone says around here');
        await n.say('Well they know best about plague issues');

        const last2 = await player.ask(
            [
                "Don't you want to take an interest in it at all?",
                "They won't listen to me"
            ],
            true
        );

        if (last2 === 0) {
            await n.say(
                "Nope I don't wish to take a deep interest in plagues",
                'That stuff is too scary for me'
            );

            const last3 = await player.ask(
                [
                    "I see why people say you're a weak leader",
                    "Ok I'll talk to the mourners",
                    "they won't listen to me"
                ],
                false
            );

            if (last3 === 0) {
                await player.say("I see why people say you're a weak leader");
                await n.say(
                    'bah people always criticise their leaders',
                    'But delegating is the only way to lead',
                    'I delegate all plague issues to the mourners'
                );
                await player.say('this whole city is a plague issue');
            } else if (last3 === 1) {
                await player.say("Ok I'll talk to the mourners");
            } else if (last3 === 2) {
                await player.say(
                    "They won't listen to me",
                    "They say I'm not properly equipped to go in the house",
                    'Though I do have a very effective gas mask'
                );
                await n.say(
                    'hmm well I guess they\'re not taking the issue of a kidnap seriously enough',
                    'They do go a bit far sometimes',
                    "I've heard of Elena, she has helped us a lot",
                    "Ok I'll give you this warrant to enter the house"
                );
                player.inventory.add(WARRANT_ID, 1);
            }
        } else if (last2 === 1) {
            await player.say(
                "They say I'm not properly equipped to go in the house",
                'Though I do have a very effective gas mask'
            );
            await n.say(
                'hmm well I guess they\'re not taking the issue of a kidnap seriously enough',
                'They do go a bit far sometimes',
                "I've heard of Elena, she has helped us a lot",
                "Ok I'll give you this warrant to enter the house"
            );
            player.inventory.add(WARRANT_ID, 1);
        }
    } else if (finale === 2) {
        await player.say(
            "They won't listen to me",
            "They say I'm not properly equipped to go in the house",
            'Though I do have a very effective gas mask'
        );
        await n.say(
            'hmm well I guess they\'re not taking the issue of a kidnap seriously enough',
            'They do go a bit far sometimes',
            "I've heard of Elena, she has helped us a lot",
            "Ok I'll give you this warrant to enter the house"
        );
        player.inventory.add(WARRANT_ID, 1);
    }
}

// elena, caged inside the plague house
async function elenaDialogue(player, n) {
    const stage = getStage(player);

    if (stage >= 11 || stage === -1) {
        player.message('You have already rescued Elena');
        return;
    }

    await player.say(
        "Hi, you're free to go",
        "Your kidnappers don't seem to be about right now"
    );
    await n.say(
        'Thank you, Being kidnapped was so inconvenient',
        'I was on my way back to East Ardougne with some samples',
        'I want to see if I can diagnose a cure for this plague'
    );
    await player.say(
        'Well you can leave via the manhole cover near the gate'
    );
    await n.say(
        'If you go and see my father',
        "I'll make sure he adequately rewards you"
    );
    player.questStages.plagueCity = 11;
}

// bravek, the city warder
async function bravekDialogue(player, n) {
    const stage = getStage(player);

    switch (stage) {
        case 8: {
            await n.say('My head hurts', "I'll speak to you another day");
            const menu = await player.ask(
                ['This is really important though', 'Ok goodbye'],
                true
            );
            if (menu === 0) {
                await n.say(
                    "I can't possibly speak to you with my head spinning like this",
                    'I went a bit heavy on the drink again last night',
                    'curse my herbalist',
                    'she made the best hang over cures',
                    'Darn inconvenient of her catching the plague'
                );
                const menu2 = await player.ask(
                    [
                        'Ok goodbye',
                        "You shouldn't drink so much then",
                        'Do you know what is in the cure?'
                    ],
                    true
                );
                if (menu2 === 0) {
                    // nothing
                } else if (menu2 === 1) {
                    await n.say(
                        'Well positions of responsibility are hard',
                        'I need something to take my mind off things',
                        'especially with the problems this place has'
                    );
                    const menu3 = await player.ask(
                        [
                            'Ok goodbye',
                            'Do you know what is in the cure?"',
                            "I don't think drink is the best solution"
                        ],
                        false
                    );
                    if (menu3 === 0) {
                        await player.say('Ok goodbye');
                    } else if (menu3 === 1) {
                        await player.say('Do you know what is in the cure?');
                        await n.say(
                            'Hmm let me think',
                            'ouch - thinking not clever',
                            'Ah here, she did scribble it down for me'
                        );
                        player.message(
                            'Bravek hands you a tatty piece of paper'
                        );
                        player.inventory.add(SCRUFFY_NOTE_ID, 1);
                        player.questStages.plagueCity = 9;
                    } else if (menu3 === 2) {
                        await n.say(
                            'uurgh',
                            'My head still hurts too much to think straight',
                            "Oh for one of Trudi's hangover cures"
                        );
                    }
                } else if (menu2 === 2) {
                    await n.say(
                        'Hmm let me think',
                        'ouch - thinking not clever',
                        'Ah here, she did scribble it down for me'
                    );
                    player.message('Bravek hands you a tatty piece of paper');
                    player.inventory.add(SCRUFFY_NOTE_ID, 1);
                    player.questStages.plagueCity = 9;
                }
            } else if (menu === 1) {
                // nothing
            }
            break;
        }
        case 9: {
            await n.say(
                'uurgh',
                'My head still hurts too much to think straight',
                "Oh for one of Trudi's hangover cures"
            );
            if (player.inventory.has(HANGOVER_CURE_ID)) {
                await player.say('Try this');
                player.message('@que@You give Bravek the hangover cure');
                await player.world.sleepTicks(3);
                player.message('@que@Bravek gulps down the foul looking liquid');
                await player.world.sleepTicks(3);
                player.inventory.remove(HANGOVER_CURE_ID);
                await n.say(
                    'grruurgh',
                    "Ooh that's much better",
                    "thanks that's the clearest my head has felt in a month",
                    'Ah now what was it you wanted me to do for you?'
                );
                player.questStages.plagueCity = 10;
                await player.say(
                    'I need to rescue a kidnap victim called Elena',
                    "She's being held in a plague house I need permission to enter"
                );
                await n.say(
                    'Well the mourners deal with that sort of thing'
                );
                await postBravekDialogue(player, n);
            }
            break;
        }
        case 10:
        case 11:
        case -1: {
            await n.say('thanks again for the hangover cure');
            if (
                player.inventory.has(WARRANT_ID) ||
                getStage(player) === 11 ||
                getStage(player) === -1
            ) {
                await player.say('Not a problem, happy to help out');
                await n.say(
                    "I'm just having a little bit of whisky",
                    "then I'll feel really good"
                );
            } else {
                await n.say(
                    'Ah now what was it you wanted me to do for you?'
                );
                await player.say(
                    'I need to rescue Elena',
                    "She's now a kidnap victim",
                    "She's being held in a plague house I need permission to enter"
                );
                await n.say(
                    'Well the mourners deal with that sort of thing'
                );
                await postBravekDialogue(player, n);
            }
            break;
        }
    }
}

// clerk, civic office
async function clerkDialogue(player, n) {
    const stage = getStage(player);

    switch (stage) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 10:
        case 11:
        case -1: {
            await n.say(
                'Hello welcome to the civic office of west Ardougne',
                'How can I help you?'
            );
            const menuMan = await player.ask(
                ['who is through that door?', "I'm just looking thanks"],
                false
            );
            if (menuMan === 0) {
                await player.say('Who is through that door?');
                await n.say('The city warder Bravek is in there');
                await player.say('Can i go in?');
                await n.say('He has asked not to be disturbed');
            } else if (menuMan === 1) {
                await player.say("I'm just looking thanks");
            }
            break;
        }
        case 8:
        case 9: {
            await n.say(
                'Hello welcome to the civic office of west Ardougne',
                'How can I help you?'
            );
            const first = await player.ask(
                [
                    'I need permission to enter a plague house',
                    'who is through that door?',
                    "I'm just looking thanks"
                ],
                false
            );
            if (first === 0) {
                await player.say(
                    'I need permission to enter a plague house'
                );
                await n.say(
                    'Rather you than me',
                    'Well the mourners normally deal with that stuff',
                    'You should speak to them',
                    'Their headquarters are right near the city gate'
                );
                const menuMenu = await player.ask(
                    [
                        "I'll try asking them then",
                        "Surely you don't let them run everything for you?",
                        'This is urgent though'
                    ],
                    true
                );
                if (menuMenu === 0) {
                    // nothing
                } else if (menuMenu === 1) {
                    await n.say(
                        "Well they do know what they're doing there",
                        'If they did start doing something badly',
                        'Bravek the city warder',
                        'would have the power to override',
                        "I can't see that happening though"
                    );
                    const second = await player.ask(
                        [
                            "I'll try asking them then",
                            'Can i speak to Bravek anyway?'
                        ],
                        false
                    );
                    if (second === 0) {
                        await player.say("I'll try asking them then");
                    } else if (second === 1) {
                        await player.say('Can I speak to Bravek anyway?');
                        await n.say('He has asked not to be disturbed"');
                        const third = await player.ask(
                            [
                                'This is urgent though',
                                'Ok I will leave him alone'
                            ],
                            true
                        );
                        if (third === 0) {
                            await player.say(
                                "Someone's been kidnapped",
                                'and is being held in a plague house'
                            );
                            await n.say(
                                "I'll see what I can do I suppose",
                                'Mr Bravek theres someone here who wishes to speak to you'
                            );
                            const bravek = ifNearVisNpc(player, BRAVEK_ID, 15);
                            if (bravek) {
                                await bravek.say(
                                    'I suppose they can come in then',
                                    'If they keep it short'
                                );
                                player.message('You go into the office');
                                player.teleport(647, 585, false);
                            }
                        } else if (third === 1) {
                            // nothing
                        }
                    }
                } else if (menuMenu === 2) {
                    await player.say(
                        "Someone's been kidnapped",
                        'and is being held in a plague house'
                    );
                    await n.say(
                        "I'll see what I can do I suppose",
                        'Mr Bravek theres someone here who wishes to speak to you'
                    );
                    const bravek = ifNearVisNpc(player, BRAVEK_ID, 15);
                    if (bravek) {
                        await bravek.say(
                            'I suppose they can come in then',
                            'If they keep it short'
                        );
                        player.message('You go into the office');
                        player.teleport(647, 585, false);
                    }
                }
            } else if (first === 1) {
                await player.say('Who is through that door?');
                await n.say('The city warder Bravek is in there');
                await player.say('Can i go in?');
                await n.say('He has asked not to be disturbed');
                const second = await player.ask(
                    ['This is urgent though', 'Ok I will leave him alone'],
                    true
                );
                if (second === 0) {
                    await player.say(
                        "Someone's been kidnapped",
                        'and is being held in a plague house'
                    );
                    await n.say(
                        "I'll see what I can do I suppose",
                        'Mr Bravek theres someone here who wishes to speak to you'
                    );
                    const bravek = ifNearVisNpc(player, BRAVEK_ID, 15);
                    if (bravek) {
                        await bravek.say(
                            'I suppose they can come in then',
                            'If they keep it short'
                        );
                        player.message('You go into the office');
                        player.teleport(647, 585, false);
                    }
                } else if (second === 1) {
                    // nothing
                }
            } else if (first === 2) {
                await player.say("I'm just looking thanks");
            }
            break;
        }
    }
}

// milli rehnison
async function milliDialogue(player, n) {
    const stage = getStage(player);

    switch (stage) {
        case 6:
            await player.say(
                'Hello',
                'Your parents say you saw what happened to Elena'
            );
            await n.say(
                'sniff',
                'Yes I was near the south east corner',
                'When I saw Elena walking by',
                'I was about to run to greet her',
                'when some men jumped out',
                'Shoved a sack over her head',
                'and dragged her into a building'
            );
            await player.say('Which building?');
            await n.say(
                'It was the mossy windowless building',
                'In that south east corner of west Ardougne'
            );
            player.questStages.plagueCity = 7;
            break;
        case 7:
        case 8:
        case 9:
        case 10:
            await n.say('Have you found Elena yet?');
            await player.say('No I am still looking');
            await n.say('I hope you find her', 'She was nice');
            break;
        case -1:
            await n.say('Have you found Elena yet?');
            await player.say("Yes she's safe at home");
            await n.say('I hope she comes and visits sometime');
            await player.say('Maybe');
            break;
    }
}

// ted / martha rehnison
async function tedMarthaDialogue(player, n) {
    const stage = getStage(player);

    switch (stage) {
        case 6:
            await player.say(
                'Hi I hear a woman called Elena is staying here'
            );
            await n.say(
                'Yes she was staying here',
                'but slightly over a week ago she was getting ready to go back',
                'However she never managed to leave',
                'My daughter Milli was playing near the west wall',
                'When she saw some shadowy figures jump out and grab her',
                'Milli is upstairs if you wish to speak to her'
            );
            break;
        case 7:
            await n.say('Any luck with finding Elena yet?');
            await player.say('Not yet');
            await n.say('I wish you luck she did a lot for us');
            break;
        case 11:
        case -1:
            await n.say('Any luck with finding Elena yet?');
            await player.say('Yes she is safe at home now');
            await n.say("That's good to hear she helped us a lot");
            break;
    }
}

// jethick
async function jethickDialogue(player, n) {
    const stage = getStage(player);

    switch (stage) {
        case 5: {
            await n.say(
                "Hello I don't recognise you",
                "We don't get many newcomers around here"
            );
            const first = await player.ask(
                [
                    "Hi I'm looking for a woman from east Ardougne",
                    "So who's in charge here?"
                ],
                true
            );
            if (first === 0) {
                await n.say(
                    'East Ardougnian women are easier to find in east Ardougne',
                    'Not many would come to west ardougne to find one',
                    'Any particular woman you have in mind?'
                );
                await player.say('Yes a lady called Elena');
                await n.say('What does she look like?');
                if (player.inventory.has(PICTURE_ID)) {
                    player.message('You show the picture to Jethick');
                    await n.say(
                        'Ah yes I recognise her',
                        'She was over here to help aid plague victims',
                        'I think she is staying over with the Rehnison family',
                        'They live in the small timbered building at the far north side of town',
                        "I've not seen her around here in a while mind you"
                    );
                    if (!player.inventory.has(PLAGUE_CITY_BOOK_ID)) {
                        await n.say(
                            "I don't suppose you could run me a little errand?",
                            'While you are over there',
                            'I borrowed this book from them',
                            'can you return it?'
                        );
                        player.message('Jethick gives you a book');
                        player.inventory.add(PLAGUE_CITY_BOOK_ID, 1);
                    }
                } else {
                    await player.say('Um brown hair, in her twenties');
                    await n.say(
                        "Hmm that doesn't narrow it down a huge amount",
                        "I'll need to know more than that"
                    );
                }
            } else if (first === 1) {
                await n.say(
                    'Well King tyras has wandered off in to the west kingdom',
                    "He doesn't care about the mess he's left here",
                    'The city warder Bravek is in charge at the moment',
                    "He's not much better"
                );
            }
            break;
        }
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case -1:
            await n.say(
                "Hello I don't recognise you",
                "We don't get many newcomers around here"
            );
            break;
    }
}

// alrena, edmond's wife
async function alrenaDialogue(player, n) {
    const stage = getStage(player);

    switch (stage) {
        case 0:
            await player.say('hello madam');
            await n.say('oh hello there');
            await player.say('are you ok?');
            await n.say(
                'not too bad',
                "I've just got some troubles on my mind"
            );
            break;
        case 1:
            await player.say(
                'hello, Edmond has asked me to help find your daughter'
            );
            await n.say(
                'yes he told me',
                "I've begun making your special gas mask",
                'but i need some dwellberries to finish it'
            );
            if (player.inventory.has(DWELLBERRIES_ID)) {
                await player.say("yes I've got some here");
                player.message('@que@you give the dwellberries to alrena');
                await player.world.sleepTicks(3);
                player.message('@que@alrena crushes the berries into a smooth paste');
                await player.world.sleepTicks(3);
                player.message('@que@she then smears the paste over a strange mask');
                await player.world.sleepTicks(3);
                player.inventory.remove(DWELLBERRIES_ID);
                player.inventory.add(GASMASK_ID, 1);
                await n.say(
                    'there we go all done',
                    'while in west ardougne you must wear this at all times',
                    "or you'll never make it back"
                );
                player.message('alrena gives you the mask');
                await n.say(
                    "while you two are digging I'll make a spare mask",
                    "I'll hide it in the cupboard incase the mourners come in"
                );
                player.questStages.plagueCity = 2;
            } else {
                await player.say("I'll try to get some");
                await n.say(
                    "the best place to look is in mcgrubor's wood to the north"
                );
            }
            break;
        case 2:
            if (player.cache.soil_soften) {
                await player.say('hello again alrena');
                await n.say("how's the tunnel going?");
                await player.say("I'm getting there");
                await n.say(
                    'one of the mourners has been sniffing around',
                    'asking questions about you and Edmond',
                    'you should keep an eye out for him'
                );
                await player.say('ok, thanks alrena');
                return;
            }
            await player.say('hello alrena');
            await n.say('hello darling', "how's that tunnel coming along?");
            await player.say("we're getting there");
            await n.say("well I'm sure you're quicker than Edmond");
            await player.say(
                "i just need to soften the soil and then we'll start digging"
            );
            await n.say(
                "if you lose your protective clothing I've made a spare set",
                "they're hidden in the cupboard incase the mourners come in"
            );
            break;
        case 3:
            await player.say('hello alrena');
            await n.say(
                'Hi, have you managed to get through to west ardougne?'
            );
            await player.say('not yet, but i should be going through soon');
            await n.say(
                'make sure you wear your mask while you are over there',
                "i can't think of a worse way to die"
            );
            break;
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
            await player.say('hello alrena');
            await n.say('hello, any word on elena?');
            await player.say("not yet I'm afraid");
            break;
        case 11:
        case -1:
            await n.say(
                'Thank you for rescuing my daughter',
                'Elena has told me of your bravery',
                'In entering a house that could have been plague infected',
                "I can't thank you enough"
            );
            break;
    }
}

// edmond, quest giver / reward giver
async function edmondDialogue(player, n) {
    const stage = getStage(player);

    switch (stage) {
        case 0: {
            await player.say('hello old man');
            player.message('the man looks upset');
            await player.say("what's wrong?");
            await n.say(
                "I've got to find my daughter",
                "i pray that she's still alive"
            );
            const firstMenu = await player.ask(
                [
                    "What's happened to her?",
                    'Well, good luck with finding her'
                ],
                false
            );
            if (firstMenu === 0) {
                await player.say("what's happened to her?");
                await n.say(
                    "elena's a missionary and a healer",
                    'three weeks ago she managed to cross the ardougne wall',
                    "no one's allowed to cross the wall in case they spread the plague",
                    'but after hearing the screams of suffering she felt she had to help',
                    "she said she'd be gone for a few days but we've heard nothing since"
                );
                const secondMenu = await player.ask(
                    [
                        'Tell me more about the plague',
                        'Can i help find her?',
                        "I'm sorry i have to go"
                    ],
                    false
                );
                if (secondMenu === 0) {
                    await player.say('Tell me more about the plague');
                    await n.say(
                        'The mourners can tell you more than me',
                        "they're the only ones allowed to cross the border",
                        'I do know the plague is a horrible way to go',
                        "that's why elena felt she had to go help"
                    );
                    const thirdMenu = await player.ask(
                        ['Can I help find her?', "I'm sorry i have to go"],
                        false
                    );
                    if (thirdMenu === 0) {
                        await edmondStartQuest(player, n);
                    } else if (thirdMenu === 1) {
                        await player.say("I'm sorry i have to go");
                        await n.say('ok then goodbye');
                    }
                } else if (secondMenu === 1) {
                    await edmondStartQuest(player, n);
                } else if (secondMenu === 2) {
                    await player.say("I'm sorry i have to go");
                    await n.say('ok then goodbye');
                }
            } else if (firstMenu === 1) {
                await player.say('Well, good luck with finding her');
            }
            break;
        }
        case 1:
            await player.say('hello Edmond');
            await n.say('have you got the dwellberries?');
            if (player.inventory.has(DWELLBERRIES_ID)) {
                await player.say('yes i have some here');
                await n.say('take them to my wife alrena');
            } else {
                await player.say("sorry I'm afraid not");
                await n.say(
                    "you'll probably find them in mcgrubor's wood to the north"
                );
            }
            break;
        case 2:
            if (player.cache.soil_soften) {
                await player.say("I've soaked the soil with water");
                await n.say(
                    "that's great it should be soft enough to dig through now"
                );
                return;
            }
            await player.say("hi Edmond, I've got the gasmask now");
            await n.say(
                'good stuff now for the digging',
                'beneath are the ardougne sewers',
                "there you'll find access to west ardougne",
                'the problem is the soil is rock hard',
                "you'll need to pour on some  buckets of water to soften it up",
                "I'll keep an eye out for the mourners"
            );
            break;
        case 3:
            await player.say(
                "Edmond, I can't get through to west ardougne",
                "there's an iron grill blocking my way",
                "i can't pull it off alone"
            );
            await n.say(
                'if you get some rope you could tie it to the grill',
                'then we could both pull it from here'
            );
            break;
        case 4:
            await player.say(
                "I've tied the other end of this rope to the grill"
            );
            player.message('@que@Edmond gets a good grip on the rope');
            await player.world.sleepTicks(3);
            player.message('@que@together you tug the rope');
            await player.world.sleepTicks(3);
            player.message('@que@you hear a clunk as you both fly backwards');
            await player.world.sleepTicks(3);
            await n.say(
                "that's done the job",
                'Remember always wear the gasmask',
                "otherwise you'll die over there for certain",
                'and please bring my elena back safe and sound'
            );
            player.questStages.plagueCity = 5;
            break;
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
            await player.say('hello');
            await n.say('Have you found Elena yet?');
            await player.say("Not yet, it's big city over there");
            await n.say("I hope it's not to late");
            break;
        case 11:
            await n.say(
                'Thank you thank you',
                'Elena beat you back by minutes',
                "now I said I'd give you a reward"
            );
            // sendQuestComplete: mark complete + grant reward (handleReward)
            player.questStages.plagueCity = -1;
            handleReward(player);
            await n.say(
                'What can I give you as a reward I wonder?',
                'Here take this magic scroll',
                'I have little use for it, but it may help you'
            );
            player.inventory.add(MAGIC_SCROLL_ID, 1);
            player.message('This story is to be continued');
            break;
        case -1: {
            if (
                player.bank.has(MAGIC_SCROLL_ID) ||
                player.inventory.has(MAGIC_SCROLL_ID) ||
                player.cache.ardougne_scroll
            ) {
                await n.say('Ah hello again', 'And thank you again');
                await player.say('No problem');
            } else {
                const noScroll = await player.ask(
                    [
                        'Do you have any more of those scrolls?',
                        'no problem'
                    ],
                    false
                );
                if (noScroll === 0) {
                    await player.say(
                        'Do you have any more of those scrolls?'
                    );
                    await n.say('yes here you go');
                    player.inventory.add(MAGIC_SCROLL_ID, 1);
                } else {
                    await player.say('No problem');
                }
            }
            break;
        }
    }
}

// shared edmond acceptance branch (stage 0 -> 1)
async function edmondStartQuest(player, n) {
    await player.say('can i help find her?');
    await n.say(
        'really, would you?',
        "I've been working on a plan to get over the wall",
        "but I'm too old and tired to carry it through",
        "if you're going over the first thing you'll need is protection from the plague",
        'My wife made a special gasmask  for elena',
        'with dwellberries rubbed into it',
        'Dwellberries help repel the virus',
        'We need some more though'
    );
    await player.say('Where can I find these Dwellberries?');
    await n.say(
        "the only place i know is mcgrubor's wood to the north"
    );
    await player.say("ok I'll go get some");
    player.questStages.plagueCity = 1;
}

// talk dispatch
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!TALK_NPC_IDS.includes(npc.id)) {
        return false;
    }

    player.engage(npc);

    if (npc.id === ELENA_ID) {
        await elenaDialogue(player, npc);
    } else if (npc.id === BRAVEK_ID) {
        await bravekDialogue(player, npc);
    } else if (npc.id === CLERK_ID) {
        await clerkDialogue(player, npc);
    } else if (npc.id === BILLY_REHNISON_ID) {
        player.message('Billy is not interested in talking');
    } else if (npc.id === MILLI_REHNISON_ID) {
        await milliDialogue(player, npc);
    } else if (npc.id === TED_REHNISON_ID || npc.id === MARTHA_REHNISON_ID) {
        await tedMarthaDialogue(player, npc);
    } else if (npc.id === JETHICK_ID) {
        await jethickDialogue(player, npc);
    } else if (npc.id === ALRENA_ID) {
        await alrenaDialogue(player, npc);
    } else if (npc.id === EDMOND_ID) {
        await edmondDialogue(player, npc);
    }

    player.disengage();
    return true;
}

// useloc: dug-up soil (447), sewer pipe grill (449), locked gate (457)
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = getStage(player);

    if (gameObject.id === DUG_UP_SOIL_ID) {
        if (item.id === BUCKET_OF_WATER_ID) {
            if (stage === 2) {
                let buckets = player.cache.soil_buckets || 0;
                if (buckets >= 3) {
                    // triggers on the fourth bucket
                    player.message('@que@you poor the water onto the soil');
                    await player.world.sleepTicks(3);
                    player.message('@que@the soil softens slightly');
                    await player.world.sleepTicks(3);
                    player.message('@que@the soil is soft enough to dig into');
                    await player.world.sleepTicks(3);
                    if (!player.cache.soil_soften) {
                        player.cache.soil_soften = true;
                    }
                } else {
                    player.message('@que@you poor the water onto the soil');
                    await player.world.sleepTicks(3);
                    player.message('@que@the soil softens slightly');
                    await player.world.sleepTicks(3);
                }
                player.inventory.remove(BUCKET_OF_WATER_ID);
                player.inventory.add(BUCKET_ID);
                buckets++;
                player.cache.soil_buckets = buckets;
            } else {
                player.message('You see no reason to do that at the moment');
            }
            return true;
        }

        if (item.id === SPADE_ID) {
            if (player.cache.soil_soften || stage >= 3 || stage === -1) {
                player.message('@que@you dig deep into the soft soil');
                await player.world.sleepTicks(3);
                player.message('@que@Suddenly it crumbles away');
                await player.world.sleepTicks(3);
                player.message('@que@you fall through');
                await player.world.sleepTicks(3);
                player.message('@que@and land in the sewer');
                await player.world.sleepTicks(3);
                player.teleport(621, 3414, false);
                player.message('Edmond follows you down the hole');
                if (player.cache.soil_soften) {
                    delete player.cache.soil_soften;
                }
                if (getStage(player) === 2) {
                    player.questStages.plagueCity = 3;
                }
            } else {
                player.message('@que@you dig the soil');
                await player.world.sleepTicks(3);
                player.message('@que@The ground is rather hard');
                await player.world.sleepTicks(3);
            }
            return true;
        }

        return false;
    }

    if (gameObject.id === SEWER_PIPE_ID) {
        if (item.id === ROPE_ID) {
            if (stage >= 4 || stage === -1) {
                player.message('nothing interesting happens');
                return true;
            }
            player.message(
                "you tie one end of the rope to the sewer pipe's grill"
            );
            player.message('and hold the other end in your hand');
            if (stage === 3) {
                player.questStages.plagueCity = 4;
            }
            return true;
        }
        return false;
    }

    if (gameObject.id === GATE_ID && item.id === LITTLE_KEY_ID) {
        player.message('you go through the gate');
        await openElenaGate(player, gameObject);
        return true;
    }

    return false;
}

// elena-house gate: open then restore
async function openElenaGate(player, gameObject) {
    const { world } = player;
    const openGate = world.replaceEntity('gameObjects', gameObject, GATE_OPEN_ID);
    world.setTickTimeout(() => {
        world.replaceEntity('gameObjects', openGate, GATE_ID);
    }, 3);
}

// oploc: cupboard, pile of mud, sewer pipe, barrel, gate

// command "open" on the closed cupboard (451)
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = getStage(player);

    // cupboard closed -> open
    if (gameObject.id === CUPBOARD_CLOSED_ID) {
        const { world } = player;
        world.replaceEntity('gameObjects', gameObject, CUPBOARD_OPEN_ID);
        return true;
    }

    // cupboard open -> "Search" (command one on the open cupboard)
    if (gameObject.id === CUPBOARD_OPEN_ID) {
        if (stage >= 2 || stage === -1) {
            if (!player.inventory.has(GASMASK_ID)) {
                player.message('you find a protective mask');
                player.inventory.add(GASMASK_ID, 1);
            } else {
                player.message("it's an old dusty cupboard");
            }
        }
        return true;
    }

    // pile of mud (448) - climb up out of the sewer
    if (gameObject.id === PILE_OF_MUD_ID) {
        player.message('you climb up the mud pile');
        player.teleport(620, 578, false);
        return true;
    }

    // sewer pipe (449) - enter West Ardougne
    if (gameObject.id === SEWER_PIPE_ID) {
        // gasmask no longer needed only if plague city and biohazard are done
        if (
            stage === -1 &&
            (player.questStages.biohazard || 0) === -1
        ) {
            player.message('you climb through the sewer pipe');
            player.teleport(632, 589, false);
            return true;
        }
        if (stage >= 5 || stage === -1) {
            if (player.inventory.isEquipped(GASMASK_ID)) {
                player.message('you climb through the sewer pipe');
                player.teleport(632, 589, false);
            } else {
                player.message('You should wear your gasmask');
                player.message('Before entering west Ardougne');
            }
            return true;
        }
        player.message('the grill is too secure');
        player.message("you can't pull it off alone");
        return true;
    }

    // barrel: search finds the little key (handled in onGameObjectCommandTwo)

    // gate (457) - command "open"
    if (gameObject.id === GATE_ID) {
        return await elenaGateOpen(player, gameObject);
    }

    return false;
}

// barrel Search is command two (["WalkTo","Search"])
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = getStage(player);

    // cupboard open -> "close" (command two)
    if (gameObject.id === CUPBOARD_OPEN_ID) {
        const { world } = player;
        world.replaceEntity('gameObjects', gameObject, CUPBOARD_CLOSED_ID);
        return true;
    }

    // barrel (456) Search
    if (gameObject.id === BARREL_ID) {
        if (stage >= 11 || stage === -1) {
            player.message('the barrel is empty');
            return true;
        }
        if (!player.inventory.has(LITTLE_KEY_ID)) {
            player.message('You find a small key in the barrel');
            player.inventory.add(LITTLE_KEY_ID, 1);
        } else {
            player.message('the barrel is empty');
        }
        return true;
    }

    return false;
}

// gate (457) open handling shared by command-one
async function elenaGateOpen(player, gameObject) {
    const stage = getStage(player);
    const { world } = player;

    if (stage >= 11 || stage === -1) {
        player.message('you go through the gate');
        await openElenaGate(player, gameObject);
        return true;
    }

    if (player.y >= 3448) {
        const openGate = world.replaceEntity(
            'gameObjects',
            gameObject,
            GATE_OPEN_ID
        );
        world.setTickTimeout(() => {
            world.replaceEntity('gameObjects', openGate, GATE_ID);
        }, 3);
        player.message('you go through the gate');
        player.teleport(637, 3447, false);
        return true;
    }

    if (player.inventory.has(LITTLE_KEY_ID)) {
        player.message('The gate is locked');
        player.message('Why don\'t you use your key on the gate?');
        return true;
    }

    const elena = ifNearVisNpc(player, ELENA_ID, 10);
    if (elena) {
        player.engage(elena);
        await elena.say('Hey get me out of here please');
        await player.say("I would do but I don't have a key");
        await elena.say(
            'I think there may be one around here somewhere',
            "I'm sure I saw them stashing it somewhere"
        );
        const menu = await player.ask(
            ['Have you caught the plague?', 'Ok I will look for it'],
            true
        );
        if (menu === 0) {
            await elena.say('No, I have none of the symptoms');
            await player.say(
                'Strange I was told this house was plague infected'
            );
            await elena.say(
                'I suppose that was a cover up by the kidnappers'
            );
        } else if (menu === 1) {
            // Nothing
        }
        player.disengage();
    } else {
        player.message('Elena is currently busy');
    }

    return true;
}

// wall-object doors: door 122 -> stage 6, door 123 -> stage 8
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = wallObject.id;

    // rehnison family door: return jethick's book -> stage 6
    if (id === DOOR_REHNISON_FAMILY_ID) {
        const stage = getStage(player);

        if (stage >= 6 || stage === -1) {
            await player.enterDoor(wallObject);
            player.message('You go through the door');
            return true;
        }

        const ted = ifNearVisNpc(player, TED_REHNISON_ID, 8);
        if (ted) {
            player.engage(ted);
            player.message("The door won't open");
            await ted.say("Go away we don't want any");
            if (player.y >= 569) {
                if (player.inventory.has(PLAGUE_CITY_BOOK_ID)) {
                    player.inventory.remove(PLAGUE_CITY_BOOK_ID);
                    await player.say('I have come to return a book from Jethick');
                    await ted.say('Ok I guess you can come in then');
                    await player.enterDoor(wallObject);
                    player.questStages.plagueCity = 6;
                }
            }
            player.disengage();
        }
        return true;
    }

    // infected plague house door, guarded by the mourner; stage 7 -> 8
    if (id === DOOR_INFECTED_CAPTURED_ELENA_ID) {
        const stage = getStage(player);
        const mourner = ifNearVisNpc(player, MOURNER_WESTARDOUGNE_ID, 8);

        if (stage === 11 || stage === -1) {
            await player.enterDoor(wallObject);
            return true;
        }

        if (player.y <= 605 || player.y >= 612) {
            player.message("The door won't open");
            player.message('You notice a black cross on the door');
            if (mourner) {
                player.engage(mourner);
                await mourner.say(
                    "I'd stand away from there",
                    'That black cross means that house has been touched by the plague'
                );
                if (player.inventory.has(WARRANT_ID)) {
                    await player.say('I have a warrant from Bravek to enter here');
                    await mourner.say(
                        'this is highly irregular',
                        'Please wait while I speak to the head mourner'
                    );
                    player.message(
                        "You wait until the mourner's back is turned and sneak into the building"
                    );
                    await player.enterDoor(wallObject);
                    player.disengage();
                    return true;
                }
                if (stage === 7) {
                    const menu = await player.ask(
                        [
                            'but I think a kidnap victim is in here',
                            'I fear not a mere plague',
                            'thanks for the warning'
                        ],
                        false
                    );
                    if (menu === 0) {
                        await player.say('But I think a kidnap victim is in here');
                        await mourner.say(
                            'Sounds unlikely',
                            "Even kidnappers wouldn't go in there",
                            'even if someone is in there',
                            "They're probably dead by now"
                        );
                        const menu2 = await player.ask(
                            ['Good point', 'I want to check anyway'],
                            true
                        );
                        if (menu2 === 0) {
                            // no action
                        } else if (menu2 === 1) {
                            await mourner.say(
                                "You don't have clearance to go in there"
                            );
                            await player.say('How do I get clearance?');
                            await mourner.say(
                                "Well you'd need to apply to the head mourner",
                                'Or I suppose Bravek the city warder',
                                "I wouldn't get your hopes up though"
                            );
                            player.questStages.plagueCity = 8;
                        }
                    } else if (menu === 1) {
                        await player.say('I fear not a mere plague');
                        await mourner.say(
                            "that's irrelevant",
                            "You don't have clearance to go in there"
                        );
                        await player.say('How do I get clearance?');
                        await mourner.say(
                            "Well you'd need to apply to the head mourner",
                            'Or I suppose Bravek the city warder',
                            "I wouldn't get your hopes up though"
                        );
                        player.questStages.plagueCity = 8;
                    } else if (menu === 2) {
                        await player.say('thanks for the warning');
                    }
                }
                player.disengage();
            }
        } else {
            await player.enterDoor(wallObject);
        }
        return true;
    }

    return false;
}

module.exports = {
    onTalkToNPC,
    onUseWithGameObject,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne
};
