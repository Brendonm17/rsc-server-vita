// the grand tree: king narnode shareen (surface + underground) and the
// hazelmere translation question menus

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    KING_NARNODE_SHAREEN,
    KING_NARNODE_SHAREEN_UNDERGROUND,
    TREE_GNOME_TRANSLATION,
    BARK_SAMPLE,
    GLOUGHS_NOTES,
    PEBBLE_1,
    PEBBLE_2,
    PEBBLE_3,
    PEBBLE_4,
    DACONIA_ROCK,
    ifNearVisNpc,
    handleReward
} = require('./ids.js');

// wrongQuestionMenu(player, n)
async function wrongQuestionMenu(player, n) {
    await n.say(
        "wait a minute, that doesn't sound like hazelmere",
        'are you sure you translated correctly?'
    );
    await player.say('erm...i think so');
    await n.say(
        "i'm sorry traveller but this is no good",
        "the translation must be perfect or the infomation's no use",
        'please come back when you know exactly what hazelmere said'
    );

    // Remove the cache if they fail on the third question
    delete player.cache.gt_q1;
    delete player.cache.gt_q2;
}

// questionMenu3(player, n)
async function questionMenu3(player, n) {
    const menu = await player.ask(
        [
            'all shall peril',
            'chicken, it must be chicken',
            'and then you will know',
            'the tree will live',
            'none of the above'
        ],
        false
    );

    if (menu >= 0 && menu <= 3) {
        await wrongQuestionMenu(player, n);
        return;
    }

    // menu === 4 (none of the above)
    if (player.cache.gt_q1 && player.cache.gt_q2) {
        // remove to keep efficiency in cache.
        delete player.cache.gt_q1;
        delete player.cache.gt_q2;

        // Continue the last three menus.
        const realQuestionMenu = await player.ask(
            [
                "monster came with king's sword",
                'giant left with tree stone',
                "ogre came with king's head",
                "human came with king's seal",
                'fairy came with eternal flower'
            ],
            false
        );

        if (realQuestionMenu !== 3) {
            await wrongQuestionMenu(player, n);
            return;
        }

        const realQuestionMenu2 = await player.ask(
            [
                'gave the ever-light to human',
                'gave human daconia rock',
                'gave human rock to daconia',
                'human attacked by daconia',
                'human destroyed daconia rock'
            ],
            false
        );

        if (realQuestionMenu2 !== 1) {
            await wrongQuestionMenu(player, n);
            return;
        }

        const realQuestionMenu3 = await player.ask(
            [
                'daconia rocks will save tree',
                'daconia will fall to gnome kingdom',
                'gnome kingdom will fall to daconia',
                'daconia rocks will kill tree',
                'daconia rocks killed human'
            ],
            false
        );

        if (realQuestionMenu3 !== 3) {
            await wrongQuestionMenu(player, n);
            return;
        }

        // correct final answer
        await player.say(
            "he said a human came to him with the king's seal",
            'hazelmere gave the man daconia rocks',
            'and daconia rocks will kill the tree'
        );
        await n.say(
            'of course, i should have known',
            'some one must have forged my royal seal',
            'and convinced hazelmere that i sent for the daconia stones'
        );
        await player.say('what are daconia stones?');
        await n.say(
            'hazelmere created the daconia stones',
            'they were a safty measure, in case the tree grew out of control',
            "they're the only thing that can kill the tree",
            'this is terrible, those stones must be retrieved'
        );
        await player.say('can i help?');
        await n.say(
            'first i must warn the tree guardians',
            'please, could you tell the chief tree guardian glough',
            'he lives in a tree house just in front of the grand tree',
            "if he's not there he will be at anita's, his girlfriend",
            "meet me back here once you've told him"
        );
        await player.say("ok, i'll be back soon");
        player.questStages[QUEST_KEY] = 3;
        return;
    }

    await wrongQuestionMenu(player, n);
}

// questionMenu2(player, n)
async function questionMenu2(player, n) {
    const menu = await player.ask(
        [
            'you must warn the gnomes',
            'soon the eternal night will come',
            'the seven must reunite',
            'only one the fifth night',
            'none of the above'
        ],
        false
    );

    if (menu === 4) {
        if (!player.cache.gt_q2 && player.cache.gt_q1) {
            player.cache.gt_q2 = true;
        }
    }

    await questionMenu3(player, n);
}

// replace a lost translation book and/or bark sample (shared branch)
async function replaceLostBookOrSample(player, n) {
    if (!player.inventory.has(BARK_SAMPLE)) {
        await player.say("but i've lost the bark sample");
        await n.say('here take another and try to hang on to it');
        player.message('king shareem gives you another bark sample');
        player.inventory.add(BARK_SAMPLE, 1);
    }

    if (!player.inventory.has(TREE_GNOME_TRANSLATION)) {
        await player.say("but i've lost the book you gave me");
        await n.say("don't worry i have more", 'here you go');
        player.message('king shareem gives you a translation book');
        player.inventory.add(TREE_GNOME_TRANSLATION, 1);
    }
}

// surface king narnode

async function talkKingNarnode(player, n) {
    const stage = player.questStages[QUEST_KEY] || 0;

    switch (stage) {
        case 0: {
            await player.say('hello there');
            await n.say(
                "hello traveller, i'm king shareem, welcome",
                "it's nice to see an outsider"
            );
            await player.say('it seems to be quite a busy settlement');
            await n.say('for now it is, thankfully');
            player.message('King shareem seems troubled');

            const option = await player.ask(
                ["you seem worried, what's wrong?", "well, i'll be on my way"],
                false
            );

            if (option === 0) {
                await n.say(
                    'adventurer, can i speak to you in the strictest confidence'
                );
                await player.say('of course narnode');
                await n.say('not here, follow me');
                player.message(
                    'king shareem bends down and places his hands on the ' +
                        'stone tile'
                );
                player.message('@que@you here a creak as he turns the tile clockwise');
                await player.world.sleepTicks(3);
                player.message('@que@the tile slides away, revealing a small tunnel');
                await player.world.sleepTicks(3);
                player.message('@que@you follow king shareem down');
                await player.world.sleepTicks(3);
                player.teleport(703, 3284);

                const under = ifNearVisNpc(
                    player,
                    KING_NARNODE_SHAREEN_UNDERGROUND,
                    15
                );

                if (under) {
                    player.engage(under);
                    await player.say('so what is this place?');
                    await under.say(
                        'these my friend, are the foundations of the stronghold'
                    );
                    await player.say('they just look like roots');
                    await under.say(
                        'not any roots traveller',
                        'these were conjured in the past age by gnome mages',
                        'since then, they have grown into our mighty stronghold'
                    );
                    await player.say(
                        'impressive, but what exactly is the problem?'
                    );
                    await under.say(
                        'in the last two months our tree guardians have ' +
                            'reported...',
                        '...continuing deterioration of the grand trees health',
                        "i've never seen this before, it could mean the end " +
                            'for all of us'
                    );
                    await player.say('you mean the tree is ill');
                    await under.say(
                        'in a magical sense yes',
                        'would you be willing to help us discover the cause ' +
                            'of this illness'
                    );

                    const op = await player.ask(
                        [
                            "i'm sorry i don't want to get involved",
                            "i'd be happy to help"
                        ],
                        false
                    );

                    if (op === 0) {
                        await under.say(
                            'i understand traveller',
                            'please keep this to yourself'
                        );
                        await player.say('of course');
                        await under.say("i'll show you the way back up");
                        player.message('you follow king shareem up the ladder');
                        player.teleport(415, 163);
                    } else if (op === 1) {
                        await under.say(
                            'thank guthix for you arrival',
                            "the first task is to find out what's killing my " +
                                'tree'
                        );
                        await player.say('have you any ideas?');
                        await under.say(
                            'my top tree guardian, glough, believes ' +
                                "it's human sabotage",
                            "i'm not so sure",
                            'the only way to really know, is to talk to ' +
                                'Hazelmere'
                        );
                        await player.say("who's hazelmere?");
                        await under.say(
                            'a once all powerful mage who created the grand ' +
                                'tree',
                            'one of the only survivors of the old age',
                            'take this bark sample to him, he should be able ' +
                                'to help',
                            "the mage only talks in the old tongue, you'll " +
                                'need this'
                        );
                        await player.say('what is it?');
                        await under.say(
                            'a translation book, translate carefully, his ' +
                                'words may save us all',
                            "you'll find his dwellings high upon a towering " +
                                'hill..',
                            '..on a island south of the khazard fight arena'
                        );
                        player.message(
                            'king shareem gives you a book and a bark sample'
                        );
                        player.inventory.add(TREE_GNOME_TRANSLATION, 1);
                        player.inventory.add(BARK_SAMPLE, 1);
                        await under.say("i'll show you the way back up");
                        player.message('you follow king shareem up the ladder');
                        player.teleport(415, 163);
                        player.questStages[QUEST_KEY] = 1;
                    }

                    player.disengage();
                }
            } else if (option === 1) {
                await n.say(
                    'ok then, enjoy your stay with us',
                    "there's many shops and sights to see"
                );
            }
            break;
        }
        case 1: {
            await player.say('hello king shareem');
            await n.say("traveller, you've returned", 'any word from hazelmere?');
            await player.say("not yet i'm afraid");

            if (
                !player.inventory.has(TREE_GNOME_TRANSLATION) ||
                !player.inventory.has(BARK_SAMPLE)
            ) {
                await replaceLostBookOrSample(player, n);
            } else {
                await n.say(
                    'hazalmere lives on a island just south of the fight arena',
                    'give him the sample and translate his reply',
                    'i just hope he can help in our hour of need'
                );
            }
            break;
        }
        case 2: {
            await player.say('hello again king shareem');
            await n.say('well hello traveller, did you speak to hazelmere?');
            await player.say('yes, i managed to find him');
            await n.say('and do you know what he said?');

            const menu = await player.ask(
                ['i think so', 'no, i need to go back'],
                false
            );

            if (menu === 0) {
                await n.say('so what did he say?');

                const qmenu = await player.ask(
                    [
                        'hello there traveller',
                        'king shareem must be stopped',
                        'praise to the great zamorak',
                        'have you any bread',
                        'none of the above'
                    ],
                    false
                );

                if (qmenu === 4) {
                    if (!player.cache.gt_q1) {
                        player.cache.gt_q1 = true;
                    }
                }

                await questionMenu2(player, n);
            } else if (menu === 1) {
                if (
                    !player.inventory.has(TREE_GNOME_TRANSLATION) ||
                    !player.inventory.has(BARK_SAMPLE)
                ) {
                    await replaceLostBookOrSample(player, n);
                }
                await n.say('time is of the essence adventurer');
            }
            break;
        }
        case 3:
            await player.say('hello narnode');
            await n.say('hello traveller, did you speak to glough?');
            await player.say('not yet');
            await n.say(
                'ok, he lives just in front of the grand tree',
                "let me know once you've spoken to him"
            );
            break;
        case 4:
            await player.say(
                'hello king shareem',
                'have you any news on the daconia stones?'
            );
            await n.say(
                "it's ok traveller, thank's to glough",
                'he found a human sneaking around...',
                '...with three daconia stones in his satchel'
            );
            await player.say(
                "i'm amazed that you retrieved them so easily"
            );
            await n.say(
                'yes, glough must really know what he\'s doing',
                "the human has been detained until we know who's involved",
                'maybe glough was right, maybe humans are invading'
            );
            await player.say('i doubt it, can i speak to the prisoner');
            await n.say(
                "certainly, he's on the top level of the grand tree",
                "be careful up there, it's a long way down"
            );
            player.questStages[QUEST_KEY] = 5;
            break;
        case 5:
            await player.say('hi narnode');
            await n.say(
                'hello traveller',
                'if you wish to talk to the prisoner',
                'go to the top tree level',
                "you'll find him there"
            );
            await player.say('thanks');
            break;
        case 6:
            await player.say('king shareem');
            await n.say('hello adventurer, so did you speak to the culprit?');
            await player.say("yes i did and something's not right");
            await n.say('what do you mean?');
            await player.say(
                'the prisoner claims he was paid by glough to get the stones'
            );
            await n.say(
                "that's an absurd story, he's just trying to save himself",
                "since glough's wife died he has been a little strange",
                'but he would never wrongly imprison someone',
                "now the culprit's locked up we can all relax",
                "it's sad but i think glough was right",
                'humans are planning to invade and wipe us tree gnomes out'
            );
            await player.say('but why?');
            await n.say(
                'who knows? but you may have to leave soon adventurer',
                'i trust you, but the local gnomes are getting paranoid'
            );
            await player.say("that's a shame");
            await n.say(
                'hopefully i can keep my people calm, we\'ll see'
            );
            break;
        case 7:
            await player.say("king shareem, i'm concerned about glough");
            await n.say(
                "why, don't worry yourself about him",
                'now the culprit has been caught...',
                "..i'm sure glough's resentment of humans will die away"
            );
            await player.say("i'm not so sure");
            await n.say(
                'he just has an active imagination',
                'if your really concerned, speak to him'
            );
            break;
        case 8:
        case 9:
            await player.say('hello narnode');
            await n.say(
                "traveller, haven't you heard",
                'glough has set a warrant for your arrest',
                'he has guards at the exit',
                "i shouldn't have told you this",
                'but i can see your a good person',
                "please take the glider and leave before it's too late"
            );
            await player.say('all the best narnode');
            break;
        case 10:
            await player.say('king shareem,i need to talk');
            await n.say(
                'traveller, what are you doing here?',
                'the stronghold has been put on full alert',
                "it's not safe for you here"
            );
            await player.say(
                'narnode, i believe glough is killing the trees',
                'in order to make a mass fleet of warships'
            );
            await n.say("that's an absurd accusation");
            await player.say(
                'his hatred for humanity is stronger than you know'
            );
            await n.say(
                "that's enough traveller, you sound as paranoid as him",
                'traveller please leave',
                "it's bad enough having one human locked up"
            );
            break;
        case 11:
            await player.say('hello narnode');
            await n.say(
                'please traveller, if the gnomes see me talking to you',
                "they'll revolt against me"
            );
            await player.say("that's crazy");
            await n.say(
                "glough's scared the whole town",
                'he expects the humans to attack any day',
                "he's even began to recuit hundreds of gnome soldiers"
            );
            await player.say(
                "don't you understand he's creating his own army"
            );
            await n.say("please traveller, just leave before it's too late");
            break;
        case 12:
            await player.say(
                'hi narnode, did you think about what i said?'
            );
            await n.say(
                "look, if you're right about glough i would have him arrested",
                "but there's no reason for me to think he's lying"
            );
            if (player.inventory.has(GLOUGHS_NOTES)) {
                await player.say("look, i found this at glough's home");
                player.message('@que@you give the king the strategic notes');
                await player.world.sleepTicks(3);
                player.inventory.remove(GLOUGHS_NOTES);
                await n.say(
                    'hmmm, these are interesting',
                    "but it's not proof, any one could have made these",
                    'traveller, i understand your concern',
                    "i had guards search glough's house",
                    'but they found nothing suspicious',
                    'just these old pebbles'
                );
                player.message('@que@narnode gives you four old pebbles');
                await player.world.sleepTicks(3);
                player.inventory.add(PEBBLE_3, 1);
                player.inventory.add(PEBBLE_2, 1);
                player.inventory.add(PEBBLE_4, 1);
                player.inventory.add(PEBBLE_1, 1);
                await n.say(
                    "on the other hand, if glough's right about the humans",
                    'we will need an army of gnomes to protect ourselves',
                    "so i've decided to allow glough to raise a mighty gnome " +
                        'army',
                    "the grand tree's still slowly dying, if it is human " +
                        'sabotage',
                    'we must respond'
                );
                player.questStages[QUEST_KEY] = 13;
            }
            break;
        case 13:
            await player.say('hello again narnode');
            await n.say('please traveller, take my advice and leave');
            if (
                !player.inventory.has(PEBBLE_3) ||
                !player.inventory.has(PEBBLE_2) ||
                !player.inventory.has(PEBBLE_4) ||
                !player.inventory.has(PEBBLE_1)
            ) {
                await player.say('have you any more of those pebbles');
                await n.say('well, yes as it goes, why?');
                await player.say('i lost some');
                await n.say(
                    "here take these, i don't see how it will help though"
                );
                player.message('@que@narnode replaces your lost pebbles');
                await player.world.sleepTicks(3);
                delete player.cache.pebble_1;
                delete player.cache.pebble_2;
                delete player.cache.pebble_3;
                delete player.cache.pebble_4;
                if (!player.inventory.has(PEBBLE_3)) {
                    player.inventory.add(PEBBLE_3, 1);
                }
                if (!player.inventory.has(PEBBLE_2)) {
                    player.inventory.add(PEBBLE_2, 1);
                }
                if (!player.inventory.has(PEBBLE_4)) {
                    player.inventory.add(PEBBLE_4, 1);
                }
                if (!player.inventory.has(PEBBLE_1)) {
                    player.inventory.add(PEBBLE_1, 1);
                }
            } else {
                await n.say("it's not safe for you here");
            }
            break;
        case 14:
            await player.say(
                "narnode, it's true about glough i tell you",
                "he's planning to take over runescape"
            );
            await n.say(
                "i'm sorry traveller but it's just not realistic",
                'how could glough- even with a gnome army- take over?'
            );
            await player.say(
                Math.random() < 0.5
                    ? "he plans to make a fleet of warships from the grand " +
                          "trees' wood"
                    : "he plans to make a fleet of warships from the grand " +
                          "tree's wood"
            );
            await n.say(
                "that's enough traveller, i've no time for make believe",
                "the tree's still dying, i must get to the truth of this"
            );
            break;
        case -1:
            await player.say('hello narnode');
            await n.say('well hello again adventurer', 'how are you?');
            await player.say("i'm good thanks, how's the tree?");
            await n.say('better than ever, thanks for asking');
            if (!player.inventory.has(TREE_GNOME_TRANSLATION)) {
                await player.say("i've lost the book you gave me");
                await n.say("don't worry i have more", 'here you go');
                player.message('king shareem gives you a translation book');
                player.inventory.add(TREE_GNOME_TRANSLATION, 1);
            }
            break;
        default:
            break;
    }
}

// underground king narnode (finale)

async function talkKingNarnodeUnderground(player, n) {
    const stage = player.questStages[QUEST_KEY] || 0;

    switch (stage) {
        case 15:
            await n.say('traveller you\'re wounded, what happened?');
            await player.say("it's glough, he set a demon on me");
            await n.say('what, glough, with a demon?');
            await player.say(
                'glough has a store of daconia rocks further up the passage ' +
                    'way',
                "he's been accessing the roots from a secret passage at his " +
                    'home'
            );
            await n.say(
                "never, not glough, he's a good gnome at heart",
                'guard, go and check out that passage way'
            );
            player.message("@que@one of the king's guards runs of up the passage");
            await player.world.sleepTicks(3);
            await n.say("look, maybe it's stress playing with your mind");
            player.message('@que@the gnome guard returns');
            await player.world.sleepTicks(3);
            player.message('@que@and talks to the king');
            await player.world.sleepTicks(3);
            await n.say(
                'what?, never, why that little...',
                'they found glough hiding under a horde of daconia rocks..'
            );
            await player.say(
                "that's what i've been trying to tell you",
                "glough's been fooling you"
            );
            await n.say(
                "i..i don't know what to say",
                'how could i have been so blind'
            );
            player.message('@que@king shareem calls out to another guard');
            await player.world.sleepTicks(3);
            await n.say(
                'guard, call off the military training',
                'the humans are not attacking',
                'you have my full apologies traveller, and my gratitude',
                'a reward will have to wait though, the tree is still dying',
                "the guards are clearing glough's rock supply now",
                'but there must be more daconia hidden somewhere in the roots',
                'please traveller help us search, we have little time'
            );
            player.questStages[QUEST_KEY] = 16;
            break;
        case 16:
            await n.say(
                'traveller, have you managed to find the rock',
                "i think there's only one"
            );
            if (player.inventory.has(DACONIA_ROCK)) {
                await player.say('is this it?');
                await n.say('yes, excellent, well done');
                player.message('@que@you give king shareem the daconia rock');
                await player.world.sleepTicks(3);
                player.inventory.remove(DACONIA_ROCK);
                await n.say(
                    "it's incredible, the tree's health is improving already",
                    "i don't what to say, we owe you so much",
                    'to think glough had me fooled all along'
                );
                await player.say(
                    'all that matters now is that man...',
                    '...and gnome can live together in peace'
                );
                await n.say("i'll drink to that");

                // sendQuestComplete: mark complete + grant reward
                player.questStages[QUEST_KEY] = -1;
                handleReward(player);

                await n.say(
                    'from now on i vow to make this stronghold',
                    'a welcome place for all no matter what their creed',
                    "i'll grant you access to all our facilities"
                );
                await player.say('thanks, i think');
                await n.say(
                    'it should make your stay here easier',
                    'you can use the spirit tree to transport yourself',
                    '..as well as the gnome glider',
                    'i also give you access to our mine'
                );
                await player.say('mine?');
                await n.say(
                    'very few know of the secret mine under the grand tree',
                    'if you push on the roots just to my north',
                    'the grand tree will take you there'
                );
                await player.say('strange');
                await n.say(
                    "that's magic trees for you",
                    'all the best traveller and thanks again'
                );
                await player.say('you too narnode');
            } else {
                await player.say('no sign of it so far');
                await n.say(
                    "the tree will still die if we don't find it",
                    'it could be anywhere'
                );
                await player.say("don't worry narnode, we'll find it");
            }
            break;
        case -1:
            await player.say('hello narnode');
            await n.say('well hello again adventurer', 'how are you?');
            await player.say("i'm good thanks, how's the tree?");
            if (Math.random() < 0.5) {
                await n.say('better than ever, thanks to you');
            } else {
                await n.say('better than ever, thanks for asking');
            }
            break;
        default:
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id !== KING_NARNODE_SHAREEN &&
        npc.id !== KING_NARNODE_SHAREEN_UNDERGROUND
    ) {
        return false;
    }

    player.engage(npc);

    if (npc.id === KING_NARNODE_SHAREEN) {
        await talkKingNarnode(player, npc);
    } else {
        await talkKingNarnodeUnderground(player, npc);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
