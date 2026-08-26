// rune essence altar exit portals

const EXIT_DESTINATIONS = {
    1214: [305, 594], // air altar
    1215: [298, 441], // mind altar
    1216: [148, 683], // water altar
    1217: [63, 467], // earth altar
    1218: [53, 634], // fire altar
    1219: [260, 502], // body altar
    1220: [104, 3566], // cosmic altar
    1221: [236, 376], // chaos altar
    1222: [393, 803], // nature altar
    1223: [410, 537], // law altar
    1224: [0, 0], // death altar (inactive rune in OpenRSC)
    1225: [0, 0] // blood altar (inactive rune in OpenRSC)
};

const RUNE_ESSENCE_MINE_EXIT_ID = 1226;

const TAKE_DESTINATIONS = {
    1228: [835, 71],
    1229: [825, 76],
    1230: [842, 55],
    1231: [819, 51],
    1232: [859, 51]
};

const LEVEL1_PORTALS = [
    [825, 67],
    [836, 76],
    [843, 79],
    [849, 83],
    [859, 79]
];

const LEVEL2_PORTALS = [
    ...LEVEL1_PORTALS,
    [835, 71],
    [839, 75],
    [851, 60]
];

const LEVEL3_PORTALS = [
    ...LEVEL2_PORTALS,
    [842, 55],
    [830, 57],
    [829, 64],
    [823, 51]
];

const RANDOM_TAKE_PORTALS = {
    1233: LEVEL1_PORTALS,
    1234: LEVEL2_PORTALS,
    1235: LEVEL3_PORTALS
};

// exit/take portals use command slot one
async function onGameObjectCommandOne(player, gameObject) {
    const { id } = gameObject;

    // "Exit" - per-altar / mine exit portals.
    if (EXIT_DESTINATIONS.hasOwnProperty(id)) {
        const [x, y] = EXIT_DESTINATIONS[id];
        player.teleport(x, y, false);
        return true;
    }

    if (id === RUNE_ESSENCE_MINE_EXIT_ID) {
        const entrance = player.cache.essence_entrance;

        if (entrance !== undefined) {
            if (entrance === 0) {
                player.teleport(101, 523, false);
            } else {
                player.teleport(222, 3517, false);
            }

            delete player.cache.essence_entrance;
        } else {
            // shouldn't happen unless a gm teleports to essence
            player.teleport(101, 523, false);
        }

        return true;
    }

    // "Take" - fixed wrong-portal teleports.
    if (TAKE_DESTINATIONS.hasOwnProperty(id)) {
        const [x, y] = TAKE_DESTINATIONS[id];
        player.teleport(x, y);
        return true;
    }

    // "Take" - randomized wrong-portal teleports (level1/2/3 maze).
    if (RANDOM_TAKE_PORTALS.hasOwnProperty(id)) {
        const portals = RANDOM_TAKE_PORTALS[id];
        const [x, y] = portals[Math.floor(Math.random() * portals.length)];
        player.teleport(x, y);
        return true;
    }

    // 1236 "exit portal at the altar" - no-op in OpenRSC.
    return false;
}

module.exports = { onGameObjectCommandOne };
