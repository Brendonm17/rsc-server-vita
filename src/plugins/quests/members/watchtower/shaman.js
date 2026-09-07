// watchtower (members): talking to a shaman blasts you, the enchanted ogre potion
// dissolves one, and searching the shaman robe (stage 8/9) can yield crystal 3

const { questsEnabled } = require('../../custom-gate.js');

const {
    QUEST_KEY,
    OGRE_SHAMAN_ID,
    MAGIC_OGRE_POTION_ID,
    OGRE_POTION_ID,
    EMPTY_VIAL_ID,
    POWERING_CRYSTAL3_ID,
    SHAMAN_ROBE_ID
} = require('./ids.js');

function stage(player) {
    return player.questStages[QUEST_KEY] || 0;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== OGRE_SHAMAN_ID) {
        return false;
    }

    player.engage(npc);
    await npc.say('Grr! how dare you talk to us', 'We will destroy you!');
    player.message('A magic blast comes from the shaman');
    player.sendTeleportBubble(npc.x, npc.y);
    // damage = currentHits * 0.2 + 10
    const hits = player.skills.hits.current;
    player.damage(Math.trunc(hits * 0.2 + 10));
    player.message('You are badly injured by the blast');
    player.disengage();
    return true;
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== OGRE_SHAMAN_ID) {
        return false;
    }

    if (item.id !== MAGIC_OGRE_POTION_ID && item.id !== OGRE_POTION_ID) {
        return false;
    }

    player.engage(npc);

    if (item.id === MAGIC_OGRE_POTION_ID) {
        if (player.skills.magic.current < 14) {
            player.message('You need a level of 14 magic first');
            player.disengage();
            return true;
        }
        player.message('There is a bright flash');
        player.message('The ogre dissolves into spirit form');
        player.sendTeleportBubble(npc.x, npc.y);
        player.world.removeEntity('npcs', npc);

        if (typeof player.cache.shaman_count !== 'undefined') {
            const shamanDone = player.cache.shaman_count;
            if (player.cache.shaman_count < 6) {
                player.cache.shaman_count = shamanDone + 1;
            }
            if (shamanDone === 1) {
                await player.say('Thats the second one gone...');
            } else if (shamanDone === 2) {
                await player.say('Thats the next one dealt with...');
            } else if (shamanDone === 3) {
                await player.say('There goes another one...');
            } else if (shamanDone === 4) {
                await player.say('Thats five, only one more left now...');
            } else if (shamanDone === 5 || player.cache.shaman_count === 6) {
                player.message('You hear a scream...');
                player.message('The shaman dissolves before your eyes!');
                player.message(
                    'A crystal drops from the hand of the dissappearing ogre!'
                );
                player.message('You snatch it up quickly');
                player.inventory.remove(MAGIC_OGRE_POTION_ID);
                player.inventory.add(EMPTY_VIAL_ID, 1);
                player.inventory.add(POWERING_CRYSTAL3_ID, 1);
                if (stage(player) === 8) {
                    player.questStages[QUEST_KEY] = 9;
                }
            }
        } else {
            player.cache.shaman_count = 1;
            await player.say('Thats one destroyed...');
        }
    } else if (item.id === OGRE_POTION_ID) {
        player.message('There is a small flash');
        player.message('But the potion was ineffective');
        await player.say('Oh no! I better go back to the wizards about this');
    }

    player.disengage();
    return true;
}

// search the shaman robe
async function handleShamanRobeSearch(player) {
    const { world } = player;

    if (stage(player) === 8 || stage(player) === 9) {
        player.message('You search the robe');

        if (player.inventory.has(POWERING_CRYSTAL3_ID)) {
            player.message('@que@You find nothing');
            await world.sleepTicks(3);
        } else if (player.bank.has(POWERING_CRYSTAL3_ID)) {
            await player.say('I already have this in my bank');
        } else {
            player.message(
                '@que@You find a crystal wrapped in the folds of the material'
            );
            await world.sleepTicks(3);
            player.inventory.add(POWERING_CRYSTAL3_ID, 1);
        }
    } else {
        player.message('@que@You search the robe');
        await world.sleepTicks(3);
        player.message('@que@You find nothing');
        await world.sleepTicks(3);
    }

    return true;
}

async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id !== SHAMAN_ROBE_ID) {
        return false;
    }

    return handleShamanRobeSearch(player);
}

module.exports = { onTalkToNPC, onUseWithNPC, onInventoryCommand };
