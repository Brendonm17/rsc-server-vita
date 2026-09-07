// :: commands

const NPC = require('../model/npc');
const items = require('@2003scape/rsc-data/config/items');
const quests = require('@2003scape/rsc-data/quests');
const regions = require('@2003scape/rsc-data/regions');
const holidayEvents = require('../holiday-events');
const { dispatchCommand } = require('../plugins/custom/player-commands');
const staffCommands = require('../plugins/custom/staff-commands');

// cheat console (::item, ::teleport, ::give...): in the embedded build only
// the host socket "sp" may use it; co-op guests (g0..g6) are locked out
function isHost(socket) {
    if (!socket.server || !socket.server.isBrowser) {
        return true;
    }

    const inner = socket.socket;

    return !!inner && inner.id === 'sp';
}

// player-facing commands, safe for the host or any guest (they only affect
// the calling player)

function queryGang(player) {
    // -1 = joined that gang (shield of arrav sentinel)
    if (player.cache.blackArmStage === -1) {
        player.message('You are a member of the Black Arm Gang');
    } else if (player.cache.phoenixStage === -1) {
        player.message('You are a member of the Phoenix Gang');
    } else {
        player.message(
            'You are not in a gang - you need to start the shield of arrav quest'
        );
    }
}

function queryUniqueOnline(player) {
    // count real (non-bot) connections. getAll() is a generator, spread it
    // before using array methods
    const list = [...player.world.players.getAll()];
    const unique = list.filter((p) => !p.isBot).length;
    player.message(`There are ${unique} unique players online`);
}

function checkHolidayDrop(player) {
    // report the running holiday drop event, if any
    const config = player.world.server.config;
    const key = config.holidayEvents && holidayEvents.activeEvent(new Date());

    if (!key) {
        player.message('There is no running Holiday Drop Event');
        return;
    }

    const event = holidayEvents.EVENTS[key];
    const itemNames = event.items
        .map((id) => (items[id] ? items[id].name : `item ${id}`))
        .join(', ');

    player.message(`There is a ${event.name} Holiday Drop Event running:`);
    player.message(`Items: ${itemNames}`);
}

function queryMinigameLog(player) {
    // minigame stats this port tracks
    const cache = player.cache;

    player.message(`Minigame Log for ${player.username}`);
    player.message(
        `Fishing Trawler - successful trips: ${cache.fishing_trawler_success || 0}`
    );
    player.message(
        `Fishing Trawler - failed trips: ${cache.fishing_trawler_failures || 0}`
    );
    player.message(
        `Gnomeball - total goals: ${cache.gnomeball_total_goals || 0}`
    );
    player.message(
        `Kittens - raised to adult cats: ${cache.kittens_raised || 0}`
    );
    player.message(
        `Kittens - released to the wild: ${cache.kittens_released || 0}`
    );
}

function queryEvents(player) {
    // teleport to the running pvp event (set by ::setpvpevent) if in its combat range
    const { world } = player;

    if (!world.EVENT) {
        player.message('There is no event running at the moment');
        return;
    }

    const cb = player.getCombatLevel();

    if (cb > world.EVENT_COMBAT_MAX || cb < world.EVENT_COMBAT_MIN) {
        player.message(
            `This event is only for combat level range: ${world.EVENT_COMBAT_MIN} - ${world.EVENT_COMBAT_MAX}`
        );
        return;
    }

    player.teleport(world.EVENT_X, world.EVENT_Y);
}

function quickBank(player) {
    // ::b quick-bank: open the bank (no in-bank location check here)
    if (player.cache.qolOptOut) {
        player.message('@que@Quick banking is a QoL feature which you are opted out of.');
        return;
    }

    player.bank.open();
}

function toggleNpcKcMessages(player) {
    const on = !player.cache.npcKcMessages;

    player.cache.npcKcMessages = on;
    player.message(
        '@gre@System message:@whi@ You have turned ' +
            (on ? '@gre@on' : '@red@off') +
            ' @whi@NPC kill count messages'
    );
}

function setOldTrade(player) {
    player.cache.lastNoConfirm = Date.now();
    player.message('You have set trading to not require confirm');
    player.message('This will last for 5 minutes');
}

function toggleReceipts(player) {
    const show = !player.cache.showReceipts;

    player.cache.showReceipts = show;
    player.message(
        '@que@You will ' +
            (show ? 'now get receipts' : 'no longer get receipts') +
            ' when selling/buying at the shop'
    );
}

// qol / cert opt-out: warn, then confirm; lists this port's actual qol features
function qolOptOutInfo(player) {
    if (player.cache.qolOptOut) {
        player.message('@que@Congratulations! Your account is already opted out of QoL features.');
        return;
    }

    player.message('@lre@Quality of Life Opt-Out');
    player.message('@yel@Opting out disables quick-banking (::b) and other convenience features.');
    player.message('@red@Warning: @lre@you will not be able to opt back in without manual intervention from an @or1@administrator.');
    player.message('@whi@If you have read this warning and still wish to opt out, type @lre@::qoloptoutconfirm@whi@.');
    player.cache.qolOptOutWarned = true;
}

function qolOptOutConfirm(player) {
    if (player.cache.qolOptOut) {
        player.message('@que@You are already opted out of QoL features.');
        return;
    }

    if (!player.cache.qolOptOutWarned) {
        player.message('@que@Please read the warning first with @lre@::qoloptout@whi@.');
        return;
    }

    player.cache.qolOptOut = true;
    player.message('@que@Congratulations! You have successfully opted out of QoL features.');
}

function certOptOutInfo(player) {
    if (player.cache.certOptOut) {
        player.message('@que@Your account is already opted out of the traditional \'cert\' system.');
        return;
    }

    player.message('@lre@Traditional \'Cert\' System Opt-Out');
    player.message('@yel@Opting out disables converting items to certificates, trading certificates, and picking up certificates others drop.');
    player.message('@red@Warning: @lre@you will not be able to opt back in without manual intervention from an @or1@admin.');
    player.message('@whi@If you have read this warning and still wish to opt out, type @lre@::certoptoutconfirm@whi@.');
    player.cache.certOptOutWarned = true;
}

function certOptOutConfirm(player) {
    if (player.cache.certOptOut) {
        player.message("@que@You are already opted out of the traditional 'cert' system");
        return;
    }

    if (!player.cache.certOptOutWarned) {
        player.message('@que@Please read the warning first with @lre@::certoptout@whi@.');
        return;
    }

    player.cache.certOptOut = true;
    player.message("@que@You have successfully opted out of the traditional 'cert' system");
}

// toggle the block chat/private/trade/duel flags on player
function toggleBlockChat(player) {
    player.blockChat = !player.blockChat;
    player.message(
        player.blockChat
            ? '@que@You will no longer see any chat messages from players'
            : '@que@You will now see all chat messages'
    );
}

function toggleBlockPrivate(player) {
    player.blockPrivateChat = !player.blockPrivateChat;
    player.message(
        player.blockPrivateChat
            ? '@que@You will no longer see any private messages from players'
            : '@que@You will now see all private messages'
    );
}

function toggleBlockTrade(player) {
    player.blockTrade = !player.blockTrade;
    player.message(
        player.blockTrade
            ? '@que@You will no longer receive trade requests from players'
            : '@que@You will now receive trade requests'
    );
}

function toggleBlockDuel(player) {
    if (!player.world.members) {
        player.message('@que@Please log into a members world to do this toggle');
        return;
    }

    player.blockDuel = !player.blockDuel;
    player.message(
        player.blockDuel
            ? '@que@You will no longer receive duel requests from players'
            : '@que@You will now receive duel requests'
    );
}

// self-rename stub: tells the player to ask a moderator
function renameSelf(player) {
    if (staffCommands.isMod(player)) {
        return;
    }

    player.message('Not yet implemented to rename self.');
    player.message('Message a moderator in game, on Discord, or through the forums, to request a name change.');
}

const REGULAR_COMMANDS = {
    gang: queryGang,
    uniqueonline: queryUniqueOnline,
    getholidaydrop: checkHolidayDrop,
    checkholidaydrop: checkHolidayDrop,
    checkholidayevent: checkHolidayDrop,
    drop: checkHolidayDrop,
    minigamelog: queryMinigameLog,
    event: queryEvents,
    b: quickBank,
    togglenpckcmessages: toggleNpcKcMessages,
    oldtrade: setOldTrade,
    notradeconfirm: setOldTrade,
    togglereceipts: toggleReceipts,
    qoloptout: qolOptOutInfo,
    qoloptoutconfirm: qolOptOutConfirm,
    certoptout: certOptOutInfo,
    certoptoutconfirm: certOptOutConfirm,
    toggleblockchat: toggleBlockChat,
    toggleblockprivate: toggleBlockPrivate,
    toggleblocktrade: toggleBlockTrade,
    toggleblockduel: toggleBlockDuel,
    rename: renameSelf
};

function regularPlayerCommand(player, command, args) {
    const handler = REGULAR_COMMANDS[command.toLowerCase()];

    if (!handler) {
        return false;
    }

    handler(player, args);
    return true;
}

async function command(socket, { command, args }) {
    const { player } = socket;

    // custom set (party / clan / info / skiptutorial) first; anything unknown
    // falls through to the upstream debug switch below
    if (dispatchCommand(player, command, args)) {
        return;
    }

    if (regularPlayerCommand(player, command, args)) {
        return;
    }

    // staff commands: host is always admin-tier, a guest only if promoted via
    // ::rank. checked before the guest gate so a promoted guest can reach them
    if (staffCommands.dispatchStaffCommand(player, command, args)) {
        return;
    }

    // guests get the unknown-command nudge, not the cheat console
    if (!isHost(socket)) {
        player.message(`@gre@Unknown command. Try @whi@::commands`);
        return;
    }

    const { world } = player;

    switch (command) {
        case 'setqp':
            if (!args[0] || Number.isNaN(+args[0])) {
                player.message('invalid argument');
                break;
            }

            player.questPoints = +args[0];
            break;
        case 'kick': {
            if (!args[0]) {
                player.message('invalid player');
                break;
            }

            const playerKicked = world.getPlayerByUsername(args[0]);

            if (!playerKicked) {
                player.message('no such player: ' + args[0]);
                break;
            }

            await playerKicked.logout();
            player.message('kicked player: ' + args[0]);
            break;
        }
        case 'appearance':
            player.sendAppearance();
            break;
        case 'step': {
            const deltaX = +args[0];
            const deltaY = +args[1];

            player.message(player.canWalk(deltaX, deltaY).toString());
            player.walkTo(deltaX, deltaY);
            break;
        }
        case 'npc': {
            const npc = new NPC(world, {
                id: +args[0],
                x: player.x,
                y: player.y,
                minX: player.x - 4,
                maxX: player.x + 4,
                minY: player.y - 4,
                maxY: player.y + 4
            });

            delete npc.respawn;

            world.addEntity('npcs', npc);
            break;
        }
        case 'face':
            player.faceDirection(+args[0], +args[1]);
            break;
        case 'item':
            player.inventory.add(+args[0], +args[1] || 1);
            break;
        case 'sound':
            player.sendSound(args[0]);
            break;
        case 'bubble':
            player.sendBubble(+args[0]);
            break;
        case 'addexp':
            player.addExperience(args[0], +args[1] * 4, false);
            break;
        case 'clearentities':
            player.localEntities.clear();
            break;
        case 'coords':
            player.message(
                `${player.x}, ${player.y}, facing=${player.direction}`
            );
            break;
        case 'teleport':
            if (Number.isNaN(+args[0])) {
                const { spawnX, spawnY } = regions[args[0]];

                if (spawnX && spawnY) {
                    player.teleport(spawnX, spawnY, true);
                }

                break;
            }

            player.teleport(+args[0], +args[1], true);
            break;
        case 'ask': {
            const choice = await player.ask(
                ['hey?', 'sup?', 'more', 'test', 'again'],
                true
            );

            player.message('you chose ', choice);
            break;
        }
        case 'say':
            await player.say(...args);
            break;
        case 'dmg':
            player.damage(+args[0]);
            break;
        case 'shop':
            player.openShop(args[0]);
            break;
        case 'give': {
            const other = world.getPlayerByUsername(args[0]);

            if (other) {
                other.inventory.add(+args[1], +args[2] || 1);
                other.message(`${player.username} gave you an item`);
                player.message(`gave ${args[0]} item ${args[1]}`);
            } else {
                player.message(`unable to find player ${args[0]}`);
            }
            break;
        }
        case 'bank':
            player.bank.open();
            break;
        case 'fatigue':
            player.fatigue = 75000;
            player.sendFatigue();
            break;
        case 'chaseobj':
            await player.chase(world.gameObjects.getByID(+args[0]), false);
            break;
        case 'gotoentity': {
            const entities = world[args[0]];
            const entity = entities.getByID(+args[1]);

            if (entity) {
                player.teleport(entity.x, entity.y, true);
            }

            break;
        }
        case 'setquest': {
            let questID;

            if (Number.isNaN(+args[0])) {
                questID = quests
                    .map((name) => name.toLowerCase())
                    .indexOf(args[0].toLowerCase());
            } else {
                questID = +args[0];
            }

            if (questID > -1) {
                player.questStages[quests[questID]] = +args[1];
            }

            break;
        }
        case 'setcache':
            player.cache[args[0]] = JSON.parse(args[1]);
            break;
        case 'droprandom': {
            for (let i = 0; i < +args[0]; i += 1) {
                const randomID = Math.floor(Math.random() * 1290);
                const item = items[randomID];

                if (item.members) {
                    continue;
                }

                if (item.stackable) {
                    world.addPlayerDrop(player, {
                        id: randomID,
                        amount: Math.floor(Math.random() * 10000)
                    });
                } else {
                    world.addPlayerDrop(player, { id: randomID });
                }
            }
            break;
        }
        case 'goto': {
            const otherPlayer = world.getPlayerByUsername(args[0]);
            player.teleport(otherPlayer.x, otherPlayer.y);
            break;
        }
        case 'clearinventory': {
            player.inventory.items = [];
            player.inventory.sendAll();
            break;
        }
        case 'npcchase': {
            const npc = Array.from(player.localEntities.known.npcs).find(
                (npc) => {
                    return npc.id === +args[0];
                }
            );

            if (npc) {
                await npc.attack(player);
            }

            break;
        }
        case 'npccoords':
            player.message(world.npcs.getAtPoint(+args[0], +args[1]).length);
            break;
        case 'spawnbot': {
            // spawn woodcutter bot(s) at the host's tile. optional count: ::spawnbot 3
            const bots = require('../plugins/custom/bots');
            const count = Math.max(1, Math.min(8, +args[0] || 1));

            for (let i = 0; i < count; i += 1) {
                const bot = bots.spawn(world, { x: player.x, y: player.y });
                player.message(
                    `@gre@spawned bot @whi@${bot.username}@gre@ at ` +
                        `${bot.x},${bot.y}`
                );
            }

            break;
        }
        case 'spawnfighter': {
            // spawn combat bot(s) at the host's tile. optional count
            const bots = require('../plugins/custom/bots');
            const count = Math.max(1, Math.min(8, +args[0] || 1));

            for (let i = 0; i < count; i += 1) {
                const bot = bots.spawnFighter(world, {
                    x: player.x,
                    y: player.y
                });
                player.message(
                    `@gre@spawned fighter @whi@${bot.username}@gre@ at ` +
                        `${bot.x},${bot.y}`
                );
            }

            break;
        }
        case 'spawncareer': {
            // spawn career bot(s) at the host's tile. optional args: count,
            // archetype (::spawncareer 2 warrior)
            const bots = require('../plugins/custom/bots');
            const count = Math.max(1, Math.min(8, +args[0] || 1));
            const archetype = args[1] || 'random';

            for (let i = 0; i < count; i += 1) {
                const bot = bots.spawnCareer(world, {
                    x: player.x,
                    y: player.y,
                    archetype
                });
                const arch =
                    bot.cache.bot.personality &&
                    bot.cache.bot.personality.archetype;
                player.message(
                    `@gre@spawned @whi@${arch}@gre@ bot ` +
                        `@whi@${bot.username}@gre@ at ${bot.x},${bot.y}`
                );
            }

            break;
        }
        case 'despawnbots': {
            const bots = require('../plugins/custom/bots');
            bots.despawnAll(world);
            player.message('@gre@despawned all bots');
            break;
        }
        case 'bots': {
            // list the active roster
            const bots = require('../plugins/custom/bots');
            const list = Array.from(bots.activeBots);

            player.message(`@gre@Active bots: @whi@${list.length}`);

            for (const bot of list) {
                const type =
                    bot.cache && bot.cache.bot ? bot.cache.bot.type : '?';
                player.message(
                    `@gre@${bot.username}@whi@ (${type}) ` +
                        `lvl ${bot.combatLevel} @ ${bot.x},${bot.y}`
                );
            }

            break;
        }
    }
}

module.exports = { command };
