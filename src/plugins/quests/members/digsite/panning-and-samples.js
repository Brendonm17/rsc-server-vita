// dig site (members): searchable objects, specimen tray, panning

const { questsEnabled } = require('../../custom-gate.js');
const { doDigsiteItemMessages } = require('./underground.js');
const {
    SACKS_TYPE,
    BUSH_TYPE,
    BURIED_SKELETON_TYPE,
    SIGNPOST_TYPE,
    SPECIMEN_TRAY_TYPE,
    PANNING_POINT_TYPE,
    ROCK_SAMPLE_PURPLE_ID,
    ROCK_SAMPLE_ORANGE_ID,
    SPECIMEN_JAR_ID,
    TROWEL_ID,
    SPADE_ID,
    NOTHING_ID,
    BONES_ID,
    CRACKED_ROCK_SAMPLE_ID,
    IRON_DAGGER_ID,
    BROKEN_ARROW_ID,
    BROKEN_GLASS_ID,
    CERAMIC_REMAINS_ID,
    COINS_ID,
    A_LUMP_OF_CHARCOAL_ID,
    DIGSITE_GUIDE_ID,
    PANNING_TRAY_ID,
    PANNING_TRAY_FULL_ID,
    PANNING_TRAY_GOLD_NUGGET_ID,
    GOLD_NUGGETS_ID,
    UNCUT_OPAL_ID,
    UNCUT_JADE_ID,
    UNCUT_SAPPHIRE_ID,
    CUP_OF_TEA_ID
} = require('./constants.js');

const TRAY_ITEMS = [
    NOTHING_ID,
    BONES_ID,
    CRACKED_ROCK_SAMPLE_ID,
    IRON_DAGGER_ID,
    BROKEN_ARROW_ID,
    BROKEN_GLASS_ID,
    CERAMIC_REMAINS_ID,
    COINS_ID,
    A_LUMP_OF_CHARCOAL_ID
];

function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// ifnearvisnpc(player, id, range) via getNearbyEntitiesByID
function ifNearVisNpc(player, npcId, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', npcId, range);
    return npcs.length ? npcs[0] : null;
}

// mud roll table; roll 100 falls through to plain mud
const PANNING_COIN_AMOUNTS = [1, 2, 5, 10];

function rollPanningFind() {
    const roll = random(0, 100);
    let addItem = -1;
    let addAmount = 1;

    if (roll < 40) {
        addItem = -1; // 40% (plus roll === 100 below, ~41% total)
    } else if (roll < 50) {
        addItem = UNCUT_OPAL_ID; // 10%
    } else if (roll < 60) {
        addItem = UNCUT_JADE_ID; // 10%
    } else if (roll < 70) {
        addItem = COINS_ID; // 10%
        addAmount =
            PANNING_COIN_AMOUNTS[random(0, PANNING_COIN_AMOUNTS.length - 1)];
    } else if (roll < 80) {
        addItem = ROCK_SAMPLE_ORANGE_ID; // 10%
    } else if (roll < 90) {
        addItem = GOLD_NUGGETS_ID; // 10%
    } else if (roll < 100) {
        addItem = UNCUT_SAPPHIRE_ID; // 9% (90-99; roll === 100 is nothing)
    }

    return { addItem, addAmount };
}

async function searchFullPanningTray(player) {
    const { world } = player;

    player.message('You search the contents of the tray...');
    await world.sleepTicks(3);

    const { addItem, addAmount } = rollPanningFind();

    player.inventory.remove(PANNING_TRAY_FULL_ID, 1);
    player.inventory.add(PANNING_TRAY_ID, 1);

    if (addItem === -1) {
        player.message('The tray contains only plain mud');
        return;
    }

    if (addItem === COINS_ID) {
        player.message('You find some coins within the mud');
    } else if (addItem === ROCK_SAMPLE_ORANGE_ID) {
        player.message('You find a rock sample covered in mud');
    } else if (
        addItem === UNCUT_OPAL_ID ||
        addItem === UNCUT_JADE_ID ||
        addItem === UNCUT_SAPPHIRE_ID
    ) {
        player.message('You find a gem within the mud!');
    }
    // sic: gold nugget bucket prints no message

    player.inventory.add(addItem, addAmount);
}

// handlePanning: fill an empty tray at a panning point
async function handlePanning(player) {
    const { world } = player;

    player.sendBubble(PANNING_TRAY_ID);
    player.sendSound('mix');
    player.message('You scrape the tray along the bottom');
    player.message('You swirl away the excess water');
    await world.sleepTicks(3);
    player.sendBubble(PANNING_TRAY_FULL_ID);
    player.message('You lift the full tray from the water');
    player.inventory.remove(PANNING_TRAY_ID, 1);
    player.inventory.add(PANNING_TRAY_FULL_ID, 1);
    player.addExperience('mining', 20, true);
}

// Panning.onUseLoc (use item on the panning point).
async function useItemOnPanningPoint(player, item) {
    if (item.id === PANNING_TRAY_FULL_ID) {
        player.message('This panning tray already contains something');
        return true;
    }

    if (item.id === PANNING_TRAY_GOLD_NUGGET_ID) {
        player.message('This panning tray already contains gold');
        return true;
    }

    if (item.id !== PANNING_TRAY_ID) {
        return false;
    }

    const guide = ifNearVisNpc(player, DIGSITE_GUIDE_ID, 15);

    if (!guide) {
        // no guide nearby: tray does nothing
        return true;
    }

    if (player.cache.unlocked_panning !== true) {
        await guide.say("Hey! you can't pan yet!");
        await player.say('Why not ?');
        await guide.say('We do not allow the uninvited to pan here');

        const menu = await player.ask([
            'Okay, forget it',
            'So how do I become invited then ?'
        ]);

        if (menu === 0) {
            await guide.say(
                'You can of course use this place when you know what you are doing'
            );
        } else if (menu === 1) {
            await guide.say(
                "I'm not supposed to let people pan here",
                'Unless they have permission from the authorities first',
                'Mind you I could let you have a go...',
                "If you're willing to do me a favour"
            );
            await player.say("What's that ?");
            await guide.say(
                'Well...to be honest...',
                'What I would really like...',
                'Is a nice cup of tea !'
            );
            await player.say('Tea !?');
            await guide.say(
                "Absolutely, I'm parched !",
                'If you could bring me one of those...',
                'I would be more than willing to let you pan here'
            );
        }

        return true;
    }

    await handlePanning(player);
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === BUSH_TYPE) {
        player.message('You search the bush');
        // only BUSH[1] holds the purple sample
        await player.say('Hey, something has been dropped here...');
        player.message('You find a rock sample!');
        player.inventory.add(ROCK_SAMPLE_PURPLE_ID, 1);
        return true;
    }

    if (gameObject.id === SACKS_TYPE) {
        player.message('You search the sacks');
        if (!player.inventory.has(SPECIMEN_JAR_ID)) {
            await player.say('Hey there\'s something under here');
            player.message('You find a specimen jar!');
            player.inventory.add(SPECIMEN_JAR_ID, 1);
        } else {
            player.message('You find nothing of interest');
        }
        return true;
    }

    if (gameObject.id === BURIED_SKELETON_TYPE) {
        player.message('You search the skeleton');
        player.message('You find nothing of interest');
        return true;
    }

    if (gameObject.id === SIGNPOST_TYPE) {
        // SIGNPOST {1060=training, 1061-63=lvl1-3} collapse to one type
        player.message('This site is for training purposes only');
        return true;
    }

    if (gameObject.id === PANNING_POINT_TYPE) {
        // Panning.onOpLoc: unconditional flavour message, no gating.
        player.message('If I had a panning tray I could pan here');
        return true;
    }

    if (gameObject.id === SPECIMEN_TRAY_TYPE) {
        if (!player.inventory.has(SPECIMEN_JAR_ID)) {
            player.message('Oi! what are you doing ?');
            const option = await player.ask(
                ['I am on an errand', 'I am searching this tray'],
                false
            );
            if (option === 0) {
                player.message(
                    'Oh yeah? and whose errand is that then...',
                    'Where is your specimen jar then?'
                );
                await player.say('Oh I dont have one');
                player.message(
                    'And you reckon you have been sent on an errand...',
                    "Without a specimen jar - no sorry I can't let you do that!"
                );
            } else if (option === 1) {
                player.message(
                    'Oh you are, are you ?',
                    "Well, where's your specimen jar?"
                );
                await player.say("Ah, I don't have one...");
                player.message(
                    'In that case how can you handle the specimens without it?',
                    'As you should know, specimens are to be kept in sealed specimen jars',
                    'To keep them safe and preserved...',
                    'Next time bring it along!'
                );
            }
            return true;
        }

        player.addExperience('mining', 4, true);
        player.message('You sift through the earth in the tray');
        await player.world.sleepTicks(3);
        const chosen = TRAY_ITEMS[random(0, TRAY_ITEMS.length - 1)];
        doDigsiteItemMessages(player, chosen);
        if (chosen !== NOTHING_ID) {
            player.inventory.add(chosen, 1);
        }
        return true;
    }

    return false;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === PANNING_POINT_TYPE) {
        return useItemOnPanningPoint(player, item);
    }

    if (gameObject.id === SPECIMEN_TRAY_TYPE) {
        if (item.id === TROWEL_ID) {
            player.message(
                'Excuse me...',
                'No digging in the specimen trays please'
            );
            return true;
        }
        if (item.id === SPADE_ID) {
            player.message(
                'Oi! what do you think you are doing ?',
                "Don't you realize there are fragile specimens around here ?"
            );
            return true;
        }
        if (item.id === SPECIMEN_JAR_ID) {
            await player.say('I\'m not sure if this will be useful or not');
            player.message('You scoop some earth with the jar');
            await player.world.sleepTicks(3);
            return true;
        }
        player.message('Nothing interesting happens');
        return true;
    }

    // Poking the buried skeleton with a trowel.
    if (gameObject.id === BURIED_SKELETON_TYPE && item.id === TROWEL_ID) {
        player.message(
            'Hey! that\'s fragile!',
            'Stop poking it around with that trowel!'
        );
        await player.say('Oh okay, sorry');
        return true;
    }

    return false;
}

// onUseNpc: give an item to the digsite guide
async function onUseWithNPC(player, npc, item) {
    if (npc.id !== DIGSITE_GUIDE_ID) {
        return false;
    }

    if (item.id === PANNING_TRAY_ID) {
        player.message('You give the panning tray to the guide');
        await npc.say('Yes, this is a panning tray...');
    } else if (item.id === PANNING_TRAY_FULL_ID) {
        player.message('You give the full panning tray to the guide');
        await npc.say('This is no good to me', "I don't deal with finds");
    } else if (item.id === PANNING_TRAY_GOLD_NUGGET_ID) {
        player.message('You give the full panning tray to the guide');
        await npc.say(
            "I am afraid I don't deal with finds",
            "That's not my job"
        );
    } else if (item.id === CUP_OF_TEA_ID) {
        if (player.cache.unlocked_panning === true) {
            await npc.say("No thanks, I've had enough!");
        } else {
            await npc.say(
                'Ah! Lovely!',
                "You can't beat a good cuppa...",
                "You're free to pan all you want"
            );
            await player.say('Thanks');
            player.inventory.remove(CUP_OF_TEA_ID, 1);
            player.cache.unlocked_panning = true;
        }
    }

    // always intercepts, silent if unhandled
    return true;
}

// Panning.onOpInv (search/empty a panning tray from the inventory).
async function onInventoryCommand(player, item) {
    if (item.id === PANNING_TRAY_ID) {
        player.message('You search the contents of the tray');
        await player.say('Err, why am I searching an empty tray ?');
        return true;
    }

    if (item.id === PANNING_TRAY_FULL_ID) {
        await searchFullPanningTray(player);
        return true;
    }

    if (item.id === PANNING_TRAY_GOLD_NUGGET_ID) {
        player.inventory.remove(PANNING_TRAY_GOLD_NUGGET_ID, 1);
        player.inventory.add(PANNING_TRAY_ID, 1);
        player.inventory.add(GOLD_NUGGETS_ID, 1);
        // sic: OpenRSC message says form instead of from
        player.message('You take the gold form the panning tray');
        player.message('You have a handful of gold nuggets');
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onUseWithGameObject,
    onUseWithNPC,
    onInventoryCommand
};
