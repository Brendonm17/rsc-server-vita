// underground pass - king lathas

const { questsEnabled } = require('../../custom-gate.js');
const IDS = require('./ids.js');

const { QUEST_KEY, QUEST_POINTS, XP_BASE, XP_VAR } = IDS;

function handleReward(player) {
    player.addQuestPoints(QUEST_POINTS);
    player.addExperience(
        'agility',
        player.skills.agility.base * XP_VAR + XP_BASE,
        false
    );
    player.addExperience(
        'attack',
        player.skills.attack.base * XP_VAR + XP_BASE,
        false
    );
    player.message('you have completed the underground pass quest');
    player.cache['Iban blast_casts'] = 25;
    delete player.cache.advised_koftik;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== IDS.KING_LATHAS) {
        return false;
    }

    if (player.questStages.biohazard !== -1) {
        return false;
    }

    const stage =
        typeof player.questStages[QUEST_KEY] === 'number'
            ? player.questStages[QUEST_KEY]
            : 0;

    player.engage(npc);

    switch (stage) {
        case 0:
        case 1:
        case 2:
            await player.say('hello king lathas');
            await npc.say('adventurer, thank saradomin for your arrival');
            await player.say('have your scouts found a way though the mountains');
            await npc.say(
                "Not quite, we found a path to where we expected..",
                "..to find the 'well of voyage' an ancient portal to west runescape",
                "however over the past era's a cluster of cultists",
                'have settled there, run by a madman named iban'
            );
            await player.say('iban?');
            await npc.say(
                'a crazy loon who claims to be the son of zamorok',
                'go meet my main tracker koftik, he will help you',
                'he waits for you at the west side of west ardounge',
                'we must find a way through these caverns..',
                'if we are to stop my brother tyras'
            );
            await player.say("i'll do my best lathas");
            await npc.say(
                'a warning traveller the ungerground pass..',
                'is lethal, we lost many men exploring those caverns',
                "go preparred with food and armour or you won't last long"
            );
            if (player.questStages[QUEST_KEY] === 0 || !player.questStages[QUEST_KEY]) {
                player.questStages[QUEST_KEY] = 1;
            }
            break;
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
            await player.say('hello king lanthas');
            await npc.say('traveller, how are you managing down there?');
            await player.say("it's a pretty nasty place but i'm ok");
            await npc.say('well keep up the good work');
            break;
        case 8:
            await npc.say('the traveller returns..any news?');
            await player.say(
                'indeed, the quest is complete lathas',
                'i have defeated iban and his undead minions'
            );
            await npc.say(
                'incrediable, you are a truly awesome warrior',
                'now we can begin to restore the well of voyage',
                'once our mages have re-summoned the well',
                'i will send a band of troops led by yourself',
                'to head into west runescape and stop tryas'
            );
            await player.say('i will be ready and waiting');
            await npc.say('your loyalty is appreiciated traveller');
            player.questStages[QUEST_KEY] = -1;
            handleReward(player);
            break;
        case -1:
            await player.say('hello king lathas');
            await npc.say(
                'well hello there traveller',
                'the mages are still ressurecting the well of voyage',
                "but i'll have word sent to you as soon as its ready"
            );
            await player.say('ok then, take care');
            await npc.say('you too');
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC, handleReward };
