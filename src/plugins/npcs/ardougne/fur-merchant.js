// fur merchant: shop and stolen-goods guard alert

const KNIGHT_ID = 322;
const GUARD_ID = 321;
const FUR_MERCHANT_ID = 327;

// how long a theft flag blocks trading
const STOLEN_BLOCK_MS = 1200 * 1000;

async function onTalkToNPC(player, npc) {
    if (npc.id !== FUR_MERCHANT_ID) {
        return false;
    }

    player.engage(npc);

    const { world } = player;

    if (
        player.cache.furStolen &&
        Date.now() < player.cache.furStolen + STOLEN_BLOCK_MS
    ) {
        await npc.say(
            "Do you really think I'm going to buy something",
            'That you have just stolen from me',
            'guards guards'
        );

        // visible and within 5 tiles, knight first then guard
        const attacker = [KNIGHT_ID, GUARD_ID]
            .map((id) => {
                return Array.from(world.npcs.getAllByID(id)).find((n) => {
                    return (
                        player.localEntities.known.npcs.has(n) &&
                        n.getDistance(player) <= 5
                    );
                });
            })
            .find(Boolean);

        if (attacker) {
            await attacker.attack(player);
        }
    } else {
        await npc.say('would you like to do some fur trading?');

        const menu = await player.ask(['yes please', 'No thank you'], false);

        if (menu === 0) {
            await player.say('Yes please');
            player.disengage();
            player.openShop('fur-stall');
            return true;
        } else if (menu === 1) {
            await player.say('No thank you');
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
