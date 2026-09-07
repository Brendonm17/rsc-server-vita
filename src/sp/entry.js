// browserify entry for the embedded single-player server bundle.
// installs the single-player performance patches, then hands off to rsc-server's
// browser entry point.

require('./landscape-fast'); // must run before the world loads

// pure-JS sleep-word captcha; QuickJS has no canvas/OffscreenCanvas so
// rsc-captcha's generateImage threw on device
require('./captcha-nocanvas');

// disable bole logging (its Buffer.from on QuickJS throws and desyncs the client)
require('bole').output = () => {};

// report early boot progress
{
    const spb = globalThis.__sp;
    if (spb && spb.setProgress) {
        try { spb.setProgress(15, 'Loading game data'); } catch (e) {}
    }
}

// append custom item defs (ids 1290+)
const customItems = require('./custom-items.json');
const rscItems = require('@2003scape/rsc-data/config/items');
if (rscItems.length === 1290) {
    for (const customItem of customItems) {
        rscItems.push(customItem);
    }
}

const customNpcs = require('./custom-npcs.json');
const rscNpcs = require('@2003scape/rsc-data/config/npcs');
if (rscNpcs.length === 794) {
    for (const customNpc of customNpcs) {
        rscNpcs.push(customNpc);
    }
}

// give bankers a "Bank"/"Collect" right-click and the auction clerk
// "Auction"/"Teleport", from npc-commands.json; command2 arrives as NPC_COMMAND2
{
    const npcCommands = require('./npc-commands.json');
    for (const id of Object.keys(npcCommands)) {
        const def = rscNpcs[Number(id)];
        if (def) {
            def.command = npcCommands[id].command;
            def.command2 = npcCommands[id].command2;
        }
    }
}

// inject 19th skill, altar objects, spawns, plugin, stats encoder
const runecraftData = require('./runecraft-data');

// appends 'runecraft' as skill index 18
const skillNames = require('@2003scape/rsc-data/skill-names');
if (skillNames.length === 18) {
    skillNames.push(runecraftData.SKILL_NAME);
}

// appends runecraft island object defs at ids 1189..1235
const rscObjects = require('@2003scape/rsc-data/config/objects');
if (rscObjects.length === 1189) {
    for (const def of runecraftData.buildAltarDefs()) {
        rscObjects.push(def);
    }
}

// 3) Altar / rune-stone scenery spawns onto locations/objects.
const objectLocations = require('@2003scape/rsc-data/locations/objects');
if (!objectLocations.__runecraftInjected) {
    for (const spawn of runecraftData.buildObjectSpawns()) {
        objectLocations.push(spawn);
    }
    objectLocations.__runecraftInjected = true;
}

// 4) Rune-island NPC spawns onto locations/npcs.
const npcLocations = require('@2003scape/rsc-data/locations/npcs');
if (!npcLocations.__runecraftInjected) {
    for (const spawn of runecraftData.buildNpcSpawns()) {
        npcLocations.push(spawn);
    }
    npcLocations.__runecraftInjected = true;
}

// 4b) custom-quest npc spawns are emitted by the custom-maps generator with
//     OpenRSC raw ids; corrected by the by-name coord remap below

// append 2 custom quests at indices 50/51
require('./custom-quest-list');

// registers the runecrafting plugin
const pluginFiles = require('../plugins');
if (!pluginFiles['skills.runecrafting']) {
    pluginFiles['skills.runecrafting'] = require('../plugins/skills/runecrafting');
}

// stats encoder writes all 19 skills (current/base/experience)
const encoders = require('@2003scape/rsc-socket/src/server/encoders');
encoders.playerStatList = function playerStatList(packet, { skills, questPoints }) {
    for (const skillName of skillNames) {
        packet.writeByte(skills[skillName].current);
    }

    for (const skillName of skillNames) {
        packet.writeByte(skills[skillName].base);
    }

    for (const skillName of skillNames) {
        packet.writeInt(skills[skillName].experience);
    }

    packet.writeByte(questPoints);
};

// pushes custom map regions and the harvesting (20th) skill
const customMapsData = require('./custom-maps-data');
if (skillNames.length === 19) {
    skillNames.push(customMapsData.SKILL_NAME); // 'harvesting'
}
if (rscObjects.length === 1236) {
    for (const def of customMapsData.buildObject2Defs()) {
        rscObjects.push(def);
    }
}
if (!objectLocations.__customMapsInjected) {
    for (const spawn of customMapsData.buildObjectSpawns()) {
        objectLocations.push(spawn);
    }
    objectLocations.__customMapsInjected = true;
}
if (!npcLocations.__customMapsInjected) {
    for (const spawn of customMapsData.buildNpcSpawns()) {
        npcLocations.push(spawn);
    }
    npcLocations.__customMapsInjected = true;
}

// remap 21 custom-quest npc spawns by coordinate to the correct runtime ids
// (the custom-maps generator emitted them with OpenRSC raw ids)
const CUSTOM_QUEST_SPAWN_FIX = [
    { x: 279, y: 487, to: 808 }, // Gramat
    { x: 314, y: 3422, to: 811 }, // Balrog
    { x: 321, y: 3423, to: 809 }, // Dwarven Smithy
    { x: 313, y: 3431, to: 810 }, // Dwarven Youth
    { x: 316, y: 662, to: 815 }, // Ester
    { x: 159, y: 657, to: 816 }, // Bunny
    { x: 292, y: 472, to: 816 }, // Bunny
    { x: 226, y: 543, to: 816 }, // Bunny
    { x: 69, y: 621, to: 816 }, // Bunny
    { x: 288, y: 698, to: 816 }, // Bunny
    { x: 96, y: 448, to: 817 }, // Duck
    { x: 115, y: 533, to: 819 }, // Death (Varrock slum / Death's house)
    { x: 975, y: 165, to: 819 }, // Death (Death Island)
    { x: 157, y: 696, to: 822 }, // Kresh
    { x: 511, y: 544, to: 828 }, // Biggum Flodrot
    { x: 63, y: 452, to: 831 }, // Todd Sandyman
    { x: 320, y: 1491, to: 814 }, // Mum (Rising Sun Inn party room)
    { x: 320, y: 1487, to: 832 }, // Praeteritum (Ghost of Christmas Past)
    { x: 319, y: 1487, to: 833 }, // Praesens (Ghost of Christmas Present)
    { x: 318, y: 1487, to: 834 }, // Futurum (Ghost of Christmas Future)
    { x: 118, y: 710, to: 837 } // Ash (Father Urhney's hut)
];
if (!npcLocations.__customQuestSpawnIdsFixed) {
    for (const fix of CUSTOM_QUEST_SPAWN_FIX) {
        for (const loc of npcLocations) {
            if (loc.x === fix.x && loc.y === fix.y) {
                loc.id = fix.to;
            }
        }
    }
    npcLocations.__customQuestSpawnIdsFixed = true;
}
// remap Forester/McGrubor spawns 833/834 -> 835/836
const WOODCUTTING_GUILD_SPAWN_FIX = [
    { x: 559, y: 473, to: 835 }, // Forester
    { x: 557, y: 455, to: 836 } // McGrubor
];
if (!npcLocations.__woodcuttingGuildSpawnIdsFixed) {
    for (const fix of WOODCUTTING_GUILD_SPAWN_FIX) {
        for (const loc of npcLocations) {
            if (loc.x === fix.x && loc.y === fix.y) {
                loc.id = fix.to;
            }
        }
    }
    npcLocations.__woodcuttingGuildSpawnIdsFixed = true;
}

// remap gardener spawns 805 -> 807
const GARDENER_SPAWN_FIX = [
    { x: 130, y: 466 }, { x: 467, y: 455 }, { x: 131, y: 493 },
    { x: 551, y: 486 }, { x: 293, y: 539 }, { x: 512, y: 545 },
    { x: 600, y: 603 }, { x: 122, y: 655 }, { x: 632, y: 757 }
];
if (!npcLocations.__gardenerSpawnIdsFixed) {
    for (const fix of GARDENER_SPAWN_FIX) {
        for (const loc of npcLocations) {
            if (loc.x === fix.x && loc.y === fix.y && loc.id === 805) {
                loc.id = 807;
            }
        }
    }
    npcLocations.__gardenerSpawnIdsFixed = true;
}
const wallObjectLocations = require('@2003scape/rsc-data/locations/wall-objects');
if (!wallObjectLocations.__customMapsInjected) {
    for (const spawn of customMapsData.buildBoundarySpawns()) {
        wallObjectLocations.push(spawn);
    }
    wallObjectLocations.__customMapsInjected = true;
}
const groundItemLocations = require('@2003scape/rsc-data/locations/items');
if (!groundItemLocations.__customMapsInjected) {
    for (const spawn of customMapsData.buildGroundItemSpawns()) {
        groundItemLocations.push(spawn);
    }
    groundItemLocations.__customMapsInjected = true;
}
if (!pluginFiles['skills.harvesting']) {
    pluginFiles['skills.harvesting'] = require('../plugins/skills/harvesting');
}

// extend appearance decoder for creation bytes; spawn ironman tutors
const socketDecoders = require('@2003scape/rsc-socket/src/server/decoders');
if (!socketDecoders.__gameModePatched) {
    const originalAppearance = socketDecoders.appearance;
    socketDecoders.appearance = function appearance(packet) {
        const result = originalAppearance.call(this, packet);
        if (packet.remaining() >= 2) {
            result.ironmanMode = packet.getByte();
            result.isOneXp = packet.getByte();
        } else {
            result.ironmanMode = -1;
            result.isOneXp = -1;
        }
        if (packet.remaining() >= 1) {
            result.chosenClass = packet.getByte();
        }
        return result;
    };
    socketDecoders.__gameModePatched = true;
}
if (!npcLocations.__ironmanTutorsInjected) {
    npcLocations.push(
        { id: 801, x: 119, y: 650, minX: 119, maxX: 119, minY: 650, maxY: 650 },
        { id: 801, x: 218, y: 744, minX: 217, maxX: 219, minY: 743, maxY: 745 },
        { id: 802, x: 121, y: 649, minX: 121, maxX: 121, minY: 649, maxY: 649 },
        { id: 803, x: 123, y: 649, minX: 123, maxX: 123, minY: 649, maxY: 649 }
    );
    npcLocations.__ironmanTutorsInjected = true;
}

// auction house npcs: Auctioneers (796) in Varrock, Auction Clerks (797) in every town
if (!npcLocations.__auctionNpcsInjected) {
    npcLocations.push(
        { id: 796, x: 132, y: 505, minX: 131, maxX: 133, minY: 504, maxY: 506 },
        { id: 796, x: 126, y: 506, minX: 125, maxX: 127, minY: 505, maxY: 507 },
        { id: 796, x: 127, y: 509, minX: 126, maxX: 128, minY: 508, maxY: 510 },
        { id: 796, x: 133, y: 509, minX: 132, maxX: 134, minY: 508, maxY: 510 },
        { id: 797, x: 217, y: 450, minX: 215, maxX: 219, minY: 448, maxY: 452 },
        { id: 797, x: 501, y: 451, minX: 500, maxX: 502, minY: 450, maxY: 452 },
        { id: 797, x: 101, y: 512, minX: 100, maxX: 102, minY: 511, maxY: 513 },
        { id: 797, x: 151, y: 501, minX: 150, maxX: 152, minY: 500, maxY: 502 },
        { id: 797, x: 441, y: 494, minX: 440, maxX: 442, minY: 493, maxY: 495 },
        { id: 797, x: 283, y: 568, minX: 282, maxX: 284, minY: 567, maxY: 569 },
        { id: 797, x: 331, y: 553, minX: 330, maxX: 332, minY: 552, maxY: 554 },
        { id: 797, x: 582, y: 574, minX: 581, maxX: 583, minY: 573, maxY: 575 },
        { id: 797, x: 553, y: 610, minX: 551, maxX: 553, minY: 609, maxY: 611 },
        { id: 797, x: 219, y: 636, minX: 218, maxX: 220, minY: 635, maxY: 637 },
        { id: 797, x: 90, y: 694, minX: 89, maxX: 91, minY: 693, maxY: 695 },
        { id: 797, x: 369, y: 715, minX: 368, maxX: 370, minY: 714, maxY: 716 },
        { id: 797, x: 588, y: 756, minX: 587, maxX: 589, minY: 755, maxY: 757 },
        { id: 797, x: 402, y: 853, minX: 401, maxX: 403, minY: 852, maxY: 854 },
        { id: 797, x: 713, y: 1450, minX: 712, maxX: 714, minY: 1449, maxY: 1451 },
        { id: 797, x: 445, y: 3370, minX: 444, maxX: 446, minY: 3369, maxY: 3371 },
        { id: 797, x: 175, y: 3527, minX: 173, maxX: 175, minY: 3526, maxY: 3528 }
    );
    npcLocations.__auctionNpcsInjected = true;
}

// service npcs with no rsc-data spawn: Thordur (175) and the Brimhaven cart driver (618)
if (!npcLocations.__serviceNpcsInjected) {
    npcLocations.push(
        { id: 175, x: 305, y: 3330, minX: 303, maxX: 307, minY: 3328, maxY: 3332 },
        { id: 618, x: 468, y: 662, minX: 466, maxX: 470, minY: 660, maxY: 664 },
        // spawn silicius (812) at entrana
        { id: 812, x: 419, y: 562, minX: 418, maxX: 421, minY: 561, maxY: 563 }
    );
    npcLocations.__serviceNpcsInjected = true;
}

// shilo/varrock shop fixes: retag duplicate npc, add 3 shops
if (!npcLocations.__serevelFixed) {
    let seen616 = 0;
    for (const loc of npcLocations) {
        if (loc.id === 616 && loc.x === 395 && loc.y === 1780) {
            seen616 += 1;
            loc.id = 623;
        }
    }
    npcLocations.__serevelFixed = true;
}
const rscShops = require('@2003scape/rsc-data/shops');
const toRows = (pairs) => pairs.map(([id, amount]) => ({ id, amount }));
if (!rscShops['jiminuas-jungle-store']) {
    rscShops['jiminuas-jungle-store'] = {
        items: toRows([[166,2],[465,10],[468,3],[135,3],[87,3],[156,2],[12,5],[15,12],[16,10],[17,10],[132,2],[138,10],[169,10],[211,10],[599,10],[773,10],[167,10],[168,10],[982,50],[983,50],[464,50],[1172,50]]),
        sellMultiplier: 150, buyMultiplier: 50, delta: 2,
        restock: 15000, general: true
    };
}
// add/remove crown moulds per enchanted-crowns toggle. deferred to
// World.loadShops (the toggle isn't readable until a World sets server.config),
// reconciling the crown-mould row on both crafting shops each init.
const World = require('../model/world');
const Item = require('../model/item');
const origLoadShops = World.prototype.loadShops;
World.prototype.loadShops = function loadShopsWithCrownMoulds(...args) {
    const result = origLoadShops.apply(this, args);

    const wantEnchantedCrowns =
        !this.server.config || this.server.config.wantEnchantedCrowns !== false;

    for (const shopKey of ['dommiks-crafting', 'rommiks-crafty-supplies']) {
        const shop = this.shops.get(shopKey);

        if (!shop) {
            continue;
        }

        const mouldRow = shop.items.find((row) => row.id === 1506);

        if (wantEnchantedCrowns && !mouldRow) {
            shop.items.push(new Item({ id: 1506, amount: 2 }));
        } else if (!wantEnchantedCrowns && mouldRow) {
            shop.items = shop.items.filter((row) => row.id !== 1506);
        }
    }

    return result;
};
if (!rscShops['tailors-fine-garments']) {
    rscShops['tailors-fine-garments'] = {
        items: toRows([[192,0],[185,3],[512,1],[541,3],[146,3],[39,3],[43,100],[16,10],[17,10],[807,3],[808,3],[191,1],[194,5],[195,3],[187,2],[183,4],[609,3]]),
        sellMultiplier: 130, buyMultiplier: 40, delta: 2,
        restock: 30000, general: false
    };
}
// Thessalia's shop; rsc-data's "fancy-clothes" is actually the Tailor's stock
if (!rscShops['thessalias-fine-clothes']) {
    rscShops['thessalias-fine-clothes'] = {
        items: toRows([[182,3],[15,12],[16,10],[17,10],[191,1],[194,5],[195,3],[187,2],[183,4],[200,5],[807,3],[808,3]]),
        sellMultiplier: 100, buyMultiplier: 55, delta: 3,
        restock: 30000, general: false
    };
}

// solo-pve content pack: combat odyssey, rare-drop tables, leather
if (!pluginFiles['custom.minigames.combat-odyssey']) {
    pluginFiles['custom.minigames.combat-odyssey'] =
        require('../plugins/custom/minigames/combat-odyssey/index.js');
}
if (!pluginFiles['custom.npc-rare-drops']) {
    pluginFiles['custom.npc-rare-drops'] = require('../plugins/custom/npc-rare-drops.js');
}
if (!pluginFiles['custom.leather-tanning']) {
    pluginFiles['custom.leather-tanning'] = require('../plugins/custom/leather-tanning.js');
}
if (!npcLocations.__combatOdysseyNpcsInjected) {
    npcLocations.push({
        id: 828, x: 511, y: 544, minX: 506, maxX: 514, minY: 540, maxY: 550
    });
    npcLocations.__combatOdysseyNpcsInjected = true;
}

// 10) personal NPC kill counters
if (!pluginFiles['custom.npc-kill-counters']) {
    pluginFiles['custom.npc-kill-counters'] =
        require('../plugins/custom/npc-kill-counters.js');
}

// boot-progress hooks around world.loadData
{
    const spb = globalThis.__sp;
    if (spb && spb.setProgress) {
        const report = (pct, text) => {
            try { spb.setProgress(pct, text); } catch (e) {}
        };

        // wrap parseArchives
        const Landscape = require('@2003scape/rsc-landscape/src/landscape');
        const origParseArchives = Landscape.prototype.parseArchives;
        Landscape.prototype.parseArchives = function parseArchivesWithProgress(...args) {
            report(25, 'Building landscape');
            const result = origParseArchives.apply(this, args);
            report(55, 'Landscape ready');
            return result;
        };

        const World = require('../model/world');

        const origLoadPlugins = World.prototype.loadPlugins;
        World.prototype.loadPlugins = function loadPluginsWithProgress(...args) {
            report(60, 'Loading plugins');
            const result = origLoadPlugins.apply(this, args);
            report(70, 'Spawning world');
            return result;
        };

        // await original loadData
        const origLoadData = World.prototype.loadData;
        World.prototype.loadData = async function loadDataWithProgress(...args) {
            report(20, 'Loading world');
            const result = await origLoadData.apply(this, args);
            report(95, 'Finalising');
            return result;
        };
    }
}

require('../browser-index'); // rsc-server's real browser entry (unmodified)
