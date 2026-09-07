// ambient gnome-child chatter, random branch per talk
// ids 591/583 share one branch; 586 and 585 each have their own

const KING_WORM_ID = 897;

const GREEN_PURPLE_OR_CREAM_PURPLE_IDS = new Set([591, 583]);
const PURPLE_PINK_ID = 586;
const PINK_GREEN_ID = 585;

const GNOME_CHILD_IDS = new Set([583, 585, 586, 591]);

async function greenOrCreamPurpleChat(player, npc) {
    const chatRandom = Math.floor(Math.random() * 6);

    switch (chatRandom) {
        case 0:
            await npc.say("hello, why aren't you green?");
            await player.say("i don't know");
            await npc.say('maybe you should eat more vegtables');
            break;
        case 1:
            await npc.say('she loves me');
            await player.say('really');
            await npc.say('she does i tell you', 'she really loves me');
            break;
        // case 2 nothing but "hi there".
        case 3:
            player.message('the gnome appears to be singing');
            await npc.say('oh baby, oh my sweet');
            await player.say('are you talking to me?');
            await npc.say(
                "no, i'm just singing",
                "i'm gonna sweep you of your feet"
            );
            break;
        case 4:
            await npc.say('hello, would you like a worm?');
            await player.say('erm ok');
            player.message('the gnome gives you a worm');
            player.inventory.add(KING_WORM_ID, 1);
            await player.say('thanks');
            await npc.say(
                'in the gnome village those who are needy..',
                'recieve what they need, and those who are able..',
                '... give what they can'
            );
            break;
        case 5:
            await npc.say('low');
            await player.say('what?');
            await npc.say('when?');
            await player.say('cheeky');
            await npc.say('hee hee');
            break;
    }
}

async function purplePinkChat(player, npc) {
    const chatRandom = Math.floor(Math.random() * 9);

    switch (chatRandom) {
        case 0:
            await player.say('how are you');
            await npc.say(
                'a warning traveller, the new world..',
                '..will rise from the underground'
            );
            await player.say('what do you mean underground?');
            await npc.say('just a warning');
            break;
        case 1:
            await npc.say(
                'a little inaccuracy sometimes...',
                '..saves tons of explanation'
            );
            await player.say('true');
            break;
        case 2:
            await player.say('you look happy');
            await npc.say("i'm always at peace with myself");
            await player.say('how do you manage that?');
            await npc.say('i know, therefore i am');
            break;
        case 3:
            await npc.say('hello, would you like a worm?');
            await player.say('erm ok');
            player.message('the gnome gives you a worm');
            player.inventory.add(KING_WORM_ID, 1);
            await player.say('thanks');
            await npc.say(
                'in the gnome village those who are needy..',
                'recieve what they need, and those who are able..',
                '... give what they can'
            );
            break;
        case 4:
            await npc.say(
                'some advice traveller',
                'we can walk, run, row or fly',
                'but never lose sight of the reason for the journey',
                'or miss the chance to see a rainbow on the way'
            );
            await player.say('i like that');
            break;
        case 5:
            await npc.say(
                'my mum says...',
                'A friendly look, a kindly smile',
                "one good act, and life's worthwhile!"
            );
            await player.say('sweet');
            break;
        case 6:
            await npc.say('hello');
            await player.say('are you alright?');
            await npc.say('i just want something to happen');
            await player.say('what?');
            await npc.say("something, anything i don't know what");
            break;
        // case 7 nothing but "hello little man".
        case 8:
            player.message('@que@the gnome is preying');
            await npc.say(
                "guthix's angels fly so high as to be beyond our sight",
                'but they are always looking down upon us'
            );
            await player.say('maybe');
            break;
    }
}

async function pinkGreenChat(player, npc) {
    const chatRandom = Math.floor(Math.random() * 9);

    switch (chatRandom) {
        case 0:
            await npc.say('To be or not to be');
            await player.say("Hey I know that. Where's it from?");
            await npc.say('Existentialism for insects');
            break;
        case 1:
            await npc.say('The human mind is a tremendous thing');
            break;
        case 2:
            await npc.say('i have a riddle for you');
            await player.say('ok');
            await npc.say(
                'I am the beginning of eternity and the end of time and ' +
                    'space...',
                'I am the beginning of every end and the end of every ' +
                    'place. What am i?'
            );
            await player.say('?', 'erm..not sure...annoying');
            await npc.say("i'm E, hee hee, do you get it");
            break;
        case 3:
            await npc.say('hardy ha ha', 'hee hee hee');
            await player.say('are you ok?');
            await npc.say('i\'m a little tree gnome', 'that is me');
            await player.say("i've heard better");
            break;
        case 4:
            await player.say('hello there');
            await npc.say('bla bla bla');
            await player.say('what?');
            await npc.say('bla bla bla');
            player.message('rude little gnome');
            break;
        case 5:
            await npc.say(
                "Nice weather we're having today",
                "But then it doesn't tend to rain much round here"
            );
            break;
        // case 6 nothing but "hello".
        case 7:
            await npc.say('i have a riddle for you');
            await player.say('ok');
            await npc.say(
                'A tree which is planted on Monday and doubles in size ' +
                    'each day...',
                '...is fully grown on the following sunday',
                'On what day is it half grown?'
            );
            await player.say("Erm..i'm not sure");
            await npc.say(
                'saturday',
                "you big folk really aren't the quickest"
            );
            break;
        case 8:
            await npc.say(
                'I worship Guthix, the god of balance',
                'He really does have exceptional co-ordination'
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (!GNOME_CHILD_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    if (GREEN_PURPLE_OR_CREAM_PURPLE_IDS.has(npc.id)) {
        await player.say('hi there');
        await greenOrCreamPurpleChat(player, npc);
    } else if (npc.id === PURPLE_PINK_ID) {
        await player.say('hello little man');
        await purplePinkChat(player, npc);
    } else if (npc.id === PINK_GREEN_ID) {
        await player.say('hello');
        await pinkGreenChat(player, npc);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
