// waterfall quest (members)
//
// questStages.waterfallQuest:
//   0/undefined = not started
//   1 = agreed to help almera, may take the raft
//   2 = spoken to hudon (refuses to leave)
//   3 = read the book on baxtorian
//   4 = entered glarial's tomb via the pebble
//  -1 = complete

const { questsEnabled } = require('../../custom-gate.js');

// npc ids
const ALMERA_ID = 470;
const HUDON_ID = 471;
const HADLEY_ID = 472;
const GOLRIE_ID = 475;
const GERALD_ID = 481;

// item ids
const GLARIALS_PEBBLE_ID = 787;
const GLARIALS_AMULET_ID = 782;
const GLARIALS_URN_ID = 805;
const GLARIALS_URN_EMPTY_ID = 806;
const BOOK_ON_BAXTORIAN_ID = 788;
const LARGE_KEY_ID = 789;
const AN_OLD_KEY_ID = 797;
const ROPE_ID = 237;

const AIR_RUNE_ID = 33;
const WATER_RUNE_ID = 32;
const EARTH_RUNE_ID = 34;

const MITHRIL_SEED_ID = 796;
const GOLD_BAR_ID = 172;
const DIAMOND_ID = 161;

// reward: 1 quest point; attack + strength xp are level-scaled (base*900+1000)
const QUEST_POINTS = 1;

// six rune stands, keyed by object id, charged before the statue puzzle
const STONE_STAND_IDS = [473, 474, 475, 476, 477, 478];

// tick delay between mes() calls
const MES_DELAY = 3;

// almera
async function talkToAlmera(player, npc) {
    const stage = player.questStages.waterfallQuest || 0;

    switch (stage) {
        case 0: {
            await player.say('hello madam');
            await npc.say(
                'ah, hello there',
                'nice to see an outsider for a change',
                'are you busy young man?, i have a problem'
            );

            const option = await player.ask(
                ["i'm afraid i'm in a rush", 'how can i help?'],
                true
            );

            if (option === 0) {
                await npc.say('oh okay, never mind');
            } else if (option === 1) {
                await npc.say(
                    "it's my son hudon, he's always getting into trouble",
                    "the boy's convinced there's hidden treasure in the river",
                    "and i'm a bit worried about his safety",
                    "the poor lad can't even swim"
                );
                await player.say(
                    'i could go and take a look for you if you like'
                );
                await npc.say(
                    'would you kind sir?',
                    'you can use the small raft out back if you wish',
                    'do be careful, the current down stream is very strong'
                );
                player.questStages.waterfallQuest = 1;
            }
            break;
        }
        case 1:
            await player.say('hello almera');
            await npc.say('hello brave adventurer', 'have you seen my boy yet?');
            await player.say(
                "i'm afraid not, but i'm sure he hasn't gone far"
            );
            await npc.say(
                'i do hope so',
                "you can't be too careful these days"
            );
            break;
        case 2:
            await npc.say("well hello, you're still around then");
            await player.say(
                'i saw hudon by the river but he refused to come back with me'
            );
            await npc.say(
                'yes he told me',
                'the foolish lad came in drenched to the bone',
                "he had fallen into the waterfall, lucky he wasn't killed",
                'now he can spend the rest of the summer in his room'
            );
            await player.say(
                'any ideas on what i could do while i\'m here?'
            );
            await npc.say(
                'why don\'t you visit the tourist centre south of the ' +
                    'waterfall?'
            );
            break;
        case 3:
            await player.say('hello again almera');
            await npc.say(
                'well hello again brave adventurer',
                'are you enjoying the tranquil scenery of these parts?'
            );
            await player.say('yes, very relaxing');
            await npc.say(
                "well i'm glad to hear it",
                'the authorities wanted to dig up this whole area for a mine',
                "but the few locals who lived here wouldn't budge and they " +
                    'gave up'
            );
            await player.say('good for you');
            await npc.say('good for all of us');
            break;
        case 4:
        case -1:
            await player.say('hello almera');
            await npc.say(
                'hello adventurer',
                "how's your treasure hunt going?"
            );
            await player.say("oh, i'm just sight seeing");
            await npc.say(
                'no adventurer stays here this long just to sight see',
                'but your business is yours alone',
                'if you need to use the raft go ahead',
                'but please try not crash it this time'
            );
            await player.say('thanks almera');
            break;
    }
}

// hudon
async function talkToHudon(player, npc) {
    const stage = player.questStages.waterfallQuest || 0;

    switch (stage) {
        case 0:
            await player.say('hello there');
            await npc.say('what do you want?');
            await player.say('nothing, just passing by');
            break;
        case 1:
            await player.say('Hello hudon', 'hello son, are you alright?');
            await npc.say(
                "don't play nice with me",
                "i know your looking for the treasure to"
            );
            await player.say('your mother sent me to find you hudon');
            await npc.say(
                "i'll go home when i've found the treasure",
                "i'm going to be a rich rich man"
            );
            await player.say('where is this treasure you talk of?');
            await npc.say(
                "just because i'm small doesn't mean i'm dumb",
                "if i told you, then you'd take it all for yourself"
            );
            await player.say('maybe i could help?');
            await npc.say(
                'if you want to help go and tell my mother that i won\'t be ' +
                    'back for a while'
            );
            player.message('@que@hudon is refusing to leave the waterfall');
            await player.world.sleepTicks(MES_DELAY);
            await player.say("ok i'll leave you to it");
            player.questStages.waterfallQuest = 2;
            break;
        case 2:
            await player.say('so your still here');
            await npc.say(
                "i'll find that treasure soon",
                'just you wait and see'
            );
            break;
        case 3:
            await player.say('hello hudon');
            await npc.say(
                "oh it's you",
                'trying to find my treasure again are you?'
            );
            await player.say("i didn't know it belonged to you");
            await npc.say(
                'it will do when i find it',
                'i just need to get into this blasted waterfall',
                "i've been washed downstream three times already"
            );
            break;
        case 4:
            await player.say('hello again');
            await npc.say("not you still, why don't you give up?");
            await player.say('and miss all the fun!');
            await npc.say(
                'you do understand that anything you find you have to share ' +
                    'it with me'
            );
            await player.say("why's that?");
            await npc.say('because i told you about the treasure');
            await player.say("well, i wouldn't count on it");
            await npc.say("that's not fair");
            await player.say('neither is life kid');
            break;
        case -1:
            await player.say('hello again');
            await npc.say('you stole my treasure i saw you');
            await player.say("i'll make sure it goes to a good cause");
            await npc.say('hmmmm');
            break;
    }
}

// gerald
async function talkToGerald(player, npc) {
    if ((player.questStages.waterfallQuest || 0) === 0) {
        await player.say('hello there');
        await npc.say(
            'good day to you traveller',
            'are you here to fish or just looking around?',
            "i've caught some beauties down here"
        );
        await player.say('really');
        await npc.say('the last one was this big');
        player.message('@que@gerald stretches his arms out to full width');
        await player.world.sleepTicks(MES_DELAY);
    } else {
        await player.say('hello');
        await npc.say(
            'hello traveller',
            'are you here to fish or to hunt for treasure?'
        );
        await player.say('why do you say that?');
        await npc.say(
            'adventurers pass through here every week',
            'they never find anything though'
        );
    }
}

// hadley (tourist guide) - two dialogue trees plus recursive menu
// options: ALL = -1, WHAT_HAPPENED = 0, WHERE_ELSE = 1, IS_THERE_TREAS = 2
const HADLEY = {
    ALL: -1,
    WHAT_HAPPENED: 0,
    WHERE_ELSE: 1,
    IS_THERE_TREAS: 2
};

// rebuilds the option menu, drops discardOp, returns the canonical index (0..3)
async function hadleyMainMenuOptions(player, discardOp) {
    let menuOpts;

    if (discardOp === 0) {
        menuOpts = [
            'where else is worth visiting around here?',
            'is there treasure under the waterfall?',
            'thanks then, goodbye'
        ];
    } else if (discardOp === 1) {
        menuOpts = [
            'can you tell me what happened to the elf king?',
            'is there treasure under the waterfall?',
            'thanks then, goodbye'
        ];
    } else if (discardOp === 2) {
        menuOpts = [
            'can you tell me what happened to the elf king?',
            'where else is worth visiting around here?',
            'thanks then, goodbye'
        ];
    } else if (discardOp === 3) {
        menuOpts = [
            'can you tell me what happened to the elf king?',
            'where else is worth visiting around here?',
            'is there treasure under the waterfall?'
        ];
    } else {
        menuOpts = [
            'can you tell me what happened to the elf king?',
            'where else is worth visiting around here?',
            'is there treasure under the waterfall?',
            'thanks then, goodbye'
        ];
    }

    let choice = await player.ask(menuOpts, true);

    if (discardOp !== -1 && choice >= discardOp) {
        choice = choice + 1;
    }

    return choice;
}

async function hadleyMainDialogue(player, npc, cID) {
    if (cID === -1) {
        await player.say('hello there');
        await npc.say(
            "are you on holiday?, if so you've come to the right place",
            "i'm hadley the tourist guide, anything you need to know just " +
                'ask me',
            'we have some of the most unspoilt wildlife and scenery in ' +
                'runescape',
            'people come from miles around to fish in the clear lakes',
            'or to wander the beautiful hill sides'
        );
        await player.say('it is quite pretty');
        await npc.say(
            'surely pretty is an understatement kind sir',
            'beautiful, amazing or possibly life changing would be more ' +
                'suitable wording',
            'have your seen the baxtorian waterfall?',
            "it's named after the elf king who was buried beneath"
        );
        cID = await hadleyMainMenuOptions(player, HADLEY.ALL);
    }

    // can you tell me what happened to the elf king?
    if (cID === 0) {
        await npc.say(
            'there are many myths about baxtorian',
            'One popular story is this',
            'after defending his kingdom against the invading dark forces ' +
                'from the west',
            'baxtorian returned to find his wife glarial had been captured ' +
                'by the enemy',
            'this destroyed baxtorian, after years of searching he reclused',
            'to the secret home he had made for glarial under the waterfall',
            'he never came out and it is told that only glarial could enter'
        );
        await player.say('what happened to him?');
        await npc.say(
            "oh, i don't know",
            'i believe we have some pages on him upstairs in our archives',
            "if you wish to look at them please be careful, they're all " +
                'pretty delicate'
        );
        cID = await hadleyMainMenuOptions(player, HADLEY.WHAT_HAPPENED);
    } else if (cID === 1) {
        // where else is worth visiting around here?
        await npc.say(
            "there's a lovely spot for a picnic on the hill to the north east",
            'there lies a monument to the deceased elven queen glarial',
            'it really is quite pretty'
        );
        await player.say('who was queen glarial?');
        await npc.say(
            'baxtorians wife, the only person who could also enter the ' +
                'waterfall',
            'she was queen when this land was inhabited by elven kind',
            'glarial was kidnapped while buxtorian was away',
            'but they eventually recovered her body and brought her home to ' +
                'rest'
        );
        await player.say("that's sad");
        await npc.say(
            "true, i believe there's some information about her upstairs",
            'if you look at them please be careful'
        );
        cID = await hadleyMainMenuOptions(player, HADLEY.WHERE_ELSE);
    } else if (cID === 2) {
        // is there treasure under the waterfall?
        await npc.say(
            'ha ha, another treasure hunter',
            "well if there is no one's been able to get to it",
            "they've been searching that river for decades, all to no avail"
        );
        cID = await hadleyMainMenuOptions(player, HADLEY.IS_THERE_TREAS);
    } else if (cID === 3) {
        // thanks then, goodbye
        await npc.say('enjoy your visit');
        return;
    }

    if (cID >= 0) {
        await hadleyMainDialogue(player, npc, cID);
    }
}

// alternate menu, drops discardOp (the nature option)
async function hadleyAltMenuOptions(player, discardOp) {
    let menuOpts;

    if (discardOp === 0) {
        menuOpts = [
            'where else is worth visiting around here?',
            'i don\'t like nature, it gives me a rash',
            'thanks then, goodbye'
        ];
    } else if (discardOp === 1) {
        menuOpts = [
            'what happened to the elf king?',
            'i don\'t like nature, it gives me a rash',
            'thanks then, goodbye'
        ];
    } else if (discardOp === 2) {
        menuOpts = [
            'what happened to the elf king?',
            'where else is worth visiting around here?',
            'thanks then, goodbye'
        ];
    } else if (discardOp === 3) {
        menuOpts = [
            'what happened to the elf king?',
            'where else is worth visiting around here?',
            'i don\'t like nature, it gives me a rash'
        ];
    } else {
        menuOpts = [
            'what happened to the elf king?',
            'where else is worth visiting around here?',
            'i don\'t like nature, it gives me a rash',
            'thanks then, goodbye'
        ];
    }

    let choice = await player.ask(menuOpts, true);

    if (discardOp !== -1 && choice >= discardOp) {
        choice = choice + 1;
    }

    return choice;
}

async function hadleyAltDialogue(player, npc, cID) {
    if (cID === -1) {
        await player.say('hello there');
        await npc.say(
            'well hello, come in, come in',
            "my names hadley, i'm head of tourism here in hemenster",
            "there's some of the most unspoilt wildlife and scenery in " +
                'runescape here',
            'people come from miles around to fish in the clear lakes',
            'or to wander the beautiful hill sides'
        );
        await player.say('it is quite pretty');
        await npc.say(
            'surely pretty is an understatement kind sir',
            'beautiful, amazing or possibly life changing would be more ' +
                'suitable wording',
            'have your seen the baxtorian waterfall',
            "it's quite a sight",
            'named after the elf king who was buried beneath'
        );
        cID = await hadleyAltMenuOptions(player, HADLEY.ALL);
    }

    // what happened to the elf king?
    if (cID === 0) {
        await npc.say(
            'baxtorian, i guess he died a long long time ago',
            "it's quite sad really",
            'after defending his kingdom against the invading dark forces ' +
                'from the west',
            'baxtorian returned to find his beautiful wife glarial had been ' +
                'captured',
            'this destroyed baxtorian, after years of searching he became a ' +
                'recluse',
            'in the secret home he had made for glarial under the waterfall',
            'he never came out and to this day no one has managed to get in'
        );
        await player.say('what happened to him?');
        await npc.say('no one knows');
        cID = await hadleyAltMenuOptions(player, HADLEY.WHAT_HAPPENED);
    } else if (cID === 1) {
        // where else is worth visiting around here?
        await npc.say(
            'well, there\'s a wide variety wildlife',
            "although unfortunately most of it's quite dangerous",
            "please don't feed the goblins"
        );
        await player.say('ok');
        await npc.say(
            'there is a lovely spot for a picnic on the hill to the north east',
            "there's a monument to the deceased elven queen glarial",
            'it really is quite pretty'
        );
        cID = await hadleyAltMenuOptions(player, HADLEY.WHERE_ELSE);
    } else if (cID === 2) {
        // i don't like nature, it gives me a rash
        await npc.say("that's just silly talk");
        return;
    } else if (cID === 3) {
        // thanks then, goodbye
        await npc.say('enjoy your visit');
        return;
    }

    if (cID >= 0) {
        await hadleyAltDialogue(player, npc, cID);
    }
}

async function hadleyBookDialogue(player, npc) {
    await player.say('hello there');
    await npc.say(
        "i hope you're enjoying your stay",
        'there should be lots of useful infomation in that book',
        'places to go, people to see'
    );

    const cID = await hadleyMainMenuOptions(player, HADLEY.ALL);

    if (cID >= 0) {
        await hadleyMainDialogue(player, npc, cID);
    }
}

async function talkToHadley(player, npc) {
    const stage = player.questStages.waterfallQuest || 0;

    if (stage === 0 || stage === 1) {
        await hadleyAltDialogue(player, npc, HADLEY.ALL);
    } else if (player.inventory.has(BOOK_ON_BAXTORIAN_ID)) {
        await hadleyBookDialogue(player, npc);
    } else {
        await hadleyMainDialogue(player, npc, HADLEY.ALL);
    }
}

// golrie (tree gnome village dungeon)
async function talkToGolrie(player, npc) {
    if (!player.inventory.has(GLARIALS_PEBBLE_ID)) {
        await player.say('is your name golrie?');
        await npc.say(
            "that's me",
            "i've been stuck in here for weeks",
            'those goblins are trying to steal my families heirlooms',
            'my grandad gave me all sorts of old junk'
        );
        await player.say('do you mind if i have a look?');
        await npc.say('no, of course not');
        player.message('@que@mixed with the junk on the floor');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@you find glarials pebble');
        await player.world.sleepTicks(MES_DELAY);
        player.inventory.add(GLARIALS_PEBBLE_ID, 1);
        await player.say('could i take this old pebble?');
        await npc.say(
            'oh that, yes have it',
            "it's just some old elven junk i believe"
        );
        player.inventory.remove(LARGE_KEY_ID, 1);
        player.message('@que@you give golrie the key');
        await player.world.sleepTicks(MES_DELAY);
        await npc.say(
            'well thanks again for the key',
            "i think i'll wait in here until those goblins get bored and leave"
        );
        await player.say('okay, take care golrie');

        if (!player.cache.golrie_key) {
            player.cache.golrie_key = true;
        }
    } else {
        await player.say('is your name golrie?');
        await npc.say(
            "that's me",
            "i've been stuck in here for weeks",
            'those goblins are trying to steal my families heirlooms',
            'my grandad gave me all sorts of old junk'
        );
        await player.say('do you mind if i have a look?');
        await npc.say('no, of course not');
        player.inventory.remove(LARGE_KEY_ID, 1);
        player.message('@que@you find nothing of interest');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@you give golrie the key');
        await player.world.sleepTicks(MES_DELAY);
        await npc.say(
            'thanks a lot for the key traveller',
            "i think i'll wait in here until those goblins get bored and leave"
        );
        await player.say('okay, take care golrie');

        if (!player.cache.golrie_key) {
            player.cache.golrie_key = true;
        }
    }
}

// handler
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (npc.id) {
        case ALMERA_ID:
            player.engage(npc);
            await talkToAlmera(player, npc);
            player.disengage();
            return true;
        case HUDON_ID:
            player.engage(npc);
            await talkToHudon(player, npc);
            player.disengage();
            return true;
        case GERALD_ID:
            player.engage(npc);
            await talkToGerald(player, npc);
            player.disengage();
            return true;
        case HADLEY_ID:
            player.engage(npc);
            await talkToHadley(player, npc);
            player.disengage();
            return true;
        case GOLRIE_ID:
            player.engage(npc);
            await talkToGolrie(player, npc);
            player.disengage();
            return true;
        default:
            return false;
    }
}

module.exports = {
    onTalkToNPC,

    // shared ids consumed by the object / mechanism files
    ALMERA_ID,
    HUDON_ID,
    HADLEY_ID,
    GOLRIE_ID,
    GERALD_ID,
    GLARIALS_PEBBLE_ID,
    GLARIALS_AMULET_ID,
    GLARIALS_URN_ID,
    GLARIALS_URN_EMPTY_ID,
    BOOK_ON_BAXTORIAN_ID,
    LARGE_KEY_ID,
    AN_OLD_KEY_ID,
    ROPE_ID,
    AIR_RUNE_ID,
    WATER_RUNE_ID,
    EARTH_RUNE_ID,
    MITHRIL_SEED_ID,
    GOLD_BAR_ID,
    DIAMOND_ID,
    STONE_STAND_IDS,
    QUEST_POINTS,
    MES_DELAY
};
