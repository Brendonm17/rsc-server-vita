// watchtower dialogue: wizard, skavids, ogre chieftains, guards, quest items

const { questsEnabled } = require('../../custom-gate.js');

const {
    QUEST_KEY,
    WATCHTOWER_WIZARD_ID,
    OGRE_SHAMAN_ID,
    SKAVID_IG_ID,
    SKAVID_AR_ID,
    SKAVID_CUR_ID,
    SKAVID_NOD_ID,
    SKAVID_FINALQUIZ_ID,
    SKAVID_INITIAL_ID,
    OG_ID,
    GREW_ID,
    TOBAN_ID,
    OGRE_CITIZEN_ID,
    OGRE_TRADER_FOOD_ID,
    OGRE_TRADER_ROCKCAKE_ID,
    OGRE_GUARD_CAVE_ENTRANCE_ID,
    CITY_GUARD_ID,
    OGRE_GENERAL_ID,
    FINGERNAILS_ID,
    WATCH_TOWER_EYE_PATCH_ID,
    EYE_PATCH_ID,
    GOBLIN_ARMOUR_ID,
    IRON_DAGGER_ID,
    WIZARDS_ROBE_ID,
    OGRE_RELIC_ID,
    OGRE_RELIC_PART_HEAD_ID,
    OGRE_RELIC_PART_BASE_ID,
    OGRE_RELIC_PART_BODY_ID,
    POWERING_CRYSTAL1_ID,
    POWERING_CRYSTAL2_ID,
    SPELL_SCROLL_ID,
    KEY_ID,
    STOLEN_GOLD_ID,
    OGRE_TOOTH_ID,
    DRAGON_BONES_ID,
    SKAVID_MAP_ID,
    OGRE_POTION_ID,
    MAGIC_OGRE_POTION_ID,
    spawnNpc
} = require('./ids.js');

function stage(player) {
    return player.questStages[QUEST_KEY] || 0;
}

function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// addnpc(OGRE_GENERAL, x, y, 3min) + attack. ("guards!!")
async function ogreSpawnAndAttack(player) {
    const { world } = player;
    player.disengage();
    const ogre = spawnNpc(world, OGRE_GENERAL_ID, player.x, player.y);
    await world.sleepTicks(3);
    if (ogre) {
        ogre.attack(player);
    }
}

// skavid final-quiz npc
async function talkSkavidFinalQuiz(player, npc) {
    if (player.cache.skavid_completed_language || stage(player) === -1) {
        await npc.say('What, you gots the crystal...');
        const lastMenu = await player.ask(
            ["But I've lost it!", 'Oh okay then'],
            true
        );
        if (lastMenu === 0) {
            if (player.inventory.has(POWERING_CRYSTAL2_ID) || stage(player) === -1) {
                await npc.say('I have no more for you!');
            } else {
                await npc.say('All right, take this one then...');
                player.message('The skavid gives you a crystal');
                player.inventory.add(POWERING_CRYSTAL2_ID, 1);
            }
        } else if (lastMenu === 1) {
            await npc.say("I'll be on my way then");
        }
    } else if (
        player.cache.language_cur &&
        player.cache.language_ar &&
        player.cache.language_ig &&
        player.cache.language_nod
    ) {
        const sayChat = ['Cur tanath...', 'Ar cur...', 'Bidith Ig...', 'Gor nod...'];
        const randomizeChat = random(0, sayChat.length - 1);
        await npc.say(sayChat[randomizeChat]);
        const menu = await player.ask(['Cur', 'Ar', 'Bidith', 'Tanath', 'Gor'], true);
        let correctAnswer = false;
        if (menu === 0) {
            if (randomizeChat === 2) correctAnswer = true;
        } else if (menu === 2) {
            if (randomizeChat === 0) correctAnswer = true;
        } else if (menu === 3) {
            if (randomizeChat === 3) correctAnswer = true;
        } else if (menu === 4) {
            if (randomizeChat === 1) correctAnswer = true;
        }
        if (menu !== -1) {
            if (correctAnswer) {
                await npc.say(
                    'Heh-heh! So you speak a little skavid eh?',
                    "I'm impressed, here take this prize..."
                );
                player.message('The skavid gives you a large crystal');
                player.inventory.add(POWERING_CRYSTAL2_ID, 1);
                if (
                    player.cache.language_cur &&
                    player.cache.language_ar &&
                    player.cache.language_ig &&
                    player.cache.language_nod
                ) {
                    delete player.cache.language_cur;
                    delete player.cache.language_ar;
                    delete player.cache.language_ig;
                    delete player.cache.language_nod;
                    delete player.cache.skavid_started_language;
                    player.cache.skavid_completed_language = true;
                }
            } else if (menu === 1) {
                await npc.say('Grrr!');
                player.message('It seems your response has upset the skavid');
            } else {
                await npc.say('???');
                player.message('The response was wrong');
            }
        }
    } else {
        await npc.say('Tanath Gor Ar Bidith ?');
        await player.say('???');
        player.message('You cannot communicate with the skavid');
        player.message(
            "It seems you haven't learned enough of thier language yet..."
        );
    }
}

// the four "learn a word" cave skavids (ig / ar / cur / nod)
async function talkSkavidWord(player, npc) {
    if (npc.id === SKAVID_IG_ID) {
        if (player.cache.skavid_completed_language || stage(player) === -1) {
            await npc.say('Ar cur!');
            player.message('You have already learned the skavid language');
            return;
        } else if (player.cache.language_ig) {
            await npc.say('Bidith Ig...');
            player.message('You have already talked to this skavid');
            return;
        }
        await npc.say('Cur bidith...');
    } else if (npc.id === SKAVID_AR_ID) {
        if (player.cache.skavid_completed_language || stage(player) === -1) {
            await npc.say('Ar cur!');
            player.message('You have already learned the skavid language');
            return;
        } else if (player.cache.language_ar) {
            await npc.say('Ar cur...');
            player.message('You have already talked to this skavid');
            return;
        }
        await npc.say('Gor cur...');
    } else if (npc.id === SKAVID_CUR_ID) {
        if (player.cache.skavid_completed_language || stage(player) === -1) {
            await npc.say('Ar cur!');
            player.message('You have already learned the skavid language');
            return;
        } else if (player.cache.language_cur) {
            await npc.say('Cur tanath...');
            player.message('You have already talked to this skavid');
            return;
        }
        await npc.say('Bidith tanath...');
    } else if (npc.id === SKAVID_NOD_ID) {
        if (player.cache.skavid_completed_language || stage(player) === -1) {
            await npc.say('Ar cur!');
            player.message('You have already learned the skavid language');
            return;
        } else if (player.cache.language_nod) {
            await npc.say('Gor nod...');
            player.message('You have already talked to this skavid');
            return;
        }
        await npc.say('Tanath gor...');
    }

    if (player.cache.skavid_started_language) {
        player.message('The skavid is trying to communicate...');
        let correctWord = false;
        const learnMenu = await player.ask(['Cur', 'Ar', 'Ig', 'Nod', 'Gor'], true);
        if (learnMenu === 0) {
            if (npc.id === SKAVID_CUR_ID) {
                await npc.say('Cur', 'Cur tanath');
                player.cache.language_cur = true;
                correctWord = true;
            }
        } else if (learnMenu === 1) {
            if (npc.id === SKAVID_AR_ID) {
                await npc.say('Ar', 'Ar cur');
                player.cache.language_ar = true;
                correctWord = true;
            }
        } else if (learnMenu === 2) {
            if (npc.id === SKAVID_IG_ID) {
                await npc.say('Ig', 'Bidith Ig');
                player.cache.language_ig = true;
                correctWord = true;
            }
        } else if (learnMenu === 3) {
            if (npc.id === SKAVID_NOD_ID) {
                await npc.say('Nod', 'Gor nod');
                player.cache.language_nod = true;
                correctWord = true;
            }
        }

        if (learnMenu !== -1) {
            if (correctWord) {
                player.message('It seems the skavid understood you');
            } else {
                await npc.say('???');
                player.message('It seems that was the wrong reply');
                await player.world.sleepTicks(3);
            }
        }
    } else {
        await player.say('???');
        player.message('The skavid is trying to communicate...');
        player.message("You don't know any skavid words yet!");
    }
}

// frightened initial skavid, starts language quest (stage 5)
async function talkSkavidInitial(player, npc) {
    if (stage(player) === -1) {
        await npc.say('Ah master...', 'You did well to master our language...');
        return;
    }
    if (
        (player.cache.language_cur &&
            player.cache.language_ar &&
            player.cache.language_ig &&
            player.cache.language_nod) ||
        player.cache.skavid_completed_language
    ) {
        await npc.say(
            'Master, my kinsmen tell me you have learned skavid',
            'You should speak to the mad ones in their cave...'
        );
        return;
    } else if (player.cache.skavid_started_language) {
        await npc.say('Master, how are you doing learning our language ?');
        await player.say('I am studying the speech of your kind...');
    } else {
        await npc.say('Tanath cur, tanath cur');
        await player.say('???');
        await npc.say("Don't hurt me, don't hurt me!");
        await player.say(
            'Stop moaning creature',
            'I know about you skavids',
            'You serve those monsters the ogres'
        );
        await npc.say('Please dont touch me!');
        await player.say('You have something that belongs to me...');
        await npc.say("I don't have anything, please believe me!");
        await player.say('Somehow I find your words hard to believe');
        await npc.say("I'm begging your kindness, I don't have it!");
        const menu = await player.ask(
            [
                "I don't believe you hand it over!",
                "Okay okay i'm not going to hurt you"
            ],
            false
        );
        if (menu === 0) {
            await player.say("I don't believe you, hand it over!");
            await npc.say('Ahhhhh, help!');
            player.message('The skavid runs away...');
            player.world.removeEntity('npcs', npc);
            await player.say("Oh great...I've scared it off!");
        } else if (menu === 1) {
            await player.say("Okay, okay i'm not going to hurt you");
            await npc.say(
                'Thank you kind human',
                "I'll tells you where that things you wants is...",
                'The mad skavids have it in their cave in the city',
                'You will have to learn skavid',
                'Otherwise they will not talks to you',
                'Make sure you remembers all that you hear',
                'Let me tells you the most common skavid words...',
                'Ar',
                'Nod',
                'Gor',
                'Ig',
                'Cur',
                'That will gets you started...'
            );
            player.cache.skavid_started_language = true;
            player.questStages[QUEST_KEY] = 5;
        }
    }
}

// city guard riddle
async function talkCityGuard(player, npc) {
    if (player.cache.city_guard_riddle === true) {
        await npc.say('What is it ?');
        const menu = await player.ask(
            [
                'Do you have any other riddles for me ?',
                'I have lost the map you gave me'
            ],
            true
        );
        if (menu === 0) {
            await npc.say('Yes, what looks good on a plate with salad ?');
            const subMenu = await player.ask(["I don't know...", 'A nice pizza ?'], true);
            if (subMenu === 0) {
                await npc.say('You!!!', 'Now go and bother me no more...');
            } else if (subMenu === 1) {
                await npc.say('Grr.. think you are a comedian eh ?', 'Get lost!');
            }
        } else if (menu === 1) {
            if (player.inventory.has(SKAVID_MAP_ID)) {
                await npc.say('Are you blind ? what is that you are carrying ?');
                await player.say('Oh, that map....');
            } else {
                await npc.say(
                    "What's the point ? take this copy and bother me no more!"
                );
                player.inventory.add(SKAVID_MAP_ID, 1);
            }
        }
    } else {
        await npc.say('Grrrr, what business have you here ?');
        await player.say('I am on an errand...');
        await npc.say('So what do you want with me ?');
        const menu = await player.ask(
            [
                'I am an ogre killer come to destroy you!',
                'I seek passage into the skavid caves'
            ],
            true
        );
        if (menu === 0) {
            await npc.say('I would like to see you try!');
            player.disengage();
            await npc.attack(player);
        } else if (menu === 1) {
            await npc.say(
                'Is that so...',
                'You humour me small thing, answer this riddle and I will help you...',
                'I want you to bring me an item',
                'I will give you all the letters of this item, you work out what it is...',
                'My first is in days, but not in years',
                'My second is in evil, and also in tears',
                'My third is in all, but not in none',
                'My fourth is in hot, but not in sun',
                'My fifth is in heaven, and also in hate',
                'My sixth is in fearing, but not in fate',
                'My seventh is in plush, but not in place',
                'My eighth is in nine, but not in eight',
                'My last is in earth, and also in in great',
                'My whole is an object, that magic will make',
                "It brings wrack and ruin to all in it's wake...",
                'Now how long I wonder, will this riddle take ?'
            );
            // player got the riddle
            player.cache.city_guard_riddle = false;
        }
    }
}

// grew - wants gorad's tooth
async function toothDialogue(player, npc) {
    await npc.say('The morsel is back', 'Does it have our tooth for us ?');
    if (player.inventory.has(OGRE_TOOTH_ID)) {
        await player.say('I have it');
        await npc.say(
            "It's got it, good good",
            'That should annoy gorad wonderfully',
            'Heheheheh!'
        );
        player.inventory.remove(OGRE_TOOTH_ID);
        await npc.say('Heres a token of my gratitude');
        player.inventory.add(OGRE_RELIC_PART_BASE_ID, 1);
        await npc.say(
            'Some old gem I stole from Gorad...',
            'And an old part of a statue',
            'Heheheheh!'
        );
        player.message('The ogre hands you a large crystal');
        player.message('The ogre gives you part of a statue');
        player.inventory.add(POWERING_CRYSTAL1_ID, 1);
        if (player.cache.ogre_grew) {
            delete player.cache.ogre_grew;
        }
        if (!player.cache.ogre_relic_part_2) {
            player.cache.ogre_relic_part_2 = true;
        }
    } else {
        await player.say("Err, I don't have it");
        await npc.say(
            'Morsel, you dare to return without the tooth!',
            'Either you are a fool, or want to be eaten!'
        );
    }
}

async function talkGrew(player, npc) {
    switch (stage(player)) {
        case -1:
            player.message('The ogre is not interested in you anymore');
            break;
        case 0:
        case 1:
            player.message('The ogre has nothing to say at the moment...');
            break;
        default:
            if (player.cache.ogre_relic_part_2) {
                await npc.say('What are you doing here morsel ?');
                const menu = await player.ask(
                    [
                        'Can I do anything else for you ?',
                        "I've lost the relic part you gave me",
                        "I've lost the crystal you gave me"
                    ],
                    true
                );
                if (menu === 0) {
                    await npc.say('I have nothing left for you but the cooking pot!');
                } else if (menu === 1) {
                    if (!player.inventory.has(OGRE_RELIC_PART_BASE_ID)) {
                        await npc.say(
                            'Stupid morsel, I have another',
                            'Take it and go now before I lose my temper'
                        );
                        player.inventory.add(OGRE_RELIC_PART_BASE_ID, 1);
                    } else {
                        await npc.say('You lie to me morsel!');
                    }
                } else if (menu === 2) {
                    if (!player.inventory.has(POWERING_CRYSTAL1_ID)) {
                        await npc.say(
                            'I suppose you want another ?',
                            'I suppose just this once I could give you my copy...'
                        );
                        player.inventory.add(POWERING_CRYSTAL1_ID, 1);
                    } else {
                        await npc.say(
                            'How dare you lie to me Morsel!',
                            'I will finish you now!'
                        );
                    }
                }
            } else if (player.cache.ogre_grew) {
                await toothDialogue(player, npc);
            } else {
                await npc.say(
                    'What do you want tiny morsel ?',
                    'You would look good on my plate'
                );
                await player.say('I want to enter the city of ogres');
                await npc.say('Perhaps I should eat you instead ?');
                const menu = await player.ask(
                    ['Don\'t eat me, I can help you', 'You will have to kill me first'],
                    true
                );
                if (menu === 0) {
                    await npc.say('What can a morsel like you do for me ?');
                    await player.say(
                        'I am a mighty adventurer',
                        'Slayer of monsters and user of magic powers'
                    );
                    await npc.say(
                        'Well well, perhaps the morsel can help after all...',
                        "If you think you're tough",
                        'Find Gorad my enemy in the south east settlement',
                        'And knock one of his teeth out!',
                        'Heheheheh!'
                    );
                    player.cache.ogre_grew = true;
                } else if (menu === 1) {
                    await npc.say('That can be arranged - guards!!');
                    await ogreSpawnAndAttack(player);
                }
            }
            break;
    }
}

// og - wants toban's stolen gold
async function stolenGoldDialogue(player, npc) {
    await npc.say('Where is my gold from that traitor toban?');
    const subMenu = await player.ask(
        ['I have your gold', "I haven't got it yet", 'I have lost the key!'],
        true
    );
    if (subMenu === 0) {
        if (player.inventory.has(STOLEN_GOLD_ID)) {
            await npc.say(
                'Well well, the little rat has got it!',
                'take this to show the little rat is a friend to the ogres',
                'Hahahahaha!'
            );
            player.inventory.remove(STOLEN_GOLD_ID);
            player.message('The ogre gives you part of a horrible statue');
            player.inventory.add(OGRE_RELIC_PART_HEAD_ID, 1);
            if (player.cache.ogre_og) {
                delete player.cache.ogre_og;
            }
            if (!player.cache.ogre_relic_part_3) {
                player.cache.ogre_relic_part_3 = true;
            }
        } else {
            await npc.say(
                'That is not what I want rat!',
                'If you want to impress me',
                'Then get the gold I asked for!'
            );
        }
    } else if (subMenu === 1) {
        await npc.say(
            "Don't come back until you have it",
            "Unless you want to be on tonight's menu!"
        );
    } else if (subMenu === 2) {
        if (player.inventory.has(KEY_ID)) {
            await npc.say("Oh yeah! what's that then ?");
            player.message('It seems you still have the key...');
        } else {
            await npc.say("Idiot! take another and don't lose it!");
            player.inventory.add(KEY_ID, 1);
        }
    }
}

async function talkOg(player, npc) {
    switch (stage(player)) {
        case -1:
            player.message('The ogre is not interested in you anymore');
            break;
        case 0:
        case 1:
            player.message('He\'s busy, try him later');
            break;
        default:
            if (player.cache.ogre_relic_part_3) {
                await npc.say("It's the little rat again");
                const menu = await player.ask(
                    [
                        'Do you have any other tasks for me ?',
                        'I have lost the relic part you gave me'
                    ],
                    true
                );
                if (menu === 0) {
                    await npc.say('No, I have no more tasks for you, now go away');
                } else if (menu === 1) {
                    if (!player.inventory.has(OGRE_RELIC_PART_HEAD_ID)) {
                        await npc.say(
                            'Grrr, why do I bother ?',
                            "It's a good job I have another part!"
                        );
                        player.inventory.add(OGRE_RELIC_PART_HEAD_ID, 1);
                    } else {
                        await npc.say(
                            'Are you blind! I can see you have it even from here!'
                        );
                    }
                }
            } else if (player.cache.ogre_og) {
                await stolenGoldDialogue(player, npc);
            } else {
                await npc.say('Why are you here little rat ?');
                const menu = await player.ask(
                    ['I seek entrance to the city of ogres', 'I have come to kill you'],
                    true
                );
                if (menu === 0) {
                    await npc.say(
                        'You have no business there!',
                        'Just a minute...maybe if you did something for me I might help you get in...'
                    );
                    await player.say('What can I do to help an ogre ?');
                    await npc.say(
                        'South East of here there is another settlement',
                        'The name of the chieftan is Toban',
                        'He stole some gold from me',
                        'And I want it back!',
                        "Here is a key to the chest it's in",
                        'If you bring it here',
                        'I may reward you...'
                    );
                    player.inventory.add(KEY_ID, 1);
                    player.cache.ogre_og = true;
                } else if (menu === 1) {
                    await npc.say(
                        'Kill me eh ?',
                        'you shall be crushed like the vermin you are!',
                        'Guards!!'
                    );
                    await ogreSpawnAndAttack(player);
                }
            }
            break;
    }
}

// toban - wants dragon bones
async function dragonBoneDialogue(player, npc) {
    await npc.say('Ha ha ha! small thing returns', 'Did you bring the dragon bone ?');
    if (player.inventory.has(DRAGON_BONES_ID)) {
        await player.say('When I say I will get something I get it!');
        player.inventory.remove(DRAGON_BONES_ID);
        await npc.say(
            'Ha ha ha! small thing has done it',
            'Toban is glad, take this...'
        );
        player.message('The ogre gives you part of a statue');
        player.inventory.add(OGRE_RELIC_PART_BODY_ID, 1);
        if (player.cache.ogre_toban) {
            delete player.cache.ogre_toban;
        }
        if (!player.cache.ogre_relic_part_1) {
            player.cache.ogre_relic_part_1 = true;
        }
    } else {
        await player.say('I have nothing for you');
        await npc.say('Then you shall get nothing from me!');
    }
}

async function talkToban(player, npc) {
    switch (stage(player)) {
        case -1:
            player.message('The ogre is not interested in you anymore');
            break;
        case 0:
        case 1:
            player.message('He is busy at the moment...');
            break;
        default:
            if (player.cache.ogre_relic_part_1) {
                await npc.say('The small thing returns, what do you want now ?');
                const subMenu = await player.ask(
                    ['I seek another task', "I can't find the relic part you gave me"],
                    true
                );
                if (subMenu === 0) {
                    await npc.say(
                        'Have you arrived for dinner ?',
                        'Ha ha ha! begone small thing!'
                    );
                } else if (subMenu === 1) {
                    if (!player.inventory.has(OGRE_RELIC_PART_BODY_ID)) {
                        await npc.say(
                            'Small thing, how could you be so careless ?',
                            'Here, take this one'
                        );
                        player.inventory.add(OGRE_RELIC_PART_BODY_ID, 1);
                    } else {
                        await npc.say(
                            'Small thing, you lie to me!',
                            'I always says that small things are big trouble...'
                        );
                    }
                }
            } else if (player.cache.ogre_toban) {
                await dragonBoneDialogue(player, npc);
            } else {
                await npc.say('What do you want small thing ?');
                const menu = await player.ask(
                    ['I seek entrance to the city of ogres', 'Die creature'],
                    true
                );
                if (menu === 0) {
                    await npc.say("Ha ha ha! you'll never get in there");
                    await player.say('I fear not for that city');
                    await npc.say('Bold words for a thing so small');
                    const subMenu = await player.ask(
                        ['I could do something for you...', 'Die creature'],
                        true
                    );
                    if (subMenu === 0) {
                        await npc.say(
                            'Ha ha ha! this creature thinks it can help me!',
                            'I would eat you now, but for your puny size',
                            'Prove to me your might',
                            'Bring me the bones of a dragon to chew on',
                            'And I may spare you from a painful death'
                        );
                        player.cache.ogre_toban = true;
                    } else if (subMenu === 1) {
                        await npc.say(
                            "Ha ha ha! it thinks it's a match for toban does it ?"
                        );
                        player.disengage();
                        await npc.attack(player);
                    }
                } else if (menu === 1) {
                    await npc.say(
                        "Ha ha ha! it thinks it's a match for toban does it ?"
                    );
                    player.disengage();
                    await npc.attack(player);
                }
            }
            break;
    }
}

// watchtower wizard
const SEARCHINGTHECAVES = 0;

async function fingerNailsDialogue(player, npc) {
    if (stage(player) === 1) {
        await player.say('Have a look at these');
        player.inventory.remove(FINGERNAILS_ID);
        await npc.say(
            'Interesting, very interesting',
            'Long nails...grey in colour',
            'Well chewed...',
            'Of course, they belong to a skavid'
        );
        await player.say('A skavid ?');
        await npc.say(
            'A servant race to the ogres',
            'Gray depressed looking creatures',
            'Always loosing nails, teeth and hair',
            'They inhabit the caves in the mendip hills',
            'They normally keep to themselves though',
            "It's unusual for them to venture from their caves"
        );
        const m = await player.ask(
            ['What do you suggest that I do ?', 'Shall I search the caves ?'],
            true
        );
        if (m === 0 || m === 1) {
            await watchtowerWizardDialogue(player, npc, SEARCHINGTHECAVES);
        }
    } else {
        player.message('The wizard has no need for more evidence');
    }
}

async function watchtowerWizardDialogue(player, npc, cID) {
    if (cID === -1) {
        switch (stage(player)) {
            case -1:
                if (player.cache.watchtower_scroll) {
                    await npc.say(
                        'Greetings friend',
                        'I trust all is well with you ?',
                        'Yanilee is safe at last!'
                    );
                } else {
                    await npc.say(
                        'Hello again adventurer',
                        'Thanks again for your help in keeping us safe'
                    );
                    const finish = await player.ask(
                        ['I lost the scroll you gave me', "That's okay"],
                        true
                    );
                    if (finish === 0) {
                        if (
                            !player.bank.has(SPELL_SCROLL_ID) &&
                            !player.inventory.has(SPELL_SCROLL_ID)
                        ) {
                            await npc.say('Never mind, have another...');
                            player.inventory.add(SPELL_SCROLL_ID, 1);
                        } else if (player.bank.has(SPELL_SCROLL_ID)) {
                            await npc.say(
                                'Ho ho ho! a comedian to the finish!',
                                'There it is, in your bank!'
                            );
                        } else {
                            await npc.say(
                                'Ho ho ho! a comedian to the finish!',
                                'There it is, in your backpack!'
                            );
                        }
                    } else if (finish === 1) {
                        await npc.say('We are always in your debt...');
                    }
                }
                break;
            case 0:
                await watchtowerWizardStage0(player, npc);
                break;
            case 1:
                await npc.say('Hello again', 'Did you find anything of interest ?');
                if (player.inventory.has(FINGERNAILS_ID)) {
                    await fingerNailsDialogue(player, npc);
                } else if (
                    player.inventory.has(EYE_PATCH_ID) ||
                    player.inventory.has(GOBLIN_ARMOUR_ID) ||
                    player.inventory.has(IRON_DAGGER_ID) ||
                    player.inventory.has(WIZARDS_ROBE_ID)
                ) {
                    if (player.inventory.has(EYE_PATCH_ID)) {
                        await player.say('I found this eye patch');
                    } else if (player.inventory.has(GOBLIN_ARMOUR_ID)) {
                        await player.say('Have a look at this goblin armour');
                    } else if (player.inventory.has(IRON_DAGGER_ID)) {
                        await player.say('I found a dagger');
                    } else if (player.inventory.has(WIZARDS_ROBE_ID)) {
                        await player.say('I have this robe');
                    }
                    await npc.say(
                        'Let me see...',
                        'No, sorry this is not evidence',
                        'You need to keep searching im afraid'
                    );
                } else {
                    await player.say('No nothing yet');
                    await npc.say('Oh dear oh dear', 'There must be something somewhere');
                }
                break;
            case 2:
                await watchtowerWizardStage2(player, npc);
                break;
            case 3:
                await watchtowerWizardStage3(player, npc);
                break;
            case 4:
                await watchtowerWizardStage4(player, npc);
                break;
            case 5:
                await watchtowerWizardStage5(player, npc);
                break;
            case 6:
                await player.say(
                    'I have found the cave of ogre shaman',
                    'But I cannot touch them!'
                );
                await npc.say(
                    'That is because of their magical powers',
                    'We must fight them with their own methods',
                    'Do not speak to them!',
                    'I suggest a potion...',
                    'Collect some guam leaves',
                    'and some jangerberries',
                    'And mix in some ground bat bones',
                    'It is essential to return it to me before you use it',
                    'So I can empower it with my magic',
                    'Be very careful how you mix it, its extremely volatile',
                    'Mixing ingredients of this type in the wrong order can cause explosions!',
                    "I hope you've been brushing up in herblaw and magic ?",
                    'I must warn you that only experienced magicians can use this potion',
                    'It is too dangerous in the hands of the unskilled...'
                );
                player.questStages[QUEST_KEY] = 7;
                break;
            case 7:
                await watchtowerWizardStage7(player, npc);
                break;
            case 8:
                await watchtowerWizardStage8(player, npc);
                break;
            case 9:
                await watchtowerWizardStage9(player, npc);
                break;
            case 10:
                await npc.say(
                    'The system is not activated yet',
                    'Throw the switch to start it...'
                );
                break;
        }
    }
    if (cID === SEARCHINGTHECAVES) {
        await npc.say('It\'s no good searching the caves', 'Well, not yet anyway');
        await player.say('Why not ?');
        await npc.say(
            'They are deep and complex',
            'The only way you will navigate the caves is to have a map or something',
            'It may be that the ogres have one'
        );
        await player.say('And how do you know that ?');
        await npc.say("Well... I don't");
        const m2 = await player.ask(['So what do I do ?', 'I wont bother then'], false);
        if (m2 === 0) {
            await player.say('So what do I do ?');
            await npc.say(
                'You need to be fearless',
                "And gain entrance to Gu'Tanoth the city of ogres",
                'And find out how to navigate the caves'
            );
            await player.say('That sounds scary');
            await npc.say(
                'Ogres are nasty creatures yes',
                'Only a strong warrior, and a clever one at that',
                'Can get the better of the ogres...'
            );
            await player.say('What do I need to do to get into the city');
            await npc.say(
                'Well the guards need to be dealt with',
                'You could start by checking out the ogre settlements around here',
                'Tribal ogres often hate their neighbours...'
            );
            player.questStages[QUEST_KEY] = 2;
        } else if (m2 === 1) {
            await player.say("I won't bother then");
            await npc.say(
                "Won't bother, won't bother ?",
                '...Perhaps this quest is too hard for you'
            );
            player.message('The wizard walks away');
        }
    }
}

async function watchtowerWizardStage0(player, npc) {
    await npc.say('Oh my Oh my!');
    const menu = await player.ask(
        ["What's the matter ?", 'You wizards are always complaining'],
        true
    );
    if (menu === 0) {
        await npc.say(
            'Oh dear oh dear',
            'Darn and drat',
            'We try hard to keep this town protected',
            "But how can we do that when the watchtower isn't working ?"
        );
        await player.say("What do you mean it isn't working ?");
        await npc.say(
            'The watchtower here works by the power of a magical device',
            'An ancient spell designed to ward off ogres',
            'That has been in place here for many moons',
            'The exact knowledge of the spell is lost to us now',
            'But the essence of the spell',
            'Has been infused into 4 powering crystals',
            'To keep the tower protected from the hordes in the mendips...'
        );
        const menu2 = await player.ask(
            [
                "So how come the spell dosen't work ?",
                "I'm not interested in the rantings of an old wizard"
            ],
            true
        );
        if (menu2 === 0) {
            await npc.say('The crystals! the crystals!', 'They have been taken!');
            await player.say('Taken...');
            await npc.say('Stolen!');
            await player.say('Stolen...');
            await npc.say('Yes, yes! do I have to repeat myself ?');
            player.message('The wizard seems very stressed...');
            const menu3 = await player.ask(
                ['Can I be of help ?', "I'm not sure I can help", "I'm not interested"],
                true
            );
            if (menu3 === 0) {
                await npc.say(
                    'Help ?',
                    'Oh wonderful dear traveller',
                    'Yes I could do with an extra pair of eyes here'
                );
                await player.say('???');
                await npc.say(
                    'There must be some evidence of what has happened somewhere',
                    'Perhaps you could assist me in searching for clues'
                );
                await player.say('I would be happy to');
                await npc.say('Try searching the surrounding area');
                // quest start - stage 1
                player.questStages[QUEST_KEY] = 1;
            } else if (menu3 === 1) {
                await npc.say(
                    'Oh dear what am I to do ?',
                    'The safety of this whole area is in jeopardy!'
                );
            } else if (menu3 === 2) {
                await npc.say(
                    "That's typical nowadays",
                    'Its left to us wizards to do all the work...'
                );
                player.message('The wizard is not impressed');
            }
        } else if (menu2 === 1) {
            player.message('The wizard gives you a suspicious look');
        }
    } else if (menu === 1) {
        await npc.say(
            'Complaining ?.... complaining !',
            "What folks these days don't realize",
            "Is that if it wasn't for us wizards",
            'This entire world would be overrun',
            'With every creature that walks this world!'
        );
        player.message('The wizard angrily walks away');
    }
}

async function watchtowerWizardStage2(player, npc) {
    await npc.say("How's it going ?");
    const newM = await player.ask(
        [
            'I am having difficulty with the tribes',
            'I have everything under control',
            'I have lost something the ogres gave to me'
        ],
        true
    );
    if (newM === 0) {
        await npc.say(
            'Talk to them face to face',
            "And don't show any fear",
            'Make sure you are rested and well-fed',
            'And fight the good fight!'
        );
    } else if (newM === 1) {
        await npc.say('Good, good! I will expect the crystals back shortly then...');
    } else if (newM === 2) {
        await npc.say(
            'Oh deary me!',
            "Well there's nothing I can do about it",
            "You will have to go back to them i'm afraid"
        );
    }
}

async function watchtowerWizardStage3(player, npc) {
    if (!player.cache.has_ogre_companionship && !player.cache.city_guard_riddle) {
        await npc.say(
            'Ah the warrior returns',
            "Have you found a way into Gu'Tanoth yet ?"
        );
        await player.say("I can't get past the guards");
        await npc.say(
            'Well, ogres dislike others apart from their kind',
            'What you need is some form of proof of friendship',
            'Something to trick them into believing you are their friend',
            '...Which shouldn\'t be too hard considering their intelligence!'
        );
        if (!player.inventory.has(OGRE_RELIC_ID)) {
            const lostRelicMenu = await player.ask(
                [
                    'I have lost the relic you gave me',
                    'I will find my way in, no problem'
                ],
                true
            );
            if (lostRelicMenu === 0) {
                await npc.say(
                    'What! lost the relic ? How careless!',
                    "It's a good job I copied that design then...",
                    'You can take this copy instead, its just as good'
                );
                player.inventory.add(OGRE_RELIC_ID, 1);
            } else if (lostRelicMenu === 1) {
                await npc.say("Yes, I'm sure you will...good luck");
            }
        }
    } else if (
        player.cache.has_ogre_companionship &&
        !player.cache.city_guard_riddle
    ) {
        await npc.say('How are you doing with the ogres ?');
        await player.say('I have gained entry to the city');
        await npc.say('Already ? excellent!');
        await player.say("I still can't navigate the skavid caves");
        await npc.say(
            'You need a map of some kind...',
            'I bet one of the ogres has one'
        );
        await player.say("Okay thanks, I'll go and find out");
    } else {
        await npc.say('How is the quest going ?');
        const puzzleMenu = await player.ask(
            [
                'Some of the city guards have set me a puzzle',
                'Can you tell me more about the city ?'
            ],
            true
        );
        if (puzzleMenu === 0) {
            await npc.say(
                'Ummm is that so ?',
                "I can't help you there, I never was much good at puzzles..."
            );
        } else if (puzzleMenu === 1) {
            await npc.say(
                'Yes indeed, this city is very ancient',
                "It's not clear whether the ogres actually constructed it",
                'Or whether they took it over from another race',
                'What I can tell you is that the whole city is controlled',
                'By a group of ogre shaman'
            );
            await player.say('Ogre shaman ?');
            await npc.say(
                'Indeed, these ogres have harnessed the black arts...',
                'They wield great power'
            );
            await player.say('They sound nasty!');
            await npc.say(
                'Indeed they are, but you must confront them',
                'To break the power of the ogres they must be beaten!'
            );
            const sMenu = await player.ask(
                ["But I'm scared of those shaman!", 'Leave it to me, I fear no ogre'],
                false
            );
            if (sMenu === 0) {
                await player.say("But i'm scared of those shaman!");
                await npc.say(
                    'Scared ? to get this far and to falter now...',
                    'Perchance you are not ready for the final challenge ?'
                );
            } else if (sMenu === 1) {
                await player.say('Leave it to me, I fear no ogre');
                await npc.say("That's the spirit!", 'May your search prove fruitful!');
            }
        }
    }
}

async function watchtowerWizardStage4(player, npc) {
    await npc.say('How is the quest going ?');
    await player.say("I have worked out the guard's puzzle");
    await npc.say('My my! a wordsmith as well as a hero!');
    const mymyMenu = await player.ask(
        [
            'I am still trying to navigate the skavid caves',
            "I am trying to get into the shaman's cave",
            'It is going well'
        ],
        true
    );
    if (mymyMenu === 0) {
        await npc.say('Take some illumination with you or else it will be dark!');
    } else if (mymyMenu === 1) {
        await npc.say(
            'Yes it will be well-guarded',
            'Hmmm, let me see...',
            'Ah yes, I gather some ogres are allergic to certain herbs...',
            'Now what was it ?',
            'It had white berries and blue leaves.... I remember that!',
            'You should try looking through some of the caves...'
        );
    } else if (mymyMenu === 2) {
        await npc.say(
            "Thats good to hear",
            'We are much closer to fixing the tower now'
        );
    }
}

async function watchtowerWizardStage5(player, npc) {
    await npc.say('Hello again, how do you fare?');
    const questMenu5 = await player.ask(
        [
            'It goes well, I can now navigate the skavid caves',
            'I had a crystal but I lost it',
            'I am now ready for the shaman'
        ],
        false
    );
    if (questMenu5 === 0) {
        await player.say('It goes well, I can now navigate the skavid caves');
        await npc.say(
            'That is good news',
            'Let me know if you find anything of interest...'
        );
    } else if (questMenu5 === 1) {
        await player.say('I had a crystal, but I lost it');
        await npc.say('Oh no, well you had better go back there again then!');
    } else if (questMenu5 === 2) {
        await player.say('I am now ready for the shaman');
        await npc.say(
            'Remember all I told you, you must distract the guard somehow',
            'The herbs with blue leaves and berries is what you are looking for',
            'This herb is very poisonous however, handle it carefully',
            'Also, be on your guard in that cave',
            'Who know what monsters may be present in that awful place'
        );
    }
}

async function watchtowerWizardStage7(player, npc) {
    await npc.say('Any more news ?');
    if (player.inventory.has(OGRE_POTION_ID)) {
        await player.say('Yes I have made the potion');
        await npc.say("That's great news, let me infuse it with magic...");
        player.message('The wizard mutters strange words over the liquid');
        player.inventory.remove(OGRE_POTION_ID);
        player.inventory.add(MAGIC_OGRE_POTION_ID, 1);
        if (stage(player) === 7) {
            player.questStages[QUEST_KEY] = 8;
        }
        await npc.say(
            'Here it is, a dangerous substance',
            'I must remind you that this potion can only be used',
            'If your magic ability is high enough'
        );
    } else {
        await player.say('Can you tell me again what I need for the potion ?');
        await npc.say(
            'Yes indeed, you need some guam leaves,',
            'Jangerberries and ground bat bones',
            'Then the potion can be powered with magic',
            'And the ogre shaman can be destroyed'
        );
    }
}

async function watchtowerWizardStage8(player, npc) {
    await npc.say('Hello again', 'Did the potion work ?');
    await player.say('I am still working to rid us of these shaman...');
    await npc.say('May you have sucess in your task');
    const qMenu = await player.ask(
        [
            'I had another crystal but I lost it',
            'I am looking for another crystal',
            'I have found another crystal!'
        ],
        true
    );
    if (qMenu === 0) {
        await npc.say(
            'Oh really ?',
            "It's probably been dropped in the shaman cave",
            'Go and have a good search that area again'
        );
    } else if (qMenu === 1) {
        await npc.say(
            'I am sure the cave holds the final one',
            'Look for the source of the shaman power...'
        );
        await player.say('Okay I will go and have a look');
    } else if (qMenu === 2) {
        await npc.say("Good, let's have it here...");
    }
}

async function watchtowerWizardStage9(player, npc) {
    if (!player.cache.crystal_rock) {
        await npc.say('Hello again', 'Did the potion work ?');
        await player.say(
            'Indeed it did!',
            'I wiped out those ogre shaman!',
            'I am looking for another crystal'
        );
        await npc.say(
            'I am sure the cave holds the final one',
            'Look for the source of the shaman power...'
        );
        await player.say('Okay I will go and have a look');
    } else {
        await npc.say('Well, how did it go ?', 'Have you found any more crystals ?');
        const rMenu = await player.ask(
            [
                'I did have the crystal but I lost it',
                "I can't find any more crystals yet...",
                'Yes, here it is'
            ],
            false
        );
        if (rMenu === 0) {
            await player.say('I did have the crystal but I lost it');
            await npc.say(
                'Dissappointing, dissappointing...',
                "Well there's not much I can do...",
                'You had better go back and search the area again'
            );
        } else if (rMenu === 1) {
            await player.say("I can't find any more crystals yet...");
            await npc.say(
                'The rock of the shaman is the key',
                'I understand their power is linked to it in some way',
                'You may need something heavy to crack this boulder...'
            );
        } else if (rMenu === 2) {
            await player.say('Yes, here it is!');
            await npc.say(
                'Wonderful!',
                "Show it to me so I can confirm it's the real thing..."
            );
        }
    }
}

// dispatch
const HANDLED_NPCS = new Set([
    WATCHTOWER_WIZARD_ID,
    GREW_ID,
    OG_ID,
    TOBAN_ID,
    OGRE_CITIZEN_ID,
    OGRE_TRADER_FOOD_ID,
    OGRE_GUARD_CAVE_ENTRANCE_ID,
    OGRE_TRADER_ROCKCAKE_ID,
    CITY_GUARD_ID,
    SKAVID_FINALQUIZ_ID,
    SKAVID_IG_ID,
    SKAVID_AR_ID,
    SKAVID_CUR_ID,
    SKAVID_NOD_ID,
    SKAVID_INITIAL_ID
]);

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!HANDLED_NPCS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    if (npc.id === SKAVID_FINALQUIZ_ID) {
        await talkSkavidFinalQuiz(player, npc);
    } else if (
        npc.id === SKAVID_IG_ID ||
        npc.id === SKAVID_AR_ID ||
        npc.id === SKAVID_CUR_ID ||
        npc.id === SKAVID_NOD_ID
    ) {
        await talkSkavidWord(player, npc);
    } else if (npc.id === SKAVID_INITIAL_ID) {
        await talkSkavidInitial(player, npc);
    } else if (npc.id === WATCHTOWER_WIZARD_ID) {
        await watchtowerWizardDialogue(player, npc, -1);
    } else if (npc.id === OGRE_CITIZEN_ID) {
        await npc.say('Uh ? what are you doing here ?');
    } else if (npc.id === OGRE_TRADER_FOOD_ID) {
        await npc.say('Grrr, little animal.. I shall destroy you!');
        player.disengage();
        await npc.attack(player);
        return true;
    } else if (npc.id === OGRE_GUARD_CAVE_ENTRANCE_ID) {
        if (stage(player) >= 0 && stage(player) < 5) {
            await npc.say('Stop bothering me minion!');
        } else if (stage(player) !== -1) {
            await npc.say('What do you want ?');
            const menu = await player.ask(
                ['I want to go in there', 'I want to rid the world of ogres'],
                true
            );
            if (menu === 0) {
                await npc.say('Oh you do, do you ?', 'How about no ?');
                player.disengage();
                await npc.attack(player);
                return true;
            } else if (menu === 1) {
                await npc.say('You dare mock me creature!!!');
                player.disengage();
                await npc.attack(player);
                return true;
            }
        } else {
            player.message('The guard is occupied at the moment');
        }
    } else if (npc.id === OGRE_TRADER_ROCKCAKE_ID) {
        await npc.say(
            'Arr, small thing wants my food does it ?',
            "I'll teach you to deal with ogres!"
        );
        player.disengage();
        await npc.attack(player);
        return true;
    } else if (npc.id === CITY_GUARD_ID) {
        await talkCityGuard(player, npc);
    } else if (npc.id === GREW_ID) {
        await talkGrew(player, npc);
    } else if (npc.id === OG_ID) {
        await talkOg(player, npc);
    } else if (npc.id === TOBAN_ID) {
        await talkToban(player, npc);
    }

    player.disengage();
    return true;
}

// onusenpc: fingernails->wizard, stolen gold->og, tooth->grew, bones->toban
async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.equipped) {
        return false;
    }

    if (npc.id === WATCHTOWER_WIZARD_ID && item.id === FINGERNAILS_ID) {
        player.engage(npc);
        await fingerNailsDialogue(player, npc);
        player.disengage();
        return true;
    } else if (npc.id === OG_ID && item.id === STOLEN_GOLD_ID) {
        player.engage(npc);
        if (player.cache.ogre_og || player.cache.ogre_relic_part_3) {
            await stolenGoldDialogue(player, npc);
        } else {
            player.message('Nothing interesting happens');
        }
        player.disengage();
        return true;
    } else if (npc.id === GREW_ID && item.id === OGRE_TOOTH_ID) {
        player.engage(npc);
        if (player.cache.ogre_relic_part_2) {
            await player.say(
                'I am not sure giving him another tooth will have any purpose'
            );
        } else if (player.cache.ogre_grew) {
            await toothDialogue(player, npc);
        } else {
            player.message('Nothing interesting happens');
        }
        player.disengage();
        return true;
    } else if (npc.id === TOBAN_ID && item.id === DRAGON_BONES_ID) {
        player.engage(npc);
        if (player.cache.ogre_toban || player.cache.ogre_relic_part_1) {
            await dragonBoneDialogue(player, npc);
        } else {
            player.message('Nothing interesting happens');
        }
        player.disengage();
        return true;
    }

    return false;
}

module.exports = { onTalkToNPC, onUseWithNPC };
