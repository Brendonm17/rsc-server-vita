// Shilo Village - inventory item logic: read/activate/bury, item combos,
// dropping and taking quest artifacts

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const { succeed } = require('./utils.js');
const {
    COINS_ID,
    ZADIMUS_ID,
    RASHILIYIA_ID,
    CAVE_ZOMBIE_ID,
    CAVE_SKELETON_ID,
    ZADIMUS_CORPSE_ID,
    CRUMPLED_SCROLL_ID,
    TATTERED_SCROLL_ID,
    STONE_PLAQUE_ID,
    BONE_SHARD_ID,
    BONE_KEY_ID,
    BONE_BEADS_ID,
    BRONZE_WIRE_ID,
    BEADS_OF_THE_DEAD_ID,
    CHISEL_ID,
    SWORD_POMMEL_ID,
    LOCATING_CRYSTAL_ID,
    BERVIRIUS_TOMB_NOTES_ID,
    RASHILIYA_CORPSE_ID
} = require('./ids.js');

function spawnNpc(player, id, x, y) {
    const { world } = player;
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
    return npc;
}

// bury the corpse; on sacred ground it summons Zadimus and yields the bone shard
async function dropZadimusCorpse(player) {
    const { world } = player;

    player.message('@que@You feel an uneartly compunction to bury this corpse!');
    await world.sleepTicks(3);

    // OpenRSC: player.getLocation().inBounds(445, 749, 449, 753)
    if (
        player.x >= 445 &&
        player.x <= 449 &&
        player.y >= 749 &&
        player.y <= 753
    ) {
        player.message('@que@You hear an unearthly moaning sound as you see');
        await world.sleepTicks(3);
        player.message('@que@an apparition materialises right in front of you.');
        await world.sleepTicks(3);
        const zadimus = spawnNpc(player, ZADIMUS_ID, player.x, player.y);
        await world.sleepTicks(1);
        player.engage(zadimus);
        await zadimus.say(
            'You have released me from my torture, and now I shall aid you'
        );
        await world.sleepTicks(1);
        await zadimus.say(
            'You seek to dispell the one who tortured and killed me'
        );
        await world.sleepTicks(1);
        await zadimus.say('Remember this...');
        await world.sleepTicks(1);
        await zadimus.say("'I am the key, but only kin may approach her.'");
        player.disengage();
        player.message(
            '@que@The apparition disapears into the ground where you buried the corpse.'
        );
        await world.sleepTicks(3);
        world.removeEntity('npcs', zadimus);
        player.message('@que@You see the ground in front of you shake ');
        await world.sleepTicks(3);
        player.message('@que@as a shard of bone forces its way to the surface.');
        await world.sleepTicks(3);
        player.message(
            'You take the bone shard and place it in your inventory.'
        );
        player.inventory.remove(ZADIMUS_CORPSE_ID);
        player.inventory.add(BONE_SHARD_ID);
        if (player.questStages.shiloVillage === 3) {
            player.questStages.shiloVillage = 4;
        }
    } else {
        player.message('@que@You hear a ghostly wailing sound coming from the corpse');
        await world.sleepTicks(3);
        player.message('@que@and a whispering voice says,');
        await world.sleepTicks(3);
        player.message(
            "'@yel@Zadimus: Let me rest in a sacred place and assist you I will'"
        );
    }
}

// onInventoryCommand
async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    switch (item.id) {
        case RASHILIYA_CORPSE_ID:
            player.message('Nothing interesting happens');
            return true;

        case BONE_KEY_ID:
            player.message('The key is intricately carved out of bone.');
            return true;

        case LOCATING_CRYSTAL_ID: {
            player.message(
                '@que@You feel the crystal trying to draw upon your spiritual energy.'
            );
            await world.sleepTicks(3);
            player.message('Do you want to let it.');
            const menu = await player.ask(
                [
                    'Yes, that seems fine.',
                    'No, it sounds a bit dangerous.'
                ],
                true
            );
            if (menu === 0) {
                if (player.skills.prayer.current < 10) {
                    player.message(
                        'You have no spiritual energy that the crystal can draw from.'
                    );
                    await world.sleepTicks(2);
                    player.message(
                        'You need to have at least 10 prayer points for it to work.'
                    );
                    return true;
                }
                const objectX = 351;
                const dx = objectX - player.x;
                if (dx <= 5 && dx >= -5) {
                    player.message('The crystal blazes brilliantly.');
                    player.skills.prayer.current -= 1;
                } else if (dx <= 7 && dx >= -7) {
                    player.message('@yel@The crystal is very bright.');
                    player.skills.prayer.current -= 1;
                } else if (dx <= 10 && dx >= -10) {
                    player.message('@red@The crystal glows brightly');
                    player.skills.prayer.current -= 1;
                } else if (dx <= 20 && dx >= -20) {
                    player.message('The crystal glows feintly');
                    player.skills.prayer.current -= 1;
                } else {
                    player.message('Nothing seems different about the Crystal.');
                    player.skills.prayer.current -= 2;
                }
                if (player.skills.prayer.current < 0) {
                    player.skills.prayer.current = 0;
                }
                player.sendStats && player.sendStats();
            } else if (menu === 1) {
                player.message(
                    'You decide not to allow the crystal to draw spiritual energy from your body.'
                );
            }
            return true;
        }

        case BERVIRIUS_TOMB_NOTES_ID: {
            player.message('This scroll is a collection of writings..');
            await world.sleepTicks(2);
            player.message(
                'Some of them are just scraps of papyrus with what looks like random scribblings.'
            );
            await world.sleepTicks(2);
            player.message('Which would you like to read?');
            await world.sleepTicks(2);
            const menu = await player.ask(
                [
                    'Tattered Yellow papyrus',
                    'Decayed White papyrus',
                    'Crusty Orange papyrus'
                ],
                true
            );
            if (menu >= 0 && !player.cache.read_tomb_notes) {
                player.cache.read_tomb_notes = true;
            }
            if (menu === 0) {
                player.message(
                    '...and rest like your mother who is silent in the peace of her ' +
                        'tomb far to the North of Ah Za Rhoon. Near the sea, and under ' +
                        'the hills deep in the underground to watch all of nature from the ' +
                        'darkness of her final resting place.'
                );
            } else if (menu === 1) {
                player.message(
                    '...Rashiliyia did so love objects of beauty. Her tomb was ' +
                        'adnorned with crystals that glowed brightly when near to each other.'
                );
            } else if (menu === 2) {
                player.message(
                    '...the sphere is activated when power of a spiritual nature is ' +
                        'expended upon it, this can be very draining on the body...'
                );
            }
            return true;
        }

        case BONE_SHARD_ID:
            player.message('The words of Zadimus come back to you.');
            player.message("@yel@'I am the key, but only kin may approach her.'");
            return true;

        case ZADIMUS_CORPSE_ID:
            await dropZadimusCorpse(player);
            return true;

        case CRUMPLED_SCROLL_ID: {
            player.message('@que@This looks like part of a scroll about Rashiliyia');
            await world.sleepTicks(3);
            player.message('Would you like to read it?');
            await world.sleepTicks(3);
            const menu = await player.ask(['Yes please!', 'No thanks.'], true);
            if (menu === 0) {
                player.message(
                    "Rashiliyia's rage went unchecked.",
                    'She killed without mercy for revenge of her sons life.',
                    'Like a spectre through the night she entered houses and one ' +
                        'by one quietly strangled life from the occupants.',
                    'It is said that only a handful survived, protected by necklace wards to keep the Witch Queen at bay.'
                );
            } else if (menu === 1) {
                player.message('You decide to leave the scroll well alone.');
            }
            return true;
        }

        case TATTERED_SCROLL_ID: {
            player.message(
                '@que@This looks like part of a scroll about someone called Berverius..'
            );
            await world.sleepTicks(3);
            player.message('Would you like to read it?');
            const menu = await player.ask(['Yes please.', 'No thanks.'], true);
            if (menu === 0) {
                player.message(
                    'Bervirius, song of King Danthalas, was killed in battle.',
                    'His devout Mother Rashiliyia was so heartbroken that she swore fealty to Zamorak ' +
                        'if he would return her son to her.',
                    'Bervirius returned as an undead creature and terrorized the ' +
                        'King and Queen. Many guards died fighting the Undead ' +
                        'Berverious, eventually the undead Bervirius was set on fire and ' +
                        'soon only the bones remained.',
                    'His remains were taken far to the South, and then towards the ' +
                        'setting sun to a tomb that is surrounded by and level with the ' +
                        'sea. The only remedy for containing the spirits of witches and undead.'
                );
            } else if (menu === 1) {
                player.message(
                    'You decide not to open the scroll but instead put it carefully back into your inventory.'
                );
            }
            return true;
        }

        case STONE_PLAQUE_ID:
            player.message(
                "@que@The markings are very intricate. It's a very strange language."
            );
            await world.sleepTicks(3);
            player.message('@que@The meaning of it evades you though.');
            await world.sleepTicks(3);
            return true;

        default:
            return false;
    }
}

// onUseWithInventory
function isPair(item1, item2, a, b) {
    return (
        (item1.id === a && item2.id === b) ||
        (item1.id === b && item2.id === a)
    );
}

async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    // bone beads + bronze wire -> Beads of the Dead
    if (isPair(item1, item2, BONE_BEADS_ID, BRONZE_WIRE_ID)) {
        if (player.skills.crafting.current < 20) {
            player.message('You need a level of 20 Crafting to craft this.');
            return true;
        }
        player.message('@que@You successfully craft the beads and Bronze Wire ');
        await world.sleepTicks(3);
        player.message(
            "into a necklace which you name, 'Beads of the dead'"
        );
        player.inventory.remove(BRONZE_WIRE_ID);
        player.inventory.remove(BONE_BEADS_ID);
        player.inventory.add(BEADS_OF_THE_DEAD_ID);
        return true;
    }

    // chisel + bone shard -> Bone Key
    if (isPair(item1, item2, CHISEL_ID, BONE_SHARD_ID)) {
        if (player.questStages.shiloVillage === -1) {
            player.message("You're not quite sure what to make with this.");
            return true;
        }
        if (player.cache.can_chisel_bone) {
            if (player.skills.crafting.current < 20) {
                player.message('You need a level of 20 Crafting to craft this.');
                return true;
            }
            player.message("@que@Remembering Zadimus' words and the strange bone lock,");
            await world.sleepTicks(3);
            player.message('@que@you start to craft the bone.');
            await world.sleepTicks(3);
            player.message('You succesfully make a key out of the bone shard.');
            player.inventory.remove(BONE_SHARD_ID);
            player.inventory.add(BONE_KEY_ID);
            player.addExperience('crafting', 35, true);
        } else {
            player.message("You're not quite sure what to make with this.");
            await world.sleepTicks(3);
            player.message(
                'Perhaps it will come to you as you discover more about Rashiliyia?'
            );
        }
        return true;
    }

    // chisel + sword pommel -> Bone Beads
    if (isPair(item1, item2, CHISEL_ID, SWORD_POMMEL_ID)) {
        if (player.skills.crafting.current < 20) {
            player.message('You need a level of 20 Crafting to craft this.');
            return true;
        }
        player.message(
            '@que@You prepare the ivory pommel and the chisel to start crafting...'
        );
        await world.sleepTicks(3);
        player.message('@que@You successfully craft some of the ivory into beads.');
        await world.sleepTicks(3);
        player.message('They may look good as part of a necklace.');
        player.addExperience('crafting', 35, true);
        player.inventory.remove(SWORD_POMMEL_ID);
        player.inventory.add(BONE_BEADS_ID);
        return true;
    }

    return false;
}

// onDropItem
async function onDropItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    switch (item.id) {
        case RASHILIYA_CORPSE_ID: {
            player.message('@que@The remains of Rashiliyia look quite delicate.');
            await world.sleepTicks(3);
            player.message('@que@You sense that a spirit needs to be put to rest.');
            await world.sleepTicks(3);
            player.message('Are you sure that you want to drop the remains ?');
            const menu = await player.ask(
                ['Yes, I am sure.', "No, I'll keep hold of the remains."],
                true
            );
            if (menu === 0) {
                delete player.cache.dolmen_zombie;
                delete player.cache.dolmen_skeleton;
                delete player.cache.dolmen_ghost;
                player.inventory.remove(RASHILIYA_CORPSE_ID);
                player.message('@que@You drop Rashiliyias remains on the ground.');
                await world.sleepTicks(3);
                player.message(
                    '@que@The bones turn to dust and forms into the shape of a human figure.'
                );
                await world.sleepTicks(3);
                const rash = spawnNpc(
                    player,
                    RASHILIYIA_ID,
                    player.x,
                    player.y
                );
                player.message(
                    '@que@The figure turns to you and you hear a cackling, croaky voice on the air.'
                );
                await world.sleepTicks(3);
                player.engage(rash);
                await rash.say(
                    'Many thanks for releasing me!',
                    'Please excuse me, I must attend to my plans!'
                );
                player.disengage();
                world.removeEntity('npcs', rash);
                player.message(
                    'The figure turns and soars away quickly disapearing into the distance.'
                );
            } else if (menu === 1) {
                player.message('You decide to keep hold of Rashiliyias remains.');
            }
            return true;
        }

        case BEADS_OF_THE_DEAD_ID: {
            player.message('@que@Are you sure you want to drop the Beads of the Dead?');
            await world.sleepTicks(3);
            player.message('It looks very rare and unique.');
            const menu = await player.ask(
                ["Yes, I'm sure.", "Nope, I've had second thoughts."],
                true
            );
            if (menu === 0) {
                player.message('@que@As the necklace hits the floor, it disintigrates');
                await world.sleepTicks(3);
                player.message('@que@into a puff of white powder.');
                await world.sleepTicks(3);
                player.message(
                    'and you start to wonder if it ever really existed?'
                );
                player.inventory.remove(BEADS_OF_THE_DEAD_ID);
            } else if (menu === 1) {
                player.message('You decide not to drop the Beads of the Dead.');
            }
            return true;
        }

        case BONE_BEADS_ID:
            player.message('@que@As the beads hit the floor, they disintegrate into');
            await world.sleepTicks(3);
            player.message('puffs of white powder.');
            player.inventory.remove(BONE_BEADS_ID);
            return true;

        case BERVIRIUS_TOMB_NOTES_ID:
            player.message(
                'As you drop the delicate scrolls onto the floor, they'
            );
            player.message('disintegrate immediately.');
            if (!player.cache.dropped_writing) {
                player.cache.dropped_writing = true;
            }
            player.inventory.remove(BERVIRIUS_TOMB_NOTES_ID);
            return true;

        case LOCATING_CRYSTAL_ID: {
            player.message('@que@Are you sure you want to drop this crystal?');
            player.message('It looks very delicate and it may break.');
            const menu = await player.ask(
                ['Yes, I am sure.', "No, I've reconsidered, I'll keep it!"],
                true
            );
            if (menu === 0) {
                player.message(
                    '@que@As you drop the cystal, it hits a rock and explodes.'
                );
                await world.sleepTicks(3);
                player.message('You are lascerated by shards of glass.');
                player.damage(10);
                player.inventory.remove(LOCATING_CRYSTAL_ID);
            } else if (menu === 1) {
                player.message('You decide to keep the Locating Crystal ');
                player.message('tucked into your inventory safe and sound.');
            }
            return true;
        }

        case SWORD_POMMEL_ID:
            player.message('@que@You drop the sword pommel on the floor.');
            await world.sleepTicks(3);
            player.message('It turns to dust as soon as it hits the ground.');
            player.inventory.remove(SWORD_POMMEL_ID);
            return true;

        case BONE_KEY_ID:
            player.message('This looks quite valuable.');
            player.message('As you go to throw the item away');
            player.message("Zadimus' words come to you again.");
            player.message(
                "@yel@'I am the key, but only kin may approach her'"
            );
            return true;

        case BONE_SHARD_ID:
            player.message('You cannot bring yourself to drop this item.');
            player.message(
                'You remember the words that Zadimus said when he appeared'
            );
            player.message('in front of you.');
            player.message("@yel@'I am the key, but only kin may approach her.");
            return true;

        case CRUMPLED_SCROLL_ID: {
            player.message(
                'This looks quite important, are you sure you want to drop it?'
            );
            const menu = await player.ask(
                ["Yes, I'm sure.", "No, I think I'll keep it."],
                true
            );
            if (menu === 0) {
                player.message(
                    'As you drop the item, it gets carried off by the wind.'
                );
                player.message('never to be seen again.');
                player.inventory.remove(CRUMPLED_SCROLL_ID);
            } else if (menu === 1) {
                player.message('You decide against throwing the item away.');
            }
            return true;
        }

        case TATTERED_SCROLL_ID: {
            player.message(
                'This looks quite important, are you sure you want to drop it?'
            );
            const menu = await player.ask(
                ["Yes, I'm sure.", "No, I think I'll keep it."],
                true
            );
            if (menu === 0) {
                player.message('You decide to throw the item away.');
                player.message(
                    'As you drop the item, it falls down a narrow crevice.'
                );
                player.message('never to be seen again.');
                player.inventory.remove(TATTERED_SCROLL_ID);
            } else if (menu === 1) {
                player.message('You decide against throwing the item away.');
            }
            return true;
        }

        case ZADIMUS_CORPSE_ID:
            await dropZadimusCorpse(player);
            return true;

        case STONE_PLAQUE_ID: {
            player.message(
                'This looks quite important, are you sure you want to drop it?'
            );
            const menu = await player.ask(
                ["Yes, I'm sure.", "No, I think I'll keep it."],
                true
            );
            if (menu === 0) {
                player.message('As you drop the item, it bounces into a stream.');
                player.message('never to be seen again.');
                player.inventory.remove(STONE_PLAQUE_ID);
            } else if (menu === 1) {
                player.message('You decide against throwing the item away.');
            }
            return true;
        }

        default:
            return false;
    }
}

// onGroundItemTake: the cursed coins at 358,3626
async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        groundItem.id !== COINS_ID ||
        groundItem.x !== 358 ||
        groundItem.y !== 3626
    ) {
        return false;
    }

    const { world } = player;

    if (player.cache.coins_shilo_cave) {
        world.removeEntity('groundItems', groundItem);
        player.inventory.add(COINS_ID, 10);
        player.message('The coins turn to dust in your hand...');
    } else {
        player.message('@que@As soon as you touch the coins...');
        await world.sleepTicks(3);
        player.message('@que@You hear the grinding sound of bones');
        await world.sleepTicks(3);
        player.message('against stone as you see skeletons and ');
        await world.sleepTicks(2);
        player.message('Zombies rising up out of the ground.');
        spawnNpc(player, CAVE_ZOMBIE_ID, player.x - 1, player.y + 1);
        spawnNpc(player, CAVE_ZOMBIE_ID, player.x - 1, player.y - 1);
        spawnNpc(player, CAVE_SKELETON_ID, player.x + 2, player.y + 1);
        spawnNpc(player, CAVE_SKELETON_ID, player.x + 1, player.y - 1);
        player.message('The coins turn to dust in your hands.');
        player.cache.coins_shilo_cave = true;
    }

    return true;
}

module.exports = {
    onInventoryCommand,
    onUseWithInventory,
    onDropItem,
    onGroundItemTake
};
