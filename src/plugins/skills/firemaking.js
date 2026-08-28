// https://classic.runescape.wiki/w/Firemaking
// custom firemaking: with the flag on, oak/willow/maple/yew/magic logs can be lit too

const GameObject = require('../../model/game-object');
const GroundItem = require('../../model/ground-item');
const { rollSkillSuccess } = require('../../rolls');
const skillCapes = require('./skill-capes');

const ASHES_ID = 181;
const FIRE_ID = 97;
const LOGS_ID = 14;
const TINDERBOX_ID = 166;

// per-log level/exp/length, keyed by log id
const FIREMAKING_DEFS = {
    14: { level: 1, exp: 160, length: 90 },
    632: { level: 15, exp: 240, length: 110 },
    633: { level: 30, exp: 360, length: 130 },
    634: { level: 45, exp: 540, length: 150 },
    635: { level: 60, exp: 810, length: 170 }, // yew
    636: { level: 75, exp: 1216, length: 190 } // magic
};

const CUSTOM_LOG_IDS = new Set([14, 632, 633, 634, 635, 636]);

function customFiremakingEnabled(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;
    // default on unless disabled
    return !config || config.customFiremaking !== false;
}

// random 1..256
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function calcProductionSuccessfulLegacy(levelReq, skillLevel, levelStopFail) {
    const roll = random(1, 256);
    if (skillLevel < levelReq) {
        return false;
    }
    const maxThreshold = 256; // stops-failing cap
    const threshold = Math.min(
        maxThreshold,
        Math.floor(64 + (skillLevel - 1) * (19200.0 / (levelStopFail * 98)))
    );
    return roll <= threshold;
}

// success stops failing at levelReq + 59
function lightCustomLogs(def, level) {
    const levelStopFail = def.level + 59;
    return calcProductionSuccessfulLegacy(def.level, level, levelStopFail);
}

// Light a set of logs on the ground with the tinderbox.
async function onUseWithGroundItem(player, groundItem, item) {
    if (item.id !== TINDERBOX_ID) {
        return false;
    }

    const custom = customFiremakingEnabled(player);
    const isCustomLog = CUSTOM_LOG_IDS.has(groundItem.id);

    // flag off: plain logs only. flag on: any known log
    if (!custom) {
        if (groundItem.id !== LOGS_ID) {
            return false;
        }
    } else if (!isCustomLog) {
        return false;
    }

    const def = FIREMAKING_DEFS[groundItem.id];
    if (!def) {
        return false;
    }

    const { world } = player;
    const { x, y } = groundItem;

    const level = player.skills.firemaking.current;

    // custom logs: level-gated
    if (custom && groundItem.id !== LOGS_ID && level < def.level) {
        player.message(
            `You need at least ${def.level} firemaking to light these logs`
        );
        return true;
    }

    const indoors = !!world.landscape
        .getTileAtGameCoords(x, y)
        .getTileDef().indoors;

    if (indoors || world.gameObjects.getAtPoint(x, y).length) {
        player.message("@que@You can't light a fire here");
        return true;
    }

    player.sendBubble(TINDERBOX_ID);
    player.message('@que@You attempt to light the logs');
    await world.sleepTicks(2);

    let success;
    let awardXp;
    let durationMs;
    if (custom) {
        success = lightCustomLogs(def, level);
        awardXp = def.exp;
        durationMs = def.length * 1000;
    } else {
        // plain-logs path
        success = rollSkillSuccess(64, 392, level);
        awardXp = 100 + level * 7;
        durationMs = (Math.floor(Math.random() * 60) + 60) * 1000;
    }

    // Worn firemaking cape extends burn (no roll): custom logs -> fixed 330s,
    // plain logs -> double base length.
    if (skillCapes.shouldActivate(player, 'firemaking')) {
        durationMs = custom ? 330 * 1000 : durationMs * 2;
    }

    if (success) {
        player.message('@que@The fire catches and the logs begin to burn');
        world.removeEntity('groundItems', groundItem);

        const fire = new GameObject(world, {
            id: FIRE_ID,
            x,
            y,
            direction: 0
        });

        world.setTimeout(() => {
            world.removeEntity('gameObjects', fire);
            const ashes = new GroundItem(world, { id: ASHES_ID, x, y });
            world.addEntity('groundItems', ashes);
        }, durationMs);

        world.addEntity('gameObjects', fire);
        player.addExperience('firemaking', awardXp);
    } else {
        player.message('@que@You fail to light a fire');
    }

    return true;
}

async function onUseWithInventory(player, item, targetItem) {
    const custom = customFiremakingEnabled(player);
    const isLogPair =
        (item.id === TINDERBOX_ID && CUSTOM_LOG_IDS.has(targetItem.id)) ||
        (targetItem.id === TINDERBOX_ID && CUSTOM_LOG_IDS.has(item.id));
    const isPlainPair =
        (item.id === LOGS_ID && targetItem.id === TINDERBOX_ID) ||
        (item.id === TINDERBOX_ID && targetItem.id === LOGS_ID);

    if (!(custom ? isLogPair : isPlainPair)) {
        return false;
    }

    player.message(
        '@que@I think you should put the logs down before you light them!'
    );

    return true;
}

module.exports = { onUseWithGroundItem, onUseWithInventory };
