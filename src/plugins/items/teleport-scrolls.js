// read the plague city reward scroll to learn ardougne teleport, or the watchtower scroll to learn watchtower teleport
// sets the cache flag that spell.js gates casting on
//   752  magic scroll (ardougne teleport)
//   1181 spell scroll (watchtower teleport)

const MAGIC_SCROLL_ID = 752;
const SPELL_SCROLL_ID = 1181;

async function onInventoryCommand(player, item) {
    const { world } = player;

    if (item.id === MAGIC_SCROLL_ID) {
        if (player.cache.ardougne_scroll && player.questStages.plagueCity === -1) {
            player.message('@que@The scroll crumbles to dust');
            await world.sleepTicks(3);
        } else {
            player.message('@que@You memorise what is written on the scroll');
            await world.sleepTicks(3);
            player.message('@que@You can now cast the Ardougne teleport spell');
            await world.sleepTicks(3);
            player.message('@que@Provided you have the required runes and magic level');
            await world.sleepTicks(3);
            player.message('@que@The scroll crumbles to dust');
            await world.sleepTicks(3);
        }

        player.inventory.remove(MAGIC_SCROLL_ID);

        if (!player.cache.ardougne_scroll) {
            player.cache.ardougne_scroll = true;
        }

        return true;
    }

    if (item.id === SPELL_SCROLL_ID) {
        if (player.cache.watchtower_scroll && player.questStages.watchtower === -1) {
            player.message('@que@The scroll crumbles to dust');
            await world.sleepTicks(3);
        } else {
            player.message('@que@You memorise what is written on the scroll');
            await world.sleepTicks(3);
            player.message('@que@You can now cast the Watchtower teleport spell');
            await world.sleepTicks(3);
            player.message('@que@Provided you have the required runes and magic level');
            await world.sleepTicks(3);
            player.message('@que@The scroll crumbles to dust');
            await world.sleepTicks(3);
        }

        player.inventory.remove(SPELL_SCROLL_ID);

        if (!player.cache.watchtower_scroll) {
            player.cache.watchtower_scroll = true;
        }

        return true;
    }

    return false;
}

module.exports = { onInventoryCommand };
