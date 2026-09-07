// https://classic.runescape.wiki/w/Sheep
//
// sheep shearing: repeats while batching (80% wool, 20% escape) up to the
// player's free inventory slots, else a single attempt

const { wantBatching } = require('../skills/batch');

const SHEARS_ID = 144;
const SHEEP_ID = 2;
const WOOL_ID = 145;

// max inventory size (inventory.js hardcodes 30 in isFull())
const MAX_INVENTORY = 30;

async function onUseWithNPC(player, npc, item) {
    if (npc.id !== SHEEP_ID || item.id !== SHEARS_ID) {
        return false;
    }

    const { world } = player;

    player.lock();
    npc.lock();
    player.faceEntity(npc);
    npc.faceEntity(player);

    // batch size = free slots when batching, else 1
    const repeat = wantBatching(player)
        ? Math.max(1, MAX_INVENTORY - player.inventory.items.length)
        : 1;

    player.gatheringSkill = true;

    try {
        for (let i = 0; i < repeat; i += 1) {
            player.sendBubble(SHEARS_ID);
            player.message('You attempt to shear the sheep');

            await world.sleepTicks(3);

            // 80% success; escape only on a 1-in-5 roll
            if (Math.floor(Math.random() * 5) !== 0) {
                player.message('You get some wool');
                player.inventory.add(WOOL_ID);
            } else {
                player.message('The sheep manages to get away from you!');
                break;
            }

            await world.sleepTicks(2);
        }
    } finally {
        player.gatheringSkill = false;
    }

    player.unlock();
    npc.unlock();

    return true;
}

module.exports = { onUseWithNPC };
