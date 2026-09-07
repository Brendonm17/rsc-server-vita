// custom interface options (opcode 199), dispatched per family by sub-op byte
// 8 = bank pin, 10 = auction house, 11 = clan, 12 = party
const FAMILIES = {
    8: () => require('./interface/bank-pin').bankPinOptions,
    10: () => require('./interface/auction').auctionOptions,
    11: () => require('./interface/clan').clanOptions,
    12: () => require('./interface/party').partyOptions
};

async function interfaceOptions({ player }, message) {
    const family = FAMILIES[message.sub];

    if (!family) {
        return;
    }

    let handler;

    try {
        handler = family();
    } catch (e) {
        return; // family not ported yet
    }

    await handler(player, message);
}

module.exports = { interfaceOptions };
