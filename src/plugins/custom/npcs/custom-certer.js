// Mortimer and Randolph: custom certer NPCs with their own dialogue (a "Who are
// you?" option and a fixed 5-option amount menu). ids resolved by name

const items = require('@2003scape/rsc-data/config/items');
const npcs = require('@2003scape/rsc-data/config/npcs');
const { getQOLConfig, isUltimateIronman } = require('../../../model/qol-config');

function buildNameIndex(arr) {
    const index = new Map();
    for (let id = 0; id < arr.length; id += 1) {
        const def = arr[id];
        if (def && def.name) {
            const key = def.name.toLowerCase();
            if (!index.has(key)) {
                index.set(key, id);
            }
        }
    }
    return index;
}

let NPC_INDEX = null;
function resolveNpcId(name) {
    if (!NPC_INDEX) {
        NPC_INDEX = buildNameIndex(npcs);
    }
    const found = NPC_INDEX.get(name.toLowerCase());
    if (found === undefined) {
        throw new RangeError(`custom-certer.js: no npc named "${name}"`);
    }
    return found;
}

let ITEM_INDEX = null;
function resolveItemId(name) {
    if (!ITEM_INDEX) {
        ITEM_INDEX = buildNameIndex(items);
    }
    const found = ITEM_INDEX.get(name.toLowerCase());
    if (found === undefined) {
        throw new RangeError(`custom-certer.js: no item named "${name}"`);
    }
    return found;
}

let DATA = null;
function data() {
    if (DATA) {
        return DATA;
    }

    const mortimerId = resolveNpcId('Mortimer');
    const randolphId = resolveNpcId('Randolph');

    // certer table: Mortimer/Randolph entries
    const certerTable = {
        [mortimerId]: [
            resolveItemId('Rune stone'),
            resolveItemId('stat restoration Potion'), // full/3-dose
            resolveItemId('Cure poison Potion'), // full/3-dose
            resolveItemId('Poison antidote') // full/3-dose
        ],
        [randolphId]: [
            resolveItemId('giant Carp'),
            resolveItemId('lava eel'),
            resolveItemId('Manta ray'),
            resolveItemId('Sea turtle')
        ]
    };

    // cert -> goods pairs, only those Mortimer and Randolph need
    const certToItemId = new Map([
        [resolveItemId('Rune stone certificate'), resolveItemId('Rune stone')],
        [resolveItemId('stat restoration Potion certificate'), resolveItemId('stat restoration Potion')],
        [resolveItemId('Cure poison Potion certificate'), resolveItemId('Cure poison Potion')],
        [resolveItemId('Poison antidote certificate'), resolveItemId('Poison antidote')],
        [resolveItemId('giant carp certificate'), resolveItemId('giant Carp')],
        [resolveItemId('Lava eel certificate'), resolveItemId('lava eel')],
        [resolveItemId('Manta ray certificate'), resolveItemId('Manta ray')],
        [resolveItemId('Sea turtle certificate'), resolveItemId('Sea turtle')]
    ]);

    DATA = { mortimerId, randolphId, certerTable, certToItemId };
    return DATA;
}

// reverse lookup of certToItemId by value; first match wins
function certIdFor(itemId) {
    for (const [certId, goodsId] of data().certToItemId) {
        if (goodsId === itemId) {
            return certId;
        }
    }
    return -1;
}

function itemName(id) {
    return items[id].name;
}

// cert
async function cert(player, npc, itemsCerted) {
    const certableNames = itemsCerted.map(itemName);

    player.message('@que@Which items would you like to certificate?');
    const choice = await player.ask(certableNames, false);
    if (choice === -1) {
        return;
    }

    const itemToCert = itemsCerted[choice];
    const itemToCertName = certableNames[choice];
    const certId = certIdFor(itemToCert);
    if (certId === -1) {
        return;
    }

    player.message(`@que@How much ${itemToCertName} would you like me to certificate?`);

    const bankExchange = getQOLConfig(player.world.server.config).wantCerterBankExchange;
    const amountOptions = ['five', 'ten', 'Fifteen', 'Twenty', 'Twentyfive'];
    if (bankExchange) {
        amountOptions.push('All from bank');
    }

    const certAmountChoice = await player.ask(amountOptions, false);
    if (certAmountChoice === -1) {
        return;
    }

    if (certAmountChoice === 5 && bankExchange) {
        if (isUltimateIronman(player)) {
            player.message('As an Ultimate Ironman, you cannot use this feature');
            return;
        }

        const certItemCount = player.bank.countId(itemToCert);
        if (certItemCount <= 0) {
            player.message(`You don't have any ${itemToCertName} in your bank`);
            return;
        }

        const possibleCerts = Math.floor(certItemCount / 5);
        if (possibleCerts <= 0) {
            player.message(`@que@You do not have enough ${itemToCertName} to certificate`);
            return;
        }

        const itemsToRemove = possibleCerts * 5;
        if (player.bank.remove(itemToCert, itemsToRemove)) {
            player.inventory.add(certId, possibleCerts);
            player.message(`${npc.definition.name} removes ${itemsToRemove} ${itemToCertName} from your bank`);
            await player.world.sleepTicks(3);
            player.message(`@que@And hands you ${possibleCerts} ${itemToCertName} certificates`);
            await player.world.sleepTicks(3);
        }
    } else {
        const certAmount = (1 + certAmountChoice) * 5;
        if (!player.inventory.has(itemToCert, certAmount)) {
            player.message(`@que@You don't have that much ${itemToCertName}`);
            return;
        }

        player.message(`You exchange your ${itemToCertName} for certificates`);
        player.inventory.remove(itemToCert, certAmount);
        player.inventory.add(certId, certAmountChoice + 1);
    }
}

// uncert
async function uncert(player, npc, itemsCerted) {
    const certableNames = itemsCerted.map(itemName);

    player.message('@que@Which certificates would you like to change?');
    const choice = await player.ask(certableNames, false);
    if (choice === -1) {
        return;
    }

    const uncertItem = itemsCerted[choice];
    const uncertItemName = certableNames[choice];
    const certId = certIdFor(uncertItem);

    player.message(`How many ${uncertItemName} certificates would you like to change?`);

    const bankExchange = getQOLConfig(player.world.server.config).wantCerterBankExchange;
    const amountOptions = ['One', 'two', 'Three', 'four', 'five'];
    if (bankExchange) {
        amountOptions.push('All to bank');
    }

    const certAmountChoice = await player.ask(amountOptions, false);
    if (certAmountChoice === -1) {
        return;
    }

    if (certAmountChoice === 5 && bankExchange) {
        if (isUltimateIronman(player)) {
            player.message('As an Ultimate Ironman, you cannot use this feature');
            return;
        }

        const certsHeld = player.inventory.has(certId) ? countInventory(player, certId) : 0;
        if (certsHeld <= 0) {
            player.message(`You don't have any ${uncertItemName} certificates!`);
            return;
        }

        const uncertItemAmount = certsHeld * 5;
        player.inventory.remove(certId, certsHeld);
        player.bank.add(uncertItem, uncertItemAmount);
        player.message('@que@You exchange the certificates');
        await player.world.sleepTicks(3);
        player.message(`${npc.definition.name} places ${uncertItemAmount} ${uncertItemName} in your bank`);
        await player.world.sleepTicks(3);
    } else {
        const certAmount = certAmountChoice + 1;
        const uncertItemAmount = (certAmountChoice + 1) * 5;
        if (!player.inventory.has(certId, certAmount)) {
            player.message("@que@You don't have that many certificates!");
            return;
        }

        player.inventory.remove(certId, certAmount);
        player.message(`You exchange your certificates for ${uncertItemName}`);
        player.inventory.add(uncertItem, uncertItemAmount);
    }
}

// inventory count by id
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
    const { mortimerId, randolphId, certerTable } = data();

    if (npc.id !== mortimerId && npc.id !== randolphId) {
        return false;
    }

    player.engage(npc);

    const npcName = npc.definition.name;
    const itemsCerted = certerTable[npc.id];

    await npc.say(`Hello I'm ${npcName}`, 'Welcome to my certificate stall');

    const options = [
        "I'd like to certificate some things please",
        "I'd like to change some certificates for items please",
        'What things do you certificate?',
        'Who are you?'
    ];

    const option = await player.ask(options, true);

    if (option === 0) {
        await cert(player, npc, itemsCerted);
    } else if (option === 1) {
        await uncert(player, npc, itemsCerted);
    } else if (option === 2) {
        if (npc.id === mortimerId) {
            await npc.say(
                'I can certificate rune stone',
                'stat restoration potions',
                'cure poison potions',
                'and poison antidotes'
            );
        } else if (npc.id === randolphId) {
            await npc.say(
                'I specialize in certificating rare seafood',
                'Specifically giant carp',
                'lava eels',
                'manta rays',
                'and sea turtles'
            );
        }
    } else if (option === 3) {
        await npc.say(
            'Why, my brother and I used to be the wealthiest men in the city!',
            'We practically owned the auction house',
            'Until we were double crossed by that scoundrel Valentine',
            "But mark my words, we'll be back!",
            "You've not yet heard the last of Randolph and Mortimer!"
        );
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
