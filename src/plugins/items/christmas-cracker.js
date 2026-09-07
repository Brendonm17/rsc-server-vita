// https://classic.runescape.wiki/w/Christmas_cracker
//
// item ids:
//   575  christmas cracker
//   576/577/578/579/580/581 red/yellow/blue/green/pink/white party hat
//   42   law rune
//   423  black dagger
//   283  gold ring
//   200  silk
//   385  holy symbol of saradomin
//   517  iron ore certificate
//   336  chocolate slice
//   179  spinach roll
//   383  silver
//   337  chocolate bar
// banker npc ids match ../npcs/banker.js BANKER_IDS

const { IronmanMode } = require('../../model/game-modes');

const CHRISTMAS_CRACKER_ID = 575;

const BANKER_IDS = new Set([95, 224, 268, 540, 617, 792]);

// party hat ids and their weights
const PHAT_IDS = [580, 578, 579, 581, 576, 577];
const PHAT_WEIGHTS = [10, 15, 20, 23, 32, 28];

// prize ids and their weights
const PRIZE_IDS = [42, 423, 283, 200, 385, 517, 336, 179, 383, 337];
const PRIZE_WEIGHTS = [5, 6, 10, 11, 10, 12, 15, 17, 18, 24];

// pick an index weighted by `weights`, return ids[index]
function weightedRandomChoice(ids, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.floor(Math.random() * total);

    for (let i = 0; i < ids.length; i += 1) {
        if (roll < weights[i]) {
            return ids[i];
        }

        roll -= weights[i];
    }

    return ids[ids.length - 1];
}

function rollHatAndPrize() {
    return {
        hatId: weightedRandomChoice(PHAT_IDS, PHAT_WEIGHTS),
        prizeId: weightedRandomChoice(PRIZE_IDS, PRIZE_WEIGHTS)
    };
}

function isIronManStandsAlone(player) {
    // ironman/ultimate/hardcore/transfer stand alone
    return (
        player.isIronMan(IronmanMode.Ironman) ||
        player.isIronMan(IronmanMode.Ultimate) ||
        player.isIronMan(IronmanMode.Hardcore) ||
        player.isIronMan(IronmanMode.Transfer)
    );
}

function isIronManForBanker(player) {
    // ironman/ultimate/hardcore (no transfer)
    return (
        player.isIronMan(IronmanMode.Ironman) ||
        player.isIronMan(IronmanMode.Ultimate) ||
        player.isIronMan(IronmanMode.Hardcore)
    );
}

function sameIP(player, otherPlayer) {
    const playerIP = player.socket && player.socket.remoteAddress;
    const otherIP = otherPlayer.socket && otherPlayer.socket.remoteAddress;

    return !!(playerIP && otherIP && playerIP.toLowerCase() === otherIP.toLowerCase());
}

async function onUseWithPlayer(player, otherPlayer, item) {
    if (item.id !== CHRISTMAS_CRACKER_ID) {
        return false;
    }

    if (isIronManStandsAlone(otherPlayer)) {
        player.message(
            `${otherPlayer.username} is an Ironman. ` +
                `${otherPlayer.isMale() ? 'He' : 'She'} stands alone.`
        );
        return true;
    }

    const config = player.world.server.config;
    const canUseCrackerOnSelf = !!(config && config.canUseCrackerOnSelf);

    if (!canUseCrackerOnSelf && !player.isAdministrator() && sameIP(player, otherPlayer)) {
        player.message(`${otherPlayer.username} does not want to pull a cracker with you...`);
        return true;
    }

    player.faceEntity(otherPlayer);

    player.sendBubble(item.id);
    player.message('You pull a christmas cracker');
    otherPlayer.message('You pull a christmas cracker');

    await player.world.sleepTicks(1);

    if (!player.inventory.has(CHRISTMAS_CRACKER_ID)) {
        return true;
    }

    player.inventory.remove(CHRISTMAS_CRACKER_ID);

    const { hatId, prizeId } = rollHatAndPrize();

    if (Math.random() < 0.5) {
        otherPlayer.message('The person you pull the cracker with gets the prize');
        player.message('You get the prize from the cracker');
        player.inventory.add(hatId);
        player.inventory.add(prizeId);
    } else {
        player.message('The person you pull the cracker with gets the prize');
        otherPlayer.message('You get the prize from the cracker');
        otherPlayer.inventory.add(hatId);
        otherPlayer.inventory.add(prizeId);
    }

    return true;
}

async function onUseWithNPC(player, npc, item) {
    if (item.id !== CHRISTMAS_CRACKER_ID || !BANKER_IDS.has(npc.id)) {
        return false;
    }

    if (!isIronManForBanker(player)) {
        player.message('Nothing interesting happens');
        return true;
    }

    await player.say('Would you pull this cracker with me?');
    await npc.say('very good, let me help you out with the cracker');
    player.sendBubble(item.id);
    player.message('@que@The banker pulls the christmas cracker on you');

    await player.world.sleepTicks(1);

    if (!player.inventory.has(CHRISTMAS_CRACKER_ID)) {
        return true;
    }

    player.inventory.remove(CHRISTMAS_CRACKER_ID);

    const { hatId, prizeId } = rollHatAndPrize();

    player.message('You get the prize from the cracker');
    player.inventory.add(hatId);
    player.inventory.add(prizeId);

    return true;
}

module.exports = { onUseWithPlayer, onUseWithNPC };
