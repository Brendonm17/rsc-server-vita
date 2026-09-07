// watchtower mechanism. handles:
//  - use og's key on toban's chest
//  - combine relic parts, bat bones on vial
//  - give relic parts/crystals/potion/vial/skavid map to the wizard, death-rune
//    to the city guard, nightshade to the cave-entrance ogre guard
//  - take shaman robe and the four powering crystals

const { questsEnabled } = require('../../custom-gate.js');

const {
    QUEST_KEY,
    WATCHTOWER_WIZARD_ID,
    CITY_GUARD_ID,
    OGRE_GUARD_CAVE_ENTRANCE_ID,
    TOBAN_CHEST_CLOSED,
    TOBAN_CHEST_OPEN,
    KEY_ID,
    STOLEN_GOLD_ID,
    OGRE_RELIC_PART_BODY_ID,
    OGRE_RELIC_PART_BASE_ID,
    OGRE_RELIC_PART_HEAD_ID,
    OGRE_RELIC_ID,
    POWERING_CRYSTAL1_ID,
    POWERING_CRYSTAL2_ID,
    POWERING_CRYSTAL3_ID,
    POWERING_CRYSTAL4_ID,
    BAT_BONES_ID,
    VIAL_ID,
    EMPTY_VIAL_ID,
    SKAVID_MAP_ID,
    UNFINISHED_OGRE_POTION_ID,
    OGRE_POTION_ID,
    MAGIC_OGRE_POTION_ID,
    DEATH_RUNE_ID,
    NIGHTSHADE_ID,
    SHAMAN_ROBE_ID,
    ARMOUR_ID,
    WATCH_TOWER_EYE_PATCH_ID,
    ROBE_ID,
    DAGGER_ID,
    GOBLIN_ARMOUR_ID,
    EYE_PATCH_ID,
    IRON_DAGGER_ID,
    WIZARDS_ROBE_ID,
    ifNearVisNpc
} = require('./ids.js');

function stage(player) {
    return player.questStages[QUEST_KEY] || 0;
}

const RELIC_PART_IDS = [
    OGRE_RELIC_PART_BODY_ID,
    OGRE_RELIC_PART_BASE_ID,
    OGRE_RELIC_PART_HEAD_ID
];

// openChest(obj, 2000, TOBAN_CHEST_OPEN)
async function openTobanChest(player, gameObject) {
    const { world } = player;
    const open = world.replaceEntity('gameObjects', gameObject, TOBAN_CHEST_OPEN);
    world.setTickTimeout(() => {
        world.replaceEntity('gameObjects', open, TOBAN_CHEST_CLOSED);
    }, 3);
    if (player.inventory.has(STOLEN_GOLD_ID)) {
        player.message('@que@You have already got the stolen gold');
        await world.sleepTicks(3);
    } else {
        player.message('You find a stash of gold inside');
        player.message('@que@You take the gold');
        await world.sleepTicks(3);
        player.inventory.add(STOLEN_GOLD_ID, 1);
    }
    player.message('The chest springs shut');
}

async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === TOBAN_CHEST_CLOSED && item.id === KEY_ID) {
        await openTobanChest(player, gameObject);
        return true;
    }

    return false;
}

async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) {
        return false;
    }

    const isRelic1 = RELIC_PART_IDS.includes(item1.id);
    const isRelic2 = RELIC_PART_IDS.includes(item2.id);
    if (isRelic1 && isRelic2) {
        player.message(
            "I think these fit together, but I can't seem to make it fit"
        );
        player.message(
            'I am going to need someone with more experience to help me with this'
        );
        return true;
    }

    const ids = [item1.id, item2.id];
    if (ids.includes(BAT_BONES_ID) && ids.includes(VIAL_ID)) {
        player.message('The bat bones are to bulky to fit in the vial');
        return true;
    }

    return false;
}

function hasAllCrystals(player) {
    return (
        player.inventory.has(POWERING_CRYSTAL1_ID) &&
        player.inventory.has(POWERING_CRYSTAL2_ID) &&
        player.inventory.has(POWERING_CRYSTAL3_ID) &&
        player.inventory.has(POWERING_CRYSTAL4_ID)
    );
}

async function lastCrystalChat(player, npc) {
    await player.say('This is the last one');
    await npc.say(
        'Magnificent!',
        "At last you've brought all the crystals",
        'Now the shield generator can be activated again',
        'And once again Yanille will be safe',
        'From the threat of the ogres',
        'Throw the lever to activate the system...'
    );
    if (stage(player) === 9) {
        player.questStages[QUEST_KEY] = 10;
    }
}

async function crystalToWizard(player, npc, item) {
    if (stage(player) === 10 || stage(player) === -1) {
        await npc.say('More crystals ?', "I don't need any more now...");
        return;
    }

    if (item.id === POWERING_CRYSTAL1_ID) {
        await player.say('Wizard, look what I have found');
        await npc.say(
            'Well done! well done!',
            "That's a crystal found!",
            'You are clever',
            'Hold onto it until you have all four...'
        );
    } else if (item.id === POWERING_CRYSTAL2_ID) {
        await player.say('Wizard, I have another crystal');
        await npc.say(
            'Superb!',
            'Keep up the good work',
            'Hold onto it until you have all four...'
        );
    } else if (item.id === POWERING_CRYSTAL3_ID) {
        await player.say('Wizard, here is another crystal');
        await npc.say(
            "I must say i'm impressed",
            'May Saradomin speed you in finding them all',
            'Hold onto it until you have all four...'
        );
    } else if (item.id === POWERING_CRYSTAL4_ID) {
        await npc.say('Well done! Well done!');
    }

    if (hasAllCrystals(player)) {
        await lastCrystalChat(player, npc);
    } else {
        await npc.say(
            'Keep searching for the others',
            "If you've dropped any...",
            'Then you will need to go back to where you got it from'
        );
        if (item.id === POWERING_CRYSTAL4_ID && !player.cache.crystal_rock) {
            player.cache.crystal_rock = true;
        }
    }
}

async function relicParts(player, npc) {
    if (
        player.cache.wizard_relic_part_1 &&
        player.cache.wizard_relic_part_2 &&
        player.cache.wizard_relic_part_3
    ) {
        await npc.say(
            'Excellent! that seems to be all the pieces',
            'Now I can assemble it...',
            'Hmm, yes it is as I thought...',
            'A statue symbolising an ogre warrior of old',
            'Well, if you ever wanted to make friends with an ogre',
            'Then this is the item to have!'
        );
        player.message('The wizard gives you a complete statue');
        player.inventory.add(OGRE_RELIC_ID, 1);
        if (stage(player) === 2) {
            player.questStages[QUEST_KEY] = 3;
        }
    } else {
        await npc.say('There may be more parts to find...', "I'll keep this for later");
    }
}

async function relicPartToWizard(player, npc, item) {
    if (item.id === OGRE_RELIC_PART_BODY_ID) {
        await player.say('I had this given to me');
        if (
            player.cache.wizard_relic_part_1 ||
            stage(player) === 10 ||
            stage(player) === -1
        ) {
            await npc.say('I already have that part...');
        } else {
            player.inventory.remove(OGRE_RELIC_PART_BODY_ID);
            await npc.say("It's part of an ogre relic");
            player.cache.wizard_relic_part_1 = true;
            await relicParts(player, npc);
        }
    } else if (item.id === OGRE_RELIC_PART_BASE_ID) {
        await player.say('I got given this by an ogre');
        if (
            player.cache.wizard_relic_part_2 ||
            stage(player) === 10 ||
            stage(player) === -1
        ) {
            await npc.say('I already have that part...');
        } else {
            player.inventory.remove(OGRE_RELIC_PART_BASE_ID);
            await npc.say('Good good,a part of an ogre relic');
            player.cache.wizard_relic_part_2 = true;
            await relicParts(player, npc);
        }
    } else if (item.id === OGRE_RELIC_PART_HEAD_ID) {
        await player.say('An ogre gave me this');
        if (
            player.cache.wizard_relic_part_3 ||
            stage(player) === 10 ||
            stage(player) === -1
        ) {
            await npc.say('I already have that part...');
        } else {
            player.inventory.remove(OGRE_RELIC_PART_HEAD_ID);
            await npc.say("Ah, it's part of an old ogre statue");
            player.cache.wizard_relic_part_3 = true;
            await relicParts(player, npc);
        }
    }
}

const EVIDENCE_IDS = new Set([
    ARMOUR_ID,
    WATCH_TOWER_EYE_PATCH_ID,
    ROBE_ID,
    DAGGER_ID,
    GOBLIN_ARMOUR_ID,
    EYE_PATCH_ID,
    IRON_DAGGER_ID,
    WIZARDS_ROBE_ID
]);

async function useOnWizard(player, npc, item) {
    if (
        [
            POWERING_CRYSTAL1_ID,
            POWERING_CRYSTAL2_ID,
            POWERING_CRYSTAL3_ID,
            POWERING_CRYSTAL4_ID
        ].includes(item.id)
    ) {
        await crystalToWizard(player, npc, item);
        return;
    }

    if (RELIC_PART_IDS.includes(item.id)) {
        await relicPartToWizard(player, npc, item);
        return;
    }

    if (item.id === OGRE_RELIC_ID) {
        await player.say('What is this ?');
        await npc.say('It is the ogre statue I finished for you...');
        return;
    }

    if (item.id === VIAL_ID) {
        await npc.say('Oh lovely, fresh water...thanks!');
        player.inventory.remove(VIAL_ID);
        player.inventory.add(EMPTY_VIAL_ID, 1);
        return;
    }

    if (item.id === SKAVID_MAP_ID) {
        player.message('You give the map to the wizard');
        await npc.say(
            'Well well! a map!',
            'Indeed this shows the paths into the skavid caves',
            'I suggest you search these now...'
        );
        return;
    }

    if (item.id === UNFINISHED_OGRE_POTION_ID) {
        await npc.say('No no, the potion is not complete yet...');
        return;
    }

    if (item.id === OGRE_POTION_ID) {
        if (stage(player) === -1) {
            await npc.say(
                'Another potion ?',
                "Ooo no, I don't think so...",
                "I can't let you use this anymore, it is just too dangerous",
                "I'd better take it from you before you injure yourself"
            );
            player.inventory.remove(OGRE_POTION_ID);
            return;
        }
        await player.say('Yes I have made the potion');
        await npc.say("That's great news, let me infuse it with magic...");
        player.message('The wizard mutters strange words over the liquid');
        player.inventory.remove(OGRE_POTION_ID);
        player.inventory.add(MAGIC_OGRE_POTION_ID, 1);
        await npc.say(
            'Here it is, a dangerous substance',
            'I must remind you that this potion can only be used',
            'If your magic ability is high enough'
        );
        if (stage(player) === 7) {
            player.questStages[QUEST_KEY] = 8;
        }
        return;
    }

    if (item.id === MAGIC_OGRE_POTION_ID) {
        await npc.say(
            'Yes that is the potion I enchanted for you',
            'Go and use it now...'
        );
        return;
    }

    if (EVIDENCE_IDS.has(item.id)) {
        if (stage(player) !== 1) {
            player.message('The wizard has no need for more evidence');
            return;
        }
        if (item.id === EYE_PATCH_ID) {
            await player.say('I found this eye patch');
        } else if (item.id === GOBLIN_ARMOUR_ID) {
            await player.say('Have a look at this goblin armour');
        } else if (item.id === IRON_DAGGER_ID) {
            await player.say('I found a dagger');
        } else if (item.id === WIZARDS_ROBE_ID) {
            await player.say('I have this robe');
        }
        await npc.say(
            'Let me see...',
            'No, sorry this is not evidence',
            'You need to keep searching im afraid'
        );
        return;
    }

    player.message('Nothing interesting happens');
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.equipped) {
        return false;
    }

    if (npc.id === WATCHTOWER_WIZARD_ID) {
        // fingernails handled in index.js, everything else on the wizard here
        const {
            FINGERNAILS_ID
        } = require('./ids.js');
        if (item.id === FINGERNAILS_ID) {
            return false;
        }
        player.engage(npc);
        await useOnWizard(player, npc, item);
        player.disengage();
        return true;
    }

    if (npc.id === CITY_GUARD_ID && item.id === DEATH_RUNE_ID) {
        player.engage(npc);
        if (player.cache.city_guard_riddle === true || stage(player) === -1) {
            player.message('The guard is not listening to you');
        } else {
            player.inventory.remove(DEATH_RUNE_ID);
            player.inventory.add(SKAVID_MAP_ID, 1);
            if (stage(player) === 3) {
                player.questStages[QUEST_KEY] = 4;
            }
            // player solved the riddle
            player.cache.city_guard_riddle = true;
            await player.say('I worked it out!');
            await npc.say(
                'Well well.. the imp has done it!',
                'Thanks for the rune',
                'This is what you be needing...'
            );
            player.message('The guard gives you a map');
        }
        player.disengage();
        return true;
    }

    if (npc.id === OGRE_GUARD_CAVE_ENTRANCE_ID && item.id === NIGHTSHADE_ID) {
        player.engage(npc);
        // guard occupied at stage 0-4 or when complete (-1): region stays locked
        if ((stage(player) >= 0 && stage(player) < 5) || stage(player) === -1) {
            player.message('The guard is occupied at the moment');
        } else {
            player.message('@que@You give the guard some nightshade');
            player.inventory.remove(NIGHTSHADE_ID);
            await npc.say(
                'What is this!!!',
                'Arrrrgh! I cannot stand this plant!',
                'Ahhh, it burns! it burns!!!'
            );
            player.message("You run past the guard while he's busy...");
            player.disengage();
            player.teleport(647, 3644);
            return true;
        }
        player.disengage();
        return true;
    }

    return false;
}

async function onGroundItemTake(player, groundItem) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (groundItem.id === SHAMAN_ROBE_ID) {
        player.message('You take the robe');
        player.inventory.add(SHAMAN_ROBE_ID, 1);
        player.world.removeEntity('groundItems', groundItem);
        if (stage(player) === 5) {
            player.questStages[QUEST_KEY] = 6;
        }
        return true;
    }

    const crystalIds = [
        POWERING_CRYSTAL1_ID,
        POWERING_CRYSTAL2_ID,
        POWERING_CRYSTAL3_ID,
        POWERING_CRYSTAL4_ID
    ];
    if (crystalIds.includes(groundItem.id)) {
        // completed-quest (-1) crystals restore magic instead of being taken
        if (stage(player) === -1) {
            player.message('@que@You try and take the crystal but its stuck solid!');
            await player.world.sleepTicks(3);
            player.message('@que@You feel magic power coursing through the crystal...');
            await player.world.sleepTicks(3);
            player.message('@que@The force renews your magic level');
            await player.world.sleepTicks(3);
            const maxMagic = player.skills.magic.base;
            if (player.skills.magic.current < maxMagic) {
                player.skills.magic.current = maxMagic;
                player.sendStats();
            }
        } else {
            player.message('You take the crystal');
            player.inventory.add(groundItem.id, 1);
            player.world.removeEntity('groundItems', groundItem);
        }
        return true;
    }

    return false;
}

module.exports = {
    onUseWithGameObject,
    onUseWithInventory,
    onUseWithNPC,
    onGroundItemTake
};
