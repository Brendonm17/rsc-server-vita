// https://classic.runescape.wiki/w/Drinks
// OpenRSC Drinkables.java drink handlers + addstat/substat/healstat from Functions.java, against this build's {
// current, base } skills. addstat(c,pct): current + c + floor(current*pct/100), capped at base + c + floor(base*pct/100). substat(c,pct): current - (c + floor(current*pct/100)), HITS via player.damage(). healstat(c,pct): current + c + floor(base*pct/100), capped at base. Magic/Super Ranging/Super Magic potions (custom-items.json 1290+): Magic 10%+3 per dose, Super variants 15%+5. Runecraft/Saradomin potions handled by their own ItemAction classes, not here

const items = require('@2003scape/rsc-data/config/items');
const poison = require('../combat/poison');

const EMPTY_VIAL_ID = 465;
const BEER_GLASS_ID = 620;
const JUG_ID = 140;
const COCKTAIL_GLASS_ID = 833;
const BUCKET_ID = 21;

function resolveByName(name) {
    const target = name.toLowerCase();

    for (const [id, def] of Object.entries(items)) {
        if (def && def.name && def.name.toLowerCase() === target) {
            return Number(id);
        }
    }

    throw new RangeError(`quaffable.js: no item named "${name}"`);
}

// resolve every same-named dose ("N doses of X potion") into { potionName: { dose: id } }
function buildDoseTable() {
    const table = {};

    for (const [rawId, def] of Object.entries(items)) {
        if (!def) {
            continue;
        }

        // match on the description ("N doses of ... potion"), not the name
        const match = (def.description || '').match(
            /(\d+)\s*doses?\s*of\s*(.+?)\s*potion/i
        );

        if (!match) {
            continue;
        }

        const dose = +match[1];
        const name = def.name.toLowerCase();

        table[name] = table[name] || {};
        table[name][dose] = Number(rawId);
    }

    return table;
}

const DOSES = buildDoseTable();

function doseChain(potionName) {
    const doses = DOSES[potionName];

    if (!doses) {
        throw new RangeError(`quaffable.js: no dose table for "${potionName}"`);
    }

    return doses;
}

// addstat/substat/healstat (Functions.java)

function addstat(player, statId, constant, percent) {
    const skill = player.skills[statId];
    const maxBoost = skill.base + constant + Math.floor((skill.base * percent) / 100);
    let newLevel = skill.current + constant + Math.floor((skill.current * percent) / 100);

    if (newLevel > maxBoost) {
        newLevel = maxBoost;
    }

    skill.current = newLevel;
}

function substat(player, statId, constant, percent) {
    const skill = player.skills[statId];
    const damage = constant + Math.floor((skill.current * percent) / 100);

    if (statId === 'hits') {
        player.damage(damage);
        return;
    }

    skill.current = skill.current - damage;
}

function healstat(player, statId, constant, percent) {
    const skill = player.skills[statId];
    // HEALSTAT_ON_CURRENT_STAT default false (scale off base)
    const newLevel = skill.current + constant + Math.floor((skill.base * percent) / 100);
    skill.current = Math.min(newLevel, skill.base);
}

const MAGIC_SKILLS = [
    'magic'
    // getMagicSkills() is just Magic in authentic RSC, kept as a list
];

const PRAYER_SKILLS = ['prayer'];

// generic normal-potion helper (Drinkables.useNormalPotion): handles both the single-stat and parallel-array
// overloads
function useNormalPotion(
    player,
    itemId,
    affectedStats,
    percentageIncreases,
    modifiers,
    newItemId,
    dosesLeft
) {
    if (!player.inventory.has(itemId)) {
        return;
    }

    const skillLabel =
        affectedStats.length === 1 && affectedStats[0] === 'ranged'
            ? 'ranging'
            : affectedStats.length === 1
            ? affectedStats[0]
            : null;

    player.inventory.remove(itemId);

    if (skillLabel) {
        player.message(`You drink some of your ${skillLabel} potion`);
    } else {
        player.message(
            `You drink some of your ${items[itemId].name.toLowerCase()}`
        );
    }

    for (let i = 0; i < affectedStats.length; i += 1) {
        addstat(player, affectedStats[i], modifiers[i], percentageIncreases[i]);
    }

    player.inventory.add(newItemId);
    player.sendStats();

    if (dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(
            `You have ${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} of potion left`
        );
    }
}

function useCurePotion(player, itemId, newItemId, dosesLeft) {
    if (!player.inventory.has(itemId)) {
        return;
    }

    player.inventory.remove(itemId);
    player.message(
        `You drink some of your ${items[itemId].name.toLowerCase()}`
    );
    player.inventory.add(newItemId);

    poison.cure(player);
    poison.setCurePoisonProtection(player); // 3 minutes.

    if (dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(
            `You have ${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} of potion left`
        );
    }
}

function usePoisonAntidotePotion(player, itemId, newItemId, dosesLeft) {
    if (!player.inventory.has(itemId)) {
        return;
    }

    player.inventory.remove(itemId);
    player.message(
        `You drink some of your ${items[itemId].name.toLowerCase()} potion`
    );
    player.inventory.add(newItemId);

    poison.cure(player);
    poison.setAntidoteProtection(player); // 6 minutes.

    if (dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(
            `You have ${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} of potion left`
        );
    }
}

function usePrayerPotion(player, itemId, newItemId, dosesLeft) {
    if (!player.inventory.has(itemId)) {
        return;
    }

    player.inventory.remove(itemId);
    player.message(
        `You drink some of your ${items[itemId].name.toLowerCase()}`
    );
    player.inventory.add(newItemId);

    for (const prayerStat of PRAYER_SKILLS) {
        // Restore prayer by 25% + 7
        healstat(player, prayerStat, 7, 25);
    }

    player.sendStats();

    if (dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(
            `You have ${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} of potion left`
        );
    }
}

function useStatRestorePotion(player, itemId, newItemId, dosesLeft) {
    if (!player.inventory.has(itemId)) {
        return;
    }

    player.inventory.remove(itemId);
    player.message(
        `You drink some of your ${items[itemId].name.toLowerCase()}`
    );
    player.inventory.add(newItemId);

    // RSC stat restoration potion only touches Attack, Strength, Defense.
    for (const statId of ['attack', 'defense', 'strength']) {
        // Restore by 30% + 10
        healstat(player, statId, 10, 30);
    }

    player.sendStats();

    if (dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(
            `You have ${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} of potion left`
        );
    }
}

function useFishingPotion(player, itemId, newItemId, dosesLeft) {
    if (!player.inventory.has(itemId)) {
        return;
    }

    player.inventory.remove(itemId);
    player.message(
        `You drink some of your ${items[itemId].name.toLowerCase()}`
    );
    player.inventory.add(newItemId);

    // Constant increase by 3 Fishing
    addstat(player, 'fishing', 3, 0);
    player.sendStats();

    if (dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(`You have ${dosesLeft} doses of potion left`);
    }
}

// Potion of Zamorak (Drinkables.useZamorakPotion): +attack/+strength, -defense/-hits, +10%+0 on every prayer skill
// (this build: just Prayer)
function useZamorakPotion(player, itemId, newItemId, dosesLeft, oneDoseItemId) {
    if (!player.inventory.has(itemId)) {
        return;
    }

    const isLastDose = itemId === oneDoseItemId;

    player.inventory.remove(itemId);
    player.message('You drink some of the foul liquid');
    player.inventory.add(newItemId);

    const commonStats = ['attack', 'defense', 'strength', 'hits'];
    const percentageIncrease = [20, -10, 12, -10].concat(
        PRAYER_SKILLS.map(() => 10)
    );
    const modifier = isLastDose
        ? [2, -2, 2, 0].concat(PRAYER_SKILLS.map(() => 0))
        : [4, -4, 2, 0].concat(PRAYER_SKILLS.map(() => 0));
    const affectedStats = commonStats.concat(PRAYER_SKILLS);

    for (let i = 0; i < affectedStats.length; i += 1) {
        const isBoost = percentageIncrease[i] >= 0;

        if (isBoost) {
            addstat(player, affectedStats[i], modifier[i], percentageIncrease[i]);
        } else {
            substat(player, affectedStats[i], -modifier[i], -percentageIncrease[i]);
        }
    }

    player.sendStats();

    if (dosesLeft <= 0) {
        player.message('You have finished your potion');
    } else {
        player.message(
            `You have ${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} of potion left`
        );
    }
}

// alcohol / non-potion drinks (Drinkables.handleX)

function tryGiveBeerGlass(player) {
    player.inventory.add(BEER_GLASS_ID);
}

async function handleSpirits(player, item) {
    player.inventory.remove(item.id);

    player.message(
        `You drink the ${items[item.id].name.toLowerCase()}`,
        'You feel slightly reinvigorated',
        'And slightly dizzy too'
    );

    // Need more data. Likely would have scaled with level.
    if (item.id === WHISKY_ID) {
        substat(player, 'attack', 6, 0);
    } else {
        substat(player, 'attack', 3, 0);
    }

    addstat(player, 'strength', 5, 0);
    healstat(player, 'hits', 4, 0);
    player.sendStats();
}

async function handleCocktail(player, item) {
    player.inventory.remove(item.id);

    substat(player, 'attack', 3, 0);
    substat(player, 'defense', 1, 0);
    substat(player, 'strength', 4, 0);

    player.message('You drink the cocktail', 'It tastes awful..yuck');
    player.inventory.add(COCKTAIL_GLASS_ID);
    player.sendStats();
}

async function handleFruitCocktail(player, item, pineapplePunchId) {
    player.inventory.remove(item.id);

    if (item.id === pineapplePunchId) {
        healstat(player, 'hits', 0, 9);
    } else {
        healstat(player, 'hits', 0, 8);
    }

    player.message(
        'You drink the cocktail',
        'yum ..it tastes great',
        'You feel reinvigorated'
    );
    player.inventory.add(COCKTAIL_GLASS_ID);
    player.sendStats();
}

async function handleSpecialCocktail(player, item) {
    player.inventory.remove(item.id);

    // heal constant 5
    healstat(player, 'hits', 5, 0);
    // removes 3% + 1 from attack
    substat(player, 'attack', 1, 3);
    // adds 6% + 1 to strength
    addstat(player, 'strength', 1, 6);

    player.message(
        'You drink the cocktail',
        'yum ..it tastes great',
        'although you feel slightly dizzy'
    );
    player.inventory.add(COCKTAIL_GLASS_ID);
    player.sendStats();
}

async function handleBadWine(player, item) {
    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message('You drink the bad wine');

    player.inventory.add(JUG_ID);

    // removes constant 3
    substat(player, 'attack', 3, 0);
    player.sendStats();
    player.message('You start to feel sick');
}

async function handleWine(player, item, wineId, halfFullWineJugId) {
    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message('You drink the wine', 'It makes you feel a bit dizzy');

    const isFullWine = item.id === wineId;

    if (isFullWine) {
        player.inventory.add(halfFullWineJugId);
    } else {
        player.inventory.add(JUG_ID);
    }

    const healAmount = isFullWine ? 11 : 5;
    const lowerAmount = isFullWine ? 3 : 1;

    healstat(player, 'hits', healAmount, 0);
    substat(player, 'attack', lowerAmount, 0);
    player.sendStats();
}

async function handleChocolatyMilk(player, item) {
    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message('You drink the chocolaty milk');
    player.inventory.add(BUCKET_ID);
    healstat(player, 'hits', 4, 0);
    player.sendStats();
}

async function handleTea(player, item) {
    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message('You drink the cup of tea');

    // heal 2% plus 2 to hp
    healstat(player, 'hits', 2, 2);
    // add 2% plus 2 levels to attack
    addstat(player, 'attack', 2, 2);
    player.sendStats();
}

async function handleBeer(player, item) {
    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message(
        'You drink the beer',
        'You feel slightly reinvigorated',
        'And slightly dizzy too'
    );
    tryGiveBeerGlass(player);

    substat(player, 'attack', 1, 5);
    addstat(player, 'strength', 2, 0);
    healstat(player, 'hits', 1, 0);
    player.sendStats();
}

async function handleGreenmansAle(player, item) {
    const { world } = player;

    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message('You drink the greenmans ale');
    tryGiveBeerGlass(player);

    await world.sleepTicks(2);

    player.message('It has a strange taste');

    substat(player, 'attack', 0, 5);
    substat(player, 'defense', 0, 5);
    addstat(player, 'herblaw', 1, 0);
    healstat(player, 'hits', 1, 0);
    player.sendStats();
}

async function handleWizardsMindBomb(player, item) {
    const { world } = player;

    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message("you drink the Wizard's Mind Bomb");
    tryGiveBeerGlass(player);

    await world.sleepTicks(2);

    player.message('You feel very strange');

    substat(player, 'attack', 0, 5);
    substat(player, 'defense', 0, 5);
    substat(player, 'strength', 0, 5);

    for (const magicStat of MAGIC_SKILLS) {
        addstat(player, magicStat, 2, 2);
    }

    healstat(player, 'hits', 1, 0);
    player.sendStats();
}

async function handleDwarvenStout(player, item) {
    const { world } = player;

    player.inventory.remove(item.id);
    player.sendBubble(item.id);
    player.message('You drink the Dwarven Stout', 'It tastes foul');
    tryGiveBeerGlass(player);

    await world.sleepTicks(3);

    player.message('It tastes pretty strong too');

    substat(player, 'attack', 0, 5);
    substat(player, 'defense', 0, 5);
    substat(player, 'strength', 0, 5);

    addstat(player, 'smithing', 1, 0);
    addstat(player, 'mining', 1, 0);
    healstat(player, 'hits', 1, 0);
    player.sendStats();
}

async function handleAsgarnianAle(player, item) {
    const { world } = player;

    player.inventory.remove(item.id);
    player.message('You drink the Ale');
    player.sendBubble(item.id);
    tryGiveBeerGlass(player);

    await world.sleepTicks(2);

    player.message(
        'You feel slightly reinvigorated',
        'And slightly dizzy too'
    );

    substat(player, 'attack', 1, 5);
    addstat(player, 'strength', 2, 0);
    healstat(player, 'hits', 1, 0);
    player.sendStats();
}

async function handleDragonBitter(player, item) {
    const { world } = player;

    player.inventory.remove(item.id);
    player.message('You drink the Dragon bitter');
    tryGiveBeerGlass(player);
    player.sendBubble(item.id);

    await world.sleepTicks(2);

    player.message(
        'You feel slightly reinvigorated',
        'And slightly dizzy too'
    );

    substat(player, 'attack', 1, 5);
    addstat(player, 'strength', 2, 0);
    healstat(player, 'hits', 1, 0);
    player.sendStats();
}

async function handleGrog(player, item) {
    const { world } = player;

    player.inventory.remove(item.id);
    player.message('You drink the Grog');
    player.sendBubble(item.id);
    tryGiveBeerGlass(player);

    await world.sleepTicks(2);

    player.message(
        'You feel slightly reinvigorated',
        'And slightly dizzy too'
    );

    substat(player, 'attack', 6, 0);
    addstat(player, 'strength', 3, 0);
    healstat(player, 'hits', 3, 0);
    player.sendStats();
}

function randomInt(minInclusive, maxInclusive) {
    return (
        minInclusive +
        Math.floor(Math.random() * (maxInclusive - minInclusive + 1))
    );
}

async function handlePoisonChalice(player, item) {
    player.inventory.remove(item.id);

    const chance = randomInt(0, 5);

    switch (chance) {
        case 0: // Hits -1 or -3
            substat(player, 'hits', randomInt(0, 1) === 0 ? 1 : 3, 0);
            player.message('That tasted a bit dodgy. You feel a bit ill');
            break;
        case 1: // Hits +5%
            healstat(player, 'hits', 0, 5);
            player.message('It heals some health');
            break;
        case 2: // Crafting +1 Attack & Defence -1
            addstat(player, 'crafting', 1, 0);
            substat(player, 'attack', 1, 0);
            substat(player, 'defense', 1, 0);
            player.message('You feel a little strange');
            break;
        case 3: // Hits +15% Thieving +1
            healstat(player, 'hits', 0, 15);
            addstat(player, 'thieving', 1, 0);
            player.message('You feel a lot better');
            break;
        case 4: // Hits +30% Attack, Defence, Strength +4
            healstat(player, 'hits', 0, 30);
            addstat(player, 'attack', 4, 0);
            addstat(player, 'strength', 4, 0);
            addstat(player, 'defense', 4, 0);
            player.message('Wow that was an amazing!! You feel really invigorated');
            break;
        case 5: // No effect
            player.message('It has a slight taste of apricot');
            break;
    }

    player.sendStats();
}

// fixed item ids (resolved by name at module load)

const WHISKY_ID = resolveByName('whisky');
const VODKA_ID = resolveByName('vodka');
const GIN_ID = resolveByName('gin');
const BRANDY_ID = resolveByName('brandy');

const HALF_COCKTAIL_GLASS_ID = 853;
const FULL_COCKTAIL_GLASS_ID = 854;
const ODD_LOOKING_COCKTAIL_ID = resolveByName('odd looking cocktail');

const FRUIT_BLAST_ID = 866;
const BLURBERRY_BARMAN_FRUIT_BLAST_ID = 937;
const PINEAPPLE_PUNCH_ID = 879;
const BLURBERRY_BARMAN_PINEAPPLE_PUNCH_ID = 940;

const BLURBERRY_SPECIAL_ID = 877;
const BLURBERRY_BARMAN_BLURBERRY_SPECIAL_ID = 938;
const WIZARD_BLIZZARD_ID = 878;
const BLURBERRY_BARMAN_WIZARD_BLIZZARD_ID = 939;
const SGG_ID = 874;
const BLURBERRY_BARMAN_SGG_ID = 941;
const CHOCOLATE_SATURDAY_ID = 875;
const BLURBERRY_BARMAN_CHOCOLATE_SATURDAY_ID = 942;
const DRUNK_DRAGON_ID = 872;
const BLURBERRY_BARMAN_DRUNK_DRAGON_ID = 943;

const BAD_WINE_ID = resolveByName('bad wine');
const WINE_ID = resolveByName('wine');
const HALF_FULL_WINE_JUG_ID = resolveByName('half full wine jug');

const CHOCOLATY_MILK_ID = resolveByName('chocolaty milk');
const CUP_OF_TEA_ID = resolveByName('cup of tea');
const BEER_ID = resolveByName('beer');
const GREENMANS_ALE_ID = resolveByName('greenmans ale');
const WIZARDS_MIND_BOMB_ID = resolveByName("wizard's mind bomb");
const DWARVEN_STOUT_ID = resolveByName('dwarven stout');
const ASGARNIAN_ALE_ID = resolveByName('asgarnian ale');
const DRAGON_BITTER_ID = resolveByName('dragon bitter');
const GROG_ID = resolveByName('grog');
const POISON_CHALICE_ID = resolveByName('poison chalice');

const STRENGTH_POTION = doseChain('strength potion'); // 4-dose: 221/222/223/224
const ATTACK_POTION = doseChain('attack potion');
const DEFENSE_POTION = doseChain('defense potion');
const STAT_RESTORATION_POTION = doseChain('stat restoration potion');
const RESTORE_PRAYER_POTION = doseChain('restore prayer potion');
const SUPER_ATTACK_POTION = doseChain('super attack potion');
const SUPER_STRENGTH_POTION = doseChain('super strength potion');
const SUPER_DEFENSE_POTION = doseChain('super defense potion');
const FISHING_POTION = doseChain('fishing potion');
const RANGING_POTION = doseChain('ranging potion');
const CURE_POISON_POTION = doseChain('cure poison potion');
const POISON_ANTIDOTE = doseChain('poison antidote');
const MAGIC_POTION = doseChain('magic potion'); // custom-items.json 1473-1475
const SUPER_RANGING_POTION = doseChain('super ranging potion'); // 1479-1481
const SUPER_MAGIC_POTION = doseChain('super magic potion'); // 1482-1484

// Potion of Zamorak has no dose text, so its dose->id map is fixed: FULL=963, TWO=964, ONE=965
const POTION_OF_ZAMORAK = { 3: 963, 2: 964, 1: 965 };

// dispatch table keyed by item id -> async handler
const DRINK_HANDLERS = new Map();

function registerDoseChain(doses, handler) {
    // strength potion is the sole 4-dose chain (221->222->223->224->465); everything else is 3-dose (X->Y->Z->465),
    // descending full dose -> next lower item, last -> empty vial
    const sortedDoses = Object.keys(doses)
        .map(Number)
        .sort((a, b) => b - a);

    for (let i = 0; i < sortedDoses.length; i += 1) {
        const dose = sortedDoses[i];
        const itemId = doses[dose];
        const nextDose = sortedDoses[i + 1];
        const nextItemId = nextDose !== undefined ? doses[nextDose] : EMPTY_VIAL_ID;
        const dosesLeft = nextDose !== undefined ? nextDose : 0;

        DRINK_HANDLERS.set(itemId, (player) =>
            handler(player, itemId, nextItemId, dosesLeft)
        );
    }
}

registerDoseChain(STRENGTH_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['strength'], [10], [3], nextItemId, dosesLeft)
);
registerDoseChain(ATTACK_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['attack'], [10], [3], nextItemId, dosesLeft)
);
registerDoseChain(DEFENSE_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['defense'], [10], [3], nextItemId, dosesLeft)
);
registerDoseChain(SUPER_ATTACK_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['attack'], [15], [5], nextItemId, dosesLeft)
);
registerDoseChain(SUPER_STRENGTH_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['strength'], [15], [5], nextItemId, dosesLeft)
);
registerDoseChain(SUPER_DEFENSE_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['defense'], [15], [5], nextItemId, dosesLeft)
);
registerDoseChain(RANGING_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['ranged'], [10], [3], nextItemId, dosesLeft)
);
registerDoseChain(STAT_RESTORATION_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useStatRestorePotion(player, itemId, nextItemId, dosesLeft)
);
registerDoseChain(RESTORE_PRAYER_POTION, (player, itemId, nextItemId, dosesLeft) =>
    usePrayerPotion(player, itemId, nextItemId, dosesLeft)
);
registerDoseChain(FISHING_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useFishingPotion(player, itemId, nextItemId, dosesLeft)
);
registerDoseChain(CURE_POISON_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useCurePotion(player, itemId, nextItemId, dosesLeft)
);
registerDoseChain(POISON_ANTIDOTE, (player, itemId, nextItemId, dosesLeft) =>
    usePoisonAntidotePotion(player, itemId, nextItemId, dosesLeft)
);
// magic potion: keyed on MAGIC_SKILLS, 10%+3 per dose, 15%+5 for the two super variants
registerDoseChain(MAGIC_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(
        player,
        itemId,
        MAGIC_SKILLS,
        MAGIC_SKILLS.map(() => 10),
        MAGIC_SKILLS.map(() => 3),
        nextItemId,
        dosesLeft
    )
);
registerDoseChain(SUPER_RANGING_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(player, itemId, ['ranged'], [15], [5], nextItemId, dosesLeft)
);
registerDoseChain(SUPER_MAGIC_POTION, (player, itemId, nextItemId, dosesLeft) =>
    useNormalPotion(
        player,
        itemId,
        MAGIC_SKILLS,
        MAGIC_SKILLS.map(() => 15),
        MAGIC_SKILLS.map(() => 5),
        nextItemId,
        dosesLeft
    )
);
registerDoseChain(POTION_OF_ZAMORAK, (player, itemId, nextItemId, dosesLeft) =>
    useZamorakPotion(
        player,
        itemId,
        nextItemId,
        dosesLeft,
        POTION_OF_ZAMORAK[1]
    )
);

for (const id of [WHISKY_ID, VODKA_ID, GIN_ID, BRANDY_ID]) {
    DRINK_HANDLERS.set(id, (player, item) => handleSpirits(player, item));
}

for (const id of [
    HALF_COCKTAIL_GLASS_ID,
    FULL_COCKTAIL_GLASS_ID,
    ODD_LOOKING_COCKTAIL_ID
]) {
    DRINK_HANDLERS.set(id, (player, item) => handleCocktail(player, item));
}

for (const id of [
    FRUIT_BLAST_ID,
    BLURBERRY_BARMAN_FRUIT_BLAST_ID,
    PINEAPPLE_PUNCH_ID,
    BLURBERRY_BARMAN_PINEAPPLE_PUNCH_ID
]) {
    DRINK_HANDLERS.set(id, (player, item) =>
        handleFruitCocktail(player, item, PINEAPPLE_PUNCH_ID)
    );
}

for (const id of [
    BLURBERRY_SPECIAL_ID,
    BLURBERRY_BARMAN_BLURBERRY_SPECIAL_ID,
    WIZARD_BLIZZARD_ID,
    BLURBERRY_BARMAN_WIZARD_BLIZZARD_ID,
    SGG_ID,
    BLURBERRY_BARMAN_SGG_ID,
    CHOCOLATE_SATURDAY_ID,
    BLURBERRY_BARMAN_CHOCOLATE_SATURDAY_ID,
    DRUNK_DRAGON_ID,
    BLURBERRY_BARMAN_DRUNK_DRAGON_ID
]) {
    DRINK_HANDLERS.set(id, (player, item) => handleSpecialCocktail(player, item));
}

DRINK_HANDLERS.set(BAD_WINE_ID, (player, item) => handleBadWine(player, item));
DRINK_HANDLERS.set(HALF_FULL_WINE_JUG_ID, (player, item) =>
    handleWine(player, item, WINE_ID, HALF_FULL_WINE_JUG_ID)
);
DRINK_HANDLERS.set(WINE_ID, (player, item) =>
    handleWine(player, item, WINE_ID, HALF_FULL_WINE_JUG_ID)
);
DRINK_HANDLERS.set(CHOCOLATY_MILK_ID, (player, item) =>
    handleChocolatyMilk(player, item)
);
DRINK_HANDLERS.set(CUP_OF_TEA_ID, (player, item) => handleTea(player, item));
DRINK_HANDLERS.set(BEER_ID, (player, item) => handleBeer(player, item));
DRINK_HANDLERS.set(GREENMANS_ALE_ID, (player, item) =>
    handleGreenmansAle(player, item)
);
DRINK_HANDLERS.set(WIZARDS_MIND_BOMB_ID, (player, item) =>
    handleWizardsMindBomb(player, item)
);
DRINK_HANDLERS.set(DWARVEN_STOUT_ID, (player, item) =>
    handleDwarvenStout(player, item)
);
DRINK_HANDLERS.set(ASGARNIAN_ALE_ID, (player, item) =>
    handleAsgarnianAle(player, item)
);
DRINK_HANDLERS.set(DRAGON_BITTER_ID, (player, item) =>
    handleDragonBitter(player, item)
);
DRINK_HANDLERS.set(GROG_ID, (player, item) => handleGrog(player, item));
DRINK_HANDLERS.set(POISON_CHALICE_ID, (player, item) =>
    handlePoisonChalice(player, item)
);

async function onInventoryCommand(player, item) {
    const handler = DRINK_HANDLERS.get(item.id);

    if (!handler) {
        return false;
    }

    await handler(player, item);

    return true;
}

module.exports = { onInventoryCommand };
