// the training-camp ogre and dummy in the ardougne combat obstacle course;
// fixed flavour dialogue, no branching menu.

const GUARD_TRAINING_CAMP_OGRE_ID = 526;
const GUARD_TRAINING_CAMP_DUMMY_ID = 527;

async function onTalkToNPC(player, npc) {
    if (npc.id === GUARD_TRAINING_CAMP_DUMMY_ID) {
        await player.say('hello');
        await npc.say('hello soldier');
        await player.say("i'm more of an adventurer really");
        await npc.say(
            "in this day and age we're all soldiers",
            'no time to waste gassing - fight, fight, fight'
        );
    } else if (npc.id === GUARD_TRAINING_CAMP_OGRE_ID) {
        await player.say('hello');
        await npc.say(
            'well hello brave warrior',
            'these ogres have been terrorising the area',
            "they've eaten four children last week alone"
        );
        await player.say('brutes');
        await npc.say(
            'so we decided to use them for target practice',
            'a fair punishment'
        );
        await player.say('indeed');
    } else {
        return false;
    }

    return true;
}

module.exports = { onTalkToNPC };
