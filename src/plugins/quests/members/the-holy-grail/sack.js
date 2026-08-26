// prodding the sack at 328,446 releases sir percival; convincing him and giving a whistle advances stage 4 -> 5

const NPC = require('../../../../model/npc');
const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    SACK_ID,
    SIR_PERCIVAL_ID,
    MAGIC_WHISTLE_ID
} = require('./ids.js');

// 64 seconds ~= 100 ticks
const PERCIVAL_SPAWN = { x: 328, y: 446 };
const PERCIVAL_LIFETIME_TICKS = 100;

function spawnPercival(player) {
    const { world } = player;

    const percival = new NPC(world, {
        id: SIR_PERCIVAL_ID,
        x: PERCIVAL_SPAWN.x,
        y: PERCIVAL_SPAWN.y,
        minX: PERCIVAL_SPAWN.x - 1,
        maxX: PERCIVAL_SPAWN.x + 1,
        minY: PERCIVAL_SPAWN.y - 1,
        maxY: PERCIVAL_SPAWN.y + 1
    });

    delete percival.respawn;

    world.setTickTimeout(() => {
        if (world.npcs.getByID(SIR_PERCIVAL_ID) === percival) {
            world.removeEntity('npcs', percival);
        }
    }, PERCIVAL_LIFETIME_TICKS);

    world.addEntity('npcs', percival);

    return percival;
}

// the branch where the player convinces percival to leave
async function beHisHeir(player, percival) {
    await player.say('He is dying and wishes you to be his heir');
    await percival.say(
        'I have been told that before',
        'I have not been able to find that castle again though'
    );
    await player.say(
        'Well I do have the means to get us there - a magic whistle'
    );

    if (player.inventory.has(MAGIC_WHISTLE_ID)) {
        player.message('You give a whistle to Sir Percival');
        await player.world.sleepTicks(3);
        player.message('You tell sir Percival what to do with the whistle');
        await player.world.sleepTicks(3);
        player.inventory.remove(MAGIC_WHISTLE_ID);
        await percival.say('Ok I will see you there then');
        player.questStages[QUEST_KEY] = 5;
    } else {
        await player.say('I will just go and get you one');
    }
}

async function handleSack(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id !== SACK_ID) {
        return false;
    }

    if ((player.questStages[QUEST_KEY] || 0) !== 4) {
        player.message('nothing interesting happens');
        return true;
    }

    const { world } = player;

    player.message('You hear muffled noises from the sack');
    await world.sleepTicks(3);
    player.message('You open the sack');

    const percival = spawnPercival(player);

    player.engage(percival);
    await percival.say('Wow thankyou', 'I could hardly breathe in there');

    const menu = await player.ask(
        [
            'How did you end up in a sack?',
            'Come with me, I shall make you a king',
            'Your father wishes to speak to you'
        ],
        true
    );

    if (menu === 0) {
        await percival.say(
            "It's a little embarrassing really",
            'After going on a long and challenging quest',
            'to retrieve the boots of arkaneeses',
            'defeating many powerful enemies on the way',
            'I fell into a goblin trap',
            "I've been kept as a slave here for the last 3 months",
            'a day or so ago, they decided it was a fun game',
            'To put me in this sack',
            'Then they forgot about me',
            "I'm now very hungry and my bones feel very stiff"
        );

        const menu2 = await player.ask(
            [
                'Come with me, I shall make you a king',
                'Your father wishes to speak to you'
            ],
            true
        );

        if (menu2 === 0) {
            await percival.say(
                'What are you talking about?',
                'The king of where?'
            );
            await player.say(
                'Your father is apparently someone called the fisher king'
            );
            await beHisHeir(player, percival);
        } else if (menu2 === 1) {
            await percival.say(
                'My father? you have spoken to him recently?'
            );
            await beHisHeir(player, percival);
        }
    } else if (menu === 1) {
        await percival.say('What are you talking about?', 'The king of where?');
        await player.say(
            'Your father is apparently someone called the fisher king'
        );
        await beHisHeir(player, percival);
    } else if (menu === 2) {
        await percival.say('My father? you have spoken to him recently?');
        await beHisHeir(player, percival);
    }

    player.disengage();
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    return await handleSack(player, gameObject);
}

async function onGameObjectCommandTwo(player, gameObject) {
    return await handleSack(player, gameObject);
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
