// combat instructor (npc 474) and the tutorial rat (npc 473, a level-7 rat).
// gives wooden shield (4) and bronze long sword (70). gates
// tutorial-doors.js's DOOR_CONTINUE_COMBAT_INSTRUCTOR.
//
// hooks:
//   onTalkToNPC - dialogue
//   onNPCAttack - block attacking the rat before stage 16
//   onSpellNPC  - same block for spell casts
//   onNPCDeath  - killing the tutorial rat awards no combat xp; replays the
//                 non-xp post-death handling (drops, removal)

const { hasStage, getStage, setStage, setStageIfLess } = require('./stage');
const { getQOLConfig } = require('../../../model/qol-config');

const COMBAT_INSTRUCTOR_ID = 474;
const RAT_TUTORIAL_ID = 473;
const CHICKEN_ID = 3;

const WOODEN_SHIELD_ID = 4;
const BRONZE_LONG_SWORD_ID = 70;

// rat zone bounds: 226-234, 728-738
function aroundTutorialRatZone(x, y) {
    return x >= 226 && x <= 234 && y >= 728 && y <= 738;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== COMBAT_INSTRUCTOR_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    const { world } = player;
    const stage = getStage(player);

    player.engage(npc);

    if (
        !player.inventory.has(WOODEN_SHIELD_ID) &&
        !player.inventory.has(BRONZE_LONG_SWORD_ID) &&
        stage === 15
    ) {
        await npc.say(
            'Aha a new recruit',
            "I'm here to teach you the basics of fighting",
            'First of all you need weapons'
        );
        player.inventory.add(WOODEN_SHIELD_ID, 1);
        player.inventory.add(BRONZE_LONG_SWORD_ID, 1);
        player.message('@que@The instructor gives you a sword and shield');
        await world.sleepTicks(3);
        await npc.say(
            'look after these well',
            'These items will now have appeared in your inventory',
            'You can access them by selecting the bag icon in the menu bar',
            'which can be found in the top right hand corner of the screen',
            'To wield your weapon and shield left click on them within ' +
                'your inventory'
        );

        if (getQOLConfig(player.world.server.config).wantEquipmentTab) {
            await npc.say(
                'they will then be added to your equipment tab',
                'which you can view by clicking the Equipment button at ' +
                    'the bottom of the inventory'
            );
        } else {
            await npc.say('their box will go red to show you are wearing them');
        }

        player.message('When you have done this speak to the combat instructor again');
        setStage(player, 16);
    } else if (stage === 16) {
        const shieldReady =
            !player.inventory.has(WOODEN_SHIELD_ID) ||
            player.inventory.isEquipped(WOODEN_SHIELD_ID);
        const swordReady =
            !player.inventory.has(BRONZE_LONG_SWORD_ID) ||
            player.inventory.isEquipped(BRONZE_LONG_SWORD_ID);

        if (shieldReady && swordReady) {
            await npc.say("Today we're going to be killing giant rats");

            let rat = world.npcs
                .getInArea(player.x, player.y, 10)
                .find((n) => n.id === RAT_TUTORIAL_ID);

            if (!rat) {
                // release a rat if none is around
                await npc.say("I'll just let out some rats for you");
                player.message('The combat instructor releases a rat');

                const NPC = require('../../../model/npc');
                rat = new NPC(world, {
                    id: RAT_TUTORIAL_ID,
                    x: 231,
                    y: 735,
                    minX: 229,
                    maxX: 231,
                    minY: 733,
                    maxY: 735
                });
                world.addEntity('npcs', rat);
            } else {
                await rat.say('squeek');
                await npc.say(
                    'move your mouse over a rat you will see it is level 7',
                    "You will see that it's level is written in green",
                    'If it is green this means you have a strong chance of ' +
                        'killing it',
                    'creatures with their name in red should probably be ' +
                        'avoided',
                    'As this indicates they are tougher than you',
                    'left click on the rat to attack it'
                );
            }
        } else {
            await npc.say(
                'You need to wield your equipment',
                'You can access it by selecting the bag icon',
                'which can be found in the top right hand corner of the screen',
                'To wield your weapon and shield left click on them'
            );

            if (getQOLConfig(player.world.server.config).wantEquipmentTab) {
                await npc.say(
                    'they will then be added to your equipment tab',
                    'which you can view by clicking the Equipment button ' +
                        'at the bottom of the inventory'
                );
            } else {
                await npc.say('their boxs will go red to show you are wearing them');
            }

            player.message('When you have done this speak to the combat instructor again');
        }
    } else if (stage >= 20) {
        await npc.say(
            "Well done you're a born fighter",
            'As you kill things',
            'Your combat experience will go up',
            'this expereince will slowly cause you to get tougher',
            'eventually you will be able to take on stronger enemies',
            'Such as those found in dungeons',
            'Now contine to the building to the northeast'
        );
        setStageIfLess(player, 25);
    }

    player.disengage();
    return true;
}

async function onNPCAttack(player, npc) {
    const stage = getStage(player);
    const inRatZone = aroundTutorialRatZone(player.x, player.y);

    // allow default attack off-tutorial, on chickens, or on the rat at stage 16
    if (
        !hasStage(player) ||
        !inRatZone ||
        npc.id === CHICKEN_ID ||
        (npc.id === RAT_TUTORIAL_ID && stage === 16)
    ) {
        return false;
    }

    if (stage < 16) {
        player.message('@que@Speak to the combat instructor before killing rats');
    } else {
        player.message("@que@That's enough rat killing for now");
    }

    await player.world.sleepTicks(3);
    return true;
}

// reuse the attack-block logic for spell casts. must be a distinct named
// function so the plugin loader registers it as onSpellNPC
async function onSpellNPC(player, npc) {
    return onNPCAttack(player, npc);
}

async function onNPCDeath(victor, npc) {
    if (npc.id !== RAT_TUTORIAL_ID) {
        return false;
    }

    const { world } = npc;

    // replicate the default post-death drops/removal without combat xp
    const drops = npc.getDrops();

    for (const item of drops) {
        world.addPlayerDrop(victor, item, npc.x, npc.y);
    }

    world.removeEntity('npcs', npc);

    if (
        victor &&
        hasStage(victor) &&
        getStage(victor) === 16
    ) {
        victor.message("@que@Well done you've killed the rat");
        await world.sleepTicks(3);
        victor.message('@que@Now speak to the combat instructor again');
        await world.sleepTicks(3);
        setStage(victor, 20);
    }

    if (victor) {
        victor.retreat();
        victor.sendSound('victory');
        npc.opponent = null;
        victor.opponent = null;
    }

    return true;
}

module.exports = { onTalkToNPC, onNPCAttack, onSpellNPC, onNPCDeath };
