const { handlePlayerCommand } = require('../plugins/custom/player-commands');

async function chat({ player }, { message }) {
    // :: commands intercepted before public chat
    if (handlePlayerCommand(player, message)) {
        return;
    }

    if (player.canChat()) {
        player.lastChat = Date.now();
        player.broadcastChat(message);
    }
}

module.exports = { chat };
