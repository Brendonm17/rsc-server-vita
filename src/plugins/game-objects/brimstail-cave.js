// cave entrance to brimstail's underground area

const CAVE_ID = 667;
const CAVE_DESTINATION = { x: 730, y: 3334 };

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== CAVE_ID) {
        return false;
    }

    player.message('you enter the cave');
    player.message('it leads to a ladder');
    player.message('you climb down');
    player.teleport(CAVE_DESTINATION.x, CAVE_DESTINATION.y);

    return true;
}

module.exports = { onGameObjectCommandOne };
