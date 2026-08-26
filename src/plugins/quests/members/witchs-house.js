
const { questsEnabled } = require('../custom-gate.js');
const NPC = require('../../../model/npc');

// NPCs (rsc-data/config/npcs, ids identical to OpenRSC NpcId)
const BOY_ID = 240;
const RAT_ID = 241; // RAT_WITCHES_HOUSE
const NORA_ID = 242; // NORA_T_HAG
const SHAPESHIFTER_HUMAN_ID = 244;
const SHAPESHIFTER_SPIDER_ID = 245;
const SHAPESHIFTER_BEAR_ID = 246;
const SHAPESHIFTER_WOLF_ID = 247;

// items (ids identical to OpenRSC ItemId)
const LEATHER_GLOVES_ID = 16;
const CHEESE_ID = 319;
const FRONT_DOOR_KEY_ID = 538;
const BALL_ID = 539;
const MAGNET_ID = 540;
const ICE_GLOVES_ID = 556;

// game objects (rsc-data/config/objects)
const DOOR_MAT_ID = 255; // ["search","Examine"]
const GATE_ID = 256; // the electrified gate ["open","Examine"]
const CUPBOARD_CLOSED_ID = 258; // ["open","Examine"]
const CUPBOARD_OPEN_ID = 259; // ["Search","close"]

// wall-object doors
const FRONT_DOOR_ID = 69;
const DOOR_70_ID = 70;
const DOOR_71_ID = 71;
const DOOR_72_ID = 72;
const SHED_DOOR_ID = 73;

// the electrified gate coordinate (OpenRSC: obj.getX() == 363)
const GATE_X = 363;
// the cupboard containing the magnet (OpenRSC: obj.getY() == 3328)
const CUPBOARD_Y = 3328;

const METAL_ARMOUR_IDS = new Set([
    // plate mail bodies (bronze/iron/steel/mithril/adamantite/black/rune)
    117, 8, 118, 119, 120, 196, 401,
    // plate mail tops
    308, 312, 309, 310, 311, 313, 407,
    // chain mail bodies (+ dragon scale mail)
    113, 7, 114, 115, 116, 431, 400, 1368,
    // chain mail legs
    1418, 1419, 1420, 1421, 1422, 1424, 1423,
    // plate mail legs
    206, 9, 121, 122, 123, 248, 402,
    // plated skirts (+ rune skirt)
    214, 215, 225, 226, 227, 434, 406,
    // medium helmets (+ dragon medium helmet)
    104, 5, 105, 106, 107, 470, 399, 795,
    // large helmets
    108, 6, 109, 110, 111, 230, 112,
    // square shields (+ dragon square shield)
    124, 3, 125, 126, 127, 432, 403, 1278,
    // kite shields
    128, 2, 129, 130, 131, 433, 404
]);

function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

// addnpc(world, id, x, y[, seconds]) - spawn and optionally auto-remove.
function addNpc(world, id, x, y, seconds) {
    const npc = new NPC(world, {
        id,
        x,
        y,
        minX: x - 2,
        maxX: x + 2,
        minY: y - 2,
        maxY: y + 2
    });
    delete npc.respawn;
    world.addEntity('npcs', npc);

    if (seconds && seconds > 0) {
        world.setTimeout(() => {
            try {
                if (npc.world) {
                    world.removeEntity('npcs', npc);
                }
            } catch (e) {
                // already removed
            }
        }, seconds * 1000);
    }

    return npc;
}

function wearingInsulatingGloves(player) {
    return (
        player.inventory.isEquipped(LEATHER_GLOVES_ID) ||
        player.inventory.isEquipped(ICE_GLOVES_ID)
    );
}

function wearingMetalArmour(player) {
    if (wearingInsulatingGloves(player)) {
        return false;
    }

    for (const id of METAL_ARMOUR_IDS) {
        if (player.inventory.isEquipped(id)) {
            return true;
        }
    }

    return false;
}

// the boy (quest giver)

async function talkBoy(player, npc) {
    const { world } = player;
    const stage = player.questStages.witchsHouse || 0;

    switch (stage) {
        case 0: {
            await player.say('Hello young man');
            player.message('The boy sobs');
            await world.sleepTicks(3);

            const first = await player.ask(
                [
                    "What's the matter?",
                    "Well if you're not going to answer, I'll go"
                ],
                true
            );

            if (first === 0) {
                await npc.say(
                    "I've kicked my ball over that wall, into that garden",
                    'The old lady who lives there is scary',
                    "She's locked the ball in her wooden shed",
                    'Can you get my ball back for me please'
                );

                // do not send over (no repeat)
                const second = await player.ask([
                    "Ok, I'll see what I can do",
                    'Get it back yourself'
                ]);

                if (second === 0) {
                    await player.say("Ok I'll see what I can do");
                    await npc.say('Thankyou');
                    player.questStages.witchsHouse = 1;
                } else if (second === 1) {
                    await player.say('Get it back yourself');
                }
            } else if (first === 1) {
                player.message('The boy sniffs slightly');
                await world.sleepTicks(3);
            }
            break;
        }
        case 1:
        case 2:
        case 3:
            if (player.inventory.has(BALL_ID)) {
                await player.say(
                    'Hi I have got your ball back',
                    'It was harder than I thought it would be'
                );
                await npc.say('Thankyou very much');
                player.inventory.remove(BALL_ID);

                if (player.questStages.witchsHouse === 3) {
                    completeQuest(player);
                }
            } else {
                await npc.say('Have you got my ball back yet?');
                await player.say('Not yet');
                await npc.say("Well it's in the shed in that garden");
            }
            break;
        case -1:
            await npc.say('Thankyou for getting my ball back');
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== BOY_ID) {
        return false;
    }

    player.engage(npc);
    await talkBoy(player, npc);
    player.disengage();

    return true;
}

// game objects: door mat, electrified gate, cupboard

// command one = "search"/"open"; command two = "close" on the open cupboard.
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (gameObject.id === DOOR_MAT_ID) {
        if (!player.inventory.has(FRONT_DOOR_KEY_ID)) {
            player.message('You find a key under the mat');
            player.inventory.add(FRONT_DOOR_KEY_ID);
        } else {
            player.message('You find nothing interesting');
        }
        return true;
    }

    if (gameObject.id === GATE_ID && gameObject.x === GATE_X) {
        let shouldShock = false;

        if (wearingMetalArmour(player)) {
            player.message(
                'As your metal armour touches the gate you feel a shock'
            );
            shouldShock = true;
        } else if (!wearingInsulatingGloves(player)) {
            player.message('As your bare hands touch the gate you feel a shock');
            shouldShock = true;
        }

        if (shouldShock) {
            let damage;
            if (player.skills.hits.current < 20) {
                damage = Math.floor(Math.random() * 9) + 1;
            } else {
                damage = Math.floor(Math.random() * 14) + 1;
            }
            player.damage(damage);
        } else {
            await player.enterGate(gameObject);
        }
        return true;
    }

    // cupboard closed (258) "open", cupboard open (259) "Search"
    if (
        (gameObject.id === CUPBOARD_CLOSED_ID ||
            gameObject.id === CUPBOARD_OPEN_ID) &&
        gameObject.y === CUPBOARD_Y
    ) {
        if (gameObject.id === CUPBOARD_CLOSED_ID) {
            // "open" -> reveal the open cupboard
            world.replaceEntity('gameObjects', gameObject, CUPBOARD_OPEN_ID);
        } else {
            // open cupboard "Search"
            if (!player.inventory.has(MAGNET_ID)) {
                player.message('You find a magnet in the cupboard');
                player.inventory.add(MAGNET_ID);
                if ((player.questStages.witchsHouse || 0) > 0) {
                    player.cache.found_magnet = true;
                }
            } else {
                player.message('You search the cupboard, but find nothing');
            }
        }
        return true;
    }

    return false;
}

// command two = "close" on the open cupboard (259).
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === CUPBOARD_OPEN_ID && gameObject.y === CUPBOARD_Y) {
        player.world.replaceEntity(
            'gameObjects',
            gameObject,
            CUPBOARD_CLOSED_ID
        );
        return true;
    }

    return false;
}

// wall-object doors

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages.witchsHouse || 0;

    if (wallObject.id === FRONT_DOOR_ID) {
        player.message('The door is locked');
        return true;
    }

    if (wallObject.id === DOOR_70_ID && wallObject.x === 358) {
        await player.enterDoor(wallObject);
        return true;
    }

    if (wallObject.id === DOOR_71_ID && wallObject.y === 495) {
        if (player.cache.witch_spawned && stage === 2) {
            // inside the house already
            if (player.x > 355) {
                await player.enterDoor(wallObject);
            } else {
                const witch = ifNearVisNpc(player, NORA_ID, 5);
                if (witch) {
                    await catchPlayer(player, witch);
                } else {
                    await player.enterDoor(wallObject);
                    delete player.cache.witch_spawned;
                }
            }
            return true;
        }

        if (stage > 1 || stage === -1 || player.x === 355) {
            await player.enterDoor(wallObject);
        } else {
            player.message("The door won't open");
        }
        return true;
    }

    if (wallObject.id === SHED_DOOR_ID && wallObject.x === 351) {
        if (stage === 3 || stage === -1) {
            await player.enterDoor(wallObject);
            return true;
        } else if (stage < 2) {
            player.message('The shed door is locked');
            await world.sleepTicks(3);
            return true;
        }

        const witch = ifNearVisNpc(player, NORA_ID, 10);
        // first time, or the witch has wandered off
        if (!player.cache.witch_spawned || !witch) {
            player.message(
                'As you reach out to open the door you hear footsteps ' +
                    'inside the house'
            );
            await world.sleepTicks(3);
            player.message('The footsteps approach the back door');
            await world.sleepTicks(3);
            addNpc(world, NORA_ID, 356, 495, 60);
            if (!player.cache.witch_spawned) {
                player.cache.witch_spawned = true;
            }
        } else {
            player.message('The shed door is locked');
            await world.sleepTicks(3);
            await catchPlayer(player, witch);
        }
        return true;
    }

    if (wallObject.id === DOOR_72_ID && wallObject.x === 356) {
        const fromGarden = player.x <= 355;
        await player.enterDoor(wallObject);

        const witch = ifNearVisNpc(player, NORA_ID, 5);
        if (fromGarden && player.cache.witch_spawned && witch) {
            await world.sleepTicks(3);
            player.message(
                'Through a crack in the door, you see a witch enter the garden'
            );
            witch.x = 353;
            witch.y = 492;
            await world.sleepTicks(4);
            witch.x = 351;
            witch.y = 491;
            player.message('The witch disappears into the shed');
            await witch.say(
                'How are you tonight my pretty?',
                'Would you like some food?',
                'Just wait there while I get some'
            );
            witch.x = 353;
            witch.y = 492;
            player.message('The witch passes  back through the garden again');
            await world.sleepTicks(3);
            player.message('Leaving the shed door unlocked');
            await world.sleepTicks(3);

            world.removeEntity('npcs', witch);
            delete player.cache.witch_spawned;

            player.questStages.witchsHouse = 3;
        }
        return true;
    }

    return false;
}

// nora catches the player in the garden and ejects them
async function catchPlayer(player, witch) {
    const { world } = player;

    witch.x = 355;
    witch.y = 494;
    await witch.say('Oi what are you doing in my garden?');
    await witch.say('Get out you pesky intruder');
    player.message('Nora begins to cast a spell');
    await world.sleepTicks(3);

    player.teleport(347, 616, true);
    world.removeEntity('npcs', witch);

    delete player.cache.witch_spawned;
    player.questStages.witchsHouse = 1;
    delete player.cache.found_magnet;
}

// dropping cheese to summon rat; room 356<=x<=357, 494<=y<=496

async function onDropItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        item.id !== CHEESE_ID ||
        !(
            player.x >= 356 &&
            player.x <= 357 &&
            player.y >= 494 &&
            player.y <= 496
        )
    ) {
        return false;
    }

    const { world } = player;

    if (player.questStages.witchsHouse === -1) {
        await player.say('I would rather eat it to be honest');
        return true;
    }

    player.inventory.remove(CHEESE_ID);
    player.message('A rat appears from a hole and eats the cheese');
    await world.sleepTicks(3);

    // if there's already a rat, despawn it in ~18s (OpenRSC 30 game ticks)
    const oldRat = ifNearVisNpc(player, RAT_ID, 5);
    if (oldRat) {
        world.setTimeout(() => {
            try {
                if (oldRat.world) {
                    world.removeEntity('npcs', oldRat);
                }
            } catch (e) {
                // already gone
            }
        }, 30 * 600);
    }

    addNpc(world, RAT_ID, 356, 494);

    return true;
}

// using the magnet on the rat

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id !== MAGNET_ID || npc.id !== RAT_ID) {
        return false;
    }

    const { world } = player;

    if (player.questStages.witchsHouse === -1) {
        return true;
    }

    if (!player.cache.found_magnet) {
        player.message('You need to get the magnet yourself to do this quest');
    } else {
        player.message('You put the magnet on the rat');
        world.removeEntity('npcs', npc);
        player.message('The rat runs back into his hole');
        await world.sleepTicks(3);
        player.message('You hear a click and whirr');
        await world.sleepTicks(3);
        player.inventory.remove(MAGNET_ID);
        player.questStages.witchsHouse = 2;
    }

    return true;
}

// shapeshifter combat: human -> spider -> bear -> wolf, then dies

function shapeshifterName(id) {
    if (id === SHAPESHIFTER_SPIDER_ID) {
        return 'spider';
    } else if (id === SHAPESHIFTER_BEAR_ID) {
        return 'bear';
    } else if (id === SHAPESHIFTER_WOLF_ID) {
        return 'wolf';
    }
    return '';
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const shapeIds = [
        SHAPESHIFTER_HUMAN_ID,
        SHAPESHIFTER_SPIDER_ID,
        SHAPESHIFTER_BEAR_ID,
        SHAPESHIFTER_WOLF_ID
    ];

    if (!shapeIds.includes(npc.id)) {
        return false;
    }

    const { world } = player;

    // final form (wolf) - it dies for good
    if (npc.id >= SHAPESHIFTER_WOLF_ID) {
        player.message('You finally kill the shapeshifter once and for all');
        if (!player.cache.shapeshifter) {
            player.cache.shapeshifter = true;
        }
        return false;
    }

    // transform into the next form and keep fighting
    const nextShape = addNpc(world, npc.id + 1, npc.x, npc.y, 300);
    player.message(
        `The shapeshifer turns into a ${shapeshifterName(nextShape.id)}!`
    );
    await nextShape.attack(player);

    // block the default death (the current form is replaced, not killed)
    return true;
}

async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id === SHAPESHIFTER_HUMAN_ID &&
        player.questStages.witchsHouse === -1
    ) {
        player.message('I have already done that quest');
        return true;
    }

    return false;
}

// taking the ball, guarded until shapeshifter dead (351,491)

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        groundItem.id !== BALL_ID ||
        groundItem.x !== 351 ||
        groundItem.y !== 491
    ) {
        return false;
    }

    // already complete - don't take it, it's not yours
    if (player.questStages.witchsHouse === -1) {
        await player.say("I'd better not take it, its not mine");
        return true;
    }

    if (!player.cache.shapeshifter) {
        const shapeshifter = ifNearVisNpc(player, SHAPESHIFTER_HUMAN_ID, 20);
        if (shapeshifter) {
            await shapeshifter.attack(player);
            if (Math.floor(Math.random() * 4) === 0) {
                weakenPlayer(player);
            }
        }
        // block the pickup - must defeat the shapeshifter first
        return true;
    }

    // shapeshifter is dead - allow the pickup
    player.world.removeEntity('groundItems', groundItem);
    player.inventory.add(BALL_ID);
    player.sendSound('takeobject');
    return true;
}

function weakenPlayer(player) {
    player.message('The shapeshifter glares at you');
    player.message('You feel slightly weakened');

    for (const skill of ['attack', 'defense', 'strength']) {
        const maxStat = player.skills[skill].base;
        const lowerBy = Math.ceil((maxStat - 4) / 15.0);
        const newStat = Math.max(0, player.skills[skill].current - lowerBy);
        player.skills[skill].current = newStat;
    }

    player.sendStats();
}

// reward: 4 quest points, hits xp

function completeQuest(player) {
    player.message('Well done you have completed the Witches house quest');

    // XPReward(HITS, base=1300, var=600) -> hits.base * 150 + 325
    player.addExperience('hits', player.skills.hits.base * 150 + 325, false);

    player.questStages.witchsHouse = -1;
    player.addQuestPoints(4);
    player.message('@gre@You haved gained 4 quest points!');

    delete player.cache.witch_gone;
    delete player.cache.shapeshifter;
    delete player.cache.found_magnet;
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne,
    onDropItem,
    onUseWithNPC,
    onNPCDeath,
    onNPCAttack,
    onGroundItemTake
};
