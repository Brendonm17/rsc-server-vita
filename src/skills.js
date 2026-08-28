const EXPERIENCE_ARRAY = [0];

let totalExperience = 0;

for (let i = 1; i < 99; i++) {
    const level = i;
    const experience = Math.floor(level + 300 * Math.pow(2, level / 7));
    totalExperience += experience;
    EXPERIENCE_ARRAY[i] = totalExperience & 0xffffffc;
}

function experienceToLevel(experience) {
    let level = 1;

    for (let i = 0; i < EXPERIENCE_ARRAY.length; i += 1) {
        if (EXPERIENCE_ARRAY[i] > experience) {
            return level;
        }

        level = i + 1;
    }

    return level;
}

// Hitpoints shows a minimum level of 10 until 4616 xp (EXPERIENCE_ARRAY[9]).
const HITS_LEVEL_10_EXPERIENCE = 4616;

// Skill level from experience, with the Hitpoints floor: hits shows at least
// level 10 below 4616 xp; every other skill uses the plain xp curve.
function levelForExperience(skillName, experience) {
    if (
        skillName === 'hits' &&
        experience >= 0 &&
        experience < HITS_LEVEL_10_EXPERIENCE
    ) {
        return 10;
    }

    return experienceToLevel(experience);
}

function formatSkillName(skill) {
    if (skill === 'woodcutting') {
        return 'Woodcut';
    }

    if (skill === 'defense') {
        return 'Defence';
    }

    return skill.slice(0, 1).toUpperCase() + skill.slice(1, skill.length);
}

module.exports = { experienceToLevel, levelForExperience, formatSkillName };
