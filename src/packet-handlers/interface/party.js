// party tab interface options (sub 12), decoded into
// { sub, action, index, name, rank, setting, state }
const party = require('../../plugins/custom/party');

async function partyOptions(player, { action, index, name, rank, setting, state }) {
    switch (action) {
        case 0: // INIT
            party.init(player);
            break;
        case 1: // LEAVE
            party.leave(player);
            break;
        case 2: {
            // CREATE_OR_INVITE: invite a visible player by server index
            const target = player.world.players.getByIndex(index);

            if (!target || !player.localEntities.known.players.has(target)) {
                return;
            }

            party.invite(player, target.username);
            break;
        }
        case 3: // ACCEPT_INVITE
            party.accept(player);
            break;
        case 4: // DECLINE_INVITE
            party.decline(player);
            break;
        case 5: // KICK_PLAYER
            party.kick(player, name);
            break;
        case 6: // RANK_PLAYER
            party.rankPlayer(player, name, rank);
            break;
        case 7: // PARTY_SETTINGS
            party.updateSettings(player, setting, state);
            break;
        case 8: // SEND_PARTY_INFO (browse list)
            party.sendPartyList(player);
            break;
        case 9: // INVITE_PLAYER_OR_MAKE: party tab's name prompt
            party.invite(player, name);
            break;
    }
}

module.exports = { partyOptions };
