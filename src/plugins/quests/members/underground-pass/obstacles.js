// underground pass - cave entrance and lore objects

const { questsEnabled } = require('../../custom-gate.js');
const koftik = require('./koftik.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

// OpenRSC READ_ROCKS ids -> the scratched scriptures they display.
const READ_ROCKS = {
    832:
        '@red@All those who thirst for knowledge. Bow down to the lord. ' +
        'All you that crave eternal life, Come and meet your God. ' +
        'For no man nor beast can cast a spell, Against the wake of eternal hell.',
    833:
        '@red@Most men do live in fear of death, That it might steal their soul. ' +
        'Some work and pray to shield their life, From the ravages of the cold. ' +
        'But only those who embrace the end, Can truly make their life extend. ' +
        'And when all hope begins to fade, look above and use nature as your aid',
    834:
        '@red@And now our God has given us, One who is from our own. ' +
        'A saviour who once sat upon, His father\'s glorious thrown. ' +
        'It is in your name that we will lead the attack Iban, son of Zamorak!',
    835:
        '@red@Here lies the sacred font, Where the great Iban will bless all his ' +
        'disciples in the name of evil. Here the forces of darkness are so ' +
        'concentrated they rise when they detect any positive force close by',
    923:
        '@red@Ibans Shadow. Then came the hard part: recreating the parts of a man ' +
        'that cannot be seen or touched: those intangible things that are life ' +
        'itself. Using all the mystical force that I could muster, I performed the ' +
        'ancient ritual of Incantia, a spell so powerful that it nearly stole the ' +
        'life from my frail and withered body. Opening my eyes again, I saw the ' +
        'three demons that had been summoned. Standing in a triangle, their energy ' +
        'was focused on the doll. These demons would be the keepers of Iban\'s ' +
        'shadow. Black as night, their shared spirit would follow his undead body ' +
        'like an angel of death.',
    922:
        '@red@Crumbling some of the dove\'s bones onto the doll, I cast my mind\'s ' +
        'eye onto Iban\'s body. My ritual was complete, soon he would be coming to ' +
        'life. I, Kardia, had resurrected the legendary Iban, the most powerful ' +
        'evil being ever to take human form. And I alone knew that the same process ' +
        'that I had used to create him, was also capable of destroying him. But now ' +
        'I was exhausted. As I closed my eyes to sleep, I was settled by a strange ' +
        'feeling of contentment anticipation of the evil that Iban would soon ' +
        'unleash.',
    881:
        '@red@Leave this battered corpse be. For now he lives as spirit alone. Let ' +
        'his flesh rest and become one with the earth. As it is the soil that shall ' +
        'rise to protect him. Only as flesh becomes dust, as wood becomes ash... ' +
        '..will Iban\'s corpse embrace nature and finally rest'
};

const READ_ROCK_IDS = new Set([98]); // rsc obj id shared by the readable rocks

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

// falls to (738,584) with damage; only path to stage 5 at stage 4
async function failBlackAreaObstacle(player) {
    player.message('..but you slip and tumble into the darkness');
    player.teleport(738, 584);
    player.damage(Math.floor(player.skills.hits.current / 5) + 5); // 6 lowest, 25 max
    await player.say('ouch!');

    const stage = getStage(player);
    if (stage >= 4) {
        if (stage === 4) {
            player.questStages[QUEST_KEY] = 5;
        }
        // only on "first-time" fail near the recovered Koftik (stages 5, 8)
        const koftik = player.getNearbyEntitiesByID(
            'npcs',
            IDS.KOFTIK_RECOVERED,
            10
        )[0];
        if (koftik && !player.cache.advised_koftik) {
            await koftik.say('traveller is that you?.. my friend on a mission');
            await player.say("koftik, you're still here, you should leave");
            await koftik.say(
                'leave?...leave?..this is my home now',
                "home with my lord, he talks to me, he's my friend"
            );
            player.message('koftik seems to be in a weak state of mind');
            await player.say('koftik you really should leave these caverns');
            await koftik.say(
                "not now, we're all the same down here",
                "now there's just you and those dwarfs to be converted"
            );
            await player.say('dwarfs?');
            await koftik.say(
                'foolish dwarfs, still believing that they can resist',
                'no one resists iban, go traveller',
                "the dwarfs to the south, they're not safe in the south",
                "we'll show them, go slay them m'lord",
                "he'll be so proud, that's all i want"
            );
            await player.say("i'll pray for you");
            player.cache.advised_koftik = true;
        }
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    // Cave entrance
    if (gameObject.id === IDS.UNDERGROUND_CAVE) {
        const stage = getStage(player);
        switch (stage) {
            case 0:
                if (player.questStages.biohazard !== -1) {
                    player.message('You must first complete the biohazard quest...');
                    player.message('...before you can enter');
                } else {
                    player.message(
                        'you must talk to king lathas before you can enter'
                    );
                }
                break;
            case 1: {
                const koftikNpc = player.getNearbyEntitiesByID(
                    'npcs',
                    IDS.KOFTIK_ARDOUGNE,
                    10
                )[0];
                if (koftikNpc) {
                    player.engage(koftikNpc);
                    await koftik.koftikEnterCaveDialogue(player, koftikNpc);
                    player.disengage();
                }
                break;
            }
            default:
                player.message('you cautiously enter the cave');
                await world.sleepTicks(3);
                player.teleport(673, 3420);
                break;
        }
        return true;
    }

    // Crumbled rock -> descend
    if (gameObject.id === IDS.CRUMBLED_ROCK) {
        player.message('you climb the rock pile');
        await world.sleepTicks(3);
        player.teleport(713, 581);
        return true;
    }

    // Pile of mud (floor) -> old stairway
    if (gameObject.id === IDS.PILE_OF_MUD_FLOOR) {
        player.message('you climb the pile of mud');
        await world.sleepTicks(3);
        player.message('it leads to an old stair way');
        player.teleport(773, 3417);
        return true;
    }

    // Ladder -> stairs up
    if (gameObject.id === IDS.LADDER) {
        player.message('you climb the ladder');
        await world.sleepTicks(3);
        player.message('it leads to some stairs, you walk up...');
        player.teleport(782, 3549);
        return true;
    }

    // north stone step: stage 4 forces fall to stage 5, else walk to (766,585)
    if (gameObject.id === IDS.NORTH_STONE_STEP) {
        if (getStage(player) === 4) {
            await failBlackAreaObstacle(player);
        } else {
            player.message('you walk down the stone steps');
            await world.sleepTicks(3);
            player.teleport(766, 585);
        }
        return true;
    }

    // first remaining bridge: only stage-4 forced fall handled, crossing omitted
    if (gameObject.id === IDS.FIRST_REMAINING_BRIDGE) {
        if (getStage(player) !== 4) {
            return false;
        }
        player.message('you attempt to walk over the remaining bridge..');
        await world.sleepTicks(3);
        await failBlackAreaObstacle(player);
        return true;
    }

    return false;
}

void READ_ROCKS;
void READ_ROCK_IDS;

module.exports = { onGameObjectCommandOne };
