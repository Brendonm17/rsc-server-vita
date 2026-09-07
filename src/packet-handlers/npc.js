async function getNPC(player, index) {
    if (player.locked) {
        return;
    }

    const { world } = player;
    const npc = world.npcs.getByIndex(index);

    if (!npc) {
        throw new RangeError(`invalid npc index ${index}`);
    }

    if (!npc.withinRange(player, 3, true)) {
        if (npc.withinRange(player, 8)) {
            await player.chase(npc);
        } else {
            return;
        }

        if (!npc.withinRange(player, 3, true)) {
            return;
        }
    }

    npc.stepsLeft = 0;
    player.lock();

    return npc;
}

async function npcTalk({ player }, { index }) {
    // fighting gets its own message; other busy states are a silent no-op
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    player.walkAction = false;

    player.endWalkFunction = async () => {
        const { world } = player;
        const npc = await getNPC(player, index);

        if (!npc) {
            return;
        }

        if (npc.interlocutor) {
            player.unlock();
            player.message(`The ${npc.definition.name} is busy at the moment`);
            return;
        }

        if (npc.opponent || npc.locked) {
            player.unlock();
            return;
        }

        npc.lock();

        const blocked = await world.callPlugin('onTalkToNPC', player, npc);

        if (blocked) {
            return;
        }

        player.unlock();
        npc.unlock();

        player.message(
            `The ${npc.definition.name} does not appear interested in talking`
        );
    };
}

// npcs a note may be used on (bankers + certers); mortimer/randolph are custom, found by name
let NOTE_TAKERS = null;

function noteTakers() {
    if (!NOTE_TAKERS) {
        NOTE_TAKERS = new Set([
            95, 224, 268, 540, 617, // bankers
            225, 226, 227, 466, 467, 299, 341, 369, 370, 267, 348, 778 // certers
        ]);

        const npcs = require('@2003scape/rsc-data/config/npcs');

        for (let id = 794; id < npcs.length; id += 1) {
            const name = (npcs[id] && npcs[id].name) || '';

            if (name === 'Mortimer' || name === 'Randolph') {
                NOTE_TAKERS.add(id);
            }
        }
    }

    return NOTE_TAKERS;
}

async function useWithNPC({ player }, { npcIndex, index }) {
    // fighting gets its own message
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    player.walkAction = false;

    player.endWalkFunction = async () => {
        const item = player.inventory.items[index];

        if (!item) {
            throw new RangeError(`invalid item index ${index}`);
        }

        const { world } = player;
        const npc = await getNPC(player, npcIndex);

        if (!npc) {
            player.unlock();
            return;
        }

        // a note only works on a banker or a certer
        if (item.noted && !noteTakers().has(npc.id)) {
            player.unlock();
            player.message('Nothing interesting happens');
            return;
        }

        if (!world.members && item.definition.members) {
            player.message('Nothing interesting happens');
            return;
        }

        npc.lock();

        const blocked = await world.callPlugin(
            'onUseWithNPC',
            player,
            npc,
            item
        );

        player.unlock();
        npc.unlock();

        if (!blocked) {
            player.message('Nothing interesting happens');
        }
    };
}

// the ardougne range-training ogre
const OGRE_TRAINING_CAMP_ID = 525;

// training-camp ogres take ranged attacks only, none from inside the pen; true = refused
function ogreRuleRefuses(player, npc, ranged) {
    if (npc.id !== OGRE_TRAINING_CAMP_ID) {
        return false;
    }

    const inPen =
        player.x >= 663 && player.x <= 668 && player.y >= 531 && player.y <= 535;

    if (!ranged || inPen) {
        player.message('these ogres are for range combat training only');
        return true;
    }

    return false;
}

// rules an npc attack passes through (ogre rule, then range/attack plugins); true if refused
async function npcAttackBlocked(player, npc, ranged = !!player.inventory.getRangedWeapon()) {
    if (ogreRuleRefuses(player, npc, ranged)) {
        return true;
    }

    const hook = ranged ? 'onRangeNPC' : 'onNPCAttack';

    return !!(await player.world.callPlugin(hook, player, npc));
}

async function npcAttack({ player }, { index }) {
    if (player.opponent) {
        player.message('You are already busy fighting!');
        return;
    }

    if (player.locked) {
        return;
    }

    const { world } = player;
    const npc = world.npcs.getByIndex(index);

    if (!npc) {
        throw new RangeError(`invalid npc index ${index}`);
    }

    if (player.rangedTimeout) {
        return;
    }

    if (ogreRuleRefuses(player, npc, !!player.inventory.getRangedWeapon())) {
        return;
    }

    if (player.inventory.getRangedWeapon()) {
        // range trigger before the shot
        const blocked = await world.callPlugin('onRangeNPC', player, npc);

        if (!blocked) {
            await player.shootRanged(npc);
        }

        return;
    }

    player.toAttack = npc;

    player.endWalkFunction = async () => {
        const { world } = player;

        const npc = await getNPC(player, index);

        if (!npc) {
            player.toAttack = null;
            return;
        }

        if (!npc.definition.hostility) {
            player.unlock();
            throw new Error(`${player} trying to attack unattackable NPC`);
        }

        if (npc.locked) {
            player.toAttack = null;
            player.unlock();
            return;
        }

        npc.lock();

        const blocked = await world.callPlugin('onNPCAttack', player, npc);

        if (!blocked) {
            npc.unlock();

            if (!(await player.attack(npc))) {
                player.message("I can't reach that!");
            }
        } else {
            player.unlock();
            npc.unlock();
        }
    };
}

// resolve and dispatch the npc's own command string instead of hardcoding pickpocket
// on a pickpocket failure the plugin leaves both locked and starts combat, so don't force-unlock when blocked
async function npcCommandWith({ player }, { index }, second) {
    // fighting gets its own message
    if (player.opponent) {
        player.message("You can't do that whilst you are fighting");
        return;
    }

    if (player.locked) {
        return;
    }

    player.walkAction = false;

    player.endWalkFunction = async () => {
        const { world } = player;
        const npc = await getNPC(player, index);

        if (!npc) {
            return;
        }

        if (npc.interlocutor) {
            player.unlock();
            player.message(`The ${npc.definition.name} is busy at the moment`);
            return;
        }

        if (npc.opponent || npc.locked) {
            player.unlock();
            return;
        }

        npc.lock();

        // 202 = command, 203 = command2
        const definition = npc.definition;
        const command = ((second ? definition.command2 : definition.command) || '').toLowerCase();

        const blocked = await world.callPlugin(
            'onNPCCommand',
            player,
            npc,
            command
        );

        if (blocked) {
            return;
        }

        player.unlock();
        npc.unlock();
    };
}

async function npcCommand(context, message) {
    return npcCommandWith(context, message, false);
}

// the npc's second right-click command (opcode 203)
async function npcCommand2(context, message) {
    return npcCommandWith(context, message, true);
}

module.exports = { npcTalk, useWithNPC, npcAttack, npcCommand, npcCommand2, npcAttackBlocked };
