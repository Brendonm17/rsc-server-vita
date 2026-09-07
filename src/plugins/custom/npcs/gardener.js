// gardener npc talk dialogue: harvesting tips and a shop

const npcs = require('@2003scape/rsc-data/config/npcs');

let GARDENER_ID = null;
function gardenerId() {
    if (GARDENER_ID === null) {
        GARDENER_ID = npcs.findIndex(
            (def) => def && def.name && def.name.toLowerCase() === 'gardener'
        );
        if (GARDENER_ID === -1) {
            throw new RangeError('gardener.js: no npc named "Gardener"');
        }
    }
    return GARDENER_ID;
}

async function tips(player, npc) {
    await npc.say(
        'Certainly, is there anything in particular',
        'you might be wondering about?'
    );

    const subOption = await player.ask(
        [
            'Sometimes I damage the produce',
            'How can I take care for a specific harvesting spot?',
            "I don't seem to improve my harvesting skills on certain areas"
        ],
        true
    );

    if (subOption === 0) {
        await npc.say(
            'You can get yield from fruit trees and allotments by hand',
            'but you will get better results if you use a tool',
            'such as fruit pickers or hand shovels'
        );
    } else if (subOption === 1) {
        await npc.say(
            'While collecting you may weaken the spot',
            'in such case you will know whether to soil or water it',
            'and in doing so you may end up with extra produce'
        );
    } else if (subOption === 2) {
        await npc.say(
            'Some areas have magical soil and the allotment',
            'never depletes',
            'Others are drops mysterious forces have',
            'left behind in synchronized harmony',
            'and you simply pick up instead of harvest'
        );
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== gardenerId()) {
        return false;
    }

    player.engage(npc);

    await npc.say('Can I help you at all?');

    const option = await player.ask(
        [
            'Yes please. What are you selling?',
            'No thanks',
            'Do you have any tips on getting produce?'
        ],
        true
    );

    if (option === 0) {
        await npc.say('Take a look');
        player.disengage();
        player.openShop('gardener');
        return true;
    } else if (option === 2) {
        await tips(player, npc);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
