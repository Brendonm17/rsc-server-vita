
const THORDUR_ID = 175;
const COINS_ID = 10;
const DISK_OF_RETURNING_ID = 387;
const DISK_PRICE = 10;


async function wantedSayHi(player, npc) {
    await npc.say('Well hello there');
}

async function niceToMeetYou(player, npc) {
    await npc.say('Nice to meet you too');
}

async function haveToGo(player, npc) {
    await npc.say('Ok, have a nice day');
}

async function beRightBack(player, npc) {
    await npc.say('Ok');
}

async function canIBuyIt(player, npc) {
    await npc.say(
        'I sell the disks for 10 coins',
        'Would you like to buy one?'
    );

    const opts = await player.ask(['Yes please', 'No thankyou'], false);

    if (opts === 0) {
        if (!player.inventory.has(COINS_ID, DISK_PRICE)) {
            await player.say(
                "Oh dear I don't actually seem to have enough money"
            );
        } else {
            player.inventory.remove(COINS_ID, DISK_PRICE);
            player.inventory.add(DISK_OF_RETURNING_ID);
            player.message('Thordur hands you a special disk');
            await player.say('Thank you');
            await npc.say(
                'If you ever happen to lose the disk whilst being in the ' +
                    'Black Hole,',
                'the magical pool on the other side will allow you',
                'to safely return here'
            );
        }
    }
    // opts === 1: NOTHING (Java has an empty else-if branch)
}

async function canIVisit(player, npc) {
    await npc.say(
        'You will need a special disk that allows you to get there',
        'and when you want to come back just spin it'
    );

    const opts = await player.ask(
        ['So about this disk, can I buy it?', "I'll be right back"],
        false
    );

    if (opts === 0) {
        await canIBuyIt(player, npc);
    } else if (opts === 1) {
        await beRightBack(player, npc);
    }
}

async function prisonBadPlayers(player, npc) {
    await npc.say(
        'The prison used to be an old style of prisoning players',
        'who abused the rules',
        'Nowadays they use other methods',
        'My place allows players experience the void, allowing them',
        'to make it back here'
    );

    const opts = await player.ask(
        ['I see, so can I visit the Black Hole', 'I have to go'],
        false
    );

    if (opts === 0) {
        await canIVisit(player, npc);
    } else if (opts === 1) {
        await haveToGo(player, npc);
    }
}

async function whatDoYouDo(player, npc) {
    await npc.say('I run a tourist attraction called the Black Hole');

    const opts = await player.ask(
        [
            'Oooh fancy, tell me more',
            'You mean like the prison where bad players are sent?',
            'Sounds good, how can I visit it?'
        ],
        false
    );

    if (opts === 0) {
        await npc.say(
            'Well back in the day players tried',
            'to play unfairly and get advantage over other',
            'players, so moderators would trap them in the void space,',
            'often refered as the Black Hole'
        );
        await prisonBadPlayers(player, npc);
    } else if (opts === 1) {
        await prisonBadPlayers(player, npc);
    } else if (opts === 2) {
        await canIVisit(player, npc);
    }
}

async function likeItHere(player, npc) {
    await npc.say(
        'Yes, its nice and quiet',
        'I get visitors once in a while',
        'this place is home to me'
    );

    const opts = await player.ask(
        ['Visitors? what do you do?', 'Nice to meet you'],
        false
    );

    if (opts === 0) {
        await whatDoYouDo(player, npc);
    } else if (opts === 1) {
        await niceToMeetYou(player, npc);
    }
}

async function whoAreYou(player, npc) {
    await npc.say('I am Thordur though names don\'t mean much');

    const opts = await player.ask(
        ['So what do you do', 'Do you like it here?', 'Nice to meet you'],
        false
    );

    if (opts === 0) {
        await whatDoYouDo(player, npc);
    } else if (opts === 1) {
        await likeItHere(player, npc);
    } else if (opts === 2) {
        await niceToMeetYou(player, npc);
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== THORDUR_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello');
    await npc.say('Hello adventurer', 'What brings you to this place?');

    const opts = await player.ask(
        [
            'I just wanted to come by and say Hi',
            'Who are you?',
            'Do you like it here?'
        ],
        false
    );

    if (opts === 0) {
        await wantedSayHi(player, npc);
    } else if (opts === 1) {
        await whoAreYou(player, npc);
    } else if (opts === 2) {
        await likeItHere(player, npc);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
