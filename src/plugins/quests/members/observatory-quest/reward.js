// observatory quest rewards: 2 quest points, 100/400 crafting xp, plus an optional skill reward

const {
    LAW_RUNE_ID,
    BLACK_2_HANDED_SWORD_ID,
    TUNA_ID,
    FULL_SUPER_STRENGTH_POTION_ID,
    WATER_RUNE_ID,
    WEAPON_POISON_ID,
    MAPLE_LONGBOW_ID,
    EMERALD_AMULET_OF_PROTECTION_ID,
    UNCUT_SAPPHIRE_ID
} = require('./ids.js');

// optional reward: maxstat * 100 + 500 xp to the target skill
function giveOptionalReward(player, skill) {
    player.addExperience(skill, player.skills[skill].base * 100 + 500, false);
}

// grants 2 quest points and crafting xp, clears the keep-key gate cache key
function handleReward(player) {
    player.addQuestPoints(2);
    player.message('@gre@You haved gained 2 quest points!');
    player.addExperience(
        'crafting',
        player.skills.crafting.base * 400 + 1000,
        false
    );

    if (player.cache.keep_key_gate !== undefined) {
        delete player.cache.keep_key_gate;
    }
}

// announces the constellation and grants its reward, plus one uncut sapphire
async function constellationNameAndReward(player, npc, selectedNumber) {
    if (selectedNumber === 0) {
        await npc.say(
            'Virgo the virtuous',
            'The strong and peaceful nature of virgo boosts your defence'
        );
        giveOptionalReward(player, 'defense');
    } else if (selectedNumber === 1) {
        await npc.say(
            'Libra the scales',
            'The scales of justice award you with Law Runes'
        );
        player.inventory.add(LAW_RUNE_ID, 3);
    } else if (selectedNumber === 2) {
        await npc.say(
            'Gemini the twins',
            'The double nature of Gemini awards you a two-handed weapon'
        );
        player.inventory.add(BLACK_2_HANDED_SWORD_ID, 1);
    } else if (selectedNumber === 3) {
        await npc.say('Pisces the fish', 'The gods rain food from the sea on you');
        player.inventory.add(TUNA_ID, 3);
    } else if (selectedNumber === 4) {
        await npc.say(
            'Taurus the bull',
            'You are given the strength of a bull'
        );
        player.inventory.add(FULL_SUPER_STRENGTH_POTION_ID, 1);
    } else if (selectedNumber === 5) {
        await npc.say(
            'Aquarius the water-bearer',
            'the Gods of water award you with water runes'
        );
        player.inventory.add(WATER_RUNE_ID, 25);
    } else if (selectedNumber === 6) {
        await npc.say(
            'Scorpio the scorpion',
            "The scorpion gives you poison from it's sting"
        );
        player.inventory.add(WEAPON_POISON_ID, 1);
    } else if (selectedNumber === 7) {
        await npc.say(
            'Aries the ram',
            "The ram's strength improves your attack abilites"
        );
        giveOptionalReward(player, 'attack');
    } else if (selectedNumber === 8) {
        await npc.say(
            'Sagittarius the Centaur',
            'The Gods award you a maple longbow'
        );
        player.inventory.add(MAPLE_LONGBOW_ID, 1);
    } else if (selectedNumber === 9) {
        await npc.say(
            'Leo the lion',
            'The power of the lion has increased your hitpoints'
        );
        giveOptionalReward(player, 'hits');
    } else if (selectedNumber === 10) {
        await npc.say(
            'Capricorn the goat',
            'you are granted an increase in strength'
        );
        giveOptionalReward(player, 'strength');
    } else if (selectedNumber === 11) {
        await npc.say(
            'Cancer the crab',
            'The armoured crab gives you an amulet of protection'
        );
        player.inventory.add(EMERALD_AMULET_OF_PROTECTION_ID, 1);
    }

    // all constellations give uncut sapphire
    player.inventory.add(UNCUT_SAPPHIRE_ID, 1);
}

// returns the constellation index (0-11)
//   stage -1: scorpion (6); stage < 6: 0; stage 6: random 0-11
function constellation(player, stage) {
    if (stage === -1) {
        // quest completed, always show scorpion (index 6 in the source)
        return 6;
    }

    if (stage < 6) {
        // show no image on telescope at this stage
        return 0;
    }

    return Math.floor(Math.random() * 12);
}

module.exports = {
    handleReward,
    constellationNameAndReward,
    constellation
};
