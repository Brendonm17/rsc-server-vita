// underground pass - item-driven quest mechanisms

const { questsEnabled } = require('../../custom-gate.js');
const IDS = require('./ids.js');

const { QUEST_KEY } = IDS;

function getStage(player) {
    return typeof player.questStages[QUEST_KEY] === 'number'
        ? player.questStages[QUEST_KEY]
        : 0;
}

function itemName(player, item) {
    return item.definition && item.definition.name
        ? item.definition.name.toLowerCase()
        : '';
}

function hasABow(player) {
    return player.inventory.items.some((it) => {
        const name = it.definition && it.definition.name
            ? it.definition.name.toLowerCase()
            : '';
        return name.includes('bow');
    });
}

// use item with item
async function onUseWithInventory(player, item1, item2) {
    if (!questsEnabled(player)) {
        return false;
    }

    const name1 = itemName(player, item1);
    const name2 = itemName(player, item2);

    // damp cloth + arrows -> cloth-wrapped arrow (MechanismMap1)
    const dampCloth =
        (item1.id === IDS.DAMP_CLOTH && name2.includes('arrows')) ||
        (name1.includes('arrows') && item2.id === IDS.DAMP_CLOTH);
    if (dampCloth) {
        const arrowId = name2.includes('arrows') ? item2.id : item1.id;
        player.message('you wrap the damp cloth around the arrow head');
        player.inventory.remove(IDS.DAMP_CLOTH, 1);
        player.inventory.remove(arrowId, 1);
        player.inventory.add(IDS.ARROW, 1);
        return true;
    }

    // smear ingredients onto the doll of iban (SmearDollOfIban)
    const ids = [item1.id, item2.id];
    const isPair = (a, b) => ids.includes(a) && ids.includes(b);

    if (isPair(IDS.IBANS_ASHES, IDS.A_DOLL_OF_IBAN)) {
        player.message('you rub the ashes into the doll');
        player.inventory.remove(IDS.IBANS_ASHES, 1);
        if (!player.cache.ash_on_doll && getStage(player) === 6) {
            player.cache.ash_on_doll = true;
        }
        return true;
    }

    if (isPair(IDS.IBANS_CONSCIENCE, IDS.A_DOLL_OF_IBAN)) {
        const { world } = player;
        player.message('you crumble the doves skeleton into dust');
        await world.sleepTicks(3);
        player.message('and rub it into the doll');
        player.inventory.remove(IDS.IBANS_CONSCIENCE, 1);
        if (!player.cache.cons_on_doll && getStage(player) === 6) {
            player.cache.cons_on_doll = true;
        }
        return true;
    }

    if (isPair(IDS.IBANS_SHADOW, IDS.A_DOLL_OF_IBAN)) {
        const { world } = player;
        player.message('you pour the strange liquid over the doll');
        await world.sleepTicks(3);
        player.message('it seeps into the cotton');
        player.inventory.remove(IDS.IBANS_SHADOW, 1);
        if (!player.cache.shadow_on_doll && getStage(player) === 6) {
            player.cache.shadow_on_doll = true;
        }
        return true;
    }

    return false;
}

// use item with object
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;

    // cloth-wrapped arrow + fire -> lit arrow (MechanismMap1)
    if (item.id === IDS.ARROW && gameObject.id === IDS.FIRE) {
        player.message('you light the cloth wrapped arrow head');
        player.inventory.remove(IDS.ARROW, 1);
        player.inventory.add(IDS.LIT_ARROW, 1);
        return true;
    }

    // lit arrow + old bridge: burn the rope, stage 2->3
    if (item.id === IDS.LIT_ARROW && gameObject.id === IDS.OLD_BRIDGE) {
        if (hasABow(player)) {
            player.inventory.remove(IDS.LIT_ARROW, 1);
            if (player.skills.ranged.current < 25) {
                player.message('you fire the lit arrow at the bridge');
                await world.sleepTicks(3);
                player.message('it burns out and has little effect');
                await world.sleepTicks(3);
            } else if (Math.floor(Math.random() * 5) === 1) {
                player.message('you fire your arrow at the rope supporting the bridge');
                await world.sleepTicks(3);
                player.message('the arrow just misses the rope');
            } else {
                player.message('you fire your arrow at the rope supporting the bridge');
                await world.sleepTicks(3);
                if (getStage(player) === 2) {
                    player.questStages[QUEST_KEY] = 3;
                }
                player.message(
                    'the arrow impales the wooden bridge, just below the rope support'
                );
                await world.sleepTicks(3);
                player.message('the rope catches alight and begins to burn');
                await world.sleepTicks(3);
                player.message('the bridge swings down creating a walkway');
                await world.sleepTicks(3);
                player.message('you rush across the bridge');
                player.teleport(709, 3420);
            }
        } else {
            player.message("first you'll need a bow");
        }
        return true;
    }

    // rope + stalactite -> pull up (MechanismMap1)
    if (
        item.id === IDS.ROPE &&
        (gameObject.id === IDS.STALACTITE_1 || gameObject.id === IDS.STALACTITE_2)
    ) {
        player.message('you lasso the rope around the stalactite');
        await world.sleepTicks(3);
        player.message('and pull yourself up');
        await world.sleepTicks(3);
        if (gameObject.id === IDS.STALACTITE_1) {
            player.teleport(695, 3435);
        } else {
            player.teleport(677, 3435);
        }
        player.message('you climb from stalactite to stalactite and over the rocks');
        return true;
    }

    // rocks + swamp -> cross (MechanismMap1)
    if (
        item.id === IDS.ROCKS &&
        (gameObject.id === IDS.SWAMP_754 || gameObject.id === IDS.SWAMP_795)
    ) {
        player.message('you throw the rocks onto the swamp');
        await world.sleepTicks(3);
        player.message('and carefully tread from one to another');
        player.inventory.remove(IDS.ROCKS, 1);
        if (gameObject.id === IDS.SWAMP_754) {
            player.teleport(700, 3441);
        } else {
            player.teleport(715, 3416);
        }
        return true;
    }

    // rope + wall grill east (MechanismMap2)
    if (item.id === IDS.ROPE && gameObject.id === IDS.WALL_GRILL_EAST) {
        player.message('you tie the rope to the grill...');
        await world.sleepTicks(3);
        player.message('..and poke it through to the otherside');
        if (!player.cache.rope_wall_grill) {
            player.cache.rope_wall_grill = true;
        }
        return true;
    }

    // plank + passage (MechanismMap2)
    if (item.id === IDS.PLANK && gameObject.id === IDS.PASSAGE) {
        player.message('you carefully place the planks over the pressure triggers');
        player.message('you walk across the wooden planks');
        player.inventory.remove(IDS.PLANK, 1);
        player.teleport(735, 3489);
        return true;
    }

    // railing + boulder: tip it, stage 3->4
    if (item.id === IDS.RAILING && gameObject.id === IDS.BOULDER) {
        player.message('you use the pole as leverage...');
        await world.sleepTicks(3);
        player.message('..and tip the bolder onto its side');
        await world.sleepTicks(3);
        player.message('it tumbles down the slope');
        if (getStage(player) === 3) {
            player.questStages[QUEST_KEY] = 4;
        }
        return true;
    }

    // offerings + flames of zamorak (MechanismMap2)
    if (gameObject.id === IDS.FLAMES_OF_ZAMORAK) {
        if (item.id === IDS.STAFF_OF_IBAN) {
            player.message('you hold the staff above the well');
            player.message('and feel the power of zamorak flow through you');
            player.cache['Iban blast_casts'] = 25;
            return true;
        }

        const offerings = [
            IDS.UNICORN_HORN,
            IDS.COAT_OF_ARMS_RED,
            IDS.COAT_OF_ARMS_BLUE
        ];
        if (offerings.includes(item.id)) {
            const name = itemName(player, item);
            player.message('you throw the ' + name + ' into the flames');
            await world.sleepTicks(3);
            const stage = getStage(player);
            if (stage !== 7 && stage !== 8 && stage !== -1) {
                if (item.id === IDS.UNICORN_HORN && !player.cache.flames_of_zamorak1) {
                    player.cache.flames_of_zamorak1 = true;
                }
                if (
                    item.id === IDS.COAT_OF_ARMS_RED &&
                    !player.cache.flames_of_zamorak2
                ) {
                    player.cache.flames_of_zamorak2 = true;
                }
                if (item.id === IDS.COAT_OF_ARMS_BLUE) {
                    if (typeof player.cache.flames_of_zamorak3 !== 'number') {
                        player.cache.flames_of_zamorak3 = 1;
                    } else if (player.cache.flames_of_zamorak3 < 2) {
                        player.cache.flames_of_zamorak3 += 1;
                    }
                }
            }
            player.inventory.remove(item.id, 1);
            player.message('you hear a howl in the distance');
            return true;
        }
    }

    // orb of light + furnace (Orbs)
    const orbs = [
        IDS.ORB_OF_LIGHT_WHITE,
        IDS.ORB_OF_LIGHT_BLUE,
        IDS.ORB_OF_LIGHT_PINK,
        IDS.ORB_OF_LIGHT_YELLOW
    ];
    if (gameObject.id === IDS.FURNACE && orbs.includes(item.id)) {
        player.message('you throw the glowing orb into the furnace');
        player.message('its light quickly dims and then dies');
        await world.sleepTicks(3);
        player.message('you feel a cold shudder run down your spine');
        player.inventory.remove(item.id, 1);
        const stage = getStage(player);
        if (stage !== 7 && stage !== 8 && stage !== -1) {
            if (item.id === IDS.ORB_OF_LIGHT_WHITE && !player.cache.orb_of_light1) {
                player.cache.orb_of_light1 = true;
            } else if (item.id === IDS.ORB_OF_LIGHT_BLUE && !player.cache.orb_of_light2) {
                player.cache.orb_of_light2 = true;
            } else if (item.id === IDS.ORB_OF_LIGHT_PINK && !player.cache.orb_of_light3) {
                player.cache.orb_of_light3 = true;
            } else if (item.id === IDS.ORB_OF_LIGHT_YELLOW && !player.cache.orb_of_light4) {
                player.cache.orb_of_light4 = true;
            }
        }
        return true;
    }

    // dwarf brew / tinderbox on the Tomb of Iban (DungeonFloor)
    if (gameObject.id === IDS.TOMB_OF_IBAN && item.id === IDS.DWARF_BREW) {
        if (player.cache.doll_of_iban && getStage(player) === 6) {
            player.message('you pour the strong alcohol over the tomb');
            if (!player.cache.brew_on_tomb && !player.cache.ash_on_doll) {
                player.cache.brew_on_tomb = true;
            }
            player.inventory.remove(IDS.DWARF_BREW, 1);
            player.inventory.add(IDS.BUCKET, 1);
        } else {
            player.message('you consider pouring the brew over the grave');
            await world.sleepTicks(3);
            player.message('but it seems such a waste');
        }
        return true;
    }

    if (gameObject.id === IDS.TOMB_OF_IBAN && item.id === IDS.TINDERBOX) {
        player.message('you try to set alight to the tomb');
        await world.sleepTicks(3);
        if (player.cache.brew_on_tomb && !player.cache.ash_on_doll) {
            player.message('it bursts into flames');
            await world.sleepTicks(3);
            player.message('you search through the remains');
            await world.sleepTicks(3);
            if (!player.inventory.has(IDS.IBANS_ASHES)) {
                player.message('and find the ashes of ibans corpse');
                player.inventory.add(IDS.IBANS_ASHES, 1);
            } else {
                player.message('but find nothing');
            }
            delete player.cache.brew_on_tomb;
        } else {
            player.message('but it will not light');
        }
        return true;
    }

    return false;
}

module.exports = { onUseWithInventory, onUseWithGameObject };
