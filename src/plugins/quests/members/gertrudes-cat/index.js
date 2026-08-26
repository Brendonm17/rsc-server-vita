// quest stages: 0 not started, 1-3 in progress, -1 complete

const { questsEnabled } = require('../../custom-gate.js');

// NPC ids (rsc-data config/npcs.json)
const GERTRUDE_ID = 714;
const SHILOP_ID = 715;
const WILOUGH_ID = 781;
const PHILOP_ID = 782;
const KANEL_ID = 783;

// Item ids (rsc-data config/items.json)
const COINS_ID = 10;
const MILK_ID = 22; // bucket of milk
const RAW_SARDINE_ID = 354;
const GERTRUDES_CAT_ID = 1093; // "Cat" - "it's fluffs" (the ground item)
const SEASONED_SARDINE_ID = 1094;
const KITTENS_ID = 1095;
const KITTEN_ID = 1096;
const DOOGLE_LEAVES_ID = 1100;
const CHOCOLATE_CAKE_ID = 332;
const STEW_ID = 346;

// World-entity ids (rsc-data locations/*.json)
const BROKEN_FENCE_ID = 199; // wall object at (51, 438)
const FLUFFS_GROUND_Y = 2327; // Fluffs cat ground item y (58, 2327)
const CRATE_EMPTY_ID = 1039; // "crate" (search -> nothing)
const CRATE_KITTENS_ID = 1040; // "crate" (search -> two kittens), at (64, 445)
const BARREL_ID = 1041; // "barrel" (search -> nothing)

// reward: 1 qp + flat 1525 cooking xp
const QUEST_POINTS = 1;
const COOKING_XP = 1525;

async function mes(player, ...messages) {
    for (const message of messages) {
        player.message(message);
        await player.world.sleepTicks(3);
    }
}

async function handleReward(player) {
    player.addExperience('cooking', COOKING_XP, false);
    player.addQuestPoints(QUEST_POINTS);
    player.message('well done, you have completed gertrudes cat quest');
}


async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    switch (npc.id) {
        case GERTRUDE_ID:
            await talkToGertrude(player, npc);
            return true;
        case SHILOP_ID:
        case WILOUGH_ID:
            await talkToSon(player, npc);
            return true;
        case KANEL_ID:
        case PHILOP_ID:
            // n.getID() == KANEL || PHILOP: "The boy's busy playing"
            player.message("The boy's busy playing");
            return true;
        default:
            return false;
    }
}

async function talkToGertrude(player, npc) {
    player.engage(npc);

    const stage = player.questStages.gertrudesCat || 0;

    switch (stage) {
        case 0: {
            await player.say('hello, are you ok?');
            await npc.say(
                'do i look ok?...those kids drive me crazy',
                "...i'm sorry,  it's just, ive lost her"
            );
            await player.say('lost who?');
            await npc.say('fluffs, poor fluffs, she never hurt anyone');
            await player.say("who's fluffs");
            await npc.say(
                'my beloved feline friend fluffs',
                "she's been purring by my side for almost a decade",
                'please, could you go search for her...',
                '...while i look over the kids?'
            );

            const first = await player.ask(
                [
                    'well, i suppose i could',
                    "what's in it for me?",
                    "sorry, i'm too busy to play pet rescue"
                ],
                true
            );

            if (first === 0) {
                await npc.say(
                    'really?, thank you so much',
                    'i really have no idea where she could be',
                    'i think my sons, shilop and Wilough, saw the cat last',
                    "they'll be out in the market place"
                );
                await player.say("alright then, i'll see what i can do");
                player.questStages.gertrudesCat = 1;
            } else if (first === 1) {
                await npc.say(
                    "i'm sorry, i'm too poor to pay you anything",
                    'the best i could offer is a warm meal',
                    'so, can you help?'
                );

                const second = await player.ask(
                    [
                        'well, i suppose i could',
                        "sorry, i'm too busy to play pet rescue"
                    ],
                    true
                );

                if (second === 0) {
                    await npc.say(
                        'really?, thank you so much',
                        'i really have no idea where she could be',
                        'i think my sons, shilop and Wilough, saw the cat last',
                        "they'll be out in the market place"
                    );
                    await player.say("alright then, i'll see what i can do");
                    player.questStages.gertrudesCat = 1;
                } else if (second === 1) {
                    await npc.say(
                        " well, ok then, i'll have to find someone else"
                    );
                }
            } else if (first === 2) {
                await npc.say(
                    " well, ok then, i'll have to find someone else"
                );
            }
            break;
        }
        case 1:
            await player.say('hello gertrude');
            await npc.say('have you seen my poor fluffs?');
            await player.say("i'm afraid not");
            await npc.say('what about shilop?');
            await player.say('no sign of him either');
            await npc.say('hmmm...strange, he should be at the market');
            break;
        case 2: {
            const catMilk = player.cache.cat_milk;
            const catSardine = player.cache.cat_sardine;

            if (!catMilk && !catSardine) {
                await player.say('hello gertrude');
                await npc.say(
                    'hello again, did you manage to find shilop?',
                    "i can't keep an eye on him for the life of me"
                );
                await player.say('he does seem quite a handfull');
                await npc.say('you have no idea!.... did he help at all?');
                await player.say("i think so, i'm just going to look now");
                await npc.say('thanks again adventurer');
            } else if (catMilk && !catSardine) {
                await player.say('hello again');
                await npc.say("hello, how's it going?, any luck?");
                await player.say("yes, i've found fluffs");
                await npc.say(
                    'well well, you are clever, did you bring her back?'
                );
                await player.say("well, that's the thing, she refuses to leave");
                await npc.say(
                    "oh dear, oh dear, maybe she's just hungry",
                    "she loves doogle sardines but i'm all out"
                );
                await player.say('doogle sardines?');
                await npc.say(
                    'yes, raw sardines seasoned with doogle leaves',
                    "unfortunatly i've used all my doogle leaves",
                    'but you may find some in the woods out back'
                );
            } else if (catSardine) {
                await player.say('hi');
                await npc.say('hey traveller, did fluffs eat the sardines?');
                await player.say(
                    "yeah, she loved them, but she still won't leave"
                );
                await npc.say(
                    'well that is strange, there must be a reason!'
                );
            }
            break;
        }
        case 3:
            await player.say(
                'hello gertrude',
                'fluffs ran off with her two kittens'
            );
            await npc.say(
                'you\'re back , thank you, thank you',
                'fluffs just came back, i think she was just upset...',
                "...as she couldn't find her kittens"
            );
            await mes(player, 'gertrude gives you a hug');
            await npc.say(
                "if you hadn't found her kittens they'd have died out there"
            );
            await player.say("that's ok, i like to do my bit");
            await npc.say(
                "i don't know how to thank you",
                'I have no real material possessions..but i do have kittens',
                '..i can only really look after one'
            );
            await player.say('well, if it needs a home');
            await npc.say(
                'i would sell it to my cousin in west ardounge..',
                "i hear there's a rat epidemic there..but it's too far",
                'here you go, look after her and thank you again'
            );
            await mes(player, 'gertrude gives you a kitten...');
            await mes(player, '...and some food');
            player.inventory.add(KITTEN_ID, 1);
            player.inventory.add(CHOCOLATE_CAKE_ID, 1);
            player.inventory.add(STEW_ID, 1);
            player.questStages.gertrudesCat = -1;
            await handleReward(player);
            break;
        case -1:
            await player.say('hello again gertrude');
            await npc.say('well hello adventurer, how are you?');

            if (player.inventory.has(KITTEN_ID) || player.bank.has(KITTEN_ID)) {
                await player.say('pretty good thanks, yourself?');
                await npc.say(
                    'same old, running after shilob most of the time'
                );
                await player.say(
                    "never mind, i'm sure he'll calm down with age"
                );
            } else {
                await player.say('i\'m ok, but i lost my kitten');
                await npc.say(
                    'that is a shame..as it goes fluffs just had more',
                    "i'm selling them at 100 coins each...",
                    "...it was shilop's idea"
                );
                await player.say('!');
                await npc.say('would you like one');

                const menu = await player.ask(
                    [
                        'yes please',
                        "no thanks, i've paid that boy enough already"
                    ],
                    true
                );

                if (menu === 0) {
                    await npc.say('ok then, here you go');
                    if (player.inventory.has(COINS_ID, 100)) {
                        await player.say('thanks');
                        await mes(player, 'gertrude gives you another kitten');
                        player.inventory.remove(COINS_ID, 100);
                        player.inventory.add(KITTEN_ID, 1);
                    } else {
                        await player.say(
                            "oops, looks like i'm a bit short",
                            "i'll have to come back later"
                        );
                    }
                }
            }
            break;
    }

    player.disengage();
}

async function talkToSon(player, npc) {
    // shilop & wilough share the same dialogue
    player.engage(npc);

    const stage = player.questStages.gertrudesCat || 0;

    switch (stage) {
        case 0:
            await player.say('hello youngster');
            await npc.say("i don't talk to strange old people");
            break;
        case 1: {
            await player.say("hello there, i've been looking for you");
            await npc.say("i didn't mean to take it!, i just forgot to pay");
            await player.say(
                "what?...i'm trying to help your mum find fluffs"
            );
            await npc.say(
                'ohh..., well, in that case i might be able to help',
                'fluffs followed me to my secret play area..',
                "i haven't seen him since"
            );
            await player.say('and where is this play area?');
            await npc.say("if i told you that, it wouldn't be a secret");

            const first = await player.ask(
                [
                    'tell me sonny, or i will hurt you',
                    'what will make you tell me?',
                    "well never mind, fluffs' loss"
                ],
                false
            );

            if (first === 0) {
                await player.say('tell me sonny, or i will hurt you');
                await npc.say(
                    'w..w..what? y..you wouldn\'t, a young lad like me',
                    "i'd have you behind bars before nightfall"
                );
                await mes(player, "you decide it's best not to hurt the boy");
            } else if (first === 1) {
                await player.say('what will make you tell me?');
                await npc.say(
                    'well...now you ask, i am a bit short on cash'
                );
                await player.say('how much?');
                await npc.say('100 coins should cover it');
                await player.say('100 coins!, why should i pay you?');
                await npc.say(
                    "you shouldn't, but i won't help otherwise",
                    'i never liked that cat any way, so what do you say?'
                );

                const second = await player.ask(
                    ["i'm not paying you a penny", 'ok then, i\'ll pay'],
                    true
                );

                if (second === 0) {
                    await npc.say(
                        'ok then, i find another way to make money'
                    );
                } else if (second === 1) {
                    if (player.inventory.has(COINS_ID, 100)) {
                        await player.say(
                            'there you go, now where did you see fluffs?'
                        );
                        await npc.say(
                            'i play at an abandoned lumber mill to the north..',
                            'just beyond the jolly boar inn...',
                            'i saw fluffs running around in there'
                        );
                        await player.say('anything else?');
                        await npc.say(
                            "well, you'll have to find a broken fence to get in",
                            "i'm sure you can manage that"
                        );
                        await mes(player, 'you give the lad 100 coins');
                        player.inventory.remove(COINS_ID, 100);
                        player.questStages.gertrudesCat = 2;
                    } else {
                        await player.say(
                            "but i'll have to get some money first"
                        );
                        await npc.say("i'll be waiting");
                    }
                }
            } else if (first === 2) {
                await player.say("well, never mind, fluffs' loss");
                await npc.say("i'm sure my mum will get over it");
            }
            break;
        }
        case 2:
        case 3:
            await player.say('where did you say you saw fluffs?');
            await npc.say(
                "weren't you listerning?, i saw the flee bag...",
                '...in the old lumber mill just north east of here',
                'just walk past the jolly boar inn and you should find it'
            );
            break;
        case -1:
            await player.say('hello again');
            await npc.say("you think you're tough do you?");
            await player.say('pardon?');
            await npc.say('i can beat anyone up');
            await player.say('really');
            await mes(player, 'the boy begins to jump around with his fists up');
            await mes(player, "you decide it's best not to kill him just yet");
            break;
    }

    player.disengage();
}

// broken fence

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!(wallObject.id === BROKEN_FENCE_ID && wallObject.y === 438)) {
        return false;
    }

    const stage = player.questStages.gertrudesCat;

    if (stage >= 2 || stage === -1) {
        player.message('you find a crack in the fence');
        player.message('you walk through');
        if (player.x <= 50) {
            player.teleport(51, 438);
        } else {
            player.teleport(50, 438);
        }
    } else {
        player.message('you search the fence');
        player.message("but can't see a way through");
    }

    return true;
}

// picking up fluffs

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!(groundItem.id === GERTRUDES_CAT_ID && groundItem.y === FLUFFS_GROUND_Y)) {
        return false;
    }

    const damage = Math.floor(Math.random() * 2) + 1; // nextInt(2) + 1

    await mes(player, 'you attempt to pick up the cat');
    player.message('but the cat scratches you');
    player.damage(damage);

    await player.say('ouch');

    const stage = player.questStages.gertrudesCat;
    if (stage >= 3 || stage === -1) {
        return true;
    }

    if (player.cache.cat_sardine && player.cache.cat_milk) {
        await mes(player, 'the cats seems afraid to leave');
        await mes(player, 'she keeps meowing');
        await mes(player, 'in the distance you hear kittens purring');
    }
    if (!player.cache.cat_milk) {
        player.message('the cats seems to be thirsty');
    }
    if (player.cache.cat_milk && !player.cache.cat_sardine) {
        player.message('the cats seems to be hungry');
    }

    return true;
}

// using milk/sardine/kittens on fluffs

async function onUseWithGroundItem(player, groundItem, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (groundItem.id !== GERTRUDES_CAT_ID) {
        return false;
    }

    if (
        item.id !== MILK_ID &&
        item.id !== SEASONED_SARDINE_ID &&
        item.id !== KITTENS_ID
    ) {
        return false;
    }

    if (player.questStages.gertrudesCat !== 2) {
        if (item.id === MILK_ID) {
            player.message("the cat doesn't seem to be thirsty");
        } else if (item.id === SEASONED_SARDINE_ID) {
            player.message("the cat doesn't seem to be hungry");
        } else if (item.id === KITTENS_ID) {
            player.message("the cat doesn't seem to be lonely");
        }
        return true;
    }

    if (item.id === MILK_ID) {
        await mes(player, 'you give the cat some milk');
        await mes(player, 'she really enjoys it');
        await mes(player, 'but she now seems to be hungry');
        player.cache.cat_milk = true;
        player.inventory.remove(MILK_ID);
    } else if (item.id === SEASONED_SARDINE_ID) {
        if (player.cache.cat_milk) {
            await mes(player, 'you give the cat the sardine');
            await mes(player, 'the cat gobbles it up');
            await mes(player, 'she still seems scared of leaving');
            player.cache.cat_sardine = true;
            player.inventory.remove(SEASONED_SARDINE_ID);
        }
    } else if (item.id === KITTENS_ID) {
        await mes(player, 'you place the kittens by their mother');
        await mes(player, 'she purrs at you appreciatively');
        await mes(player, 'and then runs off home with her kittens');
        player.inventory.remove(KITTENS_ID);
        player.questStages.gertrudesCat = 3;
        delete player.cache.cat_milk;
        delete player.cache.cat_sardine;
        player.world.removeEntity('groundItems', groundItem);
    }

    return true;
}

// raw sardine + doogle leaves -> seasoned sardine

async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) {
        return false;
    }

    const ids = [item1.id, item2.id];
    if (!ids.includes(RAW_SARDINE_ID) || !ids.includes(DOOGLE_LEAVES_ID)) {
        return false;
    }

    await mes(player, 'you rub the doogle leaves over the sardine');
    player.inventory.remove(DOOGLE_LEAVES_ID);
    player.inventory.remove(RAW_SARDINE_ID);
    player.inventory.add(SEASONED_SARDINE_ID, 1);

    return true;
}

// searching crates/barrel at the lumber mill

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const stage = player.questStages.gertrudesCat;

    if (gameObject.id === CRATE_EMPTY_ID) {
        await mes(player, 'you search the crate...');
        await mes(player, '...but find nothing...');
        if (
            player.inventory.has(KITTENS_ID) ||
            !player.cache.cat_sardine ||
            stage >= 3 ||
            stage === -1
        ) {
            // nothing
        } else {
            await mes(player, "...you hear a cat's purring close by");
        }
        return true;
    } else if (gameObject.id === BARREL_ID) {
        await mes(player, 'you search the barrel...');
        await mes(player, '...but find nothing...');
        if (
            player.inventory.has(KITTENS_ID) ||
            !player.cache.cat_sardine ||
            stage >= 3 ||
            stage === -1
        ) {
            // nothing
        } else {
            await mes(player, "...you hear a cat's purring close by");
        }
        return true;
    } else if (gameObject.id === CRATE_KITTENS_ID) {
        await mes(player, 'you search the crate...');
        if (
            player.inventory.has(KITTENS_ID) ||
            !player.cache.cat_sardine ||
            stage >= 3 ||
            stage === -1
        ) {
            await mes(player, 'you find nothing...');
        } else {
            await mes(player, '...and find two kittens');
            player.inventory.add(KITTENS_ID, 1);
        }
        return true;
    }

    return false;
}

// dropping kittens sends them back to the crate

async function onDropItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id !== KITTENS_ID) {
        return false;
    }

    await mes(player, 'you drop the kittens');
    await mes(player, 'they run back to the crate');
    player.inventory.remove(KITTENS_ID);

    return true;
}

module.exports = {
    onTalkToNPC,
    onWallObjectCommandOne,
    onGroundItemTake,
    onUseWithGroundItem,
    onUseWithInventory,
    onGameObjectCommandOne,
    onDropItem
};
