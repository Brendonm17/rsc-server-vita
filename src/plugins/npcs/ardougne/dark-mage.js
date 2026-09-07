// dark mage stonewalls visitors while underground pass is in progress. once
// complete he opens up and repairs a broken staff of iban for 200,000 coins.
// also runs the combat odyssey tier 3->4 and 4->5 branch.

const Quests = { UNDERGROUND_PASS: 'undergroundPass' };

const ItemId = {
    STAFF_OF_IBAN: 1000,
    STAFF_OF_IBAN_BROKEN: 1031,
    COINS: 10
};

const DARK_MAGE_ID = 667;
const REPAIR_COST = 200000;

const { co, biggumMissing, giveRewards, biggumSay } = require('../combat-odyssey-shared');

// combat odyssey on unless config disables it
function wantCombatOdyssey(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantCombatOdyssey !== false;
}

function getQuestStage(player) {
    return typeof player.questStages[Quests.UNDERGROUND_PASS] === 'number'
        ? player.questStages[Quests.UNDERGROUND_PASS]
        : 0;
}

async function talkCombatOdyssey(player, npc) {
    const currentTier = co.getCurrentTier(player);

    if (currentTier === 3 && co.isTierCompleted(player)) {
        if (await biggumMissing(player)) {
            return true;
        }

        const newTier = 4;
        co.assignNewTier(player, newTier);

        await npc.say('Why do you interrupt me traveller?');
        await player.say("Grew sent me here on the next part of Radimus' quest");
        await npc.say(
            "Ah, you're one of those",
            'My brutish associate to the south asked me to give you this',
            'A rather primitive weapon if you ask me'
        );
        await giveRewards(player, npc);
        await npc.say("Now, for the things I'm supposed to send you off to kill");
        await npc.say(...co.getTasksAndCounts(co.getTier(newTier)));
        await npc.say('Afterwards, come back to see me again');
        await biggumSay(player, 'Biggum keeps track, Biggum big help!');
        await npc.say(
            'Begone, and take your green friend with you before I turn him into a newt'
        );

        return true;
    } else if (currentTier === 4 && co.isTierCompleted(player)) {
        if (await biggumMissing(player)) {
            return true;
        }

        const newTier = 5;
        co.assignNewTier(player, newTier);

        await npc.say(
            'Welcome back traveller',
            'The last thing you need to kill before I send you off is'
        );
        await npc.say(...co.getTasksAndCounts(co.getTier(newTier)));
        await npc.say('Take these, they might help');
        await giveRewards(player, npc);
        await npc.say('Afterwards, go see Hazelmere the gnome');

        return true;
    }

    return false;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== DARK_MAGE_ID) {
        return false;
    }

    player.engage(npc);

    if (wantCombatOdyssey(player) && (await talkCombatOdyssey(player, npc))) {
        player.disengage();
        return true;
    }

    await player.say('hello there');
    await npc.say('why do do you interupt me traveller?');

    if (getQuestStage(player) !== -1) {
        await player.say("i'm just looking around");
        await npc.say('there\'s nothing to see here', 'just despair and death');
        player.disengage();
        return true;
    }

    await player.say("i just wondered what you're doing?");
    await npc.say('i experiment with dark magic', "it's a dangerous craft");

    if (player.inventory.has(ItemId.STAFF_OF_IBAN_BROKEN)) {
        await player.say('could you fix this staff?');
        player.message('you show the mage your staff of iban');
        await npc.say('almighty zamorak! the staff of iban!');
        await player.say('can you fix it?');
        await npc.say(
            'this truly is dangerous magic traveller',
            'i can fix it, but it will cost you',
            'the process could kill me'
        );
        await player.say('how much?');
        await npc.say('200,000 gold pieces, not a penny less');

        const menu = await player.ask(
            ["no chance, that's ridiculous", 'ok then'],
            true
        );

        if (menu === 0) {
            await npc.say('fine by me');
        } else if (menu === 1) {
            if (!player.inventory.has(ItemId.COINS, REPAIR_COST)) {
                player.message("you don't have enough money");
                await player.say("oops, i'm a bit short");
            } else {
                player.message('@que@you give the mage 200,000 coins');
                await player.world.sleepTicks(3);
                player.message('@que@and the staff of iban');
                await player.world.sleepTicks(3);

                player.inventory.remove(ItemId.COINS, REPAIR_COST);
                player.inventory.remove(ItemId.STAFF_OF_IBAN_BROKEN, 1);

                player.message('the mage fixes the staff and returns it to you');
                player.inventory.add(ItemId.STAFF_OF_IBAN, 1);
                await player.say('thanks mage');
                await npc.say('you be carefull with that thing');
            }
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
