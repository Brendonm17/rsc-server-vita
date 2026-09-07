// patch rsc-socket: add client opcode 203 'npccommand2', an npc's second
// right-click command; same payload as npccommand (202), the npc index short.
const fs = require('fs');

module.exports = function patchRscSocketNpcCommand2() {
    const base = '@2003scape/rsc-socket/src/';

    const clientOpsPath = require.resolve(base + 'opcodes/client.json');
    const clientOps = JSON.parse(fs.readFileSync(clientOpsPath, 'utf8'));

    if (!('npcCommand2' in clientOps)) {
        clientOps.npcCommand2 = 203;
        fs.writeFileSync(clientOpsPath, JSON.stringify(clientOps, null, 4) + '\n');
        console.log('patched rsc-socket opcodes/client.json (npcCommand2 203)');
    } else {
        console.log('rsc-socket opcodes/client.json (npcCommand2) already patched');
    }

    const decodersPath = require.resolve(base + 'server/decoders.js');
    let dec = fs.readFileSync(decodersPath, 'utf8');

    if (!dec.includes('npcCommand2:')) {
        const anchor = '    npcCommand: getIndexShort,\n';
        if (!dec.includes(anchor)) {
            throw new Error('socket-npc-command2: npcCommand decoder anchor not found');
        }
        dec = dec.replace(anchor, anchor + '    npcCommand2: getIndexShort, // [vita patch] OpenRSC NPC_COMMAND2\n');
        fs.writeFileSync(decodersPath, dec);
        console.log('patched rsc-socket server/decoders.js (npcCommand2)');
    } else {
        console.log('rsc-socket server/decoders.js (npcCommand2) already patched');
    }
};
