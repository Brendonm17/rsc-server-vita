
const { hasStage, getStage, setStage } = require('./stage');

const FATIGUE_EXPERT_ID = 774;
const SLEEPING_BAG_ID = 1263;

function wantFatigue(player) {
    const { fatigue } = player.world.server.config;
    return fatigue !== false;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== FATIGUE_EXPERT_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    const stage = getStage(player);
    const fatigueOn = wantFatigue(player);

    player.engage(npc);

    if (stage <= 85) {
        if (fatigueOn) {
            await player.say("Hi I'm feeling a little tired after all this learning");
            await npc.say(
                'Yes when you use your skills you will slowly get fatigued',
                'If you look on your stats menu you will see a fatigue stat',
                'When your fatigue reaches 100 percent then you will be ' +
                    'very tired',
                "You won't be able to concentrate enough to gain " +
                    'experience in your skills',
                'To reduce your fatigue you will need to go to sleep',
                'Click on the bed to go sleep',
                'Then follow the instructions to wake up',
                'When you have done that talk to me again'
            );
        } else {
            player.message('You look at the Fatigue expert but he says nothing');
            await player.world.sleepTicks(3);
            await player.say('Hi');
            await npc.say('Hi');
            await player.say('...so what is fatigue?');
            await npc.say("I don't know");
            await player.say("But aren't you the fatigue expert?");
            await npc.say('I guess I am');
            await player.say('Then tell me about it!');
            await npc.say(
                "I don't know what that is!",
                'Oh I know',
                "I'll tell you about sleeping instead",
                'If for some reason you ever find yourself not wanting to ' +
                    'gain experience...',
                '...you can simply sleep in a bed to stop all experience gain',
                'You can check your skills menu to see if your experience ' +
                    'gain is currently on or off',
                'Try toggling your experience gain off by sleeping in this bed'
            );
        }

        setStage(player, 85);
    } else if (stage === 86) {
        if (fatigueOn) {
            await npc.say('How are you feeling now?');
            await player.say('I feel much better rested now');
            await npc.say(
                "Tell you what, I'll give you this useful sleeping bag",
                'So you can rest anywhere'
            );
            player.inventory.add(SLEEPING_BAG_ID, 1);
            player.message('The expert hands you a sleeping bag');
            await npc.say(
                'This saves you the trouble of finding a bed',
                'but you will need to sleep longer to restore your ' +
                    'fatigue fully',
                'You can now go through the next door"'
            );
        } else {
            await npc.say(
                'What did I tell you?',
                'Do you notice that your experience gain is now showing ' +
                    'as disabled in the skill menu?',
                'Pretty nifty, right?',
                "Tell you what, I'll give you this useful sleeping bag",
                'So you can rest anywhere'
            );
            player.inventory.add(SLEEPING_BAG_ID, 1);
            player.message('The expert hands you a sleeping bag');
            await player.world.sleepTicks(3);
            await npc.say(
                'This saves you the trouble of finding a bed',
                'You can now go through the next door"',
                'But remember!',
                'Your experience gain is probably still off',
                'You might want to sleep again to turn it back on!'
            );
        }

        setStage(player, 90);
    } else {
        if (fatigueOn) {
            await npc.say(
                'When you use your skills you will slowly get fatigued',
                'If you look on your stats menu you will see a fatigue stat',
                'When your fatigue reaches 100 percent then you will be ' +
                    'very tired',
                "You won't be able to concentrate enough to gain " +
                    'experience in your skills',
                'To reduce your fatigue you can either eat some food or go ' +
                    'to sleep',
                'Click on a bed  or sleeping bag to go sleep',
                'Then follow the instructions to wake up',
                'You can now go through the next door"'
            );
        } else {
            await npc.say(
                'If for some reason you ever find yourself not wanting to ' +
                    'gain experience...',
                '...you can simply sleep in a bed or sleeping bag to stop ' +
                    'all experience gain',
                'When you want to turn your experience gain back on, just ' +
                    'sleep again',
                'You can check your skills menu to see if your experience ' +
                    'gain is currently on or off',
                'You can now go through the next door"'
            );
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
