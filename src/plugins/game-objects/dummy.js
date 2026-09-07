// https://classic.runescape.wiki/w/Dummy
// dummy (49): unlimited, 20 attack xp/hit, stops past attack level 7
// fight dummy (562): 200 attack xp/hit, capped at 10 uses (cache "combat_dummy")

const DUMMY_ID = 49;
const FIGHT_DUMMY_ID = 562;
const FIGHT_DUMMY_MAX_USES = 10;
const FIGHT_DUMMY_XP = 200;

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== DUMMY_ID && gameObject.id !== FIGHT_DUMMY_ID) {
        return false;
    }

    const { world } = player;

    if (gameObject.id === DUMMY_ID) {
        player.message('@que@You swing at the dummy');
        await world.sleepTicks(5);

        player.message('@que@You hit the dummy');
        player.sendSound('combat1');

        if (player.skills.attack.current > 7) {
            player.message(
                '@que@There is nothing more you can learn from hitting a dummy'
            );
        } else {
            player.addExperience('attack', 20);
        }

        return true;
    }

    // fight dummy (562): xp granted before the swing message
    let uses = player.cache.combat_dummy || 0;
    let grantXP = false;

    if (uses < FIGHT_DUMMY_MAX_USES) {
        uses += 1;
        player.cache.combat_dummy = uses;
        grantXP = true;
    }

    if (grantXP) {
        player.addExperience('attack', FIGHT_DUMMY_XP);
    }

    player.message('@que@You swing at the dummy');
    await world.sleepTicks(5);

    player.message('@que@You hit the dummy');
    player.sendSound('combat1');

    if (!grantXP) {
        player.message(
            '@que@There is nothing more you can learn from hitting this dummy'
        );
    }

    return true;
}

module.exports = { onGameObjectCommandOne };
