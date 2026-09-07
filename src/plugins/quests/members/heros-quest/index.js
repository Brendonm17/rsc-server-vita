// hero's quest (members): talk handlers for achetties, garv, grip, trobert, grubor
// object/door/combat triggers live in objects.js, doors.js, grip.js

const { questsEnabled } = require('../../custom-gate.js');
const {
    ACHETTIES_ID,
    GRUBOR_ID,
    TROBERT_ID,
    GARV_ID,
    GRIP_ID,
    ID_PAPER_ID,
    MISCELLANEOUS_KEY_ID,
    MASTER_THIEF_ARMBAND_ID,
    LAVA_EEL_ID,
    RED_FIREBIRD_FEATHER_ID,
    BLACK_PLATE_MAIL_LEGS_ID,
    LARGE_BLACK_HELMET_ID,
    BLACK_PLATE_MAIL_BODY_ID,
    isBlackArmGang,
    hasWorn
} = require('./common.js');
const {
    co,
    biggumMissing,
    giveRewards
} = require('../../../npcs/combat-odyssey-shared');

// combat odyssey on unless a world disables it via config.json
function wantCombatOdyssey(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantCombatOdyssey !== false;
}

// XP reward: 12 skills, each maxStat * 200 + 300
const REWARD_SKILLS = [
    'strength',
    'defense',
    'hits',
    'attack',
    'ranged',
    'herblaw',
    'fishing',
    'cooking',
    'firemaking',
    'woodcutting',
    'mining',
    'smithing'
];

// handleReward()
async function handleReward(player) {
    player.message('Well done you have completed the hero guild entry quest');
    delete player.cache.talked_grip;
    delete player.cache.killed_grip;
    delete player.cache.looted_grip;
    delete player.cache.grip_keys;
    delete player.cache.hq_impersonate;
    delete player.cache.talked_alf;
    delete player.cache.talked_grubor;
    delete player.cache.blackarm_mission;
    delete player.cache.garv_door;
    delete player.cache.armband;

    for (const skill of REWARD_SKILLS) {
        // incStat(player, skill, 300, 200) => base * 200 + 300
        player.addExperience(skill, player.skills[skill].base * 200 + 300, false);
    }

    player.questStages.herosQuest = -1;
    player.addQuestPoints(1);
    player.message('@gre@You haved gained 1 quest point!');
}

// garvInspectDialogue()
async function garvInspectDialogue(player, npc) {
    await player.say("Hi, I'm Hartigen", "I've come to work here");

    if (
        hasWorn(player, BLACK_PLATE_MAIL_LEGS_ID) &&
        hasWorn(player, LARGE_BLACK_HELMET_ID) &&
        hasWorn(player, BLACK_PLATE_MAIL_BODY_ID)
    ) {
        await npc.say('So have you got your i.d paper?');

        if (player.inventory.has(ID_PAPER_ID)) {
            await npc.say(
                'You had better come in then',
                'Grip will want to talk to you'
            );
            player.cache.garv_door = true;
        } else {
            await player.say(
                'No I must have left it in my other suit of armour'
            );
        }
    } else {
        await npc.say(
            'Hartigen the black knight?',
            "I don't think so - he doesn't dress like that"
        );
    }
}

// dutiesDialogue()
async function dutiesDialogue(player, npc) {
    await npc.say(
        "You'll have various guard duty shifts",
        'I may have specific tasks to give you as they come up',
        'If anything happens to me you need to take over as head guard',
        "You'll find Important keys to the treasure room and Pete's quarters",
        'Inside my jacket'
    );

    const sub2 = await player.ask(
        [
            'So can I guard the treasure room please',
            "Well I'd better sort my new room out",
            'Anything I can do now?'
        ],
        true
    );

    if (sub2 === 0) {
        await npc.say(
            'Well I might post you outside it sometimes',
            'I prefer to be the only one allowed inside though',
            "There's some pretty valuable stuff in there",
            'Those keys stay only with the head guard and with Scarface Pete'
        );
    } else if (sub2 === 1) {
        await npc.say("Yeah I'll give you time to settle in");
    } else if (sub2 === 2) {
        if (!player.inventory.has(MISCELLANEOUS_KEY_ID)) {
            await npc.say(
                'Hmm well you could find out what this key does',
                "Apparantly it's to something in this building",
                "Though I don't for the life of me know what"
            );
            await npc.say('Grip hands you a key');
            player.inventory.add(MISCELLANEOUS_KEY_ID, 1);
        } else {
            await npc.say("Can't think of anything right now");
        }
    }
}

// treasureRoomDialogue()
async function treasureRoomDialogue(player, npc) {
    await npc.say(
        'Well I might post you outside it sometimes',
        'I prefer to be the only one allowed inside though',
        "There's some pretty valuable stuff in there",
        'Those keys stay only with the head guard and with Scarface Pete'
    );

    const sub = await player.ask(
        [
            'So what do my duties involve?',
            "Well I'd better sort my new room out"
        ],
        true
    );

    if (sub === 0) {
        await dutiesDialogue(player, npc);
    } else if (sub === 1) {
        await npc.say("Yeah I'll give you time to settle in");
    }
}

// Grip post-ID / completed-quest menu
async function gripMenu(player, npc) {
    const menu = await player.ask(
        [
            'So can I guard the treasure room please',
            'So what do my duties involve?',
            "Well I'd better sort my new room out"
        ],
        true
    );

    if (menu === 0) {
        await treasureRoomDialogue(player, npc);
    } else if (menu === 1) {
        await dutiesDialogue(player, npc);
    } else if (menu === 2) {
        await npc.say("Yeah I'll give you time to settle in");
    }
}

// achetties

async function achettiesHints(player, npc) {
    // options are not auto-sent; the picked line is spoken manually per-branch
    const opt2 = await player.ask(
        [
            'Any hints on getting the armband?',
            'Any hints on getting the feather?',
            'Any hints on getting the eel?',
            "I'll start looking for all those things then"
        ],
        false
    );

    if (opt2 === 0) {
        await player.say('Any hints on getting the thieves armband?');
        await npc.say(
            "I'm sure you have relevant contacts to find out about that"
        );
    } else if (opt2 === 1) {
        await player.say('Any hints on getting the feather?');
        await npc.say(
            'Not really - Entrana firebirds live on Entrana'
        );
    } else if (opt2 === 2) {
        await player.say('Any hints on getting the eel?');
        await npc.say(
            'Maybe go and find someone who knows a lot about fishing?'
        );
    }
}

async function talkToAchetties(player, npc) {
    const stage = player.questStages.herosQuest || 0;

    switch (stage) {
        case 0: {
            await npc.say(
                "Greetings welcome to the hero's guild",
                "Only the foremost hero's of the land can enter here"
            );

            const opt = await player.ask(
                [
                    "I'm a hero, may I apply to join?",
                    "Good for the foremost hero's of the land"
                ],
                true
            );

            if (opt === 0) {
                // requires 4 quests complete and >= 55 quest points
                const done = (key, ...vals) =>
                    vals.includes(player.questStages[key]);

                const questsDone =
                    done('lostCity', -1) &&
                    done('shieldOfArrav', -1, -2) &&
                    done('merlinsCrystal', -1) &&
                    done('dragonSlayer', -1);

                if (questsDone && player.questPoints >= 55) {
                    await npc.say(
                        "Ok you may begin the tasks for joining the hero's guild",
                        'You need the feather of an Entrana firebird',
                        'A master thief armband',
                        'And a cooked lava eel'
                    );

                    player.questStages.herosQuest = 1;

                    await achettiesHints(player, npc);
                } else {
                    await npc.say("You're a hero?, I've never heard of you");
                    player.message(
                        '@que@You need to have 55 quest points to file for an ' +
                            'application'
                    );
                    await player.world.sleepTicks(3);
                    player.message(
                        '@que@You also need to have completed the following quests'
                    );
                    await player.world.sleepTicks(3);
                    player.message('@que@The shield of arrav, the lost city');
                    await player.world.sleepTicks(3);
                    player.message('Merlin\'s crystal and dragon slayer"');
                    await player.world.sleepTicks(3);
                }
            }
            break;
        }

        case 1:
        case 2: {
            await npc.say(
                "Greetings welcome to the hero's guild",
                'How goes thy quest?'
            );

            if (
                player.inventory.has(MASTER_THIEF_ARMBAND_ID) &&
                player.inventory.has(LAVA_EEL_ID) &&
                player.inventory.has(RED_FIREBIRD_FEATHER_ID)
            ) {
                await player.say('I have all the things needed');
                player.inventory.remove(MASTER_THIEF_ARMBAND_ID);
                player.inventory.remove(LAVA_EEL_ID);
                player.inventory.remove(RED_FIREBIRD_FEATHER_ID);
                await handleReward(player);
            } else {
                await player.say("It's tough, I've not done it yet");
                await npc.say(
                    'Remember you need the feather of an Entrana firebird',
                    'A master thief armband',
                    'And a cooked lava eel'
                );

                await achettiesHints(player, npc);
            }
            break;
        }

        case -1:
            // combat odyssey tier 8->9 handoff (achetties is tier 9's master)
            if (
                wantCombatOdyssey(player) &&
                co.getCurrentTier(player) === 8 &&
                co.isTierCompleted(player)
            ) {
                if (await biggumMissing(player)) {
                    return;
                }
                const newTier = 9;
                co.assignNewTier(player, newTier);
                await player.say("Sigbert sent me here for Radimus' quest");
                await npc.say('Yes he asked me to give you this');
                await giveRewards(player, npc);
                await npc.say('For me you have to kill the following');
                await npc.say(...co.getTasksAndCounts(co.getTier(newTier)));
                await npc.say(
                    'If you manage to do that then go speak to Radimus himself'
                );
                return;
            }
            // heroic cape branch omitted: canBuyCape() is always false on target confs
            await npc.say("Greetings welcome to the hero's guild");
            break;
    }
}

// garv

async function talkToGarv(player, npc) {
    await npc.say('Hello, what do you want?');

    if (
        isBlackArmGang(player) &&
        player.cache.hq_impersonate &&
        !player.cache.garv_door
    ) {
        await garvInspectDialogue(player, npc);
    } else {
        const opts = await player.ask(
            ['Can I go in there?', 'I want for nothing'],
            true
        );

        if (opts === 0) {
            await npc.say('No in there is private');
        } else if (opts === 1) {
            await npc.say("You're one of a very lucky few then");
        }
    }
}

// grip

async function talkToGrip(player, npc) {
    if (player.cache.talked_grip || player.questStages.herosQuest === -1) {
        await gripMenu(player, npc);
        return;
    }

    await player.say(
        'Hi I am Hartigen',
        "I've come to take the job as your deputy"
    );
    await npc.say(
        "Ah good at last, you took you're time getting here",
        'Now let me see',
        'Your quarters will be that room nearest the sink',
        "I'll get your hours of duty sorted in a bit",
        'Oh and have you got your I.D paper',
        'Internal security is almost as important as external security for ' +
            'a guard'
    );

    if (!player.inventory.has(ID_PAPER_ID)) {
        await player.say("Oh dear I don't have that with me any more");
    } else {
        player.message('You hand your I.D paper to grip');
        player.inventory.remove(ID_PAPER_ID);
        player.cache.talked_grip = true;
        await gripMenu(player, npc);
    }
}

// trobert

async function talkToTrobert(player, npc) {
    if (player.questStages.herosQuest === -1) {
        return;
    }

    if (player.cache.hq_impersonate) {
        if (player.inventory.has(ID_PAPER_ID)) {
            return;
        }
        await player.say("I have lost Hartigen's I.D paper");
        await npc.say(
            'That was careless',
            'He had a spare fortunatley',
            'Here it is'
        );
        player.inventory.add(ID_PAPER_ID, 1);
        await npc.say('Be more careful this time');
        return;
    }

    await npc.say(
        'Hi, welcome to our Brimhaven headquarters',
        "I'm Trobert and I'm in charge here"
    );

    const menu = await player.ask(
        [
            "So can you help me get Scarface Pete's candlesticks?",
            'pleased to meet you'
        ],
        false
    );

    if (menu === 0) {
        await player.say(
            "So can you help me get Scarface Pete's candlesticks?"
        );
        await npc.say(
            'Well we have made some progress there',
            "We know one of the keys to Pete's treasure room is carried by " +
                'Grip the head guard',
            'So we thought it might be good to get close to the head guard',
            'Grip was taking on a new deputy called Hartigen',
            'Hartigen was an Asgarnian black knight',
            'However he was deserting the black knight fortress and seeking ' +
                'new employment',
            'We managed to waylay him on the way here',
            'We now have his i.d paper',
            'Next we need someone to impersonate the black knight'
        );

        const sec = await player.ask(
            ['I volunteer to undertake that mission', 'Well good luck then'],
            true
        );

        if (sec === 0) {
            await npc.say("Well here's the I.d");
            player.inventory.add(ID_PAPER_ID, 1);
            player.cache.hq_impersonate = true;
            await npc.say(
                "Take that to the guard room at Scarface Pete's mansion"
            );
        }
    } else if (menu === 1) {
        await player.say('Pleased to meet you');
    }
}

// grubor

async function talkToGrubor(player, npc) {
    await player.say('Hi');
    await npc.say("Hi, I'm a little busy right now");
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (npc.id) {
        case ACHETTIES_ID:
            player.engage(npc);
            await talkToAchetties(player, npc);
            player.disengage();
            return true;
        case GARV_ID:
            player.engage(npc);
            await talkToGarv(player, npc);
            player.disengage();
            return true;
        case GRIP_ID:
            player.engage(npc);
            await talkToGrip(player, npc);
            player.disengage();
            return true;
        case TROBERT_ID:
            player.engage(npc);
            await talkToTrobert(player, npc);
            player.disengage();
            return true;
        case GRUBOR_ID:
            player.engage(npc);
            await talkToGrubor(player, npc);
            player.disengage();
            return true;
    }

    return false;
}

// garvInspectDialogue is also used by the Garv door in doors.js
module.exports = { onTalkToNPC, handleReward, garvInspectDialogue };
