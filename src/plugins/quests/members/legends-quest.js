// Legends Quest (members). aggregates every legends NPC, object, and obstacle
// handler plus the Jungle Forester (bull-roarer / Kharazi intro).
//
// questStages.legendsQuest:
//   0 = not started
//   1 = started (Radimus Erkle), attracted Gujuo's attention
//   2 = sent to the caves; met Ungadulu at the flame wall
//   3 = doused the octagram flames; first Book of Binding fight available
//   4 = defeated Nezikchened (1st); Ungadulu freed
//   5 = germinated Yommi seeds
//   6 = probed the dried-up sacred pool with the cut reed
//   7 = seeking the spring source (Viyeldi caves / Echned / 2nd Nezikchened)
//   8 = got sacred water, killed the spirit; replacing the evil totem (3rd fight)
//   9 = killed Nezikchened (3rd); replaced the evil totem
//   10 = Gujuo rewards the Gilded Totem Pole
//   11 = totem handed to Radimus; awaiting the reward conversation
//   -1 = completed (Cape of Legends + 4 QP + choose-4-skills reward)
//
// deviations: box scrolls are shown as chat lines (no box packet); flame-wall
// crossings teleport between anchor tiles; the RUT wall object (206) is omitted.
// jungle-potion herbs and gold-ore mining are handled by their own plugins.

const NPC = require('../../../model/npc');
const { questsEnabled } = require('../custom-gate.js');
const { checkAndRemoveRunes } = require('../../../packet-handlers/spell');
const { pickaxes: MINING_PICKAXES } = require('@2003scape/rsc-data/skills/mining');
// the ruined-wall jump reuses shilo-village's succeed roll.
const { succeed: shiloVillageSucceed } = require('./shilo-village/utils.js');
// Radimus is shared with Combat Odyssey; the onTalkToNPC case defers to it once
// the quest is complete.

// NPC ids (resolved by name)
const GUJUO_ID = 764;
const UNGADULU_ID = 766;
const EVIL_UNGADULU_ID = 767;
const NEZIKCHENED_ID = 769;
const ECHNED_ZEKIN_ID = 740;
const VIYELDI_ID = 772;
const IRVIG_SENAY_ID = 761;
const SAN_TOJALON_ID = 663;
const RANALPH_DEVERE_ID = 762;
const LEGENDS_GUILD_GUARD_ID = 736;
const RADIMUS_ERKLE_ID = 735; // Sir Radimus Erkle (quest start + completion)
const JUNGLE_FORESTER_ID = 765;
// Legends Guild shopkeepers.
const FIONELLA_ID = 788;
const SIEGFRIED_ERKLE_ID = 779;

// rsc-data shop names; stock and multipliers already match.
const FIONELLA_SHOP = 'legends-guild-general';
const SIEGFRIED_SHOP = 'legends-guild';

// item ids (resolved by name)
const CAPE_OF_LEGENDS_ID = 1288;
const GILDED_TOTEM_POLE_ID = 1265;
const TOTEM_POLE_ID = 1183;
const YOMMI_TREE_SEED_ID = 1182;
const GERMINATED_YOMMI_TREE_SEED_ID = 1254;
const GOLDEN_BOWL_ID = 1188;
const GOLDEN_BOWL_WITH_PURE_WATER_ID = 1189;
const GOLDEN_BOWL_WITH_PLAIN_WATER_ID = 1287;
const BLESSED_GOLDEN_BOWL_ID = 1266;
const BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID = 1267;
const BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID = 1286;
const ROUGH_SKETCH_OF_A_BOWL_ID = 1246;
const MAGICAL_FIRE_PASS_ID = 1250;
const BOOKING_OF_BINDING_ID = 1238;
const DARK_DAGGER_ID = 1255;
const GLOWING_DARK_DAGGER_ID = 1256;
const HOLY_FORCE_SPELL_ID = 1257;
const A_LUMP_OF_CRYSTAL_ID = 1220;
const A_CHUNK_OF_CRYSTAL_ID = 1219;
const A_HUNK_OF_CRYSTAL_ID = 1221;
const A_RED_CRYSTAL_ID = 1222;
const A_GLOWING_RED_CRYSTAL_ID = 1231;
const A_BLUE_WIZARDS_HAT_ID = 1264;
const ASHES_ID = 181;
const BULL_ROARER_ID = 1177;
const RADIMUS_SCROLLS_ID = 1163; // "Radimus Scrolls" (blank mission briefing)
const RADIMUS_SCROLLS_COMPLETE_ID = 1233; // "Radimus Scrolls" (completed map)
const MACHETE_ID = 1172;
const CUT_REED_PLANT_ID = 1249;
const PAPYRUS_ID = 982;
const CHARCOAL_ID = 983; // "A lump of Charcoal"

// object ids
const LEGENDS_HALL_DOOR = 1080; // OpenRSC LEGENDS_HALL_DOOR
const MITHRIL_GATES = 1079; // OpenRSC MITHRIL_GATES
// ids below reuse existing rsc-data defs (no new ids below 1296).
const RADIMUS_DESK = 1177; // "Grand Viziers Desk", knock on table (517,546)
const RADIMUS_CUPBOARD = 1149; // "cupboard" holding the Machette (515,543)
const TALL_REEDS = 1163; // (416-418,888-891), cut with machette -> reed plant
const SHALLOW_WATER = 582; // (417,889), use cut reed plant here -> pure water
const YOMMI_TREE_SAPLING = 1107; // "Yommi Tree" (planted, growing)
const YOMMI_TREE_GROWN = 1108; // "Grown Yommi Tree"
const YOMMI_TREE_CHOPPED = 1109; // "Chopped Yommi Tree"
const YOMMI_TREE_TRIMMED = 1110; // "Trimmed Yommi Tree" (trunk, ready to carve)
const YOMMI_TOTEM_CARVED = 1111; // "Totem Pole" (freshly carved, Lift command)
const YOMMI_TREE_DEAD = 1141; // "Dead Yommi Tree" (died from lack of water)
const BABY_YOMMI_TREE = 1112; // "Baby Yommi Tree" (freshly buried seed)
const YOMMI_TREE_ROTTEN = 1172; // "Rotten Yommi Tree" (grown too long)
const LOGS_ID = 14; // chopping a dead/rotten trunk yields these
const FERTILE_EARTH = 1113; // 11 placements across the jungle (878-908)
const EVIL_TOTEM_POLE = 1169; // 3 placements (395,896)/(463,889)/(367,888)
const GOOD_TOTEM_POLE = 1170; // "Totem Pole" (totemtreegood) replacement model
const BOULDER_ROCK = 1116; // "Rocks - Move" (414,3725)/(424,3723)/(411,3737)
const RUNE_AXE_ID = 405; // @2003scape/rsc-data/skills/woodcutting axes table
// the octagram flame-wall ring (450-457,3703-3712).
const FLAME_WALL_ID = 210; // "flamewall", Touch/Investigate

// deep-caves object ids
const SURFACE_CREVICE_ROCK = 1151; // the rock triangle (452,872)/(451,873)/(453,873)
const CAVE_EXIT_TO_SURFACE = 1158; // (462,3699), crawl out to (452,874)
const CAVE_ENTRANCE_SMALL = 1159; // (446,3698), clamber in to (452,3702)
const ANCIENT_WOODEN_DOORS = 1160; // (441,3702)
const HEAVY_METAL_GATE = 1033; // (440,3718)
const DARK_METAL_GATE = 1165; // (474,3715)/(474,3719)
const SMASH_BOULDERS = [1117, 1184, 1185]; // (441,3705)/(440,3709)/(440,3713)
const SMASHED_ROCKS = 1143; // temporary smashed-boulder state
const OPEN_DOORS = 497; // temporary open state for the wooden doors
const OPEN_GATE = 181; // temporary open state for the heavy metal gate
const HALF_BURIED_REMAINS = 1168; // (462,3739)
const CAVERN_CRATE = 1144; // (462,3703), Scribbled notes
const CAVERN_CRUDE_BED = 1162; // (460,3705), Scatched notes
const CAVERN_CRUDE_DESK = 1032; // (452,3708), Shamans Tome
const CAVERN_TABLE = 1161; // (458,3702), Scrawled notes
const CAVERN_BOOKCASE = 931; // (450,3702), hole through to (444,3699)
const WOODEN_BEAM = 1156; // (471,3708)
const ROPE_DOWN_BEAM = 1157; // the beam with a rope attached
const ROPE_UP = 1167; // (427,3707), climb back out to (471,3707)
const CARVED_ROCK = 1037; // the 7 gem rocks (460-474, 3722-3739)
const RED_EYE_ROCK = 1148; // (399,3710)
const ANCIENT_LAVA_FURNACE = 1146; // (388,3701)
const CAVERNOUS_OPENING = 1145; // (394,3726)/(394,3732)
const ROCK_HEWN_STAIRS = [1114, 1123, 1124, 1125]; // CaveAgility stairs 1-4
const ROCKY_WALKWAYS = [558, 559, 560, 561]; // CaveAgility walkways
const RUINED_WALL_ID = 211; // wall object (456,3728), agility jump
const ANCIENT_WALL_ID = 212; // wall objects (464,3721)/(466,3723), SMELL door

// deep-caves item ids
const LOCKPICK_ID = 714;
const ROPE_ID = 237;
const SHAMANS_TOME_ID = 1244;
const SCRIBBLED_NOTES_ID = 1241;
const SCRAWLED_NOTES_ID = 1242;
const SCATCHED_NOTES_ID = 1243;
const EMPTY_VIAL_ID = 465;
const ENCHANTED_VIAL_ID = 1240;
const VIAL_ID = 464; // water-filled "dud" vial (poured from an empty vial)
const HOLY_WATER_VIAL_ID = 1239;
const SOUL_RUNE_ID = 825;
const MIND_RUNE_ID = 35;
const EARTH_RUNE_ID = 34;
const LAW_RUNE_ID = 42;
// runes the ancient wall rejects (burn the player) when out of order
const ANCIENT_WALL_WRONG_RUNES = new Set([
    33, // Air-Rune
    31, // Fire-Rune
    619, // Blood-Rune
    32, // Water-Rune
    46, // Cosmic-Rune
    40, // Nature-Rune
    38, // Death-Rune
    36, // Body-Rune
    37, // Life-Rune
    41 // Chaos-Rune
]);
const PICKAXE_IDS = Object.keys(MINING_PICKAXES).map(Number);
// charge water/earth/fire/air orb spell indexes
const CHARGE_ORB_SPELL_IDS = new Set([29, 36, 38, 40]);

// carved-rock gem puzzle: attach order 1-7; rockName is the OpLoc display name,
// gemName the item name.
const GEM_ROCKS = [
    { mode: 1, gemId: 894, x: 471, y: 3722, rockName: 'Opal', gemName: 'Opal' },
    { mode: 2, gemId: 163, x: 474, y: 3730, rockName: 'Emerald', gemName: 'emerald' },
    { mode: 3, gemId: 162, x: 471, y: 3734, rockName: 'Ruby', gemName: 'ruby' },
    { mode: 4, gemId: 161, x: 466, y: 3739, rockName: 'Diamond', gemName: 'diamond' },
    { mode: 5, gemId: 164, x: 460, y: 3737, rockName: 'Sapphire', gemName: 'sapphire' },
    { mode: 6, gemId: 892, x: 464, y: 3730, rockName: 'Topaz', gemName: 'Red Topaz' },
    { mode: 7, gemId: 893, x: 469, y: 3728, rockName: 'Jade', gemName: 'Jade' }
];
// furnace crystal segments -> their OpenRSC cache keys
const FURNACE_CRYSTAL_KEYS = {
    [A_CHUNK_OF_CRYSTAL_ID]: 'a_chunk_of_crystal',
    [A_LUMP_OF_CRYSTAL_ID]: 'a_lump_of_crystal',
    [A_HUNK_OF_CRYSTAL_ID]: 'a_hunk_of_crystal'
};

const LEGENDS_QUEST = 'legendsQuest';

// helpers

// ask the player to pick; sendOver auto-says the choice.
function ask(player, options, sendOver = true) {
    return player.ask(options, sendOver);
}

// true if the player carries an un-noted item of this id.
function has(player, id) {
    return player.inventory.has(id);
}

function stageIn(player, ...stages) {
    return stages.includes(player.questStages[LEGENDS_QUEST]);
}

function getStage(player) {
    return player.questStages[LEGENDS_QUEST] || 0;
}

function setStage(player, stage) {
    player.questStages[LEGENDS_QUEST] = stage;
}

// OpenRSC DataConversions.random(low, high) inclusive.
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// current (possibly-drained) skill level.
function currentLevel(player, skill) {
    return player.skills[skill].current;
}

// trained/base skill level.
function maxStat(player, skill) {
    return player.skills[skill].base;
}

// set a skill's current level (clamped >= 0) and refresh the client.
function setCurrentLevel(player, skill, level) {
    player.skills[skill].current = Math.max(0, level);
    player.sendStats();
}

// location predicates.
function inBounds(player, minX, minY, maxX, maxY) {
    return (
        player.x >= minX &&
        player.x <= maxX &&
        player.y >= minY &&
        player.y <= maxY
    );
}
function isInsideFlameWall(player) {
    return inBounds(player, 450, 3704, 455, 3711);
}
function isAroundBoulderRock(player) {
    return (
        inBounds(player, 404, 3730, 418, 3744) ||
        inBounds(player, 407, 3718, 421, 3732) ||
        inBounds(player, 417, 3716, 431, 3730)
    );
}
function isAroundTotemPole(player) {
    return (
        inBounds(player, 360, 881, 374, 895) ||
        inBounds(player, 388, 889, 402, 903) ||
        inBounds(player, 456, 882, 470, 896)
    );
}

// success roll based on level over the requirement.
function failCalculation(player, skill, reqLevel) {
    const levelDiff = currentLevel(player, skill) - reqLevel;
    if (levelDiff < 0) {
        return false;
    }
    if (levelDiff >= 20) {
        return true;
    }
    return random(0, levelDiff + 1) !== 0;
}

// spawn a temporary (non-respawning) NPC for a scripted fight/scene.
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

// swap an npc's id by replacing it with a fresh entity at the same tile (an
// in-place id change is invisible to a watching client).
function changeNpc(player, npc, id) {
    const { x, y } = npc;
    player.world.removeEntity('npcs', npc);
    return spawnNpc(player, id, x, y);
}

// guild guard: quest gate npc + mithril gates (1079).

const GG = {
    WHAT_IS_THIS_PLACE: 0,
    HOW_DO_I_GET_IN_HERE: 1,
    CAN_I_SPEAK_TO_SOMEONE_IN_CHARGE: 2,
    ITS_OK_THANKS: 3,
    CAN_I_GO_ON_THE_QUEST: 4,
    WHAT_KIND_OF_QUEST_IS_IT: 5,
    WHO_IS_GRAND_VIZIER_ERKLE: 6,
    LIKE_TO_TALK_TO_GVE: 7
};

// step through the mithril gate at (512,550) by teleporting the player past it.
async function openGates(player) {
    player.teleport(513, 549);
}

// OpenRSC LegendsQuestGuildGuardCanIGoOnTheQuest requirement check.
function eligibleForQuest(player) {
    return (
        player.questPoints >= 107 &&
        player.questStages.herosQuest === -1 &&
        player.questStages.familyCrest === -1 &&
        player.questStages.shiloVillage === -1 &&
        player.questStages.undergroundPass === -1 &&
        player.questStages.waterfallQuest === -1
    );
}

async function guildGuardDialogue(player, npc, cID) {
    const { world } = player;
    if (npc.id !== LEGENDS_GUILD_GUARD_ID) {
        return;
    }

    if (cID === -1) {
        switch (getStage(player)) {
            case 0:
            case undefined: {
                await npc.say(
                    player.isMale()
                        ? 'Yes Sir, how can I help you?'
                        : "Yes Ma'am, how can I help you?"
                );
                const menu = await ask(player, [
                    'What is this place?',
                    'How do I get in here?',
                    'Can I speak to someone in charge?',
                    "It's Ok thanks."
                ]);
                if (menu === 0) {
                    await guildGuardDialogue(player, npc, GG.WHAT_IS_THIS_PLACE);
                } else if (menu === 1) {
                    await guildGuardDialogue(player, npc, GG.HOW_DO_I_GET_IN_HERE);
                } else if (menu === 2) {
                    await guildGuardDialogue(
                        player,
                        npc,
                        GG.CAN_I_SPEAK_TO_SOMEONE_IN_CHARGE
                    );
                } else if (menu === 3) {
                    await guildGuardDialogue(player, npc, GG.ITS_OK_THANKS);
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
            case 8:
            case 9:
            case 10:
                player.message('A guard nods at you as you walk past.');
                await npc.say(
                    player.isMale()
                        ? 'Hope the quest is going well Sir !'
                        : "Hope the quest is going well Ma'am !"
                );
                break;
            case 11:
            case -1:
                player.message('The guards Salute you as you walk past.');
                await npc.say(
                    '! ! ! Attention ! ! !',
                    'Legends Guild Member Approaching'
                );
                await openGates(player);
                break;
        }
    }

    switch (cID) {
        case GG.WHAT_IS_THIS_PLACE: {
            await npc.say(
                player.isMale()
                    ? 'This is the Legends Guild sir !'
                    : 'This is the Legends Guild Maaam !',
                'Legendary RuneScape citizens are invited on a quest',
                'in order to become members of the guild.'
            );
            const opt = await ask(player, [
                'Can I go on the quest?',
                'What kind of quest is it?'
            ]);
            if (opt === 0) {
                await guildGuardDialogue(player, npc, GG.CAN_I_GO_ON_THE_QUEST);
            } else if (opt === 1) {
                await guildGuardDialogue(
                    player,
                    npc,
                    GG.WHAT_KIND_OF_QUEST_IS_IT
                );
            }
            break;
        }
        case GG.HOW_DO_I_GET_IN_HERE: {
            await npc.say(
                player.isMale() ? 'Well sir,' : "Well Ma'am, ",
                "you'll need to be a legendary citizen of RuneScape.",
                'If you want to use the Legends Hall, ',
                "you'll be invited to complete a quest.",
                'Once you have completed that Quest,',
                "you'll be a fully fledged member of the Guild."
            );
            const opt2 = await ask(player, [
                'What is this place?',
                'Can I speak to someone in charge?',
                'Can I go on the quest?'
            ]);
            if (opt2 === 0) {
                await guildGuardDialogue(player, npc, GG.WHAT_IS_THIS_PLACE);
            } else if (opt2 === 1) {
                await guildGuardDialogue(
                    player,
                    npc,
                    GG.CAN_I_SPEAK_TO_SOMEONE_IN_CHARGE
                );
            } else if (opt2 === 2) {
                await guildGuardDialogue(player, npc, GG.CAN_I_GO_ON_THE_QUEST);
            }
            break;
        }
        case GG.CAN_I_SPEAK_TO_SOMEONE_IN_CHARGE: {
            await npc.say(
                player.isMale() ? 'Well, Sir,' : "Well, Ma'am,",
                'Radimus Erkle is the Grand Vizier of the Legends Guild.',
                "He's a very busy man.",
                "And he'll only talk to those people eligible for the quest."
            );
            const opt3 = await ask(player, [
                'Can I go on the quest?',
                'What kind of quest is it?'
            ]);
            if (opt3 === 0) {
                await guildGuardDialogue(player, npc, GG.CAN_I_GO_ON_THE_QUEST);
            } else if (opt3 === 1) {
                await guildGuardDialogue(
                    player,
                    npc,
                    GG.WHAT_KIND_OF_QUEST_IS_IT
                );
            }
            break;
        }
        case GG.ITS_OK_THANKS:
            await npc.say(
                player.isMale() ? 'Very well Sir !' : "Very well Ma'am !"
            );
            break;
        case GG.CAN_I_GO_ON_THE_QUEST: {
            player.message(
                '@que@The guard gets out a scroll of paper and starts looking through it.'
            );
            await world.sleepTicks(3);
            if (eligibleForQuest(player)) {
                await npc.say(
                    'Well, it looks as if you are eligable for the quest.',
                    'Grand Vizier Erkle will give you the details about the quest.',
                    'You can go and talk to him about it if you like?'
                );
                const opt4 = await ask(player, [
                    'Who is Grand Vizier Erkle?',
                    "Yes, I'd like to talk to Grand Vizier Erkle.",
                    'Some other time perhaps.'
                ]);
                if (opt4 === 0) {
                    await guildGuardDialogue(
                        player,
                        npc,
                        GG.WHO_IS_GRAND_VIZIER_ERKLE
                    );
                } else if (opt4 === 1) {
                    await guildGuardDialogue(player, npc, GG.LIKE_TO_TALK_TO_GVE);
                }
            } else {
                await npc.say(
                    "I'm very sorry,",
                    'But you need to complete more quests before you qualify.',
                    'You also need to have 107 quest points.'
                );
                const denyMenu = await ask(player, [
                    'Which quests do I need to complete?',
                    'Ok thanks.'
                ]);
                if (denyMenu === 0) {
                    await npc.say('You need to complete the...');
                    if (player.questStages.herosQuest !== -1) {
                        await npc.say("Hero's Quest.");
                    }
                    if (player.questStages.familyCrest !== -1) {
                        await npc.say('Family Crest Quest.');
                    }
                    if (player.questStages.shiloVillage !== -1) {
                        await npc.say('Shilo Village Quest.');
                    }
                    if (player.questStages.undergroundPass !== -1) {
                        await npc.say('Underground Pass Quest.');
                    }
                    if (player.questStages.waterfallQuest !== -1) {
                        await npc.say('Waterfall Quest.');
                    }
                    if (player.questPoints < 107) {
                        await npc.say(
                            'You also need to have 107 Quest Points as well!'
                        );
                    }
                    await npc.say(
                        "They don't call it the Legends Guild for nothing you know!",
                        'Best of luck if you intend to become a member!'
                    );
                } else if (denyMenu === 1) {
                    await npc.say(
                        "That's no problem...",
                        'Best of luck if you intend to become a member!'
                    );
                }
            }
            break;
        }
        case GG.WHAT_KIND_OF_QUEST_IS_IT: {
            await npc.say(
                player.isMale()
                    ? "Well, to be honest Sir, I'm not really sure."
                    : "Well, to be honest Ma'am, I'm not really sure.",
                "You'll need to talk to Grand Vizier Erkle to find that out."
            );
            const opt4 = await ask(
                player,
                ['Can I go on the quest?', 'Thanks for your help.'],
                false
            );
            if (opt4 === 0) {
                await player.say('Can I go on the quest?');
                await guildGuardDialogue(player, npc, GG.CAN_I_GO_ON_THE_QUEST);
            } else if (opt4 === 1) {
                await player.say('Thanks for your help');
                await npc.say("You're welcome..");
                player.message('The Guard marches off on patrol again.');
            }
            break;
        }
        case GG.WHO_IS_GRAND_VIZIER_ERKLE: {
            await npc.say(
                'He is the head of the Legends Guild.',
                'His full name is Radimus Erkle.',
                'Would you like to talk to him about the quest?'
            );
            const opt5 = await ask(
                player,
                [
                    "Yes, I'd like to talk to Grand Vizier Erkle.",
                    'Some other time perhaps.'
                ],
                false
            );
            if (opt5 === 0) {
                await player.say("Yes, I'd like to talk to Grand Vizier Erkle.");
                await guildGuardDialogue(player, npc, GG.LIKE_TO_TALK_TO_GVE);
            } else if (opt5 === 1) {
                await player.say('Some other time perhaps');
            }
            break;
        }
        case GG.LIKE_TO_TALK_TO_GVE:
            await npc.say(
                'Ok, very well...',
                "You need  to go into the building on the left, he's in his study."
            );
            player.message('The guard unlocks the gate and opens it for you.');
            await npc.say('Good Luck!');
            await openGates(player);
            break;
    }
}

// OpenRSC onOpLoc(MITHRIL_GATES): "open" (slot 0) / "Search" (slot 1)
async function mithrilGatesOpLoc(player, obj, command) {
    const { world } = player;
    if (command === 'open') {
        if (player.y <= 550) {
            // already inside, step back out
            player.teleport(513, 552);
            return true;
        }
        // find a nearby guard to speak / greet
        const guard = [...world.npcs.getInArea(player.x, player.y, 5)].find(
            (n) => n.id === LEGENDS_GUILD_GUARD_ID
        );
        switch (getStage(player)) {
            case 0:
            case undefined:
                if (guard) {
                    player.message('@que@A nearby guard approaches you...');
                    await world.sleepTicks(2);
                    player.engage(guard);
                    await guildGuardDialogue(player, guard, -1);
                    player.disengage();
                } else {
                    player.message('The guards is currently busy.');
                }
                break;
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
                if (guard) {
                    player.message('A guard nods at you as you walk past.');
                    await guard.say(
                        player.isMale()
                            ? 'Hope the quest is going well Sir !'
                            : "Hope the quest is going well Ma'am !"
                    );
                }
                await openGates(player);
                break;
            case 11:
            case -1:
                if (guard) {
                    player.message('The guards Salute you as you walk past.');
                    await guard.say(
                        '! ! ! Attention ! ! !',
                        'Legends Guild Member Approaching'
                    );
                }
                await openGates(player);
                break;
        }
        return true;
    }
    if (command === 'Search') {
        player.message(
            '@que@The gates to the Legends Guild are made from wrought Mithril.'
        );
        await world.sleepTicks(2);
        player.message(
            '@que@A small path leads away up to a very grandiose building.'
        );
        await world.sleepTicks(2);
        player.message(
            '@que@To the left is a smaller out building, but it is no less impressive.'
        );
        await world.sleepTicks(2);
        player.message(
            '@que@All the buildings are set in wonderfully landscaped gardens.'
        );
        await world.sleepTicks(2);
        player.message(
            'Two well dressed guards seem to be guarding the gate.'
        );
        return true;
    }
    return false;
}

// the Legends Hall Doors (1080).
async function legendsHallDoorOpLoc(player, obj, command) {
    const { world } = player;
    if (command === 'Open') {
        if (getStage(player) >= 11 || getStage(player) === -1) {
            // swap to the open-door state with a sound, auto-reverting after 5 ticks.
            player.sendSound('opendoor');
            world.replaceEntity('gameObjects', obj, 497);
            world.setTickTimeout(
                () => world.replaceEntity('gameObjects', obj, LEGENDS_HALL_DOOR),
                5
            );
            player.message('You open the impressive wooden doors.');
            if (player.y <= 539) {
                player.teleport(513, 541);
            } else {
                player.teleport(513, 539);
            }
        } else {
            player.message('@que@You need to complete the Legends Guild Quest');
            await world.sleepTicks(2);
            player.message('@que@before you can enter the Legends Guild');
            await world.sleepTicks(2);
        }
        return true;
    }
    if (command === 'Search') {
        player.message('Nothing interesting happens');
        return true;
    }
    return false;
}

// Sir Radimus Erkle (npc 735): quest start, mid-quest menus, totem handover, and
// the guild training reward. both dialogue trees hang off npc 735, keyed by stage.

const RE = {
    WHATS_INVOLVED: 0,
    MAYBE_SOME_OTHER_TIME: 1,
    WHO_ARE_YOU: 2,
    SAME_MENU_HAS_SCROLLS: 3,
    FORGOTTEN_WHAT_TO_DO: 4,
    ANOTHER_MACHETE: 5,
    CHARCOAL: 6,
    PAPYRUS: 7,
    IVE_COMPLETED_QUEST: 8,
    SAME_MENU_NO_SCROLLS: 9,
    LOST_KHARAZI_JUNGLE_MAP: 10,
    GIVE_TOTEM_POLE: 11,
    SKILL_MENU_ONE: 12,
    SKILL_MENU_TWO: 13,
    SKILL_MENU_THREE: 14,
    SKILL_MENU_FOUR: 15
};

const COINS_ID = 10;

// training reward xp per menu choice: (level + 1) * 150 displayed.
function radimusRewardXp(player, skill) {
    return maxStat(player, skill) * 600 + 600;
}

// how many training rewards have been claimed.
function getRewardClaimCount(player) {
    return player.cache.legends_reward_claimed !== undefined
        ? player.cache.legends_reward_claimed
        : 4;
}

function updateRewardClaimCount(player) {
    if (player.cache.legends_reward_claimed === undefined) {
        player.cache.legends_reward_claimed = 3;
    } else {
        player.cache.legends_reward_claimed -= 1;
    }
}

function claimCountLine(player) {
    const n = getRewardClaimCount(player);
    return (
        'You can choose ' +
        n +
        ' area' +
        (n > 1 ? 's' : '') +
        ' to increase your abilities in.'
    );
}

// award quest points and clear every legends quest cache.
function completeLegendsQuest(player) {
    player.message(
        '@gre@Well done - you have completed the Legends Guild Quest!'
    );
    player.addQuestPoints(4);
    setStage(player, -1);
    const caches = [
        'gujuo_potion',
        'JUNGLE_EAST',
        'JUNGLE_MIDDLE',
        'JUNGLE_WEST',
        'already_cast_holy_spell',
        'ran_from_2nd_nezi',
        'legends_choose_reward',
        'legends_reward_claimed',
        'ancient_wall_runes',
        'gave_glowing_dagger',
        'met_spirit',
        'cavernous_opening',
        'viyeldi_companions',
        'killed_viyeldi',
        'legends_wooden_beam',
        'rewarded_totem',
        'holy_water_neiz',
        'crafted_totem_pole',
        'yommi_tree_planted'
    ];
    for (const key of caches) {
        delete player.cache[key];
    }
}

// train the picked skill and count down the 4 claims.
async function skillReward(player, npc, skill) {
    player.addExperience(skill, radimusRewardXp(player, skill), false);
    updateRewardClaimCount(player);
    const title = skill.charAt(0).toUpperCase() + skill.slice(1);
    player.message(
        'You receive some training and increase experience to your ' +
            title +
            '.'
    );
    if (getRewardClaimCount(player) === 0) {
        await npc.say(
            "Right, that's all the training I can offer.! ",
            "Hope you're happy with your new skills.",
            "Excuse me now won't you ?",
            'Do feel free to explore the rest of the building.'
        );
        completeLegendsQuest(player);
    } else {
        await npc.say(claimCountLine(player));
        await radimusDialogue(player, npc, RE.SKILL_MENU_ONE);
    }
}

// per-section map status readout.
async function checkMapComplete(player) {
    const { world } = player;
    if (!player.cache.JUNGLE_EAST) {
        player.message(
            '@red@You have yet to map the eastern part of the Kharazi Jungle'
        );
    } else {
        player.message(
            '@gre@Eastern area of the Kharazi Jungle - *** Completed ***'
        );
    }
    await world.sleepTicks(2);
    if (!player.cache.JUNGLE_MIDDLE) {
        player.message(
            '@red@You have yet to map the mid - part of the Kharazi Jungle.'
        );
    } else {
        player.message(
            '@gre@Middle area of the Kharazi Jungle- *** Completed ***'
        );
    }
    await world.sleepTicks(2);
    if (!player.cache.JUNGLE_WEST) {
        player.message(
            '@red@You have yet to map the Western part of the Kharazi Jungle.'
        );
    } else {
        player.message(
            '@gre@Western part of the Kharazi Jungle- *** Completed ***'
        );
    }
    await world.sleepTicks(2);
}

// map the jungle section under the player. bounds: WEST x 432-477, MIDDLE x
// 384-431, EAST x 338-383 (all y 872-909).
async function radimusMapDrawing(player) {
    const { world } = player;
    // migrate the pre-rewrite section cache (labels were inverted: low-x is the
    // eastern end of the jungle).
    if (player.cache.radimus_map_sections) {
        for (const section of player.cache.radimus_map_sections) {
            if (section === 'western') {
                player.cache.JUNGLE_EAST = true;
            } else if (section === 'middle') {
                player.cache.JUNGLE_MIDDLE = true;
            } else if (section === 'eastern') {
                player.cache.JUNGLE_WEST = true;
            }
        }
        delete player.cache.radimus_map_sections;
    }
    // each section has its own y minimum (872/874/875), not a shared band.
    let area = null;
    if (player.y >= 872 && player.y <= 909 && player.x >= 432 && player.x <= 477) {
        area = 'JUNGLE_WEST';
    } else if (
        player.y >= 874 &&
        player.y <= 909 &&
        player.x >= 384 &&
        player.x <= 431
    ) {
        area = 'JUNGLE_MIDDLE';
    } else if (
        player.y >= 875 &&
        player.y <= 909 &&
        player.x >= 338 &&
        player.x <= 383
    ) {
        area = 'JUNGLE_EAST';
    }
    if (!area) {
        if (random(0, 1) === 0) {
            player.message("@que@You're not even in the Kharazi Jungle yet.");
            await world.sleepTicks(2);
            player.message('@que@You need to get to the Southern end of Karamja ');
            await world.sleepTicks(2);
            player.message('@que@before you can start mapping.');
        } else {
            player.message('@que@You prepare to start mapping this area...');
            await world.sleepTicks(3);
            player.message("@que@This doesn't look like the Kharazi Jungle! ");
            await world.sleepTicks(2);
            player.message(
                '@que@You need to go to the very southern end of the Island of Karamja !'
            );
        }
        return true;
    }
    player.message('@que@You prepare to start mapping this area...');
    await world.sleepTicks(3);
    if (player.cache[area]) {
        player.message('@que@You have already completed this part of the map.');
        await world.sleepTicks(2);
        await checkMapComplete(player);
        return true;
    }
    const hasPapyrus = has(player, PAPYRUS_ID);
    const hasCharcoal = has(player, CHARCOAL_ID);
    if (!hasPapyrus && !hasCharcoal) {
        player.message(
            "@que@You'll need some papyrus and charcoal to complete this map."
        );
        return true;
    } else if (hasPapyrus && !hasCharcoal) {
        player.message("@que@You'll need some charcoal to complete this map.");
        return true;
    } else if (!hasPapyrus && hasCharcoal) {
        player.message(
            "@que@You'll need some additional Papyrus to complete this map."
        );
        return true;
    }
    if (currentLevel(player, 'crafting') < 50) {
        player.message(
            'You need a crafting level of 50 to perform this task.'
        );
        return true;
    }
    const roll = random(0, 100);
    if (roll <= 29) {
        player.inventory.remove(PAPYRUS_ID);
        player.message('@que@You neatly add a new section to your map.');
        await world.sleepTicks(2);
        player.cache[area] = true;
        if (
            player.cache.JUNGLE_EAST &&
            player.cache.JUNGLE_MIDDLE &&
            player.cache.JUNGLE_WEST
        ) {
            player.message('@que@Well done !');
            await world.sleepTicks(2);
            player.message(
                '@que@You have completed mapping the Kharazai jungle on the southern end of Karamja,'
            );
            await world.sleepTicks(2);
            player.message('@que@Grand Vizier Erkle will be pleased.');
            await world.sleepTicks(3);
            player.inventory.remove(RADIMUS_SCROLLS_ID);
            player.inventory.add(RADIMUS_SCROLLS_COMPLETE_ID);
            await checkMapComplete(player);
            delete player.cache.JUNGLE_EAST;
            delete player.cache.JUNGLE_MIDDLE;
            delete player.cache.JUNGLE_WEST;
        } else {
            player.message(
                '@que@You still have some sections of the map to complete.'
            );
            await world.sleepTicks(3);
            await checkMapComplete(player);
        }
    } else if (roll <= 50) {
        player.message(
            'You fall over, landing on your charcoal and papyrus, destroying them both.'
        );
        player.inventory.remove(PAPYRUS_ID);
        player.inventory.remove(CHARCOAL_ID);
    } else if (roll <= 70) {
        player.message(
            'You make a mess of the map, the paper is totally ruined.'
        );
        player.inventory.remove(PAPYRUS_ID);
    } else if (roll <= 90) {
        player.message('You snap your stick of charcoal.');
        player.inventory.remove(CHARCOAL_ID);
    } else {
        player.message(
            'You make a mess of the map, but are able to rescue the paper.'
        );
    }
    return true;
}

async function radimusDialogue(player, npc, cID) {
    const { world } = player;
    if (npc.id !== RADIMUS_ERKLE_ID) {
        return;
    }

    if (cID === -1) {
        const stage = getStage(player);
        if (stage === 0 || stage === undefined) {
            await npc.say(
                player.isMale()
                    ? 'Good day to you Sir !'
                    : 'Good day to you my Lady !',
                'No doubt you are keen to become a member of the Legends Guild ?'
            );
            const menu = await ask(
                player,
                [
                    "Yes actually, what's involved?",
                    'Maybe some other time.',
                    'Who are you?'
                ],
                false
            );
            if (menu === 0) {
                await player.say("Yes actually, what's involved ?");
                await radimusDialogue(player, npc, RE.WHATS_INVOLVED);
            } else if (menu === 1) {
                await player.say('Maybe some other time.');
                await radimusDialogue(player, npc, RE.MAYBE_SOME_OTHER_TIME);
            } else if (menu === 2) {
                await player.say('Who are you?');
                await radimusDialogue(player, npc, RE.WHO_ARE_YOU);
            }
            return;
        }
        if (stage >= 1 && stage <= 10) {
            // stage 10 with the gilded totem in hand goes straight to the handover.
            if (stage === 10 && has(player, GILDED_TOTEM_POLE_ID)) {
                await radimusDialogue(player, npc, RE.GIVE_TOTEM_POLE);
                return;
            }
            await npc.say('Hello there, how is the quest going?');
            if (
                has(player, RADIMUS_SCROLLS_ID) ||
                has(player, RADIMUS_SCROLLS_COMPLETE_ID)
            ) {
                await radimusDialogue(player, npc, RE.SAME_MENU_HAS_SCROLLS);
            } else {
                await radimusDialogue(player, npc, RE.SAME_MENU_NO_SCROLLS);
            }
            return;
        }
        if (stage === 11) {
            // OpenRSC RadimusInGuild case 11: the training reward.
            if (!player.cache.legends_choose_reward) {
                await npc.say(
                    'Welcome to the Legends Guild Main Hall.',
                    'We have placed your Totem Pole as pride of place.',
                    'All members of the Legends Guild will see it as they walk in.',
                    'They will know that you were the person to bring it back.',
                    "Congratulations, you're now a fully fledged member.",
                    'I would like to to offer you some training.',
                    'Which will increase your experience and abilities ',
                    'In four areas.',
                    'Would you like to train now?'
                );
                player.cache.legends_choose_reward = true;
            } else {
                await npc.say(
                    'Hello again...',
                    'Would you like to continue with your training?'
                );
            }
            const trainMenu = await ask(
                player,
                [
                    "Yes, I'll train now.",
                    "No, I've got something else to do at the moment."
                ],
                false
            );
            if (trainMenu === 0) {
                await npc.say(claimCountLine(player));
                await radimusDialogue(player, npc, RE.SKILL_MENU_ONE);
            } else if (trainMenu === 1) {
                await player.say(
                    "No, I've got something else to do at the moment."
                );
                await npc.say(
                    player.isMale()
                        ? 'Very well young man.'
                        : 'Very well young lady.',
                    "Return when you are able, but don't leave it too long.",
                    "You'll benefit alot from this training.",
                    'Now, do excuse me while, I have other things to attend to.',
                    'Do feel free to explore the rest of the building.'
                );
            }
            return;
        }
        if (stage === -1) {
            await npc.say(
                'Hello there! How are you enjoying the Legends Guild?'
            );
            player.message('Radimus looks busy...');
            await world.sleepTicks(2);
            await npc.say(
                "Excuse me a moment won't you.",
                'Do feel free to explore the rest of the building.'
            );
            return;
        }
    }

    switch (cID) {
        case RE.WHATS_INVOLVED: {
            await npc.say(
                'Well, you need to complete a quest for us.',
                'You need to map an area called the Kharazi Jungle',
                'It is the unexplored southern part of Karamja Island.',
                'You also need to befriend a native from the Kharazi tribe',
                'in order to get a gift or token of friendship.',
                'We want to display it in the Legends Guild Main hall.',
                'Are you interested in this quest?'
            );
            const questMenu = await ask(player, [
                'Yes, it sounds great!',
                'Not just at the moment.'
            ]);
            if (questMenu === 0) {
                await npc.say(
                    'Excellent!',
                    "Ok, you'll need this starting map of the Kharazi Jungle."
                );
                player.message(
                    'Grand Vizier Erkle gives you some notes and a map.'
                );
                player.inventory.add(RADIMUS_SCROLLS_ID);
                await npc.say(
                    'Complete this map when you get to the Kharazi Jungle.',
                    "It's towards the southern most part of Karamja.",
                    "You'll need additional papyrus and charcoal to complete the map.",
                    'There are three different sectors of the Kharazi jungle to map.'
                );
                player.message('@que@Radimus shuffles around the back of his desk.');
                await world.sleepTicks(2);
                await npc.say(
                    'It is likely to be very tough going.',
                    "You'll need an axe and a machette to cut through ",
                    'the dense Kharazi jungle,collect a machette from the ',
                    'cupboard before you leave. Bring back some sort of token ',
                    'which we can display in the Guild.',
                    'And very good luck to you !'
                );
                setStage(player, 1);
            } else if (questMenu === 1) {
                await npc.say(
                    'Very well, if you change your mind, please come back and see me.'
                );
            }
            break;
        }
        case RE.MAYBE_SOME_OTHER_TIME:
            await npc.say('Ok, as you wish...');
            break;
        case RE.WHO_ARE_YOU: {
            await npc.say(
                'My name is Radimus Erkle, I am the Grand Vizier of the Legends Guild.',
                'Are you interested in becoming a member?'
            );
            const opt = await ask(
                player,
                ["Yes actually, what's involved?", 'Maybe some other time.'],
                false
            );
            if (opt === 0) {
                await player.say("Yes actually, what's involved ?");
                await radimusDialogue(player, npc, RE.WHATS_INVOLVED);
            } else if (opt === 1) {
                await player.say('Maybe some other time.');
                await radimusDialogue(player, npc, RE.MAYBE_SOME_OTHER_TIME);
            }
            break;
        }
        case RE.SAME_MENU_HAS_SCROLLS: {
            const option = await ask(player, [
                "It's Ok, but I have forgotten what to do.",
                'I need another machete.',
                "I've run out of Charcoal.",
                "I've run out of Papyrus.",
                "I've completed the quest."
            ]);
            if (option === 0) {
                await radimusDialogue(player, npc, RE.FORGOTTEN_WHAT_TO_DO);
            } else if (option === 1) {
                await radimusDialogue(player, npc, RE.ANOTHER_MACHETE);
            } else if (option === 2) {
                await radimusDialogue(player, npc, RE.CHARCOAL);
            } else if (option === 3) {
                await radimusDialogue(player, npc, RE.PAPYRUS);
            } else if (option === 4) {
                await radimusDialogue(player, npc, RE.IVE_COMPLETED_QUEST);
            }
            break;
        }
        case RE.SAME_MENU_NO_SCROLLS: {
            const myMenu = await ask(
                player,
                [
                    'Terrible, I lost my map of the Kharazi Jungle.',
                    "It's Ok, but I have forgotten what to do.",
                    'Great, but I need another machete.',
                    "I've run out of Charcoal.",
                    "I've run out of Papyrus."
                ],
                false
            );
            if (myMenu === 0) {
                await player.say(
                    'Terrible, I lost my map of the Kharazi Jungle.'
                );
                await radimusDialogue(player, npc, RE.LOST_KHARAZI_JUNGLE_MAP);
            } else if (myMenu === 1) {
                await player.say("It's Ok, but I have forgotten what to do.");
                await radimusDialogue(player, npc, RE.FORGOTTEN_WHAT_TO_DO);
            } else if (myMenu === 2) {
                await player.say('I need another machete.');
                await radimusDialogue(player, npc, RE.ANOTHER_MACHETE);
            } else if (myMenu === 3) {
                await player.say("I've run out of Charcoal.");
                await radimusDialogue(player, npc, RE.CHARCOAL);
            } else if (myMenu === 4) {
                await player.say("I've run out of Papyrus.");
                await radimusDialogue(player, npc, RE.PAPYRUS);
            }
            break;
        }
        case RE.FORGOTTEN_WHAT_TO_DO:
            await npc.say(
                'Tut! How forgetful!',
                'You need to find a way into the Kharazi jungle, ',
                'Then you need to explore and map that entire area.',
                "While you're there, you need to make contact with any jungle natives.",
                'Bring back a tribal gift from the natives',
                'so that we can display it in the Legends Guild.',
                'I hope that answers your question!'
            );
            if (
                has(player, RADIMUS_SCROLLS_ID) ||
                has(player, RADIMUS_SCROLLS_COMPLETE_ID)
            ) {
                await radimusDialogue(player, npc, RE.SAME_MENU_HAS_SCROLLS);
            } else {
                await radimusDialogue(player, npc, RE.SAME_MENU_NO_SCROLLS);
            }
            break;
        case RE.ANOTHER_MACHETE:
            await npc.say('Well, just get another one from the cupboard.');
            if (
                has(player, RADIMUS_SCROLLS_ID) ||
                has(player, RADIMUS_SCROLLS_COMPLETE_ID)
            ) {
                await radimusDialogue(player, npc, RE.SAME_MENU_HAS_SCROLLS);
            } else {
                await radimusDialogue(player, npc, RE.SAME_MENU_NO_SCROLLS);
            }
            break;
        case RE.CHARCOAL:
            await npc.say(
                'Well, get some more!',
                'Be proactive and get some more from somewhere.'
            );
            player.message('@que@Sir Radimus mutters under his breath.');
            await world.sleepTicks(2);
            await npc.say(
                "It's hardly legendary if you fail a quest",
                "because you can't find some charcoal!"
            );
            if (
                has(player, RADIMUS_SCROLLS_ID) ||
                has(player, RADIMUS_SCROLLS_COMPLETE_ID)
            ) {
                await radimusDialogue(player, npc, RE.SAME_MENU_HAS_SCROLLS);
            } else {
                await radimusDialogue(player, npc, RE.SAME_MENU_NO_SCROLLS);
            }
            break;
        case RE.PAPYRUS:
            await npc.say(
                'Well, get some more!',
                'Be proactive and try to find some!'
            );
            player.message('@que@Sir Radimus mutters under his breath.');
            await world.sleepTicks(2);
            await npc.say(
                "It's hardly legendary if you fail a quest",
                "because you can't find some papyrus!"
            );
            if (
                has(player, RADIMUS_SCROLLS_ID) ||
                has(player, RADIMUS_SCROLLS_COMPLETE_ID)
            ) {
                await radimusDialogue(player, npc, RE.SAME_MENU_HAS_SCROLLS);
            } else {
                await radimusDialogue(player, npc, RE.SAME_MENU_NO_SCROLLS);
            }
            break;
        case RE.IVE_COMPLETED_QUEST:
            await npc.say(
                'Well, if you have, show me the gift the Kharazi people gave you !',
                'Becoming a legend is more than just fighting you know.',
                'It also requires some carefull diplomacy and problem solving.',
                'Also complete the map of Kharazi jungle',
                'and we will admit you to the Guild.'
            );
            await radimusDialogue(player, npc, RE.SAME_MENU_HAS_SCROLLS);
            break;
        case RE.LOST_KHARAZI_JUNGLE_MAP: {
            await npc.say(
                'That is awful, well, luckily I have a copy here.',
                'But I need to charge you a copy fee of 30 gold pieces.'
            );
            if (player.inventory.has(COINS_ID, 30)) {
                await npc.say('Do you agree to pay?');
                const pay = await ask(player, [
                    "Yes, I'll pay for it.",
                    "No, I won't pay for it."
                ]);
                if (pay === 0) {
                    player.message('You hand over 30 gold coins.');
                    player.inventory.remove(COINS_ID, 30);
                    player.inventory.add(RADIMUS_SCROLLS_ID);
                    await npc.say("Ok, please don't lose this one..");
                } else if (pay === 1) {
                    await npc.say(
                        "Well, that's your decision, of course... ",
                        "but you won't be able to complete the quest without it.",
                        "Excuse, me now won't you, I have other business to attend to."
                    );
                    await radimusDialogue(
                        player,
                        npc,
                        RE.SAME_MENU_NO_SCROLLS
                    );
                }
            } else {
                await npc.say(
                    "It looks as if you don't have the funds for it at the moment.",
                    'How irritating...'
                );
            }
            break;
        }
        case RE.GIVE_TOTEM_POLE: {
            await npc.say(
                player.isMale()
                    ? 'Sir, this is truly amazing...'
                    : 'Madam, this is truly amazing...'
            );
            if (!has(player, RADIMUS_SCROLLS_COMPLETE_ID)) {
                await npc.say(
                    'However, I need you to complete the map of the ,',
                    'Kharazi Jungle before your quest is complete.'
                );
                break;
            }
            player.message(
                'Radimus Erkle orders some guards to take the totem pole,'
            );
            await world.sleepTicks(2);
            player.message('into the main Legends Hall.');
            await world.sleepTicks(2);
            player.inventory.remove(GILDED_TOTEM_POLE_ID);
            await npc.say(
                'That will take pride of place in the Legends Guild ',
                'As a reminder of your quest to gain entry.',
                'And so that many other great adventurers can admire your bravery.',
                'Well, it seems that you have completed the tasks I set you.',
                'That map of the Kharazi jungle will be very helpful in future.',
                'Congratulations, welcome to the Legends Guild.',
                'Go through to the main Legends Guild building ',
                'and I will join you shortly.'
            );
            setStage(player, 11);
            break;
        }
        case RE.SKILL_MENU_ONE: {
            const menuOne = await ask(player, [
                '* Attack *',
                '* Defense * ',
                '* Strength * ',
                '--- Go to Skill Menu 2 ----'
            ]);
            if (menuOne === 0) {
                await skillReward(player, npc, 'attack');
            } else if (menuOne === 1) {
                await skillReward(player, npc, 'defense');
            } else if (menuOne === 2) {
                await skillReward(player, npc, 'strength');
            } else if (menuOne === 3) {
                await radimusDialogue(player, npc, RE.SKILL_MENU_TWO);
            }
            break;
        }
        case RE.SKILL_MENU_TWO: {
            const menuTwo = await ask(player, [
                '* Hits * ',
                '* Prayer * ',
                '* Magic *',
                '--- Go to Skill Menu 3  ----'
            ]);
            if (menuTwo === 0) {
                await skillReward(player, npc, 'hits');
            } else if (menuTwo === 1) {
                await skillReward(player, npc, 'prayer');
            } else if (menuTwo === 2) {
                await skillReward(player, npc, 'magic');
            } else if (menuTwo === 3) {
                await radimusDialogue(player, npc, RE.SKILL_MENU_THREE);
            }
            break;
        }
        case RE.SKILL_MENU_THREE: {
            const menuThree = await ask(player, [
                '* Woodcutting * ',
                '* Crafting * ',
                '* Smithing * ',
                '--- Go to Skill Menu 4 ----'
            ]);
            if (menuThree === 0) {
                await skillReward(player, npc, 'woodcutting');
            } else if (menuThree === 1) {
                await skillReward(player, npc, 'crafting');
            } else if (menuThree === 2) {
                await skillReward(player, npc, 'smithing');
            } else if (menuThree === 3) {
                await radimusDialogue(player, npc, RE.SKILL_MENU_FOUR);
            }
            break;
        }
        case RE.SKILL_MENU_FOUR: {
            const menuFour = await ask(player, [
                '* Herblaw *',
                '* Agility *',
                '* Thieving *',
                '--- Go to Skill Menu 1 ----'
            ]);
            if (menuFour === 0) {
                await skillReward(player, npc, 'herblaw');
            } else if (menuFour === 1) {
                await skillReward(player, npc, 'agility');
            } else if (menuFour === 2) {
                await skillReward(player, npc, 'thieving');
            } else if (menuFour === 3) {
                await radimusDialogue(player, npc, RE.SKILL_MENU_ONE);
            }
            break;
        }
    }
}

// the cupboard (1149) holding the Machette.
async function radimusCupboardOpLoc(player, obj, command) {
    const { world } = player;
    if (command !== 'open') {
        return false;
    }
    if (getStage(player) === 0 || getStage(player) === undefined) {
        player.message(
            "@gre@Sir Radimus Erkle: You're not authorised to open that cupboard."
        );
        return true;
    }
    if (has(player, MACHETE_ID)) {
        player.message('The cupboard is empty.');
        return true;
    }
    player.message('@que@You open the cupboard and find a machette.');
    await world.sleepTicks(2);
    player.message('@que@You take it out and add it to your inventory.');
    await world.sleepTicks(2);
    player.inventory.add(MACHETE_ID);
    return true;
}

// the desk (1177), knock on table to summon Radimus.
async function radimusDeskOpLoc(player, obj, command) {
    const { world } = player;
    if (command !== 'Knock on table') {
        return false;
    }
    player.message('You rap loudly on the desk.');
    const nearby = [...world.npcs.getInArea(player.x, player.y, 6)].find(
        (n) => n.id === RADIMUS_ERKLE_ID
    );
    if (nearby) {
        player.engage(nearby);
        await radimusDialogue(player, nearby, -1);
        player.disengage();
    } else {
        player.message('Sir Radimus Erkle is currently busy at the moment.');
    }
    return true;
}

// the mission-briefing lines.
const MISSION_BRIEFING_LINES = [
    '* Legends Guild Quest *',
    '1 : Map the Kharazi Jungle (Southern end of Karamja), there are',
    'three main areas that need to be mapped.',
    '2 : Try to meet up with the local friendly natives, some are not',
    'so friendly so be careful.',
    '3 : See if you can get a trophy or native jungle item from the',
    'natives to display in the Legends Guild. You may be given a task',
    'or test to earn this.',
    '* Note - You may need to get help from other people near the',
    'jungle, for example, the local woodsmen may have some knowledge',
    'of the Jungle area.'
];

// OpenRSC LegendsQuestMapJungle onOpInv: reading the scrolls.
async function radimusScrollsCommand(player, item) {
    if (item.id === RADIMUS_SCROLLS_COMPLETE_ID) {
        player.message(
            'The map of Kharazi Jungle is complete, Sir Radimus will be pleased.'
        );
        const menu = await ask(player, ['Read Mission Briefing', 'Close'], false);
        if (menu === 0) {
            await sendScrollText(player, MISSION_BRIEFING_LINES);
        } else if (menu === 1) {
            player.message('You put the scrolls away.');
        }
        return true;
    }
    if (item.id !== RADIMUS_SCROLLS_ID) {
        return false;
    }
    player.message(
        'You open and start to read the scrolls that Radimus gave you.'
    );
    const menu = await ask(
        player,
        ['Read Mission Briefing', 'Start Mapping Kharazi Jungle.'],
        false
    );
    if (menu === 0) {
        await sendScrollText(player, MISSION_BRIEFING_LINES);
        return true;
    }
    if (menu === 1) {
        return radimusMapDrawing(player);
    }
    return true;
}

// Jungle Forester: Kharazi intro + bull-roarer handoff. stage 0 uses the default
// tree; once underway, the Legends tree. the completed Radimus map yields the Bull Roarer.

const JF_DEF = {
    WHAT_DO_YOU_DO_HERE: 0,
    WHO_ARE_YOU: 1,
    KHARAZI_JUNGLE: 2,
    OK_THANKS: 3
};
const JF_LQ = {
    WHAT_DO_YOU_DO_HERE: 0,
    WHO_ARE_YOU: 1,
    KHARAZI_JUNGLE: 2,
    NATIVES_IN_THE_JUNGLE: 3,
    MAKE_A_COPY: 4,
    OK_THANKS: 5
};

async function jungleForesterLegends(player, npc, cID) {
    if (cID === -1) {
        await npc.say("Hello friend, you're a long way from civilisation!");
        const opt = await ask(player, [
            'How do I get into the Kharazi jungle?',
            'What do you do here?',
            'Have you seen any natives in the jungle?'
        ]);
        if (opt === 0) {
            await jungleForesterLegends(player, npc, JF_LQ.KHARAZI_JUNGLE);
        } else if (opt === 1) {
            await jungleForesterLegends(
                player,
                npc,
                JF_LQ.WHAT_DO_YOU_DO_HERE
            );
        } else if (opt === 2) {
            await jungleForesterLegends(
                player,
                npc,
                JF_LQ.NATIVES_IN_THE_JUNGLE
            );
        }
        return;
    }

    switch (cID) {
        case JF_LQ.WHAT_DO_YOU_DO_HERE: {
            await npc.say(
                'I\'m a forester, and I specialise in exotic woods. ',
                "I've not managed to penetrate the Kharazi jungle very far,",
                'but I have found some interesting specimens of trees.',
                'If you do happen to get into the Kharazi jungle, do come and let me know.',
                "I'd love to be able to safely navigate my own way in and out."
            );
            const menu = await ask(player, [
                'How do I get into the Kharazi jungle?',
                'Have you seen any natives in the jungle?',
                'Ok thanks'
            ]);
            if (menu === 0) {
                await jungleForesterLegends(player, npc, JF_LQ.KHARAZI_JUNGLE);
            } else if (menu === 1) {
                await jungleForesterLegends(
                    player,
                    npc,
                    JF_LQ.NATIVES_IN_THE_JUNGLE
                );
            } else if (menu === 2) {
                await jungleForesterLegends(player, npc, JF_LQ.OK_THANKS);
            }
            break;
        }
        case JF_LQ.NATIVES_IN_THE_JUNGLE: {
            await npc.say(
                "Well, I've heard some funny sounds...",
                "And I think I've seen a native...but I'm not sure",
                "They generally don't like to be seen I guess...",
                'But I found an item that you might be interested in.',
                'You swing it above your head and it makes a strange sound,',
                'it seems to attract their attention.'
            );
            const opt = await ask(player, [
                'Can I have the item please?',
                'How do I get into the jungle?',
                'Ok thanks'
            ]);
            if (opt === 0) {
                await npc.say(
                    'Well, I wish I could give it to you.',
                    'However, I have grown fond of it.',
                    'And it may help me incase I get lost in the jungle.'
                );
                const opt3 = await ask(player, [
                    'Will you trade something for it?',
                    'Ok thanks'
                ]);
                if (opt3 === 0) {
                    await npc.say(
                        'Well, if you have something interesting, let me have a look at it',
                        "and I'll offer you something in return...",
                        "OK, I have to go now, but it's been nice talking with you."
                    );
                } else if (opt3 === 1) {
                    await jungleForesterLegends(player, npc, JF_LQ.OK_THANKS);
                }
            } else if (opt === 1) {
                await jungleForesterLegends(player, npc, JF_LQ.KHARAZI_JUNGLE);
            } else if (opt === 2) {
                await jungleForesterLegends(player, npc, JF_LQ.OK_THANKS);
            }
            break;
        }
        case JF_LQ.KHARAZI_JUNGLE: {
            await npc.say(
                "Well, I've not managed it yet, ",
                'But I heard that someone managed to find a way in..',
                'But they only just managed to to escape the jungle with their lives.',
                'Apparently he was on a mission to map the area.',
                'How foolish is that?'
            );
            const option = await ask(player, [
                'Well, in fact I plan to map that area myself.',
                'Are you calling me foolish?',
                'What do you do here?',
                'Have you seen any natives in the jungle?',
                'Ok thanks'
            ]);
            if (option === 0) {
                player.message('@que@The forester looks very interested..');
                await player.world.sleepTicks(2);
                await npc.say(
                    'Oh, well, that sounds quite good actually...',
                    'Sorry if I sounded rude before, it just didn\'t seem like a good idea to me.',
                    "I guess I just wouldn't want to do it myself.",
                    'But a map of that area would certainly be a big task.',
                    'And it would certainly be very useful...'
                );
                player.message('@que@The forester looks very thoughtfull');
                await player.world.sleepTicks(1);
                await npc.say(
                    'Hey, if you manage to complete it, be sure to let me take a look!',
                    "Well, best of luck with it, I'm sure you're going to need it."
                );
                const opt2 = await ask(player, [
                    'Do you have any other tips about the Kharazi jungle?',
                    'Have you seen any natives in the jungle?',
                    'Ok thanks'
                ]);
                if (opt2 === 0) {
                    await npc.say(
                        "Not really, but I would say be careful, it's a dangerous place.",
                        'And good luck.'
                    );
                } else if (opt2 === 1) {
                    await jungleForesterLegends(
                        player,
                        npc,
                        JF_LQ.NATIVES_IN_THE_JUNGLE
                    );
                } else if (opt2 === 2) {
                    await jungleForesterLegends(player, npc, JF_LQ.OK_THANKS);
                }
            } else if (option === 1) {
                await npc.say(
                    'No, of course not...',
                    'Sorry, I have to be on myway...'
                );
            } else if (option === 2) {
                await jungleForesterLegends(
                    player,
                    npc,
                    JF_LQ.WHAT_DO_YOU_DO_HERE
                );
            } else if (option === 3) {
                await jungleForesterLegends(
                    player,
                    npc,
                    JF_LQ.NATIVES_IN_THE_JUNGLE
                );
            } else if (option === 4) {
                await jungleForesterLegends(player, npc, JF_LQ.OK_THANKS);
            }
            break;
        }
        case JF_LQ.MAKE_A_COPY:
            await npc.say('Many thanks friend.');
            player.message(
                '@que@The Jungle Forester takes out some parchment and some charcoal.'
            );
            await player.world.sleepTicks(2);
            player.message('@que@He studiously renders another copy of your map.');
            await player.world.sleepTicks(2);
            await npc.say('Many thanks friend.');
            player.message(
                '@que@He takes out a strange looking object and hands it to you.'
            );
            await player.world.sleepTicks(2);
            await npc.say(
                "Here, I won't be needing this any longer, and it may help you.",
                "Whenever I've used it before, it attracted the attention of jungle natives."
            );
            player.inventory.add(BULL_ROARER_ID);
            break;
        case JF_LQ.OK_THANKS:
            await npc.say("You're welcome!", 'See you around...');
            break;
    }
}

async function jungleForesterDefault(player, npc, cID) {
    if (cID === -1) {
        await npc.say("Hello friend, you're a long way from civilisation!");
        const menu = await ask(player, [
            'What do you do here?',
            'How do I get into the jungle?',
            'Who are you?'
        ]);
        if (menu === 0) {
            await jungleForesterDefault(player, npc, JF_DEF.WHAT_DO_YOU_DO_HERE);
        } else if (menu === 1) {
            await jungleForesterDefault(player, npc, JF_DEF.KHARAZI_JUNGLE);
        } else if (menu === 2) {
            await jungleForesterDefault(player, npc, JF_DEF.WHO_ARE_YOU);
        }
        return;
    }

    switch (cID) {
        case JF_DEF.WHAT_DO_YOU_DO_HERE: {
            await npc.say(
                'I\'m a forester, and I specialise in exotic woods. ',
                "I've not managed to penetrate the Kharazi jungle very far,",
                'but I have found some interesting specimens of trees.',
                'If you do happen to get into the Kharazi jungle, do come and let me know.',
                "I'd love to be able to safely navigate my own way in and out."
            );
            const menu = await ask(player, [
                'Who are you?',
                'How do I get into the Kharazi jungle?',
                'Ok thanks'
            ]);
            if (menu === 0) {
                await jungleForesterDefault(player, npc, JF_DEF.WHO_ARE_YOU);
            } else if (menu === 1) {
                await jungleForesterDefault(player, npc, JF_DEF.KHARAZI_JUNGLE);
            } else if (menu === 2) {
                await jungleForesterDefault(player, npc, JF_DEF.OK_THANKS);
            }
            break;
        }
        case JF_DEF.WHO_ARE_YOU: {
            await npc.say(
                "I'm a jungle forester,",
                'Names mean little in this part of the world.'
            );
            const subMenu = await ask(player, [
                'What do you do here?',
                'How do I get into the Kharazi jungle?'
            ]);
            if (subMenu === 0) {
                await jungleForesterDefault(
                    player,
                    npc,
                    JF_DEF.WHAT_DO_YOU_DO_HERE
                );
            } else if (subMenu === 1) {
                await jungleForesterDefault(player, npc, JF_DEF.KHARAZI_JUNGLE);
            }
            break;
        }
        case JF_DEF.KHARAZI_JUNGLE: {
            await npc.say(
                "Well, I've not managed it yet, ",
                'But I heard that someone managed to find a way in..',
                'But they only just managed to to escape the jungle with their lives.',
                'Apparently he was on a mission to map the area.',
                'How foolish is that?'
            );
            const subMenu2 = await ask(
                player,
                [
                    'So someone managed to get into the Kharazi Jungle?',
                    'What do you do here?',
                    'Ok thanks'
                ],
                false
            );
            if (subMenu2 === 0) {
                await player.say('So someone managed to get into the Jungle?');
                await npc.say(
                    'Yes, he said he was from some place...near the Barbarian outpost.',
                    'Mentioned something about a legend ?',
                    'It meant nothing to me though.'
                );
                const subMenu3 = await ask(
                    player,
                    [
                        'How do I get into the jungle?',
                        'What do you do here?',
                        'Ok thanks'
                    ],
                    false
                );
                if (subMenu3 === 0) {
                    await player.say('How do I get into the Kharazi jungle?');
                    await jungleForesterDefault(
                        player,
                        npc,
                        JF_DEF.KHARAZI_JUNGLE
                    );
                } else if (subMenu3 === 1) {
                    await player.say('What do you do here?');
                    await jungleForesterDefault(
                        player,
                        npc,
                        JF_DEF.WHAT_DO_YOU_DO_HERE
                    );
                } else if (subMenu3 === 2) {
                    await player.say('Ok thanks');
                    await jungleForesterDefault(player, npc, JF_DEF.OK_THANKS);
                }
            } else if (subMenu2 === 1) {
                await player.say('What do you do here?');
                await jungleForesterDefault(
                    player,
                    npc,
                    JF_DEF.WHAT_DO_YOU_DO_HERE
                );
            } else if (subMenu2 === 2) {
                await player.say('Ok thanks');
                await jungleForesterDefault(player, npc, JF_DEF.OK_THANKS);
            }
            break;
        }
        case JF_DEF.OK_THANKS:
            await npc.say("You're welcome!", 'See you around...');
            break;
    }
}

async function jungleForesterTalk(player, npc) {
    if (getStage(player) === 0 || getStage(player) === undefined) {
        await jungleForesterDefault(player, npc, -1);
    } else {
        await jungleForesterLegends(player, npc, -1);
    }
}

// show the completed Radimus map to receive the Bull Roarer.
async function jungleForesterUse(player, npc, item) {
    const { world } = player;
    if (item.id !== RADIMUS_SCROLLS_COMPLETE_ID) {
        return false;
    }
    player.message(
        'You show the completed map of Kharazi Jungle to the Forester.'
    );
    if (has(player, BULL_ROARER_ID)) {
        await npc.say(
            "It's a great map, thanks for letting me take a copy!",
            'It has helped me out a number of times now.'
        );
        return true;
    }
    await npc.say('*Gasp*');
    player.message('The jungle forester looks speechless.');
    await npc.say(
        'This is very impressive!',
        "I'm amazed, it's just great!",
        "Do you mind if I make a copy of it, and I'll give you an item in return."
    );
    const menu = await ask(player, [
        'Yes, go ahead make a copy!',
        'What will you give me in return?',
        'Sorry, I must complete my quest.'
    ]);
    if (menu === 0) {
        await jungleForesterLegends(player, npc, JF_LQ.MAKE_A_COPY);
    } else if (menu === 1) {
        await npc.say('Well, I can offer you this?');
        player.message('@que@The Jungle Forester takes out a strange looking object.');
        await world.sleepTicks(2);
        player.message(
            '@que@It looks like a wooden pole, with string attached to one end.'
        );
        await world.sleepTicks(2);
        player.message(
            'And at the other end of the string is shaped piece of wood.'
        );
        await npc.say(
            'If you swing this above your head, it makes a strange sound.',
            'I noticed that it attracts the attention of the natives.',
            'Is it a deal? Can I make a copy of your map?'
        );
        const opt = await ask(player, [
            'Yes, go ahead make a copy!',
            'Sorry, I must complete my quest.'
        ]);
        if (opt === 0) {
            await jungleForesterLegends(player, npc, JF_LQ.MAKE_A_COPY);
        } else if (opt === 1) {
            await npc.say(
                'Very well friend, I understand, I must be on my way as well.'
            );
            player.message(
                'The Jungle Forester seems a bit annoyed...and wanders off.'
            );
        }
    } else if (menu === 2) {
        await npc.say(
            'Very well friend, I understand, I must be on my way as well.'
        );
        player.message(
            'The Jungle Forester seems a bit annoyed...and wanders off.'
        );
    }
    return true;
}

// swing the Bull Roarer to attract a native. inside the Kharazi jungle interior
// (338-477, 869-908) it may summon Gujuo; elsewhere it's a dud.
async function bullRoarerSwing(player, item) {
    const { world } = player;
    if (item.id !== BULL_ROARER_ID) {
        return false;
    }
    player.message('@que@You start to swing the bullroarer above your head.');
    player.sendSound('mechanical');
    await world.sleepTicks(2);
    player.message(
        '@que@You feel a bit silly at first, but soon it makes an interesting sound.'
    );
    await world.sleepTicks(2);
    // OpenRSC inKharaziJungle bounds
    const inKharazi =
        player.x >= 338 && player.x <= 477 && player.y >= 869 && player.y <= 908;
    if (!inKharazi) {
        player.message('@que@Nothing much seems to happen though.');
        await world.sleepTicks(2);
        const forester = [...world.npcs.getInArea(player.x, player.y, 10)].find(
            (n) => n.id === JUNGLE_FORESTER_ID
        );
        if (forester) {
            player.engage(forester);
            await forester.say(
                'You might like to use that when you get into the ',
                'Kharazi jungle, it might attract more natives...'
            );
            player.disengage();
        }
        return true;
    }
    player.message('@que@You see some movement in the trees...');
    await world.sleepTicks(2);
    await attractNatives(player);
    return true;
}

// the four creatures the bull roarer can aggravate instead of a native.
const BULL_ROARER_ANIMAL_IDS = new Set([
    777, // Oomlie Bird
    775, // Karamja Wolf
    521, // Jungle Spider
    776 // Jungle Savage
]);

// 25% nothing, 50% Gujuo approaches, 25% a nearby jungle creature attacks.
async function attractNatives(player) {
    const { world } = player;
    const controlRandom = random(0, 3);
    if (controlRandom === 0) {
        player.message('@que@...but nothing else much seems to happen.');
        await world.sleepTicks(2);
        return;
    }
    if (controlRandom <= 2) {
        player.message(
            '@que@...and a tall, dark, charismatic looking native approaches you.'
        );
        await world.sleepTicks(2);
        let gujuo = [...world.npcs.getInArea(player.x, player.y, 15)].find(
            (n) => n.id === GUJUO_ID
        );
        if (!gujuo) {
            gujuo = spawnNpc(player, GUJUO_ID, player.x, player.y - 1);
            delete gujuo.respawn;
            // a summoned Gujuo left undismissed wanders off after 150s.
            const summoned = gujuo;
            world.setTimeout(() => {
                if (world.npcs.entities[summoned.index] === summoned) {
                    if (player.loggedIn) {
                        player.message(
                            'Gujuo disapears into the Kharazi jungle as swiftly as he appeared...'
                        );
                    }
                    world.removeEntity('npcs', summoned);
                }
            }, 150000);
        }
        player.engage(gujuo);
        await gujuoDialogue(player, gujuo, -1);
        player.disengage();
        return;
    }
    const animal = [...world.npcs.getInArea(player.x, player.y, 5)].find((n) =>
        BULL_ROARER_ANIMAL_IDS.has(n.id)
    );
    if (!animal) {
        await attractNatives(player);
        return;
    }
    const name = animal.definition ? animal.definition.name : 'creature';
    const label = name.includes('bird') ? name : 'Kharazi ' + name.toLowerCase();
    player.message('@que@...and a nearby ' + label + ' takes a sudden dislike to you.');
    await world.sleepTicks(2);
    player.message('@que@And attacks...');
    await world.sleepTicks(1);
    await animal.attack(player);
}

// Gujuo, the central advice NPC (Kharazi jungle).

const GJ = {
    SORRY_IT_WAS_A_MISTAKE: 0,
    IM_LOST: 1,
    NO_THANKS: 2,
    I_WILL_RELEASE_UNGADULU: 3,
    I_WANT_TO_DEVELOP_FRIENDLY_RELATIONS: 4,
    OK_THANKS_FOR_YOUR_HELP: 5,
    UNGADULU_LOOKS_STRANGE: 6,
    UNGADULU_CALLED_ME_VACU: 7,
    UNKNOWN_FORCES: 8,
    I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER: 9,
    WHAT_KIND_OF_A_VESSEL: 10,
    METAL_OF_SUN_WHAT_IS_THAT: 11,
    HOW_DO_I_BLESS_THE_BOWL: 12,
    WHERE_CAN_I_FIND_THIS_METAL: 13,
    HOW_GOES_YOUR_QUEST_TO_RELEASE_UNGADULU: 14,
    BLESS_THE_BOWL: 15,
    IM_NOT_SURE_WHAT_TO_DO: 16,
    CAN_YOU_HELP_ME: 17,
    WHAT_DO_I_DO_NOW: 18,
    I_HAVE_THE_YOMMI_TREE_SEEDS: 19,
    UNGADULU_IS_FREE: 20,
    WHERE_IS_THE_FETILE_SOIL: 21,
    I_HAVE_GERMINATED_THE_YOMMI_TREE_SEEDS: 22,
    THE_YOMMI_TREE_DIED: 23,
    DOES_THE_YOMMI_TREE_HAVE_TO_HAVE_PURE_WATER: 24,
    WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER: 25,
    THE_WATER_POOL_HAS_DRIED_UP_AND_I_NEED_MORE_WATER: 26,
    WHERE_CAN_I_GET_MORE_WATER_FOR_THE_YOMMI_TREE: 27,
    I_SEARCHED_THE_CATACOMBS_THOROUGHLY_BUT_FOUND_NADA_NIET: 28,
    IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME: 29,
    WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2: 30,
    WHERE_CAN_I_FIND_SNAKE_WEED: 31,
    WHERE_CAN_I_FIND_ARDRIGAL: 32,
    WILL_I_NEED_THIS_POTION_I_FEEL_BRAVE_AS_I_AM: 33,
    I_FOUND_WAY_INTO_CAVES: 34,
    DO_YOU_KNOW_MORE_ABOUT_CAVES: 35,
    WHO_IS_VIYELDI: 36,
    I_FOUND_THE_SOURCE_OF_THE_SPRING_AND_I_GOT_THE_WATER: 37,
    I_KILLED_THE_DEMON_AGAIN: 38,
    HOW_DO_I_MAKE_THE_TOTEM_POLE: 39,
    OK_I_WONT_GO: 40
};

// player carries any golden-bowl variant (blessed or not).
function hasAnyGoldenBowl(player) {
    return (
        has(player, GOLDEN_BOWL_ID) ||
        has(player, GOLDEN_BOWL_WITH_PURE_WATER_ID) ||
        has(player, GOLDEN_BOWL_WITH_PLAIN_WATER_ID)
    );
}
function hasAnyBlessedBowl(player) {
    return (
        has(player, BLESSED_GOLDEN_BOWL_ID) ||
        has(player, BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID) ||
        has(player, BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID)
    );
}

async function gujuoBye(player, npc) {
    const yell = random(0, 3);
    if (yell === 0) {
        await npc.say('I am tired Bwana, I must go and rest...');
    }
    if (yell === 1) {
        await npc.say('I must visit my people now...');
    } else if (yell === 2) {
        await npc.say('I must go and hunt now Bwana..');
    } else if (yell === 3) {
        await npc.say('I have to collect herbs now Bwana...');
    } else {
        await npc.say('I have work to do Bwana, I may see you again...');
    }
    // OpenRSC schedules Gujuo's removal 3 ticks later.
    const { world } = player;
    world.setTickTimeout(() => {
        player.message(
            'Gujuo disapears into the Kharazi jungle as swiftly as he appeared...'
        );
        try {
            world.removeEntity('npcs', npc);
        } catch (e) {
            // already gone
        }
    }, 3);
}

async function gujuoBlessBowl(player, npc) {
    const { world } = player;
    if (currentLevel(player, 'prayer') < 42) {
        await npc.say(
            'Bwana, I am very sorry,',
            'But you are too inexperienced to bless this bowl.'
        );
        player.message(
            'You need a prayer ability of 42 to complete this task.'
        );
        return;
    }
    await npc.say('Very well Bwana...');
    player.message('@que@Gujuo places the bowl on the floor in front of you,');
    await world.sleepTicks(2);
    player.message('@que@and leads you into a deep meditation...');
    await world.sleepTicks(3);
    await npc.say('Ohhhhhmmmmmm');
    await player.say('Oooooommmmmmmmmm');
    await npc.say('Ohhhhhmmmmmm');
    await player.say('Oooooohhhhmmmmmmmmmm');
    await npc.say('Ohhhhhmmmmmm');
    if (failCalculation(player, 'prayer', 42)) {
        player.message('@que@A totally peacefull aura surrounds you and you ');
        await world.sleepTicks(2);
        player.message('@que@bring down the blessings of your god on the bowl.');
        await world.sleepTicks(2);
        if (has(player, GOLDEN_BOWL_ID)) {
            player.inventory.remove(GOLDEN_BOWL_ID);
            player.inventory.add(BLESSED_GOLDEN_BOWL_ID);
        } else if (has(player, GOLDEN_BOWL_WITH_PURE_WATER_ID)) {
            player.inventory.remove(GOLDEN_BOWL_WITH_PURE_WATER_ID);
            player.inventory.add(BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID);
        } else if (has(player, GOLDEN_BOWL_WITH_PLAIN_WATER_ID)) {
            player.inventory.remove(GOLDEN_BOWL_WITH_PLAIN_WATER_ID);
            player.inventory.add(BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID);
        }
        await gujuoDialogue(
            player,
            npc,
            GJ.HOW_GOES_YOUR_QUEST_TO_RELEASE_UNGADULU
        );
    } else {
        player.message('@que@You were not able to go into a deep enough trance.');
        await world.sleepTicks(2);
        player.message('@que@You lose some prayer...');
        await world.sleepTicks(2);
        setCurrentLevel(player, 'prayer', currentLevel(player, 'prayer') - 5);
        await npc.say('Would you like to try again.');
        const failMenu = await ask(
            player,
            ["Yes, I'd like to bless my golden bowl.", "No thanks, I'll wait."],
            false
        );
        if (failMenu === 0) {
            await gujuoDialogue(player, npc, GJ.BLESS_THE_BOWL);
        } else if (failMenu === 1) {
            await player.say("No thanks, I'll wait.");
            await npc.say('Very well, let me know when you want to try?');
            await gujuoDialogue(
                player,
                npc,
                GJ.HOW_GOES_YOUR_QUEST_TO_RELEASE_UNGADULU
            );
        }
    }
}

async function gujuoDialogue(player, npc, cID) {
    const { world } = player;
    if (npc.id !== GUJUO_ID) {
        return;
    }

    if (cID === -1) {
        switch (getStage(player)) {
            case 1: {
                await npc.say(
                    'Grettings Bwana...',
                    'Why do you make such strange sounds and disturb the peace of the jungle?'
                );
                const menu = await ask(player, [
                    'I was hoping to attract the attention of a native.',
                    'Sorry, it was a mistake?'
                ]);
                if (menu === 0) {
                    await npc.say(
                        'Well, it had the desired effect...',
                        'I am Gujuo, proud member of the Kharazi tribe.',
                        'What did you want to talk about Bwana ?'
                    );
                    const opt4 = await ask(player, [
                        'I want to develop friendly relations with your people.',
                        'Sorry, it was a mistake?'
                    ]);
                    if (opt4 === 0) {
                        await gujuoDialogue(
                            player,
                            npc,
                            GJ.I_WANT_TO_DEVELOP_FRIENDLY_RELATIONS
                        );
                    } else if (opt4 === 1) {
                        await gujuoDialogue(
                            player,
                            npc,
                            GJ.SORRY_IT_WAS_A_MISTAKE
                        );
                    }
                } else if (menu === 1) {
                    await gujuoDialogue(player, npc, GJ.SORRY_IT_WAS_A_MISTAKE);
                }
                break;
            }
            case 2: {
                await npc.say('How goes your quest to release Ungadulu Bwana?');
                const menuCave = await ask(player, [
                    "I've found the caves, but I don't know what to do.",
                    'Ok thanks for your help.'
                ]);
                if (menuCave === 0) {
                    await npc.say(
                        'Search the caves and try to talk to Ungadulu, there may be some',
                        'clues to be had by searching all the items in the cave...'
                    );
                    await gujuoBye(player, npc);
                } else if (menuCave === 1) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.OK_THANKS_FOR_YOUR_HELP
                    );
                }
                break;
            }
            case 3: {
                if (hasAnyGoldenBowl(player)) {
                    await npc.say(
                        'Greetings Bwana.',
                        'Ah I see you have the golden bowl !',
                        'Would like me to show you how to bless it?'
                    );
                    const bowl = await ask(player, [
                        "Yes, I'd like you to bless my gold bowl.",
                        'No thanks, I need help with something else.'
                    ]);
                    if (bowl === 0) {
                        await gujuoDialogue(player, npc, GJ.BLESS_THE_BOWL);
                    } else if (bowl === 1) {
                        await gujuoDialogue(
                            player,
                            npc,
                            GJ.HOW_GOES_YOUR_QUEST_TO_RELEASE_UNGADULU
                        );
                    }
                } else if (hasAnyBlessedBowl(player)) {
                    await npc.say(
                        'How goes your quest to release Ungadulu Bwana?'
                    );
                    const releaseopt = await ask(player, [
                        'Ungadulu looks strange.',
                        'I need to douse some flames with pure water.',
                        "I'm not sure what to do?",
                        'Can you help me?'
                    ]);
                    if (releaseopt === 0) {
                        await gujuoDialogue(
                            player,
                            npc,
                            GJ.UNGADULU_LOOKS_STRANGE
                        );
                    } else if (releaseopt === 1) {
                        await gujuoDialogue(
                            player,
                            npc,
                            GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                        );
                    } else if (releaseopt === 2) {
                        await gujuoDialogue(
                            player,
                            npc,
                            GJ.IM_NOT_SURE_WHAT_TO_DO
                        );
                    } else if (releaseopt === 3) {
                        await gujuoDialogue(player, npc, GJ.CAN_YOU_HELP_ME);
                    }
                } else {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.HOW_GOES_YOUR_QUEST_TO_RELEASE_UNGADULU
                    );
                }
                break;
            }
            case 4: {
                await npc.say('How goes your Quest to release Ungadulu?');
                const opt16 = await ask(player, [
                    'Ungadulu is free, he was possesed by a demon and I killed it.',
                    'I have the Yommi tree seeds.',
                    'What do I do now?'
                ]);
                if (opt16 === 0) {
                    await gujuoDialogue(player, npc, GJ.UNGADULU_IS_FREE);
                } else if (opt16 === 1) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.I_HAVE_THE_YOMMI_TREE_SEEDS
                    );
                } else if (opt16 === 2) {
                    await gujuoDialogue(player, npc, GJ.WHAT_DO_I_DO_NOW);
                }
                break;
            }
            case 5: {
                await npc.say(
                    'Congratulations on releasing Ungadulu! My people are very pleased...',
                    'How goes the growing of the Yommi tree?'
                );
                const newMenu1 = await ask(player, [
                    'I have germinated the Yommi tree seeds.',
                    'Where is the fertile soil.',
                    'Ok thanks for your help.'
                ]);
                if (newMenu1 === 0) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.I_HAVE_GERMINATED_THE_YOMMI_TREE_SEEDS
                    );
                } else if (newMenu1 === 1) {
                    await gujuoDialogue(player, npc, GJ.WHERE_IS_THE_FETILE_SOIL);
                } else if (newMenu1 === 2) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.OK_THANKS_FOR_YOUR_HELP
                    );
                }
                break;
            }
            case 6: {
                await npc.say(
                    'I have visited Ungadulu in the caves, he is hard at work studying.',
                    'He looks well!',
                    'Have you grown the Yommi tree yet?'
                );
                const opt20 = await ask(
                    player,
                    [
                        'The water pool has dried up and I need more water.',
                        'The Yommi tree died'
                    ],
                    false
                );
                if (opt20 === 0) {
                    await player.say(
                        'The water pool has dried up and I need more pure water.'
                    );
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.THE_WATER_POOL_HAS_DRIED_UP_AND_I_NEED_MORE_WATER
                    );
                } else if (opt20 === 1) {
                    await player.say('The Yommi tree died');
                    await gujuoDialogue(player, npc, GJ.THE_YOMMI_TREE_DIED);
                }
                break;
            }
            case 7: {
                await npc.say(
                    'I have visited Ungadulu in the caves, he is hard at work studying..',
                    'He looks well!',
                    'How is your quest Bwana ?'
                );
                const options = player.cache.cavernous_opening
                    ? [
                          'I have found a way into the caves !',
                          'Where is the source of the spring of pure water ?',
                          'I searched the catacombs thoroughly but found nothing else.',
                          'If I went in search of the source, could you help me?',
                          'Ok thanks for your help.'
                      ]
                    : [
                          'Where can I get more water for the Yommi tree?',
                          'Where is the source of the spring of pure water ?',
                          'I searched the catacombs thoroughly but found nothing else.',
                          'If I went in search of the source, could you help me?',
                          'Ok thanks for your help.'
                      ];
                const opt25 = await ask(player, options);
                if (opt25 === 0) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_CAN_I_GET_MORE_WATER_FOR_THE_YOMMI_TREE
                    );
                } else if (opt25 === 1) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                    );
                } else if (opt25 === 2) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.I_SEARCHED_THE_CATACOMBS_THOROUGHLY_BUT_FOUND_NADA_NIET
                    );
                } else if (opt25 === 3) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                    );
                } else if (opt25 === 4) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.OK_THANKS_FOR_YOUR_HELP
                    );
                }
                break;
            }
            case 8:
            case 9: {
                await npc.say(
                    'Hello Bwana, I am very pleased to see you again.',
                    'Things seem much happier now in the Kharazi Jungle.',
                    'I suspect that it is down to your good doings !'
                );
                const aMenu = await ask(player, [
                    'I found the source of the spring and I got the water.',
                    'I killed the demon again.',
                    'How do I make the totem pole?',
                    'Ok thanks for your help.'
                ]);
                if (aMenu === 0) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.I_FOUND_THE_SOURCE_OF_THE_SPRING_AND_I_GOT_THE_WATER
                    );
                } else if (aMenu === 1) {
                    await gujuoDialogue(player, npc, GJ.I_KILLED_THE_DEMON_AGAIN);
                } else if (aMenu === 2) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.HOW_DO_I_MAKE_THE_TOTEM_POLE
                    );
                } else if (aMenu === 3) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.OK_THANKS_FOR_YOUR_HELP
                    );
                }
                break;
            }
            case 10:
            case 11:
            case -1: {
                if (
                    !player.cache.rewarded_totem &&
                    getStage(player) >= 10
                ) {
                    npc.resetPath && npc.resetPath();
                    await world.sleepTicks(1);
                    await npc.say(
                        'Greetins Bwana,',
                        'We witnessed your fight with the Demon from some distance away.',
                        'My people are so pleased with your heroic efforts.',
                        'Your strength and ability as a warrior are Legendary.'
                    );
                    player.message(
                        'Gujuo offers you an awe inspiring jungle crafted Totem Pole.'
                    );
                    await world.sleepTicks(2);
                    player.inventory.add(GILDED_TOTEM_POLE_ID);
                    player.cache.rewarded_totem = true;
                    await npc.say(
                        'Please accept this as a token of our appreciation.',
                        'Please, now consider yourself a friend of my people.',
                        'And visit us anytime.'
                    );
                    if (has(player, GERMINATED_YOMMI_TREE_SEED_ID)) {
                        while (has(player, GERMINATED_YOMMI_TREE_SEED_ID)) {
                            player.inventory.remove(
                                GERMINATED_YOMMI_TREE_SEED_ID
                            );
                        }
                        await npc.say(
                            "I'll take those Germinated Yommi tree seeds to Ungadulu,",
                            "I'm sure he'll apreciate them."
                        );
                    }
                    await gujuoBye(player, npc);
                    return;
                }
                await npc.say('Good day Bwana.');
                await npc.say(
                    Math.random() < 0.5
                        ? "The Kharazi jungle is especially beautifull today isn't it?"
                        : "The jungle is especially beatifull today isn't it?"
                );
                await npc.say('My village people pass on their thanks to you.');
                let menuOpts;
                if (
                    has(player, GILDED_TOTEM_POLE_ID) ||
                    getStage(player) === -1
                ) {
                    menuOpts = [
                        'Do you have any news?',
                        'Where are all your people.',
                        'Ok thanks for your help.'
                    ];
                } else {
                    menuOpts = [
                        'Do you have any news?',
                        'Where are all your people.',
                        "I've lost the tribal gift you gave me.",
                        'Ok thanks for your help.'
                    ];
                }
                const last = await ask(player, menuOpts);
                if (last === 0) {
                    await npc.say(
                        'Just that everything is fine in the jungle with us.',
                        'And that we are gratefull to you for your help.'
                    );
                } else if (last === 1) {
                    await npc.say(
                        'My people are all happy living in the jungle.',
                        'They are still afraid of strangers and will not approach',
                        'But they are around, none the less.',
                        'Your story has been woven into the fabric of our society.',
                        'And we all sing your many praises Bwana.'
                    );
                } else if (last === 2 || last === 3) {
                    if (
                        last === 2 &&
                        !has(player, GILDED_TOTEM_POLE_ID) &&
                        menuOpts.length === 4
                    ) {
                        await npc.say(
                            "Well, that wasn't very nice of you.",
                            'It took us a long time to make that Totem pole.',
                            'Luckily, I made another one at the same time.'
                        );
                        player.message('Gujuo hands over another totem pole.');
                        player.inventory.add(GILDED_TOTEM_POLE_ID);
                    } else {
                        await gujuoDialogue(
                            player,
                            npc,
                            GJ.OK_THANKS_FOR_YOUR_HELP
                        );
                    }
                }
                break;
            }
        }
    }

    await gujuoDialogueCID(player, npc, cID);
}

async function gujuoDialogueCID(player, npc, cID) {
    const { world } = player;
    switch (cID) {
        case GJ.WHO_IS_VIYELDI: {
            player.message('Gujuo scratches his head for a moment.');
            await world.sleepTicks(2);
            await npc.say(
                'Well, I have heard that name before, perhaps from the eldars.'
            );
            player.message('Gujuo suddenly has an inspiration.');
            await world.sleepTicks(2);
            await npc.say(
                'Ah, yes, I think that is the name of the wizard who first',
                'went in search of the source.',
                'Be wary of him Bwana, he may try to trick you.'
            );
            const viymenu = await ask(player, [
                'I have found a way into the caves !',
                'Do you know anything more about the caves?',
                'Where is the source of the spring of pure water ?',
                'Ok thanks for your help.'
            ]);
            if (viymenu === 0) {
                await gujuoDialogue(player, npc, GJ.I_FOUND_WAY_INTO_CAVES);
            } else if (viymenu === 1) {
                await gujuoDialogue(player, npc, GJ.DO_YOU_KNOW_MORE_ABOUT_CAVES);
            } else if (viymenu === 2) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                );
            } else if (viymenu === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.DO_YOU_KNOW_MORE_ABOUT_CAVES: {
            await npc.say(
                "I am sorry to say that I don't Bwana.",
                'You will need to explore that area,',
                'but use your wits, and you may be lucky.'
            );
            const submenu = await ask(player, [
                'I have found a way into the caves !',
                'Who is Viyeldi?',
                'Where is the source of the spring of pure water ?',
                'Ok thanks for your help.'
            ]);
            if (submenu === 0) {
                await gujuoDialogue(player, npc, GJ.I_FOUND_WAY_INTO_CAVES);
            } else if (submenu === 1) {
                await gujuoDialogue(player, npc, GJ.WHO_IS_VIYELDI);
            } else if (submenu === 2) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                );
            } else if (submenu === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.I_FOUND_WAY_INTO_CAVES: {
            await npc.say(
                "That's great Bwana, good luck with your quest...",
                'and take care!'
            );
            const aaMenu = await ask(player, [
                'Do you know anything more about the caves?',
                'Who is Viyeldi?',
                'Where is the source of the spring of pure water ?',
                'Ok thanks for your help.'
            ]);
            if (aaMenu === 0) {
                await gujuoDialogue(player, npc, GJ.DO_YOU_KNOW_MORE_ABOUT_CAVES);
            } else if (aaMenu === 1) {
                await gujuoDialogue(player, npc, GJ.WHO_IS_VIYELDI);
            } else if (aaMenu === 2) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                );
            } else if (aaMenu === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.I_FOUND_THE_SOURCE_OF_THE_SPRING_AND_I_GOT_THE_WATER: {
            await npc.say(
                'Great Bwana, you are truly a brave warrior.',
                'Now you can try to grow the Yommi tree in earnest and make the totem pole.'
            );
            const bMenu = await ask(player, [
                'I found the source of the spring and I got the water.',
                'I killed the demon again.',
                'How do I make the totem pole?',
                'Ok thanks for your help.'
            ]);
            if (bMenu === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_FOUND_THE_SOURCE_OF_THE_SPRING_AND_I_GOT_THE_WATER
                );
            } else if (bMenu === 1) {
                await gujuoDialogue(player, npc, GJ.I_KILLED_THE_DEMON_AGAIN);
            } else if (bMenu === 2) {
                await gujuoDialogue(player, npc, GJ.HOW_DO_I_MAKE_THE_TOTEM_POLE);
            } else if (bMenu === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.I_KILLED_THE_DEMON_AGAIN: {
            await npc.say(
                'You are indeed very brave Bwana,',
                'We have  noticed a difference in the Kharazi jungle,',
                "The tree's seem to sing again.",
                'And we have you to thank for it.'
            );
            const cMenu = await ask(player, [
                'I found the source of the spring and I got the water.',
                'I killed the demon again.',
                'How do I make the totem pole?',
                'Ok thanks for your help.'
            ]);
            if (cMenu === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_FOUND_THE_SOURCE_OF_THE_SPRING_AND_I_GOT_THE_WATER
                );
            } else if (cMenu === 1) {
                await gujuoDialogue(player, npc, GJ.I_KILLED_THE_DEMON_AGAIN);
            } else if (cMenu === 2) {
                await gujuoDialogue(player, npc, GJ.HOW_DO_I_MAKE_THE_TOTEM_POLE);
            } else if (cMenu === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.HOW_DO_I_MAKE_THE_TOTEM_POLE: {
            await npc.say(
                'You will need to grow the Yommi tree to full height.',
                'And then, before it rots. you must chop it down.',
                'Once you have felled the tree, you need to trim the branches.',
                'And finally, you need to craft the totem pole out of the trunk.',
                "You'll need a very sharp, very tough axe to do all this.",
                'But once you have completed the totem pole.',
                'You will need to use it to replace a totem pole that already exists.',
                "As they're all placed on sacred areas to my people."
            );
            const aMenu = await ask(player, [
                'I found the source of the spring and I got the water.',
                'I killed the demon again.',
                'How do I make the totem pole?',
                'Ok thanks for your help.'
            ]);
            if (aMenu === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_FOUND_THE_SOURCE_OF_THE_SPRING_AND_I_GOT_THE_WATER
                );
            } else if (aMenu === 1) {
                await gujuoDialogue(player, npc, GJ.I_KILLED_THE_DEMON_AGAIN);
            } else if (aMenu === 2) {
                await gujuoDialogue(player, npc, GJ.HOW_DO_I_MAKE_THE_TOTEM_POLE);
            } else if (aMenu === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.WILL_I_NEED_THIS_POTION_I_FEEL_BRAVE_AS_I_AM: {
            await npc.say('I would urge you to take it, Bwana, ');
            if (player.cache.gujuo_potion) {
                await npc.say(
                    'I have heard that the caves are protected by supernatural '
                );
            } else {
                await npc.say(
                    'I have heard that the caves are protected by a supernatural '
                );
            }
            await npc.say(
                'fear that renders even the bravest man to a trembling wreck.',
                'You will need all your wits about you when dealing with',
                'the terrors that exist down there. '
            );
            if (!player.cache.gujuo_potion) {
                player.cache.gujuo_potion = true;
            }
            const opt33 = await ask(player, [
                'Where can I find Snake weed?',
                'Where is the source of the spring of pure water ?',
                'Where can I find ardrigal.',
                'Ok thanks for your help.'
            ]);
            if (opt33 === 0) {
                await gujuoDialogue(player, npc, GJ.WHERE_CAN_I_FIND_SNAKE_WEED);
            } else if (opt33 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                );
            } else if (opt33 === 2) {
                await gujuoDialogue(player, npc, GJ.WHERE_CAN_I_FIND_ARDRIGAL);
            } else if (opt33 === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.WHERE_CAN_I_FIND_ARDRIGAL: {
            await npc.say(
                'Ardrigal is often found growing near to large groups of palms.',
                'Such a collection exists in the North. If you head east out of',
                'Tai Bwo Wannai village you should come across them.',
                'The herb grows in the shade of the palm so check carefully.'
            );
            if (player.cache.gujuo_potion) {
                const opt32 = await ask(player, [
                    'Where can I find Snake weed ?',
                    'Where is the source of the spring of pure water ?',
                    'If I went, could you help me ?',
                    'Will I need this potion? I feel brave enough as I am.',
                    'Ok thanks for your help.'
                ]);
                if (opt32 === 0) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_CAN_I_FIND_SNAKE_WEED
                    );
                } else if (opt32 === 1) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                    );
                } else if (opt32 === 2) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                    );
                } else if (opt32 === 3) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WILL_I_NEED_THIS_POTION_I_FEEL_BRAVE_AS_I_AM
                    );
                } else if (opt32 === 4) {
                    await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
                }
            } else {
                const opt32 = await ask(
                    player,
                    [
                        'Where is the source of the spring of pure water ?',
                        'Where can I find Snake weed?',
                        'If I went in search of the source, could you help me?',
                        'Ok thanks for your help.'
                    ],
                    false
                );
                if (opt32 === 0) {
                    await player.say(
                        'Where is the source of the spring of pure water ?'
                    );
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                    );
                } else if (opt32 === 1) {
                    await player.say('Where can I find Snake weed ?');
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_CAN_I_FIND_SNAKE_WEED
                    );
                } else if (opt32 === 2) {
                    await player.say(
                        'If I went in search of the source, could you help me?'
                    );
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                    );
                } else if (opt32 === 3) {
                    await player.say('Ok thanks for your help.');
                    await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
                }
            }
            break;
        }
        case GJ.WHERE_CAN_I_FIND_SNAKE_WEED: {
            if (player.cache.gujuo_potion) {
                await npc.say(
                    'Snake weed is usually found by swampy marshy areas.',
                    'It is not very common and it may be quite difficult to find.',
                    'There is some marsh to the south of Tai Bwo Wannai village,',
                    'The herb grows near Jungle Vines, so check all around very carefully.'
                );
                const opt31 = await ask(player, [
                    'Where can I find ardrigal.',
                    'Where is the source of the spring of pure water ?',
                    'If I went, could you help me ?',
                    'Will I need this potion? I feel brave enough as I am.',
                    'Ok thanks for your help.'
                ]);
                if (opt31 === 0) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_CAN_I_FIND_ARDRIGAL
                    );
                } else if (opt31 === 1) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                    );
                } else if (opt31 === 2) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                    );
                } else if (opt31 === 3) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WILL_I_NEED_THIS_POTION_I_FEEL_BRAVE_AS_I_AM
                    );
                } else if (opt31 === 4) {
                    await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
                }
            } else {
                await npc.say(
                    'Snake weed is usually found in swampy marshy areas.',
                    'It is not very common and it may be quite difficult to find.',
                    'There is some marsh to the South of Tai Bwo Wannai village.',
                    'Near to where the river becomes the sea.',
                    'The herb grows near Jungle Vines, so check all around very carefully.'
                );
                const opt31 = await ask(player, [
                    'Where is the source of the spring of pure water ?',
                    'Where can I find ardrigal.',
                    'If I went in search of the source, could you help me?',
                    'Ok thanks for your help.'
                ]);
                if (opt31 === 0) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                    );
                } else if (opt31 === 1) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.WHERE_CAN_I_FIND_ARDRIGAL
                    );
                } else if (opt31 === 2) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                    );
                } else if (opt31 === 3) {
                    await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
                }
            }
            break;
        }
        default:
            await gujuoDialogueCID2(player, npc, cID);
            break;
    }
}

async function gujuoDialogueCID2(player, npc, cID) {
    const { world } = player;
    switch (cID) {
        case GJ.I_SEARCHED_THE_CATACOMBS_THOROUGHLY_BUT_FOUND_NADA_NIET: {
            await npc.say(
                'Perhaps the location has been hidden or buried under a rubble?',
                'These stories were told to me as a child by the village elders.',
                'They were probably meant to frighten us away from the caves.',
                'It could all just be a myth !',
                'You should perhaps talk to Ungadulu, he may know something ?',
                'Perhaps there is another way to get to the source of the stream?',
                'But I am not sure where it is...'
            );
            const options = ['Where is the source of the spring of pure water ?'];
            if (player.cache.gujuo_potion) {
                options.push(
                    'If I went in search of the source, could you help me?'
                );
            } else {
                options.push('If I went, could you help me?');
            }
            options.push('Ok thanks for your help.');
            const opt30 = await ask(player, options, false);
            if (opt30 === 0) {
                await player.say(
                    'Where is the source of the spring of pure water ?'
                );
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                );
            } else if (opt30 === 1) {
                await player.say('If I went, could you help me?');
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                );
            } else if (opt30 === 2) {
                await player.say('Ok thanks for your help.');
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME: {
            await npc.say(
                'Well, if you are sure you want to go.',
                'I will assist as much as I can.',
                'You will need the bravery of the Jungle lion,',
                'if you are to go into that forbidden place.',
                'I can give you the recipe for a potion to help with that.'
            );
            if (player.cache.gujuo_potion) {
                await npc.say(
                    'You will need to find two herbs, Snake weed and ardrigal.',
                    'Add them both to a vial of water,',
                    'and you will walk with the bravery of the lion.'
                );
            } else {
                await npc.say(
                    'You will need to find two herbs, Snake weed and Ardrigal.',
                    'Add them both to a vial of water,',
                    'and you will walk with the bravery of the Kharazi lion.'
                );
            }
            const opt29 = await ask(
                player,
                [
                    'Where can I find Snake weed?',
                    'Where is the source of the spring of pure water ?',
                    'Where can I find ardrigal.',
                    'Will I need this potion? I feel brave enough as I am.',
                    'Ok thanks for your help.'
                ],
                false
            );
            if (opt29 === 0) {
                await player.say('Where can I find Snake weed ?');
                await gujuoDialogue(player, npc, GJ.WHERE_CAN_I_FIND_SNAKE_WEED);
            } else if (opt29 === 1) {
                await player.say(
                    'Where is the source of the spring of pure water ?'
                );
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                );
            } else if (opt29 === 2) {
                await player.say('Where can I find ardrigal.');
                await gujuoDialogue(player, npc, GJ.WHERE_CAN_I_FIND_ARDRIGAL);
            } else if (opt29 === 3) {
                await player.say(
                    'Will I need this potion? I feel brave enough as I am.'
                );
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WILL_I_NEED_THIS_POTION_I_FEEL_BRAVE_AS_I_AM
                );
            } else if (opt29 === 4) {
                await player.say('Ok thanks for your help.');
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.OK_I_WONT_GO: {
            await npc.say(
                'I understand Bwana,',
                'It would be a waste of a perfectly good life.',
                'We will try to defeat the evil spirits in other ways ?',
                'But I am not sure how we will do that.'
            );
            const optNotGo = await ask(player, [
                'If I went, could you help me?',
                'Ok thanks for your help.'
            ]);
            if (optNotGo === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                );
            } else if (optNotGo === 1) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.WHERE_CAN_I_GET_MORE_WATER_FOR_THE_YOMMI_TREE: {
            await npc.say(
                'If the pool of sacred water has dried up,',
                'there may be a way to get to the source of the spring.',
                'But it is said to be very, very dangerous.'
            );
            const opt27 = await ask(player, [
                'Where is the source of the spring of pure water ?',
                'If I went in search of the source, could you help me?',
                'Ok thanks for your help.'
            ]);
            if (opt27 === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2
                );
            } else if (opt27 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                );
            } else if (opt27 === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.THE_WATER_POOL_HAS_DRIED_UP_AND_I_NEED_MORE_WATER: {
            await npc.say(
                'This is indeed a bad omen Bwana, that pool is sacred to us...',
                'I have seen it and it is full of filth, it is not natural...',
                'I suspect that some evil is at work here.'
            );
            const opt24 = await ask(player, [
                'Does the Yommi tree have to have pure water?',
                'Where is the source of the spring of pure water ?'
            ]);
            if (opt24 === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.DOES_THE_YOMMI_TREE_HAVE_TO_HAVE_PURE_WATER
                );
            } else if (opt24 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER
                );
            }
            break;
        }
        case GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER: {
            player.message('Gujuo looks very uncomfortable...');
            await world.sleepTicks(2);
            await npc.say(
                'I am not sure...',
                'But I have heard that deeper in the Catacombs where you found Ungadulu,',
                'deep underground,',
                'There is a terrible place guarded by the spirits of the undead.',
                'Since they died trying to find the source of the stream,',
                'They are cursed to guard it for all eternity.',
                'The first to seek the source was said to be a high level sorcerer.',
                'He created a powerfull spell in the caves,',
                'Now, all those who venture near are overcome by a supernatural fear...',
                'With all my heart Bwana, I would never go near such a place.'
            );
            if (getStage(player) === 6) {
                setStage(player, 7);
            }
            const opt23 = await ask(player, [
                "Ok, I won't go...",
                'If I went, could you help me?',
                'I searched the catacombs thoroughly but found nothing else..'
            ]);
            if (opt23 === 0) {
                await gujuoDialogue(player, npc, GJ.OK_I_WONT_GO);
            } else if (opt23 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                );
            } else if (opt23 === 2) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_SEARCHED_THE_CATACOMBS_THOROUGHLY_BUT_FOUND_NADA_NIET
                );
            }
            break;
        }
        case GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER2: {
            player.message('Gujuo looks very uncomfortable...');
            await world.sleepTicks(2);
            await npc.say(
                'I am not sure...',
                'But I have heard that deeper in the Catacombs where you found Ungadulu,',
                'deep underground,',
                'There is a terrible place guarded by the spirits of the undead.',
                'Since they died trying to find the source of the stream,',
                'They are cursed to guard it for all eternity.',
                'The first to seek the source was said to be a high level sorcerer.',
                'He created a powerfull spell in the caves,',
                'Now, all those who venture near are overcome by a supernatural fear...',
                'With all my heart Bwana, I would never go near such a place.'
            );
            const opt26 = await ask(player, [
                'If I went in search of the source, could you help me?',
                'I searched the catacombs thoroughly but found nothing else..',
                'Ok thanks for your help.'
            ]);
            if (opt26 === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.IF_I_WENT_IN_SEARCH_OF_THE_SOURCE_COULD_U_HELP_ME
                );
            } else if (opt26 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_SEARCHED_THE_CATACOMBS_THOROUGHLY_BUT_FOUND_NADA_NIET
                );
            } else if (opt26 === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.DOES_THE_YOMMI_TREE_HAVE_TO_HAVE_PURE_WATER: {
            await npc.say(
                'Yes, it is a magical tree and can only survive on the water ',
                'from the sacred pool. This is indeed a tragedy...'
            );
            const opt22 = await ask(player, [
                'Where is the source of the spring of pure water ?',
                'Ok thanks for your help.'
            ]);
            if (opt22 === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.WHERE_IS_THE_SOURCE_OF_THE_SPRING_OF_PURE_WATER
                );
            } else if (opt22 === 1) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.THE_YOMMI_TREE_DIED: {
            await npc.say(
                'Well, it requires pure sacred water for it to grow.',
                'It is a very special tree...'
            );
            const opt21 = await ask(player, [
                'The sacred water pool has dried up and I need more water.',
                'Does the Yommi tree have to have pure water?'
            ]);
            if (opt21 === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.THE_WATER_POOL_HAS_DRIED_UP_AND_I_NEED_MORE_WATER
                );
            } else if (opt21 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.DOES_THE_YOMMI_TREE_HAVE_TO_HAVE_PURE_WATER
                );
            }
            break;
        }
        case GJ.I_HAVE_GERMINATED_THE_YOMMI_TREE_SEEDS: {
            await npc.say(
                'Well done Bwana,',
                'With the blessings of the gods we will soon have our Totem Pole.',
                'Bwana, you now need to plant the seed in the fertile earth.'
            );
            const newMenu3 = await ask(player, [
                'Where is the fertile soil.',
                'Ok thanks for your help.'
            ]);
            if (newMenu3 === 0) {
                await gujuoDialogue(player, npc, GJ.WHERE_IS_THE_FETILE_SOIL);
            } else if (newMenu3 === 1) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.WHERE_IS_THE_FETILE_SOIL: {
            await npc.say(
                'You should be able to find many places where the ',
                'ground is fertile in the Kharazi Jungle.',
                'Planting the Yommi tree seeds in fertile soil gives it a good ',
                'chance to grow. My people are trying to grow the Yommi tree as well.',
                'But so far we have not met with any success.',
                'If you find a rotten tree or what looks like a rotten totem pole.',
                "You'll need to remove it yourself to get to the fertile soil.",
                'It will take a very sharp, robust axe to do it.'
            );
            const newMenu2 = await ask(player, [
                'I have germinated the Yommi tree seeds.',
                'Ok thanks for your help.'
            ]);
            if (newMenu2 === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_HAVE_GERMINATED_THE_YOMMI_TREE_SEEDS
                );
            } else if (newMenu2 === 1) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        default:
            await gujuoDialogueCID3(player, npc, cID);
            break;
    }
}

async function gujuoDialogueCID3(player, npc, cID) {
    const { world } = player;
    switch (cID) {
        case GJ.UNGADULU_IS_FREE: {
            await npc.say(
                'You are indeed brave Bwana, a truly fearsome warrior to take on ',
                'Such an enemy! Well Done!'
            );
            const opt19 = await ask(player, [
                'I have the Yommi tree seeds.',
                'What do I do now?',
                'Ok thanks for your help.'
            ]);
            if (opt19 === 0) {
                await gujuoDialogue(player, npc, GJ.I_HAVE_THE_YOMMI_TREE_SEEDS);
            } else if (opt19 === 1) {
                await gujuoDialogue(player, npc, GJ.WHAT_DO_I_DO_NOW);
            } else if (opt19 === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.I_HAVE_THE_YOMMI_TREE_SEEDS: {
            if (has(player, YOMMI_TREE_SEED_ID)) {
                await npc.say(
                    "That's great Bwana. Now you just need to germinate ",
                    'the seeds and then plant them in some fertile soil.',
                    "I'm sure that Ungadulu has explained all this to you already."
                );
                const opt18 = await ask(player, [
                    'Ungadulu is free, he was possesed by a demon and I killed it.',
                    'What do I do now?',
                    'Ok thanks for your help.'
                ]);
                if (opt18 === 0) {
                    await gujuoDialogue(player, npc, GJ.UNGADULU_IS_FREE);
                } else if (opt18 === 1) {
                    await gujuoDialogue(player, npc, GJ.WHAT_DO_I_DO_NOW);
                } else if (opt18 === 2) {
                    await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
                }
            } else {
                await npc.say(
                    "Hmmm, well I don't see them...",
                    'Why not go and see Ungadulu and see if you can get some more.'
                );
            }
            break;
        }
        case GJ.WHAT_DO_I_DO_NOW: {
            await npc.say(
                'If you have the Yommi tree seeds, you will need to germinate them.',
                'You need to place the seeds into pure water.',
                'And they will begin to sprout tiny shoots...',
                'You can then plant them in fertile soil.'
            );
            const opt17 = await ask(player, [
                'Ungadulu is free, he was possesed by a demon and I killed it.',
                'I have the Yommi tree seeds.',
                'Ok thanks for your help.'
            ]);
            if (opt17 === 0) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_IS_FREE);
            } else if (opt17 === 1) {
                await gujuoDialogue(player, npc, GJ.I_HAVE_THE_YOMMI_TREE_SEEDS);
            } else if (opt17 === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.SORRY_IT_WAS_A_MISTAKE: {
            await npc.say(
                'Very good Bwana...however, it begs the question...',
                'What are you doing in the Kharazi jungle'
            );
            const opt = await ask(player, [
                'I want to develop friendly relations with your people.',
                "I'm lost, can you show me the way out?"
            ]);
            if (opt === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_WANT_TO_DEVELOP_FRIENDLY_RELATIONS
                );
            } else if (opt === 1) {
                await gujuoDialogue(player, npc, GJ.IM_LOST);
            }
            break;
        }
        case GJ.IM_LOST: {
            await npc.say(
                'Yes Bwana...',
                'I can take you to the edge of the Kharazi jungle.',
                'Would you like me to take you?'
            );
            const opt2 = await ask(player, ['Yes Please...', 'No thanks...']);
            if (opt2 === 0) {
                await npc.say('Follow me...');
                player.message('@que@Gujuo takes you out of the jungle...');
                await world.sleepTicks(2);
                player.teleport(397, 865);
                npc.teleport(398, 865);
                await world.sleepTicks(1);
                await npc.say('');
                player.message(
                    '@que@Gujuo disapears into the Kharazi jungle as swiftly as he appeared...'
                );
                await world.sleepTicks(3);
                try {
                    world.removeEntity('npcs', npc);
                } catch (e) {
                    // already gone
                }
            } else if (opt2 === 1) {
                await gujuoDialogue(player, npc, GJ.NO_THANKS);
            }
            break;
        }
        case GJ.NO_THANKS: {
            await npc.say(
                'As you wish...',
                'Again, Bwana, What is it that brings you to the Kharazi jungle?'
            );
            const opt3 = await ask(player, [
                'I want to develop friendly relations with your people.',
                "I'm lost, can you show me the way out?"
            ]);
            if (opt3 === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_WANT_TO_DEVELOP_FRIENDLY_RELATIONS
                );
            } else if (opt3 === 1) {
                await gujuoDialogue(player, npc, GJ.IM_LOST);
            }
            break;
        }
        case GJ.I_WILL_RELEASE_UNGADULU:
            await npc.say(
                'You make me very happy Bwana...',
                'In the North western part of this Kharazi jungle area, near some great cliffs.',
                'You will find three rocks that form a triangle shape.',
                'They are flanked by the palm which also forms the divine geometry',
                'You will find that they cover a small entrance...',
                'That is where Ungadulu is being kept,',
                'If you can free him, he will entrust to you some of the sacred Yommi tree seeds.'
            );
            if (!player.cache.legends_cavern) {
                player.cache.legends_cavern = true;
            }
            // the 1->2 transition happens when the player crawls through the
            // surface crevice, which consumes this cache.
            await gujuoBye(player, npc);
            break;
        case GJ.I_WANT_TO_DEVELOP_FRIENDLY_RELATIONS: {
            player.message('Gujuo smiles and shakes your hand warmly...');
            await world.sleepTicks(2);
            await npc.say(
                'Very good Bwana...this is indeed a very pleasant gesture.',
                'However, my people are very distributed throughout the Kharazi jungle.'
            );
            const opt5 = await ask(player, [
                'Can you get your people together ?',
                "I'm lost, can you show me the way out?"
            ]);
            if (opt5 === 0) {
                await npc.say(
                    'All of my people normally congregate around a totem pole, ',
                    'But ours has been polluted by an evil spirit.',
                    'It has been transformed, ',
                    'and now our people are afraid to approach it...',
                    'We tried to drive the evil spirit out of the totem pole,',
                    'but it does not seem to work.'
                );
                const opt6 = await ask(player, [
                    'What can we do instead then?',
                    "I'm lost, can you show me the way out?"
                ]);
                if (opt6 === 0) {
                    await npc.say(
                        'We could try to make a new totem pole.',
                        'However, we need to make it from the trunk of the ',
                        'sacred Yommi tree. '
                    );
                    const opt7 = await ask(
                        player,
                        [
                            'How do we make the totem pole?',
                            "I'm lost, can you show me the way out?"
                        ],
                        false
                    );
                    if (opt7 === 0) {
                        await player.say('How do we make a totem pole?');
                        await npc.say(
                            'First we need to plant a sacred Yommi tree..',
                            'It is a magical tree of great power, however, our Shaman..',
                            'Ungadulu is the only person with the seeds for this tree.'
                        );
                        player.message(
                            "@que@Gujuo's expression changes to sadness..."
                        );
                        await world.sleepTicks(2);
                        await npc.say(
                            'And I fear that it is impossible to get some seeds.',
                            'He is being held against his will in some caves in ',
                            'north western part of the Kharazi jungle.'
                        );
                        const opt8 = await ask(player, [
                            'I will release Ungadulu...',
                            'Oh well, sorry to hear about that ?'
                        ]);
                        if (opt8 === 0) {
                            await gujuoDialogue(
                                player,
                                npc,
                                GJ.I_WILL_RELEASE_UNGADULU
                            );
                        } else if (opt8 === 1) {
                            player.message(
                                "@que@Gujuo's expression of sadness deepens..."
                            );
                            await world.sleepTicks(2);
                            await npc.say(
                                'Yes Bwana, perhaps we will become friends sometime in the future...',
                                'But not today...',
                                'Ungadulu has problably lost his mind anyway... ',
                                'it is most likely a lost cause...'
                            );
                            const opt9 = await ask(player, [
                                'I will release Ungadulu...',
                                'Ok thanks for your help.'
                            ]);
                            if (opt9 === 0) {
                                await gujuoDialogue(
                                    player,
                                    npc,
                                    GJ.I_WILL_RELEASE_UNGADULU
                                );
                            } else if (opt9 === 1) {
                                await gujuoDialogue(
                                    player,
                                    npc,
                                    GJ.OK_THANKS_FOR_YOUR_HELP
                                );
                            }
                        }
                    } else if (opt7 === 1) {
                        await player.say(
                            "I'm lost, can you show me the way out?"
                        );
                        await gujuoDialogue(player, npc, GJ.IM_LOST);
                    }
                } else if (opt6 === 1) {
                    await gujuoDialogue(player, npc, GJ.IM_LOST);
                }
            } else if (opt5 === 1) {
                await gujuoDialogue(player, npc, GJ.IM_LOST);
            }
            break;
        }
        case GJ.OK_THANKS_FOR_YOUR_HELP:
            await npc.say('You are more than welcome bwana...');
            await gujuoBye(player, npc);
            break;
        default:
            await gujuoDialogueCID4(player, npc, cID);
            break;
    }
}

async function gujuoDialogueCID4(player, npc, cID) {
    switch (cID) {
        case GJ.UNGADULU_LOOKS_STRANGE: {
            await npc.say(
                'Be wary Bwana.',
                'There are many unknown spirits that reside in these dark areas.',
                'You may be tricked by an unknown force...'
            );
            const newMenu = await ask(player, [
                'I need to douse some flames with pure water.',
                'What kind of unknown forces...',
                'Ok thanks for your help.'
            ]);
            if (newMenu === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                );
            } else if (newMenu === 1) {
                await gujuoDialogue(player, npc, GJ.UNKNOWN_FORCES);
            } else if (newMenu === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.UNGADULU_CALLED_ME_VACU: {
            player.message('@que@Gujuo shakes his head slightly in sadness.');
            await player.world.sleepTicks(2);
            await npc.say(
                'It seems that Ungadulu has started to lose his senses.',
                'In our native and ancient history, ',
                'the Vacu were the servants of the evil spirits from the underworld.',
                'Originally they were priests who had summoned spirits of our ancestors,',
                'but they were enslaved...along with the rest of the village.',
                'But this is ancient history and is most likely a myth,',
                'a story told to frighten poorly behaved children...'
            );
            const m = await ask(player, [
                'Ungadulu looks strange.',
                'I need to douse some flames with pure water.',
                'Ok thanks for your help.'
            ]);
            if (m === 0) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_LOOKS_STRANGE);
            } else if (m === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                );
            } else if (m === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.UNKNOWN_FORCES: {
            await npc.say(
                'Strange spirits that our forefathers summoned for visions.',
                'They haunt the underworld and caves that exist in this area.',
                'Take not anything as it might first appear.'
            );
            const check = await ask(player, [
                'I need to douse some flames with pure water.',
                'How did they summon the spirits?',
                'Ok thanks for your help.'
            ]);
            if (check === 0) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                );
            } else if (check === 1) {
                await npc.say(
                    'I am unlearned in such matters.',
                    'But I am told of sacred patterns that are scored on the ground',
                    'to bind the spirit and confine it...',
                    'But that is all I know.'
                );
                const nextMenu = await ask(player, [
                    'Ungadulu looks strange.',
                    'I need to douse some flames with pure water.',
                    'Ok thanks for your help.'
                ]);
                if (nextMenu === 0) {
                    await gujuoDialogue(player, npc, GJ.UNGADULU_LOOKS_STRANGE);
                } else if (nextMenu === 1) {
                    await gujuoDialogue(
                        player,
                        npc,
                        GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                    );
                } else if (nextMenu === 2) {
                    await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
                }
            } else if (check === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER: {
            await npc.say(
                'This sounds very strange Bwana...but maybe I can help.',
                'There is a pool of water that is sacred to us...',
                'It is located in the middle of the Kharazi jungle ',
                'The water contains special properties but it can only',
                'be contained in a blessed vessel made from metal of the sun.',
                'The water is difficult to get to, ',
                'but I am sure you will manage to claim some.'
            );
            const opt11 = await ask(player, [
                'Metal of the sun, what is that?',
                'Ungadulu looks strange.',
                'What kind of a vessel?',
                'Ok thanks for your help.'
            ]);
            if (opt11 === 0) {
                await gujuoDialogue(player, npc, GJ.METAL_OF_SUN_WHAT_IS_THAT);
            } else if (opt11 === 1) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_LOOKS_STRANGE);
            } else if (opt11 === 2) {
                await gujuoDialogue(player, npc, GJ.WHAT_KIND_OF_A_VESSEL);
            } else if (opt11 === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.WHAT_KIND_OF_A_VESSEL: {
            await npc.say(
                'A vessel made of sun metal, but it can be of any shape.',
                'However, it must be blessed.'
            );
            if (!has(player, ROUGH_SKETCH_OF_A_BOWL_ID)) {
                player.message(
                    '@que@Gujuo takes out a small scroll and some charcoal and draws a rough sketch.'
                );
                await player.world.sleepTicks(2);
                player.message(
                    '@que@When he has finished, he gives the sketch to you.'
                );
                await player.world.sleepTicks(2);
                player.inventory.add(ROUGH_SKETCH_OF_A_BOWL_ID);
                await npc.say(
                    'Here, have this as an example...I pray that it will help you.'
                );
            } else {
                await npc.say(
                    'Similar to the picture I have already given you.'
                );
            }
            const opt12 = await ask(player, [
                'Ungadulu looks strange.',
                'I need to douse some flames with pure water.',
                'How do I bless the bowl.',
                'Ok thanks for your help.'
            ]);
            if (opt12 === 0) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_LOOKS_STRANGE);
            } else if (opt12 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                );
            } else if (opt12 === 2) {
                await gujuoDialogue(player, npc, GJ.HOW_DO_I_BLESS_THE_BOWL);
            } else if (opt12 === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.METAL_OF_SUN_WHAT_IS_THAT: {
            await npc.say(
                'It is a bright and precious metal that is very rare.',
                'It is the same glorious colour as the sun and it never loses',
                "it's wonderous lustre...",
                'A blessed vessel made of this metal protects the purity of the water.'
            );
            const opt13 = await ask(player, [
                'Where can I find this metal?',
                'What kind of a vessel?',
                'Ok thanks for your help.'
            ]);
            if (opt13 === 0) {
                await gujuoDialogue(player, npc, GJ.WHERE_CAN_I_FIND_THIS_METAL);
            } else if (opt13 === 1) {
                await gujuoDialogue(player, npc, GJ.WHAT_KIND_OF_A_VESSEL);
            } else if (opt13 === 2) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.HOW_DO_I_BLESS_THE_BOWL: {
            await npc.say(
                'When you have made a bowl, bring it to me and I will help.',
                'But you need to ensure that you are devout and have faith.',
                'Your ability in prayer will be thoroughly tested.'
            );
            const opt14 = await ask(player, [
                'Ungadulu looks strange.',
                'I need to douse some flames with pure water.',
                'What kind of a vessel?',
                'Ok thanks for your help.'
            ]);
            if (opt14 === 0) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_LOOKS_STRANGE);
            } else if (opt14 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                );
            } else if (opt14 === 2) {
                await gujuoDialogue(player, npc, GJ.WHAT_KIND_OF_A_VESSEL);
            } else if (opt14 === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.WHERE_CAN_I_FIND_THIS_METAL: {
            await npc.say(
                'It is found in some rocks and must be extracted.',
                'It has a magical ability over some men and women, it can posess them.',
                'They fall within it\'s power and seek to gain more and more of this',
                'precious metal for themselves.',
                'A blessed vessel made of this metal protects the purity of the water.'
            );
            const opt15 = await ask(player, [
                'Metal of the sun, what is that?',
                'Ungadulu looks strange.',
                'What kind of a vessel?',
                'Ok thanks for your help.'
            ]);
            if (opt15 === 0) {
                await gujuoDialogue(player, npc, GJ.METAL_OF_SUN_WHAT_IS_THAT);
            } else if (opt15 === 1) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_LOOKS_STRANGE);
            } else if (opt15 === 2) {
                await gujuoDialogue(player, npc, GJ.WHAT_KIND_OF_A_VESSEL);
            } else if (opt15 === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.HOW_GOES_YOUR_QUEST_TO_RELEASE_UNGADULU: {
            await npc.say('How goes your quest to release Ungadulu Bwana?');
            const opt10 = await ask(player, [
                'Ungadulu looks strange.',
                'I need to douse some flames with pure water.',
                "Ungadulu called me 'Vacu', what does that mean?",
                'Ok thanks for your help.'
            ]);
            if (opt10 === 0) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_LOOKS_STRANGE);
            } else if (opt10 === 1) {
                await gujuoDialogue(
                    player,
                    npc,
                    GJ.I_NEED_TO_DOUSE_SOME_FLAMES_WITH_PURE_WATER
                );
            } else if (opt10 === 2) {
                await gujuoDialogue(player, npc, GJ.UNGADULU_CALLED_ME_VACU);
            } else if (opt10 === 3) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.CAN_YOU_HELP_ME: {
            await npc.say(
                'I am sorry Bwana, but I have no experience of these things.',
                'I am sure that I would get in your way...'
            );
            const helpopts = await ask(player, [
                "I'm not sure what to do?",
                'Ok thanks for your help.'
            ]);
            if (helpopts === 0) {
                await gujuoDialogue(player, npc, GJ.IM_NOT_SURE_WHAT_TO_DO);
            } else if (helpopts === 1) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.IM_NOT_SURE_WHAT_TO_DO: {
            await npc.say(
                "Don't you need to take some pure water down to the caves?",
                "If you haven't got the water yet, try getting some from the pool."
            );
            const sureopts = await ask(player, [
                'Can you help me?',
                'Ok thanks for your help.'
            ]);
            if (sureopts === 0) {
                await gujuoDialogue(player, npc, GJ.CAN_YOU_HELP_ME);
            } else if (sureopts === 1) {
                await gujuoDialogue(player, npc, GJ.OK_THANKS_FOR_YOUR_HELP);
            }
            break;
        }
        case GJ.BLESS_THE_BOWL:
            await gujuoBlessBowl(player, npc);
            break;
    }
}

// OpenRSC Gujuo.onUseNpc: use an (unblessed) golden bowl on Gujuo -> bless flow.
async function gujuoUse(player, npc, item) {
    if (
        item.id === GOLDEN_BOWL_ID ||
        item.id === GOLDEN_BOWL_WITH_PURE_WATER_ID ||
        item.id === GOLDEN_BOWL_WITH_PLAIN_WATER_ID
    ) {
        await npc.say(
            'Aha Bwana, well done, you have made the golden bowl.',
            'Would you like me to show you how to bless it.'
        );
        const menu = await ask(
            player,
            ["Yes, I'd like to bless my golden bowl.", "No thanks, I'll wait."],
            false
        );
        if (menu === 0) {
            await gujuoBlessBowl(player, npc);
        } else if (menu === 1) {
            await player.say("No thanks, I'll wait.");
            await npc.say('Very well, let me know when you want to try?');
            await gujuoDialogue(
                player,
                npc,
                GJ.HOW_GOES_YOUR_QUEST_TO_RELEASE_UNGADULU
            );
        }
        return true;
    }
    return false;
}

// Ungadulu: the Shaman, his evil form, the demon summon.

const UN = {
    EXTINGUISH_THE_FLAMES: 0,
    WHO_ARE_YOU: 1,
    WHERE_DO_I_GET_PURE_WATER_FROM: 2,
    HOW_DO_I_GET_OUT_OF_HERE: 3,
    WHAT_WILL_YOU_DO_NOW: 4,
    COLLECT_SOME_YOMMI_SEEDS_FOR_GUJUO: 5,
    HOW_DO_I_GROW_THE_YOMMI_TREE: 6,
    WHAT_DO_YOU_KNOW_ABOUT_THE_PURE_WATER: 7,
    WHERE_DO_I_PLANT_THE_SEEDS: 8,
    I_HAVE_GERMINATED_THE_SEEDS: 9,
    I_NEED_MORE_YOMMI_TREE_SEEDS: 10,
    WHERE_CAN_I_GET_MORE_PURE_WATER: 11,
    THE_MAGIC_POOL_HAS_DRIED_UP: 12,
    I_AM_ON_A_QUEST_TO_GET_MORE_PURE_WATER: 13,
    WHAT_DO_YOU_KNOW_ABOUT_THE_SOURCE_OF_THE_SACRED_WATER: 14,
    I_HAVE_KILLED_VIYELDI: 15,
    I_MET_A_SPIRIT_IN_THE_VIYELDI_CAVES: 16,
    THE_SPIRIT_TOLD_ME_TO_KILL_VIYELDI: 17,
    DO_YOU_KNOW_ANYTHING_ABOUT_DAGGERS: 18,
    I_HAVE_KILLED_THE_SPIRIT: 19,
    I_HAVE_GOT_THE_WATER: 20,
    WHAT_DO_I_DO_NOW: 21,
    OK_THANKS: 22,
    MADE_TOTEM_POLE: 23,
    WHAT_DO_TOTEM_POLE: 24,
    KILLED_DEMON_AGAIN: 25,
    REPLACED_EVIL_TOTEM: 26
};

// OpenRSC evilUngadulu(player, n): transform, drain stats, revert.
async function evilUngadulu(player, npc) {
    const { world } = player;
    await npc.say('Ha Ha ha Vacu...now you will be my pawn...');
    player.message('The Shaman starts an incantation...');
    await world.sleepTicks(2);
    npc = changeNpc(player, npc, EVIL_UNGADULU_ID);
    await npc.say('Iles Resti Yam Darkus Spiritus Possesi Yanai..');
    player.message('You feel a strange power coming over you...');
    await world.sleepTicks(2);
    player.damage(5);
    setCurrentLevel(player, 'attack', currentLevel(player, 'attack') - 5);
    setCurrentLevel(player, 'defense', currentLevel(player, 'defense') - 5);
    setCurrentLevel(player, 'strength', currentLevel(player, 'strength') - 5);
    player.message('The Shaman seems to get stronger...');
    await world.sleepTicks(2);
    player.message('The Shaman seems to return to normal...');
    await world.sleepTicks(2);
    npc = changeNpc(player, npc, UNGADULU_ID);
    await npc.say('Run, run away...', 'Run like the leapard bwana...');
}

async function ungaduluTalk(player, npc, cID) {
    const { world } = player;
    if (npc.id !== UNGADULU_ID) {
        return;
    }

    if (cID === -1) {
        switch (getStage(player)) {
            case 2:
            case 3:
                await npc.say('Please run for your life...');
                player.message('The Shaman seems to be fighting an inner battle.');
                await world.sleepTicks(2);
                await npc.say('Go...go now...!');
                npc = changeNpc(player, npc, EVIL_UNGADULU_ID);
                player.message('The Shaman seems to change in front of your eyes...');
                await world.sleepTicks(2);
                await evilUngadulu(player, npc);
                break;
            case 4: {
                await npc.say(
                    'Greetings bwana...many thanks for defeating the demon...',
                    'and releasing me from this dreadful possesion...',
                    'Pray tell me, what can I do to repay this great favour?'
                );
                const menu = await ask(player, [
                    'I need to collect some Yommi tree seeds for Gujuo.',
                    'How do I get out of here?',
                    'Ok, thanks...'
                ]);
                if (menu === 0) {
                    await ungaduluTalk(
                        player,
                        npc,
                        UN.COLLECT_SOME_YOMMI_SEEDS_FOR_GUJUO
                    );
                } else if (menu === 1) {
                    await ungaduluTalk(player, npc, UN.HOW_DO_I_GET_OUT_OF_HERE);
                } else if (menu === 2) {
                    await ungaduluTalk(player, npc, UN.OK_THANKS);
                }
                break;
            }
            case 5: {
                await npc.say(
                    'Hello Bwana, how goes your quest with the Yommi tree?'
                );
                const opt = await ask(player, [
                    'I have germinated the seeds.',
                    'Where do I plant the seeds?',
                    'I need more Yommi tree seeds.'
                ]);
                if (opt === 0) {
                    await ungaduluTalk(player, npc, UN.I_HAVE_GERMINATED_THE_SEEDS);
                } else if (opt === 1) {
                    await ungaduluTalk(player, npc, UN.WHERE_DO_I_PLANT_THE_SEEDS);
                } else if (opt === 2) {
                    await ungaduluTalk(
                        player,
                        npc,
                        UN.I_NEED_MORE_YOMMI_TREE_SEEDS
                    );
                }
                break;
            }
            case 6: {
                await npc.say(
                    'Hello Bwana, how goes your quest with the Yommi tree?'
                );
                const newMenu4 = await ask(player, [
                    'The magic pool has dried up and I need some more pure water.',
                    'Where can I get more pure water?',
                    'I need more Yommi tree seeds.'
                ]);
                if (newMenu4 === 0) {
                    await ungaduluTalk(player, npc, UN.THE_MAGIC_POOL_HAS_DRIED_UP);
                } else if (newMenu4 === 1) {
                    await ungaduluTalk(
                        player,
                        npc,
                        UN.WHERE_CAN_I_GET_MORE_PURE_WATER
                    );
                } else if (newMenu4 === 2) {
                    await ungaduluTalk(
                        player,
                        npc,
                        UN.I_NEED_MORE_YOMMI_TREE_SEEDS
                    );
                }
                break;
            }
            case 7: {
                if (player.cache.met_spirit && player.cache.killed_viyeldi) {
                    await npc.say(
                        'Hello Bwana, how goes your quest to find the water ?'
                    );
                    const newMenu9 = await ask(player, [
                        'I have killed Viyeldi!',
                        'I met a spirit in the Viyeldi Caves.',
                        'The spirit told me to kill Viyeldi.',
                        'Do you know anything about daggers?',
                        'I need more Yommi tree seeds.'
                    ]);
                    if (newMenu9 === 0) {
                        await ungaduluTalk(player, npc, UN.I_HAVE_KILLED_VIYELDI);
                    } else if (newMenu9 === 1) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_MET_A_SPIRIT_IN_THE_VIYELDI_CAVES
                        );
                    } else if (newMenu9 === 2) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.THE_SPIRIT_TOLD_ME_TO_KILL_VIYELDI
                        );
                    } else if (newMenu9 === 3) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.DO_YOU_KNOW_ANYTHING_ABOUT_DAGGERS
                        );
                    } else if (newMenu9 === 4) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_NEED_MORE_YOMMI_TREE_SEEDS
                        );
                    }
                } else if (player.cache.met_spirit && !player.cache.killed_viyeldi) {
                    await npc.say(
                        'Hello Bwana, how goes your quest to find the water ?'
                    );
                    const newMenu9 = await ask(player, [
                        'I met a spirit in the Viyeldi Caves.',
                        'The spirit told me to kill Viyeldi.',
                        'Do you know anything about daggers?',
                        'I need more Yommi tree seeds.',
                        'Ok, thanks...'
                    ]);
                    if (newMenu9 === 0) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_MET_A_SPIRIT_IN_THE_VIYELDI_CAVES
                        );
                    } else if (newMenu9 === 1) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.THE_SPIRIT_TOLD_ME_TO_KILL_VIYELDI
                        );
                    } else if (newMenu9 === 2) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.DO_YOU_KNOW_ANYTHING_ABOUT_DAGGERS
                        );
                    } else if (newMenu9 === 3) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_NEED_MORE_YOMMI_TREE_SEEDS
                        );
                    } else if (newMenu9 === 4) {
                        await ungaduluTalk(player, npc, UN.OK_THANKS);
                    }
                } else {
                    await npc.say(
                        'Hello Bwana, how goes your quest with the Yommi tree?'
                    );
                    const newMenu9 = await ask(player, [
                        'I am on a quest to get more pure water.',
                        'What do you know about the source of the sacred water?',
                        'I need more Yommi tree seeds.'
                    ]);
                    if (newMenu9 === 0) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_AM_ON_A_QUEST_TO_GET_MORE_PURE_WATER
                        );
                    } else if (newMenu9 === 1) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.WHAT_DO_YOU_KNOW_ABOUT_THE_SOURCE_OF_THE_SACRED_WATER
                        );
                    } else if (newMenu9 === 2) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_NEED_MORE_YOMMI_TREE_SEEDS
                        );
                    }
                }
                break;
            }
            case 8: {
                if (!player.cache.crafted_totem_pole) {
                    player.message('You approach Ungadulu...');
                    await world.sleepTicks(2);
                    await npc.say(
                        'Blessings on you Bwana.',
                        'Did you use the spell and kill the spirit?',
                        'Do you have the sacred water yet?'
                    );
                    player.message(
                        'The Shaman looks so excited about seeing you that he is about to burst.'
                    );
                    await world.sleepTicks(2);
                    const fMenu = await ask(player, [
                        "Yes, I've killed the Spirit.",
                        "Yes, I've got the water.",
                        'I need more Yommi tree seeds.'
                    ]);
                    if (fMenu === 0) {
                        await ungaduluTalk(player, npc, UN.I_HAVE_KILLED_THE_SPIRIT);
                    } else if (fMenu === 1) {
                        await ungaduluTalk(player, npc, UN.I_HAVE_GOT_THE_WATER);
                    } else if (fMenu === 2) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_NEED_MORE_YOMMI_TREE_SEEDS
                        );
                    }
                } else if (
                    !has(player, TOTEM_POLE_ID) &&
                    !has(player, YOMMI_TREE_SEED_ID)
                ) {
                    await npc.say(
                        'I see you have no totem pole, or Yommi tree seeds, is everything Ok?'
                    );
                    const menuopts = await ask(player, [
                        "Yes, everything's fine.",
                        'I need more Yommi tree seeds.'
                    ]);
                    if (menuopts === 0) {
                        await npc.say(
                            'Your Legendary exploits are travelling the whole jungle.',
                            'How goes your quest to grow the sacred Yommi tree ?'
                        );
                        const submenu = await ask(player, [
                            "I've already made the totem pole.",
                            "I'm not sure what to do with the Totem pole.",
                            'Ok, thanks...'
                        ]);
                        if (submenu === 0) {
                            await ungaduluTalk(player, npc, UN.MADE_TOTEM_POLE);
                        } else if (submenu === 1) {
                            await ungaduluTalk(player, npc, UN.WHAT_DO_TOTEM_POLE);
                        } else if (submenu === 2) {
                            await ungaduluTalk(player, npc, UN.OK_THANKS);
                        }
                    } else if (menuopts === 1) {
                        await ungaduluTalk(
                            player,
                            npc,
                            UN.I_NEED_MORE_YOMMI_TREE_SEEDS
                        );
                    }
                } else {
                    await npc.say(
                        'Your Legendary exploits are travelling the whole jungle.',
                        'How goes your quest to grow the sacred Yommi tree ?'
                    );
                    const submenu = await ask(player, [
                        "I've already made the totem pole.",
                        "I'm not sure what to do with the Totem pole.",
                        'Ok, thanks...'
                    ]);
                    if (submenu === 0) {
                        await ungaduluTalk(player, npc, UN.MADE_TOTEM_POLE);
                    } else if (submenu === 1) {
                        await ungaduluTalk(player, npc, UN.WHAT_DO_TOTEM_POLE);
                    } else if (submenu === 2) {
                        await ungaduluTalk(player, npc, UN.OK_THANKS);
                    }
                }
                break;
            }
            case 9: {
                await npc.say(
                    'Your Legendary exploits are travelling the whole jungle.',
                    'How goes your quest to grow the sacred Yommi tree ?'
                );
                const newMenu10 = await ask(player, [
                    "I've killed Nezikchened the Demon again.",
                    "I've replaced the evil Totem pole.",
                    'Ok, thanks...'
                ]);
                if (newMenu10 === 0) {
                    await ungaduluTalk(player, npc, UN.KILLED_DEMON_AGAIN);
                } else if (newMenu10 === 1) {
                    await ungaduluTalk(player, npc, UN.REPLACED_EVIL_TOTEM);
                } else if (newMenu10 === 2) {
                    await ungaduluTalk(player, npc, UN.OK_THANKS);
                }
                break;
            }
            case 10:
            case 11:
            case -1:
                await npc.say(
                    'Your Legendary exploits are travelling the whole jungle.',
                    'Gujuo has been to see me. ',
                    'He told me that you have been given a sacred totem pole.',
                    'It was constructed by one of my ancestors many moons ago.',
                    'It is a noble prize Bwana, you have earned it,',
                    'look after it well.'
                );
                break;
        }
    }

    await ungaduluTalkCID(player, npc, cID);
}

async function ungaduluTalkCID(player, npc, cID) {
    const { world } = player;
    switch (cID) {
        case UN.OK_THANKS:
            await npc.say('My sincerest pleasure Bwana...');
            break;
        case UN.WHAT_DO_I_DO_NOW: {
            await npc.say(
                'Well, you should be able to plant the Yommi tree.',
                'And then water it with the sacred water.',
                'You should then be able to start making the Totem pole.',
                'So long as you have banished the spirit',
                'And managed to get some of the sacred water.'
            );
            const yMenu = await ask(player, [
                "Yes, I've got the water.",
                "Yes, I've killed the Spirit.",
                'Ok, thanks...'
            ]);
            if (yMenu === 0) {
                await ungaduluTalk(player, npc, UN.I_HAVE_GOT_THE_WATER);
            } else if (yMenu === 1) {
                await ungaduluTalk(player, npc, UN.I_HAVE_KILLED_THE_SPIRIT);
            } else if (yMenu === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.I_HAVE_KILLED_THE_SPIRIT: {
            await player.say(
                'The spirit actually turned out to be the Demon - Nezikchened.'
            );
            await npc.say(
                "That's truly a miracle Bwana,",
                'very few come out of Viyeldi\'s caves alive.',
                'And you managed to defeat Nezikchened a second time?',
                'You are truly a legend bwana.',
                'Do you have the sacred water yet?'
            );
            const fMenu = await ask(player, [
                "Yes, I've got the water.",
                'What do I do now?',
                'Ok, thanks...'
            ]);
            if (fMenu === 0) {
                await ungaduluTalk(player, npc, UN.I_HAVE_GOT_THE_WATER);
            } else if (fMenu === 1) {
                await ungaduluTalk(player, npc, UN.WHAT_DO_I_DO_NOW);
            } else if (fMenu === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.I_HAVE_GOT_THE_WATER: {
            await npc.say(
                'That is truly great Bwana...well done!',
                'You have the spirit of the jungle lion',
                'Did you use the spell and kill the spirit?'
            );
            const xMenu = await ask(
                player,
                [
                    "Yes, I've killed the Spirit.",
                    'What do I do now?',
                    'Ok, thanks...'
                ],
                false
            );
            if (xMenu === 0) {
                await player.say("Yes, I've killed the Spirit.");
                await ungaduluTalk(player, npc, UN.I_HAVE_KILLED_THE_SPIRIT);
            } else if (xMenu === 1) {
                await player.say('What do I do now ?');
                await ungaduluTalk(player, npc, UN.WHAT_DO_I_DO_NOW);
            } else if (xMenu === 2) {
                await player.say('Ok, thanks...');
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.DO_YOU_KNOW_ANYTHING_ABOUT_DAGGERS: {
            await npc.say(
                'I know something about them, especially magical daggers.',
                'If you have a specific one, show it to me and I\'ll help',
                'as much as I can.'
            );
            const killedViyeldi = !!player.cache.killed_viyeldi;
            const menuOpts = killedViyeldi
                ? [
                      'I have killed Viyeldi!',
                      'The spirit told me to kill Viyeldi.',
                      'Ok, thanks...'
                  ]
                : [
                      'I met a spirit in the Viyeldi Caves.',
                      'The spirit told me to kill Viyeldi.',
                      'Ok, thanks...'
                  ];
            const reply3 = await ask(player, menuOpts);
            if (reply3 === 0) {
                if (killedViyeldi) {
                    await ungaduluTalk(player, npc, UN.I_HAVE_KILLED_VIYELDI);
                } else {
                    await ungaduluTalk(
                        player,
                        npc,
                        UN.I_MET_A_SPIRIT_IN_THE_VIYELDI_CAVES
                    );
                }
            } else if (reply3 === 1) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.THE_SPIRIT_TOLD_ME_TO_KILL_VIYELDI
                );
            } else if (reply3 === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.I_HAVE_KILLED_VIYELDI: {
            await npc.say('Why on earth did you do that?');
            player.message('The Shaman screams at you...');
            await world.sleepTicks(2);
            await player.say(
                'A spirit called Echned Zekin said I had to avenge his spirit',
                'by killing Viyeldi if I wanted to get the pure water.'
            );
            player.message('The Shaman puts his head in his hands.');
            await world.sleepTicks(2);
            await npc.say(
                'Bwana, you have been tricked by a spirit !',
                'And you have done the worst thing imaginable.',
                'Viyeldi was the sorcerer who controlled the Hero\'s who protect.',
                'the source.',
                'The spirits of these hero\'s are now free',
                'to be controlled by other, more powerful forces.',
                'Most likely the spirit that tricked you.'
            );
            const reply4 = await ask(player, [
                'Do you know anything about daggers?',
                'What can we do?',
                'Ok, thanks...'
            ]);
            if (reply4 === 0) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.DO_YOU_KNOW_ANYTHING_ABOUT_DAGGERS
                );
            } else if (reply4 === 1) {
                if (has(player, HOLY_FORCE_SPELL_ID)) {
                    await npc.say(
                        'You can use that Holy Force spell to try and defeat the spirit.',
                        'Come back and let me know if I can help in any other way.'
                    );
                } else {
                    await npc.say(
                        'I am not sure at this time Bwana.',
                        'Give me a few moments to think.',
                        'Hmmm....'
                    );
                    player.message(
                        "The Shaman looks as if he's thinking very deeply."
                    );
                    await world.sleepTicks(2);
                    player.message(
                        'The wizened old Shaman hands over a piece of paper.'
                    );
                    await world.sleepTicks(2);
                    await npc.say(
                        'Take this spell and pray that you can defeat',
                        "this evil spirit before it's too late."
                    );
                    player.inventory.add(HOLY_FORCE_SPELL_ID);
                    await npc.say("I'll take that dagger from you now!");
                    player.inventory.remove(GLOWING_DARK_DAGGER_ID);
                }
            } else if (reply4 === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.I_MET_A_SPIRIT_IN_THE_VIYELDI_CAVES: {
            await npc.say(
                'You did well to come to me Bwana...',
                'As I said, I am an expert in spirits of the underworld...',
                'In most circumstances you should just ignore them.',
                'However, beware as many spirits will try to trick you.'
            );
            const reply2 = await ask(player, [
                'The spirit told me to kill Viyeldi.',
                'Ok, thanks...'
            ]);
            if (reply2 === 0) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.THE_SPIRIT_TOLD_ME_TO_KILL_VIYELDI
                );
            } else if (reply2 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.THE_SPIRIT_TOLD_ME_TO_KILL_VIYELDI: {
            await npc.say(
                'That sounds very strange Bwana,',
                "I'm glad to see that you didn't comit such a foul act.",
                'I can make a spell that would help you to defeat the spirit.',
                'But I need an item that belongs to the spirit to make it work.',
                'If you have something like that, please show it to me.',
                "And I'll give you the spell.",
                'Beware of everyone in these caves,',
                'I was tricked very easily and was enslaved, as you well know.'
            );
            const reply = await ask(player, [
                'I met a spirit in the Viyeldi Caves.',
                'Ok, thanks...'
            ]);
            if (reply === 0) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.I_MET_A_SPIRIT_IN_THE_VIYELDI_CAVES
                );
            } else if (reply === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.WHAT_DO_YOU_KNOW_ABOUT_THE_SOURCE_OF_THE_SACRED_WATER: {
            await npc.say(
                'It is said that the caves where the stream is located, ',
                'are littered with strange remains of a past civilisation.',
                'The dwarves are said to have excavated the area in search',
                'of the source of the sacred water.',
                'Something bad must have happened because soon the area was cursed.',
                'Anyone who entered the area looking for the source of the water,',
                'And who died, would be forver cursed to protect the water...',
                '...forever...'
            );
            const newMenu8 = await ask(player, [
                'I am on a quest to get more pure water.',
                'Ok, thanks...'
            ]);
            if (newMenu8 === 0) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.I_AM_ON_A_QUEST_TO_GET_MORE_PURE_WATER
                );
            } else if (newMenu8 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.I_AM_ON_A_QUEST_TO_GET_MORE_PURE_WATER: {
            await npc.say(
                'Well, good luck with your quest Bwana.',
                'You may well find it worthwhile exploring these catacombs.',
                'There is said to be an entrance to the Viyeldi caves.',
                'Which is where the sacred source of the magic pool exists.',
                'Beware though as it is said that the area is cursed.',
                'Anyone who is killed seeking the sacred water,',
                "will forever be sworn to protect it's secret."
            );
            const newMenu7 = await ask(player, [
                'What do you know about the source of the sacred water?',
                'Ok, thanks...'
            ]);
            if (newMenu7 === 0) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.WHAT_DO_YOU_KNOW_ABOUT_THE_SOURCE_OF_THE_SACRED_WATER
                );
            } else if (newMenu7 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.THE_MAGIC_POOL_HAS_DRIED_UP: {
            await npc.say(
                'Hmmm, that sounds odd..',
                "I'm sure that Gujuo will tell you the same as me though.",
                'Searching for the source of the water pool will be difficult.',
                'However, with some help, it might be possible.'
            );
            const newMenu6 = await ask(player, [
                'Where can I get more pure water?',
                'Ok, thanks...'
            ]);
            if (newMenu6 === 0) {
                await ungaduluTalk(player, npc, UN.WHERE_CAN_I_GET_MORE_PURE_WATER);
            } else if (newMenu6 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.WHERE_CAN_I_GET_MORE_PURE_WATER: {
            await npc.say(
                'There is said to be a stream of the sacred water that exists underground.',
                "I'm sure that Gujuo will tell you quite a lot about it.",
                'I\'m have not explored outside of this room, but I have heard',
                'that there is a door within these catacombs which challenges any',
                'person with a riddle.',
                'Very few have solved the riddle, ',
                'and fewer have been returned alive if they did solve it.',
                'You can try to explore these caverns, it may help.',
                'You may just be able to find the Viyeldi caves.',
                'That is where the sacred source of the pure water resides...'
            );
            const newMenu5 = await ask(player, [
                'The magic pool has dried up and I need some more pure water.',
                'Ok, thanks...'
            ]);
            if (newMenu5 === 0) {
                await ungaduluTalk(player, npc, UN.THE_MAGIC_POOL_HAS_DRIED_UP);
            } else if (newMenu5 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        default:
            await ungaduluTalkCID2(player, npc, cID);
            break;
    }
}

async function ungaduluTalkCID2(player, npc, cID) {
    const { world } = player;
    switch (cID) {
        case UN.I_NEED_MORE_YOMMI_TREE_SEEDS:
            if (
                has(player, GERMINATED_YOMMI_TREE_SEED_ID) ||
                has(player, YOMMI_TREE_SEED_ID)
            ) {
                await npc.say(
                    'You already have some Yommi tree seeds...',
                    'Use those first and then come back to me if you need any more.'
                );
                player.message('Ungadulu goes back to his studies.');
            } else {
                player.message('Ungadulu gives you some more seeds..');
                await world.sleepTicks(2);
                player.inventory.add(GERMINATED_YOMMI_TREE_SEED_ID, 3);
                await npc.say('Take more care of these this time around.');
            }
            break;
        case UN.I_HAVE_GERMINATED_THE_SEEDS: {
            await npc.say(
                'Great Bwana, now go plant them in the fertile soil.',
                'You should soon have a great Yommi tree worthy of a most marvelous',
                'totem pole.'
            );
            const opt3 = await ask(player, [
                'Where do I plant the seeds?',
                'Ok, thanks...'
            ]);
            if (opt3 === 0) {
                await ungaduluTalk(player, npc, UN.WHERE_DO_I_PLANT_THE_SEEDS);
            } else if (opt3 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.WHERE_DO_I_PLANT_THE_SEEDS: {
            await npc.say(
                'Above ground and spaced out througout the whole jungle area',
                'are specially cultivated ferteile soil areas.',
                'Seek one out and plant the Yommi tree in that...',
                'be prepared to water it though...'
            );
            const opt2 = await ask(player, [
                'I have germinated the seeds.',
                'Ok, thanks...'
            ]);
            if (opt2 === 0) {
                await ungaduluTalk(player, npc, UN.I_HAVE_GERMINATED_THE_SEEDS);
            } else if (opt2 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.HOW_DO_I_GET_OUT_OF_HERE: {
            if (has(player, MAGICAL_FIRE_PASS_ID)) {
                await npc.say(
                    'Just use the Magical Fire Pass that I gave you to',
                    'get past the flames...',
                    'Then you should be able to find your way out through',
                    'the cave entrance that you came in.'
                );
            } else {
                await npc.say('Well, the way you came, but here...');
                player.message(
                    'The Shaman scrawls a some strange markings onto a piece of paper.'
                );
                await world.sleepTicks(2);
                player.inventory.add(MAGICAL_FIRE_PASS_ID);
                player.message('He hands the paper to you...');
                await npc.say(
                    'This will allow you to pass the fire without harm in future.'
                );
            }
            const chapter = await ask(player, [
                'I need to collect some Yommi tree seeds for Gujuo.',
                'What will you do now?',
                'Ok, thanks...'
            ]);
            if (chapter === 0) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.COLLECT_SOME_YOMMI_SEEDS_FOR_GUJUO
                );
            } else if (chapter === 1) {
                await ungaduluTalk(player, npc, UN.WHAT_WILL_YOU_DO_NOW);
            } else if (chapter === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.WHAT_WILL_YOU_DO_NOW: {
            await npc.say(
                'I will remain here in the protection of the flaming Octagram',
                'and continue my research into the spirit world...',
                'I am somewhat of an authority with my recent experience!',
                'But do remember me from time to time and come to visit an old man.',
                'You never know, I may be able to help in you in the future.',
                'And repay you the favour of releasing me from that terrible Demon...'
            );
            const chapter2 = await ask(player, [
                'I need to collect some Yommi tree seeds for Gujuo.',
                'How do I get out of here?',
                'Ok, thanks...'
            ]);
            if (chapter2 === 0) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.COLLECT_SOME_YOMMI_SEEDS_FOR_GUJUO
                );
            } else if (chapter2 === 1) {
                await ungaduluTalk(player, npc, UN.HOW_DO_I_GET_OUT_OF_HERE);
            } else if (chapter2 === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.COLLECT_SOME_YOMMI_SEEDS_FOR_GUJUO: {
            if (!has(player, YOMMI_TREE_SEED_ID)) {
                await npc.say(
                    'Oh, yes, Bwana...you will be doing a great favour to our people',
                    'by doing this..however, you must know that it is a difficult task.',
                    'the Yommi tree is difficult to grow. You must have a natural ability',
                    'with such things to have a chance...'
                );
                player.message(
                    'The Shaman holds out his gnarly old hand and reveals three largish green seeds.'
                );
                await world.sleepTicks(2);
                await npc.say(
                    'Here you go...',
                    'Accept these with my gratitude...',
                    "You'll need to soak them in pure water before planting them.",
                    'I notice that you are already familiar with it ',
                    'to have passed the flaming Octagram.'
                );
                player.inventory.add(YOMMI_TREE_SEED_ID, 3);
                const newMenu = await ask(player, [
                    'How do I grow the Yommi tree.',
                    'What do you know about the pure water.',
                    'Ok, thanks...'
                ]);
                if (newMenu === 0) {
                    await ungaduluTalk(player, npc, UN.HOW_DO_I_GROW_THE_YOMMI_TREE);
                } else if (newMenu === 1) {
                    await ungaduluTalk(
                        player,
                        npc,
                        UN.WHAT_DO_YOU_KNOW_ABOUT_THE_PURE_WATER
                    );
                } else if (newMenu === 2) {
                    await ungaduluTalk(player, npc, UN.OK_THANKS);
                }
            } else {
                await npc.say(
                    'You already have some Yommi tree seeds, use those first..',
                    'and let me know how you get along.'
                );
                const option2 = await ask(player, [
                    'How do I grow the Yommi tree.',
                    'What do you know about the pure water.'
                ]);
                if (option2 === 0) {
                    await ungaduluTalk(player, npc, UN.HOW_DO_I_GROW_THE_YOMMI_TREE);
                } else if (option2 === 1) {
                    await ungaduluTalk(
                        player,
                        npc,
                        UN.WHAT_DO_YOU_KNOW_ABOUT_THE_PURE_WATER
                    );
                }
            }
            break;
        }
        case UN.HOW_DO_I_GROW_THE_YOMMI_TREE: {
            await npc.say(
                'A good question Bwana...but it is essentially quite simple.',
                'First you will need to soak the seeds in some pure water...',
                'This will help to geminate the seed and begin the growing process.',
                'The Yommi tree is sacred and is also slightly magical.',
                'You need to seek out a patch of fertile earth. ',
                'Such places are located around the jungle and should give ',
                'the Yommi tree a good chance of survival.',
                'The tree should show some remarkable growth quite early',
                'But will slow down, you may be able to speed the process up ',
                'by watering the tree with more pure water, although',
                'it can be difficult to find it.'
            );
            const option = await ask(player, [
                'What will you do now?',
                'What do you know about the pure water.',
                'Ok, thanks...'
            ]);
            if (option === 0) {
                await ungaduluTalk(player, npc, UN.WHAT_WILL_YOU_DO_NOW);
            } else if (option === 1) {
                await ungaduluTalk(
                    player,
                    npc,
                    UN.WHAT_DO_YOU_KNOW_ABOUT_THE_PURE_WATER
                );
            } else if (option === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.WHAT_DO_YOU_KNOW_ABOUT_THE_PURE_WATER: {
            await npc.say(
                'Hmmm, the pure water is sacred to us.',
                'It is from a sacred spring which is fed from deep underground.',
                'It is said that the spring is protected by spirits of long ',
                'dead adventurers who went in search of the springs source..',
                'But it is likely a myth and the source of the spring is buried',
                'deep in the ground with no chance of access.'
            );
            const next = await ask(player, [
                'What will you do now?',
                'How do I get out of here?',
                'Ok, thanks...'
            ]);
            if (next === 0) {
                await ungaduluTalk(player, npc, UN.WHAT_WILL_YOU_DO_NOW);
            } else if (next === 1) {
                await ungaduluTalk(player, npc, UN.HOW_DO_I_GET_OUT_OF_HERE);
            } else if (next === 2) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.MADE_TOTEM_POLE: {
            await npc.say(
                "This is great news Bwana, you've done really well.",
                'Perhaps we can start to rally our people together now.',
                'And live once again without fear in the jungle.'
            );
            const otheropts = await ask(player, [
                "I'm not sure what to do with the Totem pole.",
                'Ok, thanks...'
            ]);
            if (otheropts === 0) {
                await ungaduluTalk(player, npc, UN.WHAT_DO_TOTEM_POLE);
            } else if (otheropts === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.WHAT_DO_TOTEM_POLE: {
            await npc.say(
                'Well, Bwana, you can simply replace the corrupted totem',
                'pole with the good one you have created.',
                'This will make my people very happy.'
            );
            const otheropts2 = await ask(player, [
                "I've already made the totem pole.",
                'Ok, thanks...'
            ]);
            if (otheropts2 === 0) {
                await ungaduluTalk(player, npc, UN.MADE_TOTEM_POLE);
            } else if (otheropts2 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.KILLED_DEMON_AGAIN: {
            await npc.say(
                'If you have killed him for the third time,',
                'then you have banished him from our world completely.',
                'This is indeed a legendary accomplishment Bwana,',
                'you should feel proud.'
            );
            const other = await ask(player, [
                "I've replaced the evil Totem pole.",
                'Ok, thanks...'
            ]);
            if (other === 0) {
                await ungaduluTalk(player, npc, UN.REPLACED_EVIL_TOTEM);
            } else if (other === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
        case UN.REPLACED_EVIL_TOTEM: {
            await npc.say(
                'Many thanks Bwana, my people are truly grateful.',
                'Have you seen Gujuo, I am sure that he may have something',
                'for you as a token of our appreciation.'
            );
            const other2 = await ask(player, [
                "I've killed Nezikchened the Demon again.",
                'Ok, thanks...'
            ]);
            if (other2 === 0) {
                await ungaduluTalk(player, npc, UN.KILLED_DEMON_AGAIN);
            } else if (other2 === 1) {
                await ungaduluTalk(player, npc, UN.OK_THANKS);
            }
            break;
        }
    }
}

// the trapped Shaman behind the octagram flames (stages 2/3). asking about pure
// water drives 2 -> 3 (setting stage 3 when the water clue is learned).
async function ungaduluWall(player, npc, cID) {
    const { world } = player;
    if (npc.id !== UNGADULU_ID) {
        return;
    }

    if (cID === -1) {
        switch (getStage(player)) {
            case 2:
            case 3: {
                player.message('You see a white robed figure gesturing to you.');
                await npc.say(
                    'Please come no closer...the flames will incinerate you.'
                );
                const menu = await ask(player, [
                    'How can I extinguish the flames?',
                    'Who are you?'
                ]);
                if (menu === 0) {
                    await ungaduluWall(player, npc, UN.EXTINGUISH_THE_FLAMES);
                } else if (menu === 1) {
                    await ungaduluWall(player, npc, UN.WHO_ARE_YOU);
                }
                break;
            }
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case -1:
                await ungaduluTalk(player, npc, -1);
                break;
        }
    }

    switch (cID) {
        case UN.EXTINGUISH_THE_FLAMES: {
            await npc.say('Please don\'t try to extinguish...');
            npc = changeNpc(player, npc, EVIL_UNGADULU_ID);
            await npc.say(
                'Yes, douse the flames with water, pure water...foo...'
            );
            await world.sleepTicks(1);
            npc = changeNpc(player, npc, UNGADULU_ID);
            await npc.say(
                'Please, leave now...don\'t listen to me...',
                "I beg you,leave now, don't touch the flames..."
            );
            const opt = await ask(player, [
                'Where do I get pure water from ?',
                'Who are you?'
            ]);
            if (opt === 0) {
                await ungaduluWall(player, npc, UN.WHERE_DO_I_GET_PURE_WATER_FROM);
            } else if (opt === 1) {
                await ungaduluWall(player, npc, UN.WHO_ARE_YOU);
            }
            break;
        }
        case UN.WHO_ARE_YOU: {
            await npc.say(
                'I am Ungadulu,trapped here many years now...',
                'Leave these caves and save yourself...'
            );
            npc = changeNpc(player, npc, EVIL_UNGADULU_ID);
            await npc.say(
                'Wait...get pure water from the pool...above lands...'
            );
            await world.sleepTicks(1);
            npc = changeNpc(player, npc, UNGADULU_ID);
            await npc.say(
                "Please Bwana, don't listen to me...run, save yourself..."
            );
            const menu = await ask(player, [
                'How can I extinguish the flames?',
                'Where do I get pure water from ?'
            ]);
            if (menu === 0) {
                await ungaduluWall(player, npc, UN.EXTINGUISH_THE_FLAMES);
            } else if (menu === 1) {
                await ungaduluWall(player, npc, UN.WHERE_DO_I_GET_PURE_WATER_FROM);
            }
            break;
        }
        case UN.WHERE_DO_I_GET_PURE_WATER_FROM: {
            await npc.say('Please, leave now...');
            npc = changeNpc(player, npc, EVIL_UNGADULU_ID);
            await npc.say('...from the above lands...hurry and release me...');
            npc = changeNpc(player, npc, UNGADULU_ID);
            await npc.say('Leave here, please, go...now...');
            npc = changeNpc(player, npc, EVIL_UNGADULU_ID);
            await npc.say('Hurry, Vacu, the heat kills me...ha ha ha');
            npc = changeNpc(player, npc, UNGADULU_ID);
            player.message(
                'The Shaman throws himself down on the floor and starts shaking.'
            );
            if (getStage(player) === 2) {
                setStage(player, 3);
            }
            break;
        }
    }
}

// douse the flamewall (210) with pure water from a golden bowl to cross it. this
// is the other stage 2->3 trigger alongside the wall-Ungadulu dialogue above.
async function flameWallUseWithWallObject(player, wallObject, item) {
    const { world } = player;
    if (wallObject.id !== FLAME_WALL_ID) {
        return false;
    }
    if (item.id !== BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID) {
        // only the blessed bowl of pure water affects the flames; other water evaporates.
        if (
            item.id === GOLDEN_BOWL_WITH_PURE_WATER_ID ||
            item.id === GOLDEN_BOWL_WITH_PLAIN_WATER_ID ||
            item.id === BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID
        ) {
            player.message('@que@The water seems to evaporate in a cloud of steam');
            await world.sleepTicks(2);
            player.message('@que@before it gets anywhere near the flames.');
            return true;
        }
        return false;
    }
    player.message('You splash some pure water on the flames');
    // the blessed bowl lasts five splashes and runs dry on the fifth.
    if (!player.cache.douse_flames) {
        player.cache.douse_flames = 1;
    } else {
        const pourCount = player.cache.douse_flames;
        player.cache.douse_flames = pourCount + 1;
        if (pourCount >= 4) {
            delete player.cache.douse_flames;
            player.message('The pure water in the golden bowl has run out...');
            player.inventory.remove(item.id);
            player.inventory.add(BLESSED_GOLDEN_BOWL_ID);
        }
    }
    player.message('You quickly walk over the doused flames.');
    crossFlameWall(player);
    if (getStage(player) === 2) {
        setStage(player, 3);
    }
    const ungadulu = [...world.npcs.getInArea(player.x, player.y, 8)].find(
        (n) => n.id === UNGADULU_ID
    );
    if (ungadulu) {
        player.engage(ungadulu);
        await ungaduluWall(player, ungadulu, -1);
        player.disengage();
    }
    return true;
}

// use dark dagger / glowing dagger / book of binding on Ungadulu.
async function ungaduluUse(player, npc, item) {
    const { world } = player;
    if (npc.id !== UNGADULU_ID) {
        return false;
    }

    if (item.id === DARK_DAGGER_ID) {
        player.message('You hand the dagger over to the Shaman.');
        await world.sleepTicks(2);
        player.message("The Shaman's face turns pale...");
        await world.sleepTicks(2);
        if (player.cache.killed_viyeldi) {
            await npc.say(
                'Oh dear Bwana, I sense something terrible has happened.',
                'This dagger is a portent of some evil action...',
                'Please, reveal to me anything that you have done',
                'so that I might understand this better.'
            );
            const killed = await ask(player, [
                "I've killed Viyeldi.",
                "Er, I can't think of anything."
            ]);
            if (killed === 0) {
                await npc.say(
                    "Poor Viyeldi',",
                    'He was the guardian of the dead hero\'s that protected the source.',
                    'Their tormented spirits will now be at the beck and',
                    'call of the one who gave you the dagger.'
                );
                if (has(player, HOLY_FORCE_SPELL_ID)) {
                    await npc.say(
                        'Take the Holy Force spell I gave you and pray that you',
                        "can defeat this spirit before it's too late."
                    );
                } else {
                    player.inventory.add(HOLY_FORCE_SPELL_ID);
                    player.message(
                        'The wizened old Shaman hands over a piece of paper.'
                    );
                    await world.sleepTicks(2);
                    await npc.say(
                        'Take this spell and pray that you can defeat',
                        "this evil spirit before it's too late.",
                        'The spell will force the spirit to reveal its true self.',
                        'And it will also be vulerable to normal attacks.'
                    );
                }
            } else if (killed === 1) {
                await npc.say(
                    'Well, that is strange...',
                    'I sense a growing evil power since you visited the caves.'
                );
                player.message(
                    'The Wizened old Shaman mutters to himself and wanders off.'
                );
            }
            return true;
        }
        await npc.say(
            'This dagger has been made for one purpose only...',
            'Praise the gods that you brought it to me.',
            'I can make you a spell with this item which will force the spirit',
            'to reveal its true self.',
            'Once activated, you will be able to attack it like',
            'a normal creature.'
        );
        player.inventory.remove(DARK_DAGGER_ID);
        player.inventory.add(HOLY_FORCE_SPELL_ID);
        player.message(
            'The Shaman takes the dagger and gives you a folded piece of paper.'
        );
        await world.sleepTicks(2);
        await npc.say(
            'Use this spell on the Spirit.',
            "It will force the spirit to show it's true self.",
            'And it will also be vulerable to normal attacks.'
        );
        return true;
    }

    if (item.id === GLOWING_DARK_DAGGER_ID) {
        player.message('You hand the dagger over to the Shaman.');
        await world.sleepTicks(2);
        player.message("The Shaman's face turns pale...");
        await world.sleepTicks(2);
        await npc.say(
            'Oh dear Bwana.',
            "Poor Viyeldi's spirit is trapped inside this weapon.",
            'No doubt the evil spirit that told you to kill Viyeldi,',
            'is planning to use it for some vile purpose.',
            "I will try to release Viyeldi's spirit from the dagger.",
            'Here, you take this spell...'
        );
        player.inventory.remove(GLOWING_DARK_DAGGER_ID);
        player.inventory.add(HOLY_FORCE_SPELL_ID);
        player.message(
            'The Shaman takes the dagger and gives you a folded piece of paper.'
        );
        await world.sleepTicks(2);
        await npc.say(
            'Use this spell on the Spirit.',
            "It will force the spirit to show it's true self.",
            'And it will also be vulerable to normal attacks.'
        );
        return true;
    }

    if (item.id === BOOKING_OF_BINDING_ID) {
        if (getStage(player) === 3) {
            player.message('You open the book of binding in front of Ungadulu.');
            await world.sleepTicks(3);
            player.message('A blinding light fills the room...');
            await world.sleepTicks(2);
            player.message('A supernatural light falls on Ungadulu...');
            await world.sleepTicks(2);
            player.message('And a mighty demon forms in front of you...');
            await world.sleepTicks(2);
            const nez = spawnNpc(player, NEZIKCHENED_ID, npc.x, npc.y);
            nez.spawnedFor = player.id;
            await nez.say(
                'Curse you foul intruder...your faith will help you little here.'
            );
            // player.getSkills().setLevel(PRAYER, ceil(level/4))
            setCurrentLevel(
                player,
                'prayer',
                Math.ceil(currentLevel(player, 'prayer') / 4)
            );
            player.message('@que@A sense of hopelessness fills your body...');
            await world.sleepTicks(2);
            await nez.say(
                "'Ere near to death ye comes now that ye has meddled in my dealings.."
            );
            if (player.cache.holy_water_neiz) {
                player.message(
                    'The holy water starts smoking on the Demons skin...'
                );
                await nez.say('Ahhhrhhhhhghhhh...it burns.....');
                // OpenRSC drains the demon's first 3 stats by 15%.
                for (const s of ['attack', 'defense', 'strength']) {
                    nez.skills[s].current = Math.floor(
                        nez.skills[s].current * 0.85
                    );
                }
            }
            await nez.attack(player);
        } else {
            await npc.say(
                "Ha, ha ha! There's no need to use that on me any more...",
                "I'm cured now, remember..."
            );
        }
        return true;
    }

    return false;
}

// Nezikchened: the three demon fights + Viyeldi companions.

// the third fight summons the dead heroes (San Tojalon -> Irvig Senay -> Ranalph
// Devere) then Nezikchened himself, tracked by cache.viyeldi_companions (1..4).
async function summonViyeldiCompanions(player) {
    const { world } = player;
    let companion = null;
    const stage = player.cache.viyeldi_companions;
    if (stage === 1) {
        companion = spawnNpc(player, SAN_TOJALON_ID, player.x, player.y);
    } else if (stage === 2) {
        companion = spawnNpc(player, IRVIG_SENAY_ID, player.x, player.y);
    } else if (stage === 3) {
        companion = spawnNpc(player, RANALPH_DEVERE_ID, player.x, player.y);
    } else if (stage === 4) {
        companion = spawnNpc(player, NEZIKCHENED_ID, player.x, player.y);
        companion.spawnedFor = player.id;
    }
    if (companion) {
        // OpenRSC: startCombat then a taunt line.
        await companion.say('Corrupted are we now that Viyeldi is slain..');
        await companion.say(
            "Bent to this demons will and forced to bring you pain..."
        );
        await companion.attack(player);
    }
}

// OpenRSC demonFight(player): third-fight orchestrator.
async function demonFight(player) {
    const { world } = player;
    const nez = spawnNpc(player, NEZIKCHENED_ID, player.x, player.y);
    nez.spawnedFor = player.id;
    await world.sleepTicks(1);
    await nez.say('Now you try to defile my sanctuary...I will teach thee!');
    const comp = player.cache.viyeldi_companions;
    if (comp <= 3) {
        await nez.say(
            'You will pay for your disrespect by meeting some old friends...'
        );
        player.message('The Demon starts chanting...');
        await world.sleepTicks(2);
        player.message('@yel@Nezikchened: Protectors of source, alive in death,');
        await world.sleepTicks(2);
        player.message(
            '@yel@Nezikchened: do not rest while this Vacu draws breath!'
        );
        await world.sleepTicks(2);
        world.removeEntity('npcs', nez);
        player.message(
            "@que@The demon is summoning the dead hero's from the Viyeldi caves !"
        );
        await world.sleepTicks(2);
        await summonViyeldiCompanions(player);
    } else if (comp === 4) {
        player.message('The Demon screams in rage...');
        await world.sleepTicks(2);
        await nez.say('Raarrrrghhhh!', "I'll kill you myself !");
        await nez.attack(player);
        player.message('You feel a great sense of loss...');
        setCurrentLevel(
            player,
            'prayer',
            Math.ceil(currentLevel(player, 'prayer') / 4)
        );
        await nez.say('Your faith will help you little here.');
    } else {
        await nez.attack(player);
    }
}

// OpenRSC Nezikchened.onKillNpc: the three scripted fight resolutions.
async function nezikchenedDeath(player, npc) {
    const { world } = player;
    if (npc.id !== NEZIKCHENED_ID) {
        return false;
    }

    // FIRST FIGHT (stage 3, inside the flame wall).
    if (getStage(player) === 3 && isInsideFlameWall(player)) {
        player.message(
            '@yel@Nezikchened: Ha ha ha...I shall return for you when the time is right.'
        );
        await world.sleepTicks(3);
        player.message('Your opponent is retreating');
        await world.sleepTicks(1);
        world.removeEntity('npcs', npc);
        player.message('@que@The demon starts an incantation...');
        await world.sleepTicks(2);
        player.message(
            '@yel@Nezikchened : But I will leave you with a taste of my power...'
        );
        await world.sleepTicks(2);
        player.message(
            '@que@As he finishes the incantation a powerful bolt of energy strikes you.'
        );
        await world.sleepTicks(2);
        player.damage(7);
        player.message('@yel@Nezikchened : Haha hah ha ha ha ha....');
        await world.sleepTicks(2);
        player.message(
            '@que@The demon explodes in a powerful burst of flame that scorches you.'
        );
        await world.sleepTicks(2);
        setStage(player, 4);
        // OpenRSC re-initialises Ungadulu's talk script if nearby.
        const ungadulu = [
            ...world.npcs.getInArea(player.x, player.y, 8)
        ].find((n) => n.id === UNGADULU_ID);
        if (ungadulu) {
            player.engage(ungadulu);
            await ungaduluTalk(player, ungadulu, -1);
            player.disengage();
        }
        return true;
    }

    // SECOND FIGHT (stage 7, around the boulder rock).
    if (getStage(player) === 7 && isAroundBoulderRock(player)) {
        setStage(player, 8);
        await npc.say('Arrrgghhhhh, foul Vacu!');
        player.message('Your opponent is retreating');
        await world.sleepTicks(3);
        await npc.say(
            'You would bite the hand that feeds you!',
            'Very well, I will ready myself for our next encounter...'
        );
        player.message('@que@The Demon seems very angry now...');
        await world.sleepTicks(2);
        player.message('@que@You deliver a final devastating blow to the demon, ');
        await world.sleepTicks(2);
        player.message("@que@and it's unearthly frame crumbles into dust.");
        await world.sleepTicks(2);
        world.removeEntity('npcs', npc);
        return true;
    }

    // THIRD FIGHT (stage 8, around the totem pole).
    if (getStage(player) === 8 && isAroundTotemPole(player)) {
        setStage(player, 9);
        world.removeEntity('npcs', npc);
        player.message('@que@You deliver the final killing blow to the foul demon.');
        await world.sleepTicks(2);
        player.message('@que@The Demon crumbles into a pile of ash.');
        await world.sleepTicks(2);
        world.addPlayerDrop(player, { id: ASHES_ID, amount: 1 }, player.x, player.y);
        player.message('@yel@Nezikchened: Arrrghhhh.');
        await world.sleepTicks(2);
        player.message('@yel@Nezikchened: I am beaten by a mere mortal.');
        await world.sleepTicks(2);
        player.message('@yel@Nezikchened: I will revenge myself upon you...');
        await world.sleepTicks(2);
        await player.say('Yeah, yeah, yeah ! ', 'Heard it all before !');
        return true;
    }

    // otherwise just remove
    world.removeEntity('npcs', npc);
    return true;
}

// Echned Zekin: the spirit trickster at the boulder / source.

const EC = {
    WHAT_CAN_I_DO_ABOUT_THAT: 0,
    WHY_ARE_YOU_TORTURED: 1,
    I_WONT_TAKE_SOMEONES_LIFE_FOR_YOU: 2,
    I_WILL_DO_WHAT_I_MUST_TO_GET_THE_WATER: 3,
    ER_IVE_HAD_SECOND_THOUGHTS: 4,
    I_HAVE_TO_BE_GOING: 5,
    WHO_AM_I_SUPPOSED_TO_KILL_AGAIN: 6,
    I_HAVE_SOMETHING_ELSE_IN_MIND: 7,
    I_HAVE_NOT_SLAYED_VIYELDI_YET: 8,
    I_DONT_HAVE_THE_DAGGER: 9,
    ILL_DO_IT: 10
};

async function holyForceSpell(player, npc) {
    const { world } = player;
    player.message('@que@You thrust the Holy Force spell in front of the spirit.');
    await world.sleepTicks(3);
    player.message('A bright, holy light streams out from the paper spell.');
    await world.sleepTicks(2);
    if (player.cache.already_cast_holy_spell) {
        await npc.say('Argghhhhh...not again....!');
    } else {
        await npc.say('Argghhhhh...noooooo!');
        player.cache.already_cast_holy_spell = true;
    }
}

// Echned reveals himself as the second Nezikchened.
async function neziAttack(player, npc, useHolySpell) {
    const { world } = player;
    if (player.cache.ran_from_2nd_nezi) {
        await npc.say('You have returned and I am ready for you...');
    }
    await npc.say('I will now reveal myself and spell out your doom.');
    const nx = npc.x;
    const ny = npc.y;
    world.removeEntity('npcs', npc);
    const nez = spawnNpc(player, NEZIKCHENED_ID, nx, ny);
    nez.spawnedFor = player.id;
    if (useHolySpell) {
        await holyForceSpell(player, nez);
        player.message(
            'The spirit lets out an unearthly, blood curdling scream...'
        );
        await world.sleepTicks(2);
        player.message('The spell seems to weaken the Demon.');
        await world.sleepTicks(1);
        nez.skills.defense.current = nez.skills.defense.current - 5;
    }
    await nez.attack(player);
    if (useHolySpell) {
        const newPray = Math.ceil(currentLevel(player, 'prayer') / 2);
        if (currentLevel(player, 'prayer') - newPray < 30) {
            player.message('@que@A sense of fear comes over you ');
            await world.sleepTicks(2);
            player.message('@que@You feel a sense of loss...');
            await world.sleepTicks(2);
        } else {
            player.message('@que@An intense sense of fear comes over you ');
            await world.sleepTicks(2);
            player.message('You feel a great sense of loss...');
            await world.sleepTicks(2);
        }
        setCurrentLevel(player, 'prayer', newPray);
        await world.sleepTicks(11);
        player.message('@que@The Demon takes out a dark dagger and throws it at you...');
        await world.sleepTicks(2);
        if (random(0, 1) === 1) {
            player.message('@que@The dagger hits you with an agonising blow...');
            await world.sleepTicks(2);
            player.damage(14);
        } else {
            player.message('@que@But you neatly manage to dodge the attack.');
            await world.sleepTicks(1);
        }
    } else {
        player.message('@que@A terrible fear comes over you. ');
        await world.sleepTicks(2);
        player.message('You feel a terrible sense of loss...');
        await world.sleepTicks(2);
        setCurrentLevel(player, 'prayer', 0);
    }
}

// move the boulder rock (1116) to first meet Echned Zekin at stage 7; at stage 8
// it exposes the water spot for the Blessed Golden Bowl.
async function boulderRockOpLoc(player, obj, command) {
    const { world } = player;
    if (obj.id !== BOULDER_ROCK || command !== 'Move') {
        return false;
    }
    const stage = getStage(player);
    if (stage < 7) {
        player.message("You can't budge the boulder - it's far too heavy.");
        return true;
    }
    if (stage === 7) {
        const existing = [...world.npcs.getInArea(obj.x, obj.y, 5)].find(
            (n) => n.id === ECHNED_ZEKIN_ID
        );
        if (existing) {
            player.engage(existing);
            await echnedDialogue(player, existing, -1);
            player.disengage();
            return true;
        }
        player.message(
            '@que@A thick, green mist seems to emanate from the water...'
        );
        await world.sleepTicks(2);
        player.message('@que@It slowly congeals into the shape of a body...');
        await world.sleepTicks(2);
        const echned = spawnNpc(player, ECHNED_ZEKIN_ID, obj.x, obj.y - 1);
        delete echned.respawn;
        player.message('Which slowly floats towards you.');
        await world.sleepTicks(2);
        player.engage(echned);
        await echnedDialogue(player, echned, -1);
        player.disengage();
        return true;
    }
    // stage >= 8: the spirit is gone and the pool beneath the rock is exposed.
    player.message('@que@The rock moves quite easily.');
    await world.sleepTicks(2);
    player.message('And the spirit of Echned Zekin seems to have disapeared.');
    tempSwapObject(world, obj, SHALLOW_WATER, 16);
    return true;
}

// fill a golden bowl from the water spot under the moved rock, available any time
// at stage >= 8. filling never sets holy_water_neiz (only throwing the vial does).
async function boulderWaterSpotUseWithGameObject(player, obj, item) {
    if (obj.id !== BOULDER_ROCK || getStage(player) < 8) {
        return false;
    }
    const isEmptyBowl =
        item.id === GOLDEN_BOWL_ID || item.id === BLESSED_GOLDEN_BOWL_ID;
    if (!isEmptyBowl) {
        return false;
    }
    player.message('You fill the bowl up with water..');
    player.inventory.remove(item.id);
    player.inventory.add(
        item.id === BLESSED_GOLDEN_BOWL_ID
            ? BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID
            : GOLDEN_BOWL_WITH_PURE_WATER_ID
    );
    return true;
}

// cut the tall reeds (1163) with the Machette into a reed pipe (used as a straw on
// the shallow water). cutting another while holding one just gives a second.
async function tallReedsUseWithGameObject(player, obj, item) {
    if (obj.id !== TALL_REEDS || item.id !== MACHETE_ID) {
        return false;
    }
    player.message('@que@You use your machette to cut down a tall reed.');
    await player.world.sleepTicks(2);
    player.message('@que@You cut it into a length of pipe.');
    player.inventory.add(CUT_REED_PLANT_ID);
    return true;
}

// the cut reed syphons pool water into a carried bowl. the pool is dried up at
// stages 5-7 (probing it is the stage 5 -> 6 transition); post-quest it refills.
async function shallowWaterUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== SHALLOW_WATER) {
        return false;
    }
    if (item.id === CUT_REED_PLANT_ID) {
        if (stageIn(player, 5, 6, 7)) {
            player.message('@que@It looks as if this pool has dried up...');
            await world.sleepTicks(2);
            player.message(
                '@que@A thick black sludge has replaced the sparkling pure water...'
            );
            await world.sleepTicks(2);
            player.message(
                '@que@There is a disgusting stench of death that emanates from this area...'
            );
            await world.sleepTicks(2);
            player.message("@que@Maybe Gujuo knows what's happened...");
            if (getStage(player) === 5) {
                setStage(player, 6);
            }
            return true;
        }
        if (
            (getStage(player) >= 9 || getStage(player) === -1) &&
            player.world.server.config.looseShallowWaterCheck === false
        ) {
            player.message(
                '@que@You use the cut reed plant to syphon some water from the pool.'
            );
            await world.sleepTicks(2);
            player.message('@que@You take a refreshing drink from the pool.');
            await world.sleepTicks(2);
            player.message(
                '@que@The cut reed is soaked through with water and is now all soggy.'
            );
            await world.sleepTicks(2);
            return true;
        }
        if (has(player, GOLDEN_BOWL_ID)) {
            player.message(
                '@que@You use the cut reed plant to syphon some water from the pool.'
            );
            await world.sleepTicks(2);
            player.message('@que@into your gold bowl.');
            await world.sleepTicks(2);
            player.inventory.remove(GOLDEN_BOWL_ID);
            player.inventory.add(GOLDEN_BOWL_WITH_PURE_WATER_ID);
            player.message(
                "@que@The water doesn't seem to sparkle as much as it did in the pool."
            );
            await world.sleepTicks(2);
        } else if (has(player, BLESSED_GOLDEN_BOWL_ID)) {
            player.message(
                '@que@You use the cut reed plant to syphon some water from the pool.'
            );
            await world.sleepTicks(2);
            player.message('@que@into your blessed gold bowl.');
            await world.sleepTicks(2);
            player.inventory.remove(BLESSED_GOLDEN_BOWL_ID);
            player.inventory.add(BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID);
            player.message(
                '@que@The water seems to bubble and sparkle as if alive.'
            );
            await world.sleepTicks(2);
        } else {
            player.message('@que@You start to syphon some water up the tube...');
            await world.sleepTicks(2);
            player.message('@que@But you have nothing to put the water in.');
            return true;
        }
        player.inventory.remove(CUT_REED_PLANT_ID);
        player.message(
            '@que@The cut reed is soaked through with water and is now all soggy.'
        );
        return true;
    }
    const isEmptyBowl =
        item.id === GOLDEN_BOWL_ID || item.id === BLESSED_GOLDEN_BOWL_ID;
    if (isEmptyBowl) {
        // the blessed bowl fills directly from the pool under the moved boulder
        // (never sets holy_water_neiz).
        if (
            item.id === BLESSED_GOLDEN_BOWL_ID &&
            getStage(player) === 8 &&
            player.y >= 3723 &&
            player.y <= 3740
        ) {
            player.message('You fill the bowl up with water..');
            player.inventory.remove(BLESSED_GOLDEN_BOWL_ID);
            player.inventory.add(BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID);
            return true;
        }
        player.message('@que@The water is awkward to get to...');
        await world.sleepTicks(2);
        player.message('@que@The gap to the water is too narrow.');
        return true;
    }
    return false;
}

// soak every carried raw Yommi seed in the blessed golden bowl of pure water (only
// the blessed bowl works). the stage 4->5 trigger.
async function germinateYommiSeedUseWithInventory(player, item, target) {
    const seed = item.id === YOMMI_TREE_SEED_ID ? item : target;
    const bowl = item.id === YOMMI_TREE_SEED_ID ? target : item;
    if (
        seed.id !== YOMMI_TREE_SEED_ID ||
        bowl.id !== BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID
    ) {
        return false;
    }
    while (has(player, YOMMI_TREE_SEED_ID)) {
        player.inventory.remove(YOMMI_TREE_SEED_ID);
        player.inventory.add(GERMINATED_YOMMI_TREE_SEED_ID);
    }
    player.message('You place the seeds in the pure sacred water...');
    player.inventory.remove(BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID);
    player.inventory.add(BLESSED_GOLDEN_BOWL_ID);
    player.message('The pure water in the golden bowl has run out...');
    await player.world.sleepTicks(2);
    player.message('You start to see little shoots growing on the seeds.');
    if (getStage(player) === 4) {
        setStage(player, 5);
    }
    return true;
}

// crafting and throwing the Holy Water Vial.

// a module-level map tracks each player's restartable 300-tick (5 minute)
// holy_water_neiz timer, keyed by player.id.
const holyWaterTimers = new Map();

// pour the blessed bowl of pure water into an enchanted vial (Holy Water) or an
// empty vial (a dud). each pour spends 1-15 charge; exhausting it empties the bowl.
async function holyWaterBowlUseWithInventory(player, item1, item2) {
    const bowl =
        item1.id === BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID ? item1 : item2;
    const vial =
        item1.id === BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID ? item2 : item1;
    if (bowl.id !== BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID) {
        return false;
    }
    if (vial.id !== ENCHANTED_VIAL_ID && vial.id !== EMPTY_VIAL_ID) {
        return false;
    }
    const { world } = player;
    if (vial.id === ENCHANTED_VIAL_ID) {
        player.message(
            'You pour some of the sacred water into the enchanted vial.'
        );
        await world.sleepTicks(1);
        player.message('You now have a vial of holy water.');
        await world.sleepTicks(1);
        player.inventory.remove(ENCHANTED_VIAL_ID);
        player.inventory.add(HOLY_WATER_VIAL_ID);
    } else {
        player.message('You pour some of the water into the empty vial');
        await world.sleepTicks(1);
        player.message("The water seems to loose some of it's effervescence.");
        await world.sleepTicks(1);
        player.inventory.remove(EMPTY_VIAL_ID);
        player.inventory.add(VIAL_ID);
    }
    if (player.cache.remaining_blessed_bowl === undefined) {
        player.cache.remaining_blessed_bowl = random(1, 15);
    } else if (player.cache.remaining_blessed_bowl > 1) {
        player.cache.remaining_blessed_bowl -= 1;
    } else {
        player.message('The pure water in the golden bowl has run out...');
        player.inventory.remove(BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID);
        player.inventory.add(BLESSED_GOLDEN_BOWL_ID);
        delete player.cache.remaining_blessed_bowl;
    }
    return true;
}

// throw an equipped Holy Water Vial at a nearby Ungadulu (stage <= 3 only). sets
// the 5-minute holy_water_neiz flag that weakens Nezikchened in the first fight.
async function throwHolyWaterVial(player, item) {
    if (item.id !== HOLY_WATER_VIAL_ID) {
        return false;
    }
    if (!player.inventory.isEquipped(HOLY_WATER_VIAL_ID)) {
        player.message('You need to equip this item to throw it.');
        return true;
    }
    const { world } = player;
    const ungadulu = [...world.npcs.getInArea(player.x, player.y, 4)].find(
        (n) => n.id === UNGADULU_ID
    );
    if (!ungadulu || getStage(player) > 3) {
        player.message('You see no one suitable to throw it at.');
        return true;
    }
    player.message('You throw the holy watervial at Ungadulu.');
    player.inventory.remove(HOLY_WATER_VIAL_ID);
    player.sendSound('projectile');

    const existingTimer = holyWaterTimers.get(player.id);
    if (existingTimer !== undefined) {
        world.clearTickTimeout(existingTimer);
    }
    player.cache.holy_water_neiz = true;
    const timer = world.setTickTimeout(() => {
        delete player.cache.holy_water_neiz;
        holyWaterTimers.delete(player.id);
    }, 300);
    holyWaterTimers.set(player.id, timer);

    const evil = changeNpc(player, ungadulu, EVIL_UNGADULU_ID);
    await evil.say('Vile serpent...you will pay for that...');
    const good = changeNpc(player, evil, UNGADULU_ID);
    await good.say("What...what happened...why am I all wet?");
    return true;
}

// the Yommi tree lifecycle. planting needs stage 8, sacred water, rune axe,
// woodcut 50 and herblaw 45 (50% withering roll); one watering grows it to full
// height; each stage decays on a timer. ownership is tracked in
// player.cache.yommi_tree_planted {x, y}.

// migration for pre-lifecycle saves that tracked {x, y, watered}: refund the seed
// and clear the stale marker.
function migrateYommiTreeCache(player) {
    const planted = player.cache.yommi_tree_planted;
    if (planted && planted.watered !== undefined) {
        delete player.cache.yommi_tree_planted;
        if (!has(player, GERMINATED_YOMMI_TREE_SEED_ID)) {
            player.inventory.add(GERMINATED_YOMMI_TREE_SEED_ID);
        }
    }
}

// after 15s the tree decays; the trunk lingers a minute, then fertile earth returns.
function scheduleYommiDecay(player, entity, decayedId, deathMessage) {
    const { world } = player;
    world.setTimeout(() => {
        if (world.gameObjects.entities[entity.index] !== entity) {
            return; // the tree progressed in time
        }
        const decayed = world.replaceEntity('gameObjects', entity, decayedId);
        if (player.loggedIn) {
            player.message(deathMessage);
        }
        const planted = player.cache.yommi_tree_planted;
        if (planted && planted.x === entity.x && planted.y === entity.y) {
            delete player.cache.yommi_tree_planted;
        }
        world.setTimeout(() => {
            if (world.gameObjects.entities[decayed.index] === decayed) {
                world.replaceEntity('gameObjects', decayed, FERTILE_EARTH);
            }
        }, 60000);
    }, 15000);
}

// after 60s the chopped/trimmed/carved stages revert to fertile earth.
function scheduleYommiRevert(player, entity) {
    const { world } = player;
    world.setTimeout(() => {
        if (world.gameObjects.entities[entity.index] !== entity) {
            return;
        }
        world.replaceEntity('gameObjects', entity, FERTILE_EARTH);
        const planted = player.cache.yommi_tree_planted;
        if (planted && planted.x === entity.x && planted.y === entity.y) {
            delete player.cache.yommi_tree_planted;
        }
    }, 60000);
}

async function fertileEarthUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== FERTILE_EARTH) {
        return false;
    }
    migrateYommiTreeCache(player);
    if (item.id === YOMMI_TREE_SEED_ID) {
        player.message(
            'These seeds need to be germinated in pure water before they'
        );
        player.message('can be planted in the fertile soil.');
        return true;
    }
    if (item.id !== GERMINATED_YOMMI_TREE_SEED_ID) {
        return false;
    }
    if (
        getStage(player) !== 8 ||
        !has(player, BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID)
    ) {
        player.message("You'll need some sacred water to feed ");
        player.message('the tree when it starts growing.');
        return true;
    }
    if (!has(player, RUNE_AXE_ID)) {
        player.message("You'll need a very tough, very sharp axe to");
        player.message('fell the tree once it is grown.');
        return true;
    }
    if (currentLevel(player, 'woodcutting') < 50) {
        player.message('You need an woodcut level of 50 to');
        player.message('fell the tree once it is grown.');
        return true;
    }
    if (currentLevel(player, 'herblaw') < 45) {
        player.message(
            'You need a herblaw skill of at least 45 to complete this task.'
        );
        return true;
    }
    player.inventory.remove(GERMINATED_YOMMI_TREE_SEED_ID);
    if (random(0, 1) !== 1) {
        const baby = world.replaceEntity('gameObjects', obj, BABY_YOMMI_TREE);
        player.message(
            '@que@You bury the Germinated Yommi tree seed in the fertile earth...'
        );
        await world.sleepTicks(2);
        player.message('@que@You start to see something growing.');
        await world.sleepTicks(2);
        const sapling = world.replaceEntity(
            'gameObjects',
            baby,
            YOMMI_TREE_SAPLING
        );
        player.cache.yommi_tree_planted = { x: obj.x, y: obj.y };
        scheduleYommiDecay(player, sapling, YOMMI_TREE_DEAD, 'The Sapling dies.');
        player.message('The plant grows at a remarkable rate.');
        player.message('It looks as if the tree needs to be watered...');
    } else {
        player.message('You planted the seed incorrectly, it withers and dies.');
    }
    return true;
}

// watering the sapling with sacred water grows it to full height; the waterer
// becomes the owner.
async function yommiTreeUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (
        obj.id !== YOMMI_TREE_SAPLING ||
        item.id !== BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID
    ) {
        return false;
    }
    migrateYommiTreeCache(player);
    player.inventory.remove(BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID);
    player.inventory.add(BLESSED_GOLDEN_BOWL_ID);
    player.message('@que@You water the Yommi tree from the golden bowl...');
    await world.sleepTicks(2);
    player.message('@que@It grows at a remarkable rate.');
    await world.sleepTicks(2);
    const grown = world.replaceEntity('gameObjects', obj, YOMMI_TREE_GROWN);
    player.cache.yommi_tree_planted = { x: obj.x, y: obj.y };
    scheduleYommiDecay(
        player,
        grown,
        YOMMI_TREE_ROTTEN,
        "The Yommi tree is past it's prime and dies ."
    );
    player.message('@que@Soon the tree stops growing...');
    await world.sleepTicks(2);
    player.message('@que@It looks tall enough now to make a good totem pole.');
    return true;
}

// chop -> trim -> carve with the rune axe; dead/rotten trunks give logs.
async function yommiTreeAxeUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (item.id !== RUNE_AXE_ID) {
        return false;
    }
    migrateYommiTreeCache(player);
    if (obj.id === YOMMI_TREE_DEAD || obj.id === YOMMI_TREE_ROTTEN) {
        player.message('@que@You chop the dead Yommi Tree down.');
        await world.sleepTicks(1);
        player.message('@que@You gain some logs..');
        await world.sleepTicks(2);
        world.replaceEntity('gameObjects', obj, FERTILE_EARTH);
        player.inventory.add(LOGS_ID);
        return true;
    }
    const planted = player.cache.yommi_tree_planted;
    if (!planted || planted.x !== obj.x || planted.y !== obj.y) {
        if (
            obj.id === YOMMI_TREE_GROWN ||
            obj.id === YOMMI_TREE_CHOPPED ||
            obj.id === YOMMI_TREE_TRIMMED
        ) {
            player.message('This is not your Yommi Tree.');
            return true;
        }
        return false;
    }
    if (obj.id === YOMMI_TREE_GROWN) {
        player.message(
            '@que@You wield the Rune Axe and prepare to chop the Yommi tree.'
        );
        await world.sleepTicks(2);
        const chopped = world.replaceEntity(
            'gameObjects',
            obj,
            YOMMI_TREE_CHOPPED
        );
        scheduleYommiRevert(player, chopped);
        player.message('@que@You chop the Yommi tree down.');
        await world.sleepTicks(2);
        player.message('@que@Perhaps you should trim those branches ?');
        return true;
    }
    if (obj.id === YOMMI_TREE_CHOPPED) {
        player.message('@que@You professionally wield your Rune Axe...');
        await world.sleepTicks(2);
        player.message('@que@As you trim the branches from the Yommi tree.');
        const trimmed = world.replaceEntity(
            'gameObjects',
            obj,
            YOMMI_TREE_TRIMMED
        );
        scheduleYommiRevert(player, trimmed);
        return true;
    }
    if (obj.id === YOMMI_TREE_TRIMMED) {
        player.message('@que@You craft a totem pole out of the Yommi tree.');
        const carved = world.replaceEntity(
            'gameObjects',
            obj,
            YOMMI_TOTEM_CARVED
        );
        scheduleYommiRevert(player, carved);
        return true;
    }
    return false;
}

async function yommiTotemLiftOpLoc(player, obj, command) {
    if (obj.id !== YOMMI_TOTEM_CARVED || command !== 'Lift') {
        return false;
    }
    migrateYommiTreeCache(player);
    const planted = player.cache.yommi_tree_planted;
    if (!planted || planted.x !== obj.x || planted.y !== obj.y) {
        player.message('This is not your totem pole to carry.');
        return true;
    }
    player.message('@que@This totem pole looks very heavy...');
    await player.world.sleepTicks(2);
    player.world.replaceEntity('gameObjects', obj, FERTILE_EARTH);
    delete player.cache.yommi_tree_planted;
    player.inventory.add(TOTEM_POLE_ID);
    player.cache.crafted_totem_pole = true;
    player.message('Carrying this totem pole saps your strength...');
    // OpenRSC: carrying the totem drains strength to 90% of current.
    setCurrentLevel(
        player,
        'strength',
        Math.floor(currentLevel(player, 'strength') * 0.9)
    );
    return true;
}

// replace the evil totem pole with the carved one; stage 9 wraps up.
async function evilTotemPoleUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== EVIL_TOTEM_POLE || item.id !== TOTEM_POLE_ID) {
        return false;
    }
    const totemStage = getStage(player);
    if (totemStage >= 10 || totemStage === -1) {
        player.message(
            '@que@You have already replaced the evil totem pole with your own.'
        );
        await world.sleepTicks(3);
        player.message('@que@You feel a great sense of accomplishment');
        return true;
    }
    if (totemStage === 9) {
        await replaceEvilTotemPole(player, obj);
        return true;
    }
    if (totemStage === 8) {
        // at stage 8 the swap summons the third demon fight (companion chain
        // only runs if Viyeldi was slain).
        if (
            player.cache.killed_viyeldi &&
            player.cache.viyeldi_companions === undefined
        ) {
            player.cache.viyeldi_companions = 1;
        }
        player.message('@que@You attempt to replace the evil totem pole.');
        await world.sleepTicks(3);
        player.message('@que@A black cloud emanates from the evil totem pole.');
        await world.sleepTicks(3);
        player.message('It slowly forms into the dread demon Nezikchened...');
        await demonFight(player);
        return true;
    }
    player.message(
        "This doesn't feel like the right time to disturb the totem pole."
    );
    return true;
}

// smith the Golden Bowl at an anvil: 2 gold bars, smithing 50, hammer, level-50
// success roll, 120xp on success / 4xp on failure.
// Ungadulu's cavern and the deep Viyeldi caves: crevice entrance, wooden doors,
// smash boulders, metal gates, cave agility, rope descent, the gem puzzle (Book
// of Binding), the ancient-wall SMELL door, and the crystal chain to the cavernous
// opening. box scrolls shown as chat lines.

// gathering success roll.
function calcGatheringSuccessfulLegacy(levelReq, skillLevel, equipmentBonus = 0) {
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

// production success roll.
function calcProductionSuccessfulLegacy(
    levelReq,
    skillLevel,
    stopsFailing,
    levelStopFail,
    minFailChance = 1
) {
    const roll = random(1, 256);
    if (skillLevel < levelReq) {
        return false;
    }
    const maxThreshold = stopsFailing ? 256 : 256 - minFailChance;
    const threshold = Math.min(
        maxThreshold,
        Math.floor(64 + (skillLevel - 1) * (19200.0 / (levelStopFail * 98)))
    );
    return roll <= threshold;
}

// LegendsQuestCaveAgility.succeed / ShiloVillageUtils.succeed.
function caveAgilitySucceed(player, req) {
    return calcProductionSuccessfulLegacy(
        req,
        currentLevel(player, 'agility'),
        false,
        req + 30
    );
}

// Thieving.succeedPickLockThieving: +10 effective levels with a lockpick.
function succeedPickLockThieving(player, reqLevel) {
    const effectiveLevel =
        currentLevel(player, 'thieving') + (has(player, LOCKPICK_ID) ? 10 : 0);
    return calcGatheringSuccessfulLegacy(reqLevel, effectiveLevel);
}

// OpenRSC changeloc(obj, duration, newID): show newID, then restore.
function tempSwapObject(world, obj, newId, ticks) {
    const swapped = world.replaceEntity('gameObjects', obj, newId);
    world.setTickTimeout(() => {
        if (world.gameObjects.entities[swapped.index] === swapped) {
            world.replaceEntity('gameObjects', swapped, obj.id);
        }
    }, ticks);
}

// display a gem above a rock briefly.
function showGemAboveRock(player, gemId, x, y) {
    const { world } = player;
    world.addPlayerDrop(player, { id: gemId }, x, y);
    const spawned = world.groundItems
        .getAtPoint(x, y)
        .find((g) => g.id === gemId);
    if (spawned) {
        world.setTickTimeout(() => {
            if (world.groundItems.entities[spawned.index] === spawned) {
                world.removeEntity('groundItems', spawned);
            }
        }, 8);
    }
}

// render an ActionSender.sendBox scroll as a sequence of chat lines.
async function sendScrollText(player, lines) {
    for (const line of lines) {
        player.message(line);
        await player.world.sleepTicks(1);
    }
}

// the surface crevice (1151), the way into Ungadulu's cavern.
async function surfaceCreviceSearch(player, obj) {
    const { world } = player;
    const stage = getStage(player);
    if (!(player.cache.legends_cavern || stage >= 2 || stage === -1)) {
        player.message('@que@You see nothing significant.');
        return true;
    }
    if (stage === 1) {
        player.message('@que@You see nothing significant...');
        await world.sleepTicks(2);
        player.message('@que@At first....');
        await world.sleepTicks(2);
    }
    player.message(
        '@que@You see that there is a small crevice that you may be able to crawl though.?'
    );
    await world.sleepTicks(2);
    player.message(
        '@que@Would you like to try to crawl through, it looks quite an enclosed area.'
    );
    await world.sleepTicks(2);
    const menu = await ask(
        player,
        [
            "Yes, I'll crawl through, I'm very athletic.",
            "No, I'm pretty scared of enclosed areas."
        ],
        false
    );
    if (menu === 0) {
        if (currentLevel(player, 'agility') < 50) {
            player.message('You need an agility of 50 to even attempt this.');
            return true;
        }
        player.message('@que@You try to crawl through...');
        await world.sleepTicks(2);
        player.message('@que@You contort your body to fit the crevice.');
        await world.sleepTicks(2);
        if (failCalculation(player, 'agility', 50)) {
            player.message('@que@You adroitely squeeze serpent like into the crevice.');
            await world.sleepTicks(2);
            player.message(
                '@que@You find a small narrow tunnel that goes for some distance.'
            );
            await world.sleepTicks(2);
            player.message(
                '@que@After some time, you find a small cave opening...and walk through.'
            );
            await world.sleepTicks(2);
            player.teleport(461, 3700);
            if (player.cache.legends_cavern) {
                delete player.cache.legends_cavern;
                if (getStage(player) === 1) {
                    setStage(player, 2);
                }
            }
        } else {
            player.message('@que@You get cramped into a tiny space and start to suffocate.');
            await world.sleepTicks(5);
            player.message('@que@You wriggle and wriggle but you cannot get out..');
            await world.sleepTicks(5);
            player.message('@que@Eventually you manage to break free.');
            await world.sleepTicks(2);
            player.message(
                '@que@But you scrape yourself very badly as your force your way out.'
            );
            await world.sleepTicks(2);
            player.message("@que@And you're totally exhausted from the experience.");
            await world.sleepTicks(2);
            player.damage(5);
        }
    } else if (menu === 1) {
        player.message(
            '@que@You decide against forcing yourself into the tiny crevice..'
        );
        await world.sleepTicks(2);
        player.message('@que@And realise that you have much better things to do..');
        await world.sleepTicks(2);
        player.message("@que@Like visit Inn's and mine ore...");
        await world.sleepTicks(2);
    }
    return true;
}

// cave entrances / exits between the surface, cavern and deep caves.
async function caveEntranceOpLoc(player, obj) {
    const { world } = player;
    if (obj.id === CAVE_EXIT_TO_SURFACE) {
        player.message('@que@You crawl back out from the cavern...');
        await world.sleepTicks(2);
        player.teleport(452, 874);
        return true;
    }
    if (obj.id === CAVE_ENTRANCE_SMALL) {
        player.message('@que@You see a small cave entrance.');
        await world.sleepTicks(2);
        player.message('@que@Would you like to climb into it?');
        await world.sleepTicks(2);
        const menu = await ask(
            player,
            ["Yes, I'll climb into it.", "No, I'll stay where I am."],
            false
        );
        if (menu === 0) {
            player.message('You clamber into the small cave...');
            player.teleport(452, 3702);
        } else if (menu === 1) {
            player.message(
                'You decide against climbing into the small, uncomfortable looking tunnel.'
            );
        }
        return true;
    }
    return false;
}

// Ungadulu's cavern furniture: the notes, the tome and the bookcase hole.
async function cavernFurnitureSearch(player, obj) {
    const { world } = player;
    if (obj.id === CAVERN_CRUDE_DESK) {
        if (has(player, SHAMANS_TOME_ID)) {
            player.message('@que@You search the desk ...');
            await world.sleepTicks(2);
            player.message('...but find nothing.');
        } else {
            player.message('@que@You search the desk ...');
            await world.sleepTicks(3);
            player.inventory.add(SHAMANS_TOME_ID);
            player.message('You find a book...it looks like an ancient tome...');
        }
        return true;
    }
    if (obj.id === CAVERN_BOOKCASE) {
        player.message('@que@You search the bookcase...');
        await world.sleepTicks(2);
        player.message('@que@And find a large gaping hole at the back.');
        await world.sleepTicks(2);
        player.message('Would you like to climb through the hole?');
        const menu = await ask(
            player,
            ["Yes, I'll climb through the hole.", "No, I'll stay here."],
            false
        );
        if (menu === 0) {
            player.message('@que@You climb through the hole in the wall..');
            await world.sleepTicks(2);
            player.message(
                "@que@It's very narrow and you have to contort your body a lot."
            );
            await world.sleepTicks(2);
            player.message(
                '@que@After some time, you  manage to wriggle out of a small cavern...'
            );
            await world.sleepTicks(2);
            player.teleport(444, 3699);
        } else if (menu === 1) {
            player.message('You decide to stay where you are.');
        }
        return true;
    }
    if (obj.id === CAVERN_TABLE) {
        player.message('You start searching the table...');
        if (has(player, SCRAWLED_NOTES_ID)) {
            player.message('You cannot find anything else in here.');
        } else {
            await world.sleepTicks(2);
            player.inventory.add(SCRAWLED_NOTES_ID);
            player.message(
                '@que@You find a scrap of paper with nonesense written on it.'
            );
            await world.sleepTicks(2);
        }
        return true;
    }
    if (obj.id === CAVERN_CRUDE_BED) {
        player.message('You search the flea infested rags..');
        if (has(player, SCATCHED_NOTES_ID)) {
            player.message('You cannot find anything else in here.');
        } else {
            await world.sleepTicks(2);
            player.inventory.add(SCATCHED_NOTES_ID);
            player.message(
                '@que@You find a scrap of paper with spidery writing on it.'
            );
            await world.sleepTicks(2);
        }
        return true;
    }
    if (obj.id === CAVERN_CRATE) {
        player.message('You search the crate.');
        if (has(player, SCRIBBLED_NOTES_ID)) {
            player.message('You cannot find anything else in here.');
        } else {
            await world.sleepTicks(2);
            player.inventory.add(SCRIBBLED_NOTES_ID);
            player.message('@que@After some time you find a scrumpled up piece of paper.');
            await world.sleepTicks(2);
            player.message('It looks like rubbish...');
        }
        return true;
    }
    if (obj.id === HALF_BURIED_REMAINS) {
        player.message('@que@It looks as if some poor unfortunate soul died here.');
        return true;
    }
    return false;
}

// the ancient wooden doors (1160): open from the south, pick from the north.
async function ancientWoodenDoorsOpLoc(player, obj, command) {
    const { world } = player;
    if (command === 'open') {
        if (player.y >= 3703) {
            player.message('@que@You push the doors open and walk through.');
            await world.sleepTicks(2);
            tempSwapObject(world, obj, OPEN_DOORS, 3);
            player.teleport(442, 3701);
            await world.sleepTicks(3);
            player.message(
                "The doors make a satisfying 'CLICK' sound as they close."
            );
        } else {
            player.message("@que@You push on the doors...they're really shut..");
            await world.sleepTicks(2);
            player.message('@que@It looks as if they have a huge lock on it...');
            await world.sleepTicks(2);
            player.message('Although ancient, it looks very sophisticated...');
        }
        return true;
    }
    // "pick lock"
    if (player.y >= 3703) {
        player.message('@que@You see a lever which you pull on to open the door.');
        await world.sleepTicks(2);
        tempSwapObject(world, obj, OPEN_DOORS, 3);
        player.teleport(442, 3701);
        player.message('@que@You walk through the door.');
        await world.sleepTicks(2);
        player.message("The doors make a satisfying 'CLICK' sound as they close.");
        return true;
    }
    if (currentLevel(player, 'thieving') < 50) {
        player.message('You need a thieving level of at least 50 to attempt this.');
        return true;
    }
    if (!has(player, LOCKPICK_ID)) {
        player.message('@que@The mechanism for this lock looks very sophisticated...');
        await world.sleepTicks(2);
        player.message("you're unable to affect the lock without the proper tool..");
        return true;
    }
    player.message('@que@You attempt to pick the lock..');
    await world.sleepTicks(2);
    player.message('It looks very sophisticated ...');
    await player.say('Hmmm, interesting...');
    await world.sleepTicks(2);
    player.message('You carefully insert your lockpick into the lock.');
    await player.say('This will be a challenge...');
    await world.sleepTicks(2);
    player.message('You feel for the pins and levers in the mechanism.');
    await player.say('Easy does it....');
    await world.sleepTicks(2);
    if (succeedPickLockThieving(player, 50)) {
        player.message("@gre@'CLICK'");
        await world.sleepTicks(2);
        await player.say('Easy as pie...');
        await world.sleepTicks(2);
        player.message('@que@You tumble the lock mechanism and the door opens easily.');
        await world.sleepTicks(2);
        player.addExperience('thieving', 100);
        tempSwapObject(world, obj, OPEN_DOORS, 3);
        player.teleport(441, 3703);
    } else {
        player.message("...but you don't manage to pick the lock.");
    }
    return true;
}

// the smashable boulder corridors (mining 52 + any pickaxe).
async function smashBouldersOpLoc(player, obj) {
    const { world } = player;
    if (!PICKAXE_IDS.some((id) => has(player, id))) {
        player.message(
            "@que@You'll need a pickaxe to smash your way through these boulders."
        );
        await world.sleepTicks(3);
        return true;
    }
    if (currentLevel(player, 'mining') < 52) {
        if (player.y < 3707) {
            player.message(
                'You need a mining ability of at least 52 to affect these boulders.'
            );
            return true;
        }
        player.message(
            '@que@You could be stuck here for ages until your mining ability returns.'
        );
        await world.sleepTicks(3);
        player.message('@que@Would you like to try to climb out?');
        await world.sleepTicks(3);
        player.message(
            "@que@It looks rough going, but at least you won't be stuck here for ages."
        );
        await world.sleepTicks(3);
        const outMenu = await ask(
            player,
            ["Yes, I'll climb out.", "No, I'll stay here a while."],
            false
        );
        if (outMenu === 0) {
            while (player.y > 3707) {
                player.damage(2);
                player.teleport(player.x, player.y - 3);
                await world.sleepTicks(3);
            }
            player.damage(1);
            player.teleport(442, 3703);
        } else if (outMenu === 1) {
            player.message('You decide to stay where you are.');
            await world.sleepTicks(3);
        }
        return true;
    }
    if (failCalculation(player, 'mining', 50)) {
        player.message('@que@You take a good swing at the rock with your pick...');
        await world.sleepTicks(2);
        tempSwapObject(world, obj, SMASHED_ROCKS, 3);
        if (obj.id === SMASH_BOULDERS[0] && player.y <= 3704) {
            player.teleport(441, 3707);
        } else if (obj.id === SMASH_BOULDERS[0] && player.y >= 3707) {
            player.teleport(442, 3704);
        } else if (obj.id === SMASH_BOULDERS[1] && player.y <= 3708) {
            player.teleport(441, 3711);
        } else if (obj.id === SMASH_BOULDERS[1] && player.y >= 3711) {
            player.teleport(441, 3708);
        } else if (obj.id === SMASH_BOULDERS[2] && player.y <= 3712) {
            player.teleport(441, 3715);
        } else if (obj.id === SMASH_BOULDERS[2] && player.y >= 3715) {
            player.teleport(441, 3712);
        }
        player.message('@que@...and smash it into smaller pieces.');
        await world.sleepTicks(3);
        player.message(
            'Another large rock falls down replacing the one that you smashed.'
        );
    } else {
        player.message('You fail to make a mark on the rocks.');
        player.message(
            'You miss hit the rock and the vibration shakes your bones.'
        );
        player.message('Your mining ability suffers...');
        setCurrentLevel(player, 'mining', currentLevel(player, 'mining') - 1);
    }
    return true;
}

// the heavy metal gate (1033): strength 50 force.
async function heavyMetalGateOpLoc(player, obj, command) {
    const { world } = player;
    if (command === 'look') {
        player.message('@que@This huge metal gate bars the way further...');
        await world.sleepTicks(2);
        player.message(
            '@que@There is an intense and unpleasant feeling from this place.'
        );
        await world.sleepTicks(2);
        player.message(
            'And you can see why, shadowy flying creatures seem to hover in the still dark air.'
        );
        return true;
    }
    player.message("@que@You push the gates...they're very stiff...");
    await world.sleepTicks(2);
    player.message("@que@They won't budge with a normal push.");
    await world.sleepTicks(2);
    player.message('@que@Do you want to try to force them open with brute strength?');
    await world.sleepTicks(2);
    const menu = await ask(
        player,
        [
            "Yes, I'm very strong, I'll force them open.",
            "No, I'm having second thoughts."
        ],
        false
    );
    if (menu === 0) {
        if (currentLevel(player, 'strength') < 50) {
            player.message(
                'You need a Strength of at least 50 to affect these gates.'
            );
            return true;
        }
        player.message('@que@You ripple your muscles...preparing too exert yourself...');
        await world.sleepTicks(2);
        await player.say('Hup!');
        player.message('@que@You brace yourself against the doors...');
        await world.sleepTicks(2);
        await player.say('Urghhhhh!');
        player.message('@que@You start to force against the gate..');
        await world.sleepTicks(2);
        await player.say('Arghhhhhhh!');
        player.message('@que@You push and push,');
        await world.sleepTicks(2);
        await player.say('Shhhhhhhshshehshsh');
        if (failCalculation(player, 'strength', 50)) {
            player.message('@que@You just manage to force the gates open slightly, ');
            await world.sleepTicks(2);
            player.message('@que@just enough to force yourself through.');
            await world.sleepTicks(2);
            tempSwapObject(world, obj, OPEN_GATE, 3);
            if (player.y <= 3717) {
                player.teleport(441, 3719);
            } else {
                player.teleport(441, 3717);
            }
        } else {
            player.message(
                "@que@but run out of steam before you're able to force the gates open."
            );
            await world.sleepTicks(2);
            player.message(
                'The effort of trying to force the gates reduces your strength temporarily'
            );
            setCurrentLevel(
                player,
                'strength',
                currentLevel(player, 'strength') - 1
            );
        }
    } else if (menu === 1) {
        player.message('You decide against forcing the gates.');
    }
    return true;
}

// the dark metal gate (1165): the magical test guarding the beam room.
async function darkMetalGateOpLoc(player, obj, command) {
    const { world } = player;
    if (command === 'open') {
        if (player.y <= 3715) {
            player.message('You open the gates and walk through..');
            await world.sleepTicks(2);
            player.teleport(474, 3720);
            player.message(
                'You magically appear in another area of the cave system.'
            );
            return true;
        }
        player.message(
            "This gate is fused with rock, it doesn't seem possible to open it."
        );
        await world.sleepTicks(2);
        player.message('But it does look slightly strange in some way.');
        await world.sleepTicks(2);
        return true;
    }
    // search
    player.message('It just looks like a normal gate...');
    await world.sleepTicks(5);
    player.message('At first...');
    await world.sleepTicks(1);
    player.message(
        'And then you notice that some of the bars of metal make up letters.'
    );
    await world.sleepTicks(2);
    player.message('After some time you manage to make sense of it...');
    await world.sleepTicks(2);
    player.message('Would you like to read it?');
    await world.sleepTicks(2);
    const menu = await ask(
        player,
        [
            "Yes, I'll read it.",
            "No, I don't want to read that.",
            'Search further...'
        ],
        false
    );
    if (menu === 0) {
        player.message('You attempt to read the message in the gate...');
        await world.sleepTicks(2);
        await sendScrollText(player, [
            'Gates of metal will not be kind,',
            'To those who care not for the way of mind.',
            'To all men of learning and supernatural powers,',
            'With book and rune spend the long dark hours.',
            'If passage further you would endure,',
            'Give me a taste of your power so pure.'
        ]);
    } else if (menu === 1) {
        player.message('You decide not to read the message.');
    } else if (menu === 2) {
        player.message('You scour the gate for any more clues...');
        await world.sleepTicks(2);
        player.message(
            'Something etched into the wall nearby catches your eye...'
        );
        await world.sleepTicks(2);
        player.message('It looks like a picture of four pillars or constructions.');
        await world.sleepTicks(2);
        player.message('Over the first pillar is a picture of a cloud...');
        await world.sleepTicks(2);
        player.message(
            'Over the second pillar are some etched flickering flames...'
        );
        await world.sleepTicks(2);
        player.message(
            'Over the third pillar is the carved image of a dew drop or a tear...'
        );
        await world.sleepTicks(2);
        player.message(
            'Over the fourth pillar is the likeness of a ploughed field...'
        );
        await world.sleepTicks(2);
        player.message('All of these images are contained within a sphere.');
        await world.sleepTicks(2);
        await player.say('Hmmm, I wonder what they could mean?');
    }
    return true;
}

// LegendsQuestDarkMetalGate.onSpellLoc: a charge-orb cast opens the gate.
async function darkMetalGateSpell(player, gameObject, spellId) {
    const { world } = player;
    if (gameObject.id !== DARK_METAL_GATE) {
        return false;
    }
    if (!CHARGE_ORB_SPELL_IDS.has(spellId)) {
        player.message('Nothing interesting happens');
        return true;
    }
    if (!checkAndRemoveRunes(player, spellId)) {
        return true;
    }
    player.message('The orb shatters with the power of the magic.');
    await world.sleepTicks(2);
    player.message('The spell works and the gates open.');
    await world.sleepTicks(2);
    player.teleport(474, 3714);
    player.message('You magically appear in a different part of the cave system.');
    await world.sleepTicks(8);
    player.message('It seems that the gate was a test of magical ability.');
    await world.sleepTicks(2);
    player.message('As soon as you enter this room, you are filled with dread.');
    await world.sleepTicks(2);
    player.message('In the centre of the room is a large gaping hole.');
    await world.sleepTicks(2);
    player.message('It goes down a long way...');
    await world.sleepTicks(2);
    return true;
}

// the wooden beam, the rope descent and the rope back up.
async function woodenBeamSearch(player, obj) {
    const { world } = player;
    player.message('You search the wooden beam...');
    if (player.cache.legends_wooden_beam) {
        player.message(
            'You search the wooden beam and find the rope you attached.'
        );
        tempSwapObject(world, obj, ROPE_DOWN_BEAM, 8);
    } else {
        player.message('@que@You see nothing special about this...');
        await world.sleepTicks(2);
        player.message('Perhaps if you had a rope, it might be more functional.');
    }
    return true;
}

async function woodenBeamUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== WOODEN_BEAM || item.id !== ROPE_ID) {
        return false;
    }
    player.message('You throw one end of the rope around the beam.');
    player.inventory.remove(ROPE_ID);
    tempSwapObject(world, obj, ROPE_DOWN_BEAM, 8);
    player.cache.legends_wooden_beam = true;
    return true;
}

async function ropeDownDescend(player, obj) {
    const { world } = player;
    const stage = getStage(player);
    if (stage >= 9 || stage === -1) {
        player.message("@que@The rope snaps as you're about to climb down it.");
        await world.sleepTicks(2);
        player.message('@que@Perhaps you need a new rope.');
        await world.sleepTicks(2);
        return true;
    }
    player.message('@que@This rope climb looks pretty dangerous,');
    await world.sleepTicks(2);
    player.message('@que@Are you sure you want to go down?');
    await world.sleepTicks(2);
    const menu = await ask(
        player,
        ["Yes,I'll go down the rope...", 'No way do I want to go down there.'],
        false
    );
    if (menu === 0) {
        player.message('@que@You prepare to climb down the rope...');
        await world.sleepTicks(2);
        await player.say('! Gulp !');
        await world.sleepTicks(2);
        if (!player.cache.gujuo_potion) {
            player.message('@que@...but a terrible fear grips you...');
            await world.sleepTicks(2);
            player.message('And you can go no further.');
        } else {
            if (random(0, 4) === 0) {
                player.message('@que@but fear stabs at your heart...');
                await world.sleepTicks(2);
                player.message('@que@and you lose concentration,');
                await world.sleepTicks(2);
                player.message('@que@you slip and fall....');
                await world.sleepTicks(2);
                player.damage(random(10, 15));
            } else {
                player.message('@que@And although fear stabs at your heart...');
                await world.sleepTicks(2);
                player.message('@que@You shimmey down the rope...');
                await world.sleepTicks(2);
            }
            player.teleport(426, 3707);
        }
    } else if (menu === 1) {
        player.message('You decide not to go down the rope.');
    }
    return true;
}

// cave agility: the walkways and rock-hewn stairs.
async function rockyWalkwayBalance(player, obj) {
    if (player.x === obj.x && player.y === obj.y) {
        player.message("You're standing there already!");
        return true;
    }
    if (caveAgilitySucceed(player, 50)) {
        player.message('You manage to keep your balance.');
        player.teleport(obj.x, obj.y);
        player.addExperience('agility', 20);
    } else {
        player.teleport(421, 3699);
        player.message('You slip and fall...');
        const failScene = random(0, 10);
        if (failScene === 0) {
            player.message('...but you luckily avoid any damage.');
        } else if (failScene <= 2) {
            player.damage(random(3, 6));
            player.message('...and take a bit of damage.');
        } else if (failScene <= 5) {
            player.damage(random(7, 11));
            player.message('...and take some damage.');
        } else if (failScene <= 7) {
            player.damage(random(12, 16));
            player.message('...and take damage.');
        } else if (failScene <= 9) {
            player.damage(random(17, 23));
            player.message('...and are injured.');
        } else {
            player.damage(random(24, 31));
            player.message('...and take some major damage.');
        }
        player.addExperience('agility', 5);
    }
    return true;
}

async function rockHewnStairsClimb(player, obj) {
    const { world } = player;
    if (currentLevel(player, 'agility') < 50) {
        player.message('You need an agility level of 50 to step these stairs');
        return true;
    }
    // per-stairs midpoint + up/down endpoints
    let mid;
    let down;
    let up;
    let goingDown;
    if (obj.id === ROCK_HEWN_STAIRS[0]) {
        mid = [426, 3704];
        down = [426, 3702];
        up = [426, 3706];
        goingDown = player.y >= 3706;
    } else if (obj.id === ROCK_HEWN_STAIRS[1]) {
        mid = [424, 3702];
        down = [422, 3702];
        up = [426, 3702];
        goingDown = player.x >= 426;
    } else if (obj.id === ROCK_HEWN_STAIRS[2]) {
        mid = [419, 3704];
        down = [419, 3706];
        up = [419, 3702];
        goingDown = player.y <= 3702;
    } else {
        mid = [421, 3707];
        down = [423, 3707];
        up = [419, 3707];
        goingDown = player.x <= 419;
    }
    if (caveAgilitySucceed(player, 50)) {
        player.message(
            goingDown ? 'You climb down the steps.' : 'You climb up the stairs.'
        );
        player.teleport(mid[0], mid[1]);
        await world.sleepTicks(1);
        player.addExperience('agility', 20);
        const dest = goingDown ? down : up;
        player.teleport(dest[0], dest[1]);
    } else {
        player.message('You slip and fall...');
        player.damage(random(2, 3));
        player.teleport(mid[0], mid[1]);
        await world.sleepTicks(1);
        player.addExperience('agility', 5);
        player.teleport(down[0], down[1]);
    }
    return true;
}

// the crystal chain: lava furnace -> a red crystal -> red eye rock ->
// glowing red crystal -> cavernous opening.
async function lavaFurnaceOpLoc(player, obj, command) {
    const { world } = player;
    if (command === 'look') {
        player.message('@que@This is an ancient looking furnace.');
        await world.sleepTicks(1);
        return true;
    }
    player.message('@que@You search the lava furnace.');
    await world.sleepTicks(2);
    player.message('@que@You find a small compartment that you may be able to use.');
    await world.sleepTicks(2);
    player.message(
        '@que@Strangely, it looks as if it is designed for a specific purpose...'
    );
    await world.sleepTicks(2);
    player.message('@que@to fuse things together at very high temperatures...');
    await world.sleepTicks(1);
    return true;
}

async function lavaFurnaceUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== ANCIENT_LAVA_FURNACE) {
        return false;
    }
    const cacheKey = FURNACE_CRYSTAL_KEYS[item.id];
    if (!cacheKey) {
        player.message('Nothing interesting happens');
        return true;
    }
    if (currentLevel(player, 'crafting') < 50) {
        player.message(
            'You need a crafting ability of at least 50 to perform this task.'
        );
        return true;
    }
    if (!player.cache[cacheKey]) {
        player.cache[cacheKey] = true;
        player.inventory.remove(item.id);
        player.message('@que@You carefully place the piece of crystal into ');
        await world.sleepTicks(2);
        player.message('@que@a specially shaped compartment in the furnace.');
        await world.sleepTicks(2);
    }
    if (
        player.cache.a_chunk_of_crystal &&
        player.cache.a_lump_of_crystal &&
        player.cache.a_hunk_of_crystal
    ) {
        player.message('@que@You place the final segment of the crystal together into the ');
        await world.sleepTicks(2);
        player.message('@que@strangely shaped compartment, all the pieces seem to fit...');
        await world.sleepTicks(2);
        player.message('@que@You use your crafting skill to control the furnace.');
        await world.sleepTicks(2);
        player.message(
            '@que@The heat in the furnace slowly rises and soon fuses the parts together...'
        );
        await world.sleepTicks(2);
        player.message('@que@As soon as the item cools, you pick it up...');
        await world.sleepTicks(2);
        player.message(
            '@que@As the crystal touches your hands a voice inside of your head says..'
        );
        await world.sleepTicks(2);
        player.message('@gre@Voice in head: Bring life to the dragons eye.');
        await world.sleepTicks(2);
        delete player.cache.a_chunk_of_crystal;
        delete player.cache.a_lump_of_crystal;
        delete player.cache.a_hunk_of_crystal;
        player.inventory.add(A_RED_CRYSTAL_ID);
    } else {
        player.message("@que@The compartment in the furnace isn't full yet.");
        await world.sleepTicks(2);
        player.message('@que@It looks like you need more pieces of crystal.');
        await world.sleepTicks(1);
    }
    return true;
}

async function redEyeRockUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== RED_EYE_ROCK || item.id !== A_RED_CRYSTAL_ID) {
        return false;
    }
    player.message('@que@You carefully place the Dragon Crystal on the rock.');
    await world.sleepTicks(2);
    player.message(
        '@que@The rocks seem to vibrate and hum and the crystal starts to glow.'
    );
    await world.sleepTicks(2);
    player.message(
        'The vibration in the area diminishes, but the crystal continues to glow.'
    );
    player.inventory.remove(A_RED_CRYSTAL_ID);
    player.inventory.add(A_GLOWING_RED_CRYSTAL_ID);
    return true;
}

async function cavernousOpeningOpLoc(player, obj, command) {
    const { world } = player;
    if (command === 'enter') {
        if (player.y >= 3733) {
            player.message('You enter the dark cave...');
            player.teleport(395, 3725);
            return true;
        }
        if (player.cache.cavernous_opening || getStage(player) === -1) {
            player.message('@que@You walk carefully into the darkness of the cavern..');
            await world.sleepTicks(2);
            player.teleport(395, 3733);
        } else {
            player.message('@que@You walk into an invisible barrier...');
            await world.sleepTicks(2);
            player.message(
                '@que@Somekind of magical force will not allow you to pass into the cavern.'
            );
            await world.sleepTicks(1);
        }
        return true;
    }
    // search
    if (player.cache.cavernous_opening) {
        player.message('@que@You can see a glowing crystal shape in the wall.');
        await world.sleepTicks(2);
        player.message('@que@It looks like the Crystal is magical, ');
        await world.sleepTicks(2);
        player.message('@que@it allows access to the cavern.');
        await world.sleepTicks(2);
    } else {
        player.message(
            '@que@You see a heart shaped depression in the wall next to the cavern.'
        );
        await world.sleepTicks(2);
        player.message('@que@And a message reads...');
        await world.sleepTicks(2);
        player.message("@gre@All ye who stand 'ere the dragons teeth,");
        await world.sleepTicks(2);
        player.message('@gre@Place your full true heart and proceed...');
        await world.sleepTicks(1);
    }
    return true;
}

async function cavernousOpeningUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== CAVERNOUS_OPENING || item.id !== A_GLOWING_RED_CRYSTAL_ID) {
        return false;
    }
    player.message('@que@You carefully place the glowing heart shaped crystal into ');
    await world.sleepTicks(2);
    player.message(
        '@que@the depression, it slots in perfectly and glows even brighter.'
    );
    await world.sleepTicks(2);
    player.message('@que@You hear a snapping sound coming from in front of the cave.');
    await world.sleepTicks(2);
    player.inventory.remove(A_GLOWING_RED_CRYSTAL_ID);
    player.cache.cavernous_opening = true;
    return true;
}

// the carved-rock gem puzzle -> the Book of Binding.
async function carvedRockSearch(player, obj) {
    const { world } = player;
    player.message('@que@You see a delicate inscription on the rock, it says,');
    await world.sleepTicks(2);
    player.message("@gre@'Once there were crystals to make the pool shine,'");
    await world.sleepTicks(3);
    player.message("@gre@'Ordered in stature to retrieve what's mine.'");
    await world.sleepTicks(1);
    const rock = GEM_ROCKS.find((r) => r.x === obj.x && r.y === obj.y);
    if (!rock) {
        return true;
    }
    if (player.cache['legends_attach_' + rock.mode]) {
        // lock the gem in place so it cannot be retrieved from this state
        player.cache['legends_attach_' + rock.mode] = 2;
        showGemAboveRock(player, rock.gemId, obj.x, obj.y);
        player.message(
            '@que@A barely visible ' +
                rock.rockName +
                ' becomes clear again, spinning above the rock.'
        );
        await world.sleepTicks(2);
        player.message('And then fades again...');
        await world.sleepTicks(2);
    }
    return true;
}

async function carvedRockUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (obj.id !== CARVED_ROCK) {
        return false;
    }
    const gemMatch = GEM_ROCKS.find((r) => r.gemId === item.id);
    if (!gemMatch) {
        player.message('Nothing interesting happens');
        return true;
    }
    const rockHere = GEM_ROCKS.find(
        (r) => r.gemId === item.id && r.x === obj.x && r.y === obj.y
    );
    const attachMode = rockHere ? rockHere.mode : -1;
    if (attachMode !== -1 && player.cache['legends_attach_' + attachMode]) {
        // already attached: lock it and replay the display
        player.cache['legends_attach_' + attachMode] = 2;
        player.message(
            'You have already placed an ' +
                gemMatch.gemName +
                ' above this rock.'
        );
        showGemAboveRock(player, item.id, obj.x, obj.y);
        player.message(
            '@que@A barely visible ' +
                gemMatch.gemName +
                ' becomes clear again, spinning above the rock.'
        );
        await world.sleepTicks(2);
        player.message('And then fades again...');
        return true;
    }
    if (attachMode !== -1 && !has(player, BOOKING_OF_BINDING_ID)) {
        player.inventory.remove(item.id);
        player.message('You carefully move the gem closer to the rock.');
        player.message(
            'The ' +
                gemMatch.gemName +
                ' glows and starts spinning as it hovers above the rock.'
        );
        showGemAboveRock(player, item.id, obj.x, obj.y);
        player.cache['legends_attach_' + attachMode] = 1;
        if (
            GEM_ROCKS.every((r) => player.cache['legends_attach_' + r.mode])
        ) {
            player.message('@que@Suddenly all the crystals begin to glow very brightly.');
            await world.sleepTicks(2);
            player.message('@que@The room is lit up with the bright light...');
            await world.sleepTicks(2);
            player.message(
                '@que@Soon, the light from all the crystals converges into a point.'
            );
            await world.sleepTicks(2);
            player.message(
                '@que@And you see a strange book appear where the light is focused.'
            );
            await world.sleepTicks(2);
            player.message('@que@You pick the book up and place it in your inventory.');
            await world.sleepTicks(2);
            player.message('@que@All the crystals disapear...and the light fades...');
            await world.sleepTicks(2);
            player.inventory.add(BOOKING_OF_BINDING_ID);
            for (const r of GEM_ROCKS) {
                delete player.cache['legends_attach_' + r.mode];
            }
        }
    } else {
        player.message('You carefully move the gem closer to the rock.');
        player.message('but nothing happens...');
    }
    return true;
}

// LegendsQuestGameObjects onTakeObj: a displayed gem can only be reclaimed
// while it is freshly attached (attach state 1).
async function carvedRockGemTake(player, groundItem) {
    const { world } = player;
    const rock = GEM_ROCKS.find(
        (r) =>
            r.gemId === groundItem.id &&
            r.x === groundItem.x &&
            r.y === groundItem.y
    );
    if (!rock) {
        return false;
    }
    if (player.cache['legends_attach_' + rock.mode] === 1) {
        player.message('@que@You take the ' + rock.gemName + '.');
        world.removeEntity('groundItems', groundItem);
        player.inventory.add(groundItem.id);
        delete player.cache['legends_attach_' + rock.mode];
    }
    return true;
}

// wall objects: flame wall, ruined wall, ancient wall.

// the octagram ring is fully blocking, so crossing teleports between anchor tiles
// (455,3702 outside; the ring interior beside Ungadulu inside).
function crossFlameWall(player) {
    if (isInsideFlameWall(player)) {
        player.teleport(455, 3702);
    } else {
        player.teleport(452, 3707);
    }
}

async function summonUngaduluAtWall(player) {
    const { world } = player;
    let ungadulu = [...world.npcs.getInArea(player.x, player.y, 8)].find(
        (n) => n.id === UNGADULU_ID
    );
    if (!ungadulu) {
        ungadulu = spawnNpc(player, UNGADULU_ID, 453, 3707);
    }
    player.engage(ungadulu);
    await ungaduluWall(player, ungadulu, -1);
    player.disengage();
}

async function flameWallTouch(player, wallObject) {
    const { world } = player;
    if (has(player, MAGICAL_FIRE_PASS_ID)) {
        crossFlameWall(player);
        player.message('You feel completely fine to walk through these flames..');
        return true;
    }
    player.message(
        '@que@You walk blindly into the intense heat of the supernatural flames.'
    );
    await world.sleepTicks(3);
    if (random(0, 9) <= 3) {
        player.message('@que@The heat is so intense that it burns you.');
        await world.sleepTicks(2);
        player.damage(Math.ceil(currentLevel(player, 'hits') / 10 + 1));
        await player.say('Owwww!');
    } else {
        player.message('@que@The heat is intense and just before you burn yourself,');
        await world.sleepTicks(2);
        player.message('@que@you pull your hand out of the way of the flame.');
        await world.sleepTicks(2);
        await player.say('Whew!');
    }
    return true;
}

async function flameWallInvestigate(player, wallObject) {
    const { world } = player;
    if (has(player, MAGICAL_FIRE_PASS_ID)) {
        crossFlameWall(player);
        player.message('You feel completely fine to walk through these flames..');
        return true;
    }
    const stage = getStage(player);
    if (stage < 2 && stage !== -1) {
        return true;
    }
    player.message(
        '@que@You look closely at the flames, they seem to form a straight wall.'
    );
    await world.sleepTicks(2);
    player.message(
        '@que@Something about them looks very strange, they look completely supernatural.'
    );
    await world.sleepTicks(2);
    player.message(
        '@que@For example, they seem to appear to come from straight out of the ground.'
    );
    await world.sleepTicks(2);
    await player.say('Mmmm, pretty!');
    const inOctagram =
        (player.x >= 450 &&
            player.x <= 455 &&
            player.y >= 3704 &&
            player.y <= 3711) ||
        (player.x === 456 && player.y >= 3707 && player.y <= 3708) ||
        (player.x === 449 && player.y >= 3707 && player.y <= 3708);
    if (inOctagram) {
        player.message('What would you like to do?');
        const leave = await ask(
            player,
            [
                'Leap out of the flaming Octagram...',
                "Attract Shamans's attention."
            ],
            false
        );
        if (leave === 0) {
            player.message(
                '@que@This is quite dangerous, but you find a suitable location to jump.'
            );
            await world.sleepTicks(2);
            player.teleport(453, 3705);
            await world.sleepTicks(2);
            player.message('@que@You take a run up...');
            await world.sleepTicks(2);
            const burnDegRnd = random(0, 5);
            if (burnDegRnd <= 2) {
                player.message(
                    '@que@You sail over the tops of the flames, just getting slightly burnt by the flames...'
                );
                await world.sleepTicks(2);
                player.damage(random(3, 7));
            } else if (burnDegRnd <= 4) {
                player.message(
                    '@que@You get severly burned as you jump across the flames...'
                );
                await world.sleepTicks(2);
                player.damage(random(8, 17));
            } else {
                player.message(
                    '@que@You get severly burned as you jump across the flames...'
                );
                await world.sleepTicks(2);
                player.message('@que@You feel very un well..');
                await world.sleepTicks(2);
                player.damage(random(18, 37));
            }
            player.teleport(455, 3702);
        } else if (leave === 1) {
            await summonUngaduluAtWall(player);
        }
    } else {
        player.message('@que@You see a white clad figure in the midst of the flames...');
        await world.sleepTicks(2);
        await summonUngaduluAtWall(player);
    }
    return true;
}

async function ruinedWallJump(player, wallObject) {
    const { world } = player;
    if (currentLevel(player, 'agility') < 50) {
        player.message('You need an agility level of 50 to jump this wall');
        return true;
    }
    player.message('@que@You take a run at the wall...');
    await world.sleepTicks(2);
    if (shiloVillageSucceed(player, 50)) {
        player.message('@que@You take a good run up and sail majestically over the wall.');
        await world.sleepTicks(2);
        player.message('@que@You land perfectly and stand ready for action.');
        await world.sleepTicks(2);
    } else {
        player.message(
            '@que@You fail to jump the wall properly and clip the wall with your leg.'
        );
        await world.sleepTicks(2);
        player.message("@que@You're spun around mid air and hit the floor heavily.");
        await world.sleepTicks(2);
        player.message('@que@The fall knocks the wind out of you.');
        await world.sleepTicks(2);
        player.damage(6);
        await player.say('Ughhh!');
    }
    if (player.y >= 3729) {
        player.teleport(457, 3727);
    } else {
        player.teleport(455, 3729);
    }
    return true;
}

function ancientWallOpen(player) {
    return (
        player.cache.ancient_wall_runes === 5 || getStage(player) === -1
    );
}

async function ancientDoorWalkThrough(player, wallObject) {
    const { world } = player;
    player.message('@que@You see a small door outline starting to form in the wall.');
    await world.sleepTicks(2);
    player.message(
        '@que@And then a well formed door handle emerges, suddenly the door cracks open.'
    );
    await world.sleepTicks(2);
    player.message('Would you like to go through?');
    const goThrough = await ask(
        player,
        ["Yes, I'll go through.", "No, I'll stay here."],
        false
    );
    if (goThrough === 0) {
        player.message('@que@You walk into the darkness of the magical doorway.');
        await world.sleepTicks(2);
        player.message('@que@You walk for a short way before pushing open another door.');
        await world.sleepTicks(2);
        if (wallObject.x === 464 && wallObject.y === 3721) {
            player.message(
                'You appear in a large cavern like room filled with pools of water.'
            );
            player.teleport(467, 3724);
        } else {
            player.message('@que@You appear in a small walled cavern ');
            await world.sleepTicks(2);
            player.message('There seems to be an exit to the south east.');
            player.teleport(463, 3720);
        }
    } else if (goThrough === 1) {
        player.message('You decide to stay where you are.');
    }
    return true;
}

const ANCIENT_WALL_POEM = [
    'Place the five in order to pass',
    'or your life will dwindle until the last',
    'All five are stones of magical power',
    'Place them wrong and your fate will sour',
    'First is of the spirit of man or beast',
    'Second is the place where thoughts are born',
    'Third is the soil from which good things grow',
    'Four and five are the rules all men should know',
    'All put together make the word of a basic sense',
    'And from perspective help make maps from indifference.'
];

async function ancientWallUse(player, wallObject) {
    const { world } = player;
    if (ancientWallOpen(player)) {
        player.message('@que@You walk into the darkness of the magical doorway.');
        await world.sleepTicks(2);
        player.message('@que@You walk for a short way before pushing open another door.');
        await world.sleepTicks(2);
        if (wallObject.x === 464 && wallObject.y === 3721) {
            player.message(
                'You appear in a large cavern like room filled with pools of water.'
            );
            player.teleport(467, 3724);
        } else {
            player.message('@que@You appear in a small walled cavern ');
            await world.sleepTicks(2);
            player.message('There seems to be an exit to the south east.');
            player.teleport(463, 3720);
        }
    } else {
        player.message('@que@You see no way to use that...');
        await world.sleepTicks(2);
        player.message('Perhaps you should search it?');
    }
    return true;
}

async function ancientWallSearch(player, wallObject) {
    const { world } = player;
    player.message('@que@You search the wall...');
    await world.sleepTicks(2);
    if (ancientWallOpen(player)) {
        player.message("@que@You find the word 'SMELL' marked on the wall.");
        await world.sleepTicks(2);
        player.message('@que@The outline of a door appears on the wall.');
        await world.sleepTicks(2);
        player.message('What would you like to do?.');
        const option = await ask(
            player,
            [
                'Read the message on the wall.',
                'Investigate the outline of the door.'
            ],
            false
        );
        if (option === 0) {
            await sendScrollText(player, ANCIENT_WALL_POEM);
        } else if (option === 1) {
            await ancientDoorWalkThrough(player, wallObject);
        }
    } else {
        player.message(
            '@que@You find five slightly round depressions and some strange markings..'
        );
        await world.sleepTicks(2);
        player.message(
            '@que@There is a lot of dirt and mould growing over the markings, but you clear it out.'
        );
        await world.sleepTicks(2);
        player.message(
            '@que@After a while you manage to see that it is some form of message.'
        );
        await world.sleepTicks(2);
        player.message('@que@Would you like to read it.');
        await world.sleepTicks(2);
        const menu = await ask(
            player,
            ["Yes, I'll read it.", "No, I won't read it."],
            false
        );
        if (menu === 0) {
            await sendScrollText(player, ANCIENT_WALL_POEM);
        } else if (menu === 1) {
            player.message('You decide against reading the message.');
        }
    }
    return true;
}

// a wrong rune (or the right rune out of order) burns the player.
function ancientWallRunesFail(player, item) {
    const { world } = player;
    player.message(
        'The rune stone burns red hot in your hand, you drop it to the floor.'
    );
    player.damage(random(1, 5));
    player.inventory.remove(item.id);
    world.addPlayerDrop(player, { id: item.id }, player.x, player.y);
}

async function ancientWallRuneStep(player, item, expectedCount, ordinal, letter) {
    const { world } = player;
    player.inventory.remove(item.id);
    player.message(
        'You slide the ' +
            letter.name +
            ' into the ' +
            ordinal +
            ' depression...'
    );
    await world.sleepTicks(2);
    player.message('@que@It glows slightly and merges with the wall.');
    await world.sleepTicks(2);
    player.message(
        "The letter '" +
            letter.letter +
            "' appears where the " +
            letter.name +
            ' merged with the door.'
    );
    await world.sleepTicks(2);
    player.cache.ancient_wall_runes = expectedCount + 1;
}

async function ancientWallUseWithWallObject(player, wallObject, item) {
    const { world } = player;
    if (wallObject.id !== ANCIENT_WALL_ID) {
        return false;
    }
    const count = player.cache.ancient_wall_runes || 0;
    if (ANCIENT_WALL_WRONG_RUNES.has(item.id)) {
        if (ancientWallOpen(player)) {
            await ancientDoorWalkThrough(player, wallObject);
        } else {
            ancientWallRunesFail(player, item);
        }
        return true;
    }
    if (item.id === SOUL_RUNE_ID) {
        if (ancientWallOpen(player)) {
            await ancientDoorWalkThrough(player, wallObject);
        } else if (count === 0) {
            await ancientWallRuneStep(player, item, 0, 'first', {
                name: 'Soul-Rune',
                letter: 'S'
            });
        } else {
            ancientWallRunesFail(player, item);
        }
        return true;
    }
    if (item.id === MIND_RUNE_ID) {
        if (ancientWallOpen(player)) {
            await ancientDoorWalkThrough(player, wallObject);
        } else if (count === 1) {
            await ancientWallRuneStep(player, item, 1, 'second slot', {
                name: 'Mind-Rune',
                letter: 'M'
            });
        } else {
            ancientWallRunesFail(player, item);
        }
        return true;
    }
    if (item.id === EARTH_RUNE_ID) {
        if (ancientWallOpen(player)) {
            await ancientDoorWalkThrough(player, wallObject);
        } else if (count === 2) {
            await ancientWallRuneStep(player, item, 2, 'third', {
                name: 'Earth-Rune',
                letter: 'E'
            });
        } else {
            ancientWallRunesFail(player, item);
        }
        return true;
    }
    if (item.id === LAW_RUNE_ID) {
        if (ancientWallOpen(player)) {
            await ancientDoorWalkThrough(player, wallObject);
        } else if (count === 3 || count === 4) {
            await ancientWallRuneStep(
                player,
                item,
                count,
                count === 4 ? 'fifth' : 'fourth',
                { name: 'Law-Rune', letter: 'L' }
            );
            if (player.cache.ancient_wall_runes === 5) {
                await ancientDoorWalkThrough(player, wallObject);
            }
        } else {
            ancientWallRunesFail(player, item);
        }
        return true;
    }
    return false;
}

// the evil totem pole inspect + the shared stage-9 replacement.

// the totem swap is temporary (16 ticks) so the shared
// world object stays stable for everyone else.
async function replaceEvilTotemPole(player, obj) {
    const { world } = player;
    if (!has(player, TOTEM_POLE_ID)) {
        player.message('I shall replace it with the Totem pole');
        return;
    }
    if (getStage(player) === 9) {
        setStage(player, 10);
    }
    tempSwapObject(world, obj, GOOD_TOTEM_POLE, 16);
    player.inventory.remove(TOTEM_POLE_ID);
    player.message('@que@You remove the evil totem pole.');
    await world.sleepTicks(3);
    player.message('@que@And replace it with the one you carved yourself.');
    await world.sleepTicks(3);
    player.message('@que@As you do so, you feel a lightness in the air,');
    await world.sleepTicks(3);
    player.message('almost as if the Kharazi jungle were sighing.');
    player.message('Perhaps Gujuo would like to see the totem pole.');
}

async function totemPoleLookOpLoc(player, obj) {
    const { world } = player;
    const stage = getStage(player);
    if (stage >= 10 || stage === -1) {
        if (obj.id === EVIL_TOTEM_POLE) {
            tempSwapObject(world, obj, GOOD_TOTEM_POLE, 16);
        }
        player.message('@que@This totem pole is truly awe inspiring.');
        await world.sleepTicks(2);
        player.message('@que@It depicts powerful Karamja jungle animals.');
        await world.sleepTicks(2);
        player.message('@que@It is very well carved and brings a sense of power ');
        await world.sleepTicks(2);
        player.message('@que@and spiritual fullfilment to anyone who looks at it.');
        await world.sleepTicks(2);
        return true;
    }
    if (stage === 9) {
        await replaceEvilTotemPole(player, obj);
        return true;
    }
    if (obj.id === GOOD_TOTEM_POLE) {
        // pre-completion the world totem is evil; restore the stale display
        world.replaceEntity('gameObjects', obj, EVIL_TOTEM_POLE);
    }
    player.message('@que@This totem pole looks very corrupted,');
    await world.sleepTicks(2);
    player.message('@que@there is a darkness about it that seems quite unnatural.');
    await world.sleepTicks(2);
    player.message("@que@You don't like to look at it for too long.");
    await world.sleepTicks(2);
    return true;
}

// readable items: the notes, the tome, the Book of Binding and the crystals.
async function legendsReadablesInventoryCommand(player, item) {
    const { world } = player;
    if (item.id === A_RED_CRYSTAL_ID) {
        player.message(
            '@que@As the crystal touches your hands a voice inside of your head says..'
        );
        await world.sleepTicks(2);
        player.message('@gre@Voice in head: Bring life to the dragons eye.');
        await world.sleepTicks(2);
        return true;
    }
    if (item.id === YOMMI_TREE_SEED_ID) {
        player.message('These seeds need to be germinated in pure water...');
        return true;
    }
    if (item.id === GILDED_TOTEM_POLE_ID) {
        player.message('This totem pole is utterly awe inspiring.');
        await world.sleepTicks(2);
        player.message('Perhaps you should show it to Radimus Erkle...');
        return true;
    }
    if (item.id === ROUGH_SKETCH_OF_A_BOWL_ID) {
        player.message('You look at the rough sketch that Gujuo gave you.');
        await world.sleepTicks(2);
        player.message('It looks like a picture of a bowl...');
        return true;
    }
    if (item.id === GERMINATED_YOMMI_TREE_SEED_ID) {
        player.message('These seeds have been germinated in pure water...');
        await world.sleepTicks(2);
        player.message('They can be planted in fertile soil now...');
        return true;
    }
    if (
        item.id === SCRIBBLED_NOTES_ID ||
        item.id === SCRAWLED_NOTES_ID ||
        item.id === SCATCHED_NOTES_ID
    ) {
        player.message(
            'You try your best to decode the writing, this is what you make out.'
        );
        await world.sleepTicks(2);
        if (item.id === SCRIBBLED_NOTES_ID) {
            await sendScrollText(player, [
                'Daily notes of Ungadulu...',
                'Day 1...',
                'I have prepared the incantations and will invoke the spirits',
                'of my ancestors and pay them hommage. Though I feel a strange',
                'presence in these caves, it is with the heart of the lion that',
                'I fight my fears and mark the magical pentagram.',
                'Day 2...',
                'What have I done? My spirit is overthrown by a feeling of fear',
                'and evil, I am not myself these days and feel helpless and weak.',
                'From my teachings...'
            ]);
        } else if (item.id === SCRAWLED_NOTES_ID) {
            await sendScrollText(player, [
                'I fear that the spirit of an ancient one resides within me',
                'and uses me...I am too weak to cast the curse myself and',
                'fight the beast within.',
                'Day 3....',
                '...my last hope is that someone will read this and aid me...',
                'I am undone and I fear....'
            ]);
        } else {
            await sendScrollText(player, [
                'Day 4 ...',
                'These days come so fleetingly, I have no idea how long I have',
                'been here now...',
                'Day 5...',
                'A wizened charm will release me, but never magic that would',
                'would harm...'
            ]);
        }
        return true;
    }
    if (item.id === SHAMANS_TOME_ID) {
        player.message('You read the ancient shamans tome.');
        await world.sleepTicks(2);
        player.message(
            'It is written in a strange sort of language but you manage a rough translation.'
        );
        await world.sleepTicks(6);
        await sendScrollText(player, [
            '...scattered are my hopes that I will ever be released from this',
            'flaming Octagram, it is the only thing which will contain this',
            'beast within.',
            "Although it's grip over me is weakened with magic, it is hopeless",
            'to know if a saviour would guess this.',
            'I am doomed...'
        ]);
        return true;
    }
    if (item.id === BOOKING_OF_BINDING_ID) {
        player.message('You read the Book of Binding...');
        const page = await ask(
            player,
            ['Arcana..', 'Instructo...', 'Defeati...', 'Enchanto...'],
            false
        );
        if (page === 0) {
            player.message('You read the section entitled Arcana...');
            await world.sleepTicks(2);
            await sendScrollText(player, [
                'Use holy water to determine possesion, slight changes in',
                'appearance may be percieved when doused.',
                'Legendary Silverlight will help to defeat any demon by',
                'weakening it.',
                'Be wary of any demon, it may have special forms of attack.',
                'Use an Octagram shape to confine unearthly creatures of the',
                'underworld - the perfect geometry confuses them.'
            ]);
        } else if (page === 1) {
            player.message('You read the section entitled Instructo...');
            await world.sleepTicks(2);
            await sendScrollText(player, [
                'To make Holy water enchant small vials to contain the magic',
                'water.',
                'See later chapters for enchantment. Place sacred water into',
                'vial and equip as any other missile.'
            ]);
        } else if (page === 2) {
            player.message('You read the section entitled Defeati...');
            await world.sleepTicks(2);
            await sendScrollText(player, [
                'Hold the book of binding open to the possesed letting the',
                'goodlight fall on them completely. Be prepared for as soon as',
                'the beast is released it will strike and strike hard.'
            ]);
        } else if (page === 3) {
            player.message('You read the section entitled Enchanto...');
            await world.sleepTicks(2);
            player.message(
                'This looks like an enchantment, it requires some magic and prayer to cast.'
            );
            await world.sleepTicks(2);
            player.message('Would you like to try and cast this enchantment?');
            const opt = await ask(
                player,
                ["Yes, I'll try.", "No, I don't think I'll bother."],
                false
            );
            // authentic: the outcome is the same whichever option is chosen
            if (opt === 0 || opt === 1) {
                if (currentLevel(player, 'prayer') < 10) {
                    player.message(
                        'You need at least ten prayer points to cast this spell.'
                    );
                    return true;
                }
                if (currentLevel(player, 'magic') < 10) {
                    player.message(
                        'You need at least ten magic points to cast this spell.'
                    );
                    return true;
                }
                if (has(player, EMPTY_VIAL_ID)) {
                    player.message('The spell is cast perfectly..');
                    await world.sleepTicks(3);
                    player.message('You enchant one of the empty vials.');
                    await world.sleepTicks(3);
                    player.inventory.remove(EMPTY_VIAL_ID);
                    player.inventory.add(ENCHANTED_VIAL_ID);
                } else {
                    player.message(
                        'This spell looks as if it needs some other components.'
                    );
                }
            }
        }
        return true;
    }
    return false;
}

const ANVIL_OBJECT_IDS = new Set([50, 177]); // anvil, Doric's anvil
const GOLD_BAR_ID = 691; // members gold bar (172 is the f2p variant)
const HAMMER_ID = 168;

function rollGoldenBowlSuccess(smithingLevel) {
    // true on failure, from the level-vs-requirement formula.
    const diff = smithingLevel - 50;
    if (diff < 0) {
        return true; // shouldn't reach here (level gate already checked)
    }
    if (diff >= 20) {
        return false;
    }
    return random(0, diff + 1) === 0;
}

async function goldenBowlSmithingUseWithGameObject(player, obj, item) {
    const { world } = player;
    if (!ANVIL_OBJECT_IDS.has(obj.id) || item.id !== GOLD_BAR_ID) {
        return false;
    }
    const stage = getStage(player);
    if (stage >= 0 && stage <= 2) {
        player.message("You're not quite sure what to make from the gold..");
        return true;
    }
    if (currentLevel(player, 'smithing') < 50) {
        player.message('You need at least level 50 smithing to work gold...');
        return true;
    }
    if (!has(player, HAMMER_ID)) {
        player.message('@que@You need a hammer to work the metal with.');
        return true;
    }
    if (!player.inventory.has(GOLD_BAR_ID, 2)) {
        player.message('You need two bars of gold to make this item.');
        return true;
    }
    player.message('@que@You hammer the metal...');
    await world.sleepTicks(3);
    if (rollGoldenBowlSuccess(currentLevel(player, 'smithing'))) {
        player.message('You make a mistake forging the bowl..');
        await world.sleepTicks(3);
        player.message('You pour molten gold all over the floor..');
        player.inventory.remove(GOLD_BAR_ID);
        player.addExperience('smithing', 4, true);
    } else {
        player.inventory.remove(GOLD_BAR_ID, 2);
        player.message('You forge a beautiful bowl made out of solid gold.');
        player.inventory.add(GOLDEN_BOWL_ID);
        player.addExperience('smithing', 120, true);
    }
    return true;
}

async function echnedDialogue(player, npc, cID) {
    const { world } = player;
    if (npc.id !== ECHNED_ZEKIN_ID) {
        return;
    }

    if (cID === -1) {
        if (getStage(player) === 7) {
            // has holy force spell (and already gave glowing dagger) -> reveal
            if (player.cache.gave_glowing_dagger) {
                await neziAttack(player, npc, has(player, HOLY_FORCE_SPELL_ID));
                return;
            }
            if (has(player, HOLY_FORCE_SPELL_ID)) {
                await npc.say(
                    'Something seems different about you...',
                    'Your sense of purpose seems not bent to my will...',
                    'Give me the dagger that you used to slay Viyeldi or taste my wrath!'
                );
                const forceMenu = await ask(player, [
                    "I don't have the dagger.",
                    "I haven't slayed Viyeldi yet.",
                    'I have something else in mind!',
                    'I have to be going...'
                ]);
                if (forceMenu === 0) {
                    await echnedDialogue(player, npc, EC.I_DONT_HAVE_THE_DAGGER);
                } else if (forceMenu === 1) {
                    await echnedDialogue(
                        player,
                        npc,
                        EC.I_HAVE_NOT_SLAYED_VIYELDI_YET
                    );
                } else if (forceMenu === 2) {
                    await echnedDialogue(
                        player,
                        npc,
                        EC.I_HAVE_SOMETHING_ELSE_IN_MIND
                    );
                } else if (forceMenu === 3) {
                    await echnedDialogue(player, npc, EC.I_HAVE_TO_BE_GOING);
                }
            } else if (
                has(player, GLOWING_DARK_DAGGER_ID) &&
                !has(player, HOLY_FORCE_SPELL_ID)
            ) {
                // killed Viyeldi -> hand over glowing dagger, reveal
                await npc.say(
                    'Aha, I see you have completed your task. ',
                    "I'll take that dagger from you now."
                );
                player.inventory.remove(GLOWING_DARK_DAGGER_ID);
                if (!player.cache.gave_glowing_dagger) {
                    player.cache.gave_glowing_dagger = true;
                }
                player.message(
                    'The formless shape of Echned Zekin takes the dagger from you.'
                );
                await world.sleepTicks(2);
                player.message(
                    'As a ghostly hand envelopes the dagger, something seems to move'
                );
                await world.sleepTicks(2);
                player.message(
                    'from the black weapon into the floating figure...'
                );
                await world.sleepTicks(2);
                await npc.say(
                    'Aahhhhhhhhh! As I take the spirit of one departed,',
                    'I will now reveal myself and spell out your doom.'
                );
                player.message('@que@A terrible fear comes over you. ');
                await world.sleepTicks(2);
                const nx = npc.x;
                const ny = npc.y;
                world.removeEntity('npcs', npc);
                const nez = spawnNpc(player, NEZIKCHENED_ID, nx, ny);
                nez.spawnedFor = player.id;
                await world.sleepTicks(1);
                await nez.attack(player);
                player.message('You feel a terrible sense of loss...');
                setCurrentLevel(player, 'prayer', 0);
            } else if (
                has(player, DARK_DAGGER_ID) &&
                !has(player, GLOWING_DARK_DAGGER_ID) &&
                !has(player, HOLY_FORCE_SPELL_ID)
            ) {
                player.message(
                    '@que@The shapeless entity of Echned Zekin appears in front of you.'
                );
                await world.sleepTicks(3);
                await npc.say(
                    'Why do you return when your task is still incomplete?'
                );
                player.message('@que@There is an undercurrent of anger in his voice.');
                await world.sleepTicks(3);
                const menu = await ask(player, [
                    'Who am I supposed to kill again?',
                    "Er I've had second thoughts.",
                    'I have to be going...'
                ]);
                if (menu === 0) {
                    await echnedDialogue(
                        player,
                        npc,
                        EC.WHO_AM_I_SUPPOSED_TO_KILL_AGAIN
                    );
                } else if (menu === 1) {
                    await echnedDialogue(
                        player,
                        npc,
                        EC.ER_IVE_HAD_SECOND_THOUGHTS
                    );
                } else if (menu === 2) {
                    await echnedDialogue(player, npc, EC.I_HAVE_TO_BE_GOING);
                }
            } else {
                // default: no dark dagger yet
                player.message(
                    'In a rasping, barely audible voice you hear the entity speak.'
                );
                await world.sleepTicks(2);
                await npc.say('Who disturbs the rocks of Zekin?');
                player.message(
                    'There seems to be something slightly familiar about this presence.'
                );
                await world.sleepTicks(2);
                const menu = await ask(player, ['Er...me?', "Who's asking?"]);
                if (menu === 0) {
                    await npc.say(
                        'So, you desire the water that flows here?'
                    );
                    const opt1 = await ask(player, [
                        'Yes, I need it for my quest.',
                        'Not really, I just wondered if I could push that big rock.'
                    ]);
                    if (opt1 === 0) {
                        await npc.say(
                            'The water babbles so loudly and I am already so tortured.',
                            'I cannot abide the sound so I have stoppered the streams...',
                            'Care you not for my torment and pain?'
                        );
                        const opt4 = await ask(player, [
                            'Why are you tortured?',
                            'What can I do about that?'
                        ]);
                        if (opt4 === 0) {
                            await echnedDialogue(
                                player,
                                npc,
                                EC.WHY_ARE_YOU_TORTURED
                            );
                        } else if (opt4 === 1) {
                            await echnedDialogue(
                                player,
                                npc,
                                EC.WHAT_CAN_I_DO_ABOUT_THAT
                            );
                        }
                    } else if (opt1 === 1) {
                        await npc.say(
                            'The rock must remain, it stoppers the waters that babble.',
                            'The noise troubles my soul and I seek some rest...',
                            'rest from this terrible torture...'
                        );
                        const opt2 = await ask(player, [
                            'Why are you tortured?',
                            'What can I do about that?'
                        ]);
                        if (opt2 === 0) {
                            await echnedDialogue(
                                player,
                                npc,
                                EC.WHY_ARE_YOU_TORTURED
                            );
                        } else if (opt2 === 1) {
                            await echnedDialogue(
                                player,
                                npc,
                                EC.WHAT_CAN_I_DO_ABOUT_THAT
                            );
                        }
                    }
                } else if (menu === 1) {
                    player.message(
                        "The hooded, headless figure faces you...it's quite unnerving.."
                    );
                    await world.sleepTicks(2);
                    await npc.say(
                        'I am Echned Zekin...and I seek peace from my eternal torture...'
                    );
                    const opt3 = await ask(player, [
                        'What can I do about that?',
                        'Do I know you?',
                        'Why are you tortured?'
                    ]);
                    if (opt3 === 0) {
                        await echnedDialogue(
                            player,
                            npc,
                            EC.WHAT_CAN_I_DO_ABOUT_THAT
                        );
                    } else if (opt3 === 1) {
                        await npc.say(
                            'I am long since dead and buried, lost in the passages of time.',
                            'Long since have my kin departed and have I been forgotten...',
                            'It is unlikely that you know me...',
                            'I am a poor tortured soul looking for rest and eternal peace...'
                        );
                        const opt5 = await ask(player, [
                            'Why are you tortured?',
                            'What can I do about that?'
                        ]);
                        if (opt5 === 0) {
                            await echnedDialogue(
                                player,
                                npc,
                                EC.WHY_ARE_YOU_TORTURED
                            );
                        } else if (opt5 === 1) {
                            await echnedDialogue(
                                player,
                                npc,
                                EC.WHAT_CAN_I_DO_ABOUT_THAT
                            );
                        }
                    } else if (opt3 === 2) {
                        await echnedDialogue(
                            player,
                            npc,
                            EC.WHY_ARE_YOU_TORTURED
                        );
                    }
                }
            }
        }
    }

    await echnedDialogueCID(player, npc, cID);
}

async function echnedDialogueCID(player, npc, cID) {
    const { world } = player;
    switch (cID) {
        case EC.WHAT_CAN_I_DO_ABOUT_THAT: {
            await npc.say(
                'I was brutally murdered by a viscious man called Viyeldi',
                'I sense his presence near by, but I know that he is no longer living',
                'My spirit burns with the need for revenge, I shall not rest while',
                'I sense his spirit still.',
                'If you seek the pure water, you must ensure he meets his end.',
                'If not, you will never see the source and your journey back must ye start.',
                'What is your answer? Will ye put an end to Viyeldi for me?'
            );
            const subMenu2 = await ask(player, [
                "I'll do what I must to get the water.",
                "No, I won't take someone's life for you."
            ]);
            if (subMenu2 === 0) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.I_WILL_DO_WHAT_I_MUST_TO_GET_THE_WATER
                );
            } else if (subMenu2 === 1) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.I_WONT_TAKE_SOMEONES_LIFE_FOR_YOU
                );
            }
            break;
        }
        case EC.WHY_ARE_YOU_TORTURED: {
            await npc.say(
                'I was robbed of my life by a cruel man called Viyeldi',
                'And I hunger for revenge upon him....',
                'It is long since I have walked this world looking for him',
                'to haunt him and raise terror in his life...',
                'but tragedy of tragedies, his spirit is neither living or dead',
                'he serves the needs of the source.',
                'He died trying to collect the water from this stream,',
                'and now I hang in torment for eternity.'
            );
            const subMenu = await ask(player, [
                'What can I do about that?',
                "Can't I just get some water?"
            ]);
            if (subMenu === 0) {
                await echnedDialogue(player, npc, EC.WHAT_CAN_I_DO_ABOUT_THAT);
            } else if (subMenu === 1) {
                await npc.say(
                    'Yes, you may get some water, but first you must help me.',
                    'Revenge is the only thing that keeps my spirit in this place',
                    'help me take vengeance on Viyeldi and I will gladly remove',
                    'the rocks and allow you access to the water',
                    'What say you?'
                );
                const subMenu3 = await ask(player, [
                    "I'll do what I must to get the water.",
                    "No, I won't take someone's life for you."
                ]);
                if (subMenu3 === 0) {
                    await echnedDialogue(
                        player,
                        npc,
                        EC.I_WILL_DO_WHAT_I_MUST_TO_GET_THE_WATER
                    );
                } else if (subMenu3 === 1) {
                    await echnedDialogue(
                        player,
                        npc,
                        EC.I_WONT_TAKE_SOMEONES_LIFE_FOR_YOU
                    );
                }
            }
            break;
        }
        case EC.ILL_DO_IT:
            player.message('The formless shape shimmers brightly...');
            await npc.say(
                'You will benefit from this decision, the source will be',
                'opened to you.',
                'Bring the dagger back to me when you have completed this task.'
            );
            world.removeEntity('npcs', npc);
            break;
        case EC.I_WONT_TAKE_SOMEONES_LIFE_FOR_YOU:
            await npc.say(
                'Such noble thoughts, but Viyeldi is not alive.',
                'He is merely a vessel by which the power of the source ',
                'protects itself. ',
                'If that is your decision, so be it, but expect not to ',
                'gain the water from this stream.'
            );
            world.removeEntity('npcs', npc);
            break;
        case EC.I_WILL_DO_WHAT_I_MUST_TO_GET_THE_WATER: {
            player.message('The shapeless spirit seems to crackle with energy.');
            await world.sleepTicks(2);
            await npc.say(
                'You would release me from my torment and the source would',
                'be available to you.',
                'However, you must realise that this will be no easy task.'
            );
            if (!has(player, DARK_DAGGER_ID)) {
                await npc.say(
                    'I will furnish you with a weapon which will help you',
                    'to achieve your aims...',
                    'Here, take this...'
                );
                player.message(
                    'The spiritless body waves an arm and in front of you appears'
                );
                player.message('a dark black dagger made of pure obsidian.');
                await npc.say(
                    'To complete this task you must use this weapon on Viyeldi.'
                );
                player.inventory.add(DARK_DAGGER_ID);
                player.message(
                    'You take the dagger and place it in your inventory.'
                );
                if (!player.cache.met_spirit) {
                    player.cache.met_spirit = true;
                }
            }
            await npc.say(
                'Use the dagger I have provided for you to complete this task.',
                'and then bring it to me when Viyeldi is dead.'
            );
            const subMenu4 = await ask(player, [
                "Ok, I'll do it.",
                "I've changed my mind, I can't do it.",
                "No, I won't take someone's life for you."
            ]);
            if (subMenu4 === 0) {
                await echnedDialogue(player, npc, EC.ILL_DO_IT);
            } else if (subMenu4 === 1) {
                await npc.say(
                    'The pure water you seek will forever be out of your reach.'
                );
                await player.say("I'll do what I must to get the water.");
                player.message(
                    'The shapeless spirit seems to crackle with energy.'
                );
                await npc.say(
                    'You would release me from my torment and the source would',
                    'be available to you.',
                    'However, you must realise that this will be no easy task.',
                    'Use the dagger I have provided for you to complete this task.',
                    'and then bring it to me when Viyeldi is dead.'
                );
                const subMenu5 = await ask(player, [
                    "Ok, I'll do it.",
                    "I've changed my mind, I can't do it."
                ]);
                if (subMenu5 === 0) {
                    await echnedDialogue(player, npc, EC.ILL_DO_IT);
                } else if (subMenu5 === 1) {
                    await npc.say(
                        'The decision is yours but you will have no other way to ',
                        'get to the source.',
                        'The pure water you seek will forever be out of your reach.'
                    );
                    const subMenu6 = await ask(player, [
                        "I'll do what I must to get the water.",
                        "No, I won't take someone's life for you."
                    ]);
                    if (subMenu6 === 0) {
                        await echnedDialogue(
                            player,
                            npc,
                            EC.I_WILL_DO_WHAT_I_MUST_TO_GET_THE_WATER
                        );
                    } else if (subMenu6 === 1) {
                        await echnedDialogue(
                            player,
                            npc,
                            EC.I_WONT_TAKE_SOMEONES_LIFE_FOR_YOU
                        );
                    }
                }
            } else if (subMenu4 === 2) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.I_WONT_TAKE_SOMEONES_LIFE_FOR_YOU
                );
            }
            break;
        }
        case EC.WHO_AM_I_SUPPOSED_TO_KILL_AGAIN: {
            await npc.say(
                'Avenge upon me the death of Viyeldi, the cruel.',
                'And I will give you access to source...'
            );
            const newMenu = await ask(player, [
                "Er I've had second thoughts.",
                'I have to be going...'
            ]);
            if (newMenu === 0) {
                await echnedDialogue(player, npc, EC.ER_IVE_HAD_SECOND_THOUGHTS);
            } else if (newMenu === 1) {
                await echnedDialogue(player, npc, EC.I_HAVE_TO_BE_GOING);
            }
            break;
        }
        case EC.ER_IVE_HAD_SECOND_THOUGHTS: {
            await npc.say(
                'It is too late for second thoughts...',
                'Do as you have agreed and return to me in all haste...',
                'His presence tortures me so...'
            );
            const thoughts = await ask(player, [
                'Who am I supposed to kill again?',
                'I have to be going...'
            ]);
            if (thoughts === 0) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.WHO_AM_I_SUPPOSED_TO_KILL_AGAIN
                );
            } else if (thoughts === 1) {
                await echnedDialogue(player, npc, EC.I_HAVE_TO_BE_GOING);
            }
            break;
        }
        case EC.I_HAVE_TO_BE_GOING:
            await npc.say(
                'Return swiftly with the weapon as soon as your task is complete.'
            );
            player.message('The spirit slowly fades and then disapears.');
            world.removeEntity('npcs', npc);
            break;
        case EC.I_DONT_HAVE_THE_DAGGER: {
            player.message('The spirit seems to shake with anger...');
            await world.sleepTicks(2);
            await npc.say(
                'Bring it to me with all haste.',
                'Or torment and pain will I bring to you...',
                'the spirit extends a wraithlike finger which touches you.',
                'You feel a searing pain jolt through your body...'
            );
            player.damage(random(8, 15));
            const cMenu = await ask(player, [
                "I haven't slayed Viyeldi yet.",
                'I have something else in mind!',
                'I have to be going...'
            ]);
            if (cMenu === 0) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.I_HAVE_NOT_SLAYED_VIYELDI_YET
                );
            } else if (cMenu === 1) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.I_HAVE_SOMETHING_ELSE_IN_MIND
                );
            } else if (cMenu === 2) {
                await echnedDialogue(player, npc, EC.I_HAVE_TO_BE_GOING);
            }
            break;
        }
        case EC.I_HAVE_NOT_SLAYED_VIYELDI_YET: {
            await npc.say(
                'Go now and slay him, as you agreed.',
                'If you are forfeit on this.',
                'And I will take you as a replacement for Viyeldi !'
            );
            const bMenu = await ask(player, [
                "I don't have the dagger.",
                'I have something else in mind!',
                'I have to be going...'
            ]);
            if (bMenu === 0) {
                await echnedDialogue(player, npc, EC.I_DONT_HAVE_THE_DAGGER);
            } else if (bMenu === 1) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.I_HAVE_SOMETHING_ELSE_IN_MIND
                );
            } else if (bMenu === 2) {
                await echnedDialogue(player, npc, EC.I_HAVE_TO_BE_GOING);
            }
            break;
        }
        case EC.I_HAVE_SOMETHING_ELSE_IN_MIND: {
            await npc.say(
                'You worthless Vacu, how dare you seek to trick me.',
                'Go and slay Viyeldi as you promised ',
                'or I will layer upon you all the pain and ',
                'torment I have endured all these long years!'
            );
            const aMenu = await ask(player, [
                "I don't have the dagger.",
                "I haven't slayed Viyeldi yet.",
                'I have to be going...'
            ]);
            if (aMenu === 0) {
                await echnedDialogue(player, npc, EC.I_DONT_HAVE_THE_DAGGER);
            } else if (aMenu === 1) {
                await echnedDialogue(
                    player,
                    npc,
                    EC.I_HAVE_NOT_SLAYED_VIYELDI_YET
                );
            } else if (aMenu === 2) {
                await echnedDialogue(player, npc, EC.I_HAVE_TO_BE_GOING);
            }
            break;
        }
    }
}

// Viyeldi, the headless sorcerer spirit (riddle + kill).

// only the Dark Dagger harms him (turning it into the Glowing Dark Dagger).
async function attackViyeldi(player, npc) {
    const { world } = player;
    if (npc.id !== VIYELDI_ID) {
        return;
    }
    if (!player.inventory.isEquipped(DARK_DAGGER_ID)) {
        player.message('Your attack passes straight through Viyeldi.');
        await world.sleepTicks(2);
        await npc.say(
            'Take challenge with me is useless for I am impervious to your attack',
            'Take your fight to someone else, and maybe then get back on track.'
        );
    } else {
        player.inventory.remove(DARK_DAGGER_ID);
        player.inventory.add(GLOWING_DARK_DAGGER_ID);
        player.message('You thrust the Dark Dagger at Viyeldi...');
        await world.sleepTicks(2);
        await npc.say("So, you have fallen for the foul one's trick...");
        player.message('You hit Viyeldi squarely with the Dagger .');
        await world.sleepTicks(2);
        await npc.say('AhhhhhhhhHH! The Pain!');
        player.message(
            'You see a flash as something travels from Viyeldi into the dagger.'
        );
        await world.sleepTicks(2);
        player.message('The dagger seems to glow as Viyeldi crumpels to the floor.');
        await world.sleepTicks(1);
        world.removeEntity('npcs', npc);
        if (!player.cache.killed_viyeldi) {
            player.cache.killed_viyeldi = true;
        }
    }
}

async function viyeldiTalk(player, npc) {
    const { world } = player;
    if (npc.id !== VIYELDI_ID) {
        return;
    }
    if (getStage(player) === 7) {
        player.message(
            'The headless, spirit of Viyeldi animates and walks towards you.'
        );
        await world.sleepTicks(2);
        if (!player.cache.killed_viyeldi) {
            player.message('And starts talking to you in a shrill, excited voice...');
            await world.sleepTicks(2);
            await npc.say(
                'Beware adventurer, lest thee loses they head in search of source.',
                'Bravery has thee been tested and not found wanting..'
            );
            player.message('The spirit wavers slightly and then stands proud...');
            await world.sleepTicks(2);
            await npc.say(
                'But perilous danger waits for thee,',
                'Tojalon, Senay and Devere makes three,',
                'None hold malice but will test your might,',
                'Pray that you do not lose this fight,',
                'If however, you win this day,',
                'Take heart that see the source you may,',
                'Through dragons eye will you gain new heart,',
                'To see the source and then depart.'
            );
        } else {
            player.message('Viyeldi falls silent...');
            await world.sleepTicks(11);
            player.message('...and the clothes slump to the floor.');
            world.removeEntity('npcs', npc);
        }
    }
}

// taking the blue wizard's hat at (426,3708) animates Viyeldi.
async function viyeldiHatTake(player, groundItem) {
    const { world } = player;
    if (
        groundItem.id !== A_BLUE_WIZARDS_HAT_ID ||
        groundItem.x !== 426 ||
        groundItem.y !== 3708
    ) {
        return false;
    }
    player.teleport(groundItem.x, groundItem.y);
    player.message('@que@Your hand passes through the hat as if it wasn\'t there.');
    await world.sleepTicks(2);
    if (getStage(player) >= 8) {
        return true;
    }
    player.teleport(groundItem.x, groundItem.y - 1);
    player.message(
        '@que@Instantly the clothes begin to animate and then walk towards you.'
    );
    await world.sleepTicks(2);
    let n = [...world.npcs.getInArea(groundItem.x, groundItem.y, 3)].find(
        (e) => e.id === VIYELDI_ID
    );
    if (!n) {
        n = spawnNpc(player, VIYELDI_ID, groundItem.x, groundItem.y);
    }
    player.engage(n);
    await viyeldiTalk(player, n);
    player.disengage();
    return true;
}

// Irvig Senay + San Tojalon, crystal guardians: a crystal-reward fight and a
// companion fight in the stage-8 third-demon summon. shared logic by id.

// yells[] are quest messages, so they stack both tags (@que@@yel@...).
const GUARDIANS = {
    [IRVIG_SENAY_ID]: {
        crystalId: A_LUMP_OF_CRYSTAL_ID,
        attackLines: [
            'Greetings Brave warrior, destiny is upon you...',
            'Ready your weapon and defend yourself.'
        ],
        yells: [
            '@que@@yel@Irvig Senay: Ahhhggggh',
            '@que@@yel@Irvig Senay: Forever must I live in this torment till this beast is slain...'
        ]
    },
    [SAN_TOJALON_ID]: {
        crystalId: A_CHUNK_OF_CRYSTAL_ID,
        attackLines: [
            'You have entered the Viyeldi caves and  your bravery must be tested.',
            'Prepare yourself...San Tojalon will test your mettle.'
        ],
        yells: [
            '@que@@yel@San Tojalon: Ahhhggggh',
            '@que@@yel@San Tojalon: Forever must I live in this torment till this beast is slain...'
        ]
    },
    [RANALPH_DEVERE_ID]: {
        crystalId: A_HUNK_OF_CRYSTAL_ID,
        attackLines: [
            'Upon my honour, I will defend till the end...',
            'May your aim be true and the best of us win...'
        ],
        yells: [
            '@que@@yel@Ranalph Devere: Ahhhggggh',
            '@que@@yel@Ranalph Devere:Forever must I live in this torment till this beast is slain...'
        ]
    }
};

// pre-cavernous_opening reward-fight gate: player has none of the crystal set.
function guardianRewardEligible(player, crystalId) {
    return (
        !has(player, crystalId) &&
        !has(player, A_RED_CRYSTAL_ID) &&
        !has(player, A_GLOWING_RED_CRYSTAL_ID)
    );
}

async function guardianAttackMessage(player, npc) {
    const g = GUARDIANS[npc.id];
    if (!g) {
        return;
    }
    if (!has(player, g.crystalId) && !player.cache.cavernous_opening) {
        await npc.say(g.attackLines[0]);
        npc.setChasing && npc.setChasing(player);
        await npc.say(g.attackLines[1]);
    }
}

// OpenRSC onKillNpc for both guardians.
async function guardianDeath(player, npc) {
    const { world } = player;
    const g = GUARDIANS[npc.id];
    if (!g) {
        return false;
    }
    // companion fight during the stage-8 third demon summon
    if (
        getStage(player) === 8 &&
        player.cache.viyeldi_companions !== undefined
    ) {
        world.removeEntity('npcs', npc);
        if (npc.id === SAN_TOJALON_ID && player.cache.viyeldi_companions === 1) {
            player.cache.viyeldi_companions = 2;
        } else if (
            npc.id === IRVIG_SENAY_ID &&
            player.cache.viyeldi_companions === 2
        ) {
            player.cache.viyeldi_companions = 3;
        } else if (
            npc.id === RANALPH_DEVERE_ID &&
            player.cache.viyeldi_companions === 3
        ) {
            player.cache.viyeldi_companions = 4;
        }
        player.message(
            '@que@A nerve tingling scream echoes around you as you slay the dead Hero.'
        );
        await world.sleepTicks(2);
        player.message(g.yells[0]);
        await world.sleepTicks(2);
        player.message(g.yells[1]);
        await world.sleepTicks(2);
        await world.sleepTicks(1);
        await demonFight(player);
        return true;
    }

    // pre-cavernous_opening crystal reward fight
    if (!player.cache.cavernous_opening) {
        if (
            has(player, g.crystalId) ||
            has(player, A_RED_CRYSTAL_ID) ||
            has(player, A_GLOWING_RED_CRYSTAL_ID)
        ) {
            await npc.say(
                'A fearsome foe you are, and bettered me once have you done already.'
            );
            player.message('Your opponent is retreating');
            world.removeEntity('npcs', npc);
        } else {
            await npc.say('You have proved yourself of the honour..');
            // no combat-event reset here; this engine has no equivalent to reset.
            player.message('Your opponent is retreating');
            // the empty say is a real ~2-tick pause, not a blank bubble.
            await npc.say('');
            world.removeEntity('npcs', npc);
            player.message(
                '@que@A piece of crystal forms in midair and falls to the floor.'
            );
            await world.sleepTicks(2);
            player.message('@que@You place the crystal in your inventory.');
            await world.sleepTicks(2);
            player.inventory.add(g.crystalId);
        }
        return true;
    }
    return false;
}

// bowl water spills; crystals shatter when dropped.
const ONDROP_ITEMS = new Set([
    A_CHUNK_OF_CRYSTAL_ID,
    A_LUMP_OF_CRYSTAL_ID,
    A_HUNK_OF_CRYSTAL_ID,
    A_RED_CRYSTAL_ID,
    A_GLOWING_RED_CRYSTAL_ID,
    BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID,
    BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID,
    GOLDEN_BOWL_WITH_PURE_WATER_ID,
    GOLDEN_BOWL_WITH_PLAIN_WATER_ID
]);

async function legendsOnDrop(player, item) {
    const { world } = player;
    if (!ONDROP_ITEMS.has(item.id)) {
        return false;
    }
    if (
        item.id === BLESSED_GOLDEN_BOWL_WITH_PURE_WATER_ID ||
        item.id === BLESSED_GOLDEN_BOWL_WITH_PLAIN_WATER_ID
    ) {
        player.inventory.remove(item.id);
        player.message(
            'You drop the bowl on the floor and the water spills out everywhere.'
        );
        world.addPlayerDrop(
            player,
            { id: BLESSED_GOLDEN_BOWL_ID, amount: 1 },
            player.x,
            player.y
        );
    } else if (
        item.id === GOLDEN_BOWL_WITH_PURE_WATER_ID ||
        item.id === GOLDEN_BOWL_WITH_PLAIN_WATER_ID
    ) {
        player.inventory.remove(item.id);
        player.message(
            'You drop the bowl on the floor and the water spills out everywhere.'
        );
        world.addPlayerDrop(
            player,
            { id: GOLDEN_BOWL_ID, amount: 1 },
            player.x,
            player.y
        );
    } else {
        // a crystal is simply destroyed (no ground item)
        player.inventory.remove(item.id);
    }
    return true;
}

// Ungadulu / Evil Ungadulu attack punishment (onNPCAttack, melee only).
async function ungaduluAttack(player, npc) {
    const { world } = player;
    if (npc.id === UNGADULU_ID) {
        player.message('You feel a strange force coming over you...');
        player.message('You feel weakened....');
        setCurrentLevel(player, 'attack', 0);
        setCurrentLevel(player, 'strength', 0);
        if (getStage(player) >= 9 || getStage(player) === -1) {
            player.message('@que@The Shaman casts a debilitating spell on you..');
            await world.sleepTicks(2);
            player.message("@que@You're sent reeling backwards through the flames..");
            await world.sleepTicks(2);
            player.teleport(454, 3702);
            player.damage(5);
            await npc.say('Think twice in future before attacking me..');
            await player.say('Ughhh!');
            return true;
        }
        // OpenRSC then startCombat(affectedmob): let the fight proceed.
        return false;
    }
    if (npc.id === EVIL_UNGADULU_ID) {
        player.message('A strange power stops you from attacking the Shaman.');
        await evilUngadulu(player, npc);
        return true;
    }
    return false;
}

// Fionella, Legends Guild general shopkeeper (npc 788).
async function fionellaTalk(player, npc) {
    if (npc.id !== FIONELLA_ID) {
        return;
    }
    await npc.say('Can I help you at all?');
    const menu = await ask(player, [
        'Yes please. What are you selling?',
        'No thanks'
    ]);
    if (menu === 0) {
        await npc.say('Take a look');
        player.openShop(FIONELLA_SHOP);
    }
}

// Siegfried Erkle, Legends Guild shopkeeper (npc 779); only completed members may use the shop.
async function siegfriedErkleTalk(player, npc) {
    if (npc.id !== SIEGFRIED_ERKLE_ID) {
        return;
    }
    if (player.questStages[LEGENDS_QUEST] !== -1) {
        await npc.say(
            'I\'m sorry but the services of this shop are only for ',
            'the pleasure of those who are rightfull members of the ',
            'Legends Guild. I would get into serious trouble if I sold ',
            'a non-member an item from this store.'
        );
    } else {
        await npc.say(
            'Hello there and welcome to the shop of useful items.',
            'Can I help you at all?'
        );
        const option = await ask(player, [
            'Yes please. What are you selling?',
            'No thanks'
        ]);
        if (option === 0) {
            await npc.say('Take a look');
            player.openShop(SIEGFRIED_SHOP);
        } else if (option === 1) {
            await npc.say('Ok, well, if you change your mind, do pop back.');
        }
    }
}

// top-level plugin dispatchers.

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    switch (npc.id) {
        case RADIMUS_ERKLE_ID:
            // post-completion, defer to the combat-odyssey plugin when the odyssey
            // is enabled; otherwise the stage -1 greeting is the fallback.
            if (
                getStage(player) === -1 &&
                player.world.server.config.wantCombatOdyssey !== false
            ) {
                return false;
            }
            player.engage(npc);
            await radimusDialogue(player, npc, -1);
            player.disengage();
            return true;
        case LEGENDS_GUILD_GUARD_ID:
            if (getStage(player) === 0 || getStage(player) === undefined) {
                player.message('@que@You approach a nearby guard...');
                await player.world.sleepTicks(2);
            }
            player.engage(npc);
            await guildGuardDialogue(player, npc, -1);
            player.disengage();
            return true;
        case GUJUO_ID:
            player.engage(npc);
            await gujuoDialogue(player, npc, -1);
            player.disengage();
            return true;
        case UNGADULU_ID:
            player.engage(npc);
            // stages 2/3: the Shaman is trapped behind the octagram flames.
            if (getStage(player) === 2 || getStage(player) === 3) {
                await ungaduluWall(player, npc, -1);
            } else {
                await ungaduluTalk(player, npc, -1);
            }
            player.disengage();
            return true;
        case EVIL_UNGADULU_ID:
            player.engage(npc);
            await evilUngadulu(player, npc);
            player.disengage();
            return true;
        case ECHNED_ZEKIN_ID:
            player.engage(npc);
            await echnedDialogue(player, npc, -1);
            player.disengage();
            return true;
        case VIYELDI_ID:
            player.engage(npc);
            await viyeldiTalk(player, npc);
            player.disengage();
            return true;
        case JUNGLE_FORESTER_ID:
            player.engage(npc);
            await jungleForesterTalk(player, npc);
            player.disengage();
            return true;
        case FIONELLA_ID:
            player.engage(npc);
            await fionellaTalk(player, npc);
            player.disengage();
            return true;
        case SIEGFRIED_ERKLE_ID:
            player.engage(npc);
            await siegfriedErkleTalk(player, npc);
            player.disengage();
            return true;
        default:
            return false;
    }
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id === GUJUO_ID) {
        player.engage(npc);
        const handled = await gujuoUse(player, npc, item);
        player.disengage();
        return handled;
    }
    if (npc.id === UNGADULU_ID) {
        player.engage(npc);
        const handled = await ungaduluUse(player, npc, item);
        player.disengage();
        return handled;
    }
    if (npc.id === JUNGLE_FORESTER_ID) {
        player.engage(npc);
        const handled = await jungleForesterUse(player, npc, item);
        player.disengage();
        return handled;
    }
    if (npc.id === RADIMUS_ERKLE_ID) {
        player.engage(npc);
        const handled = await radimusUse(player, npc, item);
        player.disengage();
        return handled;
    }
    return false;
}

// onUseNpc: the totem poles / the map.
async function radimusUse(player, npc, item) {
    if (item.id === GILDED_TOTEM_POLE_ID) {
        if (getStage(player) === 11) {
            await npc.say(
                'Go through to the main Legends Guild and I will join you.'
            );
            return true;
        }
        if (getStage(player) === 10) {
            await radimusDialogue(player, npc, RE.GIVE_TOTEM_POLE);
            return true;
        }
        return false;
    }
    if (item.id === TOTEM_POLE_ID) {
        await npc.say(
            'Hmmm, well, it is very impressive.',
            'Especially since it looks very heavy...',
            'However, it lacks a certain authenticity,',
            'my guess is that you made it.',
            "But I'm not sure why.",
            'We would like to have a really nice display object',
            'to put on display in the Legends Guild main hall.',
            'Do you think you could get something more authentic ?'
        );
        return true;
    }
    if (item.id === RADIMUS_SCROLLS_COMPLETE_ID) {
        await npc.say(
            player.isMale()
                ? 'Well done Sir, very well done...'
                : 'Well done Madam, very well done...',
            "However, you'll probably need it while you search",
            'for natives of the Kharazi tribe in the Kharazi jungle.',
            'Remember, we want a very special token of friendship from them.',
            'To place in the Legends Guild.',
            "I'll take the map off your hands once we get the ",
            'proof that you have met the natives.'
        );
        return true;
    }
    return false;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id === MITHRIL_GATES) {
        return mithrilGatesOpLoc(player, gameObject, 'open');
    }
    if (gameObject.id === LEGENDS_HALL_DOOR) {
        return legendsHallDoorOpLoc(player, gameObject, 'Open');
    }
    if (gameObject.id === RADIMUS_CUPBOARD) {
        return radimusCupboardOpLoc(player, gameObject, 'open');
    }
    if (gameObject.id === BOULDER_ROCK) {
        return boulderRockOpLoc(player, gameObject, 'Move');
    }
    if (gameObject.id === YOMMI_TOTEM_CARVED) {
        return yommiTotemLiftOpLoc(player, gameObject, 'Lift');
    }
    if (
        gameObject.id === CAVE_EXIT_TO_SURFACE ||
        gameObject.id === CAVE_ENTRANCE_SMALL
    ) {
        return caveEntranceOpLoc(player, gameObject);
    }
    if (gameObject.id === ANCIENT_WOODEN_DOORS) {
        return ancientWoodenDoorsOpLoc(player, gameObject, 'open');
    }
    if (gameObject.id === HEAVY_METAL_GATE) {
        return heavyMetalGateOpLoc(player, gameObject, 'look');
    }
    if (gameObject.id === DARK_METAL_GATE) {
        return darkMetalGateOpLoc(player, gameObject, 'open');
    }
    if (gameObject.id === ANCIENT_LAVA_FURNACE) {
        return lavaFurnaceOpLoc(player, gameObject, 'look');
    }
    if (gameObject.id === CAVERNOUS_OPENING) {
        return cavernousOpeningOpLoc(player, gameObject, 'enter');
    }
    if (ROCK_HEWN_STAIRS.includes(gameObject.id)) {
        return rockHewnStairsClimb(player, gameObject);
    }
    if (ROCKY_WALKWAYS.includes(gameObject.id)) {
        return rockyWalkwayBalance(player, gameObject);
    }
    if (gameObject.id === ROPE_UP) {
        player.message('You climb the rope back out again.');
        player.teleport(471, 3707);
        return true;
    }
    if (
        gameObject.id === EVIL_TOTEM_POLE ||
        gameObject.id === GOOD_TOTEM_POLE
    ) {
        return totemPoleLookOpLoc(player, gameObject);
    }
    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id === MITHRIL_GATES) {
        return mithrilGatesOpLoc(player, gameObject, 'Search');
    }
    if (gameObject.id === LEGENDS_HALL_DOOR) {
        return legendsHallDoorOpLoc(player, gameObject, 'Search');
    }
    if (gameObject.id === RADIMUS_DESK) {
        return radimusDeskOpLoc(player, gameObject, 'Knock on table');
    }
    if (gameObject.id === SURFACE_CREVICE_ROCK) {
        return surfaceCreviceSearch(player, gameObject);
    }
    if (gameObject.id === ANCIENT_WOODEN_DOORS) {
        return ancientWoodenDoorsOpLoc(player, gameObject, 'pick lock');
    }
    if (gameObject.id === HEAVY_METAL_GATE) {
        return heavyMetalGateOpLoc(player, gameObject, 'push');
    }
    if (gameObject.id === DARK_METAL_GATE) {
        return darkMetalGateOpLoc(player, gameObject, 'search');
    }
    if (gameObject.id === ANCIENT_LAVA_FURNACE) {
        return lavaFurnaceOpLoc(player, gameObject, 'search');
    }
    if (gameObject.id === CAVERNOUS_OPENING) {
        return cavernousOpeningOpLoc(player, gameObject, 'search');
    }
    if (gameObject.id === RED_EYE_ROCK) {
        player.message('@que@These rocks look somehow manufactured..');
        return true;
    }
    if (gameObject.id === CARVED_ROCK) {
        return carvedRockSearch(player, gameObject);
    }
    if (SMASH_BOULDERS.includes(gameObject.id)) {
        return smashBouldersOpLoc(player, gameObject);
    }
    if (gameObject.id === WOODEN_BEAM) {
        return woodenBeamSearch(player, gameObject);
    }
    if (gameObject.id === ROPE_DOWN_BEAM) {
        return ropeDownDescend(player, gameObject);
    }
    if (
        gameObject.id === CAVERN_CRATE ||
        gameObject.id === CAVERN_CRUDE_BED ||
        gameObject.id === CAVERN_CRUDE_DESK ||
        gameObject.id === CAVERN_TABLE ||
        gameObject.id === CAVERN_BOOKCASE ||
        gameObject.id === HALF_BURIED_REMAINS
    ) {
        return cavernFurnitureSearch(player, gameObject);
    }
    if (gameObject.id === TALL_REEDS) {
        player.message('@que@These tall reeds look nice and long, ');
        await player.world.sleepTicks(2);
        player.message('@que@with a long tube for a stem.');
        await player.world.sleepTicks(2);
        player.message('@que@They reach all the way down to the water.');
        return true;
    }
    if (gameObject.id === SHALLOW_WATER) {
        const stage = getStage(player);
        if (stage === 8 && player.y >= 3723 && player.y <= 3740) {
            player.message('A magical looking pool.');
            return true;
        }
        if (stage >= 5 || stage === -1) {
            player.message('A disgusting sess pit of filth and stench...');
            return true;
        }
        player.message('@que@A bubbling brook with effervescent water...');
        return true;
    }
    return false;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id === FLAME_WALL_ID) {
        return false; // flamewall is a wall-object, see onUseWithWallObject
    }
    if (gameObject.id === TALL_REEDS) {
        return tallReedsUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === SHALLOW_WATER) {
        return shallowWaterUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === BOULDER_ROCK) {
        return boulderWaterSpotUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === FERTILE_EARTH) {
        return fertileEarthUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === YOMMI_TREE_SAPLING) {
        return yommiTreeUseWithGameObject(player, gameObject, item);
    }
    if (
        gameObject.id === YOMMI_TREE_GROWN ||
        gameObject.id === YOMMI_TREE_CHOPPED ||
        gameObject.id === YOMMI_TREE_TRIMMED ||
        gameObject.id === YOMMI_TREE_DEAD ||
        gameObject.id === YOMMI_TREE_ROTTEN
    ) {
        return yommiTreeAxeUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === EVIL_TOTEM_POLE) {
        return evilTotemPoleUseWithGameObject(player, gameObject, item);
    }
    if (ANVIL_OBJECT_IDS.has(gameObject.id)) {
        return goldenBowlSmithingUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === ANCIENT_LAVA_FURNACE) {
        return lavaFurnaceUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === RED_EYE_ROCK) {
        return redEyeRockUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === CAVERNOUS_OPENING) {
        return cavernousOpeningUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === CARVED_ROCK) {
        return carvedRockUseWithGameObject(player, gameObject, item);
    }
    if (gameObject.id === WOODEN_BEAM) {
        return woodenBeamUseWithGameObject(player, gameObject, item);
    }
    return false;
}

async function onUseWithWallObject(player, wallObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (wallObject.id === ANCIENT_WALL_ID) {
        return ancientWallUseWithWallObject(player, wallObject, item);
    }
    return flameWallUseWithWallObject(player, wallObject, item);
}

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (wallObject.id === FLAME_WALL_ID) {
        return flameWallTouch(player, wallObject);
    }
    if (wallObject.id === ANCIENT_WALL_ID) {
        return ancientWallUse(player, wallObject);
    }
    return false;
}

async function onWallObjectCommandTwo(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (wallObject.id === FLAME_WALL_ID) {
        return flameWallInvestigate(player, wallObject);
    }
    if (wallObject.id === RUINED_WALL_ID) {
        return ruinedWallJump(player, wallObject);
    }
    if (wallObject.id === ANCIENT_WALL_ID) {
        return ancientWallSearch(player, wallObject);
    }
    return false;
}

async function onSpellObject(player, gameObject, spellId) {
    if (!questsEnabled(player)) {
        return false;
    }
    return darkMetalGateSpell(player, gameObject, spellId);
}

async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (item.id === BULL_ROARER_ID) {
        return bullRoarerSwing(player, item);
    }
    if (item.id === HOLY_WATER_VIAL_ID) {
        return throwHolyWaterVial(player, item);
    }
    if (
        item.id === RADIMUS_SCROLLS_ID ||
        item.id === RADIMUS_SCROLLS_COMPLETE_ID
    ) {
        return radimusScrollsCommand(player, item);
    }
    return legendsReadablesInventoryCommand(player, item);
}

async function onUseWithInventory(player, item, target) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (await holyWaterBowlUseWithInventory(player, item, target)) {
        return true;
    }
    return germinateYommiSeedUseWithInventory(player, item, target);
}

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (await carvedRockGemTake(player, groundItem)) {
        return true;
    }
    return viyeldiHatTake(player, groundItem);
}

async function onDropItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    return legendsOnDrop(player, item);
}

async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id === UNGADULU_ID || npc.id === EVIL_UNGADULU_ID) {
        return ungaduluAttack(player, npc);
    }
    if (npc.id === VIYELDI_ID) {
        await attackViyeldi(player, npc);
        return true;
    }
    if (GUARDIANS[npc.id]) {
        // pre-cavernous_opening reward guardians shout before combat
        if (!has(player, GUARDIANS[npc.id].crystalId) && !player.cache.cavernous_opening) {
            await guardianAttackMessage(player, npc);
        }
        return false;
    }
    if (npc.id === NEZIKCHENED_ID) {
        // attacks on a demon spawned for someone else, or at the wrong stage, glide through.
        const wrongStage = !stageIn(player, 3, 7, 8);
        const notMine =
            npc.spawnedFor !== undefined && npc.spawnedFor !== player.id;
        if (notMine || wrongStage) {
            player.message('@que@Your attack glides straight through the Demon.');
            await player.world.sleepTicks(2);
            player.message('as if it wasn\'t really there.');
            await player.world.sleepTicks(1);
            player.world.removeEntity('npcs', npc);
            return true;
        }
        return false;
    }
    return false;
}

// ranged attacks are guarded like melee, with two asymmetries: Nezikchened's guard
// checks only spawnedFor (not stage), and Ranalph Devere's omits the cavernous_opening check.
async function onRangeNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id === UNGADULU_ID || npc.id === EVIL_UNGADULU_ID) {
        return ungaduluAttack(player, npc);
    }
    if (npc.id === VIYELDI_ID) {
        await attackViyeldi(player, npc);
        return true;
    }
    if (npc.id === RANALPH_DEVERE_ID) {
        const g = GUARDIANS[RANALPH_DEVERE_ID];
        if (!has(player, g.crystalId)) {
            await npc.say(g.attackLines[0]);
            npc.setChasing && npc.setChasing(player);
            await npc.say(g.attackLines[1]);
        }
        return false;
    }
    if (GUARDIANS[npc.id]) {
        if (!has(player, GUARDIANS[npc.id].crystalId) && !player.cache.cavernous_opening) {
            await guardianAttackMessage(player, npc);
        }
        return false;
    }
    if (npc.id === NEZIKCHENED_ID) {
        const notMine =
            npc.spawnedFor !== undefined && npc.spawnedFor !== player.id;
        if (notMine) {
            player.message('Your attack passes through');
            player.world.removeEntity('npcs', npc);
            return true;
        }
        return false;
    }
    return false;
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id === NEZIKCHENED_ID) {
        return nezikchenedDeath(player, npc);
    }
    if (GUARDIANS[npc.id]) {
        return guardianDeath(player, npc);
    }
    return false;
}

// spell guards: Ungadulu is spell-proof, Evil Ungadulu deflects into dialogue,
// guardians shout, and a demon summoned for someone else is untouchable.
async function onSpellNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id === UNGADULU_ID) {
        player.message('You feel a strange force coming over you...');
        player.message('You feel weakened....');
        setCurrentLevel(player, 'attack', 0);
        setCurrentLevel(player, 'strength', 0);
        player.message('The spell fizzles and dies...');
        player.message(
            'Some sort of magical effect seems to be protecting the Shaman.'
        );
        return true;
    }
    if (npc.id === EVIL_UNGADULU_ID) {
        player.message('A strange power stops you from attacking the Shaman.');
        player.engage(npc);
        await evilUngadulu(player, npc);
        player.disengage();
        return true;
    }
    if (GUARDIANS[npc.id]) {
        if (
            !has(player, GUARDIANS[npc.id].crystalId) &&
            !player.cache.cavernous_opening
        ) {
            await guardianAttackMessage(player, npc);
            return true;
        }
        return false;
    }
    if (npc.id === NEZIKCHENED_ID) {
        if (npc.spawnedFor !== undefined && npc.spawnedFor !== player.id) {
            player.message('Your attack passes through');
            player.world.removeEntity('npcs', npc);
            return true;
        }
        return false;
    }
    return false;
}

// despawn an npc the player just fled from: character.retreat() has already
// scheduled its re-attack timer, so zero its hits first to defuse it.
function removeFleeingNpc(world, npc) {
    npc.skills.hits.current = 0;
    world.removeEntity('npcs', npc);
}

// fleeing the demon or a possessed guardian has consequences. overhead npc chat
// is shown as @yel@ messages.
async function onEscapeNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    const { world } = player;
    if (npc.id === NEZIKCHENED_ID) {
        const stage = getStage(player);
        if (stage === 3) {
            player.message(
                '@yel@Nezikchened: Run like the coward you are, I will return stronger than before.'
            );
            await world.sleepTicks(2);
            player.message(
                '@yel@Nezikchened: Next time we meet, your end will you greet!'
            );
            removeFleeingNpc(world, npc);
            return true;
        }
        if (stage === 7) {
            if (!player.cache.ran_from_2nd_nezi) {
                player.cache.ran_from_2nd_nezi = true;
            }
            player.message('@yel@Nezikchened: Run for your life coward...');
            await world.sleepTicks(3);
            player.message(
                '@yel@Nezikchened: The next time you come, I will be ready for you!'
            );
            await world.sleepTicks(3);
            // the demon melts back into Echned Zekin's spirit form, then fades.
            npc.skills.hits.current = 0;
            const echned = changeNpc(player, npc, ECHNED_ZEKIN_ID);
            await world.sleepTicks(2);
            world.removeEntity('npcs', echned);
            return true;
        }
        if (stage === 8) {
            player.message('@yel@Nezikchened: Ha, ha ha!');
            await world.sleepTicks(2);
            player.message(
                '@yel@Nezikchened: Yes, see how fast the little Vacu runs...!'
            );
            await world.sleepTicks(2);
            player.message(
                '@yel@Nezikchened: Trouble me not, or I will crush you like the worm you are.'
            );
            removeFleeingNpc(world, npc);
            return true;
        }
        return false;
    }
    if (
        GUARDIANS[npc.id] &&
        getStage(player) === 8 &&
        player.cache.viyeldi_companions !== undefined
    ) {
        removeFleeingNpc(world, npc);
        // these four lines are quest messages (@que@).
        player.message('@que@As you try to make your escape,');
        await world.sleepTicks(2);
        player.message('@que@the Viyeldi fighter is recalled by the demon...');
        await world.sleepTicks(2);
        player.message('@que@@yel@Nezikchened : Ha, ha ha!');
        await world.sleepTicks(2);
        player.message(
            '@que@@yel@Nezikchened : Run then fetid worm...and never touch my totem again...'
        );
        await world.sleepTicks(2);
        return true;
    }
    return false;
}

module.exports = {
    onTalkToNPC,
    onUseWithNPC,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onUseWithWallObject,
    onWallObjectCommandOne,
    onWallObjectCommandTwo,
    onSpellObject,
    onSpellNPC,
    onEscapeNPC,
    onInventoryCommand,
    onUseWithInventory,
    onGroundItemTake,
    onDropItem,
    onNPCAttack,
    onRangeNPC,
    onNPCDeath
};
