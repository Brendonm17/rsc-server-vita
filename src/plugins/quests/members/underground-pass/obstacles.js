// underground pass (members): the dungeon-crawl obstacle course covering the
// first cave, dwarf cavern, black area, orb-of-light region, and tile-grill
// puzzle. the seven read-rock lore texts are left unregistered (their type-id
// collides with mining rocks and carries no per-tile data).

const { questsEnabled } = require('../../custom-gate.js');
const koftik = require('./koftik.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

const GAME_TICK = 640;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

function hitsDamage(player, div, add) {
    return Math.floor(player.skills.hits.current / div) + add;
}

// random int, inclusive both ends
function randomInt(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// legacy production success roll
function calcProductionSuccessfulLegacy(
    levelReq,
    skillLevel,
    stopsFailing,
    levelStopFail,
    minFailChance = 1
) {
    const roll = randomInt(1, 256);
    if (skillLevel < levelReq) {
        return false;
    }
    const maxThreshold = stopsFailing ? 256 : 256 - minFailChance;
    const threshold = Math.min(
        maxThreshold,
        Math.floor(64 + (skillLevel - 1) * (19200.0 / (levelStopFail * 98)))
    );
    return roll <= threshold;
}

// agility success roll, req 1 by default
function agilitySucceed(player, req = 1) {
    return calcProductionSuccessfulLegacy(
        req,
        player.skills.agility.current,
        false,
        req + 70
    );
}

// thieving disarm roll for the spear-rock trip-wire; a level below the
// requirement always succeeds
function thievingDisarmSucceed(player, req) {
    let levelDifference = player.skills.thieving.current - req;
    const percent = randomInt(1, 100);
    if (levelDifference < 0) {
        return true;
    }
    if (levelDifference >= 15) {
        levelDifference = 70;
    }
    if (levelDifference >= 20) {
        levelDifference = 80;
    } else {
        levelDifference = 40 + levelDifference;
    }
    return percent <= levelDifference;
}

// one-shot random ambient "voices" message fired some ticks after crossing
// certain obstacles; 1/6 chance of no message
const AMBIENT_MESSAGES = [
    "@red@iban will save you....he'll save us all",
    '@red@join us...join us...embrace the mysery',
    "@red@I see you adventurer...you can't hide",
    '@red@Come taste the pleasure of evil',
    '@red@Death is only the beginning'
];
function scheduleUndergroundPassMessage(player, ticks) {
    const { world } = player;
    world.setTimeout(() => {
        if (!player.loggedIn) {
            return;
        }
        const stage = getStage(player);
        const random = Math.floor(Math.random() * 6);
        if (random === 0) {
            player.message(AMBIENT_MESSAGES[0]);
        } else if (random === 1) {
            player.message(AMBIENT_MESSAGES[1]);
        } else if (random === 2 && stage >= 4) {
            player.message(AMBIENT_MESSAGES[2]);
        } else if (random === 3 && stage >= 4) {
            player.message(AMBIENT_MESSAGES[3]);
        } else if (random === 4 && stage >= 4) {
            player.message(AMBIENT_MESSAGES[4]);
        }
        // random 5 or a stage-gated miss: no message
    }, ticks * GAME_TICK);
}

// climb a ledge and drop down the other side; object 753 drops 2 tiles, else 1
async function doLedge(obj, player, damage) {
    player.message('you climb the ledge');
    const failLedge = !agilitySucceed(player, 1);
    if (obj && !failLedge) {
        const d = obj.direction;
        if (d === 2 || d === 6) {
            if (obj.x === player.x - 1 && obj.y === player.y) {
                player.message('and drop down to the cave floor');
                player.teleport(obj.id === 753 ? obj.x - 2 : obj.x - 1, obj.y);
            } else if (obj.x === player.x + 1 && obj.y === player.y) {
                player.message('and drop down to the cave floor');
                player.teleport(obj.id === 753 ? obj.x + 2 : obj.x + 1, obj.y);
            }
        }
        if (d === 4 || d === 0) {
            if (obj.x === player.x && obj.y === player.y + 1) {
                player.teleport(obj.x, obj.y + 1);
                player.message('and drop down to the cave floor');
            } else if (obj.x === player.x && obj.y === player.y - 1) {
                player.teleport(obj.x, obj.y - 1);
            }
        }
    } else {
        player.message('but you slip');
        player.damage(damage);
        await player.say('aargh');
    }
}

// climb onto a rock and step down; on fail teleport to spike pit spikeLocation
// (1-5), or stay put if -1
async function doRock(obj, player, damage, eventMessage, spikeLocation) {
    player.message('you climb onto the rock');
    const failRock = !agilitySucceed(player, 1);
    if (obj && !failRock) {
        const d = obj.direction;
        if (d === 1 || d === 2 || d === 4 || d === 3) {
            if (obj.x === player.x - 1 && obj.y === player.y) {
                player.teleport(obj.x - 1, obj.y);
            } else if (obj.x === player.x + 1 && obj.y === player.y) {
                player.teleport(obj.x + 1, obj.y);
            } else if (obj.x === player.x && obj.y === player.y + 1) {
                player.teleport(obj.id === 749 ? obj.x : obj.x + 1, obj.id === 749 ? obj.y + 1 : obj.y);
            } else if (obj.x === player.x && obj.y === player.y - 1) {
                player.teleport(obj.id === 749 ? obj.x : obj.x + 1, obj.id === 749 ? obj.y - 1 : obj.y);
            }
        }
        if (d === 6) {
            if (obj.x === player.x && obj.y === player.y + 1) {
                player.teleport(obj.x, obj.y + 1);
            } else if (obj.x === player.x && obj.y === player.y - 1) {
                player.teleport(obj.x, obj.y - 1);
            } else if (obj.x === player.x - 1 && obj.y === player.y) {
                player.teleport(obj.x + 1, obj.y + 1);
            } else if (obj.x === player.x + 1 && obj.y === player.y) {
                player.teleport(obj.x, obj.y + 1);
            }
        }
        if (d === 0) {
            if (obj.x === player.x - 1 && obj.y === player.y) {
                player.teleport(obj.x - 1, obj.y);
            } else if (obj.x === player.x + 1 && obj.y === player.y) {
                player.teleport(obj.x + 1, obj.y);
            } else if (obj.x === player.x && obj.y === player.y + 1) {
                player.teleport(obj.x, obj.y + 1);
            } else if (obj.x === player.x && obj.y === player.y - 1) {
                player.teleport(obj.x, obj.y - 1);
            }
        }
        if (d === 7) {
            if (obj.x === player.x - 1 && obj.y === player.y) {
                player.teleport(obj.x - 1, obj.y - 1);
            } else if (obj.x === player.x + 1 && obj.y === player.y) {
                player.teleport(obj.x + 1, obj.y);
            } else if (obj.x === player.x && obj.y === player.y + 1) {
                player.teleport(obj.x, obj.y + 1);
            } else if (obj.x === player.x && obj.y === player.y - 1) {
                player.teleport(obj.x + 1, obj.y);
            }
        }
        player.message('and step down the other side');
    } else {
        player.message('but you slip');
        player.damage(damage);
        if (spikeLocation === 1) {
            player.teleport(743, 3475);
        } else if (spikeLocation === 2) {
            player.teleport(748, 3482);
        } else if (spikeLocation === 3) {
            player.teleport(738, 3483);
        } else if (spikeLocation === 4) {
            player.teleport(736, 3475);
        } else if (spikeLocation === 5) {
            player.teleport(730, 3478);
        }
        await player.say('aargh');
    }
    if (eventMessage) {
        scheduleUndergroundPassMessage(player, randomInt(3, 15));
    }
}

// read-rock ids -> scripture text; kept for reference, not registered
const READ_ROCK_TEXT = {
    832:
        '@red@All those who thirst for knowledge. Bow down to the lord. ' +
        'All you that crave eternal life, Come and meet your God. ' +
        'For no man nor beast can cast a spell, Against the wake of eternal hell.',
    833:
        '@red@Most men do live in fear of death, That it might steal their soul. ' +
        'Some work and pray to shield their life, From the ravages of the cold. ' +
        'But only those who embrace the end, Can truly make their life extend. ' +
        'And when all hope begins to fade, look above and use nature as your aid',
    834:
        '@red@And now our God has given us, One who is from our own. ' +
        'A saviour who once sat upon, His father\'s glorious thrown. ' +
        'It is in your name that we will lead the attack Iban, son of Zamorak!',
    835:
        '@red@Here lies the sacred font, Where the great Iban will bless all his ' +
        'disciples in the name of evil. Here the forces of darkness are so ' +
        'concentrated they rise when they detect any positive force close by',
    923:
        '@red@Ibans Shadow. Then came the hard part: recreating the parts of a man ' +
        'that cannot be seen or touched: those intangible things that are life ' +
        'itself. Using all the mystical force that I could muster, I performed the ' +
        'ancient ritual of Incantia, a spell so powerful that it nearly stole the ' +
        'life from my frail and withered body. Opening my eyes again, I saw the ' +
        'three demons that had been summoned. Standing in a triangle, their energy ' +
        'was focused on the doll. These demons would be the keepers of Iban\'s ' +
        'shadow. Black as night, their shared spirit would follow his undead body ' +
        'like an angel of death.',
    922:
        '@red@Crumbling some of the dove\'s bones onto the doll, I cast my mind\'s ' +
        'eye onto Iban\'s body. My ritual was complete, soon he would be coming to ' +
        'life. I, Kardia, had resurrected the legendary Iban, the most powerful ' +
        'evil being ever to take human form. And I alone knew that the same process ' +
        'that I had used to create him, was also capable of destroying him. But now ' +
        'I was exhausted. As I closed my eyes to sleep, I was settled by a strange ' +
        'feeling of contentment anticipation of the evil that Iban would soon ' +
        'unleash.',
    881:
        '@red@Leave this battered corpse be. For now he lives as spirit alone. Let ' +
        'his flesh rest and become one with the earth. As it is the soil that shall ' +
        'rise to protect him. Only as flesh becomes dust, as wood becomes ash... ' +
        '..will Iban\'s corpse embrace nature and finally rest'
};
void READ_ROCK_TEXT;

// the player slips into the darkness at the given fall coordinate; at stage 4
// via NORTH_STONE_STEP/FIRST_REMAINING_BRIDGE this advances the quest to stage 5
const FALL_LOCATIONS = {
    [IDS.NORTH_STONE_STEP]: [738, 584],
    [IDS.FIRST_REMAINING_BRIDGE]: [738, 584],
    898: [756, 591],
    893: [753, 608],
    892: [734, 596],
    896: [734, 610],
    910: [734, 662],
    907: [733, 646],
    906: [731, 639],
    905: [742, 630],
    904: [742, 630],
    908: [760, 638],
    909: [745, 656],
    902: [759, 664],
    903: [761, 613],
    901: [727, 617],
    895: [727, 618],
    899: [734, 619],
    900: [734, 666],
    894: [763, 613],
    897: [753, 585]
};

async function failBlackAreaObstacle(player, objId) {
    const [x, y] = FALL_LOCATIONS[objId] || [738, 584];
    player.message('..but you slip and tumble into the darkness');
    player.teleport(x, y);
    player.damage(hitsDamage(player, 5, 5)); // 6 lowest, 25 max
    await player.say('ouch!');

    const stage = getStage(player);
    if (stage >= 4) {
        if (stage === 4) {
            player.questStages[QUEST_KEY] = 5;
        }
        // only on "first-time" fail near the recovered Koftik (stages 5, 8)
        const recoveredKoftik = player.getNearbyEntitiesByID(
            'npcs',
            IDS.KOFTIK_RECOVERED,
            10
        )[0];
        if (recoveredKoftik && !player.cache.advised_koftik) {
            // npc.say() needs an interlocutor, so engage before this exchange
            player.engage(recoveredKoftik);
            await recoveredKoftik.say('traveller is that you?.. my friend on a mission');
            await player.say("koftik, you're still here, you should leave");
            await recoveredKoftik.say(
                'leave?...leave?..this is my home now',
                "home with my lord, he talks to me, he's my friend"
            );
            player.message('koftik seems to be in a weak state of mind');
            await player.say('koftik you really should leave these caverns');
            await recoveredKoftik.say(
                "not now, we're all the same down here",
                "now there's just you and those dwarfs to be converted"
            );
            await player.say('dwarfs?');
            await recoveredKoftik.say(
                'foolish dwarfs, still believing that they can resist',
                'no one resists iban, go traveller',
                "the dwarfs to the south, they're not safe in the south",
                "we'll show them, go slay them m'lord",
                "he'll be so proud, that's all i want"
            );
            await player.say("i'll pray for you");
            player.disengage();
            player.cache.advised_koftik = true;
        }
    }
}

// west passage cascading trap: damage the player, then either revert obj to
// 773 or spawn a fresh 773 marker plus an objectID rock one tile east
async function damageOfTrap(player, obj, newSpec, objectID) {
    const { world } = player;
    const GameObject = require('../../../../model/game-object');
    player.damage(hitsDamage(player, 16, 2));
    if (!newSpec) {
        const reverted = world.replaceEntity('gameObjects', obj, 773);
        world.setTimeout(() => {
            if (reverted.world) {
                world.replaceEntity('gameObjects', reverted, obj.id);
            }
        }, 3000);
        await player.say('aaarrghhh');
    } else {
        const marker = new GameObject(world, {
            id: 773,
            x: newSpec[0],
            y: newSpec[1],
            direction: 2
        });
        world.addEntity('gameObjects', marker);
        await player.say('aaarrghhh');
        const revived = new GameObject(world, {
            id: objectID,
            x: player.x + 1,
            y: player.y,
            direction: 2
        });
        world.addEntity('gameObjects', revived);
    }
}

async function firstFallbackTrap(player, obj) {
    const { world } = player;
    await world.sleepTicks(3);
    player.message('you hear a strange mechanical sound');
    await damageOfTrap(player, obj, [736, 3446], 819);
    await world.sleepTicks(3);
    player.message("You've triggered a trap");
}

async function fallBack(player, obj) {
    const { world } = player;
    const west = IDS.WEST_PASSAGE;
    if (obj.id === west[0]) {
        await world.sleepTicks(1);
        player.message('you hear a strange mechanical sound');
        player.teleport(735, 3446);
        await damageOfTrap(player, obj, null, -1);
        await world.sleepTicks(3);
        player.message("You've triggered a trap");
    } else if (obj.id === west[1]) {
        await damageOfTrap(player, obj, null, -1);
        player.teleport(735, 3446);
        await firstFallbackTrap(player, obj);
    } else if (obj.id === west[2]) {
        await damageOfTrap(player, obj, null, -1);
        player.teleport(738, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [739, 3446], 820);
        player.teleport(735, 3446);
        await firstFallbackTrap(player, obj);
    } else if (obj.id === west[3]) {
        await damageOfTrap(player, obj, null, -1);
        player.teleport(741, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [742, 3446], 821);
        player.teleport(738, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [739, 3446], 820);
        player.teleport(735, 3446);
        await firstFallbackTrap(player, obj);
    } else if (obj.id === west[4]) {
        await damageOfTrap(player, obj, null, -1);
        player.teleport(744, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [745, 3446], 822);
        player.teleport(741, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [742, 3446], 821);
        player.teleport(738, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [739, 3446], 820);
        player.teleport(735, 3446);
        await firstFallbackTrap(player, obj);
    } else if (obj.id === west[5]) {
        await damageOfTrap(player, obj, null, -1);
        player.teleport(747, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [748, 3446], 823);
        player.teleport(744, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [745, 3446], 822);
        player.teleport(741, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [742, 3446], 821);
        player.teleport(738, 3446);
        await world.sleepTicks(3);
        await damageOfTrap(player, obj, [739, 3446], 820);
        player.teleport(735, 3446);
        await firstFallbackTrap(player, obj);
    }
}

// COMMAND ONE

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const id = gameObject.id;
    const stage = getStage(player);

    // Cave entrance
    if (id === IDS.UNDERGROUND_CAVE) {
        switch (stage) {
            case 0:
                if (player.questStages.biohazard !== -1) {
                    player.message('You must first complete the biohazard quest...');
                    player.message('...before you can enter');
                } else {
                    player.message(
                        'you must talk to king lathas before you can enter'
                    );
                }
                break;
            case 1: {
                const koftikNpc = player.getNearbyEntitiesByID(
                    'npcs',
                    IDS.KOFTIK_ARDOUGNE,
                    10
                )[0];
                if (koftikNpc) {
                    player.engage(koftikNpc);
                    await koftik.koftikEnterCaveDialogue(player, koftikNpc);
                    player.disengage();
                }
                break;
            }
            default:
                player.message('@que@you cautiously enter the cave');
                await world.sleepTicks(3);
                player.teleport(673, 3420);
                break;
        }
        return true;
    }

    // Crumbled rock -> descend
    if (id === IDS.CRUMBLED_ROCK) {
        player.message('@que@you climb the rock pile');
        await world.sleepTicks(3);
        player.teleport(713, 581);
        return true;
    }

    // Pile of mud (floor, DungeonFloor 890) -> old stairway
    if (id === IDS.PILE_OF_MUD_FLOOR) {
        player.message('@que@you climb the pile of mud');
        await world.sleepTicks(3);
        player.message('it leads to an old stair way');
        player.teleport(773, 3417);
        return true;
    }

    // Ladder -> stairs up
    if (id === IDS.LADDER) {
        player.message('@que@you climb the ladder');
        await world.sleepTicks(3);
        player.message('it leads to some stairs, you walk up...');
        player.teleport(782, 3549);
        return true;
    }

    // === UndergroundPassAgilityObstacles.java (black area) ===================

    // Ledges (862/864/863/872/865/866)
    if (IDS.LEDGES.includes(id)) {
        player.message('you climb the ledge');
        if (agilitySucceed(player, 1)) {
            if (id === 862) {
                player.teleport(730, 3494);
            } else if (id === 864) {
                player.teleport(stage >= 4 || stage === -1 ? 751 : 734, 3496);
            } else if (id === 863) {
                player.teleport(763, 3442);
            } else if (id === 872) {
                player.teleport(stage >= 4 || stage === -1 ? 765 : 748, 3497);
            } else if (id === 865) {
                player.teleport(728, 3499);
            } else if (id === 866) {
                player.teleport(stage >= 4 || stage === -1 ? 755 : 738, 3501);
            }
            player.message('you drop down to the cave floor');
        } else {
            player.message('but you loose your footing');
            player.damage(2);
            await player.say('aargh');
        }
        return true;
    }

    // North stone step: stage 4 forces the fall to stage 5
    if (id === IDS.NORTH_STONE_STEP) {
        if (stage === 4) {
            await failBlackAreaObstacle(player, id);
        } else {
            player.message('@que@you walk down the stone steps');
            await world.sleepTicks(3);
            player.teleport(766, 585);
        }
        return true;
    }

    // South stone step: unconditional, no stage-4 special case
    if (id === IDS.SOUTH_STONE_STEP) {
        player.message('@que@you walk down the steps');
        await world.sleepTicks(3);
        player.message('@que@they lead to a ladder, you climb down');
        await world.sleepTicks(3);
        player.teleport(739, 667);
        return true;
    }

    // First remaining bridge: stage 4 forces the fall; else agility roll
    if (id === IDS.FIRST_REMAINING_BRIDGE) {
        player.message('@que@you attempt to walk over the remaining bridge..');
        await world.sleepTicks(3);
        if (stage === 4) {
            await failBlackAreaObstacle(player, id);
        } else if (agilitySucceed(player, 1)) {
            player.teleport(
                gameObject.x === player.x + 1 ? 776 : 773,
                gameObject.y
            );
            player.message('..you manage to cross safley');
        } else {
            await failBlackAreaObstacle(player, id);
        }
        return true;
    }

    // Stone jump bridges / stone remaining bridges
    if (
        IDS.STONE_JUMP_BRIDGES.includes(id) ||
        IDS.STONE_REMAINING_BRIDGES.includes(id)
    ) {
        if (IDS.STONE_JUMP_BRIDGES.includes(id)) {
            player.message('@que@you attempt to jump across the gap..');
        } else {
            player.message('@que@you attempt to walk over the remaining bridge..');
        }
        await world.sleepTicks(3);
        if (agilitySucceed(player, 1)) {
            if (gameObject.x === player.x + 1) {
                player.teleport(gameObject.x + 3, gameObject.y);
            } else if (gameObject.x === player.x - 3) {
                player.teleport(gameObject.x - 1, gameObject.y);
            } else if (gameObject.y === player.y + 1) {
                player.teleport(gameObject.x, gameObject.y + 3);
            } else if (gameObject.y === player.y - 3) {
                player.teleport(gameObject.x, gameObject.y - 1);
            }
            player.message('..you manage to cross safley');
        } else {
            await failBlackAreaObstacle(player, id);
        }
        scheduleUndergroundPassMessage(player, randomInt(5, 25));
        return true;
    }

    // === UndergroundPassObstaclesMap1.java (first cave region) ===============

    // Main rocks
    if (IDS.MAIN_ROCKS.includes(id)) {
        await doRock(gameObject, player, hitsDamage(player, 42, 1), true, -1);
        return true;
    }

    // First swamp: always fails, tumbles through the crevasse
    if (id === IDS.SWAMP_754) {
        player.message("@que@you try to cross but you're unable to");
        await world.sleepTicks(3);
        player.message('@que@the swamp seems to cling to your legs');
        await world.sleepTicks(3);
        player.message('you slowly feel yourself being dragged below');
        await player.say('gulp!');
        player.teleport(674, 3462);
        await player.say('aargh');
        player.damage(hitsDamage(player, 42, 1));
        await world.sleepTicks(3);
        player.teleport(677, 3462);
        await world.sleepTicks(1);
        player.teleport(680, 3465);
        await world.sleepTicks(1);
        player.teleport(682, 3462);
        await world.sleepTicks(1);
        player.teleport(683, 3465);
        await world.sleepTicks(1);
        player.teleport(685, 3464);
        await world.sleepTicks(1);
        player.teleport(687, 3462);
        await world.sleepTicks(1);
        await player.say('aargh');
        player.damage(hitsDamage(player, 42, 1));
        player.teleport(690, 3461);
        player.message('@que@you tumble deep into the cravass');
        await world.sleepTicks(3);
        player.message('@que@and land battered and bruised at the base');
        await world.sleepTicks(3);
        return true;
    }

    // Fail-swamp rocks (the "rock riddle" back to the main floor)
    if (IDS.FAIL_SWAMP_ROCKS.includes(id)) {
        await doRock(gameObject, player, hitsDamage(player, 42, 1), true, -1);
        return true;
    }

    // Pile of mud (map1, 767)
    if (id === IDS.PILE_OF_MUD_MAP1) {
        player.message('@que@you climb up the mud pile');
        await world.sleepTicks(3);
        player.teleport(685, 3420);
        player.message('@que@it leads into darkness, the stench is almost unbearable');
        await world.sleepTicks(3);
        player.message('@que@you surface by the swamp, covered in muck');
        await world.sleepTicks(3);
        return true;
    }

    // Main ledges
    if (IDS.MAIN_LEDGE.includes(id)) {
        await doLedge(gameObject, player, hitsDamage(player, 42, 1));
        return true;
    }

    // Lever (map1, 733) -> lowers the old bridge
    if (id === IDS.LEVER_MAP1) {
        player.message('@que@you pull back on the old lever');
        await world.sleepTicks(3);
        player.message('@que@the bridge slowly lowers');
        await world.sleepTicks(3);
        const [existing] = world.gameObjects.getAtPoint(704, 3417);
        if (existing) {
            const opened = world.replaceEntity('gameObjects', existing, IDS.OLD_BRIDGE_CROSSED);
            world.setTimeout(() => {
                if (opened.world) {
                    world.replaceEntity('gameObjects', opened, IDS.OLD_BRIDGE);
                }
            }, 10000);
        }
        player.teleport(709, 3420);
        await world.sleepTicks(1);
        player.teleport(706, 3420);
        await world.sleepTicks(1);
        player.teleport(703, 3420);
        player.message('you cross the bridge');
        return true;
    }

    // Blessed spider swamp (795) - always fails, no crossing
    if (id === IDS.SWAMP_795) {
        player.message('@que@you step in rancid swamp');
        await world.sleepTicks(3);
        player.message('@que@it clings to your feet, you cannot cross');
        await world.sleepTicks(3);
        return true;
    }

    // Clear rocks (772 / init 796 west / init 797 east)
    if (
        id === IDS.CLEAR_ROCKS ||
        id === IDS.CLEAR_ROCKS_INIT_WEST ||
        id === IDS.CLEAR_ROCKS_INIT_EAST
    ) {
        if (player.x === 695 && (player.y === 3436 || player.y === 3435)) {
            player.teleport(695, 3435);
            return true;
        }
        if (
            id === IDS.CLEAR_ROCKS_INIT_WEST &&
            player.x > gameObject.x &&
            player.y === gameObject.y
        ) {
            player.teleport(gameObject.x + 1, gameObject.y);
        } else if (
            id === IDS.CLEAR_ROCKS_INIT_EAST &&
            player.x < gameObject.x &&
            player.y === gameObject.y
        ) {
            player.teleport(gameObject.x + 1, gameObject.y);
        }
        player.message('you move the rocks from your path');
        await world.sleepTicks(3);
        let cleared = gameObject;
        if (id !== IDS.CLEAR_ROCKS) {
            cleared = world.replaceEntity('gameObjects', gameObject, IDS.CLEAR_ROCKS);
        }
        player.message('you hear a strange mechanical sound');
        world.setTimeout(() => {
            if (cleared.world) {
                world.replaceEntity('gameObjects', cleared, IDS.CLEAR_ROCKS + 1);
            }
        }, 3000);
        player.damage(Math.floor(player.skills.hits.current * 0.2));
        await player.say('aaarrghhh');
        player.message("You've triggered a trap");
        await world.sleepTicks(3);
        return true;
    }

    // Spear rocks: "step over" -> immediate trap
    if (IDS.SPEAR_ROCKS.includes(id)) {
        player.message('@que@you step over the rock');
        await world.sleepTicks(3);
        player.message('you feel a thread tug at your boot');
        player.message("it's a trap");
        player.teleport(gameObject.x, gameObject.y);
        const sprung = world.replaceEntity('gameObjects', gameObject, 805);
        world.setTimeout(() => {
            if (sprung.world) {
                world.replaceEntity('gameObjects', sprung, id);
            }
        }, 5000);
        player.damage(hitsDamage(player, 6, 1));
        await player.say('aaarghh');
        return true;
    }

    // Drop-down ledge (812)
    if (id === IDS.DROP_DOWN_LEDGE) {
        player.message('you drop down to the cave floor');
        player.teleport(706, 3439);
        return true;
    }

    // === UndergroundPassObstaclesMap2.java (dwarf-cavern region) =============

    // Pile of mud (map2, 6 ids)
    if (IDS.PILE_OF_MUD_MAP2.includes(id)) {
        const idx = IDS.PILE_OF_MUD_MAP2.indexOf(id);
        if (idx === 0) {
            player.message('@que@you climb the pile of mud...');
            await world.sleepTicks(3);
            player.message('@que@it leads to a small tunnel...');
            await world.sleepTicks(3);
            player.teleport(727, 3448);
            player.message('..ending at the well entrance');
        } else {
            player.message('@que@you climb the pile of mud');
            await world.sleepTicks(3);
            const dest = [null, [753, 3481], [753, 3475], [743, 3483], [740, 3476], [735, 3478]][idx];
            player.teleport(dest[0], dest[1]);
        }
        return true;
    }

    // Dug up soil (839, 840)
    if (IDS.DUG_UP_SOIL.includes(id)) {
        player.message('@que@under the soil is a tunnel');
        player.message('would you like to enter?');
        const menu = await player.ask(
            ['no, im scared of small spaces', "yep, let's do it"],
            false
        );
        if (menu === 1) {
            player.message('@que@you climb into the small tunnel');
            await world.sleepTicks(3);
            if (id === IDS.DUG_UP_SOIL[1]) {
                player.teleport(745, 3457);
            } else {
                player.teleport(747, 3470);
            }
            player.message('and crawl into a small dark passage');
        }
        return true;
    }

    // Ledge (map2, 837) "jump off" default -> guaranteed short-jump fail
    if (id === IDS.LEDGE_MAP2) {
        player.message('you take a few paces back...');
        player.message('and run torwards the ledge...');
        player.teleport(764, 3461);
        await world.sleepTicks(3);
        player.message('you land way short of the other platform');
        player.damage(hitsDamage(player, 5, 5));
        player.teleport(764, 3467);
        await player.say('ooof');
        return true;
    }

    // Wall grill east (836) - needs the rope tied first
    if (id === IDS.WALL_GRILL_EAST) {
        if (!player.cache.rope_wall_grill) {
            player.message('@que@the wall grill is too high');
            await world.sleepTicks(3);
            player.message("you can't quite reach");
        } else {
            player.message('@que@you use the rope tied to the grill to pull yourself up');
            await world.sleepTicks(3);
            player.message('you then climb across the grill to the otherside');
            player.teleport(762, 3472);
        }
        return true;
    }

    // Wall grill west (838)
    if (id === IDS.WALL_GRILL_WEST) {
        player.message('@que@you climb across the grill to the otherside');
        await world.sleepTicks(3);
        player.teleport(766, 3463);
        return true;
    }

    // Rocks (map2) -> Map1.doRock with a per-id spike location
    if (IDS.ROCKS_MAP2.includes(id)) {
        const dmg = hitsDamage(player, 5, 5);
        let spikeLocation = 1;
        if (id === 859 || id === 858) {
            spikeLocation = 5;
        } else if (id === 854 || id === 853 || id === 855 || id === 857) {
            spikeLocation = 4;
        } else if (id === 852) {
            spikeLocation = 3;
        } else if (id === 851) {
            spikeLocation = 2;
        }
        await doRock(gameObject, player, dmg, false, spikeLocation);
        return true;
    }

    // Hijack rock (856) - its own random(0,4)==4 fail chance
    if (id === IDS.HIJACK_ROCK) {
        player.message('you climb onto the rock');
        if (Math.floor(Math.random() * 5) === 4) {
            player.message('but you slip');
            player.damage(hitsDamage(player, 5, 5));
            player.teleport(734, 3483);
            await player.say('aargh');
        } else {
            player.teleport(player.x === 734 ? 735 : 734, player.x === 734 ? 3479 : 3480);
            player.message('and step down the other side');
        }
        return true;
    }

    // Passage (873) raw walk-into trap (no plank placed)
    if (id === IDS.PASSAGE) {
        player.message('@que@you walk down the passage way');
        await world.sleepTicks(3);
        player.message('you step on a pressure trigger');
        player.message("it's a trap");
        if (gameObject.x === 737 || gameObject.x === 735) {
            player.teleport(737, 3489);
        } else if (gameObject.x === 733) {
            player.teleport(733, 3489);
        }
        const sprung = world.replaceEntity('gameObjects', gameObject, 826);
        world.setTimeout(() => {
            if (sprung.world) {
                world.replaceEntity('gameObjects', sprung, IDS.PASSAGE);
            }
        }, 5000);
        player.damage(hitsDamage(player, 5, 5));
        await player.say('aaarghh');
        return true;
    }

    // === UndergroundPassOrbs.java (orb-of-light region) =======================

    // North passage: "Walk here" -> trap
    if (IDS.NORTH_PASSAGE.includes(id)) {
        player.message('@que@you walk down the passage way');
        await world.sleepTicks(3);
        player.message('you step on a pressure trigger');
        player.message("it's a trap");
        if (id === 825) {
            player.teleport(728, 3440);
        } else if (id === 828) {
            player.teleport(728, 3438);
        } else if (id === 829) {
            player.teleport(728, 3436);
        }
        const sprung = world.replaceEntity('gameObjects', gameObject, 826);
        world.setTimeout(() => {
            if (sprung.world) {
                world.replaceEntity('gameObjects', sprung, id);
            }
        }, 8 * GAME_TICK);
        player.damage(hitsDamage(player, 5, 5));
        await player.say('aaarghh');
        return true;
    }

    // West passage: "clear" -> crossing or the cascading fail
    if (IDS.WEST_PASSAGE.includes(id)) {
        player.message('you move the rocks from your path');
        if (gameObject.x === player.x - 1) {
            player.teleport(player.x - 2, 3446);
        } else if (gameObject.x === player.x - 2) {
            player.teleport(player.x - 3, 3446);
        } else {
            await fallBack(player, gameObject);
        }
        return true;
    }

    // South-west passage (815) - drops through the unstable floor
    if (id === IDS.SOUTH_WEST_PASSAGE) {
        player.teleport(742, 3453);
        await world.sleepTicks(2);
        player.message('@que@you walk down the passage way');
        await world.sleepTicks(3);
        player.message('@que@the floor seems unstable');
        await world.sleepTicks(3);
        player.message('suddenly with a huge creek the whole passage way swings down');
        if (player.cache.stalagmite) {
            player.teleport(716, 3481);
            player.message('your rope saves you, slowly you lower yourself to the floor');
        } else {
            player.teleport(709, 3472);
            player.message('throwing you onto a pit of spikes');
            player.damage(hitsDamage(player, 5, 5));
            await player.say('aaarrrgh');
        }
        return true;
    }

    // South-west passage climb up (816) - random fail
    if (id === IDS.SOUTH_WEST_PASSAGE_CLIMB_UP) {
        player.message('@que@you begin to climb up the grill');
        await world.sleepTicks(3);
        if (Math.floor(Math.random() * 10) <= 2) {
            player.message('@que@but you fall back to the floor');
            await world.sleepTicks(3);
            player.message("impailing yourself on the spike's once more");
            player.damage(hitsDamage(player, 5, 5));
            await player.say('aaarrrgh');
        } else {
            player.teleport(737, 3453);
            player.message('@que@as you pull yourself up you hear a mechanical churning');
            await world.sleepTicks(3);
            player.message("as the passage raises back to it's original position");
        }
        return true;
    }

    // South-west passage climb up rope (817) - always succeeds
    if (id === IDS.SOUTH_WEST_PASSAGE_CLIMB_UP_ROPE) {
        player.message('you pull your self up the rope');
        player.message('@que@and climb back into the cavern');
        await world.sleepTicks(1);
        player.teleport(737, 3453);
        player.message('@que@as you pull yourself up you hear a mechanical churning');
        await world.sleepTicks(3);
        player.message("as the passage raises back to it's original position");
        return true;
    }

    // South-west stalagmite (818) - search once the rope is tied
    if (id === IDS.SOUTH_WEST_STALAGMITE) {
        player.message('@que@you search the stalagmite');
        await world.sleepTicks(3);
        if (player.cache.stalagmite) {
            player.message('you untie your rope and place it in your satchel');
            player.inventory.add(IDS.ROPE, 1);
            delete player.cache.stalagmite;
        } else {
            player.message('but find nothing');
        }
        return true;
    }

    // === UndergroundPassPuzzle.java (tile-grill puzzle) =======================

    // Working grills: walk over -> move forward one tile
    if (IDS.WORKING_GRILLS.includes(id)) {
        player.message('you step onto the metal grill');
        player.message('you tread carefully as you move forward');
        if (id === 777) {
            player.teleport(681, 3446);
        } else if (id === 785) {
            player.teleport(683, 3446);
        } else if (id === 786) {
            player.teleport(683, 3448);
        } else if (id === 787) {
            player.teleport(685, 3448);
        } else if (id === 788) {
            player.teleport(687, 3448);
        } else if (id === 789) {
            player.teleport(687, 3450);
        } else if (id === 790) {
            player.teleport(687, 3452);
        } else if (id === 791) {
            player.teleport(689, 3452);
        }
        return true;
    }

    // Fail grill: walk over -> trap into the spike pit
    if (id === IDS.FAIL_GRILL) {
        player.message('you step onto the metal grill');
        await world.sleepTicks(3);
        player.message("it's a trap");
        player.teleport(711, 3464);
        await world.sleepTicks(3);
        player.message('@que@you fall onto a pit of spikes');
        await world.sleepTicks(3);
        player.teleport(679, 3448);
        player.damage(Math.floor(player.skills.hits.current * 0.2));
        player.message('you crawl out of the pit');
        const sprung = world.replaceEntity('gameObjects', gameObject, 778);
        world.setTimeout(() => {
            if (sprung.world) {
                world.replaceEntity('gameObjects', sprung, IDS.FAIL_GRILL);
            }
        }, 1000);
        await world.sleepTicks(3);
        player.message('and off the metal grill');
        return true;
    }

    // Walk-here rocks (792 east / 793 west)
    if (id === IDS.WALK_HERE_ROCK_EAST) {
        player.teleport(679, 3447);
        return true;
    }
    if (id === IDS.WALK_HERE_ROCK_WEST) {
        player.teleport(690, 3452);
        return true;
    }

    // Lever (puzzle, 801) -> raises the railing, lowers the cage
    if (id === IDS.LEVER_CAGE) {
        player.message('@que@you pull on the lever');
        await world.sleepTicks(3);
        player.message('@que@you hear a loud mechanical churning');
        await world.sleepTicks(3);
        const [cage] = world.gameObjects.getAtPoint(690, 3449);
        let openCage = cage;
        if (cage) {
            openCage = world.replaceEntity('gameObjects', cage, IDS.UNICORN_CAGE + 1);
        }
        if (openCage) {
            world.setTimeout(() => {
                if (openCage.world) {
                    world.replaceEntity('gameObjects', openCage, IDS.UNICORN_CAGE);
                }
            }, 5000);
        }
        player.message('as the huge railing raises to the cave roof');
        player.message('the cage lowers behind you');
        player.teleport(690, 3451);
        return true;
    }

    return false;
}

// COMMAND TWO

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const id = gameObject.id;

    // Spear rocks: "search" -> trip-wire disarm menu
    if (IDS.SPEAR_ROCKS.includes(id)) {
        player.message('@que@you search the rock');
        await world.sleepTicks(3);
        player.message('you find a trip wire');
        await world.sleepTicks(3);
        player.message('do you wish to disarm the trap?');
        const menu = await player.ask(["yes, i'll have a go", 'no chance'], false);
        if (menu === 0) {
            player.message('@que@you carefully try and diconnect the trip wire');
            await world.sleepTicks(3);
            if (thievingDisarmSucceed(player, 1)) {
                player.message('you manage to delay the trap..');
                player.message('...long enough to cross the rocks');
                if (gameObject.x === player.x + 1) {
                    player.teleport(gameObject.x + 1, gameObject.y);
                } else {
                    player.teleport(gameObject.x - 1, gameObject.y);
                }
            } else {
                player.message('but the trap activates');
                player.teleport(gameObject.x, gameObject.y);
                const sprung = world.replaceEntity('gameObjects', gameObject, 805);
                world.setTimeout(() => {
                    if (sprung.world) {
                        world.replaceEntity('gameObjects', sprung, id);
                    }
                }, 5000);
                player.damage(hitsDamage(player, 6, 1));
                await player.say('aaarghh');
            }
        } else if (menu === 1) {
            player.message('you back away from the trap');
        }
        return true;
    }

    // Ledge (map2, 837) "climb up" -> the real agility roll
    if (id === IDS.LEDGE_MAP2) {
        player.message('you climb the ledge');
        if (Math.floor(Math.random() * 10) <= 1) {
            player.message('but you slip');
            player.damage(hitsDamage(player, 42, 1));
            await player.say('aargh');
        } else {
            player.teleport(764, 3463);
        }
        return true;
    }

    // North passage: "search" -> flavour text only
    if (IDS.NORTH_PASSAGE.includes(id)) {
        player.message('@que@you search the rocks');
        await world.sleepTicks(3);
        player.message('@que@there seems to be some sort of spring activated trap');
        await world.sleepTicks(3);
        player.message('@que@you may be able to wedge it open with something?');
        await world.sleepTicks(3);
        return true;
    }

    // West passage: "search" -> trip-wire step-over sub-menu
    if (IDS.WEST_PASSAGE.includes(id)) {
        player.message('@que@you search the rocks');
        await world.sleepTicks(3);
        player.message('you find a trip wire');
        const menu = await player.ask(['step over trip wire', 'back away'], false);
        if (menu === 0) {
            player.message('@que@you carefully step over the trip wire');
            await world.sleepTicks(3);
            if (Math.floor(Math.random() * 20) <= 2) {
                player.message('...but you brush against it');
                if (gameObject.x === player.x - 1) {
                    player.teleport(player.x - 2, 3446);
                    await world.sleepTicks(2);
                } else if (gameObject.x === player.x - 2) {
                    player.teleport(player.x - 3, 3446);
                    await world.sleepTicks(2);
                }
                await fallBack(player, gameObject);
            } else if (gameObject.x === player.x + 1) {
                player.teleport(player.x + 2, 3446);
            } else if (gameObject.x === player.x - 1) {
                player.teleport(player.x - 2, 3446);
            } else if (gameObject.x === player.x - 2) {
                player.teleport(player.x - 3, 3446);
            }
        }
        // menu === 1 (back away): no further action
        return true;
    }

    return false;
}

// ground item take: the four orbs of light refuse a duplicate pickup

const ORB_IDS = [
    IDS.ORB_OF_LIGHT_WHITE,
    IDS.ORB_OF_LIGHT_BLUE,
    IDS.ORB_OF_LIGHT_PINK,
    IDS.ORB_OF_LIGHT_YELLOW
];

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (ORB_IDS.includes(groundItem.id) && player.inventory.has(groundItem.id)) {
        player.message('you are already carrying this orb');
        return true; // block the pickup
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onGroundItemTake
};
