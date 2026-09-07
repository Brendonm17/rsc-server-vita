const EXCLUDE_IDS = new Set([130, 198, 223, 227]);

const items = require('@2003scape/rsc-data/config/items');
const { co } = require('../npcs/combat-odyssey-shared');

// legend's guild second-floor stairs (id 41 at 516,1479) where biggum jumps into or back into the backpack
const LEGENDS_GUILD_STAIRS_ID = 41;
const LEGENDS_GUILD_STAIRS_X = 516;
const LEGENDS_GUILD_STAIRS_Y = 1479;
let biggumItemId = -1;

function biggumId() {
    if (biggumItemId < 0) {
        biggumItemId = items.findIndex((it) => it && it.name === 'Biggum Flodrot');
    }

    return biggumItemId;
}

function hasBiggum(player) {
    const id = biggumId();

    if (id < 0) {
        return false;
    }

    return (
        player.inventory.has(id) ||
        !!(player.bank && player.bank.items.some((it) => it.id === id))
    );
}

async function legendsGuildStairs(player) {
    if (!co.combatOdysseyEnabled(player)) {
        return;
    }

    const intro = co.getIntroStage(player);

    if (intro === co.TALKED_TO_RADIMUS) {
        await co.meetBiggum(player);
    } else if (
        intro !== co.NOT_STARTED &&
        co.getPrestige(player) < 1 &&
        !hasBiggum(player)
    ) {
        await co.recoverBiggum(player);
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (EXCLUDE_IDS.has(gameObject.id)) {
        return false;
    }
    if (/go up|climb(-| )up/i.test(gameObject.definition.commands[0])) {
        const { world } = player;

        if (/ladder/i.test(gameObject.definition.name)) {
            player.message('You climb up the ladder');
        }

        player.climb(gameObject, true);
        await world.sleepTicks(1);

        if (
            gameObject.id === LEGENDS_GUILD_STAIRS_ID &&
            gameObject.x === LEGENDS_GUILD_STAIRS_X &&
            gameObject.y === LEGENDS_GUILD_STAIRS_Y
        ) {
            await legendsGuildStairs(player);
        }

        return true;
    } else if (
        /go down|climb(-| )down/i.test(gameObject.definition.commands[0])
    ) {
        const { world } = player;

        if (/ladder/i.test(gameObject.definition.name)) {
            player.message('@que@You climb down the ladder');
        }

        player.climb(gameObject, false);
        await world.sleepTicks(1);
        return true;
    }

    return false;
}

module.exports = { onGameObjectCommandOne };
