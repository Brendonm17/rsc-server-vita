// reward: 1 qp + herblaw xp, base 1600 var 500

const { questsEnabled } = require('../../custom-gate.js');

const TRUFITUS_ID = 515; // NpcId.TRUFITUS
const ZADIMUS_ID = 587; // NpcId.ZADIMUS

// herb items (id-map)
const SNAKE_WEED_ID = 814;
const UNIDENTIFIED_SNAKE_WEED_ID = 813;
const ARDRIGAL_ID = 816;
const SITO_FOIL_ID = 818;
const VOLENCIA_MOSS_ID = 820;
const ROGUES_PURSE_ID = 822;
const BONE_SHARD_ID = 972;

// four unidentified herbs collide on id 933; identified herb spawned directly

// herb-source objects
const SNAKE_JUNGLE_VINE_ID = 564;
const ARDRIGAL_PALM_TREE_ID = 32;
const SITO_SCORCHED_EARTH_ID = 554;
const VOLENCIA_ROCKS_ID = 164;
const ROGUES_PURSE_WALL_ID = 151;

// trufitus post-completion dialogue-branch constants
const T = {
    WHAT_DO_YOU_KNOW_ABOUT_MOSEL_REI: 0,
    WHAT_DO_YOU_KNOW_ABOUT_RASHILIYIA: 1,
    SOMETHING_ABOUT_A_LEGEND: 2,
    MORE_ABOUT_THE_TEMPLE: 3,
    EVACUATE_ISLAND: 4,
    THANKS_FOR_THE_INFORMATION: 5,
    AH_ZA_RHOON: 6,
    RESTING_PLACE: 7,
    OH_OK: 8,
    WEAKNESS: 9,
    SHOW_ME_TEMPLE_ITEMS: 10,
    SHOW_ME_TEMPLE_ITEMS2: 11,
    KEYS_AND_KIN: 12,
    ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE: 13,
    HELP_WITH_RASH: 14,
    HELP_WITH_ZADIMUS: 15,
    HELP_WITH_BERVIRIUS: 16,
    HELP_WITH_AH_ZA_RHOON_TEMPLE: 17,
    DIDNT_FIND_ANYTHING_IN_THE_TOMB: 18,
    DROPED_RASHILIYIA: 19,
    FOUND_NOTHING: 20
};

function hasCacheKeySetTrue(player, key) {
    return player.cache[key] === true;
}

function atQuestStages(player, questKey, ...stages) {
    return stages.includes(player.questStages[questKey]);
}

// completeQuest(player, this)
async function completeQuest(player, npc) {
    // handleReward
    player.message('You gain experience in Herblaw !');
    player.addQuestPoints(1); // reward.getQuestPoints()
    // XPReward(HERBLAW, baseXP=1600, varXP=500)
    player.addExperience(
        'herblaw',
        player.skills.herblaw.base * 500 + 1600,
        false
    );
    player.cache.jungle_completed = true;

    player.questStages.junglePotion = -1;
}

async function trufitusDialogue(player, npc, path) {
    let sOpt = -1;

    if (path === 0) {
        await npc.say(
            'My people are afraid to stay in the village.',
            'They have returned to the jungle',
            'I need to commune with the gods',
            'to see what fate befalls us',
            'you could help me by collecting',
            'some herbs that I need.'
        );
        sOpt = await player.ask(
            [
                'Me, how can I help?',
                "I am very sorry, but I don't have time for that at the moment."
            ],
            false
        );
    } else if (path === 1) {
        await npc.say(
            'My people are afraid to stay in the village',
            'They have returned to the jungle',
            'I need to commune with my gods',
            'to see what fate befalls us',
            'You may be able to help with this'
        );
        sOpt = await player.ask(
            [
                'Me! How can I help?',
                "I am sorry, but I don't have time for that."
            ],
            false
        );
    }

    if (sOpt === 0) {
        await player.say('Me, how can I help?');
        await npc.say(
            'I need to make a special brew',
            'A potion that helps me to commune with the gods.',
            'For this potion, I need very',
            'special herbs that are only found in',
            'deep jungle',
            'I can guide you only so far as the',
            'herbs are not easy to find',
            'With some luck, you will find each herb in turn',
            'and bring it to me. I will give you',
            'details of where to find the next herb. ',
            'In return I will give you training in Herblaw'
        );
        const opts = await player.ask(
            [
                "Hmm, sounds difficult, I don't know if I am ready for the challenge",
                'It sounds like just the challenge for me!'
            ],
            false
        );
        if (opts === 0) {
            await player.say(
                "Hmm, sounds difficult, I don't know if I am ready for the challenge"
            );
            await npc.say(
                'Very well then Bwana',
                'maybe you will return to me invigorated',
                'and ready to take up the challenge one day ?'
            );
        } else if (opts === 1) {
            await player.say(
                'It sounds like just the challenge for me.',
                'And it would make a nice break from killing things !'
            );
            await npc.say(
                'That is excellent then Bwana!',
                'The first herb you need to gather is called',
                "'Snake Weed'",
                'It grows near vines in an area to the south west',
                'where the ground turns soft and water kisses your feet.'
            );
            player.questStages.junglePotion = 1;
            player.cache.got_snake_weed = false;
        }
    } else if (sOpt === 1) {
        await player.say("I am very sorry, but I don't have time for that.");
        await npc.say(
            'Very well then Bwana',
            'may your journeys bring you much joy',
            'maybe you will pass this way again and',
            'you will then take up my proposal',
            'but for now, farewell !'
        );
    }
}

async function trufitisChat(player, npc, cID) {
    if (npc.id === TRUFITUS_ID) {
        if (cID === -1) {
            switch (player.questStages.junglePotion) {
                case 0:
                case undefined:
                case null: {
                    await npc.say(
                        'Greetings Bwana,',
                        'I am Trufitus Shakaya of the',
                        'Taie Bwo Wannai Village. ',
                        'Welcome to our humble settlement.'
                    );
                    const opt = await player.ask(
                        [
                            'What does Bwana mean?',
                            'Taie Bwo Wannai? What does that mean?',
                            "It's a nice village, where is everyone?"
                        ],
                        false
                    );
                    if (opt === 0) {
                        await player.say('What does Bwana mean?');
                        await npc.say(
                            "Gracious sir, it means 'friend'",
                            'And friends come in peace',
                            'I assume that you come in peace?'
                        );
                        const s = await player.ask(
                            [
                                'Yes, of course I do.',
                                'What does a warrior like me know about peace?'
                            ],
                            false
                        );
                        if (s === 0) {
                            await player.say('Yes, of course I do!');
                            await npc.say(
                                'Well, that is good news',
                                'as I may have a proposition for you'
                            );
                            const s1 = await player.ask(
                                [
                                    'A proposition eh, sounds interesting!',
                                    'I am sorry, but I am very busy'
                                ],
                                true
                            );
                            if (s1 === 0) {
                                await npc.say('I hoped that you would think so.');
                                await trufitusDialogue(player, npc, 0);
                            } else if (s1 === 1) {
                                await npc.say(
                                    'Very well then',
                                    'may your journeys bring you much joy',
                                    'maybe you will pass this way again',
                                    'and you will then take up my proposal,',
                                    'but for now',
                                    'fare thee well'
                                );
                            }
                        } else if (s === 1) {
                            await player.say(
                                'What does a warrior like me know about peace?'
                            );
                            await npc.say(
                                'When you grow weary of violence',
                                'and seek a more enlightened path',
                                'please pay me a visit',
                                'as I may have a proposal for you',
                                'Now I need to attend to the plight',
                                'of my people, please excuse me'
                            );
                        }
                    } else if (opt === 1) {
                        await player.say(
                            'Taie Bwo Wannai? What does that mean?'
                        );
                        await npc.say(
                            "It means 'small clearing in the jungle'",
                            'But now it is the name of our village.'
                        );
                        const ss = await player.ask(
                            [
                                "It's a nice village, where is everyone?",
                                'I am sorry, but I am very busy'
                            ],
                            false
                        );
                        if (ss === 0) {
                            await player.say(
                                'It seems like a nice village, where is everyone?'
                            );
                            await trufitusDialogue(player, npc, 1);
                        } else if (ss === 1) {
                            await player.say('I am sorry, but I am very busy');
                            await npc.say(
                                'Very well then',
                                'may your journeys bring you much joy',
                                'maybe you will pass this way again',
                                'and you will then take up my proposal,',
                                'but for now',
                                'fare thee well'
                            );
                        }
                    } else if (opt === 2) {
                        await player.say(
                            'It seems like a nice village, where is everyone?'
                        );
                        await trufitusDialogue(player, npc, 1);
                    }
                    break;
                }
                case 1: {
                    player.cache.got_snake_weed = false;
                    await npc.say('Hello Bwana, do you have the Snake Weed?');
                    const option = await player.ask(
                        ['Of course!', "Not yet, sorry, what's the clue again?"],
                        false
                    );
                    if (option === 0) {
                        await player.say('Of Course!');
                        if (!player.inventory.has(SNAKE_WEED_ID)) {
                            await npc.say(
                                "Please don't try to deceive me!",
                                'I really need that Snake Weed if I am to make this potion'
                            );
                        } else {
                            await npc.say(
                                "Great, you have the 'Snake Weed'",
                                "Ok, the next herb is called, 'Ardrigal'",
                                'it is related to the palm and grows',
                                "to the East in its brother's shady profusion."
                            );
                            player.message('You give the Snake Weed to Trufitus');
                            player.inventory.remove(SNAKE_WEED_ID);
                            await npc.say("Many thanks for the 'Snake Weed'");
                            player.questStages.junglePotion = 2;
                            player.cache.got_ardigal = false;
                            delete player.cache.got_snake_weed;
                        }
                    } else if (option === 1) {
                        await player.say(
                            "Not yet, sorry, what's the clue again?"
                        );
                        await npc.say(
                            'It is related to the palm and grows',
                            "well to the north in its brother's shady profusion.",
                            'I really need that Snake Weed if I am to make this potion'
                        );
                    }
                    break;
                }
                case 2: {
                    player.cache.got_ardigal = false;
                    await npc.say(
                        'Hello again, have you been able to get the Ardrigal ?'
                    );
                    const o = await player.ask(
                        ['Of course!', 'Not yet, sorry.'],
                        false
                    );
                    if (o === 0) {
                        await player.say('Of Course!');
                        if (player.inventory.has(ARDRIGAL_ID)) {
                            await npc.say(
                                "Ah, I see you have found the 'Ardrigal'",
                                'you are doing well Bwana, the next',
                                "herb is called, 'Sito Foil' and grows best",
                                'where the ground has been blackened',
                                'by the living flame.'
                            );
                            player.message('You give the Ardrigal to Trufitus');
                            await player.world.sleepTicks(3);
                            player.inventory.remove(ARDRIGAL_ID);
                            player.questStages.junglePotion = 3;
                            player.cache.got_sito_foil = false;
                            delete player.cache.got_ardigal;
                        } else {
                            await npc.say(
                                "Please don't try to deceive me!",
                                'I still require Ardrigal,',
                                'this potion will remain incomplete without it.'
                            );
                        }
                    } else if (o === 1) {
                        await player.say('Not yet, sorry.');
                        await npc.say(
                            'I still require Ardrigal,',
                            'this potion will remain incomplete without it.'
                        );
                    }
                    break;
                }
                case 3: {
                    player.cache.got_sito_foil = false;
                    await npc.say(
                        'Greetings Bwana',
                        'have you been successful in getting Sito Foil?'
                    );
                    const os = await player.ask(
                        ['Of course!', 'Not yet, sorry.'],
                        false
                    );
                    if (os === 0) {
                        await player.say('Of Course!');
                        if (player.inventory.has(SITO_FOIL_ID)) {
                            await npc.say(
                                'Well done Bwana, just two more herbs',
                                "to collect. The next herb is called, 'Volencia Moss'",
                                "And it clings to rocks for it's existence",
                                'It is difficult to see, so you must search for it well.'
                            );
                            player.message('You give the Sito Foil to Trufitus');
                            await player.world.sleepTicks(3);
                            player.inventory.remove(SITO_FOIL_ID);
                            player.questStages.junglePotion = 4;
                            player.cache.got_volencia_moss = false;
                            delete player.cache.got_sito_foil;
                        } else {
                            await npc.say(
                                "Please don't try to deceive me!",
                                'I still require Sito Foil, every herb is vital.'
                            );
                        }
                    } else if (os === 1) {
                        await player.say('Not yet, sorry.');
                        await npc.say(
                            'I still require Sito Foil, every herb is vital.'
                        );
                    }
                    break;
                }
                case 4: {
                    player.cache.got_volencia_moss = false;
                    await npc.say(
                        'Greetings Bwana',
                        "Do you have the 'Volencia Moss' ?"
                    );
                    const oo = await player.ask(
                        ['Of course!', 'Not yet, sorry.'],
                        false
                    );
                    if (oo === 0) {
                        await player.say('Of Course!');
                        if (!player.inventory.has(VOLENCIA_MOSS_ID)) {
                            await npc.say(
                                "Please don't try to deceive me!",
                                'I know it is difficult to find, but I do need Volencia Moss',
                                'After that herb, you only have one more to find.'
                            );
                        } else {
                            await npc.say(
                                'Ah, Volencia Moss, beautiful!',
                                'One final herb and the potion will',
                                'be complete. This is the most difficult to',
                                'find as it inhabits the darkness of the',
                                "underground. It is called 'Rogues Purse'",
                                'And is found in the darkest place on the Island',
                                'A secret entrance to the caverns is set into',
                                'The Northern cliffs of this land',
                                'Take care Bwana as it may be very dangerous'
                            );
                            player.message(
                                'You give the Volencia Moss to Trufitus'
                            );
                            await player.world.sleepTicks(3);
                            player.inventory.remove(VOLENCIA_MOSS_ID);
                            player.questStages.junglePotion = 5;
                            player.cache.got_rogues_purse = false;
                            delete player.cache.got_volencia_moss;
                        }
                    } else if (oo === 1) {
                        await player.say('Not yet, sorry.');
                        await npc.say(
                            'I know it is difficult to find, but I do need Volencia Moss',
                            'After that herb, you only have one more to find.'
                        );
                    }
                    break;
                }
                case 5: {
                    player.cache.got_rogues_purse = false;
                    await npc.say("Have you found 'Rogues Purse' ?");
                    const ol = await player.ask(
                        ['Yes Sir, indeedy I do!', 'Not yet, sorry.'],
                        true
                    );
                    if (ol === 0) {
                        if (!player.inventory.has(ROGUES_PURSE_ID)) {
                            await npc.say(
                                "Please don't try to deceive me!",
                                'Rogues Purse is the last herb',
                                'for the potion and possibly the most',
                                'difficult to find but I do need it.'
                            );
                        } else {
                            await npc.say(
                                'Most excellent Bwana!',
                                'You have returned all the herbs to me',
                                'and I can now finish the preparations',
                                'for the potion and thankfully divine with the gods.',
                                'Many blessings on you!',
                                'I must now prepare',
                                'please excuse me while I make',
                                'the arrangements'
                            );
                            player.message(
                                'You give the Rogues Purse to Trufitus'
                            );
                            player.inventory.remove(ROGUES_PURSE_ID);
                            player.message(
                                'Trufitus shows you some techniques in Herblaw'
                            );
                            await completeQuest(player, npc);
                            delete player.cache.got_rogues_purse;
                        }
                    } else if (ol === 1) {
                        await npc.say(
                            'Rogues Purse is the last herb',
                            'for the potion and possibly the most',
                            'difficult to find but I do need it.'
                        );
                    }
                    break;
                }
                case -1: {
                    // jungle_completed dialogue shown once, then shilo village dialogue
                    if (hasCacheKeySetTrue(player, 'jungle_completed')) {
                        await npc.say(
                            'My greatest respects Bwana',
                            'I have communed with the gods',
                            'and the future looks good for my people',
                            'We are happy now that the gods are not angry with us',
                            'With some blessings we will be safe here.'
                        );
                        delete player.cache.jungle_completed;
                        return;
                    }
                    const shilo = player.questStages.shiloVillage;
                    if (shilo === -1) {
                        const conv = Math.floor(Math.random() * 3);
                        if (conv === 0) {
                            await player.say('Greetings');
                            await npc.say(
                                'Hello Bwana.',
                                'I conclude that you have been succesful.',
                                'Mosol sent word that the village is clearing of Zombies.',
                                'You have done us all a great dead!',
                                'Why not go and visit him and have a look around Shilo',
                                'village. You may find some interesting things there!'
                            );
                        } else if (conv === 1) {
                            await player.say('Hello!');
                            await npc.say(
                                'Hello again Bwana.!',
                                'Well Done again for helping to defeat Rashiliyia.',
                                'Hopefully things will return to normal around here now.'
                            );
                        } else if (conv === 2) {
                            await player.say('Hello Bwana!');
                            await npc.say(
                                'Greetings!',
                                'I hope things are going well for you now.',
                                'I have no new information since last we spoke.',
                                'Needless to say, that if something does come up',
                                'I will certainly get in touch directly.'
                            );
                        }
                    } else if (shilo === 1 || shilo === 2) {
                        await player.say('Greetings.');
                        await npc.say(
                            'Greetings Bwana!',
                            'You look like you have some serious news...'
                        );
                        await player.say(
                            'Well, I think I may have.',
                            'I have just spoken to Mosol Rei and he says that ',
                            'Rashiliyia has returned...'
                        );
                        await npc.say(
                            'Oh dear, it is more serious than I imagined.'
                        );
                        const menu = await player.ask(
                            [
                                'How are you anyway my friend?',
                                'What do you know about Rashiliyia?',
                                'What do you know about Mosol Rei?'
                            ],
                            true
                        );
                        if (menu === 0) {
                            await npc.say("I'm very well thanks.");
                            const subMenu = await player.ask(
                                [
                                    'What do you know about Rashiliyia?',
                                    'What do you know about Mosol Rei?'
                                ],
                                true
                            );
                            if (subMenu === 0) {
                                await trufitisChat(
                                    player,
                                    npc,
                                    T.WHAT_DO_YOU_KNOW_ABOUT_RASHILIYIA
                                );
                            } else if (subMenu === 1) {
                                await trufitisChat(
                                    player,
                                    npc,
                                    T.WHAT_DO_YOU_KNOW_ABOUT_MOSEL_REI
                                );
                            }
                        } else if (menu === 1) {
                            await trufitisChat(
                                player,
                                npc,
                                T.WHAT_DO_YOU_KNOW_ABOUT_RASHILIYIA
                            );
                        } else if (menu === 2) {
                            await trufitisChat(
                                player,
                                npc,
                                T.WHAT_DO_YOU_KNOW_ABOUT_MOSEL_REI
                            );
                        }
                    } else if (atQuestStages(player, 'shiloVillage', 3, 4, 5)) {
                        await player.say('Greetings...');
                        await npc.say(
                            'Greetings Bwana, you have been away!',
                            'The situation with Rashiliyia is worsening!',
                            'I pray that you have some good news for me.'
                        );
                        await player.say(
                            'I think I found the temple of Ah Za Rhoon.'
                        );
                        let menu;
                        if (shilo === 4 || shilo === 5) {
                            menu = await player.ask(
                                [
                                    'I have some items that I need help with.',
                                    'I need some help with the Temple of Ah Za Rhoon.',
                                    "I have just buried Zadimus's corpse."
                                ],
                                true
                            );
                        } else {
                            menu = await player.ask(
                                [
                                    'I have some items that I need help with.',
                                    'I need some help with the Temple of Ah Za Rhoon.'
                                ],
                                true
                            );
                        }
                        if (menu === 0) {
                            await trufitisChat(
                                player,
                                npc,
                                T.SHOW_ME_TEMPLE_ITEMS
                            );
                        } else if (menu === 1) {
                            await npc.say(
                                'If you have found the temple, you should search it',
                                'thoroughly and see if there are any clues about',
                                'Rashiliyia.'
                            );
                            await trufitisChat(
                                player,
                                npc,
                                T.SHOW_ME_TEMPLE_ITEMS
                            );
                        } else if (menu === 2 && (shilo === 4 || shilo === 5)) {
                            await npc.say(
                                'Something seems different about you. You look like ',
                                'you have seen a ghost?'
                            );
                            await player.say(
                                'It just so happens that I have!'
                            );
                            await npc.say(
                                "Oh! So you managed to bury Zadimus's Corpse?"
                            );
                            await player.say('Yes, it was pretty grisly!');
                            const m = await player.ask(
                                [
                                    'The spirit said something about keys and kin?',
                                    'The spirit rambled on about some nonsense.'
                                ],
                                false
                            );
                            if (m === 0) {
                                await player.say(
                                    ' "The spirit said something about keys and kin?"'
                                );
                                await trufitisChat(player, npc, T.KEYS_AND_KIN);
                            } else if (m === 1) {
                                await player.say(
                                    'The spirit rambled on about some nonsense.'
                                );
                                await npc.say(
                                    'Oh, so it most likely was not very important then?'
                                );
                            }
                        }
                    } else if (shilo === 6) {
                        let chat;
                        await player.say('Greetings...');
                        if (!Object.prototype.hasOwnProperty.call(
                            player.cache,
                            'read_tomb_notes'
                        )) {
                            await npc.say(
                                'Greetings Bwana, did you find Rashiliyias Tomb?'
                            );
                            await player.say('Yes, I think so.');
                            chat = await player.ask(
                                [
                                    'I think I found Bervirius Tomb',
                                    'I have some items that I need help with.',
                                    'I need some help with the Temple of Ah Za Rhoon.'
                                ],
                                false
                            );
                            if (chat === 0) {
                                await player.say(
                                    'I think I found Bervirius Tomb.'
                                );
                                await npc.say(
                                    'Congratulations Bwana,',
                                    'but perhaps you need to make a thorough',
                                    'examination of the Ah Za Rhoon temple first?',
                                    'Show me any items you have found though.',
                                    'I may be able to help.'
                                );
                            } else if (chat === 1) {
                                await player.say(
                                    'I have some items that I need help with.'
                                );
                                await trufitisChat(
                                    player,
                                    npc,
                                    T.SHOW_ME_TEMPLE_ITEMS
                                );
                            } else if (chat === 2) {
                                await player.say(
                                    'I need some help with the Temple of Ah Za Rhoon.'
                                );
                                await trufitisChat(
                                    player,
                                    npc,
                                    T.HELP_WITH_AH_ZA_RHOON_TEMPLE
                                );
                            }
                        } else {
                            await npc.say(
                                'Greetings Bwana, did you find the tomb of Bervirius?'
                            );
                            chat = await player.ask(
                                [
                                    'Yes, I found his tomb.',
                                    "No, I didn't find a thing.",
                                    'I actually need help with something else.'
                                ],
                                true
                            );
                            if (chat === 0) {
                                await npc.say(
                                    'That is truly great news Bwana!',
                                    'You are certainly very resourceful.',
                                    'If you have found any items that you need help with',
                                    'please let me see them and I will help as much as I can.'
                                );
                                const ex5 = await player.ask(
                                    [
                                        'I actually need help with something else.',
                                        "I didn't find anything in the tomb."
                                    ],
                                    true
                                );
                                if (ex5 === 0) {
                                    await trufitisChat(
                                        player,
                                        npc,
                                        T.ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE
                                    );
                                } else if (ex5 === 1) {
                                    await trufitisChat(
                                        player,
                                        npc,
                                        T.DIDNT_FIND_ANYTHING_IN_THE_TOMB
                                    );
                                }
                            } else if (chat === 1) {
                                await npc.say(
                                    'That is a shame Bwana, we really do need to act against',
                                    'Rashiliyia soon if we are ever to stand a chance of defeating her.'
                                );
                                const chat2 = await player.ask(
                                    [
                                        'Actually I did find the tomb, I was just joking.',
                                        'I actually need help with something else.',
                                        "I didn't find anything in the tomb."
                                    ],
                                    true
                                );
                                if (chat2 === 0) {
                                    await npc.say(
                                        'Well, Bwana, this is no laughing matter.',
                                        'We need to take this very seriously and act now!',
                                        'If you have found any items at the tomb that you need help ',
                                        'with please let me see them and I will help as much as I can.'
                                    );
                                    const ex4 = await player.ask(
                                        [
                                            "I didn't find anything in the tomb.",
                                            'I actually need help with something else.'
                                        ],
                                        true
                                    );
                                    if (ex4 === 0) {
                                        await trufitisChat(
                                            player,
                                            npc,
                                            T.DIDNT_FIND_ANYTHING_IN_THE_TOMB
                                        );
                                    } else if (ex4 === 1) {
                                        await trufitisChat(
                                            player,
                                            npc,
                                            T.ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE
                                        );
                                    }
                                } else if (chat2 === 1) {
                                    await trufitisChat(
                                        player,
                                        npc,
                                        T.ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE
                                    );
                                } else if (chat2 === 2) {
                                    await trufitisChat(
                                        player,
                                        npc,
                                        T.DIDNT_FIND_ANYTHING_IN_THE_TOMB
                                    );
                                }
                            } else if (chat === 2) {
                                await trufitisChat(
                                    player,
                                    npc,
                                    T.ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE
                                );
                            }
                        }
                    } else if (shilo === 7) {
                        await npc.say(
                            "You may want to start looking for Rashiliyia's Tomb.",
                            'Do you need extra help with locating it?'
                        );
                        const off = await player.ask(
                            [
                                'Yes please.',
                                "No thanks, I've got a good idea where it is.",
                                'I actually need help with something else.'
                            ],
                            true
                        );
                        if (off === 0) {
                            await npc.say(
                                'You may like to start checking North of Ah Za Rhoon.',
                                'There must be some clue as to what to look for when locating',
                                'the tomb. Was there anything else at the tomb of Bervirius?'
                            );
                            const off2 = await player.ask(
                                [
                                    'Just a Dolmen with some symbols on it.',
                                    'Nothing that was significant.'
                                ],
                                true
                            );
                            if (off2 === 0) {
                                await npc.say(
                                    'Well, what symbols were they, perhaps that will',
                                    'give a clue to the location?'
                                );
                            } else if (off2 === 1) {
                                await npc.say(
                                    'Oh, perhaps you should take another look at them?',
                                    'Any scrap of information might be useful.'
                                );
                            }
                        } else if (off === 1) {
                            await npc.say(
                                'Well, that is very good Bwana,',
                                'perhaps you should locate it already?'
                            );
                        } else if (off === 2) {
                            await trufitisChat(
                                player,
                                npc,
                                T.ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE
                            );
                        }
                    } else if (shilo === 8) {
                        if (
                            Object.prototype.hasOwnProperty.call(
                                player.cache,
                                'dolmen_zombie'
                            ) &&
                            Object.prototype.hasOwnProperty.call(
                                player.cache,
                                'dolmen_skeleton'
                            ) &&
                            Object.prototype.hasOwnProperty.call(
                                player.cache,
                                'dolmen_ghost'
                            )
                        ) {
                            await player.say('Hello');
                            await npc.say(
                                'Greetings again Bwana.',
                                'I hope that you have managed to locate Rashiliyias Tomb.',
                                'Again, if you found any interesting items, please show',
                                'them to me.'
                            );
                            const newMenu2 = await player.ask(
                                ['What should I do now?', 'Thanks!'],
                                true
                            );
                            if (newMenu2 === 0) {
                                player.message('Trufitus scratches his head.');
                                await npc.say(
                                    'Well Bwana, if you have Rashiliyias remains,',
                                    'you need to find a way to put her spirit to rest.',
                                    'Perhaps there was a clue with one of the artifacts',
                                    'that you have?',
                                    'Why not have a look through the artifacts that you have ',
                                    'found and see if there is something clue that might help?',
                                    'If you do not have her remains, ',
                                    'you will need to find them.'
                                );
                            } else if (newMenu2 === 1) {
                                await npc.say(
                                    "You're more than welcome Bwana!",
                                    'Good luck for the rest of your quest.'
                                );
                            }
                            return;
                        } else if (
                            Object.prototype.hasOwnProperty.call(
                                player.cache,
                                'rashiliya_corpse'
                            )
                        ) {
                            await player.say('Hello...');
                            await npc.say(
                                'Greetings Bwana, I sense that something dreadful has happened.',
                                'Mosol Rei has sent word to me to say that the village is over',
                                'run with Zombies. Tell me, did you find Rashiliyias Tomb?'
                            );
                            const optD = await player.ask(
                                [
                                    'Yes, I found the tomb.',
                                    'I found Rashiliyias remains but I dropped them.',
                                    'I found nothing.'
                                ],
                                true
                            );
                            if (optD === 0) {
                                await npc.say('And what happened then?');
                                const subopt = await player.ask(
                                    [
                                        'I found Rashiliyias remains but I dropped them.',
                                        'I found nothing.'
                                    ],
                                    true
                                );
                                if (subopt === 0) {
                                    await trufitisChat(
                                        player,
                                        npc,
                                        T.DROPED_RASHILIYIA
                                    );
                                } else if (subopt === 1) {
                                    await trufitisChat(
                                        player,
                                        npc,
                                        T.FOUND_NOTHING
                                    );
                                }
                            } else if (optD === 1) {
                                await trufitisChat(
                                    player,
                                    npc,
                                    T.DROPED_RASHILIYIA
                                );
                            } else if (optD === 2) {
                                await trufitisChat(player, npc, T.FOUND_NOTHING);
                            }
                            return;
                        }
                        await player.say('Hello again..');
                        await npc.say(
                            'And greetings to you Bwana!',
                            'Have you found anything new Bwana?'
                        );
                        const tomb = await player.ask(
                            [
                                "Nope, I haven't found anything.",
                                "Yes, I've found Rashiliyia's Tomb!",
                                'I get choked when I go into Rashiliyias Tomb.'
                            ],
                            true
                        );
                        if (tomb === 0) {
                            await npc.say(
                                'Well, that is a pity? Perhaps you should keep on looking?'
                            );
                        } else if (tomb === 1) {
                            await npc.say(
                                'Very good Bwana, this is very good!',
                                'Did you find her remains?'
                            );
                            const newMenu = await player.ask(
                                [
                                    'Yes, In fact I did!',
                                    "Nope, I haven't found them yet."
                                ],
                                false
                            );
                            if (newMenu === 0) {
                                await player.say('Yes, In fact I did!');
                                await npc.say(
                                    'This is truly great Bwana.',
                                    'If you need help with the remains, ',
                                    'please show them to me.'
                                );
                            } else if (newMenu === 1) {
                                await player.say(
                                    "No, I haven't found them yet."
                                );
                                await npc.say(
                                    'You really need to find the remains before we',
                                    'can hope to defeat her and remove her influence from',
                                    'Shilo village.'
                                );
                            }
                        } else if (tomb === 2) {
                            await npc.say(
                                'Maybe you have missed something, a special clue?',
                                'It might be worth searching the temple of Ah Za Rhoon again.',
                                'Or go back to Bervirius Tomb',
                                'for a more thorough search.'
                            );
                        }
                    } else {
                        await npc.say(
                            'Greetings once again Bwana,',
                            'I have no more news since we last spoke.'
                        );
                    }
                    break;
                }
            }
        }
    }

    switch (cID) {
        case T.DROPED_RASHILIYIA: {
            player.message('Trufitus looks at you in amazement...');
            await player.world.sleepTicks(3);
            await npc.say(
                'I am truly speechless bwana.',
                'How could you have been so careless.',
                'You will need to get into her tomb again.',
                'To see if you can reclaim her remains once more',
                'Wait...I hear a voice....'
            );
            // zadimus apparition lines delivered as messages
            const nearZadimus = player.getNearbyEntitiesByID(
                'npcs',
                ZADIMUS_ID,
                10
            );
            if (!nearZadimus.length) {
                player.message(
                    'Rashiliyia has returned to her tomb and her power grows'
                );
                player.message('you must gain entry to her resting place and');
                player.message(
                    'sanctify her remains in the manner of her son.'
                );
                player.message(
                    "Remember, 'I am the key, but only kin may approach her.'"
                );
                player.message('The apparition fades into nothingness.');
                await player.world.sleepTicks(3);
                if (!player.inventory.has(BONE_SHARD_ID)) {
                    player.message(
                        'A shard of bone appears on the ground in front of you.'
                    );
                    await player.world.sleepTicks(3);
                    player.message(
                        'You take the bone shard and place it into your inventory.'
                    );
                    await player.world.sleepTicks(3);
                    player.inventory.add(BONE_SHARD_ID, 1);
                }
            }
            break;
        }
        case T.FOUND_NOTHING:
            await npc.say(
                'You really should try to find the tomb.',
                'It is our only chance if we hope to defeat Rashiliyia!'
            );
            break;
        case T.DIDNT_FIND_ANYTHING_IN_THE_TOMB: {
            await npc.say(
                'Maybe you need to look around a little more.',
                'There must be some small detail at least that can help us'
            );
            const chat3 = await player.ask(
                [
                    'I have some items that I need some help with.',
                    'I actually need help with something else.'
                ],
                true
            );
            if (chat3 === 0) {
                await trufitisChat(player, npc, T.SHOW_ME_TEMPLE_ITEMS2);
            } else if (chat3 === 1) {
                await trufitisChat(
                    player,
                    npc,
                    T.ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE
                );
            }
            break;
        }
        case T.HELP_WITH_ZADIMUS: {
            await npc.say(
                'All I know is that Zadimus was a high priest of Zamorak,',
                'Rashiliyia loved him but he did not return her affections.',
                'When she become a more powerful sorceress, she attacked the',
                'Ah Za Rhoon temple to Zamorak that Zadimus built and ',
                'reduced it to rubble. What his fate was, I do not know. ',
                'If you find anything relating to him at the temple of ',
                'Ah Za Rhoon, please let me see it.'
            );
            const ex = await player.ask(
                [
                    'Is there any sacred ground around here?',
                    'I need help with Bervirius.',
                    'I need help with Rashliyia.',
                    'I need some help with the Temple of Ah Za Rhoon.',
                    'Ok, thanks!'
                ],
                true
            );
            if (ex === 0) {
                await npc.say(
                    'The ground in the centre of the village is very sacred to us',
                    'Maybe you could try there ?'
                );
            } else if (ex === 1) {
                await trufitisChat(player, npc, T.HELP_WITH_BERVIRIUS);
            } else if (ex === 2) {
                await trufitisChat(player, npc, T.HELP_WITH_RASH);
            } else if (ex === 3) {
                await trufitisChat(player, npc, T.HELP_WITH_AH_ZA_RHOON_TEMPLE);
            } else if (ex === 4) {
                await npc.say("You're quite welcome Bwana.");
            }
            break;
        }
        case T.HELP_WITH_AH_ZA_RHOON_TEMPLE: {
            await npc.say(
                'If you have found the temple, you should search it',
                'thoroughly and see if there are any clues about',
                'Rashiliyia.'
            );
            const ex3 = await player.ask(
                [
                    'I need help with Rashlilia.',
                    'I need help with Zadimus.',
                    'I have some items that I need help with.',
                    'I need help with Bervirius.',
                    'Ok, thanks!'
                ],
                false
            );
            if (ex3 === 0) {
                await player.say('I need help with Rashliyia.');
                await trufitisChat(player, npc, T.HELP_WITH_RASH);
            } else if (ex3 === 1) {
                await player.say('I need help with Zadimus.');
                await trufitisChat(player, npc, T.HELP_WITH_ZADIMUS);
            } else if (ex3 === 2) {
                await player.say('I have some items that I need help with.');
                await trufitisChat(player, npc, T.SHOW_ME_TEMPLE_ITEMS);
            } else if (ex3 === 3) {
                await player.say('I need help with Bervirius.');
                await trufitisChat(player, npc, T.HELP_WITH_BERVIRIUS);
            } else if (ex3 === 4) {
                await player.say('Ok, thanks!');
                await npc.say("You're quite welcome Bwana.");
            }
            break;
        }
        case T.HELP_WITH_BERVIRIUS: {
            await npc.say(
                'Bervirius is the Son of Rashiliyia.',
                'His tomb may hold some clues as to how',
                'Rashiliyia may be defeated.'
            );
            const ex2 = await player.ask(
                [
                    'I need help with Zadimus.',
                    'I have some items that I need help with.',
                    'I need help with Rashliyia.',
                    'I need some help with the Temple of Ah Za Rhoon.',
                    'Ok, thanks!'
                ],
                true
            );
            if (ex2 === 0) {
                await trufitisChat(player, npc, T.HELP_WITH_ZADIMUS);
            } else if (ex2 === 1) {
                await trufitisChat(player, npc, T.SHOW_ME_TEMPLE_ITEMS);
            } else if (ex2 === 2) {
                await trufitisChat(player, npc, T.HELP_WITH_RASH);
            } else if (ex2 === 3) {
                await trufitisChat(player, npc, T.HELP_WITH_AH_ZA_RHOON_TEMPLE);
            } else if (ex2 === 4) {
                await npc.say("You're quite welcome Bwana.");
            }
            break;
        }
        case T.HELP_WITH_RASH: {
            await npc.say(
                "We need to find Rashiliyia's resting place ",
                'and learn how to put her spirit to rest. ',
                'You may find some clues to her resting place',
                'in Ah Za Rhoon or Bervirius Tomb.'
            );
            const b = await player.ask(
                [
                    'I need help with Zadimus.',
                    'I have some items that I need help with.',
                    'I need help with Bervirius.',
                    'I need some help with the Temple of Ah Za Rhoon.',
                    'Ok, thanks!'
                ],
                true
            );
            if (b === 0) {
                await trufitisChat(player, npc, T.HELP_WITH_ZADIMUS);
            } else if (b === 1) {
                await trufitisChat(player, npc, T.SHOW_ME_TEMPLE_ITEMS);
            } else if (b === 2) {
                await trufitisChat(player, npc, T.HELP_WITH_BERVIRIUS);
            } else if (b === 3) {
                await trufitisChat(player, npc, T.HELP_WITH_AH_ZA_RHOON_TEMPLE);
            } else if (b === 4) {
                await npc.say("You're quite welcome Bwana.");
            }
            break;
        }
        case T.ACTUALLY_NEED_HELP_WITH_SOMETHING_ELSE: {
            await npc.say('What could I possibly help you with Bwana?');
            const c = await player.ask(
                [
                    'I need help with Rashiliyia.',
                    'I need help with Zadimus.',
                    'I have some items that I need help with.',
                    'I need help with Bervirius.',
                    'Ok, thanks!'
                ],
                false
            );
            if (c === 0) {
                await player.say('I need help with Rashliyia.');
                await trufitisChat(player, npc, T.HELP_WITH_RASH);
            } else if (c === 1) {
                await player.say('I need help with Zadimus.');
                await trufitisChat(player, npc, T.HELP_WITH_ZADIMUS);
            } else if (c === 2) {
                await player.say('I have some items that I need help with.');
                await trufitisChat(player, npc, T.SHOW_ME_TEMPLE_ITEMS);
            } else if (c === 3) {
                await player.say('I need help with Bervirius.');
                await trufitisChat(player, npc, T.HELP_WITH_BERVIRIUS);
            } else if (c === 4) {
                await player.say('Ok, thanks!');
                await npc.say("You're quite welcome Bwana.");
            }
            break;
        }
        case T.WHAT_DO_YOU_KNOW_ABOUT_MOSEL_REI: {
            await npc.say(
                'I know he is a brave warrior, he lives in a village south of here.',
                'Your journeys have taken you far!'
            );
            const opt = await player.ask(
                [
                    'What do you know about Rashiliyia?',
                    'Do you trust him?'
                ],
                true
            );
            if (opt === 0) {
                await trufitisChat(
                    player,
                    npc,
                    T.WHAT_DO_YOU_KNOW_ABOUT_RASHILIYIA
                );
            } else if (opt === 1) {
                await npc.say(
                    'He is a little headstrong, but for the right reasons.',
                    'I think he is generally to be trusted.'
                );
                const opt2 = await player.ask(
                    [
                        'What do you know about Rashiliyia?',
                        'Mosol Rei said something about a legend?'
                    ],
                    true
                );
                if (opt2 === 0) {
                    await trufitisChat(
                        player,
                        npc,
                        T.WHAT_DO_YOU_KNOW_ABOUT_RASHILIYIA
                    );
                } else if (opt2 === 1) {
                    await trufitisChat(player, npc, T.SOMETHING_ABOUT_A_LEGEND);
                }
            }
            break;
        }
        case T.WHAT_DO_YOU_KNOW_ABOUT_RASHILIYIA: {
            await npc.say(
                "Hmmm, it's been a long time since I heard that name.",
                'She is the Queen of the Undead.',
                'and a more fearsome enemy you will be unlikely to find.',
                'I fear that you bring me news that she has returned to plague us once again?',
                'Alas I know of no weakness that she has.'
            );
            const opt3 = await player.ask(
                [
                    'So there is nothing we can do?',
                    'Should I start to evacuate the island?',
                    'Mosol Rei said something about a legend?'
                ],
                true
            );
            if (opt3 === 0) {
                await npc.say('Not that I can think of');
                const opt8 = await player.ask(
                    ['Oh, ok!', 'Should I start to evacuate the Island?'],
                    true
                );
                if (opt8 === 0) {
                    await trufitisChat(player, npc, T.OH_OK);
                } else if (opt8 === 1) {
                    await trufitisChat(player, npc, T.EVACUATE_ISLAND);
                }
            } else if (opt3 === 1) {
                await trufitisChat(player, npc, T.EVACUATE_ISLAND);
            } else if (opt3 === 2) {
                await trufitisChat(player, npc, T.SOMETHING_ABOUT_A_LEGEND);
            }
            break;
        }
        case T.SOMETHING_ABOUT_A_LEGEND: {
            await npc.say(
                'Ah, yes, there is a legend, but it is lost in the midst of antiquity...',
                'The last place to hold any details regarding this mystery',
                'was in the temple of Ah-Za_Rhoon',
                'And that has long since vanished, it crumbled into dust.'
            );
            const opt4 = await player.ask(
                [
                    'Why was it called Ah Za Rhoon?',
                    'Do you know anything more about the temple?'
                ],
                true
            );
            if (opt4 === 0) {
                await trufitisChat(player, npc, T.AH_ZA_RHOON);
            } else if (opt4 === 1) {
                await trufitisChat(player, npc, T.MORE_ABOUT_THE_TEMPLE);
            }
            break;
        }
        case T.MORE_ABOUT_THE_TEMPLE: {
            await npc.say(
                'Not much',
                'I would say that is about it...',
                'Even the great priest Zadimus who built the temple did not survive.',
                'Some say that Rashiliyia caused the temple to colapse.',
                'She was angry at Zadimus for not returning her affections.',
                'She was a great sorceress even before they met.'
            );
            const opt6 = await player.ask(
                ['Tell me more', 'Are there any traps there?'],
                true
            );
            if (opt6 === 0) {
                await npc.say(
                    "I don't know anymore.",
                    "You're very demanding aren't you!"
                );
            } else if (opt6 === 1) {
                await npc.say(
                    'How am I supposed to know?',
                    'Alot of what I know is most probably wrong',
                    'But some of it seems right to me.',
                    'Excuse me but I must get back to my studies.'
                );
            }
            break;
        }
        case T.EVACUATE_ISLAND: {
            await npc.say(
                'Yes, that may be a good idea',
                'Many people could die!',
                'If only there was a way to defeat her!'
            );
            const opt7 = await player.ask(
                [
                    'Mosol Rei said something about a legend?',
                    'Will you pack your things now?'
                ],
                true
            );
            if (opt7 === 0) {
                await trufitisChat(player, npc, T.SOMETHING_ABOUT_A_LEGEND);
            } else if (opt7 === 1) {
                await npc.say(
                    'I will wait and see what will happen.',
                    'Maybe she does not have the power to strike too far from her resting place?',
                    'But there are many things that I need to do now'
                );
                const opt9 = await player.ask(
                    ['Is her resting place important?', 'Oh, ok!'],
                    true
                );
                if (opt9 === 0) {
                    await trufitisChat(player, npc, T.RESTING_PLACE);
                } else if (opt9 === 1) {
                    await trufitisChat(player, npc, T.OH_OK);
                }
            }
            break;
        }
        case T.THANKS_FOR_THE_INFORMATION:
            await npc.say('What information?');
            player.message('Trufitus looks at you blankly, then wanders off.');
            await player.world.sleepTicks(3);
            await npc.say('Hmmm, well, you are welcome bwana.');
            break;
        case T.AH_ZA_RHOON: {
            await npc.say(
                'It is from an ancient language.',
                'The direct translation is...',
                "'Magnificence floating on water'",
                'But my research makes me believe that the temple was built on land',
                'And most likely between large bodies of water, for example large lakes.',
                'However, many people have searched for the temple, and have failed.',
                'I would hate to see you waste your time on a pointless search like that.'
            );
            if (player.questStages.shiloVillage === 1) {
                player.questStages.shiloVillage = 2;
            }
            const opt5 = await player.ask(
                [
                    'Thanks for the information!',
                    'Do you know anything more about the temple?'
                ],
                true
            );
            if (opt5 === 0) {
                await trufitisChat(player, npc, T.THANKS_FOR_THE_INFORMATION);
            } else if (opt5 === 1) {
                await trufitisChat(player, npc, T.MORE_ABOUT_THE_TEMPLE);
            }
            break;
        }
        case T.OH_OK:
            await npc.say(
                "Yes, it's a bit sad really, I liked that village."
            );
            player.message('Trufitus seems deeply touched...');
            await player.world.sleepTicks(3);
            await npc.say(
                'Well, I hope you will excuse me, but I need to get back to my studies.'
            );
            break;
        case T.WEAKNESS: {
            await npc.say(
                'I am not sure, but the legend about her certainly is long',
                "It's a pity that the temple of Ah Za Rhoon has crumbled",
                'as there my be some clues that could help us to defeat her.',
                'Usually, the largest problem is locating her resting place.'
            );
            const opt12 = await player.ask(
                [
                    'Why was it called Ah Za Rhoon?',
                    'Is her resting place important?'
                ],
                true
            );
            if (opt12 === 0) {
                await trufitisChat(player, npc, T.AH_ZA_RHOON);
            } else if (opt12 === 1) {
                await trufitisChat(player, npc, T.RESTING_PLACE);
            }
            break;
        }
        case T.RESTING_PLACE: {
            await npc.say(
                'Only a few people ever reported seeing a ghost like wraith',
                'It only ever appeared in the place where her bones were laid to rest',
                'Of course, she only has to get one of her minions to move the bones',
                'And she has a new land to unleash her undead plague.'
            );
            const opt10 = await player.ask(
                ['What are minions?', 'What are onions?'],
                true
            );
            if (opt10 === 0) {
                await npc.say(
                    'Minions are the fiendish undead creatures that she controls.',
                    'She has very few living worshippers, but they need to be dealt with at some point',
                    'Usually a strong creature of some sort will be guarding her remains',
                    'And of course, she is a very powerful spell caster herself ',
                    'Not to be tackled lightly'
                );
                const opt13 = await player.ask(
                    [
                        'Thanks for the information!',
                        'Does she have any weaknesses?'
                    ],
                    true
                );
                if (opt13 === 0) {
                    await trufitisChat(
                        player,
                        npc,
                        T.THANKS_FOR_THE_INFORMATION
                    );
                } else if (opt13 === 1) {
                    await trufitisChat(player, npc, T.WEAKNESS);
                }
            } else if (opt10 === 1) {
                player.message('Trufitus looks at you blankly');
                await player.world.sleepTicks(3);
                await npc.say('Surely you mean Minions?');
                await player.say(
                    'Yes of course, I mean Minions, what made you think I said Onions?'
                );
                player.message(
                    'Trufitus frowns at you but continues about...minions...'
                );
                await player.world.sleepTicks(3);
                await npc.say(
                    'Minions are the fiendish undead creatures that Rashiliyia controls.',
                    'She has very few living worshippers, but they need to be dealt with at some point',
                    'Usually a strong creature of some sort will be guarding the bones',
                    'And it is not to be tackled lightly'
                );
                const opt11 = await player.ask(
                    [
                        'Thanks for the information!',
                        'Does she have any weaknesses?'
                    ],
                    true
                );
                if (opt11 === 0) {
                    await trufitisChat(
                        player,
                        npc,
                        T.THANKS_FOR_THE_INFORMATION
                    );
                } else if (opt11 === 1) {
                    await trufitisChat(player, npc, T.WEAKNESS);
                }
            }
            break;
        }
        case T.SHOW_ME_TEMPLE_ITEMS2:
            await showMeItemsDialogue(player, npc, 1);
            break;
        case T.SHOW_ME_TEMPLE_ITEMS:
            await showMeItemsDialogue(player, npc, 0);
            break;
        case T.KEYS_AND_KIN:
            await npc.say(
                "Hmmm, maybe it's a clue of some kind?",
                'Well, Rashiliyias only kin, Bervirius, is entombed',
                'on a small island which lies to the South West.',
                'I will do some research into this as well.',
                'But I think we must take this clue literally',
                'and get some item that belonged to Bervirius',
                'as it may be the only way to approach Rashiliyia.'
            );
            if (player.questStages.shiloVillage === 4) {
                player.questStages.shiloVillage = 5;
            }
            break;
    }
}

async function showMeItemsDialogue(player, npc, path) {
    if (path === 0) {
        await npc.say(
            "Well, just let me see the item and I'll help as much as I can."
        );
    } else if (path === 1) {
        await npc.say(
            "Well, just show me the items and I'll help as much as I can."
        );
    }
    if (player.questStages.shiloVillage >= 6) {
        const optTemp = await player.ask(
            [
                'I need help with Zadimus.',
                'I need help with Bervirius.',
                'I need help with Rashliyia.',
                'I need some help with the Temple of Ah Za Rhoon.',
                'Ok, thanks!'
            ],
            true
        );
        if (optTemp === 0) {
            await trufitisChat(player, npc, T.HELP_WITH_BERVIRIUS);
        } else if (optTemp === 1) {
            await trufitisChat(player, npc, T.HELP_WITH_RASH);
        } else if (optTemp === 2) {
            await trufitisChat(player, npc, T.HELP_WITH_AH_ZA_RHOON_TEMPLE);
        } else if (optTemp === 3) {
            await npc.say("You're quite welcome Bwana.");
        }
        return;
    }
    // no stone-plaque in bank or inventory
    if (!player.inventory.has(956)) {
        // STONE_PLAQUE (bank-check not available; inventory only)
        await npc.say(
            'Look for something that can identify the place.',
            'Leave no stone unturned.'
        );
    } else {
        await npc.say(
            'We need to identify that the place you have found',
            'is indeed Ah Za Rhoon.'
        );
    }
    // player has not explored inner Ah Za Rhoon
    if (!Object.prototype.hasOwnProperty.call(
        player.cache,
        'obtained_shilo_info'
    )) {
        await npc.say(
            'Look for details of Rashiliyias Kin, these may be well hidden.',
            'There is a legend about Rashiliyia, look for it in the temple.',
            'Look for something relating to Zadimus at the temple.',
            'And best of luck!'
        );
    } else {
        await npc.say(
            'Any scrolls or information about Rashiliyias Kin would be helpful',
            'Have you got any items concerning Rashiliyia?',
            'If so, please show me them.',
            'There must be something relating to Zadimus at the temple',
            'Did you find anything? If so, let me see it.',
            'And best of luck!'
        );
    }
}


// onTalkNpc
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id !== TRUFITUS_ID) {
        return false;
    }

    player.engage(npc);
    await trufitisChat(player, npc, -1);
    player.disengage();
    return true;
}

// onOpLoc (game objects: vine / palm / scorched earth / rocks)
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const jungle = player.questStages.junglePotion;
    const legends = player.questStages.legendsQuest || 0;

    if (gameObject.id === SNAKE_JUNGLE_VINE_ID) {
        if (jungle !== 1 && legends === 0) {
            player.message('Yep, it looks like a vine...');
            return true;
        }
        if (legends >= 1 && legends <= 6) {
            player.message('Yep, it looks like a vine...');
            return true;
        }
        if (
            !player.inventory.has(UNIDENTIFIED_SNAKE_WEED_ID) &&
            !player.inventory.has(SNAKE_WEED_ID) &&
            (legends >= 6 ||
                (!hasCacheKeySetTrue(player, 'got_snake_weed') &&
                    jungle === 1))
        ) {
            player.message('Small amounts of a herb are growing near this vine');
            await player.world.sleepTicks(3);
            player.world.addPlayerDrop(
                player,
                { id: UNIDENTIFIED_SNAKE_WEED_ID },
                gameObject.x,
                gameObject.y
            );
            if (jungle === 1) {
                player.cache.got_snake_weed = true;
            }
        } else {
            player.message('Yep, it looks like a vine...');
        }
        return true;
    } else if (gameObject.id === ARDRIGAL_PALM_TREE_ID) {
        if ((jungle || 0) < 1 && legends === 0) {
            player.message('You find nothing of interest this time, sorry!');
            return true;
        }
        if (legends >= 1 && legends <= 6) {
            player.message('You find nothing of interest this time, sorry!');
            return true;
        }
        if (
            !player.inventory.has(ARDRIGAL_ID) &&
            (legends >= 6 ||
                (!hasCacheKeySetTrue(player, 'got_ardigal') && jungle === 2))
        ) {
            // unidentified ardrigal maps to 933; spawn identified ardrigal
            player.message('You find a herb plant growing at the base of the palm');
            await player.world.sleepTicks(3);
            player.world.addPlayerDrop(
                player,
                { id: ARDRIGAL_ID },
                gameObject.x,
                gameObject.y
            );
            if (jungle === 2) {
                player.cache.got_ardigal = true;
            }
        } else {
            player.message('You find nothing of interest this time, sorry!');
        }
        return true;
    } else if (gameObject.id === SITO_SCORCHED_EARTH_ID) {
        if (
            !player.inventory.has(SITO_FOIL_ID) &&
            !hasCacheKeySetTrue(player, 'got_sito_foil') &&
            jungle === 3
        ) {
            // unidentified sito foil maps to 933; spawn identified sito foil
            player.message(
                'A small herb plant is growing in the scorched soil.'
            );
            await player.world.sleepTicks(3);
            player.world.addPlayerDrop(
                player,
                { id: SITO_FOIL_ID },
                gameObject.x,
                gameObject.y
            );
            player.cache.got_sito_foil = true;
        } else {
            player.message('You just find scorched earth.');
        }
        return true;
    } else if (gameObject.id === VOLENCIA_ROCKS_ID) {
        if (
            !player.inventory.has(VOLENCIA_MOSS_ID) &&
            !hasCacheKeySetTrue(player, 'got_volencia_moss') &&
            jungle === 4
        ) {
            // NOTE: UNIDENTIFIED_VOLENCIA_MOSS maps to 933; spawn identified moss.
            player.message(
                'Small amounts of herb moss are growing at the base of this rock'
            );
            await player.world.sleepTicks(3);
            player.world.addPlayerDrop(
                player,
                { id: VOLENCIA_MOSS_ID },
                gameObject.x,
                gameObject.y
            );
            player.cache.got_volencia_moss = true;
        } else {
            player.message('You find nothing of interest.');
        }
        return true;
    }

    return false;
}

// onOpBound (rogues purse cavern wall)
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (wallObject.id !== ROGUES_PURSE_WALL_ID) {
        return false;
    }

    const jungle = player.questStages.junglePotion;
    if (
        !player.inventory.has(ROGUES_PURSE_ID) &&
        !hasCacheKeySetTrue(player, 'got_rogues_purse') &&
        jungle === 5
    ) {
        // NOTE: UNIDENTIFIED_ROGUES_PURSE maps to 933; spawn identified purse.
        player.message(
            'Small amounts of herb fungus are growing at the base of this cavern wall'
        );
        await player.world.sleepTicks(3);
        player.world.addPlayerDrop(
            player,
            { id: ROGUES_PURSE_ID },
            player.x,
            player.y
        );
        player.cache.got_rogues_purse = true;
    } else {
        player.message('You find nothing of interest.');
    }
    return true;
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onWallObjectCommandOne
};
