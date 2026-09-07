// murder mystery (members) quest.
// one of six sinclair children (cache flag murder_<name>) killed lord sinclair.
// gather three proofs: thread (window), evidence (their poison lie), culprit
// (fingerprint off the silver dagger). all three -> 3 qp, 1406 crafting xp, 2000 coins.
// stages (questStages.murderMystery): 0 not started, 1 investigating, -1 done.
// cache flags: murder_<name>, poison_opt, poison_opt2, thread/evidence/culprit, p_<name>, p_<name>2.

const { questsEnabled } = require('../../custom-gate.js');
const {
    GUARD_SINCLAIR_MANSION,
    MAN_SINCLAIR_MANSION,
    POISON_SALESMAN,
    ANNA_SINCLAIR,
    BOB_SINCLAIR,
    CAROL_SINCLAIR,
    DAVID_SINCLAIR,
    ELIZABETH_SINCLAIR,
    FRANK_SINCLAIR,
    DONOVAN_THE_HANDYMAN,
    PIERRE_THE_DOG_HANDLER,
    HOBBES_THE_BUTLER,
    LOUISA_THE_COOK,
    MARY_THE_MAID,
    STANFORD_THE_GARDENER,
    POT,
    POT_OF_FLOUR,
    COINS,
    THREAD_RED,
    THREAD_GREEN,
    THREAD_BLUE,
    FLYPAPER,
    MURDER_SCENE_POT,
    A_SILVER_DAGGER,
    MURDERERS_FINGERPRINT,
    ANNAS_FINGERPRINT,
    BOBS_FINGERPRINT,
    CAROLS_FINGERPRINT,
    DAVIDS_FINGERPRINT,
    ELIZABETHS_FINGERPRINT,
    FRANKS_FINGERPRINT,
    UNIDENTIFIED_FINGERPRINT,
    ANNAS_SILVER_NECKLACE,
    BOBS_SILVER_TEACUP,
    CAROLS_SILVER_BOTTLE,
    DAVIDS_SILVER_BOOK,
    ELIZABETHS_SILVER_NEEDLE,
    FRANKS_SILVER_POT,
    ANNAS_SILVER_NECKLACE_FLOUR,
    BOBS_SILVER_TEACUP_FLOUR,
    CAROLS_SILVER_BOTTLE_FLOUR,
    DAVIDS_SILVER_BOOK_FLOUR,
    ELIZABETHS_SILVER_NEEDLE_FLOUR,
    FRANKS_SILVER_POT_FLOUR,
    A_SILVER_DAGGER_FLOUR,
    WINDOW_ID,
    COMPOST_HEAP,
    BEEHIVE,
    DRAIN,
    SPIDER_WEB,
    FOUNTAIN,
    SINCLAIR_CREST,
    BARREL_ANNA,
    BARREL_BOB,
    BARREL_CAROL,
    BARREL_DAVID,
    BARREL_ELIZABETH,
    BARREL_FRANK,
    FLOUR_BARREL,
    SACKS,
    GATE_TO_DOG
} = require('./ids.js');

const SINCLAIR_IDS = [
    ANNA_SINCLAIR,
    BOB_SINCLAIR,
    CAROL_SINCLAIR,
    DAVID_SINCLAIR,
    ELIZABETH_SINCLAIR,
    FRANK_SINCLAIR
];

const OTHER_NPC_IDS = [
    HOBBES_THE_BUTLER,
    LOUISA_THE_COOK,
    STANFORD_THE_GARDENER,
    PIERRE_THE_DOG_HANDLER,
    DONOVAN_THE_HANDYMAN,
    MARY_THE_MAID
];

// cache helpers matching OpenRSC getCache().hasKey/store/remove
function has(player, key) {
    return player.cache.hasOwnProperty(key);
}

function store(player, key) {
    player.cache[key] = true;
}

function remove(player, ...keys) {
    for (const key of keys) {
        delete player.cache[key];
    }
}

// suspect dialogue (sinclair family)

async function sinclairSuspectDialogue(player, npc) {
    const n = npc.id;

    await player.say("I'm here to help the guards with their investigation");

    if (n === CAROL_SINCLAIR) {
        await npc.say('Well, ask what you want to know then');
    } else if (n === ELIZABETH_SINCLAIR) {
        await npc.say(
            "What's so important you need to bother me with then?"
        );
    } else if (n === ANNA_SINCLAIR) {
        await npc.say('Oh really? what do you want to know then?');
    } else if (n === FRANK_SINCLAIR) {
        await npc.say(
            'Good for you. Now what do you want?',
            "And can you spare me any money? I'm a little short..."
        );
    } else if (n === BOB_SINCLAIR) {
        await npc.say('I suppose I had better talk to you then.');
    } else if (n === DAVID_SINCLAIR) {
        await npc.say(
            'And? Make this quick, I have better things to',
            'do than be interrogated by halfwits all day'
        );
    }

    let menu;
    if (has(player, 'poison_opt') && has(player, 'thread')) {
        menu = await player.ask(
            [
                'Who do you think was responsible?',
                'Where were you when the murder happened?',
                'Do you recognise this thread?',
                'Why did you buy poison the other day?'
            ],
            true
        );
    } else if (has(player, 'poison_opt') && !has(player, 'thread')) {
        menu = await player.ask(
            [
                'Who do you think was responsible?',
                'Where were you when the murder happened?',
                'Why did you buy poison the other day?'
            ],
            true
        );
    } else if (has(player, 'thread')) {
        menu = await player.ask(
            [
                'Who do you think was responsible?',
                'Where were you when the murder happened?',
                'Do you recognise this thread?'
            ],
            true
        );
    } else {
        menu = await player.ask(
            [
                'Who do you think was responsible?',
                'Where were you when the murder happened?'
            ],
            true
        );
    }

    if (menu === 0) {
        if (n === CAROL_SINCLAIR) {
            await npc.say(
                "I don't know. I think its very convenient",
                'that you have arrived here so soon after it happened.',
                'Maybe it was you'
            );
        } else if (n === ELIZABETH_SINCLAIR) {
            await npc.say(
                'Could have been anyone. The old man was an',
                'idiot. Hes been asking for it for years.'
            );
        } else if (n === ANNA_SINCLAIR) {
            await npc.say('It was clearly an intruder.');
            await player.say("Well, I don't think it was");
            await npc.say('It was one of our lazy servants then');
        } else if (n === FRANK_SINCLAIR) {
            await npc.say(
                "I don't know.",
                "You don't know how long it takes an inheritance",
                'to come through do you? I could really use that',
                'money pretty soon...'
            );
        } else if (n === BOB_SINCLAIR) {
            await npc.say(
                "I don't really care as long as noone thinks its me",
                'Maybe that strange poison seller who headed towards the ' +
                    'seers village.'
            );
        } else if (n === DAVID_SINCLAIR) {
            await npc.say(
                "I don't really know or care",
                'Frankly, the old man deserved to die',
                'There was a suspicious red headed man who came',
                'to the house the other day selling poison now I',
                'think about it. Last I saw he was headed towards',
                'the tavern in the Seers village.'
            );
        }
    } else if (menu === 1) {
        if (n === CAROL_SINCLAIR) {
            await npc.say(
                'Why? Are you accusing me of something?',
                'You seem to have a very high opinion of yourself',
                'I was in my room if you must know, alone.'
            );
        } else if (n === ELIZABETH_SINCLAIR) {
            await npc.say('I was out');
            await player.say('Care to be any more specific?');
            await npc.say(
                "not really. I don't have to justify myself to the likes " +
                    'of you.',
                'I know the king personally you know. Now are we finished ' +
                    'here?'
            );
        } else if (n === ANNA_SINCLAIR) {
            await npc.say(
                'in the library. Noone else was there so',
                "you'll just have to take my word for it"
            );
        } else if (n === FRANK_SINCLAIR) {
            await npc.say(
                "I don't know, somewhere around here probably.",
                'Could you spare me a few coins?',
                "I'll be able to pay you double tomorrow",
                'its just theres this poker night tonight in town...'
            );
        } else if (n === BOB_SINCLAIR) {
            await npc.say('I was walking by myself in the garden.');
            await player.say('And can anyone vouch for that?');
            await npc.say('No. But I was.');
        } else if (n === DAVID_SINCLAIR) {
            await npc.say(
                'that is none of your business.',
                'Are we finished now, or are you just going',
                'to stand there irritating me with your',
                'idiotic questions all day?'
            );
        }
    } else if (menu === 2 && has(player, 'thread')) {
        if (
            n === CAROL_SINCLAIR &&
            !player.inventory.has(THREAD_RED)
        ) {
            player.message('you show Carol the thread found at the crime scene');
            await npc.say(
                'Its some thread. Sorry, do you have a point here?',
                'Or do you just enjoy wasting peoples time?'
            );
        } else if (
            n === CAROL_SINCLAIR &&
            player.inventory.has(THREAD_RED)
        ) {
            player.message('You show her the thread from the study window');
            await npc.say(
                'Its some red thread... it kind of looks like the',
                'Same material as my trousers. But obviously its not.'
            );
        } else if (
            n === ELIZABETH_SINCLAIR &&
            !player.inventory.has(THREAD_BLUE)
        ) {
            player.message('You show her the thread from the study window');
            await npc.say(
                "Its some thread. You're not very good",
                'at this whole investigation thing are you?'
            );
        } else if (
            n === ELIZABETH_SINCLAIR &&
            player.inventory.has(THREAD_BLUE)
        ) {
            player.message('You show her the thread from the study window');
            await npc.say(
                'Looks like Blue thread to me.',
                "If you can't work that out for yourself I",
                "don't hold much hope of you solving this crime"
            );
            await player.say(
                'It looks a lot like the material your trousers',
                "are made of doesn't it?"
            );
            await npc.say('I suppose it does. So what?');
        } else if (
            n === ANNA_SINCLAIR &&
            !player.inventory.has(THREAD_GREEN)
        ) {
            player.message('You show Anna the thread from the study');
            await npc.say('Not really, no. Thread is fairly common');
        } else if (
            n === ANNA_SINCLAIR &&
            player.inventory.has(THREAD_GREEN)
        ) {
            player.message('You show Anna the thread from the study');
            await npc.say(
                "Its some Green thread. Its not exactly uncommon is it?",
                'My trousers are made of the same material'
            );
        } else if (
            n === FRANK_SINCLAIR &&
            !player.inventory.has(THREAD_BLUE)
        ) {
            player.message('Frank examines the thread from the crime scene');
            await npc.say(
                "It looks like thread to me, but I'm not exactly",
                'an expert. Is it worth something?',
                'Can I have it? Actually, can you spare me a few gold?'
            );
        } else if (
            n === FRANK_SINCLAIR &&
            player.inventory.has(THREAD_BLUE)
        ) {
            player.message('Frank examines the thread from the crime scene');
            await npc.say(
                'it kind of looks like the same material as',
                'my trousers are made of... same colour anyway',
                'think its worth anything? Can I have it? Or just some money?'
            );
        } else if (
            n === BOB_SINCLAIR &&
            !player.inventory.has(THREAD_RED)
        ) {
            player.message('you show him the thread you discovered');
            await npc.say('Its some thread. great clue. No, really.');
        } else if (
            n === BOB_SINCLAIR &&
            player.inventory.has(THREAD_RED)
        ) {
            player.message('you show him the thread you discovered');
            await npc.say(
                'Its some red thread. I suppose you think',
                'thats some kind of clue? It looks like',
                'the material my trousers are made of'
            );
        } else if (
            n === DAVID_SINCLAIR &&
            !player.inventory.has(THREAD_GREEN)
        ) {
            player.message(
                'You show him the thread you found on the study window'
            );
            await npc.say('No. Can I go yet? your face irritates me.');
        } else if (
            n === DAVID_SINCLAIR &&
            player.inventory.has(THREAD_GREEN)
        ) {
            player.message(
                'You show him the thread you found on the study window'
            );
            await npc.say(
                'Its some Green thread, like my trousers are made of.',
                "Are you finished? I'm not sure which I dislike more",
                'about you, your face or your general bad odour'
            );
        }
    } else if (menu === 3 || (menu === 2 && !has(player, 'thread'))) {
        if (n === CAROL_SINCLAIR) {
            await npc.say(
                "I don't see what on earth it has to",
                'do with you, but the drain outside was',
                'blocked, and as nobody else here has the',
                'intelligence to even unblock a simple drain',
                'I felt I had to do it myself'
            );
            if (has(player, 'murder_carol')) {
                store(player, 'p_carol');
                store(player, 'poison_opt2');
            }
        } else if (n === ELIZABETH_SINCLAIR) {
            await npc.say(
                'there was a nest of mosquitos under the fountain',
                'in the garden, which I killed with poison the other day.',
                "You can see for yourself if you're capable",
                'of managing that, which I somehow doubt'
            );
            await player.say('I hate mosquitos');
            await npc.say("Doesn't everyone?");
            if (has(player, 'murder_eliz')) {
                store(player, 'p_eliza');
                store(player, 'poison_opt2');
            }
        } else if (n === ANNA_SINCLAIR) {
            await npc.say(
                'That useless Gardener Stanford has let his',
                'Compost heap fester. Its an eyesore to the garden',
                'So I bought some poison from a travelling salesman',
                'So that I could kill off some of the wildlife living in it'
            );
            if (has(player, 'murder_anna')) {
                store(player, 'p_anna');
                store(player, 'poison_opt2');
            }
        } else if (n === FRANK_SINCLAIR) {
            await npc.say(
                "Would you like to buy some? I'm kind of strapped",
                "for cash right now, I'll sell it to you cheap, its hardly",
                'been used at all, I just used a bit to clean that family',
                'crest outside up a bit. Do you think I can get much money',
                'For the family crest, actually? Its cleaned up a bit now'
            );
            if (has(player, 'murder_frank')) {
                store(player, 'p_frank');
                store(player, 'poison_opt2');
            }
        } else if (n === BOB_SINCLAIR) {
            await npc.say(
                "what's it to you anyway?",
                'If you absolutely must know, we had a problem',
                'with the beehive in the garden, and as all of our',
                'servants are so pathetically useless, I decided',
                'I would deal with it myself. So I did.'
            );
            if (has(player, 'murder_bob')) {
                store(player, 'p_bob');
                store(player, 'poison_opt2');
            }
        } else if (n === DAVID_SINCLAIR) {
            await npc.say(
                'There was a nest of spiders upstairs between the',
                'Two Servants quarters. Obviously I had to kill them before',
                'our pathetic servants whined at my father some more',
                'Honestly, its like they expect to be treated like royalty',
                'If I had my way I would fire the whole workshy lot of them'
            );
            if (has(player, 'murder_david')) {
                store(player, 'p_david');
                store(player, 'poison_opt2');
            }
        }
    }
}

// servant dialogue (butler, cook, gardener, dog handler, handyman, maid)

async function otherSuspectDialogue(player, npc) {
    const n = npc.id;

    await player.say("I'm here to help the guards with their investigation");
    await npc.say('How can I help?');

    let menu;
    if (has(player, 'poison_opt')) {
        menu = await player.ask(
            [
                'Who do you think is responsible?',
                'Where were you at the time of the murder?',
                'Did you hear any suspicious noises at all?',
                'Do you know why so much poison was bought recently?'
            ],
            true
        );
    } else {
        menu = await player.ask(
            [
                'Who do you think is responsible?',
                'Where were you at the time of the murder?',
                'Did you hear any suspicious noises at all?'
            ],
            true
        );
    }

    if (menu === 0) {
        if (n === HOBBES_THE_BUTLER) {
            await npc.say(
                'Well, in my considered opinion it must be',
                'David. The man is nothing more than a bully',
                'And I happen to know that poor Lord Sinclair',
                'and David had a massive argument about the way',
                'he treats the staff in the living room the',
                'other day. I did not intend to overhear their conversation',
                'But they were shouting so loudly I could not help but',
                'Overhear it. David definitely used the words',
                "'I am going to kill you!' as well",
                'I think he should be the prime suspect.',
                'He has a nasty temper that one.'
            );
        } else if (n === STANFORD_THE_GARDENER) {
            await npc.say(
                'It was Anna. She is seriously unbalanced.',
                'She trashed the garden once then tried to blame it on me!',
                "I bet it was her. Its just the kind of thing she'd do",
                'She really hates me and was arguing with Lord Sinclair',
                'about trashing the garden a few days ago.'
            );
        } else if (n === PIERRE_THE_DOG_HANDLER) {
            await npc.say(
                'honestly? I think it was Carol.',
                'I saw her in a huge argument with Lord Sinclair',
                'in the library the other day. It was something',
                'to do with stolen books. She definitely seemed',
                'upset enough to have done it afterwards'
            );
        } else if (n === LOUISA_THE_COOK) {
            await npc.say(
                'Elizabeth.',
                'Her father confronted her about her',
                'constant petty thieving, and was',
                'devestated to find she had stolen a silver',
                'needle which meant a lot to him.',
                'You could hear their argument from Lumbridge!'
            );
        } else if (n === MARY_THE_MAID) {
            await npc.say(
                "Oh I don't know...",
                'Frank was acting kind of funny...',
                'After that big argument him and the Lord',
                'had the other day by the beehive... so',
                'I guess maybe him... but its really scary',
                'to think someone here might have been responsible.',
                'I actually hope it was a burglar'
            );
        } else if (n === DONOVAN_THE_HANDYMAN) {
            await npc.say(
                "Oh... I really couldn't say.",
                "I wouldn't really want to point any fingers at anybody",
                "If I had to make a guess I'd have to say it was probably",
                'Bob though. I saw him arguing with Lord Sinclair about',
                'some missing silverware from the Kitchen',
                'It was a very heated argument.'
            );
        }
    } else if (menu === 1) {
        if (n === HOBBES_THE_BUTLER) {
            await npc.say(
                'I was assisting the cook with the evening meal',
                'I gave Mary His Lordships dinner, and sent her',
                'to take it to him, then heard the scream as she',
                'found the body.'
            );
        } else if (n === STANFORD_THE_GARDENER) {
            await npc.say(
                'Right here, by my little shed.',
                'Its very cosy to sit and think in'
            );
        } else if (n === PIERRE_THE_DOG_HANDLER) {
            await npc.say(
                'I was in town at the inn. When I got back',
                'The house was swarming with guards who told',
                'me what had happened. Sorry.'
            );
        } else if (n === LOUISA_THE_COOK) {
            await npc.say(
                'I was right here with Hobbes and Mary.',
                "You can't suspect me surely!"
            );
        } else if (n === MARY_THE_MAID) {
            const { world } = player;
            await npc.say(
                'I was with hobbes and Louisa in the Kitchen',
                "helping to prepare Lord Sinclair's meal, and then",
                'when I took it to his study...',
                'I saw... oh, it was horrible... he was....'
            );
            player.message('@que@She seems to be on the verge of crying.');
            await world.sleepTicks(3);
            player.message('@que@You decide not to push her anymore for details.');
            await world.sleepTicks(3);
        } else if (n === DONOVAN_THE_HANDYMAN) {
            await npc.say(
                'Me? I was sound asleep here in the servants',
                'Quarters. Its very hard work as a handyman',
                "around here, theres always something to do"
            );
        }
    } else if (menu === 2) {
        if (n === HOBBES_THE_BUTLER) {
            await npc.say('how do you mean suspicious?');
            await player.say('Any sounds of a struggle with Lord Sinclair?');
            await npc.say("No, I definitely didn't hear anything like that.");
            await player.say('How about the guard dog barking at all?');
            await npc.say(
                'You know, now you come to mention it',
                "I don't believe I did. I suppose that is",
                'Proof enough that it could not have been an',
                'intruder who is responsible.'
            );
        } else if (n === STANFORD_THE_GARDENER) {
            await npc.say('Not that I remember.');
            await player.say(
                'So no sounds of a struggle between Lord Sinclair and an ' +
                    'intruder?'
            );
            await npc.say('Not to the best of my recollection');
            await player.say('How about the guard dog barking?');
            await npc.say('Not that I can recall');
        } else if (n === PIERRE_THE_DOG_HANDLER) {
            await npc.say('well, like what?');
            await player.say('Any sounds of a struggle with Lord Sinclair?');
            await npc.say("No, I don't remember hearing anything like that.");
            await player.say('How about the guard dog barking at all?');
            await npc.say(
                'I hear him bark all the time.',
                'its one of his favorite things to do.',
                "I can't say I did the night of the murder though",
                "As I wasn't close enough to hear either way"
            );
        } else if (n === LOUISA_THE_COOK) {
            await npc.say('suspicious? what do you mean suspicious?');
            await player.say(
                'Any sounds of a struggle with an intruder for example?'
            );
            await npc.say("No, I'm sure I don't recall any such thing.");
            await player.say('How about the guard dog barking at an intruder?');
            await npc.say(
                "No, I didn't.",
                "If you don't have anything else to ask can",
                'You go and leave me alone now? I have a lot',
                'Of cooking to do for this evening.'
            );
        } else if (n === MARY_THE_MAID) {
            await npc.say(
                "I don't really remember hearing anything out of the ordinary"
            );
            await player.say('no sounds of a struggle then?');
            await npc.say("No, I don't remember hearing anything like that.");
            await player.say('How about the guard dog barking?');
            await npc.say(
                'Oh that horrible dog is always barking at nothing',
                "but I don't think I did..."
            );
        } else if (n === DONOVAN_THE_HANDYMAN) {
            await npc.say(
                "hmmm..... No, I didn't, but I sleep very soundly at night."
            );
            await player.say(
                "So you didn't hear any sounds of a struggle or any",
                'barking from the guard dog next to his study window?'
            );
            await npc.say(
                "Now you mention it, no. it is odd I didn't hear anything",
                'like that. But I do sleep very soundly as I said and',
                "wouldn't necessarily have heard it if there was any such noise"
            );
        }
    } else if (menu === 3) {
        if (n === HOBBES_THE_BUTLER) {
            await npc.say(
                'Well, I do know that Elizabeth was extremely',
                'annoyed by the mosquito nest under the fountain',
                'in the garden, and was going to do something about',
                'it. I suspect any poison she bought would have been',
                'to get rid of it. A Good job too,',
                'I hate mosquitos.'
            );
            await player.say('Yeah, so do I');
            await npc.say("you'd really have to ask her though.");
        } else if (n === STANFORD_THE_GARDENER) {
            await npc.say(
                'Well, Bob mentioned to me the other day',
                'he wanted to get rid of the bees in that hive',
                'over there. I think I saw him buying poison',
                'from that poison salesman the other day',
                'I assume it was to sort out those bees',
                "you'd really have to ask him though."
            );
        } else if (n === PIERRE_THE_DOG_HANDLER) {
            await npc.say(
                'Well, I know David said that he was',
                'going to do something about the spiders nest thats',
                'between the two servants quarters upstairs',
                'He made a big deal about it to Mary the Maid, calling',
                'her useless and incompetent. I felt quite sorry',
                'for her actually.',
                "you'd really have to ask him though."
            );
        } else if (n === LOUISA_THE_COOK) {
            await npc.say(
                'I told Carol to buy some from that strange',
                'poison salesman and clean the drains before they',
                'began to smell any worse. She was the one who',
                'blocked them in the first place with a load',
                'of beans that she bought for some reason.',
                'There were far too many to eat, and they',
                'were almost rotten when she bought them anyway',
                "you'd really have to ask her though."
            );
        } else if (n === MARY_THE_MAID) {
            await npc.say(
                'I overheard Anna saying to Stanford',
                "that if he didn't do something about the",
                'state of his compost heap, she was going to.',
                "She really doesn't get on well with Stanford",
                'I really have no idea why',
                "you'd really have to ask her though."
            );
        } else if (n === DONOVAN_THE_HANDYMAN) {
            await npc.say(
                'Well, I do know Frank bought some poison',
                'recently to clean the family crest thats outside',
                "Its very old and rusty, and I couldn't clean it",
                'myself, so he said he would buy some cleaner and',
                'clean it himself. He probably just got some from that',
                'Poison Salesman who came to the door the other day',
                "you'd really have to ask him though."
            );
        }
    }
}

// "i know who did it!" guard sub-dialogues for a single proof piece

async function threadDialogue(player, npc) {
    await player.say("I have proof that it wasn't any of the servants");
    player.message('you show the guard the thread you found on the window');
    await player.say(
        'All the servants dress in black so',
        "it couldn't have been one of them"
    );
    await npc.say(
        "Thats some good work there. I guess it wasn't a servant.",
        'You still havent proved who did do it though'
    );
}

async function evidenceDialogue(player, npc) {
    if (has(player, 'p_anna2')) {
        await player.say('I have proof that Anna is lying about the poison');
        await npc.say('Oh really? How did you get that?');
        player.message('you tell the guard about the compost heap');
    } else if (has(player, 'p_carol2')) {
        await player.say('I have proof that Carol is lying about the poison');
        await npc.say('Oh really? How did you get that?');
        player.message('you tell the guard about the drain');
    } else if (has(player, 'p_eliza2')) {
        await player.say(
            'I have proof that Elizabeth is lying about the poison'
        );
        await npc.say('Oh really? How did you get that?');
        player.message('you tell the guard about the mosquitos at the fountain');
    } else if (has(player, 'p_bob2')) {
        await player.say('I have proof that Bob is lying about the poison');
        await npc.say('Oh really? How did you get that?');
        player.message('you tell the guard about the beehive');
    } else if (has(player, 'p_frank2')) {
        await player.say('I have proof that Frank is lying about the poison');
        await npc.say('Oh really? How did you get that?');
        player.message('you tell the guard about the tarnished family crest');
    } else if (has(player, 'p_david2')) {
        await player.say('I have proof that David is lying about the poison');
        await npc.say('Oh really? How did you get that?');
        player.message('you tell the guard about the spiders nest');
    }
    await npc.say(
        'Hmm. thats some good detective work there.',
        'We need more evidence before we can close the case though',
        'Keep up the good work'
    );
}

async function fingerprintDialogue(player, npc) {
    await player.say('I have the fingerprints of the culprit');
    if (has(player, 'murder_david')) {
        await player.say("I have Davids' Fingerprints here.");
    } else if (has(player, 'murder_bob')) {
        await player.say("I have Bobs' Fingerprints here.");
    } else if (has(player, 'murder_anna')) {
        await player.say("I have Annas' Fingerprints here.");
    } else if (has(player, 'murder_eliz')) {
        await player.say("I have Elizabeths' Fingerprints here.");
    } else if (has(player, 'murder_frank')) {
        await player.say("I have Franks' Fingerprints here.");
    } else if (has(player, 'murder_carol')) {
        await player.say("I have Carols' Fingerprints here.");
    }
    await player.say(
        'You can see for yourself they match the',
        'Fingerprints on the murder weapon exactly'
    );
    player.message('You show the guard the finger prints evidence');
    await npc.say('...');
    await npc.say(
        "I'm impressed. How on earth did you think",
        "of something like that? I've never heard",
        'of such a technique for finding criminals before',
        'This will come in very handy in the future',
        "But we can't arrest someone on just this.",
        "I'm afraid you'll still need to find more evidence",
        'Before we can close this case completely'
    );
}

async function whoYouSuspect(player, npc) {
    player.message('You tell the guard who you suspect of the crime');
    await npc.say(
        'Great work, show me the evidence',
        "and we'll take them to the dungeons",
        'you *DO* have evidence of their crime, right?'
    );
    await player.say('uh....');
    await npc.say(
        "tch. You wouldn't last a day in the guards",
        'with sloppy thinking like that.',
        'come see me when you have some proof of your accusations'
    );
}

// quest completion (all three proof pieces present)

async function completeQuest(player, npc) {
    remove(player, 'poison_opt');
    await player.say('I have conclusive Proof who the killer was');
    await npc.say(
        'You do? thats excellent work. Lets hear it then'
    );
    await player.say(
        "I don't think it was an intruder, and I don't think Lord",
        'Sinclair was killed by being stabbed.'
    );
    await npc.say('hmmm? really? why not?');
    await player.say(
        'nobody heard the guard dog barking, which it would have if',
        'it had been an intruder who was responsible.',
        'nobody heard any signs of a struggle either.',
        'I think the knife was there to throw suspicion away from the real ' +
            'culprit.'
    );
    await npc.say('Yes, that makes sense. But who did do it then?');

    if (has(player, 'murder_david')) {
        player.message('You prove to the guard the thread matches Davids clothes');
    } else if (has(player, 'murder_anna')) {
        player.message('You prove to the guard the thread matches Annas clothes');
    } else if (has(player, 'murder_carol')) {
        player.message('You prove to the guard the thread matches Carols clothes');
    } else if (has(player, 'murder_bob')) {
        player.message('You prove to the guard the thread matches Bobs clothes');
    } else if (has(player, 'murder_frank')) {
        player.message('You prove to the guard the thread matches Franks clothes');
    } else if (has(player, 'murder_eliz')) {
        player.message(
            'You prove to the guard the thread matches Elizabeths clothes'
        );
    }

    await npc.say("Yes, I'd have to agree with that... but we need more evidence");

    if (has(player, 'murder_david')) {
        player.message(
            'You prove to the guard David did not use poison on the spiders nest'
        );
    } else if (has(player, 'murder_anna')) {
        player.message(
            'You prove to the guard Anna did not use poison on the compost heap'
        );
    } else if (has(player, 'murder_carol')) {
        player.message(
            'You prove to the guard Carol did not use poison on the drain'
        );
    } else if (has(player, 'murder_bob')) {
        player.message(
            'You prove to the guard Bob did not use poison on the beehive'
        );
    } else if (has(player, 'murder_frank')) {
        player.message(
            'You prove to the guard Frank did not use poison on the Sinclair Crest'
        );
    } else if (has(player, 'murder_eliz')) {
        player.message(
            'You prove to the guard Elizabeth did not use poison on the fountain'
        );
    }

    await npc.say(
        'Excellent work - have you considered a career as a detective?',
        "But i'm afraid its still not quite enough..."
    );

    if (has(player, 'murder_david')) {
        player.message('You match Davids fingerprints with those on the dagger');
    } else if (has(player, 'murder_anna')) {
        player.message('You match Annas fingerprints with those on the dagger');
    } else if (has(player, 'murder_carol')) {
        player.message('You match Carols fingerprints with those on the dagger');
    } else if (has(player, 'murder_bob')) {
        player.message('You match Bobs fingerprints with those on the dagger');
    } else if (has(player, 'murder_frank')) {
        player.message('You match Franks fingerprints with those on the dagger');
    } else if (has(player, 'murder_eliz')) {
        player.message(
            'You match Elizabeths fingerprints with those on the dagger'
        );
    }

    player.message('Found in the body of Lord Sinclair');
    await npc.say('...', 'Yes. theres no doubt about it.');

    let objPronoun = '';
    if (has(player, 'murder_david') && has(player, 'p_david2')) {
        await npc.say('It must have been David who killed his father');
        remove(player, 'murder_david');
        objPronoun = 'him';
    } else if (has(player, 'murder_anna') && has(player, 'p_anna2')) {
        await npc.say('It must have been Anna who killed her father');
        remove(player, 'murder_anna');
        objPronoun = 'her';
    } else if (has(player, 'murder_carol') && has(player, 'p_carol2')) {
        await npc.say('It must have been Carol who killed her father');
        remove(player, 'murder_carol');
        objPronoun = 'her';
    } else if (has(player, 'murder_bob') && has(player, 'p_bob2')) {
        await npc.say('It must have been Bob who killed his father');
        remove(player, 'murder_bob');
        objPronoun = 'him';
    } else if (has(player, 'murder_frank') && has(player, 'p_frank2')) {
        await npc.say('It must have been Frank who killed his father');
        remove(player, 'murder_frank');
        objPronoun = 'him';
    } else if (has(player, 'murder_eliz') && has(player, 'p_eliza2')) {
        await npc.say('It must have been Elizabeth who killed her father');
        remove(player, 'murder_eliz');
        objPronoun = 'her';
    }

    await npc.say(
        'All of the guards must congratulate you on your',
        'Excellent work in helping us to solve this case',
        "We don't have many murders here in RuneScape",
        "And i'm afraid we wouldn't have been able to solve it",
        'by ourselves. We will hold ' + objPronoun + ' here under house arrest',
        'Until such time as we can bring ' + objPronoun + ' to trial',
        "You have our gratitude, and I'm sure the rest of the",
        'families as well, in helping to apprehend the murderer',
        "I'll just take the evidence from you now"
    );
    player.message('You hand over all the evidence');

    // remove all murder mystery evidence items
    const evidenceItems = [
        THREAD_GREEN,
        THREAD_BLUE,
        THREAD_RED,
        MURDER_SCENE_POT,
        A_SILVER_DAGGER,
        MURDERERS_FINGERPRINT,
        ANNAS_FINGERPRINT,
        BOBS_FINGERPRINT,
        CAROLS_FINGERPRINT,
        DAVIDS_FINGERPRINT,
        ELIZABETHS_FINGERPRINT,
        FRANKS_FINGERPRINT,
        UNIDENTIFIED_FINGERPRINT,
        ANNAS_SILVER_NECKLACE,
        BOBS_SILVER_TEACUP,
        CAROLS_SILVER_BOTTLE,
        DAVIDS_SILVER_BOOK,
        ELIZABETHS_SILVER_NEEDLE,
        FRANKS_SILVER_POT,
        ANNAS_SILVER_NECKLACE_FLOUR,
        BOBS_SILVER_TEACUP_FLOUR,
        CAROLS_SILVER_BOTTLE_FLOUR,
        DAVIDS_SILVER_BOOK_FLOUR,
        ELIZABETHS_SILVER_NEEDLE_FLOUR,
        FRANKS_SILVER_POT_FLOUR
    ];
    for (const itemId of evidenceItems) {
        while (player.inventory.has(itemId)) {
            player.inventory.remove(itemId);
        }
    }

    // 3 quest points, crafting.base * 150 + 750 xp, then the 2000gp hand-over
    player.questStages.murderMystery = -1;
    player.addQuestPoints(3);
    player.message('@gre@You haved gained 3 quest points!');
    player.addExperience('crafting', player.skills.crafting.base * 150 + 750, false);
    player.message('You have completed the Murder Mystery Quest');

    await npc.say('Please accept this reward from the family!');
    player.message('You received 2000 gold!');
    player.inventory.add(COINS, 2000);

    remove(
        player,
        'evidence',
        'culprit',
        'p_anna',
        'p_bob',
        'p_carol',
        'p_eliza',
        'p_david',
        'p_frank'
    );
    remove(
        player,
        'p_anna2',
        'p_bob2',
        'p_carol2',
        'p_eliza2',
        'p_david2',
        'p_frank2'
    );
    remove(
        player,
        'murder_anna',
        'murder_bob',
        'murder_frank',
        'murder_eliz',
        'murder_david',
        'murder_carol'
    );
    remove(player, 'thread', 'poison_opt', 'poison_opt2');
}

// guard (quest start / progress / completion)

async function talkToGuard(player, npc) {
    const { world } = player;
    const stage = player.questStages.murderMystery || 0;

    if (stage === 0) {
        await player.say("What's going on here?");
        await npc.say(
            'Oh, its terrible.',
            'Lord Sinclair has been murdered',
            "And we don't have any clues as to",
            "who or why. We're totally baffled",
            'If you can help us',
            'we will be very grateful'
        );
        const menu = await player.ask(
            ["Sure, I'll help", 'You should do your own dirty work'],
            true
        );
        if (menu === 0) {
            await npc.say('thanks a lot!');
            await player.say('What should I be doing to help?');
            await npc.say(
                'Look around and investigate who might be responsible',
                'the sarge said every murder leaves clues to who done it',
                "but frankly we're out of our depth here"
            );
            player.questStages.murderMystery = 1;
            const randomMurder = 1 + Math.floor(Math.random() * 6);
            if (randomMurder === 1) {
                store(player, 'murder_david');
            } else if (randomMurder === 2) {
                store(player, 'murder_anna');
            } else if (randomMurder === 3) {
                store(player, 'murder_carol');
            } else if (randomMurder === 4) {
                store(player, 'murder_bob');
            } else if (randomMurder === 5) {
                store(player, 'murder_frank');
            } else if (randomMurder === 6) {
                store(player, 'murder_eliz');
            }
        } else if (menu === 1) {
            await npc.say(
                'get lost then, this is private property.',
                "...unless you'd like to be taken for questioning yourself"
            );
        }
        return;
    }

    if (stage === -1) {
        await npc.say(
            'Excellent work on solving the murder',
            'All of the guards I know are very impressed',
            "And don't worry, we have the murderer under guard",
            'until they can be taken to trial'
        );
        return;
    }

    // stage === 1
    const opt = await player.ask(
        [
            'What should I be doing to help again?',
            'How did Lord Sinclair die?',
            'I know who did it!'
        ],
        true
    );

    if (opt === 0) {
        await npc.say(
            'Look around and investigate who might be responsible',
            'the sarge said every murder leaves clues to who done it',
            "but frankly we're out of our depth here"
        );
        return;
    }

    if (opt === 1) {
        await npc.say(
            'well its all very mysterious.',
            'Mary the maid found the body in the study next to his bedroom',
            'on the east wing of the ground floor, the door was found locked,',
            'from the inside, and he seemed to have been stabbed',
            "but there was an odd smell in the room. Frankly, I'm stumped"
        );
        return;
    }

    // opt === 2 : "I know who did it!"
    const t = has(player, 'thread');
    const e = has(player, 'evidence');
    const c = has(player, 'culprit');
    const pieces = (t ? 1 : 0) + (e ? 1 : 0) + (c ? 1 : 0);

    if (pieces === 0) {
        await npc.say('Really? That was quick work! Who?');
        const variableD = await player.ask(
            [
                'It was an intruder!',
                'the butler did it!',
                'It was one of the servants',
                'It was one of his family'
            ],
            true
        );
        if (variableD === 0) {
            await npc.say(
                'Thats what we were thinking too.',
                'That someone broke in, to steal something',
                'was discovered by Lord Sinclair, stabbed him and ran.',
                'Its odd that apparently nothing was stolen though.',
                'Find out something has been stolen, and the case is closed',
                'But the murdered man was a friend of the king',
                'and its more than my jobs worth not to investigate fully'
            );
        } else if (variableD === 1) {
            await npc.say(
                'I hope you have proof to that effect.',
                'we have to arrest someone for this and it seems to me that',
                'only the actual murderer would gain by falsely accusing ' +
                    'someone'
            );
            await world.sleepTicks(3);
            await npc.say(
                'although having said that',
                'the butler is kind of shifty looking...'
            );
        } else if (variableD === 2) {
            await npc.say('Oh really? Which one?');
            const variableA = await player.ask(
                ['It was one of the women', 'It was one of the men'],
                true
            );
            if (variableA === 0) {
                await npc.say('Oh really? Which one?');
                const variableB = await player.ask(
                    [
                        'it was so obviously Louisa The Cook',
                        'It must have been Mary The Maid'
                    ],
                    false
                );
                if (variableB >= 0) {
                    await whoYouSuspect(player, npc);
                }
            } else if (variableA === 1) {
                await npc.say('Oh really? Which one?');
                const variableC = await player.ask(
                    [
                        'it can only be Donovan the Handyman',
                        'Pierre the Dog Handler. No question.',
                        'Hobbes the Butler. the butler *always* did it',
                        'you must know it was Stanford The Gardener'
                    ],
                    false
                );
                if (variableC >= 0 && variableC !== 2) {
                    await whoYouSuspect(player, npc);
                } else if (variableC === 2) {
                    await player.say('the butler did it!');
                    await npc.say(
                        'I hope you have proof to that effect.',
                        'we have to arrest someone for this and it seems to ' +
                            'me that',
                        'only the actual murderer would gain by falsely ' +
                            'accusing someone'
                    );
                    await world.sleepTicks(3);
                    await npc.say(
                        'although having said that',
                        'the butler is kind of shifty looking...'
                    );
                }
            }
        } else if (variableD === 3) {
            await npc.say('Oh really? Which one?');
            const family = await player.ask(
                ['It was one of the women', 'It was one of the men'],
                true
            );
            if (family === 0) {
                await npc.say('Oh really? Which one?');
                const variableI = await player.ask(
                    [
                        'I know it was Anna',
                        'I am so sure it was Carol',
                        'Ill bet you anything it was Elizabeth'
                    ],
                    false
                );
                if (variableI >= 0) {
                    await whoYouSuspect(player, npc);
                }
            } else if (family === 1) {
                await npc.say('Oh really? Which one?');
                const variableE = await player.ask(
                    [
                        "I'm certain it was Bob",
                        'It was David. No doubt about it.',
                        "If it wasn't Frank I'll eat my shoes"
                    ],
                    false
                );
                if (variableE >= 0) {
                    await whoYouSuspect(player, npc);
                }
            }
        }
        return;
    }

    if (pieces === 3) {
        await completeQuest(player, npc);
        return;
    }

    if (pieces === 1) {
        if (t) {
            await threadDialogue(player, npc);
        } else if (e) {
            await evidenceDialogue(player, npc);
        } else if (c) {
            await fingerprintDialogue(player, npc);
        }
        return;
    }

    // pieces === 2
    if (t && e) {
        const subopt = await player.ask(
            [
                "I have proof that it wasn't any of the servants",
                'I have proof one of the family lied about the poison'
            ],
            false
        );
        if (subopt === 0) {
            await threadDialogue(player, npc);
        } else if (subopt === 1) {
            await evidenceDialogue(player, npc);
        }
    } else if (t && c) {
        const subopt = await player.ask(
            [
                "I have proof that it wasn't any of the servants",
                'I have the fingerprints of the culprit'
            ],
            false
        );
        if (subopt === 0) {
            await threadDialogue(player, npc);
        } else if (subopt === 1) {
            await fingerprintDialogue(player, npc);
        }
    } else if (e && c) {
        const subopt = await player.ask(
            [
                'I have proof one of the family lied about the poison',
                'I have the fingerprints of the culprit'
            ],
            false
        );
        if (subopt === 0) {
            await evidenceDialogue(player, npc);
        } else if (subopt === 1) {
            await fingerprintDialogue(player, npc);
        }
    }
}

// poison salesman

async function talkToPoisonSalesman(player, npc) {
    const { world } = player;
    const stage = player.questStages.murderMystery || 0;

    if (stage === 0) {
        await player.say('Hi.');
        await npc.say(
            "I'm afraid I'm all sold out of poison at the moment.",
            'People know a bargain when they see it!'
        );
        return;
    }

    // stage === 1 (only stage 0 and 1 handled here)
    if (stage !== 1) {
        return;
    }

    await player.say("I'm investigating the murder at the Sinclair house.");
    await npc.say(
        'There was a murder at the Sinclair House???',
        'Thats terrible! And I was only there the other day too',
        'They bought the last of my Patented Multi Purpose Poison!'
    );

    let menu;
    if (player.inventory.has(MURDER_SCENE_POT)) {
        menu = await player.ask(
            [
                'Patented Multi Purpose Poison?',
                'Who did you sell Poison to at the house?',
                'Can I buy some Poison?',
                'I have this pot I found at the murder scene...'
            ],
            true
        );
    } else {
        menu = await player.ask(
            [
                'Patented Multi Purpose Poison?',
                'Who did you sell Poison to at the house?',
                'Can I buy some Poison?'
            ],
            true
        );
    }

    if (menu === 0) {
        await npc.say(
            'Aaaaah... a miracle of modern apothecarys, this exclusive',
            'concoction has been tested on all known forms of life',
            'and been proven to kill them all in varying dilutions',
            'from cockroaches to king dragons',
            'so incredibly versatile, it can be used as pest',
            'control, a cleansing agent, drain cleaner, metal polish',
            'and washes whiter than white, all with our uniquely',
            'fragrant concoction that is immediately recognisable',
            'across the land as Peter Potters Patented Poison potion'
        );
        player.message('@que@The salesman stops for breath');
        await world.sleepTicks(3);
        await npc.say(
            "I'd love to sell you some but I've sold out recently",
            'Thats just how good it is! Three hundred and Twenty',
            'Eight people in this area alone cannot be wrong!',
            'Nine out of Ten poisoners prefer it in controlled tests!',
            'Can I help you with anything else?',
            'Perhaps I can take your name and add it to our mailing list',
            'Of poison users? We will only send you information related to',
            'the use of poison and other Peter Potter Products'
        );
        await player.say('uh... no, its ok');
    } else if (menu === 1) {
        await npc.say(
            'Well, Peter Potters Patented Multi Purpose Poison',
            'is a product of such obvious quality that I am',
            'glad to say I managed to sell a bottle to each of the',
            'Sinclairs - Anna, Bob, Carol, David, Elizabeth and Frank',
            'all bought a bottle - in fact they bought the last of my ' +
                'supplies',
            'Maybe I can take your name and address, and I will',
            'personally come and visit you when stocks return?'
        );
        if (!has(player, 'poison_opt')) {
            store(player, 'poison_opt');
        }
        await player.say('uh... no, its ok');
    } else if (menu === 2) {
        await npc.say(
            "I'm afraid I am totally out of stock at the moment",
            "After my successful trip to the Sinclair's House the other day",
            "but don't worry, our factories are working overtime",
            'to produce Peter Potters Patented Multi Purpose Poison',
            'possibly the finest multi purpose poison and cleaner yet',
            'available to the general market. And its unique fragrance',
            'makes it the number one choice for cleaners, and exterminators',
            'the whole country over'
        );
    } else if (menu === 3) {
        player.message('You show the poison salesman the pot you found at');
        player.message('The murder scene with the unusual smell');
        await npc.say(
            'hmmm... yes, that smells exactly like my',
            "Patented Multi Purpose Poison, but I don't see how it could be",
            'It quite clearly says on the label of all bottles',
            'not to be taken internally - extremely poisonous'
        );
        await player.say('Perhaps someone else put it in his wine?');
        await npc.say('yes... I suppose that could have happened...');
    }
}

// man in the village (gossip / hints)

async function talkToMan(player, npc) {
    const stage = player.questStages.murderMystery || 0;

    if (stage === 0) {
        await npc.say(
            'Theres some kind of commotion up at the Sinclair place',
            'I hear. Not surprising all things considered'
        );
        return;
    }

    if (stage === -1) {
        await npc.say(
            'I heard you solved the murder',
            'Was I of any help to you at all?'
        );
        return;
    }

    await player.say(
        "I'm investigating the murder up at the Sinclair place"
    );
    await npc.say('Murder is it?', "Well, i'm not really surprised...");

    const menu = await player.ask(
        [
            'What can you tell me about the Sinclairs?',
            'Who do you think was responsible?',
            'Why do the Sinclairs live so far from town?',
            'I think the butler did it',
            'I am so confused about who did it'
        ],
        true
    );

    if (menu === 0) {
        await npc.say('Well, what do you want to know?');
        const menu2 = await player.ask(
            [
                'Tell me about Lord Sinclair',
                'what can you tell me about his sons?',
                'what can you tell me about his daughters?'
            ],
            true
        );
        if (menu2 === 0) {
            await npc.say(
                'Old Lord Sinclair was a great man with a lot of',
                'respect in these parts. More than his worthless',
                'children have anyway'
            );
            await player.say(
                'His children? They have something to gain by his death?'
            );
            await npc.say(
                'yes. you could say that. not that im one to gossip'
            );
        } else if (menu2 === 1) {
            await npc.say(
                'His sons eh? They all have their own skeletons',
                "In their cupboards. You'll have to be more specific.",
                'Who are you interested in exactly?'
            );
            const menu3 = await player.ask(
                ['Tell me about Bob', 'Tell me about David', 'Tell me about Frank'],
                true
            );
            if (menu3 === 0) {
                await npc.say(
                    'Bob is an odd character indeed...',
                    "I'm not one to gossip, but I heard",
                    "Bob is addicted to Tea. He can't make it through the day",
                    'Without having at least 20 cups!',
                    "You might not think thats such a big thing,",
                    'But he has spent thousands of gold to feed his habit',
                    'At one point he stole a lot of silverware from the ' +
                        'kitchen',
                    'and pawned it just so he could afford to buy his daily',
                    'tea allowance. If his father ever found out, he would',
                    'be in so much trouble... he might even get disowned'
                );
            } else if (menu3 === 1) {
                await npc.say(
                    'David... oh david...',
                    'not many people know this, but David really',
                    'has an anger problem. Hes always screaming and shouting',
                    'at the household servants when hes angry, and they live',
                    'in a state of fear, always walking on eggshells around ' +
                        'him',
                    'but none of them have the courage to talk to his father ' +
                        'about',
                    'his behaviour. If they did Lord Sinclair would almost ' +
                        'certainly',
                    'kick him out of the house, as some of the servants have',
                    'been there longer than he has, and he definitely',
                    'has no right to treat them like he does... but',
                    "I'm not one to gossip about people."
                );
            } else if (menu3 === 2) {
                await npc.say(
                    "I'm not one to talk ill of people behind their back",
                    'but frank is a real piece of work. He is an absolutely',
                    "terrible gambler... he can't pass 2 dogs in the street",
                    'without putting a bet on which one will bark first',
                    'He has already squandered all of his allowance, and I ' +
                        'heard',
                    'he had stolen a number of paintings of his Fathers to ' +
                        'sell',
                    'to try and cover his debts, but he still owes a lot of',
                    'people a lot of money. If his Father ever found out, he ' +
                        'would',
                    'stop his income, and then he would be in serious trouble'
                );
            }
        } else if (menu2 === 2) {
            await npc.say(
                "His daughters eh? They're all nasty pieces of work",
                'which of them specifically did you want to know about?'
            );
            const menu4 = await player.ask(
                [
                    'Tell me about Anna',
                    'Tell me about Carol',
                    'Tell me about Elizabeth'
                ],
                true
            );
            if (menu4 === 0) {
                await npc.say(
                    'Anna... ah yes...',
                    'Anna has 2 great loves:',
                    'Sewing and Gardening. But one thing',
                    'she has kept secret is that she once had',
                    'an affair with Stanford the gardener',
                    'and tried to get him fired when they broke up',
                    'by killing all of the flowers in the garden',
                    'If her father ever found out she had done that',
                    'He would be so furious he would probably disown her'
                );
            } else if (menu4 === 1) {
                await npc.say(
                    'Oh Carol... she is such a fool',
                    "You didn't hear this from me, but I heard",
                    'a while ago she was conned out of a lot of money',
                    'by a travelling salesman who sold her a box full',
                    'of beans by telling her they were magic. But they ' +
                        "weren't.",
                    'She sold some rare books from the library to cover her ' +
                        'debts',
                    'But her father would be incredibly annoyed',
                    'If he ever found out - he might even throw her out of ' +
                        'the house'
                );
            } else if (menu4 === 2) {
                await npc.say(
                    'Elizabeth? Elizabeth has a strange problem',
                    'She cannot help herself, but is always stealing small',
                    'objects - its pretty sad that she is rich enough to ' +
                        'afford',
                    'to buy things, but would rather steal them instead.',
                    "Now, I don't want to spread stories, but I heard",
                    'She even stole a silver needle from her father that',
                    'had great sentimental value for him. He was devestated ' +
                        'when',
                    'it was lost, and cried for a week thinking he had lost it',
                    'If he ever found out that it was her who had stolen it',
                    'He would go absolutely mental, maybe even disowning her'
                );
            }
        }
    } else if (menu === 1) {
        await npc.say(
            'well, I guess it could have been an intruder',
            'but with that big guard dog of theirs',
            'I seriously doubt it.',
            'I suspect it was someone closer to home...',
            'Especially as I heard that that poison salesman',
            'in the seers village made a big sale to one',
            'of the family the other day.'
        );
    } else if (menu === 2) {
        await npc.say(
            'Well, they used to live in the big castle',
            'but old Lord Sinclair gave it up so that those',
            'strange knights could live there instead',
            'So the king built him a new house to the North',
            'Its more cramped than his old place, but he seemed to like it',
            'his children were furious at him for doing it though'
        );
    } else if (menu === 3) {
        await npc.say(
            "And I think you've been reading too many",
            'cheap detective novels',
            'Hobbes is kind of uptight, but his loyalty',
            'to Old Lord Sinclair is beyond question'
        );
    } else if (menu === 4) {
        await player.say('think you could give me any hints?');
        const hint = Math.floor(Math.random() * 5);
        if (hint === 0) {
            await npc.say(
                'well, I dont know if its related',
                'But I heard from that Poison Salesman in town',
                'That he sold some poison to one of the family the other day',
                "I don't think he has any stock left now though..."
            );
        } else if (hint === 1) {
            await npc.say(
                "Well I don't know how much help this is",
                'but I heard that their guard dog will bark loudly at anyone',
                "it doesn't recognise",
                'maybe you should find out if anyone heard anything ' +
                    'suspicious?'
            );
        } else if (hint === 2) {
            await npc.say(
                'Well, this might be of some help to you',
                'My father was in the guards when he was younger',
                "and he always said that there isn't a crime that can't be",
                'solved through careful examination of the crime scene',
                'and all surrounding areas'
            );
        } else if (hint === 3) {
            await npc.say(
                "I don't know how much help this is to you",
                'but my dad was in the guard once',
                'and he told me that the marks on your hands',
                "Are totally unique. He called them 'finger prints'",
                'He said you can find them easily on any shiny metallic ' +
                    'surface',
                'By using a fine powder to mark out where the marks are',
                'and then using some sticky paper to lift the print from the ' +
                    'object',
                "I bet if you could find a way to get everyones 'finger " +
                    "prints'",
                'you could solve the crime pretty easily'
            );
        } else if (hint === 4) {
            await npc.say(
                'My father used to be in the guard.',
                'He always wrote himself notes on a piece of paper',
                'so he could keep track of information easily.',
                'Maybe you should try that?',
                "Don't forget to thank me if I help you solve the case!"
            );
        }
    }
}

// talk dispatch

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const n = npc.id;

    if (n === GUARD_SINCLAIR_MANSION) {
        player.engage(npc);
        await talkToGuard(player, npc);
        player.disengage();
        return true;
    }

    if (n === POISON_SALESMAN) {
        player.engage(npc);
        await talkToPoisonSalesman(player, npc);
        player.disengage();
        return true;
    }

    if (n === MAN_SINCLAIR_MANSION) {
        player.engage(npc);
        await talkToMan(player, npc);
        player.disengage();
        return true;
    }

    if (SINCLAIR_IDS.includes(n)) {
        const stage = player.questStages.murderMystery || 0;
        const female =
            n === ANNA_SINCLAIR || n === ELIZABETH_SINCLAIR || n === CAROL_SINCLAIR;
        if (stage === 0) {
            player.message(female ? 'she is ignoring you' : 'he is ignoring you');
            return true;
        }
        player.engage(npc);
        if (stage === -1) {
            await npc.say("Apparently you aren't as stupid as you look");
        } else {
            await sinclairSuspectDialogue(player, npc);
        }
        player.disengage();
        return true;
    }

    if (OTHER_NPC_IDS.includes(n)) {
        const stage = player.questStages.murderMystery || 0;
        player.engage(npc);
        if (stage === 0) {
            if (n === HOBBES_THE_BUTLER) {
                await npc.say('This is private property! Please leave!');
            } else if (n === LOUISA_THE_COOK) {
                await npc.say(
                    "I'm far too upset to talk to random people right now"
                );
            } else if (n === STANFORD_THE_GARDENER) {
                await npc.say(
                    'Have you no shame? we are all grieving at the moment'
                );
            } else if (n === PIERRE_THE_DOG_HANDLER) {
                await npc.say('The Guards told me not to talk to anyone');
            } else if (n === DONOVAN_THE_HANDYMAN) {
                await npc.say('I have no interest in talking to gawkers');
            } else if (n === MARY_THE_MAID) {
                // OpenRSC: player.message("she is ignoring you")
                player.disengage();
                player.message('she is ignoring you');
                return true;
            }
        } else if (stage === -1) {
            await npc.say('Thank you for all your help in solving the murder');
        } else {
            await otherSuspectDialogue(player, npc);
        }
        player.disengage();
        return true;
    }

    return false;
}

// ground items: the silver dagger and the murder-scene pot

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = player.questStages.murderMystery || 0;

    if (groundItem.id === A_SILVER_DAGGER) {
        if (stage === 0 || stage === 1) {
            player.message(
                "This knife doesn't seem sturdy enough to have killed Lord " +
                    'Sinclair'
            );
            if (!player.inventory.has(A_SILVER_DAGGER)) {
                player.inventory.add(A_SILVER_DAGGER, 1);
            } else {
                player.message('You already have the murderweapon');
            }
        } else if (stage === -1) {
            player.message('you cannot take the flimsy dagger.');
            player.message('The guards will need it as Evidence.');
        }
        return true;
    }

    if (groundItem.id === MURDER_SCENE_POT) {
        if (stage === 0 || stage === 1) {
            player.message(
                'It seems like Lord Sinclair was drinking from this before he ' +
                    'died'
            );
            if (!player.inventory.has(MURDER_SCENE_POT)) {
                player.inventory.add(MURDER_SCENE_POT, 1);
            } else {
                player.message('You already have the sickly smelling pot');
            }
        } else if (stage === -1) {
            player.message('you cannot take the strange smelling pot.');
            player.message('The guards will need it as Evidence.');
        }
        return true;
    }

    return false;
}

// study window (wall object): snags the killer's thread

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id !== WINDOW_ID) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages.murderMystery || 0;

    if (stage === 0 || stage === -1) {
        player.message('You need the guards permission to do that');
        return true;
    }

    // stage === 1
    player.message('@que@Some thread seems to have been caught');
    await world.sleepTicks(3);
    player.message('@que@on a loose nail on the window');
    await world.sleepTicks(3);

    const carriesThread =
        player.inventory.has(THREAD_GREEN) ||
        player.inventory.has(THREAD_RED) ||
        player.inventory.has(THREAD_BLUE);

    function giveKillerThread() {
        if (has(player, 'murder_david')) {
            player.inventory.add(THREAD_GREEN, 1);
        } else if (has(player, 'murder_anna')) {
            player.inventory.add(THREAD_GREEN, 1);
        } else if (has(player, 'murder_carol')) {
            player.inventory.add(THREAD_RED, 1);
        } else if (has(player, 'murder_frank')) {
            player.inventory.add(THREAD_BLUE, 1);
        } else if (has(player, 'murder_eliz')) {
            player.inventory.add(THREAD_BLUE, 1);
        } else if (has(player, 'murder_bob')) {
            player.inventory.add(THREAD_RED, 1);
        }
    }

    if (!has(player, 'thread') && !carriesThread) {
        giveKillerThread();
        player.message('@que@You take the thread');
        await world.sleepTicks(3);
        store(player, 'thread');
        return true;
    }

    if (has(player, 'thread') && !carriesThread) {
        giveKillerThread();
        player.message('@que@Lucky for you theres some thread left');
        await world.sleepTicks(3);
        player.message('@que@You should be less careless in future');
        await world.sleepTicks(3);
        return true;
    }

    player.message('You have already taken the thread');
    return true;
}

// object interactions (barrels, sacks, flour barrel, poison-target objects)

async function searchBarrel(player, objectId) {
    // maps barrel -> silver item + friendly messages
    const barrels = {
        [BARREL_BOB]: {
            item: BOBS_SILVER_TEACUP,
            take: 'You take Bobs silver cup',
            have: 'You already have Bobs cup'
        },
        [BARREL_ANNA]: {
            item: ANNAS_SILVER_NECKLACE,
            take: 'You take Annas Silver Necklace',
            have: 'You already have Annas Necklace'
        },
        [BARREL_ELIZABETH]: {
            item: ELIZABETHS_SILVER_NEEDLE,
            take: 'You take Elizabeths silver needle',
            have: 'You already have Elizabeths Needle'
        },
        [BARREL_FRANK]: {
            item: FRANKS_SILVER_POT,
            take: 'You take franks silver pot',
            have: 'You already have Franks pot'
        },
        [BARREL_DAVID]: {
            item: DAVIDS_SILVER_BOOK,
            take: 'You take Davids silver book',
            have: 'You already have Davids book'
        },
        [BARREL_CAROL]: {
            item: CAROLS_SILVER_BOTTLE,
            take: 'You take Carols silver bottle',
            have: 'You already have Carols bottle'
        }
    };

    const barrel = barrels[objectId];
    player.message('Theres something shiny hidden at the bottom');
    if (!player.inventory.has(barrel.item)) {
        player.message(barrel.take);
        player.inventory.add(barrel.item, 1);
    } else {
        player.message(barrel.have);
    }
}

async function investigatePoisonObject(player, objectId, murderKey, evidenceKey) {
    const { world } = player;

    if (objectId === COMPOST_HEAP) {
        if (has(player, 'poison_opt2') && has(player, murderKey)) {
            player.message('@que@The compost is teeming with maggots');
            await world.sleepTicks(3);
            player.message('@que@Somebody should really do something about it');
            await world.sleepTicks(3);
            player.message("@que@Its certainly clear nobodies used poison here.");
            await world.sleepTicks(3);
            store(player, 'evidence');
            store(player, evidenceKey);
        } else if (has(player, 'poison_opt2') && !has(player, murderKey)) {
            player.message(
                '@que@There is a faint smell of poison behind the smell of the ' +
                    'compost'
            );
            await world.sleepTicks(3);
        } else {
            player.message('Its a heap of Compost');
        }
        return;
    }

    if (objectId === FOUNTAIN) {
        if (has(player, 'poison_opt2') && has(player, murderKey)) {
            player.message('@que@The fountain is swarming with mosquitos');
            await world.sleepTicks(3);
            player.message('@que@Theres a nest of them underneath the fountain');
            await world.sleepTicks(3);
            await player.say("I hate mosquitos, they're so annoying");
            player.message("@que@Its certainly clear nobodies used poison here.");
            await world.sleepTicks(3);
            store(player, 'evidence');
            store(player, evidenceKey);
        } else if (has(player, 'poison_opt2') && !has(player, murderKey)) {
            player.message('@que@There are a lot of dead mosquitos around');
            await world.sleepTicks(3);
            player.message('@que@the base of the fountain. A faint smell of');
            await world.sleepTicks(3);
            player.message('@que@poison is in the air, but the water seems clean');
            await world.sleepTicks(3);
        } else {
            player.message(
                'A fountain with large numbers of insects around the base'
            );
        }
        return;
    }

    if (objectId === BEEHIVE) {
        if (has(player, 'poison_opt2') && has(player, murderKey)) {
            player.message('@que@The beehive buzzes with activity');
            await world.sleepTicks(3);
            player.message("@que@These bees definitely don't seem poisoned at all");
            await world.sleepTicks(3);
            store(player, 'evidence');
            store(player, evidenceKey);
        } else if (has(player, 'poison_opt2') && !has(player, murderKey)) {
            player.message('@que@The hive is empty. There are a few dead bees and');
            await world.sleepTicks(3);
            player.message('@que@a faint smell of poison');
            await world.sleepTicks(3);
        } else {
            player.message('Its a very old beehive');
        }
        return;
    }

    if (objectId === DRAIN) {
        if (has(player, 'poison_opt2') && has(player, murderKey)) {
            player.message('@que@The drain is totally blocked');
            await world.sleepTicks(3);
            player.message('@que@It really stinks. No, it *Really* smells bad.');
            await world.sleepTicks(3);
            player.message("@que@Its certainly clear nobodies cleaned it recently.");
            await world.sleepTicks(3);
            store(player, 'evidence');
            store(player, evidenceKey);
        } else if (has(player, 'poison_opt2') && !has(player, murderKey)) {
            player.message('@que@The drain seems to have been recently cleaned');
            await world.sleepTicks(3);
            player.message('@que@You can still smell the faint aroma of poison');
            await world.sleepTicks(3);
        } else {
            player.message('Its the drains from the kitchen');
        }
        return;
    }

    if (objectId === SINCLAIR_CREST) {
        if (has(player, 'poison_opt2') && has(player, murderKey)) {
            player.message('@que@It looks like the Sinclair Family Crest');
            await world.sleepTicks(3);
            player.message('@que@but it is very dirty.');
            await world.sleepTicks(3);
            player.message('@que@you can barely make it out under all of the grime');
            await world.sleepTicks(3);
            player.message("@que@Its certainly clear nobodies cleaned it recently.");
            await world.sleepTicks(3);
            store(player, 'evidence');
            store(player, evidenceKey);
        } else if (has(player, 'poison_opt2') && !has(player, murderKey)) {
            player.message('@que@The sinclair family crest');
            await world.sleepTicks(3);
            player.message('@que@its shiny and freshly polished');
            await world.sleepTicks(3);
            player.message('@que@And has a slight smell of poison');
            await world.sleepTicks(3);
        } else {
            player.message('The Sinclair Family Crest is hung up here');
        }
        return;
    }

    if (objectId === SPIDER_WEB) {
        if (has(player, 'poison_opt2') && has(player, murderKey)) {
            player.message('@que@There is a spiders nest here');
            await world.sleepTicks(3);
            player.message(
                '@que@You estimate there must be at least a few hundred spiders ' +
                    'ready to hatch'
            );
            await world.sleepTicks(3);
            player.message("@que@Its certainly clear nobodies used poison here.");
            await world.sleepTicks(3);
            store(player, 'evidence');
            store(player, evidenceKey);
        } else if (has(player, 'poison_opt2') && !has(player, murderKey)) {
            player.message('@que@A faint smell of poison and a few dead spiders');
            await world.sleepTicks(3);
            player.message('@que@is all that remains of the spiders nest');
            await world.sleepTicks(3);
        } else {
            player.message('It looks like a Spiders Nest of some kind');
        }
        return;
    }
}

async function takeFlourFromBarrel(player) {
    const { world } = player;
    player.message('A barrel full of finely sifted flour');
    if (
        !player.inventory.has(POT) &&
        !player.inventory.has(MURDER_SCENE_POT)
    ) {
        player.message('You need something to put the flour in');
    } else if (player.inventory.has(POT)) {
        player.message('You take some flour from the barrel');
        player.inventory.remove(POT);
        player.inventory.add(POT_OF_FLOUR);
        player.message('Theres still plenty of flour left');
    } else if (player.inventory.has(MURDER_SCENE_POT)) {
        player.message("@que@You probably shouldn't use evidence from a crime");
        await world.sleepTicks(3);
        player.message('@que@scene to keep flour in...');
        await world.sleepTicks(3);
    }
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;
    const barrelIds = [
        BARREL_ANNA,
        BARREL_BOB,
        BARREL_CAROL,
        BARREL_DAVID,
        BARREL_ELIZABETH,
        BARREL_FRANK
    ];
    const poisonIds = [
        COMPOST_HEAP,
        FOUNTAIN,
        BEEHIVE,
        DRAIN,
        SINCLAIR_CREST,
        SPIDER_WEB
    ];

    const isHandled =
        barrelIds.includes(id) ||
        poisonIds.includes(id) ||
        id === SACKS ||
        id === FLOUR_BARREL ||
        id === GATE_TO_DOG;

    if (!isHandled) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages.murderMystery || 0;

    if (stage === 0 || stage === -1) {
        player.message('You need the guards permission to do that');
        return true;
    }

    // stage === 1
    if (barrelIds.includes(id)) {
        await searchBarrel(player, id);
        return true;
    }

    if (id === SACKS) {
        player.message('Theres some flypaper in there.');
        player.message('Do you take it?');
        const sack = await player.ask(
            ['Yes, it might be useful', "No, I don't see any need for it"],
            false
        );
        if (sack === 0) {
            player.message('You take a piece of fly paper');
            player.message('There is still plenty of fly paper left');
            player.inventory.add(FLYPAPER, 1);
        } else if (sack === 1) {
            player.message('you leave the paper in the sack');
        }
        return true;
    }

    if (id === GATE_TO_DOG) {
        player.message(
            '@que@As you approach the gate the Guard Dog starts barking loudly at ' +
                'you'
        );
        await world.sleepTicks(3);
        player.message(
            '@que@There is no way an intruder could have committed the murder'
        );
        await world.sleepTicks(3);
        player.message(
            '@que@It must have been someone the dog knew to get past it quietly'
        );
        await world.sleepTicks(3);
        return true;
    }

    if (id === FLOUR_BARREL) {
        await takeFlourFromBarrel(player);
        return true;
    }

    // poison-target objects
    if (id === COMPOST_HEAP) {
        await investigatePoisonObject(player, id, 'murder_anna', 'p_anna2');
    } else if (id === FOUNTAIN) {
        await investigatePoisonObject(player, id, 'murder_eliz', 'p_eliza2');
    } else if (id === BEEHIVE) {
        await investigatePoisonObject(player, id, 'murder_bob', 'p_bob2');
    } else if (id === DRAIN) {
        await investigatePoisonObject(player, id, 'murder_carol', 'p_carol2');
    } else if (id === SINCLAIR_CREST) {
        await investigatePoisonObject(player, id, 'murder_frank', 'p_frank2');
    } else if (id === SPIDER_WEB) {
        await investigatePoisonObject(player, id, 'murder_david', 'p_david2');
    }
    return true;
}

// Using a pot / murder-scene pot on the flour barrel.
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== FLOUR_BARREL) {
        return false;
    }

    const { world } = player;

    if (item.id === MURDER_SCENE_POT) {
        player.message("@que@You probably shouldn't use evidence from a crime");
        await world.sleepTicks(3);
        player.message('@que@scene to keep flour in...');
        await world.sleepTicks(3);
        return true;
    }

    if (item.id === POT) {
        player.message('You take some flour from the barrel');
        player.inventory.remove(POT);
        player.inventory.add(POT_OF_FLOUR);
        player.message('Theres still plenty of flour left');
        return true;
    }

    return false;
}

// item combinations: dust silver with flour, lift prints with flypaper, match
// the murderer's print against a suspect's

// coat-with-flour recipes: [silverItem, flourItem, "sprinkle" msg, "coated" msg]
const FLOUR_RECIPES = [
    [
        A_SILVER_DAGGER,
        A_SILVER_DAGGER_FLOUR,
        'You sprinkle a small amount of flour on the murderweapon',
        'the murderweapon is now coated with a thin layer of flour'
    ],
    [
        ANNAS_SILVER_NECKLACE,
        ANNAS_SILVER_NECKLACE_FLOUR,
        'You sprinkle the flour on Annas Necklace',
        'the necklace is now coated with a thin layer of flour'
    ],
    [
        BOBS_SILVER_TEACUP,
        BOBS_SILVER_TEACUP_FLOUR,
        'You sprinkle the flour on Bobs Cup',
        'the cup is now coated with a thin layer of flour'
    ],
    [
        CAROLS_SILVER_BOTTLE,
        CAROLS_SILVER_BOTTLE_FLOUR,
        'You sprinkle the flour on Carols Bottle',
        'the bottle is now coated with a thin layer of flour'
    ],
    [
        DAVIDS_SILVER_BOOK,
        DAVIDS_SILVER_BOOK_FLOUR,
        'You sprinkle the flour on Davids Book',
        'the book is now coated with a thin layer of flour'
    ],
    [
        ELIZABETHS_SILVER_NEEDLE,
        ELIZABETHS_SILVER_NEEDLE_FLOUR,
        'You sprinkle the flour on Elizabeths Needle',
        'the needle is now coated with a thin layer of flour'
    ],
    [
        FRANKS_SILVER_POT,
        FRANKS_SILVER_POT_FLOUR,
        'You sprinkle the flour on Franks Pot',
        'the pot is now coated with a thin layer of flour'
    ]
];

// lift-print recipes: [flourItem, backToItem, fingerprint, "used" msg, "print" msg]
const FLYPAPER_RECIPES = [
    [
        A_SILVER_DAGGER_FLOUR,
        A_SILVER_DAGGER,
        UNIDENTIFIED_FINGERPRINT,
        'You use the flypaper on the floury dagger',
        'You have a clean impression of the murderers finger prints'
    ],
    [
        ANNAS_SILVER_NECKLACE_FLOUR,
        ANNAS_SILVER_NECKLACE,
        ANNAS_FINGERPRINT,
        'You use the flypaper on the flour covered Necklace',
        'You have a clean impression of Annas finger prints'
    ],
    [
        BOBS_SILVER_TEACUP_FLOUR,
        BOBS_SILVER_TEACUP,
        BOBS_FINGERPRINT,
        'You use the flypaper on the flour covered Cup',
        'You have a clean impression of Bobs finger prints'
    ],
    [
        CAROLS_SILVER_BOTTLE_FLOUR,
        CAROLS_SILVER_BOTTLE,
        CAROLS_FINGERPRINT,
        'You use the flypaper on the flour covered Bottle',
        'You have a clean impression of Carols finger prints'
    ],
    [
        DAVIDS_SILVER_BOOK_FLOUR,
        DAVIDS_SILVER_BOOK,
        DAVIDS_FINGERPRINT,
        'You use the flypaper on the flour covered Book',
        'You have a clean impression of Davids finger prints'
    ],
    [
        ELIZABETHS_SILVER_NEEDLE_FLOUR,
        ELIZABETHS_SILVER_NEEDLE,
        ELIZABETHS_FINGERPRINT,
        'You use the flypaper on the flour covered Needle',
        'You have a clean impression of Elizabeths finger prints'
    ],
    [
        FRANKS_SILVER_POT_FLOUR,
        FRANKS_SILVER_POT,
        FRANKS_FINGERPRINT,
        'You use the flypaper on the flour covered Pot',
        'You have a clean impression of Franks finger prints'
    ]
];

// fingerprint-match table: [suspectPrint, murderKey, name]
const PRINT_MATCH = [
    [DAVIDS_FINGERPRINT, 'murder_david', 'Davids', 'David'],
    [BOBS_FINGERPRINT, 'murder_bob', 'Bobs', 'Bob'],
    [ELIZABETHS_FINGERPRINT, 'murder_eliz', 'Elizabeths', 'Elizabeth'],
    [ANNAS_FINGERPRINT, 'murder_anna', 'Annas', 'Anna'],
    [CAROLS_FINGERPRINT, 'murder_carol', 'Carols', 'Carol'],
    [FRANKS_FINGERPRINT, 'murder_frank', 'Franks', 'Frank']
];

function pair(item1, item2, a, b) {
    return (
        (item1.id === a && item2.id === b) ||
        (item1.id === b && item2.id === a)
    );
}

async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    // 1. silver item + pot of flour -> coated
    for (const [silver, coated, msg1, msg2] of FLOUR_RECIPES) {
        if (pair(item1, item2, silver, POT_OF_FLOUR)) {
            player.message(msg1);
            player.message(msg2);
            player.inventory.remove(POT_OF_FLOUR);
            player.inventory.add(POT);
            player.inventory.remove(silver);
            player.inventory.add(coated);
            return true;
        }
    }

    // murder-scene pot + pot of flour -> nothing (not shiny enough)
    if (pair(item1, item2, MURDER_SCENE_POT, POT_OF_FLOUR)) {
        player.message(
            'You sprinkle a small amount of flour on the strange smelling pot'
        );
        player.message(
            "The surface isn't shiny enough to take a fingerprint from"
        );
        player.inventory.remove(POT_OF_FLOUR);
        player.inventory.add(POT);
        return true;
    }

    // 2. flour-coated item + flypaper -> fingerprint
    for (const [coated, back, print, msg1, msg2] of FLYPAPER_RECIPES) {
        if (pair(item1, item2, coated, FLYPAPER)) {
            player.message(msg1);
            player.message(msg2);
            player.inventory.remove(coated);
            player.inventory.add(back);
            player.inventory.add(print);
            player.inventory.remove(FLYPAPER);
            return true;
        }
    }

    // 3. unidentified (murderer's) fingerprint + a suspect's fingerprint
    const suspectPrints = PRINT_MATCH.map((p) => p[0]);
    const isMatchCombo =
        (item1.id === UNIDENTIFIED_FINGERPRINT &&
            suspectPrints.includes(item2.id)) ||
        (item2.id === UNIDENTIFIED_FINGERPRINT &&
            suspectPrints.includes(item1.id));

    if (isMatchCombo) {
        const suspectPrint =
            item1.id === UNIDENTIFIED_FINGERPRINT ? item2.id : item1.id;
        const entry = PRINT_MATCH.find((p) => p[0] === suspectPrint);
        const [print, murderKey, possessive, name] = entry;

        if (has(player, murderKey)) {
            player.message(
                `The fingerprints are an exact match to ${possessive}`
            );
            player.inventory.remove(UNIDENTIFIED_FINGERPRINT);
            player.inventory.add(MURDERERS_FINGERPRINT);
            if (!has(player, 'culprit')) {
                store(player, 'culprit');
            }
        } else {
            player.message("They don't seem to be the same");
            player.inventory.remove(print);
            player.message(`I guess that clears ${name} of the crime`);
            await world.sleepTicks(2);
            player.message('You destroy the useless fingerprint');
        }
        return true;
    }

    return false;
}

module.exports = {
    onTalkToNPC,
    onGroundItemTake,
    onWallObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onUseWithInventory
};
