// patch rsc-socket: add server opcode 19 'serverConfigs' (each entry is a byte,
// or a string followed by a newline). sent right after login.
const fs = require('fs');

module.exports = function patchRscSocketServerConfigs() {
    const base = '@2003scape/rsc-socket/src/';

    const serverOpsPath = require.resolve(base + 'opcodes/server.json');
    const serverOps = JSON.parse(fs.readFileSync(serverOpsPath, 'utf8'));

    if (!('serverConfigs' in serverOps)) {
        serverOps.serverConfigs = 19;
        fs.writeFileSync(serverOpsPath, JSON.stringify(serverOps, null, 4) + '\n');
        console.log('patched rsc-socket opcodes/server.json (serverConfigs 19)');
    } else {
        console.log('rsc-socket opcodes/server.json (serverConfigs) already patched');
    }

    const encodersPath = require.resolve(base + 'server/encoders.js');
    let enc = fs.readFileSync(encodersPath, 'utf8');

    if (!enc.includes('serverConfigs(packet')) {
        const encoder =
            ',\n\n' +
            '    // [vita patch] SEND_SERVER_CONFIGS: 90 entries, strings newline-terminated\n' +
            '    serverConfigs(packet, { entries }) {\n' +
            '        for (const entry of entries) {\n' +
            "            if (typeof entry === 'string') {\n" +
            '                packet.writeString(entry);\n' +
            '                packet.writeByte(10);\n' +
            '            } else {\n' +
            '                packet.writeByte(entry & 0xff);\n' +
            '            }\n' +
            '        }\n' +
            '    }';
        const anchor = '    bankPin(packet';
        const at = enc.indexOf(anchor);
        if (at === -1) {
            throw new Error('socket-server-configs: bankPin encoder anchor not found');
        }
        // insert before the bankpin encoder's leading indentation
        const lineStart = enc.lastIndexOf('\n', at);
        const before = enc.slice(0, lineStart).replace(/,\s*$/, '');
        enc = before + encoder + ',\n' + enc.slice(lineStart + 1);
        fs.writeFileSync(encodersPath, enc);
        console.log('patched rsc-socket server/encoders.js (serverConfigs)');
    } else {
        console.log('rsc-socket server/encoders.js (serverConfigs) already patched');
    }
};
