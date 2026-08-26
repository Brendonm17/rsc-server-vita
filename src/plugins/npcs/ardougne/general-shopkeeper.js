// east ardougne adventurer's store: two shopkeepers, one shop

const KORTAN_ID = 337;
const AEMAD_ID = 336;

const SHOPKEEPER_IDS = new Set([KORTAN_ID, AEMAD_ID]);

async function onTalkToNPC(player, npc) {
    if (!SHOPKEEPER_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Hello you look like a bold adventurer',
        "You've come to the right place for adventurer's equipment"
    );

    const option = await player.ask(
        ['Oh that sounds intersting', "No I've come to the wrong place"],
        false
    );

    if (option === 0) {
        await player.say('Oh that sounds interesting');
        player.disengage();
        player.openShop('east-ardougne-adventurers');
        return true;
    } else if (option === 1) {
        await player.say("No I've come to the wrong place");
        await npc.say('Hmph');
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
