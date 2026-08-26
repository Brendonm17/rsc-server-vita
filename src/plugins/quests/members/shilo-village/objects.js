// shilo village quest object interactions

const { questsEnabled } = require('../../custom-gate.js');
const { succeed, hasBeadsEquipped } = require('./utils.js');
const { bumpyDirtHolder } = require('./utils.js');
const {
    SPEC_STONE,
    BUMPY_DIRT,
    PILE_OF_RUBBLE,
    SMASHED_TABLE,
    WET_ROCKS,
    CAVE_SACK,
    ROTTEN_GALLOWS,
    PILE_OF_RUBBLE_TATTERED_SCROLL,
    BRIDGE_BLOCKADE,
    WELL_STACKED_ROCKS,
    TOMB_DOLMEN_HANDHOLDS,
    SEARCH_TREE_FOR_ENTRANCE,
    HILLSIDE_ENTRANCE,
    RASH_EXIT_DOOR,
    METALLIC_DUNGEON_GATE,
    CLIMB_CAVE_ROCKS,
    TOMB_DOORS,
    TATTERED_SCROLL_ID,
    ZADIMUS_CORPSE_ID,
    CRUMPLED_SCROLL_ID,
    STONE_PLAQUE_ID,
    LIT_CANDLE_ID,
    ROPE_ID,
    SPADE_ID,
    BONES_ID,
    BONE_KEY_ID,
    BONE_SHARD_ID,
    CHISEL_ID
} = require('./ids.js');

async function handleOpLoc(player, obj, command) {
    const { world } = player;

    if (obj.id === TOMB_DOORS) {
        if (command === 'Open') {
            if (player.cache.tomb_door_shilo) {
                if (player.y >= 3632) {
                    player.teleport(377, 3631);
                } else {
                    player.teleport(377, 3633);
                }
                return true;
            }
            player.message(
                'This door is completely sealed, it is very ornately carved.'
            );
        } else if (command === 'Search') {
            player.message(
                'The door is ornately carved with depictions of skeletal warriors.'
            );
            await world.sleepTicks(3);
            player.message(
                'You notice that some of the skeletal warriors depictions are not complete.'
            );
            await world.sleepTicks(3);
            player.message(
                'Instead, there are reccesses were some of the bones should be.'
            );
            await world.sleepTicks(3);
            player.message('There are three recesses.');
        }
        return true;
    }

    if (obj.id === CLIMB_CAVE_ROCKS) {
        if (!hasBeadsEquipped(player)) {
            if (obj.y > player.y) {
                player.message(
                    '@red@You simply cannot concentrate enough to climb down the rocks.'
                );
            } else {
                player.message(
                    '@red@You simply cannot concentrate enough to climb up the rocks.'
                );
            }
            return true;
        }
        player.message('You carefully pick your way through the rocks.');
        player.teleport(349, 3618);
        if (succeed(player, 32)) {
            await world.sleepTicks(2);
            if (obj.y === 3619) {
                player.teleport(348, 3616);
                await world.sleepTicks(2);
                player.message('You manage to carefully clamber up.');
            } else {
                player.teleport(348, 3620);
                await world.sleepTicks(2);
                player.message('You manage to carefully clamber down.');
            }
        } else {
            player.message('@red@You fall!');
            await world.sleepTicks(2);
            player.teleport(348, 3620);
            player.message('You take damage!');
            player.damage(3);
            await world.sleepTicks(2);
            await player.say('Ooooff!');
        }
        player.addExperience('agility', 5, true);
        return true;
    }

    if (obj.id === METALLIC_DUNGEON_GATE) {
        if (command === 'Open') {
            if (player.y >= 3616) {
                player.teleport(348, 3614);
                return true;
            }
            player.message('The gates feel unearthly cold to the touch!');
            player.message('Are you sure you want to go through?');
            const menu = await player.ask(
                [
                    'Yes, I am completely fearless!',
                    "Err, I'm having second thoughts now!"
                ],
                true
            );
            if (menu === 0) {
                if (!hasBeadsEquipped(player)) {
                    player.teleport(348, 3616);
                    player.damage(Math.floor(player.skills.hits.current / 2) + 1);
                    if (player.skills.hits.current > 0) {
                        player.message(
                            '@red@You feel invisible hands starting to choke you...'
                        );
                        await world.sleepTicks(3);
                        player.teleport(348, 3614);
                        await world.sleepTicks(2);
                        await player.say('*Cough*', '*Choke*');
                        player.message(
                            '@red@You can barely manage to crawl back through the gates...'
                        );
                        await player.say(
                            '*Cough*',
                            '*Choke*',
                            '*...*',
                            '* Gaaaa....*'
                        );
                    }
                } else {
                    player.teleport(348, 3616);
                    player.message(
                        '@red@The Beads of the dead start to glow...'
                    );
                }
            } else if (menu === 1) {
                player.teleport(348, 3614);
                player.message(
                    'You manage to pull your spineless body away from the ancient gates.'
                );
            }
        } else if (command === 'Search') {
            player.message('There is an ancient symbol on the gate.');
            await world.sleepTicks(3);
            player.message(
                "It looks like a human figure with something around it's neck."
            );
            await world.sleepTicks(3);
            player.message('It looks pretty scary.');
        }
        return true;
    }

    if (obj.id === RASH_EXIT_DOOR) {
        if (!hasBeadsEquipped(player)) {
            player.message(
                '@red@You feel invisible hands starting to choke you...'
            );
            await world.sleepTicks(3);
            player.damage(18);
        }
        if (command === 'Open') {
            player.message('The door seems to be locked!');
            await world.sleepTicks(3);
            await player.say(
                "Oh no, I'm going to be stuck in here forever!",
                'How will I ever get out!',
                "I'm too young to die!"
            );
        } else if (command === 'Search') {
            player.message(
                'You can see a small recepticle, not unlike the one on the opposite side of the door!'
            );
        }
        return true;
    }

    if (obj.id === HILLSIDE_ENTRANCE) {
        if (command === 'Open') {
            player.message('There seems to be some sort of recepticle,');
            await world.sleepTicks(3);
            player.message('perhaps it needs a key?');
            if (
                !player.cache.can_chisel_bone &&
                player.questStages.shiloVillage === 7
            ) {
                player.cache.can_chisel_bone = true;
            }
        } else if (command === 'Search') {
            player.message(
                'Examining the door, you see that it has a very strange lock.'
            );
            await world.sleepTicks(3);
            player.message('Ewww...it seems to be made out of bone!');
            if (
                !player.cache.can_chisel_bone &&
                player.questStages.shiloVillage === 7
            ) {
                player.cache.can_chisel_bone = true;
            }
        }
        return true;
    }

    if (obj.id === SEARCH_TREE_FOR_ENTRANCE) {
        if (player.questStages.shiloVillage === -1) {
            player.message('You find nothing significant.');
            return true;
        }
        player.message('You pull the trees apart...');
        await world.sleepTicks(3);
        player.message(
            '...and reveal an ancient doorway set into the side of the hill!'
        );
        await world.sleepTicks(4);
        return true;
    }

    if (obj.id === TOMB_DOLMEN_HANDHOLDS) {
        player.message(
            'You start to climb up the side of the rock wall using the hand holds'
        );
        await world.sleepTicks(3);
        if (succeed(player, 32)) {
            player.message(
                'You push your way through a cunningly designed trap door..'
            );
            player.teleport(471, 836);
            await world.sleepTicks(1);
            player.message(
                'And appear in bright sunshine and the salty sea air.'
            );
        } else {
            player.message('You get halfway but loose your grip.');
            player.message('You fall back to the floor.');
            await world.sleepTicks(3);
            player.teleport(380, 3692);
            await player.say('Ahhhhh!');
            player.damage(Math.floor(player.skills.hits.current / 10));
            player.message('And it knocks the wind out of you.');
            await world.sleepTicks(3);
            player.damage(Math.floor(player.skills.hits.current / 10));
            player.teleport(467, 3674);
            await player.say('Oooff!');
        }
        return true;
    }

    if (obj.id === WELL_STACKED_ROCKS) {
        if (command === 'Investigate') {
            player.message('Rocks that have been stacked uniformly.');
        } else if (command === 'Search') {
            if (player.questStages.shiloVillage === -1) {
                player.message(
                    'This tomb entrance seems to be completely flooded.'
                );
                player.message(
                    'A great sense of peace pervades in this area.'
                );
            } else if (player.questStages.shiloVillage >= 5) {
                player.message(
                    'You investigate the rocks and find a dank,narrow crawl-way.'
                );
                await world.sleepTicks(3);
                player.message('Do you want to crawl into this dank, dark, narrow,');
                await world.sleepTicks(3);
                player.message('possibly dangerous hole?');
                await world.sleepTicks(3);
                const menu = await player.ask(
                    [
                        'Yes please, I can think of nothing nicer !',
                        'No way could you get me to go in there !'
                    ],
                    true
                );
                if (menu === 0) {
                    player.message(
                        'You contort your body and prepare to squirm, worm like, into the hole.'
                    );
                    if (succeed(player, 32)) {
                        player.message(
                            'You struggle through the narrow crevice in the rocks'
                        );
                        await world.sleepTicks(3);
                        player.teleport(471, 3658);
                        player.message(
                            'and drop to your feet into a narrow underground corridor'
                        );
                        if (player.questStages.shiloVillage === 5) {
                            player.questStages.shiloVillage = 6;
                        }
                    } else {
                        player.message('You managed to get yourself stuck.');
                        await world.sleepTicks(3);
                        player.message(
                            'You have to wrench yourself free to get out.'
                        );
                        await world.sleepTicks(3);
                        player.message(
                            'You manage to pull yourself out, but hurt yourself in the process.'
                        );
                        await world.sleepTicks(3);
                        player.damage(3);
                        player.message('Maybe you\'ll have better luck next time?');
                    }
                } else if (menu === 1) {
                    player.message(
                        'You decide that the surface is the place for you!'
                    );
                }
            } else {
                player.message('You find nothing of significance.');
                player.message('And it does look quite scarey.');
            }
        }
        return true;
    }

    if (obj.id === BRIDGE_BLOCKADE && command === 'Investigate') {
        player.message(
            'Someone has put this here to prevent access to the other side.'
        );
        player.message(
            'The remainder of the bridge looks even more rickety..'
        );
        return true;
    }

    if (obj.id === PILE_OF_RUBBLE_TATTERED_SCROLL) {
        player.message(
            'You can see that there is something hidden behind some of the rocks.'
        );
        await world.sleepTicks(3);
        player.message('Do you want to have a look?');
        await world.sleepTicks(3);
        player.message(
            "It looks a bit dangerous because the ceiling doesn't look safe!"
        );
        const menu = await player.ask(
            [
                "Yes, I'll carefully move the rocks to see what's behind them.",
                "No, I'll leave them, I don't like the look of that ceiling."
            ],
            true
        );
        if (menu === 0) {
            if (player.inventory.has(TATTERED_SCROLL_ID)) {
                player.message(
                    'You see nothing here but an empty book case behind rocks.'
                );
            } else {
                player.message('You start to slowly move the rocks to one side.');
                await world.sleepTicks(3);
                if (succeed(player, 32)) {
                    player.message(
                        'You carefully manage to remove enough rocks to see a book shelf.'
                    );
                    await world.sleepTicks(3);
                    player.message(
                        'You gingerly remove a delicate scroll from the shelf'
                    );
                    await world.sleepTicks(3);
                    player.message('and place it carefully in your inventory.');
                    player.inventory.add(TATTERED_SCROLL_ID);
                    if (!player.cache.obtained_shilo_info) {
                        player.cache.obtained_shilo_info = true;
                    }
                    player.addExperience('agility', 15, true);
                } else {
                    player.message(
                        'You acidently knock some rocks and the ceiling starts to cave in.'
                    );
                    await world.sleepTicks(3);
                    player.message('Some rocks fall on you.');
                    await world.sleepTicks(3);
                    player.damage(Math.floor(player.skills.hits.current * 0.1 + 1));
                    player.addExperience('agility', 5, true);
                }
            }
        } else if (menu === 1) {
            player.message('You decide to leave the rocks well alone.');
            await world.sleepTicks(3);
            player.message('The ceiling does look a little unsafe.');
        }
        return true;
    }

    if (obj.id === ROTTEN_GALLOWS) {
        if (command === 'Look') {
            player.message('You take a look at the Gallows.');
            await world.sleepTicks(3);
            player.message('The gallows look pretty eerie.');
            await world.sleepTicks(3);
            if (
                player.inventory.has(ZADIMUS_CORPSE_ID) ||
                player.questStages.shiloVillage === -1
            ) {
                player.message(
                    'An empty noose swings eerily in the half light of the tomb.'
                );
                await world.sleepTicks(3);
            } else {
                player.message(
                    'A grisly sight meets your eyes. A human corpse hangs from the noose.'
                );
                await world.sleepTicks(3);
                player.message('His hands have been tied behind his back.');
                await world.sleepTicks(3);
            }
        } else if (command === 'Search') {
            player.message('You search the gallows.');
            await world.sleepTicks(3);
            if (
                player.inventory.has(ZADIMUS_CORPSE_ID) ||
                player.questStages.shiloVillage === -1
            ) {
                player.message(
                    'The gallows look pretty eerie. You search but find nothing.'
                );
            } else {
                player.message('You find a human corpse hanging in the noose.');
                await world.sleepTicks(3);
                player.message(
                    'It looks as if the corpse will be removed easily.'
                );
                await world.sleepTicks(3);
                player.message(
                    'Would you like to remove the corpse from the noose?'
                );
                await world.sleepTicks(3);
                const menu = await player.ask(
                    [
                        "I don't think so it might animate and attack me!",
                        'Yes, I may find something else on the corpse'
                    ],
                    true
                );
                if (menu === 0) {
                    player.message(
                        'You move away from the corpse quietly and slowly...'
                    );
                    await world.sleepTicks(3);
                    player.message('...you have an eerie feeling about this!');
                    await world.sleepTicks(3);
                    await player.say('** Gulp! **');
                } else if (menu === 1) {
                    player.message(
                        'You gently support the frame of the skeleton and lift the skull through the noose.'
                    );
                    await world.sleepTicks(3);
                    player.message(
                        'You find an old sack and place the skeleton in this.'
                    );
                    await world.sleepTicks(3);
                    player.message(
                        'Maybe Trufitus can give you some tips on what to do with it.'
                    );
                    await world.sleepTicks(3);
                    player.message(
                        'You sense that there is a spirit that needs to be put to rest.'
                    );
                    await world.sleepTicks(3);
                    player.inventory.add(ZADIMUS_CORPSE_ID);
                    if (!player.cache.obtained_shilo_info) {
                        player.cache.obtained_shilo_info = true;
                    }
                }
            }
        }
        return true;
    }

    if (obj.id === CAVE_SACK) {
        if (player.inventory.has(CRUMPLED_SCROLL_ID)) {
            player.message('You find nothing in the sacks.');
        } else {
            player.message('You find a tattatered, very ornate scroll.');
            player.message('Which you place carefully in your inventory.');
            player.inventory.add(CRUMPLED_SCROLL_ID);
            if (!player.cache.obtained_shilo_info) {
                player.cache.obtained_shilo_info = true;
            }
        }
        return true;
    }

    if (obj.id === WET_ROCKS) {
        player.message('You see a huge waterfall blocking your path.');
        await world.sleepTicks(3);
        player.message(
            'The rocks look quite perilous but you could try scale them.'
        );
        await world.sleepTicks(3);
        player.message(
            'Or maybe you could use something to float through the waterfall?'
        );
        const m = await player.ask(
            [
                "Yes, I'll try to climb out",
                "No, thanks, I'll look for another exit."
            ],
            true
        );
        if (m === 0) {
            player.message(
                'You start searching for handholds in the slippery cave entrance...'
            );
            await world.sleepTicks(3);
            player.teleport(342, 3684);
            if (succeed(player, 32)) {
                player.message('@red@*** YOU FALL ***');
                await world.sleepTicks(3);
                player.message(
                    'You slip into the water and get washed out through the waterfall!'
                );
                await world.sleepTicks(3);
                player.message("You're pumelled as the thrashing water throws");
                await world.sleepTicks(3);
                player.message('you against the rocks...');
                await world.sleepTicks(3);
                player.teleport(339, 808);
                player.message('You are washed onto the waterfall river bank');
                await world.sleepTicks(3);
                player.message('barely alive!');
                player.damage(Math.floor(player.skills.hits.current * 0.2 + 4));
                player.addExperience('agility', 5, true);
            } else {
                player.message(
                    'You manage to work your way along the slippery wall'
                );
                await world.sleepTicks(3);
                player.message('and avoid falling into the water below.');
                await world.sleepTicks(3);
                player.teleport(344, 808);
                player.message('You make it out of the cave');
                await world.sleepTicks(3);
                player.message('and into the warmth of the jungle.');
                player.addExperience('agility', 100, true);
            }
        } else if (m === 1) {
            player.message('You decide to have another look around.');
            await world.sleepTicks(3);
            player.message('And see if you can find a better way to get out.');
        }
        return true;
    }

    if (obj.id === SMASHED_TABLE) {
        if (command === 'Examine') {
            player.message('This table might be useful...');
            await world.sleepTicks(3);
            player.message('with some adjustment');
        } else if (command === 'Craft') {
            player.message('You may be able to turn this delapidated table into ');
            await world.sleepTicks(3);
            player.message(
                'something that could help you to get out of this place.'
            );
            await world.sleepTicks(3);
            player.message('What would you like to try and turn this table into?');
            await world.sleepTicks(3);
            const sub = await player.ask(
                ['A ladder', 'A crude raft', 'A pole vault'],
                true
            );
            if (sub === 0) {
                player.message('Your experience in crafting tells you that');
                await world.sleepTicks(3);
                player.message(
                    "there isn't enough wood to complete this task."
                );
            } else if (sub === 1) {
                // raft ride represented by a teleport sequence
                player.message(
                    'You see that this table already looks very sea worthy'
                );
                await world.sleepTicks(3);
                player.message(
                    'it takes virtually no time at all to help fix it into.'
                );
                await world.sleepTicks(3);
                player.message('a crude raft.');
                await world.sleepTicks(3);
                player.teleport(353, 3669);
                player.message('You place it carefully on the water!');
                await world.sleepTicks(3);
                player.message('You board the raft!');
                await world.sleepTicks(3);
                player.message('You push off!');
                await world.sleepTicks(3);
                player.teleport(357, 3673);
                await player.say('Weeeeeeee!');
                await world.sleepTicks(1);
                player.teleport(356, 3678);
                await world.sleepTicks(2);
                player.teleport(353, 3682);
                await player.say('Weeeeeeee!');
                await world.sleepTicks(1);
                player.teleport(349, 3685);
                await world.sleepTicks(1);
                player.teleport(345, 3686);
                player.message('You come to a huge waterfall...');
                await player.say('* Oh oh! *');
                await world.sleepTicks(1);
                player.teleport(341, 3686);
                player.message('...and plough through it!');
                player.message('The raft soon breaks up.');
                await world.sleepTicks(1);
                player.teleport(341, 810);
            } else if (sub === 2) {
                player.message('You happily start hacking away at the table');
                await world.sleepTicks(3);
                player.message(
                    "But realise that you won't have enough woood to properly finish the item off!"
                );
                await world.sleepTicks(3);
                await player.say(
                    'Oops! Not enough wood left to do anything else with the table!'
                );
                player.message(
                    "There isn't enough wood left in this table to make anything!"
                );
                await world.sleepTicks(3);
            }
        }
        return true;
    }

    if (obj.id === PILE_OF_RUBBLE) {
        player.message(
            'You can see that there is a narrow gap through into darkness.'
        );
        await world.sleepTicks(3);
        player.message(
            'You could try to wriggle through and see where it takes you.'
        );
        await world.sleepTicks(3);
        const menu = await player.ask(
            ["Yes, I'll wriggle through.", "No, I'll stay here."],
            true
        );
        if (menu === 0) {
            player.message('You manage to wriggle through the rubble');
            if (obj.x === 348 && obj.y === 3708) {
                player.teleport(356, 3667);
            } else if (obj.x === 357 && obj.y === 3668) {
                player.teleport(347, 3709);
            }
            player.addExperience('agility', 10, true);
        } else if (menu === 1) {
            player.message('You decide to stay where you are');
        }
        return true;
    }

    if (obj.id === BUMPY_DIRT) {
        if (player.questStages.shiloVillage === -1) {
            player.message('The entrance seems to have caved in.');
        } else if (player.questStages.shiloVillage >= 2) {
            if (player.cache.SV_DIG_BUMP) {
                player.message('You see a small fissure in the granite');
                await world.sleepTicks(3);
                player.message(
                    'that you might just be able to crawl through.'
                );
                await world.sleepTicks(3);
                if (
                    !player.inventory.has(LIT_CANDLE_ID) &&
                    !player.cache.SV_DIG_LIT
                ) {
                    player.message("It's very dark beyond the fissure.");
                }
                await bumpyDirtHolder(player);
                return true;
            }
            if (command === 'Look') {
                player.message('It looks as if something is buried here.');
            } else if (command === 'Search') {
                player.message('It looks as if something is buried here.');
                await world.sleepTicks(3);
                player.message(
                    'It looks quite big, you may need some tools to excavate further.'
                );
            }
        } else {
            player.message('It just looks like some bumpy ground');
        }
        return true;
    }

    if (obj.id === SPEC_STONE) {
        if (command === 'Look Closer') {
            player.message('This stone seems to have strange markings on it');
        } else if (command === 'Investigate') {
            player.message('This stone seems to have strange markings on it');
            await world.sleepTicks(3);
            player.message('Maybe Trufitus can decipher them.');
            await world.sleepTicks(3);
            player.message('The stone is too heavy to carry');
            await world.sleepTicks(3);
            player.message('But the letters stand proud on a plaque');
            await world.sleepTicks(3);
            player.message('Maybe you could seperate the plaque from the rock?');
            await world.sleepTicks(3);
        }
        return true;
    }

    return false;
}

// Command slot 0 (the object's first / left-click action).
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (gameObject.id) {
        case TOMB_DOORS:
        case METALLIC_DUNGEON_GATE:
        case RASH_EXIT_DOOR:
        case HILLSIDE_ENTRANCE:
            return handleOpLoc(player, gameObject, 'Open');
        case WELL_STACKED_ROCKS:
        case BRIDGE_BLOCKADE:
            return handleOpLoc(player, gameObject, 'Investigate');
        case ROTTEN_GALLOWS:
        case BUMPY_DIRT:
            return handleOpLoc(player, gameObject, 'Look');
        case SMASHED_TABLE:
            return handleOpLoc(player, gameObject, 'Examine');
        case SPEC_STONE:
            return handleOpLoc(player, gameObject, 'Look Closer');
        // objects whose slot-0 is a plain walkto/climb regardless of command
        case CLIMB_CAVE_ROCKS:
        case TOMB_DOLMEN_HANDHOLDS:
        case PILE_OF_RUBBLE:
        case PILE_OF_RUBBLE_TATTERED_SCROLL:
        case CAVE_SACK:
        case WET_ROCKS:
        case SEARCH_TREE_FOR_ENTRANCE:
            return handleOpLoc(player, gameObject, '');
        default:
            return false;
    }
}

// Command slot 1 (the object's second action).
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (gameObject.id) {
        case TOMB_DOORS:
        case METALLIC_DUNGEON_GATE:
        case RASH_EXIT_DOOR:
        case HILLSIDE_ENTRANCE:
        case WELL_STACKED_ROCKS:
        case ROTTEN_GALLOWS:
        case BUMPY_DIRT:
        case SEARCH_TREE_FOR_ENTRANCE:
        case PILE_OF_RUBBLE_TATTERED_SCROLL:
        case CAVE_SACK:
        case WET_ROCKS:
            return handleOpLoc(player, gameObject, 'Search');
        case SMASHED_TABLE:
            return handleOpLoc(player, gameObject, 'Craft');
        case SPEC_STONE:
            return handleOpLoc(player, gameObject, 'Investigate');
        case BRIDGE_BLOCKADE:
            return handleOpLoc(player, gameObject, 'Jump');
        case CLIMB_CAVE_ROCKS:
        case TOMB_DOLMEN_HANDHOLDS:
        case PILE_OF_RUBBLE:
            return handleOpLoc(player, gameObject, '');
        default:
            return false;
    }
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    // 3 bones on the Tomb Doors
    if (gameObject.id === TOMB_DOORS && item.id === BONES_ID) {
        if (!player.inventory.has(BONES_ID, 3)) {
            player.message('You do not have enough bones for all the recesses.');
        } else {
            player.inventory.remove(BONES_ID, 3);
            player.message('You fit the bones into the reccesses of the door.');
            await world.sleepTicks(3);
            player.message('The door seems to change slightly.');
            await world.sleepTicks(3);
            player.message(
                'Two depictions of skeletal warriors turn their heads towards you.'
            );
            await world.sleepTicks(3);
            player.message('They are alive!');
            await world.sleepTicks(3);
            player.message('The Skeletons wrench themselves free of the door.');
            await world.sleepTicks(3);
            player.message(
                'Stepping out of the door, with grinning teeth they push the huge doors open.'
            );
            await world.sleepTicks(3);
            player.teleport(377, 3631);
            if (!player.cache.tomb_door_shilo) {
                player.cache.tomb_door_shilo = true;
            }
        }
        return true;
    }

    // bone key on the exit door
    if (gameObject.id === RASH_EXIT_DOOR && item.id === BONE_KEY_ID) {
        if (!hasBeadsEquipped(player)) {
            player.message(
                '@red@You feel invisible hands starting to choke you...'
            );
            await world.sleepTicks(3);
            player.damage(Math.floor(player.skills.hits.current / 2));
        }
        player.message('You insert the key into the lock and it merges with the door.');
        await world.sleepTicks(3);
        player.message('The doors creak open revealing bright day light.');
        await world.sleepTicks(3);
        player.message(
            'You walk outside into the warmth of the Jungle heat.'
        );
        player.teleport(350, 782);
        if (player.cache.tomb_door_shilo) {
            delete player.cache.tomb_door_shilo;
        }
        return true;
    }

    // bone key on the hillside entrance -> enter the tomb (7 -> 8)
    if (gameObject.id === HILLSIDE_ENTRANCE && item.id === BONE_KEY_ID) {
        player.message('You try the key with the lock.');
        await world.sleepTicks(3);
        player.message('As soon as you push the key into the lock.');
        await world.sleepTicks(3);
        await world.sleepTicks(2);
        player.message(
            'A shimmering light dances over the doors, before you can blink, the doors creak open.'
        );
        player.teleport(348, 3611);
        await world.sleepTicks(1);
        player.message('You feel a strange force pulling you inside.');
        await world.sleepTicks(3);
        player.message(
            'The doors close behind you with the sound of crunching bone.'
        );
        await world.sleepTicks(3);
        player.message(
            'Before you stretches a winding tunnel blocked by an ancient gate.'
        );
        await world.sleepTicks(3);
        if (player.questStages.shiloVillage === 7) {
            player.questStages.shiloVillage = 8;
        }
        return true;
    }

    // bone shard on the hillside entrance
    if (gameObject.id === HILLSIDE_ENTRANCE && item.id === BONE_SHARD_ID) {
        player.message('You try to use the bone shard on the lock.');
        await world.sleepTicks(3);
        player.message('Although it isabout the right size,');
        await world.sleepTicks(3);
        player.message(
            "you find that it just doesn't fit the delicate lock mechanism."
        );
        return true;
    }

    // rope on bumpy dirt
    if (gameObject.id === BUMPY_DIRT && item.id === ROPE_ID) {
        if (player.questStages.shiloVillage === -1) {
            player.message('The entrance seems to have caved in.');
        } else if (player.questStages.shiloVillage >= 2) {
            if (!player.cache.SV_DIG_LIT) {
                player.message("It's too dark to see where to attach it.");
            } else if (!player.cache.SV_DIG_ROPE) {
                player.message('You see where to attach the rope very clearly.');
                await world.sleepTicks(3);
                player.message('You secure it well.');
                await world.sleepTicks(3);
                player.message('A rope is already secured there');
                player.cache.SV_DIG_ROPE = true;
                player.inventory.remove(ROPE_ID);
            } else {
                player.message('A rope is already secured there');
            }
        } else {
            player.message('Nothing interesting happens');
        }
        return true;
    }

    // lit candle on bumpy dirt
    if (gameObject.id === BUMPY_DIRT && item.id === LIT_CANDLE_ID) {
        if (player.questStages.shiloVillage === -1) {
            player.message('The entrance seems to have caved in.');
        } else if (player.questStages.shiloVillage >= 2) {
            if (!player.cache.SV_DIG_LIT) {
                player.message('You hold the candle to the fissure and see that');
                await world.sleepTicks(3);
                player.message(
                    'there is quite a large drop after you get through the hole.'
                );
                await world.sleepTicks(3);
                if (!player.inventory.has(ROPE_ID)) {
                    player.message("It's a pity you don't have some rope");
                } else {
                    player.message('Some rope might help here');
                }
                player.cache.SV_DIG_LIT = true;
                player.inventory.remove(LIT_CANDLE_ID);
            } else {
                player.message('The spot is already lit');
            }
        } else {
            player.message('Nothing interesting happens');
        }
        return true;
    }

    // spade on bumpy dirt
    if (gameObject.id === BUMPY_DIRT && item.id === SPADE_ID) {
        if (player.questStages.shiloVillage === -1) {
            player.message('The entrance seems to have caved in.');
        } else if (player.questStages.shiloVillage >= 2) {
            if (!player.cache.SV_DIG_BUMP) {
                player.message(
                    'You dig a small hole and almost immediately hit granite'
                );
                await world.sleepTicks(3);
                player.message(
                    'You excavate the hole a bit more and see that there is a small fissure'
                );
                await world.sleepTicks(3);
                player.message(
                    'that you might just be able to crawl through.'
                );
                await world.sleepTicks(3);
                if (
                    !player.inventory.has(LIT_CANDLE_ID) &&
                    !player.cache.SV_DIG_LIT
                ) {
                    player.message("It's very dark beyond the fissure.");
                }
                player.cache.SV_DIG_BUMP = true;
                await bumpyDirtHolder(player);
            } else {
                player.message('You have already excavated this area.');
                player.message('Your spade clangs against the granite');
            }
        } else {
            player.message('You start digging...');
            await world.sleepTicks(3);
            player.message("But without knowing what you're digging for...");
            await world.sleepTicks(3);
            player.message('you decide to give up.');
        }
        return true;
    }

    // chisel on the special stone -> Stone Plaque
    if (gameObject.id === SPEC_STONE && item.id === CHISEL_ID) {
        player.message('You cleanly cut the plaque of letters away from the rock.');
        await world.sleepTicks(3);
        player.message('You place it carefully into your inventory.');
        await world.sleepTicks(3);
        player.inventory.add(STONE_PLAQUE_ID);
        player.addExperience('crafting', 10, true);
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject
};
