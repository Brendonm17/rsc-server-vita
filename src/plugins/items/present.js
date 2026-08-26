// Present (item 980, command "open" -> onInventoryCommand).
// only openRSCRollAndAwardPresent ported (cabbage path needs WANT_EQUIPMENT_TAB). quest stages: gertrudesCat, shiloVillage (-1 = complete).

const itemDefs = require('@2003scape/rsc-data/config/items');
const { IronmanMode } = require('../../model/game-modes');

const PRESENT_ID = 980;

const SWAMP_TOAD_ID = 895;
const KITTEN_ID = 1096;
const CABBAGE_ID = 18;
const CHOC_CRUNCHIES_ID = 911;
const SPICE_CRUNCHIES_ID = 914;
const CHOCOLATE_SLICE_ID = 336;
const UGTHANKI_KEBAB_ID = 923;
const TASTY_UGTHANKI_KEBAB_ID = 1102;
const BREAD_DOUGH_ID = 137;
const MILK_ID = 22;
const BRANDY_ID = 876;
const WHISKY_ID = 868;
const VODKA_ID = 869;
const GIN_ID = 870;
const POISON_CHALICE_ID = 737;
const OYSTER_PEARL_BOLT_TIPS_ID = 790;
const GNOME_BALL_ID = 981;
const PARAMAYA_REST_TICKET_ID = 987;
const SHIP_TICKET_ID = 988;

const GNOME_ROBE_IDS = [836, 837, 838, 839, 840];
const GNOMESHAT_IDS = [841, 842, 843, 844, 845];
const GNOME_TOP_IDS = [846, 847, 848, 849, 850];
const BOOTS_IDS = [966, 967, 968, 969, 970];
const DESERT_BOOTS_ID = 990;

const SPECIAL_CURRY_UNUSED_ID = 924;
const GNOME_BATTA_UNUSED_ID = 903;

// openRSCPresentDrops: two-level weighted table, pick a sub-table by table weight then an item by item weight
const PET_TABLE = [
    { id: SWAMP_TOAD_ID, weight: 1 },
    { id: KITTEN_ID, weight: 1 }
];

const FOOD_TABLE = [
    { id: CABBAGE_ID, weight: 2 },
    { id: CHOC_CRUNCHIES_ID, weight: 3 },
    { id: SPICE_CRUNCHIES_ID, weight: 3 },
    { id: CHOCOLATE_SLICE_ID, weight: 3 },
    { id: UGTHANKI_KEBAB_ID, weight: 1 },
    { id: TASTY_UGTHANKI_KEBAB_ID, weight: 1 },
    { id: BREAD_DOUGH_ID, weight: 3 }
];

const ALCOHOL_TABLE = [
    { id: BRANDY_ID, weight: 1 },
    { id: WHISKY_ID, weight: 1 },
    { id: VODKA_ID, weight: 1 },
    { id: GIN_ID, weight: 1 },
    { id: POISON_CHALICE_ID, weight: 1 }
];

const COOL_ITEMS_TABLE = [
    { id: OYSTER_PEARL_BOLT_TIPS_ID, amount: 5, weight: 1 },
    { id: GNOME_BALL_ID, weight: 1 },
    { id: PARAMAYA_REST_TICKET_ID, weight: 2 },
    { id: SHIP_TICKET_ID, weight: 2 }
];

const GNOME_ROBES_TABLE = [
    ...GNOME_ROBE_IDS.map((id) => ({ id, weight: 1 })),
    ...GNOMESHAT_IDS.map((id) => ({ id, weight: 1 })),
    ...GNOME_TOP_IDS.map((id) => ({ id, weight: 1 }))
];

const CUTE_SOCKS_TABLE = [
    ...BOOTS_IDS.map((id) => ({ id, weight: 1 })),
    { id: DESERT_BOOTS_ID, weight: 1 }
];

const UNOBTAINABLE_TABLE = [
    { id: SPECIAL_CURRY_UNUSED_ID, weight: 2 },
    { id: GNOME_BATTA_UNUSED_ID, weight: 1 }
];

const TOP_LEVEL_TABLE = [
    { table: PET_TABLE, weight: 1 },
    { table: FOOD_TABLE, weight: 4 },
    { table: ALCOHOL_TABLE, weight: 3 },
    { table: COOL_ITEMS_TABLE, weight: 2 },
    { table: GNOME_ROBES_TABLE, weight: 3 },
    { table: CUTE_SOCKS_TABLE, weight: 3 },
    { table: UNOBTAINABLE_TABLE, weight: 1 }
];

// DropTable.rollItem-equivalent weighted pick.
function weightedChoice(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.floor(Math.random() * total);

    for (const entry of entries) {
        if (roll < entry.weight) {
            return entry;
        }

        roll -= entry.weight;
    }

    return entries[entries.length - 1];
}

function rollPresentPrize() {
    const subTable = weightedChoice(TOP_LEVEL_TABLE).table;
    const entry = weightedChoice(subTable);

    return { id: entry.id, amount: entry.amount || 1 };
}

function itemName(id) {
    return itemDefs[id].name.toLowerCase();
}

function isIronmanRestricted(player) {
    // onOpInv check (Ironman/Ultimate/Hardcore, no Transfer) is player.isIronMan() no-arg form
    return player.isIronMan();
}

function isIronmanRestrictedIncludingTransfer(player) {
    // onUsePlayer's otherPlayer check additionally includes Transfer.
    return (
        player.isIronMan(IronmanMode.Ironman) ||
        player.isIronMan(IronmanMode.Ultimate) ||
        player.isIronMan(IronmanMode.Hardcore) ||
        player.isIronMan(IronmanMode.Transfer)
    );
}

// "hope they enjoy" pre-message, computed from the originally rolled prize (before the KITTEN->SWAMP_TOAD fallback
// swap)
function hopeTheyEnjoyMessage(prize, otherPlayer) {
    if (
        prize.id === KITTEN_ID &&
        otherPlayer.questStages.gertrudesCat !== -1
    ) {
        return '@que@You hope they enjoy the swamp toad you got them!';
    }

    if (BOOTS_IDS.includes(prize.id) || prize.id === DESERT_BOOTS_ID) {
        return '@que@You hope they enjoy the socks you got them!';
    }

    return `@que@You hope they enjoy the ${itemName(prize.id)} you got them!`;
}

async function openRSCRollAndAwardPresent(player, otherPlayer, selfUse) {
    let prize = rollPresentPrize();
    const prizeName = itemName(prize.id);

    const unwrapDelay = 2;
    const readingDelay = 2;

    if (selfUse) {
        // else branch: reached via onInventoryCommand for Ironman players (selfUse=true)
        otherPlayer.message('@que@You unwrap the present...');
        await player.world.sleepTicks(unwrapDelay);
        otherPlayer.message(`@que@oh! it's a ${prizeName}!`);
        otherPlayer.inventory.add(prize.id, prize.amount);
        return;
    }

    player.message(`@que@You give a present to ${otherPlayer.username}`);
    otherPlayer.message(`@que@${player.username} handed you a present...`);
    await player.world.sleepTicks(1);

    player.message(hopeTheyEnjoyMessage(prize, otherPlayer));

    switch (prize.id) {
        // Pet table
        case KITTEN_ID: {
            if (otherPlayer.questStages.gertrudesCat === -1) {
                otherPlayer.message(
                    '@que@As you unwrap the present, you hear a mewing noise...!!'
                );
                await player.world.sleepTicks(unwrapDelay);
                player.message(
                    `@que@@yel@${otherPlayer.username}: oh my gosh a kitten!!?!`
                );
                otherPlayer.inventory.add(prize.id, prize.amount);
                await otherPlayer.say('oh my gosh a kitten!!?!');
                otherPlayer.message(
                    `@que@@yel@${player.username}: yeah, I hope you enjoy your new pet and take good care of them!`
                );
                await player.say(
                    'yeah, I hope you enjoy your new pet and take good care of them!'
                );
                break;
            }

            // quest not complete: kitten ineligible, substitute swamp toad and fall through to the SWAMP_TOAD
            // dialogue
            prize = { id: SWAMP_TOAD_ID, amount: 1 };
        }
        // eslint-disable-next-line no-fallthrough
        case SWAMP_TOAD_ID: {
            otherPlayer.message(
                '@que@As you unwrap the present, you hear a croaking noise...!!'
            );
            await player.world.sleepTicks(unwrapDelay);
            player.message(
                `@que@@yel@${otherPlayer.username}: oh my gosh a toad!!?!`
            );
            otherPlayer.inventory.add(prize.id, prize.amount);
            await otherPlayer.say('oh my gosh a toad!!?!');
            otherPlayer.message(
                `@que@@yel@${player.username}: yeah, I hope you enjoy your new pet and take good care of them!`
            );
            await player.say(
                'yeah, I hope you enjoy your new pet and take good care of them!'
            );
            player.message(
                '@que@@red@Server Message: @whi@please do not viciously dismember your new pet toad'
            );
            otherPlayer.message(
                '@que@@red@Server Message: @whi@please do not viciously dismember your new pet toad'
            );
            break;
        }

        // Food table
        case CABBAGE_ID:
            otherPlayer.message(
                '@que@As you unwrap the present, you can smell something weird...'
            );
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@it's a cabbage...!!!");
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case CHOC_CRUNCHIES_ID:
        case SPICE_CRUNCHIES_ID:
        case CHOCOLATE_SLICE_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            if (prize.id === CHOCOLATE_SLICE_ID) {
                otherPlayer.message(
                    "@que@Awh, it's some really nice homemade chocolate cake!"
                );
            } else {
                otherPlayer.message(
                    `@que@Awh, it's some really nice homemade ${prizeName}!`
                );
            }
            otherPlayer.inventory.add(prize.id, prize.amount);
            await player.world.sleepTicks(readingDelay);
            otherPlayer.message(
                "@que@and it looks like there's also an entire bucket of milk inside!"
            );
            otherPlayer.inventory.add(MILK_ID);
            break;

        case UGTHANKI_KEBAB_ID:
        case TASTY_UGTHANKI_KEBAB_ID:
            otherPlayer.message(
                '@que@As you unwrap the present, you can smell something weird...'
            );
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@it's an ugthanki kebab!!");
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case BREAD_DOUGH_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(
                "@que@Ah! it's an Amish Friendship Bread starter...!"
            );
            otherPlayer.inventory.add(prize.id, prize.amount);
            await player.world.sleepTicks(readingDelay);
            otherPlayer.message(
                "@que@You're supposed to break off a piece to act as a starter yeast, and bake the rest."
            );
            await player.world.sleepTicks(readingDelay);
            otherPlayer.message(
                '@que@Take the piece you saved and use more flour & water to create volume'
            );
            await player.world.sleepTicks(readingDelay);
            otherPlayer.message(
                '@que@The yeast should grow over time if you feed it sugar,'
            );
            await player.world.sleepTicks(readingDelay);
            otherPlayer.message('@que@and then you can pass it on to a friend :-)');
            break;

        // Alcohol table
        case BRANDY_ID:
        case WHISKY_ID:
        case VODKA_ID:
        case GIN_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(`@que@Oh, nice! It's some gnome ${prizeName}!`);
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case POISON_CHALICE_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(
                '@que@... it\'s some kind of strange cocktail of random spirits!'
            );
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        // Unique gift ideas
        case OYSTER_PEARL_BOLT_TIPS_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message('@que@Ooh! It\'s some pointed pearls!');
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case GNOME_BALL_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(
                '@que@Oh, fun! A gnome ball! I always wanted one of those'
            );
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case PARAMAYA_REST_TICKET_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(
                "@que@It's a gift card for a free stay in the Paramaya Inn!"
            );
            otherPlayer.inventory.add(prize.id, prize.amount);
            if (otherPlayer.questStages.shiloVillage !== -1) {
                await player.world.sleepTicks(readingDelay + 1);
                otherPlayer.message('@que@... Wonder where that is?');
            }
            break;

        case SHIP_TICKET_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(
                "@que@WOW!! it's a ticket for @mag@a trip on a cruise ship!!!!"
            );
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        // Clothes table (gnome clothing minus boots)
        case GNOME_ROBE_IDS[0]:
        case GNOME_ROBE_IDS[1]:
        case GNOME_ROBE_IDS[2]:
        case GNOME_ROBE_IDS[3]:
        case GNOME_ROBE_IDS[4]:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@it's a very nice pastel dress");
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case GNOMESHAT_IDS[0]:
        case GNOMESHAT_IDS[1]:
        case GNOMESHAT_IDS[2]:
        case GNOMESHAT_IDS[3]:
        case GNOMESHAT_IDS[4]:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@it's a very nice pastel hat");
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case GNOME_TOP_IDS[0]:
        case GNOME_TOP_IDS[1]:
        case GNOME_TOP_IDS[2]:
        case GNOME_TOP_IDS[3]:
        case GNOME_TOP_IDS[4]:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@it's a very nice pastel shirt");
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        // Socks for Christmas!
        case BOOTS_IDS[0]:
        case BOOTS_IDS[1]:
        case BOOTS_IDS[2]:
        case BOOTS_IDS[3]:
        case BOOTS_IDS[4]:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@oh! it's a pair of cute socks");
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        case DESERT_BOOTS_ID:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@oh! it's a pair of socks...!");
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;

        // Unobtainable items
        case SPECIAL_CURRY_UNUSED_ID:
            otherPlayer.message(
                '@que@As you unwrap the present, you can smell something strange...'
            );
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message("@que@it's a special christmas curry!!!");
            otherPlayer.inventory.add(prize.id, prize.amount);
            await player.world.sleepTicks(readingDelay);
            otherPlayer.message('@que@I wonder how they made it?');
            break;

        case GNOME_BATTA_UNUSED_ID:
            otherPlayer.message(
                '@que@As you unwrap the present, you can smell something weird...'
            );
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(
                "@que@it's a homemade gnome batta... kind of smells like pants"
            );
            otherPlayer.inventory.add(prize.id, prize.amount);
            await player.world.sleepTicks(readingDelay);
            otherPlayer.message('@que@I wonder how they made it?');
            break;

        // Should not be reached - every rollable item above is covered.
        default:
            otherPlayer.message('@que@You unwrap the present...');
            await player.world.sleepTicks(unwrapDelay);
            otherPlayer.message(`@que@oh! it's a ${prizeName}!`);
            otherPlayer.inventory.add(prize.id, prize.amount);
            break;
    }
}

async function onUseWithPlayer(player, otherPlayer, item) {
    if (item.id !== PRESENT_ID) {
        return false;
    }

    if (isIronmanRestrictedIncludingTransfer(otherPlayer)) {
        player.message(
            `@que@${otherPlayer.username} is an Ironman. ` +
                `${otherPlayer.isMale() ? 'He' : 'She'} stands alone.`
        );
        return true;
    }

    const config = player.world.server.config;
    const canUseCrackerOnSelf = !!(config && config.canUseCrackerOnSelf);
    const playerIP = player.socket && player.socket.remoteAddress;
    const otherIP = otherPlayer.socket && otherPlayer.socket.remoteAddress;
    const sameIP = !!(
        playerIP &&
        otherIP &&
        playerIP.toLowerCase() === otherIP.toLowerCase()
    );

    if (!canUseCrackerOnSelf && !player.isAdministrator() && sameIP) {
        player.message(`@que@${otherPlayer.username} does not want your present...`);
        return true;
    }

    // otherPlayer.getQolOptOut() block omitted - HONEST GAP, see header.

    player.faceEntity(otherPlayer);
    otherPlayer.faceEntity(player);

    player.sendBubble(item.id);

    player.inventory.remove(PRESENT_ID);

    // WANT_EQUIPMENT_TAB is always false in this port
    await openRSCRollAndAwardPresent(player, otherPlayer, false);

    return true;
}

async function onInventoryCommand(player, item) {
    if (item.id !== PRESENT_ID) {
        return false;
    }

    if (isIronmanRestricted(player)) {
        player.sendBubble(item.id);
        player.message('@que@You rip open the present and thrust your hand inside...');
        await player.world.sleepTicks(3);
        player.inventory.remove(PRESENT_ID);

        // WANT_EQUIPMENT_TAB is always false in this port
        await openRSCRollAndAwardPresent(player, player, true);
    } else {
        player.message('It would be selfish to keep this for myself');
        player.message('I should give it to someone else');
    }

    return true;
}

module.exports = { onUseWithPlayer, onInventoryCommand };
