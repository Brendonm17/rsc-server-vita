
const { hasStage, setStageIfLess } = require('./stage');

const GUIDE_ID = 476;

async function onTalkToNPC(player, npc) {
    if (npc.id !== GUIDE_ID) {
        return false;
    }

    // only applies to players actively on the tutorial
    if (!hasStage(player)) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Welcome to the world of runescape',
        'My job is to help newcomers find their feet here'
    );
    await player.say("Ah good, let's get started");
    await npc.say(
        'when speaking to characters such as myself',
        'Sometimes options will appear in the top left corner of the screen',
        'left click on one of them to continue the conversation'
    );

    await player.ask(
        ['So what else can you tell me?', 'What other controls do I have?'],
        true
    );

    await npc.say(
        'I suggest you go through the  door now',
        'There are several guides and advisors on the island',
        'Speak to them',
        'They will teach you about the various aspects of the game'
    );
    player.message(
        'Use the quest history tab at the bottom of the screen to reread ' +
            'things said to you by ingame characters'
    );
    setStageIfLess(player, 10);

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
