const Bank = require('./bank');
const Captcha = require('@2003scape/rsc-captcha');
const party = require('../plugins/custom/party');
const clan = require('../plugins/custom/clan');
const npcKillCounters = require('../plugins/custom/npc-kill-counters');
const Character = require('./character');
const Duel = require('./duel');
const diag = require('./diag');
const Inventory = require('./inventory');
const LocalEntities = require('./local-entities');
const Trade = require('./trade');
const { IronmanMode, PLAYER_CLASSES } = require('./game-modes');
const log = require('bole')('player');
const prayers = require('@2003scape/rsc-data/config/prayers');
const quests = require('@2003scape/rsc-data/quests');
const regions = require('@2003scape/rsc-data/regions');
const skillNames = require('@2003scape/rsc-data/skill-names');
const { levelForExperience } = require('../skills');

const {
    rollPlayerNPCDamage,
    rollPlayerPlayerDamage,
    rollPlayerNPCRangedDamage,
    rangedHitExperience,
    awardStyleExperience
} = require('../combat');

const { weapons: rangedWeapons } = require('@2003scape/rsc-data/ranged');
const items = require('@2003scape/rsc-data/config/items');
const poison = require('../plugins/combat/poison');
const enchantedCrowns = require('../plugins/skills/enchanted-crowns');
const { getQOLConfig } = require('./qol-config');
const {
    isThrownWeapon,
    getThrowRadius
} = require('../plugins/combat/thrown-weapons');

// properties to save in the database
const SAVE_PROPERTIES = [
    'id',
    'rank',
    'x',
    'y',
    'questPoints',
    'combatStyle',
    'fatigue',
    'cameraAuto',
    'oneMouseButton',
    'soundOn',
    'blockChat',
    'blockPrivateChat',
    'blockTrade',
    'blockDuel',
    'skulled',
    'skills',
    'friends',
    'ignores',
    'questStages',
    'cache',
    'inventory',
    'bank',
    'muteEndDate',
    // per-character game mode (Ironman family). the one-xp flag lives in the cache.
    'ironManMode',
    'ironManRestriction',
    'ironManHCDeath'
];

// fatigue restored per tick by a sleeping bag / bed (half OpenRSC's scale).
const SLEEP_BAG_RATE = 4125;
const SLEEP_BED_RATE = 21000;
const MAX_FATIGUE = 75000;

// how many ticks to wait before re-generating health
const RESTORE_TICKS = 100;

const RAPID_RESTORE_ID = 6;
const RAPID_HEAL_ID = 7;
const PROTECT_FROM_MISSILES_ID = 13;

// skull lasts 20 minutes, as a tick countdown (640ms tick).
const SKULL_DURATION_TICKS = Math.round(1200000 / 640);

// how far back (ms) to look for the victim's prior attack before skulling the attacker.
const SKULL_RETALIATION_WINDOW_MS = 1200000;

// bones item dropped at the death tile on death, resolved by name.
const BONES_ID = (() => {
    for (let id = 0; id < items.length; id += 1) {
        if (items[id] && items[id].name.toLowerCase() === 'bones') {
            return id;
        }
    }

    throw new RangeError('player: could not resolve item "Bones"');
})();

class Player extends Character {
    constructor(world, socket, playerData) {
        super(world);

        this.socket = socket;

        this.username = playerData.username;
        this.lastIP = playerData.loginIP;
        this.loginDate = playerData.loginDate;
        this.muteEndDate = playerData.muteEndDate;

        // database ID
        this.id = playerData.id;

        // moderator or administrator?
        this.rank = playerData.rank;

        this.x = playerData.x;
        this.y = playerData.y;
        this.questPoints = playerData.questPoints;

        // real RSC didn't save this
        if (this.world.server.config.rememberCombatStyle) {
            this.combatStyle = playerData.combatStyle;
        } else {
            this.combatStyle = 0;
        }

        // 0 - 75000
        this.fatigue = playerData.fatigue;

        // game settings
        this.cameraAuto = playerData.cameraAuto;
        this.oneMouseButton = playerData.oneMouseButton;
        this.soundOn = playerData.soundOn;

        // privacy settings
        this.blockChat = playerData.blockChat;
        this.blockPrivateChat = playerData.blockPrivateChat;
        this.blockTrade = playerData.blockTrade;
        this.blockDuel = playerData.blockDuel;

        // ticks remaining until unskulled
        this.skulled = playerData.skulled;

        // per-character game mode defaults: mode None (0), restriction 1, HC death 0.
        this.ironManMode =
            typeof playerData.ironManMode === 'number'
                ? playerData.ironManMode
                : IronmanMode.None;
        this.ironManRestriction =
            typeof playerData.ironManRestriction === 'number'
                ? playerData.ironManRestriction
                : 1;
        this.ironManHCDeath =
            typeof playerData.ironManHCDeath === 'number'
                ? playerData.ironManHCDeath
                : 0;

        this.friends = playerData.friends;
        this.ignores = playerData.ignores;
        this.questStages = playerData.questStages;
        this.cache = playerData.cache;

        this.skills = playerData.skills;

        for (const skillName of Object.keys(this.skills)) {
            const skill = this.skills[skillName];

            // base = xp-derived level (with the Hitpoints floor); a stored class
            // head-start above it is kept, and a corrupt/missing base self-heals.
            const storedBase = Number.isInteger(skill.base) ? skill.base : 0;
            skill.base = Math.max(
                storedBase,
                levelForExperience(skillName, skill.experience)
            );

            // reset current to base only when invalid (non-integer or <= 0); a
            // damaged or boosted current is kept.
            if (!Number.isInteger(skill.current) || skill.current <= 0) {
                skill.current = skill.base;
            }
        }

        this.combatLevel = this.getCombatLevel();

        this.inventory = new Inventory(this, playerData.inventory);

        this.equipmentBonuses = {};
        this.inventory.updateEquipmentBonuses();

        this.bank = new Bank(this, playerData.bank);

        this.prayers = [];
        this.prayers.length = prayers.length;
        this.prayers.fill(false);

        // fixed-point prayer counter: 120 units = 1 prayer level. seeded lazily in
        // drainPrayer() when the integer level changes externally (login/recharge/potion).
        this.prayerStatePoints = 0;

        this.interfaceOpen = {
            bank: false,
            shop: false,
            sleep: false,
            appearance: false,
            trade: false,
            duel: false
        };

        // current shop open the player has open, if any
        this.shop = null;

        // trade object to manage trading
        this.trade = new Trade(this);

        // duel object to manage dueling (stake + rules)
        this.duel = new Duel(this);

        // incremented every time appearance changes
        this.appearanceIndex = 0;

        this.setAppearance(playerData);
        this.inventory.updateEquipmentSlots();

        this.localEntities = new LocalEntities(this);

        // { deltaX, deltaY } steps to move each tick
        this.walkQueue = [];

        // action to perform when path is done
        this.endWalkFunction = null;

        // Date.now() of last chat to prevent chat spam
        this.lastChat = 0;

        // Date.now() of last sleep word request
        this.lastSleepWord = 0;

        // ticks left until skills re-generate (restoreTicks = everything but prayer and hits)
        this.healTicks = RESTORE_TICKS;
        this.restoreTicks = RESTORE_TICKS;
        this.debuffTicks = RESTORE_TICKS;

        this.loggedIn = false;

        this.isWalking = false;
        this.endWalkLocked = false;
    }

    // send a packet if the socket is connected
    send(message) {
        if (!this.socket) {
            return;
        }

        this.world.server.outgoingMessages.push({
            socket: this.socket,
            message
        });

        log.debug(`sending message to ${this.socket}`, message);
    }

    // send server configs (opcode 19).
    sendServerConfigs() {
        this.send({
            type: 'serverConfigs',
            entries: require('./server-configs').serverConfigs(this.world)
        });
    }

    login() {
        this.world.addEntity('players', this);

        // tick-stamp; npcs wait 5 ticks before picking this player as a new aggro target.
        this.lastLogin = Date.now();

        // restore a persisted poison across logout, before anything else runs.
        poison.restorePoisonOnLogin(this);

        // world config flags go out first.
        this.sendServerConfigs();
        this.sendWorldInfo();
        this.sendGameSettings();
        this.sendPrivacySettings();
        this.sendStats();
        this.sendQuestList();
        this.sendFatigue();
        this.inventory.sendAll();
        this.sendEquipmentBonuses();
        this.sendFriendList();
        this.sendIgnoreList();

        // re-send appearance if they disconnected before finishing.
        if (!this.loginDate || this.cache.sendAppearance) {
            this.lock();
            this.sendAppearance();
        }

        this.message('Welcome to RuneScape!');

        this.localEntities.updateNearby('npcs');
        this.localEntities.updateNearby('players');
        this.localEntities.updateNearby('gameObjects');
        this.localEntities.updateNearby('wallObjects');
        this.localEntities.updateNearby('groundItems');

        // lifetime kill total for the side-menu HUD, shown from login.
        npcKillCounters.sendCounters(this, 0, 0);

        this.broadcastPlayerAppearance(true);

        this.loggedIn = true;
        log.info(`${this} logged in`);

        // a returning clan member gets the panel.
        clan.onLogin(this).catch((e) => log.error(e));

        // items waiting at the auction house.
        if (this.world.market) {
            this.world.market.notifyCollectiblesOnLogin(this);
        }
    }

    async logout() {
        if (!this.loggedIn) {
            return;
        }

        this.loggedIn = false;

        party.onLogout(this);
        clan.onLogout(this);

        if (this.dontAnswer) {
            this.dontAnswer();
        }

        if (this.interfaceOpen.shop) {
            this.exitShop(true);
        }

        if (this.interfaceOpen.trade) {
            this.trade.decline();
        }

        if (this.interfaceOpen.duel) {
            this.duel.decline();
        }

        this.send({ type: 'logoutSuccess' });

        await this.world.sleepTicks(2);
        this.socket.close();

        process.nextTick(() => {
            this.world.removeEntity('players', this);
            this.world.server.dataClient.playerLogout(this.username);
            log.info(`${this} logged out`);
        });

        await this.save();
    }

    async getFriendWorld(username) {
        const {
            usernameWorlds
        } = await this.world.server.dataClient.sendAndReceive({
            handler: 'playerGetWorlds',
            usernames: [username]
        });

        return usernameWorlds[username];
    }

    async addFriend(username) {
        username = username.toLowerCase();

        this.friends.push(username);

        const worldID = await this.getFriendWorld(username);

        if (worldID > 0) {
            this.sendFriendWorld(username, worldID);
        }
    }

    removeFriend(username) {
        username = username.toLowerCase();
        this.friends.splice(this.friends.indexOf(username), 1);
    }

    // send a private message to the player
    receivePrivateMessage(from, message) {
        this.send({ type: 'friendMessage', username: from, message });
    }

    // send a private message FROM the player to another player
    sendPrivateMessage(toUsername, message) {
        this.world.server.dataClient.playerMessage(
            this.username,
            toUsername,
            message
        );
    }

    addIgnore(username) {
        this.ignores.push(username);
    }

    removeIgnore(username) {
        this.ignores.splice(this.ignores.indexOf(username), 1);
    }

    async sendFriendList() {
        const {
            usernameWorlds
        } = await this.world.server.dataClient.sendAndReceive({
            handler: 'playerGetWorlds',
            usernames: this.friends
        });

        this.send({
            type: 'friendList',
            usernames: this.friends.map((username) => {
                let worldID = usernameWorlds[username];

                if (worldID === this.world.id) {
                    worldID = 255;
                } else if (worldID > 0) {
                    worldID += 219;
                }

                return { username, world: worldID };
            })
        });
    }

    sendIgnoreList() {
        this.send({
            type: 'ignoreList',
            usernames: this.ignores
        });
    }

    sendFriendWorld(username, worldID) {
        if (worldID === this.world.id) {
            worldID = 255;
        } else if (worldID > 0) {
            worldID += 219;
        }

        this.send({
            type: 'friendStatusChange',
            username,
            world: worldID
        });
    }

    // white server-sided message in the chat box
    message(...messages) {
        for (const message of messages) {
            this.send({ type: 'message', message: '' + message });
        }
    }

    // sent on login
    sendWorldInfo() {
        this.send({
            type: 'worldInfo',
            index: this.index,
            planeWidth: this.world.planeWidth,
            planeHeight: this.world.planeHeight,
            planeIndex: this.getElevation(),
            planeMultiplier: this.world.planeElevation
        });
    }

    sendGameSettings() {
        this.send({
            type: 'gameSettings',
            cameraAuto: this.cameraAuto,
            oneMouseButton: this.oneMouseButton,
            soundOn: this.soundOn
        });
    }

    sendPrivacySettings() {
        this.send({
            type: 'privacySettings',
            chat: this.blockChat,
            privateChat: this.blockPrivateChat,
            trade: this.blockTrade,
            duel: this.blockDuel
        });
    }

    sendEquipmentBonuses() {
        this.send({
            type: 'playerStatEquipmentBonus',
            ...this.equipmentBonuses
        });
    }

    // the appearance screen for new accounts or make-over mage
    sendAppearance() {
        this.lock();
        this.interfaceOpen.appearance = true;
        this.send({ type: 'appearance' });
    }

    // send our skills and quest points on login
    sendStats() {
        this.send({
            type: 'playerStatList',
            skills: this.skills,
            questPoints: this.questPoints
        });
    }

    sendQuestList() {
        this.send({
            type: 'playerQuestList',
            questCompletion: quests.map((name) => {
                return this.questStages[name] && this.questStages[name] === -1;
            })
        });
    }

    // update experience in a single skill
    sendExperience(skill) {
        const index = Object.keys(this.skills).indexOf(skill);

        if (index < 0) {
            throw new RangeError(`invalid skill ${skill}`);
        }

        this.send({
            type: 'playerStatExperienceUpdate',
            index,
            experience: this.skills[skill].experience
        });
    }

    // refresh player's fatigue
    sendFatigue() {
        this.send({
            type: 'playerStatFatigue',
            fatigue: Math.floor(this.fatigue / 100)
        });
    }

    // play sound (only for members clients)
    sendSound(soundName) {
        if (!this.world.members) {
            return;
        }

        this.send({ type: 'sound', soundName });
    }

    sendPrayerStatus() {
        this.send({ type: 'prayerStatus', prayersOn: this.prayers });
    }

    // the blue menu text prompting the player for a choice. if repeat is true,
    // the player will say the option they picked
    async ask(options, repeat = false) {
        this.send({
            type: 'optionList',
            options
        });

        const choice = await new Promise((resolve, reject) => {
            this.answer = resolve;

            this.dontAnswer = () => {
                this.answer = null;
                this.dontAnswer = null;

                if (this.interlocutor) {
                    this.disengage();
                }

                reject(new Error('interrupted ask'));
            };
        });

        this.answer = null;
        this.dontAnswer = null;

        if (choice > options.length) {
            throw new RangeError(
                `invalid option selected (${choice}/${options.length})`
            );
        }

        if (repeat) {
            await this.say(options[choice]);
        }

        return choice;
    }

    // open the welcome box
    sendWelcome() {
        const lastLoginDays = Math.floor(
            (Date.now() - this.loginDate) / (1000 * 60 * 60 * 24)
        );

        this.send({
            type: 'welcome',
            lastIP: this.lastIP,
            lastLoginDays,
            unreadMessages: 0
        });
    }

    // oh dear you are dead!
    sendDeath() {
        this.sendSound('death');
        this.send({ type: 'playerDied' });
    }

    // nearby real players who should receive a bot's updates. a bot has no client,
    // so its own known.players is empty; fan updates out via a 16-tile world scan.
    // [] for a non-bot.
    botViewers() {
        if (!this.isBot) {
            return [];
        }

        try {
            return this.getNearbyEntities('players', 16).filter(
                (player) =>
                    player !== this &&
                    !player.isBot &&
                    player.loggedIn &&
                    player.localEntities
            );
        } catch (e) {
            return []; // world scan unavailable, never break a broadcast
        }
    }

    // show bubble above player's head with certain item
    sendBubble(itemID) {
        const message = {
            index: this.index,
            id: itemID
        };

        this.localEntities.characterUpdates.playerBubbles.push(message);

        for (const player of this.localEntities.known.players) {
            player.localEntities.characterUpdates.playerBubbles.push(message);
        }

        for (const player of this.botViewers()) {
            player.localEntities.characterUpdates.playerBubbles.push(message);
        }
    }

    sendProjectile(victim, sprite = 0) {
        const message = {
            index: this.index,
            victimType: victim.constructor.name === 'NPC' ? 3 : 4,
            projectileType: sprite,
            victimIndex: victim.index
        };

        this.localEntities.characterUpdates.projectiles.push(message);

        for (const player of this.localEntities.known.players) {
            player.localEntities.characterUpdates.projectiles.push(message);
        }

        for (const player of this.botViewers()) {
            player.localEntities.characterUpdates.projectiles.push(message);
        }
    }

    // send the red hitsplat
    damage(damage) {
        // diag trace: every hit a human takes, with hp before it and the attacker
        if (!this.isBot && diag.on()) {
            console.log(
                `[diag] damage ${this} -${damage} hp ` +
                    `${this.skills.hits.current}/${this.skills.hits.base} ` +
                    `from=${this.opponent} at ${this.x},${this.y} ` +
                    `tick=${this.world.ticks}`
            );
        }

        const isDead = super.damage(damage);
        this.sendStats();
        return isDead;
    }

    // send the blue or red teleport bubbles to the nearby players
    sendTeleportBubble(x, y, type) {
        this.send({
            type: 'teleportBubble',
            bubbleType: +(type === 'telegrab'),
            x: x - this.x,
            y: y - this.y
        });
    }

    openShop(shopName) {
        const shop = this.world.shops.get(shopName);

        if (!shop) {
            throw new RangeError(`invalid shop name ${shopName}`);
        }

        this.lock();

        this.interfaceOpen.shop = true;
        shop.occupants.add(this);
        this.shop = shop;

        this.send({
            type: 'shopOpen',
            items: shop.items.map((item) => ({
                id: item.id,
                amount: item.amount,
                price: shop.getItemDeltaPrice(item)
            })),
            general: shop.definition.general,
            buyMultiplier: shop.definition.buyMultiplier,
            sellMultiplier: shop.definition.sellMultiplier
        });
    }

    exitShop(send = true) {
        this.interfaceOpen.shop = false;
        this.unlock();

        if (this.shop) {
            this.shop.occupants.delete(this);
            this.shop = null;
        }

        if (send) {
            this.send({ type: 'shopClose' });
        }
    }

    refreshSleepWord() {
        const { world } = this;
        const { word, image } = world.captcha.generate();

        this.sleepWord = word;
        this.sleepImage = Captcha.toByteArray(image);
    }

    openSleep(bed = true) {
        this.walkQueue.length = 0;
        this.lock();
        this.interfaceOpen.sleep = true;

        this.sleepBed = bed;
        this.refreshSleepWord();

        this.send({ type: 'sleepOpen', captchaBytes: this.sleepImage });
    }

    exitSleep(refreshed = true) {
        this.unlock();
        this.interfaceOpen.sleep = false;

        if (refreshed) {
            this.fatigue = this.displayFatigue;
            this.sendFatigue();
            this.message('You wake up - feeling refreshed');
        } else {
            this.message('You are unexpectedly awoken! You still feel tired');
        }

        this.send({ type: 'sleepClose' });
    }

    sendSleepIncorrect() {
        this.send({ type: 'sleepIncorrect' });
    }

    // update the player's avatar
    setAppearance(appearance) {
        this.appearanceIndex += 1;

        this.appearance = {
            hairColour: appearance.hairColour,
            topColour: appearance.topColour,
            trouserColour: appearance.trouserColour,
            headSprite: appearance.headSprite,
            bodySprite: appearance.bodySprite,
            skinColour: appearance.skinColour
        };

        this.animations[0] = this.appearance.headSprite;
        this.animations[1] = this.appearance.bodySprite;
        this.animations[2] = 3;
    }

    // send sprites, combat level, skull status, etc. to self and known players.
    broadcastPlayerAppearance(self = false) {
        const { world } = this;
        const update = this.getAppearanceUpdate();

        world.nextTick(() => {
            if (self) {
                this.localEntities.characterUpdates.playerAppearances.push(
                    update
                );
            }

            for (const player of this.localEntities.known.players) {
                player.localEntities.characterUpdates.playerAppearances.push(
                    update
                );
            }

            // also push bot appearance changes to nearby humans (see botViewers).
            for (const player of this.botViewers()) {
                player.localEntities.characterUpdates.playerAppearances.push(
                    update
                );
            }
        });
    }

    // send a message to nearby players (not self). dialogue true skips the chat log.
    broadcastChat(message, dialogue = false) {
        const update = { index: this.index, message, dialogue };

        if (dialogue) {
            this.localEntities.characterUpdates.playerChat.push(update);
        }

        for (const player of this.localEntities.known.players) {
            if (
                !player.blockChat &&
                player.ignores.indexOf(this.username) === -1
            ) {
                player.localEntities.characterUpdates.playerChat.push(update);
            }
        }

        // also deliver bot chat to nearby real players via a world scan (see botViewers).
        for (const player of this.botViewers()) {
            if (
                player.blockChat ||
                (player.ignores &&
                    player.ignores.indexOf(this.username) !== -1)
            ) {
                continue;
            }

            player.localEntities.characterUpdates.playerChat.push(update);
        }

        // let nearby bots hear real speech (not dialogue) and maybe react. best-effort.
        if (!dialogue && !this._reactionSpeak) {
            try {
                require('../plugins/custom/bots/hearing').dispatch(this, message);
            } catch (e) {
                // bots plugin absent or hearing failed, ignore
            }
        }
    }

    // broadcast the player changing sprites
    broadcastDirection() {
        // one direction broadcast per tick; a second in the same pass is skipped.
        if (!this.moveTick) {
            this.moveTick = this.world.ticks;
        } else {
            if (this.moveTick === this.world.ticks) {
                return;
            }

            this.moveTick = this.world.ticks;
        }

        for (const player of this.localEntities.known.players) {
            if (!player.loggedIn) {
                continue;
            }

            if (
                !player.localEntities.added.players.has(this) &&
                !player.localEntities.removed.players.has(this)
            ) {
                player.localEntities.spriteChanged.players.add(this);
            }
        }

        // also flag the bot's sprite change for nearby humans so its swings animate
        // (see botViewers).
        for (const player of this.botViewers()) {
            if (
                player.localEntities.known.players.has(this) &&
                !player.localEntities.added.players.has(this) &&
                !player.localEntities.removed.players.has(this)
            ) {
                player.localEntities.spriteChanged.players.add(this);
            }
        }
    }

    // broadcast the player moving in their current direction
    broadcastMove() {
        if (!this.moveTick) {
            this.moveTick = this.world.ticks;
        } else {
            if (this.moveTick === this.world.ticks) {
                throw new Error('two broadcasts in one tick');
            }

            this.moveTick = this.world.ticks;
        }

        for (const player of this.getNearbyEntities('players', 16)) {
            if (!player.loggedIn) {
                continue;
            }

            if (!player.localEntities.known.players.has(this)) {
                player.localEntities.added.players.add(this);
            } else {
                player.localEntities.moved.players.add(this);
            }
        }
    }

    broadcastDamage(damage) {
        const message = {
            index: this.index,
            damageTaken: damage,
            currentHealth: this.skills.hits.current,
            maxHealth: this.skills.hits.base
        };

        this.localEntities.characterUpdates.playerHits.push(message);

        // diag trace: the hitsplat queued for the human's own client
        if (!this.isBot && diag.on()) {
            console.log(
                `[diag] broadcastDamage ${this} idx=${this.index} dmg=${damage} ` +
                    `hp=${message.currentHealth}/${message.maxHealth} ` +
                    `known=${this.localEntities.known.players.size} ` +
                    `queued=${this.localEntities.characterUpdates.playerHits.length}`
            );
        }

        for (const player of this.localEntities.known.players) {
            player.localEntities.characterUpdates.playerHits.push(message);
        }

        // also draw a bot's hit splat and health bar for nearby humans (see
        // botViewers). not gated on blockChat/ignores, which suppress speech not
        // combat feedback.
        for (const player of this.botViewers()) {
            player.localEntities.characterUpdates.playerHits.push(message);
        }
    }

    // add experience to a skill, optionally with fatigue
    addExperience(skill, experience, useFatigue = true) {
        // artisan crown: 15% chance to double xp for 6 skills, before the fatigue
        // accrual, so fatigue reflects the doubled xp. the crown message and charge
        // are consumed after the "too tired" check.
        let doubledByArtisanCrown = false;
        if (
            useFatigue &&
            /^(herblaw|crafting|fletching|smithing|runecraft|cooking)$/.test(
                skill
            ) &&
            enchantedCrowns.shouldActivate(this, 'artisan')
        ) {
            experience *= 2;
            doubledByArtisanCrown = true;
        }

        // config.fatigue === false disables fatigue entirely (default on).
        if (useFatigue && this.world.server.config.fatigue !== false) {
            if (this.fatigue >= MAX_FATIGUE) {
                this.message(
                    '@gre@You are too tired to gain experience, get some rest!'
                );

                return false;
            }

            const fatigueRate = /^(attack|defense|strength|hits)$/.test(skill)
                ? 2.5
                : 4;

            this.fatigue = Math.min(
                MAX_FATIGUE,
                Math.floor(this.fatigue + fatigueRate * experience)
            );

            this.sendFatigue();
        }

        if (doubledByArtisanCrown) {
            this.message(
                'Your crown shines and you become more experienced'
            );
            enchantedCrowns.useCharge(this, 'artisan');
        }

        const { world } = this;

        experience *= world.server.config.experienceRate;

        const nextLevel = levelForExperience(
            skill,
            this.skills[skill].experience + experience
        );

        this.skills[skill].experience += experience;

        // only level up, never lower base, so a class head-start survives until xp catches up.
        if (nextLevel > this.skills[skill].base) {
            const levelDelta = nextLevel - this.skills[skill].base;

            this.skills[skill].base = nextLevel;
            this.skills[skill].current += levelDelta;

            // level-up message uses the skill's long name (defence, hitpoints
            // overrides), always singular "level".
            const levelUpSkillName =
                skill === 'defense'
                    ? 'defence'
                    : skill === 'hits'
                      ? 'hitpoints'
                      : skill;

            this.message(
                `@gre@You just advanced ${levelDelta} ${levelUpSkillName} level!`
            );

            this.sendStats();
            this.sendSound('advance');

            const combatLevel = this.getCombatLevel();

            if (this.combatLevel !== combatLevel) {
                this.combatLevel = combatLevel;
                this.broadcastPlayerAppearance(true);
            }
        } else {
            this.sendExperience(skill);
        }

        return true;
    }

    addQuestPoints(questPoints) {
        this.questPoints += questPoints;
        this.sendStats();
        this.sendQuestList();
    }

    // killer gains combat xp on a PvP kill: victim combat level + 10, split by the
    // killer's current melee style regardless of how the kill landed.
    // combatStyle: 0 controlled, 1 aggressive, 2 accurate, 3 defensive.
    givePvPCombatExperience(victor) {
        const experience = this.getCombatLevel() + 10;

        awardStyleExperience(victor, experience);
    }

    die() {
        // plugins reset their per-player state on death.
        this.world.callPlugin('onPlayerDeath', this).catch((e) => log.error(e));

        const { world } = this;

        // cure poison on death.
        poison.cure(this);

        const victor = this.opponent;

        if (victor) {
            victor.retreat();
        }

        // award PvP combat xp to the killer when both are players; PvE path untouched.
        if (victor && victor.username) {
            this.givePvPCombatExperience(victor);
        }

        this.healTicks = 0;

        // always drop a bones item at the death tile, before the duel/normal drop branch.
        world.addPlayerDrop(this, { id: BONES_ID }, this.x, this.y);

        // in an active duel the loser drops only staked items (to the winner) and
        // keeps the rest; skip the normal death drop.
        if (
            this.duel.isDuelActive() ||
            (victor && victor.duel && victor.duel.isDuelActive())
        ) {
            this.duel.dropOnDeath();

            // remove skull unconditionally on death.
            this.skulled = 0;

            const { spawnX, spawnY } = regions.lumbridge;
            this.teleport(spawnX, spawnY, false);

            for (const skill of Object.keys(this.skills)) {
                this.skills[skill].current = this.skills[skill].base;
            }

            this.sendStats();
            this.inventory.sendAll();
            this.sendDeath();

            if (victor) {
                victor.opponent = null;
                this.opponent = null;
            }

            // reset both duel sessions now the stake has moved
            this.duel.resetAll();

            return;
        }

        // "keep 3 most valuable" is skipped for a skulled player or Ultimate Ironman;
        // the Protect Item prayer's +1 is unconditional.
        const baseKeepCount =
            this.isSkulled() || this.isIronMan(IronmanMode.Ultimate) ? 0 : 3;

        const itemsKept = this.inventory.removeMostValuable(
            baseKeepCount + (this.prayers[8] ? 1 : 0)
        );

        for (const item of this.inventory.items) {
            world.addPlayerDrop(this, item);
        }

        this.inventory.items.length = 0;

        // remove skull unconditionally on death.
        this.skulled = 0;

        // a Hardcore Ironman who dies dangerously is downgraded to a standard Ironman.
        if (this.isIronMan(IronmanMode.Hardcore)) {
            this.updateHCIronman(IronmanMode.Ironman);
            this.sendIronManMode();

            log.info(`${this} has died and lost the HC Ironman Rank!`);
        }

        // a player who dies mid-tutorial respawns at the island start, not Lumbridge.
        if (typeof this.cache.tutorialStage === 'number') {
            this.teleport(216, 744, false);
        } else {
            const { spawnX, spawnY } = regions.lumbridge;
            this.teleport(spawnX, spawnY, false);
        }

        for (const skill of Object.keys(this.skills)) {
            this.skills[skill].current = this.skills[skill].base;
        }

        this.sendStats();
        this.inventory.sendAll();

        for (const item of itemsKept) {
            this.inventory.add(item);
        }

        this.sendDeath();

        if (victor) {
            victor.opponent = null;
            this.opponent = null;
        }
    }

    getAppearanceUpdate() {
        return {
            index: this.index,
            appearanceIndex: this.appearanceIndex,
            username: this.username,
            animations: this.animations,
            ...this.appearance,
            combatLevel: this.combatLevel,
            skulled: this.isSkulled()
        };
    }

    // per-character game mode (Ironman family): mode/restriction/HC-death accessors.

    getIronMan() {
        return this.ironManMode;
    }

    setIronMan(i) {
        this.ironManMode = i;
    }

    getIronManRestriction() {
        return this.ironManRestriction;
    }

    setIronManRestriction(i) {
        this.ironManRestriction = i;
    }

    getHCIronmanDeath() {
        return this.ironManHCDeath;
    }

    setHCIronmanDeath(i) {
        this.ironManHCDeath = i;
    }

    // set both the ironman mode and HC-death flag.
    updateHCIronman(int1) {
        this.ironManMode = int1;
        this.ironManHCDeath = int1;
    }

    // store the one-xp flag in the cache (present only when true).
    setOneXp(isOneXp) {
        if (this.cache.onexp_mode && !isOneXp) {
            delete this.cache.onexp_mode;
        } else if (!this.cache.onexp_mode && isOneXp) {
            this.cache.onexp_mode = true;
        }
    }

    isOneXp() {
        return !!this.cache.onexp_mode;
    }

    // true if the player is any Ironman type; with a mode arg, that specific mode.
    isIronMan(mode) {
        if (typeof mode === 'undefined') {
            return (
                this.getIronMan() === IronmanMode.Ironman ||
                this.getIronMan() === IronmanMode.Ultimate ||
                this.getIronMan() === IronmanMode.Hardcore
            );
        }

        if (
            mode === IronmanMode.Ironman &&
            this.getIronMan() === IronmanMode.Ironman
        ) {
            return true;
        } else if (
            mode === IronmanMode.Ultimate &&
            this.getIronMan() === IronmanMode.Ultimate
        ) {
            return true;
        } else if (
            mode === IronmanMode.Hardcore &&
            this.getIronMan() === IronmanMode.Hardcore
        ) {
            return true;
        } else if (
            mode === IronmanMode.Transfer &&
            this.getIronMan() === IronmanMode.Transfer
        ) {
            return true;
        }

        return false;
    }

    // notify the client of the ironman mode; no authentic packet exists, so it's a wire no-op.
    sendIronManMode() {
        // no SEND_IRONMAN opcode in the 204/177 protocol; mode is server-side only.
    }

    // apply the mode/class/one-xp choices from character creation, on first login only.
    applyCharacterCreation(message) {
        // only on the very first creation.
        if (this.loginDate) {
            return;
        }

        // apply the chosen class's starting stats and items.
        if (typeof message.chosenClass === 'number') {
            this.applyPlayerClass(message.chosenClass);
        }

        // ironman mode + one-xp toggle.
        if (typeof message.ironmanMode === 'number' && message.ironmanMode >= 0) {
            this.setIronMan(message.ironmanMode);
        }

        if (typeof message.isOneXp === 'number' && message.isOneXp >= 0) {
            this.setOneXp(message.isOneXp === 1);
        }
    }

    // set the class's starting skill levels/xp and add its starter items.
    applyPlayerClass(chosenClass) {
        const playerClass = PLAYER_CLASSES[chosenClass];

        if (!playerClass) {
            return;
        }

        for (const [skillIndex, experience, level] of playerClass.skills) {
            const skillName = skillNames[skillIndex];

            this.skills[skillName].experience = experience;
            this.skills[skillName].base = level;
            this.skills[skillName].current = level;
        }

        this.sendStats();

        // add each starter item, then send the inventory once.
        for (const { id, amount } of playerClass.items) {
            this.inventory.add({ id, amount });
        }

        this.inventory.sendAll();
    }

    // Ironman restriction predicates, applied at the trade / ground-item boundaries.

    // an Ironman can't loot player-drops, and nobody can take a Transfer Ironman's
    // items. returns a rejection message, or null if allowed.
    getIronManPickupBlock(groundItem) {
        const belongsToPlayer =
            !groundItem.owner || groundItem.owner === this.id;

        if (
            groundItem.inWilderness &&
            !belongsToPlayer &&
            groundItem.playerKill &&
            (this.isIronMan(IronmanMode.Ironman) ||
                this.isIronMan(IronmanMode.Ultimate) ||
                this.isIronMan(IronmanMode.Hardcore) ||
                this.isIronMan(IronmanMode.Transfer))
        ) {
            return "You're an Ironman, so you can't loot items from players.";
        }

        if (
            !belongsToPlayer &&
            (this.isIronMan(IronmanMode.Ironman) ||
                this.isIronMan(IronmanMode.Ultimate) ||
                this.isIronMan(IronmanMode.Hardcore) ||
                this.isIronMan(IronmanMode.Transfer))
        ) {
            return "You're an Ironman, so you can't take items that other players have dropped.";
        }

        if (!belongsToPlayer && groundItem.isTransferIronmanItem) {
            return 'That belongs to a Transfer Ironman player.';
        }

        return null;
    }

    // an Ironman may not initiate or be the target of a trade. returns a rejection
    // message, or null if allowed.
    getIronManTradeBlock(affectedPlayer) {
        if (
            this.isIronMan(IronmanMode.Ironman) ||
            this.isIronMan(IronmanMode.Ultimate) ||
            this.isIronMan(IronmanMode.Hardcore) ||
            this.isIronMan(IronmanMode.Transfer)
        ) {
            return 'You are an Ironman. You stand alone.';
        }

        if (
            affectedPlayer.isIronMan(IronmanMode.Ironman) ||
            affectedPlayer.isIronMan(IronmanMode.Ultimate) ||
            affectedPlayer.isIronMan(IronmanMode.Hardcore) ||
            affectedPlayer.isIronMan(IronmanMode.Transfer)
        ) {
            return `${affectedPlayer.username} is an Ironman. They stand alone.`;
        }

        return null;
    }

    // player's base level in a skill (stored base, before potion/beer modifiers).
    getBaseLevel(skillName) {
        return this.skills[skillName].base;
    }

    getCombatLevel() {
        const offence =
            (this.skills.attack.base + this.skills.strength.base) * 0.25;

        const defense =
            (this.skills.defense.base + this.skills.hits.base) * 0.25;

        const magic =
            (this.skills.prayer.base + this.skills.magic.base) * 0.125;

        const ranged = this.skills.ranged.base * 0.375;

        return Math.floor(defense + magic + Math.max(offence, ranged));
    }

    // total drain rate of the enabled prayers, added to the drain counter each tick.
    getPrayerDrainRate() {
        let drainEffect = 0;

        for (const [index, enabled] of this.prayers.entries()) {
            if (enabled) {
                drainEffect += prayers[index].drain;
            }
        }

        return drainEffect;
    }

    getElevation() {
        return Math.floor(this.y / this.world.planeElevation);
    }

    getFormattedUsername() {
        return this.username[0].toUpperCase() + this.username.slice(1);
    }

    isMale() {
        return this.appearance.bodySprite === 2;
    }

    isSkulled() {
        return this.skulled > 0;
    }

    // skull the attacker when it starts combat on another player, unless the
    // victim attacked it within the last 20 minutes.
    setSkulledOn(victim) {
        const lastTime = this.lastAttackedByTime(victim);

        victim.recordAttackedBy(this);

        if (Date.now() - lastTime > SKULL_RETALIATION_WINDOW_MS) {
            this.skulled = SKULL_DURATION_TICKS;
            this.broadcastPlayerAppearance(true);
        }
    }

    // record that attacker just attacked this player.
    recordAttackedBy(attacker) {
        if (!this.attackedByLog) {
            this.attackedByLog = new Map();
        }

        this.attackedByLog.set(attacker.id, Date.now());
    }

    // when attacker last attacked this player (0 if never).
    lastAttackedByTime(attacker) {
        if (!this.attackedByLog) {
            return 0;
        }

        return this.attackedByLog.get(attacker.id) || 0;
    }

    isMuted() {
        if (this.muteEndDate === 0) {
            return false;
        }

        // permanent mute
        if (this.muteEndDate === -1) {
            return true;
        }

        return Date.now() < this.muteEndDate;
    }

    isAdministrator() {
        return this.rank >= 3;
    }

    isTired(offset = 0) {
        return this.fatigue >= MAX_FATIGUE - offset;
    }

    canChat() {
        return !this.isMuted() && Date.now() - this.lastChat > 150;
    }

    hasInterfaceOpen() {
        for (const value of Object.values(this.interfaceOpen)) {
            if (value) {
                return true;
            }
        }

        return false;
    }

    // enter a wall object with a blocked doorframe and close it
    async enterDoor(door, doorframeID = 11, delay = 1) {
        const { world, direction: oldDirection } = this;
        const { id: doorID, direction: doorDirection } = door;

        const doorframe = world.replaceEntity('wallObjects', door, doorframeID);
        this.sendSound('opendoor');

        if (doorDirection === 0) {
            this.walkTo(0, this.y < doorframe.y ? 1 : -1);
        } else if (doorDirection === 1) {
            this.walkTo(this.x < doorframe.x ? 1 : -1, 0);
        } else {
            this.walkTo(
                this.x < doorframe.x ? 1 : -1,
                this.y < doorframe.y ? 1 : -1
            );
        }

        await world.sleepTicks(1);

        if (!this.isWalking && !this.opponent) {
            this.direction = oldDirection;
            this.broadcastDirection();
        }

        await world.sleepTicks(delay);
        world.replaceEntity('wallObjects', doorframe, doorID);
    }

    // enter a gate with blocked open gate and close it
    async enterGate(gate, openGateID = 181) {
        const { world } = this;
        const { id: gateID, direction } = gate;

        let deltaX = 0;
        let deltaY = 0;

        if (direction === 0) {
            if (this.x >= gate.x) {
                await this.walkToPoint(gate.x, gate.y, true);
                deltaX = -1;
            } else {
                await this.walkToPoint(gate.x - 1, gate.y, true);
                deltaX = 1;
            }
        } else if (direction === 4) {
            if (this.x <= gate.x) {
                await this.walkToPoint(gate.x, gate.y, true);
                deltaX = 1;
            } else {
                await this.walkToPoint(gate.x + 1, gate.y, true);
                deltaX = -1;
            }
        } else if (direction === 6) {
            if (this.y >= gate.y) {
                await this.walkToPoint(gate.x, gate.y, true);
                deltaY -= 1;
            } else {
                await this.walkToPoint(gate.x, gate.y - 1, true);
                deltaY += 1;
            }
        }

        this.faceDirection(0, 0);
        await world.sleepTicks(1);

        const openGate = world.replaceEntity('gameObjects', gate, openGateID);

        this.walkTo(deltaX, deltaY);
        this.message('The gate swings open');
        this.sendSound('opendoor');

        await world.sleepTicks(1);

        world.replaceEntity('gameObjects', openGate, gateID);

        this.faceDirection(0, 0);
        await world.sleepTicks(1);
    }

    // climb ladders or stairs (go up or down a plane)
    climb(gameObject, up = false) {
        const { world } = this;
        const direction = this.direction;
        const height = gameObject.definition.height;

        if (height > 1) {
            let xOffset = 0;
            let yOffset = 0;

            switch (gameObject.direction) {
                case 0:
                    yOffset = up ? height : -1;
                    break;
                case 2:
                    xOffset = up ? -height : 1;
                    break;
                case 4:
                    yOffset = up ? -1 : height;
                    break;
                case 6:
                    xOffset = up ? -1 : height;
                    break;
            }

            this.teleport(
                gameObject.x + xOffset,
                gameObject.y + world.planeElevation * (up ? 1 : -1) + yOffset
            );
        } else {
            this.teleport(
                this.x,
                this.y + world.planeElevation * (up ? 1 : -1)
            );
        }

        this.direction = direction;
    }

    teleport(x, y, bubble = false) {
        const { world } = this;

        if (y < 0) {
            y += this.world.planeElevation * 4;
        }

        y = y % (this.world.planeElevation * 4);

        this.lock();
        this.endWalkFunction = null;
        this.walkQueue.length = 0;

        if (bubble) {
            this.sendTeleportBubble(this.x, this.y);

            for (const player of this.localEntities.known.players) {
                player.sendTeleportBubble(this.x, this.y);
                player.localEntities.removed.players.add(this);
            }

            // also show a bot's teleport bubble and tile-removal to nearby humans (see botViewers).
            for (const player of this.botViewers()) {
                player.sendTeleportBubble(this.x, this.y);
                player.localEntities.removed.players.add(this);
            }
        }

        world.nextTick(() => {
            this.faceDirection(0, 0);
        });

        // diag trace: every teleport of a human, with the caller
        if (!this.isBot && diag.on()) {
            console.log(
                `[diag] teleport ${this} ${this.x},${this.y} -> ${x},${y} ` +
                    `bubble=${bubble} tick=${world.ticks} hp=` +
                    `${this.skills.hits.current}/${this.skills.hits.base}\n` +
                    new Error().stack.split('\n').slice(2, 9).join('\n')
            );
        }

        if (this.x === x && this.y === y) {
            return;
        }

        this.localEntities.clear();

        this.world.setTickTimeout(() => {
            // non-finite target: log it and keep the current tile
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                console.log(
                    `[diag] teleport ${this} REFUSED non-finite ${x},${y} ` +
                        `(staying at ${this.x},${this.y})`
                );
            } else {
                this.x = x;
                this.y = y;
            }

            if (!this.isBot && diag.on()) {
                console.log(
                    `[diag] teleport ${this} landed ${this.x},${this.y} ` +
                        `tick=${world.ticks}`
                );
            }

            this.sendWorldInfo();
            this.localEntities.updateNearby('npcs');
            this.localEntities.updateNearby('gameObjects');
            this.localEntities.updateNearby('wallObjects');

            this.unlock();
        }, 2);
    }

    // separate from restoreSkills (rapid heal vs rapid restore prayers).
    restoreHealth() {
        if (this.healTicks > 0) {
            this.healTicks -= 1 + Number(this.prayers[RAPID_HEAL_ID]);
            return false;
        }

        this.healTicks = RESTORE_TICKS;

        if (this.skills.hits.current < this.skills.hits.base) {
            this.skills.hits.current += 1;
            return true;
        }

        return false;
    }

    restoreSkills() {
        if (this.restoreTicks > 0) {
            this.restoreTicks -= 1 + Number(this.prayers[RAPID_RESTORE_ID]);
            return false;
        }

        let updated = false;

        this.restoreTicks = RESTORE_TICKS;

        for (const [skillName, { base, current }] of Object.entries(
            this.skills
        )) {
            if (skillName === 'hits' || skillName === 'prayer') {
                continue;
            }

            if (current < base) {
                this.skills[skillName].current += 1;
                updated = true;
            }
        }

        return updated;
    }

    debuffSkills() {
        // drain inflated stats back to normal; Rapid Restore doubles the speed.
        if (this.debuffTicks > 0) {
            this.debuffTicks -= 1 + Number(this.prayers[RAPID_RESTORE_ID]);
            return;
        }

        let updated = false;

        this.debuffTicks = RESTORE_TICKS;

        for (const [skillName, { base, current }] of Object.entries(
            this.skills
        )) {
            if (skillName === 'prayer') {
                continue;
            }

            if (current > base) {
                this.skills[skillName].current -= 1;
                updated = true;
            }
        }

        return updated;
    }

    // convert the active prayers' drain rate to fixed-point points each tick (120 =
    // 1 level): pointDrain = ceil(drainRate * 120 / (300 * (1 + (bonus - 1)/32))),
    // bonus = max(equipment prayer bonus, 1). displayed level = ceil(points / 120), only lowered.
    drainPrayer() {
        if (this.skills.prayer.current <= 0) {
            return false;
        }

        const drainRate = this.getPrayerDrainRate();

        if (drainRate < 1) {
            return false;
        }

        // re-seed the counter when the integer level changed externally (login/recharge/potion).
        if (
            Math.ceil(this.prayerStatePoints / 120) !==
            this.skills.prayer.current
        ) {
            this.prayerStatePoints = this.skills.prayer.current * 120;
        }

        const bonus = Math.max(this.equipmentBonuses.prayer, 1);
        const pointDrain = Math.ceil(
            (drainRate * 120) / (300 * (1 + (bonus - 1) / 32))
        );

        this.prayerStatePoints = Math.max(
            this.prayerStatePoints - pointDrain,
            0
        );

        const newLevel = Math.ceil(this.prayerStatePoints / 120);

        let updated = false;

        if (newLevel < this.skills.prayer.current) {
            this.skills.prayer.current = newLevel;
            updated = true;
        }

        if (this.skills.prayer.current <= 0) {
            this.message(
                'You have run out of prayer points. Return to a church to ' +
                    'recharge'
            );

            for (let i = 0; i < this.prayers.length; i += 1) {
                this.prayers[i] = false;
            }

            this.sendPrayerStatus();
        }

        return updated;
    }

    // run each tick to debuff skills, drain prayer etc.
    normalizeSkills() {
        if (
            this.restoreHealth() ||
            this.restoreSkills() ||
            this.debuffSkills() ||
            this.drainPrayer()
        ) {
            this.sendStats();
        }
    }

    // send the fatigue as it lowers in the client's sleep screen
    refreshDisplayFatigue() {
        if (this.displayFatigue > 0) {
            this.displayFatigue -= this.sleepBed
                ? SLEEP_BED_RATE
                : SLEEP_BAG_RATE;

            if (this.displayFatigue < 0) {
                this.displayFatigue = 0;
            }
        }

        this.send({
            type: 'playerStatFatigueAsleep',
            fatigue: Math.floor(this.displayFatigue / 100)
        });
    }

    // run during each tick of melee combat
    fight() {
        // combat rounds: 3-1 tick pattern (every 4 ticks/side), 2-2 for an npc vs
        // player. fall back to 4 if unset.
        if (this.fightStage % (this.combatRoundPeriod || 4) === 0) {
            const isPlayer = !!this.opponent.username;

            const damage = isPlayer
                ? rollPlayerPlayerDamage(this, this.opponent)
                : rollPlayerNPCDamage(this, this.opponent);

            const opponent = this.opponent;
            this._lastCombatType = 'melee'; // for on-kill XP routing
            const died = opponent.damage(damage, this);

            // poison runs right after a non-fatal hit lands. only the PvP
            // poisoned-weapon path applies here; poisoning npcs is want_poison_npcs-gated.
            if (!died) {
                poison.onMeleeHit(this, opponent, this.world.server.config);
            }

            this.fightStage = 1;
            this.combatRounds += 1;
        } else {
            this.fightStage += 1;
        }
    }

    async shootRanged(character) {
        if (typeof this.rangedTimeout === 'number') {
            this.world.clearTickTimeout(this.rangedTimeout);
            delete this.rangedTimeout;
        }

        this.walkQueue.length = 0;

        if (
            this.getDistance(character) <= 1.5 &&
            this.withinLineOfSight(character)
        ) {
            return character.attack(this);
        }

        const rangedWeapon = this.inventory.getRangedWeapon();

        if (!rangedWeapon || character.skills.hits.current <= 0) {
            return false;
        }

        const { world } = this;

        // a thrown weapon's reach is a fixed radius (3 tiles, 4 for darts), not the
        // bow/crossbow range field.
        const range = isThrownWeapon(rangedWeapon.id)
            ? getThrowRadius(rangedWeapon.id)
            : rangedWeapons[rangedWeapon.id].range;

        if (!this.withinRange(character, range * 2, true)) {
            await world.sleepTicks(1);
            await this.chase(character);

            if (!this.withinRange(character, range * 2, true)) {
                this.message("I can't get close enough");
                return false;
            }
        }

        if (!this.withinLineOfSight(character, true)) {
            this.message("I can't get a clear shot from here");
            this.rangedTimeout = -1;

            this.world.setTickTimeout(() => {
                delete this.rangedTimeout;
            }, 2);

            return false;
        }

        // a player target with Protect from Missiles blocks the shot before ammo is taken.
        if (character.username && character.prayers[PROTECT_FROM_MISSILES_ID]) {
            this.message('Player has a protection from missiles prayer active!');
            return false;
        }

        const ammunitionID = this.inventory.getAmmunitionID();

        if (ammunitionID === -1) {
            return false;
        }

        this.faceDirection(-1, 1);

        this.inventory.remove(ammunitionID);

        // lose the arrow on a flat 6/7 chance, regardless of damage.
        if (Math.random() < 6 / 7) {
            // stackable ammo (arrows/bolts) merges into an existing pile;
            // non-stackable thrown items each drop a new ground item.
            const [existingStack] = items[ammunitionID].stackable
                ? world.groundItems
                      .getAtPoint(character.x, character.y)
                      .filter(
                          ({ id, owner }) =>
                              id === ammunitionID && owner === this.id
                      )
                : [];

            if (existingStack) {
                existingStack.amount += 1;
            } else {
                world.addPlayerDrop(
                    this,
                    { id: ammunitionID },
                    character.x,
                    character.y
                );
            }
        }

        if (!this.inventory.has(ammunitionID)) {
            this.message("I've run out of ammo!");
        }

        // TODO player damage
        const damage = rollPlayerNPCRangedDamage(this, character);

        this._lastCombatType = 'ranged'; // on-kill XP -> Ranged (not melee)

        // per-hit ranged xp, only vs a player or with ranged_gives_xp_hit on (npc
        // xp comes at kill time). uses the target's hits before this hit.
        if (
            damage > 0 &&
            (!!character.username ||
                getQOLConfig(this.world.server.config).rangedGivesXpHit)
        ) {
            this.addExperience('ranged', rangedHitExperience(character, damage));
        }

        character.damage(damage, this);

        // apply ranged poison from the fired ammo, after the damage roll (hit or
        // miss, even on a kill; no antidote check). rsc-data names poisoned ammo
        // "Poisoned <name>" or "Poison <name>", so match on 'poison'.
        const ammoDef = items[ammunitionID];

        if (ammoDef && ammoDef.name.toLowerCase().includes('poison')) {
            if (character.username) {
                // vs a player: 1-in-8, power 20.
                if (Math.floor(Math.random() * 8) === 0) {
                    poison.setPoisonDamage(character, 20);
                    poison.startPoisonEvent(character);
                }
            } else if (
                getQOLConfig(this.world.server.config).wantPoisonNpcs &&
                (character.poisonPower || 0) < 10 &&
                Math.floor(Math.random() * 50) === 0
            ) {
                // vs an npc: gated on want_poison_npcs (default off), power 60 plus a message.
                poison.setPoisonDamage(character, 60);
                poison.startPoisonEvent(character);
                this.message(
                    '@gr3@You @gr2@have @gr1@poisioned @gr2@the ' +
                        `${character.definition.name}!`
                );
            }
        }

        this.sendProjectile(character, 2);

        if (
            !character.locked &&
            character.constructor.name === 'NPC' &&
            character.chasing !== this
        ) {
            character
                .attack(this)
                .then(() => {
                    character.retreatTicks = 4;
                })
                .catch((err) => log.error(err));
        }

        if (this.inventory.getAmmunitionID(false) === -1) {
            return true;
        }

        this.rangedTimeout = world.setTickTimeout(() => {
            this.shootRanged(character);
        }, 4);

        return true;
    }

    // the half of sendRegions() a bot still needs (bots skip sendRegions, no socket):
    //   1. drain its own characterUpdates arrays, which would otherwise grow forever.
    //   2. register it in npc.knownPlayers so nearby npcs fight/walk/aggro it.
    // this wakes npcs around every bot; gating the local.added.npcs block below reverts it.
    tickBotLocalEntities() {
        const local = this.localEntities;
        const updates = local.characterUpdates;

        updates.playerAppearances.length = 0;
        updates.playerChat.length = 0;
        updates.playerBubbles.length = 0;
        updates.playerHits.length = 0;
        updates.npcChat.length = 0;
        updates.npcHits.length = 0;
        updates.projectiles.length = 0;

        if (local.added.npcs.size || local.removed.npcs.size) {
            for (const npc of local.added.npcs) {
                npc.knownPlayers.add(this);
            }

            for (const npc of local.removed.npcs) {
                npc.knownPlayers.delete(this);
            }

            local.updateKnown('npcs');
        }

        local.moved.npcs.clear();
        local.spriteChanged.npcs.clear();
    }

    tick() {
        this.normalizeSkills();

        // poison ticks every 32 ticks, separate from skill restoration.
        poison.tickPoison(this);

        // count the skull duration down each tick and clear it when it expires.
        if (this.skulled > 0) {
            this.skulled -= 1;

            if (this.skulled === 0) {
                this.broadcastPlayerAppearance(true);
            }
        }

        if (this.interfaceOpen.sleep) {
            this.refreshDisplayFatigue();
        }

        if (this.opponent) {
            if (this.opponent.skills.hits.current > 0) {
                this.fight();
            } else {
                // opponent dead/removed: release so it can't stay locked in an unresolvable fight.
                this.opponent = null;
            }
        }

        // a bot's own local-entity view is never sent anywhere and nothing reads
        // it, so skip the per-tick scan/diff/appearance build. humans still see the
        // bot via their own localEntities.
        // npcs are discovered from the player's side every tick (walking players and bots alike).
        this.localEntities.updateNearby('npcs');
        if (!this.isBot) {
            this.localEntities.updateNearby('players');
            this.localEntities.updateNearby('groundItems');
        } else {
            this.tickBotLocalEntities();
        }

        if (this.walkQueue.length && !this.locked) {
            const { deltaX, deltaY } = this.walkQueue.shift();

            if (this.canWalk(deltaX, deltaY)) {
                this.walkTo(deltaX, deltaY);
            } else {
                this.following = null;
                this.walkQueue.length = 0;
                this.faceDirection(deltaX * -1, deltaY * -1);
            }
        }

        if (!this.locked && this.following && this.following.walkQueue.length) {
            const { x, y } = this.following.getBackPoint();
            this.walkQueue = this.getPointSteps(x, y, false);
        }

        if (!this.walkQueue.length && !this.isWalking) {
            this.walkAction = false;

            if (this.endWalkFunction) {
                if (this.dontAnswer) {
                    this.dontAnswer();
                }

                if (this.locked || this.endWalkLocked) {
                    this.endWalkFunction = null;
                    return;
                }

                this.endWalkLocked = true;

                this.endWalkFunction()
                    .catch((e) => {
                        this.endWalkLocked = false;
                        this.walkAction = false;
                        log.error(e);
                    })
                    .then(() => {
                        this.endWalkLocked = false;
                        this.walkAction = false;
                    });

                this.endWalkFunction = null;
            }
        }

        this.isWalking = false;
    }

    async save() {
        let message = { handler: 'playerUpdate' };

        for (const property of SAVE_PROPERTIES) {
            if (typeof this.property === 'object') {
                message[property] = { ...this[property] };
            } else {
                message[property] = this[property];
            }
        }

        message = { ...message, ...this.appearance };

        // persist base alongside current/experience so a class head-start and the
        // Hitpoints floor survive a reload. message.skills is read-only here.
        await this.world.server.dataClient.sendAndReceive(message);
    }

    toString() {
        return `[Player (username=${this.username}, x=${this.x}, y=${this.y})]`;
    }

    walkTo(deltaX, deltaY) {
        if (this.dontAnswer) {
            this.dontAnswer();
        }

        super.walkTo(deltaX, deltaY);

        this.localEntities.updateNearby('npcs');

        const gameObjectViewport = this.localEntities.viewports.gameObjects / 2;

        if (
            this.x % gameObjectViewport === 0 ||
            this.y % gameObjectViewport === 0
        ) {
            this.localEntities.updateNearby('gameObjects');
        }

        const wallObjectViewport = this.localEntities.viewports.wallObjects / 2;

        if (
            this.x % wallObjectViewport === 0 ||
            this.y % wallObjectViewport === 0
        ) {
            this.localEntities.updateNearby('wallObjects');
        }
    }

    lock() {
        super.lock();

        if (typeof this.rangedTimeout === 'number') {
            this.world.clearTickTimeout(this.rangedTimeout);
            delete this.rangedTimeout;
        }

        this.walkQueue.length = 0;
    }
}

module.exports = Player;
