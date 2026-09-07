// tool-slicing and sugarcane-sweetening recipes: coconut+machette, dragonfruit+knife,
// and sugar cane + fruit chunks/slices -> sweetened chunks/slices

const items = require('@2003scape/rsc-data/config/items');

let NAME_INDEX = null;
function resolveByName(name) {
    if (!NAME_INDEX) {
        NAME_INDEX = new Map();
        for (let id = 0; id < items.length; id += 1) {
            const def = items[id];
            if (def && def.name) {
                const key = def.name.toLowerCase();
                if (!NAME_INDEX.has(key)) {
                    NAME_INDEX.set(key, id);
                }
            }
        }
    }

    const found = NAME_INDEX.get(name.toLowerCase());
    if (found === undefined) {
        throw new RangeError(`custom-inv-use-on-item.js: no item named "${name}"`);
    }
    return found;
}

let IDS = null;
function ids() {
    if (IDS) {
        return IDS;
    }

    IDS = {
        coconut: resolveByName('coconut'),
        machette: resolveByName('Machette'),
        halfCoconut: resolveByName('Half coconut'),
        dragonfruit: resolveByName('dragonfruit'),
        slicedDragonfruit: resolveByName('sliced dragonfruit'),
        knife: resolveByName('Knife'),
        sugarCane: resolveByName('sugar cane'),
        sweetenedChunks: resolveByName('Sweetened Chunks'),
        sweetenedSlices: resolveByName('Sweetened Slices'),
        chunks: [
            resolveByName('lime chunks'),
            resolveByName('Diced lemon'),
            resolveByName('Diced orange'),
            resolveByName('Diced grapefruit'),
            resolveByName('Pineapple chunks')
        ],
        slices: [
            resolveByName('lime slices'),
            resolveByName('lemon slices'),
            resolveByName('orange slices'),
            resolveByName('grapefruit slices'),
            resolveByName('Pineapple ring')
        ]
    };

    return IDS;
}

function isSugarSweetenPair(id1, id2, fruitList) {
    const { sugarCane } = ids();
    if (id1 === sugarCane && fruitList.indexOf(id2) !== -1) {
        return true;
    }
    return id2 === sugarCane && fruitList.indexOf(id1) !== -1;
}

// consume the sliceable item, keep the tool, give the sliced result
async function slice(player, sliceableId, sliceMessage, resultId) {
    if (!player.inventory.has(sliceableId)) {
        return;
    }
    player.message(sliceMessage);
    player.inventory.remove(sliceableId, 1);
    player.inventory.add(resultId, 1);
}

// consume one sugar cane + one fruit item, give the sweetened result
async function sweeten(player, fruitId, resultId, message) {
    const { sugarCane } = ids();
    if (!player.inventory.has(sugarCane) || !player.inventory.has(fruitId)) {
        return;
    }
    player.message(message);
    player.inventory.remove(sugarCane, 1);
    player.inventory.remove(fruitId, 1);
    player.inventory.add(resultId, 1);
}

async function onUseWithInventory(player, item1, item2) {
    const id = ids();
    const id1 = item1.id;
    const id2 = item2.id;

    if (
        (id1 === id.coconut && id2 === id.machette) ||
        (id2 === id.coconut && id1 === id.machette)
    ) {
        await slice(
            player,
            id.coconut,
            'You slice open the coconut with the machette',
            id.halfCoconut
        );
        return true;
    }

    if (
        (id1 === id.dragonfruit && id2 === id.knife) ||
        (id2 === id.dragonfruit && id1 === id.knife)
    ) {
        await slice(
            player,
            id.dragonfruit,
            'You peel the dragonfruit with the knife',
            id.slicedDragonfruit
        );
        return true;
    }

    if (isSugarSweetenPair(id1, id2, id.chunks)) {
        const fruitId = id.chunks.indexOf(id1) !== -1 ? id1 : id2;
        await sweeten(player, fruitId, id.sweetenedChunks, 'You sweeten the fruit chunks');
        return true;
    }

    if (isSugarSweetenPair(id1, id2, id.slices)) {
        const fruitId = id.slices.indexOf(id1) !== -1 ? id1 : id2;
        await sweeten(player, fruitId, id.sweetenedSlices, 'You sweeten the fruit slices');
        return true;
    }

    return false;
}

module.exports = { onUseWithInventory };
