// The High Priest greets everyone. Once The Holy Grail is at stage >= 2 he tells
// the player the grail once passed through Entrana, and - if The Crone is nearby
// gives the six heads / blow whistle directions, advances stage 2 -> 3
//
// ids (quest key shared across the-holy-grail/*):
//   HIGH_PRIEST_OF_ENTRANA = 395  ("High priest of entrana", "A Peaceful monk")
//   CRONE                  = 394  ("Crone", "A strange old lady")
//   quest key              = 'theHolyGrail'
// both npcs spawn on Entrana ~5 tiles apart (High Priest 406,562; Crone 411,560)

const HIGH_PRIEST_OF_ENTRANA_ID = 395;
const CRONE_ID = 394;
const QUEST_KEY = 'theHolyGrail';

// sub-dialogue ids.
const FISHER_KING = 0;
const SIX_HEADS = 1;
const WHISTLE = 2;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

// n = current speaker, reassigned from High Priest to Crone at the grail line
async function entranaPriestDialogue(player, n, cID) {
    if (cID === -1) {
        await n.say('Many greetings welcome to our fair island');
        if (getStage(player) >= 2) {
            await player.say('Hello, I am in search of the holy grail');
            await n.say(
                'The object of which you speak did once pass through holy entrana',
                'I know not where it is now',
                'Nor do I really care'
            );
            n = player.getNearbyEntitiesByID('npcs', CRONE_ID, 20)[0];
            if (n) {
                await n.say(
                    'Wait!',
                    'Did you say the grail?',
                    'You are a grail knight yes?',
                    "Well you'd better hurry, a fisher king is in pain"
                );
                await player.say(
                    "Well I would but I don't know where I am going"
                );
                await n.say(
                    'Go to where the six heads face',
                    'blow the whistle and away you go'
                );
                if (getStage(player) === 2) {
                    player.questStages[QUEST_KEY] = 3;
                }
                const menu = await player.ask(
                    [
                        'What are the six heads?',
                        "What's a fisher king?",
                        'Ok I will go searching',
                        'What do you mean by the whistle?'
                    ],
                    true
                );
                if (menu === 0) {
                    await entranaPriestDialogue(player, n, SIX_HEADS);
                } else if (menu === 1) {
                    await entranaPriestDialogue(player, n, FISHER_KING);
                } else if (menu === 3) {
                    await entranaPriestDialogue(player, n, WHISTLE);
                }
            }
            return;
        } else {
            await n.say('enjoy your stay hear', 'May it be spiritually uplifting');
        }
    }

    if (cID === FISHER_KING) {
        await n.say('The fisher king is the owner and slave of the grail');
        await player.say('What are the four heads?');
        // the recorded dialogue ends here
    } else if (cID === SIX_HEADS) {
        await n.say(
            'The six  stone heads have appeared just recently in the world',
            'They all face the point of realm crossing',
            'Find where two of the heads face',
            'And you should be able to pinpoint where it is'
        );
        const m = await player.ask(
            [
                "What's a fisher king?",
                'Ok I will go searching',
                'What do you mean by the whistle?',
                'the point of realm crossing?'
            ],
            false
        );
        if (m === 0) {
            await player.say("What's a fisher king?");
            await entranaPriestDialogue(player, n, FISHER_KING);
        } else if (m === 1) {
            await player.say('Ok I will go searching');
        } else if (m === 2) {
            await player.say('What do you mean by the whistle?');
            await entranaPriestDialogue(player, n, WHISTLE);
        } else if (m === 3) {
            await player.say('The point of realm crossing');
            await n.say(
                'The realm of the fisher king is not quite of this reality',
                'It is of a reality very close to ours though',
                "Where it's easiest to cross that is a point of realm crossing"
            );
        }
    } else if (cID === WHISTLE) {
        await n.say(
            "You don't know about the whistles yet?",
            'the whistles are easy',
            "You will need one to get to and from the fisher king's realm",
            'they reside in a haunted manor house in Misthalin',
            'though you may not perceive them unless you carry something',
            'From the realm of the fisher king'
        );
        const m1 = await player.ask(
            [
                'What are the four heads?',
                "What's a fisher king?",
                'Ok I will go searching'
            ],
            false
        );
        if (m1 === 0) {
            await player.say('What are the six heads?');
            await entranaPriestDialogue(player, n, SIX_HEADS);
        } else if (m1 === 1) {
            await player.say("What's a fisher king?");
            await entranaPriestDialogue(player, n, FISHER_KING);
        } else if (m1 === 2) {
            await player.say('Ok I will go searching');
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== HIGH_PRIEST_OF_ENTRANA_ID) {
        return false;
    }

    player.engage(npc);
    await entranaPriestDialogue(player, npc, -1);
    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
