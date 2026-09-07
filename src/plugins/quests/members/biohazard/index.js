// biohazard (members).
//
// questStages.biohazard:
//    0   not started (talk to Elena to begin)
//    1   accepted, speak to Jerico to cross the wall
//    2   Jerico arranged Omart/Kilron; distract the watch tower (bird feed)
//    3   watch tower distracted; cross via Omart's rope ladder
//    4   crossed the wall (west side); recover the distillator
//    5   distillator recovered (rotten-apple diversion used)
//    6   distillator returned to Elena; carrying sample + 3 vials, get touch paper
//    7   have touch paper; smuggle vials via errand boys, see Guidor
//    8   Guidor proved there is no plague; report to Elena
//    9   Elena sent you to King Lathas
//   -1   complete (King Lathas dialogue also starts Underground Pass)
//
// cache keys: bird_feed, rotten_apples, vial_hops/wrong_vial_hops,
//   vial_chancy/wrong_vial_chancy, vial_vinci/wrong_vial_vinci

const { questsEnabled } = require('../../custom-gate.js');
const {
    ELENA_HOUSE_ID,
    OMART_ID,
    JERICO_ID,
    KILRON_ID,
    NURSE_SARAH_ID,
    CHEMIST_ID,
    CHANCY_ID,
    HOPS_ID,
    DEVINCI_ID,
    CHANCY_BAR_ID,
    HOPS_BAR_ID,
    DEVINCI_BAR_ID,
    GUIDORS_WIFE_ID,
    GUIDOR_ID,
    KING_LATHAS_ID,
    MOURNER_WATCHTOWER_ID,
    MOURNER_ILL_ID,
    DISTILLATOR_ID,
    LIQUID_HONEY_ID,
    ETHENEA_ID,
    SULPHURIC_BROLINE_ID,
    PLAGUE_SAMPLE_ID,
    TOUCH_PAPER_ID,
    BIRD_FEED_ID,
    MESSENGER_PIGEONS_ID,
    PIGEON_CAGE_ID,
    DOCTORS_GOWN_ID,
    ROTTEN_APPLES_ID,
    BIOHAZARD_BRONZE_KEY_ID,
    PRIEST_ROBE_ID,
    PRIEST_GOWN_ID,
    KING_LATHAS_AMULET_ID,
    ELENAS_DOOR_ID,
    JERICOS_CUPBOARD_ONE_OPEN,
    JERICOS_CUPBOARD_ONE_CLOSED,
    JERICOS_CUPBOARD_TWO_OPEN,
    JERICOS_CUPBOARD_TWO_CLOSED,
    WATCH_TOWER_ID,
    VISUAL_ROPELADDER_ID,
    COOKING_POT_ID,
    NURSE_SARAHS_CUPBOARD_OPEN,
    NURSE_SARAHS_CUPBOARD_CLOSED,
    GET_INTO_CRATES_GATE_ID,
    GATE_OPEN_ID,
    DISTILLATOR_CRATE_ID,
    OTHER_CRATE_ID,
    QUEST_POINTS,
    THIEVING_BASE_XP,
    THIEVING_VAR_XP
} = require('./ids.js');

// underground pass is not implemented; the King Lathas branch that starts it
// keeps to biohazard-completion behaviour
function getStage(player) {
    return player.questStages.biohazard || 0;
}

// inclusive on all sides
function inBounds(player, x1, y1, x2, y2) {
    return player.x >= x1 && player.x <= x2 && player.y >= y1 && player.y <= y2;
}

// nearest visible NPC of id within range
function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

function getUndergroundPassStage(player) {
    return typeof player.questStages.undergroundPass === 'number'
        ? player.questStages.undergroundPass
        : 0;
}

// reward: 3 quest points + thieving XP
function handleReward(player) {
    player.addQuestPoints(QUEST_POINTS);
    player.message('@gre@You haved gained 3 quest points!');
    player.addExperience(
        'thieving',
        player.skills.thieving.base * THIEVING_VAR_XP + THIEVING_BASE_XP,
        false
    );
    player.message('you have completed the biohazard quest');
}

// ELENA (in her house)
async function elenaDialogue(player, npc) {
    const { world } = player;

    switch (getStage(player)) {
        case 0:
            await player.say('good to see you, elena');
            await npc.say(
                'you too, thanks for freeing me',
                "it's just a shame the mourners confiscated my equipment"
            );
            await player.say('what did they take?');
            await npc.say(
                "my distillator, I can't test any plague samples without it",
                "they're holding it in the mourner quarters in west ardounge",
                'i must somehow retrieve that distillator',
                'if i am to find a cure for this awful affliction'
            );
            {
                const menu = await player.ask(
                    ["i'll try to retrieve it for you", 'well, good luck'],
                    true
                );

                if (menu === 0) {
                    // START BIOHAZARD QUEST
                    await npc.say(
                        'i was hoping you would say that',
                        'unfortunately they discovered the tunnel and filled it in',
                        'we need another way over the wall'
                    );
                    await player.say('any ideas?');
                    await npc.say(
                        "my father's friend jerico is in communication with west ardounge",
                        'he might be able to help',
                        'he lives next to the chapel'
                    );
                    player.questStages.biohazard = 1;
                } else if (menu === 1) {
                    await npc.say('thanks traveller');
                }
            }
            break;
        case 1:
            await player.say('hello elena');
            await npc.say(
                'hello brave adventurer',
                'any luck finding the distillator'
            );
            await player.say("no i'm afraid not");
            await npc.say(
                'speak to jerico, he will help you to cross the wall',
                'he lives next to the chapel'
            );
            break;
        case 2:
            await player.say("hello elena, i've spoken to jerico");
            await npc.say('was he able to help?');
            await player.say(
                'he has two friends who will help me cross the wall',
                'but first i need to distract the watch tower'
            );
            await npc.say('hmmm, could be tricky');
            break;
        case 3:
            await player.say(
                "elena i've distracted the guards at the watch tower"
            );
            await npc.say(
                'yes, i saw',
                "quickly meet with jerico's friends and cross the wall",
                'before the pigeons fly off'
            );
            break;
        case 4:
            await player.say('hello again');
            await npc.say("you're back, did you find the distillator?");
            await player.say("i'm afraid not");
            await npc.say(
                "i can't test the samples without the distillator",
                "please don't give up until you find it"
            );
            break;
        case 5:
            await npc.say(
                'so, have you managed to retrieve my distillator?'
            );
            if (player.inventory.has(DISTILLATOR_ID)) {
                await npc.say(
                    "You have - that's great!",
                    'Now can you pass me those refraction agents please?'
                );
                player.message(
                    '@que@You hand Elena the distillator and an assortment of vials'
                );
                await world.sleepTicks(3);
                player.inventory.remove(DISTILLATOR_ID);
                await player.say('These look pretty fancy');
                await npc.say(
                    "Well, yes and no. The liquid honey isn't worth so much",
                    'But the others are- especially this colourless ethenea',
                    "And be careful with the sulphuric broline- it's highly poisonous"
                );
                await player.say("You're not kidding- I can smell it from here");
                player.message('@que@Elena puts the agents through the distillator');
                await world.sleepTicks(3);
                await npc.say(
                    "I don't understand...the touch paper hasn't changed colour at all",
                    "You'll need to go and see my old mentor Guidor. He lives in Varrock",
                    'Take these vials and this sample to him'
                );
                player.message(
                    '@que@elena gives you three vials and a sample in a tin container'
                );
                await world.sleepTicks(3);
                player.inventory.add(LIQUID_HONEY_ID, 1);
                player.inventory.add(ETHENEA_ID, 1);
                player.inventory.add(SULPHURIC_BROLINE_ID, 1);
                player.inventory.add(PLAGUE_SAMPLE_ID, 1);
                await npc.say(
                    "But first you'll need some more touch-paper. Go and see the chemist in Rimmington",
                    "Just don't get into any fights, and be careful who you speak to",
                    "Those vials are fragile, and plague carriers don't tend to be too popular"
                );
                player.questStages.biohazard = 6;
            } else {
                await player.say("i'm afraid not");
                await npc.say(
                    "Oh, you haven't",
                    'People may be dying even as we speak'
                );
            }
            break;
        case 6:
        case 7:
            await npc.say('what are you doing back here');
            {
                const menu6 = await player.ask(
                    [
                        'I just find it hard to say goodbye sometimes',
                        "I'm afraid I've lost some of the stuff that you gave me...",
                        "i've forgotten what i need to do"
                    ],
                    false
                );

                if (menu6 === 0) {
                    await player.say(
                        'I just find it hard to say goodbye sometimes'
                    );
                    await npc.say(
                        'Yes...I have feelings for you too...',
                        'Now get to work!'
                    );
                } else if (menu6 === 1) {
                    await player.say(
                        "I'm afraid I've you lost some of the stuff that you gave me"
                    );
                    await npc.say("That's alright, I've got plenty");
                    player.message('@que@Elena replaces your items');
                    await world.sleepTicks(3);
                    // remove then re-add one of each, netting one each
                    player.inventory.remove(LIQUID_HONEY_ID);
                    player.inventory.add(LIQUID_HONEY_ID, 1);
                    player.inventory.remove(ETHENEA_ID);
                    player.inventory.add(ETHENEA_ID, 1);
                    player.inventory.remove(SULPHURIC_BROLINE_ID);
                    player.inventory.add(SULPHURIC_BROLINE_ID, 1);
                    player.inventory.remove(PLAGUE_SAMPLE_ID);
                    player.inventory.add(PLAGUE_SAMPLE_ID, 1);
                    await npc.say(
                        'OK so that\'s the colourless ethenea...',
                        'Some highly toxic sulphuric broline...',
                        'And some bog-standard liquid honey...'
                    );
                    await player.say("Great. I'll be on my way");
                } else if (menu6 === 2) {
                    await player.say("i've forgotten what i need to do");
                    await npc.say(
                        'go to rimmington and get some touch paper from the chemist',
                        'use his errand boys to smuggle the vials into varrock',
                        'then go to varrock and take the sample to guidor, my old mentor'
                    );
                    await player.say("ok, i'll get to it");
                }
            }
            break;
        case 8:
            await npc.say('You\'re back! So what did Guidor say?');
            await player.say('Nothing');
            await npc.say('What?');
            await player.say('He said that there is no plague');
            await npc.say('So what, this thing has all been a big hoax?');
            await player.say("Or maybe we're about to uncover something huge");
            await npc.say(
                'Then I think this thing may be bigger than both of us'
            );
            await player.say('What do you mean?');
            await npc.say(
                'I mean that you need to go right to the top',
                'You need to see the King of east Ardougne'
            );
            player.questStages.biohazard = 9;
            break;
        case 9:
            await player.say('hello elena');
            await npc.say('you must go to king lathas immediately');
            break;
        case -1:
            await player.say('hello elena');
            await npc.say('hey, how are you?');
            await player.say('good thanks, yourself?');
            await npc.say(
                'not bad, let me know when you hear from king lathas again'
            );
            await player.say('will do');
            break;
    }
}

// OMART
async function omartDialogue(player, npc) {
    switch (getStage(player)) {
        case 0:
        case 1:
            await player.say('hello there');
            await npc.say('hello');
            await player.say('how are you?');
            await npc.say('fine thanks');
            break;
        case 2:
            await player.say(
                'omart, jerico said you might be able to help me'
            );
            await npc.say(
                'he informed me of your problem traveller',
                'i would be glad to help, i have a rope ladder',
                'and my associate, kilron, is waiting on the other side'
            );
            await player.say('good stuff');
            await npc.say(
                "unfortunately we can't risk it with the watch tower so close",
                'so first we need to distract the guards in the tower'
            );
            await player.say('how?');
            await npc.say(
                "try asking jerico, if he's not too busy with his pigeons",
                "I'll be waiting here for you"
            );
            break;
        case 3:
            await npc.say(
                'well done, the guards are having real trouble with those birds',
                "you must go now traveller, it's your only chance"
            );
            player.message('@que@Omart calls to his associate');
            await player.world.sleepTicks(3);
            await npc.say('Kilron!');
            player.message('@que@he throws one end of the rope ladder over the wall');
            await player.world.sleepTicks(3);
            await npc.say('go now traveller');
            {
                const menu = await player.ask(
                    ['ok lets do it', "I'll be back soon"],
                    true
                );

                if (menu === 0) {
                    await ropeLadderInFunction(player);
                    player.questStages.biohazard = 4;
                } else if (menu === 1) {
                    await npc.say(
                        "don't take long",
                        'the mourners will soon be rid of those birds'
                    );
                }
            }
            break;
        case 4:
        case 5:
            await player.say('hello omart');
            await npc.say(
                'hello traveller',
                'the guards are still distracted if you wish to cross the wall'
            );
            {
                const overAgain = await player.ask(
                    ['ok lets do it', "i'll be back soon"],
                    false
                );

                if (overAgain === 0) {
                    await player.say('ok lets do it');
                    await ropeLadderInFunction(player);
                } else if (overAgain === 1) {
                    await player.say("I'll be back soon");
                    await npc.say(
                        "don't take long",
                        'the mourners will soon be rid of those birds'
                    );
                }
            }
            break;
        case 6:
        case 7:
        case 8:
        case 9:
        case -1:
            await player.say('hello omart');
            await npc.say(
                'hello adventurer',
                "i'm afraid it's too risky to use the ladder again",
                "but I believe that edmond's working on another tunnel"
            );
            break;
    }
}

// JERICO
async function jericoDialogue(player, npc) {
    switch (getStage(player)) {
        case 0:
            await player.say('hello');
            await npc.say('can i help you?');
            await player.say('just passing by');
            break;
        case 1:
            await player.say('hello jerico');
            await npc.say(
                "hello, i've been expecting you",
                'elena tells me you need to cross the wall'
            );
            await player.say("that's right");
            await npc.say(
                'my messenger pigeons help me communicate with friends over the wall',
                'i have arranged for two friends to aid you with a rope ladder',
                'omart is waiting for you at the southend of the wall',
                'be careful, if the mourners catch you the punishment will be severe'
            );
            await player.say('thanks jerico');
            player.questStages.biohazard = 2;
            break;
        case 2:
            await player.say('hello jerico');
            await npc.say(
                'hello again',
                "you'll need someway to distract the watch tower",
                "otherwise you'll be caught for sure"
            );
            await player.say('any ideas?');
            await npc.say(
                'sorry, try asking omart',
                'i really must get back to feeding the messenger birds'
            );
            break;
        case 3:
            await player.say('hello there');
            await npc.say(
                'the guards are distracted by the birds',
                'you must go now',
                'quickly traveller'
            );
            break;
        case 4:
            await player.say('hello again jerico');
            await npc.say(
                "so you've returned traveller",
                'did you get what you wanted'
            );
            await player.say('not yet');
            await npc.say(
                'omart will be waiting by the wall',
                'In case you need to cross again'
            );
            break;
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case -1:
            player.message('jerico is busy looking for his bird feed');
            break;
    }
}

// KILRON
async function kilronDialogue(player, npc) {
    switch (getStage(player)) {
        case 0:
        case 1:
        case 2:
        case 3:
            await player.say('hello there');
            await npc.say('hello');
            await player.say('how are you?');
            await npc.say('busy');
            break;
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case -1:
            await player.say('hello kilron');
            await npc.say('hello traveller', 'do you need to go back over?');
            {
                const menu = await player.ask(
                    ['not yet kilron', 'yes i do'],
                    true
                );

                if (menu === 0) {
                    await npc.say('okay, just give me the word');
                } else if (menu === 1) {
                    await npc.say('okay, quickly now');
                    await ropeLadderBackFunction(player);
                }
            }
            break;
    }
}

// NURSE SARAH
async function nurseSarahDialogue(player, npc) {
    const stage = getStage(player);

    if (stage === 4 || stage === 5) {
        if (player.cache.rotten_apples) {
            await player.say('hello nurse');
            await npc.say('oh hello there');
            await npc.say(
                "im afraid i can't stop and talk",
                'a group of mourners have became ill with food poisoning',
                'i need to go over and see what i can do'
            );
            await player.say('hmmm, strange that!');
        } else {
            await player.say('hello nurse');
            await npc.say("i don't know how much longer i can cope here");
            await player.say('what? is the plague getting to you?');
            await npc.say(
                "no, strangely enough the people here don't seem to be affected",
                "it's just the awful living conditions that are making people ill"
            );
            await player.say(
                'i was under the impression that every one here was affected'
            );
            await npc.say("me too, but it doesn't seem to be the case");
        }
    } else {
        player.message("nurse sarah doesn't feel like talking");
    }
}

// HOPS (Rimmington errand boy)
async function hopsDialogue(player, npc) {
    if (getStage(player) === 7) {
        if (player.cache.vial_hops || player.cache.wrong_vial_hops) {
            await npc.say(
                "I suppose I'd better get going",
                "I'll meet you at the The dancing donkey inn"
            );
            return;
        }
        await player.say("Hi,I've got something for you to take to Varrock");
        await npc.say('Sounds like pretty thirsty work');
        await player.say(
            "Well, there's a pub in Varrock if you're desperate"
        );
        await npc.say(
            "Don't worry, I'm a pretty resourceful fellow you know"
        );
        const menu = await player.ask(
            [
                'You give him the vial of ethenea',
                'You give him the vial of liquid honey',
                'You give him the vial of sulphuric broline'
            ],
            false
        );

        if (menu === 0) {
            if (player.inventory.has(ETHENEA_ID)) {
                if (!player.cache.wrong_vial_hops) {
                    player.cache.wrong_vial_hops = true;
                    player.inventory.remove(ETHENEA_ID);
                    player.message('You give him the vial of ethenea');
                    await player.say("OK. I'll see you in Varrock");
                    await npc.say(
                        "Sure. I'm a regular at the The dancing donkey inn as it happens"
                    );
                }
            } else {
                player.message('You have no ethenea to give');
            }
        } else if (menu === 1) {
            if (player.inventory.has(LIQUID_HONEY_ID)) {
                if (!player.cache.wrong_vial_hops) {
                    player.cache.wrong_vial_hops = true;
                    player.inventory.remove(LIQUID_HONEY_ID);
                    player.message('You give him the vial of liquid honey');
                    await player.say("OK. I'll see you in Varrock");
                    await npc.say(
                        "Sure. I'm a regular at the The dancing donkey inn as it happens"
                    );
                }
            } else {
                player.message('You have no liquid honey to give');
            }
        } else if (menu === 2) {
            if (player.inventory.has(SULPHURIC_BROLINE_ID)) {
                if (!player.cache.vial_hops) {
                    player.cache.vial_hops = true;
                    player.inventory.remove(SULPHURIC_BROLINE_ID);
                    player.message('You give him the vial of sulphuric broline');
                    await player.say("OK. I'll see you in Varrock");
                    await npc.say(
                        "Sure. I'm a regular at the The dancing donkey inn as it happens"
                    );
                }
            } else {
                player.message('You have no sulphuric broline to give');
            }
        }
    } else {
        player.message('He is not in a fit state to talk');
    }
}

// CHANCY (Rimmington errand boy)
async function chancyDialogue(player, npc) {
    const { world } = player;

    if (getStage(player) === 7) {
        if (player.cache.vial_chancy || player.cache.wrong_vial_chancy) {
            await npc.say(
                "look, I've got your vial, but I'm not taking two",
                'I always like to play the percentages'
            );
            return;
        }
        await player.say('Hello, I\'ve got a vial for you to take to Varrock');
        await npc.say(
            'Tssch... that chemist asks a lot for the wages he pays'
        );
        await player.say('Maybe you should ask him for more money');
        await npc.say('Nah...I just use my initiative here and there');
        const menu = await player.ask(
            [
                'You give him the vial of ethenea',
                'You give him the vial of liquid honey',
                'You give him the vial of sulphuric broline'
            ],
            false
        );

        if (menu === 0) {
            if (player.inventory.has(ETHENEA_ID)) {
                if (!player.cache.wrong_vial_chancy) {
                    player.cache.wrong_vial_chancy = true;
                    player.inventory.remove(ETHENEA_ID);
                    player.message('You give him the vial of ethenea');
                    await world.sleepTicks(3);
                    await player.say(
                        "Right. I'll see you later in the dancing donkey inn"
                    );
                    await npc.say('Be lucky');
                }
            } else {
                player.message("You can't give him what you don't have");
            }
        } else if (menu === 1) {
            if (player.inventory.has(LIQUID_HONEY_ID)) {
                if (!player.cache.vial_chancy) {
                    player.cache.vial_chancy = true;
                    player.inventory.remove(LIQUID_HONEY_ID);
                    player.message('You give him the vial of liquid honey');
                    await world.sleepTicks(3);
                    await player.say(
                        "Right. I'll see you later in the dancing donkey inn"
                    );
                    await npc.say('Be lucky');
                }
            } else {
                player.message("You can't give him what you don't have");
            }
        } else if (menu === 2) {
            if (player.inventory.has(SULPHURIC_BROLINE_ID)) {
                if (!player.cache.wrong_vial_chancy) {
                    player.cache.wrong_vial_chancy = true;
                    player.inventory.remove(SULPHURIC_BROLINE_ID);
                    player.message('You give him the vial of sulphuric broline');
                    await world.sleepTicks(3);
                    await player.say(
                        "Right.I'll see you later in the dancing donkey inn"
                    );
                    await npc.say('Be lucky');
                }
            } else {
                player.message("You can't give him what you don't have");
            }
        }
    } else {
        player.message("Chancy doesn't feel like talking");
    }
}

// DEVINCI (Rimmington errand boy)
async function devinciDialogue(player, npc) {
    const { world } = player;

    if (getStage(player) === 7) {
        if (player.cache.vial_vinci || player.cache.wrong_vial_vinci) {
            await npc.say(
                "Oh, it's you again",
                "Please don't distract me now, I'm contemplating the sublime"
            );
            return;
        }
        await player.say("Hello.i hear you're an errand boy for the chemist");
        await npc.say(
            "Well that's my day job yes",
            "But I don't necessarily define my identity in such black and white terms"
        );
        await player.say(
            'Good for you',
            'Now can you take a vial to Varrock for me?'
        );
        await npc.say('Go on then');
        const menu = await player.ask(
            [
                'You give him the vial of ethenea',
                'You give him the vial of liquid honey',
                'You give him the vial of sulphuric broline'
            ],
            false
        );

        if (menu === 0) {
            if (player.inventory.has(ETHENEA_ID)) {
                if (!player.cache.vial_vinci) {
                    player.cache.vial_vinci = true;
                    player.inventory.remove(ETHENEA_ID);
                    player.message('You give him the vial of ethenea');
                    await world.sleepTicks(3);
                    await npc.say(
                        "OK. We're meeting at the dancing donkey in Varrock right?"
                    );
                    await player.say("That's right.");
                }
            } else {
                player.message("You can't give him what you don't have");
            }
        } else if (menu === 1) {
            if (player.inventory.has(LIQUID_HONEY_ID)) {
                if (!player.cache.wrong_vial_vinci) {
                    player.cache.wrong_vial_vinci = true;
                    player.inventory.remove(LIQUID_HONEY_ID);
                    player.message('You give him the vial of liquid honey');
                    await world.sleepTicks(3);
                    await npc.say(
                        "OK. We're meeting at the dancing donkey in Varrock right?"
                    );
                    await player.say("That's right.");
                }
            } else {
                player.message("You can't give him what you don't have");
            }
        } else if (menu === 2) {
            if (player.inventory.has(SULPHURIC_BROLINE_ID)) {
                if (!player.cache.wrong_vial_vinci) {
                    player.cache.wrong_vial_vinci = true;
                    player.inventory.remove(SULPHURIC_BROLINE_ID);
                    player.message('You give him the vial of sulphuric broline');
                    await world.sleepTicks(3);
                    await npc.say(
                        "OK. We're meeting at the dancing donkey in Varrock right?"
                    );
                    await player.say("That's right.");
                }
            } else {
                player.message("You can't give him what you don't have");
            }
        }
    } else {
        player.message('Devinci does not feel sufficiently moved to talk');
    }
}

// HOPS_BAR (Varrock - Dancing Donkey Inn)
async function hopsBarDialogue(player, npc) {
    if (getStage(player) === 7) {
        if (player.cache.wrong_vial_hops) {
            await player.say('Hello. How was your journey?');
            await npc.say('Pretty thirst-inducing actually...');
            await player.say(
                "Please tell me that you haven't drunk the contents"
            );
            await npc.say(
                "Of course I can tell you that I haven't drunk the contents",
                "But I'd be lying",
                'Sorry about that me old mucker- can I get you a drink?'
            );
            await player.say("No, I think you've done enough for now");
            delete player.cache.wrong_vial_hops;
        } else if (player.cache.vial_hops) {
            await player.say('Hello. How was your journey?');
            await npc.say('Pretty thirst-inducing actually...');
            await player.say(
                "Please tell me that you haven't drunk the contents"
            );
            await npc.say(
                'Oh the gods no! What do you take me for?',
                'Besides, the smell kind of put me off ',
                "Here's your vial anyway"
            );
            player.message('He gives you the vial of sulphuric broline');
            player.inventory.add(SULPHURIC_BROLINE_ID, 1);
            await player.say("Thanks. I'll leave you to your drink now");
            delete player.cache.vial_hops;
        }
    } else {
        player.message("Hops doesn't feel like talking");
    }
}

// DEVINCI_BAR (Varrock)
async function devinciBarDialogue(player, npc) {
    const { world } = player;

    if (getStage(player) === 7) {
        if (player.cache.wrong_vial_vinci) {
            await npc.say(
                'Hello again',
                'I hope your journey was as pleasant as mine'
            );
            await player.say("Yep. Anyway, I'll take the package off you now");
            await npc.say(
                "Package? That's a funny way to describe a liquid of such exquisite beauty"
            );
            const menu = await player.ask(
                [
                    "I'm getting a bad feeling about this",
                    'Just give me the stuff now please'
                ],
                true
            );

            if (menu === 0) {
                await player.say("You do still have it don't you?");
                await npc.say(
                    'Absolutely',
                    "Its' just not stored in a vial anymore"
                );
                await player.say('What?');
                await npc.say(
                    'Instead it has been liberated',
                    'And it now gleams from the canvas of my latest epic:',
                    'The Majesty of Varrock'
                );
                await player.say(
                    "That's great",
                    "Thanks to you I'll have to walk back to East Ardougne to get another vial"
                );
                await npc.say("Well you can't put a price on art");
                delete player.cache.wrong_vial_vinci;
            } else if (menu === 1) {
                await player.say("You do still have it don't you?");
                await npc.say(
                    'Absolutely',
                    "Its' just not stored in a vial anymore"
                );
                await player.say('What?');
                await npc.say(
                    'Instead it has been liberated',
                    'And it now gleams from the canvas of my latest epic:',
                    'The Majesty of Varrock'
                );
                await player.say(
                    "That's great",
                    "Now I'll have to walk all the way back to East Ardougne to get another vial"
                );
                await npc.say("Well you can't put a price on art");
                delete player.cache.wrong_vial_vinci;
            }
        } else if (player.cache.vial_vinci) {
            await npc.say(
                'Hello again',
                'I hope your journey was as pleasant as mine'
            );
            await player.say(
                "Well, it's always sunny in Runescape, as they say"
            );
            await npc.say('OK. Here it is');
            player.message('@que@He gives you the vial of ethenea');
            await world.sleepTicks(3);
            player.inventory.add(ETHENEA_ID, 1);
            await player.say("Thanks. You've been a big help");
            delete player.cache.vial_vinci;
        }
    } else {
        player.message("devinci doesn't feel like talking");
    }
}

// CHANCY_BAR (Varrock)
async function chancyBarDialogue(player, npc) {
    if (getStage(player) === 7) {
        if (player.cache.wrong_vial_chancy) {
            await player.say('Hi.Thanks for doing that');
            await npc.say("No problem. I've got some money for you actually");
            await player.say('What do you mean?');
            await npc.say(
                'Well it turns out that that potion you gave me was quite valuable...'
            );
            await player.say('What?');
            await npc.say(
                "And I know that I probably shouldn't have sold it...",
                'But some friends and I were having a little wager- the odds were just too good'
            );
            await player.say('You sold my vial and gambled with the money?');
            await npc.say(
                'Actually, yes... but praise be to Saradomin, because I won!',
                "So all's well that ends well right?"
            );
            const menu = await player.ask(
                [
                    'No. Nothing could be further from the truth',
                    'You have no idea of what you have just done'
                ],
                true
            );

            if (menu === 0) {
                await npc.say("Well there's no pleasing some people");
                delete player.cache.wrong_vial_chancy;
            } else if (menu === 1) {
                await npc.say("Ignorance is bliss I'm afraid");
                delete player.cache.wrong_vial_chancy;
            }
        } else if (player.cache.vial_chancy) {
            await player.say('Hi.Thanks for doing that');
            await npc.say('No problem');
            player.message('He gives you the vial of liquid honey');
            player.inventory.add(LIQUID_HONEY_ID, 1);
            await npc.say(
                'Next time give me something more valuable',
                "I couldn't get anything for this on the blackmarket"
            );
            await player.say('That was the idea');
            delete player.cache.vial_chancy;
        }
    } else {
        player.message("chancy doesn't feel like talking");
    }
}

// CHEMIST (Rimmington)
async function chemistDialogue(player, npc) {
    const stage = getStage(player);

    if (stage === 7) {
        await player.say('hello again');
        await npc.say('oh hello, do you need more touch paper?');
        if (!player.inventory.has(TOUCH_PAPER_ID)) {
            await player.say('yes please');
            await npc.say('ok there you go');
            player.message('the chemist gives you some touch paper');
            player.inventory.add(TOUCH_PAPER_ID, 1);
        } else {
            await player.say('no i just wanted to say hello');
            await npc.say('oh, ok then ... hello');
            await player.say('hi');
        }
        return;
    } else if (
        player.inventory.has(PLAGUE_SAMPLE_ID) &&
        player.inventory.has(LIQUID_HONEY_ID) &&
        player.inventory.has(SULPHURIC_BROLINE_ID) &&
        player.inventory.has(ETHENEA_ID) &&
        stage === 6
    ) {
        await npc.say(
            "Sorry, I'm afraid we're just closing now, you'll have to come back another time"
        );
        const menu = await player.ask(
            [
                "This can't wait,I'm carrying a plague sample that desperately needs analysis",
                "It's OK I'm Elena's friend"
            ],
            true
        );

        if (menu === 0) {
            await npc.say(
                'You idiot! A plague sample should be confined to a lab',
                "I'm taking it off you- I'm afraid it's the only responsible thing to do"
            );
            player.message('He takes the plague sample from you');
            player.inventory.remove(PLAGUE_SAMPLE_ID);
        } else if (menu === 1) {
            await npc.say(
                "Oh, well that's different then. Must be pretty important to come all this way",
                "How's everyone doing there anyway? Wasn't there was some plague scare"
            );
            const lastMenu = await player.ask(
                [
                    'that\'s why I\'m here: I need some more touch paper for this plague sample',
                    'Who knows... I just need some touch paper for a guy called Guidor'
                ],
                true
            );

            if (lastMenu === 0) {
                await npc.say(
                    'You idiot! A plague sample should be confined to a lab',
                    "I'm taking it off you- I'm afraid it's the only responsible thing to do"
                );
                player.message('He takes the plague sample from you');
                player.inventory.remove(PLAGUE_SAMPLE_ID);
            } else if (lastMenu === 1) {
                await npc.say(
                    "Guidor? This one's on me then- the poor guy. Sorry about the interrogation",
                    "It's just that there's been rumours of a man travelling with a plague on him",
                    "They're even doing spot checks in Varrock: it's a pharmeceutical disaster"
                );
                await player.say(
                    'Oh right...so am I going to be OK carrying these three vials with me?'
                );
                await npc.say(
                    "With touch paper as well? You're asking for trouble",
                    "You'd be better using my errand boys outside- give them a vial each",
                    "They're not the most reliable people in the world",
                    "One's a painter, one's a gambler, and one's a drunk",
                    "Still, if you pay peanuts you'll get monkeys, right?",
                    'And it\'s better than entering Varrock with half a laborotory in your napsack'
                );
                await player.say(
                    'OK- thanks for your help, I know that Elena appreciates it'
                );
                await npc.say(
                    "Yes well don't stand around here gassing",
                    "You'd better hurry if you want to see Guidor",
                    "He won't be around for much longer"
                );
                player.message('He gives you the touch paper');
                player.inventory.add(TOUCH_PAPER_ID, 1);
                player.questStages.biohazard = 7;
            }
        }
    } else {
        player.message('The chemist is busy at the moment');
    }
}

// KING LATHAS (completes Biohazard; also starts Underground Pass)
async function kingLathasDialogue(player, npc) {
    const stage = getStage(player);

    // START UNDERGROUND PASS QUEST (post-Biohazard)
    if (stage === -1) {
        switch (getUndergroundPassStage(player)) {
            case 0:
            case 1:
            case 2:
                await player.say('hello king lathas');
                await npc.say('adventurer, thank saradomin for your arrival');
                await player.say(
                    'have your scouts found a way though the mountains'
                );
                await npc.say(
                    'Not quite, we found a path to where we expected..',
                    "..to find the 'well of voyage' an ancient portal to west runescape",
                    "however over the past era's a cluster of cultists",
                    'have settled there, run by a madman named iban'
                );
                await player.say('iban?');
                await npc.say(
                    'a crazy loon who claims to be the son of zamorok',
                    'go meet my main tracker koftik, he will help you',
                    'he waits for you at the west side of west ardounge',
                    'we must find a way through these caverns..',
                    'if we are to stop my brother tyras'
                );
                await player.say("i'll do my best lathas");
                await npc.say(
                    'a warning traveller the ungerground pass..',
                    'is lethal, we lost many men exploring those caverns',
                    "go preparred with food and armour or you won't last long"
                );
                if (getUndergroundPassStage(player) === 0) {
                    player.questStages.undergroundPass = 1;
                }
                break;
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                await player.say('hello king lanthas');
                await npc.say('traveller, how are you managing down there?');
                await player.say("it's a pretty nasty place but i'm ok");
                await npc.say('well keep up the good work');
                break;
            case 8:
                await npc.say('the traveller returns..any news?');
                await player.say(
                    'indeed, the quest is complete lathas',
                    'i have defeated iban and his undead minions'
                );
                await npc.say(
                    'incrediable, you are a truly awesome warrior',
                    'now we can begin to restore the well of voyage',
                    'once our mages have re-summoned the well',
                    'i will send a band of troops led by yourself',
                    'to head into west runescape and stop tryas'
                );
                await player.say('i will be ready and waiting');
                await npc.say('your loyalty is appreiciated traveller');
                // underground pass is not part of this port; mark it complete
                player.questStages.undergroundPass = -1;
                break;
            case -1:
                await player.say('hello king lathas');
                await npc.say(
                    'well hello there traveller',
                    'the mages are still ressurecting the well of voyage',
                    "but i'll have word sent to you as soon as its ready"
                );
                await player.say('ok then, take care');
                await npc.say('you too');
                break;
        }
        return;
    } else if (stage === 9) {
        await player.say(
            'I assume that you are the King of east Ardougne?'
        );
        await npc.say(
            'You assume correctly- but where do you get such impertinence?'
        );
        await player.say('I get it from finding out that the plague is a hoax');
        await npc.say("A hoax, I've never heard such a ridiculous thing...");
        await player.say('I have evidence- from Guidor in Varrock');
        await npc.say(
            'Ah... I see. Well then you are right about the plague',
            'But I did it for the good of my people'
        );
        await player.say('When is it ever good to lie to people like that?');
        await npc.say(
            'When it protects them from a far greater danger- a fear too big to fathom'
        );
        const menu = await player.ask(
            ["I don't understand...", "Well I've wasted enough of my time here"],
            true
        );

        if (menu === 0) {
            await npc.say(
                'Their King, tyras, journeyed out to the West, on a voyage of discovery',
                'But he was captured by the Dark Lord',
                'The Dark Lord agreed to spare his life, but only on one condition...',
                'That he would drink from the chalice of eternity'
            );
            await player.say('So what happened?');
            await npc.say(
                'The chalice corrupted him. He joined forces with the Dark Lord...',
                '...The embodiment of pure evil, banished all those years ago...',
                'And so I erected this wall, not just to protect my people',
                'But to protect all the people of Runescape',
                'Because now, with the King of West Ardougne...',
                '...The dark lord has an ally on the inside',
                "So I'm sorry that I lied about the plague",
                'I just hope that you can understand my reasons'
            );
            await player.say(
                'Well at least I know now. But what can we do about it?'
            );
            await npc.say(
                'Nothing at the moment',
                "I'm waiting for my scouts to come back",
                'They will tell us how we can get through the mountains',
                'When this happens, can I count on your support?'
            );
            await player.say('Absolutely');
            await npc.say(
                'Thank the gods. Let me give you this amulet',
                'Think of it as a thank you, for all that you have done',
                '...but know that one day it may turn red',
                '...Be ready for this moment',
                'And to help, I give you permission to use my training area',
                "It's located just to the north west of ardounge",
                'There you can prepare for the challenge ahead'
            );
            await player.say("OK. There's just one thing I don't understand");
            await player.say('How do you know so much about King Tyras');
            await npc.say('How could I not do?', 'He was my brother');
            player.message('king lathas gives you a magic amulet');
            player.inventory.add(KING_LATHAS_AMULET_ID, 1);
            // OpenRSC: player.sendQuestComplete(Quests.BIOHAZARD)
            player.questStages.biohazard = -1;
            handleReward(player);
        } else if (menu === 1) {
            await npc.say("No time is ever wasted- thanks for all you've done");
        }
        return;
    }

    player.message('the king is too busy to talk');
}

// GUIDOR'S WIFE
async function guidorsWifeDialogue(player, npc) {
    const stage = getStage(player);

    if (stage === 9 || stage === -1) {
        await player.say('hello');
        await npc.say(
            "oh hello, i can't chat now",
            'i have to keep an eye on my husband',
            "he's very ill"
        );
        await player.say('i\'m sorry to hear that');
        return;
    }
    if (stage === 8) {
        await player.say('hello again');
        await npc.say(
            'hello there',
            'i fear guidor may not be long for this world'
        );
        return;
    }
    if (stage === 7) {
        if (
            player.inventory.isEquipped(PRIEST_ROBE_ID) &&
            player.inventory.isEquipped(PRIEST_GOWN_ID)
        ) {
            await npc.say(
                "Father, thank heavens you're here. My husband is very ill",
                'Perhaps you could go and perform his final ceremony'
            );
            await player.say("I'll see what I can do");
        } else {
            await player.say(
                "Hello, I'm a friend of Elena, here to see Guidor"
            );
            await npc.say(
                'I\'m afraid...(she sobs)... that Guidor is not long for this world',
                "So I'm not letting people see him now"
            );
            await player.say(
                "I'm really sorry to hear about Guidor...",
                'but I do have some very important business to attend to'
            );
            await npc.say(
                "You heartless rogue. What could be more important than Guidor's life?",
                '...A life spent well, if not always wisely...',
                'I just hope that Saradomin shows mercy on his soul'
            );
            await player.say('Guidor is a religious man?');
            await npc.say(
                'Oh god no. But I am',
                'if only i could get him to see a priest'
            );
        }
    }
}

// GUIDOR (Varrock; proves there is no plague)
async function guidorDialogue(player, npc) {
    const stage = getStage(player);

    if (stage === 8 || stage === 9 || stage === -1) {
        await player.say('hello again guidor');
        await npc.say(
            'well hello traveller',
            "i still can't understand why they would lie about the plague"
        );
        await player.say("it's strange, anyway how are you doing?");
        await npc.say("i'm hanging in there");
        await player.say('good for you');
        return;
    }

    await player.say(
        'Hello,you must be Guidor. I understand that you are unwell'
    );
    await npc.say(
        'Is my wife asking priests to visit me now?',
        "I'm a man of science, for god's sake!",
        'Ever since she heard rumours of a plague carrier travelling from Ardougne',
        'she\'s kept me under house arrest',
        'Of course she means well, and I am quite frail now...',
        'So what brings you here?'
    );
    const menu = await player.ask(
        [
            'I\'ve come to ask your assistance in stopping a plague that could kill thousands',
            'Oh,nothing,I was just going to bless your room and I\'ve done that now  Goodbye'
        ],
        false
    );

    if (menu === 0) {
        await player.say(
            "Well it's funny you should ask actually...",
            "I've come to ask your assistance in stopping a plague that could kill thousands"
        );
        await npc.say("So you're the plague carrier!");
        const menu2 = await player.ask(
            [
                "No! Well, yes... but not exactly. It's contained in a sealed unit from elena",
                "I've been sent by your old pupil Elena, she's trying to halt the virus"
            ],
            true
        );

        // both lead to the EXACT same dialogue
        if (menu2 === 0 || menu2 === 1) {
            await npc.say('Elena eh?');
            await player.say(
                'Yes. She wants you to analyse it',
                'You might be the only one that can help'
            );
            await npc.say("Right then. Sounds like we'd better get to work!");
            if (player.inventory.has(PLAGUE_SAMPLE_ID)) {
                await player.say('I have the plague sample');
                await npc.say(
                    "Now I'll be needing some liquid honey,some sulphuric broline,and then..."
                );
                await player.say('...some ethenea?');
                await npc.say('Indeed!');
                if (
                    player.inventory.has(ETHENEA_ID) &&
                    player.inventory.has(SULPHURIC_BROLINE_ID) &&
                    player.inventory.has(LIQUID_HONEY_ID)
                ) {
                    if (player.inventory.has(TOUCH_PAPER_ID)) {
                        player.message('You give him the vials and the touch paper');
                        player.inventory.remove(TOUCH_PAPER_ID);
                        player.inventory.remove(PLAGUE_SAMPLE_ID);
                        player.inventory.remove(ETHENEA_ID);
                        player.inventory.remove(LIQUID_HONEY_ID);
                        player.inventory.remove(SULPHURIC_BROLINE_ID);
                        await npc.say(
                            "Now I'll just apply these to the sample and...",
                            "I don't get it...the touch paper has remained the same"
                        );
                        player.questStages.biohazard = 8;
                        const menu3 = await player.ask(
                            [
                                "That's why Elena wanted you to do it- because she wasn't sure what was happening",
                                'So what does that mean exactly?'
                            ],
                            true
                        );

                        if (menu3 === 0) {
                            await npc.say(
                                "Well that's just it.Nothing has happened",
                                "I don't know what this sample is, but it certainly isn't toxic"
                            );
                            await player.say('So what about the plague?');
                            await npc.say(
                                "Don't you understand, there is no plague!",
                                "I'm very sorry, I can see that you've worked hard for this...",
                                '...but it seems that someone has been lying to you',
                                'The only question is...',
                                '...why?'
                            );
                        } else if (menu3 === 1) {
                            await player.say(
                                "That's why Elena wanted you to do it- because she wasn't sure what was happening"
                            );
                            await npc.say(
                                "Well that's just it. Nothing has happened",
                                "I don't know what this sample is, but it certainly isn't toxic"
                            );
                            await player.say('So what about the plague?');
                            await npc.say(
                                "Don't you understand, there is no plague!",
                                "I'm very sorry, I can see that you've worked hard for this...",
                                '...but it seems that someone has been lying to you',
                                'The only question is...',
                                '...why?'
                            );
                        }
                    } else {
                        await npc.say(
                            "Oh. You don't have any touch-paper",
                            "And so I won't be able to help you after all"
                        );
                    }
                } else {
                    await npc.say(
                        'Look,I need all three reagents to test the plague sample',
                        "Come back when you've got them"
                    );
                }
            } else {
                await npc.say(
                    "Seems like you don't actually HAVE the plague sample",
                    "It's a long way to come empty-handed...",
                    'And quite a long way back too'
                );
                return;
            }
        }
    } else if (menu === 1) {
        await player.say(
            "Oh, nothing, I was just going to bless your room, and I've done that now. Goodbye"
        );
    }
}

// Free player (non-members world) fallback dialogue
async function freePlayerDialogue(player, npc) {
    const id = npc.id;

    if (id === CHEMIST_ID) {
        await npc.say(
            "It's very nice that you've come",
            'all the way down here',
            "but I really don't have time to talk at the moment",
            "Maybe if you come back later I'll be able to help"
        );
    } else if (id === DEVINCI_ID || id === DEVINCI_BAR_ID) {
        await npc.say(
            'Bah!',
            'A great artist such as myself should not have to',
            'suffer the HUMILIATION of spending time where the',
            'likes of you wander everywhere!'
        );
    } else if (id === HOPS_ID || id === HOPS_BAR_ID) {
        await npc.say("Hops don't wanna talk now");
    } else if (id === CHANCY_ID || id === CHANCY_BAR_ID) {
        await player.say('Hello!', 'Playing solitaire?');
        await npc.say(
            'Hush',
            "I'm trying to perfect the art of",
            'dealing off the bottom of the deck',
            'Whatever you want',
            "come back later and I'll speak to you then"
        );
    } else if (id === GUIDORS_WIFE_ID) {
        await npc.say('Oh dear! Oh dear!', "I don't have time to chat!");
    }
}

// rope ladder helpers: teleport over (624,606) / back (622,611)
async function ropeLadderInFunction(player) {
    const { world } = player;
    player.message('@que@you climb up the rope ladder');
    await world.sleepTicks(3);
    player.teleport(624, 606);
    player.message('@que@and drop down on the other side');
    await world.sleepTicks(3);
}

async function ropeLadderBackFunction(player) {
    const { world } = player;
    player.message('@que@you climb up the rope ladder');
    await world.sleepTicks(3);
    player.teleport(622, 611);
    player.message('@que@and drop down on the other side');
    await world.sleepTicks(3);
}

// cupboard open/close helpers
function openCupboard(player, gameObject, openId) {
    player.world.replaceEntity('gameObjects', gameObject, openId);
}

function closeCupboard(player, gameObject, closedId) {
    player.world.replaceEntity('gameObjects', gameObject, closedId);
}

// Handler: talk to NPC
const TALK_HANDLERS = {
    [ELENA_HOUSE_ID]: elenaDialogue,
    [OMART_ID]: omartDialogue,
    [JERICO_ID]: jericoDialogue,
    [KILRON_ID]: kilronDialogue,
    [NURSE_SARAH_ID]: nurseSarahDialogue,
    [CHEMIST_ID]: chemistDialogue,
    [CHANCY_ID]: chancyDialogue,
    [HOPS_ID]: hopsDialogue,
    [DEVINCI_ID]: devinciDialogue,
    [KING_LATHAS_ID]: kingLathasDialogue,
    [CHANCY_BAR_ID]: chancyBarDialogue,
    [HOPS_BAR_ID]: hopsBarDialogue,
    [DEVINCI_BAR_ID]: devinciBarDialogue,
    [GUIDORS_WIFE_ID]: guidorsWifeDialogue,
    [GUIDOR_ID]: guidorDialogue
};

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const handler = TALK_HANDLERS[npc.id];

    if (!handler) {
        return false;
    }

    player.engage(npc);

    // non-members worlds route certain NPCs to freePlayerDialogue
    if (player.world && player.world.members === false) {
        await freePlayerDialogue(player, npc);
    } else {
        await handler(player, npc);
    }

    player.disengage();
    return true;
}

// handler: Elena's door (a wall object); locked unless Plague City is complete
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id !== ELENAS_DOOR_ID) {
        return false;
    }

    if (player.questStages.plagueCity === -1) {
        await player.enterDoor(wallObject);
        player.message('You go through the door');
    } else {
        player.message('the door is locked');
    }

    return true;
}

// handler: object command one
//   closed cupboards -> open; watch tower -> approach; gate -> open;
//   open cupboards -> search
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const id = gameObject.id;

    // Jerico's cupboard one (search finds nothing)
    if (id === JERICOS_CUPBOARD_ONE_CLOSED) {
        openCupboard(player, gameObject, JERICOS_CUPBOARD_ONE_OPEN);
        return true;
    }
    if (id === JERICOS_CUPBOARD_ONE_OPEN) {
        player.message('You search the cupboard, but find nothing');
        return true;
    }

    // Jerico's cupboard two (holds the pigeon/bird feed)
    if (id === JERICOS_CUPBOARD_TWO_CLOSED) {
        openCupboard(player, gameObject, JERICOS_CUPBOARD_TWO_OPEN);
        return true;
    }
    if (id === JERICOS_CUPBOARD_TWO_OPEN) {
        player.message('you search the cupboard');
        if (!player.inventory.has(BIRD_FEED_ID)) {
            player.message('and find some pigeon feed');
            player.inventory.add(BIRD_FEED_ID, 1);
        } else {
            player.message('but find nothing of interest');
        }
        return true;
    }

    // Nurse Sarah's cupboard (holds the doctor's gown)
    if (id === NURSE_SARAHS_CUPBOARD_CLOSED) {
        openCupboard(player, gameObject, NURSE_SARAHS_CUPBOARD_OPEN);
        return true;
    }
    if (id === NURSE_SARAHS_CUPBOARD_OPEN) {
        player.message('you search the cupboard');
        // always retrievable (can_retrieve_post_quest_items is on)
        if (!player.inventory.has(DOCTORS_GOWN_ID)) {
            player.message("inside you find a doctor's gown");
            player.inventory.add(DOCTORS_GOWN_ID, 1);
        } else {
            player.message('but find nothing of interest');
        }
        return true;
    }

    // Watch tower: "approach"
    if (id === WATCH_TOWER_ID) {
        const mournerGuard = ifNearVisNpc(player, MOURNER_WATCHTOWER_ID, 15);
        if (mournerGuard) {
            player.engage(mournerGuard);
            await mournerGuard.say('keep away civilian');
            await player.say("what's it to you?");
            await mournerGuard.say("the tower's here for your protection");
            player.disengage();
        }
        return true;
    }

    // gate into the crate room, only openable from the west (x <= 630)
    if (id === GET_INTO_CRATES_GATE_ID) {
        if (player.x <= 630) {
            player.message('you open the gate and pass through');
            await player.enterGate(gameObject, GATE_OPEN_ID);
        } else {
            player.message('@que@the gate is locked');
            await world.sleepTicks(3);
            player.message('you need a key');
        }
        return true;
    }

    return false;
}

// handler: object command two
//   crates -> search; open cupboards -> close
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const id = gameObject.id;

    if (id === JERICOS_CUPBOARD_ONE_OPEN) {
        closeCupboard(player, gameObject, JERICOS_CUPBOARD_ONE_CLOSED);
        return true;
    }
    if (id === JERICOS_CUPBOARD_TWO_OPEN) {
        closeCupboard(player, gameObject, JERICOS_CUPBOARD_TWO_CLOSED);
        return true;
    }
    if (id === NURSE_SARAHS_CUPBOARD_OPEN) {
        closeCupboard(player, gameObject, NURSE_SARAHS_CUPBOARD_CLOSED);
        return true;
    }

    // Distillator crate ("Search")
    if (id === DISTILLATOR_CRATE_ID) {
        player.message('@que@you search the crate');
        await world.sleepTicks(3);
        if (!player.inventory.has(DISTILLATOR_ID)) {
            player.message("@que@and find elena's distillator");
            await world.sleepTicks(3);
            player.inventory.add(DISTILLATOR_ID, 1);
            if (player.cache.rotten_apples) {
                delete player.cache.rotten_apples;
                player.questStages.biohazard = 5;
            }
        } else {
            player.message("@que@it's empty");
            await world.sleepTicks(3);
        }
        return true;
    }

    // Other crate ("Search")
    if (id === OTHER_CRATE_ID) {
        player.message('The crate is empty');
        return true;
    }

    return false;
}

// handler: use item on object
//   bird feed on watch tower; rotten apples on cooking pot; bronze key on gate
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (item.id === BIRD_FEED_ID && gameObject.id === WATCH_TOWER_ID) {
        if (getStage(player) === 2) {
            player.message('@que@you throw a hand full of seeds onto the watch tower');
            await world.sleepTicks(3);
            player.message('@que@the mourners do not seem to notice');
            await world.sleepTicks(3);
            player.inventory.remove(BIRD_FEED_ID);
            if (!player.cache.bird_feed) {
                player.cache.bird_feed = true;
            }
        } else {
            player.message('nothing interesting happens');
        }
        return true;
    }

    if (item.id === ROTTEN_APPLES_ID && gameObject.id === COOKING_POT_ID) {
        const stage = getStage(player);
        if (stage === 4 || stage === 5) {
            player.message('@que@you place the rotten apples in the pot');
            await world.sleepTicks(3);
            player.message('@que@they quickly dissolve into the stew');
            await world.sleepTicks(3);
            player.message("@que@that wasn't very nice");
            await world.sleepTicks(3);
            if (!player.cache.rotten_apples) {
                player.cache.rotten_apples = true;
            }
            player.inventory.remove(ROTTEN_APPLES_ID);
            return true;
        }
        player.message('@que@you place the rotten apples in the pot');
        await world.sleepTicks(3);
        player.message("@que@that wasn't very nice");
        await world.sleepTicks(3);
        player.inventory.remove(ROTTEN_APPLES_ID);
        return true;
    }

    if (
        item.id === BIOHAZARD_BRONZE_KEY_ID &&
        gameObject.id === GET_INTO_CRATES_GATE_ID
    ) {
        player.message('@que@the key fits the gate');
        await world.sleepTicks(3);
        player.message('you open it and pass through');
        await player.enterGate(gameObject, GATE_OPEN_ID);
        return true;
    }

    return false;
}

// handler: killing the ill mourner drops the biohazard bronze key
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== MOURNER_ILL_ID) {
        return false;
    }

    if (!player.inventory.has(BIOHAZARD_BRONZE_KEY_ID)) {
        player.message('@que@you search the mourner');
        await player.world.sleepTicks(3);
        player.inventory.add(BIOHAZARD_BRONZE_KEY_ID, 1);
        player.message('@que@and find a key');
    }

    return false;
}

// handler: releasing messenger pigeons in the release zone advances the
// watch-tower distraction from stage 2 to 3 and swaps them for an empty cage
async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id !== MESSENGER_PIGEONS_ID) {
        return false;
    }

    const { world } = player;

    player.message('you open the cage');

    if (
        (player.cache.bird_feed || getStage(player) === 3) &&
        inBounds(player, 617, 582, 622, 590)
    ) {
        player.message('the pigeons fly towards the watch tower');
        await world.sleepTicks(3);
        player.message('they begin pecking at the bird feed');
        await world.sleepTicks(3);
        player.message(
            'the mourners are frantically trying to scare the pigeons away'
        );
        await world.sleepTicks(3);
        if (getStage(player) === 2) {
            player.questStages.biohazard = 3;
        }
        if (player.cache.bird_feed) {
            delete player.cache.bird_feed;
        }
        player.inventory.remove(MESSENGER_PIGEONS_ID);
        player.inventory.add(PIGEON_CAGE_ID, 1);
    } else {
        player.message("the pigeons don't want to leave");
    }

    return true;
}

module.exports = {
    onTalkToNPC,
    onWallObjectCommandOne,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onNPCDeath,
    onInventoryCommand
};
