// watchtower - gorad, hostile ogre whose tooth grew wants

const { questsEnabled } = require('../../custom-gate.js');

const {
    QUEST_KEY,
    GORAD_ID,
    OGRE_TOOTH_ID
} = require('./ids.js');

function stage(player) {
    return player.questStages[QUEST_KEY] || 0;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GORAD_ID) {
        return false;
    }

    player.engage(npc);

    if (player.cache.ogre_grew) {
        await player.say("I've come to knock your teeth out!");
        await npc.say(
            'How dare you utter that foul language in my prescence!',
            'You shall die quickly vermin'
        );
        player.disengage();
        await npc.attack(player);
        return true;
    } else if (player.cache.ogre_grew_p1 || stage(player) > 0) {
        await player.say('Hello');
        await npc.say('Do you know who you are talking to ?');
        const menu = await player.ask(
            ['A big ugly brown creature...', "I don't know who you are"],
            true
        );
        if (menu === 0) {
            await npc.say('The impudence! take that...');
            player.damage(16);
            await player.say('Ouch!');
            player.message('The ogre punched you hard in the face!');
        } else if (menu === 1) {
            await npc.say(
                "I am Gorad - who you are dosen't matter",
                'Go now and you may live another day!'
            );
        }
    } else {
        player.message('Gorad is busy, try again later');
    }

    player.disengage();
    return true;
}

async function onNPCAttack(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GORAD_ID) {
        return false;
    }

    // gorad only fights after the tooth dialogue
    player.engage(npc);
    await npc.say('Ho Ho! why would I want to fight a worm ?', 'Get lost!');
    player.disengage();
    return true;
}

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== GORAD_ID) {
        return false;
    }

    player.message('Gorad has gone');
    player.message("He's dropped a tooth, I'll keep that!");
    player.inventory.add(OGRE_TOOTH_ID, 1);

    // do not block default death handling
    return false;
}

module.exports = { onTalkToNPC, onNPCAttack, onNPCDeath };
