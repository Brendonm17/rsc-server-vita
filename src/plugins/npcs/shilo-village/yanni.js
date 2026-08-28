// Yanni (npc 624): prices and sells carried antiques

const YANNI_ID = 624;

const COINS_ID = 10;
const BONE_KEY_ID = 835;
const STONE_PLAQUE_ID = 958;
const TATTERED_SCROLL_ID = 959;
const CRUMPLED_SCROLL_ID = 960;
const BERVIRIUS_TOMB_NOTES_ID = 961;
const LOCATING_CRYSTAL_ID = 972;
const BEADS_OF_THE_DEAD_ID = 852;

async function onTalkToNPC(player, npc) {
    if (npc.id !== YANNI_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello there!');
    await npc.say(
        'Greetings Bwana!',
        'My name is Yanni and I buy and sell antiques ',
        'and other interesting items.',
        'If you have any interesting items that you might',
        "want to sell me, please let me see them and I'll",
        'offer you a fair price.',
        'Would you like me to have a look at your items',
        'and give you a quote?'
    );

    const menu = await player.ask(
        ['Yes please!', 'Maybe some other time?'],
        true
    );

    if (menu === 0) {
        await npc.say('Great Bwana!');

        let countItemsInterest = 0;

        if (player.inventory.has(BONE_KEY_ID)) {
            await npc.say("I'll give you 100 Gold for the Bone Key.");
            countItemsInterest++;
        }

        if (player.inventory.has(STONE_PLAQUE_ID)) {
            await npc.say("I'll give you 100 Gold for the Stone-Plaque.");
            countItemsInterest++;
        }

        if (player.inventory.has(TATTERED_SCROLL_ID)) {
            await npc.say("I'll give you 100 Gold for your tattered scroll");
            countItemsInterest++;
        }

        if (player.inventory.has(CRUMPLED_SCROLL_ID)) {
            await npc.say("I'll give you 100 Gold for your crumpled scroll");
            countItemsInterest++;
        }

        if (player.inventory.has(BERVIRIUS_TOMB_NOTES_ID)) {
            await npc.say(
                "I'll give you 100 Gold for your Bervirius Tomb Notes."
            );
            countItemsInterest++;
        }

        if (player.inventory.has(LOCATING_CRYSTAL_ID)) {
            await npc.say(
                "WOW! I'll give you 500 Gold for your Locating Crystal!"
            );
            countItemsInterest++;
        }

        if (player.inventory.has(BEADS_OF_THE_DEAD_ID)) {
            await npc.say(
                "Great I'll give you 1000 Gold for your Beads of the Dead."
            );
            countItemsInterest++;
        }

        if (countItemsInterest > 0) {
            if (countItemsInterest > 1) {
                await npc.say('Those are the items I am interested in Bwana.');
            } else {
                await npc.say("And that's the only item I am interested in.");
            }

            await npc.say(
                'If you want to sell me those items, simply show them to me.'
            );
        } else {
            await npc.say("Sorry Bwana, you have nothing I am interested in.");
        }
    } else if (menu === 1) {
        await npc.say('Sure thing.', 'Have a nice day Bwana.');
    }

    player.disengage();
    return true;
}

async function onUseWithNPC(player, npc, item) {
    if (npc.id !== YANNI_ID) {
        return false;
    }

    switch (item.id) {
        case BONE_KEY_ID:
            await npc.say("Great item, here's 100 Gold for it.");
            player.inventory.remove(BONE_KEY_ID);
            player.inventory.add(COINS_ID, 100);
            player.message('You sell the Bone Key.');
            return true;
        case STONE_PLAQUE_ID:
            await npc.say("Great item, here's 100 Gold for it.");
            player.inventory.remove(STONE_PLAQUE_ID);
            player.inventory.add(COINS_ID, 100);
            player.message('You sell the Stone Plaque.');
            return true;
        case TATTERED_SCROLL_ID:
            await npc.say("Great item, here's 100 Gold for it.");
            player.inventory.remove(TATTERED_SCROLL_ID);
            player.inventory.add(COINS_ID, 100);
            player.message('You sell the Tattered Scroll.');
            return true;
        case CRUMPLED_SCROLL_ID:
            await npc.say("Great item, here's 100 Gold for it.");
            player.inventory.remove(CRUMPLED_SCROLL_ID);
            player.inventory.add(COINS_ID, 100);
            player.message('You sell the crumpled Scroll.');
            return true;
        case BERVIRIUS_TOMB_NOTES_ID:
            await npc.say("Great item, here's 100 Gold for it.");
            player.inventory.remove(BERVIRIUS_TOMB_NOTES_ID);
            player.inventory.add(COINS_ID, 100);
            player.message('You sell the Bervirius Tomb Notes.');
            return true;
        case LOCATING_CRYSTAL_ID:
            await npc.say("Great item, here's 500 Gold for it.");
            player.inventory.remove(LOCATING_CRYSTAL_ID);
            player.inventory.add(COINS_ID, 500);
            player.message('You sell the Locating Crystal.');
            return true;
        case BEADS_OF_THE_DEAD_ID:
            await npc.say("Great item, here's 1000 Gold for it.");
            player.inventory.remove(BEADS_OF_THE_DEAD_ID);
            player.inventory.add(COINS_ID, 1000);
            player.message('You sell Beads of the Dead.');
            return true;
        default:
            player.message('Nothing interesting happens');
            return true;
    }
}

module.exports = { onTalkToNPC, onUseWithNPC };
