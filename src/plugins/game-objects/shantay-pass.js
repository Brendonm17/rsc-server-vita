// stone gate (916) and bank chest (942) at shantay's pass, the object-command
// half. the npc-conversation half is in npcs/al-kharid/shantay-pass.js.
//   stone gate (916) ["Go through", "Look"], at (62, 733)
//   bank chest (942) ["Open", "Examine"], at (58, 731)
// only "go through" is gated south of the gate (y < 735); only "open" is
// wired on the chest.

const { IronmanMode } = require('../../model/game-modes');

const STONE_GATE_ID = 916;
const BANK_CHEST_ID = 942;
const SHANTAY_PASS_GUARD_STANDING_ID = 717;

const SHANTAY_DESERT_PASS_ID = 1030;
const A_FREE_SHANTAY_DISCLAIMER_ID = 1099;

const DESERT_ARRIVE = { x: 62, y: 735 };
const CHEST_LOCATION = { x: 58, y: 731 };

// gate only works south of it (y < 735), out of the desert
function southOfGate(player) {
    return player.y < 735;
}

// find the nearby standing shantay pass guard
function findNearbyGuard(player) {
    const { world } = player;

    return Array.from(
        world.npcs.getAllByID(SHANTAY_PASS_GUARD_STANDING_ID)
    ).find(
        (npc) =>
            !npc.interlocutor &&
            player.localEntities.known.npcs.has(npc) &&
            player.getDistance(npc) <= 5
    );
}

async function openBankChest(player, gameObject) {
    // Java: player.isIronMan(2) (IronmanMode.Ultimate).
    if (player.isIronMan(IronmanMode.Ultimate)) {
        player.message('As an Ultimate Ironman, you cannot use the bank.');
        return;
    }

    if (
        gameObject.x === CHEST_LOCATION.x &&
        gameObject.y === CHEST_LOCATION.y
    ) {
        player.message('@que@This chest is used by Shantay and his men.');
        player.message(
            '@que@They can put things in and out of storage for you.'
        );
        player.message('@que@You open the bank.');
    }

    // always true, this build has no bank-pin feature
    player.bank.open();
}

// Java onOpLoc's STONE_GATE / "go through" branch.
async function goThroughGate(player) {
    let menu;

    if (!player.inventory.has(A_FREE_SHANTAY_DISCLAIMER_ID)) {
        player.message(
            '@que@There is a large poster on the wall near the gateway. It reads..'
        );
        player.message(
            'The Desert is a VERY Dangerous place...do not enter if you ' +
                'are scared of dying.'
        );
        player.message(
            'Beware of high temperatures, sand storms, robbers, and ' +
                'slavers...'
        );
        player.message('No responsibility is taken by Shantay ');
        player.message(
            'If anything bad should happen to you in any circumstances ' +
                'whatsoever.'
        );
        player.message(
            '@que@That seems pretty scary! Are you sure you want to go through?'
        );

        menu = await player.ask(
            [
                "Yeah, that poster doesn't scare me!",
                "No, I'm having serious second thoughts now."
            ],
            false
        );
    } else {
        player.message(
            '@que@A poster on the wall says exactly the same as the disclaimer.'
        );
        player.message('@que@Are you sure you want to go through?');

        menu = await player.ask(
            [
                "Yeah, I'm not scared!",
                "No, I'm having serious second thoughts now."
            ],
            false
        );
    }

    // guard is looked up even on the unused postpone path
    const shantayGuard = findNearbyGuard(player);

    if (menu === 0) {
        if (!player.inventory.has(SHANTAY_DESERT_PASS_ID)) {
            player.message('@que@A guard stops you on your way out of the gate...');

            if (shantayGuard) {
                await shantayGuard.say(
                    'You need a Shantay pass to get through this gate.',
                    'See Shantay, he will sell you one for a very ' +
                        'reasonable price.'
                );
            } else {
                player.message('Shantay guard seem to be busy at the moment.');
            }

            return;
        }

        if (!shantayGuard) {
            player.message('Shantay guard seem to be busy at the moment.');
            return;
        }

        await shantayGuard.say('Can I see your Shantay Desert Pass please.');
        player.message('You hand over a Shantay Pass.');
        player.inventory.remove(SHANTAY_DESERT_PASS_ID);
        await player.say('Sure, here you go!');

        if (!player.inventory.has(A_FREE_SHANTAY_DISCLAIMER_ID)) {
            await shantayGuard.say(
                'Here, have a disclaimer...',
                "It means that Shantay isn't responsible if you die in the " +
                    'desert.'
            );
            player.message('The guard gives you a disclaimer.');
            player.inventory.add(A_FREE_SHANTAY_DISCLAIMER_ID);
        }

        player.message('you go through the gate');
        player.teleport(DESERT_ARRIVE.x, DESERT_ARRIVE.y);
    } else if (menu === 1) {
        player.message(
            '@que@You decide that your visit to the desert can be postponed..'
        );
        player.message('Perhaps indefinitely!');
    }
}

// Java onOpLoc's STONE_GATE / "look" branch.
function lookAtGate(player) {
    player.message('@que@You look at the huge Stone Gate.');
    player.message('@que@On the gate is a large poster, it reads.');
    player.message(
        'The Desert is a VERY Dangerous place...do not enter if you are ' +
            'scared of dying.'
    );
    player.message(
        'Beware of high temperatures, sand storms, robbers, and slavers...'
    );
    player.message('No responsibility is taken by Shantay ');
    player.message(
        'If anything bad should happen to you in any circumstances ' +
            'whatsoever.'
    );
    player.message(
        '@que@Despite this warning lots of people seem to pass through the gate.'
    );
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== STONE_GATE_ID && gameObject.id !== BANK_CHEST_ID) {
        return false;
    }

    // f2p check kept for parity though this world is always members
    if (!player.world.members) {
        player.message("you must be on a members' world to do that");
        return true;
    }

    if (gameObject.id === BANK_CHEST_ID) {
        await openBankChest(player, gameObject);
        return true;
    }

    // "go through" only wired south of the gate
    if (!southOfGate(player)) {
        return false;
    }

    await goThroughGate(player);
    return true;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== STONE_GATE_ID) {
        return false;
    }

    if (!player.world.members) {
        player.message("you must be on a members' world to do that");
        return true;
    }

    if (!southOfGate(player)) {
        return false;
    }

    lookAtGate(player);
    return true;
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
