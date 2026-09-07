// sigbert the adventurer: warns about salarin; when combat odyssey is on,
// hands off tier 7 to 8

const SIGBERT_ID = 573;

const { co, biggumMissing } = require('../combat-odyssey-shared');

// combat odyssey defaults on unless a world sets wantCombatOdyssey false
function wantCombatOdyssey(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantCombatOdyssey !== false;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== SIGBERT_ID) {
        return false;
    }

    player.engage(npc);

    if (
        wantCombatOdyssey(player) &&
        co.getCurrentTier(player) === 7 &&
        co.isTierCompleted(player)
    ) {
        if (await biggumMissing(player)) {
            player.disengage();
            return true;
        }

        const newTier = 8;
        co.assignNewTier(player, newTier);

        await npc.say(
            "You're doing the combat odyssey I assume",
            "Well you've made it this far, i guess you have a chance",
            'You now have to kill'
        );
        await npc.say(...co.getTasksAndCounts(co.getTier(newTier)));
        await npc.say("Go see Achetties when you're done");

        player.disengage();
        return true;
    }

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
