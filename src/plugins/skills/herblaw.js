// https://classic.runescape.wiki/w/Herblaw
// herblaw (members): identify herbs, herb + vial -> unfinished potion, +
// secondary -> finished potion, grinding, and quest liquids (blamish oil,
// digsite explosive, gujuo, ogre/exploding). gated on members + Druidic Ritual.
// item ids and tables come from rsc-data, with a few levels/results overridden
// to OpenRSC's values (see HERB_VIAL_LEVEL, SECOND_RESULT_OVERRIDE,
// SECOND_EXP_OVERRIDE). runecraft/harvesting custom potions are not ported.

const items = require('@2003scape/rsc-data/config/items');
const { herbs, unfinished, potions } = require('@2003scape/rsc-data/skills/herblaw');
const { getBatchCount } = require('./batch');
const skillCapes = require('./skill-capes');

// fixed item ids
const VIAL_OF_WATER = 464;
const EMPTY_VIAL = 465; // ItemId.EMPTY_VIAL
const PESTLE_AND_MORTAR = 468; // ItemId.PESTLE_AND_MORTAR

// grind inputs to outputs
const UNICORN_HORN = 466;
const GROUND_UNICORN_HORN = 473;
const BLUE_DRAGON_SCALE = 467;
const GROUND_BLUE_DRAGON_SCALE = 472;
const BAT_BONES = 604;
const GROUND_BAT_BONES = 1051;
const A_LUMP_OF_CHARCOAL = 983;
const GROUND_CHARCOAL = 1179;
const CHOCOLATE_BAR = 337;
const CHOCOLATE_DUST = 772;

const GRIND_RESULT = {
    [UNICORN_HORN]: GROUND_UNICORN_HORN,
    [BLUE_DRAGON_SCALE]: GROUND_BLUE_DRAGON_SCALE,
    [BAT_BONES]: GROUND_BAT_BONES,
    [A_LUMP_OF_CHARCOAL]: GROUND_CHARCOAL,
    [CHOCOLATE_BAR]: CHOCOLATE_DUST
};

// special vial-of-water branches (Herblaw.doHerblaw)
const JANGERBERRIES = 936;
const ARDRIGAL = 818;
const SNAKE_WEED = 816;
const ARDRIGAL_SOLUTION = 1252;
const SNAKES_WEED_SOLUTION = 1251;
const GUJUO_POTION = 1253;
const UNFINISHED_POTION = 1074;
const GUAM_LEAF = 444;

// ogre-potion / exploding-potion branches (Herblaw.makeLiquid)
const UNFINISHED_OGRE_POTION = 1052; // == shaman unfinished (jangerberries + guam)
const OGRE_POTION = 1053;

// blamish oil (heroes quest)
const UNFINISHED_HARRALANDER_POTION = 457;
const BLAMISH_SNAIL_SLIME = 587;
const BLAMISH_OIL = 588;

// explosive compound (digsite quest)
const NITROGLYCERIN = 1161;
const AMMONIUM_NITRATE = 1160;
const MIXED_CHEMICALS_1 = 1178;
const MIXED_CHEMICALS_2 = 1180;
const ARCENIA_ROOT = 1284;
const EXPLOSIVE_COMPOUND = 1176;

// jangerberries + unfinished guam potion constraint
const UNFINISHED_GUAM_POTION = 454;

// 5 quest herbs added with exp 0, not in the base herb table
const IDENTIFY = {};
for (const [rawId, def] of Object.entries(herbs)) {
    IDENTIFY[Number(rawId)] = {
        level: def.level,
        newId: def.id,
        experience: def.experience
    };
}
// quest herb identify ids and level req
const QUEST_IDENTIFY = {
    815: { level: 3, newId: 816, experience: 0 },
    817: { level: 3, newId: 818, experience: 0 },
    819: { level: 3, newId: 820, experience: 0 },
    821: { level: 3, newId: 822, experience: 0 },
    823: { level: 3, newId: 824, experience: 0 }
};
Object.assign(IDENTIFY, QUEST_IDENTIFY);

const IDENTIFY_IDS = new Set(Object.keys(IDENTIFY).map(Number));

// herb + vial of water level req
const HERB_VIAL_LEVEL = {
    444: 3,
    445: 5,
    446: 12,
    447: 22,
    448: 30, // ranarr  (rsc-data says 25)
    449: 45, // irit    (rsc-data says 40)
    450: 50, // avantoe (rsc-data says 48)
    451: 55, // kwuarm  (rsc-data says 54)
    452: 66, // cadantine (rsc-data says 65)
    453: 72, // dwarf weed (rsc-data says 70)
    934: 78 // torstol (rsc-data says 75)
};

const HERB_VIAL = {};
for (const [herbId, def] of Object.entries(unfinished)) {
    const id = Number(herbId);
    HERB_VIAL[id] = {
        potionId: def.id,
        level: HERB_VIAL_LEVEL[id] !== undefined ? HERB_VIAL_LEVEL[id] : def.level
    };
}
const HERB_IDS = new Set(Object.keys(HERB_VIAL).map(Number));

// unfinished + secondary -> finished potion table
const SECOND_RESULT_OVERRIDE = {
    '456|220': 222
};
const SECOND_EXP_OVERRIDE = {
    '463|501': 660
};

// drops the harralander+blamish recipe in favor of the dedicated heroes branch
const SECOND_EXCLUDE = new Set(['457|587']);

// SECOND[unfinishedId][secondaryId] = { level, experience, potionId }
const SECOND = {};
for (const [unfId, secMap] of Object.entries(potions)) {
    SECOND[Number(unfId)] = {};
    for (const [secId, def] of Object.entries(secMap)) {
        const key = `${unfId}|${secId}`;
        if (SECOND_EXCLUDE.has(key)) {
            continue;
        }
        SECOND[Number(unfId)][Number(secId)] = {
            level: def.level,
            experience:
                SECOND_EXP_OVERRIDE[key] !== undefined
                    ? SECOND_EXP_OVERRIDE[key]
                    : def.experience,
            potionId:
                SECOND_RESULT_OVERRIDE[key] !== undefined
                    ? SECOND_RESULT_OVERRIDE[key]
                    : def.id
        };
    }
}

function itemName(id) {
    const def = items[id];
    return def ? def.name : 'item';
}

// members gate
function membersReject(player) {
    if (!player.world.members) {
        player.message('Nothing interesting happens');
        return true;
    }
    return false;
}

// druidic ritual completion gate
function druidicIncomplete(player) {
    if (player.questStages.druidicRitual !== -1) {
        player.message('You need to complete Druidic ritual quest first');
        return true;
    }
    return false;
}

// identify a grimy herb
async function identifyHerb(player, herbId) {
    const { world } = player;
    const def = IDENTIFY[herbId];

    if (membersReject(player)) {
        return true;
    }

    // level gate checked before batch, then druidic gate
    if (player.skills.herblaw.current < def.level) {
        player.message('@que@You cannot identify this herb');
        player.message('@que@you need a higher herblaw level');
        return true;
    }

    if (druidicIncomplete(player)) {
        return true;
    }

    const repeat = getBatchCount(player, 'herblaw');

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(herbId)) {
            return true;
        }

        // batchIdentify re-checks the level each iteration.
        if (player.skills.herblaw.current < def.level) {
            player.message('@que@You cannot identify this herb');
            player.message('@que@you need a higher herblaw level');
            return true;
        }

        if (player.isTired()) {
            player.message('You are too tired to identify this herb');
            return true;
        }

        player.inventory.remove(herbId);
        player.inventory.add(def.newId);
        player.message(`@que@This herb is ${itemName(def.newId)}`);
        player.addExperience('herblaw', def.experience);

        await world.sleepTicks(2);
    }

    return true;
}

// grind with pestle and mortar
async function grind(player, inputId) {
    const { world } = player;
    const newId = GRIND_RESULT[inputId];

    if (membersReject(player)) {
        return true;
    }

    if (newId === undefined) {
        player.message('Nothing interesting happens');
        return true;
    }

    // charcoal's "grind to a powder" line is sent once, not per iteration
    if (inputId === A_LUMP_OF_CHARCOAL) {
        player.message('You grind the charcoal to a powder');
    }

    const repeat = getBatchCount(player, 'herblaw');

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(inputId) ||
            !player.inventory.has(PESTLE_AND_MORTAR)
        ) {
            return true;
        }

        player.inventory.remove(inputId);

        // charcoal has no per-iteration message (sent once above)
        if (inputId !== A_LUMP_OF_CHARCOAL) {
            player.message(`@que@You grind the ${itemName(inputId)} to dust`);
        }

        // bubble only for charcoal/bat bones
        if (inputId === A_LUMP_OF_CHARCOAL || inputId === BAT_BONES) {
            player.sendBubble(PESTLE_AND_MORTAR);
        }

        player.inventory.add(newId);

        await world.sleepTicks(2);
    }

    return true;
}

// identified herb + vial of water -> unfinished potion
async function herbOnVial(player, herbId) {
    const { world } = player;

    if (membersReject(player)) {
        return true;
    }

    // special vial-of-water branches
    if (herbId === GROUND_BAT_BONES) {
        player.message('You mix the ground bones into the water');
        player.message('Fizz!!!');
        await player.say('Oh dear, the mixture has evaporated!', "It's useless...");
        player.inventory.remove(VIAL_OF_WATER);
        player.inventory.remove(GROUND_BAT_BONES);
        player.inventory.add(EMPTY_VIAL);
        return true;
    }
    if (herbId === JANGERBERRIES) {
        player.message('You mix the berries into the water');
        player.inventory.remove(VIAL_OF_WATER);
        player.inventory.remove(JANGERBERRIES);
        player.inventory.add(UNFINISHED_POTION);
        return true;
    }
    if (herbId === ARDRIGAL) {
        player.message('You put the ardrigal herb into the watervial.');
        player.message('You make a solution of Ardrigal.');
        player.inventory.remove(VIAL_OF_WATER);
        player.inventory.remove(ARDRIGAL);
        player.inventory.add(ARDRIGAL_SOLUTION);
        return true;
    }
    if (herbId === SNAKE_WEED) {
        player.message('You put the Snake Weed herb into the watervial.');
        player.message('You make a solution of Snake Weed.');
        player.inventory.remove(VIAL_OF_WATER);
        player.inventory.remove(SNAKE_WEED);
        player.inventory.add(SNAKES_WEED_SOLUTION);
        return true;
    }

    // generic herb + vial path
    const def = HERB_VIAL[herbId];

    if (!def) {
        return false;
    }

    if (player.skills.herblaw.current < def.level) {
        player.message(
            `@que@you need level ${def.level} herblaw to make this potion`
        );
        return true;
    }

    if (druidicIncomplete(player)) {
        return true;
    }

    const repeat = getBatchCount(player, 'herblaw');

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(herbId) ||
            !player.inventory.has(VIAL_OF_WATER)
        ) {
            return true;
        }

        if (player.skills.herblaw.current < def.level) {
            player.message(
                `@que@you need level ${def.level} herblaw to make this potion`
            );
            return true;
        }

        const herbNameText = itemName(herbId);
        player.message(`@que@You put the ${herbNameText} into the vial of water`);
        player.sendSound('mix');

        player.inventory.remove(VIAL_OF_WATER);
        player.inventory.add(def.potionId);

        // herblaw cape: 10% chance to save the herb
        if (skillCapes.shouldActivate(player, 'herblaw')) {
            player.message(
                `@que@@gr2@Your Herblaw cape activates, saving your ${herbNameText}`
            );
        } else {
            player.inventory.remove(herbId);
        }

        await world.sleepTicks(2);
    }

    return true;
}

// unfinished potion + secondary -> finished potion
// usedWithId is the item the other was used on (the bubble target)
async function potionSecondary(player, unfinishedId, secondaryId, usedWithId) {
    const { world } = player;

    if (membersReject(player)) {
        return true;
    }

    const def = SECOND[unfinishedId] && SECOND[unfinishedId][secondaryId];

    if (!def) {
        return false;
    }

    // blocked while watchtower quest is in progress (stage 0..5)
    if (
        secondaryId === JANGERBERRIES &&
        unfinishedId === UNFINISHED_GUAM_POTION &&
        player.questStages.watchtower >= 0 &&
        player.questStages.watchtower < 6
    ) {
        await player.say(
            "Hmmm...perhaps I shouldn't try and mix these items together",
            'It might have unpredictable results...'
        );
        return true;
    }

    if (player.skills.herblaw.current < def.level) {
        player.message(
            `@que@You need a herblaw level of ${def.level} to make this potion`
        );
        return true;
    }

    if (druidicIncomplete(player)) {
        return true;
    }

    const repeat = getBatchCount(player, 'herblaw');

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(unfinishedId) ||
            !player.inventory.has(secondaryId)
        ) {
            return true;
        }

        if (player.skills.herblaw.current < def.level) {
            player.message(
                `@que@You need a herblaw level of ${def.level} to make this potion`
            );
            return true;
        }

        if (player.isTired()) {
            player.message('You are too tired to make this potion');
            return true;
        }

        // bubble only for the jangerberries + unfinished guam potion combo
        if (
            secondaryId === JANGERBERRIES &&
            unfinishedId === UNFINISHED_GUAM_POTION
        ) {
            player.sendBubble(usedWithId);
        }

        const secondName = itemName(secondaryId);
        player.message(`@que@You mix the ${secondName} into your potion`);
        player.sendSound('mix');

        player.inventory.remove(unfinishedId);

        // herblaw cape: 10% chance to save the secondary ingredient
        if (skillCapes.shouldActivate(player, 'herblaw')) {
            player.message(
                `@gr2@Your Herblaw cape activates, saving your ${secondName}`
            );
        } else {
            player.inventory.remove(secondaryId);
        }

        player.inventory.add(def.potionId);
        player.addExperience('herblaw', def.experience);

        await world.sleepTicks(2);
    }

    return true;
}

// ogre potion or explosion depending on ingredient
// usedWithId is the item the other was used on (the bubble target)
async function makeLiquid(player, unfinishedPotId, ingredientId, usedWithId) {
    if (membersReject(player)) {
        return true;
    }

    // mixing incorrectly explodes the unfinished potion
    if (
        unfinishedPotId === UNFINISHED_POTION &&
        (ingredientId === GROUND_BAT_BONES || ingredientId === GUAM_LEAF)
    ) {
        player.message(
            `@que@You mix the liquid with the ${itemName(ingredientId).toLowerCase()}`
        );
        player.message('Bang!!!');
        player.sendTeleportBubble(player.x, player.y, true);
        player.damage(8);
        await player.say('Ow!');
        player.message(
            '@que@You mixed this ingredients incorrectly and the mixture exploded!'
        );
        player.inventory.remove(UNFINISHED_POTION);
        player.inventory.remove(ingredientId);
        player.inventory.add(EMPTY_VIAL);
        return true;
    }

    // unfinished ogre potion + ground bat bones
    if (
        unfinishedPotId === UNFINISHED_OGRE_POTION &&
        ingredientId === GROUND_BAT_BONES
    ) {
        if (player.skills.herblaw.current < 14) {
            player.message(
                '@que@You need to have a herblaw level of 14 or over to mix this liquid'
            );
            return true;
        }
        if (druidicIncomplete(player)) {
            return true;
        }
        if (
            player.questStages.watchtower >= 0 &&
            player.questStages.watchtower < 6
        ) {
            await player.say(
                "Hmmm...perhaps I shouldn't try and mix these items together",
                'It might have unpredictable results...'
            );
            return true;
        }

        if (
            player.inventory.has(ingredientId) &&
            player.inventory.has(unfinishedPotId)
        ) {
            player.sendBubble(usedWithId);
            player.message(
                `@que@You mix the ${itemName(ingredientId).toLowerCase()} into the liquid`
            );
            player.message('@que@You produce a strong potion');
            player.inventory.remove(GROUND_BAT_BONES);
            player.inventory.remove(UNFINISHED_OGRE_POTION);
            player.inventory.add(OGRE_POTION);
            player.addExperience('herblaw', 100);
        }
        return true;
    }

    return false;
}

// digsite explosive compound chain, each step requires herblaw 10+
async function digsiteMix(player, a, b) {
    if (membersReject(player)) {
        return true;
    }

    const pair = (x, y) => (a === x && b === y) || (a === y && b === x);

    let removeA;
    let removeB;
    let resultId;
    let xp;
    let lines;

    if (pair(AMMONIUM_NITRATE, NITROGLYCERIN)) {
        removeA = AMMONIUM_NITRATE;
        removeB = NITROGLYCERIN;
        resultId = MIXED_CHEMICALS_1;
        xp = 20;
        lines = [
            '@que@You mix the nitrate powder into the liquid',
            'It has produced a foul mixture'
        ];
    } else if (pair(GROUND_CHARCOAL, MIXED_CHEMICALS_1)) {
        removeA = GROUND_CHARCOAL;
        removeB = MIXED_CHEMICALS_1;
        resultId = MIXED_CHEMICALS_2;
        xp = 25;
        lines = [
            '@que@You mix the charcoal into the liquid',
            'It has produced an even fouler mixture'
        ];
    } else if (pair(ARCENIA_ROOT, MIXED_CHEMICALS_2)) {
        removeA = ARCENIA_ROOT;
        removeB = MIXED_CHEMICALS_2;
        resultId = EXPLOSIVE_COMPOUND;
        xp = 30;
        lines = [
            'You mix the root into the mixture',
            'You produce a potentially explosive compound...'
        ];
    } else {
        return false;
    }

    if (player.skills.herblaw.current < 10) {
        player.message(
            '@que@You need to have a herblaw level of 10 or over to mix this liquid'
        );
        return true;
    }
    if (druidicIncomplete(player)) {
        return true;
    }

    player.addExperience('herblaw', xp);
    for (const line of lines) {
        player.message(line);
    }
    // bubble the newly-added reagent (removeA)
    player.sendBubble(removeA);
    player.inventory.remove(removeA);
    player.inventory.remove(removeB);
    player.inventory.add(resultId);

    if (resultId === EXPLOSIVE_COMPOUND) {
        await player.say('Excellent this looks just right');
    }

    return true;
}

// blamish snail slime + unfinished harralander potion, 320 xp
async function blamishOil(player) {
    if (membersReject(player)) {
        return true;
    }

    if (player.skills.herblaw.current < 25) {
        player.message('@que@You need a herblaw level of 25 to make this potion');
        return true;
    }
    if (druidicIncomplete(player)) {
        return true;
    }

    player.addExperience('herblaw', 320);
    player.message('You mix the slime into your potion');
    player.inventory.remove(UNFINISHED_HARRALANDER_POTION);
    player.inventory.remove(BLAMISH_SNAIL_SLIME);
    player.inventory.add(BLAMISH_OIL);
    return true;
}

// ardrigal/snake weed solution swap makes gujuo potion
async function gujuoPotion(player, addId, solutionId) {
    if (membersReject(player)) {
        return true;
    }

    if (player.skills.herblaw.current < 45) {
        player.message(
            '@que@You need to have a herblaw level of 45 or over to mix this potion'
        );
        return true;
    }
    if (druidicIncomplete(player)) {
        return true;
    }

    // must have learned the secret from Gujuo (Legends stage >= 7)
    if (
        player.questStages.legendsQuest >= 0 &&
        player.questStages.legendsQuest < 7
    ) {
        player.message("You're not quite sure what effect this will have.");
        player.message('You decide against experimenting.');
        return true;
    }

    if (addId === ARDRIGAL) {
        player.message('You add the Ardrigal to the Snakesweed Solution.');
    } else {
        player.message('You add the Snake Weed to the Ardrigal solution.');
    }
    player.message(
        'The mixture seems to bubble slightly with a strange effervescence...'
    );
    player.inventory.remove(addId);
    player.inventory.remove(solutionId);
    player.inventory.add(GUJUO_POTION);
    return true;
}

// dispatch order
async function onUseWithInventory(player, item, target) {
    const a = item.id;
    const b = target.id;

    const isPair = (x, y) => (a === x && b === y) || (a === y && b === x);

    // 1. secondary + unfinished potion  (ItemHerbSecond)
    if (SECOND[a] && SECOND[a][b]) {
        return await potionSecondary(player, a, b, b);
    }
    if (SECOND[b] && SECOND[b][a]) {
        return await potionSecondary(player, b, a, b);
    }

    // blamish oil checked before the generic vial path
    if (isPair(UNFINISHED_HARRALANDER_POTION, BLAMISH_SNAIL_SLIME)) {
        return await blamishOil(player);
    }

    // 3. pestle & mortar grind
    if (a === PESTLE_AND_MORTAR) {
        return await grind(player, b);
    }
    if (b === PESTLE_AND_MORTAR) {
        return await grind(player, a);
    }

    // 4. vial of water + herb (ItemHerbDef + special vial branches)
    if (a === VIAL_OF_WATER) {
        return await herbOnVial(player, b);
    }
    if (b === VIAL_OF_WATER) {
        return await herbOnVial(player, a);
    }

    // 5. ogre / exploding potion (makeLiquid)
    if (
        isPair(UNFINISHED_OGRE_POTION, GROUND_BAT_BONES) ||
        (isPair(UNFINISHED_POTION, GROUND_BAT_BONES) ||
            isPair(UNFINISHED_POTION, GUAM_LEAF))
    ) {
        // orient (unfinishedPot, ingredient)
        if (a === GROUND_BAT_BONES || a === GUAM_LEAF) {
            return await makeLiquid(player, b, a, b);
        }
        return await makeLiquid(player, a, b, b);
    }

    // 6. digsite explosive compound chain
    if (
        isPair(AMMONIUM_NITRATE, NITROGLYCERIN) ||
        isPair(GROUND_CHARCOAL, MIXED_CHEMICALS_1) ||
        isPair(ARCENIA_ROOT, MIXED_CHEMICALS_2)
    ) {
        return await digsiteMix(player, a, b);
    }

    // 7. snakes-weed potion (Legends)
    if (isPair(ARDRIGAL, SNAKES_WEED_SOLUTION)) {
        const solutionId = SNAKES_WEED_SOLUTION;
        return await gujuoPotion(player, ARDRIGAL, solutionId);
    }
    if (isPair(SNAKE_WEED, ARDRIGAL_SOLUTION)) {
        return await gujuoPotion(player, SNAKE_WEED, ARDRIGAL_SOLUTION);
    }

    return false;
}

// dispatch: identify
async function onInventoryCommand(player, item) {
    if (!IDENTIFY_IDS.has(item.id)) {
        return false;
    }
    return await identifyHerb(player, item.id);
}

module.exports = { onUseWithInventory, onInventoryCommand };
