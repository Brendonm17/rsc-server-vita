// patch rsc-socket for the clan wire: server opcode 112 (clan / clanList /
// clanSettings) and client 199 sub 11 (interface options)
const fs = require('fs');

module.exports = function patchRscSocketClan() {
    const base = '@2003scape/rsc-socket/src/';

    const serverOpsPath = require.resolve(base + 'opcodes/server.json');
    const serverOps = JSON.parse(fs.readFileSync(serverOpsPath, 'utf8'));

    if (!('clan' in serverOps) || !('clanList' in serverOps) || !('clanSettings' in serverOps)) {
        serverOps.clan = 112;
        serverOps.clanList = 112;
        serverOps.clanSettings = 112;
        fs.writeFileSync(serverOpsPath, JSON.stringify(serverOps, null, 4) + '\n');
        console.log('patched rsc-socket opcodes/server.json (clan/clanList/clanSettings 112)');
    } else {
        console.log('rsc-socket opcodes/server.json (clan) already patched');
    }

    // interfaceOptions (199) is already added by patchRscSocketParty before this runs
    const clientOpsPath = require.resolve(base + 'opcodes/client.json');
    const clientOps = JSON.parse(fs.readFileSync(clientOpsPath, 'utf8'));

    if (!('interfaceOptions' in clientOps)) {
        clientOps.interfaceOptions = 199;
        fs.writeFileSync(clientOpsPath, JSON.stringify(clientOps, null, 4) + '\n');
        console.log('patched rsc-socket opcodes/client.json (interfaceOptions 199)');
    }

    const encodersPath = require.resolve(base + 'server/encoders.js');
    let enc = fs.readFileSync(encodersPath, 'utf8');

    if (!enc.includes('clanSettings(packet')) {
        // clan/clanList/clanSettings encoders; strings are newline(10)-terminated
        const encoder =
            ',\n\n' +
            "    // [vita patch] clan roster/leave/invite-popup (ActionSender.sendClan\n" +
            '    // / sendLeaveClan / sendClanInvitationGUI). action 0 = full roster\n' +
            '    // snapshot (name, tag, leader, isLeader, size, then per member: name +\n' +
            '    // rank + online), 1 = left/cleared (no body), 2 = invite popup\n' +
            '    // (inviter, clan name).\n' +
            '    clan(packet, { action, clanName, clanTag, leaderName, isLeader, members, inviter }) {\n' +
            '        packet.writeByte(action);\n' +
            '\n' +
            '        if (action === 0) {\n' +
            '            packet.writeString(clanName);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeString(clanTag);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeString(leaderName);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeByte(isLeader ? 1 : 0);\n' +
            '            packet.writeByte(members.length);\n' +
            '\n' +
            '            for (const member of members) {\n' +
            '                packet.writeString(member.username);\n' +
            '                packet.writeByte(10);\n' +
            '                packet.writeByte(member.rank);\n' +
            '                packet.writeByte(member.online ? 1 : 0);\n' +
            '            }\n' +
            '        } else if (action === 2) {\n' +
            '            packet.writeString(inviter);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeString(clanName);\n' +
            '            packet.writeByte(10);\n' +
            '        }\n' +
            '    },\n' +
            '\n' +
            '    // [vita patch] clan browse list (ActionSender.sendClans), sorted by\n' +
            '    // the caller (clan points desc, name asc -- ClanManager.CLAN_COMPERATOR).\n' +
            '    clanList(packet, { clans }) {\n' +
            '        packet.writeByte(4);\n' +
            '        packet.writeShort(clans.length);\n' +
            '\n' +
            '        let position = 0;\n' +
            '\n' +
            '        for (const c of clans) {\n' +
            '            position += 1;\n' +
            '            packet.writeShort(c.id);\n' +
            '            packet.writeString(c.name);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeString(c.tag);\n' +
            '            packet.writeByte(10);\n' +
            '            packet.writeByte(c.size);\n' +
            '            packet.writeByte(c.allowSearchJoin);\n' +
            '            packet.writeInt(c.points);\n' +
            '            packet.writeShort(position);\n' +
            '        }\n' +
            '    },\n' +
            '\n' +
            '    // [vita patch] clan settings (ActionSender.sendClanSetting): a fixed\n' +
            '    // magic-number-3 header the client uses to tell this apart from the\n' +
            '    // other two structs sharing opcode 112.\n' +
            '    clanSettings(packet, { kickSetting, inviteSetting, allowSearchJoin, allowSetting0, allowSetting1 }) {\n' +
            '        packet.writeByte(3);\n' +
            '        packet.writeByte(kickSetting);\n' +
            '        packet.writeByte(inviteSetting);\n' +
            '        packet.writeByte(allowSearchJoin);\n' +
            '        packet.writeByte(allowSetting0);\n' +
            '        packet.writeByte(allowSetting1);\n' +
            '    }\n';
        const encAnchor = '\n};\n\nmodule.exports = encoders;';

        if (enc.includes(encAnchor)) {
            enc = enc.replace(encAnchor, encoder + '};\n\nmodule.exports = encoders;');
            fs.writeFileSync(encodersPath, enc);
            console.log('patched rsc-socket server/encoders.js (clan/clanList/clanSettings)');
        } else {
            console.log('WARNING: rsc-socket encoders anchor not found for clan, NOT patched');
        }
    } else {
        console.log('rsc-socket server/encoders.js (clan) already patched');
    }

    const decodersPath = require.resolve(base + 'server/decoders.js');
    let dec = fs.readFileSync(decodersPath, 'utf8');

    if (!dec.includes('sub === 11')) {
        // clan interface-option decoder. readField reads one newline(10)-terminated
        // string at the current offset, so multiple fields can follow a string
        const decAnchor =
            '        const action = packet.getByte();\n' +
            '\n' +
            '        if (sub === 12 && action === 2) {';
        const decInsert =
            '        const action = packet.getByte();\n' +
            '\n' +
            '        if (sub === 11) {\n' +
            '            const readField = () => {\n' +
            '                const start = packet.offset;\n' +
            '                let end = start;\n' +
            '\n' +
            '                while (end < packet.buffer.length && packet.buffer[end] !== 10) {\n' +
            '                    end += 1;\n' +
            '                }\n' +
            '\n' +
            '                packet.offset = end < packet.buffer.length ? end + 1 : end;\n' +
            '                return packet.buffer.slice(start, end).toString(\'ascii\');\n' +
            '            };\n' +
            '\n' +
            '            switch (action) {\n' +
            '                case 0:\n' +
            '                    return { sub, action, name: readField(), tag: readField() };\n' +
            '                case 2:\n' +
            '                case 5:\n' +
            '                    return { sub, action, name: readField() };\n' +
            '                case 6:\n' +
            '                    return { sub, action, name: readField(), rank: packet.getByte() };\n' +
            '                case 7: {\n' +
            '                    const setting = packet.getByte();\n' +
            '                    const state = setting >= 0 && setting <= 3 ? packet.getByte() : undefined;\n' +
            '                    return { sub, action, setting, state };\n' +
            '                }\n' +
            '                default:\n' +
            '                    return { sub, action };\n' +
            '            }\n' +
            '        }\n' +
            '\n' +
            '        if (sub === 12 && action === 2) {';

        if (dec.includes(decAnchor)) {
            dec = dec.replace(decAnchor, decInsert);
            fs.writeFileSync(decodersPath, dec);
            console.log('patched rsc-socket server/decoders.js (interfaceOptions clan sub 11)');
        } else {
            console.log('WARNING: rsc-socket decoders anchor not found for clan, NOT patched');
        }
    } else {
        console.log('rsc-socket server/decoders.js (clan) already patched');
    }
};
