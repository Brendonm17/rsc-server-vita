// SpiritOfScorpius: onUseNpc (crown-of-the-occult recharge), onTalkNpc for SPIRIT_OF_SCORPIUS (665) and
// GHOST_SCORPIUS (664), onOpLoc for the Grave of Scorpius (941, "Read").
// unholy symbol chain: mould 1026 -> unblessed 1028 -> 1029; observatoryQuest-gated; want_unholy_symbol_drops toggle stored but unused.

const enchantedCrowns = require('../../skills/enchanted-crowns');
const { customQuestsEnabled } = require('../../quests/custom-gate.js');

const SPIRIT_OF_SCORPIUS_ID = 665;
const GHOST_SCORPIUS_ID = 664;
const GRAVE_OF_SCORPIUS_ID = 941;

const UNHOLY_SYMBOL_MOULD_ID = 1026;
const UNBLESSED_UNHOLY_SYMBOL_OF_ZAMORAK_ID = 1028;
const UNHOLY_SYMBOL_OF_ZAMORAK_ID = 1029;

async function onUseWithNPC(player, npc, item) {
    if (npc.id !== SPIRIT_OF_SCORPIUS_ID) {
        return false;
    }

    const occultCrownId = enchantedCrowns.resolveCrownIds().occult;

    if (typeof occultCrownId !== 'number' || item.id !== occultCrownId) {
        return false;
    }

    // hasKey(), not truthiness
    if (typeof player.cache.occultcrown !== 'number') {
        await npc.say(
            'I see you have an uncharged crown',
            'Capable of cremating bones to the underground',
            'I will charge it for you'
        );
        player.cache.occultcrown = 0;
    } else {
        await npc.say('Your crown already holds charges');
    }

    return true;
}

// post-mould dialogue tree: player already has scorpius_mould
async function talkWithMould(player, npc) {
    const options = [
        'I have come to seek a blessing',
        'I need another unholy symbol mould',
        'I have come to kill you'
    ];

    if (customQuestsEnabled(player)) {
        options.push('About mould drops');
    }

    // multi(player, n, false, ...): sendOver=false
    const option = await player.ask(options, false);

    if (option === 0) {
        await player.say('I have come to seek a blessing');

        if (player.inventory.has(UNHOLY_SYMBOL_OF_ZAMORAK_ID)) {
            await npc.say(
                'I see you have the unholy symbol of our Lord',
                "It is blessed with the Lord Zamorak's power",
                'Come to me when your faith weakens'
            );
        } else if (player.inventory.has(UNBLESSED_UNHOLY_SYMBOL_OF_ZAMORAK_ID)) {
            await npc.say(
                'I see you have the unholy symbol of our Lord',
                'I will bless it for you'
            );
            player.message('The ghost mutters in a strange voice');
            player.inventory.remove(UNBLESSED_UNHOLY_SYMBOL_OF_ZAMORAK_ID, 1);
            player.inventory.add(UNHOLY_SYMBOL_OF_ZAMORAK_ID, 1);
            player.message('The unholy symbol throbs with power');
            await player.world.sleepTicks(3);
            await npc.say(
                'The symbol of our lord has been blessed with power!',
                'My master calls...'
            );
        } else {
            await npc.say(
                'No blessings will be given to those',
                "Who have no symbol of our Lord's love!"
            );
        }
    } else if (option === 1) {
        await player.say('I need another mould for the unholy symbol');

        if (player.inventory.has(UNHOLY_SYMBOL_MOULD_ID)) {
            await npc.say(
                'One you already have, another is not needed',
                'Leave me be!'
            );
        } else {
            await npc.say(
                'To lose an object is easy to replace',
                'To lose the affections of our lord is impossible to forgive...'
            );
            player.message('The ghost hands you another mould');
            player.inventory.add(UNHOLY_SYMBOL_MOULD_ID, 1);
        }
    } else if (option === 2) {
        await player.say('I have come to kill you');
        await npc.say(
            'The might of mortals to me is as the dust is to the sea!'
        );
    } else if (option === 3) {
        await player.say('About mould drops');

        if (typeof player.cache.want_unholy_symbol_drops !== 'boolean') {
            player.cache.want_unholy_symbol_drops = true;
        }

        const wantDrops = player.cache.want_unholy_symbol_drops;
        const words = wantDrops ? 'are' : 'are not';

        await npc.say(
            `I see you ${words} seeking the unholy symbol.`,
            'Do you wish to change your mind?'
        );

        const option2 = await player.ask(['Yes', 'No']);

        if (option2 === 0) {
            player.cache.want_unholy_symbol_drops = !wantDrops;
            await npc.say('Very well');
        } else {
            await npc.say('How dare you disturb me!');
        }
    }
}

// first-visit dialogue tree: grants the mould
async function talkFirstVisit(player, npc) {
    const menu = await player.ask([
        'I seek your wisdom',
        'I have come to kill you'
    ]);

    if (menu === 0) {
        await npc.say(
            'Indeed, I feel you have beheld the far places in the heavens',
            'My Lord instructs me to help you',
            'Here is a mould to make a token for our Lord',
            'A mould for the unholy symbol of Zamorak'
        );
        player.message('The ghost gives you a casting mould');
        player.inventory.add(UNHOLY_SYMBOL_MOULD_ID, 1);

        if (!player.cache.scorpius_mould) {
            player.cache.scorpius_mould = true;
        }
    } else if (menu === 1) {
        await npc.say(
            'The might of mortals to me is as the dust is to the sea!'
        );
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id === GHOST_SCORPIUS_ID) {
        player.engage(npc);
        await npc.say('We are waiting for you');
        npc.attack(player).catch(() => {});
        player.disengage();
        return true;
    }

    if (npc.id !== SPIRIT_OF_SCORPIUS_ID) {
        return false;
    }

    player.engage(npc);

    if (player.questStages.observatoryQuest !== -1) {
        await npc.say('How dare you disturb me!');
        player.disengage();
        return true;
    }

    if (player.cache.scorpius_mould) {
        await talkWithMould(player, npc);
    } else {
        await talkFirstVisit(player, npc);
    }

    player.disengage();
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== GRAVE_OF_SCORPIUS_ID) {
        return false;
    }

    player.message('Here lies Scorpius:');
    player.message('Only those who have seen beyond the stars');
    player.message('may seek his counsel');
    return true;
}

module.exports = { onUseWithNPC, onTalkToNPC, onGameObjectCommandOne };
