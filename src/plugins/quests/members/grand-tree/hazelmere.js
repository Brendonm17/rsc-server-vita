
const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, HAZELMERE, BARK_SAMPLE } = require('./ids.js');

// hazelmere-speak shown as plain messages
async function strangeTranslationBox(player) {
    player.message(
        '@yel@x@red@z@yel@ql@red@:v@yel@ha @red@za@yel@:v@red@ql@yel@::: ' +
            '@red@h:@yel@xa@red@lat@yel@x @red@vo@yel@xa@red@ha@yel@qa@red@sol ' +
            '@yel@sol@red@:::@yel@:v@red@va',
        '@yel@qa@red@:v@yel@::@red@::: @yel@x@red@z@yel@ql@red@:v@yel@ha ' +
            '@red@qe@yel@:v@red@ha @yel@qe@red@:v@yel@za@red@ho@yel@ha@red@xa' +
            '@yel@:v @red@qi@yel@ho@red@za@yel@vo',
        '@red@qe@yel@:v@red@za@yel@ho@red@ha@yel@xa@red@:v @yel@qi@red@ho' +
            '@yel@za@red@vo@yel@sol @red@h:@yel@xa@red@va@yel@va @red@vo@yel@xa' +
            '@red@va@yel@va @yel@lat@red@qi@yel@:::@red@:::'
    );
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== HAZELMERE) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY] || 0;

    switch (stage) {
        case 0:
            player.message('the mage mumbles in an ancient tounge');
            await player.world.sleepTicks(3);
            player.message("you can't understand a word");
            await player.world.sleepTicks(3);
            break;
        case 1:
            await player.say('hello');
            if (player.inventory.has(BARK_SAMPLE)) {
                player.message('you give the mage the bark sample');
                await player.world.sleepTicks(3);
                player.inventory.remove(BARK_SAMPLE);
                player.message('the mage speaks in a strange ancient tongue');
                await player.world.sleepTicks(3);
                player.message('he says....');
                await player.world.sleepTicks(3);
                await strangeTranslationBox(player);
                player.questStages[QUEST_KEY] = 2;
            } else {
                player.message('the mage mumbles in an ancient tounge');
                await player.world.sleepTicks(3);
                player.message("you can't understand a word");
                await player.world.sleepTicks(3);
                player.message('you need to give him the bark sample');
                await player.world.sleepTicks(3);
            }
            break;
        case 2:
            player.message('the mage speaks in a strange ancient tongue');
            await player.world.sleepTicks(3);
            player.message('he says....');
            await player.world.sleepTicks(3);
            await strangeTranslationBox(player);
            break;
        default:
            // stages 3..16 and -1
            player.message('the mage mumbles in an ancient tounge');
            player.message("you can't understand a word");
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
