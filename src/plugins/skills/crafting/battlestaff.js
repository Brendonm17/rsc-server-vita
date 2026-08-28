// https://classic.runescape.wiki/w/Battlestaff
// battlestaff 614 + orb -> elemental staff: water 613->616 L54 xp400,
// earth 627->618 L58 xp450, fire 612->615 L62 xp500, air 626->617 L66 xp550

const { battlestaves } = require('@2003scape/rsc-data/skills/crafting');

const BATTLESTAFF_ID = 614;

// orb ids
const ORB_IDS = new Set(Object.keys(battlestaves).map(Number));

// article + name per orb id (verbatim "a earth"/"an air")
const RESULT_PHRASE = {
    613: 'a water battlestaff', // Water orb
    627: 'a earth battlestaff', // Earth orb (sic: "a earth")
    612: 'a fire battlestaff', // Fire orb
    626: 'an air battlestaff' // Air orb
};

async function onUseWithInventory(player, item, target) {
    // battlestaff + orb, either order
    let orbId;

    if (item.id === BATTLESTAFF_ID && ORB_IDS.has(target.id)) {
        orbId = target.id;
    } else if (target.id === BATTLESTAFF_ID && ORB_IDS.has(item.id)) {
        orbId = item.id;
    } else {
        return false;
    }

    const { level, experience, id: resultId } = battlestaves[orbId];

    if (player.skills.crafting.current < level) {
        player.message(
            `@que@You need a crafting level of ${level} to make ` +
                RESULT_PHRASE[orbId]
        );

        return true;
    }

    player.inventory.remove(BATTLESTAFF_ID);
    player.inventory.remove(orbId);

    // 1 tick
    await player.world.sleepTicks(1);

    // empty success message
    player.message('');

    player.inventory.add(resultId);
    player.addExperience('crafting', experience);

    return true;
}

module.exports = { onUseWithInventory };
