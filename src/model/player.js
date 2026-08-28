const Bank = require('./bank');
const Captcha = require('@2003scape/rsc-captcha');
const party = require('../plugins/custom/party');
const clan = require('../plugins/custom/clan');
const npcKillCounters = require('../plugins/custom/npc-kill-counters');
const Character = require('./character');
const Duel = require('./duel');
const Inventory = require('./inventory');
const LocalEntities = require('./local-entities');
const Trade = require('./trade');
const { IronmanMode, PLAYER_CLASSES } = require('./game-modes');
const log = require('bole')('player');
const prayers = require('@2003scape/rsc-data/config/prayers');
const quests = require('@2003scape/rsc-data/quests');
const regions = require('@2003scape/rsc-data/regions');
const skillNames = require('@2003scape/rsc-data/skill-names');
const { formatSkillName, levelForExperience } = require('../skills');

const {
    rollPlayerNPCDamage,
    rollPlayerPlayerDamage,
    rollPlayerNPCRangedDamage
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
    // per-character game mode (Ironman family)
    'ironManMode',
    'ironManRestriction',
    'ironManHCDeath'
];

// fatigue reduction from sleeping bags/beds
const SLEEP_BAG_RATE = 4125;
const SLEEP_BED_RATE = 21000;
const MAX_FATIGUE = 75000;

// ticks between health regen
const RESTORE_TICKS = 100;

const RAPID_RESTORE_ID = 6;
const RAPID_HEAL_ID = 7;

// Bones item id
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

        // optionally restore combat style
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

        // per-character game mode defaults
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

            // base = max(stored base, xp level)
            const storedBase = Number.isInteger(skill.base) ? skill.base : 0;
            skill.base = Math.max(
                storedBase,
                levelForExperience(skillName, skill.experience)
            );

            // reset an invalid current to base
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

        // fixed-point prayer counter: 120 units = 1 level
        this.prayerStatePoints = 0;

        this.interfaceOpen = {
            bank: false,
            shop: false,
            sleep: false,
            appearance: false,
            trade: false,
            duel: false
        };

        // open shop, if any
        this.shop = null;

        // trade object
        this.trade = new Trade(this);

        // duel object (stake + rules)
        this.duel = new Duel(this);

        // appearance change counter
        this.appearanceIndex = 0;

        this.setAppearance(playerData);
        this.inventory.updateEquipmentSlots();

        this.localEntities = new LocalEntities(this);

        // queued { deltaX, deltaY } steps
        this.walkQueue = [];

        // action to perform when path is done
        this.endWalkFunction = null;

        // Date.now() of last chat
        this.lastChat = 0;

        // Date.now() of last sleep word request
        this.lastSleepWord = 0;

        // ticks until skill regen
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

    login() {
        this.world.addEntity('players', this);

        // login tick-stamp for aggro grace
        this.lastLogin = Date.now();

        // restore persisted poison
        poison.restorePoisonOnLogin(this);

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

        // resend appearance if unfinished
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

        // lifetime kill total for the side-menu HUD
        npcKillCounters.sendCounters(this, 0, 0);

        this.broadcastPlayerAppearance(true);

        this.loggedIn = true;
        log.info(`${this} logged in`);
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

    // option-list prompt
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
    }

    // send the red hitsplat
    damage(damage) {
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

    // broadcast appearance to self and nearby players
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
        });
    }

    // broadcast chat to nearby players
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
    }

    // broadcast the player changing sprites
    broadcastDirection() {
        // temp debug
        if (!this.moveTick) {
            this.moveTick = this.world.ticks;
        } else {
            if (this.moveTick === this.world.ticks) {
                throw new Error('two broadcasts in one tick');
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

        for (const player of this.localEntities.known.players) {
            player.localEntities.characterUpdates.playerHits.push(message);
        }
    }

    // add experience to a skill, optionally with fatigue
    addExperience(skill, experience, useFatigue = true) {
        // Crown of the Artisan: double XP for 6 skills
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

        // config.fatigue === false disables fatigue
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

        // only raise base, never lower it
        if (nextLevel > this.skills[skill].base) {
            const levelDelta = nextLevel - this.skills[skill].base;

            this.skills[skill].base = nextLevel;
            this.skills[skill].current += levelDelta;

            // sic
            this.message(
                `@gre@You just advanced ${levelDelta} ` +
                    `${formatSkillName(skill).toLowerCase()} level!`
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

    // PvP kill XP = victim combatLevel + 10
    givePvPCombatExperience(victor) {
        // exp = victim (this) combat level + 10
        const experience = this.getCombatLevel() + 10;

        // hits always gains 1x
        victor.addExperience('hits', experience);

        switch (victor.combatStyle) {
            case 0: // controlled -> attack, defense, strength each 1x
                victor.addExperience('attack', experience);
                victor.addExperience('defense', experience);
                victor.addExperience('strength', experience);
                break;
            case 1: // aggressive -> strength 3x
                victor.addExperience('strength', experience * 3);
                break;
            case 2: // accurate -> attack 3x
                victor.addExperience('attack', experience * 3);
                break;
            case 3: // defensive -> defense 3x
                victor.addExperience('defense', experience * 3);
                break;
        }
    }

    die() {
        const { world } = this;

        // clear poison on death
        poison.cure(this);

        const victor = this.opponent;

        if (victor) {
            victor.retreat();
        }

        // award PvP combat XP to the killer
        if (victor && victor.username) {
            this.givePvPCombatExperience(victor);
        }

        this.healTicks = 0;

        // drop bones at the death tile
        world.addPlayerDrop(this, { id: BONES_ID }, this.x, this.y);

        // duel death: only staked items transfer
        if (
            this.duel.isDuelActive() ||
            (victor && victor.duel && victor.duel.isDuelActive())
        ) {
            this.duel.dropOnDeath();

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

            // reset both duel sessions
            this.duel.resetAll();

            return;
        }

        // keep 3 most valuable (0 for UIM), Protect Item adds 1
        const baseKeepCount = this.isIronMan(IronmanMode.Ultimate) ? 0 : 3;

        const itemsKept = this.inventory.removeMostValuable(
            baseKeepCount + (this.prayers[8] ? 1 : 0)
        );

        for (const item of this.inventory.items) {
            world.addPlayerDrop(this, item);
        }

        this.inventory.items.length = 0;

        // Hardcore Ironman death: downgrade to standard
        if (this.isIronMan(IronmanMode.Hardcore)) {
            this.updateHCIronman(IronmanMode.Ironman);
            this.sendIronManMode();

            log.info(`${this} has died and lost the HC Ironman Rank!`);
        }

        // respawn mid-tutorial deaths at the island
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

    // per-character game mode (Ironman family)

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

    // set ironman mode and HC-death flag
    updateHCIronman(int1) {
        this.ironManMode = int1;
        this.ironManHCDeath = int1;
    }

    // toggle one-xp flag in the cache
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

    // is the player any Ironman type
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

    // notify client of ironman mode
    sendIronManMode() {
        // no authentic ironman packet
    }

    // apply character-creation choices on first login
    applyCharacterCreation(message) {
        // first creation only
        if (this.loginDate) {
            return;
        }

        // apply chosen class stats + items
        if (typeof message.chosenClass === 'number') {
            this.applyPlayerClass(message.chosenClass);
        }

        // apply ironman mode + one-xp
        if (typeof message.ironmanMode === 'number' && message.ironmanMode >= 0) {
            this.setIronMan(message.ironmanMode);
        }

        if (typeof message.isOneXp === 'number' && message.isOneXp >= 0) {
            this.setOneXp(message.isOneXp === 1);
        }
    }

    // set class starting stats + starter items
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

        // add starter items, then send inventory
        for (const { id, amount } of playerClass.items) {
            this.inventory.add({ id, amount });
        }

        this.inventory.sendAll();
    }

    // Ironman restriction predicates

    // Ironman pickup block: rejection message or null
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

    // Ironman trade block: rejection message or null
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

    // base level in a skill (no modifiers)
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

    // total drain rate of enabled prayers
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
        return false;
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
            // restore facing direction
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
        }

        world.nextTick(() => {
            this.faceDirection(0, 0);
        });

        if (this.x === x && this.y === y) {
            return;
        }

        this.localEntities.clear();

        this.world.setTickTimeout(() => {
            this.x = x;
            this.y = y;

            this.sendWorldInfo();
            this.localEntities.updateNearby('npcs');
            this.localEntities.updateNearby('gameObjects');
            this.localEntities.updateNearby('wallObjects');

            this.unlock();
        }, 2);
    }

    // regenerate hits
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
        if (this.debuffTicks > 0) {
            this.debuffTicks -= 1;
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

    // drain prayer points each tick
    drainPrayer() {
        if (this.skills.prayer.current <= 0) {
            return false;
        }

        const drainRate = this.getPrayerDrainRate();

        if (drainRate < 1) {
            return false;
        }

        // re-seed counter when prayer level changed externally
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

    // debuff skills, drain prayer, etc.
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

    // update fatigue on the sleep screen
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

    // melee combat tick
    fight() {
        if (this.fightStage % 3 === 0) {
            const isPlayer = !!this.opponent.username;

            const damage = isPlayer
                ? rollPlayerPlayerDamage(this, this.opponent)
                : rollPlayerNPCDamage(this, this.opponent);

            const opponent = this.opponent;
            const died = opponent.damage(damage, this);

            // apply poison after a hit, skip if fatal
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

        // thrown weapon reach: 3 tiles, 4 for darts
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

        const ammunitionID = this.inventory.getAmmunitionID();

        if (ammunitionID === -1) {
            return false;
        }

        this.faceDirection(-1, 1);

        this.inventory.remove(ammunitionID);

        if (Math.random() >= 0.2) {
            // stack ammo into a ground pile; non-stackables drop separately
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

        character.damage(damage, this);

        // apply poison from poisoned ammo
        const ammoDef = items[ammunitionID];

        if (ammoDef && ammoDef.name.toLowerCase().includes('poison')) {
            if (character.username) {
                // vs a player: unconditional 1-in-8, power 20
                if (Math.floor(Math.random() * 8) === 0) {
                    poison.setPoisonDamage(character, 20);
                    poison.startPoisonEvent(character);
                }
            } else if (
                getQOLConfig(this.world.server.config).wantPoisonNpcs &&
                (character.poisonPower || 0) < 10 &&
                Math.floor(Math.random() * 50) === 0
            ) {
                // vs an NPC: gated by want_poison_npcs, power 60
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

    tick() {
        this.normalizeSkills();

        // tick poison (every 32 ticks)
        poison.tickPoison(this);

        if (this.interfaceOpen.sleep) {
            this.refreshDisplayFatigue();
        }

        if (this.opponent) {
            if (this.opponent.skills.hits.current > 0) {
                this.fight();
            } else {
                // release dead/removed opponent
                this.opponent = null;
            }
        }

        this.localEntities.updateNearby('players');
        this.localEntities.updateNearby('groundItems');

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

        // persist base with current/experience
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
