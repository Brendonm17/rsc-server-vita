
const PALADIN_ID = 323;
const KNIGHT_ID = 322;
const GUARD_ID = 321;
const SILVER_MERCHANT_ID = 328;

const STOLEN_BLOCK_MS = 1200 * 1000;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SILVER_MERCHANT_ID) {
        return false;
    }

    player.engage(npc);

    const { world } = player;

    if (
        player.cache.silverStolen &&
        Date.now() < player.cache.silverStolen + STOLEN_BLOCK_MS
    ) {
        await npc.say(
            "Do you really think I'm going to buy something",
            'That you have just stolen from me',
            'guards guards'
        );

        // visible within 5 tiles: paladin > knight > guard priority
        const attacker = [PALADIN_ID, KNIGHT_ID, GUARD_ID]
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
        await npc.say(
            'Silver! Silver!',
            'Best prices for buying and selling in all Kandarin!'
        );

        // Java multi(player, n, options...) defaults send-over true.
        const menu = await player.ask(['Yes please', 'No thankyou'], true);

        if (menu === 0) {
            player.disengage();
            player.openShop('silver-stall');
            return true;
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
