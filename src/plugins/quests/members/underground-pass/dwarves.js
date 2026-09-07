// underground pass - kamen, niloof, klank: dialogue, stage checks, item gifts, doll/journal hand-offs

const { questsEnabled } = require('../../custom-gate.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

async function kamen(player, npc) {
    const { world } = player;
    const stage = getStage(player);
    if (stage === 5 || stage === 6 || stage === 7 || stage === 8 || stage === -1) {
        player.message('@que@the dwarf is leaning on a barrel of home made brew');
        await world.sleepTicks(3);
        player.message('he looks a little drunk');
        await player.say('hi there, you ok?');
        await npc.say('ooooh, my head ...im gone');
        await player.say("what's wrong?");
        await npc.say(
            'to much of this home brew my friend',
            'we make from plant roots',
            'but it blows your head off',
            "you don't wanna put it near any naked flames",
            'want some?'
        );
        const menu = await player.ask(['ok then', 'no thanks'], true);
        if (menu === 0) {
            await npc.say('here you go');
            player.message('you take a sip of brew from kamens glass');
            player.damage(5);
            await player.say('aaarrgghh');
            player.message('it tastse horrific and burns your throat');
            await npc.say('ha ha', "i warned you that it's strong stuff");
        } else if (menu === 1) {
            await npc.say('your losh');
        }
    }
}

async function niloof(player, npc) {
    const stage = getStage(player);
    switch (stage) {
        case 5:
            await npc.say('back away..back away..wait..', '..you\'re human!');
            await player.say(
                "that's right, i'm on a quest for king lathas",
                'we need to find a way through these caverns'
            );
            await npc.say(
                'ha ha, listen up, we came here as miners decades ago',
                'completely unaware of the evil that lurked in the caverns',
                "there's no way through, not while iban still rules",
                'he controls the gateway,the only way to the other side'
            );
            await player.say('what gateway?');
            await npc.say(
                "it once stood as the the 'well of voyage'",
                'a gateway to west runescape',
                'now ibans moulded it into a pit of the damned',
                'a portal to zamoraks darkest realms',
                'he sends his followers there, never to return',
                'only once iban is destroyed can the well be restored'
            );
            await player.say('but how?');
            await npc.say(
                'if i knew, i would have slain him already',
                'seek out the witch, his guide , his only confidante',
                'only she knows how to rid us of iban',
                'she lives on the platforms above, we dare not go there',
                'here, take some food to aid your journey'
            );
            player.message('Niloof give you some food');
            player.inventory.add(IDS.MEAT_PIE, 2);
            player.inventory.add(IDS.CHOCOLATE_BOMB, 1);
            player.inventory.add(IDS.MEAT_PIZZA, 1);
            await player.say('thanks niloof, take care');
            await npc.say('you too');
            player.questStages[QUEST_KEY] = 6;
            break;
        case 6:
            if (player.cache.doll_of_iban) {
                await player.say("niloof, i found the witch's house");
                await npc.say('and...?');
                if (
                    player.inventory.has(IDS.A_DOLL_OF_IBAN) &&
                    !player.inventory.has(IDS.OLD_JOURNAL)
                ) {
                    await npc.say(
                        'i found this old book',
                        "i'm not sure if it's of any use to you traveller"
                    );
                    player.inventory.add(IDS.OLD_JOURNAL, 1);
                    return;
                } else if (!player.inventory.has(IDS.A_DOLL_OF_IBAN)) {
                    await player.say(
                        'i found a strange doll and a book',
                        "but i've lost the doll"
                    );
                    await npc.say("well it's a good job i found it");
                    player.inventory.add(IDS.A_DOLL_OF_IBAN, 1);
                    await npc.say(
                        'the witches rag doll, this here be black magic traveller',
                        'mixed with the right ingredients the doll can inflict serious harm',
                        'these four elements of being are guarded somewhere in this cave',
                        'his shadow, his flesh, his conscience and his blood',
                        'if you can retrieve these,combined with the doll...',
                        'you will be able destroy iban...',
                        "and ressurect the 'well of voyage'"
                    );
                    if (!player.inventory.has(IDS.OLD_JOURNAL)) {
                        await npc.say(
                            'i found this old book',
                            "i'm not sure if it's of any use to you traveller"
                        );
                        player.inventory.add(IDS.OLD_JOURNAL, 1);
                    }
                    return;
                }
                await player.say('i found a strange book and this..');
                player.message('you show niloof the strange doll');
                await npc.say(
                    'the witches rag doll, this here be black magic traveller'
                );
                await npc.say('iban was magically conjured in that very item');
                await npc.say(
                    'his four elements of bieng are guarded somewhere in this cave'
                );
                await npc.say('his shadow, his flesh, his conscience and his blood');
                await npc.say('if you can retrieve these, with the flask...');
                await npc.say('you will be able destroy iban...');
                await npc.say("and ressurect the 'well of voyage'");
            } else {
                await player.say('hello niloof');
                await npc.say('so you still live, not many survive down here');
                await player.say('as i can see');
                await npc.say(
                    "don't stay too long traveller",
                    'ibans calls will soon penetrate your delicate human mind',
                    "and you'll also become one of his minions",
                    'you must go above and find the witch kardia',
                    'she holds the secret to ibans destruction'
                );
            }
            break;
        case 7:
            await player.say('hi niloof');
            await npc.say(
                "traveller, thank the stars you're still around",
                'i thought your time had come'
            );
            await player.say("i've still a few years in me yet");
            if (!player.inventory.has(IDS.A_DOLL_OF_IBAN)) {
                await npc.say('i found something i think you need traveller');
                await player.say('the doll?');
                await npc.say('i found it while slaying some of the souless, here');
                player.message('niloof gives you the doll of iban');
                player.inventory.add(IDS.A_DOLL_OF_IBAN, 1);
            }
            await player.say("it's about time i delt with iban");
            await npc.say(
                "good luck to you, you'll need it",
                'may the strength of the elders be with you'
            );
            await player.say('take care niloof');
            break;
        case 8:
        case -1:
            player.message('the dwarf seems to be busy');
            break;
    }
}

async function klank(player, npc) {
    const stage = getStage(player);
    if (stage === 5 || stage === 6) {
        if (player.cache.doll_of_iban) {
            await player.say('hi klank');
            await npc.say('traveller,I hear you plan to destroy iban');
            await player.say("that's right");
            await npc.say(
                'i have a gift for you, they may help',
                'i crafted these long ago to protect myself...',
                'from the teeth of the souless, their bite is vicous',
                "i haven't seen a another pair which can with stand their jaws"
            );
            player.message('klank gives you a pair of gaunlets');
            player.inventory.add(IDS.KLANKS_GAUNTLETS, 1);
            player.message('and a tinderbox');
            player.inventory.add(IDS.TINDERBOX, 1);
            await player.say('thanks klank');
            await npc.say('good luck traveller, give iban a slap for me');
        } else {
            await player.say('hello my good man');
            await npc.say(
                'Good day to you outsider',
                "i'm klank, i'm the only blacksmith still alive down here",
                "infact we're the only ones that haven't yet turned",
                "if you're not carefull you'll become one of them too"
            );
            await player.say('who?.. ibans followers');
            await npc.say(
                "they're not followers, they're slaves, they're the souless"
            );
            const menu = await player.ask(
                [
                    'what happened to them?',
                    'no wonder their breath was soo bad'
                ],
                false
            );
            if (menu === 0) {
                await player.say('what happened to them?');
                await npc.say(
                    'they were normal once, adventurers, treasure hunters',
                    "but men are weak, they couldn't ignore the vocies",
                    'now they all seem to think with one conscience..',
                    "as if they're being controlled by one being"
                );
                await player.say('iban?');
                await npc.say(
                    'maybe?... maybe zamorak himself',
                    'those who try and fight it...',
                    'iban locks in cages, until their minds are too weak to resist',
                    'eventually they all fall to his control',
                    "here take this, i don't need it"
                );
                player.message('klank gives you a tinderbox');
                player.inventory.add(IDS.TINDERBOX, 1);
            } else if (menu === 1) {
                await player.say("no wonder they're breath was soo bad");
                await npc.say('you think this is funny.. eh');
                await player.say(
                    'not really, just trying to lighten up the conversation'
                );
                await npc.say("here take this, i don't need it");
                player.message('klank gives you a tinderbox');
                player.inventory.add(IDS.TINDERBOX, 1);
            }
        }
    } else if (stage === 7 || stage === 8 || stage === -1) {
        await player.say('hello klank');
        await npc.say("hello again adventurer, so you're still around");
        await player.say('still here!');
        const menu = await player.ask(
            ['have you anymore gauntlets?', 'take care klank'],
            true
        );
        if (menu === 0) {
            await npc.say(
                "well..yes, but they're not cheap to make",
                "i'll have to sell you a pair"
            );
            await player.say('how much?');
            await npc.say('5000 coins');
            const menu2 = await player.ask(
                ['5000, you must be joking', "ok then, i'll take a pair"],
                true
            );
            if (menu2 === 0) {
                await npc.say("we don't joke down here, friend");
            } else if (menu2 === 1) {
                if (player.inventory.has(IDS.COINS, 5000)) {
                    player.message('you give klank 5000 coins...');
                    player.inventory.remove(IDS.COINS, 5000);
                    player.message('...and klank gives you a pair of guanletts');
                    player.inventory.add(IDS.KLANKS_GAUNTLETS, 1);
                    await npc.say('there you go..i hope they help');
                    await player.say("i'll see you around klank");
                } else {
                    await player.say("oh dear, i haven't enough money");
                    await npc.say("sorry, i can't sell them any cheaper than that");
                }
            }
        } else if (menu === 1) {
            await npc.say('you too adventurer');
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (npc.id) {
        case IDS.KAMEN:
            player.engage(npc);
            await kamen(player, npc);
            player.disengage();
            return true;
        case IDS.NILOOF:
            player.engage(npc);
            await niloof(player, npc);
            player.disengage();
            return true;
        case IDS.KLANK:
            player.engage(npc);
            await klank(player, npc);
            player.disengage();
            return true;
        default:
            return false;
    }
}

module.exports = { onTalkToNPC };
