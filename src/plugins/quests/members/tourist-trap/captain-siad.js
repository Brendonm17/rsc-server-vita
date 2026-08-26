// captain siad dialogue: talk and chest-interrupt

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    CAPTAIN_SIAD_ID,
    TECHNICAL_PLANS_ID,
    CELL_DOOR_KEY_ID,
    METAL_KEY_ID,
    STAGES,
    stageOf,
    succeedRate,
    random
} = require('./constants.js');

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}

// Siad.PUNISHED - guards search and throw you in a cell
async function siadPunished(player, npc) {
    await mes(player, 'The Guards search you!');
    const rand = random(0, 3);
    if (player.inventory.has(CELL_DOOR_KEY_ID) && rand === 0) {
        player.message('The guards find the cell door key and remove it!');
        player.inventory.remove(CELL_DOOR_KEY_ID);
    }
    if (player.inventory.has(METAL_KEY_ID) && rand === 1) {
        player.message('The guards find the main gate key and remove it!');
        player.inventory.remove(METAL_KEY_ID);
    }
    await mes(player, 'Some guards rush to help the captain.');
    await mes(
        player,
        "You are roughed up a bit by the guards as you're manhandlded into a cell."
    );
    player.damage(7);
    await mes(
        player,
        '@yel@Guards: Into the cell you go! I hope this teaches you a lesson.'
    );
    player.teleport(89, 801);
}

function grantChestOpportunity(player) {
    if (player.cache.tourist_chest === undefined) {
        player.cache.tourist_chest = true;
    }
}

async function siadPrepareToDie(player, npc) {
    await npc.say("I'll teach you a lesson!", 'Guards! Guards!');
    await siadPunished(player, npc);
}

async function siadErm(player, npc) {
    await npc.say('Come on, spit it out!', "Right that's it!", 'Guards!');
    await siadPunished(player, npc);
}

async function siadPlans(player, npc) {
    await npc.say(
        "Don't be silly!",
        "I'm going to teach you a lesson!",
        'Guards! Guards!'
    );
    await siadPunished(player, npc);
}

async function siadSlavesBrokenFree(player, npc) {
    if (!succeedRate()) {
        await npc.say(
            "Don't talk rubbish, the warning siren isn't sounding.",
            'Now state your business before I have you thrown out.'
        );
        const gay = await player.ask(
            [
                'The guard downstairs said you were lonely.',
                'I need to service your chest.'
            ],
            false
        );
        if (gay === 0) {
            await siadLonely(player, npc);
        } else if (gay === 1) {
            await siadService(player, npc);
        }
    } else {
        await mes(player, 'The captain seems distracted with what you just said.');
        await mes(
            player,
            'The captain looks out of the window to see if there are any prisoners escaping.'
        );
        grantChestOpportunity(player);
    }
}

async function siadService(player, npc) {
    await npc.say('You need to what?');
    await player.say('I need to service your chest?');
    await npc.say(
        "There's nothing wrong with the chest, it's fine, now get out!"
    );
    const fire = await player.ask(
        [
            "I'm here to take your plans, hand them over now or I'll kill you!",
            'Fire!Fire!'
        ],
        false
    );
    if (fire === 0) {
        await siadPlans(player, npc);
    } else if (fire === 1) {
        await siadFireFire(player, npc);
    }
}

async function siadLonely(player, npc) {
    await mes(player, 'The captain gives you a puzzled look.');
    await npc.say(
        'Well, I most certainly am not lonely!',
        "I'm an incredibly busy man you know!",
        'Now, get to the point, what do you want?'
    );
    const opt = await player.ask(
        ['Well, er...erm, I err....', 'I need to service your chest.'],
        false
    );
    if (opt === 0) {
        await siadErm(player, npc);
    } else if (opt === 1) {
        await siadService(player, npc);
    }
}

async function siadTwoMinutes(player, npc) {
    await npc.say('Well, ok, but very quickly.', 'I am a very busy person you know!');
    const menu = await player.ask(
        [
            'Well, er...erm, I err....',
            'Oh my, a dragon just flew straight past your window!'
        ],
        false
    );
    if (menu === 0) {
        await siadErm(player, npc);
    } else if (menu === 1) {
        await siadDragon(player, npc);
    }
}

async function siadDragon(player, npc) {
    if (!succeedRate()) {
        await npc.say(
            'Really! Where?',
            "I don't see any dragons young man?",
            'Now, please get out of my office, I have work to do.'
        );
        player.message('The Captain goes back to his work.');
    } else {
        await mes(player, 'The captain seems distracted with what you just said.');
        await mes(player, 'The captain looks out of the window for the dragon.');
        grantChestOpportunity(player);
    }
}

async function siadFireFire(player, npc) {
    if (!succeedRate()) {
        await npc.say("Where's the fire?", "I don't see any fire?");
        const fireMenu = await player.ask(
            [
                "It's down in the lower mines, sound the alarm!",
                "Oh yes,  you're right, they must have put it out!"
            ],
            false
        );
        if (fireMenu === 0) {
            await npc.say(
                "You go and sound the alarm, I can't see anything wrong with the mine.",
                'Have you seen the fire yourself?'
            );
            const variableF = await player.ask(
                ['Yes actually!', 'Er, no, one of the slaves told me.'],
                false
            );
            if (variableF === 0) {
                await npc.say("Well, why didn't you raise the alarm?");
                const variableG = await player.ask(
                    [
                        "I don't know where the alarm is.",
                        'I was so concerned for your safety that I rushed to save you.'
                    ],
                    false
                );
                if (variableG === 0) {
                    await npc.say(
                        "That's the most ridiculous thing I've heard.",
                        'Who are you? Where do you come from?',
                        "It doesn't matter..."
                    );
                    await mes(player, 'The Captain shouts the guards...');
                    await npc.say('Guards!', 'Show this person out!');
                    await siadPunished(player, npc);
                } else if (variableG === 1) {
                    await npc.say(
                        "Well, that's very good of you.",
                        'But as you can see, I am very fine and well thanks!',
                        'Now, please leave so that I can get back to my work.'
                    );
                    player.message('The Captain goes back to his desk.');
                }
            } else if (variableF === 1) {
                await npc.say(
                    "Well...you can't believe them, they're all a bunch of convicts.",
                    "Anyway, it doesn't look as if there is a fire down there.",
                    "So I'm going to get on with my work.",
                    'Please remove yourself from my office.'
                );
                player.message('The Captain goes back to his desk and starts studying.');
            }
        } else if (fireMenu === 1) {
            await npc.say(
                'Good, now perhaps you can leave me in peace?',
                'After all I do have some work to do.'
            );
            const er = await player.ask(
                ['Er, yes Ok then.', 'Well, er...erm, I err....'],
                false
            );
            if (er === 0) {
                await npc.say('Good!', 'Please remove yourself from my office.');
                player.message('The Captain goes back to his desk and starts studying.');
            } else if (er === 1) {
                await siadErm(player, npc);
            }
        }
    } else {
        await mes(player, 'The captain seems distracted with what you just said.');
        await mes(player, 'The captain looks out of the window to see if is a fire.');
        grantChestOpportunity(player);
    }
}

async function siadBooks(player, npc) {
    await npc.say('Yes, I do. Now please get to the point?');
    let books;
    if (player.cache.sailing !== undefined) {
        books = await player.ask(
            [
                'How long have you been interested in books?',
                'I could get you some books!',
                "So, you're interested in sailing?"
            ],
            true
        );
    } else {
        books = await player.ask(
            [
                'How long have you been interested in books?',
                'I could get you some books!'
            ],
            true
        );
    }
    if (books === 0) {
        await npc.say(
            'Long enough to know when someone is stalling!',
            "Ok, that's it, get out!",
            'Guards!'
        );
        await siadPunished(player, npc);
    } else if (books === 1) {
        await npc.say('Oh, really!', 'Sorry, not interested!', 'GUARDS!');
        await siadPunished(player, npc);
    } else if (books === 2) {
        player.message("The captain's interest seems to perk up.");
        await npc.say(
            'Well, yes actually...',
            "It's been a passion of mine for some years..."
        );
        const sail = await player.ask(
            [
                'I could tell by the cut of your jib.',
                'Not much sailing to be done around here though?'
            ],
            true
        );
        if (sail === 0) {
            await npc.say('Oh yes? Really?');
            player.message('The Captain looks flattered.');
            await npc.say(
                'Well, you know, I was quite the catch in my day you know!'
            );
            await mes(
                player,
                'The captain starts rambling on about his days as a salty sea dog.'
            );
            await mes(player, 'He looks quite distracted...');
            grantChestOpportunity(player);
        } else if (sail === 1) {
            player.message('The captain frowns slightly...');
            await npc.say(
                "Well of course there isn't, we're surrounded by desert.",
                'Now, why are you here exactly?'
            );
            const again = await player.ask(
                [
                    'Oh my, a dragon just flew straight past your window!',
                    'Well, er...erm, I err....'
                ],
                true
            );
            if (again === 0) {
                await siadDragon(player, npc);
            } else if (again === 1) {
                await siadErm(player, npc);
            }
        }
    }
}

// main entry; obj != null means chest-interrupt
async function captainSiadDialogue(player, npc, fromChest) {
    if (fromChest) {
        await mes(player, 'The captains spots you before you manage to open the chest...');
    } else {
        await mes(player, 'The captain looks up from his work as you address him.');
    }
    const stage = stageOf(player);
    if (
        player.inventory.has(TECHNICAL_PLANS_ID) ||
        stage >= STAGES.MADE_WEAPON ||
        stage === STAGES.COMPLETE
    ) {
        await npc.say("I don't have time to talk to you.", 'Move along please!');
        return;
    }
    await npc.say('What are you doing in here?');
    const menu = await player.ask(
        [
            'I wanted to have a chat?',
            "What's it got to do with you?",
            'Prepare to die!',
            'All the slaves have broken free!',
            'Fire!Fire!'
        ],
        true
    );
    if (menu === 0) {
        await npc.say("You don't belong in here, get out!");
        const m = await player.ask(
            [
                'But I just need two minutes of your time?',
                'Prepare to die!',
                'All the slaves have broken free!',
                'Fire!Fire!',
                'You seem to have a lot of books!'
            ],
            true
        );
        if (m === 0) {
            await siadTwoMinutes(player, npc);
        } else if (m === 1) {
            await siadPrepareToDie(player, npc);
        } else if (m === 2) {
            await siadSlavesBrokenFree(player, npc);
        } else if (m === 3) {
            await siadFireFire(player, npc);
        } else if (m === 4) {
            await siadBooks(player, npc);
        }
    } else if (menu === 1) {
        await npc.say(
            'This happens to be my office.',
            'Now explain yourself before I run you through!'
        );
        const keke = await player.ask(
            [
                'The guard downstairs said you were lonely.',
                'I need to service your chest.'
            ],
            true
        );
        if (keke === 0) {
            await siadLonely(player, npc);
        } else if (keke === 1) {
            await siadService(player, npc);
        }
    } else if (menu === 2) {
        await siadPrepareToDie(player, npc);
    } else if (menu === 3) {
        await siadSlavesBrokenFree(player, npc);
    } else if (menu === 4) {
        await siadFireFire(player, npc);
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id !== CAPTAIN_SIAD_ID) {
        return false;
    }
    player.engage(npc);
    await captainSiadDialogue(player, npc, false);
    player.disengage();
    return true;
}

module.exports = {
    onTalkToNPC,
    captainSiadDialogue,
    siadPunished
};
