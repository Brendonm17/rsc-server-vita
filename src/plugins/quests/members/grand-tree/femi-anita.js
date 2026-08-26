
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    FEMI,
    FEMI_STRONGHOLD,
    ANITA,
    COINS,
    GLOUGHS_KEY,
    ifNearVisNpc
} = require('./ids.js');

async function talkFemi(player, n) {
    const stage = player.questStages[QUEST_KEY] || 0;

    if (stage !== 10) {
        player.message('the little gnome is too busy to talk');
        return;
    }

    let smuggled = false;
    let favor = false;

    await player.say("i can't believe they won't let me in");
    await n.say(
        "i don't believe all this rubbish about an invasion",
        'if mankind wanted to, they could have invaded before now'
    );
    await player.say(
        'i really need to see king shareem',
        'could you help sneak me in'
    );

    if (player.cache.helped_femi === true) {
        await n.say(
            'well, as you helped me i suppose i could',
            "we'll have to be careful",
            "if i get caught i'll be in the cage"
        );
        await player.say('ok, what should i do');
        await n.say(
            'jump in the back of the cart',
            "it's a food delivery, we should be fine"
        );
        player.message('you hide in the cart');
        await player.world.sleepTicks(3);
        player.message('femi covers you with a sheet...');
        await player.world.sleepTicks(3);
        player.message('...and drags the cart to the gate');
        await player.world.sleepTicks(3);
        player.message('femi pulls you into the stronghold');
        await player.world.sleepTicks(3);
        smuggled = true;
        favor = true;
    } else {
        await n.say("why should i help you, you wouldn't help me");
        await player.say('erm i know, but this is an emergency');
        await n.say(
            'so was lifting that barrel',
            "tell you what, let's call it a round 1000 gold piece's"
        );
        await player.say('1000 gold pieces');
        await n.say("that's right 1000 and i'll sneak you in");

        const option = await player.ask(
            ['no chance', 'ok then, here you go'],
            false
        );

        if (option === 1) {
            if (player.inventory.has(COINS, 1000)) {
                await n.say(
                    'alright, jump in the back of the cart',
                    "it's a food delivery, we should be fine"
                );
                player.message('you hide in the cart');
                await player.world.sleepTicks(3);
                player.message('femi covers you with a sheet...');
                await player.world.sleepTicks(3);
                player.message('...and drags the cart to the gate');
                await player.world.sleepTicks(3);
                player.message('you give femi 1000 gold coins');
                await player.world.sleepTicks(3);
                player.inventory.remove(COINS, 1000);
                player.message('femi pulls you into the stronghold');
                await player.world.sleepTicks(3);
                smuggled = true;
            } else {
                await player.say(
                    "Oh dear I don't seem to have enough money"
                );
            }
        }
    }

    if (smuggled) {
        player.teleport(708, 510);
        const femi = ifNearVisNpc(player, FEMI_STRONGHOLD, 2);
        if (femi) {
            player.engage(femi);
            await femi.say("ok traveller, you'd better get going");
            if (favor) {
                await player.say('thanks again femi');
                await femi.say("that's ok, all the best");
            }
            player.disengage();
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === FEMI) {
        player.engage(npc);
        await talkFemi(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === FEMI_STRONGHOLD) {
        player.engage(npc);
        player.message('the little gnome is too busy to talk');
        player.disengage();
        return true;
    }

    if (npc.id === ANITA) {
        player.engage(npc);
        const stage = player.questStages[QUEST_KEY] || 0;
        if (stage === 11) {
            await player.say('hello there');
            await npc.say("oh hello, i've seen you with the king");
            await player.say("yes, i'm helping him with a problem");
            await npc.say('you must know my boy friend glough then');
            await player.say('indeed!');
            await npc.say('could you do me a favour?');
            await player.say('i suppose so');
            await npc.say(
                'give this key to glough',
                'he left it here last night'
            );
            player.message('anita gives you a key');
            await player.world.sleepTicks(3);
            player.inventory.add(GLOUGHS_KEY, 1);
            await npc.say('thanks a lot');
            await player.say('no, thankyou');
        } else {
            player.message('anita is to busy cleaning to talk');
        }
        player.disengage();
        return true;
    }

    return false;
}

module.exports = { onTalkToNPC };
