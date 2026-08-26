// ana dialogue in the mine

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    ANA_ID,
    MERCENARY_ID,
    METAL_KEY_ID,
    CELL_DOOR_KEY_ID,
    STAGES,
    stageOf,
    addNpc,
    ifNearVisNpc,
    hasSlaveDisguise
} = require('./constants.js');

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}

async function anaTryGetYouOut(player, npc) {
    await npc.say(
        "Wow! You're brave. How do you propose we do that?",
        "In case you hadn't noticed, this place is quite well guarded."
    );
    const menu = await player.ask(
        ['We could try to sneak out.', 'Have you got any suggestions?'],
        true
    );
    if (menu === 0) {
        await npc.say(
            "That doesn't sound very likely. How did you get in here anway?",
            'Did you deliberately hand yourself over to the guards?',
            'Ha, ha ha ha! Sorry, just kidding.'
        );
        const last = await player.ask(
            [
                'I managed to sneak past the guards.',
                'Huh, these guards are rubbish, it was easy to sneak past them!'
            ],
            true
        );
        if (last === 0) {
            await anaSneakedPast(player, npc);
        } else if (last === 1) {
            await anaGuardsRubbish(player, npc);
        }
    } else if (menu === 1) {
        await npc.say(
            'Hmmm, let me think...',
            'Hmmm.',
            'No, sorry...',
            'The only thing that gets out of here is the rock that we mine.',
            'Not even the dead get a decent funeral.',
            'Bodies are just thrown down dissused mine holes.',
            "It's very disrespectful..."
        );
        const gah = await player.ask(
            [
                "Ok, I'll check around for another way to try and get out.",
                'How does the rock get out?'
            ],
            true
        );
        if (gah === 0) {
            await npc.say('Good luck!');
        } else if (gah === 1) {
            await npc.say(
                'Well, in this section we mine it, ',
                'Then someone else scoops it into a barrel. ',
                'The barrels are loaded onto a mine cart.',
                "Then they're desposited near the surface lift.",
                'I have no idea where they go from there.',
                "But that's not going to help us, is it?"
            );
            const kaka = await player.ask(
                [
                    "Maybe? I'll come back to you when I have a plan.",
                    'Where would I get one of those barrels from?'
                ],
                true
            );
            if (kaka === 0) {
                await npc.say("Ok, well, I'm not going anywhere!");
                player.message('Ana nods at a nearby guard!');
                await npc.say('Unless he feels generous enough to let me go!');
                player.message('The guard ignores the comment.');
                await npc.say(
                    "Oh well, I'd better get back to work, you take care!"
                );
            } else if (kaka === 1) {
                await npc.say(
                    'Well, you would get one from around by the lift area.',
                    'But why would you want one of those?'
                );
                const tjatja = await player.ask(
                    [
                        'Er no reason! Just wondering.',
                        'You could hide in one of those barrels and I could try to sneak you out!'
                    ],
                    true
                );
                if (tjatja === 0) {
                    await npc.say(
                        'Hmmm, just don\'t get any funny ideas...',
                        'I am not going to get into one of those barrels!',
                        'Ok, have you got that?'
                    );
                    await anaGotThat(player, npc);
                } else if (tjatja === 1) {
                    await npc.say(
                        'There is no way that you are getting me into a barrel.',
                        'No WAY! DO you understand?'
                    );
                    await anaGotThat(player, npc);
                }
            }
        }
    }
}

async function anaGotThat(player, npc) {
    const gotit = await player.ask(
        ["Ok, yep, I've got that.", "Well, we'll see, it might be the only way."],
        true
    );
    if (gotit === 0) {
        await npc.say(
            'Good, just make sure you keep it in mind.',
            'Anyway, I have to get back to work.',
            'The guards will come along soon and give us some trouble else.'
        );
    } else if (gotit === 1) {
        await npc.say(
            'No, there has to be a better way!',
            'Anyway, I have to get back to work.',
            'The guards will come along soon and give us some trouble else.'
        );
    }
}

async function anaSneakedPast(player, npc) {
    await npc.say(
        'Hmm, impressive, but can you so easily sneak out again?',
        'How did you manage to get through the gate?'
    );
    const gosh = await player.ask(['I have a key', "It's a trade secret!"], false);
    if (gosh === 0) {
        await player.say('I used a key.');
        player.disengage();
        const guard = addNpc(player.world, MERCENARY_ID, player.x, player.y);
        if (guard) {
            player.engage(guard);
            await guard.say('I heard that! So you used a key did you?! ');
            if (player.inventory.has(METAL_KEY_ID)) {
                await guard.say("Right, we'll have that key off you!");
                player.inventory.remove(METAL_KEY_ID);
            }
            await guard.say('Guards! Guards!');
            await guard.attack(player);
            player.disengage();
            player.engage(npc);
            await npc.say('Oopps! See ya!');
            player.disengage();
            await mes(player, 'Some guards rush to help their comrade.');
            await mes(
                player,
                "You are roughed up a bit by the guards as you're manhandlded into a cell."
            );
            player.engage(guard);
            await guard.say(
                'Into the cell you go! I hope this teaches you a lesson.'
            );
            player.disengage();
            player.teleport(75, 3625);
        }
    } else if (gosh === 1) {
        await player.say("It's a trade secret!");
        await npc.say(
            'Oh, right, well, I guess you know what you\'re doing.',
            'Anyway, I have to get back to work.',
            'The guards will come along soon and give us some trouble else.'
        );
    }
}

async function anaGuardsRubbish(player, npc) {
    player.disengage();
    const guard = addNpc(player.world, MERCENARY_ID, player.x, player.y);
    if (guard) {
        player.engage(guard);
        await guard.say(
            'I heard that! So you managed to sneak in did you!',
            'Guards! Guards!'
        );
        await guard.attack(player);
        player.disengage();
        player.engage(npc);
        await npc.say('Oopps! See ya!');
        player.disengage();
        await mes(player, 'The Guards search you!');
        await mes(player, 'Some guards rush to help their comrade.');
        await mes(
            player,
            "You are roughed up a bit by the guards as you're manhandlded into a cell."
        );
        player.engage(guard);
        await guard.say('Into the cell you go! I hope this teaches you a lesson.');
        player.disengage();
        player.teleport(75, 3625);
    }
}

async function anaDialogue(player, npc) {
    const stage = stageOf(player);
    if (stage === STAGES.COMPLETE) {
        player.message('This slave does not appear interested in talking to you.');
        return;
    }
    if (!hasSlaveDisguise(player) && stage !== STAGES.COMPLETE) {
        player.message('A guard notices you and starts running after you.');
        player.disengage();
        let guard = ifNearVisNpc(player, MERCENARY_ID, 10);
        if (!guard) {
            guard = addNpc(player.world, MERCENARY_ID, player.x, player.y);
            await player.world.sleepTicks(2);
        }
        player.engage(guard);
        await guard.say("Hey! You're no slave!");
        await guard.attack(player);
        await mes(player, 'The Guards search you!');
        if (player.inventory.has(CELL_DOOR_KEY_ID)) {
            await mes(player, 'The guards find the cell door key and remove it!');
            player.inventory.remove(CELL_DOOR_KEY_ID);
        }
        await mes(player, 'Some guards rush to help their comrade.');
        await mes(
            player,
            "You are roughed up a bit by the guards as you're manhandlded into a cell."
        );
        await guard.say('Into the cell you go! I hope this teaches you a lesson.');
        player.disengage();
        player.teleport(75, 3625);
        return;
    }
    await player.say('Hello!');
    await npc.say("Hello there, I don't think I've seen you before.");
    const menu = await player.ask(
        ["No, I'm new here!", "What's your name."],
        true
    );
    if (menu === 0) {
        await npc.say(
            'I thought so you know!',
            'How do you like the hospitality down here?',
            'Not exactly Al Kharid Inn style is it?',
            "Well, I guess I'd better get back to work.",
            "Don't want to get into trouble with the guards again."
        );
        const ooo = await player.ask(
            [
                'Do you get into trouble with guards often?',
                'I want to try and get you out of here.'
            ],
            true
        );
        if (ooo === 0) {
            await npc.say(
                "No, not really, because I'm usually working very hard.",
                "Come to think of it, I'd better get back to work."
            );
            const often = await player.ask(
                ['Do you enjoy it down here?', 'Ok, see ya!'],
                true
            );
            if (often === 0) {
                await npc.say(
                    'Of course not!',
                    "I just don't have much choice about it a the moment."
                );
                const enjoy = await player.ask(
                    [
                        'I want to try and get you out of here.',
                        'Do you have any ideas about how we can get out of here?'
                    ],
                    true
                );
                if (enjoy === 0) {
                    await anaTryGetYouOut(player, npc);
                } else if (enjoy === 1) {
                    await npc.say(
                        'Hmmm, not really, I would have tried them already if I did.',
                        'The guards seem to live in the compound.',
                        'How did you get in there anyway?'
                    );
                    const mmm = await player.ask(
                        [
                            'I managed to sneak past the guards.',
                            'Huh, these guards are rubbish, it was easy to sneak past them!'
                        ],
                        true
                    );
                    if (mmm === 0) {
                        await anaSneakedPast(player, npc);
                    } else if (mmm === 1) {
                        await anaGuardsRubbish(player, npc);
                    }
                }
            } else if (often === 1) {
                await npc.say('Goodbye and good luck!');
            }
        } else if (ooo === 1) {
            await anaTryGetYouOut(player, npc);
        }
    } else if (menu === 1) {
        await npc.say(
            'My name? Oh, how sweet, my name is Ana,',
            'I come from Al Kharid, thought the desert might be interesting.',
            'What a surprise I got!'
        );
        const opt = await player.ask(
            [
                'What kind of suprise did you get?',
                'Do you want to go back to Al Kharid?'
            ],
            false
        );
        if (opt === 0) {
            await player.say('What kind of surpise did you get?');
            await npc.say(
                'Well, I was just touring the desert looking for the nomad tribe to west.',
                'And I was set upon by these armoured men.',
                'I think that the guards think I am an escaped prisoner.',
                "They didn't understand that I was exploring the desert as an adventurer."
            );
        } else if (opt === 1) {
            await player.say('Do you want to go back to Al Kharid?');
            await npc.say(
                'Sure, I miss my Mum, her name is Irena and she is probably waiting for me.',
                'how do you propose we get out of here though?',
                "I'm sure you've noticed the many square jawed guards around here.",
                'You look like you can handle yourself, ',
                'but I have my doubts that you can take them all on!'
            );
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id !== ANA_ID) {
        return false;
    }
    player.engage(npc);
    await anaDialogue(player, npc);
    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
