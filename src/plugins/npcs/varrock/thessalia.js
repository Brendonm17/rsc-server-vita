// thessalia: fine-clothes shop, replaces a lost scythe/bunny ears/rings/cape

const items = require('@2003scape/rsc-data/config/items');

const THESSALIA_ID = 59;
const SCYTHE_ID = 1289;
const BUNNY_EARS_ID = 1156;

function customItemId(name) {
    for (let i = 0; i < items.length; i += 1) {
        if (items[i] && items[i].name === name) {
            return i;
        }
    }
    return -1;
}

function owns(player, id) {
    if (id < 0) {
        return true; // missing item counts as held, option stays hidden
    }
    if (player.inventory.has(id)) {
        return true;
    }
    return !!(player.bank && player.bank.items.some((it) => it.id === id));
}

async function replacement(player, npc, option, line, message, id) {
    await player.say(option);
    await npc.say(line);
    player.message(message);
    player.inventory.add(id, 1);
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== THESSALIA_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello');
    await npc.say('Do you want to buy any fine clothes?');

    const ringOfBunny = customItemId('Ring of Bunny');
    const ringOfEgg = customItemId('Ring of Egg');
    const capeOfInclusion = customItemId('Cape of Inclusion');

    const options = [];
    const optionScythe = 'I have lost my scythe can I get another one please?';
    if (player.cache.scythe && !owns(player, SCYTHE_ID)) {
        options.push(optionScythe);
    }
    const optionEars = 'I have lost my bunny ears can I get some more please?';
    if (player.cache.bunny_ears && !owns(player, BUNNY_EARS_ID)) {
        options.push(optionEars);
    }
    const optionBunnyRing = 'I have lost my bunny ring can I get another one please?';
    if (player.cache.ester_rings && !owns(player, ringOfBunny)) {
        options.push(optionBunnyRing);
    }
    const optionEggRing = 'I have lost my egg ring can I get another one please?';
    if (player.cache.ester_rings && !owns(player, ringOfEgg)) {
        options.push(optionEggRing);
    }
    const optionPrideCape = 'Can I get another cape of inclusion please?';
    if (player.cache.pride_cape && !owns(player, capeOfInclusion)) {
        options.push(optionPrideCape);
    }
    const optionShop = 'What have you got?';
    options.push(optionShop);
    const optionBye = 'No, thank you';
    options.push(optionBye);

    const option = await player.ask(options, false);
    const picked = options[option];

    if (picked === optionScythe) {
        await replacement(player, npc, 'I have lost my scythe can I get another please?',
            'Ohh you poor dear, I have another here', 'Thessalia gives you a new scythe', SCYTHE_ID);
    } else if (picked === optionEars) {
        await replacement(player, npc, optionEars,
            'Ohh you poor dear, I have some more here', 'Thessalia gives you some new bunny ears', BUNNY_EARS_ID);
    } else if (picked === optionShop) {
        await player.say('What have you got?');
        player.disengage();
        player.openShop('thessalias-fine-clothes');
        return true;
    } else if (picked === optionBunnyRing) {
        await replacement(player, npc, optionBunnyRing,
            'Ohh you poor dear, I have another here', 'Thessalia gives you a new bunny ring', ringOfBunny);
    } else if (picked === optionEggRing) {
        await replacement(player, npc, optionEggRing,
            'Ohh you poor dear, I have another here', 'Thessalia gives you a new egg ring', ringOfEgg);
    } else if (picked === optionPrideCape) {
        await replacement(player, npc, optionPrideCape,
            'Ohh you poor dear, I have another here', 'Thessalia gives you a new cape of inclusion', capeOfInclusion);
    } else {
        await player.say('No, thank you');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
