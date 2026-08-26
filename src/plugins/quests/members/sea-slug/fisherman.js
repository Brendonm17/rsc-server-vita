// the mind-controlled platform fishermen

const { questsEnabled } = require('../../custom-gate.js');
const {
    PLATFORM_FISHERMAN_GOLDEN_ID,
    PLATFORM_FISHERMAN_PURPLE_ID,
    PLATFORM_FISHERMAN_GRAY_ID
} = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id === PLATFORM_FISHERMAN_PURPLE_ID ||
        npc.id === PLATFORM_FISHERMAN_GRAY_ID
    ) {
        player.engage(npc);
        await player.say('hello there');
        player.message('his eyes are fixated');
        player.message('starring at the sea');
        await npc.say('must find family');
        await player.say('what?');
        await npc.say("soon we'll all be together");
        await player.say('are you okay?');
        await npc.say(
            'must find family',
            "they're all under the blue",
            'deep deep under the blue'
        );
        await player.say("ermm..i'll leave you to it then");
        player.disengage();
        return true;
    }

    if (npc.id === PLATFORM_FISHERMAN_GOLDEN_ID) {
        player.engage(npc);
        await player.say('hello');
        player.message('his eyes are fixated');
        player.message('starring at the sea');
        await npc.say('keep away human', 'leave or face the deep blue');
        await player.say('pardon?');
        await npc.say(
            "you'll all end up in the blue",
            'deep deep under the blue'
        );
        player.disengage();
        return true;
    }

    return false;
}

module.exports = { onTalkToNPC };
