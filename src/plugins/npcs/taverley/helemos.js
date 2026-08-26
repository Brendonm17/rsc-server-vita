
const HELEMOS_ID = 269;

async function onTalkToNPC(player, npc) {
    if (npc.id !== HELEMOS_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Welcome to the hero\'s guild');

    const option = await player.ask(
        ['So do you sell anything here?', 'So what can I do here?'],
        false
    );

    if (option === 0) {
        await player.say('So do you sell anything here?');
        await npc.say('Why yes we do run an exclusive shop for our members');
        player.disengage();
        player.openShop('dragon-axe');
        return true;
    } else if (option === 1) {
        await player.say('so what can I do here?');
        await npc.say(
            'Look around there are all sorts of things to keep our members ' +
                'entertained'
        );
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
