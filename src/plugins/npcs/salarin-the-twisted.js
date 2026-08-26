
const npcsData = require('@2003scape/rsc-data/config/npcs');

function findNpcIdByName(name) {
    const lower = name.toLowerCase();

    for (let i = 0; i < npcsData.length; i += 1) {
        if (npcsData[i] && npcsData[i].name.toLowerCase() === lower) {
            return i;
        }
    }

    return -1;
}

// NpcId.SALARIN_THE_TWISTED.
const SALARIN_THE_TWISTED_ID = findNpcIdByName('Salarin the twisted');

// blocks if caster still has attack > 2 or strength > 2
function shouldReact(player, npc) {
    return (
        npc.id === SALARIN_THE_TWISTED_ID &&
        (player.skills.attack.current > 2 || player.skills.strength.current > 2)
    );
}

// suppresses default combat cast
async function onSpellNPC(player, npc) {
    if (!shouldReact(player, npc)) {
        return false;
    }

    // degeneration only happens within 5 tiles
    if (!player.withinRange(npc, 5)) {
        return true;
    }

    // addresses overhead chat to the caster, waits 1 tick
    const previousInterlocutor = npc.interlocutor;
    npc.interlocutor = player;
    npc.broadcastChat('Amshalaraz Nithcosh dimarilo');
    npc.interlocutor = previousInterlocutor;
    await player.world.sleepTicks(1);

    player.message('You suddenly feel much weaker');

    // sets attack and strength to 0
    player.skills.attack.current = 0;
    player.skills.strength.current = 0;
    player.sendStats();

    return true;
}

module.exports = { onSpellNPC };
