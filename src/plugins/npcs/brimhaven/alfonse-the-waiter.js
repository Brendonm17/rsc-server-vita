// alfonse the waiter (260) opens the shrimp and parrot fish shop; the gherkins
// option is the heroes' quest phoenix thread, gated by gang/stage/cache keys

const { isBlackArmGang } = require('../../quests/members/heros-quest/common');

const ALFONSE_THE_WAITER_ID = 260;

async function onTalkToNPC(player, npc) {
    if (npc.id !== ALFONSE_THE_WAITER_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Welcome to the shrimp and parrot', 'Would you like to order sir?');

    const stage = player.questStages.herosQuest || 0;
    const plainMenu =
        isBlackArmGang(player) ||
        (stage !== 1 &&
            stage !== 2 &&
            !player.cache.pheonix_mission &&
            !player.cache.pheonix_alf);

    const menu = await player.ask(
        plainMenu
            ? ['Yes please', 'No thankyou']
            : ['Yes please', 'No thankyou', 'Do you sell Gherkins?'],
        true
    );

    if (menu === 0) {
        player.disengage();
        player.openShop('the-shrimp-and-parrot');
        return true;
    } else if (menu === 2) {
        await npc.say(
            'Hmm ask Charlie the cook round the back',
            'He may have some Gherkins for you'
        );
        player.message('@que@Alfonse winks');
        await player.world.sleepTicks(3);
        player.cache.talked_alf = true;
        delete player.cache.pheonix_alf;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
