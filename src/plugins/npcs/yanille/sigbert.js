
const SIGBERT_ID = 573;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SIGBERT_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say("I'd be very careful going up there friend");

    // Java multi(player, n, options...) defaults send-over true.
    const menu = await player.ask(
        ["Why what's up there?", 'Fear not I am very strong'],
        true
    );

    if (menu === 0) {
        await npc.say(
            'Salarin the twisted',
            "One of Kanadarin's most dangerous chaos druids",
            'I tried to take him on and then suddenly felt immensly week',
            "I here he's susceptable to attacks from the mind",
            "However I have no idea what that means",
            "So it's not much help to me"
        );
    } else if (menu === 1) {
        await npc.say('You might find you are not so strong shortly');
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
