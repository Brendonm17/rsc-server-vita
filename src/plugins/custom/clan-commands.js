// clan text commands (c, claninvite, clanaccept, clankick, joinclan) wrapping clan.js
const clan = require('./clan');

const commands = {
    // ::c <message>: clan chat
    async c(player, args) {
        await clan.chat(player, args.join(' '));
    },

    // ::claninvite <name>
    async claninvite(player, args) {
        await clan.invite(player, args[0]);
    },

    // ::clanaccept
    async clanaccept(player) {
        await clan.accept(player);
    },

    // ::clankick <name>
    async clankick(player, args) {
        await clan.removePlayerFromClan(player, args[0]);
    },

    // ::joinclan <name>
    async joinclan(player, args) {
        await clan.joinRequest(player, args[0]);
    }
};

module.exports = { commands };
