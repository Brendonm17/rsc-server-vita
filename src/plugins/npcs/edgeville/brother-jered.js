// BrotherJered: blesses Unblessed Holy Symbol (45) into Holy Symbol of Saradomin (385, equips chest). also
// unstrung-symbol branch, Praise be to Saradomin option, prayer-cape option (gated on wantSkillcapePerks) and crown-of-the-herbalist onUseNpc hook. item ids: UNBLESSED_HOLY_SYMBOL 45, HOLY_SYMBOL_OF_SARADOMIN 385, COINS 10, PRAYER_CAPE resolved by name

const skillCapes = require('../../skills/skill-capes');

const BROTHER_JERED_ID = 176;

const UNBLESSED_HOLY_SYMBOL_ID = 45;
const UNSTRUNG_HOLY_SYMBOL_OF_SARADOMIN_ID = 44;
const HOLY_SYMBOL_OF_SARADOMIN_ID = 385;
const COINS_ID = 10;

// defaults on when config key isn't set
function wantSkillcapePerks(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantSkillcapePerks !== false;
}

async function prayerCape(player, npc) {
    await npc.say(
        'Ah yes',
        'This cape shows devotion to Saradomin',
        'It is customarily given to those who are truly committed'
    );

    // requires prayer base level 99 (skills.prayer.base)
    const maxPrayer = player.skills.prayer.base;

    if (maxPrayer < 99) {
        return;
    }

    await npc.say('It looks like you might be worthy to be the next recipient');

    let choice = 1;

    while (choice === 1) {
        choice = await player.ask(
            ['Wow, what an honor', 'What can it do?'],
            false
        );

        if (choice === 1) {
            await npc.say(
                'By wearing this cape, you show your devotion to the gods',
                'Your prayers to the gods will endure longer',
                'Also, when you show your respect to the deceased...',
                '...you will receive additional favor from the gods'
            );
        }
    }

    if (choice === 0) {
        await npc.say(
            'I will bestow upon you a similar cape to the one I wear',
            'All I ask in return is that you donate 99,000 coins to the ' +
                'monastery',
            'So that we may continue the good works of Saradomin',
            'What say you?'
        );

        const donate = await player.ask(
            ['Sounds fair enough', 'No thankyou'],
            false
        );

        if (donate === 0) {
            if (player.inventory.has(COINS_ID, 99000)) {
                player.inventory.remove(COINS_ID, 99000);
                player.message("Brother Jered accepts your generous donation");
                player.message(
                    'And gives a cape exactly like the one he is wearing'
                );
                // give prayer cape (resolved by name)
                const prayerCapeId = skillCapes.resolveCapeIds().prayer;

                if (typeof prayerCapeId === 'number') {
                    player.inventory.add(prayerCapeId);
                }

                await npc.say("May Saradomin's light illuminate your path");
            } else {
                await player.say(
                    "Except I don't have enough coins on me",
                    "I'll have to come back later"
                );
                await npc.say('I will be here', 'Gods be with you');
            }
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== BROTHER_JERED_ID) {
        return false;
    }

    player.engage(npc);

    const options = [
        'What can you do to help a bold adventurer like myself?',
        'Praise be to Saradomin'
    ];

    if (wantSkillcapePerks(player)) {
        options.push('That cape is quite extravagant for a monk');
    }

    const option = await player.ask(options, false);

    if (option === 0) {
        const hasUnblessed = player.inventory.has(UNBLESSED_HOLY_SYMBOL_ID);
        const hasUnstrung = player.inventory.has(
            UNSTRUNG_HOLY_SYMBOL_OF_SARADOMIN_ID
        );

        if (!hasUnblessed && !hasUnstrung) {
            await npc.say(
                'If you have a silver star',
                'Which is the holy symbol of Saradomin',
                'Then I can bless it',
                'Then if you are wearing it',
                'It will help you when you are praying'
            );
        } else if (hasUnblessed) {
            await npc.say('Well I can bless that star of Saradomin you have');

            const subOption = await player.ask(
                ['Yes Please', 'No thankyou'],
                false
            );

            if (subOption === 0) {
                player.inventory.remove(UNBLESSED_HOLY_SYMBOL_ID);
                await player.say('Yes Please');
                player.message('You give Jered the symbol');
                player.message(
                    'Jered closes his eyes and places his hand on the symbol'
                );
                player.message('He softly chants');
                player.message('Jered passes you the holy symbol');
                player.inventory.add(HOLY_SYMBOL_OF_SARADOMIN_ID);
            } else if (subOption === 1) {
                await player.say('No Thankyou');
            }
        } else if (hasUnstrung) {
            await npc.say(
                'Well if you put a string on that holy symbol',
                'I can bless it for you"'
            );
        }
    } else if (option === 1) {
        await npc.say('Yes praise he who brings life to this world');
    } else if (wantSkillcapePerks(player) && option === 2) {
        await prayerCape(player, npc);
    }

    player.disengage();
    return true;
}

// using a Crown of the Herbalist on Brother Jered charges it (crown resolved by name)
const enchantedCrowns = require('../../skills/enchanted-crowns');

async function onUseWithNPC(player, npc, item) {
    if (npc.id !== BROTHER_JERED_ID) {
        return false;
    }

    const herbalistCrownId = enchantedCrowns.resolveCrownIds().herbalist;

    if (typeof herbalistCrownId !== 'number' || item.id !== herbalistCrownId) {
        return false;
    }

    // hasKey(), not truthiness
    if (typeof player.cache.herbalistcrown !== 'number') {
        await npc.say(
            'I see you have an uncharged crown',
            'Capable of purifying herbs back into nature',
            'I will charge it for you'
        );
        player.cache.herbalistcrown = 0;
    } else {
        await npc.say('Your crown already holds charges');
    }

    return true;
}

module.exports = { onTalkToNPC, onUseWithNPC };
