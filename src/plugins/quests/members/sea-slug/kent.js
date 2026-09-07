// kent, stranded on the small island. pulls a sea slug off the player's neck

const { questsEnabled } = require('../../custom-gate.js');
const GroundItem = require('../../../../model/ground-item');
const { KENT_ID, SEASLUG_ID, SEASLUG_DROP } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== KENT_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.seaSlug || 0;
    const { world } = player;

    switch (stage) {
        case 4:
            await npc.say(
                'oh thank Saradomin',
                'i thought i would be left out here forever'
            );
            await player.say(
                'your wife sent me out to find you and your boy',
                "kennith's fine he's on the platform"
            );
            await npc.say(
                "i knew the row boat wasn't sea worthy",
                "i couldn't risk bringing him along but you must get him of " +
                    'that platform'
            );
            await player.say("what's going on on there?");
            await npc.say(
                'five days ago we pulled in huge catch',
                'as well as fish we caught small slug like sea creatures, ' +
                    'hundreds of them',
                "that's when the fishermen began to act strange",
                'it was the sea slugs, they attach themselves to your body',
                'and somehow take over the mind of the carrier',
                'i told Kennith to hide until i returned but i was washed ' +
                    'up here',
                'please go back and get my boy',
                'you can send help for me later',
                'traveler wait!'
            );
            player.message('@que@kent reaches behind your neck');
            await world.sleepTicks(3);
            player.message('slooop');
            await world.sleepTicks(3);
            player.message('@que@he pulls a sea slug from under your top');
            await world.sleepTicks(3);

            // Kent drops the slug at (511, 636) and it stays for ~12s.
            {
                const slug = new GroundItem(world, {
                    id: SEASLUG_ID,
                    x: SEASLUG_DROP.x,
                    y: SEASLUG_DROP.y,
                    amount: 1
                });
                world.addEntity('groundItems', slug);
                world.setTimeout(() => {
                    world.removeEntity('groundItems', slug);
                }, 12000);
            }

            await npc.say(
                'a few more minutes and that thing would have full control ' +
                    'you body'
            );
            await player.say('yuck..thanks kent');
            player.questStages.seaSlug = 5;
            break;

        case 5:
            await player.say('hello');
            await npc.say('oh my', 'i must get back to shore');
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
