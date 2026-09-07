// rune mysteries (members) quest, the runecrafting prerequisite.
// on completion sets questStages.runeMysteries = -1, the flag the runecraft gate reads.
// reward: 1 quest point, no xp.
// npcs: duke of lumbridge 198, head wizard 513 (sedridor role), aubury 54.
// items: air talisman 1306, research package 1318, research notes 1319.

// one of the 2 custom quests the per-world customQuests toggle gates
const { customQuestsEnabled: questsEnabled } = require('../../custom-gate.js');

const DUKE_ID = 198;
const HEAD_WIZARD_ID = 513;
const AUBURY_ID = 54;

const AIR_TALISMAN_ID = 1306;
const RESEARCH_PACKAGE_ID = 1318;
const RESEARCH_NOTES_ID = 1319;

// duke of lumbridge: starts the quest, hands the air talisman
async function dukeDialog(player, npc) {
    const questState = player.questStages.runeMysteries;

    switch (questState) {
        case -1:
            await npc.say(
                'All is well for me',
                'Thanks again for your help with the talisman'
            );
            break;
        case 0:
        case undefined: {
            await npc.say(
                "Well, it's not really a quest, but",
                'I recently discovered this strange talisman.',
                "It's not like anything I have seen before",
                'Would you take it to the head wizard',
                "in the basement of the Wizards' Tower for me?",
                'It should not take you very long at all',
                'and I would be awfully grateful'
            );

            const choice = await player.ask(
                ['Sure, I have some spare time', 'No thanks'],
                false
            );

            if (choice === 0) {
                await player.say('Sure, I have some spare time');
                await npc.say(
                    'Thank you very much, stranger',
                    'I am sure the head wizard will reward you',
                    'for such an interesting find'
                );

                if (!player.inventory.isFull()) {
                    player.message('@que@The Duke hands you a talisman.');
                    await player.world.sleepTicks(3);
                    player.inventory.add(AIR_TALISMAN_ID, 1);
                    player.questStages.runeMysteries = 1;
                } else {
                    await npc.say(
                        'Make some room in your inventory',
                        'and see me again'
                    );
                }
            }
            break;
        }
        case 1:
            await player.say('What was I supposed to do again?');
            await npc.say(
                'Take the air talisman to the head wizard',
                "in the basement of Wizards' Tower"
            );
            break;
        default:
            break;
    }
}

// sedridor / head wizard: wizards' tower cellar
async function sedridorDialog(player, npc) {
    const { world } = player;

    switch (player.questStages.runeMysteries) {
        case -1:
            await npc.say('Senventior disthine molenko!');
            player.cache.essence_entrance = 1;
            player.teleport(695, 22);
            break;
        case 0:
        case undefined:
        case 1: {
            // two options mirror the rsc transcript
            const choice =
                (await player.ask(
                    [
                        'What are you doing down here?',
                        'Are you the head wizard?'
                    ],
                    false
                )) + 1;

            if (choice === 1) {
                await npc.say(
                    'That is, indeed, a good question.',
                    "Here in the cellar of the Wizards' Tower",
                    "you find the remains of the old Wizards' Tower,",
                    'destroyed by fire many years past by the',
                    'treachery of the Zamorakians.',
                    'Many mysteries were lost, which we are',
                    'trying to rediscover. By building this',
                    'tower on the remains of the old, we seek',
                    'to show the world our dedication to the',
                    'mysteries of magic. I am here sifting',
                    'through fragments for knowledge of artefacts of our past.'
                );
                await player.say('Have you found anything useful?');
                await npc.say(
                    'Ah, that would be telling, adventurer.',
                    'Anything I have found I cannot speak freely of,',
                    'for fear of the treachery we have',
                    'already seen once in the past.'
                );

                const treachery = await player.ask(
                    [
                        "Okay, well I'll leave you to it.",
                        "What do you mean, 'treachery'?"
                    ],
                    false
                );

                if (treachery === 0) {
                    return;
                }

                await npc.say(
                    "It is a long story. Many years ago, this Wizards' Tower",
                    'was a focus of great learning, where mages studied together',
                    'to learn the secrets behind the runes that allow us',
                    'to use magic. Who makes them? Where do they come from?',
                    'How many types are there? What spells can they produce?',
                    'All of these questions and more are unknown to us,',
                    'but were once known by our ancestors. Legends tell us',
                    'that in the past, mages could fashion runes almost at will.'
                );
                await player.say('But they cannot anymore?');
                await npc.say(
                    'No, unfortunately not. Many years past, the wizards',
                    'of Zamorak, the god of chaos, burned this tower to the ' +
                        'ground.',
                    'and all who were inside. To this day, we do not know why',
                    'they did this terrible thing, but all of our research',
                    'and our greatest magical minds were destroyed in one',
                    'fell swoop. This is why I spend my time searching through',
                    'the few remains of the glorious old tower. I hope to',
                    'find something that will tell us more of the mysteries of',
                    'the runes that we use daily, dwindling in supply',
                    'with each use. I hope we may once again create our own',
                    "runes, and the Wizards' Tower will return to its",
                    'former position of glory!'
                );
                await player.say("Right, I'll leave you to it.");
                await npc.say('Goodbye, ' + player.username);
                await player.say('How did you know my name?');
                await npc.say('Well, I AM the head wizard.');
                return;
            }

            // choice === 2: "Are you the head wizard?"
            await npc.say("That's me, but why would you be doing that?");
            await player.say(
                'The Duke of Lumbridge sent me to find...er, you..',
                'I have a weird talisman that the Duke found.',
                'He said the head wizard would be interested in it.'
            );
            await npc.say(
                'Did he now? Well, that IS interesting.',
                'Hand it over, then, adventurer - let me see what',
                "all the hubbub is about. Just some crude amulet, I'll wager."
            );
            await player.say('Okay, here you go.');

            if (!player.inventory.has(AIR_TALISMAN_ID)) {
                await player.say('Oh, I seem to have lost the talisman.');
                await npc.say(
                    'Pity. If you happen to find it, bring it to me.'
                );
                return;
            }

            player.message('@que@You give the talisman to the wizard.');
            await world.sleepTicks(3);
            await npc.say(
                'Wow! This is incredible! Th-this talisman you brought me...',
                'it is the last piece of the puzzle. Finally! the legacy of our',
                'ancestors will return to us once more! I need time to',
                'study this, ' + player.username + ', can you please perform',
                'one task while I study this talisman? In the mighty city',
                'of Varrock, located north-east of here, there is',
                'a certain shop that sells magical runes. I have, in this',
                'package, all of the research I have done relating to runes',
                'but I require somebody to take them to a shopkeeper who',
                'can offer me his insights. Do this thing for me,',
                'bring back what he gives you, and if my suspicions are',
                'correct, I will let you in on one of the greatest',
                'secrets this world has ever known. It is a secret',
                "so powerful that it destroyed the original Wizards' Tower",
                'many centuries ago! Do this thing for me, ' + player.username,
                'and you will be rewarded.'
            );

            const accept = await player.ask(
                ['Yes, certainly', "No, I'm busy."],
                false
            );

            if (accept === 0) {
                await npc.say(
                    'Take this package to Varrock, the large city',
                    "north of Lumbrdige. Aubury's rune shop is in the",
                    'south-east quarter. He will give you a special item -',
                    'bring it back to me and I will show you the mystery of ' +
                        'runes.'
                );

                player.inventory.remove(AIR_TALISMAN_ID);
                player.message('@que@The head wizard gives you a research package.');
                await world.sleepTicks(3);
                player.inventory.add(RESEARCH_PACKAGE_ID, 1);
                await npc.say('Best of luck with your quest, ' + player.username);
                player.questStages.runeMysteries = 2;
            }
            break;
        }
        case 2:
            if (!player.inventory.has(RESEARCH_PACKAGE_ID)) {
                await player.say('I lost the research package');
                await npc.say('My my... I think I can pack up another one.');

                if (!player.inventory.isFull()) {
                    player.message(
                        '@que@The head wizard gives you a research package.'
                    );
                    await world.sleepTicks(3);
                    await npc.say('Be more careful this time');
                    player.inventory.add(RESEARCH_PACKAGE_ID, 1);
                } else {
                    player.message(
                        '@que@The head wizard tried to give you a research ' +
                            'package, but your inventory was full.'
                    );
                    await world.sleepTicks(3);
                }
            } else {
                await player.say(
                    'What was I supposed to do with this package again?'
                );
                await npc.say(
                    "Deliver it to Aubury's rune shop in Varrock please."
                );
            }
            break;
        case 3:
            await npc.say(
                'Ah, ' + player.username + '. How goes your quest?',
                'Have you delivered the research package to my friend yet?'
            );
            await player.say(
                'Yes, I have. He gave me some research notes to pass on to you.'
            );
            await npc.say('May I have them?');

            if (!player.inventory.has(RESEARCH_NOTES_ID)) {
                await player.say('Er... I seem to have lost them.');
                await npc.say('Sigh... go find them and return to me.');
                return;
            }

            await player.say('Sure. I have them here.');
            await npc.say(
                'You have been nothing but helpful, adventurer.',
                'In return, I can let you in on the secret of our research.',
                "Many centuries ago, the wizards of the Wizards' Tower",
                'learn the secret of creating runes, which allowed them',
                'to cast magic very easily. But, when the tower was burnt',
                'down, the secret of creating runes was lost with it...',
                'Or so I thought. Some months ago, while searching these',
                'ruins for information, I came upon a scroll that',
                'made reference to a magical rock, deep in the ice fields',
                "of the north. this rock was called the 'rune stone'",
                'by those magicians who studied its powers.',
                'Apparently, by simply breaking a chunk from it,',
                'a rune could be fashioned and taken to certain',
                'magical altars that were scattered across the land.',
                'Now, this is an interesting little piece of history',
                'but not much use to us since we do not have',
                'access to this rune stone or these altars.',
                'This is where you and Aubury come in.',
                'A little while ago, Aubury discovered a parchment',
                'detailing a teleportation spell that he had never',
                'come across before. When cast, it took him',
                'to a strange rock, yet it felt strangely',
                'familiar. As I\'m sure you have guessed, he had',
                'discovered a spell to the mythical rune stone.',
                'As soon as he told me of this, I saw the importance',
                'of the find. For if we could find the altars',
                'spoken of in the ancient texts, we would once',
                'more be able to create runes as',
                'our ancestors had done.'
            );
            await player.say(
                "I'm still not sure how I fit into this little story of yours."
            );
            await npc.say(
                "You haven't guessed? The talisman you brought me",
                'is a key to the elemental altar of air! When you hold',
                'it, it directs you to the entrance of the long',
                'forgotten Air Altar. By bringing pieces of the',
                'rune stone to the Air Altar, you will be able',
                "to fashion your own air runes. That's not all!",
                'By finding other talismans similiar to this one,',
                'you will eventually be able to craft every rune',
                'that is available in this world, just as our',
                'ancestors did. I cannot stress enough what a',
                'find this is! Now, due to the risks involved',
                'in letting this mighty power fall into the',
                'wrong hands, I will try to keep the teleport',
                'spell to the rune stone a closely guarded',
                'secret. This means that, if any evil power',
                'should discover the talismans required',
                'to enter the elemental temples, we should be',
                'able to prevent their access to the rune',
                'stone. I know not where the altars are',
                'located, nor do I know where the talismans',
                'have been scattered, but I now return your',
                'air talisman. Find the Air Altar and you will be able',
                'to craft your blank runes into air runes at will.',
                'Any time you wish to visit the rune stone,',
                'speak to me or Aubury and we will open a',
                'portal to that mystical place.'
            );
            await player.say(
                'So, only you and Aubury know the teleport',
                'spell to the rune stone?'
            );
            await npc.say(
                'No, there are others. When you speak',
                'to them, they will know you and grant you access to',
                'that place when asked. Use the air talisman to',
                'locate the Air Altar and use any further talismans',
                'you find to locate the other altars.',
                'Now, my research notes, please?'
            );
            player.inventory.remove(RESEARCH_NOTES_ID);
            player.message('@que@You hand Sedridor the research notes.');
            await world.sleepTicks(3);
            player.inventory.add(AIR_TALISMAN_ID, 1);
            await handleReward(player);
            break;
        default:
            break;
    }
}

// aubury: varrock rune shop, receives the package, gives the notes
async function auburyDialog(player, npc) {
    const { world } = player;
    const stage = player.questStages.runeMysteries;

    if (stage === 2) {
        if (player.inventory.has(RESEARCH_PACKAGE_ID)) {
            await player.say(
                "I've been sent here with a package for you.",
                "It's from Sedridor, the head wizard at the Wizards' Tower."
            );
            await npc.say(
                "Really? Surely he can't have...",
                'Please... let me have it.'
            );
            player.message('@que@You have Aubury the research package.');
            await world.sleepTicks(3);
            await npc.say(
                'My gratitude, adventurer, for bringing me this research ' +
                    'package.',
                'Combined with the information I have already collated',
                'regarding rune stones, I think we have finally',
                'unlocked the power to... No..',
                "I'm getting ahead of myself. Take this summary",
                'of my research back to Sedridor in the basement of the',
                "Wizards' Tower. He will know whether or not",
                'to let you in on our little secret.'
            );
            player.inventory.remove(RESEARCH_PACKAGE_ID);
            player.inventory.add(RESEARCH_NOTES_ID, 1);
            player.questStages.runeMysteries = 3;
            player.message('@que@Aubury gives you his research notes.');
            await world.sleepTicks(3);
            await npc.say(
                "Now, I'm sure I can spare a couple of runes for",
                'such a worthy cause as these notes.',
                'Do you want me to teleport you back?'
            );

            const tele = await player.ask(
                ['Yes, please.', 'No, thank you.'],
                false
            );

            if (tele === 0) {
                player.teleport(217, 685, true);
            }
        } else {
            await player.say('I had a package for you... But I lost it');
            await npc.say('See if you can find another one and return to me');
        }
    } else if (stage === 3) {
        if (!player.inventory.has(RESEARCH_NOTES_ID)) {
            await player.say('I lost your research notes...');
            await npc.say('I see. Here, I have another copy.');

            if (!player.inventory.isFull()) {
                player.message('@que@Aubury hands you his research notes.');
                await world.sleepTicks(3);
                player.inventory.add(RESEARCH_NOTES_ID, 1);
            } else {
                player.message(
                    '@que@Aubury tried to give you notes, but your inventory is ' +
                        'full.'
                );
                await world.sleepTicks(3);
            }
        } else {
            await player.say('What am I to do with these notes?');
            await npc.say(
                "Take them to Sedridor in the Wizards' Tower."
            );
        }
    } else if (stage === -1) {
        await npc.say('Senventior disthine molenko!');
        player.cache.essence_entrance = 0;
        player.teleport(695, 22);
    }
}

// reward: 1 quest point, no xp
async function handleReward(player) {
    player.questStages.runeMysteries = -1;
    player.message('Well done you have completed the rune mysteries quest');
    player.addQuestPoints(1);
    player.message('@gre@You have gained 1 quest point!');
    player.message('You now have access to the Runecraft skill!');
}

// plugin entry point; registered before the base aubury and duke handlers so
// these quest-active dialogues intercept first, falling through when inactive
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = player.questStages.runeMysteries;

    if (npc.id === DUKE_ID) {
        // duke has bespoke lines only while startable or in progress; else fall through
        if (stage === undefined || stage === 0 || stage === 1 || stage === -1) {
            player.engage(npc);
            await dukeDialog(player, npc);
            player.disengage();
            return true;
        }
        return false;
    }

    if (npc.id === HEAD_WIZARD_ID) {
        player.engage(npc);
        await sedridorDialog(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === AUBURY_ID) {
        // aubury has bespoke lines only at stages 2, 3, -1; else fall through
        if (stage === 2 || stage === 3 || stage === -1) {
            player.engage(npc);
            await auburyDialog(player, npc);
            player.disengage();
            return true;
        }
        return false;
    }

    return false;
}

module.exports = { onTalkToNPC };
