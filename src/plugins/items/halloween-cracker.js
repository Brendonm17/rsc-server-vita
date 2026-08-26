// halloween cracker: pull with another player, 50/50 who gets the mask vs the prize, plus a banker/Ironman-only
// onUseNpc branch.
// weighted prizes (pumpkin/choc/zamorak robe/unholy symbol) vs masks 828/831/832; inert until HALLOWEEN_CRACKER_ID exists in rsc-data.

const itemDefs = require('@2003scape/rsc-data/config/items');

// not in rsc-data; never matches, so both hooks return false until an id exists
const HALLOWEEN_CRACKER_ID = null;

// same banker ids as npcs/banker.js BANKER_IDS
const BANKER_IDS = new Set([95, 224, 268, 540, 617, 792]);

// mask ids/weights: the 3 masks in rsc-data (green/red/blue halloween mask), weights 9/10/8 proportional to the Java
// 16-entry table
const MASK_IDS = [828, 831, 832];
const MASK_WEIGHTS = [9, 10, 8];

const PUMPKIN_ID = 422;
const CHOCOLATE_BAR_ID = 337;
const ROBE_OF_ZAMORAK_TOP_ID = 702;
const ROBE_OF_ZAMORAK_BOTTOM_ID = 703;
const UNHOLY_SYMBOL_OF_ZAMORAK_ID = 1029;

// prizeIds/prizeWeights (only the 6 live entries; see header comment).
const PRIZE_IDS = [
    PUMPKIN_ID,
    CHOCOLATE_BAR_ID,
    ROBE_OF_ZAMORAK_TOP_ID,
    ROBE_OF_ZAMORAK_BOTTOM_ID,
    UNHOLY_SYMBOL_OF_ZAMORAK_ID,
    'TRICK' // NOTHING_REROLL4 sentinel -> reroll on trickIds/trickWeights
];
const PRIZE_WEIGHTS = [48, 48, 12, 12, 20, 48];

// trickIds/trickWeights.
const TRICK_IDS = [155, 252, 801, 547, 912];
const TRICK_WEIGHTS = [48, 52, 52, 52, 52];

function itemName(id) {
    return itemDefs[id].name;
}

// weightedRandomChoice: pick an index from weights proportionally, return ids[index]
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

// getPrizeID
function getPrizeID() {
    const prizeId = weightedRandomChoice(PRIZE_IDS, PRIZE_WEIGHTS);

    if (prizeId === 'TRICK') {
        return weightedRandomChoice(TRICK_IDS, TRICK_WEIGHTS);
    }

    return prizeId;
}

// onUsePlayer's two mask/prize branches: "You got the" vs "You got a"
function pickMaskAndPrize() {
    return {
        maskId: weightedRandomChoice(MASK_IDS, MASK_WEIGHTS),
        prizeId: getPrizeID()
    };
}

// DataConversions.random(0, 1) == 1 branch: player gets the mask.
function playerGetsMask(player, otherPlayer, maskId, prizeId) {
    player.message(`Out comes a ${itemName(maskId).toLowerCase()}!`);
    otherPlayer.message(`You got the ${itemName(prizeId).toLowerCase()}!`);
    player.message(
        `${otherPlayer.username} got the ${itemName(prizeId).toLowerCase()}!`
    );

    player.inventory.add(maskId);
    otherPlayer.inventory.add(prizeId);
}

// else branch: otherPlayer gets the mask.
function otherPlayerGetsMask(player, otherPlayer, maskId, prizeId) {
    otherPlayer.message(`Out comes a ${itemName(maskId).toLowerCase()}!`);
    otherPlayer.message(
        `${player.username} got the ${itemName(prizeId).toLowerCase()}!`
    );
    player.message(`You got a ${itemName(prizeId).toLowerCase()}!`);

    otherPlayer.inventory.add(maskId);
    player.inventory.add(prizeId);
}

function isIronMan(player) {
    return (
        player.isIronMan(1) || player.isIronMan(2) || player.isIronMan(3)
    );
}

async function onUseWithPlayer(player, otherPlayer, item) {
    if (item.id !== HALLOWEEN_CRACKER_ID) {
        return false;
    }

    if (isIronMan(otherPlayer)) {
        player.message(
            `${otherPlayer.username} is an Ironman. ` +
                `${otherPlayer.isMale() ? 'He' : 'She'} stands alone.`
        );

        return true;
    }

    player.faceEntity(otherPlayer);
    otherPlayer.faceEntity(player);

    player.inventory.remove(HALLOWEEN_CRACKER_ID);

    player.sendBubble(item.id);
    await player.say('Trick or treat?');

    player.message(`You pull the cracker with ${otherPlayer.username}...`);
    otherPlayer.message(`${player.username} is pulling a cracker with you...`);

    const { maskId, prizeId } = pickMaskAndPrize();

    // random(0,1) == 1 -> player wins the mask, else otherPlayer wins the mask
    if (Math.random() < 0.5) {
        otherPlayerGetsMask(player, otherPlayer, maskId, prizeId);
    } else {
        playerGetsMask(player, otherPlayer, maskId, prizeId);
    }

    return true;
}

async function onUseWithNPC(player, npc, item) {
    if (item.id !== HALLOWEEN_CRACKER_ID || !BANKER_IDS.has(npc.id)) {
        return false;
    }

    if (!isIronMan(player)) {
        player.message('Nothing interesting happens');
        return true;
    }

    await player.say('Would you pull this cracker with me?');
    await npc.say('very good, let me help you out with the cracker');

    if (!player.inventory.has(HALLOWEEN_CRACKER_ID)) {
        await npc.say("wait where'd it go...");
        return true;
    }

    player.inventory.remove(HALLOWEEN_CRACKER_ID);
    player.sendBubble(item.id);
    player.message('The banker pulls the halloween cracker on you');

    const { maskId, prizeId } = pickMaskAndPrize();

    player.message('You get the prize from the cracker');
    player.inventory.add(maskId);
    player.inventory.add(prizeId);

    return true;
}

module.exports = { onUseWithPlayer, onUseWithNPC };
