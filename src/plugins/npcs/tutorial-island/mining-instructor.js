
const { hasStage, getStage, setStage } = require('./stage');

const MINING_INSTRUCTOR_ID = 482;
const BRONZE_PICKAXE_ID = 156;

async function onTalkToNPC(player, npc) {
    if (npc.id !== MINING_INSTRUCTOR_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    const stage = getStage(player);
    const { world } = player;

    player.engage(npc);

    if (stage === 45) {
        await player.say('Good day to you');
        await npc.say(
            "hello I'm a veteran miner!",
            "I'm here to show you how to mine",
            'If you want to quickly find out what is in a rock you can ' +
                'prospect it',
            'right click on this rock here',
            'And select prospect'
        );
        setStage(player, 49);
    } else if (stage === 49) {
        await player.say('Hello again');
        await npc.say(
            "You haven't prospected that rock yet",
            'Right click on it and select prospect'
        );
    } else if (stage === 50) {
        await player.say("There's tin ore in that rock");
        await npc.say(
            "Yes, thats what's in there",
            'Ok you need to get that tin out of the rock',
            'First of all you need a pick',
            'And here we have a pick'
        );
        player.message('The instructor somehow produces a large pickaxe from inside his jacket');
        await world.sleepTicks(3);
        player.message('The instructor gives you the pickaxe');
        await world.sleepTicks(3);
        player.inventory.add(BRONZE_PICKAXE_ID, 1);
        await npc.say('Now hit those rocks');
        setStage(player, 51);
    } else if (stage === 51) {
        if (!player.inventory.has(BRONZE_PICKAXE_ID)) {
            await player.say('I have lost my pickaxe');
            player.message('The instructor somehow produces a large pickaxe from inside his jacket');
            await world.sleepTicks(3);
            player.message('The instructor gives you the pickaxe');
            await world.sleepTicks(3);
            player.inventory.add(BRONZE_PICKAXE_ID, 1);
        }

        await npc.say(
            'to mine a rock just left click on it',
            'If you have a pickaxe in your inventory you might get some ore'
        );
    } else if (stage >= 52) {
        if (stage === 52) {
            await npc.say('very good');
        }

        await npc.say(
            'If at a later date you find a rock with copper ore',
            'You can take the copper ore and tin ore to a furnace',
            'use them on the furnace to make bronze bars',
            'which you can then either sell',
            'or use on anvils with a hammer',
            'To make weapons',
            'as your mining and smithing levels grow',
            'you will be able to mine various exciting new metals',
            'now go through the next door to speak to the bankers'
        );

        if (stage === 52) {
            setStage(player, 55);
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
