// irena: quest start, completion and skill reward

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    IRENA_ID,
    ANA_ID,
    WROUGHT_IRON_KEY_ID,
    ANA_IN_A_BARREL_ID,
    STAGES,
    stageOf,
    QUEST_POINTS,
    REWARD_BASE_XP,
    REWARD_VAR_XP,
    addNpc,
    ifNearVisNpc,
    maxLevel
} = require('./constants.js');

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}

// skillReward: incStat(skill, 600, 600) == maxStat(skill) * 600 + 600
function giveSkillReward(player, skill) {
    const xp = maxLevel(player, skill) * REWARD_VAR_XP + REWARD_BASE_XP;
    player.addExperience(skill, xp, false);
}

// lastRewardMenu(showIrenaDialogue) - second (last) skill pick
async function lastRewardMenu(player, npc, showIrenaDialogue) {
    if (showIrenaDialogue) {
        await npc.say(
            'Thank you very much for returning my daughter to me.',
            "I'm really very grateful...",
            'I would like to reward you for your bravery and daring.',
            'I can offer you increased knowledge in one of the following areas.'
        );
    }
    const choice = await player.ask(
        ['Fletching.', 'Agility.', 'Smithing.', 'Thieving'],
        false
    );
    const skills = ['fletching', 'agility', 'smithing', 'thieving'];
    await skillReward(player, npc, skills[choice], false);
}

// rewardMenu(showIrenaDialogue) - first skill pick
async function rewardMenu(player, npc) {
    await npc.say(
        'Thank you very much for returning my daughter to me.',
        "I'm really very grateful...",
        'I would like to reward you for your bravery and daring.',
        'I can offer you increased knowledge in two of the following areas.'
    );
    const choice = await player.ask(
        ['Fletching.', 'Agility.', 'Smithing.', 'Thieving'],
        false
    );
    const skills = ['fletching', 'agility', 'smithing', 'thieving'];
    await skillReward(player, npc, skills[choice], true);
}

// skillReward(skill, isFirst)
async function skillReward(player, npc, skill, isFirst) {
    giveSkillReward(player, skill);
    const title = skill.charAt(0).toUpperCase() + skill.slice(1);
    await mes(player, `You advance your stat in ${title}.`);
    if (!isFirst) {
        // player.sendQuestComplete(Quests.TOURIST_TRAP) -> questCompleted
        await questCompleted(player);
        delete player.cache.advanced1;
    } else {
        await mes(player, 'Ok, now choose your second skil.');
        if (!player.cache.advanced1) {
            player.cache.advanced1 = true;
        }
        await lastRewardMenu(player, npc, false);
    }
}

// questCompleted() : set complete, add QP, congratulations messages.
async function questCompleted(player) {
    player.questStages[QUEST_KEY] = STAGES.COMPLETE;
    await mes(player, '', 1);
    await mes(
        player,
        '@gre@***********************************************************'
    );
    await mes(
        player,
        "@gre@*** You have completed the 'Tourist Trap' Quest ! ***"
    );
    await mes(
        player,
        '@gre@***********************************************************'
    );
    player.addQuestPoints(QUEST_POINTS);
    player.message(`@gre@You haved gained ${QUEST_POINTS} quest points!`);
}

// spawn ana, run her farewell + reward menu
async function anaReunion(player) {
    player.questStages[QUEST_KEY] = STAGES.HAVE_ANA;
    const ana = addNpc(player.world, ANA_ID, player.x, player.y);
    if (ana) {
        ana.teleport(player.x, player.y + 1);
        await player.world.sleepTicks(1);
        player.message('@gre@Ana: Hey great, there\'s my Mum!');
        player.engage(ana);
        await ana.say(
            'Great! Thanks for getting me out of that mine!',
            "And that barrel wasn't too bad anyway!",
            "Pop by again sometime, I'm sure we'll have a barrel of laughs!",
            "Oh! I nearly forgot, here's a key I found in the tunnels.",
            "It might be of some use to you, not sure what it opens."
        );
        player.inventory.add(WROUGHT_IRON_KEY_ID, 1);
        player.disengage();
        await mes(player, 'Ana spots Irena and waves...');
        player.engage(ana);
        await ana.say('Hi Mum!', 'Sorry, I have to go now!');
        player.disengage();
        player.world.removeEntity('npcs', ana);
    }
}

// -1 cID: main talk-to handler for Irena
async function irenaDialogue(player, npc) {
    const stage = stageOf(player);

    switch (stage) {
        case STAGES.NOT_STARTED: {
            await mes(
                player,
                'Irena seems to be very upset and cries as you start to approach her.',
                3
            );
            await npc.say('Boo hoo, oh dear, my only daughter....');
            const menu = await player.ask(
                ["What's the matter?", 'Cheer up, it might never happen.'],
                true
            );
            if (menu === 0) {
                await npc.say(
                    'Oh dear...my daughter, Ana, has gone missing in the desert.',
                    'I fear that she is lost, or perhaps...*sob* even worse.'
                );
                const matterMenu = await player.ask(
                    [
                        'When did she go into the desert?',
                        'What did she go into the desert for?',
                        'Is there a reward if I get her back?'
                    ],
                    true
                );
                if (matterMenu === 0) {
                    await whenDidSheGo(player, npc);
                } else if (matterMenu === 1) {
                    await whatDidSheGo(player, npc);
                } else if (matterMenu === 2) {
                    await reward(player, npc);
                }
            } else if (menu === 1) {
                await npc.say(
                    'It may already have happened you thoughtless oaf!',
                    'My daughter, Ana, could be dead or dying in the desert!!!'
                );
                const newMenu = await player.ask(
                    [
                        'When did she go into the desert?',
                        'What did she go into the desert for?',
                        'Is there a reward if I get her back?'
                    ],
                    true
                );
                if (newMenu === 0) {
                    await whenDidSheGo(player, npc);
                } else if (newMenu === 1) {
                    await whatDidSheGo(player, npc);
                } else if (newMenu === 2) {
                    await reward(player, npc);
                }
            }
            break;
        }
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
            await npc.say(
                'Please bring my daughter back to me.',
                'She is most likely lost in the Desert somewhere.',
                'I miss her so much....',
                'Wahhhhh!',
                '*Sob*'
            );
            break;
        case STAGES.ATE_PINEAPPLE:
            if (!player.inventory.has(ANA_IN_A_BARREL_ID)) {
                await npc.say(
                    'Please bring my daughter back to me.',
                    'She is most likely lost in the Desert somewhere.',
                    'I miss her so much....',
                    'Wahhhhh!',
                    '*Sob*'
                );
            } else {
                await npc.say("Hey, great you've found Ana!");
                await mes(player, 'You show Irena the barrel with Ana in it.');
                player.inventory.remove(ANA_IN_A_BARREL_ID);
                player.disengage();
                await anaReunion(player);
                player.engage(npc);
                await npc.say('Hi Ana!');
                await rewardMenu(player, npc);
                delete player.cache.tried_ana_barrel;
            }
            break;
        case STAGES.HAVE_ANA: // stage 10
            if (player.cache.advanced1) {
                await lastRewardMenu(player, npc, true);
            } else {
                await rewardMenu(player, npc);
            }
            break;
        case STAGES.COMPLETE:
            player.message(
                'Irena seems happy now that her daugher has returned home.'
            );
            await npc.say(
                'Thanks so much for returning my daughter to me.',
                'I expect that she will go on another trip soon though.',
                'She is the adventurous type...a bit like yourself really!',
                'Ok, see you around then!'
            );
            player.message('Irena goes back to work.');
            break;
        default:
            break;
    }
}

async function whenDidSheGo(player, npc) {
    await npc.say(
        '*Sob*',
        'She went in there just a few days ago, ',
        'She said she would be back yesterday.',
        "And she's not..."
    );
    const menu = await player.ask(
        [
            'What did she go into the desert for?',
            'Is there a reward if I get her back?',
            "I'll look for your daughter."
        ],
        true
    );
    if (menu === 0) {
        await whatDidSheGo(player, npc);
    } else if (menu === 1) {
        await reward(player, npc);
    } else if (menu === 2) {
        await lookForDaughter(player, npc);
    }
}

async function whatDidSheGo(player, npc) {
    await npc.say(
        'She was just travelling, a tourist you might say.',
        '*Sob* She said she would be safe and now she could be..'
    );
    player.message("Irena's bottom lip trembles a little.");
    await npc.say('*Whhhhhaaaaa*');
    player.message('Irena cries her heart out in front of you.');
    const menu = await player.ask(
        [
            'When did she go into the desert?',
            'Is there a reward if I get her back?',
            "I'll look for your daughter."
        ],
        true
    );
    if (menu === 0) {
        await whenDidSheGo(player, npc);
    } else if (menu === 1) {
        await reward(player, npc);
    } else if (menu === 2) {
        await lookForDaughter(player, npc);
    }
}

async function reward(player, npc) {
    await npc.say(
        "Well, yes, you'll have my gratitude young man.",
        'And I\'m sure that Ana will also be very pleased!',
        'And I may see if I can get a small reward together...',
        'But I cannot promise anything.',
        "So does that mean that you'll look for her then?"
    );
    const menu = await player.ask(
        ["Oh, Ok, I'll get your daughter back for you.", "No, sorry, I'm just too busy!"],
        true
    );
    if (menu === 0) {
        await getBackDaughter(player, npc);
    } else if (menu === 1) {
        await npc.say("Oh really, can't I persuade you in anyway?");
    }
}

async function lookForDaughter(player, npc) {
    await npc.say(
        'That would be very good of you.',
        'You would have the gratitude of a very loving mother.',
        'Are you sure you want to take on that responsibility?'
    );
    const menu = await player.ask(
        ["Oh, Ok, I'll get your daughter back for you.", "No, sorry, I'm just too busy!"],
        true
    );
    if (menu === 0) {
        await getBackDaughter(player, npc);
    } else if (menu === 1) {
        await npc.say("Oh really, can't I persuade you in anyway?");
    }
}

async function getBackDaughter(player, npc) {
    await npc.say(
        'That would be great!',
        "That's really very nice of you!",
        'She was wearing a red silk scarf when she left.'
    );
    player.questStages[QUEST_KEY] = STAGES.SEARCHING;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (npc.id !== IRENA_ID) {
        return false;
    }

    player.engage(npc);
    await irenaDialogue(player, npc);
    player.disengage();
    return true;
}

module.exports = {
    onTalkToNPC,
    // exported so the stone gate escape path can reuse it
    anaReunion,
    rewardMenu,
    lastRewardMenu,
    questCompleted
};
