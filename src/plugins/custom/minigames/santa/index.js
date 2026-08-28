
const itemDefs = require('@2003scape/rsc-data/config/items');
const { customQuestsEnabled } = require('../../../quests/custom-gate.js');

// npc
const SANTA_ID = 821;

// base items (OpenRSC id == runtime id)
const MILK_ID = 22;
const CHEESE_ID = 319;
const CHOCOLATY_MILK_ID = 770;
const SANTAS_HAT_ID = 971;
const RESETCRYSTAL_ID = 978;
const PRESENT_ID = 980;

const BURNT_GNOMECRUNCHIE_ID = 887;
const GNOMECRUNCHIE_ID = 900;
const CHOC_CRUNCHIES_ID = 911;
const WORM_CRUNCHIES_ID = 912;
const TOAD_CRUNCHIES_ID = 913;
const SPICE_CRUNCHIES_ID = 914;
const GNOME_WAITER_CHOC_CRUNCHIES_ID = 954;
const GNOME_WAITER_WORM_CRUNCHIES_ID = 955;
const GNOME_WAITER_TOAD_CRUNCHIES_ID = 956;
const GNOME_WAITER_SPICE_CRUNCHIES_ID = 957;

// alcohol / drinks (all base)
const ALCOHOL_IDS = new Set([
    267, // ASGARNIAN_ALE
    193, // BEER
    829, // DRAGON_BITTER
    269, // DWARVEN_STOUT
    830, // GREENMANS_ALE
    598, // GROG
    268, // WIZARDS_MIND_BOMB
    876, // BRANDY
    870, // GIN
    318, // KARAMJA_RUM
    735, // KHALI_BREW
    869, // VODKA
    868, // WHISKY
    584, // DRAYNOR_WHISKY
    142, // WINE
    867, // ODD_LOOKING_COCKTAIL
    877, // BLURBERRY_SPECIAL
    875, // CHOCOLATE_SATURDAY
    872, // DRUNK_DRAGON
    866, // FRUIT_BLAST
    879, // PINEAPPLE_PUNCH
    874, // SGG
    878, // WIZARD_BLIZZARD
    938, // BLURBERRY_BARMAN_BLURBERRY_SPECIAL
    942, // BLURBERRY_BARMAN_CHOCOLATE_SATURDAY
    943, // BLURBERRY_BARMAN_DRUNK_DRAGON
    937, // BLURBERRY_BARMAN_FRUIT_BLAST
    940, // BLURBERRY_BARMAN_PINEAPPLE_PUNCH
    941, // BLURBERRY_BARMAN_SGG
    939, // BLURBERRY_BARMAN_WIZARD_BLIZZARD
    737 // POISON_CHALICE
]);

// custom items (matched by name against custom-items.json)
const GLASS_MILK_ID = 1341;
const CANE_COOKIE_ID = 1342;
const STAR_COOKIE_ID = 1343;
const TREE_COOKIE_ID = 1344;
const EAK_THE_MOUSE_ID = 1499;
const YOYO_ID = 1500;

// mice-quest state constants used by eakCanTalk
const EAK_CAN_TALK = 4;
const MICE_COMPLETED = -1;

// getCache().hasKey(key)
function hasCache(player, key) {
    return Object.prototype.hasOwnProperty.call(player.cache, key);
}

function eakCanTalk(player) {
    if (!hasCache(player, 'mice_to_meet_you')) {
        return false;
    }

    const questStage = player.cache.mice_to_meet_you;
    return questStage >= EAK_CAN_TALK || questStage === MICE_COMPLETED;
}

// santa_gives_presents config flag, default false
function santaGivesPresents(player) {
    const config =
        player.world && player.world.server ? player.world.server.config : null;
    return !!(config && config.santaGivesPresents);
}

// ==
async function talkToSanta(player, npc) {
    await npc.say('Ho Ho Ho');
    await npc.say(`Merry Xmas, ${player.username}!`);
    await player.say('Merry Christmas Santa!');

    if (!hasCache(player, 'yoyo')) {
        await player.say(
            'Do you have anything you need taken care of?',
            'Like, repairing your sleigh',
            'or helping feed your reigndeer',
            'or generally saving Christmas in some way?'
        );
        await npc.say('Ho ho, no. Everything is well and jolly this year.');

        if (player.username.toLowerCase().includes('evequill')) {
            // gender neutral
            await npc.say("Thankyou though. You've been very good this year");
        } else {
            await npc.say(
                `Thankyou though. You've been a good ${
                    player.isMale() ? 'boy' : 'girl'
                } this year`
            );
        }

        await npc.say('So I have something special for you');

        if (player.inventory.isFull()) {
            await npc.say("once you're able to carry it hohoho...");
            return;
        }

        player.cache.yoyo = new Date().getFullYear();
        player.inventory.add(YOYO_ID, 1);
        await npc.say(
            'Many years ago, I made yo-yos for all the good boys and girls in ' +
                'RuneScape 2'
        );
        await npc.say(
            "Though I would have liked to, I couldn't come back to RuneScape 1 " +
                'that year.'
        );
        await npc.say(
            "It's quite a bit later now, but I hope my yo-yos will still bring " +
                'you joy.'
        );
        // quest-colour "merry christmas!" message
        player.message(
            '@que@@red@M@whi@e@gre@r@whi@r@red@y @red@C@whi@h@gre@r@whi@i@red@' +
                's@whi@t@gre@m@whi@a@red@s@whi@!'
        );
    } else {
        const santaMulti = await player.ask(
            [
                "Are you sure you really don't need anything?",
                'Thanks for the yoyo'
            ],
            false
        );

        if (santaMulti === 0) {
            await player.say("Are you sure you really don't need anything?");
            await npc.say(
                'Well, if you really feel like doing something for me',
                "I'm a bit peckish after handing out all these yoyos",
                'I do enjoy a delicious christmas cookie, if you could.',
                'And perhaps a beverage...?'
            );
        } else if (santaMulti === 1) {
            await player.say('Thankyou for the yoyo', "It's really cool");
            await npc.say('Ho Ho Ho!');
            if (hasCache(player, 'yoyo_plays')) {
                await npc.say("That's elven enginuity for you!"); // {{sic}}
            } else {
                await npc.say(
                    'You should try Playing with it!',
                    "Then you'd really see how cool it is"
                );
            }
        }
    }
}

// ==
async function useOnSanta(player, npc, item) {
    const { world } = player;
    let presentAmount = 0;

    switch (item.id) {
        case STAR_COOKIE_ID:
        case CANE_COOKIE_ID:
        case TREE_COOKIE_ID:
            if (player.inventory.has(item.id)) {
                player.inventory.remove(item.id, 1);
                await npc.say(
                    'HO HO HO!!',
                    'These cookies are great, thankyou so much'
                );
                presentAmount = 1;
            }
            break;

        case GNOME_WAITER_CHOC_CRUNCHIES_ID:
        case GNOME_WAITER_SPICE_CRUNCHIES_ID:
        case GNOME_WAITER_TOAD_CRUNCHIES_ID:
        case GNOME_WAITER_WORM_CRUNCHIES_ID:
            if (player.inventory.has(item.id)) {
                player.inventory.remove(item.id, 1);
                await npc.say(
                    'Gnome crunchies! I love those guys',
                    "I've sometimes recruited the gnomes out there you know",
                    'A very smart people, very clever, great at making toys ' +
                        'and things',
                    'And the workshop is already built for their size! Ho Ho Ho!'
                );
                player.message(
                    'Santa enjoys the crunchie and really seems touched by ' +
                        'your christmas spirit'
                );
                presentAmount = 1;
            }
            break;

        case CHOC_CRUNCHIES_ID:
        case SPICE_CRUNCHIES_ID:
        case TOAD_CRUNCHIES_ID:
        case WORM_CRUNCHIES_ID:
        case GNOMECRUNCHIE_ID:
            if (player.inventory.has(item.id)) {
                player.inventory.remove(item.id, 1);
                await npc.say(
                    'Homemade crunchies? Gosh, you really are a good one',
                    'Straight to the top of the Nice list for you!'
                );
                player.message(
                    'Santa enjoys the crunchie and really seems touched by ' +
                        'your christmas spirit'
                );
                presentAmount = 3;
            }
            break;

        case BURNT_GNOMECRUNCHIE_ID:
            await npc.say(
                'Oh Oh Oh...',
                "Child, you've burned them.",
                'though i appreciate your effort, ... I know you can do better ' +
                    'next time...'
            );
            break;

        case CHOCOLATY_MILK_ID:
        case MILK_ID:
        case GLASS_MILK_ID:
            if (player.inventory.has(item.id)) {
                player.inventory.remove(item.id, 1);
                await npc.say(
                    'HO HO HO!!',
                    'Wonderful, thankyou.',
                    'except, I wonder if you have anything a bit... stiffer, ' +
                        'for me to drink?'
                );
                presentAmount = 1;
            }
            break;

        case 267: // ASGARNIAN_ALE
        case 193: // BEER
        case 829: // DRAGON_BITTER
        case 269: // DWARVEN_STOUT
        case 830: // GREENMANS_ALE
        case 598: // GROG
        case 268: // WIZARDS_MIND_BOMB
        case 876: // BRANDY
        case 870: // GIN
        case 318: // KARAMJA_RUM
        case 735: // KHALI_BREW
        case 869: // VODKA
        case 868: // WHISKY
        case 584: // DRAYNOR_WHISKY
        case 142: // WINE
        case 867: // ODD_LOOKING_COCKTAIL
        case 877: // BLURBERRY_SPECIAL
        case 875: // CHOCOLATE_SATURDAY
        case 872: // DRUNK_DRAGON
        case 866: // FRUIT_BLAST
        case 879: // PINEAPPLE_PUNCH
        case 874: // SGG
        case 878: // WIZARD_BLIZZARD
        case 938: // BLURBERRY_BARMAN_BLURBERRY_SPECIAL
        case 942: // BLURBERRY_BARMAN_CHOCOLATE_SATURDAY
        case 943: // BLURBERRY_BARMAN_DRUNK_DRAGON
        case 937: // BLURBERRY_BARMAN_FRUIT_BLAST
        case 940: // BLURBERRY_BARMAN_PINEAPPLE_PUNCH
        case 941: // BLURBERRY_BARMAN_SGG
        case 939: // BLURBERRY_BARMAN_WIZARD_BLIZZARD
        case 737: // POISON_CHALICE
            player.message("There is a twinkle in Santa's eye");
            await world.sleepTicks(3);
            if (player.inventory.has(item.id)) {
                player.inventory.remove(item.id, 1);
                await npc.say('Cheers!');
                player.message(
                    `Santa downs the ${drinkName(item.id)} in one big swig`
                );
                await world.sleepTicks(3);
                await npc.say('Straight to the top of the Nice list for you!');
                presentAmount = 2;
            }
            break;

        case SANTAS_HAT_ID:
            await npc.say('That looks just like the hat I lost decades ago...');
            break;

        case YOYO_ID:
            await npc.say("That's for you...!");
            if (!hasCache(player, 'yoyo_plays')) {
                await npc.say(
                    'Try right clicking it and selecting the Play option',
                    'It took my finest elves to figure out how to make it work ' +
                        'here'
                );
            }
            break;

        case RESETCRYSTAL_ID:
            await npc.say(
                'Ho ho ho... Well, time to head back to the North Pole!'
            );
            // npc.setUnregistering(true) -> remove the spawned NPC (see header).
            world.removeEntity('npcs', npc);
            break;

        case EAK_THE_MOUSE_ID:
            await npc.say('Ho ho ho!');
            if (!hasCache(player, 'eak_met_santa')) {
                await npc.say(
                    'And what a brave mouse this one is',
                    'A very good mouse indeed.'
                );
                player.message('Eak looks so proud');
                await world.sleepTicks(4);
                if (eakCanTalk(player)) {
                    player.message('@yel@Eak the Mouse: He said I\'m a good mouse');
                    await world.sleepTicks(4);
                }
                await npc.say('Such a good mouse deserves some Christmas cheese');
                player.cache.eak_met_santa = true;
                player.inventory.add(CHEESE_ID, 3);
                player.message(
                    'Eak squeaks excitedly and immediately eats some of the cheese'
                );
                await world.sleepTicks(4);
                if (eakCanTalk(player)) {
                    player.message('@yel@Eak the Mouse: Thankyou Santa');
                    await world.sleepTicks(4);
                }
                await npc.say("You're welcome, sweet Eak");
            } else {
                await npc.say('Merry Christmas Eak');
                if (eakCanTalk(player)) {
                    player.message('@yel@Eak the Mouse: Merry Christmas Santa!!');
                    await world.sleepTicks(4);
                } else {
                    player.message('@yel@Eak the Mouse: Squeak!!');
                    await world.sleepTicks(4);
                }
            }
            break;

        default:
            await npc.say("Hoohh... thankyou but I don't need that");
            break;
    }

    if (presentAmount > 0) {
        if (santaGivesPresents(player)) {
            await npc.say("Here's something extra for you this year");
            player.inventory.add(PRESENT_ID, presentAmount);
        } else {
            await npc.say('Very much appreciated');
        }
    }
}

// item name for the "santa downs the <name>" line
function drinkName(id) {
    return itemDefs[id] && itemDefs[id].name ? itemDefs[id].name : 'drink';
}

// ==

// TalkNpcTrigger -> onTalkToNPC (blockTalkNpc: npc id == SANTA).
async function onTalkToNPC(player, npc) {
    if (!customQuestsEnabled(player) || npc.id !== SANTA_ID) {
        return false;
    }

    player.engage(npc);
    await talkToSanta(player, npc);
    player.disengage();
    return true;
}

// UseNpcTrigger -> onUseWithNPC (blockUseNpc: npc id == SANTA).
async function onUseWithNPC(player, npc, item) {
    if (!customQuestsEnabled(player) || npc.id !== SANTA_ID) {
        return false;
    }

    await useOnSanta(player, npc, item);
    return true;
}

module.exports = { onTalkToNPC, onUseWithNPC };
