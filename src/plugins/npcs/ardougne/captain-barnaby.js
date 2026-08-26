// captain barnaby: ferries to karamja for 30 gold

const CAPTAIN_BARNABY_ID = 316;
const COINS_ID = 10;

// object 157 boards, object 155 is blocked with no action
const BOARD_SHIP = { id: 157, x: 536, y: 617 };
const BLOCKED_SHIP = { id: 155, x: 531, y: 617 };

const KARAMJA_ARRIVE = { x: 467, y: 651 };

async function travel(player, npc, option) {
    if (option === 0) {
        await npc.say(
            'No I need to stay alive',
            'I have a wife and family to support'
        );
    } else if (option === 1) {
        const { world } = player;

        if (player.inventory.has(COINS_ID, 30)) {
            player.inventory.remove(COINS_ID, 30);
            player.message('@que@You pay 30 gold');
            await world.sleepTicks(3);
            player.message('@que@You board the ship');
            await world.sleepTicks(3);
            player.teleport(KARAMJA_ARRIVE.x, KARAMJA_ARRIVE.y);
            await world.sleepTicks(2);
            player.message('@que@The ship arrives at Karamja');
            await world.sleepTicks(3);
        } else {
            await player.say("Oh dear I don't seem to have enough money");
        }
    }
}

async function talkToBarnaby(player, npc) {
    player.engage(npc);

    await npc.say(
        'Do you want to go on a trip to Karamja?',
        'The trip will cost you 30 gold'
    );

    const showCrandorOption =
        player.questStages.dragonSlayer !== -1 && !player.cache.ned_hired;

    if (!showCrandorOption) {
        const choice = await player.ask(['Yes please', 'No thankyou'], true);
        await travel(player, npc, choice + 1);
    } else {
        const choice = await player.ask(
            ["I'd rather go to Crandor Isle", 'Yes please', 'No thankyou'],
            true
        );
        await travel(player, npc, choice);
    }

    player.disengage();
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== CAPTAIN_BARNABY_ID) {
        return false;
    }

    await talkToBarnaby(player, npc);

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (
        gameObject.id === BLOCKED_SHIP.id &&
        gameObject.x === BLOCKED_SHIP.x &&
        gameObject.y === BLOCKED_SHIP.y
    ) {
        // blocks this instance, only object 157 does anything
        return true;
    }

    if (
        gameObject.id !== BOARD_SHIP.id ||
        gameObject.x !== BOARD_SHIP.x ||
        gameObject.y !== BOARD_SHIP.y
    ) {
        return false;
    }

    // OpenRSC onOpLoc: the player must be standing at y === 616.
    if (player.y !== 616) {
        return true;
    }

    const { world } = player;

    const captain = Array.from(world.npcs.getAllByID(CAPTAIN_BARNABY_ID)).find(
        (npc) => {
            return (
                !npc.interlocutor &&
                player.localEntities.known.npcs.has(npc) &&
                player.getDistance(npc) <= 5
            );
        }
    );

    if (captain) {
        await talkToBarnaby(player, captain);
    } else {
        player.message(
            '@que@I need to speak to the captain before boarding the ship.'
        );
    }

    return true;
}

module.exports = { onTalkToNPC, onGameObjectCommandOne };
