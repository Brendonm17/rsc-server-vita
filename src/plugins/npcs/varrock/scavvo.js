
const SCAVVO_ID = 183;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SCAVVO_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Ello matey', 'Want to buy some exciting new toys?');

    const options = await player.ask(
        ['No, toys are for kids', 'Lets have a look then', 'Ooh goody goody toys'],
        false
    );

    if (options === 0) {
        await player.say('No toys are for kids');
    } else if (options === 1) {
        await player.say("Let's have a look then");
    } else if (options === 2) {
        await player.say('Ooh goody goody toys');
    }

    if (options === 1 || options === 2) {
        player.disengage();
        player.openShop('scavvos-rune');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
