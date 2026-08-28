
const {
    SKILL_NAME,
    ITEM,
    RUNECRAFT_DEFS,
    TEMPLE_TELEPORTS,
    ALTAR_TALISMANS,
    BIND_ALTAR_TALISMANS,
    RUNE_TO_TALISMAN,
    TALISMAN_INFORMATION,
    ACTIVE_RUNES,
    RUNE_STONE_ROCK
} = require('../../sp/runecraft-data');

const items = require('@2003scape/rsc-data/config/items');

const ACTIVE_RUNE_SET = new Set(ACTIVE_RUNES);

// bind altars are odd ids 1191..1213, temple altars even 1190..1212
function isBindAltar(id) {
    return id >= 1191 && id <= 1213 && id % 2 === 1;
}

function isTempleAltar(id) {
    return id >= 1190 && id <= 1212 && id % 2 === 0;
}

// true when the player may not runecraft (quest incomplete)
function runeMysteriesIncomplete(player) {
    const stage = player.questStages.runeMysteries;
    return stage !== undefined && stage !== -1;
}

// count of an item id in the inventory
function countInventory(player, id) {
    let total = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            total += item.definition.stackable ? item.amount : 1;
        }
    }

    return total;
}

function hasEquipped(player, id) {
    for (const item of player.inventory.items) {
        if (item.id === id && item.equipped) {
            return true;
        }
    }

    return false;
}

// rune multiplier from current level
function getRuneMultiplier(player, runeId) {
    const level = player.skills[SKILL_NAME].current;
    let retVal = 1;

    switch (runeId) {
        case ITEM.AIR_RUNE:
            retVal = Math.floor(level / 11.0) + 1;
            if (retVal > 10) retVal = 10;
            break;
        case ITEM.MIND_RUNE:
            retVal = Math.floor(level / 14.0) + 1;
            if (retVal > 8) retVal = 8;
            break;
        case ITEM.WATER_RUNE:
            retVal = Math.floor(level / 19.0) + 1;
            if (retVal > 6) retVal = 6;
            break;
        case ITEM.EARTH_RUNE:
            retVal = Math.floor(level / 26.0) + 1;
            if (retVal > 4) retVal = 4;
            break;
        case ITEM.FIRE_RUNE:
            retVal = Math.floor(level / 35.0) + 1;
            if (retVal > 3) retVal = 3;
            break;
        case ITEM.BODY_RUNE:
            retVal = Math.floor(level / 46.0) + 1;
            if (retVal > 3) retVal = 3;
            break;
        case ITEM.COSMIC_RUNE:
            retVal = level >= 59 ? 2 : 1;
            break;
        case ITEM.CHAOS_RUNE:
            retVal = level >= 74 ? 2 : 1;
            break;
        case ITEM.NATURE_RUNE:
            retVal = level >= 91 ? 2 : 1;
            break;
        default:
            retVal = 1;
    }

    return retVal;
}

// bind altars
async function bindAltar(player, gameObject) {
    const { world } = player;
    const def = RUNECRAFT_DEFS[gameObject.id];

    // law/death/blood altars: not bindable
    if (!def || !ACTIVE_RUNE_SET.has(def.runeId)) {
        player.message('Nothing interesting happens.');
        return true;
    }

    if (runeMysteriesIncomplete(player)) {
        player.message(
            'You need to complete Rune Mysteries first. How did you get here?'
        );
        return true;
    }

    if (!player.inventory.has(ITEM.RUNE_STONE)) {
        player.message('You have no rune stones to bind.');
        return true;
    }

    const talismans = BIND_ALTAR_TALISMANS[gameObject.id];
    const NORMAL = 0;
    const CURSED = 1;
    const ENFEEBLED = 2;

    let multiplier = 1;
    let levelAdd = 0;
    let cursed = false;
    let enfeebled = false;

    if (player.inventory.has(talismans[ENFEEBLED])) {
        multiplier = 5;
        levelAdd = 14;
        enfeebled = true;
    } else if (player.inventory.has(talismans[CURSED])) {
        multiplier = 2;
        levelAdd = 7;
        cursed = true;
    }

    // no cursed/enfeebled -> normal talisman required
    if (
        cursed === enfeebled &&
        countInventory(player, talismans[NORMAL]) <= 0
    ) {
        player.message('You need a talisman to use the power of this altar');
        return true;
    }

    if (player.skills[SKILL_NAME].base < def.requiredLvl) {
        player.message('You require more skill to use this altar.');
        return true;
    }

    if (cursed || enfeebled) {
        if (player.skills[SKILL_NAME].base < def.requiredLvl + levelAdd) {
            player.message(
                'You require more skill to use this talisman with this altar.'
            );
            return true;
        }

        if (hasEquipped(player, ITEM.CROWN_OF_THE_ARTISAN)) {
            player.message(
                "As you attempt to bind the temple's power into " +
                    def.runeName +
                    ' runes'
            );
            await world.sleepTicks(3);
            player.message(
                'You feel a conflict between the magic of your crown and ' +
                    'talisman'
            );
            return true;
        }
    }

    player.message(
        "You bind the temple's power into " + def.runeName + ' runes.'
    );

    let successCount = 0;
    const repeatTimes = countInventory(player, ITEM.RUNE_STONE);

    for (let loop = 0; loop < repeatTimes; loop += 1) {
        if (!player.inventory.has(ITEM.RUNE_STONE)) {
            break;
        }

        player.inventory.remove(ITEM.RUNE_STONE);

        // no runes at all with an enfeebled talisman
        if (!enfeebled) {
            player.inventory.add(
                def.runeId,
                getRuneMultiplier(player, def.runeId)
            );
        }

        successCount += 1;
    }

    if (cursed) {
        if (player.inventory.has(talismans[CURSED])) {
            player.inventory.remove(talismans[CURSED]);
            player.message('Your talisman crumbles to dust');
        } else {
            multiplier = 1;
        }
    } else if (enfeebled) {
        if (player.inventory.has(talismans[ENFEEBLED])) {
            player.inventory.remove(talismans[ENFEEBLED]);
            player.message('The runes crumble to dust');
            await world.sleepTicks(3);
            player.message('And your talisman explodes!');
            await player.say('ouch');
            player.message('You feel strange');

            const subtractLevel = Math.round(
                player.skills[SKILL_NAME].current * 0.15
            );

            player.skills[SKILL_NAME].current = Math.max(
                0,
                player.skills[SKILL_NAME].current - subtractLevel
            );
            player.sendStats();
            player.damage(3);
        } else {
            multiplier = 1;
        }
    }

    player.addExperience(SKILL_NAME, def.exp * successCount * multiplier);

    return true;
}

// temple altars: enter op and talisman-on-altar
async function templeAltarUse(player, gameObject, talismanId) {
    const { world } = player;

    if (runeMysteriesIncomplete(player)) {
        player.message('You need to complete Rune Mysteries first.');
        return true;
    }

    // talismanId is validated by the caller
    void talismanId;

    player.message('You feel a powerful force take hold of you...');
    await world.sleepTicks(1);

    const dest = TEMPLE_TELEPORTS[gameObject.id];

    if (dest) {
        player.teleport(dest.x, dest.y);
    }

    return true;
}

async function templeAltarEnter(player, gameObject) {
    const talismans = ALTAR_TALISMANS[gameObject.id];

    if (!talismans) {
        return true;
    }

    let heldTalisman = -1;

    for (const talismanId of talismans) {
        if (player.inventory.has(talismanId)) {
            heldTalisman = talismanId;
            break;
        }
    }

    if (heldTalisman !== -1) {
        return await templeAltarUse(player, gameObject, heldTalisman);
    }

    player.message("You can't enter this place");
    return true;
}

// rune stone rock: mine with a pickaxe
const PICKAXE_IDS = [
    1258, // Rune pickaxe
    1257, // Adamantite pickaxe
    1256, // Mithril pickaxe
    1259, // Steel pickaxe
    156 // Bronze pickaxe (base)
];

// resolves pickaxe ids by name at load
function resolvePickaxes() {
    const ids = [];

    items.forEach((it, i) => {
        if (it && it.name && /pickaxe$/i.test(it.name)) {
            ids.push(i);
        }
    });

    return ids.length ? ids : PICKAXE_IDS;
}

const PICKAXES = resolvePickaxes();

function hasPickaxe(player) {
    for (const id of PICKAXES) {
        if (player.inventory.has(id)) {
            return true;
        }
    }

    return false;
}

async function mineRuneStone(player, gameObject) {
    const { world } = player;

    if (!hasPickaxe(player)) {
        player.message('You need a pickaxe to mine rune stones');
        await world.sleepTicks(3);
        return true;
    }

    if (player.inventory.isFull()) {
        player.message('You cannot mine rune stone with a full inventory.');
        await world.sleepTicks(3);
        return true;
    }

    // fills free slots; one rune stone + 20 mining xp per swing
    let repeat = 30 - player.inventory.items.length;
    if (repeat < 1) repeat = 1;

    for (let i = 0; i < repeat; i += 1) {
        if (player.inventory.isFull()) {
            break;
        }

        player.sendSound('mine');
        player.sendBubble(PICKAXES[PICKAXES.length - 1]);
        player.inventory.add(ITEM.RUNE_STONE, 1);
        player.addExperience('mining', 20);
        await world.sleepTicks(3);
    }

    return true;
}

// talisman crafting: chisel + rune stone, or runes + uncharged talisman
async function chiselTalisman(player) {
    const { world } = player;

    let repeat = countInventory(player, ITEM.RUNE_STONE);
    if (repeat <= 0) return;

    for (let i = 0; i < repeat; i += 1) {
        if (player.isTired()) {
            player.message('You are too fatigued to do that.');
            return;
        }

        if (!player.inventory.has(ITEM.RUNE_STONE)) {
            return;
        }

        player.sendBubble(ITEM.CHISEL);
        player.inventory.remove(ITEM.RUNE_STONE);
        await world.sleepTicks(1);
        player.message('You chisel the rune stone into a talisman.');
        player.inventory.add(ITEM.UNCHARGED_TALISMAN);
        player.addExperience('crafting', 20);

        await world.sleepTicks(1);
    }
}

async function imbueTalisman(player, runeId) {
    const { world } = player;

    const talismanId = RUNE_TO_TALISMAN[runeId];
    if (!talismanId) return;

    let repeat = countInventory(player, ITEM.UNCHARGED_TALISMAN);
    if (repeat <= 0) return;

    for (let i = 0; i < repeat; i += 1) {
        if (player.isTired()) {
            player.message('You are too fatigued to do that.');
            return;
        }

        const required = TALISMAN_INFORMATION[talismanId][0];
        const imbueExp = TALISMAN_INFORMATION[talismanId][1];

        if (player.skills[SKILL_NAME].base < required) {
            player.message(
                'You must be at least level ' + required + ' to imbue that'
            );
            await world.sleepTicks(3);
            return;
        }

        if (!player.inventory.has(ITEM.UNCHARGED_TALISMAN)) {
            return;
        }

        // 10 runes required to imbue.
        if (countInventory(player, runeId) < 10) {
            player.message(
                'You do not have enough runes to imbue that talisman!'
            );
            await world.sleepTicks(3);
            return;
        }

        player.sendBubble(ITEM.UNCHARGED_TALISMAN);
        player.inventory.remove(ITEM.UNCHARGED_TALISMAN);
        player.inventory.remove(runeId, 10);
        await world.sleepTicks(1);
        player.inventory.add(talismanId);
        player.addExperience(SKILL_NAME, imbueExp);
        const talismanName = items[talismanId]
            ? items[talismanId].name
            : 'talisman';
        player.message(
            'You imbue the uncharged talisman and create a ' + talismanName
        );

        await world.sleepTicks(1);
    }
}

// locate: points toward the mainland temple altar
const TALISMAN_LOCATE = {
    [ITEM.AIR_TALISMAN]: { x: 306, y: 593 },
    [ITEM.CURSED_AIR_TALISMAN]: { x: 306, y: 593 },
    [ITEM.ENFEEBLED_AIR_TALISMAN]: { x: 306, y: 593 },
    [ITEM.MIND_TALISMAN]: { x: 297, y: 438 },
    [ITEM.CURSED_MIND_TALISMAN]: { x: 297, y: 438 },
    [ITEM.ENFEEBLED_MIND_TALISMAN]: { x: 297, y: 438 },
    [ITEM.WATER_TALISMAN]: { x: 447, y: 684 },
    [ITEM.CURSED_WATER_TALISMAN]: { x: 447, y: 684 },
    [ITEM.ENFEEBLED_WATER_TALISMAN]: { x: 447, y: 684 },
    [ITEM.EARTH_TALISMAN]: { x: 62, y: 464 },
    [ITEM.CURSED_EARTH_TALISMAN]: { x: 62, y: 464 },
    [ITEM.ENFEEBLED_EARTH_TALISMAN]: { x: 62, y: 464 },
    [ITEM.FIRE_TALISMAN]: { x: 50, y: 633 },
    [ITEM.CURSED_FIRE_TALISMAN]: { x: 50, y: 633 },
    [ITEM.ENFEEBLED_FIRE_TALISMAN]: { x: 50, y: 633 },
    [ITEM.BODY_TALISMAN]: { x: 259, y: 503 },
    [ITEM.CURSED_BODY_TALISMAN]: { x: 259, y: 503 },
    [ITEM.ENFEEBLED_BODY_TALISMAN]: { x: 259, y: 503 },
    [ITEM.COSMIC_TALISMAN]: { x: 106, y: 3565 },
    [ITEM.CURSED_COSMIC_TALISMAN]: { x: 106, y: 3565 },
    [ITEM.ENFEEBLED_COSMIC_TALISMAN]: { x: 106, y: 3565 },
    [ITEM.CHAOS_TALISMAN]: { x: 232, y: 375 },
    [ITEM.CURSED_CHAOS_TALISMAN]: { x: 232, y: 375 },
    [ITEM.ENFEEBLED_CHAOS_TALISMAN]: { x: 232, y: 375 },
    [ITEM.NATURE_TALISMAN]: { x: 392, y: 804 },
    [ITEM.CURSED_NATURE_TALISMAN]: { x: 392, y: 804 },
    [ITEM.ENFEEBLED_NATURE_TALISMAN]: { x: 392, y: 804 }
};

async function locateTalisman(player, item) {
    if (runeMysteriesIncomplete(player)) {
        player.message(
            "You can't understand what the talisman is trying to tell you."
        );
        return true;
    }

    const altar = TALISMAN_LOCATE[item.id];
    if (!altar) {
        return true;
    }

    const diffX = altar.x - player.x;
    const diffY = altar.y - player.y;

    let eastOrWest = '';
    let northOrSouth = '';

    if (diffX !== 0) {
        eastOrWest = diffX > 0 ? 'west' : 'east';
    }

    if (diffY !== 0) {
        northOrSouth = diffY > 0 ? 'south' : 'north';
    }

    player.message('The talisman pulls towards the ' + northOrSouth + eastOrWest + '.');
    return true;
}

// plugin entry points

// default op: bind altar, enter temple, or mine rune stone
async function onGameObjectCommandOne(player, gameObject) {
    const id = gameObject.id;

    if (id === RUNE_STONE_ROCK) {
        return await mineRuneStone(player, gameObject);
    }

    if (isBindAltar(id)) {
        return await bindAltar(player, gameObject);
    }

    if (isTempleAltar(id)) {
        return await templeAltarEnter(player, gameObject);
    }

    return false;
}

// talisman used on a temple altar teleports
async function onUseWithGameObject(player, gameObject, item) {
    const talismans = ALTAR_TALISMANS[gameObject.id];

    if (!talismans || talismans.indexOf(item.id) === -1) {
        return false;
    }

    return await templeAltarUse(player, gameObject, item.id);
}

// chisel+stone makes uncharged talisman; runes charge it
async function onUseWithInventory(player, item, target) {
    const chisel =
        item.id === ITEM.CHISEL || target.id === ITEM.CHISEL;
    const runestone =
        item.id === ITEM.RUNE_STONE || target.id === ITEM.RUNE_STONE;

    if (chisel && runestone) {
        await chiselTalisman(player);
        return true;
    }

    const rune =
        ACTIVE_RUNE_SET.has(item.id) || ACTIVE_RUNE_SET.has(target.id);
    const uncharged =
        item.id === ITEM.UNCHARGED_TALISMAN ||
        target.id === ITEM.UNCHARGED_TALISMAN;

    if (rune && uncharged) {
        const runeId =
            item.id === ITEM.UNCHARGED_TALISMAN ? target.id : item.id;
        await imbueTalisman(player, runeId);
        return true;
    }

    return false;
}

// talisman "Locate" inventory command.
async function onInventoryCommand(player, item) {
    if (TALISMAN_LOCATE[item.id] === undefined) {
        return false;
    }

    return await locateTalisman(player, item);
}

module.exports = {
    onGameObjectCommandOne,
    onUseWithGameObject,
    onUseWithInventory,
    onInventoryCommand
};
