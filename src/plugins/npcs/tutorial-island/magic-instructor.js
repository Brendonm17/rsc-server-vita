
const { hasStage, getStage, setStage, setStageIfLess } = require('./stage');

const MAGIC_INSTRUCTOR_ID = 494;
const CHICKEN_ID = 3;

const AIR_RUNE_ID = 33;
const MIND_RUNE_ID = 35;
const WATER_RUNE_ID = 32;
const EARTH_RUNE_ID = 34;
const BODY_RUNE_ID = 36;

async function optionDialogue(player, npc) {
    await npc.say(
        'Ok move your mouse over the book icon on the menu bar',
        'this is your magic menu',
        'You will see at level 1 magic you can only cast wind strike',
        'move your mouse over the wind strike text',
        'If you look at the bottom of the magic window',
        'You will see more information about the spell',
        'runes required for the spell have two numbers over them',
        'The first number is how many runes you have',
        'The second is how many runes the spell requires',
        'Speak to me again when you have checked this'
    );
    setStage(player, 75);
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== MAGIC_INSTRUCTOR_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    const stage = getStage(player);
    const { world } = player;

    player.engage(npc);

    if (stage === 70) {
        await npc.say(
            "there's good magic potential in this one",
            'Yes definitely something I can work with'
        );

        const menu = await player.ask(
            ['Hmm are you talking about me?', 'teach me some magic'],
            true
        );

        if (menu === 0) {
            await npc.say('Yes that is the one of which I speak');
            await optionDialogue(player, npc);
        } else if (menu === 1) {
            await npc.say('Teacher, yes I am one of them');
            await optionDialogue(player, npc);
        }
    } else if (stage === 75) {
        await player.say("I don't have the runes to cast wind strike");
        await npc.say(
            'How do you expect to do magic without runes?',
            'Ok I shall have to provide you with runes'
        );
        player.message('The instructor gives you some runes');
        player.inventory.add(AIR_RUNE_ID, 12);
        player.inventory.add(MIND_RUNE_ID, 8);
        player.inventory.add(WATER_RUNE_ID, 3);
        player.inventory.add(EARTH_RUNE_ID, 2);
        player.inventory.add(BODY_RUNE_ID, 1);
        await npc.say(
            'Ok look at your spell list now',
            'You will see you have the runes for the spell',
            'And it shows up yellow in your list'
        );
        setStage(player, 76);
    } else if (stage === 76 || stage === 77) {
        let chicken = world.npcs
            .getInArea(player.x, player.y, 10)
            .find((n) => n.id === CHICKEN_ID);

        if (!chicken) {
            // invokes a chicken if none is around
            await npc.say('I think we need a chicken');
            player.message('The wizard waves his arms around and chants');

            const NPC = require('../../../model/npc');
            chicken = new NPC(world, {
                id: CHICKEN_ID,
                x: 218,
                y: 755,
                minX: 213,
                maxX: 223,
                minY: 750,
                maxY: 760
            });
            world.addEntity('npcs', chicken);
        } else if (stage === 76) {
            await chicken.say('cluck');
            await npc.say(
                'Aha a chicken',
                'An Ideal wind strike target',
                'ok click on the wind strike spell in your spell list',
                'then click on the chicken to chose it as a target'
            );
            setStage(player, 77);
        } else {
            await npc.say(
                'To shoot a wind strike at a chicken',
                'select the book icon in the menu bar',
                'then click on the yellow wind strike text',
                'then left click on the chicken to cast the spell'
            );
            await chicken.say('cluck');
            setStage(player, 78);
        }
    } else {
        await npc.say(
            'Well done',
            'As you get a higher magic level',
            'You will be able to cast all sorts of interesting spells',
            'Now go through the next door'
        );
        setStageIfLess(player, 80);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
