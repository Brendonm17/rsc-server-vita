// observatory assistant: per-stage hints; gives a jug of wine once the quest is done

const { questsEnabled } = require('../../custom-gate.js');
const { OBSERVATORY_ASSISTANT_ID, WINE_ID } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== OBSERVATORY_ASSISTANT_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.observatoryQuest || 0;

    switch (stage) {
        case 0: {
            await npc.say('Hello wanderer', 'Do you require any assistance ?');
            const first = await player.ask(
                [
                    'Yes, what do you two do here ?',
                    'No, just looking around thanks',
                    'Can I have a look through that telescope ?'
                ],
                true
            );
            if (first === 0) {
                await npc.say(
                    'This is the observatory reception',
                    'Up on the cliff is the observatory dome',
                    'From here we view the heavens',
                    'That is before the telescope was damaged',
                    'By those monsters outside...'
                );
            } else if (first === 1) {
                await npc.say(
                    'Okay, be my guest',
                    'If you need any help let me know...'
                );
            } else if (first === 2) {
                await npc.say(
                    "I'm sorry but it's broken!",
                    'The Professor will explain if you speak to him'
                );
            }
            break;
        }
        case 1: {
            await npc.say('How can I help you ?');
            const help = await player.ask(
                ["I can't find any planks!", "I dont need any help thanks"],
                true
            );
            if (help === 0) {
                await npc.say(
                    'I understand planks can be found at the barbarian outpost',
                    'To the north east of ardougne',
                    'You will probably have to trek over there to find some...'
                );
            } else if (help === 1) {
                await npc.say('Oh, okay then if you are sure');
                player.message('The assistant continues with his work');
            }
            break;
        }
        case 2: {
            await npc.say('How can I help you ?');
            const bronze = await player.ask(
                [
                    "I can't see any bronze around",
                    "I dont need any help thanks"
                ],
                true
            );
            if (bronze === 0) {
                await npc.say(
                    "You'll need to mix purified copper and tin together",
                    'To produce this metal'
                );
            } else if (bronze === 1) {
                await npc.say('Oh, okay then if you are sure');
                player.message('The assistant continues with his work');
            }
            break;
        }
        case 3: {
            await npc.say('How can I help you ?');
            const molten = await player.ask(
                [
                    "I'm having problems getting glass",
                    "I don't need any help thanks"
                ],
                true
            );
            if (molten === 0) {
                await npc.say(
                    "Don't you know how to make glass ?",
                    'Unfortunately we dont have those skills',
                    'I remember reading about that somewhere...'
                );
            } else if (molten === 1) {
                await npc.say('Oh, okay then if you are sure');
                player.message('The assistant continues with his work');
            }
            break;
        }
        case 4: {
            await npc.say(' How can I help you ?');
            const mould = await player.ask(
                ["I cant find the lens mould", "I don't need any help thanks"],
                true
            );
            if (mould === 0) {
                await npc.say(
                    "Can't you find the mould ?",
                    "I'm sure I heard one of those goblins talking about it...",
                    'I bet they have hidden it somewhere'
                );
            } else if (mould === 1) {
                await npc.say('Oh, okay then if you are sure');
                player.message('The assistant continues with his work');
            }
            break;
        }
        case 5: {
            await npc.say('How can I help you ?');
            const lens = await player.ask(
                ["I can't make the lens!", "I don't need any help thanks"],
                true
            );
            if (lens === 0) {
                await npc.say(
                    'Crafting objects like this requires skill',
                    'You may need to practice more first...'
                );
            } else if (lens === 1) {
                await npc.say('Oh, okay then if you are sure');
                player.message('The assistant continues with his work');
            }
            break;
        }
        case 6: {
            await npc.say(
                'Well hello again',
                'thanks for helping out the professor',
                "You've made my life much easier!",
                'Have a drink on me!'
            );
            player.message('The assistant gives you some wine');
            await player.say('Thanks very much');
            player.inventory.add(WINE_ID, 1);
            break;
        }
        case -1: {
            if (player.cache.observatory_assistant_drink === undefined) {
                await npc.say(
                    'Well hello again',
                    'thanks for helping out the professor',
                    "You've made my life much easier!",
                    'Have a drink on me!'
                );
                player.message('The assistant gives you some wine');
                player.inventory.add(WINE_ID, 1);
                await player.say('Thanks very much');
                player.cache.observatory_assistant_drink = true;
                player.disengage();
                return true;
            }
            await npc.say('Thanks again');
            break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
