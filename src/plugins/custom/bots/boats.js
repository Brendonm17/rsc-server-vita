// bots take the port sarim <-> karamja ferry: pay the fare and teleport across,
// since the boat npc's ask() dialogue would deadlock a socketless bot

const COINS_ID = 10;
const FARE = 30;

const PORT_SARIM_DOCK = { x: 269, y: 650 };
const KARAMJA_ARRIVE = { x: 324, y: 713 };

function near(bot, p, r = 4) {
    return Math.abs(bot.x - p.x) + Math.abs(bot.y - p.y) <= r;
}

function atPortSarimDock(bot) {
    return !bot._onKaramja && near(bot, PORT_SARIM_DOCK, 5);
}

function onKaramja(bot) {
    return !!bot._onKaramja;
}

// board at port sarim for karamja (costs the 30gp fare); true if it sailed
function sailToKaramja(bot) {
    if (!bot.inventory.has(COINS_ID, FARE)) {
        return false;
    }
    bot.inventory.remove(COINS_ID, FARE);
    try {
        bot.teleport(KARAMJA_ARRIVE.x, KARAMJA_ARRIVE.y);
    } catch (e) {
        return false;
    }
    bot._onKaramja = true;
    bot._karamjaTicks = 0;
    return true;
}

// head back to the mainland; free so a broke bot is never stranded
function sailToPortSarim(bot) {
    try {
        bot.teleport(PORT_SARIM_DOCK.x, PORT_SARIM_DOCK.y);
    } catch (e) {
        return false;
    }
    bot._onKaramja = false;
    bot._karamjaTicks = 0;
    return true;
}

module.exports = {
    PORT_SARIM_DOCK,
    KARAMJA_ARRIVE,
    atPortSarimDock,
    onKaramja,
    sailToKaramja,
    sailToPortSarim
};
