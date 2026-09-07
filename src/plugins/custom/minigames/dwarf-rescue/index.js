// dwarf rescue miniquest: rescue gramat's son, rewards the dwarf smithy note
// state = cache int miniquest_dwarf_youth_rescue: -1 not started / 0 / 1 / 2 complete

const GRAMAT_ID = 808;
const DWARVEN_SMITHY_ID = 809;
const DWARVEN_YOUTH_ID = 810;

const DWARF_SMITHY_NOTE_ID = 1374;
const TEDDY_ID = 1369;
const TEDDY_HEAD_ID = 1368;
const TEDDY_BOTTOM_ID = 1367;

const STATE_KEY = 'miniquest_dwarf_youth_rescue';

// content split on '%' into message lines
const NOTE_LINES = [
    'How to obtain the Dragon Scale Mail',
    ' ',
    'Required Items:',
    ' ',
    '500 Dragon Metal Chains',
    ' 150 Chipped Dragon Scales',
    ' ',
    'Dragon metal chains can be smithed(req 90) from dragon metal bars (one bar -> 50 chains)',
    ' Speak to the dwarven smithy for details to obtain dragon bars',
    ' ',
    'Chipped dragon scales are crafted(req 90, chisel) from King Black Dragon scales',
    ' ',
    'One all items are prepared, seek out Wayne in Falador'
];

function getStage(player) {
    return typeof player.cache[STATE_KEY] === 'number' ? player.cache[STATE_KEY] : -1;
}

async function onInventoryCommand(player, item) {
    if (item.id !== DWARF_SMITHY_NOTE_ID) {
        return false;
    }

    player.message('@que@the note reads....');
    for (const line of NOTE_LINES) {
        player.message(line);
    }

    return true;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === GRAMAT_ID) {
        await talkGramat(player, npc);
        return true;
    }

    if (npc.id === DWARVEN_SMITHY_ID) {
        await talkSmithy(player, npc);
        return true;
    }

    if (npc.id === DWARVEN_YOUTH_ID) {
        await talkYouth(player, npc);
        return true;
    }

    return false;
}

async function talkGramat(player, npc) {
    const stage = getStage(player);

    switch (stage) {
        case -1:
            await npc.say(
                'what is a dwarf to do',
                'my son has ignored my warnings',
                'now he is in danger'
            );

            if (player.questStages.dwarfCannon === -1) {
                await npc.say(
                    '..' + player.username + '!',
                    'maybe you could help us again',
                    'my son has wandered into our new construction zone',
                    'could you see to his safe return'
                );
                await player.say('where should I look for him');
                await npc.say(
                    'just inside the mines there is a ladder',
                    "he's somewhere down there"
                );
                player.cache[STATE_KEY] = 0;
            }

            break;
        case 0:
            await npc.say('please hurry', 'my son is in danger');
            break;
        case 1:
            await npc.say(
                'my son told me how you helped him',
                "i'm eternally grateful",
                'he said you have his teddy'
            );

            if (player.inventory.has(TEDDY_ID, 1)) {
                await player.say('i do, and i fixed it');
                player.message('@que@You hand over the teddy');
                await player.world.sleepTicks(3);
                player.cache[STATE_KEY] = 2;
                player.inventory.remove(TEDDY_ID, 1);
                await npc.say(
                    "yet again you've proven a friend to us",
                    'i will talk to our best smithy',
                    'he works at the new lava forge deep underground',
                    'as our ally you will have access to its power',
                    'please take this and read it'
                );
                player.message('@que@Gramat hands you a note');
                player.inventory.add(DWARF_SMITHY_NOTE_ID, 1);
                await player.world.sleepTicks(3);
                await npc.say(
                    'if you follow the steps on the note',
                    'you will be rewarded in combat'
                );
                player.message(
                    '@que@You have completed the dwarf youth rescue miniquest!'
                );
            } else {
                await player.say(
                    "i do, but it's damaged",
                    'let me repair it first'
                );
                await npc.say(
                    'he loves that teddy',
                    'and i love him',
                    'sew it with some needle and thread',
                    'then return to me'
                );
            }

            break;
        case 2:
            await npc.say(
                'thank you for rescuing my son',
                'you are a hero among us dwarves'
            );
            break;
    }
}

async function talkSmithy(player, npc) {
    const stage = getStage(player);

    if (stage === 2) {
        await npc.say(
            'oi ' + player.username,
            'Gramat told me about you',
            'this forge is yours to use',
            "it's hot enough to melt the strongest of metals",
            'dragon long swords smelt to one bar',
            'dragon axes smelt to two'
        );
    } else {
        await npc.say(
            'this is our reason for digging',
            "it's the latest in dwarven technology",
            'this furnace uses the intense heat of lava',
            'our enemies will suffer from its forgings'
        );
    }
}

async function talkYouth(player, npc) {
    const stage = getStage(player);

    if (stage < 1) {
        if (
            player.inventory.has(TEDDY_HEAD_ID, 1) &&
            player.inventory.has(TEDDY_BOTTOM_ID, 1)
        ) {
            await npc.say('have you found teddy?');
            await player.say('well.. yes?');
            await npc.say('teddy! i\'m so happy!', 'let me see him!');
            await player.say("it's too dangerous here", "let's go back first");
            await npc.say(
                'ok. i have extra runes',
                'please give teddy to my father'
            );
            player.teleport(271, 3339, true);
            await player.say(
                "i'd better repair this",
                'i bet i could sew it',
                'with a needle and some thread'
            );
            player.cache[STATE_KEY] = 1;
        } else {
            await npc.say(
                'please help me',
                'i want to return to father',
                "but I've lost my teddy",
                "i can't leave him behind"
            );
        }
    }
}

module.exports = { onTalkToNPC, onInventoryCommand };
