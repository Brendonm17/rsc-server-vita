// merlin's crystal: sir mordred / morgan le faye. sparing him advances the quest; killing him ends it

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    SIR_MORDRED_ID,
    MORGAN_LE_FAYE_ID,
    MORGAN_SPAWN
} = require('./ids.js');

// heal mordred to full and cancel his death
function reviveMordred(npc) {
    npc.skills.hits.current = npc.skills.hits.base;
}

function findOrSpawnMorgan(player) {
    const { world } = player;

    let morgan = world.npcs
        .getInArea(player.x, player.y, 8)
        .find((n) => n.id === MORGAN_LE_FAYE_ID);

    if (!morgan) {
        morgan = new NPC(world, {
            id: MORGAN_LE_FAYE_ID,
            x: MORGAN_SPAWN.x,
            y: MORGAN_SPAWN.y,
            minX: MORGAN_SPAWN.x - 1,
            maxX: MORGAN_SPAWN.x + 1,
            minY: MORGAN_SPAWN.y - 1,
            maxY: MORGAN_SPAWN.y + 1
        });

        delete morgan.respawn;

        // OpenRSC spawns her for ~63 seconds (105 ticks)
        world.setTickTimeout(() => {
            world.removeEntity('npcs', morgan);
        }, 105);

        world.addEntity('npcs', morgan);
    }

    return morgan;
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== SIR_MORDRED_ID) {
        return false;
    }

    const stage = player.questStages[QUEST_KEY];

    // only interferes once the quest has begun (stage > 0)
    if (!(stage > 0)) {
        return false;
    }

    // reset combat and full-heal before the parley
    reviveMordred(npc);

    const morgan = findOrSpawnMorgan(player);

    player.engage(morgan);
    await morgan.say('Please spare my son');

    const option = await player.ask(
        [
            'Tell me how to untrap Merlin and I might',
            'No he deserves to die',
            'OK then'
        ],
        true
    );

    if (option === 0) {
        if (player.questStages[QUEST_KEY] === 2) {
            player.questStages[QUEST_KEY] = 3;
        }

        await morgan.say(
            'You have guessed correctly that I\'m responsible for that'
        );
        await morgan.say(
            'I suppose I can live with that fool Merlin being loose'
        );
        await morgan.say('for the sake of my son');
        await morgan.say('Setting him free won\'t be easy though');
        await morgan.say(
            'You will need to find a pentagram as close to the crystal as ' +
                'you can find'
        );
        await morgan.say(
            'You will need to drop some bats bones in the pentagram'
        );
        await morgan.say('while holding a black candle');
        await morgan.say('This will summon the demon Thrantax');
        await morgan.say('You will need to bind him with magic words');
        await morgan.say(
            'Then you will need the sword Excalibur with which the spell ' +
                'was bound'
        );
        await morgan.say('Shatter the crystal with Excalibur');

        const subOpt = await player.ask(
            [
                'So where can I find Excalibur?',
                'OK I will do all that',
                'What are the magic words?'
            ],
            true
        );

        if (subOpt === 0) {
            await morgan.say('The lady of the lake has it');
            await morgan.say('I don\'t know if she will give it you though');
            await morgan.say('She can be rather temperamental');

            const subOpt2 = await player.ask(
                ['OK I will go do all that', 'What are the magic words?'],
                false
            );

            if (subOpt2 === 0) {
                await player.say('OK I will do all that');
                player.message('Morgan Le Faye vanishes');
            } else if (subOpt2 === 1) {
                await player.say('What are the magic words?');
                await morgan.say(
                    'You will find the magic words at the base of one of ' +
                        'the chaos altars'
                );
                await morgan.say('Which chaos altar I cannot remember');
            }
        } else if (subOpt === 1) {
            player.message('Morgan Le Faye vanishes');
        } else if (subOpt === 2) {
            await morgan.say(
                'You will find the magic words at the base of one of the ' +
                    'chaos altars'
            );
            await morgan.say('Which chaos altar I cannot remember');
        }

        player.disengage();
        return true; // Mordred spared (npc.killed = false)
    } else if (option === 1) {
        player.message('You kill Mordred');
        player.disengage();
        return false; // Mordred actually dies (npc.remove())
    } else if (option === 2) {
        player.message('Morgan Le Faye vanishes');
        player.disengage();
        return true; // npc.killed = false
    }

    player.disengage();
    return true; // option === -1: npc.killed = false
}

module.exports = { onNPCDeath };
