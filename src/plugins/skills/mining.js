// mining skill: rock/ore/gem/pickaxe data with real batch progression

const { rocks, pickaxes, gem } = require('@2003scape/rsc-data/skills/mining');
const items = require('@2003scape/rsc-data/config/items');
const { getBatchCount, wantBatching } = require('./batch');
const skillCapes = require('./skill-capes');
const enchantedCrowns = require('./enchanted-crowns');

const ROCK_IDS = new Set(Object.keys(rocks).map(Number));

// clay and soft clay ids
const CLAY_ORE_ID = 149;
const SOFT_CLAY_ID = 243;

// rock of dalgroth 1026: stage 9, mining 40 -> crystal 1154
const ROCK_OF_DALGROTH_ID = 1026;
// "Powering crystal4".
const POWERING_CRYSTAL4_ID = 1154;
// bronze pickaxe 156: think-bubble always shown on this rock
const BRONZE_PICKAXE_ID = 156;
const WATCHTOWER_ROCK_LEVEL = 40;

// pickaxes searched best to worst: rune, adamantite, mithril, steel, iron, bronze
const PICKAXE_IDS = Object.keys(pickaxes)
    .map(Number)
    .sort((a, b) => pickaxes[b].attempts - pickaxes[a].attempts);

// pickaxe roll bonus (batching only)
const AXE_BONUS_BY_ATTEMPTS = { 1: 0, 2: 1, 3: 2, 5: 4, 8: 8, 12: 16 };

function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function getDefinition(id) {
    const rock = rocks[id];

    if (typeof rock.reference !== 'undefined') {
        return getDefinition(rock.reference);
    }

    return rock;
}

// resolve respawn ms from a fixed number or a min/max range
function getRespawn(rock) {
    if (typeof rock.respawn === 'number') {
        return rock.respawn;
    }

    if (rock.respawn && typeof rock.respawn === 'object') {
        return random(rock.respawn.min, rock.respawn.max);
    }

    return 5400;
}

// best usable pickaxe: highest tier the player owns and can use, or -1
function getPickaxe(player) {
    const miningLevel = player.skills.mining.current;

    for (const id of PICKAXE_IDS) {
        if (player.inventory.has(id) && miningLevel >= pickaxes[id].level) {
            return id;
        }
    }

    return -1;
}

// semi-precious gem table for the 1/200 gem find on any rock
function getGem() {
    const rand = random(0, 100);

    if (rand < 10) {
        return 157; // uncut diamond
    } else if (rand < 30) {
        return 158; // uncut ruby
    } else if (rand < 60) {
        return 159; // uncut emerald
    }

    return 160; // uncut sapphire
}

// weighted gem table for gem rocks
function rollGemRock() {
    const total = gem.reduce((sum, g) => sum + g.weight, 0);
    let roll = random(0, total - 1);

    for (const g of gem) {
        if (roll < g.weight) {
            return g.id;
        }

        roll -= g.weight;
    }

    return gem[0].id;
}

// success threshold at a level for a [low,high] curve, /256
function rollSkillSuccessThreshold(low, high, level) {
    return (
        Math.floor((low * (99 - level)) / 98) +
        Math.floor((high * (level - 1)) / 98) +
        1
    );
}

function itemName(id) {
    const def = items[id];
    return def ? def.name.toLowerCase() : 'ore';
}

// still the same rock standing at its spot?
function rockStillThere(player, gameObject) {
    for (const obj of player.world.gameObjects.getAtPoint(
        gameObject.x,
        gameObject.y
    )) {
        if (obj.id === gameObject.id) {
            return obj;
        }
    }

    return null;
}

async function prospect(player, gameObject) {
    const rock = getDefinition(gameObject.id);
    const { world } = player;

    player.sendSound('prospect');
    player.message('@que@You examine the rock for ores...');

    await world.sleepTicks(3);

    if (!rock || typeof rock.ore === 'undefined') {
        player.message('@que@You fail to find anything interesting');
        return;
    }

    let oreID;

    if (Array.isArray(rock.ore)) {
        // gem rock: generic vein message
        player.message(
            '@que@This rock contains a vein of semi precious stones'
        );
        return;
    } else {
        oreID = rock.ore;
    }

    player.message(`@que@This rock contains ${itemName(oreID)}`);

    // tutorial island: prospecting the tutorial rock at stage 49 advances to 50
    if (gameObject.id === 496 && player.cache.tutorialStage === 49) {
        player.cache.tutorialStage = 50;
    }
}

async function mine(player, gameObject) {
    const { world } = player;
    const rock = getDefinition(gameObject.id);

    if (!rock) {
        return;
    }

    const pickaxeID = getPickaxe(player);

    if (pickaxeID === -1) {
        player.message('@que@You need a pickaxe to mine this rock');
        player.message(
            '@que@You do not have a pickaxe which you have the mining level ' +
                'to use'
        );
        return;
    }

    const miningLevel = player.skills.mining.current;

    if (miningLevel < rock.level) {
        player.message(
            `@que@You need a mining level of ${rock.level} to mine this rock`
        );
        return;
    }

    const axeBonus = wantBatching(player)
        ? AXE_BONUS_BY_ATTEMPTS[pickaxes[pickaxeID].attempts] || 0
        : 0;

    const repeat = getBatchCount(player, 'mining');

    // transient flag: player is mid a gathering batch
    player.gatheringSkill = true;
    try {
        for (let i = 0; i < repeat; i += 1) {
            const current = rockStillThere(player, gameObject);

            // node depleted -> stop the batch
            if (!current) {
                return;
            }

            player.sendSound('mine');
            player.sendBubble(pickaxeID);
            player.message('@que@You swing your pick at the rock...');

            await world.sleepTicks(3);

            if (player.isTired()) {
                player.message('@que@You are too tired to mine this rock');
                return;
            }

            const threshold =
                rollSkillSuccessThreshold(
                    ...(Array.isArray(rock.roll)
                        ? rock.roll
                        : [Math.max(1, 64 - rock.level), 200]),
                    miningLevel
                ) + axeBonus;

            const success = Math.floor(Math.random() * 257) <= threshold;

            if (!success) {
                player.message('@que@You only succeed in scratching the rock');
                continue;
            }

            // 1/200 chance to find a semi-precious gem instead of ore
            if (random(1, 200) <= 1) {
                player.sendSound('foundgem');
                const gemID = getGem();
                player.inventory.add(gemID);
                player.message(
                    `@que@You just found a ${itemName(gemID).replace(
                        'uncut ',
                        ''
                    )}!`
                );
                continue;
            }

            // award ore
            let oreID = rock.ore;

            if (Array.isArray(oreID)) {
                // gem-rock weighted table (id 588)
                oreID = rollGemRock();
            }

            const stillUp = rockStillThere(player, gameObject);

            if (!stillUp) {
                player.message('@que@You only succeed in scratching the rock');
                return;
            }

            // crown of dew (60%): mining clay softens it directly
            const dewSoftensClay =
                oreID === CLAY_ORE_ID &&
                enchantedCrowns.shouldActivate(player, 'dew');

            if (dewSoftensClay) {
                player.message(
                    'Your crown shines and the clay softens'
                );
            }

            // mining cape (8%): obtain two ore and double xp
            if (skillCapes.shouldActivate(player, 'mining')) {
                player.sendBubble(skillCapes.resolveCapeIds().mining);
                player.message(
                    `@que@You manage to obtain two ${itemName(oreID)}`
                );
                player.inventory.add(dewSoftensClay ? SOFT_CLAY_ID : oreID);
                // cape's second ore is always raw
                player.inventory.add(oreID);

                if (dewSoftensClay) {
                    enchantedCrowns.useCharge(player, 'dew');
                }

                if (rock.experience) {
                    player.addExperience('mining', rock.experience * 2);
                }
            } else {
                player.inventory.add(dewSoftensClay ? SOFT_CLAY_ID : oreID);

                if (dewSoftensClay) {
                    enchantedCrowns.useCharge(player, 'dew');
                }

                player.message(
                    `@que@You manage to obtain some ${itemName(oreID)}`
                );

                if (rock.experience) {
                    player.addExperience('mining', rock.experience);
                }

                // crown of the items (8%): an extra ore appears on the ground
                if (enchantedCrowns.shouldActivate(player, 'items')) {
                    player.message(
                        'Your crown shines and an extra item appears on ' +
                            'the ground'
                    );
                    world.addPlayerDrop(player, { id: oreID, amount: 1 });
                    enchantedCrowns.useCharge(player, 'items');
                }
            }

            // tutorial island: mining the tutorial rock at stage 51 advances to 52
            if (gameObject.id === 496 && player.cache.tutorialStage === 51) {
                player.cache.tutorialStage = 52;
            }

            // rock depletes on a successful pull
            if (typeof rock.depleted !== 'undefined') {
                const respawnMs = getRespawn(rock);
                const depleted = world.replaceEntity(
                    'gameObjects',
                    stillUp,
                    rock.depleted
                );

                world.setTimeout(() => {
                    const at = world.gameObjects.getAtPoint(
                        depleted.x,
                        depleted.y
                    )[0];

                    if (at === depleted) {
                        world.replaceEntity('gameObjects', depleted, gameObject.id);
                    }
                }, respawnMs);

                // rock consumed -> batch ends
                return;
            }
        }
    } finally {
        player.gatheringSkill = false;
    }
}

// mine rock of dalgroth: stage 9 + pickaxe + mining 40 -> crystal, one per player
async function mineRockOfDalgroth(player) {
    const stage = player.questStages.watchtower || 0;

    if (stage !== 9) {
        await player.say(
            "I can't touch it...",
            'Perhaps it is linked with the shaman some way ?'
        );
        return;
    }

    // no usable pickaxe
    if (getPickaxe(player) === -1) {
        player.message('@que@You need a pickaxe to mine the rock');
        return;
    }

    if (player.skills.mining.current < WATCHTOWER_ROCK_LEVEL) {
        player.message(
            '@que@You need a mining level of ' +
                `${WATCHTOWER_ROCK_LEVEL} to mine this crystal out`
        );
        return;
    }

    if (player.inventory.has(POWERING_CRYSTAL4_ID)) {
        await player.say(
            'I already have this crystal',
            'There is no benefit to getting another'
        );
        return;
    }

    player.sendSound('mine');
    player.sendBubble(BRONZE_PICKAXE_ID);
    player.message('You have a swing at the rock!');
    player.message('@que@You swing your pick at the rock...');
    player.message('A crack appears in the rock and you prize a crystal out');
    player.inventory.add(POWERING_CRYSTAL4_ID, 1);
}

// prospect: reports the rock holds a crystal
async function prospectRockOfDalgroth(player) {
    player.sendSound('prospect');
    player.message('@que@You examine the rock for ores...');
    player.message('@que@This rock contains a crystal!');
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id === ROCK_OF_DALGROTH_ID) {
        await mineRockOfDalgroth(player);
        return true;
    }

    if (!ROCK_IDS.has(gameObject.id)) {
        return false;
    }

    await mine(player, gameObject);
    return true;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id === ROCK_OF_DALGROTH_ID) {
        await prospectRockOfDalgroth(player);
        return true;
    }

    if (!ROCK_IDS.has(gameObject.id)) {
        return false;
    }

    await prospect(player, gameObject);
    return true;
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
