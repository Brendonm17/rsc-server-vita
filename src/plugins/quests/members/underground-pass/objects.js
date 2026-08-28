// underground pass - object interactions with quest-state logic

const { questsEnabled } = require('../../custom-gate.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

function hitsDiv(player, div, add) {
    return Math.floor(player.skills.hits.current / div) + add;
}

// command one (search / open / climb / pull)
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const stage = getStage(player);

    // Well (needs 4 orbs dimmed, or post-fight)
    if (gameObject.id === IDS.WELL) {
        player.message('you climb into the well');
        await world.sleepTicks(3);
        const orbsDone =
            player.cache.orb_of_light1 &&
            player.cache.orb_of_light2 &&
            player.cache.orb_of_light3 &&
            player.cache.orb_of_light4;
        if (orbsDone || stage === 7 || stage === 8 || stage === -1) {
            player.message('you feel the grip of icy hands all around you...');
            await world.sleepTicks(3);
            player.teleport(722, 3461);
            player.message('..slowly dragging you futher down into the caverns');
        } else {
            player.damage(Math.floor(player.skills.hits.current * 0.2));
            player.message('from below an icy blast of air chills you to your bones');
            await world.sleepTicks(3);
            player.message('a mystical force seems to blast you back out of the well');
            await world.sleepTicks(3);
            player.message('there must be a positive force near by!');
        }
        return true;
    }

    // Crate -> food
    if (gameObject.id === IDS.CRATE) {
        player.message('you search the crate');
        await world.sleepTicks(3);
        if (!player.cache.crate_food) {
            player.message('inside you find some food');
            player.inventory.add(IDS.SALMON, 2);
            player.inventory.add(IDS.MEAT_PIE, 2);
            player.cache.crate_food = true;
        } else {
            player.message('but you find nothing');
        }
        return true;
    }

    // Cage remains -> damaged (unicorn) horn
    if (gameObject.id === IDS.CAGE_REMAINS) {
        if (stage >= 5 || stage === -1) {
            player.message('you search the cage remains');
            await world.sleepTicks(3);
            player.message('nothing remains');
            return true;
        }
        if (!player.inventory.has(IDS.UNICORN_HORN)) {
            await world.sleepTicks(3);
            player.message('all that remains is a damaged horn');
            player.inventory.add(IDS.UNICORN_HORN, 1);
        } else {
            player.message('nothing remains');
        }
        return true;
    }

    // Gate of Iban (needs flames offerings, or post)
    if (gameObject.id === IDS.GATE_OF_IBAN) {
        player.message('you pull on the great door');
        const flamesDone =
            player.cache.flames_of_zamorak1 &&
            player.cache.flames_of_zamorak2 &&
            player.cache.flames_of_zamorak3 >= 2;
        if (flamesDone || stage === 7 || stage === 8 || stage === -1) {
            player.message("from behind the door you hear cry's and moans");
            await world.sleepTicks(3);
            player.message('the door slowly creeks open');
            player.teleport(770, 3417);
            player.message('you walk into the darkness');
        } else {
            player.message('the door refuses to open');
        }
        return true;
    }

    // Gate of Zamorak
    if (gameObject.id === IDS.GATE_OF_ZAMORAK) {
        player.message('you open the huge wooden door');
        await world.sleepTicks(3);
        player.teleport(763, 3417);
        player.message('and walk through');
        return true;
    }

    // Dwarf barrel -> dwarf brew (needs bucket)
    if (gameObject.id === IDS.DWARF_BARREL) {
        if (!player.inventory.has(IDS.BUCKET)) {
            player.message('you need a bucket first');
        } else {
            player.message('you poor some of the strong brew into your bucket');
            player.inventory.remove(IDS.BUCKET, 1);
            player.inventory.add(IDS.DWARF_BREW, 1);
        }
        return true;
    }

    // Souless cages -> Iban's conscience (dove)
    if (gameObject.id === IDS.SOULESS_CAGE_B) {
        player.message('the man seems to be entranced');
        player.message('the cage is locked');
        await world.sleepTicks(3);
        const souless = player.getNearbyEntitiesByID(
            'npcs',
            IDS.SOULESS_HUMAN,
            6
        )[0];
        if (souless) {
            await souless.say('kuluf ali monopiate');
        }
        player.message('you search through the bottom of the cage');
        await world.sleepTicks(3);
        if (!player.cache.cons_on_doll) {
            player.message('but the souless bieng bites into your arm');
            if (player.inventory.isEquipped(IDS.KLANKS_GAUNTLETS)) {
                player.message('klanks gaunlett protects you');
            } else {
                player.damage(hitsDiv(player, 10, 5));
            }
        }
        if (
            !player.inventory.has(IDS.IBANS_CONSCIENCE) &&
            !player.cache.cons_on_doll
        ) {
            player.message('you find the remains of a dove');
            player.inventory.add(IDS.IBANS_CONSCIENCE, 1);
        } else if (player.inventory.isEquipped(IDS.KLANKS_GAUNTLETS)) {
            player.message('but you find find nothing');
        } else {
            player.message('you find nothing');
        }
        return true;
    }

    if (gameObject.id === IDS.SOULESS_CAGE_A) {
        player.message('the man seems to be entranced');
        player.message('the cage is locked');
        await world.sleepTicks(3);
        const souless = player.getNearbyEntitiesByID(
            'npcs',
            IDS.SOULESS_HUMAN,
            6
        )[0];
        if (souless) {
            await souless.say('kuluf ali monopiate');
        }
        player.message('you search through the bottom of the cage');
        await world.sleepTicks(3);
        player.message('but the souless bieng bites into your arm');
        if (player.inventory.isEquipped(IDS.KLANKS_GAUNTLETS)) {
            player.message('klanks gaunlett protects you');
            player.message('but you find find nothing');
        } else {
            player.damage(hitsDiv(player, 10, 5));
            player.message('you find nothing');
        }
        return true;
    }

    // Demons chest -> Iban's shadow (needs 3 amulets)
    if (gameObject.id === IDS.DEMONS_CHEST_CLOSED) {
        player.message('you attempt to open the chest');
        await world.sleepTicks(3);
        if (
            player.inventory.has(IDS.AMULET_OF_OTHAINIAN) &&
            player.inventory.has(IDS.AMULET_OF_DOOMION) &&
            player.inventory.has(IDS.AMULET_OF_HOLTHION) &&
            !player.cache.shadow_on_doll
        ) {
            player.message('the three amulets glow red in your satchel');
            await world.sleepTicks(3);
            player.inventory.remove(IDS.AMULET_OF_OTHAINIAN, 1);
            player.inventory.remove(IDS.AMULET_OF_DOOMION, 1);
            player.inventory.remove(IDS.AMULET_OF_HOLTHION, 1);
            player.message('you place them on the chest and the chest opens');
            await world.sleepTicks(2);
            player.message('inside you find a strange dark liquid');
            player.inventory.add(IDS.IBANS_SHADOW, 1);
        } else {
            player.message("but it's magically sealed");
        }
        return true;
    }

    // zamorakian temple door: robes required, enters iban, stage 6->7
    if (gameObject.id === IDS.ZAMORAKIAN_TEMPLE_DOOR) {
        if (
            player.inventory.isEquipped(IDS.ROBE_OF_ZAMORAK_TOP) &&
            player.inventory.isEquipped(IDS.ROBE_OF_ZAMORAK_BOTTOM)
        ) {
            player.teleport(795, 3469);
            player.message('you pull open the large doors');
            await world.sleepTicks(3);
            player.message('and walk into the temple');
            const dollComplete =
                player.cache.poison_on_doll &&
                player.cache.cons_on_doll &&
                player.cache.ash_on_doll &&
                player.cache.shadow_on_doll;
            if (stage === 7 || dollComplete) {
                if (stage === 6) {
                    player.questStages[QUEST_KEY] = 7;
                }
                player.message('Iban seems to sense danger');
                player.message(
                    '@yel@Iban: who dares bring the witches magic into my temple'
                );
                await world.sleepTicks(3);
                player.message('his eyes fixate on you as he raises his arm');
                await world.sleepTicks(3);
                player.message(
                    '@yel@Iban: an imposter dares desecrate this sacred place..'
                );
                await world.sleepTicks(3);
                player.message(
                    '@yel@Iban: ..home to the only true child of zamorak'
                );
                await world.sleepTicks(3);
                player.message('@yel@Iban: join the damned, mortal');
                await world.sleepTicks(3);
                player.message('iban raises his staff to the air');
                player.message('a blast of energy comes from ibans staff');
                await world.sleepTicks(3);
                player.message('you are hit by ibans magic bolt');
                player.damage(
                    Math.floor(player.skills.hits.current / 10) +
                        4 +
                        (Math.floor(Math.random() * 3) - 1)
                );
                player.message('@yel@Iban:die foolish mortal');
                await world.sleepTicks(3);
            } else {
                player.message('inside iban stands preaching at the alter');
            }
        } else {
            player.message('The door refuses to open');
            await world.sleepTicks(3);
            player.message('only followers of zamorak may enter');
        }
        return true;
    }

    // Tomb of Iban (open -> claws attack)
    if (gameObject.id === IDS.TOMB_OF_IBAN) {
        player.message('you try to open the door of the tomb');
        await world.sleepTicks(3);
        player.message('but the door refuses to open');
        player.message('you hear a noise from below');
        await world.sleepTicks(3);
        player.message('@red@leave me be');
        player.damage(hitsDiv(player, 5, 5));
        return true;
    }

    return false;
}

// wall-object command one (pick lock / squeeze through railings)
async function onWallObjectCommandOne(player, wo) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    // Spider-nest railing (needs doll / stage >=7)
    if (wo.id === IDS.SPIDER_NEST_RAILING) {
        player.message('you search the bars');
        await world.sleepTicks(3);
        const stage = getStage(player);
        if (player.cache.doll_of_iban || stage >= 7 || stage === -1) {
            player.message("there's a gap big enough to squeeze through");
            await world.sleepTicks(3);
            const menu = await player.ask(['nope', 'yes, lets do it'], false);
            if (menu === 1) {
                player.message('you squeeze through the old railings');
            }
        } else {
            player.message("but you can't quite squeeze through");
        }
        return true;
    }

    // Map2 railings 167-170 (pick lock)
    if (
        wo.id === IDS.RAILING_167 ||
        wo.id === IDS.RAILING_169 ||
        wo.id === IDS.RAILING_170
    ) {
        player.message('you attempt to pick the lock');
        if (wo.id === IDS.RAILING_169 && player.skills.thieving.current < 50) {
            player.message('you need a level of 50 thieving to pick this lock');
            return true;
        }
        player.message('You manage to pick the lock');
        player.message('you walk through');
        player.addExperience('thieving', 15, true);
        await world.sleepTicks(3);
        player.message('the cage slams shut behind you');
        return true;
    }

    if (wo.id === IDS.RAILING_168) {
        player.message('the cage door has been sealed shut');
        await world.sleepTicks(3);
        player.message("the poor unicorn can't escape");
        return true;
    }

    return false;
}

// wall-object command two (search railing -> loose railing item)
async function onWallObjectCommandTwo(player, wo) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (wo.id === IDS.RAILING_168) {
        player.message('you search the cage');
        await world.sleepTicks(3);
        if (!player.inventory.has(IDS.RAILING)) {
            player.message('you find a loose railing lying on the floor');
            player.inventory.add(IDS.RAILING, 1);
        } else {
            player.message('but you find nothing');
        }
        return true;
    }

    if (
        wo.id === IDS.RAILING_167 ||
        wo.id === IDS.RAILING_169 ||
        wo.id === IDS.RAILING_170
    ) {
        player.message('the cage has been locked');
        return true;
    }

    return false;
}

// command two (flames inscription / search)
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    // Flames of Zamorak inscription (search)
    if (gameObject.id === IDS.FLAMES_OF_ZAMORAK) {
        const { world } = player;
        player.message('you search the stone structure');
        await world.sleepTicks(3);
        player.message('on the side you find an old inscription');
        player.message('it reads...');
        player.message(
            '@red@While I sense the soft beating of a good heart I will not open. ' +
                'Feed me three crests of the blessed warriors, and the creatures ' +
                'remains. Throw them to me as an offering, a gift of hatred, a ' +
                'token. Then finally rejoice as all goodness dies in my flames'
        );
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne,
    onWallObjectCommandTwo
};
