// caroline: quest start and completion/reward

const { questsEnabled } = require('../../custom-gate.js');
const { CAROLINE_ID, QUEST_OYSTER_PEARLS_ID } = require('./ids.js');

// reward: 1 quest point, fishing xp (base 700, var 800)
async function handleReward(player) {
    player.questStages.seaSlug = -1;
    player.addQuestPoints(1);
    player.message('@gre@You haved gained 1 quest point!');

    player.addExperience(
        'fishing',
        player.skills.fishing.base * 800 + 700,
        false
    );

    player.message('well done, you have completed the sea slug quest');
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== CAROLINE_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.seaSlug || 0;

    switch (stage) {
        case 0: {
            await player.say('hello there');
            await npc.say('is there any chance you could help me?');
            await player.say("what's wrong?");
            await npc.say(
                "it's my husband, he works on a fishing platform",
                'once a month he takes our son kennith out with him',
                "they usually write to me regularly but i've heard nothing " +
                    'all week',
                "it's very strange"
            );
            await player.say('maybe the post was lost!');
            await npc.say(
                "maybe, but no one's heard from the other fishermen on the " +
                    'platform',
                'their families are becoming quite concerned',
                'is there any chance you could visit the platform and find ' +
                    "out what's going on?"
            );

            const firstMenu = await player.ask(
                ['i suppose so, how do i get there?', "i'm sorry i'm too busy"],
                true
            );

            if (firstMenu === 0) {
                await npc.say(
                    "that's very good of you traveller",
                    'my friend holgart will take you there'
                );
                await player.say("okay i'll go and see if they're ok");
                await npc.say(
                    'i will reward you for your time',
                    "and it'll give me great piece of mind",
                    'to know kennith and my husband kent are safe'
                );
                player.questStages.seaSlug = 1;
            } else if (firstMenu === 1) {
                await npc.say('thats a shame');
                await player.say('bye');
                await npc.say('bye');
            }
            break;
        }
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
            await player.say('hello caroline');
            await npc.say(
                'brave adventurer have you any news about my son and his ' +
                    'father?'
            );
            await player.say("i'm working on it now caroline");
            await npc.say('please bring them back safe and sound');
            await player.say("i'll do my best");
            break;
        case 6:
            await player.say('hello');
            await npc.say(
                "brave adventurer you've returned",
                'kennith told me about the strange going ons on the platform',
                'i had no idea it was so serious',
                'i could have lost my son and my husband if it ' +
                    "wasn't for you"
            );
            await player.say('we found kent stranded on a island');
            await npc.say(
                'yes, holgart told me and sent a rescue party out',
                "kent's back at home now, resting with kennith",
                "i don't think he'll be doing any fishing for a while",
                'here, take these oyster pearls as a reward',
                "they're worth a fair bit",
                'and can be used to make lethal crossbow bolts'
            );
            await handleReward(player);
            await player.say('thanks');
            await npc.say('thank you', 'take care of yourself adventurer');
            player.inventory.add(QUEST_OYSTER_PEARLS_ID, 1);
            break;
        case -1:
            await player.say('hello again');
            await npc.say('hello traveler', 'how are you?');
            await player.say('not bad thanks, yourself?');
            await npc.say(
                "i'm good",
                'busy as always looking after kent and kennith but no ' +
                    'complaints'
            );
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
