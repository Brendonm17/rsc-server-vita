// underground pass - paladins & slaves

const { questsEnabled } = require('../../custom-gate.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

// paladin
async function giveFood(player, npc) {
    player.message('the paladin gives you some food');
    player.inventory.add(IDS.MEAT_PIE, 2);
    player.inventory.add(IDS.STEW, 1);
    player.inventory.add(IDS.BREAD, 2);
    player.inventory.add(IDS.TWO_ATTACK_POTION, 1);
    player.inventory.add(IDS.TWO_RESTORE_PRAYER_POTION, 1);
    player.cache.paladin_food = true;
}

async function paladinTalk(player, npc) {
    const stage = getStage(player);
    if (stage === 4) {
        await player.say('hello paladin');
        const rand = Math.floor(Math.random() * 2);
        if (rand === 0) {
            if (!player.cache.paladin_food) {
                await npc.say(
                    "you've done well to get this far traveller, here eat"
                );
                await giveFood(player, npc);
                await player.say('thanks');
            }
            await npc.say(
                'you should leave this place now traveller',
                'i heard the crashing of rocks further down the cavern',
                'iban must be restless',
                'i have no doubt that zamorak still controls these caverns',
                'a little further on lies the great door of iban',
                'we\'ve tried everything, but it will not let us enter',
                "leave now before iban awakes and it's too late"
            );
        } else {
            await npc.say(
                'traveller, what are you doing in this most unholy place?'
            );
            await player.say(
                'i\'m looking for safe route through the caverns',
                'under order of king lathas'
            );
            if (!player.cache.paladin_food) {
                await npc.say("you've done well to come this far, here eat");
                await giveFood(player, npc);
            }
            await npc.say(
                'There\'s no doubt Iban still controls these caverns..',
                "we've also been looking for a passage through..",
                'a little further on lies the great door of iban..',
                "we've tried everything, but it will not let us enter..",
                "leave now before iban awakes and it's too late"
            );
        }
    } else if (
        stage === 5 ||
        stage === 6 ||
        stage === 7 ||
        stage === 8 ||
        stage === -1
    ) {
        await player.say('hello');
        await npc.say('you again, die zamorakian scum');
        player.disengage();
        await npc.attack(player);
        return true;
    }
    return false;
}

// slaves (souless)
const SLAVE_IDS = [
    IDS.SLAVE_1,
    IDS.SLAVE_2,
    IDS.SLAVE_3,
    IDS.SLAVE_4,
    IDS.SLAVE_5,
    IDS.SLAVE_6,
    IDS.SLAVE_7
];

async function slaveTalk(player, npc) {
    player.message('the man seems to be in a weak state of mind');
    switch (npc.id) {
        case IDS.SLAVE_1:
            await player.say('hello');
            await npc.say(
                'Eating me...they keep eating me!',
                'Eating me from the inside. Please stop  them eating me',
                '... I can feel them wriggling around inside me right now',
                '... please  stop them!'
            );
            player.disengage();
            await npc.attack(player);
            break;
        case IDS.SLAVE_2:
            await player.say('hi');
            await npc.say(
                'Blood, blood... never enough blood to go round',
                'When I lift up my arm like this,it all pours back into my body',
                'I hope it remembers to go back inside my arm',
                "And don't even ask me about my legs..",
                'how much blood are they going to need?',
                'Blood is important',
                'We must offer it to Zamorak every day as proof of our devotion',
                "I just hope I don't run out."
            );
            player.message('the prisoner has clearly been here too long');
            break;
        case IDS.SLAVE_3:
            await player.say('hello, are you ok?');
            await npc.say(
                "Oh yes, you're a fine one. Nice red cheeks, shiny hair",
                "Let's see now, some potatoes, some cabbage,",
                'maybe half a clove of garlic',
                '...yes  I think you\'d  make a fine soup',
                "You don't mind do you?"
            );
            await player.say('actually i do');
            await npc.say("You're welcome to have some with me of course.");
            player.disengage();
            await npc.attack(player);
            break;
        case IDS.SLAVE_4:
            await player.say('hi');
            await npc.say('Mwaarrr fnnntchh. Gbpp dng sktd delp?');
            await player.say('pardon?');
            await npc.say('Kjp lar falut: Gbpp dng sktd delp?');
            await player.say('sorry, i dont under..');
            await npc.say(
                'Mwaarrr fnnntchh. Gbpp dng sktd delp?',
                'GBPP DNG SKTD DELP! GBPP DNG SKTD DELP!'
            );
            player.disengage();
            await npc.attack(player);
            break;
        case IDS.SLAVE_5:
            await player.say('hi');
            await npc.say(
                'Kill the villagers, burn them all- every last one',
                'I want nothing to survive: nothing but the sweet smell of burning flesh'
            );
            await player.say("you're ill");
            await npc.say(
                "What's that - you've never smelt it before",
                "Well, let's just say that it's an acquired taste"
            );
            player.disengage();
            await npc.attack(player);
            break;
        case IDS.SLAVE_6:
            await player.say('hello');
            await npc.say(
                'Danger, everywhere danger! But not from man nor beast-',
                'no this is the danger that is inside you.',
                'Bring it out, nurture it, cherish it',
                'Stroke it like you would stroke a wounded bird-',
                'then strangle it before it takes hold of your very being',
                "Don't say I didn't warn you"
            );
            break;
        case IDS.SLAVE_7:
            await player.say('hello');
            await npc.say(
                "What's that...is that a dagger I see before me?",
                'Why should I bear the slings and arrows of outrageous fortune',
                'for what is a man but this quintessence of dust?',
                'And so I say goodnight sweet prince. The rest is silence.'
            );
            break;
        default:
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id === IDS.PALADIN_UNDERGROUND_BEARD) {
        player.engage(npc);
        const combatStarted = await paladinTalk(player, npc);
        if (!combatStarted) {
            player.disengage();
        }
        return true;
    }

    if (SLAVE_IDS.includes(npc.id)) {
        player.engage(npc);
        await slaveTalk(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// paladin kills -> coats of arms
async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (npc.id === IDS.PALADIN_UNDERGROUND_BEARD) {
        player.message('@que@the paladin slumps to the floor');
        await world.sleepTicks(3);
        player.message('@que@you search his body');
        await world.sleepTicks(3);
        if (!player.inventory.has(IDS.COAT_OF_ARMS_RED)) {
            player.inventory.add(IDS.COAT_OF_ARMS_RED, 1);
            player.message('and find a paladin coat of arms');
        } else {
            player.message('but find nothing');
        }
        return false;
    }

    if (npc.id === IDS.PALADIN_UNDERGROUND) {
        player.message('@que@the paladin slumps to the floor');
        await world.sleepTicks(3);
        player.message('@que@you search his body');
        await world.sleepTicks(3);
        if (!player.inventory.has(IDS.COAT_OF_ARMS_BLUE, 2)) {
            player.inventory.add(IDS.COAT_OF_ARMS_BLUE, 1);
            player.message('and find a paladin coat of arms');
        } else {
            player.message('but find nothing');
        }
        return false;
    }

    return false;
}

module.exports = { onTalkToNPC, onNPCDeath };
