// sea slug - bailey the cook: gives an unlit torch, hints the sea slugs fear heat.

const { questsEnabled } = require('../../custom-gate.js');
const { BAILEY_ID, UNLIT_TORCH_ID, LIT_TORCH_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== BAILEY_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.seaSlug || 0;

    switch (stage) {
        case 3:
        case 4:
            await player.say('hello');
            await npc.say('well hello there', 'what are you doing here?');
            await player.say(
                "i'm trying to find out what happened to a boy named kennith"
            );
            await npc.say(
                "oh, you mean kent's son",
                "he's around somewhere, probably hiding"
            );
            await player.say('hiding from what?');
            await npc.say(
                "haven't you seen all those things out there?"
            );
            await player.say('the sea slugs?');
            await npc.say(
                'ever since we pulled up that haul something strange has ' +
                    'been going on',
                'the fishermen spend all day pulling in hauls of fish',
                'only to throw back the fish and keep those nasty sea slugs',
                'what am i supposed to do with those',
                "i haven't figured out how to kill one yet",
                'if i put them near the stove they squirm and jump away'
            );
            await player.say("i doubt they would taste too good");
            break;

        case 5:
            if (!player.cache.seaSlugLitTorch) {
                await player.say('hello');
                await npc.say(
                    "oh thank god it's you",
                    "they've all gone mad i tell you",
                    'one of the fishermen tried to throw me into the sea'
                );
                await player.say(
                    "they're all being controlled by the sea slugs"
                );
                await npc.say('i figured as much');
                await player.say(
                    'i need to get kennith of this platform but i ' +
                        "can't get past the fishermen"
                );
                await npc.say(
                    'the sea slugs are scared of heat',
                    'i figured that out when i tried to cook them'
                );
                if (!player.inventory.has(UNLIT_TORCH_ID)) {
                    await npc.say('here');
                    player.message('@que@bailey gives you a torch');
                    await player.world.sleepTicks(3);
                    player.inventory.add(UNLIT_TORCH_ID, 1);
                    await npc.say(
                        'i doubt the fishermen will come near you if you ' +
                            'can get this torch to light',
                        'the only problem is all the wood and flint is damp',
                        "i can't light a thing"
                    );
                } else {
                    await player.say(
                        'i better figure a way to light this torch'
                    );
                }
            } else {
                if (player.inventory.has(LIT_TORCH_ID)) {
                    await player.say("i've managed to light the torch");
                    await npc.say(
                        'well done traveler',
                        'you better get kennith out of here soon',
                        'the fishermen are becoming stranger by the minute',
                        'and they keep pulling up those blasted sea slugs'
                    );
                } else if (player.inventory.has(UNLIT_TORCH_ID)) {
                    // nothing
                } else {
                    await player.say("i've managed to lose my torch");
                    await npc.say(
                        'that was silly, fortunately i have another',
                        'here, take it'
                    );
                    player.inventory.add(UNLIT_TORCH_ID, 1);
                }
            }
            break;

        case 6:
            await player.say('hello bailey');
            await npc.say(
                'hello again',
                'i saw you managed to get kennith of the platform',
                "well done, he wasn't safe around these slugs"
            );
            await player.say('are you going to come back with us?');
            await npc.say(
                'no, these fishermen are my friends',
                "i'm sure they can be saved",
                "i'm going to stay and try to get rid of all these slugs"
            );
            await player.say(
                "you're braver than most",
                'take care of yourself bailey'
            );
            await npc.say('you to traveler');
            break;

        case -1:
            await player.say('hello bailey');
            await npc.say(
                'well hello again traveler',
                'what brings you back out here'
            );
            await player.say('just looking around');
            await npc.say(
                "well don't go touching any of those blasted slugs"
            );
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
