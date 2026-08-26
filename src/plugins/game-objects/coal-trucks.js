// coal truck: cached deposit counter, capped at 120

const COAL_ID = 155;
const COAL_TRUCK_ID = 383;
const COAL_TRUCK_CAP = 120;

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== COAL_TRUCK_ID) {
        return false;
    }

    const coalLeft = player.cache.coal_truck || 0;

    if (coalLeft > 0) {
        player.message('@que@You remove a piece of coal from the truck');
        player.inventory.add(COAL_ID);
        player.cache.coal_truck = coalLeft - 1;
    } else {
        player.message('@que@there is no coal left in the truck"');
    }

    return true;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (gameObject.id !== COAL_TRUCK_ID || item.id !== COAL_ID) {
        return false;
    }

    const { world } = player;

    let coalAmount = 0;

    for (const invItem of player.inventory.items) {
        if (invItem.id === COAL_ID) {
            coalAmount += invItem.amount || 1;
        }
    }

    for (let i = 0; i < coalAmount; i += 1) {
        const stored = player.cache.hasOwnProperty('coal_truck')
            ? player.cache.coal_truck
            : undefined;

        if (stored !== undefined) {
            if (stored >= COAL_TRUCK_CAP) {
                player.message('@que@The coal truck is full');
                break;
            }

            player.cache.coal_truck = stored + 1;
        } else {
            // first-ever deposit jumps the counter to the full amount, not 1
            player.cache.coal_truck = coalAmount;
        }

        player.message('@que@You put a piece of coal in the truck');
        player.inventory.remove(COAL_ID);
        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onGameObjectCommandOne, onUseWithGameObject };
