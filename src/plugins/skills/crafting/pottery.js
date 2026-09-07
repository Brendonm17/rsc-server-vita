// https://classic.runescape.wiki/w/Crafting#Pottery

const items = require('@2003scape/rsc-data/config/items');
const { pottery } = require('@2003scape/rsc-data/skills/crafting');
const { wantBatching } = require('../batch');

// oven-firing crack roll: pot cracks when random(1..256) exceeds the threshold
function crackPot(reqLvl, craftingLevel) {
    const levelStopFail = reqLvl + 8;
    const threshold = Math.min(
        256,
        Math.floor(64 + (craftingLevel - 1) * (19200 / (levelStopFail * 98)))
    );
    const roll = 1 + Math.floor(Math.random() * 256);

    return roll > threshold;
}

// { fullID: emptyID }
const WATER_IDS = {
    141: 140,
    50: 21
};

const CLAY_ID = 149;
const POTTERY_OVEN_ID = 178;
const POTTERY_WHEEL_ID = 179;
const SOFT_CLAY_ID = 243;

// { unfiredID: { id, experience, alias } }
const FIRED_POTTERY = {};

for (const {
    fired,
    unfired: { id: unfiredID },
    alias
} of pottery) {
    FIRED_POTTERY[unfiredID] = { ...fired, alias };
}

const UNFIRED_POTTERY_IDS = new Set(pottery.map((entry) => entry.unfired.id));

async function onUseWithInventory(player, item, target) {
    if (
        (item.id !== CLAY_ID || !WATER_IDS.hasOwnProperty(target.id)) &&
        (!WATER_IDS.hasOwnProperty(item.id) || target.id !== CLAY_ID)
    ) {
        return false;
    }

    player.lock();

    const { world } = player;
    const waterID = item.id === CLAY_ID ? target.id : item.id;

    // repeat = min(water containers held, clay held)
    const repeat = wantBatching(player)
        ? Math.min(
              player.inventory.items.filter(({ id }) => id === waterID).length,
              player.inventory.items.filter(({ id }) => id === CLAY_ID).length
          )
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(waterID) || !player.inventory.has(CLAY_ID)) {
            break;
        }

        // swap both items for their results before either message fires
        player.inventory.remove(waterID);
        player.inventory.remove(CLAY_ID);
        player.inventory.add(WATER_IDS[waterID]);
        player.inventory.add(SOFT_CLAY_ID);

        player.message('You mix the clay and water');
        await world.sleepTicks(2);
        player.message('You now have some soft workable clay');
    }

    player.unlock();

    return true;
}

async function doMoulding(player) {
    player.message('What would you like to make?');

    const choices = pottery.map((entry) => {
        const name = items[entry.fired.id].name;
        return name[0].toUpperCase() + name.slice(1);
    });

    const choice = await player.ask(choices, false);

    if (choice < 0) {
        return;
    }

    const {
        level,
        unfired: { id, experience },
        alias
    } = pottery[choice];

    const { world } = player;

    // repeat = count of soft clay held
    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id: heldId }) => heldId === SOFT_CLAY_ID)
              .length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(SOFT_CLAY_ID)) {
            break;
        }

        const craftingLevel = player.skills.crafting.current;

        if (craftingLevel < level) {
            player.message(
                `@que@You need to have a crafting of level ${level} or ` +
                    `higher to make ${alias}`
            );

            return;
        }

        if (player.isTired()) {
            player.message('You are too tired to craft');
            return;
        }

        player.inventory.remove(SOFT_CLAY_ID);
        player.sendBubble(SOFT_CLAY_ID);

        const name = items[id].name.toLowerCase().replace('unfired ', '');
        player.message(`@que@you make the clay into a ${name}`);

        player.inventory.add(id);
        player.addExperience('crafting', experience);

        await world.sleepTicks(1);
    }
}

async function doFiring(player, item) {
    // level check, then fatigue check, both before any message/bubble/delay
    const { level, id, experience, alias } = FIRED_POTTERY[item.id];
    const { world } = player;

    // repeat = count of that unfired item held
    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id: heldId }) => heldId === item.id)
              .length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(item.id)) {
            break;
        }

        const craftingLevel = player.skills.crafting.current;

        if (craftingLevel < level) {
            player.message(
                `@que@You need to have a crafting of level ${level} or ` +
                    `higher to make ${alias}`
            );

            return;
        }

        if (player.isTired()) {
            player.message('You are too tired to craft');
            return;
        }

        const name = items[item.id].name.toLowerCase().replace('unfired ', '');

        player.sendBubble(item.id);
        player.message(`@que@You put the ${name} in the oven`);
        player.inventory.remove(item.id);
        await world.sleepTicks(3);

        const fireSuccess = !crackPot(level, craftingLevel);

        if (fireSuccess) {
            player.message(`@que@the ${name} hardens in the oven`);
            await world.sleepTicks(3);

            // remove message says "dish" for the pie dish, its own name otherwise
            const finishedName = name === 'pie dish' ? 'dish' : name;
            player.message(`@que@You remove a ${finishedName} from the oven`);
            player.inventory.add(id);
            player.addExperience('crafting', experience);
        } else {
            player.message(
                `@que@The ${name} cracks in the oven, you throw it away.`
            );
        }

        await world.sleepTicks(1);
    }
}

async function onUseWithGameObject(player, gameObject, item) {
    if (item.id === SOFT_CLAY_ID && gameObject.id === POTTERY_WHEEL_ID) {
        await doMoulding(player);
        return true;
    }

    if (gameObject.id === POTTERY_OVEN_ID && UNFIRED_POTTERY_IDS.has(item.id)) {
        await doFiring(player, item);
        return true;
    }

    return false;
}

module.exports = { onUseWithInventory, onUseWithGameObject };
