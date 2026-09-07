// mosol rei, shilo village quest start npc

const { questsEnabled } = require('../../custom-gate.js');
const { MOSOL_ID } = require('./ids.js');

// cID constants (OpenRSC MoselRei inner class)
const WHAT_DANGER_IS_THERE = 0;
const WHAT_CAN_WE_DO = 1;
const SOMEONE_WHO_DOES_KNOW = 2;

async function moselReiDialogue(player, npc, cID) {
    const { world } = player;

    if (cID === -1) {
        switch (player.questStages.shiloVillage) {
            case -1: {
                await player.say('Greetings!');
                await npc.say(
                    'Hello Effendi,',
                    'We have removed the threat of Rashiliyia and even though',
                    'there are still some random outbreaks of undead activity,',
                    'we are more than able to deal with it.',
                    'You can now enter Shilo village.',
                    'Please follow me...'
                );
                const myMenu = await player.ask(
                    [
                        "Yes, OK, I'll go into the village!",
                        "I think I'll see it some other time."
                    ],
                    true
                );
                if (myMenu === 0) {
                    player.message('Mosol leads you into the village.');
                    player.teleport(395, 851);
                    player.message('@yel@Mosol: Have a nice time!');
                    player.message(
                        'Mosol leaves you by the gate and walks back out into the jungle.'
                    );
                } else if (myMenu === 1) {
                    player.message('You decide to stay where you are.');
                }
                break;
            }
            case 0:
            case undefined: {
                player.message(
                    'Mosol seems to be looking around very cautiously.'
                );
                player.message(
                    'He jumps a little when you approach and talk to him.'
                );
                await npc.say(
                    'Run! Run for your life!',
                    'Save yourself!',
                    "I'll keep them back as long as I can..."
                );
                const menu = await player.ask(
                    [
                        'Why do I need to run?',
                        "Yeah..Ok, I'm running!",
                        'Who are you?'
                    ],
                    true
                );
                if (menu === 0) {
                    await npc.say(
                        'Your very life is in danger!',
                        'Rashiliyia has returned and we are all doomed!'
                    );
                    const menu3 = await player.ask(
                        [
                            'Rashiliyia? Who is she?',
                            'What danger is there around here?'
                        ],
                        true
                    );
                    if (menu3 === 0) {
                        await npc.say(
                            'Rashiliyia? She is the Queen of the dead!',
                            'She has returned and has bought a plague of undead with her.',
                            'They now occupy our village and we have them trapped.',
                            'We warn people like yourself to stay away!'
                        );
                        const menu4 = await player.ask(
                            [
                                'What can we do?',
                                'Uh, it sounds nasty, just the kind of thing I want to avoid!'
                            ],
                            true
                        );
                        if (menu4 === 0) {
                            await moselReiDialogue(player, npc, WHAT_CAN_WE_DO);
                            // STARTED SHILO VILLAGE QUEST!
                            player.questStages.shiloVillage = 1;
                        } else if (menu4 === 1) {
                            player.message(
                                '@que@Mosol casts a disaproving glance at you'
                            );
                            await world.sleepTicks(3);
                            await npc.say(
                                'Quite right, bwana, please make all haste!',
                                'Before your spine turns to water as we speak.'
                            );
                        }
                    } else if (menu3 === 1) {
                        await moselReiDialogue(player, npc, WHAT_DANGER_IS_THERE);
                    }
                } else if (menu === 1) {
                    await npc.say('God speed to you my friend!');
                } else if (menu === 2) {
                    await npc.say(
                        'I am Mosol Rei, a jungle warrior. ',
                        'I used to live in this village.',
                        'But it is too dangerous for you to stay around here!'
                    );
                    const menu2 = await player.ask(
                        [
                            "Mosol Rei, that's a nice name.",
                            'What danger is there around here?'
                        ],
                        true
                    );
                    if (menu2 === 0) {
                        player.message(
                            'Mosol looks at you and shakes his head in bewilderment.'
                        );
                        await npc.say('Thanks! But you really should leave!');
                    } else if (menu2 === 1) {
                        await moselReiDialogue(player, npc, WHAT_DANGER_IS_THERE);
                    }
                }
                break;
            }
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8: {
                await npc.say(
                    'Oh are you still here?',
                    'The undead seem to be getting stronger!'
                );
                const option = await player.ask(
                    ['Why are the undead here?', 'What can we do?'],
                    true
                );
                if (option === 0) {
                    await npc.say(
                        'Rashiliyia! The Queen of the dead has risen!',
                        'She is the mother of the undead creatures that roam this land.',
                        'But I know nothing of the legend that surounds her'
                    );
                    const subOpt = await player.ask(
                        [
                            'Legend you say?',
                            "I don't think this is something I can help with at the moment!"
                        ],
                        true
                    );
                    if (subOpt === 0) {
                        await npc.say(
                            'Yes. I said it was a legend that I know nothing about.'
                        );
                        const subOpt2 = await player.ask(
                            [
                                'Oh, Ok, sorry for bothering you',
                                'Oh come on, you must know something!',
                                'Maybe you know someone who does know something?'
                            ],
                            true
                        );
                        if (subOpt2 === 0) {
                            await npc.say(
                                "Ok, perhaps you'd like to be on your way now?"
                            );
                        } else if (subOpt2 === 1) {
                            player.message(
                                '@que@Mosol lowers his brows in deep concentration'
                            );
                            await world.sleepTicks(3);
                            await npc.say('Well, let me have a think?');
                            player.message('@que@He scratches his head.');
                            await world.sleepTicks(3);
                            await npc.say(
                                'Hmmm, there was something I think that might help...',
                                "No, sorry, it's gone."
                            );
                            const subOpt3 = await player.ask(
                                [
                                    'Maybe you know someone who does know something?',
                                    'Oh, Ok, sorry for bothering you'
                                ],
                                true
                            );
                            if (subOpt3 === 0) {
                                await moselReiDialogue(
                                    player,
                                    npc,
                                    SOMEONE_WHO_DOES_KNOW
                                );
                            } else if (subOpt3 === 1) {
                                await npc.say(
                                    "Ok, perhaps you'd like to be on your way now?"
                                );
                            }
                        } else if (subOpt2 === 2) {
                            await moselReiDialogue(
                                player,
                                npc,
                                SOMEONE_WHO_DOES_KNOW
                            );
                        }
                    } else if (subOpt === 1) {
                        await npc.say(
                            'Ok, I understand, you may as well be on your way then.'
                        );
                    }
                } else if (option === 1) {
                    await moselReiDialogue(player, npc, WHAT_CAN_WE_DO);
                }
                break;
            }
        }
    }

    switch (cID) {
        case WHAT_DANGER_IS_THERE:
            await npc.say(
                'Can you not see Bwana?',
                'This whole area is infested with the Living dead.'
            );
            break;
        case WHAT_CAN_WE_DO:
            await npc.say(
                'We are doing all that we can just to keep the undead at bay!',
                'The village is covered in a deadly green mist.',
                'If you go into the village, a terrible sickness will befall you.',
                'And the undead creatures are even stonger beyond the gates.',
                'My guess is that it has something to do with the legend of Rashiliyia.',
                'But you would need to speak to the Witch Doctor in the Tai Bwo Wannai village.',
                'To get more details about that.',
                'I really have to go now and fight these undead!'
            );
            break;
        case SOMEONE_WHO_DOES_KNOW:
            await npc.say(
                'My guess is that this has something to do with the legend of Rashiliyia.',
                "But you need to speak to the Witch Doctor in 'Tai Bwo Wannai' village.",
                'To get more details about that.',
                'I really have to go now and fight these undead',
                'Before they take over the world!'
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== MOSOL_ID) {
        return false;
    }

    player.engage(npc);
    await moselReiDialogue(player, npc, -1);
    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
