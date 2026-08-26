// stone/iron/sturdy-iron gates, rocks, wooden/tent doors, desk, bookcase, captain's chest, jail door, window, cave
// jail door

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    STONE_GATE,
    IRON_GATE,
    JAIL_DOOR,
    WINDOW,
    ROCK_1,
    WOODEN_DOORS,
    DESK,
    BOOKCASE,
    CAPTAINS_CHEST,
    TENT_DOOR_1,
    TENT_DOOR_2,
    CAVE_JAIL_DOOR,
    STURDY_IRON_GATE,
    ANA_IN_A_BARREL_ID,
    METAL_KEY_ID,
    CELL_DOOR_KEY_ID,
    WROUGHT_IRON_KEY_ID,
    TECHNICAL_PLANS_ID,
    BEDOBIN_COPY_KEY_ID,
    ROCKS_ID,
    MERCENARY_ID,
    MERCENARY_ESCAPEGATES_ID,
    BEDABIN_NOMAD_GUARD_ID,
    MERCENARY_JAILDOOR_ID,
    CAPTAIN_SIAD_ID,
    DRAFT_MERCENARY_GUARD_ID,
    STAGES,
    stageOf,
    addNpc,
    ifNearVisNpc,
    hasSlaveDisguise,
    succeedRate,
    random
} = require('./constants.js');

const { anaReunion, rewardMenu } = require('./irena.js');
const { mercenaryLeaveDesert, mercenaryThrowPrison } = require('./mercenary.js');
const { captainSiadDialogue } = require('./captain-siad.js');

async function mes(player, text, ticks = 3) {
    player.message(text);
    await player.world.sleepTicks(ticks);
}

function inTouristTrapCave(player) {
    return player.y >= 3600;
}

// returns 'none'|'weapon'|'armour'|'both' based on equipped wield slots
function playerArmed(player) {
    const {
        DESERT_ROBE_ID,
        DESERT_SHIRT_ID,
        SLAVES_ROBE_BOTTOM_ID,
        SLAVES_ROBE_TOP_ID
    } = require('./constants.js');
    const ALLOW = [
        DESERT_ROBE_ID,
        DESERT_SHIRT_ID,
        METAL_KEY_ID,
        SLAVES_ROBE_BOTTOM_ID,
        SLAVES_ROBE_TOP_ID
    ];
    const WEAPON_SLOTS = ['right-hand', 'left-hand', '2-handed'];
    let hasWeapon = false;
    let hasArmour = false;
    for (const item of player.inventory.items) {
        if (!item.equipped) {
            continue;
        }
        if (ALLOW.includes(item.id)) {
            continue;
        }
        const def = item.definition || {};
        const slots = Array.isArray(def.equip) ? def.equip : [];
        if (!slots.length) {
            continue;
        }
        // amulet (neck) / cape are not "armour" for this restriction
        if (slots.includes('neck') || slots.includes('cape')) {
            continue;
        }
        const name = (def.name || '').toLowerCase();
        if (slots.some((s) => WEAPON_SLOTS.includes(s))) {
            // a shield sits in left-hand but counts as armour
            if (name.includes('shield')) {
                hasArmour = true;
            } else {
                hasWeapon = true;
            }
        } else {
            hasArmour = true;
        }
    }
    if (hasWeapon && hasArmour) {
        return 'both';
    }
    if (hasWeapon) {
        return 'weapon';
    }
    if (hasArmour) {
        return 'armour';
    }
    return 'none';
}

// caught escaping the iron gate with ana in a barrel
async function failEscapeAnaInBarrel(player) {
    if (!player.inventory.has(ANA_IN_A_BARREL_ID)) {
        return;
    }
    const n = addNpc(player.world, MERCENARY_ID, player.x, player.y);
    await player.world.sleepTicks(1);
    player.engage(n);
    await n.say(
        "Hey, where d'ya think you're going with that barrel?",
        'You should know that they go out on the cart!',
        "We'd better check this out!"
    );
    player.message('The guards prize the lid off the barrel.');
    player.inventory.remove(ANA_IN_A_BARREL_ID);
    await n.say("Blimey! It's a jail break!", "They're making a break for it!");
    player.disengage();
    const ana = addNpc(player.world, require('./constants.js').ANA_ID, player.x, player.y);
    await player.world.sleepTicks(1);
    player.engage(ana);
    await ana.say(
        "I could have told you we wouldn't get away with it!",
        'Now look at the mess you\'ve caused!'
    );
    player.disengage();
    player.message('The guards grab Ana and drag her away.');
    player.world.removeEntity('npcs', ana);
    await mes(player, '@gre@Ana: Hey, watch it with the hands buster.');
    await mes(player, '@gre@Ana: These are the upper market slaves clothes doncha know!');
    player.engage(n);
    await n.say("Right, we'd better teach you a lesson as well!");
    player.disengage();
    await mes(player, 'The guards rough you up a bit.');
    player.engage(n);
    await n.say('Right lads, stuff him in the mining cell!', 'Specially for our most honoured guests.');
    player.disengage();
    player.message('The guards drag you away to a cell.');
    await mes(player, "@yel@Guards: There you go, we hope you 'dig' you're stay here.");
    await mes(player, '@yel@Guards: Har! Har! Har!');
    player.world.removeEntity('npcs', n);
    player.teleport(75, 3626);
}

async function failWindowAnaInBarrel(player) {
    if (!player.inventory.has(ANA_IN_A_BARREL_ID)) {
        return;
    }
    await mes(player, 'You focus all of your strength on the bar. Your muscles ripple!');
    await mes(player, 'You manage to bend the bars on the window .');
    await mes(player, "You'll never get Ana in the Barrel through the window.");
    await mes(player, 'The barrel is just too big.');
    await mes(player, "@gre@Ana: Don't think for one minute ...");
    await mes(player, "@gre@Ana: you're gonna get me through that window!");
}

async function attemptBendBar(player) {
    await mes(player, 'You focus all of your strength on the bar. Your muscles ripple!');
    if (player.x <= 89) {
        const attempt = random(0, 1);
        if (attempt === 0) {
            await mes(player, 'You find it hard to bend the bar, perhaps you should try again?');
            const stay = await player.ask(
                ["Yes, I'll try to bend the bar again.", "No, I'm going to give up."],
                false
            );
            if (stay === 0) {
                await attemptBendBar(player);
            } else if (stay === 1) {
                await mes(player, 'You decide to stay in the cell.');
                await mes(player, 'Maybe they\'ll let you out soon?');
            }
        } else if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
            await failWindowAnaInBarrel(player);
        } else {
            await mes(player, 'You manage to bend the bar and climb out of the window.');
            player.addExperience('strength', 40, true);
            player.teleport(90, 802);
            player.message('You land near some rough rocks, which you may be able to climb.');
        }
    } else {
        const attempt = random(0, 1);
        if (attempt === 0) {
            await mes(player, 'You find it hard to bend the bar, perhaps you should try again?');
            const stay = await player.ask(
                ["Yes, I'll try to bend the bar again.", "No, I'm going to give up."],
                false
            );
            if (stay === 0) {
                await attemptBendBar(player);
            } else if (stay === 1) {
                await mes(player, 'You decide to stay in the cell.');
                await mes(player, 'Maybe they\'ll let you out soon?');
            }
        } else if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
            await failWindowAnaInBarrel(player);
        } else {
            await mes(player, 'You manage to bend the bar !');
            player.addExperience('strength', 40, true);
            player.teleport(89, 802);
            player.message('You climb back inside the cell.');
        }
    }
}


async function stoneGateGoThrough(player, gameObject) {
    if (!player.inventory.has(ANA_IN_A_BARREL_ID)) {
        player.message('you go through the gate');
        player.teleport(62, 732);
        return;
    }
    if (player.questStages[QUEST_KEY] === STAGES.ATE_PINEAPPLE) {
        await mes(player, 'Ana looks out of the barrel...');
        await mes(player, "@gre@Ana: Hey great, we're at the Shantay Pass!");
        player.inventory.remove(ANA_IN_A_BARREL_ID);
        await anaReunion(player);
        const irena = ifNearVisNpc(player, require('./constants.js').IRENA_ID, 15);
        if (irena) {
            player.engage(irena);
            await irena.say('Hi Ana!');
            await rewardMenu(player, irena);
            player.disengage();
            delete player.cache.tried_ana_barrel;
        }
    } else {
        player.inventory.remove(ANA_IN_A_BARREL_ID);
    }
}

async function stoneGateLook(player) {
    await mes(player, 'You look at the huge Stone Gate.');
    await mes(player, 'On the gate is a large poster, it reads.');
    await mes(
        player,
        '@gre@The Desert is a VERY Dangerous place...do not enter if you are scared of dying.'
    );
    await mes(
        player,
        '@gre@Beware of high temperatures, sand storms, robbers, and slavers...'
    );
    await mes(player, '@gre@No responsibility is taken by Shantay ');
    await mes(
        player,
        '@gre@If anything bad should happen to you in any circumstances whatsoever.'
    );
    await mes(player, 'Despite this warning lots of people seem to pass through the gate.');
}


async function ironGateOpen(player, gameObject) {
    if (player.inventory.has(ANA_IN_A_BARREL_ID)) {
        await failEscapeAnaInBarrel(player);
        return;
    }
    if (!player.inventory.has(METAL_KEY_ID)) {
        player.message("This gate is locked, you'll need a key to open it.");
        return;
    }
    const armedVal = playerArmed(player);
    if (hasSlaveDisguise(player) && armedVal === 'none') {
        const guard = ifNearVisNpc(player, MERCENARY_ID, 5);
        if (guard) {
            player.message('A guard notices you as you try to slip past...');
            player.engage(guard);
            await guard.say("Hey! Where do you think you're going?");
            await guard.attack(player);
            await guard.say('Guards! Slave escaping!');
            if (player.questStages[QUEST_KEY] === STAGES.COMPLETE) {
                player.message('No other guards come to the rescue.');
                player.disengage();
                return;
            }
            if (player.x <= 91) {
                await mercenaryThrowPrison(player, guard);
            } else {
                await mercenaryLeaveDesert(player, guard);
            }
            player.disengage();
        }
        return;
    }
    await mes(player, 'You use the metal key to unlock the gates.');
    await mes(player, 'You manage to sneak past the guards!.');
    // pass through the gate, teleport 1 tile in
    player.message('The gate swings open.');
    await player.world.sleepTicks(2);
    player.message('The gates close behind you.');
    const n = ifNearVisNpc(player, MERCENARY_ESCAPEGATES_ID, 15);
    if (n && stageOf(player) !== STAGES.COMPLETE && armedVal !== 'none') {
        player.engage(n);
        if (armedVal === 'weapon') {
            await n.say('Oi You with the weapon, what are you doing?');
        } else if (armedVal === 'armour') {
            await n.say('Oi You with the armour on, what are you doing?');
        } else {
            await n.say('Oi You with the weapon and armour, what are you doing?');
        }
        await n.say("You don't belong in here!");
        player.message('More guards come to arrest you.');
        await n.attack(player);
        await n.say("Right, you're going in the cell!");
        player.disengage();
        await mes(player, "You're outnumbered by all the guards.");
        await mes(player, 'They man-handle you into a cell.');
        player.teleport(89, 801);
    }
}

async function ironGateSearch(player) {
    await mes(player, 'You search the gate.');
    await mes(player, 'Inside the compound you can see that there are lots of slaves mining away.');
    await mes(player, 'They all seem to be dressed in dirty disgusting desert rags.');
    await mes(player, 'And equiped only with a mining pick.');
    await mes(player, 'Each slave is chained to a rock where they seemingly mine all day long.');
    await mes(player, 'Guards patrol the area extensively.');
    await mes(player, 'But you might be able to sneak past them if you try to blend in.');
}


async function woodenDoorsOpen(player, gameObject) {
    await mes(player, 'You push the door.');
    await player.say('Ugh!');
    if (hasSlaveDisguise(player)) {
        await mes(player, 'The door opens with some effort ');
        if (gameObject.x === 81 && gameObject.y === 3633) {
            player.teleport(82, 802);
            return;
        }
        player.teleport(82, 3630);
        await mes(player, 'The huge doors open into a dark, dank and smelly tunnel.');
        await mes(player, 'The associated smells of a hundred sweaty miners greets your nostrils.');
        await mes(player, "And your ears ring with the 'CLANG CLANG CLANG' as metal hits rock.");
    } else {
        const n = addNpc(player.world, DRAFT_MERCENARY_GUARD_ID, player.x, player.y);
        await player.world.sleepTicks(2);
        await mes(player, 'A guard notices you and approaches...');
        player.engage(n);
        await n.attack(player);
        await n.say('Hey, you\'re no slave, where do you think you\'re going!');
        await n.say('Guards, guards!');
        if (player.questStages[QUEST_KEY] === STAGES.COMPLETE) {
            player.message('No other guards come to the rescue.');
            player.disengage();
            return;
        }
        await mercenaryThrowPrison(player, n);
        player.disengage();
    }
}

async function woodenDoorsWatch(player, gameObject) {
    if (gameObject.x === 81 && gameObject.y === 3633) {
        player.message('Nothing much seems to happen.');
    } else {
        await mes(player, 'You watch the doors for some time.');
        await mes(player, 'You notice that only slaves seem to go down there.');
        await mes(player, 'You might be able to sneak down if you pass as a slave.');
    }
}


async function searchDesk(player) {
    await mes(player, "You search the captains desk while he's not looking.");
    const stage = stageOf(player);
    const hasCell = player.inventory.has(CELL_DOOR_KEY_ID);
    const hasMetal = player.inventory.has(METAL_KEY_ID);
    const hasWrought = player.inventory.has(WROUGHT_IRON_KEY_ID);
    if (
        hasCell &&
        hasMetal &&
        ((stage >= 0 && stage <= 9) || hasWrought)
    ) {
        await mes(player, '...but you find nothing of interest.');
        return;
    }
    if (!hasCell) {
        await mes(player, 'You find a cell door key.');
        player.inventory.add(CELL_DOOR_KEY_ID, 1);
    }
    if (!hasMetal) {
        await mes(player, 'You find a large metalic key.');
        player.inventory.add(METAL_KEY_ID, 1);
    }
    if (!(stage >= 0 && stage <= 9) && !hasWrought) {
        await mes(player, 'You find a large wrought iron key.');
        player.inventory.add(WROUGHT_IRON_KEY_ID, 1);
    }
}

async function searchBookcase(player) {
    player.message('You notice several books on the subject of Sailing.');
    if (player.cache.sailing === undefined) {
        player.cache.sailing = true;
    }
}

async function lookBookcase(player) {
    player.message('The captain seems to collect lots of books!');
}


async function captainsChest(player) {
    const stage = stageOf(player);
    if (player.cache.tourist_chest !== undefined || stage === STAGES.COMPLETE) {
        if (player.inventory.has(BEDOBIN_COPY_KEY_ID)) {
            if (!player.inventory.has(TECHNICAL_PLANS_ID)) {
                await mes(player, "While the Captain's distracted, you quickly unlock the chest.");
                await mes(player, 'You use the Bedobin Copy Key to open the chest.');
                await mes(player, 'You open the chest and take out the plans.');
                player.inventory.add(TECHNICAL_PLANS_ID, 1);
                if (player.cache.tech_plans === undefined) {
                    player.cache.tech_plans = true;
                }
            } else {
                player.message('The chest is empty.');
            }
            delete player.cache.sailing;
            delete player.cache.tourist_chest;
        } else {
            delete player.cache.sailing;
            delete player.cache.tourist_chest;
            player.message('This chest needs a key!');
        }
    } else {
        let n = ifNearVisNpc(player, CAPTAIN_SIAD_ID, 5);
        if (!n) {
            n = addNpc(player.world, CAPTAIN_SIAD_ID, player.x, player.y);
            await player.world.sleepTicks(2);
        }
        player.engage(n);
        await captainSiadDialogue(player, n, true);
        player.disengage();
    }
}


async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    switch (gameObject.id) {
        case STONE_GATE:
            // desert-side check is on the player's y (>= 735), not the gate's; scoped to smuggling ana in a barrel
            if (player.y >= 735 && player.inventory.has(ANA_IN_A_BARREL_ID)) {
                await stoneGateGoThrough(player, gameObject);
                return true;
            }
            return false;
        case IRON_GATE: // cmd one = "Open"
            await ironGateOpen(player, gameObject);
            return true;
        case ROCK_1: // climb the rocky elevation
            player.message('You start climbing the rocky elevation.');
            if (!succeedRate()) {
                player.message('You slip a little and tumble the rest of the way down the slope.');
                player.damage(7);
            }
            player.teleport(93, 799);
            return true;
        case WOODEN_DOORS: // cmd one = "Open"
            await woodenDoorsOpen(player, gameObject);
            return true;
        case BOOKCASE: // rsc cmd one = "Look"
            await lookBookcase(player);
            return true;
        case CAPTAINS_CHEST: // cmd one = "Open"
            await captainsChest(player);
            return true;
        default:
            return false;
    }
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    switch (gameObject.id) {
        case STONE_GATE:
            // desert-side look (the poster)
            if (player.y >= 735) {
                await stoneGateLook(player);
                return true;
            }
            return false;
        case IRON_GATE: // cmd two = "Search"
            await ironGateSearch(player);
            return true;
        case WOODEN_DOORS: // cmd two = "Watch"
            await woodenDoorsWatch(player, gameObject);
            return true;
        case BOOKCASE: // rsc cmd two = "Search"
            await searchBookcase(player);
            return true;
        case DESK: // search is command two
            await searchDesk(player);
            return true;
        default:
            return false;
    }
}

// OpBound -> wall object handlers
async function onWallObjectCommandOne(player, wo) {
    if (!questsEnabled(player)) {
        return false;
    }
    switch (wo.id) {
        // window's search is command two
        case JAIL_DOOR:
            if (wo.x === 88 && wo.y === 801) {
                await jailDoor(player, wo);
                return true;
            }
            return false;
        case TENT_DOOR_1:
            await tentDoor1(player, wo);
            return true;
        case TENT_DOOR_2:
            await tentDoor2(player, wo);
            return true;
        case CAVE_JAIL_DOOR:
            await caveJailDoor(player);
            return true;
        case STURDY_IRON_GATE:
            await sturdyIronGate(player, wo);
            return true;
        default:
            return false;
    }
}

async function onWallObjectCommandTwo(player, wo) {
    if (!questsEnabled(player)) {
        return false;
    }
    // WINDOW's "Search" is the 2nd command in rsc-data.
    if (wo.id === WINDOW && (wo.x === 90 || wo.x === 89) && wo.y === 802) {
        await windowSearch(player);
        return true;
    }
    return false;
}

async function windowSearch(player) {
    await mes(player, 'You search the window.');
    await mes(player, 'After some time you find that one of the bars looks weak,  ');
    await mes(player, 'you may be able to bend one of the bars. ');
    await mes(player, 'Would you like to try ?');
    const menu = await player.ask(
        ["Yes, I'll bend the bar.", "No, I'd better stay here."],
        false
    );
    if (menu === 0) {
        await attemptBendBar(player);
    } else if (menu === 1) {
        await mes(player, 'You decide to stay in the cell.');
        await mes(player, 'Maybe they\'ll let you out soon?');
    }
}

async function jailDoor(player, wo) {
    if (player.inventory.has(CELL_DOOR_KEY_ID)) {
        player.message('You unlock the door and walk through.');
        // doDoor: pass through
        player.teleport(player.x, player.y);
    } else {
        await mes(player, 'You need a key to unlock this door,');
        await mes(player, "And you don't seem to have one that fits.");
    }
}

async function tentDoor1(player, wo) {
    if (player.y <= 793) {
        player.teleport(171, 795);
    } else {
        let n = ifNearVisNpc(player, BEDABIN_NOMAD_GUARD_ID, 5);
        if (!n) {
            n = addNpc(player.world, BEDABIN_NOMAD_GUARD_ID, player.x, player.y);
            await player.world.sleepTicks(1);
        }
        n.teleport(170, 794);
        player.engage(n);
        const { bedabinNomadGuardDialogue } = require('./bedabin.js');
        await bedabinNomadGuardDialogue(player, n);
        player.disengage();
    }
}

async function tentDoor2(player, wo) {
    // doTentDoor: pass through
    player.teleport(player.x, player.y);
}

async function caveJailDoor(player) {
    const n = ifNearVisNpc(player, MERCENARY_JAILDOOR_ID, 5);
    if (!n) {
        return;
    }
    if (player.x >= 72) {
        if (!player.inventory.has(ROCKS_ID, 15)) {
            player.engage(n);
            await n.say(
                'Hey, move away from the gate.',
                "If you wanna get out, you're gonna have to mine for it.",
                "You're gonna have to bring me 15 loads of rocks - in one go!",
                "And then I'll let you out.",
                'You can go back and work with the other slaves then!'
            );
            player.disengage();
        } else {
            player.engage(n);
            await player.say('Hey, I have your rocks here, let me out.');
            for (let i = 0; i < 15; i++) {
                player.inventory.remove(ROCKS_ID);
            }
            await n.say('Ok, ok, come on out.');
            player.disengage();
            player.teleport(71, 3626);
            player.message('The guard unlocks the gate and lets you out.');
            player.teleport(69, 3625);
        }
    } else {
        player.engage(n);
        await n.say('Hey, move away from that gate!');
        player.disengage();
    }
}

async function sturdyIronGate(player, wo) {
    if (player.y >= 3617) {
        if (player.inventory.has(WROUGHT_IRON_KEY_ID)) {
            player.message('You use the wrought iron key to unlock the gate.');
            player.teleport(player.x, player.y - 1);
        } else {
            await mes(player, 'You need a key to unlock this door,');
            await mes(player, "And you don't seem to have one that fits.");
        }
    } else {
        player.message('You push the gate open and walk through.');
        player.teleport(player.x, player.y + 1);
    }
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne,
    onWallObjectCommandTwo,
    playerArmed,
    inTouristTrapCave
};
