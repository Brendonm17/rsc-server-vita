// "::" player commands: informational + social (party / clan / global chat).
// omits privileged commands (no ::teleport / ::spawn / ::item / admin).

const regions = require('@2003scape/rsc-data/regions');
const party = require('./party');
const achievements = require('./achievements');
const clan = require('./clan');
// clan text commands: c/claninvite/clanaccept/clankick/joinclan
const clanCommands = require('./clan-commands').commands;
const globalChat = require('./global-chat');
const staff = require('./staff-commands');

function totalLevel(player) {
    let total = 0;
    for (const skill of Object.values(player.skills || {})) {
        // sum the displayed base levels
        total += skill.base;
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
            '@gre@Commands: @whi@::gameinfo ::coords ::online ::onlinelist ' +
                '::g <msg> ::time ::kc ::achieve ::groups'
        );
        player.message(
            '@gre@Party: @whi@::pinvite <name> ::partyaccept ::p <msg> ' +
                '::party ::leaveparty ::shareloot ::shareexp'
        );
        player.message(
            '@gre@Clan: @whi@::clan create <name> ::claninvite <name> ' +
                '::clanaccept ::clankick <name> ::joinclan <name> ::c <msg> ::clanleave'
        );
        player.message(
            '@gre@Global chat: @whi@::g <msg> ::gc ::toggleglobalchat ' +
                '::globalrules ::setglobalmessagecolor <colour>'
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
    // ::shareloot / ::shareexp: leader-only party toggles
    shareloot(player) {
        party.toggleLootShare(player);
    },
    shareexp(player) {
        party.toggleExperienceShare(player);
    },
    // ::bankpinoptin / ::bankpinoptout bank-pin opt toggles
    bankpinoptin(player) {
        if (player.cache.bankpin_optout !== undefined) {
            delete player.cache.bankpin_optout;
            if (player.cache.bankpin_optout === undefined) {
                player.message('@que@You can now talk to the banker about bank pins again!');
            } else {
                player.message('@que@Something went wrong opting-in to bankpins.');
                player.message('@que@Please try opting-in again.');
            }
        } else {
            player.message('@que@This server has bank pins enabled by default.');
            player.message('@que@Talk to a banker to get started.');
        }
    },
    bankpinoptout(player) {
        if (player.cache.bank_pin !== undefined) {
            player.message('@que@You must first remove your bank pin to do that!');
            return;
        }
        if (player.cache.bankpin_optout !== undefined) {
            player.message('@que@You are already opted out of bank pins!');
            return;
        }
        player.message('@que@You have successfully opted out of bank pins!');
        player.cache.bankpin_optout = 3;
    },

    clan(player, args) {
        clan.command(player, args);
    },
    clanleave(player) {
        clan.leave(player);
    },

    // clan command family, via clan-commands.js
    claninvite: clanCommands.claninvite,
    clanaccept: clanCommands.clanaccept,
    clankick: clanCommands.clankick,
    joinclan: clanCommands.joinclan,
    c: clanCommands.c,

    coords(player) {
        player.message(`@gre@Position: @whi@${player.x}, ${player.y}`);
    },

    players(player) {
        const list =
            player.world && player.world.players && player.world.players.getAll
                ? Array.from(player.world.players.getAll())
                : [];
        const names = list.map((p) => p.username).filter(Boolean);
        player.message(
            `@gre@Online (@whi@${names.length}@gre@): @whi@` +
                (names.join(', ') || '-')
        );
    },

    // ::groups / ::ranks: list the server's staff groups
    groups(player) {
        staff.queryGroupIDs(player);
    },
    ranks(player) {
        staff.queryGroupIDs(player);
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

    // options-tab "Skip tutorial" button sends ::skiptutorial: teleport to the
    // lumbridge respawn tile and remove the stage key
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

// aliases: ::kills / ::date / ::achievements
COMMANDS.kills = COMMANDS.kc;
COMMANDS.date = COMMANDS.time;
COMMANDS.achievements = COMMANDS.achieve;

// dispatch one command by bare name; returns false when the name is not in the
// custom set. client sends every "::" input as the COMMAND packet, not chat
function dispatchCommand(player, name, args) {
    const handler = COMMANDS[String(name || '').toLowerCase()];

    if (handler) {
        try {
            handler(player, args || []);
        } catch (e) {
            player.message('@gre@Command error.');
        }

        return true;
    }

    // global chat family (g/gc/online/onlinelist/...), see global-chat.js
    return globalChat.dispatchGlobalChat(player, name, args);
}

// returns true if `message` was a "::" command and was handled, else false
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
