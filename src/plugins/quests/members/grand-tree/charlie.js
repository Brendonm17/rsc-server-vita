
const { questsEnabled } = require('../../custom-gate.js');
const { QUEST_KEY, CHARLIE } = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== CHARLIE) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY] || 0;
    const n = npc;

    switch (stage) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case -1:
            player.message('the prisoner is in no mood to talk');
            break;
        case 5:
            await player.say(
                'tell me,why would you want to kill the grand tree?'
            );
            await n.say('what do you mean?');
            await player.say(
                "don't tell me, you just happened to be caught carrying " +
                    'daconia rocks!'
            );
            await n.say('all i know, is that i did what i was asked');
            await player.say("i don't understand?");
            await n.say(
                'glough paid me to go see this gnome on a hill',
                'i gave the gnome a letter glough gave me',
                'and he gave me some rocks to give glough',
                "i've been doing it for weeks, it's just this time..",
                '...when i returned glough locked me up here',
                "i just don't understand it"
            );
            await player.say("sounds like glough's hiding something");
            await n.say(
                "i don't know what he's up to",
                'but if you want to find out...',
                '..you better search his home'
            );
            await player.say('ok, thanks charlie');
            await n.say('good luck');
            player.questStages[QUEST_KEY] = 6;
            break;
        case 6:
        case 7:
            await player.say('hello charlie');
            await n.say(
                'hello adventurer, have you figured out what\'s going on?'
            );
            await player.say('no idea');
            await n.say(
                "to get to the bottom of this you'll need to search glough's " +
                    'home'
            );
            break;
        case 8:
        case 9:
            await player.say("i can't figure this out charlie");
            await n.say(
                'go and see a forman in west karamja',
                "there's a shipyard there,you might find some clues",
                "don't forget the password's ka-lu-min",
                "if they realise that you're not working for glough...",
                "...there'll be trouble"
            );
            break;
        case 10:
        case 11:
            await player.say('how are you doing charlie');
            await n.say("i've been better");
            await player.say('glough has some plan to rule runescape');
            await n.say(
                "i wouldn't put it past him, the gnome's crazy"
            );
            await player.say('i need some proof to convince the king');
            await n.say(
                'hmmm, you could be in luck',
                'before glough had me locked up i heard him mention..',
                "..that he'd left his chest lock keys at his girlfriends"
            );
            await player.say('where does she live?');
            await n.say('just west of the toad swamp');
            await player.say("okay, i'll see what i can find");
            if ((player.questStages[QUEST_KEY] || 0) === 10) {
                player.questStages[QUEST_KEY] = 11;
            }
            break;
        default:
            break;
    }

    player.disengage();
    return true;
}

// blockAttackNpc/onAttackNpc: can't attack Charlie through the bars.
async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== CHARLIE) {
        return false;
    }

    player.message("you can't attack through the bars");
    return true;
}

module.exports = { onTalkToNPC, onNPCAttack };
