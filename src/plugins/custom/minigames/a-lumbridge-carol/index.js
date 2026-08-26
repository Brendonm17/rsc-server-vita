
const { customQuestsEnabled } = require('../../../quests/custom-gate.js');
const runeMysteries = require('../../../quests/members/rune-mysteries/index.js');

const NOT_STARTED = 0;
const GHOST_STORY = 1;
const READ_BOOK = 2;
const RECEIVED_PARCHMENT = 3;
const LETTER_DELIVERY = 4;
const DELIVERED_LETTER = 5;
const FIND_TRAMP = 6;
const FOUND_TRAMP = 7;
const GET_CLOTHES = 8;
const HELPED_TRAMP = 9;
const FIND_SHILOP = 10;
const GET_DAGGER = 11;
const GET_LONGSWORD = 12;
const GET_SWORD = 13;
const HELPED_SHILOP = 14;
const PARTY_TIME = 15;
const TAKING_CREDIT = 16;
const COMPLETED = -1;

// npc ids
const DUKE_ID = 198;
const MUM_ID = 814;
const TRAMP_ID = 28;
const SHILOP_ID = 715;
const PRAETERITUM_ID = 832;
const PRAESENS_ID = 833;
const FUTURUM_ID = 834;

// item ids
const DUKES_JOURNAL_ID = 1574;
const DUKE_PARCHMENT_ID = 1575;
const APOLOGY_LETTER_ID = 1576;

const RED_CHRISTMAS_SWEATER_ID = 1577;
const FEMALE_RED_CHRISTMAS_SWEATER_ID = 1583;
// male->female runtime offset (see header): 1583 - 1577 = 6.
const FEMALE_SWEATER_OFFSET =
    FEMALE_RED_CHRISTMAS_SWEATER_ID - RED_CHRISTMAS_SWEATER_ID;

// all 12 sweater ids, male and female variants
const sweaterIds = [
    1577, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587, 1588
];

const REDDYE_ID = 238;
const YELLOWDYE_ID = 239;
const BLUEDYE_ID = 272;
const ORANGEDYE_ID = 282;
const PURPLEDYE_ID = 516;
const GREENDYE_ID = 515;
const dyeIds = [
    REDDYE_ID, YELLOWDYE_ID, BLUEDYE_ID, ORANGEDYE_ID, PURPLEDYE_ID, GREENDYE_ID
];

// dye maps to male sweater; female handled via offset
const dyeToSweater = {
    [REDDYE_ID]: 1577, // RED
    [YELLOWDYE_ID]: 1578, // YELLOW
    [BLUEDYE_ID]: 1579, // BLUE
    [ORANGEDYE_ID]: 1581, // ORANGE
    [PURPLEDYE_ID]: 1580, // PURPLE
    [GREENDYE_ID]: 1582 // GREEN
};

// coloured capes, indexed to match capeColors below
const capeColors = ['yellow', 'orange', 'green', 'purple'];
const capeIds = [512, 513, 511, 514];

const BOOTS_ID = 17;
const BRONZE_DAGGER_ID = 62;
const BRONZE_LONG_SWORD_ID = 70;
const BRONZE_SHORT_SWORD_ID = 66;
const COINS_ID = 10;
const ANTI_DRAGON_BREATH_SHIELD_ID = 420;

// party room bounds: Rising Sun Inn, Falador 1st floor
const PARTY_ROOM_MIN_X = 316;
const PARTY_ROOM_MIN_Y = 1487;
const PARTY_ROOM_MAX_X = 323;
const PARTY_ROOM_MAX_Y = 1494;

function getStage(player) {
    const s = player.cache.a_lumbridge_carol;
    return s === undefined ? NOT_STARTED : s;
}

function updateStage(player, newStage) {
    player.cache.a_lumbridge_carol = newStage;
}

function ifheld(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

// worn = item flagged equipped in the 30-slot inventory
function ifworn(player, id) {
    return !!player.inventory.items.find(
        (item) => item.id === id && item.equipped
    );
}

function inPartyRoom(npc) {
    return (
        npc.x >= PARTY_ROOM_MIN_X &&
        npc.x <= PARTY_ROOM_MAX_X &&
        npc.y >= PARTY_ROOM_MIN_Y &&
        npc.y <= PARTY_ROOM_MAX_Y
    );
}

// DataConversions.random(min, max) is inclusive of both bounds.
function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// render a panel as sequential messages, split on '%'
async function sendBox(player, text) {
    for (const raw of text.split('%')) {
        const line = raw.trim();
        player.message(line.length ? line : ' ');
    }
}

async function dukeDialogue(player, npc, dialogue) {
    let option;
    await player.say(dialogue);

    switch (getStage(player)) {
        case NOT_STARTED:
            await npc.say('I haven\'t', 'I\'ve been up all night');

            if ((await player.ask(['What happened?', 'That\'s too bad'], false)) !== 0) {
                return;
            }

            await npc.say(
                'The strangest thing happened',
                'Three spirits came to visit me during the night',
                'I\'m not even sure if it was real or a bad dream',
                'Can you help me figure this out?'
            );

            if (
                (await player.ask(
                    ['Sure, what did they want?', 'Spirits? That\'s too scary for me'],
                    false
                )) !== 0
            ) {
                return;
            }

            await npc.say(
                'I don\'t know what they want exactly',
                'But they did show me things',
                'Each ghost had a different vision for me',
                'I wrote down my experiences in this journal',
                'Take a look and talk to me again when you\'ve read it'
            );
            player.inventory.add(DUKES_JOURNAL_ID, 1);
            player.message('The Duke hands you a journal');
            updateStage(player, GHOST_STORY);
            break;
        case GHOST_STORY:
            await npc.say(
                'I thought I gave you my journal to read so we could figure that out?'
            );
            if (!ifheld(player, DUKES_JOURNAL_ID, 1)) {
                await npc.say(
                    'But it looks like you\'ve lost it',
                    'Luckily I keep multiple copies of my journal for situations such as this'
                );
                player.inventory.add(DUKES_JOURNAL_ID, 1);
                player.message('The Duke hands you a journal');
            }
            await npc.say('Take a look and talk to me again when you\'ve read it');
            break;
        case READ_BOOK:
            await npc.say('So what do you think?');

            if (
                (await player.ask(
                    [
                        'I think the spirits want you to make amends',
                        'I don\'t know I\'ll think about it some more'
                    ],
                    false
                )) !== 0
            ) {
                return;
            }

            await npc.say(
                'Now that you mention that I think you\'re right',
                'I guess I had forgotten to write this down after my long night',
                'But the third spirit did show me another vision',
                'He showed me a headstone',
                'Cracked and overgrown',
                'I looked at the name on the stone...',
                '...And it was my own',
                'The spirit told me I will live out my days alone',
                'And die alone',
                'I do not want my life to turn out like that',
                'I guess I have not been so kind to some of the people in my life',
                'It would be best to make amends',
                'Would you help me?'
            );

            if ((await player.ask(['Sure', 'I don\'t have the time'], false)) !== 0) {
                return;
            }

            await npc.say(
                'Excellent thank you',
                'We can work through this one vision at a time',
                'Firstly, I need to make amends for the past',
                'I treated my love so poorly'
            );

            // OpenRSC: multi(...) == -1 -> return; either option continues.
            await player.ask(
                ['What did you have in mind?', 'Yeah sounds like you were a jerk'],
                false
            );

            await npc.say('I know', 'We can write a letter');

            option = await player.ask(['We?', 'That\'s a good idea'], false);
            if (option === 0) {
                await npc.say('You\'re right', 'You should do it');
            }

            await npc.say('Here is some parchment');
            player.message('The Duke hands you some parchment');
            player.inventory.add(DUKE_PARCHMENT_ID, 1);
            await player.world.sleepTicks(5);
            player.message(
                'He then continues talking before you have a chance to interrupt'
            );
            await player.world.sleepTicks(5);

            await npc.say(
                'When you\'re done, talk to me again',
                'I can tell you where she lives so you can deliver it'
            );
            updateStage(player, RECEIVED_PARCHMENT);
            break;
        case RECEIVED_PARCHMENT:
            if (ifheld(player, APOLOGY_LETTER_ID, 1)) {
                await npc.say('Excellent', 'Can you go deliver it for me?');

                if (
                    (await player.ask(
                        ['Don\'t you want to read it over?', 'I can\'t right now'],
                        false
                    )) !== 0
                ) {
                    return;
                }

                await npc.say(
                    'Do I need to?',
                    'I\'m sure you\'ve done just fine',
                    'The woman you\'re looking for still lives here in Lumbridge',
                    'She actually lives just outside the castle courtyard',
                    'Her house is right next to Bob\'s Axes'
                );
                updateStage(player, LETTER_DELIVERY);
            } else if (!ifheld(player, DUKE_PARCHMENT_ID, 1)) {
                await npc.say('Here, take another');
                player.message('The Duke hands you some parchment');
                player.inventory.add(DUKE_PARCHMENT_ID, 1);
            }
            break;
        case LETTER_DELIVERY: {
            const options = [];
            options.push('Where can I find the recepient again?');
            options.push('Wait a minute...');
            if (!ifheld(player, APOLOGY_LETTER_ID, 1)) {
                options.push('I dropped the letter');
            }
            options.push('Nevermind');

            option = await player.ask(options, false);
            if (option === options.length - 1) {
                return;
            } else if (option === 0) {
                await npc.say(
                    'The woman you\'re looking for still lives here in Lumbridge',
                    'She actually lives just outside the castle courtyard',
                    'Her house is right next to Bob\'s Axes'
                );
            } else if (option === 1) {
                await player.say(
                    'The house you\'re describing...',
                    '...Is my mum\'s house!',
                    'Did you date my mom?'
                );

                player.message(
                    'The Duke\'s face turns red, but he doesn\'t say anything'
                );
            } else if (option === 2) {
                await npc.say(
                    'Luckily Hans found it on the ground and brought it back to me',
                    'Here you go'
                );
                player.message('The Duke hands you the apology letter');
                player.inventory.add(APOLOGY_LETTER_ID, 1);
                await player.world.sleepTicks(5);
                await npc.say(
                    'Please take it straight to her',
                    'And don\'t lose it this time!'
                );
            }
            break;
        }
        case DELIVERED_LETTER:
            await npc.say('Excellent', 'What did she say?');
            await player.say(
                'She said that she appreciated the gesture',
                'But she doesn\'t think she could get back together with you'
            );
            await npc.say(
                'That\'s fine',
                'I am trying to make amends',
                'Not court your mother',
                'I\'m glad she liked my letter though'
            );

            option = await player.ask(
                ['Well I was the one that wrote the letter', 'What\'s next?'],
                false
            );
            if (option === 0) {
                await npc.say('Oh yes of course', 'Anyway');
            }

            await npc.say(
                'Next we should help the old cook',
                'I guess I did sack him rather hastily',
                'You should go find him in Varrock and offer him his old job back',
                'I wouldn\'t mind having two cooks around here',
                'Unfortunately, you\'ll probably find him in some alleyway begging for money',
                'I heard he\'s living as a tramp now'
            );
            updateStage(player, FIND_TRAMP);
            break;
        case FIND_TRAMP:
            await npc.say(
                'You need to go to Varrock and find my old cook',
                'Offer him his old job back',
                'Unfortunately, you\'ll probably find him in some alleyway begging for money',
                'I heard he\'s living as a tramp now'
            );
            break;
        case FOUND_TRAMP:
            await npc.say('Oh good', 'So will he be coming back here to cook?');
            await player.say('No', 'He said that he is fine where he is at');
            await npc.say('Well did you help him with something else then?');
            await player.say('What?', 'No', 'Is that my job?');
            await npc.say('Go back and see if you can help him with something');
            break;
        case HELPED_TRAMP:
            await npc.say('Oh good', 'So will he be coming back here to cook?');
            await player.say(
                'No',
                'He said that he is fine where he is at',
                'I did help him get ready for a job interview he has coming up'
            );
            await npc.say(
                'Okay good',
                'So we were able to help him',
                'That should make the second spirit happy'
            );
            player.message('Before you can interrupt, the Duke continues');
            await player.world.sleepTicks(5);
            await npc.say(
                'Now there\'s only one more person to help out',
                'Can you head back to Varrock and find Shilop?',
                'Perhaps there is something you--',
                'I mean, we--can help him with'
            );
            updateStage(player, FIND_SHILOP);
            break;
        case FIND_SHILOP:
            await npc.say(
                'You need to head to Varrock and see if we can help Shilop with anything'
            );
            break;
        case HELPED_SHILOP:
            await npc.say(
                'Excellent!',
                'Then it sounds like I\'m done',
                'I\'m sure those spirits will be happy now'
            );
            do {
                option = await player.ask(
                    [
                        'Don\'t you want to know what happened?',
                        'You didn\'t do anything',
                        'So what now?'
                    ],
                    false
                );
                if (option === 0) {
                    await npc.say('No', 'I\'m sure you helped him out just fine');
                } else if (option === 1) {
                    await npc.say(
                        'All the people that the spirits mentioned have been helped',
                        'I don\'t really think it matters who actually did the helping',
                        'Besides, I was the one that was telling you to do it'
                    );
                }
            } while (option !== 2);

            await npc.say(
                'This whole ordeal has really gotten me in the Christmas spirit',
                'Ha ha, "spirit," get it?',
                'Anyway, I think I want to throw a big Christmas party',
                'I think I\'ll invite everyone we helped today',
                'From what the spirits showed me',
                'It looks like the lot of them could use the Christmas cheer',
                'And with the look that you\'re giving me',
                'It looks like you could, too',
                'So you\'re invited as well',
                'The party will be at the Rising Sun Inn in Falador on the 1st floor',
                'I hope to see you there!'
            );
            updateStage(player, PARTY_TIME);
            break;
        case PARTY_TIME:
            await npc.say(
                'Head to Falador',
                'The Rising Sun Inn is located right in the center of the city',
                'Everyone will be on the 1st floor'
            );
            break;
        default:
            break;
    }
}

async function mumDialogue(player, npc) {
    player.message('Mum\'s face turns red');
    await player.world.sleepTicks(5);
    await npc.say(
        'Yes',
        'Many years ago while you were off adventuring',
        'I was lonely and he kept me company',
        'But I left when I realized that he cared more for his title and riches than me',
        'I haven\'t spoken to him since'
    );

    if (!ifheld(player, APOLOGY_LETTER_ID, 1)) {
        return;
    }

    if (
        (await player.ask(
            ['I have a letter for you', 'I need to go think about this'],
            false
        )) !== 0
    ) {
        return;
    }

    player.message('You hand the letter to your mother');
    player.inventory.remove(APOLOGY_LETTER_ID, 1);
    await player.world.sleepTicks(5);
    player.message('She reads it...');
    await player.world.sleepTicks(5);
    player.message('And starts to cry');
    await player.world.sleepTicks(5);
    await npc.say(
        'This is very sweet',
        'I don\'t think I could ever get back together with the Duke',
        'But this is a very thoughtful gesture and I appreciate it',
        'Will you tell him that for me?'
    );
    updateStage(player, DELIVERED_LETTER);
}

async function trampDialogue(player, npc) {
    switch (getStage(player)) {
        case FIND_TRAMP: {
            await npc.say(
                'A job, eh?',
                'Do you need me to "take care" of someone for you?',
                'Because that\'ll cost you quite a lot'
            );
            await player.say(
                'What?',
                'No',
                'Why would you assume that\'s what I meant?'
            );
            await npc.say('I dunno');
            await player.say(
                'The Duke of Lumbridge wants to offer you your old job back'
            );
            await npc.say(
                'That ol\' git?',
                'Why the bloody \'ell would he want to do that?',
                'Practically threw me out the door, he did'
            );
            const option = await player.ask(
                [
                    'A spirit told him to make amends for wrongs he\'s done',
                    'Do you want the job or not?',
                    'Nevermind then'
                ],
                false
            );
            if (option === 2) {
                return;
            } else if (option === 0) {
                await npc.say(
                    'Oh did he now?',
                    'Well forget about him',
                    'He can stay doomed for all I care'
                );
            }

            await npc.say(
                'No way I\'m going back to that old job',
                'You can tell the Duke to take his offer and stick it',
                'Especially after what I found out after I left',
                'I wouldn\'t\'ve lasted much longer anyways',
                'You ever wonder why those goblins are always holdin\' on to so many chef\'s hats?',
                'I actually feel sorry for the poor bloke that\'s working there now',
                'Hope he keeps an eye out while walkin\' home',
                'Yeah, it\'s way safer here in this alleyway'
            );

            await player.say('Well alright then');
            updateStage(player, FOUND_TRAMP);

            const capeColor = random(0, 3);

            await npc.say(
                'Say you know what though',
                'I could actually use your help',
                'I\'ve got me a job interview coming up and I need help to get some new clothes',
                'My boots are all worn out so I\'ll need a new pair of those',
                'And I also think a ' + capeColors[capeColor] + ' cape would look good',
                'Could you find me those?'
            );

            if ((await player.ask(['Sure', 'No way'], false)) !== 0) {
                return;
            }

            await npc.say('Thanks mate');
            player.cache.arc_cape_color = capeColor;
            updateStage(player, GET_CLOTHES);
            break;
        }
        case GET_CLOTHES: {
            const cape = player.cache.arc_cape_color;
            if (ifheld(player, BOOTS_ID, 1) && ifheld(player, capeIds[cape], 1)) {
                await player.say('I have what you asked for');
                await npc.say('Good stuff, mate', 'Give \'em here if you would');
                player.message('You hand the tramp the clothes');
                player.inventory.remove(BOOTS_ID, 1);
                player.inventory.remove(capeIds[cape], 1);
                await player.world.sleepTicks(5);
                await npc.say('You\'ve done me a great service, you have');
                updateStage(player, HELPED_TRAMP);
                delete player.cache.arc_cape_color;
            } else {
                await player.say('What did you need again?');
                await npc.say(
                    'How thick are you?',
                    'I need a new pair of boots',
                    'And a ' + capeColors[cape] + ' cape'
                );
            }
            break;
        }
        default:
            break;
    }
}

async function shilopDialogue(player, npc, stage) {
    let option;
    switch (stage) {
        case FIND_SHILOP:
            await player.say('Hello there, youngster');
            await npc.say('I don\'t know what you want from me', 'I didn\'t do nothing');
            await player.say(
                'The Duke of Lumbridge asked me to come find you',
                'He felt bad for sending you away the other day'
            );
            await npc.say(
                'Oh that guy?',
                'Yeah he\'s a jerk',
                'All I wanted was some stuff to get started adventuring',
                'But he just had some grown up bring me back here'
            );

            if (
                (await player.ask(
                    ['Well maybe I could help you out', 'That\'s too bad'],
                    false
                )) !== 0
            ) {
                return;
            }

            await player.say('What do you need to start adventuring?');
            await npc.say('What I really need is something to slay monsters with');
            await player.say('Are you sure your mum is okay with that?');
            await npc.say(
                'Yeah she says it\'s fine',
                'I\'m away from home so much that it\'ll be good if I can protect myself'
            );

            option = await player.ask(
                ['Well alright if you say so', 'No way I\'m getting you a weapon'],
                false
            );
            if (option === 1) {
                await npc.say(
                    'Fine suit yourself',
                    'But I thought you wanted to help me'
                );
            }

            await player.say('What did you have in mind?');
            await npc.say('Could you bring me a bronze dagger?', 'I think that might work');
            updateStage(player, GET_DAGGER);
            break;
        case GET_DAGGER:
            await npc.say('Do you have the bronze dagger yet?');
            if (ifheld(player, BRONZE_DAGGER_ID, 1)) {
                await player.say('Yes, I have it right here');
                player.message('You hand Shilop the bronze dagger');
                player.inventory.remove(BRONZE_DAGGER_ID, 1);
                await player.world.sleepTicks(5);
                await npc.say('Hurray!');
                player.message(
                    'Shilop holds the bronze dagger and swings it around for a bit'
                );
                await player.world.sleepTicks(5);
                player.message('He suddenly doesn\'t seem as pleased');
                await player.world.sleepTicks(5);
                await player.say('What\'s wrong?');
                await npc.say(
                    'This is much too small',
                    'I won\'t be able to protect myself with this',
                    'You should bring me a bronze longsword instead',
                    'That would be much better'
                );
                updateStage(player, GET_LONGSWORD);
                do {
                    option = await player.ask(
                        [
                            'Alright, I\'ll be back',
                            'There\'s no way I\'m doing that',
                            'Can I have my dagger back?'
                        ],
                        false
                    );
                    if (option === 2) {
                        await npc.say(
                            'Oh I\'ll hang on to it',
                            'I needed something to spread jam on my bread'
                        );
                    }
                } while (option === 2);
                await npc.say('Well, I\'ll be waiting here');
            } else {
                await player.say('No, not yet');
            }
            break;
        case GET_LONGSWORD:
            await npc.say('Do you have the bronze longsword yet?');
            if (ifheld(player, BRONZE_LONG_SWORD_ID, 1)) {
                await player.say('Yes, I have it right here');
                player.message('You hand Shilop the bronze longsword');
                player.inventory.remove(BRONZE_LONG_SWORD_ID, 1);
                await player.world.sleepTicks(5);
                await npc.say('Hurray!');
                player.message(
                    'Shilop tries to lift the longsword to swing it but it is too heavy'
                );
                await player.world.sleepTicks(5);
                player.message('He suddenly doesn\'t seem as pleased');
                await player.world.sleepTicks(5);
                await player.say('What\'s wrong?');
                await npc.say(
                    'This is too heavy',
                    'I can\'t even swing this',
                    'You should bring me a bronze short sword instead',
                    'That would be much better'
                );
                updateStage(player, GET_SWORD);
                do {
                    option = await player.ask(
                        [
                            'Alright, I\'ll be back',
                            'There\'s no way I\'m doing that',
                            'Can I have my longsword back?'
                        ],
                        false
                    );
                    if (option === 2) {
                        await npc.say(
                            'Oh I\'ll hang on to it',
                            'I\'ll grow into it some day'
                        );
                    }
                } while (option === 2);
                await npc.say('Well, I\'ll be waiting here');
            } else {
                await player.say('No, not yet');
            }
            break;
        case GET_SWORD:
            await npc.say('Do you have the bronze short sword yet?');
            if (ifheld(player, BRONZE_SHORT_SWORD_ID, 1)) {
                await player.say('Yes, I have it right here');
                player.message('You hand Shilop the bronze short sword');
                player.inventory.remove(BRONZE_SHORT_SWORD_ID, 1);
                await player.world.sleepTicks(5);
                await npc.say('Hurray!');
                player.message(
                    'Shilop holds the bronze short sword and swings it around for a bit'
                );
                await player.world.sleepTicks(5);
                player.message('He looks very pleased!');
                await player.world.sleepTicks(5);
                await npc.say(
                    'This is just right',
                    'I\'ll be able to slay tons of monsters with this',
                    'Thanks a lot adventurer!'
                );
                updateStage(player, HELPED_SHILOP);
                await player.say('I\'m glad you like it', 'Don\'t poke your eye out!');
            } else {
                await player.say('No, not yet');
            }
            break;
        default:
            break;
    }
}

async function partyDialogue(player, npc) {
    if (npc.id === DUKE_ID) {
        await npc.say('Hello and welcome to my Christmas party!');
        if (getStage(player) === PARTY_TIME) {
            await npc.say(
                'Listen',
                'On my way over here I was thinking about how much you helped me today',
                'And so I wanted to repay your kindness'
            );
            const option = await player.ask(
                ['You don\'t have to do that', 'It\'s about time'],
                false
            );
            if (option === 0) {
                await npc.say('No I insist');
            }
            await npc.say(
                'So I thought I would make sure you got something nice',
                'When I sent your mother her invite I asked her to bring you something special',
                'She says she would have brought it anyways',
                'But I\'m pretty sure she would have forgot if it weren\'t for me',
                'So you\'re welcome!'
            );
            await player.say('Thanks...');
            updateStage(player, TAKING_CREDIT);
        }
    } else if (npc.id === MUM_ID) {
        await npc.say('Hi sweetie!');
        const stage = getStage(player);
        if (stage === PARTY_TIME) {
            await npc.say('I think the Duke has something he wants to say to you');
        } else if (stage === TAKING_CREDIT) {
            await npc.say(
                'I hope you\'re having a lovely time',
                'I\'ve heard from these people that you did a lot of really nice things today',
                'So I made you a Christmas present!',
                'Here you go'
            );
            player.message('Your mum hands you a hand-knitted Christmas sweater');
            if (player.isMale()) {
                player.inventory.add(RED_CHRISTMAS_SWEATER_ID, 1);
            } else {
                player.inventory.add(FEMALE_RED_CHRISTMAS_SWEATER_ID, 1);
            }
            await player.world.sleepTicks(5);
            await npc.say(
                'I hope to see you wearing it for the rest of the party',
                'It\'ll keep you nice and warm'
            );
            player.message(
                '@gre@Congratulations! You have completed A RuneScape Carol!'
            );
            updateStage(player, COMPLETED);
        } else {
            let wearingSweater = false;
            for (const id of sweaterIds) {
                if (ifworn(player, id)) {
                    wearingSweater = true;
                    break;
                }
            }
            if (wearingSweater) {
                await npc.say(
                    'I see you\'re wearing the Christmas sweater I knitted for you',
                    'I hope it\'s keeping you nice and warm!',
                    'I forgot to tell you earlier, but the material I used is great for dyeing',
                    'So if you wanted a different colour you could redye it yourself'
                );
            } else {
                await npc.say(
                    'You aren\'t wearing your Christmas sweater?',
                    'Oh, I knew I should have made you something else'
                );
                player.message('Your mum looks a bit sad');
            }
        }
    } else if (npc.id === TRAMP_ID) {
        await npc.say(
            'Oi mate',
            'Thanks again for the help with those clothes',
            'Unfortunately on my way to the interview',
            'I was jumped by some mugger and he took my cape',
            'And then the interviewer told me I didn\'t dress professionally enough for the job',
            'So you\'ll probably see me around the alleyways',
            'But that\'s alright',
            'It\'s not a bad life, it is'
        );
    } else if (npc.id === SHILOP_ID) {
        await npc.say(
            'Hello!',
            'If you\'re wondering where my sword is my mom took it',
            'I might have accidentally poked one of her cats',
            'She said I could have it back after New Year\'s though'
        );
    }
}

async function ghostDialogue(player, npc) {
    const option = await player.ask(
        ['Who are you?', 'Is the Duke still doomed?'],
        false
    );
    if (option === 0) {
        if (npc.id === PRAETERITUM_ID) {
            await npc.say(
                'I am the ghost of Christmas past',
                'People do not throw Christmas parties like they used to',
                'Now the Christmas parties in the second age?',
                'Those were where it was at!'
            );
        } else if (npc.id === PRAESENS_ID) {
            await npc.say(
                'I am the ghost of Christmas present',
                'That\'s "present" as in the current time',
                'Not "presents" as in gifts',
                'People get that mixed up all the time'
            );
        } else if (npc.id === FUTURUM_ID) {
            await npc.say(
                'I am the ghost of Christmas future',
                'Would you mind getting me some eggnog?'
            );
            await player.say('What\'s eggnog?');
            await npc.say(
                'Oh yeah',
                'They haven\'t invented that yet',
                'Well, you\'ll have something to look forward to on future Christmases!'
            );
        }
    } else if (option === 1) {
        await npc.say(
            'Well he was',
            'He didn\'t really seem to learn anything',
            'And you did all the work of course',
            'But then he invited us to this party',
            'So we\'ll let him slide',
            'The friends he makes here today will stick around for a long time'
        );
    }
}

async function openJournal(player) {
    player.message('You open the Duke\'s journal');
    player.message('Which page would you like to turn to?');
    const page = await player.ask(['page 1', 'page 2', 'page 3'], false);
    if (page === 0) {
        await sendBox(
            player,
            ' %Tonight I was visited by three spirits %' +
                'The first spirit told me that his name was Praeteritum %' +
                'He then showed me a vision of a Christmas from my past %' +
                'I remember it well %' +
                'It was the Christmas that I lost the love of my life %' +
                'I was young and stupid %' +
                'She wanted me to spend time with her and her family %' +
                'But I was too concerned with my dukedom and riches %' +
                'And I turned her away %' +
                'I broke her heart %' +
                'And she never came around again'
        );
    } else if (page === 1) {
        await sendBox(
            player,
            ' %The second spirit said his name was Praesens %' +
                'He showed me a vision of a man that I recently banished from Lumbridge %' +
                'I kicked him out because he ruined Thanksgiving dinner %' +
                'He forgot to buy ingredients for the pie %' +
                'Apparently he is now living as a tramp in Varrock'
        );
    } else if (page === 2) {
        await sendBox(
            player,
            'The third and final spirit told me his name was Futurum %' +
                'The vision he had for me was the strangest of all %' +
                'It seemed to be a vision of the future %' +
                'In the vision, it was Christmas time like it is now %' +
                'The ghost showed me a man %' +
                'He was living at home, still with his elderly mother and her cats %' +
                'You could tell they did not have much money %' +
                'I didn\'t recognize the man, so I asked the spirit who he was %' +
                'The ghost told me that this man was Shilop %' +
                'I was astonished to see that the young lad had grown up to be so miserable %' +
                'Why just the other day the young lad had come all the way down from Varrock %' +
                'He asked me for a quest and some gear to get him started with adventuring %' +
                'Of course I told him that he was being ridiculous %' +
                'I told him that adventuring was not a life he should be persuing %' +
                'I had Hans take him back home'
        );
    }
    if (getStage(player) === GHOST_STORY) {
        updateStage(player, READ_BOOK);
    }
}

async function writeParchment(player) {
    player.message('You find a quill and ink bottle nearby on the ground');
    player.message('That\'s lucky!');
    await player.world.sleepTicks(5);
    player.message('You begin to write an apology letter as if it were from the Duke');
    await player.world.sleepTicks(5);
    player.message('Oh, rarely have words poured from your penny pencil--');
    await player.world.sleepTicks(5);
    player.message('err, quill--');
    await player.world.sleepTicks(5);
    player.message('with such feverish fluidity');
    await player.world.sleepTicks(5);
    player.message(
        'Before long, you have written a beautiful and heartfelt apology letter'
    );
    player.inventory.remove(DUKE_PARCHMENT_ID, 1);
    player.inventory.add(APOLOGY_LETTER_ID, 1);
}

async function readApologyLetter(player) {
    await sendBox(
        player,
        'My Love, % %' +
            'I hope you\'re doing well. I\'ve been reflecting on our past and the ' +
            'choices I made, and I want to sincerely apologize for my actions. I ' +
            'realize I made a terrible mistake by prioritizing my career over our ' +
            'relationship, especially during important moments like Christmas. % %' +
            'I deeply regret the pain I caused you, and I now understand the ' +
            'importance of love and connection in life. I\'ve made changes to my ' +
            'priorities, and I hope you can find it in your heart to forgive me. I ' +
            'miss you and would love the chance to make amends and rebuild what we once had. % %' +
            'Horacio'
    );
}

async function dyeSweater(player, sweaterId, dyeId) {
    let newSweaterId = dyeToSweater[dyeId];
    if (!player.isMale()) {
        newSweaterId += FEMALE_SWEATER_OFFSET;
    }

    player.message('You dye the sweater');
    player.inventory.remove(sweaterId, 1);
    player.inventory.remove(dyeId, 1);
    player.inventory.add(newSweaterId, 1);
}

async function handleDuke(player, npc) {
    if (inPartyRoom(npc)) {
        player.engage(npc);
        await partyDialogue(player, npc);
        player.disengage();
        return true;
    }

    const christmas = dukeChristmasOption(player, getStage(player));
    if (christmas === '') {
        return false;
    }

    player.engage(npc);
    await npc.say('Greetings welcome to my castle');

    const SEEK_SHIELD =
        'I seek a shield that will protect me from dragon breath';
    const QUESTS = 'Have you any quests for me?';
    const MONEY = 'Where can I find money?';

    const menu = [];
    const seekShield =
        (player.questStages.dragonSlayer === -1 ||
            player.questStages.dragonSlayer >= 2) &&
        !player.inventory.has(ANTI_DRAGON_BREATH_SHIELD_ID);
    if (seekShield) {
        menu.push(SEEK_SHIELD);
    }
    menu.push(QUESTS);
    menu.push(MONEY);
    menu.push(christmas);

    const choice = await player.ask(menu, false);
    const picked = menu[choice];

    if (picked === SEEK_SHIELD) {
        await player.say(
            'I seek a shield that will protect me from dragon\'s breath'
        );
        await npc.say(
            'A knight going on a dragon quest hmm?',
            'A most worthy cause',
            'Guard this well my friend'
        );
        player.inventory.add(ANTI_DRAGON_BREATH_SHIELD_ID);
        player.message('@que@The duke hands you a shield');
        player.disengage();
    } else if (picked === QUESTS) {
        await player.say('Have you any quests for me?');
        player.disengage();
        // delegates to rune mysteries, falls back to base line
        const handled = await runeMysteries.onTalkToNPC(player, npc);
        if (!handled) {
            player.engage(npc);
            await npc.say('All is well for me');
            player.disengage();
        }
    } else if (picked === MONEY) {
        await player.say('Where can I find money?');
        await npc.say(
            'I\'ve heard the blacksmiths are prosperous amoung the peasantry',
            'Maybe you could try your hand at that'
        );
        player.disengage();
    } else {
        await dukeDialogue(player, npc, christmas);
        player.disengage();
    }

    return true;
}

// christmas menu string; empty means no carol option
function dukeChristmasOption(player, stage) {
    switch (stage) {
        case NOT_STARTED:
            return 'You look like you haven\'t slept';
        case GHOST_STORY:
            return 'What did the spirits want?';
        case READ_BOOK:
            return 'I read your journal';
        case RECEIVED_PARCHMENT:
            if (ifheld(player, APOLOGY_LETTER_ID, 1)) {
                return 'I have finished writing the letter';
            }
            if (!ifheld(player, DUKE_PARCHMENT_ID, 1)) {
                return 'I lost the parchment you gave me';
            }
            return '';
        case LETTER_DELIVERY:
            return 'About the apology letter...';
        case DELIVERED_LETTER:
            return 'I delivered your letter';
        case FIND_TRAMP:
            return 'What am I doing again?';
        case FOUND_TRAMP:
        case HELPED_TRAMP:
            return 'I found your old cook';
        case FIND_SHILOP:
            return 'What am I doing again?';
        case HELPED_SHILOP:
            return 'I helped out Shilop';
        case PARTY_TIME:
            return 'Where is the Christmas party again?';
        default:
            return '';
    }
}

async function handleMum(player, npc) {
    if (inPartyRoom(npc)) {
        player.engage(npc);
        await partyDialogue(player, npc);
        player.disengage();
        return true;
    }

    if (getStage(player) === LETTER_DELIVERY) {
        player.engage(npc);
        await npc.say('Hello, sweetie', 'I hope your adventuring is going well');
        // carol option only; other menu items handled elsewhere
        await player.ask(['Did you used to date the Duke?'], false);
        await mumDialogue(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

async function handleTramp(player, npc) {
    if (inPartyRoom(npc)) {
        player.engage(npc);
        await partyDialogue(player, npc);
        player.disengage();
        return true;
    }

    const stage = getStage(player);
    if (stage === FIND_TRAMP || stage === GET_CLOTHES) {
        player.engage(npc);
        // greeting plus carol option only
        await npc.say('Spare some change guv?');
        const label =
            stage === FIND_TRAMP
                ? 'I have a job offer for you'
                : 'About the clothes...';
        await player.ask([label], false);
        await trampDialogue(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

async function handleShilop(player, npc) {
    if (inPartyRoom(npc)) {
        player.engage(npc);
        await partyDialogue(player, npc);
        player.disengage();
        return true;
    }

    const stage = getStage(player);
    // carol owns shilop between these two stages, else falls through
    if (stage >= FIND_SHILOP && stage <= GET_SWORD) {
        player.engage(npc);
        await shilopDialogue(player, npc, stage);
        player.disengage();
        return true;
    }

    return false;
}

async function onTalkToNPC(player, npc) {
    if (!customQuestsEnabled(player)) {
        return false;
    }

    switch (npc.id) {
        case DUKE_ID:
            return handleDuke(player, npc);
        case MUM_ID:
            return handleMum(player, npc);
        case TRAMP_ID:
            return handleTramp(player, npc);
        case SHILOP_ID:
            return handleShilop(player, npc);
        case PRAETERITUM_ID:
        case PRAESENS_ID:
        case FUTURUM_ID:
            player.engage(npc);
            await ghostDialogue(player, npc);
            player.disengage();
            return true;
        default:
            return false;
    }
}

async function onInventoryCommand(player, item) {
    if (!customQuestsEnabled(player)) {
        return false;
    }

    if (item.id === DUKES_JOURNAL_ID) {
        await openJournal(player);
        return true;
    }

    if (item.id === DUKE_PARCHMENT_ID) {
        await writeParchment(player);
        return true;
    }

    if (item.id === APOLOGY_LETTER_ID) {
        await readApologyLetter(player);
        return true;
    }

    return false;
}

async function onUseWithInventory(player, item, target) {
    if (!customQuestsEnabled(player)) {
        return false;
    }

    const itemIsSweater = sweaterIds.includes(item.id);
    const targetIsSweater = sweaterIds.includes(target.id);
    const itemIsDye = dyeIds.includes(item.id);
    const targetIsDye = dyeIds.includes(target.id);

    const sweaterId = itemIsSweater ? item.id : targetIsSweater ? target.id : null;
    const dyeId = itemIsDye ? item.id : targetIsDye ? target.id : null;

    // blockUseInv: one item is a sweater AND the other is a dye.
    if (sweaterId !== null && dyeId !== null) {
        await dyeSweater(player, sweaterId, dyeId);
        return true;
    }

    return false;
}

module.exports = { onTalkToNPC, onInventoryCommand, onUseWithInventory };
