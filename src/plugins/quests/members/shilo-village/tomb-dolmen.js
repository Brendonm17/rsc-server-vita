// Bervirius dolmen (Shilo Village)

const { questsEnabled } = require('../../custom-gate.js');
const {
    TOMB_DOLMEN_BERVIRIUS,
    RASHILIYIA_ID,
    SWORD_POMMEL_ID,
    LOCATING_CRYSTAL_ID,
    BERVIRIUS_TOMB_NOTES_ID,
    PAPYRUS_ID,
    A_LUMP_OF_CHARCOAL_ID,
    BONE_BEADS_ID,
    RASHILIYA_CORPSE_ID
} = require('./ids.js');

const NPC = require('../../../../model/npc');

const CACHE_KEYS = [
    'obtained_shilo_info',
    'coins_shilo_cave',
    'can_chisel_bone',
    'tomb_door_shilo',
    'SV_DIG_LIT',
    'SV_DIG_ROPE',
    'SV_DIG_BUMP',
    'dolmen_zombie',
    'dolmen_skeleton',
    'dolmen_ghost'
];

// OpenRSC handleReward
function handleReward(player) {
    for (const key of CACHE_KEYS) {
        delete player.cache[key];
    }
    player.message('Well Done!');
    player.message('You have completed the Shilo Village Quest.');
    player.message('You gain some experience in crafting.');

    player.questStages.shiloVillage = -1;
    player.addQuestPoints(2);
    // crafting xp: crafting.base * 500 + 500
    player.addExperience('crafting', player.skills.crafting.base * 500 + 500, false);
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id !== TOMB_DOLMEN_BERVIRIUS) {
        return false;
    }
    return handleDolmenOp(player, 'Look');
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id !== TOMB_DOLMEN_BERVIRIUS) {
        return false;
    }
    return handleDolmenOp(player, 'Search');
}

async function handleDolmenOp(player, command) {
    const { world } = player;

    if (player.questStages.shiloVillage === -1) {
        player.message('You find nothing on the Dolmen.');
        return true;
    }

    if (command === 'Look') {
        player.message('The Dolmen is intricately decorated with the family');
        await world.sleepTicks(3);
        player.message('symbol of two crossed palm trees .');
        await world.sleepTicks(3);
        if (player.questStages.shiloVillage === 8) {
            player.message('There is nothing on the Dolmen.');
            return true;
        }
        const hasPommel = player.inventory.has(SWORD_POMMEL_ID);
        const hasCrystal = player.inventory.has(LOCATING_CRYSTAL_ID);
        if (hasPommel && hasCrystal) {
            player.message('There is nothing on the Dolmen.');
        } else if (hasPommel || hasCrystal) {
            player.message('You can see an item on the Dolmen');
        } else {
            player.message('You can see that there are some items on the Dolmen.');
        }
        return true;
    }

    if (command === 'Search') {
        player.message('The Dolmen is intricately decorated with the symbol of');
        await world.sleepTicks(3);
        player.message('two crossed palm trees. It might be the family crest?');
        await world.sleepTicks(3);
        const hasPommel = player.inventory.has(SWORD_POMMEL_ID);
        const hasCrystal = player.inventory.has(LOCATING_CRYSTAL_ID);
        if (hasPommel && hasCrystal) {
            player.message('There is nothing on the Dolmen.');
            await world.sleepTicks(3);
        } else if (hasPommel || hasCrystal) {
            player.message('You can see an item on the Dolmen');
            await world.sleepTicks(3);
        } else {
            player.message('You can see that there are some items on the Dolmen.');
            await world.sleepTicks(3);
        }

        // sword pommel not given if already carried, or if carrying the bone beads
        if (
            !player.inventory.has(SWORD_POMMEL_ID) &&
            !player.inventory.has(BONE_BEADS_ID)
        ) {
            player.message('You find a rusty sword with an ivory pommel.');
            await world.sleepTicks(3);
            player.message(
                'You take the pommel and place it into your inventory.'
            );
            player.inventory.add(SWORD_POMMEL_ID);
            await world.sleepTicks(1);
        }
        if (!player.inventory.has(LOCATING_CRYSTAL_ID)) {
            player.message('You find a Crystal Sphere ');
            await world.sleepTicks(3);
            player.inventory.add(LOCATING_CRYSTAL_ID);
        }
        player.message('You find some writing on the dolmen,');
        await world.sleepTicks(3);
        if (
            !player.inventory.has(BERVIRIUS_TOMB_NOTES_ID) &&
            player.cache.dropped_writing
        ) {
            player.message('You would need some Papyrus and Charcoal');
            await world.sleepTicks(3);
            player.message('to take more notes from this Dolmen!');
        } else if (
            !player.inventory.has(BERVIRIUS_TOMB_NOTES_ID) &&
            !player.cache.dropped_writing
        ) {
            player.message('you grab some nearby scraps of delicate paper together ');
            await world.sleepTicks(3);
            player.message('and copy the text as best you can and collect');
            await world.sleepTicks(3);
            player.message('them together as a scroll');
            player.inventory.add(BERVIRIUS_TOMB_NOTES_ID);
        }
        return true;
    }

    return true;
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (gameObject.id !== TOMB_DOLMEN_BERVIRIUS) {
        return false;
    }

    const { world } = player;

    if (item.id === PAPYRUS_ID) {
        if (player.inventory.has(BERVIRIUS_TOMB_NOTES_ID)) {
            player.message(
                'You already have Bervirius Tomb Notes in your inventory.'
            );
        } else {
            player.message('You try to take some new notes on the delicate papyrus.');
            await world.sleepTicks(3);
            if (!player.inventory.has(A_LUMP_OF_CHARCOAL_ID)) {
                player.message('You need some charcoal to make notes.');
                return true;
            }
            player.message(
                'You use the charcoal and the Papyrus to make some new notes.'
            );
            await world.sleepTicks(3);
            player.message('You collect the notes together as a scroll.');
            player.inventory.remove(PAPYRUS_ID);
            player.inventory.remove(A_LUMP_OF_CHARCOAL_ID);
            player.inventory.add(BERVIRIUS_TOMB_NOTES_ID);
        }
        return true;
    }

    if (item.id === RASHILIYA_CORPSE_ID) {
        if (player.questStages.shiloVillage === 8) {
            player.message(
                "You carefully place Rashiliyia's remains on the Dolmen."
            );
            await world.sleepTicks(2);
            player.message('You feel a strange vibration in the air.');
            const rash = new NPC(world, {
                id: RASHILIYIA_ID,
                x: player.x + 1,
                y: player.y,
                minX: player.x - 1,
                maxX: player.x + 2,
                minY: player.y - 1,
                maxY: player.y + 1
            });
            delete rash.respawn;
            world.addEntity('npcs', rash);
            player.engage(rash);
            await rash.say(
                'You have my gratitude for releasing my spirit.',
                'I have suffered a vengeful and evil existence.',
                'I was tricked by Zamorak. He returned my son to me as an undead Creature.',
                'My hatred and bitterness corrupted me.',
                'I tried too destroy all life...now I am released.',
                'And am grateful to contemplate eternal rest...'
            );
            player.message('Without warning the spirit of Rashiliyia disapears.');
            await world.sleepTicks(3);
            player.disengage();
            world.removeEntity('npcs', rash);
            player.inventory.remove(RASHILIYA_CORPSE_ID);
            handleReward(player);
        }
        return true;
    }

    player.message('Nothing interesting happens');
    return true;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject
};
