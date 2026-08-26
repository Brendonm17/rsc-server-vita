// king bolren; quest stages 0-6, -1 complete

const { questsEnabled } = require('../../custom-gate.js');
const {
    BOLREN_ID,
    ORB_OF_PROTECTION_ID,
    ORBS_OF_PROTECTION_ID,
    GNOME_EMERALD_AMULET_OF_PROTECTION_ID
} = require('./constants.js');

// reward: 2 qp, attack xp = base_level * 900 + 800
function handleReward(player) {
    player.message('Well done you have completed the treequest');
    player.addQuestPoints(2);
    player.addExperience('attack', player.skills.attack.base * 900 + 800, false);
    player.inventory.add(GNOME_EMERALD_AMULET_OF_PROTECTION_ID, 1);
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== BOLREN_ID) {
        return false;
    }

    player.engage(npc);

    const { world } = player;
    const stage = player.questStages.treeGnomeVillage || 0;

    switch (stage) {
        case 0: {
            await player.say('hello');
            await npc.say(
                'well hello stranger',
                "my name's bolren, i'm the king of the tree gnomes",
                'i\'m surprised you made it in',
                'maybe i made the maze too easy'
            );
            await player.say('maybe');
            await npc.say(
                'i\'m afraid i have more serious concerns at the moment',
                'very serious'
            );

            const first = await player.ask(
                ['I\'ll leave you to it then', 'Can i help at all?'],
                true
            );

            if (first === 0) {
                await player.say('i\'ll leave you too it then');
                await npc.say('ok take care');
            } else if (first === 1) {
                await player.say('can i help at all?');
                await npc.say(
                    'i\'m glad you asked',
                    'the truth is my people are in grave danger',
                    'we have always been protected by the spirit tree',
                    'no creature dark of heart can harm us',
                    'while its three orbs are in place.',
                    'We are not a violent race',
                    'but we fight when we must',
                    'many gnomes have fallen',
                    'battling the dark forces of khazard to the north',
                    'we became desperate',
                    'so we took one orb of protection to the battlefield',
                    'it was a foolish move',
                    'khazard troops siezed the orb',
                    'and now we are completely defenseless'
                );
                await player.say('how can i help?');
                await npc.say(
                    'you would be a huge benefit on the battlefield',
                    'if you would go there and try and retrieve the orb',
                    'my people and i will be forever grateful'
                );

                const second = await player.ask(
                    [
                        'I would be glad to help',
                        'I\'m sorry but i won\'t be involved'
                    ],
                    true
                );

                if (second === 0) {
                    await player.say('i would be glad to help');
                    await npc.say(
                        'thank you',
                        'the battlefield is to the north of the maze',
                        'commander montai will inform you of their current ' +
                            'situation',
                        'that\'s if he\'s still alive',
                        'my assistant shall guide you out',
                        'try your best to return the orb',
                        'good luck friend'
                    );
                    player.message('A gnome guides you out of the maze');
                    player.teleport(624, 675, false);
                    if ((player.questStages.treeGnomeVillage || 0) === 0) {
                        player.questStages.treeGnomeVillage = 1;
                    }
                } else if (second === 1) {
                    await player.say('i\'m sorry but i won\'t be involved');
                    await npc.say('ok then, travel safe');
                }
            }
            break;
        }
        case 1:
            await player.say('hello bolren');
            await npc.say(
                'hello traveller, we must retrieve the orb',
                'it\'s being held by khazard troops',
                'to the west of the maze',
                'above the khazard fight arena'
            );
            await player.say('ok i\'ll try my best');
            break;
        case 2:
        case 3:
        case 4:
            await player.say('hello bolren');
            await npc.say(
                'the orb is being held at the battlefield',
                'to the north of the maze',
                'above the khazard fight arena'
            );
            break;
        case 5:
            await player.say('king bolren are you ok?');
            if (player.inventory.has(ORB_OF_PROTECTION_ID)) {
                await player.say('i have the orb');
                await npc.say(
                    'thank you traveller, but it\'s too late',
                    'we\'re all doomed',
                    'oh my the misery, the horror'
                );
                await player.say('what happened?');
                await npc.say(
                    'they came in the night',
                    'i don\'t how many, enough'
                );
                await player.say('who?');
                await npc.say(
                    'khazard troops',
                    'they slaughtered anyone who got in their way',
                    'women, children, my wife'
                );
                await player.say('i\'m sorry');
                await npc.say(
                    'they took the other orbs',
                    'now we\'re defenseless'
                );
                await player.say('where did they take them?');
                await npc.say(
                    'they headed north of the',
                    'battlefields to the dead valleys',
                    'a warlord carries the orbs'
                );

                const newOrbs = await player.ask(
                    [
                        'I will find the warlord and bring back the orbs',
                        'I\'m sorry but i can\'t help'
                    ],
                    true
                );

                if (newOrbs === 0) {
                    await player.say(
                        'i will find the warlord and bring back the orbs'
                    );
                    await npc.say(
                        'you are brave',
                        'but this task will be tough even for you,',
                        'i wish you the best of luck traveller',
                        'once again you are our only hope',
                        'i will safeguard this orb',
                        'and pray for your safe return',
                        'my assistant will guide you out'
                    );
                    player.message('A gnome guides you out of the maze');
                    player.teleport(624, 675, false);
                    player.questStages.treeGnomeVillage = 6;
                    player.inventory.remove(ORB_OF_PROTECTION_ID);
                } else if (newOrbs === 1) {
                    await player.say('i\'m sorry but i can\'t help');
                    await npc.say('i understand, this isn\'t your battle');
                }
            } else {
                await npc.say('do you have the orb?');
                await player.say('no, i\'m afraid not');
                await npc.say(
                    'please, we must have the orb',
                    'if we are to survive'
                );
            }
            break;
        case 6:
            if (player.inventory.has(ORBS_OF_PROTECTION_ID)) {
                await player.say('bolren, i have returned');
                await npc.say('you made it back', 'do you have the orbs?');
                await player.say('i have them here');
                await npc.say(
                    'hooray, you\'re amazing',
                    'i didn\'t think it was possible',
                    'but you\'ve saved us',
                    'once the orbs are replaced we will be safe once more',
                    'come with me and we shall begin the ceremony'
                );
                player.teleport(658, 696, true);
                await player.say('what now?');
                await npc.say(
                    'the spirit tree has looked over us for centuries',
                    'now we must pay our respects'
                );
                player.message('bolren takes the orbs');
                await world.sleepTicks(3);
                player.message('the gnomes begin to chant');
                await world.sleepTicks(3);
                player.message('Su tana, en tania');
                await world.sleepTicks(3);
                player.message('They continue to chant');
                await world.sleepTicks(3);
                player.message('As the king gnome climbs the tree');
                await world.sleepTicks(3);
                player.message(
                    'placing the two Orbs at the peak of the spirit tree'
                );
                await world.sleepTicks(3);
                player.inventory.remove(ORBS_OF_PROTECTION_ID);
                await world.sleepTicks(2);
                await world.sleepTicks(2);
                await world.sleepTicks(2);
                await npc.say(
                    'now at last my people are safe once more',
                    'and can live in peace'
                );
                await player.say('i\'m pleased i could help');
                await npc.say(
                    'you are modest brave traveller',
                    'please for your efforts take this amulet',
                    'it\'s made from the same sacred stone as the orbs of ' +
                        'protection',
                    'it will help keep you safe on your journeys'
                );
                await player.say('thank you king bolren');
                await npc.say(
                    'the tree has many other powers',
                    'some of which i cannot reveal',
                    'however as a friend of the gnome',
                    'people you can now use the tree\'s',
                    'magic to teleport to other trees',
                    'grown from related seeds'
                );
                delete player.cache.looted_orbs_protect;
                player.questStages.treeGnomeVillage = -1;
                handleReward(player);
            } else if (player.cache.hasOwnProperty('looted_orbs_protect')) {
                await player.say('bolren, i have returned');
                await npc.say('you made it back', 'do you have the orbs?');
                await player.say('no, i\'m afraid not');
                await npc.say(
                    'please, we must have the orbs',
                    'if we are to survive'
                );
            } else {
                await player.say('hello bolren');
                await npc.say(
                    'the orbs are gone',
                    'taken north of the battlefield by a khazard warlord',
                    'we\'re all doomed'
                );
            }
            break;
        case -1:
            await player.say('hello again bolren');
            await npc.say('well hello, it\'s good to see you again');
            if (!player.inventory.has(GNOME_EMERALD_AMULET_OF_PROTECTION_ID)) {
                await player.say('i\'ve lost my amulet');
                await npc.say('oh dear', 'here take another');
                player.inventory.add(GNOME_EMERALD_AMULET_OF_PROTECTION_ID, 1);
            } else {
                await player.say('good to see you');
            }
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
