// Army of Obscurity: custom Halloween minigame. Ash/Reldo/Urhney/Curator
// dialogue, the Necronomicon bookcase, the ritual, and the burn easter egg.

const { customQuestsEnabled: questsEnabled } = require('../../../quests/custom-gate.js');

// stage constants
const STAGE_COMPLETED = -1;
const STAGE_NOT_STARTED = 0;
const STAGE_AGREED_TO_GET_BOOK = 1;
const STAGE_TALKED_TO_RELDO = 2;
const STAGE_ATTEMPTED_TO_TAKE_BOOK = 3;
const STAGE_TOLD_ASH_WORDS_BAD = 4;
const STAGE_GOT_NEW_WORD = 5;
const STAGE_OBTAINED_NECRONOMICON = 6;
const STAGE_OFF_TO_MUSEUM = 7;
const STAGE_OBTAINED_AMULET = 8;

// ids
const ASH_ID = 837;
const URHNEY_ID = 10;
const RELDO_ID = 20;
const CURATOR_ID = 39;

const NECRONOMICON_ID = 1589;
const ZOMBITE_AMULET_ID = 1590;
const BOOMSTICK_ID = 1591;
const BONES_ID = 20;

const BOOKCASE_ID = 67;
const FIRE_IDS = new Set([97, 274]);

// proximity range for hut co-located npcs
const NEAR_RANGE = 20;

// small helpers mirroring OpenRSC Functions.*/RuneScript.*
function getStage(player) {
    const s = player.cache.army_of_obscurity;
    return typeof s === 'number' ? s : STAGE_NOT_STARTED;
}

function setStage(player, value) {
    player.cache.army_of_obscurity = value;
}

function ifheld(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

function hasEquipped(player, id) {
    return !!player.inventory.items.find(
        (item) => item.id === id && item.equipped
    );
}

// ifnearnpc(id): nearest free npc of that id near the player, or undefined
function getNearNpc(player, id) {
    return player.getNearestEntityByID('npcs', id, NEAR_RANGE);
}

// point a second npc's interlocutor at the player so it can speak
async function npcSpeak(player, npc, ...lines) {
    const previous = npc.interlocutor;
    npc.interlocutor = player;

    try {
        await npc.say(...lines);
    } finally {
        npc.interlocutor = previous;
    }
}

// bookcase (Reldo's library corner): searchBookcase + teleportPlayer
async function teleportPlayer(player) {
    const { world } = player;

    player.message('@que@You reach for the book...');
    await world.sleepTicks(5);
    player.message('@que@As you do so you feel a low rumble');
    await world.sleepTicks(5);
    player.message('@que@An otherworldy voice cries out');
    await world.sleepTicks(5);
    player.message('@que@@yel@MORTAL FOOL! YOU HAVE USED THE WRONG WORDS!');
    await world.sleepTicks(5);
    player.teleport(161, 453, true);
}

async function searchBookcase(player, stage) {
    const { world } = player;

    if (stage === STAGE_TALKED_TO_RELDO) {
        player.message('@que@You search the bookcase...');
        await world.sleepTicks(5);
        player.message('@que@You see an odd-looking book');
        await world.sleepTicks(5);
        player.message('@que@Necronomicon ex mortis');
        await world.sleepTicks(5);
        await player.say(
            'This must be it',
            'Now what were the words...',
            'Klatoo...',
            'Verata...',
            'Nectar!'
        );
        await teleportPlayer(player);
        setStage(player, STAGE_ATTEMPTED_TO_TAKE_BOOK);
    } else if (stage === STAGE_ATTEMPTED_TO_TAKE_BOOK) {
        player.message('@que@As you reach for the book');
        await world.sleepTicks(5);
        player.message('@que@You stop to reconsider');
        await world.sleepTicks(5);
        player.message(
            "@que@Perhaps it wouldn't be very smart to try taking the book again"
        );
        await world.sleepTicks(5);
        player.message('@que@without knowing the correct words');
    } else if (stage === STAGE_GOT_NEW_WORD) {
        player.message('@que@You search the bookcase...');
        await world.sleepTicks(5);
        player.message('@que@And locate the book again');
        await world.sleepTicks(5);
        player.message('@que@Necronomicon ex mortis');
        await world.sleepTicks(5);
        await player.say('Here it is', 'Now what were the words...');

        const words1 = ['Kapo!', 'Klatoo!', 'Klomo!'];
        const word1 = await player.ask(words1, false);
        if (word1 === -1) {
            return;
        }
        await player.say(words1[word1]);

        const words2 = ['Verata!', 'Veranda!', 'Vactata!'];
        const word2 = await player.ask(words2, false);
        if (word2 === -1) {
            return;
        }
        await player.say(words2[word2]);

        const words3 = ['Necktie!', 'Nectar!', 'Nicto!', 'Nec-*cough*'];
        const word3 = await player.ask(words3, false);
        if (word3 === -1) {
            return;
        }
        await player.say(words3[word3]);

        if (word1 !== 1 || word2 !== 0 || word3 !== 2) {
            await teleportPlayer(player);
            return;
        }

        player.message('@que@You reach for the book...');
        await world.sleepTicks(5);
        player.message('@que@And remove it from the shelf');
        await world.sleepTicks(5);
        player.inventory.add(NECRONOMICON_ID, 1);
        setStage(player, STAGE_OBTAINED_NECRONOMICON);
    } else if (stage >= STAGE_OBTAINED_NECRONOMICON) {
        if (ifheld(player, NECRONOMICON_ID, 1)) {
            player.message(
                "@que@There's nothing of interest now that you've taken the " +
                    'Necronomicon'
            );
            return;
        }

        player.message('@que@You search the bookcase...');
        await world.sleepTicks(5);
        player.message('@que@Somehow the Necronomicon returned!');
        await world.sleepTicks(5);
        player.message('@que@You reach out to take the book...');
        await world.sleepTicks(5);
        player.message('@que@But wait...');
        await world.sleepTicks(5);
        player.message('@que@Do you say the words again?');
        await world.sleepTicks(5);

        const option = await player.ask(['Yes', 'No'], false);
        if (option === 0) {
            player.message(
                "@que@You've heard the words so many times at this point"
            );
            player.message('@que@you say them without really having to think');
            await world.sleepTicks(5);
            await player.say('Klatoo!', 'Verata!', 'Nicto!');
            player.message('@que@You remove the book from the shelf');
            player.inventory.add(NECRONOMICON_ID, 1);
            await world.sleepTicks(5);
            player.message('@que@Good thing you said the words again');
            await world.sleepTicks(5);
            player.message('@que@Better safe than sorry');
        } else if (option === 1) {
            player.message('@que@You take the book from the shelf');
            player.inventory.add(NECRONOMICON_ID, 1);
            await world.sleepTicks(5);
            player.message('@que@After waiting a few seconds');
            await world.sleepTicks(5);
            player.message('@que@Nothing happens');
            await world.sleepTicks(5);
            player.message(
                "@que@Looks like you didn't need to say the words again after all!"
            );
            await world.sleepTicks(5);
            player.message("@que@Good thing you didn't say them");
            player.message("@que@You probably would've felt rather silly");
        }
    }
}

// Reldo (Varrock library): reldoDialogue
async function reldoDialogue(player, npc) {
    const stage = getStage(player);

    if (stage === STAGE_AGREED_TO_GET_BOOK) {
        await player.say(
            'I was told to look for a particularly evil magic book'
        );
        await npc.say(
            'An evil magical book you say?',
            "I don't think we have any books like that in my library",
            'Although there was a strange fellow',
            'who came by recently',
            'He was messing with the books in the bookcase over there',
            'and there has been a foul smell in that corner since',
            'I suspect that he may have left something there',
            "I just haven't been able to find it"
        );
        setStage(player, STAGE_TALKED_TO_RELDO);
    } else if (stage === STAGE_TALKED_TO_RELDO) {
        await npc.say(
            'Did you find whatever was making that awful smell?',
            'Perhaps try checking that bookcase in the corner'
        );
    } else if (stage === STAGE_GOT_NEW_WORD) {
        await npc.say(
            "Oh you're back",
            "I honestly didn't even see you leave",
            'Did you get rid of that weird book yet?'
        );
        await player.say('no');
    } else if (ifheld(player, NECRONOMICON_ID, 1)) {
        await npc.say(
            'Oh that smell...',
            'Thankyou for finding that, please make haste now'
        );
    }
}

// Father Urhney (Lumbridge Swamp hut): fatherUrhneyDialogue + recoverBoomstick
async function fatherUrhneyDialogue(player, npc) {
    const { world } = player;
    const stage = getStage(player);

    if (stage >= STAGE_NOT_STARTED && stage <= STAGE_ATTEMPTED_TO_TAKE_BOOK) {
        await npc.say(
            "Won't you simpletons leave me alone?",
            "It's bad enough that this loudmouth braggart suddenly moved in",
            "Now he's bringing his friends!"
        );
    } else if (stage === STAGE_TOLD_ASH_WORDS_BAD) {
        await npc.say(
            'Of course I do!',
            "It's a simple enchantment-breaking spell",
            'But of course you got it wrong',
            "I'm surprised this fool even knows his own name",
            'Perhaps he hit his head when he "travelled back to our time"',
            'Such nonsense'
        );
        player.message('@que@You decide to interrupt Father Urhney');
        await world.sleepTicks(5);
        player.message('@que@Otherwise this may go on for some time');
        await world.sleepTicks(5);
        await player.say("What's the proper magic words then?");
        player.message('@que@Father Urhney looks upset at being interrupted');
        await world.sleepTicks(5);
        await npc.say(
            'Well alright then you impatient baboon',
            'The first two words you were given were surprisingly correct',
            'Klatoo and Verata are indeed words that should be said',
            'But this dunderheaded villain told you "nectar" for the third word',
            'The actual third word is in fact',
            'Nicto!',
            'Saying those three words precisely should allow you to retrieve ' +
                'the book'
        );
        setStage(player, STAGE_GOT_NEW_WORD);
    } else if (stage === STAGE_GOT_NEW_WORD) {
        await npc.say(
            'What about it?',
            "I've already given you the words!",
            'Or have you forgotten them now, too?'
        );
        player.message('@que@Father Urhney lets out a huge sigh');
        await world.sleepTicks(5);
        await npc.say(
            'One more time',
            'The words are',
            'Klatoo!',
            'Verata!',
            'Nicto!',
            'Now leave my home!'
        );
    } else if (stage === STAGE_COMPLETED) {
        await npc.say(
            'Finally that troublesome fellow is gone',
            "I'm not sure where he went, but at least he's not here anymore",
            'Off with you too now, shoo'
        );
    }
}

async function recoverBoomstick(player, npc) {
    await npc.say(
        'Yes yes of course you did',
        'I have it',
        "Don't bother asking me how I got it",
        'Just take it back and get out of here'
    );
    player.message('@que@Father Urhney hands you the Boomstick');
    player.inventory.add(BOOMSTICK_ID, 1);
}

// where did ash go menu, plus boomstick recovery if not carried
async function urhneyCompletedDialogue(player, npc) {
    const choice = await player.ask(
        ['Where did Ash go?', 'I lost the Boomstick'],
        true
    );

    if (choice === 0) {
        await fatherUrhneyDialogue(player, npc);
    } else if (choice === 1) {
        await recoverBoomstick(player, npc);
    }
}

// museum curator (Varrock museum): gives the amulet, re-issues a lost one
async function curatorDialogue(player, npc) {
    const { world } = player;
    const stage = getStage(player);

    if (stage === STAGE_OFF_TO_MUSEUM) {
        await player.say('Do you have any ancient amulets lying around?');
        await npc.say(
            'Ancient amulets you say?',
            'Typically no',
            'But a strange man tried to put an amulet in one of my display cases',
            'He insisted that it was ancient and valuable',
            'I confiscated the amulet and had him forcefully removed',
            "I can't have such hysterics in my museum",
            'The amulet looks neither ancient nor valuable though',
            'You can have it if you want'
        );
        player.message('@que@The museum curator hands you the amulet');
        await world.sleepTicks(5);
        player.inventory.add(ZOMBITE_AMULET_ID, 1);
        setStage(player, STAGE_OBTAINED_AMULET);
    } else if (stage >= STAGE_OBTAINED_AMULET) {
        await player.say("I've lost the amulet you gave me");
        await npc.say(
            'Luckily for you',
            'It seems like trinkets have a way of finding their way back to me',
            'Try to be more careful from now on'
        );
        player.message('@que@The museum curator hands you the amulet');
        await world.sleepTicks(5);
        player.inventory.add(ZOMBITE_AMULET_ID, 1);
    } else if (stage === STAGE_COMPLETED) {
        await player.say("I've lost the amulet you gave me");
        await npc.say(
            'Luckily for you',
            'I found it smuggled into one of my display cases...',
            "Are you sure you weren't the one that put it there?"
        );
        await player.say("no, it wasn't me");
        await npc.say(
            "I hope it doesn't keep coming back then",
            'Please try to be more careful from now on'
        );
        player.message('@que@The museum curator hands you the amulet');
        await world.sleepTicks(5);
        player.inventory.add(ZOMBITE_AMULET_ID, 1);
    }
}

// Ash (Lumbridge Swamp hut): ashDialogue, the driver
async function ashDialogue(player, npc) {
    const { world } = player;
    const stage = getStage(player);

    switch (stage) {
        case STAGE_NOT_STARTED: {
            await npc.say(
                'Get inside!',
                'How did you make it past all the zombites?'
            );

            let option = await player.ask(
                [
                    'What are "zombites"?',
                    "There's nothing out there",
                    "I'm outta here"
                ],
                true
            );

            if (option === -1 || option === 2) {
                return;
            }

            await npc.say(
                'What are you talking about?',
                "Obviously there's evil hellspawn all over the place",
                "If we don't stop them they're gonna kill everyone!",
                "And then I'll never be able to get back home"
            );

            option = 0;
            while (option !== 2) {
                option = await player.ask(
                    [
                        'Who are you?',
                        'Where are you from?',
                        'Alright how can we stop the zombites?',
                        "You sound insane I'm leaving"
                    ],
                    true
                );

                if (option === -1 || option === 3) {
                    return;
                } else if (option === 0) {
                    await npc.say(
                        "Name's Ash - housewares",
                        "I'm the guy that's gonna save all our asses"
                    );
                } else if (option === 1) {
                    await npc.say(
                        'I\'m from a little place known as "the future"',
                        "And I'd kinda like to get back there as soon as " +
                            'possible'
                    );
                }
            }

            await npc.say(
                "Well, we're going to need to get our hands on a special book",
                "It's called the Necronomicon Ex-Mortis",
                'The Book of the Dead',
                "Thankfully I've got a lead on where we can find it",
                "Apparently there's a library in some lousy castle",
                'In some lousy town called "Far-rock" or something',
                'You should head there and take a look',
                "There's this guy named Reldo or something that can probably " +
                    'help you'
            );

            option = await player.ask(
                ["Alright I'll see what I can do", "No way you're crazy"],
                true
            );

            if (option === -1 || option === 1) {
                return;
            }

            await npc.say(
                'Before you go you need to know one more thing',
                'In order to take the book',
                'You need to say some magic words',
                "Or at least that's what I was told",
                'The words are',
                'Klatoo!',
                'Verata!',
                'uhh...',
                'Nectar!',
                'Have fun'
            );
            setStage(player, STAGE_AGREED_TO_GET_BOOK);
            break;
        }
        case STAGE_AGREED_TO_GET_BOOK:
        case STAGE_TALKED_TO_RELDO:
            await npc.say(
                'What are you sitting around talking to me for?',
                'Go get that book so I can get out of here!',
                'And so that you can be rid of those zombites',
                'Remember when you go to grab the book',
                'you need to say the magic words',
                'Klatoo!',
                'Varata!',
                'uhh...',
                'Nectar!',
                'Now get out of here',
                'Go bother that Reldo guy I told you about'
            );
            break;
        case STAGE_ATTEMPTED_TO_TAKE_BOOK: {
            await npc.say(
                "I didn't expect to see you again",
                'Well did you get the book?'
            );

            const answer = await player.ask(
                ['The words you gave me were wrong', 'No not yet'],
                true
            );
            if (answer !== 0) {
                return;
            }

            await npc.say(
                'What?',
                "That's ridiculous",
                "Look maybe I don't remember every single syllable",
                'but those are basically the words',
                'Maybe you could try-'
            );
            setStage(player, STAGE_TOLD_ASH_WORDS_BAD);

            // If Father Urhney is busy / not present
            const urhney = getNearNpc(player, URHNEY_ID);
            if (!urhney) {
                player.message('@que@Urhney suddenly looks very annoyed');
                await world.sleepTicks(5);
                player.message('@que@Perhaps he has something to say');
                return;
            }

            // Urhney is now the interacting NPC
            urhney.lock();
            try {
                await npcSpeak(
                    player,
                    urhney,
                    "You're a couple of unschooled, uneducated charlatans",
                    'Neither of you know anything about getting rid of evil',
                    'I guess I will have to lend my expertise'
                );
            } finally {
                urhney.unlock();
            }

            // Try to switch back to Ash
            if (getNearNpc(player, ASH_ID)) {
                await npc.say(
                    'Well hello Mr. Fancy Pants',
                    "Why don't you go talk to this guy then",
                    "If he's so smart"
                );
            }
            break;
        }
        case STAGE_TOLD_ASH_WORDS_BAD:
            await npc.say(
                "Why don't you talk to Mr. Fancy Pants over there",
                'Obviously he has something to say'
            );
            break;
        case STAGE_GOT_NEW_WORD:
            await npc.say(
                'Well you got the right word from Padre over there',
                "didn't you?",
                'See if you can get the book now'
            );
            break;
        case STAGE_OBTAINED_NECRONOMICON: {
            await player.say('I got the book');
            await npc.say(
                'You made it back again?',
                'You seem to be pretty good at surviving out there',
                "So it's time for another suicide mission",
                'Now that you have the book',
                'We need one more item to get rid of these zombites',
                'Once and for all',
                'And most importantly',
                'To get me back home'
            );

            if (
                (await player.ask(
                    ['What do we need?', "I'm done doing stuff right now"],
                    true
                )) !== 0
            ) {
                return;
            }

            await npc.say(
                'We need a special, ancient amulet',
                'Luckily I know where to get it'
            );

            const option = await player.ask(
                [
                    'How do you always know where to find the things we need?',
                    'Alright, where should I look?'
                ],
                true
            );

            if (option === -1) {
                return;
            } else if (option === 0) {
                await npc.say('Because I\'m just that good', 'But anyway');
            }

            await npc.say(
                'Where do you go to find old stuff?',
                "That's right",
                'A museum',
                'There\'s a museum in that town where you found the book',
                'Go talk to the curator there',
                'That guy probably knows something'
            );
            setStage(player, STAGE_OFF_TO_MUSEUM);
            break;
        }
        case STAGE_OFF_TO_MUSEUM:
            await npc.say(
                "Aren't you supposed to be headed off to the museum?",
                'We need that amulet'
            );
            break;
        case STAGE_OBTAINED_AMULET:
            await ashObtainedAmuletDialogue(player, npc);
            break;
        case STAGE_COMPLETED:
            // Admin only dialogue, Ash is invisible now otherwise.
            if (
                typeof player.isAdministrator === 'function' &&
                player.isAdministrator()
            ) {
                await ashCompletedDialogue(player, npc);
            }
            break;
        default:
            break;
    }
}

async function ashObtainedAmuletDialogue(player, npc) {
    const { world } = player;

    if (!ifheld(player, ZOMBITE_AMULET_ID, 1)) {
        await npc.say('Did you get the amulet?');
        await player.say('Well I did');

        if (hasEquipped(player, ZOMBITE_AMULET_ID)) {
            await player.say(
                'But it looked so sinister i just had to try it on'
            );
            await npc.say('Are you kidding me?');
            const justKidding = await player.ask(
                [
                    "Right I'll get it off then",
                    "Honestly i don't want to part with it"
                ],
                true
            );
            if (justKidding !== 1) {
                return;
            }
            await npc.say(
                'Snap out of it!!',
                "Remember what we've been fighting for"
            );
            await player.say('... We?');
            return;
        }

        await player.say('But I seem to have misplaced it');
        await npc.say(
            'Are you kidding me?',
            "Well you'd best go find it",
            "Or I'll never get home!",
            'Oh',
            "And we won't be able to stop the zombites"
        );
        await player.say('Where should I look?');
        await npc.say(
            'Why would I know?',
            'Retrace your steps',
            'Start by talking to the museum curator or something'
        );
        return;
    }

    await player.say("I've got the amulet");

    if (!ifheld(player, NECRONOMICON_ID, 1)) {
        await npc.say('Great', 'Now just hand it to me', 'Along with the book-');
        player.message('@que@Ash pauses');
        await world.sleepTicks(5);
        await npc.say('You do have the book right?');
        await player.say('I did', 'But I must have lost it at some point');
        await npc.say(
            "Well you'd better go find it again!",
            'Maybe try looking where you first got it?'
        );
        return;
    }

    await npc.say(
        'Great',
        'Now we just need to say some more hocus pocus so I can go home',
        'What were those words now...',
        'Candy Salmon Robe... Nosferatu... Raising Arizona...'
    );

    // need Father Urhney for the ritual; stop if he can't be reached
    const urhney = getNearNpc(player, URHNEY_ID);
    if (!urhney) {
        player.message('@que@Despite being occupied...');
        await world.sleepTicks(5);
        player.message('@que@Father Urhney looks like he really wants to interject');
        await world.sleepTicks(5);
        player.message(
            "@que@Perhaps you should try to talk to Ash again when Father Urhney " +
                "isn't busy"
        );
        return;
    }

    // Father Urhney is now the interacting NPC
    urhney.lock();
    try {
        await npcSpeak(
            player,
            urhney,
            'Are you at it again, you halfwitted macaque',
            'If any spellcastings and incantations are to be done around here',
            'Then let me handle it before you two send us all into the ' +
                'netherworld',
            "It seems that you're trying to use ancient kharidian magic",
            'I happen to have a book on the matter by one A. Al-Hazred'
        );
        player.message(
            '@que@Father Urhney finds a book and briefly flips through the pages'
        );
        await world.sleepTicks(5);
        await npcSpeak(
            player,
            urhney,
            'Yes, here we are',
            'Place the book on the table and the amulet on top if you please'
        );

        player.message('@que@You do as father Urhney instructs');
        player.inventory.remove(NECRONOMICON_ID, 1);
        player.inventory.remove(ZOMBITE_AMULET_ID, 1);
        await world.sleepTicks(5);

        await npcSpeak(
            player,
            urhney,
            'Now this should be the end of all this nonsense',
            'Kanda! Samonda Roba Areda Gyes Indy En-zeen Nos-Feratos'
        );
        player.message('@que@The ground begins to rumble');
        await world.sleepTicks(5);
        await npcSpeak(
            player,
            urhney,
            'Nos-Feratos Amen-non. Ak-adeem! Razin Arozonia!'
        );
        player.message(
            '@que@The cabin begins to shake and you hear screams from the outside'
        );
        await world.sleepTicks(5);
        await npcSpeak(player, urhney, 'Kanda!');
        player.message('@que@Everything immediately goes still');
        await world.sleepTicks(5);
    } finally {
        urhney.unlock();
    }

    if (getNearNpc(player, ASH_ID)) {
        // The interacting NPC is now Ash
        await npc.say('Hail to the king, baby');
        player.message('@que@Ash is teleported away');
        await world.sleepTicks(5);
    } else {
        // The interacting NPC is not Ash
        player.message('@que@Ash begins to be teleported away');
        await world.sleepTicks(5);
        player.message('@que@As this happens you hear him say something');
        await world.sleepTicks(5);
        player.message('@que@@yel@Ash: Hail to the king, baby');
    }

    // "Teleport" Ash + spawn the reward loot where he stood.
    setStage(player, STAGE_COMPLETED);
    completionTeleBubble(player, npc.x, npc.y);

    // Spawn Boomstick where Ash stood
    world.addPlayerDrop(player, { id: BOOMSTICK_ID, amount: 1 }, npc.x, npc.y);

    // spawn bones
    const boneSpawns = [
        [120, 708],
        [118, 707],
        [116, 706],
        [114, 709],
        [111, 710],
        [112, 712],
        [112, 714],
        [116, 713],
        [118, 714],
        [120, 712],
        [121, 711]
    ];
    for (const [x, y] of boneSpawns) {
        world.addPlayerDrop(player, { id: BONES_ID, amount: 1 }, x, y);
    }

    player.message('@que@An odd item falls to the ground where Ash once stood');
    await world.sleepTicks(5);

    player.message(
        '@que@@gre@Congratulations! You have completed Army of Obscurity!'
    );
}

async function ashCompletedDialogue(player, npc) {
    const { world } = player;

    await npc.say(
        'Great Scott, why didn\'t that work?!',
        'Urhney I thought you knew what you were doing!!',
        "I'm supposed to be back to the future right now!"
    );
    let screaming = false;
    const urhney = getNearNpc(player, URHNEY_ID);
    if (!urhney) {
        player.message('@que@Despite being occupied...');
        await world.sleepTicks(5);
        player.message('@que@Father Urhney looks like he really wants to interject');
        await world.sleepTicks(5);
        screaming = true;
        await npc.say('AAaaauaaugh');
    } else {
        // Urhney now
        await world.sleepTicks(2);
        await npcSpeak(
            player,
            urhney,
            'I wish my mother had just spelled my name Ernie.'
        );
        await world.sleepTicks(2);
    }
    if (getNearNpc(player, ASH_ID) && !screaming) {
        // The interacting NPC is now Ash
        await npc.say('AAaaauaaugh');
    }
    player.message('@que@Ash seems very distressed and confused.');
}

// blue teleport bubble at Ash's tile, broadcast to nearby players
function completionTeleBubble(player, x, y) {
    player.sendTeleportBubble(x, y);
    for (const other of player.getNearbyEntities('players', 16)) {
        other.sendTeleportBubble(x, y);
    }
}

// burnNecronomicon: throwing the book in a fire does nothing (easter egg)
async function burnNecronomicon(player) {
    const { world } = player;

    player.message('@que@You throw the book into the fire.');
    await world.sleepTicks(5);
    player.message('@que@The book is unaffected by the flames');
    await world.sleepTicks(5);
    player.message('@que@Strange.');
    await world.sleepTicks(5);
    player.message("@que@You feel like that should've worked");
}

// plugin entry points
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === ASH_ID) {
        player.engage(npc);
        try {
            await ashDialogue(player, npc);
        } finally {
            player.disengage();
        }
        return true;
    }

    const stage = getStage(player);

    if (npc.id === RELDO_ID) {
        // intercepts at stages 1/2/5 or while holding the necronomicon, unless
        // Shield of Arrav's read-the-book dialogue is still pending
        const clearOfShieldOfArrav =
            player.questStages.shieldOfArrav !== 1 && !!player.cache.read_arrav;
        if (
            clearOfShieldOfArrav &&
            (stage === STAGE_AGREED_TO_GET_BOOK ||
                stage === STAGE_TALKED_TO_RELDO ||
                stage === STAGE_GOT_NEW_WORD ||
                ifheld(player, NECRONOMICON_ID, 1))
        ) {
            player.engage(npc);
            try {
                await reldoDialogue(player, npc);
            } finally {
                player.disengage();
            }
            return true;
        }
        return false;
    }

    if (npc.id === URHNEY_ID) {
        // in-progress owns urhney; completed only intercepts to recover boomstick
        if (stage >= STAGE_AGREED_TO_GET_BOOK && stage <= STAGE_GOT_NEW_WORD) {
            player.engage(npc);
            try {
                await fatherUrhneyDialogue(player, npc);
            } finally {
                player.disengage();
            }
            return true;
        }

        if (
            stage === STAGE_COMPLETED &&
            !ifheld(player, BOOMSTICK_ID, 1)
        ) {
            player.engage(npc);
            try {
                await urhneyCompletedDialogue(player, npc);
            } finally {
                player.disengage();
            }
            return true;
        }
        return false;
    }

    if (npc.id === CURATOR_ID) {
        // amulet option shown at stage, or reissued if lost post-completion
        const lostAmulet =
            (stage === STAGE_COMPLETED || stage >= STAGE_OBTAINED_AMULET) &&
            !ifheld(player, ZOMBITE_AMULET_ID, 1) &&
            !hasEquipped(player, ZOMBITE_AMULET_ID);

        if (stage === STAGE_OFF_TO_MUSEUM || lostAmulet) {
            player.engage(npc);
            try {
                await curatorDialogue(player, npc);
            } finally {
                player.disengage();
            }
            return true;
        }
        return false;
    }

    return false;
}

// search command on bookcase id 67; only for stages that implement it
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        gameObject.id !== BOOKCASE_ID ||
        gameObject.x < 128 ||
        gameObject.x > 136 ||
        gameObject.y < 452 ||
        gameObject.y > 461
    ) {
        return false;
    }

    const stage = getStage(player);

    if (
        stage === STAGE_TALKED_TO_RELDO ||
        stage === STAGE_ATTEMPTED_TO_TAKE_BOOK ||
        stage === STAGE_GOT_NEW_WORD ||
        stage >= STAGE_OBTAINED_NECRONOMICON
    ) {
        await searchBookcase(player, stage);
        return true;
    }

    return false;
}

// use necronomicon on a fire or fireplace
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id === NECRONOMICON_ID && FIRE_IDS.has(gameObject.id)) {
        await burnNecronomicon(player);
        return true;
    }

    return false;
}

// necronomicon + ancient amulet -> "those would go together, eh?"
async function onUseWithInventory(player, item, target) {
    if (!questsEnabled(player)) {
        return false;
    }

    const ids = [item.id, target.id];
    if (ids.includes(NECRONOMICON_ID) && ids.includes(ZOMBITE_AMULET_ID)) {
        player.message('@que@It does kind of look like those would go together, eh?');
        await player.world.sleepTicks(3);
        player.message('@que@Uhrney would know how.');
        return true;
    }

    return false;
}

// read the necronomicon; harms you if hits level is above 3
async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id !== NECRONOMICON_ID) {
        return false;
    }

    player.message('@que@You try to read the Necronomicon...');
    await player.world.sleepTicks(5);

    if (player.skills.hits.current > 3) {
        // damage(1) drops current hits by 1 and shows a hitsplat
        player.damage(1);
        player.message('@que@The contents are so vile that it physically harms you');
    } else {
        player.message('@que@but you cannot find the strength...');
    }

    return true;
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onUseWithInventory,
    onInventoryCommand
};
