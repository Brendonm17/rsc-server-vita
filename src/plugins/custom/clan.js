// clans: a named group with a leader, ranked members, clan chat, invites, and
// per-clan kick/invite/search-join settings. roster persists as one JSON blob
// under world state 'clans'; without a persisting dataClient it stays in-memory.
// wire opcode 112; client actions arrive over interfaceOptions (199, sub 11).

const MAX_CLAN_SIZE = 200;
const INVITE_TIMEOUT_MS = 60000;

// prefixes for the ::-command messages only; most messages below are left bare
const MESSAGE_PREFIX = '@gre@System message:@whi@ ';
const BAD_SYNTAX_PREFIX = MESSAGE_PREFIX + ' Invalid Syntax: ::';

// profanity gate for clan create, matched case-sensitively against name/tag
const BAD_WORDS = [
    'fuck', 'ass', 'bitch', 'admin', 'mod', 'dev', 'developer', 'nigger', 'niger',
    'whore', 'pussy', 'porn', 'penis', 'chink', 'faggot', 'cunt', 'clit', 'cock'
];

// allowed clan name/tag characters: ascii letters, digits, whitespace
const NAME_TAG_PATTERN = /^[A-Za-z0-9\s]+$/;

const ClanRank = { NORMAL: 0, LEADER: 1, GENERAL: 2 };
const RANK_NAMES = ['normal', 'leader', 'general'];

function rankName(rank) {
    return RANK_NAMES[rank] || 'normal';
}

class ClanPlayer {
    constructor(username) {
        this.username = username;
        this.playerRef = null;
        this.rank = ClanRank.NORMAL;
        this.kills = 0;
        this.deaths = 0;
    }

    isOnline() {
        return !!(this.playerRef && this.playerRef.loggedIn);
    }
}

class Clan {
    constructor(world) {
        this.world = world;
        this.id = 0;
        this.name = '';
        this.tag = '';
        this.leader = null;
        this.players = [];
        this.clanSetting = [0, 0, 0]; // kick, invite, allowSearchJoin
        this.clanPoints = 0;
    }

    get kickSetting() {
        return this.clanSetting[0];
    }

    get inviteSetting() {
        return this.clanSetting[1];
    }

    get allowSearchJoin() {
        return this.clanSetting[2];
    }

    getPlayer(username) {
        const target = String(username || '').toLowerCase();
        return (
            this.players.find((p) => p.username.toLowerCase() === target) ||
            null
        );
    }

    // add a player; the first member becomes leader
    addPlayer(player) {
        if (this.players.length >= MAX_CLAN_SIZE) {
            return null;
        }

        player.clan = this;

        const member = new ClanPlayer(player.username);
        member.rank = ClanRank.NORMAL;
        member.playerRef = player;

        if (!this.leader) {
            member.rank = ClanRank.LEADER;
            this.leader = member;
            this.clanSetting = [1, 1, 1];
        }

        this.players.push(member);

        this.messageChat(player, `${player.username} has joined the clan!`);
        this.updateClanGUI();
        sendClanSetting(member.playerRef);

        if (this.players.length > 1) {
            persistClans(this.world);
        }

        return member;
    }

    // remove a player, hand over leadership, and delete the clan if now empty
    removePlayer(username) {
        const member = this.getPlayer(username);

        if (!member) {
            return;
        }

        if (member.isOnline()) {
            member.playerRef.send({ type: 'clan', action: 1 });
            member.playerRef.clan = null;
            member.playerRef.message(`You have left clan: ${this.name}`);
        }

        this.players.splice(this.players.indexOf(member), 1);
        this.messageClanInfo(`${username} left ${this.name}`);

        if (this.players.length >= 1) {
            if (this.leader && this.leader.username.toLowerCase() === username.toLowerCase()) {
                this.leader = this.players[0];
                this.leader.rank = ClanRank.LEADER;
                this.messageClanInfo('@red@Your clan leader has left the clan!');
                this.messageClanInfo(`@yel@${this.leader.username} is the new clan leader!`);
            }

            persistClans(this.world);
        } else {
            deleteClan(this.world, this);
        }

        this.updateClanGUI();
    }

    // actingPlayer must be the leader; newRank 1 transfers leadership, else
    // promote/demote
    updateRankPlayer(actingPlayer, username, newRank) {
        const member = this.getPlayer(username);

        if (!member) {
            return;
        }

        if (member.rank === newRank) {
            return;
        }

        if (
            !this.leader ||
            this.leader.username.toLowerCase() !== actingPlayer.username.toLowerCase()
        ) {
            return;
        }

        if (newRank === ClanRank.LEADER) {
            const actingMember = this.getPlayer(actingPlayer.username);

            if (actingMember) {
                actingMember.rank = ClanRank.NORMAL;
            }

            this.leader = member;
            this.leader.rank = ClanRank.LEADER;
            this.messageClanInfo('@red@Your clan leader has passed the leadership!');
            this.messageClanInfo(`@yel@${this.leader.username} is the new clan leader!`);
            persistClans(this.world);
            sendClanSetting(actingPlayer);
        } else {
            if (newRank === ClanRank.GENERAL) {
                this.messageClanInfo(
                    `Congratulations! ${member.username} has been promoted to ${rankName(newRank)} rank.`
                );
            } else {
                this.messageClanInfo(
                    `${member.username} has been put back to ${rankName(newRank)} rank.`
                );
            }

            member.rank = newRank;
            persistClans(this.world);
        }

        this.updateClanGUI();

        if (member.isOnline()) {
            sendClanSetting(member.playerRef);
        }
    }

    // resend the roster panel to every online member
    updateClanGUI() {
        for (const member of this.players) {
            if (member.isOnline()) {
                sendClanRoster(member.playerRef, this);
            }
        }
    }

    // resend clan settings to every online member
    updateClanSettings() {
        for (const member of this.players) {
            if (member.isOnline()) {
                sendClanSetting(member.playerRef);
            }
        }
    }

    // a clan-chat line, prefixed with the clan name
    messageChat(fromPlayer, text) {
        for (const member of this.players) {
            if (member.playerRef) {
                member.playerRef.message(`@whi@[@cla@${this.name}@whi@] ${text}`);
            }
        }
    }

    // a system-origin clan line (join/leave/rank notices)
    messageClanInfo(text) {
        for (const member of this.players) {
            if (member.playerRef) {
                member.playerRef.message(`@whi@[@cla@${this.name}@whi@] ${text}`);
            }
        }
    }

    // permission check; an out-of-range settingIndex reads undefined and returns false
    isAllowed(settingIndex, player) {
        if (!player.clan) {
            return false;
        }

        const state = this.clanSetting[settingIndex];
        const own = player.clan.getPlayer(player.username);

        if (state === 0) {
            return true;
        } else if (state === 1 && own && own.rank === ClanRank.LEADER) {
            return true;
        }

        return (
            (state === 2 || state === 3) &&
            !!own &&
            (own.rank === ClanRank.LEADER || own.rank === ClanRank.GENERAL)
        );
    }
}

// per-world roster state

const worldStates = new WeakMap();

function getState(world) {
    let state = worldStates.get(world);

    if (!state) {
        state = { clans: [], loaded: false, loading: null };
        worldStates.set(world, state);
    }

    return state;
}

function nextClanID(clans) {
    let max = 0;

    for (const c of clans) {
        if (c.id > max) {
            max = c.id;
        }
    }

    return max + 1;
}

function serializeClan(c) {
    return {
        id: c.id,
        name: c.name,
        tag: c.tag,
        clanPoints: c.clanPoints,
        clanSetting: c.clanSetting.slice(),
        leaderUsername: c.leader ? c.leader.username : null,
        players: c.players.map((p) => ({
            username: p.username,
            rank: p.rank,
            kills: p.kills,
            deaths: p.deaths
        }))
    };
}

function deserializeClan(world, row) {
    const c = new Clan(world);
    c.id = row.id;
    c.name = row.name;
    c.tag = row.tag;
    c.clanPoints = row.clanPoints || 0;
    c.clanSetting = Array.isArray(row.clanSetting) ? row.clanSetting.slice() : [0, 0, 0];

    for (const row2 of row.players || []) {
        const member = new ClanPlayer(row2.username);
        member.rank = row2.rank || ClanRank.NORMAL;
        member.kills = row2.kills || 0;
        member.deaths = row2.deaths || 0;
        c.players.push(member);

        if (row.leaderUsername && member.username.toLowerCase() === String(row.leaderUsername).toLowerCase()) {
            c.leader = member;
        }
    }

    return c;
}

// lazily load the roster on first use; never throws, falls back to in-memory
async function ensureLoaded(world) {
    const state = getState(world);

    if (state.loaded) {
        return;
    }

    if (!state.loading) {
        state.loading = (async () => {
            try {
                const dataClient = world.server && world.server.dataClient;

                if (dataClient && typeof dataClient.getWorldState === 'function') {
                    const rows = await dataClient.getWorldState('clans');

                    if (Array.isArray(rows)) {
                        state.clans = rows.map((row) => deserializeClan(world, row));
                    }
                }
            } catch (e) {
                // no persistence available this run, session stays in-memory
            }

            state.loaded = true;
        })();
    }

    await state.loading;
}

async function persistClans(world) {
    try {
        const dataClient = world.server && world.server.dataClient;

        if (!dataClient || typeof dataClient.setWorldState !== 'function') {
            return;
        }

        const state = getState(world);
        await dataClient.setWorldState('clans', state.clans.map(serializeClan));
    } catch (e) {
        // best-effort, an absent store must never break gameplay
    }
}

function createClanRecord(world, clan) {
    const state = getState(world);
    clan.id = nextClanID(state.clans);
    state.clans.push(clan);
    persistClans(world);
}

function deleteClan(world, clan) {
    const state = getState(world);
    const i = state.clans.indexOf(clan);

    if (i !== -1) {
        state.clans.splice(i, 1);
    }

    persistClans(world);
}

// case-insensitive match on name or tag
function findClanRecord(world, nameOrTag) {
    const target = String(nameOrTag || '').toLowerCase();
    const state = getState(world);

    return (
        state.clans.find(
            (c) => c.name.toLowerCase() === target || c.tag.toLowerCase() === target
        ) || null
    );
}

// attach a returning player to their persisted clan; no-op if already attached
function attachToClan(world, player) {
    if (player.clan) {
        return player.clan;
    }

    const state = getState(world);

    for (const c of state.clans) {
        const member = c.getPlayer(player.username);

        if (member) {
            member.playerRef = player;
            player.clan = c;
            c.updateClanGUI();
            c.updateClanSettings();
            return c;
        }
    }

    return null;
}

// wire sends (opcode 112)

function sendClanRoster(player, c) {
    player.send({
        type: 'clan',
        action: 0,
        clanName: c.name,
        clanTag: c.tag,
        leaderName: c.leader ? c.leader.username : '',
        isLeader: !!(c.leader && c.leader.username.toLowerCase() === player.username.toLowerCase()),
        members: c.players.map((m) => ({
            username: m.username,
            rank: m.rank,
            online: m.isOnline()
        }))
    });
}

function sendClanSetting(player) {
    if (!player.clan) {
        return;
    }

    const c = player.clan;

    player.send({
        type: 'clanSettings',
        kickSetting: c.kickSetting,
        inviteSetting: c.inviteSetting,
        allowSearchJoin: c.allowSearchJoin,
        allowSetting0: c.isAllowed(0, player) ? 1 : 0,
        allowSetting1: c.isAllowed(1, player) ? 1 : 0
    });
}

function sendClanInvitationGUI(invited, clanName, inviterUsername) {
    invited.send({ type: 'clan', action: 2, inviter: inviterUsername, clanName });
}

// the browse list, sorted by clan points desc then name asc
async function sendClanList(player) {
    const { world } = player;
    await ensureLoaded(world);

    const state = getState(world);
    const sorted = state.clans.slice().sort((a, b) => {
        if (a.clanPoints === b.clanPoints) {
            return a.name.localeCompare(b.name);
        }

        return b.clanPoints - a.clanPoints;
    });

    player.send({
        type: 'clanList',
        // every clan is listed, no display filter
        clans: sorted.map((c) => ({
            id: c.id,
            name: c.name,
            tag: c.tag,
            size: c.players.length,
            allowSearchJoin: c.allowSearchJoin,
            points: c.clanPoints
        }))
    });
}

// invites, stored on the player; timeout is a wall-clock timer

// whether a player blocks clan invites (p_block_invites cache flag)
function invitesBlocked(invited) {
    const cache = invited.cache || {};

    if (Object.prototype.hasOwnProperty.call(cache, 'p_block_invites')) {
        return !!cache.p_block_invites;
    }

    // default: blocked until a player has toggled the setting at least once
    return true;
}

// send a clan invite to another player
function createClanInvite(player, invited) {
    if (!player.clan) {
        return;
    }

    if (invited.activeClanInvite) {
        player.message(
            `${invited.username} has already and active clan invitation, please try again later.`
        );
        return;
    }

    if (invited.clan) {
        player.message(`${invited.username} is already in a clan`);
        return;
    }

    if (invitesBlocked(invited)) {
        const cache = invited.cache || {};

        if (Object.prototype.hasOwnProperty.call(cache, 'p_block_invites')) {
            player.message('This player has clan invitations blocked');
            invited.message(
                `${player.username} tried to send you an invite, you have clans invite setting blocked`
            );
        } else {
            // ActionSender.sendBox big-box popup has no wire analogue here;
            // collapsed to a plain message (inviter only, matching Java).
            player.message(`Clan: ${invited.username} has clan invitations blocked`);
        }

        return;
    }

    if (player.clan.players.length >= MAX_CLAN_SIZE) {
        player.message('Your clan has reached the maximum clan members limit');
        return;
    }

    if (invited === player) {
        player.message("You can't send an invite to yourself..");
        return;
    }

    const invite = { inviter: player, invited, timeout: null };

    invite.timeout = setTimeout(() => {
        if (invited.activeClanInvite !== invite) {
            return;
        }

        player.message(`${invited.username} did not respond to your invitation`);
        invited.activeClanInvite = null;
        invited.message('You did not respond to your Clan invite in time');
        player.message(`${invited.username}'s Clan invitation is no longer active`);
    }, INVITE_TIMEOUT_MS);

    player.message(`You have invited ${invited.username} to your clan`);

    invited.activeClanInvite = invite;
    invited.message(
        `${player.username} has invited you to join clan: [@cla@${player.clan.name}@whi@]`
    );

    if (typeof invited.withinRegion === 'function' && invited.withinRegion('wilderness')) {
        invited.message('Type ::clanaccept to accept your invitation');
    } else {
        sendClanInvitationGUI(invited, player.clan.name, player.username);
    }
}

// immediate join, no invite round trip, when the clan allows search-join
function createClanJoinRequest(c, requestor) {
    if (requestor.clan) {
        return;
    }

    if (c.players.length >= MAX_CLAN_SIZE) {
        requestor.message('This clan has reached the maximum clan members limit');
        return;
    }

    requestor.message(`You have joined ${c.name}`);
    c.addPlayer(requestor);
}

function acceptInvite(player) {
    const invite = player.activeClanInvite;

    if (!invite) {
        return;
    }

    if (invite.inviter.clan && !invite.invited.clan) {
        invite.inviter.clan.addPlayer(invite.invited);
    }

    invite.invited.activeClanInvite = null;
    clearTimeout(invite.timeout);
}

function declineInvite(player) {
    const invite = player.activeClanInvite;

    if (!invite) {
        return;
    }

    if (invite.inviter) {
        invite.inviter.message(`${invite.invited.username} has declined your invitation`);
    }

    invite.invited.activeClanInvite = null;
    clearTimeout(invite.timeout);
}

// public API; every entry point loads the roster first

function getClan(player) {
    if (!player) {
        return null;
    }

    if (player.clan) {
        return player.clan;
    }

    return player.world ? attachToClan(player.world, player) : null;
}

// create a clan: length limits, character class, profanity, name/tag collision
async function createClan(player, name, tag) {
    const { world } = player;
    await ensureLoaded(world);

    name = String(name == null ? '' : name);
    tag = String(tag == null ? '' : tag);

    if (name.length < 2) {
        player.message('Clan name must be at least 2 characters in length');
        return;
    } else if (name.length > 16) {
        player.message('Clan name length cannot exceed 16 characters in length');
        return;
    } else if (tag.length < 2) {
        player.message('Clan tag need to be minimum 2 characters');
        return;
    } else if (tag.length > 5) {
        player.message('Clan tag maximum length is 5 characters');
        return;
    } else if (!NAME_TAG_PATTERN.test(name) || !NAME_TAG_PATTERN.test(tag)) {
        player.message('Clan name and Clan tag can only contain regular letters and numbers');
        return;
    }

    for (const word of BAD_WORDS) {
        if (name.includes(word) || tag.includes(word)) {
            player.message('Bad clan name or clan tag, try with something else');
            return;
        }
    }

    if (player.clan) {
        player.message('You are already in a clan');
        return;
    }

    if (findClanRecord(world, name) || findClanRecord(world, tag)) {
        player.message('There is already a clan with this Clan Name or Clan Tag');
        return;
    }

    const c = new Clan(world);
    c.name = name;
    c.tag = tag;

    const member = c.addPlayer(player);
    member.rank = ClanRank.LEADER;
    c.leader = member;

    createClanRecord(world, c);
    player.message(`You have created clan: ${name}`);
}

// leave the clan (interface, or ::clanleave)
async function leave(player) {
    await ensureLoaded(player.world);

    const c = getClan(player);

    if (c) {
        c.removePlayer(player.username);
    }
}

// invite a player from the interface tab, no permission gate
async function invitePlayer(player, targetUsername) {
    await ensureLoaded(player.world);

    const target = player.world.getPlayerByUsername(targetUsername);

    if (target) {
        createClanInvite(player, target);
    } else {
        player.message('Player is not online or could not be found!');
    }
}

// ::claninvite <name>: invite, gated on the invite permission
async function invite(player, username) {
    await ensureLoaded(player.world);

    if (!username) {
        player.message(`${BAD_SYNTAX_PREFIX}CLANINVITE [name]`);
        return;
    }

    const c = getClan(player);
    const target = player.world.getPlayerByUsername(username);

    if (!c || !c.isAllowed(1, player)) {
        player.message(
            `${MESSAGE_PREFIX}You are not allowed to invite into clan ${c ? c.name : ''}`
        );
        return;
    }

    if (!target) {
        player.message(`${MESSAGE_PREFIX}Invalid name or player is not online`);
        return;
    }

    createClanInvite(player, target);
    player.message(`${MESSAGE_PREFIX}${target.username} has been invited into clan ${c.name}`);
}

// accept a pending invite (::clanaccept, or the interface)
async function accept(player) {
    await ensureLoaded(player.world);

    if (!player.activeClanInvite) {
        player.message(`${MESSAGE_PREFIX}You have not been invited to a clan.`);
        return;
    }

    acceptInvite(player);

    if (player.clan) {
        player.message(`${MESSAGE_PREFIX}You have joined clan ${player.clan.name}`);
    }
}

// decline a pending invite
async function declineClanInvite(player) {
    await ensureLoaded(player.world);
    declineInvite(player);
}

// kick a player from the interface: needs the kick permission, leader immune
async function kickPlayer(player, targetUsername) {
    await ensureLoaded(player.world);

    const c = getClan(player);

    if (!c) {
        return;
    }

    if (!c.isAllowed(0, player)) {
        player.message('You are not allowed to kick.');
        return;
    }

    if (c.leader && c.leader.username === targetUsername) {
        player.message("You can't kick the leader.");
        return;
    }

    c.removePlayer(targetUsername);
}

// ::clankick <name>: its isAllowed(3) call reads undefined, so it always refuses
async function removePlayerFromClan(player, targetUsername) {
    await ensureLoaded(player.world);

    if (!targetUsername) {
        player.message(`${BAD_SYNTAX_PREFIX}CLANKICK [name]`);
        return;
    }

    const c = getClan(player);

    if (!c) {
        player.message(`${MESSAGE_PREFIX}You are not in a clan.`);
        return;
    }

    const playerToKick = targetUsername.replace(/_/g, ' ');
    const target = player.world.getPlayerByUsername(targetUsername);

    if (!c.isAllowed(3, player)) {
        player.message(`${MESSAGE_PREFIX}You are not allowed to kick that player.`);
        return;
    }

    if (c.leader && c.leader.username === playerToKick) {
        player.message(`${MESSAGE_PREFIX}You can't kick the leader.`);
        return;
    }

    c.removePlayer(playerToKick);
    player.message(`${MESSAGE_PREFIX}${playerToKick} has been kicked from clan ${c.name}`);

    if (target) {
        target.message(`${MESSAGE_PREFIX}You have been kicked from clan ${c.name}`);
    }
}

// set a member's rank; leader-only, rank >= 3 clamps to normal
async function rankPlayer(player, targetUsername, newRank) {
    await ensureLoaded(player.world);

    const c = getClan(player);

    if (!c) {
        return;
    }

    let rank = newRank;

    if (rank >= 3) {
        rank = ClanRank.NORMAL;
    }

    if (!c.leader || c.leader.username !== player.username.replace(/_/g, ' ')) {
        player.message('You are not the leader of this clan');
        return;
    }

    if (c.leader.username === targetUsername) {
        player.message('You are already the leader of the clan');
        return;
    }

    c.updateRankPlayer(player, targetUsername, rank);
}

// change a clan setting; leader-only, state >= 3 clamps to 0, then persist
async function updateSettings(player, settingIndex, newState) {
    await ensureLoaded(player.world);

    const c = getClan(player);

    if (!c) {
        return;
    }

    if (settingIndex > 3) {
        return;
    }

    let state = newState;

    if (state >= 3) {
        state = 0;
    }

    if (!c.leader || c.leader.username !== player.username) {
        player.message('You are not the leader of this clan');
        return;
    }

    if (settingIndex === 0) {
        if (c.kickSetting === state) {
            return;
        }

        c.clanSetting[0] = state;
    } else if (settingIndex === 1) {
        if (c.inviteSetting === state) {
            return;
        }

        c.clanSetting[1] = state;
    } else if (settingIndex === 2) {
        if (c.allowSearchJoin === state) {
            return;
        }

        c.clanSetting[2] = state;
    }

    player.message('[CLAN]: You have updated clan settings');
    c.updateClanSettings();
    persistClans(player.world);
}

// ::joinclan <name>: immediate join when the clan allows search-join
async function joinRequest(player, clanNameArg) {
    await ensureLoaded(player.world);

    const clanToJoin = String(clanNameArg || '').replace(/_/g, ' ');
    const c = findClanRecord(player.world, clanToJoin);

    if (c) {
        if (c.allowSearchJoin === 0) {
            createClanJoinRequest(c, player);
        } else {
            player.message(`${MESSAGE_PREFIX}This clan is not accepting join requests`);
        }
    }
}

// ::c <msg>: clan chat; text arrives space-joined with a single trailing space
async function chat(player, text) {
    await ensureLoaded(player.world);

    const c = getClan(player);

    if (!c) {
        player.message(`${MESSAGE_PREFIX}You are not in a clan.`);
        return;
    }

    const message = text ? `${text} ` : '';
    c.messageChat(player, `@cya@${displayName(player)}:@whi@ ${message}`);
}

function displayName(player) {
    return player.getFormattedUsername ? player.getFormattedUsername() : player.username;
}

// a ready-to-splice "<tag> " chat prefix
function clanTagPrefix(player) {
    const c = getClan(player);
    return c ? `@cla@<${c.tag}> @whi@` : '';
}

// ::clan [create <name> <tag>] text command
async function command(player, args) {
    await ensureLoaded(player.world);

    if (args[0] && args[0].toLowerCase() === 'create') {
        const name = args[1] ? args[1].replace(/_/g, ' ') : '';
        const tag = args[2];

        if (!name || !tag) {
            player.message('@cya@Usage: @whi@::clan create <name> <tag>');
            return;
        }

        await createClan(player, name, tag);
        return;
    }

    const c = getClan(player);

    if (!c) {
        player.message('@cya@You are not in a clan. @whi@::clan create <name> <tag>');
        return;
    }

    const names = c.players.map((m) => m.username).join(', ');
    player.message(
        `@cya@${c.name} (@whi@${c.players.length}@cya@, leader @whi@` +
            `${c.leader ? c.leader.username : '-'}@cya@): @whi@${names}`
    );
}

// login hook: re-attach a returning member to their clan and resend the panel
async function onLogin(player) {
    await ensureLoaded(player.world);
    attachToClan(player.world, player);

    // a fresh character starts with invites allowed
    if (player.cache && player.cache.p_block_invites === undefined) {
        player.cache.p_block_invites = false;
    }
}

// logout hook: clear the live player reference, leave the roster entry alone
function onLogout(player) {
    const state = worldStates.get(player.world);

    if (!state) {
        return;
    }

    for (const c of state.clans) {
        const member = c.getPlayer(player.username);

        if (member) {
            member.playerRef = null;
            c.updateClanGUI();
            break;
        }
    }
}

module.exports = {
    // names used by model/player.js and plugins/custom/player-commands.js
    command,
    invite,
    accept,
    leave,
    chat,
    onLogout,

    onLogin,

    // interface (sub 11) primitives, used by packet-handlers/interface/clan.js
    createClan,
    invitePlayer,
    acceptInvite: accept,
    declineInvite: declineClanInvite,
    kickPlayer,
    rankPlayer,
    updateSettings,
    sendClanList,
    getState, // read the world's clan roster

    // command primitives used by plugins/custom/clan-commands.js
    removePlayerFromClan,
    joinRequest,

    // general helpers
    getClan,
    clanTagPrefix,

    // classes exposed for bot use
    Clan,
    ClanPlayer,
    ClanRank
};
