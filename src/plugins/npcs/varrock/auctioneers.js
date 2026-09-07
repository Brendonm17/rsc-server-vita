// auctioneer and auction clerk npcs. the auctioneer offers "browse the auction
// house"; the clerk adds "teleport to varrock centre". ids resolve by name from
// custom-npcs.json (currently 796 / 797).
//
// neither npc has a spawn yet, so both are unreachable in-game until one is added.

const { totalLevel } = require('../../../model/market');
const { IronmanMode } = require('../../../model/game-modes');
const { verifyBankPin } = require('../../../packet-handlers/interface/bank-pin');
const customNpcs = require('../../../sp/custom-npcs.json');

const COINS_ID = 10;

// base npc table length before custom npcs are appended
const CUSTOM_NPC_BASE = 794;

function resolveNpcId(name) {
    const index = customNpcs.findIndex((npc) => npc.name === name);
    return index === -1 ? -1 : CUSTOM_NPC_BASE + index;
}

const AUCTIONEER_ID = resolveNpcId('Auctioneer');
const AUCTION_CLERK_ID = resolveNpcId('Auction Clerk');

// ironman/ultimate/hardcore/transfer cannot use the auction
function ironmanRestricted(player) {
    return (
        player.isIronMan(IronmanMode.Ironman) ||
        player.isIronMan(IronmanMode.Ultimate) ||
        player.isIronMan(IronmanMode.Hardcore) ||
        player.isIronMan(IronmanMode.Transfer)
    );
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== AUCTIONEER_ID && npc.id !== AUCTION_CLERK_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Hello');

    const isClerk = npc.id === AUCTION_CLERK_ID;
    const options = isClerk
        ? [
              "I'd like to browse the auction house",
              'Can you teleport me to Varrock Centre'
          ]
        : ["I'd like to browse the auction house"];

    const menu = await player.ask(options, true);

    if (menu === 0) {
        if (ironmanRestricted(player)) {
            player.message('As an Ironman, you cannot use the Auction.');
            player.disengage();
            return true;
        }

        if (totalLevel(player) < 100) {
            await npc.say("Sorry, you don't seem trustworthy enough yet.");
            player.message(
                '@que@You must have over 100 total skill to use the auction house.'
            );
            player.disengage();
            return true;
        }

        if (!(await verifyBankPin(player))) {
            player.disengage();
            return true;
        }

        await npc.say(`Certainly ${player.isMale() ? 'Sir' : 'Miss'}`);
        player.auctionHouseOpen = true;
        player.disengage();
        player.world.market.openHouse(player);
        return true;
    }

    if (menu === 1) {
        // auction clerk only (the auctioneer's menu has one option)
        await npc.say(
            `Yes of course ${player.isMale() ? 'Sir' : 'Miss'}`,
            'the costs is 1,000 coins'
        );

        const tMenu = await player.ask(['Teleport me', "I'll stay here"], true);

        if (tMenu === 0) {
            if (player.inventory.has(COINS_ID, 1000)) {
                player.inventory.remove(COINS_ID, 1000);
                player.teleport(133, 508);
                // no confirmation message on this path
            } else {
                player.message("You don't seem to have enough coins");
            }
        }

        player.disengage();
        return true;
    }

    player.disengage();
    return true;
}

// npc right-click command. the dispatcher already locked player and npc;
// a truthy return means this handler unlocks them itself.
async function onNPCCommand(player, npc, command) {
    if (npc.id !== AUCTIONEER_ID && npc.id !== AUCTION_CLERK_ID) {
        return false;
    }

    // total level checked before branching on npc/command
    if (totalLevel(player) < 100) {
        npc.unlock();
        player.unlock();
        player.message(
            'You must have over 100 total skill to use the auction house.'
        );
        return true;
    }

    if (command === 'auction') {
        if (ironmanRestricted(player)) {
            npc.unlock();
            player.unlock();
            player.message('As an Ironman, you cannot use the Auction.');
            return true;
        }

        // stay locked while the pin pad is up
        const verified = await verifyBankPin(player);

        npc.unlock();
        player.unlock();

        if (!verified) {
            return true;
        }

        player.message(
            `Welcome to the auction house ${player.isMale() ? 'Sir' : 'Miss'}!`
        );
        player.auctionHouseOpen = true;
        player.world.market.openHouse(player);
        return true;
    }

    // auction clerk "teleport" command, unreachable today (each npc has a
    // single "auction" command in custom-npcs.json); wired for if one is added
    if (command === 'teleport' && npc.id === AUCTION_CLERK_ID) {
        player.engage(npc);

        player.message(
            'Would you like to be teleport to Varrock centre for 1000 gold?'
        );
        await player.world.sleepTicks(2);

        const choice = await player.ask(['Yes please!', 'No thanks.'], false);

        if (choice === 0) {
            if (player.inventory.has(COINS_ID, 1000)) {
                player.inventory.remove(COINS_ID, 1000);
                player.teleport(133, 508);
                player.message('You have been teleported to the Varrock Centre');
            } else {
                player.message("You don't seem to have enough coins");
            }
        } else {
            player.message('You decide to stay where you are located.');
        }

        player.disengage();
        return true;
    }

    npc.unlock();
    player.unlock();
    return false;
}

module.exports = { onTalkToNPC, onNPCCommand };
