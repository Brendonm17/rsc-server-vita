// ironman modes and character classes, resolved by item/npc name

const items = require('@2003scape/rsc-data/config/items');
const skillNames = require('@2003scape/rsc-data/skill-names');

// ironman modes: None, Ironman, Ultimate, Hardcore, Transfer
const IronmanMode = {
    None: 0,
    Ironman: 1,
    Ultimate: 2,
    Hardcore: 3,
    Transfer: 4
};

// classes: adventurer, warrior, wizard, necromancer, ranger, miner
const Classes = {
    ADVENTURER: 0,
    WARRIOR: 1,
    WIZARD: 2,
    NECROMANCER: 3,
    RANGER: 4,
    MINER: 5
};

// skill id index: attack=0 ... magic=6 ... mining=14
const Skill = {
    ATTACK: skillNames.indexOf('attack'),
    DEFENSE: skillNames.indexOf('defense'),
    STRENGTH: skillNames.indexOf('strength'),
    HITS: skillNames.indexOf('hits'),
    RANGED: skillNames.indexOf('ranged'),
    PRAYER: skillNames.indexOf('prayer'),
    MAGIC: skillNames.indexOf('magic'),
    MINING: skillNames.indexOf('mining')
};

// resolve an item id by lowercased name against the item table
function itemIdByName(name) {
    const wanted = name.toLowerCase();

    for (let id = 0; id < items.length; id += 1) {
        const def = items[id];

        if (def && def.name && def.name.toLowerCase() === wanted) {
            return id;
        }
    }

    throw new RangeError(`game-modes: could not resolve item "${name}"`);
}

// item id constants for class starting kits
const ItemId = {
    TINDERBOX: itemIdByName('Tinderbox'),
    BRONZE_AXE: itemIdByName('Bronze axe'),
    JUG: itemIdByName('Jug'),
    POT: itemIdByName('Pot'),
    BRONZE_SHORT_SWORD: itemIdByName('Bronze short sword'),
    WOODEN_SHIELD: itemIdByName('Wooden shield'),
    // blue wizard hat (185) and black wizard hat (199)
    BLUE_WIZARDSHAT: 185,
    BLACK_WIZARDSHAT: 199,
    STAFF: itemIdByName('staff'),
    SHORTBOW: itemIdByName('Shortbow'),
    BRONZE_ARROWS: itemIdByName('Bronze arrows'),
    BRONZE_PICKAXE: itemIdByName('Bronze pickaxe')
};

// set starting level directly, independent of starting xp
const PLAYER_CLASSES = {
    [Classes.ADVENTURER]: {
        // starting kit: tinderbox, bronze axe, empty jug, pot
        skills: [
            [Skill.ATTACK, 400, 2],
            [Skill.STRENGTH, 400, 2],
            [Skill.DEFENSE, 400, 2],
            [Skill.RANGED, 400, 2],
            [Skill.PRAYER, 400, 2],
            [Skill.MAGIC, 400, 2],
            [Skill.HITS, 4000, 11]
        ],
        items: [
            { id: ItemId.TINDERBOX, amount: 1 },
            { id: ItemId.BRONZE_AXE, amount: 1 },
            { id: ItemId.JUG, amount: 1 },
            { id: ItemId.POT, amount: 1 }
        ]
    },
    [Classes.WARRIOR]: {
        // starting kit: bronze short sword, wooden shield
        skills: [
            [Skill.ATTACK, 800, 3],
            [Skill.STRENGTH, 800, 3],
            [Skill.DEFENSE, 800, 3],
            [Skill.HITS, 4400, 12]
        ],
        items: [
            { id: ItemId.BRONZE_SHORT_SWORD, amount: 1 },
            { id: ItemId.WOODEN_SHIELD, amount: 1 }
        ]
    },
    [Classes.WIZARD]: {
        // starting kit: blue wizard hat, regular staff
        skills: [
            [Skill.MAGIC, 2400, 7],
            [Skill.HITS, 3600, 10]
        ],
        items: [
            { id: ItemId.BLUE_WIZARDSHAT, amount: 1 },
            { id: ItemId.STAFF, amount: 1 }
        ]
    },
    [Classes.NECROMANCER]: {
        // starting kit: black wizard hat, regular staff
        skills: [
            [Skill.MAGIC, 2400, 7],
            [Skill.HITS, 3600, 10]
        ],
        items: [
            { id: ItemId.BLACK_WIZARDSHAT, amount: 1 },
            { id: ItemId.STAFF, amount: 1 }
        ]
    },
    [Classes.RANGER]: {
        // starting kit: shortbow, 10 bronze arrows
        skills: [
            [Skill.RANGED, 2000, 6],
            [Skill.HITS, 4400, 12]
        ],
        items: [
            { id: ItemId.SHORTBOW, amount: 1 },
            { id: ItemId.BRONZE_ARROWS, amount: 10 }
        ]
    },
    [Classes.MINER]: {
        // starting kit: bronze pickaxe
        skills: [
            [Skill.MINING, 2400, 7],
            [Skill.HITS, 3600, 10]
        ],
        items: [{ id: ItemId.BRONZE_PICKAXE, amount: 1 }]
    }
};

module.exports = { IronmanMode, Classes, Skill, ItemId, PLAYER_CLASSES };
