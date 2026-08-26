// quest stages: 0 not started, 1-4 in progress, -1 complete

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');

// npcs
const ADVENTURER_CLERIC_ID = 207; // "A cleric"
const ADVENTURER_WIZARD_ID = 208; // "A wizard"
const ADVENTURER_WARRIOR_ID = 209; // "A Warrior"
const ADVENTURER_ARCHER_ID = 210; // "An archer"
const LEPRECHAUN_ID = 211;
const MONK_OF_ENTRANA_ID = 213;
const TREE_SPIRIT_ID = 216;

const ADVENTURER_IDS = [
    ADVENTURER_ARCHER_ID,
    ADVENTURER_CLERIC_ID,
    ADVENTURER_WARRIOR_ID,
    ADVENTURER_WIZARD_ID
];

// game objects
const LEPRECHAUN_TREE_ID = 0; // OpenRSC 237 -> rsc 0 (ordinary Tree)
const ENTRANA_LADDER_ID = 5; // OpenRSC 244 -> rsc 5 (Ladder)
const DRAMEN_TREE_ID = 245; // OpenRSC 245 -> rsc 245 (Dramen Tree)

// wall objects
const MAGIC_DOOR_ID = 65; // "Magic Door"
const ZANARIS_DOOR_ID = 66; // shed door in the swamp / Zanaris portal

// Items (rsc-data/config/items.json, via oref/id-map.json)
const KNIFE_ID = 11;
const DRAMEN_BRANCH_ID = 508;
const DRAMEN_STAFF_ID = 507;

const LEPRECHAUN_SPAWN = { x: 172, y: 661 };
const TREE_SPIRIT_SPAWN = { x: 412, y: 3403 };

// helpers

// lines sent together instead of delayed per-line
function mes(player, ...lines) {
    player.message(...lines);
}

function nearVisNpc(player, id, radius) {
    const npc = player.world.npcs.getByID(id);

    if (!npc) {
        return null;
    }

    if (
        Math.abs(npc.x - player.x) > radius ||
        Math.abs(npc.y - player.y) > radius
    ) {
        return null;
    }

    return npc;
}

// shared zanaris reveal menu

async function zanarisMenu(player, npc) {
    const nextOption = await player.ask(
        [
            'If it\'s hidden how are you planning to find it',
            'There\'s no such thing'
        ],
        true
    );

    if (nextOption === 0) {
        await npc.say(
            'Well we don\'t want to tell others that',
            'We want all the glory of finding it for ourselves'
        );

        // do not send over (options not echoed by the player)
        const afterOption = await player.ask(
            [
                'please tell me',
                'looks like you don\'t know either if you\'re sitting ' +
                    'around here'
            ],
            false
        );

        if (afterOption === 0) {
            await player.say('Please tell me');
            await npc.say('No');
        } else if (afterOption === 1) {
            await player.say(
                'looks like you don\'t know either if you\'re sitting ' +
                    'around here'
            );
            await npc.say(
                'Of course we know',
                'We haven\'t worked out which tree the stupid leprechaun ' +
                    'is in yet',
                'Oops I didn\'t mean to tell you that'
            );
            await player.say('So a Leprechaun knows where Zanaris is?');
            await npc.say('Eerm', 'yes');
            await player.say(
                'And he\'s in a tree somewhere around here',
                'thankyou very much'
            );
            player.questStages.lostCity = 1;
        }
    } else if (nextOption === 1) {
        await npc.say(
            'Well when we find which tree the leprechaun is in',
            'You can eat those words',
            'Oops I didn\'t mean to tell you that'
        );
        await player.say('So a Leprechaun knows where Zanaris is?');
        await npc.say('Eerm', 'yes');
        await player.say(
            'And he\'s in a tree somewhere around here',
            'thankyou very much'
        );
        player.questStages.lostCity = 1;
    }
}

// adventurer

async function talkToAdventurer(player, npc) {
    const stage = player.questStages.lostCity | 0;

    if (stage === 0) {
        await npc.say('hello traveller');

        // do not send over
        const option = await player.ask(
            [
                'What are you camped out here for?',
                'Do you know any good adventures I can go on?'
            ],
            false
        );

        if (option === 0) {
            await player.say('What are you camped here for?');
            await npc.say('We\'re looking for Zanaris');

            // do not send over
            const subOption = await player.ask(
                [
                    'Who\'s Zanaris?',
                    'what\'s Zanaris?',
                    'What makes you think it\'s out here'
                ],
                false
            );

            if (subOption === 0 || subOption === 2) {
                if (subOption === 0) {
                    await player.say('Who\'s Zanaris?');
                    await npc.say(
                        'hehe Zanaris isn\'t a person',
                        'It\'s a magical hidden city'
                    );
                } else {
                    await player.say('what makes you think it\'s out here?');
                    await npc.say(
                        'Don\'t you know the legends?',
                        'Of the magical city, hidden in the swamp'
                    );
                }
                await zanarisMenu(player, npc);
            } else if (subOption === 1) {
                await player.say('what\'s Zanaris?');
                await npc.say(
                    'I don\'t think we want other people competing with us ' +
                        'to find it'
                );
                const nextOption = await player.ask(
                    ['Please tell me', 'Oh well never mind'],
                    true
                );
                if (nextOption === 0) {
                    await npc.say('No');
                }
            }
        } else if (option === 1) {
            await player.say('Do you know any good adventures I can go on');
            await npc.say(
                'Well we\'re on an adventure now',
                'Mind you this is our adventure',
                'We don\'t want to share it - find your own'
            );

            const insist = await player.ask(
                [
                    'Please tell me',
                    'I don\'t think you\'ve found a good adventure at all'
                ],
                true
            );

            if (insist === 0) {
                await npc.say('No');
            } else if (insist === 1) {
                await npc.say(
                    'We\'re on one of the greatest adventures I\'ll have ' +
                        'you know',
                    'Searching for Zanaris isn\'t a walk in the park'
                );

                // do not send over
                const subOption = await player.ask(
                    [
                        'Who\'s Zanaris?',
                        'what\'s Zanaris?',
                        'What makes you think it\'s out here'
                    ],
                    false
                );

                if (subOption === 0 || subOption === 2) {
                    if (subOption === 0) {
                        await npc.say(
                            'hehe Zanaris isn\'t a person',
                            'It\'s a magical hidden city'
                        );
                    } else {
                        await npc.say(
                            'Don\'t you know the legends?',
                            'Of the magical city, hidden in the swamp'
                        );
                    }
                    await zanarisMenu(player, npc);
                } else if (subOption === 1) {
                    await player.say('what\'s Zanaris?');
                    await npc.say(
                        'I don\'t think we want other people competing with ' +
                            'us to find it'
                    );
                    const nextOption = await player.ask(
                        ['Please tell me', 'Oh well never mind'],
                        true
                    );
                    if (nextOption === 0) {
                        await npc.say('No');
                    }
                }
            }
        }
    } else if (stage === 1) {
        await player.say(
            'So let me get this straight',
            'I need to search the trees near here for a leprechaun?',
            'And he will tell me where Zanaris is?'
        );
        await npc.say('That is what the legends and rumours are,yes');
    } else if (stage === 4 || stage === 3 || stage === 2 || stage === -1) {
        await player.say(
            'thankyou for your information',
            'It has helped me a lot in my quest to find Zanaris'
        );
        await npc.say('So what have you found out?', 'Where is Zanaris?');
        await player.say('I think I will keep that to myself');
    }
}

// leprechaun

async function talkToLeprechaun(player, npc) {
    const stage = player.questStages.lostCity | 0;

    if (stage === 0) {
        await npc.say(
            'Ay you big elephant',
            'You have caught me',
            'What would you be wanting with old Shamus then?'
        );
        await player.say('I\'m not sure');
        await npc.say('Well you\'ll have to catch me again when you are');
        player.message('The leprechaun magically disapeers');
        player.world.removeEntity('npcs', npc);
    } else if (stage === 1) {
        await npc.say(
            'Ay you big elephant',
            'You have caught me',
            'What would you be wanting with old Shamus then?'
        );
        await player.say('I want to find Zanaris');
        await npc.say(
            'Zanaris?',
            'You need to go in the funny little shed',
            'in the middle of the swamp'
        );
        await player.say('Oh I thought Zanaris was a city');
        await npc.say('It is');

        // do not send over
        const menu = await player.ask(
            [
                'How does it fit in a shed then?',
                'I\'ve been in that shed, I didn\'t see a city'
            ],
            false
        );

        if (menu === 0) {
            await player.say('How does it fit in a shed then?');
            await npc.say(
                'Silly person',
                'The city isn\'t in the shed',
                'The shed is a portal to Zanaris'
            );
            await player.say(
                'So I just walk into the shed and end up in Zanaris?'
            );
        } else if (menu === 1) {
            await player.say('I\'ve been in that shed', 'I didn\'t see a city');
        }

        await npc.say(
            'Oh didn\'t I say?',
            'You need to be carrying a Dramenwood staff',
            'Otherwise you do just end up in a shed'
        );
        await player.say('So where would I get a staff?');
        await npc.say(
            'Dramenwood staffs are crafted from branches',
            'These staffs are cut from the Dramen tree',
            'located somewhere in a cave on the island of Entrana',
            'I believe the monks of Entrana have recetnly',
            'Started running a ship from port sarim to Entrana'
        );
        player.questStages.lostCity = 2;
        player.message('The leprechaun magically disapeers');
        player.world.removeEntity('npcs', npc);
    } else if (stage === 4 || stage === 3 || stage === 2 || stage === -1) {
        await npc.say(
            'Ay you big elephant',
            'You have caught me',
            'What would you be wanting with old Shamus then?'
        );

        const menu = await player.ask(
            ['I\'m not sure', 'How do I get to Zanaris again?'],
            true
        );

        if (menu === 0) {
            await npc.say(
                'I dunno, what stupid people',
                'Who go to all the trouble to catch leprechaun\'s',
                'When they don\'t even know what they want'
            );
            player.message('The leprechaun magically disapeers');
            player.world.removeEntity('npcs', npc);
        } else if (menu === 1) {
            await npc.say(
                'You need to enter the shed in the middle of the swamp',
                'While holding a dramenwood staff',
                'Made from a branch',
                'Cut from the dramen tree on the island of Entrana'
            );
            player.message('The leprechaun magically disapeers');
            player.world.removeEntity('npcs', npc);
        }
    }
}

// monk of entrana

async function talkToMonk(player, npc) {
    await npc.say(
        'Be careful going in there',
        'You are unarmed, and there is much evilness lurking down there',
        'The evilness seems to block off our contact with our gods',
        'Our prayers seem to have less effect down there',
        'Oh also you won\'t be able to come back this way',
        'This ladder only goes one way',
        'The only way out is a portal which leads deep into the wilderness'
    );

    const option = await player.ask(
        [
            'I don\'t think I\'m strong enough to enter then',
            'Well that is a risk I will have to take'
        ],
        true
    );

    if (option === 1) {
        player.message('You climb down the ladder');
        await player.world.sleepTicks(2);

        // reduce prayer level based on current level
        const prayer = player.skills.prayer;
        if (prayer.current <= 3) {
            prayer.current = 1;
        } else if (prayer.current <= 39) {
            prayer.current = 2;
        } else {
            prayer.current = 3;
        }
        player.sendStats();
    }
}


async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) return false;

    const isAdventurer = ADVENTURER_IDS.includes(npc.id);

    if (
        !isAdventurer &&
        npc.id !== LEPRECHAUN_ID &&
        npc.id !== MONK_OF_ENTRANA_ID
    ) {
        return false;
    }

    player.engage(npc);

    if (npc.id === LEPRECHAUN_ID) {
        await talkToLeprechaun(player, npc);
    } else if (isAdventurer) {
        await talkToAdventurer(player, npc);
    } else if (npc.id === MONK_OF_ENTRANA_ID) {
        await talkToMonk(player, npc);
    }

    player.disengage();
    return true;
}

// leprechaun tree, ladder, dramen tree

async function releaseLeprechaun(player) {
    const { world } = player;

    player.message('A Leprechaun jumps down from the tree and runs off');

    if (world.npcs.getByID(LEPRECHAUN_ID)) {
        return;
    }

    const lepr = new NPC(world, {
        id: LEPRECHAUN_ID,
        x: LEPRECHAUN_SPAWN.x,
        y: LEPRECHAUN_SPAWN.y,
        minX: LEPRECHAUN_SPAWN.x - 3,
        maxX: LEPRECHAUN_SPAWN.x + 5,
        minY: LEPRECHAUN_SPAWN.y - 5,
        maxY: LEPRECHAUN_SPAWN.y + 5
    });

    world.addEntity('npcs', lepr);
}

async function chopDramenTree(player) {
    const { world } = player;
    const stage = player.questStages.lostCity | 0;

    // stage in {4, 3, 2, -1} may interact with the tree
    if (stage === 4 || stage === 3 || stage === 2 || stage === -1) {
        if (player.skills.woodcutting.current < 36) {
            mes(
                player,
                'You are not a high enough woodcutting level to chop down ' +
                    'this tree'
            );
            await world.sleepTicks(3);
            mes(player, 'You need a woodcutting level of 36');
            await world.sleepTicks(3);
            return true;
        }

        if (!hasAxe(player)) {
            player.message('You need an axe to chop down this tree');
            return true;
        }

        // stage 4 or complete: harvest a branch
        if (stage === 4 || stage === -1) {
            mes(player, 'You cut a branch from the Dramen tree');
            await world.sleepTicks(3);
            player.inventory.add(DRAMEN_BRANCH_ID, 1);
            return true;
        }

        // otherwise summon / confront the tree spirit
        let spirit = nearVisNpc(player, TREE_SPIRIT_ID, 15);

        if (stage === 2) {
            player.questStages.lostCity = 3;
        }

        if (spirit) {
            player.engage(spirit);
            await spirit.say(
                'Stop',
                'I am the spirit of the Dramen Tree',
                'You must come through me before touching that tree'
            );
            player.disengage();
            return true;
        }

        // spawn independent of player position (OpenRSC coords)
        spirit = new NPC(world, {
            id: TREE_SPIRIT_ID,
            x: TREE_SPIRIT_SPAWN.x,
            y: TREE_SPIRIT_SPAWN.y,
            minX: TREE_SPIRIT_SPAWN.x - 3,
            maxX: TREE_SPIRIT_SPAWN.x + 3,
            minY: TREE_SPIRIT_SPAWN.y - 3,
            maxY: TREE_SPIRIT_SPAWN.y + 3
        });

        world.addEntity('npcs', spirit);

        await world.sleepTicks(3);
        player.engage(spirit);
        await spirit.say(
            'Stop',
            'I am the spirit of the Dramen Tree',
            'You must come through me before touching that tree'
        );
        player.disengage();
        return true;
    }

    // wrong stage: ominous aura
    mes(
        player,
        'the tree seems to have a ominous aura to it',
        'you do not feel like chopping it down'
    );
    await world.sleepTicks(3);
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) return false;

    switch (gameObject.id) {
        case ENTRANA_LADDER_ID: {
            // only fires near the entrana monk
            const monk = nearVisNpc(player, MONK_OF_ENTRANA_ID, 10);
            if (monk) {
                player.engage(monk);
                await talkToMonk(player, monk);
                player.disengage();
                return true;
            }
            return false;
        }
        case LEPRECHAUN_TREE_ID: {
            const stage = player.questStages.lostCity | 0;
            // restricted to the lumbridge swamp camp area
            if (
                gameObject.x < 168 ||
                gameObject.x > 190 ||
                gameObject.y < 650 ||
                gameObject.y > 675
            ) {
                return false;
            }

            if (stage === 0) {
                player.message('There is nothing in this tree');
            } else if (stage >= 1 && stage <= 3) {
                if (nearVisNpc(player, LEPRECHAUN_ID, 15)) {
                    player.message('There is nothing in this tree');
                } else {
                    await releaseLeprechaun(player);
                }
            } else {
                player.message('There is nothing in this tree');
            }
            return true;
        }
        case DRAMEN_TREE_ID:
            return await chopDramenTree(player);
        default:
            return false;
    }
}

// crafting the staff

async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) return false;

    const ids = [item1.id, item2.id];

    if (!(ids.includes(KNIFE_ID) && ids.includes(DRAMEN_BRANCH_ID))) {
        return false;
    }

    if (!player.inventory.has(DRAMEN_BRANCH_ID)) {
        return false;
    }

    if (player.skills.crafting.current < 31) {
        mes(
            player,
            'You are not a high enough crafting level to craft this staff'
        );
        await player.world.sleepTicks(3);
        mes(player, 'You need a crafting level of 31');
        await player.world.sleepTicks(3);
        return true;
    }

    player.inventory.remove(DRAMEN_BRANCH_ID, 1);
    mes(player, 'you carve the branch into a staff');
    await player.world.sleepTicks(3);
    player.inventory.add(DRAMEN_STAFF_ID, 1);

    return true;
}

// doors

async function completeQuest(player) {
    player.questStages.lostCity = -1;
    player.addQuestPoints(3);
    player.message(
        'Well done you have completed the Lost City of Zanaris quest'
    );
}

async function enterZanarisDoor(player, wallObject) {
    const { world } = player;
    const stage = player.questStages.lostCity | 0;

    const canEnter =
        player.inventory.isEquipped(DRAMEN_STAFF_ID) &&
        (stage === 4 || stage === -1);

    if (canEnter) {
        mes(player, 'The world starts to shimmer');
        await world.sleepTicks(3);
        mes(player, 'You find yourself in different surroundings');
        await world.sleepTicks(3);

        if (stage !== -1) {
            player.teleport(126, 3518, false);
            await completeQuest(player);
        } else {
            player.teleport(126, 3518, false);
        }
    } else {
        // no staff (or wrong stage): it really is just a shed
        await player.enterDoor(wallObject);
        player.message('you go through the door and find yourself in a shed.');
    }
}

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) return false;

    if (wallObject.id === MAGIC_DOOR_ID) {
        // exit from Zanaris back to the "somewhere else" spot
        player.teleport(109, 245, false);
        await player.world.sleepTicks(1);
        player.message(
            'you go through the door and find yourself somewhere else'
        );
        return true;
    }

    if (wallObject.id === ZANARIS_DOOR_ID) {
        await enterZanarisDoor(player, wallObject);
        return true;
    }

    return false;
}

// tree spirit combat

async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) return false;

    if (npc.id !== TREE_SPIRIT_ID) {
        return false;
    }

    // attack blocked unless at quest stage 3
    if ((player.questStages.lostCity | 0) !== 3) {
        return true; // block the default attack
    }

    return false;
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) return false;

    if (npc.id !== TREE_SPIRIT_ID) {
        return false;
    }

    if ((player.questStages.lostCity | 0) === 3) {
        player.questStages.lostCity = 4;
    }

    return false;
}

// helpers

// authentic RSC woodcutting axe ids (bronze..rune)
const AXE_IDS = [87, 12, 88, 203, 204, 405];

function hasAxe(player) {
    for (const id of AXE_IDS) {
        if (player.inventory.has(id) || player.inventory.isEquipped(id)) {
            return true;
        }
    }
    return false;
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onUseWithInventory,
    onWallObjectCommandOne,
    onNPCAttack,
    onNPCDeath
};
