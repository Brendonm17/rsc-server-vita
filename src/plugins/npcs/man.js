// https://classic.runescape.wiki/w/Transcript:Man
//
// man/farmer npc dialogue; shares the 20-outcome roll (runDialogue) with
// thief.js, which owns the thief/rogue/warrior ids

const MAN_IDS = new Set([11, 63, 72, 318, 319]); // Man, Farmer, Man (Al Kharid), Man (Ardougne), Farmer (Ardougne)

const FLIER_ID = 201;

async function killingCitizens(npc) {
    await npc.say(
        "I'm a little worried",
        "I've heard there's lots of people going about",
        'killing citizens at random'
    );
}

async function worriedAboutGoblins(player, npc) {
    await npc.say(
        'Not too bad',
        "I'm a little worried about the increase in Goblins these days"
    );

    await player.say("Don't worry. I'll kill them");
}

async function wishToTrade(player, npc) {
    await player.say('Do you wish to trade?');

    await npc.say(
        'No, I have nothing I wish to get rid of',
        'If you want to do some trading,',
        'there are plenty of shops and market stalls around though'
    );
}

async function searchOfQuest(player, npc) {
    await player.say("I'm in search of a quest");
    await npc.say("I'm sorry I can't help you there");
}

async function enemiesToKill(player, npc) {
    await player.say("I'm in search of enemies to kill");

    await npc.say(
        "I've heard there are many fearsome creatures under the ground"
    );
}

async function howCanIHelp(player, npc) {
    await npc.say('How can I help you?');

    const choice = await player.ask([
        'Do you wish to trade?',
        "I'm in search of a quest",
        "I'm in search of enemies to kill"
    ]);

    switch (choice) {
        case 0: // trade
            await wishToTrade(player, npc);
            break;
        case 1: // quest
            await searchOfQuest(player, npc);
            break;
        case 2: // enemies
            await enemiesToKill(player, npc);
            break;
    }
}

async function inAHurry(npc) {
    await npc.say('Get out of my way', "I'm in a hurry");
}

async function imFine(player, npc) {
    await npc.say("I'm fine", 'How are you?');
    await player.say('Very well, thank you');
}

async function askingForFight(player, npc) {
    await npc.say('Are you asking for a fight?');
    player.disengage();
    await npc.attack(player);
}

async function niceWeather(npc) {
    await npc.say('Hello', "Nice weather we've been having");
}

async function whoAreYou(player, npc) {
    await npc.say('Who are you?');
    await player.say('I am a bold adventurer');
    await npc.say('A very noble profession');
}

async function dontKnowYou(player, npc) {
    await npc.say('Do I know you?');
    await player.say(
        'No, I was just wondering if you had anything interesting to say'
    );
}

// 20-outcome dialogue roll, shared with thief.js
async function runDialogue(player, npc) {
    player.engage(npc);

    await player.say('Hello', "How's it going?");

    const roll = Math.floor(Math.random() * 20);

    switch (roll) {
        case 0:
            await inAHurry(npc);
            break;
        case 1:
            player.message('The man ignores you');
            break;
        case 2:
            await npc.say('Not too bad');
            break;
        case 3:
            await npc.say('Very well, thank you');
            break;
        case 4:
            await npc.say('Have this flier');
            player.inventory.add(FLIER_ID, 1);
            break;
        case 5:
            await killingCitizens(npc);
            break;
        case 6:
            await imFine(player, npc);
            break;
        case 7:
            await npc.say('Hello');
            break;
        case 8:
            await whoAreYou(player, npc);
            break;
        case 9:
            await worriedAboutGoblins(player, npc);
            break;
        case 10:
            await niceWeather(npc);
            break;
        case 11:
            await npc.say("No, I don't want to buy anything");
            break;
        case 12:
            await dontKnowYou(player, npc);
            break;
        case 13:
            await howCanIHelp(player, npc);
            break;
        case 14:
            await askingForFight(player, npc);
            break;
        case 15:
            await npc.say('That is classified information');
            break;
        case 16:
            await npc.say("No, I don't have any spare change");
            break;
        case 17:
            await npc.say('None of your business');
            break;
        case 18:
            await npc.say(
                'I think we need a new king',
                "The one we've got isn't very good"
            );
            break;
        case 19:
            await npc.say('Yo wassup!');
            break;
    }

    player.disengage();
}

async function onTalkToNPC(player, npc) {
    if (!MAN_IDS.has(npc.id)) {
        return false;
    }

    await runDialogue(player, npc);

    return true;
}

module.exports = {
    killingCitizens,
    worriedAboutGoblins,
    searchOfQuest,
    howCanIHelp,
    inAHurry,
    imFine,
    askingForFight,
    niceWeather,
    runDialogue,
    onTalkToNPC
};
