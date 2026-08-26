// casket loot table: coins, gems, or half a key, weighted by an inclusive 0-1081 roll

const CASKET_ID = 549;

const COINS_ID = 10;
const UNCUT_SAPPHIRE_ID = 160;
const UNCUT_EMERALD_ID = 159;
const UNCUT_RUBY_ID = 158;
const UNCUT_DIAMOND_ID = 157;
const TOOTH_KEY_HALF_ID = 526;
const LOOP_KEY_HALF_ID = 527;

const COIN_AMOUNTS = [10, 20, 40, 80, 160, 320, 640];

async function onInventoryCommand(player, item) {
    if (item.id !== CASKET_ID) {
        return false;
    }

    player.message('you open the casket');
    await player.world.sleepTicks(2);

    player.inventory.remove(CASKET_ID);

    player.message('@que@you find some treasure inside!');

    // random(0, 1081), inclusive
    const roll = Math.floor(Math.random() * 1082);

    if (roll <= 585) {
        // Coins, 54.16% chance, 7 equally-likely amounts.
        const coinRoll = Math.floor(Math.random() * 7);
        player.inventory.add(COINS_ID, COIN_AMOUNTS[coinRoll]);
    } else if (roll <= 859) {
        // Uncut sapphire, 25.32% chance.
        player.inventory.add(UNCUT_SAPPHIRE_ID);
    } else if (roll <= 990) {
        // Uncut emerald, 12.11% chance.
        player.inventory.add(UNCUT_EMERALD_ID);
    } else if (roll <= 1047) {
        // Uncut ruby, 5.27% chance.
        player.inventory.add(UNCUT_RUBY_ID);
    } else if (roll <= 1064) {
        // Uncut diamond, 1.57% chance.
        player.inventory.add(UNCUT_DIAMOND_ID);
    } else {
        // Tooth/loop half of key, 1.57% chance, 50/50 split.
        const keyRoll = Math.floor(Math.random() * 2);
        player.inventory.add(keyRoll === 0 ? TOOTH_KEY_HALF_ID : LOOP_KEY_HALF_ID);
    }

    return true;
}

module.exports = { onInventoryCommand };
