// "::" player commands: informational + social commands (party / clan / global chat). omits privileged commands (no
// ::teleport / ::spawn / ::item / admin). dispatched when a chat message starts with "::"

const regions = require('@2003scape/rsc-data/regions');
const { experienceToLevel } = require('../../skills');
const party = require('./party');
const achievements = require('./achievements');
const clan = require('./clan');

function totalLevel(player) {
    let total = 0;
    for (const skill of Object.values(player.skills || {})) {
        total += experienceToLevel(skill.experience);
    }
    return total;
}

function totalKills(player) {
    const counts = (player.cache && player.cache.npcKillCounts) || {};
    let total = 0;
    for (const id in counts) {
        total += counts[id] | 0;
    }
    return total;
}

function pad2(n) {
    return (n < 10 ? '0' : '') + n;
}

const COMMANDS = {
    commands(player) {
        player.message(
            '@gre@Commands: @whi@::gameinfo ::coords ::players ::g <msg> ' +
                '::time ::kc ::achieve'
        );
        player.message(
            '@gre@Party: @whi@::pinvite <name> ::partyaccept ::p <msg> ' +
                '::party ::leaveparty'
        );
        player.message(
            '@gre@Clan: @whi@::clan create <name> ::claninvite <name> ' +
                '::clanaccept ::c <msg> ::clanleave'
        );
    },

    achieve(player) {
        achievements.report(player);
    },

    pinvite(player, args) {
        party.invite(player, args[0]);
    },
    partyaccept(player) {
        party.accept(player);
    },
    leaveparty(player) {
        party.leave(player);
    },
    p(player, args) {
        party.chat(player, args.join(' '));
    },
    party(player) {
        party.list(player);
    },

    clan(player, args) {
        clan.command(player, args);
    },
    claninvite(player, args) {
        clan.invite(player, args[0]);
    },
    clanaccept(player) {
        clan.accept(player);
    },
    clanleave(player) {
        clan.leave(player);
    },
    c(player, args) {
        clan.chat(player, args.join(' '));
    },

    coords(player) {
        player.message(`@gre@Position: @whi@${player.x}, ${player.y}`);
    },

    players(player) {
        const list =
            player.world && player.world.players && player.world.players.getAll
                ? player.world.players.getAll()
                : [];
        const names = list.map((p) => p.username).filter(Boolean);
        player.message(
            `@gre@Online (@whi@${names.length}@gre@): @whi@` +
                (names.join(', ') || '-')
        );
    },

    // ::g <msg>: global chat, reaches every player in the world. OpenRSC want_global_chat
    g(player, args) {
        const text = args.join(' ').trim();
        if (!text) {
            return;
        }
        const list =
            player.world && player.world.players && player.world.players.getAll
                ? player.world.players.getAll()
                : [player];
        for (const p of list) {
            if (p.blockChat) {
                continue;
            }
            p.message(`@yel@[global] @whi@${player.username}: ${text}`);
        }
    },

    gameinfo(player) {
        player.message(
            `@gre@Position: @whi@${player.x}, ${player.y}   ` +
                `@gre@Combat: @whi@${player.getCombatLevel()}   ` +
                `@gre@Total level: @whi@${totalLevel(player)}`
        );
    },

    time(player) {
        const d = new Date();
        player.message(
            '@gre@Server time: @whi@' +
                `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(
                    d.getSeconds()
                )}`
        );
    },

    kc(player) {
        player.message(`@gre@Total NPC kills: @whi@${totalKills(player)}`);
    },

    // options-tab "Skip tutorial" button sends ::skiptutorial: teleport to the Lumbridge respawn tile and remove the
    // stage key
    skiptutorial(player) {
        if (typeof player.cache.tutorialStage !== 'number') {
            player.message('@que@You have already completed the tutorial.');
            return;
        }
        player.message('You have completed the tutorial');
        const { spawnX, spawnY } = regions.lumbridge;
        player.teleport(spawnX, spawnY, false);
        delete player.cache.tutorialStage;
    }
};

// aliases: ::kills / ::online / ::date
COMMANDS.kills = COMMANDS.kc;
COMMANDS.online = COMMANDS.players;
COMMANDS.date = COMMANDS.time;
COMMANDS.achievements = COMMANDS.achieve;
COMMANDS.global = COMMANDS.g;

// dispatch one command by bare name. returns false when the name is not in the custom set. the client sends every
// "::" input (typed chat and UI buttons) as the COMMAND packet, not chat
function dispatchCommand(player, name, args) {
    const handler = COMMANDS[String(name || '').toLowerCase()];

    if (!handler) {
        return false;
    }

    try {
        handler(player, args || []);
    } catch (e) {
        player.message('@gre@Command error.');
    }

    return true;
}

// returns true if message was a "::" command and was handled, else false
function handlePlayerCommand(player, message) {
    if (!message || message[0] !== ':' || message[1] !== ':') {
        return false;
    }

    const parts = message.slice(2).trim().split(/\s+/);
    const name = parts[0] || '';

    if (!dispatchCommand(player, name, parts.slice(1)) && name) {
        player.message(`@gre@Unknown command. Try @whi@::commands`);
    }

    return true;
}

module.exports = { handlePlayerCommand, dispatchCommand };
