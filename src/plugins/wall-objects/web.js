// https://classic.runescape.wiki/w/Web
// cutting a web: a wielded weapon (not staff/bow/scythe) or a knife succeeds
// 40% of the time, 30s respawn; left-click path gated on wantLeftclickWebs

const WallObject = require('../../model/wall-object');

const WEB_ID = 24;
const KNIFE_ID = 13;

const CUT_RESPAWN_TICKS = Math.round(30000 / 640);

function cutWebRoll() {
    return Math.floor(Math.random() * 5) <= 1; // random(0,4) <= 1 -> 40%
}

// any weapon-class item counts, whether worn or just carried
function isWieldedWeapon(item) {
    const equip = item.definition.equip;

    return !!equip && (equip.includes('right-hand') || equip.includes('2-handed'));
}

function respawnWeb(world, wallObject) {
    const { x, y, direction } = wallObject;

    world.removeEntity('wallObjects', wallObject);

    world.setTimeout(() => {
        const web = new WallObject(world, { id: WEB_ID, x, y, direction });
        world.addEntity('wallObjects', web);
    }, 30000);
}

async function onUseWithWallObject(player, wallObject, item) {
    if (wallObject.id !== WEB_ID) {
        return false;
    }

    const name = (item.definition.name || '').toLowerCase();
    const isExcludedByName = /staff|bow|cythe/.test(name);

    const canCut =
        !isExcludedByName &&
        (isWieldedWeapon(item) || item.id === KNIFE_ID);

    if (!canCut) {
        return false;
    }

    const { world } = player;

    player.message('@que@You try to destroy the web...');
    await world.sleepTicks(3);

    if (cutWebRoll()) {
        player.message('You slice through the web');
        player.sendSound('combat1');
        respawnWeb(world, wallObject);
    } else {
        player.message('You fail to cut through it');
        await world.sleepTicks(1);
    }

    return true;
}

async function onWallObjectCommandOne(player, wallObject) {
    if (wallObject.id !== WEB_ID) {
        return false;
    }

    const { world } = player;
    const config = world.server && world.server.config;
    const wantLeftclickWebs = !!(config && config.wantLeftclickWebs);

    if (!wantLeftclickWebs) {
        return false;
    }

    const canCut = player.inventory.items.some(
        (item) => isWieldedWeapon(item) || item.id === KNIFE_ID
    );

    if (!canCut) {
        player.message('Nothing interesting happens');
        await world.sleepTicks(1);
        return true;
    }

    player.message('@que@You try to destroy the web...');
    await world.sleepTicks(3);

    if (cutWebRoll()) {
        player.message('You slice through the web');
        await world.sleepTicks(1);
        respawnWeb(world, wallObject);
    } else {
        player.message('You fail to cut through it');
        await world.sleepTicks(1);
    }

    return true;
}

module.exports = { onUseWithWallObject, onWallObjectCommandOne };
