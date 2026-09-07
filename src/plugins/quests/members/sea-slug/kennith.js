// kennith, kent's son, hiding on the platform

const { questsEnabled } = require('../../custom-gate.js');
const { KENNITH_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== KENNITH_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.seaSlug || 0;

    switch (stage) {
        case 3:
            await player.say('are you okay young one?');
            await npc.say('no i want my daddy');
            await player.say('Where is your father?');
            await npc.say(
                'he went to get help days ago',
                'the nasty fisher men tried to throw me and daddy into the sea',
                'so he told me to hide in here'
            );
            await player.say(
                "that's good advice",
                "you stay here and i'll go try and find your father"
            );
            player.questStages.seaSlug = 4;
            break;

        case 4:
            await player.say('are you okay?');
            await npc.say('i want to see daddy');
            await player.say("i'm working on it");
            break;

        case 5:
            if (player.cache.seaSlugLoosePanel) {
                await player.say(
                    "kennith i've made an opening in the wall",
                    'you can come out there'
                );
                await npc.say('are their any sea slugs on the other side?');
                await player.say('not one');
                await npc.say('how will i get down stairs');
                await player.say("i'll figure that out in a moment");
                await npc.say("okay, when you have i'll come out");
                player.disengage();
                return true;
            }
            await player.say('hello kennith', 'are you okay?');
            await npc.say('no i want my daddy');
            await player.say(
                "you'll be able to see him soon",
                'first we need to get you back to land',
                'come with me to the boat'
            );
            await npc.say('no');
            await player.say('what, why not?');
            await npc.say(
                "i'm scared of those nasty sea slugs",
                "i won't go near them"
            );
            await player.say(
                'okay, you wait here and i\'ll figure another way to get ' +
                    'you out'
            );
            break;

        case 6:
        case -1:
            player.message("@que@He doesn't seem interested in talking");
            await player.world.sleepTicks(3);
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
