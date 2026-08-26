// black knight titan, unhappy peasant, fisherman, fisher king, king percival,
// happy peasant; fisher king advances stage 3 -> 4

const GroundItem = require('../../../../model/ground-item');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    BLACK_KNIGHT_TITAN_ID,
    UNHAPPY_PEASANT_ID,
    FISHERMAN_ID,
    FISHER_KING_ID,
    KING_PERCIVAL_ID,
    HAPPY_PEASANT_ID,
    BELL_ID
} = require('./ids.js');

// fisher king's identical son/not-well branch reused three ways
async function fisherKingSon(player, npc) {
    await npc.say(
        'Nope I don\'t feel so good either',
        'I fear my life is running short',
        'Alas my son and heir is not here',
        'I am waiting for my son to return to this castle',
        'If you could find my son that would be a great weight off my ' +
            'shoulders'
    );
    await player.say('Who is your son?');
    await npc.say(
        'He is known as Percival',
        'I believe he is a knight of the round table'
    );
    await player.say('I shall go and see if I can find him');
}

// the grail branch, then the not-well/look-around sub-menu
async function fisherKingGrail(player, npc) {
    await npc.say(
        'Ah excellent, a knight come to seek the holy grail',
        "Maybe now our land can be restored to it's former glory",
        'At the moment the grail cannot be removed from the castle',
        'legend has it a questing knight will one day',
        'Work out how to restore our land',
        'then he will claim the grail as his prize'
    );
    await player.say('Any ideas how I can restore the land?');
    await npc.say('None at all');

    const m = await player.ask(
        ["You don't look to well", 'Do you mind if I have a look around?'],
        false
    );

    if (m === 0) {
        await player.say("You don't look too well");
        await fisherKingSon(player, npc);
    } else if (m === 1) {
        await player.say('Do you mind if I have a look around?');
        await npc.say('No not at all, be my guest');
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === BLACK_KNIGHT_TITAN_ID) {
        player.engage(npc);
        await npc.say(
            'I am the black knight titan',
            'You must pass through me before you can continue in this realm'
        );

        const menu = await player.ask(
            ['Ok, have at ye oh evil knight', "Actually I think I'll run away"],
            true
        );

        if (menu === 0) {
            player.disengage();
            await player.world.sleepTicks(2);
            await npc.attack(player);
            return true;
        }

        player.disengage();
        return true;
    }

    if (npc.id === UNHAPPY_PEASANT_ID) {
        player.engage(npc);
        await npc.say(
            'Woe is me',
            'Our crops are all failing',
            'How shall I feed myself this winter?'
        );
        player.disengage();
        return true;
    }

    if (npc.id === FISHERMAN_ID) {
        player.engage(npc);
        await npc.say("Hi - I don't get many visitors here");

        const menu = await player.ask(
            [
                "How's the fishing?",
                'Any idea how to get into the castle?',
                'Yes well this place is a dump'
            ],
            true
        );

        if (menu === 0) {
            await npc.say(
                'Not amazing',
                'Not many fish can live in this gungey stuff',
                'I remember when this was a pleasant river',
                'Teaming with every sort of fish'
            );
        } else if (menu === 1) {
            await npc.say('why thats easy', 'just ring one of the bells outside');
            await player.say("I didn't see any bells");
            await npc.say(
                'You must be blind then',
                "There's always bells there when I go to the castle"
            );
            // addobject(BELL, 1, 421, 30): drop a bell ground item outside.
            const { world } = player;
            const existing = world.groundItems
                .getInArea(421, 30, 0)
                .find((gi) => gi.id === BELL_ID && gi.x === 421 && gi.y === 30);
            if (!existing) {
                world.addEntity(
                    'groundItems',
                    new GroundItem(world, { id: BELL_ID, x: 421, y: 30 })
                );
            }
        } else if (menu === 2) {
            await npc.say(
                'This place used to be very beautiful',
                'However as our king grows old and weak',
                'the land seems to be dying too'
            );
        }

        player.disengage();
        return true;
    }

    if (npc.id === FISHER_KING_ID) {
        player.engage(npc);
        await npc.say(
            'Ah you got inside at last',
            'You spent all that time fumbling around outside',
            "I thought you'd never make it here"
        );

        if ((player.questStages[QUEST_KEY] || 0) === 3) {
            player.questStages[QUEST_KEY] = 4;
        }

        const menu = await player.ask(
            [
                'How did you know what I have been doing?',
                'I seek the holy grail',
                "You don't look too well"
            ],
            true
        );

        if (menu === 0) {
            await npc.say(
                'Oh I can see what is happening in my realm',
                'I have sent clues to help you get here',
                'Such as the fisherman',
                'And the crone'
            );

            const mm = await player.ask(
                [
                    'I seek the holy grail',
                    "You don't look too well",
                    'Do you mind if I have a look around?'
                ],
                true
            );

            if (mm === 0) {
                await fisherKingGrail(player, npc);
            } else if (mm === 1) {
                await fisherKingSon(player, npc);
            } else if (mm === 2) {
                await npc.say('No not at all, be my guest');
            }
        } else if (menu === 1) {
            await fisherKingGrail(player, npc);
        } else if (menu === 2) {
            await fisherKingSon(player, npc);
        }

        player.disengage();
        return true;
    }

    if (npc.id === KING_PERCIVAL_ID) {
        player.engage(npc);
        await npc.say(
            'You missed all the excitement',
            'I got here and agreed to take over duties as king here',
            'Then before my eyes the most miraculous changes occured here',
            'Grass and trees were growing outside before our very eyes',
            'Thankyou very much for showing me the way home'
        );
        player.disengage();
        return true;
    }

    if (npc.id === HAPPY_PEASANT_ID) {
        player.engage(npc);
        await npc.say(
            'Oh happy day',
            'suddenly our crops are growing again',
            "It'll be a bumper harvest this year"
        );
        player.disengage();
        return true;
    }

    return false;
}

module.exports = { onTalkToNPC };
