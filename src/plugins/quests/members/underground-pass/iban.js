// Underground Pass (members) - Iban battle and his minions:
//   throw completed doll into the pit of the damned
//   othainian / doomion / holthion kills -> amulets
//   kalrag kill -> smear poison onto the doll
//   disciple talk + kill drops
// the staff/runes and quest reward are granted on king-lathas.js at stage 8.

const { questsEnabled } = require('../../custom-gate.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

// pit of the damned: use the completed doll of iban
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (
        gameObject.id !== IDS.PIT_OF_THE_DAMNED ||
        item.id !== IDS.A_DOLL_OF_IBAN
    ) {
        return false;
    }

    const { world } = player;
    const stage = getStage(player);

    // iban already killed (stage 8 / -1)
    if (stage === 8 || stage === -1) {
        player.message('iban is already dead');
        return true;
    }

    if (
        player.cache.poison_on_doll &&
        player.cache.cons_on_doll &&
        player.cache.ash_on_doll &&
        player.cache.shadow_on_doll
    ) {
        // OpenRSC requires the Iban npc within range 10 (ifnearvisnpc).
        const iban = player.getNearbyEntitiesByID('npcs', IDS.IBAN, 10)[0];

        if (!iban) {
            player.message('iban is still not here');
            return true;
        }

        player.message('@que@you throw the doll of iban into the pit');
        await world.sleepTicks(3);
        player.inventory.remove(IDS.A_DOLL_OF_IBAN, 1);
        // cache flag that stops the chamber-blast hazard in objects.js when iban dies via the pit
        player.cache.iban_bubble_show = true;
        // engage iban so his scripted death speech has an interlocutor
        player.engage(iban);
        await iban.say(
            "what's happening?, it's dark here...so dark",
            'im falling into the dark, what have you done?'
        );
        player.message('@que@iban falls to his knees clutching his throat');
        await world.sleepTicks(3);
        await iban.say('noooooooo!');
        player.disengage();
        player.message('iban slumps motionless to the floor');
        world.removeEntity('npcs', iban);

        player.message('@que@a roar comes from the pit of the damned');
        await world.sleepTicks(3);
        player.message('@que@the infamous iban has finally gone to rest');
        await world.sleepTicks(3);
        player.message('amongst ibans remains you find his staff..');
        player.message('@que@...and some runes');
        await world.sleepTicks(3);
        player.message('suddenly around you rocks crash to the floor..');
        player.message('@que@...as the ground begins to shake');
        await world.sleepTicks(3);
        player.message('@que@the temple walls begin to collapse in');
        await world.sleepTicks(3);
        player.message("@que@and you're thrown from the temple platform");
        await world.sleepTicks(3);
        player.inventory.add(IDS.STAFF_OF_IBAN, 1);
        player.inventory.add(IDS.DEATH_RUNE, 15);
        player.inventory.add(IDS.FIRE_RUNE, 30);
        player.teleport(687, 3485);

        player.questStages[QUEST_KEY] = 8;

        // REMOVE CACHES
        delete player.cache.orb_of_light1;
        delete player.cache.orb_of_light2;
        delete player.cache.orb_of_light3;
        delete player.cache.orb_of_light4;
        delete player.cache.stalagmite;
        delete player.cache.crate_food;
        delete player.cache.paladin_food;
        delete player.cache.brew_on_tomb;
        delete player.cache.rope_wall_grill;
        delete player.cache.flames_of_zamorak1;
        delete player.cache.flames_of_zamorak2;
        delete player.cache.flames_of_zamorak3;
        delete player.cache.doll_of_iban;
        delete player.cache.kardia_cat;
        delete player.cache.poison_on_doll;
        delete player.cache.cons_on_doll;
        delete player.cache.ash_on_doll;
        delete player.cache.shadow_on_doll;
        // reset flag on last map koftik npc
        player.cache.advised_koftik = false;
    } else {
        player.message('the doll is still incomplete');
    }

    return true;
}

// iban disciple: talk
async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== IDS.IBAN_DISCIPLE) {
        return false;
    }

    player.engage(npc);

    await player.say('hi');
    if (
        !player.inventory.isEquipped(IDS.ROBE_OF_ZAMORAK_TOP) ||
        !player.inventory.isEquipped(IDS.ROBE_OF_ZAMORAK_BOTTOM)
    ) {
        await npc.say('an imposter....die scum');
        player.disengage();
        await npc.attack(player);
        return true;
    }

    const selected = Math.floor(Math.random() * 4);
    if (selected === 0) {
        // nothing
    } else if (selected === 1) {
        await npc.say(
            'hail the great one, my lord iban',
            'i die for you again and again'
        );
        await player.say('is that possible?');
        await npc.say(
            'under iban anything is possible',
            'death is only the beginning'
        );
    } else if (selected === 2) {
        await npc.say('som molica aniul demonte');
        await player.say('pardon');
        await npc.say('som molica aniul demonte');
    } else if (selected === 3) {
        await npc.say(
            'iban is our father, our guide',
            'soon he will rule all life'
        );
    }

    player.disengage();
    return true;
}

// kills - demons, kalrag, iban disciple
function demonTeleport(player, npc) {
    if (npc.id === IDS.OTHAINIAN) {
        player.teleport(796, 3541);
    } else if (npc.id === IDS.DOOMION) {
        player.teleport(807, 3541);
    } else if (npc.id === IDS.HOLTHION) {
        player.teleport(807, 3528);
    }
}

// npc id -> matching demon amulet
const DEMON_AMULET = {
    [IDS.OTHAINIAN]: IDS.AMULET_OF_OTHAINIAN,
    [IDS.DOOMION]: IDS.AMULET_OF_DOOMION,
    [IDS.HOLTHION]: IDS.AMULET_OF_HOLTHION
};

async function onNPCDeath(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    if (
        npc.id === IDS.OTHAINIAN ||
        npc.id === IDS.DOOMION ||
        npc.id === IDS.HOLTHION
    ) {
        const amuletId = DEMON_AMULET[npc.id];
        if (!player.cache.doll_of_iban && getStage(player) !== 6) {
            player.message('the demon slumps to the floor');
            demonTeleport(player, npc);
        } else {
            demonTeleport(player, npc);
            player.message('the demon slumps to the floor');
            await world.sleepTicks(3);
            if (!player.inventory.has(amuletId)) {
                player.message("around it's neck you find a strange looking amulet");
                player.inventory.add(amuletId, 1);
            }
        }
        return false;
    }

    if (npc.id === IDS.KALRAG) {
        player.message('@que@kalrag slumps to the floor');
        await world.sleepTicks(3);
        player.message('@que@poison flows from the corpse over the soil');
        await world.sleepTicks(3);
        if (!player.cache.poison_on_doll && getStage(player) === 6) {
            if (player.inventory.has(IDS.A_DOLL_OF_IBAN)) {
                player.message('@que@you smear the doll of iban in the poisoned blood');
                await world.sleepTicks(3);
                player.message('it smells horrific');
                player.cache.poison_on_doll = true;
            } else {
                player.message('@que@it quikly seeps away into the earth');
                await world.sleepTicks(3);
                player.message('you dare not collect any without ibans doll');
            }
        }
        return false;
    }

    if (npc.id === IDS.IBAN_DISCIPLE) {
        if (getStage(player) === -1) {
            player.message('@que@you search the diciples remains');
            await world.sleepTicks(3);
            if (
                !player.inventory.has(IDS.STAFF_OF_IBAN) &&
                !player.inventory.has(IDS.STAFF_OF_IBAN_BROKEN)
            ) {
                player.message('and find a staff of iban');
                player.inventory.add(IDS.STAFF_OF_IBAN_BROKEN, 1);
            } else {
                player.message('but find nothing');
            }
        } else {
            world.addPlayerDrop(
                player,
                { id: IDS.ROBE_OF_ZAMORAK_TOP, amount: 1 },
                npc.x,
                npc.y
            );
            world.addPlayerDrop(
                player,
                { id: IDS.ROBE_OF_ZAMORAK_BOTTOM, amount: 1 },
                npc.x,
                npc.y
            );
        }
        return false;
    }

    return false;
}

module.exports = { onUseWithGameObject, onTalkToNPC, onNPCDeath };
