// https://classic.runescape.wiki/w/Dye
// combine dyes messages

const DYE_MIX_IDS = [
    // red + blue = purple
    {
        dye: 238,
        withDye: 272,
        result: 516,
        message: 'You mix the two dyes and make a purple dye'
    },
    // blue + yellow = green
    {
        dye: 272,
        withDye: 239,
        result: 515,
        message: 'You mix the two dyes and make a green dye'
    },
    // red + yellow = orange
    {
        dye: 238,
        withDye: 239,
        result: 282,
        message: 'You mix the two dyes and make an orange dye'
    }
];

async function onUseWithInventory(player, item, target) {
    for (const { dye, withDye, result, message } of DYE_MIX_IDS) {
        if (
            (item.id === dye && target.id === withDye) ||
            (item.id === withDye && target.id === dye)
        ) {
            player.inventory.remove(dye);
            player.inventory.remove(withDye);
            player.inventory.add(result);
            player.message(message);
            return true;
        }
    }

    return false;
}

module.exports = { onUseWithInventory };
