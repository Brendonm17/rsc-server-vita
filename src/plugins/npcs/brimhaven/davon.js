// davon sells amulets, opens the davons-amulet members shop

const DAVON_ID = 278;

async function onTalkToNPC(player, npc) {
    if (npc.id !== DAVON_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Pssst come here if you want to do some amulet trading');

    const menu = await player.ask(
        [
            'What are you selling?',
            'What do you mean pssst?',
            "Why don't you ever restock some types of amulets?"
        ],
        true
    );

    if (menu === 0) {
        player.message('Davon opens up his jacket to reveal some amulets');
        player.disengage();
        player.openShop('davons-amulet');
        return true;
    } else if (menu === 1) {
        await npc.say('I was clearing my throat');
    } else if (menu === 2) {
        await npc.say(
            'Some of these amulets are very hard to get',
            'I have to wait until an adventurer supplies me'
        );
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
