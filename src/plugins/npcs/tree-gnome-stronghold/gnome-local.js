
const KING_WORM_ID = 897;

const GNOME_LOCAL_RED_ID = 592;
const GNOME_LOCAL_PURPLE_ID = 593;

const GNOME_LOCAL_IDS = new Set([GNOME_LOCAL_RED_ID, GNOME_LOCAL_PURPLE_ID]);

async function redChat(player, npc) {
    const chatRandom = Math.floor(Math.random() * 4);

    switch (chatRandom) {
        case 0:
            await npc.say("can't stop sorry, busy, busy, busy");
            player.message('the gnome is too busy to talk');
            break;
        case 1:
            await npc.say('hello traveller', 'are you enjoying your stay?');
            await player.say("it's a nice place");
            await npc.say('yes, we try to keep it that way');
            break;
        case 2:
            await npc.say("i don't think i can take much more");
            await player.say("what's wrong?");
            await npc.say("it's just the wife, she won't stop moaning");
            await player.say('maybe you should give her less to moan about');
            await npc.say("she'll always find something");
            break;
        case 3:
            await npc.say("how's life treating you");
            await player.say('not bad, not bad at all');
            await npc.say(
                "it's good to see a human with a positive attitude"
            );
            break;
    }
}

async function purpleChat(player, npc) {
    const chatRandom = Math.floor(Math.random() * 5);

    switch (chatRandom) {
        case 0:
            await npc.say(
                'hello traveller',
                'are you eating properly?, you look tired'
            );
            await player.say('i think so');
            await npc.say(
                'here get this worm down you',
                "it'll do you the world of good"
            );
            player.message('the gnome gives you a worm');
            player.inventory.add(KING_WORM_ID, 1);
            await player.say('thanks!');
            break;
        case 1:
            await player.say('how are you?');
            await npc.say('not bad, a little worn out');
            await player.say('maybe you should have a lie down');
            await npc.say("with three kids to feed i've no time for naps");
            await player.say('sounds like hard work');
            await npc.say("it is but they're worth it");
            break;
        case 2:
            await npc.say(
                'Some people grumble because roses have thorns',
                "I'm thankful that thorns have roses"
            );
            await player.say('good attitude');
            break;
        // case 3 nothing but "hello".
        case 4:
            await npc.say(
                'well good day to you kind sir',
                'are you new to these parts?'
            );
            await player.say('kind of');
            await npc.say(
                "well if your looking for a good night out",
                "blurberrys cocktail bar's great"
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!GNOME_LOCAL_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    await player.say('hello');

    if (npc.id === GNOME_LOCAL_RED_ID) {
        await redChat(player, npc);
    } else if (npc.id === GNOME_LOCAL_PURPLE_ID) {
        await purpleChat(player, npc);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
