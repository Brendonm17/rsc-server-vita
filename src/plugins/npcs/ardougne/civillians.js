// three west ardougne civilians (apron / attackable / pickpocket) that react to
// whichever cat item the player carries; only the plain Cat branch leads anywhere

const ItemId = {
    CAT: 1119,
    KITTEN: 1096,
    KARDIA_CAT: 1003,
    GERTRUDES_CAT: 1093, // fluffs
    KITTENS: 1095, // fluffs's kittens
    DEATH_RUNE: 38
};

const NpcId = {
    CIVILLIAN_APRON: 731,
    CIVILLIAN_ATTACKABLE: 729,
    CIVILLIAN_PICKPOCKET: 732
};

const CIVILLIAN_IDS = new Set(Object.values(NpcId));

// extended cats behavior flag; defaults off
function wantExtendedCatsBehavior(player) {
    const config = player.world.server.config;
    return !!(config && config.wantExtendedCatsBehavior);
}

async function civilianWantCatDialogue(player, npc) {
    const menu = await player.ask(
        [
            'i have a cat that i could sell',
            "nope, they're not easy to get hold of"
        ],
        true
    );

    if (menu === 0) {
        await npc.say('you don\'t say, can i see it');
        player.message('you reveal the cat in your satchel');
        await npc.say(
            'hmmm, not bad, not bad at all',
            "looks like it's a lively one"
        );
        await player.say('erm ...kind of!');
        await npc.say(
            "i don't have much in the way of money...",
            'but i do have these...'
        );
        player.message('the peasent shows you a sack of death runes');
        await npc.say(
            'the dwarfs bring them from the mine for us',
            "tell you what, i'll give you 25 death runes for the cat"
        );

        const subMenu = await player.ask(
            [
                "nope, i'm not parting for that",
                "ok then, you've got a deal"
            ],
            true
        );

        if (subMenu === 0) {
            await npc.say("well, i'm not giving you anymore");
        } else if (subMenu === 1) {
            player.message('you hand over the cat');

            if (player.inventory.has(ItemId.CAT)) {
                player.inventory.remove(ItemId.CAT);
                player.message('you are given 25 death runes');
                player.inventory.add(ItemId.DEATH_RUNE, 25);
                await npc.say('great, thanks for that');
                await player.say("that's ok, take care");
            }
        }
    }
}

async function civilianShowKittenDialogue(player, npc) {
    const menu = await player.ask(
        [
            'i have a kitten that i could sell',
            "nope, they're not easy to get hold of"
        ],
        true
    );

    if (menu === 0) {
        await npc.say('really, lets have a look');
        player.message('you reveal the kitten in your satchel');
        await npc.say(
            "hah, that little thing won't catch any mice",
            'i need a fully grown cat'
        );
    }
}

async function civilianShowKardiasCatDialogue(player, npc, path) {
    await player.say(`i have a cat..look${path === 1 ? '!' : ''}`);
    await npc.say(
        "hmmm..doesn't look like it's seen daylight in years",
        "that's not going to catch any mice"
    );
}

// no known method to obtain gertrudes cat
async function civilianShowGertrudesCatDialogue(player, npc, path) {
    await player.say(`i have a cat..look${path === 1 ? '!' : ''}`);
    await npc.say(
        "hmmm..doesn't look like it belongs to you",
        'i cannot buy it'
    );
}

// dead-end branch, no known trigger
async function civilianShowFluffsKittensDialogue(player, npc, path) {
    await player.say(`i have some kittens..look${path === 1 ? '!' : ''}`);
    await npc.say(
        "hmmm..doesn't look like they are happy",
        'better return them where they were'
    );
}

async function reactToCats(player, npc, path) {
    const hasCat = player.inventory.has(ItemId.CAT);
    const hasKitten = player.inventory.has(ItemId.KITTEN);
    const hasKardiasCat = player.inventory.has(ItemId.KARDIA_CAT);
    const hasGertrudesCat = player.inventory.has(ItemId.GERTRUDES_CAT);
    const hasFluffsKittens = player.inventory.has(ItemId.KITTENS);
    const extendedCats = wantExtendedCatsBehavior(player);

    const hasAnyCat =
        hasCat ||
        hasKitten ||
        hasKardiasCat ||
        hasGertrudesCat ||
        (hasFluffsKittens && extendedCats);

    if (!hasAnyCat) {
        return false;
    }

    if (hasCat) {
        await civilianWantCatDialogue(player, npc);
    } else if (hasKitten) {
        await civilianShowKittenDialogue(player, npc);
    } else if (hasKardiasCat) {
        await civilianShowKardiasCatDialogue(player, npc, path);
    } else if (hasGertrudesCat) {
        await civilianShowGertrudesCatDialogue(player, npc, path);
    } else if (hasFluffsKittens && extendedCats) {
        await civilianShowFluffsKittensDialogue(player, npc, path);
    }

    return true;
}

async function onTalkToNPC(player, npc) {
    if (!CIVILLIAN_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    switch (npc.id) {
        case NpcId.CIVILLIAN_APRON:
            await player.say('hi');
            await npc.say('good day to you traveller');
            await player.say('what are you up to?');
            await npc.say(
                'chasing mice as usual...',
                "...it's all i seem to do"
            );
            await player.say('you must waste alot of time');
            await npc.say(
                'yep, but what can you do?',
                "it's not like there's many cats around here"
            );
            if (!(await reactToCats(player, npc, 1))) {
                await player.say("no you're right, you don't see many around");
            }
            break;

        case NpcId.CIVILLIAN_ATTACKABLE:
            await player.say('hello there');
            await npc.say("oh hello, i'm sorry, i'm a bit worn out");
            await player.say('busy day?');
            await npc.say(
                "oh, it's those bleeding mice, they're everywhere",
                'what i really need is a cat, but they\'re hard to come by nowadays'
            );
            if (!(await reactToCats(player, npc, 0))) {
                await player.say("no, you're right, you don't see many around");
            }
            break;

        case NpcId.CIVILLIAN_PICKPOCKET:
            await player.say('hello');
            await npc.say("i'm a bit busy to talk, sorry");
            await player.say('what are you doing?');
            await npc.say(
                'i need to kill these blasted mice',
                "they're all over the place, i need a cat"
            );
            if (!(await reactToCats(player, npc, 0))) {
                await player.say("no you're right, you don't see many around");
            }
            break;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
