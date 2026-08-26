// digsite examiner; correct answers depend on gathered student hints

const { questsEnabled } = require('../../custom-gate.js');
const {
    EXAMINER_ID,
    TROWEL_ID,
    UNSTAMPED_LETTER_OF_RECOMMENDATION_ID,
    STAMPED_LETTER_OF_RECOMMENDATION_ID,
    LEVEL_1_CERTIFICATE_ID,
    LEVEL_2_CERTIFICATE_ID,
    LEVEL_3_CERTIFICATE_ID
} = require('./constants.js');

function hasAllExamHints(player, suffix) {
    return (
        player.cache[`student_orange_${suffix}`] === true &&
        player.cache[`student_green_${suffix}`] === true &&
        player.cache[`student_purple_${suffix}`] === true
    );
}

// "I have lost my trowel!" branch, reused across several stages.
async function lostTrowel(player, npc) {
    if (player.inventory.has(TROWEL_ID)) {
        await npc.say('Really ?', 'Look in your backpack and make sure first');
    } else {
        player.inventory.add(TROWEL_ID, 1);
        await npc.say(
            'Deary me.. that was a good one as well',
            "It's a good job I have another",
            'Here you go'
        );
    }
}

// EXAM 1
async function startExam1(player, npc) {
    const score = { value: 0 };
    await npc.say(
        'Okay, we will start with the first level exam:',
        'Earth sciences level 1 - Beginner',
        'Question 1 - Earth sciences overview...',
        'Can you tell me what earth sciences is ?'
    );

    const hints = hasAllExamHints(player, 'c');
    let menu1;
    if (hints) {
        menu1 = await player.ask(
            [
                "The study of the earth, It's contents and It's history",
                'The study of planets, and the history of forming worlds',
                'The combination of all skills applied to the working of the earth'
            ],
            false
        );
    } else {
        menu1 = await player.ask(
            [
                'The study of gardening, planting and fruiting vegetation',
                'The study of planets, and the history of worlds',
                'The combination of all skills applied to the working of the earth'
            ],
            false
        );
    }

    if (menu1 === 0) {
        if (hints) {
            await player.say(
                "The study of the earth, It's contents and It's history"
            );
            score.value++;
        } else {
            await player.say(
                'The study of gardening, planting and fruiting vegetation'
            );
        }
    } else if (menu1 === 1) {
        await player.say(
            'The study of planets, and the history of forming worlds'
        );
    } else if (menu1 === 2) {
        await player.say(
            'The combination of all skills applied to the working of the earth'
        );
    }

    await exam1Q2(player, npc, score);
}

async function exam1Q2(player, npc, score) {
    await npc.say(
        'Okay, next question...',
        'Earth sciences level 1',
        'Question 2 - Elligibility',
        'Can you tell me what people are allowed to use the digsite ?'
    );

    const hints = hasAllExamHints(player, 'c');
    let menu2;
    if (hints) {
        menu2 = await player.ask(
            [
                'Professors, students and workmen only',
                'Local residents, and contractors only',
                'All that have passed the appropriate earth sciences exam'
            ],
            true
        );
    } else {
        menu2 = await player.ask(
            [
                'Magic users, miners and their escorts',
                'Professors, students and workmen only',
                'Local residents, and contractors only'
            ],
            true
        );
    }

    if (menu2 === 2 && hints) {
        score.value++;
    }

    await exam1Q3(player, npc, score);
}

async function exam1Q3(player, npc, score) {
    await npc.say(
        'Okay, next question...',
        'Earth sciences level 1',
        'Question 3 - Health and safety',
        'Can you tell me the proper safety points when working in a digsite ?'
    );

    const hints = hasAllExamHints(player, 'c');
    let menu3;
    if (hints) {
        menu3 = await player.ask(
            [
                'Overcoats and facemasks to be worn at all times',
                'Gloves and boots to be worn at all times, proper tools must be used',
                'Protective clothing to be worn, tools kept away from site'
            ],
            true
        );
    } else {
        menu3 = await player.ask(
            [
                'Heat-resistant clothing to be worn at all times',
                'Overcoats and facemasks to be worn at all times',
                'Protective clothing to be worn, tools kept away from site'
            ],
            true
        );
    }

    if (menu3 === 1 && hints) {
        score.value++;
    }

    await exam1Final(player, npc, score);
}

async function exam1Final(player, npc, score) {
    await npc.say(
        'Okay, that covers level 1 Earthsciences exam',
        "Let's see how you did..."
    );
    await player.world.sleepTicks(5);

    if (hasAllExamHints(player, 'c') && score.value === 3) {
        await npc.say('You got all the questions correct, well done');
        await player.say('Hey! Excellent!');
        await npc.say(
            'You have now passed the Earth sciences level 1 general exam',
            'Here is your certificate to prove it',
            'You also get a decent trowel to dig with'
        );
        await npc.say('Here you go...');
        player.message('The examiner hands you a trowel');
        player.inventory.add(TROWEL_ID, 1);
        player.inventory.add(LEVEL_1_CERTIFICATE_ID, 1);
        player.questStages.digsite = 3;
        delete player.cache.student_orange_c;
        delete player.cache.student_green_c;
        delete player.cache.student_purple_c;
    } else if (score.value === 0) {
        await npc.say(
            'Oh deary me!',
            'This is appauling, none correct at all!',
            'I suggest you go and study properly...'
        );
        await player.say('Oh dear...');
    } else if (score.value === 1) {
        await npc.say('You got 1 question correct', 'Better luck next time');
        await player.say('Oh bother!');
    } else if (score.value === 2) {
        await npc.say(
            'You got 2 questions correct',
            'Not bad, just a little more revision needed'
        );
        await player.say('Oh well...');
    }
}

// EXAM 2
async function startExam2(player, npc) {
    const score = { value: 0 };
    await npc.say(
        'Okay, this is the next part of the earth sciences exam',
        'Earth sciences level 2- Intermediate',
        'Question 1 - Sample transportation',
        'Can you tell me how we transport samples ?'
    );

    const hints = hasAllExamHints(player, 'exam2');
    let menu1;
    if (hints) {
        menu1 = await player.ask(
            [
                'Samples ground and suspended in an acid solution',
                'Samples to be left at digsite for examination',
                'Samples taken in rough form, kept only in sealed containers'
            ],
            true
        );
    } else {
        menu1 = await player.ask(
            [
                'Samples cut and cleaned before transportation',
                'Samples ground and suspended in an acid solution',
                'Samples to be left at digsite for examination'
            ],
            true
        );
    }

    if (menu1 === 2 && hints) {
        score.value++;
    }

    await exam2Q2(player, npc, score);
}

async function exam2Q2(player, npc, score) {
    await npc.say(
        'Okay, next question...',
        'Earth sciences level 2',
        'Question 2 - handling of finds',
        'What is the proper way to handle finds ?'
    );

    const hints = hasAllExamHints(player, 'exam2');
    let menu2;
    if (hints) {
        menu2 = await player.ask(
            [
                'Finds must be carefully handled, and gloves worn',
                'Finds to be given to the site workmen',
                'Finds are kept together for safekeeping'
            ],
            true
        );
    } else {
        menu2 = await player.ask(
            [
                'Finds must not be handled by anyone',
                'Finds to be given to the site workmen',
                'Finds are kept together for safekeeping'
            ],
            true
        );
    }

    if (menu2 === 0 && hints) {
        score.value++;
    }

    await exam2Q3(player, npc, score);
}

async function exam2Q3(player, npc, score) {
    await npc.say(
        'Okay, next question...',
        'Earth sciences level 2',
        'Question 3 - Rockpick usage',
        'Can you tell me the proper usage for a rockpick ?'
    );

    const hints = hasAllExamHints(player, 'exam2');
    let menu3;
    if (hints) {
        menu3 = await player.ask(
            [
                'Rockpick must be used flat and with strong force',
                "Always handle with care, strike the rock cleanly on it's cleaving point",
                'Rockpicks to be used only in emergencies'
            ],
            true
        );
    } else {
        menu3 = await player.ask(
            [
                'Strike rock repeatedly until powdered',
                'Rockpick must be used flat and with strong force',
                'Rockpicks to be used only in emergencies'
            ],
            true
        );
    }

    if (menu3 === 1 && hints) {
        score.value++;
    }

    await exam2Final(player, npc, score);
}

async function exam2Final(player, npc, score) {
    await npc.say(
        'Okay, that covers level 2 Earthsciences exam',
        'Let me add up your total...'
    );
    await player.world.sleepTicks(3);

    if (hasAllExamHints(player, 'exam2') && score.value === 3) {
        await npc.say('You got all the questions correct, well done!');
        await player.say("Great, I'm getting good at this");
        await npc.say(
            'You have now passed the Earth sciences level 2 intermediate exam',
            'Here is your certificate'
        );
        player.inventory.add(LEVEL_2_CERTIFICATE_ID, 1);
        player.questStages.digsite = 4;
        delete player.cache.student_orange_exam2;
        delete player.cache.student_green_exam2;
        delete player.cache.student_purple_exam2;
    } else if (score.value === 0) {
        await npc.say(
            'No no no!',
            'This will not do',
            'They are all wrong, start again!'
        );
        await player.say('Oh no!');
    } else if (score.value === 1) {
        await npc.say('You got 1 question correct', "At least it's a start");
        await player.say('Oh well...');
    } else if (score.value === 2) {
        await npc.say(
            'You got 2 questions correct',
            'Not too bad, but you can do better...'
        );
        await player.say('Nearly got it');
    }
}

// EXAM 3
async function startExam3(player, npc) {
    const score = { value: 0 };
    await npc.say(
        'Attention, this is the final part of the earth sciences exam',
        'Earth sciences level 3 - Advanced',
        'Question 1 - Sample preparation',
        'Can you tell me how we prepare samples ?'
    );

    const hints = hasAllExamHints(player, 'exam3');
    let menu1;
    if (hints) {
        menu1 = await player.ask(
            [
                'Samples cleaned and carried only in specimen jars',
                'Sample types catalogued and carried by hand only',
                'Samples not to be prepared by any means'
            ],
            true
        );
    } else {
        menu1 = await player.ask(
            [
                'Samples may be mixed together safely',
                'Sample types catalogued and carried by hand only',
                'Samples not to be prepared by any means'
            ],
            true
        );
    }

    if (menu1 === 0 && hints) {
        score.value++;
    }

    await exam3Q2(player, npc, score);
}

async function exam3Q2(player, npc, score) {
    await npc.say(
        'Okay, next question...',
        'Earth sciences level 3',
        'Question 2 - Specimen brush use',
        'What is the proper way to use the specimen brush ?'
    );

    const hints = hasAllExamHints(player, 'exam3');
    let menu2;
    if (hints) {
        menu2 = await player.ask(
            [
                'Brush carefully and slowly, using short strokes',
                'Brush pre-cleaned samples only',
                'Brush quickly and with force'
            ],
            true
        );
    } else {
        menu2 = await player.ask(
            [
                'Brush quickly using a wet brush',
                'Brush pre-cleaned samples only',
                'Brush quickly and with force'
            ],
            true
        );
    }

    if (menu2 === 0 && hints) {
        score.value++;
    }

    await exam3Q3(player, npc, score);
}

async function exam3Q3(player, npc, score) {
    await npc.say(
        'Okay, next question...',
        'Earth sciences level 3',
        'Question 3 - Advanced techniques',
        'Can you tell me the proper technique for dealing with bones ?'
    );

    const hints = hasAllExamHints(player, 'exam3');
    let menu3;
    if (hints) {
        menu3 = await player.ask(
            [
                'Bones must be suspended in a sterile solution',
                'Bones to be ground and tested for mineral content',
                'Handle bones very carefully, and keep away from other samples'
            ],
            true
        );
    } else {
        menu3 = await player.ask(
            [
                'Bones must not be taken from the digsite',
                'Bones must be suspended in a sterile solution',
                'Bones to be ground and tested for mineral content'
            ],
            true
        );
    }

    if (menu3 === 2 && hints) {
        score.value++;
    }

    await exam3Final(player, npc, score);
}

async function exam3Final(player, npc, score) {
    await npc.say(
        'Okay, that concludes level 3 Earthsciences exam',
        'Let me add up the results...'
    );
    await player.world.sleepTicks(3);

    if (hasAllExamHints(player, 'exam3') && score.value === 3) {
        await npc.say('You got all the questions correct, well done!');
        await player.say('Hooray!');
        await npc.say(
            'Congratulations, You have now passed the Earth sciences level 3 advanced exam',
            'Here is your level 3 certificate'
        );
        player.inventory.add(LEVEL_3_CERTIFICATE_ID, 1);
        await player.say('I can dig wherever I want now...');
        delete player.cache.student_orange_exam3;
        delete player.cache.student_green_exam3;
        delete player.cache.student_purple_exam3;
        player.questStages.digsite = 5;
    } else if (score.value === 0) {
        await npc.say(
            'I cannot believe this!',
            'Absolutely none right at all',
            'I doubt you did any research before you took this exam...'
        );
        await player.say(
            'Ah...yes...erm....',
            'I think I had better go and revise first!'
        );
    } else if (score.value === 1) {
        await npc.say('You got 1 question correct', 'Try harder!');
        await player.say('Oh bother!');
    } else if (score.value === 2) {
        await npc.say(
            'You got 2 questions correct',
            'A little more study and you will pass it'
        );
        await player.say("I'm nearly there...");
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== EXAMINER_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.digsite;

    if (stage === -1) {
        await npc.say(
            'Hi there',
            'My colleague tells me you helped to uncover',
            'A hidden altar to the god zaros',
            'A great scholar and archaeologist indeed!',
            'Good health and prosperity to you'
        );
        const finalMenu = await player.ask(
            ['Thanks!', 'I have lost my trowel!'],
            true
        );
        if (finalMenu === 1) {
            await lostTrowel(player, npc);
        }
    } else if (stage === 0) {
        await player.say('Hello');
        await npc.say(
            'Ah hello there',
            'I am the resident lecturer on antiquities and artifacts',
            'I also set the earth sciences exams'
        );
        await player.say('earth sciences ?');
        await npc.say(
            'That is right dear',
            "The world of RuneScape holds many wonders beneath it's surface"
        );
        const menu = await player.ask(
            ['Can I take an exam ?', 'Interesting...'],
            true
        );
        if (menu === 0) {
            await npc.say(
                'You can if you get this letter of recommendation stamped',
                'By the curator of varrock museum'
            );
            await player.say("Oh right, I'll see what I can do");
            player.inventory.add(UNSTAMPED_LETTER_OF_RECOMMENDATION_ID, 1);
            player.questStages.digsite = 1;
        } else if (menu === 1) {
            await npc.say(
                'You could gain much with an understanding of the world below'
            );
        }
    } else if (stage === 1) {
        await player.say('Hello');
        await npc.say('Hello again');
        if (player.inventory.has(STAMPED_LETTER_OF_RECOMMENDATION_ID)) {
            await player.say('Here is the stamped letter you asked for');
            player.inventory.remove(STAMPED_LETTER_OF_RECOMMENDATION_ID);
            player.questStages.digsite = 2;
            await npc.say('Good good, we will begin the exam...');
            await startExam1(player, npc);
        } else {
            await npc.say(
                'I am still waiting for your stamped letter of recommendation'
            );
            const opt = await player.ask(
                [
                    'I have lost the letter you gave me',
                    "All right I'll try and get it"
                ],
                false
            );
            if (opt === 0) {
                await player.say('I have lost the letter you gave me');
                if (
                    player.inventory.has(UNSTAMPED_LETTER_OF_RECOMMENDATION_ID)
                ) {
                    await npc.say('Oh now come on', 'You have it with you!');
                } else {
                    await npc.say(
                        'That was foolish!',
                        'Take this one and keep it safe this time...'
                    );
                    player.inventory.add(
                        UNSTAMPED_LETTER_OF_RECOMMENDATION_ID,
                        1
                    );
                }
            } else if (opt === 1) {
                await player.say("All right i'll try and get it");
                await npc.say('I am sure you wont get any problems');
            }
        }
    } else if (stage === 2) {
        await player.say('Hello');
        await npc.say(
            'Hello again',
            'Are you ready for another shot at the exam ?'
        );
        const opt2 = await player.ask(
            ['Yes I certainly am', 'No, not at the moment'],
            false
        );
        if (opt2 === 0) {
            await player.say('Yes I certainly am');
            await startExam1(player, npc);
        } else if (opt2 === 1) {
            await player.say("Sorry, I didn't mean to disturb you...");
            await npc.say('Oh, no problem at all');
        }
    } else if (stage === 3) {
        await player.say('Hello');
        await npc.say('Hi there');
        const opt3 = await player.ask(
            [
                'I am ready for the next exam section',
                'I am stuck on a question',
                "Sorry, I didn't mean to disturb you...",
                'I have lost my trowel!'
            ],
            true
        );
        if (opt3 === 0) {
            await startExam2(player, npc);
        } else if (opt3 === 1) {
            await npc.say(
                'Well well, have you not been doing your studies ?',
                'I am not going to give you the answers',
                'Talk to the other students and remember the answers'
            );
        } else if (opt3 === 2) {
            await npc.say('Oh, no problem at all');
        } else if (opt3 === 3) {
            await lostTrowel(player, npc);
        }
    } else if (stage === 4) {
        await player.say('Hello');
        await npc.say('Ah hello again');
        const opt4 = await player.ask(
            [
                'I am ready for the last part of the exam',
                'I am stuck on a question',
                "Sorry, I didn't mean to disturb you...",
                'I have lost my trowel!'
            ],
            true
        );
        if (opt4 === 0) {
            await startExam3(player, npc);
        } else if (opt4 === 1) {
            await npc.say(
                'Well well, have you not been doing your studies ?',
                'I am not going to give you the answers',
                'Talk to the other students and remember the answers'
            );
        } else if (opt4 === 2) {
            await npc.say('Oh, no problem at all');
        } else if (opt4 === 3) {
            await lostTrowel(player, npc);
        }
    } else if (stage === 5 || stage === 6) {
        await player.say('Hello');
        await npc.say(
            'Hi',
            'You have finished all the earth science exams now',
            'Congratulations on your graduation',
            'You now have free access to dig anywhere on the digsite'
        );
        const opt5 = await player.ask(
            ['Thanks!', 'I have lost my trowel!'],
            true
        );
        if (opt5 === 1) {
            await lostTrowel(player, npc);
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
