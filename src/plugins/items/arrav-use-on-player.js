// hand a shield of arrav / gang quest item to another player; ironman-only on
// either side, since ironmen can't trade normally
//
// gated item ids:
//   48  phoenix gang weapon key       53  broken shield (arrav half 1)
//   54  broken shield (arrav half 2)  61  certificate
//   582 miscellaneous key             585 candlestick

const GATED_ITEM_IDS = new Set([48, 53, 54, 61, 582, 585]);

async function onUseWithPlayer(player, otherPlayer, item) {
    if (!GATED_ITEM_IDS.has(item.id)) {
        return false;
    }

    if (!player.isIronMan() && !otherPlayer.isIronMan()) {
        return false;
    }

    if (otherPlayer.inventory.isFull()) {
        player.message(
            "Other player doesn't have enough inventory space to receive the object"
        );
        return true;
    }

    player.inventory.remove(item.id);
    otherPlayer.inventory.add(item.id);

    player.message(`@que@You give the ${item.definition.name} to ${otherPlayer.username}`);
    await player.world.sleepTicks(1);
    otherPlayer.message(`${player.username} has given you a ${item.definition.name}`);

    return true;
}

module.exports = { onUseWithPlayer };
