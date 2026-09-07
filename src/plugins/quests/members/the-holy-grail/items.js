// the holy grail: whistle teleports overworld<->fisher realm, bell teleports
// inside the castle, feather points to the sack at 328,446

const { questsEnabled } = require('../../custom-gate.js');
const {
    QUEST_KEY,
    MAGIC_WHISTLE_ID,
    BELL_ID,
    MAGIC_GOLDEN_FEATHER_ID,
    MAIDEN_ID
} = require('./ids.js');

function inBounds(player, x1, y1, x2, y2) {
    return player.x >= x1 && player.x <= x2 && player.y >= y1 && player.y <= y2;
}

async function onInventoryCommand(player, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { world } = player;
    const stage = player.questStages[QUEST_KEY] || 0;

    if (item.id === MAGIC_WHISTLE_ID) {
        if (inBounds(player, 490, 652, 491, 653)) {
            if (stage === 5 || stage === -1) {
                player.teleport(492, 18, false);
            } else {
                player.teleport(396, 18, false);
            }
        } else if (inBounds(player, 388, 4, 427, 40)) {
            player.teleport(490, 651, false);
        } else if (
            inBounds(player, 484, 4, 523, 40) ||
            inBounds(player, 511, 976, 519, 984) ||
            inBounds(player, 511, 1920, 518, 1925)
        ) {
            player.teleport(490, 651, false);
        } else {
            player.message('@que@The whistle makes no noise');
            await world.sleepTicks(3);
            player.message('@que@It will not work in this location');
            await world.sleepTicks(3);
        }

        return true;
    }

    if (item.id === BELL_ID) {
        player.message('Ting a ling a ling');

        if (inBounds(player, 411, 27, 425, 40)) {
            if (Math.random() < 0.5) {
                const maiden = player.getNearestEntityByID('npcs', MAIDEN_ID, 5);
                if (maiden) {
                    player.engage(maiden);
                    await maiden.say(
                        'welcome to the grail castle',
                        'you should come inside',
                        "It's cold out there"
                    );
                    player.disengage();
                }
            }

            player.message('Somehow you are now inside the castle');
            player.teleport(420, 35, false);
        }

        return true;
    }

    if (item.id === MAGIC_GOLDEN_FEATHER_ID) {
        const x = player.x;
        const y = player.y;
        const sX = 328;
        const sY = 446;
        const pX = x - sX;
        const pY = y - sY;

        if (stage === -1) {
            player.message('nothing interesting happens');
        } else if (Math.abs(pY) > Math.abs(pX) && y <= sY) {
            player.message('the feather points south');
        } else if (Math.abs(pX) > Math.abs(pY) && x > sX) {
            player.message('the feather points east');
        } else if (x < sX) {
            player.message('the feather points west');
        } else if (Math.abs(pY) > Math.abs(pX) && y >= sY) {
            player.message('the feather points north');
        }

        return true;
    }

    return false;
}

module.exports = { onInventoryCommand };
