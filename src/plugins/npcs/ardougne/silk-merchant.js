// silk merchant: buys silk at a haggled price via dialogue

const GUARD_ID = 321;
const SILK_MERCHANT_ID = 326;
// OpenRSC ItemId.SILK (200) - rsc-data items.json 200 "silk"
const SILK_ID = 200;
const COINS_ID = 10;

const STOLEN_BLOCK_MS = 1200 * 1000;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SILK_MERCHANT_ID) {
        return false;
    }

    player.engage(npc);

    const { world } = player;

    if (
        player.cache.silkStolen &&
        Date.now() < player.cache.silkStolen + STOLEN_BLOCK_MS
    ) {
        await npc.say(
            "Do you really think I'm going to buy something",
            'That you have just stolen from me',
            'guards guards'
        );

        // Java ifnearvisnpc(player, id, 5): visible and within 5 tiles.
        const attacker = Array.from(world.npcs.getAllByID(GUARD_ID)).find(
            (n) => {
                return (
                    player.localEntities.known.npcs.has(n) &&
                    n.getDistance(player) <= 5
                );
            }
        );

        if (attacker) {
            await attacker.attack(player);
        }

        player.disengage();
        return true;
    }

    if (player.inventory.has(SILK_ID)) {
        await player.say('Hello I have some fine silk from Al Kharid to sell to you');
        await npc.say(
            'Ah I may be intersted in that',
            'What sort of price were you looking at per piece of silk?'
        );

        // Java multi(player, n, options...) defaults send-over true.
        const menu = await player.ask(
            ['20 coins', '80 coins', '120 coins', '200 coins'],
            true
        );

        if (menu === 0) {
            await npc.say('Ok that suits me');

            if (player.inventory.has(SILK_ID)) {
                player.inventory.remove(SILK_ID);
                player.inventory.add(COINS_ID, 20);
            }
        } else if (menu === 1) {
            await npc.say('80 coins that\'s a bit steep', 'How about 40 coins');

            // Java multi(player, n, options...) defaults send-over true.
            const reply2 = await player.ask(
                [
                    'Ok 40 sounds good',
                    "50 and that's my final price",
                    'No that is not enough'
                ],
                true
            );

            if (reply2 === 0) {
                if (player.inventory.has(SILK_ID)) {
                    player.inventory.remove(SILK_ID);
                    player.inventory.add(COINS_ID, 40);
                }
            } else if (reply2 === 1) {
                await npc.say('Done');

                if (player.inventory.has(SILK_ID)) {
                    player.inventory.remove(SILK_ID);
                    player.inventory.add(COINS_ID, 50);
                }
            }
        } else if (menu === 2) {
            await npc.say(
                "You'll never get that much for it",
                "I'll be generous and give you 50 for it"
            );

            const reply = await player.ask(
                [
                    'Ok I guess 50 will do',
                    "I'll give it to you for 60",
                    'No that is not enough'
                ],
                false
            );

            if (reply === 0) {
                await player.say('Ok I guess 50 will do');

                if (player.inventory.has(SILK_ID)) {
                    player.inventory.remove(SILK_ID);
                    player.inventory.add(COINS_ID, 50);
                }
            } else if (reply === 1) {
                await player.say("I'll give it you for 60");
                await npc.say(
                    'You drive a hard bargain',
                    'but I guess that will have to do'
                );

                if (player.inventory.has(SILK_ID)) {
                    player.inventory.remove(SILK_ID);
                    player.inventory.add(COINS_ID, 60);
                }
            } else if (reply === 2) {
                await player.say('No that is not enough');
            }
        } else if (menu === 3) {
            await npc.say(
                "Don't be ridiculous that is far to much",
                'You insult me with that price'
            );
        }
    } else {
        await npc.say('I buy silk', 'If you get any silk to sell bring it here');
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
