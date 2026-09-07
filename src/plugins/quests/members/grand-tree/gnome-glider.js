// grand tree gnome glider transport network; the glider object blocks non-gnome use.

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    GNOME_PILOT_GRANDTREE,
    GNOME_PILOT_KARAMJA_BROKEN,
    GNOME_PILOT_KARAMJA,
    GNOME_PILOT_VARROCK,
    GNOME_PILOT_ALKHARID,
    GNOME_PILOT_WHITEMOUNTAIN,
    JOGRE,
    GLIDER,
    ifNearVisNpc
} = require('./ids.js');

// shared glider flight preamble used by the grand tree pilot
async function gliderFlightPreamble(player, n) {
    await n.say(
        'ok, your the boss, jump on',
        "hold on tight, it'll be a rough ride"
    );
    player.message("@que@you hold on tight to the glider's wooden beam");
    await player.world.sleepTicks(3);
    player.message('@que@the pilot leans back and then pushes the glider forward');
    await player.world.sleepTicks(3);
    player.message('@que@you float softly off the grand tree');
    await player.world.sleepTicks(3);
    player.teleport(221, 3567);
    await player.say('whhaaaaaaaaaagghhh');
}

async function talkGliderPilot(player, n) {
    const { world } = player;
    const stage = player.questStages[QUEST_KEY] || 0;

    if (n.id === GNOME_PILOT_VARROCK) {
        await player.say('hello again');
        await n.say(
            'well hello adventurer',
            'as you can see we crashed on impact',
            "i don't think it'll fly again",
            "sorry but you'll have to walk"
        );
        return;
    }

    if (
        n.id === GNOME_PILOT_KARAMJA ||
        n.id === GNOME_PILOT_ALKHARID ||
        n.id === GNOME_PILOT_WHITEMOUNTAIN
    ) {
        if (stage === -1) {
            await player.say('hello again');
            await n.say('well hello adventurer');
            await n.say('would you like to go to the tree gnome stronghold?');
            const travelBackMenu = await player.ask(
                ['ok then', 'no thanks'],
                false
            );
            if (travelBackMenu === 0) {
                await n.say('ok, hold on tight');
                player.message('@que@you both hold onto the wooden beam');
                await world.sleepTicks(3);
                player.message('@que@you take a few steps backand rush forwards');
                await world.sleepTicks(3);
                player.message('@que@the glider just lifts of the ground');
                await world.sleepTicks(3);
                player.teleport(221, 3567);
                await player.say('whhaaaaaaaaaagghhh');
                player.teleport(414, 2995);
            }
            return;
        }
        await player.say('hello');
        await n.say('hello traveller');
        return;
    }

    if (n.id === GNOME_PILOT_GRANDTREE) {
        await player.say('hello');
        if (stage === -1) {
            await n.say('well hello again traveller');
            await n.say('can i take you somewhere?');
            await n.say('i can fly like the birds');
            const menu = await player.ask(
                [
                    'karamja',
                    'varrock',
                    'Al kharid',
                    'white wolf mountain',
                    "I'll stay here thanks"
                ],
                false // do not send over
            );
            if (menu === 0) {
                await player.say('take me to karamja');
                await gliderFlightPreamble(player, n);
                player.teleport(389, 753);
                await player.say('ouch');
            } else if (menu === 1) {
                await player.say('take me to Varrock');
                await gliderFlightPreamble(player, n);
                player.teleport(58, 504);
                await player.say('ouch');
            } else if (menu === 2) {
                await player.say('take me to Al kharid');
                await gliderFlightPreamble(player, n);
                player.teleport(88, 664);
                await player.say('ouch');
            } else if (menu === 3) {
                await player.say('take me to White wolf mountain');
                await gliderFlightPreamble(player, n);
                player.teleport(400, 461);
                await player.say('ouch');
            } else if (menu === 4) {
                await player.say("i'll stay here thanks");
                await n.say(
                    'no worries, let me know if you change your mind'
                );
            }
            return;
        } else if (stage >= 8 && stage <= 9) {
            await n.say('hi, the king said that you need to leave');
            await player.say('yes, apparently humans are invading');
            await n.say(
                'i find that hard to believe',
                'i have lots of human friends'
            );
            await player.say('it seems a bit strange to me');
            await n.say('well, would you like me to take you somewhere?');
            const menu = await player.ask(
                [
                    'actually yes, take me to karamja',
                    "no thanks i'm going to hang around"
                ],
                false
            );
            if (menu === 0) {
                await n.say(
                    'ok, your the boss, jump on',
                    "hold on tight, it'll be a rough ride"
                );
                player.message("@que@you hold on tight to the glider's wooden beam");
                await world.sleepTicks(3);
                player.message(
                    '@que@the pilot leans back and then pushes the glider forward'
                );
                await world.sleepTicks(3);
                player.message('@que@you float softly off the grand tree');
                await world.sleepTicks(3);
                player.teleport(221, 3567);
                await player.say('whhaaaaaaaaaagghhh');
                player.teleport(425, 764);
                await player.say('ouch');

                const brokenPilot = ifNearVisNpc(
                    player,
                    GNOME_PILOT_KARAMJA_BROKEN,
                    5
                );
                if (brokenPilot) {
                    player.engage(brokenPilot);
                    await brokenPilot.say('ouch');
                    player.message('you crash in south karamja');
                    await brokenPilot.say('sorry about that, are you ok');
                    await player.say(
                        "i seem to be fine, can't say the same for your glider"
                    );
                    await brokenPilot.say(
                        "i don't think i can fix this",
                        "looks like we'll be heading back by foot",
                        'i hope you find what you came for adventurer'
                    );
                    await player.say('me too, take care little man');
                    await brokenPilot.say('traveller watch out');
                    player.disengage();
                }

                const jogre = ifNearVisNpc(player, JOGRE, 15);
                if (jogre) {
                    // engage the jogre so its growl line can broadcast
                    player.engage(jogre);
                    await jogre.say('grrrrr');
                    player.disengage();
                    await jogre.attack(player);
                }
            } else if (menu === 1) {
                await n.say("ok, i'll be here if you need me");
            }
            return;
        }
        await n.say('hello traveller');
        return;
    }

    if (n.id === GNOME_PILOT_KARAMJA_BROKEN) {
        player.message('The Gnome pilot does not appear interested in talking');
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        npc.id !== GNOME_PILOT_GRANDTREE &&
        npc.id !== GNOME_PILOT_KARAMJA_BROKEN &&
        npc.id !== GNOME_PILOT_KARAMJA &&
        npc.id !== GNOME_PILOT_VARROCK &&
        npc.id !== GNOME_PILOT_ALKHARID &&
        npc.id !== GNOME_PILOT_WHITEMOUNTAIN
    ) {
        return false;
    }

    player.engage(npc);
    await talkGliderPilot(player, npc);
    player.disengage();
    return true;
}

// glider object (618) - only gnomes can fly these
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== GLIDER) {
        return false;
    }

    player.message('@que@only the gnomes can fly these');
    return true;
}

module.exports = { onTalkToNPC, onGameObjectCommandOne };
