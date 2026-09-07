// lucien (360) gives the quest and the pendant of lucien
// lucien_edge (364) is fought in the forest north of varrock; handing over the staff or killing him completes the quest

const { questsEnabled } = require('../../custom-gate.js');

const LUCIEN_ID = 360;
const LUCIEN_EDGE_ID = 364;

const PENDANT_OF_LUCIEN_ID = 721;
const PENDANT_OF_ARMADYL_ID = 726;
const STAFF_OF_ARMADYL_ID = 725;

async function soundsFun(player, npc) {
    await npc.say(
        "Well it's not that easy",
        'The fire warrior can only be killed with a weapon of ice',
        'And there are many other traps and hazards in those tunnels'
    );
    await player.say('Well I am brave I shall give it a go');
    await npc.say(
        'Take this pendant you will need it to get through the chamber of ' +
            'fear'
    );
    player.inventory.add(PENDANT_OF_LUCIEN_ID, 1);
    await npc.say(
        'It is not safe for me to linger here much longer',
        'When you have done meet me in the forest north of Varrock',
        'I have a small holding up there'
    );
    player.questStages.templeOfIkov = 1;
}

async function payMe(player, npc) {
    await npc.say('Ah the mercenary type I see');
    await player.say("It's a living");
    await npc.say('I shall adequately reward you', 'With both money and power');
    await player.say('Sounds rather too vague for me');
}

async function lucienDialogue(player, npc) {
    const stage = player.questStages.templeOfIkov || 0;

    switch (stage) {
        case 0: {
            await npc.say('I come here seeking a hero who can help me');
            const menu = await player.ask(
                ['I am a hero', 'Yep lots of heroes about here'],
                false
            );

            if (menu === 0) {
                await npc.say(
                    'I need someone who can enter the tunnels under the ' +
                        'deserted temple of Ikov',
                    'Near Hemenster, to the north of here',
                    'Kill the fire warrior of Lesarkus',
                    'And retrieve the staff of Armardyl'
                );

                const newMenu = await player.ask(
                    [
                        "Why can't you do it yourself?",
                        'That sounds like fun',
                        'That sounds too dangerous for me',
                        'How much will you pay me?'
                    ],
                    false
                );

                if (newMenu === 0) {
                    await player.say("Why can't you do that yourself?");
                    await npc.say(
                        'The guardians of the staff of Armardyl fear me',
                        'They know my kind is powerful',
                        'So they have set up magical wards against are race'
                    );

                    const newMenu2 = await player.ask(
                        [
                            'How much will you pay me?',
                            'That sounds like fun',
                            'Who are your kind?',
                            'That sounds too dangerous for me'
                        ],
                        false
                    );

                    if (newMenu2 === 0) {
                        await player.say('How much will you pay me');
                        await payMe(player, npc);
                    } else if (newMenu2 === 1) {
                        await player.say('That sounds like fun');
                        await soundsFun(player, npc);
                    } else if (newMenu2 === 2) {
                        await player.say('Who are your kind?');
                        await npc.say(
                            'An ancient and powerful race',
                            'Back in the second age we held great influence ' +
                                'in this world',
                            'There are few of us left now'
                        );
                    } else if (newMenu2 === 3) {
                        await player.say('That sounds too dangerous for me');
                        await npc.say('Fortune favours the bold');
                    }
                } else if (newMenu === 1) {
                    await player.say('That sounds like fun');
                    await soundsFun(player, npc);
                } else if (newMenu === 2) {
                    await player.say('That sounds too dangerous for me');
                    await npc.say('Fortune favours the bold');
                } else if (newMenu === 3) {
                    await player.say('How much will you pay me');
                    await payMe(player, npc);
                }
            }
            break;
        }
        case 1:
        case 2:
        case -1:
        case -2: {
            await npc.say('I thought I told you not to meet me here again');

            if (player.inventory.has(PENDANT_OF_LUCIEN_ID)) {
                await player.say('Yes you did, sorry');
            } else {
                const lostAmuletMenu = await player.ask(
                    ['I lost that pendant you gave me', 'Yes you did sorry'],
                    true
                );

                if (lostAmuletMenu === 0) {
                    await npc.say('Hmm', 'Imbecile');
                    player.message('Lucien gives you another pendant');
                    player.inventory.add(PENDANT_OF_LUCIEN_ID, 1);
                }
            }
            break;
        }
    }
}

async function lucienEdgeDialogue(player, npc) {
    const stage = player.questStages.templeOfIkov;

    if (stage === -1 || stage === -2) {
        player.message('You have already completed this quest');
        return;
    }

    await npc.say('Have you got the staff of Armadyl yet?');

    if (player.inventory.has(STAFF_OF_ARMADYL_ID)) {
        const menu = await player.ask(['Yes here it is', 'No not yet'], false);

        if (menu === 0) {
            player.message('@que@You give the staff to Lucien');
            await player.world.sleepTicks(3);
            player.inventory.remove(STAFF_OF_ARMADYL_ID, 1);
            await npc.say(
                'Muhahahaha',
                'Already I can feel the power of this staff running through ' +
                    'my limbs',
                'Soon I shall be exceedingly powerful',
                'I suppose you would like a reward now',
                'I shall grant you much power'
            );
            player.message("A glow eminates from Lucien's helmet");

            // OpenRSC: sendQuestComplete(...) -> handleReward(...)
            completeQuest(player);
            player.questStages.templeOfIkov = -2;

            await npc.say(
                'I must be away now to make preparations for my conquest',
                'Muhahahaha'
            );

            const world = player.world;
            player.disengage();
            world.removeEntity('npcs', npc);
            return;
        }
    } else {
        await player.say('No not yet');
    }
}

// clears lingering caches, grants 1 quest point and ranged/fletching xp (maxstat * 1000 + 2000)
function completeQuest(player) {
    delete player.cache.openSpiderDoor;
    delete player.cache.completeLever;
    delete player.cache.killedLesarkus;

    player.addExperience(
        'ranged',
        player.skills.ranged.base * 1000 + 2000,
        false
    );
    player.addExperience(
        'fletching',
        player.skills.fletching.base * 1000 + 2000,
        false
    );

    player.addQuestPoints(1);
    player.message('@gre@You haved gained 1 quest point!');
    player.message('Well done you have completed the temple of Ikov quest');
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === LUCIEN_EDGE_ID) {
        player.engage(npc);
        await lucienEdgeDialogue(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === LUCIEN_ID) {
        player.engage(npc);
        await lucienDialogue(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// block the attack on lucien_edge unless the pendant of armadyl is equipped
async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== LUCIEN_EDGE_ID) {
        return false;
    }

    const stage = player.questStages.templeOfIkov;

    if (stage === -1 || stage === -2) {
        player.message('You have already completed this quest');
        return true;
    }

    if (!player.inventory.isEquipped(PENDANT_OF_ARMADYL_ID)) {
        player.engage(npc);
        await npc.say(
            "I'm sure you don't want to attack me really",
            'I am your friend'
        );
        player.message("@que@You decide you don't want to attack Lucien really");
        await player.world.sleepTicks(3);
        player.message('@que@He is your friend');
        await player.world.sleepTicks(3);
        player.disengage();
        return true;
    }

    // pendant of Armadyl equipped: allow combat
    return false;
}

// restore hits, complete the quest, remove him with a teleport bubble
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== LUCIEN_EDGE_ID) {
        return false;
    }

    const stage = player.questStages.templeOfIkov;

    if (stage === -1 || stage === -2) {
        player.message('You have already completed this quest');
        npc.skills.hits.current = npc.skills.hits.base;
        return true;
    }

    npc.skills.hits.current = npc.skills.hits.base;

    // clear combat links before removing him, so no stale opponent link remains
    npc.opponent = null;
    player.retreat();
    player.opponent = null;

    player.engage(npc);
    await npc.say('You may have defeated me for now', 'But I will be back');
    player.disengage();

    // guardian-sided ending sets stage to -1
    completeQuest(player);
    player.questStages.templeOfIkov = -1;

    player.world.removeEntity('npcs', npc);

    // block default drop/removal
    return true;
}

// ranging lucien follows the same rules as melee
async function onRangeNPC(player, npc) {
    return onNPCAttack(player, npc);
}

module.exports = { onTalkToNPC, onNPCAttack, onRangeNPC, onNPCDeath };
