// peeling the onion quest: ids, reward, and cache keys

// one of the 2 custom quests gated by the customQuests toggle
const { customQuestsEnabled: questsEnabled } = require('../../custom-gate.js');

// quest stage constants
const STATE_COMPLETE = -1;
const STATE_NOT_BEGUN = 0;
const STATE_STARTED_QUEST_WITH_KRESH = 1;
const STATE_STARTED_QUEST_WITH_SEDRIDOR = 2;
const STATE_STARTED_QUEST_WITH_SEDRIDOR_CONFRONTED_KRESH = 3;
const STATE_PLAYER_CONSIDERS_OGRE = 4;
const STATE_SEDRIDOR_SUGGESTED_YOU_VISIT_MAKE_OVER_MAGE = 5;
const STATE_MAKE_OVER_MAGE_GAVE_WAIVER = 6;
const STATE_SIGNED_WAIVER = 7;
const STATE_A_NEW_OGRE = 8;
const STATE_AGGIE_TOLD_PLAYER_TO_COLLECT_ITEMS = 9;
const STATE_AGGIE_HAS_GIVEN_CLAY = 10;
const STATE_KRESH_NEEDS_RECIPES = 11;

// ids
const KRESH_ID = 822;
const HEAD_WIZARD_ID = 513;
const MAKE_OVER_MAGE_ID = 339;
const AGGIE_ID = 125;

const OGRE_EARS_ID = 1501;
const LEATHER_VEST_ID = 1502;
const MAKEOVER_WAIVER_ID = 1503;
const YELLOWGREEN_CLAY_ID = 1504;
const OGRE_RECIPES_ID = 1505;

const SOFT_CLAY_ID = 243;
const ONION_ID = 241;
const WOAD_LEAF_ID = 281;
const LEATHER_ARMOUR_ID = 15;
const KNIFE_ID = 13;
const COINS_ID = 10;

const OGRE_SKIN_COLOUR = 40;

// wizards' tower cellar bookcase spawns at 606,757 and 602,761
const TOWER_BOOKCASE_ID = 47;

// small helpers mirroring OpenRSC Functions.*
function stage(player) {
    const s = player.questStages.peelingTheOnion;
    return s === undefined ? STATE_NOT_BEGUN : s;
}

function setStage(player, value) {
    player.questStages.peelingTheOnion = value;
}

function ifheld(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

function hasEquipped(player, id) {
    return !!player.inventory.items.find(
        (item) => item.id === id && item.equipped
    );
}

function skinColour(player) {
    return player.appearance ? player.appearance.skinColour : 0;
}

// kresh, the ogre in lumbridge swamp
async function kreshDialogue(player, npc) {
    const questState = stage(player);

    switch (questState) {
        case STATE_COMPLETE:
            if (skinColour(player) !== OGRE_SKIN_COLOUR) {
                await npc.say('What are you doing in my house?');
                await npc.say("Didn't you see the signs?");
                await npc.say('Or the skull?');
                await npc.say(
                    'Ah, whatever.',
                    "Just don't get too cozy here or I'll have to build " +
                        'another chair'
                );
                return;
            }
            if (!hasEquipped(player, OGRE_EARS_ID)) {
                await npc.say('Aggh!!!', 'get out of here ya earless freak!!');
                return;
            }
            await npc.say(
                'Hullo again',
                "I'm really enjoying the new recipes!",
                'Fish eye tartare is delicious.',
                "I'd make some for you some time if you'd like"
            );
            break;
        case STATE_NOT_BEGUN:
            await npc.say('What are you doing in my house?');
            await npc.say("Didn't you see the signs?");
            await npc.say('Or the skull?');
            await player.say('I never saw you out here before');
            await npc.say(
                "Yeah well you'll never see anything again if you don't get out"
            );
            await npc.say(
                'and tell your wizard friends to stop sending people over here'
            );
            await npc.say("or I'll eat their eyes too");
            await player.say('Wizard friends?');
            await npc.say('Enough! Get out!');
            setStage(player, STATE_STARTED_QUEST_WITH_KRESH);
            break;
        case STATE_STARTED_QUEST_WITH_KRESH:
            await player.say('What was I supposed to do again?');
            await npc.say("I'm a terrifying ogre! Get out!");
            await npc.say(
                'Or I\'ll make a nice eyeball stew out of you',
                'and everyone else at the wizards tower'
            );
            await player.say('Eep!');
            break;
        case STATE_STARTED_QUEST_WITH_SEDRIDOR:
            await npc.say('What are you doing in my house?');
            await npc.say("Didn't you see the signs?");
            await npc.say('Or the skull?');
            await player.say(
                "I've been sent by the headwizard",
                'to talk about your eyeball ingestion habits'
            );
            await npc.say(
                'You\'ll leave right now or I\'ll "ingest" your eyeballs too'
            );
            await npc.say(
                'and tell your wizard friends to stop sending people over here'
            );
            await player.say('but...');
            await npc.say('Get out of my SWAMP!');
            setStage(player, STATE_STARTED_QUEST_WITH_SEDRIDOR_CONFRONTED_KRESH);
            break;
        case STATE_A_NEW_OGRE:
        case STATE_AGGIE_TOLD_PLAYER_TO_COLLECT_ITEMS:
        case STATE_AGGIE_HAS_GIVEN_CLAY: {
            if (!hasEquipped(player, OGRE_EARS_ID)) {
                await npc.say(
                    'Aggh!!!',
                    'get out of here ya earless freak!!'
                );
                return;
            }
            await npc.say('Hullo');
            if (!hasEquipped(player, LEATHER_VEST_ID)) {
                await npc.say(
                    'Let me stop you right there.',
                    "I don't think I could respect anything said by someone",
                    'who dresses like you.'
                );
                return;
            }
            await npc.say(
                "I didn't expect to meet another ogre out here",
                'Kind of part of why I moved out here, to be honest',
                'Why are you in my home?'
            );
            const whyOgreVisitKresh = await player.ask(
                [
                    "I'm selling magazines",
                    "I'm looking for a friend",
                    'Could you stop eating all the newts please?',
                    'Do you have any spare firewood?',
                    "I'm looking for a quest"
                ],
                false
            );
            switch (whyOgreVisitKresh) {
                case 0: {
                    await npc.say('Oh, really?', 'What kind of magazines?');
                    const multiMagazine = await player.ask(
                        [
                            'Sports',
                            'Cooking',
                            'Lifestyle',
                            'Swords',
                            "It's more of a furniture store brochure honestly"
                        ],
                        false
                    );
                    switch (multiMagazine) {
                        case 0:
                            await npc.say(
                                'Oh,',
                                "I don't really follow the Lumbridge Eagles to " +
                                    'be honest',
                                'Or the Ardougne Chimeras, or any of the ' +
                                    'gnomeball games...',
                                'Not interested, thanks.'
                            );
                            return;
                        case 1:
                            await npc.say(
                                'Yeah?',
                                'I might be interested in some new recipes',
                                'How much is it?'
                            );
                            await player.say("For you, it'd be free");
                            await npc.say(
                                "Alright well I can't refuse that",
                                "It'll at least make good kindling if nothing " +
                                    'else!'
                            );
                            await player.say("I'll be right back with it...!");
                            setStage(player, STATE_KRESH_NEEDS_RECIPES);
                            return;
                        case 2:
                            await npc.say('Uhm, what kind of lifestyle?');
                            await player.say('Uh,... Ogre, Lifestyle...');
                            await npc.say("I think I've got that covered.");
                            return;
                        case 3:
                            await npc.say(
                                "Oh, I've got no use for those",
                                "It doesn't take much to squish a newt, hahaha"
                            );
                            return;
                        case 4:
                            await npc.say(
                                "Well, I don't think I need any furniture",
                                'My home is pretty well maxed out I think',
                                'Unless I build an addition',
                                'Thanks anyway.'
                            );
                            return;
                        default:
                            return;
                    }
                }
                case 1:
                    await npc.say(
                        'Interesting.',
                        'Well, we can be penpals!',
                        "You go back to your home, and I'll stay here.",
                        'You write me a letter any time you like.',
                        'Sound good?',
                        "I'm going to get back to what I was doing now,",
                        'standing alone in my house.'
                    );
                    return;
                case 2:
                    await npc.say('Why should I?');
                    await player.say(
                        "It's getting really hard to find newts or frogs " +
                            'anymore',
                        'If you keep eating their eyes, soon there won\'t be ' +
                            'any left'
                    );
                    await npc.say(
                        'I suppose it *has* been getting harder to find them.'
                    );
                    await npc.say('What about you, what are you eating?');
                    await player.say(
                        'Oh, you know,',
                        'Spiders... Rats...',
                        'Even fish are good eating. The heads are delicious'
                    );
                    await npc.say(
                        'Tell you what, if you can get me some good recipes,',
                        "I'd be happy to give the little buggers a break"
                    );
                    setStage(player, STATE_KRESH_NEEDS_RECIPES);
                    break;
                case 3:
                    await npc.say(
                        "Sure. There's some by the door.",
                        'You can grab some on your way out',
                        'Which had ought to be soon'
                    );
                    return;
                case 4:
                    await npc.say(
                        'A quest, eh?',
                        'I happen to know an unfortunate princess',
                        'locked away in a dragon-guarded castle',
                        'a castle which is surrounded by hot boiling lava!',
                        "It's very very far away from here, to the west.",
                        'Oh so far, far, away. Just keep walking west.',
                        'Good luck, brave knight.'
                    );
                    break;
                default:
                    return;
            }
            break;
        }
        case STATE_KRESH_NEEDS_RECIPES:
            if (!hasEquipped(player, OGRE_EARS_ID)) {
                await npc.say('Aggh!!!', 'get out of here ya earless freak!!');
                return;
            }
            await npc.say('Hullo again', 'Have you got the recipes?');
            if (ifheld(player, OGRE_RECIPES_ID)) {
                await player.say('Yes, here you go');
                player.inventory.remove(OGRE_RECIPES_ID);
                await npc.say('hmmm...', 'Oooh...', "Oh that's clever");
                await npc.say(
                    "Yeah, these are great. I'll be trying all of these",
                    'Thanks a lot, friend!'
                );
                await handleReward(player);
            } else {
                await player.say('Not yet');
                await npc.say("I'm waaaiting...");
            }
            break;
        default:
            // stages with no kresh line fall to the default response
            await player.say('What was I supposed to do again?');
            await npc.say("I'm a terrifying ogre! Get out!");
            await npc.say(
                'Or I\'ll make a nice eyeball stew out of you',
                'and everyone else at the wizards tower'
            );
            await player.say('Eep!');
            break;
    }
}

// sedridor / head wizard dialogue
async function sedridorDialogue(player, npc) {
    const { world } = player;
    const questState = stage(player);

    if (
        questState >= STATE_A_NEW_OGRE &&
        !player.cache.talkedToSedridorAsOgre
    ) {
        await npc.say(
            'Argh!!',
            "Oh, you scared me... I really hope you're " + player.username
        );
        await player.say("Yes, it's me");
        player.cache.talkedToSedridorAsOgre = true;
    }

    switch (questState) {
        case STATE_COMPLETE:
            delete player.cache.sedridor_post_kresh_quest_dialogue;
            await npc.say(
                'Welcome back ' + player.username,
                'Did the ogre like the new recipes?',
                'Is he going to stop eating all the newt eyes?'
            );
            await player.say(
                'Yes, all is well now',
                'He should be eating a lot more fish heads and swamplarva now'
            );
            await npc.say("That's really great to hear");
            await player.say('So... do I get some kind of reward?');
            if (player.cache.ogre_makeover_voucher) {
                await npc.say(
                    "I've heard that the Make over mage",
                    'made some great discoveries as a result of all this.',
                    'You should give him a visit'
                );
                await player.say('Okay, but what about from you?');
            }
            await npc.say(
                "Well, I'm willing to overlook the damage to my recipe book",
                'if that counts'
            );
            await player.say('That does not count');
            await npc.say(
                'I suppose I could part with some coins from our treasury',
                'You did help us all quite a lot with this one.'
            );
            player.message('Sedridor gives you 750 gp');
            await world.sleepTicks(3);
            player.inventory.add(COINS_ID, 750);
            await player.say('Thanks, I was glad to help');
            break;
        case STATE_NOT_BEGUN:
        case STATE_STARTED_QUEST_WITH_KRESH:
            if (questState === STATE_NOT_BEGUN) {
                await npc.say(
                    'Yes actually.',
                    'There is the matter of an ogre in the nearby swamp',
                    'who keeps eating all the eyes of the newts and frogs.'
                );
            } else {
                await npc.say(
                    'Yes actually.',
                    'That ogre has been a real menace',
                    "he's been eating the eyes of any newt or frog",
                    'that gets close to him'
                );
            }

            await npc.say(
                'Not only is this...',
                'rather disturbing',
                "but it's starting to cause supply chain issues.",
                "Soon enough there won't be any frogs or newts with eyes left " +
                    'I fear',
                'both are a critical magical component',
                'for certain types of elixirs'
            );

            if (questState === STATE_NOT_BEGUN) {
                await player.say("Okay, I'll go try talking to him");
                setStage(player, STATE_STARTED_QUEST_WITH_SEDRIDOR);
                await npc.say('Good luck');
            } else {
                await player.say("I've been to see that ogre actually");
                await playerTalksToSedridorAfterMeetingKresh(player, npc);
            }
            break;
        case STATE_STARTED_QUEST_WITH_SEDRIDOR: {
            await npc.say(
                'See if you can convince that ogre not to eat so many eyeballs'
            );
            await npc.say("He's in Lumbridge Swamp");
            await player.say('Okay');
            const killChoice = await player.ask(
                ['Should I just kill him?', "I'll get to it"],
                false
            );
            if (killChoice === 0) {
                await npc.say("Heavens no! We're not barbarians.");
            }
            break;
        }
        case STATE_STARTED_QUEST_WITH_SEDRIDOR_CONFRONTED_KRESH:
            await playerTalksToSedridorAfterMeetingKresh(player, npc);
            break;
        case STATE_PLAYER_CONSIDERS_OGRE:
            await playerReconsidersOgre(player, npc);
            break;
        case STATE_SEDRIDOR_SUGGESTED_YOU_VISIT_MAKE_OVER_MAGE:
        case STATE_MAKE_OVER_MAGE_GAVE_WAIVER:
        case STATE_SIGNED_WAIVER:
            await npc.say(
                'You should go see the Make over mage about becoming an ogre.'
            );
            await player.say('Right, that makes sense.');
            break;
        case STATE_A_NEW_OGRE:
        case STATE_AGGIE_TOLD_PLAYER_TO_COLLECT_ITEMS:
            await npc.say(
                'The disguise looks great',
                'except',
                "Aren't you missing the ears?"
            );
            if (!hasEquipped(player, LEATHER_VEST_ID)) {
                await npc.say('And you might benefit from a vest, as well.');
            }
            await player.say(
                "Yeah, it didn't go 100% to plan at the Make over mage.",
                'He said I should make the ears out of clay',
                "And ask Aggie for help if I can't get the colour right"
            );
            await npc.say('That sounds like a good plan');
            if (
                !hasEquipped(player, LEATHER_VEST_ID) &&
                !ifheld(player, LEATHER_VEST_ID)
            ) {
                await npc.say(
                    'I would also suggest taking a knife to some leather armour',
                    'to make a kind of vest like the ogre has.',
                    "He's more likely to take you seriously if you're well " +
                        'dressed'
                );
            }
            break;
        case STATE_AGGIE_HAS_GIVEN_CLAY:
            if (hasEquipped(player, OGRE_EARS_ID)) {
                await npc.say('The disguise looks great');
                if (!hasEquipped(player, LEATHER_VEST_ID)) {
                    await npc.say('except', 'you might benefit from a vest.');
                    await npc.say(
                        'I would suggest taking a knife to some leather armour',
                        'to make a kind of vest like the ogre has.',
                        "He's more likely to take you seriously if you're well " +
                            'dressed'
                    );
                } else {
                    await npc.say(
                        "I think you're all ready to go confront the ogre"
                    );
                }
            } else {
                await npc.say('The disguise looks great');
                await npc.say('except', "You don't have any ogre ears?");
                if (ifheld(player, OGRE_EARS_ID)) {
                    await player.say(
                        "Well, things didn't exactly go to plan at the " +
                            'makeover mage',
                        "But I've got some prosthetic ones in my bag"
                    );
                    await npc.say(
                        'Well, put them on,',
                        "I'd like to see the whole outfit"
                    );
                } else if (ifheld(player, YELLOWGREEN_CLAY_ID)) {
                    await player.say(
                        'I got some coloured clay',
                        'which could be made into some prosthetic ears'
                    );
                    await npc.say(
                        'Oh, well,',
                        'Let me know when you get it sorted.'
                    );
                } else {
                    await player.say(
                        "Yes, things didn't exactly go to plan at the makeover " +
                            'mage',
                        'Aggie helped me out,',
                        'But then I lost the moulding clay she gave me to ' +
                            'create some prosthetic ears...'
                    );
                    await npc.say(
                        "Oh. Well. You'll need them.",
                        'Maybe Aggie can sort you out again...'
                    );
                }
            }
            break;
        case STATE_KRESH_NEEDS_RECIPES:
            await player.say('Sedridor, the disguise worked!');
            await npc.say(
                'Great! Did he agree to stop eating the newts?'
            );
            await player.say(
                "He said he'd be willing to give them a break",
                'if he knew what else to eat'
            );
            if (!ifheld(player, OGRE_RECIPES_ID)) {
                await npc.say(
                    'Hmm.',
                    'I once picked up an odd recipe book compilation,',
                    'It was a collection of recipes even from non-human ' +
                        'cultures.',
                    "It'd likely have ogre recipes.",
                    'See if you can find it on the bookcase over there.'
                );
                return;
            }
            await player.say(
                'I found some ogre recipes on the bookcase over there',
                "So now I'll be going back to drop them off"
            );
            await npc.say('Excellent!');
            break;
        default:
            break;
    }
}

// make over mage dialogue
async function makeOverMageDialogue(player, npc) {
    const questState = stage(player);
    switch (questState) {
        case STATE_SEDRIDOR_SUGGESTED_YOU_VISIT_MAKE_OVER_MAGE: {
            await npc.say(
                'Are you happy with your looks?',
                'If not I can change them for the cheap cheap price',
                'Of 3000 coins'
            );
            const opt = await player.ask(
                [
                    "I'm happy with how I look thank you",
                    'I\'m wondering if you could make me look like an ogre?'
                ],
                false
            );
            if (opt === 1) {
                await npc.say(
                    'An ogre?',
                    'What on earth would you want to look like that for?'
                );
                await player.say(
                    'Sedridor says it might be a good disguise',
                    'to talk to the ogre in Lumbridge swamp eating all the ' +
                        'newt and frog eyes'
                );
                await npc.say(
                    "Is that what's happening?",
                    "I noticed prices on those were way up at Aggie's",
                    'Not that I needed any at the time'
                );
                await player.say(
                    'Yeah. Sedridor is afraid that the ogre might eat',
                    'all the newts and frogs in the swamp soon',
                    'unless someone intervenes.'
                );
                await npc.say(
                    "I'll do my best but species transmogrification isn't",
                    'a very advanced field.',
                    "I won't charge you for this,",
                    "as it's for a good cause,",
                    "and you're essentially going to be a guinea pig"
                );
                await player.say('No, not a Guinea Pig, an Ogre!');
                await npc.say(
                    'Right.',
                    'If you could please sign this waiver,',
                    "we'll give it a go"
                );
                player.inventory.add(MAKEOVER_WAIVER_ID, 1);
                setStage(player, STATE_MAKE_OVER_MAGE_GAVE_WAIVER);
            }
            break;
        }
        case STATE_MAKE_OVER_MAGE_GAVE_WAIVER: {
            await npc.say('Have you signed the waiver yet?');
            if (!ifheld(player, MAKEOVER_WAIVER_ID, 1)) {
                await player.say("I've actually lost the agreement");
                await npc.say("That's okay, I have a lot of these.");
                player.inventory.add(MAKEOVER_WAIVER_ID, 1);
                player.message(
                    'The Mage hands you another copy of the liability waiver'
                );
            } else {
                const lie = await player.ask(
                    [
                        "Yes, and I'm ready. Here's the waiver.",
                        'No, still reading...'
                    ],
                    false
                );
                if (lie === 0) {
                    await npc.say(
                        "Hmmm... no, it's not signed.",
                        'This is important and must be signed before I can ' +
                            'help you.'
                    );
                    await player.say('Oh, my bad');
                }
            }
            break;
        }
        case STATE_SIGNED_WAIVER: {
            await npc.say('Have you signed the waiver yet?');
            if (!ifheld(player, MAKEOVER_WAIVER_ID, 1)) {
                await player.say("I've actually lost the agreement");
                await npc.say("That's okay, I have a lot of these.");
                player.inventory.add(MAKEOVER_WAIVER_ID, 1);
                player.message(
                    'The Mage hands you another copy of the liability waiver'
                );
                setStage(player, STATE_MAKE_OVER_MAGE_GAVE_WAIVER);
            } else {
                const truth = await player.ask(
                    [
                        "Yes, and I'm ready. Here's the waiver.",
                        'No, still reading...'
                    ],
                    false
                );
                if (truth === 0) {
                    player.inventory.remove(MAKEOVER_WAIVER_ID);
                    await npc.say(
                        "Great! I'll get that squared away.",
                        "And we're good to go"
                    );
                    player.message(
                        'The Mage makes a gesture with his arms like he\'s ' +
                            'preparing for flight'
                    );
                    await player.world.sleepTicks(8);
                    player.message(
                        'Then he moves one of his hands into the shape of an ' +
                            'L against his forehead'
                    );
                    await player.world.sleepTicks(8);
                    player.message(
                        'As he swings both arms down, you begin to feel a very ' +
                            'strange bodily sensation'
                    );
                    await player.world.sleepTicks(8);
                    await player.say('Aaaaaaaa');
                    becomeOgre(player);
                    player.message(
                        "You feel like you've been smashed right in the mouth"
                    );
                    await player.world.sleepTicks(5);
                    await player.say('eughh....');
                    player.message('Your left eye feels a bit dry too');
                    await player.world.sleepTicks(5);
                    await npc.say(
                        "Hmmm, well,... it's at least most of the way there",
                        'How do you feel?'
                    );
                    await player.say(
                        'Per the agreement, I must report I feel fine'
                    );
                    await npc.say(
                        'Great!',
                        "It does seem like you're not quite all the way an " +
                            'ogre though'
                    );
                    await player.say('Oh?');
                    await npc.say(
                        'I was really hoping to get the ears right too'
                    );
                    player.message(
                        'You feel around your head and only find your regular ' +
                            'human ears'
                    );
                    await player.world.sleepTicks(5);
                    await npc.say(
                        'I think you can sculpt some out of coloured clay.',
                        'That should work. Talk to Aggie if you have trouble ' +
                            'getting the colour right.',
                        "I don't think it'd be wise to try pushing my magic " +
                            'further.'
                    );
                    setStage(player, STATE_A_NEW_OGRE);
                }
            }
            break;
        }
        case STATE_A_NEW_OGRE:
        case STATE_AGGIE_TOLD_PLAYER_TO_COLLECT_ITEMS:
        case STATE_AGGIE_HAS_GIVEN_CLAY:
        case STATE_KRESH_NEEDS_RECIPES:
            await player.say('What was I meant to do again?');
            if (ifheld(player, OGRE_EARS_ID)) {
                await npc.say(
                    'I see you got the ears worked out',
                    "You'll likely want to check back in with Sedridor",
                    'Tell him I said Hi'
                );
            } else {
                await npc.say(
                    'I think you should sculpt some ears out of coloured clay.',
                    'Talk to Aggie if you have trouble getting the colour right.'
                );
            }
            break;
        default:
            // not a quest state, falls through to authentic dialogue
            break;
    }
}

// aggie dialogue, quest states only
async function aggieDialogue(player, npc) {
    const { world } = player;
    const questState = stage(player);
    switch (questState) {
        case STATE_A_NEW_OGRE: {
            await npc.say(
                'Ooh, hello dearie',
                "I don't get many ogres in my shop",
                'Feel free to help yourself to some cheese'
            );
            await player.say(
                "I'm actually a human",
                "I'm just disguised as an ogre to try and solve",
                'the newt & frog eye supply chain issues'
            );
            await npc.say('Disguised?');
            player.message('Aggie pokes at your skin');
            await world.sleepTicks(4);
            await npc.say(
                'Ugh',
                "Why didn't you come to me first?",
                'I could have set you up with a nice skin paste',
                'Those wizards are always so... literal...',
                'You can go really far with just practical effects.'
            );
            await player.say('I wish I had known that earlier.');
            await npc.say(
                'yes, well, I do wish you luck.',
                'My sister Betty has been in a real tuft about those newt eyes'
            );
            await player.say(
                'Actually I was hoping you could still help me.',
                "The Make over mage didn't exactly get the spell right",
                "and I'm missing the ears.",
                'He said that you might be able to mix a dye',
                'for some coloured sculpting clay to stick on my head.'
            );
            await npc.say(
                'That man charges a fortune.',
                "I really wish he'd refer people to me sooner",
                "We'd avoid a lot more messes like this."
            );

            const messes = await player.ask(
                ['A lot more messes?', 'What do you need for the sculpting clay?'],
                false
            );
            if (messes === 0) {
                await npc.say(
                    'Yes. Nearly everything that man does',
                    'could be accomplished with much cheaper skin or clothing ' +
                        'dyes.',
                    'The instant body morphing stuff,',
                    "of course you'll need to involve magic for *that*",
                    'but a lot of people go to him just to change the colour ' +
                        'of their pants!',
                    'For 3000 coins!',
                    'You could buy a boat and a half for that much...',
                    "What's more is I've heard he's started having people",
                    'sign really invasive and probably non-legally-binding ' +
                        'waivers',
                    'As a result of some very unfortunate accidents...'
                );
                await player.say('Wow...');
                await npc.say('Thanks for letting Aggie rant, deary');
                await player.say('What do you need for the sculpting clay?');
            } else if (messes === -1) {
                return;
            }
            await npc.say(
                'Right, well of course we\'ll need some soft clay.',
                'To match ogre skin, your variety of ogre anyway,',
                "it's really closer to yellow than it is to green.",
                "I'll need 4 onions, to make some yellow dyes",
                'and 1 woad leaf, for a little blue'
            );
            await player.say('Thanks Aggie');
            setStage(player, STATE_AGGIE_TOLD_PLAYER_TO_COLLECT_ITEMS);
            break;
        }
        case STATE_AGGIE_TOLD_PLAYER_TO_COLLECT_ITEMS:
            await npc.say(
                'Hello dearie',
                'Have you got all the things for the ogre-skin clay?'
            );
            if (
                ifheld(player, SOFT_CLAY_ID, 1) &&
                ifheld(player, ONION_ID, 4) &&
                ifheld(player, WOAD_LEAF_ID, 1)
            ) {
                await player.say('Yes, I have it all');
                player.inventory.remove(SOFT_CLAY_ID, 1);
                player.inventory.remove(ONION_ID, 4);
                player.inventory.remove(WOAD_LEAF_ID, 1);
                player.message('Aggie takes all the items');
                await world.sleepTicks(3);
                await npc.say(
                    'Fernstehen, Isobutane, Papaya, DonkeyDash, Nearpennt'
                );
                player.inventory.add(YELLOWGREEN_CLAY_ID, 1);
                player.message('Aggie hands you some gloopy yellowgreen clay');
                await world.sleepTicks(3);
                await npc.say(
                    'There you go dearie, your ears-to-be',
                    'That will make you look like a proper ogre'
                );
                setStage(player, STATE_AGGIE_HAS_GIVEN_CLAY);
            } else {
                await player.say('No, not yet');
                await npc.say(
                    "You'll need some soft clay, four onions, and a woad leaf."
                );
                await npc.say(
                    'No charge,',
                    'since I feel sorry that you had to deal with the Make ' +
                        'over mage'
                );
                await player.say('Thanks Aggie');
            }
            break;
        case STATE_AGGIE_HAS_GIVEN_CLAY:
        case STATE_KRESH_NEEDS_RECIPES:
            if (hasEquipped(player, OGRE_EARS_ID)) {
                await player.say('Check out my ogre ears!');
                await npc.say('They look lovely, deary');
                return;
            }
            if (
                !ifheld(player, OGRE_EARS_ID) &&
                !ifheld(player, YELLOWGREEN_CLAY_ID)
            ) {
                await makeAnotherClay(player, npc, false);
                return;
            }
            if (ifheld(player, YELLOWGREEN_CLAY_ID)) {
                await player.say('What should I do with this stuff again?');
                await npc.say(
                    'Kind of press into it until it looks like how you want'
                );
                return;
            }
            if (ifheld(player, OGRE_EARS_ID)) {
                await player.say('I made the ogre ears!');
                await npc.say('Wonderful.');
                return;
            }
            break;
        default:
            break;
    }
}

async function makeAnotherClay(player, npc, postquest) {
    const { world } = player;
    if (!postquest) {
        await player.say("I think I've lost the clay");
    } else {
        await player.say('I lost my other pair of ears...');
    }
    if (
        ifheld(player, SOFT_CLAY_ID, 1) &&
        ifheld(player, ONION_ID, 4) &&
        ifheld(player, WOAD_LEAF_ID, 1)
    ) {
        await player.say("But I've got everything needed to make another");
        if (!ifheld(player, COINS_ID, 20)) {
            player.message('You offer up the clay, onions, and woad leaf.');
            await world.sleepTicks(4);
            await npc.say(
                'The money too, dearie.',
                "I can't do this for free every time!",
                "I'll need 20 coins"
            );
            await player.say('Oh, okay. Be right back.');
            return;
        }
        player.inventory.remove(SOFT_CLAY_ID, 1);
        player.inventory.remove(ONION_ID, 4);
        player.inventory.remove(WOAD_LEAF_ID, 1);
        player.inventory.remove(COINS_ID, 20);
        player.message('Aggie takes all the items');
        await world.sleepTicks(3);
        await npc.say('Fernstehen, Isobutane, Papaya, DonkeyDash, Nearpennt');
        player.inventory.add(YELLOWGREEN_CLAY_ID, 1);
        player.message('Aggie hands you some gloopy yellowgreen clay');
        await world.sleepTicks(3);
        await npc.say(
            'There you go dearie, your ears-to-be',
            'That will make you look like a proper ogre'
        );
    } else {
        await npc.say('Hmmm, okay. I can make you some more.');
        await npc.say(
            "You'll need some soft clay, four onions, and a woad leaf."
        );
        await npc.say(
            "I'll also want 20 coins this time.",
            "Then we'll get you set back up again."
        );
        await player.say('Thanks Aggie');
    }
}

async function playerTalksToSedridorAfterMeetingKresh(player, npc) {
    await npc.say('How did it go?');
    await player.say('Very poorly. He threatened to eat my eyes!');
    await npc.say(
        'Oh dear.',
        "I was afraid of that, if I'm honest.",
        "We've tried talking to him before.",
        'I thought maybe a non-wizard would have better luck',
        "But I'm starting to think he won't listen to anyone."
    );
    await player.say('What can we do?');
    await npc.say("I've got one more idea.", 'He might listen to an ogre.');
    await player.say('Do you know anyone like that...?');
    await npc.say(
        'No... but, it could be possible to turn you into one.'
    );
    await player.say('One what');
    await npc.say('An ogre.');
    const soundsGreatLol = await player.ask(
        ["No, no I don't think so.", 'Yeah okay, that sounds great!'],
        false
    );
    if (soundsGreatLol === 0) {
        await npc.say(
            "It'd only be temporary, but of course I understand your " +
                'hesitation.',
            'Think it over, and of course let me know if you have any better ' +
                'ideas...'
        );
        setStage(player, STATE_PLAYER_CONSIDERS_OGRE);
        return;
    }
    await npc.say('Thankyou for your help');
    await handleOneTimeTele(player, npc);
}

async function playerReconsidersOgre(player, npc) {
    await npc.say(
        "Excellent! I'm really glad to hear that.",
        'We all appreciate your efforts.'
    );
    await handleOneTimeTele(player, npc);
}

async function handleOneTimeTele(player, npc) {
    await npc.say(
        'First of all, go talk to the Make over Mage.',
        "He's a bit weird, but specialised and quite good at what he does.",
        'He might be able to turn you into an ogre.'
    );
    setStage(player, STATE_SEDRIDOR_SUGGESTED_YOU_VISIT_MAKE_OVER_MAGE);
    const where = await player.ask(['Where is he?', 'Alright, will do'], false);
    if (where === 0) {
        await npc.say(
            "He's far to the north-west.",
            'Take the road out of here north to the crossroads',
            'At that crossroads, take the road west towards Falador',
            "Go past Falador until you get to the crafter's guild",
            "And you'll find the make over mage just a bit north-west of there"
        );
        const teleMe = await player.ask(
            ['Okay thanks', "Couldn't you just teleport me there please?"],
            false
        );
        if (teleMe === 1) {
            await npc.say(
                "Well, there's a teleportation node at the nearby darkwizards " +
                    'tower.',
                'The wizards at the guild have been researching it.',
                "He's just a bit south, past the south gate, from there.",
                "It's a bit dangerous, but I could put you up there if it " +
                    'would help.'
            );
            const agree = await player.ask(
                ['Ok, I agree', "I'd better just walk"],
                false
            );
            if (agree === 0) {
                await npc.say('Brace yourself');
                player.teleport(362, 1515);
            } else {
                await npc.say('Okay, sounds good.');
            }
        }
    }
}

// turns the player into an ogre and broadcasts the appearance
function becomeOgre(player) {
    const a = player.appearance || {};
    player.setAppearance({
        hairColour: a.hairColour,
        topColour: a.topColour,
        trouserColour: a.trouserColour,
        headSprite: a.headSprite,
        bodySprite: a.bodySprite,
        skinColour: OGRE_SKIN_COLOUR
    });
    player.broadcastPlayerAppearance(true);
}

// bookcase search gives the ogre recipe book
async function bookcaseSearch(player) {
    if (
        stage(player) >= STATE_KRESH_NEEDS_RECIPES &&
        !ifheld(player, OGRE_RECIPES_ID)
    ) {
        await player.say(
            'Aha, here we go, "Classic Ogre Recipes"',
            "I'll just tear this page out then..."
        );
        player.message('You tear a page out of the book');
        player.inventory.add(OGRE_RECIPES_ID, 1);
    } else {
        player.message("There's lots of books about wizardry here");
    }
}

// reward: 2 qp plus cooking/crafting xp
async function handleReward(player) {
    setStage(player, STATE_COMPLETE);
    player.message('Well done you have completed the kresh quest');

    // incStat(COOKING, 200, 100) => base*100 + 200
    player.addExperience(
        'cooking',
        player.skills.cooking.base * 100 + 200,
        false
    );
    // incStat(CRAFTING, 200, 75) => base*75 + 200
    player.addExperience(
        'crafting',
        player.skills.crafting.base * 75 + 200,
        false
    );

    player.addQuestPoints(2);
    player.message('@gre@You have gained 2 quest points!');
    player.message('You now have access to new skin colours!');
    player.cache.ogre_makeover_voucher = true;
    player.message(
        'You can go back to the Make over mage for a free make over'
    );
    player.cache.sedridor_post_kresh_quest_dialogue = true;
    delete player.cache.talkedToSedridorAsOgre;
}

// plugin entry points

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const questState = stage(player);

    if (npc.id === KRESH_ID) {
        player.engage(npc);
        await kreshDialogue(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === HEAD_WIZARD_ID) {
        // peeling intercepts only while active; otherwise rune mysteries owns the npc
        const runeMysteriesDone = player.questStages.runeMysteries === -1;
        const peelingStartable =
            runeMysteriesDone &&
            (questState === STATE_NOT_BEGUN ||
                questState === STATE_STARTED_QUEST_WITH_KRESH);
        const peelingHasLines =
            peelingStartable ||
            (questState >= STATE_STARTED_QUEST_WITH_SEDRIDOR &&
                questState <= STATE_KRESH_NEEDS_RECIPES) ||
            (questState === STATE_COMPLETE &&
                player.cache.sedridor_post_kresh_quest_dialogue);

        if (peelingHasLines) {
            player.engage(npc);
            await sedridorDialogue(player, npc);
            player.disengage();
            return true;
        }
        return false;
    }

    if (npc.id === MAKE_OVER_MAGE_ID) {
        // quest states 5..11 override the mage, else authentic dialogue
        if (
            questState >= STATE_SEDRIDOR_SUGGESTED_YOU_VISIT_MAKE_OVER_MAGE &&
            questState <= STATE_KRESH_NEEDS_RECIPES
        ) {
            player.engage(npc);
            await makeOverMageDialogue(player, npc);
            player.disengage();
            return true;
        }
        return false;
    }

    if (npc.id === AGGIE_ID) {
        // quest states 8..11 override aggie, else authentic dialogue
        if (
            questState >= STATE_A_NEW_OGRE &&
            questState <= STATE_KRESH_NEEDS_RECIPES
        ) {
            player.engage(npc);
            await aggieDialogue(player, npc);
            player.disengage();
            return true;
        }
        return false;
    }

    return false;
}

// bookcase search for the ogre recipe book, gated by coords and stage
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        gameObject.id === TOWER_BOOKCASE_ID &&
        gameObject.x >= 600 &&
        gameObject.x <= 610 &&
        gameObject.y >= 750 &&
        gameObject.y <= 765 &&
        stage(player) >= STATE_KRESH_NEEDS_RECIPES &&
        !ifheld(player, OGRE_RECIPES_ID)
    ) {
        await bookcaseSearch(player);
        return true;
    }

    return false;
}

// knife + leather armour makes a leather vest, +8 crafting
async function onUseWithInventory(player, item, target) {
    if (!questsEnabled(player)) {
        return false;
    }

    const isKnife = item.id === KNIFE_ID || target.id === KNIFE_ID;
    const isLeather =
        item.id === LEATHER_ARMOUR_ID || target.id === LEATHER_ARMOUR_ID;

    if (isKnife && isLeather) {
        if (player.inventory.has(LEATHER_ARMOUR_ID)) {
            player.inventory.remove(LEATHER_ARMOUR_ID);
            player.inventory.add(LEATHER_VEST_ID, 1);
            player.message(
                'You slash the leather armour up into a fashionable vest'
            );
            player.addExperience('crafting', 8);
        }
        return true;
    }

    return false;
}

// item read commands: waiver, recipes, clay shaping
async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id === MAKEOVER_WAIVER_ID) {
        await readWaiver(player);
        return true;
    }

    if (item.id === OGRE_RECIPES_ID) {
        await readRecipes(player);
        return true;
    }

    if (item.id === YELLOWGREEN_CLAY_ID) {
        await shapeClay(player, item);
        return true;
    }

    return false;
}

// waiver panel and sign flow
const WAIVER_LINES = [
    '@lre@Make Over Mage Liability Waiver',
    '@whi@You agree that you are undergoing an experimental and unproven ' +
        'procedure.',
    'While we will attempt to ensure the safety of all participants, we ' +
        'cannot guarantee it.',
    'Please note that your clothes may become permanently stained.',
    'By signing this waiver you agree not to hold the Make Over Mage ' +
        'responsible',
    'for any intended or unintended consequences of the procedure.',
    'You agree to bring The Mage a cooked chicken at christmas.',
    'You further agree to forfeit your rights to claim damages in a civil ' +
        'suit.',
    'This procedure could lead to symptoms including but not limited to: ' +
        'insomnia,',
    'increased risk of harmful gallstones, high blood pressure, emphysema,',
    'mesothelioma, monotheism, incontinence, and dry eye.',
    'Rarely: loss of limb, blindness, sudden inability to speak, and death ' +
        'have occurred.',
    '@yel@And no complaining either!'
];

async function readWaiver(player) {
    const { world } = player;
    for (const line of WAIVER_LINES) {
        player.message(line);
        await world.sleepTicks(3);
    }

    if (stage(player) === STATE_MAKE_OVER_MAGE_GAVE_WAIVER) {
        player.message('Would you like to sign the waiver?');
        const sign = await player.ask(
            ['Sign the waiver', 'Do not sign the waiver'],
            false
        );
        if (sign === 0) {
            setStage(player, STATE_SIGNED_WAIVER);
            player.message('great job signing the waiver');
        } else {
            player.message("Let's not");
        }
    }
}

const RECIPE_LINES = [
    '@lre@Classic Ogre Recipes',
    '@yel@Weedrat stew:@whi@ First catch a weedrat. Boil entire rat in swamp ' +
        'water',
    'for 20 to 40 minutes with onions and swamp greens. Alternatively, ' +
        'rotisserie 40 to 60 minutes.',
    '@yel@Spider cotton-candy:@whi@ Take a stick to a spiderweb and rotate',
    'until the spiderweb completely wraps around the stick several times.',
    '@yel@Swamplarva:@whi@ Turn over some rocks, you\'ll find delicious grubs. ' +
        'Eat live.',
    '@yel@Onions:@whi@ Always a great snack. Boiled in a stew or eaten raw.',
    '@yel@Wormstuffed pumpkin:@whi@ Cut open the top of a pumpkin and stick ' +
        'some redvine worms inside.',
    '@yel@Eyeballs:@whi@ All varieties are delicious. Fish heads can be ' +
        'gathered in mass quantities',
    'near human settlements, as they usually waste them.'
];

async function readRecipes(player) {
    const { world } = player;
    for (const line of RECIPE_LINES) {
        player.message(line);
        await world.sleepTicks(3);
    }
}

// shapes clay into ogre ears, crafting 5, +40 xp
async function shapeClay(player, item) {
    player.message('Would you like to shape the clay?');
    const choice = await player.ask(['Yes', 'No'], false);
    if (choice === 0) {
        if (player.skills.crafting.current < 5) {
            player.message(
                'You must have at least level 5 crafting to successfully ' +
                    'sculpt Ogre Ears'
            );
            return;
        }
        if (player.inventory.has(item.id)) {
            player.inventory.remove(item.id);
            player.inventory.add(OGRE_EARS_ID, 1);
            player.addExperience('crafting', 40);
            player.message(
                'You sculpt the clay into a beautiful pair of ogre ears'
            );
        }
    }
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onUseWithInventory,
    onInventoryCommand
};
