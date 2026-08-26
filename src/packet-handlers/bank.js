// register the two custom bulk-bank opcodes on the shared rsc-socket modules at load time
const clientOpcodes = require('@2003scape/rsc-socket/src/opcodes/client.json');
const serverDecoders = require('@2003scape/rsc-socket/src/server/decoders');

const BANK_DEPOSIT_ALL_INVENTORY = 24;
const BANK_DEPOSIT_ALL_EQUIPMENT = 26;

if (clientOpcodes.bankDepositAllInventory === undefined) {
    clientOpcodes.bankDepositAllInventory = BANK_DEPOSIT_ALL_INVENTORY;
    clientOpcodes.bankDepositAllEquipment = BANK_DEPOSIT_ALL_EQUIPMENT;
}

if (!serverDecoders.bankDepositAllInventory) {
    serverDecoders.bankDepositAllInventory = () => ({});
    serverDecoders.bankDepositAllEquipment = () => ({});
}

function bankOpen(player) {
    if (!player.interfaceOpen.bank) {
        player.bank.close();
        return false;
    }

    return true;
}

async function bankDeposit({ player }, { id, amount }) {
    if (bankOpen(player)) {
        player.bank.deposit(id, amount);
    }
}

async function bankWithdraw({ player }, { id, amount, noted }) {
    if (bankOpen(player)) {
        player.bank.withdraw(id, amount, !!noted);
    }
}

// deposit all from inventory, gated on want_custom_banks
async function bankDepositAllInventory({ player }) {
    if (bankOpen(player)) {
        player.bank.depositAllFromInventory();
    }
}

// deposit all from equipment, gated on want_custom_banks
async function bankDepositAllEquipment({ player }) {
    if (bankOpen(player)) {
        player.bank.depositAllFromEquipment();
    }
}

async function bankClose({ player }) {
    if (player.interfaceOpen.bank) {
        player.bank.close();
    }
}

module.exports = {
    bankDeposit,
    bankWithdraw,
    bankDepositAllInventory,
    bankDepositAllEquipment,
    bankClose
};
