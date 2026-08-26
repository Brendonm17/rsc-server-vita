// wilderness guide npc, gates tutorial door at stage >= 70

const { hasStage, setStageIfLess } = require('./stage');

const WILDERNESS_GUIDE_ID = 493;

async function askWhereIsWilderness(player, npc) {
    await player.say('Where is this wilderness?');
    await npc.say(
        'Once you get into the main playing area head north',
        'then you will eventually reach the wilderness',
        'The deeper you venture into the wilderness',
        'The greater the level range of players who can attack you',
        'So if you go in really deep',
        'Players much stronger than you can attack you'
    );
}

async function askWhatHappensWhenIDie(player, npc) {
    await player.say('What happens when I die?');
    await npc.say(
        'normally when you die',
        'you will lose all of the items in your inventory',
        'Except the three most valuable',
        'You never keep stackable items like coins and runes',
        'which is why it is a good idea to leave things in the bank',
        'However if you attack another player',
        'You get a skull above your head for twenty minutes',
        'If you die with a skull above your head you lose your entire ' +
            'inventory'
    );
}

async function optionsDialogue(player, npc) {
    const menu = await player.ask(
        ['Where is this wilderness?', 'What happens when I die?'],
        false
    );

    if (menu === 0) {
        await askWhereIsWilderness(player, npc);
        await askWhatHappensWhenIDie(player, npc);
    } else if (menu === 1) {
        await askWhatHappensWhenIDie(player, npc);
        await askWhereIsWilderness(player, npc);
    }

    await npc.say('Now proceed through the next door');
    setStageIfLess(player, 70);
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== WILDERNESS_GUIDE_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Hi are you someone who likes to fight other players?',
        'Granted it has big risks',
        'but it can be very rewarding too'
    );

    const menu = await player.ask(
        ["Yes I'm up for a bit of a fight", "I'd prefer to avoid that"],
        true
    );

    if (menu === 0) {
        await npc.say(
            'Then the wilderness is the place for you',
            'That is the area of the game where you can attack other players',
            'Be careful though',
            'Other players can be a lot more dangerous than monsters',
            'they will be much more persistant in chasing after you',
            'Especially when they hunt in groups'
        );
        await optionsDialogue(player, npc);
    } else if (menu === 1) {
        await npc.say(
            "Then don't stray into the wilderness",
            'That is the area of the game where you can attack other players'
        );
        await optionsDialogue(player, npc);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
