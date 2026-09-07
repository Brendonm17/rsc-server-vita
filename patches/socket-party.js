// party wire patch: extend the opcode-116 party encoder (settings action 3 and
// real per-member status bytes) and the decoder (rank_player 6, party_settings 7)
const fs = require('fs');

module.exports = function patchRscSocketParty2() {
    const base = '@2003scape/rsc-socket/src/';

    const encodersPath = require.resolve(base + 'server/encoders.js');
    let enc = fs.readFileSync(encodersPath, 'utf8');

    if (!enc.includes('member.dead ? 1 : 0')) {
        // action 0 per-member bytes: rank, online, curHits, maxHits, combatLvl, skulled, dead, shareLoot, total (party size), inCombat, shareExp, then two i64 zeroes (shareExp2)
        // action 3 settings: 3 settings + 2 viewer allow-flags, 5 bytes, no header byte
        const original =
            '    party(packet, { action, leader, isLeader, members, from, partyName }) {\n' +
            '        packet.writeByte(action);\n' +
            '\n' +
            '        if (action === 0) {\n' +
            '            packet.writeString(leader);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeByte(isLeader ? 1 : 0);\n' +
            '            packet.writeByte(members.length);\n' +
            '\n' +
            '            for (const member of members) {\n' +
            '                packet.writeString(member.username);\n' +
            '                packet.writeByte(10);\n' +
            '                packet.writeBytes([\n' +
            '                    member.rank,\n' +
            '                    1,\n' +
            '                    member.currentHealth,\n' +
            '                    member.maxHealth,\n' +
            '                    member.combatLevel,\n' +
            '                    member.skulled ? 1 : 0,\n' +
            '                    0,\n' +
            '                    0,\n' +
            '                    0,\n' +
            '                    member.inCombat ? 1 : 0,\n' +
            '                    1\n' +
            '                ]);\n' +
            '                packet.writeInt(0);\n' +
            '                packet.writeInt(0);\n' +
            '            }\n' +
            '        } else if (action === 2) {\n' +
            '            packet.writeString(from);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeString(partyName);\n' +
            '            packet.writeByte(10);\n' +
            '        }\n' +
            '    },';
        const replacement =
            '    party(packet, {\n' +
            '        action,\n' +
            '        leader,\n' +
            '        isLeader,\n' +
            '        members,\n' +
            '        from,\n' +
            '        partyName,\n' +
            '        kickSetting,\n' +
            '        inviteSetting,\n' +
            '        allowSearchJoin,\n' +
            '        allowSetting0,\n' +
            '        allowSetting1\n' +
            '    }) {\n' +
            '        packet.writeByte(action);\n' +
            '\n' +
            '        if (action === 0) {\n' +
            '            packet.writeString(leader);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeByte(isLeader ? 1 : 0);\n' +
            '            packet.writeByte(members.length);\n' +
            '\n' +
            '            for (const member of members) {\n' +
            '                packet.writeString(member.username);\n' +
            '                packet.writeByte(10);\n' +
            '                packet.writeBytes([\n' +
            '                    member.rank,\n' +
            '                    member.online ? 1 : 0,\n' +
            '                    member.currentHealth,\n' +
            '                    member.maxHealth,\n' +
            '                    member.combatLevel,\n' +
            '                    member.skulled ? 1 : 0,\n' +
            '                    member.dead ? 1 : 0,\n' +
            '                    member.shareLoot ? 1 : 0,\n' +
            '                    member.total,\n' +
            '                    member.inCombat ? 1 : 0,\n' +
            '                    member.shareExp ? 1 : 0\n' +
            '                ]);\n' +
            '                packet.writeInt(0);\n' +
            '                packet.writeInt(0);\n' +
            '            }\n' +
            '        } else if (action === 2) {\n' +
            '            packet.writeString(from);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeString(partyName);\n' +
            '            packet.writeByte(10);\n' +
            '        } else if (action === 3) {\n' +
            '            packet.writeByte(kickSetting);\n' +
            '            packet.writeByte(inviteSetting);\n' +
            '            packet.writeByte(allowSearchJoin);\n' +
            '            packet.writeByte(allowSetting0);\n' +
            '            packet.writeByte(allowSetting1);\n' +
            '        }\n' +
            '    },';

        if (enc.includes(original)) {
            enc = enc.replace(original, replacement);
            fs.writeFileSync(encodersPath, enc);
            console.log('patched rsc-socket server/encoders.js (party settings action 3, real roster bytes)');
        } else {
            console.log('WARNING: rsc-socket encoders anchor not found for party settings, NOT patched');
        }
    } else {
        console.log('rsc-socket server/encoders.js (party settings) already patched');
    }

    const decodersPath = require.resolve(base + 'server/decoders.js');
    let dec = fs.readFileSync(decodersPath, 'utf8');

    if (!dec.includes('sub === 12 && (action === 6')) {
        // rank_player(6): a name field then a raw rank byte
        // party_settings(7): a setting byte, then a state byte when the setting is 0-3
        const decAnchor = '        if (sub === 12 && action === 2) {';
        const decInsert =
            '        if (sub === 12 && (action === 6 || action === 7)) {\n' +
            '            const readField = () => {\n' +
            '                const start = packet.offset;\n' +
            '                let end = start;\n' +
            '\n' +
            '                while (end < packet.buffer.length && packet.buffer[end] !== 10) {\n' +
            '                    end += 1;\n' +
            '                }\n' +
            '\n' +
            "                packet.offset = end < packet.buffer.length ? end + 1 : end;\n" +
            "                return packet.buffer.slice(start, end).toString('ascii');\n" +
            '            };\n' +
            '\n' +
            '            if (action === 6) {\n' +
            '                return { sub, action, name: readField(), rank: packet.getByte() };\n' +
            '            }\n' +
            '\n' +
            '            const setting = packet.getByte();\n' +
            '            const state = setting >= 0 && setting <= 3 ? packet.getByte() : undefined;\n' +
            '            return { sub, action, setting, state };\n' +
            '        }\n' +
            '\n' +
            '        if (sub === 12 && action === 2) {';

        if (dec.includes(decAnchor)) {
            dec = dec.replace(decAnchor, decInsert);
            fs.writeFileSync(decodersPath, dec);
            console.log('patched rsc-socket server/decoders.js (interfaceOptions party sub 12 actions 6/7)');
        } else {
            console.log('WARNING: rsc-socket decoders anchor not found for party settings/rank, NOT patched');
        }
    } else {
        console.log('rsc-socket server/decoders.js (party settings/rank) already patched');
    }
};
