
const BOUNDARY_ID = 165;
const YOHNUS_ID = 622;
const COINS_ID = 10;
const FURNACE_COST = 20;
const FURNACE_X = 400;
const FURNACE_Y = 844;
const EXIT_X = 400;
const EXIT_Y = 845;

// finds a nearby Yohnus NPC
function findNearbyYohnus(player) {
    const { world } = player;

    return Array.from(world.npcs.getAllByID(YOHNUS_ID)).find(
        (npc) =>
            !npc.interlocutor &&
            player.localEntities.known.npcs.has(npc) &&
            player.getDistance(npc) <= 5
    );
}

// furnace-payment menu
async function furnacePaymentMenu(player, npc) {
    const menu = await player.ask(
        ['Use Furnace - 20 Gold', 'No thanks!'],
        false
    );

    if (menu === 0) {
        if (player.inventory.has(COINS_ID, FURNACE_COST)) {
            player.inventory.remove(COINS_ID, FURNACE_COST);
            await npc.say('Thanks Bwana!', 'Enjoy the facilities!');
            player.teleport(FURNACE_X, FURNACE_Y);
            player.message(
                "You're shown into the Blacksmiths where you can see a furnace"
            );
        } else {
            await npc.say(
                'Sorry Bwana, it seems that you are short of funds.'
            );
        }
    } else if (menu === 1) {
        await player.say('No thanks!');
        await npc.say('Very well Bwana, have a nice day.');
    }
}

async function onOpBound(player, wallObject) {
    if (wallObject.id !== BOUNDARY_ID) {
        return false;
    }

    // already past the door: step back out for free
    if (player.y <= 844) {
        player.teleport(EXIT_X, EXIT_Y);
        return true;
    }

    const yohnus = findNearbyYohnus(player);

    if (yohnus) {
        await yohnus.say(
            'Sorry but the blacksmiths is closed.',
            'But I can let you use the furnace at the cost',
            'of 20 gold pieces.'
        );

        await furnacePaymentMenu(player, yohnus);
    }

    // claims id 165 unconditionally, no default fallback message
    return true;
}

async function onWallObjectCommandOne(player, wallObject) {
    return onOpBound(player, wallObject);
}

async function onWallObjectCommandTwo(player, wallObject) {
    return onOpBound(player, wallObject);
}

module.exports = { onWallObjectCommandOne, onWallObjectCommandTwo };
