// misc world objects: carts, ladders, ships, gates, plant

const SHILO_CART_ID = 613;
const SHILO_CART_X = 384;
const SHILO_CART_Y = 851;

const GNOME_TREE_STONE_ID = 643;
const GNOME_TREE_STONE_X = 416;
const GNOME_TREE_STONE_Y = 161;

const SEWER_CAVE_ENTRANCE_ID = 417;

const PORT_SARIM_SHIP_IDS = new Set([241, 242, 243]);

const CHAOS_ALTAR_TUNNEL_ID = 1241;
const EDGEVILLE_ROWBOAT_ID = 1242;

const SMUGGLING_GATE_ID = 513;
const SMUGGLING_GATE_X = 93;
const SMUGGLING_GATE_Y = 521;

const ARDOUGNE_WALL_GATEWAY_ID = 450;

const MAN_EATING_PLANT_ID = 400;

// fatigue scale here is half the OpenRSC scale; 75000 is max
const MAX_FATIGUE = 75000;

async function shiloCart(player, gameObject, command) {
    if (gameObject.x !== SHILO_CART_X || gameObject.y !== SHILO_CART_Y) {
        return false;
    }

    const { world } = player;

    if (player.x >= 386) {
        player.message('@que@You climb up onto the cart.');
        await world.sleepTicks(3);
        player.message(
            '@que@You nimbly jump from one side of the cart...'
        );
        await world.sleepTicks(3);
        player.teleport(383, 852);
        player.message('@que@...to the other and climb down again.');
        return true;
    }

    const questComplete = player.questStages.shiloVillage === -1;

    if (command === 'search' || questComplete) {
        player.message('@que@It looks as if you can climb across.');
        await world.sleepTicks(3);
        player.message('@que@You search the cart.');
        await world.sleepTicks(3);

        if (player.fatigue >= MAX_FATIGUE) {
            player.message('@que@You are too fatigued to attempt climb across');
            return true;
        }

        player.message('@que@You may be able to climb across the cart.');
        await world.sleepTicks(3);
        player.message('@que@Would you like to try?');
        await world.sleepTicks(3);

        const choice = await player.ask(
            [
                'Yes, I am am very nimble and agile!',
                'No, I am happy where I am thanks!'
            ],
            false
        );

        if (choice === 0) {
            player.message('@que@You climb up onto the cart');
            await world.sleepTicks(3);
            player.message(
                '@que@You nimbly jump from one side of the cart to the other.'
            );
            await world.sleepTicks(3);
            player.teleport(386, 852);
            player.message('@que@And climb down again');
        } else {
            player.message(
                '@que@You think better of clambering over the cart, you ' +
                    'might get dirty.'
            );
            await world.sleepTicks(3);
            await player.say(
                "I'd probably have just scraped my knees up as well."
            );
        }

        return true;
    }

    // quest not yet complete, not searching: undead-warning flavour text.
    player.message(
        '@que@You approach the cart and see undead creatures gathering by ' +
            'the village gates.'
    );
    await world.sleepTicks(3);
    player.message('@que@There is a note attached to the cart.');
    await world.sleepTicks(3);
    player.message('@que@The note says,');
    await world.sleepTicks(3);
    player.message(
        '@que@@gre@Danger deadly green mist do not enter if you value your life'
    );
    await world.sleepTicks(3);

    const mosol = player.getNearestEntityByID('npcs', 539, 15);

    if (mosol) {
        await mosol.say('You must be a maniac to go in there!');
    }

    return true;
}

async function gnomeTreeStone(player, gameObject) {
    if (
        gameObject.x !== GNOME_TREE_STONE_X ||
        gameObject.y !== GNOME_TREE_STONE_Y
    ) {
        return false;
    }

    player.message('@que@You twist the stone tile to one side');

    if (player.questStages.grandTree === -1) {
        await player.world.sleepTicks(2);
        player.message('@que@It reveals a ladder, you climb down');
        player.teleport(703, 3284, false);
    } else {
        player.message('@que@but nothing happens');
    }

    return true;
}

async function sewerCaveEntrance(player, gameObject) {
    if (gameObject.id !== SEWER_CAVE_ENTRANCE_ID) {
        return false;
    }

    player.message('@que@you enter the cave');
    player.teleport(617, 3479);
    player.message('@que@it leads downwards to the sewer');

    return true;
}

async function portSarimShip(player, gameObject) {
    if (!PORT_SARIM_SHIP_IDS.has(gameObject.id)) {
        return false;
    }

    const { world } = player;

    player.message('@que@You board the ship');
    await world.sleepTicks(3);
    player.teleport(263, 660, false);
    await world.sleepTicks(4);
    player.message('@que@The ship arrives at Port Sarim');

    return true;
}

async function chaosAltarTunnel(player, gameObject) {
    if (gameObject.id !== CHAOS_ALTAR_TUNNEL_ID) {
        return false;
    }

    const { world } = player;

    if (player.cache.scotruth_to_chaos_altar) {
        player.message('@que@You step into the tunnel...');
        player.teleport(331, 213, false);
        await world.sleepTicks(4);
        player.message('@que@And find your way into the wilderness');
    } else {
        player.message("@que@You don't have permission to use this");
    }

    return true;
}

async function edgevilleRowboat(player, gameObject) {
    if (gameObject.id !== EDGEVILLE_ROWBOAT_ID) {
        return false;
    }

    const { world } = player;

    player.message('@que@You enter the rowboat...');
    await world.sleepTicks(3);
    player.teleport(206, 449);
    player.message('@que@And stop in Edgeville');

    return true;
}

async function smugglingGate(player, gameObject) {
    if (
        gameObject.id !== SMUGGLING_GATE_ID ||
        gameObject.x !== SMUGGLING_GATE_X ||
        gameObject.y !== SMUGGLING_GATE_Y
    ) {
        return false;
    }

    if (!player.world.members) {
        return false;
    }

    const newX = player.x === 94 ? 93 : 94;
    player.teleport(newX, player.y, false);

    return true;
}

async function ardougneWallGateway(player, gameObject) {
    if (gameObject.id !== ARDOUGNE_WALL_GATEWAY_ID) {
        return false;
    }

    const { world } = player;

    player.message('@que@you pull on the large wooden doors');
    await world.sleepTicks(3);

    if (player.questStages.biohazard === -1) {
        player.message('@que@you open it and walk through');

        const mourner = player.getNearestEntityByID('npcs', 444, 15) ||
            player.getNearestEntityByID('npcs', 445, 15) ||
            player.getNearestEntityByID('npcs', 451, 15) ||
            player.getNearestEntityByID('npcs', 469, 15) ||
            player.getNearestEntityByID('npcs', 491, 15);

        if (mourner) {
            await mourner.say('go through');
        }

        if (player.x >= 624) {
            player.teleport(620, 589);
        } else {
            player.teleport(626, 588);
        }
    } else {
        player.message('@que@but it will not open');
    }

    return true;
}

async function manEatingPlant(player, gameObject) {
    if (gameObject.id !== MAN_EATING_PLANT_ID) {
        return false;
    }

    player.message('@que@The plant takes a bite at you!');

    const damage = Math.floor(player.skills.hits.current / 10) + 2;
    player.damage(damage);

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (await sewerCaveEntrance(player, gameObject)) {
        return true;
    }

    if (await portSarimShip(player, gameObject)) {
        return true;
    }

    if (await chaosAltarTunnel(player, gameObject)) {
        return true;
    }

    if (await edgevilleRowboat(player, gameObject)) {
        return true;
    }

    if (await smugglingGate(player, gameObject)) {
        return true;
    }

    if (await ardougneWallGateway(player, gameObject)) {
        return true;
    }

    if (await manEatingPlant(player, gameObject)) {
        return true;
    }

    if (await gnomeTreeStone(player, gameObject)) {
        return true;
    }

    if (gameObject.id === SHILO_CART_ID) {
        return shiloCart(player, gameObject, 'examine');
    }

    return false;
}

// Shilo cart's "Search" command (second def command).
async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== SHILO_CART_ID) {
        return false;
    }

    return shiloCart(player, gameObject, 'search');
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
