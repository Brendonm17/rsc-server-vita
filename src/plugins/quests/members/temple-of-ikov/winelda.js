// winelda teleports across the lava stream for 20 limpwurt roots

const { questsEnabled } = require('../../custom-gate.js');

const WINELDA_ID = 365;
const LIMPWURT_ROOT_ID = 220;

// Winelda conversation sub-branch (OpenRSC class Winelda)
const YES = 0;

async function wineldaYes(player, npc) {
    await npc.say(
        'Well keep it under your helmet',
        "But I'm knowing some useful magic tricks",
        'I could get you over there easy as that'
    );
    await player.say('Okay get me over there');
    await npc.say(
        'Okay brace yourself',
        'Actually no no',
        'Why should I do it for free',
        "Bring me a bite to eat and I'll be a touch more helpful",
        'How about some nice tasty limpwurt roots to chew on',
        "Yes yes that's good, bring me 20 limpwurt roots and over you go"
    );
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== WINELDA_ID) {
        return false;
    }

    player.engage(npc);

    if (player.inventory.has(LIMPWURT_ROOT_ID, 20)) {
        await player.say(
            'I have the 20 limpwurt roots, now transport me please'
        );
        await npc.say('Oh marverlous', 'Brace yourself then');

        player.inventory.remove(LIMPWURT_ROOT_ID, 20);

        player.teleport(557, 3290);
        await player.world.sleepTicks(1);
    } else {
        await npc.say(
            'Hehe in a bit of a pickle are we?',
            'Want to be getting over the nasty lava stream do we?'
        );

        const menu = await player.ask(
            ['Not really, no', 'Yes we do', 'Yes I do'],
            false
        );

        if (menu === 0) {
            await npc.say(
                "Hehe ye'll come back later",
                'They always come back later'
            );
        } else if (menu === 1) {
            await wineldaYes(player, npc);
        } else if (menu === 2) {
            await wineldaYes(player, npc);
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
