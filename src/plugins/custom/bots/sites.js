// named work sites bots relocate between for a living-world feel. each site is a
// coordinate (routed over the waypoint graph) plus a type; combat sites carry
// target npc ids and a minCombat level that gates by combat level.
// all sites sit in the f2p-core graph, reachable from lumbridge.

// tier: skill level at which a site's best resource is worthwhile (gather analogue
// of minCombat); steers a bot to better content as it levels. defaults to 1.
module.exports = [
    { name: 'lumbridge_trees', x: 117, y: 668, type: 'gather', tier: 1 },
    { name: 'goblins', x: 96, y: 664, type: 'combat', targetIds: [62], minCombat: 1 },
    // loot: the ground drops the combat brain picks up here (into combat.lootIds).
    // cowhide 147 + raw beef 504 feed the leather-crafting pipeline.
    { name: 'cows', x: 94, y: 621, type: 'combat', targetIds: [6], minCombat: 1, loot: [147, 504] },
    { name: 'rats', x: 137, y: 686, type: 'combat', targetIds: [19, 29], minCombat: 1, loot: [503] },
    { name: 'giant_spiders', x: 173, y: 637, type: 'combat', targetIds: [23], minCombat: 10 },
    { name: 'dark_wizards', x: 362, y: 571, type: 'combat', targetIds: [57], minCombat: 20 },
    { name: 'dwarves', x: 268, y: 486, type: 'combat', targetIds: [699], minCombat: 25 },
    // pker hunting grounds; only pvp:true bots relocate here. minCombat gates
    // strength, minBold gates nerve (the deeper spot needs a bold bot).
    { name: 'wilderness_edge', x: 120, y: 420, type: 'combat', targetIds: [62], minCombat: 15, pvp: true },
    // deep wilderness (~level 25): richer pk targets but real danger, bold bots only
    { name: 'wilderness_deep', x: 120, y: 280, type: 'combat', targetIds: [62], minCombat: 60, pvp: true, minBold: 0.35 },

    // western members lands (kandarin/ardougne/gnome), reachable via the white wolf
    // mountain portal. gather sites; the task finds nearby trees/rocks/fish.
    { name: 'catherby_shore', x: 440, y: 495, type: 'gather', tier: 30 },
    { name: 'seers_village', x: 500, y: 450, type: 'gather', tier: 45 },
    { name: 'ardougne_outskirts', x: 560, y: 585, type: 'gather', tier: 30 },
    { name: 'gnome_stronghold', x: 700, y: 527, type: 'gather', tier: 30 },

    // skill gather sites: the task swaps to the site's gatherSkill (mining/fishing)
    // instead of woodcutting. rock/spot ids and coords from rsc-data, all reachable.
    { name: 'alkharid_mine', x: 70, y: 544, type: 'gather', gatherSkill: 'mining', tier: 15 },
    { name: 'rimmington_mine', x: 312, y: 636, type: 'gather', gatherSkill: 'mining', tier: 15 },
    { name: 'barbarian_mine', x: 225, y: 504, type: 'gather', gatherSkill: 'mining', tier: 30 },
    { name: 'draynor_fishing', x: 221, y: 664, type: 'gather', gatherSkill: 'fishing', tier: 1 },
    { name: 'barbarian_fishing', x: 208, y: 501, type: 'gather', gatherSkill: 'fishing', tier: 20 },
    { name: 'lumbridge_swamp_fishing', x: 303, y: 727, type: 'gather', gatherSkill: 'fishing', tier: 1 },
    // kandarin high-value gather: catherby harpoon/cage spot lands tuna/swordfish/
    // shark; catherby rocks carry iron+coal+gold; seers has yew/maple.
    { name: 'catherby_fishing', x: 410, y: 504, type: 'gather', gatherSkill: 'fishing', tier: 35 },
    { name: 'catherby_mining', x: 428, y: 533, type: 'gather', gatherSkill: 'mining', tier: 30 },
    { name: 'seers_yews', x: 519, y: 472, type: 'gather', tier: 60 }, // yew/maple/oak/willow cluster

    // kandarin surface combat sites. chaos druids drop grimy herbs (165 + 435-443),
    // the reachable herblaw input; loot makes the combat brain pick them up.
    { name: 'kandarin_chaos_druids', x: 617, y: 553, type: 'combat', targetIds: [270], minCombat: 12, loot: [165, 435, 436, 437, 438, 439, 440, 441, 442, 443, 933] },
    { name: 'kandarin_bears', x: 521, y: 574, type: 'combat', targetIds: [188], minCombat: 20, loot: [502] }, // raw bear meat -> animal fat
    { name: 'seers_guard_dogs', x: 548, y: 470, type: 'combat', targetIds: [262], minCombat: 40 },
    // ardougne market: a gather site with no trees, so a bot parks here and the
    // thieving poller lifts from the stalls. non-thieves rotate away.
    { name: 'ardougne_market', x: 552, y: 595, type: 'gather' },

    // dungeon combat sites on plane 3 (y >= 944), reached on foot via stair edges.
    // npc ids/coords from rsc-data; a low->high progression as a bot grows.
    { name: 'dwarven_mine', x: 282, y: 3347, type: 'combat', targetIds: [94, 70], minCombat: 12 },
    { name: 'varrock_sewers', x: 216, y: 3274, type: 'combat', targetIds: [40, 41], minCombat: 15 },
    { name: 'edgeville_dungeon', x: 205, y: 3299, type: 'combat', targetIds: [270, 67], minCombat: 20 },
    { name: 'edgeville_giants', x: 206, y: 3326, type: 'combat', targetIds: [61, 99], minCombat: 30 },
    { name: 'earth_warriors', x: 206, y: 3212, type: 'combat', targetIds: [584], minCombat: 45 },
    { name: 'ice_dungeon', x: 415, y: 3274, type: 'combat', targetIds: [158, 263], minCombat: 50 },
    { name: 'ikov_skeletons', x: 551, y: 3284, type: 'combat', targetIds: [195], minCombat: 55 },
    { name: 'melzars_maze', x: 405, y: 3499, type: 'combat', targetIds: [22], minCombat: 70 }
];
