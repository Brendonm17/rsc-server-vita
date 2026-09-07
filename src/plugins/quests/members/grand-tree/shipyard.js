// grand tree shipyard: workers, the foreman, and the foreman in his hut

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    SHIPYARD_WORKER_WHITE,
    SHIPYARD_WORKER_BLACK,
    SHIPYARD_FOREMAN,
    SHIPYARD_FOREMAN_HUT,
    INVOICE,
    ifNearVisNpc
} = require('./ids.js');

async function talkShipyardWorker(player, n) {
    const selected = Math.floor(Math.random() * 14);
    const isAlternative = n.id === SHIPYARD_WORKER_BLACK;

    await player.say('hello');

    if (selected === 0) {
        await n.say('ouch');
        await player.say("what's wrong?");
        await n.say('i cut my finger', 'do you have a bandage?');
        await player.say("i'm afraid not");
        await n.say("that's ok, i'll use my shirt");
    } else if (selected === 1) {
        await player.say('you look busy');
        await n.say(
            'we need double the men to get..',
            '...this order out on time'
        );
    } else if (selected === 2) {
        await n.say('hello matey');
        await player.say('how are you?');
        await n.say('tired');
        await player.say("you shouldn't work so hard");
    } else if (selected === 3) {
        await player.say('what are you building?');
        await n.say('are you serious?');
        await player.say('of course not', "you're obviously building a boat");
    } else if (selected === 4) {
        await player.say('looks like hard work');
        await n.say('i like to keep busy');
    } else if (selected === 5) {
        await n.say('no time to talk', "we've a fleet to build");
    } else if (selected === 6) {
        await player.say('quite an impressive set up');
        await n.say(
            'it needs to be...',
            '..there\'s no other way to build a fleet of this size'
        );
    } else if (selected === 7) {
        await player.say("quite a few ships you're building");
        await n.say(
            'this is just the start',
            'the completed fleet will be awesome'
        );
    } else if (selected === 8) {
        await player.say('so where are you sailing?');
        await n.say('what do you mean?');
        await player.say("don't worry, just kidding!");
    } else if (selected === 9) {
        await player.say('how are you?');
        await n.say('too busy to waste time gossiping');
        await player.say('touchy');
    } else if (selected === 10) {
        await n.say('can i help you');
        await player.say("i'm just looking around");
        await n.say(
            "well there's plenty of work to be done",
            "so if you don't mind..."
        );
        await player.say('of course, sorry to have disturbed you');
    } else if (selected === 11) {
        await n.say('hello there', 'are you too lazy to work as well');
        await player.say('something like that');
        await n.say("i'm just sun bathing");
    } else if (selected === 12) {
        await n.say('hello there');
        await n.say("i haven't seen you before");
        await player.say("i'm new");
        await n.say("well it's hard work, but the pay is good");
    } else if (selected === 13) {
        await n.say('what do you want?');
        await player.say(
            isAlternative
                ? 'is that anyway to talk to your new superior?'
                : 'is that any way to talk to your new superior?'
        );
        await n.say("oh, i'm sorry, i didn't realise");
    }
}

async function talkShipyardForeman(player, n) {
    const { world } = player;

    if ((player.questStages[QUEST_KEY] || 0) >= 10) {
        player.message('the forman is too busy to talk');
        return;
    }

    await player.say('hello, are you in charge?');
    await n.say("that's right, and you are?");
    await player.say('glough sent me to check up on things');
    await n.say('is that right, glough sent a human');
    await player.say('his gnomes were all busy');
    await n.say('ok, we had better go inside, follow me');
    player.teleport(408, 753);

    const stage = player.questStages[QUEST_KEY] || 0;

    if (stage === 8) {
        player.message('you follow the foreman into the wooden hut');
        const hutForeman = ifNearVisNpc(player, SHIPYARD_FOREMAN_HUT, 4);
        if (!hutForeman) {
            return;
        }
        player.engage(hutForeman);
        await hutForeman.say("so tell me again why you're here");
        await player.say('erm...glough sent me?');
        await hutForeman.say('ok and how is glough..still with his wife?');

        const menu = await player.ask(
            [
                "yes, they're both getting on great",
                'always arguing as usual',
                'his wife is no longer with us'
            ],
            false
        );

        if (menu === 0 || menu === 1) {
            player.questStages[QUEST_KEY] = 9;
            await hutForeman.say(
                'really...',
                '..that\'s strange, considering she died last year',
                'die imposter'
            );
            player.disengage();
            await hutForeman.attack(player);
        } else if (menu === 2) {
            await hutForeman.say(
                'right answear, i have to watch out for imposters',
                'if really know glough...',
                'you know his favourite gnome dish'
            );
            const menu2 = await player.ask(
                [
                    'he loves tangled toads legs',
                    'he loves worm holes',
                    'he loves choc bombs'
                ],
                false
            );
            if (menu2 === 0 || menu2 === 2) {
                player.questStages[QUEST_KEY] = 9;
                await hutForeman.say('he hates them', 'die imposter');
                player.disengage();
                await hutForeman.attack(player);
            } else if (menu2 === 1) {
                await hutForeman.say(
                    'ok, one more question',
                    "what's the name of his new girlfriend"
                );
                const menu3 = await player.ask(
                    ['Alia', 'Anita', 'Elena'],
                    false // do not send over
                );
                if (menu3 === 0 || menu3 === 2) {
                    player.questStages[QUEST_KEY] = 9;
                    if (menu3 === 0) {
                        await player.say('alia');
                    } else if (menu3 === 2) {
                        await player.say('elena');
                    }
                    await hutForeman.say(
                        'you almost fooled me',
                        'die imposter'
                    );
                    player.disengage();
                    await hutForeman.attack(player);
                } else if (menu3 === 1) {
                    await player.say('anita');
                    await hutForeman.say(
                        'well, well ,well, you do know glough',
                        "sorry for the interrogation but i'm sure you " +
                            'understand'
                    );
                    await player.say('of course, security is paramount');
                    await hutForeman.say(
                        'as you can see the ship builders are ready'
                    );
                    await player.say('indeed');
                    await hutForeman.say(
                        'when i was asked to build a fleet large enough...',
                        '..to invade port sarim and carry 300 gnome troops...',
                        '..i said if anyone can, i can'
                    );
                    await player.say("that's a lot of troops");
                    await hutForeman.say(
                        'true but if the gnomes are really going to..',
                        '..take over runescape, they\'ll need at least that'
                    );
                    await player.say('take over?');
                    await hutForeman.say(
                        'of course, why else would glough want 30 battleships',
                        "between you and me, i don't think he stands a chance"
                    );
                    await player.say('no');
                    await hutForeman.say(
                        "i mean, for the kind of battleships glough's " +
                            'ordered..',
                        "..i'll need ton's and ton's of timber",
                        'more than any forest i can think of could supply',
                        "still, if he say's he can supply the wood i'm sure " +
                            'he can',
                        'any way, here\'s the invoice'
                    );
                    await player.say('ok, thanks');
                    await hutForeman.say(
                        "i'll need the wood as soon as possible",
                        "if the orders going to be finished in time"
                    );
                    await player.say("ok i'll tell glough");
                    player.message('@que@the foreman hands you the invoice');
                    await world.sleepTicks(3);
                    player.inventory.add(INVOICE, 1);
                    player.questStages[QUEST_KEY] = 10;
                }
            }
        }
    } else if (stage === 9) {
        const hutForeman = ifNearVisNpc(player, SHIPYARD_FOREMAN_HUT, 4);
        if (!hutForeman) {
            return;
        }
        await n.say('die imposter');
        await hutForeman.attack(player);
    }
}

async function talkShipyardForemanHut(player, n) {
    if ((player.questStages[QUEST_KEY] || 0) === 10) {
        player.message('the forman is too busy to talk');
        return;
    }
    await n.say('die imposter');
    await n.attack(player);
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id === SHIPYARD_WORKER_WHITE ||
        npc.id === SHIPYARD_WORKER_BLACK
    ) {
        player.engage(npc);
        await talkShipyardWorker(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === SHIPYARD_FOREMAN) {
        player.engage(npc);
        await talkShipyardForeman(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === SHIPYARD_FOREMAN_HUT) {
        player.engage(npc);
        await talkShipyardForemanHut(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// hut foreman can't be attacked once the invoice is handed over (stage 10)
async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id === SHIPYARD_FOREMAN_HUT &&
        (player.questStages[QUEST_KEY] || 0) === 10
    ) {
        player.message('the forman is too busy to talk');
        return true;
    }

    return false;
}

// killing the hut foreman at stage 9 yields the invoice
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== SHIPYARD_FOREMAN_HUT) {
        return false;
    }

    if ((player.questStages[QUEST_KEY] || 0) === 9) {
        player.message('@que@you kill the foreman');
        await player.world.sleepTicks(3);
        player.message('@que@inside his pocket you find an invoice..');
        await player.world.sleepTicks(3);
        player.message('@que@it seems to be an order for timber');
        await player.world.sleepTicks(3);
        player.inventory.add(INVOICE, 1);
        player.questStages[QUEST_KEY] = 10;
    }

    return false;
}

module.exports = { onTalkToNPC, onNPCAttack, onNPCDeath };
