
const { questsEnabled } = require('../../custom-gate.js');
const {
    STUDENT_ORANGE_ID,
    STUDENT_GREEN_ID,
    STUDENT_PURPLE_ID,
    ROCK_SAMPLE_ORANGE_ID,
    ROCK_SAMPLE_GREEN_ID,
    ROCK_SAMPLE_PURPLE_ID,
    CRACKED_ROCK_SAMPLE_ID,
    UNCUT_OPAL_ID
} = require('./constants.js');

// correct rock passed at correct time
async function giveRock(player, npc) {
    if (npc.id === STUDENT_ORANGE_ID) {
        await player.say('Look what I found');
        player.inventory.remove(ROCK_SAMPLE_ORANGE_ID);
        player.cache.student_orange_c = true;
        delete player.cache.student_orange_s;
        await npc.say(
            'Excellent!',
            "I'm so happy",
            'Let me now help you with your exams...',
            'The elligible people to use the digsite are:',
            'All that have passed the appropriate earth sciences exams'
        );
        await player.say('Thanks for the information');
    } else if (npc.id === STUDENT_GREEN_ID) {
        await player.say('Hi, is this your rock sample ?');
        player.inventory.remove(ROCK_SAMPLE_GREEN_ID);
        player.cache.student_green_c = true;
        delete player.cache.student_green_s;
        await npc.say(
            "Oh wow! you've found it!",
            'Thank you so much',
            "I'll be glad to tell you what I know about the exam",
            'The study of earthsciences is:',
            "The study of the earth, It's contents and It's history"
        );
        await player.say("Okay I'll remember that");
    } else if (npc.id === STUDENT_PURPLE_ID) {
        await player.say('Guess what I found ?');
        player.inventory.remove(ROCK_SAMPLE_PURPLE_ID);
        player.cache.student_purple_c = true;
        delete player.cache.student_purple_s;
        await npc.say(
            'Hey! my sample!',
            'Thanks ever so much',
            'Let me help you with those questions now',
            'The proper health and safety points are:',
            'Gloves and boots to be worn at all times, proper tools must be used'
        );
        await player.say('Great, thanks for your advice');
    }
}

async function talkOrange(player, npc) {
    const stage = player.questStages.digsite;
    switch (stage) {
        case 0:
        case 1:
            await player.say('Hello there');
            await npc.say('Hello there, as you can see I am a student');
            await player.say('What are you doing here ?');
            await npc.say("Oh I'm studying for the earth sciences exam");
            await player.say(
                'Interesting....perhaps I should study it as well...'
            );
            break;
        case 2:
            await player.say('Hello there');
            if (player.cache.student_orange_c === true) {
                await npc.say("How's it going ?");
                await player.say("There are more exam questions I'm stuck on");
                await npc.say(
                    "Hey, i'll tell you what I've learned, that may help",
                    'The elligible people to use the digsite are:',
                    'All that have passed the appropriate earth sciences exams'
                );
                await player.say('Thanks for the information');
            } else if (player.cache.student_orange_s === true) {
                if (player.inventory.has(ROCK_SAMPLE_ORANGE_ID)) {
                    await giveRock(player, npc);
                } else {
                    await player.say("How's the study going ?");
                    await npc.say(
                        "I'm getting there",
                        'Have you found my rock sample yet ?'
                    );
                    await player.say('No sorry, not yet');
                    await npc.say(
                        "Oh dear, I hope it didn't fall into the stream",
                        'I might never find it again...'
                    );
                }
            } else {
                await player.say(
                    'Can you help me with the earth sciences exams at all?'
                );
                await npc.say("I can't do anything unless I find my rock sample");
                await player.say('Hey this rings a bell');
                await npc.say('?');
                await player.say("So if I find it you'll help me ?");
                await npc.say('I sure will');
                await player.say('Any ideas where it may be ?');
                await npc.say(
                    'All I remember is that I was working near the tents when I lost it...'
                );
                await player.say("Okay I'll see what I can do ");
                player.cache.student_orange_s = true;
            }
            break;
        case 3:
            await player.say('Hello there');
            await npc.say("How's it going ?");
            await player.say("There are more exam questions I'm stuck on");
            await npc.say(
                "Hey, i'll tell you what I've learned, that may help",
                'Correct sample transportation:',
                'Samples taken in rough form, kept only in sealed containers'
            );
            await player.say('Thanks for the information');
            if (player.cache.student_orange_exam2 !== true) {
                player.cache.student_orange_exam2 = true;
            }
            break;
        case 4:
            await player.say('Hello there');
            await npc.say("How's it going ?");
            await player.say("There are more exam questions I'm stuck on");
            await npc.say(
                "Hey, i'll tell you what I've learned, that may help",
                'The proper technique for handling bones is:',
                'Handle bones very carefully, and keep away from other samples'
            );
            await player.say('Thanks for the information');
            if (player.cache.student_orange_exam3 !== true) {
                player.cache.student_orange_exam3 = true;
            }
            break;
        case 5:
            await player.say('Hello there');
            await npc.say(
                'Thanks a lot for finding my rock sample',
                'See you again'
            );
            break;
        case 6:
        case -1:
            await npc.say(
                "Hey it's the great explorer!",
                'Well done for finding the altar'
            );
            break;
    }
}

async function talkGreen(player, npc) {
    const stage = player.questStages.digsite;
    switch (stage) {
        case 0:
        case 1:
            await player.say('Hello there');
            await npc.say("Oh hi, i'm studying hard for an exam");
            await player.say('What exam is that ?');
            await npc.say("It's the earth sciences exam");
            await player.say('Interesting....');
            break;
        case 2:
            await player.say('Hello there');
            if (player.cache.student_green_c === true) {
                await npc.say("How's it going ?");
                await player.say('I need more help with the exam');
                await npc.say(
                    'Well okay, this is what I have learned since I last spoke to you...',
                    'The study of earthsciences is:',
                    "The study of the earth, It's contents and It's history"
                );
                await player.say("Okay I'll remember that");
            } else if (player.cache.student_green_s === true) {
                if (player.inventory.has(ROCK_SAMPLE_GREEN_ID)) {
                    await giveRock(player, npc);
                } else {
                    await player.say("How's the study going ?");
                    await npc.say(
                        'Very well thanks',
                        'Have you found my rock sample yet ?'
                    );
                    await player.say('No sorry, not yet');
                    await npc.say(
                        'Oh well...',
                        "I am sure it's been picked up",
                        "Couldn't you try looking through some pockets ?"
                    );
                }
            } else {
                await player.say(
                    'Can you help me with the earth sciences exams at all?'
                );
                await npc.say(
                    'Well...maybe I will if you help me with something'
                );
                await player.say("What's that ?");
                await npc.say('I have lost my rock sample');
                await player.say('What does it look like ?');
                await npc.say('Err....like a rock!');
                await player.say(
                    "Well that's not too helpful",
                    'Can you remember where you last had it ?'
                );
                await npc.say(
                    'It was around here for sure',
                    'Maybe someone picked it up ?'
                );
                await player.say("Okay I'll have a look for you");
                player.cache.student_green_s = true;
            }
            break;
        case 3:
            await player.say('Hello there');
            await npc.say("How's it going ?");
            await player.say('I need more help with the exam');
            await npc.say(
                'Well okay, this is what I have learned since I last spoke to you...',
                'Correct rockpick usage:',
                "Always handle with care, strike the rock cleanly on it's cleaving point"
            );
            await player.say("Okay I'll remember that");
            if (player.cache.student_green_exam2 !== true) {
                player.cache.student_green_exam2 = true;
            }
            break;
        case 4:
            await player.say('Hello there');
            await npc.say("How's it going ?");
            await player.say('I need more help with the exam');
            await npc.say(
                'Well okay, this is what I have learned since I last spoke to you...',
                'Specimen brush use:',
                'Brush carefully and slowly, using short strokes'
            );
            await player.say("Okay I'll remember that");
            if (player.cache.student_green_exam3 !== true) {
                player.cache.student_green_exam3 = true;
            }
            break;
        case 5:
            await player.say('Hello there');
            await npc.say(
                "Thanks for your help, I'll pass these exams yet!",
                'See you later'
            );
            break;
        case 6:
        case -1:
            await npc.say(
                'Oh hi again',
                'News of your find has spread fast',
                'You are quite famous around here now'
            );
            break;
    }
}

async function talkPurple(player, npc) {
    const stage = player.questStages.digsite;
    switch (stage) {
        case 0:
        case 1:
            await player.say('Hello there');
            await npc.say(
                "Hi there, I'm studying for the earth sciences exam"
            );
            await player.say(
                'Interesting....This exam seems to be a popular one!'
            );
            break;
        case 2:
            await player.say('Hello there');
            if (player.cache.student_purple_c === true) {
                await npc.say("How's it going ?");
                await player.say('I am stuck on some more exam questions');
                await npc.say(
                    "Okay, I'll tell you my latest notes...",
                    'The proper health and safety points are:',
                    'Gloves and boots to be worn at all times, proper tools must be used'
                );
                await player.say('Great, thanks for your advice');
            } else if (player.cache.student_purple_s === true) {
                if (player.inventory.has(ROCK_SAMPLE_PURPLE_ID)) {
                    await giveRock(player, npc);
                } else {
                    await player.say("How's the study going ?");
                    await npc.say(
                        'Very well thanks',
                        'Have you found my rock sample yet ?'
                    );
                    await player.say('No sorry, not yet');
                    await npc.say(
                        "I'm sure it's just outside the digsite somewhere..."
                    );
                }
            } else {
                await player.say('Can you help me with the exams at all?');
                await npc.say('I can if you help me...');
                await player.say('How can I do that');
                await npc.say('I have lost my rock sample');
                await player.say('What you as well ?');
                await npc.say("Err, yes it's gone somewhere");
                await player.say('Do you know where you dropped it ?');
                await npc.say(
                    'Well, I was doing a lot of walking that day...',
                    "Oh yes, that's right...",
                    'We were studying ceramics in fact',
                    'I found some pottery...',
                    'And it seemed to match the design that is on those large urns...',
                    '...I was in the process of checking this out',
                    'And when we got back to the centre...',
                    'My rock sample had gone'
                );
                await player.say("Leave it to me, I'll find it");
                await npc.say('Oh great!');
                player.cache.student_purple_s = true;
            }
            break;
        case 3:
            await player.say('Hello there');
            await npc.say("How's it going ?");
            await player.say('I am stuck on some more exam questions');
            await npc.say(
                "Okay, I'll tell you my latest notes...",
                'Finds handling:',
                'Finds must be carefully handled, and gloves worn'
            );
            await player.say('Great, thanks for your advice');
            if (player.cache.student_purple_exam2 !== true) {
                player.cache.student_purple_exam2 = true;
            }
            break;
        case 4:
            if (player.cache.student_purple_exam3 === true) {
                await player.say('Hello there');
                await npc.say(
                    'Hi, the opal looks magnificent',
                    "Thanks for everything you've done for me"
                );
            } else if (player.cache.student_purple_opal === true) {
                await player.say('Hello there');
                await npc.say('Oh hi again', 'Did you bring me the opal ?');
                if (player.inventory.has(UNCUT_OPAL_ID)) {
                    await player.say(
                        'Would that opal look like this by any chance ?'
                    );
                    player.inventory.remove(UNCUT_OPAL_ID);
                    player.cache.student_purple_exam3 = true;
                    delete player.cache.student_purple_opal;
                    await npc.say(
                        "Wow, great you've found one",
                        'This will look beautiful set in my necklace',
                        "Thanks for that, now I'll tell you what I know...",
                        'Sample preparation:',
                        'Samples cleaned and carried only in specimen jars'
                    );
                    await player.say('Great, thanks for your advice');
                } else {
                    await player.say("I haven't found one yet");
                    await npc.say('Oh well, tell me when you do');
                }
            } else {
                await player.say('Hello there');
                await npc.say('What, you want more help ?');
                await player.say('Err... yes please!');
                await npc.say("Well.. it's going to cost you...");
                await player.say('Oh, well how much ?');
                await npc.say(
                    "I'll tell you what I would like...",
                    "A precious stone, I don't find many of these",
                    'My favourite is an opal, they are beautiful',
                    '...Just like me',
                    'Tee hee hee !'
                );
                await player.say("Err... okay I'll see what I can do");
                if (player.cache.student_purple_opal !== true) {
                    player.cache.student_purple_opal = true;
                }
            }
            break;
        case 5:
            await player.say('Hello there');
            await npc.say(
                "Thanks for your help, I'll pass these exams yet!",
                'See you later'
            );
            break;
        case 6:
        case -1:
            await npc.say(
                'Hi there',
                "Thanks again, hey maybe I'll be asking you",
                'For help next time...',
                'It seems you are something of an expert now !'
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id !== STUDENT_ORANGE_ID &&
        npc.id !== STUDENT_GREEN_ID &&
        npc.id !== STUDENT_PURPLE_ID
    ) {
        return false;
    }

    player.engage(npc);

    if (npc.id === STUDENT_ORANGE_ID) {
        await talkOrange(player, npc);
    } else if (npc.id === STUDENT_GREEN_ID) {
        await talkGreen(player, npc);
    } else if (npc.id === STUDENT_PURPLE_ID) {
        await talkPurple(player, npc);
    }

    player.disengage();
    return true;
}

const NONE = 0;
const REQUESTED_ROCK = 1;
const GAVE_ROCK = 2;

const RD_ALREADY_GAVE = 0;
const RD_INCORRECT_ROCK = 1;
const RD_CRACKED_ROCK = 2;
const RD_NONE = -1;

function progressFor(player, colour) {
    const stage = player.questStages.digsite;
    if (
        stage >= 3 ||
        stage === -1 ||
        player.cache[`student_${colour}_c`] === true
    ) {
        return GAVE_ROCK;
    }
    if (player.cache[`student_${colour}_s`] === true) {
        return REQUESTED_ROCK;
    }
    return NONE;
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id !== STUDENT_ORANGE_ID &&
        npc.id !== STUDENT_GREEN_ID &&
        npc.id !== STUDENT_PURPLE_ID
    ) {
        return false;
    }

    const rockItems = [
        CRACKED_ROCK_SAMPLE_ID,
        ROCK_SAMPLE_ORANGE_ID,
        ROCK_SAMPLE_PURPLE_ID,
        ROCK_SAMPLE_GREEN_ID
    ];
    if (!rockItems.includes(item.id)) {
        return false;
    }

    player.engage(npc);

    let dId = RD_NONE;

    let colour;
    let correctRockId;
    let feminine = false;
    if (npc.id === STUDENT_ORANGE_ID) {
        colour = 'orange';
        correctRockId = ROCK_SAMPLE_ORANGE_ID;
    } else if (npc.id === STUDENT_GREEN_ID) {
        colour = 'green';
        correctRockId = ROCK_SAMPLE_GREEN_ID;
    } else {
        colour = 'purple';
        correctRockId = ROCK_SAMPLE_PURPLE_ID;
        feminine = true;
    }

    if (item.id === CRACKED_ROCK_SAMPLE_ID) {
        dId = RD_CRACKED_ROCK;
    } else {
        const cId = progressFor(player, colour);
        if (cId === REQUESTED_ROCK) {
            if (item.id === correctRockId) {
                await giveRock(player, npc);
                player.disengage();
                return true;
            }
            dId = RD_INCORRECT_ROCK;
        } else if (cId === NONE) {
            if (item.id === correctRockId) {
                player.message(
                    'I am not sure why I am giving this rock to the student...'
                );
                await player.world.sleepTicks(3);
            } else {
                player.message(
                    feminine
                        ? 'Perhaps I should speak to her first'
                        : 'Perhaps I should speak to him first'
                );
                await player.world.sleepTicks(3);
            }
            player.disengage();
            return true;
        } else {
            // GAVE_ROCK
            if (item.id === correctRockId) {
                dId = RD_ALREADY_GAVE;
            } else {
                dId = RD_INCORRECT_ROCK;
            }
        }
    }

    if (dId === RD_ALREADY_GAVE) {
        await npc.say(
            "Uh? you've already given me my rock sample back!"
        );
    } else if (dId === RD_INCORRECT_ROCK || dId === RD_CRACKED_ROCK) {
        player.message('You give the rock sample to the student');
        await player.say('Is this your sample ?');
        if (dId === RD_INCORRECT_ROCK) {
            await npc.say(
                "Oh dear, no it's not",
                'It looks a bit like this, but not the same...'
            );
        } else if (dId === RD_CRACKED_ROCK) {
            if (npc.id === STUDENT_GREEN_ID) {
                await npc.say('This ? oh no...', "mine wasn't in two pieces");
            } else if (npc.id === STUDENT_ORANGE_ID) {
                await npc.say('This broken rock ?', 'I hope not!');
            } else if (npc.id === STUDENT_PURPLE_ID) {
                await npc.say('This one cracked ?', "don't think so.");
            }
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC, onUseWithNPC };
