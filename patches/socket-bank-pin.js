// bank pin wire: server opcode 135 (sendBankPinInterface), one byte isOpen.
// client rides CLIENT_INTERFACE_OPTIONS (199) sub-op 8
const fs = require('fs');

function patchSocketBankPin() {
    const base = '@2003scape/rsc-socket/src/';

    const serverOpsPath = require.resolve(base + 'opcodes/server.json');
    const serverOps = JSON.parse(fs.readFileSync(serverOpsPath, 'utf8'));

    if (!('bankPin' in serverOps)) {
        serverOps.bankPin = 135;
        fs.writeFileSync(
            serverOpsPath,
            JSON.stringify(serverOps, null, 4) + '\n'
        );
        console.log('patched rsc-socket opcodes/server.json (bankPin 135)');
    }

    const encodersPath = require.resolve(base + 'server/encoders.js');
    let enc = fs.readFileSync(encodersPath, 'utf8');

    if (!enc.includes('bankPin(packet')) {
        const encoder =
            ',\n\n' +
            '    // [vita patch] bank PIN pad show/hide (BankPinStruct\n' +
            '    // verbatim): one byte, 1 = show the pad, 0 = hide it.\n' +
            '    bankPin(packet, { open }) {\n' +
            '        packet.writeByte(open ? 1 : 0);\n' +
            '    }\n';
        const encAnchor = '\n};\n\nmodule.exports = encoders;';

        if (enc.includes(encAnchor)) {
            enc = enc.replace(
                encAnchor,
                encoder + '};\n\nmodule.exports = encoders;'
            );
            fs.writeFileSync(encodersPath, enc);
            console.log('patched rsc-socket server/encoders.js (bankPin)');
        } else {
            console.log(
                'WARNING: rsc-socket encoders anchor not found, NOT patched (bankPin)'
            );
        }
    }

    // no decoders.js change: the party patch's interfaceOptions decoder
    // already parses sub-op 8 as a generic sub/action/name read
}

module.exports = patchSocketBankPin;
