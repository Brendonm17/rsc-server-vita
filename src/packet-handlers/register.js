const log = require('bole')('register');

async function register(socket, message) {
    const { config, dataClient } = socket.server;
    const { version, username, password } = message;
    const ip = socket.getIPAddress();

    // only free-to-play worlds support registration; the embedded SP/co-op build allows it on any world (characters
    // auto-created on first login), online multiplayer keeps the authentic refusal
    if (socket.server.world.members && !socket.server.isBrowser) {
        socket.send(Buffer.from([15]));
        return;
    }

    if (version !== config.version) {
        socket.send(Buffer.from([5]));
        return;
    }

    const { code, success } = await dataClient.playerRegister({
        username,
        password,
        ip
    });

    if (success) {
        log.info(`${username} registered from ${ip}`);
    }

    socket.send(Buffer.from([code]));
}

module.exports = { register };
