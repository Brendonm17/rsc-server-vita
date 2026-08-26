// scrumpled piece of paper: shows ugthanki kebab recipe, not consumed

const SCRUMPLED_PIECE_OF_PAPER_ID = 1120;

const RECIPE_LINES = [
    '@gre@*** Delicious Ugthanki Kebab ***',
    ' ',
    'Ingredients : Cooked Ugthanki meat',
    'Flour',
    'Water',
    'Onion',
    'Tomato',
    ' ',
    '@yel@The Ugthanki meat should be nicely grilled.',
    '@yel@Next take the flour and water and make some Pitta Bread.',
    "@yel@You'll need a range to do this.",
    ' ',
    '@yel@Take an onion and chop it into a bowl.',
    '@yel@Take a tomato and chop it into the onion mixture.',
    '@yel@Chop the meat into the Onion and Tomato mixture.',
    '@yel@Finally fill the pitta bread with the Ugthanki, Onion and',
    '@yel@Tomato mixture to make your delicious Ugthanki Kebab.'
];

async function onInventoryCommand(player, item) {
    if (item.id !== SCRUMPLED_PIECE_OF_PAPER_ID) {
        return false;
    }

    for (const line of RECIPE_LINES) {
        player.message(line);
    }

    return true;
}

module.exports = { onInventoryCommand };
