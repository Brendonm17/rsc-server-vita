// the grand tree (members) scenery / object interactions

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    GLOUGHS_CUPBOARD_OPEN,
    GLOUGHS_CUPBOARD_CLOSED,
    GLOUGH_CHEST_OPEN,
    GLOUGH_CHEST_CLOSED,
    TREE_LADDER_UP,
    TREE_LADDER_DOWN,
    SHIPYARD_GATE,
    SHIPYARD_GATE_OPEN,
    STRONGHOLD_GATE,
    STRONGHOLD_GATE_OPEN,
    WATCH_TOWER_UP,
    WATCH_TOWER_DOWN,
    WATCH_TOWER_STONE_STAND,
    ROOT_ONE,
    ROOT_TWO,
    ROOT_THREE,
    PUSH_ROOT,
    PUSH_ROOT_BACK,
    GLOUGHS_JOURNAL,
    GLOUGHS_KEY,
    GLOUGHS_NOTES,
    TREE_GNOME_TRANSLATION,
    PEBBLE_1,
    PEBBLE_2,
    PEBBLE_3,
    PEBBLE_4,
    DACONIA_ROCK,
    SHIPYARD_WORKER_ENTRANCE,
    FEMI,
    GLOUGH_UNDERGROUND,
    BLACK_DEMON_GRANDTREE,
    ifNearVisNpc,
    addNpc
} = require('./ids.js');

const GAME_TICK = 640;

// shipyard password sub-menus

async function wrongShipyardPassword(player, worker) {
    await worker.say('you have no idea');
    delete player.cache.gt_shipyard_q1;
    delete player.cache.gt_shipyard_q2;
    await worker.attack(player);
}

async function shipyardPasswordMenu3(player, worker) {
    const menu = await player.ask(['mon', 'min', 'men'], false);

    if (menu === 1) {
        if (player.cache.gt_shipyard_q1 && player.cache.gt_shipyard_q2) {
            delete player.cache.gt_shipyard_q1;
            delete player.cache.gt_shipyard_q2;
            await player.say('ka lu min');
            await worker.say(
                "i'm sorry to have kept you",
                'but obviously high security is essential'
            );
            player.teleport(402, 760);
            player.message('the worker opens the gate');
            player.message('you walk through');
            await worker.say(
                "you'll need to speak to the foreman",
                "he's on the pier, it'll give you a chance..",
                '...to see the fleet'
            );
        }
    } else {
        await wrongShipyardPassword(player, worker);
    }
}

async function shipyardPasswordMenu2(player, worker) {
    const menu = await player.ask(['lo', 'lu', 'le'], false);

    if (menu === 1) {
        if (!player.cache.gt_shipyard_q2 && player.cache.gt_shipyard_q1) {
            player.cache.gt_shipyard_q2 = true;
        }
    }

    await shipyardPasswordMenu3(player, worker);
}

// cupboard

async function openCupboard(player, gameObject) {
    const { world } = player;
    world.replaceEntity('gameObjects', gameObject, GLOUGHS_CUPBOARD_OPEN);
    player.message('you open the cupboard');
}

async function closeCupboard(player, gameObject) {
    const { world } = player;
    world.replaceEntity('gameObjects', gameObject, GLOUGHS_CUPBOARD_CLOSED);
    player.message('you close the cupboard');
}

async function searchCupboard(player) {
    player.message('@que@you search the cupboard');
    await player.world.sleepTicks(3);
    if ((player.questStages[QUEST_KEY] || 0) === 6) {
        player.message("@que@inside you find glough's journal");
        await player.world.sleepTicks(3);
        player.inventory.add(GLOUGHS_JOURNAL, 1);
        player.questStages[QUEST_KEY] = 7;
    } else {
        player.message('@que@but find nothing of interest');
        await player.world.sleepTicks(3);
    }
}

// shipyard gate

async function shipyardGate(player, gameObject) {
    const { world } = player;
    const stage = player.questStages[QUEST_KEY] || 0;

    if (player.y >= 762) {
        if (stage >= 8 && stage <= 9) {
            player.message('@que@the gate is locked');
            await world.sleepTicks(3);
            const worker = ifNearVisNpc(player, SHIPYARD_WORKER_ENTRANCE, 5);
            if (worker) {
                player.engage(worker);
                await worker.say('hey you, what are you up to?');
                await player.say("i'm trying to open the gate");
                await worker.say('i can see that, but why?');

                const options = [];
                const optionCheckWorking =
                    "i've come to check that you're working safley";
                options.push(optionCheckWorking);
                const optionQuest = 'glough sent me';
                if (stage === 8) {
                    options.push(optionQuest);
                }
                const optionJustLooking = 'i just fancied looking around';
                options.push(optionJustLooking);

                const option = await player.ask(options, true);
                if (option === -1) {
                    player.disengage();
                    return;
                }
                const picked = options[option];

                if (picked === optionCheckWorking) {
                    await worker.say('what business is that of yours?');
                    await player.say(
                        'as a runescape resident i have a right to know'
                    );
                    await worker.say(
                        'get out of here before you get a beating'
                    );
                    await player.say("that's not very friendly");
                    await worker.say("right, i'll show you friendly");
                    player.disengage();
                    await worker.attack(player);
                } else if (picked === optionQuest) {
                    await worker.say('hmm, really, what for?');
                    await player.say(
                        'your wasting my time, take me to your superior'
                    );
                    await worker.say(
                        'ok, i can let you in but i need the password'
                    );
                    const menu = await player.ask(['Ka', 'ko', 'ke'], false);
                    if (menu === 0) {
                        if (!player.cache.gt_shipyard_q1) {
                            player.cache.gt_shipyard_q1 = true;
                        }
                        await shipyardPasswordMenu2(player, worker);
                    } else {
                        await shipyardPasswordMenu2(player, worker);
                    }
                    player.disengage();
                } else if (picked === optionJustLooking) {
                    await worker.say("this isn't a museum", 'leave now');
                    await player.say("i'll leave when i choose");
                    await worker.say("we'll see");
                    player.disengage();
                    await worker.attack(player);
                }
            } else {
                player.message('@que@the gate is locked');
                await world.sleepTicks(3);
            }
        } else {
            player.message('@que@the gate is locked');
            await world.sleepTicks(3);
        }
    } else {
        player.message('you open the gate');
        player.message('and walk through');
        world.replaceEntity('gameObjects', gameObject, SHIPYARD_GATE_OPEN);
        player.teleport(401, 763);
    }
}

// stronghold gate

async function strongholdGate(player, gameObject) {
    const { world } = player;
    const stage = player.questStages[QUEST_KEY] || 0;

    if (player.y <= 531 || stage !== 0) {
        world.replaceEntity('gameObjects', gameObject, STRONGHOLD_GATE_OPEN);
        return;
    }

    if ('helped_femi' in player.cache) {
        world.replaceEntity('gameObjects', gameObject, STRONGHOLD_GATE_OPEN);
        return;
    }

    const femi = ifNearVisNpc(player, FEMI, 10);
    if (femi) {
        player.engage(femi);
        await femi.say('hello there');
        await player.say('hi');
        await femi.say(
            'could you help me lift this barrel',
            "it's really heavy"
        );
        const menu = await player.ask(
            ["sorry i'm a bit busy", 'ok then'],
            false
        );
        if (menu === 0) {
            await femi.say("oh, ok, i'll do it myself");
            player.cache.helped_femi = false;
        } else if (menu === 1) {
            await femi.say('thanks traveller');
            player.message('@que@you help the gnome lift the barrel');
            await world.sleepTicks(3);
            player.message("@que@it's very heavy and quite hard work");
            await world.sleepTicks(3);
            await femi.say('thanks again friend');
            player.cache.helped_femi = true;
        }
        player.disengage();
    } else {
        player.message('the little gnome is busy at the moment');
    }
}

// watch tower stone stand

async function stoneStand(player) {
    const { world } = player;
    const stage = player.questStages[QUEST_KEY] || 0;

    if (stage === 15 || stage === 16 || stage === -1) {
        player.message('@que@you squeeze down the inner of the tree trunk');
        await world.sleepTicks(3);
        player.message('@que@you drop out of the bottom onto a mud floor');
        await world.sleepTicks(3);
        player.teleport(711, 3306);
        return;
    }

    player.message('@que@you push down on the pillar');
    await world.sleepTicks(3);
    player.message('you feel it shift downwards slightly');
    await world.sleepTicks(4);

    const hasPebbles =
        player.cache.pebble_1 &&
        player.cache.pebble_2 &&
        player.cache.pebble_3 &&
        player.cache.pebble_4;

    if (hasPebbles || stage === 14) {
        delete player.cache.pebble_1;
        delete player.cache.pebble_2;
        delete player.cache.pebble_3;
        delete player.cache.pebble_4;

        if (stage === 13) {
            player.questStages[QUEST_KEY] = 14;
        }

        player.message('the pillar shifts back revealing a ladder');
        await world.sleepTicks(4);
        player.message('@que@it seems to lead down through the tree trunk');
        await world.sleepTicks(3);

        const menu = await player.ask(
            ['climb down', 'come back later'],
            false
        );

        if (menu === 0) {
            player.message('@que@you squeeze down the inner of the tree trunk');
            await world.sleepTicks(3);
            player.message('@que@you drop out of the bottom onto a mud floor');
            await world.sleepTicks(3);
            player.teleport(711, 3306);
            player.message(
                '@que@around you, you can see piles of strange looking rocks'
            );
            await world.sleepTicks(3);
            player.message(
                '@que@you here the sound of small footsteps coming from the ' +
                    'darkness'
            );
            await world.sleepTicks(3);

            // glough despawns in almost 1 minute
            const glough = addNpc(world, GLOUGH_UNDERGROUND, 709, 3306, 63);
            player.engage(glough);
            await glough.say(
                'you really are becoming a headache',
                'well, at least now you can die knowing you were right',
                'it will save me having to hunt you down',
                'like all the over human filth of runescape'
            );
            await player.say("you're crazy glough");
            await glough.say(
                "i'm angry, you think you're so special",
                "well, soon you'll see, the gnome's are ready to fight",
                'in three weeks this tree will be dead wood',
                'in ten weeks it will be 30 battleships',
                'ready to finally rid the world of the disease called humanity'
            );
            await player.say(
                "what makes you think i'll let you get away with it?"
            );
            await glough.say(
                'ha, do you think i would challange you humans alone',
                'fool.....meet my little friend'
            );
            player.message('@que@from the darkness you hear a deep growl');
            await world.sleepTicks(3);
            player.message('@que@and the sound of heavy footsteps');
            await world.sleepTicks(3);
            player.disengage();

            const demon = addNpc(
                world,
                BLACK_DEMON_GRANDTREE,
                709,
                3306,
                250
            );
            if (demon) {
                // engage the demon so its say() has an interlocutor
                player.engage(demon);
                await demon.say('grrrrr');
                player.disengage();
                await demon.attack(player);
            }
        } else if (menu === 1) {
            player.message('you decide to come back later');
        }
    } else {
        player.message('you here some noise below the pillar...');
        player.message('...but nothing seems to happen');
    }
}

// CommandOne (open / Search / Open / Climb-Up / climb up / push)

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;
    const { world } = player;
    const stage = player.questStages[QUEST_KEY] || 0;

    // cupboard: closed -> "open", open -> "Search"
    if (id === GLOUGHS_CUPBOARD_CLOSED) {
        await openCupboard(player, gameObject);
        return true;
    }
    if (id === GLOUGHS_CUPBOARD_OPEN) {
        await searchCupboard(player);
        return true;
    }

    if (id === TREE_LADDER_UP) {
        player.message('you climb up the ladder');
        player.teleport(417, 2994, false);
        return true;
    }
    if (id === TREE_LADDER_DOWN) {
        player.message('you climb down the ladder');
        player.teleport(415, 2051, false);
        return true;
    }

    if (id === SHIPYARD_GATE) {
        await shipyardGate(player, gameObject);
        return true;
    }

    if (id === STRONGHOLD_GATE) {
        await strongholdGate(player, gameObject);
        return true;
    }

    // chest closed: "Open" -> locked, needs a key
    if (id === GLOUGH_CHEST_CLOSED) {
        player.message('@que@the chest is locked...');
        await world.sleepTicks(3);
        player.message('@que@...you need a key');
        await world.sleepTicks(3);
        return true;
    }

    if (id === WATCH_TOWER_UP) {
        if (player.skills.agility.current >= 25) {
            player.message('you jump up and grab hold of the platform');
            player.teleport(710, 2364);
            player.addExperience('agility', 30, true);
            await world.sleepTicks(5);
            player.message('and pull yourself up');
        } else {
            player.message(
                'You need an agility level of 25 to climb up the platform'
            );
        }
        return true;
    }

    // roots with "search"
    if (id === ROOT_ONE || id === ROOT_TWO || id === ROOT_THREE) {
        player.message('@que@you search the root...');
        await world.sleepTicks(3);
        if (id === ROOT_THREE && stage === 16) {
            if (!player.inventory.has(DACONIA_ROCK)) {
                player.message('@que@and find a small glowing rock');
                await world.sleepTicks(3);
                player.inventory.add(DACONIA_ROCK, 1);
            } else {
                player.message('@que@but find nothing');
                await world.sleepTicks(3);
            }
        } else {
            player.message('@que@...but find nothing');
            await world.sleepTicks(3);
        }
        return true;
    }

    // roots with "push" -> access to gnome mine (post-quest)
    if (id === PUSH_ROOT || id === PUSH_ROOT_BACK) {
        player.message('@que@you push the roots');
        await world.sleepTicks(3);
        if (stage === -1) {
            player.message('@que@they wrap around your arms');
            await world.sleepTicks(3);
            player.message('and drag you deeper forwards');
            if (id === PUSH_ROOT_BACK) {
                player.teleport(700, 3280);
            } else {
                player.teleport(701, 3278);
            }
        } else {
            player.message("@que@they don't seem to mind");
            await world.sleepTicks(3);
        }
        return true;
    }

    return false;
}

// CommandTwo (close / Close / climb down / push down)

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;
    const { world } = player;

    // cupboard open state second command -> "close"
    if (id === GLOUGHS_CUPBOARD_OPEN) {
        await closeCupboard(player, gameObject);
        return true;
    }

    if (id === WATCH_TOWER_DOWN) {
        player.message('@que@you climb down the tower');
        await world.sleepTicks(3);
        player.teleport(712, 1420);
        player.message('@que@and drop to the platform below');
        await world.sleepTicks(3);
        return true;
    }

    // Stone stand "push down"
    if (id === WATCH_TOWER_STONE_STAND) {
        await stoneStand(player);
        return true;
    }

    return false;
}

// use item with object (key on chest, pebbles on stand)

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const id = gameObject.id;
    const stage = player.questStages[QUEST_KEY] || 0;

    // glough's key on the closed chest
    if (id === GLOUGH_CHEST_CLOSED && item.id === GLOUGHS_KEY) {
        player.message('@que@the key fits the chest');
        await world.sleepTicks(3);
        player.message('you open the chest');
        player.message('and search it...');
        // changeloc(obj, GAME_TICK * 5, GLOUGH_CHEST_OPEN)
        const openChest = world.replaceEntity(
            'gameObjects',
            gameObject,
            GLOUGH_CHEST_OPEN
        );
        setTimeout(() => {
            try {
                if (openChest && openChest.world) {
                    world.replaceEntity(
                        'gameObjects',
                        openChest,
                        GLOUGH_CHEST_CLOSED
                    );
                }
            } catch (e) {
                // already reverted/removed
            }
        }, GAME_TICK * 5);

        player.message('@que@inside you find some paper work');
        await world.sleepTicks(3);
        player.message('and an old gnome tongue translation book');
        player.inventory.add(GLOUGHS_NOTES, 1);
        player.inventory.add(TREE_GNOME_TRANSLATION, 1);
        if (stage === 11) {
            player.questStages[QUEST_KEY] = 12;
        }
        player.message('@que@you close the chest');
        await world.sleepTicks(3);
        if ('helped_femi' in player.cache && stage > 10) {
            delete player.cache.helped_femi;
        }
        return true;
    }

    // pebbles on the stone stand
    if (
        id === WATCH_TOWER_STONE_STAND &&
        (item.id === PEBBLE_1 ||
            item.id === PEBBLE_2 ||
            item.id === PEBBLE_3 ||
            item.id === PEBBLE_4)
    ) {
        player.message('@que@on top are four pebble size indents');
        await world.sleepTicks(3);
        player.message('@que@they span from left to right');
        await world.sleepTicks(3);
        player.message('@que@you place the pebble...');
        await world.sleepTicks(3);

        const menu = await player.ask(
            ['To the far left', 'Centre left', 'Centre right', 'To the far right'],
            false
        );

        // correct indent per pebble: far left=1, centre l=2, centre r=3, far right=4
        if (menu === 0) {
            player.message('@que@you place the pebble in the indent');
            await world.sleepTicks(3);
            player.message('@que@it crumbles into dust');
            await world.sleepTicks(3);
            player.inventory.remove(item.id);
            if (item.id === PEBBLE_1 && !player.cache.pebble_1) {
                player.cache.pebble_1 = true;
            }
        } else if (menu === 1) {
            player.message('@que@you place the pebble in the indent');
            await world.sleepTicks(3);
            player.message('@que@it crumbles into dust');
            await world.sleepTicks(3);
            player.inventory.remove(item.id);
            if (item.id === PEBBLE_2 && !player.cache.pebble_2) {
                player.cache.pebble_2 = true;
            }
        } else if (menu === 2) {
            player.message('@que@you place the pebble in the indent');
            await world.sleepTicks(3);
            player.message('@que@it crumbles into dust');
            await world.sleepTicks(3);
            player.inventory.remove(item.id);
            if (item.id === PEBBLE_3 && !player.cache.pebble_3) {
                player.cache.pebble_3 = true;
            }
        } else if (menu === 3) {
            player.message('@que@you place the pebble in the indent');
            await world.sleepTicks(3);
            player.message('@que@it crumbles into dust');
            await world.sleepTicks(3);
            player.inventory.remove(item.id);
            if (item.id === PEBBLE_4 && !player.cache.pebble_4) {
                player.cache.pebble_4 = true;
            }
        }
        return true;
    }

    return false;
}

// grand tree black demon

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== BLACK_DEMON_GRANDTREE) {
        return false;
    }

    if ((player.questStages[QUEST_KEY] || 0) === 14) {
        player.message('@que@the beast slumps to the floor');
        await player.world.sleepTicks(3);
        player.message('@que@glough has fled');
        await player.world.sleepTicks(3);
        player.questStages[QUEST_KEY] = 15;
        const fleeGlough = ifNearVisNpc(player, GLOUGH_UNDERGROUND, 15);
        if (fleeGlough && fleeGlough.world) {
            player.world.removeEntity('npcs', fleeGlough);
        }
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onNPCDeath
};
