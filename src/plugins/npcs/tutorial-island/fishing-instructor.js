
const { hasStage, getStage, setStage } = require('./stage');

const FISHING_INSTRUCTOR_ID = 479;
const NET_ID = 376;

async function onTalkToNPC(player, npc) {
    if (npc.id !== FISHING_INSTRUCTOR_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    const stage = getStage(player);

    player.engage(npc);

    if (stage === 40) {
        await player.say('Hi are you here to tell me how to catch fish?');
        await npc.say(
            "Yes that's right, you're a smart one",
            'Fishing is a useful skill',
            'You can sell high level fish for lots of money',
            'Or of course you can cook it and eat it to heal yourself',
            "Unfortunately you'll have to start off catching shrimps",
            'Till your fishing level gets higher',
            "you'll need this"
        );
        player.message('the fishing instructor gives you a somewhat old looking net');
        player.inventory.add(NET_ID, 1);
        await npc.say(
            'Go catch some shrimp',
            'left click on that sparkling piece of water',
            'While you have the net in your inventory you might catch some fish'
        );
        setStage(player, 41);
    } else if (stage === 41) {
        await npc.say(
            'Left click on that splashing sparkling water',
            'then you can catch some shrimp'
        );

        if (!player.inventory.has(NET_ID)) {
            await player.say('I have lost my net');
            await npc.say(
                "Hmm a good fisherman doesn't lose his net",
                'Ah well heres another one'
            );
            player.inventory.add(NET_ID, 1);
        }
    } else if (stage === 42) {
        await npc.say(
            'Well done you can now continue with the tutorial',
            'first You can cook the shrimps on my fire here if you like'
        );
        setStage(player, 45);
    } else {
        await npc.say('Go through the next door to continue with the tutorial now');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
