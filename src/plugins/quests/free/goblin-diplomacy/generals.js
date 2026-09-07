// https://classic.runescape.wiki/w/Transcript:General_Bentnoze

const ARMOUR_ID = 273;
const BENTNOZE_ID = 152;
const BLUE_ARMOUR_ID = 275;
const GOLD_BAR_ID = 172;
const GOBLIN_GREEN_ARMOUR_ID = 154;
const GOBLIN_RED_ARMOUR_ID = 153;
const ORANGE_ARMOUR_ID = 274;
const WARTFACE_ID = 151;

// combat odyssey intro stages: not started = 0, met biggum = 2
const { co, biggumMissing, giveRewards, biggumSay } = require('../../../npcs/combat-odyssey-shared');
const CO_NOT_STARTED = 0;
const CO_MET_BIGGUM = 2;

function switchGoblins(player, a, b) {
    if (a.locked) {
        a.locked = false;
        b.locked = true;
        b.faceEntity(player);
        player.faceEntity(b);
    } else {
        b.locked = false;
        a.locked = true;
        a.faceEntity(player);
        player.faceEntity(a);
    }
}

// clicked is the general the player talked to
async function talkToGenerals(player, clicked) {
    const { world } = player;
    const questStage = player.questStages.goblinDiplomacy;

    const wartface = world.npcs.getByID(WARTFACE_ID);
    const bentnoze = world.npcs.getByID(BENTNOZE_ID);

    const wartfacePrimary = !clicked || clicked.id === WARTFACE_ID;
    const primary = wartfacePrimary ? wartface : bentnoze;
    const secondary = wartfacePrimary ? bentnoze : wartface;

    // locks the other general to this player but lets him keep roaming
    secondary.interlocutor = player;
    player.engage(primary);

    // in case the user breaks out of an .ask
    const unbusyGenerals = () => {
        if (!player.interlocutor) {
            wartface.interlocutor = null;
            bentnoze.interlocutor = null;
        } else {
            world.setTickTimeout(unbusyGenerals, 2);
        }
    };

    unbusyGenerals();

    if (questStage === 0 || questStage === 1) {
        if (wartfacePrimary) {
            await primary.say('green armour best');
            switchGoblins(player, primary, secondary);
            await secondary.say('No no Red every time');
            switchGoblins(player, primary, secondary);
            await primary.say('go away human, we busy');
        } else {
            await primary.say('Red armour best');
            switchGoblins(player, primary, secondary);
            await secondary.say('No no green every time');
            switchGoblins(player, primary, secondary);
            await primary.say('go away human, we busy');
        }
    }

    if (questStage === 1) {
        // false: the choice is not echoed back
        const choice = await player.ask(
            [
                'Why are you arguing about the colour of your armour?',
                "Wouldn't you prefer peace?",
                'Do you want me to pick an armour colour for you?'
            ],
            false
        );

        switch (choice) {
            case 0: // why argue
                await player.say(
                    'Why are you arguing about the colour of your armour?'
                );

                await primary.say(
                    'We decide to celebrate goblin new century',
                    'By changing the colour of our armour',
                    'Light blue get boring after a bit',
                    'And we want change',
                    'Problem is they want different change to us'
                );
                break;
            case 1: // prefer peace
                await player.say("Wouldn't you prefer peace");

                await primary.say(
                    'Yeah peace is good as long as it is peace wearing Green ' +
                        'armour'
                );

                switchGoblins(player, primary, secondary);

                await secondary.say(
                    'But green to much like skin!',
                    'Nearly make you look naked!'
                );
                break;
            case 2: // pick a colour
                await player.say(
                    'Do you want me to pick an armour colour for you?',
                    'different to either green or red'
                );

                await primary.say(
                    "Hmm me dunno what that'd look like",
                    "You'd have to bring me some, so us could decide"
                );

                switchGoblins(player, primary, secondary);
                await secondary.say('Yep bring us orange armour');
                switchGoblins(player, primary, secondary);
                await primary.say('Yep orange might be good');

                player.questStages.goblinDiplomacy = 2;
                break;
        }
    } else if (questStage === 2) {
        await primary.say('Oh it you');

        if (player.inventory.has(ORANGE_ARMOUR_ID)) {
            await player.say('I have some orange armour');

            player.inventory.remove(ORANGE_ARMOUR_ID);
            player.message('@que@You give some goblin armour to the goblins');
            await world.sleepTicks(3);

            await primary.say("No I don't like that much");
            switchGoblins(player, primary, secondary);
            await secondary.say('It clashes with my skin colour');
            switchGoblins(player, primary, secondary);
            await primary.say('Try bringing us dark blue armour');

            player.questStages.goblinDiplomacy = 3;
        } else {
            await primary.say('Have you got some orange goblin armour yet?');
            await player.say('Err no');
            await primary.say('Come back when you have some');
        }
    } else if (questStage === 3) {
        await primary.say('Oh it you');

        if (player.inventory.has(BLUE_ARMOUR_ID)) {
            await player.say('I have some dark blue armour');

            player.inventory.remove(BLUE_ARMOUR_ID);
            player.message('@que@You give some goblin armour to the goblins');
            await world.sleepTicks(3);

            await primary.say("Doesn't seem quite right");
            switchGoblins(player, primary, secondary);
            await secondary.say('maybe if it was a bit lighter');
            switchGoblins(player, primary, secondary);
            await primary.say('Yeah try light blue');

            await player.say(
                'I thought that was the amour you were changing from',
                'But never mind, anything is worth a try'
            );

            player.questStages.goblinDiplomacy = 4;
        } else {
            await primary.say(
                'Have you got some Dark Blue goblin armour yet?'
            );

            await player.say('Err no');
            await primary.say('Come back when you have some');
        }
    } else if (questStage === 4) {
        if (player.inventory.has(ARMOUR_ID)) {
            await player.say("Ok I've got light blue armour");

            player.inventory.remove(ARMOUR_ID);
            player.message('@que@You give some goblin armour to the goblins');
            await world.sleepTicks(3);

            await primary.say('That is rather nice');

            switchGoblins(player, primary, secondary);

            await secondary.say(
                "Yes I could see myself wearing somethin' like that"
            );

            switchGoblins(player, primary, secondary);

            await primary.say(
                "It' a deal then",
                'Light blue it is',
                'Thank you for sorting our argument'
            );

            player.message(
                'Well done you have completed the goblin diplomacy quest'
            );

            player.questStages.goblinDiplomacy = -1;
            player.addQuestPoints(5);
            player.message('@gre@You haved gained 5 quest points!');

            player.addExperience(
                'crafting',
                player.skills.crafting.base * 60 + 500,
                false
            );

            player.inventory.add(GOLD_BAR_ID);
            player.message(
                'general wartface gives you a gold bar as thanks'
            );
        } else {
            await primary.say(
                'Have you got some Light Blue goblin armour yet?'
            );

            await player.say('Err no');
            await primary.say('Come back when you have some');
        }
    } else if (questStage === -1) {
        // combat odyssey hand-offs: tier 0 after meeting biggum, tier 1 after tier 0
        let speaker = primary;
        const goblinSay = async (who, ...lines) => {
            if (who !== speaker) {
                switchGoblins(player, primary, secondary);
                speaker = who;
            }
            await who.say(...lines);
        };
        const introStage = co.getIntroStage(player);
        let handled = false;

        if (introStage === CO_MET_BIGGUM) {
            handled = true;
            if (!(await biggumMissing(player))) {
                const newTier = 0;
                await biggumSay(
                    player,
                    'Generals of lowland village!',
                    'Big dumb human is on big long killing spree for Radimus',
                    'What kills to do?'
                );
                await goblinSay(primary, 'Ha! Dis gon be gud');
                await goblinSay(secondary, 'Shut up warty and give tasks');
                await goblinSay(primary, 'You shut up and give tasks!');
                await goblinSay(
                    secondary,
                    'Flodrot pay attention cause humans not too bright'
                );
                await biggumSay(player, 'Yes yes, give things to kill');
                await goblinSay(
                    primary,
                    ...co.getTasksAndCounts(co.getTier(newTier))
                );
                await goblinSay(
                    secondary,
                    'Human can ask Flodrot what to kill first'
                );
                await goblinSay(primary, 'Come back to us when done with these');
                co.assignNewTier(player, newTier);
            }
        } else if (co.getCurrentTier(player) === 0) {
            handled = true;
            if (co.isTierCompleted(player)) {
                if (!(await biggumMissing(player))) {
                    const newTier = 1;
                    // assign the next tier first so its rewards apply
                    co.assignNewTier(player, newTier);
                    await goblinSay(secondary, 'Well done human');
                    await goblinSay(
                        primary,
                        'Here is little help for final task we give'
                    );
                    await giveRewards(player, primary);
                    await goblinSay(secondary, 'Last thing to kill is');
                    await goblinSay(
                        secondary,
                        ...co.getTasksAndCounts(co.getTier(newTier))
                    );
                    await goblinSay(
                        primary,
                        'Go talk with Thormac the sorcerer when done'
                    );
                }
            } else {
                await goblinSay(primary, 'Talk to Flodrot, he know what to kill');
            }
        }

        if (!handled) {
            if (
                co.getCurrentTier(player) > 0 ||
                (introStage === CO_NOT_STARTED && co.getPrestige(player) > 0)
            ) {
                await goblinSay(
                    primary,
                    "Now you've solved our argument and killed thousands we " +
                        'gotta think of something else to do'
                );
            } else {
                await goblinSay(
                    primary,
                    "Now you've solved our argument we gotta think of " +
                        'something else to do'
                );
            }

            await goblinSay(secondary, 'Yep, we bored now');
        }
    }

    player.disengage();

    wartface.locked = false;
    wartface.interlocutor = null;

    bentnoze.locked = false;
    bentnoze.interlocutor = null;

    return true;
}

// goblin foot soldiers have their own chat, any quest stage
async function talkToSimpleGoblin(player, npc) {
    player.engage(npc);

    if (npc.id === GOBLIN_RED_ARMOUR_ID) {
        await npc.say('Red Armour best');

        const choice = await player.ask(['Err Ok', 'Why is red best?'], true);

        if (choice === 1) {
            await npc.say(
                'Cos General Bentnoze says so',
                'And he bigger than me'
            );
        }
    } else {
        await npc.say('green Armour best');

        const choice = await player.ask(
            ['Err Ok', 'Why is green best?'],
            true
        );

        if (choice === 1) {
            await npc.say(
                'I forgot now',
                'but General Wartface says it is',
                'So it must be'
            );
        }
    }

    player.disengage();

    return true;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === GOBLIN_RED_ARMOUR_ID || npc.id === GOBLIN_GREEN_ARMOUR_ID) {
        return talkToSimpleGoblin(player, npc);
    }

    if (
        (npc.id !== BENTNOZE_ID && npc.id !== WARTFACE_ID) ||
        player.questStages.dragonSlayer === 2
    ) {
        return false;
    }

    return await talkToGenerals(player, npc);
}

module.exports = { onTalkToNPC, talkToGenerals };
