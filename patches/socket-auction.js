// patch @2003scape/rsc-socket for openrsc's auction house wire. server opcode
// 132 'auction': u8 packetType, 0 = reset the list, 1 = u16 count x {auctionID
// i32, catalogID i32, amountLeft i32, price i32, isMine u8 (1 = no seller
// string; else newline(10)-terminated seller name), hoursLeft u8}. client 199
// sub-op 10 'AUCTION': action byte, then BUY(0)+id+amount, CREATE(1)+id+amount
// +price, ABORT(2)+id, REFRESH(3)/CLOSE(4) no payload, DELETE(5)+id. ints only.
const fs = require('fs');

function patchRscSocketAuction() {
    const base = '@2003scape/rsc-socket/src/';

    const serverOpsPath = require.resolve(base + 'opcodes/server.json');
    const serverOps = JSON.parse(fs.readFileSync(serverOpsPath, 'utf8'));
    if (!('auction' in serverOps)) {
        serverOps.auction = 132;
        fs.writeFileSync(
            serverOpsPath,
            JSON.stringify(serverOps, null, 4) + '\n'
        );
        console.log('patched rsc-socket opcodes/server.json (auction 132)');
    }

    // client.json already carries interfaceOptions 199.

    const encodersPath = require.resolve(base + 'server/encoders.js');
    let enc = fs.readFileSync(encodersPath, 'utf8');
    if (!enc.includes('auction(packet')) {
        const encoder =
            ',\n\n' +
            '    // [vita patch] OpenRSC auction house listings (OpenMarketTask.java\n' +
            '    // verbatim). action 0 = reset the client-side list, 1 = append a\n' +
            '    // chunk of up to 200 rows (auctionID/catalogID/amountLeft/price/\n' +
            '    // isMine, then the seller name UNLESS isMine -- the client fills its\n' +
            '    // own name in for its own rows -- then hoursLeft).\n' +
            '    auction(packet, { action, items }) {\n' +
            '        packet.writeByte(action);\n' +
            '\n' +
            '        if (action !== 1) {\n' +
            '            return;\n' +
            '        }\n' +
            '\n' +
            '        packet.writeShort(items.length);\n' +
            '\n' +
            '        for (const item of items) {\n' +
            '            packet\n' +
            '                .writeInt(item.auctionID)\n' +
            '                .writeInt(item.catalogID)\n' +
            '                .writeInt(item.amountLeft)\n' +
            '                .writeInt(item.price)\n' +
            '                .writeByte(item.isMine ? 1 : 0);\n' +
            '\n' +
            '            if (!item.isMine) {\n' +
            '                packet.writeString(item.sellerName);\n' +
            '                packet.writeByte(10);\n' +
            '            }\n' +
            '\n' +
            '            packet.writeByte(item.hoursLeft);\n' +
            '        }\n' +
            '    }\n';
        const encAnchor = '\n};\n\nmodule.exports = encoders;';
        if (enc.includes(encAnchor)) {
            enc = enc.replace(
                encAnchor,
                encoder + '};\n\nmodule.exports = encoders;'
            );
            fs.writeFileSync(encodersPath, enc);
            console.log('patched rsc-socket server/encoders.js (auction)');
        } else {
            console.log(
                'WARNING: rsc-socket encoders anchor not found, NOT patched (auction)'
            );
        }
    }

    const decodersPath = require.resolve(base + 'server/decoders.js');
    let dec = fs.readFileSync(decodersPath, 'utf8');
    if (!dec.includes('sub === 10')) {
        const auctionBranch =
            '        if (sub === 10) {\n' +
            '            // [vita patch] AUCTION family (InterfaceOptions.java AUCTION=10 /\n' +
            '            // AuctionOptions.java): BUY(0)+id+amount, CREATE(1)+id+amount+price,\n' +
            '            // ABORT(2)+id, REFRESH(3)/CLOSE(4) no payload, DELETE(5)+id. Verified\n' +
            '            // against rsc-c src/ui/auction.c -- ints only, no strings.\n' +
            '            if (action === 0 || action === 1 || action === 2 || action === 5) {\n' +
            '                const id = packet.getInt();\n' +
            '                const amount =\n' +
            '                    action === 0 || action === 1\n' +
            '                        ? packet.getInt()\n' +
            '                        : undefined;\n' +
            '                const price = action === 1 ? packet.getInt() : undefined;\n' +
            '\n' +
            '                return { sub, action, id, amount, price };\n' +
            '            }\n' +
            '\n' +
            '            return { sub, action };\n' +
            '        }\n' +
            '\n';
        const decAnchor =
            '        if (sub === 12 && action === 2) {\n' +
            '            return { sub, action, index: packet.getShort() };\n' +
            '        }\n' +
            '\n' +
            '        let name = \'\';';
        if (dec.includes(decAnchor)) {
            dec = dec.replace(
                decAnchor,
                '        if (sub === 12 && action === 2) {\n' +
                    '            return { sub, action, index: packet.getShort() };\n' +
                    '        }\n' +
                    '\n' +
                    auctionBranch +
                    '        let name = \'\';'
            );
            fs.writeFileSync(decodersPath, dec);
            console.log('patched rsc-socket server/decoders.js (auction)');
        } else {
            console.log(
                'WARNING: rsc-socket decoders anchor not found, NOT patched (auction)'
            );
        }
    }
}

module.exports = patchRscSocketAuction;
