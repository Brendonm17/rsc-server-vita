// mourner npcs for plague city and biohazard: guards react to quest stage,
// 445/head mourner share a menu, and the biohazard mourners react to its state

const Quests = { PLAGUE_CITY: 'plagueCity', BIOHAZARD: 'biohazard' };

const ItemId = { DOCTORS_GOWN: 802 };

const NpcId = {
    MOURNER_444: 444,
    MOURNER_491: 491,
    MOURNER_451: 451,
    MOURNER_445: 445,
    HEAD_MOURNER: 469,
    DOOR_MOURNER: 492,
    ATTACK_MOURNER: 502,
    ILL_MOURNER: 495
};

const MOURNER_IDS = new Set(Object.values(NpcId));

function plagueCityStage(player) {
    return player.questStages[Quests.PLAGUE_CITY] || 0;
}

function biohazardStage(player) {
    return player.questStages[Quests.BIOHAZARD] || 0;
}

// shared menu for mourner 445 and the head mourner
async function headMournerDialogue(player, npc, chosenOption) {
    if (chosenOption === 0) {
        await player.say('I need clearance to enter a plague house');
        await player.say("It's in the southeast corner of west ardougne");
        await npc.say('You must be nuts, absolutely not');

        const submenu = await player.ask(
            [
                "There's a kidnap victim inside",
                "I've got a gasmask though",
                "Yes I'm utterly crazy"
            ],
            true
        );

        if (submenu === 0) {
            await npc.say(
                "Well they're as good as dead already then",
                'No point trying to save them'
            );
        } else if (submenu === 1) {
            await npc.say(
                "It's not regulation",
                'Anyway you\'re not properly trained to deal with the plague'
            );
            await player.say('How do I get trained');
            await npc.say('It requires a strict 18 months of training');
            await player.say("I don't have that sort of time");
        } else if (submenu === 2) {
            await npc.say('You waste my time', 'I have much work to do');
        }
    } else if (chosenOption === 1) {
        await player.say("So what's a mourner?");
        await npc.say(
            'We\'re working for King Luthas of East ardougne',
            'Trying to contain the accursed plague sweeping west Ardougne',
            'We also do our best to ease these peoples suffering',
            "We're nicknamed mourners",
            'because we spend a lot of time at plague victims funerals',
            'no one else is allowed to risk the funerals',
            "It's a demanding job",
            'And we get little thanks from the people here'
        );
    } else if (chosenOption === 2) {
        await player.say("I've not got the plague though");
        await npc.say(
            "Can't risk you being a carrier",
            'that protective clothing you have',
            "isn't regulation issue",
            "It won't meet safety standards"
        );
    } else if (chosenOption === 3) {
        await player.say("I'm looking for a woman named Elena");
        await npc.say(
            'ah yes I\'ve heard of her',
            'A missionary I believe',
            'She must be mad coming over here voluntarily',
            'I hear rumours she has probably caught the plague now',
            'Very tragic stupid waste of life'
        );
    }
}

// shared "plague origin / symptoms / <varies>" menu for mourner 451. handles
// options 0 and 1, returns the chosen index for the caller's third option
async function plagueOriginAndSymptoms(player, npc, thirdOption, sendOver) {
    const menu = await player.ask(
        [
            'What brought the plague to ardougne?',
            'What are the symptoms of the plague?',
            thirdOption
        ],
        sendOver
    );

    if (menu === 0) {
        await player.say('what brought the plague to ardougne?');
        await npc.say(
            "it's all down to king tyras of west ardougne",
            'rather than protecting his people',
            'he spends his time in the lands to the west',
            'when he returned last he brought the plague with him',
            'then left before the problem became serious'
        );
        await player.say('does he know how bad the situation is now?');
        await npc.say(
            "if he did he wouldn't care",
            'i believe he wants his people to suffer',
            "he's an evil man"
        );
        await player.say("isn't that treason?");
        await npc.say("he's not my king");
    } else if (menu === 1) {
        await player.say('what are the symptoms of the plague?');
        await npc.say(
            'the first signs are typical flu symptoms',
            'these tend to be followed by severe nightmares',
            'horrifying hallucinations which drive many to madness'
        );
        await player.say('sounds nasty');
        await npc.say(
            'it gets worse',
            'next the victims blood supply changes into a thick black tar like liquid',
            "at this point they're past help",
            'their skin is cold to the touch',
            'the victim is now brain dead',
            'their body however lives on driven by the virus',
            'roaming like a zombie',
            'spreading itself further wherever possible'
        );
        await player.say("I think I've heard enough");
    }

    return menu;
}

async function talkToMourner444(player, npc) {
    switch (plagueCityStage(player)) {
        case 0:
            await player.say('hello there');
            await npc.say('Do you a have problem traveller?');
            await player.say(
                "no i just wondered why your wearing that outfit",
                'is it fancy dress?'
            );
            await npc.say("no it's for protection");
            await player.say('protection from what');
            await npc.say('the plague of course');
            break;

        case 1: {
            await player.say('hello');
            await npc.say('what do you want?');
            const menu = await player.ask(
                ['who are you?', 'nothing just being polite'],
                true
            );
            if (menu === 0) {
                await npc.say(
                    "I'm a mourner",
                    "it's my job to help heal the plague victims of west ardougne",
                    'and to make sure the disease is contained'
                );
                await player.say('who pays you?');
                await npc.say(
                    "we feel as the kings henchmen it's our duty to help the people of ardougne"
                );
                await player.say('very noble of you');
                await npc.say(
                    'if you come down with any symptoms such as a flu or nightmares',
                    'let me know immediately'
                );
            } else if (menu === 1) {
                await npc.say('hmm ok then', 'be on your way');
            }
            break;
        }

        case 2:
            if (player.cache.soil_soften) {
                await player.say('hello');
                await npc.say('what are you up to with old man Edmond?');
                await player.say('nothing, we\'ve just been chatting');
                await npc.say('what about, his daughter?');
                await player.say('oh, you know about that then');
                await npc.say(
                    'we know about everything that goes on in ardougne',
                    'we have to if we are to contain the plague'
                );
                await player.say('have you seen his daughter recently');
                await npc.say(
                    "i imagine she's caught the plague",
                    "either way she won't be allowed out of west Ardougne",
                    'The risk is to great'
                );
                break;
            }
            await player.say('hello');
            await npc.say('are you ok');
            await player.say('yes I\'m fine thanks');
            await npc.say('have you experienced any plague symptoms?');
            {
                const menuOpt = await player.ask(
                    [
                        'What are the symptoms?',
                        'No i feel fine',
                        'No, but tell me where did the plague come from?'
                    ],
                    false
                );
                if (menuOpt === 0) {
                    await player.say('What are the symptoms?');
                    await npc.say(
                        "firstly you'll come down with a heavy flu",
                        'this is usually followed by horrifying nightmares'
                    );
                    await player.say('i used to have nightmares when i was younger');
                    await npc.say(
                        'not like these i assure you',
                        'soon after a thick black liquid will seep from your nose and eyes'
                    );
                    await player.say('yuck!');
                    await npc.say(
                        "when it get's to this stage there's nothing we can do for you"
                    );
                } else if (menuOpt === 1) {
                    await player.say('no i feel fine');
                    await npc.say(
                        'well if you take a turn for the worse let me know straight away'
                    );
                    await player.say('can you cure it then?');
                    await npc.say('no', 'but you will have to be treated');
                    await player.say('treated?');
                    await npc.say(
                        'we have to take measures to contain the disease',
                        "that's why you must let us know immediately if you take a turn for the worst"
                    );
                } else if (menuOpt === 2) {
                    await player.say('no, but tell me where did the plague come from');
                    await npc.say(
                        'many put it down to the low living standards of the west ardougnians',
                        'however this is not the case',
                        'the truth is the king Tyras of west ardougne',
                        'unknowingly brought the plague into his kingdom',
                        'when returning from one of his visits to the darklands in the north west'
                    );
                }
            }
            break;

        case 3:
            await player.say('hello there');
            await npc.say('been digging have we?');
            await player.say('what do you mean!');
            await npc.say('your hands are covered in mud');
            await player.say('oh that', "I've just been helping Edmond with his allotment");
            await npc.say("funny, you don't look like the gardening type");
            await player.say('oh no, i love gardening', "it's my favourite pass time");
            break;

        case 4:
            await player.say('hello there');
            await npc.say('what are you up to?');
            await player.say('what do you mean?');
            await npc.say(
                'you and that Edmond fella',
                "you're looking very suspicious"
            );
            await player.say(
                "we're just gardening",
                'have you heard any news about west ardougne?'
            );
            await npc.say(
                'just the usual',
                "everyone's sick or dying",
                "I'm furious at king tyras for bringing this plague to our lands"
            );
            break;

        default: // case 5..11, -1
            await player.say('hello');
            await npc.say('what are you up to?');
            await player.say('nothing');
            await npc.say("i don't trust you");
            await player.say("you don't have to");
            await npc.say(
                'if i find that you attempting to cross the wall',
                "I'll make sure you never return"
            );
            break;
    }
}

async function talkToMourner451(player, npc) {
    const stage = plagueCityStage(player);

    if (stage === 0 || stage === 1) {
        await player.say('hello there');
        await npc.say('can I help you?');
        await player.say('what are you doing?');
        await npc.say(
            "I'm guarding the border to west ardougne",
            'no one except us mourners can pass through'
        );
        await player.say('why?');
        await npc.say('the plague of course', "we can't risk cross contamination");

        const menu = await plagueOriginAndSymptoms(
            player,
            npc,
            'Ok then see you around',
            false
        );
        if (menu === 2) {
            await player.say('ok then see you around');
            await npc.say('maybe');
        }
    } else if (stage === 2) {
        await player.say('hello there');
        await npc.say('can i help you?');
        await player.say('just being polite');
        await npc.say(
            "I'm not here to chat",
            'sorry, what is it you do?',
            'i protect people like you from the plague'
        );
        await player.say('how?');
        await npc.say('by making sure no one crosses the wall');
        await player.say('what if they do');
        await npc.say('then they must be treated immediately');
        await player.say('treated?');
        await npc.say(
            'any west ardougnians which cross the wall',
            'must be detained and disposed of safely'
        );
        await player.say("sound's like nasty work");
        await npc.say('some find it hard', 'personally i quite enjoy it');

        const menu = await plagueOriginAndSymptoms(
            player,
            npc,
            "you're a very sick man",
            false
        );
        if (menu === 2) {
            await player.say("you're a very sick man");
            await npc.say("What? I'm pretty sure I haven't caught the plague yet");
        }
    } else if (stage === 3) {
        await player.say('hello');
        await npc.say('what do you want');
        await player.say('so how did you get into this line of work?');
        await npc.say(
            "as king lanthas's henchmen",
            'it is our duty to protect his people'
        );
        await player.say('i thought that was the job of the paladins');
        await npc.say('their swords and armour have no effect on the plague');

        const menu = await plagueOriginAndSymptoms(
            player,
            npc,
            'well keep up the good work',
            false
        );
        if (menu === 2) {
            await player.say('well keep up the good work');
            await npc.say('will do');
        }
    } else {
        // case 4..11, -1
        await player.say('hi');
        await npc.say('what are you up to?');
        await player.say('just sight seeing');
        await npc.say(
            'this is no place for sight seeing',
            "don't you know there's been a plague outbreak?"
        );
        await player.say('yes i had heard');
        await npc.say('then i suggest you leave as soon as you can');

        const menu = await plagueOriginAndSymptoms(
            player,
            npc,
            'thanks for the advice',
            false
        );
        if (menu === 2) {
            await player.say('thanks for the advice');
        }
    }
}

async function talkToInnerWallMourner(player, npc) {
    if (npc.id === NpcId.HEAD_MOURNER) {
        await npc.say(
            'How did you did get into West Ardougne?',
            "Ah well you'll have to stay",
            "Can't risk you spreading the plague outside"
        );
    } else {
        await npc.say(
            'hmm how did you did get over here?',
            "You're not one of this rabble",
            "Ah well you'll have to stay",
            "Can't risk you going back now"
        );
    }

    const options = [];
    const stage = plagueCityStage(player);

    if (stage >= 9 && npc.id === NpcId.HEAD_MOURNER) {
        options.push('I need clearance to enter a plague house');
    }
    options.push("so what's a mourner?");
    options.push("I've not got the plague though");
    if (stage >= 0) {
        options.push("I'm looking for a woman named Elena");
    }

    const menu = await player.ask(options, false);

    if (stage >= 9 && npc.id === NpcId.HEAD_MOURNER) {
        await headMournerDialogue(player, npc, menu);
    } else if (menu >= 0) {
        await headMournerDialogue(player, npc, menu + 1);
    }
}

async function talkToDoorMourner(player, npc) {
    if (player.cache.rotten_apples) {
        await player.say('hello there');
        await npc.say('oh dear oh dear', 'i feel terrible, i think it was the stew');
        await player.say('you should be more careful with your ingredients');

        if (!player.inventory.isEquipped(ItemId.DOCTORS_GOWN)) {
            await npc.say(
                'i need a doctor',
                "the nurses' hut is to the south west",
                "go now and bring us a doctor, that's an order"
            );
        } else {
            await npc.say(
                "there is one mourner who's really sick resting upstairs",
                'you should see to him first'
            );
            await player.say("ok i'll see what i can do");
        }
    } else if (biohazardStage(player) !== 0) {
        await player.say('hello', 'are these the mourner quarters?');
        await npc.say('yes, why?, what do you want?');
        await player.say('i need to go inside');
        await npc.say("they'll be busy feasting all day");
        await player.say('really, even with the food shortages in west ardounge');
        await npc.say("we've no food shortage, just the civilians");

        const menu = await player.ask(
            [
                'can i join the feast?',
                'you should be ashamed of yourself',
                'well, enjoy your meal'
            ],
            true
        );

        if (menu === 0) {
            await npc.say("don't be so obsurd");
            await player.say('but why not?');
            await npc.say("because i don't like your face");
        } else if (menu === 1) {
            await player.say(
                'there are families here starving, you should be protecting them'
            );
            await npc.say(
                'that sounds like a lot of hard work',
                "i tell you what, i'll give it some consideration while i'm enjoying my stew"
            );
        } else if (menu === 2) {
            await npc.say(
                'we will, oh and if you get hungry...',
                '..there are some rotten apples around the corner - help yourself!'
            );
        }
    } else {
        player.message("the mourner doesn't feel like talking");
    }
}

async function talkToAttackMourner(player, npc) {
    if (!player.inventory.isEquipped(ItemId.DOCTORS_GOWN)) {
        await npc.say('how did you get in here?', 'this is a restricted area');
        await npc.attack(player);
    } else {
        await player.say('hello');
        await npc.say('hello doc, i feel terrible', 'i think it was the stew');
        await player.say('be more careful with your ingredients next time');
    }
}

async function talkToIllMourner(player, npc) {
    if (biohazardStage(player) > 4) {
        player.message('@que@the mourner is sick');
        await player.world.sleepTicks(3);
        player.message("@que@he doesn't feel like talking");
        await player.world.sleepTicks(3);
        return;
    }

    await player.say('hello there');
    await npc.say(
        "you're here at last",
        "i don't know what i've eaten",
        "but i feel like i'm on death's door"
    );
    await player.say('hmm... interesting, sounds like food poisoning');
    await npc.say(
        "yes, i'd figured that out already",
        'what can you give me to help'
    );

    const menu = await player.ask(
        [
            'just hold your breath and count to ten',
            'the best i can do is pray for you',
            "there's nothing i can do, it's fatal"
        ],
        true
    );

    if (menu === 0) {
        await npc.say(
            'what, how will that help?',
            'what kind of doctor are you?'
        );
        await player.say("erm .. i'm new, i just started");
        await npc.say("you're no doctor");
        player.disengage();
        await npc.attack(player);
        return;
    } else if (menu === 1) {
        await npc.say('prey for me?', "you're no doctor", 'an impostor');
        player.disengage();
        await npc.attack(player);
        return;
    } else if (menu === 2) {
        await npc.say(
            "no, i'm too young to die",
            "i've never even had a girlfriend"
        );
        await player.say("that's life for you");
        await npc.say("wait a minute, where's your equipment?");
        await player.say("it's..erm , at home");
        await npc.say("you're no doctor");
        player.disengage();
        await npc.attack(player);
        return;
    }
}

async function onTalkToNPC(player, npc) {
    if (!MOURNER_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    if (npc.id === NpcId.MOURNER_444) {
        await talkToMourner444(player, npc);
    } else if (npc.id === NpcId.MOURNER_451) {
        await talkToMourner451(player, npc);
    } else if (npc.id === NpcId.MOURNER_445 || npc.id === NpcId.HEAD_MOURNER) {
        await talkToInnerWallMourner(player, npc);
    } else if (npc.id === NpcId.DOOR_MOURNER) {
        await talkToDoorMourner(player, npc);
    } else if (npc.id === NpcId.ATTACK_MOURNER) {
        await talkToAttackMourner(player, npc);
    } else if (npc.id === NpcId.ILL_MOURNER) {
        await talkToIllMourner(player, npc);
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
