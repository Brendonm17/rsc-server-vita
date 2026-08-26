
const COLONEL_RADICK_ID = 518;

async function onTalkToNPC(player, npc) {
    if (npc.id !== COLONEL_RADICK_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Who goes there?', 'friend or foe?');

    const menu = await player.ask(
        ['Friend', 'foe', "Why's this town so heavily defended?"],
        false
    );

    if (menu === 0) {
        await player.say('Friend');
        await npc.say('Ok good to hear it');
    } else if (menu === 1) {
        await player.say('Foe');
        await npc.say('Oh righty');
        player.disengage();
        await npc.attack(player);
        return true;
    } else if (menu === 2) {
        await player.say("Why's this town so heavily defended?");
        await npc.say(
            'Yanille is on the southwest border of Kandarin',
            'Beyond here you go into the feldip hills',
            'Which is major ogre teritory',
            'Our job is to defend Yanille from the ogres'
        );
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
