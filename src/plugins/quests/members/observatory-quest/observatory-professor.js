// observatory professor: starts the quest and receives the telescope parts, lens mould and finished lens

const { questsEnabled } = require('../../custom-gate.js');
const {
    OBSERVATORY_PROFESSOR_ID,
    PLANK_ID,
    BRONZE_BAR_ID,
    MOLTEN_GLASS_ID,
    LENS_MOULD_ID,
    LENS_ID
} = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== OBSERVATORY_PROFESSOR_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.observatoryQuest || 0;

    switch (stage) {
        case 0: {
            await npc.say('Hello adventurer', 'What brings you to these parts ?');
            // multi(..., false, ...): do not send the picked line automatically.
            const first = await player.ask(
                [
                    'I am lost!!!',
                    "I'd like to have a look through that telescope",
                    'Whats the ladder over there for ?',
                    'It is of no concern of yours...'
                ],
                false
            );
            if (first === 0) {
                await player.say('I am lost!!!');
                await npc.say(
                    'Lost ? it must have been those gnomes that have lead you astray',
                    'Head North-East to find the land Ardougne'
                );
                await player.say(
                    "I'm sure I'll find the way",
                    'Thanks for your help'
                );
                await npc.say('No problem at all, come and visit again');
            } else if (first === 1) {
                await player.say(
                    "I'd like to have a look through that telescope"
                );
                await npc.say('So would I !!', 'The trouble is, its not working');
                await player.say('What do you mean ?');
                await npc.say('Did you see those houses outside ?');
                await player.say("Yes, I've seen them");
                await npc.say(
                    "Well it's a family of goblins",
                    'Since they moved here they cause me nothing but trouble',
                    'Last week my telescope was tampered with',
                    'And now parts need replacing before it can be used again',
                    "Err, I don't suppose you would be willing to help?"
                );
                const second = await player.ask(
                    [
                        'Sounds interesting, what can I do for you ?',
                        "Oh sorry, I don't have time for that"
                    ],
                    true
                );
                if (second === 0) {
                    await npc.say(
                        'Oh thanks so much!',
                        'I need three new parts for the telescope so it can be used again',
                        'I need wood to make a new tripod',
                        'Bronze to make a new tube',
                        'And glass for a replacement lens',
                        'My assistant will help you obtaining these',
                        'Ask him if you need any help'
                    );
                    await player.say('Okay what do I need to do ?');
                    await npc.say(
                        'First I need three planks of wood for the tripod'
                    );
                    player.questStages.observatoryQuest = 1;
                } else if (second === 1) {
                    await npc.say(
                        'Oh dear, I really do need some help',
                        'If you see anyone who can help please send them my way'
                    );
                    player.message('The Professor carries on with his duties');
                }
            } else if (first === 2) {
                await player.say("What's the ladder there for ?");
                await npc.say(
                    'The ladder leads to the entrance of the cavern',
                    'That leads from here to the observatory'
                );
            } else if (first === 3) {
                await player.say('It is of no concern of yours...');
                await npc.say("Okay Okay, there's no need to be insulting!");
                player.message('The professor carries on with his studies');
            }
            break;
        }
        case 1: {
            await npc.say(
                "I'ts my helping hand back again!",
                'Do you have the planks yet ?'
            );
            const planks = await player.ask(
                ["Yes I've got them", 'No, sorry not yet'],
                true
            );
            if (planks === 0) {
                if (player.inventory.has(PLANK_ID, 3)) {
                    await npc.say(
                        'Well done, I can start the tripod construction now',
                        'Now for the bronze'
                    );
                    for (let i = 0; i < 3; i++) {
                        player.inventory.remove(PLANK_ID, 1);
                    }
                    player.questStages.observatoryQuest = 2;
                } else {
                    await npc.say(
                        "You don't seem to have enough planks!",
                        'I need three in total'
                    );
                }
            } else if (planks === 1) {
                await npc.say('Oh dear, well please bring them soon');
            }
            break;
        }
        case 2: {
            await npc.say(' Hello again, do you have the bronze yet ?');
            const bronze = await player.ask(
                ['Yes I have it', "I'm still looking"],
                true
            );
            if (bronze === 0) {
                if (player.inventory.has(BRONZE_BAR_ID, 1)) {
                    await npc.say(
                        'Great, now all I need is the lens made',
                        'Next on the list is molten glass'
                    );
                    player.inventory.remove(BRONZE_BAR_ID, 1);
                    player.questStages.observatoryQuest = 3;
                } else {
                    await npc.say("That's not bronze!", 'Please bring me some');
                }
            } else if (bronze === 1) {
                await npc.say('Please carry on trying to find some');
            }
            break;
        }
        case 3: {
            await npc.say('How are you getting on finding me some glass ?');
            const molten = await player.ask(
                ['Here it is!', "No luck yet I'm afraid"],
                true
            );
            if (molten === 0) {
                if (player.inventory.has(MOLTEN_GLASS_ID, 1)) {
                    await npc.say(
                        'Excellent! now all I need is to make the lens',
                        "Oh no, I can't use this glass!",
                        'Until I find the lens mould used to cast it'
                    );
                    await player.say('What do you mean, lens mould');
                    await npc.say(
                        'I need my lens mould',
                        "Without it I'll never get the correct shape",
                        "I'll have to ask you to try and find it"
                    );
                    player.questStages.observatoryQuest = 4;
                } else {
                    await npc.say(
                        "Sorry, you don't have any glass with you",
                        "Please don't tease me, I really need this part!"
                    );
                }
            } else if (molten === 1) {
                await npc.say('I hope you find some soon');
            }
            break;
        }
        case 4: {
            await npc.say('Did you bring me the mould ?');
            const mould = await player.ask(
                [
                    "Yes, I've managed to find it",
                    "I haven't found it yet",
                    'I had it then lost it'
                ],
                true
            );
            if (mould === 0) {
                if (player.inventory.has(LENS_MOULD_ID, 1)) {
                    await npc.say(
                        "At last you've brought all the items I need",
                        'To repair the telescope',
                        "Oh no! I can't do this"
                    );
                    await player.say('What do you mean ?');
                    await npc.say(
                        'My crafting skill is not good enough',
                        'To finish this off',
                        'Are you skilled at crafting ?'
                    );
                    const craft = await player.ask(
                        [
                            'Yes I have much experience in crafting',
                            "No sorry I'm not good at that"
                        ],
                        true
                    );
                    if (craft === 0) {
                        await npc.say(
                            'Thank goodness for that!',
                            'You can use the mould with molten glass',
                            'To make a new lens',
                            'As long as you have practised your crafting skills'
                        );
                        player.questStages.observatoryQuest = 5;
                    } else if (craft === 1) {
                        await npc.say(
                            'Oh dear, without the lens its useless',
                            "Maybe you'll find someone who can Finish the job for you ?"
                        );
                        player.questStages.observatoryQuest = 5;
                    }
                } else {
                    await npc.say(
                        "Where is the mould! You dont even have it on you",
                        'Please try and find it'
                    );
                }
            } else if (mould === 1) {
                await npc.say('Perhaps the goblins have stolen it ?');
            } else if (mould === 2) {
                await npc.say(
                    "Well, I wouldn't worry",
                    'No doubt the goblins copied the design',
                    "I'm sure if you checked again",
                    "You'll find another one"
                );
            }
            break;
        }
        case 5: {
            await npc.say('Is the lens finished ?');
            const finished = await player.ask(
                ['Yes here it is', "I haven't finished it yet"],
                true
            );
            if (finished === 0) {
                if (player.inventory.has(LENS_ID, 1)) {
                    player.inventory.remove(LENS_ID, 1);
                    await npc.say(
                        'Wonderful, at last I can fix the telescope'
                    );
                    if (player.inventory.has(LENS_MOULD_ID)) {
                        await npc.say('I\'ll take back that mould for use again');
                        player.inventory.remove(LENS_MOULD_ID, 1);
                    }
                    await npc.say('Meet me at the Observatory later...');
                    player.questStages.observatoryQuest = 6;
                } else {
                    await npc.say(
                        'Why do you tell lies ?',
                        'Please come back when the lens is made'
                    );
                }
            } else if (finished === 1) {
                await npc.say('Oh, okay please hurry');
            }
            break;
        }
        case 6:
            await npc.say(
                'The telescope is now repaired',
                "Let's go to the Observatory"
            );
            break;
        case -1: {
            await npc.say(
                'Aha, my friend returns',
                'Thanks for all your help with the telescope',
                'What can I do for you ?'
            );
            // multi(..., false, ...): do not send the picked line automatically.
            const completedQuest = await player.ask(
                ['Do you have any more quests', 'Nothing, thanks'],
                false
            );
            if (completedQuest === 0) {
                await player.say('Do you have any more quests ?');
                await npc.say(
                    "No I'm all out of quests now",
                    'But the stars may hold a secret for you...'
                );
            } else if (completedQuest === 1) {
                await player.say('Nothing, thanks');
                await npc.say('Okay no problem');
            }
            break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
