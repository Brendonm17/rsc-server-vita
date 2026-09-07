// the grail can't be taken until the realm is restored; king percival then hands over a takeable grail

const { questsEnabled } = require('../../custom-gate.js');
const { HOLY_GRAIL_ID } = require('./ids.js');

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        groundItem.id === HOLY_GRAIL_ID &&
        groundItem.x === 418 &&
        groundItem.y === 1924
    ) {
        const { world } = player;
        player.message("@que@You feel that the grail shouldn't be moved");
        await world.sleepTicks(3);
        player.message(
            '@que@You must complete some task here before you are worthy'
        );
        await world.sleepTicks(3);
        return true; // block pickup
    }

    return false;
}

module.exports = { onGroundItemTake };
