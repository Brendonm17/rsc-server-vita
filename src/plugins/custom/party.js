// parties: session-based group of players with shared party-chat and shared combat kill-XP. runtime-only (dissolves
// when members log out). a Party holds member player objects; each member gets player.party pointing at the shared Party. invites are a pending username on the invitee. members get the party packet (116): roster snapshots (action 0), clear on leaving (action 1), invite popup (action 2). the client answers over interfaceOptions (199, party sub 12)

const MAX_PARTY = 8; // host + up to 7 guests
const SHARE_RADIUS = 4; // tiles; only nearby party members share kill-XP
const SHARE_FRACTION = 0.5; // bonus XP per nearby member = 50% of the kill XP

// wire snapshot shows formatted names; identity stays on raw usernames
function displayName(player) {
    return player.getFormattedUsername
        ? player.getFormattedUsername()
        : player.username;
}

function trySend(player, message) {
    try {
        player.send(message);
    } catch (e) {
        // ignored: the disconnecting member no longer needs wire state
    }
}

class Party {
    constructor(leader) {
        this.leader = leader.username;
        this.members = [leader];
        leader.party = this;
    }

    has(player) {
        return this.members.indexOf(player) !== -1;
    }

    add(player) {
        if (this.members.length >= MAX_PARTY || this.has(player)) {
            return false;
        }
        this.members.push(player);
        player.party = this;
        return true;
    }

    remove(player) {
        const i = this.members.indexOf(player);
        if (i !== -1) {
            this.members.splice(i, 1);
        }
        player.party = null;
        trySend(player, { type: 'party', action: 1 });
        // hand leadership down rather than leaving a leaderless party
        if (player.username === this.leader && this.members.length > 1) {
            this.leader = this.members[0].username;
            this.notify(
                `${displayName(this.members[0])} is now the party leader.`
            );
        }
        // dissolve if empty or a single member remains
        if (this.members.length <= 1) {
            for (const m of this.members.slice()) {
                m.party = null;
                trySend(m, { type: 'party', action: 1 });
            }
            this.members = [];
        }
    }

    broadcast(fromUsername, text) {
        for (const m of this.members) {
            m.message(`@cya@[party] @whi@${fromUsername}: ${text}`);
        }
    }

    notify(text) {
        for (const m of this.members) {
            m.message(`@cya@[party] @whi@${text}`);
        }
    }

    statusOf(m) {
        return {
            username: displayName(m),
            rank: m.username === this.leader ? 1 : 0,
            currentHealth: m.skills.hits.current,
            maxHealth: m.skills.hits.base,
            combatLevel: m.combatLevel,
            skulled: m.skulled > 0,
            inCombat: !!m.opponent
        };
    }

    // one party packet per member, each seeing their own isLeader flag
    sendState() {
        const leaderMember = this.members.find(
            (m) => m.username === this.leader
        );
        const leaderName = leaderMember
            ? displayName(leaderMember)
            : this.leader;
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

    // every field the client renders; a change means a fresh snapshot
    signature() {
        return (
            this.leader +
            '|' +
            this.members
                .map((m) =>
                    [
                        m.username,
                        m.skills.hits.current,
                        m.skills.hits.base,
                        m.combatLevel,
                        m.skulled > 0 ? 1 : 0,
                        m.opponent ? 1 : 0
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

// ::pinvite <name>
function invite(player, username) {
    if (!username) {
        player.message('@cya@Usage: @whi@::pinvite <name>');
        return;
    }
    const target = findPlayer(player, username);
    if (!target || target === player) {
        player.message('@cya@No such player here.');
        return;
    }
    if (target.party) {
        player.message('@cya@That player is already in a party.');
        return;
    }
    // the party is created on accept
    const party = getParty(player);
    if (party && party.members.length >= MAX_PARTY) {
        player.message('@cya@Your party is full.');
        return;
    }
    target.pendingPartyInvite = player.username;
    player.message(`@cya@Invited @whi@${target.username}@cya@ to your party.`);
    target.message(
        `@cya@${player.username} invited you to a party. Type @whi@::partyaccept`
    );
    // the client turns this into the accept/decline popup
    trySend(target, {
        type: 'party',
        action: 2,
        from: displayName(player),
        partyName: `${displayName(player)}'s party`
    });
}

// ::partyaccept
function accept(player) {
    const inviterName = player.pendingPartyInvite;
    player.pendingPartyInvite = null;
    if (!inviterName) {
        player.message('@cya@You have no pending party invite.');
        return;
    }
    const inviter = findPlayer(player, inviterName);
    if (!inviter) {
        player.message('@cya@That player is no longer here.');
        return;
    }
    const party = getParty(inviter) || new Party(inviter);
    if (party.add(player)) {
        party.notify(`${player.username} joined the party.`);
    } else {
        player.message('@cya@Could not join (party full?).');
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
    party.remove(player);
    player.message('@cya@You left the party.');
    if (party.members.length) {
        party.notify(`${name} left the party.`);
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

// drop a departing player from their party without messaging them, notifying whoever remains
function onLogout(player) {
    const p = getParty(player);
    if (!p) {
        return;
    }
    const name = player.username;
    p.remove(player);
    if (p.members.length) {
        p.notify(`${name} left the party (logged out).`);
    }
}

// invite popup decline button: clear the pending invite and notify the inviter
function decline(player) {
    const inviterName = player.pendingPartyInvite;
    player.pendingPartyInvite = null;
    if (!inviterName) {
        return;
    }
    const inviter = findPlayer(player, inviterName);
    if (inviter) {
        inviter.message(
            `@cya@${displayName(player)} declined your party invite.`
        );
    }
}

// party-tab kick (leader only); the client sends the displayed member name
function kick(player, username) {
    const party = getParty(player);
    if (!party || party.leader !== player.username) {
        return;
    }
    const target = String(username || '').toLowerCase();
    const member = party.members.find(
        (m) =>
            m !== player &&
            (m.username.toLowerCase() === target ||
                displayName(m).toLowerCase() === target)
    );
    if (!member) {
        return;
    }
    party.remove(member);
    member.message('@cya@You were kicked from the party.');
    if (party.members.length) {
        party.notify(`${displayName(member)} was kicked from the party.`);
    }
}

// resend each party's snapshot when a rendered field changed (membership, hp, skull, combat, leadership)
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
    invite,
    accept,
    decline,
    leave,
    kick,
    chat,
    list,
    shareKillXP,
    onLogout,
    tickUpdates
};
