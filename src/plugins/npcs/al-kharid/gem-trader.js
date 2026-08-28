// https://classic.runescape.wiki/w/Transcript:Gem_trader
// Family Crest stages 3-4: Adam Fitzharmon hint, only path to stage 4

const {
    gemTraderAdamFitzharmon
} = require('../../quests/members/family-crest');

const GEM_TRADER_ID = 308;

async function onTalkToNPC(player, npc) {
    if (npc.id !== GEM_TRADER_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        `good day to you ${player.isMale() ? 'sir' : 'madam'}`,
        'Would you be interested in buying some gems?'
    );

    // extra option only at family crest stage 3-4
    const choices = ['Yes please', 'No thankyou'];
    const familyCrestStage = player.questStages.familyCrest;

    if (familyCrestStage > 2 && familyCrestStage < 5) {
        choices.push("I'm in search of a man named adam fitzharmon");
    }

    const choice = await player.ask(choices, true);

    if (choice === 0) {
        player.disengage();
        player.openShop('al-kharid-gem-stall');
        return true;
    } else if (choice === 2) {
        await gemTraderAdamFitzharmon(player, npc);
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
