// https://classic.runescape.wiki/w/Transcript:Miles

const items = require('@2003scape/rsc-data/config/items');

const {
    certificates: CERTIFICATE_IDS,
    certers
} = require('@2003scape/rsc-data/certificates');

const { getQOLConfig, isUltimateIronman } = require('../../model/qol-config');

// { certificateID: itemID }
const ITEM_IDS = {};

for (const [itemID, certificateID] of Object.entries(CERTIFICATE_IDS)) {
    ITEM_IDS[certificateID] = +itemID;
}

const CERTER_IDS = new Set(Object.keys(certers).map(Number));

// remove sidney smith since she's a special case
CERTER_IDS.delete(778);

function getCerter(id) {
    if (certers[id].reference) {
        return getCerter(certers[id].reference);
    }

    return certers[id];
}

async function tradeInCertificates(player, certer, itemTypeName) {
    player.message('what sort of certificate do you wish to trade in?');

    const certificateType = await player.ask(
        certer.certificates.map(({ id, alias }) => {
            return alias || items[id].name.replace(/ certificate/i, '');
        }),
        false
    );

    player.message('How many certificates do you wish to trade in?');

    // "all to bank" option only shown when bank exchange enabled
    const bankExchange = getQOLConfig(player.world.server.config)
        .wantCerterBankExchange;

    const amountOptions = ['One', 'two', 'Three', 'four', 'five'];

    if (bankExchange) {
        amountOptions.push('All to bank');
    }

    const chosenAmount = await player.ask(amountOptions, false);

    if (chosenAmount < 0) {
        return;
    }

    const certificateID = certer.certificates[certificateType].id;
    const itemID = ITEM_IDS[certificateID];

    // all to bank: converts all held certificates
    if (bankExchange && chosenAmount === 5) {
        // OpenRSC ~220-223: Ultimate Ironmen may not use certer bank exchange.
        if (isUltimateIronman(player)) {
            player.message(
                'As an Ultimate Ironman, you cannot use certer bank exchange.'
            );
            return;
        }

        const certAmount = player.inventory.count
            ? player.inventory.count(certificateID)
            : countInventory(player, certificateID);

        if (certAmount <= 0) {
            const name = items[certificateID].name.replace(/ certificate/i, '');
            player.message(
                `You don't have any ${name} certificates to exchange`
            );
            return;
        }

        const bankAmount = certAmount * 5;

        // certs returned if bank has no room
        if (!player.bank.canHold(itemID)) {
            player.message(
                'Your bank seems to be too full to exchange certificates ' +
                    'into it at this time.'
            );
            return;
        }

        player.inventory.remove(certificateID, certAmount);

        if (player.bank.add(itemID, bankAmount)) {
            player.message(
                'You exchange the certificates, ' +
                    `${bankAmount} ${items[itemID].name} is added to your bank`
            );
        } else {
            player.message(
                'There was a problem exchanging certificates. Your ' +
                    'certificates are returned.'
            );
            player.inventory.add(certificateID, certAmount);
        }

        return;
    }

    // exchange 1-5 certificates
    const certificateAmount = chosenAmount + 1;

    if (player.inventory.has(certificateID, certificateAmount)) {
        player.inventory.remove(certificateID, certificateAmount);
        player.inventory.add(itemID, certificateAmount * 5);

        player.message(`You exchange your certificates for ${itemTypeName}`);
    } else {
        player.message("You don't have that many certificates");
    }
}

async function tradeInItems(player, certer, itemTypeName) {
    player.message(`what sort of ${itemTypeName} do you wish to trade in?`);

    const itemType = await player.ask(
        certer.items.map(({ id, alias }) => {
            return alias || items[id].name;
        }),
        false
    );

    // "fishs" is accurate
    player.message(`How many ${certer.type}s do you wish to trade in?`);

    // "all from bank" option only shown when bank exchange enabled
    const bankExchange = getQOLConfig(player.world.server.config)
        .wantCerterBankExchange;

    const amountOptions = ['five', 'ten', 'Fifteen', 'Twenty', 'Twentyfive'];

    if (bankExchange) {
        amountOptions.push('All from bank');
    }

    const chosenAmount = await player.ask(amountOptions, false);

    if (chosenAmount < 0) {
        return;
    }

    const itemID = certer.items[itemType].id;
    const certificateID = CERTIFICATE_IDS[itemID];

    // all from bank: converts all banked certificates
    if (bankExchange && chosenAmount === 5) {
        // OpenRSC ~284-287: Ultimate Ironmen may not use certer bank exchange.
        if (isUltimateIronman(player)) {
            player.message(
                'As an Ultimate Ironman. you cannot use certer bank exchange.'
            );
            return;
        }

        const certAmount = Math.floor(player.bank.countId(itemID) / 5);
        const itemAmount = certAmount * 5;

        if (itemAmount <= 0) {
            const name = certer.items[itemType].alias || items[itemID].name;
            player.message(`You don't have any ${name} to certificate`);
            return;
        }

        if (player.bank.remove(itemID, itemAmount)) {
            player.message(
                `You exchange the ${certer.type}, ${itemAmount} ` +
                    `${items[itemID].name} is taken from your bank`
            );
            player.inventory.add(certificateID, certAmount);
        }

        return;
    }

    // exchange 5-25 items
    const itemAmount = (chosenAmount + 1) * 5;

    if (player.inventory.has(itemID, itemAmount)) {
        player.inventory.remove(itemID, itemAmount);
        player.inventory.add(certificateID, Math.floor(itemAmount / 5));

        player.message(`You exchange your ${itemTypeName} for certificates`);
    } else {
        const amountName = /^(logs|bars)$/.test(certer.type) ? 'many' : 'much';

        player.message(`You don't have that ${amountName} ${certer.type}s`);
    }
}

// count inventory items by id
function countInventory(player, id) {
    let total = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            total += item.definition.stackable ? item.amount : 1;
        }
    }

    return total;
}

async function onTalkToNPC(player, npc) {
    if (!CERTER_IDS.has(npc.id)) {
        return false;
    }

    const certer = getCerter(npc.id);
    const typePlural = certer.type !== 'fish' ? certer.type + 's' : certer.type;
    const itemTypeName = typePlural !== 'ores' ? typePlural : certer.type;

    player.engage(npc);

    await npc.say(`Welcome to my ${certer.type} exchange stall`);

    const choice = await player.ask(
        [
            'I have some certificates to trade in',
            `I have some ${typePlural} to trade in`,
            `What is a${certer.type === 'ore' ? 'n' : ''} ${certer.type} ` +
                'exchange stall?'
        ],
        true
    );

    switch (choice) {
        case 0: // certificates
            player.disengage();
            await tradeInCertificates(player, certer, itemTypeName);
            break;
        case 1: // items
            player.disengage();
            await tradeInItems(player, certer, itemTypeName);
            break;
        case 2: // what is a <type> stall?
            await npc.say(
                `You may exchange your ${typePlural} here`,
                'For certificates which are light and easy to carry',
                'You can carry many of these certificates at once unlike ' +
                    typePlural,
                `5 ${typePlural} will give you one certificate`,
                'You may also redeem these certificates here for ' +
                    `${typePlural} again`,
                'The advantage of doing this is',
                `You can trade large amounts of ${typePlural} with other ` +
                    'players quickly and safely'
            );

            player.disengage();
            break;
    }

    return true;
}

module.exports = { onTalkToNPC };
