// glass crafting: sand + soda ash on a furnace -> molten glass; glassblowing
// pipe + molten glass -> vial / orb / beer glass. furnace id 118

const items = require('@2003scape/rsc-data/config/items');

const FURNACE_ID = 118;

const SAND_ID = 625;
const SODA_ASH_ID = 624;
const MOLTEN_GLASS_ID = 623;
const GLASSBLOWING_PIPE_ID = 621;
const BUCKET_ID = 21;

const EMPTY_VIAL_ID = 465;
const UNPOWERED_ORB_ID = 611;
const BEER_GLASS_ID = 620;

// observatory-quest lens: molten glass on lens mould (1017, reusable) -> Lens (1018)
const LENS_MOULD_ID = 1017;
const LENS_ID = 1018;

// glassblowing menu options; `plural` is used only in the level-fail message
const BLOWING_OPTIONS = [
    {
        label: 'Vial',
        result: EMPTY_VIAL_ID,
        level: 33,
        experience: 140,
        plural: 'vials'
    },
    {
        label: 'orb',
        result: UNPOWERED_ORB_ID,
        level: 46,
        experience: 210,
        plural: 'orbs'
    },
    {
        label: 'Beer glass',
        result: BEER_GLASS_ID,
        level: 1,
        experience: 70,
        plural: 'beer glasses'
    }
];

function countId(inventory, id) {
    return inventory.items.filter((item) => item.id === id).length;
}

async function doGlassMaking(player) {
    const { world } = player;
    const inventory = player.inventory;

    if (!inventory.has(SODA_ASH_ID)) {
        player.message('@que@You need some soda ash to make glass');
        return;
    }

    if (!inventory.has(SAND_ID)) {
        player.message('@que@You need some sand to make glass');
        return;
    }

    const repeat = Math.min(
        countId(inventory, SAND_ID),
        countId(inventory, SODA_ASH_ID)
    );

    for (let i = 0; i < repeat; i += 1) {
        if (!inventory.has(SAND_ID) || !inventory.has(SODA_ASH_ID)) {
            break;
        }

        // fatigue check every iteration
        if (player.isTired()) {
            player.message('You are too tired to craft');
            break;
        }

        player.sendBubble(SAND_ID);
        player.message('@que@you heat the sand and soda ash in the furnace to make glass');

        inventory.remove(SODA_ASH_ID);
        inventory.remove(SAND_ID);

        await world.sleepTicks(1);

        inventory.add(MOLTEN_GLASS_ID);
        inventory.add(BUCKET_ID);
        player.addExperience('crafting', 80);
    }
}

async function doGlassBlowing(player, glass) {
    if (glass.id !== MOLTEN_GLASS_ID) {
        return;
    }

    player.message('what would you like to make?');

    const choices = BLOWING_OPTIONS.map(({ label }) => label);

    let choice;

    try {
        choice = await player.ask(choices, false);
    } catch (e) {
        return;
    }

    if (choice < 0 || choice >= BLOWING_OPTIONS.length) {
        return;
    }

    const { result, level, experience, plural } = BLOWING_OPTIONS[choice];

    const { world } = player;
    const inventory = player.inventory;

    const repeat = countId(inventory, MOLTEN_GLASS_ID);

    for (let i = 0; i < repeat; i += 1) {
        if (!inventory.has(MOLTEN_GLASS_ID)) {
            break;
        }

        const craftingLevel = player.skills.crafting.current;

        if (craftingLevel < level) {
            player.message(
                `You need a crafting level of ${level} to make ${plural}`
            );

            return;
        }

        if (player.isTired()) {
            player.message('You are too tired to craft');
            return;
        }

        inventory.remove(MOLTEN_GLASS_ID);

        await world.sleepTicks(1);

        player.message(`@que@You make a ${items[result].name}`);
        inventory.add(result);
        player.addExperience('crafting', experience);
    }
}

// lens making: molten glass on the lens mould -> lens. gated behind the
// observatory quest (stage 5+); consumes one molten glass, no xp
async function doLensMaking(player) {
    const stage = player.questStages.observatoryQuest || 0;

    if (stage >= 0 && stage < 5) {
        await player.say('Perhaps I should speak to the professor first');
        return;
    }

    if (player.skills.crafting.current < 10) {
        player.message('Sorry, you need a crafting level');
        player.message('Of 10 or above to use this object');
        // warning only, does not block
    }

    if (player.inventory.has(MOLTEN_GLASS_ID)) {
        player.inventory.remove(MOLTEN_GLASS_ID, 1);
        player.message('You pour the molten glass into the mould');
        player.message('And clasp it together');
        player.message('It produces a small convex glass disc');
        player.inventory.add(LENS_ID, 1);
    }
}

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== FURNACE_ID) {
        return false;
    }

    if (item.id !== SAND_ID && item.id !== SODA_ASH_ID) {
        return false;
    }

    await doGlassMaking(player);

    return true;
}

async function onUseWithInventory(player, item, target) {
    const ids = [item.id, target.id];

    // glassblowing pipe + molten glass -> Vial / orb / Beer glass
    if (ids.includes(GLASSBLOWING_PIPE_ID) && ids.includes(MOLTEN_GLASS_ID)) {
        const glass = item.id === MOLTEN_GLASS_ID ? item : target;
        await doGlassBlowing(player, glass);
        return true;
    }

    // molten glass + lens mould -> Lens (Observatory quest)
    if (ids.includes(MOLTEN_GLASS_ID) && ids.includes(LENS_MOULD_ID)) {
        await doLensMaking(player);
        return true;
    }

    return false;
}

module.exports = { onUseWithGameObject, onUseWithInventory };
