
const HERO_ID = 324;
const PALADIN_ID = 323;
const KNIGHT_ID = 322;
const GUARD_ID = 321;
const SPICE_MERCHANT_ID = 329;

const STOLEN_BLOCK_MS = 1200 * 1000;

async function onTalkToNPC(player, npc) {
    if (npc.id !== SPICE_MERCHANT_ID) {
        return false;
    }

    player.engage(npc);

    const { world } = player;

    if (
        player.cache.spiceStolen &&
        Date.now() < player.cache.spiceStolen + STOLEN_BLOCK_MS
    ) {
        await npc.say(
            "Do you really think I'm going to buy something",
            'That you have just stolen from me',
            'guards guards'
        );

        // visible within 5 tiles: hero > paladin > knight > guard priority
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
        await npc.say(
            'Get your exotic spices here',
            'rare very valuable spices here'
        );

        const menu = await player.ask(
            ["Lets have a look them then", "No thank you I'm not interested"],
            false
        );

        if (menu === 0) {
            await player.say('Lets have a look then');
            player.disengage();
            player.openShop('spices-stall');
            return true;
        } else if (menu === 1) {
            await player.say('No thank you');
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
