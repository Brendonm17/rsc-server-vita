// monk ferries port sarim to entrana (npc 212): searches the player and
// refuses boarding with any blocked weapon/armour, else teleports to (418, 570).

const MONK_OF_ENTRANA_PORTSARIM_ID = 212;

// entrana dock ships at port sarim
const SHIP_IDS = new Set([238, 239, 240]);

const ENTRANA_ARRIVE = { x: 418, y: 570 };

// items blocked from boarding
const BLOCKED_ITEM_IDS = new Set([
    // Arrows
    11, 638, 640, 642, 644, 646, 723,
    // Poison Arrows
    574, 639, 641, 643, 645, 647,
    // Arrow Heads
    669, 670, 671, 672, 673, 674,
    // Woodcutting Axes
    87, 12, 88, 428, 203, 204, 405,
    // Battle Axes
    205, 89, 90, 429, 91, 92, 93, 594,
    // Battle Staves
    614, 617, 616, 618, 615, 684, 683, 685, 682,
    // Bows
    188, 648, 650, 652, 654, 656, 189, 649, 651, 653, 655, 657,
    // Chain Mail Body
    15, 113, 7, 114, 431, 115, 116, 400,
    // Cross Bows
    59, 60,
    // Crossbow Bolts
    190, 592, 786, 790,
    // Daggers
    62, 28, 63, 423, 64, 65, 396,
    // Poisoned Daggers
    560, 559, 561, 565, 562, 564, 563,
    // Dwarf Cannon
    1032, 1033, 1034, 1035,
    // Helmets
    104, 5, 105, 470, 106, 107, 399, 795, 108, 6, 109, 230, 110, 111, 112,
    // Maces
    94, 0, 95, 430, 96, 97, 98,
    // Plate mail bodies
    117, 8, 118, 196, 119, 120, 401,
    // Plate mail legs
    206, 9, 121, 248, 122, 123, 402,
    // Plate mail tops
    308, 312, 309, 313, 310, 311, 407,
    // Plated skirts
    214, 215, 225, 434, 226, 227, 406,
    // Scimitars
    82, 83, 84, 427, 85, 86, 398,
    // Shields
    124, 3, 125, 432, 126, 127, 403, 1278, 128, 2, 129, 433, 130, 131, 404,
    4, 420,
    // Spears & poisoned
    827, 1088, 1089, 1090, 1091, 1092,
    1135, 1136, 1137, 1138, 1139, 1140,
    // 2h, short, long swords
    76, 77, 78, 426, 79, 80, 81,
    66, 1, 67, 424, 68, 69, 397,
    70, 71, 72, 425, 73, 74, 75, 593,
    // Throwing Darts & tips & poisoned
    1013, 1015, 1024, 1068, 1069, 1070,
    1062, 1063, 1064, 1065, 1066, 1067,
    1122, 1123, 1124, 1125, 1126, 1127,
    // Throwing Knives & poisoned
    1076, 1075, 1077, 1081, 1078, 1079, 1080,
    1128, 1129, 1130, 1132, 1131, 1133, 1134,
    // Quest Weapons
    52, 217, 606, 265, 307, 733, 734, 754, 755, 757, 1000, 725, 1014, 1071
    // scythe not blocked
]);

function playerNotAllowedOnEntrana(player) {
    for (const item of player.inventory.items) {
        if (BLOCKED_ITEM_IDS.has(item.id)) {
            return true;
        }
    }

    return false;
}

async function talkToMonk(player, npc) {
    player.engage(npc);

    await npc.say(
        'Are you looking to take passage to our holy island?',
        'If so your weapons and armour must be left behind'
    );

    // Java multi(player, n, options...) defaults send-over true.
    const option = await player.ask(
        ["No I don't wish to go", "Yes, Okay I'm ready to go"],
        true
    );

    if (option === 1) {
        const { world } = player;

        player.message('@que@The monk quickly searches you');
        await world.sleepTicks(5);

        if (playerNotAllowedOnEntrana(player)) {
            await npc.say(
                'Sorry we cannow allow you on to our island',
                'Make sure you are not carrying weapons or armour please'
            );
        } else {
            player.message('@que@You board the ship');
            await world.sleepTicks(5);
            player.teleport(ENTRANA_ARRIVE.x, ENTRANA_ARRIVE.y);
            await world.sleepTicks(3);
            player.message('@que@The ship arrives at Entrana');
        }
    }

    player.disengage();
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== MONK_OF_ENTRANA_PORTSARIM_ID) {
        return false;
    }

    // blocked but silent on a free world
    if (!player.world.members) {
        return true;
    }

    await talkToMonk(player, npc);

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!SHIP_IDS.has(gameObject.id)) {
        return false;
    }

    const { world } = player;

    const monk = Array.from(
        world.npcs.getAllByID(MONK_OF_ENTRANA_PORTSARIM_ID)
    ).find((npc) => {
        return (
            !npc.interlocutor &&
            player.localEntities.known.npcs.has(npc) &&
            player.getDistance(npc) <= 10
        );
    });

    if (monk) {
        await talkToMonk(player, monk);
    } else {
        player.message(
            'I need to speak to the monk before boarding the ship.'
        );
    }

    return true;
}

module.exports = { onTalkToNPC, onGameObjectCommandOne };
