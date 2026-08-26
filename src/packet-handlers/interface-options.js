// custom interface options (opcode 199) from the co-op client; only the party family (sub 12) exists on this wire
const party = require('../plugins/custom/party');

async function interfaceOptions({ player }, { sub, action, index, name }) {
    if (sub !== 12) {
        return;
    }

    switch (action) {
        case 1:
            party.leave(player);
            break;
        case 2: {
            // invite via right-clicking a visible player (u16 server index)
            const target = player.world.players.getByIndex(index);

            if (!target || !player.localEntities.known.players.has(target)) {
                return;
            }

            party.invite(player, target.username);
            break;
        }
        case 3:
            party.accept(player);
            break;
        case 4:
            party.decline(player);
            break;
        case 5:
            party.kick(player, name);
            break;
        case 9:
            // invite via the party tab's name prompt
            party.invite(player, name);
            break;
    }
}

module.exports = { interfaceOptions };
