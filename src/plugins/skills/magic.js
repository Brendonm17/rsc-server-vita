// magic spell data tables and pure helper functions

const spells = require('@2003scape/rsc-data/config/spells');


const ITEM = {
    COINS: 10,
    BONES: 20,
    BANANA: 249,
    KARAMJA_RUM: 318,
    PLAGUE_SAMPLE: 812,
    ANA_IN_A_BARREL: 1039,

    FIRE_RUNE: 31,
    WATER_RUNE: 32,
    AIR_RUNE: 33,
    EARTH_RUNE: 34,

    // charge orbs
    UNPOWERED_ORB: 611,
    AIR_ORB: 626,
    WATER_ORB: 613,
    EARTH_ORB: 627,
    FIRE_ORB: 612,

    // god-spell staffs
    STAFF_OF_GUTHIX: 1217,
    STAFF_OF_SARADOMIN: 1218,
    STAFF_OF_ZAMORAK: 1216,
    STAFF_OF_IBAN: 1000,

    // god capes checked for the charge damage bonus
    ZAMORAK_CAPE: 1213,
    SARADOMIN_CAPE: 1214,
    GUTHIX_CAPE: 1215
};

// the three god capes that unlock the 25-max god-spell hit while charged
const GOD_CAPES = [ITEM.ZAMORAK_CAPE, ITEM.SARADOMIN_CAPE, ITEM.GUTHIX_CAPE];

// staff tiers that substitute for each elemental rune when wielded
const STAFF_SUBSTITUTES = {
    [ITEM.FIRE_RUNE]: [197, 615, 682],
    [ITEM.WATER_RUNE]: [102, 616, 683], // ... of water
    [ITEM.AIR_RUNE]: [101, 617, 684], // ... of air
    [ITEM.EARTH_RUNE]: [103, 618, 685] //  ... of earth
};


// xp is the raw spell def value; skill xp is stored in internal x4 form
const EXPERIENCE = [
    88, 104, 120, 136, 152, 168, 184, 200, 216, 232, 248, 264, 280, 296, 312,
    328, 344, 360, 376, 392, 408, 424, 440, 456, 472, 480, 488, 504, 520, 528,
    536, 544, 552, 560, 560, 560, 560, 576, 584, 600, 608, 608, 624, 640, 664,
    680, 720, 720
];

// spell type: 0 teleport/boost, 2 combat/curse/god, 3 enchant/alchemy, 5 charge orb, 6 transmute
const SPELL_TYPE = [
    2, 2, 2, 3, 2, 2, 2, 6, 2, 2, 3, 2, 0, 3, 2, 0, 3, 2, 0, 2, 2, 3, 0, 2, 3,
    2, 0, 2, 3, 5, 3, 0, 2, 2, 2, 2, 5, 2, 5, 2, 5, 2, 3, 2, 2, 2, 2, 6
];

// SpellDef.xml <members>
const MEMBERS = [
    false, false, false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false, false, false,
    false, false, true, false, false, true, true, false, false, true, false,
    true, false, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true
];

// maps spell name to its index in the level-ordered spells table
const NAME_TO_INDEX = {};
for (let i = 0; i < spells.length; i += 1) {
    NAME_TO_INDEX[spells[i].name.toLowerCase()] = i;
}

// symbolic indices used by the dispatcher
const SPELL = {
    WIND_STRIKE: 0,
    CONFUSE: 1,
    WATER_STRIKE: 2,
    ENCHANT_LVL1: 3,
    EARTH_STRIKE: 4,
    WEAKEN: 5,
    FIRE_STRIKE: 6,
    BONES_TO_BANANAS: 7,
    WIND_BOLT: 8,
    CURSE: 9,
    LOW_ALCHEMY: 10,
    WATER_BOLT: 11,
    VARROCK_TELEPORT: 12,
    ENCHANT_LVL2: 13,
    EARTH_BOLT: 14,
    LUMBRIDGE_TELEPORT: 15,
    TELEKINETIC_GRAB: 16,
    FIRE_BOLT: 17,
    FALADOR_TELEPORT: 18,
    CRUMBLE_UNDEAD: 19,
    WIND_BLAST: 20,
    SUPERHEAT_ITEM: 21,
    CAMELOT_TELEPORT: 22,
    WATER_BLAST: 23,
    ENCHANT_LVL3: 24,
    IBAN_BLAST: 25,
    ARDOUGNE_TELEPORT: 26,
    EARTH_BLAST: 27,
    HIGH_ALCHEMY: 28,
    CHARGE_WATER_ORB: 29,
    ENCHANT_LVL4: 30,
    WATCHTOWER_TELEPORT: 31,
    FIRE_BLAST: 32,
    CLAWS_OF_GUTHIX: 33,
    SARADOMIN_STRIKE: 34,
    FLAMES_OF_ZAMORAK: 35,
    CHARGE_EARTH_ORB: 36,
    WIND_WAVE: 37,
    CHARGE_FIRE_ORB: 38,
    WATER_WAVE: 39,
    CHARGE_AIR_ORB: 40,
    VULNERABILITY: 41,
    ENCHANT_LVL5: 42,
    EARTH_WAVE: 43,
    ENFEEBLE: 44,
    FIRE_WAVE: 45,
    STUN: 46,
    CHARGE: 47
};

// max hit per spell; player and npc share the same table
const COMBAT_MAX_HIT = {
    [SPELL.WIND_STRIKE]: 1,
    [SPELL.WATER_STRIKE]: 2,
    [SPELL.EARTH_STRIKE]: 3,
    [SPELL.FIRE_STRIKE]: 4,
    [SPELL.WIND_BOLT]: 4.5,
    [SPELL.WATER_BOLT]: 5,
    [SPELL.EARTH_BOLT]: 5.5,
    [SPELL.FIRE_BOLT]: 6,
    [SPELL.WIND_BLAST]: 6.5,
    [SPELL.WATER_BLAST]: 7,
    [SPELL.EARTH_BLAST]: 7.5,
    [SPELL.FIRE_BLAST]: 8,
    [SPELL.WIND_WAVE]: 8.5,
    [SPELL.WATER_WAVE]: 9,
    [SPELL.EARTH_WAVE]: 9.5,
    [SPELL.FIRE_WAVE]: 10
};

// Constants.CRUMBLE_UNDEAD_MAX
const CRUMBLE_UNDEAD_MAX = 8;

// cast throttle: 1900ms between casts by default
const MILLISECONDS_BETWEEN_CASTS = 1900;

// rapid_cast_spells off: full throttle gap enforced
const RAPID_CAST_SPELLS = false;

// a failed cast pushes the throttle 20s into the future
const SPELL_FAIL_LOCKOUT = 20000;

// charge spell lasts 6 minutes
const CHARGE_DURATION = 6 * 60000;

// wilderness level formula from y coordinate and plane height
function wildernessLevel(x, y, planeElevation) {
    const height = Math.floor(y / planeElevation);
    let wild = 2203 - (y + (1776 - 944 * height));

    if (x + 2304 >= 2640) {
        wild = -50;
    }

    if (wild > 0) {
        return 1 + Math.floor(wild / 6);
    }

    return 0;
}

// CombatFormula.calculateMagicDamage: uniform 0..floor(spellPower).
function calculateMagicDamage(spellPower) {
    return Math.floor(Math.random() * (Math.floor(spellPower) + 1));
}

// iban blast max hit 15
function calculateIbanSpellDamage() {
    return calculateMagicDamage(15);
}

// god spell max hit 18, or 25 when charged and wearing a god cape
function calculateGodSpellDamage(charged = false) {
    return calculateMagicDamage(charged ? 25 : 18);
}

// cast success roll from magic level and equipment bonus
function rollCastSuccess(reqLevel, magicLevel, magicEquip) {
    const levelDiff = magicLevel - reqLevel;

    if (magicEquip >= 30 && levelDiff >= 5) {
        return true;
    }
    if (magicEquip >= 25 && levelDiff >= 6) {
        return true;
    }
    if (magicEquip >= 20 && levelDiff >= 7) {
        return true;
    }
    if (magicEquip >= 15 && levelDiff >= 8) {
        return true;
    }
    if (magicEquip >= 10 && levelDiff >= 9) {
        return true;
    }
    if (levelDiff < 0) {
        return false;
    }
    if (levelDiff >= 10) {
        return true;
    }

    // inclusive random roll: 0 to (levelDiff+2)*2
    const max = (levelDiff + 2) * 2;
    return Math.floor(Math.random() * (max + 1)) !== 0;
}

const TELEPORTS = {
    [SPELL.VARROCK_TELEPORT]: { x: 120, y: 504 },
    [SPELL.LUMBRIDGE_TELEPORT]: { x: 120, y: 648 },
    [SPELL.FALADOR_TELEPORT]: { x: 312, y: 552 },
    [SPELL.CAMELOT_TELEPORT]: { x: 456, y: 456 },
    [SPELL.ARDOUGNE_TELEPORT]: { x: 588, y: 621 },
    [SPELL.WATCHTOWER_TELEPORT]: { x: 493, y: 3525 }
};

// curse spell index maps to skill and drain factor of the target's current level
const CURSE_SPELLS = {
    [SPELL.CONFUSE]: {
        skill: 'attack',
        factor: 0.05,
        message: 'Your attack has been reduced by a confuse spell!'
    },
    [SPELL.WEAKEN]: {
        skill: 'strength',
        factor: 0.05,
        message: 'Your strength has been reduced by a weaken spell!'
    },
    [SPELL.CURSE]: {
        skill: 'defense',
        factor: 0.05,
        message: 'Your defense has been reduced by a curse spell!'
    },
    [SPELL.VULNERABILITY]: {
        skill: 'defense',
        factor: 0.1,
        message: 'Your defense has been reduced by a vulnerability spell!'
    },
    [SPELL.ENFEEBLE]: {
        skill: 'strength',
        factor: 0.1,
        message: 'Your strength has been reduced by an enfeeble spell!'
    },
    [SPELL.STUN]: {
        skill: 'attack',
        factor: 0.1,
        message: 'Your attack has been reduced by a stun spell!'
    }
};

// enchant input is the strung, wearable amulet, not the unstrung duplicate
const ENCHANTS = {
    [SPELL.ENCHANT_LVL1]: { input: 302, output: 314, gem: 'sapphire' },
    [SPELL.ENCHANT_LVL2]: { input: 303, output: 315, gem: 'emerald' },
    [SPELL.ENCHANT_LVL3]: { input: 304, output: 316, gem: 'ruby' },
    [SPELL.ENCHANT_LVL4]: { input: 305, output: 317, gem: 'diamond' },
    [SPELL.ENCHANT_LVL5]: { input: 610, output: 522, gem: 'dragonstone' }
};

const CHARGE_ORBS = {
    [SPELL.CHARGE_AIR_ORB]: { object: 303, orb: ITEM.AIR_ORB, element: 'air' },
    [SPELL.CHARGE_WATER_ORB]: {
        object: 300,
        orb: ITEM.WATER_ORB,
        element: 'water'
    },
    [SPELL.CHARGE_EARTH_ORB]: {
        object: 304,
        orb: ITEM.EARTH_ORB,
        element: 'earth'
    },
    [SPELL.CHARGE_FIRE_ORB]: { object: 301, orb: ITEM.FIRE_ORB, element: 'fire' }
};

const GOD_SPELLS = {
    [SPELL.CLAWS_OF_GUTHIX]: {
        staff: ITEM.STAFF_OF_GUTHIX,
        staffName: 'guthix'
    },
    [SPELL.SARADOMIN_STRIKE]: {
        staff: ITEM.STAFF_OF_SARADOMIN,
        staffName: 'saradomin'
    },
    [SPELL.FLAMES_OF_ZAMORAK]: {
        staff: ITEM.STAFF_OF_ZAMORAK,
        staffName: 'zamorak'
    }
};

module.exports = {
    ITEM,
    SPELL,
    STAFF_SUBSTITUTES,
    GOD_CAPES,
    EXPERIENCE,
    SPELL_TYPE,
    MEMBERS,
    NAME_TO_INDEX,
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
};
