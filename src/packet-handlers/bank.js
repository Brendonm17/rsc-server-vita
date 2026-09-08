// register the two custom bulk-deposit opcodes (24, 26) and their decoders on
// the shared rsc-socket modules at load time, before any socket is built
const clientOpcodes = require('@2003scape/rsc-socket/src/opcodes/client.json');
const serverDecoders = require('@2003scape/rsc-socket/src/server/decoders');
const bankPin = require('./interface/bank-pin');

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

// trade/duel gate plus the bank-pin lock; a pin is asked once per session
async function bankOpen(player) {
    if (
        !player.interfaceOpen.bank ||
        player.interfaceOpen.trade ||
        player.duel.isDuelActive()
    ) {
        player.bank.close();
        return false;
    }

    if (bankPin.hasBankPin(player) && !player._bankPinVerified) {
        if (player._bankPinVerifying) {
            return false; // pad already showing, ignore the extra click
        }

        player._bankPinVerifying = true;

        try {
            player._bankPinVerified = await bankPin.verifyBankPin(player);
        } finally {
            player._bankPinVerifying = false;
        }

        if (!player._bankPinVerified) {
            player.bank.close();
            return false;
        }
    }

    return true;
}

async function bankDeposit({ player }, { id, amount }) {
    if (await bankOpen(player)) {
        player.bank.deposit(id, amount);
    }
}

async function bankWithdraw({ player }, { id, amount, noted }) {
    if (await bankOpen(player)) {
        player.bank.withdraw(id, amount, !!noted);
    }
}

// deposit all from inventory, gated on want_custom_banks
async function bankDepositAllInventory({ player }) {
    if (await bankOpen(player)) {
        player.bank.depositAllFromInventory();
    }
}

// deposit all from equipment, gated on want_custom_banks
async function bankDepositAllEquipment({ player }) {
    if (await bankOpen(player)) {
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
