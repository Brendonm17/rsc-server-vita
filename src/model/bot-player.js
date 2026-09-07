// a BotPlayer is a real Player with no client socket: outbound packets drop, but its actions
// still render for real players. driven server-side; persistent state rides in the saved cache.

const Player = require('./player');
const skillNames = require('@2003scape/rsc-data/skill-names');

const { chooseForBot, chooseDialogueOption } = require('../plugins/custom/bots/npc-dialogue');

// bot DB ids live in a high range so they never collide with real player ids
const BOT_ID_BASE = 1000000;

// default per-skill { current, base, experience }, built from the live skill-name list.
// hitpoints gets the authentic level-10 floor.
function defaultSkills() {
    const skills = {};

    for (const name of skillNames) {
        skills[name] = { current: 1, base: 1, experience: 0 };
    }

    if (skills.hits) {
        skills.hits = { current: 10, base: 10, experience: 4616 };
    }

    return skills;
}

// a playerData record of the shape the Player constructor expects. loginDate is truthy so
// login() skips the character-creation lock+sendAppearance branch a bot has no client to answer.
function makeBotData(overrides = {}) {
    const data = {
        id: overrides.id,
        // usernames are the identity key, matched case-insensitively, so store the bot's lowercased;
        // the UI keeps a pretty display name separately (getFormattedUsername).
        username: String(overrides.username || 'bot').toLowerCase(),
        loginIP: null,
        loginDate: 1,
        muteEndDate: 0,
        rank: 0,
        x: typeof overrides.x === 'number' ? overrides.x : 122,
        y: typeof overrides.y === 'number' ? overrides.y : 657,
        questPoints: 0,
        combatStyle: 0,
        fatigue: 0,
        cameraAuto: 0,
        oneMouseButton: 0,
        soundOn: 0,
        blockChat: 0,
        blockPrivateChat: 0,
        blockTrade: 0,
        blockDuel: 0,
        skulled: 0,
        ironManMode: 0,
        ironManRestriction: 1,
        ironManHCDeath: 0,
        friends: [],
        ignores: [],
        questStages: {},
        cache: {},
        inventory: [],
        bank: [],
        // appearance: setAppearance() reads these straight off playerData
        hairColour: 2,
        topColour: 8,
        trouserColour: 14,
        skinColour: 0,
        headSprite: 1,
        bodySprite: 2,
        skills: defaultSkills()
    };

    const merged = { ...data, ...overrides };
    // lowercase after the merge, else overrides.username clobbers the lowercased default
    merged.username = String(merged.username || 'bot').toLowerCase();
    return merged;
}

class BotPlayer extends Player {
    constructor(world, botData) {
        super(world, null, botData); // socket=null -> send() is a no-op
        this.isBot = true;
        this.brain = null; // assigned by the bots manager after login
    }

    // a bot has no socket and is torn down via bots.despawn(), so make a stray logout a safe no-op
    async logout() {
        // nothing to flush to a client, no socket to close
    }

    // Player.ask() awaits a client choice packet that never arrives for a bot; auto-pick the
    // progressing option and resolve at once, so bots can drive real NPC dialogue.
    async ask(options, repeat = false) {
        // honour any forced-answer hints a quest chain queued, else explore across repeated talks
        const choice = chooseForBot(this, options);
        this.answer = null;
        this.dontAnswer = null;
        if (repeat && options && options[choice] != null) {
            try {
                await this.say(options[choice]);
            } catch (e) {
                // saying the choice is cosmetic, never let it block the dialogue
            }
        }
        return choice;
    }

    // Player.die() restores HP and teleports synchronously, so polling can't catch a bot's death.
    // capture it here, before super.die() wipes the context. best-effort, never blocks the death.
    die() {
        try {
            const killer = this.opponent;
            require('../plugins/custom/bots/memory').onDeath(this, killer);
            require('../plugins/custom/bots/lifecycle').onDeath(this);
            require('../plugins/custom/bots/learning').onDeath(this, killer);
            // a defeat by a known rival is a loss on the tally; if the killer is a bot, it scores the win
            if (killer && killer.username) {
                const rivalry = require('../plugins/custom/bots/rivalry');
                const em = require('../plugins/custom/bots/social-emergent');
                // remember the specific wrong; the phrasing fits a "you {topic}" taunt later
                try {
                    const where = killer.username ? 'cut me down in the wild' : null;
                    if (where) require('../plugins/custom/bots/grievances').record(this, killer.username, where);
                } catch (e) {}
                if (em.tagOf(this, killer.username) === 'rival') {
                    rivalry.recordOutcome(this, killer.username, false);
                }
                // the victim's nearby friends turn on the killer, a real social cost to cutting someone down
                try { em.avengeFallen(this, killer); } catch (e) {}
                // a kill across a war line is a battle won: the victor's crew takes heart, the fallen's loses morale
                try {
                    if (killer.isBot) {
                        const fac = require('../plugins/custom/bots/factions');
                        const kf = fac.factionOf(killer), vf = fac.factionOf(this);
                        if (kf && vf && fac.atWar(kf.name, vf.name)) fac.recordWarKill(kf.name, vf.name);
                    }
                } catch (e) {}
                if (killer.isBot && em.tagOf(killer, this.username) === 'rival') {
                    rivalry.recordOutcome(killer, this.username, true);
                    // the victor earns a tale of besting its rival
                    try {
                        require('../plugins/custom/bots/lore').record(killer, 'feud', { subj: this.username });
                    } catch (e) {}
                    // and savours the moment out loud; a feud settled is worth a shout
                    try {
                        const who = (this.getFormattedUsername && this.getFormattedUsername()) || this.username;
                        const lines = ['that\'s for everything, ' + who + '!', 'who\'s the better fighter now, ' + who + '?', 'i finally got you, ' + who + '!'];
                        const line = lines[Math.floor(Math.random() * lines.length)];
                        let out = line;
                        try { out = require('../plugins/custom/bots/voice').apply(killer, line); } catch (e) {}
                        killer._reactionSpeak = true;
                        try { killer.broadcastChat(out); } finally { killer._reactionSpeak = false; }
                    } catch (e) {}
                }
            }
        } catch (e) {
            // bot death-handling is best-effort, never let it stop the death
        }
        // respawn at the fixed Lumbridge point (super.die() handles it), then walk back to the
        // home region under the career/travel brain, like a player. no teleport.
        return super.die();
    }

    // a player-shaped snapshot for the bot roster store; round-trips back through new BotPlayer(world, record).
    // brain type/options live in cache.bot; live/transient fields (opponent, walkQueue, brain) are omitted.
    toRecord() {
        return {
            id: this.id,
            username: this.username,
            loginIP: null,
            loginDate: 1,
            muteEndDate: this.muteEndDate || 0,
            rank: this.rank,
            x: this.x,
            y: this.y,
            questPoints: this.questPoints,
            combatStyle: this.combatStyle,
            fatigue: this.fatigue,
            cameraAuto: this.cameraAuto,
            oneMouseButton: this.oneMouseButton,
            soundOn: this.soundOn,
            blockChat: this.blockChat,
            blockPrivateChat: this.blockPrivateChat,
            blockTrade: this.blockTrade,
            blockDuel: this.blockDuel,
            skulled: this.skulled,
            ironManMode: this.ironManMode,
            ironManRestriction: this.ironManRestriction,
            ironManHCDeath: this.ironManHCDeath,
            friends: [],
            ignores: [],
            questStages: { ...this.questStages },
            cache: JSON.parse(JSON.stringify(this.cache)),
            inventory: this.inventory.toJSON(),
            bank: this.bank.toJSON(),
            hairColour: this.appearance.hairColour,
            topColour: this.appearance.topColour,
            trouserColour: this.appearance.trouserColour,
            skinColour: this.appearance.skinColour,
            headSprite: this.appearance.headSprite,
            bodySprite: this.appearance.bodySprite,
            skills: JSON.parse(JSON.stringify(this.skills))
        };
    }

    // route save to the bot roster store, not the human players table; best-effort (bots ephemeral without support)
    async save() {
        const dc = this.world.server.dataClient;

        if (dc && typeof dc.saveBot === 'function') {
            try {
                await dc.saveBot(this.toRecord());
            } catch (e) {
                // persistence is best-effort, never break the save loop
            }
        }
    }
}

module.exports = { BotPlayer, makeBotData, defaultSkills, BOT_ID_BASE, chooseDialogueOption };
