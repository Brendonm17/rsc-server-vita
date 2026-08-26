// battlefield objects: ballista, stronghold wall, khazard chest, fence door

const { questsEnabled } = require('../../custom-gate.js');
const {
    BALLISTA_ID,
    STRONGHOLD_WALL_ID,
    KHAZARD_CHEST_OPEN_ID,
    KHAZARD_CHEST_CLOSED_ID,
    FENCE_DOOR_ID,
    ORB_OF_PROTECTION_ID,
    KHAZARD_COMMANDER_ID
} = require('./constants.js');

// correct shot: height=coord4 (index 3), x=coord3 (index 2), y=coord5 (index 4)
async function fireBallistaMenu(player, gameObject) {
    const { world } = player;
    const options = ['coord 1', 'coord 2', 'coord 3', 'coord 4', 'coord 5'];

    let firstOption = false;
    let secondOption = false;
    let thirdOption = false;

    player.message('To fire the ballista you Must first set the coordinates');
    await world.sleepTicks(3);
    player.message('Set the height coordinate to');
    await world.sleepTicks(3);

    const menuOne = await player.ask(options, false);
    player.message('Set the x coordinate to');
    if (menuOne === 3) {
        firstOption = true;
    }

    const menuTwo = await player.ask(options, false);
    player.message('Set the y coordinate to');
    if (menuTwo === 2) {
        secondOption = true;
    }

    const menuThree = await player.ask(options, false);
    if (menuThree === 4) {
        thirdOption = true;
    }

    player.message('You fire the ballista');
    player.message('The huge spear flies through the air');
    await world.sleepTicks(3);

    if (firstOption && secondOption && thirdOption) {
        player.message('And screams down directly into the Khazard stronghold');
        await world.sleepTicks(3);
        player.message('A deafening crash echoes over the battlefield');
        await world.sleepTicks(3);
        player.message('The front entrance is reduced to rubble');
        await world.sleepTicks(3);
        player.questStages.treeGnomeVillage = 5;
    } else {
        player.message('Straight over the khazard stronghold');
        await world.sleepTicks(3);
        player.message('Into the valleys behond');
        await world.sleepTicks(3);
        player.message('You\'ve missed the target');
        await world.sleepTicks(3);
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages.treeGnomeVillage || 0;

    // Ballista (388)
    if (gameObject.id === BALLISTA_ID) {
        if (stage >= 5 || stage === -1) {
            player.message('The ballista has been damaged, it is out of use');
            return true;
        } else if (stage < 4) {
            player.message('The ballista is damaged');
            await world.sleepTicks(3);
            player.message(
                'It cannot be used until the gnomes have finished their repairs'
            );
            await world.sleepTicks(3);
            return true;
        } else if (stage === 4) {
            await fireBallistaMenu(player, gameObject);
            return true;
        }
        return true;
    }

    // Stronghold wall (393)
    if (gameObject.id === STRONGHOLD_WALL_ID) {
        if (stage >= 5 || stage === -1) {
            player.message('The wall is reduced to');
            await world.sleepTicks(3);
            player.message('Rubble, you manage to climb over');
            await world.sleepTicks(3);
            if (player.y >= 633) {
                player.teleport(659, 632, false);
                if (!player.cache.hasOwnProperty('over_gnomefield_wall')) {
                    const commander = player.getNearestEntityByID(
                        'npcs',
                        KHAZARD_COMMANDER_ID,
                        12
                    );
                    if (commander) {
                        player.engage(commander);
                        await commander.say(
                            'what?! how did you manage to get in here?'
                        );
                        await player.say('i\'ve come for the orb');
                        await commander.say('i\'ll never let you take it!');
                        player.disengage();
                        await commander.attack(player);
                    }
                    player.cache.over_gnomefield_wall = true;
                }
            } else {
                player.teleport(659, 633, false);
            }
        } else {
            if (player.y >= 633) {
                player.message('The wall is damaged');
                await world.sleepTicks(3);
                player.message('But not enough to climb through');
                await world.sleepTicks(3);
            } else {
                player.message('The wall is glitchy');
                await world.sleepTicks(3);
                player.message('you manage to climb over');
                await world.sleepTicks(3);
                player.teleport(659, 633, false);
            }
        }
        return true;
    }

    // Khazard chest closed (410): "open"
    if (gameObject.id === KHAZARD_CHEST_CLOSED_ID) {
        world.replaceEntity('gameObjects', gameObject, KHAZARD_CHEST_OPEN_ID);
        player.message('You open the chest');
        return true;
    }

    // Khazard chest open (409): "search"
    if (gameObject.id === KHAZARD_CHEST_OPEN_ID) {
        if (!player.inventory.has(ORB_OF_PROTECTION_ID)) {
            player.message('You search the chest');
            player.message('And find the orb of protection');
            player.inventory.add(ORB_OF_PROTECTION_ID, 1);
        } else {
            player.message('You search the chest, but find nothing');
        }
        return true;
    }

    return false;
}

// Khazard chest open (409): second command is "close".
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== KHAZARD_CHEST_OPEN_ID) {
        return false;
    }

    const { world } = player;
    world.replaceEntity('gameObjects', gameObject, KHAZARD_CHEST_CLOSED_ID);
    player.message('You close the chest');
    return true;
}

// push through the fence
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id !== FENCE_DOOR_ID) {
        return false;
    }

    player.message('You push your way through the fence');
    await player.enterDoor(wallObject);
    return true;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne
};
