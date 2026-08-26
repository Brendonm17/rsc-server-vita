
const { hasStage, getStage, setStage } = require('./stage');

const BANK_ASSISTANT_ID = 485;

function bankersCertainly(player) {
    return player.isMale() ? 'Certainly Sir' : 'Certainly Miss';
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== BANK_ASSISTANT_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Hello welcome to the bank of runescape',
        'You can deposit your items in banks',
        'This allows you to own much more equipment',
        'Than can be fitted in your inventory',
        'It will also keep your items safe',
        "So you won't lose them when you die",
        'You can withdraw deposited items from any bank in the world'
    );

    if (getStage(player) === 55) {
        await player.say('Can I access my bank account please?');
        await npc.say(bankersCertainly(player));
        player.bank.open();
        setStage(player, 60);
    } else {
        await npc.say('Now proceed through the next door');

        const menu = await player.ask(
            [
                'Can I access my bank account please?',
                'Okay thankyou for your help'
            ],
            true
        );

        if (menu === 0) {
            await npc.say(bankersCertainly(player));
            player.bank.open();
        } else if (menu === 1) {
            await npc.say('Not a problem');
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
