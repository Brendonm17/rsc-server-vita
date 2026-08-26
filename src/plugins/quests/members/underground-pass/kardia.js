// underground pass - kardia the witch's house

const { questsEnabled } = require('../../custom-gate.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

// getCurrentLevel(HITS)/5 + 5
function witchDamage(player) {
    return Math.floor(player.skills.hits.current / 5) + 5;
}

// wall-object command one (open / look through)
async function onWallObjectCommandOne(player, wo) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (wo.id === IDS.WITCH_RAILING) {
        player.message('inside you see Kardia the witch');
        await world.sleepTicks(3);
        player.message("her appearence make's you feel quite ill");
        return true;
    }

    if (wo.id === IDS.WITCH_DOOR) {
        if (player.cache.kardia_cat) {
            player.message('you open the door');
            await world.sleepTicks(3);
            player.message('and walk through');
            await world.sleepTicks(3);
            player.message('the witch is busy talking to the cat');
        } else {
            const witch = player.getNearbyEntitiesByID(
                'npcs',
                IDS.KARDIA_THE_WITCH,
                5
            )[0];
            player.message('you reach to open the door');
            if (witch) {
                await witch.say('get away...far away from here');
                await world.sleepTicks(2);
                player.message('the witch raises her hands above her');
                player.damage(witchDamage(player));
                await witch.say('haa haa.. die mortal');
            } else {
                player.message('but nothing seems to happen');
            }
        }
        return true;
    }

    return false;
}

// wall-object command two (knock on the door)
async function onWallObjectCommandTwo(player, wo) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wo.id !== IDS.WITCH_DOOR) {
        return false;
    }

    const { world } = player;

    if (player.inventory.has(IDS.KARDIA_CAT) && !player.cache.kardia_cat) {
        player.message('you place the cat by the door');
        await world.sleepTicks(3);
        player.inventory.remove(IDS.KARDIA_CAT, 1);
        player.teleport(776, 3535);
        player.message('you knock on the door and hide around the corner');
        await world.sleepTicks(3);
        player.message('the witch takes the cat inside');
        player.cache.kardia_cat = true;
    } else if (player.cache.kardia_cat) {
        player.message('there is no reply');
        await world.sleepTicks(3);
        player.message('inside you can hear the witch talking to her cat');
    } else {
        player.message('you knock on the door');
        await world.sleepTicks(3);
        player.message('there is no reply');
    }

    return true;
}

// use cat on the door
async function onUseWithWallObject(player, wo, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wo.id !== IDS.WITCH_DOOR || item.id !== IDS.KARDIA_CAT) {
        return false;
    }

    const { world } = player;

    if (!player.cache.kardia_cat) {
        player.message('you place the cat by the door');
        await world.sleepTicks(3);
        player.inventory.remove(IDS.KARDIA_CAT, 1);
        player.teleport(776, 3535);
        player.message('you knock on the door and hide around the corner');
        await world.sleepTicks(3);
        player.message('the witch takes the cat inside');
        player.cache.kardia_cat = true;
    } else {
        player.message('the witch is busy playing...');
        await world.sleepTicks(3);
        player.message('with her other cat');
    }

    return true;
}

// witch chest
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== IDS.WITCH_CHEST) {
        return false;
    }

    const { world } = player;

    player.message('you search the chest');
    await world.sleepTicks(3);
    if (getStage(player) === 6 && !player.cache.doll_of_iban) {
        player.message('..inside you find a book a wooden doll..');
        player.message('...and two potions');
        player.inventory.add(IDS.A_DOLL_OF_IBAN, 1);
        player.inventory.add(IDS.OLD_JOURNAL, 1);
        player.inventory.add(IDS.FULL_SUPER_ATTACK_POTION, 1);
        player.inventory.add(IDS.FULL_STAT_RESTORATION_POTION, 1);
        player.cache.doll_of_iban = true;
    } else {
        player.message('but you find nothing of interest');
    }

    return true;
}

// picking up a duplicate Kardia cat is blocked
async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        groundItem.id === IDS.KARDIA_CAT &&
        player.inventory.has(IDS.KARDIA_CAT)
    ) {
        const { world } = player;
        player.message("it's not very nice to squeeze one cat into a satchel");
        await world.sleepTicks(3);
        player.message("...two's just plain cruel!");
        return true; // block the pickup
    }

    return false;
}

module.exports = {
    onWallObjectCommandOne,
    onWallObjectCommandTwo,
    onUseWithWallObject,
    onGameObjectCommandOne,
    onGroundItemTake
};
