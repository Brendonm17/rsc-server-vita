// global chat commands: ::g/::pk (broadcast), ::gc/::globalchat (info), the
// rules-acceptance flow, ::setglobalmessagecolor, ::gq/::gp, ::toggleglobalchat,
// and ::online/::onlinelist/::onlinelistlocs.
//
// two delivery paths, picked by config:
//   wantGlobalChat:   ::g/::pk broadcast to everyone, in "General"/"PKing" channels
//   wantGlobalFriend: only ::g works, delivered to everyone who hasn't blocked
//                     the virtual "Global$" friend
// defaults for this port: wantGlobalChat off, wantGlobalFriend on, rules
// agreement on. the message queue is drained synchronously at send time.

const staff = require('./staff-commands');
const clan = require('./clan');

const MESSAGE_PREFIX = '@gre@System message:@whi@ ';

function config(world) {
    const c = world.server.config;

    return {
        wantGlobalChat: c.wantGlobalChat === true,
        // wantGlobalFriend defaults on for this port
        wantGlobalFriend: c.wantGlobalFriend !== false,
        wantGlobalRulesAgreement: c.wantGlobalRulesAgreement !== false,
        globalMessageCooldown: c.globalMessageCooldown || 0,
        globalMessageTotalLevelReq: c.globalMessageTotalLevelReq || 0,
        globalMessageReadingTotalLevelReq: c.globalMessageReadingTotalLevelReq || 0
    };
}

function totalLevel(player) {
    let total = 0;

    for (const skill of Object.values(player.skills || {})) {
        total += skill.base;
    }

    return total;
}

// tutorialStage key present = still in the tutorial
function onTutorialIsland(player) {
    return typeof player.cache.tutorialStage === 'number';
}

// can this player send to global chat?
function isEligibleToGlobalChat(player) {
    if (player.isMuted()) {
        player.message(MESSAGE_PREFIX + 'You are ' + (player.muteEndDate === -1 ? 'permanently muted' : 'temporarily muted') + '.');
        return false;
    }

    const globalMute = player.cache.globalMuteExpires;

    if (globalMute && (globalMute === -1 || globalMute > Date.now())) {
        player.message(
            MESSAGE_PREFIX +
                'You are ' +
                (globalMute === -1
                    ? 'permanently muted'
                    : `temporarily muted for ${Math.ceil((globalMute - Date.now()) / 60000)} minutes`) +
                ' from global chat.'
        );
        return false;
    }

    const { globalMessageCooldown, globalMessageTotalLevelReq } = config(player.world);
    const sayDelay = player.cache.globalSayDelay || 0;

    if (!staff.isPlayerMod(player) && Date.now() - sayDelay < globalMessageCooldown) {
        player.message(
            MESSAGE_PREFIX + `You can only send a message to global every ${Math.ceil(globalMessageCooldown / 1000)} seconds`
        );
        return false;
    }

    if (!staff.isPlayerMod(player) && totalLevel(player) < globalMessageTotalLevelReq) {
        player.message(
            `You can only send a message to global chat if you have at least ${globalMessageTotalLevelReq} total level.`
        );
        player.message('Type @gre@::globalchat@whi@ or @gre@::gc@whi@ for more information.');
        return false;
    }

    if (onTutorialIsland(player) && !staff.isMod(player)) {
        player.message('@cya@Once you finish the tutorial, this lets you send messages to everyone on the server');
        return false;
    }

    const { wantGlobalRulesAgreement } = config(player.world);

    if (wantGlobalRulesAgreement && !player.cache.acceptedGlobalRules && !staff.isPlayerMod(player)) {
        player.message('@cya@You must agree to the global chat rules before using global chat');
        player.message('@cya@Use the ::globalrules command to view them.');
        return false;
    }

    player.cache.globalSayDelay = Date.now();
    return true;
}

// ::g / ::pk (wantGlobalChat direct-channel path)
function sendChannelMessage(player, command, args) {
    const channelPrefix = command === 'g' ? '@gr2@[General] ' : '@or1@[PKing] ';
    const channelColour = command === 'g' ? '@gr2@' : '@or1@';
    const clanTag = clan.clanTagPrefix(player);
    const text =
        channelPrefix +
        '@whi@' +
        clanTag +
        staff.getStaffName(player) +
        ': ' +
        channelColour +
        args.join(' ');

    for (const p of player.world.players.getAll()) {
        p.message(text);
    }
    botsHear(player, command, args.join(' '));
}

// the bots read the channel like anyone else and answer on it
function botsHear(player, command, text) {
    try {
        require('./bots/hearing').onGlobalChat(player, text, (bot, line) => {
            if (bot.cache && bot.cache.acceptedGlobalRules === undefined) {
                bot.cache.acceptedGlobalRules = true;
            }
            sendMessageGlobal(bot, command, line.split(' '));
        });
    } catch (e) {
        // bots never cost a human their message
    }
}

// ::g (wantGlobalFriend path, drained synchronously)
function formatGlobalFriendMessage(player, message, viewerColour) {
    const colour = viewerColour || '@cya@';
    const groupName = staff.getGroupMessageName(player);
    const groupPart = groupName
        ? '@ora@[' + (groupName === 'Pmod' ? '@whi@' : '@yel@') + groupName + '@ora@]'
        : '@ora@';

    return (
        colour +
        'Global$' +
        groupPart +
        '[@gre@' +
        player.username +
        '@ora@]: ' +
        colour +
        message.replace(/~\.\.\.~/g, '')
    );
}

function sendGlobalFriendMessage(player, message) {
    for (const p of player.world.players.getAll()) {
        if (p === player) {
            p.message(formatGlobalFriendMessage(player, message, p.cache.globalMessageColor));
            continue;
        }

        if (p.cache.blockGlobalFriend) {
            continue;
        }

        p.message(formatGlobalFriendMessage(player, message, p.cache.globalMessageColor));
    }
    botsHear(player, 'g', message);
}

function sendMessageGlobal(player, command, args) {
    const { wantGlobalChat, wantGlobalFriend } = config(player.world);

    if (!wantGlobalChat && !wantGlobalFriend) {
        return;
    }

    if (!isEligibleToGlobalChat(player)) {
        return;
    }

    const text = args.join(' ').trim();

    if (!text) {
        return;
    }

    if (wantGlobalChat) {
        sendChannelMessage(player, command.toLowerCase(), args);
        return;
    }

    if (wantGlobalFriend && command.toLowerCase() === 'g') {
        sendGlobalFriendMessage(player, text);
    }
}

// ::toggleglobalchat
function toggleGlobalChat(player) {
    const { wantGlobalFriend } = config(player.world);

    if (!wantGlobalFriend) {
        return;
    }

    const blocked = !player.cache.blockGlobalFriend;

    if (blocked) {
        player.message('You will no longer see any Global chat.');
        player.message('Manually remove the Global$ friend or relog.');
    } else {
        player.message('You will now be able to see & participate in Global chat features.');
    }

    player.cache.blockGlobalFriend = blocked;
}

// ::gc / ::globalchat (info)
function globalChatInfo(player) {
    const { wantGlobalChat, wantGlobalFriend, wantGlobalRulesAgreement, globalMessageReadingTotalLevelReq, globalMessageTotalLevelReq } =
        config(player.world);

    if (!wantGlobalChat && !wantGlobalFriend) {
        player.message('Global chat is disabled on this world.');
        return;
    }

    player.message('@yel@Global Chat');
    player.message('@whi@Global Chat allows anyone participating to broadcast a message to everyone else on the server.');

    if (wantGlobalFriend) {
        player.message(
            '@whi@It is possible to opt-out of this feature with @cya@::toggleglobalchat@whi@ (removing the @cya@Global@whi@ friend), and back in by using it again.'
        );
    }

    if (globalMessageReadingTotalLevelReq > 0) {
        player.message(`@whi@To read global chat, players must reach a skill total of at least ${globalMessageReadingTotalLevelReq}.`);
    }

    if (globalMessageTotalLevelReq > 0) {
        player.message(`@whi@To send a message to global chat, players must reach a skill total of at least ${globalMessageTotalLevelReq}.`);

        const total = totalLevel(player);

        player.message(`@whi@Your skill total is currently ${total}, ` + (
            total >= globalMessageTotalLevelReq
                ? 'so you meet the requirements to both send & receive messages.'
                : total >= globalMessageReadingTotalLevelReq
                    ? "so you can @yel@see@whi@ global chat messages, but can't yet @yel@send@whi@ them."
                    : "so you aren't yet able to participate in global chat."
        ));
    }

    player.message(
        '@whi@If you are muted, ' +
            (player.isMuted() || player.cache.globalMuteExpires ? '@red@(which you @dre@are@red@)@whi@' : '') +
            'you will no longer be able to participate in global chat.'
    );

    if (wantGlobalRulesAgreement) {
        player.message('Make sure to read the rules by typing @cya@::globalrules@whi@ at any time.');
    }

    player.message('Also, it is possible to change where global chat messages appear with the @cya@::gq@whi@ or @cya@::gp@whi@ commands.');
    player.message('You can send a global chat message by typing @cya@::g@whi@ with your message.');
}

// ::globalrules
// placeholder ruleset
const GLOBAL_RULES = [
    'Be respectful to other players.',
    'No spamming or advertising.',
    "Follow the host's instructions."
];

function displayGlobalRules(player) {
    const { wantGlobalChat, wantGlobalFriend, wantGlobalRulesAgreement } = config(player.world);

    if (!wantGlobalChat && !wantGlobalFriend) {
        return;
    }

    if (!wantGlobalRulesAgreement) {
        return;
    }

    player.message('@yel@Global Chat Rules:');

    for (const rule of GLOBAL_RULES) {
        player.message('@whi@' + rule);
    }
}

// ::i_have_read_and_agree(d)_to_the_global_chat_rules (all four spellings)
function acceptGlobalChatRules(player) {
    const { wantGlobalChat, wantGlobalFriend, wantGlobalRulesAgreement } = config(player.world);

    if (!wantGlobalChat && !wantGlobalFriend) {
        return;
    }

    if (!wantGlobalRulesAgreement) {
        return;
    }

    if (player.cache.acceptedGlobalRules) {
        player.message(MESSAGE_PREFIX + 'You have already agreed to the global chat rules');
        player.message(
            config(player.world).wantGlobalFriend
                ? 'You can use ::g or the Global$ friend to speak in global chat'
                : 'You can use ::g to speak in global chat'
        );
        player.message('If you wish to view the global chat rules again, you can use the @cya@::globalrules @whi@command');
        return;
    }

    player.cache.acceptedGlobalRules = true;
    player.message('@que@Thank you for agreeing to the Global chat rules!');
    player.message(
        wantGlobalFriend
            ? 'You can now use ::g or the Global$ friend to speak in global chat'
            : 'You can now use ::g to speak in global chat'
    );
}

// ::setglobalmessagecolor
function setGlobalMessageColor(player, args) {
    const { wantGlobalChat, wantGlobalFriend } = config(player.world);

    if (!wantGlobalChat && !wantGlobalFriend) {
        return;
    }

    if (args.length >= 1) {
        player.cache.globalMessageColor = args[0];
        player.message('@cya@Global message color set to ' + args[0] + 'This color.');
    } else if (player.cache.globalMessageColor) {
        delete player.cache.globalMessageColor;
        player.message('@cya@Global message color reset.');
    }
}

// ::gq / ::gp (which tab global messages appear on)
function setGlobalOutput(player, toPrivate) {
    const { wantGlobalChat, wantGlobalFriend } = config(player.world);

    if (!wantGlobalChat && !wantGlobalFriend) {
        return;
    }

    if (!toPrivate) {
        if (player.cache.privateMessageGlobal) {
            delete player.cache.privateMessageGlobal;
            player.message('@cya@Global messages now are received on the @whi@Quest history@cya@ tab.');
        } else {
            player.message('@cya@Global messages were already received on the @whi@Quest history@cya@ tab.');
            player.message('@cya@Type @whi@::gp@cya@ to change this.');
        }
    } else if (!player.cache.privateMessageGlobal) {
        player.cache.privateMessageGlobal = true;
        player.message('@cya@Global messages now are received on the @whi@Private history@cya@ tab.');
    } else {
        player.message('@cya@Global messages were already received on the @whi@Private history@cya@ tab.');
        player.message('@cya@Type @whi@::gq@cya@ to change this.');
    }
}

// ::online / ::onlinelist / ::onlinelistlocs
function queryOnlinePlayerCount(player) {
    let count = 0;

    for (const p of player.world.players.getAll()) {
        if (!staff.isStaff(p) && !p.isBot) {
            count += 1;
        }
    }

    player.message(MESSAGE_PREFIX + 'Players Online: ' + count);
}

function queryOnlinePlayers(player, args, wantLocations) {
    const all =
        args.length > 0 && ['all', 'yes', '1', 'true'].includes(args[0].toLowerCase());
    const names = [];

    for (const p of player.world.players.getAll()) {
        if (p.isBot && !all) {
            continue;
        }

        names.push(wantLocations ? `${p.username} (${p.x}, ${p.y})` : p.username);
    }

    player.message(`@gre@Online (@whi@${names.length}@gre@): @whi@` + (names.join(', ') || '-'));
}

// dispatch

const COMMAND_TO_ARGS = {
    g: (p, c, a) => sendMessageGlobal(p, c, a),
    pk: (p, c, a) => sendMessageGlobal(p, c, a),
    gc: (p) => globalChatInfo(p),
    globalchat: (p) => globalChatInfo(p),
    toggleglobalchat: (p) => toggleGlobalChat(p),
    globalrules: (p) => displayGlobalRules(p),
    i_have_read_and_agree_to_the_global_chat_rules: (p) => acceptGlobalChatRules(p),
    i_have_read_and_agreed_to_the_global_chat_rules: (p) => acceptGlobalChatRules(p),
    ihavereadandagreetotheglobalchatrules: (p) => acceptGlobalChatRules(p),
    ihavereadandagreedtotheglobalchatrules: (p) => acceptGlobalChatRules(p),
    setglobalmessagecolor: (p, c, a) => setGlobalMessageColor(p, a),
    globalquest: (p) => setGlobalOutput(p, false),
    gq: (p) => setGlobalOutput(p, false),
    globalprivate: (p) => setGlobalOutput(p, true),
    gp: (p) => setGlobalOutput(p, true),
    online: (p) => queryOnlinePlayerCount(p),
    onlinelist: (p, c, a) => queryOnlinePlayers(p, a, false),
    onlinelistlocs: (p, c, a) => queryOnlinePlayers(p, a, true)
};

function dispatchGlobalChat(player, command, args) {
    const handler = COMMAND_TO_ARGS[String(command || '').toLowerCase()];

    if (!handler) {
        return false;
    }

    handler(player, command, args || []);
    return true;
}

module.exports = { dispatchGlobalChat, isEligibleToGlobalChat };
