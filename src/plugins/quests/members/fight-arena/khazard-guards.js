// fight arena: the three khazard guards - bribable (holds the cell keys), by-prisoner, and mace (attacks outsiders)

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    GUARD_KHAZARD_BRIBABLE_ID,
    GUARD_KHAZARD_BYPRISONER_ID,
    GUARD_KHAZARD_MACE_ID,
    KHALI_BREW_ID,
    KHAZARD_CELL_KEYS_ID,
    hasDisguise
} = require('./ids.js');

async function bribableGuard(player, npc) {
    const { world } = player;
    const stage = player.questStages[QUEST_KEY];

    if (stage === 3 || stage === -1) {
        if (hasDisguise(player)) {
            await player.say('hello');
            await npc.say(
                'less chat and more work',
                "i can't stand lazy guards"
            );
        } else {
            await npc.say(
                'this area is restricted, leave now',
                "OUT and don't come back!"
            );
            player.message('@que@the guard has thrown you out');
            await world.sleepTicks(3);
            player.teleport(621, 698, false);
        }
        return;
    }

    if (player.cache.guard_sleeping || player.cache.freed_servil) {
        if (player.inventory.has(KHAZARD_CELL_KEYS_ID)) {
            await npc.say('please, let me rest');
        } else {
            await player.say("i've lost the keys");
            await npc.say(
                "what?! you're foolish..",
                "hiccup.. and i'm drunk",
                "here, i've got another set"
            );
            player.inventory.add(KHAZARD_CELL_KEYS_ID, 1);
        }
        return;
    }

    if (stage === 2) {
        await player.say('hello again');
        await npc.say(
            'bored, bored, bored',
            'you would think the slaves would be more entertaining',
            "selfish.. the lot of 'em"
        );
        if (player.inventory.has(KHALI_BREW_ID)) {
            await player.say('do you still fancy a drink?');
            await npc.say(
                "I really shouldn't... ok then, just the one",
                'this stuff looks good'
            );
            player.inventory.remove(KHALI_BREW_ID);
            player.message('@que@the guard takes a mouthful of drink');
            await world.sleepTicks(3);
            await npc.say(
                'blimey this stuff is pretty good',
                "it's not too strong is it?"
            );
            await player.say("no, not at all, you'll be fine");
            player.message('@que@the guard finishes the bottle');
            await world.sleepTicks(3);
            await npc.say(
                'that is some gooood stuff',
                'yeah... woooh... yeah'
            );
            player.message('@que@the guard seems quite typsy');
            await world.sleepTicks(3);
            await player.say('are you alright?');
            await npc.say(
                "yeesshh, ooohh, 'hiccup'",
                'maybe i should relax for a while....'
            );
            await player.say("good idea, i'll look after the prisoners");
            await npc.say(
                "ok then, here, 'hiccup',",
                'take these keys',
                "any trouble you give 'em a good beating"
            );
            await player.say("no problem, i'll keep them in line");
            await npc.say('zzzzz zzzzz zzzzz');
            player.message('@que@the guard is asleep');
            await world.sleepTicks(3);
            player.cache.guard_sleeping = true;
            player.inventory.add(KHAZARD_CELL_KEYS_ID, 1);
        }
        return;
    }

    await player.say('long live General Khazard');
    await npc.say(
        'erm.. yes.. quite right',
        'have you come to laugh at the fight slaves?',
        'i used to really enjoy it',
        'but after a while they become quite boring',
        'now i just want a decent drink',
        "mind you, too much khali brew and i'll fall asleep"
    );
}

async function byPrisonerGuard(player, npc) {
    const { world } = player;
    const stage = player.questStages[QUEST_KEY];

    if (stage >= 2 || stage === -1) {
        if (hasDisguise(player)) {
            if (Math.random() < 0.5) {
                await player.say('hello again');
                await npc.say("i hope you're keeping busy?");
                await player.say('of course');
            } else {
                await player.say('hello');
                await npc.say("hello, hope you're keeping busy?");
                await player.say('of course');
            }
            if (stage !== 2) {
                await npc.say(
                    "General Khazard doesn't tolerate the lazy",
                    "if you're not keeping busy",
                    "i'll practice my combat skills on your hide"
                );
            }
        } else {
            await npc.say(
                'this area is restricted, leave now',
                "OUT and don't come back!"
            );
            player.message('@que@the guard has thrown you out');
            await world.sleepTicks(3);
            player.teleport(602, 717, false);
        }
        return;
    }

    await player.say('long live General Khazard');
    await npc.say('erm.. yes.. soldier', "i take it you're new");
    await player.say('you could say that');
    await npc.say(
        'Khazard died two hundred years ago',
        'however his dark spirit remains',
        'in the form of the undead maniac...General Khazard',
        'remember he is your master, always watching',
        'you got that, newbie?'
    );
    await player.say('undead, maniac, master, got it - loud and clear');
}

async function maceGuard(player, npc) {
    const stage = player.questStages[QUEST_KEY];

    if (stage === 3 || stage === -1) {
        await player.say('hello');
        await npc.say(
            "you're the outsider who killed bouncer",
            'die traitor!'
        );
        player.disengage();
        await npc.attack(player);
        return true;
    }

    await player.say('hello');
    if (hasDisguise(player)) {
        await npc.say(
            'can i help you stranger?',
            "oh.. you're a guard as well",
            "that's ok then",
            "we don't like outsiders around here"
        );
    } else {
        await npc.say("i don't know you stranger", 'get of our land');
        player.disengage();
        await npc.attack(player);
        return true;
    }

    return false;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === GUARD_KHAZARD_BRIBABLE_ID) {
        player.engage(npc);
        await bribableGuard(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === GUARD_KHAZARD_BYPRISONER_ID) {
        player.engage(npc);
        await byPrisonerGuard(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === GUARD_KHAZARD_MACE_ID) {
        player.engage(npc);
        const attacked = await maceGuard(player, npc);
        if (!attacked) {
            player.disengage();
        }
        return true;
    }

    return false;
}

module.exports = { onTalkToNPC };
