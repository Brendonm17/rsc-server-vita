// dig site panning guide

const { questsEnabled } = require('../../custom-gate.js');
const { DIGSITE_GUIDE_ID } = require('./constants.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== DIGSITE_GUIDE_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello, who are you ?');
    await npc.say(
        'Hello, I am the panning guide',
        "I'm here to teach you how to pan for gold"
    );
    await player.say('Excellent!');
    await npc.say(
        'Let me explain how panning works...',
        'First You need a panning tray',
        'Use the tray in the panning points in the water',
        'Then examine your tray',
        'If you find any gold, take it to the expert',
        'Up in the museum storage facility',
        "He will calculate it's value for you"
    );
    await player.say('Okay thanks');

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
