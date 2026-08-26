
require('./landscape-fast'); // must run before the world loads

// disables bole logging; its Buffer.from() throws on quickjs and desyncs the client
require('bole').output = () => {};

// reports early boot progress to the vita loading screen
{
    const spb = globalThis.__sp;
    if (spb && spb.setProgress) {
        try { spb.setProgress(15, 'Loading game data'); } catch (e) {}
    }
}

// appends custom item defs (ids 1290+) to match the client's item table
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

// gives bankers a right-click 'bank' command so it opens the bank directly
for (const bankerId of [95, 224, 268, 540, 617, 792]) {
    if (rscNpcs[bankerId]) {
        rscNpcs[bankerId].command = 'Bank';
    }
}

// injects the 19th skill, altar objects, spawns, plugin, and widened stats encoder before world load
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


// appends the 2 custom quests at indices 50/51, matching the client's quest order
require('./custom-quest-list');

// registers the runecrafting plugin
const pluginFiles = require('../plugins');
if (!pluginFiles['skills.runecrafting']) {
    pluginFiles['skills.runecrafting'] = require('../plugins/skills/runecrafting');
}

// stats packet encoder writes all 19 skills (current/base/experience) instead of a hardcoded 18
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

// remaps 21 custom-quest npc spawns from openrsc raw ids to this build's runtime ids, by coordinate
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

// extends the appearance decoder to read game-mode/class/one-xp creation bytes; spawns ironman tutor npcs
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

// spawns thordur and the brimhaven cart driver, which have no spawn entry in either source
if (!npcLocations.__serviceNpcsInjected) {
    npcLocations.push(
        { id: 175, x: 305, y: 3330, minX: 303, maxX: 307, minY: 3328, maxY: 3332 },
        { id: 618, x: 468, y: 662, minX: 466, maxX: 470, minY: 660, maxY: 664 },
        // spawns silicius (openrsc id 810, remapped to custom id 812) at entrana
        { id: 812, x: 419, y: 562, minX: 418, maxX: 421, minY: 561, maxY: 563 }
    );
    npcLocations.__serviceNpcsInjected = true;
}

// shilo/varrock shop fixes: retags a duplicate npc entry, adds two missing shops
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
// reconciles crown moulds on the two crafting shops per-world, based on the enchanted-crowns toggle
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

// openrsc solo-pve content pack: combat odyssey, rare-drop tables, leather
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

// 10) Personal NPC kill counters (1:1 Player.addNpcKill).
if (!pluginFiles['custom.npc-kill-counters']) {
    pluginFiles['custom.npc-kill-counters'] =
        require('../plugins/custom/npc-kill-counters.js');
}

// boot-progress milestone hooks around the slow steps of world.loadData
{
    const spb = globalThis.__sp;
    if (spb && spb.setProgress) {
        const report = (pct, text) => {
            try { spb.setProgress(pct, text); } catch (e) {}
        };

        // wraps whichever parseArchives is currently active, cached or not
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

        // awaits the original loadData so progress reports only after it fully finishes
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
