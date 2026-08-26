
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    GLOUGH,
    GNOME_GUARD_PRISON,
    CHARLIE,
    KING_NARNODE_SHAREEN,
    ifNearVisNpc,
    addNpc
} = require('./ids.js');

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GLOUGH) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY] || 0;
    const n = npc;
    const { world } = player;

    switch (stage) {
        case 0:
        case 1:
        case 2:
        case 4:
        case 5:
        case 6:
        case 8:
        case 9:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case -1:
            await player.say('hello there');
            await n.say("you shouldn't be here human");
            await player.say('what do you mean?');
            await n.say('the gnome stronghold is for gnomes alone');
            await player.say('surely not!');
            await n.say("we don't need you're sort around here");
            player.message("he doesn't seem very nice");
            await world.sleepTicks(3);
            break;
        case 3:
            await player.say('hello');
            player.message('the gnome is munching on a worm hole');
            await world.sleepTicks(3);
            await n.say(
                "can i help human, can't you see i'm eating?",
                'these are my favourite'
            );
            player.message('the gnome continues to eat');
            await world.sleepTicks(3);
            await player.say(
                'the king asked me to inform you...',
                'that the daconia rocks have been taken'
            );
            await n.say('surley not!');
            await player.say(
                'apparently a human took them from hazelmere',
                "he had a permission note with the king's seal"
            );
            await n.say('i should have known, the humans are going to invade');
            await player.say('never');
            await n.say(
                "your type can't be trusted",
                "i'll take care of this, you go back to the king"
            );
            player.questStages[QUEST_KEY] = 4;
            break;
        case 7: {
            await player.say(
                "glough, i don't know what you're up to...",
                '...but i know you paid charlie to get those rocks'
            );
            await n.say(
                "you're a fool human",
                'you have no idea whats going on'
            );
            await player.say(
                "i know the grand tree's dying",
                "and i think you're part of the reason"
            );
            await n.say(
                "how dare you accuse me, i'm the head tree guardian",
                'guards...guards'
            );
            player.message('gnome guards hurry up the ladder');
            const gnomeGuard = addNpc(
                world,
                GNOME_GUARD_PRISON,
                714,
                1421,
                12
            );
            await n.say('take him away');
            await player.say('what for?');
            await n.say(
                'grand treason against his majesty king shareem',
                'this man is a human spy'
            );
            if (gnomeGuard && gnomeGuard.world) {
                world.removeEntity('npcs', gnomeGuard);
            }
            await n.say('lock him up');
            player.message('the gnome guards take you to the top of the grand tree');
            await world.sleepTicks(3);
            player.disengage();
            player.teleport(419, 2992);
            await world.sleepTicks(8);

            const jailCharlie = ifNearVisNpc(player, CHARLIE, 5);
            if (jailCharlie) {
                player.engage(jailCharlie);
                await jailCharlie.say("so, they've got you as well");
                await player.say(
                    "it's glough, he's trying to cover something up"
                );
                await jailCharlie.say(
                    "i shouldn't tell you this adventurer",
                    'but if you want to get to the bottom of this',
                    'you should go and talk to the karamja foreman'
                );
                await player.say('why?');
                await jailCharlie.say(
                    'glough sent me to karamja to meet him',
                    'i delivered a large amount of gold',
                    'for what i do not know',
                    "but he may be able to tell you what glough's up to",
                    "that's if you can get out of here",
                    "you'll find him in a ship yard south of birmhaven",
                    "be careful, if he discovers that you're not...",
                    "...working for glough there'll be trouble",
                    'the sea men use the pass word ka-lu-min'
                );
                await player.say('thanks charlie');
                player.disengage();
                await world.sleepTicks(8);

                const narnode = addNpc(
                    world,
                    KING_NARNODE_SHAREEN,
                    419,
                    2993,
                    36
                );
                player.engage(narnode);
                await narnode.say(
                    'adventurer please accept my apologies',
                    'glough had no right to arrest you',
                    "i just think he's scared of humans",
                    'let me get you out of there'
                );
                player.message('king shareem opens the cage');
                await world.sleepTicks(3);
                player.teleport(418, 2993);
                await player.say(
                    "i don't think you can trust glough, narnode",
                    'he seems to have a unatural hatred for humans'
                );
                await narnode.say(
                    'i know he can seem a little extreme at times',
                    "but he's the best tree guardian i have",
                    'he has however caused much fear towards humans',
                    "i'm afraid he's placed guards on the front gate...",
                    '...to stop you escaping',
                    'let my glider pilot fly you away',
                    'untill things calm down around here'
                );
                await player.say("well, if that's how you feel");
                player.disengage();
                if (narnode && narnode.world) {
                    world.removeEntity('npcs', narnode);
                }
                player.questStages[QUEST_KEY] = 8;
            }
            return true;
        }
        case 10:
            await player.say("I know what you're up to glough");
            await n.say('you have no idea human');
            await player.say(
                'you may be able to make a fleet',
                'but the tree gnomes will never follow you into battle'
            );
            await n.say(
                "so, you know more than i thought, i'm impressed",
                'the gnomes fear humanity more than any other race',
                'i just need to give them a push in the right direction',
                "there's nothing you can do traveller",
                "leave before it's too late",
                'soon all of runescape will feel the wrath of glough'
            );
            await player.say("king shareem won't allow it");
            await n.say(
                "the king's a fool and a coward, he'll soon bow to me",
                "and you'll soon be back in that cage"
            );
            break;
        case 11:
            await player.say("i'm going to stop you glough");
            await n.say("you're becoming quite annoying traveller");
            player.message('glough is searching his pockets');
            await world.sleepTicks(3);
            player.message('he seems very uptight');
            await world.sleepTicks(3);
            await n.say(
                'damn keys',
                'leave human, before i have you put in the cage'
            );
            break;
        default:
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
