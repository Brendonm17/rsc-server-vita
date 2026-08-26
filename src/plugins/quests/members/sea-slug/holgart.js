// holgart the boatman; which spawn the player talks to determines their location

const { questsEnabled } = require('../../custom-gate.js');
const {
    HOLGART_LAND_ID,
    HOLGART_PLATFORM_ID,
    HOLGART_ISLAND_ID,
    HOLGART_IDS,
    SWAMP_PASTE_ID,
    LIT_TORCH_ID,
    UNLIT_TORCH_ID,
    PLATFORM_TELEPORT,
    SHORE_TELEPORT,
    ISLAND_TELEPORT
} = require('./ids.js');

// A lit torch goes out on the boat crossing.
async function checkTorchCrossing(player) {
    if (player.inventory.has(LIT_TORCH_ID)) {
        player.inventory.remove(LIT_TORCH_ID);
        player.inventory.add(UNLIT_TORCH_ID, 1);
        player.message('your torch goes out on the crossing');
        await player.world.sleepTicks(3);
    }
}

// shared "will you take me there?" offer at ardougne for stages 3-6, -1
async function ardougneTakeMeThere(player, npc) {
    await player.say('hello holgart');
    await npc.say(
        'hello again land lover',
        "there's some strange going's on, on that platform i tell you"
    );

    // multi(false) => the player does not auto-say the chosen option.
    const goMenu = await player.ask(
        ['will you take me there?', "i'm keeping away from there"],
        false
    );

    if (goMenu === 0) {
        await player.say('will you take me back there?');
        await npc.say("of course m'hearty", "if that's what you want");
        player.message('you board the small row boat');
        await player.world.sleepTicks(3);
        await checkTorchCrossing(player);
        player.message('you arrive at the fishing platform');
        await player.world.sleepTicks(3);
        player.teleport(PLATFORM_TELEPORT.x, PLATFORM_TELEPORT.y, false);
    } else if (goMenu === 1) {
        await player.say("i'm keeping away from there");
        await npc.say("fair enough m'hearty");
    }
}

// Shared "want to go back to shore?" offer used away from Ardougne.
async function offshoreGoBack(player, npc) {
    await player.say('hey holgart');
    await npc.say('have you had enough of this place yet?', "it's scaring me");

    const goBack = await player.ask(
        ["no, i'm going to stay a while", 'okay, lets go back'],
        true
    );

    if (goBack === 0) {
        await npc.say("okay, you're the boss");
    } else if (goBack === 1) {
        await npc.say("okay m'hearty jump on");
        player.message('you arrive back on shore');
        await player.world.sleepTicks(3);
        player.teleport(SHORE_TELEPORT.x, SHORE_TELEPORT.y, false);
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!HOLGART_IDS.includes(npc.id)) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.seaSlug || 0;
    const inArdougne = npc.id === HOLGART_LAND_ID;
    const inPlatformArea = npc.id === HOLGART_PLATFORM_ID;
    const inIsland = npc.id === HOLGART_ISLAND_ID;

    switch (stage) {
        case 0:
            await player.say('hello there');
            await npc.say("well hello m'laddy", "beautiful day isn't it");
            await player.say('not bad i suppose');
            await npc.say('just smell that sea air... beautiful');
            await player.say('hmm...lovely!');
            break;

        case 1:
            await player.say('hello');
            await npc.say("hello m'hearty");
            await player.say(
                'i would like a ride on your boat to the fishing platform'
            );
            await npc.say(
                "i'm afraid it isn't sea worthy, it's full of holes",
                "to fill the holes i'll need some swamp paste"
            );
            await player.say('swamp paste?');
            await npc.say('yes, swamp tar mixed with flour heated over a fire');
            await player.say('where can i find swamp tar?');
            await npc.say(
                'unfortunately the only supply of swamp tar is in the swamps ' +
                    'below lumbridge',
                "it's too far for an old man like me to travel",
                'if you can make me some swamp paste i will give you a ride ' +
                    'on my boat'
            );
            await player.say("i'll see what i can do");
            player.questStages.seaSlug = 2;
            break;

        case 2:
            await player.say('hello holgart');
            await npc.say(
                "hello m'hearty",
                'did you manage to make some swamp paste?'
            );
            if (player.inventory.has(SWAMP_PASTE_ID)) {
                await player.say('yes i have some here');
                player.inventory.remove(SWAMP_PASTE_ID);
                player.message('you give holgart the swamp paste');
                await npc.say('superb, this looks great');
                player.message(
                    'holgart smears the paste over the under side of his boat'
                );
                await npc.say(
                    "that's done the job, now we can go",
                    'jump aboard'
                );
                player.questStages.seaSlug = 3;

                const boatMenu = await player.ask(
                    ["i'll come back later", 'okay, lets do it'],
                    true
                );

                if (boatMenu === 0) {
                    await npc.say('okay then', "i'll wait here for you");
                } else if (boatMenu === 1) {
                    await npc.say('hold on tight');
                    player.message('you board the small row boat');
                    await player.world.sleepTicks(3);
                    player.message('you arrive at the fishing platform');
                    await player.world.sleepTicks(3);
                    player.teleport(
                        PLATFORM_TELEPORT.x,
                        PLATFORM_TELEPORT.y,
                        false
                    );
                }
            } else {
                await player.say("i'm afraid not");
                await npc.say(
                    'to make it you need swamp tar mixed with flour heated ' +
                        'over a fire',
                    'the only supply of swamp tar is in the swamps below ' +
                        'lumbridge',
                    "i can't fix the row boat without it"
                );
                await player.say("ok, i'll try to find some");
            }
            break;

        case 3:
            if (inArdougne) {
                await ardougneTakeMeThere(player, npc);
            } else {
                // on the platform, holgart takes the player back to shore
                await offshoreGoBack(player, npc);
            }
            break;

        case 4:
            if (inPlatformArea) {
                await player.say(
                    'holgart, something strange is going on here'
                );
                await npc.say(
                    "you're telling me",
                    'none of the sailors seem to remember who i am'
                );
                await player.say(
                    'apparently kenniths father left for help a couple of ' +
                        'days ago'
                );
                await npc.say(
                    "that's a worry, no ones heard from him on shore",
                    'come on, we better go look for him'
                );
                player.message('you board the row boat');
                await player.world.sleepTicks(3);
                player.message('you arrive on a small island');
                await player.world.sleepTicks(3);
                player.teleport(ISLAND_TELEPORT.x, ISLAND_TELEPORT.y, false);
            } else if (inArdougne) {
                await ardougneTakeMeThere(player, npc);
            } else {
                // Kent's island.
                await player.say('where are we?');
                await npc.say(
                    'someway of mainland still',
                    "you better see if old matey's okay"
                );
            }
            break;

        case 5:
            if (inPlatformArea) {
                await offshoreGoBack(player, npc);
            } else if (inArdougne) {
                await ardougneTakeMeThere(player, npc);
            } else {
                // Kent's island -> back to the fishing platform.
                await player.say(
                    'we had better get back to the platform',
                    "and see what's going on"
                );
                await npc.say("you're right", 'it all sounds pretty creepy');
                player.message('you arrive back at the fishing platform');
                await player.world.sleepTicks(3);
                player.teleport(
                    PLATFORM_TELEPORT.x,
                    PLATFORM_TELEPORT.y,
                    false
                );
            }
            break;

        case 6:
            if (inPlatformArea) {
                await player.say('did you get the kid back to shore?');
                await npc.say(
                    "yes, he's safe and sound with his parents",
                    'your turn to return to land now adventurer'
                );
                await player.say('looking forward to it');
                player.message('you board the small row boat');
                player.message('you arrive back on shore');
                player.teleport(SHORE_TELEPORT.x, SHORE_TELEPORT.y, false);
            } else {
                await ardougneTakeMeThere(player, npc);
            }
            break;

        case -1:
            if (inArdougne) {
                await player.say('hello again holgart');
                await npc.say(
                    "well hello again m'hearty",
                    'your land loving legs getting bored?',
                    'fancy some cold and wet underfoot?'
                );
                await player.say('pardon');
                await npc.say('fancy going out to sea?');

                const goMenu = await player.ask(
                    ["i'll come back later", 'okay lets do it'],
                    true
                );

                if (goMenu === 0) {
                    await npc.say('okay then', "i'll wait here for you");
                }
                if (goMenu === 1) {
                    await npc.say('hold on tight');
                    player.message('you board the small row boat');
                    await player.world.sleepTicks(3);
                    await checkTorchCrossing(player);
                    player.message('you arrive at the fishing platform');
                    await player.world.sleepTicks(3);
                    player.teleport(
                        PLATFORM_TELEPORT.x,
                        PLATFORM_TELEPORT.y,
                        false
                    );
                }
            } else {
                await offshoreGoBack(player, npc);
            }
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
