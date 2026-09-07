// fire warrior of lesarkus (361) can only be killed with a yew/magic bow and ice arrows
// any other attack is refused

const { questsEnabled } = require('../../custom-gate.js');

const FIRE_WARRIOR_ID = 361;

const ICE_ARROWS_ID = 723;

// OpenRSC hasGoodBow(): yew/magic long/short bows.
const GOOD_BOWS = [
    654, // yew longbow
    655, // yew shortbow
    656, // magic longbow
    657 // magic shortbow
];

function hasGoodBow(player) {
    return GOOD_BOWS.some((bow) => player.inventory.isEquipped(bow));
}

function canKillFireWarrior(player) {
    // allowed once the player has ice arrows and a good bow, or has already shot ice
    if (player.cache.shot_ice) {
        return true;
    }

    if (player.inventory.has(ICE_ARROWS_ID) && hasGoodBow(player)) {
        player.cache.shot_ice = true;
        return true;
    }

    return false;
}

// the fire warrior may only be harmed with ice arrows
async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== FIRE_WARRIOR_ID) {
        return false;
    }

    const stage = player.questStages.templeOfIkov;

    if (player.cache.killedLesarkus || stage === -1 || stage === -2) {
        player.message('You have already killed the fire warrior');
        return true;
    }

    // melee is never allowed against the fire warrior
    player.message('You need to kill the fire warrior with ice arrows');
    return true;
}

// magic can never harm the fire warrior, always refused
async function onSpellNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== FIRE_WARRIOR_ID) {
        return false;
    }

    const stage = player.questStages.templeOfIkov;

    if (player.cache.killedLesarkus || stage === -1 || stage === -2) {
        player.message('You have already killed the fire warrior');
        return true;
    }

    player.message('You need to kill the fire warrior with ice arrows');
    return true;
}

// mark the fire warrior killed; revive if the ice-arrow requirement wasn't met
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== FIRE_WARRIOR_ID) {
        return false;
    }

    if (player.cache.killedLesarkus) {
        return false;
    }

    if (!canKillFireWarrior(player)) {
        // requirement not met: he cannot be killed - restore his health.
        npc.skills.hits.current = npc.skills.hits.base;
        player.message('You need to kill the fire warrior with ice arrows');
        return true;
    }

    player.cache.killedLesarkus = true;

    // return false so he dies as normal
    return false;
}

// ranging the fire warrior needs ice arrows on a yew or magic bow
async function onRangeNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== FIRE_WARRIOR_ID) {
        return false;
    }

    const stage = player.questStages.templeOfIkov;

    if (player.cache.killedLesarkus || stage === -1 || stage === -2) {
        player.message('You have already killed the fire warrior');
        return true;
    }

    if (canKillFireWarrior(player)) {
        return false;
    }

    player.message('You need to kill the fire warrior with ice arrows');
    return true;
}

module.exports = { onNPCAttack, onRangeNPC, onSpellNPC, onNPCDeath };
