// teleports the player out of the black hole area only

const DISK_OF_RETURNING_ID = 387;

// Java: DiskOfReturning.insideMines(Player) - X 250-315, Y 3325-3400.
function onBlackHole(player) {
    return (
        player.x >= 250 && player.x <= 315 && player.y >= 3325 && player.y <= 3400
    );
}

async function onInventoryCommand(player, item) {
    if (item.id !== DISK_OF_RETURNING_ID) {
        return false;
    }

    if (onBlackHole(player)) {
        player.message('You spin your disk of returning');
        player.teleport(311, 3348, true);
        player.inventory.remove(DISK_OF_RETURNING_ID);
    } else {
        player.message("The disk will only work from in Thordur's black hole");
    }

    return true;
}

module.exports = { onInventoryCommand };
