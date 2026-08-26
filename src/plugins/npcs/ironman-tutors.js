
const { IronmanMode } = require('../../model/game-modes');

const IRONMAN_NPC_IDS = new Set([801, 802, 803]);

const IRONMAN_ARMOUR_IDS = new Set();

function onTutorialIsland(player) {
    return typeof player.cache.tutorialStage === 'number';
}

function greetingFor(player) {
    if (player.isIronMan(IronmanMode.Ironman)) {
        return 'Hail, Ironman!';
    }

    if (player.isIronMan(IronmanMode.Ultimate)) {
        return 'Hail, Ultimate Ironman!';
    }

    if (player.isIronMan(IronmanMode.Hardcore)) {
        return 'Hail, Hardcore Ironman!';
    }

    return `Hello, ${player.username}. We're the Ironman tutors.`;
}

const MODE_NAME = {
    [IronmanMode.None]: 'a normal player',
    [IronmanMode.Ironman]: 'a standard Ironman',
    [IronmanMode.Ultimate]: 'an Ultimate Ironman',
    [IronmanMode.Hardcore]: 'a Hardcore Ironman'
};

// valid downgrade targets from current mode, off tutorial island
function offIslandTargets(current) {
    if (current === IronmanMode.Hardcore || current === IronmanMode.Ultimate) {
        return [IronmanMode.Ironman, IronmanMode.None];
    }

    if (current === IronmanMode.Ironman) {
        return [IronmanMode.None];
    }

    return [];
}

// On Tutorial Island: switch freely between all four states.
function allTargets(current) {
    return [
        IronmanMode.None,
        IronmanMode.Ironman,
        IronmanMode.Ultimate,
        IronmanMode.Hardcore
    ].filter((mode) => mode !== current);
}

async function changeIronmanMode(player, npc) {
    const current = player.getIronMan();
    const onIsland = onTutorialIsland(player);
    const targets = onIsland ? allTargets(current) : offIslandTargets(current);

    if (targets.length === 0) {
        await npc.say("You're already a normal player - there's nothing to change.");
        return;
    }

    const choice = await player.ask(
        targets.map((mode) => `Become ${MODE_NAME[mode]}.`)
    );

    const target = targets[choice];

    await npc.say(
        `Are you sure you wish to ${
            onIsland ? 'change' : 'downgrade'
        } your Ironman status to ${MODE_NAME[target]}?`
    );

    const confirm = await player.ask([
        `Yes, I am sure, please make me ${MODE_NAME[target]}.`,
        'No, I changed my mind, keep my current status.'
    ]);

    if (confirm === 0) {
        player.setIronMan(target);
        player.sendIronManMode();
        player.message(`You are now ${MODE_NAME[target]}.`);
    } else {
        player.message('You have chosen to keep your current Ironman status.');
    }
}

async function lore(npc) {
    await npc.say(
        'When you play as an Ironman, you do everything',
        "for yourself. You don't trade with other players, or take",
        'their items, or accept their help.',
        'As an Ironman, you choose to have these restrictions',
        "imposed on you, so everyone knows you're doing it",
        'properly.',
        'If you think you have what it takes, you can choose to',
        'become a Hardcore Ironman',
        'In addition to the standard restrictions,',
        'Hardcore Iron Men only have one life.',
        'In the event of a dangerious death, your Hardcore Iron Men status',
        'will be downgraded to that of a standard Ironman, and your',
        'stats will be frozen on the Hardcore Ironman hiscores.',
        'For the ultimate challenge, you can choose to become',
        'an Ultimate Ironman.',
        'In addition to the standard restrictions, Ultimate Iron',
        'Men are blocked from using the bank, and they drop all',
        'their items when they die.',
        "While you're on Tutorial Island, you can switch freely",
        'between being a standard Ironman, an Ultimate Ironman,',
        'a Hardcore Ironman or a normal player.',
        "Once you've left this island, you'll be able to find us in",
        "Lumbridge, but we'll only let you switch your",
        'restrictions downwards, not upwards.',
        'So we will let Hardcore Iron Men or Ultimate Iron Men',
        'downgrade to a standard Iron Men,',
        "and we'll let either Ironman types of Ironman become normal players."
    );
}

function ifBankOrHeld(player, itemId) {
    return player.inventory.has(itemId) || player.bank.has(itemId);
}

const items = require('@2003scape/rsc-data/config/items');

const ARMOUR_NAMES = {
    helm: {
        1: 'Ironman helm',
        2: 'Ultimate ironman helm',
        3: 'Hardcore ironman helm'
    },
    body: {
        1: 'Ironman platebody',
        2: 'Ultimate ironman platebody',
        3: 'Hardcore ironman platebody'
    },
    top: {
        1: 'Ironman plate top',
        2: 'Ultimate ironman plate top',
        3: 'Hardcore ironman plate top'
    },
    legs: {
        1: 'Ironman platelegs',
        2: 'Ultimate ironman platelegs',
        3: 'Hardcore ironman platelegs'
    },
    skirt: {
        1: 'Ironman plated skirt',
        2: 'Ultimate ironman plated skirt',
        3: 'Hardcore ironman plated skirt'
    }
};

let armourIDCache = null;

function resolveArmourIDs() {
    if (armourIDCache) {
        return armourIDCache;
    }

    const byName = new Map();

    for (let i = 0; i < items.length; i += 1) {
        if (items[i] && items[i].name) {
            byName.set(items[i].name.toLowerCase(), i);
        }
    }

    armourIDCache = {};

    for (const [part, modes] of Object.entries(ARMOUR_NAMES)) {
        armourIDCache[part] = {};

        for (const [mode, name] of Object.entries(modes)) {
            const id = byName.get(name.toLowerCase());

            if (typeof id === 'number') {
                armourIDCache[part][mode] = id;
                IRONMAN_ARMOUR_IDS.add(id);
            }
        }
    }

    return armourIDCache;
}

function getArmourId(part, ironmanMode) {
    return resolveArmourIDs()[part][ironmanMode] ?? null;
}

function missingArmourAny(player, ironmanMode) {
    const missingHelm = !ifBankOrHeld(player, getArmourId('helm', ironmanMode));
    const missingBody =
        !ifBankOrHeld(player, getArmourId('body', ironmanMode)) &&
        !ifBankOrHeld(player, getArmourId('top', ironmanMode));
    const missingLegs =
        !ifBankOrHeld(player, getArmourId('legs', ironmanMode)) &&
        !ifBankOrHeld(player, getArmourId('skirt', ironmanMode));

    return missingHelm || missingBody || missingLegs;
}

async function giveArmourPiece(player, npc, part, ironmanMode) {
    const itemId = getArmourId(part, ironmanMode);

    if (itemId === null) {
        // no real item id exists for this piece yet
        player.message(
            "(the Ironman armour item data for this doesn't exist in this build yet)"
        );
        return;
    }

    player.inventory.add(itemId, 1);
    await npc.say(`${npc.definition.name} gives you a piece of Ironman armour`);
}

async function armourOption(player, npc) {
    const ironmanMode = player.getIronMan();

    if (!player.isIronMan()) {
        await npc.say("You're not an Ironman.", 'Our armour is only for them.');
        return;
    }

    if (onTutorialIsland(player)) {
        await npc.say(
            "We'll give you your armour once you're off this island.",
            'Come and see us in Lumbridge.'
        );
        return;
    }

    if (!missingArmourAny(player, ironmanMode)) {
        await npc.say("I think you've already got the whole set.");
        return;
    }

    if (!ifBankOrHeld(player, getArmourId('helm', ironmanMode))) {
        await giveArmourPiece(player, npc, 'helm', ironmanMode);
    }

    const hasBody =
        ifBankOrHeld(player, getArmourId('body', ironmanMode)) ||
        ifBankOrHeld(player, getArmourId('top', ironmanMode));

    if (!hasBody) {
        if (!player.isMale()) {
            await npc.say('Would you prefer a platebody or a plate top?');
            const option = await player.ask(['Platebody please', 'Plate top please']);
            await giveArmourPiece(player, npc, option === 0 ? 'body' : 'top', ironmanMode);
        } else {
            await giveArmourPiece(player, npc, 'body', ironmanMode);
        }
    }

    const hasLegs =
        ifBankOrHeld(player, getArmourId('legs', ironmanMode)) ||
        ifBankOrHeld(player, getArmourId('skirt', ironmanMode));

    if (!hasLegs) {
        await npc.say('Would you prefer platelegs or a plated skirt?');
        const option = await player.ask(['Platelegs please', 'Plated skirt please']);
        await giveArmourPiece(player, npc, option === 0 ? 'legs' : 'skirt', ironmanMode);
    }

    await npc.say('There you go. Wear it with pride.');
}

async function onTalkToNPC(player, npc) {
    if (!IRONMAN_NPC_IDS.has(npc.id)) {
        return false;
    }

    const config = player.world.server.config;
    if (config && config.spawnIronMan === false) {
        return false;
    }

    player.engage(npc);

    await npc.say(greetingFor(player));
    await npc.say('What can we do for you?');

    const menu = await player.ask([
        'Tell me about Iron Men.',
        `I'd like to ${onTutorialIsland(player) ? 'change' : 'review'} my Ironman mode.`,
        'Have you any armour for me, please?',
        "I'm fine, thanks."
    ]);

    if (menu === 0) {
        await lore(npc);
    } else if (menu === 1) {
        await changeIronmanMode(player, npc);
    } else if (menu === 2) {
        await armourOption(player, npc);
    }

    player.disengage();
    return true;
}

async function onNPCCommand(player, npc, command) {
    if (!IRONMAN_NPC_IDS.has(npc.id) || command.toLowerCase() !== 'armour') {
        return false;
    }

    player.engage(npc);
    await armourOption(player, npc);
    player.disengage();

    return true;
}

async function onGroundItemTake(player, groundItem) {
    if (!IRONMAN_ARMOUR_IDS.has(groundItem.id)) {
        return false;
    }

    player.message("I'd better speak to an Ironman Npc for a replacement");

    return true;
}

module.exports = {
    onTalkToNPC,
    onNPCCommand,
    onGroundItemTake
};
