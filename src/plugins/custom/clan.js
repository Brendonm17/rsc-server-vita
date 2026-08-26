// clans: named social groups with clan chat, a leader + members, and invites. session-scoped (runtime-only): a clan
// lives on the host world while its members are online. distinct from parties: a clan is a persistent-within-session named chat group

const MAX_CLAN = 8;

class Clan {
    constructor(name, leader) {
        this.name = String(name).slice(0, 24);
        this.leader = leader.username;
        this.members = [leader];
        leader.clan = this;
    }

    add(player) {
        if (this.members.length >= MAX_CLAN || this.members.indexOf(player) !== -1) {
            return false;
        }
        this.members.push(player);
        player.clan = this;
        return true;
    }

    remove(player) {
        const i = this.members.indexOf(player);
        if (i !== -1) {
            this.members.splice(i, 1);
        }
        player.clan = null;
        if (!this.members.length) {
            return;
        }
        // hand leadership to the next member if the leader left
        if (this.leader === (player.username || '') && this.members.length) {
            this.leader = this.members[0].username;
            this.notify(`${this.leader} is now the clan leader.`);
        }
    }

    broadcast(fromUsername, text) {
        for (const m of this.members) {
            m.message(`@cya@[${this.name}] @whi@${fromUsername}: ${text}`);
        }
    }

    notify(text) {
        for (const m of this.members) {
            m.message(`@cya@[clan] @whi@${text}`);
        }
    }
}

function getClan(player) {
    return player && player.clan ? player.clan : null;
}

function findPlayer(player, username) {
    if (!player.world || !player.world.players || !player.world.players.getAll) {
        return null;
    }
    const target = String(username || '').toLowerCase();
    return (
        player.world.players
            .getAll()
            .find((p) => p.username && p.username.toLowerCase() === target) ||
        null
    );
}

// ::clan create <name>  /  ::clan   (info)
function command(player, args) {
    if (args[0] && args[0].toLowerCase() === 'create') {
        const name = args.slice(1).join(' ').trim();
        if (!name) {
            player.message('@cya@Usage: @whi@::clan create <name>');
            return;
        }
        if (getClan(player)) {
            player.message('@cya@Leave your current clan first.');
            return;
        }
        new Clan(name, player);
        player.message(`@cya@Clan @whi@${name}@cya@ created. @whi@::claninvite <name>`);
        return;
    }

    const c = getClan(player);
    if (!c) {
        player.message('@cya@You are not in a clan. @whi@::clan create <name>');
        return;
    }
    const names = c.members.map((m) => m.username).join(', ');
    player.message(
        `@cya@${c.name} (@whi@${c.members.length}@cya@, leader @whi@${c.leader}` +
            `@cya@): @whi@${names}`
    );
}

function invite(player, username) {
    const c = getClan(player);
    if (!c) {
        player.message('@cya@Create a clan first: @whi@::clan create <name>');
        return;
    }
    if (c.leader !== player.username) {
        player.message('@cya@Only the clan leader can invite.');
        return;
    }
    const target = findPlayer(player, username);
    if (!target || target === player) {
        player.message('@cya@No such player here.');
        return;
    }
    if (target.clan) {
        player.message('@cya@That player is already in a clan.');
        return;
    }
    target.pendingClanInvite = player.username;
    player.message(`@cya@Invited @whi@${target.username}@cya@ to ${c.name}.`);
    target.message(
        `@cya@${player.username} invited you to clan ${c.name}. Type @whi@::clanaccept`
    );
}

function accept(player) {
    const inviterName = player.pendingClanInvite;
    player.pendingClanInvite = null;
    if (!inviterName) {
        player.message('@cya@You have no pending clan invite.');
        return;
    }
    const inviter = findPlayer(player, inviterName);
    const c = inviter && getClan(inviter);
    if (!c) {
        player.message('@cya@That clan no longer exists.');
        return;
    }
    if (c.add(player)) {
        c.notify(`${player.username} joined the clan.`);
    } else {
        player.message('@cya@Could not join (clan full?).');
    }
}

function leave(player) {
    const c = getClan(player);
    if (!c) {
        player.message('@cya@You are not in a clan.');
        return;
    }
    const name = player.username;
    c.remove(player);
    player.message('@cya@You left the clan.');
    if (c.members.length) {
        c.notify(`${name} left the clan.`);
    }
}

function chat(player, text) {
    const c = getClan(player);
    if (!c) {
        player.message('@cya@You are not in a clan.');
        return;
    }
    if (text) {
        c.broadcast(player.username, text);
    }
}

function onLogout(player) {
    const c = getClan(player);
    if (!c) {
        return;
    }
    const name = player.username;
    c.remove(player);
    if (c.members.length) {
        c.notify(`${name} went offline.`);
    }
}

module.exports = { command, invite, accept, leave, chat, onLogout };
