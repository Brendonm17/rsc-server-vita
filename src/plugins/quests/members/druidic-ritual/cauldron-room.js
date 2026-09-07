const { ENCHANTED_IDS } = require('./sanfew');

const NONENCHANTED_IDS = {
    bear: 502,
    beef: 504,
    chicken: 133,
    rat: 503
};

const SUIT_OF_ARMOR_ID = 206;

const CAULDRON_OF_THUNDER_ID = 236;

const GUARDED_DOOR_ID = 63;
const OTHER_DOORS_ID = 64;

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== CAULDRON_OF_THUNDER_ID) {
        return false;
    }

    const nonEnchanted = Object.values(NONENCHANTED_IDS);
    if (!nonEnchanted.includes(item.id)) {
        return false;
    }

    // before the quest is started, dipping does nothing; any later stage allows it
    const stage = player.questStages.druidicRitual;
    if (!stage || stage <= 0) {
        player.message('Nothing interesting happens');
        return true;
    }

    const { world } = player;

    switch (item.id) {
        case NONENCHANTED_IDS.bear:
            player.message('You dip the bear meat in the cauldron');
            await world.sleepTicks(3);
            player.inventory.remove(NONENCHANTED_IDS.bear);
            player.inventory.add(ENCHANTED_IDS.bear);
            break;
        case NONENCHANTED_IDS.beef:
            player.message('You dip the beef in the cauldron');
            await world.sleepTicks(3);
            player.inventory.remove(NONENCHANTED_IDS.beef);
            player.inventory.add(ENCHANTED_IDS.beef);
            break;
        case NONENCHANTED_IDS.chicken:
            player.message('You dip the chicken in the cauldron');
            await world.sleepTicks(3);
            player.inventory.remove(NONENCHANTED_IDS.chicken);
            player.inventory.add(ENCHANTED_IDS.chicken);
            break;
        case NONENCHANTED_IDS.rat:
            player.message('You dip the rat meat in the cauldron');
            await world.sleepTicks(3);
            player.inventory.remove(NONENCHANTED_IDS.rat);
            player.inventory.add(ENCHANTED_IDS.rat);
            break;
    }

    return true;
}

async function onWallObjectCommandOne(player, wallObject) {
    // ids 63/64 are the generic door graphic reused mapwide, so gate on y to
    // match only this guarded doorway (y 3332) and its neighbour (3336).
    if (wallObject.id === GUARDED_DOOR_ID) {
        if (wallObject.y !== 3332) {
            return false;
        }
        if (player.x > wallObject.x - 1) {
            if (player.opponent && player.opponent.id === SUIT_OF_ARMOR_ID) {
                return true;
            }

            const suitOfArmors = player
                .getNearbyEntitiesByID('npcs', SUIT_OF_ARMOR_ID)
                .filter((npc) => {
                    return (
                        !npc.locked && player.localEntities.known.npcs.has(npc)
                    );
                });

            const suitOfArmor =
                suitOfArmors[Math.floor(Math.random() * suitOfArmors.length)];

            if (suitOfArmor) {
                player.message('Suddenly the suit of armour comes to life!');
                suitOfArmor.attack(player);
                return true;
            }
        }

        await player.enterDoor(wallObject);
        return true;
    } else if (wallObject.id === OTHER_DOORS_ID) {
        if (wallObject.y !== 3336 && wallObject.y !== 3332) {
            return false;
        }
        await player.enterDoor(wallObject);
        return true;
    }

    return false;
}

module.exports = { onUseWithGameObject, onWallObjectCommandOne };
