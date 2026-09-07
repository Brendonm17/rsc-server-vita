// interface options, bank pin family (sub 8): show/set/change/remove/verify a
// 4-digit pin, kept as plain text in player.cache.bank_pin

// player -> resolver for the askBankPin() call waiting on the next sub-8 packet;
// weakmap keeps it off the player object (nothing here should hit the save)
const pending = new WeakMap();

// action 0 = submit a 4-char pin, action 1 = cancel
async function bankPinOptions(player, { action, name }) {
    const resolve = pending.get(player);

    if (!resolve) {
        return;
    }

    if (action === 0) {
        if (!name || name.length !== 4) {
            return;
        }

        pending.delete(player);
        resolve(name);
    } else if (action === 1) {
        pending.delete(player);
        resolve('cancel');
    }
}

// show the pin pad and wait; resolves to the entered 4-digit string or 'cancel'.
// only one pad pending per player, callers must not overlap requests
function askBankPin(player) {
    return new Promise((resolve) => {
        pending.set(player, resolve);
        player.send({ type: 'bankPin', open: true });
    });
}

function hasBankPin(player) {
    return !!(player.cache && player.cache.bank_pin);
}

// no pin set = nothing to verify; else show the pad, re-prompting on a wrong
// guess until it matches or the player cancels
async function verifyBankPin(player) {
    if (!hasBankPin(player)) {
        return true;
    }

    for (;;) {
        const entered = await askBankPin(player);

        if (entered === 'cancel') {
            return false;
        }

        if (entered === player.cache.bank_pin) {
            player.message('@que@You have correctly entered your bank pin');
            return true;
        }

        player.message('@que@Bank pin incorrect');
    }
}

// set a bank pin
async function setBankPin(player) {
    if (hasBankPin(player)) {
        player.message('@que@You already have a bank pin');
        return false;
    }

    const entered = await askBankPin(player);

    if (entered === 'cancel') {
        player.message(
            '@que@You have not entered a new bank pin. No bank pin set'
        );
        return false;
    }

    player.cache.bank_pin = entered;
    player.message('@que@Bank pin set');
    return true;
}

// change the bank pin
async function changeBankPin(player) {
    if (!hasBankPin(player)) {
        player.message('@que@You do not have a bank pin to change');
        return false;
    }

    const oldPin = await askBankPin(player);

    if (oldPin === 'cancel') {
        player.message('@que@Can not change bank pin: No old bank pin entered');
        return false;
    }

    if (oldPin !== player.cache.bank_pin) {
        player.message('@que@Can not change bank pin: Invalid old bank pin');
        return false;
    }

    const newPin = await askBankPin(player);

    if (newPin === 'cancel') {
        player.message(
            '@que@You have not entered a new bank pin. No bank pin set'
        );
        return false;
    }

    player.cache.bank_pin = newPin;
    player.message('@que@Bank pin changed');
    return true;
}

// remove the bank pin
async function removeBankPin(player) {
    if (!hasBankPin(player)) {
        player.message('@que@You do not have a bank pin to remove');
        return false;
    }

    const oldPin = await askBankPin(player);

    if (oldPin === 'cancel') {
        player.message('@que@Can not change bank pin: No old bank pin entered');
        return false;
    }

    if (oldPin !== player.cache.bank_pin) {
        player.message('@que@Can not change bank pin: Invalid old bank pin');
        return false;
    }

    delete player.cache.bank_pin;
    player.message('@que@Your bank pin has been removed');
    return true;
}

module.exports = {
    bankPinOptions,
    askBankPin,
    hasBankPin,
    verifyBankPin,
    setBankPin,
    changeBankPin,
    removeBankPin
};
