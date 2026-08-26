// flavor dialogue only, no shop or quest interaction

const FAIRY_QUEEN_ID = 392;

async function onTalkToNPC(player, npc) {
    if (npc.id !== FAIRY_QUEEN_ID) {
        return false;
    }

    player.engage(npc);

    const menu = await player.ask(
        [
            'How do crops and such survive down here?',
            "What's so good about this place?"
        ],
        true
    );

    if (menu === 0) {
        await player.say('Surely they need a bit of sunlight?');
        await npc.say(
            'Clearly you come from a plane dependant on sunlight',
            'Down here the plants grow in the aura of faerie'
        );
    } else if (menu === 1) {
        await npc.say(
            'Zanaris is a meeting point of cultures',
            'those from many worlds converge here to exchange knowledge and goods'
        );
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
