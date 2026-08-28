// Charlie the Cook (Brimhaven, npc 261) - the Phoenix gang's man in Brimhaven.
//
// Charlie only hands out a hint about the secret side-entrance to Scarface
// Pete's mansion - he does not give the master thief armband. The armband is
// handed out by the two gang leaders: Straven (Phoenix, see
// quests/free/shield-of-arrav/straven.js) and Katrine (Black Arm, see
// quests/free/shield-of-arrav/katrine.js). Charlie is reached via Alfonse the
// Waiter's private door (wall object 78, gated on cache.talked_alf), so this
// handler only becomes reachable once Alfonse's "gherkin" dialogue is ported.

const CHARLIE_THE_COOK_ID = 261;

async function fellowPhoenix(player, npc) {
    await npc.say('Aha a fellow phoenix', 'What brings you to Brimhaven?');

    const menu = await player.ask(
        [
            'Sun, sand and the fresh sea air',
            "I want to steal Scarface Pete's candlesticks"
        ],
        true
    );

    if (menu === 0) {
        await npc.say('Well they are some things we have here yes');
    } else if (menu === 1) {
        await npc.say(
            'Ah yes the candlesticks',
            "Our progress hasn't been amazing on that front",
            'Though we can help you a bit',
            'The setting up of this restaurant is the start of things',
            'We have a secret door out of the back of here',
            "It leads through the back of Mr Olbor's garden",
            "At the other side of Olbor's garden is an old side entrance",
            "To Scarface Pete's mansion",
            'It seems to have been blocked off from the rest of the mansion',
            "We can't find a way through, we're sure it must be of some use though"
        );
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== CHARLIE_THE_COOK_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Hey what are you doing round here');

    const menu = await player.ask(
        [
            "I'm looking for a gherkin",
            "I'm a fellow member of the phoenix gang",
            'Just exploring'
        ],
        true
    );

    if (menu === 0 || menu === 1) {
        await fellowPhoenix(player, npc);
    } else if (menu === 2) {
        await npc.say(
            "This kitchen isn't for exploring",
            "It's a private establishment, now get out"
        );
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
