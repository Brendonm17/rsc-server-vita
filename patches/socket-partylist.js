// patch rsc-socket encoders: party opcode 116 action 4, the browsable party list
// wire: u16 total, then per party u16 partyId, u8 size, u8 allowsSearchedJoin, i32 points, u16 index
const fs = require('fs');

module.exports = function patchRscSocketPartyList() {
    const encodersPath = require.resolve('@2003scape/rsc-socket/src/server/encoders.js');
    let enc = fs.readFileSync(encodersPath, 'utf8');

    if (enc.includes('} else if (action === 4) {')) {
        console.log('rsc-socket server/encoders.js (party list action 4) already patched');
        return;
    }

    const destructure = '        allowSetting0,\n        allowSetting1\n    }) {\n        packet.writeByte(action);';
    const branch =
        '        } else if (action === 3) {\n' +
        '            packet.writeByte(kickSetting);\n' +
        '            packet.writeByte(inviteSetting);\n' +
        '            packet.writeByte(allowSearchJoin);\n' +
        '            packet.writeByte(allowSetting0);\n' +
        '            packet.writeByte(allowSetting1);\n' +
        '        }';

    if (!enc.includes(destructure) || !enc.includes(branch)) {
        throw new Error('socket-partylist: party encoder anchors not found (is socket-party.js applied?)');
    }

    enc = enc.replace(
        destructure,
        '        allowSetting0,\n        allowSetting1,\n        parties\n    }) {\n        packet.writeByte(action);'
    );
    enc = enc.replace(
        branch,
        branch.slice(0, -1) +
            '} else if (action === 4) {\n' +
            '            // SEND_PARTY_LIST: every party, points desc then name\n' +
            '            packet.writeShort(parties.length);\n' +
            '\n' +
            '            let index = 1;\n' +
            '\n' +
            '            for (const p of parties) {\n' +
            '                packet.writeShort(p.partyId);\n' +
            '                packet.writeByte(p.size);\n' +
            '                packet.writeByte(p.allowsSearchedJoin);\n' +
            '                packet.writeInt(p.points);\n' +
            '                packet.writeShort(index++);\n' +
            '            }\n' +
            '        }'
    );

    fs.writeFileSync(encodersPath, enc);
    console.log('patched rsc-socket server/encoders.js (party list action 4)');
};
