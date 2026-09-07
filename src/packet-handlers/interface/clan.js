// interface options, clan family (sub 11): the clan tab's actions
// decoded by patches/socket-clan.js into { sub, action, name, tag, rank, setting, state }
const clan = require('../../plugins/custom/clan');

async function clanOptions(player, { action, name, tag, rank, setting, state }) {
    switch (action) {
        case 0: // CREATE
            await clan.createClan(player, name, tag);
            break;
        case 1: // LEAVE
            await clan.leave(player);
            break;
        case 2: // INVITE_PLAYER
            await clan.invitePlayer(player, name);
            break;
        case 3: // ACCEPT_INVITE
            await clan.accept(player);
            break;
        case 4: // DECLINE_INVITE
            await clan.declineInvite(player);
            break;
        case 5: // KICK_PLAYER
            await clan.kickPlayer(player, name);
            break;
        case 6: // RANK_PLAYER
            await clan.rankPlayer(player, name, rank);
            break;
        case 7: // CLAN_SETTINGS
            await clan.updateSettings(player, setting, state);
            break;
        case 8: // SEND_CLAN_INFO (browse list)
            await clan.sendClanList(player);
            break;
    }
}

module.exports = { clanOptions };
