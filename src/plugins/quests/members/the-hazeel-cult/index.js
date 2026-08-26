// two-path quest: good kills alomone, exposes butler jones; evil poisons a meal, joins cult, resurrects hazeel

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');

const QUEST_KEY = 'theHazeelCult';

// NPC ids (translated via id-map.json npcs)
const CLAUS_ID = 427;
const CERIL_ID = 416;
const BUTLER_ID = 417;
const HENRYETA_ID = 420;
const PHILIPE_ID = 421;
const CARNILLEAN_GUARD_ID = 418;
const CLIVET_ID = 422;
const CULT_MEMBER_ID = 423;
const ALOMONE_ID = 425;
const LORD_HAZEEL_ID = 424;

// Item ids (translated via id-map.json items)
const COINS_ID = 8;
const POISON_ID = 175;
const CARNILLEAN_ARMOUR_ID = 753;
const CARNILLEAN_KEY_ID = 754;
const MARK_OF_HAZEEL_ID = 751;
const SCRIPT_OF_HAZEEL_ID = 745;

const BUTLERS_CUPBOARD_ID = 440;
const BASEMENT_CRATE_ID = 182;
const TOP_LEVEL_BOOKCASE_ID = 47;
const CARNILLEAN_CHEST_ID = 437;

const QUEST_NPCS = new Set([
    CLAUS_ID,
    CERIL_ID,
    BUTLER_ID,
    HENRYETA_ID,
    PHILIPE_ID,
    CARNILLEAN_GUARD_ID,
    CLIVET_ID,
    CULT_MEMBER_ID,
    ALOMONE_ID
]);

function isGood(player) {
    return 'good_side' in player.cache;
}

function isEvil(player) {
    return 'evil_side' in player.cache;
}

// a narration line followed by a 3-tick pause
async function mes(player, ...lines) {
    for (const line of lines) {
        player.message(line);
    }
    await player.world.sleepTicks(3);
}

function nearbyNpc(player, id, range = 10) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

function grantReward(player) {
    const thievingXp = player.skills.thieving.base * 200 + 2000;

    if (isGood(player)) {
        player.message('Well done you have completed the Hazeel cult quest');
        player.addExperience('thieving', thievingXp, false);
        player.questStages[QUEST_KEY] = -1;
        player.addQuestPoints(1);
        player.message('@gre@You haved gained 1 quest point!');
        player.message('ceril gives you 2000 gold coins');
        player.inventory.add(COINS_ID, 2000);
    } else if (isEvil(player)) {
        player.message('Hazeel gives you some coins');
        player.inventory.add(COINS_ID, 2000);
        player.addExperience('thieving', thievingXp, false);
        player.questStages[QUEST_KEY] = -1;
        player.addQuestPoints(1);
        player.message('@gre@You haved gained 1 quest point!');
        player.message('you have completed the hazeel cult quest');
    }
}


async function talkCeril(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined: {
            await player.say('hello there');
            await npc.say(
                'blooming, thieving, wierdos',
                "why don't they leave me alone?"
            );
            const menu = await player.ask(
                [
                    "What's wrong?",
                    'You probably deserve it',
                    "You seem uptight, I'll leave you alone"
                ],
                true
            );
            if (menu === 0) {
                await npc.say(
                    "it's those strange folk from the forest",
                    'those freaks keep breaking into my house'
                );
                await player.say('have they taken much?');
                await npc.say(
                    "they first broke in months ago and stole a suit of armour",
                    "the strange thing is that they've broken in four times since",
                    'but took nothing'
                );
                await player.say('and you are...?');
                await npc.say(
                    "why, i'm ceril carnillean",
                    'we really are quite a famous bloodline',
                    "we've played a large part in ardounge pollitics for generations",
                    'maybe you could help retrieve the armour?',
                    'of course there would be a handsom cash reward for yourself'
                );
                const option = await player.ask(
                    [
                        "No thanks i've got plans",
                        "yes, off course,i'd be happy to help"
                    ],
                    true
                );
                if (option === 0) {
                    await npc.say(
                        "no wonder i'm the one with the big house and you're on the streets"
                    );
                } else if (option === 1) {
                    await npc.say(
                        "that's very kind of you",
                        'I caught a glimpse of the thieves leaving',
                        'but due to ermm... my cold... I was unable to give chase',
                        'they were dressed all in black',
                        'I think they may have belonged to some sort of cult'
                    );
                    await player.say('do you know where they are?');
                    await npc.say(
                        'my old butler once followed them',
                        'to a cave entrance in the forest south of here',
                        'unfortunately the next night he died in his sleep'
                    );
                    await player.say("that's awful");
                    await npc.say(
                        "it's ok, a replacement arrived the next day",
                        "he's been great, cooks an excellent broth"
                    );
                    await player.say("ok ceril, i'll see what i can do");
                    player.questStages[QUEST_KEY] = 1;
                }
            } else if (menu === 1) {
                await npc.say(
                    'who are you to judge me?',
                    'hmmm, you look like a peasant',
                    "i'm wasting my time talking to you"
                );
            } else if (menu === 2) {
                await npc.say('yes, i doubt you could help');
            }
            break;
        }
        case 1:
        case 2:
            await player.say('hello ceril');
            await npc.say(
                "it's sir ceril to you",
                "and shouldn't you be out recovering my suit of armour?"
            );
            break;
        case 3:
            await npc.say('have you had any luck yet?');
            if (isGood(player)) {
                await player.say("hello ceril, i've discovered the hideout");
                await npc.say('well done... and the armour?');
                await player.say(
                    "i'm afraid not",
                    'i spoke to a cult member in the entrance of the cave',
                    'but he escaped into the sewer systems',
                    'seems they have a grievance with your family',
                    'something to do with some bloke called hazeel'
                );
                await npc.say(
                    'err errmm... no',
                    "They're obviously all mad",
                    'just find them and bring back the armour'
                );
            } else if (isEvil(player)) {
                await player.say("i'm afraid not ceril");
                await npc.say(
                    "well that's strange",
                    'the butler seemed quite sure about their location'
                );
            }
            break;
        case 4:
            if (isGood(player)) {
                if (player.inventory.has(CARNILLEAN_ARMOUR_ID)) {
                    await player.say(
                        'ceril, how are you?',
                        "Look, I've found the armour"
                    );
                    await npc.say('well done i must say i am impressed');
                    await mes(player, 'you give ceril the family armour');
                    player.inventory.remove(CARNILLEAN_ARMOUR_ID);
                    await npc.say(
                        'before we send you on your way',
                        "i'll get our butler jones",
                        'to whip you up some of his special broth'
                    );
                    await player.say(
                        "i'd rather not",
                        'i overheard the cult members talking',
                        'the buttler is really working for them'
                    );
                    // teleport up to jones' room only when ceril is on the ground floor
                    await npc.say(
                        "that's it, come with me",
                        "we'll sort this out once and for all"
                    );
                    await mes(player, "you follow ceril up to butler Jones' room");
                    player.teleport(613, 1562);
                    const ceril = nearbyNpc(player, CERIL_ID, 10) || npc;
                    await mes(player, 'ceril speaks briefly with Jones');
                    await ceril.say(
                        "Well, he assures me that he's a loyal hard working man",
                        'I cannot fathom, why you would believe he is a spy'
                    );
                    await player.say("surely you won't take his word for it?");
                    await ceril.say(
                        'we have also decided that due to the humilliation you have caused',
                        'it is only fair that Jones shall recieve your reward',
                        'you shall recieve payment more suited to your low life personality'
                    );
                    await mes(player, 'ceril gives you 5 gold coins');
                    player.inventory.add(COINS_ID, 5);
                    await mes(player, 'ceril gives jones 695 gold coins');
                    await ceril.say('now take it and leave');
                    await mes(player, 'butler Jones has a slight grin');
                    await mes(player, "You're going to need more than just your word");
                    await mes(player, "To prove Jones' treachary");
                    player.questStages[QUEST_KEY] = 5;
                } else {
                    await player.say('ceril, how are you?');
                    await npc.say('Im ok. Have you found the armour');
                    await player.say("i'm afraid not");
                    await npc.say("well i'm not paying you to see the sights");
                    await player.say(
                        "okay, i'll go and try and retrieve it for you"
                    );
                }
            } else if (isEvil(player)) {
                await player.say('hello again');
                await npc.say(
                    'oh my, the misery, the pain',
                    'my son is a good boy but stupid as well',
                    "i can't believe he gave his dinner to scruffy",
                    'without having the servents check it for poison first',
                    'how could he be so careless?'
                );
                await player.say('scruffy?');
                await npc.say(
                    "he's been in the family for twenty years the poor dog",
                    'what did he ever do to hurt anyone?'
                );
            }
            break;
        case 5:
            if (isGood(player)) {
                await player.say('you owe me money');
                await npc.say(
                    'i owe you nothing now go away',
                    'before i have jones throw you out'
                );
            } else if (isEvil(player)) {
                await player.say('ceril, how are you?');
                await npc.say(
                    "I'm devestated",
                    "i don't know what to do with myself since i lost scruffy"
                );
                await mes(player, 'ceril bursts into tears');
            }
            break;
        case 6:
            await player.say('hello ceril, how are you?');
            await npc.say('I think the thieves may have been back in the house');
            await player.say('why?');
            await npc.say(
                "i'm not sure but it seem's as if some of my books",
                'have been re-arranged in my study',
                "it's either that or i'm losing my marbles"
            );
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello ceril');
                await npc.say(
                    'well hello there',
                    "brave adventurer, it's good to see you again",
                    "if it wasn't for you",
                    'that butler jones would have poisoned me by now'
                );
            } else if (isEvil(player)) {
                await player.say('hello ceril');
                await npc.say(
                    'i maybe wrong',
                    'but ever since i asked for your help',
                    "thing's have gone from bad to worse",
                    'i think from now on you better keep out of my way'
                );
            }
            break;
    }
}

async function talkButler(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
        case 2:
            await player.say('hello there');
            await npc.say('hello,how are you today?');
            await player.say('good thanks and yourself');
            await npc.say('fine and dandy');
            break;
        case 1: {
            await player.say('hello, what is this building?');
            await npc.say(
                'this is the property of Sir Ceril Carnillean',
                'of the noble carnillean family',
                "you're welcome to look around",
                "but i'm afraid i'll have to keep an eye on you",
                "we've been having a real problem with thieves",
                'strange cult folk coming out the forest'
            );
            await player.say("that's a shame");
            await npc.say(
                'yes well these things are bound to happen',
                "when you're as wealthy as the Varnilleans"
            );
            const butMenu = await player.ask(
                [
                    'Have you any more info on the carnilleans?',
                    'How long have you worked here?',
                    'Ok then take care'
                ],
                true
            );
            if (butMenu === 0) {
                await npc.say(
                    "there's a lot i could tell you",
                    'about the carnillean family history',
                    "i'm afraid if did speak about such matter's",
                    'i would lose my job and that i cannot risk'
                );
            } else if (butMenu === 1) {
                await npc.say(
                    'long enough to know the carnilleans',
                    'are not as innocent or noble as they seem'
                );
            } else if (butMenu === 2) {
                await npc.say('you to');
            }
            break;
        }
        case 3:
            await player.say('how long have you worked here?');
            await npc.say(
                "long enough to know the carnillean's",
                'are not as innocent or noble as they seem'
            );
            break;
        case 4:
            if (isGood(player)) {
                await player.say('jones i need to talk to you');
                await npc.say('do you need some help with your quest?');
                await player.say(
                    'you can stop the act jones',
                    "i know you're working for the cult"
                );
                await npc.say("what? don't be so silly");
                await player.say('I overheard the cult leader talking about you');
                await npc.say(
                    'look here,you may think you know something',
                    'but really you have no idea'
                );
                await player.say(
                    'i know once i reveal the truth',
                    "you'll be locked up"
                );
                await npc.say(
                    'you think that old fool ceril',
                    'will take your word over mine',
                    "he completely trust's me"
                );
                await player.say('we will have to see about that');
                await npc.say(
                    "i'll warn you once more traveller",
                    "don't get involved"
                );
            } else if (isEvil(player)) {
                await player.say('hello there');
                await npc.say(
                    'hello friend,i heard about your handy work',
                    'quite amusing really',
                    "I'm sure hazeel will be pleased with you anyway",
                    'keep up the good work'
                );
            }
            break;
        case 5:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'you fool',
                    'did you think you could simply accuse me and save the day?',
                    "we've been working on this for years",
                    'your interference is only a minor set back to our plans',
                    'and when the mighty hazeel does return',
                    'the likes of you and the carnilleans will be the first of many to suffer'
                );
            } else if (isEvil(player)) {
                await npc.say(
                    'hello again friend',
                    'I see you you have the mark',
                    'you should keep that covered up'
                );
                await player.say("oh that's just an old family pass down");
                await npc.say(
                    "you don't have to pretend to me friend",
                    'our cause is one and the same',
                    'the sooner lord hazeel is avenged',
                    'the better for us and this city'
                );
                await player.say('have you any idea where the sacred script is');
                await npc.say(
                    "no idea i'm afraid",
                    'it must be somewhere in the house',
                    "but i can't find it for the life of me",
                    "i've searched high and low"
                );
                await player.say('doesnt ceril get suspisous');
                await npc.say(
                    'that old fool',
                    "he can't can't see the forest for the tree's"
                );
            }
            break;
        case 6:
            await player.say('hello jones');
            await npc.say('have you managed to find the script?');
            if (player.inventory.has(SCRIPT_OF_HAZEEL_ID)) {
                await player.say('I have it here');
                await npc.say(
                    'incredible, we owe you a lot',
                    'you better get it back to our hideout as quick as you can',
                    'these our exciting times traveller',
                    'once the great hazeel returns',
                    'things are going to really change around here'
                );
            } else {
                await player.say("i'm afraid i've lost it");
                await npc.say(
                    'how could you be so foolish',
                    'the future of our people completly relys on that script',
                    'you better find it again quickly'
                );
            }
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello stranger');
                await npc.say('why hello there');
                await player.say("i take it you're the new butler");
                await npc.say(
                    "that's right",
                    'i think they had some problems with the last one'
                );
                await player.say('you could say that');
            } else if (isEvil(player)) {
                await player.say('hello jones');
                await npc.say(
                    "it's an honour to be in your presence again traveller",
                    'I hope things are well'
                );
                await player.say('not bad, yourself');
                await npc.say("i'm good thanks");
            }
            break;
    }
}

async function talkHenryeta(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
        case 1:
        case 2:
            await player.say('hello');
            await npc.say(
                'oh hello',
                'if you wish to look around the carnillean family home',
                'please refraine from touching anything',
                'with those grubby hands of yours'
            );
            break;
        case 3:
            await player.say('hello madam');
            if (isGood(player)) {
                await npc.say(
                    "i hope you've found those awful holigans",
                    "I can't sleep at night"
                );
                await player.say("i'm working on it madam");
                await npc.say(
                    "i don't know",
                    'there really are some strange folk around these parts'
                );
            } else if (isEvil(player)) {
                await npc.say(
                    'i hope you found those awful hooligans',
                    "I can't sleep at night"
                );
                await player.say("I'm afraid not");
                await npc.say('you really are useless');
                await player.say('thanks a lot');
            }
            break;
        case 4:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'oh, hello there adventurer',
                    'i hope you were careful dealing with those nasty men'
                );
                await player.say('i was fine, thanks');
            } else if (isEvil(player)) {
                await player.say('hello are you ok?');
                await npc.say(
                    "no i'm not ok",
                    'those animals slaughtered my precious scruffy',
                    "i'll never recover",
                    "i'm emotionaly scarred for life"
                );
                await player.say("i'm sorry to hear that");
                await npc.say(
                    "don't be sorry it's not your fault",
                    'just find those animals and punish them severely',
                    'before i get to them first'
                );
            }
            break;
        case 5:
        case 6:
            if (isGood(player)) {
                await player.say('hello henyeta');
                await npc.say(
                    "don't think you can accuse my trusted staff",
                    'then be friends with me'
                );
                await player.say('what i said about jones is true');
                await npc.say(
                    "don't be so ridiculous",
                    "next you'll tell me he murdered our old butler"
                );
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    "i'm sorry i'm too depressed to talk to you",
                    'poor scruffy...'
                );
                await player.say('yeah, poor scruffy!');
            }
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'hello again adventurer"',
                    'things really have picked up around here',
                    'since you dealt with those nasty cult members',
                    'good to hear'
                );
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    "i've been instructed by my husband not to talk to you",
                    'so go away and leave me alone'
                );
                await player.say('charming');
            }
            break;
    }
}

async function talkPhilipe(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
        case 1:
        case 2:
            await player.say('hello there');
            await npc.say('what have you brought me?', 'I want some more toys');
            await player.say("I'm afraid i don't have any");
            await npc.say('toys, i want toys');
            break;
        case 3:
            // both sides identical in OpenRSC
            await player.say('hello');
            await npc.say('i want more toys');
            await player.say("sorry i don't have any");
            await npc.say('i want sweets, gimme sweets');
            await player.say("no sorrry i don't have sweets either");
            await npc.say('i hate you, i want my mum');
            break;
        case 4:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'mommy said your here to',
                    'kill all the nasty men',
                    'that come into our house'
                );
                await player.say('something like that');
                await npc.say('can i watch?');
                await player.say('no');
            } else if (isEvil(player)) {
                await player.say('hello youngster');
                await mes(player, 'the boy looks very upset');
                await npc.say(
                    'someone killed scruffy',
                    'i liked scruffy',
                    'he never told me off'
                );
                await player.say("that's unfortunate");
                await npc.say('i want my mommy');
            }
            break;
        case 5:
            if (isGood(player)) {
                await player.say('hello youngster');
                await npc.say(
                    "daddy say's you dont like Jones",
                    'Jones is nice',
                    'he brings me toys and sweets'
                );
                await player.say('jones is a bad person philipe');
                await npc.say("you're a bad person", "i don't like you");
                await player.say('ok');
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    'mommy said your here to',
                    'kill all the nasty men',
                    'that come into our house'
                );
                await player.say('something like that');
                await npc.say('can i watch?');
                await player.say('no');
            }
            break;
        case 6:
            await player.say('hello youngster');
            await npc.say('why are you still here?');
            await player.say('just looking around');
            await npc.say('have you got me some toys?');
            await player.say('no');
            await npc.say("then i don't like you");
            await player.say("that's a shame");
            break;
        case -1:
            // both sides identical in OpenRSC
            await player.say('hello philipe');
            await npc.say('i want more toys');
            await player.say("sorry i don't have any");
            await npc.say('i want sweets, gimme sweets');
            await player.say("no sorrry", "I don't have any sweets either");
            await npc.say('i hate you,i want my mum');
            break;
    }
}

async function talkClaus(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
        case 1:
            await player.say('hello');
            await npc.say(
                "sorry i can't talk now",
                'you would be amazed how many',
                'meals this family can go through'
            );
            break;
        case 2:
            // OpenRSC: empty case
            break;
        case 3:
            await player.say('hello');
            await npc.say(
                "you're that chap they've asked to help get those nasty folk",
                'that keep breaking in'
            );
            await player.say("yep, that's me");
            await npc.say('well i wish the best of luck');
            break;
        case 4:
            if (isGood(player)) {
                await player.say('hello there');
                await npc.say('hello, how are you today');
                await player.say('not bad thanks');
                await npc.say('good good');
            } else if (isEvil(player)) {
                await npc.say('hello there', 'caught any thieves yet?');
                await player.say('afraid not');
                await npc.say('keep at it');
            }
            break;
        case 5:
            if (isEvil(player)) {
                await player.say('hello there');
                await npc.say(
                    "i don't understand it",
                    'how could someone slip poison in my cooking',
                    'without me even noticing',
                    "I'll be lucky if the carnilleans don't fire me",
                    'those animals how could they do it',
                    'poor scruffy'
                );
            } else if (isGood(player)) {
                await player.say('hello there');
                await npc.say('hello, how are you today');
                await player.say('not bad thanks');
                await npc.say('good good');
            }
            break;
        case 6:
            await player.say('hello there');
            await npc.say(
                'those animals how could they do it',
                'poor scruffy'
            );
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello cook');
                await npc.say(
                    'well hello there traveller',
                    'are we fit and well'
                );
                await player.say("yes i'm fine");
                await npc.say('good to hear');
            } else if (isEvil(player)) {
                await player.say('hello cook');
                await npc.say(
                    'get out of my kitchen',
                    "can't you tell your not welcome around here"
                );
            }
            break;
    }
}

async function talkGuard(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
        case 1:
        case 2:
            await player.say('hello');
            await npc.say(
                "hello,i haven't seen you before",
                "if you've come to look at the carnillean family home",
                'just make sure you behave yourself',
                "we've had enough wierdos causing trouble",
                'round here of late'
            );
            break;
        case 3:
            await player.say('hello');
            await npc.say(
                "hi i heard you're after the cult",
                'who broke in the other night',
                "blooming wierdo's"
            );
            break;
        case 4:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'hello brave adventurer',
                    'keep up the good work'
                );
            } else if (isEvil(player)) {
                await player.say('hello there');
                await npc.say(
                    'oh hello, did you hear?',
                    'the cult members have been back',
                    "I don't know what they've done",
                    'but ceril is really upset'
                );
            }
            break;
        case 5:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'hello adventurer',
                    "i heard you've accused butler jones",
                    'of being involved with the cult',
                    "that's right",
                    "to be honest i haven't",
                    'trusted him since he turned up here',
                    'a day after the old butler died',
                    'it seems too much of a coincidence to me'
                );
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    'hello adventurer',
                    "you're still hanging around then"
                );
            }
            break;
        case 6:
            await player.say('hello guard');
            await npc.say(
                'hello there',
                'i hope you find the cult soon',
                'we think there may have been another burglary'
            );
            await player.say("that's worrying");
            await npc.say(
                "i just don't know how they do it",
                "it seems like they're right under our noses"
            );
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    "well if it isn't our own local hero",
                    "it's good to see you in these parts again"
                );
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    'you again',
                    "didn't i tell you you're not welcome around here",
                    'now leave before we have to get rough with you'
                );
            }
            break;
    }
}

// clivet's learn-the-truth / choose-a-side conversation
async function clivetChooseSide(player, npc) {
    const menu = await player.ask(
        ['What do you mean?', "I've heard enough of your rubbish"],
        true
    );
    if (menu === 0) {
        await npc.say(
            'the carnillean family house does not belong to them',
            "it's original owner was lord hazeel",
            'hazeel was one of the mahjarrat followers of zamorak',
            'The carnilleans harassed hazeel and his family for decades',
            "then one night they stormed hazeel's home",
            'one by one they tortured and then butchered him and his family',
            'the next day the carnillean forefathers moved into the property',
            "they've lived there on hazeel's wealth ever since"
        );
        await player.say(
            'ardounge history and pollitics are not my concern',
            "i've been asked to do a job and i plan to carry it through"
        );
        await npc.say(
            "well now i'm asking you to do a job",
            'hazeel is going to return my friend',
            'those who aid his journey will gain rewards',
            "help us avenge hazeel's spirit so he may return"
        );
        const chooseSideMenu = await player.ask(
            ["You're crazy, i'd never help you", 'So what would i have to do?'],
            true
        );
        if (chooseSideMenu === 0) {
            // GOOD SIDE
            await npc.say(
                "then you're a fool",
                'go back to your adventures traveller'
            );
            await mes(player, 'clivet boards the raft and pushes of down the sewer system');
            player.world.removeEntity('npcs', npc);
            await mes(player, 'you hear him call out');
            await mes(player, "@yel@clivet:you'll never find us...");
            player.questStages[QUEST_KEY] = 3;
            player.cache.good_side = true;
        } else if (chooseSideMenu === 1) {
            // EVIL SIDE
            await npc.say(
                'first you must prove your loyalty to the cause',
                'you must kill one of the carnillean family members',
                "then we will know who's side you're really on",
                'so will you do it?'
            );
            const whichSideMenu = await player.ask(
                ["No i won't do it", "Ok i'll do it"],
                true
            );
            if (whichSideMenu === 0) {
                await npc.say(
                    "then you're a fool",
                    'go back to your adventures traveller'
                );
                await mes(player, 'clivet boards the raft and pushes of down the sewer system');
                player.world.removeEntity('npcs', npc);
                await mes(player, 'you hear him call out');
                await mes(player, "@yel@clivet:you'll never find us...");
                player.questStages[QUEST_KEY] = 3;
                player.cache.good_side = true;
            } else if (whichSideMenu === 1) {
                await npc.say(
                    'good, few see through the carnillean lies',
                    'but i guessed you were of stronger character',
                    'here take this poison, pour it into one of their meals',
                    'once the deed is done return here'
                );
                player.inventory.add(POISON_ID, 1);
                player.questStages[QUEST_KEY] = 3;
                player.cache.evil_side = true;
            }
        }
    } else if (menu === 1) {
        await npc.say('then leave, fool');
    }
}

async function talkClivet(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
            await player.say('hello there');
            await npc.say('what do you want traveller');
            await player.say('just passing by');
            await npc.say('you have no business here', 'leave...now');
            break;
        case 1:
            await player.say('do you know the carnilleans?');
            await npc.say("i'll mind my business you mind yours");
            await player.say(
                "look i know you're hiding something",
                "i've heard there's a cult hideout down here"
            );
            await npc.say("if you know what's best for you you'll leave now");
            await player.say('i have my orders');
            await npc.say(
                'so that two faced cold hearted snob has got to you too has he?'
            );
            await player.say('ceril carnillean is a decent man');
            await npc.say(
                "there's a lot more than meets the eye to the carnilleans",
                "and none of it's decent"
            );
            player.questStages[QUEST_KEY] = 2;
            await clivetChooseSide(player, npc);
            break;
        case 2:
            await player.say('hello');
            await npc.say(
                'so you\'ve returned"',
                'now do you want to know the truth about the carnilleans?'
            );
            await clivetChooseSide(player, npc);
            break;
        case 3:
            if (isGood(player)) {
                await player.say('hello there');
                await npc.say('oh not you again');
                await player.say('where is the cult hideout?');
                await npc.say(
                    "you're a fool if you think you'll ever find it",
                    "soon hazeel will return and you'll be punished"
                );
            } else if (isEvil(player)) {
                await player.say('hello there');
                await npc.say(
                    'traveller you have a mission',
                    'go to the carnillean house and poison their meal'
                );
            }
            break;
        case 4:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'You again! I warned you to keep away',
                    'hazeel will punish you for your interference'
                );
            } else if (isEvil(player)) {
                if (!player.inventory.has(MARK_OF_HAZEEL_ID)) {
                    await player.say(
                        'hello',
                        "I poured the poison into the carnillean's meal as requested"
                    );
                    await npc.say(
                        'yes we have people on the inside who informed me of your deed',
                        'hazeel will reward you for your loyalty'
                    );
                    await player.say("ok, so what's next?");
                    await npc.say('first you must wear the sign of hazeel');
                    await mes(player, 'clivet hands you a small metal amulet');
                    player.inventory.add(MARK_OF_HAZEEL_ID, 1);
                    await npc.say(
                        "the amulet is proof to other cult members that you're one of us",
                        'it is also the key to finding the cult hideout'
                    );
                    await player.say('in what way?');
                    await npc.say(
                        "the flow of the sewer's are controlled by 5 sewer valves above",
                        'turn them correctly and the sewer will carry you to the hideout',
                        'the sign of hazeel is your guide - you must begin at the tail',
                        'The cult leader alomone shall be expecting you'
                    );
                } else {
                    await player.say('hello');
                    await npc.say(
                        'hello traveller',
                        'have you found the cult hideout yet?'
                    );
                    await player.say('not yet im afraid');
                    await npc.say('hurry! soon hazeel will return');
                }
            }
            break;
        case 5:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'You again! I warned you to keep away',
                    'hazeel will punish you for your interference'
                );
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    'hello traveller',
                    'all we need now is the sacred script of hazeel',
                    'once we have that Hazeel can return'
                );
            }
            break;
        case 6:
            await player.say('hello again');
            await npc.say('have you managed to find the script of hazeel?');
            if (player.inventory.has(SCRIPT_OF_HAZEEL_ID)) {
                await player.say('yes, i found it in the house');
                await npc.say(
                    'amazing, the last piece',
                    'now the time has come to change history and avenge lord hazeel',
                    'take the script to alomone as quick as you can'
                );
            } else {
                await player.say('errm, no, i misplaced it');
                await npc.say(
                    "go to the house and don't return until you have the script"
                );
            }
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'You again! I warned you to keep away',
                    'bother someone else',
                    'go find some goblins to hack up'
                );
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    "It's good to see you again",
                    'i am patiently waiting for for hazeel to call upon me'
                );
            }
            break;
    }
}

async function talkCultMember(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
        case 1:
        case 2:
            await player.say('hello');
            await npc.say(
                'what how did you get in here?',
                'leave now traveller'
            );
            break;
        case 3:
            if (isGood(player)) {
                await player.say('hello there');
                await npc.say(
                    'what, how did you get in here',
                    'leave now traveller'
                );
                player.disengage();
                await npc.attack(player);
                return;
            } else if (isEvil(player)) {
                await player.say('hello there');
                await npc.say(
                    "can't you see i'm busy",
                    'the great hazeel shall return soon'
                );
            }
            break;
        case 4:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'what, an outsider',
                    'how did you get in here',
                    'you must leave, now'
                );
                player.disengage();
                await npc.attack(player);
                return;
            } else if (isEvil(player)) {
                await player.say('hi');
                await npc.say('hello, oh, are you new');
                await player.say("that's right");
                await npc.say(
                    "well it's good to have you on board",
                    'soon we should retrieved the sacred hazeel script',
                    'then at last we can bring are lord back from the dead'
                );
            }
            break;
        case 5:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'what, an outsider',
                    'how did you get in here',
                    'you must leave, now'
                );
                player.disengage();
                await npc.attack(player);
                return;
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    'hello there',
                    'untill we have the hazeel script',
                    'we cannot summon our master'
                );
            }
            break;
        case 6:
            await player.say('hello');
            await npc.say(
                'you truly are our savior',
                'you found the script of hazeel',
                'now his injustice can be resolved'
            );
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'An outsider!',
                    'how did you get in here?',
                    'leave now fool or die'
                );
                player.disengage();
                await npc.attack(player);
                return;
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say(
                    'the traveller returns',
                    'we are forever in your dept brave adventurer',
                    'i bow before you'
                );
            }
            break;
    }
}

async function talkAlomone(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case 0:
        case undefined:
        case 1:
        case 2: {
            await player.say('hello');
            await npc.say('what, an intruder', 'kill him');
            const cults = nearbyNpc(player, CULT_MEMBER_ID, 20);
            if (cults) {
                cults.attack(player);
            }
            break;
        }
        case 3:
            if (isGood(player)) {
                await npc.say('How did get you get in here?');
                await player.say("I've come for the carnillean family armour");
                await npc.say(
                    'I thought I told the butler to get rid of you',
                    'he must be going soft'
                );
                await player.say(
                    'so the butler is working for you too?',
                    "Why's it always the Butler? I should have guessed"
                );
                await player.world.sleepTicks(3);
                player.disengage();
                await npc.attack(player);
                return;
            } else if (isEvil(player)) {
                await player.say('hello');
                await npc.say("Can't you see I'm busy?");
            }
            break;
        case 4:
            if (isGood(player)) {
                await player.say('hello alomone');
                await npc.say(
                    'out of my way',
                    "can't you see we're busy here?"
                );
                player.disengage();
                await npc.attack(player);
                return;
            } else if (isEvil(player)) {
                await player.say('hi there');
                await npc.say(
                    'well well, we have a new recruit',
                    'Clivet told me about your willingness to prove yourself',
                    'we must retrieve the sacred script of hazeel',
                    'From the Carnillean house',
                    "an ancient spell which if read over Hazeel's grave",
                    'will bring him back to this world',
                    "the Carnilleans aren't aware of it's existence",
                    'we have eyes in the house',
                    'Butler Jones is one of us',
                    'go back to the house and try to find the script'
                );
                player.questStages[QUEST_KEY] = 5;
            }
            break;
        case 5:
            if (isGood(player)) {
                await player.say('hello');
                await npc.say(
                    'out of my way',
                    "can't you see we're busy here?"
                );
            } else if (isEvil(player)) {
                await player.say('hello alomone');
                await npc.say(
                    'hazeel has waited long enough traveller',
                    'the sooner you find the hazeel script the better'
                );
            }
            break;
        case 6:
            // COMPLETE EVIL SIDE
            await player.say('hello');
            await npc.say('Do you have the sacred script of hazeel?');
            if (player.inventory.has(SCRIPT_OF_HAZEEL_ID)) {
                await player.say('yes I have it here');
                await npc.say('finally our lord hazeel can return');
                await mes(player, 'alomone takes the hazeel script');
                player.inventory.remove(SCRIPT_OF_HAZEEL_ID);
                await npc.say(
                    'with these words our lord will return and save us all',
                    'come with me adventurer and let the ceromony begin'
                );
                player.teleport(580, 3419);
                if (npc.teleport) {
                    npc.teleport(580, 3419);
                }
                await npc.say(
                    'I do this for you lord hazeel and all followers of zamorak'
                );
                await mes(player, 'alomone kneels down infront of the shrine');
                await mes(player, 'he begins to read the script');
                player.message('the language is something you have never heard');
                await mes(player, 'alomone reads on');
                await mes(player, 'Alomone finishes the script');
                await mes(player, 'the room is silent');
                await mes(player, 'suddenly a shrill scream comes from the coffin of hazeel');
                await mes(player, 'A shadowy figure appears');

                const lordHazeel = spawnLordHazeel(player);

                await mes(player, 'the cult begin to chant');
                player.engage(lordHazeel);
                await lordHazeel.say(
                    'my followers i am proud of you all',
                    'I never expected to retun to these lands',
                    'I can see I have much to attend to',
                    'In due time you will all be rewarded for your part',
                    'brave adventurer, i believe your contribution was the most critical',
                    'i owe you much, you may not be a follower of the great zamorak',
                    'but you understand injustice and anger',
                    'for this I certainly shall call upon your help in the future',
                    'my people gain strength day to day',
                    'you would be wise to join us while you can'
                );
                await player.say('I fight for myself');
                await lordHazeel.say(
                    'hmm, fair enough for now',
                    'I shall reward you with money',
                    "But your reward of Zamorak's approval is far greater"
                );

                // OpenRSC sendQuestComplete -> handleReward (evil branch)
                grantReward(player);

                await lordHazeel.say(
                    'now i must leave you',
                    'i have much business to attend to with my brothers in the north',
                    'i will see you all again but be aware',
                    'soon much blood will be spilt over runescape'
                );
                player.disengage();
                player.world.removeEntity('npcs', lordHazeel);
            } else {
                await player.say("i'm afraid not");
                await npc.say('we need the script if hazeel is to return');
            }
            break;
        case -1:
            if (isGood(player)) {
                await player.say('hello again');
                await npc.say(
                    'leave here now intruder',
                    'before i loose my patience'
                );
            } else if (isEvil(player)) {
                await player.say('hello again');
                await npc.say("we wait patiently for lord hazeel's calling");
                await player.say('ok, take care');
            }
            break;
    }
}

function spawnLordHazeel(player) {
    const { world } = player;

    const lordHazeel = new NPC(world, {
        id: LORD_HAZEEL_ID,
        x: 580,
        y: 3420,
        minX: 579,
        maxX: 581,
        minY: 3419,
        maxY: 3421
    });

    delete lordHazeel.respawn;

    // spawns for 120s as a safety net; dialogue removes him when finished
    world.setTickTimeout(() => {
        world.removeEntity('npcs', lordHazeel);
    }, 200);

    world.addEntity('npcs', lordHazeel);

    if (lordHazeel.displayNpcTeleportBubble) {
        lordHazeel.displayNpcTeleportBubble(lordHazeel.x, lordHazeel.y);
    }

    return lordHazeel;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!QUEST_NPCS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    switch (npc.id) {
        case CERIL_ID:
            await talkCeril(player, npc);
            break;
        case BUTLER_ID:
            await talkButler(player, npc);
            break;
        case HENRYETA_ID:
            await talkHenryeta(player, npc);
            break;
        case PHILIPE_ID:
            await talkPhilipe(player, npc);
            break;
        case CLAUS_ID:
            await talkClaus(player, npc);
            break;
        case CARNILLEAN_GUARD_ID:
            await talkGuard(player, npc);
            break;
        case CLIVET_ID:
            await talkClivet(player, npc);
            break;
        case CULT_MEMBER_ID:
            await talkCultMember(player, npc);
            break;
        case ALOMONE_ID:
            await talkAlomone(player, npc);
            break;
    }

    player.disengage();
    return true;
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== ALOMONE_ID) {
        return false;
    }

    if (isGood(player)) {
        if (!player.inventory.has(CARNILLEAN_ARMOUR_ID)) {
            await mes(player, 'you have killed alomone');
            await mes(player, 'lying behind his corpse');
            await mes(player, 'you see the carnillean family armour');
            await mes(player, 'you place it in your bag');
            player.inventory.add(CARNILLEAN_ARMOUR_ID, 1);
            if (player.questStages[QUEST_KEY] === 3) {
                player.questStages[QUEST_KEY] = 4;
            }
        }
    }

    return true;
}


// good side: searching butler jones' cupboard at stage 5 exposes him and completes the quest
async function searchButlersCupboard(player) {
    await mes(player, 'you search the cupboard');

    if (player.questStages[QUEST_KEY] === 5 && isGood(player)) {
        await mes(player, 'you find a bottle of poison');
        await mes(player, 'and a strange amulet');

        const ceril = nearbyNpc(player, CERIL_ID, 10);
        if (ceril) {
            await mes(player, 'you pass your finds to ceril');
            await player.say("look what i've found?");
            await ceril.say("what's this for jones?");
            await mes(player, 'ceril takes the bottle');
            await ceril.say("i don't believe it, it's poison");

            const butler = nearbyNpc(player, BUTLER_ID, 10);
            if (butler) {
                await butler.say(
                    "mr carnillean, it's for the rats",
                    "i'm just a loyal servent"
                );
            }
            await ceril.say(
                "i've seen this amulet before",
                'the thieves that broke in',
                'one of them  was wearing exactly the same amulet',
                "jones i don't believe it",
                'we trusted you'
            );
            if (butler) {
                await butler.say(
                    "that's because you're an old fool ceril",
                    'I should have got rid of you and your family weeks ago'
                );
            }
            await mes(player, 'ceril calls for the guards');
            if (butler) {
                await butler.say(
                    "don't worry ceril",
                    "we'll make sure you and your family pay"
                );
            }
            await ceril.say('looks like i owe you an apology traveller');
            await player.say("that's ok, we all make mistakes");
            await ceril.say(
                "if it wasn't for you he could have poisoned my whole family",
                "i'm sorry for the way i spoke to you",
                'the least i can do is give you a proper reward'
            );

            // OpenRSC sendQuestComplete -> handleReward (good branch)
            grantReward(player);

            await player.say('thanks ceril');
            await ceril.say(
                "thankyou, you're welcome here any time traveller"
            );
        }
    } else {
        await mes(player, 'but find nothing');
    }
}

async function searchBasementCrate(player) {
    await mes(player, 'you search the crate');

    if (player.questStages[QUEST_KEY] === 5 && isEvil(player)) {
        if (!player.inventory.has(CARNILLEAN_KEY_ID)) {
            player.message('under the food packages');
            player.message('you find an old rusty key');
            player.inventory.add(CARNILLEAN_KEY_ID, 1);
        } else {
            player.message('but find nothing');
        }
    } else {
        player.message('but find nothing');
    }
}

async function searchBookcase(player) {
    await mes(player, 'you search the book case');

    if (player.questStages[QUEST_KEY] === 5 && isEvil(player)) {
        await mes(player, 'as you pull out one of the books');
        await mes(player, 'the shelves slide to the side');
        await mes(player, 'revealing a secret passage');
        await mes(player, 'you walk through');
        player.teleport(614, 2504);
        await mes(player, 'the passage leads upwards');
        await mes(player, 'to an empty room');
    } else {
        player.message('but find nothing interesting');
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (gameObject.id) {
        case BUTLERS_CUPBOARD_ID:
            await searchButlersCupboard(player);
            return true;
        case BASEMENT_CRATE_ID:
            await searchBasementCrate(player);
            return true;
        case TOP_LEVEL_BOOKCASE_ID:
            await searchBookcase(player);
            return true;
        case CARNILLEAN_CHEST_ID:
            player.message('the chest is locked');
            return true;
    }

    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    // the carnillean chest's search option treats the same as the primary locked behaviour
    if (gameObject.id === CARNILLEAN_CHEST_ID) {
        player.message('the chest is locked');
        return true;
    }

    return false;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        gameObject.id === CARNILLEAN_CHEST_ID &&
        item.id === CARNILLEAN_KEY_ID
    ) {
        player.message('you use the key to open');
        player.message('the chest');
        player.message('inside the chest you find the sacred script of hazeel');
        player.inventory.add(SCRIPT_OF_HAZEEL_ID, 1);
        if (player.questStages[QUEST_KEY] === 5) {
            player.questStages[QUEST_KEY] = 6;
        }
        return true;
    }

    return false;
}

// use poison on a carnillean family member to advance stage 3 -> 4
const POISONABLE_FAMILY = new Set([PHILIPE_ID, CERIL_ID, HENRYETA_ID]);

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id !== POISON_ID) {
        return false;
    }

    if (!POISONABLE_FAMILY.has(npc.id)) {
        return false;
    }

    if (
        player.questStages[QUEST_KEY] === 3 &&
        isEvil(player) &&
        player.inventory.has(POISON_ID)
    ) {
        player.message('you pour the poison into the meal');
        player.inventory.remove(POISON_ID);
        player.questStages[QUEST_KEY] = 4;
        player.message('the deed is done, you should return to clivet');
        return true;
    }

    return false;
}

module.exports = {
    onTalkToNPC,
    onNPCDeath,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onUseWithNPC
};
