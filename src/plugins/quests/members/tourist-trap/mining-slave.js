// mining slave and escaping mining slave dialogue and helpers

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    MINING_SLAVE_ID,
    ESCAPING_MINING_SLAVE_ID,
    MERCENARY_ID,
    DESERT_SHIRT_ID,
    DESERT_ROBE_ID,
    DESERT_BOOTS_ID,
    SLAVES_ROBE_TOP_ID,
    SLAVES_ROBE_BOTTOM_ID,
    CELL_DOOR_KEY_ID,
    STAGES,
    stageOf,
    addNpc,
    ifNearVisNpc,
    hasSlaveDisguise,
    random
} = require('./constants.js');

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}

function inTouristTrapCave(player) {
    return player.y >= 3600;
}

// turn a mining slave into the escaping slave, scheduled to revert after 50 ticks
function toEscapingSlave(player, npc) {
    const { world } = player;
    if (world.npcs.entities[npc.index] === npc) {
        world.removeEntity('npcs', npc);
    }
    const newSlave = addNpc(world, ESCAPING_MINING_SLAVE_ID, npc.x, npc.y);
    world.setTimeout(() => {
        try {
            if (newSlave && world.npcs.entities[newSlave.index] === newSlave) {
                world.removeEntity('npcs', newSlave);
                addNpc(world, MINING_SLAVE_ID, newSlave.x, newSlave.y);
            }
        } catch (e) {
            // ignore
        }
    }, 50 * 600);
    return newSlave;
}

// trade desert clothes for slave robes once all 3 are held
async function necessaryStuffSlave(player, npc) {
    const hasShirt = player.inventory.has(DESERT_SHIRT_ID);
    const hasRobe = player.inventory.has(DESERT_ROBE_ID);
    const hasBoots = player.inventory.has(DESERT_BOOTS_ID);

    if (hasShirt && hasRobe && hasBoots) {
        await npc.say('Great! You have the Desert Clothes!');
        await mes(
            player,
            'The slave starts getting undressed right in front of you.'
        );
        await npc.say("Ok, here's the clothes, I won't need them anymore.");
        await mes(player, 'The slave gives you his dirty, flea infested robe.');
        await mes(player, 'The slave gives you his muddy, sweat soaked shirt.');
        player.inventory.remove(DESERT_ROBE_ID);
        player.inventory.add(SLAVES_ROBE_BOTTOM_ID);
        player.inventory.remove(DESERT_SHIRT_ID);
        player.inventory.add(SLAVES_ROBE_TOP_ID);
        player.inventory.remove(DESERT_BOOTS_ID);
        player.disengage();
        const newSlave = toEscapingSlave(player, npc);
        await player.world.sleepTicks(2);
        player.engage(newSlave);
        await newSlave.say("Right, I'm off! Good luck!");
        await player.say('Yeah, good luck to you too!');
        player.disengage();
        const stage = stageOf(player);
        if (stage === STAGES.UNDO_CHAINS || stage === STAGES.NEED_CLOTHES) {
            player.questStages[QUEST_KEY] = STAGES.FREED_SLAVE;
        }
        return;
    }

    if (!hasShirt && !hasRobe && !hasBoots) {
        await npc.say(
            'I need a desert shirt, robe and boots if you want these clothes off me.'
        );
    } else if (!hasShirt && !hasRobe && hasBoots) {
        await npc.say(
            'I need desert robe and shirt if you want these clothes off me.'
        );
    } else if (!hasShirt && hasRobe && !hasBoots) {
        await npc.say(
            'I need a desert shirt and boots if you want these clothes off me.'
        );
    } else if (hasShirt && !hasRobe && !hasBoots) {
        await npc.say(
            'I need desert robe and boots if you want these clothes off me.'
        );
    } else if (!hasShirt && hasRobe && hasBoots) {
        await npc.say('I need a desert shirt if you want these clothes off me.');
    } else if (hasShirt && !hasRobe && hasBoots) {
        await npc.say('I need desert robe if you want these clothes off me.');
    } else if (hasShirt && hasRobe && !hasBoots) {
        await npc.say('I need desert boots if you want these clothes off me.');
    }

    if (player.questStages[QUEST_KEY] === STAGES.UNDO_CHAINS) {
        player.questStages[QUEST_KEY] = STAGES.NEED_CLOTHES;
    }
}

async function succeedFreeSlave(player, npc) {
    await mes(
        player,
        "You hear a satisfying 'click' as you tumble the lock mechanism."
    );
    await npc.say('Great! You did it!');
    await necessaryStuffSlave(player, npc);
}

// GIVEITAGO: lockpick attempt sequence
async function giveItAGo(player, npc) {
    await npc.say('Great!');
    await mes(
        player,
        'You use some nearby bits of wood and wire to try and pick the lock.'
    );
    const attempt1 = random(0, 1);
    if (attempt1 === 0) {
        await mes(player, 'You fail!');
        await mes(
            player,
            "You didn't manage to pick the lock this time, would you like another go?"
        );
        const anotherGo = await player.ask(
            [
                "Yeah, I'll give it another go.",
                "I'll try something different instead."
            ],
            false
        );
        if (anotherGo === 0) {
            await mes(
                player,
                'You use some nearby bits of wood and wire to try and pick the lock.'
            );
            const attempt2 = random(0, 1);
            if (attempt2 === 0) {
                await mes(player, 'You fail!');
                const mercenary = ifNearVisNpc(player, MERCENARY_ID, 15);
                if (mercenary) {
                    await mes(player, 'A nearby guard spots you!');
                    await npc.say('Oh oh!');
                    player.disengage();
                    player.engage(mercenary);
                    await mercenary.say('Oi, what are you two doing?');
                    await mercenary.attack(player);
                    await mes(player, 'The Guards search you!');
                    await mes(player, 'More guards rush to catch you.');
                    await mes(
                        player,
                        "You are roughed up a bit by the guards as you're manhandlded to a cell."
                    );
                    await mercenary.say(
                        'Into the cell you go! I hope this teaches you a lesson.'
                    );
                    player.disengage();
                    player.teleport(89, 801);
                }
            } else {
                await succeedFreeSlave(player, npc);
            }
        } else if (anotherGo === 1) {
            await mes(player, 'You decide to try something else.');
            await npc.say('Are you givin in already?');
            await player.say('I just want to try something else.');
            await npc.say('Ok, if you want to try again, let me know.');
        }
    } else {
        await succeedFreeSlave(player, npc);
    }
}

// NEWRECRUIT branch
async function newRecruit(player, npc) {
    await npc.say(
        "It's a shame that I won't be around long enough to get to know you.",
        "I'm making a break for it today.",
        'I have a plan to get out of here!',
        "It's amazing in it's sophistication."
    );
    const thirdMenu = await player.ask(
        [
            'What are those big wooden doors in the corner of the compound?',
            'Oh yes, that sounds interesting.'
        ],
        true
    );
    if (thirdMenu === 0) {
        await npc.say(
            'They lead to an underground mine,',
            "but you really don't want to go down there.",
            "I've only seen slaves and guards go down there,",
            'I never see the slaves come back up.',
            'At least up here you have a nice view and a bit of sun.'
        );
        await mes(
            player,
            'The slave smiles at you happily and then goes back to his work.'
        );
    } else if (thirdMenu === 1) {
        await npc.say(
            'Yes, it is actually.',
            'I have all the details figured out except for one.'
        );
        const four = await player.ask(
            ["What's that then?", "Oh, that's a shame."],
            false
        );
        if (four === 0) {
            await player.say("What's that then?");
            await mes(player, 'The slave shakes his arms and the chains rattle loudly.');
            await npc.say(
                "These bracelets, I can't seem to get them off.",
                "If I could get them off, I'd be able to climb my way",
                'out of here.'
            );
            const five = await player.ask(
                [
                    'I can try to undo them for you.',
                    "That's ridiculous, you're talking rubbish."
                ],
                true
            );
            if (five === 0) {
                await undoThem(player, npc);
            } else if (five === 1) {
                await npc.say(
                    "No, it's true, I can make a break for it",
                    'If I can just get these bracelets off.'
                );
                const six = await player.ask(
                    ['Good luck!', 'I can try to undo them for you.'],
                    true
                );
                if (six === 0) {
                    await npc.say('Thanks...same to you.');
                } else if (six === 1) {
                    await undoThem(player, npc);
                }
            }
        } else if (four === 1) {
            await player.say(
                "Oh, that's a shame...",
                "Still, 'worse things happen at sea right?'"
            );
            await npc.say(
                "You've obviously never worked as a slave",
                '...in a mining camp...',
                '...in the middle of the desert'
            );
            await player.say(
                "Well I suppose I'd better be getting on my way now..."
            );
            player.message('The slave nods in agreement and goes back to work.');
        }
    }
}

async function undoThem(player, npc) {
    await npc.say('Really, that would be great...');
    await mes(player, 'The slave looks at you strangely.');
    await npc.say(
        'Hang on a minute...I suppose you want something for doing this?',
        'The last time I did a trade in this place,',
        'I nearly lost the shirt from my back!'
    );
    const trade = await player.ask(
        ["It's funny you should say that...", 'That sounds awful.'],
        false
    );
    if (trade === 0) {
        await player.say("It's funny you should say that actually.");
        await mes(player, 'The slave looks at you blankly.');
        await npc.say('Yeah, go on!');
        await player.say(
            'If I can get the chains off, you have to give me something, ok?'
        );
        await npc.say('Sure, what do you want?');
        await player.say(
            'I want your clothes!',
            'I can dress like a slave and gain access to the mine area to scout it out.'
        );
        await npc.say(
            "Blimey! You're either incredibly brave or incredibly stupid.",
            'But what would I wear if you take my clothes?',
            "Get me some nice desert clothes and I'll think about it?",
            'Do you still want to try and undo the locks for me?'
        );
        player.questStages[QUEST_KEY] = STAGES.UNDO_CHAINS;
        delete player.cache.first_kill_captn;
        delete player.cache.mercenary_bet;
        const go = await player.ask(
            ["Yeah, Ok, let's give it a go.", 'I need to do some other things first.'],
            true
        );
        if (go === 0) {
            await giveItAGo(player, npc);
        } else if (go === 1) {
            await npc.say(
                'Ok, fair enough, let me know when you want to give it another go.'
            );
        }
    } else if (trade === 1) {
        await player.say('That sounds awful.');
        await npc.say(
            'Yeah, bunch of no hopers, tried to rob me blind.',
            "But I guess that's what you get when you deal with convicts."
        );
    }
}

async function slaveDialogue(player, npc) {
    const stage = stageOf(player);
    switch (stage) {
        case STAGES.NOT_STARTED:
        case STAGES.SEARCHING: {
            await npc.say(
                "You look like a new 'recruit'.",
                'How long have you been here?'
            );
            const menu = await player.ask(
                ["I've just arrived.", "Oh, I've been here ages."],
                true
            );
            if (menu === 0) {
                await npc.say('Yeah, it looks like it as well.');
                await newRecruit(player, npc);
            } else if (menu === 1) {
                await npc.say(
                    "That's funny, I haven't seen you around here before.",
                    "You're clothes look too clean for you to have been here ages."
                );
                const secondMenu = await player.ask(
                    ['Ok, you caught me out.', 'The guards allow me to clean my clothes.'],
                    true
                );
                if (secondMenu === 0) {
                    await npc.say('Ah ha! I knew it! A new recruit then?');
                    await newRecruit(player, npc);
                } else if (secondMenu === 1) {
                    await npc.say(
                        'Oh, a special relationship with the guards heh?',
                        'How very nice of them.',
                        'Maybe you could persuade them to let me out of here?'
                    );
                    await mes(
                        player,
                        'The slave swaggers of with a sarcastic smirk on his face.'
                    );
                }
            }
            break;
        }
        case STAGES.UNDO_CHAINS: {
            await npc.say('Hello again, are you ready to unlock my chains?');
            const opt = await player.ask(
                ["Yeah, Ok, let's give it a go.", 'I need to do some other things first.'],
                true
            );
            if (opt === 0) {
                await giveItAGo(player, npc);
            } else if (opt === 1) {
                await npc.say(
                    'Ok, fair enough, let me know when you want to give it another go.'
                );
            }
            break;
        }
        case STAGES.NEED_CLOTHES:
            await npc.say('Do you have the Desert Clothes yet?');
            await necessaryStuffSlave(player, npc);
            break;
        case STAGES.FREED_SLAVE:
        case STAGES.NEED_PINEAPPLE:
        case STAGES.HAVE_COPY_KEY:
        case STAGES.MAKING_WEAPON:
        case STAGES.MADE_WEAPON:
        case STAGES.ATE_PINEAPPLE:
        case STAGES.HAVE_ANA:
        case STAGES.COMPLETE:
            if (inTouristTrapCave(player)) {
                await npc.say("Can't you see I'm busy?");
                if (!hasSlaveDisguise(player) && stage !== STAGES.COMPLETE) {
                    player.message(
                        'A guard notices you and starts running after you.'
                    );
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
                        player.message(
                            'The guards find the cell door key and remove it!'
                        );
                        player.inventory.remove(CELL_DOOR_KEY_ID);
                    }
                    await mes(player, 'Some guards rush to help their comrade.');
                    await mes(
                        player,
                        "You are roughed up a bit by the guards as you're manhandlded into a cell."
                    );
                    await guard.say(
                        'Into the cell you go! I hope this teaches you a lesson.'
                    );
                    player.disengage();
                    if (stage >= STAGES.ATE_PINEAPPLE) {
                        player.teleport(74, 3626);
                    } else {
                        player.teleport(89, 801);
                    }
                }
            } else if (
                player.inventory.has(SLAVES_ROBE_BOTTOM_ID) &&
                player.inventory.has(SLAVES_ROBE_TOP_ID)
            ) {
                await npc.say('Not much to do here but mine all day long.');
            } else {
                await npc.say(
                    'Oh bother, I was caught by the guards again...',
                    'Listen, if you can get me some Desert Clothes,',
                    " I'll trade you for my slaves clothes again..",
                    'Do you want to trade?'
                );
                const trade = await player.ask(
                    ["Yes, I'll trade.", 'No thanks...'],
                    true
                );
                if (trade === 0) {
                    await necessaryStuffSlave(player, npc);
                } else if (trade === 1) {
                    await npc.say(
                        'Ok, fair enough, let me know if you change your mind though.'
                    );
                }
            }
            break;
        default:
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id === MINING_SLAVE_ID) {
        player.engage(npc);
        await slaveDialogue(player, npc);
        player.disengage();
        return true;
    }
    if (npc.id === ESCAPING_MINING_SLAVE_ID) {
        player.engage(npc);
        await npc.say(
            "Hey, I'm trying to escape!",
            "You're attracting too much attention to me!",
            'See ya!'
        );
        player.disengage();
        return true;
    }
    return false;
}

module.exports = { onTalkToNPC };
