// reading the card prints the six-pub checklist

const BARCRAWL_CARD_ID = 668;

const PUBS = [
    ['jollyBoar', 'The jolly boar inn'],
    ['blueMoon', 'The blue moon inn'],
    ['risingSun', 'The rising sun'],
    ['deadMansChest', "The dead man's chest"],
    ['foresterArms', "The forester's arms"],
    ['rustyAnchor', 'The rusty anchor']
];

async function onInventoryCommand(player, item) {
    if (item.id !== BARCRAWL_CARD_ID) {
        return false;
    }

    const { world } = player;
    const barcrawl = player.cache.barcrawl || {};

    if (PUBS.every(([key]) => barcrawl[key])) {
        player.message('You are to drunk to be able to read the barcrawl card');
        return true;
    }

    player.message('The official Alfred Grimhand barcrawl');
    await world.sleepTicks(3);

    for (let i = 0; i < PUBS.length; i += 1) {
        const [key, name] = PUBS[i];

        player.message(
            `${name} - ${barcrawl[key] ? 'completed' : 'not completed'}`
        );

        if (i < PUBS.length - 1) {
            await world.sleepTicks(2);
        }
    }

    return true;
}

module.exports = { onInventoryCommand };
