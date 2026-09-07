// the dig site (members): winch shafts and the soil/rock dig areas.
// workman scolding lines are delivered as player messages, not a spawned npc

const { questsEnabled } = require('../../custom-gate.js');
const {
    WINCH_IDS,
    SOIL_IDS,
    ROCK_ID,
    ROPE_ID,
    TROWEL_ID,
    ROCK_PICK_ID,
    SPADE_ID,
    PANNING_TRAY_ID,
    SPECIMEN_JAR_ID,
    SPECIMEN_BRUSH_ID,
    CRACKED_ROCK_SAMPLE_ID,
    LEATHER_GLOVES_ID,
    ICE_GLOVES_ID,
    KLANKS_GAUNTLETS_ID,
    STEEL_GAUNTLETS_ID,
    GAUNTLETS_OF_CHAOS_ID,
    GAUNTLETS_OF_COOKING_ID,
    GAUNTLETS_OF_GOLDSMITHING_ID,
    BOOTS_ID,
    NOTHING_ID,
    NOTHING_INTEREST_ID,
    VASE_ID,
    BROKEN_ARROW_ID,
    COINS_ID,
    A_LUMP_OF_CHARCOAL_ID,
    BONES_ID,
    OPAL_ID,
    OLD_BOOT_ID,
    OLD_TOOTH_ID,
    BROKEN_GLASS_ID,
    COPPER_ORE_ID,
    ROTTEN_APPLES_ID,
    BUTTONS_ID,
    RUSTY_SWORD_ID,
    PURPLEDYE_ID,
    POT_ID,
    CLAY_ID,
    BROKEN_GLASS_DIGSITE_LVL_2_ID,
    RATS_TAIL_ID,
    BROKEN_STAFF_ID,
    DAMAGED_ARMOUR_2_ID,
    JUG_ID,
    DAMAGED_ARMOUR_1_ID,
    TALISMAN_OF_ZAROS_ID,
    BRONZE_SPEAR_ID,
    PIE_DISH_ID,
    NEEDLE_ID,
    IRON_THROWING_KNIFE_ID,
    MEDIUM_BLACK_HELMET_ID,
    CERAMIC_REMAINS_ID,
    BELT_BUCKLE_ID,
    IRON_DAGGER_ID
} = require('./constants.js');

// item tables (NOTHING/NOTHING_INTEREST = null)
const TRAINING_AREA_ITEMS = [
    NOTHING_ID,
    NOTHING_INTEREST_ID,
    VASE_ID,
    BROKEN_ARROW_ID,
    COINS_ID,
    CRACKED_ROCK_SAMPLE_ID,
    A_LUMP_OF_CHARCOAL_ID
];

const DIGSITE_LEVEL1_ITEMS = [
    NOTHING_ID,
    BONES_ID,
    OPAL_ID,
    OLD_BOOT_ID,
    OLD_TOOTH_ID,
    BROKEN_GLASS_ID,
    COPPER_ORE_ID,
    ROTTEN_APPLES_ID,
    BUTTONS_ID,
    RUSTY_SWORD_ID,
    VASE_ID
];

const DIGSITE_LEVEL2_ITEMS = [
    NOTHING_ID,
    BONES_ID,
    PURPLEDYE_ID,
    POT_ID,
    CLAY_ID,
    BROKEN_GLASS_DIGSITE_LVL_2_ID,
    RATS_TAIL_ID,
    BROKEN_STAFF_ID,
    DAMAGED_ARMOUR_2_ID,
    JUG_ID,
    OLD_BOOT_ID
];

const DIGSITE_LEVEL3_ITEMS = [
    NOTHING_ID,
    BONES_ID,
    DAMAGED_ARMOUR_1_ID,
    BROKEN_STAFF_ID,
    TALISMAN_OF_ZAROS_ID,
    BROKEN_ARROW_ID,
    BRONZE_SPEAR_ID,
    PIE_DISH_ID,
    BUTTONS_ID,
    OLD_TOOTH_ID,
    COINS_ID,
    NEEDLE_ID,
    CLAY_ID,
    IRON_THROWING_KNIFE_ID,
    MEDIUM_BLACK_HELMET_ID,
    CERAMIC_REMAINS_ID,
    BELT_BUCKLE_ID,
    OLD_BOOT_ID,
    PURPLEDYE_ID
];

// inclusive random 0..n (matches DataConversions.random(0, n))
function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// player.getLocation().inBounds(x1, y1, x2, y2)
function inBounds(player, x1, y1, x2, y2) {
    return player.x >= x1 && player.x <= x2 && player.y >= y1 && player.y <= y2;
}

function getLevel3Digsite(player) {
    return (
        inBounds(player, 10, 495, 14, 499) ||
        inBounds(player, 23, 518, 28, 524)
    );
}

function getTrainingAreas(player) {
    return (
        inBounds(player, 13, 526, 17, 529) ||
        inBounds(player, 24, 526, 27, 529)
    );
}

function getLevel2Digsite(player) {
    return (
        inBounds(player, 24, 514, 26, 516) ||
        inBounds(player, 14, 506, 15, 509) ||
        inBounds(player, 20, 505, 27, 509)
    );
}

function getLevel1Digsite(player) {
    return (
        inBounds(player, 19, 516, 21, 526) ||
        inBounds(player, 13, 516, 17, 524)
    );
}

function hasWorn(player, id) {
    return player.inventory.items.some(
        (item) => item.id === id && item.equipped
    );
}

function currentLevel(player, skill) {
    return player.skills[skill].current;
}

function doDigsiteItemMessages(player, item) {
    if (item === NOTHING_ID) {
        player.message('You find nothing');
    } else if (item === NOTHING_INTEREST_ID) {
        // unreachable: NOTHING and NOTHING_INTEREST are both null
        player.message('You find nothing of interest');
    } else if (item === BONES_ID) {
        player.message('You find some bones');
    } else if (item === PURPLEDYE_ID) {
        player.message('You find some purple dye');
    } else if (item === POT_ID) {
        player.message('You find an old pot');
    } else if (item === CLAY_ID) {
        player.message('You find some clay');
    } else if (
        item === BROKEN_GLASS_ID ||
        item === BROKEN_GLASS_DIGSITE_LVL_2_ID
    ) {
        player.message('You find some broken glass');
    } else if (item === RATS_TAIL_ID) {
        player.message("You find a rat's tail");
    } else if (item === BROKEN_STAFF_ID) {
        player.message('You find a broken staff');
    } else if (
        item === DAMAGED_ARMOUR_1_ID ||
        item === DAMAGED_ARMOUR_2_ID
    ) {
        player.message('You find some old armour');
    } else if (item === JUG_ID) {
        player.message('You find an old jug');
    } else if (item === OLD_BOOT_ID) {
        player.message('You find an old boot');
    } else if (item === VASE_ID) {
        player.message('You find an old vase');
    } else if (item === COINS_ID) {
        if (getLevel3Digsite(player)) {
            player.message('You find some coins');
        } else {
            player.message('You find a coin');
        }
    } else if (item === CRACKED_ROCK_SAMPLE_ID) {
        player.message('You find a broken rock sample');
    } else if (item === A_LUMP_OF_CHARCOAL_ID) {
        player.message('You find some charcoal');
    } else if (item === BROKEN_ARROW_ID) {
        player.message('You find a broken arrow');
    } else if (item === OPAL_ID) {
        player.message('You find an opal');
    } else if (item === OLD_TOOTH_ID) {
        player.message('You find an old tooth');
    } else if (item === COPPER_ORE_ID) {
        player.message('You find some copper ore');
    } else if (item === ROTTEN_APPLES_ID) {
        player.message('You find a rotten apple');
    } else if (item === BUTTONS_ID) {
        player.message('You find some buttons');
    } else if (item === RUSTY_SWORD_ID) {
        player.message('You find a rusty sword');
    } else if (item === TALISMAN_OF_ZAROS_ID) {
        player.message('You find a strange talisman');
    } else if (item === BRONZE_SPEAR_ID) {
        player.message('You find a bronze spear');
    } else if (item === PIE_DISH_ID) {
        player.message('You find a pie dish');
    } else if (item === NEEDLE_ID) {
        player.message('You find a needle');
    } else if (item === IRON_THROWING_KNIFE_ID) {
        player.message('You find a throwing knife');
    } else if (item === MEDIUM_BLACK_HELMET_ID) {
        player.message('You find an black helmet');
    } else if (item === CERAMIC_REMAINS_ID) {
        player.message('You find some old pottery');
    } else if (item === BELT_BUCKLE_ID) {
        player.message('You find a belt buckle');
    } else if (item === IRON_DAGGER_ID) {
        player.message('You find a dagger');
    }
}

// give the rolled item (skip the null "nothing" sentinels)
function giveRolled(player, item) {
    if (item !== null) {
        player.inventory.add(item, 1);
    }
}

// exported for objects.js specimen tray messages
module.exports.doDigsiteItemMessages = doDigsiteItemMessages;

// winch shafts 1095 and 1053, each with its own rope cache flag and teleport target
function ropeCacheKeyFor(gameObject) {
    return gameObject.id === WINCH_IDS[0] ? 'winch_rope_1' : 'winch_rope_2';
}

async function winchOp(player, gameObject) {
    const stage = player.questStages.digsite;

    if (stage === -1) {
        player.message('@que@You find yourself in a cavern...');
        player.teleport(19, 3385);
        return true;
    }

    // stages 0..6
    if (player.cache.digsite_winshaft !== true) {
        // OpenRSC: workman scolds "this area is private" (spawned NPC).
        player.message('Sorry, this area is private');
        player.message(
            "The only way you'll get to use these",
            'Is by impressing the expert',
            'Up at the centre',
            'Find something worthwhile...',
            'And he might let you use the winches',
            'Until then, get lost !'
        );
        return true;
    }

    const ropeKey = ropeCacheKeyFor(gameObject);

    if (player.cache[ropeKey] !== true) {
        player.message('@que@You operate the winch');
        player.message('The bucket descends, but does not reach the bottom');
        await player.say(
            'Hey I think I could fit down here...',
            'I need something to help me get all the way down'
        );
        return true;
    }

    if (currentLevel(player, 'agility') < 10) {
        player.message('You need an agility level of 10 to do this');
        return true;
    }

    player.message('@que@You try to climb down the rope');
    await player.world.sleepTicks(3);
    player.message('@que@You lower yourself into the shaft');
    await player.world.sleepTicks(3);
    player.addExperience('agility', 20, true);

    if (gameObject.id === WINCH_IDS[0]) {
        player.teleport(26, 3346);
    } else if (player.questStages.digsite >= 6) {
        player.teleport(19, 3385);
    } else {
        player.teleport(19, 3337);
    }
    player.message('@que@You find yourself in a cavern...');
    return true;
}

async function winchUseRope(player, gameObject) {
    if (player.cache.digsite_winshaft !== true) {
        await player.say('Err... I have no idea why I am doing this !');
        return true;
    }

    const ropeKey = ropeCacheKeyFor(gameObject);

    if (player.cache[ropeKey] !== true) {
        player.message('You tie the rope to the bucket');
        player.cache[ropeKey] = true;
        player.inventory.remove(ROPE_ID);
    } else {
        player.message('There is already a rope tied to this bucket');
    }
    return true;
}

// dig areas
async function doSpade(player) {
    player.message('Oi! what do you think you are doing ?');
    player.message('Don\'t you realize there are fragile specimens around here ?');
}

async function rockPickOnSite(player) {
    if (!getLevel2Digsite(player)) {
        player.message(
            'No no, rockpicks should only be used',
            'To dig in a level 2 site...'
        );
        return;
    }
    if (player.questStages.digsite < 4) {
        player.message(
            "Sorry, you haven't passed level 2 earth sciences exam",
            "I can't let you dig here"
        );
        return;
    }
    // stage >= 4 and level 2 area
    player.message('@que@You dig through the earth');
    player.addExperience('mining', 70, true);
    await player.world.sleepTicks(3);
    const selected =
        DIGSITE_LEVEL2_ITEMS[random(0, DIGSITE_LEVEL2_ITEMS.length - 1)];
    doDigsiteItemMessages(player, selected);
    giveRolled(player, selected);
}

async function trowelOnSite(player) {
    if (getTrainingAreas(player)) {
        player.addExperience('mining', 50, true);
        player.message('@que@You dig with the trowel...');
        await player.world.sleepTicks(3);
        const selected =
            TRAINING_AREA_ITEMS[random(0, TRAINING_AREA_ITEMS.length - 1)];
        doDigsiteItemMessages(player, selected);
        giveRolled(player, selected);
    }
    if (getLevel1Digsite(player)) {
        const gloves =
            hasWorn(player, LEATHER_GLOVES_ID) ||
            hasWorn(player, ICE_GLOVES_ID) ||
            hasWorn(player, KLANKS_GAUNTLETS_ID) ||
            hasWorn(player, STEEL_GAUNTLETS_ID) ||
            hasWorn(player, GAUNTLETS_OF_CHAOS_ID) ||
            hasWorn(player, GAUNTLETS_OF_COOKING_ID) ||
            hasWorn(player, GAUNTLETS_OF_GOLDSMITHING_ID);
        if (!gloves) {
            player.message('Hey, where are your gloves ?');
            await player.say("Err...I haven't got any");
            player.message('Well get some and put them on first!');
            return;
        }
        if (!hasWorn(player, BOOTS_ID)) {
            player.message('Oi, no boots!', 'No boots no digging!');
            return;
        }
        player.addExperience('mining', 60, true);
        player.message('@que@You dig through the earth');
        await player.world.sleepTicks(3);
        const selected =
            DIGSITE_LEVEL1_ITEMS[random(0, DIGSITE_LEVEL1_ITEMS.length - 1)];
        doDigsiteItemMessages(player, selected);
        giveRolled(player, selected);
    }
    if (getLevel2Digsite(player)) {
        player.message(
            'Sorry, you must use a rockpick',
            'To dig in a level 2 site...'
        );
    }
    if (getLevel3Digsite(player)) {
        if (!player.inventory.has(SPECIMEN_JAR_ID)) {
            player.message(
                "Ahem! I don't see your sample jar",
                'You must carry one to be able to dig here...'
            );
            await player.say('Oh, okay');
            return;
        }
        if (!player.inventory.has(SPECIMEN_BRUSH_ID)) {
            player.message(
                'Wait just a minute!',
                "I can't let you dig here",
                'Unless you have a specimen brush with you',
                'Rules is rules!'
            );
            return;
        }
        if (player.questStages.digsite < 5) {
            player.message(
                "Sorry, you haven't passed level 3 earth sciences exam",
                "I can't let you dig here"
            );
            return;
        }
        player.addExperience('mining', 80, true);
        player.message('@que@You dig through the earth');
        await player.world.sleepTicks(3);
        const selected =
            DIGSITE_LEVEL3_ITEMS[random(0, DIGSITE_LEVEL3_ITEMS.length - 1)];
        doDigsiteItemMessages(player, selected);
        if (selected !== null) {
            if (selected === COINS_ID) {
                player.inventory.add(COINS_ID, random(0, 1) === 1 ? 5 : 10);
            } else {
                player.inventory.add(selected, 1);
            }
        }
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (WINCH_IDS.includes(gameObject.id)) {
        const stage = player.questStages.digsite;
        if (stage < -1 || stage > 6) {
            return false;
        }
        return winchOp(player, gameObject);
    }

    // Examine the patch of soil.
    if (SOIL_IDS.includes(gameObject.id)) {
        player.message('@que@You examine the patch of soil');
        player.message('You see nothing on the surface');
        await player.say('I think I need something to dig with');
        return true;
    }

    return false;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (WINCH_IDS.includes(gameObject.id) && item.id === ROPE_ID) {
        return winchUseRope(player, gameObject);
    }

    if (SOIL_IDS.includes(gameObject.id)) {
        if (item.id === TROWEL_ID) {
            await trowelOnSite(player);
            return true;
        }
        if (item.id === SPADE_ID) {
            await doSpade(player);
            return true;
        }
        if (item.id === ROCK_PICK_ID) {
            await rockPickOnSite(player);
            return true;
        }
        if (item.id === PANNING_TRAY_ID) {
            await player.say('No I\'d better not - it may damage the tray...');
            return true;
        }
        player.message('Nothing interesting happens');
        return true;
    }

    if (gameObject.id === ROCK_ID && item.id === ROCK_PICK_ID) {
        player.message('You chip at the rock with the rockpick');
        player.message('You take the pieces of cracked rock');
        player.inventory.add(CRACKED_ROCK_SAMPLE_ID, 1);
        return true;
    }

    return false;
}

module.exports.onGameObjectCommandOne = onGameObjectCommandOne;
module.exports.onUseWithGameObject = onUseWithGameObject;
