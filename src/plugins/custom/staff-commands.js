// staff "::" commands ported from OpenRSC, rank-gated, dispatched from command.js.
// host is always admin tier; guests default to user until promoted, persisted on player.cache.staffGroup.

const items = require('@2003scape/rsc-data/config/items');
const npcs = require('@2003scape/rsc-data/config/npcs');
const objects = require('@2003scape/rsc-data/config/objects');
const wallObjectDefs = require('@2003scape/rsc-data/config/wall-objects');
const quests = require('@2003scape/rsc-data/quests');
const holidayEvents = require('../../holiday-events');
const GameObject = require('../../model/game-object');
const WallObject = require('../../model/wall-object');
const GroundItem = require('../../model/ground-item');
const NPC = require('../../model/npc');

const MESSAGE_PREFIX = '@gre@System message:@whi@ ';
const BAD_SYNTAX_PREFIX = MESSAGE_PREFIX + ' Invalid Syntax: ::';

// @2003scape/rsc-data/regions's own 'wilderness' bounds.
const WILDERNESS_BOUNDS = { minX: 48, maxX: 336, minY: 96, maxY: 426 };

function inBounds(x, y, b) {
    return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

// ---- rank / group model ----

// staff tiers, owner+admin collapsed into 'admin'
const STAFF_GROUPS = {
    admin: { label: 'Admin', colour: '@gre@', globalName: 'Admin' },
    dev: { label: 'Developer', colour: '@red@', globalName: 'Event' },
    supermod: { label: 'Super Moderator', colour: '@blu@', globalName: 'Mod' },
    mod: { label: 'Moderator', colour: '@bl1@', globalName: 'Mod' },
    event: { label: 'Event', colour: '@eve@', globalName: 'Event' },
    playermod: { label: 'Player Moderator', colour: '', globalName: 'Pmod' },
    user: { label: 'User', colour: '', globalName: '' }
};

// seniority order for the "can't act on an equal-or-senior staff member" guard,
// not for command access.
const SENIORITY = {
    user: 0,
    playermod: 1,
    event: 2,
    mod: 3,
    supermod: 4,
    dev: 5,
    admin: 6
};

// same host check as command.js's cheat console
function isHostSocket(socket) {
    if (!socket || !socket.server || !socket.server.isBrowser) {
        return true;
    }

    const inner = socket.socket;

    return !!inner && inner.id === 'sp';
}

function isHost(player) {
    return !player.isBot && isHostSocket(player.socket);
}

// the promoted-guest tier, or 'user' for everyone else
function storedGroup(player) {
    return (player.cache && player.cache.staffGroup) || 'user';
}

function staffGroup(player) {
    return isHost(player) ? 'admin' : storedGroup(player);
}

function seniority(player) {
    return SENIORITY[staffGroup(player)] || 0;
}

// staff predicates: isAdmin/isSuperMod/isMod/isPlayerMod/isDev/isEvent
function isAdmin(player) {
    return staffGroup(player) === 'admin';
}

function isSuperMod(player) {
    return staffGroup(player) === 'supermod' || isAdmin(player);
}

function isMod(player) {
    return staffGroup(player) === 'mod' || isSuperMod(player);
}

function isPlayerMod(player) {
    return staffGroup(player) === 'playermod' || isMod(player);
}

function isDev(player) {
    return staffGroup(player) === 'dev' || isAdmin(player);
}

function isEvent(player) {
    return staffGroup(player) === 'event' || isMod(player) || isDev(player);
}

function isStaff(player) {
    return staffGroup(player) !== 'user';
}

// promote/demote: persist the tier, keep player.rank in sync for the 'admin' tier
function setStaffGroup(player, group) {
    if (isHost(player)) {
        // the host's tier is derived from the connection, not stored
        return;
    }

    if (group === 'user') {
        delete player.cache.staffGroup;
    } else {
        player.cache.staffGroup = group;
    }

    player.rank = group === 'admin' ? 3 : 0;
}

// staff colour prefix: the host gets Owner's @dcy@, other admins @gre@.
function getStaffPrefix(player) {
    if (isHost(player)) {
        return '@dcy@';
    }

    return STAFF_GROUPS[staffGroup(player)].colour;
}

// Player.getStaffName().
function getStaffName(player) {
    return getStaffPrefix(player) + player.username;
}

// Group.getGlobalMessageName.
function getGroupMessageName(player) {
    return STAFF_GROUPS[staffGroup(player)].globalName;
}

// ---- shared helpers ----

function badSyntax(player, command, usage) {
    player.message(BAD_SYNTAX_PREFIX + command.toUpperCase() + ' ' + usage);
}

function findPlayer(world, username) {
    return world.getPlayerByUsername(username);
}

// resolve an online target: args[index] or the caller; null if the named player isn't online
function resolveTarget(player, args, index = 0) {
    if (args.length <= index) {
        return player;
    }

    const target = findPlayer(player.world, args[index]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return null;
    }

    return target;
}

// "can't act on an equal-or-senior staff member" guard, against this file's seniority order
function canActOn(player, target) {
    return target === player || !isStaff(target) || seniority(player) > seniority(target);
}

function guardSeniority(player, target, verb) {
    if (canActOn(player, target)) {
        return true;
    }

    player.message(
        MESSAGE_PREFIX + `You can not ${verb} a staff member of equal or greater rank.`
    );

    return false;
}

// numeric id, or an item name (spaces/underscores) resolved against the item table
function resolveItemId(text) {
    if (/^\d+$/.test(text)) {
        const id = +text;
        return items[id] ? id : -1;
    }

    const name = text.replace(/_/g, ' ').trim().toLowerCase();

    for (let id = 0; id < items.length; id += 1) {
        if (items[id] && items[id].name.toLowerCase() === name) {
            return id;
        }
    }

    return -1;
}

function formatNumber(n) {
    return n.toLocaleString('en-US');
}

// a command this port can't offer; names the missing feature in need
function blocked(need) {
    return (player) => {
        player.message(
            MESSAGE_PREFIX + "This command isn't available on this server."
        );
        player.message(MESSAGE_PREFIX + 'Needs: ' + need);
    };
}

// ---- Event.java: ::rank / ::setrank / ::group / ::setgroup (changeGroupId) ----

function changeGroupId(player, command, args) {
    if (args.length < 1) {
        player.message(
            BAD_SYNTAX_PREFIX + command.toUpperCase() + ' [name] OR to set a group'
        );
        player.message(
            BAD_SYNTAX_PREFIX +
                command.toUpperCase() +
                ' [name] [group_id/group_name]'
        );
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (args.length === 1) {
        player.message(
            MESSAGE_PREFIX +
                getStaffName(target) +
                '@whi@ has group ' +
                getStaffPrefix(target) +
                STAFF_GROUPS[staffGroup(target)].label
        );
        return;
    }

    if (!isAdmin(player)) {
        player.message(
            MESSAGE_PREFIX + 'You do not have permission to modify users’ group.'
        );
        return;
    }

    let newGroup = args[1].toLowerCase();

    if (!STAFF_GROUPS[newGroup]) {
        // accept a group label too ("Super Moderator")
        const byLabel = Object.keys(STAFF_GROUPS).find(
            (key) =>
                STAFF_GROUPS[key].label.toLowerCase() ===
                args.slice(1).join(' ').toLowerCase()
        );
        newGroup = byLabel;
    }

    if (!newGroup || !STAFF_GROUPS[newGroup]) {
        player.message(MESSAGE_PREFIX + 'Invalid group_id or group_name');
        return;
    }

    if (isHost(target)) {
        player.message(MESSAGE_PREFIX + "You can not change the host's group.");
        return;
    }

    // can't set someone to your own tier or higher: the caller must be strictly
    // more senior than both the new tier and the target's current tier.
    if (
        SENIORITY[newGroup] >= seniority(player) ||
        seniority(target) >= seniority(player)
    ) {
        player.message(
            MESSAGE_PREFIX +
                "You can't to set " +
                getStaffName(target) +
                '@whi@ to group ' +
                STAFF_GROUPS[newGroup].colour +
                STAFF_GROUPS[newGroup].label
        );
        return;
    }

    setStaffGroup(target, newGroup);

    if (target !== player) {
        target.message(
            MESSAGE_PREFIX +
                getStaffName(player) +
                '@whi@ has set your group to ' +
                STAFF_GROUPS[newGroup].colour +
                STAFF_GROUPS[newGroup].label
        );
    }

    player.message(
        MESSAGE_PREFIX +
            'Set ' +
            getStaffName(target) +
            '@whi@ to group ' +
            STAFF_GROUPS[newGroup].colour +
            STAFF_GROUPS[newGroup].label
    );
}

// unranked: any player may list the groups
function queryGroupIDs(player) {
    const lines = Object.keys(STAFF_GROUPS).map((key) => {
        const g = STAFF_GROUPS[key];

        return g.colour + g.label;
    });

    player.message('@whi@Server Groups:');

    for (const line of lines) {
        player.message(line);
    }
}

// ==================================================================
// Moderator.java (isMod)
// ==================================================================

function sendAnnouncement(player, command, args) {
    if (args.length === 0) {
        player.message(
            MESSAGE_PREFIX +
                `Just put all the words you want to say after the "${command}" command`
        );
        return;
    }

    const text = args.join(' ');

    for (const p of player.world.players.getAll()) {
        p.message(
            `@ran@ANNOUNCEMENT: @cya@${getStaffName(player)}:@yel@ ${text}`
        );
    }
}

function showSystemMessageBox(player, command, args) {
    if (args.length === 0) {
        player.message(
            MESSAGE_PREFIX +
                `Just put all the words you want to say after the "${command}" command`
        );
        return;
    }

    const text = '@yel@System message: @whi@' + args.join(' ');

    for (const p of player.world.players.getAll()) {
        p.message(text);
    }

    player.message(MESSAGE_PREFIX + 'System message sent');
}

function forceGlobalMessage(player, command, args) {
    const text = `${getStaffName(player)}: @yel@${args.join(' ')}`;

    for (const p of player.world.players.getAll()) {
        p.message(text);
    }
}

async function kickPlayer(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[player]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    await target.logout();
    player.message(MESSAGE_PREFIX + target.username + ' has been kicked.');
}

function checkQuest(player, command, args) {
    if (args.length < 2) {
        badSyntax(player, command, '[player] [questId]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    const questId = +args[1];
    const name = quests[questId];
    const stage = name ? target.questStages[name] || 0 : undefined;

    if (!name) {
        badSyntax(player, command, '[player] [questId]');
        return;
    }

    player.message(
        MESSAGE_PREFIX + `${target.username} has stage ${stage} for quest ${questId}`
    );
}

function tpNpc(player, command, args) {
    if (args.length < 1 || args.length === 2) {
        badSyntax(player, command, '[npc instance id] (x) (y)');
        return;
    }

    const npc = player.world.npcs.getByIndex(+args[0]);

    if (!npc) {
        player.message(MESSAGE_PREFIX + "Couldn't find that npc.");
        return;
    }

    const x = args.length > 1 ? +args[1] : player.x;
    const y = args.length > 1 ? +args[2] : player.y;

    npc.x = x;
    npc.y = y;
    player.message(
        MESSAGE_PREFIX + `The ${npc.definition.name} has been teleported to (${x}, ${y})`
    );
}

function defineSlot(player, command, args) {
    const slot = +command.replace(/^defineslot/i, '');

    if (Number.isNaN(slot)) {
        player.message("Couldn't parse slot number.");
        player.message(
            '@mag@::defineslotX [full command]@whi@ where X is the slot # you would like to change.'
        );
        player.message('Call @mag@::defineslotX@whi@ with no argument to unset the saved command.');
        return;
    }

    let toSave = args.join(' ').trim();

    if (toSave.startsWith('::')) {
        toSave = toSave.slice(2);
    }

    if (!toSave) {
        toSave = '(unset)';
    }

    const old = player.cache['savedcommand' + slot];

    player.cache['savedcommand' + slot] = toSave;

    if (old && old !== '(unset)') {
        player.message(
            `@que@Old command removed from slot @mag@${slot}@whi@: @mag@${old}`
        );
    }

    player.message(`@que@New command saved to slot @mag@${slot}@whi@: @mag@${toSave}`);
}

async function summonPlayer(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[name]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'summon')) {
        return;
    }

    const from = { x: target.x, y: target.y };

    target.teleport(player.x, player.y, true);

    player.message(
        MESSAGE_PREFIX +
            `You have summoned ${target.username} to ${target.x},${target.y} from ${from.x},${from.y}`
    );

    if (target !== player) {
        target.message(MESSAGE_PREFIX + 'You have been summoned by ' + getStaffName(player));
    }
}

function queryPlayerInformation(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    player.message('@lre@Player Information:');
    player.message(`@gre@Name:@whi@ ${target.username}`);
    player.message(`@gre@Group:@whi@ ${STAFF_GROUPS[staffGroup(target)].label}`);
    player.message(`@gre@Logged In:@whi@ ${target.loggedIn}`);
    player.message(`@gre@Coordinates:@whi@ ${target.x}, ${target.y}`);
    player.message(`@gre@Fatigue:@whi@ ${Math.floor(target.fatigue / 750)}%`);
}

function queryPlayerInventory(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    const showId = args.length > 1;
    const text = target.inventory.items
        .map((item) => {
            const name = `@gre@${item.amount} @whi@${item.definition.name}`;

            return showId ? `${name} @yel@(${item.id})` : name;
        })
        .join(', ');

    player.message(`@lre@Inventory of ${target.username}:`);
    player.message('@whi@' + (text || '(empty)'));
}

function queryPlayerBank(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    const showId = args.length > 2;
    const text = target.bank.items
        .map((item) => {
            const name = `@gre@${item.amount} @whi@${item.definition.name}`;

            return showId ? `${name} @yel@(${item.id})` : name;
        })
        .join(', ');

    player.message(`@lre@Bank of ${target.username}:`);
    player.message('@whi@' + (text || '(empty)'));
}

function queryWildernessState(player) {
    // reports the player total inside the regions data's 'wilderness' box
    let total = 0;

    for (const p of player.world.players.getAll()) {
        if (inBounds(p.x, p.y, WILDERNESS_BOUNDS)) {
            total += 1;
        }
    }

    player.message(
        MESSAGE_PREFIX +
            `There are currently @red@${total} @whi@player${total === 1 ? '' : 's'} in wilderness`
    );
}

function setFatigue(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[player] (percentage)');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'fatigue')) {
        return;
    }

    let pct = args.length > 1 ? +args[1] : 100;

    pct = Math.max(0, Math.min(100, pct));
    target.fatigue = Math.round((pct / 100) * 75000);
    target.sendFatigue();

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `Your fatigue has been set to ${pct}% by a staff member`);
    }

    player.message(MESSAGE_PREFIX + `${target.username}'s fatigue has been set to ${pct}%`);
}

function jailPlayer(player, command, args) {
    if (args.length !== 1) {
        badSyntax(player, command, '[name]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (target.cache.isJailed) {
        player.message(MESSAGE_PREFIX + 'You can not jail a player who has already been jailed.');
        return;
    }

    if (isStaff(target)) {
        player.message(MESSAGE_PREFIX + 'You can not jail a staff member.');
        return;
    }

    const from = { x: target.x, y: target.y };

    target.cache.jailReturnX = target.x;
    target.cache.jailReturnY = target.y;
    target.cache.isJailed = true;
    // Player.jail(): the Al Kharid mod room cell (75, 1641).
    target.teleport(75, 1641, true);

    player.message(
        MESSAGE_PREFIX + `You have jailed ${target.username} to 75,1641 from ${from.x},${from.y}`
    );
    target.message(
        MESSAGE_PREFIX +
            `You have been jailed to 75,1641 from ${from.x},${from.y} by ${getStaffName(player)}`
    );
}

function releasePlayer(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    if (isStaff(target)) {
        player.message(MESSAGE_PREFIX + 'You can not release a staff member.');
        return;
    }

    if (!target.cache.isJailed) {
        player.message(MESSAGE_PREFIX + target.username + ' has not been jailed.');
        return;
    }

    const from = { x: target.x, y: target.y };
    const toX = target.cache.jailReturnX;
    const toY = target.cache.jailReturnY;

    delete target.cache.isJailed;
    delete target.cache.jailReturnX;
    delete target.cache.jailReturnY;
    target.teleport(toX, toY, true);

    player.message(
        MESSAGE_PREFIX +
            `You have released ${target.username} from jail to ${toX},${toY} from ${from.x},${from.y}`
    );
    target.message(
        MESSAGE_PREFIX +
            `You have been released from jail to ${toX},${toY} from ${from.x},${from.y} by ${getStaffName(player)}`
    );
}

function sendAppearanceScreen(player, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    player.message(MESSAGE_PREFIX + target.username + ' has been sent the change appearance screen');

    if (target !== player) {
        target.message(MESSAGE_PREFIX + 'A staff member has sent you the change appearance screen');
    }

    target.lock();
    target.sendAppearance();
}

async function summonAllPlayers(player) {
    for (const p of player.world.players.getAll()) {
        if (p === player || isStaff(p)) {
            continue;
        }

        p.teleport(player.x, player.y, true);
        p.message(MESSAGE_PREFIX + 'You have been summoned by ' + getStaffName(player));
    }

    player.message(MESSAGE_PREFIX + `You have summoned all players to ${player.x},${player.y}`);
}

function returnAllPlayers(player) {
    // no per-summon return-point tracking, so there's nothing to return to
    player.message(
        MESSAGE_PREFIX +
            "This port doesn't track a per-summon return point; teleport players back manually with ::tp."
    );
}

// ==================================================================
// SuperModerator.java (isSuperMod)
// ==================================================================

function setCacheOther(player, command, args) {
    if (args.length < 2) {
        badSyntax(player, command, '(name) [cache_key] [cache_value]');
        return;
    }

    const hasName = args.length >= 3;
    const target = hasName ? findPlayer(player.world, args[0]) : player;
    const key = hasName ? args[1] : args[0];
    const raw = hasName ? args[2] : args[1];

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'modify cache of')) {
        return;
    }

    let value = raw;

    if (/^-?\d+$/.test(raw)) {
        value = +raw;
    } else if (raw === 'true' || raw === 'false') {
        value = raw === 'true';
    }

    target.cache[key] = value;
    player.message(MESSAGE_PREFIX + `Added ${key} with value ${raw} to ${target.username}'s cache`);
}

function removeCacheOther(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '(name) [cache_key]');
        return;
    }

    const hasName = args.length >= 2;
    const target = hasName ? findPlayer(player.world, args[0]) : player;
    const key = hasName ? args[1] : args[0];

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'modify cache of')) {
        return;
    }

    if (!(key in target.cache)) {
        player.message(MESSAGE_PREFIX + `${target.username} does not have the cache key ${key} set`);
        return;
    }

    delete target.cache[key];
    player.message(MESSAGE_PREFIX + `Removed ${target.username}'s cache key ${key}`);
}

function setQuestStage(player, command, args) {
    if (args.length < 2) {
        badSyntax(player, command, '[player] [questId] (stage)');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'modify quests of')) {
        return;
    }

    const questId = +args[1];
    const name = quests[questId];

    if (!name) {
        badSyntax(player, command, '[player] [questId] (stage)');
        return;
    }

    const stage = args.length >= 3 ? +args[2] : 0;

    target.questStages[name] = stage;
    target.sendQuestList();

    if (target !== player) {
        target.message(
            MESSAGE_PREFIX + `A staff member has changed your quest stage for QuestID ${questId} to stage ${stage}`
        );
    }

    player.message(
        MESSAGE_PREFIX + `You have changed ${target.username}'s QuestID: ${questId} to Stage: ${stage}.`
    );
}

function setQuestComplete(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[player] [questId]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'modify quests of')) {
        return;
    }

    const questId = +args[1];
    const name = quests[questId];

    if (!name) {
        badSyntax(player, command, '[player] [questId]');
        return;
    }

    // sendQuestList() treats stage -1 as "complete"
    target.questStages[name] = -1;
    target.sendQuestList();

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `A staff member has changed your quest to completed for QuestID ${questId}`);
    }

    player.message(MESSAGE_PREFIX + `You have completed Quest ID ${questId} for ${target.username}`);
}

function completeAllQuests(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    for (const name of quests) {
        target.questStages[name] = -1;
    }

    target.sendQuestList();
    player.message(MESSAGE_PREFIX + `You have completed all quests for ${target.username}`);
}

// ==================================================================
// PlayerModerator.java (isMod || isPlayerMod)
// ==================================================================

// online-target only; offline/all mutes need a DB lookup this port lacks
function setupMute(player, command, args, global) {
    if (args.length < 1) {
        badSyntax(
            player,
            command,
            '[name] [time in minutes, -1 for permanent, 0 to unmute] (Shadow mute) (Reason)'
        );
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (target === player) {
        player.message(MESSAGE_PREFIX + "You can't mute or unmute yourself");
        return;
    }

    if (!guardSeniority(player, target, 'mute')) {
        return;
    }

    let minutes = args.length >= 2 ? +args[1] : isMod(player) ? -1 : 60;

    if (Number.isNaN(minutes)) {
        badSyntax(
            player,
            command,
            '[name] [time in minutes, -1 for permanent, 0 to unmute] (Shadow mute) (Reason)'
        );
        return;
    }

    if (!isMod(player) && minutes === -1) {
        player.message(MESSAGE_PREFIX + 'You are not allowed to mute indefinitely.');
        return;
    }

    if (!isMod(player) && minutes > 10080) {
        player.message(
            MESSAGE_PREFIX + 'You are not allowed to mute that user for more than a week (10,080 minutes).'
        );
        return;
    }

    const muteText = global ? ' global chat ' : ' ';
    const minuteText = minutes === -1 ? 'permanent' : minutes + ' minute';

    if (minutes === 0) {
        target.message(`Your${muteText}mute has been lifted. Happy Classic Scaping!`);

        if (global) {
            target.cache.globalMuteExpires = 0;
        } else {
            target.muteEndDate = 0;
            target.cache.globalMuteExpires = 0;
        }

        player.message(MESSAGE_PREFIX + `You have lifted the${muteText}mute of ${target.username}.`);
        return;
    }

    target.message(MESSAGE_PREFIX + `You have received a ${minuteText}${muteText}mute.`);

    const endTime = minutes === -1 ? -1 : Date.now() + minutes * 60000;

    if (global) {
        target.cache.globalMuteExpires = endTime;
    } else {
        // a regular mute silences global chat too
        target.muteEndDate = endTime;
        target.cache.globalMuteExpires = endTime;
    }

    player.message(MESSAGE_PREFIX + `You have given ${target.username} a ${minuteText}${muteText}mute.`);
}

function showPlayerAlertBox(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[name] [message]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    const text = args.slice(1).join(' ');

    target.message('@gre@Moderator:@whi@ ' + text);
    player.message(MESSAGE_PREFIX + 'Alerted ' + target.username);
}

function uptime(player) {
    const world = player.world;

    if (!world.startedAt) {
        world.startedAt = Date.now();
    }

    const ms = Date.now() - world.startedAt;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    player.message(`The server has been online for ${hours}h ${minutes}m ${seconds}s`);
}

// ==================================================================
// Admins.java (isAdmin)
// ==================================================================

function saveAll(player) {
    const promises = [];

    for (const p of player.world.players.getAll()) {
        promises.push(p.save());
    }

    Promise.all(promises)
        .then(() => player.message(MESSAGE_PREFIX + 'Saved all players.'))
        .catch((e) => player.message(MESSAGE_PREFIX + 'Save failed: ' + e.message));
}

function spawnGroundItem(player, command, args) {
    if (args.length < 1 || args.length === 4) {
        badSyntax(player, command, '[id] (respawn_time) (amount) (x) (y)');
        return;
    }

    const id = resolveItemId(args[0]);

    if (id === -1) {
        player.message(MESSAGE_PREFIX + 'Invalid item id');
        return;
    }

    const amount = args.length >= 3 ? +args[2] : 1;
    const x = args.length >= 4 ? +args[3] : player.x;
    const y = args.length >= 5 ? +args[4] : player.y;

    if (player.world.holidayDropBlocked(x, y)) {
        player.message(MESSAGE_PREFIX + 'Can not place a ground item here');
        return;
    }

    // spawns a single ground item for this session only, not persisted across a restart
    player.world.addEntity('groundItems', new GroundItem(player.world, { id, amount, x, y }));
    player.message(
        MESSAGE_PREFIX +
            `Added ground item (this session only): ${items[id].name} with item ID ${id} at ${x},${y}`
    );
}

function removeGroundItem(player, command, args) {
    if (args.length === 1) {
        badSyntax(player, command, '(x) (y)');
        return;
    }

    const x = args.length >= 1 ? +args[0] : player.x;
    const y = args.length >= 2 ? +args[1] : player.y;
    const [item] = player.world.groundItems.getAtPoint(x, y);

    if (!item) {
        player.message(MESSAGE_PREFIX + `There is no ground item at coordinates ${x},${y}`);
        return;
    }

    player.world.removeEntity('groundItems', item);
    player.message(MESSAGE_PREFIX + `Removed ground item: ${item.definition.name} with item ID ${item.id}`);
}

function spawnItemInventory(player, command, args, noted) {
    if (args.length < 1) {
        badSyntax(player, command, '[id or item name] (amount) (player)');
        return;
    }

    const id = resolveItemId(args[0]);

    if (id === -1) {
        badSyntax(player, command, '[id or item name] (amount) (player)');
        return;
    }

    const amount = args.length >= 2 ? +args[1] : 1;
    const target = args.length >= 3 ? findPlayer(player.world, args[2]) : player;

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!items[id].stackable && amount > 30) {
        player.message(MESSAGE_PREFIX + 'Invalid amount specified. Please spawn 30 or less of that item.');
        return;
    }

    void noted; // this port's item table has no noted-item variants
    target.inventory.add(id, amount);
    player.message(MESSAGE_PREFIX + `You have spawned ${amount} ${items[id].name} to ${target.username}`);

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `A staff member has given you ${amount} ${items[id].name}`);
    }
}

function spawnItemBank(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[id or item name] (amount) (player)');
        return;
    }

    const id = resolveItemId(args[0]);

    if (id === -1) {
        player.message(MESSAGE_PREFIX + 'Invalid item id');
        return;
    }

    const amount = args.length >= 2 ? +args[1] : 1;
    const target = args.length >= 3 ? findPlayer(player.world, args[2]) : player;

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    target.bank.add(id, amount);
    player.message(
        MESSAGE_PREFIX + `You have spawned to bank ${amount} ${items[id].name} to ${target.username}`
    );

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `A staff member has added to your bank ${amount} ${items[id].name}`);
    }
}

function spawnItemBankFill(player) {
    for (let id = 0; id < items.length; id += 1) {
        if (items[id]) {
            player.bank.add(id, 50);
        }
    }

    player.message('Added bank items.');
}

function removeItemBankAll(player, username) {
    const target = findPlayer(player.world, username) || player;

    target.bank.items = [];
    target.bank.sendOpen();
    player.message(MESSAGE_PREFIX + `Wiped ${target.username}'s bank.`);
}

function spawnItemBestInSlot() {
    // stub: the specific OpenRSC item ids weren't extracted here
}

function restorePlayerHits(player, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    target.skills.hits.current = target.skills.hits.base;
    target.sendStats();

    if (target !== player) {
        target.message(MESSAGE_PREFIX + 'You have been healed by an admin');
    }

    player.message(MESSAGE_PREFIX + 'Healed: ' + target.username);
}

function restorePlayerPrayer(player, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    target.skills.prayer.current = target.skills.prayer.base;
    target.sendStats();

    if (target !== player) {
        target.message(MESSAGE_PREFIX + 'Your prayer has been recharged by an admin');
    }

    player.message(MESSAGE_PREFIX + 'Recharged: ' + target.username);
}

function restorePlayerHits2(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[name] [hp]');
        return;
    }

    const target = args.length > 1 ? findPlayer(player.world, args[0]) : player;

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'set hp of')) {
        return;
    }

    let hp = +args[args.length > 1 ? 1 : 0];

    hp = Math.max(0, Math.min(target.skills.hits.base, hp));

    const current = target.skills.hits.current;

    if (hp < current) {
        // route a decrease through damage() so death is handled like a real hit
        target.damage(current - hp, player);
    } else {
        target.skills.hits.current = hp;
        target.sendStats();
    }

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `Your hits have been set to ${hp} by an admin`);
    }

    player.message(MESSAGE_PREFIX + `Set ${target.username}'s hits to ${hp}`);
}

function restorePlayerPrayer2(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[name] [prayer]');
        return;
    }

    const target = args.length > 1 ? findPlayer(player.world, args[0]) : player;

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'set prayer of')) {
        return;
    }

    let level = +args[args.length > 1 ? 1 : 0];

    level = Math.max(0, Math.min(target.skills.prayer.base, level));
    target.skills.prayer.current = level;
    target.sendStats();

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `Your prayer has been set to ${level} by an admin`);
    }

    player.message(MESSAGE_PREFIX + `Set ${target.username}'s prayer to ${level}`);
}

function killPlayer(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[player]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'kill')) {
        return;
    }

    // full-hits damage() zeroes hits and calls die(), the clean death path
    target.damage(target.skills.hits.current, player);

    if (target !== player) {
        target.message(MESSAGE_PREFIX + 'You have been killed by an admin');
    }

    player.message(MESSAGE_PREFIX + 'Killed ' + target.username);
}

function damagePlayer(player, command, args) {
    if (args.length < 2) {
        badSyntax(player, command, '[name] [amount]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    const amount = +args[1];

    if (Number.isNaN(amount)) {
        badSyntax(player, command, '[name] [amount]');
        return;
    }

    if (!guardSeniority(player, target, 'damage')) {
        return;
    }

    target.damage(amount, player);

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `You have taken ${amount} damage from an admin`);
    }

    player.message(MESSAGE_PREFIX + `Dealt ${amount} damage to ${target.username}`);
}

function removeItemInventoryAll(player, command, args) {
    const target = args.length > 0 ? findPlayer(player.world, args[0]) : player;

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    target.inventory.items = [];
    target.inventory.sendAll();
    player.message(MESSAGE_PREFIX + `Wiped ${target.username}'s inventory.`);
}

function playerTalk(player, command, args) {
    if (args.length < 2) {
        badSyntax(player, command, '[player] [msg]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    target.broadcastChat(args.slice(1).join(' '));
}

function damageNpc(player, command, args) {
    if (args.length < 2) {
        badSyntax(player, command, '[npc instance id] [amount]');
        return;
    }

    const npc = player.world.npcs.getByIndex(+args[0]);

    if (!npc) {
        player.message(MESSAGE_PREFIX + "Couldn't find that npc.");
        return;
    }

    npc.damage(+args[1], player);
    player.message(MESSAGE_PREFIX + `Dealt ${+args[1]} damage to ${npc.definition.name}`);
}

function playerQueryCombatStyle(player) {
    player.message(MESSAGE_PREFIX + 'Your combat style is ' + player.combatStyle);
}

function playerSkull(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[player]');
        return;
    }

    const target = findPlayer(player.world, args[0]);

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!guardSeniority(player, target, 'skull')) {
        return;
    }

    const skull = command.toLowerCase() === 'skull';
    const wasSkulled = target.skulled > 0;

    if (!skull) {
        target.skulled = 0;
    } else {
        // SKULL_DURATION_TICKS = round(1200000/640)
        target.skulled = Math.round(1200000 / 640);
    }

    const verb = !skull ? (wasSkulled ? 'removed' : '') : wasSkulled ? 'renewed' : 'added';

    if (!wasSkulled && !skull) {
        player.message(MESSAGE_PREFIX + 'PK skull was already inactive: ' + target.username);
        return;
    }

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `PK skull has been ${verb} by a staff member`);
    }

    player.message(MESSAGE_PREFIX + `PK skull has been ${verb}: ${target.username}`);
}

function playerQueryIP(player, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    player.message(MESSAGE_PREFIX + `${target.username} IP address: ${target.lastIP || 'unknown'}`);
}

function spawnNpc(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[id] (radius) (time in minutes)');
        return;
    }

    const id = +args[0];

    if (!npcs[id]) {
        player.message(MESSAGE_PREFIX + 'Invalid spawn npc id');
        return;
    }

    const radius = args.length >= 2 ? +args[1] : 1;
    const minutes = args.length >= 3 ? +args[2] : 10;
    const npc = new NPC(player.world, {
        id,
        x: player.x,
        y: player.y,
        minX: player.x - radius,
        maxX: player.x + radius,
        minY: player.y - radius,
        maxY: player.y + radius
    });

    delete npc.respawn;
    player.world.addEntity('npcs', npc);
    player.world.setTimeout(() => {
        if (player.world.npcs.entities[npc.index] === npc) {
            player.world.removeEntity('npcs', npc);
        }
    }, minutes * 60000);

    player.message(MESSAGE_PREFIX + `Added NPC: ${npc.definition.name} at ${player.x},${player.y} for ${minutes}m`);
}

// the various OpenRSC holiday-drop commands collapse into one toggle:
// a single active/inactive switch keyed off the real calendar date.
function toggleHolidayDrop(player) {
    const config = player.world.server.config;

    config.holidayEvents = !config.holidayEvents;
    player.message(
        MESSAGE_PREFIX + 'Holiday drop events are now ' + (config.holidayEvents ? 'ON' : 'OFF')
    );

    if (config.holidayEvents) {
        player.world.holidayDropTick();
    }
}

function giveLemons(player, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    const letters = 'LEMONS!';
    let text = '';

    for (let i = 0; i < 5; i += 1) {
        for (const ch of letters) {
            text += (Math.random() < 0.2 ? '@ora@' : '@yel@') + ch;
        }

        text += ' ';
    }

    const free = target.inventory.items ? 30 - target.inventory.items.length : 0;

    for (let i = 0; i < Math.max(0, free); i += 1) {
        target.inventory.add(855, 1); // Lemon
    }

    player.message(text);
    target.message(text);
}

function changeStatXP(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[player] [experience] (stat)');
        return;
    }

    let target = player;
    let rest = args;

    if (Number.isNaN(+args[0])) {
        target = findPlayer(player.world, args[0]);
        rest = args.slice(1);
    }

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (rest.length < 1 || Number.isNaN(+rest[0])) {
        badSyntax(player, command, '[player] [experience] (stat)');
        return;
    }

    const xp = +rest[0];
    const statName = rest.length >= 2 ? rest[1].toLowerCase() : null;

    if (statName && !target.skills[statName]) {
        player.message(MESSAGE_PREFIX + 'Invalid stat');
        return;
    }

    if (!guardSeniority(player, target, 'modify stats of')) {
        return;
    }

    const names = statName ? [statName] : Object.keys(target.skills);

    for (const name of names) {
        const delta = xp - target.skills[name].experience;

        target.addExperience(name, delta, false);
    }

    player.message(
        MESSAGE_PREFIX + `You have set ${target.username}'s ${statName || 'all'} experience to ${formatNumber(xp)}`
    );
}

function changeMaxStat(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[player] [level] (stat)');
        return;
    }

    let target = player;
    let rest = args;

    if (Number.isNaN(+args[0])) {
        target = findPlayer(player.world, args[0]);
        rest = args.slice(1);
    }

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (rest.length < 1 || Number.isNaN(+rest[0])) {
        badSyntax(player, command, '[player] [level] (stat)');
        return;
    }

    const level = Math.max(1, Math.min(255, +rest[0]));
    const statName = rest.length >= 2 ? rest[1].toLowerCase() : null;

    if (statName && !target.skills[statName]) {
        player.message(MESSAGE_PREFIX + 'Invalid stat');
        return;
    }

    if (!guardSeniority(player, target, 'modify stats of')) {
        return;
    }

    const names = statName ? [statName] : Object.keys(target.skills);

    for (const name of names) {
        target.skills[name].base = level;
        target.skills[name].current = level;
    }

    target.sendStats();
    player.message(
        MESSAGE_PREFIX + `You have set ${target.username}'s effective ${statName || 'levels'} to ${level}`
    );

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `Your effective ${statName || 'levels'} have been set to ${level} by a staff member`);
    }
}

function changeCurrentStat(player, command, args) {
    // a temporary level change that decays back toward base, not the permanent ::stat change
    if (args.length < 1) {
        badSyntax(player, command, '[player] [level] (stat)');
        return;
    }

    let target = player;
    let rest = args;

    if (Number.isNaN(+args[0])) {
        target = findPlayer(player.world, args[0]);
        rest = args.slice(1);
    }

    if (!target) {
        player.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (rest.length < 1 || Number.isNaN(+rest[0])) {
        badSyntax(player, command, '[player] [level] (stat)');
        return;
    }

    if (!isAdmin(player) && target !== player) {
        player.message(MESSAGE_PREFIX + 'You can not modify other players’ stats.');
        return;
    }

    if (!guardSeniority(player, target, 'modify stats of')) {
        return;
    }

    const level = Math.max(1, Math.min(255, +rest[0]));
    const statName = rest.length >= 2 ? rest[1].toLowerCase() : null;

    if (statName && !target.skills[statName]) {
        player.message(MESSAGE_PREFIX + 'Invalid stat');
        return;
    }

    const names = statName ? [statName] : Object.keys(target.skills);

    for (const name of names) {
        target.skills[name].current = level;
    }

    target.sendStats();
    player.message(
        MESSAGE_PREFIX + `You have set ${target.username}'s effective ${statName || 'levels'} to ${level}`
    );

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `Your effective ${statName || 'levels'} have been set to ${level} by a staff member`);
    }
}

// ==================================================================
// Development.java (isDev)
// ==================================================================

function serverStats(player) {
    const world = player.world;
    const count = [...world.players.getAll()].length;
    const mem = process.memoryUsage ? process.memoryUsage().heapUsed / 1048576 : 0;

    player.message(`@whi@Players online: @gre@${count}`);
    player.message(`@whi@Heap used: @gre@${mem.toFixed(1)}MB`);
}

function setCombatStyleCommand(player, args) {
    const style = args.length ? +args[0] : 0; // Skills.CONTROLLED_MODE = 0

    if (Number.isNaN(style)) {
        return;
    }

    player.combatStyle = style;
}

function createNpc(player, command, args) {
    if (args.length < 2 || args.length === 3) {
        badSyntax(player, command, '[id] [radius] (x) (y)');
        return;
    }

    const id = +args[0];
    const radius = +args[1];
    const x = args.length >= 4 ? +args[2] : player.x;
    const y = args.length >= 4 ? +args[3] : player.y;

    if (!npcs[id]) {
        player.message(MESSAGE_PREFIX + 'Invalid npc id');
        return;
    }

    const npc = new NPC(player.world, {
        id,
        x,
        y,
        minX: x - radius,
        maxX: x + radius,
        minY: y - radius,
        maxY: y + radius
    });

    player.world.addEntity('npcs', npc);
    player.message(MESSAGE_PREFIX + `Added NPC: ${npc.definition.name} at ${x},${y} with radius ${radius}`);
}

function removeNpc(player, command, args) {
    if (args.length < 1) {
        badSyntax(player, command, '[npc_instance_id]');
        return;
    }

    const npc = player.world.npcs.getByIndex(+args[0]);

    if (!npc) {
        player.message(MESSAGE_PREFIX + 'Invalid npc instance id');
        return;
    }

    player.world.removeEntity('npcs', npc);
    player.message(MESSAGE_PREFIX + `Removed NPC: ${npc.definition.name} with instance ID ${args[0]}`);
}

function createObject(player, command, args) {
    if (args.length < 1 || args.length === 2) {
        badSyntax(player, command, '[id] (x) (y)');
        return;
    }

    const id = +args[0];
    const x = args.length >= 3 ? +args[1] : player.x;
    const y = args.length >= 3 ? +args[2] : player.y;

    if (!objects[id]) {
        player.message(MESSAGE_PREFIX + 'Invalid scenery id');
        return;
    }

    const [existing] = player.world.gameObjects.getAtPoint(x, y);

    if (existing) {
        player.message('There is already scenery in that spot: ' + existing.definition.name);
        return;
    }

    const obj = new GameObject(player.world, { id, direction: 0, x, y });

    player.world.addEntity('gameObjects', obj);
    player.message(MESSAGE_PREFIX + `Added scenery: ${obj.definition.name} with ID ${id} at ${x},${y}`);
}

function createWallObject(player, command, args) {
    if (args.length < 1 || args.length === 3) {
        badSyntax(player, command, '[id] (dir) (x) (y)');
        return;
    }

    const id = +args[0];
    const dir = args.length >= 2 ? +args[1] : 0;
    const x = args.length >= 4 ? +args[2] : player.x;
    const y = args.length >= 4 ? +args[3] : player.y;

    if (!wallObjectDefs[id]) {
        player.message(MESSAGE_PREFIX + 'Invalid boundary id');
        return;
    }

    const obj = new WallObject(player.world, { id, direction: dir, x, y });

    player.world.addEntity('wallObjects', obj);
    player.message(MESSAGE_PREFIX + `Added boundary: ${obj.definition.name} with ID ${id} at ${x},${y}`);
}

function removeObject(player, command, args) {
    if (args.length === 1) {
        badSyntax(player, command, '(x) (y)');
        return;
    }

    const x = args.length >= 1 ? +args[0] : player.x;
    const y = args.length >= 2 ? +args[1] : player.y;
    const [obj] = player.world.gameObjects.getAtPoint(x, y);

    if (!obj) {
        player.message(MESSAGE_PREFIX + `There is no scenery at coordinates ${x},${y}`);
        return;
    }

    player.world.removeEntity('gameObjects', obj);
    player.message(MESSAGE_PREFIX + `Removed scenery: ${obj.definition.name} with ID ${obj.id}`);
}

function rotateObject(player, command, args) {
    if (args.length === 1) {
        badSyntax(player, command, '(x) (y) (direction)');
        return;
    }

    const x = args.length >= 1 ? +args[0] : player.x;
    const y = args.length >= 2 ? +args[1] : player.y;
    const [obj] = player.world.gameObjects.getAtPoint(x, y);

    if (!obj) {
        player.message(MESSAGE_PREFIX + `There is no object at coordinates ${x},${y}`);
        return;
    }

    let direction = args.length >= 3 ? +args[2] : obj.direction + 1;

    direction = Math.abs(direction % 8);
    player.world.removeEntity('gameObjects', obj);

    const newObj = new GameObject(player.world, { id: obj.id, direction, x, y });

    player.world.addEntity('gameObjects', newObj);
    player.message(MESSAGE_PREFIX + `Rotated object: ${newObj.definition.name} to rotation ${direction} at ${x},${y}`);
}

// ==================================================================
// Event.java (isEvent)
// ==================================================================

function toggleEventChest(player, command, args) {
    const world = player.world;
    const radius = args.length >= 2 ? +args[1] : 4;
    const minutes = args.length >= 1 ? +args[0] : 60;

    if (world.eventChest) {
        const { x, y } = world.eventChest;

        world.removeEntity('gameObjects', world.eventChest);
        world.eventChest = null;
        world.eventChestRadius = 4;
        player.message(MESSAGE_PREFIX + `Event chest at ${x},${y} has been disabled.`);
        return;
    }

    const [existing] = player.world.gameObjects.getAtPoint(player.x, player.y);

    if (existing) {
        player.message(
            MESSAGE_PREFIX + `Could not enable event chest at ${player.x},${player.y} due to blocking ${existing.definition.name}.`
        );
        return;
    }

    // scenery 247 (crystal chest) year-round, 257 (cauldron) on Oct 31 - Nov 1
    const now = new Date();
    const isHalloween =
        (now.getMonth() === 9 && now.getDate() === 31) ||
        (now.getMonth() === 10 && now.getDate() === 1);
    const sceneryId = isHalloween ? 257 : 247;
    const chest = new GameObject(world, {
        id: sceneryId,
        direction: 0,
        x: player.x,
        y: player.y
    });

    world.addEntity('gameObjects', chest);
    world.eventChest = chest;
    world.eventChestRadius = radius;

    world.setTimeout(() => {
        if (world.eventChest === chest) {
            world.removeEntity('gameObjects', chest);
            world.eventChest = null;
            world.eventChestRadius = 4;
        }
    }, minutes * 60000);

    player.message(MESSAGE_PREFIX + `Event chest has been enabled at ${player.x},${player.y}.`);
}

function toggleSeersParty(player, command, args) {
    const minutes = args.length >= 1 ? +args[0] : 60;
    const upstairs = player.y >= 1408 && player.y <= 1415 && player.x >= 490 && player.x <= 500;
    const downstairs = player.y >= 464 && player.y <= 471 && player.x >= 490 && player.x <= 500;

    if (!upstairs && !downstairs) {
        player.message(MESSAGE_PREFIX + 'This command can only be run within the vicinity of the seers party hall');
        return;
    }

    const x = 495;
    const y = upstairs ? 1411 : 467;
    const [existing] = player.world.gameObjects.getAtPoint(x, y);

    if (existing && existing.id !== 18 && existing.id !== 17) {
        player.message(
            MESSAGE_PREFIX +
                `Could not enable seers party hall ${upstairs ? 'upstairs' : 'downstairs'} object exists: ${existing.definition.name}`
        );
        return;
    }

    if (existing) {
        player.world.removeEntity('gameObjects', existing);
        player.message(
            MESSAGE_PREFIX + `Seers party hall ${upstairs ? 'upstairs' : 'downstairs'} has been disabled.`
        );
        return;
    }

    const chest = new GameObject(player.world, { id: 18, direction: 0, x, y });

    player.world.addEntity('gameObjects', chest);
    player.world.setTimeout(() => {
        if (player.world.gameObjects.entities[chest.index] === chest) {
            player.world.removeEntity('gameObjects', chest);
        }
    }, minutes * 60000);
    player.message(
        MESSAGE_PREFIX + `Seers party hall ${upstairs ? 'upstairs' : 'downstairs'} has been enabled.`
    );
}

function disablePvpEvent(player) {
    const world = player.world;

    world.EVENT_X = -1;
    world.EVENT_Y = -1;
    world.EVENT = false;
    world.EVENT_COMBAT_MIN = -1;
    world.EVENT_COMBAT_MAX = -1;
    player.message(MESSAGE_PREFIX + 'Event disabled');
}

function enablePvpEvent(player, command, args) {
    if (args.length < 4) {
        badSyntax(player, command, '[x] [y] [minCb] [maxCb]');
        return;
    }

    const [x, y, cbMin, cbMax] = args.slice(0, 4).map(Number);

    if ([x, y, cbMin, cbMax].some(Number.isNaN)) {
        badSyntax(player, command, '[x] [y] [minCb] [maxCb]');
        return;
    }

    const world = player.world;

    world.EVENT_X = x;
    world.EVENT_Y = y;
    world.EVENT = true;
    world.EVENT_COMBAT_MIN = cbMin;
    world.EVENT_COMBAT_MAX = cbMax;
    player.message(MESSAGE_PREFIX + `Event enabled: ${x}, ${y}, Combat level range: ${cbMin} - ${cbMax}`);
}

async function returnPlayerCommand(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    if (target !== player && !isMod(player)) {
        player.message(MESSAGE_PREFIX + 'You can not return other players.');
        return;
    }

    if (!guardSeniority(player, target, 'return')) {
        return;
    }

    if (!target.cache.summonReturnX && target.cache.summonReturnX !== 0) {
        player.message(MESSAGE_PREFIX + target.username + ' has not been summoned.');
        return;
    }

    const from = { x: target.x, y: target.y };

    target.teleport(target.cache.summonReturnX, target.cache.summonReturnY, true);
    delete target.cache.summonReturnX;
    delete target.cache.summonReturnY;

    player.message(
        MESSAGE_PREFIX + `You have returned ${target.username} to ${target.x},${target.y} from ${from.x},${from.y}`
    );

    if (target !== player) {
        target.message(MESSAGE_PREFIX + 'You have been returned by ' + getStaffName(player));
    }
}

function npcTalk(player, command, args) {
    if (args.length < 2) {
        badSyntax(player, command, '[npc_id] [msg]');
        return;
    }

    const npcTypeId = +args[0];
    const message = args.slice(1).join(' ');

    if (Number.isNaN(npcTypeId)) {
        badSyntax(player, command, '[npc_id] [msg]');
        return;
    }

    const npc = player.world.npcs.getByID(npcTypeId);

    if (!npc) {
        player.message(MESSAGE_PREFIX + 'NPC could not be found');
        return;
    }

    // best-effort broadcast: reaches nearby players as a plain server message, not a speech bubble
    for (const p of player.world.players.getAll()) {
        if (Math.abs(p.x - npc.x) <= 15 && Math.abs(p.y - npc.y) <= 15) {
            p.message(`${npc.definition.name}: ${message}`);
        }
    }
}

function npcKills(player, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    const counts = (target.cache && target.cache.npcKillCounts) || {};
    let total = 0;

    for (const id in counts) {
        total += counts[id] | 0;
    }

    player.message('' + total);
}

function enableInvisibleOther(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    if (target !== player && !isSuperMod(player)) {
        player.message(MESSAGE_PREFIX + 'You can not make other users invisible.');
        return;
    }

    if (!guardSeniority(player, target, 'change the invisible state of')) {
        return;
    }

    let invisible;

    if (args.length > 1) {
        invisible = args[1] === 'true' || args[1] === '1';
    } else {
        invisible = !target.cache.invisible;
    }

    // flag-only; enforcing invisibility needs changes outside this file
    target.cache.invisible = invisible;

    const text = invisible ? 'invisible' : 'visible';

    player.message(MESSAGE_PREFIX + `${target.username} is now ${text}`);

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `A staff member has made you ${text}`);
    }
}

function enableInvulnerableOther(player, command, args) {
    const target = resolveTarget(player, args);

    if (!target) {
        return;
    }

    if (target !== player && !isSuperMod(player)) {
        player.message(MESSAGE_PREFIX + 'You can not make other users invulnerable.');
        return;
    }

    if (!guardSeniority(player, target, 'change the invulnerable state of')) {
        return;
    }

    let invulnerable;

    if (args.length > 1) {
        invulnerable = args[1] === 'true' || args[1] === '1';
    } else {
        invulnerable = !target.cache.invulnerable;
    }

    // flag-only; incoming damage isn't actually suppressed here
    target.cache.invulnerable = invulnerable;

    const text = invulnerable ? 'invulnerable' : 'vulnerable';

    player.message(MESSAGE_PREFIX + `${target.username} is now ${text}`);

    if (target !== player) {
        target.message(MESSAGE_PREFIX + `A staff member has made you ${text}`);
    }
}

// ---- command table ----

const TABLE = {};

function reg(names, rank, fn) {
    for (const name of names.split(' ')) {
        TABLE[name] = { rank, fn };
    }
}

function regBlocked(names, rank, need) {
    reg(names, rank, blocked(need));
}

// rank: any tier may view; changeGroupId gates the set path on isAdmin
reg('setgroup setrank group rank', 'playermod', (p, c, a) => changeGroupId(p, c, a));

// Moderator.java
reg('announce announcement anounce anouncement', 'mod', (p, c, a) => sendAnnouncement(p, c, a));
reg('sysmes systemmessage', 'mod', (p, c, a) => showSystemMessageBox(p, c, a));
reg('say', 'mod', (p, c, a) => forceGlobalMessage(p, c, a));
reg('kick', 'mod', (p, c, a) => kickPlayer(p, c, a));
reg('quest getquest checkquest', 'mod', (p, c, a) => checkQuest(p, c, a));
// only the literal "tpnpc" is registered; the instance id is args[0]
reg('tpnpc', 'mod', (p, c, a) => tpNpc(p, c, a));
// slots 0-9 are enumerated because dispatch is on exact command words
reg('defineslot0 defineslot1 defineslot2 defineslot3 defineslot4 defineslot5 defineslot6 defineslot7 defineslot8 defineslot9', 'mod', (p, c, a) => defineSlot(p, c, a));
reg('summon', 'mod', (p, c, a) => summonPlayer(p, c, a));
reg('info about', 'mod', (p, c, a) => queryPlayerInformation(p, c, a));
reg('inventory', 'mod', (p, c, a) => queryPlayerInventory(p, c, a));
reg('bank', 'mod', (p, c, a) => queryPlayerBank(p, c, a));
regBlocked('ban unban', 'mod', 'a persisted ban list + a login-time gate (packet-handlers/login.js is outside this file set); ::kick removes the session now');
regBlocked(
    'renameplayer rename rp rn ren renameuser renamechar offensivename inappropriatename badname releasename freeusername freename removeformername',
    'mod',
    'a username-change/history table and offline-player DB lookups this port does not have'
);
// online-target variant only; the offline path needs a DB query this port lacks
reg('getcache gcache checkcache', 'mod', (p, c, a) => {
    const hasName = a.length >= 2;
    const target = hasName ? findPlayer(p.world, a[0]) : p;
    const key = hasName ? a[1] : a[0];

    if (!key) {
        badSyntax(p, c, '(name) [cache_key]');
        return;
    }

    if (!target) {
        p.message(MESSAGE_PREFIX + 'Invalid name or player is not online');
        return;
    }

    if (!(key in target.cache)) {
        p.message(MESSAGE_PREFIX + `${target.username} does not have the cache key ${key} set`);
        return;
    }

    p.message(MESSAGE_PREFIX + `${target.username} has value ${JSON.stringify(target.cache[key])} for cache key ${key}`);
});
reg('fatigue', 'mod', (p, c, a) => setFatigue(p, c, a));
reg('appearance changeappearance', 'mod', (p, c, a) => sendAppearanceScreen(p, a));
reg('summonall', 'mod', (p) => summonAllPlayers(p));
reg('returnall', 'mod', (p) => returnAllPlayers(p));
reg('jail', 'mod', (p, c, a) => jailPlayer(p, c, a));
reg('release', 'mod', (p, c, a) => releasePlayer(p, c, a));
regBlocked('stayin', 'mod', 'a "deny logout requests" flag (this port logs a player out immediately; there is no logout-request/deny-window concept)');
reg('wilderness', 'mod', (p) => queryWildernessState(p));
regBlocked(
    'queuesleepword qs queuesleepwordspecial qss qssls lsqss listspecialsleepwords forcesleep addbadword removebadword addgoodword removegoodword syncgoodwordsbadwords sgb addalertword removealertword togglespacefiltering babymode reloadsslcert refreshsslcert',
    'mod',
    'OpenRSC’s prerendered-sleepword gallery and MessageFilter word-list system (badwords/goodwords/alertwords, disk-persisted) -- not modeled in this port; this port’s captcha (captcha-nocanvas.js) renders fresh each time and has no staff-editable word lists'
);
regBlocked('gettutorial toggletutorial', 'mod', 'a SHOW_TUTORIAL_SKIP_OPTION config toggle; ::skiptutorial is unconditionally available in this port');

// SuperModerator.java
reg('setcache scache storecache', 'supermod', (p, c, a) => setCacheOther(p, c, a));
reg('deletecache dcache removecache rcache', 'supermod', (p, c, a) => removeCacheOther(p, c, a));
reg('setquest queststage setqueststage resetquest resetq', 'supermod', (p, c, a) => setQuestStage(p, c, a));
reg('questcomplete questcom', 'supermod', (p, c, a) => setQuestComplete(p, c, a));
reg('completeallquests', 'supermod', (p, c, a) => completeAllQuests(p, c, a));
regBlocked(
    'banall banip ipban ipcount ipmute muteip syncipbans syncipmutes sip sipm viewipbans viewipmutes unbanall cleanidle cleanidleconns cleanidleconnections simlogin simregister',
    'supermod',
    'per-IP ban/mute lists, connection tracking, and simulated-login load testing -- this port has no IP address book (see report); ::spawnbot family covers "more player-like entities" for testing'
);

// PlayerModerator.java
// unmute forwards to the mute setup with duration forced to 0
reg('mute', 'playermod', (p, c, a) => setupMute(p, c, a, false));
reg('unmute', 'playermod', (p, c, a) => {
    if (a.length < 1) { badSyntax(p, c, '[name]'); return; }
    setupMute(p, c, [a[0], '0', ...a.slice(2)], false);
});
reg('gmute', 'playermod', (p, c, a) => setupMute(p, c, a, true));
reg('ungmute', 'playermod', (p, c, a) => {
    if (a.length < 1) { badSyntax(p, c, '[name]'); return; }
    setupMute(p, c, [a[0], '0', ...a.slice(2)], true);
});
regBlocked('muteall unmuteall', 'playermod', 'IP-linked-account resolution (see ::banall) to find "related" accounts to mute together');
reg('alert', 'playermod', (p, c, a) => showPlayerAlertBox(p, c, a));
reg('uptime', 'playermod', (p) => uptime(p));
regBlocked('check', 'playermod', 'IP-linked-account lookups (PlayerIps/linkedPlayers) this port has no equivalent database for');
regBlocked(
    'set_icon redhat rhel robe setrobe setrobes become becomenpc morph morphnpc becomegod speaktongues restorehumanity resetappearance',
    'playermod',
    "OpenRSC's AppearanceId sprite-override table (~30 named cosmetic looks) and updateWornItems(slot, spriteId); this port's appearance model has no per-slot cosmetic override outside the normal equipment system"
);

// Admins.java
reg('saveall', 'admin', (p) => saveAll(p));
reg('gi gitem grounditem', 'admin', (p, c, a) => spawnGroundItem(p, c, a));
reg('rgi rgitem rgrounditem removegi removegitem removegrounditem', 'admin', (p, c, a) => removeGroundItem(p, c, a));
reg('item', 'admin', (p, c, a) => spawnItemInventory(p, c, a, false));
reg('certeditem noteditem', 'admin', (p, c, a) => spawnItemInventory(p, c, a, true));
// args: [id or item name] (amount) (player), same order as ::item
reg('ritem', 'admin', (p, c, a) => {
    const id = resolveItemId(a[0] || '');
    const amount = a.length >= 2 ? +a[1] : 1;
    const target = a.length >= 3 ? findPlayer(p.world, a[2]) : p;

    if (!target || id === -1 || Number.isNaN(amount)) {
        p.message(MESSAGE_PREFIX + 'Invalid name or item');
        return;
    }

    target.inventory.remove(id, amount);
    p.message(MESSAGE_PREFIX + `Removed item from ${target.username}`);
});
reg('rbitem', 'admin', (p, c, a) => {
    const id = resolveItemId(a[0] || '');
    const target = a.length >= 3 ? findPlayer(p.world, a[2]) : p;

    if (!target || id === -1) {
        p.message(MESSAGE_PREFIX + 'Invalid name or item');
        return;
    }

    target.bank.remove(id, a.length >= 2 ? +a[1] : 1);
    p.message(MESSAGE_PREFIX + `Removed item from ${target.username}'s bank`);
});
reg('bankitem bitem addbank', 'admin', (p, c, a) => spawnItemBank(p, c, a));
reg('fillbank', 'admin', (p) => spawnItemBankFill(p));
reg('unfillbank', 'admin', (p) => removeItemBankAll(p, p.username));
reg('wipebank', 'admin', (p, c, a) => {
    if (a.length < 1) {
        badSyntax(p, c, '[player]');
        return;
    }

    removeItemBankAll(p, a[0]);
});
reg('quickbank', 'admin', (p) => {
    p.setAccessingBank(true);
    p.bank.open();
});
regBlocked('quickauction', 'admin', 'an auction house (no such system exists in this port)');
regBlocked('beastmode', 'admin', "OpenRSC's per-slot best-in-slot item id table (~40 hardcoded ids) -- not extracted for this report; ::item can spawn any specific item directly");
reg('heal', 'admin', (p, c, a) => restorePlayerHits(p, a));
reg('recharge healprayer healp', 'admin', (p, c, a) => restorePlayerPrayer(p, a));
reg('hp sethp hits sethits', 'admin', (p, c, a) => restorePlayerHits2(p, c, a));
reg('prayer setprayer', 'admin', (p, c, a) => restorePlayerPrayer2(p, c, a));
reg('kill', 'admin', (p, c, a) => killPlayer(p, c, a));
reg('damage dmg', 'admin', (p, c, a) => damagePlayer(p, c, a));
reg('wipeinventory wipeinv', 'admin', (p, c, a) => removeItemInventoryAll(p, c, a));
regBlocked('swapitem', 'admin', 'not implemented in this report -- combine ::ritem and ::item on the target instead');
regBlocked(
    'massitem massnpc',
    'admin',
    'a whole-map-grid iteration to place items/npcs everywhere at once (Admins.spawnGroundItemWorldwide/spawnNpcWorldwide) -- left out by scope judgement for a small LAN world: ::gi/::spawnnpc cover single-location spawns, and flooding the whole map risks flooding client entity lists for little benefit here'
);
reg('playertalk', 'admin', (p, c, a) => playerTalk(p, c, a));
reg('smitenpc damagenpc dmgnpc', 'admin', (p, c, a) => damageNpc(p, c, a));
regBlocked(
    'npcevent chickenevent stopnpcevent cancelnpcevent stopchickenevent getnpcevent checknpcevent wildrule shootme npcrangeevent npcfightevent npcrangedlvl getnpcstats strpotnpc combatstylenpc npcrangeevent2',
    'admin',
    "OpenRSC's bespoke NPC-vs-player event/combat-testing minigame (Admins.java's *NpcEvent family) -- narrow developer tooling not ported"
);
reg('combatstyle', 'admin', (p) => playerQueryCombatStyle(p));
reg('setnpcstats', 'admin', blocked('per-stat NPC override storage (Npc has no settable stat block exposed to plugins in this port)'));
reg('skull unskull rskull', 'admin', (p, c, a) => playerSkull(p, c, a));
reg('ip', 'admin', (p, c, a) => playerQueryIP(p, a));
regBlocked('yoptin', 'admin', 'a legacy mudclient 61-75-only signup screen; not relevant to this client');
reg('spawnnpc', 'admin', (p, c, a) => spawnNpc(p, c, a));
reg(
    'winterholidayevent toggleholiday santaclausiscomingtotown cabbagehalloweendrop christmasiscancelled stopholidaydrop cancelholidaydrop holidaydrop',
    'admin',
    (p) => toggleHolidayDrop(p)
);
regBlocked('resetevent stopresetevent cancelresetevent', 'admin', "OpenRSC's bespoke \"reset event\" minigame -- narrow, not ported");
regBlocked('givemodtools givetools', 'admin', 'curated staff item-loadout lists (Java’s giveIfNotHave calls with specific ItemIds) not extracted for this report; ::item can spawn any specific item directly');
reg('lemons lemon', 'admin', (p, c, a) => giveLemons(p, a));
regBlocked(
    'setmaxplayersperip smppi setmaxconnectionsperip smcpi setmaxconnectionspersecond smcps setpidshuffleinterval setglobalcooldown setgloballevelreq setdowntimereportmillis sddrmdbr setmonitortimeoutmillis smtm setmonitorip mip smip monitorip setmonitorautomaticshutdown mas smas monitorautomaticshutdown sqlerrorreportingtest',
    'admin',
    'public-server abuse-mitigation and Discord-downtime-monitoring config knobs -- not applicable to a single-host LAN/SP server'
);
regBlocked('unhash hash', 'admin', "OpenRSC's username<->hash namespace; this port looks players up by plain username string (world.getPlayerByUsername), so there is no hash to convert");
reg('xpstat xpstats setxpstat setxpstats setxp', 'admin', (p, c, a) => changeStatXP(p, c, a));
reg('stat stats setstat setstats', 'admin', (p, c, a) => changeMaxStat(p, c, a));
reg('reloadworld reloadland', 'admin', (p) => {
    p.world.loadLandscape();
    p.message(MESSAGE_PREFIX + 'World Reloaded');
});
regBlocked('copypassword copypass copypw', 'admin', 'never exposed -- reading back password data via a chat command is refused regardless of what this port stores (see the credential-handling rule)');
regBlocked('restart shutdown update', 'admin', 'process lifecycle control -- the host already controls the process directly (this is an embedded/LAN server, not a always-on public deployment with a remote restart need)');

// Development.java
reg('serverstats', 'dev', (p) => serverStats(p));
reg('setcombatstyle', 'dev', (p, c, a) => setCombatStyleCommand(p, a));
reg('radiusnpc createnpc cnpc cpc', 'dev', (p, c, a) => createNpc(p, c, a));
reg('rpc rnpc removenpc', 'dev', (p, c, a) => removeNpc(p, c, a));
reg('createobject cobject addobject aobject createscenery cscenery addscenery ascenery', 'dev', (p, c, a) => createObject(p, c, a));
reg('createwallobject cwallobject addwallobject awallobject createboundary cboundary addboundary aboundary', 'dev', (p, c, a) => createWallObject(p, c, a));
reg('removeobject robject removescenery rscenery', 'dev', (p, c, a) => removeObject(p, c, a));
reg('rotateobject rotatescenery', 'dev', (p, c, a) => rotateObject(p, c, a));
regBlocked('points', 'dev', 'OpenPK points -- explicitly out of scope for this report');
regBlocked(
    'tile debugregion getappearance droptest fishingrate lograte protodarts filtertest cyclescenery cycleclothing boundarydemo scenerydemo abort error',
    'dev',
    "internal engine-debug tooling that reads Java-only structures (TileValue collision dumps, ObjectWoodcuttingDef drop-rate tables, region/appearance snapshots) this port doesn't expose the same way"
);

// Event.java
reg('eventchest', 'event', (p, c, a) => toggleEventChest(p, c, a));
reg('seers toggleseers partyhall togglepartyhall', 'event', (p, c, a) => toggleSeersParty(p, c, a));
reg(
    'teleport tp tele town goto tpto teleportto tpat rftele rtele ftele',
    'event',
    blocked('a full town/coordinate teleport parser was not ported in this report; use packet-handlers/command.js’s existing ::teleport dev command (host-only) in the meantime')
);
reg('return', 'event', (p, c, a) => returnPlayerCommand(p, c, a));
regBlocked('blink', 'event', "a client-side click-interpretation mode; this port's client has no left-click-teleport mode to toggle");
reg('invisible invis', 'event', (p, c, a) => enableInvisibleOther(p, c, a));
regBlocked('norender renderself', 'event', 'per-slot cosmetic sprite overrides -- same gap as the PlayerModerator cosmetic cluster above');
reg('invulnerable invul', 'event', (p, c, a) => enableInvulnerableOther(p, c, a));
reg('currentstat currentstats setcurrentstat setcurrentstats curstat curstats setcurstat setcurstats', 'event', (p, c, a) => changeCurrentStat(p, c, a));
regBlocked(
    'possess pos possessnpc pnpc posnpc pr possessrandom possessnext pn lain leapaboutinstantnavigator hellonavi becomelain navi reset weird weirdplayer stay',
    'event',
    "OpenRSC's player/NPC possession + LAIN spectator system (Player.setPossessing/becomeLain/isLain) -- no camera-follow-another-entity mechanic exists client-side in this port. (::reset's non-LAIN branch hands out ItemId.RESETCRYSTAL, a custom OpenRSC item id not present in this port's item table.)"
);
reg('npctalk npcsay', 'event', (p, c, a) => npcTalk(p, c, a));
regBlocked('setpidless setpidlesscatching', 'event', 'a PIDLESS_CATCHING fishing/anti-multi-account mechanic not modeled in this port’s fishing skill');
reg('groupteleport grouptele grouptp groupteleportto grouptpto groupteleto returngroup', 'event', blocked('a full group-teleport parser was not ported in this report'));
reg('npckills', 'event', (p, c, a) => npcKills(p, a));
reg('stoppvpevent', 'event', (p) => disablePvpEvent(p));
reg('setpvpevent startpvpevent', 'event', (p, c, a) => enablePvpEvent(p, c, a));

// ---- dispatch ----

function dispatchStaffCommand(player, command, args) {
    const entry = TABLE[String(command || '').toLowerCase()];

    if (!entry) {
        return false;
    }

    const gate = {
        mod: isMod,
        supermod: isSuperMod,
        admin: isAdmin,
        playermod: isPlayerMod,
        event: isEvent,
        dev: isDev
    }[entry.rank];

    if (!gate || !gate(player)) {
        return false;
    }

    try {
        entry.fn(player, command, args || []);
    } catch (e) {
        player.message(MESSAGE_PREFIX + 'Command error.');
    }

    return true;
}

module.exports = {
    dispatchStaffCommand,
    isHost,
    isHostSocket,
    staffGroup,
    isAdmin,
    isSuperMod,
    isMod,
    isPlayerMod,
    isDev,
    isEvent,
    isStaff,
    getStaffName,
    getStaffPrefix,
    getGroupMessageName,
    queryGroupIDs,
    STAFF_GROUPS
};
