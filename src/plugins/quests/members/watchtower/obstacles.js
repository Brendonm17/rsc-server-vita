// watchtower (members): ladders, bushes, cave teleporters, chests, the rock-cake
// stall, rock jumps, holes, the lever, the cave-exit/battlement walls, the guard

const { questsEnabled } = require('../../custom-gate.js');

const {
    QUEST_KEY,
    QUEST_POINTS,
    MAGIC_XP_BASE,
    MAGIC_XP_VAR,
    COIN_REWARD,
    WATCHTOWER_WIZARD_ID,
    TOWER_GUARD_ID,
    OGRE_GUARD_CAVE_ENTRANCE_ID,
    OGRE_TRADER_ROCKCAKE_ID,
    OGRE_GUARD_BRIDGE_ID,
    OGRE_GUARD_BATTLEMENT_ID,
    POISON_SPIDER_ID,
    POISON_SCORPION_ID,
    CHAOS_DWARF_ID,
    RAT_LVL8_ID,
    COINS_ID,
    SPELL_SCROLL_ID,
    KEY_ID,
    STOLEN_GOLD_ID,
    SKAVID_MAP_ID,
    LIT_CANDLE_ID,
    LIT_BLACK_CANDLE_ID,
    LIT_TORCH_ID,
    ROCK_CAKE_ID,
    OGRE_RELIC_ID,
    ARMOUR_ID,
    FINGERNAILS_ID,
    WATCH_TOWER_EYE_PATCH_ID,
    ROBE_ID,
    DAGGER_ID,
    ROTTEN_APPLES_ID,
    BONES_ID,
    EMERALD_ID,
    BURNT_PIKE_ID,
    POWERING_CRYSTAL1_ID,
    POWERING_CRYSTAL2_ID,
    POWERING_CRYSTAL3_ID,
    POWERING_CRYSTAL4_ID,
    TOWER_FIRST_FLOOR_LADDER,
    COMPLETED_QUEST_LADDER,
    TOWER_SECOND_FLOOR_LADDER,
    WATCHTOWER_LEVER,
    WATCHTOWER_LEVER_DOWNPOSITION,
    WRONG_BUSHES,
    CORRECT_BUSHES,
    TELEPORT_CAVES,
    TUNNEL_CAVE,
    TOBAN_CHEST_OPEN,
    TOBAN_CHEST_CLOSED,
    ISLAND_LADDER,
    WRONG_STEAL_COUNTER,
    OGRE_CAVE_ENCLAVE,
    ROCK_CAKE_COUNTER,
    ROCK_CAKE_COUNTER_EMPTY,
    CHEST_WEST,
    ROCK_OVER,
    ROCK_BACK,
    CHEST_EAST,
    CHEST_GENERIC_OPEN,
    DARK_PLACE_ROCKS,
    DARK_PLACE_TELEPORT_ROCK,
    YANILLE_HOLE,
    SKAVID_HOLE,
    OGRE_ENCLAVE_EXIT,
    CAVE_EXITS,
    BATTLEMENT,
    SOUTH_WEST_BATTLEMENT,
    ifNearVisNpc,
    spawnNpc
} = require('./ids.js');

function stage(player) {
    return player.questStages[QUEST_KEY] || 0;
}

function hasLightSource(player) {
    return (
        player.inventory.has(LIT_CANDLE_ID) ||
        player.inventory.has(LIT_BLACK_CANDLE_ID) ||
        player.inventory.has(LIT_TORCH_ID)
    );
}

async function completeWatchtower(player, wizard) {
    player.inventory.remove(POWERING_CRYSTAL1_ID);
    player.inventory.remove(POWERING_CRYSTAL2_ID);
    player.inventory.remove(POWERING_CRYSTAL3_ID);
    player.inventory.remove(POWERING_CRYSTAL4_ID);

    player.addQuestPoints(QUEST_POINTS);
    // incStat(MAGIC, base, var) = maxStat(magic) * var + base
    const magicXp = player.skills.magic.base * MAGIC_XP_VAR + MAGIC_XP_BASE;
    player.addExperience('magic', magicXp, false);

    player.engage(wizard);
    await wizard.say(
        'Marvellous! it works!',
        'The town will now be safe',
        'Your help was invaluable',
        'Take this payment as a token of my gratitude...'
    );
    player.message('The wizard gives you 5000 pieces of gold');
    player.inventory.add(COINS_ID, COIN_REWARD);
    await wizard.say('Also, let me improve your magic level for you');
    player.message('The wizard lays his hands on you...');
    player.message('You feel magic power increasing');
    await wizard.say('Here is a special item for you...');
    player.inventory.add(SPELL_SCROLL_ID, 1);
    await wizard.say(
        "It's a new spell",
        'Read the scroll and you will be able',
        'To teleport yourself to here magically...'
    );
    player.message('Congratulations, you have finished the watchtower quest');
    player.questStages[QUEST_KEY] = -1;
    player.message('@gre@You have completed the Watchtower quest');
    player.disengage();
}

async function pullLever(player, gameObject) {
    const { world } = player;
    const down = world.replaceEntity(
        'gameObjects',
        gameObject,
        WATCHTOWER_LEVER_DOWNPOSITION
    );
    // OpenRSC addloc(...2000ms); ~3 ticks in rsc-server.
    world.setTickTimeout(() => {
        world.replaceEntity('gameObjects', down, WATCHTOWER_LEVER);
    }, 3);
    player.message('You pull the lever');
    if (stage(player) === 10) {
        player.message('The magic forcefield activates');
        player.teleport(492, 3521);
        const wizard = ifNearVisNpc(player, WATCHTOWER_WIZARD_ID, 6);
        if (wizard) {
            await completeWatchtower(player, wizard);
        } else {
            player.message(
                'Seems like the wizards were busy, please go back and complete again'
            );
        }
    } else {
        player.message('It had no effect');
    }
}

async function searchCorrectBush(player, gameObject) {
    if (stage(player) === 0) {
        await player.say('I am not sure why I am searching this bush...');
        return;
    }
    if (gameObject.id === CORRECT_BUSHES[0]) {
        await player.say("Here's Some armour, it could be evidence...");
        player.inventory.add(ARMOUR_ID, 1);
    } else if (gameObject.id === CORRECT_BUSHES[1]) {
        if (!player.inventory.has(FINGERNAILS_ID)) {
            await player.say(
                "What's this ?",
                'Disgusting! some fingernails',
                "They may be a clue though... I'd better take them"
            );
            player.inventory.add(FINGERNAILS_ID, 1);
        } else {
            await player.say('I have already searched this place');
        }
    } else if (gameObject.id === CORRECT_BUSHES[2]) {
        if (!player.inventory.has(WATCH_TOWER_EYE_PATCH_ID)) {
            await player.say(
                "I've found an eyepatch, I better show this to the wizards"
            );
            player.inventory.add(WATCH_TOWER_EYE_PATCH_ID, 1);
        } else {
            await player.say('I have already searched this place');
        }
    } else if (gameObject.id === CORRECT_BUSHES[3]) {
        if (!player.inventory.has(ROBE_ID)) {
            await player.say('Aha! a robe');
            player.inventory.add(ROBE_ID, 1);
            await player.say('This could be a clue...');
        } else {
            await player.say('I have already searched this place');
        }
    } else if (gameObject.id === CORRECT_BUSHES[4]) {
        await player.say('Aha a dagger');
        player.inventory.add(DAGGER_ID, 1);
        await player.say('I wonder if this is evidence...');
    }
}

async function enterTeleportCave(player, gameObject) {
    if (player.inventory.has(SKAVID_MAP_ID)) {
        if (hasLightSource(player)) {
            player.message('You enter the cave');
            if (gameObject.id === TELEPORT_CAVES[0]) {
                player.teleport(650, 3555);
            } else if (gameObject.id === TELEPORT_CAVES[1]) {
                player.teleport(626, 3564);
            } else if (gameObject.id === TELEPORT_CAVES[2]) {
                player.teleport(627, 3591);
            } else if (gameObject.id === TELEPORT_CAVES[3]) {
                player.teleport(638, 3564);
            } else if (gameObject.id === TELEPORT_CAVES[4]) {
                player.teleport(629, 3574);
            } else if (gameObject.id === TELEPORT_CAVES[5]) {
                player.teleport(647, 3596);
            }
        } else {
            player.teleport(629, 3558);
            await player.say(
                "Oh my! It's dark!",
                'All I can see are lots of rocks on the floor',
                'I suppose I better search them for a way out'
            );
        }
    } else {
        player.message(
            "There's no way I can find my way through without a map of some kind"
        );
        if (
            gameObject.id === TELEPORT_CAVES[0] ||
            gameObject.id === TELEPORT_CAVES[4]
        ) {
            player.teleport(629, 777);
        } else if (gameObject.id === TELEPORT_CAVES[1]) {
            player.teleport(624, 807);
        } else if (gameObject.id === TELEPORT_CAVES[2]) {
            player.teleport(648, 769);
        } else if (gameObject.id === TELEPORT_CAVES[3]) {
            player.teleport(631, 789);
        } else if (gameObject.id === TELEPORT_CAVES[5]) {
            player.teleport(638, 777);
        }
    }
}

async function openTobanChest(player, gameObject) {
    const { world } = player;
    if (player.inventory.has(KEY_ID)) {
        player.message('You use the key Og gave you');
        player.inventory.remove(KEY_ID);
        const open = world.replaceEntity(
            'gameObjects',
            gameObject,
            TOBAN_CHEST_OPEN
        );
        world.setTickTimeout(() => {
            world.replaceEntity('gameObjects', open, TOBAN_CHEST_CLOSED);
        }, 3);
        if (player.inventory.has(STOLEN_GOLD_ID)) {
            player.message('@que@You have already got the stolen gold');
            await world.sleepTicks(3);
        } else {
            player.message('You find a stash of gold inside');
            player.message('@que@You take the gold');
            await world.sleepTicks(3);
            player.inventory.add(STOLEN_GOLD_ID, 1);
        }
        player.message('The chest springs shut');
    } else {
        player.message('The chest is locked');
        await player.say('I think I need a key of some sort...');
    }
}

async function randomizedChest(player, gameObject) {
    const { world } = player;
    player.message('You open the chest');
    const open = world.replaceEntity(
        'gameObjects',
        gameObject,
        CHEST_GENERIC_OPEN
    );
    world.setTickTimeout(() => {
        world.replaceEntity('gameObjects', open, CHEST_WEST);
    }, 4);
    const choosenReward = Math.floor(Math.random() * 8);
    if (choosenReward === 0) {
        await player.say('Hey! a scorpion is in here!');
        const scorp = spawnNpc(world, POISON_SCORPION_ID, gameObject.x - 1, gameObject.y);
        scorp.attack(player);
    } else if (choosenReward === 1) {
        await player.say('Oh no, not one of these spider things!');
        const spider = spawnNpc(world, POISON_SPIDER_ID, gameObject.x - 1, gameObject.y);
        spider.attack(player);
    } else if (choosenReward === 2) {
        await player.say('How on earth did this dwarf get in here ?');
        const dwarf = spawnNpc(world, CHAOS_DWARF_ID, gameObject.x - 1, gameObject.y);
        dwarf.attack(player);
    } else if (choosenReward === 3) {
        await player.say('Ugh! a dirty rat!');
        spawnNpc(world, RAT_LVL8_ID, gameObject.x - 1, gameObject.y);
    } else if (choosenReward === 4) {
        await player.say('Oh dear, I bet these apples taste disgusting');
        player.inventory.add(ROTTEN_APPLES_ID, 1);
    } else if (choosenReward === 5) {
        await player.say('Oh great, some bones!');
        player.inventory.add(BONES_ID, 1);
    } else if (choosenReward === 6) {
        await player.say('Wow, look at the size of this emerald!');
        player.inventory.add(EMERALD_ID, 1);
    } else if (choosenReward === 7) {
        await player.say('Burnt fish - why did I bother ?');
        player.inventory.add(BURNT_PIKE_ID, 1);
    }
    player.message('The chest snaps shut');
}

async function openEastChest(player, gameObject) {
    const { world } = player;
    player.message('You open the chest');
    const open = world.replaceEntity(
        'gameObjects',
        gameObject,
        CHEST_GENERIC_OPEN
    );
    world.setTickTimeout(() => {
        world.replaceEntity('gameObjects', open, CHEST_EAST);
    }, 3);
    player.message('Ahh! there is a poison spider inside');
    player.message("Someone's idea of a joke...");
    const spider = spawnNpc(world, POISON_SPIDER_ID, gameObject.x, gameObject.y + 1);
    spider.attack(player);
    await world.sleepTicks(3);
    player.message('The chest snaps shut');
}

async function rockCakeStall(player, gameObject) {
    const { world } = player;
    const ogreTrader = ifNearVisNpc(player, OGRE_TRADER_ROCKCAKE_ID, 5);
    if (ogreTrader) {
        player.engage(ogreTrader);
        await ogreTrader.say('Grr! get your hands off those cakes');
        player.disengage();
        await ogreTrader.attack(player);
    } else {
        if (player.skills.thieving.current < 15) {
            player.message(
                'You need a thieving level of 15 to steal from this stall'
            );
            return;
        }
        player.message('You cautiously grab a cake from the stall');
        player.inventory.add(ROCK_CAKE_ID, 1);
        player.addExperience('thieving', 64, true);
        const empty = world.replaceEntity(
            'gameObjects',
            gameObject,
            ROCK_CAKE_COUNTER_EMPTY
        );
        // OpenRSC addloc(...5000ms); ~8 ticks in rsc-server.
        world.setTickTimeout(() => {
            world.replaceEntity('gameObjects', empty, ROCK_CAKE_COUNTER);
        }, 8);
    }
}

async function jumpRock(player, gameObject, command) {
    const cmd = (command || '').toLowerCase();
    if (cmd === 'look at') {
        player.message('The bridge has collapsed');
        player.message('It seems this rock is placed here to jump from');
        return;
    }
    // "jump over"
    if (player.skills.agility.current < 30) {
        player.message('You need agility level of 30 to attempt this jump');
        return;
    }
    if (gameObject.id === ROCK_BACK) {
        player.teleport(646, 805);
        await player.say('I\'m glad that was easier on the way back!');
        return;
    }
    const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_BRIDGE_ID, 5);
    if (ogreGuard) {
        player.engage(ogreGuard);
        await ogreGuard.say(
            'Oi! Little thing, if you want to cross here',
            'You can pay me first - 20 gold pieces!'
        );
        await player.say('20 gold pieces to jump off a bridge!!?');
        await ogreGuard.say("That's what I said, like it or lump it");
        const menu = await player.ask(
            ["Okay i'll pay it", "Forget it, i'm not paying"],
            true
        );
        if (menu === 0) {
            await ogreGuard.say('A wise choice little thing');
            if (!player.inventory.has(COINS_ID, 20)) {
                await ogreGuard.say(
                    'And where is your money ? Grrrr!',
                    'Do you want to get hurt or something ?'
                );
            } else {
                player.inventory.remove(COINS_ID, 20);
                player.message('You daringly jump across the chasm');
                player.teleport(647, 799);
                player.addExperience('agility', 50, true);
                await player.say('Phew! I just made it');
            }
        } else if (menu === 1) {
            await ogreGuard.say("In that case you're not crossing");
            player.message('The guard blocks your path');
        }
        player.disengage();
    } else {
        player.message('You daringly jump across the chasm');
        player.teleport(647, 799);
        player.addExperience('agility', 50, true);
        await player.say('Phew! I just made it');
    }
}

const HANDLED_LOC = new Set([
    TOWER_FIRST_FLOOR_LADDER,
    COMPLETED_QUEST_LADDER,
    TOWER_SECOND_FLOOR_LADDER,
    WATCHTOWER_LEVER,
    WATCHTOWER_LEVER_DOWNPOSITION,
    ...WRONG_BUSHES,
    ...CORRECT_BUSHES,
    ...TELEPORT_CAVES,
    TUNNEL_CAVE,
    TOBAN_CHEST_CLOSED,
    ISLAND_LADDER,
    WRONG_STEAL_COUNTER,
    OGRE_CAVE_ENCLAVE,
    ROCK_CAKE_COUNTER,
    ROCK_CAKE_COUNTER_EMPTY,
    CHEST_WEST,
    CHEST_EAST,
    ROCK_OVER,
    ROCK_BACK,
    DARK_PLACE_ROCKS,
    DARK_PLACE_TELEPORT_ROCK,
    YANILLE_HOLE,
    SKAVID_HOLE,
    OGRE_ENCLAVE_EXIT
]);

async function handleOpLoc(player, gameObject, command) {
    const obj = gameObject;
    if (obj.id === COMPLETED_QUEST_LADDER) {
        player.teleport(636, 1684);
    } else if (obj.id === TOWER_SECOND_FLOOR_LADDER) {
        if (stage(player) === -1) {
            player.teleport(492, 3524);
        } else {
            player.teleport(636, 2628);
        }
    } else if (obj.id === TOWER_FIRST_FLOOR_LADDER) {
        const tGuard = ifNearVisNpc(player, TOWER_GUARD_ID, 5);
        if (stage(player) === 0) {
            if (tGuard) {
                player.engage(tGuard);
                await tGuard.say("You can't go up there", "That's private that is");
                player.disengage();
            }
        } else {
            if (tGuard) {
                player.engage(tGuard);
                await tGuard.say("It is the wizards helping hand", "Let 'em up");
                player.disengage();
            }
            // climb up one height-plane to the tower floor
            player.climb(obj, true);
        }
    } else if (obj.id === OGRE_ENCLAVE_EXIT) {
        player.teleport(662, 788);
    } else if (obj.id === WATCHTOWER_LEVER_DOWNPOSITION) {
        player.message('The lever is stuck in the down position');
    } else if (obj.id === WATCHTOWER_LEVER) {
        await pullLever(player, obj);
    } else if (WRONG_BUSHES.includes(obj.id)) {
        if (stage(player) === 0) {
            await player.say('I am not sure why I am searching this bush...');
            return;
        }
        await player.say('Hmmm, nothing here');
    } else if (CORRECT_BUSHES.includes(obj.id)) {
        await searchCorrectBush(player, obj);
    } else if (TELEPORT_CAVES.includes(obj.id)) {
        await enterTeleportCave(player, obj);
    } else if (obj.id === TUNNEL_CAVE) {
        player.message('You enter the cave');
        player.teleport(605, 803);
        await player.say('Wow! that tunnel went a long way');
    } else if (obj.id === TOBAN_CHEST_CLOSED) {
        await openTobanChest(player, obj);
    } else if (obj.id === ISLAND_LADDER) {
        player.message('You climb down the ladder');
        player.teleport(669, 826);
    } else if (obj.id === WRONG_STEAL_COUNTER) {
        player.message('You find nothing to steal');
    } else if (obj.id === OGRE_CAVE_ENCLAVE) {
        // enclave stays locked post-quest (stage -1)
        if (stage(player) === -1) {
            player.message('The ogres have blocked this entrance now');
            return;
        }
        const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_CAVE_ENTRANCE_ID, 5);
        if (ogreGuard) {
            player.engage(ogreGuard);
            await ogreGuard.say("No you don't!");
            player.disengage();
            await ogreGuard.attack(player);
        } else {
            // player must use nightshade on ogre
            player.message('Nothing interesting happens');
        }
    } else if (obj.id === ROCK_CAKE_COUNTER) {
        await rockCakeStall(player, obj);
    } else if (obj.id === ROCK_CAKE_COUNTER_EMPTY) {
        player.message('The stall is empty at the moment');
    } else if (obj.id === CHEST_WEST) {
        await randomizedChest(player, obj);
    } else if (obj.id === CHEST_EAST) {
        await openEastChest(player, obj);
    } else if (obj.id === ROCK_OVER || obj.id === ROCK_BACK) {
        await jumpRock(player, obj, command);
    } else if (obj.id === DARK_PLACE_ROCKS) {
        player.message('You search the rock');
        player.message("There's nothing here");
    } else if (obj.id === DARK_PLACE_TELEPORT_ROCK) {
        player.message('You search the rock');
        player.message('You uncover a tunnel entrance');
        player.teleport(638, 776);
        await player.say(
            "Phew! At last i'm out...",
            'Next time I will take some light!'
        );
    } else if (obj.id === YANILLE_HOLE) {
        await player.say(
            "I can't get through this way",
            'This hole must lead to somewhere...'
        );
    } else if (obj.id === SKAVID_HOLE) {
        player.message('@que@You enter the tunnel');
        player.message("So that's how the skavids are getting into yanille!");
        player.teleport(609, 742);
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (!HANDLED_LOC.has(gameObject.id)) {
        return false;
    }
    // rocks: command-one = "jump over", command-two = "look at"
    if (gameObject.id === ROCK_OVER || gameObject.id === ROCK_BACK) {
        await handleOpLoc(player, gameObject, 'jump over');
        return true;
    }
    await handleOpLoc(player, gameObject, 'op');
    return true;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id === ROCK_OVER || gameObject.id === ROCK_BACK) {
        await handleOpLoc(player, gameObject, 'look at');
        return true;
    }
    return false;
}

// boundary objects (cave exits + battlements)
async function cakeCheckGuard(player, ogreGuard) {
    player.engage(ogreGuard);
    await ogreGuard.say(
        'Stop creature!... Oh its you',
        'Well what have you got for us then ?'
    );
    if (player.inventory.has(ROCK_CAKE_ID)) {
        await player.say('How about this ?');
        player.message('You give the guard a rock cake');
        player.inventory.remove(ROCK_CAKE_ID);
        await ogreGuard.say(
            'Well well, looks at this',
            'My favourite, rock cake!',
            'Okay we will let it through'
        );
        player.teleport(663, 812);
        player.message('You climb over the battlement');
        delete player.cache.get_ogre_gift;
        player.cache.has_ogre_gift = true;
    } else {
        await player.say("I didn't bring anything");
        await ogreGuard.say("Didn't bring anything!", 'In that case shove off!');
        player.message('The guard pushes you out of the city');
        player.teleport(635, 774);
    }
    player.disengage();
}

async function handleSouthWestBattlement(player) {
    const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_BATTLEMENT_ID, 5);
    if (player.x <= 664) {
        player.teleport(player.x + 1, player.y);
        return;
    }
    if (player.cache.has_ogre_gift || stage(player) === -1) {
        if (ogreGuard) {
            player.engage(ogreGuard);
            await ogreGuard.say(
                "It's that creature again",
                'This time we will let it go...'
            );
            player.disengage();
        }
        player.teleport(player.x - 1, player.y);
        player.message('You climb over the battlement');
    } else if (player.cache.get_ogre_gift) {
        if (ogreGuard) {
            await cakeCheckGuard(player, ogreGuard);
        }
    } else {
        if (ogreGuard) {
            player.engage(ogreGuard);
            await ogreGuard.say(
                'Oi! where do you think you are going ?',
                'You are for the cooking pot!'
            );
            const menu = await player.ask(
                ['But I am a friend to ogres...', 'Not if I can help it'],
                true
            );
            if (menu === 0) {
                await ogreGuard.say(
                    'Prove it to us with a gift',
                    'Get us something from the market'
                );
                await player.say('Like what ?');
                await ogreGuard.say('Surprise us...');
                player.cache.get_ogre_gift = true;
            } else if (menu === 1) {
                await ogreGuard.say(
                    "You can help by being tonight's dinner...",
                    'Or you can go away, now what shall it be ?'
                );
                const subMenu = await player.ask(
                    ["Okay, okay i'm going", 'I tire of ogres, prepare to die!'],
                    true
                );
                if (subMenu === 0) {
                    await ogreGuard.say('back to whence you came');
                    player.teleport(635, 774);
                } else if (subMenu === 1) {
                    await ogreGuard.say('Grrrrr!');
                    player.disengage();
                    await ogreGuard.attack(player);
                    return;
                }
            }
            player.disengage();
        }
    }
}

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (CAVE_EXITS.includes(wallObject.id)) {
        if (wallObject.id === CAVE_EXITS[0]) {
            player.teleport(648, 769);
        } else if (wallObject.id === CAVE_EXITS[1]) {
            player.teleport(638, 777);
        } else if (wallObject.id === CAVE_EXITS[2]) {
            player.teleport(629, 777);
        } else if (wallObject.id === CAVE_EXITS[3]) {
            player.teleport(631, 789);
        } else if (wallObject.id === CAVE_EXITS[4]) {
            player.teleport(624, 807);
        } else if (wallObject.id === CAVE_EXITS[5]) {
            player.teleport(645, 812);
        }
        return true;
    }

    if (wallObject.id === BATTLEMENT) {
        await player.say(
            "What's this ?",
            "The bridge is out - i'll need to find another way in",
            'I can see a ladder up there coming out of a hole',
            'Maybe I should check out some of these tunnels around here...'
        );
        return true;
    }

    if (wallObject.id === SOUTH_WEST_BATTLEMENT) {
        await handleSouthWestBattlement(player);
        return true;
    }

    return false;
}

// onUseWithNPC: give relic / rock cake to the battlement ogre guard
async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== OGRE_GUARD_BATTLEMENT_ID || item.equipped) {
        return false;
    }

    if (item.id === OGRE_RELIC_ID) {
        player.engage(npc);
        await npc.say("It's a relic, what of it ?");
        await player.say('Ow!');
        player.message('@que@The guard gives you a smack around the head');
        await npc.say('Bring me something good next time!');
        player.disengage();
        return true;
    }

    if (item.id === ROCK_CAKE_ID) {
        const ogreGuard = ifNearVisNpc(player, OGRE_GUARD_BATTLEMENT_ID, 5);
        if (player.cache.get_ogre_gift) {
            if (ogreGuard) {
                await cakeCheckGuard(player, ogreGuard);
            }
        } else {
            player.engage(npc);
            await player.say('Why am I giving this cake to this ogre ???');
            player.disengage();
        }
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne,
    onUseWithNPC
};
