// re-applies local node_modules perf patches (idempotent). @misterhat/easystarjs: drop the cost-map prime loop in
// setGrid, default a missing type to 1 in getTileCost
const fs = require('fs');

function patchEasystar() {
    const p = require.resolve('@misterhat/easystarjs/src/easystar.js');
    let s = fs.readFileSync(p, 'utf8');
    let changed = false;

    // 1. getTileCost: default a missing tile type to cost 1.
    if (s.includes('costMap[getTileAt(x, y)];')) {
        s = s.replace(
            'costMap[getTileAt(x, y)];',
            'costMap[getTileAt(x, y)] || 1;'
        );
        changed = true;
    }

    // 2. Remove the exhaustive cost-map prime loop in setGrid.
    const loop =
        '        //Setup cost map\n' +
        '        for (var y = 0; y < gridHeight; y++) {\n' +
        '            for (var x = 0; x < gridWidth; x++) {\n' +
        '                if (!costMap[getTileAt(x, y)]) {\n' +
        '                    costMap[getTileAt(x, y)] = 1;\n' +
        '                }\n' +
        '            }\n' +
        '        }\n';
    if (s.includes(loop)) {
        s = s.replace(
            loop,
            '        // [vita patch] cost-map prime loop removed; getTileCost defaults to 1.\n'
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(p, s);
        console.log('patched @misterhat/easystarjs (cost-map loop removed)');
    } else {
        console.log('@misterhat/easystarjs already patched');
    }
}

// @2003scape/rsc-socket: tradeRecipientStatus destructures { accepted } for the accepted byte, like tradeStatus
function patchRscSocket() {
    const p = require.resolve('@2003scape/rsc-socket/src/server/encoders.js');
    let s = fs.readFileSync(p, 'utf8');

    if (s.includes('tradeRecipientStatus(packet, accepted) {')) {
        s = s.replace(
            'tradeRecipientStatus(packet, accepted) {',
            'tradeRecipientStatus(packet, { accepted }) {'
        );
        fs.writeFileSync(p, s);
        console.log('patched @2003scape/rsc-socket (tradeRecipientStatus encoder)');
    } else {
        console.log('@2003scape/rsc-socket already patched');
    }
}

// @2003scape/rsc-data shops.json fixes: hicktons-archery -> Oak Shortbow(649)/Oak Longbow(648); shantay-pass ->
// feathers
function patchRscDataShops() {
    const p = require.resolve('@2003scape/rsc-data/shops.json');
    const shops = JSON.parse(fs.readFileSync(p, 'utf8'));
    const items = JSON.parse(
        fs.readFileSync(require.resolve('@2003scape/rsc-data/config/items.json'), 'utf8')
    );
    const featherID = items.findIndex((i) => i && /^feather$/i.test(i.name));
    let changed = false;

    const hickton = shops['hicktons-archery'];
    if (hickton) {
        const rows = hickton.items;
        // fix the trailing duplicates only (leave the legitimate 188/189 rows)
        for (let i = rows.length - 1; i >= 0; i -= 1) {
            const dupShort = rows.findIndex((r) => r.id === 189);
            const dupLong = rows.findIndex((r) => r.id === 188);
            if (i !== dupShort && rows[i].id === 189) {
                rows[i].id = 649; // Oak Shortbow
                changed = true;
            } else if (i !== dupLong && rows[i].id === 188) {
                rows[i].id = 648; // Oak Longbow
                changed = true;
            }
        }
    }

    const shantay = shops['shantay-pass'];
    if (shantay && featherID > 0) {
        for (const row of shantay.items) {
            if (row.id === 148) {
                row.id = featherID;
                changed = true;
            }
        }
    }

    // fishing-guild (FishingGuildShop.java): 148 leather -> feather; second 553 row -> 552; 370 -> 369 (raw
    // swordfish)
    const fishingGuild = shops['fishing-guild'];
    if (fishingGuild) {
        let seen553 = 0;
        for (const row of fishingGuild.items) {
            if (row.id === 148 && featherID > 0) {
                row.id = featherID;
                changed = true;
            } else if (row.id === 553) {
                seen553 += 1;
                if (seen553 === 2) {
                    row.id = 552;
                    changed = true;
                }
            } else if (row.id === 370) {
                row.id = 369;
                changed = true;
            }
        }
    }

    // frenitas-cooking (Frenita.java): 23 flour-heap -> 136 pot of flour.
    const frenita = shops['frenitas-cooking'];
    if (frenita) {
        for (const row of frenita.items) {
            if (row.id === 23) {
                row.id = 136;
                changed = true;
            }
        }
    }

    // entrana-herblaw (FrincosVialShopEntrana.java): 464 vial-of-water -> 465
    // empty vial.
    const frincos = shops['entrana-herblaw'];
    if (frincos) {
        for (const row of frincos.items) {
            if (row.id === 464) {
                row.id = 465;
                changed = true;
            }
        }
    }

    // gruds-herblaw-stall (GrudsHerblawStall.java): 464 -> 465 (empty vial).
    const gruds = shops['gruds-herblaw-stall'];
    if (gruds) {
        for (const row of gruds.items) {
            if (row.id === 464) {
                row.id = 465;
                changed = true;
            }
        }
    }

    // valaines-shop-of-champions (Valaine.java): 272 Bluedye -> 229 Blue Cape; general flag true
    const valaine = shops['valaines-shop-of-champions'];
    if (valaine) {
        for (const row of valaine.items) {
            if (row.id === 272) {
                row.id = 229;
                changed = true;
            }
        }
        if (valaine.general !== true) {
            valaine.general = true;
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(p, JSON.stringify(shops, null, 4));
        console.log('patched @2003scape/rsc-data shops (hickton oak bows, shantay feathers)');
    } else {
        console.log('@2003scape/rsc-data shops already patched');
    }
}

// @2003scape/rsc-path-finder: addWallObject() skips an undefined wallObjects[id] like an out-of-bounds coord (no
// pathfinder obstacle); distinct skipped ids logged once
function patchPathFinder() {
    const p = require.resolve('@2003scape/rsc-path-finder/src/index.js');
    let s = fs.readFileSync(p, 'utf8');

    const anchor =
        '        const wallObjectDef = this.wallObjects[id];\n';
    const guard =
        '        const wallObjectDef = this.wallObjects[id];\n\n' +
        '        // [vita patch] skip an unknown wall-object id instead of throwing\n' +
        '        // on the undefined .blocked read below (would abort world init).\n' +
        '        if (!wallObjectDef) {\n' +
        '            if (!this.__missingWallIds) this.__missingWallIds = new Set();\n' +
        '            if (!this.__missingWallIds.has(id)) {\n' +
        '                this.__missingWallIds.add(id);\n' +
        "                try { console.warn('[vita] pathfinder: skipped unknown wall-object id ' + id); } catch (e) {}\n" +
        '            }\n' +
        '            return;\n' +
        '        }\n';

    if (s.includes('[vita patch] skip an unknown wall-object id')) {
        console.log('@2003scape/rsc-path-finder already patched');
        return;
    }

    if (s.includes(anchor)) {
        s = s.replace(anchor, guard);
        fs.writeFileSync(p, s);
        console.log('patched @2003scape/rsc-path-finder (addWallObject unknown-id guard)');
    } else {
        console.log('WARNING: @2003scape/rsc-path-finder addWallObject anchor not found, NOT patched');
    }
}

// browserify: emit .json modules as module.exports=JSON.parse("...") instead of an object literal
function patchBrowserifyJson() {
    const p = require.resolve('browserify/index.js');
    let s = fs.readFileSync(p, 'utf8');

    const anchor = "row.source = 'module.exports=' + sanitizedString;";
    const replacement =
        "row.source = 'module.exports=JSON.parse(' + " +
        'JSON.stringify(JSON.stringify(JSON.parse(sanitizedString))) + ' +
        "');'; // [vita patch] native-parse JSON modules";

    if (s.includes('[vita patch] native-parse JSON modules')) {
        console.log('browserify already patched');
        return;
    }

    if (s.includes(anchor)) {
        s = s.replace(anchor, replacement);
        fs.writeFileSync(p, s);
        console.log('patched browserify (.json modules -> JSON.parse strings)');
    } else {
        console.log('WARNING: browserify _json anchor not found, NOT patched');
    }
}

// @2003scape/rsc-socket party wire: server 116 "party" (roster snapshot/clear/invite popup), client 199
// "interfaceOptions" (party action family); strings are newline(10)-terminated
function patchRscSocketParty() {
    const base = '@2003scape/rsc-socket/src/';

    const serverOpsPath = require.resolve(base + 'opcodes/server.json');
    const serverOps = JSON.parse(fs.readFileSync(serverOpsPath, 'utf8'));
    if (!('party' in serverOps) || !('npcKills' in serverOps)) {
        serverOps.party = 116;
        serverOps.npcKills = 147;
        fs.writeFileSync(
            serverOpsPath,
            JSON.stringify(serverOps, null, 4) + '\n'
        );
        console.log('patched rsc-socket opcodes/server.json (party 116, npcKills 147)');
    }

    const clientOpsPath = require.resolve(base + 'opcodes/client.json');
    const clientOps = JSON.parse(fs.readFileSync(clientOpsPath, 'utf8'));
    if (!('interfaceOptions' in clientOps)) {
        clientOps.interfaceOptions = 199;
        fs.writeFileSync(
            clientOpsPath,
            JSON.stringify(clientOps, null, 4) + '\n'
        );
        console.log('patched rsc-socket opcodes/client.json (interfaceOptions 199)');
    }

    const encodersPath0 = require.resolve(base + 'server/encoders.js');
    let enc0 = fs.readFileSync(encodersPath0, 'utf8');
    if (!enc0.includes('npcKills(packet')) {
        const killsEncoder =
            ',\n\n' +
            '    // [vita patch] kill counters for the side-menu HUD: lifetime\n' +
            '    // total, most-recent npc id, kills of that npc (3x i32)\n' +
            '    npcKills(packet, { total, recentId, recentCount }) {\n' +
            '        packet.writeInt(total);\n' +
            '        packet.writeInt(recentId);\n' +
            '        packet.writeInt(recentCount);\n' +
            '    }\n';
        const encAnchor0 = '\n};\n\nmodule.exports = encoders;';
        if (enc0.includes(encAnchor0)) {
            enc0 = enc0.replace(encAnchor0, killsEncoder + '};\n\nmodule.exports = encoders;');
            fs.writeFileSync(encodersPath0, enc0);
            console.log('patched rsc-socket server/encoders.js (npcKills)');
        } else {
            console.log('WARNING: rsc-socket encoders anchor not found for npcKills');
        }
    }

    const encodersPath = require.resolve(base + 'server/encoders.js');
    let enc = fs.readFileSync(encodersPath, 'utf8');
    if (!enc.includes('party(packet')) {
        const encoder =
            ',\n\n' +
            '    // [vita patch] co-op party sync in the shape the client parses for\n' +
            '    // custom online worlds. action 0 = roster snapshot (leader, isLeader,\n' +
            '    // size, then per member: name + 11 status bytes {rank, online, curHits,\n' +
            '    // maxHits, combatLvl, skulled, dead, shareLoot, total, inCombat,\n' +
            '    // shareExp} + unused i64), 1 = left/cleared, 2 = invite popup.\n' +
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
            '    }\n';
        const encAnchor = '\n};\n\nmodule.exports = encoders;';
        if (enc.includes(encAnchor)) {
            enc = enc.replace(encAnchor, encoder + '};\n\nmodule.exports = encoders;');
            fs.writeFileSync(encodersPath, enc);
            console.log('patched rsc-socket server/encoders.js (party)');
        } else {
            console.log('WARNING: rsc-socket encoders anchor not found, NOT patched');
        }
    }

    const decodersPath = require.resolve(base + 'server/decoders.js');
    let dec = fs.readFileSync(decodersPath, 'utf8');
    if (!dec.includes('interfaceOptions(packet)')) {
        const decoder =
            ',\n\n' +
            '    // [vita patch] custom interface options from the co-op client. Only\n' +
            '    // the party family (sub 12) exists on this wire; action 2 carries a\n' +
            '    // u16 player index, the string actions a newline-terminated name.\n' +
            '    interfaceOptions(packet) {\n' +
            '        const sub = packet.getByte();\n' +
            '        const action = packet.getByte();\n' +
            '\n' +
            '        if (sub === 12 && action === 2) {\n' +
            '            return { sub, action, index: packet.getShort() };\n' +
            '        }\n' +
            '\n' +
            '        let name = \'\';\n' +
            '\n' +
            '        if (packet.remaining() > 0) {\n' +
            '            name = packet.getString().split(\'\\n\')[0];\n' +
            '        }\n' +
            '\n' +
            '        return { sub, action, name };\n' +
            '    }\n';
        const decAnchor = '\n};\n\nmodule.exports = decoders;';
        if (dec.includes(decAnchor)) {
            dec = dec.replace(decAnchor, decoder + '};\n\nmodule.exports = decoders;');
            fs.writeFileSync(decodersPath, dec);
            console.log('patched rsc-socket server/decoders.js (interfaceOptions)');
        } else {
            console.log('WARNING: rsc-socket decoders anchor not found, NOT patched');
        }
    }
}

patchEasystar();
patchRscSocket();
patchRscSocketParty();
patchRscDataShops();
patchPathFinder();
patchBrowserifyJson();
