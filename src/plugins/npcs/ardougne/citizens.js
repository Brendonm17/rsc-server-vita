// onTalkToNPC for west ardougne citizens and the recruiter, who gets a thrown tomato
// if certain citizens stand nearby.

const ItemId = { TOMATO: 320 };

const NpcId = {
    CITIZEN_TIRED: 438,
    CITIZEN_FRIGHTENED: 439,
    CITIZEN_FRUSTRATED: 440,
    CITIZEN_ANGRY: 441,
    CITIZEN_DISILLUSIONED: 442,
    RECRUITER: 468
};

const CITIZEN_IDS = new Set([
    NpcId.CITIZEN_TIRED,
    NpcId.CITIZEN_FRIGHTENED,
    NpcId.CITIZEN_FRUSTRATED,
    NpcId.CITIZEN_ANGRY,
    NpcId.CITIZEN_DISILLUSIONED,
    NpcId.RECRUITER
]);

// random(low, high), inclusive of both bounds.
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// the nearest visible npc of that id within radius tiles.
function nearestVisibleNpc(player, id, radius) {
    return Array.from(player.world.npcs.getAllByID(id)).find((n) => {
        return (
            player.localEntities.known.npcs.has(n) &&
            n.getDistance(player) <= radius
        );
    });
}

async function onTalkToNPC(player, npc) {
    if (!CITIZEN_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    let menu;
    let citizen;

    switch (npc.id) {
        case NpcId.CITIZEN_TIRED:
            await player.say('good day');
            await npc.say(
                "We don't have good days here anymore",
                'Curse King Tyras'
            );
            menu = await player.ask(
                [
                    'Oh ok bad day then',
                    'Why what has he done?',
                    'I\'m looking for a woman called Elena'
                ],
                true
            );
            if (menu === 1) {
                await npc.say(
                    'His army curses are city with this plague',
                    'Then wanders off again',
                    'leaving us to clear up the pieces'
                );
            } else if (menu === 2) {
                await npc.say('Not heard of her');
            }
            break;

        case NpcId.CITIZEN_FRIGHTENED:
            await player.say('good day');
            await npc.say(
                'an outsider!',
                'Can you get me out of this hell hole?'
            );
            await player.say('Sorry that is not what I am here to do');
            break;

        case NpcId.CITIZEN_FRUSTRATED:
            await player.say("Hello how's it going");
            await npc.say(
                "Bah Those mourners they're meant to be helping us",
                "but I think they're doing more harm here than good",
                "They won't even let me send a letter out to my family"
            );
            menu = await player.ask(
                [
                    'Have you seen a lady called Elena around here?',
                    'You should stand up to them more'
                ],
                true
            );
            if (menu === 0) {
                await npc.say(
                    "Yes I've seen her",
                    'Very helpful person',
                    'Not for the last few days though',
                    "I thought maybe she'd gone home"
                );
            } else if (menu === 1) {
                await npc.say("Oh I'm not one to cause a fuss");
            }
            break;

        case NpcId.CITIZEN_ANGRY:
            await player.say('Hello there');
            await npc.say(
                'Go away',
                'People from the outside shut us in like animals',
                'I have nothing to say to you'
            );
            break;

        case NpcId.CITIZEN_DISILLUSIONED:
            await player.say("Hello, how's it going?");
            await npc.say('Life is tough');
            menu = await player.ask(
                [
                    'Yes living in a plague city must be hard',
                    "I'm sorry to hear that",
                    "I'm looking for a lady called Elena"
                ],
                true
            );
            if (menu === 0) {
                await npc.say(
                    'Plague?',
                    "pah that's no excuse for the treatment we've received",
                    "Its obvious pretty quickly if someone has the plague",
                    "I'm thinking about making a break for it",
                    "I'm perfectly healthy",
                    'Not gonna infect anyone'
                );
            } else if (menu === 1) {
                await npc.say(
                    'Well aint much either you or me can do about it'
                );
            } else if (menu === 2) {
                await npc.say(
                    "I've not heard of her",
                    'Old Jethick knows lots of people',
                    "Maybe he'll no where you can find her"
                );
            }
            break;

        case NpcId.RECRUITER: {
            await npc.say(
                'Citizens of West Ardougne',
                'who will join the Royal army of Ardougne?',
                'It is a very noble cause',
                'Fight alongside king Tyras',
                'Crusading in the darklands of the west'
            );

            let treason = false;

            // no nearby citizens -> the recruiter says nothing more
            citizen = nearestVisibleNpc(player, NpcId.CITIZEN_TIRED, 10);
            if (citizen) {
                await citizen.say("Go away - we don't support your army");
                treason = true;
            }

            citizen = nearestVisibleNpc(player, NpcId.CITIZEN_FRUSTRATED, 10);
            if (citizen) {
                await citizen.say('Plaguebringer!');
                treason = true;
            }

            citizen = nearestVisibleNpc(player, NpcId.CITIZEN_ANGRY, 10);
            if (citizen) {
                await citizen.say('King Tyras is scum');
                treason = true;
            }

            // any citizen outburst -> treason line + a thrown tomato
            if (treason) {
                await npc.say('Tyras will be informed of these words of treason');
                await player.world.sleepTicks(1);
                player.message('@que@Someone throws a tomato at the recruiter');
                await player.world.sleepTicks(3);
                player.world.addPlayerDrop(
                    player,
                    ItemId.TOMATO,
                    random(npc.x - 1, npc.x + 1),
                    random(npc.y - 1, npc.y + 1)
                );
            }
            break;
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
