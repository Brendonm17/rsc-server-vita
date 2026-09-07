// Combat Odyssey: custom repeatable tiered kill-task minigame. start via Sir
// Radimus Erkle (Legends' Guild); repeats restart via Biggum Flodrot in the
// garden. 14 tiers (0..13), each a random set of kill-N tasks from a tier master;
// tiers 9..13 are driven by Radimus, ending with the King Black Dragon and a
// choice of dragon legs/skirt, then prestige. cache keys combat_odyssey (intro
// stage string, or "tier:task:kills"), co_tier_progress (task bitmask), co_prestige.

// data model

// loaded once from ./data.json. each tier: { tierId, tierMasterId, rewards, tasks };
// each task: taskId, description, npcIds, kills, monsterInfoDialog.
// must be a static string require (a computed require dies in the vita bundle).
const TIERS = (() => {
    const raw = require('./data.json');
    const tiersJson = raw[Object.keys(raw)[0]]; // == raw.tiers
    const tiers = [];
    for (const tierJson of tiersJson) {
        const tier = {
            tierId: tierJson.tierId,
            tierMasterId: tierJson.tierMasterId,
            rewards: tierJson.rewards.map((r) => [r.itemId, r.amount]),
            tasks: []
        };
        let taskId = 0;
        for (const taskJson of tierJson.tasks) {
            tier.tasks.push({
                taskId: taskId++,
                description: taskJson.description,
                npcIds: taskJson.npcIds.slice(),
                kills: taskJson.kills,
                monsterInfoDialog: taskJson.monsterInfoDialog.slice()
            });
        }
        tiers.push(tier);
    }
    return tiers;
})();

function getTier(tierId) {
    return TIERS[tierId] || null;
}

function getTask(tier, taskId) {
    if (!tier) {
        return null;
    }
    return tier.tasks[taskId] || null;
}

function getTotalTasks(tier) {
    return tier.tasks.length;
}

// Tier.getTasksAndCounts(): "<kills> <description>" per task.
function getTasksAndCounts(tier) {
    return tier.tasks.map((t) => `${t.kills} ${t.description}`);
}

// ids

const BIGGUM_FLODROT_ITEM = 1555;
const BIGGUM_FLODROT_NPC = 828;

const RAW_CHICKEN = 133;
const RAW_OOMLIE_MEAT = 1268;
const RAW_OOMLIE_MEAT_PARCEL = 1280;
const COOKED_OOMLIE_MEAT_PARCEL = 1269;

const DRAGON_PLATE_MAIL_LEGS = 1434;
const DRAGON_PLATED_SKIRT = 1435;

const BIGGUM_FAVORITE_FOOD = [
    RAW_CHICKEN,
    RAW_OOMLIE_MEAT,
    RAW_OOMLIE_MEAT_PARCEL,
    COOKED_OOMLIE_MEAT_PARCEL
];

// INTRODUCTION STAGES
const NOT_STARTED = 0;
const TALKED_TO_RADIMUS = 1;
const MET_BIGGUM = 2;
const IN_PROGRESS = -1;

// Task info enum indices (into the "tier:task:kills" cache string)
const CURRENT_TIER = 0;
const CURRENT_TASK = 1;
const CURRENT_KILLS = 2;

// Sir Radimus Erkle (npc id 735, the one legends-quest.js defers to at stage -1)
const RADIMUS_ID = 735;

// Siegfried Erkle introduces Biggum (npc 779)

// small helpers mirroring OpenRSC Functions.*

function inArray(arr, value) {
    return arr.indexOf(value) !== -1;
}

function ifheld(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

function give(player, id, amount = 1) {
    player.inventory.add(id, amount);
}

function remove(player, id, amount = 1) {
    player.inventory.remove(id, amount);
}

function mes(player, ...messages) {
    player.message(...messages);
}

// DataConversions.random(low, high): inclusive both ends.
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// Functions.thinkbubble(item) over the player.
function thinkbubble(player, itemId) {
    player.sendBubble(itemId);
}

// quest-tab messages with a default 5-tick delay between lines
async function biggumSay(player, arg1, ...rest) {
    let tickDelay = 5;
    let messages;
    if (typeof arg1 === 'number') {
        tickDelay = arg1;
        messages = rest;
    } else {
        messages = [arg1, ...rest];
    }
    for (const message of messages) {
        player.message(`@que@@yel@Biggum Flodrot: ${message}`);
        await player.world.sleepTicks(tickDelay);
    }
}

// player.say(...) helper. player.say already echoes each line as chat.
async function say(player, ...messages) {
    await player.say(...messages);
}

// npc.say(...) helper.
async function npcsay(npc, ...messages) {
    await npc.say(...messages);
}

// cache accessors

// parses combat_odyssey: plain number = intro stage, tier:task:kills form = in progress, unset = not started
function getIntroStage(player) {
    if (!Object.prototype.hasOwnProperty.call(player.cache, 'combat_odyssey')) {
        return NOT_STARTED;
    }
    const value = player.cache.combat_odyssey;
    const n = Number(value);
    if (Number.isInteger(n) && String(value).indexOf(':') === -1) {
        return n;
    }
    return IN_PROGRESS;
}

function setIntroStage(player, stage) {
    player.cache.combat_odyssey = String(stage);
}

// reads tier, task, or kills from the cache string; -1 if not in progress
function getCurrentTaskInfo(player, retrieve) {
    if (!Object.prototype.hasOwnProperty.call(player.cache, 'combat_odyssey')) {
        return -1;
    }
    const data = String(player.cache.combat_odyssey).split(':');
    if (data.length < 3) {
        return -1;
    }
    return parseInt(data[retrieve], 10);
}

function getCurrentTier(player) {
    return getCurrentTaskInfo(player, CURRENT_TIER);
}

function getCurrentTask(player) {
    return getCurrentTaskInfo(player, CURRENT_TASK);
}

function getCurrentKills(player) {
    return getCurrentTaskInfo(player, CURRENT_KILLS);
}

// rewrites tier:task:kills; setting tier resets task and kills
function updateCurrentTaskInfo(player, newValue, save) {
    switch (save) {
        case CURRENT_TIER:
            player.cache.combat_odyssey = `${newValue}:-1:0`;
            break;
        case CURRENT_TASK:
            player.cache.combat_odyssey = `${getCurrentTier(player)}:${newValue}:0`;
            break;
        case CURRENT_KILLS:
            player.cache.combat_odyssey = `${getCurrentTier(player)}:${getCurrentTask(
                player
            )}:${newValue}`;
            break;
    }
}

// mod/admin/dev checks all collapse onto isAdministrator()
function isStaff(player) {
    return !!(player.isAdministrator && player.isAdministrator());
}

function getPrestige(player) {
    if (!Object.prototype.hasOwnProperty.call(player.cache, 'co_prestige')) {
        return 0;
    }
    return player.cache.co_prestige;
}

function incrementPrestige(player) {
    const newPrestige = getPrestige(player) + 1;
    player.cache.co_prestige = newPrestige;
    return newPrestige;
}

// tier-progress bitmask (co_tier_progress)
function hasTierProgress(player) {
    return Object.prototype.hasOwnProperty.call(player.cache, 'co_tier_progress');
}

function getTierProgress(player) {
    return player.cache.co_tier_progress || 0;
}

function setTierProgress(player, value) {
    player.cache.co_tier_progress = value;
}

function resetTierProgress(player) {
    player.cache.co_tier_progress = 0;
}

// completeTask: set bit taskId in co_tier_progress.
function completeTask(player, taskId) {
    setTierProgress(player, getTierProgress(player) | (1 << taskId));
}

function isTaskAlreadyComplete(player, taskId) {
    if (!hasTierProgress(player)) {
        return false;
    }
    return (getTierProgress(player) & (1 << taskId)) !== 0;
}

// isTierCompleted: all tasks' bits set == 2^totalTasks - 1.
function isTierCompleted(player) {
    if (!hasTierProgress(player)) {
        return false;
    }
    const tier = getTier(getCurrentTier(player));
    if (!tier) {
        return false;
    }
    const totalTasks = getTotalTasks(tier);
    return getTierProgress(player) === Math.pow(2, totalTasks) - 1;
}

// task progression

function getTaskNpcs(player) {
    const tier = getTier(getCurrentTier(player));
    if (!tier) {
        return null;
    }
    const task = getTask(tier, getCurrentTask(player));
    if (!task) {
        return null;
    }
    return task.npcIds;
}

function isTaskCompleted(player) {
    const tier = getTier(getCurrentTier(player));
    if (!tier) {
        return false;
    }
    const task = getTask(tier, getCurrentTask(player));
    if (!task) {
        return false;
    }
    return getCurrentKills(player) >= task.kills;
}

function incrementTaskKills(player) {
    updateCurrentTaskInfo(
        player,
        getCurrentTaskInfo(player, CURRENT_KILLS) + 1,
        CURRENT_KILLS
    );
}

// pick a random not-yet-completed task in the current tier
function assignNewTask(player) {
    const tierId = getCurrentTier(player);
    const tier = getTier(tierId);
    if (!tier) {
        return;
    }

    let newTaskId = random(0, getTotalTasks(tier) - 1);
    const triedTasks = [];

    while (isTaskAlreadyComplete(player, newTaskId)) {
        triedTasks.push(newTaskId);
        // Should never happen: callers check isTierCompleted first.
        if (triedTasks.length === getTotalTasks(tier)) {
            return;
        }
        do {
            newTaskId = random(0, getTotalTasks(tier) - 1);
        } while (triedTasks.indexOf(newTaskId) !== -1);
    }

    updateCurrentTaskInfo(player, newTaskId, CURRENT_TASK);
}

// move to a tier, reset its progress, assign the first task
function assignNewTier(player, tierId) {
    updateCurrentTaskInfo(player, tierId, CURRENT_TIER);
    resetTierProgress(player);
    assignNewTask(player);
}

function getCurrentTierMasterId(player) {
    const tier = getTier(getCurrentTier(player));
    if (!tier) {
        return -1;
    }
    return tier.tierMasterId;
}

// giveRewards(npc): hand out the current tier's reward items.
async function giveRewards(player, npc) {
    const tier = getTier(getCurrentTier(player));
    if (!tier) {
        return;
    }
    for (const [itemId, amount] of tier.rewards) {
        const itemName = itemDefName(player, itemId);
        const npcName = npc.definition.name;
        give(player, itemId, amount);
        mes(player, `${npcName} hands you ${amount} ${itemName}`);
        await player.world.sleepTicks(3);
    }
}

// item name from the shared items table
const ITEM_DEFS = require('@2003scape/rsc-data/config/items');
function itemDefName(player, itemId) {
    return ITEM_DEFS[itemId] ? ITEM_DEFS[itemId].name : `item ${itemId}`;
}

// Biggum backpack lifecycle (meetBiggum / recoverBiggum / missing checks)

// returns true (and messages) when Biggum is not held; used to gate tier hand-off
async function biggumMissing(player) {
    if (!ifheld(player, BIGGUM_FLODROT_ITEM, 1)) {
        mes(player, 'You need Biggum Flodrot to continue the Odyssey!');
        await player.world.sleepTicks(3);
        mes(player, "You can probably find him at the Legend's Guild");
        return true;
    }
    return false;
}

// biggum scampers back into the backpack mid-odyssey
async function recoverBiggum(player) {
    mes(
        player,
        'A small goblin scampers across the floor and jumps into your backpack'
    );
    give(player, BIGGUM_FLODROT_ITEM, 1);
    await player.world.sleepTicks(3);
}

async function meetBiggum(player) {
    thinkbubble(player, BIGGUM_FLODROT_ITEM);
    mes(
        player,
        'A small goblin scampers across the floor and jumps into your backpack'
    );
    give(player, BIGGUM_FLODROT_ITEM, 1);
    await player.world.sleepTicks(3);
    await biggumSay(player, 'Oi! Psst! You there, big human person!');
    await say(player, 'Huh? Get out of my backpack you awful creature!');
    await biggumSay(player, 'Am absolutely not awful! Am here to make proposition');
    await say(
        player,
        'What sort of proposition could a backpack goblin possibly make?'
    );
    await biggumSay(
        player,
        'You goin\' on a big long killing spree, yes?',
        'Me looking for big long adventure, me join big dumb human'
    );
    await say(player, 'And why should I let you join me?');
    await biggumSay(
        player,
        'Big long killing spree has many tasks',
        'Many things to keep track of, yes?',
        'Biggum keep track of dirty, boring paperwork for you',
        'And big dumb human brings Biggum on big long killing spree'
    );
    await say(player, 'I suppose that could work...', "what's in it for you?");
    await biggumSay(
        player,
        'Me greatest adventurer of ironclaw tribe',
        'Only greatest adventures good enough for Biggum Flodrot'
    );
    await say(player, 'Very well then, where should we start?');
    await biggumSay(
        player,
        'Now go talk with goblin generals in village of north Fallington',
        'They tell big dumb human what first things to kill'
    );
    setIntroStage(player, MET_BIGGUM);
}

// Radimus dialogue

async function radimusDialog(player, npc) {
    const introStage = getIntroStage(player);
    switch (introStage) {
        case NOT_STARTED:
            await npcsay(
                npc,
                'Hello there! How are you enjoying the Legends Guild?'
            );
            if (getPrestige(player) < 1) {
                await say(player, "It's great!");
                await npcsay(
                    npc,
                    'I have a task for you that is truly fit for a legend',
                    'You will fight beasts in the highest mountains and the darkest caves',
                    'From everyday foes to obscure, forgotten monsters',
                    'A combat odyssey if you will',
                    'If you do this, I will reward you an item truly fit for a legend',
                    'Something no one has worn for hundreds of years, not even me',
                    'What say you?'
                );
                const choice = await player.ask(
                    [
                        'That sounds like just the task for me!',
                        'That sounds like more than I am currently able to handle'
                    ],
                    true
                );
                if (choice !== 0) {
                    return;
                }
                await npcsay(
                    npc,
                    'Excellent!',
                    'You may go and talk to Siegfried upstairs',
                    'He will get you started'
                );
                setIntroStage(player, TALKED_TO_RADIMUS);
            } else {
                await say(player, 'Can I do the odyssey again?');
                await npcsay(
                    npc,
                    'Certainly!',
                    'You may start it again by speaking to your goblin friend in the garden',
                    'You two seem to make quite the team'
                );
                // intro stage not set; biggum is picked up the repeat way here
            }
            break;
        case TALKED_TO_RADIMUS:
            await npcsay(
                npc,
                'You should go and talk to Siegfried upstairs',
                'He will get you started'
            );
            break;
        case MET_BIGGUM:
            await npcsay(npc, 'Hope everything is going well with your quest!');
            break;
        case IN_PROGRESS: {
            // player has Biggum and finished the tier (guaranteed by the onTalkToNPC guard)
            const currentTier = getCurrentTier(player);
            let newTier;
            switch (currentTier) {
                case 9:
                    newTier = 10;
                    assignNewTier(player, newTier);
                    await npcsay(
                        npc,
                        'You have come far, legend!',
                        "You're on the final leg of this long voyage"
                    );
                    if (getPrestige(player) < 1) {
                        await say(player, 'Well this gobli--');
                        await biggumSay(player, 'Shhh, dumb human not talk about Biggum!');
                    }
                    await npcsay(
                        npc,
                        'I shall send you on your last few missions myself',
                        'For now, you must go kill'
                    );
                    await npcsay(npc, ...getTasksAndCounts(getTier(newTier)));
                    await npcsay(npc, 'First though, take this', "I'm sure it will help");
                    await giveRewards(player, npc);
                    await npcsay(npc, 'Return to me when you are done');
                    break;
                case 10:
                    newTier = 11;
                    assignNewTier(player, newTier);
                    await npcsay(
                        npc,
                        'Ah, back at last!',
                        "Let's make it a bit more challenging for you, shall we?",
                        'You now have to kill'
                    );
                    await npcsay(npc, ...getTasksAndCounts(getTier(newTier)));
                    await npcsay(npc, 'And of course return to me once completed');
                    break;
                case 11:
                    newTier = 12;
                    assignNewTier(player, newTier);
                    await npcsay(
                        npc,
                        'I am beginning to believe we shall see this to the end, my friend!',
                        'Your final mission is to kill'
                    );
                    await npcsay(npc, ...getTasksAndCounts(getTier(newTier)));
                    await npcsay(
                        npc,
                        "Come back when it's done, and you will have your reward"
                    );
                    break;
                case 12:
                    assignNewTier(player, 13);
                    await npcsay(
                        npc,
                        "You've done it!",
                        "You've truly earned your place in the halls of legend",
                        'Though I must confess, I have one last thing for you to do',
                        'There is one savage beast yet left to kill',
                        'You must go kill...',
                        'The three-headed dragon of Jarn!',
                        '...',
                        'Hahaha, I speak merely in jest',
                        'That foul creature was killed by Arrav ages ago',
                        'There is however a beast in the depths of the wilderness',
                        'It is known as the king black dragon',
                        'Kill this monster once, and you will be done'
                    );
                    await say(player, 'I certainly hope so...');
                    break;
                case 13: {
                    await npcsay(
                        npc,
                        'Well done, legend!',
                        "You've completed the combat odyssey!",
                        'As promised, a reward truly fit for a legend',
                        'As a matter of fact, you will get to pick between two',
                        'Dragon Plate Mail Legs or a Dragon Plated Skirt'
                    );
                    const choice = await player.ask(
                        ['Dragon Plate Mail Legs', 'Dragon Plated Skirt'],
                        true
                    );
                    if (choice === -1) {
                        return;
                    }
                    const itemToGive =
                        choice === 0 ? DRAGON_PLATE_MAIL_LEGS : DRAGON_PLATED_SKIRT;
                    await npcsay(npc, 'Here you are', 'You truly deserve them');

                    // clears odyssey caches so the reward can't be re-claimed and it can repeat
                    delete player.cache.co_tier_progress;
                    delete player.cache.combat_odyssey;

                    give(player, itemToGive, 1);
                    mes(player, 'Radimus gives you your reward');
                    await player.world.sleepTicks(3);
                    if (getPrestige(player) < 1) {
                        await biggumSay(
                            player,
                            'Biggum join human on big long killing spree',
                            'Biggum complete quest Radimus gave',
                            'Biggum legend now as Radimus promise'
                        );
                        mes(player, 'Radimus looks surprised');
                        await player.world.sleepTicks(3);
                        await npcsay(
                            npc,
                            'You actually managed to kill one of everything?',
                            'The legends guild has never had a goblin before',
                            "But I suppose it's only fair if you completed such a hard quest"
                        );
                        await say(
                            player,
                            'Uhh...',
                            "Biggum actually didn't do any killing...",
                            'It was-'
                        );
                        await npcsay(
                            npc,
                            'Congratulations, Biggum Flodrot!',
                            'The legends guild welcomes you as its newest member'
                        );
                        await say(player, 'Well, whatever I guess...');
                        remove(player, BIGGUM_FLODROT_ITEM, 1);
                        mes(player, 'Biggum scampers away');
                        await player.world.sleepTicks(3);
                        mes(player, 'Probably to go retrieve his very own Cape of legends');
                        await player.world.sleepTicks(3);
                    } else {
                        await npcsay(
                            npc,
                            "And I haven't forgotten about you, Biggum!",
                            'Now that you are a member of the Legend\'s Guild...',
                            '...I will offer you the same reward',
                            'Here is your very own pair of dragon plate legs!'
                        );
                        mes(player, 'Radimus presents Biggum with his reward');
                        await player.world.sleepTicks(3);
                        await biggumSay(
                            player,
                            'Biggum off to trade reward for delicious chicken',
                            'Human speak to Biggum to do big long killing spree again',
                            'See ya chump'
                        );
                        remove(player, BIGGUM_FLODROT_ITEM, 1);
                        mes(player, 'Biggum scampers away');
                        await player.world.sleepTicks(3);
                    }
                    const prestige = incrementPrestige(player);
                    player.message(
                        `@que@@gre@You have completed the Odyssey ${prestige}${
                            prestige > 1 ? ' times!' : ' time!'
                        }`
                    );
                    player.message(
                        "@que@@gre@Speak to Radimus if you'd like to do the Odyssey again"
                    );
                    break;
                }
            }
            break;
        }
    }
}

// biggum tells the player which tier master to see next
async function directToTierMaster(player) {
    const currentTier = getCurrentTier(player);
    switch (currentTier) {
        case 0:
            await biggumSay(player, 'Speak to goblin generals of north Fallington');
            break;
        case 1:
            await biggumSay(player, 'Speak to Thormac the wizzy');
            break;
        case 2:
            await biggumSay(player, 'Speak to ogre Grew of feldip hills');
            break;
        case 3:
        case 4:
            await biggumSay(
                player,
                'Speak to sinister dark mage man in west Ardington'
            );
            break;
        case 5:
        case 6:
            await biggumSay(player, 'Speak to small dumb gnome Hazelmere');
            break;
        case 7:
            await biggumSay(player, 'Speak to Sigbert adventure man');
            break;
        case 8:
            await biggumSay(player, 'Speak to big hero Achetties');
            break;
        case 9:
        case 10:
        case 11:
        case 12:
            if (getPrestige(player) < 1) {
                await biggumSay(
                    player,
                    'Go speak to Radimus, but not talk about Biggum!'
                );
            } else {
                await biggumSay(player, 'Go speak to Radimus');
            }
            break;
        case 13:
            await biggumSay(player, 'Go claim big shiny reward from Radimus');
            break;
    }
}

// developer options (mod/dev only)

async function developerOptions(modPlayer, targetPlayer) {
    const tier = getTier(getCurrentTier(targetPlayer));
    if (!tier) {
        await biggumSay(modPlayer, 0, 'Other human is not doing the Odyssey');
        return;
    }
    const task = getTask(tier, getCurrentTask(targetPlayer));
    if (!task) {
        await biggumSay(modPlayer, 0, 'Other human is not doing the Odyssey');
        return;
    }

    const devOption = await modPlayer.ask(
        [
            'Set 1 kill away from task completion',
            'Mark task as complete',
            'Mark current tier as complete',
            'Complete the Odyssey'
        ],
        false
    );

    if (devOption === 0) {
        const taskKills = task.kills;
        const newKills = task.kills - 1;
        updateCurrentTaskInfo(targetPlayer, newKills, CURRENT_KILLS);
        if (modPlayer !== targetPlayer) {
            await biggumSay(
                modPlayer,
                0,
                `Other human has been set to ${newKills}/${taskKills}`
            );
        }
        await biggumSay(
            targetPlayer,
            `Human has been set to ${newKills}/${taskKills}`
        );
    } else if (devOption === 1) {
        updateCurrentTaskInfo(targetPlayer, task.kills, CURRENT_KILLS);
        completeTask(targetPlayer, task.taskId);
        if (modPlayer !== targetPlayer) {
            await biggumSay(modPlayer, 0, "Other human's task now complete");
        }
        await biggumSay(targetPlayer, 'Task complete', 'Speak to Biggum for next task');
    } else if (devOption === 2) {
        updateCurrentTaskInfo(targetPlayer, task.kills, CURRENT_KILLS);
        setTierProgress(
            targetPlayer,
            Math.pow(2, getTotalTasks(tier)) - 1
        );
        if (modPlayer !== targetPlayer) {
            await biggumSay(
                modPlayer,
                0,
                "Biggum has marked other human's tier as complete"
            );
        }
        await biggumSay(
            targetPlayer,
            'Biggum has marked tier completed',
            'Speak to Biggum to know where to go next'
        );
    } else if (devOption === 3) {
        updateCurrentTaskInfo(targetPlayer, 13, CURRENT_TIER);
        updateCurrentTaskInfo(targetPlayer, 0, CURRENT_TASK);
        updateCurrentTaskInfo(targetPlayer, 1, CURRENT_KILLS);
        setTierProgress(targetPlayer, 1);
        if (modPlayer !== targetPlayer) {
            await biggumSay(
                modPlayer,
                0,
                'Biggum has marked the final tier as completed for other human'
            );
        }
        await biggumSay(
            targetPlayer,
            'Human has now completed final tier',
            'Speak to Biggum to know where to go next'
        );
    }
}

// plugin triggers

// counts kills of the current task's npcs; returns false so drops still proceed
async function onNPCDeath(player, npc) {
    if (!player) {
        return false;
    }
    const taskNpcs = getTaskNpcs(player);
    if (!taskNpcs || taskNpcs.length === 0) {
        return false;
    }
    if (!inArray(taskNpcs, npc.id)) {
        return false;
    }

    incrementTaskKills(player);
    const currentTask = getCurrentTask(player);

    if (isTaskCompleted(player) && !isTaskAlreadyComplete(player, currentTask)) {
        completeTask(player, currentTask);
        player.message(
            '@gre@You hear Biggum trying to get your attention from your backpack'
        );
        thinkbubble(player, BIGGUM_FLODROT_ITEM);
    }

    return false;
}

// handles Radimus (tier-completion advance + intro) and the overworld Biggum npc
async function onTalkToNPC(player, npc) {
    if (npc.id === RADIMUS_ID) {
        if (!combatOdysseyEnabled(player)) {
            return false;
        }
        // odyssey only offered once legends quest is complete
        if (player.questStages.legendsQuest !== -1) {
            return false;
        }
        return doCombatOdyssey(player, npc);
    }

    // Biggum is met by climbing the Legend's Guild stairs, not by talking to anyone

    if (npc.id !== BIGGUM_FLODROT_NPC) {
        return false;
    }

    // this overworld-Biggum branch also needs the enabled check
    if (!combatOdysseyEnabled(player)) {
        return false;
    }

    player.engage(npc);
    await biggumNpcDialog(player, npc);
    player.disengage();
    return true;
}

// doCombatOdyssey: if Biggum is lost mid-odyssey he scampers back; intro stages
// go to radimusDialog; a completed Radimus tier (9..13) with Biggum held advances
async function doCombatOdyssey(player, npc) {
    const introStage = getIntroStage(player);

    if (
        (introStage >= MET_BIGGUM || introStage === IN_PROGRESS) &&
        !ifheld(player, BIGGUM_FLODROT_ITEM, 1)
    ) {
        player.engage(npc);
        await recoverBiggum(player);
        player.disengage();
        return true;
    }

    if (introStage !== IN_PROGRESS) {
        player.engage(npc);
        await radimusDialog(player, npc);
        player.disengage();
        return true;
    }

    const currentTier = getCurrentTier(player);
    if (
        (currentTier === 9 ||
            currentTier === 10 ||
            currentTier === 11 ||
            currentTier === 12 ||
            currentTier === 13) &&
        isTierCompleted(player) &&
        !(await biggumMissing(player))
    ) {
        player.engage(npc);
        await radimusDialog(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

function combatOdysseyEnabled(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    // default ON (Cabbage enables it) unless a world disables it.
    return !config || config.wantCombatOdyssey !== false;
}

// the overworld Biggum npc
async function biggumNpcDialog(player, npc) {
    // only prestige players not holding biggum see the repeat dialogue
    if (getPrestige(player) < 1 || ifheld(player, BIGGUM_FLODROT_ITEM, 1)) {
        if (isStaff(player)) {
            await say(player, 'Hello!');

            if (ifheld(player, BIGGUM_FLODROT_ITEM, 1)) {
                await npcsay(
                    npc,
                    'What does human want?',
                    'We should go kill many things'
                );
                await say(player, 'Wait...', 'How are you standing here');
                await npcsay(npc, 'What does human mean?');
                await say(
                    player,
                    'How are you standing here in this courtyard...',
                    '...while you\'re also in my backpack?'
                );
                mes(
                    player,
                    'The bass drops as you open your backpack to show Biggum to Biggum'
                );
                await player.world.sleepTicks(3);
                await npcsay(
                    npc,
                    'Wha-',
                    'Nooooo',
                    'noooo',
                    "This isn't right",
                    'Go away!'
                );
                mes(player, 'Biggum looks like his mind is going to explode');
                await player.world.sleepTicks(3);
                return;
            }

            const stage = getIntroStage(player);
            if (stage === NOT_STARTED || stage === TALKED_TO_RADIMUS) {
                await npcsay(
                    npc,
                    'Why human talking to Biggum?',
                    "Biggum doesn't know human"
                );
                await say(player, "Why is a goblin wearing a legend's cape?");
            } else {
                await npcsay(
                    npc,
                    'What does human want?',
                    'We should go kill many things'
                );
                await say(player, "Why are you wearing a legend's cape?");
            }
            await npcsay(npc, "Biggum isn't wearing a legend's-");
            mes(player, 'Biggum looks around to his back and notices his cape');
            await player.world.sleepTicks(3);
            await npcsay(
                npc,
                'Biggum does not know',
                'Biggum is not member of guild'
            );
            mes(player, 'Biggum stares past you, looking very confused');
        }
        return;
    }

    if (
        getIntroStage(player) === IN_PROGRESS ||
        getIntroStage(player) === MET_BIGGUM
    ) {
        await say(player, 'Are you ready to continue?');
        await npcsay(npc, 'Yes yes');
        mes(player, 'Biggum hops into your backpack');
        give(player, BIGGUM_FLODROT_ITEM, 1);
        return;
    }

    const option = await player.ask(
        [
            'What happened to your cape?',
            "You kinda cheated to get into the legends guild, didn't you?",
            "Let's do Radimus' odyssey again"
        ],
        true
    );
    if (option === 0) {
        await npcsay(
            npc,
            'Wha? Oh...',
            'Biggum tore hole on accident',
            'While fighting... dragon!',
            "Yes that's right, Biggum fight big scary dragon",
            "Also made Biggum's cape dirty"
        );
    } else if (option === 1) {
        await say(player, "You didn't do any of the kills");
        await npcsay(
            npc,
            'Biggum help big dumb human do all kills',
            'Even if Biggum not swing the sword himself',
            'Biggum legendary at making sure things dead'
        );
        await say(player, 'I suppose', 'But Radimus thinks you did it on your own');
        await npcsay(
            npc,
            'Biggum big famous goblin legend now',
            'Could easily do it himself',
            'Now leave Biggum alone, not want to talk more nonsense'
        );
    } else if (option === 2) {
        await npcsay(
            npc,
            'Yes yes',
            'Biggum always ready for big long adventure',
            'First go speak with generals of village of north Fallington'
        );
        mes(player, 'Biggum hops into your backpack');
        give(player, BIGGUM_FLODROT_ITEM, 1);
        setIntroStage(player, MET_BIGGUM);
    }
}

// talk to Biggum in the backpack (his only inventory command is "Talk")
async function onInventoryCommand(player, item) {
    if (item.id !== BIGGUM_FLODROT_ITEM) {
        return false;
    }

    // Still in the intro: just direct the player to the first tier master.
    if (getIntroStage(player) === MET_BIGGUM) {
        await say(player, 'Where should we start?');
        await biggumSay(
            player,
            'Go talk with goblin generals in village of north Fallington',
            'They tell big dumb human what first things to kill'
        );
        return true;
    }

    // advance within the tier, or direct to the next tier master
    if (isTaskCompleted(player)) {
        if (isTierCompleted(player)) {
            await biggumSay(player, 'Human has finished all tasks');
            await directToTierMaster(player);
        } else {
            assignNewTask(player);
            const tier = getTier(getCurrentTier(player));
            if (!tier) {
                return true;
            }
            const newTask = getTask(tier, getCurrentTask(player));
            if (!newTask) {
                return true;
            }
            await biggumSay(
                player,
                'Human done here',
                `Now kill ${newTask.kills} ${newTask.description}`
            );
        }
        return true;
    }

    // Not doing the odyssey but somehow holding Biggum: eject him.
    if (
        !Object.prototype.hasOwnProperty.call(player.cache, 'combat_odyssey') ||
        !hasTierProgress(player)
    ) {
        await biggumSay(
            player,
            'Human is not doing combat odyssey!',
            'What is Biggum sticking around for?'
        );
        remove(player, BIGGUM_FLODROT_ITEM, 1);
        mes(player, 'Biggum jumps out of your backpack and scampers away');
        return true;
    }

    const tier = getTier(getCurrentTier(player));
    if (!tier) {
        return true;
    }
    const task = getTask(tier, getCurrentTask(player));
    if (!task) {
        return true;
    }

    const isDev = isStaff(player);
    const options = [
        'What is my current task?',
        'What can you tell me about my current task?',
        'What tasks do I have left to do?'
    ];
    // dev + in-progress shows the 4-option no-echo menu; otherwise the 3-option echoing one
    const showDevOption = isDev && getIntroStage(player) === IN_PROGRESS;
    if (showDevOption) {
        options.push('Show me developer options');
    }
    const option = await player.ask(options, !showDevOption);

    if (option === 0) {
        await say(player, 'What is my current task?');
        const currentKills = getCurrentKills(player);
        await biggumSay(
            player,
            `Human needs to kill ${task.kills} ${task.description}`
        );
        if (currentKills > 0) {
            await biggumSay(player, `Human has already killed ${currentKills}`);
        }
    } else if (option === 1) {
        await say(player, 'What can you tell me about my current task?');
        if (getPrestige(player) > 0) {
            if (task.description.toLowerCase() === 'pit scorpions') {
                await biggumSay(
                    player,
                    'Biggum has tried these in many goblin foods',
                    'Very crunchy but not very spicy'
                );
                return true;
            } else if (task.description.toLowerCase() === 'shadow warriors') {
                await biggumSay(
                    player,
                    'Biggum bonked one of these and only got a broken shield',
                    'Biggum traded it for delicious chicken',
                    'Best day ever'
                );
                return true;
            }
        }
        await biggumSay(player, ...task.monsterInfoDialog);
    } else if (option === 2) {
        await say(player, 'What tasks do I have left to do?');
        // sendBox panel -> sequential server messages (engine deviation).
        const parts = [];
        for (const t of tier.tasks) {
            if (isTaskAlreadyComplete(player, t.taskId)) {
                continue;
            }
            const count =
                t.taskId === getCurrentTask(player)
                    ? t.kills - getCurrentKills(player)
                    : t.kills;
            parts.push(`${count} ${t.description}`);
        }
        player.message('@yel@Human still has to kill @whi@' + parts.join(', '));
    } else if (option === 3 && isDev) {
        await developerOptions(player, player);
    }

    return true;
}

// DropObjTrigger -> onDropItem. Dropping Biggum ejects him.
async function onDropItem(player, item) {
    if (item.id !== BIGGUM_FLODROT_ITEM) {
        return false;
    }
    mes(player, 'Biggum Flodrot drops to the ground and scampers away');
    await player.world.sleepTicks(3);
    if (getPrestige(player) >= 1) {
        mes(player, "He has likely gone back to the Legend's Guild courtyard");
    } else {
        mes(player, 'You can probably find him where you first met');
    }
    remove(player, BIGGUM_FLODROT_ITEM, 1);
    return true;
}

// UseInvTrigger -> onUseWithInventory. Feed Biggum his favourite food.
async function onUseWithInventory(player, item1, item2) {
    let otherItem;
    if (item1.id === BIGGUM_FLODROT_ITEM) {
        otherItem = item2;
    } else if (item2.id === BIGGUM_FLODROT_ITEM) {
        otherItem = item1;
    } else {
        return false;
    }

    if (!inArray(BIGGUM_FAVORITE_FOOD, otherItem.id)) {
        return false;
    }

    await biggumSay(player, "Biggum's favourite!");
    mes(player, 'Biggum gobbles up the meat quickly');
    remove(player, otherItem.id, 1);
    return true;
}

// feed the overworld biggum npc his favourite food
async function onUseWithNPC(player, npc, item) {
    if (npc.id !== BIGGUM_FLODROT_NPC || !inArray(BIGGUM_FAVORITE_FOOD, item.id)) {
        return false;
    }
    await npcsay(npc, "Biggum's favourite!");
    mes(player, 'Biggum gobbles up the meat quickly');
    remove(player, item.id, 1);
    return true;
}

// mod developer options (never fires solo)
async function onUseWithPlayer(player, otherPlayer, item) {
    if (item.id !== BIGGUM_FLODROT_ITEM || !isStaff(player)) {
        return false;
    }
    await developerOptions(player, otherPlayer);
    return true;
}

module.exports = {
    onNPCDeath,
    onTalkToNPC,
    onInventoryCommand,
    onDropItem,
    onUseWithInventory,
    onUseWithNPC,
    onUseWithPlayer,
    // exported for the functional test / potential reuse
    _internal: {
        TIERS,
        getTier,
        getTask,
        getCurrentTier,
        getCurrentTask,
        getCurrentKills,
        getIntroStage,
        setIntroStage,
        assignNewTier,
        assignNewTask,
        isTaskCompleted,
        isTierCompleted,
        incrementTaskKills,
        completeTask,
        isTaskAlreadyComplete,
        getPrestige,
        getTasksAndCounts,
        getTaskNpcs,
        getCurrentTierMasterId,
        // exposed for other tier masters' quest/npc files to hand off a completed tier
        giveRewards,
        biggumSay,
        biggumMissing,
        recoverBiggum,
        meetBiggum,
        radimusDialog,
        combatOdysseyEnabled,
        NOT_STARTED,
        TALKED_TO_RADIMUS,
        MET_BIGGUM,
        IN_PROGRESS
    }
};
