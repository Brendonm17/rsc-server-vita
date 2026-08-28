// quest stages: 0 not started, 1-6 in progress, -1 complete

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');

// NPCs (rsc-data config: authoritative)
const DWARF_COMMANDER = 771;
const DWARF_CANNON_ENGINEER = 770;
const DWARF_NEAR_COMMANDER = 694; // "Dwarf" beside the commander
const LOLLK = 695;

// Items
const RAILING_DWARF_CANNON = 1042;
const DWARF_REMAINS = 1046;
const TOOL_KIT = 1055;
const NULODIONS_NOTES = 1056;
const CANNON_AMMO_MOULD = 1057;
const INSTRUCTION_MANUAL = 1073;
const DWARF_CANNON_BASE = 1032;
const DWARF_CANNON_STAND = 1033;
const DWARF_CANNON_BARRELS = 1034;
const DWARF_CANNON_FURNACE = 1035;
const COINS = 10;

// Boundaries (wall objects)
const RAILINGS = [181, 182, 183, 184, 185, 186];
const RAILING_SEARCHED = 193;
const DOOR_TOWER = 194;
const DOOR_ENGINEER = 197; // only the segment at x == 278

// Scenery (game objects)
const LADDER_UP = 981;
const LADDER_DOWN = 985;
const CAVE_ENTRANCE = 982; // only the segment at y == 523
const MUD_PILE = 983;
const CRATE_EMPTY = 986;
const CRATE_LOLLK = 987;
const MULTICANNON = 994;

const RAIL_CACHE_KEYS = [
    'railone',
    'railtwo',
    'railthree',
    'railfour',
    'railfive',
    'railsix'
];

// crafting xp reward on completion: crafting.base * 200 + 1000
const COMPLETION_CRAFTING_BASE_XP = 1000;
const COMPLETION_CRAFTING_VAR_XP = 200;

function failToReplace() {
    // OpenRSC: DataConversions.random(0, 100) > 75
    return Math.floor(Math.random() * 101) > 75;
}

function failToMultiCannon() {
    // OpenRSC: DataConversions.random(0, 100) > 60
    return Math.floor(Math.random() * 101) > 60;
}

// dwarf cannon engineer

async function talkToEngineer(player, npc) {
    const stage = player.questStages.dwarfCannon;

    if (stage === 5) {
        await player.say('hello there');
        await npc.say('can i help you?');
        await player.say(
            "the Dwarf commander sent me, he's having trouble with his cannon"
        );
        await npc.say('of course, we forgot to send the ammo mould');
        await player.say('it fires a mould?');
        await npc.say(
            "don't be silly, the ammo's made by using a mould",
            'here, take these to him, the instructions explain everthing'
        );
        await player.say("that's great, thanks");
        await npc.say(
            'thank you adventurer, the dwarf black guard will remember this'
        );

        player.message('the Cannon engineer gives you some notes and a mould');
        player.inventory.add(NULODIONS_NOTES, 1);
        player.inventory.add(CANNON_AMMO_MOULD, 1);
        player.cache.spoken_nulodion = true;
        player.questStages.dwarfCannon = 6;
    } else if (stage === 6) {
        await player.say('hello again');

        if (!player.inventory.has(NULODIONS_NOTES)) {
            await player.say("i've lost the notes");
            await npc.say('here take these');
            player.message('the Cannon engineer gives you some more notes');
            player.inventory.add(NULODIONS_NOTES, 1);
        } else if (!player.inventory.has(CANNON_AMMO_MOULD)) {
            await player.say("i've lost the cannon ball mould");
            await npc.say('deary me, you are trouble', 'here take this one');
            player.message('the Cannon engineer gives you another mould');
            player.inventory.add(CANNON_AMMO_MOULD, 1);
        }

        await npc.say('so has the commander figured out how to work the cannon?');
        await player.say("not yet, but i'm sure he will");
        await npc.say("if you can get those items to him it'll help");
    } else if (stage === -1) {
        await player.say('hello');
        await npc.say("hello traveller, how's things?");
        await player.say('not bad thanks, yourself?');
        await npc.say("i'm good, just working hard as usual");

        const choice = await player.ask(
            [
                'i was hoping you might sell me a cannon?',
                'well, take care of yourself then',
                'i want to know more about the cannon?',
                "i've lost my cannon"
            ],
            true
        );

        switch (choice) {
            case 0:
                await sellCannon(player, npc);
                break;
            case 1:
                // "well, take care of yourself then" - no reply, ends
                break;
            case 2:
                await npc.say(
                    "there's only so much i can tell you adventurer",
                    "we've been working on this little beauty for some time now"
                );
                await player.say('is it effective?');
                await npc.say(
                    "in short bursts it's very effective, the most destructive weapon to date",
                    'the cannon automatically targets monsters close by',
                    'you just have to make the ammo and let rip'
                );
                break;
            case 3:
                await lostCannon(player, npc);
                break;
        }
    } else {
        // not on the relevant quest stage - restricted military area
        await npc.say(
            'what are you doing here?',
            'this is a restricted military area',
            'now be off with you'
        );
    }
}

async function sellCannon(player, npc) {
    await npc.say(
        'hmmm',
        "i shouldn't really, but as you helped us so much",
        'well, i could sort something out',
        "i'll warn you though, they don't come cheap"
    );
    await player.say('how much?');
    await npc.say(
        'for the full set up.. 750 000 coins',
        'or i can sell you the seperate parts for 200 000 each'
    );
    await player.say("that's not cheap");

    const choice = await player.ask(
        [
            "ok, i'll take a cannon please",
            'can i look at the seperate parts please',
            "sorry, that's too much for me",
            'have you any ammo or instructions to sell?'
        ],
        true
    );

    switch (choice) {
        case 0: {
            await npc.say('ok then, but keep it quiet..', "this thing's top secret");

            if (
                player.cache.has_cannon ||
                player.inventory.has(DWARF_CANNON_BASE) ||
                player.inventory.has(DWARF_CANNON_STAND) ||
                player.inventory.has(DWARF_CANNON_BARRELS) ||
                player.inventory.has(DWARF_CANNON_FURNACE)
            ) {
                await npc.say(
                    'wait a moment, our records show you already own some cannon equipment',
                    'i\'m afraid you can only have one set at a time'
                );
                return;
            }

            if (player.inventory.has(COINS, 750000)) {
                player.message('you give the Cannon engineer 750 000 coins');
                player.inventory.remove(COINS, 750000);
                player.message('he gives you the four parts that make the cannon');
                player.inventory.add(DWARF_CANNON_BASE, 1);
                player.inventory.add(DWARF_CANNON_STAND, 1);
                player.inventory.add(DWARF_CANNON_BARRELS, 1);
                player.inventory.add(DWARF_CANNON_FURNACE, 1);
                player.inventory.add(CANNON_AMMO_MOULD, 1);
                player.inventory.add(INSTRUCTION_MANUAL, 1);
                await npc.say('there you go, you be carefull with that thing');
                await player.say('will do, take care mate');
                await npc.say('take care adventurer');
            } else {
                await player.say("oops, i don't have enough money");
                await npc.say("sorry, i can't go any lower than that");
            }
            break;
        }
        case 1:
            // "can i look at the seperate parts please" -> opens the cannon shop
            openCannonShop(player);
            break;
        case 2:
            await npc.say("fair enough, it's too much for most of us");
            break;
        case 3:
            // opens the cannon shop
            openCannonShop(player);
            break;
    }
}

async function lostCannon(player, npc) {
    await npc.say(
        "that's unfortunate...but don't worry, i can sort you out",
        "oh dear, i'm only allowed to replace cannons...",
        '...that were stolen in action',
        "i'm sorry but you'll have to buy a new set"
    );
}

function openCannonShop(player) {
    // cannon shop key is nulodions-cannon-parts
    if (typeof player.openShop === 'function') {
        try {
            player.openShop('nulodions-cannon-parts');
            return;
        } catch (e) {
            // no such shop registered
        }
    }
    player.message('@que@The engineer has nothing to show you right now');
}

// dwarf commander

function hasAllRailings(player) {
    return RAIL_CACHE_KEYS.every((k) => player.cache[k]);
}

function clearRailings(player) {
    for (const k of RAIL_CACHE_KEYS) {
        delete player.cache[k];
    }
}

async function talkToCommander(player, npc) {
    const stage = player.questStages.dwarfCannon;

    if (!stage) {
        await player.say('hello');
        await npc.say(
            "hello traveller, i'm pleased to see you",
            'we were hoping to find an extra pair of hands',
            "that's if you don't mind helping?"
        );
        await player.say("why, what's wrong?");
        await npc.say(
            'as part of the dwarven black guard..',
            '...it is our duty to protect these mines',
            "but we just don't have the man power",
            'could you help?'
        );

        const choice = await player.ask(
            ["i'm sorry, i'm too busy mining", "yeah, i'd love to help"],
            true
        );

        if (choice === 0) {
            await npc.say("ok then, we'll have find someone else");
        } else if (choice === 1) {
            await npc.say(
                'thankyou, we have no time to waste',
                'the goblins have been attacking from the forests to the south',
                'they manage to get through the broken railings',
                'could you please replace them with these new ones'
            );
            await player.say('sounds easy enough');
            player.message('the Dwarf commander gives you six railings');
            player.inventory.add(RAILING_DWARF_CANNON, 6);
            player.questStages.dwarfCannon = 1;
            await npc.say("let me know once you've fixed the railings");
            await player.say('ok , commander');
        }
        return;
    }

    switch (stage) {
        case 1: {
            await player.say('hello');
            await npc.say(
                'hello again traveller',
                'how are you doing with those railings?'
            );
            await player.say("i'm getting there");

            if (hasAllRailings(player)) {
                await npc.say(
                    'the goblins seemed to have stopped getting in',
                    "i think you've done the job"
                );
                await player.say('good stuff');
                await npc.say(
                    'could you do me one more favour?',
                    'i need you to go check up on a guard',
                    'he should be in the black guard watch tower just to the south of here',
                    'he should have reported in by now'
                );
                await player.say("ok, i'll see what i can find out");
                await npc.say('thanks traveller');
                player.questStages.dwarfCannon = 2;
                clearRailings(player);
            } else {
                await npc.say(
                    'the goblins are still getting in',
                    'so there must still be some broken railings'
                );
                await player.say("don't worry, i'll find them soon enough");

                if (!player.inventory.has(RAILING_DWARF_CANNON)) {
                    await player.say("but i'm out of railings");
                    await npc.say("ok, we've got plenty");
                    player.message('the Dwarf commander gives you another railing');
                    player.inventory.add(RAILING_DWARF_CANNON, 1);
                }
            }
            break;
        }

        case 2: {
            await player.say('hello');

            if (player.cache.grabed_dwarf_remains) {
                await npc.say('have you been to the watch tower yet?');
                await player.say('yes, i went up but there was no one');
                await npc.say("that's strange, gilob never leaves his post");

                if (player.inventory.has(DWARF_REMAINS)) {
                    await player.say('i may have some bad news for you commander');
                    player.message('you show the Dwarf commander the remains');
                    await npc.say("what's this?, oh no , it can't be!");
                    await player.say("i'm sorry, it looks like the goblins got him");
                    await npc.say(
                        'noooo... those..those animals',
                        "but where's gilobs son?, he was also there"
                    );
                    await player.say('the goblins must have taken him');
                    await npc.say(
                        'please traveller, seek out the goblins base..',
                        '...and return the lad to us',
                        'they must sleep somewhere!'
                    );
                    await player.say("ok, i'll see if i can find their hide out");
                    player.inventory.remove(DWARF_REMAINS, 1);
                    player.questStages.dwarfCannon = 3;
                    delete player.cache.grabed_dwarf_remains;
                } else {
                    await npc.say(
                        'his son was also with him, its too strange',
                        'can you return and look for clues?'
                    );
                    await player.say('ok then');
                }
            } else {
                await npc.say('hello, any news from the watch man?');
                await player.say('not yet');
                await npc.say('well, as quick as you can then');
            }
            break;
        }

        case 3: {
            if (player.cache.savedlollk) {
                await player.say('hello, has lollk returned yet?');
                await npc.say(
                    'he has, and i thank you from the bottom of my heart..',
                    "...with out you he'd be goblin barbecue"
                );
                await player.say('always a pleasure to help');
                await npc.say(
                    'in that case i have one more favour to ask you',
                    'as you\'ve seen, our defences are too weak against those goblins',
                    'the black guard have sent us a cannon to help the situation'
                );
                await player.say('sounds good');
                await npc.say(
                    "unfortunatly we're having trouble fixing the thing",
                    'the cannon is stored in our shed',
                    'if you could fix it, it would be a great help'
                );

                const choice = await player.ask(
                    ["ok, i'll see what i can do", "sorry, i've done enough for today"],
                    true
                );

                if (choice === 0) {
                    await npc.say("that's great,you'll need this");
                    player.message('the Dwarf commander gives you a tool kit');
                    player.inventory.add(TOOL_KIT, 1);
                    player.questStages.dwarfCannon = 4;
                    delete player.cache.savedlollk;
                } else if (choice === 1) {
                    await npc.say(' fair enough, take care traveller');
                }
            } else {
                await player.say('hello again');
                await npc.say('traveller have you managed to find the goblins base?');
                await player.say("not yet i'm afraid, but i'll keep looking");
            }
            break;
        }

        case 4: {
            if (player.cache.cannon_complete) {
                await player.say('hello again');
                await npc.say("hello there traveller, how's things?");
                await player.say("well, i think i've done it, take a look");
                await npc.say('really!');
                player.message(
                    'the Dwarf commander pops into the shed to take a closer look'
                );
                await npc.say("well i don't believe it, it seems to be in working order");
                await player.say('not bad for an adventurer');
                await npc.say(
                    'not bad at all, your effort is appreciated my friend',
                    'now, if i could only figure what the thing uses as ammo',
                    'the black guard forgot to send instructions',
                    'i know i said that was the last favour..but..'
                );
                await player.say('what now?');
                await npc.say(
                    "i can't leave this post, could you go to the black guard..",
                    '..base and find out what this thing actually shoots?'
                );

                const choice = await player.ask(
                    ["sorry, i've really done enough", 'ok then, just for you'],
                    true
                );

                if (choice === 0) {
                    await npc.say('fair enough');
                } else if (choice === 1) {
                    await npc.say(
                        "you're a good adventurer, we were lucky to find you",
                        'the base is located just south of the ice mountain',
                        "you'll need to speak to the dwarf Cannon engineer",
                        "he's the weapons development chief for the black guard",
                        "so if anyone knows how to fire that thing, it'll be him"
                    );
                    await player.say("ok, i'll see what i can do");
                    player.questStages.dwarfCannon = 5;
                    delete player.cache.cannon_complete;
                }
            } else {
                await npc.say(
                    'how are doing in there bold adventurer?',
                    "we've been trying our best with that thing",
                    "but i just haven't got the patience"
                );
                await player.say("it's not an easy job, but i'm getting there");
                await npc.say(
                    'good stuff, let me know if you have any luck',
                    'if we manage to get that thing working...',
                    'those goblins will be know trouble at all'
                );

                if (!player.inventory.has(TOOL_KIT)) {
                    await player.say("i'm afraid i lost the tool kit");
                    await npc.say('that was silly, never mind, here you go');
                    player.message('the Dwarf commander gives you another tool kit');
                    player.inventory.add(TOOL_KIT, 1);
                }
            }
            break;
        }

        case 5:
        case 6: {
            if (
                player.cache.spoken_nulodion &&
                player.inventory.has(NULODIONS_NOTES) &&
                player.inventory.has(CANNON_AMMO_MOULD)
            ) {
                await player.say('hi');
                await npc.say('hello traveller, any word from the Cannon engineer?');
                await player.say(
                    'yes, i have spoken to him',
                    'he gave me these to give to you'
                );
                player.message('you hand the Dwarf commander the mould and the notes');
                player.inventory.remove(NULODIONS_NOTES, 1);
                player.inventory.remove(CANNON_AMMO_MOULD, 1);
                await npc.say(
                    'aah, of course, we make the ammo',
                    'this is great, now we will be able to defend ourselves',
                    "i don't know how to thank you"
                );
                await player.say('you could give me a cannon');
                await npc.say(
                    "hah, you'd be lucky, those things are worth a fortune",
                    'hmmm, now i think about it the Cannon engineer may be able to help',
                    'he controls production of the cannons',
                    "he won't be able to give you one",
                    "but for the right price, i'm sure he'll sell one to you"
                );
                await player.say('hmmm, sounds interesting');
                await npc.say('take care of yourself traveller, and thanks again');
                await player.say('you take care too');
                delete player.cache.spoken_nulodion;
                await completeQuest(player);
            } else if (player.cache.spoken_nulodion) {
                await player.say('hi');
                await npc.say('hello traveller, any word from the Cannon engineer?');
                await player.say(
                    'yes, i have spoken to him',
                    'he gave me some items to give you...',
                    'but i seem to have lost something'
                );
                await npc.say("if you could go back and get another, i'd appreciate it");
                await player.say('ok then');
            } else {
                await player.say('hi again');
                await npc.say(
                    'hello traveller',
                    'any word from the Cannon engineer?'
                );
                await player.say('not yet');
                await npc.say(
                    'the black guard camp is just south of the ice mountain',
                    'the quicker we can get some ammo for this thing..',
                    '.. the quicker those goblins will leave us be'
                );
                await player.say("i'll get to it");
            }
            break;
        }

        case -1: {
            await player.say('hello');
            await npc.say('well, hello there, how you doing?');
            await player.say('not bad, yourself?');
            await npc.say(
                "i'm great, the goblins can't get close with this cannon blasting at them"
            );
            break;
        }
    }
}

async function completeQuest(player) {
    player.questStages.dwarfCannon = -1;
    player.addQuestPoints(1);
    player.addExperience(
        'crafting',
        player.skills.crafting.base * COMPLETION_CRAFTING_VAR_XP +
            COMPLETION_CRAFTING_BASE_XP,
        false
    );
    player.message('well done');
    player.message('you have completed the dwarf cannon quest');
}

// dwarf beside the commander

async function talkToDwarfNearCommander(player, npc) {
    await player.say('hello');

    if (Math.random() < 0.5) {
        await npc.say('blooming goblins, such dirty beasts');
        await player.say('really!');
        await npc.say("i've spent the whole morning cleaning up their do'ings");
        await player.say('yuck');
    } else {
        await npc.say(
            "next goblin i catch sneeking around's..",
            '..gonna be hung on my wall, little green..'
        );
        await player.say('yep..they can be troublesome');
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === DWARF_COMMANDER) {
        player.engage(npc);
        await talkToCommander(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === DWARF_CANNON_ENGINEER) {
        player.engage(npc);
        await talkToEngineer(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === DWARF_NEAR_COMMANDER) {
        player.engage(npc);
        await talkToDwarfNearCommander(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// railings

async function onWallObjectCommandTwo(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = wallObject.id;

    if (id === RAILING_SEARCHED) {
        player.message('you search the railing');
        player.message('but find nothing of interest');
        return true;
    }

    const railIndex = RAILINGS.indexOf(id);

    if (railIndex === -1) {
        return false;
    }

    const cacheKey = RAIL_CACHE_KEYS[railIndex];

    if (player.questStages.dwarfCannon !== 1 || player.cache[cacheKey]) {
        player.message('you search the railing');
        player.message('but find nothing of interest');
        return true;
    }

    player.message('you search the railing');
    player.message('one railing is broken and needs to be replaced');

    const choice = await player.ask(
        ['try to replace railing', 'leave it be'],
        true
    );

    if (choice !== 0) {
        return true;
    }

    if (!player.inventory.has(RAILING_DWARF_CANNON)) {
        player.message('you attempt to replace the missing railing');
        player.message('but you have no railing to replace it with');
        return true;
    }

    if (failToReplace()) {
        player.message('you attempt to replace the missing railing');
        player.message('but you fail and cut yourself trying');
        // OpenRSC: player.damage(random(2, 3))
        player.damage(2 + Math.floor(Math.random() * 2));
    } else {
        player.message('you attempt to replace the missing railing');
        player.message('you replace the railing with no problems');
        player.inventory.remove(RAILING_DWARF_CANNON, 1);
        player.cache[cacheKey] = true;
    }

    return true;
}

// doors

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = wallObject.id;
    const stage = player.questStages.dwarfCannon;

    if (id === DOOR_TOWER) {
        if (stage === 4) {
            await player.enterDoor(wallObject);
        } else {
            player.message('the door is locked');
        }
        return true;
    }

    if (id === DOOR_ENGINEER && wallObject.x === 278) {
        if (stage === 5 || stage === 6 || stage === -1) {
            await player.enterDoor(wallObject);
        } else {
            player.message('the door is locked');
        }
        return true;
    }

    return false;
}

// scenery interactions

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;

    if (id === LADDER_UP) {
        player.message('you climb up the ladder');
        if (!player.questStages.dwarfCannon) {
            player.message('but the trap door will not open');
            return true;
        }
        player.teleport(616, 1435, false);
        return true;
    }

    if (id === LADDER_DOWN) {
        player.message('you climb down the ladder');
        player.teleport(616, 493, false);
        return true;
    }

    if (id === CAVE_ENTRANCE && gameObject.y === 523) {
        player.message('you cautiously enter the cave');
        player.teleport(578, 3356, false);
        return true;
    }

    if (id === MUD_PILE) {
        player.message('you climb the mudpile');
        player.teleport(578, 521, false);
        return true;
    }

    if (id === CRATE_EMPTY) {
        player.message('you search the crate');
        player.message("but it's empty");
        return true;
    }

    if (id === CRATE_LOLLK) {
        await searchLollkCrate(player, gameObject);
        return true;
    }

    if (id === MULTICANNON) {
        await inspectCannon(player);
        return true;
    }

    return false;
}

async function searchLollkCrate(player, gameObject) {
    const { world } = player;

    if (player.questStages.dwarfCannon === 3 && !player.cache.savedlollk) {
        player.message('you search the crate');
        player.message('inside you see a dwarf child tied up');
        player.message('you untie the child');

        let [lollk] = world.npcs
            .getInArea(gameObject.x, gameObject.y, 8)
            .filter((npc) => npc.id === LOLLK);

        if (!lollk) {
            lollk = new NPC(world, {
                id: LOLLK,
                x: 619,
                y: 3314,
                minX: 619,
                maxX: 619,
                minY: 3314,
                maxY: 3314
            });

            delete lollk.respawn;
            world.addEntity('npcs', lollk);
        }

        player.engage(lollk);
        await lollk.say(
            'thank the heavens, you saved me',
            "i thought i'd be goblin lunch for sure"
        );
        await player.say('are you ok?');
        await lollk.say("i think so, i'd better run of home");
        await player.say("that's right , you get going, i'll catch up");
        await lollk.say('thanks again brave adventurer');
        player.disengage();

        player.message('the dwarf child runs off into the caverns');
        player.cache.savedlollk = true;

        lollk.retreat();
        world.removeEntity('npcs', lollk);
    } else {
        player.message('you search the crate');
        player.message("but it's empty");
    }
}

async function inspectCannon(player) {
    const { world } = player;

    if (player.cache.cannon_complete) {
        player.message("It's a strange dwarf contraption");
        return;
    }

    player.message('you inspect the multi cannon');

    if (
        player.cache.pipe &&
        player.cache.barrel &&
        player.cache.axle &&
        player.cache.shaft
    ) {
        player.message('the cannon seems to be in complete working order');
        player.message('lawgof will be pleased');
        player.cache.cannon_complete = true;
        delete player.cache.pipe;
        delete player.cache.barrel;
        delete player.cache.axle;
        delete player.cache.shaft;
        return;
    }

    if (failToMultiCannon()) {
        player.message("you try, but can't quite find the problem");
        player.message('maybe you should inspect it again');
        return;
    }

    player.message('you see that there are some damaged components');
    player.message('a pipe, a gun barrel, an axle and a shaft seem to be damaged');
    player.message('which part of the cannon will you attempt to fix?');

    const choice = await player.ask(
        ['Pipe', 'Barrel', 'Axle', 'Shaft', 'none'],
        true
    );

    const parts = ['pipe', 'barrel', 'axle', 'shaft'];
    const labels = ['pipe', 'gun barrel', 'axle', 'shaft'];

    if (choice < 0 || choice > 3) {
        return;
    }

    const partKey = parts[choice];

    if (player.cache[partKey]) {
        player.message("you've already fixed this part of the cannon");
        return;
    }

    player.message(`you use your tool kit and attempt to fix the ${labels[choice]}`);
    player.sendBubble(TOOL_KIT);
    await world.sleepTicks(2);

    if (failToMultiCannon()) {
        player.message("it's too hard, you fail to fix it");
        player.message('maybe you should try again');
    } else {
        player.message('after some tinkering you manage to fix it');
        player.cache[partKey] = true;
        // OpenRSC: incExp(CRAFTING, 5, true)
        player.addExperience('crafting', 5, false);
    }
}

// picking up the dwarf remains

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (groundItem.id !== DWARF_REMAINS) {
        return false;
    }

    const { world } = player;

    if (player.inventory.has(DWARF_REMAINS)) {
        player.message("carrying one 'dwarfs remains' is bad enough");
        return true;
    }

    if (player.questStages.dwarfCannon === 2 && !player.cache.grabed_dwarf_remains) {
        player.cache.grabed_dwarf_remains = true;
    }

    world.removeEntity('groundItems', groundItem);
    player.inventory.add(DWARF_REMAINS, 1);

    return true;
}

module.exports = {
    onTalkToNPC,
    onWallObjectCommandOne,
    onWallObjectCommandTwo,
    onGameObjectCommandOne,
    onGroundItemTake
};
