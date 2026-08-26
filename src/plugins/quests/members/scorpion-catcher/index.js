// scorpion catcher: cage 3 kharid scorpions for thormac, seer locates each

const { questsEnabled } = require('../../custom-gate.js');

// npc ids
const THORMAC_ID = 300; // THORMAC_THE_SORCEROR
const SEER_ID = 301; // SEER
const VELRAK_ID = 272; // VELRAK_THE_EXPLORER

const KHARID_SCORPION_TAVERLEY_ID = 302;
const KHARID_SCORPION_BARBARIAN_ID = 303;
const KHARID_SCORPION_MONASTERY_ID = 304;

// item ids
const SCORPION_CAGE_NONE = 678;
const SCORPION_CAGE_ONE = 679; // Taverley only
const SCORPION_CAGE_ONE_TWO = 680;
const SCORPION_CAGE_ONE_TWO_THREE = 681; // full
const SCORPION_CAGE_TWO = 686; // Barbarian only
const SCORPION_CAGE_THREE = 687; // Monastery only
const SCORPION_CAGE_ONE_THREE = 688;
const SCORPION_CAGE_TWO_THREE = 689;

const COINS_ID = 10;
const DUSTY_KEY_ID = 596;
const JAIL_KEYS_ID = 595;

const BATTLESTAFF_OF_FIRE = 615;
const BATTLESTAFF_OF_WATER = 616;
const BATTLESTAFF_OF_AIR = 617;
const BATTLESTAFF_OF_EARTH = 618;
const ENCHANTED_BATTLESTAFF_OF_FIRE = 682;
const ENCHANTED_BATTLESTAFF_OF_WATER = 683;
const ENCHANTED_BATTLESTAFF_OF_AIR = 684;
const ENCHANTED_BATTLESTAFF_OF_EARTH = 685;

// door / wall-object ids and coords
const DOOR_ID = 83; // Velrak cell doors (jail keys)
const DUSTY_DOOR_ID = 84; // dusty key door into blue dragon lair
const SECRET_WALL_ID = 87; // secret push-wall in Taverley dungeon

// quest stages: 0/undefined not started, 1 has the cage, 2 catching in progress, -1 complete

// Set of all cage item ids (OpenRSC "cages" list in onUseNpc).
const ALL_CAGES = [
    SCORPION_CAGE_NONE,
    SCORPION_CAGE_ONE,
    SCORPION_CAGE_TWO,
    SCORPION_CAGE_THREE,
    SCORPION_CAGE_ONE_TWO,
    SCORPION_CAGE_ONE_THREE,
    SCORPION_CAGE_TWO_THREE
];

function has(player, id) {
    return player.inventory.has(id);
}

// seer

// OpenRSC SEER_NPC.LOCATE_SCORPIONS
async function seerLocateScorpions(player, npc) {
    await npc.say(
        'Well you have come to the right place',
        'I am a master of animal detection',
        'Do you need to locate any particular scorpion',
        'Scorpions are a creature somewhat in abundance'
    );
    await player.say(
        "I'm looking for some lesser kharid scorpions",
        'They belong to Thormac the sorceror'
    );
    await npc.say('Let me look into my looking glass');
    player.message('The seer produces a small mirror');
    await player.world.sleepTicks(3);
    player.message('The seer gazes into the mirror');
    await player.world.sleepTicks(3);
    player.message('The seer smoothes his hair with his hand');
    await player.world.sleepTicks(3);
    await npc.say(
        'I can see a scorpion that you seek',
        'It would appear to be near some  nasty looking spiders',
        'I can see two coffins there as well',
        'The scorpion seems to be going through some crack in the wall',
        "He's gone into some sort of secret room",
        'Well see if you can find that scorpion then',
        "And I'll try and get you some information on the others"
    );

    if (player.questStages.scorpionCatcher === 1) {
        player.questStages.scorpionCatcher = 2;
    }
}

// OpenRSC SEER_NPC.PRIMARY_DIALOGUE
async function seerPrimaryDialogue(player, npc) {
    // OG post-quest doesn't say this and jumps directly to menu
    if (player.questStages.scorpionCatcher !== -1) {
        await npc.say('Many greetings');
    }

    const menu = await player.ask(
        ['Many greetings', 'I seek knowledge and power'],
        true
    );

    if (menu === 1) {
        await npc.say(
            'Knowledge comes from experience, power comes from battleaxes'
        );
    }
}

async function seerDialogue(player, npc) {
    const stage = player.questStages.scorpionCatcher || 0;

    switch (stage) {
        case 0:
        case -1:
            await seerPrimaryDialogue(player, npc);
            break;

        case 1: {
            await npc.say('Many greetings');
            const first = await player.ask(
                [
                    'I need to locate some scorpions',
                    'Your friend Thormac sent me to speak to you',
                    'I seek knowledge and power'
                ],
                true
            );

            if (first === 0) {
                await seerLocateScorpions(player, npc);
            } else if (first === 1) {
                await npc.say('What does the old fellow want');
                await player.say(
                    "He's lost his valuable lesser kharid scorpions"
                );
                await seerLocateScorpions(player, npc);
            } else if (first === 2) {
                await npc.say(
                    'Knowledge comes from experience, power comes from ' +
                        'battleaxes'
                );
            }
            break;
        }

        case 2: {
            // Still needs first scorpion (Taverley)
            if (
                !has(player, SCORPION_CAGE_ONE) &&
                !has(player, SCORPION_CAGE_ONE_TWO) &&
                !has(player, SCORPION_CAGE_ONE_TWO_THREE) &&
                !has(player, SCORPION_CAGE_ONE_THREE)
            ) {
                if (!has(player, SCORPION_CAGE_NONE)) {
                    await player.say('I need to locate some scorpions');
                    await seerLocateScorpions(player, npc);
                } else {
                    await npc.say('Many greetings');
                    await player.say(
                        'Where did you say that scorpion was again?'
                    );
                    await npc.say('Let me look into my looking glass');
                    player.message('The seer produces a small mirror');
                    await player.world.sleepTicks(3);
                    player.message('The seer gazes into the mirror');
                    await player.world.sleepTicks(3);
                    player.message('The seer smoothes his hair with his hand');
                    await player.world.sleepTicks(3);
                    await npc.say(
                        'I can see a scorpion that you seek',
                        'It would appear to be near some  nasty looking spiders',
                        'I can see two coffins there as well',
                        'The scorpion seems to be going through some crack in ' +
                            'the wall',
                        "He's gone into some sort of secret room",
                        'Well see if you can find that scorpion then',
                        "And I'll try and get you some information on the others"
                    );
                }
            }
            // Still needs second scorpion (Barbarian)
            else if (
                !has(player, SCORPION_CAGE_TWO) &&
                !has(player, SCORPION_CAGE_ONE_TWO) &&
                !has(player, SCORPION_CAGE_TWO_THREE) &&
                !has(player, SCORPION_CAGE_ONE_TWO_THREE)
            ) {
                await player.say(
                    'Hi I have retrieved the scorpion from near the spiders'
                );
                await npc.say(
                    "Well I've checked my looking glass",
                    'There seems to be a kharid scorpion in a village full of  ' +
                        'axe wielding warriors',
                    'One of the warriors there, dressed mainly in black has ' +
                        'picked it up',
                    "That's all I can tell you about that scorpion"
                );
            }
            // Still needs third scorpion (Monastery)
            else if (
                !has(player, SCORPION_CAGE_THREE) &&
                !has(player, SCORPION_CAGE_ONE_THREE) &&
                !has(player, SCORPION_CAGE_TWO_THREE) &&
                !has(player, SCORPION_CAGE_ONE_TWO_THREE)
            ) {
                await npc.say('Many greetings');
                await player.say('I have retrieved a second scoprion');
                await npc.say(
                    "That's lucky because I've got some information on the " +
                        'last scorpion for you',
                    'It seems to be in some sort of upstairs room',
                    'There seems to be some sort of brown clothing lying on ' +
                        'the floor'
                );
            } else {
                await seerPrimaryDialogue(player, npc);
            }
            break;
        }
    }
}

// velrak the explorer

async function velrakDialogue(player, npc) {
    if (has(player, DUSTY_KEY_ID)) {
        await player.say('Are you still here?');
        await npc.say(
            "Yes, I'm still plucking up courage",
            'To run out past those black knights'
        );
        return;
    }

    await npc.say('Thankyou for rescuing me', "It isn't comfy in this cell");

    const choice = await player.ask(
        ['So do you know anywhere good to explore?', 'Do I get a reward?'],
        true
    );

    if (choice === 0) {
        await npc.say(
            'Well this dungeon was quite good to explore',
            'Till I got captured',
            'I got given a key to an inner part of this dungeon',
            'By a mysterious cloaked stranger',
            "It's rather to tough for me to get that far though",
            'I keep getting captured',
            'Would you like to give it a go'
        );

        const give = await player.ask(
            ['Yes please', "No it's to dangerous for me too"],
            true
        );

        if (give === 0) {
            player.message('Velrak reaches inside his boot and passes you a key');
            await player.world.sleepTicks(3);
            player.inventory.add(DUSTY_KEY_ID);
        }
    } else if (choice === 1) {
        await npc.say(
            'Well not really the black knights took all my stuff before ' +
                'throwing me in here'
        );
    }
}

// thormac the sorceror

async function thormacHowTo(player, npc) {
    if (!has(player, SCORPION_CAGE_NONE)) {
        await npc.say(
            'Well I have a scorpion cage here',
            'Which you can use to catch them in'
        );
        player.inventory.add(SCORPION_CAGE_NONE);
        player.message('Thormac gives you a cage');
        await player.world.sleepTicks(3);
    } else {
        await npc.say(
            'Well you have that scorpion cage I gave you',
            'Which you can use to catch them in'
        );
    }

    await npc.say(
        'If you go up to the village of seers to the north of here',
        'One of them will be able to tell you where the scorpions are now'
    );

    if (player.questStages.scorpionCatcher === 0 ||
        !player.questStages.scorpionCatcher) {
        player.questStages.scorpionCatcher = 1; // STARTED QUEST
    }

    const choice = await player.ask(
        ["What's in it for me?", 'Ok I will do it then'],
        true
    );

    if (choice === 0) {
        await thormacReward(player, npc);
    }
}

// OpenRSC thormacDialogue choice == 2 ("What's in it for me?")
async function thormacReward(player, npc) {
    await npc.say(
        'Well I suppose I can aid you with my skills as a staff sorcerer',
        'Most the battlestaffs around here are pretty puny',
        'I can beef them up for you a bit'
    );

    const choice = await player.ask(
        ['So how would I go about catching them then?', 'Ok I will do it then'],
        true
    );

    if (choice === 0) {
        await thormacHowTo(player, npc);
    }
}

async function thormacAssistance(player, npc) {
    await npc.say(
        "I've lost my pet scorpions",
        "They're lesser kharid scorpions, a very rare breed",
        'I left there cage door open',
        "now I don't know where they have gone",
        "There's 3 of them and they're quick little beasties",
        "They're all over runescape"
    );

    const choice = await player.ask(
        [
            'So how would I go about catching them then?',
            "What's in it for me?",
            "I'm not interested then"
        ],
        true
    );

    if (choice === 0) {
        await thormacHowTo(player, npc);
    } else if (choice === 1) {
        await thormacReward(player, npc);
    } else if (choice === 2) {
        await npc.say(
            'Blast, I suppose I will have to have find someone else then'
        );
    }
}

// post-quest battlestaff enchantment service
async function thormacEnchant(player, npc) {
    await npc.say('Thankyou for rescuing my scorpions');

    const four = await player.ask(
        ["That's ok", "You said you'd enchant my battlestaff for me"],
        true
    );

    if (four !== 1) {
        return;
    }

    await npc.say(
        "Yes it'll cost you 40000 coins for the materials needed mind you",
        'Which sort of staff did you want enchanting?'
    );

    // options are not spoken by the player
    const five = await player.ask(
        [
            'Battlestaff of fire',
            'battlestaff of water',
            'battlestaff of air',
            'battlestaff of earth',
            "I won't bother yet actually"
        ],
        false
    );

    const staves = [
        {
            base: BATTLESTAFF_OF_FIRE,
            enchanted: ENCHANTED_BATTLESTAFF_OF_FIRE,
            say: 'battlestaff of fire please',
            missing: "I don't have a battlestaff of fire yet though"
        },
        {
            base: BATTLESTAFF_OF_WATER,
            enchanted: ENCHANTED_BATTLESTAFF_OF_WATER,
            say: 'battlestaff of water please',
            missing: "I don't have a battlestaff of water yet though"
        },
        {
            base: BATTLESTAFF_OF_AIR,
            enchanted: ENCHANTED_BATTLESTAFF_OF_AIR,
            say: 'battlestaff of air please',
            missing: "I don't have a battlestaff of air yet though"
        },
        {
            base: BATTLESTAFF_OF_EARTH,
            enchanted: ENCHANTED_BATTLESTAFF_OF_EARTH,
            say: 'battlestaff of earth please',
            missing: "I don't have a battlestaff of earth yet though"
        }
    ];

    if (five >= 0 && five <= 3) {
        const staff = staves[five];
        await player.say(staff.say);

        if (!has(player, staff.base)) {
            await player.say(staff.missing);
            return;
        }

        if (!player.inventory.has(COINS_ID, 40000)) {
            await player.say("I'll just get the money for you");
            return;
        }

        player.inventory.remove(COINS_ID, 40000);
        player.inventory.remove(staff.base);
        player.inventory.add(staff.enchanted);
        player.message('Thormac enchants your staff');
    } else if (five === 4) {
        await player.say("I won't bother yet actually");
    }
}

async function thormacDialogue(player, npc) {
    const stage = player.questStages.scorpionCatcher || 0;

    switch (stage) {
        case 0: {
            await npc.say(
                'Hello I am Thormac the sorceror',
                "I don't suppose you could be of assistance to me?"
            );
            const first = await player.ask(
                ['What do you need assistance with?', "I'm a little busy"],
                true
            );
            if (first === 0) {
                await thormacAssistance(player, npc);
            }
            break;
        }

        case 1:
        case 2: {
            await npc.say('How goes your quest?');

            // No empty cage, no full cage
            if (
                !has(player, SCORPION_CAGE_NONE) &&
                !has(player, SCORPION_CAGE_ONE_TWO_THREE)
            ) {
                const menu = await player.ask(
                    ["I've lost my cage", "I've not caught all the scorpions yet"],
                    true
                );
                if (menu === 0) {
                    await npc.say(
                        'Ok here is another cage',
                        "You're almost as bad at loosing things as me"
                    );
                    player.inventory.add(SCORPION_CAGE_NONE);
                } else if (menu === 1) {
                    await npc.say(
                        'Well remember, go speak to the seers north of here ' +
                            'if you need any help'
                    );
                }
            } else if (has(player, SCORPION_CAGE_ONE_TWO_THREE)) {
                // full cage -> complete the quest
                await player.say('I have retrieved all your scorpions');
                await npc.say('aha my little scorpions home at last');
                player.inventory.remove(SCORPION_CAGE_ONE_TWO_THREE);
                await completeQuest(player);
            } else {
                await player.say("I've not caught all the scorpions yet");
                await npc.say(
                    'Well remember, go speak to the seers north of here if ' +
                        'you need any help'
                );
            }
            break;
        }

        case -1:
            await thormacEnchant(player, npc);
            break;
    }
}

// OpenRSC sendQuestComplete + handleReward.
async function completeQuest(player) {
    player.questStages.scorpionCatcher = -1;

    // reward: 1 quest point + strength xp (base 1500, var 500)
    player.addQuestPoints(1);
    player.addExperience(
        'strength',
        player.skills.strength.base * 500 + 1500,
        false
    );

    player.message(
        'Well done you have completed the scorpion catcher quest'
    );
    player.message('@gre@You haved gained 1 quest point!');
}

// talk handler

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === SEER_ID) {
        player.engage(npc);
        await seerDialogue(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === VELRAK_ID) {
        player.engage(npc);
        await velrakDialogue(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === THORMAC_ID) {
        player.engage(npc);
        await thormacDialogue(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// use cage on scorpion

function isScorpion(id) {
    return (
        id === KHARID_SCORPION_TAVERLEY_ID ||
        id === KHARID_SCORPION_BARBARIAN_ID ||
        id === KHARID_SCORPION_MONASTERY_ID
    );
}

// only handles when the item is a cage the player owns and it doesn't already hold that scorpion
function shouldHandleUse(player, npc, itemId) {
    if (!player.inventory.has(itemId)) {
        return false;
    }

    if (
        npc.id === KHARID_SCORPION_TAVERLEY_ID &&
        itemId !== SCORPION_CAGE_ONE &&
        itemId !== SCORPION_CAGE_ONE_TWO &&
        itemId !== SCORPION_CAGE_ONE_TWO_THREE
    ) {
        return true;
    }
    if (
        npc.id === KHARID_SCORPION_BARBARIAN_ID &&
        itemId !== SCORPION_CAGE_TWO &&
        itemId !== SCORPION_CAGE_ONE_TWO &&
        itemId !== SCORPION_CAGE_TWO_THREE &&
        itemId !== SCORPION_CAGE_ONE_TWO_THREE
    ) {
        return true;
    }
    if (
        npc.id === KHARID_SCORPION_MONASTERY_ID &&
        itemId !== SCORPION_CAGE_THREE &&
        itemId !== SCORPION_CAGE_ONE_TWO_THREE &&
        itemId !== SCORPION_CAGE_TWO_THREE
    ) {
        return true;
    }
    return false;
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!isScorpion(npc.id)) {
        return false;
    }

    if (!shouldHandleUse(player, npc, item.id)) {
        return false;
    }

    if ((player.questStages.scorpionCatcher || 0) !== 2) {
        player.message(
            'Talk to Seer before you attempt catching this scorpion'
        );
        return true;
    }

    const itemId = item.id;

    if (ALL_CAGES.indexOf(itemId) === -1) {
        player.message('Nothing interesting happens');
        return true;
    }

    let toRemove = -1;
    let toAdd = -1;

    if (npc.id === KHARID_SCORPION_TAVERLEY_ID) {
        switch (itemId) {
            case SCORPION_CAGE_NONE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE;
                break;
            case SCORPION_CAGE_TWO:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE_TWO;
                break;
            case SCORPION_CAGE_THREE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE_THREE;
                break;
            case SCORPION_CAGE_TWO_THREE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE_TWO_THREE;
                break;
            default:
                break;
        }
    } else if (npc.id === KHARID_SCORPION_BARBARIAN_ID) {
        switch (itemId) {
            case SCORPION_CAGE_NONE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_TWO;
                break;
            case SCORPION_CAGE_ONE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE_TWO;
                break;
            case SCORPION_CAGE_THREE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_TWO_THREE;
                break;
            case SCORPION_CAGE_ONE_THREE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE_TWO_THREE;
                break;
            default:
                break;
        }
    } else if (npc.id === KHARID_SCORPION_MONASTERY_ID) {
        switch (itemId) {
            case SCORPION_CAGE_NONE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_THREE;
                break;
            case SCORPION_CAGE_ONE:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE_THREE;
                break;
            case SCORPION_CAGE_TWO:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_TWO_THREE;
                break;
            case SCORPION_CAGE_ONE_TWO:
                toRemove = itemId;
                toAdd = SCORPION_CAGE_ONE_TWO_THREE;
                break;
            default:
                break;
        }
    }

    player.message('You catch a scorpion');

    if (toRemove > -1) {
        player.inventory.remove(toRemove);
    }
    if (toAdd > -1) {
        player.inventory.add(toAdd);
    }

    // remove the scorpion; it respawns on its normal timer
    player.world.removeEntity('npcs', npc);

    return true;
}

// doors

// use jail keys on velrak's cell doors, or dusty key on the blue dragon lair door
async function onUseWithWallObject(player, wallObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    // Velrak cell door + the door in front of it (both id 83, jail keys).
    if (
        wallObject.id === DOOR_ID &&
        (wallObject.y === 3428 || wallObject.y === 3425) &&
        item.id === JAIL_KEYS_ID
    ) {
        player.sendBubble(item.id);
        await player.enterDoor(wallObject);
        return true;
    }

    // Dusty key door into blue dragons lair in Taverley dungeon.
    if (
        wallObject.id === DUSTY_DOOR_ID &&
        wallObject.y === 3353 &&
        item.id === DUSTY_KEY_ID
    ) {
        player.sendBubble(item.id);
        await player.enterDoor(wallObject);
        return true;
    }

    return false;
}

// push the secret wall once the seer has located the scorpions
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id !== SECRET_WALL_ID || wallObject.y !== 3353) {
        return false;
    }

    if ((player.questStages.scorpionCatcher || 0) === 2) {
        await player.enterDoor(wallObject);
        player.message('You just went through a secret door');
    }

    return true;
}

module.exports = {
    onTalkToNPC,
    onUseWithNPC,
    onUseWithWallObject,
    onWallObjectCommandOne
};
