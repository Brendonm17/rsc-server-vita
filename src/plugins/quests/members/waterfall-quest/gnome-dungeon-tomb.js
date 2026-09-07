// waterfall quest - tree gnome village dungeon and glarial's tomb

const {
    GLARIALS_PEBBLE_ID,
    GLARIALS_AMULET_ID,
    GLARIALS_URN_ID,
    LARGE_KEY_ID,
    GOLRIE_ID,
    MES_DELAY
} = require('./index.js');

const { questsEnabled } = require('../../custom-gate.js');

// object ids
const GOLRIE_GATE_ID = 480;
const LARGE_KEY_CRATE_ID = 481;
const GRAVESTONE_ID = 479;
const COFFIN_ID = 467;
const CUPBOARD_OPEN_ID = 507;
const CUPBOARD_CLOSED_ID = 506;

// weapon/armour name fragments that block entry to glarial's tomb
function cantGo(player) {
    for (const item of player.inventory.items) {
        const name = (item.definition && item.definition.name
            ? item.definition.name
            : ''
        ).toLowerCase();

        if (
            name.includes('dagger') ||
            name.includes('scimitar') ||
            name.includes('bow') ||
            name.includes('mail') ||
            name.includes('plated') ||
            name === 'rune skirt' ||
            name.includes('shield') ||
            (name.includes('sword') &&
                name !== 'swordfish' &&
                name !== 'burnt swordfish' &&
                name !== 'raw swordfish') ||
            name.includes('mace') ||
            name.includes('helmet') ||
            name.includes('axe') ||
            name.includes('throwing knife') ||
            name.includes('spear')
        ) {
            return true;
        }
    }

    return false;
}

// open Golrie's gate (mirrors OpenRSC doGate)
async function openGolrieGate(player, gameObject) {
    await player.enterGate(gameObject);
}

// onOpLoc (command one)
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;
    const stage = player.questStages.waterfallQuest || 0;

    // golrie's gate, branches on which side of the gate the player is on
    if (id === GOLRIE_GATE_ID) {
        const golrie = player.world.npcs.getByID(GOLRIE_ID);

        if (stage === 0) {
            if (golrie) {
                player.engage(golrie);
                await golrie.say(
                    'what are you doing down here',
                    'leave before you get yourself into trouble'
                );
                player.disengage();
            }

            return true;
        }

        if (player.y <= 3529) {
            // from outside (south): the gate opens
            await openGolrieGate(player, gameObject);
            return true;
        }

        // inside: gate stays shut once the key's handed over or the quest is done
        if ((player.y >= 3530 && player.cache.golrie_key) || stage === -1) {
            player.message('golrie has locked himself in');
            return true;
        }

        // inside, key not yet handed over: golrie explains he's stuck
        if (player.y >= 3530 && golrie) {
            player.engage(golrie);
            await player.say('are you ok?');
            await golrie.say(
                "it's just those blasted hobgoblins",
                'i locked myself in here for protection',
                "but i've left the key somewhere",
                "and now i'm stuck"
            );

            if (!player.inventory.has(LARGE_KEY_ID)) {
                await player.say("okay, i'll have a look for a key");
            } else {
                await player.say('i found a key');
                await golrie.say("well don't wait all day", 'give it a try');
            }

            player.disengage();
        }

        return true;
    }

    // large key crate
    if (id === LARGE_KEY_CRATE_ID) {
        if (stage === 0) {
            player.message('the crate is empty');
            return true;
        }

        player.message('@que@you search the crate');
        await player.world.sleepTicks(MES_DELAY);

        if (!player.inventory.has(LARGE_KEY_ID)) {
            player.message('@que@and find a large key');
            await player.world.sleepTicks(MES_DELAY);
            player.inventory.add(LARGE_KEY_ID, 1);
        } else {
            player.message('but find nothing');
        }

        return true;
    }

    // Glarial's gravestone (read)
    if (id === GRAVESTONE_ID) {
        player.message('@que@the grave is covered in elven script');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@some of the writing is in common tongue, it reads');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@here lies glarial, wife of baxtorian');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@true friend of nature in life and death');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@may she now rest knowing');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@only visitors with peaceful intent can enter');
        await player.world.sleepTicks(MES_DELAY);
        return true;
    }

    // the coffin holding Glarial's amulet
    if (id === COFFIN_ID) {
        player.message('@que@you search the coffin');
        await player.world.sleepTicks(MES_DELAY);

        if (!player.inventory.has(GLARIALS_AMULET_ID)) {
            player.message('@que@inside you find a small amulet');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@you take the amulet and close the coffin');
            await player.world.sleepTicks(MES_DELAY);
            player.inventory.add(GLARIALS_AMULET_ID, 1);
        } else {
            player.message("it's empty");
            await player.world.sleepTicks(MES_DELAY);
        }

        return true;
    }

    // the cupboard that holds Glarial's urn - Search / open
    if (id === CUPBOARD_OPEN_ID || id === CUPBOARD_CLOSED_ID) {
        // command one: search the open cupboard (507), open the closed one (506)
        if (id === CUPBOARD_CLOSED_ID) {
            player.message('you open the cupboard');
            player.world.replaceEntity('gameObjects', gameObject, CUPBOARD_OPEN_ID);
            return true;
        }

        player.message('@que@you search the cupboard');
        await player.world.sleepTicks(MES_DELAY);

        if (!player.inventory.has(GLARIALS_URN_ID)) {
            player.message('and find a metel urn');
            player.inventory.add(GLARIALS_URN_ID, 1);
        } else {
            player.message("it's empty");
        }

        return true;
    }

    return false;
}

// onOpLoc command two: close the cupboard
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === CUPBOARD_OPEN_ID) {
        player.message('you shut the cupboard');
        player.world.replaceEntity('gameObjects', gameObject, CUPBOARD_CLOSED_ID);
        return true;
    }

    return false;
}

// onUseLoc: large key on gate, pebble on gravestone
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;

    if (id === GOLRIE_GATE_ID && item.id === LARGE_KEY_ID) {
        if (player.inventory.has(LARGE_KEY_ID)) {
            await openGolrieGate(player, gameObject);
        }

        return true;
    }

    if (id === GRAVESTONE_ID && item.id === GLARIALS_PEBBLE_ID) {
        player.message('@que@you place the pebble in the gravestones small indent');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@it fits perfectly');
        await player.world.sleepTicks(MES_DELAY);

        if (cantGo(player)) {
            player.message('@que@but nothing happens');
            await player.world.sleepTicks(MES_DELAY);
            return true;
        }

        player.message('@que@You hear a loud creek');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@the stone slab slides back revealing a ladder down');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@you climb down to an underground passage');
        await player.world.sleepTicks(MES_DELAY);
        player.teleport(631, 3305);

        if (player.questStages.waterfallQuest === 3) {
            player.questStages.waterfallQuest = 4;
        }

        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject
};
