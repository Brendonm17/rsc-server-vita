// brother galahad gives tea, hints, and at stage >= 3 the holy table napkin

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    BROTHER_GALAHAD_ID,
    CUP_OF_TEA_ID,
    HOLY_TABLE_NAPKIN_ID
} = require('./ids.js');

function hasNapkin(player) {
    return player.inventory.has(HOLY_TABLE_NAPKIN_ID);
}

async function findIt(player, npc) {
    await npc.say(
        'I did not find it through looking',
        'though admidtedly I looked long and hard',
        'Eventually it found me'
    );

    const m = await player.ask(
        [
            'What are you talking about?',
            'Why did you leave',
            "why didn't you bring the grail with you?",
            "Well I'd better be going then"
        ],
        false
    );

    if (m === 0) {
        await player.say('What are you talking about?');
        await talkingAbout(player, npc);
    } else if (m === 1) {
        await player.say('Why did you leave?');
        await leave(player, npc);
    } else if (m === 2) {
        await player.say("Why didn't you bring the grail with you?");
        await didntBring(player, npc);
    } else if (m === 3) {
        await player.say("well I'd better be going then");
        await betterBeGoing(player, npc);
    }
}

async function leave(player, npc) {
    await npc.say(
        'apparently the time is getting close',
        'When the world will need Arthur and his knights of the round ' +
            'table again',
        'And that includes me',
        'leaving was tough for me',
        'I took this small cloth from the table as a keepsake'
    );

    if (!hasNapkin(player) && (player.questStages[QUEST_KEY] || 0) >= 3) {
        await player.say(
            "I don't suppose I could borrow that?",
            'it could come in useful on my quest'
        );
        player.message('Galahad reluctantly passes you a small cloth');
        player.inventory.add(HOLY_TABLE_NAPKIN_ID, 1);
    }
}

async function didntBring(player, npc) {
    await npc.say(
        "I'm not sure",
        'Because it seemed to be needed in the grail castle',
        'Half a moment your cup of tea is ready'
    );
    player.message('Sir Galahad give you a cup of tea');
    player.inventory.add(CUP_OF_TEA_ID, 1);
}

async function talkingAbout(player, npc) {
    await npc.say(
        'The grail castle',
        "It's hard to describe with words",
        'It mostly felt like a dream'
    );

    const m = await player.ask(
        [
            'So how can I find it?',
            'Why did you leave?',
            "why didn't you bring the grail with you?",
            "Well I'd better be going then"
        ],
        false
    );

    if (m === 0) {
        await player.say('So how can I find it?');
        await findIt(player, npc);
    } else if (m === 1) {
        await player.say('Why did you leave?');
        await leave(player, npc);
    } else if (m === 2) {
        await player.say("Why didn't you bring the grail with you?");
        await didntBring(player, npc);
    } else if (m === 3) {
        await player.say("well I'd better be going then");
        await betterBeGoing(player, npc);
    }
}

async function betterBeGoing(player, npc) {
    await npc.say('Half a moment your cup of tea is ready');
    player.message('Sir Galahad gives you a cup of tea');
    player.inventory.add(CUP_OF_TEA_ID, 1);
    await npc.say(
        'If you do come across any particularily difficult obstacles on ' +
            'your quest',
        'Do not hesitate to ask my advice',
        'I know more about the realm of the grail than many',
        'I have a feeling you may need to come back and speak to me anyway'
    );
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== BROTHER_GALAHAD_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY] || 0;

    if (stage === -1) {
        await npc.say(
            'would you like a cup of tea?',
            "I'll just put the kettle on"
        );
        player.message('Brother galahad hangs a kettle over the fire');
        await player.say('I returned the holy grail to camelot');
        await npc.say(
            "I'm impressed",
            "That's something I was never able to do",
            'Half a moment your cup of tea is ready'
        );
        player.message('Sir Galahad gives you a cup of tea');
        player.inventory.add(CUP_OF_TEA_ID, 1);
        player.disengage();
        return true;
    }

    await npc.say(
        'Welcome to my home',
        'Its rare for me to have guests',
        'would you like a cup of tea?',
        "I'll just put the kettle on"
    );
    player.message('Brother galahad hangs a kettle over the fire');

    // Build the menu exactly as OpenRSC does.
    let menuOps = [
        'Are you any relation to Sir Galahad?',
        'do you get lonely here on your own?'
    ];

    if (stage >= 3 && !hasNapkin(player)) {
        menuOps = [
            'Are you any relation to Sir Galahad?',
            "I'm on a quest to find the holy grail",
            'do you get lonely here on your own?',
            'I seek an item from the realm of the fisher king'
        ];
    } else if (stage >= 2) {
        menuOps = [
            'Are you any relation to Sir Galahad?',
            "I'm on a quest to find the holy grail",
            'do you get lonely here on your own?'
        ];
    }

    const menu = await player.ask(menuOps, false);

    // Are you any relation to Sir Galahad?
    if (menu === 0) {
        await player.say('Are you any relation to Sir Galahad');
        await npc.say(
            'I am Sir Galahad',
            "Though I've given up being a knight for now",
            'I am now live as a solitary monk',
            'I prefer to be known as brother rather than sir now',
            'Half a moment your cup of tea is ready'
        );
        player.message('Sir Galahad give you a cup of tea');
        player.inventory.add(CUP_OF_TEA_ID, 1);
    }
    // I'm on a quest to find the holy grail
    else if (menu === 1 && menuOps.length > 2) {
        await player.say("I'm on a quest to find the holy grail");
        await npc.say(
            'Ah the grail yes',
            'that did fill be with wonder',
            'Oh, that I could have stayed forever',
            'The spear, the food, the people'
        );

        const subMenu = await player.ask(
            [
                'So how can I find it?',
                'What are you talking about?',
                'Why did you leave',
                "why didn't you bring the grail with you?"
            ],
            false
        );

        if (subMenu === 0) {
            await player.say('So how can I find it?');
            await findIt(player, npc);
        } else if (subMenu === 1) {
            await player.say('What are you talking about?');
            await talkingAbout(player, npc);
        } else if (subMenu === 2) {
            await player.say('Why did you leave?');
            await leave(player, npc);
        } else if (subMenu === 3) {
            await player.say("Why didn't you bring the grail with you?");
            await didntBring(player, npc);
        }
    }
    // do you get lonely here on your own?
    else if (menu === 2 || (menu === 1 && menuOps.length === 2)) {
        await player.say('Do you get lonely out here on your own?');
        await npc.say(
            'Sometimes I do yes',
            'Still not many people to share my solidarity with',
            'Most the religious men around here are worshippers od Saradomin',
            'Half a moment your cup of tea is ready'
        );
        player.message('Sir Galahad give you a cup of tea');
        player.inventory.add(CUP_OF_TEA_ID, 1);
    }
    // I seek an item from the realm of the fisher king
    else if (menu === 3) {
        await player.say('I seek an item from the realm of the fisher king');
        await npc.say(
            'when i left there',
            'I took this small cloth from the table as a keepsake'
        );
        await player.say(
            "I don't suppose I could borrow that?",
            'it could come in useful on my quest'
        );
        player.message('Galahad reluctantly passes you a small cloth');
        player.inventory.add(HOLY_TABLE_NAPKIN_ID, 1);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
