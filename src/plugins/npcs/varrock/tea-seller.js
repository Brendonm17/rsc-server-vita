// tea seller shop; dialogue only on members worlds

const TEA_SELLER_ID = 780;
const DISPLAY_TEA_ID = 1285;

async function onTalkToNPC(player, npc) {
    if (npc.id !== TEA_SELLER_ID) {
        return false;
    }

    if (!player.world.members) {
        return true;
    }

    player.engage(npc);

    await npc.say('Greetings!', 'Are you in need of refreshment ?');

    const option = await player.ask(
        ['Yes please', 'No thanks', 'What are you selling ?'],
        true
    );

    if (option === 0) {
        player.disengage();
        player.openShop('tea-stall');
        return true;
    } else if (option === 1) {
        await npc.say(
            "Well, if you're sure",
            'You know where to come if you do !'
        );
    } else if (option === 2) {
        await npc.say(
            'Only the most delicious infusion',
            'Of the leaves of the tea plant',
            'Grown in the exotic regions of this world...',
            'Buy yourself a cup !'
        );
    }

    player.disengage();
    return true;
}

// blocks picking up the display tea prop
async function onGroundItemTake(player, groundItem) {
    if (groundItem.id !== DISPLAY_TEA_ID) {
        return false;
    }

    const teaSeller = player.world.npcs.getByID(TEA_SELLER_ID);

    if (teaSeller) {
        player.engage(teaSeller);
        await teaSeller.say(
            'Hey ! get your hands off that tea !',
            "That's for display purposes only",
            'Im not running a charity here !'
        );
        player.disengage();
    }

    return true;
}

module.exports = { onTalkToNPC, onGroundItemTake };
