// underground pass (members), shared ids.
//
// questStages.undergroundPass:
//   0 not started (start on king lathas)
//   1 accepted, meet koftik at cave entrance
//   2 entered cave, cross the burning bridge (fire arrow)
//   3 bridge crossed, tip the boulder
//   4 boulder tipped, cross the black-area agility bridges
//   5 fell into the dwarf caverns (met niloof)
//   6 learned of the witch/doll; gather the 4 elements onto the doll
//   7 doll complete, entered iban's temple
//   8 iban destroyed; report to king lathas
//  -1 complete

module.exports = {
    QUEST_KEY: 'undergroundPass',

    // reward: 5 quest points, agility and attack xp
    QUEST_POINTS: 5,
    XP_BASE: 2000,
    XP_VAR: 200,

    // npcs (rsc-data config/npcs.json)
    KOFTIK_ARDOUGNE: 626, // 713,582 - cave entrance / west ardougne
    KOFTIK_CAVE1: 627, //     702,3420 - by the bridge (gives damp cloth)
    KOFTIK_CAVE2: 628, //     723,3461 - by the well
    KOFTIK_CAVE3: 629, //     763,3441 - blocked passage
    KOFTIK_CAVE4: 650, //     740,584  - black area
    KOFTIK_RECOVERED: 659, // 763,661  - recovered near southern dwarfs
    KING_LATHAS: 512,
    IBAN: 649,
    IBAN_DISCIPLE: 658,
    KALRAG: 641,
    KARDIA_THE_WITCH: 643,
    KAMEN: 657,
    NILOOF: 642,
    KLANK: 648,
    OTHAINIAN: 645,
    DOOMION: 646,
    HOLTHION: 647,
    SOULESS_HUMAN: 644,
    SLAVE_1: 634,
    SLAVE_2: 635,
    SLAVE_3: 636,
    SLAVE_4: 637,
    SLAVE_5: 638,
    SLAVE_6: 639,
    SLAVE_7: 640,
    PALADIN_UNDERGROUND_BEARD: 632,
    PALADIN_UNDERGROUND: 633,

    // items (rsc-data config/items.json)
    DAMP_CLOTH: 989,
    ARROW: 984,
    LIT_ARROW: 985,
    ROCKS: 986,
    ROPE: 237,
    PLANK: 410,
    RAILING: 995,
    UNICORN_HORN: 997, // UNDERGROUND_PASS_UNICORN_HORN
    COAT_OF_ARMS_RED: 998,
    COAT_OF_ARMS_BLUE: 999,
    STAFF_OF_IBAN: 1000,
    STAFF_OF_IBAN_BROKEN: 1031,
    IBANS_ASHES: 1002,
    A_DOLL_OF_IBAN: 1004,
    OLD_JOURNAL: 1005,
    KLANKS_GAUNTLETS: 1006,
    IBANS_SHADOW: 1007,
    IBANS_CONSCIENCE: 1008,
    AMULET_OF_OTHAINIAN: 1009,
    AMULET_OF_DOOMION: 1010,
    AMULET_OF_HOLTHION: 1011,
    DWARF_BREW: 1001,
    KARDIA_CAT: 1003,
    TINDERBOX: 166,
    BUCKET: 21,
    COINS: 10,
    MEAT_PIE: 259,
    CHOCOLATE_BOMB: 907,
    MEAT_PIZZA: 326,
    SALMON: 357,
    STEW: 346,
    BREAD: 138,
    DEATH_RUNE: 38,
    FIRE_RUNE: 31,
    ROBE_OF_ZAMORAK_TOP: 702,
    ROBE_OF_ZAMORAK_BOTTOM: 703,
    ORB_OF_LIGHT_WHITE: 991,
    ORB_OF_LIGHT_BLUE: 992,
    ORB_OF_LIGHT_PINK: 993,
    ORB_OF_LIGHT_YELLOW: 994,
    FULL_SUPER_ATTACK_POTION: 486,
    FULL_STAT_RESTORATION_POTION: 477,
    TWO_ATTACK_POTION: 475,
    TWO_RESTORE_PRAYER_POTION: 484,
    KING_LATHAS_AMULET: 826,

    // objects (rsc-data config/objects.json)
    UNDERGROUND_CAVE: 725,
    OLD_BRIDGE: 726,
    OLD_BRIDGE_CROSSED: 727,
    FIRE: 97,
    CRUMBLED_ROCK: 728,
    LEVER_MAP1: 733,
    SWAMP_754: 754,
    SWAMP_795: 795,
    STALACTITE_1: 771,
    STALACTITE_2: 798,
    FURNACE: 813,
    WELL: 814,
    FLAMES_OF_ZAMORAK: 830,
    BOULDER: 867,
    CRATE: 868,
    CAGE_REMAINS: 871,
    PASSAGE: 873,
    GATE_OF_ZAMORAK: 875,
    TOMB_OF_IBAN: 878,
    DWARF_BARREL: 880,
    PILE_OF_MUD_FLOOR: 890,
    // black-area agility obstacles: 889 stone steps, 891 stone bridge (both
    // fall to 738,584)
    NORTH_STONE_STEP: 889,
    FIRST_REMAINING_BRIDGE: 891,
    DEMONS_CHEST_OPEN: 911,
    DEMONS_CHEST_CLOSED: 912,
    PIT_OF_THE_DAMNED: 913,
    ZAMORAKIAN_TEMPLE_DOOR: 869,
    LEVER_CAGE: 801,
    UNICORN_CAGE: 802,
    LADDER: 920,
    GATE_OF_IBAN: 722,
    WALL_GRILL_EAST: 836,
    WALL_GRILL_WEST: 838,
    SPIDER_NEST_RAILING: 171, // wall-object
    SOULESS_CAGE_B: 887,
    SOULESS_CAGE_A: 888,

    // Witch's house (wall-objects)
    WITCH_RAILING: 172,
    WITCH_DOOR: 173,
    WITCH_CHEST: 885,

    // railings (wall-objects) on map2
    RAILING_167: 167,
    RAILING_168: 168,
    RAILING_169: 169,
    RAILING_170: 170,

    // black area obstacles
    LEDGES: [862, 864, 863, 872, 865, 866],
    SOUTH_STONE_STEP: 921,
    STONE_JUMP_BRIDGES: [898, 892, 896, 910, 906, 908, 902, 904, 900, 894],
    STONE_REMAINING_BRIDGES: [893, 907, 905, 909, 903, 901, 895, 899, 897],

    // first cave region obstacles
    MAIN_ROCKS: [
        731, 737, 738, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748, 749
    ],
    MAIN_LEDGE: [732, 750, 751, 752, 753],
    FAIL_SWAMP_ROCKS: [756, 757, 758, 759, 760, 762, 763, 764, 765, 766],
    READ_ROCKS: [832, 833, 834, 835, 923, 922, 881],
    SPEAR_ROCKS: [806, 807, 808, 809, 810, 811, 882, 883],
    PILE_OF_MUD_MAP1: 767,
    CLEAR_ROCKS: 772,
    CLEAR_ROCKS_INIT_WEST: 796,
    CLEAR_ROCKS_INIT_EAST: 797,
    DROP_DOWN_LEDGE: 812,

    // dwarf-cavern region obstacles
    PILE_OF_MUD_MAP2: [841, 843, 844, 845, 846, 847],
    DUG_UP_SOIL: [839, 840],
    LEDGE_MAP2: 837,
    ROCKS_MAP2: [849, 850, 851, 852, 860, 853, 854, 855, 859, 857, 858],
    HIJACK_ROCK: 856,

    // orb-of-light region
    NORTH_PASSAGE: [825, 828, 829],
    SOUTH_WEST_PASSAGE: 815,
    SOUTH_WEST_PASSAGE_CLIMB_UP: 816,
    SOUTH_WEST_PASSAGE_CLIMB_UP_ROPE: 817,
    SOUTH_WEST_STALAGMITE: 818,
    WEST_PASSAGE: [819, 820, 821, 822, 823, 824],

    // tile-grill puzzle
    // lever (801) and cage (802) reuse the LEVER_CAGE/UNICORN_CAGE constants above
    WORKING_GRILLS: [777, 785, 786, 787, 788, 789, 790, 791],
    FAIL_GRILL: 782,
    WALK_HERE_ROCK_EAST: 792,
    WALK_HERE_ROCK_WEST: 793
};
