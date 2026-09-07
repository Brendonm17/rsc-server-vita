// tribal totem (members) quest.
//
// questStages.tribalTotem:
//   0/undefined = not started
//   1           = started, retrieve the totem
//   2           = rpdt crate delivered
//   -1          = complete
//
// player.cache flags:
//   label = address label stuck on the depot crate
//   trapy = stair trap located, safe to climb

const GameObject = require('../../../../model/game-object');
const { questsEnabled } = require('../../custom-gate.js');

// NPCs (id-map.npcs)
const KANGAI_MAU_ID = 330;
const WIZARD_CROMPERTY_ID = 331;
const RPDT_EMPLOYEE_ID = 332;
const HORACIO_ID = 333;

// item ids (rsc-data config/items.json)
const ADDRESS_LABEL_ID = 704;
const TRIBAL_TOTEM_ID = 705;
const SWORDFISH_ID = 370;

// object ids (rsc-data config/objects.json)
const EMPTY_CRATE_ID = 290; // "The crate is empty"
const LABEL_CRATE_ID = 329; // labelled crate that yields the Address Label
const DEPOT_CRATE_ID = 328; // crate to be delivered / label is stuck onto
const MANSION_STAIRS_ID = 331; // "Go up" / "Search for traps"
const HANDELMORT_CHEST_OPEN = 332; // "Search" / "Close"
const HANDELMORT_CHEST_CLOSED = 333; // "Open" / "Examine"
const COMBINATION_DOOR_ID = 98; // wall object

// depot crate respawns ~30s after delivery
const DEPOT_CRATE_RESPAWN_TICKS = 47; // 30000ms / 640ms per tick

// npc dialogue

async function talkKangaiMau(player, npc) {
    const stage = player.questStages.tribalTotem || 0;

    if (stage === -1) {
        await npc.say('greetings esteemed thief');
        return;
    }

    if (stage === 1 || stage === 2) {
        await npc.say('Have you got our totem back?');

        if (player.inventory.has(TRIBAL_TOTEM_ID)) {
            await player.say('Yes I have');
            await npc.say('Thank you brave adventurer');

            // set stage -1, grant xp and quest points
            completeQuest(player);

            await npc.say(
                'Here have some freshly cooked Karamja fish',
                'Caught specially by our people'
            );

            player.inventory.remove(TRIBAL_TOTEM_ID);
            player.inventory.add(SWORDFISH_ID, 5);
        } else {
            await player.say("No it's not that easy");
            await npc.say('Bah, you no good');
        }
        return;
    }

    // stage 0, quest not started
    await npc.say('Hello I Kangai Mau', 'Of the Rantuki tribe');

    const choice = await player.ask(
        [
            'And what are you doing in Brimhaven?',
            "I'm in search of adventure",
            'Who are the Rantuki tribe?'
        ],
        true
    );

    switch (choice) {
        case 0:
            await npc.say(
                'I looking for someone brave',
                'To go on important mission for me',
                'Someone skilled in thievery and sneaking about',
                'I am told I can find such people in Brimhaven'
            );

            {
                const c = await player.ask(
                    [
                        'Tell me of this mission',
                        'Yep I have heard there are many of that type here'
                    ],
                    true
                );

                if (c === 0) {
                    await player.say('I may be able to help');
                    await npc.say(
                        'I need someone to go on a mission',
                        'To the city of Ardougne',
                        'There you will need to find the house of Lord Handelmort',
                        'In his house he has our tribal totem',
                        'We need it back'
                    );
                    await handelmortMenu(player, npc);
                }
                // c === 1 does nothing further
            }
            break;
        case 1:
            await npc.say(
                'Adventure is something I may be able to give',
                'I need someone to go on a mission',
                'To the city of Ardougne',
                'There you will need to find the house of Lord Handelmort',
                'In his house he has our tribal totem',
                'We need it back'
            );
            await handelmortMenu(player, npc);
            break;
        case 2:
            await npc.say(
                'A proud and noble tribe of Karamja',
                'Now we are few',
                'Men come from across sea',
                'And settle on our hunting grounds'
            );
            break;
    }
}

// shared 3-option menu (why does he have it / how to find the house)
async function handelmortMenu(player, npc) {
    const choice = await player.ask(
        [
            'Ok I will get it back',
            'Why does he have it?',
            "How can I find Handelmort's house?"
        ],
        false
    );

    if (choice === 0) {
        await player.say('Ok I will get it back');
        player.questStages.tribalTotem = 1;
    } else if (choice === 1) {
        await player.say('Why does he have it?');
        await npc.say(
            'Lord Handelmort is an Ardougnese explorer',
            'Which mean he think he allowed to come and steal our stuff',
            'To put in his private museum'
        );

        const c = await player.ask(
            ['Ok I will get it back', "How can I find Handlemort's house?"],
            false
        );

        if (c === 0) {
            await player.say('Ok I will get it back');
            player.questStages.tribalTotem = 1;
        } else if (c === 1) {
            await player.say(
                "How can I find Handelmort's house",
                'Ardougne is a big place'
            );
            await npc.say("I don't know Ardougne");
        }
    } else if (choice === 2) {
        await player.say(
            "How can I find Handelmort's house",
            'Ardougne is a big place'
        );
        await npc.say("I don't know Ardougne");
    }
}

async function talkHoracio(player, npc) {
    await npc.say("It's a fine day to be out in the garden isn't it?");

    const choice = await player.ask(
        ["Yes, it's very nice", 'So who are you?'],
        false
    );

    if (choice === 0) {
        await player.say("Yes, it's very nice");
        return;
    }

    await player.say('So who are you');
    await npc.say(
        'My name is Horacio Dobson',
        'I am the gardener to Lord Handelmort',
        'All this around you is my handywork'
    );

    if ((player.questStages.tribalTotem || 0) === 0) {
        return;
    }

    const subChoice = await player.ask(
        ['So do you garden round the back too?', 'Do you need any help?'],
        true
    );

    if (subChoice === 0) {
        await npc.say('That I do');
        await player.say(
            "Doesn't all this security in this house",
            'get in your way?'
        );
        await npc.say(
            "Ah, I'm used to all that",
            'I have my keys, the dogs knows me',
            'And I know by heart the combination to the door lock',
            "It's rather easy, it's his middle name"
        );
        await player.say("Who's middle name?");
        await npc.say("Hmm I shouldn't have said that", 'Forget I said it');
    } else {
        await npc.say(
            'Trying to muscle in on my job ehh?',
            "I'm happy to do this all myself"
        );
    }
}

async function talkWizardCromperty(player, npc) {
    await npc.say(
        'Hello there',
        'My name is Cromperty',
        'I am a wizard and an inventor'
    );

    const choice = await player.ask(
        ["Two jobs, thats got to be tough", 'So what have you invented?'],
        true
    );

    if (choice === 0) {
        await npc.say(
            "Not when you combine them it isn't",
            'I invent magic things'
        );

        const c = await player.ask(
            [
                'So what have you invented?',
                'Well I shall leave you to your inventing'
            ],
            true
        );

        if (c === 1) {
            return;
        }
    }

    await invented(player, npc);
}

async function invented(player, npc) {
    await npc.say(
        'My latest inevention is my patent pending teleport block',
        'Stand on this block here',
        'I do a bit of the old hocus pocus',
        'And abracadabra you end up on the other teleport block'
    );

    const choice = await player.ask(
        [
            'So where is the other block?',
            'Can I be teleported please?',
            "Well done, that's very clever"
        ],
        true
    );

    switch (choice) {
        case 0:
            await npc.say(
                'I would guess somewhere between here and the wizards tower in Misthalin',
                "All I know is it hasn't got there yet",
                'Or the wizards there would have contacted me',
                'I am using the RPDT to deliver it'
            );

            {
                const c = await player.ask(
                    ['Can I be teleported please?', 'Who are the RPDT?'],
                    true
                );

                if (c === 0) {
                    await teleportChoice(player, npc);
                } else {
                    await npc.say('The runescape parcel delivery team');
                }
            }
            break;
        case 1:
            await teleportChoice(player, npc);
            break;
        case 2:
            break;
    }
}

async function teleportChoice(player, npc) {
    const choice = await player.ask(
        ['Yes, that sounds good teleport me', 'That sounds dangerous leave me here'],
        true
    );

    if (choice !== 0) {
        return;
    }

    const { world } = player;
    const stage = player.questStages.tribalTotem || 0;

    player.teleport(545, 577);
    await world.sleepTicks(1);

    if (stage === 2 || stage === -1) {
        player.teleport(560, 588);
    } else {
        player.teleport(558, 617);
    }
}

async function talkRpdtEmployee(player, npc) {
    await npc.say('Welcome to RPDT');

    const stage = player.questStages.tribalTotem || 0;

    if (player.cache.label && stage === 1) {
        const choice = await player.ask(
            [
                'So when are you going to deliver this crate?',
                "Thank you, it's interesting in here"
            ],
            true
        );

        if (choice === 0) {
            await npc.say('I suppose I could do it now');

            const { world } = player;

            // no npc.teleport, set position directly
            npc.x = 558;
            npc.y = 616;

            // remove the depot crate, respawn it 30s later
            const [depotCrate] = world.gameObjects
                .getAtPoint(558, 617)
                .filter((go) => go.id === DEPOT_CRATE_ID);

            if (depotCrate) {
                const { x, y, direction } = depotCrate;
                world.removeEntity('gameObjects', depotCrate);
                world.setTickTimeout(() => {
                    world.addEntity(
                        'gameObjects',
                        new GameObject(world, {
                            id: DEPOT_CRATE_ID,
                            x,
                            y,
                            direction
                        })
                    );
                }, DEPOT_CRATE_RESPAWN_TICKS);
            }

            player.message('@que@The employee picks up the crate');
            await world.sleepTicks(3);

            npc.x = 559;
            npc.y = 612;

            player.message('@que@And takes it out to be delivered');
            await world.sleepTicks(3);

            delete player.cache.label;
            player.questStages.tribalTotem = 2;
        }
    } else {
        await player.say('Thank you very much');
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    let handler;

    switch (npc.id) {
        case KANGAI_MAU_ID:
            handler = talkKangaiMau;
            break;
        case HORACIO_ID:
            handler = talkHoracio;
            break;
        case WIZARD_CROMPERTY_ID:
            handler = talkWizardCromperty;
            break;
        case RPDT_EMPLOYEE_ID:
            handler = talkRpdtEmployee;
            break;
        default:
            return false;
    }

    player.engage(npc);
    await handler(player, npc);
    player.disengage();

    return true;
}

// objects, by command slot:
//   crate  290/328/329 : ["WalkTo", "Search"]
//   stairs 331         : ["Go up", "Search for traps"]
//   chest  332 (open)  : ["Search", "Close"]
//   chest  333 (closed): ["Open", "Examine"]

async function searchLabelCrate(player) {
    const { world } = player;

    player.message('@que@There is a label on this crate');
    await world.sleepTicks(3);
    player.message('It says');
    await world.sleepTicks(3);
    player.message('@que@to Lord Handelmort');
    await world.sleepTicks(3);
    player.message('@que@Handelmort Mansion');
    await world.sleepTicks(3);
    player.message('@que@Ardougne');
    await world.sleepTicks(3);

    if (player.inventory.has(ADDRESS_LABEL_ID) || player.cache.label) {
        player.message("@que@It doesn't seem possible to open the crate");
        await world.sleepTicks(3);
    } else {
        player.message('@que@You take the label');
        await world.sleepTicks(3);
        player.inventory.add(ADDRESS_LABEL_ID, 1);
    }
}

async function searchDepotCrate(player) {
    const { world } = player;

    if (player.cache.label) {
        player.message('@que@There is a label on this crate');
        await world.sleepTicks(3);
        player.message('It says');
        await world.sleepTicks(3);
        player.message('@que@to Lord Handelmort');
        await world.sleepTicks(3);
        player.message('@que@Handelmort Mansion');
        await world.sleepTicks(3);
        player.message('@que@Ardougne');
        await world.sleepTicks(3);
        return;
    }

    player.message('@que@Its ready to be delivered');
    await world.sleepTicks(3);
    player.message("@que@To the wizard's tower in Misthalin");
    await world.sleepTicks(3);
    player.message("@que@It doesn't seem possible to open the crate");
    await world.sleepTicks(3);
}

async function searchTotemChest(player, gameObject) {
    const { world } = player;

    player.message('You search the chest');
    await world.sleepTicks(4);

    if (player.inventory.has(TRIBAL_TOTEM_ID)) {
        player.message('The chest is empty');
        await world.sleepTicks(4);
    } else {
        player.message('You find a tribal totem which you take');
        await world.sleepTicks(4);
        player.inventory.add(TRIBAL_TOTEM_ID, 1);
    }
}

async function goUpStairs(player) {
    const { world } = player;

    if (player.cache.trapy) {
        player.message('You go up the stairs');
        delete player.cache.trapy;
        player.teleport(563, 1534);
    } else {
        player.message('@que@You here a click beneath you');
        await world.sleepTicks(3);
        player.message('@que@You feel yourself falling');
        await world.sleepTicks(3);
        player.message('@que@You have fallen through a trap');
        await world.sleepTicks(3);
        player.teleport(563, 3418);
        player.damage(7);
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (gameObject.id) {
        case EMPTY_CRATE_ID:
            player.message('The crate is empty');
            return true;
        case LABEL_CRATE_ID:
            await searchLabelCrate(player);
            return true;
        case DEPOT_CRATE_ID:
            await searchDepotCrate(player);
            return true;
        case MANSION_STAIRS_ID:
            // CommandOne = "Go up"
            await goUpStairs(player);
            return true;
        case HANDELMORT_CHEST_OPEN:
            // CommandOne = "Search"
            await searchTotemChest(player, gameObject);
            return true;
        case HANDELMORT_CHEST_CLOSED: {
            // CommandOne = "Open"
            const { world } = player;
            player.message('You open the chest');
            world.replaceEntity(
                'gameObjects',
                gameObject,
                HANDELMORT_CHEST_OPEN
            );
            return true;
        }
        default:
            return false;
    }
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    switch (gameObject.id) {
        case MANSION_STAIRS_ID:
            // CommandTwo = "Search for traps"
            if (player.skills.thieving.current < 21) {
                player.message("@que@You don't find anything interesting");
                await world.sleepTicks(3);
            } else {
                player.message('@que@You find a trap in the stairs');
                await world.sleepTicks(3);
                player.message("@que@You make a note of the trap's location");
                await world.sleepTicks(3);
                player.message('@que@Ready for next time you go up the stairs');
                await world.sleepTicks(3);
                player.cache.trapy = true;
            }
            return true;
        case HANDELMORT_CHEST_OPEN:
            // CommandTwo = "Close"
            player.message('You close the chest');
            world.replaceEntity(
                'gameObjects',
                gameObject,
                HANDELMORT_CHEST_CLOSED
            );
            return true;
        default:
            return false;
    }
}

// Use the Address Label on the depot crate.
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== DEPOT_CRATE_ID || item.id !== ADDRESS_LABEL_ID) {
        return false;
    }

    if (player.questStages.tribalTotem === -1) {
        player.message("You've already done this!");
    } else {
        player.message('You stick the label on the crate');
        await player.say('Now I just need someone to deliver it for me');
        player.inventory.remove(ADDRESS_LABEL_ID);
        player.cache.label = true;
    }

    return true;
}

// combination-lock door (wall object 98)
// correct combination: dial1=B(1), dial2=R(0), dial3=A(0), dial4=D(3)

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id !== COMBINATION_DOOR_ID) {
        return false;
    }

    player.message('choose a position for dial 1');
    const dial = await player.ask(
        ['postition A', 'position B', 'Position C', 'Position D'],
        true
    );
    const firstOpt = dial === 1;

    player.message('choose a position for dial 2');
    const dial2 = await player.ask(
        ['position R', 'position S', 'position T', 'Position U'],
        true
    );
    const secondOpt = dial2 === 0;

    player.message('choose a position for dial 3');
    const dial3 = await player.ask(
        ['postition A', 'position B', 'Position C', 'Position D'],
        true
    );
    const thirdOpt = dial3 === 0;

    player.message('choose a position for dial 4');
    const dial4 = await player.ask(
        ['postition A', 'position B', 'Position C', 'Position D'],
        true
    );

    if (firstOpt && secondOpt && thirdOpt && dial4 === 3) {
        player.message('You here a satisfying click');
        player.message('You go through the door');
        await player.enterDoor(wallObject);
    } else {
        player.message('The door fails to open');
    }

    return true;
}

// reward: 1 quest point, thieving xp

function completeQuest(player) {
    player.message('Well done you have completed the tribal totem quest');

    // thieving xp: thieving.base * 300 + 800
    player.addExperience(
        'thieving',
        player.skills.thieving.base * 300 + 800,
        false
    );

    player.questStages.tribalTotem = -1;
    player.addQuestPoints(1);
    player.message('@gre@You haved gained 1 quest point!');
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onWallObjectCommandOne
};
