
const { customQuestsEnabled } = require('../../../quests/custom-gate.js');
const NPC = require('../../../../model/npc');

// quest state constants
const COMPLETED = -1;
const NOT_STARTED = 0;
const TALKED_TO_HETTY = 1;
const RECEIVED_EAK = 2;
const NEED_ASH_TO_ENCHANT = 3;
const EAK_CAN_TALK = 4;
const AGREED_TO_BRING_BETTY_INGREDIENTS = 5;
const GIVEN_BETTY_IMMORTAL_MOUSE_INGREDIENTS = 6;
const EAK_IS_IMMORTAL = 7;
const EAK_HAS_COMPLETED_RECON = 8;
const EAK_HAS_TOLD_PLAYER_RECON_INFO = 9;
const AGGIE_HAS_GIVEN_PIE = 10;
const SCARED_DEATH_WITH_EAK = 11;
const DEATH_CONSIDERS_PUMPKIN_PIE_SIDEGIG = 12;
const UNLOCKED_DEATH_ISLAND = 13;

// ids (resolved BY NAME; see header)
const EAK_THE_MOUSE_ID = 1499;

const PUMPKIN_PIE_ID = 1494;
const HALF_A_PUMPKIN_PIE_ID = 1495;
const WHITE_PUMPKIN_PIE_ID = 1497;
const HALF_A_WHITE_PUMPKIN_PIE_ID = 1498;
const PUMPKIN_ID = 422;

const COINS_ID = 10;
const BOOTS_ID = 17;
const CABBAGE_ID = 18;
const EGG_ID = 19;
const BUCKET_ID = 21;
const MILK_ID = 22;
const BUCKET_OF_WATER_ID = 50;
const SPINACH_ROLL_ID = 179;
const POT_ID = 135;
const POT_OF_FLOUR_ID = 136;
const BREAD_ID = 138;
const GRAPES_ID = 143;
const WOOL_ID = 145;
const FISH_FOOD_ID = 176;
const POISONED_FISH_FOOD_ID = 178;
const CHEESE_ID = 319;
const TINDERBOX_ID = 166;

const BRONZE_DAGGER_ID = 62;
const IRON_DAGGER_ID = 28;
const STEEL_DAGGER_ID = 63;
const MITHRIL_DAGGER_ID = 64;
const ADAMANTITE_DAGGER_ID = 65;
const RUNE_DAGGER_ID = 396;
const DRAGON_DAGGER_ID = 1452;
const DAGGER_IDS = new Set([
    BRONZE_DAGGER_ID,
    IRON_DAGGER_ID,
    STEEL_DAGGER_ID,
    MITHRIL_DAGGER_ID,
    ADAMANTITE_DAGGER_ID,
    RUNE_DAGGER_ID,
    DRAGON_DAGGER_ID
]);

const DEATH_ID = 819;
const LOAN_OFFICER_ID = 820;
const ESTER_ID = 815;
const GERTRUDE_ID = 714;
// the four rat variants used by onUseNpc
const RAT_IDS = new Set([19, 29, 47, 177]);

// Death.java coordinates (Point constants)
const DOOR_LOCATION = { x: 115, y: 532 };
const DEATH_HOUSE_MIN = { x: 114, y: 532 };
const DEATH_HOUSE_MAX = { x: 117, y: 535 };
const DEATH_ISLAND_COORDS = { x: 975, y: 169 };

// small helpers mirroring OpenRSC Functions / cache accessors
function getStage(player) {
    const value = player.cache.mice_to_meet_you;
    return typeof value === 'number' ? value : NOT_STARTED;
}

function setStage(player, value) {
    player.cache.mice_to_meet_you = value;
}

function hasMiceKey(player) {
    return player.cache.mice_to_meet_you !== undefined;
}

// eakCanTalk: questStage >= EAK_CAN_TALK or COMPLETED
function eakCanTalk(player) {
    const stage = getStage(player);
    return stage >= EAK_CAN_TALK || stage === COMPLETED;
}

// event flag defaults on
function miceEventActive(player) {
    const config =
        player.world && player.world.server ? player.world.server.config : null;
    return !config || config.miceToMeetYouEvent !== false;
}

function ifheld(player, id, amount = 1) {
    return player.inventory.has(id, amount);
}

// random(low, high) inclusive both ends
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// nearest live npc of id within range tiles, else null
function nearestNpc(player, id, range = 5) {
    const found = player.world.npcs
        .getInArea(player.x, player.y, range)
        .filter((npc) => npc.id === id);
    return found.length ? found[0] : null;
}

// spawn a transient, non-respawning npc at (x,y)
function spawnNpc(world, id, x, y) {
    const npc = new NPC(world, {
        id,
        x,
        y,
        minX: x,
        maxX: x,
        minY: y,
        maxY: y
    });
    delete npc.respawn;
    world.addEntity('npcs', npc);
    return npc;
}

function inDeathHouse(entity) {
    return (
        entity.x >= DEATH_HOUSE_MIN.x &&
        entity.y >= DEATH_HOUSE_MIN.y &&
        entity.x <= DEATH_HOUSE_MAX.x &&
        entity.y <= DEATH_HOUSE_MAX.y
    );
}

// talk to the Eak item
async function talkToEak(player) {
    const { world } = player;

    if (miceEventActive(player) && hasMiceKey(player)) {
        const questStage = getStage(player);
        if (eakCanTalk(player)) {
            switch (questStage) {
                case EAK_CAN_TALK:
                    player.message(
                        '@yel@Eak the Mouse: We should go talk to Betty in ' +
                            'Port Sarim'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: Hopefully she can help me get " +
                            "into Death's house"
                    );
                    break;
                case AGREED_TO_BRING_BETTY_INGREDIENTS:
                    player.message(
                        '@yel@Eak the Mouse: We need to find those items for ' +
                            'Betty'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: She needs 10 body runes, an eye ' +
                            'of a newt'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: And you need to be wearing a ' +
                            'wizard hat'
                    );
                    break;
                case GIVEN_BETTY_IMMORTAL_MOUSE_INGREDIENTS:
                    player.message(
                        "@yel@Eak the Mouse: It's very strange that Betty " +
                            "didn't even use the stuff you got her"
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: We still need to learn the spell ' +
                            'from her though'
                    );
                    break;
                case EAK_IS_IMMORTAL:
                    await player.say('How do you feel Eak?');
                    player.message('@yel@Eak the Mouse: I feel so strong and vibrant');
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: I am ... among the immortals now...'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: I can't feel any pain that I " +
                            "don't allow myself to feel..."
                    );
                    await world.sleepTicks(5);
                    await player.say('wow');
                    player.message("@yel@Eak the Mouse: Let's go back to Varrock");
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: I should be able to sneak into " +
                            "Death's house now"
                    );
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: Just take me to his front door, " +
                            "and I'll do the rest"
                    );
                    break;
                case EAK_HAS_COMPLETED_RECON:
                case EAK_HAS_TOLD_PLAYER_RECON_INFO: {
                    const option = await player.ask(
                        [
                            'What did you see in the house?',
                            'What was that shriek?',
                            'Nevermind'
                        ],
                        false
                    );
                    if (option === 1) {
                        await player.say('What was that shriek?');
                        player.message('Eak starts to giggle');
                        await world.sleepTicks(5);
                        player.message(
                            '@yel@Eak the Mouse: Believe it or not, that was ' +
                                'Death!'
                        );
                        await world.sleepTicks(5);
                        player.message(
                            'Eak is laughing so hard, they almost roll out of ' +
                                'your hand'
                        );
                        return;
                    } else if (option === 2) {
                        await player.say('Nevermind');
                        return;
                    }
                    await player.say('what did you see in the house?');
                    player.message(
                        '@yel@Eak the Mouse: I saw a couple of things in there'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: First thing I noticed is that it " +
                            "wasn't very big"
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: I also saw there were a ton of ' +
                            'pumpkins all over the floor'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: Lastly, I saw a ton of bills past ' +
                            'due'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: If you ask me, it looks like ' +
                            'Death is hurting for money'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: That's why he's moved into the " +
                            "slums"
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: We should go talk to Aggie like ' +
                            'Betty said'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: Maybe she'll have an idea on how " +
                            "to get rid of him"
                    );
                    await world.sleepTicks(5);
                    player.message('Eak looks sad');
                    await world.sleepTicks(3);
                    player.message('@yel@Eak the Mouse: I miss my rodent friends');
                    setStage(player, EAK_HAS_TOLD_PLAYER_RECON_INFO);
                    break;
                }
                case AGGIE_HAS_GIVEN_PIE:
                case SCARED_DEATH_WITH_EAK:
                    if (ifheld(player, PUMPKIN_PIE_ID, 1)) {
                        player.message(
                            "@yel@Eak the Mouse: Let's get this pie over to " +
                                "Death!"
                        );
                    } else {
                        player.message(
                            '@yel@Eak the Mouse: ' +
                                player.username +
                                "... You didn't eat the pie, did you?"
                        );
                        await world.sleepTicks(4);
                        player.message(
                            '@yel@Eak the Mouse: Now we have to go back to ' +
                                'Aggie to get another one'
                        );
                    }
                    break;
                case DEATH_CONSIDERS_PUMPKIN_PIE_SIDEGIG:
                    player.message(
                        "@yel@Eak the Mouse: Let's talk to Death and see if " +
                            "he's made up his mind"
                    );
                    break;
                case UNLOCKED_DEATH_ISLAND:
                    player.message(
                        "@yel@Eak the Mouse: Let's visit Death on his island"
                    );
                    await world.sleepTicks(4);
                    player.message(
                        "@yel@Eak the Mouse: We need to find out if he's " +
                            "stopped killing rodents"
                    );
                    break;
                case COMPLETED:
                    player.message(
                        "@yel@Eak the Mouse: That's great we were able to help " +
                            "Death"
                    );
                    await world.sleepTicks(4);
                    player.message(
                        "@yel@Eak the Mouse: I can't wait for all the other " +
                            "rodents to return"
                    );
                    break;
                default:
                    break;
            }
        } else {
            player.message('@yel@Eak the Mouse: Squeak!');
        }
    } else {
        // dialog for Eak after the event, dormant by default
        if (hasMiceKey(player)) {
            if (eakCanTalk(player)) {
                const currentTime = Math.floor(Date.now() / 1000);
                if (currentTime < 1641600000) {
                    // Jan 8th 2022
                    await player.say('Merry Christmas Eak!');
                    player.message(
                        '@yel@Eak the Mouse: Merry Christmas ' +
                            player.username +
                            '!'
                    );
                    await world.sleepTicks(3);
                    const menu = await player.ask(
                        [
                            'Are you excited that your mouse friends are back?',
                            'Are you excited that Santa is here?'
                        ],
                        false
                    );
                    if (menu === 0) {
                        await player.say(
                            'Are you excited that your mouse friends are back?'
                        );
                        player.message(
                            "@yel@Eak the Mouse: I'm so relieved to have my " +
                                "friends back, honestly I am"
                        );
                        await world.sleepTicks(5);
                        player.message(
                            '@yel@Eak the Mouse: All that paperwork Death had ' +
                                'to put through'
                        );
                        await world.sleepTicks(5);
                        player.message(
                            '@yel@Eak the Mouse: took a REALLY long time to be ' +
                                'processed...!'
                        );
                        await world.sleepTicks(3);
                    } else if (menu === 1) {
                        await player.say('Are you excited that Santa is here?');
                        player.message('@yel@Eak the Mouse: Yes!!');
                        await world.sleepTicks(5);
                        if (player.cache.eak_met_santa === undefined) {
                            player.message(
                                '@yel@Eak the Mouse: I would love to meet Santa'
                            );
                            await world.sleepTicks(5);
                        } else {
                            player.message(
                                "@yel@Eak the Mouse: He said I'm a good mouse"
                            );
                            await world.sleepTicks(5);
                            player.message('Eak beams');
                            await world.sleepTicks(5);
                            player.message(
                                '@yel@Eak the Mouse: And that cheese was my ' +
                                    'favourite'
                            );
                            await world.sleepTicks(5);
                            player.message(
                                '@yel@Eak the Mouse: Christmas is MUCH better ' +
                                    'than Halloween'
                            );
                            await world.sleepTicks(5);
                        }
                    }
                } else {
                    // After Jan 8 2022
                    player.message(
                        '@yel@Eak the Mouse: I could really go for a Pumpkin ' +
                            'pie right now'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: Maybe with some cheese on the ' +
                            'side...?'
                    );
                    await world.sleepTicks(5);
                    await player.say("I'll see about that, Eak");
                }
            } else {
                player.message('@yel@Eak the Mouse: Squeak!');
            }
        } else {
            player.message('@yel@Eak the Mouse: Squeak!');
        }
    }
}

// Eak item used on another inventory item
async function eakUsedOnItem(player, other) {
    const { world } = player;
    const username = player.username;

    switch (other.id) {
        case COINS_ID:
            player.message(
                'Eak the Mouse: Oh come now ' +
                    username +
                    ', ... you don\'t have to pay me to be your friend!!'
            );
            break;
        case BOOTS_ID:
            player.message('Eak crawls into the boot.');
            await world.sleepTicks(3);
            player.message('They look really happy inside');
            break;
        case CABBAGE_ID:
            player.message(
                "Eak the Mouse: Gross! You really shouldn't pick that stuff " +
                    "you know."
            );
            break;
        case EGG_ID:
            player.message(
                'Eak the Mouse: Thankyou ' +
                    username +
                    ', I will keep it warm and maybe it will hatch.'
            );
            await world.sleepTicks(3);
            player.message('Eak wraps their body around the egg.');
            break;
        case BUCKET_ID:
            player.message('Eak jumps into the bucket.');
            await world.sleepTicks(3);
            player.message('They look really happy inside');
            break;
        case MILK_ID:
            player.message('Eak dives into the milk.');
            await world.sleepTicks(3);
            player.message('Eak the Mouse: Wonderful, a Milk bath. @cya@:-)');
            await world.sleepTicks(3);
            player.message('Eak the Mouse: Aahh, I feel so refreshed.');
            await world.sleepTicks(3);
            player.message(
                'Eak the Mouse: Uhm, hopefully you can still use the milk haha.'
            );
            break;
        case BUCKET_OF_WATER_ID:
            player.message('Eak dives into the bucket.');
            await world.sleepTicks(3);
            player.message('Eak the Mouse: I needed a bath, thanks!');
            await world.sleepTicks(3);
            player.message(
                'Eak the Mouse: Uhm, hopefully you can still use the water haha.'
            );
            break;
        case SPINACH_ROLL_ID: {
            player.message("Eak the Mouse: Woah, where'd you get this?");
            await world.sleepTicks(3);
            player.message('Eak the Mouse: It looks super rare');
            await world.sleepTicks(3);
            player.message(
                '@yel@' + username + ": It's actually not that rare"
            );
            await world.sleepTicks(3);
            player.message('Eak the Mouse: Could I try a bite?');
            const spinachRollForEak = await player.ask(
                ['Sure', 'Ehmm... well, maybe it *is* kiiind of rare...'],
                false
            );
            if (spinachRollForEak === 0) {
                player.message('@yel@' + username + ': Sure');
                await world.sleepTicks(3);
                if (player.inventory.has(SPINACH_ROLL_ID)) {
                    player.inventory.remove(SPINACH_ROLL_ID);
                    player.message('Eak eats the Spinach Roll...');
                    await world.sleepTicks(3);
                    player.message('Eak the Mouse: Wow, I feel so strong!!');
                    await world.sleepTicks(3);
                    player.message('Eak the Mouse: Thankyou ' + username + '!');
                    await world.sleepTicks(3);
                    player.message(
                        "Eak the Mouse: It's a little weird tasting, but I " +
                            "feel so vibrant and healthy now"
                    );
                    break;
                }
                player.message(
                    '@yel@' +
                        username +
                        ': ...errr, is what I WOULD have said... but somehow ' +
                        'my spinach roll went missing.'
                );
                await world.sleepTicks(3);
                player.message('Eak the Mouse: Why did this happen!!!');
            } else {
                player.message(
                    '@yel@' +
                        username +
                        ': Ehmm... well, maybe it *is* kiiind of rare...'
                );
                await world.sleepTicks(3);
                player.message('Eak the Mouse: I knew it!!');
            }
            break;
        }
        case POT_ID:
            player.message('Eak jumps into the pot.');
            await world.sleepTicks(3);
            player.message('They look really happy inside');
            break;
        case POT_OF_FLOUR_ID:
            player.message('Eak jumps into the pot of flour.');
            await world.sleepTicks(3);
            player.message('Eak hops out and runs around in circles around you');
            await world.sleepTicks(3);
            player.message("Eak the Mouse: Look, I'm leaving paw prints!!");
            await world.sleepTicks(3);
            player.message('@yel@' + username + ': Very cool, Eak');
            break;
        case BREAD_ID:
            player.message('Eak takes a small nibble of the bread.');
            await world.sleepTicks(3);
            player.message('Eak the Mouse: I always liked this stuff, thankyou.');
            break;
        case GRAPES_ID:
            if (player.cache.eak_eaten_grapes !== undefined) {
                // Player has given Eak Grapes before
                player.message('Eak takes a grape off the bunch and bites in');
                await world.sleepTicks(3);
                switch (random(0, 5)) {
                    case 0:
                        player.message(
                            'Eak the Mouse: This grape is grape. I mean grape. ' +
                                'I mean Great.'
                        );
                        await world.sleepTicks(3);
                        player.message(
                            'Eak the Mouse: The grape is great. Uhmm, thanks'
                        );
                        break;
                    case 1:
                        player.message(
                            'Eak the Mouse: I grapely appreciate this, thankyou'
                        );
                        break;
                    case 3:
                    case 4:
                        player.message(
                            'Eak the Mouse: I feel lucky that we are friends. ' +
                                'Thank you.'
                        );
                        break;
                    case 2:
                    default:
                        player.message(
                            'Eak the Mouse: I like grapes a lot. thankyou.'
                        );
                        break;
                }
            } else {
                // Eak has never had grapes!
                player.message('Eak sniffs the grapes');
                await world.sleepTicks(3);
                player.message(
                    "Eak the Mouse: Is this food? it doesn't really smell like " +
                        "anything."
                );
                await world.sleepTicks(3);
                player.message(
                    '@yel@' +
                        username +
                        ": They're grapes! You have to bite through the skin, " +
                        "then it's really sweet"
                );
                await world.sleepTicks(3);
                player.message('Eak the Mouse: Okay...');
                await world.sleepTicks(3);
                player.cache.eak_eaten_grapes = true;
                player.message(
                    'Eak holds one of the grapes with their paws and bites in'
                );
                await world.sleepTicks(3);
                player.message("Eak the Mouse: Oh!!! it's actually really good!!");
                await world.sleepTicks(3);
                player.message(
                    'Eak the Mouse: Yes. I like grapes. Thankyou for sharing.'
                );
            }
            break;
        case WOOL_ID:
            player.message(
                'Eak the Mouse: This could make for some lovely bedding. ' +
                    'Thankyou'
            );
            break;
        case FISH_FOOD_ID:
        case POISONED_FISH_FOOD_ID:
            player.message(
                "Eak the Mouse: Uhm, I'm not a fish so I think I don't need " +
                    "this..."
            );
            break;
        case CHEESE_ID: {
            player.message('Eak is super stoked');
            await world.sleepTicks(3);
            player.message('Eak the Mouse: A cheese? For me?');
            await world.sleepTicks(2);
            const cheeseForEak = await player.ask(
                ['Yes Eak, cheese for you.', 'My mistake, i need that cheese'],
                false
            );
            if (cheeseForEak === 0) {
                player.message('@yel@' + username + ': Yes Eak, cheese for you.');
                await world.sleepTicks(3);
                player.message(
                    'Eak squeaks excitedly and their eyes are filled with joy'
                );
                await world.sleepTicks(3);
                if (player.inventory.has(CHEESE_ID)) {
                    player.inventory.remove(CHEESE_ID);
                    player.message('They eat the entire cheese in one bite');
                    await world.sleepTicks(3);
                    player.message(
                        "Eak the Mouse: What?... isn't that how you eat too?"
                    );
                    break;
                }
                player.message(
                    '@yel@' +
                        username +
                        ': uhm, actually... where did my cheese go... oh no...'
                );
                await world.sleepTicks(3);
                player.message('Eak the Mouse: Why did this happen!!!');
            } else {
                player.message(
                    '@yel@' + username + ': My mistake, i need that cheese'
                );
                await world.sleepTicks(3);
                player.message('Eak the Mouse: oh... ok...');
            }
            break;
        }
        case TINDERBOX_ID:
            player.message(
                'Eak the Mouse: I think you should put me down before you try ' +
                    'to light me on fire.'
            );
            await world.sleepTicks(3);
            player.message('@yel@' + username + ': What? I would never?');
            await world.sleepTicks(3);
            player.message(
                "Eak the Mouse: Well I don't know what else you'd put that " +
                    "thing near me for."
            );
            await world.sleepTicks(3);
            player.message("Eak the Mouse: I certainly don't want to live in it.");
            break;
        case PUMPKIN_PIE_ID:
        case HALF_A_PUMPKIN_PIE_ID:
            player.message('Eak jumps into the pie');
            await world.sleepTicks(3);
            player.message('and eats a little bit');
            await world.sleepTicks(3);
            player.message("Eak the Mouse: This is actually really good stuff!");
            break;
        case WHITE_PUMPKIN_PIE_ID:
        case HALF_A_WHITE_PUMPKIN_PIE_ID:
            player.message('Eak jumps into the pie');
            await world.sleepTicks(3);
            player.message('and eats a little bit');
            await world.sleepTicks(3);
            player.message(
                'Eak the Mouse: It\'s just as tasty as orange pumpkin pie'
            );
            await world.sleepTicks(3);
            player.message(
                'Eak the Mouse: but a bit less appetizing looking...!!'
            );
            break;
        default:
            if (DAGGER_IDS.has(other.id)) {
                player.message('You give Eak the Dagger');
                await world.sleepTicks(3);
                player.message(
                    'They hold it in their mouth and give you a fierce look'
                );
                await world.sleepTicks(3);
                player.message(
                    'It looks like Eak is ready to mess up some bad guys!'
                );
            } else {
                player.message(
                    'Eak the Mouse: wow thanks, but i have no idea what to do ' +
                        'with this.'
                );
            }
    }
}

// Eak item used on Gertrude / a rat / Ester
async function eakUsedOnNpc(player, npc) {
    const { world } = player;

    if (npc.id === GERTRUDE_ID) {
        await npc.say('AAAAAAAAAAAAAAAAAAAAAA');
        await world.sleepTicks(3);
        player.message('Both Gertrude and Eak are very startled');
    } else if (RAT_IDS.has(npc.id)) {
        if (player.cache.restore_friends_sidequest !== undefined) {
            const questState = player.cache.restore_friends_sidequest;
            switch (questState) {
                case 1:
                case 2:
                    // Eak found friends
                    player.message('@yel@Eak the Mouse: squeak!!!');
                    await world.sleepTicks(4);
                    player.message('Eak jumps out to embrace their lost friend');
                    await world.sleepTicks(4);
                    player.message(
                        'the mice are nuzzling each other affectionately'
                    );
                    await world.sleepTicks(6);
                    player.message('after a while, Eak returns to you');
                    await world.sleepTicks(4);
                    player.message("@yel@Eak the Mouse: I'm so glad they're okay");
                    await world.sleepTicks(4);
                    await player.say('Me too, Eak');
                    player.cache.restore_friends_sidequest = 3;
                    break;
                case 3:
                    // Eak found friends previously
                    player.message(
                        'Eak and their friend engage in an exchange of high ' +
                            "pitched squeaks you can't understand."
                    );
                    await world.sleepTicks(4);
                    player.message(
                        'They seem really excited to be talking to each other'
                    );
                    break;
                case 0:
                default:
                    player.cache.found_friends_no_sidequest = true;
                    break;
            }
        } else {
            player.message(
                'Eak and their friend engage in an exchange of high pitched ' +
                    "squeaks you can't understand."
            );
            await world.sleepTicks(4);
            player.message(
                'They seem really excited to be talking to each other'
            );
            player.cache.found_friends_no_sidequest = true;
        }
    } else if (npc.id === ESTER_ID) {
        if (player.cache.restore_friends_sidequest !== undefined) {
            const questState = player.cache.restore_friends_sidequest;
            switch (questState) {
                case 1:
                    await npc.say(
                        'Have you talked to Death about your friends yet?'
                    );
                    player.message('@yel@Eak the Mouse: Yes!');
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: He says they should be back soon'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: and it just takes time for ' +
                            'paperwork to go through...'
                    );
                    await world.sleepTicks(5);
                    if (!miceEventActive(player)) {
                        player.message(
                            "@yel@Eak the Mouse: It's been a while since then. " +
                                "I wonder if there's been any movement on that " +
                                "paperwork...?"
                        );
                    }
                    return;
                case 2:
                    await npc.say(
                        'Have you talked to Death about your friends yet?'
                    );
                    player.message('@yel@Eak the Mouse: Yes!');
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: He says they should be back and I ' +
                            'had ought to go looking for them'
                    );
                    await world.sleepTicks(5);
                    await npc.say('Well I hope you find them soon then');
                    return;
                case 3:
                    await npc.say(
                        'Have you talked to Death about your friends yet?'
                    );
                    player.message('@yel@Eak the Mouse: Yes!');
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: And there was paperwork involved ' +
                            'and time and waiting'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        "@yel@Eak the Mouse: But they're back and I'm so glad."
                    );
                    return;
                case 0:
                default:
                    await npc.say(
                        'Have you talked to Death about your friends yet?'
                    );
                    player.message('@yel@Eak the Mouse: not yet');
                    return;
            }
        } else {
            await npc.say('what a cute mousey');
            await npc.say('do you have any wisdom, o mousey?');

            if (eakCanTalk(player)) {
                player.message(
                    '@yel@Eak the Mouse: After all my rat and mouse friends ' +
                        'were killed'
                );
                await world.sleepTicks(4);
                player.message(
                    '@yel@Eak the Mouse: It took me quite a while to rebuild ' +
                        'my sanity again'
                );
                await world.sleepTicks(4);
                player.message('@yel@Eak the Mouse: You can be going along in life');
                await world.sleepTicks(4);
                player.message(
                    '@yel@Eak the Mouse: and then something can come along and ' +
                        'just kind of destroy you'
                );
                await world.sleepTicks(4);
                player.message('@yel@Eak the Mouse: shatter your very foundation.');
                await world.sleepTicks(4);
                player.message(
                    "@yel@Eak the Mouse: And it's through no fault of your " +
                        "own, but life has a habit of doing that."
                );
                await world.sleepTicks(4);
                player.message(
                    '@yel@Eak the Mouse: But the other thing I can share is ' +
                        'that,'
                );
                await world.sleepTicks(4);
                player.message(
                    '@yel@Eak the Mouse: you can recover from that. There is a ' +
                        'tomorrow.'
                );
                await world.sleepTicks(7);
                await npc.say('That is a really heavy and deep wisdom.');
                if (player.cache.found_friends_no_sidequest === undefined) {
                    if (
                        getStage(player) === UNLOCKED_DEATH_ISLAND ||
                        getStage(player) === COMPLETED
                    ) {
                        await npc.say(
                            'I bet if you talk to death, he could restore your ' +
                                'friends'
                        );
                        player.message(
                            '@yel@Eak the Mouse: I may try that, thankyou'
                        );
                        player.cache.restore_friends_sidequest = 0;
                    }
                } else {
                    await npc.say(
                        'The healing process was undoubtedly aided by the ' +
                            'return of your friends'
                    );
                    player.message('@yel@Eak the Mouse: Undoubtedly.');
                    await world.sleepTicks(4);
                    player.message(
                        "@yel@Eak the Mouse: But they're back and I'm so glad."
                    );
                }
            } else {
                player.message('@yel@Eak the Mouse: squeak');
            }
        }
    }
}

// tinderbox used on the dropped Eak ground item
async function tinderboxOnDroppedEak(player, groundItem) {
    const { world } = player;

    player.message('Are you sure you want to do that?');
    const lastChanceToNotBeTerrible = await player.ask(
        ['Yes', "omg no of course i don't jeez what was I thinking"],
        false
    );
    if (lastChanceToNotBeTerrible === 0) {
        player.sendBubble(TINDERBOX_ID);
        player.message('You attempt to light Eak the Mouse on fire');
        await world.sleepTicks(3);
        player.message(
            'Eak is very upset, but manages to run away when they see what ' +
                "you're doing"
        );
        await world.sleepTicks(3);
        player.cache.terrible_person_burn_eak = true;
        player.message('You are a terrible person.');
        world.removeEntity('groundItems', groundItem); // Eak runs away safely
    } else {
        if (eakCanTalk(player)) {
            player.message(
                "Eak the Mouse: Hey!! I'm down here!! you accidentally " +
                    "dropped me!"
            );
            await world.sleepTicks(3);
            player.message(
                'Eak the Mouse: ... stop looking at me weird and pick me up!!'
            );
        } else {
            player.message('Eak looks up at you concerned');
            await world.sleepTicks(3);
            player.message('@yel@Eak the Mouse: squeak...!');
        }
    }
}

// talk to Death, Varrock vs Island
async function deathDialogue(player, npc) {
    const { world } = player;
    // no player death counter, uses deaths = 0
    const deaths = 0;
    const questStage = getStage(player);

    if (inDeathHouse(npc)) {
        // This is the Varrock Death
        if (
            miceEventActive(player) &&
            questStage >= AGGIE_HAS_GIVEN_PIE &&
            questStage < UNLOCKED_DEATH_ISLAND
        ) {
            if (!ifheld(player, EAK_THE_MOUSE_ID, 1)) {
                player.message('Oh no! You seem to have lost Eak!');
                await world.sleepTicks(3);
                player.message('Maybe you should go back to Hetty');
                player.message('And see if she knows where to find them');
                return;
            }

            if (questStage === DEATH_CONSIDERS_PUMPKIN_PIE_SIDEGIG) {
                player.message(
                    '@yel@Eak the Mouse: Have you thought about it enough?'
                );
                await world.sleepTicks(5);
                await npc.say(
                    'Yes I have',
                    "I think I'm going to do it",
                    'In fact, I will take out the loan right now'
                );
                // setcoord(DOOR_LOCATION); addnpc(LOAN_OFFICER); ifnearnpc(...)
                const loanOfficer = spawnNpc(
                    world,
                    LOAN_OFFICER_ID,
                    DOOR_LOCATION.x,
                    DOOR_LOCATION.y
                );
                await loanOfficer.say(
                    'Hello sir',
                    'I hear you wanted to apply for a loan'
                );
                await npc.say('Yes', 'And YOU WILL GIVE ME THE LOAN');
                await loanOfficer.say(
                    'But of course, sir',
                    'Just sign these forms'
                );
                await world.sleepTicks(5);
                world.removeEntity('npcs', loanOfficer); // delnpc()
                await npc.say("Well, looks like I've...", 'Bought the farm!');
                player.message('@yel@Eak the Mouse: That was fast');
                await world.sleepTicks(5);
                player.message('@yel@Eak the Mouse: Congratulations');
                await world.sleepTicks(5);
                await npc.say('Yes', 'Let me take you there to show you around');
                setStage(player, UNLOCKED_DEATH_ISLAND);
                player.teleport(DEATH_ISLAND_COORDS.x, DEATH_ISLAND_COORDS.y);
                return;
            }

            await npc.say('Hello, human', 'Why have you entered my home?');
            const option = await player.ask(
                [
                    'Why are you in Varrock?',
                    'Why are you killing all the rodents?',
                    'We have a suggestion for you',
                    'Just looking around'
                ],
                false
            );
            if (option === 3) {
                return;
            }
            if (questStage === AGGIE_HAS_GIVEN_PIE) {
                await npc.say(
                    'I do not care what you have to say',
                    'You are an insect to me',
                    'Now leave, before I smite you'
                );
                player.message("@yel@Eak the Mouse: Well that's not very nice");
                await world.sleepTicks(5);
                await npc.say('What is that?!');
                await player.say('This is Eak the Mouse');
                await npc.say(
                    'How are they still alive in my presence!',
                    'Keep them away from me!'
                );
                player.message('Despite having a skeletal face...');
                await world.sleepTicks(5);
                player.message('You can tell that Death is frightened of Eak');
                await world.sleepTicks(5);
                await npc.say(
                    'Keep them away from me',
                    'And I will answer your questions'
                );
                setStage(player, SCARED_DEATH_WITH_EAK);
                return;
            } else if (questStage === SCARED_DEATH_WITH_EAK) {
                if (option === 0) {
                    await npc.say(
                        'If you must know',
                        'I ran into some financial troubles',
                        "People just aren't dying as much as they used to",
                        "So I don't bring home as much money"
                    );
                    if (deaths === 0) {
                        await npc.say(
                            "You've been so rude as to never die at all, for " +
                                "example"
                        );
                    } else if (deaths === 1) {
                        await npc.say(
                            "You've been so rude as to only die once, for " +
                                "example"
                        );
                    } else if (deaths >= 10) {
                        await npc.say(
                            "You've been an exception, dying an amazing " +
                                deaths +
                                ' times.'
                        );
                        await npc.say(
                            "Thanks for that, but it still wasn't enough"
                        );
                    } else {
                        await npc.say(
                            "You've only died " + deaths + ' times, for example'
                        );
                    }
                    await npc.say(
                        "Anyway, I couldn't keep up on my property taxes",
                        'And my parents kicked me out of their house',
                        "They think I'm too lazy",
                        "So I had to move here because it's all I could afford"
                    );
                    return;
                } else if (option === 1) {
                    await npc.say(
                        'Rodents disgust me',
                        'They are sooo creepy!',
                        'I cannot stand the way they scurry around the place',
                        "It's unbefitting of a guardian of Guthix to live " +
                            'among rodents',
                        'So I just decided to just get rid of them all',
                        "I'm surprised that your little friend is able to " +
                            'survive',
                        "I assume you've been to see the witches."
                    );
                    return;
                } else if (option === 2) {
                    await npc.say('What do you mean?');
                    player.message(
                        '@yel@Eak the Mouse: We think we have a way for you to ' +
                            'get out of poverty'
                    );
                    await world.sleepTicks(5);
                    if (!ifheld(player, PUMPKIN_PIE_ID, 1)) {
                        player.message(
                            '@yel@Eak the Mouse: But it seems like ' +
                                player.username +
                                ' has eaten it'
                        );
                        await world.sleepTicks(5);
                        player.message('@yel@Eak the Mouse: ...');
                        await world.sleepTicks(3);
                        player.message('Eak sighs');
                        await world.sleepTicks(5);
                        player.message("@yel@Eak the Mouse: We'll be back");
                        return;
                    }
                    player.message('@yel@Eak the Mouse: When I was in here earlier-');
                    await world.sleepTicks(5);
                    await npc.say('You were the one that was in my house earlier?');
                    player.message(
                        'If Death had a face, he would probably look disgusted'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: As I was saying, I noticed that ' +
                            'you had a lot of worthless pumpkins'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: Just lying around, collecting dust'
                    );
                    await world.sleepTicks(5);
                    await npc.say("They're my only possessions");
                    player.message('@yel@Eak the Mouse: Right...');
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: What if you take those pumpkins...'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        'Eak nudges you and you give the pumpkin pie to Death'
                    );
                    player.inventory.remove(PUMPKIN_PIE_ID, 1);
                    await world.sleepTicks(5);
                    player.message('@yel@Eak the Mouse: And turned them into pies!');
                    await world.sleepTicks(5);
                    player.message('Death takes the pie and tastes it');
                    await world.sleepTicks(5);
                    await npc.say(
                        'This is',
                        'AMAZING!!!',
                        'I could sell tons of these',
                        'How do you make them?'
                    );
                    player.message(
                        "@yel@Eak the Mouse: Well first, what's your cooking " +
                            'level?'
                    );
                    await world.sleepTicks(5);
                    await npc.say('51');
                    player.message('@yel@Eak the Mouse: Nice');
                    await player.say('Nice');
                    await npc.say('Thankyou');
                    player.message(
                        '@yel@Eak the Mouse: Alright then, all you need is a ' +
                            'pie crust,'
                    );
                    await world.sleepTicks(5);
                    player.message('@yel@Eak the Mouse: An egg, some milk');
                    await world.sleepTicks(5);
                    player.message('@yel@Eak the Mouse: And of course a pumpkin');
                    await world.sleepTicks(5);
                    await npc.say('Uh oh');
                    player.message("@yel@Eak the Mouse: What's wrong?");
                    await world.sleepTicks(5);
                    await npc.say(
                        "I don't have any eggs or milk",
                        "Like I said, these pumpkins are all I've got"
                    );
                    player.message('Eak thinks for a moment');
                    await world.sleepTicks(5);
                    player.message("@yel@Eak the Mouse: Why don't you buy a farm!");
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: You can take out a loan from the ' +
                            'bank to afford it'
                    );
                    await world.sleepTicks(5);
                    player.message(
                        '@yel@Eak the Mouse: It would be a great investment'
                    );
                    await world.sleepTicks(5);
                    await npc.say('I need a moment to think about this...');
                    setStage(player, DEATH_CONSIDERS_PUMPKIN_PIE_SIDEGIG);
                    return;
                }
            }
        }

        // Default dialog when event isn't running/quest complete
        await npc.say('Hello', "Don't touch any of my things");

        // Death isn't interested in saying more until the quest is done
        if (questStage === COMPLETED || questStage === UNLOCKED_DEATH_ISLAND) {
            const option = await player.ask(
                [
                    'What are you still doing here?',
                    'Could you please take me to your farm?'
                ],
                false
            );
            if (option === 0) {
                await npc.say(
                    "I'm just packing up the rest of my things",
                    "It shouldn't take long",
                    "As you can see, I don't have very many things"
                );
            } else if (option === 1) {
                await npc.say('Alright then');
                player.message('Death makes a swishing movement with his scythe');
                await world.sleepTicks(5);
                player.teleport(DEATH_ISLAND_COORDS.x, DEATH_ISLAND_COORDS.y);
            }
        }
    } else {
        // This should be the code for Death Island Death
        if (questStage === UNLOCKED_DEATH_ISLAND) {
            await npc.say(
                'Hello',
                'Thanks for suggesting I open this business',
                'This is great'
            );
            const option = await player.ask(
                ['This is a nice place', 'What about the mice?', 'Goodbye'],
                false
            );
            if (option === 2) {
                return;
            } else if (option === 0) {
                await npc.say(
                    'Thank you',
                    "Don't know what I'd be doing without you and Eak",
                    'probably still slumming in Varrock',
                    'Who knew pumpkin pies would be so lucrative?'
                );
                return;
            } else if (option === 1) {
                await npc.say(
                    'Even though you still might see me in Varrock from time ' +
                        'to time',
                    "I'll just be grabbing my things that I still need to move " +
                        'over here',
                    "But yes, I've stopped killing all the rodents",
                    "They'll probably start showing up again pretty soon",
                    'By the way, I want you to take these pies for having ' +
                        'helped me'
                );
                player.message('Death hands you two freshly-baked Pumpkin pies');
                player.inventory.add(PUMPKIN_PIE_ID, 2);
                await world.sleepTicks(5);
                player.message('They smell great');
                await world.sleepTicks(5);
                player.message('You have completed the Mice to Meet You miniquest');
                setStage(player, COMPLETED);
                return;
            }
        }

        // This should be for Death on death island after the quest
        await npc.say('Hello, welcome to my farm', 'What can I help you with?');
        if (player.cache.restore_friends_sidequest !== undefined) {
            switch (player.cache.restore_friends_sidequest) {
                case 0:
                    player.message(
                        '@yel@Eak the Mouse: Actually I wanted to talk more ' +
                            'about my friends you killed?'
                    );
                    await world.sleepTicks(5);
                    if (miceEventActive(player)) {
                        await npc.say(
                            "I see. I'll return them to life soon. These " +
                                'things take time.'
                        );
                        await npc.say(
                            "There's no special power I used to kill them"
                        );
                        await npc.say(
                            'But un-killing them is a lot of paperwork'
                        );
                        player.cache.restore_friends_sidequest = 1;
                        player.message(
                            "@yel@Eak the Mouse: I'm sincerely looking forward " +
                                'to the return of my friends'
                        );
                    } else {
                        await npc.say(
                            'Sure. I put in the paperwork to undo my ... ' +
                                'extraneous rodent genocide...'
                        );
                        await npc.say(
                            "and it's been some time since then, so it should " +
                                'have gone through by now.'
                        );
                        await npc.say('You might have to just go looking for them');
                        player.cache.restore_friends_sidequest = 2;
                    }
                    return;
                case 1:
                    player.message(
                        '@yel@Eak the Mouse: has there been any movement on ' +
                            'the paper work?'
                    );
                    if (miceEventActive(player)) {
                        await npc.say('No. not yet. Anything else I can help with?');
                    } else {
                        await npc.say(
                            'Yes actually, it should have gone through by now.'
                        );
                        await npc.say('You might have to just go looking for them');
                        player.cache.restore_friends_sidequest = 2;
                    }
                    break;
                default:
                    break;
            }
        }

        const option = await player.ask(
            [
                'How has business been?',
                "I'd like to buy a pumpkin pie please",
                'Goodbye'
            ],
            false
        );
        if (option === 2) {
            return;
        } else if (option === 0) {
            await npc.say(
                'It has been going very well',
                'Thank you for asking',
                'The pie business is, at least',
                'The grim reaping is still not doing too well'
            );
            if (deaths === 0) {
                await npc.say("You're not helping at all, having never died.");
            } else if (deaths === 1) {
                await npc.say("You've only died once, after all");
            } else if (deaths >= 10) {
                await npc.say(
                    'Thanks for your continued support. You\'ve died ' +
                        deaths +
                        ' times.'
                );
            } else {
                await npc.say(
                    "You've only died " + deaths + ' times, after all'
                );
            }
        } else if (option === 1) {
            await npc.say('Sure I\'ll sell you a pie for 20,000 coins');
            const buyOption = await player.ask(
                ["That's way too expensive", 'Alright then', 'No thanks'],
                false
            );
            if (buyOption === 2) {
                return;
            } else if (buyOption === 1) {
                if (ifheld(player, COINS_ID, 20000)) {
                    player.message('You hand Death the money');
                    player.inventory.remove(COINS_ID, 20000);
                    await world.sleepTicks(3);
                    player.message('Death hands you a pie');
                    player.inventory.add(PUMPKIN_PIE_ID, 1);
                    await world.sleepTicks(3);
                    await npc.say('Thanks for doing business', 'Enjoy!');
                } else {
                    player.message("You don't have enough money");
                    return;
                }
            } else if (buyOption === 0) {
                await npc.say(
                    'I have to pay off my loan somehow',
                    "I'm not going to just hand out any more of them for free",
                    'Besides, pumpkins are basically worthless',
                    'You can just make your own',
                    'Come back when you actually do want to buy a pie'
                );
                return;
            }
        }
    }
}

// open Death's slum door
async function handleDeathDoor(player, wallObject) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    if (wallObject.x !== DOOR_LOCATION.x || wallObject.y !== DOOR_LOCATION.y) {
        return false;
    }
    // normal door when the event is off
    if (!miceEventActive(player)) {
        return false;
    }

    const { world } = player;

    if (hasMiceKey(player)) {
        switch (getStage(player)) {
            case TALKED_TO_HETTY:
                player.message(
                    'As you approach the door, you feel an odd power ' +
                        'emanating from within'
                );
                await world.sleepTicks(5);
                player.message(
                    'You are about to knock on the door when you notice ' +
                        'movement'
                );
                await world.sleepTicks(5);
                player.message('You look down, and see a cute little mouse');
                await world.sleepTicks(5);
                player.message('It looks like it wants you to pick it up');
                await world.sleepTicks(5);
                player.message('It seem to be very weak');
                await world.sleepTicks(5);
                player.message('You pick up the little mouse');
                player.inventory.add(EAK_THE_MOUSE_ID, 1);
                setStage(player, RECEIVED_EAK);
                await world.sleepTicks(5);
                player.message('Maybe you should take the mouse back to Hetty');
                await world.sleepTicks(5);
                player.message('she could use its tail in her potions');
                return true;
            case RECEIVED_EAK:
            case NEED_ASH_TO_ENCHANT:
                player.message('You raise your hand to knock on the door');
                await world.sleepTicks(5);
                player.message('@yel@Little mouse: SQUEAK!!!');
                await world.sleepTicks(5);
                player.message('The mouse squirms around');
                if (player.skills.hits.current > 1) {
                    await world.sleepTicks(5);
                    player.damage(1);
                    player.message('And bites you!');
                    await player.say('Ouch!');
                }
                return true;
            case EAK_CAN_TALK:
            case AGREED_TO_BRING_BETTY_INGREDIENTS:
            case GIVEN_BETTY_IMMORTAL_MOUSE_INGREDIENTS:
                player.message('You raise your hand to knock on the door');
                await world.sleepTicks(5);
                player.message("@yel@Eak the Mouse: WE CAN'T GO IN THERE!!!");
                await world.sleepTicks(5);
                player.message(
                    '@yel@Eak the Mouse: We have to go talk to Betty in Port ' +
                        'Sarim'
                );
                await world.sleepTicks(5);
                player.message("@yel@Eak the Mouse: I'll die if we go in there now...");
                return true;
            case EAK_IS_IMMORTAL:
                player.message('@yel@Eak the Mouse: Just slip me under the door');
                await world.sleepTicks(5);
                player.message(
                    '@yel@Eak the Mouse: It will only take me a minute to ' +
                        'search the place'
                );
                return true;
            case EAK_HAS_COMPLETED_RECON:
                player.message(
                    "@yel@Eak the Mouse: Hey! Don't you want to know what I saw?"
                );
                return true;
            case EAK_HAS_TOLD_PLAYER_RECON_INFO:
                player.message("@yel@Eak the Mouse: You don't have to go in there...");
                await world.sleepTicks(5);
                player.message('@yel@Eak the Mouse: We should go tell Aggie what I saw');
                await world.sleepTicks(5);
                await player.say('Why Aggie?');
                player.message("@yel@Eak the Mouse: Betty said she's an idea of what to do");
                return true;
            default:
                await player.enterDoor(wallObject);
                return true;
        }
    } else {
        await player.enterDoor(wallObject);
    }
    return true;
}

// pick up a pumpkin inside Death's house
async function onGroundItemTake(player, groundItem) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    // blockTakeObj = pumpkin within (114..117, 532..535).
    if (
        groundItem.id !== PUMPKIN_ID ||
        groundItem.x < DEATH_HOUSE_MIN.x ||
        groundItem.y < DEATH_HOUSE_MIN.y ||
        groundItem.x > DEATH_HOUSE_MAX.x ||
        groundItem.y > DEATH_HOUSE_MAX.y
    ) {
        return false;
    }

    const death = nearestNpc(player, DEATH_ID, 5);
    if (death) {
        await death.say('Do not touch my pumpkins!');
        player.message("You hear Death mutter: @yel@they're all I have left");
    } else {
        // This shouldn't happen, but just in case
        player.message(
            'A strange power prevents you from picking up the pumpkin.'
        );
    }
    return true;
}

// slip the Eak item under the slum door
async function eakOnDeathDoor(player, wallObject, item) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    // blockUseBound = MICE_EVENT && atDoor && item is Eak.
    if (
        item.id !== EAK_THE_MOUSE_ID ||
        wallObject.x !== DOOR_LOCATION.x ||
        wallObject.y !== DOOR_LOCATION.y
    ) {
        return false;
    }
    if (!miceEventActive(player)) {
        return false;
    }

    const { world } = player;

    if (hasMiceKey(player)) {
        switch (getStage(player)) {
            case EAK_IS_IMMORTAL: {
                player.message('You bend down and slip Eak under the door');
                await world.sleepTicks(5);
                player.message('And you wait...');
                await world.sleepTicks(5);
                player.message(
                    'After a few moments, you hear something that sounds like ' +
                        'a shriek'
                );
                const death = nearestNpc(player, DEATH_ID, 5);
                if (death) {
                    await death.say('EEK! A MOUSE!');
                }
                await world.sleepTicks(5);
                player.message('Eak comes scurrying out from under the door');
                await world.sleepTicks(5);
                player.message('You pick them back up');
                setStage(player, EAK_HAS_COMPLETED_RECON);
                break;
            }
            case EAK_HAS_COMPLETED_RECON:
            case EAK_HAS_TOLD_PLAYER_RECON_INFO:
                player.message('@yel@Eak the Mouse: I was just in there...!');
                break;
            case AGGIE_HAS_GIVEN_PIE:
                player.message("@yel@Eak the Mouse: It's okay, he won't kill you");
                await world.sleepTicks(5);
                player.message('@yel@Eak the Mouse: I think');
                break;
            default:
                break;
        }
    }
    return true;
}

// exported helper for the bed object handler; returns true if teleported
async function bedTeleport(player) {
    const { world } = player;
    const questStage = getStage(player);
    if (questStage === COMPLETED || questStage === UNLOCKED_DEATH_ISLAND) {
        player.message('There seems to be a portal under the bed.');
        await world.sleepTicks(3);
        player.message('Would you like to teleport to Death Island?');
        await world.sleepTicks(3);
        const option = await player.ask(['Yes', 'No'], false);
        if (option === 0) {
            player.teleport(DEATH_ISLAND_COORDS.x, DEATH_ISLAND_COORDS.y);
            player.message("Welcome to Death's Farm");
            return true;
        }
    }
    return false;
}

// plugin entry points

// talk on the Eak item
async function onInventoryCommand(player, item) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    if (item.id !== EAK_THE_MOUSE_ID) {
        return false;
    }
    await talkToEak(player);
    return true;
}

// onUsePlayer (blockUsePlayer: item is Eak).
async function onUseWithPlayer(player, otherPlayer, item) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    if (item.id !== EAK_THE_MOUSE_ID) {
        return false;
    }
    player.message("Eak the Mouse: oh come now, let's not bother them.");
    return true;
}

// Eak used on any npc suppresses the default message
async function onUseWithNPC(player, npc, item) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    if (item.id !== EAK_THE_MOUSE_ID) {
        return false;
    }
    const handled =
        npc.id === GERTRUDE_ID ||
        npc.id === ESTER_ID ||
        RAT_IDS.has(npc.id);
    if (handled) {
        // lock and face so scripted lines pace safely; disengage restores both
        player.engage(npc);
        await eakUsedOnNpc(player, npc);
        player.disengage();
    }
    // suppress the default "nothing interesting happens"
    return true;
}

// onUseInv (blockUseInv: item1 or item2 is Eak).
async function onUseWithInventory(player, item, target) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    if (item.id !== EAK_THE_MOUSE_ID && target.id !== EAK_THE_MOUSE_ID) {
        return false;
    }

    const { world } = player;

    // two Eaks used on each other
    if (item.id === target.id) {
        player.message(
            'The two Eaks engage each other in excited conversation.'
        );
        await world.sleepTicks(3);
        player.message(
            "They're speaking in high pitched squeaks you can't understand"
        );
        return true;
    }

    if (hasMiceKey(player) && !eakCanTalk(player)) {
        player.message('Eak the Mouse: Squeek');
        return true;
    }

    const other = item.id === EAK_THE_MOUSE_ID ? target : item;
    await eakUsedOnItem(player, other);
    return true;
}

// tinderbox used on the dropped Eak ground item
async function onUseWithGroundItem(player, groundItem, item) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    if (
        groundItem.id !== EAK_THE_MOUSE_ID ||
        item.id !== TINDERBOX_ID
    ) {
        return false;
    }
    await tinderboxOnDroppedEak(player, groundItem);
    return true;
}

// onTalkNpc (blockTalkNpc: npc is Death).
async function onTalkToNPC(player, npc) {
    if (!customQuestsEnabled(player)) {
        return false;
    }
    if (npc.id !== DEATH_ID) {
        return false;
    }
    player.engage(npc);
    await deathDialogue(player, npc);
    player.disengage();
    return true;
}

// clicks 1 and 2 both dispatch to the door handler
async function onWallObjectCommandOne(player, wallObject) {
    return await handleDeathDoor(player, wallObject);
}

async function onWallObjectCommandTwo(player, wallObject) {
    return await handleDeathDoor(player, wallObject);
}

// onUseBound (Eak on Death's slum door).
async function onUseWithWallObject(player, wallObject, item) {
    return await eakOnDeathDoor(player, wallObject, item);
}

module.exports = {
    onInventoryCommand,
    onUseWithPlayer,
    onUseWithNPC,
    onUseWithInventory,
    onUseWithGroundItem,
    onTalkToNPC,
    onGroundItemTake,
    onWallObjectCommandOne,
    onWallObjectCommandTwo,
    onUseWithWallObject,
    // exported for the bed object handler
    bedTeleport
};
