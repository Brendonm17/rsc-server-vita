// https://classic.runescape.wiki/w/Evil_Tree

const EVIL_TREE_ID = 88;

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== EVIL_TREE_ID) {
        return false;
    }

    const { world } = player;

    player.message('@que@The tree seems to lash out at you!');
    await world.sleepTicks(1);

    // damage is 20% of current hits level
    const damage = Math.floor(player.skills.hits.current * 0.2);

    player.damage(damage);
    player.message('@que@You are badly scratched by the tree');

    return true;
}

module.exports = { onGameObjectCommandOne };
