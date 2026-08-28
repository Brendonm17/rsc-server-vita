// Woodcutting Guild (McGrubor's Wood): the Forester toll-gate + McGrubor's paid
// bank chest, together with the McGrubor's Wood gate branch of the door handler.
//
// Ids resolved against this build's merged tables (base npcs 0..793 +
// custom-npcs.json appended from 794): Forester = 835, McGrubor = 836. The raw
// spawn ids 833/834 collide with unrelated custom-quest NPCs here (833 =
// Praesens, 834 = Futurum), so the spawns at (559,473)/(557,455) are remapped to
// 835/836 in sp/entry.js. Gate = scenery 356 at (560, 472) (direction 2).
// Coins = 10.
//
// The guild is gated on a wantWoodcuttingGuild config toggle that defaults on; a
// world may disable it via config.json.

const FORESTER_ID = 835;
const MCGRUBOR_ID = 836;
const GATE_ID = 356;
const GATE_X = 560;
const GATE_Y = 472;
const OPEN_GATE_ID = 181;
const COINS_ID = 10;
const TOLL = 1000;
const WOODCUTTING_REQ = 55;

// Radius for finding the nearby forester.
const FORESTER_RADIUS = 8;

function wantWoodcuttingGuild(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantWoodcuttingGuild !== false;
}

// foresterDialogue - the 1000-gold toll + level-55 gate. `npc` is the Forester
// (engaged by the caller).
async function foresterDialogue(player, npc) {
    const { world } = player;

    await npc.say(
        'You need to pay a toll of 1000 gold before you can go in there'
    );

    const option = await player.ask(
        ['Who does the money go to?', 'Alright here you go', 'No way'],
        true
    );

    if (option === 0) {
        await npc.say(
            'This land is owned by Mr. McGrubor',
            'The money goes to him for its upkeep'
        );
    } else if (option === 1) {
        if (player.inventory.has(COINS_ID, TOLL)) {
            player.message('@que@You hand the gold to the forester');
            player.inventory.remove(COINS_ID, TOLL);
            await world.sleepTicks(3);

            if (player.skills.woodcutting.current >= WOODCUTTING_REQ) {
                player.message('@que@The gate swings open and you walk through');
                player.teleport(GATE_X, GATE_Y);
            } else {
                player.message('@que@The forester puts out his hand to stop you');
                await world.sleepTicks(3);
                await npc.say(
                    'Hold on a minute',
                    "You aren't skilled enough to go in there"
                );
                await player.say('Well what about my gold?');
                await npc.say('Consider it a donation');
                player.message(
                    '@que@You need to have a woodcutting level of 55 to enter'
                );
            }
        } else {
            await player.say("Oh dear I don't seem to have enough money");
            await npc.say("Well then you aren't going in");
        }
    }
}

// takeFromBank - McGrubor's auto-fee helper: pull 1000 coins from the bank.
function takeFromBank(player) {
    if (player.bank.countId(COINS_ID) >= TOLL) {
        player.bank.remove(COINS_ID, TOLL);
        return true;
    }

    return false;
}

// openBank - disengage (so the interface can open) then show the bank.
// Single-player has no bank PIN, so this is a plain open (matching every other
// bank access in this build).
function openBank(player) {
    player.disengage();
    player.bank.open();
}

// mcGruborDialogue - the paid bank chest. The "take fee until logout" flag is a
// per-session attribute, so it lives on a transient player field here
// (player._mcgruborBank), not the persistent cache.
async function mcGruborDialogue(player, npc) {
    const { world } = player;

    if (player._mcgruborBank) {
        if (takeFromBank(player)) {
            player.message(
                '@que@You open the bank chest and Mr. McGrubor takes his fee'
            );
            await world.sleepTicks(3);
            openBank(player);
        } else {
            player.message("@que@You don't have enough coins in your bank!");
            player._mcgruborBank = false;
        }

        return;
    }

    await npc.say(
        "If you want to use my chest it'll cost you",
        "I've gotta pay my workers to take the stuff over to the bank",
        'Plus a small convenience fee on top of course'
    );

    const option = await player.ask(
        [
            'Use bank chest - 1000 gold',
            'No thanks!',
            'Take fee from bank until logout'
        ],
        false
    );

    if (option === 0) {
        await player.say('Alright');

        if (player.inventory.has(COINS_ID, TOLL)) {
            player.message('@que@You hand McGrubor the coins');
            player.inventory.remove(COINS_ID, TOLL);
            await world.sleepTicks(3);
            player.message('@que@You open the bank chest');
            await world.sleepTicks(3);
            openBank(player);
        } else {
            await npc.say(
                "Looks like you don't have enough coins with you",
                'Best start walking to the bank then'
            );
        }
    } else if (option === 1) {
        await player.say('No thanks!');
    } else if (option === 2) {
        await player.say(
            "I'm going to be here for a while",
            'You can just take the fee from my bank'
        );

        if (takeFromBank(player)) {
            player._mcgruborBank = true;
            player.message(
                '@que@You open the bank chest and Mr. McGrubor takes his fee'
            );
            await world.sleepTicks(3);
            openBank(player);
        } else {
            await npc.say(
                'What are you talking about?',
                "You don't have enough gold in your bank"
            );
        }
    }
}

// frontGate - the outside-in path: if the forester is near, run his toll
// dialogue; otherwise the gate is just locked.
async function frontGate(player) {
    const { world } = player;

    const forester = player.getNearestEntityByID(
        'npcs',
        FORESTER_ID,
        FORESTER_RADIUS
    );

    if (forester && !forester.interlocutor) {
        player.engage(forester);
        await foresterDialogue(player, forester);
        player.disengage();
    } else {
        player.message('@que@The gate is locked');
        await world.sleepTicks(3);
        player.message('@que@The forester should be able to help you get in');
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id === FORESTER_ID) {
        player.engage(npc);

        const option = await player.ask(
            ['Can I go in?', 'What is this place?'],
            true
        );

        if (option === 0) {
            await foresterDialogue(player, npc);
        } else if (option === 1) {
            await npc.say(
                "This is McGrubor's wood",
                'For a small fee you can go in and cut the trees'
            );
        }

        player.disengage();
        return true;
    }

    if (npc.id === MCGRUBOR_ID) {
        player.engage(npc);

        const option = await player.ask(
            ['Can I use your bank chest?', 'Your guard dogs keep attacking me'],
            true
        );

        if (option === 0) {
            await mcGruborDialogue(player, npc);
        } else if (option === 1) {
            await npc.say(
                "They're just doing what I trained them to do",
                "A dog isn't gonna know if you paid to be in here or not",
                "If you don't like it you can leave"
            );
        }

        // openBank() already disengaged on the bank paths; disengage() is safe to
        // call again (it no-ops without an interlocutor).
        player.disengage();
        return true;
    }

    return false;
}

// Gate scenery 356 at 560,472. From the south (outside, y > 472) the forester
// takes the toll; from the north (inside, y <= 472) the gate simply opens and
// you walk out (direction 2 -> step to y + 1 and restore the gate).
async function onGameObjectCommandOne(player, gameObject) {
    if (
        gameObject.id !== GATE_ID ||
        gameObject.x !== GATE_X ||
        gameObject.y !== GATE_Y
    ) {
        return false;
    }

    if (!wantWoodcuttingGuild(player)) {
        return false;
    }

    const { world } = player;

    if (player.y <= GATE_Y) {
        player.sendSound('opendoor');

        const openGate = world.replaceEntity(
            'gameObjects',
            gameObject,
            OPEN_GATE_ID
        );

        player.teleport(GATE_X, GATE_Y + 1);
        await world.sleepTicks(2);

        world.replaceEntity('gameObjects', openGate, GATE_ID);
    } else {
        await frontGate(player);
    }

    return true;
}

module.exports = { onTalkToNPC, onGameObjectCommandOne };
