// dropping bat bones on the pentagram summons thrantax

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    THRANTAX_ID,
    BAT_BONES_ID,
    LIT_BLACK_CANDLE_ID,
    PENTAGRAM_X,
    PENTAGRAM_Y
} = require('./ids.js');

function spawnThrantax(player) {
    const { world } = player;

    const thrantax = new NPC(world, {
        id: THRANTAX_ID,
        x: PENTAGRAM_X,
        y: PENTAGRAM_Y,
        minX: PENTAGRAM_X - 1,
        maxX: PENTAGRAM_X + 1,
        minY: PENTAGRAM_Y - 1,
        maxY: PENTAGRAM_Y + 1
    });

    delete thrantax.respawn;

    // OpenRSC spawns him for ~63 seconds (105 ticks)
    world.setTickTimeout(() => {
        world.removeEntity('npcs', thrantax);
    }, 105);

    world.addEntity('npcs', thrantax);

    return thrantax;
}

async function onDropItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    // blockDropObj: exact tile, bat bones, magic words known, lit black candle in inventory
    if (
        player.x !== PENTAGRAM_X ||
        player.y !== PENTAGRAM_Y ||
        item.id !== BAT_BONES_ID ||
        !('magic_words' in player.cache) ||
        !player.inventory.has(LIT_BLACK_CANDLE_ID)
    ) {
        return false;
    }

    const { world } = player;

    const thrantax = spawnThrantax(player);
    thrantax.displayNpcTeleportBubble &&
        thrantax.displayNpcTeleportBubble(thrantax.x, thrantax.y);

    player.message('Suddenly a demon appears');

    player.engage(thrantax);
    await player.say('Now what were those magic words?');

    const opt = await player.ask(
        [
            'Snarthtrick Candanto Termon',
            'Snarthon Candtrick Termanto',
            'Snarthanto Candon Termtrick'
        ],
        false
    );

    if (opt === 1) {
        await player.say('Snarthon Candtrick Termanto');
        await thrantax.say(
            'rarrrrgh',
            'You have me in your control',
            'What do you wish of me?',
            'So that I may return to the nether regions'
        );
        await player.say('I wish to free Merlin from his giant crystal');
        await thrantax.say(
            'rarrrrgh',
            'It is done, you can now shatter Merlins crystal with Excalibur'
        );

        player.disengage();
        world.removeEntity('npcs', thrantax);
        player.questStages[QUEST_KEY] = 4;
        return true;
    }

    if (opt === 0) {
        await player.say('Snarthtrick Candato Termon');
    } else if (opt === 2) {
        await player.say('Snarthanto Candon Termtrick');
    }

    await thrantax.say('rarrrrgh');

    if (player.inventory.has(LIT_BLACK_CANDLE_ID)) {
        player.inventory.remove(LIT_BLACK_CANDLE_ID);
    }

    player.disengage();
    await thrantax.attack(player);

    return true;
}

module.exports = { onDropItem };
