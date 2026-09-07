// The Grand Tree (members) - Hazelmere the ancient mage. talk-to-npc, including
// the combat odyssey branch (stages 3..16, -1: tier 5->6 and 6->7 progression)

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    HAZELMERE,
    BARK_SAMPLE,
    TREE_GNOME_TRANSLATION
} = require('./ids.js');
const combatOdyssey = require('../../../custom/minigames/combat-odyssey/index.js')
    ._internal;

// hazelmere-speak shown as plain messages
async function strangeTranslationBox(player) {
    player.message(
        '@yel@x@red@z@yel@ql@red@:v@yel@ha @red@za@yel@:v@red@ql@yel@::: ' +
            '@red@h:@yel@xa@red@lat@yel@x @red@vo@yel@xa@red@ha@yel@qa@red@sol ' +
            '@yel@sol@red@:::@yel@:v@red@va',
        '@yel@qa@red@:v@yel@::@red@::: @yel@x@red@z@yel@ql@red@:v@yel@ha ' +
            '@red@qe@yel@:v@red@ha @yel@qe@red@:v@yel@za@red@ho@yel@ha@red@xa' +
            '@yel@:v @red@qi@yel@ho@red@za@yel@vo',
        '@red@qe@yel@:v@red@za@yel@ho@red@ha@yel@xa@red@:v @yel@qi@red@ho' +
            '@yel@za@red@vo@yel@sol @red@h:@yel@xa@red@va@yel@va @red@vo@yel@xa' +
            '@red@va@yel@va @yel@lat@red@qi@yel@:::@red@:::'
    );
}

// substitution cipher into gnome-speak; non-letters pass through unchanged
const GNOME_CIPHER = {
    a: ':v',
    b: 'x:',
    c: 'za',
    d: 'qe',
    e: ':::',
    f: 'hb',
    g: 'qa',
    h: 'x',
    i: 'xa',
    j: 've',
    k: 'vo',
    l: 'va',
    m: 'ql',
    n: 'ha',
    o: 'ho',
    p: 'ni',
    q: 'na',
    r: 'qi',
    s: 'sol',
    t: 'lat',
    u: 'z',
    v: '::',
    w: 'h:',
    x: ':i:',
    y: 'im',
    z: 'dim'
};
function hazelmereTranslate(...messages) {
    return messages.map((message) => {
        let translated = '';
        for (const ch of message) {
            const isLetter = /[A-Za-z]/.test(ch);
            const key = isLetter ? ch.toLowerCase() : ch;
            translated += Object.prototype.hasOwnProperty.call(GNOME_CIPHER, key)
                ? GNOME_CIPHER[key]
                : ch;
        }
        return translated;
    });
}

// combat odyssey branch (stages 3..16, -1); returns true if it handled the talk
async function hazelmereCombatOdyssey(player, npc) {
    if (!combatOdyssey.combatOdysseyEnabled(player)) {
        return false;
    }

    const currentTier = combatOdyssey.getCurrentTier(player);
    let newTier = null;
    if (currentTier === 5 && combatOdyssey.isTierCompleted(player)) {
        newTier = 6;
    } else if (currentTier === 6 && combatOdyssey.isTierCompleted(player)) {
        newTier = 7;
    } else {
        return false;
    }

    if (await combatOdyssey.biggumMissing(player)) {
        return true;
    }

    if (player.inventory.has(TREE_GNOME_TRANSLATION)) {
        combatOdyssey.assignNewTier(player, newTier);
        await npc.say('qaxahblat');
        await combatOdyssey.giveRewards(player, npc);

        const tier = combatOdyssey.getTier(newTier);
        const tasksAndCounts = combatOdyssey.getTasksAndCounts(tier);

        if (newTier === 6) {
            await npc.say('voxavava latxxahaqasol');
            await npc.say(...hazelmereTranslate(...tasksAndCounts));
            await npc.say('xc:vzavo latho xasolva:vhaqe');
            await combatOdyssey.biggumSay(
                player,
                'Biggum knows to keep enemies close',
                'Biggum understand gnomespeak'
            );
        } else {
            await npc.say('hahoh voxavava');
            await npc.say(...hazelmereTranslate(...tasksAndCounts));
            await npc.say('qaho latho solxaqax::::qilat latx::: h::vqiqixahoqi');
            await combatOdyssey.biggumSay(player, 'Human go kill');
            await combatOdyssey.biggumSay(player, ...tasksAndCounts);
            await combatOdyssey.biggumSay(player, 'And then go see Sigbert adventure man');
        }
    } else {
        player.message('@que@The mage mumbles in an ancient tongue');
        player.message("@que@You can't understand a word");
        await player.world.sleepTicks(3);
        await player.say('I should probably get a tree gnome translation for this');
    }

    return true;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== HAZELMERE) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_KEY] || 0;

    switch (stage) {
        case 0:
            player.message('the mage mumbles in an ancient tounge');
            await player.world.sleepTicks(3);
            player.message("you can't understand a word");
            await player.world.sleepTicks(3);
            break;
        case 1:
            await player.say('hello');
            if (player.inventory.has(BARK_SAMPLE)) {
                player.message('@que@you give the mage the bark sample');
                await player.world.sleepTicks(3);
                player.inventory.remove(BARK_SAMPLE);
                player.message('@que@the mage speaks in a strange ancient tongue');
                await player.world.sleepTicks(3);
                player.message('@que@he says....');
                await player.world.sleepTicks(3);
                await strangeTranslationBox(player);
                player.questStages[QUEST_KEY] = 2;
            } else {
                player.message('the mage mumbles in an ancient tounge');
                await player.world.sleepTicks(3);
                player.message("you can't understand a word");
                await player.world.sleepTicks(3);
                player.message('@que@you need to give him the bark sample');
                await player.world.sleepTicks(3);
            }
            break;
        case 2:
            player.message('@que@the mage speaks in a strange ancient tongue');
            await player.world.sleepTicks(3);
            player.message('@que@he says....');
            await player.world.sleepTicks(3);
            await strangeTranslationBox(player);
            break;
        default: {
            // stages 3..16 and -1
            const handled = await hazelmereCombatOdyssey(player, npc);
            if (!handled) {
                player.message('the mage mumbles in an ancient tounge');
                player.message("you can't understand a word");
            }
            break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
