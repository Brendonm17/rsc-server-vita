// Magic Guild portals. wall-objects 147/148/149 = "magic portal" with an "enter" command, placed at the Yanille
// Wizards' Guild north/west/south tiles. BoundaryId MAGIC_PORTAL_WIZARDS_GUILD_NORTH(147)/EAST(148)/SOUTH(149). dispatch gates purely on wall-object id (inArray(obj.getID(), MAGIC_PORTALS)), no coordinate check

const MAGIC_PORTAL_1 = 147;
const MAGIC_PORTAL_2 = 148;
const MAGIC_PORTAL_3 = 149;

const PORTAL_DESTINATIONS = {
    [MAGIC_PORTAL_1]: [212, 695],
    [MAGIC_PORTAL_2]: [511, 1452],
    [MAGIC_PORTAL_3]: [362, 1515]
};

async function onWallObjectCommandOne(player, wallObject) {
    if (!PORTAL_DESTINATIONS.hasOwnProperty(wallObject.id)) {
        return false;
    }

    const { world } = player;

    player.message('@que@you enter the magic portal');

    const [x, y] = PORTAL_DESTINATIONS[wallObject.id];
    player.teleport(x, y, false);

    await world.sleepTicks(2);

    // displayTeleportBubble at the player's post-teleport (destination) position
    player.sendTeleportBubble(x, y);

    return true;
}

module.exports = { onWallObjectCommandOne };
