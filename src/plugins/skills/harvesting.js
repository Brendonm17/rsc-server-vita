
const {
    SKILL_NAME,
    ITEM,
    HARVEST_DEFS,
    HERB_DROP_TABLE,
    CLIP_PRODUCE,
    getDepletedObjectId,
    DEPLETED_DEFAULT
} = require('../../sp/custom-maps-data');

const items = require('@2003scape/rsc-data/config/items');
const skillCapes = require('./skill-capes');

// formulae

// random(low, high) inclusive, matching DataConversions.random.
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function getProduce(levelReq, skillLevel) {
    const roll = random(1, 128);

    if (skillLevel < levelReq) {
        return false;
    }

    const threshold = Math.min(
        127,
        Math.max(1, skillLevel + 0 + 40 - Math.floor(levelReq * 1.5))
    );

    return roll <= threshold;
}

// batch count keyed on base (max) stat
function getRepeatTimes(player) {
    const maxStat = player.skills[SKILL_NAME].base;

    if (maxStat <= 10) return 10;
    if (maxStat <= 19) return 12;
    if (maxStat <= 29) return 14;
    if (maxStat <= 39) return 16;
    if (maxStat <= 49) return 20;
    if (maxStat <= 59) return 24;
    if (maxStat <= 69) return 32;
    if (maxStat <= 79) return 40;
    if (maxStat <= 89) return 48;
    if (maxStat <= 95) return 56;
    if (maxStat <= 99) return 64;

    return 1000;
}

// weighted random herb pick, weights out of 128
function calculateHerbDrop() {
    const total = HERB_DROP_TABLE.reduce((sum, h) => sum + h.weight, 0);
    let r = random(0, total - 1);

    for (const h of HERB_DROP_TABLE) {
        if (r < h.weight) {
            return h;
        }

        r -= h.weight;
    }

    return HERB_DROP_TABLE[0];
}

// helpers

function hasItem(player, id) {
    return player.inventory.has(id);
}

function countItem(player, id) {
    let total = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            total += item.definition.stackable ? item.amount : 1;
        }
    }

    return total;
}

function itemName(id) {
    const def = items[id];
    return def ? def.name.toLowerCase() : 'produce';
}

function startsWithVowel(s) {
    return /^[aeiou]/i.test(s);
}

// tool for tree type: fruit picker or hand shovel, else nothing
function getTool(player, gameObject) {
    const name = gameObject.definition.name.toLowerCase();
    let expectedTool;

    if (
        name.includes('tree') ||
        name.includes('palm') ||
        name.includes('pineapple')
    ) {
        expectedTool = ITEM.FRUIT_PICKER;
    } else {
        expectedTool = ITEM.HAND_SHOVEL;
    }

    return hasItem(player, expectedTool) ? expectedTool : ITEM.NOTHING;
}

// is the object still standing at its spot
function objectStillThere(player, gameObject) {
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

// replaces a harvest node with its depleted form, then restores it
function depleteAndRespawn(player, gameObject, depletedId, respawnSeconds) {
    const { world } = player;

    const depleted = world.replaceEntity(
        'gameObjects',
        gameObject,
        depletedId
    );

    if (respawnSeconds > 0) {
        world.setTimeout(() => {
            // only restore if the depleted object is still the one placed
            const current = world.gameObjects.getAtPoint(
                depleted.x,
                depleted.y
            )[0];

            if (current === depleted) {
                world.replaceEntity('gameObjects', depleted, gameObject.id);
            }
        }, respawnSeconds * 1000);
    }
}

// watering (1/7) / soil (1/5) care event rolls

const CHANCE_ASK_WATERING = 7;
const CHANCE_ASK_SOIL = 5;

function updateUsesWateringCan(player) {
    const uses = player.cache.uses_wcan || 0;

    if (uses >= 4) {
        player.inventory.remove(ITEM.WATERING_CAN);
        player.inventory.add(ITEM.EMPTY_WATERING_CAN);
        delete player.cache.uses_wcan;
    } else {
        player.cache.uses_wcan = uses + 1;
    }
}

// watered/soiled marker valid for 3 minutes, tied to the tile
function careExpired(player, gameObject, key) {
    const tp = player._harvestCare && player._harvestCare[key];

    if (!tp) {
        return true;
    }

    return (
        Date.now() > tp.timestamp ||
        tp.x !== gameObject.x ||
        tp.y !== gameObject.y
    );
}

function checkCare(player, gameObject) {
    const expiry = Date.now() + 3 * 60000;

    if (random(1, CHANCE_ASK_WATERING) === 1) {
        if (!player._harvestCare || careExpired(player, gameObject, 'watered')) {
            if (!hasItem(player, ITEM.WATERING_CAN)) {
                return 'neglected';
            }

            player.message('@que@You water the harvesting spot');
            player._harvestCare = player._harvestCare || {};
            player._harvestCare.watered = {
                x: gameObject.x,
                y: gameObject.y,
                timestamp: expiry
            };
            updateUsesWateringCan(player);
        }

        return 'water';
    } else if (random(1, CHANCE_ASK_SOIL) === 1) {
        if (!player._harvestCare || careExpired(player, gameObject, 'soiled')) {
            if (!hasItem(player, ITEM.SOIL)) {
                return 'neglected';
            }

            player.message('@que@You add soil to the spot');
            player._harvestCare = player._harvestCare || {};
            player._harvestCare.soiled = {
                x: gameObject.x,
                y: gameObject.y,
                timestamp: expiry
            };
            player.inventory.remove(ITEM.SOIL);
            player.inventory.add(ITEM.BUCKET);
        }

        return 'soil';
    }

    return 'none';
}

// harvest: fruit trees / palms / bushes / allotment plants

async function handleHarvesting(player, gameObject) {
    const { world } = player;
    const def = HARVEST_DEFS[gameObject.id];

    if (!def) {
        return false;
    }

    const toolId = getTool(player, gameObject);
    const repeat = getRepeatTimes(player);

    for (let i = 0; i < repeat; i += 1) {
        const current = objectStillThere(player, gameObject);

        if (!current) {
            return true;
        }

        const evt = checkCare(player, current);

        if (toolId !== ITEM.NOTHING) {
            player.sendBubble(toolId);
        }

        player.message('@que@You attempt to get some produce...');
        await world.sleepTicks(3);

        if (player.isTired()) {
            player.message('@que@You are too tired to get produce');
            return true;
        }

        if (player.skills[SKILL_NAME].current < def.requiredLvl) {
            player.message(
                '@que@You need a harvesting level of ' +
                    def.requiredLvl +
                    ' to get produce from here'
            );
            return true;
        }

        const prodId = def.prodId;
        const name = itemName(prodId);

        if (toolId === ITEM.NOTHING && random(0, 1) === 1) {
            player.message(
                '@que@You accidentally damage the produce and throw it away'
            );
        } else if (evt === 'neglected') {
            player.message('@que@But the spot seems weak, you decide to wait');
        } else if (getProduce(def.requiredLvl, player.skills[SKILL_NAME].current)) {
            const obj = objectStillThere(player, gameObject);

            if (!obj) {
                player.message('@que@You fail to obtain some usable produce');
                return true;
            }

            player.inventory.add(prodId);

            // soil active -> small chance for an extra produce
            if (random(1, CHANCE_ASK_SOIL * 3) === 1 && evt === 'soil') {
                player.inventory.add(prodId);
            }

            player.message(
                '@que@You get ' +
                    (name.endsWith('s')
                        ? 'some '
                        : startsWithVowel(name)
                        ? 'an '
                        : 'a ') +
                    name
            );

            // harvesting cape: 20% chance of a second produce
            if (skillCapes.shouldActivate(player, 'harvesting')) {
                player.message(
                    '@or2@Your Harvesting cape activates, yielding a second ' +
                        name
                );
                player.inventory.add(prodId);
            }

            player.addExperience(SKILL_NAME, def.exp);

            // exhaust roll -> deplete + respawn (water active can prevent deplete)
            if (random(1, 100) <= def.exhaust) {
                const stillUp = objectStillThere(player, gameObject);

                if (stillUp) {
                    const preventDeplete =
                        random(1, CHANCE_ASK_WATERING * 3) === 1 &&
                        evt === 'water';

                    if (!preventDeplete && def.respawnTime > 0) {
                        depleteAndRespawn(
                            player,
                            stillUp,
                            getDepletedObjectId(prodId),
                            def.respawnTime
                        );
                    }
                }

                return true;
            }
        } else {
            player.message('@que@You fail to obtain some usable produce');
        }
    }

    return true;
}

// clip: herbs / snape grass / seaweed / limpwurt root

async function handleClipHarvesting(player, gameObject) {
    const { world } = player;
    const objId = gameObject.id;
    const name = gameObject.definition.name.toLowerCase();
    const isHerb = name.includes('herb');
    const clipDef = CLIP_PRODUCE[objId];

    // herb has no level req, gated on drop roll only
    const reqLevel = !isHerb && clipDef ? clipDef.level : 1;

    if (!isHerb && player.skills[SKILL_NAME].current < reqLevel) {
        player.message(
            '@que@You need at least level ' +
                reqLevel +
                ' harvesting to clip from the ' +
                name
        );
        return true;
    }

    if (countItem(player, ITEM.HERB_CLIPPERS) <= 0) {
        player.message(
            '@que@You need some ' +
                itemName(ITEM.HERB_CLIPPERS) +
                ' to clip from this havesting spot'
        );
        return true;
    }

    const repeat = getRepeatTimes(player);

    for (let i = 0; i < repeat; i += 1) {
        const current = objectStillThere(player, gameObject);

        if (!current) {
            return true;
        }

        player.sendBubble(ITEM.HERB_CLIPPERS);
        player.message('@que@You attempt to clip from the spot...');
        await world.sleepTicks(3);

        if (player.isTired()) {
            player.message('@que@You are too tired to get produce');
            return true;
        }

        // herb uses weighted drop, seaweed 1/4 edible, else fixed produce
        let prod;
        let prodId;

        if (isHerb) {
            prod = calculateHerbDrop();
            prodId = prod.itemId;
        } else if (
            name.includes('sea weed') &&
            random(1, 4) === 1
        ) {
            prodId = clipDef.edibleItemId;
            prod = { xp: clipDef.xp, level: clipDef.level };
        } else {
            prodId = clipDef.itemId;
            prod = { xp: clipDef.xp, level: clipDef.level };
        }

        if (!isHerb && player.skills[SKILL_NAME].current < clipDef.level) {
            player.message(
                '@que@You need at least level ' +
                    clipDef.level +
                    ' harvesting to clip from the ' +
                    name
            );
            return true;
        }

        if (getProduce(prod.level, player.skills[SKILL_NAME].current)) {
            const obj = objectStillThere(player, gameObject);

            if (!obj) {
                player.message('@que@You fail to clip the plant');
                return true;
            }

            player.inventory.add(prodId);

            const shortName = name.includes(' ')
                ? name.slice(name.lastIndexOf(' ') + 1)
                : 'produce';

            player.message(
                '@que@You get ' + (isHerb ? 'a herb' : 'some ' + shortName)
            );

            // harvesting cape: 20% chance of double produce
            if (skillCapes.shouldActivate(player, 'harvesting')) {
                player.message(
                    '@or2@Your Harvesting cape activates, yielding double ' +
                        'produce'
                );
                player.inventory.add(prodId);
            }

            player.addExperience(SKILL_NAME, prod.xp);

            // clip exhaust: 20% non-herb, 10% herb, respawns in 60-240s
            if (random(1, 100) <= (isHerb ? 10 : 20)) {
                const stillUp = objectStillThere(player, gameObject);

                if (stillUp) {
                    depleteAndRespawn(
                        player,
                        stillUp,
                        DEPLETED_DEFAULT,
                        random(60, 240)
                    );
                }

                return true;
            }
        } else {
            player.message('@que@You fail to clip the plant');
        }
    }

    return true;
}

// dispatches on command name: harvest, clip, or collect

async function onGameObjectCommand(player, gameObject, commandIndex) {
    const command = (
        gameObject.definition.commands[commandIndex] || ''
    ).toLowerCase();

    if (command === 'harvest') {
        // guards against plain harvest objects without a def
        if (!HARVEST_DEFS[gameObject.id]) {
            return false;
        }

        return await handleHarvesting(player, gameObject);
    }

    if (command === 'clip') {
        return await handleClipHarvesting(player, gameObject);
    }

    return false;
}

async function onGameObjectCommandOne(player, gameObject) {
    return await onGameObjectCommand(player, gameObject, 0);
}

async function onGameObjectCommandTwo(player, gameObject) {
    return await onGameObjectCommand(player, gameObject, 1);
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
