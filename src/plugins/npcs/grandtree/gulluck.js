
const GULLUCK_ID = 587;

async function onTalkToNPC(player, npc) {
    if (npc.id !== GULLUCK_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello');
    await npc.say(
        'good day brave adventurer',
        "could i interest you in my fine selection of weapons?"
    );

    const choice = await player.ask(
        ["i'll take a look", 'no thanks'],
        false
    );

    switch (choice) {
        case 0:
            player.disengage();
            player.openShop('gulluck-and-sons');
            return true;
        case 1:
            await npc.say('grrrr');
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
