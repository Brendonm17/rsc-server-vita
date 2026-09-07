// sheep herder (members). round up four plague-infected sheep into brumty's
// enclosure with a cattle prod, kill them with poisoned feed, and burn the
// remains in the cattle furnace.
//
// questStages.sheepHerder:
//   0 (undefined) not started
//   1             accepted (given poisoned animal feed)
//   2             working (brumty's herding hint; furnace tracking)
//  -1             complete
//
// player.cache plagueremain1st..4th record each sheep whose remains are burnt;
// all four = complete.

const { questsEnabled } = require('../../custom-gate.js');
const {
    HALGRIVE_ID,
    BRUMTY_ID,
    FIRST_PLAGUE_SHEEP_ID,
    SECOND_PLAGUE_SHEEP_ID,
    THIRD_PLAGUE_SHEEP_ID,
    FOURTH_PLAGUE_SHEEP_ID,
    COINS_ID,
    CATTLE_PROD_ID,
    POISONED_ANIMAL_FEED_ID,
    PROTECTIVE_JACKET_ID,
    PROTECTIVE_TROUSERS_ID,
    PLAGUED_SHEEP_REMAINS_1_ID,
    PLAGUED_SHEEP_REMAINS_2_ID,
    PLAGUED_SHEEP_REMAINS_3_ID,
    PLAGUED_SHEEP_REMAINS_4_ID,
    GATE_ID,
    GATE_OPEN_ID,
    CATTLE_FURNACE_ID
} = require('./ids.js');

const PLAGUE_SHEEP_IDS = new Set([
    FIRST_PLAGUE_SHEEP_ID,
    SECOND_PLAGUE_SHEEP_ID,
    THIRD_PLAGUE_SHEEP_ID,
    FOURTH_PLAGUE_SHEEP_ID
]);

// sheep id -> the distinct remains it drops when killed
const SHEEP_REMAINS = {
    [FIRST_PLAGUE_SHEEP_ID]: PLAGUED_SHEEP_REMAINS_1_ID,
    [SECOND_PLAGUE_SHEEP_ID]: PLAGUED_SHEEP_REMAINS_2_ID,
    [THIRD_PLAGUE_SHEEP_ID]: PLAGUED_SHEEP_REMAINS_3_ID,
    [FOURTH_PLAGUE_SHEEP_ID]: PLAGUED_SHEEP_REMAINS_4_ID
};

// remains item id -> the cache key set when that sheep's remains are burnt
const REMAINS_CACHE_KEY = {
    [PLAGUED_SHEEP_REMAINS_1_ID]: 'plagueremain1st',
    [PLAGUED_SHEEP_REMAINS_2_ID]: 'plagueremain2nd',
    [PLAGUED_SHEEP_REMAINS_3_ID]: 'plagueremain3th',
    [PLAGUED_SHEEP_REMAINS_4_ID]: 'plagueremain4th'
};

// pen bounds: OpenRSC inBounds(589, 543, 592, 548)
function inPen(x, y) {
    return x >= 589 && x <= 592 && y >= 543 && y <= 548;
}

function wearingProtectiveClothing(player) {
    return (
        player.inventory.has(PROTECTIVE_JACKET_ID) &&
        player.inventory.has(PROTECTIVE_TROUSERS_ID)
    );
}

// talk: councillor halgrive and farmer brumty
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) return false;

    if (npc.id !== HALGRIVE_ID && npc.id !== BRUMTY_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.sheepHerder;

    if (npc.id === BRUMTY_ID) {
        switch (stage) {
            case 2:
                await player.say('hello');
                await npc.say(
                    'hello adventurer',
                    'be careful rounding up those sheep',
                    "i don't think they've wandered far",
                    "but if you touch them you'll become infected as well",
                    'there should be a cattle prod in the barn',
                    'you can use it to herd up the sheep'
                );
                break;
            case -1:
                await player.say('hello there', "i'm sorry about your sheep");
                await npc.say(
                    "that's ok, it had to be done",
                    'i just hope none of my other livestock becomes infected'
                );
                break;
        }
    } else if (npc.id === HALGRIVE_ID) {
        switch (stage) {
            case undefined:
            case 0: {
                await player.say('how are you?');
                await npc.say("I've been better");
                // do not send over (multi(..., false, ...))
                const menu = await player.ask(
                    ["What's wrong?", "That's life for you"],
                    false
                );

                if (menu === 0) {
                    await player.say("What's wrong?");
                    await npc.say(
                        'a plague has spread over west ardounge',
                        "apparently it's reasonably contained",
                        'but four infected sheep have escaped',
                        "they're roaming free in and around east ardounge",
                        'the whole city could be infected in days',
                        'i need someone to gather the sheep',
                        'herd them into a safe enclosure',
                        'then kill the sheep',
                        'their remains will also need to be disposed of ' +
                            'safely in a furnace'
                    );

                    const menu2 = await player.ask(
                        ['I can do that for you', "That's not a job for me"],
                        false
                    );

                    if (menu2 === 0) {
                        await player.say('i can do that for you');
                        await npc.say(
                            'good, the enclosure is to the north of the city',
                            "On farmer Brumty's farm",
                            'the four sheep should still be close to it',
                            'before you go into the enclosure',
                            'make sure you have protective clothing on',
                            "otherwise you'll catch the plague"
                        );
                        await player.say(
                            'where do I get protective clothing?'
                        );
                        await npc.say(
                            'Doctor Orbon wears it when trying to save the ' +
                                'infected',
                            "you'll find him in the chapel",
                            'take this poisoned animal feed',
                            "give it to the four sheep and they'll " +
                                'peacefully fall asleep'
                        );
                        player.message(
                            '@que@The councillor gives you some sheep poison'
                        );
                        await player.world.sleepTicks(3);
                        player.inventory.add(POISONED_ANIMAL_FEED_ID, 1);
                        player.questStages.sheepHerder = 1;
                    } else if (menu2 === 1) {
                        await player.say("that's not a job for me");
                        await npc.say("fair enough, it's not nice work");
                    }
                } else if (menu === 1) {
                    await player.say("that's life for you");
                }
                break;
            }
            case 1:
                await npc.say(
                    'please find those four sheep as soon as you can',
                    'every second counts'
                );
                if (!player.inventory.has(POISONED_ANIMAL_FEED_ID)) {
                    await player.say('Some more sheep poison might be useful');
                    player.message(
                        '@que@The councillor gives you some more sheep poison'
                    );
                    await player.world.sleepTicks(3);
                    player.inventory.add(POISONED_ANIMAL_FEED_ID, 1);
                }
                break;
            case 2:
                await npc.say(
                    'have you managed to dispose of those four sheep?'
                );
                if (
                    player.cache.plagueremain1st &&
                    player.cache.plagueremain2nd &&
                    player.cache.plagueremain3th &&
                    player.cache.plagueremain4th
                ) {
                    await player.say('yes i have');
                    delete player.cache.plague1st;
                    delete player.cache.plague2nd;
                    delete player.cache.plague3th;
                    delete player.cache.plague4th;
                    delete player.cache.plagueremain1st;
                    delete player.cache.plagueremain2nd;
                    delete player.cache.plagueremain3th;
                    delete player.cache.plagueremain4th;

                    // quest complete: no xp, 4 quest points
                    player.questStages.sheepHerder = -1;
                    player.message(
                        'well done, you have completed the Plaguesheep quest'
                    );
                    player.addQuestPoints(4);

                    player.inventory.add(COINS_ID, 3100);
                    await npc.say(
                        'here take one hundred coins to cover the price of ' +
                            'your protective clothing'
                    );
                    player.message('@que@halgrive gives you 100 coins');
                    await player.world.sleepTicks(3);
                    await npc.say('and another three thousand for your efforts');
                    player.message('@que@halgrive gives you another 3000 coins');
                    await player.world.sleepTicks(3);
                } else {
                    await player.say('erm not quite');
                    await npc.say(
                        "not quite's not good enough",
                        'all four sheep must be captured, slain and their ' +
                            'remains burnt'
                    );
                    await player.say("ok i'll get to it");
                    if (!player.inventory.has(POISONED_ANIMAL_FEED_ID)) {
                        await player.say(
                            'Some more sheep poison might be useful'
                        );
                        player.message(
                            '@que@The councillor gives you some more sheep poison'
                        );
                        player.inventory.add(POISONED_ANIMAL_FEED_ID, 1);
                    }
                }
                break;
            case -1:
                await player.say('hello again halgrive');
                await npc.say('well hello again traveller', 'how are you');
                await player.say('good thanks and yourself?');
                await npc.say(
                    "much better now i don't have to worry about those sheep"
                );
                break;
        }
    }

    player.disengage();
    return true;
}

// OpLoc: the enclosure gate (443)
function openGatey(player, gameObject) {
    const { world } = player;
    player.message('you open the gate and walk through');
    const openGate = world.replaceEntity('gameObjects', gameObject, GATE_OPEN_ID);
    // restore the closed gate after ~3000ms (5 ticks)
    world.setTickTimeout(() => {
        world.replaceEntity('gameObjects', openGate, GATE_ID);
    }, 5);
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) return false;

    if (gameObject.id !== GATE_ID) {
        return false;
    }

    // OpenRSC: wearing clothing, OR (not wearing && player.getX() == 589)
    if (
        wearingProtectiveClothing(player) ||
        (!wearingProtectiveClothing(player) && player.x === 589)
    ) {
        openGatey(player, gameObject);
        if (player.x <= 588) {
            player.teleport(589, 541, false);
        } else {
            player.teleport(588, 540, false);
        }
    } else {
        player.message('@que@this is a restricted area');
        await player.world.sleepTicks(3);
        player.message('@que@you cannot enter without protective clothing');
        await player.world.sleepTicks(3);
    }

    return true;
}

// UseNpc: cattle prod (herd) / poisoned animal feed (kill) on the plague sheep
async function sheepYell(player) {
    await player.world.sleepTicks(1);
    player.message('@yel@:Baaaaaaaaa!!!');
}

// approximate OpenRSC moveNpc(): reposition the sheep instantly
function moveSheep(sheep, x, y) {
    sheep.x = x;
    sheep.y = y;
    if (typeof sheep.broadcastMove === 'function') {
        sheep.broadcastMove();
    }
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) return false;

    if (!PLAGUE_SHEEP_IDS.has(npc.id)) {
        return false;
    }

    const stage = player.questStages.sheepHerder;

    if (item.id === CATTLE_PROD_ID) {
        if (wearingProtectiveClothing(player) && stage !== -1) {
            if (inPen(npc.x, npc.y)) {
                player.message('The sheep is already in the pen');
                return true;
            }
            player.message('you nudge the sheep forward');

            // pen side: sheep jumps to (590,546), else runs toward the pen
            if (player.y < 543) {
                await sheepYell(player);
                player.message('the sheep jumps the gate into the enclosure');
                moveSheep(npc, 590, 546);
                return true;
            }

            // nudge the sheep toward the pen
            const newY = Math.max(543, npc.y - 5);
            moveSheep(npc, npc.x, newY);
            player.message('the sheep runs to the north');
            await sheepYell(player);
            return true;
        } else {
            player.message('@que@this sheep has the plague');
            await player.world.sleepTicks(3);
            player.message('@que@you better not touch it');
            await player.world.sleepTicks(3);
            return true;
        }
    } else if (item.id === POISONED_ANIMAL_FEED_ID) {
        if (inPen(npc.x, npc.y)) {
            const remainsId = SHEEP_REMAINS[npc.id];
            const cacheKey = REMAINS_CACHE_KEY[remainsId];

            if (player.cache[cacheKey]) {
                player.message('@que@You have already disposed of this sheep');
                await player.world.sleepTicks(3);
                player.message('@que@Find a different sheep');
                await player.world.sleepTicks(3);
                return true;
            }

            player.message('@que@you give the sheep poisoned sheep feed');
            await player.world.sleepTicks(3);
            player.message('the sheep collapses to the floor and dies');

            // drop the sheep's remains at its tile, then remove the npc
            const { world } = player;
            world.addPlayerDrop(player, { id: remainsId }, npc.x, npc.y);
            world.removeEntity('npcs', npc);
            return true;
        } else {
            player.message("@que@you can't kill the sheep out here");
            await player.world.sleepTicks(3);
            player.message('@que@you might spread the plague');
            await player.world.sleepTicks(3);
            return true;
        }
    }

    return false;
}

// UseLoc: burn plagued sheep remains on the cattle furnace (444)
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) return false;

    if (gameObject.id !== CATTLE_FURNACE_ID) {
        return false;
    }

    const cacheKey = REMAINS_CACHE_KEY[item.id];

    if (!cacheKey) {
        player.message('@que@Nothing interesting happens');
        await player.world.sleepTicks(3);
        return true;
    }

    if (player.questStages.sheepHerder !== -1) {
        if (!player.cache[cacheKey]) {
            player.cache[cacheKey] = true;
            player.inventory.remove(item.id, 1);
        } else {
            player.message('@que@You need to kill this sheep yourself');
            await player.world.sleepTicks(3);
            return true;
        }
        player.message('@que@you put the sheep remains in the furnace');
        await player.world.sleepTicks(3);
        player.message('@que@the remains burn to dust');
        await player.world.sleepTicks(3);
    } else {
        player.message('@que@You have already completed this quest');
        await player.world.sleepTicks(3);
    }

    return true;
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onUseWithNPC,
    onUseWithGameObject
};
