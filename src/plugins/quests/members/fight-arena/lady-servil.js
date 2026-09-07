// fight arena (members), lady servil. stages: 0 = not started, 1 = free
// husband/son, 2 = infiltrated prison, 3 = bouncer dead, -1 = complete

const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, LADY_SERVIL_ID, COINS_ID } = require('./ids.js');

// OpenRSC handleReward(player)
async function handleReward(player) {
    const { world } = player;

    player.message('@que@you have completed the fight arena quest');
    await world.sleepTicks(3);
    player.message('@que@Lady Servil gives you 1000 gold coins');
    await world.sleepTicks(3);
    player.message('@que@you gain two quest points');
    await world.sleepTicks(3);

    player.inventory.add(COINS_ID, 1000);

    // 2 quest points; attack + thieving xp = level * 800 + 700
    player.addQuestPoints(2);
    player.message('@gre@You haved gained 2 quest points!');
    player.addExperience(
        'attack',
        player.skills.attack.base * 800 + 700,
        false
    );
    player.addExperience(
        'thieving',
        player.skills.thieving.base * 800 + 700,
        false
    );

    player.questStages[QUEST_KEY] = -1;

    delete player.cache.freed_servil;
    delete player.cache.killed_ogre;
    delete player.cache.guard_sleeping;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== LADY_SERVIL_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY];

    switch (stage) {
        case undefined:
        case 0: {
            await player.say("hi there, looks like you're in some trouble");
            await npc.say('oh, i wish this broken cart was my only problem');
            await npc.say("sob.. i've got to find my family.. sob");

            const first = await player.ask(
                ['I hope you can, good luck', 'can i help you?'],
                true
            );

            if (first === 0) {
                await npc.say(' sob..sob');
            } else if (first === 1) {
                await npc.say(
                    'sob.. would you? please?',
                    "i'm Lady Servil, my husband's Sir Servil",
                    'we were travelling north with my son',
                    "when we were ambushed by general Khazard's men"
                );
                await player.say(
                    "general Khazard? i haven't heard of him"
                );
                await npc.say(
                    "he's been after me ever since i",
                    'declined his hand in marriage',
                    "now he's kidnapped my husband and son",
                    'to fight slaves in his',
                    'battle arena, to the south of here',
                    "i hate to think what he'll do to them",
                    "he's a sick, twisted man"
                );
                await player.say('I\'ll try my best to return your family');
                await npc.say(
                    "please do, i'm a wealthy woman",
                    'and can reward you handsomely',
                    "i'll be waiting for you here"
                );
                player.questStages[QUEST_KEY] = 1;
            }
            break;
        }
        case 1:
        case 2:
            if (!player.cache.freed_servil) {
                await player.say('hello Lady Servil');
                await npc.say(
                    'Brave traveller, please..bring back my family'
                );
            } else {
                await player.say(
                    "Lady Servil, i've freed your son",
                    'but he has returned to the arena to try and help your ' +
                        'husband'
                );
                await npc.say(
                    "oh no, they won't stand a chance",
                    'please go back and help'
                );
            }
            break;
        case 3:
            await player.say('Lady Servil');
            await npc.say(
                "you're alive, i thought Khazard's men took you",
                'My son and husband are safe and recovering at home',
                'without you they would certainly be dead',
                'I am truly grateful for your service',
                'all i can offer in return is material wealth',
                'please take these coins and enjoy'
            );
            await handleReward(player);
            break;
        case -1:
            await player.say('Hello lady Servil');
            await npc.say(
                'oh hello my dear',
                'my husband and son are resting',
                'while i wait for the cart fixer'
            );
            await player.say("hope he's not too long");
            await npc.say('thanks again for everything');
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
