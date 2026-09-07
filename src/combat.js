const {
    ammunition,
    weapons: rangedWeapons
} = require('@2003scape/rsc-data/ranged');

const skillCapes = require('./plugins/skills/skill-capes');

// adds thrown-weapon rows to the shared rangedWeapons / ammunition tables
require('./plugins/combat/thrown-weapons');

// { prayerIndex: { skill: 'skill', multiplier: 1.05 }, ... }
const PRAYER_BONUSES = {
    // thick skin
    0: { skill: 'defense', multiplier: 1.05 },
    // burst of strength
    1: { skill: 'strength', multiplier: 1.05 },
    // clarity of thought
    2: { skill: 'attack', multiplier: 1.05 },
    // rock skin
    3: { skill: 'defense', multiplier: 1.1 },
    // superhuman strength
    4: { skill: 'strength', multiplier: 1.1 },
    // improved reflexes
    5: { skill: 'attack', multiplier: 1.1 },
    // steel skin
    9: { skill: 'defense', multiplier: 1.15 },
    // ultimate strength
    10: { skill: 'strength', multiplier: 1.15 },
    // incredible reflexes
    11: { skill: 'attack', multiplier: 1.15 }
};

const STYLE_BONUSES = { strength: 1, attack: 2, defense: 3 };

// npcs never carry a username
function isPlayerMob(mob) {
    return !!mob.username;
}

// every level term gets +8 for a player, +0 for an npc
function bonusConstant(mob) {
    return isPlayerMob(mob) ? 8 : 0;
}

// npcs get no style bonus; controlled gives +1 to every stat, matching style +3
function getStyleBonus(mob, skill) {
    if (!isPlayerMob(mob)) {
        return 0;
    }

    const style = mob.combatStyle;

    if (style === 0) {
        return 1;
    }

    return STYLE_BONUSES[skill] === style ? 3 : 0;
}

// 1.0 default, else the highest active tier (1.05/1.1/1.15) of the stat's prayers
function getPrayerBonuses(player) {
    const bonuses = { defense: 1, strength: 1, attack: 1 };

    for (const [index, enabled] of player.prayers.entries()) {
        if (enabled) {
            const prayer = PRAYER_BONUSES[index];

            if (!prayer) {
                break;
            }

            bonuses[prayer.skill] = prayer.multiplier;
        }
    }

    return bonuses;
}

function prayerMultiplier(mob, skill) {
    return isPlayerMob(mob) ? getPrayerBonuses(mob)[skill] : 1;
}

// melee accuracy
function getMeleeAccuracy(attacker) {
    const styleBonus = getStyleBonus(attacker, 'attack');
    const prayerBonus = prayerMultiplier(attacker, 'attack');
    const level = attacker.skills.attack.current;
    const weaponAim = isPlayerMob(attacker)
        ? Math.max(attacker.equipmentBonuses.weaponAim, 1)
        : 0;

    return (
        (Math.floor(level * prayerBonus) + bonusConstant(attacker) + styleBonus) *
        (weaponAim + 64)
    );
}

// melee defence
function getMeleeDefence(defender) {
    const styleBonus = getStyleBonus(defender, 'defense');
    const prayerBonus = prayerMultiplier(defender, 'defense');
    const level = defender.skills.defense.current;
    const armour = isPlayerMob(defender)
        ? Math.max(defender.equipmentBonuses.armour, 1)
        : 0;

    return (
        (Math.floor(level * prayerBonus) + bonusConstant(defender) + styleBonus) *
        (armour + 64)
    );
}

// exclusive upper bound of the damage roll, not a max hit
function getMeleeDamagePool(attacker) {
    const styleBonus = getStyleBonus(attacker, 'strength');
    const prayerBonus = prayerMultiplier(attacker, 'strength');
    const level = attacker.skills.strength.current;
    const weaponPower = isPlayerMob(attacker)
        ? Math.max(attacker.equipmentBonuses.weaponPower, 1)
        : 0;

    return (
        (Math.floor(level * prayerBonus) + bonusConstant(attacker) + styleBonus) *
        (weaponPower + 64)
    );
}

// roll whether a hit lands, from accuracy vs defence
function rollAccuracy(accuracy, defence) {
    let hitChance;

    if (accuracy > defence) {
        hitChance = 1 - (defence + 2) / (2 * (accuracy + 1));
    } else {
        hitChance = accuracy / (2 * (defence + 1));
    }

    return Math.random() <= hitChance;
}

// single uniform roll over the damage pool
function rollDamagePool(pool) {
    if (pool <= 0) {
        return 0;
    }

    return Math.floor((Math.floor(Math.random() * pool) + 320) / 640);
}

// accuracy and damage are independent rolls; a miss still rolls and discards
// damage, so an attack-cape miss->hit reroll keeps the original damage
function meleeDamage(attacker, defender) {
    const accuracy = getMeleeAccuracy(attacker);
    const defence = getMeleeDefence(defender);
    const pool = getMeleeDamagePool(attacker);

    let isHit = rollAccuracy(accuracy, defence);
    const wasHit = isHit;
    let damage = rollDamagePool(pool);

    // defense cape (35%, defender only): halve on the original hit, before any
    // attack-cape reroll
    if (
        isHit &&
        isPlayerMob(defender) &&
        damage > 0 &&
        skillCapes.shouldActivate(defender, 'defense')
    ) {
        damage = Math.floor(damage / 2);
    }

    if (isPlayerMob(attacker)) {
        // attack cape (35%, only on a miss): re-roll accuracy only
        while (skillCapes.shouldActivateParam(attacker, 'attack', isHit)) {
            isHit = rollAccuracy(accuracy, defence);
        }

        if (!wasHit && isHit) {
            attacker.message('@red@Your Attack cape has prevented a zero hit');
        }

        // strength cape (35%): crit when damage is at least half the theoretical
        // max. maximum is the pre-truncation double (pool + 320) / 640
        const maximum = (pool + 320) / 640;

        if (
            damage >= maximum * 0.5 &&
            skillCapes.shouldActivateParam(attacker, 'strength', isHit)
        ) {
            damage = Math.floor(damage + maximum * 0.2);
            attacker.message(
                '@ora@Your Strength cape has granted you a critical hit'
            );
        }
    }

    return isHit ? damage : 0;
}

// ranged accuracy depends on the weapon's aim, not the ammunition
function getRangedAccuracy(attacker) {
    const rangedWeapon = attacker.inventory.getRangedWeapon();

    if (!rangedWeapon) {
        return 0;
    }

    const aim = rangedWeapons[rangedWeapon.id].accuracy;
    const level = attacker.skills.ranged.current;

    return (level + bonusConstant(attacker)) * (aim + 1 + 64);
}

// ranged damage pool depends on the ammunition's power, not the bow
function getRangedDamagePool(attacker) {
    const ammoID = attacker.inventory.getAmmunitionID();
    const power = ammunition[ammoID] || 0;
    const level = attacker.skills.ranged.current;

    return (level + bonusConstant(attacker)) * (power + 1 + 64);
}

// ranged accuracy is checked against the victim's melee defence (no separate
// ranged-defence stat); the ranged cape 10% doubles the roll only on a hit
function rangedDamage(attacker, defender) {
    const capeActive = skillCapes.shouldActivate(attacker, 'ranged');

    if (capeActive) {
        attacker.message(
            '@gre@Your Ranged cape activates, letting you shoot two arrows ' +
                'at once!'
        );
    }

    const accuracy = getRangedAccuracy(attacker);
    const defence = getMeleeDefence(defender);
    const pool = getRangedDamagePool(attacker);

    if (!rollAccuracy(accuracy, defence)) {
        return 0;
    }

    if (capeActive) {
        const maxHit = Math.floor((pool + 320) / 640);

        return Math.floor(Math.random() * (maxHit * 2));
    }

    return rollDamagePool(pool);
}

function rollPlayerNPCDamage(player, npc) {
    return meleeDamage(player, npc);
}

function rollPlayerPlayerDamage(player, targetPlayer) {
    return meleeDamage(player, targetPlayer);
}

function rollNPCDamage(npc, player) {
    return meleeDamage(npc, player);
}

function rollPlayerNPCRangedDamage(player, npc) {
    return rangedDamage(player, npc);
}

// per-hit ranged xp during a fight; target.hits.current (before this hit) caps
// the damage used, since xp is rolled before the damage is applied
function rangedHitExperience(target, damageMade) {
    const constrainedDamage = Math.min(target.skills.hits.current, damageMade);
    const totalXP = 16 * constrainedDamage;
    const baseXP = Math.floor(totalXP / 3);
    const remainder = totalXP % 12;

    if (remainder === 0) {
        return baseXP;
    }

    // random(0, 2) is inclusive of both ends (3 values)
    const roll = Math.floor(Math.random() * 3);

    if (remainder <= 6) {
        return baseXP + (roll === 0 ? 1 : 0);
    }

    return baseXP + (roll === 0 ? 0 : 1);
}

// exp is the base unit; each flagged skill gets exp*weight (1 or 3), weights
// sum to 4 so the total handed out is 4*exp. used for npc and pvp kills
function awardStyleExperience(victor, exp) {
    if (!victor || exp <= 0) {
        return;
    }

    victor.addExperience('hits', exp);

    switch (victor.combatStyle) {
        case 0: // controlled
            victor.addExperience('attack', exp);
            victor.addExperience('defense', exp);
            victor.addExperience('strength', exp);
            break;
        case 1: // aggressive
            victor.addExperience('strength', exp * 3);
            break;
        case 2: // accurate
            victor.addExperience('attack', exp * 3);
            break;
        case 3: // defensive
            victor.addExperience('defense', exp * 3);
            break;
    }
}

module.exports = {
    rollPlayerNPCDamage,
    rollPlayerPlayerDamage,
    rollNPCDamage,
    rollPlayerNPCRangedDamage,
    rangedHitExperience,
    awardStyleExperience
};
