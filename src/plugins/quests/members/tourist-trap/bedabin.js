// bedabin nomad (water shop), al shabim, and the bedabin nomad guard

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    BEDABIN_NOMAD_ID,
    BEDABIN_NOMAD_GUARD_ID,
    AL_SHABIM_ID,
    COINS_ID,
    BUCKET_OF_WATER_ID,
    FULL_WATER_SKIN_ID,
    JUG_OF_WATER_ID,
    BEDOBIN_COPY_KEY_ID,
    TECHNICAL_PLANS_ID,
    PROTOTYPE_THROWING_DART_ID,
    TENTI_PINEAPPLE_ID,
    BRONZE_BAR_ID,
    FEATHER_ID,
    BRONZE_THROWING_DART_ID,
    STAGES,
    stageOf
} = require('./constants.js');

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}


const WATER_MENU = [
    'What is this place?',
    'Where is the Shantay Pass.',
    'Buy a jug of water - 5 Gold Pieces.',
    'Buy a full waterskin - 25 Gold Pieces.',
    'Buy a bucket of water - 20 Gold Pieces.'
];

async function nomadRootMenu(player, npc) {
    await npc.say('How can I help you?');
    const menu = await player.ask(WATER_MENU, false);
    if (menu === 0) {
        await nomadPlace(player, npc);
    } else if (menu === 1) {
        await nomadShantay(player, npc);
    } else if (menu === 2) {
        await nomadJug(player, npc);
    } else if (menu === 3) {
        await nomadWaterskin(player, npc);
    } else if (menu === 4) {
        await nomadBucket(player, npc);
    }
}

async function nomadBucket(player, npc) {
    if (player.inventory.has(COINS_ID, 20)) {
        await mes(player, 'You hand over 20 gold pieces.');
        player.inventory.remove(COINS_ID, 20);
        await npc.say('Very well Effendi!');
        await mes(player, 'You recieve a bucket of water.');
        player.inventory.add(BUCKET_OF_WATER_ID, 1);
    } else {
        await mes(player, "Sorry Effendi, you don't seem to have the money.");
    }
    await nomadRootMenu(player, npc);
}

async function nomadWaterskin(player, npc) {
    if (player.inventory.has(COINS_ID, 25)) {
        await mes(player, 'You hand over 25 gold pieces.');
        player.inventory.remove(COINS_ID, 25);
        await npc.say('Very well Effendi!');
        await mes(player, 'You recieve a full waterskin.');
        player.inventory.add(FULL_WATER_SKIN_ID, 1);
    } else {
        await mes(player, "Sorry Effendi, you don't seem to have the money.");
    }
    await nomadRootMenu(player, npc);
}

async function nomadJug(player, npc) {
    if (player.inventory.has(COINS_ID, 5)) {
        await mes(player, 'You hand over 5 gold pieces.');
        player.inventory.remove(COINS_ID, 5);
        await npc.say('Very well Effendi!');
        await mes(player, 'You recieve a jug full or water.');
        player.inventory.add(JUG_OF_WATER_ID, 1);
    } else {
        await mes(player, "Sorry Effendi, you don't seem to have the money.");
    }
    await nomadRootMenu(player, npc);
}

async function nomadPlace(player, npc) {
    await npc.say(
        'This is the camp of the Bedabin.',
        "Talk to our leader, Al Shabim, he'll be happy to chat."
    );
    player.message('We can sell you very reasonably priced water...');
    await npc.say('How can I help you?');
    const opt = await player.ask(
        [
            'Where is the Shantay Pass.',
            'Buy a jug of water - 5 Gold Pieces.',
            'Buy a full waterskin - 25 Gold Pieces.',
            'Buy a bucket of water - 20 Gold Pieces.'
        ],
        false
    );
    if (opt === 0) {
        await nomadShantay(player, npc);
    } else if (opt === 1) {
        await nomadJug(player, npc);
    } else if (opt === 2) {
        await nomadWaterskin(player, npc);
    } else if (opt === 3) {
        await nomadBucket(player, npc);
    }
}

async function nomadShantay(player, npc) {
    await npc.say(
        'It is North East of here effendi, across the trackless desert.',
        'It will be a thirsty trip, can I interest you in a drink?',
        'How can I help you?'
    );
    const opt = await player.ask(
        [
            'Buy a jug of water - 5 Gold Pieces.',
            'What is this place?',
            'Buy a full waterskin - 25 Gold Pieces.',
            'Buy a bucket of water - 20 Gold Pieces.'
        ],
        false
    );
    if (opt === 0) {
        await nomadJug(player, npc);
    } else if (opt === 1) {
        await nomadPlace(player, npc);
    } else if (opt === 2) {
        await nomadWaterskin(player, npc);
    } else if (opt === 3) {
        await nomadBucket(player, npc);
    }
}

async function bedabinNomadDialogue(player, npc) {
    await npc.say('Hello Effendi!', 'How can I help you?');
    const menu = await player.ask(WATER_MENU, false);
    if (menu === 0) {
        await player.say('What is this place?');
        await nomadPlace(player, npc);
    } else if (menu === 1) {
        await player.say('Where is the Shantay Pass.');
        await nomadShantay(player, npc);
    } else if (menu === 2) {
        await player.say('Buy a jug of water - 5 Gold Pieces.');
        await nomadJug(player, npc);
    } else if (menu === 3) {
        await player.say('Buy a full waterskin - 25 Gold Pieces.');
        await nomadWaterskin(player, npc);
    } else if (menu === 4) {
        await player.say('Buy a bucket of water - 20 Gold Pieces.');
        await nomadBucket(player, npc);
    }
}


async function alShabimWhatIsThisPlace(player, npc) {
    await npc.say(
        'This is the home of the Bedabin, ',
        "We're a peaceful tribe of desert dwellers.",
        "Some idiots call us 'Tenti's', a childish name borne of ignorance.",
        "We're renowned for surviving in the harshest desert climate.",
        "We also grow the 'Bedabin ambrosia.'...",
        'A pineapple of such delicious sumptiousness that it defies description.',
        'Take a look around our camp if you like!'
    );
    const menu = await player.ask(
        ['Ok Thanks!', 'What is there to do around here?'],
        true
    );
    if (menu === 0) {
        await npc.say('Good day Effendi!');
    } else if (menu === 1) {
        await npc.say(
            'Well, we are all very busy most of the time tending to the pineapples.',
            'They are grown in a secret location.',
            'To stop thieves from raiding our most precious prize.'
        );
    }
}

async function alShabimHavePlans(player, npc) {
    await npc.say(
        'Aha! I see you have the plans.',
        'This is great!',
        'However, these plans do indeed look very technical',
        'My people have further need of your skills.',
        'If you can help us to manufacture this item,',
        "we will share it's secret with you.",
        'Does this deal interest you effendi?'
    );
    const tati = await player.ask(
        ["Yes, I'm very interested.", 'No, sorry.'],
        true
    );
    if (tati === 0) {
        if (
            player.inventory.has(BRONZE_BAR_ID) &&
            player.inventory.has(FEATHER_ID, 10)
        ) {
            await npc.say(
                'Aha! I see you have the items we need!',
                'Are you still willing to help make the weapon?'
            );
            const make = await player.ask(
                ["Yes, I'm kind of curious.", 'No,sorry.'],
                true
            );
            if (make === 0) {
                await npc.say(
                    'Ok Effendi, you need to follow the plans.',
                    'You will need some special tools for this...',
                    'There is a forge in the other tent.',
                    'You have my permision to use it, but show the plans to the guard.',
                    'You have the plans and the all the items needed, ',
                    'You should be able to complete the item on your own.',
                    'Please bring me the item when it is finished.'
                );
                if (player.questStages[QUEST_KEY] === STAGES.HAVE_COPY_KEY) {
                    player.questStages[QUEST_KEY] = STAGES.MAKING_WEAPON;
                }
            } else if (make === 1) {
                await npc.say(
                    'As you wish effendi!',
                    'Come back if you change your mind!'
                );
            }
        } else {
            await npc.say(
                'Great, we need the following items.',
                'A bar of pure bronze and 10 feathers.',
                "Bring them to me and we'll continue to make the item."
            );
        }
    } else if (tati === 1) {
        await npc.say('As you wish effendi!', 'Come back if you change your mind!');
    }
}

async function alShabimMadeWeapon(player, npc) {
    await npc.say('Wonderful, I see you have made the new weapon!');
    await mes(player, 'You show Al Shabim the prototype dart.');
    player.inventory.remove(PROTOTYPE_THROWING_DART_ID);
    await npc.say('This is truly fantastic Effendi!');
    if (player.inventory.has(TECHNICAL_PLANS_ID)) {
        await npc.say('We will take the technical plans for the weapon as well.');
        player.inventory.remove(TECHNICAL_PLANS_ID);
        await mes(player, 'You hand over the technical plans for the weapon.');
    }
    await npc.say(
        'We are forever grateful for this gift.',
        'My advisors have discovered some secrets which we will share with you.'
    );
    await mes(
        player,
        "Al Shabim's advisors show you some advanced techniques for making the new weapon."
    );
    await npc.say('Oh, and here is your pineapple!');
    player.inventory.add(TENTI_PINEAPPLE_ID, 1);
    await npc.say(
        'Please accept this selection of six bronze throwing darts',
        'as a token of our appreciation.'
    );
    player.inventory.add(BRONZE_THROWING_DART_ID, 6);
    if (player.inventory.has(BEDOBIN_COPY_KEY_ID)) {
        await npc.say("I'll take that key off your hands as well effendi!");
        player.inventory.remove(BEDOBIN_COPY_KEY_ID);
        await npc.say('Many thanks!');
    }
    player.message('');
    player.message(
        '********************************************************************'
    );
    player.message(
        '*** You can now make a new weapon type: Throwing dart. ***'
    );
    player.message(
        '********************************************************************'
    );
    player.questStages[QUEST_KEY] = STAGES.MADE_WEAPON;
}

async function alShabimDialogue(player, npc) {
    const stage = stageOf(player);
    switch (stage) {
        case STAGES.NOT_STARTED: {
            await npc.say(
                'Hello Effendi!',
                'I am Al Shabim, greetings on behalf of the Bedabin nomads.'
            );
            const menu = await player.ask(
                ['What is this place?', 'Goodbye!'],
                true
            );
            if (menu === 0) {
                await alShabimWhatIsThisPlace(player, npc);
            } else if (menu === 1) {
                await npc.say('Very well, good day Effendi!');
            }
            break;
        }
        case 1:
        case 2:
        case 3:
        case 4: {
            await npc.say(
                'Hello Effendi!',
                'I am Al Shabim, greetings on behalf of the Bedabin nomads.'
            );
            if (
                player.cache.find_al_bhasim !== undefined &&
                !player.inventory.has(require('./constants.js').METAL_KEY_ID)
            ) {
                const menuO = await player.ask(
                    ['I am looking for Al Zaba Bhasim.', 'What is this place?'],
                    true
                );
                if (menuO === 0) {
                    await npc.say(
                        'Huh! You have been talking to the guards at the mining camp.',
                        'Or worse, that cowardly mercenary captain.',
                        'Al Zaba Bhasim does not exist, he is a figment of their imagination!',
                        'Go back and tell this captain that if he wants to find this man',
                        'he should search for him personally.',
                        'See how much of his own time he would like to waste.'
                    );
                } else if (menuO === 1) {
                    await alShabimWhatIsThisPlace(player, npc);
                }
            } else {
                const menuO = await player.ask(
                    ['What is this place?', 'Goodbye!'],
                    true
                );
                if (menuO === 0) {
                    await alShabimWhatIsThisPlace(player, npc);
                } else if (menuO === 1) {
                    await npc.say('Very well, good day Effendi!');
                }
            }
            break;
        }
        case STAGES.NEED_PINEAPPLE: {
            await npc.say(
                'Hello Effendi!',
                'I am Al Shabim, greetings on behalf of the Bedabin nomads.'
            );
            const option = await player.ask(
                ['I am looking for a pineapple.', 'What is this place?'],
                true
            );
            if (option === 0) {
                await npc.say(
                    'Oh yes, well that is interesting.',
                    'Our sweet pineapples are renowned throughout the whole of Kharid !',
                    "And I'll give you one if you do me a favour?"
                );
                await player.say('Yes ?');
                await npc.say(
                    'Captain Siad at the mining camp is holding some secret information.',
                    'It is very important to us and we would like you to get it for us.',
                    'It gives details of an interesting, yet ancient weapon.',
                    'We would gladly share this information with you.',
                    'All you have to do is gain access to his private room upstairs.',
                    'We have a key for the chest that contains this information.',
                    'Are you interested in our deal?'
                );
                const opt = await player.ask(
                    ["Yes, I'm interested.", 'Not at the moment.'],
                    true
                );
                if (opt === 0) {
                    await npc.say(
                        "That's great Effendi!",
                        'Here is a copy of the key that should give you access to the chest.',
                        'Bring us back the plans inside the chest, they should be sealed.',
                        'All haste to you Effendi!'
                    );
                    player.inventory.add(BEDOBIN_COPY_KEY_ID, 1);
                    player.questStages[QUEST_KEY] = STAGES.HAVE_COPY_KEY;
                } else if (opt === 1) {
                    await npc.say('Very well Effendi!');
                }
            } else if (option === 1) {
                await alShabimWhatIsThisPlace(player, npc);
            }
            break;
        }
        case STAGES.HAVE_COPY_KEY:
        case STAGES.MAKING_WEAPON: {
            await npc.say('Hello Effendi!');
            if (player.inventory.has(PROTOTYPE_THROWING_DART_ID)) {
                await alShabimMadeWeapon(player, npc);
            } else if (
                player.inventory.has(TECHNICAL_PLANS_ID) &&
                !player.inventory.has(PROTOTYPE_THROWING_DART_ID)
            ) {
                await alShabimHavePlans(player, npc);
            } else if (
                player.inventory.has(BEDOBIN_COPY_KEY_ID) &&
                !player.inventory.has(TECHNICAL_PLANS_ID)
            ) {
                await npc.say('How are things going Effendi?');
                const dede = await player.ask(
                    [
                        'Very well thanks!',
                        'Not so good actually!',
                        'What is this place?',
                        'Goodbye!'
                    ],
                    true
                );
                if (dede === 0) {
                    if (player.cache.tech_plans === undefined) {
                        await npc.say('Well, hurry along and get those plans for me.');
                    } else {
                        await npc.say('I really need those plans!');
                    }
                } else if (dede === 1) {
                    if (player.cache.tech_plans === undefined) {
                        await npc.say(
                            'Well, first you need to get those plans from Captain Siad.'
                        );
                    } else {
                        await npc.say(
                            "Bring me the plans from Captain Siad's office...they're in a chest."
                        );
                    }
                } else if (dede === 2) {
                    await alShabimWhatIsThisPlace(player, npc);
                } else if (dede === 3) {
                    await npc.say('Very well, good day Effendi!');
                }
            } else if (player.cache.tech_plans !== undefined) {
                const keke = await player.ask(
                    ["I've lost the key and the plans!", 'What is this place?', 'Goodbye!'],
                    true
                );
                if (keke === 0) {
                    await npc.say('How very careless of you!');
                    player.message('Al Shabim thinks for a moment.');
                    await npc.say(
                        'The Captain may have some new plans drawn up.',
                        'Go back and see if you can collect them.',
                        "Here is the key you'll need for the chest!"
                    );
                    player.message('Al Shabim gives you another key.');
                    player.inventory.add(BEDOBIN_COPY_KEY_ID, 1);
                } else if (keke === 1) {
                    await alShabimWhatIsThisPlace(player, npc);
                } else if (keke === 2) {
                    await npc.say('Very well, good day Effendi!');
                }
            } else {
                const kaka = await player.ask(
                    ["I've lost the key!", 'What is this place?', 'Goodbye!'],
                    true
                );
                if (kaka === 0) {
                    await npc.say(
                        'How very careless of you!',
                        "Here is another key, don't lose it this time !"
                    );
                    player.message('Al Shabim gives you another key.');
                    player.inventory.add(BEDOBIN_COPY_KEY_ID, 1);
                } else if (kaka === 1) {
                    await alShabimWhatIsThisPlace(player, npc);
                } else if (kaka === 2) {
                    await npc.say('Very well, good day Effendi!');
                }
            }
            break;
        }
        case STAGES.MADE_WEAPON:
        case STAGES.ATE_PINEAPPLE:
        case STAGES.HAVE_ANA:
        case STAGES.COMPLETE: {
            if (player.inventory.has(PROTOTYPE_THROWING_DART_ID)) {
                await npc.say(
                    'Hello Effendi!',
                    'Wonderful, I see you have made the new weapon!',
                    'Where did you get this from Effendi!',
                    "I'll have to confiscate this for your own safety!"
                );
                player.inventory.remove(PROTOTYPE_THROWING_DART_ID);
                return;
            }
            if (player.inventory.has(TECHNICAL_PLANS_ID)) {
                await npc.say('Hello Effendi!');
                await alShabimHavePlans(player, npc);
                return;
            }
            if (stage === STAGES.MADE_WEAPON) {
                await npc.say(
                    'Hello Effendi!',
                    'Many thanks with your help previously Effendi!'
                );
                if (player.inventory.has(TENTI_PINEAPPLE_ID)) {
                    const mopt = await player.ask(
                        ['What is this place?', 'Goodbye!'],
                        true
                    );
                    if (mopt === 0) {
                        await alShabimWhatIsThisPlace(player, npc);
                    } else if (mopt === 1) {
                        await npc.say('Very well, good day Effendi!');
                    }
                } else {
                    const mopt = await player.ask(
                        ['I am looking for a pineapple.', 'What is this place?'],
                        true
                    );
                    if (mopt === 0) {
                        await npc.say(
                            'Here is another pineapple, try not to lose this one.'
                        );
                        player.message('Al Shabim gives you another pineapple.');
                        player.inventory.add(TENTI_PINEAPPLE_ID, 1);
                    } else if (mopt === 1) {
                        await alShabimWhatIsThisPlace(player, npc);
                    }
                }
            } else {
                await npc.say(
                    'Hello Effendi!',
                    'Many thanks with your help previously Effendi!',
                    'I am Al Shabim, greetings on behalf of the Bedabin nomads.'
                );
                const mopt = await player.ask(
                    ['What is this place?', 'Goodbye!'],
                    true
                );
                if (mopt === 0) {
                    await alShabimWhatIsThisPlace(player, npc);
                } else if (mopt === 1) {
                    await npc.say('Very well, good day Effendi!');
                }
            }
            break;
        }
        default:
            break;
    }
}

// used when technical plans are used on al shabim
async function indirectTalktoAlShabim(player, npc) {
    if (npc.id !== AL_SHABIM_ID) {
        return;
    }
    const stage = stageOf(player);
    if (stage === STAGES.HAVE_COPY_KEY || stage === STAGES.MAKING_WEAPON) {
        await alShabimHavePlans(player, npc);
    } else if (stage > STAGES.MAKING_WEAPON || stage === STAGES.COMPLETE) {
        await mes(player, 'Al Shabim takes the technical plans off you.');
        await npc.say(
            'Thanks for the technical plans Effendi!',
            "We've been lost without them!"
        );
    }
}


async function bedabinNomadGuardDialogue(player, npc) {
    const stage = stageOf(player);
    switch (stage) {
        case STAGES.MADE_WEAPON:
        case STAGES.ATE_PINEAPPLE:
        case STAGES.HAVE_ANA:
        case STAGES.COMPLETE:
            await npc.say(
                "Sorry, but you can't use the tent without permission.",
                'But thanks for your help to the Bedabin people.'
            );
            if (player.inventory.has(TECHNICAL_PLANS_ID)) {
                await npc.say(
                    "And we'll take those plans off your hands as well!"
                );
                player.inventory.remove(TECHNICAL_PLANS_ID);
            }
            break;
        default:
            await npc.say(
                'Sorry, this is a private tent, no one is allowed in.',
                'Orders of Al Shabim...'
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id === BEDABIN_NOMAD_ID) {
        player.engage(npc);
        await bedabinNomadDialogue(player, npc);
        player.disengage();
        return true;
    }
    if (npc.id === AL_SHABIM_ID) {
        player.engage(npc);
        await alShabimDialogue(player, npc);
        player.disengage();
        return true;
    }
    if (npc.id === BEDABIN_NOMAD_GUARD_ID) {
        player.engage(npc);
        await bedabinNomadGuardDialogue(player, npc);
        player.disengage();
        return true;
    }
    return false;
}

module.exports = {
    onTalkToNPC,
    alShabimDialogue,
    alShabimHavePlans,
    alShabimMadeWeapon,
    indirectTalktoAlShabim,
    bedabinNomadGuardDialogue
};
