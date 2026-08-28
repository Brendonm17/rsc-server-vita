
const NPC = require('../../../../model/npc');
const { customQuestsEnabled: questsEnabled } = require(
    '../../../quests/custom-gate.js'
);

// stage constants
const NOT_STARTED = 0;
const HECKLED_ONCE = 1;
const HECKLED_TWICE = 2;
const HECKLED_THRICE = 3;
const SPOKE_TO_LILY = 4;
const HEARD_AMAZING_SONG = 5;
const TALKED_TO_ODDENSTEIN = 6;
const FINISHED_BONECRUSHER = 7;
const COMPLETED = -1;

// npc ids
const SPOOKIE_ID = 829;
const SCARIE_ID = 830;
const LILY_ID = 823;
const TODD_SANDYMAN_ID = 831;
const ODDENSTEIN_ID = 38;
const APOTHECARY_ID = 33;

// item ids
const BONECRUSHER_ID = 1562;
const CHIPPED_PESTLE_AND_MORTAR_ID = 1563;
const ALUMINIUM_BAR_ID = 1564;
const ALUMINIUM_COG_ID = 1565;
const WOODEN_BOX_ID = 1566;
const RING_OF_SKULL_ID = 1567;
const SPOOKIES_BONES_ID = 1568;
const SCARIES_BONES_ID = 1569;
const PESTLE_AND_MORTAR_ID = 468;
const HAMMER_ID = 168;
const BONES_ID = 20;
const PLANK_ID = 410;
const LOGS_ID = 14;

// object ids
const ANVIL_ID = 50;
const DORICS_ANVIL_ID = 177;
// pumpkin patch scenery
const PUMPKIN_SCENERY_ID = 1275;

// ernest the chicken must be complete or not started for menu
function ernestInactive(player) {
    const s = player.questStages.ernestTheChicken;
    return s === undefined || s === 0 || s === -1;
}

// Functions.* helpers mirrored 1:1
function getStage(player) {
    const s = player.cache.a_bone_to_pick;
    return typeof s === 'number' ? s : NOT_STARTED;
}

function updateStage(player, newStage) {
    player.cache.a_bone_to_pick = newStage;
}

function ifheld(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

function give(player, id, amount = 1) {
    player.inventory.add(id, amount);
}

function attr(player, key) {
    return !!player.cache[key];
}

function setAttr(player, key, value) {
    if (value) {
        player.cache[key] = true;
    } else {
        delete player.cache[key];
    }
}

// DataConversions.random(min, max) - inclusive both ends.
function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// base max level for the skill, 0 if missing
function maxStat(player, skillName) {
    const skill = player.skills[skillName];
    return skill ? skill.base : 0;
}

function getDateFromMsec(msec) {
    const totalMinutes = Math.floor(msec / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    return `${days} Days, ${hours} Hours, ${minutes} Minutes`;
}

// first live npc of id within radius
function ifnearvisnpc(player, id, radius) {
    const npc = player.world.npcs.getByID(id);

    if (npc && player.withinRange(npc, radius)) {
        return npc;
    }

    return null;
}

// spawn a transient npc, removed after ttlms
function addnpc(player, id, x, y, ttlMs) {
    const { world } = player;
    const npc = new NPC(world, {
        id,
        x,
        y,
        minX: x - 2,
        maxX: x + 2,
        minY: y - 2,
        maxY: y + 2
    });

    delete npc.respawn;
    world.addEntity('npcs', npc);

    if (ttlMs) {
        npc.abtpDespawn = world.setTimeout(() => {
            if (world.npcs.getByID(id) === npc) {
                world.removeEntity('npcs', npc);
            }
        }, ttlMs);
    }

    return npc;
}

async function speak(npc, ...messages) {
    if (npc) {
        await npc.say(...messages);
    }
}

async function heckle(player, spookie, scarie, calledFromTimedEvent) {
    const stage = getStage(player);
    let insult;

    if (calledFromTimedEvent) {
        if (stage === NOT_STARTED) {
            insult = 1;
        } else if (stage === HECKLED_ONCE) {
            insult = 2;
        } else if (stage === HECKLED_TWICE) {
            insult = 3;
        } else {
            insult = -1;
        }
    } else {
        insult = random(stage >= HECKLED_THRICE ? 1 : 4, 10);
    }

    switch (insult) {
        case 1: {
            await speak(spookie, 'Hey Scarie', 'Check out this bonehead!');
            await speak(scarie, 'Yeah, what a total numbskull!');
            const strengthLevel = maxStat(player, 'strength');
            if (strengthLevel <= 70) {
                await speak(
                    spookie,
                    'Wow, only ' + strengthLevel + ' strength?',
                    'You really need to hit the gym'
                );
                await speak(scarie, "We've got more muscle than you!");
            } else {
                await speak(spookie, 'This beefcake must have no life');
                await speak(
                    scarie,
                    'Yeah, with ' +
                        strengthLevel +
                        ' strength you must practically live in the gym'
                );
            }
            break;
        }
        case 2: {
            await speak(scarie, 'Hey, Spookie!');
            const prayerLevel = maxStat(player, 'prayer');
            if (prayerLevel < 31) {
                await speak(
                    scarie,
                    'Only ' + prayerLevel + ' prayer?',
                    'Have you never touched a bone before?'
                );
                await speak(
                    spookie,
                    "I thought we were the ones that didn't have any guts!"
                );
            } else if (prayerLevel < 80) {
                await speak(
                    scarie,
                    prayerLevel + ' prayer?',
                    'Bald-head Langley might think you\'re pious'
                );
                await speak(
                    spookie,
                    'But we know you only want ultimate strength!'
                );
            } else {
                await speak(
                    scarie,
                    prayerLevel + ' prayer?',
                    "Looks like we've got a graverobber on our hands!"
                );
            }
            break;
        }
        case 3: {
            const cookingLevel = maxStat(player, 'cooking');
            if (cookingLevel < 40) {
                await speak(spookie, 'Only ' + cookingLevel + ' cooking I see!');
                await speak(
                    scarie,
                    "We wouldn't have the stomach for anything you cooked!"
                );
                await speak(
                    spookie,
                    'Speaking of food',
                    'I heard Lily has some fresh pumpkin pies'
                );
                await speak(scarie, 'Ooo', "Let's go crash the party!");
            } else {
                await speak(
                    spookie,
                    'Wow look Scarie, ' + cookingLevel + ' cooking!'
                );
                await speak(
                    scarie,
                    "Maybe you can make something edible out of Lily's pumpkins"
                );
                await speak(
                    spookie,
                    'Speaking of Lily',
                    "Let's go heckle her again!"
                );
            }
            break;
        }
        case 4: {
            // Insult their lowest level.
            let lowestStatName = 'attack';
            let lowestStatValue = Infinity;
            for (const [name, skill] of Object.entries(player.skills)) {
                if (skill.base < lowestStatValue) {
                    lowestStatValue = skill.base;
                    lowestStatName = name;
                }
            }

            const sessionPlay = Date.now() - (player.loginDate || Date.now());
            const timePlayed =
                (typeof player.cache.total_played === 'number'
                    ? player.cache.total_played
                    : 0) + sessionPlay;

            if (lowestStatValue === 99) {
                await speak(spookie, 'Wow a maxed player?');
                await speak(scarie, 'You really need to get a life!');
                await speak(
                    spookie,
                    "Yeah I can't believe you've played for...",
                    getDateFromMsec(timePlayed) + '!'
                );
            } else {
                await speak(
                    spookie,
                    'Bony cow!',
                    "You've played for " + getDateFromMsec(timePlayed) + '...'
                );
                await speak(
                    scarie,
                    'And you only have ' +
                        lowestStatValue +
                        ' ' +
                        lowestStatName +
                        '?!'
                );
                await speak(spookie, "You're a total knucklehead!");
            }
            break;
        }
        case 5: {
            const harvestingLevel = maxStat(player, 'harvesting');
            if (harvestingLevel < 40) {
                await speak(
                    spookie,
                    'Get a load of this, Scarie!',
                    'Only ' + harvestingLevel + ' harvesting!'
                );
                await speak(
                    scarie,
                    "What's the matter?",
                    "Don't want to get dirt under your fingernails?"
                );
                await speak(
                    spookie,
                    'Maybe you should go spend more time with that loser Lily'
                );
            } else {
                await speak(spookie, harvestingLevel + ' harvesting?');
                await speak(
                    scarie,
                    'Looks like you belong in the dirt more than we do!'
                );
            }
            break;
        }
        case 6: {
            const rangedLevel = maxStat(player, 'ranged');
            if (rangedLevel < 40) {
                await speak(spookie, "Don't really like archery, huh?");
                await speak(
                    scarie,
                    'Yeah only ' + rangedLevel + ' ranged',
                    'Pretty low!'
                );
                await speak(spookie, 'You should really get to training');
                await speak(
                    scarie,
                    "I'm almost certain our lats are more defined than yours!"
                );
            } else {
                await speak(spookie, 'Aw ' + rangedLevel + ' ranged');
                await speak(scarie, 'Too scared to get up close to your enemies?');
                await speak(spookie, 'Boo!');
                await speak(
                    scarie,
                    'Be careful, Spookie!',
                    "You're scaring " + player.username + '!'
                );
            }
            break;
        }
        case 7: {
            const defenseLevel = maxStat(player, 'defense');
            if (defenseLevel < 40) {
                await speak(
                    spookie,
                    'Ha ha!',
                    'Only ' + defenseLevel + ' defense?'
                );
                await speak(
                    scarie,
                    'You probably get pushed over by just the wind!'
                );
                await speak(spookie, 'But not us!');
                await speak(scarie, 'Yeah nothing gets through us!');
            } else {
                await speak(spookie, 'Ha ha!', defenseLevel + ' defense?');
                await speak(
                    scarie,
                    player.username + ' must be hiding behind a shield all day'
                );
                await speak(
                    spookie,
                    "It's okay " + player.username,
                    "The world isn't that scary"
                );
                await speak(scarie, "Except you'd better watch out for us!");
            }
            break;
        }
        case 8: {
            const agilityLevel = maxStat(player, 'agility');
            if (agilityLevel < 40) {
                await speak(spookie, 'You okay there ' + player.username + '?');
                await speak(scarie, "Yeah you're looking a little winded");
                await speak(
                    spookie,
                    'With only ' +
                        agilityLevel +
                        ' agility that must happen a lot!'
                );
            } else {
                await speak(spookie, 'You have ' + agilityLevel + ' agility?');
                await speak(scarie, "We don't even have anything to say about that");
                await speak(
                    spookie,
                    'The fact that you would run around in circles for that ' +
                        'long speaks for itself'
                );
            }
            break;
        }
        case 9: {
            const magicLevel = maxStat(player, 'magic');
            if (magicLevel < 40) {
                await speak(
                    spookie,
                    'Be aware Scarie',
                    player.username + ' only has ' + magicLevel + ' magic',
                    'Definitely not the whitest bone in the body'
                );
                await speak(
                    scarie,
                    "Don't worry Spookie",
                    'I',
                    'will',
                    'talk',
                    'really',
                    'slow',
                    'for',
                    'our',
                    'friend'
                );
                await speak(
                    spookie,
                    "That's very thoughtful of you!",
                    'You should say "thank you" ' + player.username
                );
            } else {
                await speak(
                    spookie,
                    'Wow check out this geek',
                    magicLevel + ' magic'
                );
                await speak(scarie, "I'll bet you cry if you get an A- on a test");
                await speak(spookie, 'NEERRRRD!');
            }
            break;
        }
        case 10: {
            const firemakingLevel = maxStat(player, 'firemaking');
            if (firemakingLevel < 40) {
                await speak(
                    spookie,
                    'Hey Scarie!',
                    "Let's take " + player.username + ' out into the middle of ' +
                        'nowhere',
                    "And just leave 'em there!"
                );
                await speak(
                    scarie,
                    'That sounds hilarious!',
                    'With only ' + firemakingLevel + ' firemaking',
                    "This adventurer definitely won't last long!"
                );
                await speak(
                    spookie,
                    player.username +
                        "'ll be shivering and rattling more than we do in no " +
                        'time!'
                );
            } else {
                await speak(spookie, 'Oh my', firemakingLevel + ' firemaking');
                await speak(scarie, 'You must feel so accomplished');
                await speak(
                    spookie,
                    'Think of all the things you can do with such a practical ' +
                        'skill'
                );
                await speak(
                    scarie,
                    'Like...',
                    'uh...',
                    'Keeping your socks bone dry during the winter?'
                );
                await speak(
                    spookie,
                    'Yes Scarie',
                    "I'm sure that " +
                        player.username +
                        ' is very happy having invested so much time in such ' +
                        'a useful skill'
                );
            }
            break;
        }
        default:
            await speak(spookie, 'No way!');
    }
}

async function skeletonTalk(player, npc) {
    let choice;

    if (attr(player, 'ground_spookie') || attr(player, 'ground_scarie')) {
        choice = await player.ask(['Die!'], false);
    } else {
        choice = await player.ask(['Die', 'You need to leave'], false);
    }

    if (choice === 0) {
        // OpenRSC npc.startCombat(player): the skeleton attacks the player.
        await npc.attack(player);
    } else if (choice === 1) {
        if (npc.id === SPOOKIE_ID) {
            const scarie = ifnearvisnpc(player, SCARIE_ID, 3);
            await heckle(player, npc, scarie, false);
        } else if (npc.id === SCARIE_ID) {
            const spookie = ifnearvisnpc(player, SPOOKIE_ID, 3);
            await heckle(player, spookie, npc, false);
        }
    }
}

async function reformNpc(player, npc) {
    const { world } = player;

    await world.sleepTicks(5);
    player.message('@que@Suddenly, the bones start to reform!');
    await world.sleepTicks(3);

    switch (random(1, 3)) {
        case 1:
            await npc.say('Nothing gets under my skin!');
            break;
        case 2:
            await npc.say("You can't get rid of us that easily!");
            break;
        case 3:
            await npc.say(
                'Looks like ' +
                    player.username +
                    "'s trying to send us off to jail!",
                'Or should I say the rib cage!'
            );
            break;
        default:
            break;
    }
}

async function skeletonDeath(player, npc, hasCrusher) {
    const { world } = player;

    await npc.say('Oh no!', 'How have you defeated me!?');
    player.message('@que@' + npcName(npc) + "'s bones collapse to the ground");

    if (hasCrusher) {
        // remove the skeleton, end the fight, hand over bones
        world.removeEntity('npcs', npc);
        if (npc.opponent) {
            npc.opponent.opponent = null;
        }
        npc.opponent = null;
        if (player.opponent === npc) {
            player.opponent = null;
        }
        player.fightStage = -1;
        player.unlock();

        await world.sleepTicks(1);
        player.message('@que@You quickly pick them up');
        if (npc.id === SPOOKIE_ID) {
            give(player, SPOOKIES_BONES_ID, 1);
        } else {
            give(player, SCARIES_BONES_ID, 1);
        }
        await world.sleepTicks(5);
        player.message(
            '@que@You should use the bonecrusher on them to get rid of ' +
                npcName(npc) +
                ' once and for all'
        );
    } else {
        // No bonecrusher: the skeleton reforms and the fight continues.
        await reformNpc(player, npc);
    }
}

function npcName(npc) {
    return npc.id === SPOOKIE_ID ? 'Spookie' : 'Scarie';
}

async function useBonecrusher(player, bonesId) {
    const { world } = player;

    player.message('@que@You place the bones into the bonecrusher');
    await world.sleepTicks(5);
    player.message(
        '@que@As the contraption starts grinding them to dust, you hear a ' +
            'faint voice:'
    );
    await world.sleepTicks(5);

    if (bonesId === SPOOKIES_BONES_ID && !attr(player, 'ground_spookie')) {
        player.message('@yel@Spookie: Wait, what is going on?');
        await world.sleepTicks(5);
        player.message('@yel@Spookie: What are you doing?');
        setAttr(player, 'ground_spookie', true);
    } else if (bonesId === SCARIES_BONES_ID && !attr(player, 'ground_scarie')) {
        player.message('@yel@Scarie: Wait, what is going on?');
        await world.sleepTicks(5);
        player.message('@yel@Scarie: What are you doing?');
        setAttr(player, 'ground_scarie', true);
    } else {
        player.message("@yel@You've already crushed my bones!");
    }

    player.inventory.remove(bonesId, 1);
    await world.sleepTicks(5);
    player.message('@que@Before long, the bones are completely reduced to dust');

    if (attr(player, 'ground_spookie') && attr(player, 'ground_scarie')) {
        await world.sleepTicks(5);
        player.message('@que@You have successfully defeated Spookie and Scarie');
        await world.sleepTicks(5);
        player.message("@que@They won't be reforming after that!");
        await world.sleepTicks(5);
        player.message(
            '@que@Among the bone dust, you find an interesting-looking ring'
        );
        give(player, RING_OF_SKULL_ID, 1);
        await world.sleepTicks(5);
        player.message(
            '@gre@Congratulations! You have completed A Bone to Pick!'
        );
        updateStage(player, COMPLETED);
    }
}

async function makeAluminiumCog(player) {
    const { world } = player;

    if (!ifheld(player, HAMMER_ID)) {
        player.message('@que@Despite the apparent malleability of the strange ' +
            'metal');
        player.message('@que@You will still need a hammer to work it');
        return;
    }

    player.message('@que@You hammer the strange metal');
    await world.sleepTicks(5);
    player.message('@que@It is surprisingly easy to work');
    await world.sleepTicks(5);
    player.message('@que@You manage to form the metal into a cog');
    player.inventory.remove(ALUMINIUM_BAR_ID, 1);
    give(player, ALUMINIUM_COG_ID, 1);
}

async function apothecaryDialogue(player, npc) {
    await npc.say(
        "You're in luck",
        'Normally I would ask you to go fetch me some potion ingredients in ' +
            'exchange',
        'But I just recently picked up a brand new set and don\'t need my old ' +
            'one anymore',
        'Here you go!'
    );
    player.message('@que@The apothecary hands you a worn-looking pestle and ' +
        'mortar');
    give(player, CHIPPED_PESTLE_AND_MORTAR_ID, 1);
}

async function lilyDialogue(player, npc) {
    switch (getStage(player)) {
        case NOT_STARTED:
        case HECKLED_ONCE:
        case HECKLED_TWICE:
        case HECKLED_THRICE:
            await npc.say(
                'Oh my gosh, yes',
                'They have been causing so much trouble at my Rimmington patch',
                'Can you please go there and get them to go away?',
                'They harass anyone who tries to harvest the pumpkins!'
            );
            updateStage(player, SPOKE_TO_LILY);
            break;
        case SPOKE_TO_LILY:
            await npc.say(
                'I have a patch of land over by Rimmington',
                'Can you please try to make the skeletons go away?'
            );
            break;
        case HEARD_AMAZING_SONG:
            await player.say('They just sang some silly song');
            await npc.say(
                'Yeah, I figured they might not leave so easily',
                'Though I do think their song is kind of cute',
                "Anyways, I've been asking around...",
                'Perhaps you can go talk to Professor Oddenstein?',
                "I've heard he has some experience dealing with odd things"
            );
            break;
        case COMPLETED:
            player.message('@que@Lily beams at you');
            await player.world.sleepTicks(5);
            await npc.say(
                'Oh really?',
                'Thank you so much',
                'They have really been putting a damper on things',
                'In return for getting rid of the skeletons...',
                "You can harvest my pumpkins if you'd like",
                'You can probably bake them into a pie or something'
            );
            break;
        default:
            break;
    }
}

async function oddensteinDialogue(player, npc) {
    const { world } = player;

    switch (getStage(player)) {
        case HEARD_AMAZING_SONG: {
            await npc.say(
                'Skeletons, you say?',
                'Usually giving them a good smack will do the trick'
            );
            if (
                (await player.ask(
                    [
                        "These ones don't seem so easy to get rid of",
                        "Okay, I'll go give that a try"
                    ],
                    false
                )) !== 0
            ) {
                return;
            }
            await npc.say(
                'Well then',
                'Perhaps they are magic skeletons',
                "As far as I know, there's really only one way to get rid of " +
                    'those'
            );
            if (
                (await player.ask(
                    [
                        "What's that?",
                        'Well are you going to tell me anytime soon?'
                    ],
                    false
                )) === 1
            ) {
                await npc.say("I'm getting to it!", 'No need to be rude!');
            }
            await npc.say(
                'First, you will need to break them apart',
                'This is pretty simple',
                'Like I said earlier, you just need to give them a good whack',
                'Secondly, you will need to crush their bones so they cannot ' +
                    'reform'
            );
            await player.say('Crush their bones?', 'How do I do that?');
            await npc.say(
                'Luckily for you',
                "I've actually conceptualized something recently that can help " +
                    'us out'
            );
            player.message(
                '@que@Professor Oddenstein shows you some blueprints for an ' +
                    'odd-looking device'
            );
            await world.sleepTicks(5);
            await npc.say(
                'I call this device a "Bonecrusher"',
                'It will allow you to crush bones down to basically nothing',
                'I will need your help gathering the components though'
            );

            const choices = ['What do you need?', "I don't have time for this"];
            if (player.questStages.ernestTheChicken === -1) {
                choices.push(
                    'You need me to help you with one of your inventions again?'
                );
            }
            const choice = await player.ask(choices, false);

            if (choice === 1) {
                return;
            }

            if (choice === 2) {
                await npc.say(
                    "I don't have the time to go out looking for things",
                    'Nor the energy'
                );
                if (
                    (await player.ask(
                        [
                            'Fair enough, what do you need?',
                            "There's no way I'm doing this again"
                        ],
                        false
                    )) !== 0
                ) {
                    return;
                }
            }

            await npc.say(
                'I will need a pestle and mortar',
                'A hammer',
                'A wooden box',
                'And a metal cog',
                'If you bring me these three things I can make you a bonecrusher',
                'That should help you get rid of those sardonic skeletons'
            );
            updateStage(player, TALKED_TO_ODDENSTEIN);
            // fall through
        }
        case TALKED_TO_ODDENSTEIN: {
            if (
                (ifheld(player, CHIPPED_PESTLE_AND_MORTAR_ID) ||
                    ifheld(player, PESTLE_AND_MORTAR_ID)) &&
                ifheld(player, HAMMER_ID) &&
                ifheld(player, WOODEN_BOX_ID) &&
                ifheld(player, ALUMINIUM_COG_ID)
            ) {
                await player.say('I have all the components you asked for');
                await npc.say('Give em here then');
                player.message(
                    '@que@You hand all the components to Professor Oddenstein'
                );
                if (ifheld(player, CHIPPED_PESTLE_AND_MORTAR_ID)) {
                    player.inventory.remove(CHIPPED_PESTLE_AND_MORTAR_ID, 1);
                } else if (ifheld(player, PESTLE_AND_MORTAR_ID)) {
                    player.inventory.remove(PESTLE_AND_MORTAR_ID, 1);
                }
                player.inventory.remove(HAMMER_ID, 1);
                player.inventory.remove(WOODEN_BOX_ID, 1);
                player.inventory.remove(ALUMINIUM_COG_ID, 1);
                await world.sleepTicks(5);
                player.message(
                    '@que@Professor Oddenstein tinkers with the components for ' +
                        'a moment'
                );
                await world.sleepTicks(5);
                player.message(
                    '@que@He hands you a very odd-looking contraption'
                );
                give(player, BONECRUSHER_ID, 1);
                await world.sleepTicks(5);
                await npc.say(
                    'There you are',
                    'Try not to lose it',
                    "It's one of a kind"
                );
                updateStage(player, FINISHED_BONECRUSHER);
                return;
            }

            let componentLocation;
            do {
                componentLocation = await player.ask(
                    [
                        'Where can I find a pestle and mortar?',
                        'Where can I find a hammer?',
                        'Where can I find a wooden box?',
                        'Where can I find a metal cog?',
                        "I'll get to looking then"
                    ],
                    false
                );
                if (componentLocation === 0) {
                    await npc.say(
                        'Perhaps you can go ask the apothecary in Varrock for ' +
                            'one?'
                    );
                } else if (componentLocation === 1) {
                    await npc.say(
                        'You can find one in any general store for pretty cheap',
                        'I think you can usually find them for a single coin',
                        'The closest general stores are in Rimmington or ' +
                            'Lumbridge'
                    );
                } else if (componentLocation === 2) {
                    if (player.questStages.ernestTheChicken === -1) {
                        await npc.say(
                            'Huh',
                            'You seemed so resourceful',
                            "I'm surprised you don't know how to make one " +
                                'yourself',
                            "Perhaps carpentry just isn't one of your strong " +
                                'suits.'
                        );
                    }
                    await npc.say(
                        'I would head to the Lumber Mill northeast of Varrock',
                        "I'm sure you can find someone there to help you"
                    );
                } else if (componentLocation === 3) {
                    await npc.say(
                        'The cog needs to be made out of a special metal',
                        "I have the metal, but I don't have the skill to work " +
                            'it into a cog',
                        'Maybe you can give it a try?'
                    );
                    if (!ifheld(player, ALUMINIUM_BAR_ID)) {
                        await npc.say(
                            'Here',
                            'Take this and see what you can do with it'
                        );
                        player.message(
                            '@que@Professor Oddenstein hands you a bar of a ' +
                                "material you've never seen before"
                        );
                        give(player, ALUMINIUM_BAR_ID, 1);
                    }
                }
            } while (componentLocation !== 4);
            break;
        }
        case FINISHED_BONECRUSHER:
        case COMPLETED:
            await npc.say(
                "Didn't I tell you to take care of it?",
                'Luckily for you I made a spare'
            );
            player.message(
                '@que@Professor Oddensein, despite looking annoyed, hands you ' +
                    'another bonecrusher'
            );
            give(player, BONECRUSHER_ID, 1);
            break;
        default:
            break;
    }
}

async function pumpkinPatchDialogue(player) {
    const { world } = player;

    let spookie = ifnearvisnpc(player, SPOOKIE_ID, 5);
    let scarie = ifnearvisnpc(player, SCARIE_ID, 5);

    switch (getStage(player)) {
        case SPOKE_TO_LILY: {
            if (!spookie) {
                spookie = addnpc(
                    player,
                    SPOOKIE_ID,
                    player.x + 1,
                    player.y + 1,
                    2 * 60000
                );
            }
            if (!scarie) {
                scarie = addnpc(
                    player,
                    SCARIE_ID,
                    player.x - 1,
                    player.y - 1,
                    2 * 60000
                );
            }

            await world.sleepTicks(3);

            await spookie.say('Hey, it\'s ' + player.username + ' again!');
            await scarie.say("Let's sing our favorite song!");
            await spookie.say('We\'re Spookie and Scarie', 'Skeleton and bone');
            await scarie.say(
                'We poke fun at the passerby',
                'We heckle all the skillers'
            );
            await spookie.say(
                'We specialize in causing pain',
                'Spreading fear and doubt'
            );
            await scarie.say(
                'And if you cannot take the fun',
                "We'll simply chase you out!"
            );
            await spookie.say(
                'There was the year we stole all the halloween crackers!'
            );
            await scarie.say(
                'I remember the players all standing in the fall leaves...',
                '...with their little empty pumpkin baskets!'
            );
            await spookie.say('Hahahahaha!');
            await scarie.say(
                "We're Spookie and Scarie",
                'Our hearts are painted black'
            );
            await spookie.say(
                "We can't be killed, we can't be stopped",
                'Our life source is dark magic'
            );
            await scarie.say(
                "Cheeky, free, we're here to give",
                'The players a bad dream'
            );
            await spookie.say(
                "We'll make sure that the fun is ours",
                "In this year's Halloween!"
            );
            await spookie.say("We're Spookie and Scarie!");
            await scarie.say("We're Spookie and Scarie!");
            await spookie.say('Doomed, you!', "You're doomed for all time!");
            await scarie.say(
                'Your future is a horror story',
                'In our song and rhyme'
            );
            await spookie.say('Your fate is sealed', 'No matter what you do');
            await scarie.say(
                "So have your fun, but when it's done",
                "One day we'll come for you!"
            );
            updateStage(player, HEARD_AMAZING_SONG);
            break;
        }
        case HEARD_AMAZING_SONG:
        case TALKED_TO_ODDENSTEIN:
        case FINISHED_BONECRUSHER: {
            if (!spookie && !attr(player, 'ground_spookie')) {
                if (ifheld(player, SPOOKIES_BONES_ID)) {
                    player.message(
                        "@que@Spookie's bones pop out of your backpack and " +
                            'reform!'
                    );
                    player.inventory.remove(SPOOKIES_BONES_ID, 1);
                }
                spookie = addnpc(
                    player,
                    SPOOKIE_ID,
                    player.x + 1,
                    player.y + 1,
                    60000
                );
            }
            if (!scarie && !attr(player, 'ground_scarie')) {
                if (ifheld(player, SCARIES_BONES_ID)) {
                    player.message(
                        "@que@Scarie's bones pop out of your backpack and " +
                            'reform!'
                    );
                    player.inventory.remove(SCARIES_BONES_ID, 1);
                }
                scarie = addnpc(
                    player,
                    SCARIE_ID,
                    player.x - 1,
                    player.y - 1,
                    60000
                );
            }

            await world.sleepTicks(3);

            if (spookie) {
                await spookie.say('Hey, it\'s ' + player.username + ' again!');
            } else if (scarie) {
                await scarie.say('Hey, it\'s ' + player.username + ' again!');
            }
            break;
        }
        default:
            player.message(
                "@que@These aren't yours; you should probably leave them be"
            );
            break;
    }
}

async function toddWoodenBoxDialogue(player, npc) {
    const { world } = player;

    const hasPlanks = ifheld(player, PLANK_ID, 5);
    const hasLogs = ifheld(player, LOGS_ID, 5);

    if (hasLogs || hasPlanks) {
        const word = hasLogs ? 'logs' : 'planks';
        const id = hasLogs ? LOGS_ID : PLANK_ID;
        await player.say('I have the ' + word + ' you asked for');
        player.message('@que@Todd takes the ' + word + ' from you');
        player.inventory.remove(id, 5);
        await world.sleepTicks(3);
        if (hasLogs) {
            player.message(
                '@que@Todd runs the logs through the mill to convert them into ' +
                    'planks'
            );
            await world.sleepTicks(3);
        }
        player.message(
            '@que@Todd arranges the planks and hammers some nails into them'
        );
        await world.sleepTicks(3);
        player.message("@que@You don't really understand what he's doing");
        await world.sleepTicks(3);
        player.message('@que@After a minute, Todd hands you a wooden box');
        give(player, WOODEN_BOX_ID, 1);
        await world.sleepTicks(3);
        await npc.say(
            'You really should learn a thing or two about carpentry',
            'Imagine not knowing how to make something as simple as a box'
        );
        return;
    }

    await npc.say(
        'A wooden box you say?',
        "If it'll get you out of here sure",
        'Should be pretty simple',
        "Surprised you can't figure it out for yourself",
        "I assume you don't know much about carpentry then",
        "All you'll need is a hammer, some nails, and 5 planks",
        "I've already got some nails and a hammer",
        'If you bring me 5 logs or 5 planks I can make the box for you'
    );
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = getStage(player);

    // Spookie / Scarie (blockTalkNpc)
    if (npc.id === SPOOKIE_ID || npc.id === SCARIE_ID) {
        player.engage(npc);
        await skeletonTalk(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === LILY_ID) {
        const lilyHasLines =
            stage <= HECKLED_THRICE ||
            stage === SPOKE_TO_LILY ||
            stage === HEARD_AMAZING_SONG ||
            stage === COMPLETED;

        if (!lilyHasLines) {
            return false;
        }

        player.engage(npc);
        await npc.say('Hello my lovely!', 'How can I help you?');

        // The stage-appropriate ABTP option (option ordering).
        let optionText;
        if (stage === COMPLETED) {
            optionText = 'The skeletons have been dealt with';
        } else if (stage <= HECKLED_THRICE) {
            optionText = 'Have two skeletons been bothering you?';
        } else if (stage === SPOKE_TO_LILY) {
            optionText = 'Where am I supposed to go?';
        } else {
            optionText = 'The skeletons will not leave';
        }

        const choice = await player.ask(
            ['What are you doing here?', optionText],
            false
        );

        if (choice === 0) {
            await npc.say(
                "I'm just out here enjoying nature!",
                'I love being with all the plants and animals...',
                '...and smelling the fresh air!',
                'I also love helping new adventurers learn harvesting!',
                "So if you have any questions, don't hesitate to ask!"
            );
        } else if (choice === 1) {
            await lilyDialogue(player, npc);
        }

        player.disengage();
        return true;
    }

    if (npc.id === ODDENSTEIN_ID) {
        const lostCrusher =
            (stage === FINISHED_BONECRUSHER || stage === COMPLETED) &&
            !ifheld(player, BONECRUSHER_ID);
        const oddHasLines =
            stage === HEARD_AMAZING_SONG ||
            stage === TALKED_TO_ODDENSTEIN ||
            lostCrusher;

        if (!ernestInactive(player) || !oddHasLines) {
            return false;
        }

        player.engage(npc);
        await npc.say(
            'Be careful in here',
            'Lots of dangerous equipment in here'
        );

        // merged menu: authentic options plus the quest option
        let abtpOption;
        if (stage === HEARD_AMAZING_SONG) {
            abtpOption = 'Can you help me get rid of some annoying skeletons?';
        } else if (stage === TALKED_TO_ODDENSTEIN) {
            abtpOption = 'About the Bonecrusher';
        } else {
            abtpOption = "I've lost the Bonecrusher!";
        }

        const choice = await player.ask(
            ['What does this machine do?', 'Is this your house?', abtpOption],
            false
        );

        if (choice === 0) {
            await npc.say(
                'Nothing at the moment',
                "As it's broken",
                "It's meant to be a transmutation machine",
                'It has also spent time as a time travel machine',
                'And a dramatic lightning generator',
                'And a thing for generating monsters'
            );
        } else if (choice === 1) {
            await npc.say(
                "No, I'm just one of the tenants",
                'It belongs to the count',
                'Who lives in the basement'
            );
        } else if (choice === 2) {
            await oddensteinDialogue(player, npc);
        }

        player.disengage();
        return true;
    }

    if (npc.id === APOTHECARY_ID) {
        if (
            stage !== TALKED_TO_ODDENSTEIN ||
            ifheld(player, CHIPPED_PESTLE_AND_MORTAR_ID)
        ) {
            return false;
        }

        player.engage(npc);
        await npc.say(
            'I am the apothecary',
            'I have potions to brew. Do you need anything specific?'
        );
        const choice = await player.ask(
            ['Can I have a pestle and mortar?', 'Never mind'],
            false
        );
        if (choice === 0) {
            await apothecaryDialogue(player, npc);
        }
        player.disengage();
        return true;
    }

    if (npc.id === TODD_SANDYMAN_ID) {
        if (stage !== TALKED_TO_ODDENSTEIN || ifheld(player, WOODEN_BOX_ID)) {
            return false;
        }

        player.engage(npc);
        await npc.say("Hey, get out of here!", "You'll just get yourself hurt");
        const choice = await player.ask(
            ['Alright fine!', 'Can you help me make a wooden box?'],
            false
        );
        if (choice === 1) {
            await toddWoodenBoxDialogue(player, npc);
        }
        player.disengage();
        return true;
    }

    return false;
}

// Spookie/Scarie death interception (blockKillNpc + onKillNpc).
async function onNPCDeath(player, npc) {
    if (npc.id !== SPOOKIE_ID && npc.id !== SCARIE_ID) {
        return false;
    }

    if (!player) {
        return false;
    }

    const hasCrusher = ifheld(player, BONECRUSHER_ID);

    // restore hits synchronously to cancel death and continue the fight
    if (!hasCrusher) {
        npc.skills.hits.current = npc.skills.hits.base;
    }

    await skeletonDeath(player, npc, hasCrusher);

    // truthy return skips drops, removal, and xp
    return true;
}

// Bonecrusher + Spookie's/Scarie's bones (blockUseInv/onUseInv).
async function onUseWithInventory(player, item, target) {
    if (!questsEnabled(player)) {
        return false;
    }

    const isBonecrusher =
        item.id === BONECRUSHER_ID || target.id === BONECRUSHER_ID;
    if (!isBonecrusher) {
        return false;
    }

    const bonesId = item.id === BONECRUSHER_ID ? target.id : item.id;
    if (bonesId !== SPOOKIES_BONES_ID && bonesId !== SCARIES_BONES_ID) {
        return false;
    }

    // blockUseInv gate: only at FINISHED_BONECRUSHER.
    if (getStage(player) !== FINISHED_BONECRUSHER) {
        return false;
    }

    await useBonecrusher(player, bonesId);
    return true;
}

// aluminium bar on an anvil makes a cog
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        (gameObject.id === ANVIL_ID || gameObject.id === DORICS_ANVIL_ID) &&
        item.id === ALUMINIUM_BAR_ID
    ) {
        await makeAluminiumCog(player);
        return true;
    }

    return false;
}

// pumpkin patch harvest dialogue
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === PUMPKIN_SCENERY_ID) {
        if (getStage(player) !== COMPLETED) {
            await pumpkinPatchDialogue(player);
            return true;
        }
        return false;
    }

    return false;
}

module.exports = {
    onTalkToNPC,
    onNPCDeath,
    onUseWithInventory,
    onUseWithGameObject,
    onGameObjectCommandOne
};
