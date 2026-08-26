
const { questsEnabled } = require('../../custom-gate.js');
const {
    WORKMAN_ID,
    WORKMAN_UNDERGROUND_ID,
    DIGSITE_SCROLL_ID,
    DIGSITE_CHEST_KEY_ID
} = require('./constants.js');

async function canIBuyIt(player, npc) {
    await npc.say('Ooo no, I need it!');
}

async function myKey(player, npc) {
    await npc.say(
        "You don't think im going to fall for that do you ?",
        'Get lost!'
    );
}

async function talkSurface(player, npc) {
    const stage = player.questStages.digsite;
    if (stage === -1) {
        await player.say('Hello there');
        await npc.say(
            "Ah it's the great archaeologist!",
            'Congratulations on your discovery'
        );
        return;
    }

    // stages 0..6
    await player.say('Hello there');
    await npc.say('Good day, what can I do for you ?');
    const menu = await player.ask(
        [
            'What do you do here ?',
            "I'm not sure...",
            'Can I dig around here ?'
        ],
        true
    );
    if (menu === 0) {
        await npc.say(
            'I am involved in various stages of the dig',
            'From the initial investigation to the installation of the mine shafts'
        );
        await player.say('Oh okay, thanks');
    } else if (menu === 1) {
        await npc.say('Well, let me know when you are');
    } else if (menu === 2) {
        await npc.say(
            'You can only use the site you have the appropriate exam level for'
        );
        const subMenu = await player.ask(
            ['Appropriate exam level ?', 'I am already skilled in digging'],
            true
        );
        if (subMenu === 0) {
            await npc.say(
                'Yes, only persons with the correct certificate of earth sciences can dig here',
                'A level 1 certificate will let you dig in a level 1 site and so on...'
            );
            await player.say('Oh, okay I understand');
        } else if (subMenu === 1) {
            await npc.say(
                "Well that's nice for you...",
                "You can't dig around here without a certificate though"
            );
        }
    }
}

async function talkUnderground(player, npc) {
    await player.say('Hello');
    await npc.say(
        'Well well...',
        'I have a visitor',
        'What are you doing here ?'
    );
    const menu = await player.ask(
        [
            'I have been invited to research here',
            'I am not sure really',
            "I'm here to get rich rich rich!"
        ],
        true
    );
    if (menu === 0) {
        await npc.say(
            'Indeed you must be someone special to be allowed down here...'
        );
        const opt1 = await player.ask(
            [
                'Do you know where to find a specimen jar ?',
                'Do you know where to find a chest key'
            ],
            true
        );
        if (opt1 === 0) {
            await npc.say(
                'Hmmm, let me think...',
                "Nope, can't help you there i'm afraid"
            );
        } else if (opt1 === 1) {
            await npc.say('Yes I might have one...');
            const opt2 = await player.ask(
                [
                    "I don't suppose I could use it ?",
                    'Can I buy it from you ?',
                    "Hey that's my key!"
                ],
                true
            );
            if (opt2 === 0) {
                await npc.say('Aww, but I need it...');
                const opt3 = await player.ask(
                    ['Please', 'Can I buy it from you ?', "Hey that's my key!"],
                    true
                );
                if (opt3 === 0) {
                    await npc.say('I am not sure about this...');
                    const opt4 = await player.ask(
                        [
                            'Aww...go on',
                            'Can I buy it from you ?',
                            "Hey that's my key!"
                        ],
                        true
                    );
                    if (opt4 === 0) {
                        await npc.say("Hmmm...well I don't know");
                        const opt5 = await player.ask(
                            [
                                'Pretty please!',
                                'Can I buy it from you ?',
                                "Hey that's my key!"
                            ],
                            true
                        );
                        if (opt5 === 0) {
                            await npc.say('You are trying to change my mind');
                            await player.say('Of course!');
                            const opt6 = await player.ask(
                                [
                                    'Pretty please with sugar on top!',
                                    'Can I buy it from you ?',
                                    "Hey that's my key!"
                                ],
                                true
                            );
                            if (opt6 === 0) {
                                player.inventory.add(DIGSITE_CHEST_KEY_ID, 1);
                                await npc.say(
                                    'All right, all right!',
                                    "Stop begging I can't stand it.",
                                    "Here's the key...take care of it"
                                );
                                await player.say('Thanks');
                            } else if (opt6 === 1) {
                                await canIBuyIt(player, npc);
                            } else if (opt6 === 2) {
                                await myKey(player, npc);
                            }
                        } else if (opt5 === 1) {
                            await canIBuyIt(player, npc);
                        } else if (opt5 === 2) {
                            await myKey(player, npc);
                        }
                    } else if (opt4 === 1) {
                        await canIBuyIt(player, npc);
                    } else if (opt4 === 2) {
                        await myKey(player, npc);
                    }
                } else if (opt3 === 1) {
                    await canIBuyIt(player, npc);
                } else if (opt3 === 2) {
                    await myKey(player, npc);
                }
            } else if (opt2 === 1) {
                await canIBuyIt(player, npc);
            } else if (opt2 === 2) {
                await myKey(player, npc);
            }
        }
    } else if (menu === 1) {
        await npc.say('A miner without a clue - how funny');
    } else if (menu === 2) {
        await npc.say(
            "Oh, well don't forget that wealth and riches isn't everything..."
        );
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== WORKMAN_ID && npc.id !== WORKMAN_UNDERGROUND_ID) {
        return false;
    }

    player.engage(npc);

    if (npc.id === WORKMAN_ID) {
        await talkSurface(player, npc);
    } else if (npc.id === WORKMAN_UNDERGROUND_ID) {
        await talkUnderground(player, npc);
    }

    player.disengage();
    return true;
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== WORKMAN_ID || item.id !== DIGSITE_SCROLL_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Here, have a look at this...');
    await npc.say(
        'I give permission...blah de blah etc....',
        "Okay that's all in order, you may use the mineshafts now",
        "I'll hang onto this scroll shall I ?"
    );
    await player.say('Thanks');
    player.inventory.remove(DIGSITE_SCROLL_ID);
    if (
        player.cache.digsite_winshaft !== true &&
        player.questStages.digsite === 5
    ) {
        player.cache.digsite_winshaft = true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC, onUseWithNPC };
