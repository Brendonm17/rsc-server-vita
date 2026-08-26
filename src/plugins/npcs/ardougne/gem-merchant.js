// gem merchant: shop and stolen-goods guard alert

const HERO_ID = 324;
const PALADIN_ID = 323;
const KNIGHT_ID = 322;
const GUARD_ID = 321;
const GEM_MERCHANT_ID = 330;

const STOLEN_BLOCK_MS = 1200 * 1000;

async function onTalkToNPC(player, npc) {
    if (npc.id !== GEM_MERCHANT_ID) {
        return false;
    }

    player.engage(npc);

    const { world } = player;

    if (
        player.cache.gemStolen &&
        Date.now() < player.cache.gemStolen + STOLEN_BLOCK_MS
    ) {
        await npc.say(
            "Do you really think I'm going to buy something",
            'That you have just stolen from me',
            'guards guards'
        );

        // visible and within 5 tiles: hero > paladin > knight > guard
        const attacker = [HERO_ID, PALADIN_ID, KNIGHT_ID, GUARD_ID]
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
        await npc.say('Here, look at my lovely gems');

        const menu = await player.ask(
            ['Ok show them to me', "I'm not interested thankyou"],
            false
        );

        if (menu === 0) {
            await player.say('Ok show them to me');
            player.disengage();
            player.openShop('gems-stall');
            return true;
        } else if (menu === 1) {
            await player.say("I'm not intersted thankyou");
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
