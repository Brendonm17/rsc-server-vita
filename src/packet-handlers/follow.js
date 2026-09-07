async function playerFollow({ player }, { index }) {
    const { world } = player;
    const otherPlayer = world.players.getByIndex(index);

    if (!otherPlayer) {
        throw new RangeError(`invalid player index ${index}`);
    }

    if (!player.localEntities.known.players.has(otherPlayer)) {
        throw new RangeError(`player trying to follow unknown target player`);
    }

    // silently refuse a follow request while fighting or locked
    if (player.opponent || player.locked) {
        return;
    }

    player.following = otherPlayer;
    player.message(`Following ${otherPlayer.getFormattedUsername()}`);
}

module.exports = { playerFollow };
