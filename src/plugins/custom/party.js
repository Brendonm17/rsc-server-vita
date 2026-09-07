// parties: session-based group with shared party-chat, ranks, settings and
// shared combat kill-XP. runtime-only (dissolves at 0 members). invites are a
// pending username on the invitee with a 60s timeout. members get the party
// packet (116): roster (0), clear (1), invite popup (2), settings (3), list (4);
// the client answers over interfaceOptions (199, party sub 12).

const { IronmanMode } = require('../../model/game-modes');
const { wildernessLevel } = require('../skills/magic');

const MAX_PARTY = 5; // Constants.MAX_PARTY_SIZE

function isAnyIronman(player) {
    return (
        player.isIronMan(IronmanMode.Ironman) ||
        player.isIronMan(IronmanMode.Ultimate) ||
        player.isIronMan(IronmanMode.Hardcore) ||
        player.isIronMan(IronmanMode.Transfer)
    );
}

function inWilderness(player) {
    return wildernessLevel(player.x, player.y, player.world.planeElevation) > 0;
}

// with the leader's loot share on, any party member (2+) may take any owned drop
function lootShared(player) {
    const party = player.party;

    if (!party || !party.members || party.members.length < 2) {
        return false;
    }

    const leader = party.members.find((m) => m.username === party.leader);

    return !!(leader && leader._partyShareLoot);
}
const INVITE_TIMEOUT_MS = 60000; // invite timeout
const SHARE_RADIUS = 4; // tiles; only nearby party members share kill-XP
const SHARE_FRACTION = 0.5; // bonus XP per nearby member = 50% of the kill XP

// party ranks
const RANK_NORMAL = 0;
const RANK_LEADER = 1;
const RANK_GENERAL = 2;

// wire snapshot shows formatted names; identity stays on raw usernames
function displayName(player) {
    return player.getFormattedUsername
        ? player.getFormattedUsername()
        : player.username;
}

// a member can log out between ticks; a dead socket must not break the party
function trySend(player, message) {
    try {
        player.send(message);
    } catch (e) {
        // ignored: the disconnecting member no longer needs wire state
    }
}

// same guard for a plain chat line (player.message() also hits the socket)
function tryMessage(player, text) {
    try {
        player.message(text);
    } catch (e) {
        // ignored
    }
}

// resolved lazily and cached (hearing.js requires this module)
let _botHearing;
function botHearing() {
    if (_botHearing === undefined) {
        try {
            _botHearing = require('./bots/hearing');
        } catch (e) {
            _botHearing = null;
        }
    }
    return _botHearing;
}

// lazy seam for the bot party brain (reacts to a human joining/leaving)
let _botPartyCoord;
function botPartyCoord() {
    if (_botPartyCoord === undefined) {
        try {
            _botPartyCoord = require('./bots/party-coord');
        } catch (e) {
            _botPartyCoord = null;
        }
    }
    return _botPartyCoord;
}

// a real player in this party (username, not a bot), or null
function humanIn(party) {
    if (!party || !party.members) {
        return null;
    }
    return party.members.find((m) => m && m.username && !m.isBot) || null;
}

// party id: a running number
let nextPartyID = 0;

class Party {
    constructor(leader) {
        this.leader = null;
        this.members = [];
        this.partyID = ++nextPartyID;
        // party points (unused here)
        this.partyPoints = 0;
        // kick / invite / allowSearchJoin settings; default to 1 for the founder in add()
        this.kickSetting = 0;
        this.inviteSetting = 0;
        this.allowSearchJoin = 0;
        this.add(leader);
    }

    has(player) {
        return this.members.indexOf(player) !== -1;
    }

    // add a member; the first one becomes leader and seeds the settings
    add(player) {
        if (this.members.length >= MAX_PARTY || this.has(player)) {
            return false;
        }
        player.party = this;
        player._partyRank = RANK_NORMAL;
        player._partyShareLoot = 0;
        player._partyShareExp = 0;
        if (this.leader === null) {
            player._partyRank = RANK_LEADER;
            this.leader = player.username;
            this.kickSetting = 1;
            this.inviteSetting = 1;
            this.allowSearchJoin = 1;
        }
        this.members.push(player);
        this.lastSignature = null;
        this.sendState();
        this.sendSettingsTo(player);
        return true;
    }

    // the human in this party, or null
    humanMember() {
        return humanIn(this);
    }

    leaderMember() {
        return this.members.find((m) => m.username === this.leader) || null;
    }

    // a member's rank, defaulting to NORMAL
    rankOf(player) {
        return (player && player._partyRank) || RANK_NORMAL;
    }

    // resolve a clicked roster row by username or display name
    findMember(nameOrDisplay) {
        const target = String(nameOrDisplay || '').toLowerCase();
        return (
            this.members.find(
                (m) =>
                    m.username.toLowerCase() === target ||
                    displayName(m).toLowerCase() === target
            ) || null
        );
    }

    // permission check. setting: 0=kick, 1=invite, 2=allowSearchJoin
    // value: 0=open, 1=leader-only, 2/3=leader-or-general
    isAllowed(setting, player) {
        if (!player || player.party !== this) {
            return false;
        }
        const value =
            setting === 0
                ? this.kickSetting
                : setting === 1
                  ? this.inviteSetting
                  : this.allowSearchJoin;
        if (value === 0) {
            return true;
        }
        const rank = this.rankOf(player);
        if (value === 1) {
            return rank === RANK_LEADER;
        }
        return value === 2 || value === 3
            ? rank === RANK_LEADER || rank === RANK_GENERAL
            : false;
    }

    // apply one setting (0=kick, 1=invite, 2=allowSearchJoin); returns false if unchanged
    applySetting(pref, state) {
        if (pref === 0) {
            if (this.kickSetting === state) {
                return false;
            }
            this.kickSetting = state;
        } else if (pref === 1) {
            if (this.inviteSetting === state) {
                return false;
            }
            this.inviteSetting = state;
        } else if (pref === 2) {
            if (this.allowSearchJoin === state) {
                return false;
            }
            this.allowSearchJoin = state;
        }
        this.lastSignature = null;
        return true;
    }

    // hand the party leadership to a specific member
    promote(player) {
        if (!player || !this.has(player) || this.leader === player.username) {
            return false;
        }
        const oldLeader = this.leaderMember();
        if (oldLeader) {
            oldLeader._partyRank = RANK_NORMAL;
        }
        this.leader = player.username;
        player._partyRank = RANK_LEADER;
        this.notify(`${displayName(player)} is now the party leader.`);
        this.lastSignature = null;
        return true;
    }

    // apply a rank change (leader-only; the messaged checks live in interface/party.js)
    applyRank(actingPlayer, member, newRank) {
        if (this.rankOf(member) === newRank) {
            return;
        }
        if (this.leader !== actingPlayer.username) {
            return;
        }
        if (newRank === RANK_LEADER) {
            actingPlayer._partyRank = RANK_NORMAL;
            this.leader = member.username;
            member._partyRank = RANK_LEADER;
            this.notify('@red@Your party leader has passed the leadership!');
            this.notify(`@yel@${displayName(member)} is the new party leader!`);
            this.sendSettingsTo(actingPlayer);
        } else if (newRank === RANK_GENERAL) {
            this.notify(
                `Congratulations! ${displayName(member)} has been promoted to general rank.`
            );
            member._partyRank = RANK_GENERAL;
        } else {
            this.notify(`${displayName(member)} has been put back to normal rank.`);
            member._partyRank = RANK_NORMAL;
        }
        this.lastSignature = null;
        this.sendState();
        this.sendSettingsTo(member);
    }

    // remove a member; hand off leadership if they held it, dissolve at 0
    remove(player) {
        const i = this.members.indexOf(player);
        if (i === -1) {
            return;
        }
        this.members.splice(i, 1);
        player.party = null;
        trySend(player, { type: 'party', action: 1 });
        tryMessage(player, '@cya@You are no longer in a party');
        this.notify(`${player.username} has left the party`);

        if (this.members.length > 0 && player.username === this.leader) {
            const newLeader = this.members[0];
            this.leader = newLeader.username;
            newLeader._partyRank = RANK_LEADER;
            this.notify('@red@Your party leader has left the party!');
            this.notify(`@yel@${displayName(newLeader)} is the new party leader!`);
            this.sendSettings();
        }
        // only fully dissolves at 0 members

        // a lone bot left disbands the party; a lone human keeps theirs
        if (this.members.length === 1 && this.members[0].isBot) {
            const last = this.members[0];
            this.members.length = 0;
            last.party = null;
            trySend(last, { type: 'party', action: 1 });
            this.lastSignature = null;
            return;
        }

        this.lastSignature = null;
        this.sendState();
    }

    broadcast(fromUsername, text) {
        for (const m of this.members) {
            m.message(`@cya@[party] @whi@${fromUsername}: ${text}`);
        }
        // bot members hear party chat and may react (best-effort)
        try {
            const hearing = botHearing();
            if (hearing) hearing.onPartyChat(this, fromUsername, text);
        } catch (e) {
            // bots plugin absent, ignore
        }
    }

    notify(text) {
        for (const m of this.members) {
            m.message(`@cya@[party] @whi@${text}`);
        }
        // bot members hear a system/leader notice as if from the leader
        try {
            const hearing = botHearing();
            if (hearing) hearing.onPartyChat(this, this.leader, text);
        } catch (e) {
            // ignore
        }
    }

    // per-member status fields (all 11 status bytes)
    statusOf(m) {
        return {
            username: displayName(m),
            rank: this.rankOf(m),
            online: 1, // always online (see onLogout)
            currentHealth: m.skills.hits.current,
            maxHealth: m.skills.hits.base,
            combatLevel: m.combatLevel,
            skulled: m.skulled > 0,
            dead: m.skills.hits.current < 1, // party member dead flag
            shareLoot: !!m._partyShareLoot,
            total: this.members.length, // party size
            inCombat: !!m.opponent,
            shareExp: !!m._partyShareExp,
            expShared2: 0 // always 0
        };
    }

    // one party packet per member, each seeing their own isLeader flag
    sendState() {
        const leaderMember = this.leaderMember();
        const leaderName = leaderMember ? displayName(leaderMember) : this.leader;
        const statuses = this.members.map((m) => this.statusOf(m));

        for (const m of this.members) {
            trySend(m, {
                type: 'party',
                action: 0,
                leader: leaderName,
                isLeader: m.username === this.leader,
                members: statuses
            });
        }
    }

    // send party settings to one viewer (allow flags depend on their rank)
    sendSettingsTo(player) {
        trySend(player, {
            type: 'party',
            action: 3,
            kickSetting: this.kickSetting,
            inviteSetting: this.inviteSetting,
            allowSearchJoin: this.allowSearchJoin,
            allowSetting0: this.isAllowed(0, player) ? 1 : 0,
            allowSetting1: this.isAllowed(1, player) ? 1 : 0
        });
    }

    // send party settings to every member
    sendSettings() {
        for (const m of this.members) {
            this.sendSettingsTo(m);
        }
    }

    // every field the client renders; a change means a fresh snapshot
    signature() {
        return (
            this.leader +
            '|' +
            this.kickSetting +
            ',' +
            this.inviteSetting +
            ',' +
            this.allowSearchJoin +
            '|' +
            this.members
                .map((m) =>
                    [
                        m.username,
                        m.skills.hits.current,
                        m.skills.hits.base,
                        m.combatLevel,
                        m.skulled > 0 ? 1 : 0,
                        m.opponent ? 1 : 0,
                        this.rankOf(m),
                        m._partyShareLoot ? 1 : 0,
                        m._partyShareExp ? 1 : 0
                    ].join(',')
                )
                .join('|')
        );
    }

    tickSync() {
        const sig = this.signature();
        if (sig !== this.lastSignature) {
            this.lastSignature = sig;
            this.sendState();
        }
    }
}

function getParty(player) {
    return player && player.party ? player.party : null;
}

// find another player in the same world by case-insensitive username
function findPlayer(player, username) {
    if (!player.world || !player.world.players || !player.world.players.getAll) {
        return null;
    }
    const target = String(username || '').toLowerCase();
    return (
        player.world.players
            .getAll()
            .find(
                (p) =>
                    p.username &&
                    (p.username.toLowerCase() === target ||
                        displayName(p).toLowerCase() === target)
            ) || null
    );
}

// create an empty party (no invite)
function init(player) {
    if (player.party) {
        player.message('@cya@Leave your current party before joining another');
        return;
    }
    new Party(player);
    player.message('@cya@You have created a party: ');
}

// ::pinvite <name>
function invite(player, username) {
    if (!username) {
        player.message('@cya@Usage: @whi@::pinvite <name>');
        return;
    }

    let party = getParty(player);

    // the invite-setting gate only applies once a party exists
    if (party && !party.isAllowed(1, player)) {
        player.message('@cya@Only the party owner can invite players to this party');
        return;
    }

    const target = findPlayer(player, username);

    if (!party) {
        if (!target) {
            player.message('@cya@This player is not online or does not exist');
            return;
        }
        if (target === player) {
            player.message('@cya@You cannot invite yourself');
            return;
        }
        if (target.party) {
            player.message(`@cya@${target.username} is already in a party`);
            target.message(
                `@cya@${player.username} tried to send you a party invite, but you are already in a party`
            );
            return;
        }
        party = new Party(player);
        player.message('@cya@You have created a party: ');
    } else if (!target) {
        player.message('@cya@This player is not online or does not exist');
        return;
    }

    // ironmen first
    if (isAnyIronman(target)) {
        player.message(
            `${target.username} is an Ironman. ${target.isMale() ? 'He' : 'She'} stands alone.`
        );
        return;
    }

    if (isAnyIronman(player)) {
        player.message('You are an Ironman. You stand alone.');
        return;
    }

    if (party.members.length >= MAX_PARTY) {
        player.message('@cya@Your party has reached the maximum party members limit');
        return;
    }
    if (player.ignores && player.ignores.indexOf(target.username.toLowerCase()) > -1) {
        player.message(
            `@cya@Remove ${target.username} from your ignore list and try again.`
        );
        return;
    }
    if (target.ignores && target.ignores.indexOf(player.username.toLowerCase()) > -1) {
        player.message(`@cya@${target.username} is not accepting party invitations right now.`);
        return;
    }
    if (target.pendingPartyInvite) {
        player.message(
            `@cya@${target.username} already has an active party invitation. Please wait 30 seconds and try again`
        );
        return;
    }
    if (target.party === party) {
        player.message(`@cya@${target.username} is already in your party`);
        return;
    } else if (target.party) {
        player.message(`@cya@${target.username} is already in a party`);
        target.message(
            `@cya@${player.username} tried to send you a party invite, but you are already in a party`
        );
        return;
    }

    player.message(`@cya@You have successfully invited ${target.username} to the Party`);

    const leader = party.leaderMember();
    target.message(
        `@whi@[@gre@Party@whi@]@yel@${party.members.length} @whi@members. (Loot Sharing) - ` +
            (leader && leader._partyShareLoot ? '@gre@YES' : '@red@NO')
    );
    target.message(
        `@whi@[@gre@Party@whi@]@yel@${party.members.length} @whi@members. (Exp Sharing) - ` +
            (leader && leader._partyShareExp ? '@gre@YES' : '@red@NO')
    );
    for (const m of party.members) {
        target.message(`@gre@[Party]@whi@${displayName(m)}`);
    }

    target.pendingPartyInvite = player.username;
    target._partyInviteTimer = setTimeout(() => {
        target._partyInviteTimer = null;
        if (target.pendingPartyInvite !== player.username) {
            return;
        }
        target.pendingPartyInvite = null;
        tryMessage(player, `${target.username} did not respond to your invitation`);
        tryMessage(target, 'You did not respond to your Party invite in time');
        tryMessage(player, `${target.username}'s Party invitation is no longer active`);
        // a BOT left alone in the party it just made (invite unanswered)
        // disbands it, so a world of AI leaders doesn't fill the party browse
        // list with dead one-bot parties. A human's solo party is their choice.
        if (player.isBot && player.party && player.party.members.length === 1) {
            player.party.remove(player);
        }
    }, INVITE_TIMEOUT_MS);

    if (target.opponent || inWilderness(target)) {
        // suppress the popup while the invitee is in combat or the wilderness
        target.message('Type ::partyaccept to accept your invitation');
    } else {
        trySend(target, {
            type: 'party',
            action: 2,
            from: displayName(player),
            partyName: `${displayName(player)}'s party`
        });
    }
}

// ::partyaccept
function accept(player) {
    const inviterName = player.pendingPartyInvite;
    player.pendingPartyInvite = null;
    if (player._partyInviteTimer) {
        clearTimeout(player._partyInviteTimer);
        player._partyInviteTimer = null;
    }
    if (!inviterName) {
        return;
    }
    const inviter = findPlayer(player, inviterName);
    if (!inviter || !inviter.party || player.party) {
        // silently no-op if the inviter has no party or the invitee already has one
        return;
    }
    if (inviter.party.add(player) && !player.isBot) {
        // a human accepting a bot's invite makes the bot leader react
        try {
            const pc = botPartyCoord();
            if (pc && pc.onHumanJoin) {
                pc.onHumanJoin(inviter.party, player);
            }
        } catch (e) {
            // bots plugin absent, the party still works
        }
    }
    // add() returns false if the party filled up in the interim; no feedback
}

// tell the bots a human left (members is the pre-removal roster)
function notifyBotsHumanLeft(party, members, name) {
    try {
        const pc = botPartyCoord();
        if (pc && pc.onHumanLeave) {
            pc.onHumanLeave(party, members, name);
        }
    } catch (e) {
        // bots plugin absent, ignore
    }
}

// ::leaveparty
function leave(player) {
    const party = getParty(player);
    if (!party) {
        player.message('@cya@You are not in a party.');
        return;
    }
    const name = player.username;
    const wasWith = party.members.slice();
    party.remove(player);
    if (!player.isBot) {
        notifyBotsHumanLeft(party, wasWith, name);
    }
}

// ::p <message>
function chat(player, text) {
    const party = getParty(player);
    if (!party) {
        player.message('@cya@You are not in a party.');
        return;
    }
    if (!text) {
        return;
    }
    party.broadcast(player.username, text);
}

// ::party  (list members)
function list(player) {
    const party = getParty(player);
    if (!party) {
        player.message('@cya@You are not in a party. @whi@::pinvite <name>');
        return;
    }
    const names = party.members.map((m) => m.username).join(', ');
    player.message(`@cya@Party (@whi@${party.members.length}@cya@): @whi@${names}`);
}

// ::shareloot (leader-only): flips each member's own loot-share flag
function toggleLootShare(player) {
    const party = getParty(player);
    if (!party || party.leader !== player.username) {
        return;
    }
    for (const m of party.members) {
        if (m._partyShareLoot) {
            m._partyShareLoot = 0;
            tryMessage(m, '@whi@[@blu@Party@whi@] - @whi@Loot Sharing has been @red@Disabled');
        } else {
            m._partyShareLoot = 1;
            tryMessage(m, '@whi@[@blu@Party@whi@] - @whi@Loot Sharing has been @gre@Enabled');
        }
    }
    party.lastSignature = null;
    party.sendState();
}

// ::shareexp (leader-only): flips each member's own exp-share flag (display only)
function toggleExperienceShare(player) {
    const party = getParty(player);
    if (!party || party.leader !== player.username) {
        return;
    }
    for (const m of party.members) {
        if (m._partyShareExp) {
            m._partyShareExp = 0;
            tryMessage(m, '@whi@[@blu@Party@whi@] - @whi@Exp Sharing has been @red@Disabled');
        } else {
            m._partyShareExp = 1;
            tryMessage(m, '@whi@[@blu@Party@whi@] - @whi@Exp Sharing has been @gre@Enabled');
        }
    }
    party.lastSignature = null;
    party.sendState();
}

// party-tab kick: any member may kick any non-leader member
function kick(player, username) {
    const party = getParty(player);
    if (!party) {
        return;
    }
    const member = party.findMember(username);
    if (!member) {
        return;
    }
    if (member.username === party.leader) {
        player.message("You can't kick the leader of the party.");
        return;
    }
    const wasWith = party.members.slice();
    party.remove(member);
    if (!member.isBot) {
        notifyBotsHumanLeft(party, wasWith, member.username);
    }
}

// set a member's rank (leader-only; wraps to NORMAL at >=3)
function rankPlayer(player, nameOrDisplay, rank) {
    const party = getParty(player);
    if (!party) {
        return;
    }
    let newRank = rank;
    if (newRank >= 3) {
        newRank = 0;
    }
    if (party.leader !== player.username) {
        player.message('You are not the leader of this party');
        return;
    }
    const member = party.findMember(nameOrDisplay);
    if (member && member.username === party.leader) {
        player.message('You are already the leader of the party');
        return;
    }
    if (member) {
        party.applyRank(player, member, newRank);
    }
}

// update a party setting (leader-only; pref>3 ignored, state wraps to 0 at >=3)
function updateSettings(player, pref, state) {
    const party = getParty(player);
    if (!party) {
        return;
    }
    if (pref > 3) {
        return;
    }
    let newState = state;
    if (newState >= 3) {
        newState = 0;
    }
    if (party.leader !== player.username) {
        player.message('You are not the leader of this party');
        return;
    }
    if (!party.applySetting(pref, newState)) {
        return;
    }
    player.message('[PARTY]: You have updated party settings');
    party.sendSettings();
}

// send the browse list of parties, sorted by points then name (action 4)
function sendPartyList(player) {
    const seen = new Set();
    const parties = [];

    for (const p of player.world.players.getAll()) {
        if (p.party && !seen.has(p.party)) {
            seen.add(p.party);
            parties.push(p.party);
        }
    }

    parties.sort((a, b) => {
        if (a.partyPoints === b.partyPoints) {
            return String(a.leader).localeCompare(String(b.leader));
        }

        return a.partyPoints > b.partyPoints ? -1 : 1;
    });

    player.send({
        type: 'party',
        action: 4,
        // only real groups (2+) appear in the browse list
        parties: parties
            .filter((p) => p.members.length >= 2)
            .map((p) => ({
                partyId: p.partyID,
                size: p.members.length,
                allowsSearchedJoin: p.allowSearchJoin,
                points: p.partyPoints
            }))
    });
}

// decline button: clear the pending invite and tell the inviter
function decline(player) {
    const inviterName = player.pendingPartyInvite;
    player.pendingPartyInvite = null;
    if (player._partyInviteTimer) {
        clearTimeout(player._partyInviteTimer);
        player._partyInviteTimer = null;
    }
    if (!inviterName) {
        return;
    }
    const inviter = findPlayer(player, inviterName);
    if (inviter) {
        inviter.message(`@cya@${player.username} has declined your party invitation`);
    }
}

// award nearby party members a share of the kill XP (a bonus, not a split)
function shareKillXP(victor, combatExperience) {
    const party = getParty(victor);
    if (!party || party.members.length < 2 || !combatExperience) {
        return;
    }
    const bonus = Math.floor((combatExperience / 4) * SHARE_FRACTION);
    if (bonus <= 0) {
        return;
    }
    for (const m of party.members) {
        if (m === victor) {
            continue;
        }
        if (
            typeof m.withinRange === 'function' &&
            !m.withinRange(victor, SHARE_RADIUS)
        ) {
            continue;
        }
        m.addExperience('hits', bonus);
    }
}

// drop a departing player from their party (fully removes, same as leave)
function onLogout(player) {
    const p = getParty(player);
    if (!p) {
        return;
    }
    const name = player.username;
    const wasWith = p.members.slice();
    p.remove(player);
    if (!player.isBot) {
        notifyBotsHumanLeft(p, wasWith, name);
    }
}

// resend each party's snapshot when a rendered field changed (membership, hp,
// skull, combat, leadership, rank, sharing)
function tickUpdates(world) {
    const synced = new Set();
    for (const player of world.players.getAll()) {
        const party = player.party;
        if (!party || synced.has(party)) {
            continue;
        }
        synced.add(party);
        party.tickSync();
    }
}

module.exports = {
    Party,
    getParty,
    humanIn,
    init,
    invite,
    accept,
    decline,
    leave,
    kick,
    rankPlayer,
    updateSettings,
    sendPartyList,
    toggleLootShare,
    toggleExperienceShare,
    chat,
    list,
    shareKillXP,
    onLogout,
    tickUpdates
};

// party loot rule, used by the drop ownership checks
module.exports.lootShared = lootShared;
