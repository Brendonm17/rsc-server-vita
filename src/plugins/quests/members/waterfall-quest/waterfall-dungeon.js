// waterfall quest: waterfall & dungeon side

const {
    GLARIALS_AMULET_ID,
    GLARIALS_URN_ID,
    GLARIALS_URN_EMPTY_ID,
    BOOK_ON_BAXTORIAN_ID,
    AN_OLD_KEY_ID,
    ROPE_ID,
    AIR_RUNE_ID,
    WATER_RUNE_ID,
    EARTH_RUNE_ID,
    MITHRIL_SEED_ID,
    GOLD_BAR_ID,
    DIAMOND_ID,
    STONE_STAND_IDS,
    QUEST_POINTS,
    HUDON_ID,
    MES_DELAY
} = require('./index.js');

const { questsEnabled } = require('../../custom-gate.js');

// object ids
const RAFT_ID = 464;
const LEAFLESS_TREE_462 = 462;
const LEAFLESS_TREE_463 = 463;
const LEAFLESS_TREE_482 = 482;
const WATERFALL_RAPIDS_ID = 469;
const BOOKCASE_ID = 470;
const TOMB_DOORS_ID = 471;
const OLD_KEY_CRATE_ID = 492;
const STATUE_ID = 483;
const CHALICE_EMPTY_ID = 485;
const PASSAGE_DOORWAY_ID = 486;

// wall object
const LOCKED_COFFIN_DOOR_ID = 135;

// integer random helper, inclusive both ends
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function article(word) {
    const c = word.toLowerCase().charAt(0);

    if (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u') {
        return 'an';
    }

    return 'a';
}

// wash the player over the waterfall to the river side
async function washOverWaterfall(player) {
    player.teleport(654, 485);
    player.damage(random(4, 10));
    await player.say('ouch!');
    player.message('@que@you tumble over the water fall');
    await player.world.sleepTicks(MES_DELAY);
    player.message('@que@and are washed up by the river side');
    await player.world.sleepTicks(MES_DELAY);
}

// onoploc branches (command-one for these objects)

// the raft behind Almera's house
async function boardRaft(player) {
    player.message('@que@you board the small raft');
    await player.world.sleepTicks(MES_DELAY);
    player.message('@que@and push off down stream');
    await player.world.sleepTicks(MES_DELAY);
    player.message('@que@the raft is pulled down stream by strong currents');
    await player.world.sleepTicks(MES_DELAY);
    player.message('@que@you crash into a small land mound');
    await player.world.sleepTicks(MES_DELAY);
    player.teleport(662, 463);

    const hudon = player.world.npcs.getByID(HUDON_ID);

    if (hudon && player.questStages.waterfallQuest === 1) {
        player.engage(hudon);
        await player.say('hello son, are you okay?');
        await hudon.say('it looks like you need the help');
        await player.say('your mum sent me to find you');
        await hudon.say("don't play nice with me");
        await hudon.say('i know your looking for the treasure');
        await player.say('where is this treasure you talk of?');
        await hudon.say("just because i'm small doesn't mean i'm dumb");
        await hudon.say('if i told you, you would take it all for yourself');
        await player.say('maybe i could help');
        await hudon.say("i'm fine alone");
        player.questStages.waterfallQuest = 2;
        player.message('@que@hudon is refusing to leave the waterfall');
        await player.world.sleepTicks(MES_DELAY);
        player.disengage();
    }
}

// onoploc handler (command one)
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;

    if (id === RAFT_ID) {
        await boardRaft(player);
        return true;
    }

    // "jump off" is command one on the leafless trees
    if (
        id === LEAFLESS_TREE_463 ||
        id === LEAFLESS_TREE_462 ||
        id === LEAFLESS_TREE_482
    ) {
        player.message('@que@you jump into the wild rapids');
        await player.world.sleepTicks(MES_DELAY);
        await washOverWaterfall(player);
        return true;
    }

    if (id === WATERFALL_RAPIDS_ID) {
        player.message('@que@you jump into the wild rapids below');
        await player.world.sleepTicks(MES_DELAY);
        await washOverWaterfall(player);
        return true;
    }

    if (id === BOOKCASE_ID) {
        player.message('@que@you search the bookcase');
        await player.world.sleepTicks(MES_DELAY);

        if (!player.inventory.has(BOOK_ON_BAXTORIAN_ID)) {
            player.message("@que@and find a book named 'book on baxtorian'");
            await player.world.sleepTicks(MES_DELAY);
            player.inventory.add(BOOK_ON_BAXTORIAN_ID, 1);
        } else {
            player.message('@que@but find nothing of interest');
            await player.world.sleepTicks(MES_DELAY);
        }

        return true;
    }

    if (id === OLD_KEY_CRATE_ID) {
        player.message('@que@you search the crate');
        await player.world.sleepTicks(MES_DELAY);

        if (!player.inventory.has(AN_OLD_KEY_ID)) {
            player.message('@que@you find an old key');
            await player.world.sleepTicks(MES_DELAY);
            player.inventory.add(AN_OLD_KEY_ID, 1);
        } else {
            player.message('it is empty');
        }

        return true;
    }

    if (id === CHALICE_EMPTY_ID) {
        if (player.questStages.waterfallQuest === -1) {
            player.message('@que@the chalice is empty');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@it will not move');
        } else {
            player.message('@que@as you touch the chalice it tips over');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@it falls to the floor');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@you hear a gushing of water');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@water floods into the cavern');
            await player.world.sleepTicks(MES_DELAY);
            player.damage(random(1, 10));
            player.teleport(654, 485);
            player.message('ouch!');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@you tumble over the water fall');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@and are washed up by the river side');
            await player.world.sleepTicks(MES_DELAY);
        }

        return true;
    }

    if (id === TOMB_DOORS_ID) {
        player.message('@que@the doors begin to open');
        await player.world.sleepTicks(MES_DELAY);

        if (player.inventory.has(GLARIALS_AMULET_ID)) {
            // OpenRSC opens the gate (id 63) then moves the player through
            player.message('@que@You go through the door');
            await player.world.sleepTicks(MES_DELAY);
            player.teleport(gameObject.x, gameObject.y + 1);
        } else {
            player.message('@que@suddenly the corridor floods');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@flushing you back into the river');
            await player.world.sleepTicks(MES_DELAY);
            player.teleport(654, 485);
            player.damage(random(4, 10));
            await player.say('ouch!');
            player.message('@que@you tumble over the water fall');
            await player.world.sleepTicks(MES_DELAY);
        }

        return true;
    }

    if (id === PASSAGE_DOORWAY_ID) {
        player.message('you walk through the doorway');
        player.teleport(667, 3279);
        return true;
    }

    return false;
}

// onoploc command-two: "jump to next" on leafless trees
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;

    if (
        id === LEAFLESS_TREE_463 ||
        id === LEAFLESS_TREE_462 ||
        id === LEAFLESS_TREE_482
    ) {
        player.message('@que@the tree is too far off to jump to');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@you need someway to pull yourself across');
        await player.world.sleepTicks(MES_DELAY);
        return true;
    }

    return false;
}

// onuseloc: use item on object
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const id = gameObject.id;

    // rope on leafless tree: cross to next mound / dungeon passage
    if (
        item.id === ROPE_ID &&
        (id === LEAFLESS_TREE_462 ||
            id === LEAFLESS_TREE_463 ||
            id === LEAFLESS_TREE_482)
    ) {
        player.message('@que@you tie one end of the rope around the tree');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@you tie the other end into a loop');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@and throw it towards the other dead tree');
        await player.world.sleepTicks(MES_DELAY);

        if (id === LEAFLESS_TREE_462) {
            player.message('@que@the rope loops around the tree');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@you lower yourself into the rapidly flowing stream');
            await player.world.sleepTicks(MES_DELAY);
            player.teleport(662, 467);
            player.message('@que@you manage to pull yourself over to the land mound');
            await player.world.sleepTicks(MES_DELAY);
        } else if (id === LEAFLESS_TREE_463) {
            player.message('@que@the rope loops around the tree');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@you lower yourself into the rapidly flowing stream');
            await player.world.sleepTicks(MES_DELAY);
            player.teleport(659, 471);
            player.message('@que@you manage to pull yourself over to the land mound');
            await player.world.sleepTicks(MES_DELAY);
        } else if (id === LEAFLESS_TREE_482) {
            player.message('@que@you gently drop to the rock below');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@under the waterfall there is a secret passage');
            await player.world.sleepTicks(MES_DELAY);
            player.teleport(659, 3305);
        }

        return true;
    }

    // rune on a stand (473-478)
    if (
        STONE_STAND_IDS.includes(id) &&
        (item.id === WATER_RUNE_ID ||
            item.id === AIR_RUNE_ID ||
            item.id === EARTH_RUNE_ID)
    ) {
        const cacheKey = 'waterfall_' + id + '_' + item.id;
        const name = (item.definition && item.definition.name
            ? item.definition.name
            : 'rune'
        ).toLowerCase();

        if (!player.cache[cacheKey]) {
            player.message('you place the ' + name + ' on the stand');
            player.message('the rune stone crumbles into dust');
            player.cache[cacheKey] = true;
            player.inventory.remove(item.id, 1);
        } else {
            player.message(
                'you have already placed ' + article(name) + ' ' + name +
                    ' here'
            );
        }

        return true;
    }

    // amulet on the statue (483)
    if (id === STATUE_ID && item.id === GLARIALS_AMULET_ID) {
        let flag = false;

        // inner loop tests `i` not `y`, so it never runs and flag stays false;
        // the statue always opens on first amulet use (bug kept from openrsc)
        for (let i = 473; i < 478; i++) {
            for (let y = 32; i < 34; i++) {
                if (!player.cache['waterfall_' + i + '_' + y]) {
                    flag = true;
                }
            }
        }

        if (flag) {
            player.message('@que@you place the amulet around the statue');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@nothing happens');
            await player.world.sleepTicks(MES_DELAY);
        } else {
            player.message('@que@you place the amulet around the statue');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@you hear a loud rumble beneath you');
            await player.world.sleepTicks(MES_DELAY);
            player.message('@que@the ground raises up before you');
            await player.world.sleepTicks(MES_DELAY);
            player.teleport(647, 3267);
        }

        return true;
    }

    // urn on the chalice (485) -> take the treasure and complete the quest
    if (id === CHALICE_EMPTY_ID && item.id === GLARIALS_URN_ID) {
        if (player.questStages.waterfallQuest === -1) {
            player.message('You have already completed this quest');
            return true;
        }

        player.message('@que@you carefully poor the ashes in the chalice');
        player.inventory.remove(GLARIALS_URN_ID, 1);
        await player.world.sleepTicks(MES_DELAY);
        player.inventory.add(GLARIALS_URN_EMPTY_ID, 1);
        player.message('@que@as you remove the baxtorian treasure');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@the chalice remains standing');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@inside you find a mithril case');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@containing 40 seeds');
        await player.world.sleepTicks(MES_DELAY);
        player.message("@que@two diamond's and two gold bars");
        await player.world.sleepTicks(MES_DELAY);

        await completeQuest(player);
        return true;
    }

    return false;
}

// OpenRSC handleReward()
async function completeQuest(player) {
    player.questStages.waterfallQuest = -1;
    player.addQuestPoints(QUEST_POINTS);
    player.message('@gre@You haved gained 1 quest point!');
    player.message('you have completed the Baxtorian waterfall quest');

    // clear the rune-stand cache keys (inner loop tests `i` not `y`, never runs)
    for (let i = 473; i < 478; i++) {
        for (let y = 32; i < 34; i++) {
            const key = 'waterfall_' + i + '_' + y;

            if (player.cache[key]) {
                delete player.cache[key];
            }
        }
    }

    player.inventory.add(MITHRIL_SEED_ID, 40);
    player.inventory.add(GOLD_BAR_ID, 2);
    player.inventory.add(DIAMOND_ID, 2);

    player.addExperience('attack', player.skills.attack.base * 900 + 1000, false);
    player.addExperience(
        'strength',
        player.skills.strength.base * 900 + 1000,
        false
    );
}

// onopinv: reading the book / planting a mithril seed
async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id === MITHRIL_SEED_ID) {
        player.message('@que@you open the small mithril case');
        await player.world.sleepTicks(MES_DELAY);

        // OpenRSC refuses if there's already a game object on the tile
        const here = player.world.gameObjects.getAtPoint(player.x, player.y);

        if (here && here.length) {
            player.message("you can't plant a tree here");
            return true;
        }

        player.inventory.remove(MITHRIL_SEED_ID, 1);
        player.message('@que@and drop a seed by your feet');
        await player.world.sleepTicks(MES_DELAY);
        player.message('a tree magically sprouts around you');
        return true;
    }

    if (item.id === BOOK_ON_BAXTORIAN_ID) {
        player.message('@que@the book is old with many pages missing');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@a few are translated from elven into common tongue');
        await player.world.sleepTicks(MES_DELAY);

        if (player.questStages.waterfallQuest === 2) {
            player.questStages.waterfallQuest = 3;
        }

        const menu = await player.ask(
            [
                'the missing relics',
                'the sonnet of baxtorian',
                'the power of nature',
                'ode to eternity'
            ],
            false
        );

        if (menu === 0) {
            player.message(
                '@yel@The Missing Relics',
                'Many artifacts of elven history were lost after the second ' +
                    'age.',
                'The greatest loss to our collection of elf history were the ' +
                    'hidden',
                'treasures of Baxtorian.',
                'Some believe these treasures are still unclaimed, but it is ' +
                    'more',
                'commonly believed that dwarf miners recovered the treasure at',
                'the beginning of the third age.',
                "Another great loss was Glarial's pebble a key which allowed " +
                    'her',
                'ancestors to visit her tomb. The stone was stolen by a gnome',
                'family over a century ago.',
                'It is believed that the gnomes ancestor Glorie still has the ' +
                    'stone',
                'hidden in the caves of the gnome tree village.'
            );
        } else if (menu === 1) {
            player.message(
                '@yel@The Sonnet of Baxtorian',
                'The love between Baxtorian and Glarial was said to have ' +
                    'lasted',
                'over a century. They lived a peaceful life learning and ' +
                    'teaching',
                'the laws of nature.',
                "When Baxtorian's kingdom was invaded by the dark forces he " +
                    'left',
                'on a five year campaign. He returned to find his people',
                'slaughtered and his wife taken by the enemy.',
                'After years of searching for his love he finally gave up, he',
                'returned to the home he made for himself and Glarial under ' +
                    'the',
                'baxtorian waterfall. Once he entered he never returned.',
                'Only Glarial had the power to also enter the waterfall. Since',
                'Baxtorian entered no one but her can follow him in, it\'s as ' +
                    'if the',
                'powers of nature still work to protect him.'
            );
        } else if (menu === 2) {
            player.message(
                '@yel@The Power of Nature',
                'Glarial and Baxtorian were masters of nature. Trees would ' +
                    'grow,',
                'mountains form and rivers flood all to their command. ' +
                    'Baxtorian',
                'in particular had perfected rune lore. It was said that he ' +
                    'could',
                'use the stones to control the water, earth and air.'
            );
        } else if (menu === 3) {
            player.message(
                '@yel@Ode to Eternity',
                '@yel@A Short Piece Written by Baxtorian himself',
                'What care I for this mortal coil, where treasures are yet so ' +
                    'frail,',
                'for it is you that is my life blood, the wine to my holy grail',
                'and if I see the judgement day, when the gods fill the air ' +
                    'with',
                "dust, I'll happily choke on your memory, as my kingdom turns " +
                    'to',
                'rust.'
            );
        }

        return true;
    }

    return false;
}

// locked coffin door (wall object 135)
async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id === LOCKED_COFFIN_DOOR_ID) {
        player.message('the door is locked');
        await player.world.sleepTicks(MES_DELAY);
        player.message('@que@you need a key');
        await player.world.sleepTicks(MES_DELAY);
        return true;
    }

    return false;
}

async function onUseWithWallObject(player, wallObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id === LOCKED_COFFIN_DOOR_ID && item.id === AN_OLD_KEY_ID) {
        player.message('@que@you open the door with the key');
        await player.enterDoor(wallObject);
        player.message('@que@You go through the door');
        await player.world.sleepTicks(MES_DELAY);
        return true;
    }

    return false;
}

module.exports = {
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject,
    onInventoryCommand,
    onWallObjectCommandOne,
    onUseWithWallObject
};
