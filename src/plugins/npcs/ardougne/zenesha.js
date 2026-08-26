
const ZENESHA_ID = 331;

async function onTalkToNPC(player, npc) {
    if (npc.id !== ZENESHA_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('hello I sell plate mail tops');

    const menu = await player.ask(
        ["I'm not intersted", 'I may be intersted'],
        false
    );

    if (menu === 0) {
        await player.say("I'm not interested");
    } else if (menu === 1) {
        await player.say('I may be interested');
        await npc.say('Look at these fine samples then');
        player.disengage();
        player.openShop('zeneshas-plate-mail');
        return true;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
