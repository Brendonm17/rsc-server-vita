// lumbridge castle guide (73 male / 147 female), the new-player help npc with a
// branching advice tree; not the tutorial island guide (npcs/tutorial-island/guide.js)

const NpcId = { GUIDE: 73, GUIDE_FEMALE: 147 };

const GUIDE_IDS = new Set([NpcId.GUIDE, NpcId.GUIDE_FEMALE]);

const GUIDE = {
    WHERE_START: 0,
    GOOD_WARRIOR: 1,
    GETTING_KILLED: 2,
    QUESTS_NEARBY: 3,
    PLACES_TO_GO: 4,
    PEOPLE_AND_CREATURES: 5,
    IMPROVE_WEAPS_N_ARMOUR: 6,
    BEST_TO_FIGHT: 7,
    SKILLS_HELP: 8,
    AVOID_DYING: 9,
    BEST_TO_ATTACK: 10,
    IMPROVE_STRENGTH: 11,
    BEEN_GREAT_HELP: 12,
    WHY_FIGHT: 13,
    SPEAK_PLAYERS: 14,
    ATTACK_PLAYERS: 15,
    KILL_THINGS_NOW: 16
};

// recursive dialogue tree with mutual back-references between nodes
async function guideDialogue(player, npc, cID) {
    switch (cID) {
        case GUIDE.WHERE_START: {
            await npc.say(
                'You are at Lumbridge castle.',
                'There are not many creatures close to here that will attack you,',
                'but there are always some.',
                'When you go further away from the castle you will meet tougher',
                'and stronger creatures, some will attack you if you go too close.'
            );

            const opt = await player.ask(
                [
                    'Are there any quests near here, and what will I need?',
                    'What are the best places to go to?',
                    'What are all the people and creatures around here? What do they do?',
                    'How do I become a better warrior?'
                ],
                false
            );

            if (opt === 0) {
                await player.say(
                    'Are there any quests near here, and what will I need?'
                );
                await guideDialogue(player, npc, GUIDE.QUESTS_NEARBY);
            } else if (opt === 1) {
                await player.say('What are the best places to go to?');
                await guideDialogue(player, npc, GUIDE.PLACES_TO_GO);
            } else if (opt === 2) {
                await player.say(
                    'What are all the people and creatures around here?',
                    'What do they do?'
                );
                await guideDialogue(player, npc, GUIDE.PEOPLE_AND_CREATURES);
            } else if (opt === 3) {
                await player.say('How do I become a better warrior?');
                await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
            }
            break;
        }

        case GUIDE.GOOD_WARRIOR: {
            await npc.say(
                'To be a good warrior takes practice, and good equipment.',
                'Skill is only gained by fighting.',
                'The more you win fights, the better you will become.',
                'The tougher the fights you win, the quicker you will progress.'
            );

            const opt = await player.ask([
                'How can I improve my weapons and my armour?',
                'How can I choose who is best to fight?',
                'What other skills will help me fight well?',
                'How can I avoid dying?'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.IMPROVE_WEAPS_N_ARMOUR);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.BEST_TO_FIGHT);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.SKILLS_HELP);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            }
            break;
        }

        case GUIDE.GETTING_KILLED: {
            await npc.say(
                'You are probably attacking people that are too strong for you.',
                'Or going too near to dangerous creatures'
            );

            const opt = await player.ask([
                'How can I avoid dying?',
                'How can I see who is best to attack?',
                'What is my strength, and how can I improve it?',
                'You have been a great help, thankyou'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.BEST_TO_ATTACK);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.IMPROVE_STRENGTH);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.BEEN_GREAT_HELP);
            }
            break;
        }

        case GUIDE.QUESTS_NEARBY: {
            await npc.say(
                'A quest is simply a task to help someone or to prove your strength',
                'There are a few quests near here to be done.',
                'If you complete the quests you can gain experience and treasure',
                'To find a quest, talk to anyone you can.',
                'There are some items about that will help you too.'
            );

            const opt = await player.ask(
                [
                    'What are the best places to go to?',
                    'What are all the people and creatures around here? What do they do?',
                    'How do I become a better warrior?',
                    'How can I avoid dying?'
                ],
                false
            );

            if (opt === 0) {
                await player.say('What are the best places to go to?');
                await guideDialogue(player, npc, GUIDE.PLACES_TO_GO);
            } else if (opt === 1) {
                await player.say(
                    'What are all the people and creatures around here?',
                    'What do they do?'
                );
                await guideDialogue(player, npc, GUIDE.PEOPLE_AND_CREATURES);
            } else if (opt === 2) {
                await player.say('How do I become a better warrior?');
                await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
            } else if (opt === 3) {
                await player.say('How can I avoid dying?');
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            }
            break;
        }

        case GUIDE.PLACES_TO_GO: {
            await npc.say(
                'The city of Varrock is the main trading and living place.',
                'It is where you can get anything you can afford,',
                'but be careful, there are thieves and worse in Varrock',
                'Eventually, all roads lead to the city.',
                "There is a farm on the way to Varrock, just don't annoy the farmer!",
                'There is a store near here that can sell you basic items.',
                'The store is always open, so you can buy when you need something',
                'There is a church, A mill, a graveyard, and a few other places to go',
                'very close to here. You should find something useful in most of them'
            );

            const opt = await player.ask(
                [
                    'Are there any quests near here, and what will I need?',
                    'What are all the people and creatures around here? What do they do?',
                    'How do I become a better warrior?',
                    'How can I avoid dying?'
                ],
                false
            );

            if (opt === 0) {
                await player.say(
                    'Are there any quests near here, and what will I need?'
                );
                await guideDialogue(player, npc, GUIDE.QUESTS_NEARBY);
            } else if (opt === 1) {
                await player.say(
                    'What are all the people and creatures around here?',
                    'What do they do?'
                );
                await guideDialogue(player, npc, GUIDE.PEOPLE_AND_CREATURES);
            } else if (opt === 2) {
                await player.say('How do I become a better warrior?');
                await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
            } else if (opt === 3) {
                await player.say('How can I avoid dying?');
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            }
            break;
        }

        case GUIDE.PEOPLE_AND_CREATURES: {
            await npc.say(
                'Some characters here are other games players,',
                'Some are creatures and people that live in runescape',
                'You can talk and trade and fight with most of them, if you want to'
            );

            const opt = await player.ask([
                'Why would I want to fight?',
                'Would I benefit from speaking to other players?',
                'Should I attack the other players?',
                'How do I become a better warrior?'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.WHY_FIGHT);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.SPEAK_PLAYERS);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.ATTACK_PLAYERS);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
            }
            break;
        }

        case GUIDE.IMPROVE_WEAPS_N_ARMOUR: {
            await npc.say(
                'To get better armour and weapons you will need to visit the stores.',
                'In Varrock there are many weapon and armour makers who will sell to you.',
                'They will also buy any weapons and armour you do not need,',
                'so keep any you want to sell.'
            );

            const opt = await player.ask([
                'How can I choose who is best to fight?',
                'What other skills will help me fight well?',
                'How can I avoid dying?',
                'Thanks, I just want to go kill things now'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.BEST_TO_FIGHT);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.SKILLS_HELP);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.KILL_THINGS_NOW);
            }
            break;
        }

        case GUIDE.BEST_TO_FIGHT: {
            await npc.say(
                'Be careful that you do not fight anyone too strong.',
                'The Palace guards around here are very tough for beginners,',
                'They will probably kill you instantly. Better to fight weaker people.',
                'There are some goblins just over the bridge that are not too tough',
                'Mind you, some goblins are strong. Always check the strength',
                'You can always run away, providing you have time to before you die.'
            );

            const opt = await player.ask([
                'How can I improve my weapons and my armour?',
                'What other skills will help me fight well?',
                'How can I avoid dying?',
                'Thanks, I just want to go kill things now'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.IMPROVE_WEAPS_N_ARMOUR);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.SKILLS_HELP);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.KILL_THINGS_NOW);
            }
            break;
        }

        case GUIDE.SKILLS_HELP: {
            await npc.say(
                'If you really want to be a good warrior,',
                'you will find other skills are useful.',
                'If you improve your magic you will find many battle spells',
                'Cooking is also a good skill to have.',
                'As feeding yourself will make you stronger when you need it.',
                'If you can make your own weapons then you will find it much cheaper.'
            );

            const opt = await player.ask([
                'How can I improve my weapons and my armour?',
                'How can I choose who is best to fight?',
                'How can I avoid dying?',
                'Thanks, I just want to go kill things now'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.IMPROVE_WEAPS_N_ARMOUR);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.BEST_TO_FIGHT);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.KILL_THINGS_NOW);
            }
            break;
        }

        case GUIDE.AVOID_DYING: {
            await npc.say(
                'To start with, the castle area is safe',
                'If you venture out, check your map for other creatures close',
                'And if you think they may attack, move away',
                'You will find which creatures and people attack, and which don\'t',
                'If you get attacked, try to run back where you came from',
                "most creatures won't chase you outside their own area"
            );

            const opt = await player.ask([
                'How can I see who is best to attack?',
                'What is my strength, and how can I improve it?',
                'You have been a great help, thankyou'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.BEST_TO_ATTACK);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.IMPROVE_STRENGTH);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.BEEN_GREAT_HELP);
            }
            break;
        }

        case GUIDE.BEST_TO_ATTACK: {
            await npc.say(
                'When you put the mouse over a character, see if you can attack.',
                'If the attack choice is red then it will be hard to win.',
                'If the attack is green You should win unless you are already injured,',
                'Try the goblins over the bridge, most people can beat them',
                'Just be sure you are wearing your armour and wielding your best weapon'
            );

            const opt = await player.ask([
                'How can I avoid dying?',
                'What is my strength, and how can I improve it?',
                'You have been a great help, thankyou'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.IMPROVE_STRENGTH);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.BEEN_GREAT_HELP);
            }
            break;
        }

        case GUIDE.IMPROVE_STRENGTH: {
            await npc.say(
                'When you fight, your hit level is displayed in green over your head',
                'This is your hit level, as in the statistics box',
                'When you get injured, this will get lower. It will rise again',
                'if you stay out of trouble. Eating will also help it return',
                'As you win more fights, your hit level will increase'
            );

            const opt = await player.ask([
                'How can I avoid dying?',
                'How can I see who is best to attack?',
                'You have been a great help, thankyou'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.BEST_TO_ATTACK);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.BEEN_GREAT_HELP);
            }
            break;
        }

        case GUIDE.BEEN_GREAT_HELP:
            await npc.say(
                'Go and use what you have learnt',
                'Soon you will be swarming the dungeons with the boldest'
            );
            break;

        case GUIDE.WHY_FIGHT: {
            await npc.say(
                'If you fight when you can win, and search everywhere you go,',
                'you will find your strength and treasure will increase.',
                'Many characters drop treasure as they die.'
            );

            const opt = await player.ask([
                'Would I benefit from speaking to other players?',
                'Should I attack the other players?',
                'How do I become a better warrior?',
                'How can I avoid dying?'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.SPEAK_PLAYERS);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.ATTACK_PLAYERS);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            }
            break;
        }

        case GUIDE.SPEAK_PLAYERS: {
            await npc.say(
                'You can type to speak to other players. Anyone close to you will hear.',
                "Just be careful about paying for player advice, Its not usually worth it.",
                'You can spot the real players because you can trade directly with them.',
                'Other players will have knowledge of the game, many will be happy to help'
            );

            const opt = await player.ask([
                'Why would I want to fight?',
                'Should I attack the other players?',
                'How do I become a better warrior?',
                'How can I avoid dying?'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.WHY_FIGHT);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.ATTACK_PLAYERS);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            }
            break;
        }

        case GUIDE.ATTACK_PLAYERS: {
            await npc.say(
                'To be fair, you cannot attack just any of the other players',
                'You can fight with people about the same strength as you, and anyone tougher',
                'If you die, you lose everything in your back pack,',
                'so do not be persuaded to attack any player who asks you to',
                "They will just be after your treasure. You can't run away immediately"
            );

            const opt = await player.ask([
                'Why would I want to fight?',
                'Would I benefit from speaking to other players?',
                'How do I become a better warrior?',
                'How can I avoid dying?'
            ], true);

            if (opt === 0) {
                await guideDialogue(player, npc, GUIDE.WHY_FIGHT);
            } else if (opt === 1) {
                await guideDialogue(player, npc, GUIDE.SPEAK_PLAYERS);
            } else if (opt === 2) {
                await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
            } else if (opt === 3) {
                await guideDialogue(player, npc, GUIDE.AVOID_DYING);
            }
            break;
        }

        case GUIDE.KILL_THINGS_NOW:
            await npc.say(
                'Okay, just take care of yourself.',
                'However tough you get, there is always something tougher'
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!GUIDE_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    await npc.say('Hello Adventurer, can I guide you on your journeys?');

    const option = await player.ask(
        [
            'I just got here, where should I start?',
            'I just want to fight, how can I be a good warrior?',
            "I keep getting killed. It's annoying me. What should I do?",
            'I am happy to just try things on my own, thanks'
        ],
        false
    );

    if (option === 0) {
        await player.say('I just got here, where should I start?');
        await guideDialogue(player, npc, GUIDE.WHERE_START);
    } else if (option === 1) {
        await player.say('How do I become a better warrior?');
        await guideDialogue(player, npc, GUIDE.GOOD_WARRIOR);
    } else if (option === 2) {
        await player.say(
            "I keep getting killed. It's annoying me. What should I do?"
        );
        await guideDialogue(player, npc, GUIDE.GETTING_KILLED);
    } else if (option === 3) {
        await player.say('I am happy to just try things on my own, thanks');
        await npc.say(
            'I wish you luck on your travels, adventurer',
            'I am usually here if you think I can help you'
        );
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
