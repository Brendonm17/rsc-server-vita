// a bot retrieves items it dropped on the ground (mainly an unburned firemaking
// log) so a world of bots doesn't fill with litter; only its own drops, only when idle

const inventoryHandlers = require('../../../packet-handlers/inventory');

function busy(bot) {
    return !!(
        bot.opponent ||
        bot.locked ||
        (bot.walkQueue && bot.walkQueue.length) ||
        bot.gatheringSkill ||
        bot._bankRun || bot._foodRun || bot._runeRun || bot._ammoRun ||
        bot._gearRun || bot._shopTrip || bot._quest || bot._relocateSite ||
        bot._travel || bot._wanderTrek || bot.pendingPartyInvite ||
        (bot._processCd && bot._processCd > 0)
    );
}

function onTick(bot) {
    if (busy(bot)) {
        return false;
    }
    if (bot.inventory && bot.inventory.isFull && bot.inventory.isFull()) {
        return false; // no room to retrieve; a bank run will free space
    }
    if (bot._cleanupCd && bot._cleanupCd > 0) {
        bot._cleanupCd -= 1;
        return false;
    }
    let items = [];
    try {
        items = bot.getNearbyEntities('groundItems', 4) || [];
    } catch (e) {
        return false;
    }
    for (const gi of items) {
        if (!gi || gi.owner !== bot.id) {
            continue; // only its own litter
        }
        if (Math.abs(gi.x - bot.x) + Math.abs(gi.y - bot.y) <= 1) {
            try {
                inventoryHandlers
                    .groundItemTake({ player: bot }, { x: gi.x, y: gi.y, id: gi.id })
                    .catch(() => {});
            } catch (e) {
                // best-effort
            }
            bot._cleanupCd = 3;
            return true;
        }
    }
    return false;
}

module.exports = { onTick };
