const Captcha = require('@2003scape/rsc-captcha');
const EntityList = require('./entity-list');
const holidayEvents = require('../holiday-events');
const Shop = require('./shop');
const flat = require('flat');
const fs = require('fs');
const log = require('bole')('world');
const objects = require('@2003scape/rsc-data/config/objects');
// kitten care activity/growth driver, run once per player per tick
const kittencare = require('../plugins/custom/minigames/kittencare');
const party = require('../plugins/custom/party');
const bots = require('../plugins/custom/bots');
const pluginFiles = require('../plugins');
const tiles = require('@2003scape/rsc-data/config/tiles');
const wallObjects = require('@2003scape/rsc-data/config/wall-objects');
const { Landscape } = require('@2003scape/rsc-landscape');
const { PathFinder } = require('@2003scape/rsc-path-finder');

const entityLocations = {
    npcs: require('@2003scape/rsc-data/locations/npcs'),
    gameObjects: require('@2003scape/rsc-data/locations/objects'),
    wallObjects: require('@2003scape/rsc-data/locations/wall-objects'),
    groundItems: require('@2003scape/rsc-data/locations/items')
};

const entityConstructors = {
    npcs: require('./npc'),
    gameObjects: require('./game-object'),
    wallObjects: require('./wall-object'),
    groundItems: require('./ground-item')
};

// ms per each cycle of player/entity movement and delay updates
const TICK_INTERVAL = 640;

// ms between each global player save
const PLAYER_SAVE_INTERVAL = 1000 * 60 * 5; // (5 mins)

// single-player saves far more often; the app can close without logging out
const SINGLEPLAYER_SAVE_INTERVAL = 1000 * 30; // (30s)

// how often a holiday-event item drops, hourly while a holiday is active
const HOLIDAY_DROP_INTERVAL = 1000 * 60 * 60; // hourly

// ground items stay owner-only for 100 ticks
const DROP_OWNER_TIMEOUT = TICK_INTERVAL * 100; // 64s

// default ground-item despawn delay, 200 ticks
const DROP_DISAPPEAR_TIMEOUT = TICK_INTERVAL * 200; // 128s

// function names that can be used in files within the ../plugins/ directory
// that will potentially block default behaviour
const PLUGIN_TYPES = [
    'onTalkToNPC',
    'onGameObjectCommandOne',
    'onGameObjectCommandTwo',
    'onWallObjectCommandOne',
    'onWallObjectCommandTwo',
    'onGroundItemTake',
    'onUseWithGroundItem',
    'onUseWithGameObject',
    'onUseWithWallObject',
    'onUseWithInventory',
    'onUseWithNPC',
    'onUseWithPlayer',
    'onInventoryCommand',
    'onDropItem',
    'onNPCAttack',
    'onNPCCommand',
    'onNPCDeath',
    // spell-on-target triggers; a registered hook runs its effects then returns
    // truthy to suppress the default cast, else casting is unchanged
    'onSpellNPC', // SpellHandler CAST_ON_NPC -> checkCastOnNpc -> SpellNpcTrigger
    'onSpellObject', // CAST_ON_SCENERY -> SpellLocTrigger
    'onSpellInventoryItem', // CAST_ON_INVENTORY_ITEM -> SpellInvTrigger (before handleItemCast)
    'onSpellPlayer', // PLAYER_CAST_PVP -> checkCastOnPlayer -> SpellPlayerTrigger
    // player fled an NPC fight (walk.js retreat path)
    'onEscapeNPC',
    // ranged attack on an NPC; truthy = shot refused
    'onRangeNPC',
    // taking worn gear off; truthy = stays on
    'onUnequipItem',
    // a player died; return value ignored
    'onPlayerDeath'
];

// prevent spawning entities outside of the f2p boundaries
const FREE_BOUNDS = {
    minX: 48,
    maxX: 450,
    minY: 128,
    maxY: 766
};

class World {
    constructor(server) {
        this.server = server;

        this.id = this.server.config.worldID;
        this.members = this.server.config.members;

        this.planeWidth = 2304;
        this.planeHeight = 1776;
        this.planeElevation = 944;

        this.playerCapacity = 1250;

        // { pluginType: [function() {}, ...], ... }
        this.plugins = new Map();

        this.shops = new Map(); // { name: Shop }

        const totalHeight = this.planeHeight * 4;

        this.players = new EntityList(this.planeWidth, totalHeight);
        this.npcs = new EntityList(this.planeWidth, totalHeight);
        this.gameObjects = new EntityList(this.planeWidth, totalHeight);
        this.wallObjects = new EntityList(this.planeWidth, totalHeight);
        this.groundItems = new EntityList(this.planeWidth, totalHeight);

        this.captcha = new Captcha();

        // used for clearTickTimeout
        this.tickIndex = 0;

        // { tickIndex: function() {} }
        this.tickFunctions = new Map();

        // used to calculate average ms per tick (every 100 ticks)
        this.deltaTickTimes = [];

        this.boundTick = this.tick.bind(this);
        this.boundSaveAllPlayers = this.saveAllPlayers.bind(this);
        this.boundHolidayDropTick = this.holidayDropTick.bind(this);

        this.ticks = 0;
    }

    loadLandscape() {
        this.landscape = new Landscape();

        // with a valid landscape cache, parseArchives gets everything from the
        // blob, so skip decoding the jag/mem buffers
        let spCached = false;
        if (
            globalThis.__host &&
            typeof globalThis.__host.landscapeCache === 'function'
        ) {
            try {
                spCached =
                    require('../sp/landscape-fast').hasLandscapeCache();
            } catch (e) {
                // not the single-player build, fall through
            }
        }

        if (!spCached) {
            this.landscape.loadJag(
                fs.readFileSync(
                    __dirname +
                        '/../../node_modules/@2003scape/rsc-data/landscape/land63.jag'
                ),
                fs.readFileSync(
                    __dirname +
                        '/../../node_modules/@2003scape/rsc-data/landscape/maps63.jag'
                )
            );

            if (this.members) {
                this.landscape.loadMem(
                    fs.readFileSync(
                        __dirname +
                            '/../../node_modules/@2003scape/rsc-data/landscape/land63.mem'
                    ),
                    fs.readFileSync(
                        __dirname +
                            '/../../node_modules/@2003scape/rsc-data/landscape/maps63.mem'
                    )
                );
            }
        }

        this.landscape.parseArchives();

        // the cache blob carries the full members map; a free world strips the
        // members sectors, keeping the custom-injected ones
        if (spCached && !this.members) {
            for (const column of this.landscape.sectors) {
                if (!column) continue;
                for (const planes of column) {
                    if (!planes) continue;
                    for (let p = 0; p < planes.length; p += 1) {
                        const sector = planes[p];
                        if (sector && sector.members && !sector.custom) {
                            planes[p] = null;
                        }
                    }
                }
            }
            this.landscape.__spMembersStripped = true;
        }

        // inject the rune-island sectors and grow maxRegionX/Y to cover them
        try {
            const Sector = require('@2003scape/rsc-landscape/src/sector');
            const runecraftData = require('../sp/runecraft-data');
            const injected = runecraftData.buildRuneSectors(Sector);

            for (const { x, y, plane, sector } of injected) {
                if (
                    this.landscape.sectors[x] &&
                    this.landscape.sectors[x][y]
                ) {
                    this.landscape.sectors[x][y][plane] = sector;

                    if (this.landscape.maxRegionX === null ||
                        x > this.landscape.maxRegionX) {
                        this.landscape.maxRegionX = x;
                    }

                    if (this.landscape.maxRegionY === null ||
                        y > this.landscape.maxRegionY) {
                        this.landscape.maxRegionY = y;
                    }
                }
            }
        } catch (e) {
            // not the single-player build (runecraft-data absent), skip
            log.info(`runecraft island injection skipped: ${e.message}`);
        }

        // inject the custom-map terrain sectors, same as the rune islands
        try {
            const Sector = require('@2003scape/rsc-landscape/src/sector');
            const customMapsData = require('../sp/custom-maps-data');
            const injected = customMapsData.buildCustomMapSectors(Sector);

            for (const { x, y, plane, sector } of injected) {
                if (
                    this.landscape.sectors[x] &&
                    this.landscape.sectors[x][y]
                ) {
                    this.landscape.sectors[x][y][plane] = sector;

                    if (this.landscape.maxRegionX === null ||
                        x > this.landscape.maxRegionX) {
                        this.landscape.maxRegionX = x;
                    }

                    if (this.landscape.maxRegionY === null ||
                        y > this.landscape.maxRegionY) {
                        this.landscape.maxRegionY = y;
                    }
                }
            }
        } catch (e) {
            // not the single-player build (custom-maps-data absent), skip
            log.info(`custom-map injection skipped: ${e.message}`);
        }

        this.pathFinder = new PathFinder(
            { objects, wallObjects, tiles },
            this.landscape
        );
    }

    addEntity(type, entity) {
        if (type === 'gameObjects') {
            // with a baked grid every object is already in the cache
            if (!this._loadingBaked) {
                this.pathFinder.addObject(entity);
            }
        } else if (type === 'wallObjects' && this._loadingBaked) {
            // baked: the grid bits are already in the cache
            const exisiting = this.wallObjects.getAtPoint(entity.x, entity.y);

            for (const wallObject of exisiting) {
                this.wallObjects.remove(wallObject);
            }
        } else if (type === 'wallObjects') {
            // always overwrite wallobjects
            const exisiting = this.wallObjects.getAtPoint(entity.x, entity.y);

            for (const wallObject of exisiting) {
                this.wallObjects.remove(wallObject);
            }

            try {
                const tile = this.landscape.getTileAtGameCoords(
                    entity.x,
                    entity.y
                );

                if (entity.direction === 0) {
                    tile.wall.horizontal = entity.id + 1;
                } else if (entity.direction === 1) {
                    tile.wall.vertical = entity.id + 1;
                } else if (tile.wall) {
                    if (!tile.wall.diagonal) {
                        tile.wall.diagonal = {};
                    }

                    tile.wall.diagonal.overlay = entity.id + 1;
                }
            } catch (e) {
                // pass
            }

            this.pathFinder.addWallObject(entity);
        }

        this[type].add(entity);

        // co-op build only: tell everyone else when a player joins
        if (type === 'players' && this.server.isBrowser) {
            for (const other of this.players.getAll()) {
                if (other && other !== entity) {
                    other.message(
                        `@gre@${entity.username} has joined the world`
                    );
                }
            }
        }

        if (!this.players.length) {
            return;
        }

        for (const player of entity.getNearbyEntities('players')) {
            if (entity === player) {
                return;
            }

            player.localEntities.add(type, entity);
        }
    }

    removeEntity(type, entity) {
        if (!this[type].remove(entity)) {
            throw new Error(`unable to remove entity ${entity}`);
        }

        // co-op build only: tell everyone else when a player leaves
        if (type === 'players' && this.server.isBrowser) {
            for (const other of this.players.getAll()) {
                if (other && other !== entity) {
                    other.message(
                        `@gre@${entity.username} has left the world`
                    );
                }
            }
        }

        if (type === 'players') {
            for (const npc of entity.localEntities.known.npcs) {
                npc.knownPlayers.delete(entity);
            }
        }

        if (entity.respawn) {
            this.setTimeout(() => {
                entity.x = entity.spawnX || entity.x;
                entity.y = entity.spawnY || entity.y;

                this.addEntity(
                    type,
                    new entityConstructors[type](this, entity)
                );
            }, entity.respawn);
        }

        for (const player of entity.getNearbyEntities('players')) {
            if (entity === player) {
                return;
            }

            if (player.localEntities.known[type].has(entity)) {
                player.localEntities.removed[type].add(entity);
            }
        }
    }

    replaceEntity(type, entity, newID) {
        const Entity = entityConstructors[type];
        const newEntity = new Entity(this, { ...entity, id: newID });
        this.removeEntity(type, entity);
        this.addEntity(type, newEntity);

        return newEntity;
    }

    loadEntities(type) {
        // custom SP: with a baked grid, objects/wall objects skip the obstacle adds
        this._loadingBaked = !!(
            this.pathFinder && this.pathFinder.__objectsBaked &&
            (type === 'gameObjects' || type === 'wallObjects')
        );
        for (const entityLocation of entityLocations[type]) {
            const Entity = entityConstructors[type];
            const entity = new Entity(this, entityLocation);

            // prevents doogle leaves and such showing up in free-to-play
            if (!this.members && entity.definition.members) {
                continue;
            }

            const flatY = entity.y % this.planeElevation;

            if (
                !this.members &&
                (entity.x > FREE_BOUNDS.maxX ||
                    entity.x < FREE_BOUNDS.minX ||
                    flatY > FREE_BOUNDS.maxY ||
                    flatY < FREE_BOUNDS.minY)
            ) {
                continue;
            }

            this.addEntity(type, entity);
        }

        this._loadingBaked = false;
        log.info(`loaded ${this[type].length} ${type.slice(0, -1)} locations`);
    }

    loadShops() {
        for (const shopName of Shop.names) {
            this.shops.set(shopName, new Shop(this, shopName));
        }

        log.info(`loaded ${this.shops.size} shops`);
    }

    loadPlugins() {
        for (const handlerName of PLUGIN_TYPES) {
            this.plugins.set(handlerName, []);
        }

        let totalPlugins = 0;

        const pluginHandlers = flat(pluginFiles);

        for (const pluginName of Object.keys(pluginHandlers)) {
            const handler = pluginHandlers[pluginName];

            if (
                typeof handler === 'function' &&
                this.plugins.has(handler.name)
            ) {
                const handlers = this.plugins.get(handler.name);
                handlers.push(handler);
                totalPlugins += 1;
            }
        }

        log.info(`loaded ${totalPlugins} plugin handlers`);
    }

    // load the definitions and locations required for the game
    async loadData() {
        this.loadLandscape();

        for (const type of Object.keys(entityLocations)) {
            this.loadEntities(type);
        }

        this.loadShops();
        this.loadPlugins();

        if (
            !process.browser ||
            (process.browser && typeof OffscreenCanvas !== 'undefined')
        ) {
            await this.captcha.loadFonts();
        } else {
            log.warn(
                'captcha disabled as OffscreenCanvas was not found. enable ' +
                    'in about:config on firefox'
            );
        }

        // spawn bots: the config roster first, then any remaining persisted bots
        try {
            const rosterDefs =
                (this.server.config && this.server.config.bots) || [];
            const fromConfig = bots.spawnRoster(this, rosterDefs);
            const restored = bots.restoreBots(this, fromConfig);
            if (fromConfig.size || restored) {
                log.info(
                    `bots: ${fromConfig.size} from config, ${restored} restored`
                );
            }
        } catch (e) {
            log.error(e);
        }
    }

    async callPlugin(handlerName, ...args) {
        for (const handler of this.plugins.get(handlerName)) {
            try {
                const blocked = await handler.apply(this, args);

                if (blocked) {
                    return true;
                }
            } catch (e) {
                if (handlerName === 'onTalkToNPC') {
                    args[0].disengage();

                    if (e.message !== 'interrupted ask') {
                        log.error(e);
                    }

                    return true;
                } else if (e.message === 'interrupted ask') {
                    args[0].unlock();
                    return true;
                }

                log.error(e);
                return true;
            }
        }

        return false;
    }

    // add a new ground item owned by a certain player (temporarily)
    addPlayerDrop(player, item, x, y) {
        if (typeof item === 'number') {
            item = { id: item };
        }

        const groundItem = new entityConstructors.groundItems(this, {
            ...item,
            x: typeof x !== 'undefined' ? x : player.x,
            y: typeof y !== 'undefined' ? y : player.y
        });

        groundItem.owner = player.id;

        // if we never delete the owner property, it never shows up to other
        // players and still disappears after DROP_DISAPPEAR_TIMEOUT
        if (
            !groundItem.definition.untradeable &&
            (!this.members ? !groundItem.definition.members : true)
        ) {
            this.setTimeout(() => delete groundItem.owner, DROP_OWNER_TIMEOUT);
        }

        this.setTimeout(() => {
            // the drop may already be gone (picked up); re-check before removing
            if (this.groundItems.entities[groundItem.index] === groundItem) {
                this.removeEntity('groundItems', groundItem);
            }
        }, DROP_DISAPPEAR_TIMEOUT);

        this.addEntity('groundItems', groundItem);
    }

    getPlayerByUsername(username) {
        username = username.toLowerCase();

        for (const player of this.players.getAll()) {
            if (player.username === username) {
                return player;
            }
        }
    }

    sendForeignPlayerWorld(username, worldID) {
        for (const player of this.players.getAll()) {
            if (player.friends.indexOf(username) > -1) {
                player.sendFriendWorld(username, worldID);
            }
        }
    }

    // get a respawn time with { min, max } based on the player population.
    getRespawnTime(respawn) {
        if (!Number.isNaN(respawn)) {
            return respawn;
        }

        const delta = respawn.max - respawn.min;

        return Math.floor(
            respawn.min + delta * (1 - this.players.size / this.playerCapacity)
        );
    }

    // like setTimeout, but server cycles instead. still returns an ID you can
    // world.clearTickTimeout with
    setTickTimeout(func, ticks) {
        if (this.tickIndex >= Number.MAX_SAFE_INTEGER) {
            this.tickIndex = 0;
        }

        this.tickIndex += 1;
        this.tickFunctions.set(this.tickIndex, { func, ticks });

        return this.tickIndex;
    }

    // set tick timeout but just 1
    nextTick(func) {
        return this.setTickTimeout(func, 1);
    }

    clearTickTimeout(id) {
        this.tickFunctions.delete(id);
    }

    async sleepTicks(ticks) {
        return new Promise((resolve) => this.setTickTimeout(resolve, ticks));
    }

    // TODO test this out with sleepTicks approximation
    setTimeout(func, ms) {
        return setTimeout(func, ms);
    }

    clearTimeout(id) {
        clearTimeout(id);
    }

    sleep(ms) {
        return new Promise((resolve) => this.setTimeout(resolve, ms));
    }

    tick() {
        this.ticks += 1;

        const startTime = Date.now();

        this.server.readMessages();

        try {
            // re-bucket any character that moved into a new hash-grid cell so
            // getInArea finds them at their current position this tick
            if (this.players.reindex) {
                for (const player of this.players.getAll()) {
                    this.players.reindex(player);
                }

                for (const npc of this.npcs.getAll()) {
                    this.npcs.reindex(npc);
                }
            }

            for (const [id, entry] of this.tickFunctions) {
                entry.ticks -= 1;

                if (entry.ticks === 0) {
                    entry.func();
                    this.tickFunctions.delete(id);
                }
            }

            for (const npc of this.npcs.getAll()) {
                // isolate a per-NPC exception so the rest of the world ticks
                try {
                    npc.tick();
                } catch (e) {
                    log.error(e);
                }
            }

            for (const player of this.players.getAll()) {
                // isolate a per-player exception so the others tick
                try {
                    player.tick();
                } catch (e) {
                    log.error(e);
                }
                // kitten care driver; fast-returns for a player without a kitten
                kittencare.onCatGrowthTick(player);
                // bot behaviour driver; fast-returns for non-bots, one action/tick
                bots.onBehaviorTick(player);
            }

            // party HUD sync: one snapshot per party, only when it changed
            party.tickUpdates(this);

            for (const player of this.players.getAll()) {
                // bots have no socket, so skip sending their region packets
                if (player.isBot) {
                    continue;
                }

                player.localEntities.sendRegions();
            }
        } catch (e) {
            log.error(e);
        }

        this.server.sendMessages();

        const deltaTime = Date.now() - startTime;

        this.deltaTickTimes.push(deltaTime);

        if (this.deltaTickTimes.length === 100) {
            const averageTick = this.deltaTickTimes.reduce((sum, ms) => {
                return sum + ms;
            }, 0);

            log.info(
                `average tick time is: ~${(averageTick / 100).toFixed(2)}ms`
            );

            this.deltaTickTimes.length = 0;
        }

        // config.gameSpeed multiplies tick speed; floored at 80ms/tick
        const gameSpeed = this.server.config.gameSpeed || 1;
        const interval = Math.max(80, Math.floor(TICK_INTERVAL / gameSpeed));

        setTimeout(this.boundTick, interval - deltaTime);
    }

    async saveAllPlayers() {
        // always re-arm, even with zero players, or the save loop stops for good
        if (this.players.length) {
            const startTime = Date.now();
            log.info('saving all players...');

            for (const player of this.players.getAll()) {
                await player.save();
            }

            const deltaTime = Date.now() - startTime;
            log.info(`finished saving all players in ${deltaTime}ms`);
        }

        const interval = this.server.isBrowser
            ? SINGLEPLAYER_SAVE_INTERVAL
            : PLAYER_SAVE_INTERVAL;

        setTimeout(this.boundSaveAllPlayers, interval);
    }

    // walk the world grid and register one random holiday item per unblocked
    // ground-floor tile; presents and crackers are banned from Entrana. runs
    // hourly while holidayEvents is on and the date is inside a holiday window
    holidayDropTick() {
        try {
            if (this.server.config.holidayEvents) {
                const key = holidayEvents.activeEvent(new Date());

                if (key) {
                    const items = holidayEvents.EVENTS[key].items;
                    let totalItemsDropped = 0;

                    // step y by 2..5 and x by 14..28
                    for (let y = 96; y < 912; ) {
                        for (let x = 1; x < 770; ) {
                            const id =
                                items[
                                    Math.floor(Math.random() * items.length)
                                ];

                            if (
                                !this.holidayDropBlocked(x, y) &&
                                !this.isEntranaBlocked(x, y, id)
                            ) {
                                this.addEntity(
                                    'groundItems',
                                    new entityConstructors.groundItems(this, {
                                        id,
                                        amount: 1,
                                        x,
                                        y
                                    })
                                );
                                totalItemsDropped += 1;
                            }

                            x += 14 + Math.floor(Math.random() * 15);
                        }

                        y += 2 + Math.floor(Math.random() * 4);
                    }

                    log.info(
                        `holiday drop (${key}): dropped ` +
                            `${totalItemsDropped} items`
                    );
                }
            }
        } catch (e) {
            log.error(e);
        }

        setTimeout(this.boundHolidayDropTick, HOLIDAY_DROP_INTERVAL);
    }

    // a tile is blocked for drops if any of its 2x2 pathfinder sub-tiles is set;
    // tiles outside the obstacle map count as blocked
    holidayDropBlocked(x, y) {
        if (!this.pathFinder) {
            return true;
        }

        try {
            return !!(
                this.pathFinder.getObstacle(x, y, 0, 0) ||
                this.pathFinder.getObstacle(x, y, 1, 0) ||
                this.pathFinder.getObstacle(x, y, 0, 1) ||
                this.pathFinder.getObstacle(x, y, 1, 1)
            );
        } catch (e) {
            return true;
        }
    }

    // presents (980) may not spawn on Entrana (x 394..443, y 524..575)
    isEntranaBlocked(x, y, itemID) {
        if (!(x > 394 && x < 443 && y > 524 && y < 575)) {
            return false;
        }

        return itemID === 980;
    }

    toString() {
        return (
            `[World (id=${this.id}, members=${this.members}, players=` +
            `${this.players.length})]`
        );
    }
}

module.exports = World;
