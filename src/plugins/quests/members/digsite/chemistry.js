// The Dig Site (members) - dangerous chemicals, the brick wall and the tent
// chest. barrel open/closed and chest locked/open states toggle via replaceEntity

const { questsEnabled } = require('../../custom-gate.js');
const {
    X_BARREL_ID,
    X_BARREL_OPEN_ID,
    BRICK_ID,
    TENT_CHEST_LOCKED_ID,
    TENT_CHEST_OPEN_ID,
    ROCK_PICK_ID,
    TROWEL_ID,
    SPADE_ID,
    IRON_DAGGER_ID,
    BROKEN_ARROW_ID,
    BRONZE_PICKAXE_ID,
    PANNING_TRAY_ID,
    SPECIMEN_JAR_ID,
    JUG_ID,
    VASE_ID,
    EMPTY_VIAL_ID,
    UNIDENTIFIED_LIQUID_ID,
    UNIDENTIFIED_POWDER_ID,
    NITROGLYCERIN_ID,
    MIXED_CHEMICALS_1_ID,
    MIXED_CHEMICALS_2_ID,
    EXPLOSIVE_COMPOUND_ID,
    TINDERBOX_ID,
    DIGSITE_CHEST_KEY_ID
} = require('./constants.js');

function currentHits(player) {
    return player.skills.hits.current;
}

// drop obj
async function onDropItem(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (item.id === UNIDENTIFIED_LIQUID_ID) {
        player.message('bang!');
        player.inventory.remove(UNIDENTIFIED_LIQUID_ID);
        player.damage(Math.trunc(currentHits(player) * 0.3 + 5));
        await player.say('Ow!');
        player.message('The liquid exploded!');
        player.message('You were injured by the burning liquid');
        return true;
    }

    if (item.id === MIXED_CHEMICALS_1_ID || item.id === MIXED_CHEMICALS_2_ID) {
        player.message('bang!');
        player.inventory.remove(item.id);
        player.damage(Math.trunc(currentHits(player) / 2 + 6));
        await player.say('Ow!');
        player.message('The chemicals exploded!');
        player.message('You were injured by the exploding liquid');
        return true;
    }

    if (item.id === NITROGLYCERIN_ID) {
        player.message('bang!');
        player.inventory.remove(NITROGLYCERIN_ID);
        player.damage(Math.trunc(currentHits(player) / 2 - 3));
        await player.say('Ow!');
        player.message('The nitroglycerin exploded!');
        player.message('You were injured by the exploding liquid');
        return true;
    }

    if (item.id === EXPLOSIVE_COMPOUND_ID) {
        player.message('bang!');
        await player.world.sleepTicks(3);
        player.inventory.remove(EXPLOSIVE_COMPOUND_ID);
        player.damage(61);
        await player.say('Ow!');
        player.message('The compound exploded!');
        player.message('You were badly injured by the exploding liquid');
        return true;
    }

    return false;
}

// op loc
// Search gives the powder and re-locks the chest; anything else is a no-op
async function searchTentChest(player, gameObject, command) {
    if (command !== 'Search') {
        player.message('Nothing interesting happens');
        return true;
    }
    player.message('You search the chest');
    await player.world.sleepTicks(3);
    player.message('You find some unusual powder inside...');
    player.inventory.add(UNIDENTIFIED_POWDER_ID, 1);
    player.world.replaceEntity('gameObjects', gameObject, TENT_CHEST_LOCKED_ID);
    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    // only the open barrel responds to a command
    if (gameObject.id === X_BARREL_OPEN_ID) {
        player.message('You search the barrel');
        player.message('The barrel has a foul-smelling liquid inside...');
        await player.say(
            "I can't pick this up with my bare hands!",
            "I'll need something to put it in"
        );
        return true;
    }

    if (gameObject.id === BRICK_ID) {
        await player.say(
            "Hmmm, There's a room past these bricks",
            'If I could move them out of the way',
            "Then I could find out what's inside..."
        );
        return true;
    }

    if (gameObject.id === TENT_CHEST_LOCKED_ID) {
        player.message('The chest is locked');
        return true;
    }

    if (gameObject.id === TENT_CHEST_OPEN_ID) {
        return searchTentChest(player, gameObject, 'Search');
    }

    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (gameObject.id === TENT_CHEST_LOCKED_ID) {
        player.message('The chest is locked');
        return true;
    }

    if (gameObject.id === TENT_CHEST_OPEN_ID) {
        return searchTentChest(player, gameObject, 'Close');
    }

    return false;
}

// use loc
async function onUseWithGameObject(player, gameObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    // Unlock the tent chest with the digsite chest key.
    if (
        gameObject.id === TENT_CHEST_LOCKED_ID &&
        item.id === DIGSITE_CHEST_KEY_ID
    ) {
        player.world.replaceEntity('gameObjects', gameObject, TENT_CHEST_OPEN_ID);
        player.message('you use the key in the chest');
        player.message('you open the chest');
        player.inventory.remove(DIGSITE_CHEST_KEY_ID);
        await player.say('Oops I dropped the key', "Never mind it's open now...");
        return true;
    }

    if (gameObject.id === X_BARREL_ID) {
        // closed barrel: open it with a trowel
        switch (item.id) {
            case BRONZE_PICKAXE_ID:
                await player.say(
                    'I better not - it might break it to pieces!'
                );
                break;
            case ROCK_PICK_ID:
                await player.say(
                    'The rockpick is too fat to fit in the gap...'
                );
                break;
            case SPADE_ID:
                await player.say('The spade is far too big to fit');
                break;
            case IRON_DAGGER_ID:
                await player.say(
                    "The dagger's blade might break, I need something stronger"
                );
                break;
            case BROKEN_ARROW_ID:
                await player.say('It nearly fits, just a little too thin');
                break;
            case TROWEL_ID:
                player.world.replaceEntity(
                    'gameObjects',
                    gameObject,
                    X_BARREL_OPEN_ID
                );
                await player.say("Great, it's opened it!");
                break;
            default:
                player.message('Nothing interesting happens');
                break;
        }
        return true;
    }

    if (gameObject.id === X_BARREL_OPEN_ID) {
        // open barrel: fill an empty vial with the liquid (closes it again)
        switch (item.id) {
            case PANNING_TRAY_ID:
                await player.say(
                    "Not the best idea i've had...",
                    "It's likely to spill everywhere in that!"
                );
                break;
            case SPECIMEN_JAR_ID:
                await player.say(
                    'Perhaps not, it might contaminate the samples'
                );
                break;
            case JUG_ID:
                await player.say(
                    'I had better not, someone might want to drink from this!'
                );
                break;
            case VASE_ID:
                await player.say(
                    "I'm not sure it's good for growing flowers!"
                );
                break;
            case EMPTY_VIAL_ID:
                player.message('You fill the vial with the liquid');
                player.message('You close the barrel');
                player.inventory.remove(EMPTY_VIAL_ID);
                player.inventory.add(UNIDENTIFIED_LIQUID_ID);
                player.world.replaceEntity(
                    'gameObjects',
                    gameObject,
                    X_BARREL_ID
                );
                await player.say(
                    "I'm not sure what this stuff is",
                    'I had better be very careful with it',
                    'I had better not spill any I think...'
                );
                break;
            default:
                player.message('Nothing interesting happens');
                break;
        }
        return true;
    }

    if (gameObject.id === BRICK_ID) {
        switch (item.id) {
            case EXPLOSIVE_COMPOUND_ID:
                player.message('You pour the compound over the bricks');
                player.inventory.remove(EXPLOSIVE_COMPOUND_ID);
                await player.say('I need some way to ignite this compound...');
                if (player.cache.brick_ignite !== true) {
                    player.cache.brick_ignite = true;
                }
                break;
            case TINDERBOX_ID:
                if (player.cache.brick_ignite === true) {
                    player.message('You strike the tinderbox');
                    player.message('Fizz...');
                    await player.world.sleepTicks(1);
                    await player.say(
                        'Whoa! this is going to blow!',
                        "I'd better run!"
                    );
                    await player.world.sleepTicks(3);
                    player.teleport(22, 3379);
                    player.questStages.digsite = 6;
                    delete player.cache.brick_ignite;
                    player.message('Bang!!!');
                    await player.world.sleepTicks(3);
                    await player.say(
                        'Wow that was a big explosion!',
                        "...What's that noise I can hear ?",
                        '...Sounds like bones moving or something'
                    );
                } else {
                    await player.say(
                        'Now what am I trying to achieve here ?'
                    );
                }
                break;
            case ROCK_PICK_ID:
                await player.say(
                    'That would be like cutting the lawn with nail scissors!',
                    'It would take a year to chip away these rocks...'
                );
                break;
            default:
                player.message('Nothing interesting happens');
                break;
        }
        return true;
    }

    return false;
}

module.exports = {
    onDropItem,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onUseWithGameObject
};
