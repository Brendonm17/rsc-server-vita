// shared helpers: succeed / bumpy dirt holder

const { BEADS_OF_THE_DEAD_ID } = require('./ids.js');

function hasBeadsEquipped(player) {
    return player.inventory.isEquipped(BEADS_OF_THE_DEAD_ID);
}

// OpenRSC ShiloVillageUtils.succeed(player, req): agility check.
function succeed(player, req) {
    let levelDifference = player.skills.agility.current - req;
    const percent = Math.floor(Math.random() * 100) + 1; // random(1, 100)

    if (levelDifference < 0) {
        return true;
    }
    if (levelDifference >= 15) {
        levelDifference = 80;
    }
    if (levelDifference >= 20) {
        levelDifference = 90;
    } else {
        levelDifference = 30 + levelDifference;
    }

    return percent <= levelDifference;
}

// crawl through the fissure at the bumpy dirt, advancing stage 2 -> 3
async function bumpyDirtHolder(player) {
    const { world } = player;

    player.message('Do you want to try to crawl through the fissure?');
    if (player.cache.SV_DIG_ROPE) {
        player.message('You see that a rope is attached nearby');
    }
    const menu = await player.ask(
        ["Yes, I'll give it a go!", 'No thanks, it looks a bit dark!'],
        true
    );
    if (menu === 0) {
        player.message('You start to contort your body...');
        player.message('With some dificulty you manage to push your body');
        await world.sleepTicks(3);
        player.message('through the small crack in the rock.');
        await world.sleepTicks(3);
        if (!player.cache.SV_DIG_ROPE) {
            player.message('As you squeeze out of the hole...');
            await world.sleepTicks(3);
            player.message('you realise that there is a huge drop underneath you');
            player.message('You begin falling....');
            player.teleport(380, 3692);
            await world.sleepTicks(1);
            await player.say('Ahhhhh!');
            player.damage(1);
            player.message('Your body is battered as you hit the cavern walls.');
            await player.say('Ooooff!');
            player.damage(1);
            await world.sleepTicks(1);
            player.teleport(352, 3650);
            player.damage(Math.floor(player.skills.hits.current * 0.2 + 10));
            player.message('You hit the floor and it knocks the wind out of you!');
            await world.sleepTicks(3);
            await player.say('Ugghhhh!!');
        } else {
            player.message('You squeeze through the fissure in the granite');
            await world.sleepTicks(3);
            player.message('And once through, you cleverly use the rope to slowly lower');
            await world.sleepTicks(3);
            player.message('yourself to the floor.');
            await world.sleepTicks(3);
            await player.say('Yay!');
            player.teleport(352, 3650);
        }
        player.addExperience('agility', 30, true);
        if (player.questStages.shiloVillage === 2) {
            player.questStages.shiloVillage = 3;
        }
    } else if (menu === 1) {
        player.message(
            'You think better of attempting to squeeze your body into the fissure.'
        );
        await player.say('It looked very dangerous, and dark...', 'scarey!');
    }
}

module.exports = { hasBeadsEquipped, succeed, bumpyDirtHolder };
