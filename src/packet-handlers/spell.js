// RuneScape Classic spell casting - packet handlers.
// dispatcher for the 8 cast opcodes: castSelf, castNPC, castPlayer, castGround,
// castGroundItem, castInventoryItem, castObject, castWallObject. registered as "spell".
//
// static spell data (xp, type, members, damage/teleport/enchant/curse/orb/god
// tables, staff rune substitutes, roll helpers) lives in ../plugins/skills/magic.js;
// this file is per-cast control flow: sanity checks, success roll, rune use, effects.
//
// message.id is the client magic-tab index = index into rsc-data config/spells.json.
//
// single-player: castPlayer has no real target but is wired so it works once a
// second player exists. modelled gates: wilderness teleport block, cast/fail
// throttle, Charge god-spell damage buff, mage-arena zone gate, god-spell learned
// cast-counter (see inMageArena/godSpellLearnGate; the arena minigame shares the
// "<Spell Name>_casts" cache key, threshold 100). multiplayer-only gates with no
// SP effect are noted inline.

const spells = require('@2003scape/rsc-data/config/spells');
const magic = require('../plugins/skills/magic');
const skillCapes = require('../plugins/skills/skill-capes');
const enchantedCrowns = require('../plugins/skills/enchanted-crowns');

const {
    ITEM,
    SPELL,
    STAFF_SUBSTITUTES,
    GOD_CAPES,
    EXPERIENCE,
    SPELL_TYPE,
    MEMBERS,
    COMBAT_MAX_HIT,
    CRUMBLE_UNDEAD_MAX,
    MILLISECONDS_BETWEEN_CASTS,
    RAPID_CAST_SPELLS,
    SPELL_FAIL_LOCKOUT,
    CHARGE_DURATION,
    TELEPORTS,
    CURSE_SPELLS,
    ENCHANTS,
    CHARGE_ORBS,
    GOD_SPELLS,
    wildernessLevel,
    calculateMagicDamage,
    calculateIbanSpellDamage,
    calculateGodSpellDamage,
    rollCastSuccess
} = magic;

// magic combat projectile sprite: 1 = spell dart, 2 = arrow
const MAGIC_PROJECTILE = 1;

// stop walking toward a cast target once within this many tiles.
const SPELL_RANGE_DISTANCE = 4;

const GameObject = require('../model/game-object');

// npc name fragments crumble undead can target.
const CRUMBLE_TARGETS = ['skeleton', 'zombie', 'ghost'];

// family crest gauntlets of chaos.
const GAUNTLETS_OF_CHAOS_ID = 701;
const FAMCREST_GAUNTLETS_CHAOS = 3; // Gauntlets.CHAOS.id() (external/Gauntlets.java)
const BOLT_SPELLS = new Set([
    SPELL.WIND_BOLT,
    SPELL.WATER_BOLT,
    SPELL.EARTH_BOLT,
    SPELL.FIRE_BOLT
]);

function hasChaosGauntletBonus(player) {
    return (
        player.inventory.isEquipped(GAUNTLETS_OF_CHAOS_ID) &&
        player.cache.famcrest_gauntlets === FAMCREST_GAUNTLETS_CHAOS
    );
}

// inline npc special-cases: Delrith and Lucien block the cast with a message;
// Chronozon records the elemental blast that weakened it (consumed by the Family
// Crest onNPCDeath).
const npcsData = require('@2003scape/rsc-data/config/npcs');

function findNpcIdByName(name) {
    const lower = name.toLowerCase();
    for (let i = 0; i < npcsData.length; i += 1) {
        if (npcsData[i] && npcsData[i].name.toLowerCase() === lower) {
            return i;
        }
    }
    return -1;
}

// Delrith (Demon Slayer).
const DELRITH_ID = findNpcIdByName('Delrith');
// forest Lucien fought in Temple of Ikov (rsc-data id 364, not the 360 quest-giver).
const LUCIEN_EDGE_ID = 364;
// Chronozon (Family Crest).
const CHRONOZON_ID = findNpcIdByName('Chronozon');

// Pendant of Armadyl (Lucien inline gate) + Temple of Ikov quest key.
const PENDANT_OF_ARMADYL_ID = 726;

// smelting table for superheat item.
const smithing = require('@2003scape/rsc-data/skills/smithing');

// items config for prices (low/high alchemy) and names (messages)
const items = require('@2003scape/rsc-data/config/items');

// cast throttle + charge state. transient timestamps on the runtime player
// object, not persisted; a Charge does not survive relog.

// ms timestamp of the last cast (a future value after a failed cast); 0 = never cast.
function getLastSpellCast(player) {
    return typeof player.lastSpellCast === 'number' ? player.lastSpellCast : 0;
}

// true once enough time has passed since the last cast (0 hold when rapid casting).
function castTimer(player) {
    const holdTimer = RAPID_CAST_SPELLS ? 0 : MILLISECONDS_BETWEEN_CASTS;
    return Date.now() - getLastSpellCast(player) > holdTimer;
}

// seconds remaining before the next cast is allowed (min 1).
function getSpellWait(player) {
    const remaining =
        (MILLISECONDS_BETWEEN_CASTS - (Date.now() - getLastSpellCast(player))) /
        1000;
    return Math.max(Math.trunc(remaining), 1);
}

// stamp a successful cast at now.
function setCastTimer(player) {
    player.lastSpellCast = Date.now();
}

// push the throttle 20s into the future after a failed cast.
function setSpellFail(player) {
    player.lastSpellCast = Date.now() + SPELL_FAIL_LOCKOUT;
}

// true while a Charge is active.
function isCharged(player) {
    return (
        typeof player.chargeExpires === 'number' &&
        player.chargeExpires > Date.now()
    );
}

// (re)arm the Charge for CHARGE_DURATION from now, resetting any active one.
function addCharge(player) {
    player.chargeExpires = Date.now() + CHARGE_DURATION;
}

// true when the caster is charged and wielding a god cape (25-max god-spell buff).
function hasGodSpellChargeBenefit(player) {
    if (!isCharged(player)) {
        return false;
    }

    for (const capeId of GOD_CAPES) {
        if (player.inventory.isEquipped(capeId)) {
            return true;
        }
    }

    return false;
}

// rune / staff handling.

// true if a staff that substitutes for runeId is equipped.
function hasWieldedStaff(player, runeId) {
    const staffIds = STAFF_SUBSTITUTES[runeId];

    if (!staffIds) {
        return false;
    }

    for (const staffId of staffIds) {
        if (player.inventory.isEquipped(staffId)) {
            return true;
        }
    }

    return false;
}

// runes to consume for this spell as { id, amount }, or null if any is missing
// (staffs substitute their rune). messages the player on a miss.
function getRunesToConsume(player, spellIndex) {
    const runesToConsume = [];

    for (const { id, amount } of spells[spellIndex].runes) {
        // elemental staffs substitute for their rune entirely
        if (hasWieldedStaff(player, id)) {
            continue;
        }

        if (!player.inventory.has(id, amount)) {
            player.message(
                "You don't have all the reagents you need for this spell"
            );
            return null;
        }

        runesToConsume.push({ id, amount });
    }

    return runesToConsume;
}

// verify and consume runes in one go; false (and messages) if any is missing.
// the magic cape has a 10% chance to cast free, rolled before any rune check.
function checkAndRemoveRunes(player, spellIndex) {
    if (skillCapes.shouldActivate(player, 'magic')) {
        player.message('You manage to cast the spell without using any runes');
        return true;
    }

    const toConsume = getRunesToConsume(player, spellIndex);

    if (!toConsume) {
        return false;
    }

    for (const { id, amount } of toConsume) {
        player.inventory.remove(id, amount);
    }

    return true;
}

// spell finalisation.
function finalizeSpell(player, spellIndex, message, giveExp = true) {
    player.sendSound('spellok');

    // don't display a message if message is null (e.g. superheat)
    if (message !== null && typeof message !== 'undefined') {
        player.message(
            message.trim().length === 0 ? 'Cast spell successfully' : message
        );
    }

    if (giveExp) {
        player.addExperience('magic', EXPERIENCE[spellIndex]);
    }

    // stamp the successful cast so the next one waits.
    setCastTimer(player);
}

// sanity checks.

// true if the player may cast spellIndex, false otherwise (already messaged).
// opcode is the decoder key, for the cast-on-self teleport block.
function spellSanityChecks(player, spellIndex, opcode) {
    if (
        typeof spellIndex !== 'number' ||
        spellIndex < 0 ||
        spellIndex >= spells.length
    ) {
        return false;
    }

    const spell = spells[spellIndex];

    // members-only spell on a free world.
    if (MEMBERS[spellIndex] && !player.world.members) {
        player.message('You need to login to a members world to use this spell');
        return false;
    }

    // magic level gate (current level).
    if (player.skills.magic.current < spell.level) {
        player.message('Your magic ability is not high enough for this spell.');
        return false;
    }

    // teleport block (cast on self, teleport-type spell)
    if (
        opcode === 'castSelf' &&
        SPELL_TYPE[spellIndex] === 0 &&
        !isBoostSpell(spellIndex) &&
        !canTeleport(player, spellIndex)
    ) {
        return false;
    }

    // during a duel only casting on your opponent (castPlayer) is allowed.
    if (opcode !== 'castPlayer' && player.duel.isDuelActive()) {
        player.message("You can't do that during a duel!");
        return false;
    }

    return true;
}

// roll the cast; on failure message and push the throttle 20s into the future.
function spellSuccessCheck(player, spellIndex) {
    const magicEquip = Math.max(player.equipmentBonuses.magic || 1, 1);

    if (
        !rollCastSuccess(
            spells[spellIndex].level,
            player.skills.magic.current,
            magicEquip
        )
    ) {
        player.message('The spell fails! You may try again in 20 seconds');
        player.sendSound('spellfail');
        setSpellFail(player);
        return false;
    }

    return true;
}

// the four retro boost spells, absent from the modern spell list (always false).
function isBoostSpell() {
    return false;
}

// true inside the mage-arena bounds (217,119 - 239,141).
function inMageArena(player) {
    const x = player.x;
    const y = player.y % player.world.planeElevation; // flatten to ground plane
    return x >= 217 && x <= 239 && y >= 119 && y <= 141;
}

// casts needed before a god spell is learned.
const GOD_SPELL_LEARN_THRESHOLD = 100;

function godSpellCastsKey(spellIndex) {
    return `${spells[spellIndex].name}_casts`;
}

function godSpellCastsCount(player, spellIndex) {
    return player.cache[godSpellCastsKey(spellIndex)] || 0;
}

// outside the arena a god spell is blocked until cast >= 100 times inside it.
// true if the cast may proceed.
function checkGodSpellLearnGate(player, spellIndex) {
    if (inMageArena(player)) {
        return true;
    }

    const casts = godSpellCastsCount(player, spellIndex);

    if (casts >= GOD_SPELL_LEARN_THRESHOLD) {
        return true;
    }

    player.message('this spell can only be used in the mage arena');
    player.message(
        `You must learn this spell first, you need ${
            GOD_SPELL_LEARN_THRESHOLD - casts
        } more casts in the mage arena`
    );
    return false;
}

// in the arena, bump the cast counter and print the "well done" line on the 100th cast.
function trackGodSpellLearnProgress(player, spellIndex) {
    if (!inMageArena(player)) {
        return;
    }

    const key = godSpellCastsKey(spellIndex);
    const casts = player.cache[key] || 0;

    player.cache[key] = casts + 1;

    if (casts === GOD_SPELL_LEARN_THRESHOLD - 1) {
        player.message(
            `Well done .. you can now use the ${spells[spellIndex].name} outside the arena`
        );
    }
}

// the god's mark left on a tile by a god spell or Charge, gone after two ticks
const GOD_SPELL_MARKS = {
    [SPELL.CLAWS_OF_GUTHIX]: 1142,
    [SPELL.SARADOMIN_STRIKE]: 1031,
    [SPELL.FLAMES_OF_ZAMORAK]: 1036,
    [SPELL.CHARGE]: 1147
};

function spawnGodSpellMark(mob, objectId) {
    const { world } = mob;
    const mark = new GameObject(world, {
        id: objectId,
        x: mob.x,
        y: mob.y,
        direction: 0
    });

    world.addEntity('gameObjects', mark);
    world.setTickTimeout(() => world.removeEntity('gameObjects', mark), 2);
}

// spawn the mark, then drain (Claws: defence, Flames: magic, 1 + 5% of current
// and only if not already weakened; Saradomin strike: 1 prayer, always).
function godSpellObject(player, target, spellIndex) {
    spawnGodSpellMark(target, GOD_SPELL_MARKS[spellIndex]);

    if (spellIndex === SPELL.CHARGE) {
        return;
    }

    const skillName =
        spellIndex === SPELL.CLAWS_OF_GUTHIX
            ? 'defense'
            : spellIndex === SPELL.SARADOMIN_STRIKE
              ? 'prayer'
              : 'magic';
    const skill = target.skills[skillName];
    const lowerBy =
        spellIndex === SPELL.SARADOMIN_STRIKE
            ? 1
            : 1 + Math.floor(skill.current * 0.05);

    if (spellIndex !== SPELL.SARADOMIN_STRIKE) {
        if (skill.current < skill.base) {
            player.message(
                `@que@Your opponent already has weakened ${skillName}`
            );
            return;
        }

        if (target.constructor.name !== 'NPC') {
            target.message(
                `Your ${skillName === 'defense' ? 'defence' : 'magic'} has ` +
                    'been reduced by the spell!'
            );
        }
    }

    skill.current -= lowerBy;

    if (target.constructor.name !== 'NPC') {
        target.sendStats();
    }
}

// outside the arena, Charge is blocked until at least one god spell is learned.
// true if Charge may proceed.
function checkChargeLearnGate(player) {
    if (inMageArena(player)) {
        return true;
    }

    const counters = [
        SPELL.CLAWS_OF_GUTHIX,
        SPELL.SARADOMIN_STRIKE,
        SPELL.FLAMES_OF_ZAMORAK
    ].map((spellIndex) => player.cache[godSpellCastsKey(spellIndex)]);

    const noneCast = counters.every((casts) => typeof casts === 'undefined');
    const stillLearning = counters.some(
        (casts) =>
            typeof casts !== 'undefined' && casts < GOD_SPELL_LEARN_THRESHOLD
    );

    if (!noneCast && !stillLearning) {
        return true;
    }

    player.message('this spell can only be used in the mage arena');
    return false;
}

// canTeleport (SpellHandler.canTeleport)
function canTeleport(player, spellIndex) {
    // block teleport above wilderness level 20.
    if (
        wildernessLevel(player.x, player.y, player.world.planeElevation) >= 20
    ) {
        player.message('A mysterious force blocks your teleport spell!');
        player.message("You can't use teleport after level 20 wilderness");
        return false;
    }

    // can't teleport while carrying Ana (Tourist Trap)
    if (player.inventory.has(ITEM.ANA_IN_A_BARREL)) {
        player.message("You can't teleport while holding Ana,");
        player.message("It's just too difficult to concentrate.");
        return false;
    }

    // Ardougne teleport needs the Plague City reward scroll
    if (spellIndex === SPELL.ARDOUGNE_TELEPORT && !player.cache.ardougne_scroll) {
        player.message("You don't know how to cast this spell yet");
        player.message('You need to do the plague city quest');
        return false;
    }

    // Watchtower teleport needs the Watchtower quest completion scroll
    if (
        spellIndex === SPELL.WATCHTOWER_TELEPORT &&
        !player.cache.watchtower_scroll
    ) {
        player.message('You cannot cast this spell');
        player.message('You need to finish the watchtower quest first');
        return false;
    }

    return true;
}

// effect: teleport.
function handleTeleport(player, spellIndex) {
    if (!checkAndRemoveRunes(player, spellIndex)) {
        return;
    }

    // crossing destroys the plague sample (Biohazard)
    if (player.inventory.has(ITEM.PLAGUE_SAMPLE)) {
        player.message('the plague sample is too delicate...');
        player.message('it disintegrates in the crossing');

        while (player.inventory.has(ITEM.PLAGUE_SAMPLE)) {
            player.inventory.remove(ITEM.PLAGUE_SAMPLE);
        }
    }

    const destination = TELEPORTS[spellIndex];

    if (!destination) {
        return;
    }

    player.teleport(destination.x, destination.y, true);
    finalizeSpell(player, spellIndex, null);
}

// effect: bones to bananas + charge.
function handleGroundCast(player, spellIndex) {
    if (spellIndex === SPELL.BONES_TO_BANANAS) {
        if (!checkAndRemoveRunes(player, spellIndex)) {
            return;
        }

        // count held bones.
        let boneCount = 0;

        for (const item of player.inventory.items) {
            if (item.id === ITEM.BONES) {
                boneCount += 1;
            }
        }

        if (boneCount === 0) {
            player.message("You aren't holding any bones!");
            return;
        }

        for (let i = 0; i < boneCount; i += 1) {
            player.inventory.remove(ITEM.BONES);
            player.inventory.add(ITEM.BANANA);
        }

        finalizeSpell(player, spellIndex, '');
        return;
    }

    if (spellIndex === SPELL.CHARGE) {
        // Charge raises the god-spell max hit from 18 to 25 while active and a
        // god cape is worn.
        if (!checkChargeLearnGate(player)) {
            return;
        }

        if (player.world.gameObjects.getAtPoint(player.x, player.y).length) {
            player.message(
                "You can't charge power here, please move to a different area"
            );
            return;
        }

        if (!checkAndRemoveRunes(player, spellIndex)) {
            return;
        }

        player.message('@gre@You feel charged with magic power');
        addCharge(player);
        godSpellObject(player, player, SPELL.CHARGE);
        finalizeSpell(player, spellIndex, '');
    }
}

// effect: inventory-item casts (enchant / alchemy / superheat / curse+enfeeble).
async function handleItemCast(player, spellIndex, item, index) {
    switch (spellIndex) {
        case SPELL.ENCHANT_LVL1:
        case SPELL.ENCHANT_LVL2:
        case SPELL.ENCHANT_LVL3:
        case SPELL.ENCHANT_LVL4:
            enchantJewelry(player, spellIndex, item);
            break;

        case SPELL.ENCHANT_LVL5:
            // a dragonstone crown gets the herbalist/occult choice before the
            // tier-5 amulet mapping.
            if (!(await enchantDragonstoneJewelry(player, spellIndex, item))) {
                enchantJewelry(player, spellIndex, item);
            }
            break;

        case SPELL.LOW_ALCHEMY:
            alchemy(player, spellIndex, item, 0.4);
            break;

        case SPELL.HIGH_ALCHEMY:
            alchemy(player, spellIndex, item, 0.6);
            break;

        case SPELL.SUPERHEAT_ITEM:
            superheatItem(player, spellIndex, item);
            break;

        default:
            break;
    }
}

// gem crown -> perk crown map (the "Enchanted Crowns" system). the plain gold
// crown never enchants; the dragonstone crown is special-cased below. gated on
// enchantedCrowns.perksEnabled.
const ENCHANT_GEM_TO_CROWN = {
    sapphire: 'dew',
    emerald: 'mimicry',
    ruby: 'artisan',
    diamond: 'items'
};

// tiers 1-4: input amulet -> output amulet, plus an optional gem-crown ->
// perk-crown branch. tier 5 (dragonstone) is handled separately below.
function enchantJewelry(player, spellIndex, item) {
    const enchant = ENCHANTS[spellIndex];

    if (!enchant) {
        return;
    }

    if (
        enchant.gem !== 'dragonstone' &&
        enchantedCrowns.perksEnabled(player)
    ) {
        const crownKey = ENCHANT_GEM_TO_CROWN[enchant.gem];
        const ids = enchantedCrowns.resolveCrownIds();
        const crownInputId = ids[enchant.gem];
        const crownOutputId = ids[crownKey];

        if (
            typeof crownInputId === 'number' &&
            typeof crownOutputId === 'number' &&
            item.id === crownInputId
        ) {
            if (!checkAndRemoveRunes(player, spellIndex)) {
                return;
            }

            player.inventory.remove(crownInputId);
            player.inventory.add(crownOutputId);
            finalizeSpell(player, spellIndex, 'You succesfully enchant the crown');
            return;
        }
    }

    if (item.id !== enchant.input) {
        const crownSuffix =
            enchant.gem !== 'dragonstone' && enchantedCrowns.perksEnabled(player)
                ? ' or crowns'
                : '';

        player.message(
            `This spell can only be used on unenchanted ${enchant.gem} ` +
                `amulets${crownSuffix}`
        );
        return;
    }

    if (!checkAndRemoveRunes(player, spellIndex)) {
        return;
    }

    player.inventory.remove(enchant.input);
    player.inventory.add(enchant.output);
    finalizeSpell(player, spellIndex, 'You succesfully enchant the amulet');
}

// enchant level 5 on a dragonstone crown asks which of the two dragonstone
// crowns to make.
async function enchantDragonstoneJewelry(player, spellIndex, item) {
    const enchant = ENCHANTS[spellIndex];

    if (!enchant || enchant.gem !== 'dragonstone') {
        return false;
    }

    if (!enchantedCrowns.perksEnabled(player)) {
        return false;
    }

    const ids = enchantedCrowns.resolveCrownIds();

    if (typeof ids.dragonstone !== 'number' || item.id !== ids.dragonstone) {
        return false;
    }

    player.message('What type of dragonstone crown would you like to make?');

    const choice = await player.ask(
        ['Crown of the Herbalist', 'Crown of the Occult'],
        false
    );

    let outputId;

    if (choice === 0) {
        outputId = ids.herbalist;
    } else if (choice === 1) {
        outputId = ids.occult;
    } else {
        return true;
    }

    if (typeof outputId !== 'number') {
        return true;
    }

    if (!checkAndRemoveRunes(player, spellIndex)) {
        return true;
    }

    player.inventory.remove(ids.dragonstone);
    player.inventory.add(outputId);
    finalizeSpell(player, spellIndex, 'You succesfully enchant the crown');
    return true;
}

// alchemy: 40% / 60% of the item's default price.
function alchemy(player, spellIndex, item, rate) {
    if (item.noted) {
        player.message("You can't alch noted items");
        return;
    }

    if (item.id === ITEM.COINS) {
        player.message("That's already made of gold!");
        return;
    }

    if (!checkAndRemoveRunes(player, spellIndex)) {
        return;
    }

    // Ana in a barrel is kept (not consumed) but still refuses + gives no coins.
    if (item.id === ITEM.ANA_IN_A_BARREL) {
        player.message("@gre@Ana: Don't you start casting spells on me!");
        finalizeSpell(player, spellIndex, null); // xp, no message
        return;
    }

    const amount = item.definition.stackable ? item.amount : 1;
    const value = Math.floor(items[item.id].price * rate * amount);

    player.inventory.remove(item.id, amount);
    player.inventory.add(ITEM.COINS, value);
    finalizeSpell(player, spellIndex, 'Alchemy spell successful');
}

// smelt one ore into a bar without a furnace. iron ore with no coal makes a plain iron bar.
function superheatItem(player, spellIndex, item) {
    if (item.id === COAL_ID) {
        player.message('This spell can only be used on ore');
        return;
    }

    const smeltDef = getSmeltingDef(item.id, player);

    if (!smeltDef) {
        player.message('This spell can only be used on ore');
        return;
    }

    // must have every required secondary ore (e.g. coal for steel/mithril/...)
    for (const { id, amount = 1 } of smeltDef.ores) {
        if (id === item.id) {
            continue; // the primary ore is the cast target
        }

        if (!player.inventory.has(id, amount)) {
            // bronze needs the other half (tin/copper)
            if (item.id === TIN_ORE_ID || item.id === COPPER_ORE_ID) {
                player.message(
                    'You also need some ' +
                        `${item.id === TIN_ORE_ID ? 'copper' : 'tin'} ` +
                        'to make bronze'
                );
                return;
            }

            player.message(
                `You need ${amount} heaps of ` +
                    `${items[id].name.toLowerCase()} to smelt ` +
                    `${items[item.id].name.toLowerCase().replace('ore', '')}`
            );
            return;
        }
    }

    if (player.skills.smithing.current < smeltDef.level) {
        player.message(
            `You need to be at least level-${smeltDef.level} smithing to ` +
                `smelt ${items[smeltDef.barId].name
                    .toLowerCase()
                    .replace('bar', '')}`
        );
        return;
    }

    if (!checkAndRemoveRunes(player, spellIndex)) {
        return;
    }

    player.inventory.remove(item.id);

    for (const { id, amount = 1 } of smeltDef.ores) {
        if (id === item.id) {
            continue;
        }

        for (let i = 0; i < amount; i += 1) {
            player.inventory.remove(id);
        }
    }

    player.message(
        `You make a bar of ${items[smeltDef.barId].name
            .replace('bar', '')
            .toLowerCase()}`
    );
    player.inventory.add(smeltDef.barId);
    player.addExperience('smithing', smeltDef.experience);
    finalizeSpell(player, spellIndex, null); // no message, xp given
}

// smithing smelting-def lookup. builds an ore -> candidate bar defs index and
// picks the bar whose secondary ores the player has, preferring the recipe with
// none (iron ore -> iron bar without coal, iron ore -> steel with it).
const smeltingTable = smithing.smelting;

const COAL_ID = (() => {
    for (let i = 0; i < items.length; i += 1) {
        if (items[i].name.toLowerCase() === 'coal') {
            return i;
        }
    }
    return -1;
})();

const TIN_ORE_ID = (() => {
    for (let i = 0; i < items.length; i += 1) {
        if (items[i].name.toLowerCase() === 'tin ore') {
            return i;
        }
    }
    return -1;
})();

const COPPER_ORE_ID = (() => {
    for (let i = 0; i < items.length; i += 1) {
        if (items[i].name.toLowerCase() === 'copper ore') {
            return i;
        }
    }
    return -1;
})();

// oreId -> list of { barId, level, experience, ores } sorted so recipes needing
// fewer/zero secondaries come first.
const ORE_TO_BARS = (() => {
    const map = {};

    for (const barId of Object.keys(smeltingTable)) {
        const def = smeltingTable[barId];
        const primary = def.ores[0].id;

        if (!map[primary]) {
            map[primary] = [];
        }

        map[primary].push({
            barId: Number(barId),
            level: def.level,
            experience: def.experience,
            ores: def.ores
        });
    }

    for (const oreId of Object.keys(map)) {
        // fewer secondary ores first (iron bar before steel bar)
        map[oreId].sort((a, b) => a.ores.length - b.ores.length);
    }

    return map;
})();

function getSmeltingDef(oreId, player) {
    const candidates = ORE_TO_BARS[oreId];

    if (!candidates) {
        return null;
    }

    // pick the highest-tier recipe whose secondary ores the player has, else the simplest.
    let best = candidates[0];

    for (const candidate of candidates) {
        const canMake = candidate.ores.every(({ id, amount = 1 }) => {
            if (id === oreId) {
                return true;
            }
            return player.inventory.has(id, amount);
        });

        if (canMake && candidate.ores.length > best.ores.length) {
            best = candidate;
        }
    }

    return best;
}

// effect: telekinetic grab.
function handleTelekineticGrab(player, spellIndex, groundItem) {
    if (!checkAndRemoveRunes(player, spellIndex)) {
        return;
    }

    player.sendTeleportBubble(groundItem.x, groundItem.y, 'telegrab');

    const { world } = player;
    const { id, amount } = groundItem;

    world.removeEntity('groundItems', groundItem);
    player.inventory.add(id, amount);
    finalizeSpell(player, spellIndex, 'Spell successful');
}

// effect: charge orb.
function handleChargeOrb(player, spellIndex, gameObject) {
    const orbDef = CHARGE_ORBS[spellIndex];

    if (!orbDef) {
        return;
    }

    if (gameObject.id !== orbDef.object) {
        player.message(
            `This spell can only be used on ${orbDef.element} obelisks`
        );
        return;
    }

    if (!checkAndRemoveRunes(player, spellIndex)) {
        return;
    }

    player.inventory.add(orbDef.orb);
    player.sendSound('spellok');
    player.message('You succesfully charge the orb');
    player.addExperience('magic', EXPERIENCE[spellIndex]);

    // stamp the cast throttle so charge-orb isn't a free rapid-cast loophole.
    setCastTimer(player);
}

// effect: combat / curse casts on a mob.

// skill display names for the "already weakened" message (British "defence").
const CURSE_SKILL_NAMES = {
    attack: 'attack',
    strength: 'strength',
    defense: 'defence'
};

// apply a curse stat-drain. true if applied (runes consumed).
function applyCurse(player, spellIndex, target) {
    const curse = CURSE_SPELLS[spellIndex];
    const skill = target.skills[curse.skill];

    // refuse if the stat is already below its max.
    if (skill.current < skill.base) {
        player.message(
            `Your opponent already has weakened ${
                CURSE_SKILL_NAMES[curse.skill]
            }`
        );
        return false;
    }

    if (!checkAndRemoveRunes(player, spellIndex)) {
        return false;
    }

    const lowerBy = Math.ceil(skill.current * curse.factor);
    skill.current -= lowerBy;

    if (target.username) {
        target.message(curse.message);
        target.sendStats();
    }

    return true;
}

// deal a single magic hit and, for npcs, start combat.
function magicHit(player, target, damage, spellIndex, giveExp = true) {
    player.faceDirection(-1, 1);

    player._lastCombatType = 'magic'; // xp is paid per cast, not on kill
    target.damage(damage, player);
    player.sendProjectile(target, MAGIC_PROJECTILE);

    finalizeSpell(player, spellIndex, '', giveExp);

    // npc fights back: a magic attack starts melee combat.
    if (
        target.constructor.name === 'NPC' &&
        target.skills.hits.current > 0 &&
        !target.locked &&
        target.chasing !== player &&
        !target.opponent
    ) {
        target
            .attack(player)
            .then(() => {
                target.retreatTicks = 4;
            })
            .catch(() => {});
    }
}

// mob-cast dispatch. target is a resolved Player or NPC in range with line of sight.
function handleMobCast(player, spellIndex, target) {
    const isNPC = target.constructor.name === 'NPC';

    // curse family
    if (CURSE_SPELLS[spellIndex]) {
        applyCurse(player, spellIndex, target);
        return;
    }

    // crumble undead
    if (spellIndex === SPELL.CRUMBLE_UNDEAD) {
        if (!isNPC) {
            player.message('You can not use this spell on a Player');
            return;
        }

        const name = target.definition.name.toLowerCase();
        const isTarget = CRUMBLE_TARGETS.some((frag) => name.indexOf(frag) > -1);

        if (!isTarget) {
            player.message(
                'This spell can only be used on skeletons, zombies and ghosts'
            );
            return;
        }

        if (!checkAndRemoveRunes(player, spellIndex)) {
            return;
        }

        magicHit(
            player,
            target,
            calculateMagicDamage(CRUMBLE_UNDEAD_MAX),
            spellIndex
        );
        return;
    }

    // iban blast
    if (spellIndex === SPELL.IBAN_BLAST) {
        if (!player.inventory.isEquipped(ITEM.STAFF_OF_IBAN)) {
            player.message('you need the staff of iban to cast this spell');
            return;
        }

        if (!checkAndRemoveRunes(player, spellIndex)) {
            return;
        }

        magicHit(player, target, calculateIbanSpellDamage(), spellIndex);
        return;
    }

    // god spells
    if (GOD_SPELLS[spellIndex]) {
        const god = GOD_SPELLS[spellIndex];

        if (!player.inventory.isEquipped(god.staff)) {
            player.message(
                `you must weild the staff of ${god.staffName} to cast this spell`
            );
            return;
        }

        // outside the arena, gated on this spell being learned (>= 100 casts inside).
        if (!checkGodSpellLearnGate(player, spellIndex)) {
            return;
        }

        // 25 max when charged and wearing a god cape, else 18.
        if (!checkAndRemoveRunes(player, spellIndex)) {
            return;
        }

        // in the arena every cast bumps the learn counter.
        trackGodSpellLearnProgress(player, spellIndex);

        // with no scenery on the target's tile, drop the god's mark and drain the stat.
        if (!player.world.gameObjects.getAtPoint(target.x, target.y).length) {
            godSpellObject(player, target, spellIndex);
        }

        magicHit(
            player,
            target,
            calculateGodSpellDamage(hasGodSpellChargeBenefit(player)),
            spellIndex
        );
        return;
    }

    // regular missile spells (strike/bolt/blast/wave)
    let max = COMBAT_MAX_HIT[spellIndex];

    if (typeof max === 'undefined') {
        // not an offensive missile spell; abort.
        return;
    }

    // chaos-enchanted gauntlets of chaos add +1 max hit to bolt spells.
    if (BOLT_SPELLS.has(spellIndex) && hasChaosGauntletBonus(player)) {
        max += 1;
    }

    if (!checkAndRemoveRunes(player, spellIndex)) {
        return;
    }

    magicHit(player, target, calculateMagicDamage(max), spellIndex);
}

// packet entry points (one per cast opcode)

// shared preamble for every cast: guards, sanity and success check. returns the
// spellIndex, or null to abort.
function beginCast(player, spellIndex, opcode) {
    if (player.locked) {
        return null;
    }

    // cast throttle, checked before the sanity checks; also enforces the post-fail lockout.
    if (!castTimer(player)) {
        player.message(
            `You need to wait ${getSpellWait(player)} seconds before you ` +
                'can cast another spell'
        );
        return null;
    }

    if (!spellSanityChecks(player, spellIndex, opcode)) {
        return null;
    }

    if (!spellSuccessCheck(player, spellIndex)) {
        return null;
    }

    return spellIndex;
}

// castSelf: teleports, boosts, bones-to-bananas, charge.
async function castSelf({ player }, { id }) {
    if (beginCast(player, id, 'castSelf') === null) {
        return;
    }

    const type = SPELL_TYPE[id];

    if (type === 0 && !isBoostSpell(id)) {
        handleTeleport(player, id);
        return;
    }

    // type 6 (bones to bananas / charge) is a "ground" self cast
    handleGroundCast(player, id);
}

// castGround / castLand: bones-to-bananas et al. cast on the ground.
async function castGround({ player }, { id }) {
    if (beginCast(player, id, 'castGround') === null) {
        return;
    }

    handleGroundCast(player, id);
}

// castObject: charge orb on an obelisk.
async function castObject({ player }, { x, y, id }) {
    if (beginCast(player, id, 'castObject') === null) {
        return;
    }

    const { world } = player;
    const [gameObject] = world.gameObjects.getAtPoint(x, y);

    if (!gameObject) {
        return;
    }

    // a registered onSpellObject hook suppresses the default charge-orb effect.
    if (await world.callPlugin('onSpellObject', player, gameObject, id)) {
        return;
    }

    handleChargeOrb(player, id, gameObject);
}

// castWallObject: no wall-object spells exist in RSC.
async function castWallObject({ player }) {
    if (player.locked) {
        return;
    }

    player.message('@or1@This type of spell is not yet implemented.');
}

// castInventoryItem: enchant / alchemy / superheat.
async function castInventoryItem({ player }, { index, id }) {
    if (beginCast(player, id, 'castInventoryItem') === null) {
        return;
    }

    // casting on your own items is blocked while a trade window is open.
    if (player.interfaceOpen.trade) {
        return;
    }

    if (SPELL_TYPE[id] !== 3) {
        return;
    }

    const item = player.inventory.items[index];

    if (!item) {
        return;
    }

    // a noted item takes no spell.
    if (item.noted) {
        player.message('Nothing interesting happens');
        return;
    }

    // a registered onSpellInventoryItem hook suppresses the default
    // enchant/alchemy/superheat effect.
    if (
        await player.world.callPlugin(
            'onSpellInventoryItem',
            player,
            index,
            item.id,
            id
        )
    ) {
        return;
    }

    await handleItemCast(player, id, item, index);
}

// castGroundItem: telekinetic grab.
async function castGroundItem({ player }, { x, y, id, itemID }) {
    if (beginCast(player, id, 'castGroundItem') === null) {
        return;
    }

    if (id !== SPELL.TELEKINETIC_GRAB) {
        return;
    }

    const { world } = player;
    const groundItems = world.groundItems.getAtPoint(x, y);

    let groundItem = null;

    for (const candidate of groundItems) {
        if (candidate.id === itemID) {
            groundItem = candidate;
            break;
        }
    }

    if (!groundItem) {
        return;
    }

    if (!player.withinLineOfSight(groundItem, true)) {
        player.message('I can not see the object from here');
        return;
    }

    handleTelekineticGrab(player, id, groundItem);
}

// inline npc special-cases then the onSpellNPC dispatch. true suppresses the
// default combat cast.
//   1. Delrith: blocked with a message.
//   2. Lucien (forest fight): blocked unless the Pendant of Armadyl is worn.
//   3. Chronozon: a "blast" cast records the element on the player (does not block).
//   4. onSpellNPC dispatch: first truthy return suppresses the cast.
async function checkCastOnNpc(player, npc, id) {
    // --- Delrith (Demon Slayer) ---
    if (npc.id === DELRITH_ID) {
        player.message(
            'Delrith can not be attacked without the Silverlight sword'
        );
        return true;
    }

    // Lucien fought north of Varrock (Temple of Ikov)
    if (npc.id === LUCIEN_EDGE_ID) {
        const stage = player.questStages.templeOfIkov;

        if (stage === -1 || stage === -2) {
            player.message('You have already completed this quest');
            return true;
        }

        if (!player.inventory.isEquipped(PENDANT_OF_ARMADYL_ID)) {
            player.engage(npc);
            await npc.say(
                "I'm sure you don't want to attack me really",
                'I am your friend'
            );
            player.message(
                "You decide you don't want to attack Lucien really"
            );
            await player.world.sleepTicks(3);
            player.message('He is your friend');
            await player.world.sleepTicks(3);
            player.disengage();
            return true;
        }
    }

    // Chronozon weakening (Family Crest): a "blast" spell weakens Chronozon and
    // records the element on the player, consumed by family-crest onNPCDeath.
    if (npc.id === CHRONOZON_ID) {
        const spellName = spells[id].name;

        if (spellName.toLowerCase().indexOf('blast') > -1) {
            const elementalType = spellName.split(' ')[0].toLowerCase();

            player.message('chronozon weakens');

            if (!player.chronozonWeakened) {
                player.chronozonWeakened = {};
            }

            if (!player.chronozonWeakened[elementalType]) {
                player.chronozonWeakened[elementalType] = true;
            }
        }
    }

    // onSpellNPC plugin dispatch.
    return !!(await player.world.callPlugin('onSpellNPC', player, npc, id));
}

// castNPC: combat / curse spells on an NPC.
async function castNPC({ player }, { index, id }) {
    if (beginCast(player, id, 'castNPC') === null) {
        return;
    }

    // only combat/curse (type 2) spells target a mob
    if (SPELL_TYPE[id] !== 2) {
        return;
    }

    const { world } = player;
    const npc = world.npcs.getByIndex(index);

    if (!npc || npc.skills.hits.current <= 0) {
        return;
    }

    // inline special-cases or a registered trigger can suppress the default cast.
    if (await checkCastOnNpc(player, npc, id)) {
        return;
    }

    if (!npc.definition.hostility) {
        player.message("I can't attack that");
        return;
    }

    // walk into range + require a clear projectile line of sight
    if (!player.withinRange(npc, SPELL_RANGE_DISTANCE, true)) {
        await player.chase(npc, 8);
    }

    if (!player.withinLineOfSight(npc, true)) {
        player.message("I can't get a clear shot from here");
        return;
    }

    handleMobCast(player, id, npc);
}

// castPlayer: combat / curse spells on another player (PvP).
async function castPlayer({ player }, { index, id }) {
    if (beginCast(player, id, 'castPlayer') === null) {
        return;
    }

    if (SPELL_TYPE[id] !== 2) {
        return;
    }

    const { world } = player;
    const target = world.players.getByIndex(index);

    if (!target || target === player || target.skills.hits.current <= 0) {
        return;
    }

    // duel rule 1 (magic) blocks PvP casts on your duel opponent.
    if (player.duel.isDuelActive() && player.duel.getDuelSetting(1)) {
        player.message('Magic cannot be used during this duel!');
        return;
    }

    // a registered onSpellPlayer hook suppresses the default PvP cast.
    if (await world.callPlugin('onSpellPlayer', player, target, id)) {
        return;
    }

    if (!player.withinLineOfSight(target, true)) {
        player.message("I can't get a clear shot from here");
        return;
    }

    handleMobCast(player, id, target);
}

module.exports = {
    castSelf,
    castGround,
    castObject,
    castWallObject,
    castInventoryItem,
    castGroundItem,
    castNPC,
    castPlayer,
    // exposed so plugin hooks can consume runes.
    checkAndRemoveRunes,
    // exposed for the gauntlets-of-chaos verification harness only
    _internal: {
        BOLT_SPELLS,
        hasChaosGauntletBonus,
        GAUNTLETS_OF_CHAOS_ID,
        FAMCREST_GAUNTLETS_CHAOS
    }
};
