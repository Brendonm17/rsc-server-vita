// Grape Empowerment: bless/curse grapes into powerful wine

const items = require('@2003scape/rsc-data/config/items');
const NPC = require('../../model/npc');
const { wantBatching } = require('../skills/batch');

// Item and npc ids.
const GRAPES_ID = 143;
const JUG_OF_WATER_ID = 141;
const BAD_WINE_ID = 180;
const HOLY_SYMBOL_OF_SARADOMIN_ID = 385;
const UNHOLY_SYMBOL_OF_ZAMORAK_ID = 1029;
const MONKS_ROBE_TOP_ID = 388;
const MONKS_ROBE_BOTTOM_ID = 389;
const ROBE_OF_ZAMORAK_TOP_ID = 702;
const ROBE_OF_ZAMORAK_BOTTOM_ID = 703;
const WINE_OF_ZAMORAK_ID = 501;
const MONK_ID = 93;
const MONK_OF_ZAMORAK_ID = 140;

const HARVESTING = 'harvesting';
const HARVESTING_REQ = 85;

// Saradomin and Zamorak monk enclave bounds.
const SARADOMIN_MONKS = { minX: 249, minY: 452, maxX: 265, maxY: 468 };
const ZAMORAK_MONKS = { minX: 679, minY: 634, maxX: 704, maxY: 659 };

// custom items resolved by name
let CUSTOM_IDS = null;

function resolveCustomIds() {
    if (CUSTOM_IDS) {
        return CUSTOM_IDS;
    }

    const byName = (name) =>
        items.findIndex(
            (def) => def && def.name && def.name.toLowerCase() === name
        );

    CUSTOM_IDS = {
        grapesOfSaradomin: byName('grapes of saradomin'),
        grapesOfZamorak: byName('grapes of zamorak'),
        wineOfSaradomin: byName('wine of saradomin')
    };

    return CUSTOM_IDS;
}

function inBounds(player, b) {
    return (
        player.x >= b.minX &&
        player.x <= b.maxX &&
        player.y >= b.minY &&
        player.y <= b.maxY
    );
}

// Unordered pair match.
function isPair(a, b, idA, idB) {
    return (a === idA && b === idB) || (a === idB && b === idA);
}

function countId(player, id) {
    let total = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            total += item.definition.stackable ? item.amount : 1;
        }
    }

    return total;
}

// addnpc: spawn a transient npc, despawns after ttlMs
function addnpc(player, id, x, y, ttlMs) {
    const { world } = player;

    const npc = new NPC(world, {
        id,
        x,
        y,
        minX: x - 2,
        maxX: x + 2,
        minY: y - 2,
        maxY: y + 2
    });

    delete npc.respawn;
    world.addEntity('npcs', npc);

    if (ttlMs) {
        world.setTimeout(() => {
            if (world.npcs.getByID(id) === npc) {
                world.removeEntity('npcs', npc);
            }
        }, ttlMs);
    }

    return npc;
}

// wrong enclave: spawn the rival monk to scold and attack
async function summonAngryMonk(player, npcId, line) {
    const monk = addnpc(player, npcId, player.x, player.y, 120000);

    if (!monk) {
        return false;
    }

    await monk.say(line);
    // the monk pursues and attacks
    await monk.attack(player);

    return true;
}

// batchPower: bless/curse grapes, one prayer level each
async function batchPower(player, poweredGrapesId, processString) {
    const { world } = player;

    const repeat = wantBatching(player)
        ? Math.min(countId(player, GRAPES_ID), player.skills.prayer.current)
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(GRAPES_ID) ||
            player.skills.prayer.current < 1
        ) {
            return;
        }

        player.message(processString);
        player.inventory.remove(GRAPES_ID);
        player.skills.prayer.current -= 1;
        player.sendStats();
        player.inventory.add(poweredGrapesId, 1);

        await world.sleepTicks(1);
    }
}

// Saradomin bless / Zamorak curse
async function empowerGrapes(player, opts) {
    const { world } = player;

    // wrong enclave: monk attacks; right: proceed; else nothing
    if (inBounds(player, opts.wrongPlace)) {
        await summonAngryMonk(player, opts.wrongMonkId, opts.wrongMonkLine);
        return;
    }

    if (!inBounds(player, opts.rightPlace)) {
        player.message('Nothing seems to occur');
        return;
    }

    if (player.skills[HARVESTING].current < HARVESTING_REQ) {
        player.message('@que@Your harvesting level is not high enough');
        player.message('@que@' + opts.witherLine);
        await world.sleepTicks(2);
        player.message('@que@' + opts.levelLine);
        return;
    }

    if (
        !player.inventory.isEquipped(opts.robeTopId) &&
        !player.inventory.isEquipped(opts.robeBottomId)
    ) {
        player.message('@que@' + opts.faithLine);
        await world.sleepTicks(2);
        player.message('@que@' + opts.robeLine);
        return;
    }

    if (player.skills.prayer.current < 1) {
        player.message(opts.devoutLine);
        await world.sleepTicks(2);
        player.message('Try recharging your prayer points');
        return;
    }

    await batchPower(player, opts.poweredGrapesId, opts.processString);
}

// makePowerfulWine: empowered grapes + jug of water -> powerful wine
async function makePowerfulWine(player, empoweredGrapesId, resultWineId) {
    const { world } = player;

    if (player.skills.cooking.current < 70) {
        player.message('You need level 70 cooking to do this');
        return;
    }

    const repeat = wantBatching(player)
        ? Math.min(
              countId(player, empoweredGrapesId),
              countId(player, JUG_OF_WATER_ID)
          )
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (
            !player.inventory.has(empoweredGrapesId) ||
            !player.inventory.has(JUG_OF_WATER_ID)
        ) {
            return;
        }

        player.message('@que@You squeeze the grapes into the jug');
        player.inventory.remove(empoweredGrapesId);
        player.inventory.remove(JUG_OF_WATER_ID);

        await world.sleepTicks(5);

        // Success roll: level req 70, stop-fail level 105.
        if (calcProductionSuccessfulLegacy(70, player.skills.cooking.current, 105)) {
            player.message('@que@You make some powerful wine');
            player.inventory.add(resultWineId, 1);
            player.addExperience('cooking', 550);
        } else {
            player.message('@que@You accidentally make some bad wine');
            player.inventory.add(BAD_WINE_ID, 1);
        }
    }
}

// production success roll
function calcProductionSuccessfulLegacy(levelReq, skillLevel, levelStopFail) {
    const roll = 1 + Math.floor(Math.random() * 256);

    if (skillLevel < levelReq) {
        return false;
    }

    const threshold = Math.min(
        256,
        Math.floor(64 + (skillLevel - 1) * (19200.0 / (levelStopFail * 98)))
    );

    return roll <= threshold;
}

async function onUseWithInventory(player, item, target) {
    const a = item.id;
    const b = target.id;
    const ids = resolveCustomIds();

    const isBless = isPair(a, b, GRAPES_ID, HOLY_SYMBOL_OF_SARADOMIN_ID);
    const isCurse = isPair(a, b, GRAPES_ID, UNHOLY_SYMBOL_OF_ZAMORAK_ID);
    const isSaradominWine =
        ids.grapesOfSaradomin >= 0 &&
        isPair(a, b, ids.grapesOfSaradomin, JUG_OF_WATER_ID);
    const isZamorakWine =
        ids.grapesOfZamorak >= 0 &&
        isPair(a, b, ids.grapesOfZamorak, JUG_OF_WATER_ID);

    if (!isBless && !isCurse && !isSaradominWine && !isZamorakWine) {
        return false;
    }

    // members world gate.
    if (!player.world.members) {
        player.message('Nothing interesting happens');
        return true;
    }

    if (isBless) {
        await empowerGrapes(player, {
            wrongPlace: ZAMORAK_MONKS,
            wrongMonkId: MONK_OF_ZAMORAK_ID,
            wrongMonkLine: 'How dare you go blessing in Saradomins name',
            rightPlace: SARADOMIN_MONKS,
            witherLine: 'to hold blessed grapes and they would just wither',
            levelLine: 'You need a harvesting level of 85 to bless the grapes',
            robeTopId: MONKS_ROBE_TOP_ID,
            robeBottomId: MONKS_ROBE_BOTTOM_ID,
            faithLine: 'Your faith in Saradomin is not strong enough',
            robeLine:
                'You need to be wearing the set of monk robes to bless the grapes',
            devoutLine: 'You do not feel devout enough to bless the grapes',
            poweredGrapesId: ids.grapesOfSaradomin,
            processString: 'You bless the grapes'
        });
    } else if (isCurse) {
        await empowerGrapes(player, {
            wrongPlace: SARADOMIN_MONKS,
            wrongMonkId: MONK_ID,
            wrongMonkLine: 'You better stop cursing around on Zamoraks name',
            rightPlace: ZAMORAK_MONKS,
            witherLine: 'to hold cursed grapes and they would just wither',
            levelLine: 'You need a harvesting level of 85 to curse the grapes',
            robeTopId: ROBE_OF_ZAMORAK_TOP_ID,
            robeBottomId: ROBE_OF_ZAMORAK_BOTTOM_ID,
            faithLine: 'Your faith in Zamorak is not strong enough',
            robeLine:
                'You need to be wearing the set of zamorak robes to curse the grapes',
            devoutLine: 'You do not feel devout enough to curse the grapes',
            poweredGrapesId: ids.grapesOfZamorak,
            processString: 'You curse the grapes'
        });
    } else if (isSaradominWine) {
        await makePowerfulWine(player, ids.grapesOfSaradomin, ids.wineOfSaradomin);
    } else if (isZamorakWine) {
        await makePowerfulWine(player, ids.grapesOfZamorak, WINE_OF_ZAMORAK_ID);
    }

    return true;
}

module.exports = { onUseWithInventory };
