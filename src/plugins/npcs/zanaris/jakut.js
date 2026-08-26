// members-only shop, reachable via zanaris

const JAKUT_ID = 220;

async function onTalkToNPC(player, npc) {
    if (npc.id !== JAKUT_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Dragon swords, get your Dragon swords',
        'Straight from the plane of frenaskrae'
    );

    const option = await player.ask(
        ['Yes please', "No thankyou, I'm just browsing the marketplace"],
        false
    );

    if (option === 0) {
        await player.say('Yes Please');
        player.disengage();
        player.openShop('dragon-sword');
        return true;
    } else if (option === 1) {
        await player.say("No thankyou, I'm just browsing the marketplace");
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
