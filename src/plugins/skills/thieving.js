// https://classic.runescape.wiki/w/Thieving
// thieving: npc pickpocket with real batch progression. a failed pickpocket
// starts combat; the packet handler leaves the player+npc locked, so clean
// paths unlock both here and the fail path hands the locks to npc.attack.

const thieving = require('@2003scape/rsc-data/skills/thieving');
const { rollItemDrop, rollSkillSuccess } = require('../../rolls');
const { getBatchCount } = require('./batch');
const skillCapes = require('./skill-capes');

const PICKPOCKET_NPC_IDS = new Set(Object.keys(thieving.pickpocket).map(Number));

// Resolve `reference` chains (e.g. pickpocket[100] -> reference 65).
function getPickpocket(id) {
    let def = thieving.pickpocket[id];

    while (def && typeof def.reference !== 'undefined') {
        def = thieving.pickpocket[def.reference];
    }

    return def;
}

// loot: chance>=100 is guaranteed, otherwise one weighted pick, possible miss
function giveLoot(player, items) {
    const drops = rollItemDrop({ 0: items }, 0);

    for (const drop of drops) {
        player.inventory.add(drop.id, drop.amount || 1);
    }
}

async function onNPCCommand(player, npc, command) {
    if (command !== 'pickpocket' || !PICKPOCKET_NPC_IDS.has(npc.id)) {
        return false;
    }

    const pickpocket = getPickpocket(npc.id);

    // no data for this NPC -> not thievable; unlock and let default run
    if (!pickpocket) {
        player.unlock();
        npc.unlock();
        return true;
    }

    const npcName = npc.definition.name;
    const { world } = player;

    // level gate (Thieving.handlePickpocketing)
    if (player.skills.thieving.current < pickpocket.level) {
        player.message(
            `@que@You need to be a level ${pickpocket.level} thief ` +
                `to pick the ${npcName}'s pocket`
        );

        player.unlock();
        npc.unlock();
        return true;
    }

    const repeat = getBatchCount(player, 'thieving');

    for (let i = 0; i < repeat; i += 1) {
        // NPC gone (died/despawned mid-batch) -> stop
        if (npc.skills.hits.current <= 0 || npc.opponent) {
            player.unlock();
            npc.unlock();
            return true;
        }

        player.faceEntity(npc);
        player.message(`@que@You attempt to pick the ${npcName}'s pocket`);

        await world.sleepTicks(3);

        const [low, high] = pickpocket.roll;
        let success = rollSkillSuccess(
            low,
            high,
            player.skills.thieving.current
        );

        // thieving cape (15%): rerolls a failed pickpocket into a success
        if (skillCapes.shouldActivateParam(player, 'thieving', success)) {
            success = true;
            player.sendBubble(skillCapes.resolveCapeIds().thieving);
            player.message(
                '@que@@mag@Your Thieving cape activates, and you successfully ' +
                    `pick the ${npcName}'s pocket`
            );
        }

        if (success) {
            player.message(`@que@You pick the ${npcName}'s pocket`);
            giveLoot(player, pickpocket.items);

            if (pickpocket.experience) {
                player.addExperience('thieving', pickpocket.experience);
            }

            // batch continues to the next attempt (delay(2) in OpenRSC)
            await world.sleepTicks(2);
            continue;
        }

        // failure: the player is caught, the NPC shouts and attacks.
        player.message(`@que@You fail to pick the ${npcName}'s pocket`);
        await npc.say(pickpocket.exclaimation);

        // hand off to combat without unlocking; unlock both if the attack couldn't engage
        const engaged = await npc.attack(player);

        if (!engaged) {
            player.unlock();
            npc.unlock();
        }

        return true;
    }

    // batch exhausted cleanly
    player.unlock();
    npc.unlock();
    return true;
}

// stall theft, chest theft, and door picklocking.
// stall/chest fatigue collapses to player.isTired(); doors have no fatigue
// check. merchant stolen flags stored as Date.now() ms (20-minute block).

const items = require('@2003scape/rsc-data/config/items');

// random(low, high) inclusive, matching DataConversions.random.
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function itemName(id) {
    const def = items[id];
    return def ? def.name : '';
}

// checked in priority order; visible means known to the player's client
function findNearbyNpc(player, ids, radius) {
    const idList = Array.isArray(ids) ? ids : [ids];

    for (const id of idList) {
        const npc = Array.from(player.world.npcs.getAllByID(id)).find((n) => {
            return (
                player.localEntities.known.npcs.has(n) &&
                n.getDistance(player) <= radius
            );
        });

        if (npc) {
            return npc;
        }
    }

    return null;
}

// gathering success roll from level requirement, skill level, and equipment bonus
function calcGatheringSuccessfulLegacy(levelReq, skillLevel, equipmentBonus) {
    if (skillLevel < levelReq) {
        return false;
    }

    const roll = random(1, 128);
    const threshold = Math.min(
        127,
        Math.max(
            1,
            skillLevel + equipmentBonus + 40 - Math.floor(levelReq * 1.5)
        )
    );

    return roll <= threshold;
}

// item/npc ids (resolved by name)
const COINS_ID = 10;
const LOCKPICK_ID = 714;
const STEEL_ARROW_HEADS_ID = 671;

const GUARD_ARDOUGNE_ID = 321;
const KNIGHT_ID = 322;
const PALADIN_ID = 323;
const HERO_ID = 324;
const BAKER_ID = 325;
const SILK_MERCHANT_ID = 326;
const FUR_TRADER_ID = 327;
const SILVER_MERCHANT_ID = 328;
const SPICE_MERCHANT_ID = 329;
const GEM_MERCHANT_ID = 330;
const TEA_SELLER_ID = 780;

// stalls
const STALL = {
    BAKERS_STALL: 322,
    SILK_STALL: 323,
    FUR_STALL: 324,
    SILVER_STALL: 325,
    SPICES_STALL: 326,
    GEMS_STALL: 327,
    TEA_STALL: 1183
};

const EMPTY_STALL_ID = 341;

const STALLS = {
    [STALL.TEA_STALL]: {
        level: 5,
        xp: 64,
        respawn: 5000,
        owner: TEA_SELLER_ID,
        guards: [],
        prefix: '',
        loot: [{ id: 739, amount: 1, chance: 100 }] // cup of tea
    },
    [STALL.BAKERS_STALL]: {
        level: 5,
        xp: 64,
        respawn: 5000,
        owner: BAKER_ID,
        guards: [GUARD_ARDOUGNE_ID],
        prefix: '',
        loot: [{ id: 330, amount: 1, chance: 100 }] // cake
    },
    [STALL.SILK_STALL]: {
        level: 20,
        xp: 96,
        respawn: 8000,
        owner: SILK_MERCHANT_ID,
        guards: [KNIGHT_ID, GUARD_ARDOUGNE_ID],
        prefix: 'piece of ',
        loot: [{ id: 200, amount: 1, chance: 100 }] // silk
    },
    [STALL.FUR_STALL]: {
        level: 35,
        xp: 144,
        respawn: 15000,
        owner: FUR_TRADER_ID,
        guards: [KNIGHT_ID, GUARD_ARDOUGNE_ID],
        prefix: 'piece of ',
        loot: [{ id: 541, amount: 1, chance: 100 }] // grey wolf fur
    },
    [STALL.SILVER_STALL]: {
        level: 50,
        xp: 216,
        respawn: 30000,
        owner: SILVER_MERCHANT_ID,
        guards: [PALADIN_ID, KNIGHT_ID, GUARD_ARDOUGNE_ID],
        prefix: 'piece of ',
        loot: [{ id: 383, amount: 1, chance: 100 }] // silver
    },
    [STALL.SPICES_STALL]: {
        level: 65,
        xp: 324,
        respawn: 80000,
        owner: SPICE_MERCHANT_ID,
        guards: [PALADIN_ID, KNIGHT_ID, GUARD_ARDOUGNE_ID],
        prefix: 'pot of ',
        loot: [{ id: 707, amount: 1, chance: 100 }] // spice
    },
    [STALL.GEMS_STALL]: {
        level: 75,
        xp: 64,
        respawn: 180000,
        owner: GEM_MERCHANT_ID,
        guards: [HERO_ID, PALADIN_ID, KNIGHT_ID, GUARD_ARDOUGNE_ID],
        prefix: '',
        // sorted ascending by chance for the cumulative walk below
        loot: [
            { id: 157, amount: 1, chance: 5 }, // uncut diamond
            { id: 158, amount: 1, chance: 10 }, // uncut ruby
            { id: 159, amount: 1, chance: 20 }, // uncut emerald
            { id: 160, amount: 1, chance: 65 } // uncut sapphire
        ]
    }
};

const STOLEN_CACHE_KEY = {
    [STALL.BAKERS_STALL]: 'cakeStolen',
    [STALL.SILK_STALL]: 'silkStolen',
    [STALL.FUR_STALL]: 'furStolen',
    [STALL.SILVER_STALL]: 'silverStolen',
    [STALL.SPICES_STALL]: 'spiceStolen',
    [STALL.GEMS_STALL]: 'gemStolen'
    // TEA_STALL: Java never sets one.
};

// steal from a stall
async function stealFromStall(player, gameObject) {
    const id = gameObject.id;
    const stall = STALLS[id];

    if (!stall) {
        return false;
    }

    const { world } = player;
    const objectName = gameObject.definition.name.toLowerCase();

    if (id === STALL.BAKERS_STALL) {
        player.message(
            `@que@You attempt to steal some cake from the ${objectName}`
        );
    } else if (id === STALL.TEA_STALL) {
        const caught = 60 > random(0, 100);
        const teaseller = findNearbyNpc(player, TEA_SELLER_ID, 8);

        if (caught && teaseller) {
            await teaseller.say(
                'Oi what do you think you are doing ?',
                "I'm not like those stallholders in Al Kharid",
                'No one steals from my stall..'
            );

            return true;
        }

        player.message('@que@You attempt to steal a cup of tea...');
    } else if (id === STALL.GEMS_STALL) {
        player.message(`@que@You attempt to steal gem from the ${objectName}`);
    } else {
        const noun = objectName.replace('stall', '').trim();
        player.message(
            `@que@You attempt to steal some ${noun} from the ${objectName}`
        );
    }

    await world.sleepTicks(3);

    let failNoun =
        id === STALL.BAKERS_STALL ? 'cake' : objectName.replace('stall', '').trim();

    if (!failNoun.endsWith('s')) {
        failNoun += 's';
    }

    if (player.skills.thieving.current < stall.level) {
        player.message(`@que@You are not a high enough level to steal the ${failNoun}`);
        return true;
    }

    const shopkeeper = findNearbyNpc(player, stall.owner, 8);

    if (shopkeeper && shopkeeper.withinLineOfSight(player)) {
        await shopkeeper.say('Hey thats mine');

        const stolenFromKey = `stolenFrom${stall.owner}`;

        if (!player.cache[stolenFromKey]) {
            player.cache[stolenFromKey] = true;
        }

        return true;
    }

    const guard = stall.guards.length
        ? findNearbyNpc(player, stall.guards, 5)
        : null;

    if (guard && guard.withinLineOfSight(player)) {
        await guard.say('Hey! Get your hands off there!');
        player.cache[`stolenFrom${stall.owner}`] = true;
        await guard.attack(player);

        return true;
    }

    // weighted pick, chance out of 100, cumulative over the sorted loot table
    const roll = random(1, 100);
    let selected = null;
    let cumulative = 0;

    for (const entry of stall.loot) {
        if (cumulative + entry.chance >= roll) {
            selected = entry;
            break;
        }

        cumulative += entry.chance;
    }

    if (!selected) {
        [selected] = stall.loot;
    }

    if (player.isTired()) {
        player.message('You are too tired to thieve here');
        return true;
    }

    player.inventory.add(selected.id, selected.amount);

    const lootName =
        id === STALL.GEMS_STALL ? 'gem' : itemName(selected.id).toLowerCase();

    player.message(`You steal a ${stall.prefix}${lootName}`);
    player.addExperience('thieving', stall.xp);

    const stolenKey = STOLEN_CACHE_KEY[id];

    if (stolenKey) {
        player.cache[stolenKey] = Date.now();
    }

    const empty = world.replaceEntity('gameObjects', gameObject, EMPTY_STALL_ID);

    world.setTimeout(() => {
        const [at] = world.gameObjects.getAtPoint(empty.x, empty.y);

        if (at === empty) {
            world.replaceEntity('gameObjects', empty, id);
        }
    }, stall.respawn);

    return true;
}

// chests
const LOOTED_CHEST_ID = 340;
const BUSY_CHEST_ID = 339;
const HEMENSTER_CHEST_ID = 379;
const CHEST_RANGE_MIN = 334;
const CHEST_RANGE_MAX = 339; // inclusive (blockOpLoc's member-gated range)

const CHESTS = {
    334: {
        // 10gp Chest
        level: 13,
        xp: 30,
        respawn: 10000,
        loot: [{ id: COINS_ID, amount: 10 }]
    },
    335: {
        // Nature-rune Chest
        level: 28,
        xp: 100,
        respawn: 25000,
        loot: [
            { id: COINS_ID, amount: 3 },
            { id: 40, amount: 1 } // nature rune
        ]
    },
    336: {
        // 50gp Chest
        level: 43,
        xp: 500,
        respawn: 100000,
        loot: [{ id: COINS_ID, amount: 50 }]
    },
    337: {
        // Blood Chest
        level: 59,
        xp: 1000,
        respawn: 250000,
        loot: [
            { id: COINS_ID, amount: 500 },
            { id: 619, amount: 2 } // blood rune
        ],
        teleport: { x: 614, y: 568 }
    },
    338: {
        // Paladin Chest
        level: 72,
        xp: 2000,
        respawn: 500000,
        loot: [
            { id: COINS_ID, amount: 1000 },
            { id: 545, amount: 1 }, // raw shark
            { id: 154, amount: 1 }, // adamantite ore
            { id: 160, amount: 1 } // uncut sapphire
        ],
        teleport: { x: 523, y: 606 }
    }
};

// the search for traps command
async function handleChestThieving(player, gameObject) {
    const chest = CHESTS[gameObject.id];

    if (!chest) {
        return false;
    }

    const { world } = player;

    player.message('You search the chest for traps');

    if (player.skills.thieving.current < chest.level) {
        player.message('You find nothing');
        return true;
    }

    if (player.isTired()) {
        player.message('You are too tired to thieve here');
        return true;
    }

    const [stillThere] = world.gameObjects.getAtPoint(gameObject.x, gameObject.y);

    if (stillThere !== gameObject) {
        player.message('You find nothing');
        return true;
    }

    player.message('You find a trap on the chest');
    await world.sleepTicks(2);
    player.message('You disable the trap');

    player.message('@que@You open the chest');
    await world.sleepTicks(3);

    for (const drop of chest.loot) {
        player.inventory.add(drop.id, drop.amount);
    }

    player.addExperience('thieving', chest.xp);
    player.message('@que@You find treasure inside!');
    await world.sleepTicks(3);

    const looted = world.replaceEntity(
        'gameObjects',
        gameObject,
        LOOTED_CHEST_ID
    );

    world.setTimeout(() => {
        const [at] = world.gameObjects.getAtPoint(looted.x, looted.y);

        if (at === looted) {
            world.replaceEntity('gameObjects', looted, gameObject.id);
        }
    }, chest.respawn);

    if (chest.teleport) {
        player.message('@que@suddenly a second magical trap triggers');
        await world.sleepTicks(3);
        player.teleport(chest.teleport.x, chest.teleport.y);
    }

    return true;
}

// onOpLoc's "Open" command on 334-338: instantly springs the trap.
async function springChestTrap(player) {
    player.message('@que@You have activated a trap on the chest');
    player.damage(random(0, 8));

    return true;
}

// hemenster chest: single-attempt, not batched, checks fatigue
async function pickHemensterChest(player, gameObject) {
    player.message('@que@you attempt to pick the lock');

    if (player.isTired()) {
        player.message('You are too tired to pick the lock');
        return true;
    }

    if (player.skills.thieving.current < 47) {
        player.message('@que@You are not a high enough level to pick this lock');
        return true;
    }

    if (!player.inventory.has(LOCKPICK_ID)) {
        player.message('@que@You need a lockpick for this lock');
        return true;
    }

    player.message('@que@You manage to pick the lock');

    const { world } = player;

    player.message('@que@You open the chest');
    await world.sleepTicks(3);

    player.message('@que@You find a treasure inside!');
    await world.sleepTicks(3);

    player.addExperience('thieving', 600);
    player.inventory.add(COINS_ID, 20);
    player.inventory.add(STEEL_ARROW_HEADS_ID, 5);

    const looted = world.replaceEntity(
        'gameObjects',
        gameObject,
        LOOTED_CHEST_ID
    );

    world.setTimeout(() => {
        const [at] = world.gameObjects.getAtPoint(looted.x, looted.y);

        if (at === looted) {
            world.replaceEntity('gameObjects', looted, gameObject.id);
        }
    }, 150000);

    return true;
}

// doors
const DOOR_IDS = new Set([93, 94, 95, 96, 97, 99, 100, 162]);

// per-door req/exp/goThrough/lockpick resolution, recomputed fresh each click
function resolveDoor(player, wallObject) {
    const ox = wallObject.x;
    const oy = wallObject.y;
    const px = player.x;
    const py = player.y;

    let req = 1;
    let exp = 0;
    let goThrough = false;
    let requiresLockpick = false;

    switch (wallObject.id) {
        case 93: // 10gp chest door
            req = 7;
            exp = 15;
            if (py <= 591) {
                goThrough = true;
            }
            break;

        case 94: // nature-rune chest, 50gp chest door, Yanille anvil hut
            if (
                (ox === 586 && oy === 581) ||
                (ox === 539 && oy === 599) ||
                (ox === 581 && oy === 580) ||
                (ox === 581 && oy === 761)
            ) {
                req = 16;
                exp = 60;

                if (px === 539 && py >= 599) {
                    goThrough = true;
                } else if (px <= 585 && py === 581) {
                    goThrough = true;
                } else if (px >= 581 && py === 580) {
                    goThrough = true;
                } else if (
                    (px === 582 && py >= 761) ||
                    (px === 581 && py >= 762)
                ) {
                    goThrough = true;
                }
            }
            break;

        case 95: // Ardougne Sewer mine
            req = 31;
            exp = 100;
            if (px <= 556) {
                goThrough = true;
            }
            break;

        case 96: // Chaos druid tower
            req = 46;
            exp = 150;
            if (py <= 555) {
                goThrough = true;
            }
            break;

        case 162: // Yanille druid door
            req = 82;
            exp = 200;
            requiresLockpick = true;
            break;

        case 100: // axe huts door
            req = 32;
            exp = 100;
            requiresLockpick = true;
            if (py >= 103 && py <= 107) {
                goThrough = true;
            }
            break;

        case 99: // pirate hut door
            req = 39;
            exp = 140;
            requiresLockpick = true;
            if (
                (px >= 263 && px <= 269 && py === 104) ||
                (px === 266 && py >= 100)
            ) {
                goThrough = true;
            }
            break;

        case 97: // Ardougne Paladin 2nd floor door
            req = 61;
            exp = 200;
            if (py >= 1548 && px === 609) {
                goThrough = true;
            }
            break;
    }

    return { req, exp, goThrough, requiresLockpick };
}

// repeats on failure, stopping when picked or the batch is exhausted
async function batchPicklock(
    player,
    wallObject,
    req,
    exp,
    goThrough,
    requiresLockpick,
    repeat
) {
    const { world } = player;

    for (let attempt = 0; attempt < repeat; attempt += 1) {
        player.message('@que@you attempt to pick the lock');

        if (player.skills.thieving.current < req) {
            player.message(
                '@que@You are not a high enough level to pick this lock'
            );
            return;
        }

        const hasLockpick = player.inventory.has(LOCKPICK_ID);

        if (requiresLockpick && !hasLockpick) {
            player.message('@que@You need a lockpick for this lock');
            return;
        }

        const effectiveLevel =
            player.skills.thieving.current + (hasLockpick ? 10 : 0);
        const succeeded =
            calcGatheringSuccessfulLegacy(req, effectiveLevel, 0) && !goThrough;

        if (succeeded) {
            player.message('@que@You manage to pick the lock');
            await player.enterDoor(wallObject);
            player.message('You go through the door');
            player.addExperience('thieving', exp);
            return;
        }

        player.message('@que@You fail to pick the lock');

        if (attempt < repeat - 1) {
            await world.sleepTicks(3);
        }
    }
}

// onOpBound click 0 ("Open").
async function onWallObjectCommandOne(player, wallObject) {
    if (!DOOR_IDS.has(wallObject.id)) {
        return false;
    }

    if (!player.world.members) {
        player.message('Nothing interesting happens');
        return false;
    }

    const { goThrough } = resolveDoor(player, wallObject);

    if (goThrough) {
        player.message('You go through the door');
        await player.enterDoor(wallObject);
    } else {
        player.message('The door is locked');
    }

    return true;
}

// onOpBound click 1 ("Pick lock").
async function onWallObjectCommandTwo(player, wallObject) {
    if (!DOOR_IDS.has(wallObject.id)) {
        return false;
    }

    if (!player.world.members) {
        player.message('Nothing interesting happens');
        return false;
    }

    const { req, exp, goThrough, requiresLockpick } = resolveDoor(
        player,
        wallObject
    );

    if (goThrough) {
        player.message('You have already unlocked the door');
        return true;
    }

    const repeat = getBatchCount(player, 'thieving');

    await batchPicklock(
        player,
        wallObject,
        req,
        exp,
        goThrough,
        requiresLockpick,
        repeat
    );

    return true;
}

// rsc-server plugin entry points (game objects)

// index 0 command ("Open" on chests / "WalkTo" on stalls).
async function onGameObjectCommandOne(player, gameObject) {
    const id = gameObject.id;

    if (id === LOOTED_CHEST_ID) {
        player.message('It looks like this chest has already been looted');
        return true;
    }

    if (id === HEMENSTER_CHEST_ID) {
        player.message('@que@This chest is locked');
        return true;
    }

    if (id >= CHEST_RANGE_MIN && id <= CHEST_RANGE_MAX) {
        if (!player.world.members) {
            player.message('Nothing interesting happens');
            return false;
        }

        if (id !== BUSY_CHEST_ID) {
            return await springChestTrap(player);
        }

        // 339 (busy placeholder): no "Open" op, unreachable
        return false;
    }

    // stalls only respond to the index-1 "steal from" command.
    return false;
}

// index 1 command: search for traps on chests, steal from on stalls
async function onGameObjectCommandTwo(player, gameObject) {
    const id = gameObject.id;

    if (id === LOOTED_CHEST_ID) {
        player.message('It looks like this chest has already been looted');
        return true;
    }

    if (id === HEMENSTER_CHEST_ID) {
        return await pickHemensterChest(player, gameObject);
    }

    if (id >= CHEST_RANGE_MIN && id <= CHEST_RANGE_MAX) {
        if (!player.world.members) {
            player.message('Nothing interesting happens');
            return false;
        }

        if (id !== BUSY_CHEST_ID) {
            return await handleChestThieving(player, gameObject);
        }

        player.message('You search the chest for traps');
        player.message('You find nothing');
        return true;
    }

    if (STALLS[id]) {
        if (!player.world.members) {
            player.message('Nothing interesting happens');
            return false;
        }

        return await stealFromStall(player, gameObject);
    }

    return false;
}

module.exports = {
    onNPCCommand,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne,
    onWallObjectCommandTwo
};
