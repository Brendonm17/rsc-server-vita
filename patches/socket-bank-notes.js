// patch rsc-socket to carry a bank-notes flag on the wire when the world runs
// bank notes (flag in src/notes-flag.js); also fixes duelConfirmOpen
const fs = require('fs');
const path = require('path');

function replaceOnce(src, from, to, label) {
    const at = src.indexOf(from);

    if (at === -1) {
        throw new Error('socket-bank-notes: anchor not found: ' + label);
    }

    return src.slice(0, at) + to + src.slice(at + from.length);
}

module.exports = function patchRscSocketBankNotes() {
    const base = '@2003scape/rsc-socket/src/';
    const encodersPath = require.resolve(base + 'server/encoders.js');
    const flagPath = path.join(path.dirname(encodersPath), '..', 'notes-flag.js');

    if (!fs.existsSync(flagPath)) {
        fs.writeFileSync(
            flagPath,
            '// [vita patch] does this world run bank notes? (set by the server at boot)\n' +
                'module.exports = { wantBankNotes: false };\n'
        );
        console.log('wrote rsc-socket src/notes-flag.js');
    }

    let enc = fs.readFileSync(encodersPath, 'utf8');

    if (!enc.includes('notes-flag')) {
        enc = "const notesFlag = require('../notes-flag'); // [vita patch] bank notes\n" + enc;

        enc = replaceOnce(
            enc,
            'function writeTransactionItems(packet, items) {\n' +
                '    packet.writeByte(items.length);\n' +
                '\n' +
                '    for (const { id, amount = 1 } of items) {\n' +
                '        packet.writeShort(id).writeInt(amount);\n' +
                '    }\n' +
                '}',
            'function writeTransactionItems(packet, items) {\n' +
                '    packet.writeByte(items.length);\n' +
                '\n' +
                '    for (const { id, amount = 1, noted } of items) {\n' +
                '        packet.writeShort(id);\n' +
                '\n' +
                '        if (notesFlag.wantBankNotes) {\n' +
                '            packet.writeByte(noted ? 1 : 0);\n' +
                '        }\n' +
                '\n' +
                '        packet.writeInt(amount);\n' +
                '    }\n' +
                '}',
            'writeTransactionItems'
        );

        enc = replaceOnce(
            enc,
            '        writeTransactionItems(duel.opponentItems);\n' +
                '        writeTransactionItems(duel.items);',
            '        writeTransactionItems(packet, duel.opponentItems);\n' +
                '        writeTransactionItems(packet, duel.items);',
            'duelConfirmOpen'
        );

        enc = replaceOnce(
            enc,
            '        for (const item of opponentItems) {\n' +
                '            packet.writeShort(item.id).writeInt(item.amount);\n' +
                '        }',
            '        for (const item of opponentItems) {\n' +
                '            packet.writeShort(item.id);\n' +
                '\n' +
                '            if (notesFlag.wantBankNotes) {\n' +
                '                packet.writeByte(item.noted ? 1 : 0);\n' +
                '            }\n' +
                '\n' +
                '            packet.writeInt(item.amount);\n' +
                '        }',
            'duelUpdate'
        );

        enc = replaceOnce(
            enc,
            '        for (const { id, amount, equipped } of items) {\n' +
                '            packet\n' +
                '                .writeShort(id + (equipped ? 32768 : 0));\n' +
                '\n' +
                '            if (typeof amount === \'number\') {',
            '        for (const { id, amount, equipped, noted } of items) {\n' +
                '            packet\n' +
                '                .writeShort(id + (equipped ? 32768 : 0));\n' +
                '\n' +
                '            if (notesFlag.wantBankNotes) {\n' +
                '                packet.writeByte(noted ? 1 : 0);\n' +
                '            }\n' +
                '\n' +
                '            if (typeof amount === \'number\') {',
            'inventoryItems'
        );

        enc = replaceOnce(
            enc,
            '    inventoryItemUpdate(packet, { index, id, amount, equipped }) {\n' +
                '        packet\n' +
                '            .writeByte(index)\n' +
                '            .writeShort(id + (equipped ? 32768 : 0));\n',
            '    inventoryItemUpdate(packet, { index, id, amount, equipped, noted }) {\n' +
                '        packet\n' +
                '            .writeByte(index)\n' +
                '            .writeShort(id + (equipped ? 32768 : 0));\n' +
                '\n' +
                '        if (notesFlag.wantBankNotes) {\n' +
                '            packet.writeByte(noted ? 1 : 0);\n' +
                '        }\n',
            'inventoryItemUpdate'
        );

        enc = replaceOnce(
            enc,
            '    regionGroundItems(packet, { removing, adding }) {\n' +
                '        for (const { id, x, y } of removing) {\n' +
                '            packet\n' +
                '                .writeShort(id + 32768)\n' +
                '                .writeByte(x)\n' +
                '                .writeByte(y);\n' +
                '        }\n' +
                '\n' +
                '        for (const { id, x, y } of adding) {\n' +
                '            packet.writeShort(id).writeByte(x).writeByte(y);\n' +
                '        }\n' +
                '    },',
            '    regionGroundItems(packet, { removing, adding }) {\n' +
                '        for (const { id, x, y, noted } of removing) {\n' +
                '            packet\n' +
                '                .writeShort(id + 32768)\n' +
                '                .writeByte(x)\n' +
                '                .writeByte(y);\n' +
                '\n' +
                '            if (notesFlag.wantBankNotes) {\n' +
                '                packet.writeByte(noted ? 1 : 0);\n' +
                '            }\n' +
                '        }\n' +
                '\n' +
                '        for (const { id, x, y, noted } of adding) {\n' +
                '            packet.writeShort(id).writeByte(x).writeByte(y);\n' +
                '\n' +
                '            if (notesFlag.wantBankNotes) {\n' +
                '                packet.writeByte(noted ? 1 : 0);\n' +
                '            }\n' +
                '        }\n' +
                '    },',
            'regionGroundItems'
        );

        fs.writeFileSync(encodersPath, enc);
        console.log('patched rsc-socket server/encoders.js (bank notes)');
    } else {
        console.log('rsc-socket server/encoders.js (bank notes) already patched');
    }

    const decodersPath = require.resolve(base + 'server/decoders.js');
    let dec = fs.readFileSync(decodersPath, 'utf8');

    if (!dec.includes('notes-flag')) {
        dec = "const notesFlag = require('../notes-flag'); // [vita patch] bank notes\n" + dec;

        dec = replaceOnce(
            dec,
            '    for (let i = 0; i < length; i += 1) {\n' +
                '        const id = packet.getShort();\n' +
                '        const amount = packet.getInt();\n' +
                '        items.push({ id, amount });\n' +
                '    }',
            '    for (let i = 0; i < length; i += 1) {\n' +
                '        const id = packet.getShort();\n' +
                '        const amount = packet.getInt();\n' +
                '        // PayloadCustomParser: a u16 noted per offered item\n' +
                '        const noted = notesFlag.wantBankNotes ? packet.getShort() === 1 : false;\n' +
                '        items.push({ id, amount, noted });\n' +
                '    }',
            'getTransactionItemUpdate'
        );

        dec = replaceOnce(
            dec,
            '        if (magic !== MAGIC_BANK_WITHDRAW) {\n' +
                '            throw new Error(`invalid magic bank number: ${magic}`);\n' +
                '        }\n' +
                '\n' +
                '        return { id, amount };',
            '        if (magic !== MAGIC_BANK_WITHDRAW) {\n' +
                '            throw new Error(`invalid magic bank number: ${magic}`);\n' +
                '        }\n' +
                '\n' +
                '        // BankHandler: wantsNotes = payload.noted (trailing byte when the world runs notes)\n' +
                '        const noted = packet.remaining() >= 1 ? packet.getByte() === 1 : false;\n' +
                '\n' +
                '        return { id, amount, noted };',
            'bankWithdraw'
        );

        fs.writeFileSync(decodersPath, dec);
        console.log('patched rsc-socket server/decoders.js (bank notes)');
    } else {
        console.log('rsc-socket server/decoders.js (bank notes) already patched');
    }
};
