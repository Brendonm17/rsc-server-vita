// bankers: bank access, bank pins, and auction collect
// bank-pin primitives live in packet-handlers/interface/bank-pin.js
// verified flag lasts the session

const bankPin = require('../../packet-handlers/interface/bank-pin');
const { IronmanMode } = require('../../model/game-modes');

const BANKER_ID = 95;
const FAIRY_BANKER_ID = 224;
const BANKER_ALKHARID_ID = 268;
const GNOME_BANKER_ID = 540;
const JUNGLE_BANKER_ID = 617;
// gundai: a standard banker at the mage arena
const GUNDAI_ID = 792;

const BANKER_IDS = new Set([
    BANKER_ID,
    FAIRY_BANKER_ID,
    BANKER_ALKHARID_ID,
    GNOME_BANKER_ID,
    JUNGLE_BANKER_ID,
    GUNDAI_ID
]);

// opt-out/opt-in tracked by cache keys; opt-out stores the menu choice (may be 0)
function optedOut(player) {
    return !!player.cache && player.cache.bankpin_optout !== undefined;
}

function optedIn(player) {
    return (
        !!player.cache &&
        (player.cache.bankpin_optin !== undefined ||
            player.cache.bank_pin !== undefined)
    );
}

// whether to offer the bank-pin menu option
function bankPinOption(player) {
    return !optedOut(player);
}

// true if no pin set, or already verified this session
async function validateBankPin(player) {
    if (!bankPin.hasBankPin(player) || player._bankPinVerified) {
        player._bankPinVerified = true;
        return true;
    }

    player._bankPinVerified = await bankPin.verifyBankPin(player);
    return player._bankPinVerified;
}

function sirOrMiss(player) {
    return player.isMale() ? 'Sir' : 'Miss';
}

async function openBankFor(player, npc) {
    if (player.isIronMan(IronmanMode.Ultimate)) {
        player.message('As an Ultimate Ironman, you cannot use the bank.');
        return;
    }

    if (!(await validateBankPin(player))) {
        return;
    }

    if (npc) {
        await npc.say(
            (npc.id === GNOME_BANKER_ID ? 'Absolutely ' : 'Certainly ') +
                sirOrMiss(player)
        );
    }

    player.disengage();
    player.bank.open();
}

// the banker's collect-from-auction branch
async function collectAuctionItems(player) {
    if (!(await validateBankPin(player))) {
        return;
    }

    const { market } = player.world;

    if (market) {
        await market.addPlayerCollectItemsTask(player);
    }
}

// opt out of bank pins entirely
async function bankPinOptOut(player, npc) {
    await player.say('Can you please never mention bank pins to me again?');

    if (bankPin.hasBankPin(player)) {
        await npc.say(
            "Err, maybe, but you'll need to remove your existing bank pin first."
        );
        return optedOut(player);
    }

    await npc.say('Err, are you sure?');
    await npc.say(
        "With that inauthentic custom client you're using, they're not " +
            'even that annoying!'
    );
    await player.say("this is just the client I like please don't make fun of me");
    await npc.say(
        "okay, it's just, have you seen the new launcher?",
        'there are so many better options now!',
        'WinRune, RSC+, web client...',
        "If a more authentic experience is what you're going for,",
        'you should really consider using one of those instead.'
    );
    await player.world.sleepTicks(3);
    await player.say('okay maybe. but, the bank pin?');
    await npc.say('Right');
    await npc.say(
        "So you're sure you want me to stop even mentioning that enhanced " +
            'security option?'
    );

    const reallyOptOut = await player.ask(
        [
            "Yes, it's inauthentic.",
            "Yes, I don't think there's really any risk of being hacked.",
            'Yes, I already have a really secure password.',
            "No, actually, I shouldn't disable it..."
        ],
        true
    );

    switch (reallyOptOut) {
        case 0:
        case 1:
        case 2:
            await npc.say('Understandable.');
            player.cache.bankpin_optout = reallyOptOut;

            if (reallyOptOut === 1) {
                await npc.say('but, it could happen you know');
                await npc.say(
                    'Even in a tight-knit small community like this one.',
                    'Regardless,'
                );
            } else if (reallyOptOut === 2) {
                await npc.say(
                    'I mean, maybe you do',
                    'but even with a long password,',
                    'you could still be keylogged or hacked some other way.',
                    'Regardless,'
                );
            }

            await npc.say(
                "I won't even mention that bank pins are a concept I know " +
                    'about then.',
                'If some of your items go missing,',
                'please note that we do not insure your items against loss.',
                'If you change your mind about bank pins in the future, use ' +
                    'a key on me.'
            );
            await player.say('Any key in particular?');
            await npc.say(
                'No, just any key will work.',
                "And I'll set you back up with the latest in inauthentic bank " +
                    'security.'
            );
            return true;
        case 3:
            await npc.say('I knew you had good common sense!');
            await npc.say(
                "We're very glad at the Bank of Runescape to offer this " +
                    'enhanced security feature to you.'
            );
            return optedOut(player);
        default:
            return optedOut(player);
    }
}

async function bankPinMenu(player, npc) {
    const options = ['Set a bank pin', 'Change bank pin', 'Delete bank pin'];

    if (!optedIn(player)) {
        options.push('Can you please never mention bank pins to me again?');
    }

    const choice = await player.ask(options, true);

    if (choice === 0) {
        await bankPin.setBankPin(player);
    } else if (choice === 1) {
        await bankPin.changeBankPin(player);
    } else if (choice === 2) {
        await bankPin.removeBankPin(player);
    } else if (choice === 3 && !optedIn(player)) {
        if (await bankPinOptOut(player, npc)) {
            player.message(
                '@que@You have successfully opted out of even THE MENTION of ' +
                    'a bank pin.'
            );
        }
    }
}

async function whatIsThisPlace(player, npc) {
    if (npc.id === GNOME_BANKER_ID) {
        await npc.say(
            "well it's the tree gnome bank off course",
            'a lot of custom passes through here',
            'so a bank is essential in encouraging visitors'
        );
        return;
    }

    await npc.say(
        'This is a branch of the bank of Runescape',
        'We have branches in many towns'
    );

    const branchMenu = await player.ask(
        ['And what do you do?', "Didn't you used to be called the bank of Varrock"],
        false
    );

    if (branchMenu === 0) {
        await player.say('And what do you do?');
        await npc.say(
            'We will look after your items and money for you',
            'So leave your valuables with us if you want to keep them safe'
        );
    } else if (branchMenu === 1) {
        await player.say("Didn't you used to be called the bank of Varrock?");
        await npc.say(
            'Yes we did, but people kept on coming into our branches outside ' +
                'of varrock',
            'And telling us our signs were wrong',
            "As if we didn't know what town we were in or something!"
        );
    }
}

async function onTalkToNPC(player, npc) {
    if (!BANKER_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    if (npc.id === GNOME_BANKER_ID) {
        await player.say('hello');
        await npc.say('Good day, how may I help you?');
    } else {
        await npc.say(
            'Good day' +
                (npc.id === JUNGLE_BANKER_ID ? ' Bwana' : '') +
                ', how may I help you?'
        );
    }

    const options = [
        "I'd like to access my bank account please",
        'What is this place?'
    ];
    const pins = bankPinOption(player);

    if (pins) {
        options.push("I'd like to inquire about bank pins");
    }

    options.push("I'd like to collect my items from auction");

    const menu = await player.ask(options, true);

    if (menu === 0) {
        await openBankFor(player, npc);
        return true;
    } else if (menu === 1) {
        await whatIsThisPlace(player, npc);
    } else if (menu === 2 && pins) {
        await bankPinMenu(player, npc);
    } else if (menu === 2 || menu === 3) {
        await collectAuctionItems(player);
    }

    player.disengage();

    return true;
}

// right-click "Bank" and "Collect" commands
async function quickFeature(player, npc, auction) {
    if (player.isIronMan(IronmanMode.Ultimate)) {
        player.message('As an Ultimate Ironman, you cannot use the bank.');
        return;
    }

    if (!(await validateBankPin(player))) {
        return;
    }

    if (auction) {
        const { market } = player.world;

        if (market) {
            await market.addPlayerCollectItemsTask(player);
        }
    } else {
        player.bank.open();
    }
}

// handle the "bank" and "collect" npc commands
async function onNPCCommand(player, npc, command) {
    if (!BANKER_IDS.has(npc.id) || (command !== 'bank' && command !== 'collect')) {
        return false;
    }

    // truthy return skips the dispatcher unlock, so unlock here
    npc.unlock();
    player.unlock();
    await quickFeature(player, npc, command === 'collect');

    return true;
}

// a key re-enables bank pins; any other item opens the bank, except crackers
async function onUseWithNPC(player, npc, item) {
    if (!BANKER_IDS.has(npc.id)) {
        return false;
    }

    const name = item.definition.name.toLowerCase();

    if (name.includes('key') && optedOut(player)) {
        player.engage(npc);

        if (npc.id !== GUNDAI_ID) {
            player.message("@que@There is a twinkle in the banker's eye");
            await player.world.sleepTicks(3);
            await npc.say(
                'Ah, you want to re-enable bank pins!',
                'I knew you had good common sense!',
                "We're very glad at the Bank of Runescape to offer this " +
                    'enhanced security feature to you.'
            );
        }

        delete player.cache.bankpin_optout;
        player.message('@que@You can now talk to the banker about bank pins again!');
        player.disengage();
        return true;
    }

    if (name.endsWith('cracker')) {
        return false;
    }

    await quickFeature(player, npc, false);
    return true;
}

module.exports = { onTalkToNPC, onNPCCommand, onUseWithNPC };
