
const { hasStage, setStageIfLess } = require('./stage');

const COMMUNITY_INSTRUCTOR_ID = 496;

const HOW_TO_COMMUNICATE = 'How can I communicate with other players?';
const ARE_THERE_RULES = 'Are there rules on ingame behaviour?';
const GOODBYE = 'goodbye then';
const GLOBAL_CHAT = 'Is there a global chat?';

function wantGlobalChat(player) {
    return !!player.world.server.config.wantGlobalChat;
}

function createMultiMenu(player, justSelected) {
    const options = [HOW_TO_COMMUNICATE, ARE_THERE_RULES, GOODBYE];

    if (wantGlobalChat(player)) {
        options.splice(2, 0, GLOBAL_CHAT);
    }

    return options.filter((option) => option !== justSelected);
}

async function globalChatDialog(player, npc) {
    const config = player.world.server.config;
    const cooldownMs = config.globalMessageCooldown || 0;
    const globalCooldownSeconds = Math.floor(cooldownMs / 1000);

    const minutes = Math.floor(globalCooldownSeconds / 60);
    const seconds = globalCooldownSeconds % 60;

    let cooldown = '';

    if (globalCooldownSeconds > 0) {
        if (minutes > 0) {
            cooldown += `${minutes} minutes`;

            if (seconds > 0) {
                cooldown += ` and ${seconds} seconds`;
            }
        } else {
            cooldown += `${seconds} seconds`;
        }
    }

    const globalTotalLevel = config.globalMessageTotalLevelReq || 0;

    await npc.say(
        'Why yes',
        'You can talk to everyone on the server at once',
        'All you have to do is start your message with ::g',
        'There are a couple caveats though',
        'Firstly, you cannot use global chat until you leave this island'
    );

    if (globalTotalLevel > 0) {
        await npc.say(
            'Secondly, you must reach a total skill level of ' +
                globalTotalLevel +
                ' to speak in global chat'
        );
    }

    await npc.say(
        'And lastly, remember that everyone can see your messages!',
        "Make sure that you're following all the rules and behaving yourself",
        'Nobody wants to see spam in global chat either, I\'m sure you\'ll agree'
    );

    if (globalCooldownSeconds > 0) {
        await npc.say(
            'To help alleviate this...',
            '...players can only send global chat messages every ' + cooldown
        );
    }

    await pickBranch(player, npc, GLOBAL_CHAT);
}

async function behaviourDialogue(player, npc) {
    await npc.say(
        'Yes you should read the rules of conduct on our front page',
        'To make sure you do nothing to get yourself banned',
        'but as general guide always try to be courteous to people in game',
        'Remember the people in the game are real people somewhere',
        'With real feelings',
        'If you go round being abusive or causing trouble',
        'your character could quickly be the one in trouble'
    );

    await pickBranch(player, npc, ARE_THERE_RULES);
}

async function communicateDialogue(player, npc) {
    await npc.say(
        'typing in the game window will bring up chat',
        'Which players in the nearby area will be able to see',
        'If you want to speak to a particular friend anywhere in the game',
        'You will be able to select the smiley face icon',
        "then click to add a friend, and type in your friend's name",
        'If that player is logged in on the same world as you',
        "their name will go green",
        'If they are logged in on a different world their name will go yellow',
        "clicking on their name will allow you to send a message"
    );

    await pickBranch(player, npc, HOW_TO_COMMUNICATE);
}

// picks the next dialogue branch, excluding the option chosen
async function pickBranch(player, npc, justSelected) {
    const options = createMultiMenu(player, justSelected);
    const menu = await player.ask(options, true);
    const selected = options[menu];

    if (selected === HOW_TO_COMMUNICATE) {
        await communicateDialogue(player, npc);
    } else if (selected === ARE_THERE_RULES) {
        await behaviourDialogue(player, npc);
    } else if (selected === GOODBYE) {
        await npc.say('Good luck');
        setStageIfLess(player, 100);
    } else if (selected === GLOBAL_CHAT) {
        await globalChatDialog(player, npc);
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== COMMUNITY_INSTRUCTOR_ID) {
        return false;
    }

    if (!hasStage(player)) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        "You're almost ready to go out into the main game area",
        'When you get out there',
        'You will be able to interact with thousands of other players'
    );

    const options = createMultiMenu(player, GOODBYE);
    const menu = await player.ask(options, true);
    const selected = options[menu];

    if (selected === HOW_TO_COMMUNICATE) {
        await communicateDialogue(player, npc);
    } else if (selected === ARE_THERE_RULES) {
        await behaviourDialogue(player, npc);
    } else if (selected === GLOBAL_CHAT) {
        await globalChatDialog(player, npc);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
