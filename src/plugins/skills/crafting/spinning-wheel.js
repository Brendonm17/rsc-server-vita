// https://classic.runescape.wiki/w/Spinning_wheel
// https://classic.runescape.wiki/w/Crafting#Spinning
// spins every held wool/flax in one go when batch progression is on

const { wantBatching } = require('../batch');

const BALL_OF_WOOL_ID = 207;
const BOWSTRING_ID = 676;
const FLAX_ID = 675;
const SPINNING_WHEEL_ID = 121;
const WOOL_ID = 145;

async function onUseWithGameObject(player, gameObject, item) {
    if (
        gameObject.id !== SPINNING_WHEEL_ID ||
        !(item.id === WOOL_ID || item.id === FLAX_ID)
    ) {
        return false;
    }

    const { world } = player;

    player.lock();

    const repeat = wantBatching(player)
        ? player.inventory.items.filter(({ id }) => id === item.id).length
        : 1;

    for (let i = 0; i < repeat; i += 1) {
        if (!player.inventory.has(item.id)) {
            break;
        }

        if (item.id === FLAX_ID && player.skills.crafting.current < 10) {
            player.message(
                'You need to have a crafting of level 10 or higher to make a bow string'
            );
            break;
        }

        player.sendBubble(item.id);
        player.inventory.remove(item.id);
        player.sendSound('mechanical');

        if (item.id === WOOL_ID) {
            player.message(
                'You spin the sheeps wool into a nice ball of wool'
            );
            player.inventory.add(BALL_OF_WOOL_ID);
            player.addExperience('crafting', 10);
        } else {
            player.message('You make the flax into a bow string');
            player.inventory.add(BOWSTRING_ID);
            player.addExperience('crafting', 60);
        }

        await world.sleepTicks(1);
    }

    player.unlock();
    return true;
}

module.exports = { onUseWithGameObject };
