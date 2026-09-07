// implements the same methods but shimmed to run in the browser

const log = require('bole')('browser-data-client');
const idbKeyval = require('idb-keyval');

// dirty bot records written per flush pass
const BOT_FLUSH_PER_PASS = 4;
const { getQOLConfig } = require('./model/qol-config');

// tutorial-enabled first-time spawn tile, the guide's starting room
const TUTORIAL_START_X = 216;
const TUTORIAL_START_Y = 744;

const DEFAULT_PLAYER = {
    rank: 0,
    x: 122,
    y: 657,
    questPoints: 0,
    fatigue: 0,
    combatStyle: 0,
    blockChat: 0,
    blockPrivateChat: 0,
    blockTrade: 0,
    blockDuel: 0,
    cameraAuto: 0,
    oneMouseButton: 0,
    soundOn: 0,
    hairColour: 2,
    topColour: 8,
    trouserColour: 14,
    skinColour: 0,
    headSprite: 1,
    bodySprite: 2,
    skulled: 0,
    // per-character ironman mode, set at creation
    ironManMode: 0,
    ironManRestriction: 1,
    ironManHCDeath: 0,
    friends: [],
    ignores: [],
    inventory: [],
    bank: [],
    questStages: {},
    cache: {},
    muteEndDate: 0,
    id: 0,
    loginDate: 0,
    skills: {
        attack: { current: 1, experience: 0 },
        defense: { current: 1, experience: 0 },
        strength: { current: 1, experience: 0 },
        hits: { current: 10, experience: 4616 },
        ranged: { current: 1, experience: 0 },
        prayer: { current: 1, experience: 0 },
        magic: { current: 1, experience: 0 },
        cooking: { current: 1, experience: 0 },
        woodcutting: { current: 1, experience: 0 },
        fletching: { current: 1, experience: 0 },
        fishing: { current: 1, experience: 0 },
        firemaking: { current: 1, experience: 0 },
        crafting: { current: 1, experience: 0 },
        smithing: { current: 1, experience: 0 },
        mining: { current: 1, experience: 0 },
        herblaw: { current: 1, experience: 0 },
        agility: { current: 1, experience: 0 },
        thieving: { current: 1, experience: 0 },
        // 19th skill, runecraft. must be present or the stats encoder throws
        runecraft: { current: 1, experience: 0 },
        // 20th skill, harvesting (same requirement)
        harvesting: { current: 1, experience: 0 }
    },
    loginIP: null,
    world: 0
};

class BrowserDataClient {
    constructor(server) {
        this.server = server;

        this.world = this.server.world;
        this.connected = true;

        // { playerID: username }
        this.playerUsernames = new Map();
    }

    async init() {
        await this.load();
    }

    async load() {
        const playerID = await idbKeyval.get('playerID');
        this.playerID = playerID ? Number(playerID) : 0;

        // bot roster, persisted separately from human accounts (never shown in
        // the login list): one 'bot:<username>' key each plus a 'bots-index' list
        this.bots = new Map();
        this._botsDirty = new Set();
        this._botsIndexDirty = false;
        this._botsFlushTimer = null;

        const botIndexRaw = await idbKeyval.get('bots-index');

        if (botIndexRaw) {
            for (const username of JSON.parse(botIndexRaw)) {
                const record = await idbKeyval.get('bot:' + username);

                if (record) {
                    this.bots.set(username, record);
                }
            }
        } else {
            const botsRaw = await idbKeyval.get('bots');

            if (botsRaw) {
                this.bots = new Map(JSON.parse(botsRaw));

                for (const [username, record] of this.bots) {
                    await idbKeyval.set('bot:' + username, record);
                }

                await idbKeyval.set(
                    'bots-index',
                    JSON.stringify(Array.from(this.bots.keys()))
                );
                await idbKeyval.del('bots');
            }
        }

        const players = await idbKeyval.get('players');

        this.players = players ? new Map(JSON.parse(players)) : new Map();

        for (const player of this.players.values()) {
            player.world = 0;

            // backfill runecraft for characters created before it existed
            if (player.skills && !player.skills.runecraft) {
                player.skills.runecraft = { current: 1, experience: 0 };
            }
            if (player.skills && !player.skills.harvesting) {
                player.skills.harvesting = { current: 1, experience: 0 };
            }
        }

        log.info(`loaded ${this.players.size} players from local storage`);
    }

    async save() {
        await idbKeyval.set('playerID', this.playerID);

        await idbKeyval.set(
            'players',
            JSON.stringify(Array.from(this.players.entries()))
        );
    }

    async savePlayer(player) {
        player.password = this.players.get(player.username).password;
        this.players.set(player.username, JSON.parse(JSON.stringify(player)));
        await this.save();
    }

    // non-player world state (auctions, clans, party chest): one 'world:<key>' each
    async getWorldState(key) {
        const raw = await idbKeyval.get('world:' + key);
        return raw ? JSON.parse(raw) : null;
    }

    async setWorldState(key, value) {
        await idbKeyval.set('world:' + key, JSON.stringify(value));
    }

    // bot roster
    getBots() {
        return this.bots ? Array.from(this.bots.values()) : [];
    }

    // write-behind: keep the record in memory, mark it dirty, flush a few
    // per timer pass; flushBots(0) drains the rest synchronously
    saveBot(record) {
        if (!this.bots) {
            this.bots = new Map();
            this._botsDirty = new Set();
        }

        if (!this.bots.has(record.username)) {
            this._botsIndexDirty = true;
        }

        this.bots.set(record.username, record);
        this._botsDirty.add(record.username);
        this.scheduleBotFlush();

        return Promise.resolve();
    }

    async deleteBot(username) {
        if (this.bots && this.bots.delete(username)) {
            this._botsDirty.delete(username);
            this._botsIndexDirty = true;

            try {
                await idbKeyval.del('bot:' + username);
            } catch (e) {
                // best effort
            }

            this.scheduleBotFlush();
        }
    }

    scheduleBotFlush() {
        if (this._botsFlushTimer) {
            return;
        }

        this._botsFlushTimer = setTimeout(() => {
            this._botsFlushTimer = null;
            this.flushBots(BOT_FLUSH_PER_PASS);
        }, 0);
    }

    // write up to `limit` dirty bots (all when limit is 0), return the count
    flushBots(limit) {
        if (!this._botsDirty) {
            return 0;
        }

        let written = 0;

        if (this._botsIndexDirty) {
            this._botsIndexDirty = false;
            Promise.resolve(
                idbKeyval.set(
                    'bots-index',
                    JSON.stringify(Array.from(this.bots.keys()))
                )
            ).catch(() => {});
        }

        for (const username of this._botsDirty) {
            if (limit && written >= limit) {
                break;
            }

            this._botsDirty.delete(username);
            const record = this.bots.get(username);

            if (record) {
                Promise.resolve(idbKeyval.set('bot:' + username, record)).catch(() => {});
            }

            written += 1;
        }

        if (this._botsDirty.size > 0) {
            this.scheduleBotFlush();
        }

        return written;
    }

    async sendAndReceive(message) {
        switch (message.handler) {
            case 'playerRegister': {
                message.username = message.username.toLowerCase();

                if (this.players.get(message.username)) {
                    return {
                        success: false,
                        code: 3
                    };
                }

                const player = JSON.parse(JSON.stringify(DEFAULT_PLAYER));

                player.id = this.playerID;
                player.username = message.username;
                player.password = message.password;

                // tutorial-enabled first-time spawn; no-op unless tutorialIsland is set
                if (getQOLConfig(this.server.config).tutorialIsland) {
                    player.x = TUTORIAL_START_X;
                    player.y = TUTORIAL_START_Y;
                    player.cache.tutorialStage = 0;
                }

                this.playerID += 1;

                this.players.set(player.username, player);

                // persist immediately so a new character survives a quit before autosave
                await this.save();

                return {
                    success: true,
                    code: 2
                };
            }
            case 'playerLogin': {
                message.username = message.username.toLowerCase();

                const player = this.players.get(message.username);

                // single-player ignores the password; only a missing character is rejected
                if (!player) {
                    return {
                        success: false,
                        code: 3
                    };
                }

                if (player.world) {
                    // a record still flagged "in world" means the last session
                    // dropped without a logout; log it out and let this login through
                    let stale = null;

                    if (this.world && this.world.players) {
                        for (const p of this.world.players.getAll()) {
                            if (p && !p.isBot && p.username === message.username) {
                                stale = p;
                                break;
                            }
                        }
                    }

                    if (stale) {
                        try {
                            await stale.logout();
                        } catch (e) {
                            // best effort; the record is reset below anyway
                        }
                    }

                    player.world = 0;
                }

                this.playerUsernames.set(player.id, player.username);

                player.world = 1;

                this.world.sendForeignPlayerWorld(
                    message.username,
                    player.world
                );

                return {
                    success: true,
                    code: 0,
                    player
                };
            }
            case 'playerUpdate': {
                delete message.handler;

                message.username = this.playerUsernames.get(message.id);
                message.loginDate = Date.now();

                await this.savePlayer(message);

                return { success: true };
            }
            case 'playerLogout': {
                delete message.handler;

                // host is leaving, flush every dirty bot now
                this.flushBots(0);

                const player = this.players.get(message.username);

                player.world = 0;

                this.world.sendForeignPlayerWorld(
                    message.username,
                    player.world
                );

                return { success: true };
            }
            case 'playerGetWorlds': {
                const usernameWorlds = {};

                for (let username of message.usernames) {
                    username = username.toLowerCase();

                    const player = this.players.get(username);

                    if (player) {
                        usernameWorlds[username] = player.world;
                    } else {
                        usernameWorlds[username] = 0;
                    }
                }

                return { usernameWorlds };
            }
            case 'playerMessage': {
                const player = this.world.getPlayerByUsername(
                    message.toUsername
                );

                if (
                    !player ||
                    player.blockPrivateChat ||
                    player.ignores.indexOf(message.fromUsername) > -1
                ) {
                    return;
                }

                player.receivePrivateMessage(
                    message.fromUsername,
                    message.message
                );

                break;
            }
        }
    }

    async playerRegister({ username, password, ip }) {
        return this.sendAndReceive({
            handler: 'playerRegister',
            username,
            password,
            ip
        });
    }

    async playerLogin({ username, password, ip, reconnecting }) {
        return this.sendAndReceive({
            handler: 'playerLogin',
            username,
            password,
            ip,
            reconnecting
        });
    }

    playerLogout(username) {
        this.sendAndReceive({ handler: 'playerLogout', username });
    }

    playerMessage(fromUsername, toUsername, message) {
        this.sendAndReceive({
            handler: 'playerMessage',
            fromUsername,
            toUsername,
            message
        });
    }
}

module.exports = BrowserDataClient;
