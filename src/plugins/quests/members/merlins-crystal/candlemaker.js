// sells candles; makes a black candle for a bucket of wax

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    CANDLEMAKER_ID,
    WAX_BUCKET_ID,
    UNLIT_BLACK_CANDLE_ID
} = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== CANDLEMAKER_ID) {
        return false;
    }

    player.engage(npc);

    if ('candlemaker' in player.cache) {
        await npc.say('Have you got any wax yet?');

        if (player.inventory.has(WAX_BUCKET_ID)) {
            await player.say('Yes I have some now');
            player.inventory.remove(WAX_BUCKET_ID);
            player.message(
                'You exchange the wax with the candle maker for a black candle'
            );
            player.inventory.add(UNLIT_BLACK_CANDLE_ID, 1);
            delete player.cache.candlemaker;
        }

        player.disengage();
        return true;
    }

    await npc.say('Hi would you be interested in some of my fine candles');

    const options = [];
    const questOption = 'Have you got any black candles?';

    if (player.questStages[QUEST_KEY] === 3) {
        options.push(questOption);
    }

    const optionYes = 'Yes please';
    options.push(optionYes);
    options.push('No thankyou');

    const option = await player.ask(options, false);

    if (option === -1) {
        player.disengage();
        return true;
    }

    const chosen = options[option];

    if (chosen === questOption) {
        await player.say('Have you got any black candles?');
        await npc.say(
            'Black candles hmm?',
            'It\'s very bad luck to make black candles'
        );
        await player.say('I can pay well for one');
        await npc.say(
            'I still dunno',
            'Tell you what, I\'ll supply with you with a black candle',
            'If you can bring me a bucket full of wax'
        );
        player.cache.candlemaker = true;
    } else if (chosen === optionYes) {
        player.disengage();
        player.openShop('candle');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
