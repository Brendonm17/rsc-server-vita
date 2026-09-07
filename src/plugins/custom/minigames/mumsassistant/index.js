// mum's assistant: a small repeatable minigame. bring mum a tomato, cheese, and
// pizza dough and she makes a pizza bagel; there is no quest-point or XP reward.
// two menu options cross-link to the a lumbridge carol minigame.
// mums_assistant cache: 0 not started, 1 started, -1 complete.
//
// a lumbridge carol is ported in the sibling a-lumbridge-carol plugin, which is
// registered first and intercepts talk-to-mum in the party room and at carol
// stage LETTER_DELIVERY; this file handles every other mum interaction. the
// aLumbridgeCarol bridge below reproduces its predicates as a fallback.

const { customQuestsEnabled } = require('../../../quests/custom-gate.js');

// ids
const MUM_ID = 814;

const CHEESE_ID = 319;
const TOMATO_ID = 320;
const PIZZA_BASE_ID = 321;
const PIZZA_BAGEL_ID = 1422;

const RED_CHRISTMAS_SWEATER_ID = 1577;
const FEMALE_RED_CHRISTMAS_SWEATER_ID = 1583;

// the full 12-sweater set, used only by hasSweater
const SWEATER_IDS = [
    1577, 1578, 1579, 1580, 1581, 1582, // male:   red,yellow,blue,purple,orange,green
    1583, 1584, 1585, 1586, 1587, 1588 // female: red,yellow,blue,purple,orange,green
];

// mums_assistant cache stages
const STAGE_NOT_STARTED = 0;
const STAGE_STARTED = 1;
const STAGE_COMPLETED = -1;

// a lumbridge carol constants
const CAROL_LETTER_DELIVERY = 4;
const CAROL_COMPLETED = -1;

// a lumbridge carol bridge: the predicates mum.java calls; the two dialogue
// methods are stubs owned by the a-lumbridge-carol plugin
const aLumbridgeCarol = {
    enabled(player) {
        return customQuestsEnabled(player);
    },

    // ALumbridgeCarol.getStage(): cache "a_lumbridge_carol", default 0.
    getStage(player) {
        const s = player.cache.a_lumbridge_carol;
        return s === undefined ? 0 : s;
    },

    // ALumbridgeCarol.hasSweater(): any sweater held, worn, or banked.
    hasSweater(player) {
        for (const id of SWEATER_IDS) {
            if (player.inventory.has(id, 1)) {
                return true;
            }
            if (
                player.inventory.items.find(
                    (item) => item.id === id && item.equipped
                )
            ) {
                return true;
            }
            if (player.bank && player.bank.has(id, 1)) {
                return true;
            }
        }
        return false;
    },

    // ALumbridgeCarol.inPartyRoom(): coord box (1:1 with upstream).
    inPartyRoom(npc) {
        return (
            npc.x >= 316 && npc.x <= 323 && npc.y >= 1487 && npc.y <= 1494
        );
    },

    // owned by the a-lumbridge-carol plugin, which intercepts first; no-op stubs
    async partyDialogue() {
        // owned by a-lumbridge-carol
    },
    async mumDialogue() {
        // owned by a-lumbridge-carol
    }
};

// small helpers
function stage(player) {
    const s = player.cache.mums_assistant;
    return s === undefined ? STAGE_NOT_STARTED : s;
}

// mark the minigame complete
function handleReward(player) {
    player.cache.mums_assistant = STAGE_COMPLETED;
}

// mum, talk-to-npc
async function mumDialogue(player, npc) {
    // a lumbridge carol party-room intercept; unreachable fallback in normal play
    if (aLumbridgeCarol.enabled(player) && aLumbridgeCarol.inPartyRoom(npc)) {
        await aLumbridgeCarol.partyDialogue(player, npc);
        return;
    }

    await npc.say('Hello, sweetie', 'I hope your adventuring is going well');

    const questState = stage(player);

    // option labels
    const sweater = "I've lost my Christmas sweater";
    const christmas = 'Did you used to date the Duke?';
    const hello = 'Hello mother, how are you today?';
    const whatIngredients = 'What was I supposed to get you again?';
    const haveStuff = 'I have the ingredients you needed';
    const pizzaBagel = 'Could I please have another pizza bagel?';
    const bye = 'Bye, have a good day';

    const options = [];

    if (
        aLumbridgeCarol.enabled(player) &&
        aLumbridgeCarol.getStage(player) === CAROL_LETTER_DELIVERY
    ) {
        options.push(christmas);
    }

    if (
        aLumbridgeCarol.getStage(player) === CAROL_COMPLETED &&
        !aLumbridgeCarol.hasSweater(player)
    ) {
        options.push(sweater);
    }

    if (questState === STAGE_NOT_STARTED) {
        options.push(hello);
    } else if (questState === STAGE_STARTED) {
        options.push(whatIngredients);
        if (
            player.inventory.has(CHEESE_ID, 1) &&
            player.inventory.has(TOMATO_ID, 1) &&
            player.inventory.has(PIZZA_BASE_ID, 1)
        ) {
            options.push(haveStuff);
        }
    } else if (questState === STAGE_COMPLETED) {
        options.push(pizzaBagel);
    }

    options.push(bye);

    const option = await player.ask(options, true);

    if (option === -1) {
        return;
    }

    const chosen = options[option];

    if (chosen === hello) {
        await npc.say(
            'Not very well, actually',
            "I was going to make you a snack, but it seems I don't have the " +
                'ingredients',
            'And I have too much to do around the house to go out and get them'
        );

        const helpChoice = await player.ask(
            ['I could get them for you', "That's okay, don't worry about it"],
            true
        );
        if (helpChoice === 0) {
            await npc.say('Oh would you?', 'That would be wonderful');
            await player.say('What do you need?');
            await npc.say(
                'All I need is a tomato, a wedge of cheese, and some pizza ' +
                    'dough',
                "If you need help, I'm sure you could ask some of your little " +
                    'friends where to find things'
            );
            const startChoice = await player.ask(
                ["Okay, I'll be right back", 'Actually, maybe later'],
                true
            );
            if (startChoice === 0) {
                // Start
                player.cache.mums_assistant = STAGE_STARTED;
            }
        }
    } else if (chosen === whatIngredients) {
        await npc.say(
            'Hehe, you can be so forgetful sometimes',
            'All I need is a tomato, a wedge of cheese, and some pizza dough',
            'Thanks again, dear!'
        );
    } else if (chosen === haveStuff) {
        // re-check the items after the menu yields
        if (
            !player.inventory.has(CHEESE_ID, 1) ||
            !player.inventory.has(TOMATO_ID, 1) ||
            !player.inventory.has(PIZZA_BASE_ID, 1)
        ) {
            return;
        }

        await npc.say('Oh sweetie, thank you so much');

        player.message('@que@You hand your mum the wedge of cheese');
        await player.world.sleepTicks(3);
        player.inventory.remove(CHEESE_ID, 1);

        player.message('@que@You hand your mum the tomato');
        await player.world.sleepTicks(3);
        player.inventory.remove(TOMATO_ID, 1);

        player.message('@que@You hand your mum the pizza dough');
        await player.world.sleepTicks(3);
        player.inventory.remove(PIZZA_BASE_ID, 1);

        player.message(
            '@que@She takes the ingredients and quickly whips up a plate of pizza ' +
                'bagels'
        );
        await player.world.sleepTicks(3);

        await npc.say('Here you are dear');
        player.message('@que@Your mother hands you a pizza bagel');
        await player.world.sleepTicks(3);
        player.inventory.add(PIZZA_BAGEL_ID, 1);

        await player.say('Thank you');
        await npc.say(
            "You can come back whenever you'd like another",
            'Thanks again!'
        );

        handleReward(player);
    } else if (chosen === pizzaBagel) {
        await npc.say(
            'Of course dear',
            'But make sure you go out and get some exercise',
            "We wouldn't want you to get fat"
        );
        player.inventory.add(PIZZA_BAGEL_ID, 1);
        player.message('@que@Your mum hands you a pizza bagel');
        await player.world.sleepTicks(3);
        await player.say('Thank you');
    } else if (chosen === christmas) {
        // unreachable in normal play; a-lumbridge-carol intercepts first
        await aLumbridgeCarol.mumDialogue(player, npc);
    } else if (chosen === sweater) {
        // reachable when carol stage is COMPLETED and no sweater is held
        await npc.say('Oh dear', "That's ok", "Luckily I've made you a spare");
        player.message('@que@Your mum hands you a new Christmas sweater');
        if (player.isMale()) {
            player.inventory.add(RED_CHRISTMAS_SWEATER_ID, 1);
        } else {
            player.inventory.add(FEMALE_RED_CHRISTMAS_SWEATER_ID, 1);
        }
        await player.world.sleepTicks(3);
        await npc.say(
            'Don\'t forget that the material can be dyed very easily',
            'Stay warm!'
        );
    }
    // bye and any unmatched option just end the conversation
}

// plugin entry point

async function onTalkToNPC(player, npc) {
    if (!customQuestsEnabled(player)) {
        return false;
    }

    if (npc.id === MUM_ID) {
        player.engage(npc);
        await mumDialogue(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

module.exports = {
    onTalkToNPC
};
