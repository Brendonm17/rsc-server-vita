
const ROMETTI_ID = 532;

async function onTalkToNPC(player, npc) {
    if (npc.id !== ROMETTI_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('hello');
    await npc.say(
        'hello traveller',
        'have a look at my latest range of gnome fashion',
        'rometti is the ultimate label in gnome high society'
    );
    await player.say('really');
    await npc.say('pastels are all the rage this season');

    // choice not echoed back via say()
    const choice = await player.ask(
        ["i've no time for fashion", "ok then let's have a look"],
        false
    );

    switch (choice) {
        case 0:
            await player.say("i've no time for fashion");
            await npc.say('hmm...i did wonder');
            break;
        case 1:
            await player.say("ok then, let's have a look");
            player.disengage();
            player.openShop('fine-fashions');
            return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
