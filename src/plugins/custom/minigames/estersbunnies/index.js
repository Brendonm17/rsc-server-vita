
const { customQuestsEnabled } = require('../../../quests/custom-gate.js');

// ids
const ESTER_ID = 815;
const BUNNY_ID = 816;
const DUCK_ID = 817;

const RABBITS_FOOT_ONE = 1485; // Musa Point
const RABBITS_FOOT_TWO = 1486; // Lumbridge
const RABBITS_FOOT_THREE = 1487; // Al Kharid
const RABBITS_FOOT_FOUR = 1488; // Draynor Manor
const RABBITS_FOOT_FIVE = 1489; // Ice Mountain

const EASTER_EGG_ID = 677;
const RING_OF_BUNNY_ID = 1490;
const RING_OF_EGG_ID = 1491;

// the 10 philosophy quotes, in enum order
const DUCK_WISDOM = [
    'The unexamined life is not worth living',
    'I think therefore I am',
    'What is rational is actual and what is actual is rational',
    'One cannot step twice in the same river',
    'To be is to be perceived',
    'Liberty consists in doing what one desires',
    'Even while they teach, men learn',
    'There is only one good, knowledge, and one evil, ignorance',
    'Leisure is the mother of philosophy',
    'We are what we repeatedly do. Excellence, then, is not an act, but a habit'
];

// small helpers mirroring OpenRSC Functions.* / RuneScript.*
function ifheld(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

function give(player, id, amount = 1) {
    player.inventory.add(id, amount);
}

function remove(player, id, amount = 1) {
    player.inventory.remove(id, amount);
}

function mes(player, ...messages) {
    player.message(...messages);
}

async function say(player, ...messages) {
    await player.say(...messages);
}

async function npcsay(npc, ...messages) {
    await npc.say(...messages);
}

async function delay(player, ticks) {
    await player.world.sleepTicks(ticks);
}

// DataConversions.random(low, high): inclusive both ends.
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function hasStarted(player) {
    return Object.prototype.hasOwnProperty.call(player.cache, 'esters_bunnies');
}

// absent key defaults to 0
function getStage(player) {
    return hasStarted(player) ? player.cache.esters_bunnies : 0;
}

function setStage(player, value) {
    player.cache.esters_bunnies = value;
}

// ESTERS_BUNNIES_EVENT -> the per-world custom-content toggle.
function estersBunniesEvent(player) {
    return customQuestsEnabled(player);
}

// default false: unlimited replacement eggs
function stingyDuck(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    return !!(config && config.estersBunniesStingyDuck === true);
}

function hasAllFeet(player) {
    return (
        ifheld(player, RABBITS_FOOT_ONE, 1) &&
        ifheld(player, RABBITS_FOOT_TWO, 1) &&
        ifheld(player, RABBITS_FOOT_THREE, 1) &&
        ifheld(player, RABBITS_FOOT_FOUR, 1) &&
        ifheld(player, RABBITS_FOOT_FIVE, 1)
    );
}

// completion cache writes
function handleReward(player) {
    setStage(player, -1);
    player.cache.ester_rings = 1;
}

async function esterDialogue(player, npc) {
    const stage = getStage(player);

    // event off and not yet complete shows a generic greeting only
    if (!estersBunniesEvent(player) && stage !== -1) {
        await npcsay(
            npc,
            'Hello there!',
            'Welcome to my home',
            "I'm a bit busy at the moment, but feel free to talk to my husband upstairs",
            "Don't mind the rabbits"
        );
        return;
    }

    switch (stage) {
        case 0:
            await beginQuest(player, npc);
            break;
        case 1:
        case 2: {
            await npcsay(
                npc,
                'Oh my this is so stressful',
                "How's it coming along? Have you found my bunnies?"
            );
            const options = ['About those riddles', 'Who is that man upstairs?'];
            // foot one checked for amount 1, feet two through five for amount 2
            if (
                ifheld(player, RABBITS_FOOT_ONE, 1) ||
                ifheld(player, RABBITS_FOOT_TWO, 2) ||
                ifheld(player, RABBITS_FOOT_THREE, 2) ||
                ifheld(player, RABBITS_FOOT_FOUR, 2) ||
                ifheld(player, RABBITS_FOOT_FIVE, 2)
            ) {
                options.push('I have some of their feet');
            }

            const option = await player.ask(options, true);
            if (option === 0) {
                await riddles(player, npc);
            } else if (option === 1) {
                await npcsay(
                    npc,
                    "Oh, that's my husband",
                    "I know what you're thinking",
                    "Why don't I ask him to go get my bunnies?",
                    'He used to be an adventurer, quite like yourself',
                    'But there was an accident at an archery range',
                    "He can't really do much with a shattered kneecap",
                    'So now he just stays inside all day',
                    'And his sword just sits on the ground, collecting dust',
                    "I'm sure he wouldn't even mind if you just took it"
                );
            } else if (option === 2) {
                await npcsay(
                    npc,
                    "That's great!",
                    'But please hold onto them until you have all 5',
                    "I'm afraid I'll lose them if I take them now"
                );
            }
            break;
        }
        case 3:
            await npcsay(npc, 'Hello', 'Did you manage to find my bunnies?');
            if (hasAllFeet(player)) {
                await say(player, 'Yes! I have all of their feet right here');
                await npcsay(npc, 'Excellent!', 'Hand them over please');
                mes(player, 'You hand the rabbit feet over to Ester');
                await delay(player, 3);
                remove(player, RABBITS_FOOT_ONE, 1);
                remove(player, RABBITS_FOOT_TWO, 1);
                remove(player, RABBITS_FOOT_THREE, 1);
                remove(player, RABBITS_FOOT_FOUR, 1);
                remove(player, RABBITS_FOOT_FIVE, 1);
                setStage(player, 4);
                await npcsay(
                    npc,
                    'Now I can get started-',
                    'Oh wait...',
                    'Oh no!',
                    'It seems while I was occupied with the bunnies',
                    'My magical duck has also gotten away!',
                    'Can you please help me find it?'
                );
                await magicDuck(player, npc);
            } else {
                await say(player, 'No not yet');
                await npcsay(
                    npc,
                    'Well, bring me their feet when you have them please',
                    "Easter doesn't last forever"
                );
            }
            break;
        case 4:
            await npcsay(npc, 'Please can you help me find my magic duck?');
            await magicDuck(player, npc);
            break;
        case 5:
            await npcsay(
                npc,
                'Have you found my duck yet?',
                'I need one of his eggs'
            );
            await say(player, 'No, not yet');
            await npcsay(
                npc,
                'Okay',
                'Just remember that I think he is with his friend',
                'And I think his friend is a jolly boar'
            );
            break;
        case 6:
            await say(player, 'I got the egg!');
            await npcsay(
                npc,
                'Oh wonderful',
                'Give it here and I can finally get started!'
            );
            if (ifheld(player, EASTER_EGG_ID, 1)) {
                remove(player, EASTER_EGG_ID, 1);
                mes(player, 'You hand Ester the egg');
                await delay(player, 3);
                mes(player, 'She gathers the lucky rabbit feet and the egg');
                await delay(player, 3);
                await npcsay(npc, 'eggius bunnius maximus!');
                mes(player, 'With a crack, Ester is now holding two rings');
                await delay(player, 3);
                await npcsay(
                    npc,
                    'It worked!',
                    'I guess you could say that makes me pretty...'
                );
                await delay(player, 3);
                await npcsay(npc, 'egg-static');
                await delay(player, 3);
                await npcsay(
                    npc,
                    'Anyways, I want you to have these',
                    'The best Easter gifts ever',
                    'Try them on and see what happens'
                );
                give(player, RING_OF_BUNNY_ID, 1);
                give(player, RING_OF_EGG_ID, 1);
                mes(player, 'Ester hands you the two rings');
                await delay(player, 3);
                await npcsay(npc, 'Thank you again for all your help!');
                await say(player, 'Your welcome');
                mes(player, "You have completed the Ester's Bunnies Miniquest!");
                handleReward(player);
            } else {
                await say(player, 'Oh wait', 'I seem to have lost it');
                await npcsay(
                    npc,
                    'Oh no!',
                    "Well, you'll have to go get another one",
                    "Otherwise I can't preform the enchantment"
                );
            }
            break;
        case -1: {
            await npcsay(npc, 'Thank you again for helping me');
            const choice = await player.ask(
                [
                    'What should I do if I lose my rings?',
                    'Who is that man upstairs?',
                    'Your welcome'
                ],
                true
            );
            if (choice === 0) {
                await npcsay(
                    npc,
                    'You can talk to my friend Thessalia',
                    "She'll be able to give you new ones"
                );
            } else if (choice === 1) {
                await npcsay(
                    npc,
                    "Oh, that's my husband",
                    'He used to be an adventurer, quite like yourself',
                    'But there was an accident at an archery range',
                    "He can't really do much with a shattered kneecap",
                    'So now he just stays inside all day',
                    'And his sword just sits on the ground, collecting dust',
                    "I'm sure he wouldn't even mind if you just took it"
                );
            }
            break;
        }
        default:
            break;
    }
}

async function magicDuck(player, npc) {
    const option = await player.ask(
        [
            'You have a magic duck?',
            "No, I'm done helping you",
            "Of course I'll help you"
        ],
        true
    );
    if (option === 0) {
        await npcsay(
            npc,
            "Yes he's the last piece of the puzzle",
            'I need one of his magic eggs to finish my enchantment',
            'I promise this is the last thing I need'
        );
        await magicDuck(player, npc);
    } else if (option === 1) {
        await npcsay(
            npc,
            'Alright I understand',
            "But if you change your mind, I'll be here"
        );
    } else if (option === 2) {
        await say(
            player,
            'Do you have any idea where he went?',
            'Did he leave a riddle too?'
        );
        await npcsay(
            npc,
            'No',
            'But I do remember that he talked about a place he liked',
            'I think he had a friend there?',
            'He talked about a jolly boar'
        );
        setStage(player, 5);
    }
}

async function riddles(player, npc) {
    while (true) {
        const option = await player.ask(
            [
                'What is the first riddle?',
                'What is the second riddle?',
                'What is the third riddle?',
                'What is the fourth riddle?',
                'More'
            ],
            false
        );
        switch (option) {
            case 0:
                await say(player, 'What is the first riddle?');
                await npcsay(
                    npc,
                    "Let's see...",
                    '"I\'m a bunny that likes the ocean',
                    'My neighbor has a redberry pie addiction"',
                    'What do you suppose that means?'
                );
                break;
            case 1:
                await say(player, 'What is the second riddle?');
                await npcsay(
                    npc,
                    "Let's see...",
                    '"I\'m a bunny that likes the forest',
                    'Those that are behind castles are the best"',
                    'That could be anywhere'
                );
                break;
            case 2:
                await say(player, 'What is the third riddle?');
                await npcsay(
                    npc,
                    "Let's see...",
                    '"I\'m a bunny that likes it hot',
                    'Find me south of a mining plot"',
                    'These are making my head hurt'
                );
                break;
            case 3:
                await say(player, 'What is the fourth riddle?');
                await npcsay(
                    npc,
                    "Let's see...",
                    '"I\'m a bunny that likes things scary',
                    'Witches, ghosts, and spiders, hairy"',
                    'Where in the world could that be?'
                );
                break;
            case 4: {
                const more = await player.ask(
                    ['What is the fifth riddle?', "I'll go find your bunnies now"],
                    false
                );
                if (more === 0) {
                    await say(player, 'What is the fifth riddle?');
                    await npcsay(
                        npc,
                        "Let's see...",
                        '"I\'m a bunny that likes ice',
                        'Too bad none of my neighbors are very nice."',
                        "I can't even begin to imagine..."
                    );
                } else if (more === 1) {
                    await say(player, "I'll go find your bunnies now");
                    return;
                } else {
                    return;
                }
                break;
            }
            default:
                return;
        }
    }
}

async function beginQuest(player, npc) {
    await npcsay(npc, 'Oh no, oh no. Where did they run off to?');
    await npcsay(npc, "They can't have gotten far, but I can't figure this out");

    const first = await player.ask(["What's the matter?", 'Say nothing'], false);
    if (first !== 0) {
        return;
    }

    await say(player, "err... What's the matter?");
    await npcsay(
        npc,
        'My bunnies!',
        "I had five bunnies but they've ran off",
        "I don't know where they went",
        "They've left me riddles that I assume will lead to their locations",
        "But I'm hopeless when it comes to this stuff!"
    );

    let option = 0;
    while (option !== 3) {
        option = await player.ask(
            [
                'Wait, how did your bunnies leave you riddles?',
                'Why would they leave you riddles if they ran off?',
                "Why can't you just buy new bunnies?",
                "I'll help you find your bunnies"
            ],
            true
        );
        if (option === 0) {
            await npcsay(
                npc,
                "They're magic bunnies",
                "They're a lot smarter than your average bunny",
                'They pull tricks on me all the time'
            );
        } else if (option === 1) {
            await npcsay(
                npc,
                "I don't know",
                "I'll have to ask them when I find them"
            );
        } else if (option === 2) {
            await npcsay(
                npc,
                "They're magic bunnies",
                'Their feet are extra lucky',
                "I need them for a magic enchantment that I'm working on",
                "I'm trying to make the best Easter present ever!"
            );
        } else if (option === 3) {
            // fall out of the loop
        } else {
            // dialogue closed (-1)
            return;
        }
    }

    await npcsay(npc, 'Oh you will?', 'Thank you so much!');
    setStage(player, 1);
    await riddles(player, npc);
}

async function bunnyDialogue(player, npc) {
    await npcsay(npc, 'Hello there human');

    if (!estersBunniesEvent(player)) {
        await eventOver(player, npc);
        return;
    }

    // Just return if the quest is over.
    if (getStage(player) === -1) {
        return;
    }

    // figure out which bunny this is; returns its foot id, or null
    const bunnyFoot = getWhichBunny(npc);
    if (bunnyFoot === null) {
        // bunny spawned outside all riddle ranges has no foot to give
        return;
    }

    const youCanTalk = 'You can talk?';
    const whyDidYouRun = 'Why did you run away?';
    const whyDidYouLeaveRiddles =
        'Why did you leave riddles that lead to your location?';
    const iNeedFoot = 'I need one of your feet, please';
    const comeWithMe = 'You need to come with me back to Ester';

    const options = [youCanTalk, whyDidYouRun, whyDidYouLeaveRiddles];
    if (getStage(player) > 1 && !ifheld(player, bunnyFoot, 1)) {
        options.push(iNeedFoot);
    } else {
        options.push(comeWithMe);
    }

    const option = await player.ask(options, true);
    if (option === -1) {
        return;
    }
    const chosen = options[option];

    if (chosen === youCanTalk) {
        await npcsay(
            npc,
            'Yes of course I can',
            "Didn't Ester tell you we were magical bunnies?",
            'Actually, it would be just like her to forget something like that'
        );
    } else if (chosen === whyDidYouRun) {
        await npcsay(
            npc,
            "Since you're here, I assume that you talked to Ester",
            "She doesn't really provide stimulating conversation",
            'So I came out here to contemplate the universe'
        );
    } else if (chosen === whyDidYouLeaveRiddles) {
        await npcsay(
            npc,
            "We knew that Ester wouldn't be able to solve them",
            "And her husband hasn't been out of the house in years",
            'We figured that anyone who could solve the riddles',
            'Would actually be worth talking to'
        );
    } else if (chosen === iNeedFoot) {
        await npcsay(npc, 'Sure, here you go');
        await giveFoot(player, npc, bunnyFoot);
        await say(player, 'Thank you');
    } else if (chosen === comeWithMe) {
        await npcsay(
            npc,
            'No, I will not come back with you',
            'I like it too much here.'
        );
        const choice = await player.ask(
            [
                "I'm bringing your foot back to Ester one way or another",
                'She needs your lucky foot for her enchantment',
                'Please?'
            ],
            true
        );
        if (choice === 0 || choice === 1) {
            await npcsay(
                npc,
                'Oh wait',
                'All you need is my foot?',
                'Here, take it'
            );
            await giveFoot(player, npc, bunnyFoot);
            await say(player, 'Are you okay!?');
            await npcsay(
                npc,
                "Sure, I'm magic",
                "Didn't hurt at all!",
                'I would still ask that you please try not to lose it'
            );
            await say(player, 'If you say so...', 'Thanks');
        } else if (choice === 2) {
            await npcsay(npc, 'No thankyou');
        }
    }
}

async function giveFoot(player, npc, footId) {
    mes(player, 'The bunny grabs its foot...');
    await delay(player, 3);
    mes(player, 'And pulls it right off its body!');
    await delay(player, 3);

    give(player, footId, 1);
    // advance to stage 3 once all five feet are held, else stage 2
    if (hasAllFeet(player)) {
        setStage(player, 3);
    } else {
        setStage(player, 2);
    }

    mes(player, 'The bunny hands you its foot');
    await delay(player, 3);
}

// maps the bunny's tile to its foot id
function getWhichBunny(npc) {
    const x = npc.x;
    const y = npc.y;
    if (x >= 278 && x <= 298 && y >= 688 && y <= 708) {
        return RABBITS_FOOT_ONE; // MUSA_POINT
    }
    if (x >= 149 && x <= 169 && y >= 647 && y <= 667) {
        return RABBITS_FOOT_TWO; // LUMBRIDGE
    }
    if (x >= 59 && x <= 79 && y >= 611 && y <= 631) {
        return RABBITS_FOOT_THREE; // AL_KHARID
    }
    if (x >= 222 && x <= 231 && y >= 535 && y <= 546) {
        return RABBITS_FOOT_FOUR; // DRAYNOR_MANOR
    }
    if (x >= 282 && x <= 302 && y >= 462 && y <= 482) {
        return RABBITS_FOOT_FIVE; // ICE_MOUNTAIN
    }
    return null;
}

async function eventOver(player, npc) {
    await say(player, 'Hello', 'Why have you come back to Ester\'s house?');
    await npcsay(
        npc,
        'We have finished contemplating the universe',
        'We decided to come back so that we can be together',
        'Now we can discuss the multiverse'
    );
    const option = await player.ask(
        [
            'What are the answers to the universe then?',
            'Sounds interesting, have fun'
        ],
        true
    );
    if (option === 0) {
        await npcsay(
            npc,
            'the answer to life the universe and everything',
            'Is forty...'
        );
        await delay(player, 3);
        await npcsay(npc, 'seven');
        await delay(player, 3);
        await say(player, 'What?');
        mes(player, 'The bunny will say no more');
    }
}

async function duckDialogue(player, npc) {
    const stage = getStage(player);

    await npcsay(npc, 'Hello, my friend');
    await npcsay(npc, 'How can I be of assistance?');

    const options = ['Please impart me your wisdom'];

    if (estersBunniesEvent(player)) {
        if (stage === 5) {
            options.push(
                'I need one of your eggs',
                'Prithee bestow upon me one of thine eggs'
            );
        } else if (stage === 6 && !ifheld(player, EASTER_EGG_ID, 1)) {
            options.push(
                'I need another one of your eggs',
                'Prithee bestow upon me another of thine eggs'
            );
        }
    }

    let option = await player.ask(options, true);
    // clamp forged option back to 0 when duck event is off
    if (!estersBunniesEvent(player) && option > 0) {
        option = 0;
    }

    if (option === 0) {
        await npcsay(npc, DUCK_WISDOM[random(0, 9)]);
        await say(player, 'intersting, thank you');
    } else if (option === 1) {
        await npcsay(
            npc,
            'I am disinclined to acquiesce to your request',
            'Prithee return when you have mastered your tongue'
        );
    } else if (option === 2) {
        if (stage === 6 && stingyDuck(player)) {
            await npcsay(
                npc,
                'You are well-spoken',
                'Alas I must not acquiesce to your request',
                'It would be inappropriate in these circumstances'
            );
            return;
        }
        await npcsay(
            npc,
            'You are well-spoken',
            'I am inclined to acquiesce to your request'
        );
        mes(player, 'The duck gets a funny look on his face');
        await delay(player, 3);
        await say(player, 'Are you okay?');
        mes(player, 'The duck holds up a wing to silence you');
        await delay(player, 3);
        mes(player, 'With a pop, the duck is now sitting on a magic-looking egg');
        // lay the egg as a ground item at the duck's tile
        player.world.addPlayerDrop(player, EASTER_EGG_ID, npc.x, npc.y);
        setStage(player, 6);
        await npcsay(npc, 'There you are', 'Try not to eat it on your way back');
        if (stingyDuck(player)) {
            await npcsay(
                npc,
                "You mustn't lose it",
                'For such an egg, it is only proper to be laid once a year'
            );
        }
    }
}

// plugin entry point: blockTalkNpc guards decide interception
async function onTalkToNPC(player, npc) {
    // Ester.blockTalkNpc: npc.getID() == ESTER  (always intercept Ester).
    if (npc.id === ESTER_ID) {
        player.engage(npc);
        await esterDialogue(player, npc);
        player.disengage();
        return true;
    }

    // bunny talk trigger: npc is bunny and esters_bunnies cache set
    if (npc.id === BUNNY_ID) {
        if (!hasStarted(player)) {
            return false;
        }
        player.engage(npc);
        await bunnyDialogue(player, npc);
        player.disengage();
        return true;
    }

    // duck talk trigger: npc is duck, esters_bunnies set, stage > 4 or -1
    if (npc.id === DUCK_ID) {
        if (!hasStarted(player)) {
            return false;
        }
        const stage = getStage(player);
        if (!(stage > 4 || stage === -1)) {
            return false;
        }
        player.engage(npc);
        await duckDialogue(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

module.exports = {
    onTalkToNPC
};
