// strange barrels: smashing 1178 removes it and rolls action = random(0,4)
//   action 1-4 (4/5): spawn monster / item / both / explode (bubble + 0-14 dmg); barrel respawns 40s later
//   action 0 (1/5): nested roll, either respawn with no reward or fail; fail may cut attack 1-3

const NPC = require('../../model/npc');
const GameObject = require('../../model/game-object');

const STRANGE_BARREL_ID = 1178;
const BARREL_RESPAWN_MS = 40000;
const MONSTER_LIFETIME_MS = 60000 * 3;

const RESPAWN_X_MIN = 467;
const RESPAWN_X_MAX = 476;
const RESPAWN_Y_MIN = 3699;
const RESPAWN_Y_MAX = 3714;

// FOOD (8)
const FOOD = [
    138, // Bread
    179, // Spinach Roll
    335, // Slice Of Cake
    261, // Half A Meat Pie
    319, // Cheese
    262, // Half A Redberry Pie
    263, // Half An Apple Pie
    861 // Fresh Pineapple
];

// POTION - 1 dose variants (4)
const POTION = [
    482, // 1-dose defense Potion
    224, // 1-dose Strength Potion
    485, // 1-dose restore prayer Potion
    476 // 1-dose attack Potion
];

// OTHER (14)
const OTHER = [
    237, // Rope
    986, // Rocks
    988, // Ship Ticket
    816, // (Unidentified) Snake Weed, no distinct unidentified item exists
    10, // Coins
    676, // Bow String
    156, // Bronze Pickaxe
    549, // Casket
    172, // Gold Bar
    14, // Logs
    987, // Paramaya Rest Ticket
    1259, // Steel Pickaxe
    166, // Tinderbox
    774 // Lit Torch
];

// WEAPON (11)
const WEAPON = [
    1013, // Bronze Throwing Dart
    1076, // Bronze Throwing Knife
    1080, // Rune Throwing Knife
    1078, // Mithril Throwing Knife
    1024, // Steel Throwing Dart
    1015, // Iron Throwing Dart
    1068, // Mithril Throwing Dart
    1075, // Iron Throwing Knife
    1077, // Steel Throwing Knife
    1079, // Adamantite Throwing Knife
    1069 // Adamantite Throwing Dart
];

// RUNES (4)
const RUNES = [
    34, // Earth rune
    32, // Water rune
    33, // Air rune
    31 // Fire rune
];

// CERTIFICATE (9)
const CERTIFICATE = [
    518, // Coal Certificate
    519, // Mithril Ore Certificate
    629, // Raw Bass Certificate
    534, // Raw Lobster Certificate
    535, // Swordfish Certificate
    631, // Raw Shark Certificate
    630, // Shark Certificate
    713, // Willow Logs Certificate
    711 // Yew Logs Certificate
];

// MONSTER (19): ids resolved by name + matching combat level where more than one npc shares a name
const MONSTER = [
    190, // Chaos Dwarf
    199, // Dark Warrior
    57, // Dark Wizard (lvl13)
    99, // Deadly Red Spider
    768, // Death Wing
    61, // Giant
    43, // Giant Bat
    21, // Mugger
    23, // Giant Spider (lvl8)
    41, // Zombie (lvl24)
    46, // Skeleton (lvl25)
    40, // Skeleton (lvl21)
    47, // Rat (lvl13)
    67, // Hobgoblin (lvl32)
    104, // Moss Giant
    66, // Black Knight
    45, // Skeleton (lvl31)
    19, // Rat (lvl8)
    70 // Scorpion (lvl19-21)
];

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function respawnBarrel(world, originalX, originalY, direction) {
    const newX = randomInt(RESPAWN_X_MIN, RESPAWN_X_MAX);
    const newY = randomInt(RESPAWN_Y_MIN, RESPAWN_Y_MAX);

    const occupied = world.gameObjects.getAtPoint(newX, newY).length > 0;

    const barrel = new GameObject(world, {
        id: STRANGE_BARREL_ID,
        x: occupied ? originalX : newX,
        y: occupied ? originalY : newY,
        direction
    });

    world.addEntity('gameObjects', barrel);
}

function spawnMonster(world, player, x, y) {
    const monsterId = MONSTER[Math.floor(Math.random() * MONSTER.length)];

    const npc = new NPC(world, {
        id: monsterId,
        x,
        y,
        minX: x,
        maxX: x,
        minY: y,
        maxY: y
    });

    delete npc.respawn;

    world.addEntity('npcs', npc);

    world.setTimeout(() => {
        // re-check npc identity before removeEntity, which throws on a double-remove
        if (world.npcs.entities[npc.index] === npc) {
            world.removeEntity('npcs', npc);
        }
    }, MONSTER_LIFETIME_MS);

    npc.attack(player).catch(() => {});
}

function spawnItem(world, player, x, y) {
    const randomizeReward = randomInt(0, 100);

    let table;

    if (randomizeReward <= 14) {
        table = FOOD;
    } else if (randomizeReward <= 29) {
        table = POTION;
    } else if (randomizeReward <= 44) {
        table = RUNES;
    } else if (randomizeReward <= 59) {
        table = CERTIFICATE;
    } else if (randomizeReward <= 89) {
        table = OTHER;
    } else {
        table = WEAPON;
    }

    const selectedItem = table[Math.floor(Math.random() * table.length)];

    if (selectedItem === 10) {
        world.addPlayerDrop(player, { id: selectedItem, amount: 100 }, x, y);
    } else {
        world.addPlayerDrop(player, { id: selectedItem, amount: 1 }, x, y);
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== STRANGE_BARREL_ID) {
        return false;
    }

    const { world } = player;
    const { x, y, direction } = gameObject;

    const action = randomInt(0, 4);

    if (action !== 0) {
        player.message('You smash the barrel open.');
        world.removeEntity('gameObjects', gameObject);

        world.setTimeout(() => {
            respawnBarrel(world, x, y, direction);
        }, BARREL_RESPAWN_MS);

        if (action === 1) {
            spawnMonster(world, player, x, y);
        } else if (action === 2) {
            spawnItem(world, player, x, y);
        } else if (action === 3) {
            spawnItem(world, player, x, y);
            spawnMonster(world, player, x, y);
        } else if (action === 4) {
            player.message('The barrel explodes...');
            player.message('...you take some damage...');
            // visual bubble only, no movement
            player.sendTeleportBubble(x, y, 'telegrab');
            player.damage(randomInt(0, 14));
        }

        return true;
    }

    // action == 0 (1/5 chance): nested roll.
    if (randomInt(0, 1) !== 1) {
        player.message('You smash the barrel open.');
        world.removeEntity('gameObjects', gameObject);

        world.setTimeout(() => {
            const barrel = new GameObject(world, {
                id: STRANGE_BARREL_ID,
                x,
                y,
                direction
            });
            world.addEntity('gameObjects', barrel);
        }, BARREL_RESPAWN_MS);

        return true;
    }

    // inner roll: fail message, optionally with an Attack-level reduction.
    if (randomInt(0, 1) !== 0) {
        player.message('You were unable to smash this barrel open.');
        await world.sleepTicks(1);
        player.message('@que@You hit the barrel at the wrong angle.');
        await world.sleepTicks(2);
        player.message(
            '@que@You\'re heavily jarred from the vibrations of the blow.'
        );
        await world.sleepTicks(2);

        const reduceAttack = randomInt(1, 3);
        player.message(`Your attack is reduced by ${reduceAttack}.`);
        player.skills.attack.current = Math.max(
            0,
            player.skills.attack.current - reduceAttack
        );
        player.sendStats();
    } else {
        player.message('You were unable to smash this barrel open.');
    }

    return true;
}

module.exports = { onGameObjectCommandOne };
