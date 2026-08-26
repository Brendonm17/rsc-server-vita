// cell gates disambiguated by which npc stands behind them

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    GUARDS_CUPBOARD_CLOSED,
    GUARDS_CUPBOARD_OPEN,
    CELL_GATE_CLOSED,
    CELL_GATE_OPEN,
    KHAZARD_HELMET_ID,
    KHAZARD_CHAINMAIL_ID,
    KHAZARD_CELL_KEYS_ID,
    FIGHTSLAVE_JOE_ID,
    FIGHTSLAVE_KELVIN_ID,
    JEREMY_SERVIL_ID,
    GUARD_KHAZARD_BYPRISONER_ID,
    hasWorn,
    ifNearVisNpc
} = require('./ids.js');

// OpenRSC onOpLoc: search the guards' cupboard
function searchCupboard(player) {
    const stage = player.questStages[QUEST_KEY];

    if (
        !player.inventory.has(KHAZARD_CHAINMAIL_ID) &&
        !player.inventory.has(KHAZARD_HELMET_ID) &&
        stage >= 1
    ) {
        player.message('You search the cupboard...');
        player.message('You find a khazard helmet');
        player.message('You find a khazard chainmail');
        player.inventory.add(KHAZARD_CHAINMAIL_ID, 1);
        player.inventory.add(KHAZARD_HELMET_ID, 1);
    } else {
        player.message('You search the cupboard, but find nothing');
    }
}

// OpenRSC onOpLoc: gate by fight slaves joe / kelvin (Y 700 / 707)
async function fightSlaveCell(player) {
    const joe = ifNearVisNpc(player, FIGHTSLAVE_JOE_ID, 5);
    if (joe) {
        player.engage(joe);
        await player.say('are you ok?');
        if (hasWorn(player, KHAZARD_HELMET_ID) && hasWorn(player, KHAZARD_CHAINMAIL_ID)) {
            await joe.say(
                'spare me your fake pity',
                "I spit on Khazard's grave and all who do his bidding"
            );
        } else {
            await joe.say(
                "you're not safe here traveller",
                'leave while you still can'
            );
        }
        player.disengage();
    }

    const kelvin = ifNearVisNpc(player, FIGHTSLAVE_KELVIN_ID, 5);
    if (kelvin) {
        player.engage(kelvin);
        await player.say('hello there');
        if (hasWorn(player, KHAZARD_HELMET_ID) && hasWorn(player, KHAZARD_CHAINMAIL_ID)) {
            await kelvin.say(
                'get away, get away',
                "one day i'll have my revenge",
                "and i'll have all your heads!"
            );
        } else {
            await kelvin.say(
                "you're a brave man",
                'if the guards get you',
                "you'll be in here next"
            );
        }
        player.disengage();
    }
}

// OpenRSC onOpLoc: Jeremy Servil's cell gate (Y 716)
async function jeremyCell(player, gameObject) {
    const { world } = player;
    const stage = player.questStages[QUEST_KEY];

    if (player.cache.freed_servil || stage === 3 || stage === -1) {
        player.message('You have already freed jeremy');
        return;
    }

    const servil = ifNearVisNpc(player, JEREMY_SERVIL_ID, 5);
    if (!servil) {
        return;
    }

    if (
        player.cache.guard_sleeping &&
        player.inventory.has(KHAZARD_CELL_KEYS_ID)
    ) {
        player.engage(servil);
        await player.say('Jeremy, look, I have the cell keys');
        await servil.say('Wow! Please help me');
        await player.say('ok, keep quiet');
        await servil.say('Set me free then we can find dad');
        player.message('You use your key to open the cell door');
        await world.sleepTicks(3);
        player.message('The gate swings open');
        await world.sleepTicks(3);

        // open the gate briefly, then let it swing shut (delayedSpawnObject)
        const openGate = world.replaceEntity(
            'gameObjects',
            gameObject,
            CELL_GATE_OPEN
        );
        world.setTickTimeout(() => {
            world.replaceEntity('gameObjects', openGate, CELL_GATE_CLOSED);
        }, 5);

        await player.say(
            'There you go, now we need to find your father'
        );
        await servil.say(
            'I overheard a guard talking',
            "I think they've taken him to the arena"
        );
        await player.say("OK we'd better hurry");
        await servil.say(" I'll run ahead");

        player.disengage();

        // servil.remove() - Jeremy runs off to the arena
        world.removeEntity('npcs', servil);

        player.cache.freed_servil = true;
        delete player.cache.guard_sleeping;

        const guard = ifNearVisNpc(player, GUARD_KHAZARD_BYPRISONER_ID, 5);
        if (guard) {
            player.engage(guard);
            await guard.say('What are you doing?', "It's an imposter!");
            await world.sleepTicks(2);
            player.disengage();
            await guard.attack(player);
        }
        return;
    }

    player.engage(servil);
    await servil.say("I'm Jeremy Servil", "Please sir, don't hurt me");
    await player.say(
        "I'm here to help",
        'Where do they keep the keys?'
    );
    await servil.say('The guard keeps them.. always');
    player.disengage();
    player.questStages[QUEST_KEY] = 2;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    // open the closed guards' cupboard
    if (gameObject.id === GUARDS_CUPBOARD_CLOSED) {
        const { world } = player;
        world.replaceEntity('gameObjects', gameObject, GUARDS_CUPBOARD_OPEN);
        player.message('You open the cupboard');
        return true;
    }

    // search the open guards' cupboard
    if (gameObject.id === GUARDS_CUPBOARD_OPEN) {
        searchCupboard(player);
        return true;
    }

    // cell gate - disambiguate by the prisoner behind it
    if (gameObject.id === CELL_GATE_CLOSED) {
        if (
            ifNearVisNpc(player, FIGHTSLAVE_JOE_ID, 5) ||
            ifNearVisNpc(player, FIGHTSLAVE_KELVIN_ID, 5)
        ) {
            await fightSlaveCell(player);
            return true;
        }

        if (ifNearVisNpc(player, JEREMY_SERVIL_ID, 5)) {
            await jeremyCell(player, gameObject);
            return true;
        }

        return false;
    }

    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    // close the open guards' cupboard
    if (gameObject.id === GUARDS_CUPBOARD_OPEN) {
        const { world } = player;
        world.replaceEntity('gameObjects', gameObject, GUARDS_CUPBOARD_CLOSED);
        player.message('You close the cupboard');
        return true;
    }

    return false;
}

// OpenRSC onUseLoc: using the cell keys on Jeremy's gate
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        gameObject.id === CELL_GATE_CLOSED &&
        item.id === KHAZARD_CELL_KEYS_ID &&
        ifNearVisNpc(player, JEREMY_SERVIL_ID, 5)
    ) {
        player.message('To unlock the gate, left click on it');
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject
};
