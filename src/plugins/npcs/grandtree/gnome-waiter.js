
const GNOME_WAITER_ID = 581;

async function onTalkToNPC(player, npc) {
    if (npc.id !== GNOME_WAITER_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello');
    await npc.say('good afternoon', 'can i tempt you with our new menu?');

    const choice = await player.ask(
        ["i'll take a look", 'not really'],
        false
    );

    switch (choice) {
        case 0:
            await npc.say('i hope you like what you see');
            player.disengage();
            player.openShop('gnome-restaurant');
            return true;
        case 1:
            await npc.say('ok then, enjoy your stay');
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
